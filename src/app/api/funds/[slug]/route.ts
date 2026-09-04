import { NextRequest, NextResponse } from "next/server";
import { getFundProgress } from "@/lib/fundProgress";

/**
 * Public fund progress: goal plus the total of paid donations earmarked for
 * the fund. Computed server-side so donor details never leave the database.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  try {
    const fund = await getFundProgress(slug);
    if (!fund || !fund.showProgress) {
      return NextResponse.json({ error: "Fund not found" }, { status: 404 });
    }
    return NextResponse.json(fund, {
      headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" },
    });
  } catch (error) {
    console.error("Fund progress error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
