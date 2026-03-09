import { NextRequest, NextResponse } from "next/server";

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

export async function POST(request: NextRequest) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "OPENROUTER_API_KEY not configured" },
      { status: 500 }
    );
  }

  try {
    const { query } = await request.json();

    const systemPrompt = `You are a flight search query parser. Convert natural language queries about flights into structured JSON filter criteria.

Available filter fields:
- callsign: string (ICAO callsign, e.g. "UAL123")
- airline: string (airline name or ICAO prefix, e.g. "United" or "UAL")
- altitude_min: number (feet)
- altitude_max: number (feet)
- heading_min: number (0-360 degrees, north=0/360, east=90, south=180, west=270)
- heading_max: number (0-360 degrees)
- speed_min: number (knots)
- speed_max: number (knots)
- origin_country: string (country name)
- near_location: { lat: number, lon: number, radius_nm: number } (well-known locations)
- on_ground: boolean
- category: number[] (0=unknown,2=light,3=small,4=large,5=high-vortex,6=heavy,7=high-perf,8=rotorcraft)

For heading directions: North=350-10, NE=10-80, East=80-100, SE=100-170, South=170-190, SW=190-260, West=260-280, NW=280-350.

For well-known locations, use approximate coordinates:
- Mumbai: 19.09, 72.87
- Delhi: 28.56, 77.10
- Bangalore: 12.97, 77.59
- Chennai: 13.08, 80.27
- Kolkata: 22.65, 88.45
- London Heathrow: 51.47, -0.46
- JFK New York: 40.64, -73.78
- LAX Los Angeles: 33.94, -118.41
- Dubai: 25.25, 55.36
- Singapore: 1.36, 103.99
- Tokyo Narita: 35.76, 140.39
- Sydney: -33.95, 151.18
- Frankfurt: 50.03, 8.57
- Paris CDG: 49.01, 2.55

Return ONLY valid JSON. No explanation. Only include fields the query specifies.
Default radius for "near" queries is 50nm.`;

    const response = await fetch(OPENROUTER_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "http://localhost:3000",
        "X-Title": "Flight Tracker",
      },
      body: JSON.stringify({
        model: "google/gemini-3.1-flash-lite-preview",
        max_tokens: 200,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: query },
        ],
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      console.error("OpenRouter search error:", err);
      return NextResponse.json(
        { error: "AI search parsing failed" },
        { status: 502 }
      );
    }

    const data = await response.json();
    const text = data.choices?.[0]?.message?.content ?? "{}";

    // Extract JSON from response (handle markdown code blocks)
    let jsonText = text.trim();
    if (jsonText.startsWith("```")) {
      jsonText = jsonText.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
    }

    const filters = JSON.parse(jsonText);
    return NextResponse.json({ filters, raw_query: query });
  } catch (error) {
    console.error("Search parse error:", error);
    return NextResponse.json(
      { error: "Failed to parse search query" },
      { status: 500 }
    );
  }
}
