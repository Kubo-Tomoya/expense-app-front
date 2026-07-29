import { useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { confirmPasswordReset } from '../api/authApi';
import PasswordInput from '../components/PasswordInput';

function PasswordResetConfirmPage() {
  // メール内リンク（/reset-password?token=xxxx）のクエリパラメータからtokenを取得する
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const navigate = useNavigate();

  const [newPassword, setNewPassword] = useState('');
  const [newPasswordConfirm, setNewPasswordConfirm] = useState('');
  const [errors, setErrors] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  const validate = () => {
    const errs = [];
    if (newPassword.length < 8) errs.push('パスワードは8文字以上で入力してください');
    if (newPassword !== newPasswordConfirm) errs.push('パスワードが一致しません');
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
      await confirmPasswordReset(token, newPassword);
      // 変更後は自動ログインさせず、ログイン画面へ誘導する（F-12の登録時と同じ方針）
      navigate('/login', { state: { passwordReset: true } });
    } catch (err) {
      // バックエンドのInvalidResetTokenException（400）のメッセージをそのまま表示する。
      // 「トークンが無効」「期限切れ」「使用済み」のいずれもここでまとめて表示される
      const message = err.response?.data?.message ?? 'パスワードの再設定に失敗しました';
      setErrors([message]);
    } finally {
      setSubmitting(false);
    }
  };

  // URLにtokenが無い状態でこの画面を直接開かれた場合の異常系
  if (!token) {
    return (
      <div style={styles.page}>
        <div style={styles.card}>
          <div style={styles.header}>
            <div style={styles.logo}>💴</div>
            <p style={styles.title}>ExpenseNote</p>
          </div>
          <p style={styles.errorBanner}>無効なリンクです。パスワード再設定を最初からやり直してください。</p>
          <div style={styles.footer}>
            <Link to="/password-reset/request" style={styles.link}>パスワード再設定をやり直す</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <div style={styles.header}>
          <div style={styles.logo}>💴</div>
          <p style={styles.title}>ExpenseNote</p>
          <p style={styles.subtitle}>新しいパスワードを設定</p>
        </div>

        {errors.length > 0 && (
          <div style={styles.errorBannerBox}>
            {errors.map((msg, i) => <p key={i} style={styles.errorLine}>・{msg}</p>)}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <label style={styles.label}>新しいパスワード</label>
          <PasswordInput
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="8文字以上"
            style={{ marginBottom: '14px' }}
          />

          <label style={styles.label}>確認のため再入力</label>
          <PasswordInput
            value={newPasswordConfirm}
            onChange={(e) => setNewPasswordConfirm(e.target.value)}
            placeholder="もう一度入力"
            style={{ marginBottom: '20px' }}
          />

          <button type="submit" style={styles.primaryBtn} disabled={submitting}>
            {submitting ? '変更中...' : 'パスワードを変更'}
          </button>
        </form>
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
  primaryBtn: { width: '100%', padding: '10px', backgroundColor: '#1a4fa0', color: '#fff', border: 'none', borderRadius: '6px', fontSize: '14px', cursor: 'pointer' },
  footer: { textAlign: 'center', fontSize: '13px', color: '#888', marginTop: '16px' },
  link: { color: '#1a4fa0', textDecoration: 'none' },
  errorBanner: { fontSize: '13px', color: '#c0392b', textAlign: 'center', margin: '8px 0 16px' },
  errorBannerBox: { backgroundColor: '#fdecea', border: '1px solid #f5c6cb', borderRadius: '6px', padding: '10px 12px', marginBottom: '16px' },
  errorLine: { fontSize: '13px', color: '#c0392b', margin: '2px 0' },
};

export default PasswordResetConfirmPage;