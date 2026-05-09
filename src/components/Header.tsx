import type { BeadType } from '../types';

interface HeaderProps {
  beadType: BeadType;
}

export default function Header({ beadType }: HeaderProps) {
  const beadLabel = beadType === 'mini' ? '2.6mm 迷你豆' : '5mm 标准豆';

  return (
    <header
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '12px 24px',
        borderBottom: '1px solid #eee',
        background: '#fff',
      }}
    >
      <div style={{ textAlign: 'center' }}>
        <h1 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#333' }}>
          拼豆图纸转化器
        </h1>
        <div style={{ fontSize: 12, color: '#999', marginTop: 2 }}>
          MARD 221 色 · {beadLabel}
        </div>
      </div>
    </header>
  );
}
