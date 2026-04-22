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
  where,
} from "firebase/firestore";
import { getDb } from "@/lib/firebase";
import { NewsArticle } from "@/types";
import { Plus, Pencil, Trash2, X, Pin, PinOff, ImageIcon } from "lucide-react";
import MediaPicker from "@/components/MediaPicker";
import AdminPagination from "@/components/AdminPagination";

const PER_PAGE = 15;

const emptyArticle = {
  title: "",
  slug: "",
  content: "",
  excerpt: "",
  image: "",
  date: "",
  published: false,
};

export default function AdminNewsPage() {
  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [editing, setEditing] = useState<Partial<NewsArticle> | null>(null);
  const [page, setPage] = useState(1);

  const totalPages = Math.ceil(articles.length / PER_PAGE);
  const paginated = articles.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  async function fetchArticles() {
    const q = query(collection(getDb(), "news"), orderBy("date", "desc"));
    const snap = await getDocs(q);
    setArticles(snap.docs.map((d) => ({ id: d.id, ...d.data() })) as NewsArticle[]);
    setPage(1);
  }

  useEffect(() => {
    const timer = setTimeout(() => {
      void fetchArticles();
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  const generateSlug = (title: string) =>
    title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

  const ensureUniqueSlug = async (baseSlug: string, excludeId?: string) => {
    let slug = baseSlug;
    let suffix = 2;
    while (true) {
      const snap = await getDocs(
        query(collection(getDb(), "news"), where("slug", "==", slug))
      );
      const conflict = snap.docs.some((d) => d.id !== excludeId);
      if (!conflict) return slug;
      slug = `${baseSlug}-${suffix}`;
      suffix++;
    }
  };

  const handleSave = async () => {
    if (!editing) return;
    const baseSlug = editing.slug || generateSlug(editing.title || "");
    const slug = await ensureUniqueSlug(baseSlug, editing.id || undefined);
    const data = {
      title: editing.title || "",
      slug,
      content: editing.content || "",
      excerpt: editing.excerpt || (editing.content || "").substring(0, 150) + "…",
      image: editing.image || "",
      date: editing.date || new Date().toISOString().split("T")[0],
      published: editing.published ?? false,
    };

    if (editing.id) {
      await updateDoc(doc(getDb(), "news", editing.id), data);
    } else {
      await addDoc(collection(getDb(), "news"), data);
    }
    setEditing(null);
    fetchArticles();
  };

  const togglePin = async (article: NewsArticle) => {
    await updateDoc(doc(getDb(), "news", article.id), { pinned: !article.pinned });
    fetchArticles();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this article?")) return;
    await deleteDoc(doc(getDb(), "news", id));
    fetchArticles();
  };

  const inputClass =
    "w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:border-red-500 focus:outline-none";

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <h1 className="text-2xl font-bold text-white">Manage News</h1>
        <button
          onClick={() => setEditing({ ...emptyArticle })}
          className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
        >
          <Plus size={16} /> New Article
        </button>
      </div>

      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-4 sm:p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-white">
                {editing.id ? "Edit Article" : "New Article"}
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
                <label className="block text-xs text-gray-400 mb-1">Slug</label>
                <input
                  value={editing.slug || ""}
                  onChange={(e) => setEditing({ ...editing, slug: e.target.value })}
                  placeholder="auto-generated from title"
                  className={inputClass}
                />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Date</label>
                <input
                  type="date"
                  value={editing.date || ""}
                  onChange={(e) => setEditing({ ...editing, date: e.target.value })}
                  className={inputClass}
                />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Excerpt</label>
                <textarea
                  rows={2}
                  value={editing.excerpt || ""}
                  onChange={(e) => setEditing({ ...editing, excerpt: e.target.value })}
                  placeholder="Short summary (auto-generated if empty)"
                  className={`${inputClass} resize-none`}
                />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Content</label>
                <textarea
                  rows={8}
                  value={editing.content || ""}
                  onChange={(e) => setEditing({ ...editing, content: e.target.value })}
                  className={`${inputClass} resize-none`}
                />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Image</label>
                <MediaPicker
                  value={editing.image || ""}
                  onSelect={(url) => setEditing({ ...editing, image: url })}
                  folder="news"
                />
              </div>
              <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={editing.published ?? false}
                  onChange={(e) => setEditing({ ...editing, published: e.target.checked })}
                  className="rounded"
                />
                Published
              </label>
              <button
                onClick={handleSave}
                className="bg-red-600 hover:bg-red-700 text-white font-medium px-6 py-2 rounded-lg transition-colors w-full"
              >
                {editing.id ? "Update" : "Create"}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {paginated.map((article) => (
          <div
            key={article.id}
            className="flex items-center justify-between gap-2 bg-gray-900 border border-gray-800 rounded-lg px-3 sm:px-4 py-3"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-lg overflow-hidden bg-gray-800 shrink-0 flex items-center justify-center">
                {article.image ? (
                  <img src={article.image} alt="" className="w-full h-full object-cover" />
                ) : (
                  <ImageIcon size={16} className="text-gray-600" />
                )}
              </div>
              <div className="min-w-0">
                <p className="text-white font-medium truncate">{article.title}</p>
                <p className="text-gray-500 text-xs">{article.date}</p>
              </div>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <button
                onClick={() => togglePin(article)}
                className={`p-1 ${article.pinned ? "text-yellow-400" : "text-gray-600 hover:text-yellow-400"}`}
                title={article.pinned ? "Unpin" : "Pin to top"}
              >
                {article.pinned ? <Pin size={16} /> : <PinOff size={16} />}
              </button>
              <button onClick={() => setEditing(article)} className="text-gray-400 hover:text-white p-1">
                <Pencil size={16} />
              </button>
              <button onClick={() => handleDelete(article.id)} className="text-gray-400 hover:text-red-400 p-1">
                <Trash2 size={16} />
              </button>
            </div>
          </div>
        ))}
        {articles.length === 0 && (
          <p className="text-gray-500 text-sm">No articles yet.</p>
        )}
      </div>
      <AdminPagination page={page} totalPages={totalPages} onPageChange={setPage} />
    </div>
  );
}
