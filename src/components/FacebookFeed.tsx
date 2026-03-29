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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-20">
        {/* Header */}
        <div className="flex items-center justify-center gap-3 mb-8 sm:mb-10">
          <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-400">
            <FacebookIcon size={20} />
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">Follow Us</h2>
        </div>

        {loading ? (
          <div className="max-w-lg mx-auto bg-gray-100 border border-gray-200 rounded-2xl h-[500px] animate-pulse" />
        ) : (
          <>
            {/* Desktop: show iframe */}
            <div className="hidden md:block max-w-lg mx-auto bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
              <iframe
                src={`https://www.facebook.com/plugins/page.php?href=${encodedUrl}&tabs=timeline&width=500&height=500&small_header=false&adapt_container_width=true&hide_cover=false&show_facepile=true&lazy=true`}
                width="100%"
                height="500"
                style={{ border: "none", overflow: "hidden" }}
                scrolling="no"
                allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share"
                loading="lazy"
                title="Facebook Page Feed"
              />
            </div>

            {/* Mobile: clean CTA card */}
            <div className="md:hidden max-w-sm mx-auto">
              <a
                href={pageUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="block bg-white border border-gray-200 rounded-2xl p-8 text-center shadow-sm"
              >
                <div className="w-16 h-16 bg-blue-50 border border-blue-200 rounded-full flex items-center justify-center mx-auto mb-4">
                  <FacebookIcon size={28} className="text-blue-600" />
                </div>
                <h3 className="text-gray-900 font-bold text-lg mb-2">
                  Broadalbin-Kennyetto Fire Co.
                </h3>
                <p className="text-gray-500 text-sm mb-5">
                  Follow us on Facebook for the latest updates, photos, and community news.
                </p>
                <span className="inline-flex items-center gap-2 bg-blue-600 text-white font-semibold text-sm px-6 py-3 rounded-xl">
                  <FacebookIcon size={16} />
                  View on Facebook
                </span>
              </a>
            </div>
          </>
        )}

        {/* Desktop link */}
        <div className="hidden md:block mt-6 text-center">
          <a
            href={pageUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm px-6 py-2.5 rounded-xl transition-colors whitespace-nowrap"
          >
            <FacebookIcon size={16} />
            Visit our Facebook Page
          </a>
        </div>
      </div>
    </section>
  );
}
