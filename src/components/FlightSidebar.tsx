"use client";

import Image from "next/image";
import type { FlightState } from "@/types/flight";
import type { Anomaly } from "@/types/anomaly";
import {
  metersToFeet,
  msToKnots,
  msToFpm,
  formatCallsign,
} from "@/lib/mapUtils";
import { getAirlineName } from "@/lib/airlines";
import { useAircraftMeta } from "@/hooks/useAircraftMeta";
import { useFlightNarration } from "@/hooks/useFlightNarration";
import { useNearestAirport } from "@/hooks/useNearestAirport";
import { useWeather } from "@/hooks/useWeather";
import { useAircraftPhoto } from "@/hooks/useAircraftPhoto";
import { getCategoryColor, getCategoryLabel } from "./CanvasPlaneLayer";
import AnomalyBadge from "./AnomalyBadge";
import AIInsights from "./AIInsights";

interface Props {
  flight: FlightState | null;
  onClose: () => void;
  anomalies?: Anomaly[];
}

const FLIGHT_CAT_COLORS: Record<string, string> = {
  VFR: "#22c55e",   // green
  MVFR: "#3b82f6",  // blue
  IFR: "#ef4444",    // red
  LIFR: "#a855f7",   // purple
};

export default function FlightSidebar({ flight, onClose, anomalies = [] }: Props) {
  const { meta, isLoading: metaLoading } = useAircraftMeta(
    flight?.icao24 ?? null
  );
  const airlineName = flight ? getAirlineName(flight.callsign) : null;

  // New enrichment hooks
  const airportEstimate = useNearestAirport(flight);
  const nearestIcao = airportEstimate.nearest?.airport?.icao ?? null;
  const { weather, isLoading: weatherLoading } = useWeather(nearestIcao);
  const { photo, isLoading: photoLoading } = useAircraftPhoto(
    flight?.icao24 ?? null,
    meta?.registration ?? null
  );

  const { narration, isLoading: narrationLoading, error: narrationError } =
    useFlightNarration(flight, meta, airportEstimate, weather);

  return (
    <div
      className={`fixed right-0 top-0 h-full w-80 bg-gray-950/95 backdrop-blur-md shadow-2xl border-l border-gray-800 z-[1000] transform transition-transform duration-300 ease-in-out ${
        flight ? "translate-x-0" : "translate-x-full"
      }`}
    >
      {flight && (
        <div className="h-full flex flex-col">
          {/* Header */}
          <div className="bg-gray-900 border-b border-gray-800 text-white px-5 py-4 flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <div className="text-xl font-bold tracking-wider">
                  {formatCallsign(flight.callsign)}
                </div>
                <span
                  className="inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold"
                  style={{
                    backgroundColor: getCategoryColor(flight.category) + "30",
                    color: getCategoryColor(flight.category),
                  }}
                >
                  {getCategoryLabel(flight.category)}
                </span>
              </div>
              {airlineName && (
                <div className="text-blue-400 text-sm">{airlineName}</div>
              )}
              <div className="text-gray-500 text-xs mt-0.5">
                {flight.originCountry}
              </div>
              <AnomalyBadge anomalies={anomalies} />
            </div>
            <button
              onClick={onClose}
              className="p-1 hover:bg-gray-800 rounded transition-colors"
            >
              <svg
                className="h-5 w-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          {/* Details */}
          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
            {/* Aircraft Photo */}
            <PhotoSection photo={photo} isLoading={photoLoading} />

            {/* AI Insights */}
            <AIInsights
              narration={narration}
              isLoading={narrationLoading}
              error={narrationError}
            />

            {/* Route Estimation */}
            <RouteSection
              nearest={airportEstimate.nearest}
              departure={airportEstimate.departure}
            />

            {/* Weather */}
            <WeatherSection
              weather={weather}
              isLoading={weatherLoading}
              stationIcao={nearestIcao}
            />

            <Section title="Aircraft">
              {metaLoading ? (
                <div className="text-xs text-gray-500 animate-pulse">
                  Loading aircraft data...
                </div>
              ) : meta ? (
                <>
                  {meta.type && <Detail label="Type" value={meta.type} />}
                  {meta.typeCode && (
                    <Detail label="ICAO Type" value={meta.typeCode} />
                  )}
                  {meta.registration && (
                    <Detail label="Registration" value={meta.registration} />
                  )}
                  {meta.owner && <Detail label="Operator" value={meta.owner} />}
                </>
              ) : (
                <div className="text-xs text-gray-600">
                  No aircraft data available
                </div>
              )}
            </Section>

            <Section title="Position">
              <Detail
                label="Status"
                value={flight.onGround ? "On Ground" : "In Flight"}
                highlight={!flight.onGround}
              />
              <Detail
                label="Altitude"
                value={
                  flight.baroAltitude !== null
                    ? `${metersToFeet(flight.baroAltitude).toLocaleString()} ft`
                    : "N/A"
                }
              />
              <Detail
                label="Latitude"
                value={flight.latitude?.toFixed(4) ?? "N/A"}
              />
              <Detail
                label="Longitude"
                value={flight.longitude?.toFixed(4) ?? "N/A"}
              />
            </Section>

            <Section title="Movement">
              <Detail
                label="Ground Speed"
                value={
                  flight.velocity !== null
                    ? `${msToKnots(flight.velocity)} kts`
                    : "N/A"
                }
              />
              <Detail
                label="Heading"
                value={
                  flight.trueTrack !== null
                    ? `${Math.round(flight.trueTrack)}°`
                    : "N/A"
                }
              />
              <Detail
                label="Vertical Rate"
                value={
                  flight.verticalRate !== null
                    ? `${msToFpm(flight.verticalRate) >= 0 ? "+" : ""}${msToFpm(flight.verticalRate)} fpm`
                    : "N/A"
                }
              />
            </Section>

            <Section title="Identification">
              <Detail label="ICAO24" value={flight.icao24.toUpperCase()} />
              {flight.squawk && (
                <Detail label="Squawk" value={flight.squawk} />
              )}
            </Section>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Photo Section ──────────────────────────────────── */
function PhotoSection({
  photo,
  isLoading,
}: {
  photo: { url: string; thumbnailUrl: string; photographer: string | null; source: string; link: string | null } | null;
  isLoading: boolean;
}) {
  if (isLoading) {
    return (
      <div className="w-full h-36 rounded-lg bg-gray-800/60 animate-pulse flex items-center justify-center">
        <svg className="w-8 h-8 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
          <circle cx="12" cy="13" r="3" strokeWidth={1.5} />
        </svg>
      </div>
    );
  }
  if (!photo) return null;

  return (
    <div className="relative w-full rounded-lg overflow-hidden border border-gray-800">
      <Image
        src={photo.thumbnailUrl || photo.url}
        alt="Aircraft photo"
        width={320}
        height={200}
        className="w-full h-auto object-cover"
        unoptimized
      />
      {photo.photographer && (
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent px-2 py-1">
          <span className="text-[10px] text-gray-300">
            {photo.link ? (
              <a
                href={photo.link}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-white transition-colors"
              >
                {photo.photographer} &middot; {photo.source}
              </a>
            ) : (
              <>
                {photo.photographer} &middot; {photo.source}
              </>
            )}
          </span>
        </div>
      )}
    </div>
  );
}

/* ── Route Section ──────────────────────────────────── */
function RouteSection({
  nearest,
  departure,
}: {
  nearest: { airport: { name: string; icao: string | null; city: string; country: string }; distanceNm: number } | null;
  departure: { airport: { name: string; icao: string | null; city: string; country: string }; distanceNm: number } | null;
}) {
  if (!nearest) return null;

  return (
    <Section title="Route">
      {departure && (
        <div className="flex items-center gap-2 text-sm">
          <span className="text-green-400 text-xs font-bold">DEP</span>
          <div className="flex-1 min-w-0">
            <div className="text-gray-200 truncate text-xs">
              {departure.airport.name}
              {departure.airport.icao && (
                <span className="text-gray-500 ml-1">({departure.airport.icao})</span>
              )}
            </div>
            <div className="text-gray-500 text-[10px]">
              {departure.airport.city}, {departure.airport.country}
            </div>
          </div>
        </div>
      )}

      {departure && nearest && (
        <div className="flex items-center gap-2 px-4">
          <div className="flex-1 border-t border-dashed border-gray-700" />
          <svg className="w-3 h-3 text-gray-600" fill="currentColor" viewBox="0 0 24 24">
            <path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z" />
          </svg>
          <div className="flex-1 border-t border-dashed border-gray-700" />
        </div>
      )}

      <div className="flex items-center gap-2 text-sm">
        <span className="text-blue-400 text-xs font-bold">NR</span>
        <div className="flex-1 min-w-0">
          <div className="text-gray-200 truncate text-xs">
            {nearest.airport.name}
            {nearest.airport.icao && (
              <span className="text-gray-500 ml-1">({nearest.airport.icao})</span>
            )}
          </div>
          <div className="text-gray-500 text-[10px]">
            {nearest.airport.city}, {nearest.airport.country} &middot; {nearest.distanceNm.toFixed(1)} nm away
          </div>
        </div>
      </div>
    </Section>
  );
}

/* ── Weather Section ──────────────────────────────────── */
function WeatherSection({
  weather,
  isLoading,
  stationIcao,
}: {
  weather: {
    flightCategory: string;
    temperature: number | null;
    windDirection: number | null;
    windSpeed: number | null;
    windGust: number | null;
    visibility: number | null;
    conditions: string[];
    ceiling: number | null;
    humidity: number | null;
    station: string;
  } | null;
  isLoading: boolean;
  stationIcao: string | null;
}) {
  if (!stationIcao) return null;

  if (isLoading) {
    return (
      <Section title="Weather">
        <div className="text-xs text-gray-500 animate-pulse">
          Loading weather data...
        </div>
      </Section>
    );
  }

  if (!weather) return null;

  const catColor = FLIGHT_CAT_COLORS[weather.flightCategory] ?? "#9ca3af";

  return (
    <Section title={`Weather \u2014 ${weather.station}`}>
      {/* Flight category badge */}
      <div className="flex items-center gap-2 mb-1">
        <span
          className="inline-block px-2 py-0.5 rounded text-[11px] font-bold"
          style={{
            backgroundColor: catColor + "25",
            color: catColor,
            border: `1px solid ${catColor}40`,
          }}
        >
          {weather.flightCategory}
        </span>
        {weather.conditions.length > 0 && weather.conditions[0] !== "Clear" && (
          <span className="text-xs text-gray-400">
            {weather.conditions.join(", ")}
          </span>
        )}
      </div>

      {weather.temperature !== null && (
        <Detail label="Temperature" value={`${weather.temperature}\u00b0C`} />
      )}
      {weather.windSpeed !== null && (
        <Detail
          label="Wind"
          value={`${weather.windDirection ?? "VRB"}\u00b0 @ ${weather.windSpeed} kts${weather.windGust ? ` (G${weather.windGust})` : ""}`}
        />
      )}
      {weather.visibility !== null && (
        <Detail label="Visibility" value={`${weather.visibility} SM`} />
      )}
      {weather.ceiling !== null && (
        <Detail label="Ceiling" value={`${weather.ceiling.toLocaleString()} ft`} />
      )}
      {weather.humidity !== null && (
        <Detail label="Humidity" value={`${Math.round(weather.humidity)}%`} />
      )}
    </Section>
  );
}

/* ── Shared UI Components ────────────────────────────── */
function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
        {title}
      </h3>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function Detail({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-gray-500 text-sm">{label}</span>
      <span
        className={`font-medium text-sm ${highlight ? "text-green-400" : "text-gray-200"}`}
      >
        {value}
      </span>
    </div>
  );
}
