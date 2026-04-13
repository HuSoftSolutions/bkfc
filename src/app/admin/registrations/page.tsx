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
import { Trash2, CheckCircle, Clock, CreditCard, Banknote, Download, Printer, Send, RotateCcw } from "lucide-react";
import PrintReceipt from "@/components/PrintReceipt";
import AdminPagination from "@/components/AdminPagination";

const PER_PAGE = 15;

export default function AdminRegistrationsPage() {
  const [registrations, setRegistrations] = useState<EventRegistration[]>([]);
  const [selected, setSelected] = useState<EventRegistration | null>(null);
  const [filter, setFilter] = useState<"all" | "paid" | "pending">("all");
  const [eventFilter, setEventFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(1);

  async function fetchRegistrations() {
    const q = query(
      collection(getDb(), "registrations"),
      orderBy("createdAt", "desc")
    );
    const snap = await getDocs(q);
    setRegistrations(
      snap.docs.map((d) => ({ id: d.id, ...d.data() })) as EventRegistration[]
    );
    setPage(1);
  }

  useEffect(() => {
    const timer = setTimeout(() => {
      void fetchRegistrations();
    }, 0);
    return () => clearTimeout(timer);
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

  const [resending, setResending] = useState(false);
  const [refunding, setRefunding] = useState(false);

  const resendReceipt = async (id: string) => {
    setResending(true);
    try {
      const res = await fetch("/api/admin/resend-receipt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ registrationId: id }),
      });
      if (res.ok) {
        alert("Receipt email sent!");
      } else {
        alert("Failed to send email.");
      }
    } catch {
      alert("Failed to send email.");
    } finally {
      setResending(false);
    }
  };

  const handleRefund = async (id: string) => {
    if (!confirm("Issue a full refund for this registration? This cannot be undone.")) return;
    setRefunding(true);
    try {
      const res = await fetch("/api/admin/refund", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ registrationId: id }),
      });
      const data = await res.json();
      if (res.ok) {
        alert("Refund issued successfully.");
        fetchRegistrations();
      } else {
        alert(data.error || "Refund failed.");
      }
    } catch {
      alert("Refund failed.");
    } finally {
      setRefunding(false);
    }
  };

  const eventTitles = [...new Set(registrations.map((r) => r.eventTitle))].sort();

  const filtered = registrations.filter((r) => {
    if (filter !== "all" && r.paymentStatus !== filter) return false;
    if (eventFilter && r.eventTitle !== eventFilter) return false;
    const regDate = r.createdAt.split("T")[0];
    if (dateFrom && regDate < dateFrom) return false;
    if (dateTo && regDate > dateTo) return false;
    return true;
  });

  const totalPages = Math.ceil(filtered.length / PER_PAGE);
  const paginated = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  const exportCsv = () => {
    const rows = filtered.map((r) => ({
      Name: r.name,
      Email: r.email,
      Phone: r.phone || "",
      Event: r.eventTitle,
      Items: r.items.map((i) => `${i.name} x${i.quantity}`).join("; "),
      Total: `$${r.total.toFixed(2)}`,
      Payment: r.paymentMethod === "stripe" ? "Card" : "In Person",
      Status: r.paymentStatus,
      Date: new Date(r.createdAt).toLocaleDateString(),
    }));

    const headers = Object.keys(rows[0] || {});
    const csv = [
      headers.join(","),
      ...rows.map((row) =>
        headers.map((h) => `"${String(row[h as keyof typeof row]).replace(/"/g, '""')}"`).join(",")
      ),
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `registrations${eventFilter ? `-${eventFilter.toLowerCase().replace(/[^a-z0-9]+/g, "-")}` : ""}${dateFrom ? `-from-${dateFrom}` : ""}${dateTo ? `-to-${dateTo}` : ""}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

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
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
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

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="flex gap-2">
          {(["all", "paid", "pending"] as const).map((f) => (
            <button
              key={f}
              onClick={() => { setFilter(f); setPage(1); }}
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
        <select
          value={eventFilter}
          onChange={(e) => { setEventFilter(e.target.value); setPage(1); }}
          className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-white text-xs focus:border-red-500 focus:outline-none"
        >
          <option value="">All Events</option>
          {eventTitles.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
        <input
          type="date"
          value={dateFrom}
          onChange={(e) => { setDateFrom(e.target.value); setPage(1); }}
          placeholder="From"
          className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-white text-xs focus:border-red-500 focus:outline-none"
        />
        <input
          type="date"
          value={dateTo}
          onChange={(e) => { setDateTo(e.target.value); setPage(1); }}
          placeholder="To"
          className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-white text-xs focus:border-red-500 focus:outline-none"
        />
        <button
          onClick={exportCsv}
          disabled={filtered.length === 0}
          className="flex items-center gap-1.5 bg-gray-700 hover:bg-gray-600 disabled:opacity-40 text-white text-xs font-medium px-3 py-1.5 rounded-lg transition-colors ml-auto"
        >
          <Download size={14} /> Export CSV ({filtered.length})
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* List */}
        <div className="space-y-2">
          {paginated.map((reg) => (
            <div
              key={reg.id}
              onClick={() => setSelected(reg)}
              className={`w-full text-left bg-gray-900 border rounded-lg px-4 py-3 transition-colors cursor-pointer ${
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
                    className="text-gray-500 hover:text-red-400 p-1 hidden"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
              <p className="text-gray-500 text-xs mt-1">
                {reg.eventTitle} · {new Date(reg.createdAt).toLocaleDateString()}
              </p>
            </div>
          ))}
          {filtered.length === 0 && (
            <p className="text-gray-500 text-sm">No registrations found.</p>
          )}
          <AdminPagination page={page} totalPages={totalPages} onPageChange={setPage} />
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

            <div className="mt-4 pt-4 border-t border-gray-800 flex flex-wrap gap-2">
              <PrintReceipt
                type="registration"
                receiptId={selected.id}
                date={selected.createdAt}
                name={selected.name}
                email={selected.email}
                eventTitle={selected.eventTitle}
                items={selected.items}
                total={selected.total}
                paymentMethod={selected.paymentMethod}
                paymentStatus={selected.paymentStatus}
              />
              <button
                onClick={() => resendReceipt(selected.id)}
                disabled={resending}
                className="inline-flex items-center gap-2 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 text-white text-xs font-medium px-4 py-2.5 rounded-xl transition-colors"
              >
                <Send size={14} />
                {resending ? "Sending..." : "Resend Email"}
              </button>
              {selected.paymentMethod === "stripe" &&
                selected.paymentStatus === "paid" &&
                !(selected as EventRegistration & { refundStatus?: string }).refundStatus && (
                  <button
                    onClick={() => handleRefund(selected.id)}
                    disabled={refunding}
                    className="inline-flex items-center gap-2 bg-red-900/50 hover:bg-red-800/50 disabled:opacity-50 text-red-400 text-xs font-medium px-4 py-2.5 rounded-xl transition-colors"
                  >
                    <RotateCcw size={14} />
                    {refunding ? "Processing..." : "Refund"}
                  </button>
                )}
              {(selected as EventRegistration & { refundStatus?: string }).refundStatus === "refunded" && (
                <span className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-2.5 rounded-xl bg-red-900/30 text-red-400">
                  <RotateCcw size={14} />
                  Refunded
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
