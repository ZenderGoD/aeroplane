export const DEFAULT_CENTER: [number, number] = [20, 0];
export const DEFAULT_ZOOM = 3;

export function metersToFeet(m: number): number {
  return Math.round(m * 3.28084);
}

export function msToKnots(ms: number): number {
  return Math.round(ms * 1.94384);
}

export function msToFpm(ms: number): number {
  return Math.round(ms * 196.85);
}

export function formatCallsign(cs: string | null): string {
  return cs?.trim() || "N/A";
}
