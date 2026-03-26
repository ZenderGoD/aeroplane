# AeroIntel Competitive Research & Feature Roadmap

> Comprehensive analysis of 8 aviation tracking/intelligence platforms with actionable recommendations for AeroIntel differentiation.
>
> Research date: March 2026

---

## Platform-by-Platform Analysis

### 1. Flightradar24 (FR24)

**Scale:** 58,000+ receivers, 200,000+ flights/day, 4M+ daily users, 1.2M aircraft database

**Unique differentiators we lack:**
- **3D Cockpit View** -- Follow any flight from the pilot's perspective with terrain rendering (CesiumJS-powered). Users can orbit the aircraft model, zoom, and pan freely.
- **Aeronautical Charts Overlay** -- IFR enroute charts, approach plates, and VFR sectionals layered on the live map.
- **Squawk Code Filtering** -- Isolate aircraft by specific squawk codes (not just emergency ones). Useful for spotting military ops, VFR traffic, etc.
- **Airport Statistics Dashboard** -- Per-airport delay percentages, on-time rates, busiest hours, seasonal patterns, with historical depth (up to 365 days for Gold).
- **Satellite-Based Tracking** -- Fills gaps over oceans and remote areas where no ADS-B ground stations exist (partnership with Aireon).
- **Aircraft Age & Serial Number Database** -- Full manufacturing lineage: MSN, line number, first flight date, delivery date, current operator history.
- **Extended Playback History** -- Up to 365 days of individual flight playback with time scrubbing. AeroIntel replay is limited to what the worker has archived.
- **Live Weather Layers** -- Multiple weather overlays: precipitation, cloud cover, wind speed/direction, temperature at altitude, turbulence areas.
- **Aircraft Type Filtering** -- Filter map to show only specific aircraft types (e.g., only A380s, only 737 MAX, only military).

### 2. FlightAware

**Scale:** 40,000+ ADS-B ground stations in 196 countries, acquired by Collins Aerospace (RTX)

**Unique differentiators we lack:**
- **MiseryMap** -- Heat-map-style visualization of US airport delays/cancellations. 17 hub airports shown with green/red pie charts indicating real-time disruption severity. Extremely intuitive at-a-glance tool.
- **Foresight Predictive ETAs** -- ML-powered (neural networks) predictions of landing time, gate arrival, and taxi-out duration. Trained on 3+ petabytes of historical data. Predicts delays hours in advance with high accuracy.
- **Surface Tracking** -- Tracks aircraft movement on the ground (taxiways, gates). Their airport integrated mapping shows surface AND airborne aircraft.
- **GlobalBeacon (GADSS Compliance)** -- Full ICAO Global Aeronautical Distress and Safety System tracking for airlines. 1-minute position reporting.
- **FBO Toolbox** -- Fixed Base Operator dashboard for business aviation: upcoming arrivals, fuel orders, handling requests.
- **FlightAware TV** -- Dedicated full-screen display mode for FBOs, airport lounges, operations centers.
- **Delay Cause Attribution** -- Breaks down delays by cause: weather, NAS (National Airspace System), carrier, late aircraft, security.
- **Airport Activity Board** -- Comprehensive en-route, scheduled, arrived, departed, cancelled tabs with gate information.
- **Flight Plan Data Integration** -- Access to filed flight plans (route, altitude, speed), enabling actual-vs-planned comparison.
- **Alert System** -- Configurable push/email alerts: flight departure, arrival, diversion, delay, cancellation, gate change.

### 3. Planefinder

**Unique differentiators we lack:**
- **Augmented Reality (AR) Mode** -- Point phone camera at sky, overlay real-time flight data on visible aircraft. Instant identification.
- **Delay Insights (Predictive)** -- Tracks where an aircraft has been and where it is heading to predict delays before the airline announces them. Uses aircraft rotation history.
- **3D Aircraft Models** -- Specific 3D models for individual aircraft types (not generic icons). Spitfire, Hawk, B777, PA-28, PC12, etc.
- **Terminal Information** -- Airport terminal details: terminal assignment, gate areas, connection times.

### 4. ADS-B Exchange

