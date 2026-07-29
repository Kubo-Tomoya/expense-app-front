import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { createInvoice, updateInvoice, issueInvoice } from '../api/invoiceApi';
import { getClients } from '../api/clientApi';
import {
  TAX_CATEGORIES,
  calculateInvoice,
  defaultDueDate,
} from '../constants/invoice';

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function emptyItem() {
  return { description: '', quantity: '1', unitPrice: '', taxCategory: 'taxable_10' };
}

/**
 * S-14 請求書作成・編集画面のフォーム。
 * ExpenseForm（S-02/S-03）・ClientForm（S-12）と同様に、
 * 登録・編集の両モードを1コンポーネントで扱う。
 *
 * 明細テーブルの計算ロジックを二重に持たないよう、作成・編集で共通化している
 */
function InvoiceForm({ mode, invoiceId, initialData }) {
  const isEdit = mode === 'edit';
  const navigate = useNavigate();

  const [clients, setClients] = useState([]);
  const [clientId, setClientId] = useState(initialData?.clientId ? String(initialData.clientId) : '');
  const [issueDate, setIssueDate] = useState(initialData?.issueDate ?? todayStr());
  const [dueDate, setDueDate] = useState(
    initialData?.dueDate ?? defaultDueDate(initialData?.issueDate ?? todayStr())
  );
  // 支払期日を手で変更した後は、発行日の変更で上書きしない
  const [dueDateEdited, setDueDateEdited] = useState(false);
  const [items, setItems] = useState(
    initialData?.items?.length
      ? initialData.items.map((item) => ({
          description: item.description,
          quantity: String(Number(item.quantity)),
          unitPrice: String(item.unitPrice),
          taxCategory: item.taxCategory,
        }))
      : [emptyItem()]
  );
  const [errors, setErrors] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    getClients()
      .then((res) => {
        // 宛先に選べるのは有効な取引先のみ（S-14の仕様）。
        // ただし編集中の下書きが既に無効化済みの取引先を参照している場合は、
        // 宛先が意図せず変わらないようその取引先だけ選択肢に残す
        const selectable = res.data.filter(
          (c) => c.isActive || String(c.id) === String(initialData?.clientId)
        );
        setClients(selectable);
      })
      .catch(() => setClients([]));
  }, [initialData]);

  // 発行日を変えたら支払期日を翌月末に再設定する（手動変更後は追従させない）
  const handleIssueDateChange = (value) => {
    setIssueDate(value);
    if (!dueDateEdited) {
      setDueDate(defaultDueDate(value));
    }
  };

  const calc = useMemo(() => calculateInvoice(items), [items]);

  const updateItem = (index, key, value) => {
    setItems((prev) => prev.map((item, i) => (i === index ? { ...item, [key]: value } : item)));
  };

  const addItem = () => setItems((prev) => [...prev, emptyItem()]);

  const removeItem = (index) => {
    // 明細は最低1行必須のため、1行しかない場合は削除させない
    setItems((prev) => (prev.length <= 1 ? prev : prev.filter((_, i) => i !== index)));
  };

  const validate = () => {
    const errs = [];
    if (!clientId) errs.push('取引先を選択してください');
    if (!issueDate) errs.push('発行日を入力してください');
    if (!dueDate) errs.push('支払期日を入力してください');
    if (items.length === 0) errs.push('明細は1行以上入力してください');

    items.forEach((item, i) => {
      const row = `明細${i + 1}行目`;
      if (!item.description || item.description.length > 100) {
        errs.push(`${row}：品目名は1〜100文字で入力してください`);
      }
      if (!(Number(item.quantity) > 0)) {
        errs.push(`${row}：数量は0より大きい値を入力してください`);
      }
      if (item.unitPrice === '' || Number(item.unitPrice) < 0 || !Number.isInteger(Number(item.unitPrice))) {
        errs.push(`${row}：税抜単価は0以上の整数で入力してください`);
      }
    });
    return errs;
  };

  const buildPayload = () => ({
    clientId: Number(clientId),
    issueDate,
    dueDate,
    items: items.map((item) => ({
      description: item.description,
      quantity: Number(item.quantity),
      unitPrice: Number(item.unitPrice),
      taxCategory: item.taxCategory,
    })),
  });

  /**
   * 保存処理。issueAfterSave = true の場合は、保存後に発行APIを続けて呼ぶ。
   * 発行に失敗しても保存自体は完了している状態を保つため、処理を分けている
   */
  const submitForm = async (issueAfterSave) => {
    const errs = validate();
    setErrors(errs);
    if (errs.length > 0) return;

    if (issueAfterSave &&
        !window.confirm('発行すると内容の編集ができなくなります。発行しますか？')) {
      return;
    }

    setSubmitting(true);
    try {
      const payload = buildPayload();
      const saved = isEdit
        ? await updateInvoice(invoiceId, payload)
        : await createInvoice(payload);

      if (!issueAfterSave) {
        navigate('/invoices', {
          state: { toast: isEdit ? '更新しました' : '下書き保存しました' },
        });
        return;
      }

      const issued = await issueInvoice(saved.data.id);
      navigate('/invoices', {
        state: { toast: `請求書 ${issued.data.invoiceNumber} を発行しました` },
      });
    } catch (err) {
      console.error(err);
      const data = err.response?.data;
      const messages = data?.errors
        ? Object.values(data.errors)
        : [data?.message ?? '保存に失敗しました'];
      setErrors(messages);
    } finally {
      setSubmitting(false);
    }
  };

  const hasSelectableClient = clients.length > 0;

  return (
    <form onSubmit={(e) => { e.preventDefault(); submitForm(false); }} style={styles.form}>
      {isEdit && initialData && (
        <div style={styles.editBanner}>
          編集中：{initialData.clientName} / ID: #{invoiceId}
          <span style={styles.draftTag}>下書き</span>
        </div>
      )}

      {errors.length > 0 && (
        <div style={styles.errorBox}>
          {errors.map((msg, i) => <p key={i} style={styles.errorLine}>・{msg}</p>)}
        </div>
      )}

      {!hasSelectableClient && (
        <div style={styles.warnBox}>
          有効な取引先が登録されていません。先に
          <button type="button" style={styles.linkBtn} onClick={() => navigate('/clients')}>
            取引先管理
          </button>
          から登録してください。
        </div>
      )}

      <p style={styles.sectionTitle}>請求先・日付</p>

      <label style={styles.label}>取引先 <span style={styles.requiredTag}>必須</span></label>
      <select
        style={styles.input}
        value={clientId}
        onChange={(e) => setClientId(e.target.value)}
        disabled={!hasSelectableClient}
      >
        <option value="">選択してください</option>
        {clients.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name} {c.honorific}{c.isActive ? '' : '（無効）'}
          </option>
        ))}
      </select>

      <div style={styles.row2}>
        <div>
          <label style={styles.label}>発行日 <span style={styles.requiredTag}>必須</span></label>
          <input
            type="date"
            style={styles.input}
            value={issueDate}
            onChange={(e) => handleIssueDateChange(e.target.value)}
          />
        </div>
        <div>
          <label style={styles.label}>支払期日 <span style={styles.requiredTag}>必須</span></label>
          <input
            type="date"
            style={styles.input}
            value={dueDate}
            onChange={(e) => { setDueDate(e.target.value); setDueDateEdited(true); }}
          />
        </div>
      </div>

      <hr style={styles.divider} />
      <p style={styles.sectionTitle}>明細（単価は税抜）</p>

      <table style={styles.itemTable}>
        <thead>
          <tr>
            <th style={{ ...styles.th, width: '38%', textAlign: 'left' }}>品目名</th>
            <th style={{ ...styles.th, width: '12%' }}>数量</th>
            <th style={{ ...styles.th, width: '17%' }}>税抜単価</th>
            <th style={{ ...styles.th, width: '15%' }}>税率区分</th>
            <th style={{ ...styles.th, width: '14%', textAlign: 'right' }}>金額</th>
            <th style={{ ...styles.th, width: '4%' }}></th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, i) => (
            <tr key={i}>
              <td style={styles.td}>
                <input
                  style={styles.cellInput}
                  value={item.description}
                  onChange={(e) => updateItem(i, 'description', e.target.value)}
                  placeholder="Webサイト制作"
                  maxLength={100}
                />
              </td>
              <td style={styles.td}>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  style={styles.cellInput}
                  value={item.quantity}
                  onChange={(e) => updateItem(i, 'quantity', e.target.value)}
                />
              </td>
              <td style={styles.td}>
                <input
                  type="number"
                  min="0"
                  style={styles.cellInput}
                  value={item.unitPrice}
                  onChange={(e) => updateItem(i, 'unitPrice', e.target.value)}
                />
              </td>
              <td style={styles.td}>
                <select
                  style={styles.cellInput}
                  value={item.taxCategory}
                  onChange={(e) => updateItem(i, 'taxCategory', e.target.value)}
                >
                  {TAX_CATEGORIES.map((c) => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </select>
              </td>
              <td style={styles.tdAmount}>
                ¥{(calc.itemAmounts[i] ?? 0).toLocaleString()}
              </td>
              <td style={styles.tdCenter}>
                <button
                  type="button"
                  style={styles.removeBtn}
                  onClick={() => removeItem(i)}
                  disabled={items.length <= 1}
                  title={items.length <= 1 ? '明細は1行以上必要です' : 'この明細を削除'}
                >
                  ×
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <button type="button" style={styles.addBtn} onClick={addItem}>＋明細を追加</button>

      {/* 税率ごとの内訳は適格請求書の必須記載事項のため、入力中も常に表示する */}
      <div style={styles.summaryPanel}>
        {calc.taxSummaries.map((summary) => (
          <div key={summary.taxCategory} style={styles.summaryRow}>
            <span style={styles.summaryLabel}>{summary.label} 対象</span>
            <span style={styles.summaryValue}>
              ¥{summary.subtotalAmount.toLocaleString()}
              （消費税 ¥{summary.taxAmount.toLocaleString()}）
            </span>
          </div>
        ))}
        <div style={styles.summaryRow}>
          <span style={styles.summaryLabel}>小計</span>
          <span style={styles.summaryValue}>¥{calc.subtotalAmount.toLocaleString()}</span>
        </div>
        <div style={styles.summaryRow}>
          <span style={styles.summaryLabel}>消費税</span>
          <span style={styles.summaryValue}>¥{calc.taxAmount.toLocaleString()}</span>
        </div>
        <div style={{ ...styles.summaryRow, ...styles.totalRow }}>
          <span style={styles.summaryLabel}>合計金額</span>
          <span style={styles.totalValue}>¥{calc.totalAmount.toLocaleString()}</span>
        </div>
      </div>

      <hr style={styles.divider} />

      <div style={styles.buttonRow}>
        <button type="submit" style={styles.draftBtn} disabled={submitting || !hasSelectableClient}>
          {submitting ? '保存中...' : isEdit ? '更新する' : '下書き保存'}
        </button>
        <button
          type="button"
          style={styles.primaryBtn}
          onClick={() => submitForm(true)}
          disabled={submitting || !hasSelectableClient}
        >
          発行する
        </button>
        <button type="button" style={styles.cancelBtn} onClick={() => navigate('/invoices')}>
          キャンセル
        </button>
      </div>
    </form>
  );
}

const styles = {
  form: { maxWidth: '880px', backgroundColor: '#fff', border: '1px solid #dee2e6', borderRadius: '8px', padding: '24px' },
  editBanner: { backgroundColor: '#fff8e1', border: '1px solid #ffe082', borderRadius: '6px', padding: '10px 14px', fontSize: '13px', marginBottom: '16px' },
  draftTag: { fontSize: '11px', color: '#888', backgroundColor: '#f0f2f5', padding: '1px 6px', borderRadius: '4px', marginLeft: '8px' },
  errorBox: { backgroundColor: '#fdecea', border: '1px solid #f5c6cb', borderRadius: '6px', padding: '10px 14px', marginBottom: '16px' },
  errorLine: { fontSize: '13px', color: '#c0392b', margin: '2px 0' },
  warnBox: { backgroundColor: '#fff8e1', border: '1px solid #ffe082', borderRadius: '6px', padding: '10px 14px', fontSize: '13px', marginBottom: '16px' },
  linkBtn: { border: 'none', background: 'none', color: '#1a4fa0', cursor: 'pointer', fontSize: '13px', padding: '0 4px', textDecoration: 'underline' },
  sectionTitle: { fontSize: '13px', fontWeight: '600', color: '#555', margin: '0 0 12px' },
  label: { display: 'block', fontSize: '12px', color: '#888', margin: '10px 0 4px' },
  input: { width: '100%', padding: '8px 10px', fontSize: '14px', border: '1px solid #dee2e6', borderRadius: '6px', boxSizing: 'border-box' },
  row2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' },
  divider: { border: 'none', borderTop: '1px solid #f0f2f5', margin: '20px 0' },
  itemTable: { width: '100%', borderCollapse: 'collapse' },
  th: { padding: '8px 6px', fontSize: '11px', color: '#888', borderBottom: '1px solid #dee2e6' },
  td: { padding: '6px 4px', verticalAlign: 'middle' },
  tdAmount: { padding: '6px 4px', fontSize: '13px', fontWeight: '600', textAlign: 'right' },
  tdCenter: { padding: '6px 4px', textAlign: 'center' },
  cellInput: { width: '100%', padding: '6px 8px', fontSize: '13px', border: '1px solid #dee2e6', borderRadius: '6px', boxSizing: 'border-box' },
  removeBtn: { border: 'none', background: 'none', color: '#c0392b', fontSize: '16px', cursor: 'pointer' },
  addBtn: { marginTop: '8px', padding: '6px 14px', fontSize: '13px', backgroundColor: '#fff', color: '#1a4fa0', border: '1px dashed #1a4fa0', borderRadius: '6px', cursor: 'pointer' },
  summaryPanel: { maxWidth: '360px', marginLeft: 'auto', marginTop: '16px' },
  summaryRow: { display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: '13px' },
  summaryLabel: { color: '#888' },
  summaryValue: { color: '#333' },
  totalRow: { borderTop: '1px solid #dee2e6', marginTop: '4px', paddingTop: '8px' },
  totalValue: { fontSize: '16px', fontWeight: '600' },
  buttonRow: { display: 'flex', alignItems: 'center', gap: '10px' },
  primaryBtn: { padding: '9px 20px', fontSize: '14px', backgroundColor: '#1a4fa0', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer' },
  draftBtn: { padding: '9px 20px', fontSize: '14px', backgroundColor: '#fff', color: '#555', border: '1px solid #dee2e6', borderRadius: '6px', cursor: 'pointer' },
  cancelBtn: { padding: '9px 20px', fontSize: '14px', backgroundColor: '#fff', color: '#c0392b', border: '1px solid #c0392b', borderRadius: '6px', cursor: 'pointer', marginLeft: 'auto' },
};

export default InvoiceForm;
