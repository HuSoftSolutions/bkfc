import Link from "next/link";
import { Heart, Users, Target } from "lucide-react";
import Hero from "@/components/Hero";
import FundShareActions from "@/components/FundShareActions";
import { formatMoney } from "@/lib/funds";
import { getFundProgress } from "@/lib/fundProgress";

export default async function FundPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  let fund = null;
  try {
    fund = await getFundProgress(slug);
  } catch (err) {
    console.error("Fund page error:", err);
  }

  if (!fund || !fund.showProgress) {
    return (
      <>
        <Hero title="Fund Not Found" />
        <section className="max-w-2xl mx-auto px-4 py-16 text-center">
          <p className="text-gray-500 mb-6">We couldn&apos;t find that fundraising campaign.</p>
          <Link href="/donate" className="text-red-600 hover:text-red-700 font-medium">
            &larr; Make a general donation
          </Link>
        </section>
      </>
    );
  }

  const pct = fund.goal > 0 ? Math.min(100, Math.round((fund.raised / fund.goal) * 100)) : 0;
  const reached = fund.goal > 0 && fund.raised >= fund.goal;
  // The raised total in the URL makes a new total a new URL, so the image can
  // be cached aggressively without ever showing a stale number.
  const imagePath = `/api/funds/${fund.slug}/image?v=${Math.round(fund.raised)}`;
  const paragraphs = fund.description
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);

  return (
    <>
      <Hero title={fund.name} subtitle="Help us reach our goal" useSettingsImage />

      <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 lg:gap-12 items-start">
          {/* Stats + CTA */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
              <p className="text-sm text-gray-500 mb-1">Raised so far</p>
              <p className="text-4xl font-extrabold text-red-600 mb-1">{formatMoney(fund.raised)}</p>
              {fund.goal > 0 && <p className="text-gray-500 text-sm mb-4">of {formatMoney(fund.goal)} goal</p>}
              {fund.goal > 0 && (
                <div className="h-3 bg-gray-100 rounded-full overflow-hidden mb-2">
                  <div className="h-full bg-red-600 rounded-full transition-all" style={{ width: `${pct}%` }} />
                </div>
              )}
              <div className="flex items-center justify-between text-xs text-gray-500">
                <span className="flex items-center gap-1">
                  <Target size={12} /> {reached ? "Goal reached!" : `${pct}% funded`}
                </span>
                <span className="flex items-center gap-1">
                  <Users size={12} /> {fund.donorCount} {fund.donorCount === 1 ? "gift" : "gifts"}
                </span>
              </div>
            </div>

            {fund.active ? (
              <Link
                href={`/donate?fund=${fund.slug}`}
                className="w-full flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white font-semibold py-3.5 rounded-xl transition-colors"
              >
                <Heart size={18} /> Donate to this fund
              </Link>
            ) : (
              <p className="text-center text-sm text-gray-500 bg-gray-50 border border-gray-200 rounded-xl p-4">
                This campaign is closed. Thank you to everyone who gave!
              </p>
            )}

            <FundShareActions fundName={fund.name} slug={fund.slug} imagePath={imagePath} />

            <p className="text-xs text-gray-400 text-center">
              Totals include online and in-person gifts. The image always shows the current total,
              so you can post it anywhere and it stays up to date.
            </p>
          </div>

          {/* Progress graphic */}
          <div className="lg:col-span-3">
            <div
              className="rounded-2xl overflow-hidden border border-gray-200 shadow-sm bg-[#f7f4ec]"
              style={{ aspectRatio: "1080 / 1350" }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={imagePath}
                alt={`${fund.name}: ${formatMoney(fund.raised)} raised of ${formatMoney(fund.goal)} goal`}
                width={1080}
                height={1350}
                fetchPriority="high"
                className="w-full h-auto"
              />
            </div>
          </div>
        </div>

        {/* About this fund */}
        {paragraphs.length > 0 && (
          <div className="mt-12 sm:mt-16 max-w-3xl mx-auto">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">About this fund</h2>
            <div className="space-y-4 text-gray-600 leading-relaxed">
              {paragraphs.map((paragraph, i) => (
                <p key={i} className="whitespace-pre-line">{paragraph}</p>
              ))}
            </div>
            {fund.active && (
              <Link
                href={`/donate?fund=${fund.slug}`}
                className="mt-8 inline-flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white font-semibold px-8 py-3.5 rounded-xl transition-colors"
              >
                <Heart size={18} /> Donate to this fund
              </Link>
            )}
          </div>
        )}
      </section>
    </>
  );
}
