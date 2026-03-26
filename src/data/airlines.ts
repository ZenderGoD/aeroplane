export interface Airline {
  icao: string;
  name: string;
  callsignPrefix: string;
  country: string;
  region: "NA" | "EU" | "AS" | "ME" | "AF" | "SA" | "OC";
}

const airlines: Airline[] = [
  // ── North America ──────────────────────────────
  { icao: "AAL", name: "American Airlines", callsignPrefix: "AAL", country: "US", region: "NA" },
  { icao: "DAL", name: "Delta Air Lines", callsignPrefix: "DAL", country: "US", region: "NA" },
  { icao: "UAL", name: "United Airlines", callsignPrefix: "UAL", country: "US", region: "NA" },
  { icao: "SWA", name: "Southwest Airlines", callsignPrefix: "SWA", country: "US", region: "NA" },
  { icao: "JBU", name: "JetBlue Airways", callsignPrefix: "JBU", country: "US", region: "NA" },
  { icao: "ASA", name: "Alaska Airlines", callsignPrefix: "ASA", country: "US", region: "NA" },
  { icao: "NKS", name: "Spirit Airlines", callsignPrefix: "NKS", country: "US", region: "NA" },
  { icao: "FFT", name: "Frontier Airlines", callsignPrefix: "FFT", country: "US", region: "NA" },
  { icao: "HAL", name: "Hawaiian Airlines", callsignPrefix: "HAL", country: "US", region: "NA" },
  { icao: "AAY", name: "Allegiant Air", callsignPrefix: "AAY", country: "US", region: "NA" },
  { icao: "SKW", name: "SkyWest Airlines", callsignPrefix: "SKW", country: "US", region: "NA" },
  { icao: "RPA", name: "Republic Airways", callsignPrefix: "RPA", country: "US", region: "NA" },
  { icao: "ENY", name: "Envoy Air", callsignPrefix: "ENY", country: "US", region: "NA" },
  { icao: "PDT", name: "Piedmont Airlines", callsignPrefix: "PDT", country: "US", region: "NA" },
  { icao: "EDV", name: "Endeavor Air", callsignPrefix: "EDV", country: "US", region: "NA" },
  { icao: "FDX", name: "FedEx Express", callsignPrefix: "FDX", country: "US", region: "NA" },
  { icao: "UPS", name: "UPS Airlines", callsignPrefix: "UPS", country: "US", region: "NA" },
  { icao: "GTI", name: "Atlas Air", callsignPrefix: "GTI", country: "US", region: "NA" },
  { icao: "ACA", name: "Air Canada", callsignPrefix: "ACA", country: "CA", region: "NA" },
  { icao: "WJA", name: "WestJet", callsignPrefix: "WJA", country: "CA", region: "NA" },
  { icao: "TSC", name: "Air Transat", callsignPrefix: "TSC", country: "CA", region: "NA" },
  { icao: "AMX", name: "Aeromexico", callsignPrefix: "AMX", country: "MX", region: "NA" },
  { icao: "VIV", name: "Viva Aerobus", callsignPrefix: "VIV", country: "MX", region: "NA" },
  { icao: "VOI", name: "Volaris", callsignPrefix: "VOI", country: "MX", region: "NA" },

  // ── Europe ─────────────────────────────────────
  { icao: "BAW", name: "British Airways", callsignPrefix: "BAW", country: "GB", region: "EU" },
  { icao: "DLH", name: "Lufthansa", callsignPrefix: "DLH", country: "DE", region: "EU" },
  { icao: "AFR", name: "Air France", callsignPrefix: "AFR", country: "FR", region: "EU" },
  { icao: "KLM", name: "KLM Royal Dutch Airlines", callsignPrefix: "KLM", country: "NL", region: "EU" },
  { icao: "RYR", name: "Ryanair", callsignPrefix: "RYR", country: "IE", region: "EU" },
  { icao: "EZY", name: "easyJet", callsignPrefix: "EZY", country: "GB", region: "EU" },
  { icao: "IBE", name: "Iberia", callsignPrefix: "IBE", country: "ES", region: "EU" },
  { icao: "SAS", name: "Scandinavian Airlines", callsignPrefix: "SAS", country: "SE", region: "EU" },
  { icao: "FIN", name: "Finnair", callsignPrefix: "FIN", country: "FI", region: "EU" },
  { icao: "AZA", name: "ITA Airways", callsignPrefix: "AZA", country: "IT", region: "EU" },
  { icao: "SWR", name: "Swiss International Air Lines", callsignPrefix: "SWR", country: "CH", region: "EU" },
  { icao: "AUA", name: "Austrian Airlines", callsignPrefix: "AUA", country: "AT", region: "EU" },
  { icao: "TAP", name: "TAP Air Portugal", callsignPrefix: "TAP", country: "PT", region: "EU" },
  { icao: "VLG", name: "Vueling Airlines", callsignPrefix: "VLG", country: "ES", region: "EU" },
  { icao: "WZZ", name: "Wizz Air", callsignPrefix: "WZZ", country: "HU", region: "EU" },
  { icao: "NOZ", name: "Norwegian Air Shuttle", callsignPrefix: "NOZ", country: "NO", region: "EU" },
  { icao: "LOT", name: "LOT Polish Airlines", callsignPrefix: "LOT", country: "PL", region: "EU" },
  { icao: "EWG", name: "Eurowings", callsignPrefix: "EWG", country: "DE", region: "EU" },
  { icao: "THY", name: "Turkish Airlines", callsignPrefix: "THY", country: "TR", region: "EU" },
  { icao: "AEE", name: "Aegean Airlines", callsignPrefix: "AEE", country: "GR", region: "EU" },
  { icao: "ICE", name: "Icelandair", callsignPrefix: "ICE", country: "IS", region: "EU" },
  { icao: "AFL", name: "Aeroflot", callsignPrefix: "AFL", country: "RU", region: "EU" },
  { icao: "VIR", name: "Virgin Atlantic", callsignPrefix: "VIR", country: "GB", region: "EU" },

  // ── Asia-Pacific ───────────────────────────────
  { icao: "CPA", name: "Cathay Pacific", callsignPrefix: "CPA", country: "HK", region: "AS" },
  { icao: "SIA", name: "Singapore Airlines", callsignPrefix: "SIA", country: "SG", region: "AS" },
  { icao: "ANA", name: "All Nippon Airways", callsignPrefix: "ANA", country: "JP", region: "AS" },
  { icao: "JAL", name: "Japan Airlines", callsignPrefix: "JAL", country: "JP", region: "AS" },
  { icao: "KAL", name: "Korean Air", callsignPrefix: "KAL", country: "KR", region: "AS" },
  { icao: "AAR", name: "Asiana Airlines", callsignPrefix: "AAR", country: "KR", region: "AS" },
  { icao: "THA", name: "Thai Airways", callsignPrefix: "THA", country: "TH", region: "AS" },
  { icao: "MAS", name: "Malaysia Airlines", callsignPrefix: "MAS", country: "MY", region: "AS" },
  { icao: "AXM", name: "AirAsia", callsignPrefix: "AXM", country: "MY", region: "AS" },
  { icao: "CCA", name: "Air China", callsignPrefix: "CCA", country: "CN", region: "AS" },
  { icao: "CES", name: "China Eastern Airlines", callsignPrefix: "CES", country: "CN", region: "AS" },
  { icao: "CSN", name: "China Southern Airlines", callsignPrefix: "CSN", country: "CN", region: "AS" },
  { icao: "CHH", name: "Hainan Airlines", callsignPrefix: "CHH", country: "CN", region: "AS" },
  { icao: "EVA", name: "EVA Air", callsignPrefix: "EVA", country: "TW", region: "AS" },
  { icao: "CAL", name: "China Airlines", callsignPrefix: "CAL", country: "TW", region: "AS" },
  { icao: "VNA", name: "Vietnam Airlines", callsignPrefix: "VNA", country: "VN", region: "AS" },
  { icao: "GIA", name: "Garuda Indonesia", callsignPrefix: "GIA", country: "ID", region: "AS" },
  { icao: "PAL", name: "Philippine Airlines", callsignPrefix: "PAL", country: "PH", region: "AS" },
  { icao: "CEB", name: "Cebu Pacific", callsignPrefix: "CEB", country: "PH", region: "AS" },

  // ── India & South Asia ─────────────────────────
  { icao: "AIC", name: "Air India", callsignPrefix: "AIC", country: "IN", region: "AS" },
  { icao: "IGO", name: "IndiGo", callsignPrefix: "IGO", country: "IN", region: "AS" },
  { icao: "SEJ", name: "SpiceJet", callsignPrefix: "SEJ", country: "IN", region: "AS" },
  { icao: "VTI", name: "Vistara", callsignPrefix: "VTI", country: "IN", region: "AS" },
  { icao: "AKJ", name: "Akasa Air", callsignPrefix: "AKJ", country: "IN", region: "AS" },
  { icao: "ALK", name: "SriLankan Airlines", callsignPrefix: "ALK", country: "LK", region: "AS" },
  { icao: "BBA", name: "Biman Bangladesh Airlines", callsignPrefix: "BBA", country: "BD", region: "AS" },
  { icao: "PIA", name: "Pakistan International Airlines", callsignPrefix: "PIA", country: "PK", region: "AS" },

  // ── Middle East ────────────────────────────────
  { icao: "UAE", name: "Emirates", callsignPrefix: "UAE", country: "AE", region: "ME" },
  { icao: "QTR", name: "Qatar Airways", callsignPrefix: "QTR", country: "QA", region: "ME" },
  { icao: "ETD", name: "Etihad Airways", callsignPrefix: "ETD", country: "AE", region: "ME" },
  { icao: "SVA", name: "Saudia", callsignPrefix: "SVA", country: "SA", region: "ME" },
  { icao: "GFA", name: "Gulf Air", callsignPrefix: "GFA", country: "BH", region: "ME" },
  { icao: "OMA", name: "Oman Air", callsignPrefix: "OMA", country: "OM", region: "ME" },
  { icao: "RJA", name: "Royal Jordanian", callsignPrefix: "RJA", country: "JO", region: "ME" },
  { icao: "MEA", name: "Middle East Airlines", callsignPrefix: "MEA", country: "LB", region: "ME" },
  { icao: "FDB", name: "flydubai", callsignPrefix: "FDB", country: "AE", region: "ME" },
  { icao: "KNE", name: "flynas", callsignPrefix: "KNE", country: "SA", region: "ME" },
  { icao: "ELY", name: "El Al", callsignPrefix: "ELY", country: "IL", region: "ME" },

  // ── Africa ─────────────────────────────────────
  { icao: "ETH", name: "Ethiopian Airlines", callsignPrefix: "ETH", country: "ET", region: "AF" },
  { icao: "SAA", name: "South African Airways", callsignPrefix: "SAA", country: "ZA", region: "AF" },
  { icao: "RAM", name: "Royal Air Maroc", callsignPrefix: "RAM", country: "MA", region: "AF" },
  { icao: "MSR", name: "EgyptAir", callsignPrefix: "MSR", country: "EG", region: "AF" },
  { icao: "KQA", name: "Kenya Airways", callsignPrefix: "KQA", country: "KE", region: "AF" },
  { icao: "RWD", name: "RwandAir", callsignPrefix: "RWD", country: "RW", region: "AF" },

  // ── South America ──────────────────────────────
  { icao: "LAN", name: "LATAM Airlines", callsignPrefix: "LAN", country: "CL", region: "SA" },
  { icao: "TAM", name: "LATAM Brasil", callsignPrefix: "TAM", country: "BR", region: "SA" },
  { icao: "GLO", name: "Gol Transportes Aereos", callsignPrefix: "GLO", country: "BR", region: "SA" },
  { icao: "AZU", name: "Azul Brazilian Airlines", callsignPrefix: "AZU", country: "BR", region: "SA" },
  { icao: "AVA", name: "Avianca", callsignPrefix: "AVA", country: "CO", region: "SA" },
  { icao: "ARG", name: "Aerolineas Argentinas", callsignPrefix: "ARG", country: "AR", region: "SA" },
  { icao: "CMP", name: "Copa Airlines", callsignPrefix: "CMP", country: "PA", region: "SA" },

  // ── Oceania ────────────────────────────────────
  { icao: "QFA", name: "Qantas", callsignPrefix: "QFA", country: "AU", region: "OC" },
  { icao: "ANZ", name: "Air New Zealand", callsignPrefix: "ANZ", country: "NZ", region: "OC" },
  { icao: "JST", name: "Jetstar Airways", callsignPrefix: "JST", country: "AU", region: "OC" },
  { icao: "VOZ", name: "Virgin Australia", callsignPrefix: "VOZ", country: "AU", region: "OC" },
  { icao: "FJI", name: "Fiji Airways", callsignPrefix: "FJI", country: "FJ", region: "OC" },
];

export default airlines;
