export interface AirportBaseline {
  airportIcao: string;
  hourOfWeek: number; // 0-167 (day * 24 + hour)
  avgArrivals: number;
  avgDepartures: number;
  stddevArrivals: number;
  stddevDepartures: number;
  avgPressureScore: number;
  sampleCount: number;
  updatedAt: number; // unix ms
}
