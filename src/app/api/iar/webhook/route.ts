import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebaseAdmin";
import { sendNotificationEmail } from "@/lib/email";

const DEFAULT_DELAY_MINUTES = 60;
const DEFAULT_BANNER_TEXT = "Units Currently Responding";

/** Search an object for the first matching key */
function findField(obj: Record<string, unknown>, keys: string[]): string {
  for (const key of keys) {
    if (obj[key] !== undefined && obj[key] !== null && obj[key] !== "") {
      return String(obj[key]);
    }
  }
  const objKeys = Object.keys(obj);
  for (const key of keys) {
    const found = objKeys.find((k) => k.toLowerCase() === key.toLowerCase());
    if (found && obj[found] !== undefined && obj[found] !== null && obj[found] !== "") {
      return String(obj[found]);
    }
  }
  for (const val of Object.values(obj)) {
    if (val && typeof val === "object" && !Array.isArray(val)) {
      const nested = findField(val as Record<string, unknown>, keys);
      if (nested) return nested;
    }
  }
  return "";
}

/** Try to extract an incident ID from the payload for deduplication */
function findIncidentId(obj: Record<string, unknown>): string {
  return findField(obj, [
    "IncidentId", "incidentId", "incident_id", "Id", "id", "ID",
    "IncidentNumber", "incidentNumber", "incident_number",
    "CadId", "cadId", "cad_id", "CallId", "callId", "call_id",
    "ExternalId", "externalId", "external_id",
  ]);
}

/** Try to detect the event type (creation, update, close) */
function findEventType(obj: Record<string, unknown>): "create" | "update" | "close" {
  const eventType = findField(obj, [
    "EventType", "eventType", "event_type", "Action", "action",
    "Type", "type", "Status", "status", "IncidentStatus", "incidentStatus",
  ]).toLowerCase();

  if (eventType.includes("close") || eventType.includes("clear") || eventType.includes("cancel") || eventType.includes("end")) {
    return "close";
  }
  if (eventType.includes("update") || eventType.includes("modify") || eventType.includes("change")) {
    return "update";
  }
  return "create";
}