**Unique differentiators we lack:**
- **Unfiltered / Uncensored Data** -- Shows ALL aircraft including military, government, VIP, and FAA LADD-blocked aircraft that other platforms hide.
- **LADD Filter Toggle** -- Users can specifically filter to see only LADD-listed (blocked) aircraft.
- **Open Source Stack** -- mlat-client, mlat-server, feeder software all open source. Community can audit and contribute.
- **Feeder Leaderboard** -- Gamification: public rankings by data volume, uptime, and coverage impact. Drives community engagement.
- **Raw Data Access** -- Unprocessed ADS-B messages available for researchers and developers. No data sanitization.
- **Wildfire/SAR Correlation** -- Specific use cases for search-and-rescue and wildfire remediation aircraft tracking.

### 5. RadarBox (AirNav)

**Unique differentiators we lack:**
- **ATC Radar Mode** -- Map display that mirrors actual Air Traffic Control radar screens. Professional format showing speed vectors, altitude labels, conflict zones.
- **Live Airport Cameras** -- Real-time webcam feeds from airports worldwide embedded directly in the platform.
- **Airband Radio Integration** -- Live ATC audio from 21 countries and 40+ airports, synced with the flight map.
- **Runway-in-Use Feature** -- Shows which runways are currently active for arrivals/departures at each airport, with configuration changes.
- **Route Heatmaps** -- Historical density visualization showing the most-flown paths between airport pairs.
- **Flight Embedding** -- Embeddable flight tracking widgets for external websites.

### 6. Cirium (Enterprise)

**Scale:** 300+ TB data, 2,000+ curated sources, 99%+ commercial flight coverage

**Unique differentiators we lack:**
- **CO2 Emissions per Flight** -- EmeraldSky engine: up to 99% accuracy vs actual. Factors: actual flight time, aircraft type/age, engine type, passenger load, cargo load, taxi time. Not generic distance-based estimates.
- **Fleet Analytics & Valuation** -- Aircraft market values, lease rates, maintenance cost tracking, 1,600+ lines of transaction data annually, 500K+ asset valuations per year.
- **Schedule Intelligence** -- Forward-looking schedule data: planned frequencies, capacity changes, new routes, codeshare arrangements.
- **Traffic & Fare Analytics** -- Passenger booking data, fare analysis across carriers/routes/channels, load factor estimates.
- **NOTAM Integration** -- NOTAMs as a structured data feed, not just raw text.
- **Advance Booking Analysis** -- Forward demand signals: how far in advance passengers are booking, by route and class.
- **Cirium Sky (Snowflake/AWS Integration)** -- Data warehouse delivery for enterprise analytics. Customers query Cirium data with their own BI tools.
- **On-Time Performance Rankings** -- Rigorous monthly airline and airport OTP rankings with methodology transparency (basis for industry awards).

### 7. OAG

**Unique differentiators we lack:**
- **Connectivity Scoring** -- Measures how well-connected an airport is: direct destinations, one-stop connections, minimum connection times, hub effectiveness.
- **Capacity Analytics** -- Seat capacity by route, airline, aircraft type, with historical trends and forward schedules.
- **Passenger Flow Modeling** -- O&D (Origin & Destination) traffic flows across markets. Shows where passengers actually travel, not just flight legs.
- **Fare Intelligence** -- Real-time and historical airfare data across carriers and distribution channels.
- **Schedule Change Detection** -- Automated monitoring of airline schedule changes: new routes, frequency changes, cancellations, gauge changes.
- **Megahubs Index** -- Proprietary ranking of airports by connectivity, considering flight frequency and minimum connection times.
- **Historical Schedules (since 1996)** -- 30 years of schedule data for long-term trend analysis.

### 8. Eurocontrol Tools

**Unique differentiators we lack:**
- **Demand-Capacity Balancing** -- Real-time visualization of sector demand vs. ATC capacity with ATFM regulation overlays.
- **Slot Allocation Visibility (CASA)** -- Computer-Assisted Slot Allocation: shows which flights have ATFM slots, delay attribution, and regulation causes.
- **Sector Load Visualization** -- ATC sector boundaries with real-time traffic load coloring (under-loaded, optimal, overloaded).
- **Strategic Traffic Forecasting** -- 18 months to 7 days out: predicted traffic demand by sector, airport, and time period.
- **IMPACT Noise/Emissions Modeling** -- Integrated trade-off analysis between fuel burn, emissions, and noise impact per trajectory.
- **Flight Plan Validation** -- Route validation against airspace structure, restrictions, and availability.
- **Airspace Management (ASM) Visualization** -- Dynamic airspace configurations, military area activations, conditional routes.
- **Network Effect Analysis** -- How a disruption at one airport propagates through the European network (reactionary delay chains).

