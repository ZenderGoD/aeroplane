"use client";

import { useState, useMemo, useRef, useEffect, Suspense } from "react";
import { useFlightData } from "@/hooks/useFlightData";
import { useFlightHistory } from "@/hooks/useFlightHistory";
import { useAnomalyDetection } from "@/hooks/useAnomalyDetection";
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
import ReplayControls, { filterFlightsByReplayTime } from "@/components/ReplayControls";
import { KeyboardShortcutHelp } from "@/components/KeyboardShortcutHelp";
import dynamic from "next/dynamic";
import { REGIONS } from "@/lib/regions";
import type { ViewMode } from "@/types/viewMode";

const Flight3DViewer = dynamic(() => import("@/components/Flight3DViewer"), {
  ssr: false,
});

function HomeContent() {
  const [regionKey, setRegionKey] = useState("world");
  const [viewMode, setViewMode] = useState<ViewMode>("normal");
  const [measureActive, setMeasureActive] = useState(false);
  const [replayActive, setReplayActive] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [replayTime, setReplayTime] = useState<number | null>(null);
  const [show3DViewer, setShow3DViewer] = useState(false);
  const region = REGIONS[regionKey];
  const searchBarRef = useRef<SearchBarHandle>(null);

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
    regionKey === "world" ? undefined : region.bbox,
    filters
  );

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
  });

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
        <div className={`absolute top-14 left-1/2 -translate-x-1/2 z-[1000] border px-4 py-2 rounded-lg shadow-lg text-sm max-w-lg text-center ${
          isQuotaExhausted
            ? "bg-red-900/90 border-red-700 text-red-200"
            : "bg-yellow-900/90 border-yellow-700 text-yellow-200"
        }`}>
          <div className="flex items-center gap-2 justify-center">
            <svg className={`w-4 h-4 flex-shrink-0 ${isQuotaExhausted ? "text-red-400" : "text-yellow-400"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            <span className="font-medium">
              {isQuotaExhausted ? "Daily API quota exhausted" : "OpenSky API rate limited"}
            </span>
          </div>
          <p className={`text-xs mt-1 ${isQuotaExhausted ? "text-red-300/80" : "text-yellow-300/80"}`}>
            {apiError ?? (dataSource === "stale" ? "Showing cached data. " : "")}
            {!isQuotaExhausted && " Auto-retrying..."}
          </p>
        </div>
      )}

      {error && !isLoading && !isRateLimited && (
        <div className="absolute top-14 left-1/2 -translate-x-1/2 z-[1000] bg-red-900/90 border border-red-700 text-red-200 px-4 py-2 rounded-lg shadow-lg text-sm">
          Unable to fetch flight data. Retrying...
        </div>
      )}

      <LeftSidebar
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
        anomalies={anomalies}
        onSelectFlight={setSelectedFlight}
        allFlights={allFlights}
      />

      <FlightMap
        flights={displayFlights}
        selectedFlight={selectedFlight}
        onSelectFlight={setSelectedFlight}
        region={region}
        anomalyIcaos={anomalyIcaos}
        viewMode={viewMode}
        flightHistory={flightHistory}
        airportEstimate={airportEstimate}
        measureActive={measureActive}
        onMeasureDeactivate={() => setMeasureActive(false)}
      />

      {/* Replay Controls */}
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

      <FlightSidebar
        flight={selectedFlight}
        onClose={() => setSelectedFlight(null)}
        anomalies={selectedAnomalies}
        onOpen3D={() => setShow3DViewer(true)}
      />

      {/* 3D Flight Viewer overlay */}
      {show3DViewer && selectedFlight && (
        <Flight3DViewer
          flight={selectedFlight}
          onClose={() => setShow3DViewer(false)}
        />
      )}

      {/* Keyboard Shortcut Help Dialog */}
      <KeyboardShortcutHelp open={showHelp} onOpenChange={setShowHelp} />

      {/* Measure mode indicator (2D only) */}
      {measureActive && viewMode !== "globe" && (
        <div className={`absolute top-14 z-[1000] bg-cyan-900/90 border border-cyan-700 text-cyan-200 px-3 py-1.5 rounded-lg text-xs flex items-center gap-2 transition-all duration-300 ${sidebarCollapsed ? "left-4" : "left-[296px]"}`}>
          <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
          Click two points to measure distance &middot; Press Esc to cancel
        </div>
      )}
    </main>
  );
}

export default function Home() {
  return (
    <Suspense fallback={<LoadingSpinner message="Loading..." />}>
      <HomeContent />
    </Suspense>
  );
}
