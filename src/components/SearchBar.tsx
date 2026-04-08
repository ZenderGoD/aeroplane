"use client";

import { useEffect, useState, useRef, useImperativeHandle, forwardRef, useMemo, useCallback } from "react";
import type { FlightState } from "@/types/flight";
import { searchAirports } from "@/lib/searchAutocomplete";
import { searchAirlines } from "@/lib/searchAutocomplete";
import type { AutocompleteResult } from "@/lib/searchAutocomplete";

interface Props {
  value: string;
  onChange: (value: string) => void;
  isAISearching?: boolean;
  isNaturalLanguage?: boolean;
  inline?: boolean;
  flights?: FlightState[];
  onSelectFlight?: (flight: FlightState) => void;
  onSelectAirport?: (icao: string) => void;
  onSelectAirline?: (icaoCode: string) => void;
}

export interface SearchBarHandle {
  focus: () => void;
}

function highlightMatch(text: string, query: string): React.ReactNode {
  if (!query) return text;
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return text;
  return (
    <>
      {text.slice(0, idx)}
      <span className="font-bold text-white">{text.slice(idx, idx + query.length)}</span>
      {text.slice(idx + query.length)}
    </>
  );
}

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  Flights: (
    <svg className="w-3.5 h-3.5 text-slate-400 shrink-0" fill="currentColor" viewBox="0 0 24 24">
      <path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z" />
    </svg>
  ),
  Airports: (
    <svg className="w-3.5 h-3.5 text-slate-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
    </svg>
  ),
  Airlines: (
    <svg className="w-3.5 h-3.5 text-slate-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
};

