"use client";

import { useState } from "react";
import { TileLayer } from "react-leaflet";

// OpenWeatherMap free tile layers (no API key needed for basic tiles)
const OWM_LAYERS: Record<string, { url: string; label: string; icon: string }> = {
  precipitation: {
    url: "https://tile.openweathermap.org/map/precipitation_new/{z}/{x}/{y}.png?appid=9de243494c0b295cca9337e1e96b00e2",
    label: "Rain",
    icon: "M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z",
  },
  clouds: {
    url: "https://tile.openweathermap.org/map/clouds_new/{z}/{x}/{y}.png?appid=9de243494c0b295cca9337e1e96b00e2",
    label: "Clouds",
    icon: "M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z",
  },
  temp: {
    url: "https://tile.openweathermap.org/map/temp_new/{z}/{x}/{y}.png?appid=9de243494c0b295cca9337e1e96b00e2",
    label: "Temp",
    icon: "M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z",
  },
  wind: {
    url: "https://tile.openweathermap.org/map/wind_new/{z}/{x}/{y}.png?appid=9de243494c0b295cca9337e1e96b00e2",
    label: "Wind",
    icon: "M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z",
  },
};

interface Props {
  visible: boolean;
}

export default function WeatherLayer({ visible }: Props) {
  const [activeLayer, setActiveLayer] = useState<string>("precipitation");

  if (!visible) return null;

  const layer = OWM_LAYERS[activeLayer];

  return (
    <>
      {/* Weather tile overlay */}
      <TileLayer
        url={layer.url}
        opacity={0.55}
        zIndex={400}
      />

      {/* Layer selector floating UI */}
      <div className="absolute bottom-6 right-4 z-[1000] bg-gray-900/90 backdrop-blur border border-gray-700 rounded-lg px-2 py-1.5 flex items-center gap-1">
        {Object.entries(OWM_LAYERS).map(([key, { label }]) => (
          <button
            key={key}
            onClick={() => setActiveLayer(key)}
            className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
              activeLayer === key
                ? "bg-slate-600 text-white"
                : "text-gray-400 hover:text-gray-200 hover:bg-gray-800/50"
            }`}
          >
            {label}
          </button>
        ))}
      </div>
    </>
  );
}
