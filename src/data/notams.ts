// ─── NOTAM / TFR Database ──────────────────────────────────────────
// Realistic sample NOTAMs and Temporary Flight Restrictions for the
// AeroIntel platform overlay.  Coordinates, altitudes and radii are
// representative / educational and not sourced from live FAA feeds.

export interface Notam {
  id: string;
  type: "TFR" | "NOTAM";
  severity: "critical" | "warning" | "info";
  title: string;
  description: string;
  location: { lat: number; lon: number };
  radius?: number; // NM – used for circular TFRs
  polygon?: [number, number][]; // [lat, lon][] for irregular shapes
  lowerAlt?: number; // ft AGL
  upperAlt?: number; // ft AGL
  effectiveFrom: string; // ISO 8601
  effectiveTo: string; // ISO 8601
  source: string;
  affectedAirport?: string; // ICAO code
}

export const NOTAMS: Notam[] = [
  // ═══════════════════════════════════════════════════════════════════
  //  TFRs – VIP Movements
  // ═══════════════════════════════════════════════════════════════════
  {
    id: "TFR-2026-0401",
    type: "TFR",
    severity: "critical",
    title: "VIP TFR – Washington DC Metropolitan Area",
    description:
      "Temporary flight restriction for VIP movement. No aircraft operations permitted within the designated area without prior ATC authorization. Effective during presidential movement.",
    location: { lat: 38.8977, lon: -77.0365 },
    radius: 30,
    lowerAlt: 0,
    upperAlt: 18000,
    effectiveFrom: "2026-03-21T10:00:00Z",
    effectiveTo: "2026-03-21T22:00:00Z",
    source: "FAA FDC NOTAM 6/3214",
  },
  {
    id: "TFR-2026-0402",
    type: "TFR",
    severity: "critical",
    title: "VIP TFR – Palm Beach International",
    description:
      "Temporary flight restriction for VIP movement in the vicinity of Palm Beach International Airport. All aircraft must obtain ATC clearance prior to entry.",
    location: { lat: 26.6832, lon: -80.0956 },
    radius: 10,
    lowerAlt: 0,
    upperAlt: 18000,
    effectiveFrom: "2026-03-22T14:00:00Z",
    effectiveTo: "2026-03-22T23:59:00Z",
    source: "FAA FDC NOTAM 6/3280",
    affectedAirport: "KPBI",
  },
  {
    id: "TFR-2026-0403",
    type: "TFR",
    severity: "critical",
    title: "VIP TFR – Los Angeles Area",
    description:
      "Temporary flight restriction for VIP movement. Inner ring 10 NM no-fly; outer ring 30 NM requires discrete transponder code.",
    location: { lat: 33.9425, lon: -118.408 },
    radius: 30,
    lowerAlt: 0,
    upperAlt: 18000,
    effectiveFrom: "2026-03-23T08:00:00Z",
    effectiveTo: "2026-03-23T20:00:00Z",
    source: "FAA FDC NOTAM 6/3315",
    affectedAirport: "KLAX",
  },

  // ═══════════════════════════════════════════════════════════════════
  //  TFRs – Sporting Events
  // ═══════════════════════════════════════════════════════════════════
  {
    id: "TFR-2026-0410",
    type: "TFR",
    severity: "warning",
    title: "Stadium TFR – SoFi Stadium, Inglewood CA",
    description:
      "Temporary flight restriction for major sporting event at SoFi Stadium. No flights below 3000 ft AGL within 3 NM of the stadium during event hours.",
    location: { lat: 33.9534, lon: -118.3386 },
    radius: 3,
    lowerAlt: 0,
    upperAlt: 3000,
    effectiveFrom: "2026-03-21T17:00:00Z",
    effectiveTo: "2026-03-22T02:00:00Z",
    source: "FAA FDC NOTAM 6/3400",
  },
  {
    id: "TFR-2026-0411",
    type: "TFR",
    severity: "warning",
    title: "Stadium TFR – MetLife Stadium, East Rutherford NJ",
    description:
      "Temporary flight restriction for NFL game. No operations below 3000 ft AGL within 3 NM. Broadcast aircraft exempted with prior coordination.",
    location: { lat: 40.8135, lon: -74.0745 },
    radius: 3,
    lowerAlt: 0,
    upperAlt: 3000,
    effectiveFrom: "2026-03-22T16:00:00Z",
    effectiveTo: "2026-03-23T00:00:00Z",
    source: "FAA FDC NOTAM 6/3401",
  },
  {
    id: "TFR-2026-0412",
    type: "TFR",
    severity: "warning",
    title: "Stadium TFR – AT&T Stadium, Arlington TX",
    description:
      "Temporary flight restriction for major sporting event. Inner 1 NM sterile zone, outer 3 NM restricted below 3000 AGL.",
    location: { lat: 32.7473, lon: -97.0945 },
    radius: 3,
    lowerAlt: 0,
    upperAlt: 3000,
    effectiveFrom: "2026-03-21T18:00:00Z",
    effectiveTo: "2026-03-22T01:00:00Z",
    source: "FAA FDC NOTAM 6/3402",
  },

  // ═══════════════════════════════════════════════════════════════════
  //  TFRs – Wildfires
  // ═══════════════════════════════════════════════════════════════════
  {
    id: "TFR-2026-0420",
    type: "TFR",
    severity: "critical",
    title: "Wildfire TFR – San Bernardino National Forest",
    description:
      "Temporary flight restriction for wildfire suppression operations. Aerial firefighting in progress. No unauthorized aircraft within the designated area. Violators may be subject to enforcement action.",
    location: { lat: 34.17, lon: -117.28 },
    radius: 5,
    lowerAlt: 0,
    upperAlt: 8000,
    effectiveFrom: "2026-03-19T06:00:00Z",
    effectiveTo: "2026-03-25T06:00:00Z",
    source: "FAA FDC NOTAM 6/3500",
  },
  {
    id: "TFR-2026-0421",
    type: "TFR",
    severity: "critical",
    title: "Wildfire TFR – Sequoia National Forest",
    description:
      "Temporary flight restriction due to active wildfire and aerial suppression operations. All aircraft must remain outside the TFR boundary.",
    location: { lat: 36.07, lon: -118.55 },
    radius: 6,
    lowerAlt: 0,
    upperAlt: 10000,
    effectiveFrom: "2026-03-18T12:00:00Z",
    effectiveTo: "2026-03-26T12:00:00Z",
    source: "FAA FDC NOTAM 6/3505",
  },
  {
    id: "TFR-2026-0422",
    type: "TFR",
    severity: "warning",
    title: "Wildfire TFR – Coconino NF, Arizona",
    description:
      "Temporary flight restriction for wildfire suppression near Flagstaff. Helicopter and fixed-wing firefighting operations ongoing.",
    location: { lat: 35.22, lon: -111.65 },
    radius: 4,
    lowerAlt: 0,
    upperAlt: 9000,
    effectiveFrom: "2026-03-20T08:00:00Z",
    effectiveTo: "2026-03-27T08:00:00Z",
    source: "FAA FDC NOTAM 6/3510",
  },

  // ═══════════════════════════════════════════════════════════════════
  //  TFRs – Space Launch Operations
  // ═══════════════════════════════════════════════════════════════════
  {
    id: "TFR-2026-0430",
    type: "TFR",
    severity: "critical",
    title: "Space Launch TFR – Cape Canaveral SFS",
    description:
      "Temporary flight restriction for space vehicle launch operations from Cape Canaveral Space Force Station. Large restricted area encompassing launch trajectory and debris hazard zones.",
    location: { lat: 28.3922, lon: -80.6077 },
    polygon: [
      [28.8, -80.2],
      [28.8, -80.9],
      [28.0, -80.9],
      [28.0, -80.2],
    ],
    lowerAlt: 0,
    upperAlt: 99999,
    effectiveFrom: "2026-03-22T02:00:00Z",
    effectiveTo: "2026-03-22T08:00:00Z",
    source: "FAA FDC NOTAM 6/3600",
  },
  {
    id: "TFR-2026-0431",
    type: "TFR",
    severity: "critical",
    title: "Space Launch TFR – Vandenberg SFB",
    description:
      "Temporary flight restriction for polar-orbit launch from Vandenberg Space Force Base. Corridor extends offshore along the launch azimuth.",
    location: { lat: 34.7563, lon: -120.6214 },
    polygon: [
      [35.0, -120.4],
      [35.0, -121.0],
      [34.4, -121.0],
      [34.4, -120.4],
    ],
    lowerAlt: 0,
    upperAlt: 99999,
    effectiveFrom: "2026-03-24T18:00:00Z",
    effectiveTo: "2026-03-24T23:59:00Z",
    source: "FAA FDC NOTAM 6/3605",
  },

  // ═══════════════════════════════════════════════════════════════════
  //  TFRs – Military Exercises
  // ═══════════════════════════════════════════════════════════════════
  {
    id: "TFR-2026-0440",
    type: "TFR",
    severity: "critical",
    title: "Military Exercise – Nellis Range Complex, NV",
    description:
      "Temporary flight restriction for large-force military exercise (Red Flag 26-2). High-speed military traffic within the Nevada Test and Training Range.",
    location: { lat: 37.23, lon: -115.98 },
    polygon: [
      [38.0, -115.0],
      [38.0, -116.5],
      [36.5, -116.5],
      [36.5, -115.0],
    ],
    lowerAlt: 0,
    upperAlt: 58000,
    effectiveFrom: "2026-03-17T14:00:00Z",
    effectiveTo: "2026-03-28T06:00:00Z",
    source: "FAA FDC NOTAM 6/3700",
  },
  {
    id: "TFR-2026-0441",
    type: "TFR",
    severity: "warning",
    title: "Military Exercise – W-386 Warning Area, Gulf of Mexico",
    description:
      "Temporary activation of Warning Area W-386 for naval live-fire exercise. All non-participating aircraft advised to remain clear.",
    location: { lat: 29.5, lon: -87.5 },
    radius: 40,
    lowerAlt: 0,
    upperAlt: 45000,
    effectiveFrom: "2026-03-21T12:00:00Z",
    effectiveTo: "2026-03-23T12:00:00Z",
    source: "FAA FDC NOTAM 6/3710",
  },
  {
    id: "TFR-2026-0442",
    type: "TFR",
    severity: "warning",
    title: "Military Exercise – MOA Activation, Edwards AFB",
    description:
      "Activation of R-2508 complex military operations area for high-altitude test flights. IFR traffic will be rerouted.",
    location: { lat: 34.91, lon: -117.88 },
    radius: 25,
    lowerAlt: 0,
    upperAlt: 60000,
    effectiveFrom: "2026-03-22T08:00:00Z",
    effectiveTo: "2026-03-22T20:00:00Z",
    source: "FAA FDC NOTAM 6/3715",
  },

  // ═══════════════════════════════════════════════════════════════════
  //  NOTAMs – Airport Closures
  // ═══════════════════════════════════════════════════════════════════
  {
    id: "NOTAM-2026-0501",
    type: "NOTAM",
    severity: "critical",
    title: "Airport Closure – KMDW (Chicago Midway)",
    description:
      "Chicago Midway International Airport closed to all operations for emergency runway repairs. All traffic diverted to KORD.",
    location: { lat: 41.7868, lon: -87.7522 },
    lowerAlt: 0,
    upperAlt: 5000,
    effectiveFrom: "2026-03-21T04:00:00Z",
    effectiveTo: "2026-03-21T16:00:00Z",
    source: "NOTAM A0142/26",
    affectedAirport: "KMDW",
  },
  {
    id: "NOTAM-2026-0502",
    type: "NOTAM",
    severity: "critical",
    title: "Airport Closure – KBUR (Hollywood Burbank)",
    description:
      "Hollywood Burbank Airport closed for scheduled airfield maintenance and runway resurfacing. Expected 12-hour closure.",
    location: { lat: 34.2007, lon: -118.3585 },
    lowerAlt: 0,
    upperAlt: 3000,
    effectiveFrom: "2026-03-22T06:00:00Z",
    effectiveTo: "2026-03-22T18:00:00Z",
    source: "NOTAM A0155/26",
    affectedAirport: "KBUR",
  },

  // ═══════════════════════════════════════════════════════════════════
  //  NOTAMs – Runway Closures
  // ═══════════════════════════════════════════════════════════════════
  {
    id: "NOTAM-2026-0510",
    type: "NOTAM",
    severity: "warning",
    title: "Runway 28L Closed – KSFO",
    description:
      "RWY 28L closed for pavement rehabilitation. Arrivals reconfigured to 28R. Expect delays during peak periods. Taxiway Foxtrot restricted.",
    location: { lat: 37.6213, lon: -122.379 },
    effectiveFrom: "2026-03-20T00:00:00Z",
    effectiveTo: "2026-03-28T00:00:00Z",
    source: "NOTAM A0168/26",
    affectedAirport: "KSFO",
  },
  {
    id: "NOTAM-2026-0511",
    type: "NOTAM",
    severity: "warning",
    title: "Runway 04R/22L Closed – KJFK",
    description:
      "RWY 04R/22L closed for lighting system replacement. Single-runway operations in effect during low-traffic hours.",
    location: { lat: 40.6413, lon: -73.7781 },
    effectiveFrom: "2026-03-19T22:00:00Z",
    effectiveTo: "2026-04-02T06:00:00Z",
    source: "NOTAM A0171/26",
    affectedAirport: "KJFK",
  },
  {
    id: "NOTAM-2026-0512",
    type: "NOTAM",
    severity: "warning",
    title: "Runway 10L/28R Closed – KATL",
    description:
      "RWY 10L/28R closed for rubber removal and groove cutting. Parallel runway 10R/28L remains active. Taxiway Mike restricted between Runway 10L and Terminal E.",
    location: { lat: 33.6407, lon: -84.4277 },
    effectiveFrom: "2026-03-21T06:00:00Z",
    effectiveTo: "2026-03-23T06:00:00Z",
    source: "NOTAM A0180/26",
    affectedAirport: "KATL",
  },
  {
    id: "NOTAM-2026-0513",
    type: "NOTAM",
    severity: "warning",
    title: "Runway 14R/32L Closed – KORD",
    description:
      "RWY 14R/32L closed nightly 2200-0600 local for construction of new high-speed exit taxiway. Reduced capacity during closure window.",
    location: { lat: 41.9742, lon: -87.9073 },
    effectiveFrom: "2026-03-20T04:00:00Z",
    effectiveTo: "2026-04-15T11:00:00Z",
    source: "NOTAM A0185/26",
    affectedAirport: "KORD",
  },

  // ═══════════════════════════════════════════════════════════════════
  //  NOTAMs – Navaid Outages
  // ═══════════════════════════════════════════════════════════════════
  {
    id: "NOTAM-2026-0520",
    type: "NOTAM",
    severity: "info",
    title: "ILS RWY 25L OTS – KLAX",
    description:
      "ILS/DME RWY 25L out of service for scheduled maintenance. RNAV and visual approaches available. Expect vectors for alternate approaches.",
    location: { lat: 33.9425, lon: -118.408 },
    effectiveFrom: "2026-03-21T08:00:00Z",
    effectiveTo: "2026-03-21T20:00:00Z",
    source: "NOTAM A0200/26",
    affectedAirport: "KLAX",
  },
  {
    id: "NOTAM-2026-0521",
    type: "NOTAM",
    severity: "info",
    title: "VOR/DME DCA OTS",
    description:
      "DCA VOR/DME (114.7 MHz) out of service. Aircraft on Victor airways V93 and V268 must use alternate navigation. GPS-equipped aircraft unaffected.",
    location: { lat: 38.8521, lon: -77.0375 },
    effectiveFrom: "2026-03-22T12:00:00Z",
    effectiveTo: "2026-03-24T12:00:00Z",
    source: "NOTAM A0205/26",
    affectedAirport: "KDCA",
  },
  {
    id: "NOTAM-2026-0522",
    type: "NOTAM",
    severity: "info",
    title: "VORTAC BOS OTS",
    description:
      "Boston VORTAC (112.7 MHz) out of service for antenna replacement. RNAV procedures unaffected. Advisory: check NOTAMs for alternate routing.",
    location: { lat: 42.3656, lon: -71.0096 },
    effectiveFrom: "2026-03-23T00:00:00Z",
    effectiveTo: "2026-03-25T00:00:00Z",
    source: "NOTAM A0210/26",
    affectedAirport: "KBOS",
  },
  {
    id: "NOTAM-2026-0523",
    type: "NOTAM",
    severity: "info",
    title: "PAPI RWY 19 OTS – KDEN",
    description:
      "Precision approach path indicator (PAPI) for RWY 19 unserviceable. Pilots should use VASI on RWY 19 or electronic glideslope for approach guidance.",
    location: { lat: 39.8561, lon: -104.6737 },
    effectiveFrom: "2026-03-20T14:00:00Z",
    effectiveTo: "2026-03-22T14:00:00Z",
    source: "NOTAM A0215/26",
    affectedAirport: "KDEN",
  },

  // ═══════════════════════════════════════════════════════════════════
  //  NOTAMs – Airspace Restrictions
  // ═══════════════════════════════════════════════════════════════════
  {
    id: "NOTAM-2026-0530",
    type: "NOTAM",
    severity: "warning",
    title: "Airspace Restriction – NYC Class B Modification",
    description:
      "Temporary modification to New York Class B airspace. Outer ring lowered to 1500 ft for increased security operations. All VFR traffic requires explicit clearance.",
    location: { lat: 40.7128, lon: -74.006 },
    radius: 15,
    lowerAlt: 1500,
    upperAlt: 10000,
    effectiveFrom: "2026-03-21T06:00:00Z",
    effectiveTo: "2026-03-23T06:00:00Z",
    source: "NOTAM A0225/26",
  },
  {
    id: "NOTAM-2026-0531",
    type: "NOTAM",
    severity: "warning",
    title: "Airspace Restriction – SFRA Altitude Change",
    description:
      "Special Flight Rules Area around Washington DC temporarily modified. Speed restriction of 180 KIAS below 2500 AGL applies to all aircraft within the SFRA.",
    location: { lat: 38.86, lon: -77.04 },
    radius: 20,
    lowerAlt: 0,
    upperAlt: 18000,
    effectiveFrom: "2026-03-21T00:00:00Z",
    effectiveTo: "2026-03-22T00:00:00Z",
    source: "NOTAM A0230/26",
  },
  {
    id: "NOTAM-2026-0532",
    type: "NOTAM",
    severity: "info",
    title: "Airspace – Temporary Restricted Area, Miramar MCAS",
    description:
      "Temporary restricted area R-TEMP for military airshow rehearsal at MCAS Miramar. Aerobatic box 5000 ft AGL and below within 3 NM.",
    location: { lat: 32.8684, lon: -117.1424 },
    radius: 3,
    lowerAlt: 0,
    upperAlt: 5000,
    effectiveFrom: "2026-03-24T14:00:00Z",
    effectiveTo: "2026-03-24T19:00:00Z",
    source: "NOTAM A0235/26",
  },

  // ═══════════════════════════════════════════════════════════════════
  //  NOTAMs – Drone Activity Areas
  // ═══════════════════════════════════════════════════════════════════
  {
    id: "NOTAM-2026-0540",
    type: "NOTAM",
    severity: "info",
    title: "UAS Activity – Phoenix Drone Delivery Corridor",
    description:
      "Unmanned aircraft systems (UAS) operations in progress for commercial drone delivery testing. UAS operating up to 400 ft AGL within designated corridor. Pilots are advised to exercise caution.",
    location: { lat: 33.4484, lon: -112.074 },
    radius: 2,
    lowerAlt: 0,
    upperAlt: 400,
    effectiveFrom: "2026-03-20T15:00:00Z",
    effectiveTo: "2026-03-28T21:00:00Z",
    source: "NOTAM A0240/26",
  },
  {
    id: "NOTAM-2026-0541",
    type: "NOTAM",
    severity: "info",
    title: "UAS Activity – Amazon Prime Air Testing, Dallas",
    description:
      "Authorized UAS operations for package delivery system testing. Multiple drones operating below 400 ft AGL. Equipped with ADS-B Out and DAA systems.",
    location: { lat: 32.7767, lon: -96.797 },
    radius: 2,
    lowerAlt: 0,
    upperAlt: 400,
    effectiveFrom: "2026-03-21T14:00:00Z",
    effectiveTo: "2026-03-26T22:00:00Z",
    source: "NOTAM A0245/26",
  },
  {
    id: "NOTAM-2026-0542",
    type: "NOTAM",
    severity: "info",
    title: "UAS Activity – Infrastructure Inspection, Houston",
    description:
      "UAS operations for power-line and pipeline inspection along a 12-mile corridor. Drones operating up to 500 ft AGL. Equipped with anti-collision lighting.",
    location: { lat: 29.7604, lon: -95.3698 },
    radius: 3,
    lowerAlt: 0,
    upperAlt: 500,
    effectiveFrom: "2026-03-22T13:00:00Z",
    effectiveTo: "2026-03-22T19:00:00Z",
    source: "NOTAM A0250/26",
  },
  {
    id: "NOTAM-2026-0543",
    type: "NOTAM",
    severity: "warning",
    title: "UAS Activity – Drone Light Show, Las Vegas Strip",
    description:
      "Authorized UAS swarm operations for entertainment drone light show. 500+ drones operating up to 1500 ft AGL. Show times 20:00-22:00 local. NOTAM includes 1 NM buffer zone.",
    location: { lat: 36.1147, lon: -115.1728 },
    radius: 2,
    lowerAlt: 0,
    upperAlt: 1500,
    effectiveFrom: "2026-03-21T03:00:00Z",
    effectiveTo: "2026-03-22T06:00:00Z",
    source: "NOTAM A0255/26",
  },

  // ═══════════════════════════════════════════════════════════════════
  //  Additional NOTAMs – Mixed categories
  // ═══════════════════════════════════════════════════════════════════
  {
    id: "NOTAM-2026-0550",
    type: "NOTAM",
    severity: "warning",
    title: "Taxiway A Closed – KMIA",
    description:
      "Taxiway Alpha between gates D25 and D40 closed for construction. Use Taxiway Bravo for access to Runway 09/27. Follow ground control instructions.",
    location: { lat: 25.7959, lon: -80.287 },
    effectiveFrom: "2026-03-18T10:00:00Z",
    effectiveTo: "2026-04-01T10:00:00Z",
    source: "NOTAM A0260/26",
    affectedAirport: "KMIA",
  },
  {
    id: "NOTAM-2026-0551",
    type: "NOTAM",
    severity: "info",
    title: "ATIS Frequency Change – KPHX",
    description:
      "Phoenix Sky Harbor ATIS frequency temporarily changed from 120.35 to 127.95 due to equipment maintenance. Digital ATIS via ACARS unaffected.",
    location: { lat: 33.4373, lon: -112.0078 },
    effectiveFrom: "2026-03-21T12:00:00Z",
    effectiveTo: "2026-03-23T12:00:00Z",
    source: "NOTAM A0265/26",
    affectedAirport: "KPHX",
  },
  {
    id: "NOTAM-2026-0552",
    type: "NOTAM",
    severity: "critical",
    title: "GPS Interference – Southwest US (Military Testing)",
    description:
      "GPS interference expected within a 200 NM radius of White Sands Missile Range. RAIM may be unreliable. Pilots should ensure alternate means of navigation are available.",
    location: { lat: 32.38, lon: -106.48 },
    radius: 200,
    lowerAlt: 0,
    upperAlt: 50000,
    effectiveFrom: "2026-03-22T16:00:00Z",
    effectiveTo: "2026-03-22T22:00:00Z",
    source: "NOTAM A0270/26",
  },
  {
    id: "TFR-2026-0450",
    type: "TFR",
    severity: "warning",
    title: "Stadium TFR – Levi's Stadium, Santa Clara CA",
    description:
      "Temporary flight restriction for major sporting event. No operations below 3000 ft AGL within 3 NM during event hours.",
    location: { lat: 37.4033, lon: -121.9694 },
    radius: 3,
    lowerAlt: 0,
    upperAlt: 3000,
    effectiveFrom: "2026-03-22T00:00:00Z",
    effectiveTo: "2026-03-22T06:00:00Z",
    source: "FAA FDC NOTAM 6/3420",
  },
  {
    id: "NOTAM-2026-0553",
    type: "NOTAM",
    severity: "warning",
    title: "Crane Obstruction – KEWR (Newark Liberty)",
    description:
      "Construction crane operating at 285 ft AGL, 0.3 NM northeast of RWY 04L threshold. Crane lighted. Pilots should exercise caution on approach to RWY 04L.",
    location: { lat: 40.6895, lon: -74.1745 },
    effectiveFrom: "2026-03-15T00:00:00Z",
    effectiveTo: "2026-05-15T00:00:00Z",
    source: "NOTAM A0275/26",
    affectedAirport: "KEWR",
  },
  {
    id: "NOTAM-2026-0554",
    type: "NOTAM",
    severity: "info",
    title: "Parachute Operations – Perris Valley, CA",
    description:
      "Intensive parachute jumping operations in progress. Jumpers exiting aircraft up to 15000 ft MSL within 2 NM of Perris Valley Airport (L65). CTAF monitoring recommended.",
    location: { lat: 33.7683, lon: -117.2264 },
    radius: 2,
    lowerAlt: 0,
    upperAlt: 15000,
    effectiveFrom: "2026-03-21T15:00:00Z",
    effectiveTo: "2026-03-21T23:00:00Z",
    source: "NOTAM A0280/26",
  },
  {
    id: "NOTAM-2026-0555",
    type: "NOTAM",
    severity: "warning",
    title: "Runway 36R/18L Shortened – KDFW",
    description:
      "RWY 36R/18L shortened by 1200 ft from the 18L threshold for construction. Displaced threshold in effect. LAHSO operations suspended on this runway.",
    location: { lat: 32.8998, lon: -97.0403 },
    effectiveFrom: "2026-03-19T06:00:00Z",
    effectiveTo: "2026-04-05T06:00:00Z",
    source: "NOTAM A0285/26",
    affectedAirport: "KDFW",
  },
  {
    id: "NOTAM-2026-0556",
    type: "NOTAM",
    severity: "info",
    title: "Airport Beacon OTS – KLAS",
    description:
      "Airport rotating beacon at McCarran International unserviceable pending bulb replacement. Airport remains operational.",
    location: { lat: 36.08, lon: -115.152 },
    effectiveFrom: "2026-03-20T20:00:00Z",
    effectiveTo: "2026-03-22T08:00:00Z",
    source: "NOTAM A0290/26",
    affectedAirport: "KLAS",
  },
  {
    id: "TFR-2026-0460",
    type: "TFR",
    severity: "critical",
    title: "Wildfire TFR – Angeles National Forest",
    description:
      "Active wildfire with rapid spread. Multiple aerial tankers and helicopter operations. Absolutely no unauthorized flights. FAA enforcement in effect.",
    location: { lat: 34.32, lon: -118.1 },
    radius: 5,
    lowerAlt: 0,
    upperAlt: 8000,
    effectiveFrom: "2026-03-20T02:00:00Z",
    effectiveTo: "2026-03-27T02:00:00Z",
    source: "FAA FDC NOTAM 6/3520",
  },
  {
    id: "NOTAM-2026-0557",
    type: "NOTAM",
    severity: "critical",
    title: "Airport Closure – KSAN (San Diego Intl)",
    description:
      "San Diego International Airport closed for emergency. Suspicious package on airfield. All arrivals holding or diverting to KNKX/KCRQ. Departures halted.",
    location: { lat: 32.7336, lon: -117.1897 },
    lowerAlt: 0,
    upperAlt: 5000,
    effectiveFrom: "2026-03-21T15:00:00Z",
    effectiveTo: "2026-03-21T21:00:00Z",
    source: "NOTAM A0295/26",
    affectedAirport: "KSAN",
  },
  {
    id: "NOTAM-2026-0558",
    type: "NOTAM",
    severity: "info",
    title: "ILS CAT III Downgrade – KIAH",
    description:
      "ILS RWY 27 downgraded from CAT III to CAT I due to RVR transmissometer maintenance. CAT III minimums not authorized during this period.",
    location: { lat: 29.9844, lon: -95.3414 },
    effectiveFrom: "2026-03-22T04:00:00Z",
    effectiveTo: "2026-03-22T16:00:00Z",
    source: "NOTAM A0300/26",
    affectedAirport: "KIAH",
  },
];
