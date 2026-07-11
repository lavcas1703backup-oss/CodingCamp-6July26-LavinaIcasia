import { describe, it, expect } from 'vitest';

describe('Custom category cap', () => {
  it('rejects 21st custom category with cap error', () => {
    window.__ebv.initApp();
    const { AppState } = window.__ebv;

    // Fill to 20 custom categories
    AppState.customCategories = Array.from({ length: 20 }, (_, i) => `Cat${i + 1}`);

    // Simulate cap check (same logic as handleAddCategory)
    const errorSpan = document.createElement('span');
    const inputEl = document.createElement('input');
    window.__ebv.handleAddCategory('NewCat', inputEl, errorSpan);

    expect(errorSpan.textContent).toBe('Maximum of 20 custom categories reached.');
    expect(AppState.customCategories).toHaveLength(20);
  });
});

describe('Valid custom category', () => {
  it('appears in getAllCategories after being added', () => {
    window.__ebv.initApp();
    const { AppState } = window.__ebv;

    const errorSpan = document.createElement('span');
    const inputEl = document.createElement('input');
    inputEl.value = 'Hobbies';

    window.__ebv.handleAddCategory('Hobbies', inputEl, errorSpan);

    expect(errorSpan.textContent).toBe('');
    expect(AppState.customCategories).toContain('Hobbies');

    const allCats = window.__ebv.getAllCategories();
    expect(allCats).toContain('Hobbies');
  });

  it('duplicate category (different case) is rejected', () => {
    window.__ebv.initApp();
    const { AppState } = window.__ebv;

    // 'Food' is already a default category
    const errorSpan = document.createElement('span');
    const inputEl = document.createElement('input');
    window.__ebv.handleAddCategory('food', inputEl, errorSpan);

    expect(errorSpan.textContent).toBe('A category with this name already exists.');
    expect(AppState.customCategories).not.toContain('food');
  });
});
