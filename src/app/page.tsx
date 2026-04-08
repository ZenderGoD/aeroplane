"use client";

import { useState, useMemo, useRef, useEffect, Suspense } from "react";
import { useFlightData } from "@/hooks/useFlightData";
import { useSharedFlightData } from "@/contexts/FlightDataContext";
import { useFlightHistory } from "@/hooks/useFlightHistory";
import { useAnomalyDetection } from "@/hooks/useAnomalyDetection";
import { computeAllInstabilities, computeInstability } from "@/lib/instabilityScore";
import { useNLSearch } from "@/hooks/useNLSearch";
import { useNearestAirport } from "@/hooks/useNearestAirport";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import { useNotifications } from "@/hooks/useNotifications";
import { useShareableFlight } from "@/hooks/useShareableFlight";
import FlightMap from "@/components/FlightMap";
import type { SearchBarHandle } from "@/components/SearchBar";
import FlightSidebar from "@/components/FlightSidebar";
import LoadingSpinner from "@/components/LoadingSpinner";
import LeftSidebar from "@/components/LeftSidebar";
import MobileNav from "@/components/MobileNav";
import ReplayControls, { filterFlightsByReplayTime } from "@/components/ReplayControls";
import { KeyboardShortcutHelp } from "@/components/KeyboardShortcutHelp";
import dynamic from "next/dynamic";
import { REGIONS } from "@/lib/regions";
import type { ViewMode } from "@/types/viewMode";
import { FlightDataProvider } from "@/contexts/FlightDataContext";
import AirspaceCopilot from "@/components/AirspaceCopilot";
import AirportDetailSheet from "@/components/AirportDetailSheet";
import CorridorDetailSheet from "@/components/CorridorDetailSheet";
import CommandPalette from "@/components/CommandPalette";
import MapHUD from "@/components/MapHUD";
import LiveActivityFeed from "@/components/LiveActivityFeed";
import ShareButton from "@/components/ShareButton";
import SoundToggle from "@/components/SoundToggle";

const Flight3DViewer = dynamic(() => import("@/components/Flight3DViewer"), {
  ssr: false,
});

// ---------- Full-screen mode components (lazy loaded) ----------

const AirportRadarMode = dynamic(() => import("@/components/AirportRadarMode"), { ssr: false });
const AirportBoardMode = dynamic(() => import("@/components/AirportBoardMode"), { ssr: false });
const FleetTrackerMode = dynamic(() => import("@/components/FleetTrackerMode"), { ssr: false });
const AircraftProfileMode = dynamic(() => import("@/components/AircraftProfileMode"), { ssr: false });
const StatsDashboardMode = dynamic(() => import("@/components/StatsDashboardMode"), { ssr: false });
const ComparisonMode = dynamic(() => import("@/components/ComparisonMode"), { ssr: false });
const AlertSystemMode = dynamic(() => import("@/components/AlertSystemMode"), { ssr: false });
const TurbulenceMode = dynamic(() => import("@/components/TurbulenceMode"), { ssr: false });
const EmbedGeneratorMode = dynamic(() => import("@/components/EmbedGeneratorMode"), { ssr: false });
const ApiPortalMode = dynamic(() => import("@/components/ApiPortalMode"), { ssr: false });
const ExportReportsMode = dynamic(() => import("@/components/ExportReportsMode"), { ssr: false });

const FULLSCREEN_MODES: Set<ViewMode> = new Set([
  "airport", "fids", "fleet", "aircraft", "stats", "comparison",
  "alerts", "turbulence", "embed", "api", "exports",
]);

