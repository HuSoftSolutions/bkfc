import { NextRequest, NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";
import { getAdminDb } from "@/lib/firebaseAdmin";

export async function POST(req: NextRequest) {
  try {
    const { orderId } = await req.json();

    if (!orderId) {
      return NextResponse.json({ error: "Missing orderId" }, { status: 400 });
    }

    const db = getAdminDb();
    const snap = await db.collection("orders").doc(orderId).get();

    if (!snap.exists) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    const order = snap.data()!;

    if (order.paymentMethod !== "stripe") {
      return NextResponse.json({ error: "Only card payments can be refunded via Stripe" }, { status: 400 });
    }

    if (order.refundStatus === "refunded") {
      return NextResponse.json({ error: "Already refunded" }, { status: 400 });
    }

    if (!order.stripeSessionId) {
      return NextResponse.json({ error: "No Stripe session found for this order" }, { status: 400 });
    }

    const stripe = getStripe();
    const session = await stripe.checkout.sessions.retrieve(order.stripeSessionId);
    const paymentIntentId = session.payment_intent as string;

    if (!paymentIntentId) {
      return NextResponse.json({ error: "No payment intent found" }, { status: 400 });
    }

    const refund = await stripe.refunds.create({ payment_intent: paymentIntentId });

    await db.collection("orders").doc(orderId).update({
      refundStatus: "refunded",
      refundId: refund.id,
      refundedAt: new Date().toISOString(),
    });

    return NextResponse.json({ success: true, refundId: refund.id });
  } catch (error) {
    console.error("Order refund error:", error);
    return NextResponse.json({ error: "Refund failed" }, { status: 500 });
  }
}
