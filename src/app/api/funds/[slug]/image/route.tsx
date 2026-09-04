import { NextRequest } from "next/server";
import { getFundImage } from "@/lib/fundImageStore";
import { renderFundImage } from "@/lib/fundImage";
import type { FundProgress } from "@/lib/fundProgress";

/**
 * Always-current progress graphic for a fund, served from a pre-rendered
 * copy that is refreshed whenever the totals change.
 *   GET /api/funds/<slug>/image             portrait 1080x1350 (social post)
 *   GET /api/funds/<slug>/image?layout=wide landscape 1200x630 (link preview)
 *   Add ?download=1 to force a file download.
 */

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

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const url = new URL(req.url);
  const layout = url.searchParams.get("layout") === "wide" ? "landscape" : "portrait";
  const download = !!url.searchParams.get("download");

  if (slug === "preview" && process.env.NODE_ENV !== "production") {
    return renderFundImage({
      fund: SAMPLE_FUND,
      layout,
      updatedLabel: "Updated today",
      ctaLabel: `Donate at ${url.host}/funds/preview`,
    });
  }

  const result = await getFundImage(slug, layout);
  if (!result || !result.fund.showProgress) {
    return new Response("Fund not found", { status: 404 });
  }
  const { fund, image } = result;

  const date = image.generatedAt.slice(0, 10) || new Date().toISOString().slice(0, 10);
  const filename = `${fund.slug}-progress-${date}.png`;

  return new Response(new Uint8Array(image.data), {
    headers: {
      "Content-Type": "image/png",
      "Content-Length": String(image.data.byteLength),
      "Content-Disposition": `${download ? "attachment" : "inline"}; filename="${filename}"`,
      // The URL carries the raised total, so a new total is a new URL and
      // the stored copy can be cached hard.
      "Cache-Control": download
        ? "no-store"
        : "public, max-age=300, s-maxage=86400, stale-while-revalidate=604800",
    },
  });
}
