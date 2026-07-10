# Implementation Plan: Expense & Budget Visualizer

## Overview

This implementation plan covers the full build of the Expense & Budget Visualizer — a fully client-side SPA using HTML, CSS, and Vanilla JavaScript with localStorage persistence. Tasks follow the unidirectional data flow architecture defined in the design document: every state mutation writes to localStorage first, then updates in-memory AppState, then re-renders the affected UI regions. The 14 tasks progress from project scaffolding through core state management, all feature UI components, responsive/accessible styling, and finally unit and property-based tests.

## Task Dependency Graph

```json
{
  "waves": [
    {
      "wave": 1,
      "tasks": [1]
    },
    {
      "wave": 2,
      "tasks": [2]
    },
    {
      "wave": 3,
      "tasks": [3]
    },
    {
      "wave": 4,
      "tasks": [4, 10, 11]
    },
    {
      "wave": 5,
      "tasks": [5, 6]
    },
    {
      "wave": 6,
      "tasks": [7]
    },
    {
      "wave": 7,
      "tasks": [8]
    },
    {
      "wave": 8,
      "tasks": [9]
    },
    {
      "wave": 9,
      "tasks": [12]
    },
    {
      "wave": 10,
      "tasks": [13]
    },
    {
      "wave": 11,
      "tasks": [14]
    }
  ]
}
```

## Tasks

- [x] 1. Project Scaffolding
  - Create the root `index.html` with the full semantic HTML skeleton: `<header>` containing the theme toggle button, and `<main>` with all seven section placeholders (`#summary-panel`, `#chart-section`, `#budget-section`, `#transaction-form`, `#custom-category`, `#sort-controls`, `#transaction-list`).
  - Create `css/style.css` as an empty file with a comment header; link it from `index.html` via `<link>`.
  - Create `js/app.js` as an empty IIFE stub (`(function() { 'use strict'; })();`); reference it from `index.html` via `<script defer>`.
  - Verify the file structure matches exactly: one `index.html` at root, one file in `css/`, one file in `js/` (satisfies TC-4).
  - **Acceptance criteria:** Opening `index.html` in a browser shows a blank page with no console errors; all three files exist at their required paths.

- [x] 2. Core State Management and localStorage Utilities
  - Define the `AppState` object with all six fields: `transactions: []`, `budgets: {}`, `customCategories: []`, `theme: "light"`, `activeSort: null`, `activeFilter: null`.
  - Define the `DEFAULT_CATEGORIES` constant array: `["Food", "Transport", "Utilities", "Entertainment", "Healthcare", "Shopping", "Education", "Other"]`.
  - Implement `saveState(key, value)`: serialize `value` with `JSON.stringify`, write to `localStorage`, and throw a descriptive `Error` if the write fails (catches `QuotaExceededError` and any other exception).
  - Implement `loadState()`: attempt to read and `JSON.parse` each of the four localStorage keys (`ebv_transactions`, `ebv_budgets`, `ebv_categories`, `ebv_theme`); return a structured result object that flags whether data was corrupt or missing.
  - Implement `showToast(message)`: create a dismissible toast element, append it to `<body>`, auto-remove it after 4 seconds, and expose a close button.
  - **Acceptance criteria:** `saveState` and `loadState` can be called from the browser console without errors; a `QuotaExceededError` from `saveState` triggers a thrown error rather than a silent failure.

- [x] 3. Default Categories and AppState Initialization
  - Implement `initApp()` as the entry point called on `DOMContentLoaded`.
  - Inside `initApp()`, call `loadState()` and populate `AppState` from the returned data; on corrupt data, call `showToast` with the corrupt-data message and initialize to empty defaults (satisfies Requirements 9.3, 9.4).
  - Apply the persisted or default theme via `applyTheme(AppState.theme)` before any render call to prevent theme flash (satisfies Requirements 8.4, 8.5).
  - Expose `getAllCategories()` — a helper that returns `[...DEFAULT_CATEGORIES, ...AppState.customCategories]` — for use by all category-selection controls.
  - Populate the transaction-form category `<select>` and any other category dropdowns with `getAllCategories()`.
  - **Acceptance criteria:** Refreshing the page with empty localStorage initializes `AppState` to defaults with no console errors; the page renders with the eight default categories in the category dropdown.

