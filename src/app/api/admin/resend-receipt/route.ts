import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebaseAdmin";
import { sendEmail, buildCustomerReceiptHtml } from "@/lib/email";

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
      paymentMethod: reg.paymentMethod,
      paymentStatus: reg.paymentStatus,
      registrationId: snap.id,
    };

    await sendEmail(
      reg.email,
      `Registration Confirmed: ${reg.eventTitle}`,
      buildCustomerReceiptHtml(emailData)
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Resend receipt error:", error);
    return NextResponse.json({ error: "Failed to send email" }, { status: 500 });
  }
}
