import { NextRequest, NextResponse } from "next/server";

// In-memory cache: key -> { data, timestamp }
const photoCache = new Map<string, { data: unknown; timestamp: number }>();
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

export async function GET(request: NextRequest) {
  const icao24 = request.nextUrl.searchParams.get("icao24");
  const reg = request.nextUrl.searchParams.get("reg");

  if (!icao24 && !reg) {
    return NextResponse.json(
      { error: "icao24 or reg parameter required" },
      { status: 400 }
    );
  }

  const cacheKey = `${icao24 ?? ""}:${reg ?? ""}`;
  const now = Date.now();

  const cached = photoCache.get(cacheKey);
  if (cached && now - cached.timestamp < CACHE_TTL) {
    return NextResponse.json(cached.data);
  }

  try {
    let photoData = null;

    // Try planespotters.net public API
    if (icao24) {
      photoData = await fetchPlanespotters(`hex/${icao24}`);
    }
    if (!photoData && reg) {
      photoData = await fetchPlanespotters(`reg/${reg}`);
    }

    const result = photoData
      ? {
          url: photoData.src ?? photoData.url ?? "",
          thumbnailUrl:
            photoData.thumbnail_large?.src ??
            photoData.thumbnail?.src ??
            photoData.src ??
            photoData.url ??
            "",
          photographer: photoData.photographer ?? null,
          source: "planespotters.net",
          link: photoData.link ?? null,
        }
      : null;

    photoCache.set(cacheKey, { data: result, timestamp: now });
    return NextResponse.json(result);
  } catch {
    if (cached) return NextResponse.json(cached.data);
    return NextResponse.json(null);
  }
}

async function fetchPlanespotters(
  path: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): Promise<any | null> {
  try {
    const res = await fetch(
      `https://api.planespotters.net/pub/photos/${path}`,
      { headers: { Accept: "application/json" }, cache: "no-store" }
    );
    if (!res.ok) return null;
    const data = await res.json();
    return data?.photos?.[0] ?? null;
  } catch {
    return null;
  }
}
