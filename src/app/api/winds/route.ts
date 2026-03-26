import { NextResponse } from "next/server";

// ── Types ────────────────────────────────────────────────────────────
export interface WindLevel {
  altitude: number;
  windDir: number;
  windSpeed: number;
  temp: number;
}

export interface WindAloftStation {
  stationId: string;
  lat: number;
  lon: number;
  levels: WindLevel[];
}

// ── Flight level → altitude mapping ─────────────────────────────────
const FL_TO_FEET: Record<string, number> = {
  "030": 3_000,
  "060": 6_000,
  "090": 9_000,
  "120": 12_000,
  "180": 18_000,
  "240": 24_000,
  "300": 30_000,
  "340": 34_000,
  "390": 39_000,
  "450": 45_000,
  "530": 53_000,
};

// ── In-memory cache ─────────────────────────────────────────────────
let cachedData: WindAloftStation[] | null = null;
let cacheTimestamp = 0;
const CACHE_TTL = 30 * 60 * 1000; // 30 minutes

// ── Station coordinates (NOAA reporting stations) ───────────────────
// Many NOAA wind aloft stations don't include lat/lon in the JSON
// response, so we maintain a lookup for the most common ones.
const STATION_COORDS: Record<string, [number, number]> = {
  // US stations
  ABI: [32.41, -99.68], ABQ: [35.04, -106.61], ABR: [45.45, -98.42],
  ALS: [37.44, -105.87], AMA: [35.22, -101.71], BFF: [41.89, -103.48],
  BHM: [33.57, -86.75], BIL: [45.81, -108.54], BIS: [46.77, -100.75],
  BNA: [36.12, -86.69], BOI: [43.57, -116.22], BRO: [25.91, -97.42],
  BUF: [42.94, -78.74], CHS: [32.90, -80.04], CRP: [27.77, -97.50],
  DAL: [32.85, -96.85], DDC: [37.77, -99.97], DEN: [39.86, -104.67],
  DFW: [32.90, -97.04], DLH: [46.84, -92.19], DRT: [29.37, -100.93],
  DSM: [41.53, -93.66], ELP: [31.81, -106.38], EYW: [24.56, -81.76],
  FAT: [36.78, -119.72], FMN: [36.74, -108.23], GGW: [48.21, -106.61],
  GJT: [39.12, -108.53], GRB: [44.48, -88.13], GTF: [47.48, -111.37],
  HAT: [35.27, -75.55], HNL: [21.32, -157.92], IAD: [38.95, -77.46],
  ICT: [37.65, -97.43], ILN: [39.42, -83.79], INL: [48.57, -93.40],
  JAN: [32.32, -90.08], JAX: [30.49, -81.69], JFK: [40.64, -73.78],
  LAS: [36.08, -115.17], LAX: [33.94, -118.41], LBF: [41.13, -100.68],
  LCH: [30.13, -93.22], LIT: [34.73, -92.22], MCI: [39.30, -94.71],
  MDW: [41.79, -87.75], MEM: [35.05, -89.98], MFR: [42.37, -122.87],
  MIA: [25.79, -80.29], MKE: [42.95, -87.90], MLB: [28.10, -80.65],
  MOB: [30.69, -88.24], MSP: [44.88, -93.22], OAK: [37.72, -122.22],
  OKC: [35.39, -97.60], OMA: [41.30, -95.89], ONT: [34.06, -117.60],
  ORD: [41.98, -87.90], PDX: [45.59, -122.60], PHX: [33.43, -112.01],
  PIR: [44.38, -100.29], PIT: [40.50, -80.23], PUB: [38.29, -104.50],
  RAP: [44.04, -103.05], RDU: [35.88, -78.79], RNO: [39.50, -119.77],
  SAT: [29.53, -98.47], SDF: [38.17, -85.73], SEA: [47.45, -122.31],
  SFO: [37.62, -122.38], SGF: [37.24, -93.39], SHV: [32.45, -93.83],
  SLC: [40.79, -111.98], SPI: [39.84, -89.68], SSM: [46.47, -84.36],
  STL: [38.75, -90.37], SYR: [43.11, -76.11], TPA: [27.98, -82.53],
  TUS: [32.12, -110.94], TVC: [44.74, -85.58], YKM: [46.57, -120.54],
  // Canadian stations
  YEG: [53.31, -113.58], YOW: [45.32, -75.67], YQB: [46.79, -71.39],
  YUL: [45.47, -73.74], YVR: [49.19, -123.18], YWG: [49.91, -97.24],
  YYC: [51.11, -114.02], YYZ: [43.68, -79.63], YZV: [48.53, -71.27],
  // European / transatlantic reference points
  EGLL: [51.47, -0.46], LFPG: [49.01, 2.55], EDDF: [50.03, 8.57],
  EHAM: [52.31, 4.76], LEMD: [40.47, -3.56], LIRF: [41.80, 12.25],
};

