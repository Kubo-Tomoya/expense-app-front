import { useEffect } from 'react';

function Toast({ message, type = 'success', onClose }) {
  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(onClose, 3000);
    return () => clearTimeout(timer);
  }, [message, onClose]);

  if (!message) return null;

  return (
    <div style={{ ...styles.toast, ...(type === 'error' ? styles.error : styles.success) }}>
      {message}
    </div>
  );
}

const styles = {
  toast: {
    position: 'fixed', bottom: '24px', right: '24px', padding: '12px 20px',
    borderRadius: '8px', fontSize: '13px', color: '#fff',
    boxShadow: '0 4px 12px rgba(0,0,0,0.15)', zIndex: 1000,
  },
  success: { backgroundColor: '#2e8b57' },
  error: { backgroundColor: '#c0392b' },
};

export default Toast;