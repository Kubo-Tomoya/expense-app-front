import { useState } from 'react';

function PasswordInput({ value, onChange, placeholder, style }) {
  const [visible, setVisible] = useState(false);

  const toggle = () => setVisible((prev) => !prev);

  // Enter・Spaceキーでも操作できるようにする（<button>を使わない代わりの対応）
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      toggle();
    }
  };

  return (
    <div style={styles.wrapper}>
      <input
        type={visible ? 'text' : 'password'}
        style={{ ...styles.input, ...style }}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        required
      />
      {/* buttonではなくspanにすることで、ブラウザ標準のbutton特有の
          初期スタイル（高さ・余白の癖）の影響を受けなくする */}
      <span
        role="button"
        tabIndex={0}
        onClick={toggle}
        onKeyDown={handleKeyDown}
        style={styles.toggleBtn}
        aria-label={visible ? 'パスワードを隠す' : 'パスワードを表示する'}
      >
        {visible ? <EyeOffIcon /> : <EyeIcon />}
      </span>
    </div>
  );
}

function EyeIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'block' }}>
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'block' }}>
      <path d="M17.94 17.94A10.94 10.94 0 0 1 12 20c-7 0-11-8-11-8a18.6 18.6 0 0 1 5.06-5.94M9.9 4.24A9.1 9.1 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  );
}

const styles = {
  wrapper: { display: 'grid' },
  input: {
    gridArea: '1 / 1',
    width: '100%',
    padding: '8px 36px 8px 10px',
    fontSize: '14px',
    border: '1px solid #dee2e6',
    borderRadius: '6px',
    boxSizing: 'border-box',
  },
  toggleBtn: {
    gridArea: '1 / 1',
    justifySelf: 'end',
    alignSelf: 'center',
    marginRight: '10px',
    cursor: 'pointer',
    display: 'flex',
    // ここまでの調整はCSS上正確だが、フォントの表示特性上、
    // 文字の視覚的な重心は箱の幾何学的な中心よりわずかに上に来るため、
    // 最終的な見た目調整として数px分だけ引き上げる。
    // これは理論値ではなく、実際の見え方に合わせた微調整値
    transform: 'translateY(-7.5px)',
  },
};

export default PasswordInput;