import type { BeadType } from '../types';

interface HeaderProps {
  onExportPNG: () => void;
  onExportPDF: () => void;
  canExport: boolean;
  beadType: BeadType;
}

export default function Header({ onExportPNG, onExportPDF, canExport, beadType }: HeaderProps) {
  const beadLabel = beadType === 'mini' ? '2.6mm 迷你豆' : '5mm 标准豆';
  const btnStyle: React.CSSProperties = {
    padding: '8px 16px',
    fontSize: 13,
    fontWeight: 600,
    border: 'none',
    borderRadius: 6,
    cursor: canExport ? 'pointer' : 'not-allowed',
    opacity: canExport ? 1 : 0.5,
    transition: 'opacity 0.2s',
  };

  return (
    <header
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '12px 24px',
        borderBottom: '1px solid #eee',
        background: '#fff',
      }}
    >
      <div>
        <h1 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#333' }}>
          拼豆图纸转化器
        </h1>
        <div style={{ fontSize: 12, color: '#999', marginTop: 2 }}>
          MARD 221 色 · {beadLabel}
        </div>
      </div>
      <div style={{ display: 'flex', gap: 10 }}>
        <button
          style={{ ...btnStyle, background: '#333', color: '#fff' }}
          onClick={onExportPNG}
          disabled={!canExport}
        >
          导出 PNG
        </button>
        <button
          style={{ ...btnStyle, background: '#e53935', color: '#fff' }}
          onClick={onExportPDF}
          disabled={!canExport}
        >
          导出 PDF
        </button>
      </div>
    </header>
  );
}
