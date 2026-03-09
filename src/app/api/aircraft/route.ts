import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const icao24 = request.nextUrl.searchParams.get("icao24");
  if (!icao24) {
    return NextResponse.json({ error: "icao24 required" }, { status: 400 });
  }

  try {
    const response = await fetch(
      `https://hexdb.io/api/v1/aircraft/${icao24}`,
      { next: { revalidate: 86400 } } // cache for 24h — aircraft metadata rarely changes
    );

    if (!response.ok) {
      return NextResponse.json(null);
    }

    const data = await response.json();
    return NextResponse.json({
      registration: data.Registration || null,
      type: data.Type || null,
      typeCode: data.ICAOTypeCode || null,
      manufacturer: data.Manufacturer || null,
      owner: data.RegisteredOwners || null,
    });
  } catch {
    return NextResponse.json(null);
  }
}
