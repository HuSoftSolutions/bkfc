import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebaseAdmin";
import { sendNotificationEmail } from "@/lib/email";

const DEFAULT_DELAY_MINUTES = 60;
const DEFAULT_BANNER_TEXT = "Units Currently Responding";

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
    const incident = body || { raw: text };

    const db = getAdminDb();
    const now = new Date();

    // Load call config (delay, banner text, type→image mapping)
    let delayMinutes = DEFAULT_DELAY_MINUTES;
    let bannerText = DEFAULT_BANNER_TEXT;
    let typeImageMap: Record<string, string> = {};
    let autoPublish = true;

    try {
      const configSnap = await db.collection("settings").doc("callConfig").get();
      if (configSnap.exists) {
        const config = configSnap.data()!;
        delayMinutes = config.delayMinutes ?? DEFAULT_DELAY_MINUTES;
        bannerText = config.bannerText || DEFAULT_BANNER_TEXT;
        typeImageMap = config.typeImageMap || {};
        autoPublish = config.autoPublish ?? true;
      }
    } catch {
      // Use defaults
    }

    const releaseAt = new Date(now.getTime() + delayMinutes * 60 * 1000);

    // Extract fields from IAR payload
    const callType = incident.MessageSubject || incident.callType || incident.type || "";
    const address = incident.Address || incident.address || incident.location || "";
    const message = incident.MessageBody || incident.message || incident.raw || "";

    // Find default image for this call type
    const callTypeLower = callType.toLowerCase();
    let defaultImage = typeImageMap["default"] || "";
    for (const [key, url] of Object.entries(typeImageMap)) {
      if (key !== "default" && callTypeLower.includes(key.toLowerCase())) {
        defaultImage = url;
        break;
      }
    }

    // Generate slug
    const slug = callType
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      + "-" + now.toISOString().split("T")[0];

    // Create the call document in the calls collection
    const callDoc = {
      title: callType || "Emergency Response",
      description: message,
      date: now.toISOString().split("T")[0],
      time: `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`,
      location: address,
      image: defaultImage,
      slug,
      pinned: false,
      status: autoPublish ? "pending" : "pending",
      releaseAt: releaseAt.toISOString(),
      source: "iar",
      rawPayload: JSON.stringify(incident),
    };

    const callRef = await db.collection("calls").add(callDoc);

    // Update active call banner (minimal info only — no details)
    await db.collection("settings").doc("activeCall").set({
      active: true,
      bannerText,
      dispatchedAt: now.toISOString(),
      expiresAt: releaseAt.toISOString(),
      callId: callRef.id,
      updatedAt: now.toISOString(),
    });

    // Log raw payload
    await db.collection("iarLogs").add({
      callId: callRef.id,
      callType,
      address,
      message,
      rawPayload: JSON.stringify(incident),
      createdAt: now.toISOString(),
    });

    // Send email notification (internal only — full details for admin)
    try {
      await sendNotificationEmail(
        `Dispatch: ${callType || "New Call"}`,
        `<h2>New Dispatch Received</h2>
        <p><strong>Type:</strong> ${callType || "Unknown"}</p>
        <p><strong>Address:</strong> ${address || "Unknown"}</p>
        <p><strong>Time:</strong> ${now.toLocaleString()}</p>
        ${message ? `<p><strong>Details:</strong> ${message}</p>` : ""}
        <p><strong>Public release:</strong> ${releaseAt.toLocaleString()}</p>
        <p><a href="${req.headers.get("origin") || ""}/admin/active-call">View in Admin</a></p>`,
        "general"
      );
    } catch {
      // Don't fail webhook if email fails
    }

    return NextResponse.json({
      success: true,
      callId: callRef.id,
      releaseAt: releaseAt.toISOString(),
    });
  } catch (error) {
    console.error("IAR webhook error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({ status: "ok", service: "iar-webhook" });
}
