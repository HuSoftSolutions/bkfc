"use client";

import { useEffect, useState } from "react";
import { collection, query, orderBy, getDocs, where } from "firebase/firestore";
import { getDb } from "@/lib/firebase";
import { Event } from "@/types";
import Hero from "@/components/Hero";
import Image from "next/image";
import Link from "next/link";
import { Calendar, Clock, MapPin, ArrowUpRight, ChevronLeft, ChevronRight } from "lucide-react";
import { sortPinned } from "@/lib/sortPinned";
import PlaceholderImage from "@/components/PlaceholderImage";

const PER_PAGE = 9;

export default function EventsPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);

  useEffect(() => {
    async function fetchEvents() {
      try {
        const q = query(
          collection(getDb(), "events"),
          where("published", "==", true),
          orderBy("date", "desc")
        );
        const snapshot = await getDocs(q);
        setEvents(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })) as Event[]);
      } catch (err) {
        console.error("Error fetching events:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchEvents();
  }, []);

  const sorted = sortPinned(events);
  const totalPages = Math.ceil(sorted.length / PER_PAGE);
  const paginated = sorted.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr + "T12:00:00");
    return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
  };

  const formatTime = (time: string) => {
    if (!time) return "";
    const [h, m] = time.split(":");
    const hour = parseInt(h);
    const ampm = hour >= 12 ? "PM" : "AM";
    const h12 = hour % 12 || 12;
    return `${h12}:${m} ${ampm}`;
  };

  return (
    <>
      <Hero title="Events" subtitle="Upcoming events and activities" />

      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(PER_PAGE)].map((_, i) => (
              <div key={i} className="bg-gray-50 border border-gray-200 rounded-2xl h-64 animate-pulse" />
            ))}
          </div>
        ) : events.length === 0 ? (
          <p className="text-gray-400 text-center py-12">No upcoming events.</p>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {paginated.map((event) => (
                <Link
                  key={event.id}
                  href={`/events/${event.id}`}
                  className="bg-white border border-gray-200 rounded-2xl overflow-hidden hover:border-red-300 hover:shadow-md transition-all group duration-300"
                >
                  <div className="relative w-full h-44 overflow-hidden">
                    {event.image ? (
                      <Image src={event.image} alt={event.title} fill className="object-cover" />
                    ) : (
                      <PlaceholderImage variant="event" className="h-44" />
                    )}
                  </div>
                  <div className="p-5">
                    <h3 className="text-gray-900 font-bold text-lg mb-3 group-hover:text-red-600 transition-colors leading-snug">
                      {event.title}
                    </h3>
                    <div className="space-y-2 text-sm text-gray-500">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-red-50 flex items-center justify-center">
                          <Calendar size={13} className="text-red-600" />
                        </div>
                        <span>{formatDate(event.date)}</span>
                      </div>
                      {event.time && (
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-lg bg-red-50 flex items-center justify-center">
                            <Clock size={13} className="text-red-600" />
                          </div>
                          <span>
                            {formatTime(event.time)}
                            {event.endTime && ` — ${formatTime(event.endTime)}`}
                          </span>
                        </div>
                      )}
                      {event.location && (
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-lg bg-red-50 flex items-center justify-center">
                            <MapPin size={13} className="text-red-600" />
                          </div>
                          <span>{event.location}</span>
                        </div>
                      )}
                    </div>
                    {event.description && (
                      <p className="text-gray-400 text-sm mt-3 line-clamp-2">{event.description}</p>
                    )}
                    <div className="mt-4 flex items-center gap-1 text-red-600 text-sm font-medium">
                      View Details <ArrowUpRight size={14} />
                    </div>
                  </div>
                </Link>
              ))}
            </div>

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
              p === page ? "bg-red-600 text-white" : "text-gray-600 hover:bg-gray-100"
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
