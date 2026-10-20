// Presentation-only reconciliation. Never alters purchases or expense records.
const MARKER = 'RMS_REPORT_CLASSIFICATION_V1:';
const text = value => typeof value === 'string' ? value.trim() : '';
const workbook = value => text(value).replace(/\.xlsx$/i, '').normalize('NFC');
const positiveAmount = value => (typeof value === 'number' || (typeof value === 'string' && value.trim() !== '')) && Number.isFinite(Number(value)) && Number(value) > 0 ? Number(value) : null;
const verifiedTimestamp = value => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(value) && Number.isFinite(Date.parse(value));
const validDate = value => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value;

function sourceCell(value) {
  try {
    const url = new URL(value);
    const path = url.pathname.match(/^\/spreadsheets\/d\/([\w-]+)\/edit\/?$/);
    if (url.protocol !== 'https:' || url.hostname !== 'docs.google.com' || url.port || url.username || url.password || !path) return null;
    const params = new URLSearchParams(url.hash.slice(1));
    const range = params.get('range');
    const cell = range && range.match(/^\$?([A-Z]+)\$?([1-9]\d*)$/);
    if (!cell || !/^\d+$/.test(params.get('gid') || '') || params.getAll('range').length !== 1 || params.getAll('gid').length !== 1) return null;
    let column = 0;
    for (const character of cell[1]) column = column * 26 + character.charCodeAt(0) - 64;
    return { book: path[1], gid: params.get('gid'), row: Number(cell[2]), column };
  } catch { return null; }
}

function purchaseProof(purchase) {
  if (!purchase || purchase.deleted_at || !text(purchase.id) || !text(purchase.branch_id) || !validDate(purchase.purchase_date)) return null;
  const comment = text(purchase.comment);
  if (comment.split(MARKER).length !== 2) return null;
  let proof;
  try { proof = JSON.parse(comment.split(MARKER)[1].split('\n')[0].trim()); } catch { return null; }
  const amount = positiveAmount(purchase.total_amount);
  if (!proof || proof.version !== 1 || proof.category !== 'household' || !verifiedTimestamp(proof.verifiedAt) || proof.purchaseId !== purchase.id || proof.date !== purchase.purchase_date || amount === null || positiveAmount(proof.amount) !== amount) return null;
  const classification = sourceCell(proof.classificationSource);
  const receipt = sourceCell(proof.receiptSource);
  if (!classification || !receipt || classification.book !== receipt.book) return null;
  const imported = comment.match(/^v\d+_\d+ Excel import: (.+?\.xlsx) \/ (.+?) row ([1-9]\d*) col ([1-9]\d*) \/ source=Приход(?: \/|\n|$)/);
  if (!imported || Number(imported[3]) !== receipt.row || Number(imported[4]) !== receipt.column) return null;
  return { amount, workbook: workbook(imported[1]), row: classification.row };
}

function matchesExpense(purchase, proof, expense) {
  if (!expense || expense.deleted_at || !text(expense.id) || expense.branch_id !== purchase.branch_id || expense.expense_date !== purchase.purchase_date || positiveAmount(expense.amount) !== proof.amount) return false;
  // No fuzzy category matching and no category inferred from the amount or supplier.
  const category = text(expense.expense_categories?.name) || text(expense.category_name) || text(expense.custom_category);
  if (!['хозтовары', 'household'].includes(category.toLowerCase())) return false;
  const imported = text(expense.comment).match(/^Excel historical import (.+?) · ([^·]+) · row ([1-9]\d*)$/);
  return !!imported && workbook(imported[1]) === proof.workbook && Number(imported[3]) === proof.row;
}

/** Keep unproven/ambiguous rows. Exclude only unique, provenance-backed household mirrors. */
export function rmsProfitPurchaseRows(purchases, expenseRows) {
  const rows = Array.isArray(purchases) ? purchases : [];
  const expenses = Array.isArray(expenseRows) ? expenseRows : [];
  const candidates = rows.map(purchase => {
    const proof = purchaseProof(purchase);
    return proof ? expenses.map((expense, index) => matchesExpense(purchase, proof, expense) ? index : -1).filter(index => index >= 0) : [];
  });
  // A single counterpart cannot erase two purchases, even duplicate imported records.
  const claims = new Map();
  for (const matches of candidates) for (const index of matches) claims.set(index, (claims.get(index) || 0) + 1);
  const purchaseIds = new Map();
  const expenseIds = new Map();
  for (const row of rows) if (row?.id) purchaseIds.set(row.id, (purchaseIds.get(row.id) || 0) + 1);
  for (const row of expenses) if (row?.id) expenseIds.set(row.id, (expenseIds.get(row.id) || 0) + 1);
  return rows.filter((purchase, index) => {
    const matches = candidates[index];
    return !(matches.length === 1 && claims.get(matches[0]) === 1 && purchaseIds.get(purchase.id) === 1 && expenseIds.get(expenses[matches[0]].id) === 1);
  });
}
