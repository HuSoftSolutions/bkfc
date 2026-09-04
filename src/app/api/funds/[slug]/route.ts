import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebaseAdmin";
import { GENERAL_FUND_SLUG } from "@/lib/funds";

/**
 * Public fund progress: goal plus the total of paid donations earmarked for
 * the fund. Computed server-side so donor details never leave the database.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  if (!slug || !/^[a-z0-9-]+$/.test(slug)) {
    return NextResponse.json({ error: "Invalid fund" }, { status: 400 });
  }

  try {
    const db = getAdminDb();

    const fundSnap = await db.collection("funds").where("slug", "==", slug).limit(1).get();
    if (fundSnap.empty) {
      return NextResponse.json({ error: "Fund not found" }, { status: 404 });
    }
    const fund = fundSnap.docs[0].data();
    if (!fund.showProgress) {
      return NextResponse.json({ error: "Fund not found" }, { status: 404 });
    }

    // Single-field query keeps this index-free; paid status is filtered here.
    const donSnap = await db.collection("donations").where("fund", "==", slug).get();

    let raised = 0;
    let donorCount = 0;
    let lastDonationAt: string | null = null;
    for (const doc of donSnap.docs) {
      const d = doc.data();
      if (d.paymentStatus !== "paid") continue;
      donorCount += 1;
      raised += Number(d.amount) || 0;
      if (typeof d.createdAt === "string" && (!lastDonationAt || d.createdAt > lastDonationAt)) {
        lastDonationAt = d.createdAt;
      }
    }

    return NextResponse.json(
      {
        slug,
        name: fund.name,
        description: fund.description || "",
        goal: Number(fund.goal) || 0,
        active: fund.active !== false,
        raised: Math.round(raised * 100) / 100,
        donorCount,
        lastDonationAt,
        isGeneral: slug === GENERAL_FUND_SLUG,
      },
      { headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" } }
    );
  } catch (error) {
    console.error("Fund progress error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
