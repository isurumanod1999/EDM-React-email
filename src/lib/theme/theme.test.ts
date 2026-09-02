import { describe, expect, it } from 'vitest';
import { getInitialTheme, resolveTheme, THEME_STORAGE_KEY } from './theme';

describe('theme preference resolution', () => {
  it('uses a valid stored preference before the system preference', () => {
    expect(resolveTheme('light', false)).toBe('light');
    expect(resolveTheme('dark', true)).toBe('dark');
  });

  it('uses the system preference when no theme is stored', () => {
    expect(resolveTheme(null, true)).toBe('light');
    expect(resolveTheme(null, false)).toBe('dark');
  });

  it('ignores invalid stored values', () => {
    expect(resolveTheme('sepia', true)).toBe('light');
    expect(resolveTheme('sepia', false)).toBe('dark');
  });

  it('falls back to dark when preference APIs are unavailable', () => {
    const storage = {
      getItem(key: string) {
        expect(key).toBe(THEME_STORAGE_KEY);
        throw new Error('storage unavailable');
      },
    };
    const matchMedia = () => {
      throw new Error('media unavailable');
    };

    expect(getInitialTheme(storage, matchMedia)).toBe('dark');
    expect(getInitialTheme()).toBe('dark');
  });
});