- [x] 4. Transaction Form with Validation
  - Build the transaction form inside `#transaction-form`: fields for type (`<select>` income/expense), amount (`<input type="number">`), description (`<input type="text">`), category (`<select>`), date (`<input type="date">`), and a submit button.
  - Add an `<span class="field-error">` element below each field for inline error display; hide them by default.
  - Implement `validateTransactionForm(data)`: return an array of `{ field, message }` objects for each failing rule — empty fields, amount ≤ 0, amount > 999,999,999.99, more than 2 decimal places, description > 100 chars, future date (satisfies Requirements 1.3, 1.4, 1.7, 1.8).
  - Implement `handleAddTransaction(e)`: call `validateTransactionForm`, display inline errors on failure, abort saving; on success call `saveState('ebv_transactions', ...)`, catch write errors with `showToast`, then mutate `AppState.transactions`, reset the form, and call `renderTransactionList()`, `renderSummaryPanel()`, `renderChart()`, `renderBudgetSection()` (satisfies Requirements 1.2, 1.5, 1.6, 9.5, 9.6).
  - Assign a UUID-like id to each new transaction using `crypto.randomUUID()` with a `Date.now().toString()` fallback.
  - Clear all inline errors before each new validation pass.
  - **Acceptance criteria:** Submitting with any field missing shows the correct inline error and does not alter `AppState`; submitting a fully valid form adds the transaction to `AppState.transactions` and updates the Summary Panel and Chart within 300 ms.

- [x] 5. Transaction List Rendering with Sort, Delete, and Confirmation
  - Implement `renderTransactionList()`: clear `#transaction-list`, get the sorted/filtered set via `getFilteredTransactions()`, render one `<article>` per transaction showing description, amount (formatted to 2 decimal places with currency sign), category, type, and date; if empty, render the empty-state message (satisfies Requirements 2.1, 2.5).
  - Implement `getFilteredTransactions()`: apply `AppState.activeSort` to a copy of `AppState.transactions` using the appropriate comparator for each sort key (`amount-asc`, `amount-desc`, `cat-az`, `cat-za`); default to reverse-chronological when `activeSort` is null (satisfies Requirement 6.5).
  - Implement `handleDeleteTransaction(id)`: call `confirm()` — if cancelled, do nothing; if confirmed, call `saveState`, catch write errors with `showToast` and abort, then remove the transaction from `AppState.transactions` and call `renderTransactionList()`, `renderSummaryPanel()`, `renderChart()`, `renderBudgetSection()` (satisfies Requirements 2.2, 2.3, 2.4, 2.6).
  - Build the Sort Control inside `#sort-controls` as four buttons or a `<select>` with the options: Amount ↑, Amount ↓, Category A–Z, Category Z–A; wire `handleSort(option)` to each.
  - Implement `handleSort(option)`: set `AppState.activeSort`, update the active-sort visual state on the Sort Control, and call `renderTransactionList()` within 200 ms (satisfies Requirements 6.1, 6.2, 6.3).
  - **Acceptance criteria:** With multiple transactions in state, choosing "Amount ↑" re-renders the list in ascending amount order; deleting a transaction after confirming removes it from the list; cancelling the confirm dialog leaves the list unchanged.

- [x] 6. Summary Panel Computation and Rendering
  - Implement `computeSummary(transactions)`: iterate over `transactions`, sum all `income` amounts and all `expense` amounts separately, return `{ income, expenses, balance }` where `balance = income - expenses` (satisfies Requirement 1.5).
  - Implement `renderSummaryPanel()`: call `computeSummary(AppState.transactions)`, then update the DOM elements inside `#summary-panel` to display total income, total expenses, and net balance, each formatted to two decimal places.
  - Apply a positive/negative visual class to the balance display (e.g., green for positive, red for negative) without relying on color alone — include a `+`/`-` sign or label.
  - **Acceptance criteria:** Adding two expense transactions of $10 and $20 and one income of $50 shows Income $50.00, Expenses $30.00, Balance $20.00; deleting the $20 expense updates the panel instantly.

