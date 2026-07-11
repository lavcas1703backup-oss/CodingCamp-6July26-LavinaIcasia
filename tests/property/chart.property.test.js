// Feature: expense-budget-visualizer, Property 7: chart segment coverage

import * as fc from 'fast-check';
import { describe, test } from 'vitest';

const DEFAULT_CATEGORIES = ['Food', 'Transport', 'Utilities', 'Entertainment', 'Healthcare', 'Shopping', 'Education', 'Other'];

describe('Property 7 — chart segment coverage', () => {
  // **Validates: Requirements 4.2, 4.4**
  test('every category with expense transactions has an entry in computeCategoryTotals', () => {
    const arbExpenseTx = fc.record({
      id: fc.uuid(),
      type: fc.constant('expense'),
      amount: fc.integer({ min: 1, max: 9999999 }).map(cents => cents / 100),
      description: fc.string({ minLength: 1, maxLength: 50 }),
      category: fc.constantFrom(...DEFAULT_CATEGORIES),
      date: fc.constant('2024-01-01'),
    });

    const arbNonEmptyExpenses = fc.array(arbExpenseTx, { minLength: 1, maxLength: 30 });

    fc.assert(
      fc.property(arbNonEmptyExpenses, (txs) => {
        const { computeCategoryTotals } = window.__ebv;
        const totals = computeCategoryTotals(txs);

        // Every category that appears in the transactions must have an entry
        const usedCategories = new Set(txs.map(t => t.category));
        for (const cat of usedCategories) {
          if (!totals.has(cat)) return false;
        }

        // Sum of all totals must equal sum of all expense amounts
        let totalFromMap = 0;
        totals.forEach(v => { totalFromMap += v; });
        const expectedTotal = txs.reduce((s, t) => s + t.amount, 0);

        return Math.abs(totalFromMap - expectedTotal) < 0.0001;
      }),
      { numRuns: 100 }
    );
  });

  test('income transactions are never included in computeCategoryTotals', () => {
    const arbMixedTx = fc.record({
      id: fc.uuid(),
      type: fc.constantFrom('income', 'expense'),
      amount: fc.integer({ min: 1, max: 9999999 }).map(cents => cents / 100),
      description: fc.string({ minLength: 1, maxLength: 50 }),
      category: fc.constantFrom(...DEFAULT_CATEGORIES),
      date: fc.constant('2024-01-01'),
    });

    fc.assert(
      fc.property(fc.array(arbMixedTx, { minLength: 1, maxLength: 30 }), (txs) => {
        const { computeCategoryTotals } = window.__ebv;
        const totals = computeCategoryTotals(txs);

        const expenseTotal = txs
          .filter(t => t.type === 'expense')
          .reduce((s, t) => s + t.amount, 0);

        let mapTotal = 0;
        totals.forEach(v => { mapTotal += v; });

        return Math.abs(mapTotal - expenseTotal) < 0.0001;
      }),
      { numRuns: 100 }
    );
  });
});
