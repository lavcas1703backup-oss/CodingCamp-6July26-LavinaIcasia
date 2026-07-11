// Feature: expense-budget-visualizer, Property 12: write-before-render safety

import * as fc from 'fast-check';
import { describe, test, expect } from 'vitest';

const DEFAULT_CATEGORIES = ['Food', 'Transport', 'Utilities', 'Entertainment', 'Healthcare', 'Shopping', 'Education', 'Other'];

function todayStr() {
  const d = new Date();
  return (
    d.getFullYear() + '-' +
    String(d.getMonth() + 1).padStart(2, '0') + '-' +
    String(d.getDate()).padStart(2, '0')
  );
}

describe('Property 12 — write-before-render safety', () => {
  // **Validates: Requirements 9.5, 9.6**
  test('localStorage write failure does not mutate AppState.transactions', () => {
    const arbTransaction = fc.record({
      id: fc.uuid(),
      type: fc.constantFrom('income', 'expense'),
      amount: fc.integer({ min: 1, max: 9999999 }).map(cents => cents / 100),
      description: fc.string({ minLength: 1, maxLength: 50 }),
      category: fc.constantFrom(...DEFAULT_CATEGORIES),
      date: fc.constant(todayStr()),
    });

    const arbInitialState = fc.array(arbTransaction, { minLength: 0, maxLength: 10 });

    fc.assert(
      fc.property(arbInitialState, arbTransaction, (initialTxs, newTx) => {
        const { AppState, saveState } = window.__ebv;

        // Set up initial state
        AppState.transactions = [...initialTxs];
        const beforeCount = AppState.transactions.length;
        const beforeSnapshot = AppState.transactions.map(t => t.id);

        // Temporarily make localStorage.setItem throw
        const originalSetItem = localStorage.setItem.bind(localStorage);
        localStorage.setItem = () => { throw new Error('Storage quota exceeded'); };

        let threwError = false;
        try {
          saveState('ebv_transactions', [...AppState.transactions, newTx]);
        } catch (e) {
          threwError = true;
        } finally {
          // Always restore setItem
          localStorage.setItem = originalSetItem;
        }

        // saveState must have thrown
        if (!threwError) return false;

        // AppState must be unchanged (we did not push newTx since saveState threw)
        const afterCount = AppState.transactions.length;
        const afterSnapshot = AppState.transactions.map(t => t.id);

        return (
          afterCount === beforeCount &&
          afterSnapshot.every((id, i) => id === beforeSnapshot[i])
        );
      }),
      { numRuns: 100 }
    );
  });
});
