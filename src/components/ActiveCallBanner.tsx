"use client";

import { useEffect, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { getDb } from "@/lib/firebase";
import { Siren, MapPin } from "lucide-react";

interface ActiveCall {
  active: boolean;
  callType: string;
  address: string;
  message: string;
  dispatchedAt: string;
  expiresAt: string;
}

export default function ActiveCallBanner() {
  const [call, setCall] = useState<ActiveCall | null>(null);

  useEffect(() => {
    // Real-time listener on the activeCall doc
    const unsubscribe = onSnapshot(
      doc(getDb(), "settings", "activeCall"),
      (snap) => {
        if (snap.exists()) {
          const data = snap.data() as ActiveCall;

          // Check if still active and not expired
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
      () => {
        // Error — silently ignore
        setCall(null);
      }
    );

    return () => unsubscribe();
  }, []);

  // Also check expiry on an interval
  useEffect(() => {
    if (!call?.expiresAt) return;

    const interval = setInterval(() => {
      const expires = new Date(call.expiresAt);
      if (expires <= new Date()) {
        setCall(null);
      }
    }, 30000); // Check every 30 seconds

    return () => clearInterval(interval);
  }, [call?.expiresAt]);

  if (!call) return null;

  const timeAgo = call.dispatchedAt
    ? getTimeAgo(new Date(call.dispatchedAt))
    : "";

  return (
    <div className="bg-red-600 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
        <div className="flex items-center justify-center gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <Siren size={18} className="animate-pulse" />
            <span className="font-bold text-sm uppercase tracking-wider">
              Currently Responding
            </span>
          </div>

          {call.callType && (
            <span className="bg-white/20 rounded-full px-3 py-0.5 text-sm font-medium">
              {call.callType}
            </span>
          )}

          {call.address && (
            <span className="flex items-center gap-1 text-sm text-red-100">
              <MapPin size={14} />
              {call.address}
            </span>
          )}

          {timeAgo && (
            <span className="text-red-200 text-xs">
              {timeAgo}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function getTimeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);

  if (diffMin < 1) return "Just now";
  if (diffMin === 1) return "1 min ago";
  if (diffMin < 60) return `${diffMin} min ago`;

  const diffHr = Math.floor(diffMin / 60);
  if (diffHr === 1) return "1 hour ago";
  return `${diffHr} hours ago`;
}
