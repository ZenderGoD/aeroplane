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
    const body = await request.json();
    const { flight, meta, airport, weather } = body;

    const systemPrompt = `You are an aviation enthusiast and flight tracker narrator. Given real-time flight data, write an engaging 3-5 sentence narrative about this flight. Include: likely route/destination based on airport data and heading, fun facts about the aircraft type if known, airline context, current weather conditions at the nearest airport, and aviation explanations (why this altitude, what the speed means in everyday terms). Be concise, informative, and engaging. Use a warm, knowledgeable tone. Do not speculate about emergencies or safety issues.`;

    const userMessage = `Flight data:
- Callsign: ${flight.callsign || "Unknown"}
- ICAO24: ${flight.icao24}
- Origin Country: ${flight.originCountry}
- Position: ${flight.latitude?.toFixed(4)}, ${flight.longitude?.toFixed(4)}
- Altitude: ${flight.baroAltitude ? Math.round(flight.baroAltitude * 3.28084) + " ft" : "N/A"}
- Ground Speed: ${flight.velocity ? Math.round(flight.velocity * 1.94384) + " kts" : "N/A"}
- Heading: ${flight.trueTrack ? Math.round(flight.trueTrack) + "°" : "N/A"}
- Vertical Rate: ${flight.verticalRate ? Math.round(flight.verticalRate * 196.85) + " fpm" : "N/A"}
- On Ground: ${flight.onGround}
- Squawk: ${flight.squawk || "N/A"}
${
  meta
    ? `
Aircraft metadata:
- Type: ${meta.type || "Unknown"}
- ICAO Type Code: ${meta.typeCode || "Unknown"}
- Registration: ${meta.registration || "Unknown"}
- Operator: ${meta.owner || "Unknown"}
- Manufacturer: ${meta.manufacturer || "Unknown"}`
    : "No aircraft metadata available."
}
${
  airport?.nearest
    ? `
Airport context:
- Nearest Airport: ${airport.nearest.airport.name} (${airport.nearest.airport.icao}) - ${airport.nearest.distanceNm}nm away, ${airport.nearest.airport.city}, ${airport.nearest.airport.country}${airport.departure ? `\n- Est. Departure: ${airport.departure.airport.name} (${airport.departure.airport.icao}), ${airport.departure.airport.city}, ${airport.departure.airport.country}` : ""}`
    : ""
}
${
  weather
    ? `
Weather at ${weather.station}:
- Flight Category: ${weather.flightCategory}
- Conditions: ${weather.conditions?.join(", ") || "Clear"}
- Temperature: ${weather.temperature}°C
- Wind: ${weather.windDirection}° at ${weather.windSpeed} kts${weather.windGust ? `, gusts ${weather.windGust} kts` : ""}
- Visibility: ${weather.visibility} SM`
    : ""
}`;

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
        max_tokens: 300,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userMessage },
        ],
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      console.error("OpenRouter narrate error:", err);
      return NextResponse.json(
        { error: "AI narration failed" },
        { status: 502 }
      );
    }

    const data = await response.json();
    const text = data.choices?.[0]?.message?.content ?? "";

    return NextResponse.json({ narration: text });
  } catch (error) {
    console.error("Narration error:", error);
    return NextResponse.json(
      { error: "Failed to generate narration" },
      { status: 500 }
    );
  }
}
