import { NextRequest, NextResponse } from "next/server";

const OPENSKY_URL = "https://opensky-network.org/api/states/all";
const TOKEN_URL =
  "https://auth.opensky-network.org/auth/realms/opensky-network/protocol/openid-connect/token";

// ── OAuth2 Token Manager ──────────────────────────────────────────────
let accessToken: string | null = null;
let tokenExpiresAt = 0;
const TOKEN_REFRESH_MARGIN = 30_000; // Refresh 30s before expiry

async function getAccessToken(): Promise<string | null> {
  const clientId = process.env.OPENSKY_CLIENT_ID;
  const clientSecret = process.env.OPENSKY_CLIENT_SECRET;

  if (!clientId || !clientSecret) return null;

  const now = Date.now();

  // Return cached token if still valid
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
      cache: "no-store",
    });

    if (!res.ok) {
      console.error("OpenSky token error:", res.status, await res.text());
      accessToken = null;
      return null;
    }

    const data = await res.json();
    accessToken = data.access_token;
    // expires_in is in seconds
    tokenExpiresAt = now + (data.expires_in ?? 1800) * 1000;
    return accessToken;
  } catch (err) {
    console.error("OpenSky token fetch failed:", err);
    accessToken = null;
    return null;
  }
}

// ── Per-region flight data cache ──────────────────────────────────────
const regionCache = new Map<string, { data: unknown; timestamp: number }>();
const CACHE_TTL = 15_000; // 15 seconds
const STALE_TTL = 300_000; // Serve stale up to 5 minutes

// ── Rate limit tracking ──────────────────────────────────────────────
let rateLimitedUntil = 0;
let quotaExhausted = false;
let rateLimitMessage = "";
const RATE_LIMIT_BACKOFF = 30_000;

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  const params = new URLSearchParams();
  for (const key of ["lamin", "lomin", "lamax", "lomax"]) {
    const val = searchParams.get(key);
    if (val) params.set(key, val);
  }

  const cacheKey = params.toString() || "__global__";
  const now = Date.now();

  // Return fresh cached data if available
  const cached = regionCache.get(cacheKey);
  if (cached && now - cached.timestamp < CACHE_TTL) {
    return NextResponse.json(cached.data, {
      headers: {
        "X-Data-Source": "cache",
        "X-Cache-Age": String(now - cached.timestamp),
      },
    });
  }

  // If we're in rate-limit backoff, serve stale immediately
  if (now < rateLimitedUntil) {
    if (cached && now - cached.timestamp < STALE_TTL) {
      return NextResponse.json(cached.data, {
        headers: {
          "X-Data-Source": "stale",
          "X-Rate-Limited": "true",
          "X-Quota-Exhausted": quotaExhausted ? "true" : "false",
          "X-Rate-Limit-Message": rateLimitMessage || "",
          "X-Cache-Age": String(now - cached.timestamp),
        },
      });
    }
    return NextResponse.json(
      {
        error:
          rateLimitMessage || "Rate limited by OpenSky. Waiting to retry...",
        rateLimited: true,
        quotaExhausted,
        retryAfter: Math.ceil((rateLimitedUntil - now) / 1000),
      },
      { status: 429, headers: { "X-Rate-Limited": "true" } }
    );
  }

  const url =
    cacheKey !== "__global__"
      ? `${OPENSKY_URL}?${params.toString()}`
      : OPENSKY_URL;

  // Build request headers with OAuth2 Bearer token (if credentials set)
  const headers: HeadersInit = {};
  const token = await getAccessToken();
  const hasAuth = !!token;
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  try {
    const response = await fetch(url, { cache: "no-store", headers });

    if (response.status === 429) {
      const retryAfterSec = parseInt(
        response.headers.get("x-rate-limit-retry-after-seconds") ?? "0",
        10
      );
      const backoffMs =
        retryAfterSec > 0
          ? Math.min(retryAfterSec * 1000, 86_400_000)
          : RATE_LIMIT_BACKOFF;
      rateLimitedUntil = now + backoffMs;

      const retryHours =
        retryAfterSec > 3600 ? Math.ceil(retryAfterSec / 3600) : null;

      quotaExhausted = retryAfterSec > 3600;
      rateLimitMessage = retryHours
        ? `Daily API quota exhausted. Resets in ~${retryHours}h.${!hasAuth ? " Add OpenSky credentials for 10× higher limits." : ""}`
        : `Rate limited by OpenSky API.${!hasAuth ? " Create a free account for higher limits." : ""}`;

      if (cached && now - cached.timestamp < STALE_TTL) {
        return NextResponse.json(cached.data, {
          headers: {
            "X-Data-Source": "stale",
            "X-Rate-Limited": "true",
            "X-Cache-Age": String(now - cached.timestamp),
          },
        });
      }
      return NextResponse.json(
        {
          error: rateLimitMessage,
          rateLimited: true,
          retryAfter: retryAfterSec || 30,
          quotaExhausted: retryAfterSec > 3600,
        },
        { status: 429 }
      );
    }

    if (!response.ok) {
      if (cached && now - cached.timestamp < STALE_TTL) {
        return NextResponse.json(cached.data, {
          headers: { "X-Data-Source": "stale" },
        });
      }
      return NextResponse.json(
        { error: `OpenSky API error: ${response.status}` },
        { status: response.status }
      );
    }

    const data = await response.json();

    if (data?.states) {
      regionCache.set(cacheKey, { data, timestamp: now });
      rateLimitedUntil = 0;
      quotaExhausted = false;
      rateLimitMessage = "";
    }

    return NextResponse.json(data, {
      headers: { "X-Data-Source": "fresh" },
    });
  } catch {
    if (cached && now - cached.timestamp < STALE_TTL) {
      return NextResponse.json(cached.data, {
        headers: { "X-Data-Source": "stale" },
      });
    }
    return NextResponse.json(
      { error: "Failed to fetch flight data" },
      { status: 500 }
    );
  }
}
