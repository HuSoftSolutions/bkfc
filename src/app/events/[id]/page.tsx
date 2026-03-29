"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { doc, getDoc } from "firebase/firestore";
import { getDb } from "@/lib/firebase";
import { Event } from "@/types";
import Link from "next/link";
import {
  ArrowLeft,
  Calendar,
  Clock,
  MapPin,
  CalendarDays,
} from "lucide-react";

export default function EventDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchEvent() {
      try {
        const docSnap = await getDoc(doc(getDb(), "events", id));
        if (docSnap.exists()) {
          setEvent({ id: docSnap.id, ...docSnap.data() } as Event);
        }
      } catch (err) {
        console.error("Error fetching event:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchEvent();
  }, [id]);

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr + "T12:00:00");
    return d.toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  };

  const formatTime = (time: string) => {
    if (!time) return "";
    const [h, m] = time.split(":");
    const hour = parseInt(h);
    const ampm = hour >= 12 ? "PM" : "AM";
    const h12 = hour % 12 || 12;
    return `${h12}:${m} ${ampm}`;
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20">
        <div className="animate-pulse space-y-6">
          <div className="h-6 bg-gray-200 rounded w-32" />
          <div className="h-10 bg-gray-200 rounded w-3/4" />
          <div className="h-80 bg-gray-200 rounded-2xl" />
          <div className="h-4 bg-gray-200 rounded w-full" />
        </div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center">
        <CalendarDays size={48} className="mx-auto text-gray-400 mb-4" />
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Event Not Found</h1>
        <Link
          href="/events"
          className="text-red-600 hover:text-red-700 transition-colors"
        >
          &larr; Back to Events
        </Link>
      </div>
    );
  }

  return (
    <article className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      {/* Back link */}
      <Link
        href="/events"
        className="inline-flex items-center gap-2 text-gray-500 hover:text-gray-900 text-sm mb-8 transition-colors group"
      >
        <ArrowLeft
          size={16}
          className="group-hover:-translate-x-0.5 transition-transform"
        />
        Back to Events
      </Link>

      {/* Title */}
      <h1 className="text-3xl md:text-4xl font-extrabold text-gray-900 mb-6 leading-tight">
        {event.title}
      </h1>

      {/* Image */}
      {event.image && (
        <div className="relative w-full rounded-2xl overflow-hidden mb-8">
          <img
            src={event.image}
            alt={event.title}
            className="w-full h-auto"
          />
        </div>
      )}

      {/* Details card */}
      <div className="bg-gray-50 border border-gray-200 rounded-2xl p-6 mb-8">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-50 border border-red-200 flex items-center justify-center shrink-0">
              <Calendar size={18} className="text-red-600" />
            </div>
            <div>
              <p className="text-gray-400 text-xs font-medium uppercase tracking-wider mb-0.5">
                Date
              </p>
              <p className="text-gray-900 text-sm font-medium">
                {formatDate(event.date)}
              </p>
              {event.endDate && event.endDate !== event.date && (
                <p className="text-gray-500 text-sm">
                  to {formatDate(event.endDate)}
                </p>
              )}
            </div>
          </div>

          {event.time && (
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center shrink-0">
                <Clock size={18} className="text-blue-600" />
              </div>
              <div>
                <p className="text-gray-400 text-xs font-medium uppercase tracking-wider mb-0.5">
                  Time
                </p>
                <p className="text-gray-900 text-sm font-medium">
                  {formatTime(event.time)}
                  {event.endTime && ` — ${formatTime(event.endTime)}`}
                </p>
              </div>
            </div>
          )}

          {event.location && (
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-green-50 border border-green-200 flex items-center justify-center shrink-0">
                <MapPin size={18} className="text-green-600" />
              </div>
              <div>
                <p className="text-gray-400 text-xs font-medium uppercase tracking-wider mb-0.5">
                  Location
                </p>
                <p className="text-gray-900 text-sm font-medium">
                  {event.location}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Register button */}
      {event.ticketingEnabled && (event.ticketOptions || []).length > 0 && (
        <div className="mb-8">
          <Link
            href={`/events/${event.id}/register`}
            className="inline-flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white font-semibold px-8 py-3.5 rounded-xl transition-colors"
          >
            Register / Order Now
          </Link>
          {event.payInPerson && (
            <p className="text-gray-500 text-sm mt-2">
              Pay online or in person at the event.
            </p>
          )}
        </div>
      )}

      {/* Divider */}
      <div className="w-16 h-1 bg-red-600 rounded-full mb-8" />

      {/* Body */}
      <div className="text-gray-600 text-base md:text-lg leading-relaxed whitespace-pre-wrap">
        {event.description}
      </div>

      {/* Ticket options preview */}
      {event.ticketingEnabled && (event.ticketOptions || []).length > 0 && (
        <div className="mt-10 pt-8 border-t border-gray-200">
          <h3 className="text-xl font-bold text-gray-900 mb-4">
            Available Options
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {(event.ticketOptions || []).map((opt) => (
              <div
                key={opt.id}
                className="bg-gray-50 border border-gray-200 rounded-xl p-4 flex justify-between items-center"
              >
                <div>
                  <p className="text-gray-900 font-medium">{opt.name}</p>
                  {opt.description && (
                    <p className="text-gray-500 text-sm">{opt.description}</p>
                  )}
                </div>
                <p className="text-red-600 font-bold">${opt.price.toFixed(2)}</p>
              </div>
            ))}
          </div>
          <div className="mt-6">
            <Link
              href={`/events/${event.id}/register`}
              className="inline-flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white font-semibold px-8 py-3 rounded-xl transition-colors"
            >
              Register / Order Now
            </Link>
          </div>
        </div>
      )}
    </article>
  );
}
