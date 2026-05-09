export interface BeadColor {
  code: string;
  name: string;
  hex: string;
  rgb: [number, number, number];
  series: string;
}

export type BeadType = 'mini' | 'standard';

export interface BoardSize {
  width: number;
  height: number;
  label: string;
}

export type KitSize = 24 | 48 | 72 | 96 | 120 | 221;

export interface PatternConfig {
  beadType: BeadType;
  boardSize: BoardSize;
  kitSize: KitSize | null; // null means unlimited (291)
  imageScale: number; // 10-100, percentage of board the image occupies
  imageOffsetX: number; // manual image offset in cells
  imageOffsetY: number;
  showGrid: boolean;
  showCodes: boolean;
  matchAlgorithm: 'euclidean' | 'ciede2000';
}

export interface PatternPixel {
  color: BeadColor;
  x: number;
  y: number;
}

export interface ColorUsage {
  color: BeadColor;
  count: number;
}

export interface ProcessedPattern {
  pixels: PatternPixel[][];
  colorUsage: ColorUsage[];
  width: number;
  height: number;
}
