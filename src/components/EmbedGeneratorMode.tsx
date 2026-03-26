"use client";

import { useState, useMemo, useCallback, useRef } from "react";

/* ------------------------------------------------------------------ */
/*  Size presets                                                      */
/* ------------------------------------------------------------------ */
const SIZE_PRESETS: Record<string, { w: number; h: number; label: string }> = {
  small: { w: 300, h: 200, label: "300 x 200" },
  medium: { w: 600, h: 400, label: "600 x 400" },
  large: { w: 800, h: 500, label: "800 x 500" },
  custom: { w: 0, h: 0, label: "Custom" },
};

/* ------------------------------------------------------------------ */
/*  Copy-to-clipboard helper                                          */
/* ------------------------------------------------------------------ */
function useCopy() {
  const [copied, setCopied] = useState(false);
  const timeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const copy = useCallback((text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      if (timeout.current) clearTimeout(timeout.current);
      timeout.current = setTimeout(() => setCopied(false), 2000);
    });
  }, []);

  return { copied, copy };
}

/* ================================================================== */
/*  EmbedGeneratorMode                                                */
/* ================================================================== */
interface Props {
  onExitMode?: () => void;
}

export default function EmbedGeneratorMode({ onExitMode }: Props) {
  /* ---- State ---------------------------------------------------- */
  const [lat, setLat] = useState("28.5");
  const [lon, setLon] = useState("77.1");
  const [airportIcao, setAirportIcao] = useState("");
  const [zoom, setZoom] = useState(7);
  const [radius, setRadius] = useState(100);
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [callsign, setCallsign] = useState("");
  const [sizePreset, setSizePreset] = useState("medium");
  const [customW, setCustomW] = useState(600);
  const [customH, setCustomH] = useState(400);

  const iframeCopy = useCopy();
  const urlCopy = useCopy();

  /* ---- Derived values ------------------------------------------- */
  const width = sizePreset === "custom" ? customW : SIZE_PRESETS[sizePreset].w;
  const height = sizePreset === "custom" ? customH : SIZE_PRESETS[sizePreset].h;

  const embedUrl = useMemo(() => {
    const p = new URLSearchParams();
    if (airportIcao.trim()) {
      p.set("airport", airportIcao.trim().toUpperCase());
    } else {
      p.set("lat", lat);
      p.set("lon", lon);
    }
    p.set("zoom", String(zoom));
    p.set("radius", String(radius));
    p.set("theme", theme);
    if (callsign.trim()) p.set("callsign", callsign.trim().toUpperCase());
    return `/embed?${p.toString()}`;
  }, [lat, lon, airportIcao, zoom, radius, theme, callsign]);

  const fullUrl = useMemo(() => {
    if (typeof window === "undefined") return embedUrl;
    return `${window.location.origin}${embedUrl}`;
  }, [embedUrl]);

  const iframeCode = useMemo(() => {
    return `<iframe src="${fullUrl}" width="${width}" height="${height}" style="border:none;border-radius:8px;" loading="lazy" allowfullscreen></iframe>`;
  }, [fullUrl, width, height]);

  /* ---- Syntax-highlighted code ---------------------------------- */
  function highlightIframe(code: string) {
    return code
      .replace(/(&lt;|<)(iframe|\/iframe)/g, (_, br, tag) => `${br}<span style="color:#38bdf8">${tag}</span>`)
      .replace(/(src|width|height|style|loading|allowfullscreen)(=)/g, '<span style="color:#c084fc">$1</span><span style="color:#94a3b8">$2</span>')
      .replace(/"([^"]*)"/g, '<span style="color:#34d399">"$1"</span>');
  }

  /* ---- Render --------------------------------------------------- */
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        zIndex: 900,
        background: "var(--surface-0, #06080d)",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      {/* ── Header ─────────────────────────────────────────────── */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "12px 20px",
          borderBottom: "1px solid var(--border-subtle, rgba(148,163,184,0.06))",
          background: "var(--surface-1, #0c1018)",
          flexShrink: 0,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#38bdf8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="2" y="3" width="20" height="14" rx="2" />
            <path d="M8 21h8M12 17v4" />
          </svg>
          <span
            style={{
              fontSize: 14,
              fontWeight: 700,
              color: "var(--text-primary, #f1f5f9)",
              letterSpacing: "0.01em",
            }}
          >
            Embeddable Widget
          </span>
          <span
            style={{
              fontSize: 10,
              fontWeight: 600,
              color: "#38bdf8",
              background: "rgba(56,189,248,0.1)",
              border: "1px solid rgba(56,189,248,0.2)",
              borderRadius: 4,
              padding: "1px 6px",
              letterSpacing: "0.04em",
            }}
          >
            BETA
          </span>
        </div>
        {onExitMode && (
          <button
            onClick={onExitMode}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "5px 12px",
              borderRadius: 8,
              border: "1px solid var(--border-default, rgba(148,163,184,0.1))",
              background: "var(--surface-2, #111827)",
              color: "var(--text-secondary, #cbd5e1)",
              fontSize: 12,
              fontWeight: 500,
              cursor: "pointer",
              transition: "all 150ms ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "var(--surface-3, #1a2233)";
              e.currentTarget.style.borderColor = "var(--border-strong, rgba(148,163,184,0.16))";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "var(--surface-2, #111827)";
              e.currentTarget.style.borderColor = "var(--border-default, rgba(148,163,184,0.1))";
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
            Back
          </button>
        )}
      </div>

      {/* ── Body ───────────────────────────────────────────────── */}
      <div
        style={{
          flex: 1,
          display: "flex",
          overflow: "hidden",
        }}
      >
        {/* ── Config panel (left) ──────────────────────────────── */}
        <div
          className="scrollbar-thin"
          style={{
            width: 340,
            flexShrink: 0,
            overflowY: "auto",
            padding: 20,
            borderRight: "1px solid var(--border-subtle, rgba(148,163,184,0.06))",
            background: "var(--surface-1, #0c1018)",
            display: "flex",
            flexDirection: "column",
            gap: 20,
          }}
        >
          {/* CENTER POINT */}
          <Section title="Center Point">
            <Label text="Airport ICAO (overrides lat/lon)" />
            <Input
              value={airportIcao}
              onChange={setAirportIcao}
              placeholder="e.g. KJFK, VIDP"
              mono
            />
            <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
              <div style={{ flex: 1 }}>
                <Label text="Latitude" />
                <Input
                  value={lat}
                  onChange={setLat}
                  placeholder="28.5"
                  mono
                  disabled={!!airportIcao.trim()}
                />
              </div>
              <div style={{ flex: 1 }}>
                <Label text="Longitude" />
                <Input
                  value={lon}
                  onChange={setLon}
                  placeholder="77.1"
                  mono
                  disabled={!!airportIcao.trim()}
                />
              </div>
            </div>
          </Section>

          {/* ZOOM */}
          <Section title="Zoom Level">
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <input
                type="range"
                min={3}
                max={15}
                value={zoom}
                onChange={(e) => setZoom(Number(e.target.value))}
                style={{ flex: 1, accentColor: "#38bdf8" }}
              />
              <span style={{ fontFamily: "monospace", fontSize: 12, color: "var(--text-primary, #f1f5f9)", minWidth: 24, textAlign: "right" }}>
                {zoom}
              </span>
            </div>
          </Section>

          {/* RADIUS */}
          <Section title="Radius (NM)">
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <input
                type="range"
                min={25}
                max={500}
                step={25}
                value={radius}
                onChange={(e) => setRadius(Number(e.target.value))}
                style={{ flex: 1, accentColor: "#38bdf8" }}
              />
              <span style={{ fontFamily: "monospace", fontSize: 12, color: "var(--text-primary, #f1f5f9)", minWidth: 36, textAlign: "right" }}>
                {radius}
              </span>
            </div>
          </Section>

          {/* THEME */}
          <Section title="Theme">
            <div style={{ display: "flex", gap: 8 }}>
              <ToggleButton
                active={theme === "dark"}
                onClick={() => setTheme("dark")}
                label="Dark"
              />
              <ToggleButton
                active={theme === "light"}
                onClick={() => setTheme("light")}
                label="Light"
              />
            </div>
          </Section>

          {/* TRACK CALLSIGN */}
          <Section title="Track Aircraft (optional)">
            <Input
              value={callsign}
              onChange={setCallsign}
              placeholder="e.g. AIC101"
              mono
            />
          </Section>

          {/* SIZE */}
          <Section title="Widget Size">
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {Object.entries(SIZE_PRESETS).map(([key, v]) => (
                <ToggleButton
                  key={key}
                  active={sizePreset === key}
                  onClick={() => setSizePreset(key)}
                  label={v.label}
                />
              ))}
            </div>
            {sizePreset === "custom" && (
              <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                <div style={{ flex: 1 }}>
                  <Label text="Width (px)" />
                  <Input
                    value={String(customW)}
                    onChange={(v) => setCustomW(Math.max(200, Number(v) || 200))}
                    mono
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <Label text="Height (px)" />
                  <Input
                    value={String(customH)}
                    onChange={(v) => setCustomH(Math.max(150, Number(v) || 150))}
                    mono
                  />
                </div>
              </div>
            )}
          </Section>
        </div>

        {/* ── Main area (preview + code) ──────────────────────── */}
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            background: "var(--surface-0, #06080d)",
          }}
        >
          {/* Preview */}
          <div
            style={{
              flex: 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: 24,
              overflow: "auto",
            }}
          >
            <div
              style={{
                width: Math.min(width, 900),
                height: Math.min(height, 560),
                border: "1px solid var(--border-default, rgba(148,163,184,0.1))",
                borderRadius: 10,
                overflow: "hidden",
                boxShadow: "0 8px 32px rgba(0,0,0,0.3), 0 0 0 1px rgba(0,0,0,0.1)",
                position: "relative",
                flexShrink: 0,
              }}
            >
              <iframe
                src={embedUrl}
                width="100%"
                height="100%"
                style={{ border: "none", display: "block" }}
                loading="lazy"
              />
              {/* size indicator */}
              <div
                style={{
                  position: "absolute",
                  bottom: -24,
                  left: "50%",
                  transform: "translateX(-50%)",
                  fontSize: 10,
                  fontFamily: "monospace",
                  color: "var(--text-muted, #64748b)",
                  whiteSpace: "nowrap",
                }}
              >
                {width} x {height}
              </div>
            </div>
          </div>

          {/* Code output */}
          <div
            style={{
              flexShrink: 0,
              borderTop: "1px solid var(--border-subtle, rgba(148,163,184,0.06))",
              background: "var(--surface-1, #0c1018)",
              padding: 16,
              display: "flex",
              flexDirection: "column",
              gap: 12,
              maxHeight: 260,
              overflowY: "auto",
            }}
            className="scrollbar-thin"
          >
            {/* iframe code */}
            <CodeBlock
              title="Embed Code (iframe)"
              code={iframeCode}
              highlightedHtml={highlightIframe(
                iframeCode
                  .replace(/</g, "&lt;")
                  .replace(/>/g, "&gt;")
              )}
              charCount={iframeCode.length}
              dims={`${width} x ${height}`}
              onCopy={() => iframeCopy.copy(iframeCode)}
              copied={iframeCopy.copied}
            />

            {/* Direct URL */}
            <CodeBlock
              title="Direct Link"
              code={fullUrl}
              highlightedHtml={`<span style="color:#34d399">${fullUrl}</span>`}
              charCount={fullUrl.length}
              onCopy={() => urlCopy.copy(fullUrl)}
              copied={urlCopy.copied}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