---

## A. Data & Information We Could Showcase

### Tier 1: High Impact, Achievable with Current/Near-term Data Sources

| Data Point | Source | Implementation Effort |
|-----------|--------|----------------------|
| **Aircraft age & manufacturing details** | Open databases (OpenSky metadata, planespotters API, mictronics DB) | Low -- enrich existing ICAO24 lookups |
| **Operator change history** | Aircraft registration databases | Low-Medium |
| **CO2 emission estimates per flight** | Calculate from aircraft type + distance + flight time using ICAO emission factors | Medium -- need fuel burn coefficients per type |
| **Active runway detection** | Derive from arrival/departure heading clusters at tracked airports | Medium -- already have approach data |
| **Airport delay statistics** | Compute from baseline deviations already being tracked | Low -- data exists, needs UI |
| **Flight route efficiency score** | Great-circle distance vs actual distance flown (ratio) | Low -- already have route deviation code |
| **Vertical profile efficiency** | Continuous Descent Approach detection vs step-down approaches | Medium |
| **Airborne time vs block time** | Derive from first/last position updates per flight | Low-Medium |
| **Fleet utilization metrics** | Turnaround data already being collected by worker | Low -- data exists, needs UI |
| **Approach type classification** | ILS, visual, RNAV -- infer from approach geometry and weather | Medium |

### Tier 2: High Value, Requires New Data Sources

| Data Point | Source | Implementation Effort |
|-----------|--------|----------------------|
| **Filed flight plan routes** | FlightAware AeroAPI, Eurocontrol B2B, or aviationstack | High -- paid API integration |
| **Passenger load estimates** | Cirium, OAG, or historical booking data | High -- enterprise data partnership |
| **NOTAM/TFR data** | FAA NOTAM API, ICAO API, Eurocontrol | Medium -- free APIs exist |
| **Gate/terminal assignments** | Airport FIDS APIs or FlightAware | Medium-High |
| **Fare/pricing data** | OAG, Google Flights scraping, Amadeus API | High |
| **ATC audio feeds** | LiveATC.net API or direct streaming | Medium |
| **Airport webcam feeds** | Airport APIs, public webcam aggregators | Medium |
| **Satellite-based position data** | Aireon (via FR24/FlightAware), Spire Global | High -- commercial partnership |

### Tier 3: Derived Intelligence (Unique to AeroIntel)

| Intelligence Product | Inputs | Differentiation |
|---------------------|--------|-----------------|
| **Airport Operational Rhythm** | Baseline data + pressure + time-of-day patterns | Show when airports transition between configs, peak/valley cycles |
| **Delay Cascade Prediction** | Current delays + network connectivity + aircraft rotation | Predict which downstream flights will be affected |
| **Corridor Efficiency Ranking** | Corridor health + deviation data + fuel waste estimates | Rank corridors by operational efficiency, flag degrading ones |
| **Airline Punctuality Index** | Per-airline delay patterns from tracked flights | Real-time OTP scoring, not monthly retrospective |
| **Weather Impact Score** | METAR conditions mapped to historical delay correlation | Quantify how much current weather is affecting operations |
| **Airspace Complexity Score** | Traffic density + altitude layer mixing + heading diversity in a sector | Novel metric not available on any competitor |

---

## B. Feature Ideas (Prioritized by Impact)

### Priority 1: HIGH IMPACT, MODERATE EFFORT (Build Next)

#### B1. MiseryMap-Style Airport Status Dashboard
**Inspiration:** FlightAware MiseryMap
**What:** Full-screen view showing all tracked airports as circles with green/yellow/red fill based on real-time delay and cancellation ratios. Pie-chart breakdown per airport. Click to drill into airport detail.
**Why it matters:** The MiseryMap is FlightAware's most viral feature. It turns complex operational data into an instantly readable consumer product. We already have pressure scores -- this is primarily a visualization exercise.
**Implementation:** New route `/airport-status`. Use existing pressure scores + baseline deviation data. Render as SVG circles on a simplified map. Add cancellation/delay counting from event data.
**Effort:** 2-3 days

