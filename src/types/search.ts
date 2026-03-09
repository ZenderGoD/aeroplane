export interface SearchFilters {
  callsign?: string;
  airline?: string;
  altitude_min?: number; // in feet
  altitude_max?: number; // in feet
  heading_min?: number; // 0-360
  heading_max?: number; // 0-360
  speed_min?: number; // in knots
  speed_max?: number; // in knots
  origin_country?: string;
  near_location?: {
    lat: number;
    lon: number;
    radius_nm: number;
  };
  on_ground?: boolean;
  category?: number[];
  is_natural_language: boolean;
}
