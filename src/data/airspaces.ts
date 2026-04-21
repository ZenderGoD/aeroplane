/**
 * Airspace Boundaries Database
 *
 * Comprehensive collection of FIR, TMA, restricted, prohibited, danger, and MOA
 * airspace boundaries represented as approximate GeoJSON-style polygons.
 * Coordinates are [lat, lon] pairs forming closed polygons.
 */

export interface Airspace {
  id: string;
  name: string;
  type: "FIR" | "UIR" | "TMA" | "CTR" | "RESTRICTED" | "PROHIBITED" | "DANGER" | "MOA";
  country: string;
  lowerAlt?: number; // ft, undefined = surface
  upperAlt?: number; // ft, undefined = unlimited
  coordinates: [number, number][]; // [lat, lon] polygon vertices
  color: string; // display color
  icao?: string;
}

// ---------- Color constants ----------

const FIR_COLOR = "var(--border-accent)";
const UIR_COLOR = "var(--border-accent)";
const TMA_COLOR = "rgba(203,213,225,0.25)";
const CTR_COLOR = "rgba(203,213,225,0.25)";
const RESTRICTED_COLOR = "rgba(226,232,240,0.3)";
const PROHIBITED_COLOR = "rgba(226,232,240,0.5)";
const DANGER_COLOR = "rgba(148,163,184,0.3)";
const MOA_COLOR = "var(--border-accent)";

// ---------- FIR (Flight Information Regions) ----------

