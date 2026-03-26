import type { Processor } from "./base";
import type { FlightState } from "../../src/types/flight";
import type { TurnaroundState } from "../../src/types/turnaround";
import {
  insertTurnaroundRecord,
  updateTurnaroundRecord,
} from "../../src/lib/db/queries";

// Inline haversine to avoid import issues with @/ aliases
function distNm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 3440.065;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Major airports for turnaround tracking (same as pressure calculator)
const AIRPORTS: Array<{ icao: string; name: string; lat: number; lon: number }> = [
  { icao: "VIDP", name: "Delhi IGI", lat: 28.5562, lon: 77.1000 },
  { icao: "VABB", name: "Mumbai CSI", lat: 19.0896, lon: 72.8656 },
  { icao: "VOBL", name: "Bangalore KIA", lat: 13.1979, lon: 77.7063 },
  { icao: "VOHY", name: "Hyderabad RGI", lat: 17.2403, lon: 78.4294 },
  { icao: "VECC", name: "Kolkata NSC", lat: 22.6547, lon: 88.4467 },
  { icao: "VOMM", name: "Chennai MAA", lat: 12.9900, lon: 80.1693 },
  { icao: "KJFK", name: "New York JFK", lat: 40.6413, lon: -73.7781 },
  { icao: "KLAX", name: "Los Angeles", lat: 33.9425, lon: -118.4081 },
  { icao: "EGLL", name: "London Heathrow", lat: 51.4700, lon: -0.4543 },
  { icao: "OMDB", name: "Dubai", lat: 25.2528, lon: 55.3644 },
  { icao: "WSSS", name: "Singapore Changi", lat: 1.3644, lon: 103.9915 },
  { icao: "LTFM", name: "Istanbul", lat: 41.2753, lon: 28.7519 },
];

function findNearestAirport(
  lat: number,
  lon: number
): { icao: string; name: string; dist: number } | null {
  let best: { icao: string; name: string; dist: number } | null = null;
  for (const a of AIRPORTS) {
    const d = distNm(lat, lon, a.lat, a.lon);
    if (d < 5 && (!best || d < best.dist)) {
      best = { icao: a.icao, name: a.name, dist: d };
    }
  }
  return best;
}

export class TurnaroundTracker implements Processor {
  name = "TurnaroundTracker";

  // Track aircraft state transitions
  private states = new Map<string, TurnaroundState>();

  // Cleanup stale entries every N ticks
  private lastCleanup = 0;

  async process(flights: FlightState[], tickCount: number): Promise<void> {
    const now = Date.now();
    let arrivals = 0;
    let departures = 0;

    for (const f of flights) {
      if (f.latitude === null || f.longitude === null) continue;

      const prev = this.states.get(f.icao24);
      const nearAirport = findNearestAirport(f.latitude, f.longitude);

      // Update state
      const current: TurnaroundState = {
        icao24: f.icao24,
        callsign: f.callsign,
        wasOnGround: f.onGround,
        nearAirportIcao: nearAirport?.icao ?? null,
        nearAirportName: nearAirport?.name ?? null,
        lastSeen: now,
        landedAt: prev?.landedAt ?? null,
      };

      if (prev) {
        // Detect ARRIVAL: was airborne, now on ground near airport
        if (!prev.wasOnGround && f.onGround && nearAirport) {
          current.landedAt = now;
          arrivals++;

          // Extract airline from callsign (first 3 chars)
          const airlineIcao = f.callsign
            ? f.callsign.replace(/\s/g, "").slice(0, 3)
            : null;

          await insertTurnaroundRecord({
            icao24: f.icao24,
            callsign: f.callsign,
            airport_icao: nearAirport.icao,
            airline_icao: airlineIcao,
            aircraft_type: null,
            arrival_time: new Date(now).toISOString(),
            departure_time: null,
            turnaround_minutes: null,
            status: "on_ground",
            updated_at: new Date(now).toISOString(),
          });
        }

        // Detect DEPARTURE: was on ground near airport, now airborne
        if (
          prev.wasOnGround &&
          !f.onGround &&
          prev.nearAirportIcao &&
          prev.landedAt
        ) {
          departures++;

          const turnaroundMinutes = (now - prev.landedAt) / 60_000;

          await updateTurnaroundRecord(
            f.icao24,
            prev.nearAirportIcao,
            new Date(prev.landedAt).toISOString(),
            {
              departure_time: new Date(now).toISOString(),
              turnaround_minutes: Math.round(turnaroundMinutes * 10) / 10,
              status: "departed",
            }
          );

          current.landedAt = null;
        }
      }

      this.states.set(f.icao24, current);
    }

    // Cleanup stale entries every 20 ticks (~5 min)
    if (tickCount - this.lastCleanup > 20) {
      this.lastCleanup = tickCount;
      const staleThreshold = now - 10 * 60_000; // 10 minutes
      let cleaned = 0;
      for (const [icao24, state] of this.states) {
        if (state.lastSeen < staleThreshold) {
          this.states.delete(icao24);
          cleaned++;
        }
      }
      if (cleaned > 0) {
        console.log(
          `  [TurnaroundTracker] Cleaned ${cleaned} stale entries, tracking ${this.states.size}`
        );
      }
    }

    if (arrivals > 0 || departures > 0) {
      console.log(
        `  [TurnaroundTracker] ${arrivals} arrivals, ${departures} departures`
      );
    }
  }
}
