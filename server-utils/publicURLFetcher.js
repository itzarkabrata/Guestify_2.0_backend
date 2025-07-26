export function getPublicIdFromUrl(url) {
  // Remove any query params if they exist
  const cleanUrl = url.split('?')[0];

  // Find the "/upload/" segment
  const parts = cleanUrl.split('/upload/');
  if (parts.length < 2) {
    throw new Error('Invalid Cloudinary URL');
  }

  // The part after /upload/ is: v<version>/<public_id>.<ext>
  const afterUpload = parts[1];

  // Remove version
  const versionAndPublicId = afterUpload.split('/');
  versionAndPublicId.shift(); // remove version

  // Join back the public ID path
  const publicIdWithExt = versionAndPublicId.join('/');

  // Remove file extension
  const dotIndex = publicIdWithExt.lastIndexOf('.');
  const publicId = dotIndex !== -1 ? publicIdWithExt.substring(0, dotIndex) : publicIdWithExt;

  return publicId;
}