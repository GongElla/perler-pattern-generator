import type { ColorUsage } from '../types';

interface StatsTableProps {
  usage: ColorUsage[];
  totalCells: number;
}

const SWATCH = 36;
const GAP = 8;

export default function StatsTable({ usage, totalCells }: StatsTableProps) {
  return (
    <div style={{ marginTop: 20, width: '100%' }}>
      <div style={{ fontSize: 15, fontWeight: 700, color: '#333', marginBottom: 10 }}>
        颜色用量统计（共 {usage.length} 种颜色，{totalCells} 颗豆子）
      </div>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(8, 1fr)`,
          gap: GAP,
        }}
      >
        {usage.map((item) => (
          <div
            key={item.color.code}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '6px 8px',
              background: '#fafafa',
              borderRadius: 6,
              border: '1px solid #eee',
            }}
          >
            <div
              style={{
                width: SWATCH,
                height: SWATCH,
                borderRadius: 6,
                background: item.color.hex,
                flexShrink: 0,
                border: '1px solid rgba(0,0,0,0.1)',
              }}
            />
            <div style={{ fontSize: 14, color: '#333', lineHeight: 1.3 }}>
              <div style={{ fontWeight: 600 }}>{item.color.code}</div>
              <div style={{ fontSize: 12, color: '#888' }}>×{item.count}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
