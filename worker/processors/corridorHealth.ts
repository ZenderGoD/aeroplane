import type { Processor } from "./base";
import type { FlightState } from "../../src/types/flight";
import type { Corridor, CorridorHealth } from "../../src/types/corridor";
import { redis, KEYS, publishEvent, CHANNELS } from "../../src/lib/redis";
import { insertCorridorSnapshot } from "../../src/lib/db/queries";
import * as turf from "@turf/turf";
import type { Feature, Polygon, MultiPolygon } from "geojson";

type CorridorPolygon = Feature<Polygon | MultiPolygon>;

// Define major air corridors (airport pairs with buffer width)
const CORRIDORS: Corridor[] = [
  // Indian domestic
  { id: "VIDP-VABB", name: "Delhi - Mumbai", originIcao: "VIDP", destinationIcao: "VABB", originLat: 28.5562, originLon: 77.1000, destLat: 19.0896, destLon: 72.8656, bufferNm: 40 },
  { id: "VIDP-VOBL", name: "Delhi - Bangalore", originIcao: "VIDP", destinationIcao: "VOBL", originLat: 28.5562, originLon: 77.1000, destLat: 13.1979, destLon: 77.7063, bufferNm: 40 },
  { id: "VIDP-VECC", name: "Delhi - Kolkata", originIcao: "VIDP", destinationIcao: "VECC", originLat: 28.5562, originLon: 77.1000, destLat: 22.6547, destLon: 88.4467, bufferNm: 40 },
  { id: "VABB-VOBL", name: "Mumbai - Bangalore", originIcao: "VABB", destinationIcao: "VOBL", originLat: 19.0896, originLon: 72.8656, destLat: 13.1979, destLon: 77.7063, bufferNm: 30 },
  { id: "VABB-VOHY", name: "Mumbai - Hyderabad", originIcao: "VABB", destinationIcao: "VOHY", originLat: 19.0896, originLon: 72.8656, destLat: 17.2403, destLon: 78.4294, bufferNm: 30 },
  { id: "VIDP-VOHY", name: "Delhi - Hyderabad", originIcao: "VIDP", destinationIcao: "VOHY", originLat: 28.5562, originLon: 77.1000, destLat: 17.2403, destLon: 78.4294, bufferNm: 40 },
  { id: "VOBL-VOMM", name: "Bangalore - Chennai", originIcao: "VOBL", destinationIcao: "VOMM", originLat: 13.1979, originLon: 77.7063, destLat: 12.9900, destLon: 80.1693, bufferNm: 25 },
  { id: "VIDP-VOMM", name: "Delhi - Chennai", originIcao: "VIDP", destinationIcao: "VOMM", originLat: 28.5562, originLon: 77.1000, destLat: 12.9900, destLon: 80.1693, bufferNm: 40 },
  // International
  { id: "EGLL-KJFK", name: "London - New York", originIcao: "EGLL", destinationIcao: "KJFK", originLat: 51.4700, originLon: -0.4543, destLat: 40.6413, destLon: -73.7781, bufferNm: 60 },
  { id: "OMDB-EGLL", name: "Dubai - London", originIcao: "OMDB", destinationIcao: "EGLL", originLat: 25.2528, originLon: 55.3644, destLat: 51.4700, destLon: -0.4543, bufferNm: 50 },
  { id: "VIDP-OMDB", name: "Delhi - Dubai", originIcao: "VIDP", destinationIcao: "OMDB", originLat: 28.5562, originLon: 77.1000, destLat: 25.2528, destLon: 55.3644, bufferNm: 40 },
  { id: "VABB-OMDB", name: "Mumbai - Dubai", originIcao: "VABB", destinationIcao: "OMDB", originLat: 19.0896, originLon: 72.8656, destLat: 25.2528, destLon: 55.3644, bufferNm: 40 },
  { id: "WSSS-VHHH", name: "Singapore - Hong Kong", originIcao: "WSSS", destinationIcao: "VHHH", originLat: 1.3644, originLon: 103.9915, destLat: 22.3080, destLon: 113.9185, bufferNm: 40 },
  { id: "VIDP-WSSS", name: "Delhi - Singapore", originIcao: "VIDP", destinationIcao: "WSSS", originLat: 28.5562, originLon: 77.1000, destLat: 1.3644, destLon: 103.9915, bufferNm: 50 },
];

// Cache corridor polygons (computed once)
const corridorPolygons = new Map<string, CorridorPolygon>();

function getCorridorPolygon(corridor: Corridor) {
  const cached = corridorPolygons.get(corridor.id);
  if (cached) return cached;

  // Create a line between origin and destination
  const line = turf.lineString([
    [corridor.originLon, corridor.originLat],
    [corridor.destLon, corridor.destLat],
  ]);

  // Buffer the line by the corridor width (convert nm to km: 1nm = 1.852km)
  const bufferKm = corridor.bufferNm * 1.852;
  const polygon = turf.buffer(line, bufferKm, { units: "kilometers" });

  if (polygon) {
    corridorPolygons.set(corridor.id, polygon);
  }
  return polygon;
}

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

export class CorridorHealthProcessor implements Processor {
  name = "CorridorHealth";

