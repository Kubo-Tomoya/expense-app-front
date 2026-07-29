import { Link } from 'react-router-dom';
import ClientForm from '../components/ClientForm';

// S-12 取引先登録・編集画面（登録モード）
function ClientCreate() {
  return (
    <div style={styles.page}>
      <div style={styles.breadcrumb}>
        <Link to="/clients" style={styles.breadcrumbLink}>← 一覧に戻る</Link>
        <span style={styles.breadcrumbSep}>/</span>
        <span>取引先登録</span>
      </div>

      <ClientForm mode="create" />
    </div>
  );
}

const styles = {
  page: { padding: '24px' },
  breadcrumb: { fontSize: '13px', color: '#888', marginBottom: '20px' },
  breadcrumbLink: { color: '#1a4fa0', textDecoration: 'none' },
  breadcrumbSep: { margin: '0 8px' },
};

export default ClientCreate;
