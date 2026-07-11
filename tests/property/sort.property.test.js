// Feature: expense-budget-visualizer, Property 10: sort order invariant

import * as fc from 'fast-check';
import { describe, test } from 'vitest';

const DEFAULT_CATEGORIES = ['Food', 'Transport', 'Utilities', 'Entertainment', 'Healthcare', 'Shopping', 'Education', 'Other'];

function isNonDecreasing(arr, key) {
  for (let i = 0; i < arr.length - 1; i++) {
    if (arr[i][key] > arr[i + 1][key]) return false;
  }
  return true;
}

function isNonIncreasing(arr, key) {
  for (let i = 0; i < arr.length - 1; i++) {
    if (arr[i][key] < arr[i + 1][key]) return false;
  }
  return true;
}

function isCategoryAZ(arr) {
  for (let i = 0; i < arr.length - 1; i++) {
    if (arr[i].category.localeCompare(arr[i + 1].category, undefined, { sensitivity: 'base' }) > 0) {
      return false;
    }
  }
  return true;
}

function isCategoryZA(arr) {
  for (let i = 0; i < arr.length - 1; i++) {
    if (arr[i].category.localeCompare(arr[i + 1].category, undefined, { sensitivity: 'base' }) < 0) {
      return false;
    }
  }
  return true;
}

const arbTransaction = fc.record({
  id: fc.uuid(),
  type: fc.constantFrom('income', 'expense'),
  amount: fc.integer({ min: 1, max: 9999999 }).map(cents => cents / 100),
  description: fc.string({ minLength: 1, maxLength: 50 }),
  category: fc.constantFrom(...DEFAULT_CATEGORIES),
  date: fc.constant('2024-01-01'),
});

describe('Property 10 — sort order invariant', () => {
  // **Validates: Requirements 6.1, 6.2, 6.3, 6.5**

  test('amount-asc: result is sorted ascending by amount', () => {
    fc.assert(
      fc.property(fc.array(arbTransaction, { minLength: 0, maxLength: 30 }), (txs) => {
        const { AppState, getFilteredTransactions } = window.__ebv;
        AppState.transactions = txs;
        AppState.activeSort = 'amount-asc';
        const sorted = getFilteredTransactions();
        return isNonDecreasing(sorted, 'amount');
      }),
      { numRuns: 100 }
    );
  });

  test('amount-desc: result is sorted descending by amount', () => {
    fc.assert(
      fc.property(fc.array(arbTransaction, { minLength: 0, maxLength: 30 }), (txs) => {
        const { AppState, getFilteredTransactions } = window.__ebv;
        AppState.transactions = txs;
        AppState.activeSort = 'amount-desc';
        const sorted = getFilteredTransactions();
        return isNonIncreasing(sorted, 'amount');
      }),
      { numRuns: 100 }
    );
  });

  test('cat-az: result is sorted alphabetically A-Z by category', () => {
    fc.assert(
      fc.property(fc.array(arbTransaction, { minLength: 0, maxLength: 30 }), (txs) => {
        const { AppState, getFilteredTransactions } = window.__ebv;
        AppState.transactions = txs;
        AppState.activeSort = 'cat-az';
        const sorted = getFilteredTransactions();
        return isCategoryAZ(sorted);
      }),
      { numRuns: 100 }
    );
  });

  test('cat-za: result is sorted alphabetically Z-A by category', () => {
    fc.assert(
      fc.property(fc.array(arbTransaction, { minLength: 0, maxLength: 30 }), (txs) => {
        const { AppState, getFilteredTransactions } = window.__ebv;
        AppState.transactions = txs;
        AppState.activeSort = 'cat-za';
        const sorted = getFilteredTransactions();
        return isCategoryZA(sorted);
      }),
      { numRuns: 100 }
    );
  });
});
