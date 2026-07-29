import { useState, useEffect, useMemo, Fragment } from 'react';
import { getExpenses } from '../api/expenseApi';
import { Link } from 'react-router-dom';
import ExpenseDrawer from '../components/ExpenseDrawer';
import Toast from '../components/Toast';

const CATEGORY_BADGE = {
  '交通費': { bg: '#e8f0fe', color: '#1a4fa0' },
  '消耗品費': { bg: '#e6f4ea', color: '#2e8b57' },
};
const DEFAULT_BADGE = { bg: '#f0f2f5', color: '#555' };

function toYearMonthParam(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}
function formatMonthLabel(date) {
  return `${date.getFullYear()}年${date.getMonth() + 1}月`;
}
function formatShortDate(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

function ExpenseList() {
  const [targetDate, setTargetDate] = useState(new Date());
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sortDir, setSortDir] = useState('desc');
  const [selectedId, setSelectedId] = useState(null);
  const [toast, setToast] = useState(null);

  const fetchExpenses = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getExpenses(toYearMonthParam(targetDate));
      setExpenses(res.data);
    } catch (err) {
      console.error(err);
      setError('一覧の取得に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchExpenses(); }, [targetDate]);

  const changeMonth = (diff) => {
    setTargetDate((prev) => new Date(prev.getFullYear(), prev.getMonth() + diff, 1));
    setSelectedId(null);
  };

  const sortedExpenses = useMemo(() => {
    const list = [...expenses];
    list.sort((a, b) => {
      const diff = new Date(a.expenseDate) - new Date(b.expenseDate);
      return sortDir === 'desc' ? -diff : diff;
    });
    return list;
  }, [expenses, sortDir]);

  // F-27対応：確定分（registered）と下書き分（draft）の合計を分けて表示する。
  // 一覧自体は下書きも含めて全件表示するが、合計金額は
  // ダッシュボードの考え方（下書きは未確定の見込み）と一貫性を持たせる
  const confirmedAmount = expenses
    .filter((e) => e.status !== 'draft')
    .reduce((sum, e) => sum + e.amount, 0);
  const draftAmount = expenses
    .filter((e) => e.status === 'draft')
    .reduce((sum, e) => sum + e.amount, 0);

  const handleDeleted = (deletedId) => {
    setExpenses((prev) => prev.filter((e) => e.id !== deletedId));
    setSelectedId(null);
    setToast({ message: '削除しました', type: 'success' });
  };

  if (loading) return <div style={styles.page}>読み込み中...</div>;
  if (error) return <div style={styles.page}><p style={styles.errorText}>{error}</p></div>;

  return (
    <div style={styles.page}>
      <div style={styles.topBar}>
        <h1 style={styles.title}>経費一覧</h1>
        <Link to="/expenses/create" style={styles.newBtn}>+ 新規登録</Link>
      </div>

      <div style={styles.filterBar}>
        <button style={styles.arrowBtn} onClick={() => changeMonth(-1)}>◀</button>
        <span style={styles.monthLabel}>{formatMonthLabel(targetDate)}</span>
        <button style={styles.arrowBtn} onClick={() => changeMonth(1)}>▶</button>
        {/* キーワード検索バーはF-10で追加予定 */}
      </div>

      {sortedExpenses.length === 0 ? (
        <p style={styles.emptyText}>この月の経費データはまだありません</p>
      ) : (
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={{ ...styles.th, width: '30%', textAlign: 'left' }}>タイトル</th>
              <th style={{ ...styles.th, width: '18%', textAlign: 'left' }}>カテゴリ</th>
              <th
                style={{ ...styles.th, width: '14%', textAlign: 'right', cursor: 'pointer' }}
                onClick={() => setSortDir((d) => (d === 'desc' ? 'asc' : 'desc'))}
              >
                日付 {sortDir === 'desc' ? '▼' : '▲'}
              </th>
              <th style={{ ...styles.th, width: '14%', textAlign: 'right' }}>金額</th>
              <th style={{ ...styles.th, width: '12%', textAlign: 'center' }}>領収書</th>
              <th style={{ ...styles.th, width: '12%', textAlign: 'right' }}>登録日</th>
            </tr>
          </thead>
          <tbody>
            {sortedExpenses.map((e) => {
              const badge = CATEGORY_BADGE[e.categoryName] || DEFAULT_BADGE;
              return (
                <Fragment key={e.id}>
                  <tr
                    style={{ ...styles.row, ...(selectedId === e.id ? styles.rowActive : {}) }}
                    onClick={() => setSelectedId((prev) => (prev === e.id ? null : e.id))}
                  >
                    <td style={styles.tdTitle}>
                      {e.title}
                      {e.status === 'draft' && <span style={styles.draftBadge}>下書き</span>}
                    </td>
                    <td style={styles.td}>
                      <span style={{ ...styles.badge, backgroundColor: badge.bg, color: badge.color }}>
                        {e.categoryName}
                      </span>
                    </td>
                    <td style={styles.tdRight}>{formatShortDate(e.expenseDate)}</td>
                    <td style={styles.tdAmount}>¥{e.amount.toLocaleString()}</td>
                    <td style={styles.tdCenter}>
                      {e.receiptImagePath
                        ? <span style={styles.receiptYes} title="領収書あり">✓</span>
                        : <span style={styles.receiptNo} title="領収書なし">—</span>}
                    </td>
                    <td style={styles.tdRegistered}>{formatShortDate(e.createdAt)}</td>
                  </tr>
                  {selectedId === e.id && (
                    <tr>
                      <td colSpan={6} style={{ padding: 0, border: 'none' }}>
                        <ExpenseDrawer
                          expenseId={e.id}
                          onClose={() => setSelectedId(null)}
                          onDeleted={() => handleDeleted(e.id)}
                        />
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      )}

      <div style={styles.footer}>
        <span>
          {expenses.length}件 / 今月合計（確定分） ¥{confirmedAmount.toLocaleString()}
          {draftAmount > 0 && `（下書き含む場合 ¥${(confirmedAmount + draftAmount).toLocaleString()}）`}
        </span>
        <span style={styles.hint}>行をクリックで詳細表示</span>
      </div>

      <Toast message={toast?.message} type={toast?.type} onClose={() => setToast(null)} />
    </div>
  );
}

const styles = {
  page: { padding: '24px' },
  topBar: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' },
  title: { fontSize: '20px', fontWeight: '600', margin: 0 },
  newBtn: { padding: '8px 16px', fontSize: '13px', backgroundColor: '#1a4fa0', color: '#fff', borderRadius: '6px', textDecoration: 'none' },
  filterBar: { display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' },
  arrowBtn: { border: '1px solid #dee2e6', background: '#fff', borderRadius: '6px', width: '28px', height: '28px', cursor: 'pointer' },
  monthLabel: { fontSize: '14px', fontWeight: '500', minWidth: '90px', textAlign: 'center' },
  table: { width: '100%', borderCollapse: 'collapse', backgroundColor: '#fff', border: '1px solid #dee2e6', borderRadius: '8px' },
  th: { padding: '10px 12px', fontSize: '12px', color: '#888', borderBottom: '1px solid #dee2e6' },
  row: { cursor: 'pointer', borderBottom: '1px solid #f0f2f5' },
  rowActive: { backgroundColor: '#f0f6ff' },
  td: { padding: '10px 12px', fontSize: '13px' },
  tdTitle: { padding: '10px 12px', fontSize: '13px', fontWeight: '500' },
  draftBadge: { fontSize: '10px', color: '#888', backgroundColor: '#f0f2f5', padding: '1px 6px', borderRadius: '4px', marginLeft: '6px', fontWeight: '400' },
  tdRight: { padding: '10px 12px', fontSize: '12px', color: '#888', textAlign: 'right' },
  tdAmount: { padding: '10px 12px', fontSize: '13px', fontWeight: '600', textAlign: 'right' },
  tdCenter: { padding: '10px 12px', textAlign: 'center' },
  tdRegistered: { padding: '10px 12px', fontSize: '11px', color: '#aaa', textAlign: 'right' },
  badge: { fontSize: '11px', padding: '2px 8px', borderRadius: '10px' },
  receiptYes: { color: '#2e8b57', fontWeight: '700' },
  receiptNo: { color: '#ccc' },
  footer: { display: 'flex', justifyContent: 'space-between', marginTop: '12px', fontSize: '12px', color: '#888' },
  hint: { color: '#aaa' },
  emptyText: { fontSize: '13px', color: '#888' },
  errorText: { color: '#c0392b', fontSize: '14px' },
};

export default ExpenseList;