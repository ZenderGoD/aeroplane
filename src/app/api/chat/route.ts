import { NextRequest, NextResponse } from "next/server";
import { callOpenRouterChat } from "@/lib/ai";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { messages, context } = body;

    const systemPrompt = `You are an Airspace Intelligence Copilot. You have access to REAL-TIME aviation data and answer questions about the current airspace situation. Be concise, data-driven, and helpful.

CURRENT AIRSPACE DATA:
${formatContext(context)}

RULES:
- Always ground answers in the data above
- Reference specific numbers and airports
- If the data doesn't contain enough info to answer, say so
- Keep answers under 150 words
- End each response with 2 suggested follow-up questions in format: [FOLLOWUPS: "question1" | "question2"]
- Be conversational but professional`;

    // Only keep last 6 messages for context window management
    const recentMessages = (messages || []).slice(-6);

    const text = await callOpenRouterChat(
      systemPrompt,
      recentMessages,
      500,
      "Flight Tracker - Copilot"
    );

    // Extract followups
    const followupMatch = text.match(/\[FOLLOWUPS?:\s*"([^"]+)"\s*\|\s*"([^"]+)"\s*\]/i);
    const suggestedFollowups = followupMatch
      ? [followupMatch[1], followupMatch[2]]
      : undefined;
    const reply = text.replace(/\[FOLLOWUPS?:.*?\]/gi, "").trim();

    return NextResponse.json({ reply, suggestedFollowups });
  } catch (error) {
    console.error("Chat error:", error);
    return NextResponse.json(
      { error: "Failed to generate response" },
      { status: 502 }
    );
  }
}

function formatContext(ctx: Record<string, unknown> | undefined): string {
  if (!ctx) return "No data available.";

  const parts: string[] = [];

  const fs = ctx.flightSummary as { total?: number; airborne?: number; onGround?: number; anomalyCount?: number; topUnstable?: Array<{ callsign: string; score: number; factors: string }> } | undefined;
  if (fs) {
    parts.push(`FLIGHTS: ${fs.total || 0} total (${fs.airborne || 0} airborne, ${fs.onGround || 0} ground), ${fs.anomalyCount || 0} anomalies`);
    if (fs.topUnstable?.length) {
      parts.push("TOP UNSTABLE: " + fs.topUnstable.slice(0, 5).map(f => `${f.callsign}:${f.score}`).join(", "));
    }
  }

  const airports = ctx.airports as Array<{ icao: string; name: string; pressure: number; baselineDeviation: number | null; components: Record<string, number> }> | undefined;
  if (airports?.length) {
    parts.push("AIRPORTS:\n" + airports.map(a =>
      `${a.icao}(${a.name}): P=${Math.round(a.pressure)}, IN=${a.components?.inboundCount || 0}, OUT=${a.components?.outboundCount || 0}, HLD=${a.components?.holdingCount || 0}, G/A=${a.components?.goAroundCount || 0}${a.baselineDeviation != null ? `, Dev=${a.baselineDeviation > 0 ? "+" : ""}${a.baselineDeviation.toFixed(1)}σ` : ""}`
    ).join("\n"));
  }

  const corridors = ctx.corridors as Array<{ name: string; health: number; status: string; flights: number; trend: string }> | undefined;
  if (corridors?.length) {
    parts.push("CORRIDORS:\n" + corridors.map(c =>
      `${c.name}: H=${Math.round(c.health)}, ${c.status}, ${c.flights} flights, ${c.trend}`
    ).join("\n"));
  }

  const events = ctx.events as Array<{ type: string; severity: string; message: string; airport: string | null }> | undefined;
  if (events?.length) {
    parts.push("EVENTS:\n" + events.slice(0, 10).map(e =>
      `[${e.severity}] ${e.airport || "N/A"}: ${e.message}`
    ).join("\n"));
  }

  const ta = ctx.turnarounds as { activeCount?: number; avgMinutes?: number | null } | undefined;
  if (ta) {
    parts.push(`TURNAROUNDS: ${ta.activeCount || 0} active${ta.avgMinutes ? `, avg ${Math.round(ta.avgMinutes)}min` : ""}`);
  }

  return parts.join("\n\n") || "No data available.";
}
