import type { FlightState } from "../src/types/flight";
import { parseAirplanesLive, AIRPLANES_LIVE_URL } from "../src/lib/airplaneslive";

const OPENSKY_URL = "https://opensky-network.org/api/states/all";
const TOKEN_URL =
  "https://auth.opensky-network.org/auth/realms/opensky-network/protocol/openid-connect/token";
const TOKEN_REFRESH_MARGIN = 30_000;

// ── Strategic center points for global airplanes.live coverage ──────
// Each entry: [lat, lon, radius_nm]
const GLOBAL_TILES: [number, number, number][] = [
  [39, -98, 250],     // US central
  [25, -80, 250],     // US east / Caribbean
  [50, 10, 250],      // Europe central
  [55, -3, 250],      // UK / North Atlantic
  [35, 105, 250],     // East Asia
  [25, 55, 250],      // Middle East
  [1, 104, 250],      // Southeast Asia
  [-33, 151, 250],    // Australia / Oceania
];

// ── Airplanes.live rate limiter (1 req/sec stagger) ─────────────────
let lastAirplanesLiveRequest = 0;
const AIRPLANES_LIVE_MIN_INTERVAL = 1_000;

async function throttledFetch(url: string): Promise<Response> {
  const now = Date.now();
  const wait = AIRPLANES_LIVE_MIN_INTERVAL - (now - lastAirplanesLiveRequest);
  if (wait > 0) {
    await new Promise((resolve) => setTimeout(resolve, wait));
  }
  lastAirplanesLiveRequest = Date.now();
  return fetch(url, { cache: "no-store" });
}

// ── OpenSky OAuth2 Token Manager ────────────────────────────────────
let accessToken: string | null = null;
let tokenExpiresAt = 0;

async function getAccessToken(): Promise<string | null> {
  const clientId = process.env.OPENSKY_WORKER_CLIENT_ID ?? process.env.OPENSKY_CLIENT_ID;
  const clientSecret = process.env.OPENSKY_WORKER_CLIENT_SECRET ?? process.env.OPENSKY_CLIENT_SECRET;

  if (!clientId || !clientSecret) return null;

  const now = Date.now();
  if (accessToken && now < tokenExpiresAt - TOKEN_REFRESH_MARGIN) {
    return accessToken;
  }

  try {
    const res = await fetch(TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "client_credentials",
        client_id: clientId,
        client_secret: clientSecret,
      }),
    });

    if (!res.ok) {
      console.error("[Poller] Token error:", res.status);
      accessToken = null;
      return null;
    }

    const data = await res.json();
    accessToken = data.access_token;
    tokenExpiresAt = now + (data.expires_in ?? 1800) * 1000;
    return accessToken;
  } catch (err) {
    console.error("[Poller] Token fetch failed:", err);
    accessToken = null;
    return null;
  }
}

// ── OpenSky state vector parser (local copy for worker) ─────────────
function parseStateVector(raw: unknown[]): FlightState | null {
  const lat = raw[6] as number | null;
  const lon = raw[5] as number | null;
  if (lat === null || lon === null) return null;

  return {
    icao24: raw[0] as string,
    callsign: raw[1] ? (raw[1] as string).trim() : null,
    originCountry: raw[2] as string,
    timePosition: raw[3] as number | null,
    lastContact: raw[4] as number,
    longitude: lon,
    latitude: lat,
    baroAltitude: raw[7] as number | null,
    onGround: raw[8] as boolean,
    velocity: raw[9] as number | null,
    trueTrack: raw[10] as number | null,
    verticalRate: raw[11] as number | null,
    geoAltitude: raw[13] as number | null,
    squawk: raw[14] as string | null,
    category: (raw[17] as number) ?? 0,
    dataSource: "opensky",
  };
}

let rateLimitedUntil = 0;
let consecutiveErrors = 0;

// ── Airplanes.live fetch (global tiles) ─────────────────────────────

async function fetchAirplanesLiveGlobal(): Promise<FlightState[] | null> {
  const allAircraft = new Map<string, FlightState>();

  try {
    for (const [lat, lon, radius] of GLOBAL_TILES) {
      const url = `${AIRPLANES_LIVE_URL}/point/${lat.toFixed(4)}/${lon.toFixed(4)}/${radius}`;
      const res = await throttledFetch(url);

      if (!res.ok) {
        console.warn(`[Poller] airplanes.live tile error: ${res.status} for ${url}`);
        continue;
      }

      const data = await res.json();
      const acList = data?.ac;
      if (!Array.isArray(acList)) continue;

      for (const ac of acList) {
        const parsed = parseAirplanesLive(ac as Record<string, unknown>);
        if (parsed && parsed.icao24) {
          allAircraft.set(parsed.icao24, parsed);
        }
      }
    }

    if (allAircraft.size === 0) return null;

    console.log(
      `[Poller] airplanes.live: ${allAircraft.size} flights from ${GLOBAL_TILES.length} tiles`
    );
    return Array.from(allAircraft.values());
  } catch (err) {
    console.error("[Poller] airplanes.live global fetch failed:", err);
    return null;
  }
}

// ── OpenSky fetch (existing logic) ──────────────────────────────────

async function fetchOpenSkyGlobal(): Promise<FlightState[]> {
  const now = Date.now();

  if (now < rateLimitedUntil) {
    const waitSec = Math.ceil((rateLimitedUntil - now) / 1000);
    console.log(`[Poller] OpenSky rate limited, waiting ${waitSec}s`);
    return [];
  }

  const headers: HeadersInit = {};
  const token = await getAccessToken();
  if (token) headers["Authorization"] = `Bearer ${token}`;

  try {
    const res = await fetch(OPENSKY_URL, { headers, cache: "no-store" });

    if (res.status === 429) {
      const retryAfter = parseInt(
        res.headers.get("x-rate-limit-retry-after-seconds") ?? "30",
        10
      );
      rateLimitedUntil = now + retryAfter * 1000;
      console.warn(`[Poller] OpenSky rate limited for ${retryAfter}s`);
      return [];
    }

    if (!res.ok) {
      consecutiveErrors++;
      console.error(`[Poller] OpenSky API error: ${res.status}`);
      return [];
    }

    consecutiveErrors = 0;
    const data = await res.json();

    if (!data?.states) return [];

    const flights = data.states
      .map((raw: unknown[]) => parseStateVector(raw))
      .filter((f: FlightState | null): f is FlightState => f !== null);

    return flights;
  } catch (err) {
    consecutiveErrors++;
    console.error("[Poller] OpenSky fetch failed:", err);
    return [];
  }
}

// ── Main poller (dual source: airplanes.live primary, OpenSky fallback) ──

export async function pollFlights(): Promise<FlightState[]> {
  // Try airplanes.live first
  const alFlights = await fetchAirplanesLiveGlobal();

  if (alFlights && alFlights.length > 0) {
    console.log(`[Poller] Using airplanes.live: ${alFlights.length} flights`);
    return alFlights;
  }

  // Fall back to OpenSky
  console.log("[Poller] airplanes.live empty/failed, falling back to OpenSky");
  const osFlights = await fetchOpenSkyGlobal();
  if (osFlights.length > 0) {
    console.log(`[Poller] Using OpenSky: ${osFlights.length} flights`);
  }
  return osFlights;
}

// ── Backwards compatibility: keep the old export name as an alias ────
export const pollOpenSky = pollFlights;
