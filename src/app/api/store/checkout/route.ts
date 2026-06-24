import { NextRequest, NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";
import { getAdminDb } from "@/lib/firebaseAdmin";
import { computeCardFee, normalizeFeeConfig, CARD_FEE_LABEL, CARD_FEE_OPTION_ID } from "@/lib/stripeFee";
import type { Product, ProductField } from "@/types";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { productId, firstName, lastName, email, phone, address, items, fields } = body as {
      productId?: string;
      firstName?: string;
      lastName?: string;
      email?: string;
      phone?: string;
      address?: { line1?: string; city?: string; state?: string; zip?: string };
      items?: { optionId: string; name: string; quantity: number; price: number }[];
      fields?: { fieldId: string; label: string; value: string }[];
    };

    if (!productId || !firstName || !lastName || !email || !phone || !items || items.length === 0) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const name = `${firstName} ${lastName}`.trim();
    const db = getAdminDb();

    const productSnap = await db.collection("products").doc(productId).get();
    if (!productSnap.exists) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }
    const product = { id: productSnap.id, ...productSnap.data() } as Product;
    if (product.published === false || product.available === false) {
      return NextResponse.json({ error: "This product is not currently available." }, { status: 400 });
    }

    // Re-price items from the source of truth (the product variants) so the
    // client can't tamper with prices.
    const variantById = new Map((product.variants || []).map((v) => [v.id, v]));
    const safeItems = items
      .map((item) => {
        const variant = variantById.get(item.optionId);
        if (!variant) return null;
        const quantity = Math.max(0, Math.floor(Number(item.quantity) || 0));
        if (quantity === 0) return null;
        return { optionId: variant.id, name: variant.name, quantity, price: variant.price };
      })
      .filter((i): i is NonNullable<typeof i> => i !== null);

    if (safeItems.length === 0) {
      return NextResponse.json({ error: "Please select at least one item." }, { status: 400 });
    }

    // Validate required custom fields and normalize answers.
    const answers = fields || [];
    const answerByFieldId = new Map(answers.map((a) => [a.fieldId, a]));
    for (const field of (product.fields || []) as ProductField[]) {
      if (field.required) {
        const answer = answerByFieldId.get(field.id);
        if (!answer || String(answer.value).trim() === "") {
          return NextResponse.json(
            { error: `Please complete the required field: ${field.label}` },
            { status: 400 }
          );
        }
      }
    }
    const safeFields = (product.fields || [])
      .map((field) => {
        const answer = answerByFieldId.get(field.id);
        return {
          fieldId: field.id,
          label: field.label,
          value: answer ? String(answer.value) : "",
        };
      })
      .filter((f) => f.value !== "");

    // Validate and normalize the mailing address when the product collects one.
    let safeAddress: { line1: string; city: string; state: string; zip: string } | undefined;
    if (product.collectAddress) {
      const line1 = String(address?.line1 || "").trim();
      const city = String(address?.city || "").trim();
      const state = String(address?.state || "").trim();
      const zip = String(address?.zip || "").trim();
      if (!line1 || !city || !state || !zip) {
        return NextResponse.json({ error: "A complete mailing address is required." }, { status: 400 });
      }
      safeAddress = { line1, city, state, zip };
    }

    const subtotal = safeItems.reduce((sum, item) => sum + item.quantity * item.price, 0);

    // Optionally pass the card processing fee on to the customer as its own
    // line item, computed server-side from the subtotal.
    let orderItems = safeItems as { optionId: string; name: string; quantity: number; price: number }[];
    let total = subtotal;
    if (product.passCardFee) {
      const feeSnap = await db.collection("settings").doc("fees").get();
      const fee = computeCardFee(subtotal, normalizeFeeConfig(feeSnap.exists ? feeSnap.data() : undefined));
      if (fee > 0) {
        orderItems = [
          ...orderItems,
          { optionId: CARD_FEE_OPTION_ID, name: CARD_FEE_LABEL, quantity: 1, price: fee },
        ];
        total = Math.round((subtotal + fee) * 100) / 100;
      }
    }

    // Stage the in-progress checkout in a separate collection that the admin
    // never sees. The order is only materialized into `orders` by the webhook
    // once payment succeeds, so abandoned checkouts never become real orders.
    // (We stage here rather than in Stripe metadata because the custom-field +
    // address payload can exceed Stripe's 500-char-per-key metadata limit.)
    const pendingRef = await db.collection("pendingOrders").add({
      productId,
      productTitle: product.title,
      name,
      email,
      phone: phone || "",
      ...(safeAddress ? { address: safeAddress } : {}),
      items: orderItems,
      fields: safeFields,
      total,
      createdAt: new Date().toISOString(),
    });

    const stripe = getStripe();
    const lineItems = orderItems.map((item) => ({
      price_data: {
        currency: "usd",
        product_data: { name: item.name },
        unit_amount: Math.round(item.price * 100),
      },
      quantity: item.quantity,
    }));

    const origin = req.headers.get("origin") || "http://localhost:3000";

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: lineItems,
      mode: "payment",
      customer_email: email,
      metadata: {
        type: "product",
        pendingOrderId: pendingRef.id,
        productTitle: product.title,
        total: String(total),
      },
      success_url: `${origin}/store/${productId}/confirmation?session={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/store/${productId}`,
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("Store checkout error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
