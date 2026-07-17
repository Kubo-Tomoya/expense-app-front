import { createContext, useContext, useState, useEffect } from 'react';
import { getMe, login as loginApi, logout as logoutApi } from '../api/authApi';

/**
 * アプリ全体で「今ログインしているユーザー」を共有するためのContext。
 * 各画面はuseAuth()経由でログイン状態を参照・操作できる
 */
const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  // アプリ起動直後、/api/auth/me の確認が終わるまでのローディング状態。
  // これが終わるまでは「ログイン済みか未ログインか」自体が判定できないため、
  // ProtectedRoute（feature_F-14で実装）側でこのloadingを見て、
  // 判定確定前に誤ってログイン画面へ飛ばしてしまわないようにする
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getMe()
      .then((res) => setUser(res.data))
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  const login = async (email, password) => {
    const res = await loginApi(email, password);
    setUser(res.data);
    return res.data;
  };

  const logout = async () => {
    await logoutApi();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuthはAuthProviderの内側でのみ使用できます');
  }
  return context;
}