- [x] 7. Chart Rendering (Canvas/SVG) for Spending by Category
  - Place a `<canvas id="spending-chart">` (or `<svg>`) element inside `#chart-section`.
  - Implement `computeCategoryTotals(transactions)`: filter to expense transactions only, group by category, sum amounts, return a `Map<string, number>`.
  - Implement `renderChart()`: if no expense transactions exist, show a placeholder message inside the chart area (satisfies Requirement 4.3); otherwise draw a pie or bar chart using the Canvas 2D API (or SVG).
  - Each chart segment/bar must display the category name, its total amount formatted to 2 decimal places, and its percentage of total expenses (satisfies Requirement 4.4).
  - Assign each category a distinct, consistent color; reuse the same color mapping for the same category across re-renders.
  - Re-draw the chart fully on every call to `renderChart()` (clears canvas before drawing) so updates after add/delete are always current (satisfies Requirement 4.2).
  - **Acceptance criteria:** With no expense transactions, the chart area shows the placeholder text; adding an expense transaction causes the chart to re-render with a labeled segment/bar; percentages of all segments sum to 100%.

- [x] 8. Budget Management — Set Limits and Spending Indicators
  - Build the budget UI inside `#budget-section`: for each category in `getAllCategories()`, render a row with the category name, a numeric input for the budget limit (pre-filled from `AppState.budgets` if set), a Save button, and a `<span>` for the spending indicator.
  - Implement `validateBudgetInput(value)`: return an error string if the value is non-numeric, ≤ 0, or > 999,999,999.99; return `null` on success (satisfies Requirement 3.3).
  - Implement `handleSetBudget(category, limit)`: call `validateBudgetInput`, show inline error on failure; on success call `saveState('ebv_budgets', ...)`, catch write errors with `showToast`, then update `AppState.budgets[category]` and call `renderBudgetSection()` (satisfies Requirements 3.1, 3.2).
  - Implement `renderBudgetSection()`: for each category, compute the sum of expense transactions via `computeCategoryTotals`; display the spending indicator if and only if a budget limit is set AND the total ≥ the limit (satisfies Requirements 3.4, 3.5, 3.6, 7.1).
  - The Spending_Indicator must use both a distinct color AND a text label or icon (e.g., "⚠ Over Budget") so it is not color-only (satisfies Requirements 7.2, 10.3).
  - Re-render `#budget-section` after every transaction add/delete to keep indicators current (satisfies Requirements 7.3, 7.5).
  - **Acceptance criteria:** Setting a $50 Food budget then adding a $50 Food expense shows the "⚠ Over Budget" indicator on the Food row; deleting that transaction removes the indicator; updating the budget to $100 also removes the indicator.

- [x] 9. Custom Category Management
  - Build the custom category control inside `#custom-category`: a text input (max 50 characters), an Add button, and an inline error `<span>`.
  - Implement `validateCategoryName(name)`: return an error string if name is empty, longer than 50 characters, or matches any existing category name case-insensitively; return `null` on success (satisfies Requirements 5.1, 5.4).
  - Implement `handleAddCategory(name)`: check the 20-category cap first and show the cap error if reached; call `validateCategoryName`, show inline error on failure; on success call `saveState('ebv_categories', ...)`, catch write errors with `showToast` and abort; then push to `AppState.customCategories`, refresh all category `<select>` dropdowns with `getAllCategories()`, add a new row to `#budget-section`, and clear the input (satisfies Requirements 5.2, 5.3, 5.5, 5.7).
  - **Acceptance criteria:** Adding "Hobbies" makes it appear in the transaction-form category dropdown immediately; attempting to add "hobbies" (different case) shows the duplicate error; adding a 21st custom category shows the cap error.

