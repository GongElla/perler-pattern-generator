import type { BeadColor, PatternConfig, ProcessedPattern, ColorUsage } from '../types';
import { findNearestColor } from './colorMatching';
import { calcImageRect } from './layout';

export async function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
    img.onerror = (e) => { URL.revokeObjectURL(url); reject(e); };
    img.src = url;
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

  const rect = calcImageRect(img.naturalWidth, img.naturalHeight, width, height, config);

  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(img, rect.x, rect.y, rect.width, rect.height);

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
