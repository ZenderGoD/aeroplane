"use client";

import { useState, useEffect, useCallback, createContext, useContext } from "react";
import { Volume2, VolumeX } from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Sound enabled context + hook                                       */
/* ------------------------------------------------------------------ */

const STORAGE_KEY = "aerointel-sound-enabled";

const SoundContext = createContext<boolean>(false);

export function useSoundEnabled(): boolean {
  return useContext(SoundContext);
}

export function SoundEnabledProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [enabled, setEnabled] = useState(false);

  // Hydrate from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === "true") setEnabled(true);
    } catch {
      // Ignore — localStorage may not be available
    }
  }, []);

  return (
    <SoundContext.Provider value={enabled}>{children}</SoundContext.Provider>
  );
}

/* ------------------------------------------------------------------ */
/*  Toggle button                                                      */
/* ------------------------------------------------------------------ */

export default function SoundToggle() {
  const [enabled, setEnabled] = useState(false);

  // Hydrate from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === "true") setEnabled(true);
    } catch {
      // Ignore
    }
  }, []);

  const toggle = useCallback(() => {
    setEnabled((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(STORAGE_KEY, String(next));
        // Dispatch storage event so other components detect the change
        window.dispatchEvent(new Event("storage"));
      } catch {
        // Ignore
      }
      return next;
    });
  }, []);

  return (
    <button
      onClick={toggle}
      aria-label={enabled ? "Mute notification sounds" : "Enable notification sounds"}
      title={enabled ? "Sounds on" : "Sounds off"}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        width: 32,
        height: 32,
        borderRadius: 8,
        border: "1px solid rgba(255,255,255,0.08)",
        background: "rgba(10,12,16,0.8)",
        backdropFilter: "blur(8px)",
        WebkitBackdropFilter: "blur(8px)",
        cursor: "pointer",
        color: enabled ? "var(--text-secondary)" : "var(--text-muted)",
        transition: "all 0.2s ease",
      }}
    >
      {enabled ? <Volume2 size={15} /> : <VolumeX size={15} />}
    </button>
  );
}
