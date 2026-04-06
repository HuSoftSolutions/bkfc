import { NextRequest, NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";
import { getAdminDb } from "@/lib/firebaseAdmin";
import { sendEmail, sendNotificationEmail, buildCustomerReceiptHtml, buildAdminNotificationHtml } from "@/lib/email";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { eventId, eventTitle, firstName, lastName, email, phone, items, payInPerson } = body;

    if (!eventId || !firstName || !lastName || !email || !phone || !items || items.length === 0) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const name = `${firstName} ${lastName}`.trim();

    const total = items.reduce(
      (sum: number, item: { quantity: number; price: number }) =>
        sum + item.quantity * item.price,
      0
    );

    const db = getAdminDb();

    // If paying in person, just save the registration
    if (payInPerson) {
      const reg = await db.collection("registrations").add({
        eventId,
        eventTitle,
        name,
        email,
        phone: phone || "",
        items,
        total,
        paymentMethod: "in-person",
        paymentStatus: "pending",
        createdAt: new Date().toISOString(),
      });

      // Fetch event details for emails
      let eventDate = "";
      let eventTime = "";
      let eventLocation = "";
      try {
        const eventSnap = await db.collection("events").doc(eventId).get();
        if (eventSnap.exists) {
          const eventData = eventSnap.data()!;
          eventDate = eventData.date || "";
          eventTime = eventData.time || "";
          eventLocation = eventData.location || "";
        }
      } catch { /* non-critical */ }

      const emailData = {
        name, email, phone: phone || "", eventTitle,
        eventDate, eventTime, eventLocation,
        items, total,
        paymentMethod: "in-person" as const,
        paymentStatus: "pending" as const,
        registrationId: reg.id,
      };

      try {
        await sendEmail(email, `Registration Confirmed: ${eventTitle}`, buildCustomerReceiptHtml(emailData));
        await sendNotificationEmail(
          `New Registration (Pay In Person): ${name} — ${eventTitle}`,
          buildAdminNotificationHtml(emailData),
          "registration"
        );
      } catch {
        console.error("Failed to send registration emails");
      }

      return NextResponse.json({ success: true, registrationId: reg.id });
    }

    // Create Stripe checkout session
    const stripe = getStripe();

    const lineItems = items.map(
      (item: { name: string; quantity: number; price: number }) => ({
        price_data: {
          currency: "usd",
          product_data: { name: item.name },
          unit_amount: Math.round(item.price * 100),
        },
        quantity: item.quantity,
      })
    );

    const origin = req.headers.get("origin") || "http://localhost:3000";

    // Save registration first with pending status
    const reg = await db.collection("registrations").add({
      eventId,
      eventTitle,
      name,
      email,
      phone: phone || "",
      items,
      total,
      paymentMethod: "stripe",
      paymentStatus: "pending",
      createdAt: new Date().toISOString(),
    });

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: lineItems,
      mode: "payment",
      customer_email: email,
      metadata: {
        registrationId: reg.id,
        eventId,
      },
      success_url: `${origin}/events/${eventId}/confirmation?registration=${reg.id}`,
      cancel_url: `${origin}/events/${eventId}`,
    });

    // Update registration with stripe session ID
    await db.collection("registrations").doc(reg.id).update({
      stripeSessionId: session.id,
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("Checkout error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
