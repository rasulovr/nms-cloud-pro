import archive from './qrArchivedImageIndex.mjs';

const publicArchive='https://meqttgiksyuyffuoghwx.supabase.co/storage/v1/object/public/menu-images/qr-archive/v1/';
const cloposImage=/^https:\/\/cdn-2\.clopos\.com\/(baristachef[12]?)\/([a-f0-9-]{36})\/(?:card32(?:@[123]x)?\.(?:jpg|jpeg|webp|png))(?:[?#].*)?$/i;

// Only resources whose copies were checksum-verified are switched. The public
// URL is immutable and all size aliases for the same source use its best copy.
export function resolveQrArchiveImage(image){
  if(typeof image!=='string')return image;
  const match=cloposImage.exec(image);
  const object=match&&archive[(match[1]+'/'+match[2]).toLowerCase()];
  return object?publicArchive+object:image;
}
