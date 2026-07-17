import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import ExpenseList from './pages/ExpenseList';
import ExpenseCreate from './pages/ExpenseCreate';
import ExpenseEdit from './pages/ExpenseEdit';
import Summary from './pages/Summary';
import { AuthProvider } from './context/AuthContext';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import PasswordResetRequestPage from './pages/PasswordResetRequestPage';
import PasswordResetConfirmPage from './pages/PasswordResetConfirmPage';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/expenses" element={<ExpenseList />} />
          <Route path="/expenses/create" element={<ExpenseCreate />} />
          <Route path="/expenses/:id/edit" element={<ExpenseEdit />} />
          <Route path="/summary" element={<Summary />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          {/* LoginPageの「パスワードをお忘れですか？」リンク先と一致させる */}
          <Route path="/password-reset/request" element={<PasswordResetRequestPage />} />
          {/* バックエンドがメールに埋め込むURL（frontendUrl + "/reset-password?token=..."）と一致させる */}
          <Route path="/reset-password" element={<PasswordResetConfirmPage />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;