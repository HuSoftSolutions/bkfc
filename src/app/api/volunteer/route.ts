import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebaseAdmin";
import { verifyRecaptcha } from "@/lib/recaptcha";
import { sendNotification } from "@/lib/twilio";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      firstName,
      lastName,
      email,
      phone,
      address,
      city,
      state,
      zip,
      message,
      recaptchaToken,
    } = body;

    if (!firstName || !lastName || !email || !phone || !address || !city || !zip) {
      return NextResponse.json(
        { error: "All required fields must be filled" },
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
    await adminDb.collection("volunteerApplications").add({
      firstName,
      lastName,
      email,
      phone,
      address,
      city,
      state: state || "NY",
      zip,
      message: message || "",
      createdAt: new Date().toISOString(),
      reviewed: false,
    });

    // Send SMS notification
    try {
      await sendNotification(
        `New volunteer application from ${firstName} ${lastName} (${phone})`
      );
    } catch {
      console.error("Failed to send SMS notification");
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Volunteer form error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
