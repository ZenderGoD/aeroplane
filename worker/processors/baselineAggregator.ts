import type { Processor } from "./base";
import type { FlightState } from "../../src/types/flight";
import {
  upsertAirportBaseline,
  getAirportBaseline,
} from "../../src/lib/db/queries";
import { redis, KEYS } from "../../src/lib/redis";

// Same airports as pressure calculator
const AIRPORTS: Array<{ icao: string; lat: number; lon: number }> = [
  { icao: "VIDP", lat: 28.5562, lon: 77.1000 },
  { icao: "VABB", lat: 19.0896, lon: 72.8656 },
  { icao: "VOBL", lat: 13.1979, lon: 77.7063 },
  { icao: "VOHY", lat: 17.2403, lon: 78.4294 },
  { icao: "VECC", lat: 22.6547, lon: 88.4467 },
  { icao: "VOMM", lat: 12.9900, lon: 80.1693 },
  { icao: "KJFK", lat: 40.6413, lon: -73.7781 },
  { icao: "KLAX", lat: 33.9425, lon: -118.4081 },
  { icao: "KORD", lat: 41.9742, lon: -87.9073 },
  { icao: "KATL", lat: 33.6407, lon: -84.4277 },
  { icao: "EGLL", lat: 51.4700, lon: -0.4543 },
  { icao: "LFPG", lat: 49.0097, lon: 2.5479 },
  { icao: "EDDF", lat: 50.0379, lon: 8.5622 },
  { icao: "OMDB", lat: 25.2528, lon: 55.3644 },
  { icao: "WSSS", lat: 1.3644, lon: 103.9915 },
  { icao: "LTFM", lat: 41.2753, lon: 28.7519 },
];

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

/** Compute hour_of_week: 0-167 (day * 24 + hour in UTC) */
function getHourOfWeek(): number {
  const now = new Date();
  return now.getUTCDay() * 24 + now.getUTCHours();
}

export class BaselineAggregator implements Processor {
  name = "BaselineAggregator";

  // Exponential moving average smoothing factor
  private readonly ALPHA = 0.1;

  async process(flights: FlightState[], tickCount: number): Promise<void> {
    // Run every 20th tick (~5 min)
    if (tickCount % 20 !== 0) return;

    const hourOfWeek = getHourOfWeek();

    for (const airport of AIRPORTS) {
      let arrivals = 0;
      let departures = 0;

      for (const f of flights) {
        if (f.latitude === null || f.longitude === null) continue;

        const dist = distNm(f.latitude, f.longitude, airport.lat, airport.lon);
        if (dist > 50) continue;

        if (f.onGround && dist < 5) continue; // ground, skip

        if (
          f.verticalRate !== null &&
          f.verticalRate < -1 &&
          dist < 50
        ) {
          arrivals++;
        } else if (
          f.verticalRate !== null &&
          f.verticalRate > 1 &&
          dist < 30
        ) {
          departures++;
        }
      }

      // Only update if there's activity
      if (arrivals === 0 && departures === 0) continue;

      // Get existing baseline for EMA update
      const existing = await getAirportBaseline(airport.icao, hourOfWeek);

      let avgArr: number;
      let avgDep: number;
      let stdArr: number;
      let stdDep: number;
      let sampleCount: number;

      if (existing) {
        // Exponential moving average update
        avgArr =
          this.ALPHA * arrivals + (1 - this.ALPHA) * existing.avg_arrivals;
        avgDep =
          this.ALPHA * departures +
          (1 - this.ALPHA) * existing.avg_departures;

        // Online variance update (simplified)
        const diffArr = arrivals - existing.avg_arrivals;
        const diffDep = departures - existing.avg_departures;
        stdArr = Math.sqrt(
          (1 - this.ALPHA) *
            (existing.stddev_arrivals ** 2 + this.ALPHA * diffArr ** 2)
        );
        stdDep = Math.sqrt(
          (1 - this.ALPHA) *
            (existing.stddev_departures ** 2 + this.ALPHA * diffDep ** 2)
        );

        sampleCount = existing.sample_count + 1;
      } else {
        // First sample
        avgArr = arrivals;
        avgDep = departures;
        stdArr = 0;
        stdDep = 0;
        sampleCount = 1;
      }

      // Read current pressure score from Redis
      let pressureScore = 0;
      if (redis.status === "ready") {
        const raw = await redis.get(KEYS.airportPressure(airport.icao));
        if (raw) {
          const parsed = JSON.parse(raw);
          pressureScore = parsed.pressureScore ?? 0;
        }
      }

      await upsertAirportBaseline({
        airport_icao: airport.icao,
        hour_of_week: hourOfWeek,
        avg_arrivals: Math.round(avgArr * 100) / 100,
        avg_departures: Math.round(avgDep * 100) / 100,
        stddev_arrivals: Math.round(stdArr * 100) / 100,
        stddev_departures: Math.round(stdDep * 100) / 100,
        avg_pressure_score: Math.round(pressureScore * 100) / 100,
        sample_count: sampleCount,
        updated_at: new Date().toISOString(),
      });

      // Cache baseline in Redis
      if (redis.status === "ready") {
        await redis.set(
          KEYS.baseline(airport.icao, hourOfWeek),
          JSON.stringify({
            avgArrivals: avgArr,
            avgDepartures: avgDep,
            stddevArrivals: stdArr,
            stddevDepartures: stdDep,
            sampleCount,
          }),
          "EX",
          3600
        );
      }
    }

    console.log(
      `  [BaselineAggregator] Updated baselines for hour_of_week=${hourOfWeek}`
    );
  }
}
