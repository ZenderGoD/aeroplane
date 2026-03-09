export interface CloudLayer {
  coverage: string; // "FEW" | "SCT" | "BKN" | "OVC"
  base: number; // feet AGL
}

export interface MetarData {
  raw: string;
  station: string;
  observationTime: string;
  temperature: number | null; // Celsius
  dewpoint: number | null;
  windDirection: number | null; // degrees
  windSpeed: number | null; // knots
  windGust: number | null;
  visibility: number | null; // statute miles
  ceiling: number | null; // feet AGL
  cloudLayers: CloudLayer[];
  conditions: string[]; // ["Rain", "Mist", etc.]
  flightCategory: string; // "VFR" | "MVFR" | "IFR" | "LIFR"
  altimeter: number | null; // inches Hg
  humidity: number | null;
}
