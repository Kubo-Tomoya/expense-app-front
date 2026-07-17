import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Layout from './Layout';

/**
 * ログイン必須の画面を保護するラッパーコンポーネント。
 *
 * loading中（起動直後、/api/auth/meの確認がまだ終わっていない状態）は、
 * ログイン判定を一切行わない。ここで判定してしまうと、実際はログイン済みの
 * ユーザーに対しても、確認が終わるまでの一瞬だけ/loginへ誤ってリダイレクトする
 * "チラつき"が発生するため、確認が終わるまでは待機する
 */
function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return <div style={styles.loading}>読み込み中...</div>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // ログイン確認が取れたら、Sidebar付きのLayoutで画面を包んで表示する
  return <Layout>{children}</Layout>;
}

const styles = {
  loading: { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#888', fontSize: '14px' },
};

export default ProtectedRoute;