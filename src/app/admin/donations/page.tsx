"use client";

import { useEffect, useState } from "react";
import {
  collection,
  query,
  orderBy,
  getDocs,
  deleteDoc,
  doc,
} from "firebase/firestore";
import { getDb } from "@/lib/firebase";
import { Trash2, CheckCircle, Clock, Heart } from "lucide-react";
import AdminPagination from "@/components/AdminPagination";

const PER_PAGE = 15;

interface Donation {
  id: string;
  amount: number;
  name: string;
  email: string;
  paymentStatus: "pending" | "paid" | "failed";
  stripeSessionId?: string;
  createdAt: string;
}

export default function AdminDonationsPage() {
  const [donations, setDonations] = useState<Donation[]>([]);
  const [filter, setFilter] = useState<"all" | "paid" | "pending">("all");
  const [page, setPage] = useState(1);

  async function fetchDonations() {
    const q = query(
      collection(getDb(), "donations"),
      orderBy("createdAt", "desc")
    );
    const snap = await getDocs(q);
    setDonations(
      snap.docs.map((d) => ({ id: d.id, ...d.data() })) as Donation[]
    );
    setPage(1);
  }

  useEffect(() => {
    const timer = setTimeout(() => {
      void fetchDonations();
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this donation record?")) return;
    await deleteDoc(doc(getDb(), "donations", id));
    fetchDonations();
  };

  const filtered =
    filter === "all"
      ? donations
      : donations.filter((d) => d.paymentStatus === filter);

  const totalPages = Math.ceil(filtered.length / PER_PAGE);
  const paginated = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  const totalRaised = donations
    .filter((d) => d.paymentStatus === "paid")
    .reduce((sum, d) => sum + d.amount, 0);

  const paidCount = donations.filter((d) => d.paymentStatus === "paid").length;
  const pendingCount = donations.filter(
    (d) => d.paymentStatus === "pending"
  ).length;

  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
        <Heart size={24} className="text-red-400" />
        Donations
      </h1>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
          <p className="text-gray-500 text-xs">Total Raised</p>
          <p className="text-green-400 text-2xl font-bold">
            ${totalRaised.toFixed(2)}
          </p>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
          <p className="text-gray-500 text-xs">Completed</p>
          <p className="text-white text-2xl font-bold">{paidCount}</p>
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
            onClick={() => { setFilter(f); setPage(1); }}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-colors ${
              filter === f
                ? "bg-red-600/20 text-red-400"
                : "bg-gray-800 text-gray-400 hover:text-white"
            }`}
          >
            {f} ({f === "all" ? donations.length : f === "paid" ? paidCount : pendingCount})
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-gray-900 border border-gray-800 rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-800 text-gray-500 text-xs uppercase tracking-wider">
              <th className="text-left px-4 py-3">Status</th>
              <th className="text-left px-4 py-3">Donor</th>
              <th className="text-left px-4 py-3">Email</th>
              <th className="text-right px-4 py-3">Amount</th>
              <th className="text-left px-4 py-3">Date</th>
              <th className="text-right px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {paginated.map((donation) => (
              <tr
                key={donation.id}
                className="border-b border-gray-800/50 hover:bg-gray-800/30"
              >
                <td className="px-4 py-3">
                  {donation.paymentStatus === "paid" ? (
                    <CheckCircle size={16} className="text-green-400" />
                  ) : (
                    <Clock size={16} className="text-yellow-400" />
                  )}
                </td>
                <td className="px-4 py-3 text-white font-medium">
                  {donation.name}
                </td>
                <td className="px-4 py-3 text-gray-400">{donation.email}</td>
                <td className="px-4 py-3 text-right text-white font-semibold">
                  ${donation.amount.toFixed(2)}
                </td>
                <td className="px-4 py-3 text-gray-500">
                  {new Date(donation.createdAt).toLocaleDateString()}
                </td>
                <td className="px-4 py-3 text-right">
                  <button
                    onClick={() => handleDelete(donation.id)}
                    className="text-gray-600 hover:text-red-400 p-1"
                  >
                    <Trash2 size={14} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <p className="text-gray-500 text-sm text-center py-8">
            No donations found.
          </p>
        )}
      </div>
      <AdminPagination page={page} totalPages={totalPages} onPageChange={setPage} />
    </div>
  );
}
