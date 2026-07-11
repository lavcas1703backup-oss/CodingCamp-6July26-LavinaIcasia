import { createLocalStorageMock } from './localStorage.mock.js';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { beforeEach } from 'vitest';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Install localStorage mock globally before any test
const mockStorage = createLocalStorageMock();
Object.defineProperty(global, 'localStorage', {
  value: mockStorage,
  writable: true,
});

// Read app.js source once
const appSrc = readFileSync(
  resolve(__dirname, '../../js/app.js'),
  'utf-8'
);

// Before each test: clear storage, reset window.__ebv, re-execute app.js IIFE
beforeEach(() => {
  mockStorage.clear();

  // Reset DOM to minimal state needed by app.js
  document.documentElement.removeAttribute('data-theme');
  document.body.innerHTML = `
    <header>
      <button id="theme-toggle">☀ Light</button>
    </header>
    <main>
      <section id="summary-panel">
        <span id="summary-income"></span>
        <span id="summary-expenses"></span>
        <span id="summary-balance"></span>
      </section>
      <section id="chart-section">
        <canvas id="spending-chart"></canvas>
        <p id="chart-placeholder" style="display:none"></p>
        <div id="chart-legend"></div>
      </section>
      <section id="budget-section"></section>
      <section id="transaction-form">
        <form id="add-transaction-form">
          <select id="tx-type" class="category-select"><option value="income">Income</option><option value="expense">Expense</option></select>
          <span id="tx-type-error" class="field-error"></span>
          <input id="tx-amount" type="number" />
          <span id="tx-amount-error" class="field-error"></span>
          <input id="tx-description" type="text" />
          <span id="tx-description-error" class="field-error"></span>
          <select id="tx-category" class="category-select"></select>
          <span id="tx-category-error" class="field-error"></span>
          <input id="tx-date" type="date" />
          <span id="tx-date-error" class="field-error"></span>
          <button type="submit">Add</button>
        </form>
      </section>
      <section id="custom-category"></section>
      <section id="sort-controls"></section>
      <section id="transaction-list"></section>
    </main>
  `;

  // Re-execute the IIFE to get a fresh window.__ebv
  // Use Function constructor to run in global scope with access to window/document
  const fn = new Function(appSrc);
  fn();
});
