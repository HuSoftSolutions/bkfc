"use client";

import { useEffect, useState } from "react";
import {
  collection,
  query,
  orderBy,
  getDocs,
  updateDoc,
  deleteDoc,
  doc,
} from "firebase/firestore";
import { getDb } from "@/lib/firebase";
import { Trash2, Mail, MailOpen } from "lucide-react";
import AdminPagination from "@/components/AdminPagination";

const PER_PAGE = 15;

interface ContactMessage {
  id: string;
  name: string;
  email: string;
  phone: string;
  message: string;
  createdAt: string;
  read: boolean;
}

export default function AdminMessagesPage() {
  const [messages, setMessages] = useState<ContactMessage[]>([]);
  const [selected, setSelected] = useState<ContactMessage | null>(null);
  const [page, setPage] = useState(1);

  const totalPages = Math.ceil(messages.length / PER_PAGE);
  const paginated = messages.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  async function fetchMessages() {
    const q = query(collection(getDb(), "contactSubmissions"), orderBy("createdAt", "desc"));
    const snap = await getDocs(q);
    setMessages(snap.docs.map((d) => ({ id: d.id, ...d.data() })) as ContactMessage[]);
    setPage(1);
  }

  useEffect(() => {
    const timer = setTimeout(() => {
      void fetchMessages();
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  const markRead = async (msg: ContactMessage) => {
    await updateDoc(doc(getDb(), "contactSubmissions", msg.id), { read: true });
    setSelected(msg);
    fetchMessages();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this message?")) return;
    await deleteDoc(doc(getDb(), "contactSubmissions", id));
    if (selected?.id === id) setSelected(null);
    fetchMessages();
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-6">Contact Messages</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* List */}
        <div className="space-y-2">
          {paginated.map((msg) => (
            <div
              key={msg.id}
              onClick={() => markRead(msg)}
              className={`w-full text-left bg-gray-900 border rounded-lg px-4 py-3 transition-colors cursor-pointer ${
                selected?.id === msg.id
                  ? "border-red-600"
                  : msg.read
                  ? "border-gray-800"
                  : "border-yellow-600/50"
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {msg.read ? (
                    <MailOpen size={14} className="text-gray-500" />
                  ) : (
                    <Mail size={14} className="text-yellow-400" />
                  )}
                  <span className={`font-medium text-sm ${msg.read ? "text-gray-400" : "text-white"}`}>
                    {msg.name}
                  </span>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(msg.id);
                  }}
                  className="text-gray-500 hover:text-red-400 p-1"
                >
                  <Trash2 size={14} />
                </button>
              </div>
              <p className="text-gray-500 text-xs mt-1">{msg.email}</p>
              <p className="text-gray-500 text-xs">
                {new Date(msg.createdAt).toLocaleDateString()}
              </p>
            </div>
          ))}
          {messages.length === 0 && (
            <p className="text-gray-500 text-sm">No messages yet.</p>
          )}
          <AdminPagination page={page} totalPages={totalPages} onPageChange={setPage} />
        </div>

        {/* Detail */}
        {selected && (
          <div className="bg-gray-900 border border-gray-800 rounded-lg p-5">
            <h3 className="text-white font-semibold text-lg mb-1">{selected.name}</h3>
            <p className="text-gray-400 text-sm">{selected.email}</p>
            {selected.phone && (
              <p className="text-gray-400 text-sm">{selected.phone}</p>
            )}
            <p className="text-gray-500 text-xs mt-1">
              {new Date(selected.createdAt).toLocaleString()}
            </p>
            <div className="mt-4 text-gray-300 text-sm leading-relaxed whitespace-pre-wrap">
              {selected.message}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
