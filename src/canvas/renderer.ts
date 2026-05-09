import type { ProcessedPattern } from '../types';

interface RenderOptions {
  showGrid: boolean;
  showCodes: boolean;
  showSeams: boolean;
}

const CELL_SIZE = 30;
const MAX_CELL_SIZE = 48;
const MAX_CANVAS_WIDTH = 6000;
const STATS_MIN_COL_WIDTH = 220;
const STATS_ROW_HEIGHT = 64;
const STATS_SWATCH = 40;
const STATS_ITEM_FONT = 22;
const STATS_TITLE_FONT = 26;
const MARGIN = 32;
const STATS_GAP = 64;

export function calculateCanvasDimensions(pattern: ProcessedPattern): {
  canvasWidth: number;
  canvasHeight: number;
  cellSize: number;
  patternWidth: number;
  patternHeight: number;
  statsHeight: number;
  statsCols: number;
} {
  const pw = pattern.width;
  const ph = pattern.height;
  const maxDim = Math.max(pw, ph, 16);

  let cellSize = Math.min(MAX_CELL_SIZE, Math.max(CELL_SIZE, Math.floor(MAX_CANVAS_WIDTH / maxDim)));

  let gridW = pw * cellSize;
  let gridH = ph * cellSize;

  if (gridW > MAX_CANVAS_WIDTH) {
    cellSize = Math.floor(MAX_CANVAS_WIDTH / pw);
    gridW = pw * cellSize;
    gridH = ph * cellSize;
  }

  const tableWidth = gridW;
  const statsCols = Math.max(1, Math.floor(tableWidth / STATS_MIN_COL_WIDTH));
  const statsRows = pattern.colorUsage.length > 0
    ? Math.ceil(pattern.colorUsage.length / statsCols)
    : 0;
  const statsHeight = statsRows > 0
    ? statsRows * STATS_ROW_HEIGHT + STATS_TITLE_FONT + 14 + STATS_GAP
    : 0;

  const canvasWidth = gridW + MARGIN * 2;
  const canvasHeight = gridH + MARGIN * 2 + statsHeight;

  return {
    canvasWidth,
    canvasHeight,
    cellSize,
    patternWidth: gridW,
    patternHeight: gridH,
    statsHeight,
    statsCols,
  };
}

export function renderPattern(
  canvas: HTMLCanvasElement,
  pattern: ProcessedPattern,
  options: RenderOptions
): void {
  const dims = calculateCanvasDimensions(pattern);
  canvas.width = dims.canvasWidth;
  canvas.height = dims.canvasHeight;

  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const startX = (canvas.width - dims.patternWidth) / 2;
  const startY = MARGIN;

  // Draw beads (rounded rects)
  const radius = Math.max(3, dims.cellSize * 0.28);
  const gap = Math.max(1, Math.floor(dims.cellSize * 0.08));

  for (let y = 0; y < pattern.height; y++) {
    for (let x = 0; x < pattern.width; x++) {
      const px = pattern.pixels[y][x];
      const bx = startX + x * dims.cellSize + gap / 2;
      const by = startY + y * dims.cellSize + gap / 2;
      const bw = dims.cellSize - gap;
      const bh = dims.cellSize - gap;

      ctx.fillStyle = px.color.hex;
      roundRect(ctx, bx, by, bw, bh, radius);
      ctx.fill();

      ctx.strokeStyle = 'rgba(0,0,0,0.06)';
      ctx.lineWidth = 1;
      roundRect(ctx, bx + 1, by + 1, bw - 2, bh - 2, Math.max(1, radius - 1));
      ctx.stroke();
    }
  }

  // Draw grid lines
  if (options.showGrid) {
    const drawGridLine = (pos: number, isVertical: boolean, lineIndex: number) => {
      const is10th = lineIndex % 10 === 0;
      const is5th = lineIndex % 5 === 0;

      if (is10th) {
        ctx.strokeStyle = 'rgba(0,0,0,0.35)';
        ctx.lineWidth = Math.max(1, dims.cellSize * 0.06);
      } else if (is5th) {
        ctx.strokeStyle = 'rgba(0,0,0,0.2)';
        ctx.lineWidth = Math.max(0.6, dims.cellSize * 0.03);
      } else {
        ctx.strokeStyle = 'rgba(0,0,0,0.08)';
        ctx.lineWidth = 0.3;
      }

      ctx.beginPath();
      if (isVertical) {
        ctx.moveTo(pos, startY);
        ctx.lineTo(pos, startY + dims.patternHeight);
      } else {
        ctx.moveTo(startX, pos);
        ctx.lineTo(startX + dims.patternWidth, pos);
      }
      ctx.stroke();
    };

    for (let x = 0; x <= pattern.width; x++) {
      drawGridLine(startX + x * dims.cellSize, true, x);
    }
    for (let y = 0; y <= pattern.height; y++) {
      drawGridLine(startY + y * dims.cellSize, false, y);
    }
  }

  // Draw seam lines for 104x104 (2x2 of 52x52)
  if (options.showSeams && pattern.width === 104 && pattern.height === 104) {
    ctx.strokeStyle = 'rgba(255,0,0,0.4)';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([6, 4]);

    const midX = startX + 52 * dims.cellSize;
    const midY = startY + 52 * dims.cellSize;

    ctx.beginPath();
    ctx.moveTo(midX, startY);
    ctx.lineTo(midX, startY + dims.patternHeight);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(startX, midY);
    ctx.lineTo(startX + dims.patternWidth, midY);
    ctx.stroke();

    ctx.setLineDash([]);

    ctx.fillStyle = 'rgba(200,0,0,0.6)';
    ctx.font = 'bold 11px sans-serif';
    ctx.fillText('拼接线', midX + 6, startY + 16);
  }

  // Draw color codes on cells
  if (options.showCodes && dims.cellSize >= 14) {
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const fontSize = Math.max(8, Math.floor(dims.cellSize * 0.42));
    ctx.font = `bold ${fontSize}px sans-serif`;

    for (let y = 0; y < pattern.height; y++) {
      for (let x = 0; x < pattern.width; x++) {
        const px = pattern.pixels[y][x];
        const cx = startX + x * dims.cellSize + dims.cellSize / 2;
        const cy = startY + y * dims.cellSize + dims.cellSize / 2;

        const brightness = (px.color.rgb[0] * 299 + px.color.rgb[1] * 587 + px.color.rgb[2] * 114) / 1000;
        ctx.fillStyle = brightness > 130 ? 'rgba(0,0,0,0.65)' : 'rgba(255,255,255,0.9)';
        ctx.fillText(px.color.code, cx, cy);
      }
    }
  }

  // Outer border around the pattern
  ctx.strokeStyle = '#000';
  ctx.lineWidth = Math.max(3, dims.cellSize * 0.1);
  ctx.strokeRect(startX, startY, dims.patternWidth, dims.patternHeight);

  // Draw color usage statistics table
  if (pattern.colorUsage.length > 0) {
    drawStatsTable(ctx, pattern, dims, startX, startY + dims.patternHeight + STATS_GAP);
  }
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
): void {
  const min = Math.min(w, h);
  const radius = Math.min(r, min / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + w - radius, y);
  ctx.arcTo(x + w, y, x + w, y + radius, radius);
  ctx.lineTo(x + w, y + h - radius);
  ctx.arcTo(x + w, y + h, x + w - radius, y + h, radius);
  ctx.lineTo(x + radius, y + h);
  ctx.arcTo(x, y + h, x, y + h - radius, radius);
  ctx.lineTo(x, y + radius);
  ctx.arcTo(x, y, x + radius, y, radius);
  ctx.closePath();
}

