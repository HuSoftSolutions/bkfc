"use client";

import { useEffect, useState } from "react";
import { getAppAuth } from "@/lib/firebase";
import { Plus, Trash2, X, Shield } from "lucide-react";

interface AdminUser {
  uid: string;
  email: string;
  displayName: string;
  disabled: boolean;
  createdAt: string;
  lastSignIn: string;
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ email: "", password: "", displayName: "" });
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const currentUid = getAppAuth().currentUser?.uid;

  async function fetchUsers() {
    try {
      const res = await fetch("/api/admin/users");
      const data = await res.json();
      if (data.users) setUsers(data.users);
    } catch {
      console.error("Failed to fetch users");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleCreate = async () => {
    setError("");
    if (!form.email || !form.password) {
      setError("Email and password are required.");
      return;
    }
    if (form.password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to create user.");
        return;
      }
      setShowCreate(false);
      setForm({ email: "", password: "", displayName: "" });
      fetchUsers();
    } catch {
      setError("Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (uid: string) => {
    if (!confirm("Delete this admin account? They will no longer be able to sign in.")) return;

    try {
      const res = await fetch("/api/admin/users", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ uid }),
      });
      if (res.ok) fetchUsers();
    } catch {
      console.error("Failed to delete user");
    }
  };

  const inputClass =
    "w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:border-red-500 focus:outline-none";

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <h1 className="text-2xl font-bold text-white">Site Admins</h1>
        <button
          onClick={() => {
            setShowCreate(true);
            setError("");
            setForm({ email: "", password: "", displayName: "" });
          }}
          className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
        >
          <Plus size={16} /> Add Admin
        </button>
      </div>

      {/* Create modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-xl w-full max-w-md p-4 sm:p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-white">Create Admin Account</h2>
              <button onClick={() => setShowCreate(false)} className="text-gray-400 hover:text-white">
                <X size={20} />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-gray-400 mb-1">Name</label>
                <input
                  value={form.displayName}
                  onChange={(e) => setForm({ ...form, displayName: e.target.value })}
                  placeholder="Full name"
                  className={inputClass}
                />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Email *</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="admin@example.com"
                  className={inputClass}
                />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Password *</label>
                <input
                  type="password"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  placeholder="Min. 6 characters"
                  className={inputClass}
                />
              </div>
              {error && <p className="text-red-400 text-sm">{error}</p>}
              <button
                onClick={handleCreate}
                disabled={submitting}
                className="bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-medium px-6 py-2 rounded-lg transition-colors w-full"
              >
                {submitting ? "Creating..." : "Create Account"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Users list */}
      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-gray-900 border border-gray-800 rounded-lg px-4 py-3 animate-pulse">
              <div className="h-4 bg-gray-800 rounded w-48 mb-2" />
              <div className="h-3 bg-gray-800 rounded w-32" />
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {users.map((user) => (
            <div
              key={user.uid}
              className="flex items-center justify-between gap-2 bg-gray-900 border border-gray-800 rounded-lg px-3 sm:px-4 py-3"
            >
              <div className="min-w-0 flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-gray-800 flex items-center justify-center shrink-0">
                  <Shield size={14} className="text-gray-400" />
                </div>
                <div className="min-w-0">
                  <p className="text-white font-medium text-sm truncate">
                    {user.displayName || user.email}
                    {user.uid === currentUid && (
                      <span className="text-xs text-gray-500 ml-2">(you)</span>
                    )}
                  </p>
                  <p className="text-gray-500 text-xs truncate">
                    {user.displayName ? user.email : ""}
                    {user.lastSignIn && (
                      <span>
                        {user.displayName ? " · " : ""}
                        Last sign in: {new Date(user.lastSignIn).toLocaleDateString()}
                      </span>
                    )}
                  </p>
                </div>
              </div>
              {user.uid !== currentUid && (
                <button
                  onClick={() => handleDelete(user.uid)}
                  className="text-gray-400 hover:text-red-400 p-1 shrink-0"
                >
                  <Trash2 size={16} />
                </button>
              )}
            </div>
          ))}
          {users.length === 0 && (
            <p className="text-gray-500 text-sm">No admin accounts found.</p>
          )}
        </div>
      )}
    </div>
  );
}
