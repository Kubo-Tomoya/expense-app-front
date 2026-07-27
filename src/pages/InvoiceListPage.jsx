import { useState, useEffect, useMemo, Fragment } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { getInvoices } from '../api/invoiceApi';
import InvoiceDrawer from '../components/InvoiceDrawer';
import Toast from '../components/Toast';
import { INVOICE_STATUS_LABELS, INVOICE_STATUS_BADGE } from '../constants/invoice';

function formatDate(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}`;
}

/**
 * S-13 請求書一覧画面（F-17）。
 *
 * 絞り込みはS-11と同様にフロント側で行う。
 * 月ではなく年で切り替えるのは、請求書番号の連番が年単位で管理されているため
 */
function InvoiceListPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [keyword, setKeyword] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [targetYear, setTargetYear] = useState(new Date().getFullYear());
  const [selectedId, setSelectedId] = useState(null);
  const [toast, setToast] = useState(null);

  const fetchInvoices = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getInvoices();
      setInvoices(res.data);
    } catch (err) {
      console.error(err);
      setError('請求書一覧の取得に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchInvoices(); }, []);

  // S-14から戻ってきた場合、遷移時に渡されたメッセージをトースト表示する
  useEffect(() => {
    if (location.state?.toast) {
      setToast({ message: location.state.toast, type: 'success' });
      navigate(location.pathname, { replace: true, state: null });
    }
  }, [location, navigate]);

  // 下書きは発行日が未確定の扱いだが、DBには入力値が入っているためそのまま年判定に使う
  const visibleInvoices = useMemo(() => {
    const kw = keyword.trim().toLowerCase();
    return invoices
      .filter((inv) => new Date(inv.issueDate).getFullYear() === targetYear)
      .filter((inv) => (statusFilter ? inv.status === statusFilter : true))
      .filter((inv) => {
        if (!kw) return true;
        return (inv.invoiceNumber ?? '').toLowerCase().includes(kw)
          || (inv.clientName ?? '').toLowerCase().includes(kw);
      });
  }, [invoices, keyword, statusFilter, targetYear]);

  // サマリーバー：発行済みの合計と、未回収（発行済みかつ未入金）の合計。
  // F-20の集計原則（売上はissuedのみ・取消は除外）と同じ基準にしている
  const issuedTotal = visibleInvoices
    .filter((inv) => inv.status === 'issued')
    .reduce((sum, inv) => sum + inv.totalAmount, 0);
  const unpaidTotal = visibleInvoices
    .filter((inv) => inv.status === 'issued' && inv.paymentStatus === 'unpaid')
    .reduce((sum, inv) => sum + inv.totalAmount, 0);

  // ドロワー内の発行・取消の結果を一覧へ反映する
  const handleChanged = (updated) => {
    setInvoices((prev) => prev.map((inv) => (inv.id === updated.id ? { ...inv, ...updated } : inv)));
    setToast({
      message: updated.status === 'canceled' ? '取消しました' : `${updated.invoiceNumber} を発行しました`,
      type: 'success',
    });
  };

  const handleDeleted = (deletedId) => {
    setInvoices((prev) => prev.filter((inv) => inv.id !== deletedId));
    setSelectedId(null);
    setToast({ message: '削除しました', type: 'success' });
  };

  const isOverdue = (invoice) =>
    invoice.status === 'issued'
    && invoice.paymentStatus === 'unpaid'
    && new Date(invoice.dueDate) < new Date();

  if (loading) return <div style={styles.page}>読み込み中...</div>;
  if (error) return <div style={styles.page}><p style={styles.errorText}>{error}</p></div>;

  return (
    <div style={styles.page}>
      <div style={styles.topBar}>
        <h1 style={styles.title}>請求書管理</h1>
        <Link to="/invoices/create" style={styles.newBtn}>+ 新規作成</Link>
      </div>

      <div style={styles.summaryBar}>
        <div style={styles.summaryCard}>
          <p style={styles.summaryLabel}>件数</p>
          <p style={styles.summaryValue}>{visibleInvoices.length}件</p>
        </div>
        <div style={styles.summaryCard}>
          <p style={styles.summaryLabel}>発行済み合計</p>
          <p style={styles.summaryValue}>¥{issuedTotal.toLocaleString()}</p>
        </div>
        <div style={styles.summaryCard}>
          <p style={styles.summaryLabel}>未回収合計</p>
          <p style={{ ...styles.summaryValue, color: unpaidTotal > 0 ? '#c0392b' : '#333' }}>
            ¥{unpaidTotal.toLocaleString()}
          </p>
        </div>
      </div>

      <div style={styles.filterBar}>
        <button style={styles.arrowBtn} onClick={() => { setTargetYear((y) => y - 1); setSelectedId(null); }}>◀</button>
        <span style={styles.yearLabel}>{targetYear}年</span>
        <button style={styles.arrowBtn} onClick={() => { setTargetYear((y) => y + 1); setSelectedId(null); }}>▶</button>

        <div style={styles.searchWrap}>
          <SearchIcon />
          <input
            style={styles.searchInput}
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="請求書番号・取引先名でキーワード検索"
          />
        </div>

        <select
          style={styles.select}
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setSelectedId(null); }}
        >
          <option value="">すべて</option>
          <option value="draft">下書き</option>
          <option value="issued">発行済み</option>
          <option value="canceled">取消</option>
        </select>
      </div>

      {visibleInvoices.length === 0 ? (
        <p style={styles.emptyText}>
          {keyword || statusFilter ? '該当する請求書が見つかりません' : `${targetYear}年の請求書はまだありません`}
        </p>
      ) : (
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={{ ...styles.th, width: '18%', textAlign: 'left' }}>請求書番号</th>
              <th style={{ ...styles.th, width: '26%', textAlign: 'left' }}>取引先</th>
              <th style={{ ...styles.th, width: '14%', textAlign: 'right' }}>発行日</th>
              <th style={{ ...styles.th, width: '14%', textAlign: 'right' }}>支払期日</th>
              <th style={{ ...styles.th, width: '16%', textAlign: 'right' }}>合計金額</th>
              <th style={{ ...styles.th, width: '12%', textAlign: 'center' }}>ステータス</th>
            </tr>
          </thead>
          <tbody>
            {visibleInvoices.map((inv) => {
              const badge = INVOICE_STATUS_BADGE[inv.status];
              return (
                <Fragment key={inv.id}>
                  <tr
                    style={{ ...styles.row, ...(selectedId === inv.id ? styles.rowActive : {}) }}
                    onClick={() => setSelectedId((prev) => (prev === inv.id ? null : inv.id))}
                  >
                    <td style={{
                      ...styles.tdNumber,
                      ...(inv.invoiceNumber ? {} : styles.unnumbered),
                      ...(inv.status === 'canceled' ? styles.canceledText : {}),
                    }}>
                      {inv.invoiceNumber || '—（未採番）'}
                    </td>
                    <td style={styles.td}>{inv.clientName} {inv.clientHonorific}</td>
                    <td style={styles.tdRight}>{inv.status === 'draft' ? '—' : formatDate(inv.issueDate)}</td>
                    <td style={{ ...styles.tdRight, ...(isOverdue(inv) ? styles.overdue : {}) }}>
                      {formatDate(inv.dueDate)}
                    </td>
                    <td style={styles.tdAmount}>¥{inv.totalAmount.toLocaleString()}</td>
                    <td style={styles.tdCenter}>
                      <span style={{ ...styles.badge, backgroundColor: badge.bg, color: badge.color }}>
                        {INVOICE_STATUS_LABELS[inv.status]}
                      </span>
                    </td>
                  </tr>
                  {selectedId === inv.id && (
                    <tr>
                      <td colSpan={6} style={{ padding: 0, border: 'none' }}>
                        <InvoiceDrawer
                          invoiceId={inv.id}
                          onClose={() => setSelectedId(null)}
                          onChanged={handleChanged}
                          onDeleted={() => handleDeleted(inv.id)}
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
        <span>{visibleInvoices.length}件</span>
        <span style={styles.hint}>行をクリックで詳細表示</span>
      </div>

      <Toast message={toast?.message} type={toast?.type} onClose={() => setToast(null)} />
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

const styles = {
  page: { padding: '24px' },
  topBar: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' },
  title: { fontSize: '20px', fontWeight: '600', margin: 0 },
  newBtn: { padding: '8px 16px', fontSize: '13px', backgroundColor: '#1a4fa0', color: '#fff', borderRadius: '6px', textDecoration: 'none' },
  summaryBar: { display: 'flex', gap: '12px', marginBottom: '16px' },
  summaryCard: { flex: 1, backgroundColor: '#fff', border: '1px solid #dee2e6', borderRadius: '8px', padding: '12px 16px' },
  summaryLabel: { fontSize: '11px', color: '#888', margin: '0 0 4px' },
  summaryValue: { fontSize: '18px', fontWeight: '600', margin: 0 },
  filterBar: { display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' },
  arrowBtn: { border: '1px solid #dee2e6', background: '#fff', borderRadius: '6px', width: '28px', height: '28px', cursor: 'pointer' },
  yearLabel: { fontSize: '14px', fontWeight: '500', minWidth: '70px', textAlign: 'center' },
  searchWrap: { display: 'flex', alignItems: 'center', gap: '8px', flex: 1, border: '1px solid #dee2e6', borderRadius: '6px', padding: '0 10px', backgroundColor: '#fff' },
  searchInput: { flex: 1, border: 'none', outline: 'none', padding: '8px 0', fontSize: '13px' },
  select: { padding: '8px 10px', fontSize: '13px', border: '1px solid #dee2e6', borderRadius: '6px', backgroundColor: '#fff' },
  table: { width: '100%', borderCollapse: 'collapse', backgroundColor: '#fff', border: '1px solid #dee2e6', borderRadius: '8px' },
  th: { padding: '10px 12px', fontSize: '12px', color: '#888', borderBottom: '1px solid #dee2e6' },
  row: { cursor: 'pointer', borderBottom: '1px solid #f0f2f5' },
  rowActive: { backgroundColor: '#f0f6ff' },
  td: { padding: '10px 12px', fontSize: '13px' },
  tdNumber: { padding: '10px 12px', fontSize: '13px', fontWeight: '500' },
  unnumbered: { color: '#bbb', fontWeight: '400' },
  canceledText: { textDecoration: 'line-through', color: '#c0392b' },
  tdRight: { padding: '10px 12px', fontSize: '12px', color: '#888', textAlign: 'right' },
  overdue: { color: '#c0392b', fontWeight: '600' },
  tdAmount: { padding: '10px 12px', fontSize: '13px', fontWeight: '600', textAlign: 'right' },
  tdCenter: { padding: '10px 12px', textAlign: 'center' },
  badge: { fontSize: '11px', padding: '2px 8px', borderRadius: '10px' },
  footer: { display: 'flex', justifyContent: 'space-between', marginTop: '12px', fontSize: '12px', color: '#888' },
  hint: { color: '#aaa' },
  emptyText: { fontSize: '13px', color: '#888' },
  errorText: { color: '#c0392b', fontSize: '14px' },
};

export default InvoiceListPage;
