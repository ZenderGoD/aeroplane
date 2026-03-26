/**
 * CO2 emissions estimation based on ICAO Carbon Emissions Calculator methodology.
 * Uses aircraft type code (ICAO designator) when available for high-confidence estimates,
 * falling back to ADS-B category when type is unknown.
 *
 * Categories from FlightState.category:
 * 0=unknown, 1=none, 2=light, 3=small, 4=large, 5=high-vortex, 6=heavy, 7=high-perf, 8=rotorcraft
 */

export interface EmissionsEstimate {
  co2Kg: number;
  fuelBurnKg: number;
  co2PerPaxKg: number;
  distanceNm: number;
  category: number;
  confidence: "high" | "medium" | "low";
  typeName?: string;
}

/** Fuel burn rate in kg/NM and typical pax by ICAO type designator */
const TYPE_FUEL_BURN: Record<string, { rate: number; pax: number; name: string }> = {
  // Narrow-body
  "A319": { rate: 5.8, pax: 140, name: "Airbus A319" },
  "A320": { rate: 6.3, pax: 165, name: "Airbus A320" },
  "A20N": { rate: 5.5, pax: 165, name: "A320neo" },
  "A321": { rate: 7.2, pax: 200, name: "Airbus A321" },
  "A21N": { rate: 6.2, pax: 200, name: "A321neo" },
  "B737": { rate: 6.0, pax: 150, name: "Boeing 737" },
  "B738": { rate: 6.3, pax: 162, name: "Boeing 737-800" },
  "B38M": { rate: 5.6, pax: 162, name: "737 MAX 8" },
  "B739": { rate: 6.5, pax: 178, name: "Boeing 737-900" },
  "B39M": { rate: 5.8, pax: 178, name: "737 MAX 9" },
  // Wide-body
  "B744": { rate: 16.0, pax: 410, name: "Boeing 747-400" },
  "B748": { rate: 15.0, pax: 410, name: "Boeing 747-8" },
  "B763": { rate: 9.5, pax: 218, name: "Boeing 767-300" },
  "B772": { rate: 11.5, pax: 305, name: "Boeing 777-200" },
  "B77W": { rate: 12.0, pax: 365, name: "Boeing 777-300ER" },
  "B788": { rate: 9.0, pax: 242, name: "Boeing 787-8" },
  "B789": { rate: 9.5, pax: 290, name: "Boeing 787-9" },
  "B78X": { rate: 9.8, pax: 318, name: "Boeing 787-10" },
  "A332": { rate: 10.5, pax: 277, name: "Airbus A330-200" },
  "A333": { rate: 11.0, pax: 300, name: "Airbus A330-300" },
  "A339": { rate: 9.5, pax: 300, name: "A330-900neo" },
  "A342": { rate: 13.0, pax: 250, name: "Airbus A340-200" },
  "A343": { rate: 14.0, pax: 295, name: "Airbus A340-300" },
  "A346": { rate: 15.5, pax: 380, name: "Airbus A340-600" },
  "A359": { rate: 10.0, pax: 315, name: "Airbus A350-900" },
  "A35K": { rate: 11.0, pax: 369, name: "Airbus A350-1000" },
  "A388": { rate: 18.0, pax: 525, name: "Airbus A380" },
  // Regional jets
  "E170": { rate: 4.0, pax: 72, name: "Embraer E170" },
  "E190": { rate: 4.5, pax: 100, name: "Embraer E190" },
  "E195": { rate: 5.0, pax: 120, name: "Embraer E195" },
  "E290": { rate: 4.2, pax: 120, name: "E195-E2" },
  "CRJ2": { rate: 3.2, pax: 50, name: "CRJ-200" },
  "CRJ7": { rate: 3.8, pax: 70, name: "CRJ-700" },
  "CRJ9": { rate: 4.2, pax: 85, name: "CRJ-900" },
  "DH8D": { rate: 2.8, pax: 78, name: "Dash 8 Q400" },
  "AT76": { rate: 2.2, pax: 72, name: "ATR 72-600" },
  // Business jets
  "C56X": { rate: 2.0, pax: 9, name: "Citation Excel" },
  "C68A": { rate: 2.5, pax: 12, name: "Citation Latitude" },
  "GL5T": { rate: 3.5, pax: 16, name: "Global 5500" },
  "GLEX": { rate: 4.0, pax: 13, name: "Global Express" },
  "GLF6": { rate: 3.2, pax: 14, name: "Gulfstream G650" },
  // Turboprops / light
  "C172": { rate: 0.3, pax: 3, name: "Cessna 172" },
  "C208": { rate: 0.8, pax: 9, name: "Cessna Caravan" },
  "PC12": { rate: 0.7, pax: 9, name: "Pilatus PC-12" },
  "B350": { rate: 0.9, pax: 9, name: "King Air 350" },
  // Cargo variants
  "B77L": { rate: 12.5, pax: 0, name: "777F" },
  "B74F": { rate: 16.5, pax: 0, name: "747F" },
  // Helicopters
  "R44":  { rate: 0.4, pax: 3, name: "Robinson R44" },
  "EC35": { rate: 0.6, pax: 6, name: "EC135" },
  "S76":  { rate: 1.0, pax: 12, name: "Sikorsky S-76" },
  "H60":  { rate: 1.5, pax: 11, name: "Black Hawk" },
};

