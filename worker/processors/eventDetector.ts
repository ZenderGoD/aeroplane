import type { Processor } from "./base";
import type { FlightState } from "../../src/types/flight";
import type { FlightEvent, EventType, EventSeverity } from "../../src/types/events";
import { redis, publishEvent, CHANNELS } from "../../src/lib/redis";
import { insertFlightEvent } from "../../src/lib/db/queries";

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

function distNm(lat1: number, lon1: number, lat2: number, lon2: number): number {
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

interface AirportActivity {
  holdingFlights: string[];
  goAroundFlights: string[];
  groundStopFlights: string[];
  emergencyFlights: string[];
  inboundCount: number;
}

// Suppress duplicate events within this window
const EVENT_COOLDOWN_MS = 15 * 60_000; // 15 minutes

export class EventDetector implements Processor {
  name = "EventDetector";

  // Track recent events to suppress duplicates
  private recentEvents = new Map<string, number>();

  async process(flights: FlightState[], tickCount: number): Promise<void> {
    // Run every 2nd tick (~30s)
    if (tickCount % 2 !== 0) return;

    const now = Date.now();

    // Collect activity per airport
    const activity = new Map<string, AirportActivity>();

    for (const airport of AIRPORTS) {
      const act: AirportActivity = {
        holdingFlights: [],
        goAroundFlights: [],
        groundStopFlights: [],
        emergencyFlights: [],
        inboundCount: 0,
      };

      for (const f of flights) {
        if (f.latitude === null || f.longitude === null) continue;

        const dist = distNm(f.latitude, f.longitude, airport.lat, airport.lon);
        if (dist > 50) continue;

        const cs = f.callsign?.trim() || f.icao24;

        // Emergency squawks
        if (
          f.squawk === "7500" ||
          f.squawk === "7600" ||
          f.squawk === "7700"
        ) {
          act.emergencyFlights.push(cs);
        }

        // Holding: slow, medium altitude, near airport
        if (
          !f.onGround &&
          f.velocity !== null &&
          f.velocity < 120 * 0.5144 &&
          f.baroAltitude !== null &&
          f.baroAltitude > 600 &&
          f.baroAltitude < 5000 &&
          dist < 30
        ) {
          act.holdingFlights.push(cs);
        }

        // Go-around: climbing below 3000ft near airport
        if (
          !f.onGround &&
          dist < 10 &&
          f.baroAltitude !== null &&
          f.baroAltitude < 915 &&
          f.verticalRate !== null &&
          f.verticalRate > 3
        ) {
          act.goAroundFlights.push(cs);
        }

        // Ground stop: nearly stationary but not marked on-ground
        if (
          !f.onGround &&
          f.velocity !== null &&
          f.velocity < 2 &&
          f.baroAltitude !== null &&
          f.baroAltitude < 500 &&
          dist < 5
        ) {
          act.groundStopFlights.push(cs);
        }

        // Inbound
        if (!f.onGround && dist < 50 && f.verticalRate !== null && f.verticalRate < -1) {
          act.inboundCount++;
        }
      }

      activity.set(airport.icao, act);
    }

    // Detect events
    const events: FlightEvent[] = [];

    for (const airport of AIRPORTS) {
      const act = activity.get(airport.icao);
      if (!act) continue;

      // Holding surge: 3+ aircraft holding
      if (act.holdingFlights.length >= 3) {
        events.push(
          this.createEvent(
            "holding_surge",
            "warning",
            airport.icao,
            act.holdingFlights,
            `${act.holdingFlights.length} aircraft in holding patterns near ${airport.name}`,
            now
          )
        );
      }

      // Go-around cluster: 2+ go-arounds
      if (act.goAroundFlights.length >= 2) {
        events.push(
          this.createEvent(
            "go_around_cluster",
            "warning",
            airport.icao,
            act.goAroundFlights,
            `${act.goAroundFlights.length} possible go-arounds at ${airport.name}`,
            now
          )
        );
      }

      // Mass ground stop: 5+ aircraft
      if (act.groundStopFlights.length >= 5) {
        events.push(
          this.createEvent(
            "ground_stop_mass",
            "critical",
            airport.icao,
            act.groundStopFlights,
            `${act.groundStopFlights.length} aircraft in unexpected ground stop at ${airport.name}`,
            now
          )
        );
      }

      // Traffic surge: high inbound count (>15 for major airports)
      if (act.inboundCount >= 15) {
        events.push(
          this.createEvent(
            "traffic_surge",
            "info",
            airport.icao,
            [],
            `${act.inboundCount} inbound aircraft approaching ${airport.name}`,
            now
          )
        );
      }
    }

    // Filter out duplicate/cooldown events
    const newEvents = events.filter((e) => {
      const key = `${e.eventType}:${e.airportIcao}`;
      const lastSeen = this.recentEvents.get(key);
      if (lastSeen && now - lastSeen < EVENT_COOLDOWN_MS) return false;
      this.recentEvents.set(key, now);
      return true;
    });

    // Store and publish new events
    for (const event of newEvents) {
      // Write to Supabase
      await insertFlightEvent({
        event_type: event.eventType,
        severity: event.severity,
        airport_icao: event.airportIcao,
        corridor_id: event.corridorId,
        affected_flights: event.affectedFlights,
        message: event.message,
        metadata: event.metadata,
        detected_at: new Date(event.detectedAt).toISOString(),
        resolved_at: null,
      });

      // Publish to Redis for SSE
      if (redis.status === "ready") {
        await publishEvent(CHANNELS.flightEvents, event);
      }

      console.log(
        `  [EventDetector] ${event.severity.toUpperCase()}: ${event.message}`
      );
    }

    // Cleanup old cooldown entries
    if (tickCount % 60 === 0) {
      for (const [key, ts] of this.recentEvents) {
        if (now - ts > EVENT_COOLDOWN_MS * 2) {
          this.recentEvents.delete(key);
        }
      }
    }
  }

  private createEvent(
    eventType: EventType,
    severity: EventSeverity,
    airportIcao: string,
    affectedFlights: string[],
    message: string,
    timestamp: number
  ): FlightEvent {
    return {
      eventType,
      severity,
      airportIcao,
      corridorId: null,
      affectedFlights,
      message,
      metadata: {},
      detectedAt: timestamp,
      resolvedAt: null,
    };
  }
}
