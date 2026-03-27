/**
 * Approach Procedure Data for Major World Airports
 *
 * Static dataset with realistic approach procedures including ILS, RNAV,
 * VOR, and visual approaches. Data based on publicly available FAA/EUROCONTROL
 * approach plate information.
 */

export interface ApproachProcedure {
  name: string;
  type: "ILS" | "RNAV" | "VOR" | "NDB" | "VISUAL" | "LOC";
  runway: string;
  frequency?: string;
  course: number;
  glideslope?: number;
  minimums: {
    dh: number;
    visibility: number;
    rvr?: number;
  };
  missed: string;
}

export interface AirportApproaches {
  icao: string;
  approaches: ApproachProcedure[];
}

export const AIRPORT_APPROACHES: AirportApproaches[] = [
  // ──────────────────── United States ────────────────────
  {
    icao: "KATL",
    approaches: [
      { name: "ILS RWY 08L", type: "ILS", runway: "08L", frequency: "110.10", course: 90, glideslope: 3.0, minimums: { dh: 200, visibility: 0.5, rvr: 1800 }, missed: "Climb to 3000, turn right heading 180, radar vectors" },
      { name: "ILS RWY 08R", type: "ILS", runway: "08R", frequency: "111.55", course: 90, glideslope: 3.0, minimums: { dh: 200, visibility: 0.5, rvr: 2400 }, missed: "Climb to 3000, turn right heading 180, radar vectors" },
      { name: "ILS RWY 26L", type: "ILS", runway: "26L", frequency: "108.50", course: 270, glideslope: 3.0, minimums: { dh: 200, visibility: 0.5, rvr: 1800 }, missed: "Climb to 3000, turn left heading 360, radar vectors" },
      { name: "RNAV (GPS) RWY 09L", type: "RNAV", runway: "09L", course: 90, glideslope: 3.0, minimums: { dh: 250, visibility: 0.75 }, missed: "Climb to 3000, direct NALTE, hold" },
      { name: "ILS RWY 10", type: "ILS", runway: "10", frequency: "110.90", course: 100, glideslope: 3.0, minimums: { dh: 200, visibility: 0.5, rvr: 2400 }, missed: "Climb to 3000, turn left heading 360, radar vectors" },
    ],
  },
  {
    icao: "KLAX",
    approaches: [
      { name: "ILS RWY 24R", type: "ILS", runway: "24R", frequency: "111.70", course: 249, glideslope: 3.0, minimums: { dh: 200, visibility: 0.5, rvr: 1800 }, missed: "Climb to 2000, turn left heading 070, radar vectors" },
      { name: "ILS RWY 24L", type: "ILS", runway: "24L", frequency: "108.50", course: 249, glideslope: 3.0, minimums: { dh: 200, visibility: 0.5, rvr: 1800 }, missed: "Climb to 2000, turn left heading 070, radar vectors" },
      { name: "ILS RWY 25L", type: "ILS", runway: "25L", frequency: "111.10", course: 250, glideslope: 3.0, minimums: { dh: 200, visibility: 0.5, rvr: 1800 }, missed: "Climb to 2000, turn right heading 250, radar vectors" },
      { name: "ILS RWY 25R", type: "ILS", runway: "25R", frequency: "110.90", course: 250, glideslope: 3.0, minimums: { dh: 200, visibility: 0.5, rvr: 2400 }, missed: "Climb to 2000, turn right heading 250, radar vectors" },
      { name: "RNAV (GPS) RWY 06L", type: "RNAV", runway: "06L", course: 69, glideslope: 3.0, minimums: { dh: 250, visibility: 0.75 }, missed: "Climb to 2000, direct SLI, hold" },
      { name: "VISUAL RWY 24R", type: "VISUAL", runway: "24R", course: 249, minimums: { dh: 0, visibility: 3.0 }, missed: "Per ATC instructions" },
    ],
  },
  {
    icao: "KJFK",
    approaches: [
      { name: "ILS RWY 04L", type: "ILS", runway: "04L", frequency: "110.90", course: 42, glideslope: 3.0, minimums: { dh: 200, visibility: 0.5, rvr: 1200 }, missed: "Climb to 2000, turn right heading 090, radar vectors" },
      { name: "ILS RWY 04R", type: "ILS", runway: "04R", frequency: "109.50", course: 42, glideslope: 3.0, minimums: { dh: 200, visibility: 0.5, rvr: 1800 }, missed: "Climb to 2000, turn right heading 090, radar vectors" },
      { name: "ILS RWY 22L", type: "ILS", runway: "22L", frequency: "111.50", course: 222, glideslope: 3.0, minimums: { dh: 200, visibility: 0.5, rvr: 1800 }, missed: "Climb to 2000, turn left heading 160, radar vectors" },
      { name: "ILS RWY 31L", type: "ILS", runway: "31L", frequency: "108.90", course: 314, glideslope: 3.0, minimums: { dh: 200, visibility: 0.5, rvr: 2400 }, missed: "Climb to 2000, turn right heading 050, radar vectors" },
      { name: "RNAV (GPS) RWY 13L", type: "RNAV", runway: "13L", course: 134, glideslope: 3.0, minimums: { dh: 250, visibility: 0.75 }, missed: "Climb to 2000, direct CAMRN, hold" },
      { name: "LOC RWY 22L", type: "LOC", runway: "22L", frequency: "111.50", course: 222, minimums: { dh: 540, visibility: 1.25 }, missed: "Climb to 2000, turn left heading 160, radar vectors" },
    ],
  },
  {
    icao: "KORD",
    approaches: [
      { name: "ILS RWY 10C", type: "ILS", runway: "10C", frequency: "110.30", course: 99, glideslope: 3.0, minimums: { dh: 200, visibility: 0.5, rvr: 1800 }, missed: "Climb to 3000, turn right heading 180, radar vectors" },
      { name: "ILS RWY 10L", type: "ILS", runway: "10L", frequency: "111.10", course: 99, glideslope: 3.0, minimums: { dh: 200, visibility: 0.5, rvr: 1800 }, missed: "Climb to 3000, turn right heading 180, radar vectors" },
      { name: "ILS RWY 28C", type: "ILS", runway: "28C", frequency: "108.75", course: 279, glideslope: 3.0, minimums: { dh: 200, visibility: 0.5, rvr: 2400 }, missed: "Climb to 3000, turn left heading 360, radar vectors" },
      { name: "RNAV (GPS) RWY 09R", type: "RNAV", runway: "09R", course: 99, glideslope: 3.0, minimums: { dh: 250, visibility: 0.75 }, missed: "Climb to 3000, direct PLANO, hold" },
      { name: "VISUAL RWY 10C", type: "VISUAL", runway: "10C", course: 99, minimums: { dh: 0, visibility: 3.0 }, missed: "Per ATC instructions" },
    ],
  },
  {
    icao: "KDFW",
    approaches: [
      { name: "ILS RWY 17C", type: "ILS", runway: "17C", frequency: "110.10", course: 179, glideslope: 3.0, minimums: { dh: 200, visibility: 0.5, rvr: 1800 }, missed: "Climb to 3000, turn right heading 270, radar vectors" },
      { name: "ILS RWY 17R", type: "ILS", runway: "17R", frequency: "109.10", course: 179, glideslope: 3.0, minimums: { dh: 200, visibility: 0.5, rvr: 1800 }, missed: "Climb to 3000, turn right heading 270, radar vectors" },
      { name: "ILS RWY 35L", type: "ILS", runway: "35L", frequency: "110.30", course: 359, glideslope: 3.0, minimums: { dh: 200, visibility: 0.5, rvr: 2400 }, missed: "Climb to 3000, turn left heading 270, radar vectors" },
      { name: "RNAV (GPS) RWY 18L", type: "RNAV", runway: "18L", course: 179, glideslope: 3.0, minimums: { dh: 250, visibility: 0.75 }, missed: "Climb to 3000, direct FINGR, hold" },
      { name: "ILS RWY 18R", type: "ILS", runway: "18R", frequency: "110.50", course: 179, glideslope: 3.0, minimums: { dh: 200, visibility: 0.5, rvr: 1800 }, missed: "Climb to 3000, turn right heading 270, radar vectors" },
    ],
  },
  {
    icao: "KDEN",
    approaches: [
      { name: "ILS RWY 16R", type: "ILS", runway: "16R", frequency: "109.30", course: 165, glideslope: 3.0, minimums: { dh: 200, visibility: 0.5, rvr: 1800 }, missed: "Climb to 8000, turn left heading 070, radar vectors" },
      { name: "ILS RWY 34L", type: "ILS", runway: "34L", frequency: "111.30", course: 345, glideslope: 3.0, minimums: { dh: 200, visibility: 0.5, rvr: 1800 }, missed: "Climb to 8000, turn right heading 250, radar vectors" },
      { name: "ILS RWY 17L", type: "ILS", runway: "17L", frequency: "110.70", course: 175, glideslope: 3.0, minimums: { dh: 200, visibility: 0.5, rvr: 2400 }, missed: "Climb to 8000, turn left heading 080, radar vectors" },
      { name: "RNAV (GPS) RWY 08", type: "RNAV", runway: "08", course: 79, glideslope: 3.0, minimums: { dh: 300, visibility: 1.0 }, missed: "Climb to 8000, direct TOMSN, hold" },
    ],
  },
  {
    icao: "KSFO",
    approaches: [
      { name: "ILS RWY 28L", type: "ILS", runway: "28L", frequency: "111.70", course: 280, glideslope: 3.0, minimums: { dh: 200, visibility: 0.5, rvr: 1800 }, missed: "Climb to 3000, turn right heading 360, radar vectors" },
      { name: "ILS RWY 28R", type: "ILS", runway: "28R", frequency: "109.55", course: 280, glideslope: 3.0, minimums: { dh: 200, visibility: 0.5, rvr: 1800 }, missed: "Climb to 3000, turn right heading 360, radar vectors" },
      { name: "RNAV (GPS) RWY 28L", type: "RNAV", runway: "28L", course: 280, glideslope: 3.0, minimums: { dh: 250, visibility: 0.75 }, missed: "Climb to 3000, direct PORTE, hold" },
      { name: "VISUAL RWY 28L", type: "VISUAL", runway: "28L", course: 280, minimums: { dh: 0, visibility: 3.0 }, missed: "Per ATC instructions" },
    ],
  },
  {
    icao: "KMIA",
    approaches: [
      { name: "ILS RWY 12", type: "ILS", runway: "12", frequency: "109.50", course: 118, glideslope: 3.0, minimums: { dh: 200, visibility: 0.5, rvr: 1800 }, missed: "Climb to 2000, turn left heading 030, radar vectors" },
      { name: "ILS RWY 08R", type: "ILS", runway: "08R", frequency: "111.30", course: 88, glideslope: 3.0, minimums: { dh: 200, visibility: 0.5, rvr: 1800 }, missed: "Climb to 2000, turn right heading 180, radar vectors" },
      { name: "ILS RWY 26L", type: "ILS", runway: "26L", frequency: "110.70", course: 268, glideslope: 3.0, minimums: { dh: 200, visibility: 0.5, rvr: 2400 }, missed: "Climb to 2000, turn left heading 360, radar vectors" },
      { name: "RNAV (GPS) RWY 09", type: "RNAV", runway: "09", course: 88, glideslope: 3.0, minimums: { dh: 250, visibility: 0.75 }, missed: "Climb to 2000, direct HILEY, hold" },
    ],
  },
  {
    icao: "KEWR",
    approaches: [
      { name: "ILS RWY 04L", type: "ILS", runway: "04L", frequency: "110.75", course: 41, glideslope: 3.0, minimums: { dh: 200, visibility: 0.5, rvr: 1200 }, missed: "Climb to 2000, turn right heading 090, radar vectors" },
      { name: "ILS RWY 04R", type: "ILS", runway: "04R", frequency: "108.95", course: 41, glideslope: 3.0, minimums: { dh: 200, visibility: 0.5, rvr: 1800 }, missed: "Climb to 2000, turn right heading 090, radar vectors" },
      { name: "ILS RWY 22L", type: "ILS", runway: "22L", frequency: "110.35", course: 221, glideslope: 3.0, minimums: { dh: 200, visibility: 0.5, rvr: 1800 }, missed: "Climb to 2000, turn left heading 130, radar vectors" },
      { name: "RNAV (GPS) RWY 11", type: "RNAV", runway: "11", course: 113, glideslope: 3.0, minimums: { dh: 300, visibility: 1.0 }, missed: "Climb to 2000, direct RUUTH, hold" },
    ],
  },
  {
    icao: "KBOS",
    approaches: [
      { name: "ILS RWY 04R", type: "ILS", runway: "04R", frequency: "110.30", course: 39, glideslope: 3.0, minimums: { dh: 200, visibility: 0.5, rvr: 1800 }, missed: "Climb to 3000, turn right heading 090, radar vectors" },
      { name: "ILS RWY 22L", type: "ILS", runway: "22L", frequency: "110.30", course: 219, glideslope: 3.0, minimums: { dh: 200, visibility: 0.5, rvr: 1800 }, missed: "Climb to 3000, turn left heading 130, radar vectors" },
      { name: "RNAV (GPS) RWY 33L", type: "RNAV", runway: "33L", course: 326, glideslope: 3.0, minimums: { dh: 250, visibility: 0.75 }, missed: "Climb to 3000, direct JOBEE, hold" },
      { name: "VOR RWY 04R", type: "VOR", runway: "04R", frequency: "112.70", course: 39, minimums: { dh: 460, visibility: 1.0 }, missed: "Climb to 3000, turn right heading 090, radar vectors" },
    ],
  },

  // ──────────────────── Europe ────────────────────
  {
    icao: "EGLL",
    approaches: [
      { name: "ILS RWY 27L", type: "ILS", runway: "27L", frequency: "109.50", course: 273, glideslope: 3.0, minimums: { dh: 200, visibility: 0.55, rvr: 550 }, missed: "Climb to 3000, turn right heading 360, radar vectors" },
      { name: "ILS RWY 27R", type: "ILS", runway: "27R", frequency: "110.30", course: 273, glideslope: 3.0, minimums: { dh: 200, visibility: 0.55, rvr: 550 }, missed: "Climb to 3000, turn right heading 360, radar vectors" },
      { name: "ILS RWY 09L", type: "ILS", runway: "09L", frequency: "110.90", course: 93, glideslope: 3.0, minimums: { dh: 200, visibility: 0.55, rvr: 550 }, missed: "Climb to 3000, turn left heading 360, radar vectors" },
      { name: "ILS RWY 09R", type: "ILS", runway: "09R", frequency: "110.30", course: 93, glideslope: 3.0, minimums: { dh: 200, visibility: 0.55, rvr: 550 }, missed: "Climb to 3000, turn left heading 360, radar vectors" },
      { name: "RNAV (GPS) RWY 27L", type: "RNAV", runway: "27L", course: 273, glideslope: 3.0, minimums: { dh: 250, visibility: 0.8 }, missed: "Climb to 3000, direct BNN, hold" },
    ],
  },
  {
    icao: "LFPG",
    approaches: [
      { name: "ILS RWY 26L", type: "ILS", runway: "26L", frequency: "108.30", course: 264, glideslope: 3.0, minimums: { dh: 200, visibility: 0.55, rvr: 550 }, missed: "Climb to 3000, turn right heading 360, radar vectors" },
      { name: "ILS RWY 26R", type: "ILS", runway: "26R", frequency: "110.30", course: 264, glideslope: 3.0, minimums: { dh: 200, visibility: 0.55, rvr: 550 }, missed: "Climb to 3000, turn right heading 360, radar vectors" },
      { name: "ILS RWY 08L", type: "ILS", runway: "08L", frequency: "111.15", course: 84, glideslope: 3.0, minimums: { dh: 200, visibility: 0.55, rvr: 550 }, missed: "Climb to 3000, turn left heading 360, radar vectors" },
      { name: "ILS RWY 09R", type: "ILS", runway: "09R", frequency: "109.75", course: 86, glideslope: 3.0, minimums: { dh: 200, visibility: 0.55, rvr: 550 }, missed: "Climb to 3000, turn left heading 360, radar vectors" },
      { name: "RNAV (GPS) RWY 27L", type: "RNAV", runway: "27L", course: 264, glideslope: 3.0, minimums: { dh: 250, visibility: 0.8 }, missed: "Climb to 3000, direct CLM, hold" },
    ],
  },
  {
    icao: "EHAM",
    approaches: [
      { name: "ILS RWY 18R (Polderbaan)", type: "ILS", runway: "18R", frequency: "110.30", course: 183, glideslope: 3.0, minimums: { dh: 200, visibility: 0.55, rvr: 550 }, missed: "Climb to 2000, turn left heading 090, radar vectors" },
      { name: "ILS RWY 06 (Kaagbaan)", type: "ILS", runway: "06", frequency: "110.10", course: 58, glideslope: 3.0, minimums: { dh: 200, visibility: 0.55, rvr: 550 }, missed: "Climb to 2000, turn right heading 180, radar vectors" },
      { name: "ILS RWY 36R (Aalsmeerbaan)", type: "ILS", runway: "36R", frequency: "109.50", course: 358, glideslope: 3.0, minimums: { dh: 200, visibility: 0.55, rvr: 550 }, missed: "Climb to 2000, turn right heading 090, radar vectors" },
      { name: "RNAV (GPS) RWY 18C", type: "RNAV", runway: "18C", course: 183, glideslope: 3.0, minimums: { dh: 250, visibility: 0.8 }, missed: "Climb to 2000, direct SPL, hold" },
    ],
  },
  {
    icao: "EDDF",
    approaches: [
      { name: "ILS RWY 25L", type: "ILS", runway: "25L", frequency: "110.30", course: 249, glideslope: 3.0, minimums: { dh: 200, visibility: 0.55, rvr: 550 }, missed: "Climb to 5000, turn right heading 360, radar vectors" },
      { name: "ILS RWY 25C", type: "ILS", runway: "25C", frequency: "111.15", course: 249, glideslope: 3.0, minimums: { dh: 200, visibility: 0.55, rvr: 550 }, missed: "Climb to 5000, turn right heading 360, radar vectors" },
      { name: "ILS RWY 25R", type: "ILS", runway: "25R", frequency: "110.95", course: 249, glideslope: 3.0, minimums: { dh: 200, visibility: 0.55, rvr: 550 }, missed: "Climb to 5000, turn right heading 360, radar vectors" },
      { name: "ILS RWY 07L", type: "ILS", runway: "07L", frequency: "109.75", course: 69, glideslope: 3.0, minimums: { dh: 200, visibility: 0.55, rvr: 550 }, missed: "Climb to 5000, turn left heading 180, radar vectors" },
      { name: "RNAV (GPS) RWY 25C", type: "RNAV", runway: "25C", course: 249, glideslope: 3.0, minimums: { dh: 250, visibility: 0.8 }, missed: "Climb to 5000, direct SPESA, hold" },
    ],
  },
  {
    icao: "LEMD",
    approaches: [
      { name: "ILS RWY 32L", type: "ILS", runway: "32L", frequency: "111.55", course: 322, glideslope: 3.0, minimums: { dh: 200, visibility: 0.55, rvr: 550 }, missed: "Climb to 5000, turn left heading 230, radar vectors" },
      { name: "ILS RWY 32R", type: "ILS", runway: "32R", frequency: "109.50", course: 322, glideslope: 3.0, minimums: { dh: 200, visibility: 0.55, rvr: 550 }, missed: "Climb to 5000, turn left heading 230, radar vectors" },
      { name: "ILS RWY 14L", type: "ILS", runway: "14L", frequency: "109.30", course: 142, glideslope: 3.0, minimums: { dh: 200, visibility: 0.55, rvr: 550 }, missed: "Climb to 5000, turn right heading 050, radar vectors" },
      { name: "RNAV (GPS) RWY 32L", type: "RNAV", runway: "32L", course: 322, glideslope: 3.0, minimums: { dh: 250, visibility: 0.8 }, missed: "Climb to 5000, direct SIE, hold" },
    ],
  },
  {
    icao: "LTFM",
    approaches: [
      { name: "ILS RWY 16L", type: "ILS", runway: "16L", frequency: "111.10", course: 162, glideslope: 3.0, minimums: { dh: 200, visibility: 0.55, rvr: 550 }, missed: "Climb to 3000, turn left heading 070, radar vectors" },
      { name: "ILS RWY 16R", type: "ILS", runway: "16R", frequency: "110.10", course: 162, glideslope: 3.0, minimums: { dh: 200, visibility: 0.55, rvr: 550 }, missed: "Climb to 3000, turn left heading 070, radar vectors" },
      { name: "ILS RWY 34L", type: "ILS", runway: "34L", frequency: "109.50", course: 342, glideslope: 3.0, minimums: { dh: 200, visibility: 0.55, rvr: 550 }, missed: "Climb to 3000, turn right heading 250, radar vectors" },
      { name: "RNAV (GPS) RWY 35R", type: "RNAV", runway: "35R", course: 342, glideslope: 3.0, minimums: { dh: 250, visibility: 0.8 }, missed: "Climb to 3000, direct IST, hold" },
    ],
  },

  // ──────────────────── Middle East ────────────────────
  {
    icao: "OMDB",
    approaches: [
      { name: "ILS RWY 30L", type: "ILS", runway: "30L", frequency: "110.10", course: 300, glideslope: 3.0, minimums: { dh: 200, visibility: 0.55, rvr: 550 }, missed: "Climb to 3000, turn right heading 030, radar vectors" },
      { name: "ILS RWY 30R", type: "ILS", runway: "30R", frequency: "109.50", course: 300, glideslope: 3.0, minimums: { dh: 200, visibility: 0.55, rvr: 550 }, missed: "Climb to 3000, turn right heading 030, radar vectors" },
      { name: "ILS RWY 12L", type: "ILS", runway: "12L", frequency: "108.90", course: 120, glideslope: 3.0, minimums: { dh: 200, visibility: 0.55, rvr: 550 }, missed: "Climb to 3000, turn left heading 210, radar vectors" },
      { name: "ILS RWY 12R", type: "ILS", runway: "12R", frequency: "110.90", course: 120, glideslope: 3.0, minimums: { dh: 200, visibility: 0.55, rvr: 550 }, missed: "Climb to 3000, turn left heading 210, radar vectors" },
      { name: "RNAV (GPS) RWY 30L", type: "RNAV", runway: "30L", course: 300, glideslope: 3.0, minimums: { dh: 250, visibility: 0.8 }, missed: "Climb to 3000, direct LOVAK, hold" },
    ],
  },
  {
    icao: "OTHH",
    approaches: [
      { name: "ILS RWY 34L", type: "ILS", runway: "34L", frequency: "110.50", course: 340, glideslope: 3.0, minimums: { dh: 200, visibility: 0.55, rvr: 550 }, missed: "Climb to 3000, turn right heading 070, radar vectors" },
      { name: "ILS RWY 34R", type: "ILS", runway: "34R", frequency: "109.30", course: 340, glideslope: 3.0, minimums: { dh: 200, visibility: 0.55, rvr: 550 }, missed: "Climb to 3000, turn right heading 070, radar vectors" },
      { name: "ILS RWY 16L", type: "ILS", runway: "16L", frequency: "110.10", course: 160, glideslope: 3.0, minimums: { dh: 200, visibility: 0.55, rvr: 550 }, missed: "Climb to 3000, turn left heading 250, radar vectors" },
      { name: "RNAV (GPS) RWY 34L", type: "RNAV", runway: "34L", course: 340, glideslope: 3.0, minimums: { dh: 250, visibility: 0.8 }, missed: "Climb to 3000, direct VUTEB, hold" },
    ],
  },

  // ──────────────────── Asia-Pacific ────────────────────
  {
    icao: "VHHH",
    approaches: [
      { name: "ILS RWY 07L", type: "ILS", runway: "07L", frequency: "110.90", course: 73, glideslope: 3.0, minimums: { dh: 200, visibility: 0.55, rvr: 550 }, missed: "Climb to 3000, turn right heading 180, radar vectors" },
      { name: "ILS RWY 07R", type: "ILS", runway: "07R", frequency: "111.10", course: 73, glideslope: 3.0, minimums: { dh: 200, visibility: 0.55, rvr: 550 }, missed: "Climb to 3000, turn right heading 180, radar vectors" },
      { name: "ILS RWY 25L", type: "ILS", runway: "25L", frequency: "109.30", course: 253, glideslope: 3.0, minimums: { dh: 200, visibility: 0.55, rvr: 550 }, missed: "Climb to 3000, turn left heading 360, radar vectors" },
      { name: "RNAV (GPS) RWY 25R", type: "RNAV", runway: "25R", course: 253, glideslope: 3.0, minimums: { dh: 250, visibility: 0.8 }, missed: "Climb to 3000, direct TD, hold" },
    ],
  },
  {
    icao: "RJTT",
    approaches: [
      { name: "ILS RWY 34L", type: "ILS", runway: "34L", frequency: "111.70", course: 340, glideslope: 3.0, minimums: { dh: 200, visibility: 0.55, rvr: 550 }, missed: "Climb to 3000, turn right heading 070, radar vectors" },
      { name: "ILS RWY 34R", type: "ILS", runway: "34R", frequency: "110.10", course: 340, glideslope: 3.0, minimums: { dh: 200, visibility: 0.55, rvr: 550 }, missed: "Climb to 3000, turn right heading 070, radar vectors" },
      { name: "ILS RWY 16L", type: "ILS", runway: "16L", frequency: "109.90", course: 160, glideslope: 3.0, minimums: { dh: 200, visibility: 0.55, rvr: 550 }, missed: "Climb to 3000, turn left heading 250, radar vectors" },
      { name: "ILS RWY 22", type: "ILS", runway: "22", frequency: "111.10", course: 222, glideslope: 3.45, minimums: { dh: 300, visibility: 1.0 }, missed: "Climb to 3000, turn left heading 130, radar vectors" },
      { name: "RNAV (GPS) RWY 16R", type: "RNAV", runway: "16R", course: 160, glideslope: 3.0, minimums: { dh: 250, visibility: 0.8 }, missed: "Climb to 3000, direct CREAM, hold" },
    ],
  },
  {
    icao: "RKSI",
    approaches: [
      { name: "ILS RWY 15L", type: "ILS", runway: "15L", frequency: "110.90", course: 155, glideslope: 3.0, minimums: { dh: 200, visibility: 0.55, rvr: 550 }, missed: "Climb to 3000, turn left heading 060, radar vectors" },
      { name: "ILS RWY 15R", type: "ILS", runway: "15R", frequency: "111.50", course: 155, glideslope: 3.0, minimums: { dh: 200, visibility: 0.55, rvr: 550 }, missed: "Climb to 3000, turn left heading 060, radar vectors" },
      { name: "ILS RWY 33L", type: "ILS", runway: "33L", frequency: "109.30", course: 335, glideslope: 3.0, minimums: { dh: 200, visibility: 0.55, rvr: 550 }, missed: "Climb to 3000, turn right heading 240, radar vectors" },
      { name: "RNAV (GPS) RWY 33R", type: "RNAV", runway: "33R", course: 335, glideslope: 3.0, minimums: { dh: 250, visibility: 0.8 }, missed: "Climb to 3000, direct KARBU, hold" },
    ],
  },
  {
    icao: "WSSS",
    approaches: [
      { name: "ILS RWY 20L", type: "ILS", runway: "20L", frequency: "110.30", course: 202, glideslope: 3.0, minimums: { dh: 200, visibility: 0.55, rvr: 550 }, missed: "Climb to 3000, turn right heading 290, radar vectors" },
      { name: "ILS RWY 20C", type: "ILS", runway: "20C", frequency: "109.50", course: 202, glideslope: 3.0, minimums: { dh: 200, visibility: 0.55, rvr: 550 }, missed: "Climb to 3000, turn right heading 290, radar vectors" },
      { name: "ILS RWY 02L", type: "ILS", runway: "02L", frequency: "111.10", course: 22, glideslope: 3.0, minimums: { dh: 200, visibility: 0.55, rvr: 550 }, missed: "Climb to 3000, turn left heading 110, radar vectors" },
      { name: "RNAV (GPS) RWY 02C", type: "RNAV", runway: "02C", course: 22, glideslope: 3.0, minimums: { dh: 250, visibility: 0.8 }, missed: "Climb to 3000, direct SAMKO, hold" },
    ],
  },
  {
    icao: "VTBS",
    approaches: [
      { name: "ILS RWY 19L", type: "ILS", runway: "19L", frequency: "110.30", course: 190, glideslope: 3.0, minimums: { dh: 200, visibility: 0.55, rvr: 550 }, missed: "Climb to 2000, turn left heading 100, radar vectors" },
      { name: "ILS RWY 19R", type: "ILS", runway: "19R", frequency: "109.50", course: 190, glideslope: 3.0, minimums: { dh: 200, visibility: 0.55, rvr: 550 }, missed: "Climb to 2000, turn left heading 100, radar vectors" },
      { name: "ILS RWY 01L", type: "ILS", runway: "01L", frequency: "111.50", course: 10, glideslope: 3.0, minimums: { dh: 200, visibility: 0.55, rvr: 550 }, missed: "Climb to 2000, turn right heading 280, radar vectors" },
      { name: "RNAV (GPS) RWY 01R", type: "RNAV", runway: "01R", course: 10, glideslope: 3.0, minimums: { dh: 250, visibility: 0.8 }, missed: "Climb to 2000, direct BKK, hold" },
    ],
  },
  {
    icao: "VIDP",
    approaches: [
      { name: "ILS RWY 28", type: "ILS", runway: "28", frequency: "110.30", course: 281, glideslope: 3.0, minimums: { dh: 200, visibility: 0.55, rvr: 800 }, missed: "Climb to 4000, turn right heading 360, radar vectors" },
      { name: "ILS RWY 29", type: "ILS", runway: "29", frequency: "111.30", course: 290, glideslope: 3.0, minimums: { dh: 200, visibility: 0.55, rvr: 800 }, missed: "Climb to 4000, turn right heading 360, radar vectors" },
      { name: "ILS RWY 10", type: "ILS", runway: "10", frequency: "109.30", course: 101, glideslope: 3.0, minimums: { dh: 200, visibility: 0.55, rvr: 800 }, missed: "Climb to 4000, turn left heading 180, radar vectors" },
      { name: "RNAV (GPS) RWY 11", type: "RNAV", runway: "11", course: 110, glideslope: 3.0, minimums: { dh: 250, visibility: 0.8 }, missed: "Climb to 4000, direct DPN, hold" },
    ],
  },
  {
    icao: "ZBAD",
    approaches: [
      { name: "ILS RWY 17L", type: "ILS", runway: "17L", frequency: "110.30", course: 175, glideslope: 3.0, minimums: { dh: 200, visibility: 0.55, rvr: 550 }, missed: "Climb to 3000, turn left heading 080, radar vectors" },
      { name: "ILS RWY 17R", type: "ILS", runway: "17R", frequency: "109.50", course: 175, glideslope: 3.0, minimums: { dh: 200, visibility: 0.55, rvr: 550 }, missed: "Climb to 3000, turn left heading 080, radar vectors" },
      { name: "ILS RWY 35L", type: "ILS", runway: "35L", frequency: "111.10", course: 355, glideslope: 3.0, minimums: { dh: 200, visibility: 0.55, rvr: 550 }, missed: "Climb to 3000, turn right heading 260, radar vectors" },
      { name: "RNAV (GPS) RWY 11L", type: "RNAV", runway: "11L", course: 112, glideslope: 3.0, minimums: { dh: 250, visibility: 0.8 }, missed: "Climb to 3000, direct ELKUR, hold" },
    ],
  },
  {
    icao: "ZSPD",
    approaches: [
      { name: "ILS RWY 16L", type: "ILS", runway: "16L", frequency: "110.10", course: 164, glideslope: 3.0, minimums: { dh: 200, visibility: 0.55, rvr: 550 }, missed: "Climb to 3000, turn left heading 070, radar vectors" },
      { name: "ILS RWY 16R", type: "ILS", runway: "16R", frequency: "109.30", course: 164, glideslope: 3.0, minimums: { dh: 200, visibility: 0.55, rvr: 550 }, missed: "Climb to 3000, turn left heading 070, radar vectors" },
      { name: "ILS RWY 34L", type: "ILS", runway: "34L", frequency: "110.50", course: 344, glideslope: 3.0, minimums: { dh: 200, visibility: 0.55, rvr: 550 }, missed: "Climb to 3000, turn right heading 250, radar vectors" },
      { name: "RNAV (GPS) RWY 34R", type: "RNAV", runway: "34R", course: 344, glideslope: 3.0, minimums: { dh: 250, visibility: 0.8 }, missed: "Climb to 3000, direct PUD, hold" },
    ],
  },

  // ──────────────────── Oceania ────────────────────
  {
    icao: "YSSY",
    approaches: [
      { name: "ILS RWY 16R", type: "ILS", runway: "16R", frequency: "110.90", course: 165, glideslope: 3.0, minimums: { dh: 200, visibility: 0.55, rvr: 550 }, missed: "Climb to 3000, turn left heading 070, radar vectors" },
      { name: "ILS RWY 34L", type: "ILS", runway: "34L", frequency: "111.10", course: 345, glideslope: 3.0, minimums: { dh: 200, visibility: 0.55, rvr: 550 }, missed: "Climb to 3000, turn right heading 250, radar vectors" },
      { name: "ILS RWY 25", type: "ILS", runway: "25", frequency: "109.50", course: 253, glideslope: 3.0, minimums: { dh: 250, visibility: 0.8, rvr: 800 }, missed: "Climb to 3000, turn left heading 160, radar vectors" },
      { name: "RNAV (GPS) RWY 16R", type: "RNAV", runway: "16R", course: 165, glideslope: 3.0, minimums: { dh: 250, visibility: 0.8 }, missed: "Climb to 3000, direct SHORE, hold" },
    ],
  },

  // ──────────────────── Americas (non-US) ────────────────────
  {
    icao: "CYYZ",
    approaches: [
      { name: "ILS RWY 05", type: "ILS", runway: "05", frequency: "111.15", course: 55, glideslope: 3.0, minimums: { dh: 200, visibility: 0.5, rvr: 1200 }, missed: "Climb to 3000, turn right heading 140, radar vectors" },
      { name: "ILS RWY 23", type: "ILS", runway: "23", frequency: "109.90", course: 235, glideslope: 3.0, minimums: { dh: 200, visibility: 0.5, rvr: 1200 }, missed: "Climb to 3000, turn left heading 140, radar vectors" },
      { name: "ILS RWY 06L", type: "ILS", runway: "06L", frequency: "110.90", course: 55, glideslope: 3.0, minimums: { dh: 200, visibility: 0.5, rvr: 1200 }, missed: "Climb to 3000, turn right heading 140, radar vectors" },
      { name: "RNAV (GPS) RWY 33L", type: "RNAV", runway: "33L", course: 333, glideslope: 3.0, minimums: { dh: 250, visibility: 0.75 }, missed: "Climb to 3000, direct YYZ, hold" },
    ],
  },
  {
    icao: "SBGR",
    approaches: [
      { name: "ILS RWY 09L", type: "ILS", runway: "09L", frequency: "109.90", course: 93, glideslope: 3.0, minimums: { dh: 200, visibility: 0.55, rvr: 550 }, missed: "Climb to 4000, turn right heading 180, radar vectors" },
      { name: "ILS RWY 09R", type: "ILS", runway: "09R", frequency: "109.50", course: 93, glideslope: 3.0, minimums: { dh: 200, visibility: 0.55, rvr: 550 }, missed: "Climb to 4000, turn right heading 180, radar vectors" },
      { name: "ILS RWY 27L", type: "ILS", runway: "27L", frequency: "110.50", course: 273, glideslope: 3.0, minimums: { dh: 200, visibility: 0.55, rvr: 550 }, missed: "Climb to 4000, turn left heading 360, radar vectors" },
      { name: "RNAV (GPS) RWY 27R", type: "RNAV", runway: "27R", course: 273, glideslope: 3.0, minimums: { dh: 250, visibility: 0.8 }, missed: "Climb to 4000, direct GRU, hold" },
    ],
  },
];

// ── Lookup helper ───────────────────────────────────────────────────────

const approachMap = new Map<string, AirportApproaches>();
for (const aa of AIRPORT_APPROACHES) {
  approachMap.set(aa.icao, aa);
}

export function getApproachesByIcao(icao: string): AirportApproaches | null {
  return approachMap.get(icao.toUpperCase()) ?? null;
}
