"use client";

import useSWR from "swr";
import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import type { FlightState, BoundingBox } from "@/types/flight";
import type { SearchFilters } from "@/types/search";
import { parseStateVector } from "@/lib/opensky";
import { getAirlineName } from "@/lib/airlines";
import { haversineNm, bearing } from "@/lib/geo";

// ── Tab visibility hook — pause polling when tab is hidden ──────────
function usePageVisible(): boolean {
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    const handler = () => setVisible(document.visibilityState === "visible");
    document.addEventListener("visibilitychange", handler);
    return () => document.removeEventListener("visibilitychange", handler);
  }, []);
  return visible;
}

const fetcher = async (url: string) => {
  const res = await fetch(url);
  const data = await res.json();
  // Attach rate limit info from response
  if (data.rateLimited) {
    data._rateLimited = true;
    data._retryAfter = data.retryAfter ?? 30;
  }
  // Attach data source info from headers
  const source = res.headers.get("X-Data-Source");
  if (source) data._dataSource = source;
  const rateLimitHeader = res.headers.get("X-Rate-Limited");
  if (rateLimitHeader === "true") data._rateLimited = true;
  const quotaHeader = res.headers.get("X-Quota-Exhausted");
  if (quotaHeader === "true") data.quotaExhausted = true;
  const msgHeader = res.headers.get("X-Rate-Limit-Message");
  if (msgHeader) data.error = msgHeader;
  return data;
};

function applyFilters(f: FlightState, filters: SearchFilters): boolean {
  // Callsign match
  if (filters.callsign) {
    if (!f.callsign?.toUpperCase().includes(filters.callsign.toUpperCase()))
      return false;
  }

  // Airline match
  if (filters.airline) {
    const prefix = f.callsign?.trim().substring(0, 3).toUpperCase() ?? "";
    const airlineName = getAirlineName(f.callsign) ?? "";
    const q = filters.airline.toUpperCase();
    if (!prefix.includes(q) && !airlineName.toUpperCase().includes(q))
      return false;
  }

  // Altitude range (convert meters to feet)
  if (filters.altitude_min !== undefined) {
    const feet = f.baroAltitude !== null ? f.baroAltitude * 3.28084 : 0;
    if (feet < filters.altitude_min) return false;
  }
  if (filters.altitude_max !== undefined) {
    const feet = f.baroAltitude !== null ? f.baroAltitude * 3.28084 : Infinity;
    if (feet > filters.altitude_max) return false;
  }

  // Heading range
  if (filters.heading_min !== undefined && filters.heading_max !== undefined) {
    if (f.trueTrack === null) return false;
    const h = f.trueTrack;
    if (filters.heading_min <= filters.heading_max) {
      if (h < filters.heading_min || h > filters.heading_max) return false;
    } else {
      // Wraps around 0/360 (e.g., 350-10 for "north")
      if (h < filters.heading_min && h > filters.heading_max) return false;
    }
  }

  // Speed range
  if (filters.speed_min !== undefined) {
    const knots = f.velocity !== null ? f.velocity * 1.94384 : 0;
    if (knots < filters.speed_min) return false;
  }
  if (filters.speed_max !== undefined) {
    const knots = f.velocity !== null ? f.velocity * 1.94384 : Infinity;
    if (knots > filters.speed_max) return false;
  }

  // Origin country
  if (filters.origin_country) {
    if (
      !f.originCountry
        .toUpperCase()
        .includes(filters.origin_country.toUpperCase())
    )
      return false;
  }

  // Near location (haversine distance)
  if (filters.near_location) {
    if (f.latitude === null || f.longitude === null) return false;
    const dist = haversineNm(
      f.latitude,
      f.longitude,
      filters.near_location.lat,
      filters.near_location.lon
    );
    if (dist > filters.near_location.radius_nm) return false;
  }

  // Destination airport: flights heading toward the airport
  if (filters.destination_airport) {
    if (f.latitude === null || f.longitude === null) return false;
    if (f.onGround) return false;
    const da = filters.destination_airport;
    const dist = haversineNm(f.latitude, f.longitude, da.lat, da.lon);
    if (dist > da.radius_nm) return false;
    // Check if flight is heading toward the airport (within ±60°)
    if (f.trueTrack !== null) {
      const bearingToAirport = bearing(f.latitude, f.longitude, da.lat, da.lon);
      let diff = Math.abs(f.trueTrack - bearingToAirport);
      if (diff > 180) diff = 360 - diff;
      if (diff > 60) return false;
    }
  }

  // On ground
  if (filters.on_ground !== undefined) {
    if (f.onGround !== filters.on_ground) return false;
  }

  // Category
  if (filters.category && filters.category.length > 0) {
    if (!filters.category.includes(f.category)) return false;
  }

  return true;
}

