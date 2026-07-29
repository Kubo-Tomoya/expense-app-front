import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  getInvoiceById,
  issueInvoice,
  cancelInvoice,
  deleteInvoice,
  getInvoicePdf,
  updatePaymentStatus,
} from '../api/invoiceApi';
import { TAX_CATEGORY_LABELS } from '../constants/invoice';

/**
 * S-13 請求書一覧の行クリックで展開する詳細ドロワー。
 * ExpenseDrawer（S-01）・ClientDrawer（S-11）と同じインライン展開方式に揃えている。
 *
 * 発行・取消・削除の起点をここに集約しているのは、内容を俯瞰した状態で
 * 確定操作を行う方が誤発行が起きにくいため（S-13の設計判断）
 */
function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function InvoiceDrawer({ invoiceId, onClose, onChanged, onDeleted }) {
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  // F-19：入金日の入力。日付ピッカーを使わせるため、確認ダイアログではなく
  // ドロワー内のインライン入力にしている（既定値は当日）
  const [payFormOpen, setPayFormOpen] = useState(false);
  const [paidAt, setPaidAt] = useState(todayStr());
  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getInvoiceById(invoiceId)
      .then((res) => { if (!cancelled) setDetail(res.data); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [invoiceId]);

  const runAction = async (action) => {
    setSubmitting(true);
    setError(null);
    try {
      const res = await action();
      setDetail(res.data);
      onChanged(res.data);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message ?? '処理に失敗しました');
    } finally {
      setSubmitting(false);
    }
  };

  const handleIssue = () => {
    if (!window.confirm('発行すると内容の編集ができなくなります。発行しますか？')) return;
    runAction(() => issueInvoice(invoiceId));
  };

  const handleCancel = () => {
    const reason = window.prompt('取消理由を入力してください（必須）');
    if (reason === null) return;
    if (!reason.trim()) {
      setError('取消理由は必須です');
      return;
    }
    runAction(() => cancelInvoice(invoiceId, reason.trim()));
  };

  /**
   * 入金を記録する（F-19）。
   * 未来日はサーバー側でも弾かれるが、往復させずに済むよう先に画面側で確認する
   */
  const handleMarkPaid = () => {
    if (!paidAt) {
      setError('入金日を入力してください');
      return;
    }
    if (paidAt > todayStr()) {
      setError('入金日に未来の日付は指定できません');
      return;
    }
    setPayFormOpen(false);
    runAction(() => updatePaymentStatus(invoiceId, 'paid', paidAt));
  };

  /** 入金を解除する（誤登録の復旧用。paid_atはサーバー側でNULLに戻る） */
  const handleMarkUnpaid = () => {
    if (!window.confirm('入金の記録を解除しますか？入金日も削除されます。')) return;
    runAction(() => updatePaymentStatus(invoiceId, 'unpaid'));
  };

  /**
   * PDF出力（F-18）。
   *
   * 先に空のタブを同期的に開いてから取得するのは、非同期処理の完了後に
   * window.openを呼ぶとポップアップブロックの対象になりやすいため。
   * ブロックされた場合（tabがnull）はダウンロードにフォールバックする
   */
  const handlePdf = async () => {
    const tab = window.open('', '_blank');
    setSubmitting(true);
    setError(null);
    let url = null;
    try {
      const res = await getInvoicePdf(invoiceId);
      url = URL.createObjectURL(res.data);

      if (tab) {
        tab.location = url;
      } else {
        const link = document.createElement('a');
        link.href = url;
        link.download = `${detail.invoiceNumber}.pdf`;
        link.click();
      }
    } catch (err) {
      console.error(err);
      if (tab) tab.close();
      setError('PDFの出力に失敗しました');
    } finally {
      setSubmitting(false);
      // 別タブが読み込み終わる前に解放すると表示できないため、少し待ってから解放する
      if (url) setTimeout(() => URL.revokeObjectURL(url), 60000);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('この下書きを削除しますか？この操作は取り消せません。')) return;
    setSubmitting(true);
    try {
      await deleteInvoice(invoiceId);
      onDeleted();
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message ?? '削除に失敗しました');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div style={styles.drawer}>読み込み中...</div>;
  if (!detail) return null;

  const isDraft = detail.status === 'draft';
  const isIssued = detail.status === 'issued';
  // 発行済み・取消済みのみPDF出力できる（下書きは請求書番号が未採番のため）
  const canOutputPdf = !isDraft;
  // 登録番号が未設定の場合、PDFは通常の請求書として出力される（適格請求書にならない）
  const isQualifiedInvoice = Boolean(detail.issuerInvoiceRegistrationNumber);
  // F-19：入金の記録・解除は発行済みのみ（下書きは発行前、取消済みは回収対象外）
  const isPaid = detail.paymentStatus === 'paid';
  const canMarkPaid = isIssued && !isPaid;
  const canMarkUnpaid = isIssued && isPaid;

  return (
    <div style={styles.drawer}>
      <button style={styles.closeBtn} onClick={onClose}>×</button>

      {error && <p style={styles.errorText}>{error}</p>}

      <div style={styles.grid}>
        <div>
          <p style={styles.label}>請求書番号</p>
          <p style={styles.value}>{detail.invoiceNumber || '—（未採番）'}</p>
        </div>
        <div>
          <p style={styles.label}>取引先</p>
          <p style={styles.value}>{detail.clientName} {detail.clientHonorific}</p>
        </div>
        <div>
          <p style={styles.label}>発行日</p>
          <p style={styles.value}>{isDraft ? '—' : detail.issueDate}</p>
        </div>
        <div>
          <p style={styles.label}>支払期日</p>
          <p style={styles.value}>{detail.dueDate}</p>
        </div>
      </div>

      {detail.clientAddress && (
        <div style={styles.block}>
          <p style={styles.label}>住所</p>
          <p style={styles.value}>{detail.clientAddress}</p>
        </div>
      )}

      {/* F-19：入金状況。下書き・取消済みは回収対象外なので表示しない */}
      {isIssued && (
        <div style={styles.block}>
          <p style={styles.label}>入金状況</p>
          <p style={styles.value}>
            {isPaid
              ? `入金済み（入金日：${detail.paidAt?.slice(0, 10)}）`
              : '未入金'}
          </p>
        </div>
      )}

      <div style={styles.block}>
        <p style={styles.label}>明細</p>
        <table style={styles.itemTable}>
          <thead>
            <tr>
              <th style={{ ...styles.itemTh, textAlign: 'left' }}>品目</th>
              <th style={{ ...styles.itemTh, textAlign: 'right' }}>数量</th>
              <th style={{ ...styles.itemTh, textAlign: 'right' }}>税抜単価</th>
              <th style={{ ...styles.itemTh, textAlign: 'center' }}>税率</th>
              <th style={{ ...styles.itemTh, textAlign: 'right' }}>金額</th>
            </tr>
          </thead>
          <tbody>
            {(detail.items ?? []).map((item) => (
              <tr key={item.id}>
                <td style={styles.itemTd}>{item.description}</td>
                <td style={styles.itemTdRight}>{Number(item.quantity)}</td>
                <td style={styles.itemTdRight}>¥{item.unitPrice.toLocaleString()}</td>
                <td style={styles.itemTdCenter}>{TAX_CATEGORY_LABELS[item.taxCategory]}</td>
                <td style={styles.itemTdRight}>¥{item.amount.toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 適格請求書では税率ごとの小計・消費税額の記載が必須のため、内訳を必ず表示する */}
      <div style={styles.summaryBlock}>
        {(detail.taxSummaries ?? []).map((summary) => (
          <div key={summary.taxCategory} style={styles.summaryRow}>
            <span style={styles.summaryLabel}>
              {TAX_CATEGORY_LABELS[summary.taxCategory]} 対象
            </span>
            <span style={styles.summaryValue}>
              ¥{summary.subtotalAmount.toLocaleString()}
              （消費税 ¥{summary.taxAmount.toLocaleString()}）
            </span>
          </div>
        ))}
        <div style={styles.summaryRow}>
          <span style={styles.summaryLabel}>小計</span>
          <span style={styles.summaryValue}>¥{detail.subtotalAmount.toLocaleString()}</span>
        </div>
        <div style={styles.summaryRow}>
          <span style={styles.summaryLabel}>消費税</span>
          <span style={styles.summaryValue}>¥{detail.taxAmount.toLocaleString()}</span>
        </div>
        <div style={{ ...styles.summaryRow, ...styles.totalRow }}>
          <span style={styles.summaryLabel}>合計金額</span>
          <span style={styles.totalValue}>¥{detail.totalAmount.toLocaleString()}</span>
        </div>
      </div>

      {detail.status === 'canceled' && (
        <div style={styles.canceledBox}>
          取消済み（{detail.canceledAt?.slice(0, 10)}）／理由：{detail.canceledReason}
        </div>
      )}

      {/* F-19：入金日の入力。日付ピッカーを使わせるためインライン入力にしている */}
      {payFormOpen && (
        <div style={styles.payForm}>
          <label style={styles.payLabel}>入金日</label>
          <input
            type="date"
            style={styles.payInput}
            value={paidAt}
            max={todayStr()}
            onChange={(e) => setPaidAt(e.target.value)}
          />
          <button style={styles.primaryBtn} onClick={handleMarkPaid} disabled={submitting}>
            {submitting ? '処理中...' : '記録する'}
          </button>
          <button style={styles.cancelBtn} onClick={() => { setPayFormOpen(false); setError(null); }}>
            やめる
          </button>
        </div>
      )}

      <div style={styles.actionRow}>
        {isDraft && (
          <button style={styles.editBtn} onClick={() => navigate(`/invoices/${invoiceId}/edit`)}>
            編集
          </button>
        )}
        {canMarkPaid && !payFormOpen && (
          <button style={styles.primaryBtn} onClick={() => { setPayFormOpen(true); setPaidAt(todayStr()); }}>
            入金を記録
          </button>
        )}
        {canMarkUnpaid && (
          <button style={styles.editBtn} onClick={handleMarkUnpaid} disabled={submitting}>
            入金を解除
          </button>
        )}
        {isDraft && (
          <button style={styles.primaryBtn} onClick={handleIssue} disabled={submitting}>
            {submitting ? '処理中...' : '発行する'}
          </button>
        )}
        {isIssued && (
          <button style={styles.dangerBtn} onClick={handleCancel} disabled={submitting}>
            取消
          </button>
        )}
        {isDraft && (
          <button style={styles.dangerBtn} onClick={handleDelete} disabled={submitting}>
            削除
          </button>
        )}
        <button
          style={canOutputPdf ? styles.editBtn : styles.disabledBtn}
          onClick={handlePdf}
          disabled={!canOutputPdf || submitting}
          title={canOutputPdf ? 'PDFを別タブで表示します' : '下書きはPDF出力できません（発行後に出力できます）'}
        >
          PDF出力
        </button>
      </div>

      {/* 登録番号が未設定でもPDFは出力できるが、適格請求書にはならないため注意を促す */}
      {canOutputPdf && !isQualifiedInvoice && (
        <p style={styles.noticeText}>
          インボイス登録番号が未設定のため、PDFは適格請求書になりません。
          事業者プロフィールで登録番号を設定すると、次回以降に発行する請求書に反映されます。
        </p>
      )}
    </div>
  );
}

const styles = {
  drawer: { position: 'relative', backgroundColor: '#f8f9fb', border: '1px solid #dee2e6', borderRadius: '8px', padding: '20px' },
  closeBtn: { position: 'absolute', top: '10px', right: '14px', border: 'none', background: 'none', fontSize: '18px', cursor: 'pointer', color: '#888' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '16px' },
  label: { fontSize: '11px', color: '#888', margin: '0 0 4px' },
  value: { fontSize: '14px', fontWeight: '500', margin: 0 },
  block: { marginBottom: '16px' },
  itemTable: { width: '100%', borderCollapse: 'collapse', backgroundColor: '#fff', border: '1px solid #dee2e6', borderRadius: '6px' },
  itemTh: { padding: '8px 10px', fontSize: '11px', color: '#888', borderBottom: '1px solid #dee2e6' },
  itemTd: { padding: '8px 10px', fontSize: '13px', borderBottom: '1px solid #f0f2f5' },
  itemTdRight: { padding: '8px 10px', fontSize: '13px', textAlign: 'right', borderBottom: '1px solid #f0f2f5' },
  itemTdCenter: { padding: '8px 10px', fontSize: '12px', textAlign: 'center', borderBottom: '1px solid #f0f2f5' },
  summaryBlock: { maxWidth: '360px', marginLeft: 'auto', marginBottom: '16px' },
  summaryRow: { display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: '13px' },
  summaryLabel: { color: '#888' },
  summaryValue: { color: '#333' },
  totalRow: { borderTop: '1px solid #dee2e6', marginTop: '4px', paddingTop: '8px' },
  totalValue: { fontSize: '16px', fontWeight: '600' },
  canceledBox: { backgroundColor: '#fdecea', border: '1px solid #f5c6cb', borderRadius: '6px', padding: '8px 12px', fontSize: '12px', color: '#c0392b', marginBottom: '16px' },
  actionRow: { display: 'flex', gap: '10px', flexWrap: 'wrap' },
  primaryBtn: { padding: '6px 16px', fontSize: '13px', backgroundColor: '#1a4fa0', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer' },
  editBtn: { padding: '6px 16px', fontSize: '13px', border: '1px solid #1a4fa0', color: '#1a4fa0', background: '#fff', borderRadius: '6px', cursor: 'pointer' },
  dangerBtn: { padding: '6px 16px', fontSize: '13px', border: '1px solid #c0392b', color: '#c0392b', background: '#fff', borderRadius: '6px', cursor: 'pointer' },
  disabledBtn: { padding: '6px 16px', fontSize: '13px', border: '1px solid #dee2e6', color: '#bbb', background: '#fff', borderRadius: '6px', cursor: 'not-allowed' },
  errorText: { color: '#c0392b', fontSize: '13px', margin: '0 0 12px' },
  noticeText: { marginTop: '12px', padding: '8px 12px', backgroundColor: '#fff8e1', border: '1px solid #ffe082', borderRadius: '6px', fontSize: '12px', color: '#7a5c00' },
  payForm: { display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px', padding: '10px 12px', backgroundColor: '#fff', border: '1px solid #dee2e6', borderRadius: '6px' },
  payLabel: { fontSize: '12px', color: '#888' },
  payInput: { padding: '6px 8px', fontSize: '13px', border: '1px solid #dee2e6', borderRadius: '6px' },
  cancelBtn: { padding: '6px 16px', fontSize: '13px', border: '1px solid #dee2e6', color: '#555', background: '#fff', borderRadius: '6px', cursor: 'pointer' },
};

export default InvoiceDrawer;
