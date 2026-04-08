"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";

/* ─── Types ────────────────────────────────────────────────── */

interface SavedView {
  id: string;
  name: string;
  description: string;
  lat: number;
  lon: number;
  zoom: number;
  icon: string;
  isPrebuilt?: boolean;
}

interface WatchlistAircraft {
  id: string;
  identifier: string; // registration, ICAO hex, or callsign
  identifierType: "registration" | "icao24" | "callsign";
  label: string;
  status: "active" | "ground" | "not_seen";
  lat?: number | null;
  lon?: number | null;
  lastSeen?: number | null;
}

interface FavoriteAirport {
  icao: string;
  name: string;
  city: string;
  country: string;
  lat: number;
  lon: number;
  flightCount?: number;
}

interface Props {
  open: boolean;
  onClose: () => void;
  onNavigateToView?: (lat: number, lon: number, zoom: number) => void;
  onSelectAircraft?: (icao24: string) => void;
  onOpenAirportRadar?: (icao: string) => void;
}

/* ─── Storage Keys ─────────────────────────────────────────── */

const STORAGE_KEYS = {
  views: "aerointel_saved_views",
  watchlist: "aerointel_watchlist",
  airports: "aerointel_favorite_airports",
} as const;

/* ─── Pre-built Views ──────────────────────────────────────── */

const PREBUILT_VIEWS: SavedView[] = [
  {
    id: "prebuilt-india",
    name: "India Overview",
    description: "Indian subcontinent airspace",
    lat: 22.5,
    lon: 78.9,
    zoom: 5,
    icon: "globe",
    isPrebuilt: true,
  },
  {
    id: "prebuilt-us-east",
    name: "US East Coast",
    description: "Boston to Miami corridor",
    lat: 36.5,
    lon: -76.0,
    zoom: 6,
    icon: "building",
    isPrebuilt: true,
  },
  {
    id: "prebuilt-europe",
    name: "Europe",
    description: "European continental airspace",
    lat: 50.0,
    lon: 10.0,
    zoom: 5,
    icon: "map",
    isPrebuilt: true,
  },
  {
    id: "prebuilt-middle-east",
    name: "Middle East",
    description: "Gulf region and surroundings",
    lat: 25.0,
    lon: 50.0,
    zoom: 5,
    icon: "compass",
    isPrebuilt: true,
  },
  {
    id: "prebuilt-nat",
    name: "North Atlantic Tracks",
    description: "NAT OTS oceanic routes",
    lat: 52.0,
    lon: -30.0,
    zoom: 4,
    icon: "route",
    isPrebuilt: true,
  },
];

/* ─── Icons (inline SVGs for zero deps) ────────────────────── */

function IconGlobe({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
    </svg>
  );
}

function IconBuilding({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="2" width="16" height="20" rx="2" />
      <path d="M9 22V12h6v10M8 6h.01M16 6h.01M12 6h.01M8 10h.01M16 10h.01M12 10h.01" />
    </svg>
  );
}

function IconMap({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 6v16l7-4 8 4 7-4V2l-7 4-8-4-7 4zM8 2v16M16 6v16" />
    </svg>
  );
}

function IconCompass({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" />
    </svg>
  );
}

function IconRoute({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="6" cy="19" r="3" />
      <circle cx="18" cy="5" r="3" />
      <path d="M6 16V8a4 4 0 0 1 4-4h4" />
    </svg>
  );
}

function IconBookmark({ className = "w-4 h-4", style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg className={className} style={style} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
    </svg>
  );
}

function IconPlane({ className = "w-4 h-4", style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg className={className} style={style} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z" />
    </svg>
  );
}

function IconTrash({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    </svg>
  );
}