#### B2. Predictive Delay Engine
**Inspiration:** FlightAware Foresight
**What:** For each tracked flight, predict: estimated arrival time, delay probability (0-100%), delay cause, and confidence interval. Display as a badge on the flight card and in the sidebar.
**Why it matters:** This is the single highest-value feature in commercial aviation intelligence. Airlines pay significant money for Foresight. Even a simpler version based on our existing data would be a major differentiator for a free platform.
**Implementation:** Train a lightweight model on: current airport pressure at origin/destination, weather conditions (METAR categories), time of day, historical baseline deviation, aircraft type, corridor health along route. Start with a gradient-boosted decision tree, upgrade to neural network later.
**Effort:** 1-2 weeks for v1

#### B3. ATC Radar Mode
**Inspiration:** RadarBox Radar Mode
**What:** Toggle the map into a dark-background "radar" display matching ATC conventions: aircraft shown as blips with data blocks (callsign, altitude in FL, ground speed, heading), speed vectors (lines showing projected position), history dots (last N positions as fading dots).
**Why it matters:** Appeals to aviation professionals and serious enthusiasts. No free platform offers this. Creates a "professional tool" perception that elevates the entire platform.
**Implementation:** New canvas rendering mode. Replace aircraft icons with radar blips. Add data block labels. Draw speed vector lines. Render history dots from position cache.
**Effort:** 3-5 days

#### B4. Network Disruption Propagation Visualizer
**Inspiration:** Eurocontrol reactionary delay analysis
**What:** When a disruption event occurs (ground stop, weather, holding surge), visualize how it cascades through the network. Animated ripple effect showing: which flights are directly delayed, which connecting flights are impacted, which downstream airports will feel the effect, estimated time for the disruption to propagate.
**Why it matters:** No consumer-facing platform shows this. Enterprise tools (Cirium, Eurocontrol) do it behind closed doors. This would be a genuine first-of-its-kind feature for a public platform.
**Implementation:** Use aircraft rotation data (turnaround tracker) to build a dependency graph. When a delay event fires, trace forward through the graph. Animate the propagation on the map as expanding rings from the source airport.
**Effort:** 1-2 weeks

#### B5. CO2 Emissions Dashboard
**Inspiration:** Cirium EmeraldSky, OAG Emissions Data
**What:** Per-flight CO2 estimate shown in the flight sidebar. Aggregate views: emissions by airline, by route, by aircraft type. Efficiency comparison (CO2 per passenger-km estimated from aircraft capacity). "Greenest flight" badges.
**Why it matters:** ESG reporting is now mandatory for many organizations. Environmental awareness among consumers is growing. No free flight tracker provides per-flight emissions with reasonable accuracy.
**Implementation:** Build an emissions model using ICAO fuel burn factors by aircraft type. Inputs: aircraft type (from ICAO24 metadata), actual flight time (from position data), distance (great circle + deviation), estimated load factor (use industry averages by route type). Start with ICAO Carbon Emissions Calculator methodology.
**Effort:** 1 week

### Priority 2: HIGH IMPACT, HIGHER EFFORT (Build After Priority 1)

#### B6. Airband Radio Integration
**Inspiration:** RadarBox
**What:** Embed live ATC audio streams for airports where feeds are available (LiveATC.net). Sync audio with the map -- when you click an airport, hear its tower/approach frequency. Show a waveform visualization. Highlight aircraft on frequency.
**Effort:** 1-2 weeks

#### B7. Airport AR/Camera Integration
**Inspiration:** Planefinder AR, RadarBox Airport Cameras
**What:** On mobile, use the camera to overlay flight data on visible aircraft (WebXR). On desktop, embed airport webcam feeds in the airport detail panel.
**Effort:** 2-3 weeks for AR, 1 week for webcams

#### B8. Flight Plan Route Overlay
**Inspiration:** FlightAware, Eurocontrol
**What:** For flights where we can obtain filed route data, show the planned route as a dashed line alongside the actual track. Highlight deviations. Show waypoints along the route.
**Effort:** 2 weeks (depends on data source acquisition)