const FIR_REGIONS: Airspace[] = [
  // --- India ---
  {
    id: "fir-mumbai",
    name: "Mumbai FIR",
    type: "FIR",
    country: "India",
    icao: "VABF",
    color: FIR_COLOR,
    coordinates: [
      [23.5, 68.0], [23.5, 73.5], [21.0, 76.0], [18.0, 77.0],
      [15.0, 77.5], [12.0, 75.0], [8.0, 73.0], [8.0, 68.0],
      [12.0, 66.0], [17.0, 68.0], [20.0, 68.0], [23.5, 68.0],
    ],
  },
  {
    id: "fir-delhi",
    name: "Delhi FIR",
    type: "FIR",
    country: "India",
    icao: "VIDF",
    color: FIR_COLOR,
    coordinates: [
      [34.0, 73.5], [34.0, 78.0], [30.0, 82.0], [27.0, 84.0],
      [23.5, 82.0], [23.5, 73.5], [26.0, 71.0], [28.5, 68.5],
      [30.5, 70.0], [32.5, 72.0], [34.0, 73.5],
    ],
  },
  {
    id: "fir-chennai",
    name: "Chennai FIR",
    type: "FIR",
    country: "India",
    icao: "VOMF",
    color: FIR_COLOR,
    coordinates: [
      [21.0, 76.0], [18.0, 77.0], [15.0, 77.5], [12.0, 80.0],
      [8.0, 80.0], [6.0, 82.0], [6.0, 88.0], [10.0, 92.0],
      [15.0, 88.0], [18.0, 84.5], [21.0, 82.0], [23.5, 82.0],
      [23.5, 78.0], [21.0, 76.0],
    ],
  },
  {
    id: "fir-kolkata",
    name: "Kolkata FIR",
    type: "FIR",
    country: "India",
    icao: "VECF",
    color: FIR_COLOR,
    coordinates: [
      [27.0, 84.0], [28.5, 88.5], [27.0, 92.0], [25.0, 95.0],
      [22.0, 94.0], [20.0, 92.5], [18.0, 89.0], [18.0, 84.5],
      [21.0, 82.0], [23.5, 82.0], [27.0, 84.0],
    ],
  },
  // --- United States ---
  {
    id: "fir-new-york",
    name: "New York ARTCC",
    type: "FIR",
    country: "United States",
    icao: "KZNY",
    color: FIR_COLOR,
    coordinates: [
      [43.0, -76.0], [43.0, -72.0], [41.5, -70.0], [40.0, -70.5],
      [38.5, -73.0], [38.0, -75.5], [39.5, -76.5], [41.0, -77.0],
      [43.0, -76.0],
    ],
  },
  {
    id: "fir-los-angeles",
    name: "Los Angeles ARTCC",
    type: "FIR",
    country: "United States",
    icao: "KZLA",
    color: FIR_COLOR,
    coordinates: [
      [37.0, -121.0], [37.0, -117.0], [35.5, -115.0], [33.0, -114.5],
      [32.0, -117.0], [32.5, -120.0], [34.5, -121.5], [37.0, -121.0],
    ],
  },
  {
    id: "fir-chicago",
    name: "Chicago ARTCC",
    type: "FIR",
    country: "United States",
    icao: "KZAU",
    color: FIR_COLOR,
    coordinates: [
      [44.0, -90.0], [44.0, -86.0], [42.0, -84.0], [39.5, -84.5],
      [38.5, -87.0], [39.0, -90.5], [41.0, -91.5], [44.0, -90.0],
    ],
  },
  // --- United Kingdom ---
  {
    id: "fir-london",
    name: "London FIR",
    type: "FIR",
    country: "United Kingdom",
    icao: "EGTT",
    color: FIR_COLOR,
    coordinates: [
      [55.0, -5.5], [55.0, 2.0], [52.0, 3.5], [50.0, 2.5],
      [49.0, -1.0], [49.0, -5.0], [50.5, -6.5], [52.5, -6.0],
      [55.0, -5.5],
    ],
  },
  {
    id: "fir-scottish",
    name: "Scottish FIR",
    type: "FIR",
    country: "United Kingdom",
    icao: "EGPX",
    color: FIR_COLOR,
    coordinates: [
      [61.0, -10.0], [61.0, 0.0], [57.0, 2.0], [55.0, 2.0],
      [55.0, -5.5], [56.0, -8.0], [58.0, -10.0], [61.0, -10.0],
    ],
  },
  // --- France ---
  {
    id: "fir-paris",
    name: "Paris FIR",
    type: "FIR",
    country: "France",
    icao: "LFFF",
    color: FIR_COLOR,
    coordinates: [
      [50.0, -1.0], [50.5, 2.5], [49.5, 5.5], [48.0, 7.5],
      [46.5, 6.5], [45.5, 3.5], [46.0, 0.0], [47.5, -2.0],
      [49.0, -1.0], [50.0, -1.0],
    ],
  },
  {
    id: "fir-marseille",
    name: "Marseille FIR",
    type: "FIR",
    country: "France",
    icao: "LFMM",
    color: FIR_COLOR,
    coordinates: [
      [46.5, 6.5], [45.5, 3.5], [46.0, 0.0], [44.0, -1.5],
      [42.5, 0.0], [42.0, 3.0], [41.5, 6.0], [42.0, 9.5],
      [43.5, 9.5], [45.5, 7.5], [46.5, 6.5],
    ],
  },
  // --- Germany ---
  {
    id: "fir-frankfurt",
    name: "Frankfurt FIR (Langen)",
    type: "FIR",
    country: "Germany",
    icao: "EDGG",
    color: FIR_COLOR,
    coordinates: [
      [52.0, 6.0], [52.0, 10.0], [50.0, 12.5], [48.0, 13.5],
      [47.5, 10.0], [47.5, 7.5], [49.0, 5.5], [50.5, 5.5],
      [52.0, 6.0],
    ],
  },
  // --- Middle East ---
  {
    id: "fir-dubai",
    name: "Emirates FIR (Dubai)",
    type: "FIR",
    country: "UAE",
    icao: "OMAE",
    color: FIR_COLOR,
    coordinates: [
      [26.5, 51.0], [26.5, 56.5], [25.0, 57.0], [22.0, 57.5],
      [22.0, 55.0], [24.0, 52.0], [25.5, 51.0], [26.5, 51.0],
    ],
  },
  {
    id: "fir-jeddah",
    name: "Jeddah FIR",
    type: "FIR",
    country: "Saudi Arabia",
    icao: "OEJD",
    color: FIR_COLOR,
    coordinates: [
      [28.0, 34.5], [28.0, 42.0], [24.0, 45.0], [20.0, 44.0],
      [16.0, 42.5], [13.0, 43.0], [12.5, 41.0], [15.0, 38.5],
      [20.0, 36.0], [24.0, 35.0], [28.0, 34.5],
    ],
  },
  // --- Southeast Asia ---
  {
    id: "fir-singapore",
    name: "Singapore FIR",
    type: "FIR",
    country: "Singapore",
    icao: "WSJC",
    color: FIR_COLOR,
    coordinates: [
      [5.0, 100.0], [5.0, 108.0], [2.0, 109.0], [0.0, 108.5],
      [-3.0, 107.0], [-3.0, 103.0], [0.0, 100.5], [2.5, 100.0],
      [5.0, 100.0],
    ],
  },
  {
    id: "fir-bangkok",
    name: "Bangkok FIR",
    type: "FIR",
    country: "Thailand",
    icao: "VTBB",
    color: FIR_COLOR,
    coordinates: [
      [20.5, 97.5], [20.5, 105.5], [15.5, 106.0], [12.0, 105.0],
      [6.0, 102.0], [5.0, 100.0], [7.0, 98.0], [10.0, 97.5],
      [14.0, 97.0], [17.5, 97.5], [20.5, 97.5],
    ],
  },
  {
    id: "fir-manila",
    name: "Manila FIR",
    type: "FIR",
    country: "Philippines",
    icao: "RPHI",
    color: FIR_COLOR,
    coordinates: [
      [21.0, 117.0], [21.0, 128.0], [15.0, 130.0], [10.0, 130.0],
      [5.0, 127.0], [5.0, 120.0], [8.0, 116.0], [13.0, 116.5],
      [18.0, 117.0], [21.0, 117.0],
    ],
  },
  // --- Japan ---
  {
    id: "fir-tokyo",
    name: "Tokyo FIR",
    type: "FIR",
    country: "Japan",
    icao: "RJTG",
    color: FIR_COLOR,
    coordinates: [
      [46.0, 130.0], [46.0, 148.0], [40.0, 155.0], [30.0, 150.0],
      [24.0, 140.0], [24.0, 123.0], [28.0, 125.0], [34.0, 128.0],
      [38.0, 128.5], [42.0, 130.0], [46.0, 130.0],
    ],
  },
  // --- China ---
  {
    id: "fir-beijing",
    name: "Beijing FIR",
    type: "FIR",
    country: "China",
    icao: "ZBPE",
    color: FIR_COLOR,
    coordinates: [
      [43.0, 110.0], [43.0, 123.0], [40.0, 124.5], [37.0, 122.0],
      [35.0, 119.0], [35.0, 113.0], [37.0, 110.0], [40.0, 110.0],
      [43.0, 110.0],
    ],
  },
  {
    id: "fir-shanghai",
    name: "Shanghai FIR",
    type: "FIR",
    country: "China",
    icao: "ZSHA",
    color: FIR_COLOR,
    coordinates: [
      [35.0, 119.0], [35.0, 126.0], [31.0, 128.0], [27.0, 128.0],
      [25.0, 123.0], [25.0, 118.0], [28.0, 116.0], [31.0, 117.0],
      [35.0, 119.0],
    ],
  },
  // --- Australia ---
  {
    id: "fir-melbourne",
    name: "Melbourne FIR",
    type: "FIR",
    country: "Australia",
    icao: "YMMM",
    color: FIR_COLOR,
    coordinates: [
      [-28.0, 130.0], [-28.0, 150.0], [-33.0, 153.0], [-38.0, 150.0],
      [-42.0, 148.0], [-45.0, 140.0], [-38.0, 130.0], [-33.0, 128.0],
      [-28.0, 130.0],
    ],
  },
  {
    id: "fir-brisbane",
    name: "Brisbane FIR",
    type: "FIR",
    country: "Australia",
    icao: "YBBB",
    color: FIR_COLOR,
    coordinates: [
      [-10.0, 142.0], [-10.0, 160.0], [-20.0, 163.0], [-28.0, 155.0],
      [-28.0, 150.0], [-20.0, 145.0], [-15.0, 142.0], [-10.0, 142.0],
    ],
  },
  // --- Africa ---
  {
    id: "fir-johannesburg",
    name: "Johannesburg FIR",
    type: "FIR",
    country: "South Africa",
    icao: "FAJA",
    color: FIR_COLOR,
    coordinates: [
      [-22.0, 17.0], [-22.0, 33.0], [-27.0, 33.0], [-31.0, 31.0],
      [-35.0, 28.0], [-35.0, 17.0], [-30.0, 16.5], [-26.0, 17.0],
      [-22.0, 17.0],
    ],
  },
  // --- South America ---
  {
    id: "fir-sao-paulo",
    name: "Sao Paulo (Curitiba) FIR",
    type: "FIR",
    country: "Brazil",
    icao: "SBCW",
    color: FIR_COLOR,
    coordinates: [
      [-20.0, -53.0], [-20.0, -40.0], [-24.0, -40.0], [-28.0, -42.0],
      [-30.0, -48.0], [-30.0, -55.0], [-25.0, -55.0], [-22.0, -53.5],
      [-20.0, -53.0],
    ],
  },
  // --- Additional FIRs for 30+ count ---
  {
    id: "fir-cairo",
    name: "Cairo FIR",
    type: "FIR",
    country: "Egypt",
    icao: "HECC",
    color: FIR_COLOR,
    coordinates: [
      [31.5, 25.0], [31.5, 35.0], [29.0, 35.0], [22.0, 36.5],
      [22.0, 25.0], [25.0, 25.0], [31.5, 25.0],
    ],
  },
  {
    id: "fir-toronto",
    name: "Toronto ACC",
    type: "FIR",
    country: "Canada",
    icao: "CZYZ",
    color: FIR_COLOR,
    coordinates: [
      [46.0, -82.0], [46.0, -74.0], [44.0, -73.0], [42.5, -78.0],
      [42.0, -82.0], [43.5, -83.0], [46.0, -82.0],
    ],
  },
  {
    id: "fir-madrid",
    name: "Madrid FIR",
    type: "FIR",
    country: "Spain",
    icao: "LECM",
    color: FIR_COLOR,
    coordinates: [
      [43.5, -9.5], [43.5, -1.5], [41.0, 0.0], [38.0, 0.0],
      [36.0, -2.0], [36.0, -7.5], [38.5, -9.5], [41.0, -9.5],
      [43.5, -9.5],
    ],
  },
  {
    id: "fir-rome",
    name: "Rome FIR",
    type: "FIR",
    country: "Italy",
    icao: "LIRR",
    color: FIR_COLOR,
    coordinates: [
      [44.5, 9.0], [44.5, 14.0], [42.0, 16.0], [38.0, 17.0],
      [36.5, 15.0], [37.5, 11.0], [39.5, 9.0], [41.5, 8.0],
      [44.5, 9.0],
    ],
  },
  {
    id: "fir-hanoi",
    name: "Hanoi FIR",
    type: "FIR",
    country: "Vietnam",
    icao: "VVHN",
    color: FIR_COLOR,
    coordinates: [
      [23.0, 102.0], [23.0, 108.5], [20.5, 108.0], [17.0, 108.5],
      [16.0, 111.0], [14.0, 112.0], [11.0, 110.0], [11.0, 106.0],
      [14.0, 104.5], [17.0, 103.0], [20.0, 102.0], [23.0, 102.0],
    ],
  },
  {
    id: "fir-kuala-lumpur",
    name: "Kuala Lumpur FIR",
    type: "FIR",
    country: "Malaysia",
    icao: "WMFC",
    color: FIR_COLOR,
    coordinates: [
      [7.0, 98.0], [7.0, 105.0], [5.0, 105.0], [2.0, 104.0],
      [1.0, 103.0], [1.0, 100.0], [3.0, 99.0], [5.0, 98.0],
      [7.0, 98.0],
    ],
  },
];

