import type { ProcessedPattern } from '../types';

interface RenderOptions {
  showGrid: boolean;
  showCodes: boolean;
  showSeams: boolean;
}

const CELL_SIZE = 30;
const MAX_CELL_SIZE = 48;
const MAX_CANVAS_WIDTH = 6000;
export const MARGIN = 32;

export function calculateCanvasDimensions(pattern: ProcessedPattern): {
  canvasWidth: number;
  canvasHeight: number;
  cellSize: number;
  patternWidth: number;
  patternHeight: number;
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

  return {
    canvasWidth: gridW + MARGIN * 2,
    canvasHeight: gridH + MARGIN * 2,
    cellSize,
    patternWidth: gridW,
    patternHeight: gridH,
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
}

export function drawStatsForExport(
  canvas: HTMLCanvasElement,
  pattern: ProcessedPattern
): void {
  if (pattern.colorUsage.length === 0) return;

  const origW = canvas.width;
  const origH = canvas.height;

  // Save original content before resizing
  const save = document.createElement('canvas');
  save.width = origW;
  save.height = origH;
  save.getContext('2d')!.drawImage(canvas, 0, 0);

  const dims = calculateCanvasDimensions(pattern);

  const COLS = 8;
  const colW = dims.patternWidth / COLS;
  const SWATCH = Math.round(colW * 0.28);
  const FONT = Math.round(colW * 0.12);
  const TITLE_FONT = Math.round(colW * 0.14);
  const ROW_H = Math.round(colW * 0.38);
  const TITLE_H = Math.round(colW * 0.24);
  const GAP = Math.round(colW * 0.32);
  const PAD = Math.round(colW * 0.06);
  const RADIUS = Math.round(colW * 0.04);

  const rows = Math.ceil(pattern.colorUsage.length / COLS);
  const statsH = TITLE_H + rows * ROW_H + GAP;

  canvas.height = origH + statsH;
  const ctx = canvas.getContext('2d')!;

  // Restore original pattern
  ctx.drawImage(save, 0, 0);

  // White background for stats area
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, origH, canvas.width, statsH);

  const tableY = origH + GAP;
  const tableX = (canvas.width - dims.patternWidth) / 2;

  // Title
  ctx.fillStyle = '#333';
  ctx.font = `bold ${TITLE_FONT}px sans-serif`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(
    `颜色用量统计（共 ${pattern.colorUsage.length} 种颜色，${pattern.width * pattern.height} 颗豆子）`,
    tableX,
    tableY
  );

  const rowsY = tableY + TITLE_H;

  for (let r = 0; r < rows; r++) {
    const ry = rowsY + r * ROW_H;
    for (let c = 0; c < COLS; c++) {
      const idx = r * COLS + c;
      if (idx >= pattern.colorUsage.length) break;

      const item = pattern.colorUsage[idx];
      const cx = tableX + c * colW;

      ctx.fillStyle = idx % 2 === 0 ? '#fafafa' : '#fff';
      ctx.fillRect(cx + 0.5, ry + 0.5, colW - 1, ROW_H - 1);

      const swatchY = ry + (ROW_H - SWATCH) / 2;
      ctx.fillStyle = item.color.hex;
      roundRect(ctx, cx + PAD, swatchY, SWATCH, SWATCH, RADIUS);
      ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,0.15)';
      ctx.lineWidth = Math.max(0.5, colW * 0.008);
      roundRect(ctx, cx + PAD, swatchY, SWATCH, SWATCH, RADIUS);
      ctx.stroke();

      ctx.fillStyle = '#333';
      ctx.font = `${FONT}px sans-serif`;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(
        `${item.color.code} ×${item.count}`,
        cx + PAD + SWATCH + 8,
        ry + ROW_H / 2
      );
    }
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