/** Fuel burn rate in kg per nautical mile by aircraft category (fallback) */
const FUEL_BURN_RATE: Record<number, number> = {
  2: 1.2,   // light (e.g. Cessna 172)
  3: 3.5,   // small (e.g. CRJ-200)
  4: 7.0,   // large (e.g. A320/B737)
  5: 8.5,   // high-vortex (e.g. B757)
  6: 14.0,  // heavy (e.g. B777/A380)
  7: 6.0,   // high-perf (military, lower pax factor)
  8: 2.5,   // rotorcraft
  0: 7.0,   // unknown — assume large
  1: 7.0,   // none — assume large
};

/** Typical passenger count by aircraft category (fallback) */
const TYPICAL_PAX: Record<number, number> = {
  2: 2,
  3: 50,
  4: 160,
  5: 180,
  6: 350,
  7: 2,
  8: 6,
  0: 160,
  1: 160,
};

/** ICAO standard: kg of CO2 produced per kg of jet fuel burned */
const CO2_PER_KG_FUEL = 3.157;

/**
 * Estimate CO2 emissions for a flight based on aircraft type code and/or category.
 * When a known ICAO type code is provided the estimate uses type-specific fuel burn
 * rates and passenger counts, yielding "high" confidence. Otherwise falls back to
 * the broader ADS-B category heuristic.
 */
export function estimateEmissions(
  category: number,
  distanceNm: number,
  typeCode?: string | null
): EmissionsEstimate {
  const typeInfo = typeCode ? TYPE_FUEL_BURN[typeCode.toUpperCase()] : undefined;

  let rate: number;
  let pax: number;
  let confidence: EmissionsEstimate["confidence"];
  let typeName: string | undefined;

  if (typeInfo) {
    rate = typeInfo.rate;
    pax = typeInfo.pax;
    confidence = "high";
    typeName = typeInfo.name;
  } else {
    rate = FUEL_BURN_RATE[category] ?? FUEL_BURN_RATE[0];
    pax = TYPICAL_PAX[category] ?? TYPICAL_PAX[0];

    if (category >= 4 && category <= 6) {
      confidence = "high";
    } else if (category === 2 || category === 3) {
      confidence = "medium";
    } else {
      confidence = "low";
    }
  }

  const fuelBurnKg = rate * distanceNm;
  const co2Kg = fuelBurnKg * CO2_PER_KG_FUEL;
  const co2PerPaxKg = pax > 0 ? co2Kg / pax : co2Kg;

  return {
    co2Kg,
    fuelBurnKg,
    co2PerPaxKg,
    distanceNm,
    category,
    confidence,
    typeName,
  };
}

/**
 * Format a CO2 weight for compact display.
 * Returns "1.2 t" for >= 1000 kg, "850 kg" otherwise.
 */
export function formatCO2(kg: number): string {
  if (kg >= 1000) {
    return `${(kg / 1000).toFixed(1)} t`;
  }
  return `${Math.round(kg)} kg`;
}

/**
 * Compact CO2 label for use in hover tooltips and badges.
 * Returns a string like "~1.2t CO2" or "~850kg CO2".
 */
export function quickCO2Label(
  category: number,
  distanceNm: number,
  typeCode?: string | null
): string {
  const { co2Kg } = estimateEmissions(category, distanceNm, typeCode);
  if (co2Kg >= 1000) {
    return `~${(co2Kg / 1000).toFixed(1)}t CO2`;
  }
  return `~${Math.round(co2Kg)}kg CO2`;
}
