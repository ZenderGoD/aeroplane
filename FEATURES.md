# AeroIntel — Feature Overview

> Real-time aviation intelligence platform built on Next.js, OpenSky Network, and AI-powered analytics.

---

## Table of Contents

- [Current Features](#-current-features)
- [In the Pipeline](#-in-the-pipeline)
- [Planned Features](#-planned-features)
- [Suggested Features](#-suggested-features)

---

## Current Features

### Real-Time Flight Tracking

| Feature | Description |
|---------|-------------|
| **Live Aircraft Map** | 2D Leaflet map rendering 10K+ aircraft as canvas-drawn icons with heading rotation and category-based color coding |
| **3D Globe View** | Interactive globe (react-globe.gl) with point-cloud flight rendering, atmosphere glow, and click-to-select |
| **Heatmap Mode** | Density heatmap overlay showing high-traffic concentration zones |
| **Trail Mode** | Renders flight path history as fading trails on the 2D map |
| **Adaptive Polling** | Intelligent refresh cycle: 12s (normal) / 60s (rate-limited) / 5min (quota exhausted), with seamless fallback to stale cached data |
| **Regional Filtering** | Pre-defined geographic bounding boxes (India, Europe, North America, etc.) for focused monitoring |

### Search & Discovery

| Feature | Description |
|---------|-------------|
| **AI Natural Language Search** | Type queries like "show me all Air India flights above 35,000 feet heading east" — parsed by Gemini into structured filters |
| **Direct Callsign Search** | Instant regex-validated callsign/ICAO matching with auto-detection (bypasses AI for simple queries) |
| **Structured Filters** | Filter by altitude range, speed range, heading, airline prefix, origin country, proximity to a location, ground/airborne, aircraft category |

### Flight Detail & Context

| Feature | Description |
|---------|-------------|
| **Flight Sidebar** | Comprehensive detail panel: callsign, ICAO24, origin country, position, altitude (baro + geo), ground speed, vertical rate, heading, squawk code, aircraft category |
| **Aircraft Metadata** | Registration, aircraft type designation, and operator info via ICAO24 lookup |
| **Aircraft Photography** | High-quality aircraft photos sourced from planespotters.net with photographer attribution |
| **Airport Weather (METAR)** | Live aviation weather for nearest/destination airports: flight category (VFR/MVFR/IFR/LIFR), wind, visibility, ceiling, conditions |
| **Airport Estimation** | Heuristic-based departure/destination airport estimation using proximity + heading analysis |
| **AI Flight Narration** | Gemini-powered narrative descriptions combining telemetry, aircraft meta, weather, and airport context into natural-language summaries (10 per day) |
| **3D Flight Viewer** | Interactive Three.js visualization of individual flights with altitude profile, speed profile, and 3D trajectory |
| **Shareable Flight Links** | URL-based flight selection — share a link to highlight a specific aircraft |

### Interactive Map Tools

| Feature | Description |
|---------|-------------|
| **Distance Measurement** | Click any two points on the map to measure great-circle distance in nautical miles |
| **Aircraft Separation Tool** | Click two aircraft to see: lateral distance (NM), bearing, vertical separation (ft), closing/separating speed (kts), time to closest point of approach (CPA), with red/orange proximity alerts |
| **Flight Replay** | Timelapse playback of historical flight positions with speed control and time scrubbing |
| **Keyboard Shortcuts** | Full keyboard navigation: arrow keys for flight cycling, Esc to cancel tools, `/` to focus search, `?` for help dialog, `[` / `]` to toggle sidebar |

### Aviation Intelligence Engine (Background Worker)

The worker polls OpenSky every 15 seconds and runs **7 parallel analysis processors**:

| Processor | What It Does |
|-----------|--------------|
| **History Collector** | Archives flight position snapshots to Supabase for replay and historical analysis |
| **Pressure Calculator** | Calculates airport congestion scores (0-100) for 30 tracked airports based on inbound/outbound/ground/holding/go-around counts within proximity rings |
| **Turnaround Tracker** | Detects aircraft turnaround cycles (landing + takeoff) for utilization analysis |
| **Baseline Aggregator** | Builds hourly baseline statistics per airport (avg arrivals/departures + stddev) for anomaly benchmarking |
| **Event Detector** | Identifies and publishes 8 event types in real-time via SSE |
| **Corridor Health Monitor** | Tracks 14 air corridors (8 Indian domestic + 6 international) with flight count, average spacing, anomaly count, and health score |
| **Corridor Predictability** | Rolling 60-sample window computing predictability scores, standard deviation, trend direction (improving/stable/degrading), and sparkline data |

### Anomaly Detection

Real-time client-side anomaly detection using current telemetry + recent history:

| Anomaly Type | Trigger |
|-------------|---------|
| **Emergency Squawk** | Squawk 7500 (hijack), 7600 (comms failure), 7700 (general emergency) |
| **Rapid Descent** | Vertical rate exceeding -2,000 ft/min |
| **Unusual Speed** | Ground speed outside expected range for aircraft category |
| **Holding Pattern** | Circular heading motion detected over time window |
| **Ground Stop** | Aircraft stationary at unexpected location |

### Flight Events (Real-Time SSE Stream)

Detected by the worker and streamed to all connected clients:

| Event Type | Description |
|-----------|-------------|
| **Holding Surge** | Spike in aircraft entering holding patterns at an airport |
| **Go-Around Cluster** | Multiple missed approaches within a time window |
| **Ground Stop** | Airport ground stop detected via baseline deviation |
| **Traffic Surge** | Abnormal traffic volume vs. historical baseline |
| **Diversion** | Aircraft deviating significantly from expected route |
| **Approach Instability** | Altitude/speed anomalies on final approach |
| **Corridor Congestion** | Air corridor traffic exceeding normal capacity |
| **Departure Delay Wave** | Cascade of delayed departures at an airport |

### Air Corridor Monitoring

14 predefined corridors visualized on the map:

**Indian Domestic:** DEL-BOM, DEL-BLR, BOM-BLR, DEL-MAA, BOM-MAA, DEL-CCU, BOM-HYD, BLR-HYD

**International:** DEL-DXB, BOM-DXB, DEL-SIN, BOM-LHR, DEL-BKK, BOM-SIN

Each corridor shows:
- Great circle arc rendering with proper curvature
- Color coding: green (normal), yellow (compressed), orange (congested), red (disrupted)
- Line width scaling with traffic volume
- Semi-transparent buffer zones
- Airport endpoint markers
- Midpoint ICAO pair labels with health score and trend arrow
- Rich tooltips with health metrics, predictability score, trend, and sparkline

### Intelligence Panel

Multi-tab panel accessible from the sidebar:

| Tab | Content |
|-----|---------|
| **Events** | Live SSE event feed with severity badges, timestamps, and affected flights |
| **Pressure** | Airport congestion scores with component breakdowns (inbound/outbound/ground/holding/go-around) |
| **Corridors** | Corridor health cards with status, flight count, spacing, anomalies, predictability score, trend indicator, and sparkline chart |

### Statistics Dashboard

| Metric | Visualization |
|--------|--------------|
| **Flight Counter** | Total vs. filtered count with refresh indicator and rate-limit status |
| **Airborne vs. Ground** | Distribution breakdown |
| **Top Airlines** | Ranked by active flight count |
| **Top Countries** | Ranked by flight origin |
| **Aircraft Categories** | Pie distribution (Large, Small, Heavy, Rotorcraft, etc.) |
| **Altitude Histogram** | Distribution from 0 to 50,000+ ft |
| **Speed Histogram** | Distribution from 0 to 600+ kts |

### Data Architecture

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Real-time Cache** | Redis | Flight data (15s TTL), pressure scores (120s), corridor health (120s), predictability (120s), event pub/sub |
| **Historical Storage** | Supabase (PostgreSQL) | Flight history, pressure snapshots, airport baselines, flight events, corridor snapshots |
| **API Caching** | In-memory (Next.js) | 2-tier: fresh (15s) + stale (5min) for OpenSky responses; 30min for weather; 24hr for photos |

---

## In the Pipeline

These features are designed, have approved implementation plans, or have partial code — but are not yet fully integrated.

### Mapbox GL JS Globe (Replacing react-globe.gl)

**Status:** Plan approved, blocked on obtaining Mapbox token (requires credit card for free tier)

| Improvement | Current (react-globe.gl) | After (Mapbox GL JS) |
|-------------|------------------------|---------------------|
| **Terrain & Imagery** | Solid dark sphere | Satellite imagery with terrain elevation |
| **Aircraft Rendering** | Simple colored dots | Rotated SDF aircraft icons with heading, category colors, WebGL symbol layers |
| **Performance** | Point cloud merge | GPU-accelerated symbol layers, single draw call per layer, icon-allow-overlap for 10K+ |
| **Corridors on Globe** | Not supported | Native line layers with great-circle rendering |
| **Pressure Visualization** | Not supported | Circle layers at tracked airports, radius/color by pressure score |
| **Interaction** | Basic click | queryRenderedFeatures with pixel tolerance, flyTo animation, cursor changes |
| **Layer Controls** | None | Toggle buttons for corridors and pressure overlays |

**Implementation plan file:** `.claude/plans/dreamy-knitting-gem.md`

### Turnaround Tracking UI

**Status:** Worker processor exists (`turnaroundTracker.ts`), no frontend display yet

The turnaround processor already detects landing + takeoff cycles and calculates gate times. Needs:
- API route to serve turnaround data
- UI cards in IntelligencePanel showing recent turnarounds
- Aircraft utilization metrics (avg turnaround time per airline/airport)

### Baseline Deviation Alerts

**Status:** Worker processor exists (`baselineAggregator.ts`), baseline data accessible via `/api/baselines`

Hour-of-week baseline statistics are being computed and stored. Needs:
- Frontend visualization comparing current traffic to historical baseline
- Visual deviation indicators on the map (airport markers glowing when traffic is abnormal)
- Integration with the anomaly system for baseline-breach alerts

---

## Planned Features

Features we intend to build based on the existing architecture and data pipeline.

### Flight Instability Score

A per-flight composite score (0-100) combining:
- Vertical rate volatility (rapid altitude changes)
- Speed variance over recent history
- Heading instability (frequent course corrections)
- Altitude deviation from filed flight level
- Squawk changes

Displayed as a colored badge on flight markers and in the sidebar. Flights scoring above threshold would trigger anomaly alerts.

### Route Deviation Detection

Compare a flight's actual trajectory against the expected great-circle route between estimated departure and destination airports:
- Compute lateral deviation in NM at each position update
- Flag flights deviating beyond threshold (e.g., 50 NM)
- Visualize expected vs. actual path on the map
- Feed deviations into the event detector for diversion alerts

### "Why Is My Flight Late?" Explainer

For a selected flight, compile a natural-language explanation using:
- Current airport pressure at origin/destination
- Active events (holding surges, ground stops, delay waves)
- Weather conditions at both endpoints
- Corridor congestion along the route
- Historical baseline comparison (is this delay normal for this time?)

Present as a card in the flight sidebar with AI-generated summary.

### Multi-Flight Narrative Mode

Select 2-5 flights and generate a comparative analysis:
- Relative positions and trajectories
- Shared corridors or airports
- Convergence/divergence patterns
- Combined context narrative via AI

### Airport Detail View

Dedicated airport panel when clicking an airport marker:
- Live pressure score with component breakdown
- Current weather (METAR)
- Active runway estimation from traffic flow
- Inbound/outbound flight lists
- Historical pressure chart (last 24 hours)
- Baseline comparison (current vs. typical for this hour)
- Active events at this airport

### Corridor Detail View

Click a corridor on the map to open a dedicated panel:
- Real-time flight list within the corridor
- Health score timeline chart
- Predictability trend graph
- Spacing distribution histogram
- Recent events along this corridor
- Comparison to historical averages

### Enhanced Replay System

Improvements to the existing replay feature:
- Corridor health state replay (see how corridors changed over time)
- Pressure score replay (watch airport congestion build and release)
- Event timeline overlay during replay
- Speed presets (1x, 2x, 5x, 10x, 30x)
- Jump to specific event timestamps

---

## Suggested Features

Ideas that would significantly enhance the platform but require additional data sources, infrastructure, or research.

### ADS-B Feed Integration

Replace or supplement OpenSky with direct ADS-B receiver data:
- Lower latency (sub-second vs. 15s OpenSky polling)
- No rate limits or quota restrictions
- Higher position accuracy
- Support for MLAT-only aircraft
- Could use services like ADSBexchange, ADS-B Hub, or a local RTL-SDR receiver

### Flight Plan / Route Awareness

Integrate flight plan data (e.g., from FlightAware, Eurocontrol, or simulated):
- Know the filed route, not just current position
- Compare actual vs. planned route in real-time
- Predict future positions along the route
- More accurate ETA calculations
- Better diversion detection (comparing to filed plan rather than inferred route)

### NOTAM & TFR Overlay

Display Notices to Airmen and Temporary Flight Restrictions on the map:
- Active restricted airspace polygons
- Airport closures and limitations
- Military exercise areas
- VIP movement restrictions
- Correlate with observed flight deviations

### Weather Radar Overlay

Layer weather radar data on the map:
- Precipitation intensity (rain/snow/thunderstorms)
- Turbulence indicators
- Wind shear zones
- Icing conditions
- Correlate weather with flight deviations, holding patterns, and delays

### Predictive Delay Model

Machine learning model trained on historical data to predict:
- Airport delay probability for the next 1-6 hours
- Expected delay duration by airline and route
- Cascade risk (probability that delays at one airport will spread)
- Confidence intervals and contributing factors

### Conflict Detection & Resolution Advisory

Real-time TCAS-like analysis:
- Identify all aircraft pairs within configurable distance thresholds
- Classify: no conflict / traffic advisory / resolution advisory
- Project future trajectories (30s, 60s, 120s lookahead)
- Suggest optimal avoidance maneuvers
- Historical near-miss logging and heat mapping

### Fleet Tracking Mode

Monitor specific airline fleets:
- Dashboard showing all aircraft for a selected airline
- Fleet utilization metrics (% airborne, avg daily flights, turnaround efficiency)
- Route network visualization
- On-time performance scoring
- Aircraft-specific history and utilization patterns

### Noise & Environmental Monitor

Track aviation environmental impact:
- Estimated noise contours around airports based on traffic volume and aircraft types
- CO2 emission estimates per flight (using aircraft type fuel burn rates)
- Contrail formation likelihood based on altitude, temperature, and humidity
- Comparative efficiency scoring (direct distance vs. actual distance flown)

### Collaborative Workspace

Multi-user features:
- Shared map sessions (real-time cursor sharing)
- Annotation tools (draw on map, pin notes to locations)
- Alert subscriptions (email/push when specific events occur)
- Custom corridor definitions (user-defined monitoring zones)
- Saved views and filter presets

### Mobile Companion App

Lightweight mobile interface:
- Push notifications for tracked flights and events
- Watchlist management (track specific flights, airports, corridors)
- Quick-glance airport status cards
- Offline-capable with cached recent data

### Voice Interface

Natural language voice commands:
- "Show me flights near Mumbai above 30,000 feet"
- "What's the pressure at Delhi right now?"
- "Track Air India 101"
- "Zoom to the Delhi-Dubai corridor"
- Spoken flight narrations and event announcements

### Historical Analytics Dashboard

Deep-dive into historical data:
- Airport performance trends (daily/weekly/monthly)
- Corridor utilization patterns
- Seasonal traffic analysis
- Year-over-year comparisons
- Exportable reports (CSV, PDF)
- Custom date range queries

### Integration Hub

Connect with external aviation systems:
- Slack/Discord webhooks for event notifications
- REST API for third-party consumers
- Grafana dashboard integration via metrics export
- ACARS message correlation (if data source available)
- Airport CDM (Collaborative Decision Making) data feeds

---

## Architecture Overview

```
                         Browser (Next.js Client)
                    +---------------------------------+
                    |  FlightMap (Leaflet / Globe)     |
                    |  LeftSidebar (Search, Tools)     |
                    |  IntelligencePanel (Events,      |
                    |    Pressure, Corridors)          |
                    |  FlightSidebar (Detail View)     |
                    +-----------+---------------------+
                                |
                    REST APIs + SSE Stream
                                |
                    +-----------v---------------------+
                    |       Next.js API Routes         |
                    |  /api/flights  /api/search       |
                    |  /api/events   /api/pressure     |
                    |  /api/weather  /api/corridors    |
                    |  /api/narrate  /api/baselines    |
                    |  /api/photo    /api/corridors/   |
                    |                 predictability   |
                    +-----------+---------------------+
                                |
                    +-----------v---------------------+
                    |           Redis                  |
                    |  Real-time cache + Pub/Sub       |
                    |  (flights, pressure, corridors,  |
                    |   events, worker heartbeat)      |
                    +-----------+---------------------+
                                |
                    +-----------v---------------------+
                    |     Background Worker            |
                    |  7 Processors @ 15s tick:        |
                    |  History | Pressure | Turnaround |
                    |  Baseline | Events | Corridor    |
                    |  Health | Predictability         |
                    +-----------+---------------------+
                                |
              +-----------------+------------------+
              |                                    |
    +---------v---------+            +-------------v-------+
    |   OpenSky Network |            |     Supabase        |
    |   (Flight Data)   |            |   (PostgreSQL)      |
    +-------------------+            |  History, Baselines, |
                                     |  Events, Pressure,  |
                                     |  Corridors          |
                                     +---------------------+
```

---

## External Services

| Service | Purpose | Auth |
|---------|---------|------|
| **OpenSky Network** | Real-time flight state vectors | OAuth2 (2 accounts: frontend + worker) |
| **NOAA Aviation Weather** | METAR weather reports | Public (no auth) |
| **planespotters.net** | Aircraft photography | Public API |
| **OpenRouter (Gemini)** | AI search parsing + flight narration | API key |
| **Supabase** | Historical data storage | Service role key |
| **Redis** | Real-time caching + pub/sub | Local instance |

---

*Last updated: March 2026*
