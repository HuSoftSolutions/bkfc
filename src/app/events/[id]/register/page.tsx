"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { doc, getDoc } from "firebase/firestore";
import { getDb } from "@/lib/firebase";
import { Event, TicketOption } from "@/types";
import { formatPhoneNumber } from "@/lib/formatPhone";
import Link from "next/link";
import {
  ArrowLeft,
  Calendar,
  Clock,
  MapPin,
  Minus,
  Plus,
  ShoppingCart,
  CreditCard,
  Banknote,
} from "lucide-react";

export default function EventRegisterPage() {
  const params = useParams();
  const router = useRouter();
  const eventId = params.id as string;

  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [form, setForm] = useState({ firstName: "", lastName: "", email: "", phone: "" });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function fetchEvent() {
      try {
        const docSnap = await getDoc(doc(getDb(), "events", eventId));
        if (docSnap.exists()) {
          const data = { id: docSnap.id, ...docSnap.data() } as Event;
          setEvent(data);
          // Initialize quantities to 0
          const q: Record<string, number> = {};
          (data.ticketOptions || []).forEach((opt) => {
            q[opt.id] = 0;
          });
          setQuantities(q);
        }
      } catch (err) {
        console.error("Error:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchEvent();
  }, [eventId]);

  const updateQty = (optionId: string, delta: number) => {
    setQuantities((prev) => ({
      ...prev,
      [optionId]: Math.max(0, (prev[optionId] || 0) + delta),
    }));
  };

  const selectedItems = (event?.ticketOptions || [])
    .filter((opt) => (quantities[opt.id] || 0) > 0)
    .map((opt) => ({
      optionId: opt.id,
      name: opt.name,
      quantity: quantities[opt.id],
      price: opt.price,
    }));

  const total = selectedItems.reduce(
    (sum, item) => sum + item.quantity * item.price,
    0
  );

  const handleSubmit = useCallback(
    async (payInPerson: boolean) => {
      if (!form.firstName || !form.lastName || !form.email || !form.phone) {
        setError("All fields are required.");
        return;
      }
      if (selectedItems.length === 0) {
        setError("Please select at least one item.");
        return;
      }

      setSubmitting(true);
      setError("");

      try {
        const res = await fetch("/api/checkout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            eventId,
            eventTitle: event?.title || "",
            firstName: form.firstName,
            lastName: form.lastName,
            email: form.email,
            phone: form.phone,
            items: selectedItems,
            payInPerson,
          }),
        });

        const data = await res.json();

        if (!res.ok) {
          setError(data.error || "Something went wrong.");
          return;
        }

        if (payInPerson) {
          router.push(
            `/events/${eventId}/confirmation?registration=${data.registrationId}`
          );
        } else if (data.url) {
          window.location.href = data.url;
        }
      } catch {
        setError("Something went wrong. Please try again.");
      } finally {
        setSubmitting(false);
      }
    },
    [form, selectedItems, eventId, event, router]
  );

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
      <div className="max-w-3xl mx-auto px-4 py-20">
        <div className="animate-pulse space-y-6">
          <div className="h-6 bg-gray-200 rounded w-32" />
          <div className="h-10 bg-gray-200 rounded w-3/4" />
          <div className="h-64 bg-gray-200 rounded-2xl" />
        </div>
      </div>
    );
  }

  if (!event || !event.ticketingEnabled) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-20 text-center">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">
          Registration Not Available
        </h1>
        <Link href="/events" className="text-red-600 hover:text-red-700">
          &larr; Back to Events
        </Link>
      </div>
    );
  }

  // Group options by category
  const categories: Record<string, TicketOption[]> = {};
  (event.ticketOptions || []).forEach((opt) => {
    const cat = opt.category || "General";
    if (!categories[cat]) categories[cat] = [];
    categories[cat].push(opt);
  });

  const inputClass =
    "w-full bg-white border border-gray-300 rounded-lg px-4 py-2.5 text-gray-900 placeholder-gray-400 focus:border-red-500 focus:outline-none transition-colors";

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <Link
        href={`/events/${eventId}`}
        className="inline-flex items-center gap-2 text-gray-500 hover:text-gray-900 text-sm mb-8 transition-colors group"
      >
        <ArrowLeft size={16} className="group-hover:-translate-x-0.5 transition-transform" />
        Back to Event
      </Link>

      {/* Event header */}
      <h1 className="text-3xl font-extrabold text-gray-900 mb-2">
        {event.title}
      </h1>
      <div className="flex flex-wrap gap-4 text-sm text-gray-500 mb-8">
        <div className="flex items-center gap-1.5">
          <Calendar size={14} className="text-red-600" />
          <span>{formatDate(event.date)}</span>
        </div>
        {event.time && (
          <div className="flex items-center gap-1.5">
            <Clock size={14} className="text-red-600" />
            <span>{formatTime(event.time)}</span>
          </div>
        )}
        {event.location && (
          <div className="flex items-center gap-1.5">
            <MapPin size={14} className="text-red-600" />
            <span>{event.location}</span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
        {/* Options */}
        <div className="lg:col-span-3 space-y-8">
          <h2 className="text-xl font-bold text-gray-900">Select Items</h2>

          {Object.entries(categories).map(([cat, options]) => (
            <div key={cat}>
              {Object.keys(categories).length > 1 && (
                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
                  {cat}
                </h3>
              )}
              <div className="space-y-3">
                {options.map((opt) => (
                  <div
                    key={opt.id}
                    className="flex items-center justify-between bg-white border border-gray-200 rounded-xl p-4"
                  >
                    <div className="flex-1">
                      <p className="text-gray-900 font-medium">{opt.name}</p>
                      {opt.description && (
                        <p className="text-gray-500 text-sm mt-0.5">
                          {opt.description}
                        </p>
                      )}
                      <p className="text-red-600 font-semibold text-sm mt-1">
                        ${opt.price.toFixed(2)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 ml-4">
                      <button
                        onClick={() => updateQty(opt.id, -1)}
                        disabled={(quantities[opt.id] || 0) === 0}
                        className="w-8 h-8 rounded-lg border border-gray-300 flex items-center justify-center text-gray-500 hover:bg-gray-50 disabled:opacity-30 transition-colors"
                      >
                        <Minus size={14} />
                      </button>
                      <span className="w-8 text-center font-medium text-gray-900">
                        {quantities[opt.id] || 0}
                      </span>
                      <button
                        onClick={() => updateQty(opt.id, 1)}
                        className="w-8 h-8 rounded-lg border border-gray-300 flex items-center justify-center text-gray-500 hover:bg-gray-50 transition-colors"
                      >
                        <Plus size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Order summary + checkout */}
        <div className="lg:col-span-2">
          <div className="sticky top-32 space-y-6">
            {/* Summary */}
            <div className="bg-gray-50 border border-gray-200 rounded-2xl p-5">
              <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                <ShoppingCart size={18} />
                Order Summary
              </h3>

              {selectedItems.length === 0 ? (
                <p className="text-gray-400 text-sm">No items selected.</p>
              ) : (
                <div className="space-y-2 mb-4">
                  {selectedItems.map((item) => (
                    <div
                      key={item.optionId}
                      className="flex justify-between text-sm"
                    >
                      <span className="text-gray-600">
                        {item.name} x{item.quantity}
                      </span>
                      <span className="text-gray-900 font-medium">
                        ${(item.quantity * item.price).toFixed(2)}
                      </span>
                    </div>
                  ))}
                  <div className="border-t border-gray-200 pt-2 flex justify-between font-bold text-gray-900">
                    <span>Total</span>
                    <span>${total.toFixed(2)}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Contact info */}
            <div className="space-y-3">
              <h3 className="font-bold text-gray-900">Your Information</h3>
              <div>
                <label className="block text-sm text-gray-500 mb-1">
                  First Name *
                </label>
                <input
                  value={form.firstName}
                  onChange={(e) =>
                    setForm({ ...form, firstName: e.target.value })
                  }
                  className={inputClass}
                />
              </div>
              <div>
                <label className="block text-sm text-gray-500 mb-1">
                  Last Name *
                </label>
                <input
                  value={form.lastName}
                  onChange={(e) =>
                    setForm({ ...form, lastName: e.target.value })
                  }
                  className={inputClass}
                />
              </div>
              <div>
                <label className="block text-sm text-gray-500 mb-1">
                  Email *
                </label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) =>
                    setForm({ ...form, email: e.target.value })
                  }
                  className={inputClass}
                />
              </div>
              <div>
                <label className="block text-sm text-gray-500 mb-1">
                  Phone *
                </label>
                <input
                  type="tel"
                  value={form.phone}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      phone: formatPhoneNumber(e.target.value),
                    })
                  }
                  className={inputClass}
                />
              </div>
            </div>

            {error && <p className="text-red-600 text-sm">{error}</p>}

            {/* Payment buttons */}
            <div className="space-y-3">
              <button
                onClick={() => handleSubmit(false)}
                disabled={submitting || selectedItems.length === 0}
                className="w-full flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-semibold py-3 rounded-xl transition-colors"
              >
                <CreditCard size={18} />
                {submitting ? "Processing..." : `Pay $${total.toFixed(2)}`}
              </button>

              {event.payInPerson && (
                <button
                  onClick={() => handleSubmit(true)}
                  disabled={submitting || selectedItems.length === 0}
                  className="w-full flex items-center justify-center gap-2 bg-white border border-gray-300 hover:bg-gray-50 disabled:opacity-50 text-gray-700 font-semibold py-3 rounded-xl transition-colors"
                >
                  <Banknote size={18} />
                  {submitting ? "Processing..." : "Register — Pay In Person"}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
