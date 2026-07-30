// 経費の消費税区分（F-21）。
// 請求書明細（constants/invoice.js）は課税10%／軽減8%／非課税の3区分だが、
// 経費には不課税の支出（給与・租税公課・寄付金など）が実際に発生するため4区分を持つ。
// 値はバックエンドの expenses.tax_category と一致させる
export const TAX_CATEGORIES = [
  { value: 'taxable_10', label: '課税10%', rate: 10, taxable: true },
  { value: 'taxable_8', label: '軽減8%', rate: 8, taxable: true },
  { value: 'tax_exempt', label: '非課税', rate: 0, taxable: false },
  { value: 'non_taxable', label: '不課税', rate: 0, taxable: false },
];

export const DEFAULT_TAX_CATEGORY = 'taxable_10';

export const taxCategoryLabel = (value) =>
  TAX_CATEGORIES.find((c) => c.value === value)?.label ?? '—';

/**
 * 課税区分（10%・軽減8%）かどうか。
 * 適格請求書の入力欄を表示するかの判定に使う（非課税・不課税は消費税の控除対象ではない）
 */
export const isTaxableCategory = (value) =>
  TAX_CATEGORIES.find((c) => c.value === value)?.taxable ?? false;

/**
 * 税込金額と区分から消費税額を算出する（1円未満切り捨て）。
 * サーバー側のTaxCalculatorと同じ式だが、こちらは入力中の補助表示にのみ使い、
 * 保存はしない（税抜額・消費税額はDBに持たない方針のため）
 */
export const calculateTax = (amountIncludingTax, taxCategory) => {
  const rate = TAX_CATEGORIES.find((c) => c.value === taxCategory)?.rate ?? 0;
  if (!rate || !amountIncludingTax) return 0;
  return Math.floor((amountIncludingTax * rate) / (100 + rate));
};

/** 税込金額と区分から税抜金額を算出する（税抜＋消費税が必ず税込に一致する） */
export const calculateExcludingTax = (amountIncludingTax, taxCategory) =>
  (Number(amountIncludingTax) || 0) - calculateTax(amountIncludingTax, taxCategory);

// インボイス登録番号の形式（T＋数字13桁）。F-15の事業者プロフィールと同じルール
export const REGISTRATION_NUMBER_PATTERN = /^T\d{13}$/;
