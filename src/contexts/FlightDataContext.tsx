"use client";

import {
  createContext,
  useContext,
  useState,
  useMemo,
  useCallback,
  useRef,
  useEffect,
  type ReactNode,
} from "react";
import type { FlightState } from "@/types/flight";
import type { BoundingBox } from "@/types/flight";

// ── Haversine distance (nm) ──────────────────────────────────────────
function haversineNm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 3440.065; // Earth radius in nautical miles
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ── Visibility-based polling hook ────────────────────────────────────
function usePageVisible(): boolean {
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    const handler = () => setVisible(document.visibilityState === "visible");
    document.addEventListener("visibilitychange", handler);
    return () => document.removeEventListener("visibilitychange", handler);
  }, []);
  return visible;
}

// ── Interpolation ────────────────────────────────────────────────────
function interpolateFlights(
  flights: FlightState[],
  lastFetchTime: number
): FlightState[] {
  const now = Date.now();
  const elapsed = (now - lastFetchTime) / 1000;
  if (elapsed < 1 || elapsed > 120) return flights;
  return flights.map((f) => {
    if (f.latitude === null || f.longitude === null) return f;
    if (f.onGround) return f;
    if (f.velocity === null || f.trueTrack === null) return f;
    if (f.velocity < 10) return f;
    const speedKts = f.velocity * 1.94384;
    const distNm = (speedKts / 3600) * elapsed;
    const hdgRad = (f.trueTrack * Math.PI) / 180;
    const latDelta = (distNm / 60) * Math.cos(hdgRad);
    const lonDelta =
      ((distNm / 60) * Math.sin(hdgRad)) /
      Math.cos((f.latitude * Math.PI) / 180);
    let newAlt = f.baroAltitude;
    if (f.verticalRate !== null && f.baroAltitude !== null) {
      newAlt = f.baroAltitude + f.verticalRate * elapsed;
    }
    return {
      ...f,
      latitude: f.latitude + latDelta,
      longitude: f.longitude + lonDelta,
      baroAltitude: newAlt,
    };
  });
}

// ── Types ────────────────────────────────────────────────────────────

interface FlightDataState {
  /** Raw flights from server (unfiltered, uninterpolated) */
  rawFlights: FlightState[];
  /** Interpolated flights for smooth rendering */
  flights: FlightState[];
  /** Loading state */
  isLoading: boolean;
  isRefreshing: boolean;
  /** Error state */
  error: Error | null;
  /** Rate limit info */
  isRateLimited: boolean;
  isQuotaExhausted: boolean;
  /** Metadata */
  dataSource: string | null;
  apiError: string | null;
  lastUpdated: Date | null;
  totalCount: number;
  /** Current bbox being polled */
  bbox: BoundingBox | null;
  /** Update the bounding box (triggers new region fetch) */
  setBbox: (bbox: BoundingBox) => void;

  // ── Convenience filters (no extra API calls) ──────────────────
  /** Get flights within radius of a point */
  getFlightsNear: (
    lat: number,
    lon: number,
    radiusNm: number
  ) => FlightState[];
  /** Get flights matching a callsign prefix (airline code) */
  getFlightsByAirline: (prefix: string) => FlightState[];

  // ── Selected flight management (shared across modes) ──────────
  selectedFlight: FlightState | null;
  setSelectedFlight: (flight: FlightState | null) => void;
}

const FlightDataContext = createContext<FlightDataState | null>(null);

// ── Provider ─────────────────────────────────────────────────────────

