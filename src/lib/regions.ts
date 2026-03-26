import type { BoundingBox } from "@/types/flight";

export interface Region {
  name: string;
  bbox: BoundingBox;
  center: [number, number];
  zoom: number;
}

// Bounding boxes for major regions/countries
export const REGIONS: Record<string, Region> = {
  india: {
    name: "India",
    bbox: { lamin: 6.5, lomin: 68.0, lamax: 35.5, lomax: 97.5 },
    center: [22, 82],
    zoom: 5,
  },
  usa: {
    name: "United States",
    bbox: { lamin: 24.5, lomin: -125.0, lamax: 49.5, lomax: -66.5 },
    center: [39, -98],
    zoom: 5,
  },
  europe: {
    name: "Europe",
    bbox: { lamin: 35.0, lomin: -12.0, lamax: 72.0, lomax: 45.0 },
    center: [50, 15],
    zoom: 4,
  },
  uk: {
    name: "United Kingdom",
    bbox: { lamin: 49.5, lomin: -8.5, lamax: 61.0, lomax: 2.0 },
    center: [54, -2],
    zoom: 6,
  },
  germany: {
    name: "Germany",
    bbox: { lamin: 47.2, lomin: 5.8, lamax: 55.1, lomax: 15.1 },
    center: [51.2, 10.4],
    zoom: 6,
  },
  france: {
    name: "France",
    bbox: { lamin: 41.3, lomin: -5.2, lamax: 51.1, lomax: 9.6 },
    center: [46.6, 2.2],
    zoom: 6,
  },
  spain: {
    name: "Spain",
    bbox: { lamin: 35.9, lomin: -9.4, lamax: 43.8, lomax: 4.3 },
    center: [40, -3.7],
    zoom: 6,
  },
  italy: {
    name: "Italy",
    bbox: { lamin: 36.6, lomin: 6.6, lamax: 47.1, lomax: 18.5 },
    center: [42.5, 12.5],
    zoom: 6,
  },
  middleeast: {
    name: "Middle East",
    bbox: { lamin: 12.0, lomin: 25.0, lamax: 42.0, lomax: 63.0 },
    center: [27, 44],
    zoom: 5,
  },
  uae: {
    name: "UAE",
    bbox: { lamin: 22.6, lomin: 51.5, lamax: 26.1, lomax: 56.4 },
    center: [24, 54],
    zoom: 7,
  },
  china: {
    name: "China",
    bbox: { lamin: 18.0, lomin: 73.5, lamax: 53.5, lomax: 135.0 },
    center: [35, 105],
    zoom: 4,
  },
  japan: {
    name: "Japan",
    bbox: { lamin: 24.0, lomin: 122.9, lamax: 45.6, lomax: 145.8 },
    center: [36, 138],
    zoom: 6,
  },
  southkorea: {
    name: "South Korea",
    bbox: { lamin: 33.1, lomin: 124.6, lamax: 38.6, lomax: 131.9 },
    center: [36, 128],
    zoom: 7,
  },
  australia: {
    name: "Australia",
    bbox: { lamin: -44.0, lomin: 113.0, lamax: -10.0, lomax: 154.0 },
    center: [-25, 134],
    zoom: 4,
  },
  brazil: {
    name: "Brazil",
    bbox: { lamin: -33.7, lomin: -73.9, lamax: 5.3, lomax: -34.8 },
    center: [-14, -51],
    zoom: 4,
  },
  canada: {
    name: "Canada",
    bbox: { lamin: 41.7, lomin: -141.0, lamax: 72.0, lomax: -52.6 },
    center: [56, -96],
    zoom: 4,
  },
  southeastasia: {
    name: "Southeast Asia",
    bbox: { lamin: -11.0, lomin: 92.0, lamax: 28.5, lomax: 141.0 },
    center: [10, 115],
    zoom: 4,
  },
  africa: {
    name: "Africa",
    bbox: { lamin: -35.0, lomin: -18.0, lamax: 37.5, lomax: 52.0 },
    center: [5, 20],
    zoom: 3,
  },
  southamerica: {
    name: "South America",
    bbox: { lamin: -56.0, lomin: -82.0, lamax: 13.0, lomax: -34.0 },
    center: [-15, -58],
    zoom: 4,
  },
};

export const REGION_KEYS = Object.keys(REGIONS);
