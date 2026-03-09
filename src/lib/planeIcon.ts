import L from "leaflet";

export function createPlaneIcon(
  heading: number,
  isSelected: boolean
): L.DivIcon {
  const color = isSelected ? "#f97316" : "#1d4ed8";
  const size = isSelected ? 28 : 20;
  return L.divIcon({
    className: "",
    html: `<div style="transform:rotate(${heading ?? 0}deg);width:${size}px;height:${size}px;filter:drop-shadow(0 1px 2px rgba(0,0,0,0.4))">
      <svg viewBox="0 0 512 512" fill="${color}" xmlns="http://www.w3.org/2000/svg">
        <path d="M272 0c-8.8 0-16 7.2-16 16v166.3L48.5 358.7C42.3 363 38.4 370.2 38.4 378v36.8c0 10.6 10.2 18.2 20.3 15.1L256 370.7l197.3 59.2c10.1 3 20.3-4.5 20.3-15.1V378c0-7.8-3.9-15-10.1-19.3L256 182.3V16c0-8.8-7.2-16-16-16z"/>
      </svg>
    </div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}
