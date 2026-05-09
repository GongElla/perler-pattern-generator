import type { BeadColor, KitSize } from '../types';
import { MARD_291 } from './mard291';

export { MARD_291 };

function buildKit(codes: string[]): BeadColor[] {
  const codeSet = new Set(codes);
  return MARD_291.filter(c => codeSet.has(c.code));
}

const KIT_24_CODES = [
  'A4','A6','A7','B3','B5','B8','C3','C5','C8','D6','D7','D9',
  'E2','E4','F5','G1','G5','G7','H1','H2','H3','H4','H5','H7',
];

const KIT_48_CODES = [
  'A4','A6','A7','A10','A11','A13','B3','B5','B8','B12',
  'C2','C3','C5','C6','C7','C8','C10','C11','C13',
  'D3','D6','D7','D9','D13','D15','D18','D19','D21',
  'E2','E3','E4','E7','E8','F5','F8','F13',
  'G1','G5','G7','G8','G9','G13',
  'H1','H2','H3','H4','H5','H7',
];

const KIT_72_CODES = [
  'A3','A4','A6','A7','A10','A11','A13',
  'B3','B5','B7','B8','B10','B12','B14','B17','B18','B19','B20',
  'C2','C3','C5','C6','C7','C8','C10','C11','C13','C16',
  'D2','D3','D6','D7','D8','D9','D11','D12','D13','D14','D15','D16','D18','D19','D20','D21',
  'E1','E2','E3','E4','E5','E7','E8','E12','E13',
  'F5','F7','F8','F10','F13',
  'G1','G2','G3','G5','G7','G8','G9','G13',
  'H1','H2','H3','H4','H5','H7',
];

const KIT_96_CODES = [
  'A3','A4','A6','A7','A10','A11','A13','A14',
  'B3','B5','B7','B8','B10','B12','B14','B17','B18','B19','B20',
  'C2','C3','C5','C6','C7','C8','C10','C11','C13','C16',
  'D2','D3','D5','D6','D7','D8','D9','D11','D12','D13','D14','D15','D16','D18','D19','D20','D21',
  'E1','E2','E3','E4','E5','E6','E7','E8','E9','E10','E11','E12','E13','E14','E15',
  'F1','F2','F3','F4','F5','F6','F7','F8','F9','F10','F11','F12','F13','F14',
  'G1','G2','G3','G5','G7','G8','G9','G13','G14','G17',
  'H1','H2','H3','H4','H5','H6','H7',
  'M5','M6','M9','M12',
];

const KIT_120_CODES = [
  'A1','A3','A4','A5','A6','A7','A8','A9','A10','A11','A12','A13','A14','A15',
  'B1','B2','B3','B4','B5','B6','B7','B8','B10','B11','B12','B13','B14','B15','B16','B17','B18','B19','B20',
  'C1','C2','C3','C4','C5','C6','C7','C8','C9','C10','C11','C13','C14','C15','C16','C17',
  'D1','D2','D3','D5','D6','D7','D8','D9','D11','D12','D13','D14','D15','D16','D17','D18','D19','D20','D21',
  'E1','E2','E3','E4','E5','E6','E7','E8','E9','E10','E11','E12','E13','E14','E15',
  'F1','F2','F3','F4','F5','F6','F7','F8','F9','F10','F11','F12','F13','F14',
  'G1','G2','G3','G5','G6','G7','G8','G9','G13','G14','G17',
  'H1','H2','H3','H4','H5','H6','H7','H12',
  'M5','M6','M9','M12',
];

// 221 = all series A through M
const SERIES_221 = new Set(['A','B','C','D','E','F','G','H','M']);

const KIT_COLORS: Record<KitSize, BeadColor[]> = {
  24: buildKit(KIT_24_CODES),
  48: buildKit(KIT_48_CODES),
  72: buildKit(KIT_72_CODES),
  96: buildKit(KIT_96_CODES),
  120: buildKit(KIT_120_CODES),
  221: MARD_291.filter(c => SERIES_221.has(c.series)),
};

export function getAvailableColors(kitSize: KitSize | null): BeadColor[] {
  if (kitSize === null) return MARD_291;
  return KIT_COLORS[kitSize];
}
