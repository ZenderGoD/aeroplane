"use client";

import { useEffect, useState, useCallback } from "react";
import type { FlightState } from "@/types/flight";
import type { ViewMode } from "@/types/viewMode";

interface UseKeyboardShortcutsParams {
  flights: FlightState[];
  selectedFlight: FlightState | null;
  setSelectedFlight: (flight: FlightState | null) => void;
  setSearchFocused: () => void;
  expandSidebar: () => void;
  toggleSidebar: () => void;
  // New tool/layer toggle callbacks
  onToggleMeasure?: () => void;
  onToggleWeather?: () => void;
  onToggleRouteLines?: () => void;
  onToggleRouteDensity?: () => void;
  onToggleTerrain?: () => void;
  onViewModeChange?: (mode: ViewMode) => void;
}

const VIEW_MODE_KEYS: Record<string, ViewMode> = {
  "1": "normal",
  "2": "heatmap",
  "3": "trails",
  "4": "globe",
  "5": "airport",
  "6": "fids",
  "7": "fleet",
  "8": "aircraft",
  "9": "stats",
};

export function useKeyboardShortcuts({
  flights,
  selectedFlight,
  setSelectedFlight,
  setSearchFocused,
  expandSidebar,
  toggleSidebar,
  onToggleMeasure,
  onToggleWeather,
  onToggleRouteLines,
  onToggleRouteDensity,
  onToggleTerrain,
  onViewModeChange,
}: UseKeyboardShortcutsParams) {
  const [showHelp, setShowHelp] = useState(false);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      // Don't handle shortcuts when typing in input fields
      const target = e.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable
      ) {
        // Allow Escape to blur out of inputs
        if (e.key === "Escape") {
          target.blur();
          return;
        }
        return;
      }

      switch (e.key) {
        case "Escape": {
          if (showHelp) {
            setShowHelp(false);
          } else if (selectedFlight) {
            setSelectedFlight(null);
          }
          break;
        }

        case "/": {
          e.preventDefault();
          expandSidebar();
          setSearchFocused();
          break;
        }

        case "k": {
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            expandSidebar();
            setSearchFocused();
          }
          break;
        }

        case "b": {
          toggleSidebar();
          break;
        }

        case "[": {
          if (flights.length === 0) break;

          if (!selectedFlight) {
            // Select the last flight in the list
            setSelectedFlight(flights[flights.length - 1]);
          } else {
            const currentIndex = flights.findIndex(
              (f) => f.icao24 === selectedFlight.icao24
            );
            if (currentIndex > 0) {
              setSelectedFlight(flights[currentIndex - 1]);
            } else {
              // Wrap around to the last flight
              setSelectedFlight(flights[flights.length - 1]);
            }
          }
          break;
        }

        case "]": {
          if (flights.length === 0) break;

          if (!selectedFlight) {
            // Select the first flight in the list
            setSelectedFlight(flights[0]);
          } else {
            const currentIndex = flights.findIndex(
              (f) => f.icao24 === selectedFlight.icao24
            );
            if (currentIndex < flights.length - 1) {
              setSelectedFlight(flights[currentIndex + 1]);
            } else {
              // Wrap around to the first flight
              setSelectedFlight(flights[0]);
            }
          }
          break;
        }

        case "?": {
          e.preventDefault();
          setShowHelp((prev) => !prev);
          break;
        }

        // Tool toggles
        case "m":
        case "M": {
          if (!e.ctrlKey && !e.metaKey) {
            onToggleMeasure?.();
          }
          break;
        }

        case "w":
        case "W": {
          if (!e.ctrlKey && !e.metaKey) {
            onToggleWeather?.();
          }
          break;
        }

        case "r":
        case "R": {
          if (!e.ctrlKey && !e.metaKey) {
            onToggleRouteLines?.();
          }
          break;
        }

        case "d":
        case "D": {
          if (!e.ctrlKey && !e.metaKey) {
            onToggleRouteDensity?.();
          }
          break;
        }

        case "t":
        case "T": {
          if (!e.ctrlKey && !e.metaKey) {
            onToggleTerrain?.();
          }
          break;
        }

        // View mode keys 1-9
        case "1":
        case "2":
        case "3":
        case "4":
        case "5":
        case "6":
        case "7":
        case "8":
        case "9": {
          if (!e.ctrlKey && !e.metaKey && !e.altKey) {
            const mode = VIEW_MODE_KEYS[e.key];
            if (mode && onViewModeChange) {
              onViewModeChange(mode);
            }
          }
          break;
        }

        default:
          break;
      }
    },
    [
      flights, selectedFlight, setSelectedFlight, setSearchFocused,
      showHelp, expandSidebar, toggleSidebar,
      onToggleMeasure, onToggleWeather, onToggleRouteLines,
      onToggleRouteDensity, onToggleTerrain, onViewModeChange,
    ]
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [handleKeyDown]);

  return { showHelp, setShowHelp };
}
