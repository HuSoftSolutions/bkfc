"use client";

import { useEffect, useState } from "react";
import { doc, getDoc, setDoc, collection, query, orderBy, getDocs } from "firebase/firestore";
import { getDb } from "@/lib/firebase";
import { Event } from "@/types";
import { geocodeZip } from "@/lib/weather";
import { Settings, Check, Mail, Bell } from "lucide-react";
import MediaPicker from "@/components/MediaPicker";

export default function AdminSettingsPage() {
  const [zipCode, setZipCode] = useState("12025");
  const [preview, setPreview] = useState<string | null>(null);
  const [heroImage, setHeroImage] = useState("");
  const [facebookUrl, setFacebookUrl] = useState("https://www.facebook.com/Broadalbinfire");
  const [publicEmail, setPublicEmail] = useState("");
  const [notice, setNotice] = useState({
    active: false,
    title: "",
    description: "",
    image: "",
    linkType: "none" as "none" | "page" | "event" | "custom",
    linkUrl: "",
    linkText: "",
  });
  const [events, setEvents] = useState<Event[]>([]);
  const [emailRouting, setEmailRouting] = useState({
    general: "",
    contact: "",
    volunteer: "",
    donation: "",
    registration: "",
  });
  const [weatherStatus, setWeatherStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [emailStatus, setEmailStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [heroStatus, setHeroStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [contactStatus, setContactStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [fbStatus, setFbStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [noticeStatus, setNoticeStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadSettings() {
      try {
        const [weatherDoc, heroDoc, fbDoc, emailDoc, contactDoc, noticeDoc] = await Promise.all([
          getDoc(doc(getDb(), "settings", "weather")),
          getDoc(doc(getDb(), "settings", "hero")),
          getDoc(doc(getDb(), "settings", "facebook")),
          getDoc(doc(getDb(), "settings", "emailRouting")),
          getDoc(doc(getDb(), "settings", "contact")),
          getDoc(doc(getDb(), "settings", "notice")),
        ]);
        if (weatherDoc.exists()) {
          const data = weatherDoc.data();
          setZipCode(data.zipCode || "12025");
          setPreview(data.locationName || null);
        }
        if (heroDoc.exists()) {
          setHeroImage(heroDoc.data().image || "");
        }
        if (fbDoc.exists()) {
          setFacebookUrl(fbDoc.data().pageUrl || "https://www.facebook.com/Broadalbinfire");
        }
        if (contactDoc.exists()) {
          setPublicEmail(contactDoc.data().email || "");
        }
        if (noticeDoc.exists()) {
          const nd = noticeDoc.data();
          setNotice({
            active: nd.active || false,
            title: nd.title || "",
            description: nd.description || "",
            image: nd.image || "",
            linkType: nd.linkType || "none",
            linkUrl: nd.linkUrl || "",
            linkText: nd.linkText || "",
          });
        }
        // Fetch events for notice link picker
        const eventsSnap = await getDocs(
          query(collection(getDb(), "events"), orderBy("date", "desc"))
        );
        setEvents(
          eventsSnap.docs.map((d) => ({ id: d.id, ...d.data() })) as Event[]
        );
        if (emailDoc.exists()) {
          const data = emailDoc.data();
          setEmailRouting({
            general: data.general || "",
            contact: data.contact || "",
            volunteer: data.volunteer || "",
            donation: data.donation || "",
            registration: data.registration || "",
          });
        }
      } catch {
        // Use defaults
      } finally {
        setLoading(false);
      }
    }
    loadSettings();
  }, []);

  const handleLookup = async () => {
    setPreview(null);
    const geo = await geocodeZip(zipCode);
    if (geo) {
      const name = geo.admin1 ? `${geo.name}, ${geo.admin1}` : geo.name;
      setPreview(name);
    } else {
      setPreview("Location not found");
    }
  };

  const handleWeatherSave = async () => {
    setWeatherStatus("saving");
    try {
      const geo = await geocodeZip(zipCode);
      const locationName = geo
        ? geo.admin1
          ? `${geo.name}, ${geo.admin1}`
          : geo.name
        : "Unknown";

      await setDoc(doc(getDb(), "settings", "weather"), {
        zipCode,
        locationName,
        latitude: geo?.latitude || null,
        longitude: geo?.longitude || null,
        updatedAt: new Date().toISOString(),
      });

      setPreview(locationName);
      setWeatherStatus("saved");
      setTimeout(() => setWeatherStatus("idle"), 2000);
    } catch {
      setWeatherStatus("error");
    }
  };

  const handleFbSave = async () => {
    setFbStatus("saving");
    try {
      await setDoc(doc(getDb(), "settings", "facebook"), {
        pageUrl: facebookUrl,
        updatedAt: new Date().toISOString(),
      });
      setFbStatus("saved");
      setTimeout(() => setFbStatus("idle"), 2000);
    } catch {
      setFbStatus("error");
    }
  };

  const handleEmailSave = async () => {
    setEmailStatus("saving");
    try {
      await setDoc(doc(getDb(), "settings", "emailRouting"), {
        ...emailRouting,
        updatedAt: new Date().toISOString(),
      });
      setEmailStatus("saved");
      setTimeout(() => setEmailStatus("idle"), 2000);
    } catch {
      setEmailStatus("error");
    }
  };

  const updateEmailRoute = (key: string, value: string) => {
    setEmailRouting((prev) => ({ ...prev, [key]: value }));
  };

  const handleNoticeSave = async () => {
    setNoticeStatus("saving");
    try {
      await setDoc(doc(getDb(), "settings", "notice"), {
        ...notice,
        updatedAt: new Date().toISOString(),
      });
      setNoticeStatus("saved");
      setTimeout(() => setNoticeStatus("idle"), 2000);
    } catch {
      setNoticeStatus("error");
    }
  };

  const updateNotice = (key: string, value: string | boolean) => {
    setNotice((prev) => ({ ...prev, [key]: value }));
  };

  const handleContactSave = async () => {
    setContactStatus("saving");
    try {
      await setDoc(doc(getDb(), "settings", "contact"), {
        email: publicEmail,
        updatedAt: new Date().toISOString(),
      });
      setContactStatus("saved");
      setTimeout(() => setContactStatus("idle"), 2000);
    } catch {
      setContactStatus("error");
    }
  };

  const handleHeroSave = async () => {
    setHeroStatus("saving");
    try {
      await setDoc(doc(getDb(), "settings", "hero"), {
        image: heroImage,
        updatedAt: new Date().toISOString(),
      });
      setHeroStatus("saved");
      setTimeout(() => setHeroStatus("idle"), 2000);
    } catch {
      setHeroStatus("error");
    }
  };

  const inputClass =
    "w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:border-red-500 focus:outline-none";

  if (loading) {
    return <div className="text-gray-400">Loading settings...</div>;
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-8 flex items-center gap-3">
        <Settings size={24} />
        Settings
      </h1>

      <div className="max-w-lg space-y-6">
        {/* Site Notice */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
          <h2 className="text-lg font-semibold text-white mb-2 flex items-center gap-2">
            <Bell size={18} className="text-yellow-400" />
            Site Notice Popup
          </h2>
          <p className="text-gray-400 text-sm mb-4">
            Show a popup notice to visitors when they first load the site.
            Dismissed once per session.
          </p>

          <div className="space-y-3">
            <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
              <input
                type="checkbox"
                checked={notice.active}
                onChange={(e) => updateNotice("active", e.target.checked)}
                className="rounded"
              />
              Active — show notice to visitors
            </label>

            <div>
              <label className="block text-xs text-gray-400 mb-1">Title *</label>
              <input
                value={notice.title}
                onChange={(e) => updateNotice("title", e.target.value)}
                placeholder="e.g. Burn Ban in Effect"
                className={inputClass}
              />
            </div>

            <div>
              <label className="block text-xs text-gray-400 mb-1">Description</label>
              <textarea
                rows={3}
                value={notice.description}
                onChange={(e) => updateNotice("description", e.target.value)}
                placeholder="Details about the notice..."
                className={`${inputClass} resize-none`}
              />
            </div>

            <div>
              <label className="block text-xs text-gray-400 mb-1">Image (optional)</label>
              <MediaPicker
                value={notice.image}
                onSelect={(url) => updateNotice("image", url)}
                folder="uploads"
              />
            </div>

            <div>
              <label className="block text-xs text-gray-400 mb-1">Button Link</label>
              <select
                value={notice.linkType}
                onChange={(e) => {
                  const type = e.target.value as typeof notice.linkType;
                  updateNotice("linkType", type);
                  if (type === "none") updateNotice("linkUrl", "");
                }}
                className={inputClass}
              >
                <option value="none">No button</option>
                <option value="page">Link to site page</option>
                <option value="event">Link to an event</option>
                <option value="custom">Custom URL</option>
              </select>
            </div>

            {notice.linkType === "page" && (
              <div>
                <label className="block text-xs text-gray-400 mb-1">Select Page</label>
                <select
                  value={notice.linkUrl}
                  onChange={(e) => updateNotice("linkUrl", e.target.value)}
                  className={inputClass}
                >
                  <option value="">Choose a page...</option>
                  <option value="/">Home</option>
                  <option value="/about">About</option>
                  <option value="/apparatus">Apparatus</option>
                  <option value="/calls">Calls</option>
                  <option value="/news">News</option>
                  <option value="/events">Events</option>
                  <option value="/gallery">Gallery</option>
                  <option value="/volunteer">Volunteer</option>
                  <option value="/donate">Donate</option>
                  <option value="/contact">Contact</option>
                </select>
              </div>
            )}

            {notice.linkType === "event" && (
              <div>
                <label className="block text-xs text-gray-400 mb-1">Select Event</label>
                <select
                  value={notice.linkUrl}
                  onChange={(e) => updateNotice("linkUrl", e.target.value)}
                  className={inputClass}
                >
                  <option value="">Choose an event...</option>
                  {events.map((evt) => (
                    <option key={evt.id} value={`/events/${evt.id}`}>
                      {evt.title} ({evt.date})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {notice.linkType === "custom" && (
              <div>
                <label className="block text-xs text-gray-400 mb-1">Custom URL</label>
                <input
                  value={notice.linkUrl}
                  onChange={(e) => updateNotice("linkUrl", e.target.value)}
                  placeholder="https://..."
                  className={inputClass}
                />
              </div>
            )}

            {notice.linkType !== "none" && (
              <div>
                <label className="block text-xs text-gray-400 mb-1">Button Text</label>
                <input
                  value={notice.linkText}
                  onChange={(e) => updateNotice("linkText", e.target.value)}
                  placeholder="Learn More"
                  className={inputClass}
                />
              </div>
            )}

            <button
              onClick={handleNoticeSave}
              disabled={noticeStatus === "saving"}
              className="flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-medium px-6 py-2 rounded-lg transition-colors w-full"
            >
              {noticeStatus === "saving" ? (
                "Saving..."
              ) : noticeStatus === "saved" ? (
                <>
                  <Check size={16} /> Saved
                </>
              ) : (
                "Save Notice"
              )}
            </button>

            {noticeStatus === "error" && (
              <p className="text-red-400 text-sm">Failed to save.</p>
            )}
          </div>
        </div>

        {/* Hero Image */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
          <h2 className="text-lg font-semibold text-white mb-2">Hero Image</h2>
          <p className="text-gray-400 text-sm mb-4">
            Set the background image for the homepage hero section.
          </p>

          <div className="space-y-3">
            <MediaPicker
              value={heroImage}
              onSelect={setHeroImage}
              folder="hero"
            />

            <button
              onClick={handleHeroSave}
              disabled={heroStatus === "saving"}
              className="flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-medium px-6 py-2 rounded-lg transition-colors w-full"
            >
              {heroStatus === "saving" ? (
                "Saving..."
              ) : heroStatus === "saved" ? (
                <>
                  <Check size={16} /> Saved
                </>
              ) : (
                "Save Hero Image"
              )}
            </button>

            {heroStatus === "error" && (
              <p className="text-red-400 text-sm">Failed to save.</p>
            )}
          </div>
        </div>

        {/* Public Contact Email */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
          <h2 className="text-lg font-semibold text-white mb-2">Public Contact Email</h2>
          <p className="text-gray-400 text-sm mb-4">
            The email address shown on the public site (footer, contact page, map).
            Leave blank to hide the email from all public pages.
          </p>
          <div className="space-y-3">
            <input
              type="email"
              value={publicEmail}
              onChange={(e) => setPublicEmail(e.target.value)}
              placeholder="e.g. Contact@BroadalbinFire.com"
              className={inputClass}
            />
            <button
              onClick={handleContactSave}
              disabled={contactStatus === "saving"}
              className="flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-medium px-6 py-2 rounded-lg transition-colors w-full"
            >
              {contactStatus === "saving" ? (
                "Saving..."
              ) : contactStatus === "saved" ? (
                <>
                  <Check size={16} /> Saved
                </>
              ) : (
                "Save"
              )}
            </button>
            {contactStatus === "error" && (
              <p className="text-red-400 text-sm">Failed to save.</p>
            )}
          </div>
        </div>

        {/* Email Routing */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
          <h2 className="text-lg font-semibold text-white mb-2 flex items-center gap-2">
            <Mail size={18} className="text-blue-400" />
            Email Notifications
          </h2>
          <p className="text-gray-400 text-sm mb-4">
            Configure which email address receives notifications for each type.
            Leave blank to use the default (General) address.
          </p>

          <div className="space-y-3">
            {[
              { key: "general", label: "General / Default", placeholder: "Contact@BroadalbinFire.com" },
              { key: "contact", label: "Contact Form Submissions", placeholder: "Same as General if blank" },
              { key: "volunteer", label: "Volunteer Applications", placeholder: "Same as General if blank" },
              { key: "donation", label: "Donations", placeholder: "Same as General if blank" },
              { key: "registration", label: "Event Registrations", placeholder: "Same as General if blank" },
            ].map(({ key, label, placeholder }) => (
              <div key={key}>
                <label className="block text-xs text-gray-400 mb-1">{label}</label>
                <input
                  type="email"
                  value={(emailRouting as Record<string, string>)[key] || ""}
                  onChange={(e) => updateEmailRoute(key, e.target.value)}
                  placeholder={placeholder}
                  className={inputClass}
                />
              </div>
            ))}

            <button
              onClick={handleEmailSave}
              disabled={emailStatus === "saving"}
              className="flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-medium px-6 py-2 rounded-lg transition-colors w-full"
            >
              {emailStatus === "saving" ? (
                "Saving..."
              ) : emailStatus === "saved" ? (
                <>
                  <Check size={16} /> Saved
                </>
              ) : (
                "Save Email Settings"
              )}
            </button>

            {emailStatus === "error" && (
              <p className="text-red-400 text-sm">Failed to save.</p>
            )}
          </div>
        </div>

        {/* Weather */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
          <h2 className="text-lg font-semibold text-white mb-2">
            Weather Widget
          </h2>
          <p className="text-gray-400 text-sm mb-4">
            Configure the zip code shown in the weather widget on the public
            site. Defaults to 12025 (Broadalbin, NY).
          </p>

          <div className="space-y-3">
            <div>
              <label className="block text-xs text-gray-400 mb-1">
                ZIP Code
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={zipCode}
                  onChange={(e) => setZipCode(e.target.value)}
                  maxLength={10}
                  placeholder="12025"
                  className={inputClass}
                />
                <button
                  onClick={handleLookup}
                  className="bg-gray-700 hover:bg-gray-600 text-white text-sm px-4 py-2 rounded-lg transition-colors whitespace-nowrap"
                >
                  Lookup
                </button>
              </div>
            </div>

            {preview && (
              <p
                className={`text-sm ${
                  preview === "Location not found"
                    ? "text-red-400"
                    : "text-green-400"
                }`}
              >
                {preview === "Location not found"
                  ? "Could not find that location. Try a city name instead."
                  : `Location: ${preview}`}
              </p>
            )}

            <button
              onClick={handleWeatherSave}
              disabled={weatherStatus === "saving"}
              className="flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-medium px-6 py-2 rounded-lg transition-colors w-full"
            >
              {weatherStatus === "saving" ? (
                "Saving..."
              ) : weatherStatus === "saved" ? (
                <>
                  <Check size={16} /> Saved
                </>
              ) : (
                "Save Weather Settings"
              )}
            </button>

            {weatherStatus === "error" && (
              <p className="text-red-400 text-sm">Failed to save.</p>
            )}
          </div>
        </div>

        {/* Facebook */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
          <h2 className="text-lg font-semibold text-white mb-2 flex items-center gap-2">
            <svg width={18} height={18} viewBox="0 0 24 24" fill="currentColor" className="text-blue-400"><path d="M18 2h-3a5 5 0 00-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 011-1h3z" /></svg>
            Facebook Feed
          </h2>
          <p className="text-gray-400 text-sm mb-4">
            Set the Facebook page URL to display in the feed section on the
            homepage. Must be a public Facebook page.
          </p>

          <div className="space-y-3">
            <div>
              <label className="block text-xs text-gray-400 mb-1">
                Facebook Page URL
              </label>
              <input
                type="url"
                value={facebookUrl}
                onChange={(e) => setFacebookUrl(e.target.value)}
                placeholder="https://www.facebook.com/YourPage"
                className={inputClass}
              />
            </div>

            <button
              onClick={handleFbSave}
              disabled={fbStatus === "saving"}
              className="flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-medium px-6 py-2 rounded-lg transition-colors w-full"
            >
              {fbStatus === "saving" ? (
                "Saving..."
              ) : fbStatus === "saved" ? (
                <>
                  <Check size={16} /> Saved
                </>
              ) : (
                "Save Facebook Settings"
              )}
            </button>

            {fbStatus === "error" && (
              <p className="text-red-400 text-sm">Failed to save.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
