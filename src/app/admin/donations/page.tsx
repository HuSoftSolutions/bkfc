"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
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
import { getDb, getAppAuth } from "@/lib/firebase";
import { Donation, Fund, ManualPaymentMethod } from "@/types";
import { donationFundSlug, fundLabel, GENERAL_FUND_NAME, GENERAL_FUND_SLUG } from "@/lib/funds";
import { CheckCircle, Clock, Heart, Plus, Pencil, Trash2, X, HandCoins, Target } from "lucide-react";
import AdminPagination from "@/components/AdminPagination";

const PER_PAGE = 15;

const inputClass =
  "w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:border-red-500 focus:outline-none";

const PAYMENT_METHODS: { value: ManualPaymentMethod; label: string }[] = [
  { value: "cash", label: "Cash" },
  { value: "check", label: "Check" },
  { value: "other", label: "Other" },
];

interface ManualForm {
  id?: string;
  amount: string;
  name: string;
  email: string;
  fund: string;
  paymentMethod: ManualPaymentMethod;
  note: string;
  date: string;
}

const todayLocal = () => {
  const d = new Date();
  const off = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - off).toISOString().slice(0, 10);
};

const emptyForm = (fund: string): ManualForm => ({
  amount: "",
  name: "",
  email: "",
  fund,
  paymentMethod: "cash",
  note: "",
  date: todayLocal(),
});

