import { useState, useEffect, useRef, useCallback } from 'react';
import type { BeadColor, PatternConfig, ProcessedPattern } from './types';
import { loadImage, processImage } from './utils/imageProcessing';
import { getAvailableColors } from './colors';
import Header from './components/Header';
import UploadPanel from './components/UploadPanel';
import ConfigPanel from './components/ConfigPanel';
import PatternCanvas from './components/PatternCanvas';
import jsPDF from 'jspdf';
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
  const canvasWrapperRef = useRef<HTMLDivElement>(null);

  const handleOffsetChange = useCallback((dx: number, dy: number) => {
    setConfig(prev => ({
      ...prev,
      imageOffsetX: prev.imageOffsetX + dx,
      imageOffsetY: prev.imageOffsetY + dy,
    }));
  }, []);

  const handlePixelEdit = useCallback((x: number, y: number, color: BeadColor) => {
    setPattern(prev => {
      if (!prev) return prev;
      const oldColor = prev.pixels[y][x].color;
      if (oldColor.code === color.code) return prev;

      const newPixels = prev.pixels.map(row => row.map(cell => ({ ...cell })));
      newPixels[y][x] = { color, x, y };

      const usage = new Map<string, { color: BeadColor; count: number }>();
      for (const row of newPixels) {
        for (const cell of row) {
          const u = usage.get(cell.color.code);
          if (u) u.count++;
          else usage.set(cell.color.code, { color: cell.color, count: 1 });
        }
      }
      const colorUsage = Array.from(usage.values()).sort((a, b) => a.color.code.localeCompare(b.color.code));

      return { ...prev, pixels: newPixels, colorUsage };
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
    if (!canvasWrapperRef.current) return;
    const canvas = canvasWrapperRef.current.querySelector('canvas');
    if (!canvas) return;

    const link = document.createElement('a');
    link.download = `拼豆图纸_${config.boardSize.width}x${config.boardSize.height}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  const handleExportPDF = async () => {
    if (!canvasWrapperRef.current) return;
    const canvas = canvasWrapperRef.current.querySelector('canvas');
    if (!canvas) return;

    try {
      const dataUrl = canvas.toDataURL('image/png');
      const img = new Image();
      img.src = dataUrl;
      await new Promise<void>((resolve) => {
        img.onload = () => resolve();
      });

      const pxWidth = canvas.width;
      const pxHeight = canvas.height;
      const aspect = pxHeight / pxWidth;

      const pdf = new jsPDF({
        orientation: aspect > 1.4 ? 'portrait' : 'landscape',
        unit: 'mm',
        format: 'a4',
      });

      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 10;

      const availWidth = pageWidth - margin * 2;
      const availHeight = pageHeight - margin * 2;

      let imgWidth = availWidth;
      let imgHeight = imgWidth * aspect;

      if (imgHeight > availHeight) {
        imgHeight = availHeight;
        imgWidth = imgHeight / aspect;
      }

      const x = (pageWidth - imgWidth) / 2;
      const y = margin;

      pdf.addImage(dataUrl, 'PNG', x, y, imgWidth, imgHeight);
      pdf.save(`拼豆图纸_${config.boardSize.width}x${config.boardSize.height}.pdf`);
    } catch (err) {
      alert('PDF 导出失败');
      console.error(err);
    }
  };

  return (
    <div className="app-container">
      <Header
        onExportPNG={handleExportPNG}
        onExportPDF={handleExportPDF}
        canExport={!!pattern && !loading}
        beadType={config.beadType}
      />
      <div className="main-content">
        <aside className="sidebar">
          <UploadPanel
            onImageUpload={handleImageUpload}
            hasImage={!!uploadedImage}
          />
          <ConfigPanel
            config={config}
            onChange={setConfig}
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
              {pattern && (
                <div className="info-row">
                  <span>使用颜色</span>
                  <span>{pattern.colorUsage.length} 种</span>
                </div>
              )}
            </div>
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
          {config.boardSize.width === 104 && config.boardSize.height === 104 && (
            <div className="seam-notice">
              104×104 图纸由 4 块 52×52 板子拼接而成，红色虚线处为拼接位置
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