function IconPlus({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}

function IconX({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

function IconDownload({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" />
    </svg>
  );
}

function IconUpload({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12" />
    </svg>
  );
}

function IconTower({ className = "w-4 h-4", style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg className={className} style={style} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2v6M8 4h8M9 8l-3 14M15 8l3 14M7 14h10" />
    </svg>
  );
}

function IconEdit({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  );
}

function IconCrosshair({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="22" y1="12" x2="18" y2="12" />
      <line x1="6" y1="12" x2="2" y2="12" />
      <line x1="12" y1="6" x2="12" y2="2" />
      <line x1="12" y1="22" x2="12" y2="18" />
    </svg>
  );
}

const VIEW_ICONS: Record<string, React.FC<{ className?: string }>> = {
  globe: IconGlobe,
  building: IconBuilding,
  map: IconMap,
  compass: IconCompass,
  route: IconRoute,
  bookmark: IconBookmark,
};

/* ─── Helpers ──────────────────────────────────────────────── */

function loadFromStorage<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function saveToStorage<T>(key: string, data: T) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch {
    // storage full — silently ignore
  }
}

function generateId(): string {
  return `sv-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function timeAgo(ts: number): string {
  const diff = Math.floor((Date.now() / 1000) - ts);
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

/* ─── Component ────────────────────────────────────────────── */

type TabKey = "views" | "watchlist" | "airports";

export default function SavedViewsPanel({
  open,
  onClose,
  onNavigateToView,
  onSelectAircraft,
  onOpenAirportRadar,
}: Props) {
  const [activeTab, setActiveTab] = useState<TabKey>("views");
  const [editMode, setEditMode] = useState(false);

  // --- Data state ---
  const [savedViews, setSavedViews] = useState<SavedView[]>([]);
  const [watchlist, setWatchlist] = useState<WatchlistAircraft[]>([]);
  const [favoriteAirports, setFavoriteAirports] = useState<FavoriteAirport[]>([]);

  // --- Form state ---
  const [showAddView, setShowAddView] = useState(false);
  const [newViewName, setNewViewName] = useState("");
  const [newViewDesc, setNewViewDesc] = useState("");
  const [newViewLat, setNewViewLat] = useState("");
  const [newViewLon, setNewViewLon] = useState("");
  const [newViewZoom, setNewViewZoom] = useState("6");

  const [showAddAircraft, setShowAddAircraft] = useState(false);
  const [newAircraftId, setNewAircraftId] = useState("");
  const [newAircraftType, setNewAircraftType] = useState<WatchlistAircraft["identifierType"]>("callsign");

  const [showAddAirport, setShowAddAirport] = useState(false);
  const [newAirportIcao, setNewAirportIcao] = useState("");
  const [newAirportName, setNewAirportName] = useState("");

  const fileInputRef = useRef<HTMLInputElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // --- Load from localStorage on mount ---
  useEffect(() => {
    setSavedViews(loadFromStorage<SavedView[]>(STORAGE_KEYS.views, []));
    setWatchlist(loadFromStorage<WatchlistAircraft[]>(STORAGE_KEYS.watchlist, []));
    setFavoriteAirports(loadFromStorage<FavoriteAirport[]>(STORAGE_KEYS.airports, []));
  }, []);

  // --- Persist on change ---
  useEffect(() => {
    saveToStorage(STORAGE_KEYS.views, savedViews);
  }, [savedViews]);
  useEffect(() => {
    saveToStorage(STORAGE_KEYS.watchlist, watchlist);
  }, [watchlist]);
  useEffect(() => {
    saveToStorage(STORAGE_KEYS.airports, favoriteAirports);
  }, [favoriteAirports]);

  // --- Poll watchlist status every 30s ---
  const pollWatchlist = useCallback(async () => {
    if (watchlist.length === 0) return;
    const updated = await Promise.all(
      watchlist.map(async (ac) => {
        try {
          const res = await fetch(`/api/aircraft/${ac.identifier}`);
          if (!res.ok) return { ...ac, status: "not_seen" as const };
          const data = await res.json();
          if (!data || (!data.lat && !data.latitude)) {
            return { ...ac, status: "not_seen" as const, lat: null, lon: null };
          }
          const lat = data.lat ?? data.latitude;
          const lon = data.lon ?? data.longitude;
          const onGround = data.onGround ?? data.on_ground ?? false;
          return {
            ...ac,
            status: onGround ? ("ground" as const) : ("active" as const),
            lat,
            lon,
            lastSeen: Math.floor(Date.now() / 1000),
          };
        } catch {
          return { ...ac, status: "not_seen" as const };
        }
      })
    );
    setWatchlist(updated);
  }, [watchlist]);

  useEffect(() => {
    if (!open) return;
    pollWatchlist();
    pollRef.current = setInterval(pollWatchlist, 30_000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [open, pollWatchlist]);

  // --- Close edit mode when switching tabs ---
  useEffect(() => {
    setEditMode(false);
  }, [activeTab]);

  // --- View actions ---
  const allViews = [...PREBUILT_VIEWS, ...savedViews];

  const handleAddView = () => {
    if (!newViewName.trim() || !newViewLat || !newViewLon) return;
    const view: SavedView = {
      id: generateId(),
      name: newViewName.trim(),
      description: newViewDesc.trim() || "Custom saved view",
      lat: parseFloat(newViewLat),
      lon: parseFloat(newViewLon),
      zoom: parseFloat(newViewZoom) || 6,
      icon: "bookmark",
    };
    setSavedViews((prev) => [...prev, view]);
    setNewViewName("");
    setNewViewDesc("");
    setNewViewLat("");
    setNewViewLon("");
    setNewViewZoom("6");
    setShowAddView(false);
  };

  const handleDeleteView = (id: string) => {
    setSavedViews((prev) => prev.filter((v) => v.id !== id));
  };

  // --- Watchlist actions ---
  const handleAddAircraft = () => {
    if (!newAircraftId.trim()) return;
    const ac: WatchlistAircraft = {
      id: generateId(),
      identifier: newAircraftId.trim().toUpperCase(),
      identifierType: newAircraftType,
      label: newAircraftId.trim().toUpperCase(),
      status: "not_seen",
    };
    setWatchlist((prev) => [...prev, ac]);
    setNewAircraftId("");
    setShowAddAircraft(false);
  };

  const handleRemoveAircraft = (id: string) => {
    setWatchlist((prev) => prev.filter((a) => a.id !== id));
  };

  // --- Airport actions ---
  const handleAddAirport = () => {
    if (!newAirportIcao.trim()) return;
    const ap: FavoriteAirport = {
      icao: newAirportIcao.trim().toUpperCase(),
      name: newAirportName.trim() || newAirportIcao.trim().toUpperCase(),
      city: "",
      country: "",
      lat: 0,
      lon: 0,
    };
    setFavoriteAirports((prev) => [...prev, ap]);
    setNewAirportIcao("");
    setNewAirportName("");
    setShowAddAirport(false);
  };

  const handleRemoveAirport = (icao: string) => {
    setFavoriteAirports((prev) => prev.filter((a) => a.icao !== icao));
  };

  // --- Import/Export ---
  const handleExport = () => {
    const data = {
      version: 1,
      exportedAt: new Date().toISOString(),
      savedViews,
      watchlist,
      favoriteAirports,
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `aerointel-saved-data-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target?.result as string);
        if (data.savedViews) setSavedViews(data.savedViews);
        if (data.watchlist) setWatchlist(data.watchlist);
        if (data.favoriteAirports) setFavoriteAirports(data.favoriteAirports);
      } catch {
        // invalid JSON — ignore
      }
    };
    reader.readAsText(file);
    // reset input so same file can be re-imported
    e.target.value = "";
  };

  const statusIndicator = (status: WatchlistAircraft["status"]) => {
    switch (status) {
      case "active":
        return <span className="inline-block w-2 h-2 rounded-full bg-gray-300 shadow-[0_0_6px_rgba(203,213,225,0.5)]" title="Airborne" />;
      case "ground":
        return <span className="inline-block w-2 h-2 rounded-full bg-gray-500 shadow-[0_0_6px_rgba(148,163,184,0.4)]" title="On Ground" />;
      default:
        return <span className="inline-block w-2 h-2 rounded-full bg-slate-500" title="Not Seen" />;
    }
  };

  const statusLabel = (status: WatchlistAircraft["status"]) => {
    switch (status) {
      case "active": return "Airborne";
      case "ground": return "On Ground";
      default: return "Not Seen";
    }
  };

  /* ─── Tab definitions ─────────────────────────────── */

  const tabs: { key: TabKey; label: string; count: number }[] = [
    { key: "views", label: "Views", count: allViews.length },
    { key: "watchlist", label: "Watchlist", count: watchlist.length },
    { key: "airports", label: "Airports", count: favoriteAirports.length },
  ];

  /* ─── Render ──────────────────────────────────────── */

  return (
    <>
      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-[1099] bg-black/40 backdrop-blur-sm transition-opacity duration-300"
          onClick={onClose}
        />
      )}

      {/* Panel */}
      <div
        className={`fixed z-[1100] shadow-2xl shadow-black/40 transform transition-all duration-300
          md:right-0 md:top-0 md:h-full md:w-[380px]
          max-md:bottom-0 max-md:left-0 max-md:right-0 max-md:h-[75vh] max-md:w-full max-md:rounded-t-2xl
          ${open
            ? "md:translate-x-0 max-md:translate-y-0 opacity-100"
            : "md:translate-x-full max-md:translate-y-full opacity-0 pointer-events-none"
          }`}
        style={{
          background: "linear-gradient(180deg, rgba(12, 16, 24, 0.95) 0%, rgba(6, 8, 13, 0.98) 100%)",
          backdropFilter: "blur(24px) saturate(1.3)",
          WebkitBackdropFilter: "blur(24px) saturate(1.3)",
          borderLeft: "1px solid var(--border-default)",
          transitionTimingFunction: "var(--ease-out-expo)",
        }}
      >
        {/* Top highlight line */}
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-slate-600/20 to-transparent" />

        <div className="h-full flex flex-col">
          {/* ── Header ──────────────────────────────────── */}
          <div className="px-5 pt-4 pb-3 shrink-0">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center"
                  style={{ background: "var(--accent-primary-dim)" }}>
                  <IconBookmark className="w-3.5 h-3.5" style={{ color: "var(--accent-primary)" }} />
                </div>
                <h2 className="text-sm font-semibold tracking-tight" style={{ color: "var(--text-primary)" }}>
                  Saved Views & Watchlists
                </h2>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setEditMode(!editMode)}
                  className="p-1.5 rounded-md transition-colors hover:bg-white/5"
                  style={{ color: editMode ? "var(--accent-primary)" : "var(--text-muted)" }}
                  title="Toggle edit mode"
                >
                  <IconEdit className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={onClose}
                  className="p-1.5 rounded-md transition-colors hover:bg-white/5"
                  style={{ color: "var(--text-muted)" }}
                >
                  <IconX className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Tab bar */}
            <div className="flex gap-0.5 p-0.5 rounded-lg" style={{ background: "var(--surface-2)" }}>
              {tabs.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-md text-xs font-medium transition-all duration-200 ${
                    activeTab === tab.key
                      ? "shadow-sm"
                      : "hover:bg-white/3"
                  }`}
                  style={{
                    background: activeTab === tab.key ? "var(--surface-3)" : "transparent",
                    color: activeTab === tab.key ? "var(--text-primary)" : "var(--text-muted)",
                  }}
                >
                  {tab.label}
                  {tab.count > 0 && (
                    <span
                      className="text-xs px-1.5 py-0.5 rounded-full tabular-nums"
                      style={{
                        background: activeTab === tab.key ? "var(--accent-primary-dim)" : "var(--surface-4)",
                        color: activeTab === tab.key ? "var(--accent-primary)" : "var(--text-muted)",
                      }}
                    >
                      {tab.count}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Divider */}
          <div className="divider-accent mx-5" />

          {/* ── Content ─────────────────────────────────── */}
          <div className="flex-1 overflow-y-auto min-h-0 px-5 py-3 space-y-2"
            style={{ scrollbarWidth: "thin", scrollbarColor: "var(--surface-4) transparent" }}>

            {/* ── VIEWS TAB ──────────────────────────────── */}
            {activeTab === "views" && (
              <>
                {allViews.map((view) => {
                  const IconComponent = VIEW_ICONS[view.icon] || IconBookmark;
                  return (
                    <button
                      key={view.id}
                      onClick={() => {
                        if (!editMode) onNavigateToView?.(view.lat, view.lon, view.zoom);
                      }}
                      className="w-full group flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 text-left hover:bg-white/[0.04]"
                      style={{ border: "1px solid transparent" }}
                      onMouseEnter={(e) => {
                        (e.currentTarget.style.borderColor = "var(--border-subtle)");
                      }}
                      onMouseLeave={(e) => {
                        (e.currentTarget.style.borderColor = "transparent");
                      }}
                    >
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors"
                        style={{
                          background: view.isPrebuilt ? "var(--accent-primary-dim)" : "var(--surface-3)",
                          color: view.isPrebuilt ? "var(--accent-primary)" : "var(--text-tertiary)",
                        }}
                      >
                        <IconComponent className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-medium truncate" style={{ color: "var(--text-primary)" }}>
                          {view.name}
                        </div>
                        <div className="text-xs truncate mt-0.5" style={{ color: "var(--text-muted)" }}>
                          {view.description}
                        </div>
                      </div>
                      {editMode && !view.isPrebuilt && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteView(view.id);
                          }}
                          className="p-1 rounded-md hover:bg-gray-500/10 transition-colors shrink-0"
                          style={{ color: "var(--status-critical)" }}
                        >
                          <IconTrash className="w-3.5 h-3.5" />
                        </button>
                      )}
                      {!editMode && (
                        <IconCrosshair
                          className="w-3.5 h-3.5 opacity-0 group-hover:opacity-60 transition-opacity shrink-0"
                        />
                      )}
                    </button>
                  );
                })}

                {/* Add View */}
                {showAddView ? (
                  <div className="rounded-lg p-3 space-y-2" style={{ background: "var(--surface-2)", border: "1px solid var(--border-default)" }}>
                    <div className="section-label mb-2">Save Current View</div>
                    <input
                      type="text"
                      placeholder="View name"
                      value={newViewName}
                      onChange={(e) => setNewViewName(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-md text-xs outline-none transition-colors"
                      style={{
                        background: "var(--surface-3)",
                        border: "1px solid var(--border-default)",
                        color: "var(--text-primary)",
                      }}
                      onFocus={(e) => (e.target.style.borderColor = "var(--accent-primary)")}
                      onBlur={(e) => (e.target.style.borderColor = "var(--border-default)")}
                    />
                    <input
                      type="text"
                      placeholder="Description (optional)"
                      value={newViewDesc}
                      onChange={(e) => setNewViewDesc(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-md text-xs outline-none transition-colors"
                      style={{
                        background: "var(--surface-3)",
                        border: "1px solid var(--border-default)",
                        color: "var(--text-primary)",
                      }}
                      onFocus={(e) => (e.target.style.borderColor = "var(--accent-primary)")}
                      onBlur={(e) => (e.target.style.borderColor = "var(--border-default)")}
                    />
                    <div className="flex gap-2">
                      <input
                        type="number"
                        placeholder="Latitude"
                        value={newViewLat}
                        onChange={(e) => setNewViewLat(e.target.value)}
                        className="flex-1 px-2.5 py-1.5 rounded-md text-xs outline-none transition-colors"
                        style={{
                          background: "var(--surface-3)",
                          border: "1px solid var(--border-default)",
                          color: "var(--text-primary)",
                        }}
                        onFocus={(e) => (e.target.style.borderColor = "var(--accent-primary)")}
                        onBlur={(e) => (e.target.style.borderColor = "var(--border-default)")}
                      />
                      <input
                        type="number"
                        placeholder="Longitude"
                        value={newViewLon}
                        onChange={(e) => setNewViewLon(e.target.value)}
                        className="flex-1 px-2.5 py-1.5 rounded-md text-xs outline-none transition-colors"
                        style={{
                          background: "var(--surface-3)",
                          border: "1px solid var(--border-default)",
                          color: "var(--text-primary)",
                        }}
                        onFocus={(e) => (e.target.style.borderColor = "var(--accent-primary)")}
                        onBlur={(e) => (e.target.style.borderColor = "var(--border-default)")}
                      />
                      <input
                        type="number"
                        placeholder="Zoom"
                        value={newViewZoom}
                        onChange={(e) => setNewViewZoom(e.target.value)}
                        className="w-16 px-2.5 py-1.5 rounded-md text-xs outline-none transition-colors"
                        style={{
                          background: "var(--surface-3)",
                          border: "1px solid var(--border-default)",
                          color: "var(--text-primary)",
                        }}
                        onFocus={(e) => (e.target.style.borderColor = "var(--accent-primary)")}
                        onBlur={(e) => (e.target.style.borderColor = "var(--border-default)")}
                      />
                    </div>
                    <div className="flex gap-2 pt-1">
                      <button
                        onClick={handleAddView}
                        className="flex-1 py-1.5 rounded-md text-xs font-medium transition-colors"
                        style={{
                          background: "var(--accent-primary)",
                          color: "var(--surface-0)",
                        }}
                      >
                        Save View
                      </button>
                      <button
                        onClick={() => setShowAddView(false)}
                        className="px-3 py-1.5 rounded-md text-xs font-medium transition-colors hover:bg-white/5"
                        style={{ color: "var(--text-muted)" }}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => setShowAddView(true)}
                    className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium transition-colors hover:bg-white/[0.04]"
                    style={{
                      border: "1px dashed var(--border-default)",
                      color: "var(--text-muted)",
                    }}
                  >
                    <IconPlus className="w-3 h-3" />
                    Save Current View
                  </button>
                )}
              </>
            )}

            {/* ── WATCHLIST TAB ───────────────────────────── */}
            {activeTab === "watchlist" && (
              <>
                {watchlist.length === 0 && !showAddAircraft && (
                  <div className="flex flex-col items-center justify-center py-10 text-center">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3"
                      style={{ background: "var(--surface-3)" }}>
                      <IconPlane className="w-5 h-5" style={{ color: "var(--text-muted)" }} />
                    </div>
                    <div className="text-xs font-medium mb-1" style={{ color: "var(--text-secondary)" }}>
                      No aircraft tracked
                    </div>
                    <div className="text-xs max-w-[200px]" style={{ color: "var(--text-muted)" }}>
                      Add aircraft by registration, ICAO hex, or callsign to track them in real time.
                    </div>
                  </div>
                )}

                {watchlist.map((ac) => (
                  <button
                    key={ac.id}
                    onClick={() => {
                      if (!editMode && ac.status === "active" && ac.lat && ac.lon) {
                        onSelectAircraft?.(ac.identifier);
                      }
                    }}
                    className="w-full group flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 text-left hover:bg-white/[0.04]"
                    style={{ border: "1px solid transparent" }}
                    onMouseEnter={(e) => {
                      (e.currentTarget.style.borderColor = "var(--border-subtle)");
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget.style.borderColor = "transparent");
                    }}
                  >
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                      style={{ background: "var(--surface-3)" }}>
                      <IconPlane className="w-4 h-4" style={{ color: "var(--text-tertiary)" }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono font-medium truncate" style={{ color: "var(--text-primary)" }}>
                          {ac.label}
                        </span>
                        {statusIndicator(ac.status)}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                          {ac.identifierType === "icao24" ? "ICAO" : ac.identifierType === "registration" ? "REG" : "CS"}
                        </span>
                        <span className="text-xs" style={{ color: ac.status === "active" ? "var(--status-nominal)" : ac.status === "ground" ? "var(--status-caution)" : "var(--text-faint)" }}>
                          {statusLabel(ac.status)}
                        </span>
                        {ac.lastSeen && (
                          <span className="text-xs" style={{ color: "var(--text-faint)" }}>
                            {timeAgo(ac.lastSeen)}
                          </span>
                        )}
                      </div>
                    </div>
                    {editMode ? (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemoveAircraft(ac.id);
                        }}
                        className="p-1 rounded-md hover:bg-gray-500/10 transition-colors shrink-0"
                        style={{ color: "var(--status-critical)" }}
                      >
                        <IconTrash className="w-3.5 h-3.5" />
                      </button>
                    ) : ac.status === "active" ? (
                      <IconCrosshair
                        className="w-3.5 h-3.5 opacity-0 group-hover:opacity-60 transition-opacity shrink-0"
                      />
                    ) : null}
                  </button>
                ))}

                {/* Add Aircraft */}
                {showAddAircraft ? (
                  <div className="rounded-lg p-3 space-y-2" style={{ background: "var(--surface-2)", border: "1px solid var(--border-default)" }}>
                    <div className="section-label mb-2">Track Aircraft</div>
                    <div className="flex gap-1 p-0.5 rounded-md" style={{ background: "var(--surface-3)" }}>
                      {(["callsign", "registration", "icao24"] as const).map((t) => (
                        <button
                          key={t}
                          onClick={() => setNewAircraftType(t)}
                          className="flex-1 py-1 rounded text-xs font-medium transition-colors"
                          style={{
                            background: newAircraftType === t ? "var(--surface-4)" : "transparent",
                            color: newAircraftType === t ? "var(--text-primary)" : "var(--text-muted)",
                          }}
                        >
                          {t === "icao24" ? "ICAO Hex" : t === "registration" ? "Reg" : "Callsign"}
                        </button>
                      ))}
                    </div>
                    <input
                      type="text"
                      placeholder={
                        newAircraftType === "callsign" ? "e.g. UAL123" :
                        newAircraftType === "registration" ? "e.g. N12345" :
                        "e.g. A1B2C3"
                      }
                      value={newAircraftId}
                      onChange={(e) => setNewAircraftId(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-md text-xs font-mono outline-none transition-colors"
                      style={{
                        background: "var(--surface-3)",
                        border: "1px solid var(--border-default)",
                        color: "var(--text-primary)",
                      }}
                      onFocus={(e) => (e.target.style.borderColor = "var(--accent-primary)")}
                      onBlur={(e) => (e.target.style.borderColor = "var(--border-default)")}
                      onKeyDown={(e) => e.key === "Enter" && handleAddAircraft()}
                    />
                    <div className="flex gap-2 pt-1">
                      <button
                        onClick={handleAddAircraft}
                        className="flex-1 py-1.5 rounded-md text-xs font-medium transition-colors"
                        style={{
                          background: "var(--accent-primary)",
                          color: "var(--surface-0)",
                        }}
                      >
                        Track Aircraft
                      </button>
                      <button
                        onClick={() => setShowAddAircraft(false)}
                        className="px-3 py-1.5 rounded-md text-xs font-medium transition-colors hover:bg-white/5"
                        style={{ color: "var(--text-muted)" }}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => setShowAddAircraft(true)}
                    className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium transition-colors hover:bg-white/[0.04]"
                    style={{
                      border: "1px dashed var(--border-default)",
                      color: "var(--text-muted)",
                    }}
                  >
                    <IconPlus className="w-3 h-3" />
                    Track Aircraft
                  </button>
                )}
              </>
            )}

            {/* ── AIRPORTS TAB ───────────────────────────── */}
            {activeTab === "airports" && (
              <>
                {favoriteAirports.length === 0 && !showAddAirport && (
                  <div className="flex flex-col items-center justify-center py-10 text-center">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3"
                      style={{ background: "var(--surface-3)" }}>
                      <IconTower className="w-5 h-5" style={{ color: "var(--text-muted)" }} />
                    </div>
                    <div className="text-xs font-medium mb-1" style={{ color: "var(--text-secondary)" }}>
                      No favorite airports
                    </div>
                    <div className="text-xs max-w-[200px]" style={{ color: "var(--text-muted)" }}>
                      Save airports to quickly access them in Airport Radar mode.
                    </div>
                  </div>
                )}

                {favoriteAirports.map((ap) => (
                  <button
                    key={ap.icao}
                    onClick={() => {
                      if (!editMode) onOpenAirportRadar?.(ap.icao);
                    }}
                    className="w-full group flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 text-left hover:bg-white/[0.04]"
                    style={{ border: "1px solid transparent" }}
                    onMouseEnter={(e) => {
                      (e.currentTarget.style.borderColor = "var(--border-subtle)");
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget.style.borderColor = "transparent");
                    }}
                  >
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                      style={{ background: "var(--accent-primary-dim)" }}>
                      <IconTower className="w-4 h-4" style={{ color: "var(--accent-primary)" }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono font-semibold" style={{ color: "var(--accent-primary)" }}>
                          {ap.icao}
                        </span>
                        <span className="text-xs truncate" style={{ color: "var(--text-primary)" }}>
                          {ap.name}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        {ap.city && (
                          <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                            {ap.city}{ap.country ? `, ${ap.country}` : ""}
                          </span>
                        )}
                        {typeof ap.flightCount === "number" && (
                          <span className="text-xs px-1.5 py-0.5 rounded-full"
                            style={{ background: "var(--accent-primary-dim)", color: "var(--accent-primary)" }}>
                            {ap.flightCount} flights
                          </span>
                        )}
                      </div>
                    </div>
                    {editMode ? (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemoveAirport(ap.icao);
                        }}
                        className="p-1 rounded-md hover:bg-gray-500/10 transition-colors shrink-0"
                        style={{ color: "var(--status-critical)" }}
                      >
                        <IconTrash className="w-3.5 h-3.5" />
                      </button>
                    ) : (
                      <IconCrosshair
                        className="w-3.5 h-3.5 opacity-0 group-hover:opacity-60 transition-opacity shrink-0"
                      />
                    )}
                  </button>
                ))}

                {/* Add Airport */}
                {showAddAirport ? (
                  <div className="rounded-lg p-3 space-y-2" style={{ background: "var(--surface-2)", border: "1px solid var(--border-default)" }}>
                    <div className="section-label mb-2">Add Favorite Airport</div>
                    <input
                      type="text"
                      placeholder="ICAO code (e.g. KJFK)"
                      value={newAirportIcao}
                      onChange={(e) => setNewAirportIcao(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-md text-xs font-mono outline-none transition-colors uppercase"
                      style={{
                        background: "var(--surface-3)",
                        border: "1px solid var(--border-default)",
                        color: "var(--text-primary)",
                      }}
                      onFocus={(e) => (e.target.style.borderColor = "var(--accent-primary)")}
                      onBlur={(e) => (e.target.style.borderColor = "var(--border-default)")}
                      onKeyDown={(e) => e.key === "Enter" && handleAddAirport()}
                    />
                    <input
                      type="text"
                      placeholder="Airport name (optional)"
                      value={newAirportName}
                      onChange={(e) => setNewAirportName(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-md text-xs outline-none transition-colors"
                      style={{
                        background: "var(--surface-3)",
                        border: "1px solid var(--border-default)",
                        color: "var(--text-primary)",
                      }}
                      onFocus={(e) => (e.target.style.borderColor = "var(--accent-primary)")}
                      onBlur={(e) => (e.target.style.borderColor = "var(--border-default)")}
                    />
                    <div className="flex gap-2 pt-1">
                      <button
                        onClick={handleAddAirport}
                        className="flex-1 py-1.5 rounded-md text-xs font-medium transition-colors"
                        style={{
                          background: "var(--accent-primary)",
                          color: "var(--surface-0)",
                        }}
                      >
                        Add Airport
                      </button>
                      <button
                        onClick={() => setShowAddAirport(false)}
                        className="px-3 py-1.5 rounded-md text-xs font-medium transition-colors hover:bg-white/5"
                        style={{ color: "var(--text-muted)" }}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => setShowAddAirport(true)}
                    className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium transition-colors hover:bg-white/[0.04]"
                    style={{
                      border: "1px dashed var(--border-default)",
                      color: "var(--text-muted)",
                    }}
                  >
                    <IconPlus className="w-3 h-3" />
                    Add Airport
                  </button>
                )}
              </>
            )}
          </div>

          {/* ── Footer: Import/Export ────────────────────── */}
          <div className="shrink-0 px-5 py-3" style={{ borderTop: "1px solid var(--border-subtle)" }}>
            <div className="flex items-center gap-2">
              <button
                onClick={handleExport}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium transition-colors hover:bg-white/[0.04]"
                style={{
                  border: "1px solid var(--border-default)",
                  color: "var(--text-secondary)",
                }}
              >
                <IconDownload className="w-3.5 h-3.5" />
                Export
              </button>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium transition-colors hover:bg-white/[0.04]"
                style={{
                  border: "1px solid var(--border-default)",
                  color: "var(--text-secondary)",
                }}
              >
                <IconUpload className="w-3.5 h-3.5" />
                Import
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                onChange={handleImport}
                className="hidden"
              />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
