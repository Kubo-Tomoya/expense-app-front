import axiosClient from './axiosClient';

// カテゴリ一覧取得
export const getCategories = () => {
  return axiosClient.get('/api/categories');
};