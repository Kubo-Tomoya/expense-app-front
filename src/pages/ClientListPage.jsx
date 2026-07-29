import { useState, useEffect, useMemo, Fragment } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { getClients } from '../api/clientApi';
import ClientDrawer from '../components/ClientDrawer';
import Toast from '../components/Toast';

/**
 * S-11 取引先一覧画面（F-16）。
 * 初期表示は有効な取引先のみ。キーワード検索・有効/無効の切替は、
 * S-01/S-10と同様にフロント側で絞り込む（追加リクエストは発生させない）
 */
function ClientListPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [keyword, setKeyword] = useState('');
  const [showInactive, setShowInactive] = useState(false);
  const [selectedId, setSelectedId] = useState(null);
  const [toast, setToast] = useState(null);

  const fetchClients = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getClients();
      setClients(res.data);
    } catch (err) {
      console.error(err);
      setError('取引先一覧の取得に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchClients(); }, []);

  // S-12（登録・編集）から戻ってきた場合、遷移時に渡されたメッセージをトースト表示する。
  // 同じメッセージが再表示され続けないよう、表示後は履歴のstateを消しておく
  useEffect(() => {
    if (location.state?.toast) {
      setToast({ message: location.state.toast, type: 'success' });
      navigate(location.pathname, { replace: true, state: null });
    }
  }, [location, navigate]);

  const visibleClients = useMemo(() => {
    const kw = keyword.trim().toLowerCase();
    return clients
      .filter((c) => showInactive || c.isActive)
      .filter((c) => {
        if (!kw) return true;
        // 検索対象は会社名・担当者名（S-11 画面項目定義）
        return c.name.toLowerCase().includes(kw) || (c.contactPerson ?? '').toLowerCase().includes(kw);
      })
      .sort((a, b) => a.name.localeCompare(b.name, 'ja'));
  }, [clients, keyword, showInactive]);

  // 無効化の結果を一覧に反映する。「有効のみ表示」の場合、
  // 該当行はこの時点で一覧から外れるためドロワーも閉じる
  const handleDeactivated = (deactivatedId) => {
    setClients((prev) => prev.map((c) => (c.id === deactivatedId ? { ...c, isActive: false } : c)));
    if (!showInactive) setSelectedId(null);
    setToast({ message: '無効にしました', type: 'success' });
  };

  if (loading) return <div style={styles.page}>読み込み中...</div>;
  if (error) return <div style={styles.page}><p style={styles.errorText}>{error}</p></div>;

  return (
    <div style={styles.page}>
      <div style={styles.topBar}>
        <h1 style={styles.title}>取引先管理</h1>
        <Link to="/clients/create" style={styles.newBtn}>+ 新規登録</Link>
      </div>

      <div style={styles.filterBar}>
        <div style={styles.searchWrap}>
          <SearchIcon />
          <input
            style={styles.searchInput}
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="会社名・担当者名でキーワード検索"
          />
        </div>
        <select
          style={styles.select}
          value={showInactive ? 'all' : 'active'}
          onChange={(e) => {
            setShowInactive(e.target.value === 'all');
            setSelectedId(null);
          }}
        >
          <option value="active">有効のみ</option>
          <option value="all">無効を含む全件</option>
        </select>
      </div>

      {visibleClients.length === 0 ? (
        <p style={styles.emptyText}>
          {keyword ? '該当する取引先が見つかりません' : '取引先はまだ登録されていません'}
        </p>
      ) : (
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={{ ...styles.th, width: '30%', textAlign: 'left' }}>会社名／屋号</th>
              <th style={{ ...styles.th, width: '8%', textAlign: 'center' }}>敬称</th>
              <th style={{ ...styles.th, width: '20%', textAlign: 'left' }}>担当者名</th>
              <th style={{ ...styles.th, width: '30%', textAlign: 'left' }}>メールアドレス</th>
              <th style={{ ...styles.th, width: '12%', textAlign: 'center' }}>ステータス</th>
            </tr>
          </thead>
          <tbody>
            {visibleClients.map((c) => (
              <Fragment key={c.id}>
                <tr
                  style={{ ...styles.row, ...(selectedId === c.id ? styles.rowActive : {}) }}
                  onClick={() => setSelectedId((prev) => (prev === c.id ? null : c.id))}
                >
                  <td style={{ ...styles.tdName, ...(c.isActive ? {} : styles.inactiveText) }}>{c.name}</td>
                  <td style={styles.tdCenter}>{c.honorific}</td>
                  <td style={styles.td}>{c.contactPerson || '—'}</td>
                  <td style={styles.td}>{c.email || '—'}</td>
                  <td style={styles.tdCenter}>
                    <span style={{ ...styles.badge, ...(c.isActive ? styles.badgeActive : styles.badgeInactive) }}>
                      {c.isActive ? '有効' : '無効'}
                    </span>
                  </td>
                </tr>
                {selectedId === c.id && (
                  <tr>
                    <td colSpan={5} style={{ padding: 0, border: 'none' }}>
                      <ClientDrawer
                        clientId={c.id}
                        onClose={() => setSelectedId(null)}
                        onDeactivated={() => handleDeactivated(c.id)}
                      />
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
          </tbody>
        </table>
      )}

      <div style={styles.footer}>
        <span>{visibleClients.length}件</span>
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
  filterBar: { display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' },
  searchWrap: { display: 'flex', alignItems: 'center', gap: '8px', flex: 1, border: '1px solid #dee2e6', borderRadius: '6px', padding: '0 10px', backgroundColor: '#fff' },
  searchInput: { flex: 1, border: 'none', outline: 'none', padding: '8px 0', fontSize: '13px' },
  select: { padding: '8px 10px', fontSize: '13px', border: '1px solid #dee2e6', borderRadius: '6px', backgroundColor: '#fff' },
  table: { width: '100%', borderCollapse: 'collapse', backgroundColor: '#fff', border: '1px solid #dee2e6', borderRadius: '8px' },
  th: { padding: '10px 12px', fontSize: '12px', color: '#888', borderBottom: '1px solid #dee2e6' },
  row: { cursor: 'pointer', borderBottom: '1px solid #f0f2f5' },
  rowActive: { backgroundColor: '#f0f6ff' },
  td: { padding: '10px 12px', fontSize: '13px' },
  tdName: { padding: '10px 12px', fontSize: '13px', fontWeight: '500' },
  tdCenter: { padding: '10px 12px', fontSize: '13px', textAlign: 'center' },
  inactiveText: { color: '#bbb', fontWeight: '400' },
  badge: { fontSize: '11px', padding: '2px 8px', borderRadius: '10px' },
  badgeActive: { backgroundColor: '#e6f4ea', color: '#2e8b57' },
  badgeInactive: { backgroundColor: '#f0f2f5', color: '#888' },
  footer: { display: 'flex', justifyContent: 'space-between', marginTop: '12px', fontSize: '12px', color: '#888' },
  hint: { color: '#aaa' },
  emptyText: { fontSize: '13px', color: '#888' },
  errorText: { color: '#c0392b', fontSize: '14px' },
};

export default ClientListPage;
