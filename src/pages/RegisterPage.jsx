import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { register } from '../api/authApi';
import PasswordInput from '../components/PasswordInput';


function RegisterPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [errors, setErrors] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();

  // クライアント側の事前チェック。パスワード一致確認はAPIには送らずここで完結させる
  const validate = () => {
    const errs = [];
    if (password.length < 8) errs.push('パスワードは8文字以上で入力してください');
    if (password !== passwordConfirm) errs.push('パスワードが一致しません');
    return errs;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const clientErrors = validate();
    if (clientErrors.length > 0) {
      setErrors(clientErrors);
      return;
    }
    setErrors([]);
    setSubmitting(true);
    try {
      await register(email, password);
      // 登録直後に自動ログインはさせず、ログイン画面へ誘導する。
      // F-13（パスワード再設定後は改めてログインさせる）との一貫性を優先した設計判断
      navigate('/login', { state: { registered: true } });
    } catch (err) {
      const message = err.response?.data?.message ?? '登録に失敗しました';
      setErrors([message]);
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
          <p style={styles.subtitle}>アカウントを作成</p>
        </div>

        {errors.length > 0 && (
          <div style={styles.errorBanner}>
            {errors.map((msg, i) => <p key={i} style={styles.errorLine}>・{msg}</p>)}
          </div>
        )}

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

          <label style={styles.label}>パスワード（確認）</label>
          <PasswordInput
            value={passwordConfirm}
            onChange={(e) => setPasswordConfirm(e.target.value)}
            placeholder="もう一度入力"
            style={{ marginBottom: '20px' }}
          />

          <button type="submit" style={styles.primaryBtn} disabled={submitting}>
            {submitting ? '登録中...' : '登録する'}
          </button>
        </form>

        <div style={styles.footer}>
          すでにアカウントをお持ちの方は <Link to="/login" style={styles.link}>ログイン</Link>
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
  primaryBtn: { width: '100%', padding: '10px', backgroundColor: '#1a4fa0', color: '#fff', border: 'none', borderRadius: '6px', fontSize: '14px', cursor: 'pointer', marginBottom: '16px' },
  footer: { textAlign: 'center', fontSize: '13px', color: '#888' },
  errorBanner: { backgroundColor: '#fdecea', border: '1px solid #f5c6cb', borderRadius: '6px', padding: '10px 12px', marginBottom: '16px' },
  errorLine: { fontSize: '13px', color: '#c0392b', margin: '2px 0' },
};

export default RegisterPage;