/**
 * Shared AI utilities for OpenRouter API calls and rate limiting.
 */

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const MODEL = "google/gemini-3.1-flash-lite-preview";

/**
 * Call OpenRouter API with a system prompt and user message.
 * Server-side only (uses process.env).
 */
export async function callOpenRouter(
  systemPrompt: string,
  userMessage: string,
  maxTokens: number = 400,
  title: string = "Flight Tracker"
): Promise<string> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error("OPENROUTER_API_KEY not configured");

  const response = await fetch(OPENROUTER_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "http://localhost:3000",
      "X-Title": title,
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: maxTokens,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMessage },
      ],
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    console.error(`OpenRouter error (${title}):`, err);
    throw new Error(`AI call failed: ${response.status}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content ?? "";
}

/**
 * Call OpenRouter with multi-turn conversation history.
 */
export async function callOpenRouterChat(
  systemPrompt: string,
  messages: Array<{ role: "user" | "assistant"; content: string }>,
  maxTokens: number = 500,
  title: string = "Flight Tracker"
): Promise<string> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error("OPENROUTER_API_KEY not configured");

  const response = await fetch(OPENROUTER_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "http://localhost:3000",
      "X-Title": title,
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: maxTokens,
      messages: [
        { role: "system", content: systemPrompt },
        ...messages,
      ],
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    console.error(`OpenRouter chat error (${title}):`, err);
    throw new Error(`AI chat failed: ${response.status}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content ?? "";
}

/**
 * Parse JSON from LLM response (handles markdown code blocks).
 */
export function parseJsonResponse<T = unknown>(text: string): T {
  let jsonText = text.trim();
  if (jsonText.startsWith("```")) {
    jsonText = jsonText.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
  }
  return JSON.parse(jsonText);
}

// ── Client-side rate limiting ──────────────────────────────────────────

interface DailyUsage {
  date: string;
  count: number;
}

function getTodayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

export function getUsageToday(featureKey: string): number {
  if (typeof window === "undefined") return 0;
  try {
    const raw = localStorage.getItem(featureKey);
    if (!raw) return 0;
    const usage: DailyUsage = JSON.parse(raw);
    if (usage.date !== getTodayKey()) return 0;
    return usage.count;
  } catch {
    return 0;
  }
}

export function incrementUsage(featureKey: string): number {
  const today = getTodayKey();
  const current = getUsageToday(featureKey);
  const newCount = current + 1;
  localStorage.setItem(
    featureKey,
    JSON.stringify({ date: today, count: newCount })
  );
  return newCount;
}

export function checkRateLimit(featureKey: string, dailyLimit: number): boolean {
  return getUsageToday(featureKey) < dailyLimit;
}
