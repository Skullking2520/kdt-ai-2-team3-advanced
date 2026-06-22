import { describe, expect, it } from 'vitest';
import { selectImageFiles } from './imageFiles';

function file(name: string, type: string, size: number): File {
  return new File([new Uint8Array(size)], name, { type });
}

describe('selectImageFiles', () => {
  it('keeps multiple image files and rejects non-images or oversized images', () => {
    const smallPng = file('one.png', 'image/png', 1024);
    const smallJpeg = file('two.jpg', 'image/jpeg', 2048);
    const text = file('note.txt', 'text/plain', 10);
    const largePng = file('large.png', 'image/png', 11 * 1024 * 1024);

    const result = selectImageFiles([smallPng, text, smallJpeg, largePng], 10 * 1024 * 1024);

    expect(result.accepted).toEqual([smallPng, smallJpeg]);
    expect(result.rejected).toEqual([
      { file: text, reason: 'type' },
      { file: largePng, reason: 'size' },
    ]);
  });
});
