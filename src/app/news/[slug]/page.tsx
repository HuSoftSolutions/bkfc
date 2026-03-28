"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { NewsArticle } from "@/types";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function NewsArticlePage() {
  const params = useParams();
  const slug = params.slug as string;
  const [article, setArticle] = useState<NewsArticle | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchArticle() {
      try {
        const q = query(collection(db, "news"), where("slug", "==", slug));
        const snapshot = await getDocs(q);
        if (snapshot.size > 0) {
          const doc = snapshot.docs[0];
          setArticle({ id: doc.id, ...doc.data() } as NewsArticle);
        }
      } catch (err) {
        console.error("Error fetching article:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchArticle();
  }, [slug]);

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-800 rounded w-3/4" />
          <div className="h-64 bg-gray-800 rounded" />
          <div className="h-4 bg-gray-800 rounded w-full" />
          <div className="h-4 bg-gray-800 rounded w-5/6" />
        </div>
      </div>
    );
  }

  if (!article) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center">
        <h1 className="text-2xl font-bold text-white mb-4">Article Not Found</h1>
        <Link href="/news" className="text-red-400 hover:underline">
          &larr; Back to News
        </Link>
      </div>
    );
  }

  return (
    <article className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      <Link
        href="/news"
        className="inline-flex items-center gap-2 text-red-400 hover:text-red-300 text-sm mb-6 transition-colors"
      >
        <ArrowLeft size={16} /> Back to News
      </Link>

      <p className="text-sm text-red-400 font-medium mb-2">{article.date}</p>
      <h1 className="text-3xl md:text-4xl font-bold text-white mb-6">
        {article.title}
      </h1>

      {article.image && (
        <div className="relative w-full h-64 md:h-96 rounded-xl overflow-hidden mb-8">
          <Image
            src={article.image}
            alt={article.title}
            fill
            className="object-cover"
          />
        </div>
      )}

      <div className="text-gray-300 leading-relaxed whitespace-pre-wrap">
        {article.content}
      </div>
    </article>
  );
}
