"use client";

import { useEffect, useState, useCallback } from "react";
import {
  collection,
  query,
  orderBy,
  getDocs,
  addDoc,
  deleteDoc,
  updateDoc,
  doc,
} from "firebase/firestore";
import { ref, listAll, getDownloadURL, uploadBytes } from "firebase/storage";
import { getDb, getAppStorage } from "@/lib/firebase";
import { GalleryImage } from "@/types";
import Image from "next/image";
import {
  Trash2,
  ImageIcon,
  Check,
  Upload,
  X,
} from "lucide-react";
import AdminPagination from "@/components/AdminPagination";

const PER_PAGE = 20;

export default function AdminGalleryPage() {
  const [images, setImages] = useState<GalleryImage[]>([]);
  const [page, setPage] = useState(1);
  const [showBulk, setShowBulk] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState("");
  const [storageImages, setStorageImages] = useState<
    { url: string; path: string; name: string }[]
  >([]);
  const [selectedUrls, setSelectedUrls] = useState<Set<string>>(new Set());
  const [loadingStorage, setLoadingStorage] = useState(false);
  const [editingCaption, setEditingCaption] = useState<string | null>(null);
  const [captionValue, setCaptionValue] = useState("");

  const totalPages = Math.ceil(images.length / PER_PAGE);
  const paginated = images.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  const fetchGallery = useCallback(async () => {
    const q = query(collection(getDb(), "gallery"), orderBy("order", "asc"));
    const snap = await getDocs(q);
    setImages(
      snap.docs.map((d) => ({ id: d.id, ...d.data() })) as GalleryImage[]
    );
    setPage(1);
  }, []);

  useEffect(() => {
    fetchGallery();
  }, [fetchGallery]);

  const fetchStorageImages = async () => {
    setLoadingStorage(true);
    try {
      const storage = getAppStorage();
      const folders = [
        "uploads",
        "calls",
        "news",
        "apparatus",
        "officers",
        "hero",
      ];
      const allItems: { url: string; path: string; name: string }[] = [];

      // Get existing gallery URLs to filter them out
      const existingUrls = new Set(images.map((img) => img.url));

      await Promise.all(
        folders.map(async (folder) => {
          try {
            const listRef = ref(storage, folder);
            const result = await listAll(listRef);
            const urls = await Promise.all(
              result.items.map(async (itemRef) => {
                const url = await getDownloadURL(itemRef);
                return { url, path: itemRef.fullPath, name: itemRef.name };
              })
            );
            allItems.push(
              ...urls.filter((item) => !existingUrls.has(item.url))
            );
          } catch {
            // folder may not exist
          }
        })
      );

      allItems.sort((a, b) => b.name.localeCompare(a.name));
      setStorageImages(allItems);
    } catch (err) {
      console.error("Error loading storage:", err);
    } finally {
      setLoadingStorage(false);
    }
  };

  const handleBulkUpload = async (files: FileList) => {
    const fileArray = Array.from(files);
    if (fileArray.length === 0) return;

    setUploading(true);
    setUploadProgress(`0 / ${fileArray.length}`);

    const storage = getAppStorage();
    let completed = 0;

    await Promise.all(
      fileArray.map(async (file) => {
        const storageRef = ref(
          storage,
          `uploads/${Date.now()}_${Math.random().toString(36).slice(2)}_${file.name}`
        );
        await uploadBytes(storageRef, file);
        const url = await getDownloadURL(storageRef);
        await addDoc(collection(getDb(), "gallery"), {
          url,
          caption: "",
          order: images.length + completed,
          createdAt: new Date().toISOString(),
        });
        completed++;
        setUploadProgress(`${completed} / ${fileArray.length}`);
      })
    );

    setUploading(false);
    setUploadProgress("");
    fetchGallery();
  };

  const handleAddBulk = async () => {
    const urls = Array.from(selectedUrls);
    if (urls.length === 0) return;

    const batch = urls.map((url, i) =>
      addDoc(collection(getDb(), "gallery"), {
        url,
        caption: "",
        order: images.length + i,
        createdAt: new Date().toISOString(),
      })
    );
    await Promise.all(batch);
    setSelectedUrls(new Set());
    setShowBulk(false);
    fetchGallery();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Remove from gallery?")) return;
    await deleteDoc(doc(getDb(), "gallery", id));
    fetchGallery();
  };

  const handleSaveCaption = async (id: string) => {
    await updateDoc(doc(getDb(), "gallery", id), { caption: captionValue });
    setEditingCaption(null);
    fetchGallery();
  };

  const toggleSelect = (url: string) => {
    setSelectedUrls((prev) => {
      const next = new Set(prev);
      if (next.has(url)) next.delete(url);
      else next.add(url);
      return next;
    });
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-white flex items-center gap-3">
          <ImageIcon size={24} />
          Gallery
        </h1>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setShowBulk(true);
              fetchStorageImages();
            }}
            className="flex items-center gap-2 bg-gray-700 hover:bg-gray-600 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
          >
            <ImageIcon size={16} /> Add from Media
          </button>
          <label className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors cursor-pointer">
            <Upload size={16} />
            {uploading ? uploadProgress : "Upload Photos"}
            <input
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              disabled={uploading}
              onChange={(e) => {
                if (e.target.files) handleBulkUpload(e.target.files);
              }}
            />
          </label>
        </div>
      </div>

      <p className="text-gray-500 text-sm mb-6">
        {images.length} photo{images.length !== 1 ? "s" : ""} in gallery.
        Click caption to edit.
      </p>

      {/* Bulk add from existing media */}
      {showBulk && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-xl w-full max-w-3xl max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-gray-800">
              <h2 className="text-lg font-bold text-white">
                Add from Media Library
              </h2>
              <div className="flex items-center gap-3">
                {selectedUrls.size > 0 && (
                  <button
                    onClick={handleAddBulk}
                    className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
                  >
                    <Check size={16} /> Add {selectedUrls.size} Photo
                    {selectedUrls.size !== 1 ? "s" : ""}
                  </button>
                )}
                <button
                  onClick={() => {
                    setShowBulk(false);
                    setSelectedUrls(new Set());
                  }}
                  className="text-gray-400 hover:text-white"
                >
                  <X size={20} />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              {loadingStorage ? (
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
                  {[...Array(10)].map((_, i) => (
                    <div
                      key={i}
                      className="aspect-square bg-gray-800 rounded-lg animate-pulse"
                    />
                  ))}
                </div>
              ) : storageImages.length === 0 ? (
                <p className="text-gray-500 text-center py-12">
                  No new images available. All images are already in the
                  gallery.
                </p>
              ) : (
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
                  {storageImages.map((item) => {
                    const selected = selectedUrls.has(item.url);
                    return (
                      <button
                        key={item.path}
                        onClick={() => toggleSelect(item.url)}
                        className={`relative aspect-square rounded-lg overflow-hidden border-2 transition-all ${
                          selected
                            ? "border-red-500 ring-2 ring-red-500/30"
                            : "border-gray-700 hover:border-gray-500"
                        }`}
                      >
                        <Image
                          src={item.url}
                          alt={item.name}
                          fill
                          className="object-cover"
                          sizes="150px"
                        />
                        {selected && (
                          <div className="absolute inset-0 bg-red-500/20 flex items-center justify-center">
                            <Check
                              size={24}
                              className="text-white drop-shadow-lg"
                            />
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Gallery list */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {paginated.map((img) => (
          <div
            key={img.id}
            className="bg-gray-900 border border-gray-800 rounded-lg overflow-hidden group relative"
          >
            <div className="relative aspect-square">
              <Image
                src={img.url}
                alt={img.caption || "Gallery"}
                fill
                className="object-cover"
                sizes="200px"
              />
            </div>
            <div className="p-2">
              {editingCaption === img.id ? (
                <div className="flex gap-1">
                  <input
                    value={captionValue}
                    onChange={(e) => setCaptionValue(e.target.value)}
                    className="flex-1 bg-gray-800 border border-gray-700 rounded px-2 py-1 text-white text-xs focus:border-red-500 focus:outline-none"
                    placeholder="Caption..."
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleSaveCaption(img.id);
                      if (e.key === "Escape") setEditingCaption(null);
                    }}
                  />
                  <button
                    onClick={() => handleSaveCaption(img.id)}
                    className="text-green-400 hover:text-green-300 p-1"
                  >
                    <Check size={14} />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => {
                    setEditingCaption(img.id);
                    setCaptionValue(img.caption || "");
                  }}
                  className="text-gray-500 text-xs hover:text-gray-300 text-left w-full truncate"
                >
                  {img.caption || "Add caption..."}
                </button>
              )}
            </div>
            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
              <button
                onClick={() => handleDelete(img.id)}
                className="w-7 h-7 rounded-full bg-black/60 hover:bg-red-600 flex items-center justify-center text-white transition-colors"
              >
                <Trash2 size={12} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {images.length === 0 && (
        <p className="text-gray-500 text-sm text-center py-12">
          No photos in the gallery yet. Upload or add from existing media.
        </p>
      )}

      <AdminPagination
        page={page}
        totalPages={totalPages}
        onPageChange={setPage}
      />
    </div>
  );
}
