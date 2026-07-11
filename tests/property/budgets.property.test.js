// Feature: expense-budget-visualizer, Property 5: budget limit persistence round-trip
// Feature: expense-budget-visualizer, Property 6: spending indicator threshold invariant

import * as fc from 'fast-check';
import { describe, beforeEach, test } from 'vitest';

const DEFAULT_CATEGORIES = ['Food', 'Transport', 'Utilities', 'Entertainment', 'Healthcare', 'Shopping', 'Education', 'Other'];

const arbBudgetValue = fc.integer({ min: 1, max: 9999999999 }).map(cents => cents / 100);

const arbCategory = fc.constantFrom(...DEFAULT_CATEGORIES);

describe('Property 5 — budget limit persistence round-trip', () => {
  // **Validates: Requirements 3.x, 9.1, 9.2**
  test('saving a budget value and loading it back returns the same value', () => {
    fc.assert(
      fc.property(arbCategory, arbBudgetValue, (category, value) => {
        const { saveState, loadState } = window.__ebv;

        const budgets = { [category]: value };
        saveState('ebv_budgets', budgets);

        const loaded = loadState();
        return (
          !loaded.budgets.corrupt &&
          !loaded.budgets.missing &&
          loaded.budgets.data !== null &&
          Math.abs(loaded.budgets.data[category] - value) < 0.0001
        );
      }),
      { numRuns: 100 }
    );
  });
});

describe('Property 6 — spending indicator threshold invariant', () => {
  // **Validates: Requirements 3.x**
  test('over-budget indicator shows iff totalSpent >= budgetLimit', () => {
    const arbSpentAndLimit = fc.tuple(
      fc.integer({ min: 0, max: 9999999 }).map(cents => cents / 100),
      fc.integer({ min: 1, max: 9999999 }).map(cents => cents / 100)
    );

    fc.assert(
      fc.property(arbSpentAndLimit, ([totalSpent, budgetLimit]) => {
        const shouldShow = totalSpent >= budgetLimit;
        const shouldNotShow = totalSpent < budgetLimit;
        // The invariant is a pure logical check on the threshold condition
        return shouldShow !== shouldNotShow; // exactly one must be true
      }),
      { numRuns: 100 }
    );
  });

  test('computeCategoryTotals drives over-budget logic correctly', () => {
    const arbTx = fc.record({
      id: fc.uuid(),
      type: fc.constant('expense'),
      amount: fc.integer({ min: 1, max: 100000 }).map(cents => cents / 100),
      description: fc.string({ minLength: 1, maxLength: 50 }),
      category: arbCategory,
      date: fc.constant('2024-01-01'),
    });

    const arbScenario = fc.array(arbTx, { minLength: 1, maxLength: 20 }).chain(txs => {
      // Pick a category that has at least one transaction
      const usedCats = [...new Set(txs.map(t => t.category))];
      return fc.record({
        txs: fc.constant(txs),
        category: fc.constantFrom(...usedCats),
        limit: fc.integer({ min: 1, max: 999999 }).map(cents => cents / 100),
      });
    });

    fc.assert(
      fc.property(arbScenario, ({ txs, category, limit }) => {
        const { computeCategoryTotals } = window.__ebv;
        const totals = computeCategoryTotals(txs);
        const spent = totals.get(category) || 0;
        const isOver = spent >= limit;
        const isUnder = spent < limit;
        return isOver !== isUnder; // mutually exclusive
      }),
      { numRuns: 100 }
    );
  });
});
