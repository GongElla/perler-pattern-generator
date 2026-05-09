import type { PatternConfig } from '../types';

export interface ImageRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Compute where the uploaded image should be drawn within the pattern grid.
 * `extraOffset` is used during drag to preview position before committing.
 */
export function calcImageRect(
  imgNaturalW: number,
  imgNaturalH: number,
  boardW: number,
  boardH: number,
  config: PatternConfig,
  extraOffsetX = 0,
  extraOffsetY = 0,
): ImageRect {
  const imgAspect = imgNaturalW / imgNaturalH;
  const boardAspect = boardW / boardH;

  let dw: number, dh: number;
  if (imgAspect > boardAspect) {
    dw = boardW;
    dh = Math.round(boardW / imgAspect);
  } else {
    dh = boardH;
    dw = Math.round(boardH * imgAspect);
  }

  const s = config.imageScale / 100;
  dw = Math.max(1, Math.round(dw * s));
  dh = Math.max(1, Math.round(dh * s));

  return {
    x: Math.floor((boardW - dw) / 2) + config.imageOffsetX + extraOffsetX,
    y: Math.floor((boardH - dh) / 2) + config.imageOffsetY + extraOffsetY,
    width: dw,
    height: dh,
  };
}
