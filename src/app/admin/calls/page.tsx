"use client";

import { useEffect, useState } from "react";
import {
  collection,
  query,
  orderBy,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
} from "firebase/firestore";
import { getDb } from "@/lib/firebase";
import { Call } from "@/types";
import { Plus, Pencil, Trash2, X, Pin, PinOff, ImageIcon } from "lucide-react";
import MediaPicker from "@/components/MediaPicker";
import AdminPagination from "@/components/AdminPagination";

const PER_PAGE = 15;

const emptyCall = {
  title: "",
  description: "",
  date: "",
  time: "",
  location: "",
  image: "",
  slug: "",
};

export default function AdminCallsPage() {
  const [allCalls, setAllCalls] = useState<Call[]>([]);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());
  const [editing, setEditing] = useState<Partial<Call> | null>(null);
  const [page, setPage] = useState(1);

  const calls = allCalls.filter((c) => c.date.startsWith(selectedYear));
  const totalPages = Math.ceil(calls.length / PER_PAGE);
  const paginated = calls.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  // Available years from data
  const availableYears = [...new Set(allCalls.map((c) => c.date.substring(0, 4)))].sort().reverse();

  async function fetchCalls() {
    const q = query(collection(getDb(), "calls"), orderBy("date", "desc"));
    const snap = await getDocs(q);
    const all = snap.docs.map((d) => ({ id: d.id, ...d.data() })) as Call[];
    all.sort((a, b) => {
      const dateCmp = b.date.localeCompare(a.date);
      if (dateCmp !== 0) return dateCmp;
      return (b.time || "").localeCompare(a.time || "");
    });
    setAllCalls(all);
    setPage(1);
  }

  useEffect(() => {
    const timer = setTimeout(() => {
      void fetchCalls();
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  const generateSlug = (title: string) =>
    title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");

  const handleSave = async () => {
    if (!editing) return;

    const data = {
      title: editing.title || "",
      description: editing.description || "",
      date: editing.date || "",
      time: editing.time || "",
      location: editing.location || "",
      image: editing.image || "",
      slug: editing.slug || generateSlug(editing.title || ""),
    };

    if (editing.id) {
      await updateDoc(doc(getDb(), "calls", editing.id), data);
    } else {
      await addDoc(collection(getDb(), "calls"), data);
    }

    setEditing(null);
    fetchCalls();
  };

  const togglePin = async (call: Call) => {
    await updateDoc(doc(getDb(), "calls", call.id), { pinned: !call.pinned });
    fetchCalls();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this call?")) return;
    await deleteDoc(doc(getDb(), "calls", id));

    // Clear active banner if it references this call
    try {
      const activeSnap = await getDoc(doc(getDb(), "settings", "activeCall"));
      if (activeSnap.exists() && activeSnap.data().callId === id) {
        await updateDoc(doc(getDb(), "settings", "activeCall"), {
          active: false,
          bannerText: "",
          callId: "",
          updatedAt: new Date().toISOString(),
        });
      }
    } catch {
      // non-critical
    }

    fetchCalls();
  };

  const inputClass =
    "w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:border-red-500 focus:outline-none";

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-white">
            Manage Calls
            <span className="text-gray-500 font-normal text-base ml-2">({calls.length})</span>
          </h1>
          <select
            value={selectedYear}
            onChange={(e) => { setSelectedYear(e.target.value); setPage(1); }}
            className="bg-gray-800 border border-gray-700 rounded-lg px-2 py-1 text-white text-sm focus:border-red-500 focus:outline-none"
          >
            {availableYears.map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
            {availableYears.length === 0 && (
              <option value={selectedYear}>{selectedYear}</option>
            )}
          </select>
        </div>
        <button
          onClick={() => setEditing({ ...emptyCall })}
          className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
        >
          <Plus size={16} /> New Call
        </button>
      </div>

      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-white">
                {editing.id ? "Edit Call" : "New Call"}
              </h2>
              <button onClick={() => setEditing(null)} className="text-gray-400 hover:text-white">
                <X size={20} />
              </button>
            </div>
            <div className="space-y-3">
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
                  <label className="block text-xs text-gray-400 mb-1">Date</label>
                  <input
                    type="date"
                    value={editing.date || ""}
                    onChange={(e) => setEditing({ ...editing, date: e.target.value })}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Time</label>
                  <input
                    type="time"
                    value={editing.time || ""}
                    onChange={(e) => setEditing({ ...editing, time: e.target.value })}
                    className={inputClass}
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Location</label>
                <input
                  value={editing.location || ""}
                  onChange={(e) => setEditing({ ...editing, location: e.target.value })}
                  className={inputClass}
                />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Description</label>
                <textarea
                  rows={5}
                  value={editing.description || ""}
                  onChange={(e) => setEditing({ ...editing, description: e.target.value })}
                  className={`${inputClass} resize-none`}
                />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Image</label>
                <MediaPicker
                  value={editing.image || ""}
                  onSelect={(url) => setEditing({ ...editing, image: url })}
                  folder="calls"
                />
              </div>
              <button
                onClick={handleSave}
                className="bg-red-600 hover:bg-red-700 text-white font-medium px-6 py-2 rounded-lg transition-colors w-full"
              >
                {editing.id ? "Update" : "Create"}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {paginated.map((call) => (
          <div
            key={call.id}
            className="flex items-center justify-between gap-2 bg-gray-900 border border-gray-800 rounded-lg px-3 sm:px-4 py-3"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-lg overflow-hidden bg-gray-800 shrink-0 flex items-center justify-center">
                {call.image ? (
                  <img src={call.image} alt="" className="w-full h-full object-cover" />
                ) : (
                  <ImageIcon size={16} className="text-gray-600" />
                )}
              </div>
              <div className="min-w-0">
                <p className="text-white font-medium truncate">{call.title}</p>
                <p className="text-gray-500 text-xs">
                  {call.date} {call.time && `• ${call.time}`} {call.location && `• ${call.location}`}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <button
                onClick={() => togglePin(call)}
                className={`p-1 ${call.pinned ? "text-yellow-400" : "text-gray-600 hover:text-yellow-400"}`}
                title={call.pinned ? "Unpin" : "Pin to top"}
              >
                {call.pinned ? <Pin size={16} /> : <PinOff size={16} />}
              </button>
              <button
                onClick={() => setEditing(call)}
                className="text-gray-400 hover:text-white p-1"
              >
                <Pencil size={16} />
              </button>
              <button
                onClick={() => handleDelete(call.id)}
                className="text-gray-400 hover:text-red-400 p-1"
              >
                <Trash2 size={16} />
              </button>
            </div>
          </div>
        ))}
        {calls.length === 0 && (
          <p className="text-gray-500 text-sm">No calls yet. Create one to get started.</p>
        )}
      </div>
      <AdminPagination page={page} totalPages={totalPages} onPageChange={setPage} />
    </div>
  );
}