#### B9. Sector Load Visualization
**Inspiration:** Eurocontrol NOP
**What:** Overlay ATC sector boundaries on the map with color-coded traffic load. Show sector capacity vs current demand. Highlight overloaded sectors.
**Effort:** 2-3 weeks (need sector boundary data)

#### B10. Airline Fleet Dashboard
**Inspiration:** Cirium Fleet Analytics, Flightradar24
**What:** Select an airline to see: all active aircraft on map, fleet composition (types, ages, configurations), utilization rates, current network visualization (all active routes as arcs), OTP score, average delay.
**Effort:** 1-2 weeks

### Priority 3: DIFFERENTIATION FEATURES (Unique to AeroIntel)

#### B11. "Airspace Complexity Index" (Novel)
**What:** Real-time computation of airspace complexity per geographic cell: number of aircraft, altitude layer mixing, heading diversity (crossing traffic), speed variance, rate of change. Visualized as a grid overlay with color intensity. No competitor offers this.
**Why novel:** This is a research-grade metric currently only computed internally by ANSPs. Making it publicly visible would attract ATC researchers and aviation safety analysts.

#### B12. "Predictability Weather" (Novel)
**What:** Instead of showing actual weather, show a "predictability forecast" -- for each airport, how predictable will operations be over the next 6 hours? Combines weather forecast + historical correlation + day-of-week patterns + known events. Novel framing that no competitor offers.

#### B13. "Flight DNA" Fingerprint (Novel)
**What:** Generate a unique visual fingerprint for each flight based on its telemetry signature: altitude profile shape, speed curve, deviation pattern, approach geometry. Compare flights on the same route to spot outliers. Show as a small visual glyph in the flight list.

#### B14. "Ghost Flights" Overlay (Novel)
**What:** Show the historical average path for a route as a semi-transparent "ghost" aircraft moving along it. The real flight is overlaid on top. Users can instantly see how the current flight compares to the typical routing, altitude, and timing.

---

## C. Data Manipulation & Analysis Ideas

### C1. Machine Learning Models

| Model | Training Data | Output | Business Value |
|-------|--------------|--------|----------------|
| **Delay Prediction (Regression)** | Historical delays, weather, pressure, time-of-day, airline, aircraft type | Delay probability + expected minutes | Core intelligence product |
| **Disruption Cascade (Graph Neural Network)** | Aircraft rotation graphs, delay propagation history | Affected flight list + timeline | Unique analytical capability |
| **Anomaly Classification (Transformer)** | Labeled anomaly events, telemetry sequences | Anomaly type + confidence + root cause | Improves existing anomaly detection accuracy |
| **Demand Forecasting (LSTM)** | Hourly flight counts by airport, weather, calendar | Next 6-hour demand by airport | Enables proactive capacity alerts |
| **Go-Around Prediction** | Approach telemetry, weather, runway config | Go-around probability during approach | Safety-relevant, novel |
| **Taxi Time Prediction** | Airport layout, traffic volume, weather, time-of-day | Expected taxi duration | Improves block time estimates |

### C2. Network Analysis

| Analysis | Method | Insight |
|----------|--------|---------|
| **Airport Centrality Scoring** | PageRank on the flight network graph | Identify systemically important airports (a disruption here affects the most flights) |
| **Community Detection** | Louvain algorithm on route network | Discover natural airline/airport clusters and alliance patterns |
| **Resilience Analysis** | Simulate node/edge removal on the network | Which airport closure would cause the most disruption? |
| **Minimum Spanning Tree** | Weighted by frequency on route network | Show the "backbone" of the aviation network |
| **Shortest Path Analysis** | Dijkstra on the route graph weighted by travel time | Find optimal multi-hop connections |
| **Betweenness Centrality** | Standard graph metric | Identify bottleneck airports/corridors in the network |

### C3. Time-Series Analytics

