import type { BeadColor, KitSize } from '../types';
import { MARD_221 } from './mard221';

export { MARD_221 };

// Generate kit subsets by evenly sampling from each series
function generateKitColors(allColors: BeadColor[], targetSize: number): BeadColor[] {
  const seriesMap = new Map<string, BeadColor[]>();
  for (const c of allColors) {
    if (!seriesMap.has(c.series)) seriesMap.set(c.series, []);
    seriesMap.get(c.series)!.push(c);
  }

  const series = Array.from(seriesMap.values());
  const total = allColors.length;
  const result: BeadColor[] = [];

  for (const s of series) {
    const count = Math.round((s.length / total) * targetSize);
    const step = Math.max(1, Math.floor(s.length / count));
    for (let i = 0; i < count && i * step < s.length; i++) {
      result.push(s[i * step]);
    }
  }

  // Deduplicate and sort by code
  const seen = new Set<string>();
  const unique = result.filter(c => {
    if (seen.has(c.code)) return false;
    seen.add(c.code);
    return true;
  });

  unique.sort((a, b) => a.code.localeCompare(b.code));

  // If we overshot, trim from the end
  if (unique.length > targetSize) {
    return unique.slice(0, targetSize);
  }
  // If we undershot, fill with remaining colors
  if (unique.length < targetSize) {
    const used = new Set(unique.map(c => c.code));
    const remaining = allColors.filter(c => !used.has(c.code));
    return [...unique, ...remaining.slice(0, targetSize - unique.length)];
  }
  return unique;
}

const KIT_COLORS: Record<KitSize, BeadColor[]> = {
  24: generateKitColors(MARD_221, 24),
  48: generateKitColors(MARD_221, 48),
  72: generateKitColors(MARD_221, 72),
  144: generateKitColors(MARD_221, 144),
  221: MARD_221,
};

export function getAvailableColors(kitSize: KitSize | null): BeadColor[] {
  if (kitSize === null) return MARD_221;
  return KIT_COLORS[kitSize];
}
