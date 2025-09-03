// Theme utility functions

import storage from '../services/storage';

export type Theme = 'light' | 'dark';

export const getStoredTheme = (): Theme => {
  const storedTheme = storage.getItem('theme');
  if (storedTheme === 'dark' || storedTheme === 'light') {
    return storedTheme;
  }

  // Check system preference
  if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    return 'dark';
  }

  return 'light';
};

export const setTheme = (theme: Theme): void => {
  storage.setItem('theme', theme);
  document.documentElement.classList.remove('light', 'dark');
  document.documentElement.classList.add(theme);
};

export const toggleTheme = (): Theme => {
  const currentTheme = getStoredTheme();
  const newTheme = currentTheme === 'light' ? 'dark' : 'light';
  setTheme(newTheme);
  return newTheme;
};

export const applyTheme = (): void => {
  const theme = getStoredTheme();
  setTheme(theme);
};
