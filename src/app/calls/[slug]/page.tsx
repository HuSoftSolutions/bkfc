"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  getDoc,
} from "firebase/firestore";
import { getDb } from "@/lib/firebase";
import { Call } from "@/types";
import Link from "next/link";
import { ArrowLeft, Calendar, Clock, MapPin, Siren } from "lucide-react";

export default function CallDetailPage() {
  const params = useParams();
  const slug = params.slug as string;
  const [call, setCall] = useState<Call | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchCall() {
      try {
        // Try by slug first
        const q = query(
          collection(getDb(), "calls"),
          where("slug", "==", slug)
        );
        const snapshot = await getDocs(q);
        const now = new Date().toISOString();
        if (snapshot.size > 0) {
          const d = snapshot.docs[0];
          const data = { id: d.id, ...d.data() } as Call;
          // Gate pending calls
          if (data.releaseAt && data.releaseAt > now) { setCall(null); }
          else { setCall(data); }
        } else {
          // Fallback: try by document ID
          const docSnap = await getDoc(doc(getDb(), "calls", slug));
          if (docSnap.exists()) {
            const data = { id: docSnap.id, ...docSnap.data() } as Call;
            if (data.releaseAt && data.releaseAt > now) { setCall(null); }
            else { setCall(data); }
          }
        }
      } catch (err) {
        console.error("Error fetching call:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchCall();
  }, [slug]);

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20">
        <div className="animate-pulse space-y-6">
          <div className="h-6 bg-gray-200 rounded w-32" />
          <div className="h-10 bg-gray-200 rounded w-3/4" />
          <div className="h-80 bg-gray-200 rounded-2xl" />
          <div className="h-4 bg-gray-200 rounded w-full" />
          <div className="h-4 bg-gray-200 rounded w-5/6" />
        </div>
      </div>
    );
  }

  if (!call) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center">
        <Siren size={48} className="mx-auto text-gray-400 mb-4" />
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Call Not Found</h1>
        <Link
          href="/calls"
          className="text-red-600 hover:text-red-700 transition-colors"
        >
          &larr; Back to Calls
        </Link>
      </div>
    );
  }

  return (
    <article className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      {/* Back link */}
      <Link
        href="/calls"
        className="inline-flex items-center gap-2 text-gray-500 hover:text-gray-900 text-sm mb-8 transition-colors group"
      >
        <ArrowLeft
          size={16}
          className="group-hover:-translate-x-0.5 transition-transform"
        />
        Back to Calls
      </Link>

      {/* Meta tags */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        {call.date && (
          <span className="flex items-center gap-1.5 bg-red-50 border border-red-200 text-red-700 text-xs font-medium px-3 py-1.5 rounded-full">
            <Calendar size={12} /> {call.date}
          </span>
        )}
        {call.time && (
          <span className="flex items-center gap-1.5 bg-gray-100 border border-gray-200 text-gray-600 text-xs font-medium px-3 py-1.5 rounded-full">
            <Clock size={12} /> {call.time}
          </span>
        )}
        {call.location && (
          <span className="flex items-center gap-1.5 bg-gray-100 border border-gray-200 text-gray-600 text-xs font-medium px-3 py-1.5 rounded-full">
            <MapPin size={12} /> {call.location}
          </span>
        )}
      </div>

      {/* Title */}
      <h1 className="text-3xl md:text-4xl font-extrabold text-gray-900 mb-6 leading-tight">
        {call.title}
      </h1>

      {/* Image */}
      {call.image && (
        <div className="relative w-full rounded-2xl overflow-hidden mb-8">
          <img
            src={call.image}
            alt={call.title}
            className="w-full h-auto"
          />
        </div>
      )}

      {/* Divider */}
      <div className="w-16 h-1 bg-red-600 rounded-full mb-8" />

      {/* Body */}
      <div className="text-gray-600 text-base md:text-lg leading-relaxed whitespace-pre-wrap">
        {call.description}
      </div>
    </article>
  );
}
