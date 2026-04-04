"use client";

import { useEffect, useState, useRef } from "react";
import {
  collection,
  query,
  orderBy,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
} from "firebase/firestore";
import { getDb } from "@/lib/firebase";
import { Officer } from "@/types";
import { Plus, Pencil, Trash2, X, Search } from "lucide-react";
import MediaPicker from "@/components/MediaPicker";
import AdminPagination from "@/components/AdminPagination";
import Select from "react-select";

const PER_PAGE = 15;

const RANK_OPTIONS = [
  "Chief",
  "Assistant Chief",
  "2nd Assistant Chief",
  "Fire Police Chief",
  "Captain",
  "Lieutenant",
  "Safety Officer",
  "Accountability Officer",
  "President",
  "Vice President",
  "Treasurer",
  "Secretary",
  "Firefighter",
  "Fire Police",
  "Probationary",
  "Junior Firefighter",
  "Administrative",
  "Honorary Member",
];

const rankSelectOptions = RANK_OPTIONS.map((r) => ({ value: r, label: r }));

/** Normalize legacy single-rank data to ranks array */
function getRanks(officer: Officer): string[] {
  if (officer.ranks && officer.ranks.length > 0) return officer.ranks;
  // Legacy: build from old rank/title fields
  const parts: string[] = [];
  if (officer.rank) {
    officer.rank.split(",").forEach((r) => {
      const trimmed = r.trim();
      if (trimmed) parts.push(trimmed);
    });
  }
  if (officer.title) {
    officer.title.split(",").forEach((t) => {
      const trimmed = t.trim();
      if (trimmed && !parts.includes(trimmed)) parts.push(trimmed);
    });
  }
  return parts.length > 0 ? parts : [];
}

const emptyOfficer: Partial<Officer> = {
  name: "",
  ranks: [],
  servingSince: "",
  image: "",
  order: 0,
};

