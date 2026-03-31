"use client";

import { useEffect, useState } from "react";
import {
  collection,
  query,
  orderBy,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
} from "firebase/firestore";
import { getDb } from "@/lib/firebase";
import { Event, TicketOption } from "@/types";
import { Plus, Pencil, Trash2, X, Eye, EyeOff, Ticket, Pin, PinOff } from "lucide-react";
import MediaPicker from "@/components/MediaPicker";
import Link from "next/link";
import AdminPagination from "@/components/AdminPagination";

const PER_PAGE = 15;

const emptyEvent: Partial<Event> = {
  title: "",
  description: "",
  date: "",
  time: "",
  endDate: "",
  endTime: "",
  location: "",
  image: "",
  published: true,
  ticketingEnabled: false,
  payInPerson: false,
  ticketOptions: [],
  registrationDeadline: "",
};

export default function AdminEventsPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [editing, setEditing] = useState<Partial<Event> | null>(null);
  const [page, setPage] = useState(1);

  const totalPages = Math.ceil(events.length / PER_PAGE);
  const paginated = events.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  async function fetchEvents() {
    const q = query(collection(getDb(), "events"), orderBy("date", "desc"));
    const snap = await getDocs(q);
    setEvents(snap.docs.map((d) => ({ id: d.id, ...d.data() })) as Event[]);
    setPage(1);
  }

  useEffect(() => {
    fetchEvents();
  }, []);

  // Ticket option helpers
  const addTicketOption = () => {
    const newOpt: TicketOption = {
      id: crypto.randomUUID(),
      name: "",
      description: "",
      price: 0,
      category: "",
    };
    setEditing((prev) =>
      prev
        ? { ...prev, ticketOptions: [...(prev.ticketOptions || []), newOpt] }
        : prev
    );
  };

  const updateTicketOption = (
    optId: string,
    field: keyof TicketOption,
    value: string | number
  ) => {
    setEditing((prev) => {
      if (!prev) return prev;
      const opts = (prev.ticketOptions || []).map((o) =>
        o.id === optId ? { ...o, [field]: value } : o
      );
      return { ...prev, ticketOptions: opts };
    });
  };

  const removeTicketOption = (optId: string) => {
    setEditing((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        ticketOptions: (prev.ticketOptions || []).filter((o) => o.id !== optId),
      };
    });
  };

  const handleSave = async () => {
    if (!editing) return;

    const data = {
      title: editing.title || "",
      description: editing.description || "",
      date: editing.date || "",
      time: editing.time || "",
      endDate: editing.endDate || "",
      endTime: editing.endTime || "",
      location: editing.location || "",
      image: editing.image || "",
      published: editing.published ?? true,
      ticketingEnabled: editing.ticketingEnabled ?? false,
      payInPerson: editing.payInPerson ?? false,
      ticketOptions: (editing.ticketOptions || []).filter((o) => o.name),
      registrationDeadline: editing.registrationDeadline || "",
    };

    if (editing.id) {
      await updateDoc(doc(getDb(), "events", editing.id), data);
    } else {
      await addDoc(collection(getDb(), "events"), data);
    }

    setEditing(null);
    fetchEvents();
  };

  const togglePin = async (event: Event) => {
    await updateDoc(doc(getDb(), "events", event.id), { pinned: !event.pinned });
    fetchEvents();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this event?")) return;
    await deleteDoc(doc(getDb(), "events", id));
    fetchEvents();
  };

  const inputClass =
    "w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:border-red-500 focus:outline-none";

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-white">Manage Events</h1>
        <div className="flex items-center gap-2">
          <Link
            href="/admin/registrations"
            className="flex items-center gap-2 bg-gray-700 hover:bg-gray-600 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
          >
            <Ticket size={16} /> Registrations
          </Link>
          <button
            onClick={() => setEditing({ ...emptyEvent })}
            className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
          >
            <Plus size={16} /> New Event
          </button>
        </div>
      </div>

      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-white">
                {editing.id ? "Edit Event" : "New Event"}
              </h2>
              <button onClick={() => setEditing(null)} className="text-gray-400 hover:text-white">
                <X size={20} />
              </button>
            </div>
            <div className="space-y-3">
              {/* Basic fields */}
              <div>
                <label className="block text-xs text-gray-400 mb-1">Title</label>
                <input
                  value={editing.title || ""}
                  onChange={(e) => setEditing({ ...editing, title: e.target.value })}
                  className={inputClass}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Start Date</label>
                  <input type="date" value={editing.date || ""} onChange={(e) => setEditing({ ...editing, date: e.target.value })} className={inputClass} />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Start Time</label>
                  <input type="time" value={editing.time || ""} onChange={(e) => setEditing({ ...editing, time: e.target.value })} className={inputClass} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-400 mb-1">End Date</label>
                  <input type="date" value={editing.endDate || ""} onChange={(e) => setEditing({ ...editing, endDate: e.target.value })} className={inputClass} />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">End Time</label>
                  <input type="time" value={editing.endTime || ""} onChange={(e) => setEditing({ ...editing, endTime: e.target.value })} className={inputClass} />
                </div>
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Location</label>
                <input value={editing.location || ""} onChange={(e) => setEditing({ ...editing, location: e.target.value })} className={inputClass} />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Description</label>
                <textarea rows={4} value={editing.description || ""} onChange={(e) => setEditing({ ...editing, description: e.target.value })} className={`${inputClass} resize-none`} />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Image</label>
                <MediaPicker value={editing.image || ""} onSelect={(url) => setEditing({ ...editing, image: url })} folder="uploads" />
              </div>

              {/* Toggles */}
              <div className="flex flex-wrap gap-4 pt-2">
                <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
                  <input type="checkbox" checked={editing.published ?? true} onChange={(e) => setEditing({ ...editing, published: e.target.checked })} className="rounded" />
                  Published
                </label>
                <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
                  <input type="checkbox" checked={editing.ticketingEnabled ?? false} onChange={(e) => setEditing({ ...editing, ticketingEnabled: e.target.checked })} className="rounded" />
                  Enable Ticketing / Registration
                </label>
                {editing.ticketingEnabled && (
                  <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
                    <input type="checkbox" checked={editing.payInPerson ?? false} onChange={(e) => setEditing({ ...editing, payInPerson: e.target.checked })} className="rounded" />
                    Allow Pay In Person
                  </label>
                )}
              </div>

              {/* Ticket Options */}
              {editing.ticketingEnabled && (
                <div className="border-t border-gray-700 pt-4 mt-2">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-white font-semibold text-sm">Ticket / Menu Options</h3>
                    <button
                      onClick={addTicketOption}
                      className="flex items-center gap-1 text-red-400 hover:text-red-300 text-xs font-medium"
                    >
                      <Plus size={14} /> Add Option
                    </button>
                  </div>

                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Registration Deadline</label>
                    <input type="date" value={editing.registrationDeadline || ""} onChange={(e) => setEditing({ ...editing, registrationDeadline: e.target.value })} className={inputClass} />
                  </div>

                  <div className="space-y-3 mt-3">
                    {(editing.ticketOptions || []).map((opt, idx) => (
                      <div key={opt.id} className="bg-gray-800 border border-gray-700 rounded-lg p-3 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-gray-400 text-xs">Option #{idx + 1}</span>
                          <button onClick={() => removeTicketOption(opt.id)} className="text-gray-500 hover:text-red-400">
                            <Trash2 size={14} />
                          </button>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="block text-[10px] text-gray-500 mb-0.5">Name *</label>
                            <input
                              value={opt.name}
                              onChange={(e) => updateTicketOption(opt.id, "name", e.target.value)}
                              placeholder="e.g. Chicken Dinner"
                              className={inputClass}
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] text-gray-500 mb-0.5">Price ($) *</label>
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              value={opt.price || ""}
                              onChange={(e) => updateTicketOption(opt.id, "price", parseFloat(e.target.value) || 0)}
                              placeholder="12.00"
                              className={inputClass}
                            />
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="block text-[10px] text-gray-500 mb-0.5">Category</label>
                            <input
                              value={opt.category || ""}
                              onChange={(e) => updateTicketOption(opt.id, "category", e.target.value)}
                              placeholder="e.g. Entree, Side, Drink"
                              className={inputClass}
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] text-gray-500 mb-0.5">Max Qty (0 = unlimited)</label>
                            <input
                              type="number"
                              min="0"
                              value={opt.maxQuantity || ""}
                              onChange={(e) => updateTicketOption(opt.id, "maxQuantity", e.target.value === "" ? 0 : parseInt(e.target.value))}
                              className={inputClass}
                            />
                          </div>
                        </div>
                        <div>
                          <label className="block text-[10px] text-gray-500 mb-0.5">Description</label>
                          <input
                            value={opt.description || ""}
                            onChange={(e) => updateTicketOption(opt.id, "description", e.target.value)}
                            placeholder="Optional details"
                            className={inputClass}
                          />
                        </div>
                      </div>
                    ))}
                    {(editing.ticketOptions || []).length === 0 && (
                      <p className="text-gray-500 text-xs text-center py-4">
                        No options yet. Add ticket/menu options above.
                      </p>
                    )}
                  </div>
                </div>
              )}

              <button
                onClick={handleSave}
                className="bg-red-600 hover:bg-red-700 text-white font-medium px-6 py-2 rounded-lg transition-colors w-full mt-4"
              >
                {editing.id ? "Update" : "Create"}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {paginated.map((event) => (
          <div
            key={event.id}
            className="flex items-center justify-between bg-gray-900 border border-gray-800 rounded-lg px-4 py-3"
          >
            <div className="flex items-center gap-3">
              {event.published ? (
                <Eye size={16} className="text-green-400" />
              ) : (
                <EyeOff size={16} className="text-gray-500" />
              )}
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-white font-medium">{event.title}</p>
                  {event.ticketingEnabled && (
                    <span className="bg-blue-600/20 text-blue-400 text-[10px] font-medium px-2 py-0.5 rounded-full">
                      Ticketed
                    </span>
                  )}
                </div>
                <p className="text-gray-500 text-xs">
                  {event.date} {event.time && `• ${event.time}`} {event.location && `• ${event.location}`}
                  {event.ticketOptions && event.ticketOptions.length > 0 && ` • ${event.ticketOptions.length} options`}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => togglePin(event)}
                className={`p-1 ${event.pinned ? "text-yellow-400" : "text-gray-600 hover:text-yellow-400"}`}
                title={event.pinned ? "Unpin" : "Pin to top"}
              >
                {event.pinned ? <Pin size={16} /> : <PinOff size={16} />}
              </button>
              <button onClick={() => setEditing(event)} className="text-gray-400 hover:text-white p-1">
                <Pencil size={16} />
              </button>
              <button onClick={() => handleDelete(event.id)} className="text-gray-400 hover:text-red-400 p-1">
                <Trash2 size={16} />
              </button>
            </div>
          </div>
        ))}
        {events.length === 0 && (
          <p className="text-gray-500 text-sm">No events yet. Create one to get started.</p>
        )}
      </div>
      <AdminPagination page={page} totalPages={totalPages} onPageChange={setPage} />
    </div>
  );
}
