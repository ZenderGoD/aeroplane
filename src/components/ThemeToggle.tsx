"use client";

import { useEffect, useState } from "react";

/**
 * AeroIntel Theme Toggle
 *
 * Pill-shaped button that toggles between dark and light mode.
 * - Persists preference in localStorage under `aerointel_theme`
 * - Respects `prefers-color-scheme` on first load when no saved preference exists
 * - Toggles `dark` / `light` class on the <html> element
 *
 * NOTE: Import `@/styles/light-theme.css` in your layout or globals.css
 * for the light theme variables to take effect:
 *   import "@/styles/light-theme.css";
 */

const STORAGE_KEY = "aerointel_theme";
type Theme = "dark" | "light";

function getSystemTheme(): Theme {
  if (typeof window === "undefined") return "dark";
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

function getInitialTheme(): Theme {
  if (typeof window === "undefined") return "dark";
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === "dark" || stored === "light") return stored;
  return getSystemTheme();
}

function applyTheme(theme: Theme) {
  const root = document.documentElement;
  root.classList.remove("dark", "light");
  root.classList.add(theme);
}

export default function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>("dark");
  const [mounted, setMounted] = useState(false);

  // Hydrate from localStorage / system preference
  useEffect(() => {
    const initial = getInitialTheme();
    setTheme(initial);
    applyTheme(initial);
    setMounted(true);

    // Listen for system preference changes (only applies when no saved pref)
    const mql = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = (e: MediaQueryListEvent) => {
      if (!localStorage.getItem(STORAGE_KEY)) {
        const next = e.matches ? "dark" : "light";
        setTheme(next);
        applyTheme(next);
      }
    };
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, []);

  const toggle = () => {
    const next: Theme = theme === "dark" ? "light" : "dark";
    setTheme(next);
    applyTheme(next);
    localStorage.setItem(STORAGE_KEY, next);
  };

  // Prevent flash of wrong icon during SSR
  if (!mounted) {
    return (
      <button
        aria-label="Toggle theme"
        className="relative flex h-8 w-8 items-center justify-center rounded-full
                   bg-[var(--surface-3)] border border-[var(--border-default)]
                   opacity-0"
        disabled
      >
        <span className="h-4 w-4" />
      </button>
    );
  }

  const isDark = theme === "dark";

  return (
    <button
      onClick={toggle}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      title={isDark ? "Switch to light mode" : "Switch to dark mode"}
      className="relative flex h-8 w-8 items-center justify-center rounded-full
                 bg-[var(--surface-3)] border border-[var(--border-default)]
                 hover:border-[var(--border-strong)]
                 hover:bg-[var(--surface-4)]
                 transition-all duration-200 ease-out
                 cursor-pointer select-none
                 focus-visible:outline-none focus-visible:ring-2
                 focus-visible:ring-[var(--accent-primary)] focus-visible:ring-offset-1"
    >
      {/* Sun icon — visible in dark mode (click to go light) */}
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        className={`absolute h-4 w-4 text-amber-400 transition-all duration-300 ease-[var(--ease-spring)]
          ${isDark ? "rotate-0 scale-100 opacity-100" : "rotate-90 scale-0 opacity-0"}`}
      >
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2" />
        <path d="M12 20v2" />
        <path d="m4.93 4.93 1.41 1.41" />
        <path d="m17.66 17.66 1.41 1.41" />
        <path d="M2 12h2" />
        <path d="M20 12h2" />
        <path d="m6.34 17.66-1.41 1.41" />
        <path d="m19.07 4.93-1.41 1.41" />
      </svg>

      {/* Moon icon — visible in light mode (click to go dark) */}
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        className={`absolute h-4 w-4 text-sky-700 transition-all duration-300 ease-[var(--ease-spring)]
          ${isDark ? "-rotate-90 scale-0 opacity-0" : "rotate-0 scale-100 opacity-100"}`}
      >
        <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
      </svg>
    </button>
  );
}
