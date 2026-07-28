export const hasExtension = (
  path: string | undefined | null,
  extension: string
): boolean => {
  if (!path) {
    return false;
  }
  const ext = extension.startsWith('.') ? extension : `.${extension}`;
  return path.toLowerCase().indexOf(ext.toLowerCase()) > -1;
};

const IMAGE_EXTENSIONS = [
  'jpg',
  'jpeg',
  'png',
  'gif',
  'webp',
  'avif',
  'bmp',
  'tiff',
];

export const isImagePath = (path: string | undefined | null): boolean => {
  return IMAGE_EXTENSIONS.some((ext) => hasExtension(path, ext));
};

export const isVideoPath = (path: string | undefined | null): boolean => {
  return hasExtension(path, 'mp4');
};
