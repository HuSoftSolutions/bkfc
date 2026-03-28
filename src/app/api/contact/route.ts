import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebaseAdmin";
import { verifyRecaptcha } from "@/lib/recaptcha";
import { sendNotification } from "@/lib/twilio";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, email, phone, message, recaptchaToken } = body;

    if (!name || !email || !message) {
      return NextResponse.json(
        { error: "Name, email, and message are required" },
        { status: 400 }
      );
    }

    // Verify reCAPTCHA
    if (recaptchaToken) {
      const valid = await verifyRecaptcha(recaptchaToken);
      if (!valid) {
        return NextResponse.json(
          { error: "reCAPTCHA verification failed" },
          { status: 400 }
        );
      }
    }

    // Save to Firestore
    const adminDb = getAdminDb();
    await adminDb.collection("contactSubmissions").add({
      name,
      email,
      phone: phone || "",
      message,
      createdAt: new Date().toISOString(),
      read: false,
    });

    // Send SMS notification
    try {
      await sendNotification(
        `New contact form submission from ${name} (${email}): ${message.substring(0, 100)}`
      );
    } catch {
      // Don't fail the request if SMS fails
      console.error("Failed to send SMS notification");
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Contact form error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