export function useFlightData(
  bbox?: BoundingBox,
  searchFilters?: SearchFilters | null
) {
  const [selectedFlight, setSelectedFlight] = useState<FlightState | null>(
    null
  );

  let url = "/api/flights";
  if (bbox) {
    const params = new URLSearchParams({
      lamin: String(bbox.lamin),
      lomin: String(bbox.lomin),
      lamax: String(bbox.lamax),
      lomax: String(bbox.lomax),
    });
    url += `?${params.toString()}`;
  }

  // Track rate limit state across renders for adaptive refresh
  const rateLimitRef = useRef({ limited: false, quotaExhausted: false });

  // Adaptive: normal=30s, rate limited=120s, quota exhausted=5min
  // Conservative to stay within airplanes.live daily limits (500 free / 8640 contributor)
  const rl = rateLimitRef.current;
  const adaptiveInterval = rl.limited
    ? (rl.quotaExhausted ? 300_000 : 120_000)
    : 30_000;

  // Pause polling when tab is hidden to conserve API quota
  const isVisible = usePageVisible();

  const { data: latestData, error, isLoading, isValidating } = useSWR(url, fetcher, {
    refreshInterval: isVisible ? adaptiveInterval : 0,
    revalidateOnFocus: false,
    dedupingInterval: Math.max(adaptiveInterval - 2000, 10_000),
    keepPreviousData: true,
  });

  const flights: FlightState[] = useMemo(() => {
    // New normalized format: flights are already parsed
    if (latestData?.flights && Array.isArray(latestData.flights)) {
      return latestData.flights as FlightState[];
    }
    // Backwards compatibility: old OpenSky raw state vector format
    if (latestData?.states && Array.isArray(latestData.states)) {
      return latestData.states
        .map((raw: unknown[]) => parseStateVector(raw))
        .filter((f: FlightState | null): f is FlightState => f !== null);
    }
    return [];
  }, [latestData]);

  const filteredFlights = useMemo(() => {
    if (!searchFilters) return flights;
    return flights.filter((f) => applyFilters(f, searchFilters));
  }, [flights, searchFilters]);

  // Keep selected flight in sync with refreshed data
  const syncedSelectedFlight = useMemo(() => {
    if (!selectedFlight) return null;
    return (
      flights.find((f) => f.icao24 === selectedFlight.icao24) ??
      selectedFlight
    );
  }, [flights, selectedFlight]);

  const handleSelectFlight = useCallback(
    (flight: FlightState | null) => setSelectedFlight(flight),
    []
  );

  const isRateLimited = latestData?._rateLimited === true;
  const isQuotaExhausted = latestData?.quotaExhausted === true;
  const dataSource = (latestData?.source as string) ?? (latestData?._dataSource as string) ?? null;
  const apiError = (latestData?.error as string) ?? null;

  // Update ref so next SWR config picks up adaptive interval
  rateLimitRef.current = { limited: isRateLimited, quotaExhausted: isQuotaExhausted };

  return {
    flights: filteredFlights,
    allFlights: flights,
    totalCount: flights.length,
    filteredCount: filteredFlights.length,
    isLoading,
    isRefreshing: isValidating && !isLoading,
    error,
    isRateLimited,
    isQuotaExhausted,
    dataSource,
    apiError,
    selectedFlight: syncedSelectedFlight,
    setSelectedFlight: handleSelectFlight,
    lastUpdated: latestData?.time ? new Date(latestData.time * 1000) : null,
  };
}
