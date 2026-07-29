import axiosClient from './axiosClient';

// 請求書一覧取得（明細は含まれない。年・ステータス・キーワードはフロント側でフィルタする）
export const getInvoices = () => {
  return axiosClient.get('/api/invoices');
};

// 請求書1件取得（明細・税率別内訳を含む）
export const getInvoiceById = (id) => {
  return axiosClient.get(`/api/invoices/${id}`);
};

// 請求書の新規作成（常に下書きとして作成され、請求書番号は未採番）
export const createInvoice = (data) => {
  return axiosClient.post('/api/invoices', data);
};

// 請求書の更新（下書きのみ。明細は全行差し替え）
export const updateInvoice = (id, data) => {
  return axiosClient.put(`/api/invoices/${id}`, data);
};

// 発行。サーバー側で請求書番号の採番と、取引先・発行者情報のスナップショット確定が行われる
export const issueInvoice = (id) => {
  return axiosClient.put(`/api/invoices/${id}/issue`);
};

// 取消（発行済みのみ）。請求書番号は欠番にせずレコードは残る
export const cancelInvoice = (id, reason) => {
  return axiosClient.put(`/api/invoices/${id}/cancel`, { reason });
};

// 下書きの削除（発行済み・取消済みは削除できない）
export const deleteInvoice = (id) => {
  return axiosClient.delete(`/api/invoices/${id}`);
};

// 入金状況の更新（F-19）。発行済みのみ。
// 入金済みにする場合は paidAt（入金日）が必須、解除する場合は不要
export const updatePaymentStatus = (id, paymentStatus, paidAt) => {
  return axiosClient.put(`/api/invoices/${id}/payment-status`, { paymentStatus, paidAt });
};

// 請求書PDFの取得（F-18）。発行済み・取消済みのみ。下書きは400が返る。
// blobとして受け取るのは、認証（セッションCookie）とエラーハンドリングを
// 既存のaxios経路に揃えたいため（URLを直接開く方式にしない）
export const getInvoicePdf = (id) => {
  return axiosClient.get(`/api/invoices/${id}/pdf`, { responseType: 'blob' });
};
