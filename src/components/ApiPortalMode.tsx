"use client";

import React, { useState, useCallback, useMemo, useEffect } from "react";

// ─── Types ──────────────────────────────────────────────────

interface ApiPortalModeProps {
  onExitMode?: () => void;
}

interface Endpoint {
  method: string;
  path: string;
  description: string;
  params: { name: string; type: string; required: boolean; description: string }[];
  exampleResponse: string;
}

interface ApiKey {
  key: string;
  created: string;
  lastUsed: string;
}

type Tab = "docs" | "playground" | "keys" | "pricing" | "examples";
type CodeLang = "javascript" | "python" | "curl";

// ─── Constants ──────────────────────────────────────────────

const ENDPOINTS: Endpoint[] = [
  {
    method: "GET",
    path: "/api/flights",
    description: "Retrieve live flights within a circular area defined by center coordinates and radius.",
    params: [
      { name: "lat", type: "number", required: true, description: "Latitude of the center point" },
      { name: "lon", type: "number", required: true, description: "Longitude of the center point" },
      { name: "radius", type: "number", required: false, description: "Radius in nautical miles (default: 250)" },
    ],
    exampleResponse: JSON.stringify(
      {
        ac: [
          {
            hex: "a1b2c3",
            flight: "UAL1234",
            lat: 40.6413,
            lon: -73.7781,
            alt_baro: 35000,
            gs: 450,
            track: 270,
            squawk: "1200",
            t: "B738",
            r: "N12345",
          },
        ],
        total: 1,
        now: 1711036800,
      },
      null,
      2,
    ),
  },
  {
    method: "GET",
    path: "/api/flights",
    description: "Retrieve live flights within a geographic bounding box.",
    params: [
      { name: "bounds", type: "string", required: true, description: "Bounding box as lat1,lon1,lat2,lon2" },
    ],
    exampleResponse: JSON.stringify(
      {
        ac: [
          {
            hex: "d4e5f6",
            flight: "DAL567",
            lat: 34.0522,
            lon: -118.2437,
            alt_baro: 28000,
            gs: 380,
            track: 90,
            t: "A321",
          },
        ],
        total: 1,
        now: 1711036800,
      },
      null,
      2,
    ),
  },
  {
    method: "GET",
    path: "/api/aircraft/[id]",
    description: "Get detailed information for a single aircraft by hex ID, registration, or callsign.",
    params: [
      { name: "id", type: "string", required: true, description: "Aircraft hex ID, registration, or callsign (path param)" },
    ],
    exampleResponse: JSON.stringify(
      {
        hex: "a1b2c3",
        flight: "UAL1234",
        r: "N12345",
        t: "B738",
        lat: 40.6413,
        lon: -73.7781,
        alt_baro: 35000,
        gs: 450,
        track: 270,
        squawk: "1200",
        nav_altitude_mcp: 36000,
        nav_heading: 275,
        seen: 1.2,
      },
      null,
      2,
    ),
  },
  {
    method: "GET",
    path: "/api/fleet",
    description: "Track all active flights for a specific airline by ICAO code.",
    params: [
      { name: "airline", type: "string", required: true, description: "Airline ICAO code (e.g. AAL, UAL, DAL)" },
    ],
    exampleResponse: JSON.stringify(
      {
        airline: "AAL",
        flights: [
          { hex: "a1b2c3", flight: "AAL100", lat: 40.64, lon: -73.77, alt_baro: 35000, gs: 450 },
          { hex: "d4e5f6", flight: "AAL202", lat: 33.94, lon: -118.40, alt_baro: 28000, gs: 380 },
        ],
        count: 2,
      },
      null,
      2,
    ),
  },
  {
    method: "GET",
    path: "/api/weather",
    description: "Fetch current weather conditions for a geographic position.",
    params: [
      { name: "lat", type: "number", required: true, description: "Latitude" },
      { name: "lon", type: "number", required: true, description: "Longitude" },
    ],
    exampleResponse: JSON.stringify(
      {
        temp_c: 18.5,
        wind_speed_kts: 12,
        wind_dir: 270,
        visibility_sm: 10,
        ceiling_ft: 25000,
        condition: "clear",
        metar: "KJFK 211856Z 27012KT 10SM FEW250 18/08 A3012",
      },
      null,
      2,
    ),
  },
  {
    method: "GET",
    path: "/api/search",
    description: "Search for flights, airports, or aircraft using natural language queries.",
    params: [
      { name: "q", type: "string", required: true, description: "Search query (e.g. 'flights near JFK', 'Boeing 737')" },
    ],
    exampleResponse: JSON.stringify(
      {
        results: [
          { type: "flight", flight: "UAL1234", hex: "a1b2c3", lat: 40.64, lon: -73.77 },
          { type: "airport", icao: "KJFK", name: "John F Kennedy Intl", lat: 40.6413, lon: -73.7781 },
        ],
        query: "flights near JFK",
        count: 2,
      },
      null,
      2,
    ),
  },
  {
    method: "GET",
    path: "/api/corridors",
    description: "Retrieve air corridor health data including traffic density and delay metrics.",
    params: [],
    exampleResponse: JSON.stringify(
      {
        corridors: [
          {
            id: "KJFK-KLAX",
            from: "KJFK",
            to: "KLAX",
            active_flights: 14,
            avg_delay_min: 8,
            health: "nominal",
          },
          {
            id: "KJFK-EGLL",
            from: "KJFK",
            to: "EGLL",
            active_flights: 6,
            avg_delay_min: 22,
            health: "degraded",
          },
        ],
      },
      null,
      2,
    ),
  },
];

