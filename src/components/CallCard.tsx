"use client";

import Image from "next/image";
import Link from "next/link";
import { Call } from "@/types";
import { MapPin, ArrowUpRight, Pin } from "lucide-react";
import PlaceholderImage from "@/components/PlaceholderImage";

interface CallCardProps {
  call: Call;
}

export default function CallCard({ call }: CallCardProps) {
  const truncated =
    call.description.length > 120
      ? call.description.substring(0, 120) + "..."
      : call.description;

  return (
    <Link
      href={`/calls/${call.slug || call.id}`}
      className="bg-white border border-gray-200 rounded-2xl overflow-hidden hover:border-red-300 hover:shadow-md transition-all w-full group duration-300"
    >
      <div className="relative w-full h-48 overflow-hidden">
        {call.image ? (
          <Image src={call.image} alt={call.title} fill className="object-cover" />
        ) : (
          <PlaceholderImage variant="call" className="h-48" />
        )}
        <div className="absolute bottom-3 left-3">
          <span className="bg-red-600 text-white text-[10px] font-semibold px-2.5 py-1 rounded-full uppercase tracking-wider">
            {call.date} {!call.image && call.time ? `\u00B7 ${call.time}` : ""}
          </span>
        </div>
        {call.pinned && (
          <div className="absolute top-3 right-3 bg-yellow-500 rounded-full p-1 shadow">
            <Pin size={12} className="text-white rotate-45" />
          </div>
        )}
      </div>
      <div className="p-5">
        <h3 className="text-gray-900 font-bold text-lg mb-2 group-hover:text-red-700 transition-colors leading-snug">
          {call.title}
        </h3>
        {call.location && (
          <div className="flex items-center gap-1.5 text-gray-400 text-xs mb-3">
            <MapPin size={12} />
            <span>{call.location}</span>
          </div>
        )}
        <p className="text-gray-500 text-sm leading-relaxed">{truncated}</p>
        <div className="mt-4 flex items-center gap-1 text-red-600 text-sm font-medium whitespace-nowrap">
          Read More <ArrowUpRight size={14} />
        </div>
      </div>
    </Link>
  );
}
