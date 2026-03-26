// Database schema types mirroring Supabase tables.
// Used for typed queries via @supabase/supabase-js.

export interface Database {
  public: {
    Tables: {
      flight_positions: {
        Row: {
          id: number;
          icao24: string;
          callsign: string | null;
          latitude: number;
          longitude: number;
          baro_altitude: number | null;
          velocity: number | null;
          true_track: number | null;
          vertical_rate: number | null;
          on_ground: boolean;
          squawk: string | null;
          origin_country: string;
          recorded_at: string;
        };
        Insert: Omit<
          Database["public"]["Tables"]["flight_positions"]["Row"],
          "id"
        >;
        Update: Partial<
          Database["public"]["Tables"]["flight_positions"]["Insert"]
        >;
      };
      airport_baselines: {
        Row: {
          id: number;
          airport_icao: string;
          hour_of_week: number;
          avg_arrivals: number;
          avg_departures: number;
          stddev_arrivals: number;
          stddev_departures: number;
          avg_pressure_score: number;
          sample_count: number;
          updated_at: string;
        };
        Insert: Omit<
          Database["public"]["Tables"]["airport_baselines"]["Row"],
          "id"
        >;
        Update: Partial<
          Database["public"]["Tables"]["airport_baselines"]["Insert"]
        >;
      };
      flight_events: {
        Row: {
          id: number;
          event_type: string;
          severity: string;
          airport_icao: string | null;
          corridor_id: string | null;
          affected_flights: string[];
          message: string;
          metadata: Record<string, unknown>;
          detected_at: string;
          resolved_at: string | null;
        };
        Insert: Omit<Database["public"]["Tables"]["flight_events"]["Row"], "id">;
        Update: Partial<
          Database["public"]["Tables"]["flight_events"]["Insert"]
        >;
      };
      turnaround_records: {
        Row: {
          id: number;
          icao24: string;
          callsign: string | null;
          airport_icao: string;
          airline_icao: string | null;
          aircraft_type: string | null;
          arrival_time: string;
          departure_time: string | null;
          turnaround_minutes: number | null;
          status: string;
          updated_at: string;
        };
        Insert: Omit<
          Database["public"]["Tables"]["turnaround_records"]["Row"],
          "id"
        >;
        Update: Partial<
          Database["public"]["Tables"]["turnaround_records"]["Insert"]
        >;
      };
      corridor_snapshots: {
        Row: {
          id: number;
          corridor_id: string;
          corridor_name: string;
          flight_count: number;
          avg_altitude: number | null;
          avg_speed: number | null;
          avg_spacing_nm: number | null;
          anomaly_count: number;
          health_score: number;
          recorded_at: string;
        };
        Insert: Omit<
          Database["public"]["Tables"]["corridor_snapshots"]["Row"],
          "id"
        >;
        Update: Partial<
          Database["public"]["Tables"]["corridor_snapshots"]["Insert"]
        >;
      };
      airport_pressure_snapshots: {
        Row: {
          id: number;
          airport_icao: string;
          airport_name: string;
          pressure_score: number;
          inbound_count: number;
          outbound_count: number;
          ground_count: number;
          holding_count: number;
          go_around_count: number;
          recorded_at: string;
        };
        Insert: Omit<
          Database["public"]["Tables"]["airport_pressure_snapshots"]["Row"],
          "id"
        >;
        Update: Partial<
          Database["public"]["Tables"]["airport_pressure_snapshots"]["Insert"]
        >;
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
}
