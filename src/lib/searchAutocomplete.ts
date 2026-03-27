import airportsData from "@/data/airports.json";
import type { Airport } from "@/types/airport";

export interface AutocompleteResult {
  category: "Flights" | "Airports" | "Airlines";
  primary: string;
  secondary: string;
  value: string;
  data?: unknown;
}

// ---- Airport search ----

interface RawAirport {
  id: number;
  name: string;
  city: string;
  country: string;
  iata: string;
  icao: string;
  lat: number;
  lon: number;
  alt: number;
  tz: string;
  type: string;
}

// Pre-build a lightweight list for search (only airports with ICAO codes)
const airportSearchList: { icao: string; iata: string; name: string; city: string; country: string }[] = [];
for (const raw of airportsData as RawAirport[]) {
  if (raw.icao) {
    airportSearchList.push({
      icao: raw.icao,
      iata: raw.iata || "",
      name: raw.name,
      city: raw.city || "",
      country: raw.country || "",
    });
  }
}

export function searchAirports(query: string, limit: number = 3): AutocompleteResult[] {
  const lowerQuery = query.toLowerCase();
  const results: AutocompleteResult[] = [];

  for (const apt of airportSearchList) {
    if (results.length >= limit) break;
    if (
      apt.icao.toLowerCase().includes(lowerQuery) ||
      apt.iata.toLowerCase().includes(lowerQuery) ||
      apt.name.toLowerCase().includes(lowerQuery) ||
      apt.city.toLowerCase().includes(lowerQuery)
    ) {
      const codes = [apt.icao, apt.iata].filter(Boolean).join(" / ");
      results.push({
        category: "Airports",
        primary: codes,
        secondary: `${apt.name} - ${apt.city}, ${apt.country}`,
        value: apt.icao,
      });
    }
  }

  return results;
}

// ---- Airline search ----

const AIRLINES: Record<string, string> = {
  AAL: "American Airlines",
  UAL: "United Airlines",
  DAL: "Delta Air Lines",
  SWA: "Southwest Airlines",
  JBU: "JetBlue Airways",
  NKS: "Spirit Airlines",
  FFT: "Frontier Airlines",
  ASA: "Alaska Airlines",
  HAL: "Hawaiian Airlines",
  ACA: "Air Canada",
  WJA: "WestJet",
  VOI: "Volaris",
  AMX: "Aeromexico",
  BAW: "British Airways",
  RYR: "Ryanair",
  EZY: "easyJet",
  DLH: "Lufthansa",
  AFR: "Air France",
  KLM: "KLM Royal Dutch",
  IBE: "Iberia",
  VLG: "Vueling",
  SAS: "SAS Scandinavian",
  FIN: "Finnair",
  AUA: "Austrian Airlines",
  SWR: "Swiss Int'l Air Lines",
  TAP: "TAP Air Portugal",
  AZA: "ITA Airways",
  EWG: "Eurowings",
  WZZ: "Wizz Air",
  NAX: "Norwegian Air",
  BEL: "Brussels Airlines",
  LOT: "LOT Polish Airlines",
  AEE: "Aegean Airlines",
  THY: "Turkish Airlines",
  ROT: "TAROM",
  ICE: "Icelandair",
  EIN: "Aer Lingus",
  PGT: "Pegasus Airlines",
  UAE: "Emirates",
  QTR: "Qatar Airways",
  ETD: "Etihad Airways",
  SVA: "Saudia",
  GFA: "Gulf Air",
  OMA: "Oman Air",
  RJA: "Royal Jordanian",
  MEA: "Middle East Airlines",
  FDB: "flydubai",
  CPA: "Cathay Pacific",
  SIA: "Singapore Airlines",
  ANA: "All Nippon Airways",
  JAL: "Japan Airlines",
  KAL: "Korean Air",
  AAR: "Asiana Airlines",
  THA: "Thai Airways",
  MAS: "Malaysia Airlines",
  GIA: "Garuda Indonesia",
  CES: "China Eastern",
  CSN: "China Southern",
  CCA: "Air China",
  AIR: "Air India",
  IGO: "IndiGo",
  SEJ: "SpiceJet",
  EVA: "EVA Air",
  CAL: "China Airlines",
  VJC: "VietJet Air",
  HVN: "Vietnam Airlines",
  CEB: "Cebu Pacific",
  PAL: "Philippine Airlines",
  QFA: "Qantas",
  ANZ: "Air New Zealand",
  VOZ: "Virgin Australia",
  SAA: "South African Airways",
  ETH: "Ethiopian Airlines",
  KQA: "Kenya Airways",
  RAM: "Royal Air Maroc",
  MSR: "EgyptAir",
  LAN: "LATAM Airlines",
  GLO: "GOL Linhas Aereas",
  AZU: "Azul Brazilian",
  AVA: "Avianca",
  ARG: "Aerolineas Argentinas",
  CMP: "Copa Airlines",
  FDX: "FedEx Express",
  UPS: "UPS Airlines",
  GTI: "Atlas Air",
  CLX: "Cargolux",
};

const airlineSearchList = Object.entries(AIRLINES).map(([code, name]) => ({
  code,
  name,
}));

export function searchAirlines(query: string, limit: number = 2): AutocompleteResult[] {
  const lowerQuery = query.toLowerCase();
  const results: AutocompleteResult[] = [];

  for (const airline of airlineSearchList) {
    if (results.length >= limit) break;
    if (
      airline.code.toLowerCase().includes(lowerQuery) ||
      airline.name.toLowerCase().includes(lowerQuery)
    ) {
      results.push({
        category: "Airlines",
        primary: airline.code,
        secondary: airline.name,
        value: airline.code,
      });
    }
  }

  return results;
}
