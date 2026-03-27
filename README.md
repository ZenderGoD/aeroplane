<p align="center">
  <img src="https://img.shields.io/badge/Next.js-16-black?style=flat-square&logo=next.js" />
  <img src="https://img.shields.io/badge/TypeScript-5-blue?style=flat-square&logo=typescript" />
  <img src="https://img.shields.io/badge/Leaflet-Maps-green?style=flat-square&logo=leaflet" />
  <img src="https://img.shields.io/badge/License-Apache_2.0-orange?style=flat-square" />
</p>

# AeroIntel — Aviation Intelligence Platform

Real-time flight tracking, AI-powered analytics, and operational intelligence. Track every aircraft in the sky with live ADS-B data, layered with real weather, turbulence reports, wind data, terrain, and airport information.

> **Live Demo**: Launch the platform at `/` or visit the landing page at `/landing`

---

## Features

### Core Tracking
- **Live Flight Map** — Real-time aircraft positions on a dark-themed Leaflet map with altitude-colored icons, trail history, and heading prediction
- **Airport Radar** — Airport-centric radar display with range rings (5–150 NM), bearing lines, and approach monitoring
- **FIDS Board** — Flight Information Display System showing real-time arrivals and departures
- **Fleet Tracker** — Monitor entire airline fleets (95+ airlines) with split-view list + map
- **Aircraft Profile** — Detailed lookup by registration, hex, or callsign with type database and performance specs

### Analytics & Intelligence
- **Statistics Dashboard** — KPI cards, altitude/speed distributions, aircraft type breakdown, data quality metrics
- **Multi-Aircraft Comparison** — Side-by-side analysis of 2–4 aircraft with SVG altitude/speed charts
- **AI Copilot** — Natural language flight search powered by OpenAI
- **GPS Integrity** — ADS-B signal quality analysis and spoofing detection

### Real-Time Data Layers
| Layer | Source | Description |
|-------|--------|-------------|
| **METAR Weather** | aviationweather.gov | Airport weather reports, flight category coloring (VFR/IFR), wind barbs |
| **PIREPs** | aviationweather.gov | Real pilot reports of turbulence and icing with severity markers |
| **Wind Aloft** | NOAA | Wind vectors at FL030–FL390, jet stream visualization |
| **Terrain** | Esri / OpenTopoMap | Relief, topographic, and satellite tile overlays with click-to-query elevation |
| **Airport Runways** | Static (68 airports) | Runway layouts with threshold labels, visible at high zoom |
| **Route Density** | Computed | Traffic density heatmap from live flight history data |

### Alerts & Monitoring
- **Alert System** — 6 alert types (aircraft spotted, airspace entry, altitude, squawk, military, ground stop) with browser notifications
- **Live Activity Feed** — Real-time event ticker (departures, landings, emergencies, military activity)
- **Emergency Squawk Detection** — Pulsing visual indicators for 7700/7600/7500 squawk codes
- **Military Aircraft Glow** — Amber glow highlighting for military aircraft

### Overlays & Tools
- **Airspace Boundaries** — FIR, TMA, restricted zones, MOAs, danger zones (70+ regions)
- **NOTAM/TFR Overlay** — 40+ realistic NOTAMs with severity coloring and filter panel
- **Corridor Health** — Air corridor monitoring with predictability scoring
- **Measure Tool** — Click-to-measure distance between any two points
- **Flight Distance** — Measure separation between two aircraft

### Export & Integration
- **Export & Reports** — CSV/JSON snapshot export, filtered export, HTML report generation
- **Embeddable Widget** — Drop a live tracker on any website via iframe at `/embed`
- **API Portal** — Interactive endpoint documentation, playground, and code examples
- **Saved Views & Watchlists** — Persist custom map views and track specific aircraft

### Platform
- **Dark/Light Theme** — Toggle with system preference detection and localStorage persistence
- **MapHUD** — Floating stats overlay showing tracking count, data freshness, quick metrics
- **Zoom-Adaptive Rendering** — Icons scale with zoom, callsign labels appear at high zoom
- **Altitude-Colored Trails** — Green/cyan/blue/purple trail rendering by flight level
- **Landing Page** — Full marketing page with bento grid features, data section, comparison table, pricing, and testimonials

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript 5 |
| Maps | Leaflet (imperative) + react-leaflet |
| Canvas | HTML5 Canvas for aircraft rendering |
| 3D | Three.js (Globe view) |
| Styling | Tailwind CSS + CSS custom properties |
| Icons | lucide-react |
| Data | airplanes.live API, aviationweather.gov, NOAA |
| AI | OpenAI (optional, for copilot/search) |

---

## Getting Started

### Prerequisites
- Node.js 18+
- npm or pnpm

