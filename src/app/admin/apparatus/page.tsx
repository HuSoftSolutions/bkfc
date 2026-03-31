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
import { Apparatus } from "@/types";
import { Plus, Pencil, Trash2, X } from "lucide-react";
import MediaPicker from "@/components/MediaPicker";

const emptyApparatus = {
  name: "",
  designation: "",
  description: "",
  specs: [] as string[],
  image: "",
  order: 0,
};

export default function AdminApparatusPage() {
  const [apparatus, setApparatus] = useState<Apparatus[]>([]);
  const [editing, setEditing] = useState<Partial<Apparatus> | null>(null);
  const [specsText, setSpecsText] = useState("");

  async function fetchApparatus() {
    const q = query(collection(getDb(), "apparatus"), orderBy("order", "asc"));
    const snap = await getDocs(q);
    setApparatus(snap.docs.map((d) => ({ id: d.id, ...d.data() })) as Apparatus[]);
  }

  useEffect(() => {
    fetchApparatus();
  }, []);

  const startEdit = (item: Partial<Apparatus>) => {
    setEditing(item);
    setSpecsText((item.specs || []).join("\n"));
  };

  const handleSave = async () => {
    if (!editing) return;
    const data = {
      name: editing.name || "",
      designation: editing.designation || "",
      description: editing.description || "",
      specs: specsText.split("\n").filter((s) => s.trim()),
      image: editing.image || "",
      order: editing.order || 0,
    };

    if (editing.id) {
      await updateDoc(doc(getDb(), "apparatus", editing.id), data);
    } else {
      await addDoc(collection(getDb(), "apparatus"), data);
    }
    setEditing(null);
    fetchApparatus();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this apparatus?")) return;
    await deleteDoc(doc(getDb(), "apparatus", id));
    fetchApparatus();
  };

  const inputClass =
    "w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:border-red-500 focus:outline-none";

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-white">Manage Apparatus</h1>
        <button
          onClick={() => startEdit({ ...emptyApparatus })}
          className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
        >
          <Plus size={16} /> New Apparatus
        </button>
      </div>

      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-white">
                {editing.id ? "Edit Apparatus" : "New Apparatus"}
              </h2>
              <button onClick={() => setEditing(null)} className="text-gray-400 hover:text-white">
                <X size={20} />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-gray-400 mb-1">Name</label>
                <input
                  value={editing.name || ""}
                  onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                  className={inputClass}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Designation</label>
                  <input
                    value={editing.designation || ""}
                    onChange={(e) => setEditing({ ...editing, designation: e.target.value })}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Display Order</label>
                  <input
                    type="number"
                    value={editing.order ?? ""}
                    onChange={(e) => setEditing({ ...editing, order: e.target.value === "" ? "" as unknown as number : parseInt(e.target.value) })}
                    className={inputClass}
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Description</label>
                <textarea
                  rows={3}
                  value={editing.description || ""}
                  onChange={(e) => setEditing({ ...editing, description: e.target.value })}
                  className={`${inputClass} resize-none`}
                />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Specs (one per line)</label>
                <textarea
                  rows={5}
                  value={specsText}
                  onChange={(e) => setSpecsText(e.target.value)}
                  className={`${inputClass} resize-none`}
                />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Image</label>
                <MediaPicker
                  value={editing.image || ""}
                  onSelect={(url) => setEditing({ ...editing, image: url })}
                  folder="apparatus"
                />
              </div>
              <button
                onClick={handleSave}
                className="bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-medium px-6 py-2 rounded-lg transition-colors w-full"
              >
                {editing.id ? "Update" : "Create"}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {apparatus.map((unit) => (
          <div
            key={unit.id}
            className="flex items-center justify-between bg-gray-900 border border-gray-800 rounded-lg px-4 py-3"
          >
            <div>
              <p className="text-white font-medium">{unit.name}</p>
              <p className="text-gray-500 text-xs">Unit #{unit.designation}</p>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => startEdit(unit)} className="text-gray-400 hover:text-white p-1">
                <Pencil size={16} />
              </button>
              <button onClick={() => handleDelete(unit.id)} className="text-gray-400 hover:text-red-400 p-1">
                <Trash2 size={16} />
              </button>
            </div>
          </div>
        ))}
        {apparatus.length === 0 && (
          <p className="text-gray-500 text-sm">No apparatus yet.</p>
        )}
      </div>
    </div>
  );
}
