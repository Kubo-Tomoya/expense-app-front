import { useState, useEffect } from 'react';
import { getSummary, getExpenses } from '../api/expenseApi';
import { Link } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

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
  // F-27対応：'confirmed'（確定分のみ）／'forecast'（下書きを含む予測）の表示切替
  const [viewMode, setViewMode] = useState('confirmed');

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

  const isForecast = viewMode === 'forecast';

  // 予測モードなら下書きも含めた全件、確定モードならregisteredのみを対象にする
  const displayExpenses = isForecast ? expenses : expenses.filter((e) => e.status !== 'draft');
  const draftAmountInMonth = expenses
    .filter((e) => e.status === 'draft')
    .reduce((sum, e) => sum + e.amount, 0);

  // カテゴリ別に「確定分」と「下書き分」を別々に集計する。
  // 確定モードでは下書き分は使わないが、予測モードの積み上げ棒グラフでは
  // 1つの棒の中で「確定分（青）＋下書き分（オレンジ）」を分けて表示するために必要
  const confirmedBreakdownMap = {};
  const draftBreakdownMap = {};
  expenses.forEach((e) => {
    if (e.status === 'draft') {
      draftBreakdownMap[e.categoryName] = (draftBreakdownMap[e.categoryName] ?? 0) + e.amount;
    } else {
      confirmedBreakdownMap[e.categoryName] = (confirmedBreakdownMap[e.categoryName] ?? 0) + e.amount;
    }
  });

  // 確定モード：確定分のみのシンプルな棒グラフ用データ
  // 予測モード：確定分・下書き分を両方持つ積み上げ棒グラフ用データ
  const categoryNames = Array.from(new Set([
    ...Object.keys(confirmedBreakdownMap),
    ...(isForecast ? Object.keys(draftBreakdownMap) : []),
  ]));
  const chartData = categoryNames.map((name) => ({
    name,
    confirmedAmount: confirmedBreakdownMap[name] ?? 0,
    draftAmount: isForecast ? (draftBreakdownMap[name] ?? 0) : 0,
  }));

  const totalAmount = displayExpenses.reduce((sum, e) => sum + e.amount, 0);
  const breakdown = chartData.map((c) => ({
    categoryName: c.name,
    amount: c.confirmedAmount + c.draftAmount,
  }));
  const topCategory = breakdown.length > 0
    ? breakdown.reduce((max, c) => (c.amount > max.amount ? c : max), breakdown[0])
    : null;
  const topCategoryPercent = topCategory && totalAmount > 0
    ? Math.round((topCategory.amount / totalAmount) * 100)
    : 0;
  const diffFromLastMonth = prevSummary ? totalAmount - (prevSummary.totalAmount ?? 0) : null;

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

      <div style={styles.modeRow}>
        <select style={styles.modeSelect} value={viewMode} onChange={(e) => setViewMode(e.target.value)}>
          <option value="confirmed">今月の合計（確定分のみ）</option>
          <option value="forecast">今月の合計（下書きを含む予測）</option>
        </select>
      </div>

      {isForecast && (
        <div style={styles.forecastNote}>
          この数値は下書き（未確定）の経費を含む予測です。うち下書き分：¥{draftAmountInMonth.toLocaleString()}
        </div>
      )}

      <div style={styles.cardRow}>
        <div style={{ ...styles.card, ...(isForecast ? styles.cardForecast : styles.cardAccent) }}>
          <p style={styles.cardLabel}>今月の合計金額</p>
          <p style={isForecast ? styles.cardValueForecast : styles.cardValueAccent}>
            ¥{totalAmount.toLocaleString()}{isForecast && '（予測）'}
          </p>
          {diffFromLastMonth !== null && (
            <p style={styles.cardSub}>先月比 {diffFromLastMonth >= 0 ? '+' : ''}¥{diffFromLastMonth.toLocaleString()}</p>
          )}
        </div>
        <div style={{ ...styles.card, ...(isForecast ? styles.cardForecast : {}) }}>
          <p style={styles.cardLabel}>今月の件数</p>
          <p style={styles.cardValue}>{displayExpenses.length}件</p>
        </div>
        <div style={{ ...styles.card, ...(isForecast ? styles.cardForecast : {}) }}>
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
            <ResponsiveContainer width="100%" height={isForecast ? 240 : 220}>
              <BarChart data={chartData} layout="vertical" margin={{ left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" />
                <YAxis type="category" dataKey="name" width={70} />
                <Tooltip formatter={(v) => `¥${v.toLocaleString()}`} />
                {isForecast && <Legend wrapperStyle={{ fontSize: '12px' }} />}
                {/* 確定分は常に青。予測モードでは下書き分（オレンジ）を積み上げて表示する */}
                <Bar dataKey="confirmedAmount" name="確定分" stackId="a" fill="#1a4fa0" radius={isForecast ? [0, 0, 0, 0] : [0, 4, 4, 0]} />
                {isForecast && (
                  <Bar dataKey="draftAmount" name="下書き分" stackId="a" fill="#c98a1a" radius={[0, 4, 4, 0]} />
                )}
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
                    <td style={styles.tdTitle}>
                      {e.title}
                      {e.status === 'draft' && <span style={styles.draftBadge}>下書き</span>}
                    </td>
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
  topBar: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' },
  title: { fontSize: '20px', fontWeight: '600', margin: 0 },
  monthSwitcher: { display: 'flex', alignItems: 'center', gap: '10px' },
  arrowBtn: { border: '1px solid #dee2e6', background: '#fff', borderRadius: '6px', width: '28px', height: '28px', cursor: 'pointer' },
  monthLabel: { fontSize: '14px', fontWeight: '500', minWidth: '90px', textAlign: 'center' },
  modeRow: { display: 'flex', justifyContent: 'flex-end', marginBottom: '12px' },
  modeSelect: { padding: '6px 10px', fontSize: '13px', border: '1px solid #dee2e6', borderRadius: '6px', backgroundColor: '#fff' },
  forecastNote: { backgroundColor: '#fff4e0', border: '1px solid #f0c987', borderRadius: '6px', padding: '8px 12px', fontSize: '12.5px', color: '#8a5a00', marginBottom: '16px' },
  cardRow: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '20px' },
  card: { backgroundColor: '#fff', border: '1px solid #dee2e6', borderRadius: '8px', padding: '18px' },
  cardAccent: { borderColor: '#1a4fa0' },
  cardForecast: { borderColor: '#f0c987', borderWidth: '2px', backgroundColor: '#fffaf0' },
  cardLabel: { fontSize: '12px', color: '#888', margin: '0 0 6px' },
  cardValue: { fontSize: '22px', fontWeight: '700', margin: 0 },
  cardValueAccent: { fontSize: '26px', fontWeight: '700', color: '#1a4fa0', margin: 0 },
  cardValueForecast: { fontSize: '26px', fontWeight: '700', color: '#8a5a00', margin: 0 },
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
  draftBadge: { fontSize: '10px', color: '#888', backgroundColor: '#f0f2f5', padding: '1px 6px', borderRadius: '4px', marginLeft: '6px', fontWeight: '400' },
  tdCategory: { padding: '8px 4px' },
  badge: { fontSize: '11px', padding: '2px 8px', borderRadius: '10px', backgroundColor: '#f0f2f5', color: '#555' },
  tdDate: { padding: '8px 4px', fontSize: '12px', color: '#888', textAlign: 'right' },
  tdAmount: { padding: '8px 4px', fontSize: '13px', fontWeight: '600', textAlign: 'right' },
  errorText: { color: '#c0392b', fontSize: '14px' },
};

export default Dashboard;