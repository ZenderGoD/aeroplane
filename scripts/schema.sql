-- Flight Tracker Database Schema
-- Run this in Supabase SQL Editor (Dashboard > SQL Editor > New Query)

CREATE TABLE IF NOT EXISTS flight_positions (
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
);

CREATE INDEX IF NOT EXISTS idx_fp_icao24_time
   ON flight_positions(icao24, recorded_at DESC);

CREATE INDEX IF NOT EXISTS idx_fp_recorded_at
   ON flight_positions(recorded_at DESC);

CREATE TABLE IF NOT EXISTS airport_baselines (
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
);

CREATE TABLE IF NOT EXISTS flight_events (
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
);

CREATE INDEX IF NOT EXISTS idx_events_detected
   ON flight_events(detected_at DESC);

CREATE INDEX IF NOT EXISTS idx_events_airport
   ON flight_events(airport_icao, detected_at DESC);

CREATE TABLE IF NOT EXISTS turnaround_records (
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
);

CREATE INDEX IF NOT EXISTS idx_turnaround_icao24
   ON turnaround_records(icao24, arrival_time DESC);

CREATE INDEX IF NOT EXISTS idx_turnaround_airport
   ON turnaround_records(airport_icao, arrival_time DESC);

CREATE TABLE IF NOT EXISTS corridor_snapshots (
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
);

CREATE INDEX IF NOT EXISTS idx_corridor_time
   ON corridor_snapshots(corridor_id, recorded_at DESC);

CREATE TABLE IF NOT EXISTS airport_pressure_snapshots (
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
);

CREATE INDEX IF NOT EXISTS idx_pressure_airport_time
   ON airport_pressure_snapshots(airport_icao, recorded_at DESC);
