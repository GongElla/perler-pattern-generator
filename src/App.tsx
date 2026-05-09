import { useState, useEffect, useRef, useCallback } from 'react';
import type { BeadColor, PatternConfig, ProcessedPattern } from './types';
import { loadImage, processImage } from './utils/imageProcessing';
import { renderPattern, drawStatsForExport } from './canvas/renderer';
import { getAvailableColors } from './colors';
import Header from './components/Header';
import UploadPanel from './components/UploadPanel';
import ConfigPanel from './components/ConfigPanel';
import PatternCanvas from './components/PatternCanvas';
import StatsTable from './components/StatsTable';
import './App.css';

const DEFAULT_CONFIG: PatternConfig = {
  beadType: 'mini',
  boardSize: { width: 52, height: 52, label: '52×52（标准，约 14×14cm）' },
  kitSize: null,
  imageScale: 100,
  imageOffsetX: 0,
  imageOffsetY: 0,
  showGrid: true,
  showCodes: true,
  matchAlgorithm: 'ciede2000',
};

export default function App() {
  const [config, setConfig] = useState<PatternConfig>(DEFAULT_CONFIG);
  const [uploadedImage, setUploadedImage] = useState<HTMLImageElement | null>(null);
  const [pattern, setPattern] = useState<ProcessedPattern | null>(null);
  const [loading, setLoading] = useState(false);
  const [hasEdits, setHasEdits] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState<{
    message: string;
    onConfirm: () => void;
  } | null>(null);
  const canvasWrapperRef = useRef<HTMLDivElement>(null);

  const handleOffsetChange = useCallback((dx: number, dy: number) => {
    if (dx === 0 && dy === 0) return;
    const apply = () => {
      setConfig(prev => ({
        ...prev,
        imageOffsetX: prev.imageOffsetX + dx,
        imageOffsetY: prev.imageOffsetY + dy,
      }));
    };
    if (hasEdits) {
      setConfirmDialog({
        message: '移动图像会清空当前绘制记录，确定继续吗？',
        onConfirm: () => { apply(); setHasEdits(false); },
      });
    } else {
      apply();
    }
  }, [hasEdits]);

  const handleConfigChange = useCallback((newConfig: PatternConfig) => {
    const isDestructive =
      newConfig.boardSize.width !== config.boardSize.width ||
      newConfig.boardSize.height !== config.boardSize.height ||
      newConfig.kitSize !== config.kitSize;

    if (isDestructive && hasEdits) {
      setConfirmDialog({
        message: '修改画板尺寸或颜色套装会清空当前绘制记录，确定继续吗？',
        onConfirm: () => { setConfig(newConfig); setHasEdits(false); },
      });
    } else {
      setConfig(newConfig);
    }
  }, [config, hasEdits]);

  const handlePixelEdit = useCallback((x: number, y: number, color: BeadColor) => {
    setHasEdits(true);
    setPattern(prev => {
      if (!prev) return prev;
      const oldColor = prev.pixels[y][x].color;
      if (oldColor.code === color.code) return prev;

      // Clone only the affected row
      const newPixels = prev.pixels.map((row, rowIdx) => {
        if (rowIdx !== y) return row;
        const newRow = [...row];
        newRow[x] = { color, x, y };
        return newRow;
      });

      // Incremental usage update — O(k) instead of O(n²)
      const newUsage = prev.colorUsage.map(u => ({ ...u }));

      const oldIdx = newUsage.findIndex(u => u.color.code === oldColor.code);
      if (oldIdx >= 0) {
        if (newUsage[oldIdx].count === 1) {
          newUsage.splice(oldIdx, 1);
        } else {
          newUsage[oldIdx] = { ...newUsage[oldIdx], count: newUsage[oldIdx].count - 1 };
        }
      }

      const newIdx = newUsage.findIndex(u => u.color.code === color.code);
      if (newIdx >= 0) {
        newUsage[newIdx] = { ...newUsage[newIdx], count: newUsage[newIdx].count + 1 };
      } else {
        newUsage.push({ color, count: 1 });
        newUsage.sort((a, b) => a.color.code.localeCompare(b.color.code));
      }

      return { ...prev, pixels: newPixels, colorUsage: newUsage };
    });
  }, []);

  const palette = getAvailableColors(config.kitSize);

  const process = useCallback(
    async (img: HTMLImageElement, cfg: PatternConfig) => {
      setLoading(true);
      await new Promise((resolve) => setTimeout(resolve, 10));
      const p = getAvailableColors(cfg.kitSize);
      const result = processImage(img, cfg, p);
      setPattern(result);
      setLoading(false);
    },
    []
  );

  const handleImageUpload = async (file: File) => {
    try {
      const img = await loadImage(file);
      setUploadedImage(img);
      setHasEdits(false);
    } catch (err) {
      alert('图片加载失败，请重试');
      console.error(err);
    }
  };

  useEffect(() => {
    if (uploadedImage) {
      process(uploadedImage, config);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config, uploadedImage]);

  const handleExportPNG = () => {
    if (!canvasWrapperRef.current || !pattern) return;
    const canvas = canvasWrapperRef.current.querySelector('canvas');
    if (!canvas) return;

    // Temporarily draw stats onto the canvas for export
    drawStatsForExport(canvas, pattern);

    const link = document.createElement('a');
    link.download = `拼豆图纸_${config.boardSize.width}x${config.boardSize.height}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();

    // Restore canvas to pattern-only
    renderPattern(canvas, pattern, {
      showGrid: config.showGrid,
      showCodes: config.showCodes,
      showSeams: pattern.width === 104 && pattern.height === 104,
    });
  };

  return (
    <div className="app-container">
      <Header beadType={config.beadType} />
      <div className="main-content">
        <aside className="sidebar">
          <UploadPanel
            onImageUpload={handleImageUpload}
            hasImage={!!uploadedImage}
          />
          <ConfigPanel
            config={config}
            onChange={handleConfigChange}
            disabled={!uploadedImage || loading}
          />
          {uploadedImage && (
            <div className="image-info">
              <div className="info-title">原图信息</div>
              <div className="info-row">
                <span>尺寸</span>
                <span>
                  {uploadedImage.naturalWidth} × {uploadedImage.naturalHeight}
                </span>
              </div>
              <div className="info-row">
                <span>图纸</span>
                <span>
                  {config.boardSize.width} × {config.boardSize.height}
                </span>
              </div>
            </div>
          )}
          {pattern && !loading && (
            <button
              onClick={handleExportPNG}
              style={{
                width: '100%',
                marginTop: 16,
                padding: '10px 0',
                fontSize: 14,
                fontWeight: 600,
                border: 'none',
                borderRadius: 6,
                cursor: 'pointer',
                background: '#2563eb',
                color: '#fff',
              }}
            >
              导出 PNG
            </button>
          )}
        </aside>
        <main className="preview-area">
          {loading && (
            <div className="loading-overlay">
              <div className="loading-spinner" />
              <div className="loading-text">正在生成拼豆图纸...</div>
            </div>
          )}
          <div ref={canvasWrapperRef} className="canvas-wrapper">
            <PatternCanvas
              pattern={pattern}
              config={config}
              uploadedImage={uploadedImage}
              palette={palette}
              onOffsetChange={handleOffsetChange}
              onPixelEdit={handlePixelEdit}
            />
          </div>
          {pattern && (
            <StatsTable usage={pattern.colorUsage} totalCells={pattern.width * pattern.height} />
          )}
          {config.boardSize.width === 104 && config.boardSize.height === 104 && (
            <div className="seam-notice">
              104×104 图纸由 4 块 52×52 板子拼接而成，红色虚线处为拼接位置
            </div>
          )}
        </main>
      </div>

      {/* Confirm dialog */}
      {confirmDialog && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.35)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
          }}
          onClick={() => setConfirmDialog(null)}
        >
          <div
            style={{
              background: '#fff',
              borderRadius: 12,
              padding: '28px 32px 20px',
              maxWidth: 380,
              width: '90%',
              boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
              textAlign: 'center',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ fontSize: 15, color: '#333', marginBottom: 8, lineHeight: 1.6 }}>
              {confirmDialog.message}
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginTop: 20 }}>
              <button
                onClick={() => setConfirmDialog(null)}
                style={{
                  padding: '8px 24px',
                  borderRadius: 6,
                  border: '1px solid #ccc',
                  background: '#fff',
                  color: '#555',
                  cursor: 'pointer',
                  fontSize: 14,
                }}
              >
                取消
              </button>
              <button
                onClick={() => {
                  confirmDialog.onConfirm();
                  setConfirmDialog(null);
                }}
                style={{
                  padding: '8px 24px',
                  borderRadius: 6,
                  border: 'none',
                  background: '#2563eb',
                  color: '#fff',
                  cursor: 'pointer',
                  fontSize: 14,
                  fontWeight: 600,
                }}
              >
                确定
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
