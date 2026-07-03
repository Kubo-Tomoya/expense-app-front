import { useState, useEffect } from 'react';
import { getSummary, getExpenses } from '../api/expenseApi';
import { Link } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

function toYearMonthParam(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}
function formatMonthLabel(date) {
  return `${date.getFullYear()}年${date.getMonth() + 1}月`;
}
function formatShortDate(dateStr) {
  const d = new Date(dateStr);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

function Dashboard() {
  const [targetDate, setTargetDate] = useState(new Date());
  const [summary, setSummary] = useState(null);
  const [prevSummary, setPrevSummary] = useState(null);
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
  const fetchAll = async () => {
    setLoading(true);
    setError(null);
    try {
      const year = targetDate.getFullYear();
      const month = targetDate.getMonth() + 1; // 1〜12
      const prevDate = new Date(year, targetDate.getMonth() - 1, 1);
      const prevYear = prevDate.getFullYear();
      const prevMonth = prevDate.getMonth() + 1;

      const [summaryRes, prevSummaryRes, expensesRes] = await Promise.all([
        getSummary(year, month),
        getSummary(prevYear, prevMonth).catch(() => ({ data: null })),
        getExpenses(toYearMonthParam(targetDate)),
      ]);

      setSummary(summaryRes.data);
      setPrevSummary(prevSummaryRes.data);
      setExpenses(Array.isArray(expensesRes.data) ? expensesRes.data : (expensesRes.data.content ?? []));
    } catch (err) {
      console.error(err);
      setError('データの取得に失敗しました');
    } finally {
      setLoading(false);
    }
  };
  fetchAll();
 }, [targetDate]);

  const changeMonth = (diff) => {
    setTargetDate((prev) => new Date(prev.getFullYear(), prev.getMonth() + diff, 1));
  };

  if (loading) return <div style={styles.page}>読み込み中...</div>;
  if (error) return <div style={styles.page}><p style={styles.errorText}>{error}</p></div>;

  const breakdownObj = summary?.categoryBreakdown ?? {};
  const breakdown = Object.entries(breakdownObj).map(([categoryName, amount]) => ({
    categoryName,
    amount: Number(amount),
  }));
  const totalAmount = summary?.totalAmount ?? 0;
  const topCategory = breakdown.length > 0
    ? breakdown.reduce((max, c) => (c.amount > max.amount ? c : max), breakdown[0])
    : null;
  const topCategoryPercent = topCategory && totalAmount > 0
    ? Math.round((topCategory.amount / totalAmount) * 100)
    : 0;
  const diffFromLastMonth = prevSummary ? totalAmount - (prevSummary.totalAmount ?? 0) : null;
  const chartData = breakdown.map((c) => ({ name: c.categoryName, amount: c.amount }));

  return (
    <div style={styles.page}>
      <div style={styles.topBar}>
        <h1 style={styles.title}>ダッシュボード</h1>
        <div style={styles.monthSwitcher}>
          <button style={styles.arrowBtn} onClick={() => changeMonth(-1)}>◀</button>
          <span style={styles.monthLabel}>{formatMonthLabel(targetDate)}</span>
          <button style={styles.arrowBtn} onClick={() => changeMonth(1)}>▶</button>
        </div>
      </div>

      <div style={styles.cardRow}>
        <div style={{ ...styles.card, ...styles.cardAccent }}>
          <p style={styles.cardLabel}>今月の合計金額</p>
          <p style={styles.cardValueAccent}>¥{totalAmount.toLocaleString()}</p>
          {diffFromLastMonth !== null && (
            <p style={styles.cardSub}>先月比 {diffFromLastMonth >= 0 ? '+' : ''}¥{diffFromLastMonth.toLocaleString()}</p>
          )}
        </div>
        <div style={styles.card}>
          <p style={styles.cardLabel}>今月の件数</p>
          <p style={styles.cardValue}>{expenses.length}件</p>
        </div>
        <div style={styles.card}>
          <p style={styles.cardLabel}>最多カテゴリ</p>
          <p style={styles.cardValue}>{topCategory ? topCategory.categoryName : '—'}</p>
          {topCategory && <p style={styles.cardSub}>¥{topCategory.amount.toLocaleString()}（{topCategoryPercent}%）</p>}
        </div>
      </div>

      <div style={styles.panelRow}>
        <div style={styles.panel}>
          <div style={styles.panelHeader}>
            <p style={styles.panelTitle}>カテゴリ別金額</p>
            <Link to="/summary" style={styles.panelLink}>集計へ →</Link>
          </div>
          {chartData.length === 0 ? (
            <p style={styles.emptyText}>データがありません</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={chartData} layout="vertical" margin={{ left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" />
                <YAxis type="category" dataKey="name" width={70} />
                <Tooltip formatter={(v) => `¥${v.toLocaleString()}`} />
                <Bar dataKey="amount" fill="#1a4fa0" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div style={styles.panel}>
          <div style={styles.panelHeader}>
            <p style={styles.panelTitle}>今月の経費（全件）</p>
            <Link to="/expenses" style={styles.panelLink}>一覧へ →</Link>
          </div>
          {expenses.length === 0 ? (
            <p style={styles.emptyText}>今月の経費データはまだありません</p>
          ) : (
            <table style={styles.table}>
              <tbody>
                {expenses.map((e) => (
                  <tr key={e.id} style={styles.tableRow}>
                    <td style={styles.tdTitle}>{e.title}</td>
                    <td style={styles.tdCategory}><span style={styles.badge}>{e.categoryName}</span></td>
                    <td style={styles.tdDate}>{formatShortDate(e.expenseDate)}</td>
                    <td style={styles.tdAmount}>¥{e.amount.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

const styles = {
  page: { padding: '24px' },
  topBar: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' },
  title: { fontSize: '20px', fontWeight: '600', margin: 0 },
  monthSwitcher: { display: 'flex', alignItems: 'center', gap: '10px' },
  arrowBtn: { border: '1px solid #dee2e6', background: '#fff', borderRadius: '6px', width: '28px', height: '28px', cursor: 'pointer' },
  monthLabel: { fontSize: '14px', fontWeight: '500', minWidth: '90px', textAlign: 'center' },
  cardRow: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '20px' },
  card: { backgroundColor: '#fff', border: '1px solid #dee2e6', borderRadius: '8px', padding: '18px' },
  cardAccent: { borderColor: '#1a4fa0' },
  cardLabel: { fontSize: '12px', color: '#888', margin: '0 0 6px' },
  cardValue: { fontSize: '22px', fontWeight: '700', margin: 0 },
  cardValueAccent: { fontSize: '26px', fontWeight: '700', color: '#1a4fa0', margin: 0 },
  cardSub: { fontSize: '12px', color: '#888', margin: '6px 0 0' },
  panelRow: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' },
  panel: { backgroundColor: '#fff', border: '1px solid #dee2e6', borderRadius: '8px', padding: '18px' },
  panelHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' },
  panelTitle: { fontSize: '14px', fontWeight: '600', margin: 0 },
  panelLink: { fontSize: '12px', color: '#1a4fa0', textDecoration: 'none' },
  emptyText: { fontSize: '13px', color: '#888' },
  table: { width: '100%', borderCollapse: 'collapse' },
  tableRow: { borderBottom: '1px solid #f0f2f5' },
  tdTitle: { padding: '8px 4px', fontSize: '13px', fontWeight: '500' },
  tdCategory: { padding: '8px 4px' },
  badge: { fontSize: '11px', padding: '2px 8px', borderRadius: '10px', backgroundColor: '#f0f2f5', color: '#555' },
  tdDate: { padding: '8px 4px', fontSize: '12px', color: '#888', textAlign: 'right' },
  tdAmount: { padding: '8px 4px', fontSize: '13px', fontWeight: '600', textAlign: 'right' },
  errorText: { color: '#c0392b', fontSize: '14px' },
};

export default Dashboard;