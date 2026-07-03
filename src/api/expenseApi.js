import axiosClient from './axiosClient';

// 経費一覧取得（月指定可）
export const getExpenses = (month) => {
  return axiosClient.get('/api/expenses', {
    params: { month },
  });
};

// 経費1件取得
export const getExpenseById = (id) => {
  return axiosClient.get(`/api/expenses/${id}`);
};

// 経費新規登録
export const createExpense = (data) => {
  return axiosClient.post('/api/expenses', data);
};

// 経費更新
export const updateExpense = (id, data) => {
  return axiosClient.put(`/api/expenses/${id}`, data);
};

// 経費削除
export const deleteExpense = (id) => {
  return axiosClient.delete(`/api/expenses/${id}`);
};

// 領収書アップロード
export const uploadReceipt = (id, file) => {
  const formData = new FormData();
  formData.append('file', file);
  return axiosClient.post(`/api/expenses/${id}/receipt`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
};

// 月次集計取得
export const getSummary = (year, month) => {
  return axiosClient.get('/api/expenses/summary', {
    params: { year, month },
  });
};