function drawStatsTable(
  ctx: CanvasRenderingContext2D,
  pattern: ProcessedPattern,
  dims: ReturnType<typeof calculateCanvasDimensions>,
  tableX: number,
  tableY: number
): void {
  const usage = pattern.colorUsage;
  const cols = dims.statsCols;
  const rows = Math.ceil(usage.length / cols);
  const tableWidth = dims.patternWidth;
  const colWidth = tableWidth / cols;

  // Title
  ctx.fillStyle = '#333';
  ctx.font = `bold ${STATS_TITLE_FONT}px sans-serif`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(
    `颜色用量统计（共 ${usage.length} 种颜色，${pattern.width * pattern.height} 颗豆子）`,
    tableX,
    tableY
  );

  const swatchPad = 12;
  const textGap = 10;
  const startY = tableY + STATS_TITLE_FONT + 14;

  for (let r = 0; r < rows; r++) {
    const rowY = startY + r * STATS_ROW_HEIGHT;
    for (let c = 0; c < cols; c++) {
      const idx = r * cols + c;
      if (idx >= usage.length) break;

      const item = usage[idx];
      const cx = tableX + c * colWidth;

      ctx.fillStyle = idx % 2 === 0 ? '#fafafa' : '#fff';
      ctx.fillRect(cx + 0.5, rowY + 0.5, colWidth - 1, STATS_ROW_HEIGHT - 1);

      const swatchY = rowY + (STATS_ROW_HEIGHT - STATS_SWATCH) / 2;
      ctx.fillStyle = item.color.hex;
      roundRect(ctx, cx + swatchPad, swatchY, STATS_SWATCH, STATS_SWATCH, 6);
      ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,0.15)';
      ctx.lineWidth = 1;
      roundRect(ctx, cx + swatchPad, swatchY, STATS_SWATCH, STATS_SWATCH, 6);
      ctx.stroke();

      ctx.fillStyle = '#333';
      ctx.font = `${STATS_ITEM_FONT}px sans-serif`;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(
        `${item.color.code} ×${item.count}`,
        cx + swatchPad + STATS_SWATCH + textGap,
        rowY + STATS_ROW_HEIGHT / 2
      );
    }
  }

  ctx.strokeStyle = '#ccc';
  ctx.lineWidth = 1;
  ctx.strokeRect(tableX, startY, tableWidth, rows * STATS_ROW_HEIGHT);
}
