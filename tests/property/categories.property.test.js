// Feature: expense-budget-visualizer, Property 8: custom category uniqueness
// Feature: expense-budget-visualizer, Property 9: custom category round-trip persistence

import * as fc from 'fast-check';
import { describe, test } from 'vitest';

const DEFAULT_CATEGORIES = ['Food', 'Transport', 'Utilities', 'Entertainment', 'Healthcare', 'Shopping', 'Education', 'Other'];

describe('Property 8 — custom category uniqueness', () => {
  // **Validates: Requirements 5.1, 5.4**
  test('duplicate category name (case-insensitive) always returns a validation error', () => {
    // Generate a variant of a DEFAULT_CATEGORY with arbitrary casing
    const arbDefaultCategoryVariant = fc.constantFrom(...DEFAULT_CATEGORIES).chain(name => {
      // Produce a case-mangled version of the name
      return fc.array(fc.boolean(), { minLength: name.length, maxLength: name.length }).map(flips =>
        name.split('').map((c, i) => flips[i] ? c.toUpperCase() : c.toLowerCase()).join('')
      );
    });

    fc.assert(
      fc.property(arbDefaultCategoryVariant, (duplicateName) => {
        const { AppState, validateCategoryName } = window.__ebv;
        // Clear custom categories so only DEFAULT_CATEGORIES are checked
        AppState.customCategories = [];
        const result = validateCategoryName(duplicateName);
        return result !== null; // must return an error string
      }),
      { numRuns: 100 }
    );
  });

  test('duplicate of a custom category also returns a validation error', () => {
    const arbCustomName = fc.string({ minLength: 1, maxLength: 50 }).filter(
      name => !DEFAULT_CATEGORIES.some(d => d.toLowerCase() === name.trim().toLowerCase()) && name.trim().length >= 1
    );

    fc.assert(
      fc.property(arbCustomName, (customName) => {
        const { AppState, validateCategoryName } = window.__ebv;
        AppState.customCategories = [customName.trim()];
        // Try to add the same name again (lowercase variant)
        const result = validateCategoryName(customName.trim().toLowerCase());
        return result !== null;
      }),
      { numRuns: 100 }
    );
  });
});

describe('Property 9 — custom category round-trip persistence', () => {
  // **Validates: Requirements 5.5, 9.1, 9.2**
  test('saving a custom category name and loading it back returns the same name', () => {
    const arbValidCategoryName = fc.string({ minLength: 1, maxLength: 50 }).filter(
      name => !DEFAULT_CATEGORIES.some(d => d.toLowerCase() === name.trim().toLowerCase()) && name.trim().length >= 1
    );

    fc.assert(
      fc.property(arbValidCategoryName, (name) => {
        const { saveState, loadState } = window.__ebv;
        const trimmed = name.trim();
        saveState('ebv_categories', [trimmed]);

        const loaded = loadState();
        return (
          !loaded.categories.corrupt &&
          !loaded.categories.missing &&
          Array.isArray(loaded.categories.data) &&
          loaded.categories.data.includes(trimmed)
        );
      }),
      { numRuns: 100 }
    );
  });
});
