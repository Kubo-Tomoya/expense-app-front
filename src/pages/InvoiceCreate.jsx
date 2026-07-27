import { Link } from 'react-router-dom';
import InvoiceForm from '../components/InvoiceForm';

// S-14 請求書作成・編集画面（作成モード）
function InvoiceCreate() {
  return (
    <div style={styles.page}>
      <div style={styles.breadcrumb}>
        <Link to="/invoices" style={styles.breadcrumbLink}>← 一覧に戻る</Link>
        <span style={styles.breadcrumbSep}>/</span>
        <span>請求書作成</span>
      </div>

      <InvoiceForm mode="create" />
    </div>
  );
}

const styles = {
  page: { padding: '24px' },
  breadcrumb: { fontSize: '13px', color: '#888', marginBottom: '20px' },
  breadcrumbLink: { color: '#1a4fa0', textDecoration: 'none' },
  breadcrumbSep: { margin: '0 8px' },
};

export default InvoiceCreate;
