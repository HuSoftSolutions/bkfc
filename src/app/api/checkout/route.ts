import { NextRequest, NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";
import { getAdminDb } from "@/lib/firebaseAdmin";
import { sendEmail, sendNotificationEmail } from "@/lib/email";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { eventId, eventTitle, name, email, phone, items, payInPerson } = body;

    if (!eventId || !name || !email || !items || items.length === 0) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

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

      // Send emails for in-person registration
      try {
        await sendEmail(
          email,
          `Registration Confirmed: ${eventTitle}`,
          `<h2>Registration Confirmed</h2>
          <p>You're registered for <strong>${eventTitle}</strong>.</p>
          <p>Payment of <strong>$${total.toFixed(2)}</strong> is due in person at the event.</p>
          <p style="color:#666;font-size:14px;margin-top:16px">Broadalbin-Kennyetto Fire Company</p>`
        );
        await sendNotificationEmail(
          `New Registration (Pay In Person): ${name} — ${eventTitle}`,
          `<h2>New In-Person Registration</h2>
          <p><strong>Name:</strong> ${name}</p>
          <p><strong>Email:</strong> ${email}</p>
          <p><strong>Event:</strong> ${eventTitle}</p>
          <p><strong>Total Due:</strong> $${total.toFixed(2)}</p>`
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
