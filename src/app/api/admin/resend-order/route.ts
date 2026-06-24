import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebaseAdmin";
import { sendEmail, buildProductReceiptHtml } from "@/lib/email";

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

    await sendEmail(
      order.email,
      `Order Confirmed: ${order.productTitle}`,
      buildProductReceiptHtml({
        name: order.name,
        email: order.email,
        phone: order.phone || "",
        productTitle: order.productTitle || "",
        address: order.address,
        items: order.items || [],
        fields: order.fields || [],
        total: order.total || 0,
        paymentStatus: order.paymentStatus === "paid" ? "paid" : "pending",
        orderId: snap.id,
      })
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Resend order receipt error:", error);
    return NextResponse.json({ error: "Failed to send email" }, { status: 500 });
  }
}
