"use client";

import {
  useState,
  useRef,
  useCallback,
  useEffect,
  useMemo,
  type JSX,
} from "react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import type { FlightState } from "@/types/flight";
import type { FlightHistoryMap } from "@/lib/flightHistory";

// ---------------------------------------------------------------------------
// Exported helper: filter & interpolate flights at a given replay timestamp
// ---------------------------------------------------------------------------

export function filterFlightsByReplayTime(
  flights: FlightState[],
  history: FlightHistoryMap,
  replayTime: number,
): FlightState[] {
  const result: FlightState[] = [];

  for (const flight of flights) {
    const entries = history.get(flight.icao24);
    if (!entries || entries.length === 0) continue;

    const first = entries[0];
    const last = entries[entries.length - 1];

    // Flight hadn't appeared yet at the replay time
    if (first.timestamp > replayTime) continue;

    // Replay time is past the last recorded position -- keep visible briefly
    if (last.timestamp < replayTime) {
      if (replayTime - last.timestamp > 15_000) continue;
      result.push({
        ...flight,
        latitude: last.lat,
        longitude: last.lon,
        baroAltitude: last.altitude,
        trueTrack: last.heading,
        velocity: last.velocity,
      });
      continue;
    }

    // Find the two surrounding entries for interpolation
    let before = entries[0];
    let after = entries[entries.length - 1];

    for (let i = 0; i < entries.length - 1; i++) {
      if (
        entries[i].timestamp <= replayTime &&
        entries[i + 1].timestamp >= replayTime
      ) {
        before = entries[i];
        after = entries[i + 1];
        break;
      }
    }

    const span = after.timestamp - before.timestamp;
    const t = span > 0 ? (replayTime - before.timestamp) / span : 0;

    const lerp = (a: number | null, b: number | null): number | null => {
      if (a === null || b === null) return b ?? a;
      return a + (b - a) * t;
    };

    // Interpolate heading with 360-degree wrap handling
    let interpHeading: number | null = null;
    if (before.heading !== null && after.heading !== null) {
      let diff = after.heading - before.heading;
      if (diff > 180) diff -= 360;
      if (diff < -180) diff += 360;
      interpHeading = (((before.heading + diff * t) % 360) + 360) % 360;
    } else {
      interpHeading = after.heading ?? before.heading;
    }

    result.push({
      ...flight,
      latitude: lerp(before.lat, after.lat),
      longitude: lerp(before.lon, after.lon),
      baroAltitude: lerp(before.altitude, after.altitude),
      trueTrack: interpHeading,
      velocity: lerp(before.velocity, after.velocity),
    });
  }

  return result;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const SPEED_OPTIONS = [1, 2, 4, 8] as const;
type SpeedMultiplier = (typeof SPEED_OPTIONS)[number];

// ---------------------------------------------------------------------------
// Format helpers
// ---------------------------------------------------------------------------

function formatTime(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleTimeString("en-US", {
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function formatDuration(ms: number): string {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

// ---------------------------------------------------------------------------
// SVG icon paths
// ---------------------------------------------------------------------------

const ICON_PLAY =
  "M6.3 2.841A1.5 1.5 0 004 4.11v15.78a1.5 1.5 0 002.3 1.269l12.6-7.89a1.5 1.5 0 000-2.538L6.3 2.84z";
const ICON_PAUSE_LEFT = "M6.75 5.25a.75.75 0 01.75-.75H9a.75.75 0 01.75.75v13.5a.75.75 0 01-.75.75H7.5a.75.75 0 01-.75-.75V5.25z";
const ICON_PAUSE_RIGHT = "M14.25 5.25a.75.75 0 01.75-.75H16.5a.75.75 0 01.75.75v13.5a.75.75 0 01-.75.75H15a.75.75 0 01-.75-.75V5.25z";
const ICON_RESTART =
  "M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182M21.015 4.356v4.992";
const ICON_CLOSE = "M6 18L18 6M6 6l12 12";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface ReplayControlsProps {
  flightHistory: FlightHistoryMap;
  flights: FlightState[];
  isActive: boolean;
  onToggle: () => void;
  onReplayTimeChange?: (replayTime: number | null) => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function ReplayControls({
  flightHistory,
  flights,
  isActive,
  onToggle,
  onReplayTimeChange,
}: ReplayControlsProps): JSX.Element | null {
  // -- State ---------------------------------------------------------------
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState<SpeedMultiplier>(1);
  const [playhead, setPlayhead] = useState(0); // normalised 0..1
  const [visible, setVisible] = useState(false);

  const rafRef = useRef<number>(0);
  const lastFrameRef = useRef<number>(0);

  // -- Animate mount / unmount ---------------------------------------------
  useEffect(() => {
    if (isActive) {
      const id = requestAnimationFrame(() => setVisible(true));
      return () => cancelAnimationFrame(id);
    }
    setVisible(false);
    setIsPlaying(false);
    setPlayhead(0);
  }, [isActive]);

  // -- Time range ----------------------------------------------------------
  const { minTime, maxTime } = useMemo(() => {
    let min = Infinity;
    let max = -Infinity;

    for (const entries of flightHistory.values()) {
      for (const e of entries) {
        if (e.timestamp < min) min = e.timestamp;
        if (e.timestamp > max) max = e.timestamp;
      }
    }

    if (!isFinite(min) || !isFinite(max)) {
      const now = Date.now();
      return { minTime: now - 60_000, maxTime: now };
    }

    // Guarantee at least a 10 s window
    if (max - min < 10_000) {
      return { minTime: min, maxTime: min + 10_000 };
    }

    return { minTime: min, maxTime: max };
  }, [flightHistory]);

  const duration = maxTime - minTime;
  const currentReplayTime = minTime + playhead * duration;

  // -- Notify parent of replay time changes --------------------------------
  useEffect(() => {
    if (!isActive) {
      onReplayTimeChange?.(null);
      return;
    }
    onReplayTimeChange?.(currentReplayTime);
  }, [isActive, currentReplayTime, onReplayTimeChange]);

  // -- Animation loop ------------------------------------------------------
  const tick = useCallback(
    (now: number) => {
      if (!lastFrameRef.current) {
        lastFrameRef.current = now;
      }
      const delta = now - lastFrameRef.current;
      lastFrameRef.current = now;

      setPlayhead((prev) => {
        const next = prev + (delta * speed) / duration;
        if (next >= 1) {
          setIsPlaying(false);
          return 1;
        }
        return next;
      });

      rafRef.current = requestAnimationFrame(tick);
    },
    [speed, duration],
  );

  useEffect(() => {
    if (isPlaying) {
      lastFrameRef.current = 0;
      rafRef.current = requestAnimationFrame(tick);
    } else {
      cancelAnimationFrame(rafRef.current);
    }
    return () => cancelAnimationFrame(rafRef.current);
  }, [isPlaying, tick]);

  // -- Handlers ------------------------------------------------------------
  const handlePlayPause = useCallback(() => {
    if (playhead >= 1) {
      setPlayhead(0);
      setIsPlaying(true);
    } else {
      setIsPlaying((p) => !p);
    }
  }, [playhead]);

  const handleSliderChange = useCallback(
    (val: number | readonly number[]) => {
      const v = Array.isArray(val) ? val[0] : val;
      setPlayhead(v / 1000);
      if (isPlaying) setIsPlaying(false);
    },
    [isPlaying],
  );

  const cycleSpeed = useCallback(() => {
    setSpeed((prev) => {
      const idx = SPEED_OPTIONS.indexOf(prev);
      return SPEED_OPTIONS[(idx + 1) % SPEED_OPTIONS.length];
    });
  }, []);

  const handleClose = useCallback(() => {
    setIsPlaying(false);
    setPlayhead(0);
    onToggle();
  }, [onToggle]);

  // -- Count active flights at this time -----------------------------------
  const activeCount = useMemo(() => {
    if (!isActive) return 0;
    let count = 0;
    for (const entries of flightHistory.values()) {
      if (entries.length === 0) continue;
      const first = entries[0].timestamp;
      const last = entries[entries.length - 1].timestamp;
      if (first <= currentReplayTime && currentReplayTime <= last + 15_000) {
        count++;
      }
    }
    return count;
  }, [isActive, flightHistory, currentReplayTime]);

  // -- Render nothing if not active ----------------------------------------
  if (!isActive) return null;

  const atEnd = playhead >= 1;
  const elapsed = playhead * duration;
  const remaining = duration - elapsed;

  return (
    <div
      className={`
        fixed bottom-20 left-1/2 -translate-x-1/2 z-[1100]
        transition-all duration-300 ease-out
        ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4 pointer-events-none"}
      `}
    >
      <div className="bg-gray-950/90 backdrop-blur-xl border border-gray-800 rounded-xl shadow-2xl shadow-black/40 px-4 py-3 min-w-[480px] max-w-[600px]">
        {/* Top row: time display + flight count */}
        <div className="flex items-center justify-between mb-2.5 px-0.5">
          <div className="flex items-center gap-2">
            {/* Replay indicator dot */}
            <span
              className={`inline-block w-2 h-2 rounded-full ${
                isPlaying
                  ? "bg-slate-400 animate-pulse"
                  : "bg-gray-500"
              }`}
            />
            <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">
              Replay
            </span>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs text-gray-500">
              {activeCount} flight{activeCount !== 1 ? "s" : ""}
            </span>
            <span className="text-sm font-mono text-slate-300 tabular-nums">
              {formatTime(currentReplayTime)}
            </span>
          </div>
        </div>

        {/* Slider row */}
        <div className="flex items-center gap-3 mb-2.5">
          <span className="text-[10px] font-mono text-gray-500 tabular-nums w-10 text-right shrink-0">
            {formatDuration(elapsed)}
          </span>

          <div className="flex-1 relative">
            <Slider
              min={0}
              max={1000}
              value={[Math.round(playhead * 1000)]}
              onValueChange={handleSliderChange}
              className="w-full"
            />
            {/* Progress glow effect */}
            <div
              className="absolute top-1/2 left-0 h-1 -translate-y-1/2 rounded-full bg-slate-500/20 blur-sm pointer-events-none"
              style={{ width: `${playhead * 100}%` }}
            />
          </div>

          <span className="text-[10px] font-mono text-gray-500 tabular-nums w-10 shrink-0">
            -{formatDuration(remaining)}
          </span>
        </div>

        {/* Controls row */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            {/* Play / Pause / Restart */}
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={handlePlayPause}
              className="text-gray-300 hover:text-white hover:bg-gray-800/80"
              aria-label={atEnd ? "Restart" : isPlaying ? "Pause" : "Play"}
            >
              <svg
                className="w-4 h-4"
                fill={atEnd ? "none" : isPlaying ? "currentColor" : "currentColor"}
                stroke={atEnd ? "currentColor" : "none"}
                viewBox="0 0 24 24"
                strokeWidth={atEnd ? 1.5 : 0}
              >
                {atEnd ? (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d={ICON_RESTART}
                  />
                ) : isPlaying ? (
                  <>
                    <path d={ICON_PAUSE_LEFT} />
                    <path d={ICON_PAUSE_RIGHT} />
                  </>
                ) : (
                  <path d={ICON_PLAY} />
                )}
              </svg>
            </Button>

            {/* Speed selector */}
            <Button
              variant="ghost"
              size="sm"
              onClick={cycleSpeed}
              className="text-gray-400 hover:text-white hover:bg-gray-800/80 font-mono text-xs min-w-[40px] tabular-nums"
              aria-label={`Playback speed: ${speed}x`}
            >
              {speed}x
            </Button>
          </div>

          {/* Time range labels */}
          <div className="flex items-center gap-1.5 text-[10px] text-gray-600 font-mono tabular-nums">
            <span>{formatTime(minTime)}</span>
            <span className="text-gray-700">--</span>
            <span>{formatTime(maxTime)}</span>
          </div>

          {/* Close button */}
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={handleClose}
            className="text-gray-500 hover:text-slate-300 hover:bg-gray-800/80"
            aria-label="Close replay"
          >
            <svg
              className="w-3.5 h-3.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d={ICON_CLOSE}
              />
            </svg>
          </Button>
        </div>
      </div>
    </div>
  );
}
