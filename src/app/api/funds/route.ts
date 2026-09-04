import { NextResponse } from "next/server";
import { listActiveFunds } from "@/lib/fundProgress";

/** Public list of active campaigns with progress, for the home page. */
export async function GET() {
  try {
    const funds = await listActiveFunds();
    return NextResponse.json(funds, {
      headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" },
    });
  } catch (error) {
    console.error("Fund list error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
