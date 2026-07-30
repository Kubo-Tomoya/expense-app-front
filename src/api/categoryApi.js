import axiosClient from './axiosClient';

// カテゴリ一覧取得。
// is_activeを問わず全件返るため、「有効のみ／無効を含む全件」の絞り込みはフロント側で行う
// （F-16の取引先一覧と同じ方針）
export const getCategories = () => {
  return axiosClient.get('/api/categories');
};

// カテゴリ新規登録（F-28）。表示順はサーバー側で既存の最大値+1を採番する
export const createCategory = (data) => {
  return axiosClient.post('/api/categories', data);
};

// カテゴリ更新（F-28）。カテゴリ名と確定申告の勘定科目のみ。表示順は並び替えAPIで変更する
export const updateCategory = (id, data) => {
  return axiosClient.put(`/api/categories/${id}`, data);
};

// カテゴリの並び替え（F-28）。表示したい順のID配列を送ると、display_orderが1から振り直される
export const updateCategoryOrder = (categoryIds) => {
  return axiosClient.put('/api/categories/order', { categoryIds });
};

// カテゴリの無効化（F-28）。過去の経費から参照され続けるため物理削除は行わない
export const deactivateCategory = (id) => {
  return axiosClient.put(`/api/categories/${id}/deactivate`);
};

// カテゴリの再有効化（F-28）。既に有効な場合もエラーにはならない
export const activateCategory = (id) => {
  return axiosClient.put(`/api/categories/${id}/activate`);
};
