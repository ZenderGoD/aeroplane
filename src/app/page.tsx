"use client";

import { useState, useMemo } from "react";
import { useFlightData } from "@/hooks/useFlightData";
import { useFlightHistory } from "@/hooks/useFlightHistory";
import { useAnomalyDetection } from "@/hooks/useAnomalyDetection";
import { useNLSearch } from "@/hooks/useNLSearch";
import FlightMap from "@/components/FlightMap";
import SearchBar from "@/components/SearchBar";
import FlightCounter from "@/components/FlightCounter";
import FlightSidebar from "@/components/FlightSidebar";
import RegionSelector from "@/components/RegionSelector";
import LoadingSpinner from "@/components/LoadingSpinner";
import Legend from "@/components/Legend";
import AnomalyAlert from "@/components/AnomalyAlert";
import ViewModeSelector from "@/components/ViewModeSelector";
import { REGIONS } from "@/lib/regions";
import type { ViewMode } from "@/types/viewMode";

export default function Home() {
  const [regionKey, setRegionKey] = useState("world");
  const [viewMode, setViewMode] = useState<ViewMode>("normal");
  const region = REGIONS[regionKey];

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

  // Flight history (for trails + anomaly detection)
  const { history: flightHistory } = useFlightHistory(allFlights);

  // Anomaly detection
  const { anomalies, anomalyByIcao, anomalyIcaos } = useAnomalyDetection(
    allFlights,
    flightHistory
  );

  // Anomalies for selected flight
  const selectedAnomalies = useMemo(
    () => anomalyByIcao.get(selectedFlight?.icao24 ?? "") ?? [],
    [anomalyByIcao, selectedFlight]
  );

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

      <SearchBar
        value={rawQuery}
        onChange={setRawQuery}
        isAISearching={isAISearching}
        isNaturalLanguage={filters?.is_natural_language ?? false}
      />
      <RegionSelector value={regionKey} onChange={setRegionKey} />

      <FlightCounter
        total={totalCount}
        filtered={filteredCount}
        isFiltered={!!filters}
        isRefreshing={isRefreshing}
        isRateLimited={isRateLimited}
        lastUpdated={lastUpdated}
      />

      <FlightMap
        flights={flights}
        selectedFlight={selectedFlight}
        onSelectFlight={setSelectedFlight}
        region={region}
        anomalyIcaos={anomalyIcaos}
        viewMode={viewMode}
        flightHistory={flightHistory}
      />

      <Legend />
      <ViewModeSelector value={viewMode} onChange={setViewMode} />

      <AnomalyAlert
        anomalies={anomalies}
        onSelectFlight={setSelectedFlight}
        flights={allFlights}
      />

      <FlightSidebar
        flight={selectedFlight}
        onClose={() => setSelectedFlight(null)}
        anomalies={selectedAnomalies}
      />
    </main>
  );
}
