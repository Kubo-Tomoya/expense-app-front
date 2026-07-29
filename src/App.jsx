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
import ProtectedRoute from './components/ProtectedRoute';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/expenses" element={<ProtectedRoute><ExpenseList /></ProtectedRoute>} />
          <Route path="/expenses/create" element={<ProtectedRoute><ExpenseCreate /></ProtectedRoute>} />
          <Route path="/expenses/:id/edit" element={<ProtectedRoute><ExpenseEdit /></ProtectedRoute>} />
          <Route path="/summary" element={<ProtectedRoute><Summary /></ProtectedRoute>} />

          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/password-reset/request" element={<PasswordResetRequestPage />} />
          <Route path="/reset-password" element={<PasswordResetConfirmPage />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;