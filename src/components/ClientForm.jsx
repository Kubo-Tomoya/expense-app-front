import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createClient, updateClient } from '../api/clientApi';

// 敬称は「御中／様」の2択、デフォルトは「御中」（S-12 画面項目定義）
const HONORIFICS = ['御中', '様'];
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * S-12 取引先登録・編集画面のフォーム。
 * ExpenseForm（S-02/S-03）と同様に、登録・編集の両モードを1コンポーネントで扱い、
 * 呼び出し側のページ（ClientCreate / ClientEdit）でmodeを切り替える
 */
function ClientForm({ mode, clientId, initialData }) {
  const isEdit = mode === 'edit';
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name: initialData?.name ?? '',
    honorific: initialData?.honorific ?? '御中',
    contactPerson: initialData?.contactPerson ?? '',
    address: initialData?.address ?? '',
    email: initialData?.email ?? '',
    phone: initialData?.phone ?? '',
    memo: initialData?.memo ?? '',
  });
  const [errors, setErrors] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  const update = (key) => (e) => setForm((prev) => ({ ...prev, [key]: e.target.value }));

  // クライアント側バリデーション（S-12 イベント2）：
  // 会社名の必須・文字数と、入力があった場合のみメール形式をチェックする
  const validate = () => {
    const errs = [];
    const name = form.name.trim();
    if (name.length < 1 || name.length > 100) errs.push('会社名／屋号は1〜100文字で入力してください');
    if (form.email && !EMAIL_PATTERN.test(form.email)) errs.push('メールアドレスの形式が正しくありません');
    return errs;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    setErrors(errs);
    if (errs.length > 0) return;

    setSubmitting(true);
    try {
      if (isEdit) {
        await updateClient(clientId, form);
      } else {
        await createClient(form);
      }
      // 完了後はS-11へ戻り、遷移先でトースト通知を表示する
      navigate('/clients', { state: { toast: isEdit ? '更新しました' : '登録しました' } });
    } catch (err) {
      console.error(err);
      // バックエンドのバリデーションエラーは複数まとめて表示できるよう配列に正規化する
      const data = err.response?.data;
      const messages = data?.errors
        ? Object.values(data.errors)
        : [data?.message ?? (isEdit ? '更新に失敗しました' : '登録に失敗しました')];
      setErrors(messages);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} style={styles.form}>
      {isEdit && initialData && (
        <div style={styles.editBanner}>
          編集中：{initialData.name} / ID: #{clientId}
          {initialData.isActive === false && <span style={styles.inactiveTag}>無効</span>}
        </div>
      )}

      {errors.length > 0 && (
        <div style={styles.errorBox}>
          {errors.map((msg, i) => <p key={i} style={styles.errorLine}>・{msg}</p>)}
        </div>
      )}

      <p style={styles.sectionTitle}>取引先情報</p>

      <label style={styles.label}>
        会社名／屋号 <span style={styles.requiredTag}>必須</span>
      </label>
      <input
        style={styles.input}
        value={form.name}
        onChange={update('name')}
        placeholder="株式会社○○"
        maxLength={100}
      />

      <label style={styles.label}>敬称</label>
      <select style={styles.input} value={form.honorific} onChange={update('honorific')}>
        {HONORIFICS.map((h) => <option key={h} value={h}>{h}</option>)}
      </select>

      <label style={styles.label}>
        担当者名 <span style={styles.optionalTag}>任意</span>
      </label>
      <input style={styles.input} value={form.contactPerson} onChange={update('contactPerson')} />

      <label style={styles.label}>
        住所 <span style={styles.optionalTag}>任意</span>
      </label>
      <input style={styles.input} value={form.address} onChange={update('address')} />

      <label style={styles.label}>
        メールアドレス <span style={styles.optionalTag}>任意</span>
      </label>
      <input style={styles.input} value={form.email} onChange={update('email')} placeholder="sample@example.com" />

      <label style={styles.label}>
        電話番号 <span style={styles.optionalTag}>任意</span>
      </label>
      <input style={styles.input} value={form.phone} onChange={update('phone')} placeholder="03-1234-5678" />

      <label style={styles.label}>
        備考 <span style={styles.optionalTag}>任意</span>
      </label>
      <textarea style={styles.textarea} value={form.memo} onChange={update('memo')} />

      <hr style={styles.divider} />

      <div style={styles.buttonRow}>
        <button type="submit" style={styles.primaryBtn} disabled={submitting}>
          {submitting ? '保存中...' : isEdit ? '更新する' : '登録する'}
        </button>
        <button type="button" style={styles.cancelBtn} onClick={() => navigate('/clients')}>
          キャンセル
        </button>
      </div>
    </form>
  );
}

const styles = {
  form: { maxWidth: '560px', backgroundColor: '#fff', border: '1px solid #dee2e6', borderRadius: '8px', padding: '24px' },
  editBanner: { backgroundColor: '#fff8e1', border: '1px solid #ffe082', borderRadius: '6px', padding: '10px 14px', fontSize: '13px', marginBottom: '16px' },
  inactiveTag: { fontSize: '11px', color: '#888', backgroundColor: '#f0f2f5', padding: '1px 6px', borderRadius: '4px', marginLeft: '8px' },
  errorBox: { backgroundColor: '#fdecea', border: '1px solid #f5c6cb', borderRadius: '6px', padding: '10px 14px', marginBottom: '16px' },
  errorLine: { fontSize: '13px', color: '#c0392b', margin: '2px 0' },
  sectionTitle: { fontSize: '13px', fontWeight: '600', color: '#555', margin: '0 0 12px' },
  label: { display: 'block', fontSize: '12px', color: '#888', margin: '10px 0 4px' },
  input: { width: '100%', padding: '8px 10px', fontSize: '14px', border: '1px solid #dee2e6', borderRadius: '6px', boxSizing: 'border-box' },
  textarea: { width: '100%', height: '70px', padding: '8px 10px', fontSize: '14px', border: '1px solid #dee2e6', borderRadius: '6px', boxSizing: 'border-box', resize: 'vertical' },
  divider: { border: 'none', borderTop: '1px solid #f0f2f5', margin: '20px 0' },
  buttonRow: { display: 'flex', alignItems: 'center', gap: '10px' },
  primaryBtn: { padding: '9px 20px', fontSize: '14px', backgroundColor: '#1a4fa0', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer' },
  cancelBtn: { padding: '9px 20px', fontSize: '14px', backgroundColor: '#fff', color: '#c0392b', border: '1px solid #c0392b', borderRadius: '6px', cursor: 'pointer', marginLeft: 'auto' },
  requiredTag: { fontSize: '11px', color: '#c0392b', backgroundColor: '#fdecea', padding: '1px 6px', borderRadius: '4px', marginLeft: '4px', fontWeight: '500' },
  optionalTag: { fontSize: '11px', color: '#888', backgroundColor: '#f0f2f5', padding: '1px 6px', borderRadius: '4px', marginLeft: '4px', fontWeight: '500' },
};

export default ClientForm;
