import { useEffect, useRef, useCallback, useState } from 'react';
import type { BeadColor, ProcessedPattern, PatternConfig } from '../types';
import { renderPattern } from '../canvas/renderer';
import { calculateCanvasDimensions } from '../canvas/renderer';

const MARGIN = 32;

const padBtn: React.CSSProperties = {
  width: 32,
  height: 32,
  border: 'none',
  borderRadius: 6,
  background: 'rgba(255,255,255,0.85)',
  cursor: 'pointer',
  fontSize: 15,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: 0,
  color: '#444',
  transition: 'background 0.15s',
};

const centerBtn: React.CSSProperties = {
  ...padBtn,
  fontSize: 13,
  fontWeight: 600,
  color: '#888',
};

interface PatternCanvasProps {
  pattern: ProcessedPattern | null;
  config: PatternConfig;
  uploadedImage: HTMLImageElement | null;
  palette: BeadColor[];
  onOffsetChange: (dx: number, dy: number) => void;
  onPixelEdit: (x: number, y: number, color: BeadColor) => void;
}

function calcImageRect(
  img: HTMLImageElement,
  config: PatternConfig,
  patternWidth: number,
  patternHeight: number,
  extraOffsetX: number,
  extraOffsetY: number
) {
  const imgAspect = img.naturalWidth / img.naturalHeight;
  const boardAspect = patternWidth / patternHeight;

  let dw: number, dh: number;
  if (imgAspect > boardAspect) {
    dw = patternWidth;
    dh = Math.round(patternWidth / imgAspect);
  } else {
    dh = patternHeight;
    dw = Math.round(patternHeight * imgAspect);
  }

  const s = config.imageScale / 100;
  dw = Math.max(1, Math.round(dw * s));
  dh = Math.max(1, Math.round(dh * s));

  const ox = Math.floor((patternWidth - dw) / 2) + config.imageOffsetX + extraOffsetX;
  const oy = Math.floor((patternHeight - dh) / 2) + config.imageOffsetY + extraOffsetY;

  return { ox, oy, dw, dh };
}

