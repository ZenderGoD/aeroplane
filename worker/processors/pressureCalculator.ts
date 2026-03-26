import type { Processor } from "./base";
import type { FlightState } from "../../src/types/flight";
import type { AirportPressureScore } from "../../src/types/pressure";
import { redis, KEYS, publishEvent, CHANNELS } from "../../src/lib/redis";
import { insertPressureSnapshot } from "../../src/lib/db/queries";

// Major airports to track (ICAO codes with coordinates)
// Top 50 busiest airports globally + major Indian airports
const MAJOR_AIRPORTS: Array<{
  icao: string;
  name: string;
  lat: number;
  lon: number;
}> = [
  // India
  { icao: "VIDP", name: "Delhi IGI", lat: 28.5562, lon: 77.1000 },
  { icao: "VABB", name: "Mumbai CSI", lat: 19.0896, lon: 72.8656 },
  { icao: "VOBL", name: "Bangalore KIA", lat: 13.1979, lon: 77.7063 },
  { icao: "VOHY", name: "Hyderabad RGI", lat: 17.2403, lon: 78.4294 },
  { icao: "VECC", name: "Kolkata NSC", lat: 22.6547, lon: 88.4467 },
  { icao: "VOMM", name: "Chennai MAA", lat: 12.9900, lon: 80.1693 },
  { icao: "VOCP", name: "Cochin", lat: 10.1520, lon: 76.4019 },
  { icao: "VAAH", name: "Ahmedabad", lat: 23.0772, lon: 72.6347 },
  { icao: "VAGO", name: "Goa Mopa", lat: 15.3808, lon: 73.8314 },
  { icao: "VAJB", name: "Jaipur", lat: 26.8242, lon: 75.8122 },
  // International hubs
  { icao: "KJFK", name: "New York JFK", lat: 40.6413, lon: -73.7781 },
  { icao: "KLAX", name: "Los Angeles", lat: 33.9425, lon: -118.4081 },
  { icao: "KORD", name: "Chicago O'Hare", lat: 41.9742, lon: -87.9073 },
  { icao: "KATL", name: "Atlanta", lat: 33.6407, lon: -84.4277 },
  { icao: "EGLL", name: "London Heathrow", lat: 51.4700, lon: -0.4543 },
  { icao: "LFPG", name: "Paris CDG", lat: 49.0097, lon: 2.5479 },
  { icao: "EDDF", name: "Frankfurt", lat: 50.0379, lon: 8.5622 },
  { icao: "EHAM", name: "Amsterdam", lat: 52.3086, lon: 4.7639 },
  { icao: "OMDB", name: "Dubai", lat: 25.2528, lon: 55.3644 },
  { icao: "VHHH", name: "Hong Kong", lat: 22.3080, lon: 113.9185 },
  { icao: "RJTT", name: "Tokyo Haneda", lat: 35.5494, lon: 139.7798 },
  { icao: "WSSS", name: "Singapore Changi", lat: 1.3644, lon: 103.9915 },
  { icao: "YSSY", name: "Sydney", lat: -33.9461, lon: 151.1772 },
  { icao: "LEMD", name: "Madrid", lat: 40.4936, lon: -3.5668 },
  { icao: "LTFM", name: "Istanbul", lat: 41.2753, lon: 28.7519 },
  { icao: "ZBAD", name: "Beijing Daxing", lat: 39.5098, lon: 116.4105 },
  { icao: "ZSPD", name: "Shanghai Pudong", lat: 31.1443, lon: 121.8083 },
  { icao: "RKSI", name: "Seoul Incheon", lat: 37.4602, lon: 126.4407 },
  { icao: "VTBS", name: "Bangkok", lat: 13.6900, lon: 100.7501 },
  { icao: "WMKK", name: "Kuala Lumpur", lat: 2.7456, lon: 101.7099 },
];

/** Haversine distance in NM (inline to avoid import issues) */
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

/** Check if flight is heading toward airport */
function isHeadingToward(
  flightLat: number,
  flightLon: number,
  airportLat: number,
  airportLon: number,
  flightHeading: number
): boolean {
  // Compute bearing from flight to airport
  const dLon = ((airportLon - flightLon) * Math.PI) / 180;
  const lat1 = (flightLat * Math.PI) / 180;
  const lat2 = (airportLat * Math.PI) / 180;
  const y = Math.sin(dLon) * Math.cos(lat2);
  const x =
    Math.cos(lat1) * Math.sin(lat2) -
    Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);
  const bearingDeg = (Math.atan2(y, x) * 180) / Math.PI;
  const bearing = ((bearingDeg % 360) + 360) % 360;

  // Check if heading is within ±45° of bearing to airport
  let diff = Math.abs(flightHeading - bearing);
  if (diff > 180) diff = 360 - diff;
  return diff < 45;
}