function HomeContent() {
  const [regionKey, setRegionKey] = useState("india");
  const [viewMode, setViewMode] = useState<ViewMode>("normal");
  const [measureActive, setMeasureActive] = useState(false);
  const [replayActive, setReplayActive] = useState(false);
  const [corridorsVisible, setCorridorsVisible] = useState(false);
  const [flightDistanceActive, setFlightDistanceActive] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [replayTime, setReplayTime] = useState<number | null>(null);
  const [show3DViewer, setShow3DViewer] = useState(false);
  const [hiddenCategories, setHiddenCategories] = useState<Set<number>>(new Set());
  const [weatherVisible, setWeatherVisible] = useState(false);
  const [metarVisible, setMetarVisible] = useState(false);
  const [runwaysVisible, setRunwaysVisible] = useState(false);
  const [routeDensityVisible, setRouteDensityVisible] = useState(false);
  const [windAloftVisible, setWindAloftVisible] = useState(false);
  const [terrainVisible, setTerrainVisible] = useState(false);
  const [pirepVisible, setPirepVisible] = useState(false);
  const [routeLinesVisible, setRouteLinesVisible] = useState(false);
  const [selectedAirport, setSelectedAirport] = useState<string | null>(null);
  const [selectedCorridor, setSelectedCorridor] = useState<string | null>(null);
  const [cmdPaletteOpen, setCmdPaletteOpen] = useState(false);
  const region = REGIONS[regionKey];
  const searchBarRef = useRef<SearchBarHandle>(null);

  // Keep shared flight data provider in sync with region changes
  const sharedData = useSharedFlightData();
  useEffect(() => {
    sharedData.setBbox(region.bbox);
  }, [region.bbox]); // eslint-disable-line react-hooks/exhaustive-deps

  // NL Search
  const { rawQuery, setRawQuery, filters, isAISearching } = useNLSearch();

  // Flight data
  const {
    flights,
    allFlights,
    totalCount,
    filteredCount,
    isLoading,
    isRefreshing,
    error,
    isRateLimited,
    isQuotaExhausted,
    dataSource,
    apiError,
    selectedFlight,
    setSelectedFlight,
    lastUpdated,
  } = useFlightData(
    region.bbox,
    filters
  );

  // Auto-switch to trails view when arrivals filter is active
  const prevViewModeRef = useRef<ViewMode | null>(null);
  useEffect(() => {
    if (filters?.destination_airport) {
      if (viewMode !== "trails") {
        prevViewModeRef.current = viewMode;
        setViewMode("trails");
      }
    } else if (prevViewModeRef.current !== null) {
      setViewMode(prevViewModeRef.current);
      prevViewModeRef.current = null;
    }
  }, [filters?.destination_airport]); // eslint-disable-line react-hooks/exhaustive-deps

  // Shareable flight links
  const { initialFlightIcao, updateFlightUrl } = useShareableFlight();

  // Select flight from URL on initial load
  useEffect(() => {
    if (initialFlightIcao && allFlights.length > 0) {
      const flight = allFlights.find((f) => f.icao24 === initialFlightIcao);
      if (flight) setSelectedFlight(flight);
    }
  }, [initialFlightIcao, allFlights, setSelectedFlight]);

  // Update URL when flight selection changes
  useEffect(() => {
    updateFlightUrl(selectedFlight?.icao24 ?? null);
  }, [selectedFlight, updateFlightUrl]);

  // Flight history (for trails + anomaly detection + replay)
  const { history: flightHistory } = useFlightHistory(allFlights);

  // Anomaly detection
  const { anomalies, anomalyByIcao, anomalyIcaos } = useAnomalyDetection(
    allFlights,
    flightHistory
  );

  // Instability scores
  const instabilityScores = useMemo(
    () => computeAllInstabilities(allFlights, flightHistory),
    [allFlights, flightHistory]
  );

  // Instability for selected flight
  const selectedInstability = useMemo(() => {
    if (!selectedFlight) return null;
    return computeInstability(selectedFlight, flightHistory.get(selectedFlight.icao24));
  }, [selectedFlight, flightHistory]);

  // Browser notifications for critical anomalies
  useNotifications(anomalies);

  // Anomalies for selected flight
  const selectedAnomalies = useMemo(
    () => anomalyByIcao.get(selectedFlight?.icao24 ?? "") ?? [],
    [anomalyByIcao, selectedFlight]
  );

  // Airport estimate for selected flight (used for route lines + weather)
  const airportEstimate = useNearestAirport(selectedFlight);

  // Keyboard shortcuts
  const { showHelp, setShowHelp } = useKeyboardShortcuts({
    flights,
    selectedFlight,
    setSelectedFlight,
    setSearchFocused: () => searchBarRef.current?.focus(),
    expandSidebar: () => setSidebarCollapsed(false),
    toggleSidebar: () => setSidebarCollapsed((v) => !v),
    onToggleMeasure: () => setMeasureActive((v) => !v),
    onToggleWeather: () => setWeatherVisible((v) => !v),
    onToggleRouteLines: () => setRouteLinesVisible((v) => !v),
    onToggleRouteDensity: () => setRouteDensityVisible((v) => !v),
    onToggleTerrain: () => setTerrainVisible((v) => !v),
    onViewModeChange: setViewMode,
  });

  // Cmd+K command palette
  useEffect(() => {
    const handleKeyDown = (e: globalThis.KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setCmdPaletteOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Replay: filter flights when replaying
  const displayFlights = useMemo(() => {
    if (replayTime && replayActive) {
      return filterFlightsByReplayTime(allFlights, flightHistory, replayTime);
    }
    return flights;
  }, [replayTime, replayActive, allFlights, flightHistory, flights]);

  return (
    <main className="relative h-screen w-screen overflow-hidden">
      {isLoading && <LoadingSpinner message="Loading flight data..." />}

      {isRateLimited && !isLoading && (
        <div className={`absolute top-4 left-1/2 -translate-x-1/2 z-[1000] border px-4 py-2.5 rounded-xl text-sm max-w-lg text-center animate-slide-up ${
          isQuotaExhausted
            ? "glass-heavy border-slate-400/20 text-slate-200 shadow-[0_0_24px_rgba(148,163,184,0.1)]"
            : "glass-heavy border-slate-400/20 text-slate-200 shadow-[0_0_24px_rgba(148,163,184,0.1)]"
        }`}>
          <div className="flex items-center gap-2 justify-center">
            <svg className={`w-4 h-4 flex-shrink-0 ${isQuotaExhausted ? "text-slate-300" : "text-slate-400"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            <span className="font-semibold">
              {isQuotaExhausted ? "Daily API quota exhausted" : "OpenSky API rate limited"}
            </span>
          </div>
          <p className={`text-xs mt-1 ${isQuotaExhausted ? "text-slate-300/70" : "text-slate-400/70"}`}>
            {apiError ?? (dataSource === "stale" ? "Showing cached data. " : "")}
            {!isQuotaExhausted && " Auto-retrying..."}
          </p>
        </div>
      )}

      {error && !isLoading && !isRateLimited && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[1000] glass-heavy border border-slate-400/20 text-slate-200 px-4 py-2.5 rounded-xl shadow-[0_0_24px_rgba(148,163,184,0.1)] text-sm animate-slide-up">
          Unable to fetch flight data. Retrying...
        </div>
      )}

      {!FULLSCREEN_MODES.has(viewMode) && <LeftSidebar
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed((v) => !v)}
        searchBarRef={searchBarRef}
        rawQuery={rawQuery}
        onRawQueryChange={setRawQuery}
        isAISearching={isAISearching}
        isNaturalLanguage={filters?.is_natural_language ?? false}
        regionKey={regionKey}
        onRegionChange={setRegionKey}
        totalCount={totalCount}
        filteredCount={filteredCount}
        isFiltered={!!filters}
        isRefreshing={isRefreshing}
        isRateLimited={isRateLimited}
        lastUpdated={lastUpdated}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        flights={allFlights}
        measureActive={measureActive}
        onMeasureToggle={() => setMeasureActive((v) => !v)}
        replayActive={replayActive}
        onReplayToggle={() => {
          setReplayActive((v) => !v);
          if (replayActive) setReplayTime(null);
        }}
        corridorsVisible={corridorsVisible}
        onCorridorsToggle={() => setCorridorsVisible((v) => !v)}
        flightDistanceActive={flightDistanceActive}
        onFlightDistanceToggle={() => setFlightDistanceActive((v) => !v)}
        anomalies={anomalies}
        onSelectFlight={setSelectedFlight}
        allFlights={allFlights}
        hiddenCategories={hiddenCategories}
        onToggleCategory={(cat: number) => {
          setHiddenCategories(prev => {
            const next = new Set(prev);
            if (next.has(cat)) next.delete(cat);
            else next.add(cat);
            return next;
          });
        }}
        weatherVisible={weatherVisible}
        onWeatherToggle={() => setWeatherVisible((v) => !v)}
        metarVisible={metarVisible}
        onMetarToggle={() => setMetarVisible((v) => !v)}
        runwaysVisible={runwaysVisible}
        onRunwaysToggle={() => setRunwaysVisible((v) => !v)}
        routeDensityVisible={routeDensityVisible}
        onRouteDensityToggle={() => setRouteDensityVisible((v) => !v)}
        windAloftVisible={windAloftVisible}
        onWindAloftToggle={() => setWindAloftVisible((v) => !v)}
        terrainVisible={terrainVisible}
        onTerrainToggle={() => setTerrainVisible((v) => !v)}
        pirepVisible={pirepVisible}
        onPirepToggle={() => setPirepVisible((v) => !v)}
        routeLinesVisible={routeLinesVisible}
        onRouteLinesToggle={() => setRouteLinesVisible((v) => !v)}
        onSelectAirport={setSelectedAirport}
        onSelectAirline={(icaoCode) => {
          setRawQuery(icaoCode);
          setViewMode("fleet");
        }}
      />}

      {!FULLSCREEN_MODES.has(viewMode) && (
        <MobileNav
          searchBarRef={searchBarRef}
          rawQuery={rawQuery}
          onRawQueryChange={setRawQuery}
          isAISearching={isAISearching}
          isNaturalLanguage={filters?.is_natural_language ?? false}
          regionKey={regionKey}
          onRegionChange={setRegionKey}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          measureActive={measureActive}
          onMeasureToggle={() => setMeasureActive((v) => !v)}
          replayActive={replayActive}
          onReplayToggle={() => {
            setReplayActive((v) => !v);
            if (replayActive) setReplayTime(null);
          }}
          corridorsVisible={corridorsVisible}
          onCorridorsToggle={() => setCorridorsVisible((v) => !v)}
          flightDistanceActive={flightDistanceActive}
          onFlightDistanceToggle={() => setFlightDistanceActive((v) => !v)}
          weatherVisible={weatherVisible}
          onWeatherToggle={() => setWeatherVisible((v) => !v)}
          metarVisible={metarVisible}
          onMetarToggle={() => setMetarVisible((v) => !v)}
          runwaysVisible={runwaysVisible}
          onRunwaysToggle={() => setRunwaysVisible((v) => !v)}
          routeDensityVisible={routeDensityVisible}
          onRouteDensityToggle={() => setRouteDensityVisible((v) => !v)}
          windAloftVisible={windAloftVisible}
          onWindAloftToggle={() => setWindAloftVisible((v) => !v)}
          terrainVisible={terrainVisible}
          onTerrainToggle={() => setTerrainVisible((v) => !v)}
          pirepVisible={pirepVisible}
          onPirepToggle={() => setPirepVisible((v) => !v)}
          routeLinesVisible={routeLinesVisible}
          onRouteLinesToggle={() => setRouteLinesVisible((v) => !v)}
        />
      )}

      {(() => {
        const exitMode = () => setViewMode("normal");
        switch (viewMode) {
          case "airport": return <AirportRadarMode onExitMode={exitMode} />;
          case "fids": return <AirportBoardMode onExitMode={exitMode} />;
          case "fleet": return <FleetTrackerMode onExitMode={exitMode} />;
          case "aircraft": return <AircraftProfileMode onExitMode={exitMode} />;
          case "stats": return <StatsDashboardMode onExitMode={exitMode} />;
          case "comparison": return <ComparisonMode onExitMode={exitMode} />;
          case "alerts": return <AlertSystemMode onExitMode={exitMode} />;
          case "turbulence": return <TurbulenceMode onExitMode={exitMode} />;
          case "embed": return <EmbedGeneratorMode onExitMode={exitMode} />;
          case "api": return <ApiPortalMode onExitMode={exitMode} />;
          case "exports": return <ExportReportsMode onExitMode={exitMode} />;
          default: return (
            <FlightMap
              flights={displayFlights}
              selectedFlight={selectedFlight}
              onSelectFlight={setSelectedFlight}
              region={region}
              anomalyIcaos={anomalyIcaos}
              instabilityScores={instabilityScores}
              viewMode={viewMode}
              flightHistory={flightHistory}
              airportEstimate={airportEstimate}
              measureActive={measureActive}
              onMeasureDeactivate={() => setMeasureActive(false)}
              corridorsVisible={corridorsVisible}
              flightDistanceActive={flightDistanceActive}
              onFlightDistanceDeactivate={() => setFlightDistanceActive(false)}
              hiddenCategories={hiddenCategories}
              weatherVisible={weatherVisible}
              metarVisible={metarVisible}
              runwaysVisible={runwaysVisible}
              routeDensityVisible={routeDensityVisible}
              windAloftVisible={windAloftVisible}
              terrainVisible={terrainVisible}
              pirepVisible={pirepVisible}
              routeLinesVisible={routeLinesVisible}
              onSelectCorridor={setSelectedCorridor}
            />
          );
        }
      })()}

      {/* Replay Controls */}
      {!FULLSCREEN_MODES.has(viewMode) && (
        <ReplayControls
          flightHistory={flightHistory}
          flights={allFlights}
          isActive={replayActive}
          onToggle={() => {
            setReplayActive(false);
            setReplayTime(null);
          }}
          onReplayTimeChange={setReplayTime}
        />
      )}

      {!FULLSCREEN_MODES.has(viewMode) && (
        <FlightSidebar
          flight={selectedFlight}
          onClose={() => setSelectedFlight(null)}
          anomalies={selectedAnomalies}
          instability={selectedInstability}
          onOpen3D={() => setShow3DViewer(true)}
          flightHistory={selectedFlight ? flightHistory.get(selectedFlight.icao24) : undefined}
        />
      )}

      {/* 3D Flight Viewer overlay */}
      {show3DViewer && selectedFlight && !FULLSCREEN_MODES.has(viewMode) && (
        <Flight3DViewer
          flight={selectedFlight}
          onClose={() => setShow3DViewer(false)}
        />
      )}

      {/* Airport & Corridor Detail Sheets */}
      {!FULLSCREEN_MODES.has(viewMode) && (
        <AirportDetailSheet
          airportIcao={selectedAirport}
          onClose={() => setSelectedAirport(null)}
          allFlights={allFlights}
          onSelectCorridor={(id) => {
            setSelectedAirport(null);
            setSelectedCorridor(id);
          }}
        />
      )}
      {!FULLSCREEN_MODES.has(viewMode) && (
        <CorridorDetailSheet
          corridorId={selectedCorridor}
          onClose={() => setSelectedCorridor(null)}
          allFlights={allFlights}
          onSelectAirport={(icao) => {
            setSelectedCorridor(null);
            setSelectedAirport(icao);
          }}
          onSelectFlight={setSelectedFlight}
        />
      )}

      {/* Map HUD & Live Feed (normal map modes only) */}
      {!FULLSCREEN_MODES.has(viewMode) && (
        <MapHUD
          totalCount={totalCount}
          filteredCount={filteredCount}
          isRefreshing={isRefreshing}
          lastUpdated={lastUpdated}
          dataSource={dataSource}
          flights={displayFlights}
        />
      )}
      {!FULLSCREEN_MODES.has(viewMode) && (
        <LiveActivityFeed
          flights={displayFlights}
          flightHistory={flightHistory}
        />
      )}

      {/* Share & Sound controls */}
      {!FULLSCREEN_MODES.has(viewMode) && (
        <div className="absolute top-4 right-4 z-[900] flex items-center gap-2">
          <ShareButton selectedFlightIcao={selectedFlight?.icao24} />
          <SoundToggle />
        </div>
      )}

      {/* Airspace Copilot Chat */}
      <AirspaceCopilot />

      {/* Keyboard Shortcut Help Dialog */}
      <KeyboardShortcutHelp open={showHelp} onOpenChange={setShowHelp} />

      {/* Command Palette */}
      <CommandPalette
        open={cmdPaletteOpen}
        onOpenChange={setCmdPaletteOpen}
        allFlights={allFlights}
        onSelectFlight={setSelectedFlight}
        onSelectAirport={setSelectedAirport}
        onSelectCorridor={setSelectedCorridor}
        onToggleCorridors={() => setCorridorsVisible((v) => !v)}
        onToggleWeather={() => setWeatherVisible((v) => !v)}
        onToggleMeasure={() => setMeasureActive((v) => !v)}
        onToggleReplay={() => {
          setReplayActive((v) => !v);
          if (replayActive) setReplayTime(null);
        }}
        onViewModeChange={setViewMode}
        onShowKeyboardHelp={() => setShowHelp(true)}
      />

      {/* Measure mode indicator (2D only) */}
      {measureActive && viewMode !== "globe" && !FULLSCREEN_MODES.has(viewMode) && (
        <div className={`absolute top-4 z-[1000] glass-heavy border border-slate-400/20 text-slate-300 px-4 py-2 rounded-xl text-xs flex items-center gap-2 transition-all duration-300 shadow-[0_0_16px_rgba(148,163,184,0.1)] animate-slide-up ${sidebarCollapsed ? "left-4" : "left-[296px]"}`}>
          <div className="w-2 h-2 rounded-full bg-slate-300 animate-pulse shadow-[0_0_8px_rgba(203,213,225,0.5)]" />
          Click two points to measure distance &middot; Press Esc to cancel
        </div>
      )}

      {/* Flight distance mode indicator */}
      {flightDistanceActive && viewMode !== "globe" && !FULLSCREEN_MODES.has(viewMode) && (
        <div className={`absolute top-4 z-[1000] glass-heavy border border-slate-400/20 text-slate-300 px-4 py-2 rounded-xl text-xs flex items-center gap-2 transition-all duration-300 shadow-[0_0_16px_rgba(148,163,184,0.1)] animate-slide-up ${sidebarCollapsed ? "left-4" : "left-[296px]"}`}>
          <div className="w-2 h-2 rounded-full bg-slate-400 animate-pulse shadow-[0_0_8px_rgba(148,163,184,0.5)]" />
          Click two aircraft to measure separation &middot; Press Esc to cancel
        </div>
      )}
    </main>
  );
}

export default function Home() {
  return (
    <Suspense fallback={<LoadingSpinner message="Loading..." />}>
      <FlightDataProvider initialBbox={REGIONS["india"].bbox}>
        <HomeContent />
      </FlightDataProvider>
    </Suspense>
  );
}
