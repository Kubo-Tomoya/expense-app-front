import { useRef, useState } from 'react';

function ReceiptUpload({ existingPath, onFileSelect, onDeleteExisting }) {
  const [preview, setPreview] = useState(null);
  const [error, setError] = useState('');
  const inputRef = useRef(null);

  const validateAndSet = (file) => {
    if (!file) return;
    if (!['image/jpeg', 'image/png'].includes(file.type)) {
      setError('JPEG または PNG 形式のみアップロードできます');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('ファイルサイズは5MB以内にしてください');
      return;
    }
    setError('');
    setPreview(URL.createObjectURL(file));
    onFileSelect(file);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    validateAndSet(e.dataTransfer.files?.[0]);
  };

  // 差し替え・削除後は新規アップロード状態に戻す
  const showExisting = existingPath && !preview;

  return (
    <div>
      {showExisting ? (
        <div style={styles.existingBox}>
          <span style={styles.fileName}>登録済みの領収書があります</span>
          <div style={styles.existingActions}>
            <a href={existingPath} target="_blank" rel="noreferrer" style={styles.linkBtn}>確認</a>
            <button type="button" style={styles.linkBtn} onClick={() => inputRef.current?.click()}>画像を差し替える</button>
            <button type="button" style={styles.linkBtnDanger} onClick={onDeleteExisting}>画像を削除</button>
          </div>
        </div>
      ) : preview ? (
        <div style={styles.previewBox}>
          <img src={preview} alt="領収書プレビュー" style={styles.previewImg} />
          <button type="button" style={styles.linkBtn} onClick={() => inputRef.current?.click()}>別の画像を選ぶ</button>
        </div>
      ) : (
        <div
          style={styles.dropZone}
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
          onClick={() => inputRef.current?.click()}
        >
          <p style={styles.dropText}>ここにファイルをドラッグ&ドロップ</p>
          <button type="button" style={styles.selectBtn}>ファイルを選択</button>
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png"
        style={{ display: 'none' }}
        onChange={(e) => validateAndSet(e.target.files?.[0])}
      />

      {error && <p style={styles.errorText}>{error}</p>}
    </div>
  );
}

const styles = {
  dropZone: { border: '2px dashed #dee2e6', borderRadius: '8px', padding: '24px', textAlign: 'center', cursor: 'pointer', backgroundColor: '#fafbfc' },
  dropText: { fontSize: '13px', color: '#888', margin: '0 0 10px' },
  selectBtn: { padding: '6px 16px', fontSize: '13px', border: '1px solid #dee2e6', backgroundColor: '#fff', borderRadius: '6px', cursor: 'pointer' },
  previewBox: { textAlign: 'center' },
  previewImg: { maxWidth: '100%', maxHeight: '200px', borderRadius: '6px', marginBottom: '10px' },
  existingBox: { border: '1px solid #dee2e6', borderRadius: '8px', padding: '14px' },
  fileName: { fontSize: '13px', display: 'block', marginBottom: '10px' },
  existingActions: { display: 'flex', gap: '12px' },
  linkBtn: { fontSize: '12px', color: '#1a4fa0', background: 'none', border: 'none', padding: 0, cursor: 'pointer', textDecoration: 'underline' },
  linkBtnDanger: { fontSize: '12px', color: '#c0392b', background: 'none', border: 'none', padding: 0, cursor: 'pointer', textDecoration: 'underline' },
  errorText: { fontSize: '12px', color: '#c0392b', marginTop: '8px' },
  existingThumb: { maxWidth: '160px', maxHeight: '120px', borderRadius: '6px', display: 'block', marginBottom: '10px', border: '1px solid #dee2e6' },
};

export default ReceiptUpload;