"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import type { Anomaly } from "@/types/anomaly";

function playAlertBeep(): void {
  try {
    const ctx = new AudioContext();
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();

    oscillator.connect(gain);
    gain.connect(ctx.destination);

    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(880, ctx.currentTime);

    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);

    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + 0.3);

    oscillator.onended = () => {
      ctx.close();
    };
  } catch {
    // Web Audio API not available; silently ignore
  }
}

function anomalyKey(anomaly: Anomaly): string {
  return `${anomaly.icao24}:${anomaly.type}`;
}

export function useNotifications(anomalies: Anomaly[]): {
  notificationsEnabled: boolean;
  requestPermission: () => void;
} {
  const [notificationsEnabled, setNotificationsEnabled] = useState(() => {
    if (typeof window !== "undefined" && "Notification" in window) {
      return Notification.permission === "granted";
    }
    return false;
  });
  const seenRef = useRef<Set<string>>(new Set());
  const hasRequestedRef = useRef(false);

  const requestPermission = useCallback(async () => {
    if (typeof window === "undefined" || !("Notification" in window)) return;

    try {
      const result = await Notification.requestPermission();
      setNotificationsEnabled(result === "granted");
    } catch {
      // Permission request failed; silently ignore
    }
  }, []);

  useEffect(() => {
    const criticalAnomalies = anomalies.filter((a) => a.severity === "critical");

    if (criticalAnomalies.length === 0) return;

    // On first critical anomaly, request permission if we haven't yet
    if (
      !hasRequestedRef.current &&
      typeof window !== "undefined" &&
      "Notification" in window &&
      Notification.permission === "default"
    ) {
      hasRequestedRef.current = true;
      Notification.requestPermission().then((result) => {
        setNotificationsEnabled(result === "granted");
      });
    }

    for (const anomaly of criticalAnomalies) {
      const key = anomalyKey(anomaly);

      if (seenRef.current.has(key)) continue;
      seenRef.current.add(key);

      // Play alert sound
      playAlertBeep();

      // Show browser notification if permitted
      if (
        typeof window !== "undefined" &&
        "Notification" in window &&
        Notification.permission === "granted"
      ) {
        new Notification("Emergency Alert", {
          body: anomaly.message,
          tag: key,
          requireInteraction: true,
        });
      }
    }
  }, [anomalies]);

  return { notificationsEnabled, requestPermission };
}
