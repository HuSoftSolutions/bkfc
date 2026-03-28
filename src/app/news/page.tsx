"use client";

import { useEffect, useState } from "react";
import { collection, query, orderBy, getDocs, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { NewsArticle } from "@/types";
import Hero from "@/components/Hero";
import Image from "next/image";
import Link from "next/link";

export default function NewsPage() {
  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchNews() {
      try {
        const q = query(
          collection(db, "news"),
          where("published", "==", true),
          orderBy("date", "desc")
        );
        const snapshot = await getDocs(q);
        setArticles(
          snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })) as NewsArticle[]
        );
      } catch (err) {
        console.error("Error fetching news:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchNews();
  }, []);

  return (
    <>
      <Hero title="News" subtitle="Announcements and updates from BKFC" />

      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        {loading ? (
          <div className="space-y-6">
            {[...Array(3)].map((_, i) => (
              <div
                key={i}
                className="bg-gray-900 border border-gray-800 rounded-lg h-32 animate-pulse"
              />
            ))}
          </div>
        ) : articles.length === 0 ? (
          <p className="text-gray-400">No news articles to display.</p>
        ) : (
          <div className="space-y-6">
            {articles.map((article) => (
              <Link
                key={article.id}
                href={`/news/${article.slug}`}
                className="flex flex-col sm:flex-row bg-gray-900 border border-gray-800 rounded-lg overflow-hidden hover:border-red-600/50 transition-all group"
              >
                {article.image && (
                  <div className="relative w-full sm:w-64 h-48 sm:h-auto shrink-0">
                    <Image
                      src={article.image}
                      alt={article.title}
                      fill
                      className="object-cover"
                    />
                  </div>
                )}
                <div className="p-5">
                  <p className="text-xs text-red-400 font-medium mb-1">
                    {article.date}
                  </p>
                  <h3 className="text-white font-semibold text-lg mb-2 group-hover:text-red-400 transition-colors">
                    {article.title}
                  </h3>
                  <p className="text-gray-400 text-sm">{article.excerpt}</p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </>
  );
}
