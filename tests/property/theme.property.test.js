// Feature: expense-budget-visualizer, Property 11: theme persistence round-trip

import * as fc from 'fast-check';
import { describe, test } from 'vitest';

describe('Property 11 — theme persistence round-trip', () => {
  // **Validates: Requirements 8.3, 8.4, 8.5, 9.1, 9.2**
  test('saving a theme value and loading it back returns the same theme', () => {
    const arbTheme = fc.constantFrom('light', 'dark');

    fc.assert(
      fc.property(arbTheme, (theme) => {
        const { saveState, loadState } = window.__ebv;

        // saveState JSON.stringifies internally, so pass the raw string
        saveState('ebv_theme', theme);

        const loaded = loadState();
        return (
          !loaded.theme.corrupt &&
          !loaded.theme.missing &&
          loaded.theme.data === theme
        );
      }),
      { numRuns: 100 }
    );
  });

  test('only "light" and "dark" are valid theme values — others are treated as corrupt', () => {
    const arbInvalidTheme = fc.string().filter(
      s => s !== 'light' && s !== 'dark' && s.length > 0
    );

    fc.assert(
      fc.property(arbInvalidTheme, (invalidTheme) => {
        const { saveState, loadState } = window.__ebv;
        saveState('ebv_theme', invalidTheme);
        const loaded = loadState();
        // loadState should mark it corrupt since it's not 'light' or 'dark'
        return loaded.theme.corrupt === true;
      }),
      { numRuns: 100 }
    );
  });
});
