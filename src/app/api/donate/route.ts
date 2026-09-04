import { NextRequest, NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";
import { getAdminDb } from "@/lib/firebaseAdmin";
import { GENERAL_FUND_SLUG, GENERAL_FUND_NAME } from "@/lib/funds";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { amount, name, email } = body;
    const requestedFund = typeof body.fund === "string" ? body.fund.trim() : "";

    if (!amount || amount < 1 || !email) {
      return NextResponse.json(
        { error: "Amount and email are required" },
        { status: 400 }
      );
    }

    // Resolve the fund server-side so a tampered slug can't earmark money
    // for a fund that doesn't exist or is closed.
    let fundSlug = GENERAL_FUND_SLUG;
    let fundName = GENERAL_FUND_NAME;
    if (requestedFund && requestedFund !== GENERAL_FUND_SLUG) {
      const fundSnap = await getAdminDb()
        .collection("funds")
        .where("slug", "==", requestedFund)
        .limit(1)
        .get();
      const fund = fundSnap.docs[0]?.data();
      if (!fund || fund.active === false) {
        return NextResponse.json(
          { error: "That fund is no longer accepting donations" },
          { status: 400 }
        );
      }
      fundSlug = requestedFund;
      fundName = fund.name;
    }

    const stripe = getStripe();
    const origin = req.headers.get("origin") || "http://localhost:3000";

    // Create Stripe checkout session — donation record is created in the
    // webhook once payment is confirmed so abandoned checkouts don't
    // leave orphaned pending records.
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name:
                fundSlug === GENERAL_FUND_SLUG
                  ? "Donation to Broadalbin-Kennyetto Fire Co."
                  : `${fundName} — Broadalbin-Kennyetto Fire Co.`,
              description: `Thank you for your generous donation${name ? `, ${name}` : ""}.`,
            },
            unit_amount: Math.round(amount * 100),
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      customer_email: email,
      metadata: {
        type: "donation",
        name: name || "Anonymous",
        amount: String(amount),
        fund: fundSlug,
        fundName,
      },
      success_url: `${origin}/donate/thank-you?session={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/donate`,
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("Donation error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