- [x] 10. Dark/Light Theme Toggle with Persistence
  - Add a `<button id="theme-toggle">` in `<header>` with an accessible label and an icon or text that reflects the current theme (e.g., "🌙 Dark" / "☀ Light") (satisfies Requirement 8.1).
  - Implement `applyTheme(theme)`: toggle a `data-theme="dark"` attribute (or CSS class) on the `<html>` element; update the Theme_Toggle button label/icon to match the active theme.
  - Define CSS custom properties in `style.css` for all colors under `:root` (light) and `[data-theme="dark"]`; ensure the toggle applies within 100 ms by relying purely on CSS variable switching (satisfies Requirement 8.2).
  - Implement `handleThemeToggle()`: flip `AppState.theme` between "light" and "dark", call `saveState('ebv_theme', AppState.theme)` with error handling, then call `applyTheme(AppState.theme)` (satisfies Requirement 8.3).
  - In `initApp()`, read theme from localStorage before any rendering so no flash of the wrong theme occurs (satisfies Requirements 8.4, 8.5).
  - **Acceptance criteria:** Clicking the toggle switches all background/text colors within 100 ms; reloading the page restores the previously selected theme with no visible flash; the toggle button label always matches the active theme.

- [x] 11. Data Persistence on Load — Restore State and Handle Corruption
  - In `loadState()`, wrap each `JSON.parse` call in a try/catch; if any key produces a parse error or returns data that fails a basic schema check (e.g., `transactions` is not an array), mark that key as corrupt.
  - If any corruption is detected, reset all AppState fields to their empty defaults and call `showToast` with the message "Previous data could not be loaded. Starting fresh." (satisfies Requirement 9.4).
  - If `ebv_transactions` parses correctly, validate each individual transaction object has the required fields (`id`, `type`, `amount`, `description`, `category`, `date`); silently drop any malformed entries.
  - On clean load, set `AppState` from parsed data and proceed to render all regions (satisfies Requirements 9.1, 9.2).
  - If `ebv_categories` is missing or corrupt, default to an empty `customCategories` array (satisfies Requirement 9.3).
  - **Acceptance criteria:** Manually inserting `ebv_transactions=CORRUPTED` in localStorage then loading the page shows the toast notification and displays an empty transaction list; a valid prior state restores correctly on reload.

- [x] 12. Responsive Layout and Accessibility
  - In `style.css`, implement a fluid/responsive layout using CSS Grid or Flexbox that reflows the main sections gracefully across 320px–2560px viewport widths (satisfies Requirement 10.1).
  - Add a CSS media query (e.g., `max-width: 768px`) to stack the chart, summary panel, and form sections vertically on narrow screens; verify no horizontal overflow.
  - Define color tokens in CSS custom properties for both themes ensuring a minimum contrast ratio of 4.5:1 for body text and 3:1 for large text in both light and dark modes (satisfies Requirement 10.4).
  - Add `:focus-visible` styles for all interactive elements (inputs, buttons, selects) providing a non-zero outline that is distinguishable from the background (satisfies Requirement 10.5).
  - Add `aria-label` or `aria-labelledby` attributes to the chart `<canvas>`/`<svg>`, the delete buttons (include transaction description in the label), the theme toggle, and all icon-only controls.
  - Ensure all form `<input>` and `<select>` elements have associated `<label>` elements with correct `for`/`id` pairs.
  - **Acceptance criteria:** At 320px viewport width, all form fields and buttons are fully visible and usable without horizontal scrolling; tab order covers every interactive control; delete buttons have descriptive aria-labels.

- [ ] 13. Unit Tests — Setup and Implementation
  - Initialize a Node.js test project in a `tests/` directory: add `package.json` with Vitest (or Jest) as a dev dependency, configure the test runner to handle ES modules if needed, and add a `test` npm script.
  - Create `tests/helpers/localStorage.mock.js` that provides an in-memory mock of the `localStorage` API (getItem, setItem, removeItem, clear) for use across all test files.
  - Create `tests/unit/transactions.test.js` — cover: submitting with each required field missing individually shows the correct inline error and does not change `AppState`; submitting a fully valid transaction adds it to `AppState.transactions`; deleting a transaction removes it from `AppState.transactions` and updates the summary; empty transaction list renders the empty-state message.
  - Create `tests/unit/budgets.test.js` — cover: setting a budget limit above current spending hides the spending indicator; invalid budget input (negative, zero, non-numeric) shows the correct error.
  - Create `tests/unit/categories.test.js` — cover: the 21st custom category attempt is rejected with the correct cap error; a valid new category appears in all category dropdowns.
  - Create `tests/unit/theme.test.js` — cover: theme defaults to "light" when no localStorage entry exists; toggling the theme saves it to localStorage.
  - Create `tests/unit/persistence.test.js` — cover: corrupt localStorage data on startup shows the toast notification and uses empty state; clean prior state is fully restored on app init.
  - Run all unit tests and ensure they pass before marking this task complete.
  - **Acceptance criteria:** `npm test` runs all unit tests with zero failures; each test file covers the scenarios listed above.

