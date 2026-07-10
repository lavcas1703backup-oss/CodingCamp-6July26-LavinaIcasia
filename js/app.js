(function () {
  'use strict';

  // Expense & Budget Visualizer — app.js
  // All application logic will be implemented here following the
  // unidirectional data flow pattern:
  //   User Action → Validate → Write localStorage → Mutate AppState → Re-render UI

  // =========================================================================
  // Constants
  // =========================================================================

  /** Built-in category names available to all users. */
  const DEFAULT_CATEGORIES = [
    'Food',
    'Transport',
    'Utilities',
    'Entertainment',
    'Healthcare',
    'Shopping',
    'Education',
    'Other',
  ];

  /** localStorage keys used to persist application data. */
  const STORAGE_KEYS = {
    transactions: 'ebv_transactions',
    budgets: 'ebv_budgets',
    categories: 'ebv_categories',
    theme: 'ebv_theme',
  };

  // =========================================================================
  // Application State
  // =========================================================================

  /**
   * Single in-memory source of truth for the entire application.
   * Every mutation must write to localStorage first, then update this object,
   * then trigger a UI re-render of the affected region.
   *
   * @type {{
   *   transactions: Array<Object>,
   *   budgets: Object,
   *   customCategories: string[],
   *   theme: "light"|"dark",
   *   activeSort: string|null,
   *   activeFilter: string|null
   * }}
   */
  const AppState = {
    transactions: [],
    budgets: {},
    customCategories: [],
    theme: 'light',
    activeSort: null,
    activeFilter: null,
  };

  // =========================================================================
  // localStorage Utilities
  // =========================================================================

  /**
   * Serialize `value` and write it to localStorage under `key`.
   *
   * Throws a descriptive Error if the write fails for any reason, including
   * QuotaExceededError (storage full) or security restrictions in private
   * browsing modes. The caller is responsible for catching and surfacing the
   * error to the user via showToast.
   *
   * @param {string} key   - The localStorage key to write.
   * @param {*}      value - The value to serialize and store.
   * @throws {Error} When the localStorage write fails for any reason.
   */
  function saveState(key, value) {
    try {
      const serialized = JSON.stringify(value);
      localStorage.setItem(key, serialized);
    } catch (err) {
      // Normalize both QuotaExceededError and any other storage exception into
      // a single, descriptive Error that callers can catch and display.
      throw new Error(
        'Unable to save. Your changes could not be persisted. ' +
          '(Original error: ' + (err && err.message ? err.message : String(err)) + ')'
      );
    }
  }

  /**
   * Read all four application localStorage keys and attempt to parse each one.
   *
   * Returns a structured result object so callers can distinguish between a
   * missing key (no prior data) and a corrupt key (malformed JSON or wrong
   * data type), and react accordingly.
   *
   * Result shape:
   * ```js
   * {
   *   transactions: { data: Array|null, corrupt: boolean, missing: boolean },
   *   budgets:      { data: Object|null, corrupt: boolean, missing: boolean },
   *   categories:   { data: Array|null,  corrupt: boolean, missing: boolean },
   *   theme:        { data: string|null, corrupt: boolean, missing: boolean },
   * }
   * ```
   *
   * @returns {Object} Structured load result for all four storage keys.
   */
  function loadState() {
    const result = {
      transactions: { data: null, corrupt: false, missing: false },
      budgets:      { data: null, corrupt: false, missing: false },
      categories:   { data: null, corrupt: false, missing: false },
      theme:        { data: null, corrupt: false, missing: false },
    };

    // --- transactions ---
    const rawTransactions = localStorage.getItem(STORAGE_KEYS.transactions);
    if (rawTransactions === null) {
      result.transactions.missing = true;
    } else {
      try {
        const parsed = JSON.parse(rawTransactions);
        if (!Array.isArray(parsed)) {
          result.transactions.corrupt = true;
        } else {
          result.transactions.data = parsed;
        }
      } catch (_) {
        result.transactions.corrupt = true;
      }
    }

    // --- budgets ---
    const rawBudgets = localStorage.getItem(STORAGE_KEYS.budgets);
    if (rawBudgets === null) {
      result.budgets.missing = true;
    } else {
      try {
        const parsed = JSON.parse(rawBudgets);
        if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
          result.budgets.corrupt = true;
        } else {
          result.budgets.data = parsed;
        }
      } catch (_) {
        result.budgets.corrupt = true;
      }
    }

    // --- categories ---
    const rawCategories = localStorage.getItem(STORAGE_KEYS.categories);
    if (rawCategories === null) {
      result.categories.missing = true;
    } else {
      try {
        const parsed = JSON.parse(rawCategories);
        if (!Array.isArray(parsed)) {
          result.categories.corrupt = true;
        } else {
          result.categories.data = parsed;
        }
      } catch (_) {
        result.categories.corrupt = true;
      }
    }

    // --- theme ---
    const rawTheme = localStorage.getItem(STORAGE_KEYS.theme);
    if (rawTheme === null) {
      result.theme.missing = true;
    } else {
      try {
        const parsed = JSON.parse(rawTheme);
        if (parsed !== 'light' && parsed !== 'dark') {
          result.theme.corrupt = true;
        } else {
          result.theme.data = parsed;
        }
      } catch (_) {
        result.theme.corrupt = true;
      }
    }

    return result;
  }

  // =========================================================================
  // Toast Notification
  // =========================================================================

  /**
   * Display a dismissible toast notification at the top-right of the viewport.
   *
   * The toast auto-removes itself after 4 seconds and also exposes a close
   * button for immediate dismissal. Multiple toasts stack vertically.
   *
   * @param {string} message - The human-readable message to display.
   */
  function showToast(message) {
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.setAttribute('role', 'alert');
    toast.setAttribute('aria-live', 'assertive');
    toast.setAttribute('aria-atomic', 'true');

    const messageSpan = document.createElement('span');
    messageSpan.className = 'toast__message';
    messageSpan.textContent = message;

    const closeBtn = document.createElement('button');
    closeBtn.className = 'toast__close';
    closeBtn.setAttribute('aria-label', 'Dismiss notification');
    closeBtn.textContent = '✕';

    /** Remove the toast from the DOM with a fade-out transition. */
    function dismiss() {
      toast.classList.add('toast--hiding');
      // Wait for the CSS transition to finish before removing the node.
      toast.addEventListener('transitionend', function () {
        if (toast.parentNode) {
          toast.parentNode.removeChild(toast);
        }
      }, { once: true });
    }

    closeBtn.addEventListener('click', dismiss);

    toast.appendChild(messageSpan);
    toast.appendChild(closeBtn);
    document.body.appendChild(toast);

    // Auto-dismiss after 4 seconds.
    setTimeout(dismiss, 4000);
  }

  // =========================================================================
  // Theme
  // =========================================================================

  /**
   * Apply `theme` to the document and update the theme-toggle button label.
   *
   * Sets `data-theme="dark"` on the `<html>` element for dark mode and removes
   * the attribute for light mode. Also updates the button's text and
   * aria-label so screen readers reflect the current state.
   *
   * Must be called BEFORE any render function to prevent a flash of the wrong
   * theme on startup (satisfies Requirements 8.4, 8.5).
   *
   * @param {"light"|"dark"} theme - The theme to apply.
   */
  function applyTheme(theme) {
    const html = document.documentElement;
    const btn = document.getElementById('theme-toggle');

    if (theme === 'dark') {
      html.setAttribute('data-theme', 'dark');
      if (btn) {
        btn.textContent = '🌙 Dark';
        btn.setAttribute('aria-label', 'Switch to light mode');
      }
    } else {
      html.removeAttribute('data-theme');
      if (btn) {
        btn.textContent = '☀ Light';
        btn.setAttribute('aria-label', 'Switch to dark mode');
      }
    }
  }

  /**
   * Toggle the active theme between "light" and "dark".
   *
   * Flow (satisfies Requirement 8.3):
   * 1. Flip AppState.theme.
   * 2. Persist the new value via saveState with error handling.
   * 3. Call applyTheme() to update the DOM immediately.
   *
   * On localStorage write failure a toast is shown but the visual theme
   * change still applies (the theme is UI-only and non-destructive, so
   * aborting the visual switch would create a confusing UX).
   */
  function handleThemeToggle() {
    AppState.theme = AppState.theme === 'dark' ? 'light' : 'dark';

    try {
      saveState(STORAGE_KEYS.theme, AppState.theme);
    } catch (err) {
      showToast(err.message);
      // Visual theme is still applied below even when persistence fails.
    }

    applyTheme(AppState.theme);
  }

  // =========================================================================
  // Category Helpers
  // =========================================================================

  /**
   * Return the full list of available categories: built-in defaults followed
   * by any user-defined custom categories currently in AppState.
   *
   * This is the single authoritative source for all category-selection
   * controls (satisfies Requirements 5.2, 5.3).
   *
   * @returns {string[]} Combined array of default and custom category names.
   */
  function getAllCategories() {
    return [...DEFAULT_CATEGORIES, ...AppState.customCategories];
  }

  /**
   * Populate every `<select>` element with the class `category-select` (which
   * includes `#transaction-category`) with `<option>` elements derived from
   * `getAllCategories()`.
   *
   * Existing options are cleared first so this function is safe to call on
   * initial load as well as after a new custom category is added.
   */
  function populateCategorySelects() {
    const categories = getAllCategories();
    const selects = document.querySelectorAll('select.category-select');

    selects.forEach(function (select) {
      // Preserve the currently selected value so re-population doesn't reset
      // the user's mid-form choice.
      const previousValue = select.value;

      // Clear existing options.
      select.innerHTML = '';

      // Add a blank placeholder option.
      const placeholder = document.createElement('option');
      placeholder.value = '';
      placeholder.textContent = '— Select a category —';
      placeholder.disabled = true;
      placeholder.selected = true;
      select.appendChild(placeholder);

      categories.forEach(function (category) {
        const option = document.createElement('option');
        option.value = category;
        option.textContent = category;
        select.appendChild(option);
      });

      // Restore the previous selection if it still exists in the new list.
      if (previousValue && categories.includes(previousValue)) {
        select.value = previousValue;
      }
    });
  }

  // =========================================================================
  // Transaction Form — Validation
  // =========================================================================

  /**
   * Validate a transaction form data object and return all field-level errors.
   *
   * Rules enforced:
   * - type must be non-empty
   * - amount must be non-empty, positive, ≤ 999,999,999.99, and have ≤ 2 decimal places
   * - description must be non-empty and ≤ 100 characters
   * - category must be non-empty
   * - date must be non-empty and not in the future
   *
   * Satisfies Requirements 1.3, 1.4, 1.7, 1.8.
   *
   * @param {{ type: string, amount: string, description: string, category: string, date: string }} data
   * @returns {Array<{ field: string, message: string }>} Empty array means all fields are valid.
   */
  function validateTransactionForm(data) {
    const errors = [];

    // --- type ---
    if (!data.type || data.type.trim() === '') {
      errors.push({ field: 'type', message: 'This field is required.' });
    }

    // --- amount ---
    if (data.amount === '' || data.amount === null || data.amount === undefined) {
      errors.push({ field: 'amount', message: 'This field is required.' });
    } else {
      const numericValue = Number(data.amount);
      if (isNaN(numericValue) || numericValue <= 0) {
        errors.push({ field: 'amount', message: 'Enter a positive number.' });
      } else if (numericValue > 999999999.99) {
        errors.push({ field: 'amount', message: 'Amount exceeds maximum allowed value.' });
      } else {
        // Check decimal places using the raw string to avoid floating-point imprecision.
        const parts = String(data.amount).split('.');
        if (parts[1] && parts[1].length > 2) {
          errors.push({ field: 'amount', message: 'Amount must have at most 2 decimal places.' });
        }
      }
    }

    // --- description ---
    if (!data.description || data.description.trim() === '') {
      errors.push({ field: 'description', message: 'This field is required.' });
    } else if (data.description.length > 100) {
      errors.push({ field: 'description', message: 'Description must be 100 characters or fewer.' });
    }

    // --- category ---
    if (!data.category || data.category.trim() === '') {
      errors.push({ field: 'category', message: 'This field is required.' });
    }

    // --- date ---
    if (!data.date || data.date.trim() === '') {
      errors.push({ field: 'date', message: 'This field is required.' });
    } else {
      // Compare YYYY-MM-DD strings directly — avoids timezone issues.
      const today = new Date();
      const todayStr =
        today.getFullYear() + '-' +
        String(today.getMonth() + 1).padStart(2, '0') + '-' +
        String(today.getDate()).padStart(2, '0');

      if (data.date > todayStr) {
        errors.push({ field: 'date', message: 'Date cannot be in the future.' });
      }
    }

    return errors;
  }

  // =========================================================================
  // Transaction Form — Submit Handler
  // =========================================================================

  /**
   * Handle the add-transaction form submission event.
   *
   * Flow:
   * 1. Prevent the native form submission.
   * 2. Read and trim all field values from the DOM.
   * 3. Clear all existing inline error spans.
   * 4. Run validateTransactionForm; show errors and bail early on failure.
   * 5. Attempt to write the new transaction to localStorage via saveState.
   *    - On write failure: show a toast and bail (do NOT mutate AppState).
   * 6. On success: push the new transaction onto AppState.transactions,
   *    reset the form, re-populate category selects, then re-render all
   *    affected UI regions.
   *
   * Satisfies Requirements 1.2, 1.5, 1.6, 9.5, 9.6.
   *
   * @param {Event} e - The form submit event.
   */
  function handleAddTransaction(e) {
    e.preventDefault();

    // Read raw field values from the DOM.
    const type        = document.getElementById('tx-type').value;
    const amount      = document.getElementById('tx-amount').value;
    const description = document.getElementById('tx-description').value;
    const category    = document.getElementById('tx-category').value;
    const date        = document.getElementById('tx-date').value;

    // --- Clear all existing inline errors ---
    const errorFields = ['type', 'amount', 'description', 'category', 'date'];
    errorFields.forEach(function (field) {
      const span = document.getElementById('tx-' + field + '-error');
      if (span) {
        span.textContent = '';
        span.classList.remove('visible');
      }
    });

    // --- Validate ---
    const errors = validateTransactionForm({ type, amount, description, category, date });

    if (errors.length > 0) {
      // Display each inline error and return early — do NOT save.
      errors.forEach(function (error) {
        const span = document.getElementById('tx-' + error.field + '-error');
        if (span) {
          span.textContent = error.message;
          span.classList.add('visible');
        }
      });
      return;
    }

    // --- Build the transaction object ---
    const id = (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function')
      ? crypto.randomUUID()
      : Date.now().toString();

    const newTx = {
      id,
      type,
      amount: parseFloat(amount),
      description,
      category,
      date,
    };

    // --- Write-before-render: persist first, then mutate AppState ---
    try {
      saveState(STORAGE_KEYS.transactions, [...AppState.transactions, newTx]);
    } catch (err) {
      showToast(err.message);
      return; // Do NOT mutate AppState on write failure (Req 9.5, 9.6).
    }

    // Persist succeeded — now update in-memory state.
    AppState.transactions.push(newTx);

    // Reset the form and restore the category placeholder.
    e.target.reset();
    populateCategorySelects();

    // Re-render all affected UI regions.
    renderTransactionList();
    renderSummaryPanel();
    renderChart();
    renderBudgetSection();
  }

  // =========================================================================
  // Transaction List — Sorting, Rendering, Deletion
  // =========================================================================

  /**
   * Return a sorted copy of `AppState.transactions` based on `AppState.activeSort`.
   *
   * Sort keys:
   *   'amount-asc'  — ascending by amount
   *   'amount-desc' — descending by amount
   *   'cat-az'      — category A–Z (locale-aware, case-insensitive)
   *   'cat-za'      — category Z–A (locale-aware, case-insensitive)
   *   null          — reverse-chronological (most recent date first);
   *                   ties broken by id descending
   *
   * Satisfies Requirement 6.5.
   *
   * @returns {Array<Object>} Sorted shallow copy of the transactions array.
   */
  function getFilteredTransactions() {
    const copy = AppState.transactions.slice();

    switch (AppState.activeSort) {
      case 'amount-asc':
        copy.sort(function (a, b) { return a.amount - b.amount; });
        break;

      case 'amount-desc':
        copy.sort(function (a, b) { return b.amount - a.amount; });
        break;

      case 'cat-az':
        copy.sort(function (a, b) {
          return a.category.localeCompare(b.category, undefined, { sensitivity: 'base' });
        });
        break;

      case 'cat-za':
        copy.sort(function (a, b) {
          return b.category.localeCompare(a.category, undefined, { sensitivity: 'base' });
        });
        break;

      default:
        // Reverse-chronological; tie-break by id descending.
        copy.sort(function (a, b) {
          if (b.date < a.date) return -1;
          if (b.date > a.date) return 1;
          // Same date — fall back to id comparison (newer id = higher string typically).
          if (b.id < a.id) return -1;
          if (b.id > a.id) return 1;
          return 0;
        });
        break;
    }

    return copy;
  }

  /**
   * Clear `#transaction-list` and re-render it from the current sorted state.
   *
   * Each transaction is rendered as an `<article class="transaction-item">` with:
   *   - description
   *   - amount (formatted $X.XX) styled with income/expense class
   *   - meta row: category | type (capitalised) | date
   *   - Delete button wired to handleDeleteTransaction
   *
   * An empty-state paragraph is shown when there are no transactions.
   *
   * Satisfies Requirements 2.1, 2.5.
   */
  function renderTransactionList() {
    const list = document.getElementById('transaction-list');
    if (!list) return;

    list.innerHTML = '';

    const transactions = getFilteredTransactions();

    if (transactions.length === 0) {
      const empty = document.createElement('p');
      empty.className = 'empty-state';
      empty.textContent = 'No transactions recorded yet.';
      list.appendChild(empty);
      return;
    }

    transactions.forEach(function (tx) {
      const article = document.createElement('article');
      article.className = 'transaction-item';
      article.dataset.id = tx.id;

      // Description row
      const descDiv = document.createElement('div');
      descDiv.className = 'tx-description';
      descDiv.textContent = tx.description;

      // Amount row — styled by type
      const amountDiv = document.createElement('div');
      amountDiv.className = 'tx-amount tx-amount--' + tx.type;
      amountDiv.textContent = '$' + tx.amount.toFixed(2);

      // Meta row: category · type · date
      const metaDiv = document.createElement('div');
      metaDiv.className = 'tx-meta';

      const categorySpan = document.createElement('span');
      categorySpan.className = 'tx-meta__category';
      categorySpan.textContent = tx.category;

      const typeSpan = document.createElement('span');
      typeSpan.className = 'tx-meta__type';
      // Capitalise first letter
      typeSpan.textContent = tx.type.charAt(0).toUpperCase() + tx.type.slice(1);

      const dateSpan = document.createElement('span');
      dateSpan.className = 'tx-meta__date';
      dateSpan.textContent = tx.date;

      metaDiv.appendChild(categorySpan);
      metaDiv.appendChild(typeSpan);
      metaDiv.appendChild(dateSpan);

      // Delete button
      const deleteBtn = document.createElement('button');
      deleteBtn.className = 'btn-delete';
      deleteBtn.setAttribute('aria-label', 'Delete transaction: ' + tx.description);
      deleteBtn.textContent = 'Delete';
      deleteBtn.addEventListener('click', function () {
        handleDeleteTransaction(tx.id);
      });

      article.appendChild(descDiv);
      article.appendChild(amountDiv);
      article.appendChild(metaDiv);
      article.appendChild(deleteBtn);

      list.appendChild(article);
    });
  }

  /**
   * Prompt the user to confirm deletion, then remove the transaction from
   * AppState and re-render all affected UI regions.
   *
   * Follows the write-before-render rule: localStorage is updated before
   * AppState is mutated. On write failure the operation is aborted and a
   * toast is shown.
   *
   * Satisfies Requirements 2.2, 2.3, 2.4, 2.6.
   *
   * @param {string} id - The id of the transaction to delete.
   */
  function handleDeleteTransaction(id) {
    var confirmed = confirm('Are you sure you want to delete this transaction?');
    if (!confirmed) return;

    var updated = AppState.transactions.filter(function (t) { return t.id !== id; });

    try {
      saveState(STORAGE_KEYS.transactions, updated);
    } catch (err) {
      showToast(err.message);
      return; // Abort — do NOT mutate AppState on write failure.
    }

    AppState.transactions = updated;

    renderTransactionList();
    renderSummaryPanel();
    renderChart();
    renderBudgetSection();
  }

  /**
   * Handle a sort-option selection from the Sort Control.
   *
   * Sets `AppState.activeSort`, updates the active visual state on the sort
   * buttons, and re-renders the transaction list within 200 ms.
   *
   * Satisfies Requirements 6.1, 6.2, 6.3.
   *
   * @param {string} option - One of 'amount-asc', 'amount-desc', 'cat-az', 'cat-za'.
   */
  function handleSort(option) {
    AppState.activeSort = option;

    // Update active visual state on sort buttons.
    var sortButtons = document.querySelectorAll('.btn-sort');
    sortButtons.forEach(function (btn) {
      if (btn.dataset.sort === option) {
        btn.classList.add('active');
        btn.setAttribute('aria-pressed', 'true');
      } else {
        btn.classList.remove('active');
        btn.setAttribute('aria-pressed', 'false');
      }
    });

    renderTransactionList();
  }

  /**
   * Build the sort controls UI inside `#sort-controls` and wire up click
   * handlers for each sort button.
   *
   * Called once from `initApp()` after state is hydrated.
   */
  function initSortControls() {
    var container = document.getElementById('sort-controls');
    if (!container) return;

    var heading = document.createElement('h2');
    heading.textContent = 'Sort Transactions';

    var group = document.createElement('div');
    group.className = 'sort-buttons';
    group.setAttribute('role', 'group');
    group.setAttribute('aria-label', 'Sort options');

    var sortOptions = [
      { key: 'amount-asc',  label: 'Amount \u2191' },
      { key: 'amount-desc', label: 'Amount \u2193' },
      { key: 'cat-az',      label: 'Category A\u2013Z' },
      { key: 'cat-za',      label: 'Category Z\u2013A' },
    ];

    sortOptions.forEach(function (opt) {
      var btn = document.createElement('button');
      btn.className = 'btn-sort';
      btn.dataset.sort = opt.key;
      btn.textContent = opt.label;
      btn.setAttribute('aria-pressed', AppState.activeSort === opt.key ? 'true' : 'false');

      if (AppState.activeSort === opt.key) {
        btn.classList.add('active');
      }

      btn.addEventListener('click', function () {
        handleSort(opt.key);
      });

      group.appendChild(btn);
    });

    container.appendChild(heading);
    container.appendChild(group);
  }

  // =========================================================================
  // Summary Panel — Task 6
  // =========================================================================

  /**
   * Compute total income, total expenses, and net balance from a transaction array.
   *
   * Iterates over `transactions` and accumulates amounts by type. Returns a
   * plain object so callers can format and display the values however they need.
   *
   * @param {Array<Object>} transactions - Array of transaction objects from AppState.
   * @returns {{ income: number, expenses: number, balance: number }}
   *   income   — sum of all transactions with type === 'income'
   *   expenses — sum of all transactions with type === 'expense'
   *   balance  — income − expenses
   *
   * Satisfies Requirement 1.5.
   */
  function computeSummary(transactions) {
    var income = 0;
    var expenses = 0;

    transactions.forEach(function (tx) {
      if (tx.type === 'income') {
        income += tx.amount;
      } else if (tx.type === 'expense') {
        expenses += tx.amount;
      }
    });

    return {
      income: income,
      expenses: expenses,
      balance: income - expenses,
    };
  }

  /**
   * Compute the current summary and update the DOM inside `#summary-panel`.
   *
   * Reads from AppState.transactions (never writes to localStorage).
   * Formats all values to exactly two decimal places.
   * Applies `balance--positive` (green) when balance ≥ 0 and
   * `balance--negative` (red) when balance < 0, plus a `+`/`−` prefix so the
   * state is never communicated by color alone.
   *
   * Satisfies Requirements 1.5, 2.4.
   */
  function renderSummaryPanel() {
    var summary = computeSummary(AppState.transactions);

    var incomeEl  = document.getElementById('summary-income');
    var expensesEl = document.getElementById('summary-expenses');
    var balanceEl = document.getElementById('summary-balance');

    if (!incomeEl || !expensesEl || !balanceEl) return;

    incomeEl.textContent   = '$' + summary.income.toFixed(2);
    expensesEl.textContent = '$' + summary.expenses.toFixed(2);

    // Prefix balance with + or − for non-color accessibility.
    var balancePrefix = summary.balance >= 0 ? '+' : '−';
    var balanceAbs    = Math.abs(summary.balance).toFixed(2);
    balanceEl.textContent = balancePrefix + '$' + balanceAbs;

    // Swap visual class on the balance value element.
    balanceEl.classList.remove('balance--positive', 'balance--negative');
    if (summary.balance >= 0) {
      balanceEl.classList.add('balance--positive');
    } else {
      balanceEl.classList.add('balance--negative');
    }
  }

  // =========================================================================
  // Chart Rendering — Task 7
  // =========================================================================

  /**
   * Consistent color palette for the 8 default categories.
   * Custom categories beyond these 8 cycle through the EXTRA_COLORS array so
   * they always receive a distinct, stable color across re-renders.
   */
  var CATEGORY_COLORS = {
    'Food':          '#e74c3c',
    'Transport':     '#3498db',
    'Utilities':     '#2ecc71',
    'Entertainment': '#9b59b6',
    'Healthcare':    '#1abc9c',
    'Shopping':      '#e67e22',
    'Education':     '#f1c40f',
    'Other':         '#95a5a6',
  };

  /** Extra colors cycled through for any custom categories. */
  var EXTRA_COLORS = [
    '#c0392b', '#2980b9', '#27ae60', '#8e44ad',
    '#16a085', '#d35400', '#f39c12', '#7f8c8d',
    '#e91e63', '#00bcd4', '#8bc34a', '#ff5722',
  ];

  /**
   * Return a consistent canvas fill color for `category`.
   * Default categories have a fixed color; custom categories receive a color
   * by cycling through EXTRA_COLORS based on their index in customCategories.
   *
   * @param {string} category
   * @returns {string} CSS color string.
   */
  function getCategoryColor(category) {
    if (CATEGORY_COLORS[category]) {
      return CATEGORY_COLORS[category];
    }
    // Custom category — assign by index so color is stable across re-renders.
    var idx = AppState.customCategories.indexOf(category);
    if (idx === -1) idx = 0;
    return EXTRA_COLORS[idx % EXTRA_COLORS.length];
  }

  /**
   * Clear and re-render the spending bar chart inside `#spending-chart`.
   *
   * - If there are no expense transactions: hides the canvas and shows
   *   `#chart-placeholder` (satisfies Requirement 4.3).
   * - Otherwise: hides the placeholder, shows the canvas, clears it, and
   *   draws a horizontal bar chart with labeled bars showing category name,
   *   total amount ($X.XX), and percentage of total expenses
   *   (satisfies Requirements 4.2, 4.4).
   * - A legend below the chart repeats the same information in text form.
   * - Re-draws from scratch on every call so the chart always reflects the
   *   current AppState (satisfies Requirement 4.2).
   */
  function renderChart() {
    var canvas      = document.getElementById('spending-chart');
    var placeholder = document.getElementById('chart-placeholder');
    var legend      = document.getElementById('chart-legend');

    if (!canvas || !placeholder) return;

    var totals = computeCategoryTotals(AppState.transactions);

    // --- No expense data: show placeholder, hide canvas ---
    if (totals.size === 0) {
      canvas.style.display   = 'none';
      placeholder.style.display = '';
      if (legend) legend.innerHTML = '';
      return;
    }

    // --- Has data: show canvas, hide placeholder ---
    placeholder.style.display = 'none';
    canvas.style.display      = '';

    // Compute total for percentage calculations.
    var grandTotal = 0;
    totals.forEach(function (amount) { grandTotal += amount; });

    // Sort categories by spend descending for a nicer chart layout.
    var entries = [];
    totals.forEach(function (amount, category) {
      entries.push({ category: category, amount: amount });
    });
    entries.sort(function (a, b) { return b.amount - a.amount; });

    // ---- Canvas sizing ----
    var BAR_HEIGHT    = 36;   // px per bar
    var BAR_GAP       = 14;   // px between bars
    var PADDING_TOP   = 24;
    var PADDING_BOTTOM = 16;
    var PADDING_LEFT  = 160;  // space for category labels
    var PADDING_RIGHT = 120;  // space for value labels

    var numBars   = entries.length;
    var chartH    = PADDING_TOP + numBars * BAR_HEIGHT + (numBars - 1) * BAR_GAP + PADDING_BOTTOM;
    var chartW    = canvas.parentElement ? canvas.parentElement.clientWidth || 600 : 600;
    if (chartW < 300) chartW = 300;

    canvas.width  = chartW;
    canvas.height = chartH;

    var ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, chartW, chartH);

    // Drawable width for bars.
    var drawW = chartW - PADDING_LEFT - PADDING_RIGHT;
    var maxAmount = entries[0].amount; // already sorted descending

    entries.forEach(function (entry, i) {
      var y        = PADDING_TOP + i * (BAR_HEIGHT + BAR_GAP);
      var barW     = drawW * (entry.amount / maxAmount);
      var pct      = (entry.amount / grandTotal * 100).toFixed(1);
      var color    = getCategoryColor(entry.category);

      // --- Category label (left side) ---
      ctx.fillStyle = getComputedStyle(document.documentElement)
        .getPropertyValue('--color-text') || '#1a1a1a';
      ctx.font      = '13px system-ui, sans-serif';
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      ctx.fillText(entry.category, PADDING_LEFT - 10, y + BAR_HEIGHT / 2);

      // --- Bar ---
      ctx.fillStyle = color;
      ctx.beginPath();
      if (ctx.roundRect) {
        ctx.roundRect(PADDING_LEFT, y, barW, BAR_HEIGHT, 4);
      } else {
        ctx.rect(PADDING_LEFT, y, barW, BAR_HEIGHT);
      }
      ctx.fill();

      // --- Value label (right of bar): $X.XX · XX.X% ---
      ctx.fillStyle = getComputedStyle(document.documentElement)
        .getPropertyValue('--color-text') || '#1a1a1a';
      ctx.textAlign    = 'left';
      ctx.textBaseline = 'middle';
      var label = '$' + entry.amount.toFixed(2) + ' · ' + pct + '%';
      ctx.fillText(label, PADDING_LEFT + barW + 8, y + BAR_HEIGHT / 2);
    });

    // ---- Legend ----
    if (!legend) return;
    legend.innerHTML = '';

    entries.forEach(function (entry) {
      var pct   = (entry.amount / grandTotal * 100).toFixed(1);
      var color = getCategoryColor(entry.category);

      var item = document.createElement('div');
      item.className = 'chart-legend__item';

      var swatch = document.createElement('span');
      swatch.className = 'chart-legend__swatch';
      swatch.style.background = color;
      swatch.setAttribute('aria-hidden', 'true');

      var text = document.createElement('span');
      text.className = 'chart-legend__text';
      text.textContent = entry.category + ': $' + entry.amount.toFixed(2) + ' (' + pct + '%)';

      item.appendChild(swatch);
      item.appendChild(text);
      legend.appendChild(item);
    });
  }

  // =========================================================================
  // Custom Category Management — Task 9
  // =========================================================================

  /**
   * Validate a proposed custom category name.
   *
   * Rules (satisfies Requirements 5.1, 5.4):
   * - Must be between 1 and 50 characters (after trimming).
   * - Must not duplicate any existing category name, case-insensitively
   *   (checked against both DEFAULT_CATEGORIES and AppState.customCategories).
   *
   * @param {string} name - The raw name entered by the user.
   * @returns {string|null} An error message string on failure, or `null` on success.
   */
  function validateCategoryName(name) {
    const trimmed = (name || '').trim();

    // Empty or too long.
    if (trimmed.length < 1 || trimmed.length > 50) {
      return 'Name must be 1–50 characters.';
    }

    // Duplicate check — case-insensitive against all current categories.
    const lower = trimmed.toLowerCase();
    const allExisting = getAllCategories();
    const isDuplicate = allExisting.some(function (cat) {
      return cat.toLowerCase() === lower;
    });

    if (isDuplicate) {
      return 'A category with this name already exists.';
    }

    return null;
  }

  /**
   * Handle the Add Custom Category action.
   *
   * Flow (write-before-render, satisfies Requirements 5.2, 5.3, 5.5, 5.7):
   * 1. Check the 20-category cap first; show the cap error if reached.
   * 2. Validate the trimmed name via validateCategoryName; show inline error on failure.
   * 3. Persist updated categories array to localStorage via saveState.
   *    On write failure: show toast and abort — do NOT mutate AppState.
   * 4. Push new name to AppState.customCategories.
   * 5. Refresh all category <select> dropdowns via populateCategorySelects.
   * 6. Re-render the budget section to add a new row for the new category.
   * 7. Clear the category name input.
   *
   * @param {string} name        - The raw category name from the input field.
   * @param {HTMLInputElement} inputEl   - The text input element (cleared on success).
   * @param {HTMLSpanElement}  errorSpan - The inline error <span> to update.
   */
  function handleAddCategory(name, inputEl, errorSpan) {
    // --- Clear previous inline error ---
    errorSpan.textContent = '';
    errorSpan.classList.remove('visible');

    // --- Cap check: 20 custom categories maximum (Req 5.7) ---
    if (AppState.customCategories.length >= 20) {
      errorSpan.textContent = 'Maximum of 20 custom categories reached.';
      errorSpan.classList.add('visible');
      return;
    }

    // --- Name validation (Req 5.1, 5.4) ---
    const trimmed = (name || '').trim();
    const validationError = validateCategoryName(trimmed);
    if (validationError) {
      errorSpan.textContent = validationError;
      errorSpan.classList.add('visible');
      return;
    }

    // --- Write-before-render: persist first (Req 5.5, 9.5, 9.6) ---
    const updatedCategories = AppState.customCategories.concat([trimmed]);
    try {
      saveState(STORAGE_KEYS.categories, updatedCategories);
    } catch (err) {
      showToast(err.message);
      return; // Abort — do NOT mutate AppState on write failure.
    }

    // --- Persist succeeded: mutate AppState then re-render (Req 5.2, 5.3) ---
    AppState.customCategories.push(trimmed);

    // Refresh all category <select> dropdowns so the new category is selectable.
    populateCategorySelects();

    // Add a new budget row for the new category.
    renderBudgetSection();

    // Clear the input field.
    inputEl.value = '';
  }

  /**
   * Build and inject the Custom Category UI into the `#custom-category` section.
   *
   * Renders:
   * - A section heading
   * - A text input (max 50 chars) with a matching label
   * - An "Add Category" button
   * - An inline error <span>
   *
   * Wires the button click (and Enter-key on the input) to handleAddCategory.
   *
   * Called once from initApp() after state is hydrated.
   */
  function initCustomCategory() {
    const section = document.getElementById('custom-category');
    if (!section) return;

    // Section heading
    const heading = document.createElement('h2');
    heading.textContent = 'Add Custom Category';
    section.appendChild(heading);

    // Wrapper for the input + button + error
    const controlRow = document.createElement('div');
    controlRow.className = 'custom-category__row';

    // Label (visually positioned above the input)
    const label = document.createElement('label');
    label.htmlFor = 'category-name-input';
    label.className = 'custom-category__label';
    label.textContent = 'Category name';

    // Text input
    const input = document.createElement('input');
    input.type = 'text';
    input.id = 'category-name-input';
    input.className = 'custom-category__input';
    input.maxLength = 50;
    input.placeholder = 'e.g. Hobbies';
    input.setAttribute('aria-describedby', 'category-name-error');
    input.setAttribute('aria-label', 'New category name');

    // Add button
    const addBtn = document.createElement('button');
    addBtn.type = 'button';
    addBtn.className = 'btn-primary custom-category__btn';
    addBtn.textContent = 'Add Category';

    // Inline error span
    const errorSpan = document.createElement('span');
    errorSpan.className = 'field-error';
    errorSpan.id = 'category-name-error';
    errorSpan.setAttribute('aria-live', 'polite');

    // Wire up event handlers
    addBtn.addEventListener('click', function () {
      handleAddCategory(input.value, input, errorSpan);
    });

    // Also allow submitting with Enter key from the input
    input.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleAddCategory(input.value, input, errorSpan);
      }
    });

    // Assemble the DOM
    controlRow.appendChild(label);
    controlRow.appendChild(input);
    controlRow.appendChild(addBtn);
    controlRow.appendChild(errorSpan);
    section.appendChild(controlRow);
  }

  // =========================================================================
  // Budget Management — Task 8
  // =========================================================================

  /**
   * Validate a raw budget limit value.
   *
   * Rules:
   * - Must be numeric (parseable as a finite number)
   * - Must be > 0
   * - Must be ≤ 999,999,999.99
   *
   * @param {string|number} value - The raw value from the budget input.
   * @returns {string|null} An error message string on failure, or `null` on success.
   */
  function validateBudgetInput(value) {
    const num = Number(value);

    if (value === '' || value === null || value === undefined || isNaN(num) || !isFinite(num)) {
      return 'Please enter a valid number.';
    }

    if (num <= 0) {
      return 'Budget limit must be greater than zero.';
    }

    if (num > 999999999.99) {
      return 'Budget limit exceeds the maximum allowed value.';
    }

    return null;
  }

  /**
   * Filter `transactions` to expense entries only, group by category, and
   * sum the amounts within each group.
   *
   * @param {Array<Object>} transactions - Array of transaction objects.
   * @returns {Map<string, number>} Map of category name → total expense amount.
   */
  function computeCategoryTotals(transactions) {
    const totals = new Map();

    transactions.forEach(function (tx) {
      if (tx.type !== 'expense') return;
      const prev = totals.get(tx.category) || 0;
      totals.set(tx.category, prev + tx.amount);
    });

    return totals;
  }

  /**
   * Convert a category name to a safe DOM id fragment by replacing any
   * character that is not alphanumeric with a hyphen.
   *
   * @param {string} category - Raw category name (may contain spaces/symbols).
   * @returns {string} Safe id fragment.
   */
  function safeCategoryId(category) {
    return category.replace(/[^a-zA-Z0-9]/g, '-');
  }

  /**
   * Handle the Save button click for a budget row.
   *
   * Flow (write-before-render):
   * 1. Validate the raw input value; display inline error and return on failure.
   * 2. Persist the updated budgets object to localStorage via saveState.
   *    - On write failure: show toast and abort — do NOT mutate AppState.
   * 3. On success: update AppState.budgets and call renderBudgetSection().
   *
   * Satisfies Requirements 3.x, 9.5, 9.6.
   *
   * @param {string} category  - The category name for which the budget is being set.
   * @param {string} inputValue - The raw string value from the budget input element.
   */
  function handleSetBudget(category, inputValue) {
    const safeId   = safeCategoryId(category);
    const errorSpan = document.getElementById('budget-error-' + safeId);

    // Clear any previous error.
    if (errorSpan) {
      errorSpan.textContent = '';
      errorSpan.classList.remove('visible');
    }

    // Validate.
    const error = validateBudgetInput(inputValue);
    if (error) {
      if (errorSpan) {
        errorSpan.textContent = error;
        errorSpan.classList.add('visible');
      }
      return;
    }

    const limit       = Number(inputValue);
    const newBudgets  = Object.assign({}, AppState.budgets, { [category]: limit });

    // Write-before-render.
    try {
      saveState(STORAGE_KEYS.budgets, newBudgets);
    } catch (err) {
      showToast(err.message);
      return; // Abort — do NOT mutate AppState.
    }

    AppState.budgets[category] = limit;
    renderBudgetSection();
  }

  /**
   * Clear and re-render the `#budget-section` container.
   *
   * For every category returned by `getAllCategories()`:
   * - Renders a row with: name label, numeric input (pre-filled if budget set),
   *   a Save button, an inline error span, and an over-budget indicator span.
   * - Shows the "⚠ Over Budget" indicator ONLY when a budget limit is set AND
   *   the category's total expenses ≥ the limit.
   *
   * Satisfies Requirements 3.x.
   */
  function renderBudgetSection() {
    const section = document.getElementById('budget-section');
    if (!section) return;

    section.innerHTML = '';

    const heading = document.createElement('h2');
    heading.textContent = 'Budget Limits';
    section.appendChild(heading);

    const categories  = getAllCategories();
    const spending    = computeCategoryTotals(AppState.transactions);

    categories.forEach(function (category) {
      const safeId      = safeCategoryId(category);
      const budgetLimit = AppState.budgets[category];          // undefined if not set
      const totalSpent  = spending.get(category) || 0;
      const isOver      = budgetLimit !== undefined && totalSpent >= budgetLimit;

      // Row container
      const row = document.createElement('div');
      row.className = 'budget-row';

      // Category name label
      const nameSpan = document.createElement('span');
      nameSpan.className = 'budget-row__name';
      nameSpan.textContent = category;

      // Numeric input
      const input = document.createElement('input');
      input.type = 'number';
      input.className = 'budget-row__input';
      input.id = 'budget-input-' + safeId;
      input.min = '0.01';
      input.step = '0.01';
      input.placeholder = 'e.g. 200.00';
      input.setAttribute('aria-label', 'Budget limit for ' + category);
      if (budgetLimit !== undefined) {
        input.value = budgetLimit;
      }

      // Save button
      const saveBtn = document.createElement('button');
      saveBtn.type = 'button';
      saveBtn.className = 'btn-save-budget';
      saveBtn.textContent = 'Save';
      saveBtn.setAttribute('aria-label', 'Save budget for ' + category);
      saveBtn.addEventListener('click', function () {
        handleSetBudget(category, input.value);
      });

      // Inline error span
      const errorSpan = document.createElement('span');
      errorSpan.className = 'budget-error field-error';
      errorSpan.id = 'budget-error-' + safeId;
      errorSpan.setAttribute('aria-live', 'polite');

      // Over-budget indicator
      const indicator = document.createElement('span');
      indicator.className = 'budget-indicator' + (isOver ? ' budget-indicator--active' : '');
      indicator.id = 'budget-indicator-' + safeId;
      indicator.setAttribute('aria-live', 'polite');
      if (isOver) {
        indicator.textContent = '⚠ Over Budget';
      }

      row.appendChild(nameSpan);
      row.appendChild(input);
      row.appendChild(saveBtn);
      row.appendChild(errorSpan);
      row.appendChild(indicator);
      section.appendChild(row);
    });
  }

  // =========================================================================
  // App Bootstrap
  // =========================================================================

  /**
   * Validate that a raw transaction object has all required fields present and
   * non-empty. Transactions that fail this check are silently dropped during
   * the load phase to avoid corrupting AppState with partial data.
   *
   * Required fields: id, type, amount, description, category, date.
   *
   * @param {*} tx - The value to validate.
   * @returns {boolean} `true` if the transaction has all required fields.
   */
  function isValidTransactionShape(tx) {
    if (!tx || typeof tx !== 'object') return false;
    const required = ['id', 'type', 'amount', 'description', 'category', 'date'];
    return required.every(function (field) {
      return tx[field] !== undefined && tx[field] !== null && tx[field] !== '';
    });
  }

  /**
   * Entry point for the application. Called once on `DOMContentLoaded`.
   *
   * Execution order:
   * 1. Read localStorage via `loadState()`.
   * 2. If any key is corrupt → reset to empty defaults + show toast.
   *    Otherwise → hydrate AppState from stored values, falling back to
   *    defaults for any missing keys.
   * 3. Apply the persisted (or default) theme FIRST to prevent theme flash.
   * 4. Populate all category `<select>` dropdowns.
   *
   * Satisfies Requirements 8.4, 8.5, 9.1, 9.2, 9.3, 9.4.
   */
  function initApp() {
    const loaded = loadState();

    // ---- Corrupt-data check ------------------------------------------------
    const anyCorrupt =
      loaded.transactions.corrupt ||
      loaded.budgets.corrupt ||
      loaded.categories.corrupt ||
      loaded.theme.corrupt;

    if (anyCorrupt) {
      // Reset in-memory state to safe defaults (satisfies Requirements 9.3, 9.4).
      AppState.transactions     = [];
      AppState.budgets          = {};
      AppState.customCategories = [];
      AppState.theme            = 'light';
      AppState.activeSort       = null;
      AppState.activeFilter     = null;

      showToast('Previous data could not be loaded. Starting fresh.');
    } else {
      // ---- Hydrate AppState from stored values (fall back to defaults) ------

      // transactions — silently drop any entries missing required fields.
      if (!loaded.transactions.missing && Array.isArray(loaded.transactions.data)) {
        AppState.transactions = loaded.transactions.data.filter(isValidTransactionShape);
      } else {
        AppState.transactions = [];
      }

      // budgets
      if (!loaded.budgets.missing && loaded.budgets.data !== null) {
        AppState.budgets = loaded.budgets.data;
      } else {
        AppState.budgets = {};
      }

      // customCategories
      if (!loaded.categories.missing && Array.isArray(loaded.categories.data)) {
        AppState.customCategories = loaded.categories.data;
      } else {
        AppState.customCategories = [];
      }

      // theme — default to 'light' when missing (satisfies Requirement 8.5).
      if (!loaded.theme.missing && loaded.theme.data !== null) {
        AppState.theme = loaded.theme.data;
      } else {
        AppState.theme = 'light';
      }
    }

    // ---- Apply theme BEFORE any render to prevent flash (Req 8.4) ----------
    applyTheme(AppState.theme);

    // ---- Wire theme-toggle button (Req 8.1, 8.2, 8.3) ----------------------
    const themeBtn = document.getElementById('theme-toggle');
    if (themeBtn) {
      themeBtn.addEventListener('click', handleThemeToggle);
    }

    // ---- Populate category dropdowns ----------------------------------------
    populateCategorySelects();

    // ---- Wire transaction form submit handler --------------------------------
    const form = document.getElementById('add-transaction-form');
    if (form) {
      form.addEventListener('submit', handleAddTransaction);
    }

    // ---- Build custom category control (Task 9) ------------------------------
    initCustomCategory();

    // ---- Build sort controls and render initial transaction list -------------
    initSortControls();
    renderTransactionList();
    renderSummaryPanel();
    renderChart();
    renderBudgetSection();
  }

  // Wire initApp to DOMContentLoaded.
  document.addEventListener('DOMContentLoaded', initApp);

  // =========================================================================
  // Expose utilities to the browser console for acceptance-criteria testing.
  // Remove or guard this block in a production build.
  // =========================================================================
  window.__ebv = {
    AppState,
    DEFAULT_CATEGORIES,
    STORAGE_KEYS,
    saveState,
    loadState,
    showToast,
    getAllCategories,
    applyTheme,
    handleThemeToggle,
    populateCategorySelects,
    validateTransactionForm,
    handleAddTransaction,
    getFilteredTransactions,
    renderTransactionList,
    handleDeleteTransaction,
    handleSort,
    computeSummary,
    renderSummaryPanel,
    CATEGORY_COLORS,
    getCategoryColor,
    renderChart,
    validateBudgetInput,
    computeCategoryTotals,
    handleSetBudget,
    renderBudgetSection,
    validateCategoryName,
    handleAddCategory,
    initCustomCategory,
    initApp,
  };

})();
