import { useState, useEffect } from 'react';
import { getExpenseById, deleteExpense } from '../api/expenseApi';
import { useNavigate } from 'react-router-dom';

function ExpenseDrawer({ expenseId, onClose, onDeleted }) {
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getExpenseById(expenseId)
      .then((res) => { if (!cancelled) setDetail(res.data); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [expenseId]);

  const handleDelete = async () => {
    if (!window.confirm('この経費を削除しますか？この操作は取り消せません。')) return;
    setDeleting(true);
    try {
      await deleteExpense(expenseId);
      onDeleted();
    } catch (err) {
      console.error(err);
      alert('削除に失敗しました');
    } finally {
      setDeleting(false);
    }
  };

  if (loading) return <div style={styles.drawer}>読み込み中...</div>;
  if (!detail) return null;

  return (
    <div style={styles.drawer}>
      <button style={styles.closeBtn} onClick={onClose}>×</button>
      <div style={styles.grid}>
        <div><p style={styles.label}>金額</p><p style={styles.value}>¥{detail.amount.toLocaleString()}</p></div>
        <div><p style={styles.label}>カテゴリ</p><p style={styles.value}>{detail.categoryName}</p></div>
        <div><p style={styles.label}>日付</p><p style={styles.value}>{detail.expenseDate}</p></div>
        <div><p style={styles.label}>登録日</p><p style={styles.value}>{detail.createdAt?.slice(0, 10)}</p></div>
      </div>
      <div style={styles.memoBlock}>
        <p style={styles.label}>メモ</p>
        <p style={styles.value}>{detail.memo || '（メモなし）'}</p>
      </div>
      {detail.receiptImagePath && (
        <div style={styles.receiptBlock}>
          <p style={styles.label}>領収書</p>
          <a href={detail.receiptImagePath} target="_blank" rel="noreferrer" style={styles.link}>確認 ↗</a>
        </div>
      )}
      <div style={styles.actionRow}>
        <button style={styles.editBtn} onClick={() => navigate(`/expenses/${expenseId}/edit`)}>編集</button>
        <button style={styles.deleteBtn} onClick={handleDelete} disabled={deleting}>
          {deleting ? '削除中...' : '削除'}
        </button>
      </div>
    </div>
  );
}

const styles = {
  drawer: { position: 'relative', backgroundColor: '#f8f9fb', border: '1px solid #dee2e6', borderRadius: '8px', padding: '20px' },
  closeBtn: { position: 'absolute', top: '10px', right: '14px', border: 'none', background: 'none', fontSize: '18px', cursor: 'pointer', color: '#888' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '16px' },
  label: { fontSize: '11px', color: '#888', margin: '0 0 4px' },
  value: { fontSize: '14px', fontWeight: '500', margin: 0 },
  memoBlock: { marginBottom: '16px' },
  receiptBlock: { marginBottom: '16px' },
  link: { fontSize: '13px', color: '#1a4fa0' },
  actionRow: { display: 'flex', gap: '10px' },
  editBtn: { padding: '6px 16px', fontSize: '13px', border: '1px solid #1a4fa0', color: '#1a4fa0', background: '#fff', borderRadius: '6px', cursor: 'pointer' },
  deleteBtn: { padding: '6px 16px', fontSize: '13px', border: '1px solid #c0392b', color: '#c0392b', background: '#fff', borderRadius: '6px', cursor: 'pointer' },
};

export default ExpenseDrawer;