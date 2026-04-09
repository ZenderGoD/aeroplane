/**
 * FAA Aircraft Registry — enriches ADS-B data with aircraft type,
 * model, and owner information from the FAA releasable database.
 *
 * Data source: https://www.faa.gov/licenses_certificates/aircraft_certification/aircraft_registry/releasable_aircraft_download
 *
 * The registry maps N-numbers (registration) to aircraft details.
 * We also build an ICAO hex → registration lookup for fast enrichment.
 */

// ── In-memory cache ─────────────────────────────────────────────────
interface RegistryEntry {
  registration: string;
  manufacturer: string;
  model: string;
  mfrMdlCode?: string;    // Links to ACFTREF for manufacturer/model lookup
  typeAircraft: string;    // 1=Glider, 2=Balloon, 3=Blimp, 4=Fixed wing single, 5=Fixed wing multi, 6=Rotorcraft, 7=Weight-shift, 8=Powered parachute, 9=Gyroplane
  engineType: string;      // 0=None, 1=Reciprocating, 2=Turbo-prop, 3=Turbo-shaft, 4=Turbo-jet, 5=Turbo-fan, 6=Ramjet, 7=2-cycle, 8=4-cycle, 9=Unknown, 10=Electric, 11=Rotary
  ownerName: string;
  isMilitary: boolean;
  description: string;     // e.g. "CESSNA 172S"
}

let registryByHex = new Map<string, RegistryEntry>();
let registryByReg = new Map<string, RegistryEntry>();
let lastFetchTime = 0;
let fetchInProgress = false;
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

// ── ICAO hex ↔ N-number conversion ──────────────────────────────────
// US aircraft: hex range 0xA00001 - 0xAFFFFF
// Formula: hex = 0xA00001 + encoded(N-number)
const US_HEX_START = 0xA00001;
const US_HEX_END = 0xAFFFFF;

function isUsHex(hex: string): boolean {
  const val = parseInt(hex, 16);
  return val >= US_HEX_START && val <= US_HEX_END;
}

// ── Parse the master CSV ────────────────────────────────────────────
function parseMasterCsv(csvText: string): Map<string, Omit<RegistryEntry, "description">> {
  const lines = csvText.split("\n");
  const result = new Map<string, Omit<RegistryEntry, "description">>();

  // Skip header
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) continue;

    // FAA MASTER file columns (comma-separated, some quoted):
    // 0=N-NUMBER, 1=SERIAL NUMBER, 2=MFR MDL CODE, 3=ENG MFR MDL,
    // 4=YEAR MFR, 5=TYPE REGISTRANT, 6=NAME, 7=STREET, 8=STREET2,
    // 9=CITY, 10=STATE, 11=ZIP CODE, 12=REGION, 13=COUNTY,
    // 14=COUNTRY, 15=LAST ACTION DATE, 16=CERT ISSUE DATE,
    // 17=CERTIFICATION, 18=TYPE AIRCRAFT, 19=TYPE ENGINE,
    // 20=STATUS CODE, 21=MODE S CODE (octal), ...
    const cols = parseCSVLine(line);
    if (cols.length < 22) continue;

    const nNumber = cols[0].trim();
    const mfrMdlCode = cols[2].trim(); // Links to ACFTREF CODE
    const ownerName = cols[6].trim();
    const typeAircraft = cols[18].trim();
    const engineType = cols[19].trim();
    const modeSCodeOctal = cols[21].trim();

    if (!nNumber || !modeSCodeOctal) continue;

    // Convert Mode S octal to hex
    const modeSDecimal = parseInt(modeSCodeOctal, 8);
    if (isNaN(modeSDecimal) || modeSDecimal === 0) continue;
    const hex = modeSDecimal.toString(16).toLowerCase().padStart(6, "0");

    // Type 5 registrant = government (includes military)
    const typeRegistrant = cols[5]?.trim();
    const isMil = typeRegistrant === "5" || typeRegistrant === "8";

    result.set(hex, {
      registration: `N${nNumber}`,
      manufacturer: "",
      model: "",
      mfrMdlCode,
      typeAircraft,
      engineType,
      ownerName,
      isMilitary: isMil,
    });
  }

  return result;
}

