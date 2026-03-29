import { NextRequest, NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";
import { getAdminDb } from "@/lib/firebaseAdmin";
import { sendEmail, sendNotificationEmail } from "@/lib/email";

export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig = req.headers.get("stripe-signature");

  if (!sig) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error("STRIPE_WEBHOOK_SECRET not configured");
    return NextResponse.json({ error: "Webhook not configured" }, { status: 500 });
  }

  try {
    const stripe = getStripe();
    const event = stripe.webhooks.constructEvent(body, sig, webhookSecret);

    if (event.type === "checkout.session.completed") {
      const session = event.data.object;
      const registrationId = session.metadata?.registrationId;

      if (registrationId) {
        const db = getAdminDb();
        await db.collection("registrations").doc(registrationId).update({
          paymentStatus: "paid",
          stripeSessionId: session.id,
        });

        // Send confirmation emails
        const regSnap = await db.collection("registrations").doc(registrationId).get();
        if (regSnap.exists) {
          const reg = regSnap.data()!;
          const itemsHtml = reg.items
            .map(
              (item: { name: string; quantity: number; price: number }) =>
                `<tr><td style="padding:4px 8px">${item.name} x${item.quantity}</td><td style="padding:4px 8px;text-align:right">$${(item.quantity * item.price).toFixed(2)}</td></tr>`
            )
            .join("");

          const receiptHtml = `
            <h2>Payment Confirmed</h2>
            <p>Thank you for your registration for <strong>${reg.eventTitle}</strong>!</p>
            <table style="border-collapse:collapse;width:100%;max-width:400px">
              ${itemsHtml}
              <tr style="border-top:1px solid #ddd;font-weight:bold">
                <td style="padding:8px">Total</td>
                <td style="padding:8px;text-align:right">$${reg.total.toFixed(2)}</td>
              </tr>
            </table>
            <p style="color:#666;font-size:14px;margin-top:16px">Broadalbin-Kennyetto Fire Company</p>`;

          try {
            await sendEmail(reg.email, `Registration Confirmed: ${reg.eventTitle}`, receiptHtml);
          } catch {
            console.error("Failed to send customer receipt");
          }

          try {
            await sendNotificationEmail(
              `Payment Received: ${reg.name} — ${reg.eventTitle}`,
              `<h2>New Payment Received</h2>
              <p><strong>Name:</strong> ${reg.name}</p>
              <p><strong>Email:</strong> ${reg.email}</p>
              <p><strong>Event:</strong> ${reg.eventTitle}</p>
              <p><strong>Total:</strong> $${reg.total.toFixed(2)}</p>`
            );
          } catch {
            console.error("Failed to send admin notification");
          }
        }
      }
    }

    return NextResponse.json({ received: true });
  } catch (err) {
    console.error("Webhook error:", err);
    return NextResponse.json({ error: "Webhook failed" }, { status: 400 });
  }
}
