import { getAdminDb } from "@/lib/firebaseAdmin";

export interface FundProgress {
  slug: string;
  name: string;
  description: string;
  goal: number;
  active: boolean;
  showProgress: boolean;
  raised: number;
  donorCount: number;
  lastDonationAt: string | null;
}

/**
 * Load a fund and total its paid donations. Returns null when the fund
 * doesn't exist. Used by the JSON API and the generated progress images.
 */
export async function getFundProgress(slug: string): Promise<FundProgress | null> {
  if (!slug || !/^[a-z0-9-]+$/.test(slug)) return null;
  const db = getAdminDb();

  const fundSnap = await db.collection("funds").where("slug", "==", slug).limit(1).get();
  if (fundSnap.empty) return null;
  const fund = fundSnap.docs[0].data();

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

  return {
    slug,
    name: fund.name,
    description: fund.description || "",
    goal: Number(fund.goal) || 0,
    active: fund.active !== false,
    showProgress: fund.showProgress !== false,
    raised: Math.round(raised * 100) / 100,
    donorCount,
    lastDonationAt,
  };
}
