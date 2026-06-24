"use client";

import { useEffect, useState } from "react";
import { collection, query, getDocs, where } from "firebase/firestore";
import { getDb } from "@/lib/firebase";
import { Product } from "@/types";
import Hero from "@/components/Hero";
import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, ChevronLeft, ChevronRight, Tag } from "lucide-react";
import { sortPinned } from "@/lib/sortPinned";
import PlaceholderImage from "@/components/PlaceholderImage";

const PER_PAGE = 9;

function startingPrice(product: Product): number | null {
  const prices = (product.variants || []).map((v) => v.price);
  if (prices.length === 0) return null;
  return Math.min(...prices);
}

export default function StorePage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);

  useEffect(() => {
    async function fetchProducts() {
      try {
        const q = query(
          collection(getDb(), "products"),
          where("published", "==", true)
        );
        const snapshot = await getDocs(q);
        setProducts(
          snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })) as Product[]
        );
      } catch (err) {
        console.error("Error fetching products:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchProducts();
  }, []);

  const sorted = sortPinned(products);
  const totalPages = Math.ceil(sorted.length / PER_PAGE);
  const paginated = sorted.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  return (
    <>
      <Hero title="Store" subtitle="Support BKFC — shop our products" />

      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(PER_PAGE)].map((_, i) => (
              <div key={i} className="bg-gray-50 border border-gray-200 rounded-2xl h-64 animate-pulse" />
            ))}
          </div>
        ) : products.length === 0 ? (
          <p className="text-gray-400 text-center py-12">No products available right now. Check back soon.</p>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {paginated.map((product) => {
                const price = startingPrice(product);
                return (
                  <Link
                    key={product.id}
                    href={`/store/${product.id}`}
                    className="bg-white border border-gray-200 rounded-2xl overflow-hidden hover:border-red-300 hover:shadow-md transition-all group duration-300"
                  >
                    <div className="relative w-full h-44 overflow-hidden">
                      {product.image ? (
                        <Image src={product.image} alt={product.title} fill className="object-cover" />
                      ) : (
                        <PlaceholderImage variant="event" className="h-44" />
                      )}
                    </div>
                    <div className="p-5">
                      <h3 className="text-gray-900 font-bold text-lg mb-2 group-hover:text-red-600 transition-colors leading-snug">
                        {product.title}
                      </h3>
                      {price !== null && (
                        <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
                          <div className="w-7 h-7 rounded-lg bg-red-50 flex items-center justify-center">
                            <Tag size={13} className="text-red-600" />
                          </div>
                          <span>
                            {(product.variants || []).length > 1 ? "From " : ""}
                            <span className="text-gray-900 font-semibold">${price.toFixed(2)}</span>
                          </span>
                        </div>
                      )}
                      {product.description && (
                        <p className="text-gray-400 text-sm mt-1 line-clamp-2">{product.description}</p>
                      )}
                      <div className="mt-4 flex items-center gap-1 text-red-600 text-sm font-medium">
                        View Details <ArrowUpRight size={14} />
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>

            {totalPages > 1 && (
              <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
            )}
          </>
        )}
      </section>
    </>
  );
}

function Pagination({
  page,
  totalPages,
  onPageChange,
}: {
  page: number;
  totalPages: number;
  onPageChange: (p: number) => void;
}) {
  return (
    <div className="flex items-center justify-center gap-2 mt-12">
      <button
        onClick={() => onPageChange(page - 1)}
        disabled={page === 1}
        className="flex items-center gap-1 px-4 py-2 rounded-lg border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
      >
        <ChevronLeft size={16} /> Prev
      </button>
      <div className="flex items-center gap-1">
        {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
          <button
            key={p}
            onClick={() => onPageChange(p)}
            className={`w-10 h-10 rounded-lg text-sm font-medium transition-colors ${
              p === page ? "bg-red-600 text-white" : "text-gray-600 hover:bg-gray-100"
            }`}
          >
            {p}
          </button>
        ))}
      </div>
      <button
        onClick={() => onPageChange(page + 1)}
        disabled={page === totalPages}
        className="flex items-center gap-1 px-4 py-2 rounded-lg border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
      >
        Next <ChevronRight size={16} />
      </button>
    </div>
  );
}
