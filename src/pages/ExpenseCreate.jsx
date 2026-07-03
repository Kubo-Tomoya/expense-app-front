import { useState } from 'react';
import { Link } from 'react-router-dom';
import ExpenseForm from '../components/ExpenseForm';
import Toast from '../components/Toast';

function ExpenseCreate() {
  const [toast, setToast] = useState(null);

  return (
    <div style={styles.page}>
      <div style={styles.breadcrumb}>
        <Link to="/expenses" style={styles.breadcrumbLink}>← 一覧に戻る</Link>
        <span style={styles.breadcrumbSep}>/</span>
        <span>経費登録</span>
      </div>

      <ExpenseForm mode="create" onSuccess={(msg) => setToast({ message: msg, type: 'success' })} />

      <Toast message={toast?.message} type={toast?.type} onClose={() => setToast(null)} />
    </div>
  );
}

const styles = {
  page: { padding: '24px' },
  breadcrumb: { fontSize: '13px', color: '#888', marginBottom: '20px' },
  breadcrumbLink: { color: '#1a4fa0', textDecoration: 'none' },
  breadcrumbSep: { margin: '0 8px' },
};

export default ExpenseCreate;