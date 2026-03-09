"use client";

import { Marker, Popup } from "react-leaflet";
import { useMemo } from "react";
import { createPlaneIcon } from "@/lib/planeIcon";
import FlightPopup from "./FlightPopup";
import type { FlightState } from "@/types/flight";

interface Props {
  flight: FlightState;
  isSelected: boolean;
  onClick: () => void;
}

export default function PlaneMarker({ flight, isSelected, onClick }: Props) {
  const icon = useMemo(
    () => createPlaneIcon(flight.trueTrack ?? 0, isSelected),
    [flight.trueTrack, isSelected]
  );

  if (flight.latitude === null || flight.longitude === null) return null;

  return (
    <Marker
      position={[flight.latitude, flight.longitude]}
      icon={icon}
      eventHandlers={{ click: onClick }}
    >
      <Popup>
        <FlightPopup flight={flight} />
      </Popup>
    </Marker>
  );
}