- [ ] 14. Property-Based Tests — Setup and Implementation with fast-check
  - Install **fast-check** as a dev dependency (`npm install --save-dev fast-check`).
  - Refactor `app.js` to export the pure logic functions needed by tests: `validateTransactionForm`, `computeSummary`, `computeCategoryTotals`, `validateCategoryName`, `validateBudgetInput`, `getFilteredTransactions`.
  - Each property test file imports the relevant pure functions, runs a minimum of **100 iterations**, and is tagged with the format `Feature: expense-budget-visualizer, Property {N}: {description}`.
  - Create `tests/property/transactions.property.test.js`:
    - [ ] 14.1 Write property test for Property 1 — valid transaction always appears in the list
      **Validates: Requirements 1.1, 1.2**
    - [ ] 14.2 Write property test for Property 2 — invalid transaction never mutates state
      **Validates: Requirements 1.3, 1.4, 1.7, 1.8**
    - [ ] 14.3 Write property test for Property 3 — summary panel reflects transaction set
      **Validates: Requirements 1.5, 2.4**
    - [ ] 14.4 Write property test for Property 4 — transaction deletion is complete and consistent
      **Validates: Requirements 2.2, 2.3, 2.4**
  - Create `tests/property/budgets.property.test.js`:
    - [ ] 14.5 Write property test for Property 5 — budget limit persistence round-trip
      **Validates: Requirements 3.1, 3.2**
    - [ ] 14.6 Write property test for Property 6 — spending indicator threshold invariant
      **Validates: Requirements 3.4, 3.5, 3.6, 7.1, 7.3, 7.4, 7.5**
  - Create `tests/property/chart.property.test.js`:
    - [ ] 14.7 Write property test for Property 7 — chart segment coverage
      **Validates: Requirements 4.1, 4.2, 4.4**
  - Create `tests/property/categories.property.test.js`:
    - [ ] 14.8 Write property test for Property 8 — custom category uniqueness
      **Validates: Requirements 5.4**
    - [ ] 14.9 Write property test for Property 9 — custom category round-trip persistence
      **Validates: Requirements 5.2, 5.3**
  - Create `tests/property/sort.property.test.js`:
    - [ ] 14.10 Write property test for Property 10 — sort order invariant
      **Validates: Requirements 6.1, 6.2**
  - Create `tests/property/theme.property.test.js`:
    - [ ] 14.11 Write property test for Property 11 — theme persistence round-trip
      **Validates: Requirements 8.2, 8.3, 8.4**
  - Create `tests/property/persistence.property.test.js`:
    - [ ] 14.12 Write property test for Property 12 — write-before-render safety
      **Validates: Requirements 9.5, 9.6, 2.6, 5.5**
  - Run all property-based tests and ensure they pass.
  - **Acceptance criteria:** All 12 property tests run with ≥100 iterations each with zero failures; each test file is tagged with the correct `Feature: expense-budget-visualizer, Property {N}` label.

## Notes

- All tasks assume the unidirectional data flow pattern from the design: write to localStorage → mutate AppState → re-render. Never update the UI before a successful localStorage write.
- Tasks 4–11 can be built incrementally within a single `js/app.js` file. Ensure each function is reachable by tests by wrapping them in a module pattern or exporting them at the bottom of the file when the test environment is detected.
- For Task 7 (Chart), prefer the Canvas 2D API for simplicity. If labels overlap in the pie chart, fall back to a legend below the chart.
- For Task 12 (Accessibility), use a tool like [WebAIM Contrast Checker](https://webaim.org/resources/contrastchecker/) to verify color tokens before finalizing `style.css`.
- For Tasks 13–14 (Tests), all localStorage interactions must be mocked. Never let tests write to the real browser localStorage — use the mock helper from `tests/helpers/localStorage.mock.js`.
- Property-based tests must target pure/exported functions only. Do not test DOM rendering in property tests; keep those in unit tests.
