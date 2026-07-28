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
  // F-19対応：入金状況の絞り込み（'' | 'unpaid' | 'paid' | 'overdue'）。
  // 請求書ステータス（下書き/発行済み/取消）とは別軸のため、セレクトを分けている
  const [paymentFilter, setPaymentFilter] = useState('');
  const [targetYear, setTargetYear] = useState(new Date().getFullYear());
  const [selectedId, setSelectedId] = useState(null);
  const [toast, setToast] = useState(null);

  // ヘッダークリックによる並び替え用の状態（S-10と同じ方式）。
  // 初期表示は「発行日→請求書番号」の昇順とする
  const [sortKey, setSortKey] = useState('issueDate'); // 'invoiceNumber' | 'clientName' | 'issueDate' | 'dueDate' | 'totalAmount' | 'status'
  const [sortDir, setSortDir] = useState('asc'); // 'asc' | 'desc'

  // 同じ項目をクリックしたら昇順⇄降順を切り替え、
  // 別の項目をクリックしたらその項目の昇順から開始する
  const handleSort = (key) => {
    if (sortKey === key) {
      setSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
    setSelectedId(null);
  };

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

  // 期日超過（発行済み・未入金・支払期日が当日より前）。DBには保持しない導出値
  const isOverdue = (invoice) =>
    invoice.status === 'issued'
    && invoice.paymentStatus === 'unpaid'
    && new Date(invoice.dueDate) < new Date();

  // 下書きは発行日が未確定の扱いだが、DBには入力値が入っているためそのまま年判定に使う
  const visibleInvoices = useMemo(() => {
    const kw = keyword.trim().toLowerCase();
    const filtered = invoices
      .filter((inv) => new Date(inv.issueDate).getFullYear() === targetYear)
      .filter((inv) => (statusFilter ? inv.status === statusFilter : true))
      .filter((inv) => {
        // 入金状況は発行済みにのみ意味がある。下書き・取消済みは回収対象外なので除外する
        if (!paymentFilter) return true;
        if (inv.status !== 'issued') return false;
        if (paymentFilter === 'paid') return inv.paymentStatus === 'paid';
        if (paymentFilter === 'unpaid') return inv.paymentStatus === 'unpaid';
        return isOverdue(inv); // 'overdue'
      })
      .filter((inv) => {
        if (!kw) return true;
        return (inv.invoiceNumber ?? '').toLowerCase().includes(kw)
          || (inv.clientName ?? '').toLowerCase().includes(kw);
      });

    // 未採番の下書きは請求書番号が空のため、番号での比較では末尾に寄せる
    const compareNumber = (a, b) => {
      const an = a.invoiceNumber ?? '';
      const bn = b.invoiceNumber ?? '';
      if (an === bn) return 0;
      if (!an) return 1;
      if (!bn) return -1;
      return an.localeCompare(bn, 'ja');
    };

    return [...filtered].sort((a, b) => {
      let diff;
      if (sortKey === 'issueDate' || sortKey === 'dueDate') {
        diff = new Date(a[sortKey]) - new Date(b[sortKey]);
        // 発行日が同じ場合は請求書番号の昇順で並べる（初期表示の並び順）
        if (diff === 0 && sortKey === 'issueDate') return compareNumber(a, b);
      } else if (sortKey === 'totalAmount') {
        diff = a.totalAmount - b.totalAmount;
      } else if (sortKey === 'invoiceNumber') {
        diff = compareNumber(a, b);
      } else {
        // 取引先・ステータスは文字列として比較する
        diff = String(a[sortKey] ?? '').localeCompare(String(b[sortKey] ?? ''), 'ja');
      }
      return sortDir === 'asc' ? diff : -diff;
    });
  }, [invoices, keyword, statusFilter, paymentFilter, targetYear, sortKey, sortDir]);

  // サマリーバー：発行済みの合計と、未回収（発行済みかつ未入金）の合計。
  // F-20の集計原則（売上はissuedのみ・取消は除外）と同じ基準にしている
  const issuedTotal = visibleInvoices
    .filter((inv) => inv.status === 'issued')
    .reduce((sum, inv) => sum + inv.totalAmount, 0);
  const unpaidTotal = visibleInvoices
    .filter((inv) => inv.status === 'issued' && inv.paymentStatus === 'unpaid')
    .reduce((sum, inv) => sum + inv.totalAmount, 0);
  // F-19対応：未回収のうち期日超過分。督促の優先度が分かるよう内訳として併記する
  const overdueTotal = visibleInvoices
    .filter((inv) => isOverdue(inv))
    .reduce((sum, inv) => sum + inv.totalAmount, 0);

  // ドロワー内の発行・取消・入金記録の結果を一覧へ反映する
  const handleChanged = (updated) => {
    setInvoices((prev) => prev.map((inv) => (inv.id === updated.id ? { ...inv, ...updated } : inv)));
    setToast({ message: changedMessage(updated), type: 'success' });
  };

  /**
   * ドロワーからの更新内容に応じたトーストの文言。
   * 発行・取消・入金の記録／解除を同じonChangedで受けているため、ここで見分ける
   */
  const changedMessage = (updated) => {
    if (updated.status === 'canceled') return '取消しました';
    if (updated.paymentStatus === 'paid') return '入金を記録しました';
    const before = invoices.find((inv) => inv.id === updated.id);
    if (before?.paymentStatus === 'paid' && updated.paymentStatus === 'unpaid') return '入金を解除しました';
    return `${updated.invoiceNumber} を発行しました`;
  };

  const handleDeleted = (deletedId) => {
    setInvoices((prev) => prev.filter((inv) => inv.id !== deletedId));
    setSelectedId(null);
    setToast({ message: '削除しました', type: 'success' });
  };

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
          {overdueTotal > 0 && (
            <p style={styles.summarySub}>うち期日超過 ¥{overdueTotal.toLocaleString()}</p>
          )}
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

        {/* F-19対応：入金状況の絞り込み。請求書ステータスとは別軸なのでセレクトを分けている */}
        <select
          style={styles.select}
          value={paymentFilter}
          onChange={(e) => { setPaymentFilter(e.target.value); setSelectedId(null); }}
        >
          <option value="">入金状況：すべて</option>
          <option value="unpaid">未入金</option>
          <option value="paid">入金済み</option>
          <option value="overdue">期日超過</option>
        </select>
      </div>

      {visibleInvoices.length === 0 ? (
        <p style={styles.emptyText}>
          {keyword || statusFilter || paymentFilter ? '該当する請求書が見つかりません' : `${targetYear}年の請求書はまだありません`}
        </p>
      ) : (
        <table style={styles.table}>
          <thead>
            <tr>
              <SortableTh label="請求書番号" sortKey="invoiceNumber" width="18%" align="left"
                currentKey={sortKey} currentDir={sortDir} onSort={handleSort} />
              <SortableTh label="取引先" sortKey="clientName" width="26%" align="left"
                currentKey={sortKey} currentDir={sortDir} onSort={handleSort} />
              <SortableTh label="発行日" sortKey="issueDate" width="14%" align="right"
                currentKey={sortKey} currentDir={sortDir} onSort={handleSort} />
              <SortableTh label="支払期日" sortKey="dueDate" width="14%" align="right"
                currentKey={sortKey} currentDir={sortDir} onSort={handleSort} />
              <SortableTh label="合計金額" sortKey="totalAmount" width="14%" align="right"
                currentKey={sortKey} currentDir={sortDir} onSort={handleSort} />
              <SortableTh label="ステータス" sortKey="status" width="10%" align="center"
                currentKey={sortKey} currentDir={sortDir} onSort={handleSort} />
              {/* F-19対応：入金状況列。請求書ステータスとは別軸として並び替えできる */}
              <SortableTh label="入金状況" sortKey="paymentStatus" width="12%" align="center"
                currentKey={sortKey} currentDir={sortDir} onSort={handleSort} />
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
                    {/* F-19対応：入金状況。下書き・取消済みは回収対象外なので「—」 */}
                    <td style={styles.tdCenter}>
                      {inv.status === 'issued' ? <PaymentBadge invoice={inv} overdue={isOverdue(inv)} /> : <span style={styles.dimText}>—</span>}
                    </td>
                  </tr>
                  {selectedId === inv.id && (
                    <tr>
                      <td colSpan={7} style={{ padding: 0, border: 'none' }}>
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

/**
 * 入金状況のバッジ（F-19）。
 * 未入金のうち支払期日を過ぎたものは「期日超過」として区別し、督促対象が一覧で分かるようにする。
 * 入金済みは入金日を併記する（いつ回収できたかを一覧で確認できるようにするため）
 */
function PaymentBadge({ invoice, overdue }) {
  if (invoice.paymentStatus === 'paid') {
    return (
      <span>
        <span style={{ ...styles.badge, ...styles.badgePaid }}>入金済み</span>
        <span style={styles.paidAtText}>{invoice.paidAt?.slice(0, 10)}</span>
      </span>
    );
  }
  return (
    <span style={{ ...styles.badge, ...(overdue ? styles.badgeOverdue : styles.badgeUnpaid) }}>
      {overdue ? '期日超過' : '未入金'}
    </span>
  );
}

/**
 * クリックで昇順⇄降順を切り替えられる列ヘッダー。
 * 並び替えの対象になっている列にのみ▲▼を表示する
 */
function SortableTh({ label, sortKey, width, align, currentKey, currentDir, onSort }) {
  const isActive = currentKey === sortKey;
  return (
    <th
      style={{ ...styles.th, width, textAlign: align, cursor: 'pointer' }}
      onClick={() => onSort(sortKey)}
      title="クリックで並び替え"
    >
      {label}{isActive ? (currentDir === 'asc' ? ' ▲' : ' ▼') : ''}
    </th>
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
  th: { padding: '10px 12px', fontSize: '12px', color: '#888', borderBottom: '1px solid #dee2e6', whiteSpace: 'nowrap' },
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
  // ウィンドウ幅が狭いときに「発行済 み」と折り返さないよう、バッジ内では改行させない
  badge: { display: 'inline-block', whiteSpace: 'nowrap', fontSize: '11px', padding: '2px 8px', borderRadius: '10px' },
  // F-19：入金状況のバッジ。期日超過は支払期日の赤字表示と同じ色に揃える
  badgePaid: { backgroundColor: '#e6f4ea', color: '#2e8b57' },
  badgeUnpaid: { backgroundColor: '#f0f2f5', color: '#888' },
  badgeOverdue: { backgroundColor: '#fdecea', color: '#c0392b' },
  paidAtText: { display: 'block', fontSize: '10px', color: '#888', marginTop: '2px' },
  dimText: { color: '#bbb', fontSize: '12px' },
  summarySub: { fontSize: '11px', color: '#c0392b', margin: '4px 0 0' },
  footer: { display: 'flex', justifyContent: 'space-between', marginTop: '12px', fontSize: '12px', color: '#888' },
  hint: { color: '#aaa' },
  emptyText: { fontSize: '13px', color: '#888' },
  errorText: { color: '#c0392b', fontSize: '14px' },
};

export default InvoiceListPage;
