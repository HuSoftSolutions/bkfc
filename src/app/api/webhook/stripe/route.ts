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
      const donationId = session.metadata?.donationId;
      const registrationId = session.metadata?.registrationId;

      // Handle donation
      if (donationId && session.metadata?.type === "donation") {
        const db = getAdminDb();
        const donSnap = await db.collection("donations").doc(donationId).get();
        if (donSnap.exists) {
          const don = donSnap.data()!;
          await db.collection("donations").doc(donationId).update({
            paymentStatus: "paid",
            stripeSessionId: session.id,
          });

          try {
            await sendEmail(
              don.email,
              "Thank You for Your Donation — BKFC",
              `<h2>Thank You for Your Donation!</h2>
              <p>Your generous donation of <strong>$${don.amount.toFixed(2)}</strong> to the Broadalbin-Kennyetto Fire Company has been received.</p>
              <p>Your support helps us maintain equipment, fund training, and continue protecting our community.</p>
              <p style="color:#666;font-size:14px;margin-top:16px">Broadalbin-Kennyetto Fire Company<br>14 Pine Street, Broadalbin, NY 12025</p>`
            );
            await sendNotificationEmail(
              `Donation Received: $${don.amount.toFixed(2)} from ${don.name}`,
              `<h2>New Donation Received</h2>
              <p><strong>Name:</strong> ${don.name}</p>
              <p><strong>Email:</strong> ${don.email}</p>
              <p><strong>Amount:</strong> $${don.amount.toFixed(2)}</p>`,
              "donation"
            );
          } catch {
            console.error("Failed to send donation emails");
          }
        }
      }

      // Handle event registration
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
              <p><strong>Total:</strong> $${reg.total.toFixed(2)}</p>`,
              "registration"
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
