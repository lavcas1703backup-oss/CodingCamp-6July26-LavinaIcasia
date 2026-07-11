import { describe, it, expect } from 'vitest';

function todayStr() {
  const d = new Date();
  return d.getFullYear() + '-' +
    String(d.getMonth() + 1).padStart(2, '0') + '-' +
    String(d.getDate()).padStart(2, '0');
}

describe('Budget validation', () => {
  it('rejects negative budget', () => {
    const { validateBudgetInput } = window.__ebv;
    const result = validateBudgetInput('-10');
    expect(result).not.toBeNull();
    expect(typeof result).toBe('string');
  });

  it('rejects zero budget', () => {
    const { validateBudgetInput } = window.__ebv;
    const result = validateBudgetInput('0');
    expect(result).not.toBeNull();
    expect(typeof result).toBe('string');
  });

  it('rejects non-numeric budget', () => {
    const { validateBudgetInput } = window.__ebv;
    const result = validateBudgetInput('abc');
    expect(result).not.toBeNull();
    expect(typeof result).toBe('string');
  });

  it('accepts valid positive budget', () => {
    const { validateBudgetInput } = window.__ebv;
    const result = validateBudgetInput('100');
    expect(result).toBeNull();
  });
});

describe('Spending indicator', () => {
  it('hides spending indicator when budget above current spending', () => {
    window.__ebv.initApp();
    const { AppState, STORAGE_KEYS } = window.__ebv;

    // Set a $100 Food budget
    AppState.budgets['Food'] = 100;
    window.__ebv.saveState(STORAGE_KEYS.budgets, AppState.budgets);

    // Add a $50 Food expense — below budget
    const tx = { id: 'b-1', type: 'expense', amount: 50, description: 'Groceries', category: 'Food', date: todayStr() };
    AppState.transactions = [tx];
    window.__ebv.saveState(STORAGE_KEYS.transactions, [tx]);

    window.__ebv.renderBudgetSection();

    const indicator = document.getElementById('budget-indicator-Food');
    expect(indicator).not.toBeNull();
    // Should NOT show over-budget text since 50 < 100
    expect(indicator.textContent).toBe('');
    expect(indicator.classList.contains('budget-indicator--active')).toBe(false);
  });

  it('shows spending indicator when spending meets budget', () => {
    window.__ebv.initApp();
    const { AppState, STORAGE_KEYS } = window.__ebv;

    // Set a $50 Food budget
    AppState.budgets['Food'] = 50;
    window.__ebv.saveState(STORAGE_KEYS.budgets, AppState.budgets);

    // Add a $50 Food expense — at budget limit (>= triggers indicator)
    const tx = { id: 'b-2', type: 'expense', amount: 50, description: 'Groceries', category: 'Food', date: todayStr() };
    AppState.transactions = [tx];
    window.__ebv.saveState(STORAGE_KEYS.transactions, [tx]);

    window.__ebv.renderBudgetSection();

    const indicator = document.getElementById('budget-indicator-Food');
    expect(indicator).not.toBeNull();
    expect(indicator.classList.contains('budget-indicator--active')).toBe(true);
    expect(indicator.textContent).toContain('Over Budget');
  });
});
