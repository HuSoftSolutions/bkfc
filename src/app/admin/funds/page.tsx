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
import QRCode from "qrcode";
import { getDb } from "@/lib/firebase";
import { Fund, Donation } from "@/types";
import { donationFundSlug, formatMoney, slugifyFund, GENERAL_FUND_SLUG } from "@/lib/funds";
import { regenerateFundImage } from "@/lib/regenerateFundImage";
import {
  Plus,
  Pencil,
  Trash2,
  X,
  QrCode,
  Download,
  Target,
  ExternalLink,
  ImageIcon,
  Heart,
  Copy,
} from "lucide-react";

const inputClass =
  "w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:border-red-500 focus:outline-none";

const emptyFund: Partial<Fund> = {
  name: "",
  slug: "",
  description: "",
  goal: undefined,
  active: true,
  showProgress: true,
};

export default function AdminFundsPage() {
  const [funds, setFunds] = useState<Fund[]>([]);
  const [totals, setTotals] = useState<Record<string, { raised: number; count: number }>>({});
  const [editing, setEditing] = useState<Partial<Fund> | null>(null);
  const [slugTouched, setSlugTouched] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [qrFund, setQrFund] = useState<Fund | null>(null);
  const [qrTarget, setQrTarget] = useState<"donate" | "progress">("donate");
  const [qrDataUrl, setQrDataUrl] = useState("");
  const [imageFund, setImageFund] = useState<Fund | null>(null);
  const [imageLayout, setImageLayout] = useState<"portrait" | "wide">("portrait");
  const [copiedImage, setCopiedImage] = useState(false);

  async function fetchAll() {
    const db = getDb();
    const [fundSnap, donSnap] = await Promise.all([
      getDocs(query(collection(db, "funds"), orderBy("createdAt", "desc"))),
      getDocs(collection(db, "donations")),
    ]);
    setFunds(fundSnap.docs.map((d) => ({ id: d.id, ...d.data() })) as Fund[]);

    const agg: Record<string, { raised: number; count: number }> = {};
    for (const d of donSnap.docs) {
      const don = d.data() as Donation;
      if (don.paymentStatus !== "paid") continue;
      const slug = donationFundSlug(don.fund);
      agg[slug] ??= { raised: 0, count: 0 };
      agg[slug].raised += Number(don.amount) || 0;
      agg[slug].count += 1;
    }
    setTotals(agg);
  }

  useEffect(() => {
    const timer = setTimeout(() => {
      void fetchAll();
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const donateUrl = (f: Fund) => `${origin}/donate?fund=${f.slug}`;
  const progressUrl = (f: Fund) => `${origin}/funds/${f.slug}`;

  const openEditor = (fund?: Fund) => {
    setError("");
    setSlugTouched(!!fund);
    setEditing(fund ? { ...fund } : { ...emptyFund });
  };

  const handleSave = async () => {
    if (!editing) return;
    const name = (editing.name || "").trim();
    const slug = slugifyFund(editing.slug || name);
    if (!name) return setError("Name is required.");
    if (!slug) return setError("Slug is required.");
    if (slug === GENERAL_FUND_SLUG) return setError(`"${GENERAL_FUND_SLUG}" is reserved for the general fund.`);
    if (funds.some((f) => f.slug === slug && f.id !== editing.id)) {
      return setError("Another fund already uses that slug.");
    }
    const goal = editing.goal && editing.goal > 0 ? Math.round(editing.goal * 100) / 100 : null;

    setSaving(true);
    setError("");
    try {
      const data = {
        name,
        slug,
        description: (editing.description || "").trim(),
        goal,
        active: editing.active !== false,
        showProgress: editing.showProgress !== false,
      };
      if (editing.id) {
        await updateDoc(doc(getDb(), "funds", editing.id), data);
      } else {
        await addDoc(collection(getDb(), "funds"), { ...data, createdAt: new Date().toISOString() });
      }
      if (data.showProgress) await regenerateFundImage(slug);
      setEditing(null);
      await fetchAll();
    } catch (err) {
      console.error(err);
      setError("Failed to save fund.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (fund: Fund) => {
    const t = totals[fund.slug];
    if (t && t.count > 0) {
      alert(
        `"${fund.name}" has ${t.count} donation${t.count === 1 ? "" : "s"} recorded. Mark it inactive instead of deleting so the history stays intact.`
      );
      return;
    }
    if (!confirm(`Delete "${fund.name}"?`)) return;
    await deleteDoc(doc(getDb(), "funds", fund.id));
    await fetchAll();
  };

  const showQr = async (fund: Fund, target: "donate" | "progress") => {
    const url = target === "donate" ? donateUrl(fund) : progressUrl(fund);
    const dataUrl = await QRCode.toDataURL(url, { width: 512, margin: 2 });
    setQrDataUrl(dataUrl);
    setQrTarget(target);
    setQrFund(fund);
  };

  const downloadDataUrl = (dataUrl: string, filename: string) => {
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = filename;
    a.click();
  };

  const imageUrl = (f: Fund, layout: "portrait" | "wide", extra = "") =>
    `${origin}/api/funds/${f.slug}/image?${layout === "wide" ? "layout=wide&" : ""}v=${Math.round(totals[f.slug]?.raised || 0)}${extra}`;

  const copyImageLink = async (f: Fund) => {
    try {
      await navigator.clipboard.writeText(imageUrl(f, imageLayout));
      setCopiedImage(true);
      setTimeout(() => setCopiedImage(false), 2000);
    } catch {
      // ignore
    }
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <h1 className="text-2xl font-bold text-white flex items-center gap-3">
          <Target size={24} className="text-red-400" />
          Fundraising Campaigns
        </h1>
        <div className="flex items-center gap-2">
          <Link
            href="/admin/donations"
            className="flex items-center gap-2 bg-gray-700 hover:bg-gray-600 text-white text-sm font-medium px-3 sm:px-4 py-2 rounded-lg transition-colors"
          >
            <Heart size={16} /> <span className="hidden sm:inline">Donations</span>
          </Link>
          <button
            onClick={() => openEditor()}
            className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium px-3 sm:px-4 py-2 rounded-lg transition-colors"
          >
            <Plus size={16} /> New Fund
          </button>
        </div>
      </div>

      <p className="text-gray-400 text-sm mb-6 max-w-2xl">
        Funds let donors earmark gifts for a specific campaign. Each fund gets its own donate link,
        QR code, and a public progress page with a downloadable image you can post on social media.
        Gifts without a fund count toward the General Fund.
      </p>

      {/* General fund summary */}
      <div className="bg-gray-900 border border-gray-800 rounded-lg p-4 mb-4 flex items-center justify-between">
        <div>
          <p className="text-white font-medium">General Fund</p>
          <p className="text-gray-500 text-xs">Default for donations without a campaign</p>
        </div>
        <div className="text-right">
          <p className="text-green-400 font-bold">{formatMoney(totals[GENERAL_FUND_SLUG]?.raised || 0, 2)}</p>
          <p className="text-gray-500 text-xs">{totals[GENERAL_FUND_SLUG]?.count || 0} gifts</p>
        </div>
      </div>

      {/* Fund list */}
      <div className="space-y-3">
        {funds.map((fund) => {
          const t = totals[fund.slug] || { raised: 0, count: 0 };
          const pct = fund.goal ? Math.min(100, Math.round((t.raised / fund.goal) * 100)) : null;
          return (
            <div key={fund.id} className="bg-gray-900 border border-gray-800 rounded-lg p-4">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-white font-semibold">{fund.name}</h2>
                    {!fund.active && (
                      <span className="text-[10px] uppercase tracking-wider bg-gray-800 text-gray-400 px-2 py-0.5 rounded">
                        Inactive
                      </span>
                    )}
                    {fund.showProgress && (
                      <Link
                        href={`/funds/${fund.slug}`}
                        target="_blank"
                        className="text-[10px] uppercase tracking-wider bg-blue-900/40 text-blue-300 px-2 py-0.5 rounded flex items-center gap-1 hover:text-blue-200"
                      >
                        Public page <ExternalLink size={10} />
                      </Link>
                    )}
                  </div>
                  <p className="text-gray-500 text-xs font-mono mt-0.5">/donate?fund={fund.slug}</p>
                  {fund.description && (
                    <p className="text-gray-400 text-sm mt-1 line-clamp-2">{fund.description}</p>
                  )}
                  <div className="mt-3">
                    <div className="flex items-baseline gap-2">
                      <span className="text-green-400 font-bold">{formatMoney(t.raised, 2)}</span>
                      {fund.goal && (
                        <span className="text-gray-500 text-xs">
                          of {formatMoney(fund.goal)} · {pct}%
                        </span>
                      )}
                      <span className="text-gray-600 text-xs">· {t.count} gifts</span>
                    </div>
                    {fund.goal && (
                      <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden mt-1.5 max-w-md">
                        <div className="h-full bg-red-500 rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button onClick={() => showQr(fund, "donate")} className="text-gray-400 hover:text-white p-1.5" title="QR code">
                    <QrCode size={16} />
                  </button>
                  <button
                    onClick={() => setImageFund(fund)}
                    className="text-gray-400 hover:text-white p-1.5 disabled:opacity-40"
                    title="Progress image"
                    disabled={!fund.goal || !fund.showProgress}
                  >
                    <ImageIcon size={16} />
                  </button>
                  <button onClick={() => openEditor(fund)} className="text-gray-400 hover:text-white p-1.5" title="Edit">
                    <Pencil size={16} />
                  </button>
                  <button onClick={() => handleDelete(fund)} className="text-gray-400 hover:text-red-400 p-1.5" title="Delete">
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
        {funds.length === 0 && (
          <p className="text-gray-500 text-sm text-center py-8 bg-gray-900 border border-gray-800 rounded-lg">
            No campaigns yet. Create one to start tracking a goal.
          </p>
        )}
      </div>

      {/* Editor modal */}
      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-4 sm:p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-white">{editing.id ? "Edit Fund" : "New Fund"}</h2>
              <button onClick={() => setEditing(null)} className="text-gray-400 hover:text-white">
                <X size={20} />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-gray-400 mb-1">Name *</label>
                <input
                  value={editing.name || ""}
                  onChange={(e) =>
                    setEditing({
                      ...editing,
                      name: e.target.value,
                      slug: slugTouched ? editing.slug : slugifyFund(e.target.value),
                    })
                  }
                  placeholder="e.g. Fire/Rescue Boat Fund"
                  className={inputClass}
                />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Slug (used in links) *</label>
                <input
                  value={editing.slug || ""}
                  onChange={(e) => {
                    setSlugTouched(true);
                    setEditing({ ...editing, slug: slugifyFund(e.target.value) });
                  }}
                  placeholder="fire-boat"
                  className={`${inputClass} font-mono`}
                />
                {editing.id && (
                  <p className="text-yellow-500/80 text-[11px] mt-1">
                    Changing the slug breaks printed QR codes and unlinks existing donations from this fund.
                  </p>
                )}
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Description</label>
                <textarea
                  rows={8}
                  value={editing.description || ""}
                  onChange={(e) => setEditing({ ...editing, description: e.target.value })}
                  placeholder="Tell the story of this campaign. Separate paragraphs with a blank line."
                  className={`${inputClass} resize-y`}
                />
                <p className="text-gray-500 text-[11px] mt-1">
                  Shown in full on the public fund page. The first paragraph is used as the short summary on the donate page and in link previews.
                </p>
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Goal ($)</label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={editing.goal ?? ""}
                  onChange={(e) =>
                    setEditing({ ...editing, goal: e.target.value ? parseFloat(e.target.value) : undefined })
                  }
                  placeholder="25000"
                  className={inputClass}
                />
                <p className="text-gray-500 text-[11px] mt-1">Required for the progress thermometer and image.</p>
              </div>
              <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={editing.active !== false}
                  onChange={(e) => setEditing({ ...editing, active: e.target.checked })}
                  className="accent-red-600"
                />
                Accepting donations
              </label>
              <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={editing.showProgress !== false}
                  onChange={(e) => setEditing({ ...editing, showProgress: e.target.checked })}
                  className="accent-red-600"
                />
                Show public progress page
              </label>

              {error && <p className="text-red-400 text-sm">{error}</p>}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={() => setEditing(null)}
                  className="px-4 py-2 text-sm text-gray-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-sm font-medium px-4 py-2 rounded-lg"
                >
                  {saving ? "Saving..." : "Save Fund"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* QR modal */}
      {qrFund && qrDataUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={() => setQrFund(null)}>
          <div className="bg-gray-900 border border-gray-700 rounded-xl w-full max-w-sm p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-lg font-bold text-white">QR Code</h2>
              <button onClick={() => setQrFund(null)} className="text-gray-400 hover:text-white">
                <X size={20} />
              </button>
            </div>
            <p className="text-gray-400 text-sm mb-3 truncate">{qrFund.name}</p>
            <div className="flex gap-2 mb-4">
              {(["donate", "progress"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => showQr(qrFund, t)}
                  className={`flex-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    qrTarget === t ? "bg-red-600/20 text-red-400" : "bg-gray-800 text-gray-400 hover:text-white"
                  }`}
                >
                  {t === "donate" ? "Donate form" : "Progress page"}
                </button>
              ))}
            </div>
            <div className="bg-white rounded-lg p-4 flex justify-center mb-3">
              <img src={qrDataUrl} alt="QR Code" className="w-48 h-48" />
            </div>
            <p className="text-gray-500 text-[11px] font-mono break-all mb-4">
              {qrTarget === "donate" ? donateUrl(qrFund) : progressUrl(qrFund)}
            </p>
            <button
              onClick={() => downloadDataUrl(qrDataUrl, `qr-${qrFund.slug}-${qrTarget}.png`)}
              className="w-full flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium px-4 py-2 rounded-lg"
            >
              <Download size={16} /> Download PNG
            </button>
          </div>
        </div>
      )}

      {/* Progress image modal */}
      {imageFund && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={() => setImageFund(null)}>
          <div
            className="bg-gray-900 border border-gray-700 rounded-xl w-full max-w-md max-h-[95vh] overflow-y-auto p-4 sm:p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-lg font-bold text-white">Progress Image</h2>
              <button onClick={() => setImageFund(null)} className="text-gray-400 hover:text-white">
                <X size={20} />
              </button>
            </div>
            <p className="text-gray-400 text-xs mb-3">
              Generated live from today&apos;s totals. Download it to post, or copy the link — the link
              always shows the current amount wherever it&apos;s embedded.
            </p>
            <div className="flex gap-2 mb-3">
              {(["portrait", "wide"] as const).map((l) => (
                <button
                  key={l}
                  onClick={() => setImageLayout(l)}
                  className={`flex-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    imageLayout === l ? "bg-red-600/20 text-red-400" : "bg-gray-800 text-gray-400 hover:text-white"
                  }`}
                >
                  {l === "portrait" ? "Social post (1080×1350)" : "Link preview (1200×630)"}
                </button>
              ))}
            </div>
            <div className="rounded-lg overflow-hidden border border-gray-700 mb-4 bg-gray-800 min-h-[200px] flex items-center justify-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                key={imageLayout}
                src={imageUrl(imageFund, imageLayout)}
                alt={`${imageFund.name} progress`}
                className="w-full h-auto"
              />
            </div>
            <div className="flex gap-2">
              <a
                href={imageUrl(imageFund, imageLayout, "&download=1")}
                className="flex-1 flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium px-4 py-2 rounded-lg"
              >
                <Download size={16} /> Download PNG
              </a>
              <button
                onClick={() => copyImageLink(imageFund)}
                className="flex-1 flex items-center justify-center gap-2 bg-gray-700 hover:bg-gray-600 text-white text-sm font-medium px-4 py-2 rounded-lg"
              >
                <Copy size={16} /> {copiedImage ? "Copied!" : "Copy link"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
