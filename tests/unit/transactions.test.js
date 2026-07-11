import { describe, it, expect } from 'vitest';

function todayStr() {
  const d = new Date();
  return d.getFullYear() + '-' +
    String(d.getMonth() + 1).padStart(2, '0') + '-' +
    String(d.getDate()).padStart(2, '0');
}

describe('Transaction Form Validation', () => {
  it('shows error and does not save when type is missing', () => {
    const { validateTransactionForm, AppState } = window.__ebv;
    const initialCount = AppState.transactions.length;
    const errors = validateTransactionForm({
      type: '', amount: '10', description: 'Test', category: 'Food', date: todayStr()
    });
    const typeError = errors.find(e => e.field === 'type');
    expect(typeError).toBeDefined();
    expect(typeError.message).toBe('This field is required.');
    expect(AppState.transactions.length).toBe(initialCount);
  });

  it('shows error and does not save when amount is missing', () => {
    const { validateTransactionForm, AppState } = window.__ebv;
    const initialCount = AppState.transactions.length;
    const errors = validateTransactionForm({
      type: 'expense', amount: '', description: 'Test', category: 'Food', date: todayStr()
    });
    const amountError = errors.find(e => e.field === 'amount');
    expect(amountError).toBeDefined();
    expect(amountError.message).toBe('This field is required.');
    expect(AppState.transactions.length).toBe(initialCount);
  });

  it('shows error and does not save when description is missing', () => {
    const { validateTransactionForm, AppState } = window.__ebv;
    const initialCount = AppState.transactions.length;
    const errors = validateTransactionForm({
      type: 'expense', amount: '10', description: '', category: 'Food', date: todayStr()
    });
    const descError = errors.find(e => e.field === 'description');
    expect(descError).toBeDefined();
    expect(descError.message).toBe('This field is required.');
    expect(AppState.transactions.length).toBe(initialCount);
  });

  it('shows error and does not save when category is missing', () => {
    const { validateTransactionForm, AppState } = window.__ebv;
    const initialCount = AppState.transactions.length;
    const errors = validateTransactionForm({
      type: 'expense', amount: '10', description: 'Test', category: '', date: todayStr()
    });
    const catError = errors.find(e => e.field === 'category');
    expect(catError).toBeDefined();
    expect(catError.message).toBe('This field is required.');
    expect(AppState.transactions.length).toBe(initialCount);
  });

  it('shows error and does not save when date is missing', () => {
    const { validateTransactionForm, AppState } = window.__ebv;
    const initialCount = AppState.transactions.length;
    const errors = validateTransactionForm({
      type: 'expense', amount: '10', description: 'Test', category: 'Food', date: ''
    });
    const dateError = errors.find(e => e.field === 'date');
    expect(dateError).toBeDefined();
    expect(dateError.message).toBe('This field is required.');
    expect(AppState.transactions.length).toBe(initialCount);
  });

  it('shows error for future date', () => {
    const { validateTransactionForm } = window.__ebv;
    const errors = validateTransactionForm({
      type: 'expense', amount: '10', description: 'Test', category: 'Food', date: '2099-12-31'
    });
    const dateError = errors.find(e => e.field === 'date');
    expect(dateError).toBeDefined();
    expect(dateError.message).toBe('Date cannot be in the future.');
  });

  it('shows error for amount <= 0', () => {
    const { validateTransactionForm } = window.__ebv;
    const errors = validateTransactionForm({
      type: 'expense', amount: '-5', description: 'Test', category: 'Food', date: todayStr()
    });
    const amountError = errors.find(e => e.field === 'amount');
    expect(amountError).toBeDefined();
    expect(amountError.message).toBe('Enter a positive number.');
  });

  it('shows error for description over 100 characters', () => {
    const { validateTransactionForm } = window.__ebv;
    const errors = validateTransactionForm({
      type: 'expense', amount: '10', description: 'a'.repeat(101), category: 'Food', date: todayStr()
    });
    const descError = errors.find(e => e.field === 'description');
    expect(descError).toBeDefined();
    expect(descError.message).toBe('Description must be 100 characters or fewer.');
  });

  it('returns no errors for a fully valid transaction', () => {
    const { validateTransactionForm } = window.__ebv;
    const errors = validateTransactionForm({
      type: 'expense', amount: '10.50', description: 'Lunch', category: 'Food', date: todayStr()
    });
    expect(errors).toHaveLength(0);
  });
});

describe('Adding valid transaction', () => {
  it('adds transaction to AppState.transactions', () => {
    window.__ebv.initApp();
    const { AppState, STORAGE_KEYS } = window.__ebv;

    // Directly push a valid transaction (simulating successful add)
    const tx = {
      id: 'test-1',
      type: 'expense',
      amount: 10.50,
      description: 'Lunch',
      category: 'Food',
      date: todayStr(),
    };
    window.__ebv.saveState(STORAGE_KEYS.transactions, [tx]);
    AppState.transactions.push(tx);
    window.__ebv.renderSummaryPanel();

    expect(AppState.transactions).toHaveLength(1);
    expect(AppState.transactions[0].description).toBe('Lunch');
    const incomeEl = document.getElementById('summary-income');
    expect(incomeEl.textContent).toBe('$0.00');
    const expensesEl = document.getElementById('summary-expenses');
    expect(expensesEl.textContent).toBe('$10.50');
  });
});

describe('Deleting a transaction', () => {
  it('removes transaction from AppState and updates summary', () => {
    window.__ebv.initApp();
    const { AppState, STORAGE_KEYS } = window.__ebv;

    // Seed two transactions
    const tx1 = { id: 'del-1', type: 'expense', amount: 20, description: 'A', category: 'Food', date: todayStr() };
    const tx2 = { id: 'del-2', type: 'income', amount: 50, description: 'B', category: 'Food', date: todayStr() };
    AppState.transactions = [tx1, tx2];
    window.__ebv.saveState(STORAGE_KEYS.transactions, [tx1, tx2]);

    // Delete tx1
    const updated = AppState.transactions.filter(t => t.id !== 'del-1');
    window.__ebv.saveState(STORAGE_KEYS.transactions, updated);
    AppState.transactions = updated;
    window.__ebv.renderSummaryPanel();
    window.__ebv.renderTransactionList();

    expect(AppState.transactions).toHaveLength(1);
    expect(AppState.transactions[0].id).toBe('del-2');

    const expensesEl = document.getElementById('summary-expenses');
    expect(expensesEl.textContent).toBe('$0.00');
    const incomeEl = document.getElementById('summary-income');
    expect(incomeEl.textContent).toBe('$50.00');
  });
});

describe('Empty transaction list', () => {
  it('renders empty-state message when no transactions', () => {
    window.__ebv.initApp();
    const { AppState } = window.__ebv;
    AppState.transactions = [];
    window.__ebv.renderTransactionList();
    const list = document.getElementById('transaction-list');
    const emptyMsg = list.querySelector('.empty-state');
    expect(emptyMsg).not.toBeNull();
    expect(emptyMsg.textContent).toBe('No transactions recorded yet.');
  });
});
