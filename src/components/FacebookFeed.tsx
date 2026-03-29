"use client";

import { useEffect, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import { getDb } from "@/lib/firebase";

function FacebookIcon({ size = 20, className = "" }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M18 2h-3a5 5 0 00-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 011-1h3z" />
    </svg>
  );
}

const DEFAULT_FB_URL = "https://www.facebook.com/Broadalbinfire";

export default function FacebookFeed() {
  const [pageUrl, setPageUrl] = useState(DEFAULT_FB_URL);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadSettings() {
      try {
        const settingsDoc = await getDoc(
          doc(getDb(), "settings", "facebook")
        );
        if (settingsDoc.exists()) {
          const url = settingsDoc.data().pageUrl;
          if (url) setPageUrl(url);
        }
      } catch {
        // use default
      } finally {
        setLoading(false);
      }
    }
    loadSettings();
  }, []);

  const encodedUrl = encodeURIComponent(pageUrl);

  return (
    <section className="relative bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        {/* Header */}
        <div className="flex items-center justify-center gap-3 mb-10">
          <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-400">
            <FacebookIcon size={20} />
          </div>
          <div>
            <h2 className="text-3xl font-bold text-gray-900">Follow Us</h2>
          </div>
        </div>

        {loading ? (
          <div className="max-w-lg mx-auto bg-gray-100 border border-gray-200 rounded-2xl h-[600px] animate-pulse" />
        ) : (
          <div className="max-w-lg mx-auto bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
            <iframe
              src={`https://www.facebook.com/plugins/page.php?href=${encodedUrl}&tabs=timeline&width=500&height=600&small_header=false&adapt_container_width=true&hide_cover=false&show_facepile=true&lazy=true`}
              width="100%"
              height="600"
              style={{ border: "none", overflow: "hidden" }}
              scrolling="no"
              allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share"
              allowFullScreen
              loading="lazy"
              title="Facebook Page Feed"
            />
          </div>
        )}

        {/* Link to page */}
        <div className="mt-6 text-center">
          <a
            href={pageUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm px-6 py-2.5 rounded-xl transition-colors"
          >
            <FacebookIcon size={16} />
            Visit our Facebook Page
          </a>
        </div>
      </div>
    </section>
  );
}
