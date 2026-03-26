export interface PressureComponents {
  inboundCount: number;
  outboundCount: number;
  groundCount: number;
  holdingCount: number;
  goAroundCount: number;
}

export interface AirportPressureScore {
  airportIcao: string;
  airportName: string;
  pressureScore: number; // 0-100
  components: PressureComponents;
  baselineDeviation: number | null; // how much above/below baseline
  updatedAt: number; // unix ms
}
