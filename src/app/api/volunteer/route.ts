import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebaseAdmin";
import { verifyRecaptcha } from "@/lib/recaptcha";
import { sendNotificationEmail } from "@/lib/email";

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
      position,
      message,
      recaptchaToken,
    } = body;

    if (!firstName || !lastName || !email || !phone || !address || !city || !zip) {
      return NextResponse.json(
        { error: "All required fields must be filled" },
        { status: 400 }
      );
    }

    if (recaptchaToken) {
      const valid = await verifyRecaptcha(recaptchaToken);
      if (!valid) {
        return NextResponse.json(
          { error: "reCAPTCHA verification failed" },
          { status: 400 }
        );
      }
    }

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
      position: position || "",
      message: message || "",
      createdAt: new Date().toISOString(),
      reviewed: false,
    });

    try {
      await sendNotificationEmail(
        `New Volunteer Application: ${firstName} ${lastName}`,
        `<h2>New Volunteer Application</h2>
        <p><strong>Name:</strong> ${firstName} ${lastName}</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Phone:</strong> ${phone}</p>
        <p><strong>Address:</strong> ${address}, ${city}, ${state || "NY"} ${zip}</p>
        <p><strong>Position:</strong> ${position || "Not specified"}</p>
        ${message ? `<hr /><p><strong>Message:</strong></p><p>${message.replace(/\n/g, "<br />")}</p>` : ""}`,
        "volunteer"
      );
    } catch {
      console.error("Failed to send email notification");
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("Volunteer form error:", message);
    return NextResponse.json(
      { error: "Internal server error", details: message },
      { status: 500 }
    );
  }
}
