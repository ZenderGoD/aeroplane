"use client";

import { useState, useEffect, useRef } from "react";
import type { SearchFilters } from "@/types/search";

function looksLikeCallsign(q: string): boolean {
  const trimmed = q.trim().toUpperCase();
  return /^[A-Z]{2,4}\d{0,4}[A-Z]?$/.test(trimmed) && trimmed.length <= 8;
}

export function useNLSearch() {
  const [rawQuery, setRawQuery] = useState("");
  const [filters, setFilters] = useState<SearchFilters | null>(null);
  const [isAISearching, setIsAISearching] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const q = rawQuery.trim();

    if (!q) {
      setFilters(null);
      setIsAISearching(false);
      return;
    }

    // Direct callsign match: no AI needed
    if (looksLikeCallsign(q)) {
      setFilters({ callsign: q.toUpperCase(), is_natural_language: false });
      setIsAISearching(false);
      return;
    }

    // AI search with 500ms debounce
    setIsAISearching(true);
    const timer = setTimeout(async () => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const res = await fetch("/api/search", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query: q }),
          signal: controller.signal,
        });
        if (res.ok) {
          const { filters: parsed } = await res.json();
          setFilters({ ...parsed, is_natural_language: true });
        } else {
          // Fallback to callsign search
          setFilters({ callsign: q.toUpperCase(), is_natural_language: false });
        }
      } catch (e) {
        if ((e as Error).name !== "AbortError") {
          setFilters({ callsign: q.toUpperCase(), is_natural_language: false });
        }
      } finally {
        setIsAISearching(false);
      }
    }, 500);

    return () => {
      clearTimeout(timer);
      abortRef.current?.abort();
    };
  }, [rawQuery]);

  return { rawQuery, setRawQuery, filters, isAISearching };
}
