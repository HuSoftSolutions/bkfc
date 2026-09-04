import { NextRequest, NextResponse } from "next/server";
import { regenerateFundImages } from "@/lib/fundImageStore";

/**
 * Re-render a fund's stored progress images from current totals. Called by
 * the admin UI after recording donations or editing a fund. Safe to call
 * any time: it only ever reproduces what the live data already says.
 */
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  try {
    const fund = await regenerateFundImages(slug);
    if (!fund) return NextResponse.json({ error: "Fund not found" }, { status: 404 });
    return NextResponse.json({ ok: true, raised: fund.raised });
  } catch (error) {
    console.error("Fund image regenerate error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
