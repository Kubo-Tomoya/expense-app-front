import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getClientById, deactivateClient, activateClient } from '../api/clientApi';

/**
 * S-11 取引先一覧の行クリックで展開する詳細ドロワー。
 * ExpenseDrawer（S-01）と同じインライン展開方式に揃えている。
 *
 * 経費（F-04）は削除＝deleted_atの論理削除だが、取引先は請求書（F-17）から
 * 参照され続けるため、削除ボタンではなく「無効化」（is_active=false）とする
 */
function ClientDrawer({ clientId, onClose, onDeactivated, onActivated }) {
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [deactivating, setDeactivating] = useState(false);
  const [activating, setActivating] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getClientById(clientId)
      .then((res) => { if (!cancelled) setDetail(res.data); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [clientId]);

  const handleDeactivate = async () => {
    if (!window.confirm('この取引先を無効にしますか？\n過去の請求書は残りますが、新規作成時の選択肢には表示されなくなります。')) return;
    setDeactivating(true);
    try {
      const res = await deactivateClient(clientId);
      setDetail(res.data);
      onDeactivated();
    } catch (err) {
      console.error(err);
      alert('無効化に失敗しました');
    } finally {
      setDeactivating(false);
    }
  };

  // 再有効化（F-16の追加要件）。無効化と違い過去の請求書への影響がないため確認ダイアログは出さない
  const handleActivate = async () => {
    setActivating(true);
    try {
      const res = await activateClient(clientId);
      setDetail(res.data);
      onActivated();
    } catch (err) {
      console.error(err);
      alert('再有効化に失敗しました');
    } finally {
      setActivating(false);
    }
  };

  if (loading) return <div style={styles.drawer}>読み込み中...</div>;
  if (!detail) return null;

  return (
    <div style={styles.drawer}>
      <button style={styles.closeBtn} onClick={onClose}>×</button>
      <div style={styles.grid}>
        <div><p style={styles.label}>会社名／屋号</p><p style={styles.value}>{detail.name} {detail.honorific}</p></div>
        <div><p style={styles.label}>担当者名</p><p style={styles.value}>{detail.contactPerson || '—'}</p></div>
        <div><p style={styles.label}>電話番号</p><p style={styles.value}>{detail.phone || '—'}</p></div>
        <div>
          <p style={styles.label}>ステータス</p>
          <p style={styles.value}>{detail.isActive ? '有効' : '無効'}</p>
        </div>
      </div>
      <div style={styles.block}>
        <p style={styles.label}>住所</p>
        <p style={styles.value}>{detail.address || '—'}</p>
      </div>
      <div style={styles.block}>
        <p style={styles.label}>メールアドレス</p>
        <p style={styles.value}>{detail.email || '—'}</p>
      </div>
      <div style={styles.block}>
        <p style={styles.label}>備考</p>
        <p style={styles.value}>{detail.memo || '（備考なし）'}</p>
      </div>
      <div style={styles.actionRow}>
        <button style={styles.editBtn} onClick={() => navigate(`/clients/${clientId}/edit`)}>編集</button>
        {detail.isActive ? (
          <button style={styles.deactivateBtn} onClick={handleDeactivate} disabled={deactivating}>
            {deactivating ? '無効化中...' : '無効化'}
          </button>
        ) : (
          <button style={styles.activateBtn} onClick={handleActivate} disabled={activating}>
            {activating ? '再有効化中...' : '再有効化'}
          </button>
        )}
      </div>
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
  actionRow: { display: 'flex', gap: '10px' },
  editBtn: { padding: '6px 16px', fontSize: '13px', border: '1px solid #1a4fa0', color: '#1a4fa0', background: '#fff', borderRadius: '6px', cursor: 'pointer' },
  deactivateBtn: { padding: '6px 16px', fontSize: '13px', border: '1px solid #c0392b', color: '#c0392b', background: '#fff', borderRadius: '6px', cursor: 'pointer' },
  activateBtn: { padding: '6px 16px', fontSize: '13px', border: '1px solid #2e8b57', color: '#2e8b57', background: '#fff', borderRadius: '6px', cursor: 'pointer' },
};

export default ClientDrawer;
