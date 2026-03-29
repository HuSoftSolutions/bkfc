"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { doc, getDoc, collection, getCountFromServer } from "firebase/firestore";
import { getDb } from "@/lib/firebase";
import { Siren, Users, Shield, ChevronDown } from "lucide-react";

interface HeroProps {
  title: string;
  subtitle?: string;
  ctaText?: string;
  ctaHref?: string;
  backgroundImage?: string;
  useSettingsImage?: boolean;
  showCallCount?: boolean;
  showStats?: boolean;
  fullHeight?: boolean;
}

export default function Hero({
  title,
  subtitle,
  ctaText,
  ctaHref,
  backgroundImage,
  useSettingsImage = false,
  showCallCount = false,
  showStats = false,
  fullHeight = false,
}: HeroProps) {
  const [bgImage, setBgImage] = useState(backgroundImage || "");
  const [callCount, setCallCount] = useState<number | null>(null);

  useEffect(() => {
    if (!useSettingsImage || backgroundImage) return;

    async function loadHeroImage() {
      try {
        const heroDoc = await getDoc(doc(getDb(), "settings", "hero"));
        if (heroDoc.exists()) {
          setBgImage(heroDoc.data().image || "");
        }
      } catch (err) {
        console.error("Failed to load hero image:", err);
      }
    }
    loadHeroImage();
  }, [useSettingsImage, backgroundImage]);

  useEffect(() => {
    if (!showCallCount) return;

    async function loadCallCount() {
      try {
        const snapshot = await getCountFromServer(
          collection(getDb(), "calls")
        );
        setCallCount(snapshot.data().count);
      } catch {
        // fallback
      }
    }
    loadCallCount();
  }, [showCallCount]);

  return (
    <section
      className={`relative flex items-center justify-center bg-gray-900 overflow-hidden ${
        fullHeight ? "min-h-[85vh]" : "min-h-[30vh] py-16"
      }`}
    >
      {/* Background image with parallax feel */}
      {bgImage && (
        <img
          src={bgImage}
          alt=""
          className="absolute inset-0 w-full h-full object-cover scale-105"
          aria-hidden="true"
        />
      )}

      {/* Gradient overlay — more dramatic */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/50 to-black/80" />

      {/* Red accent line at bottom */}
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-red-600 to-transparent" />

      <div className="relative z-10 text-center px-4 max-w-4xl">
        {/* Patch logo */}
        {showStats && (
          <div className="mb-6">
            <img
              src="/fire patch.png"
              alt="BKFC Patch"
              className="w-28 h-28 mx-auto drop-shadow-2xl"
            />
          </div>
        )}

        <h1 className="text-4xl sm:text-5xl md:text-7xl font-extrabold text-white mb-6 tracking-tight leading-[1.1]">
          {title.split(" ").map((word, i, arr) => {
            const isAccent = i === arr.length - 1 || i === arr.length - 2;
            // Break before "Fire" (or second-to-last word) on mobile
            const breakBefore = i === arr.length - 2;
            return (
              <span key={i}>
                {breakBefore && <br className="sm:hidden" />}
                <span className={isAccent ? "text-red-500" : ""}>
                  {word}{" "}
                </span>
              </span>
            );
          })}
        </h1>

        {subtitle && (
          <p className="text-lg md:text-xl text-gray-300/90 mb-10 max-w-2xl mx-auto leading-relaxed">
            {subtitle}
          </p>
        )}

        {/* Stats row */}
        {showCallCount && (
          <div className="flex flex-wrap items-center justify-center gap-6 mb-10">
            {callCount !== null && (
              <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl px-6 py-4 text-center min-w-[140px]">
                <div className="flex items-center justify-center gap-2 mb-1">
                  <Siren size={18} className="text-red-400" />
                </div>
                <p className="text-3xl font-bold text-white">
                  {callCount.toLocaleString()}
                </p>
                <p className="text-gray-400 text-xs mt-0.5">Calls Responded</p>
              </div>
            )}
            <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl px-6 py-4 text-center min-w-[140px]">
              <div className="flex items-center justify-center gap-2 mb-1">
                <Users size={18} className="text-blue-400" />
              </div>
              <p className="text-3xl font-bold text-white">54</p>
              <p className="text-gray-400 text-xs mt-0.5">Volunteers</p>
            </div>
            <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl px-6 py-4 text-center min-w-[140px]">
              <div className="flex items-center justify-center gap-2 mb-1">
                <Shield size={18} className="text-green-400" />
              </div>
              <p className="text-3xl font-bold text-white">24/7</p>
              <p className="text-gray-400 text-xs mt-0.5">Coverage</p>
            </div>
          </div>
        )}

        {/* CTA buttons */}
        {ctaText && ctaHref && (
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href={ctaHref}
              className="inline-flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white font-semibold px-8 py-3.5 rounded-xl transition-all hover:shadow-lg hover:shadow-red-600/25 hover:-translate-y-0.5"
            >
              {ctaText}
            </Link>
            <Link
              href="/contact"
              className="inline-flex items-center gap-2 bg-white/10 hover:bg-white/15 backdrop-blur-sm border border-white/20 text-white font-medium px-8 py-3.5 rounded-xl transition-all"
            >
              Contact Us
            </Link>
          </div>
        )}
      </div>

      {/* Scroll indicator */}
      {fullHeight && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 animate-bounce">
          <ChevronDown size={24} className="text-white/40" />
        </div>
      )}
    </section>
  );
}