/* ================================================================== */
/*  Reusable sub-components                                           */
/* ================================================================== */

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div
        style={{
          fontSize: 11,
          fontWeight: 600,
          letterSpacing: "0.06em",
          textTransform: "uppercase",
          color: "var(--text-muted, #64748b)",
          marginBottom: 8,
        }}
      >
        {title}
      </div>
      {children}
    </div>
  );
}

function Label({ text }: { text: string }) {
  return (
    <div
      style={{
        fontSize: 10,
        fontWeight: 500,
        color: "var(--text-tertiary, #94a3b8)",
        marginBottom: 3,
      }}
    >
      {text}
    </div>
  );
}

function Input({
  value,
  onChange,
  placeholder,
  mono,
  disabled,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  mono?: boolean;
  disabled?: boolean;
}) {
  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      disabled={disabled}
      style={{
        width: "100%",
        padding: "6px 10px",
        borderRadius: 6,
        border: "1px solid var(--border-default, rgba(148,163,184,0.1))",
        background: disabled
          ? "var(--surface-2, #111827)"
          : "var(--surface-0, #06080d)",
        color: disabled
          ? "var(--text-faint, #475569)"
          : "var(--text-primary, #f1f5f9)",
        fontSize: 12,
        fontFamily: mono
          ? "'Geist Mono', 'JetBrains Mono', monospace"
          : "inherit",
        outline: "none",
        transition: "border-color 150ms ease",
        opacity: disabled ? 0.5 : 1,
        boxSizing: "border-box",
      }}
      onFocus={(e) => {
        if (!disabled) e.currentTarget.style.borderColor = "rgba(56,189,248,0.3)";
      }}
      onBlur={(e) => {
        e.currentTarget.style.borderColor = "var(--border-default, rgba(148,163,184,0.1))";
      }}
    />
  );
}