export default function AdminOfficersPage() {
  const [officers, setOfficers] = useState<Officer[]>([]);
  const [editing, setEditing] = useState<Partial<Officer> | null>(null);
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [rankFilter, setRankFilter] = useState("");
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  const handleSearch = (value: string) => {
    setSearchInput(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setSearchQuery(value.toLowerCase().trim());
      setPage(1);
    }, 1500);
  };

  // Get unique ranks from data for filter options
  const availableRanks = [
    ...new Set(officers.flatMap((o) => getRanks(o))),
  ].sort();

  const filtered = officers.filter((o) => {
    const ranks = getRanks(o);
    if (rankFilter && !ranks.includes(rankFilter)) return false;
    if (searchQuery) {
      return (
        o.name.toLowerCase().includes(searchQuery) ||
        ranks.some((r) => r.toLowerCase().includes(searchQuery)) ||
        (o.servingSince || "").includes(searchQuery)
      );
    }
    return true;
  });

  const totalPages = Math.ceil(filtered.length / PER_PAGE);
  const paginated = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  async function fetchOfficers() {
    const q = query(collection(getDb(), "officers"), orderBy("order", "asc"));
    const snap = await getDocs(q);
    setOfficers(snap.docs.map((d) => ({ id: d.id, ...d.data() })) as Officer[]);
    setPage(1);
  }

  useEffect(() => {
    const timer = setTimeout(() => {
      void fetchOfficers();
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  const handleSave = async () => {
    if (!editing) return;
    const data = {
      name: editing.name || "",
      ranks: editing.ranks || [],
      servingSince: editing.servingSince || "",
      image: editing.image || "",
      order: editing.order || 0,
    };

    if (editing.id) {
      await updateDoc(doc(getDb(), "officers", editing.id), data);
    } else {
      await addDoc(collection(getDb(), "officers"), data);
    }
    setEditing(null);
    fetchOfficers();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Remove this member?")) return;
    await deleteDoc(doc(getDb(), "officers", id));
    fetchOfficers();
  };

  const inputClass =
    "w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:border-red-500 focus:outline-none";

  // When editing, normalize legacy data into ranks array
  const editingRanks = editing ? (editing.ranks && editing.ranks.length > 0 ? editing.ranks : getRanks(editing as Officer)) : [];

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <h1 className="text-2xl font-bold text-white">Manage Roster</h1>
        <button
          onClick={() => setEditing({ ...emptyOfficer })}
          className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
        >
          <Plus size={16} /> Add Member
        </button>
      </div>

      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-xl w-full max-w-md max-h-[90vh] overflow-y-auto p-4 sm:p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-white">
                {editing.id ? "Edit Member" : "Add Member"}
              </h2>
              <button onClick={() => setEditing(null)} className="text-gray-400 hover:text-white">
                <X size={20} />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-gray-400 mb-1">Name *</label>
                <input
                  value={editing.name || ""}
                  onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                  placeholder="Last, First"
                  className={inputClass}
                />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Ranks *</label>
                <Select
                  isMulti
                  options={rankSelectOptions}
                  value={editingRanks.map((r) => ({ value: r, label: r }))}
                  onChange={(selected) =>
                    setEditing({ ...editing, ranks: selected ? selected.map((s) => s.value) : [] })
                  }
                  placeholder="Select one or more ranks..."
                  classNames={{
                    control: () => "!bg-gray-800 !border-gray-700 !rounded-lg !min-h-[38px] !shadow-none",
                    menu: () => "!bg-gray-800 !border !border-gray-700 !rounded-lg",
                    option: ({ isFocused, isSelected }) =>
                      `!text-sm ${isSelected ? "!bg-red-600 !text-white" : isFocused ? "!bg-gray-700 !text-white" : "!text-gray-300"}`,
                    multiValue: () => "!bg-red-600/20 !rounded-md",
                    multiValueLabel: () => "!text-red-400 !text-xs",
                    multiValueRemove: () => "!text-red-400 hover:!bg-red-600/30 hover:!text-red-300 !rounded-r-md",
                    input: () => "!text-white !text-sm",
                    placeholder: () => "!text-gray-500 !text-sm",
                    singleValue: () => "!text-white",
                    indicatorSeparator: () => "!bg-gray-700",
                    dropdownIndicator: () => "!text-gray-500",
                    clearIndicator: () => "!text-gray-500 hover:!text-white",
                  }}
                  styles={{
                    control: (base) => ({ ...base, borderColor: undefined }),
                    menuPortal: (base) => ({ ...base, zIndex: 9999 }),
                  }}
                  menuPortalTarget={typeof document !== "undefined" ? document.body : null}
                />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Serving Since</label>
                <input
                  value={editing.servingSince || ""}
                  onChange={(e) => setEditing({ ...editing, servingSince: e.target.value })}
                  placeholder="e.g. 2019"
                  className={inputClass}
                />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Display Order</label>
                <input
                  type="number"
                  value={editing.order ?? ""}
                  onChange={(e) => setEditing({ ...editing, order: e.target.value === "" ? "" as unknown as number : parseInt(e.target.value) })}
                  className={inputClass}
                />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Photo</label>
                <MediaPicker
                  value={editing.image || ""}
                  onSelect={(url) => setEditing({ ...editing, image: url })}
                  folder="officers"
                />
              </div>
              <button
                onClick={handleSave}
                className="bg-red-600 hover:bg-red-700 text-white font-medium px-6 py-2 rounded-lg transition-colors w-full"
              >
                {editing.id ? "Update" : "Add"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Search + Filter */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            type="text"
            value={searchInput}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="Search by name or rank..."
            className="w-full bg-gray-800 border border-gray-700 rounded-lg pl-9 pr-4 py-2 text-white text-sm placeholder-gray-500 focus:border-red-500 focus:outline-none transition-colors"
          />
          {searchQuery && (
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-xs">
              {filtered.length} result{filtered.length !== 1 ? "s" : ""}
            </span>
          )}
        </div>
        <select
          value={rankFilter}
          onChange={(e) => { setRankFilter(e.target.value); setPage(1); }}
          className="w-full sm:w-auto bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:border-red-500 focus:outline-none transition-colors sm:min-w-[160px]"
        >
          <option value="">All Ranks</option>
          {availableRanks.map((rank) => (
            <option key={rank} value={rank}>{rank}</option>
          ))}
        </select>
      </div>

      <div className="space-y-2">
        {paginated.map((officer) => (
          <div
            key={officer.id}
            className="flex items-center justify-between gap-2 bg-gray-900 border border-gray-800 rounded-lg px-3 sm:px-4 py-3"
          >
            <div className="min-w-0">
              <p className="text-white font-medium truncate">{officer.name}</p>
              <p className="text-gray-500 text-xs truncate">
                {getRanks(officer).join(", ") || "No rank assigned"}
                {officer.servingSince && ` · Since ${officer.servingSince}`}
              </p>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <button onClick={() => setEditing({ ...officer, ranks: getRanks(officer) })} className="text-gray-400 hover:text-white p-1">
                <Pencil size={16} />
              </button>
              <button onClick={() => handleDelete(officer.id)} className="text-gray-400 hover:text-red-400 p-1">
                <Trash2 size={16} />
              </button>
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <p className="text-gray-500 text-sm">
            {searchQuery ? `No members matching "${searchQuery}".` : "No members yet."}
          </p>
        )}
      </div>
      <AdminPagination page={page} totalPages={totalPages} onPageChange={setPage} />
    </div>
  );
}
