import type { Metadata } from "next";
import { getFundProgress } from "@/lib/fundProgress";
import { formatMoney } from "@/lib/funds";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  let fund = null;
  try {
    fund = await getFundProgress(slug);
  } catch (err) {
    console.error("Fund metadata error:", err);
  }
  if (!fund || !fund.showProgress) {
    return { title: "Fundraiser" };
  }

  const progress =
    fund.goal > 0
      ? `${formatMoney(fund.raised)} raised of our ${formatMoney(fund.goal)} goal.`
      : `${formatMoney(fund.raised)} raised so far.`;
  const description = [fund.description, progress].filter(Boolean).join(" ");

  // Version the preview URL by the raised total so social networks that
  // cache by URL pick up new numbers after a donation.
  const image = `/api/funds/${fund.slug}/image?layout=wide&v=${Math.round(fund.raised)}`;

  return {
    title: fund.name,
    description,
    openGraph: {
      title: fund.name,
      description,
      images: [{ url: image, width: 1200, height: 630, alt: `${fund.name} progress` }],
    },
    twitter: { card: "summary_large_image", title: fund.name, description, images: [image] },
  };
}

export default function FundLayout({ children }: { children: React.ReactNode }) {
  return children;
}
