import type { BeadColor, PatternConfig, ProcessedPattern, ColorUsage } from '../types';
import { findNearestColor } from './colorMatching';

export async function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
}

export function processImage(
  img: HTMLImageElement,
  config: PatternConfig,
  palette: BeadColor[]
): ProcessedPattern {
  const width = config.boardSize.width;
  const height = config.boardSize.height;

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, width, height);

  const imgAspect = img.naturalWidth / img.naturalHeight;
  const boardAspect = width / height;

  let dw: number, dh: number;
  if (imgAspect > boardAspect) {
    dw = width;
    dh = Math.round(width / imgAspect);
  } else {
    dh = height;
    dw = Math.round(height * imgAspect);
  }

  const s = config.imageScale / 100;
  dw = Math.max(1, Math.round(dw * s));
  dh = Math.max(1, Math.round(dh * s));

  const ox = Math.floor((width - dw) / 2) + config.imageOffsetX;
  const oy = Math.floor((height - dh) / 2) + config.imageOffsetY;

  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(img, ox, oy, dw, dh);

  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;

  const grid: { color: BeadColor; x: number; y: number }[][] = [];
  const usage = new Map<string, { color: BeadColor; count: number }>();

  for (let y = 0; y < height; y++) {
    const row: { color: BeadColor; x: number; y: number }[] = [];
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      const nearest = findNearestColor([data[i], data[i + 1], data[i + 2]], palette, config.matchAlgorithm);
      row.push({ color: nearest, x, y });
      const u = usage.get(nearest.code);
      if (u) u.count++;
      else usage.set(nearest.code, { color: nearest, count: 1 });
    }
    grid.push(row);
  }

  const colorUsage: ColorUsage[] = Array.from(usage.values()).sort((a, b) => a.color.code.localeCompare(b.color.code));

  return { pixels: grid, colorUsage, width, height };
}
