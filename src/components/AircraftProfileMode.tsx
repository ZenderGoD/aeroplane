"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import type { FlightState } from "@/types/flight";

// ─── Aircraft Type Database (~100 common types) ─────────────────────────────

interface AircraftTypeInfo {
  name: string;
  manufacturer: string;
  category: string;
  engines: number;
  engineType?: string;
  maxPax?: number;
  range?: string;
}

const AIRCRAFT_TYPES: Record<string, AircraftTypeInfo> = {
  // Airbus narrowbody
  A318: { name: "Airbus A318", manufacturer: "Airbus", category: "Narrow-body", engines: 2, engineType: "Turbofan", maxPax: 132, range: "3,100 nm" },
  A319: { name: "Airbus A319", manufacturer: "Airbus", category: "Narrow-body", engines: 2, engineType: "Turbofan", maxPax: 156, range: "3,700 nm" },
  A320: { name: "Airbus A320", manufacturer: "Airbus", category: "Narrow-body", engines: 2, engineType: "Turbofan", maxPax: 186, range: "3,300 nm" },
  A20N: { name: "Airbus A320neo", manufacturer: "Airbus", category: "Narrow-body", engines: 2, engineType: "Turbofan", maxPax: 194, range: "3,500 nm" },
  A321: { name: "Airbus A321", manufacturer: "Airbus", category: "Narrow-body", engines: 2, engineType: "Turbofan", maxPax: 236, range: "3,200 nm" },
  A21N: { name: "Airbus A321neo", manufacturer: "Airbus", category: "Narrow-body", engines: 2, engineType: "Turbofan", maxPax: 244, range: "4,000 nm" },
  // Airbus widebody
  A330: { name: "Airbus A330", manufacturer: "Airbus", category: "Wide-body", engines: 2, engineType: "Turbofan", maxPax: 440, range: "6,350 nm" },
  A332: { name: "Airbus A330-200", manufacturer: "Airbus", category: "Wide-body", engines: 2, engineType: "Turbofan", maxPax: 406, range: "7,250 nm" },
  A333: { name: "Airbus A330-300", manufacturer: "Airbus", category: "Wide-body", engines: 2, engineType: "Turbofan", maxPax: 440, range: "6,350 nm" },
  A338: { name: "Airbus A330-800neo", manufacturer: "Airbus", category: "Wide-body", engines: 2, engineType: "Turbofan", maxPax: 406, range: "8,150 nm" },
  A339: { name: "Airbus A330-900neo", manufacturer: "Airbus", category: "Wide-body", engines: 2, engineType: "Turbofan", maxPax: 440, range: "7,200 nm" },
  A340: { name: "Airbus A340", manufacturer: "Airbus", category: "Wide-body", engines: 4, engineType: "Turbofan", maxPax: 375, range: "7,400 nm" },
  A342: { name: "Airbus A340-200", manufacturer: "Airbus", category: "Wide-body", engines: 4, engineType: "Turbofan", maxPax: 261, range: "7,450 nm" },
  A343: { name: "Airbus A340-300", manufacturer: "Airbus", category: "Wide-body", engines: 4, engineType: "Turbofan", maxPax: 375, range: "7,400 nm" },
  A345: { name: "Airbus A340-500", manufacturer: "Airbus", category: "Wide-body", engines: 4, engineType: "Turbofan", maxPax: 313, range: "9,000 nm" },
  A346: { name: "Airbus A340-600", manufacturer: "Airbus", category: "Wide-body", engines: 4, engineType: "Turbofan", maxPax: 380, range: "7,900 nm" },
  A350: { name: "Airbus A350 XWB", manufacturer: "Airbus", category: "Wide-body", engines: 2, engineType: "Turbofan", maxPax: 440, range: "8,100 nm" },
  A359: { name: "Airbus A350-900", manufacturer: "Airbus", category: "Wide-body", engines: 2, engineType: "Turbofan", maxPax: 440, range: "8,100 nm" },
  A35K: { name: "Airbus A350-1000", manufacturer: "Airbus", category: "Wide-body", engines: 2, engineType: "Turbofan", maxPax: 480, range: "8,700 nm" },
  A380: { name: "Airbus A380", manufacturer: "Airbus", category: "Wide-body", engines: 4, engineType: "Turbofan", maxPax: 853, range: "8,000 nm" },
  A388: { name: "Airbus A380-800", manufacturer: "Airbus", category: "Wide-body", engines: 4, engineType: "Turbofan", maxPax: 853, range: "8,000 nm" },
  // Boeing narrowbody
  B731: { name: "Boeing 737-100", manufacturer: "Boeing", category: "Narrow-body", engines: 2, engineType: "Turbofan", maxPax: 124 },
  B732: { name: "Boeing 737-200", manufacturer: "Boeing", category: "Narrow-body", engines: 2, engineType: "Turbofan", maxPax: 136 },
  B733: { name: "Boeing 737-300", manufacturer: "Boeing", category: "Narrow-body", engines: 2, engineType: "Turbofan", maxPax: 149 },
  B734: { name: "Boeing 737-400", manufacturer: "Boeing", category: "Narrow-body", engines: 2, engineType: "Turbofan", maxPax: 188 },
  B735: { name: "Boeing 737-500", manufacturer: "Boeing", category: "Narrow-body", engines: 2, engineType: "Turbofan", maxPax: 132 },
  B736: { name: "Boeing 737-600", manufacturer: "Boeing", category: "Narrow-body", engines: 2, engineType: "Turbofan", maxPax: 132, range: "3,235 nm" },
  B737: { name: "Boeing 737-700", manufacturer: "Boeing", category: "Narrow-body", engines: 2, engineType: "Turbofan", maxPax: 149, range: "3,010 nm" },
  B738: { name: "Boeing 737-800", manufacturer: "Boeing", category: "Narrow-body", engines: 2, engineType: "Turbofan", maxPax: 189, range: "2,935 nm" },
  B739: { name: "Boeing 737-900", manufacturer: "Boeing", category: "Narrow-body", engines: 2, engineType: "Turbofan", maxPax: 215, range: "2,950 nm" },
  B37M: { name: "Boeing 737 MAX 7", manufacturer: "Boeing", category: "Narrow-body", engines: 2, engineType: "Turbofan", maxPax: 172, range: "3,850 nm" },
  B38M: { name: "Boeing 737 MAX 8", manufacturer: "Boeing", category: "Narrow-body", engines: 2, engineType: "Turbofan", maxPax: 210, range: "3,550 nm" },
  B39M: { name: "Boeing 737 MAX 9", manufacturer: "Boeing", category: "Narrow-body", engines: 2, engineType: "Turbofan", maxPax: 220, range: "3,550 nm" },
  B3XM: { name: "Boeing 737 MAX 10", manufacturer: "Boeing", category: "Narrow-body", engines: 2, engineType: "Turbofan", maxPax: 230, range: "3,300 nm" },
  // Boeing widebody
  B744: { name: "Boeing 747-400", manufacturer: "Boeing", category: "Wide-body", engines: 4, engineType: "Turbofan", maxPax: 524, range: "7,260 nm" },
  B748: { name: "Boeing 747-8", manufacturer: "Boeing", category: "Wide-body", engines: 4, engineType: "Turbofan", maxPax: 605, range: "7,730 nm" },
  B752: { name: "Boeing 757-200", manufacturer: "Boeing", category: "Narrow-body", engines: 2, engineType: "Turbofan", maxPax: 239, range: "3,900 nm" },
  B753: { name: "Boeing 757-300", manufacturer: "Boeing", category: "Narrow-body", engines: 2, engineType: "Turbofan", maxPax: 295, range: "3,395 nm" },
  B762: { name: "Boeing 767-200", manufacturer: "Boeing", category: "Wide-body", engines: 2, engineType: "Turbofan", maxPax: 290, range: "6,385 nm" },
  B763: { name: "Boeing 767-300", manufacturer: "Boeing", category: "Wide-body", engines: 2, engineType: "Turbofan", maxPax: 351, range: "5,990 nm" },
  B764: { name: "Boeing 767-400", manufacturer: "Boeing", category: "Wide-body", engines: 2, engineType: "Turbofan", maxPax: 375, range: "5,625 nm" },
  B772: { name: "Boeing 777-200", manufacturer: "Boeing", category: "Wide-body", engines: 2, engineType: "Turbofan", maxPax: 440, range: "5,240 nm" },
  B77L: { name: "Boeing 777-200LR", manufacturer: "Boeing", category: "Wide-body", engines: 2, engineType: "Turbofan", maxPax: 317, range: "8,555 nm" },
  B773: { name: "Boeing 777-300", manufacturer: "Boeing", category: "Wide-body", engines: 2, engineType: "Turbofan", maxPax: 550, range: "6,015 nm" },
  B77W: { name: "Boeing 777-300ER", manufacturer: "Boeing", category: "Wide-body", engines: 2, engineType: "Turbofan", maxPax: 550, range: "7,370 nm" },
  B778: { name: "Boeing 777-8", manufacturer: "Boeing", category: "Wide-body", engines: 2, engineType: "Turbofan", maxPax: 395, range: "8,730 nm" },
  B779: { name: "Boeing 777-9", manufacturer: "Boeing", category: "Wide-body", engines: 2, engineType: "Turbofan", maxPax: 426, range: "7,285 nm" },
  B788: { name: "Boeing 787-8", manufacturer: "Boeing", category: "Wide-body", engines: 2, engineType: "Turbofan", maxPax: 359, range: "7,355 nm" },
  B789: { name: "Boeing 787-9", manufacturer: "Boeing", category: "Wide-body", engines: 2, engineType: "Turbofan", maxPax: 406, range: "7,530 nm" },
  B78X: { name: "Boeing 787-10", manufacturer: "Boeing", category: "Wide-body", engines: 2, engineType: "Turbofan", maxPax: 440, range: "6,430 nm" },
  // Embraer
  E170: { name: "Embraer E170", manufacturer: "Embraer", category: "Regional Jet", engines: 2, engineType: "Turbofan", maxPax: 80, range: "2,100 nm" },
  E175: { name: "Embraer E175", manufacturer: "Embraer", category: "Regional Jet", engines: 2, engineType: "Turbofan", maxPax: 88, range: "2,200 nm" },
  E190: { name: "Embraer E190", manufacturer: "Embraer", category: "Regional Jet", engines: 2, engineType: "Turbofan", maxPax: 114, range: "2,450 nm" },
  E195: { name: "Embraer E195", manufacturer: "Embraer", category: "Regional Jet", engines: 2, engineType: "Turbofan", maxPax: 132, range: "2,300 nm" },
  E290: { name: "Embraer E190-E2", manufacturer: "Embraer", category: "Regional Jet", engines: 2, engineType: "Turbofan", maxPax: 114, range: "2,850 nm" },
  E295: { name: "Embraer E195-E2", manufacturer: "Embraer", category: "Regional Jet", engines: 2, engineType: "Turbofan", maxPax: 146, range: "2,600 nm" },
  // Bombardier / CRJ
  CRJ1: { name: "Bombardier CRJ-100", manufacturer: "Bombardier", category: "Regional Jet", engines: 2, engineType: "Turbofan", maxPax: 50, range: "1,650 nm" },
  CRJ2: { name: "Bombardier CRJ-200", manufacturer: "Bombardier", category: "Regional Jet", engines: 2, engineType: "Turbofan", maxPax: 50, range: "1,700 nm" },
  CRJ7: { name: "Bombardier CRJ-700", manufacturer: "Bombardier", category: "Regional Jet", engines: 2, engineType: "Turbofan", maxPax: 78, range: "1,378 nm" },
  CRJ9: { name: "Bombardier CRJ-900", manufacturer: "Bombardier", category: "Regional Jet", engines: 2, engineType: "Turbofan", maxPax: 90, range: "1,550 nm" },
  CRJX: { name: "Bombardier CRJ-1000", manufacturer: "Bombardier", category: "Regional Jet", engines: 2, engineType: "Turbofan", maxPax: 104, range: "1,590 nm" },
  // ATR
  AT43: { name: "ATR 42-300", manufacturer: "ATR", category: "Turboprop", engines: 2, engineType: "Turboprop", maxPax: 48, range: "630 nm" },
  AT45: { name: "ATR 42-500", manufacturer: "ATR", category: "Turboprop", engines: 2, engineType: "Turboprop", maxPax: 48, range: "740 nm" },
  AT46: { name: "ATR 42-600", manufacturer: "ATR", category: "Turboprop", engines: 2, engineType: "Turboprop", maxPax: 48, range: "740 nm" },
  AT72: { name: "ATR 72-200", manufacturer: "ATR", category: "Turboprop", engines: 2, engineType: "Turboprop", maxPax: 74, range: "825 nm" },
  AT75: { name: "ATR 72-500", manufacturer: "ATR", category: "Turboprop", engines: 2, engineType: "Turboprop", maxPax: 74, range: "825 nm" },
  AT76: { name: "ATR 72-600", manufacturer: "ATR", category: "Turboprop", engines: 2, engineType: "Turboprop", maxPax: 78, range: "825 nm" },
  // Dash 8
  DH8A: { name: "Dash 8-100", manufacturer: "De Havilland Canada", category: "Turboprop", engines: 2, engineType: "Turboprop", maxPax: 39, range: "675 nm" },
  DH8B: { name: "Dash 8-200", manufacturer: "De Havilland Canada", category: "Turboprop", engines: 2, engineType: "Turboprop", maxPax: 39, range: "900 nm" },
  DH8C: { name: "Dash 8-300", manufacturer: "De Havilland Canada", category: "Turboprop", engines: 2, engineType: "Turboprop", maxPax: 56, range: "800 nm" },
  DH8D: { name: "Dash 8-400", manufacturer: "De Havilland Canada", category: "Turboprop", engines: 2, engineType: "Turboprop", maxPax: 90, range: "1,100 nm" },
  // General Aviation / Cessna / Piper
  C152: { name: "Cessna 152", manufacturer: "Cessna", category: "Light Aircraft", engines: 1, engineType: "Piston", maxPax: 2, range: "415 nm" },
  C172: { name: "Cessna 172 Skyhawk", manufacturer: "Cessna", category: "Light Aircraft", engines: 1, engineType: "Piston", maxPax: 4, range: "640 nm" },
  C182: { name: "Cessna 182 Skylane", manufacturer: "Cessna", category: "Light Aircraft", engines: 1, engineType: "Piston", maxPax: 4, range: "915 nm" },
  C206: { name: "Cessna 206 Stationair", manufacturer: "Cessna", category: "Light Aircraft", engines: 1, engineType: "Piston", maxPax: 6, range: "750 nm" },
  C208: { name: "Cessna 208 Caravan", manufacturer: "Cessna", category: "Turboprop", engines: 1, engineType: "Turboprop", maxPax: 14, range: "1,070 nm" },
  C210: { name: "Cessna 210 Centurion", manufacturer: "Cessna", category: "Light Aircraft", engines: 1, engineType: "Piston", maxPax: 6, range: "930 nm" },
  C25A: { name: "Cessna Citation CJ2", manufacturer: "Cessna", category: "Light Jet", engines: 2, engineType: "Turbofan", maxPax: 8, range: "1,613 nm" },
  C25B: { name: "Cessna Citation CJ3", manufacturer: "Cessna", category: "Light Jet", engines: 2, engineType: "Turbofan", maxPax: 9, range: "2,040 nm" },
  C510: { name: "Cessna Citation Mustang", manufacturer: "Cessna", category: "Very Light Jet", engines: 2, engineType: "Turbofan", maxPax: 5, range: "1,150 nm" },
  C525: { name: "Cessna Citation CJ1", manufacturer: "Cessna", category: "Light Jet", engines: 2, engineType: "Turbofan", maxPax: 6, range: "1,300 nm" },
  C560: { name: "Cessna Citation V", manufacturer: "Cessna", category: "Midsize Jet", engines: 2, engineType: "Turbofan", maxPax: 10, range: "2,100 nm" },
  C680: { name: "Cessna Citation Sovereign", manufacturer: "Cessna", category: "Super-midsize Jet", engines: 2, engineType: "Turbofan", maxPax: 12, range: "2,847 nm" },
  C750: { name: "Cessna Citation X", manufacturer: "Cessna", category: "Super-midsize Jet", engines: 2, engineType: "Turbofan", maxPax: 12, range: "3,460 nm" },
  PA28: { name: "Piper PA-28 Cherokee", manufacturer: "Piper", category: "Light Aircraft", engines: 1, engineType: "Piston", maxPax: 4, range: "515 nm" },
  PA32: { name: "Piper PA-32 Saratoga", manufacturer: "Piper", category: "Light Aircraft", engines: 1, engineType: "Piston", maxPax: 6, range: "650 nm" },
  PA34: { name: "Piper PA-34 Seneca", manufacturer: "Piper", category: "Light Aircraft", engines: 2, engineType: "Piston", maxPax: 6, range: "730 nm" },
  PA46: { name: "Piper PA-46 Malibu", manufacturer: "Piper", category: "Light Aircraft", engines: 1, engineType: "Piston", maxPax: 6, range: "1,300 nm" },
  // Beechcraft / Hawker
  BE20: { name: "Beechcraft King Air 200", manufacturer: "Beechcraft", category: "Turboprop", engines: 2, engineType: "Turboprop", maxPax: 13, range: "1,580 nm" },
  BE36: { name: "Beechcraft Bonanza", manufacturer: "Beechcraft", category: "Light Aircraft", engines: 1, engineType: "Piston", maxPax: 6, range: "920 nm" },
  B350: { name: "Beechcraft King Air 350", manufacturer: "Beechcraft", category: "Turboprop", engines: 2, engineType: "Turboprop", maxPax: 11, range: "1,806 nm" },
  // Business jets
  GL5T: { name: "Bombardier Global 5500", manufacturer: "Bombardier", category: "Ultra-long Range Jet", engines: 2, engineType: "Turbofan", maxPax: 16, range: "5,900 nm" },
  GL7T: { name: "Bombardier Global 7500", manufacturer: "Bombardier", category: "Ultra-long Range Jet", engines: 2, engineType: "Turbofan", maxPax: 19, range: "7,700 nm" },
  GLEX: { name: "Bombardier Global Express", manufacturer: "Bombardier", category: "Ultra-long Range Jet", engines: 2, engineType: "Turbofan", maxPax: 17, range: "6,000 nm" },
  CL30: { name: "Bombardier Challenger 300", manufacturer: "Bombardier", category: "Super-midsize Jet", engines: 2, engineType: "Turbofan", maxPax: 10, range: "3,100 nm" },
  CL35: { name: "Bombardier Challenger 350", manufacturer: "Bombardier", category: "Super-midsize Jet", engines: 2, engineType: "Turbofan", maxPax: 10, range: "3,200 nm" },
  G280: { name: "Gulfstream G280", manufacturer: "Gulfstream", category: "Super-midsize Jet", engines: 2, engineType: "Turbofan", maxPax: 10, range: "3,600 nm" },
  GLF5: { name: "Gulfstream G550", manufacturer: "Gulfstream", category: "Large Cabin Jet", engines: 2, engineType: "Turbofan", maxPax: 18, range: "6,750 nm" },
  GLF6: { name: "Gulfstream G650", manufacturer: "Gulfstream", category: "Ultra-long Range Jet", engines: 2, engineType: "Turbofan", maxPax: 18, range: "7,000 nm" },
  // Sukhoi / COMAC
  SU95: { name: "Sukhoi Superjet 100", manufacturer: "Sukhoi", category: "Regional Jet", engines: 2, engineType: "Turbofan", maxPax: 108, range: "1,645 nm" },
  C919: { name: "COMAC C919", manufacturer: "COMAC", category: "Narrow-body", engines: 2, engineType: "Turbofan", maxPax: 192, range: "3,000 nm" },
  // Military / Cargo
  C130: { name: "Lockheed C-130 Hercules", manufacturer: "Lockheed Martin", category: "Military Transport", engines: 4, engineType: "Turboprop" },
  C17: { name: "Boeing C-17 Globemaster III", manufacturer: "Boeing", category: "Military Transport", engines: 4, engineType: "Turbofan" },
  A400: { name: "Airbus A400M Atlas", manufacturer: "Airbus", category: "Military Transport", engines: 4, engineType: "Turboprop" },
  E3CF: { name: "Boeing E-3 Sentry (AWACS)", manufacturer: "Boeing", category: "Military", engines: 4, engineType: "Turbofan" },
  K35R: { name: "Boeing KC-135 Stratotanker", manufacturer: "Boeing", category: "Military Tanker", engines: 4, engineType: "Turbofan" },
  F16: { name: "General Dynamics F-16", manufacturer: "General Dynamics", category: "Fighter", engines: 1, engineType: "Turbofan" },
  F18S: { name: "Boeing F/A-18 Super Hornet", manufacturer: "Boeing", category: "Fighter", engines: 2, engineType: "Turbofan" },
  // Helicopters
  EC35: { name: "Airbus EC135", manufacturer: "Airbus Helicopters", category: "Light Helicopter", engines: 2, engineType: "Turboshaft" },
  EC45: { name: "Airbus EC145", manufacturer: "Airbus Helicopters", category: "Light Helicopter", engines: 2, engineType: "Turboshaft" },
  S76: { name: "Sikorsky S-76", manufacturer: "Sikorsky", category: "Medium Helicopter", engines: 2, engineType: "Turboshaft" },
  R22: { name: "Robinson R22", manufacturer: "Robinson", category: "Light Helicopter", engines: 1, engineType: "Piston" },
  R44: { name: "Robinson R44", manufacturer: "Robinson", category: "Light Helicopter", engines: 1, engineType: "Piston" },
  B06: { name: "Bell 206 JetRanger", manufacturer: "Bell", category: "Light Helicopter", engines: 1, engineType: "Turboshaft" },
  B429: { name: "Bell 429", manufacturer: "Bell", category: "Light Helicopter", engines: 2, engineType: "Turboshaft" },
};

