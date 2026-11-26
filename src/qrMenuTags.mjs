export const tagLabels = {
  new: 'New', chef: 'Chef’s Choice', bestseller: 'Bestseller', sale: 'Sale'
};
const codes = Object.keys(tagLabels);
export const tagCodes = (value) => codes.filter(code => Array.isArray(value) && value.includes(code));
export const isNewProduct = (product) => [product.category, ...Object.values(product.categoryNames || {})]
  .some(name => /^(?:new|новое|новинки|новинка|yeni|yeniliklər)$/iu.test(String(name || '').trim()));
export const tagsForProduct = (product, configured) => tagCodes([
  ...(isNewProduct(product) ? ['new'] : []), ...tagCodes(configured)
]);
