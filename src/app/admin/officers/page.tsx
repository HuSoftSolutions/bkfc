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
import { Officer } from "@/types";
import { Plus, Pencil, Trash2, X } from "lucide-react";
import MediaPicker from "@/components/MediaPicker";

const RANK_OPTIONS = [
  "Chief",
  "Assistant Chief",
  "Captain",
  "Lieutenant",
  "Safety Officer",
  "Accountability Officer",
  "Fire Police Chief",
  "President",
  "Vice President",
  "Treasurer",
  "Secretary",
  "Firefighter",
  "Probationary",
  "Junior Firefighter",
  "Administrative",
  "Honorary Member",
  "Other",
];

const emptyOfficer: Partial<Officer> = {
  name: "",
  title: "",
  rank: "",
  servingSince: "",
  image: "",
  order: 0,
};

export default function AdminOfficersPage() {
  const [officers, setOfficers] = useState<Officer[]>([]);
  const [editing, setEditing] = useState<Partial<Officer> | null>(null);

  async function fetchOfficers() {
    const q = query(collection(getDb(), "officers"), orderBy("order", "asc"));
    const snap = await getDocs(q);
    setOfficers(snap.docs.map((d) => ({ id: d.id, ...d.data() })) as Officer[]);
  }

  useEffect(() => {
    fetchOfficers();
  }, []);

  const handleSave = async () => {
    if (!editing) return;
    const data = {
      name: editing.name || "",
      title: editing.title || "",
      rank: editing.rank || "",
      servingSince: editing.servingSince || "",
      image: editing.image || "",
      order: editing.order || 0,
    };

    if (editing.id) {
      await updateDoc(doc(getDb(), "officers", editing.id), data);
    } else {
      await addDoc(collection(getDb(), "officers"), data);
    }
    setEditing(null);
    fetchOfficers();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Remove this member?")) return;
    await deleteDoc(doc(getDb(), "officers", id));
    fetchOfficers();
  };

  const inputClass =
    "w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:border-red-500 focus:outline-none";

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-white">Manage Roster</h1>
        <button
          onClick={() => setEditing({ ...emptyOfficer })}
          className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
        >
          <Plus size={16} /> Add Member
        </button>
      </div>

      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-xl w-full max-w-md max-h-[90vh] overflow-y-auto p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-white">
                {editing.id ? "Edit Member" : "Add Member"}
              </h2>
              <button onClick={() => setEditing(null)} className="text-gray-400 hover:text-white">
                <X size={20} />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-gray-400 mb-1">Name *</label>
                <input
                  value={editing.name || ""}
                  onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                  placeholder="Last, First"
                  className={inputClass}
                />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Rank</label>
                <select
                  value={editing.rank || ""}
                  onChange={(e) => setEditing({ ...editing, rank: e.target.value })}
                  className={inputClass}
                >
                  <option value="">Select rank...</option>
                  {RANK_OPTIONS.map((r) => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Title/Position (optional)</label>
                <input
                  value={editing.title || ""}
                  onChange={(e) => setEditing({ ...editing, title: e.target.value })}
                  placeholder="e.g. 2nd Lieutenant, Secretary"
                  className={inputClass}
                />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Serving Since</label>
                <input
                  value={editing.servingSince || ""}
                  onChange={(e) => setEditing({ ...editing, servingSince: e.target.value })}
                  placeholder="e.g. 2019"
                  className={inputClass}
                />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Display Order</label>
                <input
                  type="number"
                  value={editing.order || 0}
                  onChange={(e) => setEditing({ ...editing, order: parseInt(e.target.value) || 0 })}
                  className={inputClass}
                />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Photo</label>
                <MediaPicker
                  value={editing.image || ""}
                  onSelect={(url) => setEditing({ ...editing, image: url })}
                  folder="officers"
                />
              </div>
              <button
                onClick={handleSave}
                className="bg-red-600 hover:bg-red-700 text-white font-medium px-6 py-2 rounded-lg transition-colors w-full"
              >
                {editing.id ? "Update" : "Add"}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {officers.map((officer) => (
          <div
            key={officer.id}
            className="flex items-center justify-between bg-gray-900 border border-gray-800 rounded-lg px-4 py-3"
          >
            <div>
              <p className="text-white font-medium">{officer.name}</p>
              <p className="text-gray-500 text-xs">
                {officer.rank}
                {officer.title && ` — ${officer.title}`}
                {officer.servingSince && ` · Since ${officer.servingSince}`}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => setEditing(officer)} className="text-gray-400 hover:text-white p-1">
                <Pencil size={16} />
              </button>
              <button onClick={() => handleDelete(officer.id)} className="text-gray-400 hover:text-red-400 p-1">
                <Trash2 size={16} />
              </button>
            </div>
          </div>
        ))}
        {officers.length === 0 && (
          <p className="text-gray-500 text-sm">No members yet.</p>
        )}
      </div>
    </div>
  );
}
