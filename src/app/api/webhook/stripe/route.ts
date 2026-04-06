import { NextRequest, NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";
import { getAdminDb } from "@/lib/firebaseAdmin";
import { sendEmail, sendNotificationEmail, buildCustomerReceiptHtml, buildAdminNotificationHtml } from "@/lib/email";

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

          // Fetch event details
          let eventDate = "";
          let eventTime = "";
          let eventLocation = "";
          try {
            const eventSnap = await db.collection("events").doc(reg.eventId).get();
            if (eventSnap.exists) {
              const eventData = eventSnap.data()!;
              eventDate = eventData.date || "";
              eventTime = eventData.time || "";
              eventLocation = eventData.location || "";
            }
          } catch { /* non-critical */ }

          const emailData = {
            name: reg.name,
            email: reg.email,
            phone: reg.phone || "",
            eventTitle: reg.eventTitle,
            eventDate,
            eventTime,
            eventLocation,
            items: reg.items,
            total: reg.total,
            paymentMethod: "stripe" as const,
            paymentStatus: "paid" as const,
            registrationId,
          };

          try {
            await sendEmail(reg.email, `Registration Confirmed: ${reg.eventTitle}`, buildCustomerReceiptHtml(emailData));
          } catch {
            console.error("Failed to send customer receipt");
          }

          try {
            await sendNotificationEmail(
              `Payment Received: ${reg.name} — ${reg.eventTitle}`,
              buildAdminNotificationHtml(emailData),
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
