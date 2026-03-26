/**
 * Database setup script — creates all tables in Supabase.
 * Run with: npm run db:setup
 */

import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local"
  );
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false },
});

const SQL_STATEMENTS = [
  // ── Flight positions (time-series) ──────────────────────────────────
  `CREATE TABLE IF NOT EXISTS flight_positions (
    id BIGSERIAL PRIMARY KEY,
    icao24 VARCHAR(6) NOT NULL,
    callsign VARCHAR(10),
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    baro_altitude DOUBLE PRECISION,
    velocity DOUBLE PRECISION,
    true_track DOUBLE PRECISION,
    vertical_rate DOUBLE PRECISION,
    on_ground BOOLEAN NOT NULL DEFAULT false,
    squawk VARCHAR(4),
    origin_country VARCHAR(100),
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`,

  `CREATE INDEX IF NOT EXISTS idx_fp_icao24_time
   ON flight_positions(icao24, recorded_at DESC)`,

  `CREATE INDEX IF NOT EXISTS idx_fp_recorded_at
   ON flight_positions(recorded_at DESC)`,

  // ── Airport baselines ───────────────────────────────────────────────
  `CREATE TABLE IF NOT EXISTS airport_baselines (
    id SERIAL PRIMARY KEY,
    airport_icao VARCHAR(4) NOT NULL,
    hour_of_week SMALLINT NOT NULL CHECK (hour_of_week >= 0 AND hour_of_week <= 167),
    avg_arrivals REAL NOT NULL DEFAULT 0,
    avg_departures REAL NOT NULL DEFAULT 0,
    stddev_arrivals REAL NOT NULL DEFAULT 0,
    stddev_departures REAL NOT NULL DEFAULT 0,
    avg_pressure_score REAL NOT NULL DEFAULT 0,
    sample_count INTEGER NOT NULL DEFAULT 0,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(airport_icao, hour_of_week)
  )`,

  // ── Flight events ──────────────────────────────────────────────────
  `CREATE TABLE IF NOT EXISTS flight_events (
    id SERIAL PRIMARY KEY,
    event_type VARCHAR(50) NOT NULL,
    severity VARCHAR(10) NOT NULL DEFAULT 'info',
    airport_icao VARCHAR(4),
    corridor_id VARCHAR(20),
    affected_flights TEXT[] DEFAULT '{}',
    message TEXT NOT NULL,
    metadata JSONB NOT NULL DEFAULT '{}',
    detected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    resolved_at TIMESTAMPTZ
  )`,

  `CREATE INDEX IF NOT EXISTS idx_events_detected
   ON flight_events(detected_at DESC)`,

  `CREATE INDEX IF NOT EXISTS idx_events_airport
   ON flight_events(airport_icao, detected_at DESC)`,

  // ── Turnaround records ─────────────────────────────────────────────
  `CREATE TABLE IF NOT EXISTS turnaround_records (
    id SERIAL PRIMARY KEY,
    icao24 VARCHAR(6) NOT NULL,
    callsign VARCHAR(10),
    airport_icao VARCHAR(4) NOT NULL,
    airline_icao VARCHAR(4),
    aircraft_type VARCHAR(10),
    arrival_time TIMESTAMPTZ NOT NULL,
    departure_time TIMESTAMPTZ,
    turnaround_minutes REAL,
    status VARCHAR(20) NOT NULL DEFAULT 'on_ground',
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`,

  `CREATE INDEX IF NOT EXISTS idx_turnaround_icao24
   ON turnaround_records(icao24, arrival_time DESC)`,

  `CREATE INDEX IF NOT EXISTS idx_turnaround_airport
   ON turnaround_records(airport_icao, arrival_time DESC)`,

  // ── Corridor snapshots ─────────────────────────────────────────────
  `CREATE TABLE IF NOT EXISTS corridor_snapshots (
    id SERIAL PRIMARY KEY,
    corridor_id VARCHAR(20) NOT NULL,
    corridor_name VARCHAR(100) NOT NULL,
    flight_count INTEGER NOT NULL DEFAULT 0,
    avg_altitude DOUBLE PRECISION,
    avg_speed DOUBLE PRECISION,
    avg_spacing_nm DOUBLE PRECISION,
    anomaly_count INTEGER NOT NULL DEFAULT 0,
    health_score REAL NOT NULL DEFAULT 100,
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`,

  `CREATE INDEX IF NOT EXISTS idx_corridor_time
   ON corridor_snapshots(corridor_id, recorded_at DESC)`,

  // ── Airport pressure snapshots ─────────────────────────────────────
  `CREATE TABLE IF NOT EXISTS airport_pressure_snapshots (
    id SERIAL PRIMARY KEY,
    airport_icao VARCHAR(4) NOT NULL,
    airport_name VARCHAR(200) NOT NULL,
    pressure_score REAL NOT NULL DEFAULT 0,
    inbound_count INTEGER NOT NULL DEFAULT 0,
    outbound_count INTEGER NOT NULL DEFAULT 0,
    ground_count INTEGER NOT NULL DEFAULT 0,
    holding_count INTEGER NOT NULL DEFAULT 0,
    go_around_count INTEGER NOT NULL DEFAULT 0,
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`,

  `CREATE INDEX IF NOT EXISTS idx_pressure_airport_time
   ON airport_pressure_snapshots(airport_icao, recorded_at DESC)`,
];

async function setup() {
  console.log("Setting up database tables...\n");

  for (const sql of SQL_STATEMENTS) {
    const tableName = sql.match(
      /(?:CREATE TABLE|CREATE INDEX).*?(?:IF NOT EXISTS\s+)?(\w+)/i
    )?.[1];
    process.stdout.write(`  Creating ${tableName ?? "object"}...`);

    const { error } = await supabase.rpc("exec_sql", { sql_query: sql });

    if (error) {
      console.log(` [SKIP - will create via SQL editor]`);
      continue;
    }

    console.log(" OK");
  }

  console.log("\n----------------------------------------------------");
  console.log("If any tables were skipped, run the SQL manually in");
  console.log("the Supabase SQL Editor (Dashboard > SQL Editor).");
  console.log("The full SQL is in scripts/setup-database.ts");
  console.log("----------------------------------------------------\n");

  // Print the full SQL for manual execution
  console.log("Full SQL for manual execution:\n");
  console.log(SQL_STATEMENTS.join(";\n\n") + ";");
}

setup().catch((err) => {
  console.error("Setup failed:", err);
  process.exit(1);
});
