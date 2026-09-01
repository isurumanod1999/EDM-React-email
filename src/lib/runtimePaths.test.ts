import { describe, expect, it } from 'vitest';
import { isSafeUploadFilename, resolveUploadFilePath } from './runtimePaths';

describe('runtimePaths', () => {
  it('rejects path traversal in upload filenames', () => {
    expect(isSafeUploadFilename('../secret.png')).toBe(false);
    expect(isSafeUploadFilename('figma-desk-abc.png')).toBe(true);
  });

  it('resolves local upload URLs under public/', () => {
    expect(resolveUploadFilePath('/images/uploads/x.png').replace(/\\/g, '/')).toMatch(
      /public\/images\/uploads\/x\.png$/
    );
  });
});
