"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { doc, getDoc } from "firebase/firestore";
import { getDb } from "@/lib/firebase";
import { Product } from "@/types";
import Link from "next/link";
import { ArrowLeft, ShoppingBag } from "lucide-react";

export default function ProductDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchProduct() {
      try {
        const docSnap = await getDoc(doc(getDb(), "products", id));
        if (docSnap.exists()) {
          setProduct({ id: docSnap.id, ...docSnap.data() } as Product);
        }
      } catch (err) {
        console.error("Error fetching product:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchProduct();
  }, [id]);

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20">
        <div className="animate-pulse space-y-6">
          <div className="h-6 bg-gray-200 rounded w-32" />
          <div className="h-10 bg-gray-200 rounded w-3/4" />
          <div className="aspect-video bg-gray-200 rounded-2xl" />
          <div className="h-4 bg-gray-200 rounded w-full" />
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center">
        <ShoppingBag size={48} className="mx-auto text-gray-400 mb-4" />
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Product Not Found</h1>
        <Link href="/store" className="text-red-600 hover:text-red-700 transition-colors">
          &larr; Back to Store
        </Link>
      </div>
    );
  }

  const canBuy = product.available !== false && (product.variants || []).length > 0;

  return (
    <article className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <Link
        href="/store"
        className="inline-flex items-center gap-2 text-gray-500 hover:text-gray-900 text-sm mb-8 transition-colors group"
      >
        <ArrowLeft size={16} className="group-hover:-translate-x-0.5 transition-transform" />
        Back to Store
      </Link>

      <h1 className="text-3xl md:text-4xl font-extrabold text-gray-900 mb-6 leading-tight">
        {product.title}
      </h1>

      {product.image && (
        <div className="w-full rounded-2xl overflow-hidden mb-8 bg-gray-100">
          <img src={product.image} alt={product.title} className="w-full h-auto block" />
        </div>
      )}

      {/* Buy button */}
      <div className="mb-8">
        {canBuy ? (
          <Link
            href={`/store/${product.id}/order`}
            className="inline-flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white font-semibold px-8 py-3.5 rounded-xl transition-colors"
          >
            <ShoppingBag size={18} /> Order Now
          </Link>
        ) : (
          <div className="inline-flex items-center gap-2 bg-gray-100 border border-gray-200 text-gray-600 font-semibold px-6 py-3 rounded-xl">
            Currently Unavailable
          </div>
        )}
      </div>

      <div className="w-16 h-1 bg-red-600 rounded-full mb-8" />

      <div className="text-gray-600 text-base md:text-lg leading-relaxed whitespace-pre-wrap">
        {product.description}
      </div>

      {/* Variant pricing preview */}
      {(product.variants || []).length > 0 && (
        <div className="mt-10 pt-8 border-t border-gray-200">
          <h3 className="text-xl font-bold text-gray-900 mb-4">Options</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {(product.variants || []).map((v) => (
              <div
                key={v.id}
                className="bg-gray-50 border border-gray-200 rounded-xl p-4 flex justify-between items-center"
              >
                <div>
                  <p className="text-gray-900 font-medium">{v.name}</p>
                  {v.description && <p className="text-gray-500 text-sm">{v.description}</p>}
                </div>
                <p className="text-red-600 font-bold">${v.price.toFixed(2)}</p>
              </div>
            ))}
          </div>
          {canBuy && (
            <div className="mt-6">
              <Link
                href={`/store/${product.id}/order`}
                className="inline-flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white font-semibold px-8 py-3 rounded-xl transition-colors"
              >
                <ShoppingBag size={18} /> Order Now
              </Link>
            </div>
          )}
        </div>
      )}
    </article>
  );
}
