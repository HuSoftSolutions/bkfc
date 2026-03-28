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
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from "@/lib/firebase";
import { Officer } from "@/types";
import { Plus, Pencil, Trash2, X } from "lucide-react";

const emptyOfficer = { name: "", title: "", image: "", order: 0 };

export default function AdminOfficersPage() {
  const [officers, setOfficers] = useState<Officer[]>([]);
  const [editing, setEditing] = useState<Partial<Officer> | null>(null);
  const [uploading, setUploading] = useState(false);

  async function fetchOfficers() {
    const q = query(collection(db, "officers"), orderBy("order", "asc"));
    const snap = await getDocs(q);
    setOfficers(snap.docs.map((d) => ({ id: d.id, ...d.data() })) as Officer[]);
  }

  useEffect(() => {
    fetchOfficers();
  }, []);

  const handleImageUpload = async (file: File) => {
    setUploading(true);
    const storageRef = ref(storage, `officers/${Date.now()}_${file.name}`);
    await uploadBytes(storageRef, file);
    const url = await getDownloadURL(storageRef);
    setEditing((prev) => (prev ? { ...prev, image: url } : prev));
    setUploading(false);
  };

  const handleSave = async () => {
    if (!editing) return;
    const data = {
      name: editing.name || "",
      title: editing.title || "",
      image: editing.image || "",
      order: editing.order || 0,
    };

    if (editing.id) {
      await updateDoc(doc(db, "officers", editing.id), data);
    } else {
      await addDoc(collection(db, "officers"), data);
    }
    setEditing(null);
    fetchOfficers();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this officer?")) return;
    await deleteDoc(doc(db, "officers", id));
    fetchOfficers();
  };

  const inputClass =
    "w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:border-red-500 focus:outline-none";

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-white">Manage Officers</h1>
        <button
          onClick={() => setEditing({ ...emptyOfficer })}
          className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
        >
          <Plus size={16} /> New Officer
        </button>
      </div>

      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-white">
                {editing.id ? "Edit Officer" : "New Officer"}
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
              <div>
                <label className="block text-xs text-gray-400 mb-1">Title/Position</label>
                <input
                  value={editing.title || ""}
                  onChange={(e) => setEditing({ ...editing, title: e.target.value })}
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
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleImageUpload(file);
                  }}
                  className="text-sm text-gray-400"
                />
                {uploading && <p className="text-xs text-gray-500 mt-1">Uploading...</p>}
                {editing.image && (
                  <img src={editing.image} alt="Preview" className="mt-2 rounded h-24 object-cover" />
                )}
              </div>
              <button
                onClick={handleSave}
                disabled={uploading}
                className="bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-medium px-6 py-2 rounded-lg transition-colors w-full"
              >
                {editing.id ? "Update" : "Create"}
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
              <p className="text-gray-500 text-xs">{officer.title}</p>
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
          <p className="text-gray-500 text-sm">No officers yet.</p>
        )}
      </div>
    </div>
  );
}
