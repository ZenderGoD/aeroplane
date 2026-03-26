import { NextResponse } from "next/server";

// ── PIREP types ─────────────────────────────────────────────────────

interface PIREP {
  id: string;
  reportType: "UA" | "UUA";
  lat: number;
  lon: number;
  altitude: number;
  time: string;
  aircraftType: string;
  turbulence?: {
    intensity:
      | "NEG"
      | "SMTH-LGT"
      | "LGT"
      | "LGT-MOD"
      | "MOD"
      | "MOD-SEV"
      | "SEV"
      | "EXTRM";
    type?: "CAT" | "MECH" | "LLWS";
    frequency?: "ISOL" | "OCNL" | "CONT";
    baseAlt?: number;
    topAlt?: number;
  };
  icing?: {
    intensity: "NEG" | "TRC" | "LGT" | "MOD" | "SEV";
    type?: "RIME" | "CLR" | "MXD";
    baseAlt?: number;
    topAlt?: number;
  };
  skyCover?: string;
  visibility?: number;
  temp?: number;
  wind?: { dir: number; speed: number };
  rawText: string;
}

// ── Cache ───────────────────────────────────────────────────────────

let cache: { data: PIREP[]; timestamp: number } | null = null;
const CACHE_TTL = 10 * 60 * 1000; // 10 minutes

// ── Turbulence intensity mapping ────────────────────────────────────

const TURB_INTENSITY_MAP: Record<string, PIREP["turbulence"] extends infer T ? T extends { intensity: infer I } ? I : never : never> = {
  "0": "NEG",
  "1": "SMTH-LGT",
  "2": "LGT",
  "3": "LGT-MOD",
  "4": "MOD",
  "5": "MOD-SEV",
  "6": "SEV",
  "7": "EXTRM",
  "8": "EXTRM",
  NEG: "NEG",
  "SMTH-LGT": "SMTH-LGT",
  "SM-LGT": "SMTH-LGT",
  LGT: "LGT",
  LIGHT: "LGT",
  "LGT-MOD": "LGT-MOD",
  "LT-MD": "LGT-MOD",
  MOD: "MOD",
  MODERATE: "MOD",
  "MOD-SEV": "MOD-SEV",
  "MD-SV": "MOD-SEV",
  SEV: "SEV",
  SEVERE: "SEV",
  EXTRM: "EXTRM",
  EXTREME: "EXTRM",
};

const ICING_INTENSITY_MAP: Record<string, PIREP["icing"] extends infer T ? T extends { intensity: infer I } ? I : never : never> = {
  "0": "NEG",
  "1": "TRC",
  "2": "LGT",
  "3": "LGT",
  "4": "MOD",
  "5": "MOD",
  "6": "SEV",
  "7": "SEV",
  "8": "SEV",
  NEG: "NEG",
  NONE: "NEG",
  TRC: "TRC",
  TRACE: "TRC",
  LGT: "LGT",
  LIGHT: "LGT",
  MOD: "MOD",
  MODERATE: "MOD",
  SEV: "SEV",
  SEVERE: "SEV",
  HVY: "SEV",
};

// ── Parsers ─────────────────────────────────────────────────────────

function parseTurbulenceType(val: string | undefined): "CAT" | "MECH" | "LLWS" | undefined {
  if (!val) return undefined;
  const upper = val.toUpperCase();
  if (upper.includes("CAT") || upper.includes("CLEAR AIR")) return "CAT";
  if (upper.includes("MECH") || upper.includes("MECHANICAL") || upper.includes("MTN")) return "MECH";
  if (upper.includes("LLWS") || upper.includes("LOW LEVEL") || upper.includes("SHEAR")) return "LLWS";
  return undefined;
}

function parseTurbFrequency(val: string | undefined): "ISOL" | "OCNL" | "CONT" | undefined {
  if (!val) return undefined;
  const upper = val.toUpperCase();
  if (upper.includes("ISOL") || upper.includes("ISOLATED")) return "ISOL";
  if (upper.includes("OCNL") || upper.includes("OCCASIONAL")) return "OCNL";
  if (upper.includes("CONT") || upper.includes("CONTINUOUS")) return "CONT";
  return undefined;
}

