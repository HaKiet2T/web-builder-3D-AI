'use client';

import { createContext, useCallback, useContext, useSyncExternalStore } from 'react';
import type { ReactNode } from 'react';
import { THEME_STORAGE_KEY } from '@/lib/theme';
import type { Theme } from '@/lib/theme';

export type { Theme };

interface ThemeContextValue {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);
const listeners = new Set<() => void>();

function readTheme(): Theme {
  if (typeof document === 'undefined') return 'light';
  return document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light';
}

function subscribe(listener: () => void) {
  listeners.add(listener);

  const onStorage = (event: StorageEvent) => {
    if (event.key !== THEME_STORAGE_KEY) return;
    const next = event.newValue === 'dark' ? 'dark' : 'light';
    document.documentElement.dataset.theme = next;
    listeners.forEach((notify) => notify());
  };

  window.addEventListener('storage', onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener('storage', onStorage);
  };
}

function applyTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme;
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // The theme still applies for the current session when storage is blocked.
  }
  listeners.forEach((notify) => notify());
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const theme = useSyncExternalStore(subscribe, readTheme, () => 'light' as Theme);

  const setTheme = useCallback((next: Theme) => applyTheme(next), []);
  const toggleTheme = useCallback(() => applyTheme(readTheme() === 'dark' ? 'light' : 'dark'), []);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme }}>{children}</ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used inside ThemeProvider');
  return context;
}
