import { useState } from 'react';
import { Link } from 'react-router-dom';
import { requestPasswordReset } from '../api/authApi';

function PasswordResetRequestPage() {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await requestPasswordReset(email);
    } finally {
      // バックエンド側は、メールアドレスが実在するか否かに関わらず
      // 常に同じレスポンス（204）を返す設計（メールエニュメレーション対策）。
      // フロント側もこれに合わせ、成功・失敗を区別せず常に同じ完了画面を表示する。
      // 「登録されていません」等の個別メッセージを出すと、その対策が無意味になるため
      setSubmitting(false);
      setSubmitted(true);
    }
  };

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <div style={styles.header}>
          <div style={styles.logo}>💴</div>
          <p style={styles.title}>ExpenseNote</p>
          <p style={styles.subtitle}>パスワード再設定</p>
        </div>

        {submitted ? (
          <p style={styles.successBanner}>
            入力されたメールアドレス宛に、パスワード再設定用のリンクをお送りしました（該当するアカウントが存在する場合）。メールをご確認ください。
          </p>
        ) : (
          <form onSubmit={handleSubmit}>
            <label style={styles.label}>メールアドレス</label>
            <input
              type="email"
              style={styles.input}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@example.com"
              required
            />
            <button type="submit" style={styles.primaryBtn} disabled={submitting}>
              {submitting ? '送信中...' : '送信する'}
            </button>
          </form>
        )}

        <div style={styles.footer}>
          <Link to="/login" style={styles.link}>ログイン画面に戻る</Link>
        </div>
      </div>
    </div>
  );
}

const styles = {
  page: { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f5f6f8' },
  card: { backgroundColor: '#fff', border: '1px solid #dee2e6', borderRadius: '12px', padding: '32px', width: '100%', maxWidth: '340px' },
  header: { textAlign: 'center', marginBottom: '24px' },
  logo: { width: '44px', height: '44px', borderRadius: '10px', backgroundColor: '#1a4fa0', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px', fontSize: '20px' },
  title: { fontWeight: '500', fontSize: '18px', margin: 0 },
  subtitle: { fontSize: '13px', color: '#888', margin: '4px 0 0' },
  label: { display: 'block', fontSize: '12px', color: '#888', margin: '0 0 4px' },
  input: { width: '100%', padding: '8px 10px', fontSize: '14px', border: '1px solid #dee2e6', borderRadius: '6px', boxSizing: 'border-box', marginBottom: '16px' },
  primaryBtn: { width: '100%', padding: '10px', backgroundColor: '#1a4fa0', color: '#fff', border: 'none', borderRadius: '6px', fontSize: '14px', cursor: 'pointer' },
  footer: { textAlign: 'center', fontSize: '13px', color: '#888', marginTop: '16px' },
  link: { color: '#1a4fa0', textDecoration: 'none' },
  successBanner: { backgroundColor: '#e6f4ea', border: '1px solid #b7dfc0', borderRadius: '6px', padding: '12px 14px', fontSize: '13px', color: '#2e7d32', lineHeight: '1.6' },
};

export default PasswordResetRequestPage;