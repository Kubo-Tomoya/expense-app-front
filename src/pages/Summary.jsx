import { useState, useEffect, useMemo } from 'react';
import { getYearlySummary } from '../api/expenseApi';
import { getCategories } from '../api/categoryApi';
import SummaryChart from '../components/SummaryChart';

const MODES = [
  { value: 'monthly', label: '月別集計' },
  { value: 'category', label: 'カテゴリ別' },
  { value: 'yearly', label: '年間推移' },
];

function Summary() {
  const [mode, setMode] = useState('monthly');
  const [targetYear, setTargetYear] = useState(new Date().getFullYear());
  const [categories, setCategories] = useState([]);
  const [yearData, setYearData] = useState(null);
  const [multiYearData, setMultiYearData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    getCategories().then((res) => setCategories(res.data)).catch(() => setCategories([]));
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        if (mode === 'yearly') {
          const years = [targetYear - 2, targetYear - 1, targetYear];
          const results = await Promise.all(
            years.map((y) =>
              getYearlySummary(y).catch(() => ({ data: { year: y, totalAmount: 0, categoryTotals: {}, monthly: [] } }))
            )
          );
          setMultiYearData(results.map((r) => r.data));
        } else {
          const res = await getYearlySummary(targetYear);
          setYearData(res.data);
        }
      } catch (err) {
        console.error(err);
        setError('集計データの取得に失敗しました');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [mode, targetYear]);

  const categoryNames = categories.map((c) => c.name);

  const monthlyChartData = useMemo(() => {
    if (!yearData) return [];
    return yearData.monthly.map((m) => ({ name: `${m.month}月`, value: m.totalAmount }));
  }, [yearData]);

  const categoryChartData = useMemo(() => {
    if (!yearData) return [];
    return Object.entries(yearData.categoryTotals ?? {}).map(([name, value]) => ({ name, value }));
  }, [yearData]);

  const yearlyChartData = useMemo(() => {
    return multiYearData.map((d) => ({ name: `${d.year}年`, value: d.totalAmount }));
  }, [multiYearData]);

  const chartData = mode === 'monthly' ? monthlyChartData : mode === 'category' ? categoryChartData : yearlyChartData;
  const chartType = mode === 'category' ? 'pie' : 'bar';
  const chartTitle =
    mode === 'monthly' ? `月別合計金額（${targetYear}年）` :
    mode === 'category' ? `カテゴリ別金額（${targetYear}年）` :
    '年別合計金額推移';

  const changeYear = (diff) => setTargetYear((y) => y + diff);

  if (loading) return <div style={styles.page}>読み込み中...</div>;
  if (error) return <div style={styles.page}><p style={styles.errorText}>{error}</p></div>;

  return (
    <div style={styles.page}>
      <div style={styles.topBar}>
        <h1 style={styles.title}>集計</h1>
        <button style={styles.csvBtn} disabled title="拡張機能として今後実装予定">CSVエクスポート</button>
      </div>

      <div style={styles.controlBar}>
        <select style={styles.select} value={mode} onChange={(e) => setMode(e.target.value)}>
          {MODES.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
        </select>
        <div style={styles.yearSwitcher}>
          <button style={styles.arrowBtn} onClick={() => changeYear(-1)}>◀</button>
          <span style={styles.yearLabel}>{targetYear}年</span>
          <button style={styles.arrowBtn} onClick={() => changeYear(1)}>▶</button>
        </div>
      </div>

      <div style={styles.panel}>
        <p style={styles.panelTitle}>{chartTitle}</p>
        <SummaryChart type={chartType} data={chartData} />
      </div>

      <div style={styles.panel}>
        <p style={styles.panelTitle}>集計テーブル</p>
        {mode === 'monthly' && <MonthlyTable yearData={yearData} categoryNames={categoryNames} />}
        {mode === 'category' && <CategoryTable yearData={yearData} categoryNames={categoryNames} />}
        {mode === 'yearly' && <YearlyTable multiYearData={multiYearData} />}
      </div>
    </div>
  );
}

function MonthlyTable({ yearData, categoryNames }) {
  if (!yearData) return null;
  const monthly = yearData.monthly;
  const categoryYearTotals = categoryNames.reduce((acc, name) => {
    acc[name] = monthly.reduce((sum, m) => sum + (m.categoryBreakdown[name] ?? 0), 0);
    return acc;
  }, {});
  return (
    <table style={styles.table}>
      <thead>
        <tr>
          <th style={styles.thLeft}>月</th>
          {categoryNames.map((name) => <th key={name} style={styles.th}>{name}</th>)}
          <th style={{ ...styles.th, ...styles.thTotal }}>合計</th>
        </tr>
      </thead>
      <tbody>
        {monthly.map((m) => (
          <tr key={m.month}>
            <td style={styles.td}>{m.month}月</td>
            {categoryNames.map((name) => (
              <td key={name} style={styles.tdRight}>¥{(m.categoryBreakdown[name] ?? 0).toLocaleString()}</td>
            ))}
            <td style={{ ...styles.tdRight, ...styles.tdTotal }}>¥{m.totalAmount.toLocaleString()}</td>
          </tr>
        ))}
        <tr style={styles.footerRow}>
          <td style={styles.td}>年間合計</td>
          {categoryNames.map((name) => (
            <td key={name} style={styles.tdRight}>¥{categoryYearTotals[name].toLocaleString()}</td>
          ))}
          <td style={{ ...styles.tdRight, ...styles.tdTotal }}>¥{yearData.totalAmount.toLocaleString()}</td>
        </tr>
      </tbody>
    </table>
  );
}

function CategoryTable({ yearData, categoryNames }) {
  if (!yearData) return null;
  const monthly = yearData.monthly;
  return (
    <table style={styles.table}>
      <thead>
        <tr>
          <th style={styles.thLeft}>カテゴリ</th>
          {monthly.map((m) => <th key={m.month} style={styles.th}>{m.month}月</th>)}
          <th style={{ ...styles.th, ...styles.thTotal }}>合計</th>
        </tr>
      </thead>
      <tbody>
        {categoryNames.map((name) => {
          const total = yearData.categoryTotals?.[name] ?? 0;
          return (
            <tr key={name}>
              <td style={styles.td}>{name}</td>
              {monthly.map((m) => (
                <td key={m.month} style={styles.tdRight}>¥{(m.categoryBreakdown[name] ?? 0).toLocaleString()}</td>
              ))}
              <td style={{ ...styles.tdRight, ...styles.tdTotal }}>¥{total.toLocaleString()}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

function YearlyTable({ multiYearData }) {
  if (multiYearData.length === 0) return null;
  return (
    <table style={styles.table}>
      <thead>
        <tr>
          <th style={styles.thLeft}>年</th>
          {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => <th key={m} style={styles.th}>{m}月</th>)}
          <th style={{ ...styles.th, ...styles.thTotal }}>合計</th>
        </tr>
      </thead>
      <tbody>
        {multiYearData.map((d) => (
          <tr key={d.year}>
            <td style={styles.td}>{d.year}年</td>
            {d.monthly.map((m) => (
              <td key={m.month} style={styles.tdRight}>¥{m.totalAmount.toLocaleString()}</td>
            ))}
            <td style={{ ...styles.tdRight, ...styles.tdTotal }}>¥{d.totalAmount.toLocaleString()}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

const styles = {
  page: { padding: '24px' },
  topBar: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' },
  title: { fontSize: '20px', fontWeight: '600', margin: 0 },
  csvBtn: { padding: '8px 16px', fontSize: '13px', border: '1px solid #dee2e6', backgroundColor: '#f5f6f8', color: '#aaa', borderRadius: '6px', cursor: 'not-allowed' },
  controlBar: { display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px' },
  select: { padding: '8px 10px', fontSize: '13px', border: '1px solid #dee2e6', borderRadius: '6px' },
  yearSwitcher: { display: 'flex', alignItems: 'center', gap: '10px' },
  arrowBtn: { border: '1px solid #dee2e6', background: '#fff', borderRadius: '6px', width: '28px', height: '28px', cursor: 'pointer' },
  yearLabel: { fontSize: '14px', fontWeight: '500', minWidth: '60px', textAlign: 'center' },
  panel: { backgroundColor: '#fff', border: '1px solid #dee2e6', borderRadius: '8px', padding: '18px', marginBottom: '16px' },
  panelTitle: { fontSize: '14px', fontWeight: '600', margin: '0 0 14px' },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: '12px' },
  thLeft: { padding: '8px 10px', textAlign: 'left', color: '#888', borderBottom: '1px solid #dee2e6', fontWeight: '500' },
  th: { padding: '8px 10px', textAlign: 'right', color: '#888', borderBottom: '1px solid #dee2e6', fontWeight: '500' },
  thTotal: { color: '#333', fontWeight: '700' },
  td: { padding: '8px 10px', borderBottom: '1px solid #f0f2f5' },
  tdRight: { padding: '8px 10px', textAlign: 'right', borderBottom: '1px solid #f0f2f5' },
  tdTotal: { fontWeight: '700' },
  footerRow: { backgroundColor: '#fafbfc', fontWeight: '700' },
  errorText: { color: '#c0392b', fontSize: '14px' },
};

export default Summary;