export default function PatternCanvas({ pattern, config, uploadedImage, palette, onOffsetChange, onPixelEdit }: PatternCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayRef = useRef<HTMLImageElement>(null);
  const [dragging, setDragging] = useState(false);
  const [brushActive, setBrushActive] = useState(false);
  const [selectedColor, setSelectedColor] = useState<BeadColor | null>(null);
  const [painting, setPainting] = useState(false);
  const lastPos = useRef({ x: 0, y: 0 });
  const cellOffset = useRef({ x: 0, y: 0 });

  useEffect(() => {
    if (!pattern || !canvasRef.current) return;

    const showSeams = pattern.width === 104 && pattern.height === 104;

    renderPattern(canvasRef.current, pattern, {
      showGrid: config.showGrid,
      showCodes: config.showCodes,
      showSeams,
    });
  }, [pattern, config]);

  // Convert mouse event to cell coordinates
  function eventToCell(e: React.MouseEvent) {
    if (!canvasRef.current || !pattern) return null;
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const displayX = e.clientX - rect.left;
    const displayY = e.clientY - rect.top;

    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const cx = displayX * scaleX;
    const cy = displayY * scaleY;

    const dims = calculateCanvasDimensions(pattern);
    const startX = (canvas.width - dims.patternWidth) / 2;
    const startY = MARGIN;

    const cellX = Math.floor((cx - startX) / dims.cellSize);
    const cellY = Math.floor((cy - startY) / dims.cellSize);

    if (cellX < 0 || cellX >= pattern.width || cellY < 0 || cellY >= pattern.height) return null;
    return { x: cellX, y: cellY };
  }

  function paintCell(e: React.MouseEvent) {
    if (!selectedColor) return;
    const cell = eventToCell(e);
    if (cell) {
      onPixelEdit(cell.x, cell.y, selectedColor);
    }
  }

  function updateOverlay() {
    if (!overlayRef.current || !canvasRef.current || !uploadedImage || !pattern) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const cellW = rect.width / pattern.width;
    const cellH = rect.height / pattern.height;

    const imgRect = calcImageRect(
      uploadedImage,
      config,
      pattern.width,
      pattern.height,
      cellOffset.current.x,
      cellOffset.current.y
    );

    overlayRef.current.style.left = `${imgRect.ox * cellW}px`;
    overlayRef.current.style.top = `${imgRect.oy * cellH}px`;
    overlayRef.current.style.width = `${imgRect.dw * cellW}px`;
    overlayRef.current.style.height = `${imgRect.dh * cellH}px`;
  }

  // --- Mouse handlers for drag (non-brush mode) ---
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (brushActive) {
      setPainting(true);
      paintCell(e);
      return;
    }
    setDragging(true);
    lastPos.current = { x: e.clientX, y: e.clientY };
    if (overlayRef.current) {
      overlayRef.current.style.display = 'block';
    }
    requestAnimationFrame(() => updateOverlay());
  }, [brushActive, selectedColor]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (painting) {
      paintCell(e);
      return;
    }
    if (!dragging || !pattern || !canvasRef.current) return;

    const pdx = e.clientX - lastPos.current.x;
    const pdy = e.clientY - lastPos.current.y;
    lastPos.current = { x: e.clientX, y: e.clientY };

    const rect = canvasRef.current.getBoundingClientRect();
    const scaleX = pattern.width / rect.width;
    const scaleY = pattern.height / rect.height;

    cellOffset.current.x += Math.round(pdx * scaleX);
    cellOffset.current.y += Math.round(pdy * scaleY);

    updateOverlay();
  }, [painting, dragging, pattern, selectedColor]);

  const commitDrag = useCallback(() => {
    setDragging(false);
    if (overlayRef.current) {
      overlayRef.current.style.display = 'none';
    }
    if (cellOffset.current.x !== 0 || cellOffset.current.y !== 0) {
      onOffsetChange(cellOffset.current.x, cellOffset.current.y);
    }
    cellOffset.current = { x: 0, y: 0 };
  }, [onOffsetChange]);

  const handleMouseUp = useCallback((e: React.MouseEvent) => {
    if (painting) {
      setPainting(false);
      return;
    }
    commitDrag();
  }, [painting, commitDrag]);

  const handleMouseLeave = useCallback(() => {
    if (painting) {
      setPainting(false);
      return;
    }
    commitDrag();
  }, [painting, commitDrag]);

  // Keyboard arrow keys (only when not in an input; brush mode overrides offset movement)
  useEffect(() => {
    if (!pattern) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (brushActive) return;
      switch (e.key) {
        case 'ArrowUp': e.preventDefault(); onOffsetChange(0, -1); break;
        case 'ArrowDown': e.preventDefault(); onOffsetChange(0, 1); break;
        case 'ArrowLeft': e.preventDefault(); onOffsetChange(-1, 0); break;
        case 'ArrowRight': e.preventDefault(); onOffsetChange(1, 0); break;
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [pattern, onOffsetChange, brushActive]);

  if (!pattern) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: 300,
          color: '#999',
          fontSize: 14,
          border: '1px dashed #ddd',
          borderRadius: 8,
          background: '#fafafa',
        }}
      >
        上传图片后将在此生成拼豆图纸
      </div>
    );
  }

  const brushCursor = brushActive ? 'crosshair' : dragging ? 'grabbing' : 'grab';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <div style={{ position: 'relative', display: 'inline-block', maxWidth: '100%' }}>
        <div style={{ overflow: 'hidden', maxWidth: '100%', borderRadius: 4 }}>
          <canvas
            ref={canvasRef}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseLeave}
            style={{
              maxWidth: '100%',
              border: '1px solid #eee',
              borderRadius: 4,
              boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
              cursor: brushCursor,
            }}
          />
        </div>
        <img
          ref={overlayRef}
          src={uploadedImage?.src}
          alt=""
          draggable={false}
          style={{
            display: 'none',
            position: 'absolute',
            left: 0,
            top: 0,
            opacity: 0.55,
            pointerEvents: 'none',
            imageRendering: 'pixelated',
          }}
        />
        {/* Floating D-pad */}
        <div style={{
          position: 'absolute',
          top: 12,
          right: 12,
          background: 'rgba(0,0,0,0.12)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          borderRadius: 10,
          padding: 6,
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 32px)',
          gridTemplateRows: 'repeat(3, 32px)',
          gap: 3,
        }}>
          <div />
          <button onClick={() => onOffsetChange(0, -1)} style={padBtn} title="上移 (↑)">↑</button>
          <div />
          <button onClick={() => onOffsetChange(-1, 0)} style={padBtn} title="左移 (←)">←</button>
          <button
            onClick={() => onOffsetChange(-config.imageOffsetX, -config.imageOffsetY)}
            style={centerBtn}
            title="重置位置"
          >↺</button>
          <button onClick={() => onOffsetChange(1, 0)} style={padBtn} title="右移 (→)">→</button>
          <div />
          <button onClick={() => onOffsetChange(0, 1)} style={padBtn} title="下移 (↓)">↓</button>
          <div />
        </div>
      </div>

      {/* Brush toolbar */}
      <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
        <button
          onClick={() => setBrushActive(b => !b)}
          style={{
            padding: '6px 14px',
            border: brushActive ? '2px solid #333' : '1px solid #ccc',
            borderRadius: 6,
            background: brushActive ? '#333' : '#fff',
            color: brushActive ? '#fff' : '#555',
            cursor: 'pointer',
            fontSize: 13,
            fontWeight: brushActive ? 600 : 400,
          }}
        >
          {brushActive ? '✎ 画笔已激活' : '✎ 画笔'}
        </button>
        {brushActive && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', justifyContent: 'center', maxWidth: '100%' }}>
            {palette.map(c => (
              <button
                key={c.code}
                onClick={() => setSelectedColor(c)}
                title={`${c.code} ${c.name}`}
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 4,
                  border: selectedColor?.code === c.code ? '2px solid #333' : '1px solid #ddd',
                  background: c.hex,
                  cursor: 'pointer',
                  padding: 0,
                  boxShadow: selectedColor?.code === c.code ? '0 0 0 1px #fff, 0 0 4px rgba(0,0,0,0.3)' : undefined,
                  transform: selectedColor?.code === c.code ? 'scale(1.15)' : undefined,
                  transition: 'transform 0.1s, box-shadow 0.1s',
                }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
