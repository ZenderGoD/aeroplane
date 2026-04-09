/**
 * Open Glider Network (OGN) client — connects to the APRS stream
 * at aprs.glidernet.org:14580 to receive positions from FLARM,
 * OGN trackers, FANET devices, PilotAware, SafeSky, etc.
 *
 * These are primarily:
 *  - Gliders
 *  - Ultralights
 *  - Paragliders / hang gliders (FANET)
 *  - Light GA aircraft with FLARM
 *  - Some training aircraft
 *
 * Protocol: APRS-IS (text-based TCP stream)
 * Connection: aprs.glidernet.org:14580
 * Auth: None required (use -1 as passcode for read-only)
 */

import * as net from "net";
import type { FlightState } from "@/types/flight";

// ── OGN Device Database (cached) ────────────────────────────────────
interface OgnDevice {
  deviceType: string;  // F=FLARM, O=OGN, I=ICAO, T=FANET
  deviceId: string;
  registration: string;
  callsign: string;
  aircraftModel: string;
  tracked: boolean;
  identified: boolean;
}

let ognDeviceDb = new Map<string, OgnDevice>();
let ddbLastFetch = 0;
const DDB_CACHE_DURATION = 6 * 60 * 60 * 1000; // 6 hours

async function ensureDeviceDb(): Promise<void> {
  const now = Date.now();
  if (ognDeviceDb.size > 0 && now - ddbLastFetch < DDB_CACHE_DURATION) return;

  try {
    const res = await fetch("http://ddb.glidernet.org/download/?j=1", {
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) return;

    const data = await res.json();
    if (!data?.devices || !Array.isArray(data.devices)) return;

    const newDb = new Map<string, OgnDevice>();
    for (const d of data.devices) {
      if (d.device_id) {
        newDb.set(d.device_id.toLowerCase(), {
          deviceType: d.device_type || "",
          deviceId: d.device_id,
          registration: d.registration || "",
          callsign: d.cn || "",
          aircraftModel: d.aircraft_model || "",
          tracked: d.tracked !== false,
          identified: d.identified !== false,
        });
      }
    }

    ognDeviceDb = newDb;
    ddbLastFetch = now;
    console.log(`[OGN] Loaded ${newDb.size} devices from DDB`);
  } catch {
    console.warn("[OGN] Failed to fetch device database");
  }
}

// ── APRS message parser ─────────────────────────────────────────────
// Format: CALLSIGN>TOCALL,qAS,RECEIVER:/HHMMSS[h]DDMM.MMN/DDDMM.MME'CCC/SSS/A=AAAAAA ...
// Example: FLARM:DEVICE_ID>APRS,qAS,RECEIVER:/120000h4800.00N/01100.00E'090/050/A=003000

const APRS_POSITION_REGEX =
  /^([^>]+)>([^,]+),[^:]+:\/(\d{6})h(\d{4}\.\d{2})(N|S).(\d{5}\.\d{2})(E|W).(\d{3})\/(\d{3})\/A=(\d{6})/;

export function parseAprsPosition(line: string): FlightState | null {
  if (line.startsWith("#") || !line.includes(">")) return null;

  const match = line.match(APRS_POSITION_REGEX);
  if (!match) return null;

  const [, sender, , timeStr, latDMS, latDir, lonDMS, lonDir, course, speed, altitude] = match;

  // Parse latitude (DDMM.MM → decimal degrees)
  const latDeg = parseInt(latDMS.substring(0, 2), 10);
  const latMin = parseFloat(latDMS.substring(2));
  let lat = latDeg + latMin / 60;
  if (latDir === "S") lat = -lat;

  // Parse longitude (DDDMM.MM → decimal degrees)
  const lonDeg = parseInt(lonDMS.substring(0, 3), 10);
  const lonMin = parseFloat(lonDMS.substring(3));
  let lon = lonDeg + lonMin / 60;
  if (lonDir === "W") lon = -lon;

  // Parse altitude (feet → meters)
  const altFeet = parseInt(altitude, 10);
  const altMeters = altFeet * 0.3048;

  // Parse speed (knots → m/s)
  const speedKnots = parseInt(speed, 10);
  const speedMs = speedKnots * 0.514444;

  // Parse heading
  const heading = parseInt(course, 10);

  // Extract device ID from sender (format: "FLR" + hex ID, or "OGN" + hex ID, or "ICA" + hex)
  const deviceMatch = sender.match(/^(FLR|OGN|ICA|PAW|SKY|FNT)([0-9A-F]{6})$/i);
  const deviceId = deviceMatch ? deviceMatch[2].toLowerCase() : sender.toLowerCase();
  const devicePrefix = deviceMatch ? deviceMatch[1].toUpperCase() : "";

  // Look up in OGN device database
  const device = ognDeviceDb.get(deviceId);

  // Build ICAO24-like ID (prefix with "ogn-" to avoid collision with real ICAO hex)
  const icao24 = `ogn-${deviceId}`;

  // Extract climb rate from the APRS comment if present
  let verticalRate: number | null = null;
  const climbMatch = line.match(/\+(\d+)fpm|-(\d+)fpm|([+-]\d+)fpm/);
  if (climbMatch) {
    const fpm = parseInt(climbMatch[0].replace("fpm", ""), 10);
    verticalRate = fpm * 0.00508; // fpm → m/s
  }

  const now = Math.floor(Date.now() / 1000);

  return {
    icao24,
    callsign: device?.callsign || device?.registration || sender,
    originCountry: "",
    timePosition: now,
    lastContact: now,
    longitude: lon,
    latitude: lat,
    baroAltitude: altMeters,
    onGround: altFeet < 100 && speedKnots < 5,
    velocity: speedMs,
    trueTrack: heading,
    verticalRate,
    geoAltitude: altMeters, // OGN reports GPS altitude
    squawk: null,
    category: devicePrefix === "FNT" ? 2 : 2, // Light aircraft / glider
    dataSource: "ogn",
    signalType: "ogn",
    registration: device?.registration || undefined,
    typeCode: undefined,
    aircraftDesc: device?.aircraftModel || undefined,
    positionSource: `ogn_${devicePrefix.toLowerCase() || "unknown"}`,
  };
}

// ── OGN APRS connection manager ─────────────────────────────────────
const OGN_HOST = "aprs.glidernet.org";
const OGN_PORT = 14580;
const OGN_APP_NAME = "AeroIntel";
const OGN_APP_VERSION = "1.0";

let ognSocket: net.Socket | null = null;
let ognConnected = false;
let ognReconnectTimer: ReturnType<typeof setTimeout> | null = null;
let ognFlightCache = new Map<string, FlightState>();
let ognLastUpdate = 0;
let ognFilterLat = 0;
let ognFilterLon = 0;
let ognFilterRadius = 250; // nautical miles

/**
 * Start the OGN APRS connection. Call once at server startup.
 * Positions are cached and merged into flight data on demand.
 */
export function startOgnConnection(lat?: number, lon?: number, radiusNm?: number): void {
  if (ognSocket) return; // Already connected

  if (lat !== undefined) ognFilterLat = lat;
  if (lon !== undefined) ognFilterLon = lon;
  if (radiusNm !== undefined) ognFilterRadius = radiusNm;

  // Load device database first
  ensureDeviceDb();

  connectAprs();
}

function connectAprs(): void {
  if (ognSocket) {
    ognSocket.destroy();
    ognSocket = null;
  }

  console.log(`[OGN] Connecting to ${OGN_HOST}:${OGN_PORT}...`);

  const socket = net.createConnection(OGN_PORT, OGN_HOST);
  socket.setEncoding("utf-8");
  socket.setTimeout(120_000); // 2 min timeout

  let buffer = "";

  socket.on("connect", () => {
    ognConnected = true;
    console.log("[OGN] Connected to APRS server");

    // Login (read-only, no auth needed)
    const filter = ognFilterLat && ognFilterLon
      ? ` filter r/${ognFilterLat.toFixed(1)}/${ognFilterLon.toFixed(1)}/${ognFilterRadius}`
      : "";
    const loginLine = `user ${OGN_APP_NAME} pass -1 vers ${OGN_APP_NAME} ${OGN_APP_VERSION}${filter}\r\n`;
    socket.write(loginLine);
  });

  socket.on("data", (data: string) => {
    buffer += data;
    const lines = buffer.split("\n");
    buffer = lines.pop() || ""; // Keep incomplete line in buffer

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;

      const flight = parseAprsPosition(trimmed);
      if (flight) {
        ognFlightCache.set(flight.icao24, flight);
        ognLastUpdate = Date.now();
      }
    }

    // Prune stale entries (older than 5 minutes)
    const staleThreshold = Math.floor(Date.now() / 1000) - 300;
    for (const [id, f] of ognFlightCache) {
      if (f.lastContact < staleThreshold) {
        ognFlightCache.delete(id);
      }
    }
  });

  socket.on("timeout", () => {
    // Send keepalive
    socket.write("#keepalive\r\n");
  });

  socket.on("error", (err: Error) => {
    console.warn(`[OGN] Socket error: ${err.message}`);
    ognConnected = false;
  });

  socket.on("close", () => {
    console.log("[OGN] Connection closed, reconnecting in 30s...");
    ognConnected = false;
    ognSocket = null;
    // Reconnect after delay
    if (ognReconnectTimer) clearTimeout(ognReconnectTimer);
    ognReconnectTimer = setTimeout(connectAprs, 30_000);
  });

  ognSocket = socket;
}

