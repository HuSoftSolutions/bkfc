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
import { Product, ProductVariant, ProductField, ProductFieldType } from "@/types";
import { Plus, Pencil, Trash2, X, Pin, PinOff, ImageIcon, QrCode, Download, ShoppingBag } from "lucide-react";
import QRCode from "qrcode";
import MediaPicker from "@/components/MediaPicker";
import Link from "next/link";
import AdminPagination from "@/components/AdminPagination";

const PER_PAGE = 15;

const emptyProduct: Partial<Product> = {
  title: "",
  description: "",
  image: "",
  published: true,
  available: true,
  passCardFee: false,
  collectAddress: false,
  variants: [],
  fields: [],
};

const FIELD_TYPES: { value: ProductFieldType; label: string }[] = [
  { value: "text", label: "Short text" },
  { value: "textarea", label: "Long text" },
  { value: "number", label: "Number" },
  { value: "select", label: "Dropdown" },
  { value: "checkbox", label: "Checkbox" },
];

export default function AdminProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [editing, setEditing] = useState<Partial<Product> | null>(null);
  const [page, setPage] = useState(1);
  const [qrProduct, setQrProduct] = useState<Product | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState("");

  const totalPages = Math.ceil(products.length / PER_PAGE);
  const paginated = products.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  async function fetchProducts() {
    const q = query(collection(getDb(), "products"), orderBy("title"));
    const snap = await getDocs(q);
    setProducts(snap.docs.map((d) => ({ id: d.id, ...d.data() })) as Product[]);
    setPage(1);
  }

  useEffect(() => {
    const timer = setTimeout(() => {
      void fetchProducts();
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  // --- Variant helpers ---
  const addVariant = () => {
    const newVar: ProductVariant = { id: crypto.randomUUID(), name: "", description: "", price: 0 };
    setEditing((prev) => (prev ? { ...prev, variants: [...(prev.variants || []), newVar] } : prev));
  };
  const updateVariant = (id: string, field: keyof ProductVariant, value: string | number) => {
    setEditing((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        variants: (prev.variants || []).map((v) => (v.id === id ? { ...v, [field]: value } : v)),
      };
    });
  };
  const removeVariant = (id: string) => {
    setEditing((prev) =>
      prev ? { ...prev, variants: (prev.variants || []).filter((v) => v.id !== id) } : prev
    );
  };

  // --- Custom field helpers ---
  const addField = () => {
    const newField: ProductField = { id: crypto.randomUUID(), label: "", type: "text", required: false };
    setEditing((prev) => (prev ? { ...prev, fields: [...(prev.fields || []), newField] } : prev));
  };
  const updateField = (id: string, patch: Partial<ProductField>) => {
    setEditing((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        fields: (prev.fields || []).map((f) => (f.id === id ? { ...f, ...patch } : f)),
      };
    });
  };
  const removeField = (id: string) => {
    setEditing((prev) =>
      prev ? { ...prev, fields: (prev.fields || []).filter((f) => f.id !== id) } : prev
    );
  };

  const handleSave = async () => {
    if (!editing) return;

    const data = {
      title: editing.title || "",
      description: editing.description || "",
      image: editing.image || "",
      published: editing.published ?? true,
      available: editing.available ?? true,
      passCardFee: editing.passCardFee ?? false,
      collectAddress: editing.collectAddress ?? false,
      variants: (editing.variants || [])
        .filter((v) => v.name)
        .map((v) => ({
          id: v.id,
          name: v.name,
          description: v.description || "",
          price: Number(v.price) || 0,
        })),
      fields: (editing.fields || [])
        .filter((f) => f.label)
        .map((f) => ({
          id: f.id,
          label: f.label,
          type: f.type,
          required: f.required ?? false,
          placeholder: f.placeholder || "",
          options:
            f.type === "select"
              ? (f.options || []).map((o) => o.trim()).filter(Boolean)
              : [],
        })),
    };

    if (editing.id) {
      await updateDoc(doc(getDb(), "products", editing.id), data);
    } else {
      await addDoc(collection(getDb(), "products"), data);
    }

    setEditing(null);
    fetchProducts();
  };

  const togglePin = async (product: Product) => {
    await updateDoc(doc(getDb(), "products", product.id), { pinned: !product.pinned });
    fetchProducts();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this product?")) return;
    await deleteDoc(doc(getDb(), "products", id));
    fetchProducts();
  };

  const showQr = async (product: Product) => {
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const dataUrl = await QRCode.toDataURL(`${origin}/store/${product.id}`, { width: 512, margin: 2 });
    setQrDataUrl(dataUrl);
    setQrProduct(product);
  };

  const downloadQr = () => {
    if (!qrDataUrl || !qrProduct) return;
    const a = document.createElement("a");
    a.href = qrDataUrl;
    a.download = `qr-${qrProduct.title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.png`;
    a.click();
  };

  const inputClass =
    "w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:border-red-500 focus:outline-none";

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <h1 className="text-2xl font-bold text-white">Manage Store</h1>
        <div className="flex items-center gap-2">
          <Link
            href="/admin/orders"
            className="flex items-center gap-2 bg-gray-700 hover:bg-gray-600 text-white text-sm font-medium px-3 sm:px-4 py-2 rounded-lg transition-colors"
          >
            <ShoppingBag size={16} /> <span className="hidden sm:inline">Orders</span>
          </Link>
          <button
            onClick={() => setEditing({ ...emptyProduct })}
            className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium px-3 sm:px-4 py-2 rounded-lg transition-colors"
          >
            <Plus size={16} /> New Product
          </button>
        </div>
      </div>

      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-xl w-full max-w-lg sm:max-w-2xl max-h-[90vh] overflow-y-auto p-4 sm:p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-white">
                {editing.id ? "Edit Product" : "New Product"}
              </h2>
              <button onClick={() => setEditing(null)} className="text-gray-400 hover:text-white">
                <X size={20} />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-gray-400 mb-1">Title</label>
                <input
                  value={editing.title || ""}
                  onChange={(e) => setEditing({ ...editing, title: e.target.value })}
                  className={inputClass}
                />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Description</label>
                <textarea
                  rows={4}
                  value={editing.description || ""}
                  onChange={(e) => setEditing({ ...editing, description: e.target.value })}
                  className={`${inputClass} resize-none`}
                />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Image</label>
                <MediaPicker
                  value={editing.image || ""}
                  onSelect={(url) => setEditing({ ...editing, image: url })}
                  folder="uploads"
                />
              </div>

              <div className="flex flex-wrap gap-4 pt-2">
                <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editing.published ?? true}
                    onChange={(e) => setEditing({ ...editing, published: e.target.checked })}
                    className="rounded"
                  />
                  Published (listed in store)
                </label>
                <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editing.available ?? true}
                    onChange={(e) => setEditing({ ...editing, available: e.target.checked })}
                    className="rounded"
                  />
                  Available for purchase
                </label>
                <label
                  className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer"
                  title="Adds a surcharge covering the card processing fee to the customer's total."
                >
                  <input
                    type="checkbox"
                    checked={editing.passCardFee ?? false}
                    onChange={(e) => setEditing({ ...editing, passCardFee: e.target.checked })}
                    className="rounded"
                  />
                  Pass card fee to customer
                </label>
                <label
                  className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer"
                  title="Ask the customer for a mailing address (Address, City, State, Zip) at checkout. Required when enabled."
                >
                  <input
                    type="checkbox"
                    checked={editing.collectAddress ?? false}
                    onChange={(e) => setEditing({ ...editing, collectAddress: e.target.checked })}
                    className="rounded"
                  />
                  Collect mailing address
                </label>
              </div>

              {/* Variants */}
              <div className="border-t border-gray-700 pt-4 mt-2">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-white font-semibold text-sm">Pricing Options</h3>
                  <button
                    onClick={addVariant}
                    className="flex items-center gap-1 text-red-400 hover:text-red-300 text-xs font-medium"
                  >
                    <Plus size={14} /> Add Option
                  </button>
                </div>
                <div className="space-y-3">
                  {(editing.variants || []).map((v, idx) => (
                    <div key={v.id} className="bg-gray-800 border border-gray-700 rounded-lg p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-gray-400 text-xs">Option #{idx + 1}</span>
                        <button onClick={() => removeVariant(v.id)} className="text-gray-500 hover:text-red-400">
                          <Trash2 size={14} />
                        </button>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[10px] text-gray-500 mb-0.5">Name *</label>
                          <input
                            value={v.name}
                            onChange={(e) => updateVariant(v.id, "name", e.target.value)}
                            placeholder="e.g. Reflective Sign"
                            className={inputClass}
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] text-gray-500 mb-0.5">Price ($) *</label>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={v.price || ""}
                            onChange={(e) => updateVariant(v.id, "price", parseFloat(e.target.value) || 0)}
                            placeholder="20.00"
                            className={inputClass}
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-[10px] text-gray-500 mb-0.5">Description</label>
                        <input
                          value={v.description || ""}
                          onChange={(e) => updateVariant(v.id, "description", e.target.value)}
                          placeholder="Optional details"
                          className={inputClass}
                        />
                      </div>
                    </div>
                  ))}
                  {(editing.variants || []).length === 0 && (
                    <p className="text-gray-500 text-xs text-center py-4">
                      No pricing options yet. Add at least one to sell this product.
                    </p>
                  )}
                </div>
              </div>

              {/* Custom fields */}
              <div className="border-t border-gray-700 pt-4 mt-2">
                <div className="flex items-center justify-between mb-1">
                  <h3 className="text-white font-semibold text-sm">Custom Form Fields</h3>
                  <button
                    onClick={addField}
                    className="flex items-center gap-1 text-red-400 hover:text-red-300 text-xs font-medium"
                  >
                    <Plus size={14} /> Add Field
                  </button>
                </div>
                <p className="text-gray-500 text-[11px] mb-3">
                  Extra info collected at checkout — e.g. address digits, mailing address, mounting orientation.
                </p>
                <div className="space-y-3">
                  {(editing.fields || []).map((f, idx) => (
                    <div key={f.id} className="bg-gray-800 border border-gray-700 rounded-lg p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-gray-400 text-xs">Field #{idx + 1}</span>
                        <button onClick={() => removeField(f.id)} className="text-gray-500 hover:text-red-400">
                          <Trash2 size={14} />
                        </button>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[10px] text-gray-500 mb-0.5">Label *</label>
                          <input
                            value={f.label}
                            onChange={(e) => updateField(f.id, { label: e.target.value })}
                            placeholder="e.g. Address Number"
                            className={inputClass}
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] text-gray-500 mb-0.5">Type</label>
                          <select
                            value={f.type}
                            onChange={(e) => updateField(f.id, { type: e.target.value as ProductFieldType })}
                            className={inputClass}
                          >
                            {FIELD_TYPES.map((t) => (
                              <option key={t.value} value={t.value}>
                                {t.label}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                      {f.type === "select" && (
                        <div>
                          <label className="block text-[10px] text-gray-500 mb-0.5">
                            Choices (comma-separated)
                          </label>
                          <input
                            value={(f.options || []).join(", ")}
                            onChange={(e) =>
                              updateField(f.id, { options: e.target.value.split(",").map((o) => o.trim()) })
                            }
                            placeholder="e.g. Horizontal, Vertical"
                            className={inputClass}
                          />
                        </div>
                      )}
                      {f.type !== "checkbox" && f.type !== "select" && (
                        <div>
                          <label className="block text-[10px] text-gray-500 mb-0.5">Placeholder</label>
                          <input
                            value={f.placeholder || ""}
                            onChange={(e) => updateField(f.id, { placeholder: e.target.value })}
                            placeholder="Optional hint text"
                            className={inputClass}
                          />
                        </div>
                      )}
                      <label className="flex items-center gap-2 text-xs text-gray-300 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={f.required ?? false}
                          onChange={(e) => updateField(f.id, { required: e.target.checked })}
                          className="rounded"
                        />
                        Required
                      </label>
                    </div>
                  ))}
                  {(editing.fields || []).length === 0 && (
                    <p className="text-gray-500 text-xs text-center py-4">
                      No custom fields. Add fields to collect details like a mailing address.
                    </p>
                  )}
                </div>
              </div>

              <button
                onClick={handleSave}
                className="bg-red-600 hover:bg-red-700 text-white font-medium px-6 py-2 rounded-lg transition-colors w-full mt-4"
              >
                {editing.id ? "Update" : "Create"}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {paginated.map((product) => (
          <div
            key={product.id}
            className="flex items-center justify-between gap-2 bg-gray-900 border border-gray-800 rounded-lg px-3 sm:px-4 py-3"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-lg overflow-hidden bg-gray-800 shrink-0 flex items-center justify-center">
                {product.image ? (
                  <img src={product.image} alt="" className="w-full h-full object-cover" />
                ) : (
                  <ImageIcon size={16} className="text-gray-600" />
                )}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-white font-medium truncate">{product.title}</p>
                  {!product.published && (
                    <span className="bg-gray-600/30 text-gray-300 text-[10px] font-medium px-2 py-0.5 rounded-full">
                      Hidden
                    </span>
                  )}
                  {product.available === false && (
                    <span className="bg-yellow-600/20 text-yellow-400 text-[10px] font-medium px-2 py-0.5 rounded-full">
                      Unavailable
                    </span>
                  )}
                </div>
                <p className="text-gray-500 text-xs">
                  {(product.variants || []).length} option{(product.variants || []).length === 1 ? "" : "s"}
                  {(product.fields || []).length > 0 && ` • ${(product.fields || []).length} fields`}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <button onClick={() => showQr(product)} className="text-gray-400 hover:text-white p-1" title="QR Code">
                <QrCode size={16} />
              </button>
              <button
                onClick={() => togglePin(product)}
                className={`p-1 ${product.pinned ? "text-yellow-400" : "text-gray-600 hover:text-yellow-400"}`}
                title={product.pinned ? "Unpin" : "Pin to top"}
              >
                {product.pinned ? <Pin size={16} /> : <PinOff size={16} />}
              </button>
              <button onClick={() => setEditing(product)} className="text-gray-400 hover:text-white p-1">
                <Pencil size={16} />
              </button>
              <button onClick={() => handleDelete(product.id)} className="text-gray-400 hover:text-red-400 p-1">
                <Trash2 size={16} />
              </button>
            </div>
          </div>
        ))}
        {products.length === 0 && (
          <p className="text-gray-500 text-sm">No products yet. Create one to get started.</p>
        )}
      </div>
      <AdminPagination page={page} totalPages={totalPages} onPageChange={setPage} />

      {qrProduct && qrDataUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={() => setQrProduct(null)}>
          <div className="bg-gray-900 border border-gray-700 rounded-xl w-full max-w-sm p-6 text-center" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-white">QR Code</h2>
              <button onClick={() => setQrProduct(null)} className="text-gray-400 hover:text-white">
                <X size={20} />
              </button>
            </div>
            <p className="text-gray-400 text-sm mb-4 truncate">{qrProduct.title}</p>
            <div className="bg-white rounded-xl p-4 inline-block mb-4">
              <img src={qrDataUrl} alt="QR Code" className="w-48 h-48" />
            </div>
            <button
              onClick={downloadQr}
              className="flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white font-medium px-6 py-2 rounded-lg transition-colors w-full"
            >
              <Download size={16} /> Download PNG
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
