"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { Heart, Users, Target, Share2 } from "lucide-react";
import Hero from "@/components/Hero";
import FundProgressCard from "@/components/FundProgressCard";
import { formatMoney } from "@/lib/funds";

interface FundProgress {
  slug: string;
  name: string;
  description: string;
  goal: number;
  active: boolean;
  raised: number;
  donorCount: number;
  lastDonationAt: string | null;
}

export default function FundPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const [fund, setFund] = useState<FundProgress | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "missing">("loading");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/funds/${slug}`)
      .then(async (res) => {
        if (!res.ok) throw new Error("not found");
        return (await res.json()) as FundProgress;
      })
      .then((data) => {
        if (cancelled) return;
        setFund(data);
        setStatus("ready");
      })
      .catch(() => {
        if (!cancelled) setStatus("missing");
      });
    return () => {
      cancelled = true;
    };
  }, [slug]);

  const share = async () => {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({ title: fund?.name, url });
        return;
      } catch {
        // fall through to clipboard
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  };

  if (status === "missing") {
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

  const pct = fund && fund.goal > 0 ? Math.min(100, Math.round((fund.raised / fund.goal) * 100)) : 0;
  const reached = !!fund && fund.goal > 0 && fund.raised >= fund.goal;

  return (
    <>
      <Hero
        title={fund?.name || "Fundraiser"}
        subtitle={fund?.description || undefined}
        useSettingsImage
      />

      <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
        {status === "loading" || !fund ? (
          <div className="animate-pulse space-y-4 max-w-xl mx-auto">
            <div className="h-10 bg-gray-200 rounded w-1/2 mx-auto" />
            <div className="h-6 bg-gray-200 rounded w-3/4 mx-auto" />
            <div className="h-64 bg-gray-200 rounded-2xl" />
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 lg:gap-12 items-start">
            {/* Stats + CTA */}
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
                <p className="text-sm text-gray-500 mb-1">Raised so far</p>
                <p className="text-4xl font-extrabold text-red-600 mb-1">{formatMoney(fund.raised)}</p>
                {fund.goal > 0 && (
                  <p className="text-gray-500 text-sm mb-4">
                    of {formatMoney(fund.goal)} goal
                  </p>
                )}
                {fund.goal > 0 && (
                  <div className="h-3 bg-gray-100 rounded-full overflow-hidden mb-2">
                    <div
                      className="h-full bg-red-600 rounded-full transition-all"
                      style={{ width: `${pct}%` }}
                    />
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

              <button
                onClick={share}
                className="w-full flex items-center justify-center gap-2 bg-white hover:bg-gray-50 border border-gray-200 text-gray-700 font-medium py-3 rounded-xl transition-colors"
              >
                <Share2 size={16} /> {copied ? "Link copied!" : "Share this page"}
              </button>

              <p className="text-xs text-gray-400 text-center">
                Totals include online and in-person gifts and update automatically.
              </p>
            </div>

            {/* Progress graphic */}
            <div className="lg:col-span-3">
              <div className="rounded-2xl overflow-hidden border border-gray-200 shadow-sm bg-white">
                <FundProgressCard
                  fundName={fund.name}
                  raised={fund.raised}
                  goal={fund.goal}
                  patchDataUrl="/bkfc-patch.png"
                  className="w-full h-auto"
                />
              </div>
            </div>
          </div>
        )}
      </section>
    </>
  );
}