// ── NOAA API fetch + parse ──────────────────────────────────────────
const NOAA_URL =
  "https://aviationweather.gov/api/data/windtemp?region=all&level=low,high&fcst=06&format=json";

/**
 * Parse a NOAA wind/temp entry.  The API returns objects like:
 * { station, lat?, lon?, ... "030": "9900+05", "060": "2508+01", ... }
 * The coded value format: DDSStt where DD = direction/10, SS = speed, tt = temp
 * Speed > 99: DD is direction/10 + 50, actual speed = SS + 100
 * "9900" means light & variable
 */
function parseWindCode(code: string): { windDir: number; windSpeed: number; temp: number } | null {
  if (!code || code === "     " || code.trim().length === 0) return null;

  const clean = code.replace(/\s/g, "");

  // Separate wind and temp parts
  let windPart: string;
  let tempPart: string | null = null;

  // Check for temp sign
  const signIdx = clean.search(/[+-]/);
  if (signIdx >= 4) {
    windPart = clean.slice(0, signIdx);
    tempPart = clean.slice(signIdx);
  } else {
    windPart = clean.slice(0, 4);
    tempPart = clean.length > 4 ? clean.slice(4) : null;
  }

  if (windPart.length < 4) return null;

  let dir = parseInt(windPart.slice(0, 2), 10);
  let speed = parseInt(windPart.slice(2, 4), 10);

  // Light & variable
  if (dir === 99 && speed === 0) {
    dir = 0;
    speed = 0;
  } else if (dir >= 51 && dir <= 86) {
    // Speed > 100 kts encoding
    dir = (dir - 50) * 10;
    speed += 100;
  } else {
    dir *= 10;
  }

  let temp = 0;
  if (tempPart) {
    temp = parseInt(tempPart, 10);
    if (isNaN(temp)) temp = 0;
  }

  if (isNaN(dir) || isNaN(speed)) return null;

  return { windDir: dir, windSpeed: speed, temp };
}

async function fetchFromNOAA(): Promise<WindAloftStation[]> {
  const res = await fetch(NOAA_URL, {
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(10_000),
  });

  if (!res.ok) throw new Error(`NOAA returned ${res.status}`);

  const data = await res.json();

  if (!Array.isArray(data) || data.length === 0) {
    throw new Error("Unexpected NOAA response format");
  }

  const stations: WindAloftStation[] = [];

  for (const entry of data) {
    const id: string = entry.station || entry.stationId || "";
    if (!id) continue;

    // Get coordinates from response or lookup
    let lat = parseFloat(entry.lat ?? entry.latitude ?? "");
    let lon = parseFloat(entry.lon ?? entry.longitude ?? "");

    if (isNaN(lat) || isNaN(lon)) {
      const coords = STATION_COORDS[id.toUpperCase()];
      if (!coords) continue; // Skip stations we can't locate
      [lat, lon] = coords;
    }

    const levels: WindLevel[] = [];

    for (const [flStr, altFeet] of Object.entries(FL_TO_FEET)) {
      const code = entry[flStr] ?? entry[`fl${flStr}`] ?? entry[`FL${flStr}`];
      if (!code) continue;

      const parsed = parseWindCode(String(code));
      if (!parsed) continue;

      levels.push({
        altitude: altFeet,
        windDir: parsed.windDir,
        windSpeed: parsed.windSpeed,
        temp: parsed.temp,
      });
    }

    if (levels.length > 0) {
      stations.push({ stationId: id.toUpperCase(), lat, lon, levels });
    }
  }

  if (stations.length < 5) {
    throw new Error(`Only ${stations.length} stations parsed — falling back`);
  }

  return stations;
}

