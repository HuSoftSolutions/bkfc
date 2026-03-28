"use client";

import Image from "next/image";
import { Call } from "@/types";

interface CallCardProps {
  call: Call;
  onSelect: (call: Call) => void;
}

export default function CallCard({ call, onSelect }: CallCardProps) {
  const truncated =
    call.description.length > 100
      ? call.description.substring(0, 100) + "…"
      : call.description;

  return (
    <button
      onClick={() => onSelect(call)}
      className="bg-gray-900 border border-gray-800 rounded-lg overflow-hidden hover:border-red-600/50 transition-all text-left w-full group"
    >
      {call.image && (
        <div className="relative w-full h-48 overflow-hidden">
          <Image
            src={call.image}
            alt={call.title}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-300"
          />
        </div>
      )}
      <div className="p-4">
        <p className="text-xs text-red-400 font-medium mb-1">
          {call.date} {call.time && `• ${call.time}`}
        </p>
        <h3 className="text-white font-semibold text-lg mb-2">{call.title}</h3>
        <p className="text-gray-400 text-sm leading-relaxed">{truncated}</p>
        <span className="inline-block mt-3 text-red-500 text-sm font-medium group-hover:underline">
          Read More
        </span>
      </div>
    </button>
  );
}
