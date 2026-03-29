"use client";

import { useEffect, useState } from "react";
import { collection, query, orderBy, getDocs } from "firebase/firestore";
import { getDb } from "@/lib/firebase";
import { Call } from "@/types";
import Hero from "@/components/Hero";
import Image from "next/image";
import Link from "next/link";
import { MapPin, ArrowUpRight, ChevronLeft, ChevronRight, Pin } from "lucide-react";
import { sortPinned } from "@/lib/sortPinned";
import PlaceholderImage from "@/components/PlaceholderImage";

const PER_PAGE = 9;

export default function CallsPage() {
  const [calls, setCalls] = useState<Call[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);

  useEffect(() => {
    async function fetchCalls() {
      try {
        const q = query(collection(getDb(), "calls"), orderBy("date", "desc"));
        const snapshot = await getDocs(q);
        setCalls(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })) as Call[]);
      } catch (err) {
        console.error("Error fetching calls:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchCalls();
  }, []);

  const sorted = sortPinned(calls);
  const totalPages = Math.ceil(sorted.length / PER_PAGE);
  const paginated = sorted.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  return (
    <>
      <Hero title="Recent Calls" subtitle="Incident reports and call history" />

      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(PER_PAGE)].map((_, i) => (
              <div key={i} className="bg-gray-50 border border-gray-200 rounded-2xl h-72 animate-pulse" />
            ))}
          </div>
        ) : calls.length === 0 ? (
          <p className="text-gray-400 text-center py-12">No calls to display.</p>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {paginated.map((call) => {
                const truncated =
                  call.description.length > 120
                    ? call.description.substring(0, 120) + "..."
                    : call.description;

                return (
                  <Link
                    key={call.id}
                    href={`/calls/${call.slug || call.id}`}
                    className="bg-white border border-gray-200 rounded-2xl overflow-hidden hover:border-red-300 hover:shadow-md transition-all group duration-300"
                  >
                    <div className="relative w-full h-48 overflow-hidden">
                      {call.image ? (
                        <Image src={call.image} alt={call.title} fill className="object-cover" />
                      ) : (
                        <PlaceholderImage variant="call" className="h-48" />
                      )}
                      <div className="absolute bottom-3 left-3">
                        <span className="bg-red-600 text-white text-[10px] font-semibold px-2.5 py-1 rounded-full uppercase tracking-wider">
                          {call.date} {!call.image && call.time ? `\u00B7 ${call.time}` : ""}
                        </span>
                      </div>
                    </div>
                    <div className="p-5">
                      <h3 className="text-gray-900 font-bold text-lg mb-2 group-hover:text-red-600 transition-colors leading-snug">
                        {call.title}
                      </h3>
                      {call.location && (
                        <div className="flex items-center gap-1.5 text-gray-400 text-xs mb-3">
                          <MapPin size={12} />
                          <span>{call.location}</span>
                        </div>
                      )}
                      <p className="text-gray-500 text-sm leading-relaxed">{truncated}</p>
                      <div className="mt-4 flex items-center gap-1 text-red-600 text-sm font-medium">
                        Read More <ArrowUpRight size={14} />
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
            )}
          </>
        )}
      </section>
    </>
  );
}

function Pagination({
  page,
  totalPages,
  onPageChange,
}: {
  page: number;
  totalPages: number;
  onPageChange: (p: number) => void;
}) {
  return (
    <div className="flex items-center justify-center gap-2 mt-12">
      <button
        onClick={() => onPageChange(page - 1)}
        disabled={page === 1}
        className="flex items-center gap-1 px-4 py-2 rounded-lg border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
      >
        <ChevronLeft size={16} /> Prev
      </button>

      <div className="flex items-center gap-1">
        {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
          <button
            key={p}
            onClick={() => onPageChange(p)}
            className={`w-10 h-10 rounded-lg text-sm font-medium transition-colors ${
              p === page
                ? "bg-red-600 text-white"
                : "text-gray-600 hover:bg-gray-100"
            }`}
          >
            {p}
          </button>
        ))}
      </div>

      <button
        onClick={() => onPageChange(page + 1)}
        disabled={page === totalPages}
        className="flex items-center gap-1 px-4 py-2 rounded-lg border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
      >
        Next <ChevronRight size={16} />
      </button>
    </div>
  );
}