export async function POST(req: NextRequest) {
  try {
    // Verify auth — supports Bearer token, query param, and Basic Auth
    const secret = process.env.IAR_WEBHOOK_SECRET;
    if (secret) {
      const authHeader = req.headers.get("authorization") || "";
      const querySecret = req.nextUrl.searchParams.get("secret");

      let authorized = false;

      // Bearer token
      if (authHeader === `Bearer ${secret}`) authorized = true;
      // Query param
      if (querySecret === secret) authorized = true;
      // Basic Auth — accept if password matches secret
      if (authHeader.startsWith("Basic ")) {
        try {
          const decoded = atob(authHeader.slice(6));
          const password = decoded.split(":").slice(1).join(":");
          if (password === secret) authorized = true;
        } catch { /* invalid base64 */ }
      }

      if (!authorized) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
    }

    // Capture raw body
    const rawText = await req.text();
    let incident: Record<string, unknown> = {};
    try {
      incident = JSON.parse(rawText);
    } catch {
      incident = { raw: rawText };
    }

    const db = getAdminDb();
    const now = new Date();

    // Detect event type and incident ID
    const eventType = findEventType(incident);
    const iarIncidentId = findIncidentId(incident);

    // Load call config
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
    } catch { /* defaults */ }

    // Extract fields
    const callType = findField(incident, [
      "MessageSubject", "callType", "type", "call_type", "Subject",
      "IncidentType", "incident_type", "Nature", "nature",
    ]) || "";
    const address = findField(incident, [
      "Address", "address", "location", "Location", "VerifiedAddress",
      "verified_address", "IncidentAddress", "incident_address",
    ]) || "";
    const message = findField(incident, [
      "MessageBody", "message", "Message", "Body", "body",
      "Description", "description", "Details", "details",
    ]) || rawText;

    // Always log the raw payload
    await db.collection("iarLogs").add({
      iarIncidentId: iarIncidentId || null,
      eventType,
      callType,
      address,
      message,
      rawPayload: rawText,
      createdAt: now.toISOString(),
    });

    // --- FIND EXISTING CALL (by IAR incident ID or recent match) ---
    let existingCallId: string | null = null;

    if (iarIncidentId) {
      // Look up by IAR incident ID
      const existing = await db
        .collection("calls")
        .where("iarIncidentId", "==", iarIncidentId)
        .limit(1)
        .get();
      if (!existing.empty) {
        existingCallId = existing.docs[0].id;
      }
    }

    // If no IAR ID match, try to find a recent IAR call with same type+address (within 2 hours)
    if (!existingCallId && callType && address) {
      const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString();
      const recent = await db
        .collection("calls")
        .where("source", "==", "iar")
        .where("title", "==", callType || "Emergency Response")
        .where("location", "==", address)
        .limit(5)
        .get();
      for (const d of recent.docs) {
        const data = d.data();
        if (data.date && data.date >= twoHoursAgo.split("T")[0]) {
          existingCallId = d.id;
          break;
        }
      }
    }

    // --- HANDLE BY EVENT TYPE ---

    if (eventType === "close") {
      // Clear the active call banner
      await db.collection("settings").doc("activeCall").set({
        active: false,
        bannerText: "",
        dispatchedAt: "",
        expiresAt: "",
        callId: existingCallId || "",
        updatedAt: now.toISOString(),
      });

      // Update existing call with close info if found
      if (existingCallId) {
        const existingDoc = await db.collection("calls").doc(existingCallId).get();
        const existingData = existingDoc.data();
        const updatedDesc = existingData?.description
          ? `${existingData.description}\n\nCall cleared at ${now.toLocaleTimeString()}.`
          : `Call cleared at ${now.toLocaleTimeString()}.`;
        await db.collection("calls").doc(existingCallId).update({
          description: updatedDesc,
          updatedAt: now.toISOString(),
        });
      }

      return NextResponse.json({ success: true, action: "close", callId: existingCallId });
    }

    if (eventType === "update" && existingCallId) {
      // Append update info to existing call
      const existingDoc = await db.collection("calls").doc(existingCallId).get();
      const existingData = existingDoc.data();

      const updates: Record<string, unknown> = { updatedAt: now.toISOString() };

      // Update address if provided and different
      if (address && address !== existingData?.location) {
        updates.location = address;
      }
      // Append message if new info
      if (message && message !== rawText && message !== existingData?.description) {
        updates.description = existingData?.description
          ? `${existingData.description}\n\nUpdate: ${message}`
          : message;
      }

      await db.collection("calls").doc(existingCallId).update(updates);

      return NextResponse.json({ success: true, action: "update", callId: existingCallId });
    }

    // --- INCIDENT CREATION ---

    // Don't create duplicate if we already have this incident
    if (existingCallId) {
      return NextResponse.json({
        success: true,
        action: "duplicate_skipped",
        callId: existingCallId,
      });
    }

    const releaseAt = new Date(now.getTime() + delayMinutes * 60 * 1000);

    // Find default image for this call type
    const callTypeLower = callType.toLowerCase();
    let defaultImage = typeImageMap["default"] || "";
    for (const [key, url] of Object.entries(typeImageMap)) {
      if (key !== "default" && callTypeLower.includes(key.toLowerCase())) {
        defaultImage = url;
        break;
      }
    }

    const slug = (callType || "emergency-response")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      + "-" + now.toISOString().split("T")[0]
      + "-" + now.getTime().toString(36);

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
      iarIncidentId: iarIncidentId || null,
      rawPayload: rawText,
    };

    const callRef = await db.collection("calls").add(callDoc);

    // Set active call banner
    await db.collection("settings").doc("activeCall").set({
      active: true,
      bannerText,
      dispatchedAt: now.toISOString(),
      expiresAt: releaseAt.toISOString(),
      callId: callRef.id,
      updatedAt: now.toISOString(),
    });

    // Email notification
    try {
      await sendNotificationEmail(
        `Dispatch: ${callType || "New Call"}`,
        `<h2>New Dispatch Received</h2>
        <p><strong>Type:</strong> ${callType || "Unknown"}</p>
        <p><strong>Address:</strong> ${address || "Unknown"}</p>
        <p><strong>Time:</strong> ${now.toLocaleString()}</p>
        ${message && message !== rawText ? `<p><strong>Details:</strong> ${message}</p>` : ""}
        <p><strong>Public release:</strong> ${releaseAt.toLocaleString()}</p>`,
        "general"
      );
    } catch { /* don't fail webhook */ }

    return NextResponse.json({
      success: true,
      action: "create",
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
