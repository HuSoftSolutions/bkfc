"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { doc, getDoc } from "firebase/firestore";
import { getDb } from "@/lib/firebase";
import { Product, ProductField } from "@/types";
import { formatPhoneNumber } from "@/lib/formatPhone";
import { computeCardFee, normalizeFeeConfig, DEFAULT_STRIPE_FEE, type StripeFeeConfig } from "@/lib/stripeFee";
import Link from "next/link";
import { ArrowLeft, Minus, Plus, ShoppingCart, CreditCard } from "lucide-react";

const inputClass =
  "w-full bg-white border border-gray-300 rounded-lg px-4 py-2.5 text-gray-900 placeholder-gray-400 focus:border-red-500 focus:outline-none transition-colors";

export default function ProductOrderPage() {
  const params = useParams();
  const productId = params.id as string;

  const [product, setProduct] = useState<Product | null>(null);
  const [feeConfig, setFeeConfig] = useState<StripeFeeConfig>(DEFAULT_STRIPE_FEE);
  const [loading, setLoading] = useState(true);
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({});
  const [form, setForm] = useState({ firstName: "", lastName: "", email: "", phone: "" });
  const [address, setAddress] = useState({ line1: "", city: "", state: "", zip: "" });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function fetchProduct() {
      try {
        const docSnap = await getDoc(doc(getDb(), "products", productId));
        if (docSnap.exists()) {
          const data = { id: docSnap.id, ...docSnap.data() } as Product;
          setProduct(data);
          const q: Record<string, number> = {};
          (data.variants || []).forEach((v) => {
            q[v.id] = 0;
          });
          setQuantities(q);
          if (data.passCardFee) {
            const feeSnap = await getDoc(doc(getDb(), "settings", "fees"));
            if (feeSnap.exists()) setFeeConfig(normalizeFeeConfig(feeSnap.data()));
          }
        }
      } catch (err) {
        console.error("Error:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchProduct();
  }, [productId]);

  const updateQty = (variantId: string, delta: number) => {
    setQuantities((prev) => ({
      ...prev,
      [variantId]: Math.max(0, (prev[variantId] || 0) + delta),
    }));
  };

  const setField = (fieldId: string, value: string) => {
    setFieldValues((prev) => ({ ...prev, [fieldId]: value }));
  };

  const selectedItems = (product?.variants || [])
    .filter((v) => (quantities[v.id] || 0) > 0)
    .map((v) => ({
      optionId: v.id,
      name: v.name,
      quantity: quantities[v.id],
      price: v.price,
    }));

  const total = selectedItems.reduce((sum, item) => sum + item.quantity * item.price, 0);

  // Display-only surcharge preview; the server computes the authoritative fee.
  const cardFee = product?.passCardFee ? computeCardFee(total, feeConfig) : 0;
  const grandTotal = Math.round((total + cardFee) * 100) / 100;

  const handleSubmit = useCallback(async () => {
    if (!form.firstName || !form.lastName || !form.email || !form.phone) {
      setError("Please complete your contact information.");
      return;
    }
    if (selectedItems.length === 0) {
      setError("Please select at least one item.");
      return;
    }
    if (
      product?.collectAddress &&
      (!address.line1.trim() || !address.city.trim() || !address.state.trim() || !address.zip.trim())
    ) {
      setError("Please complete your mailing address.");
      return;
    }
    // Validate required custom fields client-side (server re-validates).
    for (const field of product?.fields || []) {
      if (field.required && !String(fieldValues[field.id] || "").trim()) {
        setError(`Please complete the required field: ${field.label}`);
        return;
      }
    }

    setSubmitting(true);
    setError("");

    const fields = (product?.fields || []).map((field) => ({
      fieldId: field.id,
      label: field.label,
      value: fieldValues[field.id] || "",
    }));

    try {
      const res = await fetch("/api/store/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId,
          firstName: form.firstName,
          lastName: form.lastName,
          email: form.email,
          phone: form.phone,
          address: product?.collectAddress ? address : undefined,
          items: selectedItems,
          fields,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Something went wrong.");
        return;
      }

      if (data.url) {
        window.location.href = data.url;
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }, [form, address, selectedItems, fieldValues, product, productId]);

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-20">
        <div className="animate-pulse space-y-6">
          <div className="h-6 bg-gray-200 rounded w-32" />
          <div className="h-10 bg-gray-200 rounded w-3/4" />
          <div className="h-64 bg-gray-200 rounded-2xl" />
        </div>
      </div>
    );
  }

  if (!product || product.available === false || (product.variants || []).length === 0) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-20 text-center">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Not Available for Purchase</h1>
        <Link href="/store" className="text-red-600 hover:text-red-700">
          &larr; Back to Store
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <Link
        href={`/store/${productId}`}
        className="inline-flex items-center gap-2 text-gray-500 hover:text-gray-900 text-sm mb-8 transition-colors group"
      >
        <ArrowLeft size={16} className="group-hover:-translate-x-0.5 transition-transform" />
        Back to Product
      </Link>

      <h1 className="text-3xl font-extrabold text-gray-900 mb-8">{product.title}</h1>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
        {/* Options + custom fields */}
        <div className="lg:col-span-3 space-y-8">
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-4">Select Options</h2>
            <div className="space-y-3">
              {(product.variants || []).map((v) => (
                <div
                  key={v.id}
                  className="flex items-center justify-between bg-white border border-gray-200 rounded-xl p-4"
                >
                  <div className="flex-1">
                    <p className="text-gray-900 font-medium">{v.name}</p>
                    {v.description && <p className="text-gray-500 text-sm mt-0.5">{v.description}</p>}
                    <p className="text-red-600 font-semibold text-sm mt-1">${v.price.toFixed(2)}</p>
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    <button
                      onClick={() => updateQty(v.id, -1)}
                      disabled={(quantities[v.id] || 0) === 0}
                      className="w-8 h-8 rounded-lg border border-gray-300 flex items-center justify-center text-gray-500 hover:bg-gray-50 disabled:opacity-30 transition-colors"
                    >
                      <Minus size={14} />
                    </button>
                    <span className="w-8 text-center font-medium text-gray-900">
                      {quantities[v.id] || 0}
                    </span>
                    <button
                      onClick={() => updateQty(v.id, 1)}
                      className="w-8 h-8 rounded-lg border border-gray-300 flex items-center justify-center text-gray-500 hover:bg-gray-50 transition-colors"
                    >
                      <Plus size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {(product.fields || []).length > 0 && (
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-4">Order Details</h2>
              <div className="space-y-4">
                {(product.fields || []).map((field) => (
                  <CustomField
                    key={field.id}
                    field={field}
                    value={fieldValues[field.id] || ""}
                    onChange={(val) => setField(field.id, val)}
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Order summary + contact + checkout */}
        <div className="lg:col-span-2">
          <div className="sticky top-32 space-y-6">
            <div className="bg-gray-50 border border-gray-200 rounded-2xl p-5">
              <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                <ShoppingCart size={18} /> Order Summary
              </h3>
              {selectedItems.length === 0 ? (
                <p className="text-gray-400 text-sm">No items selected.</p>
              ) : (
                <div className="space-y-2 mb-4">
                  {selectedItems.map((item) => (
                    <div key={item.optionId} className="flex justify-between text-sm">
                      <span className="text-gray-600">
                        {item.name} x{item.quantity}
                      </span>
                      <span className="text-gray-900 font-medium">
                        ${(item.quantity * item.price).toFixed(2)}
                      </span>
                    </div>
                  ))}
                  {cardFee > 0 && (
                    <div className="flex justify-between text-sm pt-1">
                      <span className="text-gray-600">Card processing fee</span>
                      <span className="text-gray-900 font-medium">${cardFee.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="border-t border-gray-200 pt-2 flex justify-between font-bold text-gray-900">
                    <span>Total</span>
                    <span>${grandTotal.toFixed(2)}</span>
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-3">
              <h3 className="font-bold text-gray-900">Your Information</h3>
              <div>
                <label className="block text-sm text-gray-500 mb-1">First Name *</label>
                <input
                  value={form.firstName}
                  onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                  className={inputClass}
                />
              </div>
              <div>
                <label className="block text-sm text-gray-500 mb-1">Last Name *</label>
                <input
                  value={form.lastName}
                  onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                  className={inputClass}
                />
              </div>
              <div>
                <label className="block text-sm text-gray-500 mb-1">Email *</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className={inputClass}
                />
              </div>
              <div>
                <label className="block text-sm text-gray-500 mb-1">Phone *</label>
                <input
                  type="tel"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: formatPhoneNumber(e.target.value) })}
                  className={inputClass}
                />
              </div>

              {product.collectAddress && (
                <>
                  <div>
                    <label className="block text-sm text-gray-500 mb-1">Mailing Address *</label>
                    <input
                      value={address.line1}
                      onChange={(e) => setAddress({ ...address, line1: e.target.value })}
                      placeholder="Street address"
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-500 mb-1">City *</label>
                    <input
                      value={address.city}
                      onChange={(e) => setAddress({ ...address, city: e.target.value })}
                      className={inputClass}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm text-gray-500 mb-1">State *</label>
                      <input
                        value={address.state}
                        onChange={(e) =>
                          setAddress({ ...address, state: e.target.value.toUpperCase().slice(0, 2) })
                        }
                        placeholder="NY"
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-500 mb-1">Zip *</label>
                      <input
                        value={address.zip}
                        onChange={(e) => setAddress({ ...address, zip: e.target.value })}
                        placeholder="12025"
                        className={inputClass}
                      />
                    </div>
                  </div>
                </>
              )}
            </div>

            {error && <p className="text-red-600 text-sm">{error}</p>}

            <button
              onClick={handleSubmit}
              disabled={submitting || selectedItems.length === 0}
              className="w-full flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-semibold py-3 rounded-xl transition-colors"
            >
              <CreditCard size={18} />
              {submitting ? "Processing..." : `Pay $${grandTotal.toFixed(2)}`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function CustomField({
  field,
  value,
  onChange,
}: {
  field: ProductField;
  value: string;
  onChange: (value: string) => void;
}) {
  const label = (
    <label className="block text-sm text-gray-500 mb-1">
      {field.label}
      {field.required && " *"}
    </label>
  );

  if (field.type === "textarea") {
    return (
      <div>
        {label}
        <textarea
          rows={3}
          value={value}
          placeholder={field.placeholder}
          onChange={(e) => onChange(e.target.value)}
          className={`${inputClass} resize-none`}
        />
      </div>
    );
  }

  if (field.type === "select") {
    return (
      <div>
        {label}
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={inputClass}
        >
          <option value="">Select…</option>
          {(field.options || []).map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      </div>
    );
  }

  if (field.type === "checkbox") {
    return (
      <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
        <input
          type="checkbox"
          checked={value === "Yes"}
          onChange={(e) => onChange(e.target.checked ? "Yes" : "")}
          className="rounded"
        />
        {field.label}
        {field.required && " *"}
      </label>
    );
  }

  return (
    <div>
      {label}
      <input
        type={field.type === "number" ? "number" : "text"}
        value={value}
        placeholder={field.placeholder}
        onChange={(e) => onChange(e.target.value)}
        className={inputClass}
      />
    </div>
  );
}
