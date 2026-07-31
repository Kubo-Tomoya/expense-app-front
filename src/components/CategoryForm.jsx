import { useState } from 'react';
import {
  TAX_FORM_CATEGORIES,
  TAX_FORM_CATEGORY_OTHER,
} from '../constants/taxFormCategory';

/**
 * S-15 のカテゴリ登録・編集フォーム（F-28）。
 *
 * 一覧の中にインライン展開して使う。入力項目が2つだけのため、
 * 取引先（S-12）のように別画面には分けていない。
 *
 * 勘定科目は「選択＋自由入力」の併用とする。F-25（freee連携）で
 * マッピングキーとして使うため表記の揺れを減らしたいが、
 * 業種固有の科目もあるため選択肢に無い場合は自由入力を許す
 */
function CategoryForm({ initialData, onSave, onCancel, onDeactivate, onActivate, saving }) {
  const isEdit = Boolean(initialData);

  const [name, setName] = useState(initialData?.name ?? '');
  // 登録済みの科目が選択肢に無い場合は「その他（自由入力）」を初期選択にする
  const initialTaxForm = initialData?.taxFormCategory ?? '';
  const isPresetValue = TAX_FORM_CATEGORIES.includes(initialTaxForm);
  const [taxFormSelect, setTaxFormSelect] = useState(
    initialTaxForm === '' ? '' : isPresetValue ? initialTaxForm : TAX_FORM_CATEGORY_OTHER
  );
  const [taxFormText, setTaxFormText] = useState(isPresetValue ? '' : initialTaxForm);
  const [errors, setErrors] = useState([]);

  const isOther = taxFormSelect === TAX_FORM_CATEGORY_OTHER;

  const validate = () => {
    const errs = [];
    const trimmed = name.trim();
    if (!trimmed) errs.push('カテゴリ名を入力してください');
    if (trimmed.length > 20) errs.push('カテゴリ名は20文字以内で入力してください');
    if (isOther && taxFormText.trim().length > 50) {
      errs.push('確定申告の勘定科目は50文字以内で入力してください');
    }
    return errs;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const errs = validate();
    setErrors(errs);
    if (errs.length > 0) return;

    // 「未設定」を選んだ場合はnullを送る（F-23の集計では「雑費」として扱われる）
    const taxFormCategory = taxFormSelect === ''
      ? null
      : isOther
        ? (taxFormText.trim() || null)
        : taxFormSelect;

    onSave({ name: name.trim(), taxFormCategory });
  };

  return (
    <form onSubmit={handleSubmit}>
      {errors.length > 0 && (
        <ul style={styles.errorBox}>
          {errors.map((err) => <li key={err}>{err}</li>)}
        </ul>
      )}

      <div style={styles.row}>
        <div style={styles.field}>
          <label style={styles.label}>カテゴリ名</label>
          <input
            style={styles.input}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="例：交通費"
            maxLength={20}
          />
        </div>
        <div style={styles.field}>
          <label style={styles.label}>確定申告の勘定科目（任意）</label>
          <select
            style={styles.input}
            value={taxFormSelect}
            onChange={(e) => setTaxFormSelect(e.target.value)}
          >
            <option value="">未設定（雑費として集計）</option>
            {TAX_FORM_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            <option value={TAX_FORM_CATEGORY_OTHER}>その他（自由入力）</option>
          </select>
        </div>
      </div>

      {isOther && (
        <div style={styles.field}>
          <label style={styles.label}>勘定科目名（自由入力）</label>
          <input
            style={styles.input}
            value={taxFormText}
            onChange={(e) => setTaxFormText(e.target.value)}
            placeholder="例：研究開発費"
            maxLength={50}
          />
        </div>
      )}

      <div style={styles.buttonRow}>
        <button type="submit" style={styles.saveBtn} disabled={saving}>
          {saving ? '保存中...' : '保存'}
        </button>
        <button type="button" style={styles.cancelBtn} onClick={onCancel} disabled={saving}>
          キャンセル
        </button>
        {isEdit && initialData.isActive && (
          <button type="button" style={styles.deactivateBtn} onClick={onDeactivate} disabled={saving}>
            無効化
          </button>
        )}
        {isEdit && !initialData.isActive && (
          <button type="button" style={styles.activateBtn} onClick={onActivate} disabled={saving}>
            再有効化
          </button>
        )}
      </div>
    </form>
  );
}

const styles = {
  errorBox: { margin: '0 0 12px', padding: '10px 12px 10px 28px', backgroundColor: '#fdecea', color: '#c0392b', borderRadius: '6px', fontSize: '13px' },
  row: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' },
  field: { marginBottom: '12px' },
  label: { display: 'block', fontSize: '12px', color: '#666', marginBottom: '4px' },
  input: { width: '100%', padding: '8px 10px', fontSize: '14px', border: '1px solid #dee2e6', borderRadius: '6px', boxSizing: 'border-box' },
  buttonRow: { display: 'flex', gap: '10px', marginTop: '4px' },
  saveBtn: { padding: '6px 18px', fontSize: '13px', border: 'none', backgroundColor: '#1a4fa0', color: '#fff', borderRadius: '6px', cursor: 'pointer' },
  cancelBtn: { padding: '6px 16px', fontSize: '13px', border: '1px solid #dee2e6', background: '#fff', color: '#555', borderRadius: '6px', cursor: 'pointer' },
  deactivateBtn: { padding: '6px 16px', fontSize: '13px', border: '1px solid #c0392b', color: '#c0392b', background: '#fff', borderRadius: '6px', cursor: 'pointer', marginLeft: 'auto' },
  activateBtn: { padding: '6px 16px', fontSize: '13px', border: '1px solid #2e8b57', color: '#2e8b57', background: '#fff', borderRadius: '6px', cursor: 'pointer', marginLeft: 'auto' },
};

export default CategoryForm;
