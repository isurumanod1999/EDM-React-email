'use client';

import { useTheme } from './ThemeProvider';

export function ThemeToggle({ className = '' }: { className?: string }) {
  const { theme, toggleTheme } = useTheme();
  const nextTheme = theme === 'dark' ? 'light' : 'dark';

  return (
    <button
      type="button"
      className={`theme-toggle ${className}`.trim()}
      onClick={toggleTheme}
      aria-label={`Switch to ${nextTheme} mode`}
      title={`Switch to ${nextTheme} mode`}
    >
      <span aria-hidden>{theme === 'dark' ? '☀' : '☾'}</span>
      <span className="theme-toggle-label">{nextTheme === 'light' ? 'Light' : 'Dark'}</span>
    </button>
  );
}
