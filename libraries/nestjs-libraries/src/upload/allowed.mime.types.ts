export const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/avif',
  'image/bmp',
  'image/tiff',
  'video/mp4',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/plain',
] as const;

export const ALLOWED_MIME_TYPES_SET = new Set<string>(ALLOWED_MIME_TYPES);

export const ALLOWED_MIME_TYPES_ACCEPT = ALLOWED_MIME_TYPES.join(',');

export const ALLOWED_IMAGE_MIME_TYPES = ALLOWED_MIME_TYPES.filter((type) =>
  type.startsWith('image/')
);

export const ALLOWED_IMAGE_MIME_TYPES_ACCEPT = ALLOWED_IMAGE_MIME_TYPES.join(',');

export function getMaxUploadSize(mimeType: string): number {
  if (mimeType.startsWith('image/')) {
    return 10 * 1024 * 1024; // 10 MB
  }
  if (mimeType.startsWith('video/')) {
    return 1024 * 1024 * 1024; // 1 GB
  }
  if (ALLOWED_MIME_TYPES_SET.has(mimeType)) {
    return 25 * 1024 * 1024; // 25 MB for documents
  }
  throw new Error('Unsupported file type.');
}