| Analysis | Input | Output |
|----------|-------|--------|
| **Seasonality Decomposition** | Daily flight counts per route/airport | Seasonal patterns, trend, and residuals for anomaly detection |
| **Change Point Detection** | Airport pressure time series | Detect when an airport's operational pattern fundamentally shifts |
| **Granger Causality** | Delays at airport pairs | Prove which airports' delays cause delays at other airports |
| **Spectral Analysis** | Corridor traffic flow | Identify periodic congestion patterns (e.g., every 45 min at peak) |
| **Survival Analysis** | Time-to-delay from various initial conditions | Probability curves for how long until a delay occurs given current state |

### C4. Spatial Analytics

| Analysis | Method | Output |
|----------|--------|--------|
| **Traffic Density Grid** | Kernel density estimation on aircraft positions | High-resolution traffic density map (better than simple heatmap) |
| **Conflict Hotspot Detection** | DBSCAN clustering on near-miss events | Map of where aircraft come closest to each other |
| **Route Clustering** | DTW (Dynamic Time Warping) on flight trajectories | Group flights that follow similar paths, identify SIDs/STARs in use |
| **Airspace Utilization Efficiency** | Available airspace volume vs utilized volume | Percentage of airspace being used, identify wasted capacity |
| **Wake Turbulence Modeling** | Aircraft type + position + wind data | Estimate wake vortex locations and decay, show hazard zones |

### C5. Composite Indices (AeroIntel Originals)

| Index | Components | Scale | Update Frequency |
|-------|-----------|-------|------------------|
| **AeroIntel Airport Health Score** | Pressure (30%) + OTP (25%) + Weather Impact (20%) + Delay Cascade Risk (15%) + Baseline Deviation (10%) | 0-100 | Every 60 seconds |
| **Route Reliability Index** | Corridor health (25%) + Historical OTP (25%) + Weather corridor forecast (20%) + Airline mix reliability (15%) + Time-of-day factor (15%) | 0-100 | Every 5 minutes |
| **Network Stress Index** | Weighted average of all airport health scores + active event count + corridor congestion ratio | 0-100 | Every 60 seconds |
| **Flight Risk Score** | Weather (25%) + Airport pressure at dest (20%) + Aircraft age (10%) + Airline OTP (15%) + Route reliability (15%) + Time-of-day (15%) | Low/Med/High/Critical | Per-flight, real-time |

---

## D. UI/UX Innovations

### D1. Visualization Patterns from Competitors

#### Split-Screen Comparison Mode
**Inspiration:** Financial trading platforms
**What:** Side-by-side view: left panel shows Airport A, right panel shows Airport B. Synced timeline. Compare pressure, traffic, weather, delays in real-time. Useful for hub-to-hub monitoring.

#### Radial Airport Diagram
**Inspiration:** Eurocontrol NOP
**What:** For each airport, show a radial diagram with: arrival/departure sectors as wedges, active runways as lines, traffic flow as animated dots, pressure as center color. More information-dense than a simple score.

#### Sankey Flow Diagram
**Inspiration:** OAG traffic flow analysis
**What:** Visualize passenger/flight flows between airports as a Sankey diagram. Width proportional to traffic volume. Color by airline or delay status. Shows network structure at a glance.

#### Sparkline-Everywhere Pattern
**Inspiration:** Cirium Dashboard
**What:** Add inline sparklines to every metric: flight count trend, pressure trend, delay trend, speed trend, altitude trend. 24-hour micro-charts that show trajectory without requiring full dashboards.

#### Timeline Swimlane View
**Inspiration:** Eurocontrol ATFM tools
**What:** Horizontal timeline with swimlanes per airport/corridor. Events plotted as colored blocks on the timeline. Shows temporal relationships between disruptions across the network.

### D2. Interaction Ideas

#### "Time Machine" Slider
**Inspiration:** FR24 Playback, Google Earth historical imagery
**What:** A persistent time slider at the bottom of the screen. Drag it to go back in time (up to 24h or whatever history is available). The entire map state updates: aircraft positions, pressure scores, corridor health, weather. Forward position shows predictions.

#### Smart Hover Previews
**Inspiration:** GitHub hover cards, Bloomberg Terminal
**What:** Hovering over any aircraft shows a rich preview card: mini altitude chart (last 10 min), current speed/heading, origin-destination estimate, delay status, anomaly flags. No click required. 200ms delay to avoid flicker.

