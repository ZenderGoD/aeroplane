import type { FlightState, FlightHistoryEntry } from "@/types/flight";

const MAX_HISTORY = 10;
const PRUNE_AFTER_MS = 60_000;

export type FlightHistoryMap = Map<string, FlightHistoryEntry[]>;

export function updateFlightHistory(
  prev: FlightHistoryMap,
  flights: FlightState[],
  now: number
): FlightHistoryMap {
  const next = new Map(prev);

  for (const f of flights) {
    if (f.latitude === null || f.longitude === null) continue;

    const entry: FlightHistoryEntry = {
      lat: f.latitude,
      lon: f.longitude,
      altitude: f.baroAltitude,
      heading: f.trueTrack,
      velocity: f.velocity,
      timestamp: now,
    };

    const existing = next.get(f.icao24) ?? [];

    // Avoid duplicate entries if data hasn't changed (same refresh)
    if (existing.length > 0) {
      const last = existing[existing.length - 1];
      if (Math.abs(last.lat - entry.lat) < 0.0001 && Math.abs(last.lon - entry.lon) < 0.0001) {
        continue;
      }
    }

    const updated = [...existing, entry];
    next.set(f.icao24, updated.length > MAX_HISTORY ? updated.slice(-MAX_HISTORY) : updated);
  }

  // Prune stale entries (flights no longer visible)
  for (const [icao24, entries] of next) {
    if (entries.length === 0 || now - entries[entries.length - 1].timestamp > PRUNE_AFTER_MS) {
      next.delete(icao24);
    }
  }

  return next;
}
