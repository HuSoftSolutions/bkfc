"use client";

import { useState } from "react";
import { Share2, Download, ImageIcon } from "lucide-react";

interface Props {
  fundName: string;
  slug: string;
  imagePath: string;
}

/** Share / save / copy buttons for a fund page. Client-only for clipboard access. */
export default function FundShareActions({ fundName, slug, imagePath }: Props) {
  const [copied, setCopied] = useState<"page" | "image" | null>(null);

  const copy = async (text: string, which: "page" | "image") => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(which);
      setTimeout(() => setCopied(null), 2000);
    } catch {
      // ignore
    }
  };

  const share = async () => {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({ title: fundName, url });
        return;
      } catch {
        // fall through to clipboard
      }
    }
    await copy(url, "page");
  };

  return (
    <>
      <button
        onClick={share}
        className="w-full flex items-center justify-center gap-2 bg-white hover:bg-gray-50 border border-gray-200 text-gray-700 font-medium py-3 rounded-xl transition-colors"
      >
        <Share2 size={16} /> {copied === "page" ? "Link copied!" : "Share this page"}
      </button>

      <div className="grid grid-cols-2 gap-2">
        <a
          href={`/api/funds/${slug}/image?download=1`}
          className="flex items-center justify-center gap-2 bg-white hover:bg-gray-50 border border-gray-200 text-gray-700 text-sm font-medium py-2.5 rounded-xl transition-colors"
        >
          <Download size={14} /> Save image
        </a>
        <button
          onClick={() => copy(`${window.location.origin}${imagePath}`, "image")}
          className="flex items-center justify-center gap-2 bg-white hover:bg-gray-50 border border-gray-200 text-gray-700 text-sm font-medium py-2.5 rounded-xl transition-colors"
        >
          <ImageIcon size={14} /> {copied === "image" ? "Copied!" : "Copy image link"}
        </button>
      </div>
    </>
  );
}
