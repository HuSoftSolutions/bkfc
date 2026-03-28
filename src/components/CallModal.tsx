"use client";

import Image from "next/image";
import { X } from "lucide-react";
import { Call } from "@/types";

interface CallModalProps {
  call: Call;
  onClose: () => void;
}

export default function CallModal({ call, onClose }: CallModalProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="bg-gray-900 border border-gray-700 rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close */}
        <div className="flex justify-end p-3">
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
            aria-label="Close"
          >
            <X size={24} />
          </button>
        </div>

        {/* Image */}
        {call.image && (
          <div className="relative w-full h-64 sm:h-80">
            <Image
              src={call.image}
              alt={call.title}
              fill
              className="object-cover"
            />
          </div>
        )}

        {/* Content */}
        <div className="p-6">
          <p className="text-xs text-red-400 font-medium mb-1">
            {call.date} {call.time && `• ${call.time}`}
          </p>
          <h2 className="text-2xl font-bold text-white mb-1">{call.title}</h2>
          {call.location && (
            <p className="text-sm text-gray-500 mb-4">{call.location}</p>
          )}
          <div className="text-gray-300 text-sm leading-relaxed whitespace-pre-wrap">
            {call.description}
          </div>
        </div>
      </div>
    </div>
  );
}
