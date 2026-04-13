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

      // Handle legacy donation sessions that pre-created a record
      if (donationId && session.metadata?.type === "donation") {
        const db = getAdminDb();
        await db.collection("donations").doc(donationId).update({
          paymentStatus: "paid",
          stripeSessionId: session.id,
        });

        const donSnap = await db.collection("donations").doc(donationId).get();
        if (donSnap.exists) {
          const don = donSnap.data()!;
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

      // Handle new donation sessions — record created here on successful payment
      if (!donationId && session.metadata?.type === "donation") {
        const db = getAdminDb();

        // Idempotency: skip if a donation with this session already exists
        const existingDon = await db.collection("donations")
          .where("stripeSessionId", "==", session.id).limit(1).get();
        if (!existingDon.empty) {
          return NextResponse.json({ received: true });
        }

        const donName = session.metadata.name || "Anonymous";
        const donEmail = session.customer_email || "";
        const donAmount = parseFloat(session.metadata.amount || "0");

        await db.collection("donations").add({
          amount: donAmount,
          name: donName,
          email: donEmail,
          paymentStatus: "paid",
          stripeSessionId: session.id,
          createdAt: new Date().toISOString(),
        });

        try {
          await sendEmail(
            donEmail,
            "Thank You for Your Donation — BKFC",
            `<h2>Thank You for Your Donation!</h2>
            <p>Your generous donation of <strong>$${donAmount.toFixed(2)}</strong> to the Broadalbin-Kennyetto Fire Company has been received.</p>
            <p>Your support helps us maintain equipment, fund training, and continue protecting our community.</p>
            <p style="color:#666;font-size:14px;margin-top:16px">Broadalbin-Kennyetto Fire Company<br>14 Pine Street, Broadalbin, NY 12025</p>`
          );
          await sendNotificationEmail(
            `Donation Received: $${donAmount.toFixed(2)} from ${donName}`,
            `<h2>New Donation Received</h2>
            <p><strong>Name:</strong> ${donName}</p>
            <p><strong>Email:</strong> ${donEmail}</p>
            <p><strong>Amount:</strong> $${donAmount.toFixed(2)}</p>`,
            "donation"
          );
        } catch {
          console.error("Failed to send donation emails");
        }
      }

      // Handle legacy sessions that pre-created a registration
      const registrationId = session.metadata?.registrationId;
      if (registrationId) {
        const db = getAdminDb();
        await db.collection("registrations").doc(registrationId).update({
          paymentStatus: "paid",
          stripeSessionId: session.id,
        });
      }

      // Handle event registration — registration is created here on
      // successful payment so abandoned checkouts never persist.
      const meta = session.metadata || {};
      if (!registrationId && meta.eventId && meta.name) {
        const db = getAdminDb();

        // Idempotency: skip if a registration with this session already exists
        const existingReg = await db.collection("registrations")
          .where("stripeSessionId", "==", session.id).limit(1).get();
        if (!existingReg.empty) {
          return NextResponse.json({ received: true });
        }

        const email = session.customer_email || "";
        const items = JSON.parse(meta.items || "[]");
        const total = parseFloat(meta.total || "0");

        const regRef = await db.collection("registrations").add({
          eventId: meta.eventId,
          eventTitle: meta.eventTitle || "",
          name: meta.name,
          email,
          phone: meta.phone || "",
          items,
          total,
          paymentMethod: "stripe",
          paymentStatus: "paid",
          stripeSessionId: session.id,
          createdAt: new Date().toISOString(),
        });

        // Fetch event details for emails
        let eventDate = "";
        let eventTime = "";
        let eventLocation = "";
        try {
          const eventSnap = await db.collection("events").doc(meta.eventId).get();
          if (eventSnap.exists) {
            const eventData = eventSnap.data()!;
            eventDate = eventData.date || "";
            eventTime = eventData.time || "";
            eventLocation = eventData.location || "";
          }
        } catch { /* non-critical */ }

        const emailData = {
          name: meta.name,
          email,
          phone: meta.phone || "",
          eventTitle: meta.eventTitle || "",
          eventDate,
          eventTime,
          eventLocation,
          items,
          total,
          paymentMethod: "stripe" as const,
          paymentStatus: "paid" as const,
          registrationId: regRef.id,
        };

        try {
          await sendEmail(email, `Registration Confirmed: ${meta.eventTitle}`, buildCustomerReceiptHtml(emailData));
        } catch {
          console.error("Failed to send customer receipt");
        }

        try {
          await sendNotificationEmail(
            `Payment Received: ${meta.name} — ${meta.eventTitle}`,
            buildAdminNotificationHtml(emailData),
            "registration"
          );
        } catch {
          console.error("Failed to send admin notification");
        }
      }
    }

    return NextResponse.json({ received: true });
  } catch (err) {
    console.error("Webhook error:", err);
    return NextResponse.json({ error: "Webhook failed" }, { status: 400 });
  }
}
