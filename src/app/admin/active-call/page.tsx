"use client";

import { useEffect, useState } from "react";
import {
  doc,
  onSnapshot,
  collection,
  query,
  orderBy,
  limit,
  getDocs,
} from "firebase/firestore";
import { getDb } from "@/lib/firebase";
import { Siren, XCircle, Send, Clock, MapPin, FileText } from "lucide-react";

interface ActiveCall {
  active: boolean;
  callType: string;
  address: string;
  message: string;
  dispatchedAt: string;
  expiresAt: string;
}

interface IarLog {
  id: string;
  callType: string;
  address: string;
  message: string;
  createdAt: string;
}

export default function AdminActiveCallPage() {
  const [call, setCall] = useState<ActiveCall | null>(null);
  const [logs, setLogs] = useState<IarLog[]>([]);
  const [testForm, setTestForm] = useState({
    callType: "",
    address: "",
    message: "",
  });
  const [sending, setSending] = useState(false);

  // Real-time listener
  useEffect(() => {
    const unsubscribe = onSnapshot(
      doc(getDb(), "settings", "activeCall"),
      (snap) => {
        if (snap.exists()) {
          setCall(snap.data() as ActiveCall);
        }
      }
    );
    return () => unsubscribe();
  }, []);

  // Fetch recent logs
  useEffect(() => {
    async function fetchLogs() {
      try {
        const q = query(
          collection(getDb(), "iarLogs"),
          orderBy("createdAt", "desc"),
          limit(20)
        );
        const snap = await getDocs(q);
        setLogs(
          snap.docs.map((d) => ({ id: d.id, ...d.data() })) as IarLog[]
        );
      } catch {
        // ok
      }
    }
    fetchLogs();
  }, [call]);

  const handleClear = async () => {
    await fetch("/api/iar/clear", { method: "POST" });
  };

  const handleTest = async () => {
    setSending(true);
    await fetch("/api/iar/webhook", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        callType: testForm.callType || "Test Call",
        address: testForm.address || "123 Test Street",
        message: testForm.message || "This is a test dispatch.",
      }),
    });
    setTestForm({ callType: "", address: "", message: "" });
    setSending(false);
  };

  const isActive =
    call?.active && call.expiresAt && new Date(call.expiresAt) > new Date();

  const inputClass =
    "w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:border-red-500 focus:outline-none";

  const webhookUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/api/iar/webhook`
      : "/api/iar/webhook";

  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
        <Siren size={24} className="text-red-400" />
        Active Call Status
      </h1>

      {/* Current status */}
      <div
        className={`border rounded-xl p-6 mb-6 ${
          isActive
            ? "bg-red-900/30 border-red-700"
            : "bg-gray-900 border-gray-800"
        }`}
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Siren
              size={24}
              className={isActive ? "text-red-400 animate-pulse" : "text-gray-600"}
            />
            <div>
              <p className="text-white font-bold text-lg">
                {isActive ? "ACTIVE CALL" : "No Active Calls"}
              </p>
              {isActive && call && (
                <p className="text-gray-400 text-sm">
                  Dispatched{" "}
                  {new Date(call.dispatchedAt).toLocaleString()}
                </p>
              )}
            </div>
          </div>
          {isActive && (
            <button
              onClick={handleClear}
              className="flex items-center gap-2 bg-gray-700 hover:bg-gray-600 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
            >
              <XCircle size={16} /> Clear
            </button>
          )}
        </div>

        {isActive && call && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
            {call.callType && (
              <div className="flex items-center gap-2 text-gray-300">
                <FileText size={14} className="text-red-400" />
                <div>
                  <p className="text-gray-500 text-xs">Type</p>
                  <p>{call.callType}</p>
                </div>
              </div>
            )}
            {call.address && (
              <div className="flex items-center gap-2 text-gray-300">
                <MapPin size={14} className="text-red-400" />
                <div>
                  <p className="text-gray-500 text-xs">Address</p>
                  <p>{call.address}</p>
                </div>
              </div>
            )}
            {call.expiresAt && (
              <div className="flex items-center gap-2 text-gray-300">
                <Clock size={14} className="text-red-400" />
                <div>
                  <p className="text-gray-500 text-xs">Auto-clears</p>
                  <p>{new Date(call.expiresAt).toLocaleTimeString()}</p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Webhook setup info */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
          <h3 className="text-white font-semibold mb-4">
            IamResponding Webhook Setup
          </h3>
          <p className="text-gray-400 text-sm mb-4">
            Configure this URL as the Universal HTTPS POST endpoint in your
            IamResponding admin panel under External Integrations.
          </p>
          <div className="bg-gray-800 rounded-lg p-3 mb-4">
            <code className="text-green-400 text-xs break-all">
              {webhookUrl}
            </code>
          </div>
          <p className="text-gray-500 text-xs">
            When IAR dispatches a call, it will POST to this endpoint and the
            &quot;Currently Responding&quot; banner will appear on the public
            site. It auto-clears after 60 minutes.
          </p>
        </div>

        {/* Test / manual trigger */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
          <h3 className="text-white font-semibold mb-4">
            Test / Manual Trigger
          </h3>
          <div className="space-y-3">
            <div>
              <label className="block text-xs text-gray-400 mb-1">
                Call Type
              </label>
              <input
                value={testForm.callType}
                onChange={(e) =>
                  setTestForm({ ...testForm, callType: e.target.value })
                }
                placeholder="e.g. Structure Fire"
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">
                Address
              </label>
              <input
                value={testForm.address}
                onChange={(e) =>
                  setTestForm({ ...testForm, address: e.target.value })
                }
                placeholder="e.g. 14 Pine St, Broadalbin"
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">
                Message
              </label>
              <input
                value={testForm.message}
                onChange={(e) =>
                  setTestForm({ ...testForm, message: e.target.value })
                }
                placeholder="Optional details"
                className={inputClass}
              />
            </div>
            <button
              onClick={handleTest}
              disabled={sending}
              className="flex items-center gap-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors w-full justify-center"
            >
              <Send size={16} />
              {sending ? "Sending..." : "Trigger Test Call"}
            </button>
          </div>
        </div>
      </div>

      {/* Recent webhook logs */}
      <div className="mt-6">
        <h3 className="text-white font-semibold mb-4">Recent Dispatch Logs</h3>
        <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
          {logs.length === 0 ? (
            <p className="text-gray-500 text-sm p-6 text-center">
              No dispatch logs yet. Logs appear here when the webhook receives
              data from IamResponding.
            </p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-800 text-gray-500 text-xs uppercase tracking-wider">
                  <th className="text-left px-4 py-3">Time</th>
                  <th className="text-left px-4 py-3">Type</th>
                  <th className="text-left px-4 py-3">Address</th>
                  <th className="text-left px-4 py-3">Message</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr
                    key={log.id}
                    className="border-b border-gray-800/50 hover:bg-gray-800/30"
                  >
                    <td className="px-4 py-3 text-gray-400 whitespace-nowrap">
                      {new Date(log.createdAt).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-white">
                      {log.callType || "—"}
                    </td>
                    <td className="px-4 py-3 text-gray-300">
                      {log.address || "—"}
                    </td>
                    <td className="px-4 py-3 text-gray-400 max-w-xs truncate">
                      {log.message || "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
