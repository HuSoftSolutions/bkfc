"use client";

import { useEffect, useState, useCallback } from "react";
import {
  ref,
  uploadBytes,
  getDownloadURL,
  listAll,
  deleteObject,
} from "firebase/storage";
import { getAppStorage } from "@/lib/firebase";
import Image from "next/image";
import { Upload, Trash2, Copy, Check, ImageIcon } from "lucide-react";

interface MediaItem {
  url: string;
  name: string;
  path: string;
  folder: string;
}

const FOLDERS = ["uploads", "calls", "news", "apparatus", "officers", "hero"];

export default function AdminMediaPage() {
  const [items, setItems] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [filter, setFilter] = useState<string>("all");
  const [copied, setCopied] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const fetchMedia = useCallback(async () => {
    setLoading(true);
    try {
      const storage = getAppStorage();
      const allItems: MediaItem[] = [];

      await Promise.all(
        FOLDERS.map(async (folder) => {
          try {
            const listRef = ref(storage, folder);
            const result = await listAll(listRef);
            const urls = await Promise.all(
              result.items.map(async (itemRef) => {
                const url = await getDownloadURL(itemRef);
                return {
                  url,
                  name: itemRef.name,
                  path: itemRef.fullPath,
                  folder,
                };
              })
            );
            allItems.push(...urls);
          } catch {
            // folder may not exist
          }
        })
      );

      allItems.sort((a, b) => b.name.localeCompare(a.name));
      setItems(allItems);
    } catch (err) {
      console.error("Error loading media:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMedia();
  }, [fetchMedia]);

  const handleUpload = async (files: FileList) => {
    setUploading(true);
    const storage = getAppStorage();
    await Promise.all(
      Array.from(files).map(async (file) => {
        const storageRef = ref(
          storage,
          `uploads/${Date.now()}_${file.name}`
        );
        await uploadBytes(storageRef, file);
      })
    );
    setUploading(false);
    fetchMedia();
  };

  const handleDelete = async (paths: string[]) => {
    if (
      !confirm(
        `Delete ${paths.length} image${paths.length > 1 ? "s" : ""}? This cannot be undone.`
      )
    )
      return;

    const storage = getAppStorage();
    await Promise.all(
      paths.map((path) => deleteObject(ref(storage, path)))
    );
    setSelected(new Set());
    fetchMedia();
  };

  const copyUrl = (url: string) => {
    navigator.clipboard.writeText(url);
    setCopied(url);
    setTimeout(() => setCopied(null), 2000);
  };

  const toggleSelect = (path: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  };

  const filteredItems =
    filter === "all" ? items : items.filter((i) => i.folder === filter);

  const folderCounts = items.reduce<Record<string, number>>((acc, item) => {
    acc[item.folder] = (acc[item.folder] || 0) + 1;
    return acc;
  }, {});

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-white flex items-center gap-3">
          <ImageIcon size={24} />
          Media Library
        </h1>
        <div className="flex items-center gap-2">
          {selected.size > 0 && (
            <button
              onClick={() => handleDelete(Array.from(selected))}
              className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
            >
              <Trash2 size={16} /> Delete ({selected.size})
            </button>
          )}
          <label className="flex items-center gap-2 bg-gray-700 hover:bg-gray-600 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors cursor-pointer">
            <Upload size={16} />
            {uploading ? "Uploading..." : "Upload"}
            <input
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              disabled={uploading}
              onChange={(e) => {
                if (e.target.files) handleUpload(e.target.files);
              }}
            />
          </label>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 mb-6 flex-wrap">
        <button
          onClick={() => setFilter("all")}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
            filter === "all"
              ? "bg-red-600/20 text-red-400"
              : "bg-gray-800 text-gray-400 hover:text-white"
          }`}
        >
          All ({items.length})
        </button>
        {FOLDERS.map((f) => {
          const count = folderCounts[f] || 0;
          if (count === 0) return null;
          return (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors capitalize ${
                filter === f
                  ? "bg-red-600/20 text-red-400"
                  : "bg-gray-800 text-gray-400 hover:text-white"
              }`}
            >
              {f} ({count})
            </button>
          );
        })}
      </div>

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {[...Array(10)].map((_, i) => (
            <div
              key={i}
              className="aspect-square bg-gray-900 rounded-lg animate-pulse"
            />
          ))}
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="text-center py-16">
          <ImageIcon size={48} className="mx-auto text-gray-700 mb-4" />
          <p className="text-gray-400">No images found</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {filteredItems.map((item) => {
            const isSelected = selected.has(item.path);
            return (
              <div
                key={item.path}
                className={`relative aspect-square rounded-lg overflow-hidden border-2 group transition-all ${
                  isSelected
                    ? "border-red-500 ring-2 ring-red-500/30"
                    : "border-gray-800 hover:border-gray-600"
                }`}
              >
                <Image
                  src={item.url}
                  alt={item.name}
                  fill
                  className="object-cover"
                  sizes="200px"
                />

                {/* Select checkbox */}
                <button
                  onClick={() => toggleSelect(item.path)}
                  className={`absolute top-2 left-2 w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
                    isSelected
                      ? "bg-red-500 border-red-500"
                      : "bg-black/40 border-gray-400 opacity-0 group-hover:opacity-100"
                  }`}
                >
                  {isSelected && <Check size={12} className="text-white" />}
                </button>

                {/* Actions overlay */}
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <p className="text-white text-[10px] truncate mb-1">
                    {item.name}
                  </p>
                  <p className="text-gray-400 text-[10px] capitalize mb-2">
                    {item.folder}
                  </p>
                  <div className="flex gap-1">
                    <button
                      onClick={() => copyUrl(item.url)}
                      className="bg-gray-700 hover:bg-gray-600 text-white text-[10px] px-2 py-1 rounded flex items-center gap-1"
                    >
                      {copied === item.url ? (
                        <>
                          <Check size={10} /> Copied
                        </>
                      ) : (
                        <>
                          <Copy size={10} /> URL
                        </>
                      )}
                    </button>
                    <button
                      onClick={() => handleDelete([item.path])}
                      className="bg-red-700 hover:bg-red-600 text-white text-[10px] px-2 py-1 rounded flex items-center gap-1"
                    >
                      <Trash2 size={10} /> Delete
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
