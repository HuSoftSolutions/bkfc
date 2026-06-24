"use client";

import { useEffect, useState } from "react";
import { collection, query, orderBy, getDocs, deleteDoc, doc } from "firebase/firestore";
import { getDb } from "@/lib/firebase";
import { ProductOrder } from "@/types";
import { Trash2, CheckCircle, Clock, Download, Send, RotateCcw } from "lucide-react";
import PrintReceipt from "@/components/PrintReceipt";
import AdminPagination from "@/components/AdminPagination";

const PER_PAGE = 15;

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<ProductOrder[]>([]);
  const [selected, setSelected] = useState<ProductOrder | null>(null);
  const [filter, setFilter] = useState<"all" | "paid" | "pending">("all");
  const [productFilter, setProductFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(1);
  const [resending, setResending] = useState(false);
  const [refunding, setRefunding] = useState(false);

  async function fetchOrders() {
    const q = query(collection(getDb(), "orders"), orderBy("createdAt", "desc"));
    const snap = await getDocs(q);
    setOrders(snap.docs.map((d) => ({ id: d.id, ...d.data() })) as ProductOrder[]);
    setPage(1);
  }

  useEffect(() => {
    const timer = setTimeout(() => {
      void fetchOrders();
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this order?")) return;
    await deleteDoc(doc(getDb(), "orders", id));
    if (selected?.id === id) setSelected(null);
    fetchOrders();
  };

  const resendReceipt = async (id: string) => {
    setResending(true);
    try {
      const res = await fetch("/api/admin/resend-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId: id }),
      });
      alert(res.ok ? "Receipt email sent!" : "Failed to send email.");
    } catch {
      alert("Failed to send email.");
    } finally {
      setResending(false);
    }
  };

  const handleRefund = async (id: string) => {
    if (!confirm("Issue a full refund for this order? This cannot be undone.")) return;
    setRefunding(true);
    try {
      const res = await fetch("/api/admin/refund-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId: id }),
      });
      const data = await res.json();
      if (res.ok) {
        alert("Refund issued successfully.");
        fetchOrders();
      } else {
        alert(data.error || "Refund failed.");
      }
    } catch {
      alert("Refund failed.");
    } finally {
      setRefunding(false);
    }
  };

  const productTitles = [...new Set(orders.map((o) => o.productTitle))].sort();

  const filtered = orders.filter((o) => {
    if (filter !== "all" && o.paymentStatus !== filter) return false;
    if (productFilter && o.productTitle !== productFilter) return false;
    const orderDate = (o.createdAt || "").split("T")[0];
    if (dateFrom && orderDate < dateFrom) return false;
    if (dateTo && orderDate > dateTo) return false;
    return true;
  });

  const totalPages = Math.ceil(filtered.length / PER_PAGE);
  const paginated = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  const fieldLabels = [
    ...new Set(filtered.flatMap((o) => (o.fields || []).map((f) => f.label))),
  ];

  const exportCsv = () => {
    const rows = filtered.map((o) => {
      const fieldCols: Record<string, string> = {};
      fieldLabels.forEach((label) => {
        fieldCols[label] = (o.fields || []).find((f) => f.label === label)?.value || "";
      });
      return {
        Name: o.name,
        Email: o.email,
        Phone: o.phone || "",
        Address: o.address?.line1 || "",
        City: o.address?.city || "",
        State: o.address?.state || "",
        Zip: o.address?.zip || "",
        Product: o.productTitle,
        Items: o.items.map((i) => `${i.name} x${i.quantity}`).join("; "),
        ...fieldCols,
        Total: `$${o.total.toFixed(2)}`,
        Status: o.paymentStatus,
        Date: new Date(o.createdAt).toLocaleDateString(),
      };
    });

    const headers = Object.keys(rows[0] || {});
    const csv = [
      headers.join(","),
      ...rows.map((row) =>
        headers
          .map((h) => `"${String(row[h as keyof typeof row] ?? "").replace(/"/g, '""')}"`)
          .join(",")
      ),
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `orders${productFilter ? `-${productFilter.toLowerCase().replace(/[^a-z0-9]+/g, "-")}` : ""}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const totalRevenue = orders
    .filter((o) => o.paymentStatus === "paid")
    .reduce((sum, o) => sum + o.total, 0);
  const pendingCount = orders.filter((o) => o.paymentStatus === "pending").length;

  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-6">Orders</h1>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
          <p className="text-gray-500 text-xs">Total Orders</p>
          <p className="text-white text-2xl font-bold">{orders.length}</p>
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
                filter === f ? "bg-red-600/20 text-red-400" : "bg-gray-800 text-gray-400 hover:text-white"
              }`}
            >
              {f}
            </button>
          ))}
        </div>
        <select
          value={productFilter}
          onChange={(e) => { setProductFilter(e.target.value); setPage(1); }}
          className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-white text-xs focus:border-red-500 focus:outline-none"
        >
          <option value="">All Products</option>
          {productTitles.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
        <input
          type="date"
          value={dateFrom}
          onChange={(e) => { setDateFrom(e.target.value); setPage(1); }}
          className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-white text-xs focus:border-red-500 focus:outline-none"
        />
        <input
          type="date"
          value={dateTo}
          onChange={(e) => { setDateTo(e.target.value); setPage(1); }}
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
          {paginated.map((order) => (
            <div
              key={order.id}
              onClick={() => setSelected(order)}
              className={`w-full text-left bg-gray-900 border rounded-lg px-4 py-3 transition-colors cursor-pointer ${
                selected?.id === order.id ? "border-red-600" : "border-gray-800"
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {order.paymentStatus === "paid" ? (
                    <CheckCircle size={14} className="text-green-400" />
                  ) : (
                    <Clock size={14} className="text-yellow-400" />
                  )}
                  <span className="text-white font-medium text-sm">{order.name}</span>
                </div>
                <span className="text-white text-sm font-medium">${order.total.toFixed(2)}</span>
              </div>
              <p className="text-gray-500 text-xs mt-1">
                {order.productTitle} · {new Date(order.createdAt).toLocaleDateString()}
              </p>
            </div>
          ))}
          {filtered.length === 0 && <p className="text-gray-500 text-sm">No orders found.</p>}
          <AdminPagination page={page} totalPages={totalPages} onPageChange={setPage} />
        </div>

        {/* Detail */}
        {selected && (
          <div className="bg-gray-900 border border-gray-800 rounded-lg p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-semibold text-lg">{selected.name}</h3>
              <span
                className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                  selected.paymentStatus === "paid"
                    ? "bg-green-900/50 text-green-400"
                    : "bg-yellow-900/50 text-yellow-400"
                }`}
              >
                {selected.paymentStatus}
              </span>
            </div>

            <div className="space-y-2 text-sm">
              <p><span className="text-gray-500">Email:</span> <span className="text-gray-300">{selected.email}</span></p>
              {selected.phone && (
                <p><span className="text-gray-500">Phone:</span> <span className="text-gray-300">{selected.phone}</span></p>
              )}
              <p><span className="text-gray-500">Product:</span> <span className="text-gray-300">{selected.productTitle}</span></p>
              {selected.address && (
                <p>
                  <span className="text-gray-500">Mailing Address:</span>{" "}
                  <span className="text-gray-300">
                    {selected.address.line1}, {selected.address.city}, {selected.address.state} {selected.address.zip}
                  </span>
                </p>
              )}
              <p className="text-gray-500 text-xs">{new Date(selected.createdAt).toLocaleString()}</p>
            </div>

            {selected.fields && selected.fields.length > 0 && (
              <div className="mt-4 pt-4 border-t border-gray-800">
                <h4 className="text-white font-medium text-sm mb-2">Order Details</h4>
                <div className="space-y-1">
                  {selected.fields.map((f, i) => (
                    <div key={i} className="flex justify-between gap-4 text-sm">
                      <span className="text-gray-500 shrink-0">{f.label}</span>
                      <span className="text-gray-300 text-right break-words">{f.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-4 pt-4 border-t border-gray-800">
              <h4 className="text-white font-medium text-sm mb-2">Items</h4>
              <div className="space-y-1">
                {selected.items.map((item, i) => (
                  <div key={i} className="flex justify-between text-sm">
                    <span className="text-gray-400">{item.name} x{item.quantity}</span>
                    <span className="text-gray-300">${(item.quantity * item.price).toFixed(2)}</span>
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
                eventTitle={selected.productTitle}
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
              {selected.paymentStatus === "paid" && selected.refundStatus !== "refunded" && (
                <button
                  onClick={() => handleRefund(selected.id)}
                  disabled={refunding}
                  className="inline-flex items-center gap-2 bg-red-900/50 hover:bg-red-800/50 disabled:opacity-50 text-red-400 text-xs font-medium px-4 py-2.5 rounded-xl transition-colors"
                >
                  <RotateCcw size={14} />
                  {refunding ? "Processing..." : "Refund"}
                </button>
              )}
              {selected.refundStatus === "refunded" && (
                <span className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-2.5 rounded-xl bg-red-900/30 text-red-400">
                  <RotateCcw size={14} /> Refunded
                </span>
              )}
              <button
                onClick={() => handleDelete(selected.id)}
                className="inline-flex items-center gap-2 bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-red-400 text-xs font-medium px-4 py-2.5 rounded-xl transition-colors"
              >
                <Trash2 size={14} /> Delete
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
