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

    if (!recaptchaToken) {
      return NextResponse.json(
        { error: "reCAPTCHA token required" },
        { status: 400 }
      );
    }

    const valid = await verifyRecaptcha(recaptchaToken);
    if (!valid) {
      return NextResponse.json(
        { error: "reCAPTCHA verification failed" },
        { status: 400 }
      );
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
      const submittedAt = new Date().toLocaleString("en-US", {
        dateStyle: "long",
        timeStyle: "short",
      });
      const fullAddress = `${address}, ${city}, ${state || "NY"} ${zip}`;

      await sendNotificationEmail(
        `New Volunteer Application: ${firstName} ${lastName}`,
        `<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:560px;margin:0 auto;color:#111">
          <div style="padding:24px 0 16px;border-bottom:3px solid #dc2626;margin-bottom:24px">
            <h2 style="margin:0;font-size:18px">New Volunteer Application</h2>
            <p style="margin:4px 0 0;font-size:13px;color:#666">${submittedAt}</p>
          </div>
          <div style="background:#f9fafb;border-radius:8px;padding:16px;margin-bottom:20px">
            <table style="width:100%;border-collapse:collapse">
              <tr>
                <td style="padding:6px 0;font-size:12px;color:#666;font-weight:600;width:100px;vertical-align:top">Name</td>
                <td style="padding:6px 0;font-size:14px;color:#333">${firstName} ${lastName}</td>
              </tr>
              <tr>
                <td style="padding:6px 0;font-size:12px;color:#666;font-weight:600;vertical-align:top">Email</td>
                <td style="padding:6px 0;font-size:14px;color:#333"><a href="mailto:${email}" style="color:#dc2626">${email}</a></td>
              </tr>
              <tr>
                <td style="padding:6px 0;font-size:12px;color:#666;font-weight:600;vertical-align:top">Phone</td>
                <td style="padding:6px 0;font-size:14px;color:#333">${phone}</td>
              </tr>
              <tr>
                <td style="padding:6px 0;font-size:12px;color:#666;font-weight:600;vertical-align:top">Address</td>
                <td style="padding:6px 0;font-size:14px;color:#333">${fullAddress}</td>
              </tr>
              <tr>
                <td style="padding:6px 0;font-size:12px;color:#666;font-weight:600;vertical-align:top">Position</td>
                <td style="padding:6px 0;font-size:14px;color:#333">${position || "Not specified"}</td>
              </tr>
            </table>
          </div>
          ${message ? `<div style="margin-bottom:20px">
            <p style="font-size:12px;color:#666;font-weight:600;margin:0 0 8px;text-transform:uppercase;letter-spacing:0.5px">Additional Message</p>
            <div style="background:#fff;border:1px solid #e5e7eb;border-radius:8px;padding:16px;font-size:14px;color:#333;line-height:1.6;white-space:pre-wrap">${message.replace(/\n/g, "<br />")}</div>
          </div>` : ""}
          <div style="text-align:center;padding:16px 0;border-top:1px solid #eee;color:#999;font-size:12px">
            <p style="margin:0">Submitted via broadalbinfire.com volunteer form</p>
          </div>
        </div>`,
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
