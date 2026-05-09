import { useState, useCallback, useEffect } from 'react';
import type { PatternConfig, BoardSize, KitSize, BeadType } from '../types';

interface ConfigPanelProps {
  config: PatternConfig;
  onChange: (config: PatternConfig) => void;
  disabled?: boolean;
}

const BOARD_SIZES: BoardSize[] = [
  { width: 50, height: 50, label: '50×50（间距稍大，有孔立体）' },
  { width: 52, height: 52, label: '52×52（标准，约 14×14cm）' },
  { width: 78, height: 78, label: '78×78（中幅）' },
  { width: 104, height: 104, label: '104×104（大幅，2×2 拼接）' },
];

const KIT_OPTIONS: { value: KitSize | null; label: string }[] = [
  { value: null, label: '不限（使用全部 221 色）' },
  { value: 24, label: '24 色套装' },
  { value: 48, label: '48 色套装' },
  { value: 72, label: '72 色套装' },
  { value: 144, label: '144 色套装' },
];

export default function ConfigPanel({ config, onChange, disabled }: ConfigPanelProps) {
  const [localScale, setLocalScale] = useState(config.imageScale);

  const update = useCallback(
    <K extends keyof PatternConfig>(key: K, value: PatternConfig[K]) => {
      onChange({ ...config, [key]: value });
    },
    [config, onChange]
  );

  useEffect(() => {
    setLocalScale(config.imageScale);
  }, [config.imageScale]);

  const handleScaleCommit = useCallback(() => {
    if (localScale !== config.imageScale) {
      update('imageScale', localScale);
    }
  }, [localScale, config.imageScale, update]);

  const sectionStyle: React.CSSProperties = {
    marginBottom: 16,
    paddingBottom: 12,
    borderBottom: '1px solid #eee',
  };

  const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: 13,
    fontWeight: 600,
    color: '#333',
    marginBottom: 8,
  };

  const selectStyle: React.CSSProperties = {
    width: '100%',
    padding: '8px 10px',
    fontSize: 13,
    border: '1px solid #ddd',
    borderRadius: 6,
    background: disabled ? '#f5f5f5' : '#fff',
    cursor: disabled ? 'not-allowed' : 'pointer',
  };

  return (
    <div style={{ opacity: disabled ? 0.6 : 1 }}>
      <div style={sectionStyle}>
        <label style={labelStyle}>豆型</label>
        <select
          style={selectStyle}
          value={config.beadType}
          onChange={(e) => update('beadType', e.target.value as BeadType)}
          disabled={disabled}
        >
          <option value="mini">2.6mm 迷你豆（融合豆）— 国内主流</option>
          <option value="standard">5mm 标准豆（Perler / Hama Midi）</option>
        </select>
      </div>

      <div style={sectionStyle}>
        <label style={labelStyle}>板子尺寸</label>
        <select
          style={selectStyle}
          value={`${config.boardSize.width}x${config.boardSize.height}`}
          onChange={(e) => {
            const [w, h] = e.target.value.split('x').map(Number);
            const size = BOARD_SIZES.find((s) => s.width === w && s.height === h);
            if (size) update('boardSize', size);
          }}
          disabled={disabled}
        >
          {BOARD_SIZES.map((s) => (
            <option key={`${s.width}x${s.height}`} value={`${s.width}x${s.height}`}>
              {s.label}
            </option>
          ))}
        </select>
        <div style={{ marginTop: 8, display: 'flex', gap: 8, alignItems: 'center' }}>
          <input
            type="number"
            min={8}
            max={200}
            value={config.boardSize.width}
            onChange={(e) => {
              const w = Math.max(8, Math.min(200, Number(e.target.value) || 52));
              const h = config.boardSize.height;
              update('boardSize', { ...config.boardSize, width: w, height: h, label: `${w}×${h}（自定义）` });
            }}
            disabled={disabled}
            style={{ ...selectStyle, width: 60, textAlign: 'center' }}
          />
          <span style={{ color: '#999' }}>×</span>
          <input
            type="number"
            min={8}
            max={200}
            value={config.boardSize.height}
            onChange={(e) => {
              const h = Math.max(8, Math.min(200, Number(e.target.value) || 52));
              update('boardSize', { ...config.boardSize, width: config.boardSize.width, height: h, label: `${config.boardSize.width}×${h}（自定义）` });
            }}
            disabled={disabled}
            style={{ ...selectStyle, width: 60, textAlign: 'center' }}
          />
          <span style={{ fontSize: 12, color: '#999' }}>自定义宽高</span>
        </div>
      </div>

      <div style={sectionStyle}>
        <label style={labelStyle}>
          图片缩放：{localScale}%
        </label>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 11, color: '#999' }}>10%</span>
          <input
            type="range"
            min={10}
            max={100}
            value={localScale}
            onChange={(e) => setLocalScale(Number(e.target.value))}
            onMouseUp={handleScaleCommit}
            onTouchEnd={handleScaleCommit}
            disabled={disabled}
            style={{ flex: 1 }}
          />
          <span style={{ fontSize: 11, color: '#999' }}>100%</span>
        </div>
        {(() => {
          const maxDim = Math.max(config.boardSize.width, config.boardSize.height);
          const imgCells = Math.round(maxDim * localScale / 100);
          return (
            <div style={{ fontSize: 11, color: '#999', marginTop: 4 }}>
              图片约占 {imgCells}×{imgCells} 格（等比缩放，居中）
            </div>
          );
        })()}
      </div>

      <div style={sectionStyle}>
        <label style={labelStyle}>颜色套装</label>
        <select
          style={selectStyle}
          value={config.kitSize === null ? 'null' : String(config.kitSize)}
          onChange={(e) => {
            const val = e.target.value;
            update('kitSize', val === 'null' ? null : (Number(val) as KitSize));
          }}
          disabled={disabled}
        >
          {KIT_OPTIONS.map((opt) => (
            <option key={String(opt.value)} value={String(opt.value)}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      <div style={sectionStyle}>
        <label style={labelStyle}>图纸显示</label>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: disabled ? 'not-allowed' : 'pointer' }}>
            <input
              type="checkbox"
              checked={config.showGrid}
              onChange={(e) => update('showGrid', e.target.checked)}
              disabled={disabled}
            />
            显示网格线
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: disabled ? 'not-allowed' : 'pointer' }}>
            <input
              type="checkbox"
              checked={config.showCodes}
              onChange={(e) => update('showCodes', e.target.checked)}
              disabled={disabled}
            />
            显示色号（格子足够大时生效）
          </label>
        </div>
      </div>

      <div style={{ marginBottom: 8 }}>
        <label style={labelStyle}>颜色匹配算法</label>
        <select
          style={selectStyle}
          value={config.matchAlgorithm}
          onChange={(e) => update('matchAlgorithm', e.target.value as 'euclidean' | 'ciede2000')}
          disabled={disabled}
        >
          <option value="ciede2000">CIEDE2000（更精确，推荐）</option>
          <option value="euclidean">欧氏距离（更快）</option>
        </select>
      </div>
    </div>
  );
}
