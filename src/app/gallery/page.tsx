"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import {
  collection,
  query,
  orderBy,
  getDocs,
} from "firebase/firestore";
import { getDb } from "@/lib/firebase";
import { GalleryImage } from "@/types";
import Hero from "@/components/Hero";
import { X } from "lucide-react";

const PER_PAGE = 12;

export default function GalleryPage() {
  const [images, setImages] = useState<GalleryImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [visibleCount, setVisibleCount] = useState(PER_PAGE);
  const [lightbox, setLightbox] = useState<GalleryImage | null>(null);
  const loaderRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function fetchImages() {
      try {
        const q = query(
          collection(getDb(), "gallery"),
          orderBy("order", "asc")
        );
        const snapshot = await getDocs(q);
        setImages(
          snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          })) as GalleryImage[]
        );
      } catch (err) {
        console.error("Error fetching gallery:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchImages();
  }, []);

  // Infinite scroll observer
  const handleObserver = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      const target = entries[0];
      if (target.isIntersecting && visibleCount < images.length) {
        setVisibleCount((prev) => Math.min(prev + PER_PAGE, images.length));
      }
    },
    [visibleCount, images.length]
  );

  useEffect(() => {
    const observer = new IntersectionObserver(handleObserver, {
      rootMargin: "200px",
    });
    if (loaderRef.current) observer.observe(loaderRef.current);
    return () => observer.disconnect();
  }, [handleObserver]);

  // Lock body scroll when lightbox open
  useEffect(() => {
    if (lightbox) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [lightbox]);

  const visible = images.slice(0, visibleCount);

  return (
    <>
      <Hero title="Gallery" subtitle="Photos from our department and community" />

      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
        {loading ? (
          <div className="columns-2 sm:columns-3 lg:columns-4 gap-4">
            {[...Array(8)].map((_, i) => (
              <div
                key={i}
                className="bg-gray-100 rounded-xl mb-4 animate-pulse"
                style={{ height: `${200 + (i % 3) * 80}px` }}
              />
            ))}
          </div>
        ) : images.length === 0 ? (
          <p className="text-gray-500 text-center py-12">
            No photos to display yet.
          </p>
        ) : (
          <>
            {/* Masonry layout using CSS columns */}
            <div className="columns-2 sm:columns-3 lg:columns-4 gap-4">
              {visible.map((img) => (
                <button
                  key={img.id}
                  onClick={() => setLightbox(img)}
                  className="block w-full mb-4 break-inside-avoid group cursor-pointer"
                >
                  <div className="relative rounded-xl overflow-hidden bg-gray-100">
                    <img
                      src={img.url}
                      alt={img.caption || "Gallery photo"}
                      className="w-full h-auto block"
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-300" />
                    {img.caption && (
                      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent p-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                        <p className="text-white text-sm">{img.caption}</p>
                      </div>
                    )}
                  </div>
                </button>
              ))}
            </div>

            {/* Infinite scroll trigger */}
            {visibleCount < images.length && (
              <div ref={loaderRef} className="flex justify-center py-8">
                <div className="w-8 h-8 border-2 border-gray-300 border-t-red-600 rounded-full animate-spin" />
              </div>
            )}

            {visibleCount >= images.length && images.length > PER_PAGE && (
              <p className="text-gray-400 text-sm text-center py-8">
                All {images.length} photos loaded
              </p>
            )}
          </>
        )}
      </section>

      {/* Lightbox */}
      {lightbox && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={() => setLightbox(null)}
        >
          <button
            onClick={() => setLightbox(null)}
            className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors z-10"
          >
            <X size={20} />
          </button>
          <div
            className="max-w-5xl max-h-[90vh] relative"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={lightbox.url}
              alt={lightbox.caption || "Gallery photo"}
              className="max-w-full max-h-[85vh] object-contain rounded-lg"
            />
            {lightbox.caption && (
              <p className="text-white text-center text-sm mt-3">
                {lightbox.caption}
              </p>
            )}
          </div>
        </div>
      )}
    </>
  );
}
