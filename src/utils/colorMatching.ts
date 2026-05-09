import type { BeadColor } from '../types';

function euclideanDistance(rgb1: [number, number, number], rgb2: [number, number, number]): number {
  const dr = rgb1[0] - rgb2[0];
  const dg = rgb1[1] - rgb2[1];
  const db = rgb1[2] - rgb2[2];
  return dr * dr + dg * dg + db * db;
}

// CIEDE2000 implementation adapted from https://github.com/markusn/color-diff
function deg2Rad(deg: number) { return (deg * Math.PI) / 180; }
function rad2Deg(rad: number) { return (rad * 180) / Math.PI; }

function ciede2000(rgb1: [number, number, number], rgb2: [number, number, number]): number {
  const lab1 = rgbToLab(rgb1);
  const lab2 = rgbToLab(rgb2);

  const [L1, a1, b1] = lab1;
  const [L2, a2, b2] = lab2;

  const kL = 1, kC = 1, kH = 1;
  const avgL = (L1 + L2) / 2;

  const C1 = Math.sqrt(a1 * a1 + b1 * b1);
  const C2 = Math.sqrt(a2 * a2 + b2 * b2);
  const avgC = (C1 + C2) / 2;

  const G = 0.5 * (1 - Math.sqrt(Math.pow(avgC, 7) / (Math.pow(avgC, 7) + Math.pow(25, 7))));
  const a1p = a1 * (1 + G);
  const a2p = a2 * (1 + G);

  const C1p = Math.sqrt(a1p * a1p + b1 * b1);
  const C2p = Math.sqrt(a2p * a2p + b2 * b2);
  const avgCp = (C1p + C2p) / 2;

  let h1p = rad2Deg(Math.atan2(b1, a1p));
  if (h1p < 0) h1p += 360;

  let h2p = rad2Deg(Math.atan2(b2, a2p));
  if (h2p < 0) h2p += 360;

  const avgHp = Math.abs(h1p - h2p) > 180
    ? (h1p + h2p + 360) / 2
    : (h1p + h2p) / 2;

  const T = 1
    - 0.17 * Math.cos(deg2Rad(avgHp - 30))
    + 0.24 * Math.cos(deg2Rad(2 * avgHp))
    + 0.32 * Math.cos(deg2Rad(3 * avgHp + 6))
    - 0.20 * Math.cos(deg2Rad(4 * avgHp - 63));

  let dHp = h2p - h1p;
  if (Math.abs(dHp) > 180) {
    dHp = h2p <= h1p ? dHp + 360 : dHp - 360;
  }
  dHp = 2 * Math.sqrt(C1p * C2p) * Math.sin(deg2Rad(dHp) / 2);

  const dLp = L2 - L1;
  const dCp = C2p - C1p;

  const SL = 1 + (0.015 * (avgL - 50) * (avgL - 50)) / Math.sqrt(20 + (avgL - 50) * (avgL - 50));
  const SC = 1 + 0.045 * avgCp;
  const SH = 1 + 0.015 * avgCp * T;

  const dTheta = 30 * Math.exp(-((avgHp - 275) / 25) * ((avgHp - 275) / 25));
  const RC = 2 * Math.sqrt(Math.pow(avgCp, 7) / (Math.pow(avgCp, 7) + Math.pow(25, 7)));
  const RT = -RC * Math.sin(deg2Rad(2 * dTheta));

  const term1 = dLp / (kL * SL);
  const term2 = dCp / (kC * SC);
  const term3 = dHp / (kH * SH);

  return Math.sqrt(term1 * term1 + term2 * term2 + term3 * term3 + RT * (term2 * term3));
}

function rgbToLab(rgb: [number, number, number]): [number, number, number] {
  // Simplified RGB -> XYZ -> Lab conversion
  let r = rgb[0] / 255;
  let g = rgb[1] / 255;
  let b = rgb[2] / 255;

  r = r > 0.04045 ? Math.pow((r + 0.055) / 1.055, 2.4) : r / 12.92;
  g = g > 0.04045 ? Math.pow((g + 0.055) / 1.055, 2.4) : g / 12.92;
  b = b > 0.04045 ? Math.pow((b + 0.055) / 1.055, 2.4) : b / 12.92;

  let x = (r * 0.4124 + g * 0.3576 + b * 0.1805) / 0.95047;
  let y = (r * 0.2126 + g * 0.7152 + b * 0.0722) / 1.00000;
  let z = (r * 0.0193 + g * 0.1192 + b * 0.9505) / 1.08883;

  x = x > 0.008856 ? Math.pow(x, 1 / 3) : 7.787 * x + 16 / 116;
  y = y > 0.008856 ? Math.pow(y, 1 / 3) : 7.787 * y + 16 / 116;
  z = z > 0.008856 ? Math.pow(z, 1 / 3) : 7.787 * z + 16 / 116;

  const L = 116 * y - 16;
  const a = 500 * (x - y);
  const b_ = 200 * (y - z);
  return [L, a, b_];
}

export function findNearestColor(
  target: [number, number, number],
  palette: BeadColor[],
  algorithm: 'euclidean' | 'ciede2000' = 'ciede2000'
): BeadColor {
  const distanceFn = algorithm === 'ciede2000' ? ciede2000 : euclideanDistance;

  let minDist = Infinity;
  let nearest = palette[0];

  for (const color of palette) {
    const dist = distanceFn(target, color.rgb);
    if (dist < minDist) {
      minDist = dist;
      nearest = color;
    }
  }

  return nearest;
}
