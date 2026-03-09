"use client";

import { useEffect, useState, useCallback } from "react";
import type { FlightState } from "@/types/flight";

interface UseKeyboardShortcutsParams {
  flights: FlightState[];
  selectedFlight: FlightState | null;
  setSelectedFlight: (flight: FlightState | null) => void;
  setSearchFocused: () => void;
  expandSidebar: () => void;
  toggleSidebar: () => void;
}

export function useKeyboardShortcuts({
  flights,
  selectedFlight,
  setSelectedFlight,
  setSearchFocused,
  expandSidebar,
  toggleSidebar,
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

        default:
          break;
      }
    },
    [flights, selectedFlight, setSelectedFlight, setSearchFocused, showHelp, expandSidebar, toggleSidebar]
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [handleKeyDown]);

  return { showHelp, setShowHelp };
}
