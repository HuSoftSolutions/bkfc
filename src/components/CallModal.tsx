"use client";

import Image from "next/image";
import { X, MapPin, Clock, Calendar } from "lucide-react";
import { Call } from "@/types";
import { useEffect } from "react";

interface CallModalProps {
  call: Call;
  onClose: () => void;
}

export default function CallModal({ call, onClose }: CallModalProps) {
  // Lock body scroll
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-md p-4"
      onClick={onClose}
    >
      <div
        className="bg-white border border-gray-200 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl shadow-black/10"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close */}
        <div className="sticky top-0 z-10 flex justify-end p-3 bg-white/80 backdrop-blur-sm">
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500 hover:text-gray-900 transition-colors"
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>

        {/* Image */}
        {call.image && (
          <div className="relative w-full h-64 sm:h-80 -mt-6">
            <Image
              src={call.image}
              alt={call.title}
              fill
              className="object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-white to-transparent" />
          </div>
        )}

        {/* Content */}
        <div className="p-6 -mt-8 relative z-10">
          <div className="flex flex-wrap items-center gap-3 mb-3">
            {call.date && (
              <span className="flex items-center gap-1.5 bg-red-50 text-red-700 text-xs font-medium px-3 py-1 rounded-full">
                <Calendar size={12} /> {call.date}
              </span>
            )}
            {call.time && (
              <span className="flex items-center gap-1.5 bg-gray-100 text-gray-500 text-xs font-medium px-3 py-1 rounded-full">
                <Clock size={12} /> {call.time}
              </span>
            )}
          </div>

          <h2 className="text-2xl font-bold text-gray-900 mb-2">{call.title}</h2>

          {call.location && (
            <div className="flex items-center gap-1.5 text-gray-400 text-sm mb-6">
              <MapPin size={14} />
              <span>{call.location}</span>
            </div>
          )}

          <div className="text-gray-600 text-sm leading-relaxed whitespace-pre-wrap">
            {call.description}
          </div>
        </div>
      </div>
    </div>
  );
}
