import { NextRequest, NextResponse } from "next/server";
import { parseAirplanesLive, AIRPLANES_LIVE_URL } from "@/lib/airplaneslive";
import type { FlightState } from "@/types/flight";

/**
 * Aircraft profile lookup API.
 * Accepts an ICAO24 hex, registration, or callsign as the [id] param.
 * Tries multiple airplanes.live endpoints and returns the first match.
 */

// Rate limiter — 1 request/sec to airplanes.live
let lastRequest = 0;
const MIN_INTERVAL = 1_000;

async function throttledFetch(url: string): Promise<Response> {
  const now = Date.now();
  const wait = MIN_INTERVAL - (now - lastRequest);
  if (wait > 0) {
    await new Promise((resolve) => setTimeout(resolve, wait));
  }
  lastRequest = Date.now();
  return fetch(url, { cache: "no-store" });
}

// Simple cache to avoid hammering the API
interface CacheEntry {
  aircraft: FlightState;
  timestamp: number;
}
const cache = new Map<string, CacheEntry>();
const CACHE_TTL = 10_000; // 10 seconds

function isHexCode(id: string): boolean {
  return /^[0-9a-f]{6}$/i.test(id);
}

function isRegistration(id: string): boolean {
  // Registrations typically start with a letter and contain letters/digits/hyphens
  return /^[A-Z]{1,2}[-]?[A-Z0-9]+$/i.test(id) && !isHexCode(id);
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: rawId } = await params;
  const id = rawId.trim();

  if (!id || id.length < 2) {
    return NextResponse.json(
      { error: "Aircraft identifier required (hex, registration, or callsign)" },
      { status: 400 }
    );
  }

  // Check cache
  const cached = cache.get(id.toLowerCase());
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return NextResponse.json({ aircraft: cached.aircraft, source: "cache" });
  }

  // Determine search order based on the input format
  const endpoints: string[] = [];

  if (isHexCode(id)) {
    // Looks like a hex code — try hex first
    endpoints.push(`${AIRPLANES_LIVE_URL}/hex/${id.toLowerCase()}`);
    endpoints.push(`${AIRPLANES_LIVE_URL}/reg/${id.toUpperCase()}`);
    endpoints.push(`${AIRPLANES_LIVE_URL}/callsign/${id.toUpperCase()}`);
  } else if (isRegistration(id)) {
    // Looks like a registration — try reg first
    endpoints.push(`${AIRPLANES_LIVE_URL}/reg/${id.toUpperCase()}`);
    endpoints.push(`${AIRPLANES_LIVE_URL}/callsign/${id.toUpperCase()}`);
    endpoints.push(`${AIRPLANES_LIVE_URL}/hex/${id.toLowerCase()}`);
  } else {
    // Assume callsign
    endpoints.push(`${AIRPLANES_LIVE_URL}/callsign/${id.toUpperCase()}`);
    endpoints.push(`${AIRPLANES_LIVE_URL}/reg/${id.toUpperCase()}`);
    endpoints.push(`${AIRPLANES_LIVE_URL}/hex/${id.toLowerCase()}`);
  }

  for (const url of endpoints) {
    try {
      const res = await throttledFetch(url);
      if (!res.ok) continue;

      const data = await res.json();
      const acList = data?.ac;
      if (!Array.isArray(acList) || acList.length === 0) continue;

      // Parse the first match
      const parsed = parseAirplanesLive(acList[0] as Record<string, unknown>);
      if (parsed) {
        // Cache the result
        cache.set(id.toLowerCase(), { aircraft: parsed, timestamp: Date.now() });

        return NextResponse.json({
          aircraft: parsed,
          source: "airplaneslive",
          matchedEndpoint: url,
        });
      }
    } catch (err) {
      console.warn(`[Aircraft] Failed to fetch from ${url}:`, err);
      continue;
    }
  }

  // No results from any endpoint
  return NextResponse.json(
    { error: "Aircraft not found. It may not be currently active.", aircraft: null },
    { status: 404 }
  );
}
