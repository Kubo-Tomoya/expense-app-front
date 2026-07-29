import Sidebar from './Sidebar';

/**
 * ログイン後の全画面で共通のレイアウト（Sidebar＋メインコンテンツ）。
 * 各ページコンポーネント（Dashboard等）は、このLayoutの中の
 * childrenとして描画される
 */
function Layout({ children }) {
  return (
    <div style={styles.container}>
      <Sidebar />
      <main style={styles.main}>{children}</main>
    </div>
  );
}

const styles = {
  container: { display: 'flex', minHeight: '100vh' },
  main: { flex: 1, backgroundColor: '#f5f6f8', overflow: 'auto' },
};

export default Layout;