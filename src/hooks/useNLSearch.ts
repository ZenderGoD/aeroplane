"use client";

import { useState, useEffect, useRef } from "react";
import type { SearchFilters } from "@/types/search";
import { findAirport } from "@/lib/airports";

// IATA airline code → ICAO callsign prefix (common airlines)
const IATA_TO_ICAO: Record<string, string> = {
  // India
  AI: "AIC", "6E": "IGO", SG: "SEJ", UK: "VTI", IX: "AXB", QP: "AKJ",
  I5: "IAD", G8: "GOW", S5: "RSG",
  // North America
  AA: "AAL", UA: "UAL", DL: "DAL", WN: "SWA", B6: "JBU", NK: "NKS",
  F9: "FFT", AS: "ASA", HA: "HAL", AC: "ACA", WS: "WJA",
  // Europe
  BA: "BAW", FR: "RYR", U2: "EZY", LH: "DLH", AF: "AFR", KL: "KLM",
  IB: "IBE", SK: "SAS", AY: "FIN", OS: "AUA", LX: "SWR", TP: "TAP",
  TK: "THY", W6: "WZZ", EI: "EIN",
  // Middle East / Asia
  EK: "UAE", QR: "QTR", EY: "ETD", SQ: "SIA", CX: "CPA", TG: "THA",
  MH: "MAS", GA: "GIA", JL: "JAL", NH: "ANA", KE: "KAL", OZ: "AAR",
  CA: "CCA", MU: "CES", CZ: "CSN", HU: "CHH",
  // Oceania / Africa
  QF: "QFA", NZ: "ANZ", VA: "VOZ", ET: "ETH", SA: "SAA", MS: "MSR",
  // Cargo
  FX: "FDX", "5X": "UPS",
};

function looksLikeCallsign(q: string): boolean {
  const trimmed = q.trim().toUpperCase();
  return /^[A-Z]{2,4}\d{0,4}[A-Z]?$/.test(trimmed) && trimmed.length <= 8;
}

/**
 * Convert IATA flight number (e.g. "AI 101", "6E234") to ICAO callsign (e.g. "AIC101", "IGO234")
 */
function iataToIcaoCallsign(q: string): string | null {
  const cleaned = q.replace(/[\s-]/g, "").toUpperCase();
  // Match IATA code (2 chars, may start with digit) + flight number
  const match = cleaned.match(/^([A-Z0-9]{2})(\d{1,4}[A-Z]?)$/);
  if (!match) return null;
  const [, iata, flightNum] = match;
  const icao = IATA_TO_ICAO[iata];
  return icao ? `${icao}${flightNum}` : null;
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

    // Direct ICAO callsign match (e.g. "AIC101", "IGO234")
    if (looksLikeCallsign(q)) {
      setFilters({ callsign: q.toUpperCase(), is_natural_language: false });
      setIsAISearching(false);
      return;
    }

    // IATA flight number (e.g. "AI 101", "6E234", "EK 502")
    const icaoCallsign = iataToIcaoCallsign(q);
    if (icaoCallsign) {
      setFilters({ callsign: icaoCallsign, is_natural_language: false });
      setIsAISearching(false);
      return;
    }

    // Detect "flights to <airport/city>" pattern
    const destMatch = q.match(/^(?:flights?\s+)?(?:to|landing\s+(?:at|in)|arriving\s+(?:at|in)|heading\s+(?:to|for)|going\s+to|bound\s+for)\s+(.+)$/i);
    if (destMatch) {
      const airportQuery = destMatch[1].trim();
      const airport = findAirport(airportQuery);
      if (airport) {
        setFilters({
          destination_airport: {
            lat: airport.lat,
            lon: airport.lon,
            icao: airport.icao || "",
            name: airport.city || airport.name,
            radius_nm: 250,
          },
          is_natural_language: false,
        });
        setIsAISearching(false);
        return;
      }
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
