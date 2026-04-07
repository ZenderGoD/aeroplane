"use client";

import { useTheme } from "@/contexts/ThemeContext";

/**
 * AeroIntel Theme Toggle
 *
 * Pill-shaped button that toggles between dark and light mode.
 * Uses ThemeContext for state management — theme is persisted
 * in localStorage and the `dark` / `light` class is toggled
 * on the <html> element via the ThemeProvider.
 */

export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";

  return (
    <button
      onClick={toggleTheme}
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
      {/* Sun icon -- visible in dark mode (click to go light) */}
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        className={`absolute h-4 w-4 text-slate-400 transition-all duration-300 ease-[var(--ease-spring)]
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

      {/* Moon icon -- visible in light mode (click to go dark) */}
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        className={`absolute h-4 w-4 text-slate-700 transition-all duration-300 ease-[var(--ease-spring)]
          ${isDark ? "-rotate-90 scale-0 opacity-0" : "rotate-0 scale-100 opacity-100"}`}
      >
        <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
      </svg>
    </button>
  );
}
