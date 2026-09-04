import { getAdminDb } from "@/lib/firebaseAdmin";
import { getFundProgress, type FundProgress } from "@/lib/fundProgress";
import { renderFundImage } from "@/lib/fundImage";

export type FundImageLayout = "portrait" | "landscape";

interface StoredImage {
  data: Buffer;
  raised: number;
  goal: number;
  name: string;
  generatedAt: string;
}

const COLLECTION = "fundImages";
const docId = (slug: string, layout: FundImageLayout) => `${slug}-${layout}`;

function siteHost() {
  return (process.env.NEXT_PUBLIC_SITE_URL || "https://www.broadalbinfire.com")
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "");
}

function updatedLabel() {
  return `Updated ${new Date().toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "America/New_York",
  })}`;
}

async function renderAndStore(fund: FundProgress, layout: FundImageLayout): Promise<StoredImage> {
  const res = await renderFundImage({
    fund,
    layout,
    updatedLabel: updatedLabel(),
    ctaLabel: `Donate at ${siteHost()}/funds/${fund.slug}`,
  });
  const data = Buffer.from(await res.arrayBuffer());
  const stored: StoredImage = {
    data,
    raised: fund.raised,
    goal: fund.goal,
    name: fund.name,
    generatedAt: new Date().toISOString(),
  };
  await getAdminDb()
    .collection(COLLECTION)
    .doc(docId(fund.slug, layout))
    .set({ ...stored, slug: fund.slug, layout, bytes: data.byteLength });
  return stored;
}

async function readStored(slug: string, layout: FundImageLayout): Promise<StoredImage | null> {
  const snap = await getAdminDb().collection(COLLECTION).doc(docId(slug, layout)).get();
  if (!snap.exists) return null;
  const d = snap.data()!;
  const raw = d.data;
  const data: Buffer = Buffer.isBuffer(raw) ? raw : Buffer.from(raw?.toUint8Array?.() ?? raw ?? []);
  if (data.byteLength === 0) return null;
  return { data, raised: Number(d.raised) || 0, goal: Number(d.goal) || 0, name: d.name || "", generatedAt: d.generatedAt || "" };
}

function isCurrent(stored: StoredImage | null, fund: FundProgress) {
  return !!stored && stored.raised === fund.raised && stored.goal === fund.goal && stored.name === fund.name;
}

/**
 * Pre-render both layouts for a fund. Called whenever totals or fund
 * details change so visitors never wait on a render.
 */
export async function regenerateFundImages(slug: string): Promise<FundProgress | null> {
  const fund = await getFundProgress(slug);
  if (!fund) return null;
  await Promise.all([renderAndStore(fund, "portrait"), renderAndStore(fund, "landscape")]);
  return fund;
}

/**
 * Return the stored image for a fund, rendering it first only if nothing
 * current is stored (e.g. first request after a missed regeneration).
 */
export async function getFundImage(
  slug: string,
  layout: FundImageLayout
): Promise<{ fund: FundProgress; image: StoredImage } | null> {
  const [fund, stored] = await Promise.all([getFundProgress(slug), readStored(slug, layout)]);
  if (!fund) return null;
  if (isCurrent(stored, fund)) return { fund, image: stored! };
  const image = await renderAndStore(fund, layout);
  return { fund, image };
}
