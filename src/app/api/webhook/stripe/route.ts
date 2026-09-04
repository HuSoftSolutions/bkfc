import { NextRequest, NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";
import { getAdminDb } from "@/lib/firebaseAdmin";
import { donationFundSlug, GENERAL_FUND_NAME, GENERAL_FUND_SLUG } from "@/lib/funds";
import { sendEmail, sendNotificationEmail, buildCustomerReceiptHtml, buildAdminNotificationHtml, buildProductReceiptHtml, buildProductAdminHtml } from "@/lib/email";

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
            if (!don.email) throw new Error("No donor email on donation record");
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
          } catch (err) {
            console.error("Failed to send donation emails", { donationId, email: don.email, err });
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
        const donEmail = session.customer_email || session.customer_details?.email || "";
        const donAmount = parseFloat(session.metadata.amount || "0");
        const donFund = donationFundSlug(session.metadata.fund);
        const donFundName = session.metadata.fundName || GENERAL_FUND_NAME;
        const fundLine = donFund === GENERAL_FUND_SLUG ? "" : ` to the <strong>${donFundName}</strong>`;

        await db.collection("donations").add({
          amount: donAmount,
          name: donName,
          email: donEmail,
          fund: donFund,
          source: "stripe",
          paymentStatus: "paid",
          stripeSessionId: session.id,
          createdAt: new Date().toISOString(),
        });

        try {
          if (!donEmail) throw new Error("No donor email on Stripe session");
          await sendEmail(
            donEmail,
            "Thank You for Your Donation — BKFC",
            `<h2>Thank You for Your Donation!</h2>
            <p>Your generous donation of <strong>$${donAmount.toFixed(2)}</strong>${fundLine} to the Broadalbin-Kennyetto Fire Company has been received.</p>
            <p>Your support helps us maintain equipment, fund training, and continue protecting our community.</p>
            <p style="color:#666;font-size:14px;margin-top:16px">Broadalbin-Kennyetto Fire Company<br>14 Pine Street, Broadalbin, NY 12025</p>`
          );
          await sendNotificationEmail(
            `Donation Received: $${donAmount.toFixed(2)} from ${donName}`,
            `<h2>New Donation Received</h2>
            <p><strong>Name:</strong> ${donName}</p>
            <p><strong>Email:</strong> ${donEmail}</p>
            <p><strong>Amount:</strong> $${donAmount.toFixed(2)}</p>
            <p><strong>Fund:</strong> ${donFundName}</p>`,
            "donation"
          );
        } catch (err) {
          console.error("Failed to send donation emails", { sessionId: session.id, email: donEmail, err });
        }
      }

      // Handle store product orders — the real order is created here, on
      // successful payment, from the staged `pendingOrders` doc. Abandoned
      // checkouts never materialize into an order.
      const pendingOrderId = session.metadata?.pendingOrderId;
      if (pendingOrderId && session.metadata?.type === "product") {
        const db = getAdminDb();

        // Idempotency: skip if an order for this session already exists
        const existingOrder = await db.collection("orders")
          .where("stripeSessionId", "==", session.id).limit(1).get();
        if (!existingOrder.empty) {
          return NextResponse.json({ received: true });
        }

        const pendingRef = db.collection("pendingOrders").doc(pendingOrderId);
        const pendingSnap = await pendingRef.get();
        if (!pendingSnap.exists) {
          return NextResponse.json({ received: true });
        }
        const pending = pendingSnap.data()!;
        const email =
          pending.email || session.customer_email || session.customer_details?.email || "";

        const orderRef = await db.collection("orders").add({
          productId: pending.productId,
          productTitle: pending.productTitle || "",
          name: pending.name,
          email,
          phone: pending.phone || "",
          ...(pending.address ? { address: pending.address } : {}),
          items: pending.items || [],
          fields: pending.fields || [],
          total: pending.total || 0,
          paymentMethod: "stripe",
          paymentStatus: "paid",
          stripeSessionId: session.id,
          createdAt: pending.createdAt || new Date().toISOString(),
        });

        const emailData = {
          name: pending.name,
          email,
          phone: pending.phone || "",
          productTitle: pending.productTitle || "",
          address: pending.address,
          items: pending.items || [],
          fields: pending.fields || [],
          total: pending.total || 0,
          paymentStatus: "paid" as const,
          orderId: orderRef.id,
        };

        try {
          if (!email) throw new Error("No customer email on order");
          await sendEmail(email, `Order Confirmed: ${pending.productTitle}`, buildProductReceiptHtml(emailData));
        } catch (err) {
          console.error("Failed to send order receipt", { orderId: orderRef.id, email, err });
        }

        try {
          await sendNotificationEmail(
            `New Order: ${pending.name} — ${pending.productTitle}`,
            buildProductAdminHtml(emailData),
            "order"
          );
        } catch (err) {
          console.error("Failed to send order admin notification", { orderId: orderRef.id, err });
        }

        // Clean up the staging doc; non-critical if it fails.
        try {
          await pendingRef.delete();
        } catch (err) {
          console.error("Failed to delete staged order", { pendingOrderId, err });
        }

        return NextResponse.json({ received: true });
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

        const email = session.customer_email || session.customer_details?.email || "";
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
          if (!email) throw new Error("No customer email on Stripe session");
          await sendEmail(email, `Registration Confirmed: ${meta.eventTitle}`, buildCustomerReceiptHtml(emailData));
        } catch (err) {
          console.error("Failed to send customer receipt", { sessionId: session.id, email, err });
        }

        try {
          await sendNotificationEmail(
            `Payment Received: ${meta.name} — ${meta.eventTitle}`,
            buildAdminNotificationHtml(emailData),
            "registration"
          );
        } catch (err) {
          console.error("Failed to send admin notification", { sessionId: session.id, err });
        }
      }
    }

    return NextResponse.json({ received: true });
  } catch (err) {
    console.error("Webhook error:", err);
    return NextResponse.json({ error: "Webhook failed" }, { status: 400 });
  }
}
