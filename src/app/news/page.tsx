"use client";

import { useEffect, useState } from "react";
import { collection, query, orderBy, getDocs, where } from "firebase/firestore";
import { getDb } from "@/lib/firebase";
import { NewsArticle } from "@/types";
import Hero from "@/components/Hero";
import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, ChevronLeft, ChevronRight } from "lucide-react";
import { sortPinned } from "@/lib/sortPinned";
import PlaceholderImage from "@/components/PlaceholderImage";

const PER_PAGE = 9;

export default function NewsPage() {
  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);

  useEffect(() => {
    async function fetchNews() {
      try {
        const q = query(
          collection(getDb(), "news"),
          where("published", "==", true),
          orderBy("date", "desc")
        );
        const snapshot = await getDocs(q);
        setArticles(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })) as NewsArticle[]);
      } catch (err) {
        console.error("Error fetching news:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchNews();
  }, []);

  const sorted = sortPinned(articles);
  const totalPages = Math.ceil(sorted.length / PER_PAGE);
  const paginated = sorted.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  return (
    <>
      <Hero title="News" subtitle="Announcements and updates from BKFC" />

      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(PER_PAGE)].map((_, i) => (
              <div key={i} className="bg-gray-50 border border-gray-200 rounded-2xl h-72 animate-pulse" />
            ))}
          </div>
        ) : articles.length === 0 ? (
          <p className="text-gray-400 text-center py-12">No news articles to display.</p>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {paginated.map((article) => (
                <Link
                  key={article.id}
                  href={`/news/${article.slug}`}
                  className="bg-white border border-gray-200 rounded-2xl overflow-hidden hover:border-red-300 hover:shadow-md transition-all group duration-300"
                >
                  <div className="relative w-full h-48 overflow-hidden">
                    {article.image ? (
                      <Image src={article.image} alt={article.title} fill className="object-cover" />
                    ) : (
                      <PlaceholderImage variant="news" className="h-48" />
                    )}
                    <div className="absolute bottom-3 left-3">
                      <span className="bg-red-600 text-white text-[10px] font-semibold px-2.5 py-1 rounded-full">
                        {article.date}
                      </span>
                    </div>
                  </div>
                  <div className="p-5">
                    <h3 className="text-gray-900 font-bold text-lg mb-2 group-hover:text-red-600 transition-colors leading-snug">
                      {article.title}
                    </h3>
                    <p className="text-gray-500 text-sm line-clamp-2">{article.excerpt}</p>
                    <div className="mt-4 flex items-center gap-1 text-red-600 text-sm font-medium">
                      Read More <ArrowUpRight size={14} />
                    </div>
                  </div>
                </Link>
              ))}
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
