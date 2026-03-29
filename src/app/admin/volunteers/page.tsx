"use client";

import { useEffect, useState } from "react";
import {
  collection,
  query,
  orderBy,
  getDocs,
  updateDoc,
  deleteDoc,
  doc,
} from "firebase/firestore";
import { getDb } from "@/lib/firebase";
import { Trash2, CheckCircle, Clock } from "lucide-react";

interface VolunteerApp {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  message: string;
  createdAt: string;
  reviewed: boolean;
}

export default function AdminVolunteersPage() {
  const [apps, setApps] = useState<VolunteerApp[]>([]);
  const [selected, setSelected] = useState<VolunteerApp | null>(null);

  async function fetchApps() {
    const q = query(collection(getDb(), "volunteerApplications"), orderBy("createdAt", "desc"));
    const snap = await getDocs(q);
    setApps(snap.docs.map((d) => ({ id: d.id, ...d.data() })) as VolunteerApp[]);
  }

  useEffect(() => {
    fetchApps();
  }, []);

  const toggleReviewed = async (app: VolunteerApp) => {
    await updateDoc(doc(getDb(), "volunteerApplications", app.id), {
      reviewed: !app.reviewed,
    });
    fetchApps();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this application?")) return;
    await deleteDoc(doc(getDb(), "volunteerApplications", id));
    if (selected?.id === id) setSelected(null);
    fetchApps();
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-6">Volunteer Applications</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          {apps.map((app) => (
            <button
              key={app.id}
              onClick={() => setSelected(app)}
              className={`w-full text-left bg-gray-900 border rounded-lg px-4 py-3 transition-colors ${
                selected?.id === app.id
                  ? "border-red-600"
                  : app.reviewed
                  ? "border-gray-800"
                  : "border-yellow-600/50"
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {app.reviewed ? (
                    <CheckCircle size={14} className="text-green-400" />
                  ) : (
                    <Clock size={14} className="text-yellow-400" />
                  )}
                  <span className="text-white font-medium text-sm">
                    {app.firstName} {app.lastName}
                  </span>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(app.id);
                  }}
                  className="text-gray-500 hover:text-red-400 p-1"
                >
                  <Trash2 size={14} />
                </button>
              </div>
              <p className="text-gray-500 text-xs mt-1">{app.phone}</p>
              <p className="text-gray-500 text-xs">
                {new Date(app.createdAt).toLocaleDateString()}
              </p>
            </button>
          ))}
          {apps.length === 0 && (
            <p className="text-gray-500 text-sm">No applications yet.</p>
          )}
        </div>

        {selected && (
          <div className="bg-gray-900 border border-gray-800 rounded-lg p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-semibold text-lg">
                {selected.firstName} {selected.lastName}
              </h3>
              <button
                onClick={() => toggleReviewed(selected)}
                className={`text-xs font-medium px-3 py-1 rounded-full ${
                  selected.reviewed
                    ? "bg-green-900/50 text-green-400"
                    : "bg-yellow-900/50 text-yellow-400"
                }`}
              >
                {selected.reviewed ? "Reviewed" : "Mark Reviewed"}
              </button>
            </div>
            <div className="space-y-2 text-sm text-gray-300">
              <p><span className="text-gray-500">Email:</span> {selected.email}</p>
              <p><span className="text-gray-500">Phone:</span> {selected.phone}</p>
              <p>
                <span className="text-gray-500">Address:</span>{" "}
                {selected.address}, {selected.city}, {selected.state} {selected.zip}
              </p>
              <p className="text-gray-500 text-xs">
                Submitted: {new Date(selected.createdAt).toLocaleString()}
              </p>
              {selected.message && (
                <div className="mt-4 pt-4 border-t border-gray-800">
                  <p className="text-gray-500 text-xs mb-1">Message:</p>
                  <p className="text-gray-300 whitespace-pre-wrap">{selected.message}</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
