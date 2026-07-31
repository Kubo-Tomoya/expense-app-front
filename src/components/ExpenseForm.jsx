import { useState, useEffect } from 'react';
import { createExpense, updateExpense, uploadReceipt } from '../api/expenseApi';
import { getCategories } from '../api/categoryApi';
import { useNavigate, Link } from 'react-router-dom';
import ReceiptUpload from './ReceiptUpload';
import {
  TAX_CATEGORIES,
  DEFAULT_TAX_CATEGORY,
  isTaxableCategory,
  calculateTax,
  calculateExcludingTax,
  REGISTRATION_NUMBER_PATTERN,
} from '../constants/tax';

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
  // F-21：消費税区分。既存データは移行で課税10%が入っている
  const [taxCategory, setTaxCategory] = useState(initialData?.taxCategory ?? DEFAULT_TAX_CATEGORY);
  // F-22：受領した領収書の適格請求書の判定と、その根拠となる登録番号
  const [isQualifiedInvoice, setIsQualifiedInvoice] = useState(initialData?.isQualifiedInvoice ?? false);
  const [vendorRegistrationNumber, setVendorRegistrationNumber] =
    useState(initialData?.vendorRegistrationNumber ?? '');
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
    // F-22：登録番号は任意項目のため、入力がある場合のみ形式をチェックする
    if (vendorRegistrationNumber && !REGISTRATION_NUMBER_PATTERN.test(vendorRegistrationNumber)) {
      errs.push('インボイス登録番号は「T」＋数字13桁で入力してください');
    }
    return errs;
  };

  const taxable = isTaxableCategory(taxCategory);

  // F-28対応：プルダウンには有効なカテゴリのみを表示する。
  // ただし編集中の経費が無効化済みカテゴリを参照している場合は、その1件だけ選択肢に残す
  // （編集時に分類が意図せず変わるのを防ぐ。S-14の取引先プルダウンと同じ方式）
  const selectableCategories = categories.filter(
    (c) => c.isActive !== false || String(c.id) === category
  );
  const noSelectableCategory = selectableCategories.length === 0;

  /**
   * 消費税区分を変更する。課税区分以外へ切り替えた場合は、
   * 適格請求書の判定と登録番号を画面上でも空にする（保存時もサーバー側でnullになる）
   */
  const handleTaxCategoryChange = (value) => {
    setTaxCategory(value);
    if (!isTaxableCategory(value)) {
      setIsQualifiedInvoice(false);
      setVendorRegistrationNumber('');
    }
  };

  /**
   * 登録番号の入力を確定したときに、適格請求書の判定を自動でオンにする。
   * 判定の根拠が番号そのものであるため。オフに戻すのは手動でできる
   */
  const handleRegistrationNumberBlur = () => {
    if (REGISTRATION_NUMBER_PATTERN.test(vendorRegistrationNumber)) {
      setIsQualifiedInvoice(true);
    }
  };

  const uploadReceiptIfNeeded = async (targetId) => {
    if (!receiptFile) return;
    await uploadReceipt(targetId, receiptFile);
  };

  // 送信処理を共通化。statusに'registered'（登録・更新ボタン）か
  // 'draft'（下書き保存ボタン）を渡して呼び分ける
  const submitForm = async (status) => {
    const errs = validate();
    setErrors(errs);
    if (errs.length > 0) return;

    setSubmitting(true);
    try {
      const payload = {
        title,
        amount: Number(amount),
        expenseDate: date,
        categoryId: Number(category),
        memo,
        status,
        taxCategory,
        // 課税区分以外は送らない（サーバー側でもnullに落とすが、意図を明示するため）
        isQualifiedInvoice: taxable ? isQualifiedInvoice : null,
        vendorRegistrationNumber: taxable ? vendorRegistrationNumber : null,
      };
      if (isEdit && receiptRemoved && !receiptFile) {
        payload.receiptImagePath = null; // 明示的に領収書を削除
      }

      const isDraft = status === 'draft';

      if (isEdit) {
        await updateExpense(expenseId, payload);
        await uploadReceiptIfNeeded(expenseId);
        onSuccess?.(isDraft ? '下書き保存しました' : '更新しました');
      } else {
        const res = await createExpense(payload);
        await uploadReceiptIfNeeded(res.data.id);
        onSuccess?.(isDraft ? '下書き保存しました' : '登録しました');
      }
      navigate('/expenses');
    } catch (err) {
      console.error(err);
      // サーバーが理由を返している場合はそれを表示する。
      // 例：無効化されたカテゴリを指定した場合（F-28）は「時間をおいて再度お試しください」では
      // 直らないため、原因が分かる文言を出す必要がある。
      // バリデーションエラーは errors 配列、業務エラーは message で返る
      const data = err.response?.data;
      if (Array.isArray(data?.errors) && data.errors.length > 0) {
        setErrors(data.errors.map((e) => e.message ?? String(e)));
      } else if (data?.message) {
        setErrors([data.message]);
      } else {
        setErrors(['保存に失敗しました。時間をおいて再度お試しください']);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    submitForm('registered');
  };

  const handleSaveDraft = () => {
    submitForm('draft');
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
          {initialData.status === 'draft' && <span style={styles.draftTag}>下書き</span>}
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
          {/* 請求書（S-14）は税抜単価の入力なので、混同を避けるため税込であることを明示する */}
          <label style={styles.label}>金額（税込）</label>
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

      {/* F-21：消費税区分。税抜金額・消費税額は保存せず、入力の補助として表示するだけ */}
      <label style={styles.label}>消費税区分</label>
      <select
        style={styles.input}
        value={taxCategory}
        onChange={(e) => handleTaxCategoryChange(e.target.value)}
      >
        {TAX_CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
      </select>
      {amount > 0 && (
        <p style={styles.taxHint}>
          税抜 ¥{calculateExcludingTax(Number(amount), taxCategory).toLocaleString()}
          {' ／ '}消費税 ¥{calculateTax(Number(amount), taxCategory).toLocaleString()}
          <span style={styles.taxHintNote}>（表示のみ。保存されるのは税込金額と区分です）</span>
        </p>
      )}

      {/* F-22：適格請求書の判定は課税区分のときだけ記録する（控除対象ではないため） */}
      {taxable && (
        <div style={styles.qualifiedBlock}>
          <label style={styles.checkboxLabel}>
            <input
              type="checkbox"
              checked={isQualifiedInvoice}
              onChange={(e) => setIsQualifiedInvoice(e.target.checked)}
            />
            適格請求書（インボイス）である
          </label>
          <label style={styles.label}>支払先の登録番号（任意）</label>
          <input
            style={styles.input}
            value={vendorRegistrationNumber}
            onChange={(e) => setVendorRegistrationNumber(e.target.value)}
            onBlur={handleRegistrationNumberBlur}
            placeholder="T1234567890123"
            maxLength={14}
          />
          <p style={styles.taxHintNote}>
            登録番号を入力すると「適格請求書である」が自動でオンになります（手動でオフに戻せます）
          </p>
        </div>
      )}

      <label style={styles.label}>カテゴリ</label>
      {selectableCategories.length === 0 ? (
        // 有効なカテゴリが0件の場合はS-15への導線を出す（S-14の取引先0件と同じ扱い）
        <div style={styles.emptyCategoryBox}>
          有効なカテゴリがありません。
          <Link to="/categories" style={styles.emptyCategoryLink}>カテゴリ管理で登録する →</Link>
        </div>
      ) : (
        <select style={styles.input} value={category} onChange={(e) => setCategory(e.target.value)}>
          <option value="">選択してください</option>
          {selectableCategories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      )}

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

      {/* F-28：有効なカテゴリが0件のときは保存できないため、両ボタンを非活性にする */}
      <div style={styles.buttonRow}>
        <button type="submit" style={styles.primaryBtn} disabled={submitting || noSelectableCategory}>
          {submitting ? '保存中...' : isEdit ? '更新する' : '登録する'}
        </button>
        <button
          type="button"
          style={styles.draftBtn}
          onClick={handleSaveDraft}
          disabled={submitting || noSelectableCategory}
        >
          下書き保存
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
  draftTag: { fontSize: '11px', color: '#888', backgroundColor: '#f0f2f5', padding: '1px 6px', borderRadius: '4px', marginLeft: '8px' },
  errorBox: { backgroundColor: '#fdecea', border: '1px solid #f5c6cb', borderRadius: '6px', padding: '10px 14px', marginBottom: '16px' },
  errorLine: { fontSize: '13px', color: '#c0392b', margin: '2px 0' },
  sectionTitle: { fontSize: '13px', fontWeight: '600', color: '#555', margin: '0 0 12px' },
  label: { display: 'block', fontSize: '12px', color: '#888', margin: '10px 0 4px' },
  input: { width: '100%', padding: '8px 10px', fontSize: '14px', border: '1px solid #dee2e6', borderRadius: '6px', boxSizing: 'border-box' },
  textarea: { width: '100%', height: '70px', padding: '8px 10px', fontSize: '14px', border: '1px solid #dee2e6', borderRadius: '6px', boxSizing: 'border-box', resize: 'vertical' },
  row2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' },
  amountWrap: { display: 'flex', alignItems: 'center', border: '1px solid #dee2e6', borderRadius: '6px', padding: '0 10px' },
  yen: { fontSize: '14px', color: '#888', marginRight: '4px' },
  // F-21・F-22
  taxHint: { fontSize: '12px', color: '#555', margin: '6px 0 0' },
  taxHintNote: { fontSize: '11px', color: '#888', marginLeft: '6px' },
  qualifiedBlock: { marginTop: '14px', padding: '12px 14px', backgroundColor: '#f8f9fb', border: '1px solid #dee2e6', borderRadius: '6px' },
  // F-28：有効なカテゴリが0件のときの案内
  emptyCategoryBox: { padding: '10px 12px', fontSize: '13px', backgroundColor: '#fff8e1', border: '1px solid #f0c987', borderRadius: '6px', color: '#8a6d3b' },
  emptyCategoryLink: { marginLeft: '8px', color: '#1a4fa0', textDecoration: 'none', fontWeight: '500' },
  checkboxLabel: { display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', marginBottom: '10px' },
  inputAmount: { flex: 1, border: 'none', padding: '8px 0', fontSize: '14px', outline: 'none' },
  divider: { border: 'none', borderTop: '1px solid #f0f2f5', margin: '20px 0' },
  buttonRow: { display: 'flex', alignItems: 'center', gap: '10px', marginTop: '20px' },
  primaryBtn: { padding: '9px 20px', fontSize: '14px', backgroundColor: '#1a4fa0', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer' },
  draftBtn: { padding: '9px 20px', fontSize: '14px', backgroundColor: '#fff', color: '#555', border: '1px solid #dee2e6', borderRadius: '6px', cursor: 'pointer' },
  deleteBtn: { padding: '9px 20px', fontSize: '14px', backgroundColor: '#fff', color: '#c0392b', border: '1px solid #c0392b', borderRadius: '6px', cursor: 'pointer' },
  cancelBtn: { padding: '9px 20px', fontSize: '14px', backgroundColor: '#fff', color: '#c0392b', border: '1px solid #c0392b', borderRadius: '6px', cursor: 'pointer', marginLeft: 'auto' },
};

export default ExpenseForm;