function parseIcingType(val: string | undefined): "RIME" | "CLR" | "MXD" | undefined {
  if (!val) return undefined;
  const upper = val.toUpperCase();
  if (upper.includes("RIME")) return "RIME";
  if (upper.includes("CLR") || upper.includes("CLEAR")) return "CLR";
  if (upper.includes("MXD") || upper.includes("MIXED") || upper.includes("MX")) return "MXD";
  return undefined;
}

/* eslint-disable @typescript-eslint/no-explicit-any */
function parseRawPirep(raw: any, index: number): PIREP | null {
  try {
    const lat = raw.lat ?? raw.latitude;
    const lon = raw.lon ?? raw.longitude ?? raw.lng;
    if (lat == null || lon == null) return null;
    if (typeof lat !== "number" || typeof lon !== "number") return null;

    // Determine report type
    const reportType: "UA" | "UUA" =
      raw.reportType === "UUA" ||
      raw.urgentFlag === true ||
      raw.pirepType === "UUA" ||
      (typeof raw.rawOb === "string" && raw.rawOb.startsWith("UUA"))
        ? "UUA"
        : "UA";

    // Altitude in feet — the API may return in hundreds of feet (flight level)
    let altitude = 0;
    if (raw.altFt != null) altitude = Number(raw.altFt);
    else if (raw.alt != null) altitude = Number(raw.alt);
    else if (raw.fltlvl != null) altitude = Number(raw.fltlvl) * 100;
    else if (raw.altHundredsFt != null) altitude = Number(raw.altHundredsFt) * 100;

    // Timestamp
    let time: string;
    if (raw.obsTime) {
      time = new Date(raw.obsTime * 1000).toISOString();
    } else if (raw.reportTime) {
      time = new Date(raw.reportTime).toISOString();
    } else if (raw.receiptTime) {
      time = new Date(raw.receiptTime).toISOString();
    } else {
      time = new Date().toISOString();
    }

    // Aircraft type
    const aircraftType =
      raw.acType ?? raw.aircraftRef ?? raw.aircraftType ?? "UNKN";

    // Raw text
    const rawText = raw.rawOb ?? raw.rawText ?? raw.raw ?? "";

    // ── Turbulence ────────────────────────────────────────
    let turbulence: PIREP["turbulence"] | undefined;
    if (raw.tbInt != null || raw.turbInt != null || raw.tbInten != null) {
      const intKey = String(raw.tbInt ?? raw.turbInt ?? raw.tbInten ?? "").toUpperCase();
      const mapped = TURB_INTENSITY_MAP[intKey];
      if (mapped) {
        turbulence = {
          intensity: mapped,
          type: parseTurbulenceType(raw.tbType ?? raw.turbType),
          frequency: parseTurbFrequency(raw.tbFreq ?? raw.turbFreq),
          baseAlt: raw.tbBase != null ? Number(raw.tbBase) * 100 : undefined,
          topAlt: raw.tbTop != null ? Number(raw.tbTop) * 100 : undefined,
        };
      }
    }

    // Also try to extract turbulence from raw text if not parsed
    if (!turbulence && rawText) {
      const tbMatch = rawText.match(
        /\/TB\s+(NEG|SMTH-LGT|SM-LGT|LGT|LT-MD|LGT-MOD|MOD|MD-SV|MOD-SEV|SEV|EXTRM|EXTREME|LIGHT|MODERATE|SEVERE)/i
      );
      if (tbMatch) {
        const mapped = TURB_INTENSITY_MAP[tbMatch[1].toUpperCase()];
        if (mapped) {
          turbulence = { intensity: mapped };
        }
      }
    }

    // ── Icing ─────────────────────────────────────────────
    let icing: PIREP["icing"] | undefined;
    if (raw.icInt != null || raw.icgInt != null || raw.icInten != null) {
      const intKey = String(raw.icInt ?? raw.icgInt ?? raw.icInten ?? "").toUpperCase();
      const mapped = ICING_INTENSITY_MAP[intKey];
      if (mapped) {
        icing = {
          intensity: mapped,
          type: parseIcingType(raw.icType ?? raw.icgType),
          baseAlt: raw.icBase != null ? Number(raw.icBase) * 100 : undefined,
          topAlt: raw.icTop != null ? Number(raw.icTop) * 100 : undefined,
        };
      }
    }

    // Also try to extract icing from raw text if not parsed
    if (!icing && rawText) {
      const icMatch = rawText.match(
        /\/IC\s+(NEG|NONE|TRC|TRACE|LGT|LIGHT|MOD|MODERATE|SEV|SEVERE|HVY)/i
      );
      if (icMatch) {
        const mapped = ICING_INTENSITY_MAP[icMatch[1].toUpperCase()];
        if (mapped) {
          icing = { intensity: mapped };
        }
      }
    }

    // ── Other fields ──────────────────────────────────────
    const temp = raw.temp != null ? Number(raw.temp) : undefined;
    const visibility = raw.visib != null ? Number(raw.visib) : undefined;
    const skyCover = raw.skyCover ?? raw.cloudCvg ?? undefined;

    let wind: PIREP["wind"] | undefined;
    if (raw.wdir != null && raw.wspd != null) {
      wind = { dir: Number(raw.wdir), speed: Number(raw.wspd) };
    }

    return {
      id: raw.pirepId ?? `pirep-${index}-${Date.now()}`,
      reportType,
      lat,
      lon,
      altitude,
      time,
      aircraftType,
      turbulence,
      icing,
      skyCover,
      visibility,
      temp,
      wind,
      rawText,
    };
  } catch {
    return null;
  }
}
/* eslint-enable @typescript-eslint/no-explicit-any */

