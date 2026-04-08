"use client";

import { useState, useEffect } from "react";
import { getMapStyle, getSavedMapStyleId, saveMapStyleId, type MapStyle } from "@/lib/mapStyles";

export function useMapStyle() {
  const [styleId, setStyleId] = useState(getSavedMapStyleId);

  useEffect(() => {
    saveMapStyleId(styleId);
  }, [styleId]);

  const style: MapStyle = getMapStyle(styleId);

  return { style, styleId, setStyleId } as const;
}