const RATE_TIERS = [
  {
    name: "Free",
    price: "$0",
    period: "/month",
    requests: "100 / day",
    features: ["Live flight data", "Basic search", "Weather data", "Community support"],
    highlighted: false,
  },
  {
    name: "Pro",
    price: "$49",
    period: "/month",
    requests: "10,000 / day",
    features: [
      "Everything in Free",
      "Fleet tracking",
      "Corridor health",
      "Historical data (30 days)",
      "Priority support",
      "Webhooks",
    ],
    highlighted: true,
  },
  {
    name: "Enterprise",
    price: "Custom",
    period: "",
    requests: "Unlimited",
    features: [
      "Everything in Pro",
      "Unlimited requests",
      "Real-time streaming",
      "Custom data feeds",
      "SLA guarantee (99.9%)",
      "Dedicated support",
      "On-premise option",
    ],
    highlighted: false,
  },
];

// ─── Helpers ────────────────────────────────────────────────

function generateUUID(): string {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function syntaxHighlightJSON(json: string): string {
  return json.replace(
    /("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+-]?\d+)?)/g,
    (match) => {
      let cls = "json-number"; // number
      if (/^"/.test(match)) {
        if (/:$/.test(match)) {
          cls = "json-key"; // key
        } else {
          cls = "json-string"; // string
        }
      } else if (/true|false/.test(match)) {
        cls = "json-boolean";
      } else if (/null/.test(match)) {
        cls = "json-null";
      }
      return `<span class="${cls}">${match}</span>`;
    },
  );
}

function getCodeExample(endpoint: Endpoint, lang: CodeLang, apiKey: string): string {
  const baseUrl = "https://api.aerointel.dev";
  const paramStr = endpoint.params
    .filter((p) => p.required)
    .map((p) => {
      if (endpoint.path.includes(`[${p.name}]`)) return "";
      const val = p.type === "number" ? "40.6413" : p.name === "airline" ? "AAL" : p.name === "q" ? "flights near JFK" : p.name === "bounds" ? "40.0,-74.5,41.0,-73.0" : "example";
      return `${p.name}=${encodeURIComponent(val)}`;
    })
    .filter(Boolean)
    .join("&");

  const resolvedPath = endpoint.path.replace("[id]", "a1b2c3");
  const fullUrl = `${baseUrl}${resolvedPath}${paramStr ? `?${paramStr}` : ""}`;

  switch (lang) {
    case "javascript":
      return `const response = await fetch("${fullUrl}", {
  headers: {
    "Authorization": "Bearer ${apiKey || "YOUR_API_KEY"}",
    "Content-Type": "application/json"
  }
});

const data = await response.json();
console.log(data);`;
    case "python":
      return `import requests

response = requests.get(
    "${fullUrl}",
    headers={
        "Authorization": "Bearer ${apiKey || "YOUR_API_KEY"}",
        "Content-Type": "application/json"
    }
)

data = response.json()
print(data)`;
    case "curl":
      return `curl -X GET "${fullUrl}" \\
  -H "Authorization: Bearer ${apiKey || "YOUR_API_KEY"}" \\
  -H "Content-Type: application/json"`;
  }
}

// ─── Sub-components ─────────────────────────────────────────

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [text]);

  return (
    <button
      onClick={handleCopy}
      className="flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-md transition-all duration-200"
      style={{
        background: copied ? "var(--border-strong)" : "rgba(148, 163, 184, 0.08)",
        color: copied ? "var(--status-nominal)" : "var(--text-tertiary)",
        border: `1px solid ${copied ? "var(--border-accent)" : "var(--border-subtle)"}`,
      }}
    >
      {copied ? (
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="20 6 9 17 4 12" />
        </svg>
      ) : (
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
        </svg>
      )}
      {copied ? "Copied" : "Copy"}
    </button>
  );
}

function MethodBadge({ method }: { method: string }) {
  const colorMap: Record<string, string> = {
    GET: "var(--status-nominal)",
    POST: "var(--accent-primary)",
    PUT: "var(--status-caution)",
    DELETE: "var(--status-critical)",
  };
  const color = colorMap[method] || "var(--text-muted)";

  return (
    <span
      className="inline-flex items-center px-2 py-0.5 text-xs font-bold rounded"
      style={{
        background: `color-mix(in srgb, ${color} 12%, transparent)`,
        color,
        fontFamily: "'Geist Mono', 'JetBrains Mono', monospace",
        letterSpacing: "0.05em",
      }}
    >
      {method}
    </span>
  );
}

function CodeBlock({ code, lang }: { code: string; lang?: string }) {
  return (
    <div
      className="relative rounded-lg overflow-hidden"
      style={{
        background: "var(--surface-0)",
        border: "1px solid var(--border-subtle)",
      }}
    >
      <div
        className="flex items-center justify-between px-4 py-2"
        style={{ borderBottom: "1px solid var(--border-subtle)" }}
      >
        <span
          className="text-xs font-medium"
          style={{ color: "var(--text-muted)", fontFamily: "'Geist Mono', monospace" }}
        >
          {lang || "json"}
        </span>
        <CopyButton text={code} />
      </div>
      <pre className="p-4 overflow-x-auto text-sm leading-relaxed" style={{ margin: 0 }}>
        <code
          style={{ fontFamily: "'Geist Mono', 'JetBrains Mono', monospace", fontSize: "0.8125rem" }}
          dangerouslySetInnerHTML={{ __html: lang === "json" || !lang ? syntaxHighlightJSON(code) : escapeHtml(code) }}
        />
      </pre>
    </div>
  );
}