### Installation

```bash
git clone https://github.com/ZenderGoD/aeroplane.git
cd aeroplane
npm install
```

### Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) for the flight tracker, or [http://localhost:3000/landing](http://localhost:3000/landing) for the landing page.

### Production Build

```bash
npm run build
npm start
```

### Environment Variables (Optional)

```env
# For AI Copilot features
OPENAI_API_KEY=sk-...

# For database features (Supabase)
NEXT_PUBLIC_SUPABASE_URL=https://...
SUPABASE_SERVICE_ROLE_KEY=...

# For caching (Redis)
REDIS_URL=redis://...
```

> The platform works fully without any environment variables — all core tracking, data layers, and features use free public APIs.

---

## Project Structure

```
src/
├── app/
│   ├── page.tsx              # Main flight tracker (view mode router)
│   ├── landing/              # Marketing landing page
│   ├── airport/              # Standalone airport radar
│   ├── embed/                # Embeddable widget
│   └── api/                  # API routes (flights, fleet, metar, pireps, winds, etc.)
├── components/
│   ├── MapContent.tsx        # Leaflet map with all overlay layers
│   ├── CanvasPlaneLayer.tsx  # High-performance canvas aircraft renderer
│   ├── LeftSidebar.tsx       # Main navigation + tools + data layer toggles
│   ├── FlightSidebar.tsx     # Selected flight details panel
│   ├── *Mode.tsx             # Full-screen view mode components
│   ├── *Overlay.tsx          # Map overlay components (METAR, runways, etc.)
│   └── landing/              # Landing page client components
├── data/                     # Static data (airlines, airspaces, runways, NOTAMs)
├── lib/                      # Utilities (API parsers, algorithms, DB clients)
├── hooks/                    # Custom React hooks
├── types/                    # TypeScript type definitions
└── styles/                   # Light theme CSS overrides
```

---

## API Routes

| Endpoint | Description |
|----------|-------------|
| `GET /api/flights` | Live aircraft in a region (proxies airplanes.live) |
| `GET /api/fleet?airline=AAL` | All aircraft for an airline |
| `GET /api/aircraft/[id]` | Lookup by hex, registration, or callsign |
| `GET /api/metar?icao=KJFK` | Real METAR weather data |
| `GET /api/pireps` | Real pilot reports (turbulence/icing) |
| `GET /api/winds` | Wind aloft data from NOAA |
| `GET /api/corridors` | Air corridor health data |
| `GET /api/weather` | Weather radar tiles |

---

## View Modes

The platform uses a view mode system — all features are accessible from the LeftSidebar without route changes:

| Mode | Component | Description |
|------|-----------|-------------|
| Normal | FlightMap | Default flight tracking map |
| Heatmap | FlightMap | Aircraft density heatmap |
| Trails | FlightMap | Extended flight trails |
| Globe | GlobeView | 3D globe visualization |
| Airport | AirportRadarMode | Airport radar display |
| FIDS | AirportBoardMode | Flight information display |
| Fleet | FleetTrackerMode | Airline fleet tracking |
| Aircraft | AircraftProfileMode | Aircraft lookup & profile |
| Stats | StatsDashboardMode | Traffic statistics |
| Compare | ComparisonMode | Multi-aircraft comparison |
| Alerts | AlertSystemMode | Custom alert management |
| Turbulence | TurbulenceMode | Turbulence detection map |
| Embed | EmbedGeneratorMode | Widget code generator |
| API | ApiPortalMode | API documentation portal |
| Export | ExportReportsMode | Data export & reports |

---

## Data Layer Toggles

Toggle real-time data overlays from the "Data Layers" section in the LeftSidebar:

- **METAR** — Airport weather with flight category coloring and wind barbs
- **Runways** — Airport runway layouts (68 airports, zoom ≥ 10)
- **Density** — Route density heatmap computed from flight history
- **Winds** — Wind aloft vectors with jet stream visualization
- **Terrain** — Relief/topo/satellite tile overlays
- **PIREPs** — Real pilot turbulence & icing reports

---

## License

This project is licensed under the Apache License 2.0 — see the [LICENSE](LICENSE) file for details.

---

## Acknowledgments

- [airplanes.live](https://airplanes.live) — Real-time ADS-B flight data
- [aviationweather.gov](https://aviationweather.gov) — METAR, PIREP, and wind aloft data
- [NOAA](https://www.noaa.gov) — Atmospheric and weather data
- [Leaflet](https://leafletjs.com) — Open-source mapping library
- [CARTO](https://carto.com) — Dark map tiles
- [Esri](https://www.esri.com) — Terrain and satellite imagery tiles
- [OurAirports](https://ourairports.com) — Airport and runway data