interface ProviderProps {
  children: ReactNode;
  initialBbox?: BoundingBox;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function fetcher(url: string): Promise<any> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Flight fetch failed: ${res.status}`);
  return res.json();
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function parseFlights(data: any): FlightState[] {
  if (data?.flights && Array.isArray(data.flights)) {
    return data.flights as FlightState[];
  }
  return [];
}

export function FlightDataProvider({ children, initialBbox }: ProviderProps) {
  const [bbox, setBbox] = useState<BoundingBox | null>(initialBbox ?? null);
  const [selectedFlight, setSelectedFlight] = useState<FlightState | null>(
    null
  );
  const [rawFlights, setRawFlights] = useState<FlightState[]>([]);
  const [interpolatedFlights, setInterpolatedFlights] = useState<FlightState[]>(
    []
  );
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [isRateLimited, setIsRateLimited] = useState(false);
  const [isQuotaExhausted, setIsQuotaExhausted] = useState(false);
  const [dataSource, setDataSource] = useState<string | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const isVisible = usePageVisible();
  const lastFetchTimeRef = useRef(Date.now());
  const rawFlightsRef = useRef(rawFlights);
  rawFlightsRef.current = rawFlights;
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Build URL from bbox ──────────────────────────────────────────
  const url = useMemo(() => {
    if (!bbox) return null;
    const params = new URLSearchParams({
      lamin: String(bbox.lamin),
      lomin: String(bbox.lomin),
      lamax: String(bbox.lamax),
      lomax: String(bbox.lomax),
    });
    return `/api/flights?${params.toString()}`;
  }, [bbox]);

  // ── Adaptive polling interval ────────────────────────────────────
  const pollInterval = useMemo(() => {
    if (!isVisible) return 0; // pause when tab hidden
    if (isQuotaExhausted) return 300_000; // 5 min
    if (isRateLimited) return 120_000; // 2 min
    return 30_000; // 30s default
  }, [isVisible, isRateLimited, isQuotaExhausted]);

  // ── Fetch function ───────────────────────────────────────────────
  const fetchFlights = useCallback(
    async (isInitial = false) => {
      if (!url) return;
      if (isInitial) setIsLoading(true);
      else setIsRefreshing(true);

      try {
        const data = await fetcher(url);
        const flights = parseFlights(data);
        setRawFlights(flights);
        setInterpolatedFlights(flights);
        lastFetchTimeRef.current = Date.now();
        setError(null);

        // Parse metadata
        setIsRateLimited(data?._rateLimited === true);
        setIsQuotaExhausted(data?.quotaExhausted === true);
        setDataSource(
          (data?.source as string) ?? (data?._dataSource as string) ?? null
        );
        setApiError((data?.error as string) ?? null);
        setLastUpdated(
          data?.time ? new Date(data.time * 1000) : new Date()
        );
      } catch (err) {
        setError(err instanceof Error ? err : new Error(String(err)));
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [url]
  );

  // ── Initial fetch + polling loop ─────────────────────────────────
  useEffect(() => {
    if (!url) return;
    fetchFlights(true);
  }, [url]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (pollInterval > 0 && url) {
      intervalRef.current = setInterval(() => fetchFlights(), pollInterval);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [pollInterval, url, fetchFlights]);

  // ── Interpolation loop (1s ticks) ───────────────────────────────
  useEffect(() => {
    if (!isVisible || rawFlights.length === 0) return;
    const id = setInterval(() => {
      setInterpolatedFlights(
        interpolateFlights(rawFlightsRef.current, lastFetchTimeRef.current)
      );
    }, 1000);
    return () => clearInterval(id);
  }, [isVisible, rawFlights]);

  // ── Keep selected flight in sync ─────────────────────────────────
  const syncedSelectedFlight = useMemo(() => {
    if (!selectedFlight) return null;
    return (
      rawFlights.find((f) => f.icao24 === selectedFlight.icao24) ??
      selectedFlight
    );
  }, [rawFlights, selectedFlight]);

  // ── Convenience filters ──────────────────────────────────────────
  const getFlightsNear = useCallback(
    (lat: number, lon: number, radiusNm: number): FlightState[] => {
      return interpolatedFlights.filter((f) => {
        if (f.latitude === null || f.longitude === null) return false;
        return haversineNm(lat, lon, f.latitude, f.longitude) <= radiusNm;
      });
    },
    [interpolatedFlights]
  );

  const getFlightsByAirline = useCallback(
    (prefix: string): FlightState[] => {
      const upper = prefix.toUpperCase();
      return interpolatedFlights.filter((f) =>
        f.callsign?.toUpperCase().startsWith(upper)
      );
    },
    [interpolatedFlights]
  );

  // ── Context value ────────────────────────────────────────────────
  const value = useMemo<FlightDataState>(
    () => ({
      rawFlights,
      flights: interpolatedFlights,
      isLoading,
      isRefreshing,
      error,
      isRateLimited,
      isQuotaExhausted,
      dataSource,
      apiError,
      lastUpdated,
      totalCount: rawFlights.length,
      bbox,
      setBbox,
      getFlightsNear,
      getFlightsByAirline,
      selectedFlight: syncedSelectedFlight,
      setSelectedFlight,
    }),
    [
      rawFlights,
      interpolatedFlights,
      isLoading,
      isRefreshing,
      error,
      isRateLimited,
      isQuotaExhausted,
      dataSource,
      apiError,
      lastUpdated,
      bbox,
      getFlightsNear,
      getFlightsByAirline,
      syncedSelectedFlight,
    ]
  );

  return (
    <FlightDataContext.Provider value={value}>
      {children}
    </FlightDataContext.Provider>
  );
}

// ── Hooks ────────────────────────────────────────────────────────────

/** Access the shared flight data store */
export function useSharedFlightData(): FlightDataState {
  const ctx = useContext(FlightDataContext);
  if (!ctx)
    throw new Error(
      "useSharedFlightData must be used within <FlightDataProvider>"
    );
  return ctx;
}

/** Convenience: get flights near a point (no extra API call) */
export function useFlightsNear(
  lat: number,
  lon: number,
  radiusNm: number
): FlightState[] {
  const { getFlightsNear } = useSharedFlightData();
  return useMemo(
    () => getFlightsNear(lat, lon, radiusNm),
    [getFlightsNear, lat, lon, radiusNm]
  );
}