function escapeHtml(str: string): string {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// ─── Tab: Documentation ─────────────────────────────────────

function DocsTab() {
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);

  return (
    <div className="space-y-4">
      <div className="mb-6">
        <h2 className="text-lg font-bold mb-1" style={{ color: "var(--text-primary)" }}>
          API Endpoints
        </h2>
        <p className="text-sm" style={{ color: "var(--text-tertiary)" }}>
          All endpoints return JSON. Authenticate via Bearer token in the Authorization header.
        </p>
      </div>

      {ENDPOINTS.map((ep, i) => {
        const isExpanded = expandedIdx === i;
        return (
          <div
            key={`${ep.path}-${i}`}
            className="rounded-xl overflow-hidden transition-all duration-300"
            style={{
              background: "var(--surface-1)",
              border: `1px solid ${isExpanded ? "var(--border-accent)" : "var(--border-default)"}`,
            }}
          >
            <button
              className="w-full flex items-center gap-3 px-5 py-4 text-left transition-colors duration-200 hover:bg-[rgba(148,163,184,0.04)]"
              onClick={() => setExpandedIdx(isExpanded ? null : i)}
            >
              <MethodBadge method={ep.method} />
              <span
                className="text-sm font-semibold flex-1"
                style={{
                  color: "var(--text-primary)",
                  fontFamily: "'Geist Mono', monospace",
                }}
              >
                {ep.path}
                {ep.params.length > 0 && ep.path === "/api/flights" && i === 0 && (
                  <span style={{ color: "var(--text-muted)" }}>?lat=&lon=&radius=</span>
                )}
                {ep.path === "/api/flights" && i === 1 && (
                  <span style={{ color: "var(--text-muted)" }}>?bounds=</span>
                )}
              </span>
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="var(--text-muted)"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="transition-transform duration-200"
                style={{ transform: isExpanded ? "rotate(180deg)" : "rotate(0)" }}
              >
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>

            {isExpanded && (
              <div
                className="px-5 pb-5 space-y-4"
                style={{ borderTop: "1px solid var(--border-subtle)" }}
              >
                <p className="text-sm pt-4" style={{ color: "var(--text-secondary)" }}>
                  {ep.description}
                </p>

                {ep.params.length > 0 && (
                  <div>
                    <h4
                      className="text-xs font-semibold uppercase tracking-wider mb-3"
                      style={{ color: "var(--text-muted)" }}
                    >
                      Parameters
                    </h4>
                    <div
                      className="rounded-lg overflow-hidden"
                      style={{ border: "1px solid var(--border-subtle)" }}
                    >
                      <table className="w-full text-sm">
                        <thead>
                          <tr style={{ background: "var(--surface-0)" }}>
                            <th className="text-left px-4 py-2.5 font-semibold text-xs" style={{ color: "var(--text-muted)" }}>
                              Name
                            </th>
                            <th className="text-left px-4 py-2.5 font-semibold text-xs" style={{ color: "var(--text-muted)" }}>
                              Type
                            </th>
                            <th className="text-left px-4 py-2.5 font-semibold text-xs" style={{ color: "var(--text-muted)" }}>
                              Required
                            </th>
                            <th className="text-left px-4 py-2.5 font-semibold text-xs" style={{ color: "var(--text-muted)" }}>
                              Description
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {ep.params.map((p) => (
                            <tr
                              key={p.name}
                              style={{ borderTop: "1px solid var(--border-subtle)" }}
                            >
                              <td className="px-4 py-2.5">
                                <code
                                  className="text-xs px-1.5 py-0.5 rounded"
                                  style={{
                                    background: "rgba(148, 163, 184, 0.08)",
                                    color: "var(--accent-primary)",
                                    fontFamily: "'Geist Mono', monospace",
                                  }}
                                >
                                  {p.name}
                                </code>
                              </td>
                              <td
                                className="px-4 py-2.5 text-xs"
                                style={{ color: "var(--text-tertiary)", fontFamily: "'Geist Mono', monospace" }}
                              >
                                {p.type}
                              </td>
                              <td className="px-4 py-2.5">
                                {p.required ? (
                                  <span className="text-xs font-medium" style={{ color: "var(--status-caution)" }}>
                                    required
                                  </span>
                                ) : (
                                  <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                                    optional
                                  </span>
                                )}
                              </td>
                              <td className="px-4 py-2.5 text-xs" style={{ color: "var(--text-secondary)" }}>
                                {p.description}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                <div>
                  <h4
                    className="text-xs font-semibold uppercase tracking-wider mb-3"
                    style={{ color: "var(--text-muted)" }}
                  >
                    Example Response
                  </h4>
                  <CodeBlock code={ep.exampleResponse} lang="json" />
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Tab: Playground ────────────────────────────────────────

function PlaygroundTab({ apiKey }: { apiKey: string | null }) {
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [paramValues, setParamValues] = useState<Record<string, string>>({});
  const [response, setResponse] = useState<{
    status: number;
    time: number;
    body: string;
  } | null>(null);
  const [loading, setLoading] = useState(false);

  const endpoint = ENDPOINTS[selectedIdx];

  const handleSend = useCallback(async () => {
    setLoading(true);
    const start = performance.now();

    // Build URL
    let path = endpoint.path.replace("[id]", paramValues["id"] || "a1b2c3");
    const queryParams = endpoint.params
      .filter((p) => !endpoint.path.includes(`[${p.name}]`) && paramValues[p.name])
      .map((p) => `${p.name}=${encodeURIComponent(paramValues[p.name])}`)
      .join("&");
    if (queryParams) path += `?${queryParams}`;

    try {
      const res = await fetch(path);
      const elapsed = performance.now() - start;
      const text = await res.text();
      let formatted: string;
      try {
        formatted = JSON.stringify(JSON.parse(text), null, 2);
      } catch {
        formatted = text;
      }
      setResponse({ status: res.status, time: Math.round(elapsed), body: formatted });
    } catch (err) {
      const elapsed = performance.now() - start;
      setResponse({
        status: 0,
        time: Math.round(elapsed),
        body: JSON.stringify({ error: "Network error", message: String(err) }, null, 2),
      });
    } finally {
      setLoading(false);
    }
  }, [endpoint, paramValues]);

  // Reset params when endpoint changes
  useEffect(() => {
    setParamValues({});
    setResponse(null);
  }, [selectedIdx]);

  const endpointLabels = useMemo(
    () =>
      ENDPOINTS.map((ep, i) => {
        if (ep.path === "/api/flights" && i === 0) return "GET /api/flights (by location)";
        if (ep.path === "/api/flights" && i === 1) return "GET /api/flights (by bounds)";
        return `${ep.method} ${ep.path}`;
      }),
    [],
  );

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold mb-1" style={{ color: "var(--text-primary)" }}>
          API Playground
        </h2>
        <p className="text-sm" style={{ color: "var(--text-tertiary)" }}>
          Test API endpoints directly from the browser. Responses are live.
        </p>
      </div>

      {/* Endpoint selector */}
      <div
        className="rounded-xl p-5 space-y-4"
        style={{ background: "var(--surface-1)", border: "1px solid var(--border-default)" }}
      >
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--text-muted)" }}>
            Endpoint
          </label>
          <select
            value={selectedIdx}
            onChange={(e) => setSelectedIdx(Number(e.target.value))}
            className="w-full px-4 py-2.5 rounded-lg text-sm font-medium cursor-pointer appearance-none"
            style={{
              background: "var(--surface-2)",
              border: "1px solid var(--border-default)",
              color: "var(--text-primary)",
              fontFamily: "'Geist Mono', monospace",
              outline: "none",
            }}
          >
            {endpointLabels.map((label, i) => (
              <option key={i} value={i}>
                {label}
              </option>
            ))}
          </select>
        </div>

        {/* Params */}
        {endpoint.params.length > 0 && (
          <div className="space-y-3">
            <label className="block text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
              Parameters
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {endpoint.params.map((p) => (
                <div key={p.name}>
                  <label className="flex items-center gap-1.5 mb-1.5">
                    <span
                      className="text-xs font-medium"
                      style={{ color: "var(--text-secondary)", fontFamily: "'Geist Mono', monospace" }}
                    >
                      {p.name}
                    </span>
                    {p.required && (
                      <span className="text-xs" style={{ color: "var(--status-critical)" }}>*</span>
                    )}
                  </label>
                  <input
                    type="text"
                    placeholder={p.description}
                    value={paramValues[p.name] || ""}
                    onChange={(e) => setParamValues((prev) => ({ ...prev, [p.name]: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg text-sm transition-colors duration-150"
                    style={{
                      background: "var(--surface-0)",
                      border: "1px solid var(--border-default)",
                      color: "var(--text-primary)",
                      fontFamily: "'Geist Mono', monospace",
                      outline: "none",
                    }}
                    onFocus={(e) => (e.target.style.borderColor = "var(--accent-primary)")}
                    onBlur={(e) => (e.target.style.borderColor = "var(--border-default)")}
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Auth header preview */}
        <div
          className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs"
          style={{
            background: "rgba(148, 163, 184, 0.04)",
            border: "1px solid var(--border-accent)",
            color: "var(--text-tertiary)",
            fontFamily: "'Geist Mono', monospace",
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--accent-primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
          <span>
            Authorization: Bearer{" "}
            <span style={{ color: apiKey ? "var(--status-nominal)" : "var(--text-muted)" }}>
              {apiKey ? `${apiKey.slice(0, 8)}...` : "YOUR_API_KEY"}
            </span>
          </span>
        </div>

        <button
          onClick={handleSend}
          disabled={loading}
          className="flex items-center justify-center gap-2 w-full px-4 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200"
          style={{
            background: loading ? "rgba(148, 163, 184, 0.08)" : "var(--accent-primary)",
            color: loading ? "var(--accent-primary)" : "var(--surface-0)",
            cursor: loading ? "not-allowed" : "pointer",
          }}
        >
          {loading ? (
            <>
              <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
              </svg>
              Sending...
            </>
          ) : (
            <>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="22" y1="2" x2="11" y2="13" />
                <polygon points="22 2 15 22 11 13 2 9 22 2" />
              </svg>
              Send Request
            </>
          )}
        </button>
      </div>

      {/* Response */}
      {response && (
        <div
          className="rounded-xl overflow-hidden"
          style={{ background: "var(--surface-1)", border: "1px solid var(--border-default)" }}
        >
          <div
            className="flex items-center justify-between px-5 py-3"
            style={{ borderBottom: "1px solid var(--border-subtle)" }}
          >
            <div className="flex items-center gap-3">
              <span
                className="text-xs font-bold px-2 py-0.5 rounded"
                style={{
                  background:
                    response.status >= 200 && response.status < 300
                      ? "var(--border-default)"
                      : response.status >= 400
                      ? "var(--border-default)"
                      : "var(--border-default)",
                  color:
                    response.status >= 200 && response.status < 300
                      ? "var(--status-nominal)"
                      : response.status >= 400
                      ? "var(--status-critical)"
                      : "var(--status-caution)",
                  fontFamily: "'Geist Mono', monospace",
                }}
              >
                {response.status || "ERR"}
              </span>
              <span className="text-xs" style={{ color: "var(--text-muted)", fontFamily: "'Geist Mono', monospace" }}>
                {response.time}ms
              </span>
            </div>
            <CopyButton text={response.body} />
          </div>
          <pre
            className="p-5 overflow-auto text-sm leading-relaxed"
            style={{ maxHeight: "400px", margin: 0, background: "var(--surface-0)" }}
          >
            <code
              style={{ fontFamily: "'Geist Mono', 'JetBrains Mono', monospace", fontSize: "0.8125rem" }}
              dangerouslySetInnerHTML={{ __html: syntaxHighlightJSON(response.body) }}
            />
          </pre>
        </div>
      )}
    </div>
  );
}

// ─── Tab: API Keys ──────────────────────────────────────────

function KeysTab({
  apiKey,
  setApiKey,
}: {
  apiKey: string | null;
  setApiKey: (k: string | null) => void;
}) {
  const [showKey, setShowKey] = useState(false);

  const handleGenerate = useCallback(() => {
    const key = `aerointel_${generateUUID().replace(/-/g, "")}`;
    setApiKey(key);
    if (typeof window !== "undefined") {
      localStorage.setItem("aerointel_api_key", key);
      localStorage.setItem("aerointel_key_created", new Date().toISOString());
    }
  }, [setApiKey]);

  const handleRevoke = useCallback(() => {
    setApiKey(null);
    setShowKey(false);
    if (typeof window !== "undefined") {
      localStorage.removeItem("aerointel_api_key");
      localStorage.removeItem("aerointel_key_created");
    }
  }, [setApiKey]);

  // Mock stats
  const stats = useMemo(
    () => ({
      today: apiKey ? Math.floor(Math.random() * 47) : 0,
      month: apiKey ? Math.floor(Math.random() * 1200) + 200 : 0,
      rateLimit: 100,
      remaining: apiKey ? Math.floor(Math.random() * 60) + 40 : 100,
    }),
    [apiKey],
  );

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold mb-1" style={{ color: "var(--text-primary)" }}>
          API Key Management
        </h2>
        <p className="text-sm" style={{ color: "var(--text-tertiary)" }}>
          Generate and manage your API keys for authenticated access.
        </p>
      </div>

      {/* Key display / generate */}
      <div
        className="rounded-xl p-5"
        style={{ background: "var(--surface-1)", border: "1px solid var(--border-default)" }}
      >
        {apiKey ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
                Your API Key
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowKey(!showKey)}
                  className="text-xs px-2.5 py-1 rounded-md transition-colors"
                  style={{
                    background: "rgba(148, 163, 184, 0.08)",
                    color: "var(--text-tertiary)",
                    border: "1px solid var(--border-subtle)",
                  }}
                >
                  {showKey ? "Hide" : "Reveal"}
                </button>
                <CopyButton text={apiKey} />
              </div>
            </div>
            <div
              className="px-4 py-3 rounded-lg font-mono text-sm select-all"
              style={{
                background: "var(--surface-0)",
                border: "1px solid var(--border-subtle)",
                color: showKey ? "var(--accent-primary)" : "var(--text-muted)",
                fontFamily: "'Geist Mono', monospace",
                letterSpacing: showKey ? "0" : "0.15em",
              }}
            >
              {showKey ? apiKey : "\u2022".repeat(40)}
            </div>
            <button
              onClick={handleRevoke}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md transition-colors"
              style={{
                background: "rgba(148, 163, 184, 0.08)",
                color: "var(--status-critical)",
                border: "1px solid rgba(148, 163, 184, 0.15)",
              }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
              </svg>
              Revoke Key
            </button>
          </div>
        ) : (
          <div className="text-center py-8">
            <div
              className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-4"
              style={{ background: "rgba(148, 163, 184, 0.08)", border: "1px solid var(--border-accent)" }}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--accent-primary)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" />
              </svg>
            </div>
            <p className="text-sm mb-1 font-medium" style={{ color: "var(--text-primary)" }}>
              No API key generated
            </p>
            <p className="text-xs mb-5" style={{ color: "var(--text-muted)" }}>
              Generate a key to start making authenticated requests
            </p>
            <button
              onClick={handleGenerate}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200"
              style={{ background: "var(--accent-primary)", color: "var(--surface-0)" }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              Generate API Key
            </button>
          </div>
        )}
      </div>

      {/* Usage Stats */}
      {apiKey && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Today", value: stats.today.toString(), sub: "requests" },
            { label: "This Month", value: stats.month.toLocaleString(), sub: "requests" },
            { label: "Rate Limit", value: `${stats.rateLimit}`, sub: "per day" },
            { label: "Remaining", value: stats.remaining.toString(), sub: "today" },
          ].map((s) => (
            <div
              key={s.label}
              className="rounded-xl p-4"
              style={{ background: "var(--surface-1)", border: "1px solid var(--border-default)" }}
            >
              <p className="text-xs font-medium mb-1" style={{ color: "var(--text-muted)" }}>
                {s.label}
              </p>
              <p
                className="text-xl font-bold"
                style={{
                  color: "var(--text-primary)",
                  fontFamily: "'Geist Mono', monospace",
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {s.value}
              </p>
              <p className="text-xs mt-0.5" style={{ color: "var(--text-faint)" }}>
                {s.sub}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Tab: Pricing ───────────────────────────────────────────

function PricingTab() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold mb-1" style={{ color: "var(--text-primary)" }}>
          Rate Limits & Pricing
        </h2>
        <p className="text-sm" style={{ color: "var(--text-tertiary)" }}>
          Choose the plan that fits your integration needs.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {RATE_TIERS.map((tier) => (
          <div
            key={tier.name}
            className="rounded-xl p-5 flex flex-col transition-all duration-300"
            style={{
              background: tier.highlighted
                ? "linear-gradient(180deg, rgba(148, 163, 184, 0.06) 0%, var(--surface-1) 100%)"
                : "var(--surface-1)",
              border: `1px solid ${tier.highlighted ? "var(--border-accent)" : "var(--border-default)"}`,
              position: "relative",
            }}
          >
            {tier.highlighted && (
              <span
                className="absolute -top-3 left-1/2 -translate-x-1/2 text-xs font-bold px-3 py-1 rounded-full"
                style={{
                  background: "var(--accent-primary)",
                  color: "var(--surface-0)",
                }}
              >
                Popular
              </span>
            )}
            <h3
              className="text-sm font-bold uppercase tracking-wider mb-3"
              style={{ color: tier.highlighted ? "var(--accent-primary)" : "var(--text-muted)" }}
            >
              {tier.name}
            </h3>
            <div className="mb-1">
              <span className="text-3xl font-bold" style={{ color: "var(--text-primary)" }}>
                {tier.price}
              </span>
              {tier.period && (
                <span className="text-sm" style={{ color: "var(--text-muted)" }}>
                  {tier.period}
                </span>
              )}
            </div>
            <p
              className="text-sm font-medium mb-5"
              style={{
                color: "var(--accent-primary)",
                fontFamily: "'Geist Mono', monospace",
              }}
            >
              {tier.requests}
            </p>
            <ul className="space-y-2.5 flex-1">
              {tier.features.map((f) => (
                <li key={f} className="flex items-start gap-2 text-sm" style={{ color: "var(--text-secondary)" }}>
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="var(--status-nominal)"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="mt-0.5 shrink-0"
                  >
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  {f}
                </li>
              ))}
            </ul>
            <button
              className="mt-5 w-full py-2.5 rounded-lg text-sm font-semibold transition-all duration-200"
              style={{
                background: tier.highlighted ? "var(--accent-primary)" : "rgba(148, 163, 184, 0.08)",
                color: tier.highlighted ? "var(--surface-0)" : "var(--text-secondary)",
                border: tier.highlighted ? "none" : "1px solid var(--border-default)",
              }}
            >
              {tier.name === "Enterprise" ? "Contact Sales" : "Get Started"}
            </button>
          </div>
        ))}
      </div>

      {/* Comparison table */}
      <div
        className="rounded-xl overflow-hidden"
        style={{ background: "var(--surface-1)", border: "1px solid var(--border-default)" }}
      >
        <div className="px-5 py-4" style={{ borderBottom: "1px solid var(--border-subtle)" }}>
          <h3 className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>
            Feature Comparison
          </h3>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr style={{ background: "var(--surface-0)" }}>
              <th className="text-left px-5 py-3 font-semibold text-xs" style={{ color: "var(--text-muted)" }}>
                Feature
              </th>
              <th className="text-center px-5 py-3 font-semibold text-xs" style={{ color: "var(--text-muted)" }}>
                Free
              </th>
              <th className="text-center px-5 py-3 font-semibold text-xs" style={{ color: "var(--accent-primary)" }}>
                Pro
              </th>
              <th className="text-center px-5 py-3 font-semibold text-xs" style={{ color: "var(--text-muted)" }}>
                Enterprise
              </th>
            </tr>
          </thead>
          <tbody>
            {[
              ["Daily requests", "100", "10,000", "Unlimited"],
              ["Live flight data", "check", "check", "check"],
              ["Fleet tracking", "cross", "check", "check"],
              ["Corridor health", "cross", "check", "check"],
              ["Historical data", "cross", "30 days", "Unlimited"],
              ["Real-time streaming", "cross", "cross", "check"],
              ["Webhooks", "cross", "check", "check"],
              ["SLA guarantee", "cross", "cross", "99.9%"],
              ["Support", "Community", "Priority", "Dedicated"],
            ].map(([feature, free, pro, enterprise]) => (
              <tr key={feature} style={{ borderTop: "1px solid var(--border-subtle)" }}>
                <td className="px-5 py-3 font-medium" style={{ color: "var(--text-secondary)" }}>
                  {feature}
                </td>
                {[free, pro, enterprise].map((val, i) => (
                  <td key={i} className="text-center px-5 py-3">
                    {val === "check" ? (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--status-nominal)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="inline-block">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    ) : val === "cross" ? (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-faint)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="inline-block">
                        <line x1="18" y1="6" x2="6" y2="18" />
                        <line x1="6" y1="6" x2="18" y2="18" />
                      </svg>
                    ) : (
                      <span style={{ color: "var(--text-secondary)", fontFamily: "'Geist Mono', monospace", fontSize: "0.8125rem" }}>
                        {val}
                      </span>
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Tab: Code Examples ─────────────────────────────────────

function ExamplesTab({ apiKey }: { apiKey: string | null }) {
  const [selectedEndpointIdx, setSelectedEndpointIdx] = useState(0);
  const [selectedLang, setSelectedLang] = useState<CodeLang>("javascript");

  const endpoint = ENDPOINTS[selectedEndpointIdx];
  const code = getCodeExample(endpoint, selectedLang, apiKey || "");

  const langs: { key: CodeLang; label: string }[] = [
    { key: "javascript", label: "JavaScript" },
    { key: "python", label: "Python" },
    { key: "curl", label: "cURL" },
  ];

  const langFileMap: Record<CodeLang, string> = {
    javascript: "fetch.js",
    python: "requests.py",
    curl: "terminal",
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold mb-1" style={{ color: "var(--text-primary)" }}>
          Code Examples
        </h2>
        <p className="text-sm" style={{ color: "var(--text-tertiary)" }}>
          Ready-to-use code snippets for integrating with the AeroIntel API.
        </p>
      </div>

      {/* Endpoint selector */}
      <div>
        <label className="block text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--text-muted)" }}>
          Endpoint
        </label>
        <select
          value={selectedEndpointIdx}
          onChange={(e) => setSelectedEndpointIdx(Number(e.target.value))}
          className="w-full px-4 py-2.5 rounded-lg text-sm font-medium cursor-pointer appearance-none"
          style={{
            background: "var(--surface-1)",
            border: "1px solid var(--border-default)",
            color: "var(--text-primary)",
            fontFamily: "'Geist Mono', monospace",
            outline: "none",
          }}
        >
          {ENDPOINTS.map((ep, i) => {
            const label =
              ep.path === "/api/flights" && i === 0
                ? "GET /api/flights (by location)"
                : ep.path === "/api/flights" && i === 1
                ? "GET /api/flights (by bounds)"
                : `${ep.method} ${ep.path}`;
            return (
              <option key={i} value={i}>
                {label}
              </option>
            );
          })}
        </select>
      </div>

      {/* Language tabs + code */}
      <div
        className="rounded-xl overflow-hidden"
        style={{ background: "var(--surface-1)", border: "1px solid var(--border-default)" }}
      >
        <div
          className="flex items-center justify-between px-1 py-1"
          style={{ borderBottom: "1px solid var(--border-subtle)", background: "var(--surface-2)" }}
        >
          <div className="flex">
            {langs.map((l) => (
              <button
                key={l.key}
                onClick={() => setSelectedLang(l.key)}
                className="px-4 py-2 text-xs font-semibold rounded-lg transition-all duration-200"
                style={{
                  background: selectedLang === l.key ? "var(--surface-0)" : "transparent",
                  color: selectedLang === l.key ? "var(--text-primary)" : "var(--text-muted)",
                  boxShadow: selectedLang === l.key ? "0 1px 3px rgba(0,0,0,0.2)" : "none",
                }}
              >
                {l.label}
              </button>
            ))}
          </div>
          <div className="pr-3">
            <CopyButton text={code} />
          </div>
        </div>

        <div
          className="flex items-center gap-2 px-4 py-2"
          style={{ borderBottom: "1px solid var(--border-subtle)", background: "rgba(0,0,0,0.15)" }}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--text-faint)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" />
            <polyline points="13 2 13 9 20 9" />
          </svg>
          <span className="text-xs" style={{ color: "var(--text-faint)", fontFamily: "'Geist Mono', monospace" }}>
            {langFileMap[selectedLang]}
          </span>
        </div>

        <pre className="p-5 overflow-x-auto text-sm leading-relaxed" style={{ margin: 0, background: "var(--surface-0)" }}>
          <code
            style={{
              fontFamily: "'Geist Mono', 'JetBrains Mono', monospace",
              fontSize: "0.8125rem",
              color: "var(--text-secondary)",
            }}
          >
            {code}
          </code>
        </pre>
      </div>
    </div>
  );
}

// ─── Main Component ─────────────────────────────────────────

export default function ApiPortalMode({ onExitMode }: ApiPortalModeProps) {
  const [activeTab, setActiveTab] = useState<Tab>("docs");
  const [apiKey, setApiKey] = useState<string | null>(null);

  // Hydrate key from localStorage
  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("aerointel_api_key");
      if (saved) setApiKey(saved);
    }
  }, []);

  const tabs: { key: Tab; label: string; icon: React.ReactNode }[] = useMemo(
    () => [
      {
        key: "docs",
        label: "Endpoints",
        icon: (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="16" y1="13" x2="8" y2="13" />
            <line x1="16" y1="17" x2="8" y2="17" />
          </svg>
        ),
      },
      {
        key: "playground",
        label: "Playground",
        icon: (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="16 18 22 12 16 6" />
            <polyline points="8 6 2 12 8 18" />
          </svg>
        ),
      },
      {
        key: "keys",
        label: "API Keys",
        icon: (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" />
          </svg>
        ),
      },
      {
        key: "pricing",
        label: "Pricing",
        icon: (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
            <line x1="1" y1="10" x2="23" y2="10" />
          </svg>
        ),
      },
      {
        key: "examples",
        label: "Code",
        icon: (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 17l6-6-6-6M12 19h8" />
          </svg>
        ),
      },
    ],
    [],
  );

  return (
    <div
      className="fixed inset-0 flex flex-col"
      style={{ background: "var(--surface-0)", color: "var(--text-primary)", zIndex: 50 }}
    >
      {/* ── Header ── */}
      <header
        className="flex items-center justify-between px-6 py-3 shrink-0"
        style={{
          background: "var(--surface-1)",
          borderBottom: "1px solid var(--border-default)",
        }}
      >
        <div className="flex items-center gap-4">
          {onExitMode && (
            <button
              onClick={onExitMode}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg transition-colors duration-200 hover:bg-[rgba(148,163,184,0.08)]"
              style={{ color: "var(--text-tertiary)", border: "1px solid var(--border-subtle)" }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="19" y1="12" x2="5" y2="12" />
                <polyline points="12 19 5 12 12 5" />
              </svg>
              Back
            </button>
          )}
          <div className="flex items-center gap-2.5">
            <div
              className="flex items-center justify-center w-8 h-8 rounded-lg"
              style={{ background: "var(--border-default)", border: "1px solid var(--border-accent)" }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--accent-primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="16 18 22 12 16 6" />
                <polyline points="8 6 2 12 8 18" />
              </svg>
            </div>
            <div>
              <h1 className="text-sm font-bold leading-tight" style={{ color: "var(--text-primary)" }}>
                AeroIntel API
              </h1>
              <p className="text-xs leading-tight" style={{ color: "var(--text-muted)" }}>
                Developer Portal
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span
            className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full"
            style={{
              background: "var(--border-default)",
              color: "var(--status-nominal)",
              border: "1px solid rgba(148, 163, 184, 0.15)",
            }}
          >
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: "var(--status-nominal)" }} />
            v2.1.0
          </span>
          <span
            className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full"
            style={{
              background: apiKey ? "rgba(148, 163, 184, 0.08)" : "var(--border-subtle)",
              color: apiKey ? "var(--status-nominal)" : "var(--text-muted)",
              border: `1px solid ${apiKey ? "var(--border-default)" : "var(--border-subtle)"}`,
            }}
          >
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" />
            </svg>
            {apiKey ? "Key active" : "No key"}
          </span>
        </div>
      </header>

      {/* ── Navigation ── */}
      <nav
        className="flex gap-1 px-6 py-2 shrink-0 overflow-x-auto"
        style={{
          background: "var(--surface-1)",
          borderBottom: "1px solid var(--border-subtle)",
        }}
      >
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className="flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg transition-all duration-200 whitespace-nowrap"
            style={{
              background: activeTab === tab.key ? "rgba(148, 163, 184, 0.08)" : "transparent",
              color: activeTab === tab.key ? "var(--accent-primary)" : "var(--text-muted)",
              border: activeTab === tab.key ? "1px solid var(--border-accent)" : "1px solid transparent",
            }}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </nav>

      {/* ── Content ── */}
      <main className="flex-1 overflow-y-auto px-6 py-6">
        <div className="max-w-4xl mx-auto">
          {activeTab === "docs" && <DocsTab />}
          {activeTab === "playground" && <PlaygroundTab apiKey={apiKey} />}
          {activeTab === "keys" && <KeysTab apiKey={apiKey} setApiKey={setApiKey} />}
          {activeTab === "pricing" && <PricingTab />}
          {activeTab === "examples" && <ExamplesTab apiKey={apiKey} />}
        </div>
      </main>

      {/* ── JSON Syntax Colors (injected via style tag) ── */}
      <style>{`
        .json-key { color: #94a3b8; }
        .json-string { color: #cbd5e1; }
        .json-number { color: #cbd5e1; }
        .json-boolean { color: #94a3b8; }
        .json-null { color: #64748b; }

        /* Scrollbar styling */
        .overflow-y-auto::-webkit-scrollbar,
        .overflow-x-auto::-webkit-scrollbar {
          width: 6px;
          height: 6px;
        }
        .overflow-y-auto::-webkit-scrollbar-track,
        .overflow-x-auto::-webkit-scrollbar-track {
          background: transparent;
        }
        .overflow-y-auto::-webkit-scrollbar-thumb,
        .overflow-x-auto::-webkit-scrollbar-thumb {
          background: rgba(148, 163, 184, 0.12);
          border-radius: 3px;
        }
        .overflow-y-auto::-webkit-scrollbar-thumb:hover,
        .overflow-x-auto::-webkit-scrollbar-thumb:hover {
          background: rgba(148, 163, 184, 0.2);
        }

        /* Select dropdown styling */
        select option {
          background: var(--surface-2);
          color: var(--text-primary);
        }
      `}</style>
    </div>
  );
}
