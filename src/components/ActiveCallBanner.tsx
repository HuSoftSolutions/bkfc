"use client";

import { useEffect, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { getDb } from "@/lib/firebase";
import { Siren } from "lucide-react";

interface ActiveCall {
  active: boolean;
  bannerText: string;
  dispatchedAt: string;
  expiresAt: string;
}

export default function ActiveCallBanner() {
  const [call, setCall] = useState<ActiveCall | null>(null);

  useEffect(() => {
    const unsubscribe = onSnapshot(
      doc(getDb(), "settings", "activeCall"),
      (snap) => {
        if (snap.exists()) {
          const data = snap.data() as ActiveCall;
          if (data.active && data.expiresAt) {
            const expires = new Date(data.expiresAt);
            if (expires > new Date()) {
              setCall(data);
              return;
            }
          }
          setCall(null);
        } else {
          setCall(null);
        }
      },
      () => setCall(null)
    );
    return () => unsubscribe();
  }, []);

  // Check expiry on interval
  useEffect(() => {
    if (!call?.expiresAt) return;
    const interval = setInterval(() => {
      if (new Date(call.expiresAt) <= new Date()) setCall(null);
    }, 30000);
    return () => clearInterval(interval);
  }, [call?.expiresAt]);

  if (!call) return null;

  return (
    <div className="bg-red-600 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
        <div className="flex items-center justify-center gap-3">
          <Siren size={18} className="animate-pulse shrink-0" />
          <span className="font-bold text-sm uppercase tracking-wider">
            {call.bannerText || "Units Currently Responding"}
          </span>
          <Siren size={18} className="animate-pulse shrink-0" />
        </div>
      </div>
    </div>
  );
}