// ─── Registration Prefix → Country Database ──────────────────────────────────

const REGISTRATION_PREFIXES: Record<string, string> = {
  // Two-character prefixes first (checked before single-char)
  "VT": "India",
  "VH": "Australia",
  "VP": "British Overseas Territories",
  "VQ": "British Overseas Territories",
  "VR": "Hong Kong",
  "VP-B": "Bermuda",
  "ZS": "South Africa",
  "ZK": "New Zealand",
  "ZU": "South Africa",
  "HL": "South Korea",
  "HS": "Thailand",
  "HB": "Switzerland",
  "HZ": "Saudi Arabia",
  "HA": "Hungary",
  "HK": "Colombia",
  "PH": "Netherlands",
  "PP": "Brazil",
  "PR": "Brazil",
  "PT": "Brazil",
  "PS": "Brazil",
  "PK": "Indonesia",
  "PI": "Indonesia",
  "OO": "Belgium",
  "OY": "Denmark",
  "OH": "Finland",
  "OE": "Austria",
  "OK": "Czech Republic",
  "OM": "Slovakia",
  "LN": "Norway",
  "LV": "Argentina",
  "LX": "Luxembourg",
  "LY": "Lithuania",
  "LZ": "Bulgaria",
  "SE": "Sweden",
  "SP": "Poland",
  "SU": "Egypt",
  "SX": "Greece",
  "TC": "Turkey",
  "TF": "Iceland",
  "TI": "Costa Rica",
  "TS": "Tunisia",
  "EC": "Spain",
  "EI": "Ireland",
  "EP": "Iran",
  "ER": "Moldova",
  "ES": "Estonia",
  "EW": "Belarus",
  "EX": "Kyrgyzstan",
  "AP": "Pakistan",
  "A6": "United Arab Emirates",
  "A7": "Qatar",
  "A9C": "Bahrain",
  "9V": "Singapore",
  "9M": "Malaysia",
  "9H": "Malta",
  "9G": "Ghana",
  "4X": "Israel",
  "4R": "Sri Lanka",
  "5N": "Nigeria",
  "5H": "Tanzania",
  "5Y": "Kenya",
  "7T": "Algeria",
  "JA": "Japan",
  "JY": "Jordan",
  "RP": "Philippines",
  "XA": "Mexico",
  "XB": "Mexico",
  "XC": "Mexico",
  "YR": "Romania",
  "YU": "Serbia",
  "YV": "Venezuela",
  "CC": "Chile",
  "CN": "Morocco",
  "CS": "Portugal",
  "CU": "Cuba",
  "B-": "China/Taiwan",
  // Single-character prefixes
  "N": "United States",
  "G": "United Kingdom",
  "D": "Germany",
  "F": "France",
  "I": "Italy",
  "C": "Canada",
  "J": "Japan",
  "T": "Turkey",
};

