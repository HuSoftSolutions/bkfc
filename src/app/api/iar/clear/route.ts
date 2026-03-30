import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebaseAdmin";

// Manual clear endpoint — called from admin panel
export async function POST(req: NextRequest) {
  try {
    const db = getAdminDb();
    await db.collection("settings").doc("activeCall").set({
      active: false,
      callType: "",
      address: "",
      message: "",
      dispatchedAt: "",
      expiresAt: "",
      updatedAt: new Date().toISOString(),
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Clear active call error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
