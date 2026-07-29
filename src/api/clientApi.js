import axiosClient from './axiosClient';

// 取引先一覧取得（ログイン中ユーザーの取引先のみ。無効な取引先も含めて返る想定で、
// キーワード検索・有効/無効の絞り込みはフロント側で行う）
export const getClients = () => {
  return axiosClient.get('/api/clients');
};

// 取引先1件取得（詳細ドロワー・編集モードの初期値セット用）
export const getClientById = (id) => {
  return axiosClient.get(`/api/clients/${id}`);
};

// 取引先新規登録
export const createClient = (data) => {
  return axiosClient.post('/api/clients', data);
};

// 取引先更新
export const updateClient = (id, data) => {
  return axiosClient.put(`/api/clients/${id}`, data);
};

// 取引先の無効化（is_active=false）。
// 過去の請求書との整合性を保つため、物理削除ではなく論理的な無効化とする
export const deactivateClient = (id) => {
  return axiosClient.put(`/api/clients/${id}/deactivate`);
};

// 取引先の再有効化（is_active=true）。誤って無効化した場合の復帰手段。
// 既に有効な取引先に対して呼んでもエラーにはならない
export const activateClient = (id) => {
  return axiosClient.put(`/api/clients/${id}/activate`);
};
