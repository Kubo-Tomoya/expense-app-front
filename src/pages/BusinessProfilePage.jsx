import { useState, useEffect } from 'react';
import { getBusinessProfile, saveBusinessProfile } from '../api/businessProfileApi';
import Toast from '../components/Toast';

// 画面の状態を3つに分ける：
// 'notSet'  = 未設定（案bの状態画面）
// 'view'    = 設定済みの内容を表示するだけの画面
// 'editing' = 入力フォーム（新規設定・編集どちらも同じフォームを使う）
function BusinessProfilePage() {
  const [mode, setMode] = useState(null); // 初期値null＝読み込み中
  const [profile, setProfile] = useState(null);
  const [form, setForm] = useState({ businessName: '', ownerName: '', address: '', invoiceRegistrationNumber: '' });
  const [errors, setErrors] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    getBusinessProfile().then((res) => {
      setProfile(res.data);
      // ownerName（必須項目）がnullなら未設定と判定する
      setMode(res.data.ownerName ? 'view' : 'notSet');
    });
  }, []);

  const startEdit = () => {
    // 編集開始時、現在のプロフィール内容（未設定なら空欄）をフォームにセットする
    setForm({
      businessName: profile?.businessName ?? '',
      ownerName: profile?.ownerName ?? '',
      address: profile?.address ?? '',
      invoiceRegistrationNumber: profile?.invoiceRegistrationNumber ?? '',
    });
    setErrors([]);
    setMode('editing');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrors([]);
    setSubmitting(true);
    try {
      const res = await saveBusinessProfile(form);
      setProfile(res.data);
      setMode('view');
      setToast({ message: '保存しました', type: 'success' });
    } catch (err) {
      // バックエンドのバリデーションエラー（インボイス登録番号の形式・氏名必須）を
      // 複数まとめて表示できるよう、配列に正規化する
      const data = err.response?.data;
      const messages = data?.errors ? Object.values(data.errors) : [data?.message ?? '保存に失敗しました'];
      setErrors(messages);
    } finally {
      setSubmitting(false);
    }
  };

  if (mode === null) {
    return <div style={styles.page}>読み込み中...</div>;
  }

  return (
    <div style={styles.page}>
      <h1 style={styles.title}>事業者プロフィール</h1>

      {mode === 'notSet' && (
        <div style={styles.emptyCard}>
          <p style={styles.emptyLabel}>まだ設定されていません</p>
          <button style={styles.primaryBtn} onClick={startEdit}>設定する</button>
        </div>
      )}

      {mode === 'view' && (
        <div style={styles.viewCard}>
          <Row label="屋号" value={profile.businessName} />
          <Row label="氏名" value={profile.ownerName} />
          <Row label="住所" value={profile.address} />
          <Row label="インボイス登録番号" value={profile.invoiceRegistrationNumber} />
          <button style={styles.editBtn} onClick={startEdit}>編集</button>
        </div>
      )}

      {mode === 'editing' && (
        <form onSubmit={handleSubmit} style={styles.formCard}>
          {errors.length > 0 && (
            <div style={styles.errorBox}>
              {errors.map((msg, i) => <p key={i} style={styles.errorLine}>・{msg}</p>)}
            </div>
          )}

          <label style={styles.label}>
            屋号 <span style={styles.optionalTag}>任意</span>
          </label>
          <input
            style={styles.input}
            value={form.businessName}
            onChange={(e) => setForm({ ...form, businessName: e.target.value })}
          />

          <label style={styles.label}>
            氏名 <span style={styles.requiredTag}>必須</span>
          </label>
          <input
            style={styles.input}
            value={form.ownerName}
            onChange={(e) => setForm({ ...form, ownerName: e.target.value })}
            required
          />

          <label style={styles.label}>
            住所 <span style={styles.optionalTag}>任意</span>
          </label>
          <input
            style={styles.input}
            value={form.address}
            onChange={(e) => setForm({ ...form, address: e.target.value })}
          />

          <label style={styles.label}>
            インボイス登録番号 <span style={styles.optionalTag}>任意</span>
          </label>
          <input
            style={{ ...styles.input, marginBottom: '20px' }}
            value={form.invoiceRegistrationNumber}
            onChange={(e) => setForm({ ...form, invoiceRegistrationNumber: e.target.value })}
            placeholder="T1234567890123（任意）"
          />

          <div style={styles.buttonRow}>
            <button type="submit" style={styles.primaryBtn} disabled={submitting}>
              {submitting ? '保存中...' : '保存する'}
            </button>
            <button
              type="button"
              style={styles.cancelBtn}
              onClick={() => setMode(profile?.ownerName ? 'view' : 'notSet')}
            >
              キャンセル
            </button>
          </div>
        </form>
      )}

      <Toast message={toast?.message} type={toast?.type} onClose={() => setToast(null)} />
    </div>
  );
}

