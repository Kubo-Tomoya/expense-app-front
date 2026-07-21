import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function Sidebar() {
  const [open, setOpen] = useState(true);
  const { logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  // F-10対応：「新規登録」を削除し「全経費一覧」に置き換え。
  // 経費登録自体はS-01の「＋新規登録」ボタンからの導線のみとする
  const menuItems = [
    { to: '/', end: true, icon: <HomeIcon />, label: 'ダッシュボード' },
    { to: '/expenses', icon: <ListIcon />, label: '経費一覧' },
    { to: '/expenses/all', icon: <AllExpensesIcon />, label: '全経費一覧' },
    { to: '/summary', icon: <ChartIcon />, label: '集計' },
    { to: '/business-profile', icon: <BuildingIcon />, label: '事業者プロフィール' },
  ];

  return (
    <div style={{ ...styles.sidebar, width: open ? '200px' : '64px' }}>
      <div style={styles.header}>
        <button
          onClick={() => setOpen((prev) => !prev)}
          style={styles.hamburgerBtn}
          aria-label={open ? 'メニューを閉じる' : 'メニューを開く'}
        >
          <MenuIcon />
        </button>
        {open && (
          <div style={styles.logo}>
            <span style={styles.logoText}>ExpenseNote</span>
          </div>
        )}
      </div>

      <nav style={styles.nav}>
        {menuItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            style={({ isActive }) => ({
              ...styles.menuItem,
              ...(open ? {} : styles.menuItemCollapsed),
              ...(isActive ? styles.active : {}),
            })}
            title={!open ? item.label : undefined}
          >
            <span style={styles.icon}>{item.icon}</span>
            {open && <span>{item.label}</span>}
          </NavLink>
        ))}
      </nav>

      <button
        onClick={handleLogout}
        style={{ ...styles.logoutBtn, ...(open ? {} : styles.logoutBtnCollapsed) }}
        title={!open ? 'ログアウト' : undefined}
      >
        <LogoutIcon />
        {open && <span>ログアウト</span>}
      </button>
    </div>
  );
}

function MenuIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#555" strokeWidth="2" strokeLinecap="round" style={{ display: 'block' }}>
      <line x1="3" y1="6" x2="21" y2="6" />
      <line x1="3" y1="12" x2="21" y2="12" />
      <line x1="3" y1="18" x2="21" y2="18" />
    </svg>
  );
}
function HomeIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'block' }}>
      <path d="M3 10.5 12 3l9 7.5" />
      <path d="M5 9.5V21h14V9.5" />
    </svg>
  );
}
function ListIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'block' }}>
      <line x1="8" y1="6" x2="21" y2="6" />
      <line x1="8" y1="12" x2="21" y2="12" />
      <line x1="8" y1="18" x2="21" y2="18" />
      <line x1="3" y1="6" x2="3.01" y2="6" />
      <line x1="3" y1="12" x2="3.01" y2="12" />
      <line x1="3" y1="18" x2="3.01" y2="18" />
    </svg>
  );
}
// F-10で新設：全経費一覧メニュー用アイコン（一覧＋虫眼鏡の組み合わせ）
function AllExpensesIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'block' }}>
      <line x1="4" y1="6" x2="14" y2="6" />
      <line x1="4" y1="12" x2="14" y2="12" />
      <line x1="4" y1="18" x2="10" y2="18" />
      <circle cx="18" cy="17" r="3" />
      <line x1="20.5" y1="19.5" x2="22.5" y2="21.5" />
    </svg>
  );
}
function ChartIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'block' }}>
      <line x1="18" y1="20" x2="18" y2="10" />
      <line x1="12" y1="20" x2="12" y2="4" />
      <line x1="6" y1="20" x2="6" y2="14" />
    </svg>
  );
}
function BuildingIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'block' }}>
      <rect x="4" y="3" width="16" height="18" rx="1" />
      <line x1="9" y1="8" x2="9" y2="8" />
      <line x1="15" y1="8" x2="15" y2="8" />
      <line x1="9" y1="12" x2="9" y2="12" />
      <line x1="15" y1="12" x2="15" y2="12" />
      <line x1="9" y1="21" x2="9" y2="16" />
      <line x1="15" y1="21" x2="15" y2="16" />
    </svg>
  );
}
function LogoutIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'block' }}>
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  );
}

const styles = {
  sidebar: {
    minHeight: '100vh',
    backgroundColor: '#fff',
    borderRight: '1px solid #dee2e6',
    display: 'flex',
    flexDirection: 'column',
    padding: '16px 0',
    transition: 'width 0.15s ease',
    flexShrink: 0,
    overflow: 'hidden',
  },
  header: { display: 'flex', alignItems: 'center', gap: '10px', padding: '0 14px', marginBottom: '20px' },
  hamburgerBtn: { border: 'none', background: 'none', cursor: 'pointer', padding: '4px', display: 'flex', flexShrink: 0 },
  logo: { display: 'flex', alignItems: 'center', whiteSpace: 'nowrap' },
  logoText: { fontWeight: '600', fontSize: '15px' },
  nav: { flex: 1, display: 'flex', flexDirection: 'column', gap: '2px' },
  menuItem: { display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 20px', fontSize: '14px', color: '#333', textDecoration: 'none', whiteSpace: 'nowrap' },
  menuItemCollapsed: { padding: '10px 0', justifyContent: 'center' },
  icon: { display: 'flex', flexShrink: 0, color: '#666' },
  active: { backgroundColor: '#f0f6ff', color: '#1a4fa0' },
  logoutBtn: { display: 'flex', alignItems: 'center', gap: '12px', margin: '0 20px', padding: '8px 0', fontSize: '13px', color: '#c0392b', backgroundColor: '#fff', border: 'none', cursor: 'pointer', whiteSpace: 'nowrap' },
  logoutBtnCollapsed: { margin: '0 auto', justifyContent: 'center', width: '18px' },
};

export default Sidebar;