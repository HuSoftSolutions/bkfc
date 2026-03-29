"use client";

import { useEffect, useState, useCallback } from "react";
import { ref, uploadBytes, getDownloadURL, listAll } from "firebase/storage";
import { getAppStorage } from "@/lib/firebase";
import { ImagePlus, X, Upload, Check } from "lucide-react";
import Image from "next/image";

interface MediaPickerProps {
  value?: string;
  onSelect: (url: string) => void;
  folder?: string;
}

interface MediaItem {
  url: string;
  name: string;
  path: string;
}

export default function MediaPicker({
  value,
  onSelect,
  folder = "uploads",
}: MediaPickerProps) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [tab, setTab] = useState<"library" | "upload">("library");

  const fetchMedia = useCallback(async () => {
    setLoading(true);
    try {
      const storage = getAppStorage();
      const folders = ["uploads", "calls", "news", "apparatus", "officers", "hero"];
      const allItems: MediaItem[] = [];

      await Promise.all(
        folders.map(async (f) => {
          try {
            const listRef = ref(storage, f);
            const result = await listAll(listRef);
            const urls = await Promise.all(
              result.items.map(async (itemRef) => {
                const url = await getDownloadURL(itemRef);
                return {
                  url,
                  name: itemRef.name,
                  path: itemRef.fullPath,
                };
              })
            );
            allItems.push(...urls);
          } catch {
            // folder may not exist yet
          }
        })
      );

      // Sort newest first by name (timestamps in filenames)
      allItems.sort((a, b) => b.name.localeCompare(a.name));
      setItems(allItems);
    } catch (err) {
      console.error("Error loading media:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) fetchMedia();
  }, [open, fetchMedia]);

  const handleUpload = async (file: File) => {
    setUploading(true);
    try {
      const storage = getAppStorage();
      const storageRef = ref(storage, `${folder}/${Date.now()}_${file.name}`);
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);
      onSelect(url);
      setOpen(false);
    } catch (err) {
      console.error("Upload error:", err);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div>
      {/* Preview / trigger */}
      <div className="flex items-center gap-3">
        {value ? (
          <div className="relative group">
            <img
              src={value}
              alt="Selected"
              className="h-20 w-32 object-cover rounded-lg border border-gray-700"
            />
            <button
              onClick={() => onSelect("")}
              className="absolute -top-2 -right-2 bg-red-600 rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <X size={12} className="text-white" />
            </button>
          </div>
        ) : null}
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex items-center gap-2 bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-300 text-sm px-4 py-2 rounded-lg transition-colors"
        >
          <ImagePlus size={16} />
          {value ? "Change Image" : "Select Image"}
        </button>
      </div>

      {/* Modal */}
      {open && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="bg-gray-900 border border-gray-700 rounded-xl w-full max-w-3xl max-h-[80vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-800">
              <h3 className="text-white font-semibold text-lg">Media Library</h3>
              <button
                onClick={() => setOpen(false)}
                className="text-gray-400 hover:text-white"
              >
                <X size={20} />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-gray-800">
              <button
                onClick={() => setTab("library")}
                className={`px-4 py-2.5 text-sm font-medium transition-colors ${
                  tab === "library"
                    ? "text-red-400 border-b-2 border-red-400"
                    : "text-gray-400 hover:text-white"
                }`}
              >
                Library
              </button>
              <button
                onClick={() => setTab("upload")}
                className={`px-4 py-2.5 text-sm font-medium transition-colors ${
                  tab === "upload"
                    ? "text-red-400 border-b-2 border-red-400"
                    : "text-gray-400 hover:text-white"
                }`}
              >
                Upload New
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4">
              {tab === "upload" ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <label className="flex flex-col items-center gap-3 cursor-pointer bg-gray-800 hover:bg-gray-750 border-2 border-dashed border-gray-600 hover:border-red-500/50 rounded-xl p-8 transition-colors w-full max-w-sm">
                    <Upload size={32} className="text-gray-400" />
                    <span className="text-gray-300 text-sm font-medium">
                      {uploading ? "Uploading..." : "Click to upload an image"}
                    </span>
                    <span className="text-gray-500 text-xs">
                      JPG, PNG, GIF, WebP
                    </span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      disabled={uploading}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleUpload(file);
                      }}
                    />
                  </label>
                </div>
              ) : loading ? (
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
                  {[...Array(10)].map((_, i) => (
                    <div
                      key={i}
                      className="aspect-square bg-gray-800 rounded-lg animate-pulse"
                    />
                  ))}
                </div>
              ) : items.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-gray-400 mb-2">No images yet</p>
                  <button
                    onClick={() => setTab("upload")}
                    className="text-red-400 text-sm hover:underline"
                  >
                    Upload your first image
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
                  {items.map((item) => {
                    const isSelected = value === item.url;
                    return (
                      <button
                        key={item.path}
                        onClick={() => {
                          onSelect(item.url);
                          setOpen(false);
                        }}
                        className={`relative aspect-square rounded-lg overflow-hidden border-2 transition-all group ${
                          isSelected
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
                        {isSelected && (
                          <div className="absolute inset-0 bg-red-500/20 flex items-center justify-center">
                            <Check
                              size={24}
                              className="text-white drop-shadow-lg"
                            />
                          </div>
                        )}
                        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          <p className="text-white text-[10px] truncate">
                            {item.name}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
