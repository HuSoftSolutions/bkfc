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

/** Active funds with a public progress page, plus their paid totals. */
export async function listActiveFunds(): Promise<FundProgress[]> {
  const db = getAdminDb();
  const [fundSnap, donSnap] = await Promise.all([
    db.collection("funds").where("active", "==", true).get(),
    db.collection("donations").where("paymentStatus", "==", "paid").get(),
  ]);

  const totals = new Map<string, { raised: number; count: number; last: string | null }>();
  for (const doc of donSnap.docs) {
    const d = doc.data();
    const slug = typeof d.fund === "string" && d.fund ? d.fund : "general";
    const t = totals.get(slug) || { raised: 0, count: 0, last: null };
    t.raised += Number(d.amount) || 0;
    t.count += 1;
    if (typeof d.createdAt === "string" && (!t.last || d.createdAt > t.last)) t.last = d.createdAt;
    totals.set(slug, t);
  }

  return fundSnap.docs
    .map((doc) => doc.data())
    .filter((f) => f.showProgress !== false && typeof f.slug === "string")
    .map((f) => {
      const t = totals.get(f.slug) || { raised: 0, count: 0, last: null };
      return {
        slug: f.slug,
        name: f.name,
        description: f.description || "",
        goal: Number(f.goal) || 0,
        active: true,
        showProgress: true,
        raised: Math.round(t.raised * 100) / 100,
        donorCount: t.count,
        lastDonationAt: t.last,
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name));
}