// ── Parse aircraft reference CSV for manufacturer/model ─────────────
function parseAcftRefCsv(
  csvText: string,
): Map<string, { manufacturer: string; model: string }> {
  const lines = csvText.split("\n");
  const result = new Map<string, { manufacturer: string; model: string }>();

  // ACFTREF: 0=CODE, 1=MFR, 2=MODEL, 3=TYPE-ACFT, 4=TYPE-ENG, 5=AC-CAT, 6=BUILD-CERT-IND, 7=NO-ENG, 8=NO-SEATS, 9=AC-WEIGHT, 10=SPEED
  for (let i = 1; i < lines.length; i++) {
    const cols = parseCSVLine(lines[i]);
    if (cols.length < 3) continue;
    const code = cols[0].trim();
    if (!code) continue;
    result.set(code, {
      manufacturer: cols[1].trim(),
      model: cols[2].trim(),
    });
  }

  return result;
}

// ── Simple CSV line parser (handles quoted fields) ──────────────────
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
    } else if (ch === "," && !inQuotes) {
      result.push(current);
      current = "";
    } else {
      current += ch;
    }
  }
  result.push(current);
  return result;
}

// ── Download and cache registry ─────────────────────────────────────
export async function ensureRegistryLoaded(): Promise<boolean> {
  const now = Date.now();
  if (registryByHex.size > 0 && now - lastFetchTime < CACHE_DURATION) {
    return true; // Already loaded and fresh
  }

  if (fetchInProgress) return registryByHex.size > 0;
  fetchInProgress = true;

  try {
    console.log("[FAA Registry] Downloading aircraft registry...");

    // FAA requires a browser-like User-Agent, otherwise 403
    const fetchHeaders = {
      "User-Agent": "AeroIntel/1.0 (aviation training platform)",
    };

    // Download MASTER.txt and ACFTREF.txt
    // These are individual CSV files from the FAA releasable database
    const masterUrl = "https://registry.faa.gov/database/MASTER.txt";
    const acftRefUrl = "https://registry.faa.gov/database/ACFTREF.txt";

    const [masterRes, acftRes] = await Promise.all([
      fetch(masterUrl, { signal: AbortSignal.timeout(60_000), headers: fetchHeaders }),
      fetch(acftRefUrl, { signal: AbortSignal.timeout(60_000), headers: fetchHeaders }),
    ]);

    if (!masterRes.ok || !acftRes.ok) {
      console.warn("[FAA Registry] Download failed, status:", masterRes.status, acftRes.status);
      return false;
    }

    const masterText = await masterRes.text();
    const acftRefText = await acftRes.text();

    // Parse
    const masterEntries = parseMasterCsv(masterText);
    const acftRef = parseAcftRefCsv(acftRefText);

    // Build final registry with descriptions
    const newByHex = new Map<string, RegistryEntry>();
    const newByReg = new Map<string, RegistryEntry>();

    for (const [hex, entry] of masterEntries) {
      // Look up manufacturer/model from ACFTREF using the MFR MDL CODE
      const acftInfo = entry.mfrMdlCode ? acftRef.get(entry.mfrMdlCode) : undefined;
      const fullEntry: RegistryEntry = {
        ...entry,
        manufacturer: acftInfo?.manufacturer || "",
        model: acftInfo?.model || "",
        description: acftInfo
          ? `${acftInfo.manufacturer} ${acftInfo.model}`.trim()
          : "",
      };

      newByHex.set(hex, fullEntry);
      newByReg.set(entry.registration.toUpperCase(), fullEntry);
    }

    registryByHex = newByHex;
    registryByReg = newByReg;
    lastFetchTime = now;

    console.log(`[FAA Registry] Loaded ${newByHex.size} aircraft`);
    return true;
  } catch (err) {
    console.warn("[FAA Registry] Error:", err);
    return false;
  } finally {
    fetchInProgress = false;
  }
}

// ── Lookup functions ────────────────────────────────────────────────
export function lookupByHex(hex: string): RegistryEntry | undefined {
  return registryByHex.get(hex.toLowerCase());
}

export function lookupByRegistration(reg: string): RegistryEntry | undefined {
  return registryByReg.get(reg.toUpperCase());
}

export function getRegistrySize(): number {
  return registryByHex.size;
}

/**
 * Enrich a flight with FAA registry data (modifies in place).
 * Only applies to US-registered aircraft (hex A00001-AFFFFF).
 */
export function enrichFlightWithRegistry(
  flight: { icao24: string; registration?: string; aircraftDesc?: string; ownerName?: string; isMilitary?: boolean },
): void {
  const entry = lookupByHex(flight.icao24);
  if (!entry) return;

  if (!flight.registration) {
    flight.registration = entry.registration;
  }
  if (!flight.aircraftDesc && entry.description) {
    flight.aircraftDesc = entry.description;
  }
  if (!flight.ownerName && entry.ownerName) {
    flight.ownerName = entry.ownerName;
  }
  if (entry.isMilitary) {
    flight.isMilitary = true;
  }
}
