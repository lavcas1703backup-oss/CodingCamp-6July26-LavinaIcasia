import { describe, it, expect } from 'vitest';

describe('Corrupt localStorage data', () => {
  it('shows toast and uses empty state when transactions is corrupt', () => {
    // Inject corrupt data before initApp
    localStorage.setItem('ebv_transactions', 'CORRUPTED_JSON{{{');

    const toasts = [];
    // Spy on document.body.appendChild to capture toast elements
    const originalAppendChild = document.body.appendChild.bind(document.body);
    document.body.appendChild = (node) => {
      if (node && node.className && node.className.includes('toast')) {
        toasts.push(node.textContent);
      }
      return originalAppendChild(node);
    };

    window.__ebv.initApp();

    document.body.appendChild = originalAppendChild;

    const { AppState } = window.__ebv;
    expect(AppState.transactions).toHaveLength(0);
    expect(AppState.budgets).toEqual({});
    expect(AppState.customCategories).toHaveLength(0);
    // Toast was shown
    expect(toasts.length).toBeGreaterThan(0);
    expect(toasts[0]).toContain('Previous data could not be loaded');
  });
});

describe('Clean prior state restore', () => {
  it('restores transactions, budgets, categories, and theme from localStorage', () => {
    const transactions = [
      { id: 'p-1', type: 'expense', amount: 25, description: 'Dinner', category: 'Food', date: '2024-01-15' }
    ];
    const budgets = { Food: 100 };
    const categories = ['Hobbies'];
    const theme = 'dark';

    localStorage.setItem('ebv_transactions', JSON.stringify(transactions));
    localStorage.setItem('ebv_budgets', JSON.stringify(budgets));
    localStorage.setItem('ebv_categories', JSON.stringify(categories));
    localStorage.setItem('ebv_theme', JSON.stringify(theme));

    window.__ebv.initApp();

    const { AppState } = window.__ebv;
    expect(AppState.transactions).toHaveLength(1);
    expect(AppState.transactions[0].description).toBe('Dinner');
    expect(AppState.budgets['Food']).toBe(100);
    expect(AppState.customCategories).toContain('Hobbies');
    expect(AppState.theme).toBe('dark');
  });
});