#### Command Palette
**Inspiration:** VS Code, Linear, Raycast
**What:** Press Cmd+K to open a fuzzy-search command palette. Type anything: "show heavy aircraft", "go to Mumbai", "filter Air India", "enable radar mode", "compare DEL vs BOM", "show emissions". Unifies search, filtering, navigation, and mode switching.

#### Contextual Quick Actions
**Inspiration:** Right-click context menus in desktop apps
**What:** Right-click an aircraft: "Track this flight", "Show fleet", "Measure distance from here", "Find similar flights", "Explain delays", "Set alert". Right-click an airport: "Show pressure", "View arrivals", "Compare with...", "Historical analysis".

#### Focus Mode
**Inspiration:** macOS Focus, Notion
**What:** Double-click an airport or corridor to enter "focus mode": map zooms to the area, non-relevant flights fade out, detail panels auto-open, relevant metrics are prominently displayed. Press Esc to exit. Removes information overload.

### D3. Dashboard Layout Ideas

#### Configurable Widget Grid
**Inspiration:** Grafana, iOS widgets
**What:** Instead of fixed panel layouts, let users arrange widgets on a grid: flight map (any size), pressure gauges, corridor health cards, stats charts, event feed, airport cameras. Save layouts as "workspaces" (e.g., "India Monitoring", "European Corridors", "Emergency Watch").

#### Dark Mode + "Night Ops" Theme
**Inspiration:** ATC radar screens, RadarBox Radar Mode
**What:** A true dark theme optimized for prolonged monitoring: dark navy background, amber/green data, reduced blue light. Aircraft as bright dots on dark terrain. Designed for operations center environments.

#### Ambient Data Mode
**Inspiration:** FlightAware TV, ambient displays
**What:** A "screensaver" mode showing the globe slowly rotating with aircraft moving in real-time. Key stats overlay in corners. No interaction needed. Designed for lobby displays, operations centers, or background monitoring.

### D4. Mobile-Specific UX

#### Gesture-Based Filtering
Pinch on altitude histogram to set altitude filter range. Swipe left on a flight card to dismiss/ignore. Long-press an aircraft to start tracking. Shake to reset all filters.

#### Glanceable Watch Complications
For smartwatch: show number of anomalies, current network stress index, or tracked flight ETA as a watch complication.

#### Notification-First Design
Push notifications as the primary interface for casual users: "3 flights holding at DEL", "BOM pressure critical", "Your tracked flight AI101 is 45 min delayed".

---

## Implementation Priority Matrix

```
                    HIGH IMPACT
                        |
    B4. Disruption      |  B1. MiseryMap
    Propagation         |  B2. Delay Prediction
    B11. Complexity     |  B3. Radar Mode
    Index               |  B5. Emissions
                        |  Command Palette (D2)
   ---------+-----------+----------+----------
            |           |          |
    B13. Flight DNA     |  B6. Airband Radio
    B14. Ghost Flights  |  B10. Fleet Dashboard
    B12. Predictability |  Time Machine Slider
    Weather             |  Smart Hover Previews
                        |
                    LOW IMPACT
```

**Recommended build order:**
1. B1 (MiseryMap) -- 2-3 days, uses existing data, highly viral
2. B3 (Radar Mode) -- 3-5 days, pure frontend, strong differentiation
3. Command Palette (D2) -- 2-3 days, dramatically improves UX
4. Smart Hover Previews (D2) -- 2-3 days, reduces clicks, feels polished
5. B5 (Emissions Dashboard) -- 1 week, trending topic, unique for free platform
6. B2 (Delay Prediction v1) -- 1-2 weeks, highest long-term value
7. B4 (Disruption Propagation) -- 1-2 weeks, genuine innovation
8. B10 (Fleet Dashboard) -- 1-2 weeks, popular enthusiast feature
9. B11 (Complexity Index) -- 1 week, research-grade novelty
10. B14 (Ghost Flights) -- 1 week, visually striking and intuitive

---

## Competitive Positioning Summary

