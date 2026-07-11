import { describe, it, expect } from 'vitest';

describe('Theme defaults', () => {
  it('defaults to light when no localStorage entry exists', () => {
    // localStorage is cleared in beforeEach
    window.__ebv.initApp();
    expect(window.__ebv.AppState.theme).toBe('light');
    expect(document.documentElement.hasAttribute('data-theme')).toBe(false);
  });
});

describe('Theme toggle', () => {
  it('saves toggled theme to localStorage', () => {
    window.__ebv.initApp();
    const { AppState, STORAGE_KEYS } = window.__ebv;

    expect(AppState.theme).toBe('light');

    window.__ebv.handleThemeToggle();

    expect(AppState.theme).toBe('dark');

    const stored = localStorage.getItem(STORAGE_KEYS.theme);
    expect(stored).toBe('"dark"');
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
  });

  it('toggles back to light', () => {
    window.__ebv.initApp();
    window.__ebv.handleThemeToggle(); // light -> dark
    window.__ebv.handleThemeToggle(); // dark -> light

    expect(window.__ebv.AppState.theme).toBe('light');
    const stored = localStorage.getItem(window.__ebv.STORAGE_KEYS.theme);
    expect(stored).toBe('"light"');
  });
});
