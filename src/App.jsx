import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import ExpenseList from './pages/ExpenseList';
import ExpenseCreate from './pages/ExpenseCreate';
import ExpenseEdit from './pages/ExpenseEdit';
import Summary from './pages/Summary';
import AllExpensesPage from './pages/AllExpensesPage';
import BusinessProfilePage from './pages/BusinessProfilePage';
import ClientListPage from './pages/ClientListPage';
import ClientCreate from './pages/ClientCreate';
import ClientEdit from './pages/ClientEdit';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import PasswordResetRequestPage from './pages/PasswordResetRequestPage';
import PasswordResetConfirmPage from './pages/PasswordResetConfirmPage';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/expenses" element={<ProtectedRoute><ExpenseList /></ProtectedRoute>} />
          <Route path="/expenses/all" element={<ProtectedRoute><AllExpensesPage /></ProtectedRoute>} />
          <Route path="/expenses/create" element={<ProtectedRoute><ExpenseCreate /></ProtectedRoute>} />
          <Route path="/expenses/:id/edit" element={<ProtectedRoute><ExpenseEdit /></ProtectedRoute>} />
          <Route path="/summary" element={<ProtectedRoute><Summary /></ProtectedRoute>} />
          <Route path="/business-profile" element={<ProtectedRoute><BusinessProfilePage /></ProtectedRoute>} />

          {/* F-16 取引先管理（S-11・S-12） */}
          <Route path="/clients" element={<ProtectedRoute><ClientListPage /></ProtectedRoute>} />
          <Route path="/clients/create" element={<ProtectedRoute><ClientCreate /></ProtectedRoute>} />
          <Route path="/clients/:id/edit" element={<ProtectedRoute><ClientEdit /></ProtectedRoute>} />

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