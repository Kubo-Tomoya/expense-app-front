import { Fragment, useState, useEffect, useMemo } from 'react';
import {
  getCategories,
  createCategory,
  updateCategory,
  updateCategoryOrder,
  deactivateCategory,
  activateCategory,
} from '../api/categoryApi';
import Toast from '../components/Toast';
import CategoryForm from '../components/CategoryForm';
import { TAX_FORM_CATEGORY_UNSET_LABEL } from '../constants/taxFormCategory';

/**
 * S-15 カテゴリ管理画面（F-28）。
 *
 * F-07・F-14で「カテゴリはユーザーごとにカスタマイズ可能」と定義していたが、
 * 操作する画面もAPIも無く初期5件から変更できなかったため新設した。
 * あわせて確定申告の勘定科目（F-23のレポートで使う）を設定できるようにしている。
 *
 * 登録・編集は別画面にせず、S-01の詳細ドロワーと同じインライン展開方式とした。
 * 取引先（S-11/S-12）は入力項目が7つあるため画面を分けたが、
 * カテゴリは2項目のみで一覧との往復コストが上回るため
 */
function CategoryListPage() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [toast, setToast] = useState(null);

  const [showInactive, setShowInactive] = useState(false);
  // 展開中のフォーム。'new' なら新規登録、数値ならそのカテゴリの編集
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getCategories()
      .then((res) => setCategories(res.data))
      .catch(() => setError('カテゴリの取得に失敗しました'))
      .finally(() => setLoading(false));
  }, []);

  const visibleCategories = useMemo(
    () => categories.filter((c) => showInactive || c.isActive),
    [categories, showInactive]
  );

  const reload = async (message) => {
    const res = await getCategories();
    setCategories(res.data);
    setEditingId(null);
    if (message) setToast({ message, type: 'success' });
  };

  const handleSave = async (form) => {
    setSaving(true);
    try {
      const payload = { name: form.name, taxFormCategory: form.taxFormCategory };
      if (editingId === 'new') {
        await createCategory(payload);
        await reload('登録しました');
      } else {
        await updateCategory(editingId, payload);
        await reload('保存しました');
      }
    } catch (err) {
      // 同名カテゴリ（400）はサーバーのメッセージをそのまま見せる。
      // 「どの名前が重複しているか」が分かる文言になっているため
      const message = err.response?.data?.message ?? '保存に失敗しました';
      setToast({ message, type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  /**
   * 並び替え。画面を先に更新し（楽観的更新）、失敗したら元に戻す。
   * 無効なカテゴリはプルダウンに出ないため並び替えの対象に含めない
   */
  const handleMove = async (categoryId, direction) => {
    const activeIds = categories.filter((c) => c.isActive).map((c) => c.id);
    const index = activeIds.indexOf(categoryId);
    const swapWith = index + direction;
    if (index === -1 || swapWith < 0 || swapWith >= activeIds.length) return;

    const reordered = [...activeIds];
    [reordered[index], reordered[swapWith]] = [reordered[swapWith], reordered[index]];

    const previous = categories;
    // 並び替え後の順序で即座に再描画する
    setCategories((prev) =>
      [...prev].sort((a, b) => {
        const ai = reordered.indexOf(a.id);
        const bi = reordered.indexOf(b.id);
        if (ai === -1 || bi === -1) return 0;
        return ai - bi;
      })
    );

    try {
      // 無効なカテゴリも配列の末尾に含めて送る（display_orderを1から通しで振り直すため）
      const inactiveIds = categories.filter((c) => !c.isActive).map((c) => c.id);
      const res = await updateCategoryOrder([...reordered, ...inactiveIds]);
      setCategories(res.data);
    } catch (err) {
      console.error(err);
      setCategories(previous);
      setToast({ message: '並び替えに失敗しました', type: 'error' });
    }
  };

  const handleDeactivate = async (category) => {
    const usage = category.usageCount ?? 0;
    const message = usage > 0
      ? `このカテゴリを使う経費が${usage}件あります。\n無効にすると新規登録の選択肢から外れますが、過去の経費と集計はそのまま残ります。`
      : 'このカテゴリを無効にしますか？\n新規登録の選択肢から外れます。';
    if (!window.confirm(message)) return;

    try {
      await deactivateCategory(category.id);
      await reload('無効にしました');
      if (!showInactive) setEditingId(null);
    } catch (err) {
      console.error(err);
      setToast({ message: '無効化に失敗しました', type: 'error' });
    }
  };

  // 再有効化は元に戻す操作で、過去の経費にも影響しないため確認ダイアログは出さない（S-11と同じ方針）
  const handleActivate = async (category) => {
    try {
      await activateCategory(category.id);
      await reload('有効に戻しました');
    } catch (err) {
      console.error(err);
      setToast({ message: '再有効化に失敗しました', type: 'error' });
    }
  };

  if (loading) return <div style={styles.page}>読み込み中...</div>;
  if (error) return <div style={styles.page}><p style={styles.errorText}>{error}</p></div>;

  const activeIds = categories.filter((c) => c.isActive).map((c) => c.id);

  return (
    <div style={styles.page}>
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <div style={styles.topBar}>
        <h1 style={styles.title}>カテゴリ管理</h1>
        <button style={styles.newBtn} onClick={() => setEditingId('new')}>+ 新規登録</button>
      </div>

      <div style={styles.filterBar}>
        <select
          style={styles.select}
          value={showInactive ? 'all' : 'active'}
          onChange={(e) => setShowInactive(e.target.value === 'all')}
        >
          <option value="active">有効のみ</option>
          <option value="all">無効を含む全件</option>
        </select>
      </div>

      {editingId === 'new' && (
        <div style={styles.formBlock}>
          <CategoryForm
            onSave={handleSave}
            onCancel={() => setEditingId(null)}
            saving={saving}
          />
        </div>
      )}

      {visibleCategories.length === 0 ? (
        <p style={styles.emptyText}>カテゴリがありません。「＋新規登録」から追加してください。</p>
      ) : (
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.thNarrow}>並び替え</th>
              <th style={styles.th}>カテゴリ名</th>
              <th style={styles.th}>確定申告の勘定科目</th>
              <th style={styles.thCenter}>状態</th>
              <th style={styles.thRight}>使用件数</th>
            </tr>
          </thead>
          <tbody>
            {visibleCategories.map((c) => (
              // map が返す最外要素にkeyを付ける（内側のtrに付けてもReactには認識されない）
              <Fragment key={c.id}>
                <tr
                  style={styles.row}
                  onClick={() => setEditingId((prev) => (prev === c.id ? null : c.id))}
                >
                  <td style={styles.tdCenter} onClick={(e) => e.stopPropagation()}>
                    {c.isActive && (
                      <>
                        <button
                          style={styles.moveBtn}
                          onClick={() => handleMove(c.id, -1)}
                          disabled={activeIds.indexOf(c.id) === 0}
                        >↑</button>
                        <button
                          style={styles.moveBtn}
                          onClick={() => handleMove(c.id, 1)}
                          disabled={activeIds.indexOf(c.id) === activeIds.length - 1}
                        >↓</button>
                      </>
                    )}
                  </td>
                  <td style={{ ...styles.td, ...(c.isActive ? {} : styles.inactiveText) }}>{c.name}</td>
                  <td style={styles.tdMuted}>{c.taxFormCategory || TAX_FORM_CATEGORY_UNSET_LABEL}</td>
                  <td style={styles.tdCenter}>
                    <span style={{ ...styles.badge, ...(c.isActive ? styles.badgeActive : styles.badgeInactive) }}>
                      {c.isActive ? '有効' : '無効'}
                    </span>
                  </td>
                  <td style={styles.tdRight}>{c.usageCount ?? 0}件</td>
                </tr>
                {editingId === c.id && (
                  <tr>
                    <td colSpan={5} style={{ padding: 0, border: 'none' }}>
                      <div style={styles.formBlock}>
                        <CategoryForm
                          initialData={c}
                          onSave={handleSave}
                          onCancel={() => setEditingId(null)}
                          onDeactivate={() => handleDeactivate(c)}
                          onActivate={() => handleActivate(c)}
                          saving={saving}
                        />
                      </div>
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
          </tbody>
        </table>
      )}

      <p style={styles.footer}>
        {visibleCategories.length}件　行クリックで編集
      </p>
    </div>
  );
}

const styles = {
  page: { padding: '24px 28px' },
  topBar: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' },
  title: { fontSize: '20px', fontWeight: '700', margin: 0 },
  newBtn: { padding: '8px 16px', fontSize: '13px', border: 'none', backgroundColor: '#1a4fa0', color: '#fff', borderRadius: '6px', cursor: 'pointer' },
  filterBar: { display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' },
  select: { padding: '8px 10px', fontSize: '13px', border: '1px solid #dee2e6', borderRadius: '6px' },
  table: { width: '100%', borderCollapse: 'collapse', backgroundColor: '#fff', border: '1px solid #dee2e6', borderRadius: '8px', overflow: 'hidden' },
  th: { padding: '10px 12px', fontSize: '12px', color: '#888', textAlign: 'left', borderBottom: '1px solid #dee2e6' },
  thNarrow: { padding: '10px 12px', fontSize: '12px', color: '#888', textAlign: 'center', width: '90px', borderBottom: '1px solid #dee2e6' },
  thCenter: { padding: '10px 12px', fontSize: '12px', color: '#888', textAlign: 'center', borderBottom: '1px solid #dee2e6' },
  thRight: { padding: '10px 12px', fontSize: '12px', color: '#888', textAlign: 'right', borderBottom: '1px solid #dee2e6' },
  row: { cursor: 'pointer', borderBottom: '1px solid #f0f2f5' },
  td: { padding: '10px 12px', fontSize: '13px', fontWeight: '500' },
  tdMuted: { padding: '10px 12px', fontSize: '13px', color: '#666' },
  tdCenter: { padding: '10px 12px', textAlign: 'center' },
  tdRight: { padding: '10px 12px', fontSize: '13px', textAlign: 'right', color: '#666' },
  inactiveText: { color: '#aaa' },
  badge: { fontSize: '11px', padding: '2px 10px', borderRadius: '10px' },
  badgeActive: { backgroundColor: '#e8f5ee', color: '#2e8b57' },
  badgeInactive: { backgroundColor: '#f0f2f5', color: '#888' },
  moveBtn: { border: '1px solid #dee2e6', background: '#fff', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', padding: '2px 6px', margin: '0 2px' },
  formBlock: { padding: '16px', backgroundColor: '#f8f9fb', border: '1px solid #dee2e6', borderRadius: '8px', marginBottom: '16px' },
  emptyText: { fontSize: '13px', color: '#888' },
  footer: { fontSize: '12px', color: '#888', marginTop: '12px' },
  errorText: { color: '#c0392b', fontSize: '14px' },
};

export default CategoryListPage;
