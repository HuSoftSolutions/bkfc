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
  where,
  updateDoc,
} from "firebase/firestore";
import { getDb } from "@/lib/firebase";
import { Call } from "@/types";
import Link from "next/link";
import { Siren, XCircle, Send, Clock, MapPin, FileText, Eye, Pencil } from "lucide-react";

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
  rawPayload: string;
  createdAt: string;
}

export default function AdminActiveCallPage() {
  const [call, setCall] = useState<ActiveCall | null>(null);
  const [logs, setLogs] = useState<IarLog[]>([]);
  const [pendingCalls, setPendingCalls] = useState<Call[]>([]);
  const [testForm, setTestForm] = useState({
    callType: "",
    address: "",
    message: "",
  });
  const [sending, setSending] = useState(false);
  const [expandedLog, setExpandedLog] = useState<string | null>(null);

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

  // Fetch recent logs and pending calls
  useEffect(() => {
    async function fetchData() {
      try {
        const [logsSnap, pendingSnap] = await Promise.all([
          getDocs(query(collection(getDb(), "iarLogs"), orderBy("createdAt", "desc"), limit(20))),
          getDocs(query(collection(getDb(), "calls"), where("source", "==", "iar"), orderBy("date", "desc"), limit(20))),
        ]);
        setLogs(logsSnap.docs.map((d) => ({ id: d.id, ...d.data() })) as IarLog[]);
        setPendingCalls(pendingSnap.docs.map((d) => ({ id: d.id, ...d.data() })) as Call[]);
      } catch {
        // ok
      }
    }
    fetchData();
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

      {/* Pending / recent IAR calls */}
      <div className="mt-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-white font-semibold">IAR Calls</h3>
          <Link
            href="/admin/call-config"
            className="text-red-400 hover:text-red-300 text-sm font-medium"
          >
            Configure Dispatch Settings
          </Link>
        </div>
        <div className="space-y-2">
          {pendingCalls.map((c) => {
            const now = new Date().toISOString();
            const isPending = c.releaseAt && c.releaseAt > now;
            return (
              <div
                key={c.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-gray-900 border border-gray-800 rounded-lg px-3 sm:px-4 py-3"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span
                    className={`text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase ${
                      isPending
                        ? "bg-yellow-900/50 text-yellow-400"
                        : "bg-green-900/50 text-green-400"
                    }`}
                  >
                    {isPending ? "Pending" : "Published"}
                  </span>
                  <div>
                    <p className="text-white font-medium text-sm">{c.title}</p>
                    <p className="text-gray-500 text-xs">
                      {c.date} {c.time && `• ${c.time}`} {c.location && `• ${c.location}`}
                      {isPending && c.releaseAt && (
                        <span className="text-yellow-400 ml-2">
                          Releases {new Date(c.releaseAt).toLocaleTimeString()}
                        </span>
                      )}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                  {isPending && (
                    <button
                      onClick={async () => {
                        await updateDoc(doc(getDb(), "calls", c.id), {
                          releaseAt: new Date().toISOString(),
                        });
                        // Refresh
                        const snap = await getDocs(query(collection(getDb(), "calls"), where("source", "==", "iar"), orderBy("date", "desc"), limit(20)));
                        setPendingCalls(snap.docs.map((d) => ({ id: d.id, ...d.data() })) as Call[]);
                      }}
                      className="flex items-center gap-1 bg-green-700 hover:bg-green-600 text-white text-xs font-medium px-3 py-1.5 rounded-lg transition-colors"
                    >
                      <Eye size={12} /> Publish Now
                    </button>
                  )}
                  <Link
                    href={`/admin/calls`}
                    className="text-gray-400 hover:text-white p-1"
                  >
                    <Pencil size={14} />
                  </Link>
                </div>
              </div>
            );
          })}
          {pendingCalls.length === 0 && (
            <p className="text-gray-500 text-sm text-center py-4">
              No IAR calls received yet.
            </p>
          )}
        </div>
      </div>

      {/* Recent webhook logs */}
      <div className="mt-6">
        <h3 className="text-white font-semibold mb-4">Recent Dispatch Logs</h3>
        <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-x-auto">
          {logs.length === 0 ? (
            <p className="text-gray-500 text-sm p-6 text-center">
              No dispatch logs yet. Logs appear here when the webhook receives
              data from IamResponding.
            </p>
          ) : (
            <table className="w-full text-sm min-w-[600px]">
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
                    className="border-b border-gray-800/50 hover:bg-gray-800/30 cursor-pointer"
                    onClick={() => setExpandedLog(expandedLog === log.id ? null : log.id)}
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
                    <td className="px-4 py-3 text-gray-400 max-w-xs">
                      {expandedLog === log.id ? (
                        <div>
                          <p className="mb-2">{log.message || "—"}</p>
                          <div className="bg-gray-800 rounded p-2 mt-2">
                            <p className="text-gray-500 text-[10px] uppercase tracking-wider mb-1">Raw Payload</p>
                            <pre className="text-green-400 text-xs whitespace-pre-wrap break-all font-mono">
                              {(() => { try { return JSON.stringify(JSON.parse(log.rawPayload), null, 2); } catch { return log.rawPayload || "—"; } })()}
                            </pre>
                          </div>
                        </div>
                      ) : (
                        <span className="truncate block">{log.message || "—"}</span>
                      )}
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
