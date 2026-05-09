import { useRef } from 'react';

interface UploadPanelProps {
  onImageUpload: (file: File) => void;
  hasImage: boolean;
}

export default function UploadPanel({ onImageUpload, hasImage }: UploadPanelProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      onImageUpload(file);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) {
      onImageUpload(file);
    }
  };

  return (
    <div style={{ marginBottom: 16 }}>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        style={{ display: 'none' }}
      />
      <div
        onClick={() => inputRef.current?.click()}
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
        style={{
          border: '2px dashed #ccc',
          borderRadius: 8,
          padding: hasImage ? '16px 24px' : '40px 24px',
          textAlign: 'center',
          cursor: 'pointer',
          transition: 'border-color 0.2s',
          background: '#fafafa',
        }}
        onMouseEnter={(e) => (e.currentTarget.style.borderColor = '#666')}
        onMouseLeave={(e) => (e.currentTarget.style.borderColor = '#ccc')}
      >
        {hasImage ? (
          <div style={{ color: '#666', fontSize: 14 }}>
            点击或拖拽更换图片
          </div>
        ) : (
          <>
            <div style={{ fontSize: 32, marginBottom: 8 }}>+</div>
            <div style={{ color: '#666', fontSize: 14 }}>
              点击上传或拖拽图片到此处
            </div>
            <div style={{ color: '#999', fontSize: 12, marginTop: 6 }}>
              支持 JPG、PNG、WEBP 等格式
            </div>
          </>
        )}
      </div>
    </div>
  );
}