// ---------- RESTRICTED / PROHIBITED Areas ----------

const RESTRICTED_AREAS: Airspace[] = [
  // --- United States ---
  {
    id: "p-56-washington",
    name: "P-56 Washington DC",
    type: "PROHIBITED",
    country: "United States",
    lowerAlt: 0,
    upperAlt: 18000,
    color: PROHIBITED_COLOR,
    coordinates: [
      [38.9, -77.04], [38.92, -77.01], [38.91, -76.98],
      [38.88, -76.97], [38.86, -76.99], [38.87, -77.03],
      [38.9, -77.04],
    ],
  },
  {
    id: "r-4009-camp-david",
    name: "R-4009 Camp David",
    type: "RESTRICTED",
    country: "United States",
    lowerAlt: 0,
    upperAlt: 5000,
    color: RESTRICTED_COLOR,
    coordinates: [
      [39.68, -77.50], [39.70, -77.44], [39.66, -77.42],
      [39.64, -77.46], [39.66, -77.50], [39.68, -77.50],
    ],
  },
  {
    id: "r-2206-eglin-afb",
    name: "R-2206 Eglin AFB",
    type: "RESTRICTED",
    country: "United States",
    lowerAlt: 0,
    upperAlt: 50000,
    color: RESTRICTED_COLOR,
    coordinates: [
      [30.8, -86.8], [30.8, -86.2], [30.4, -86.0],
      [30.2, -86.3], [30.2, -86.8], [30.5, -87.0],
      [30.8, -86.8],
    ],
  },
  {
    id: "r-2508-edwards-afb",
    name: "R-2508 Edwards AFB Complex",
    type: "RESTRICTED",
    country: "United States",
    lowerAlt: 0,
    upperAlt: 60000,
    color: RESTRICTED_COLOR,
    coordinates: [
      [36.0, -118.5], [36.0, -117.0], [35.0, -117.0],
      [34.5, -117.5], [34.5, -118.5], [35.5, -118.5],
      [36.0, -118.5],
    ],
  },
  {
    id: "r-4808-area51",
    name: "R-4808N (Groom Lake / Area 51)",
    type: "RESTRICTED",
    country: "United States",
    lowerAlt: 0,
    upperAlt: 60000,
    color: RESTRICTED_COLOR,
    coordinates: [
      [37.35, -116.0], [37.35, -115.6], [37.05, -115.6],
      [37.05, -116.0], [37.35, -116.0],
    ],
  },
  {
    id: "p-40-kennedy-space",
    name: "P-40 Kennedy Space Center",
    type: "PROHIBITED",
    country: "United States",
    lowerAlt: 0,
    upperAlt: 60000,
    color: PROHIBITED_COLOR,
    coordinates: [
      [28.65, -80.70], [28.65, -80.55], [28.50, -80.55],
      [28.50, -80.70], [28.65, -80.70],
    ],
  },
  {
    id: "r-2501-nellis",
    name: "R-2501 Nellis Range",
    type: "RESTRICTED",
    country: "United States",
    lowerAlt: 0,
    upperAlt: 60000,
    color: RESTRICTED_COLOR,
    coordinates: [
      [37.8, -116.8], [37.8, -115.5], [36.8, -115.0],
      [36.2, -115.5], [36.2, -116.5], [37.0, -116.8],
      [37.8, -116.8],
    ],
  },
  // --- India ---
  {
    id: "r-152-delhi",
    name: "R-152 Delhi (Rashtrapati Bhavan)",
    type: "RESTRICTED",
    country: "India",
    lowerAlt: 0,
    upperAlt: 3000,
    color: RESTRICTED_COLOR,
    coordinates: [
      [28.63, 77.17], [28.63, 77.22], [28.60, 77.22],
      [28.60, 77.17], [28.63, 77.17],
    ],
  },
  {
    id: "r-153-mumbai-nuclear",
    name: "R-153 Bhabha Atomic Research Centre",
    type: "RESTRICTED",
    country: "India",
    lowerAlt: 0,
    upperAlt: 5000,
    color: RESTRICTED_COLOR,
    coordinates: [
      [19.02, 72.90], [19.02, 72.94], [18.98, 72.94],
      [18.98, 72.90], [19.02, 72.90],
    ],
  },
  {
    id: "r-154-pokhran",
    name: "R-154 Pokhran Range",
    type: "RESTRICTED",
    country: "India",
    lowerAlt: 0,
    upperAlt: 50000,
    color: RESTRICTED_COLOR,
    coordinates: [
      [27.1, 71.2], [27.1, 71.8], [26.7, 71.8],
      [26.7, 71.2], [27.1, 71.2],
    ],
  },
  {
    id: "r-155-sriharikota",
    name: "R-155 Sriharikota Launch Site",
    type: "RESTRICTED",
    country: "India",
    lowerAlt: 0,
    upperAlt: 60000,
    color: RESTRICTED_COLOR,
    coordinates: [
      [13.82, 80.15], [13.82, 80.30], [13.68, 80.30],
      [13.68, 80.15], [13.82, 80.15],
    ],
  },
  {
    id: "r-156-jaisalmer",
    name: "R-156 Jaisalmer Military Range",
    type: "RESTRICTED",
    country: "India",
    lowerAlt: 0,
    upperAlt: 45000,
    color: RESTRICTED_COLOR,
    coordinates: [
      [27.5, 70.5], [27.5, 71.5], [26.8, 71.5],
      [26.8, 70.5], [27.5, 70.5],
    ],
  },
  // --- Europe ---
  {
    id: "r-ehd41-volkel",
    name: "EHD-41 Volkel AFB (Netherlands)",
    type: "RESTRICTED",
    country: "Netherlands",
    lowerAlt: 0,
    upperAlt: 5000,
    color: RESTRICTED_COLOR,
    coordinates: [
      [51.66, 5.62], [51.66, 5.72], [51.63, 5.72],
      [51.63, 5.62], [51.66, 5.62],
    ],
  },
  {
    id: "p-buckingham",
    name: "P-Buckingham Palace Zone",
    type: "PROHIBITED",
    country: "United Kingdom",
    lowerAlt: 0,
    upperAlt: 2500,
    color: PROHIBITED_COLOR,
    coordinates: [
      [51.505, -0.155], [51.505, -0.130], [51.498, -0.130],
      [51.498, -0.155], [51.505, -0.155],
    ],
  },
  // --- Middle East ---
  {
    id: "r-mecca-prohibited",
    name: "Mecca Prohibited Zone",
    type: "PROHIBITED",
    country: "Saudi Arabia",
    lowerAlt: 0,
    upperAlt: 10000,
    color: PROHIBITED_COLOR,
    coordinates: [
      [21.50, 39.75], [21.50, 39.95], [21.35, 39.95],
      [21.35, 39.75], [21.50, 39.75],
    ],
  },
  {
    id: "r-dimona-nuclear",
    name: "R-Dimona Nuclear Facility",
    type: "RESTRICTED",
    country: "Israel",
    lowerAlt: 0,
    upperAlt: 30000,
    color: RESTRICTED_COLOR,
    coordinates: [
      [31.08, 35.10], [31.08, 35.20], [31.00, 35.20],
      [31.00, 35.10], [31.08, 35.10],
    ],
  },
  // --- Asia ---
  {
    id: "r-pyongyang",
    name: "R-Pyongyang Restricted Zone",
    type: "PROHIBITED",
    country: "North Korea",
    lowerAlt: 0,
    upperAlt: 60000,
    color: PROHIBITED_COLOR,
    coordinates: [
      [39.15, 125.60], [39.15, 125.90], [38.90, 125.90],
      [38.90, 125.60], [39.15, 125.60],
    ],
  },
  {
    id: "r-chandipur-launch",
    name: "R-Chandipur Missile Test Range",
    type: "RESTRICTED",
    country: "India",
    lowerAlt: 0,
    upperAlt: 50000,
    color: RESTRICTED_COLOR,
    coordinates: [
      [21.50, 86.80], [21.50, 87.10], [21.30, 87.10],
      [21.30, 86.80], [21.50, 86.80],
    ],
  },
];