| Platform | Primary Audience | AeroIntel's Advantage |
|----------|-----------------|----------------------|
| Flightradar24 | Enthusiasts, travelers | We have AI intelligence layer they completely lack |
| FlightAware | Airlines, business aviation | We are open/free with comparable analytics ambitions |
| Planefinder | Casual users, mobile | We have deeper analytical capabilities |
| ADS-B Exchange | OSINT researchers, military watchers | We provide structured intelligence, not just raw data |
| RadarBox | Enthusiasts, spotters | We have corridor/network-level analysis they lack |
| Cirium | Enterprise airlines, airports | We democratize aviation intelligence for free |
| OAG | Network planners, analysts | We offer real-time operational view vs their schedule focus |
| Eurocontrol | ANSPs, airlines (EU only) | We are global and consumer-accessible |

**AeroIntel's unique positioning:** The only platform that combines real-time flight tracking with AI-powered operational intelligence, anomaly detection, and network-level analysis -- accessible to everyone, not just enterprise customers.

---

## Sources

- [Flightradar24 Premium Features](https://www.flightradar24.com/premium/)
- [Flightradar24 3D View](https://www.flightradar24.com/blog/inside-flightradar24/exploring-the-new-flightradar24-3d-view/)
- [Flightradar24 Hidden Features](https://www.mightytravels.com/2024/07/7-hidden-features-of-flightradar24-for-aviation-enthusiasts/)
- [Flighty vs Flightradar24 Comparison 2026](https://flighty.com/compare/flightradar24)
- [FlightAware Year in Review 2025](https://blog.flightaware.com/flightaware-a-year-in-review-2025)
- [FlightAware Foresight Predictive Technology](https://www.flightaware.com/commercial/foresight/)
- [FlightAware Neural Networks](https://blog.flightaware.com/neural-networks)
- [FlightAware MiseryMap](https://www.flightaware.com/miserymap/)
- [RTX Collins Aerospace Foresight for JetBlue](https://www.rtx.com/news/news-center/2025/08/26/rtxs-collins-aerospace-providing-flightaware-foresight-predictive-technology-to)
- [Planefinder Commercial Services](https://planefinder.net/commercial-services)
- [Planefinder iOS App](https://apps.apple.com/us/app/plane-finder-flight-tracker/id361273585)
- [ADS-B Exchange](https://www.adsbexchange.com/)
- [ADS-B Exchange Open Source Software](https://www.adsbexchange.com/open-source-software/)
- [ADS-B Exchange Grokipedia](https://grokipedia.com/page/ADS-B_Exchange)
- [RadarBox Unique Features](https://www.airnavradar.com/blog/discover-the-unique-features-of-airnav-radarbox-including-the-exclusive-runway-in-use-)
- [RadarBox Top Features 2025](https://en.airnavradar.com/blog/top-5-features-and-updates-of-the-year)
- [Cirium Aviation Analytics](https://www.cirium.com/)
- [Cirium Global Aircraft Emissions Monitor](https://www.cirium.com/solutions/global-aircraft-emissions-monitor/)
- [Cirium Flight Emissions](https://www.cirium.com/solutions/cirium-flight-emissions/)
- [Cirium Aircraft Values Analyzer](https://www.cirium.com/solutions/values-analyzer/)
- [Cirium Fleet Data](https://www.cirium.com/data/aircraft-fleet/)
- [Cirium Sky Data Cloud](https://www.cirium.com/analytics-services/data-cloud-api/)
- [OAG Aviation Analytics](https://www.oag.com/)
- [OAG Analyser Platform](https://www.oag.com/analyser)
- [OAG Emissions Data](https://www.oag.com/emissions-data)
- [Eurocontrol Network Operations Portal](https://www.eurocontrol.int/portal/network-operations-portal)
- [Eurocontrol NM B2B Services](https://www.eurocontrol.int/service/network-manager-business-business-b2b-web-services)
- [Eurocontrol IMPACT Platform](https://www.eurocontrol.int/platform/integrated-aircraft-noise-and-emissions-modelling-platform)
- [Eurocontrol Demand Data Repository](https://www.eurocontrol.int/ddr)
- [Eurocontrol NEST Tool](https://www.eurocontrol.int/model/network-strategic-modelling-tool)
- [Envirosuite Aviation Emissions](https://envirosuite.com/platforms/aviation/anoms-carbon-emissions)
- [Cirium vs OAG vs FlightAPI Comparison](https://www.flightapi.io/blog/cirium-vs-oag-vs-flightapi/)
