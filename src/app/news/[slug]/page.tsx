"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { collection, query, where, getDocs } from "firebase/firestore";
import { getDb } from "@/lib/firebase";
import { NewsArticle } from "@/types";
import Link from "next/link";
import { ArrowLeft, Calendar, Newspaper } from "lucide-react";

function linkifyContent(text: string) {
  // Supports [link text](url) markdown-style links and bare URLs
  const linkRegex = /(\[([^\]]+)\]\((https?:\/\/[^\s)]+)\))|(https?:\/\/[^\s]+)/g;
  const elements: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = linkRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      elements.push(text.slice(lastIndex, match.index));
    }
    if (match[1]) {
      // [text](url) style
      elements.push(
        <a
          key={match.index}
          href={match[3]}
          target="_blank"
          rel="noopener noreferrer"
          className="text-red-600 hover:text-red-700 underline"
        >
          {match[2]}
        </a>
      );
    } else {
      // bare URL
      elements.push(
        <a
          key={match.index}
          href={match[4]}
          target="_blank"
          rel="noopener noreferrer"
          className="text-red-600 hover:text-red-700 underline"
        >
          {match[4]}
        </a>
      );
    }
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    elements.push(text.slice(lastIndex));
  }

  return elements;
}

export default function NewsArticlePage() {
  const params = useParams();
  const slug = params.slug as string;
  const [article, setArticle] = useState<NewsArticle | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchArticle() {
      try {
        const q = query(
          collection(getDb(), "news"),
          where("slug", "==", slug)
        );
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
      <div className="max-w-4xl mx-auto px-4 py-20">
        <div className="animate-pulse space-y-6">
          <div className="h-6 bg-gray-200 rounded w-32" />
          <div className="h-10 bg-gray-200 rounded w-3/4" />
          <div className="h-80 bg-gray-200 rounded-2xl" />
          <div className="h-4 bg-gray-200 rounded w-full" />
          <div className="h-4 bg-gray-200 rounded w-5/6" />
        </div>
      </div>
    );
  }

  if (!article) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center">
        <Newspaper size={48} className="mx-auto text-gray-400 mb-4" />
        <h1 className="text-2xl font-bold text-gray-900 mb-4">
          Article Not Found
        </h1>
        <Link
          href="/news"
          className="text-red-600 hover:text-red-700 transition-colors"
        >
          &larr; Back to News
        </Link>
      </div>
    );
  }

  return (
    <article className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      {/* Back link */}
      <Link
        href="/news"
        className="inline-flex items-center gap-2 text-gray-500 hover:text-gray-900 text-sm mb-8 transition-colors group"
      >
        <ArrowLeft
          size={16}
          className="group-hover:-translate-x-0.5 transition-transform"
        />
        Back to News
      </Link>

      {/* Date tag */}
      <div className="mb-4">
        <span className="flex items-center gap-1.5 bg-red-50 border border-red-200 text-red-700 text-xs font-medium px-3 py-1.5 rounded-full w-fit">
          <Calendar size={12} /> {article.date}
        </span>
      </div>

      {/* Title */}
      <h1 className="text-3xl md:text-4xl font-extrabold text-gray-900 mb-6 leading-tight">
        {article.title}
      </h1>

      {/* Image */}
      {article.image && (
        <div className="relative w-full rounded-2xl overflow-hidden mb-8">
          <img
            src={article.image}
            alt={article.title}
            className="w-full h-auto"
          />
        </div>
      )}

      {/* Divider */}
      <div className="w-16 h-1 bg-red-600 rounded-full mb-8" />

      {/* Body */}
      <div className="text-gray-600 text-base md:text-lg leading-relaxed whitespace-pre-wrap">
        {linkifyContent(article.content)}
      </div>
    </article>
  );
}