// ---------- DANGER Areas ----------

const DANGER_AREAS: Airspace[] = [
  {
    id: "d-north-sea-firing",
    name: "D-323 North Sea Firing Area",
    type: "DANGER",
    country: "United Kingdom",
    lowerAlt: 0,
    upperAlt: 30000,
    color: DANGER_COLOR,
    coordinates: [
      [55.5, -1.0], [55.5, 1.0], [54.5, 1.0],
      [54.5, -1.0], [55.5, -1.0],
    ],
  },
  {
    id: "d-sardinia-range",
    name: "D-Sardinia NATO Firing Range",
    type: "DANGER",
    country: "Italy",
    lowerAlt: 0,
    upperAlt: 45000,
    color: DANGER_COLOR,
    coordinates: [
      [40.0, 9.0], [40.0, 10.0], [39.0, 10.0],
      [39.0, 9.0], [40.0, 9.0],
    ],
  },
  {
    id: "d-hawaii-warning",
    name: "D-Hawaii Pacific Warning Area",
    type: "DANGER",
    country: "United States",
    lowerAlt: 0,
    upperAlt: 60000,
    color: DANGER_COLOR,
    coordinates: [
      [22.0, -161.0], [22.0, -158.0], [20.0, -158.0],
      [20.0, -161.0], [22.0, -161.0],
    ],
  },
];

