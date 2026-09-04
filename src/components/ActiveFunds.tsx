"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Target, Heart, ArrowRight } from "lucide-react";
import { formatMoney } from "@/lib/funds";
import type { FundProgress } from "@/lib/fundProgress";

/**
 * Home page callout for active fundraising campaigns. Renders nothing when
 * there are no active funds so the page stays unchanged between campaigns.
 */
export default function ActiveFunds() {
  const [funds, setFunds] = useState<FundProgress[]>([]);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/funds")
      .then((r) => (r.ok ? r.json() : []))
      .then((data: FundProgress[]) => {
        if (!cancelled && Array.isArray(data)) setFunds(data);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  if (funds.length === 0) return null;

  return (
    <section className="relative bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-20">
        <div className="text-center mb-10">
          <div className="w-14 h-14 bg-red-50 border border-red-200 rounded-full flex items-center justify-center mx-auto mb-6">
            <Target size={24} className="text-red-600" />
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-3">
            {funds.length === 1 ? "Current Fundraiser" : "Current Fundraisers"}
          </h2>
          <p className="text-gray-500 leading-relaxed max-w-2xl mx-auto">
            Help us reach these goals. Every gift, online or in person, counts toward the total.
          </p>
        </div>

        <div
          className={`grid gap-6 ${
            funds.length === 1 ? "max-w-2xl mx-auto" : "grid-cols-1 md:grid-cols-2 lg:grid-cols-3"
          }`}
        >
          {funds.map((fund) => {
            const pct = fund.goal > 0 ? Math.min(100, Math.round((fund.raised / fund.goal) * 100)) : null;
            const reached = pct !== null && fund.raised >= fund.goal;
            const summary = fund.description.split(/\n\s*\n/)[0]?.trim();
            return (
              <div
                key={fund.slug}
                className="bg-gray-50 border border-gray-200 rounded-2xl p-6 flex flex-col hover:border-red-300 hover:shadow-md transition-all"
              >
                <Link href={`/funds/${fund.slug}`} className="group">
                  <h3 className="text-xl font-bold text-gray-900 group-hover:text-red-600 transition-colors">
                    {fund.name}
                  </h3>
                </Link>
                {summary && <p className="text-gray-500 text-sm mt-2 line-clamp-3">{summary}</p>}

                <div className="mt-5">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="text-2xl font-extrabold text-red-600">{formatMoney(fund.raised)}</span>
                    {pct !== null && (
                      <span className="text-sm text-gray-500">of {formatMoney(fund.goal)}</span>
                    )}
                  </div>
                  {pct !== null && (
                    <>
                      <div className="h-2.5 bg-gray-200 rounded-full overflow-hidden mt-2">
                        <div className="h-full bg-red-600 rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                      <p className="text-xs text-gray-500 mt-1.5">
                        {reached ? "Goal reached! Thank you!" : `${pct}% of goal`}
                        {fund.donorCount > 0 && ` · ${fund.donorCount} ${fund.donorCount === 1 ? "gift" : "gifts"}`}
                      </p>
                    </>
                  )}
                </div>

                <div className="mt-auto pt-5 flex gap-2">
                  <Link
                    href={`/donate?fund=${fund.slug}`}
                    className="flex-1 inline-flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors"
                  >
                    <Heart size={16} /> Donate
                  </Link>
                  <Link
                    href={`/funds/${fund.slug}`}
                    className="inline-flex items-center justify-center gap-1 bg-white hover:bg-gray-100 border border-gray-200 text-gray-700 text-sm font-medium px-4 py-2.5 rounded-xl transition-colors"
                  >
                    Details <ArrowRight size={14} />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
