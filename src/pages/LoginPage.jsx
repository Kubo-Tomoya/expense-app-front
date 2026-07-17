import { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import PasswordInput from '../components/PasswordInput';


function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // 新規登録直後の遷移で渡される完了メッセージ（RegisterPageのnavigate時にstateとして渡す）
  const bannerMessage = location.state?.registered
  ? '登録が完了しました。ログインしてください。'
  : location.state?.passwordReset
  ? 'パスワードを再設定しました。新しいパスワードでログインしてください。'
  : null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await login(email, password);
      navigate('/', { replace: true });
    } catch (err) {
      // 401時、バックエンドのGlobalExceptionHandlerが返すメッセージをそのまま使う
      const message = err.response?.data?.message ?? 'ログインに失敗しました';
      setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <div style={styles.header}>
          <div style={styles.logo}>💴</div>
          <p style={styles.title}>ExpenseNote</p>
          <p style={styles.subtitle}>経費精算アプリ</p>
        </div>

        {bannerMessage && <p style={styles.successBanner}>{bannerMessage}</p>}
        {error && <p style={styles.errorBanner}>{error}</p>}

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
          <label style={styles.label}>パスワード</label>
            <PasswordInput
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="8文字以上"
            style={{ marginBottom: '14px' }}
          />

          <div style={styles.forgotRow}>
            {/* F-13のパスワード再設定画面（別ブランチで実装予定）へのリンク */}
            <Link to="/password-reset/request" style={styles.link}>パスワードをお忘れですか？</Link>
          </div>

          <button type="submit" style={styles.primaryBtn} disabled={submitting}>
            {submitting ? 'ログイン中...' : 'ログイン'}
          </button>
        </form>

        <div style={styles.footer}>
          アカウントをお持ちでない方は <Link to="/register" style={styles.link}>新規登録</Link>
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
  input: { width: '100%', padding: '8px 10px', fontSize: '14px', border: '1px solid #dee2e6', borderRadius: '6px', boxSizing: 'border-box', marginBottom: '14px' },
  forgotRow: { textAlign: 'right', marginBottom: '18px' },
  link: { color: '#1a4fa0', textDecoration: 'none', fontSize: '13px' },
  primaryBtn: { width: '100%', padding: '10px', backgroundColor: '#1a4fa0', color: '#fff', border: 'none', borderRadius: '6px', fontSize: '14px', cursor: 'pointer', marginBottom: '16px' },
  footer: { textAlign: 'center', fontSize: '13px', color: '#888' },
  successBanner: { backgroundColor: '#e6f4ea', border: '1px solid #b7dfc0', borderRadius: '6px', padding: '10px 12px', fontSize: '13px', color: '#2e7d32', marginBottom: '16px' },
  errorBanner: { backgroundColor: '#fdecea', border: '1px solid #f5c6cb', borderRadius: '6px', padding: '10px 12px', fontSize: '13px', color: '#c0392b', marginBottom: '16px' },
};

export default LoginPage;