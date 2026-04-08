// ── Map tile provider styles ────────────────────────────────────────
// Centralized config for all map tile layers across the app.
// Add new providers here — all map components read from this file.

export interface MapStyle {
  id: string;
  name: string;
  url: string;
  attribution: string;
  maxZoom: number;
  subdomains?: string;
  preview: string; // short description for UI
}

export const MAP_STYLES: MapStyle[] = [
  {
    id: "carto-dark",
    name: "CARTO Dark",
    url: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
    attribution: '&copy; <a href="https://carto.com/">CARTO</a> &copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>',
    maxZoom: 20,
    subdomains: "abcd",
    preview: "Clean dark theme",
  },
  {
    id: "carto-light",
    name: "CARTO Light",
    url: "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
    attribution: '&copy; <a href="https://carto.com/">CARTO</a> &copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>',
    maxZoom: 20,
    subdomains: "abcd",
    preview: "Minimal light theme",
  },
  {
    id: "carto-voyager",
    name: "CARTO Voyager",
    url: "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png",
    attribution: '&copy; <a href="https://carto.com/">CARTO</a> &copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>',
    maxZoom: 20,
    subdomains: "abcd",
    preview: "Colorful detailed map",
  },
  {
    id: "osm-standard",
    name: "OpenStreetMap",
    url: "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    maxZoom: 19,
    preview: "Classic OSM style",
  },
  {
    id: "stadia-dark",
    name: "Stadia Dark",
    url: "https://tiles.stadiamaps.com/tiles/alidade_smooth_dark/{z}/{x}/{y}{r}.png",
    attribution: '&copy; <a href="https://stadiamaps.com/">Stadia Maps</a> &copy; <a href="https://openmaptiles.org/">OpenMapTiles</a> &copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>',
    maxZoom: 20,
    preview: "Smooth dark, FR24-like",
  },
  {
    id: "stadia-smooth",
    name: "Stadia Smooth",
    url: "https://tiles.stadiamaps.com/tiles/alidade_smooth/{z}/{x}/{y}{r}.png",
    attribution: '&copy; <a href="https://stadiamaps.com/">Stadia Maps</a> &copy; <a href="https://openmaptiles.org/">OpenMapTiles</a> &copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>',
    maxZoom: 20,
    preview: "Clean light minimal",
  },
  {
    id: "stadia-satellite",
    name: "Stadia Satellite",
    url: "https://tiles.stadiamaps.com/tiles/alidade_satellite/{z}/{x}/{y}{r}.png",
    attribution: '&copy; <a href="https://stadiamaps.com/">Stadia Maps</a>',
    maxZoom: 20,
    preview: "Satellite imagery",
  },
  {
    id: "esri-world",
    name: "Esri World Imagery",
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    attribution: '&copy; <a href="https://www.esri.com/">Esri</a>',
    maxZoom: 18,
    preview: "High-res satellite",
  },
  {
    id: "osm-topo",
    name: "OpenTopoMap",
    url: "https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png",
    attribution: '&copy; <a href="https://opentopomap.org">OpenTopoMap</a> &copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>',
    maxZoom: 17,
    subdomains: "abc",
    preview: "Topographic contours",
  },
];

export const DEFAULT_STYLE_ID = "carto-dark";

export function getMapStyle(id: string): MapStyle {
  return MAP_STYLES.find((s) => s.id === id) ?? MAP_STYLES[0];
}

// Local storage key for persisting user's map style preference
const STORAGE_KEY = "aeroplane-map-style";

export function getSavedMapStyleId(): string {
  if (typeof window === "undefined") return DEFAULT_STYLE_ID;
  return localStorage.getItem(STORAGE_KEY) ?? DEFAULT_STYLE_ID;
}

export function saveMapStyleId(id: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, id);
}
