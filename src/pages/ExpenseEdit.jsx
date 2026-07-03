import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { getExpenseById, deleteExpense } from '../api/expenseApi';
import ExpenseForm from '../components/ExpenseForm';
import Toast from '../components/Toast';

function ExpenseEdit() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [initialData, setInitialData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getExpenseById(id)
      .then((res) => { if (!cancelled) setInitialData(res.data); })
      .catch((err) => {
        console.error(err);
        if (!cancelled) setError('データの取得に失敗しました');
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [id]);

  const handleDelete = async () => {
    if (!window.confirm('この経費を削除しますか？この操作は取り消せません。')) return;
    try {
      await deleteExpense(id);
      navigate('/expenses');
    } catch (err) {
      console.error(err);
      alert('削除に失敗しました');
    }
  };

  if (loading) return <div style={styles.page}>読み込み中...</div>;
  if (error || !initialData) {
    return <div style={styles.page}><p style={styles.errorText}>{error || 'データが見つかりません'}</p></div>;
  }

  return (
    <div style={styles.page}>
      <div style={styles.breadcrumb}>
        <Link to="/expenses" style={styles.breadcrumbLink}>← 一覧に戻る</Link>
        <span style={styles.breadcrumbSep}>/</span>
        <span>経費編集</span>
      </div>

      <ExpenseForm
        mode="edit"
        expenseId={id}
        initialData={initialData}
        onSuccess={(msg) => setToast({ message: msg, type: 'success' })}
        onDelete={handleDelete}
      />

      <Toast message={toast?.message} type={toast?.type} onClose={() => setToast(null)} />
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

export default ExpenseEdit;