// ── Fallback data ───────────────────────────────────────────────────
function generateFallback(): WindAloftStation[] {
  // Typical jet-stream-like wind patterns for ~30 major stations
  const fallbackStations: {
    id: string;
    lat: number;
    lon: number;
    base: { dir: number; speed: number };
  }[] = [
    { id: "SEA", lat: 47.45, lon: -122.31, base: { dir: 260, speed: 45 } },
    { id: "PDX", lat: 45.59, lon: -122.60, base: { dir: 255, speed: 42 } },
    { id: "SFO", lat: 37.62, lon: -122.38, base: { dir: 270, speed: 55 } },
    { id: "LAX", lat: 33.94, lon: -118.41, base: { dir: 265, speed: 50 } },
    { id: "LAS", lat: 36.08, lon: -115.17, base: { dir: 270, speed: 60 } },
    { id: "PHX", lat: 33.43, lon: -112.01, base: { dir: 260, speed: 48 } },
    { id: "DEN", lat: 39.86, lon: -104.67, base: { dir: 280, speed: 70 } },
    { id: "SLC", lat: 40.79, lon: -111.98, base: { dir: 275, speed: 65 } },
    { id: "ABQ", lat: 35.04, lon: -106.61, base: { dir: 270, speed: 55 } },
    { id: "DFW", lat: 32.90, lon: -97.04, base: { dir: 255, speed: 45 } },
    { id: "OKC", lat: 35.39, lon: -97.60, base: { dir: 265, speed: 50 } },
    { id: "MCI", lat: 39.30, lon: -94.71, base: { dir: 280, speed: 75 } },
    { id: "MSP", lat: 44.88, lon: -93.22, base: { dir: 290, speed: 65 } },
    { id: "ORD", lat: 41.98, lon: -87.90, base: { dir: 285, speed: 80 } },
    { id: "STL", lat: 38.75, lon: -90.37, base: { dir: 275, speed: 72 } },
    { id: "MEM", lat: 35.05, lon: -89.98, base: { dir: 260, speed: 55 } },
    { id: "BNA", lat: 36.12, lon: -86.69, base: { dir: 265, speed: 60 } },
    { id: "ATL", lat: 33.64, lon: -84.43, base: { dir: 270, speed: 52 } },
    { id: "MIA", lat: 25.79, lon: -80.29, base: { dir: 240, speed: 30 } },
    { id: "TPA", lat: 27.98, lon: -82.53, base: { dir: 250, speed: 35 } },
    { id: "JAX", lat: 30.49, lon: -81.69, base: { dir: 255, speed: 40 } },
    { id: "RDU", lat: 35.88, lon: -78.79, base: { dir: 275, speed: 62 } },
    { id: "IAD", lat: 38.95, lon: -77.46, base: { dir: 280, speed: 85 } },
    { id: "JFK", lat: 40.64, lon: -73.78, base: { dir: 285, speed: 90 } },
    { id: "BOS", lat: 42.36, lon: -71.01, base: { dir: 290, speed: 88 } },
    { id: "BUF", lat: 42.94, lon: -78.74, base: { dir: 280, speed: 78 } },
    { id: "PIT", lat: 40.50, lon: -80.23, base: { dir: 280, speed: 76 } },
    { id: "SDF", lat: 38.17, lon: -85.73, base: { dir: 270, speed: 68 } },
    { id: "DSM", lat: 41.53, lon: -93.66, base: { dir: 285, speed: 70 } },
    { id: "BOI", lat: 43.57, lon: -116.22, base: { dir: 270, speed: 55 } },
    { id: "HNL", lat: 21.32, lon: -157.92, base: { dir: 60, speed: 25 } },
  ];

  const altitudes = [3000, 6000, 9000, 12000, 18000, 24000, 30000, 34000, 39000, 45000, 53000];

  return fallbackStations.map(({ id, lat, lon, base }) => ({
    stationId: id,
    lat,
    lon,
    levels: altitudes.map((alt) => {
      // Wind generally increases with altitude up to ~35,000ft then tapers
      const altFactor =
        alt <= 34000
          ? 0.3 + (alt / 34000) * 0.7
          : 1.0 - ((alt - 34000) / 19000) * 0.3;

      // Add some variation per level
      const speedVariation = Math.sin(alt / 5000) * 8;
      const dirVariation = Math.cos(alt / 7000) * 12;

      const speed = Math.max(
        0,
        Math.round(base.speed * altFactor + speedVariation)
      );
      const dir = ((base.dir + Math.round(dirVariation)) % 360 + 360) % 360;

      // Temperature decreases ~2C per 1000ft, then stabilizes in stratosphere
      const temp =
        alt <= 36000
          ? Math.round(15 - (alt / 1000) * 2)
          : Math.round(-56 + ((alt - 36000) / 1000) * 0.3);

      return { altitude: alt, windDir: dir, windSpeed: speed, temp };
    }),
  }));
}

// ── Route handler ───────────────────────────────────────────────────
export async function GET() {
  const now = Date.now();

  // Return cached data if still fresh
  if (cachedData && now - cacheTimestamp < CACHE_TTL) {
    return NextResponse.json(cachedData, {
      headers: {
        "Cache-Control": "public, max-age=1800, stale-while-revalidate=3600",
        "X-Data-Source": "cache",
      },
    });
  }

  let stations: WindAloftStation[];
  let source = "noaa";

  try {
    stations = await fetchFromNOAA();
  } catch (err) {
    console.warn("[winds] NOAA fetch failed, using fallback:", (err as Error).message);
    stations = generateFallback();
    source = "fallback";
  }

  // Update cache
  cachedData = stations;
  cacheTimestamp = now;

  return NextResponse.json(stations, {
    headers: {
      "Cache-Control": "public, max-age=1800, stale-while-revalidate=3600",
      "X-Data-Source": source,
    },
  });
}
