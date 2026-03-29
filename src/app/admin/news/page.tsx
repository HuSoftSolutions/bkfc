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
import { NewsArticle } from "@/types";
import { Plus, Pencil, Trash2, X, Eye, EyeOff } from "lucide-react";
import MediaPicker from "@/components/MediaPicker";

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

  async function fetchArticles() {
    const q = query(collection(getDb(), "news"), orderBy("date", "desc"));
    const snap = await getDocs(q);
    setArticles(snap.docs.map((d) => ({ id: d.id, ...d.data() })) as NewsArticle[]);
  }

  useEffect(() => {
    fetchArticles();
  }, []);

  const generateSlug = (title: string) =>
    title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

  const handleSave = async () => {
    if (!editing) return;
    const data = {
      title: editing.title || "",
      slug: editing.slug || generateSlug(editing.title || ""),
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

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this article?")) return;
    await deleteDoc(doc(getDb(), "news", id));
    fetchArticles();
  };

  const inputClass =
    "w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:border-red-500 focus:outline-none";

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
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
          <div className="bg-gray-900 border border-gray-700 rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6">
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
        {articles.map((article) => (
          <div
            key={article.id}
            className="flex items-center justify-between bg-gray-900 border border-gray-800 rounded-lg px-4 py-3"
          >
            <div className="flex items-center gap-3">
              {article.published ? (
                <Eye size={16} className="text-green-400" />
              ) : (
                <EyeOff size={16} className="text-gray-500" />
              )}
              <div>
                <p className="text-white font-medium">{article.title}</p>
                <p className="text-gray-500 text-xs">{article.date}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
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
    </div>
  );
}
