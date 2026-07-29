// F-17（請求書作成）で使用する定数。
// バックエンドのInvoiceItem・Invoiceの定数と対応させている

// 税率区分。表示順は税率の高い順（適格請求書の内訳表示に合わせる）
export const TAX_CATEGORIES = [
  { value: 'taxable_10', label: '課税10%', rate: 10 },
  { value: 'taxable_8', label: '軽減8%', rate: 8 },
  { value: 'tax_exempt', label: '非課税', rate: 0 },
];

export const TAX_CATEGORY_LABELS = TAX_CATEGORIES.reduce((acc, category) => {
  acc[category.value] = category.label;
  return acc;
}, {});

export const TAX_RATES = TAX_CATEGORIES.reduce((acc, category) => {
  acc[category.value] = category.rate;
  return acc;
}, {});

// ステータス。バッジの配色もここで一元管理する
export const INVOICE_STATUS_LABELS = {
  draft: '下書き',
  issued: '発行済み',
  canceled: '取消',
};

export const INVOICE_STATUS_BADGE = {
  draft: { bg: '#f0f2f5', color: '#888' },
  issued: { bg: '#e8f0fe', color: '#1a4fa0' },
  canceled: { bg: '#fdecea', color: '#c0392b' },
};

/**
 * 発行日の翌月末を返す（支払期日の既定値。S-14の仕様）。
 * サーバー側のInvoiceService#defaultDueDateと同じ計算をフロントでも行い、
 * 入力時点で既定値が見える状態にしている
 */
export function defaultDueDate(issueDate) {
  if (!issueDate) return '';
  const base = new Date(issueDate);
  // 翌々月の0日＝翌月末日
  const lastDay = new Date(base.getFullYear(), base.getMonth() + 2, 0);
  const y = lastDay.getFullYear();
  const m = String(lastDay.getMonth() + 1).padStart(2, '0');
  const d = String(lastDay.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * 明細から税率区分ごとの内訳・合計を算出する。
 *
 * 端数処理はサーバー側（InvoiceService#calculate）と同じルールに揃える：
 * ・明細金額 = 数量 × 税抜単価（1円未満切り捨て）
 * ・消費税は税率区分ごとに合計してから1回だけ計算し、1円未満を切り捨て
 *
 * ここでの計算は入力中のリアルタイム表示（入力補助）のためのもので、
 * 保存される値は必ずサーバーの計算結果を正とする
 */
export function calculateInvoice(items) {
  const subtotalByCategory = {};

  const itemAmounts = items.map((item) => {
    const quantity = Number(item.quantity) || 0;
    const unitPrice = Number(item.unitPrice) || 0;
    const amount = Math.floor(quantity * unitPrice);
    subtotalByCategory[item.taxCategory] = (subtotalByCategory[item.taxCategory] ?? 0) + amount;
    return amount;
  });

  const taxSummaries = TAX_CATEGORIES
    .filter((category) => (subtotalByCategory[category.value] ?? 0) !== 0)
    .map((category) => {
      const subtotalAmount = subtotalByCategory[category.value];
      return {
        taxCategory: category.value,
        label: category.label,
        rate: category.rate,
        subtotalAmount,
        taxAmount: Math.floor((subtotalAmount * category.rate) / 100),
      };
    });

  const subtotalAmount = taxSummaries.reduce((sum, s) => sum + s.subtotalAmount, 0);
  const taxAmount = taxSummaries.reduce((sum, s) => sum + s.taxAmount, 0);

  return {
    itemAmounts,
    taxSummaries,
    subtotalAmount,
    taxAmount,
    totalAmount: subtotalAmount + taxAmount,
  };
}