  async process(flights: FlightState[], tickCount: number): Promise<void> {
    // Run every 4th tick (~60s)
    if (tickCount % 4 !== 0) return;

    const healthScores: CorridorHealth[] = [];

    for (const corridor of CORRIDORS) {
      const polygon = getCorridorPolygon(corridor);
      if (!polygon) continue;

      const corridorFlights: FlightState[] = [];

      for (const f of flights) {
        if (f.latitude === null || f.longitude === null || f.onGround) continue;

        try {
          const pt = turf.point([f.longitude, f.latitude]);
          if (turf.booleanPointInPolygon(pt, polygon)) {
            corridorFlights.push(f);
          }
        } catch {
          // Skip invalid geometries
        }
      }

      if (corridorFlights.length === 0) continue;

      // Compute metrics
      let totalAlt = 0;
      let altCount = 0;
      let totalSpeed = 0;
      let speedCount = 0;
      let anomalyCount = 0;

      for (const f of corridorFlights) {
        if (f.baroAltitude !== null) {
          totalAlt += f.baroAltitude;
          altCount++;
        }
        if (f.velocity !== null) {
          totalSpeed += f.velocity * 1.94384; // m/s to knots
          speedCount++;
        }
        // Count anomalous behavior
        if (f.squawk === "7500" || f.squawk === "7600" || f.squawk === "7700") {
          anomalyCount++;
        }
        if (f.verticalRate !== null && f.verticalRate < -10.16) {
          anomalyCount++; // rapid descent
        }
        if (f.velocity !== null && f.velocity < 100 * 0.5144 && f.baroAltitude !== null && f.baroAltitude > 3048) {
          anomalyCount++; // too slow at high altitude
        }
      }

      // Average spacing between flights in corridor
      let avgSpacing: number | null = null;
      if (corridorFlights.length >= 2) {
        let totalSpacing = 0;
        let spacingCount = 0;
        for (let i = 0; i < corridorFlights.length - 1; i++) {
          for (let j = i + 1; j < corridorFlights.length; j++) {
            const fi = corridorFlights[i];
            const fj = corridorFlights[j];
            if (fi.latitude && fi.longitude && fj.latitude && fj.longitude) {
              totalSpacing += distNm(fi.latitude, fi.longitude, fj.latitude, fj.longitude);
              spacingCount++;
            }
          }
        }
        if (spacingCount > 0) {
          avgSpacing = Math.round((totalSpacing / spacingCount) * 10) / 10;
        }
      }

      // Compute health score (100 = healthy, 0 = disrupted)
      let healthScore = 100;

      // Penalize for high density (>10 flights in corridor)
      if (corridorFlights.length > 10) {
        healthScore -= Math.min(30, (corridorFlights.length - 10) * 3);
      }

      // Penalize for tight spacing (< 20nm average)
      if (avgSpacing !== null && avgSpacing < 20) {
        healthScore -= Math.min(25, Math.round((20 - avgSpacing) * 2));
      }

      // Penalize for anomalies
      healthScore -= anomalyCount * 10;

      healthScore = Math.max(0, Math.min(100, healthScore));

      // Determine status
      let status: CorridorHealth["status"] = "normal";
      if (healthScore < 30) status = "disrupted";
      else if (healthScore < 50) status = "congested";
      else if (healthScore < 70) status = "compressed";

      const health: CorridorHealth = {
        corridorId: corridor.id,
        corridorName: corridor.name,
        flightCount: corridorFlights.length,
        avgAltitude: altCount > 0 ? Math.round(totalAlt / altCount) : null,
        avgSpeed: speedCount > 0 ? Math.round(totalSpeed / speedCount) : null,
        avgSpacingNm: avgSpacing,
        anomalyCount,
        healthScore,
        status,
        updatedAt: Date.now(),
      };

      healthScores.push(health);
    }

    // Cache in Redis
    if (redis.status === "ready" && healthScores.length > 0) {
      const pipeline = redis.pipeline();

      for (const h of healthScores) {
        pipeline.set(
          KEYS.corridorHealth(h.corridorId),
          JSON.stringify(h),
          "EX",
          120
        );
      }

      pipeline.set(
        KEYS.allCorridorHealth,
        JSON.stringify(healthScores),
        "EX",
        120
      );

      await pipeline.exec();

      await publishEvent(CHANNELS.corridorUpdates, {
        count: healthScores.length,
        timestamp: Date.now(),
      });
    }

    // Write to Supabase every 10th tick (~2.5 min)
    if (tickCount % 10 === 0) {
      for (const h of healthScores) {
        await insertCorridorSnapshot({
          corridor_id: h.corridorId,
          corridor_name: h.corridorName,
          flight_count: h.flightCount,
          avg_altitude: h.avgAltitude,
          avg_speed: h.avgSpeed,
          avg_spacing_nm: h.avgSpacingNm,
          anomaly_count: h.anomalyCount,
          health_score: h.healthScore,
          recorded_at: new Date().toISOString(),
        });
      }
      console.log(
        `  [CorridorHealth] Saved ${healthScores.length} corridor snapshots`
      );
    }

    if (healthScores.length > 0) {
      const active = healthScores.filter((h) => h.flightCount > 0);
      console.log(
        `  [CorridorHealth] ${active.length} active corridors, worst: ${
          active.length > 0
            ? active.sort((a, b) => a.healthScore - b.healthScore)[0].corridorId +
              "=" +
              active.sort((a, b) => a.healthScore - b.healthScore)[0].healthScore
            : "none"
        }`
      );
    }
  }
}
