"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { checkRateLimit, incrementUsage, getUsageToday } from "@/lib/ai";

const FEATURE_KEY = "copilot-usage";
const DAILY_LIMIT = 20;

interface Message {
  role: "user" | "assistant";
  content: string;
}

/**
 * Fetch fresh context snapshot from existing API endpoints.
 * This avoids duplicating SWR/SSE hooks in page.tsx.
 */
async function fetchContext() {
  const [pressureRes, corridorRes, turnaroundRes] = await Promise.allSettled([
    fetch("/api/pressure").then(r => r.ok ? r.json() : null),
    fetch("/api/corridors").then(r => r.ok ? r.json() : null),
    fetch("/api/turnarounds").then(r => r.ok ? r.json() : null),
  ]);

  const pressure = pressureRes.status === "fulfilled" ? pressureRes.value : null;
  const corridorData = corridorRes.status === "fulfilled" ? corridorRes.value : null;
  const turnaroundData = turnaroundRes.status === "fulfilled" ? turnaroundRes.value : null;

  const airportScores = Array.isArray(pressure?.scores) ? pressure.scores
    : Array.isArray(pressure) ? pressure : [];
  const corridorList = Array.isArray(corridorData?.corridors) ? corridorData.corridors
    : Array.isArray(corridorData) ? corridorData : [];
  const turnaroundActive = Array.isArray(turnaroundData?.active) ? turnaroundData.active : [];

  return {
    airports: airportScores.slice(0, 12).map((p: Record<string, unknown>) => ({
      icao: p.airportIcao || p.airport_icao,
      name: p.airportName || p.airport_name || "",
      pressure: p.pressureScore || p.pressure_score || 0,
      baselineDeviation: null,
      components: p.components || {},
    })),
    corridors: corridorList.slice(0, 10).map((c: Record<string, unknown>) => ({
      name: c.corridorName || c.corridor_name || c.corridorId || "",
      health: c.healthScore || c.health_score || 0,
      status: c.status || "normal",
      flights: c.flightCount || c.flight_count || 0,
      trend: "stable",
    })),
    events: [],
    turnarounds: {
      activeCount: turnaroundActive.length,
      avgMinutes: null,
    },
  };
}

export default function AirspaceCopilot() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [suggestedFollowups, setSuggestedFollowups] = useState<string[]>([]);
  const [usedToday, setUsedToday] = useState(() => getUsageToday(FEATURE_KEY));
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const remaining = Math.max(0, DAILY_LIMIT - usedToday);

  // Auto-scroll on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  // Focus input when opened
  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  const sendMessage = useCallback(async (text?: string) => {
    const msg = text || input.trim();
    if (!msg || isLoading) return;
    if (!checkRateLimit(FEATURE_KEY, DAILY_LIMIT)) return;

    setInput("");
    const userMsg: Message = { role: "user", content: msg };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setSuggestedFollowups([]);
    setIsLoading(true);

    try {
      // Fetch fresh context on each message send
      const context = await fetchContext();

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: newMessages.slice(-6),
          context,
        }),
      });
      if (!res.ok) throw new Error("Failed");
      const data = await res.json();
      setMessages((prev) => [...prev, { role: "assistant", content: data.reply }]);
      if (data.suggestedFollowups) setSuggestedFollowups(data.suggestedFollowups);
      setUsedToday(incrementUsage(FEATURE_KEY));
    } catch {
      setMessages((prev) => [...prev, { role: "assistant", content: "Sorry, I couldn't process that. Try again." }]);
    } finally {
      setIsLoading(false);
    }
  }, [input, messages, isLoading]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // Floating button when closed
  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-[999] w-12 h-12 rounded-2xl shadow-lg flex items-center justify-center transition-all hover:scale-105"
        style={{ background: 'var(--surface-3)', border: '1px solid var(--border-default)' }}
        title="Airspace Copilot"
        onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'rgba(148,163,184,0.5)'; e.currentTarget.style.boxShadow = '0 0 16px rgba(148,163,184,0.25)'; }}
        onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border-default)'; e.currentTarget.style.boxShadow = ''; }}
      >
        <svg className="w-6 h-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
        </svg>
        {messages.length > 0 && (
          <span className="absolute -top-1 -right-1 w-4 h-4 bg-slate-200 rounded-full text-[9px] text-slate-900 flex items-center justify-center font-bold">
            {messages.filter(m => m.role === "assistant").length}
          </span>
        )}
      </button>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 z-[999] w-[350px] h-[500px] flex flex-col rounded-2xl backdrop-blur-xl shadow-2xl shadow-black/50 overflow-hidden" style={{ background: 'var(--surface-1)', border: '1px solid var(--border-default)' }}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3" style={{ background: 'var(--surface-2)', borderBottom: '1px solid var(--border-default)' }}>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-slate-400 animate-pulse" />
          <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Airspace Copilot</span>
          <span className="text-[9px]" style={{ color: 'var(--text-faint)' }}>{remaining} left</span>
        </div>
        <button
          onClick={() => setOpen(false)}
          className="p-1 rounded transition-colors"
          style={{ color: 'var(--text-muted)' }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--surface-3)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 py-3 space-y-3">
        {messages.length === 0 && (
          <div className="text-center py-8">
            <div className="w-10 h-10 mx-auto mb-2 rounded-full bg-slate-800/30 flex items-center justify-center">
              <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
              </svg>
            </div>
            <p className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>Ask about your airspace</p>
            <p className="text-[10px]" style={{ color: 'var(--text-faint)' }}>Try: &quot;Which airport is busiest?&quot;</p>
          </div>
        )}

        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[85%] rounded-xl px-3 py-2 text-xs leading-relaxed ${
                msg.role === "user"
                  ? "bg-slate-600/20 text-slate-100 rounded-br-sm"
                  : "rounded-bl-sm"
              }`}
              style={msg.role === "assistant" ? { background: 'var(--surface-2)', color: 'var(--text-secondary)' } : undefined}
            >
              {msg.content}
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex justify-start">
            <div className="rounded-xl rounded-bl-sm px-3 py-2" style={{ background: 'var(--surface-2)' }}>
              <div className="flex gap-1">
                <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
            </div>
          </div>
        )}

        {/* Suggested followups */}
        {suggestedFollowups.length > 0 && !isLoading && (
          <div className="flex flex-wrap gap-1.5">
            {suggestedFollowups.map((q, i) => (
              <button
                key={i}
                onClick={() => sendMessage(q)}
                className="text-[10px] text-slate-300 bg-slate-800/20 hover:bg-slate-800/40 border border-slate-700/30 px-2 py-1 rounded-full transition-colors"
              >
                {q}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Input */}
      <div className="px-3 py-2" style={{ borderTop: '1px solid var(--border-default)', background: 'var(--surface-2)' }}>
        <div className="flex items-center gap-2">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={remaining > 0 ? "Ask about the airspace..." : "Daily limit reached"}
            disabled={remaining === 0}
            className="flex-1 text-xs rounded-lg px-3 py-2 outline-none disabled:opacity-40"
            style={{ background: 'var(--surface-3)', color: 'var(--text-primary)', '--tw-ring-color': 'var(--border-accent)' } as React.CSSProperties}
            onFocus={(e) => { e.currentTarget.style.boxShadow = '0 0 0 1px var(--border-accent)'; }}
            onBlur={(e) => { e.currentTarget.style.boxShadow = 'none'; }}
          />
          <button
            onClick={() => sendMessage()}
            disabled={!input.trim() || isLoading || remaining === 0}
            className="p-2 rounded-lg bg-slate-600/20 hover:bg-slate-600/30 text-slate-400 disabled:opacity-30 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
