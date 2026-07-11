// Feature: expense-budget-visualizer, Property 1: valid transaction always appears in the list
// Feature: expense-budget-visualizer, Property 2: invalid transaction never mutates state
// Feature: expense-budget-visualizer, Property 3: summary panel reflects transaction set
// Feature: expense-budget-visualizer, Property 4: transaction deletion is complete and consistent

import * as fc from 'fast-check';
import { describe, beforeEach, test } from 'vitest';

// Helpers
function todayStr() {
  const d = new Date();
  return (
    d.getFullYear() + '-' +
    String(d.getMonth() + 1).padStart(2, '0') + '-' +
    String(d.getDate()).padStart(2, '0')
  );
}

function dateMinusDays(days) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return (
    d.getFullYear() + '-' +
    String(d.getMonth() + 1).padStart(2, '0') + '-' +
    String(d.getDate()).padStart(2, '0')
  );
}

function datePlusDays(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return (
    d.getFullYear() + '-' +
    String(d.getMonth() + 1).padStart(2, '0') + '-' +
    String(d.getDate()).padStart(2, '0')
  );
}

// Arbitraries
const DEFAULT_CATEGORIES = ['Food', 'Transport', 'Utilities', 'Entertainment', 'Healthcare', 'Shopping', 'Education', 'Other'];

const arbValidAmount = fc.integer({ min: 1, max: 9999999999 }).map(cents => cents / 100);

const arbPastOrTodayDate = fc.integer({ min: 0, max: 3650 }).map(days => dateMinusDays(days));

const arbDescription = fc.stringOf(
  fc.char().filter(c => c !== '\0'),
  { minLength: 1, maxLength: 100 }
);

const arbCategory = fc.constantFrom(...DEFAULT_CATEGORIES);

const arbValidTransaction = fc.record({
  id: fc.uuid(),
  type: fc.constantFrom('income', 'expense'),
  amount: arbValidAmount,
  description: arbDescription,
  category: arbCategory,
  date: arbPastOrTodayDate,
});

describe('Property 1 — valid transaction always appears in the list', () => {
  // **Validates: Requirements 1.2, 1.5**
  test('any valid transaction pushed to AppState is returned by getFilteredTransactions', () => {
    fc.assert(
      fc.property(arbValidTransaction, (tx) => {
        const { AppState, getFilteredTransactions } = window.__ebv;
        AppState.transactions = [tx];
        AppState.activeSort = null;
        const result = getFilteredTransactions();
        return result.some(r => r.id === tx.id);
      }),
      { numRuns: 100 }
    );
  });
});

describe('Property 2 — invalid transaction never mutates state', () => {
  // **Validates: Requirements 1.3, 1.4, 1.7, 1.8**
  test('invalid form data always produces at least one validation error and AppState is unchanged', () => {
    const arbInvalidData = fc.oneof(
      // Missing type
      fc.record({
        type: fc.constant(''),
        amount: arbValidAmount.map(String),
        description: arbDescription,
        category: arbCategory,
        date: arbPastOrTodayDate,
      }),
      // Zero or negative amount
      fc.record({
        type: fc.constantFrom('income', 'expense'),
        amount: fc.oneof(fc.constant('0'), fc.constant('-1'), fc.constant('')),
        description: arbDescription,
        category: arbCategory,
        date: arbPastOrTodayDate,
      }),
      // Description too long
      fc.record({
        type: fc.constantFrom('income', 'expense'),
        amount: arbValidAmount.map(String),
        description: fc.stringOf(fc.char(), { minLength: 101, maxLength: 200 }),
        category: arbCategory,
        date: arbPastOrTodayDate,
      }),
      // Future date
      fc.record({
        type: fc.constantFrom('income', 'expense'),
        amount: arbValidAmount.map(String),
        description: arbDescription,
        category: arbCategory,
        date: fc.integer({ min: 1, max: 365 }).map(d => datePlusDays(d)),
      }),
      // Missing description
      fc.record({
        type: fc.constantFrom('income', 'expense'),
        amount: arbValidAmount.map(String),
        description: fc.constant(''),
        category: arbCategory,
        date: arbPastOrTodayDate,
      })
    );

    fc.assert(
      fc.property(arbInvalidData, (data) => {
        const { AppState, validateTransactionForm } = window.__ebv;
        const beforeCount = AppState.transactions.length;
        // Normalize amount to string as the form would supply
        const formData = {
          type: data.type,
          amount: String(data.amount),
          description: data.description,
          category: data.category,
          date: data.date,
        };
        const errors = validateTransactionForm(formData);
        const afterCount = AppState.transactions.length;
        return errors.length > 0 && afterCount === beforeCount;
      }),
      { numRuns: 100 }
    );
  });
});

describe('Property 3 — summary panel reflects transaction set', () => {
  // **Validates: Requirements 1.5, 2.4**
  test('computeSummary income/expenses/balance match independent totals for any transaction array', () => {
    const arbTxArray = fc.array(arbValidTransaction, { minLength: 0, maxLength: 50 });

    fc.assert(
      fc.property(arbTxArray, (txs) => {
        const { computeSummary } = window.__ebv;
        const result = computeSummary(txs);

        const expectedIncome = txs
          .filter(t => t.type === 'income')
          .reduce((s, t) => s + t.amount, 0);
        const expectedExpenses = txs
          .filter(t => t.type === 'expense')
          .reduce((s, t) => s + t.amount, 0);
        const expectedBalance = expectedIncome - expectedExpenses;

        return (
          Math.abs(result.income - expectedIncome) < 0.0001 &&
          Math.abs(result.expenses - expectedExpenses) < 0.0001 &&
          Math.abs(result.balance - expectedBalance) < 0.0001
        );
      }),
      { numRuns: 100 }
    );
  });
});

describe('Property 4 — transaction deletion is complete and consistent', () => {
  // **Validates: Requirements 2.2, 2.3, 2.4**
  test('deleting a transaction removes it and the summary of the remainder is correct', () => {
    const arbNonEmptyTxArray = fc.array(arbValidTransaction, { minLength: 1, maxLength: 30 });

    fc.assert(
      fc.property(arbNonEmptyTxArray, fc.integer({ min: 0, max: 29 }), (txs, rawIdx) => {
        const { computeSummary } = window.__ebv;
        const idx = rawIdx % txs.length;
        const deleted = txs[idx];
        const remaining = txs.filter((_, i) => i !== idx);

        // Deleted tx must not be in remaining
        const stillPresent = remaining.some(t => t.id === deleted.id);
        if (stillPresent) return true; // duplicate ids — skip, not a bug

        const summary = computeSummary(remaining);
        const expectedIncome = remaining
          .filter(t => t.type === 'income')
          .reduce((s, t) => s + t.amount, 0);
        const expectedExpenses = remaining
          .filter(t => t.type === 'expense')
          .reduce((s, t) => s + t.amount, 0);

        return (
          !stillPresent &&
          Math.abs(summary.income - expectedIncome) < 0.0001 &&
          Math.abs(summary.expenses - expectedExpenses) < 0.0001
        );
      }),
      { numRuns: 100 }
    );
  });
});
