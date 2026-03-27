"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import type { FlightEvent } from "@/types/events";

const MAX_EVENTS = 100;
const RECONNECT_DELAY = 10000;
const MAX_RETRIES = 3;

export function useEvents() {
  const [events, setEvents] = useState<FlightEvent[]>([]);
  const [connected, setConnected] = useState(false);
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const retriesRef = useRef(0);

  const connect = useCallback(() => {
    if (retriesRef.current >= MAX_RETRIES) return; // Stop trying
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    const es = new EventSource("/api/events");
    eventSourceRef.current = es;

    es.onopen = () => {
      setConnected(true);
      retriesRef.current = 0; // Reset on success
    };

    es.onmessage = (e) => {
      try {
        const event: FlightEvent = JSON.parse(e.data);
        setEvents((prev) => [event, ...prev].slice(0, MAX_EVENTS));
      } catch {
        // Ignore malformed messages
      }
    };

    es.onerror = () => {
      setConnected(false);
      es.close();
      eventSourceRef.current = null;
      retriesRef.current++;

      if (retriesRef.current < MAX_RETRIES) {
        reconnectTimeoutRef.current = setTimeout(connect, RECONNECT_DELAY);
      }
    };
  }, []);

  useEffect(() => {
    connect();

    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [connect]);

  const clearEvents = useCallback(() => setEvents([]), []);

  return { events, connected, clearEvents };
}
