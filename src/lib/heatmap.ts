export interface HeatmapCell {
  x: number;
  y: number;
  count: number;
}

const BASE_CELL_SIZE = 20;

// Blue -> Cyan -> Green -> Yellow -> Red
const HEATMAP_COLORS = [
  [30, 58, 138],
  [6, 182, 212],
  [34, 197, 94],
  [234, 179, 8],
  [239, 68, 68],
];

export function getCellSize(zoom: number): number {
  // Larger cells when zoomed out, finer when zoomed in
  if (zoom <= 3) return 30;
  if (zoom <= 5) return 24;
  if (zoom <= 7) return 20;
  return 16;
}

export function computeHeatmapGrid(
  points: { x: number; y: number }[],
  width: number,
  height: number,
  cellSize: number
): { cells: HeatmapCell[]; maxCount: number } {
  const cols = Math.ceil(width / cellSize);
  const rows = Math.ceil(height / cellSize);
  const grid = new Array(cols * rows).fill(0);

  for (const p of points) {
    const col = Math.floor(p.x / cellSize);
    const row = Math.floor(p.y / cellSize);
    if (col >= 0 && col < cols && row >= 0 && row < rows) {
      grid[row * cols + col]++;
    }
  }

  const cells: HeatmapCell[] = [];
  let maxCount = 0;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const count = grid[r * cols + c];
      if (count > 0) {
        cells.push({ x: c * cellSize, y: r * cellSize, count });
        if (count > maxCount) maxCount = count;
      }
    }
  }

  return { cells, maxCount };
}

export function getHeatmapColor(count: number, maxCount: number): string {
  const t = Math.min(count / Math.max(maxCount, 1), 1);
  const idx = t * (HEATMAP_COLORS.length - 1);
  const lo = Math.floor(idx);
  const hi = Math.min(lo + 1, HEATMAP_COLORS.length - 1);
  const frac = idx - lo;

  const r = Math.round(
    HEATMAP_COLORS[lo][0] + frac * (HEATMAP_COLORS[hi][0] - HEATMAP_COLORS[lo][0])
  );
  const g = Math.round(
    HEATMAP_COLORS[lo][1] + frac * (HEATMAP_COLORS[hi][1] - HEATMAP_COLORS[lo][1])
  );
  const b = Math.round(
    HEATMAP_COLORS[lo][2] + frac * (HEATMAP_COLORS[hi][2] - HEATMAP_COLORS[lo][2])
  );
  const alpha = 0.15 + t * 0.55;

  return `rgba(${r},${g},${b},${alpha})`;
}