// 表示専用の1行（ラベル＋値）。値が無ければ「未設定」と薄字で表示する
function Row({ label, value }) {
  return (
    <div style={styles.row}>
      <span style={styles.rowLabel}>{label}</span>
      <span style={value ? styles.rowValue : styles.rowValueEmpty}>{value || '未設定'}</span>
    </div>
  );
}

const styles = {
  page: { padding: '24px' },
  title: { fontSize: '20px', fontWeight: '600', margin: '0 0 20px' },
  emptyCard: { backgroundColor: '#fff', border: '1px solid #dee2e6', borderRadius: '8px', padding: '40px', textAlign: 'center', maxWidth: '420px' },
  emptyLabel: { fontSize: '14px', color: '#888', margin: '0 0 16px' },
  viewCard: { backgroundColor: '#fff', border: '1px solid #dee2e6', borderRadius: '8px', padding: '24px', maxWidth: '420px' },
  row: { display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #f0f2f5' },
  rowLabel: { fontSize: '13px', color: '#888' },
  rowValue: { fontSize: '13px', color: '#333' },
  rowValueEmpty: { fontSize: '13px', color: '#bbb' },
  formCard: { backgroundColor: '#fff', border: '1px solid #dee2e6', borderRadius: '8px', padding: '24px', maxWidth: '420px' },
  label: { display: 'block', fontSize: '12px', color: '#888', margin: '0 0 4px' },
  input: { width: '100%', padding: '8px 10px', fontSize: '14px', border: '1px solid #dee2e6', borderRadius: '6px', boxSizing: 'border-box', marginBottom: '14px' },
  buttonRow: { display: 'flex', gap: '10px', marginTop: '4px' },
  primaryBtn: { padding: '9px 20px', fontSize: '14px', backgroundColor: '#1a4fa0', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer' },
  editBtn: { marginTop: '16px', padding: '9px 20px', fontSize: '14px', backgroundColor: '#fff', color: '#1a4fa0', border: '1px solid #1a4fa0', borderRadius: '6px', cursor: 'pointer' },
  cancelBtn: { padding: '9px 20px', fontSize: '14px', backgroundColor: '#fff', color: '#888', border: '1px solid #dee2e6', borderRadius: '6px', cursor: 'pointer' },
  errorBox: { backgroundColor: '#fdecea', border: '1px solid #f5c6cb', borderRadius: '6px', padding: '10px 14px', marginBottom: '16px' },
  errorLine: { fontSize: '13px', color: '#c0392b', margin: '2px 0' },
  requiredTag: { fontSize: '11px', color: '#c0392b', backgroundColor: '#fdecea', padding: '1px 6px', borderRadius: '4px', marginLeft: '4px', fontWeight: '500' },
  optionalTag: { fontSize: '11px', color: '#888', backgroundColor: '#f0f2f5', padding: '1px 6px', borderRadius: '4px', marginLeft: '4px', fontWeight: '500' },
};

export default BusinessProfilePage;