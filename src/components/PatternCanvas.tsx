import { useEffect, useRef, useCallback, useState } from 'react';
import type { BeadColor, ProcessedPattern, PatternConfig } from '../types';
import { renderPattern, calculateCanvasDimensions, MARGIN } from '../canvas/renderer';
import { calcImageRect } from '../utils/layout';

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

type StrokeEntry = { x: number; y: number; oldColor: BeadColor; newColor: BeadColor };

export default function PatternCanvas({ pattern, config, uploadedImage, palette, onOffsetChange, onPixelEdit }: PatternCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayRef = useRef<HTMLImageElement>(null);
  const [dragging, setDragging] = useState(false);
  const [brushActive, setBrushActive] = useState(false);
  const [selectedColor, setSelectedColor] = useState<BeadColor | null>(null);
  const [painting, setPainting] = useState(false);
  const [eyedropperActive, setEyedropperActive] = useState(false);
  const [showPalette, setShowPalette] = useState(false);
  const lastPos = useRef({ x: 0, y: 0 });
  const cellOffset = useRef({ x: 0, y: 0 });

  // Undo / redo stacks
  const history = useRef<StrokeEntry[][]>([]);
  const future = useRef<StrokeEntry[][]>([]);
  const currentStroke = useRef<Map<string, StrokeEntry>>(new Map());

  // Refs that change handlers read (avoids stale closure issues)
  const brushActiveRef = useRef(brushActive);
  brushActiveRef.current = brushActive;
  const selectedColorRef = useRef(selectedColor);
  selectedColorRef.current = selectedColor;
  const eyedropperActiveRef = useRef(eyedropperActive);
  eyedropperActiveRef.current = eyedropperActive;

  // Reset brush state when palette (color kit) changes
  useEffect(() => {
    setBrushActive(false);
    setSelectedColor(null);
    setEyedropperActive(false);
    setShowPalette(false);
    history.current = [];
    future.current = [];
  }, [palette]);

  useEffect(() => {
    if (!pattern || !canvasRef.current) return;

    const showSeams = pattern.width === 104 && pattern.height === 104;

    renderPattern(canvasRef.current, pattern, {
      showGrid: config.showGrid,
      showCodes: config.showCodes,
      showSeams,
    });
  }, [pattern, config]);

  function eventToCell(e: React.MouseEvent, pat: ProcessedPattern) {
    if (!canvasRef.current) return null;
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const displayX = e.clientX - rect.left;
    const displayY = e.clientY - rect.top;

    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const cx = displayX * scaleX;
    const cy = displayY * scaleY;

    const dims = calculateCanvasDimensions(pat);
    const startX = (canvas.width - dims.patternWidth) / 2;
    const startY = MARGIN;

    const cellX = Math.floor((cx - startX) / dims.cellSize);
    const cellY = Math.floor((cy - startY) / dims.cellSize);

    if (cellX < 0 || cellX >= pat.width || cellY < 0 || cellY >= pat.height) return null;
    return { x: cellX, y: cellY };
  }

  function doPaint(x: number, y: number, color: BeadColor, pat: ProcessedPattern) {
    const oldColor = pat.pixels[y][x].color;
    if (oldColor.code === color.code) return;

    const key = `${x},${y}`;
    if (!currentStroke.current.has(key)) {
      currentStroke.current.set(key, { x, y, oldColor, newColor: color });
    }
    onPixelEdit(x, y, color);
  }

  function finishStroke() {
    if (currentStroke.current.size > 0) {
      history.current.push(Array.from(currentStroke.current.values()));
      future.current = [];
    }
    currentStroke.current = new Map();
  }

  function undo() {
    const stroke = history.current.pop();
    if (!stroke) return;

    // Revert each cell in the stroke to its old color
    for (const entry of stroke) {
      onPixelEdit(entry.x, entry.y, entry.oldColor);
    }
    future.current.push(stroke);
  }

  function redo() {
    const stroke = future.current.pop();
    if (!stroke) return;

    // Re-apply each cell in the stroke to its new color
    for (const entry of stroke) {
      onPixelEdit(entry.x, entry.y, entry.newColor);
    }
    history.current.push(stroke);
  }

  function updateOverlay() {
    if (!overlayRef.current || !canvasRef.current || !uploadedImage || !pattern) return;

    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const dims = calculateCanvasDimensions(pattern);

    const scaleX = rect.width / canvas.width;
    const scaleY = rect.height / canvas.height;

    const gridStartX = (canvas.width - dims.patternWidth) / 2;
    const gridStartY = MARGIN;

    const imgRect = calcImageRect(
      uploadedImage.naturalWidth,
      uploadedImage.naturalHeight,
      pattern.width,
      pattern.height,
      config,
      cellOffset.current.x,
      cellOffset.current.y
    );

    overlayRef.current.style.left = `${(gridStartX + imgRect.x * dims.cellSize) * scaleX}px`;
    overlayRef.current.style.top = `${(gridStartY + imgRect.y * dims.cellSize) * scaleY}px`;
    overlayRef.current.style.width = `${imgRect.width * dims.cellSize * scaleX}px`;
    overlayRef.current.style.height = `${imgRect.height * dims.cellSize * scaleY}px`;
  }

  // --- Mouse handlers ---
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    // Use pattern from ref so this handler never goes stale
    if (!pattern) return;

    if (eyedropperActiveRef.current) {
      const cell = eventToCell(e, pattern);
      if (cell) {
        const picked = pattern.pixels[cell.y][cell.x].color;
        const inPalette = palette.find(c => c.code === picked.code);
        if (inPalette) {
          setSelectedColor(inPalette);
          selectedColorRef.current = inPalette;
        }
      }
      return;
    }

    if (brushActiveRef.current && selectedColorRef.current) {
      setPainting(true);
      currentStroke.current = new Map();
      const cell = eventToCell(e, pattern);
      if (cell) doPaint(cell.x, cell.y, selectedColorRef.current, pattern);
      return;
    }

    // Default: overlay drag
    setDragging(true);
    lastPos.current = { x: e.clientX, y: e.clientY };
    if (overlayRef.current) {
      overlayRef.current.style.display = 'block';
    }
    requestAnimationFrame(() => updateOverlay());
  }, [pattern, palette]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (painting && selectedColorRef.current && pattern) {
      const cell = eventToCell(e, pattern);
      if (cell) doPaint(cell.x, cell.y, selectedColorRef.current, pattern);
      return;
    }
    if (!dragging || !pattern || !canvasRef.current) return;

    const pdx = e.clientX - lastPos.current.x;
    const pdy = e.clientY - lastPos.current.y;
    lastPos.current = { x: e.clientX, y: e.clientY };

    const rect = canvasRef.current.getBoundingClientRect();
    const canvas = canvasRef.current;
    const dims = calculateCanvasDimensions(pattern);
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    cellOffset.current.x += Math.round(pdx * scaleX / dims.cellSize);
    cellOffset.current.y += Math.round(pdy * scaleY / dims.cellSize);

    updateOverlay();
  }, [painting, dragging, pattern]);

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

  const handleMouseUp = useCallback(() => {
    if (painting) {
      setPainting(false);
      finishStroke();
      return;
    }
    commitDrag();
  }, [painting, commitDrag]);

  const handleMouseLeave = handleMouseUp;

  // Keyboard arrow keys (disabled when brush or eyedropper active)
  useEffect(() => {
    if (!pattern) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (brushActive || eyedropperActive) return;
      switch (e.key) {
        case 'ArrowUp': e.preventDefault(); onOffsetChange(0, -1); break;
        case 'ArrowDown': e.preventDefault(); onOffsetChange(0, 1); break;
        case 'ArrowLeft': e.preventDefault(); onOffsetChange(-1, 0); break;
        case 'ArrowRight': e.preventDefault(); onOffsetChange(1, 0); break;
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [pattern, onOffsetChange, brushActive, eyedropperActive]);

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

  const canvasToolActive = brushActive || eyedropperActive;
  const brushCursor = eyedropperActive ? 'crosshair'
    : brushActive ? 'crosshair'
    : dragging ? 'grabbing'
    : 'grab';

  const canUndo = history.current.length > 0;
  const canRedo = future.current.length > 0;

  const toolBtn = (label: string, active: boolean, onClick: () => void, disabled = false) => (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        padding: '5px 12px',
        border: active ? '2px solid #333' : '1px solid #ccc',
        borderRadius: 6,
        background: active ? '#333' : disabled ? '#f5f5f5' : '#fff',
        color: active ? '#fff' : disabled ? '#ccc' : '#555',
        cursor: disabled ? 'default' : 'pointer',
        fontSize: 12,
        fontWeight: active ? 600 : 400,
        whiteSpace: 'nowrap',
      }}
    >
      {label}
    </button>
  );

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
        {/* Floating D-pad (hidden during canvas tools) */}
        {!canvasToolActive && (
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
        )}
      </div>

      {/* Editing Panel */}
      <div style={{
        marginTop: 12,
        width: '100%',
        border: '1px solid #eee',
        borderRadius: 8,
        background: '#fafafa',
        padding: 10,
      }}>
        {/* Toolbar row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: showPalette ? 10 : 0 }}>
          {toolBtn(brushActive ? '✓ 画笔' : '画笔', brushActive, () => {
            if (brushActive) { setBrushActive(false); }
            else { setBrushActive(true); setEyedropperActive(false); }
          })}
          {toolBtn('撤回', false, undo, !canUndo)}
          {toolBtn('还原', false, redo, !canRedo)}
          {toolBtn('色卡', showPalette, () => setShowPalette(p => !p))}
          {toolBtn(eyedropperActive ? '✓ 取色' : '取色', eyedropperActive, () => {
            if (eyedropperActive) { setEyedropperActive(false); }
            else { setEyedropperActive(true); setBrushActive(false); }
          })}

          {/* Current color indicator */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            marginLeft: 2,
            padding: '3px 8px 3px 3px',
            borderRadius: 6,
            border: '1px solid #ddd',
            background: '#fff',
          }}>
            <div
              style={{
                width: 22,
                height: 22,
                borderRadius: 3,
                flexShrink: 0,
                border: '1px solid rgba(0,0,0,0.1)',
                ...(selectedColor
                  ? { background: selectedColor.hex }
                  : {
                      background: `linear-gradient(to bottom right,
                        transparent calc(50% - 1px), #ccc 50%,
                        transparent calc(50% + 1px)) #fff`,
                    }),
              }}
            />
            <span style={{
              fontSize: 11,
              color: selectedColor ? '#333' : '#bbb',
              fontWeight: selectedColor ? 600 : 400,
              whiteSpace: 'nowrap',
              minWidth: 28,
            }}>
              {selectedColor ? selectedColor.code : '—'}
            </span>
          </div>

        </div>

        {/* Full kit palette (色卡) */}
        {showPalette && (
          <div style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: 4,
            flexWrap: 'wrap',
            maxHeight: 180,
            overflowY: 'auto',
            paddingTop: 8,
            borderTop: '1px solid #eee',
          }}>
            {palette.map(c => (
              <button
                key={c.code}
                onClick={() => setSelectedColor(c)}
                title={`${c.code} ${c.name}`}
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: 3,
                  border: selectedColor?.code === c.code ? '2px solid #333' : '1px solid #e5e5e5',
                  background: c.hex,
                  cursor: 'pointer',
                  padding: 0,
                  flexShrink: 0,
                  boxShadow: selectedColor?.code === c.code ? '0 0 0 1px #fff, 0 0 4px rgba(0,0,0,0.3)' : undefined,
                  transform: selectedColor?.code === c.code ? 'scale(1.2)' : undefined,
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
