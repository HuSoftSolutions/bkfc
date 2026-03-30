import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebaseAdmin";
import { sendNotificationEmail } from "@/lib/email";

// Auto-clear timeout in minutes
const AUTO_CLEAR_MINUTES = 60;

export async function POST(req: NextRequest) {
  try {
    // Verify webhook secret if configured
    const secret = process.env.IAR_WEBHOOK_SECRET;
    if (secret) {
      const authHeader = req.headers.get("authorization");
      const querySecret = req.nextUrl.searchParams.get("secret");
      if (authHeader !== `Bearer ${secret}` && querySecret !== secret) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
    }

    const body = await req.json().catch(() => null);
    const text = body ? null : await req.text().catch(() => "");

    // IAR may send various formats — capture whatever comes in
    const incident = body || { raw: text };

    const db = getAdminDb();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + AUTO_CLEAR_MINUTES * 60 * 1000);

    // Extract fields from IAR payload (adapt based on actual IAR format)
    const callData = {
      active: true,
      callType: incident.MessageSubject || incident.callType || incident.type || "",
      address: incident.Address || incident.address || incident.location || "",
      message: incident.MessageBody || incident.message || incident.raw || "",
      dispatchedAt: now.toISOString(),
      expiresAt: expiresAt.toISOString(),
      updatedAt: now.toISOString(),
    };

    // Write to active call doc
    await db.collection("settings").doc("activeCall").set(callData);

    // Log the incident
    await db.collection("iarLogs").add({
      ...callData,
      rawPayload: JSON.stringify(incident),
      createdAt: now.toISOString(),
    });

    // Send email notification
    try {
      await sendNotificationEmail(
        `Active Call: ${callData.callType || "New Dispatch"}`,
        `<h2>Active Dispatch</h2>
        <p><strong>Type:</strong> ${callData.callType || "Unknown"}</p>
        <p><strong>Address:</strong> ${callData.address || "Unknown"}</p>
        <p><strong>Time:</strong> ${now.toLocaleString()}</p>
        ${callData.message ? `<p><strong>Details:</strong> ${callData.message}</p>` : ""}`,
        "general"
      );
    } catch {
      // Don't fail webhook if email fails
    }

    return NextResponse.json({ success: true, expiresAt: callData.expiresAt });
  } catch (error) {
    console.error("IAR webhook error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// Also support GET for testing/health check
export async function GET() {
  return NextResponse.json({ status: "ok", service: "iar-webhook" });
}
