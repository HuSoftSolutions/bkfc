"use client";

import { useEffect, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import { getDb } from "@/lib/firebase";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";

interface NoticeData {
  active: boolean;
  title: string;
  description: string;
  image?: string;
  linkUrl?: string;
  linkText?: string;
}

export default function SiteNoticeModal() {
  const router = useRouter();
  const [notice, setNotice] = useState<NoticeData | null>(null);
  const [ready, setReady] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (sessionStorage.getItem("notice-dismissed")) return;

    async function loadNotice() {
      try {
        const snap = await getDoc(doc(getDb(), "settings", "notice"));
        if (snap.exists()) {
          const data = snap.data() as NoticeData;
          if (data.active && data.title) {
            // If there's an image, preload it before showing
            if (data.image) {
              const img = new Image();
              img.onload = () => {
                setNotice(data);
                setReady(true);
              };
              img.onerror = () => {
                // Show without image if it fails to load
                setNotice({ ...data, image: undefined });
                setReady(true);
              };
              img.src = data.image;
            } else {
              setNotice(data);
              setReady(true);
            }
          }
        }
      } catch {
        // silent
      }
    }
    loadNotice();
  }, []);

  const handleDismiss = () => {
    setDismissed(true);
    sessionStorage.setItem("notice-dismissed", "1");
  };

  if (!notice || !ready || dismissed) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onClick={handleDismiss}
    >
      <div
        className="bg-white rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close */}
        <div className="flex justify-end p-3 pb-0">
          <button
            onClick={handleDismiss}
            className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500 hover:text-gray-700 transition-colors"
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>

        {/* Image */}
        {notice.image && (
          <div className="px-6">
            <img
              src={notice.image}
              alt={notice.title}
              className="w-full h-auto rounded-xl"
            />
          </div>
        )}

        {/* Content */}
        <div className="p-6 text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-3">
            {notice.title}
          </h2>
          <p className="text-gray-600 leading-relaxed whitespace-pre-wrap">
            {notice.description}
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mt-6">
            {notice.linkUrl && (
              <button
                onClick={() => {
                  handleDismiss();
                  const url = notice.linkUrl!;
                  if (url.startsWith("/")) {
                    router.push(url);
                  } else {
                    window.open(url, "_blank");
                  }
                }}
                className="inline-flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white font-semibold px-6 py-2.5 rounded-xl transition-colors whitespace-nowrap"
              >
                {notice.linkText || "Learn More"}
              </button>
            )}
            <button
              onClick={handleDismiss}
              className="text-gray-500 hover:text-gray-700 text-sm font-medium transition-colors"
            >
              Dismiss
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
