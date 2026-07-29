import axiosClient from './axiosClient';

// 事業者プロフィール取得（未設定でも200・全項目null）
export const getBusinessProfile = () => {
  return axiosClient.get('/api/business-profile');
};

// 事業者プロフィール登録・更新（Upsert）
export const saveBusinessProfile = (data) => {
  return axiosClient.put('/api/business-profile', data);
};