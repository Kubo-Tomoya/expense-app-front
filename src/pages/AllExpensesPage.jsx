import { useState, useEffect, useMemo } from 'react';
import { getAllExpenses } from '../api/expenseApi';
import { getCategories } from '../api/categoryApi';
import ExpenseDrawer from '../components/ExpenseDrawer';

function formatShortDate(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}`;
}

function AllExpensesPage() {
  const [expenses, setExpenses] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedId, setSelectedId] = useState(null);

  const [keyword, setKeyword] = useState('');

  const [panelOpen, setPanelOpen] = useState(false);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [amountMin, setAmountMin] = useState('');
  const [amountMax, setAmountMax] = useState('');
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [receiptFilter, setReceiptFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // ヘッダークリックによる並び替え用の状態。
  // 初期表示は「日付（expenseDate）」の昇順とする
  const [sortKey, setSortKey] = useState('expenseDate'); // 'title' | 'categoryName' | 'expenseDate' | 'amount'
  const [sortDir, setSortDir] = useState('asc'); // 'asc' | 'desc'

  useEffect(() => {
    setLoading(true);
    setError(null);
    Promise.all([getAllExpenses(), getCategories()])
      .then(([expensesRes, categoriesRes]) => {
        const data = Array.isArray(expensesRes.data) ? expensesRes.data : (expensesRes.data.content ?? []);
        setExpenses(data);
        setCategories(categoriesRes.data);
      })
      .catch((err) => {
        console.error(err);
        setError('データの取得に失敗しました');
      })
      .finally(() => setLoading(false));
  }, []);

  const toggleCategory = (name) => {
    setSelectedCategories((prev) =>
      prev.includes(name) ? prev.filter((c) => c !== name) : [...prev, name]
    );
  };

  const clearConditions = () => {
    setDateFrom('');
    setDateTo('');
    setAmountMin('');
    setAmountMax('');
    setSelectedCategories([]);
    setReceiptFilter('');
    setStatusFilter('');
  };

  // 同じ項目をクリックしたら昇順⇄降順を切り替え、
  // 別の項目をクリックしたらその項目の昇順から開始する
  const handleSort = (key) => {
    if (sortKey === key) {
      setSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  const filteredExpenses = useMemo(() => {
    const filtered = expenses.filter((e) => {
      if (keyword.trim()) {
        const kw = keyword.trim().toLowerCase();
        const matchKeyword = e.title.toLowerCase().includes(kw) || (e.memo ?? '').toLowerCase().includes(kw);
        if (!matchKeyword) return false;
      }
      if (dateFrom && e.expenseDate < dateFrom) return false;
      if (dateTo && e.expenseDate > dateTo) return false;
      if (amountMin && e.amount < Number(amountMin)) return false;
      if (amountMax && e.amount > Number(amountMax)) return false;
      if (selectedCategories.length > 0 && !selectedCategories.includes(e.categoryName)) return false;
      if (receiptFilter === 'yes' && !e.receiptImagePath) return false;
      if (receiptFilter === 'no' && e.receiptImagePath) return false;
      if (statusFilter && e.status !== statusFilter) return false;
      return true;
    });

    const sorted = [...filtered].sort((a, b) => {
      let diff;
      if (sortKey === 'expenseDate') {
        diff = new Date(a.expenseDate) - new Date(b.expenseDate);
      } else if (sortKey === 'amount') {
        diff = a.amount - b.amount;
      } else {
        // タイトル・カテゴリは文字列として比較する
        diff = String(a[sortKey]).localeCompare(String(b[sortKey]), 'ja');
      }
      return sortDir === 'asc' ? diff : -diff;
    });

    return sorted;
  }, [expenses, keyword, dateFrom, dateTo, amountMin, amountMax, selectedCategories, receiptFilter, statusFilter, sortKey, sortDir]);

  const totalAmount = filteredExpenses.reduce((sum, e) => sum + e.amount, 0);

  const handleDeleted = (deletedId) => {
    setExpenses((prev) => prev.filter((e) => e.id !== deletedId));
    setSelectedId(null);
  };

  if (loading) return <div style={styles.page}>読み込み中...</div>;
  if (error) return <div style={styles.page}><p style={styles.errorText}>{error}</p></div>;

  return (
    <div style={styles.page}>
      <h1 style={styles.title}>すべての経費</h1>
      <p style={styles.subtitle}>全期間を対象に検索します</p>

      <div style={styles.searchRow}>
        <div style={styles.searchWrap}>
          <SearchIcon />
          <input
            style={styles.searchInput}
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="タイトル・メモでキーワード検索"
          />
        </div>
        <button style={styles.filterBtn} onClick={() => setPanelOpen((p) => !p)}>
          <FilterIcon /> 詳細検索
        </button>
      </div>

      {panelOpen && (
        <div style={styles.panel}>
          <div style={styles.row2}>
            <div>
              <label style={styles.label}>日付範囲</label>
              <div style={styles.rangeRow}>
                <input type="date" style={styles.input} value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
                <span style={styles.rangeSep}>〜</span>
                <input type="date" style={styles.input} value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
              </div>
            </div>
            <div>
              <label style={styles.label}>金額範囲</label>
              <div style={styles.rangeRow}>
                <input type="number" style={styles.input} placeholder="下限" value={amountMin} onChange={(e) => setAmountMin(e.target.value)} />
                <span style={styles.rangeSep}>〜</span>
                <input type="number" style={styles.input} placeholder="上限" value={amountMax} onChange={(e) => setAmountMax(e.target.value)} />
              </div>
            </div>
          </div>

          <label style={styles.label}>カテゴリ（複数選択可）</label>
          <div style={styles.categoryChips}>
            {categories.map((c) => (
              <label key={c.id} style={styles.chip}>
                <input
                  type="checkbox"
                  checked={selectedCategories.includes(c.name)}
                  onChange={() => toggleCategory(c.name)}
                  style={styles.chipCheckbox}
                />
                {c.name}
              </label>
            ))}
          </div>

          <div style={styles.row2}>
            <div>
              <label style={styles.label}>領収書</label>
              <select style={styles.input} value={receiptFilter} onChange={(e) => setReceiptFilter(e.target.value)}>
                <option value="">指定なし</option>
                <option value="yes">領収書あり</option>
                <option value="no">領収書なし</option>
              </select>
            </div>
            <div>
              <label style={styles.label}>ステータス</label>
              <select style={styles.input} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                <option value="">指定なし</option>
                <option value="registered">登録済み</option>
                <option value="draft">下書き</option>
              </select>
            </div>
          </div>

          <div style={styles.panelButtonRow}>
            <button type="button" style={styles.clearBtn} onClick={clearConditions}>条件をクリア</button>
          </div>
        </div>
      )}

      {filteredExpenses.length === 0 ? (
        <p style={styles.emptyText}>該当する経費が見つかりません</p>
      ) : (
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={{ ...styles.th, textAlign: 'left', cursor: 'pointer' }} onClick={() => handleSort('title')}>
                タイトル{sortKey === 'title' && (sortDir === 'asc' ? ' ▲' : ' ▼')}
              </th>
              <th style={{ ...styles.th, textAlign: 'left', cursor: 'pointer' }} onClick={() => handleSort('categoryName')}>
                カテゴリ{sortKey === 'categoryName' && (sortDir === 'asc' ? ' ▲' : ' ▼')}
              </th>
              <th style={{ ...styles.th, textAlign: 'left', cursor: 'pointer' }} onClick={() => handleSort('expenseDate')}>
                日付{sortKey === 'expenseDate' && (sortDir === 'asc' ? ' ▲' : ' ▼')}
              </th>
              <th style={{ ...styles.th, textAlign: 'center' }}>領収書</th>
              <th style={{ ...styles.th, textAlign: 'right', cursor: 'pointer' }} onClick={() => handleSort('amount')}>
                金額{sortKey === 'amount' && (sortDir === 'asc' ? ' ▲' : ' ▼')}
              </th>
            </tr>
          </thead>
          <tbody>
            {filteredExpenses.map((e) => (
              <>
                <tr
                  key={e.id}
                  style={{ ...styles.row, ...(selectedId === e.id ? styles.rowActive : {}) }}
                  onClick={() => setSelectedId((prev) => (prev === e.id ? null : e.id))}
                >
                  <td style={styles.tdTitle}>
                    {e.title}
                    {e.status === 'draft' && <span style={styles.draftBadge}>下書き</span>}
                  </td>
                  <td style={styles.td}><span style={styles.badge}>{e.categoryName}</span></td>
                  <td style={styles.tdMuted}>{formatShortDate(e.expenseDate)}</td>
                  <td style={styles.tdCenter}>
                    {e.receiptImagePath
                      ? <span style={styles.receiptYes}>✓</span>
                      : <span style={styles.receiptNo}>—</span>}
                  </td>
                  <td style={styles.tdAmount}>¥{e.amount.toLocaleString()}</td>
                </tr>
                {selectedId === e.id && (
                  <tr key={`${e.id}-drawer`}>
                    <td colSpan={5} style={{ padding: 0, border: 'none' }}>
                      <ExpenseDrawer
                        expenseId={e.id}
                        onClose={() => setSelectedId(null)}
                        onDeleted={() => handleDeleted(e.id)}
                      />
                    </td>
                  </tr>
                )}
              </>
            ))}
          </tbody>
        </table>
      )}

      <div style={styles.footer}>
        {filteredExpenses.length}件 / 検索結果の合計 ¥{totalAmount.toLocaleString()}
      </div>
    </div>
  );
}

function SearchIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'block', flexShrink: 0 }}>
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}
function FilterIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'block' }}>
      <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
    </svg>
  );
}

const styles = {
  page: { padding: '24px' },
  title: { fontSize: '20px', fontWeight: '600', margin: '0 0 4px' },
  subtitle: { fontSize: '12.5px', color: '#888', margin: '0 0 16px' },
  searchRow: { display: 'flex', gap: '10px', marginBottom: '12px' },
  searchWrap: { display: 'flex', alignItems: 'center', gap: '8px', flex: 1, border: '1px solid #dee2e6', borderRadius: '6px', padding: '0 10px', backgroundColor: '#fff' },
  searchInput: { flex: 1, border: 'none', outline: 'none', padding: '8px 0', fontSize: '13px' },
  filterBtn: { display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px', fontSize: '13px', backgroundColor: '#fff', border: '1px solid #dee2e6', borderRadius: '6px', cursor: 'pointer', color: '#333' },
  panel: { backgroundColor: '#fff', border: '1px solid #dee2e6', borderRadius: '8px', padding: '18px', marginBottom: '16px' },
  row2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '14px' },
  label: { display: 'block', fontSize: '12px', color: '#888', margin: '0 0 4px' },
  input: { width: '100%', padding: '7px 8px', fontSize: '13px', border: '1px solid #dee2e6', borderRadius: '6px', boxSizing: 'border-box' },
  rangeRow: { display: 'flex', alignItems: 'center', gap: '6px' },
  rangeSep: { fontSize: '12px', color: '#888', flexShrink: 0 },
  categoryChips: { display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '14px' },
  chip: { display: 'flex', alignItems: 'center', gap: '4px', fontSize: '13px', backgroundColor: '#f0f2f5', border: '1px solid #dee2e6', borderRadius: '14px', padding: '4px 10px', cursor: 'pointer' },
  chipCheckbox: { margin: 0 },
  panelButtonRow: { display: 'flex', gap: '8px' },
  clearBtn: { padding: '7px 16px', fontSize: '13px', backgroundColor: '#fff', color: '#888', border: '1px solid #dee2e6', borderRadius: '6px', cursor: 'pointer' },
  table: { width: '100%', borderCollapse: 'collapse', backgroundColor: '#fff', border: '1px solid #dee2e6', borderRadius: '8px' },
  th: { padding: '10px 12px', fontSize: '12px', color: '#888', borderBottom: '1px solid #dee2e6' },
  row: { cursor: 'pointer', borderBottom: '1px solid #f0f2f5' },
  rowActive: { backgroundColor: '#f0f6ff' },
  td: { padding: '10px 12px', fontSize: '13px' },
  tdTitle: { padding: '10px 12px', fontSize: '13px', fontWeight: '500' },
  draftBadge: { fontSize: '10px', color: '#888', backgroundColor: '#f0f2f5', padding: '1px 6px', borderRadius: '4px', marginLeft: '6px', fontWeight: '400' },
  tdMuted: { padding: '10px 12px', fontSize: '12px', color: '#888' },
  tdCenter: { padding: '10px 12px', textAlign: 'center' },
  tdAmount: { padding: '10px 12px', fontSize: '13px', fontWeight: '600', textAlign: 'right' },
  badge: { fontSize: '11px', padding: '2px 8px', borderRadius: '10px', backgroundColor: '#f0f2f5', color: '#555' },
  receiptYes: { color: '#2e8b57', fontWeight: '700' },
  receiptNo: { color: '#ccc' },
  footer: { marginTop: '12px', fontSize: '12px', color: '#888' },
  emptyText: { fontSize: '13px', color: '#888', backgroundColor: '#fff', border: '1px solid #dee2e6', borderRadius: '8px', padding: '24px', textAlign: 'center' },
  errorText: { color: '#c0392b', fontSize: '14px' },
};

export default AllExpensesPage;