"use client";

import { useEffect, useState } from "react";
import { collection, query, orderBy, getDocs } from "firebase/firestore";
import { getDb } from "@/lib/firebase";
import { EventRegistration, Donation, Fund } from "@/types";
import { donationFundSlug, fundLabel } from "@/lib/funds";
import { Download, ChevronDown, ChevronRight } from "lucide-react";

interface ItemBreakdown {
  name: string;
  quantity: number;
  revenue: number;
}

interface EventGroup {
  eventTitle: string;
  registrations: EventRegistration[];
  totalRevenue: number;
  orderCount: number;
  items: ItemBreakdown[];
}

export default function AdminFinancesPage() {
  const [registrations, setRegistrations] = useState<EventRegistration[]>([]);
  const [donations, setDonations] = useState<Donation[]>([]);
  const [funds, setFunds] = useState<Fund[]>([]);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [expandedEvents, setExpandedEvents] = useState<Set<string>>(new Set());
  const [donationsExpanded, setDonationsExpanded] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      void fetchData();
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  async function fetchData() {
    const db = getDb();
    const [regSnap, donSnap, fundSnap] = await Promise.all([
      getDocs(query(collection(db, "registrations"), orderBy("createdAt", "desc"))),
      getDocs(query(collection(db, "donations"), orderBy("createdAt", "desc"))),
      getDocs(collection(db, "funds")),
    ]);
    setRegistrations(regSnap.docs.map((d) => ({ id: d.id, ...d.data() })) as EventRegistration[]);
    setDonations(donSnap.docs.map((d) => ({ id: d.id, ...d.data() })) as Donation[]);
    setFunds(fundSnap.docs.map((d) => ({ id: d.id, ...d.data() })) as Fund[]);
  }

  // Filter by date range and paid status
  const filterByDate = <T extends { createdAt: string }>(items: T[]) =>
    items.filter((item) => {
      const date = item.createdAt.split("T")[0];
      if (dateFrom && date < dateFrom) return false;
      if (dateTo && date > dateTo) return false;
      return true;
    });

  const paidRegistrations = filterByDate(registrations.filter((r) => r.paymentStatus === "paid"));
  const paidDonations = filterByDate(donations.filter((d) => d.paymentStatus === "paid"));

  // Group registrations by event
  const eventGroups: EventGroup[] = (() => {
    const map = new Map<string, EventRegistration[]>();
    for (const reg of paidRegistrations) {
      const list = map.get(reg.eventTitle) || [];
      list.push(reg);
      map.set(reg.eventTitle, list);
    }

    return Array.from(map.entries())
      .map(([eventTitle, regs]) => {
        const itemMap = new Map<string, ItemBreakdown>();
        for (const reg of regs) {
          for (const item of reg.items) {
            const existing = itemMap.get(item.name) || { name: item.name, quantity: 0, revenue: 0 };
            existing.quantity += item.quantity;
            existing.revenue += item.quantity * item.price;
            itemMap.set(item.name, existing);
          }
        }

        return {
          eventTitle,
          registrations: regs,
          totalRevenue: regs.reduce((sum, r) => sum + r.total, 0),
          orderCount: regs.length,
          items: Array.from(itemMap.values()).sort((a, b) => b.revenue - a.revenue),
        };
      })
      .sort((a, b) => b.totalRevenue - a.totalRevenue);
  })();

  const totalEventRevenue = eventGroups.reduce((sum, g) => sum + g.totalRevenue, 0);
  const totalDonationRevenue = paidDonations.reduce((sum, d) => sum + d.amount, 0);
  const totalRevenue = totalEventRevenue + totalDonationRevenue;

  // Per-fund donation totals, split by online vs. in-person
  const fundGroups = (() => {
    const map = new Map<string, { slug: string; name: string; total: number; count: number; manual: number }>();
    for (const don of paidDonations) {
      const slug = donationFundSlug(don.fund);
      const g = map.get(slug) || { slug, name: fundLabel(slug, funds), total: 0, count: 0, manual: 0 };
      g.total += don.amount;
      g.count += 1;
      if (don.source === "manual") g.manual += don.amount;
      map.set(slug, g);
    }
    return Array.from(map.values()).sort((a, b) => b.total - a.total);
  })();

  const toggleEvent = (title: string) => {
    setExpandedEvents((prev) => {
      const next = new Set(prev);
      if (next.has(title)) next.delete(title);
      else next.add(title);
      return next;
    });
  };

  const exportCsv = () => {
    const rows: string[][] = [];
    rows.push(["Category", "Event/Fund", "Item", "Quantity", "Amount", "Name", "Email", "Date", "Method", "Note"]);

    for (const group of eventGroups) {
      for (const reg of group.registrations) {
        for (const item of reg.items) {
          rows.push([
            "Event",
            reg.eventTitle,
            item.name,
            String(item.quantity),
            `$${(item.quantity * item.price).toFixed(2)}`,
            reg.name,
            reg.email,
            new Date(reg.createdAt).toLocaleDateString(),
          ]);
        }
      }
    }

    for (const don of paidDonations) {
      rows.push([
        "Donation",
        fundLabel(don.fund, funds),
        "",
        "",
        `$${don.amount.toFixed(2)}`,
        don.name,
        don.email,
        new Date(don.createdAt).toLocaleDateString(),
        don.source === "manual" ? don.paymentMethod || "manual" : "card",
        don.note || "",
      ]);
    }

    // Summary section
    rows.push([]);
    rows.push(["--- SUMMARY ---"]);
    rows.push(["Total Revenue", "", "", "", `$${totalRevenue.toFixed(2)}`]);
    rows.push(["Event Revenue", "", "", "", `$${totalEventRevenue.toFixed(2)}`]);
    rows.push(["Donation Revenue", "", "", "", `$${totalDonationRevenue.toFixed(2)}`]);
    rows.push([]);
    rows.push(["--- FUND BREAKDOWN ---"]);
    for (const g of fundGroups) {
      rows.push([g.name, "", "", "", `$${g.total.toFixed(2)}`, `${g.count} donations`, `$${g.manual.toFixed(2)} in person`]);
    }
    rows.push([]);
    rows.push(["--- EVENT BREAKDOWN ---"]);
    for (const group of eventGroups) {
      rows.push([group.eventTitle, "", "", "", `$${group.totalRevenue.toFixed(2)}`, `${group.orderCount} orders`]);
      for (const item of group.items) {
        rows.push(["", "", item.name, String(item.quantity), `$${item.revenue.toFixed(2)}`]);
      }
    }

    const csv = rows
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `financial-report${dateFrom ? `-from-${dateFrom}` : ""}${dateTo ? `-to-${dateTo}` : ""}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-white">Finances</h1>
        <button
          onClick={exportCsv}
          disabled={paidRegistrations.length === 0 && paidDonations.length === 0}
          className="flex items-center gap-1.5 bg-gray-700 hover:bg-gray-600 disabled:opacity-40 text-white text-xs font-medium px-3 py-1.5 rounded-lg transition-colors"
        >
          <Download size={14} /> Export CSV
        </button>
      </div>

      {/* Date Range */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="flex flex-col gap-1">
          <label className="text-gray-500 text-xs">From</label>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-white text-xs focus:border-red-500 focus:outline-none"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-gray-500 text-xs">To</label>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-white text-xs focus:border-red-500 focus:outline-none"
          />
        </div>
        {(dateFrom || dateTo) && (
          <button
            onClick={() => { setDateFrom(""); setDateTo(""); }}
            className="text-gray-400 hover:text-white text-xs px-2 self-end pb-1.5"
          >
            Clear
          </button>
        )}
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
          <p className="text-gray-500 text-xs">Total Revenue</p>
          <p className="text-green-400 text-2xl font-bold">${totalRevenue.toFixed(2)}</p>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
          <p className="text-gray-500 text-xs">Event Revenue</p>
          <p className="text-white text-2xl font-bold">${totalEventRevenue.toFixed(2)}</p>
          <p className="text-gray-500 text-xs mt-1">{paidRegistrations.length} orders</p>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
          <p className="text-gray-500 text-xs">Donations</p>
          <p className="text-white text-2xl font-bold">${totalDonationRevenue.toFixed(2)}</p>
          <p className="text-gray-500 text-xs mt-1">{paidDonations.length} donations</p>
        </div>
      </div>

      {/* Event Breakdown */}
      <h2 className="text-lg font-semibold text-white mb-3">Events</h2>
      <div className="space-y-2 mb-8">
        {eventGroups.length === 0 && (
          <p className="text-gray-500 text-sm">No event revenue in this period.</p>
        )}
        {eventGroups.map((group) => {
          const isExpanded = expandedEvents.has(group.eventTitle);
          return (
            <div key={group.eventTitle} className="bg-gray-900 border border-gray-800 rounded-lg overflow-hidden">
              <button
                onClick={() => toggleEvent(group.eventTitle)}
                className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-800/50 transition-colors"
              >
                <div className="flex items-center gap-2">
                  {isExpanded ? (
                    <ChevronDown size={16} className="text-gray-400" />
                  ) : (
                    <ChevronRight size={16} className="text-gray-400" />
                  )}
                  <span className="text-white font-medium text-sm">{group.eventTitle}</span>
                  <span className="text-gray-500 text-xs">{group.orderCount} orders</span>
                </div>
                <span className="text-green-400 font-medium text-sm">${group.totalRevenue.toFixed(2)}</span>
              </button>

              {isExpanded && (
                <div className="border-t border-gray-800 px-4 py-3">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-gray-500 text-xs uppercase">
                        <th className="text-left pb-2">Item</th>
                        <th className="text-right pb-2">Qty Sold</th>
                        <th className="text-right pb-2">Revenue</th>
                      </tr>
                    </thead>
                    <tbody>
                      {group.items.map((item) => (
                        <tr key={item.name} className="border-t border-gray-800/50">
                          <td className="text-gray-300 py-1.5">{item.name}</td>
                          <td className="text-gray-400 text-right py-1.5">{item.quantity}</td>
                          <td className="text-white text-right py-1.5">${item.revenue.toFixed(2)}</td>
                        </tr>
                      ))}
                      <tr className="border-t border-gray-700">
                        <td className="text-white font-medium py-1.5">Total</td>
                        <td />
                        <td className="text-green-400 text-right font-medium py-1.5">
                          ${group.totalRevenue.toFixed(2)}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Donations Breakdown */}
      <div className="bg-gray-900 border border-gray-800 rounded-lg overflow-hidden">
        <button
          onClick={() => setDonationsExpanded(!donationsExpanded)}
          className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-800/50 transition-colors"
        >
          <div className="flex items-center gap-2">
            {donationsExpanded ? (
              <ChevronDown size={16} className="text-gray-400" />
            ) : (
              <ChevronRight size={16} className="text-gray-400" />
            )}
            <span className="text-white font-semibold text-sm">Donations</span>
            <span className="text-gray-500 text-xs">{paidDonations.length} donations</span>
          </div>
          <span className="text-green-400 font-medium text-sm">${totalDonationRevenue.toFixed(2)}</span>
        </button>

        {donationsExpanded && fundGroups.length > 1 && (
          <div className="border-t border-gray-800 px-4 py-3">
            <p className="text-gray-500 text-xs uppercase mb-2">By Fund</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {fundGroups.map((g) => (
                <div key={g.slug} className="bg-gray-800/60 rounded-lg px-3 py-2">
                  <p className="text-white text-sm font-medium">{g.name}</p>
                  <p className="text-green-400 text-sm font-semibold">${g.total.toFixed(2)}</p>
                  <p className="text-gray-500 text-[11px]">
                    {g.count} gifts{g.manual > 0 ? ` · $${g.manual.toFixed(2)} in person` : ""}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {donationsExpanded && paidDonations.length > 0 && (
          <div className="border-t border-gray-800 px-4 py-3">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-gray-500 text-xs uppercase">
                  <th className="text-left pb-2">Donor</th>
                  <th className="text-left pb-2">Fund</th>
                  <th className="text-left pb-2">Date</th>
                  <th className="text-right pb-2">Amount</th>
                </tr>
              </thead>
              <tbody>
                {paidDonations.map((don) => (
                  <tr key={don.id} className="border-t border-gray-800/50">
                    <td className="text-gray-300 py-1.5">
                      {don.name}
                      {don.source === "manual" && (
                        <span className="ml-2 text-[10px] uppercase text-blue-300">{don.paymentMethod || "manual"}</span>
                      )}
                    </td>
                    <td className="text-gray-500 py-1.5">{fundLabel(don.fund, funds)}</td>
                    <td className="text-gray-500 py-1.5">{new Date(don.createdAt).toLocaleDateString()}</td>
                    <td className="text-white text-right py-1.5">${don.amount.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {donationsExpanded && paidDonations.length === 0 && (
          <div className="border-t border-gray-800 px-4 py-3">
            <p className="text-gray-500 text-sm">No donations in this period.</p>
          </div>
        )}
      </div>
    </div>
  );
}