/**
 * Get current OGN aircraft positions.
 * Returns all aircraft seen in the last 5 minutes.
 */
export function getOgnFlights(): FlightState[] {
  return Array.from(ognFlightCache.values());
}

/**
 * Get OGN connection status
 */
export function getOgnStatus(): {
  connected: boolean;
  aircraftCount: number;
  lastUpdate: number;
} {
  return {
    connected: ognConnected,
    aircraftCount: ognFlightCache.size,
    lastUpdate: ognLastUpdate,
  };
}

/**
 * Update the OGN geographic filter (for when the user changes view).
 * Reconnects with a new filter if the center changed significantly.
 */
export function updateOgnFilter(lat: number, lon: number, radiusNm: number): void {
  const distDeg = Math.sqrt(
    (lat - ognFilterLat) ** 2 + (lon - ognFilterLon) ** 2,
  );
  // Only reconnect if center moved >2 degrees
  if (distDeg > 2 || Math.abs(radiusNm - ognFilterRadius) > 50) {
    ognFilterLat = lat;
    ognFilterLon = lon;
    ognFilterRadius = radiusNm;

    if (ognSocket) {
      ognSocket.destroy(); // Will trigger reconnect with new filter
    }
  }
}

/**
 * Stop the OGN connection gracefully.
 */
export function stopOgnConnection(): void {
  if (ognReconnectTimer) {
    clearTimeout(ognReconnectTimer);
    ognReconnectTimer = null;
  }
  if (ognSocket) {
    ognSocket.destroy();
    ognSocket = null;
  }
  ognConnected = false;
}
