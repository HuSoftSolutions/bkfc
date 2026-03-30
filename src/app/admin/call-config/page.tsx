"use client";

import { useEffect, useState } from "react";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { getDb } from "@/lib/firebase";
import { Settings, Check, Plus, Trash2, ImageIcon } from "lucide-react";
import MediaPicker from "@/components/MediaPicker";

interface TypeMapping {
  key: string;
  label: string;
  image: string;
}

export default function CallConfigPage() {
  const [delayMinutes, setDelayMinutes] = useState(60);
  const [bannerText, setBannerText] = useState("Units Currently Responding");
  const [autoPublish, setAutoPublish] = useState(true);
  const [mappings, setMappings] = useState<TypeMapping[]>([]);
  const [defaultImage, setDefaultImage] = useState("");
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const snap = await getDoc(doc(getDb(), "settings", "callConfig"));
        if (snap.exists()) {
          const data = snap.data();
          setDelayMinutes(data.delayMinutes ?? 60);
          setBannerText(data.bannerText || "Units Currently Responding");
          setAutoPublish(data.autoPublish ?? true);
          setDefaultImage(data.typeImageMap?.default || "");

          // Convert typeImageMap object to array for editing
          const map = data.typeImageMap || {};
          const entries: TypeMapping[] = [];
          for (const [key, url] of Object.entries(map)) {
            if (key !== "default") {
              entries.push({ key, label: key, image: url as string });
            }
          }
          setMappings(entries);
        }
      } catch {
        // defaults
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const handleSave = async () => {
    setStatus("saving");
    try {
      // Convert mappings array back to object
      const typeImageMap: Record<string, string> = {};
      if (defaultImage) typeImageMap.default = defaultImage;
      for (const m of mappings) {
        if (m.key.trim() && m.image) {
          typeImageMap[m.key.trim()] = m.image;
        }
      }

      await setDoc(doc(getDb(), "settings", "callConfig"), {
        delayMinutes,
        bannerText,
        autoPublish,
        typeImageMap,
        updatedAt: new Date().toISOString(),
      });

      setStatus("saved");
      setTimeout(() => setStatus("idle"), 2000);
    } catch {
      setStatus("error");
    }
  };

  const addMapping = () => {
    setMappings([...mappings, { key: "", label: "", image: "" }]);
  };

  const updateMapping = (idx: number, field: keyof TypeMapping, value: string) => {
    setMappings((prev) =>
      prev.map((m, i) => (i === idx ? { ...m, [field]: value } : m))
    );
  };

  const removeMapping = (idx: number) => {
    setMappings((prev) => prev.filter((_, i) => i !== idx));
  };

  const inputClass =
    "w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:border-red-500 focus:outline-none";

  if (loading) return <div className="text-gray-400">Loading...</div>;

  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
        <Settings size={24} />
        Call Dispatch Configuration
      </h1>

      <div className="max-w-2xl space-y-6">
        {/* General settings */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
          <h2 className="text-lg font-semibold text-white mb-4">
            Delayed Disclosure
          </h2>
          <p className="text-gray-400 text-sm mb-4">
            When a dispatch is received from IamResponding, the public sees only
            a generic &quot;responding&quot; banner. Full call details are released
            after the configured delay.
          </p>

          <div className="space-y-4">
            <div>
              <label className="block text-xs text-gray-400 mb-1">
                Disclosure Delay (minutes)
              </label>
              <input
                type="number"
                min={0}
                value={delayMinutes}
                onChange={(e) => setDelayMinutes(parseInt(e.target.value) || 0)}
                className={inputClass}
              />
              <p className="text-gray-500 text-xs mt-1">
                How long before full call details are visible to the public.
                Set to 0 for immediate disclosure.
              </p>
            </div>

            <div>
              <label className="block text-xs text-gray-400 mb-1">
                Public Banner Text
              </label>
              <input
                value={bannerText}
                onChange={(e) => setBannerText(e.target.value)}
                placeholder="Units Currently Responding"
                className={inputClass}
              />
              <p className="text-gray-500 text-xs mt-1">
                Shown on the public site during active response. No call details are exposed.
              </p>
            </div>

            <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
              <input
                type="checkbox"
                checked={autoPublish}
                onChange={(e) => setAutoPublish(e.target.checked)}
                className="rounded"
              />
              Auto-publish after delay (uncheck to require manual approval)
            </label>
          </div>
        </div>

        {/* Default image */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
          <h2 className="text-lg font-semibold text-white mb-4">
            Default Call Image
          </h2>
          <p className="text-gray-400 text-sm mb-4">
            Used when no call type match is found below.
          </p>
          <MediaPicker
            value={defaultImage}
            onSelect={setDefaultImage}
            folder="uploads"
          />
        </div>

        {/* Type → Image mapping */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-semibold text-white">
                Call Type → Image Mapping
              </h2>
              <p className="text-gray-400 text-sm mt-1">
                Map keywords in the call type to default images. The keyword is
                matched case-insensitively against the dispatch call type.
              </p>
            </div>
            <button
              onClick={addMapping}
              className="flex items-center gap-1 text-red-400 hover:text-red-300 text-sm font-medium shrink-0"
            >
              <Plus size={16} /> Add
            </button>
          </div>

          <div className="space-y-4">
            {mappings.map((m, idx) => (
              <div
                key={idx}
                className="bg-gray-800 border border-gray-700 rounded-lg p-4"
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="text-gray-400 text-xs">
                    Mapping #{idx + 1}
                  </span>
                  <button
                    onClick={() => removeMapping(idx)}
                    className="text-gray-500 hover:text-red-400"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
                <div className="space-y-2">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">
                      Keyword (e.g. &quot;structure fire&quot;, &quot;mva&quot;, &quot;ems&quot;)
                    </label>
                    <input
                      value={m.key}
                      onChange={(e) => updateMapping(idx, "key", e.target.value)}
                      placeholder="e.g. structure fire"
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">
                      Image
                    </label>
                    <MediaPicker
                      value={m.image}
                      onSelect={(url) => updateMapping(idx, "image", url)}
                      folder="uploads"
                    />
                  </div>
                </div>
              </div>
            ))}
            {mappings.length === 0 && (
              <p className="text-gray-500 text-sm text-center py-4">
                No type mappings configured. All calls will use the default
                image.
              </p>
            )}
          </div>
        </div>

        {/* Save */}
        <button
          onClick={handleSave}
          disabled={status === "saving"}
          className="flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-medium px-6 py-3 rounded-lg transition-colors w-full"
        >
          {status === "saving" ? (
            "Saving..."
          ) : status === "saved" ? (
            <>
              <Check size={16} /> Saved
            </>
          ) : (
            "Save Configuration"
          )}
        </button>
        {status === "error" && (
          <p className="text-red-400 text-sm text-center">Failed to save.</p>
        )}
      </div>
    </div>
  );
}
