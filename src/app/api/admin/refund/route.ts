import { NextRequest, NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";
import { getAdminDb } from "@/lib/firebaseAdmin";

export async function POST(req: NextRequest) {
  try {
    const { registrationId } = await req.json();

    if (!registrationId) {
      return NextResponse.json({ error: "Missing registrationId" }, { status: 400 });
    }

    const db = getAdminDb();
    const snap = await db.collection("registrations").doc(registrationId).get();

    if (!snap.exists) {
      return NextResponse.json({ error: "Registration not found" }, { status: 404 });
    }

    const reg = snap.data()!;

    if (reg.paymentMethod !== "stripe") {
      return NextResponse.json({ error: "Only card payments can be refunded via Stripe" }, { status: 400 });
    }

    if (reg.refundStatus === "refunded") {
      return NextResponse.json({ error: "Already refunded" }, { status: 400 });
    }

    if (!reg.stripeSessionId) {
      return NextResponse.json({ error: "No Stripe session found for this registration" }, { status: 400 });
    }

    const stripe = getStripe();

    // Retrieve the checkout session to get the payment intent
    const session = await stripe.checkout.sessions.retrieve(reg.stripeSessionId);
    const paymentIntentId = session.payment_intent as string;

    if (!paymentIntentId) {
      return NextResponse.json({ error: "No payment intent found" }, { status: 400 });
    }

    // Issue a full refund
    const refund = await stripe.refunds.create({
      payment_intent: paymentIntentId,
    });

    // Update registration status
    await db.collection("registrations").doc(registrationId).update({
      refundStatus: "refunded",
      refundId: refund.id,
      refundedAt: new Date().toISOString(),
    });

    return NextResponse.json({ success: true, refundId: refund.id });
  } catch (error) {
    console.error("Refund error:", error);
    return NextResponse.json({ error: "Refund failed" }, { status: 500 });
  }
}
