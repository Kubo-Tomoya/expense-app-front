import { useState, useEffect } from 'react';
import { createExpense, updateExpense, uploadReceipt } from '../api/expenseApi';
import { getCategories } from '../api/categoryApi';
import { useNavigate } from 'react-router-dom';
import ReceiptUpload from './ReceiptUpload';

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function ExpenseForm({ mode, initialData, expenseId, onSuccess, onDelete }) {
  const isEdit = mode === 'edit';
  const navigate = useNavigate();
  const [categories, setCategories] = useState([]); // [{ id, name }, ...]
    useEffect(() => {
    getCategories()
        .then((res) => {
        setCategories(res.data);
        // 編集時：レスポンスはcategoryNameしか持たないため、一覧取得後に名前からidを逆引きしてセット
        if (initialData?.categoryName) {
            const matched = res.data.find((c) => c.name === initialData.categoryName);
            if (matched) setCategory(String(matched.id));
        }
    })
    .catch(() => setCategories([]));
}, [initialData]);

  const [title, setTitle] = useState(initialData?.title ?? '');
  const [amount, setAmount] = useState(initialData?.amount ?? 0);
  const [date, setDate] = useState(initialData?.expenseDate ?? todayStr());
  const [category, setCategory] = useState('');
  const [memo, setMemo] = useState(initialData?.memo ?? '');
  const [receiptFile, setReceiptFile] = useState(null);
  const [existingReceiptPath, setExistingReceiptPath] = useState(initialData?.receiptImagePath ?? null);
  const [receiptRemoved, setReceiptRemoved] = useState(false);
  const [errors, setErrors] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  const validate = () => {
    const errs = [];
    if (!title || title.length < 1 || title.length > 100) errs.push('タイトルは1〜100文字で入力してください');
    if (!amount || amount <= 0 || !Number.isInteger(Number(amount))) errs.push('金額は1以上の整数で入力してください');
    if (!category) errs.push('カテゴリを選択してください');
    if (memo && memo.length > 500) errs.push('メモは500文字以内で入力してください');
    return errs;
  };

  const uploadReceiptIfNeeded = async (targetId) => {
    if (!receiptFile) return;
    await uploadReceipt(targetId, receiptFile);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    setErrors(errs);
    if (errs.length > 0) return;

    setSubmitting(true);
    try {
        const payload = { title, amount: Number(amount), expenseDate: date, categoryId: Number(category), memo };
        if (isEdit && receiptRemoved && !receiptFile) {
            payload.receiptImagePath = null; // 明示的に領収書を削除
        }

      if (isEdit) {
        await updateExpense(expenseId, payload);
        await uploadReceiptIfNeeded(expenseId);
        onSuccess?.('更新しました');
      } else {
        const res = await createExpense(payload);
        await uploadReceiptIfNeeded(res.data.id);
        onSuccess?.('登録しました');
      }
      navigate('/expenses');
    } catch (err) {
      console.error(err);
      setErrors(['保存に失敗しました。時間をおいて再度お試しください']);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteReceipt = () => {
    setExistingReceiptPath(null);
    setReceiptFile(null);
    setReceiptRemoved(true);
  };

  return (
    <form onSubmit={handleSubmit} style={styles.form}>
      {isEdit && initialData && (
        <div style={styles.editBanner}>
          編集中：{initialData.title} / ID: #{expenseId} / 登録日：{initialData.createdAt?.slice(0, 10)}
        </div>
      )}

      {errors.length > 0 && (
        <div style={styles.errorBox}>
          {errors.map((msg, i) => <p key={i} style={styles.errorLine}>・{msg}</p>)}
        </div>
      )}

      <p style={styles.sectionTitle}>基本情報</p>

      <label style={styles.label}>タイトル</label>
      <input
        style={styles.input}
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="経費の内容がわかる名前を入力"
      />

      <div style={styles.row2}>
        <div>
          <label style={styles.label}>金額</label>
          <div style={styles.amountWrap}>
            <span style={styles.yen}>¥</span>
            <input
              type="number"
              style={styles.inputAmount}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>
        </div>
        <div>
          <label style={styles.label}>日付</label>
          <input type="date" style={styles.input} value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
      </div>

      <label style={styles.label}>カテゴリ</label>
      <select style={styles.input} value={category} onChange={(e) => setCategory(e.target.value)}>
        <option value="">選択してください</option>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
      </select>

      <label style={styles.label}>メモ</label>
      <textarea
        style={styles.textarea}
        value={memo}
        onChange={(e) => setMemo(e.target.value)}
        maxLength={500}
      />

      <hr style={styles.divider} />
      <p style={styles.sectionTitle}>領収書アップロード（任意）</p>

      <ReceiptUpload
        existingPath={existingReceiptPath}
        onFileSelect={setReceiptFile}
        onDeleteExisting={handleDeleteReceipt}
      />

      <hr style={styles.divider} />

      <div style={styles.buttonRow}>
        <button type="submit" style={styles.primaryBtn} disabled={submitting}>
          {submitting ? '保存中...' : isEdit ? '更新する' : '登録する'}
        </button>
        {isEdit && (
            <button type="button" style={styles.deleteBtn} onClick={onDelete}>
                削除する
            </button>
        )}
        <button
          type="button"
          style={styles.cancelBtn}
          onClick={() => navigate('/expenses')}
        >
          キャンセル
        </button>
      </div>
    </form>
  );
}

const styles = {
  form: { maxWidth: '560px', backgroundColor: '#fff', border: '1px solid #dee2e6', borderRadius: '8px', padding: '24px' },
  editBanner: { backgroundColor: '#fff8e1', border: '1px solid #ffe082', borderRadius: '6px', padding: '10px 14px', fontSize: '13px', marginBottom: '16px' },
  errorBox: { backgroundColor: '#fdecea', border: '1px solid #f5c6cb', borderRadius: '6px', padding: '10px 14px', marginBottom: '16px' },
  errorLine: { fontSize: '13px', color: '#c0392b', margin: '2px 0' },
  sectionTitle: { fontSize: '13px', fontWeight: '600', color: '#555', margin: '0 0 12px' },
  label: { display: 'block', fontSize: '12px', color: '#888', margin: '10px 0 4px' },
  input: { width: '100%', padding: '8px 10px', fontSize: '14px', border: '1px solid #dee2e6', borderRadius: '6px', boxSizing: 'border-box' },
  textarea: { width: '100%', height: '70px', padding: '8px 10px', fontSize: '14px', border: '1px solid #dee2e6', borderRadius: '6px', boxSizing: 'border-box', resize: 'vertical' },
  row2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' },
  amountWrap: { display: 'flex', alignItems: 'center', border: '1px solid #dee2e6', borderRadius: '6px', padding: '0 10px' },
  yen: { fontSize: '14px', color: '#888', marginRight: '4px' },
  inputAmount: { flex: 1, border: 'none', padding: '8px 0', fontSize: '14px', outline: 'none' },
  divider: { border: 'none', borderTop: '1px solid #f0f2f5', margin: '20px 0' },
  buttonRow: { display: 'flex', alignItems: 'center', marginTop: '20px' },
  primaryBtn: { padding: '9px 20px', fontSize: '14px', backgroundColor: '#1a4fa0', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer' },
  deleteBtn: { padding: '9px 20px', fontSize: '14px', backgroundColor: '#fff', color: '#c0392b', border: '1px solid #c0392b', borderRadius: '6px', cursor: 'pointer', marginLeft: '10px' },
  cancelBtn: { padding: '9px 20px', fontSize: '14px', backgroundColor: '#fff', color: '#c0392b', border: '1px solid #c0392b', borderRadius: '6px', cursor: 'pointer', marginLeft: 'auto' },
};

export default ExpenseForm;