export default function AdminDonationsPage() {
  const [donations, setDonations] = useState<Donation[]>([]);
  const [funds, setFunds] = useState<Fund[]>([]);
  const [statusFilter, setStatusFilter] = useState<"all" | "paid" | "pending">("all");
  const [fundFilter, setFundFilter] = useState<string>("all");
  const [page, setPage] = useState(1);
  const [form, setForm] = useState<ManualForm | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function fetchAll() {
    const db = getDb();
    const [donSnap, fundSnap] = await Promise.all([
      getDocs(query(collection(db, "donations"), orderBy("createdAt", "desc"))),
      getDocs(query(collection(db, "funds"), orderBy("createdAt", "desc"))),
    ]);
    setDonations(donSnap.docs.map((d) => ({ id: d.id, ...d.data() })) as Donation[]);
    setFunds(fundSnap.docs.map((d) => ({ id: d.id, ...d.data() })) as Fund[]);
  }

  useEffect(() => {
    const timer = setTimeout(() => {
      void fetchAll();
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  const filtered = donations.filter((d) => {
    if (statusFilter !== "all" && d.paymentStatus !== statusFilter) return false;
    if (fundFilter !== "all" && donationFundSlug(d.fund) !== fundFilter) return false;
    return true;
  });

  const totalPages = Math.ceil(filtered.length / PER_PAGE);
  const paginated = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  const paid = filtered.filter((d) => d.paymentStatus === "paid");
  const totalRaised = paid.reduce((sum, d) => sum + d.amount, 0);
  const manualRaised = paid.filter((d) => d.source === "manual").reduce((sum, d) => sum + d.amount, 0);
  const pendingCount = filtered.filter((d) => d.paymentStatus === "pending").length;

  const openNew = () => {
    setError("");
    setForm(emptyForm(fundFilter === "all" ? GENERAL_FUND_SLUG : fundFilter));
  };

  const openEdit = (d: Donation) => {
    setError("");
    setForm({
      id: d.id,
      amount: String(d.amount),
      name: d.name === "Anonymous" ? "" : d.name,
      email: d.email || "",
      fund: donationFundSlug(d.fund),
      paymentMethod: d.paymentMethod || "other",
      note: d.note || "",
      date: d.createdAt.slice(0, 10),
    });
  };

  const handleSave = async () => {
    if (!form) return;
    const amount = Math.round(parseFloat(form.amount) * 100) / 100;
    if (!amount || amount <= 0) return setError("Enter an amount greater than zero.");
    if (!form.date) return setError("Enter the date received.");

    setSaving(true);
    setError("");
    try {
      // Keep the received date but stamp the current time so ordering stays stable.
      const now = new Date();
      const createdAt = `${form.date}T${now.toISOString().slice(11)}`;
      const data = {
        amount,
        name: form.name.trim() || "Anonymous",
        email: form.email.trim(),
        fund: form.fund || GENERAL_FUND_SLUG,
        paymentMethod: form.paymentMethod,
        note: form.note.trim(),
        paymentStatus: "paid" as const,
        source: "manual" as const,
      };
      if (form.id) {
        await updateDoc(doc(getDb(), "donations", form.id), { ...data, createdAt });
      } else {
        await addDoc(collection(getDb(), "donations"), {
          ...data,
          createdAt,
          enteredBy: getAppAuth().currentUser?.email || "",
        });
      }
      setForm(null);
      await fetchAll();
    } catch (err) {
      console.error(err);
      setError("Failed to save donation.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (d: Donation) => {
    if (!confirm(`Delete the $${d.amount.toFixed(2)} donation from ${d.name}? This cannot be undone.`)) return;
    await deleteDoc(doc(getDb(), "donations", d.id));
    await fetchAll();
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <h1 className="text-2xl font-bold text-white flex items-center gap-3">
          <Heart size={24} className="text-red-400" />
          Donations
        </h1>
        <div className="flex items-center gap-2">
          <Link
            href="/admin/funds"
            className="flex items-center gap-2 bg-gray-700 hover:bg-gray-600 text-white text-sm font-medium px-3 sm:px-4 py-2 rounded-lg transition-colors"
          >
            <Target size={16} /> <span className="hidden sm:inline">Funds</span>
          </Link>
          <button
            onClick={openNew}
            className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium px-3 sm:px-4 py-2 rounded-lg transition-colors"
          >
            <Plus size={16} /> Add Donation
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
          <p className="text-gray-500 text-xs">
            Total Raised{fundFilter !== "all" ? ` · ${fundLabel(fundFilter, funds)}` : ""}
          </p>
          <p className="text-green-400 text-2xl font-bold">${totalRaised.toFixed(2)}</p>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
          <p className="text-gray-500 text-xs">Recorded In Person</p>
          <p className="text-white text-2xl font-bold">${manualRaised.toFixed(2)}</p>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
          <p className="text-gray-500 text-xs">Pending</p>
          <p className="text-yellow-400 text-2xl font-bold">{pendingCount}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        {(["all", "paid", "pending"] as const).map((f) => (
          <button
            key={f}
            onClick={() => { setStatusFilter(f); setPage(1); }}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-colors ${
              statusFilter === f ? "bg-red-600/20 text-red-400" : "bg-gray-800 text-gray-400 hover:text-white"
            }`}
          >
            {f}
          </button>
        ))}
        <select
          value={fundFilter}
          onChange={(e) => { setFundFilter(e.target.value); setPage(1); }}
          className="bg-gray-800 border border-gray-700 text-gray-300 text-xs rounded-lg px-3 py-1.5 focus:border-red-500 focus:outline-none sm:ml-auto"
        >
          <option value="all">All funds</option>
          <option value={GENERAL_FUND_SLUG}>{GENERAL_FUND_NAME}</option>
          {funds.map((f) => (
            <option key={f.id} value={f.slug}>{f.name}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="bg-gray-900 border border-gray-800 rounded-lg overflow-x-auto">
        <table className="w-full text-sm min-w-[760px]">
          <thead>
            <tr className="border-b border-gray-800 text-gray-500 text-xs uppercase tracking-wider">
              <th className="text-left px-4 py-3">Status</th>
              <th className="text-left px-4 py-3">Donor</th>
              <th className="text-left px-4 py-3">Fund</th>
              <th className="text-left px-4 py-3">Source</th>
              <th className="text-right px-4 py-3">Amount</th>
              <th className="text-left px-4 py-3">Date</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {paginated.map((donation) => {
              const manual = donation.source === "manual";
              return (
                <tr key={donation.id} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                  <td className="px-4 py-3">
                    {donation.paymentStatus === "paid" ? (
                      <CheckCircle size={16} className="text-green-400" />
                    ) : (
                      <Clock size={16} className="text-yellow-400" />
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-white font-medium">{donation.name}</p>
                    {donation.email && <p className="text-gray-500 text-xs">{donation.email}</p>}
                    {donation.note && <p className="text-gray-500 text-xs italic">{donation.note}</p>}
                  </td>
                  <td className="px-4 py-3 text-gray-300">{fundLabel(donation.fund, funds)}</td>
                  <td className="px-4 py-3">
                    {manual ? (
                      <span
                        className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wider bg-blue-900/40 text-blue-300 px-2 py-0.5 rounded"
                        title={donation.enteredBy ? `Entered by ${donation.enteredBy}` : undefined}
                      >
                        <HandCoins size={10} /> {donation.paymentMethod || "manual"}
                      </span>
                    ) : (
                      <span className="text-[10px] uppercase tracking-wider bg-gray-800 text-gray-400 px-2 py-0.5 rounded">
                        Online
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right text-white font-semibold">${donation.amount.toFixed(2)}</td>
                  <td className="px-4 py-3 text-gray-500">{new Date(donation.createdAt).toLocaleDateString()}</td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    {manual && (
                      <>
                        <button onClick={() => openEdit(donation)} className="text-gray-400 hover:text-white p-1" title="Edit">
                          <Pencil size={14} />
                        </button>
                        <button onClick={() => handleDelete(donation)} className="text-gray-400 hover:text-red-400 p-1" title="Delete">
                          <Trash2 size={14} />
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <p className="text-gray-500 text-sm text-center py-8">No donations found.</p>
        )}
      </div>
      <AdminPagination page={page} totalPages={totalPages} onPageChange={setPage} />

      {/* Manual donation modal */}
      {form && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-xl w-full max-w-md max-h-[90vh] overflow-y-auto p-4 sm:p-6">
            <div className="flex items-center justify-between mb-1">
              <h2 className="text-lg font-bold text-white">{form.id ? "Edit Donation" : "Record In-Person Donation"}</h2>
              <button onClick={() => setForm(null)} className="text-gray-400 hover:text-white">
                <X size={20} />
              </button>
            </div>
            <p className="text-gray-500 text-xs mb-4">
              For cash and checks received in person. Counts toward fund totals immediately. No receipt email is sent.
            </p>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Amount ($) *</label>
                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={form.amount}
                    onChange={(e) => setForm({ ...form, amount: e.target.value })}
                    placeholder="100.00"
                    className={inputClass}
                    autoFocus
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Date received *</label>
                  <input
                    type="date"
                    value={form.date}
                    onChange={(e) => setForm({ ...form, date: e.target.value })}
                    className={inputClass}
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Fund</label>
                <select
                  value={form.fund}
                  onChange={(e) => setForm({ ...form, fund: e.target.value })}
                  className={inputClass}
                >
                  <option value={GENERAL_FUND_SLUG}>{GENERAL_FUND_NAME}</option>
                  {funds.map((f) => (
                    <option key={f.id} value={f.slug}>
                      {f.name}{f.active ? "" : " (inactive)"}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Payment method</label>
                <div className="flex gap-2">
                  {PAYMENT_METHODS.map((m) => (
                    <button
                      key={m.value}
                      type="button"
                      onClick={() => setForm({ ...form, paymentMethod: m.value })}
                      className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                        form.paymentMethod === m.value
                          ? "bg-red-600/20 text-red-400 border border-red-600/40"
                          : "bg-gray-800 text-gray-400 border border-gray-700 hover:text-white"
                      }`}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Donor name</label>
                <input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Leave blank for Anonymous"
                  className={inputClass}
                />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Donor email (optional)</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="For your records only"
                  className={inputClass}
                />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Note</label>
                <input
                  value={form.note}
                  onChange={(e) => setForm({ ...form, note: e.target.value })}
                  placeholder="e.g. Check #1042, boot drive on 9/1"
                  className={inputClass}
                />
              </div>

              {error && <p className="text-red-400 text-sm">{error}</p>}

              <div className="flex justify-end gap-2 pt-2">
                <button onClick={() => setForm(null)} className="px-4 py-2 text-sm text-gray-400 hover:text-white">
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-sm font-medium px-4 py-2 rounded-lg"
                >
                  {saving ? "Saving..." : form.id ? "Save Changes" : "Record Donation"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
