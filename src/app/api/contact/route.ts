import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebaseAdmin";
import { verifyRecaptcha } from "@/lib/recaptcha";
import { sendNotificationEmail } from "@/lib/email";

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
    await adminDb.collection("contactSubmissions").add({
      name,
      email,
      phone: phone || "",
      message,
      createdAt: new Date().toISOString(),
      read: false,
    });

    try {
      await sendNotificationEmail(
        `New Contact Form: ${name}`,
        `<h2>New Contact Form Submission</h2>
        <p><strong>Name:</strong> ${name}</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Phone:</strong> ${phone || "N/A"}</p>
        <hr />
        <p>${message.replace(/\n/g, "<br />")}</p>`
      );
    } catch {
      console.error("Failed to send email notification");
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