function ToggleButton({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: "5px 12px",
        borderRadius: 6,
        border: `1px solid ${active ? "rgba(56,189,248,0.3)" : "var(--border-default, rgba(148,163,184,0.1))"}`,
        background: active
          ? "rgba(56,189,248,0.1)"
          : "var(--surface-0, #06080d)",
        color: active
          ? "#38bdf8"
          : "var(--text-secondary, #cbd5e1)",
        fontSize: 11,
        fontWeight: active ? 600 : 500,
        cursor: "pointer",
        transition: "all 150ms ease",
        fontFamily: "'Geist Mono', monospace",
      }}
    >
      {label}
    </button>
  );
}

function CodeBlock({
  title,
  code,
  highlightedHtml,
  charCount,
  dims,
  onCopy,
  copied,
}: {
  title: string;
  code: string;
  highlightedHtml: string;
  charCount: number;
  dims?: string;
  onCopy: () => void;
  copied: boolean;
}) {
  return (
    <div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 6,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: "var(--text-secondary, #cbd5e1)",
            }}
          >
            {title}
          </span>
          <span
            style={{
              fontSize: 9,
              fontFamily: "monospace",
              color: "var(--text-faint, #475569)",
            }}
          >
            {charCount} chars
            {dims ? ` | ${dims}` : ""}
          </span>
        </div>
        <button
          onClick={onCopy}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 4,
            padding: "3px 10px",
            borderRadius: 6,
            border: `1px solid ${copied ? "rgba(52,211,153,0.3)" : "var(--border-default, rgba(148,163,184,0.1))"}`,
            background: copied
              ? "rgba(52,211,153,0.1)"
              : "var(--surface-2, #111827)",
            color: copied ? "#34d399" : "var(--text-secondary, #cbd5e1)",
            fontSize: 11,
            fontWeight: 500,
            cursor: "pointer",
            transition: "all 150ms ease",
          }}
        >
          {copied ? (
            <>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M20 6L9 17l-5-5" />
              </svg>
              Copied
            </>
          ) : (
            <>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="9" y="9" width="13" height="13" rx="2" />
                <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
              </svg>
              Copy
            </>
          )}
        </button>
      </div>
      <div
        style={{
          background: "var(--surface-0, #06080d)",
          border: "1px solid var(--border-subtle, rgba(148,163,184,0.06))",
          borderRadius: 8,
          padding: "10px 14px",
          fontFamily: "'Geist Mono', 'JetBrains Mono', monospace",
          fontSize: 11,
          lineHeight: 1.6,
          color: "var(--text-secondary, #cbd5e1)",
          overflowX: "auto",
          whiteSpace: "pre-wrap",
          wordBreak: "break-all",
        }}
        dangerouslySetInnerHTML={{ __html: highlightedHtml }}
      />
    </div>
  );
}
