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
import { EventRegistration } from "@/types";
import { Trash2, CheckCircle, Clock, CreditCard, Banknote } from "lucide-react";

export default function AdminRegistrationsPage() {
  const [registrations, setRegistrations] = useState<EventRegistration[]>([]);
  const [selected, setSelected] = useState<EventRegistration | null>(null);
  const [filter, setFilter] = useState<"all" | "paid" | "pending">("all");

  async function fetchRegistrations() {
    const q = query(
      collection(getDb(), "registrations"),
      orderBy("createdAt", "desc")
    );
    const snap = await getDocs(q);
    setRegistrations(
      snap.docs.map((d) => ({ id: d.id, ...d.data() })) as EventRegistration[]
    );
  }

  useEffect(() => {
    fetchRegistrations();
  }, []);

  const markPaid = async (id: string) => {
    await updateDoc(doc(getDb(), "registrations", id), {
      paymentStatus: "paid",
    });
    fetchRegistrations();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this registration?")) return;
    await deleteDoc(doc(getDb(), "registrations", id));
    if (selected?.id === id) setSelected(null);
    fetchRegistrations();
  };

  const filtered =
    filter === "all"
      ? registrations
      : registrations.filter((r) => r.paymentStatus === filter);

  const totalRevenue = registrations
    .filter((r) => r.paymentStatus === "paid")
    .reduce((sum, r) => sum + r.total, 0);

  const pendingCount = registrations.filter(
    (r) => r.paymentStatus === "pending"
  ).length;

  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-6">Registrations</h1>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
          <p className="text-gray-500 text-xs">Total Orders</p>
          <p className="text-white text-2xl font-bold">{registrations.length}</p>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
          <p className="text-gray-500 text-xs">Revenue (Paid)</p>
          <p className="text-green-400 text-2xl font-bold">${totalRevenue.toFixed(2)}</p>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
          <p className="text-gray-500 text-xs">Pending</p>
          <p className="text-yellow-400 text-2xl font-bold">{pendingCount}</p>
        </div>
      </div>

      {/* Filter */}
      <div className="flex gap-2 mb-4">
        {(["all", "paid", "pending"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-colors ${
              filter === f
                ? "bg-red-600/20 text-red-400"
                : "bg-gray-800 text-gray-400 hover:text-white"
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* List */}
        <div className="space-y-2">
          {filtered.map((reg) => (
            <button
              key={reg.id}
              onClick={() => setSelected(reg)}
              className={`w-full text-left bg-gray-900 border rounded-lg px-4 py-3 transition-colors ${
                selected?.id === reg.id ? "border-red-600" : "border-gray-800"
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {reg.paymentStatus === "paid" ? (
                    <CheckCircle size={14} className="text-green-400" />
                  ) : (
                    <Clock size={14} className="text-yellow-400" />
                  )}
                  <span className="text-white font-medium text-sm">{reg.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-white text-sm font-medium">
                    ${reg.total.toFixed(2)}
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(reg.id);
                    }}
                    className="text-gray-500 hover:text-red-400 p-1"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
              <p className="text-gray-500 text-xs mt-1">
                {reg.eventTitle} · {new Date(reg.createdAt).toLocaleDateString()}
              </p>
            </button>
          ))}
          {filtered.length === 0 && (
            <p className="text-gray-500 text-sm">No registrations found.</p>
          )}
        </div>

        {/* Detail */}
        {selected && (
          <div className="bg-gray-900 border border-gray-800 rounded-lg p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-semibold text-lg">{selected.name}</h3>
              {selected.paymentStatus === "pending" &&
                selected.paymentMethod === "in-person" && (
                  <button
                    onClick={() => markPaid(selected.id)}
                    className="text-xs font-medium px-3 py-1 rounded-full bg-green-900/50 text-green-400 hover:bg-green-800/50"
                  >
                    Mark Paid
                  </button>
                )}
            </div>

            <div className="space-y-2 text-sm">
              <p><span className="text-gray-500">Email:</span> <span className="text-gray-300">{selected.email}</span></p>
              {selected.phone && (
                <p><span className="text-gray-500">Phone:</span> <span className="text-gray-300">{selected.phone}</span></p>
              )}
              <p><span className="text-gray-500">Event:</span> <span className="text-gray-300">{selected.eventTitle}</span></p>
              <p>
                <span className="text-gray-500">Payment: </span>
                <span className="text-gray-300 inline-flex items-center gap-1">
                  {selected.paymentMethod === "stripe" ? (
                    <><CreditCard size={12} /> Card</>
                  ) : (
                    <><Banknote size={12} /> In Person</>
                  )}
                </span>
              </p>
              <p>
                <span className="text-gray-500">Status: </span>
                <span
                  className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                    selected.paymentStatus === "paid"
                      ? "bg-green-900/50 text-green-400"
                      : "bg-yellow-900/50 text-yellow-400"
                  }`}
                >
                  {selected.paymentStatus}
                </span>
              </p>
              <p className="text-gray-500 text-xs">
                {new Date(selected.createdAt).toLocaleString()}
              </p>
            </div>

            <div className="mt-4 pt-4 border-t border-gray-800">
              <h4 className="text-white font-medium text-sm mb-2">Items</h4>
              <div className="space-y-1">
                {selected.items.map((item, i) => (
                  <div key={i} className="flex justify-between text-sm">
                    <span className="text-gray-400">
                      {item.name} x{item.quantity}
                    </span>
                    <span className="text-gray-300">
                      ${(item.quantity * item.price).toFixed(2)}
                    </span>
                  </div>
                ))}
                <div className="border-t border-gray-800 pt-1 flex justify-between text-sm font-bold">
                  <span className="text-gray-400">Total</span>
                  <span className="text-white">${selected.total.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