// ---------- MOA (Military Operations Areas) ----------

const MOA_AREAS: Airspace[] = [
  {
    id: "moa-warning-east",
    name: "Warning Area W-72 (East Coast)",
    type: "MOA",
    country: "United States",
    lowerAlt: 8000,
    upperAlt: 50000,
    color: MOA_COLOR,
    coordinates: [
      [37.0, -74.0], [37.0, -72.0], [35.0, -72.0],
      [35.0, -74.0], [37.0, -74.0],
    ],
  },
  {
    id: "moa-stumpy-point",
    name: "Stumpy Point MOA",
    type: "MOA",
    country: "United States",
    lowerAlt: 500,
    upperAlt: 17999,
    color: MOA_COLOR,
    coordinates: [
      [36.0, -76.5], [36.0, -75.5], [35.5, -75.5],
      [35.5, -76.5], [36.0, -76.5],
    ],
  },
  {
    id: "moa-snowbird",
    name: "Snowbird MOA (Arizona)",
    type: "MOA",
    country: "United States",
    lowerAlt: 1000,
    upperAlt: 17999,
    color: MOA_COLOR,
    coordinates: [
      [32.5, -111.5], [32.5, -110.5], [31.5, -110.5],
      [31.5, -111.5], [32.5, -111.5],
    ],
  },
  {
    id: "moa-lakenheath",
    name: "RAF Lakenheath MOA",
    type: "MOA",
    country: "United Kingdom",
    lowerAlt: 5000,
    upperAlt: 30000,
    color: MOA_COLOR,
    coordinates: [
      [52.5, 0.4], [52.5, 0.7], [52.3, 0.7],
      [52.3, 0.4], [52.5, 0.4],
    ],
  },
];

