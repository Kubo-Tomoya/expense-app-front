import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getClientById } from '../api/clientApi';
import ClientForm from '../components/ClientForm';

// S-12 取引先登録・編集画面（編集モード）。
// 初期表示でGET /api/clients/{id}を実行し、既存データをフォームに反映する
function ClientEdit() {
  const { id } = useParams();
  const [initialData, setInitialData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getClientById(id)
      .then((res) => { if (!cancelled) setInitialData(res.data); })
      .catch((err) => {
        console.error(err);
        if (!cancelled) setError('データの取得に失敗しました');
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [id]);

  if (loading) return <div style={styles.page}>読み込み中...</div>;
  if (error || !initialData) {
    return <div style={styles.page}><p style={styles.errorText}>{error || 'データが見つかりません'}</p></div>;
  }

  return (
    <div style={styles.page}>
      <div style={styles.breadcrumb}>
        <Link to="/clients" style={styles.breadcrumbLink}>← 一覧に戻る</Link>
        <span style={styles.breadcrumbSep}>/</span>
        <span>取引先編集</span>
      </div>

      <ClientForm mode="edit" clientId={id} initialData={initialData} />
    </div>
  );
}

const styles = {
  page: { padding: '24px' },
  breadcrumb: { fontSize: '13px', color: '#888', marginBottom: '20px' },
  breadcrumbLink: { color: '#1a4fa0', textDecoration: 'none' },
  breadcrumbSep: { margin: '0 8px' },
  errorText: { color: '#c0392b', fontSize: '14px' },
};

export default ClientEdit;