const SearchBar = forwardRef<SearchBarHandle, Props>(function SearchBar({
  value,
  onChange,
  isAISearching = false,
  isNaturalLanguage = false,
  inline = false,
  flights = [],
  onSelectFlight,
  onSelectAirport,
  onSelectAirline,
}, ref) {
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [input, setInput] = useState(value);
  const [debouncedInput, setDebouncedInput] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);

  useImperativeHandle(ref, () => ({
    focus: () => inputRef.current?.focus(),
  }));

  // Sync external value changes
  useEffect(() => {
    setInput(value);
  }, [value]);

  // Debounce for onChange callback (existing 300ms)
  useEffect(() => {
    const timer = setTimeout(() => onChange(input), 300);
    return () => clearTimeout(timer);
  }, [input, onChange]);

  // Debounce for autocomplete (150ms)
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedInput(input), 150);
    return () => clearTimeout(timer);
  }, [input]);

  // Build autocomplete results
  const autocompleteResults = useMemo((): AutocompleteResult[] => {
    const query = debouncedInput.trim();
    if (query.length < 2) return [];

    const results: AutocompleteResult[] = [];
    const lowerQuery = query.toLowerCase();

    // Search flights
    const matchedFlights: AutocompleteResult[] = [];
    for (const flight of flights) {
      if (matchedFlights.length >= 4) break;
      const callsign = flight.callsign?.trim() ?? "";
      const registration = flight.registration ?? "";
      const icao24 = flight.icao24;
      const typeCode = flight.typeCode ?? "";

      if (
        callsign.toLowerCase().includes(lowerQuery) ||
        registration.toLowerCase().includes(lowerQuery) ||
        icao24.toLowerCase().includes(lowerQuery) ||
        typeCode.toLowerCase().includes(lowerQuery)
      ) {
        matchedFlights.push({
          category: "Flights",
          primary: callsign || icao24,
          secondary: [registration, typeCode, flight.originCountry].filter(Boolean).join(" / "),
          value: flight.icao24,
          data: flight,
        });
      }
    }
    results.push(...matchedFlights);

    // Search airports
    const matchedAirports = searchAirports(query, 3);
    results.push(...matchedAirports);

    // Search airlines
    const matchedAirlines = searchAirlines(query, 2);
    results.push(...matchedAirlines);

    return results.slice(0, 8);
  }, [debouncedInput, flights]);

  // Show/hide dropdown
  useEffect(() => {
    if (autocompleteResults.length > 0 && debouncedInput.trim().length >= 2) {
      setShowDropdown(true);
      setSelectedIndex(-1);
    } else {
      setShowDropdown(false);
    }
  }, [autocompleteResults, debouncedInput]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(e.target as Node)
      ) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const handleSelect = useCallback((result: AutocompleteResult) => {
    setShowDropdown(false);
    setInput("");
    onChange("");

    if (result.category === "Flights" && onSelectFlight && result.data) {
      onSelectFlight(result.data as FlightState);
    } else if (result.category === "Airports" && onSelectAirport) {
      onSelectAirport(result.value);
    } else if (result.category === "Airlines" && onSelectAirline) {
      onSelectAirline(result.value);
    }
  }, [onChange, onSelectFlight, onSelectAirport, onSelectAirline]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!showDropdown) return;

    switch (e.key) {
      case "ArrowDown": {
        e.preventDefault();
        setSelectedIndex((prev) =>
          prev < autocompleteResults.length - 1 ? prev + 1 : 0
        );
        break;
      }
      case "ArrowUp": {
        e.preventDefault();
        setSelectedIndex((prev) =>
          prev > 0 ? prev - 1 : autocompleteResults.length - 1
        );
        break;
      }
      case "Enter": {
        e.preventDefault();
        if (selectedIndex >= 0 && selectedIndex < autocompleteResults.length) {
          handleSelect(autocompleteResults[selectedIndex]);
        }
        break;
      }
      case "Escape": {
        e.preventDefault();
        setShowDropdown(false);
        break;
      }
    }
  }, [showDropdown, autocompleteResults, selectedIndex, handleSelect]);

  // Group results by category for rendering
  const groupedResults = useMemo(() => {
    const groups: { category: string; items: (AutocompleteResult & { globalIndex: number })[] }[] = [];
    const categoryOrder = ["Flights", "Airports", "Airlines"];
    let globalIndex = 0;

    for (const cat of categoryOrder) {
      const items = autocompleteResults
        .filter((r) => r.category === cat)
        .map((r) => ({ ...r, globalIndex: globalIndex++ }));
      // only increment globalIndex for items not in this category too
      if (items.length === 0) {
        // recalculate — we need to correctly track the global index
        continue;
      }
      groups.push({ category: cat, items });
    }

    // Fix global indices (the above has a bug since we skip some)
    let idx = 0;
    for (const group of groups) {
      for (const item of group.items) {
        item.globalIndex = idx++;
      }
    }

    return groups;
  }, [autocompleteResults]);

  const query = debouncedInput.trim();

  return (
    <div className={inline ? "relative" : "absolute top-4 left-4 z-[1000]"}>
      <div className="relative">
        {isAISearching ? (
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 animate-spin"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            />
          </svg>
        ) : (
          <svg
            className={`absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 ${
              isNaturalLanguage ? "text-slate-300" : "text-gray-400"
            }`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            {isNaturalLanguage ? (
              <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
            ) : (
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            )}
          </svg>
        )}
        <input
          ref={inputRef}
          type="text"
          placeholder='Search flights... (try "planes above 30000 ft")'
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (autocompleteResults.length > 0 && input.trim().length >= 2) {
              setShowDropdown(true);
            }
          }}
          className={`pl-10 pr-8 py-2 ${inline ? "w-full" : "w-80"} rounded-lg bg-gray-900/90 backdrop-blur shadow-lg border text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 ${
            isNaturalLanguage
              ? "border-slate-500/50 focus:ring-slate-500"
              : "border-gray-700 focus:ring-slate-500"
          }`}
        />
        {input && (
          <button
            onClick={() => {
              setInput("");
              onChange("");
              setShowDropdown(false);
            }}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
          >
            <svg
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        )}

        {/* Autocomplete Dropdown */}
        {showDropdown && groupedResults.length > 0 && (
          <div
            ref={dropdownRef}
            className="absolute top-full left-0 right-0 mt-1 z-[2000] rounded-xl border border-gray-700/60 bg-gray-900/95 backdrop-blur-xl shadow-2xl shadow-black/40 overflow-hidden"
          >
            {groupedResults.map((group) => (
              <div key={group.category}>
                <div className="px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-gray-500 flex items-center gap-1.5">
                  {CATEGORY_ICONS[group.category]}
                  {group.category}
                </div>
                {group.items.map((item) => (
                  <button
                    key={`${item.category}-${item.value}`}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 text-left transition-colors duration-75 ${
                      item.globalIndex === selectedIndex
                        ? "bg-white/10 text-white"
                        : "text-gray-300 hover:bg-white/[0.04]"
                    }`}
                    onMouseEnter={() => setSelectedIndex(item.globalIndex)}
                    onClick={() => handleSelect(item)}
                  >
                    {CATEGORY_ICONS[item.category]}
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-mono truncate">
                        {highlightMatch(item.primary, query)}
                      </div>
                      {item.secondary && (
                        <div className="text-xs text-gray-500 truncate">
                          {highlightMatch(item.secondary, query)}
                        </div>
                      )}
                    </div>
                    {item.category === "Flights" && (
                      <span className="text-xs text-gray-600 font-mono shrink-0">
                        {item.value}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            ))}
            <div className="px-3 py-1.5 border-t border-gray-800/60 flex items-center gap-2 text-xs text-gray-600">
              <kbd className="px-1 py-0.5 rounded border border-gray-700 bg-gray-800 font-mono text-gray-400">↑↓</kbd>
              navigate
              <kbd className="px-1 py-0.5 rounded border border-gray-700 bg-gray-800 font-mono text-gray-400 ml-1">↵</kbd>
              select
              <kbd className="px-1 py-0.5 rounded border border-gray-700 bg-gray-800 font-mono text-gray-400 ml-1">esc</kbd>
              close
            </div>
          </div>
        )}
      </div>
      {isNaturalLanguage && !isAISearching && (
        <div className="mt-1 ml-1 flex items-center gap-1">
          <svg className="w-3 h-3 text-slate-400" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
          </svg>
          <span className="text-xs text-slate-400 font-medium">AI-powered search</span>
        </div>
      )}
    </div>
  );
});

export default SearchBar;