// ---------- TMA (Terminal Maneuvering Areas) ----------

const TMA_AREAS: Airspace[] = [
  // --- India ---
  {
    id: "tma-vidp-delhi",
    name: "Delhi TMA (VIDP)",
    type: "TMA",
    country: "India",
    icao: "VIDP",
    lowerAlt: 0,
    upperAlt: 15000,
    color: TMA_COLOR,
    coordinates: [
      [29.0, 76.6], [29.0, 77.7], [28.3, 77.7],
      [28.3, 76.6], [29.0, 76.6],
    ],
  },
  {
    id: "tma-vabb-mumbai",
    name: "Mumbai TMA (VABB)",
    type: "TMA",
    country: "India",
    icao: "VABB",
    lowerAlt: 0,
    upperAlt: 12500,
    color: TMA_COLOR,
    coordinates: [
      [19.4, 72.5], [19.4, 73.2], [18.7, 73.2],
      [18.7, 72.5], [19.4, 72.5],
    ],
  },
  {
    id: "tma-vobl-bangalore",
    name: "Bangalore TMA (VOBL)",
    type: "TMA",
    country: "India",
    icao: "VOBL",
    lowerAlt: 0,
    upperAlt: 12500,
    color: TMA_COLOR,
    coordinates: [
      [13.3, 77.3], [13.3, 78.0], [12.7, 78.0],
      [12.7, 77.3], [13.3, 77.3],
    ],
  },
  // --- United States ---
  {
    id: "tma-kjfk-new-york",
    name: "New York TMA (KJFK/KLGA/KEWR)",
    type: "TMA",
    country: "United States",
    icao: "KJFK",
    lowerAlt: 0,
    upperAlt: 12000,
    color: TMA_COLOR,
    coordinates: [
      [41.0, -74.5], [41.0, -73.2], [40.3, -73.2],
      [40.3, -74.5], [41.0, -74.5],
    ],
  },
  {
    id: "tma-klax-los-angeles",
    name: "Los Angeles TMA (KLAX)",
    type: "TMA",
    country: "United States",
    icao: "KLAX",
    lowerAlt: 0,
    upperAlt: 10000,
    color: TMA_COLOR,
    coordinates: [
      [34.2, -118.8], [34.2, -117.8], [33.6, -117.8],
      [33.6, -118.8], [34.2, -118.8],
    ],
  },
  {
    id: "tma-katl-atlanta",
    name: "Atlanta TMA (KATL)",
    type: "TMA",
    country: "United States",
    icao: "KATL",
    lowerAlt: 0,
    upperAlt: 12000,
    color: TMA_COLOR,
    coordinates: [
      [33.9, -84.8], [33.9, -84.0], [33.4, -84.0],
      [33.4, -84.8], [33.9, -84.8],
    ],
  },
  {
    id: "tma-kord-chicago",
    name: "Chicago TMA (KORD)",
    type: "TMA",
    country: "United States",
    icao: "KORD",
    lowerAlt: 0,
    upperAlt: 10000,
    color: TMA_COLOR,
    coordinates: [
      [42.2, -88.3], [42.2, -87.4], [41.6, -87.4],
      [41.6, -88.3], [42.2, -88.3],
    ],
  },
  // --- Europe ---
  {
    id: "tma-egll-heathrow",
    name: "London TMA (EGLL)",
    type: "TMA",
    country: "United Kingdom",
    icao: "EGLL",
    lowerAlt: 0,
    upperAlt: 12500,
    color: TMA_COLOR,
    coordinates: [
      [51.7, -0.8], [51.7, 0.3], [51.2, 0.3],
      [51.2, -0.8], [51.7, -0.8],
    ],
  },
  {
    id: "tma-lfpg-cdg",
    name: "Paris TMA (LFPG/LFPO)",
    type: "TMA",
    country: "France",
    icao: "LFPG",
    lowerAlt: 0,
    upperAlt: 11500,
    color: TMA_COLOR,
    coordinates: [
      [49.2, 2.0], [49.2, 2.9], [48.7, 2.9],
      [48.7, 2.0], [49.2, 2.0],
    ],
  },
  {
    id: "tma-eddf-frankfurt",
    name: "Frankfurt TMA (EDDF)",
    type: "TMA",
    country: "Germany",
    icao: "EDDF",
    lowerAlt: 0,
    upperAlt: 10000,
    color: TMA_COLOR,
    coordinates: [
      [50.3, 8.2], [50.3, 9.0], [49.8, 9.0],
      [49.8, 8.2], [50.3, 8.2],
    ],
  },
  // --- Middle East ---
  {
    id: "tma-omdb-dubai",
    name: "Dubai TMA (OMDB)",
    type: "TMA",
    country: "UAE",
    icao: "OMDB",
    lowerAlt: 0,
    upperAlt: 10000,
    color: TMA_COLOR,
    coordinates: [
      [25.5, 54.9], [25.5, 55.7], [25.0, 55.7],
      [25.0, 54.9], [25.5, 54.9],
    ],
  },
  // --- Asia ---
  {
    id: "tma-wsss-changi",
    name: "Singapore TMA (WSSS)",
    type: "TMA",
    country: "Singapore",
    icao: "WSSS",
    lowerAlt: 0,
    upperAlt: 10000,
    color: TMA_COLOR,
    coordinates: [
      [1.55, 103.7], [1.55, 104.2], [1.15, 104.2],
      [1.15, 103.7], [1.55, 103.7],
    ],
  },
  {
    id: "tma-rjtt-haneda",
    name: "Tokyo TMA (RJTT/RJAA)",
    type: "TMA",
    country: "Japan",
    icao: "RJTT",
    lowerAlt: 0,
    upperAlt: 15000,
    color: TMA_COLOR,
    coordinates: [
      [36.0, 139.3], [36.0, 140.5], [35.3, 140.5],
      [35.3, 139.3], [36.0, 139.3],
    ],
  },
  {
    id: "tma-yssy-sydney",
    name: "Sydney TMA (YSSY)",
    type: "TMA",
    country: "Australia",
    icao: "YSSY",
    lowerAlt: 0,
    upperAlt: 12000,
    color: TMA_COLOR,
    coordinates: [
      [-33.6, 150.8], [-33.6, 151.5], [-34.1, 151.5],
      [-34.1, 150.8], [-33.6, 150.8],
    ],
  },
];