// ── Fetch PIREPs from aviationweather.gov ───────────────────────────

async function fetchPireps(): Promise<PIREP[]> {
  const url =
    "https://aviationweather.gov/api/data/pirep?format=json&age=2&level=low,high";

  const res = await fetch(url, {
    headers: {
      Accept: "application/json",
      "User-Agent": "AeroplaneApp/1.0",
    },
    next: { revalidate: 600 },
  });

  if (!res.ok) {
    throw new Error(`aviationweather.gov returned ${res.status}`);
  }

  const data = await res.json();

  if (!Array.isArray(data)) {
    // Some API versions wrap in an object
    const arr = data?.pireps ?? data?.data ?? data?.results;
    if (!Array.isArray(arr)) return [];
    return arr.map((item: unknown, i: number) => parseRawPirep(item, i)).filter(Boolean) as PIREP[];
  }

  return data.map((item: unknown, i: number) => parseRawPirep(item, i)).filter(Boolean) as PIREP[];
}

// ── GET handler ─────────────────────────────────────────────────────

export async function GET() {
  // Check cache
  if (cache && Date.now() - cache.timestamp < CACHE_TTL) {
    return NextResponse.json({
      pireps: cache.data,
      count: cache.data.length,
      cached: true,
      cacheAge: Math.round((Date.now() - cache.timestamp) / 1000),
    });
  }

  try {
    const pireps = await fetchPireps();

    // Update cache
    cache = { data: pireps, timestamp: Date.now() };

    return NextResponse.json({
      pireps,
      count: pireps.length,
      cached: false,
    });
  } catch (error) {
    console.error("[PIREPs] Fetch failed:", error);

    // Return stale cache if available
    if (cache) {
      return NextResponse.json({
        pireps: cache.data,
        count: cache.data.length,
        cached: true,
        stale: true,
        warning: "Using stale data — aviationweather.gov is unreachable",
        cacheAge: Math.round((Date.now() - cache.timestamp) / 1000),
      });
    }

    return NextResponse.json({
      pireps: [],
      count: 0,
      cached: false,
      warning:
        "Failed to fetch PIREPs from aviationweather.gov. The service may be temporarily unavailable.",
    });
  }
}
