import { getSupabaseAdmin } from "../supabase";

// ── Inline types (avoid Database generic issues with untyped client) ──

interface FlightPositionInsert {
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
}

interface AirportBaselineInsert {
  airport_icao: string;
  hour_of_week: number;
  avg_arrivals: number;
  avg_departures: number;
  stddev_arrivals: number;
  stddev_departures: number;
  avg_pressure_score: number;
  sample_count: number;
  updated_at: string;
}

interface FlightEventInsert {
  event_type: string;
  severity: string;
  airport_icao: string | null;
  corridor_id: string | null;
  affected_flights: string[];
  message: string;
  metadata: Record<string, unknown>;
  detected_at: string;
  resolved_at: string | null;
}

interface TurnaroundInsert {
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
}

interface CorridorSnapshotInsert {
  corridor_id: string;
  corridor_name: string;
  flight_count: number;
  avg_altitude: number | null;
  avg_speed: number | null;
  avg_spacing_nm: number | null;
  anomaly_count: number;
  health_score: number;
  recorded_at: string;
}

interface PressureSnapshotInsert {
  airport_icao: string;
  airport_name: string;
  pressure_score: number;
  inbound_count: number;
  outbound_count: number;
  ground_count: number;
  holding_count: number;
  go_around_count: number;
  recorded_at: string;
}

// ── Flight positions ────────────────────────────────────────────────

export async function insertFlightPositions(
  positions: FlightPositionInsert[]
): Promise<void> {
  if (positions.length === 0) return;

  const supabase = getSupabaseAdmin();

  const chunkSize = 500;
  for (let i = 0; i < positions.length; i += chunkSize) {
    const chunk = positions.slice(i, i + chunkSize);
    const { error } = await supabase
      .from("flight_positions")
      .insert(chunk as never[]);
    if (error) {
      console.error("[DB] Failed to insert flight positions:", error.message);
    }
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function getFlightHistory(icao24: string, limit = 50): Promise<any[]> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("flight_positions")
    .select("*")
    .eq("icao24", icao24)
    .order("recorded_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("[DB] Failed to get flight history:", error.message);
    return [];
  }
  return data ?? [];
}

// ── Airport baselines ───────────────────────────────────────────────

export async function upsertAirportBaseline(
  baseline: AirportBaselineInsert
): Promise<void> {
  const supabase = getSupabaseAdmin();
  const { error } = await supabase
    .from("airport_baselines")
    .upsert(baseline as never, {
      onConflict: "airport_icao,hour_of_week",
    });

  if (error) {
    console.error("[DB] Failed to upsert baseline:", error.message);
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function getAirportBaseline(airportIcao: string, hourOfWeek: number): Promise<any | null> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("airport_baselines")
    .select("*")
    .eq("airport_icao", airportIcao)
    .eq("hour_of_week", hourOfWeek)
    .single();

  if (error) return null;
  return data;
}

// ── Flight events ───────────────────────────────────────────────────

export async function insertFlightEvent(
  event: FlightEventInsert
): Promise<void> {
  const supabase = getSupabaseAdmin();
  const { error } = await supabase
    .from("flight_events")
    .insert(event as never);

  if (error) {
    console.error("[DB] Failed to insert event:", error.message);
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function getRecentEvents(limit = 50): Promise<any[]> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("flight_events")
    .select("*")
    .order("detected_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("[DB] Failed to get events:", error.message);
    return [];
  }
  return data ?? [];
}

// ── Turnaround records ──────────────────────────────────────────────

export async function insertTurnaroundRecord(
  record: TurnaroundInsert
): Promise<void> {
  const supabase = getSupabaseAdmin();
  const { error } = await supabase
    .from("turnaround_records")
    .insert(record as never);

  if (error) {
    console.error("[DB] Failed to insert turnaround:", error.message);
  }
}

export async function updateTurnaroundRecord(
  icao24: string,
  airportIcao: string,
  arrivalTime: string,
  update: Partial<TurnaroundInsert>
): Promise<void> {
  const supabase = getSupabaseAdmin();
  const { error } = await supabase
    .from("turnaround_records")
    .update({ ...update, updated_at: new Date().toISOString() } as never)
    .eq("icao24", icao24)
    .eq("airport_icao", airportIcao)
    .eq("arrival_time", arrivalTime);

  if (error) {
    console.error("[DB] Failed to update turnaround:", error.message);
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function getActiveTurnarounds(airportIcao: string): Promise<any[]> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("turnaround_records")
    .select("*")
    .eq("airport_icao", airportIcao)
    .eq("status", "on_ground")
    .order("arrival_time", { ascending: false })
    .limit(50);

  if (error) {
    console.error("[DB] Failed to get active turnarounds:", error.message);
    return [];
  }
  return data ?? [];
}

// ── Turnaround queries ──────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function getRecentTurnarounds(limit = 50): Promise<any[]> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("turnaround_records")
    .select("*")
    .eq("status", "departed")
    .order("departure_time", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("[DB] Failed to get recent turnarounds:", error.message);
    return [];
  }
  return data ?? [];
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function getAllActiveTurnarounds(limit = 100): Promise<any[]> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("turnaround_records")
    .select("*")
    .eq("status", "on_ground")
    .order("arrival_time", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("[DB] Failed to get all active turnarounds:", error.message);
    return [];
  }
  return data ?? [];
}

// ── Baseline queries ────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function getAllBaselinesForHour(hourOfWeek: number): Promise<any[]> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("airport_baselines")
    .select("*")
    .eq("hour_of_week", hourOfWeek);

  if (error) {
    console.error("[DB] Failed to get baselines for hour:", error.message);
    return [];
  }
  return data ?? [];
}

// ── Corridor snapshots ──────────────────────────────────────────────

export async function insertCorridorSnapshot(
  snapshot: CorridorSnapshotInsert
): Promise<void> {
  const supabase = getSupabaseAdmin();
  const { error } = await supabase
    .from("corridor_snapshots")
    .insert(snapshot as never);

  if (error) {
    console.error("[DB] Failed to insert corridor snapshot:", error.message);
  }
}

// ── Airport pressure snapshots ──────────────────────────────────────

export async function insertPressureSnapshot(
  snapshot: PressureSnapshotInsert
): Promise<void> {
  const supabase = getSupabaseAdmin();
  const { error } = await supabase
    .from("airport_pressure_snapshots")
    .insert(snapshot as never);

  if (error) {
    console.error("[DB] Failed to insert pressure snapshot:", error.message);
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function getLatestPressure(airportIcao: string): Promise<any | null> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("airport_pressure_snapshots")
    .select("*")
    .eq("airport_icao", airportIcao)
    .order("recorded_at", { ascending: false })
    .limit(1)
    .single();

  if (error) return null;
  return data;
}

// ── Cleanup ─────────────────────────────────────────────────────────

export async function cleanupOldPositions(
  olderThanHours = 24
): Promise<number> {
  const supabase = getSupabaseAdmin();
  const cutoff = new Date(
    Date.now() - olderThanHours * 60 * 60 * 1000
  ).toISOString();

  const { error, count } = await supabase
    .from("flight_positions")
    .delete({ count: "exact" })
    .lt("recorded_at", cutoff);

  if (error) {
    console.error("[DB] Failed to cleanup old positions:", error.message);
    return 0;
  }
  return count ?? 0;
}