// ---------- Combined Export ----------

export const AIRSPACES: Airspace[] = [
  ...FIR_REGIONS,
  ...RESTRICTED_AREAS,
  ...DANGER_AREAS,
  ...MOA_AREAS,
  ...TMA_AREAS,
];

/**
 * Helper: get distinct airspace types present in the dataset.
 */
export function getAirspaceTypes(): Airspace["type"][] {
  const types = new Set<Airspace["type"]>();
  for (const a of AIRSPACES) types.add(a.type);
  return Array.from(types);
}

/**
 * Helper: get airspaces filtered by type set.
 */
export function getAirspacesByTypes(types: Set<string>): Airspace[] {
  return AIRSPACES.filter((a) => types.has(a.type));
}

/**
 * Helper: get border style for a given airspace type.
 */
export function getBorderStyle(type: Airspace["type"]): string {
  switch (type) {
    case "FIR":
    case "UIR":
      return "8 6"; // dashed
    case "TMA":
    case "CTR":
      return "4 4"; // short dash
    case "MOA":
      return "12 4 4 4"; // dash-dot
    default:
      return ""; // solid for restricted/prohibited/danger
  }
}

/**
 * Helper: get border color (solid, not translucent) for a given airspace type.
 */
export function getBorderColor(type: Airspace["type"]): string {
  switch (type) {
    case "FIR":
    case "UIR":
      return "var(--text-tertiary)";
    case "TMA":
    case "CTR":
      return "var(--text-secondary)";
    case "RESTRICTED":
      return "var(--accent-primary)";
    case "PROHIBITED":
      return "var(--accent-primary)";
    case "DANGER":
      return "var(--text-tertiary)";
    case "MOA":
      return "var(--text-tertiary)";
    default:
      return "#6b7280";
  }
}
