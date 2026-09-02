export const THEME_STORAGE_KEY = 'edm.ui.theme';

export type Theme = 'light' | 'dark';

export interface ThemeStorage {
  getItem(key: string): string | null;
}

export type ThemeMediaQuery = (query: string) => { matches: boolean };

export function isTheme(value: unknown): value is Theme {
  return value === 'light' || value === 'dark';
}

export function resolveTheme(
  storedTheme: unknown,
  prefersLight: boolean | null | undefined
): Theme {
  if (isTheme(storedTheme)) return storedTheme;
  return prefersLight === true ? 'light' : 'dark';
}

export function getInitialTheme(
  storage?: ThemeStorage | null,
  matchMedia?: ThemeMediaQuery | null
): Theme {
  let storedTheme: string | null = null;
  let prefersLight: boolean | undefined;

  try {
    storedTheme = storage?.getItem(THEME_STORAGE_KEY) ?? null;
  } catch {
    // Storage can be unavailable in hardened or private browsing contexts.
  }

  try {
    prefersLight = matchMedia?.('(prefers-color-scheme: light)').matches;
  } catch {
    // Media queries are optional; dark is the safe application fallback.
  }

  return resolveTheme(storedTheme, prefersLight);
}

export const THEME_INITIALIZER_SCRIPT = `(() => {
  const key = '${THEME_STORAGE_KEY}';
  let stored = null;
  let prefersLight;
  try { stored = window.localStorage.getItem(key); } catch {}
  try { prefersLight = window.matchMedia('(prefers-color-scheme: light)').matches; } catch {}
  const theme = stored === 'light' || stored === 'dark'
    ? stored
    : prefersLight === true ? 'light' : 'dark';
  document.documentElement.dataset.theme = theme;
  document.documentElement.style.colorScheme = theme;
})();`;