// ─── Airline Prefix → Operator Name ──────────────────────────────────────────

const AIRLINE_PREFIXES: Record<string, string> = {
  "AAL": "American Airlines",
  "AIC": "Air India",
  "ANA": "All Nippon Airways",
  "AFR": "Air France",
  "BAW": "British Airways",
  "CPA": "Cathay Pacific",
  "DAL": "Delta Air Lines",
  "DLH": "Lufthansa",
  "EIN": "Aer Lingus",
  "ETH": "Ethiopian Airlines",
  "EVA": "EVA Air",
  "FDX": "FedEx Express",
  "IBE": "Iberia",
  "ICE": "Icelandair",
  "JAL": "Japan Airlines",
  "KAL": "Korean Air",
  "KLM": "KLM Royal Dutch",
  "MAS": "Malaysia Airlines",
  "QFA": "Qantas",
  "QTR": "Qatar Airways",
  "RYR": "Ryanair",
  "SAS": "Scandinavian Airlines",
  "SIA": "Singapore Airlines",
  "SKW": "SkyWest Airlines",
  "SWA": "Southwest Airlines",
  "SWR": "Swiss International",
  "THY": "Turkish Airlines",
  "UAE": "Emirates",
  "UAL": "United Airlines",
  "UPS": "UPS Airlines",
  "VIR": "Virgin Atlantic",
  "WZZ": "Wizz Air",
  "EZY": "easyJet",
  "ASA": "Alaska Airlines",
  "JBU": "JetBlue Airways",
  "IGO": "IndiGo",
  "AXB": "Air India Express",
  "SEJ": "SpiceJet",
  "VOZ": "Virgin Australia",
  "CCA": "Air China",
  "CES": "China Eastern",
  "CSN": "China Southern",
  "CAL": "China Airlines",
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getCountryFromRegistration(reg: string | undefined): string | null {
  if (!reg) return null;
  const upper = reg.toUpperCase();
  // Try 3-char, then 2-char, then 1-char prefixes
  for (const len of [3, 2, 1]) {
    const prefix = upper.substring(0, len);
    if (REGISTRATION_PREFIXES[prefix]) return REGISTRATION_PREFIXES[prefix];
  }
  return null;
}

function getAirlineFromCallsign(callsign: string | null): string | null {
  if (!callsign) return null;
  const prefix = callsign.trim().substring(0, 3).toUpperCase();
  return AIRLINE_PREFIXES[prefix] || null;
}

function getAircraftTypeInfo(typeCode: string | undefined): AircraftTypeInfo | null {
  if (!typeCode) return null;
  return AIRCRAFT_TYPES[typeCode.toUpperCase()] || null;
}

function isMilitary(dbFlags: number | undefined): boolean {
  if (dbFlags === undefined) return false;
  return (dbFlags & 1) !== 0;
}

function qualityLevel(value: number | undefined, thresholds: [number, number]): "high" | "medium" | "low" | "unknown" {
  if (value === undefined) return "unknown";
  if (value >= thresholds[1]) return "high";
  if (value >= thresholds[0]) return "medium";
  return "low";
}

function qualityColor(level: "high" | "medium" | "low" | "unknown"): string {
  switch (level) {
    case "high": return "var(--status-nominal)";
    case "medium": return "var(--status-caution)";
    case "low": return "var(--status-critical)";
    default: return "var(--text-faint)";
  }
}

function formatCoord(value: number | null, type: "lat" | "lon"): string {
  if (value === null) return "---";
  const abs = Math.abs(value);
  const deg = Math.floor(abs);
  const min = Math.floor((abs - deg) * 60);
  const sec = ((abs - deg - min / 60) * 3600).toFixed(1);
  const dir = type === "lat" ? (value >= 0 ? "N" : "S") : (value >= 0 ? "E" : "W");
  return `${deg}\u00B0${min}'${sec}"${dir}`;
}

const METERS_TO_FEET = 3.28084;
const MS_TO_KNOTS = 1.94384;
const MS_TO_FPM = 196.85;

// ─── Component ───────────────────────────────────────────────────────────────

interface Props {
  onExitMode?: () => void;
}

export default function AircraftProfileMode({ onExitMode }: Props) {
  const [searchQuery, setSearchQuery] = useState("");
  const [aircraft, setAircraft] = useState<FlightState | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

  // Mini-map refs
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const trailRef = useRef<L.Polyline | null>(null);

  // Auto-refresh timer
  const refreshIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const searchAircraft = useCallback(async (query?: string) => {
    const q = (query ?? searchQuery).trim();
    if (!q) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/aircraft/${encodeURIComponent(q)}`);
      const data = await res.json();

      if (!res.ok || !data.aircraft) {
        setError(data.error || "Aircraft not found");
        setAircraft(null);
      } else {
        setAircraft(data.aircraft);
        setError(null);
      }
    } catch {
      setError("Network error. Please try again.");
      setAircraft(null);
    } finally {
      setLoading(false);
      setHasSearched(true);
    }
  }, [searchQuery]);

  // Auto-refresh every 15s when aircraft is active
  useEffect(() => {
    if (aircraft && searchQuery.trim()) {
      refreshIntervalRef.current = setInterval(() => {
        searchAircraft();
      }, 15_000);
    }
    return () => {
      if (refreshIntervalRef.current) clearInterval(refreshIntervalRef.current);
    };
  }, [aircraft, searchQuery, searchAircraft]);

  // ─── Mini-map initialization (imperative Leaflet) ─────────────────────────
  useEffect(() => {
    if (!aircraft?.latitude || !aircraft?.longitude || !mapContainerRef.current) {
      // Cleanup map if no position
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
        markerRef.current = null;
        trailRef.current = null;
      }
      return;
    }

    const initMap = async () => {
      const L = (await import("leaflet")).default;
      require("leaflet/dist/leaflet.css");

      if (!mapContainerRef.current) return;

      // Create map if not exists
      if (!mapInstanceRef.current) {
        mapInstanceRef.current = L.map(mapContainerRef.current, {
          center: [aircraft.latitude!, aircraft.longitude!],
          zoom: 8,
          zoomControl: false,
          attributionControl: false,
        });

        L.tileLayer(
          "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
          { maxZoom: 18 }
        ).addTo(mapInstanceRef.current);

        // Add zoom control top-right
        L.control.zoom({ position: "topright" }).addTo(mapInstanceRef.current);
      }

      const map = mapInstanceRef.current;
      const pos: [number, number] = [aircraft.latitude!, aircraft.longitude!];

      // Update or create marker
      if (markerRef.current) {
        markerRef.current.setLatLng(pos);
      } else {
        const heading = aircraft.trueTrack ?? 0;
        const icon = L.divIcon({
          className: "leaflet-div-icon",
          html: `<div style="
            width: 28px; height: 28px;
            display: flex; align-items: center; justify-content: center;
            transform: rotate(${heading}deg);
            filter: drop-shadow(0 0 6px rgba(56, 189, 248, 0.6));
          ">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M12 2L8 10L2 12L8 14L12 22L16 14L22 12L16 10L12 2Z" fill="#38bdf8" stroke="#0c4a6e" stroke-width="0.5"/>
            </svg>
          </div>`,
          iconSize: [28, 28],
          iconAnchor: [14, 14],
        });
        markerRef.current = L.marker(pos, { icon }).addTo(map);
      }

      // Trail
      if (trailRef.current) {
        const latlngs = trailRef.current.getLatLngs() as L.LatLng[];
        latlngs.push(L.latLng(pos[0], pos[1]));
        // Keep last 50 trail points
        if (latlngs.length > 50) latlngs.shift();
        trailRef.current.setLatLngs(latlngs);
      } else {
        trailRef.current = L.polyline([pos], {
          color: "#38bdf8",
          weight: 2,
          opacity: 0.5,
          dashArray: "4 6",
        }).addTo(map);
      }

      map.panTo(pos, { animate: true, duration: 0.5 });
    };

    initMap();

    return () => {
      // Don't destroy on every re-render; only when unmounting
    };
  }, [aircraft?.latitude, aircraft?.longitude, aircraft?.trueTrack]);

  // Cleanup map on unmount
  useEffect(() => {
    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") searchAircraft();
  };

  // Derived data
  const typeInfo = getAircraftTypeInfo(aircraft?.typeCode);
  const country = getCountryFromRegistration(aircraft?.registration);
  const airline = getAirlineFromCallsign(aircraft?.callsign ?? null);
  const military = isMilitary(aircraft?.dbFlags);

  const nicLevel = qualityLevel(aircraft?.nic, [4, 7]);
  const nacpLevel = qualityLevel(aircraft?.nacP, [5, 8]);
  const silLevel = qualityLevel(aircraft?.sil, [1, 2]);

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div
      className="h-full flex flex-col animate-fade-in"
      style={{ background: "var(--surface-0)", color: "var(--text-primary)" }}
    >
      {/* Header */}
      <div
        className="flex items-center gap-3 px-5 py-4 shrink-0"
        style={{ borderBottom: "1px solid var(--border-default)" }}
      >
        {onExitMode && (
          <button
            onClick={onExitMode}
            className="flex items-center justify-center w-8 h-8 rounded-lg transition-colors"
            style={{
              background: "var(--surface-2)",
              border: "1px solid var(--border-default)",
              color: "var(--text-secondary)",
            }}
            title="Exit Aircraft Profile"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M10 12L6 8L10 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        )}
        <div className="flex items-center gap-2">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" style={{ color: "var(--accent-primary)" }}>
            <path d="M12 2L8 10L2 12L8 14L12 22L16 14L22 12L16 10L12 2Z" fill="currentColor" opacity="0.3" stroke="currentColor" strokeWidth="1.5"/>
          </svg>
          <span className="panel-title" style={{ fontSize: "0.875rem" }}>AIRCRAFT PROFILE</span>
        </div>
      </div>

      {/* Search Bar */}
      <div className="px-5 py-4 shrink-0" style={{ borderBottom: "1px solid var(--border-subtle)" }}>
        <div
          className="flex items-center gap-2 rounded-xl px-4 py-2.5 transition-all"
          style={{
            background: "var(--surface-2)",
            border: "1px solid var(--border-default)",
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style={{ color: "var(--text-muted)", flexShrink: 0 }}>
            <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2"/>
            <path d="M16 16L20 20" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          </svg>
          <input
            type="text"
            placeholder="Search by registration, hex, or callsign..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            className="flex-1 bg-transparent outline-none data-value"
            style={{
              color: "var(--text-primary)",
              fontSize: "0.8125rem",
              letterSpacing: "0.02em",
            }}
          />
          <button
            onClick={() => searchAircraft()}
            disabled={loading || !searchQuery.trim()}
            className="flex items-center justify-center px-3 py-1 rounded-lg transition-all text-xs font-semibold"
            style={{
              background: searchQuery.trim() ? "var(--accent-primary)" : "var(--surface-3)",
              color: searchQuery.trim() ? "#0c1018" : "var(--text-muted)",
              opacity: loading ? 0.6 : 1,
            }}
          >
            {loading ? (
              <div className="w-3.5 h-3.5 border-2 rounded-full animate-spin" style={{ borderColor: "transparent", borderTopColor: "currentColor" }} />
            ) : (
              "SEARCH"
            )}
          </button>
        </div>
        <div className="flex gap-3 mt-2 px-1">
          {["VT-ANB", "800c2a", "AIC101"].map((example) => (
            <button
              key={example}
              onClick={() => { setSearchQuery(example); searchAircraft(example); }}
              className="text-xs transition-colors data-value"
              style={{ color: "var(--text-faint)" }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "var(--accent-primary)")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text-faint)")}
            >
              {example}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto scrollbar-thin px-5 py-4 space-y-4">
        {/* Error State */}
        {error && (
          <div
            className="rounded-xl px-4 py-3 flex items-center gap-3 animate-slide-up"
            style={{
              background: "rgba(248, 113, 113, 0.08)",
              border: "1px solid rgba(248, 113, 113, 0.2)",
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style={{ color: "var(--status-critical)", flexShrink: 0 }}>
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
              <path d="M12 8v4M12 16h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
            <span className="text-xs" style={{ color: "var(--status-critical)" }}>{error}</span>
          </div>
        )}

        {/* Empty State */}
        {!aircraft && !loading && !error && (
          <div className="flex flex-col items-center justify-center py-16 gap-4 opacity-60">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" style={{ color: "var(--text-faint)" }}>
              <path d="M12 2L8 10L2 12L8 14L12 22L16 14L22 12L16 10L12 2Z" stroke="currentColor" strokeWidth="1" opacity="0.4"/>
            </svg>
            <div className="text-center">
              <p className="text-sm font-medium" style={{ color: "var(--text-tertiary)" }}>
                {hasSearched ? "No active aircraft found" : "Search for an aircraft"}
              </p>
              <p className="text-xs mt-1" style={{ color: "var(--text-faint)" }}>
                Enter a registration, ICAO24 hex code, or callsign
              </p>
            </div>
          </div>
        )}

        {/* Loading Skeleton */}
        {loading && !aircraft && (
          <div className="space-y-4 animate-fade-in">
            <div className="skeleton h-32 rounded-xl" />
            <div className="skeleton h-48 rounded-xl" />
            <div className="skeleton h-24 rounded-xl" />
          </div>
        )}

        {/* Aircraft Data */}
        {aircraft && (
          <div className="space-y-4 animate-slide-up">
            {/* ── Identity Card ─────────────────────────────────── */}
            <div
              className="glass-card rounded-xl p-4"
              style={{ border: "1px solid var(--border-accent)" }}
            >
              {/* Top row: reg + status badges */}
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="data-readout" style={{ fontSize: "1.25rem", color: "var(--accent-primary)" }}>
                      {aircraft.registration || aircraft.icao24.toUpperCase()}
                    </span>
                    {military && (
                      <span className="badge badge-critical">MIL</span>
                    )}
                    {aircraft.onGround && (
                      <span className="badge badge-caution">GND</span>
                    )}
                  </div>
                  {aircraft.callsign && (
                    <div className="flex items-center gap-2 mt-1">
                      <span className="data-value text-xs" style={{ color: "var(--text-secondary)" }}>
                        {aircraft.callsign}
                      </span>
                      {airline && (
                        <span className="text-xs" style={{ color: "var(--text-muted)" }}>{airline}</span>
                      )}
                    </div>
                  )}
                </div>
                <div
                  className="flex items-center gap-1 px-2 py-1 rounded-md"
                  style={{ background: "var(--accent-primary-dim)" }}
                >
                  <div
                    className="w-1.5 h-1.5 rounded-full"
                    style={{
                      background: "var(--status-nominal)",
                      boxShadow: "0 0 6px var(--status-nominal)",
                    }}
                  />
                  <span className="text-xs font-medium" style={{ color: "var(--accent-primary)" }}>LIVE</span>
                </div>
              </div>

              {/* Identity grid */}
              <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                <DataField label="ICAO24 HEX" value={aircraft.icao24.toUpperCase()} mono />
                <DataField label="TYPE" value={aircraft.typeCode || "---"} mono />
                {typeInfo && (
                  <>
                    <DataField label="AIRCRAFT" value={typeInfo.name} />
                    <DataField label="MANUFACTURER" value={typeInfo.manufacturer} />
                    <DataField label="CATEGORY" value={typeInfo.category} />
                    <DataField label="ENGINES" value={`${typeInfo.engines}x ${typeInfo.engineType || ""}`} />
                    {typeInfo.maxPax && <DataField label="MAX PAX" value={String(typeInfo.maxPax)} mono />}
                    {typeInfo.range && <DataField label="RANGE" value={typeInfo.range} mono />}
                  </>
                )}
                {country && <DataField label="COUNTRY" value={country} />}
                {aircraft.positionSource && <DataField label="POS SOURCE" value={aircraft.positionSource} mono />}
              </div>
            </div>

            {/* ── Data Quality Indicators ────────────────────────── */}
            <div className="glass-card rounded-xl p-4">
              <div className="section-label mb-3">DATA QUALITY</div>
              <div className="grid grid-cols-3 gap-3">
                <QualityBar label="NIC" value={aircraft.nic} level={nicLevel} description="Navigation Integrity" />
                <QualityBar label="NACp" value={aircraft.nacP} level={nacpLevel} description="Navigational Accuracy" />
                <QualityBar label="SIL" value={aircraft.sil} level={silLevel} description="Source Integrity" />
              </div>
              {aircraft.rc !== undefined && (
                <div className="mt-2 flex items-center gap-2">
                  <span className="data-label">Containment Radius:</span>
                  <span className="data-value text-xs" style={{ color: "var(--text-secondary)" }}>
                    {aircraft.rc < 1000 ? `${aircraft.rc}m` : `${(aircraft.rc / 1000).toFixed(1)}km`}
                  </span>
                </div>
              )}
            </div>

            {/* ── Live Position Section ──────────────────────────── */}
            {aircraft.latitude !== null && aircraft.longitude !== null && (
              <div className="glass-card rounded-xl overflow-hidden">
                <div className="section-label px-4 pt-4 pb-2">LIVE POSITION</div>
                {/* Mini-map */}
                <div
                  ref={mapContainerRef}
                  className="w-full"
                  style={{
                    height: "200px",
                    borderTop: "1px solid var(--border-subtle)",
                    borderBottom: "1px solid var(--border-subtle)",
                  }}
                />
                {/* Position data grid */}
                <div className="grid grid-cols-2 gap-x-4 gap-y-2 p-4">
                  <DataField
                    label="ALTITUDE (BARO)"
                    value={aircraft.baroAltitude !== null ? `${Math.round(aircraft.baroAltitude * METERS_TO_FEET).toLocaleString()} ft` : "---"}
                    mono
                  />
                  <DataField
                    label="ALTITUDE (GEO)"
                    value={aircraft.geoAltitude !== null ? `${Math.round(aircraft.geoAltitude * METERS_TO_FEET).toLocaleString()} ft` : "---"}
                    mono
                  />
                  <DataField
                    label="GROUND SPEED"
                    value={aircraft.velocity !== null ? `${Math.round(aircraft.velocity * MS_TO_KNOTS)} kts` : "---"}
                    mono
                  />
                  <DataField
                    label="HEADING"
                    value={aircraft.trueTrack !== null ? `${aircraft.trueTrack.toFixed(1)}\u00B0` : "---"}
                    mono
                  />
                  <DataField
                    label="VERTICAL RATE"
                    value={aircraft.verticalRate !== null ? `${aircraft.verticalRate > 0 ? "+" : ""}${Math.round(aircraft.verticalRate * MS_TO_FPM)} fpm` : "---"}
                    mono
                    color={aircraft.verticalRate !== null ? (aircraft.verticalRate > 2 ? "var(--status-nominal)" : aircraft.verticalRate < -2 ? "var(--status-critical)" : undefined) : undefined}
                  />
                  <DataField
                    label="SQUAWK"
                    value={aircraft.squawk || "---"}
                    mono
                    color={
                      aircraft.squawk === "7700" ? "var(--status-critical)" :
                      aircraft.squawk === "7600" ? "var(--status-warning)" :
                      aircraft.squawk === "7500" ? "var(--status-critical)" :
                      undefined
                    }
                  />
                  <DataField label="LATITUDE" value={formatCoord(aircraft.latitude, "lat")} mono />
                  <DataField label="LONGITUDE" value={formatCoord(aircraft.longitude, "lon")} mono />
                </div>
              </div>
            )}

            {/* ── Performance Section ────────────────────────────── */}
            {(aircraft.ias !== undefined || aircraft.tas !== undefined || aircraft.mach !== undefined) && (
              <div className="glass-card rounded-xl p-4">
                <div className="section-label mb-3">PERFORMANCE</div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                  {aircraft.ias !== undefined && (
                    <DataField label="IAS" value={`${Math.round(aircraft.ias)} kts`} mono />
                  )}
                  {aircraft.tas !== undefined && (
                    <DataField label="TAS" value={`${Math.round(aircraft.tas)} kts`} mono />
                  )}
                  {aircraft.mach !== undefined && (
                    <DataField label="MACH" value={`M ${aircraft.mach.toFixed(3)}`} mono />
                  )}
                  {aircraft.velocity !== null && (
                    <DataField label="GS" value={`${Math.round(aircraft.velocity * MS_TO_KNOTS)} kts`} mono />
                  )}
                  {aircraft.windSpeed !== undefined && (
                    <DataField
                      label="WIND"
                      value={`${Math.round(aircraft.windSpeed)} kts @ ${aircraft.windDirection !== undefined ? `${Math.round(aircraft.windDirection)}\u00B0` : "---"}`}
                      mono
                    />
                  )}
                  {aircraft.oat !== undefined && (
                    <DataField label="OAT" value={`${aircraft.oat}\u00B0C`} mono />
                  )}
                  {aircraft.tat !== undefined && (
                    <DataField label="TAT" value={`${aircraft.tat}\u00B0C`} mono />
                  )}
                  {aircraft.roll !== undefined && (
                    <DataField
                      label="ROLL"
                      value={`${aircraft.roll > 0 ? "+" : ""}${aircraft.roll.toFixed(1)}\u00B0`}
                      mono
                      color={Math.abs(aircraft.roll) > 25 ? "var(--status-caution)" : undefined}
                    />
                  )}
                </div>
                {/* Nav modes */}
                {aircraft.navModes && aircraft.navModes.length > 0 && (
                  <div className="mt-3 flex items-center gap-2 flex-wrap">
                    <span className="data-label">NAV:</span>
                    {aircraft.navModes.map((mode) => (
                      <span key={mode} className="badge badge-info">{mode}</span>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ── Squawk Alert Banner ────────────────────────────── */}
            {aircraft.squawk && ["7700", "7600", "7500"].includes(aircraft.squawk) && (
              <div
                className="rounded-xl px-4 py-3 animate-anomaly-pulse"
                style={{
                  background: "rgba(248, 113, 113, 0.12)",
                  border: "1px solid rgba(248, 113, 113, 0.3)",
                }}
              >
                <div className="flex items-center gap-2">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style={{ color: "var(--status-critical)" }}>
                    <path d="M12 9v4M12 17h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  <span className="text-sm font-bold" style={{ color: "var(--status-critical)" }}>
                    {aircraft.squawk === "7700" ? "EMERGENCY (7700)" :
                     aircraft.squawk === "7600" ? "RADIO FAILURE (7600)" :
                     "HIJACK (7500)"}
                  </span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function DataField({
  label,
  value,
  mono,
  color,
}: {
  label: string;
  value: string;
  mono?: boolean;
  color?: string;
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="data-label">{label}</span>
      <span
        className={mono ? "data-value" : ""}
        style={{
          fontSize: "0.8125rem",
          fontWeight: 600,
          color: color || "var(--text-primary)",
          letterSpacing: mono ? "0.02em" : undefined,
        }}
      >
        {value}
      </span>
    </div>
  );
}

function QualityBar({
  label,
  value,
  level,
  description,
}: {
  label: string;
  value: number | undefined;
  level: "high" | "medium" | "low" | "unknown";
  description: string;
}) {
  const color = qualityColor(level);
  const percentage = value !== undefined
    ? label === "SIL" ? Math.min(value / 3, 1) * 100
    : Math.min(value / 11, 1) * 100
    : 0;

  return (
    <div className="flex flex-col gap-1.5" title={description}>
      <div className="flex items-center justify-between">
        <span className="data-label">{label}</span>
        <span className="data-value text-xs" style={{ color }}>
          {value !== undefined ? value : "---"}
        </span>
      </div>
      <div
        className="h-1.5 rounded-full overflow-hidden"
        style={{ background: "var(--surface-3)" }}
      >
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{
            width: `${percentage}%`,
            background: color,
            boxShadow: level !== "unknown" ? `0 0 6px ${color}` : "none",
          }}
        />
      </div>
    </div>
  );
}
