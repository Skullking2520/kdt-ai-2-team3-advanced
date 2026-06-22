export interface ImageFileSelection {
  accepted: File[];
  rejected: { file: File; reason: 'type' | 'size' }[];
}

export function selectImageFiles(_files: File[], _maxBytes: number): ImageFileSelection {
  const accepted: File[] = [];
  const rejected: ImageFileSelection['rejected'] = [];

  for (const file of _files) {
    if (!file.type.startsWith('image/')) {
      rejected.push({ file, reason: 'type' });
      continue;
    }
    if (file.size > _maxBytes) {
      rejected.push({ file, reason: 'size' });
      continue;
    }
    accepted.push(file);
  }

  return { accepted, rejected };
}
