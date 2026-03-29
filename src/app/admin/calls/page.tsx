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
import { Call } from "@/types";
import { Plus, Pencil, Trash2, X } from "lucide-react";
import MediaPicker from "@/components/MediaPicker";

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
  const [calls, setCalls] = useState<Call[]>([]);
  const [editing, setEditing] = useState<Partial<Call> | null>(null);

  async function fetchCalls() {
    const q = query(collection(getDb(), "calls"), orderBy("date", "desc"));
    const snap = await getDocs(q);
    setCalls(snap.docs.map((d) => ({ id: d.id, ...d.data() })) as Call[]);
  }

  useEffect(() => {
    fetchCalls();
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

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this call?")) return;
    await deleteDoc(doc(getDb(), "calls", id));
    fetchCalls();
  };

  const inputClass =
    "w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:border-red-500 focus:outline-none";

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-white">Manage Calls</h1>
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
        {calls.map((call) => (
          <div
            key={call.id}
            className="flex items-center justify-between bg-gray-900 border border-gray-800 rounded-lg px-4 py-3"
          >
            <div>
              <p className="text-white font-medium">{call.title}</p>
              <p className="text-gray-500 text-xs">
                {call.date} {call.time && `• ${call.time}`} {call.location && `• ${call.location}`}
              </p>
            </div>
            <div className="flex items-center gap-2">
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
    </div>
  );
}
