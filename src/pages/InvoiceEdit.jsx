import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getInvoiceById } from '../api/invoiceApi';
import InvoiceForm from '../components/InvoiceForm';

/**
 * S-14 請求書作成・編集画面（編集モード）。
 *
 * 編集できるのは下書きのみ。発行済み・取消済みは適格請求書として
 * 発行時点の記載事項を保持する必要があるため、この画面では開かせず
 * S-13の詳細ドロワーで閲覧させる（S-14の設計判断）
 */
function InvoiceEdit() {
  const { id } = useParams();
  const [initialData, setInitialData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getInvoiceById(id)
      .then((res) => {
        if (cancelled) return;
        if (res.data.status !== 'draft') {
          setError('発行済み・取消済みの請求書は編集できません。一覧の詳細から内容を確認してください');
          return;
        }
        setInitialData(res.data);
      })
      .catch((err) => {
        console.error(err);
        if (!cancelled) setError('データの取得に失敗しました');
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [id]);

  if (loading) return <div style={styles.page}>読み込み中...</div>;

  return (
    <div style={styles.page}>
      <div style={styles.breadcrumb}>
        <Link to="/invoices" style={styles.breadcrumbLink}>← 一覧に戻る</Link>
        <span style={styles.breadcrumbSep}>/</span>
        <span>請求書編集</span>
      </div>

      {error || !initialData
        ? <p style={styles.errorText}>{error || 'データが見つかりません'}</p>
        : <InvoiceForm mode="edit" invoiceId={id} initialData={initialData} />}
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

export default InvoiceEdit;
