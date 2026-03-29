import { NextRequest, NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";
import { getAdminDb } from "@/lib/firebaseAdmin";
import { sendEmail, sendNotificationEmail } from "@/lib/email";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { amount, name, email } = body;

    if (!amount || amount < 1 || !email) {
      return NextResponse.json(
        { error: "Amount and email are required" },
        { status: 400 }
      );
    }

    const db = getAdminDb();
    const stripe = getStripe();
    const origin = req.headers.get("origin") || "http://localhost:3000";

    // Save donation record
    const donation = await db.collection("donations").add({
      amount,
      name: name || "Anonymous",
      email,
      paymentStatus: "pending",
      createdAt: new Date().toISOString(),
    });

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: "Donation to Broadalbin-Kennyetto Fire Co.",
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
        donationId: donation.id,
        type: "donation",
      },
      success_url: `${origin}/donate/thank-you?donation=${donation.id}`,
      cancel_url: `${origin}/donate`,
    });

    await db.collection("donations").doc(donation.id).update({
      stripeSessionId: session.id,
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
