import shared from './qrSharedPhotoIndex.mjs';

/**
 * Consider only explicitly reviewed branch/ID/source tuples. A new source,
 * branch-builder override, or an absent mapping keeps its exact own media.
 */
export function shareQrDishPhoto(product, branch, protectedImage = false) {
  if (String(branch).toUpperCase() === 'BISTRO') branch = 'Bistro';
  if (protectedImage || !Object.hasOwn(shared, branch)) return product;
  const layer = shared[branch];
  if (!Object.hasOwn(layer, product.id)) return product;
  const [expected, image] = layer[product.id];
  return product.image === expected ? { ...product, image } : product;
}
