import axiosClient from './axiosClient';

// ユーザー新規登録
export const register = (email, password) => {
  return axiosClient.post('/api/auth/register', { email, password });
};

// ログイン（成功時、サーバー側でセッションCookieが発行される）
export const login = (email, password) => {
  return axiosClient.post('/api/auth/login', { email, password });
};

// ログアウト（セッション破棄）
export const logout = () => {
  return axiosClient.post('/api/auth/logout');
};

// ログイン中ユーザー情報の取得（画面初期表示時の認証状態確認用）
export const getMe = () => {
  return axiosClient.get('/api/auth/me');
};