export class PressureCalculator implements Processor {
  name = "PressureCalculator";

  async process(flights: FlightState[], tickCount: number): Promise<void> {
    // Run every 2nd tick (~30s)
    if (tickCount % 2 !== 0) return;

    const scores: AirportPressureScore[] = [];

    for (const airport of MAJOR_AIRPORTS) {
      let inbound = 0;
      let outbound = 0;
      let ground = 0;
      let holding = 0;
      let goAround = 0;

      for (const f of flights) {
        if (f.latitude === null || f.longitude === null) continue;

        const dist = distNm(f.latitude, f.longitude, airport.lat, airport.lon);

        // On ground near airport
        if (f.onGround && dist < 5) {
          ground++;
          continue;
        }

        // Inbound: within 50nm, descending, heading toward
        if (
          dist < 50 &&
          !f.onGround &&
          f.verticalRate !== null &&
          f.verticalRate < -1 &&
          f.trueTrack !== null &&
          isHeadingToward(
            f.latitude,
            f.longitude,
            airport.lat,
            airport.lon,
            f.trueTrack
          )
        ) {
          inbound++;

          // Go-around indicator: climbing below 3000ft near airport
          if (
            dist < 10 &&
            f.baroAltitude !== null &&
            f.baroAltitude < 915 && // ~3000ft in meters
            f.verticalRate > 3
          ) {
            goAround++;
          }
          continue;
        }

        // Outbound: within 30nm, climbing, heading away
        if (
          dist < 30 &&
          !f.onGround &&
          f.verticalRate !== null &&
          f.verticalRate > 1 &&
          f.trueTrack !== null &&
          !isHeadingToward(
            f.latitude,
            f.longitude,
            airport.lat,
            airport.lon,
            f.trueTrack
          )
        ) {
          outbound++;
          continue;
        }

        // Holding: slow speed at medium altitude near airport
        if (
          dist < 30 &&
          !f.onGround &&
          f.velocity !== null &&
          f.velocity < 120 * 0.5144 && // < 120 kts in m/s
          f.baroAltitude !== null &&
          f.baroAltitude > 600 &&
          f.baroAltitude < 5000
        ) {
          holding++;
        }
      }

      // Only track airports with some activity
      if (inbound + outbound + ground === 0) continue;

      // Compute pressure score (0-100)
      // Weighted formula emphasizing inbound density and holding
      const rawScore =
        inbound * 3 +
        holding * 8 +
        goAround * 15 +
        ground * 0.5 +
        Math.max(0, inbound - outbound) * 2;

      // Normalize to 0-100 (soft cap at ~40 raw score = 100)
      const pressureScore = Math.min(100, Math.round((rawScore / 40) * 100));

      const score: AirportPressureScore = {
        airportIcao: airport.icao,
        airportName: airport.name,
        pressureScore,
        components: {
          inboundCount: inbound,
          outboundCount: outbound,
          groundCount: ground,
          holdingCount: holding,
          goAroundCount: goAround,
        },
        baselineDeviation: null, // populated once baselines exist
        updatedAt: Date.now(),
      };

      scores.push(score);
    }

    // Cache all scores in Redis
    if (redis.status === "ready" && scores.length > 0) {
      const pipeline = redis.pipeline();

      // Store individual airport scores
      for (const s of scores) {
        pipeline.set(
          KEYS.airportPressure(s.airportIcao),
          JSON.stringify(s),
          "EX",
          120
        );
      }

      // Store aggregated scores
      pipeline.set(KEYS.allPressureScores, JSON.stringify(scores), "EX", 120);

      await pipeline.exec();

      // Publish update
      await publishEvent(CHANNELS.pressureUpdates, {
        count: scores.length,
        timestamp: Date.now(),
      });
    }

    // Write to Supabase every 10th tick (~2.5 min)
    if (tickCount % 10 === 0) {
      for (const s of scores) {
        if (s.pressureScore > 0) {
          await insertPressureSnapshot({
            airport_icao: s.airportIcao,
            airport_name: s.airportName,
            pressure_score: s.pressureScore,
            inbound_count: s.components.inboundCount,
            outbound_count: s.components.outboundCount,
            ground_count: s.components.groundCount,
            holding_count: s.components.holdingCount,
            go_around_count: s.components.goAroundCount,
            recorded_at: new Date().toISOString(),
          });
        }
      }
      console.log(
        `  [PressureCalc] Saved ${scores.filter((s) => s.pressureScore > 0).length} pressure snapshots`
      );
    }

    if (scores.length > 0) {
      const top = scores
        .sort((a, b) => b.pressureScore - a.pressureScore)
        .slice(0, 3);
      console.log(
        `  [PressureCalc] Top: ${top.map((s) => `${s.airportIcao}=${s.pressureScore}`).join(", ")}`
      );
    }
  }
}
