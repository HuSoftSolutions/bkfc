import { NextRequest } from "next/server";
import { getFundProgress } from "@/lib/fundProgress";
import { renderFundImage } from "@/lib/fundImage";
import type { FundProgress } from "@/lib/fundProgress";

/** Local-only sample so the design can be checked without a real fund. */
const SAMPLE_FUND: FundProgress = {
  slug: "preview",
  name: "Fire/Rescue Boat Fund",
  description: "",
  goal: 25000,
  active: true,
  showProgress: true,
  raised: 16250,
  donorCount: 42,
  lastDonationAt: null,
};

/**
 * Always-current progress graphic for a fund.
 *   GET /api/funds/<slug>/image            portrait 1080x1350 (social post)
 *   GET /api/funds/<slug>/image?layout=wide landscape 1200x630 (link preview)
 *   Add ?download=1 to force a file download.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const fund =
    slug === "preview" && process.env.NODE_ENV !== "production"
      ? SAMPLE_FUND
      : await getFundProgress(slug);
  if (!fund || !fund.showProgress) {
    return new Response("Fund not found", { status: 404 });
  }

  const url = new URL(req.url);
  const layout = url.searchParams.get("layout") === "wide" ? "landscape" : "portrait";
  const origin = process.env.NEXT_PUBLIC_SITE_URL || url.origin;
  const host = origin.replace(/^https?:\/\//, "").replace(/^www\./, "");
  const updatedLabel = `Updated ${new Date().toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "America/New_York",
  })}`;

  const res = await renderFundImage({
    fund,
    layout,
    origin,
    updatedLabel,
    ctaLabel: `Donate at ${host}/funds/${fund.slug}`,
  });

  if (url.searchParams.get("download")) {
    const date = new Date().toISOString().slice(0, 10);
    res.headers.set("Content-Disposition", `attachment; filename="${fund.slug}-progress-${date}.png"`);
    res.headers.set("Cache-Control", "no-store");
  }
  return res;
}
