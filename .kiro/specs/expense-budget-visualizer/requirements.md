# Requirements Document

## Introduction

The Expense & Budget Visualizer is a client-side web application that allows users to track personal expenses, set budgets, and visualize spending patterns through charts and summaries. The application runs entirely in the browser using HTML, CSS, and Vanilla JavaScript, with all data persisted in the browser's Local Storage. It requires no backend server, no account registration, and no complex setup. Users can add transactions, categorize spending, sort and filter entries, toggle dark/light mode, and receive visual alerts when spending approaches or exceeds budget limits.

---

## Glossary

- **App**: The Expense & Budget Visualizer web application running in the browser.
- **Transaction**: A single record of income or expense entered by the user, containing an amount, category, description, and date.
- **Category**: A label used to group transactions (e.g., Food, Transport, Utilities). Categories may be built-in or user-defined.
- **Custom_Category**: A user-defined category created in addition to the built-in default categories.
- **Budget**: A user-defined monthly spending limit associated with a specific category or the overall total.
- **Budget_Limit**: The numeric threshold set by the user for a given Category or overall spending.
- **Local_Storage**: The browser's Web Storage API used to persist all application data client-side.
- **Transaction_List**: The rendered list of all transactions currently displayed in the App.
- **Summary_Panel**: The UI area that shows total income, total expenses, and net balance.
- **Chart**: A visual representation (e.g., bar or pie chart) of spending by category rendered using the Canvas API or SVG.
- **Sort_Control**: The UI control that allows the user to sort the Transaction_List.
- **Theme**: The visual color scheme of the App, either "light" or "dark".
- **Theme_Toggle**: The UI control that switches between light and dark Theme.
- **Spending_Indicator**: A visual cue (color change or warning label) applied to a category when spending meets or exceeds the Budget_Limit.
- **Filter**: A mechanism for narrowing the displayed transactions by category, date range, or other criteria.

---

## Requirements

### Requirement 1: Add and Record Transactions

**User Story:** As a user, I want to add income and expense transactions with a description, amount, category, and date, so that I can maintain an accurate record of my finances.

#### Acceptance Criteria

1. THE App SHALL provide a form with fields for transaction type (income or expense), amount, description, category, and date.
2. WHEN the user submits the transaction form with all required fields filled, THE App SHALL save the Transaction to Local_Storage, display it in the Transaction_List within 300 ms, and reset the form fields to their default empty state.
3. IF the user submits the transaction form with any required field empty, THEN THE App SHALL display an inline validation message identifying each missing field and SHALL NOT save the Transaction.
4. IF the user enters a non-numeric value, a value less than or equal to zero, a value greater than 999,999,999.99, or a value with more than two decimal places in the amount field, THEN THE App SHALL display an inline validation error and SHALL NOT save the Transaction.
5. WHEN a Transaction is saved, THE App SHALL update the Summary_Panel to reflect the new total income, total expenses, and net balance.
6. WHEN a Transaction is saved, THE App SHALL update the Chart to reflect the updated spending distribution.
7. IF the user enters more than 100 characters in the description field, THEN THE App SHALL display an inline validation error and SHALL NOT save the Transaction.
8. IF the user selects a date that is in the future (after the current calendar day), THEN THE App SHALL display an inline validation error and SHALL NOT save the Transaction.

---

### Requirement 2: View and Manage Transactions

**User Story:** As a user, I want to view all my recorded transactions and delete ones that are incorrect, so that I can keep my financial data accurate.

#### Acceptance Criteria

1. THE App SHALL display all saved Transactions in the Transaction_List in descending date order (most recent first), showing the description, amount, category, type, and date for each entry.
2. WHEN the user clicks the delete control on a Transaction, THE App SHALL display a confirmation prompt before proceeding.
3. WHEN the user confirms deletion, THE App SHALL remove the Transaction from Local_Storage and from the Transaction_List.
4. WHEN a Transaction is deleted, THE App SHALL update the Summary_Panel and the Chart to reflect the removal.
5. WHILE the Transaction_List contains no Transactions, THE App SHALL display an empty-state message indicating that no transactions have been recorded.
6. IF Local_Storage write fails during a deletion, THEN THE App SHALL display an error message and SHALL NOT remove the Transaction from the Transaction_List.

---

### Requirement 3: Set and Display Budgets

**User Story:** As a user, I want to set a spending budget for each category, so that I can monitor whether my expenses stay within my planned limits.

#### Acceptance Criteria

1. THE App SHALL allow the user to set a Budget_Limit for each available Category.
2. WHEN the user saves a Budget_Limit for a Category, THE App SHALL persist the value in Local_Storage and display the Budget_Limit alongside the corresponding Category in the budget section.
3. IF the user enters a non-numeric value, a value less than or equal to zero, or a value greater than 999,999,999.99 as a Budget_Limit, THEN THE App SHALL display a validation error and SHALL NOT save the value.
4. WHEN total expense Transactions for a Category reach or exceed the Budget_Limit for that Category, THE App SHALL display the Spending_Indicator for that Category.
5. WHEN total expense Transactions for a Category fall below the Budget_Limit (e.g., after a deletion), THE App SHALL remove the Spending_Indicator for that Category.
6. WHILE no Budget_Limit has been set for a Category, THE App SHALL NOT display a Spending_Indicator for that Category.

---

### Requirement 4: Visualize Spending with Charts

**User Story:** As a user, I want to see a visual chart of my spending by category, so that I can quickly understand where my money is going.

#### Acceptance Criteria

1. WHEN the App loads, THE App SHALL render a Chart showing the distribution of expense Transactions across all Categories.
2. WHEN Transactions are added or deleted, THE App SHALL re-render the Chart to reflect the current data without requiring a page reload.
3. WHILE no expense Transactions exist, THE App SHALL display a placeholder message inside the Chart area indicating there is no data to display.
4. WHEN the Chart is rendered, THE Chart SHALL label each segment or bar with the Category name, its corresponding total amount, and its percentage of total expenses.

---

### Requirement 5: Add Custom Categories

**User Story:** As a user, I want to create my own spending categories beyond the defaults, so that I can organize transactions in a way that matches my personal spending habits.

#### Acceptance Criteria

1. THE App SHALL provide a control that allows the user to create a Custom_Category by entering a unique name of up to 50 characters.
2. WHEN the user submits a valid Custom_Category name, THE App SHALL add the Custom_Category to the list of available categories without requiring a page reload.
3. WHEN a new Custom_Category is saved, THE App SHALL persist it in Local_Storage and make it immediately selectable in all category selection controls.
4. IF the user submits a Custom_Category name that is empty, exceeds 50 characters, or duplicates an existing category name (case-insensitive), THEN THE App SHALL display a validation error and SHALL NOT save the entry.
5. IF Local_Storage write fails when saving a Custom_Category, THEN THE App SHALL display an error message and SHALL NOT add the Custom_Category to the category list.
6. WHEN a Custom_Category has at least one assigned Transaction or a Budget_Limit set, THE App SHALL include it in the Chart and the budget section alongside the default categories.
7. THE App SHALL allow the user to create no more than 20 Custom_Categories; IF the user attempts to create a 21st Custom_Category, THEN THE App SHALL display an error message and SHALL NOT save the entry.

---

### Requirement 6: Sort Transactions

**User Story:** As a user, I want to sort my transaction list by amount or by category, so that I can find and review entries more efficiently.

#### Acceptance Criteria

1. THE App SHALL provide a Sort_Control with options to sort the Transaction_List by amount (ascending and descending) and by category (A–Z and Z–A).
2. WHEN the user selects a sort option from the Sort_Control, THE App SHALL re-render the Transaction_List in the selected order within 200 milliseconds, applied to the currently displayed set of transactions.
3. THE Sort_Control SHALL visually distinguish the currently active sort option from inactive options.
4. WHEN new Transactions are added, THE App SHALL maintain the currently active sort order in the Transaction_List.
5. WHILE no sort option has been explicitly selected by the user, THE App SHALL display Transactions in reverse chronological order (most recent first) as the default order.

---

### Requirement 7: Highlight Spending Over Budget Limit

**User Story:** As a user, I want to see a clear visual warning when my spending in a category exceeds the budget I set, so that I can take action to control my finances.

#### Acceptance Criteria

1. WHEN total expense Transactions for a Category reach or exceed the Budget_Limit for that Category, THE App SHALL apply the Spending_Indicator to the Category entry in the budget section.
2. THE Spending_Indicator SHALL visually distinguish the over-budget Category from categories within budget using both a distinct color and a text label or icon, so that the warning is accessible without relying on color alone.
3. WHEN a Transaction is deleted and the remaining total for a Category falls below its Budget_Limit, THE App SHALL remove the Spending_Indicator from that Category entry.
4. WHILE no Budget_Limit has been set for a Category, THE App SHALL NOT display a Spending_Indicator for that Category.
5. WHEN the user updates the Budget_Limit for a Category to a value above the current total expense for that Category, THE App SHALL remove the Spending_Indicator from that Category entry.

---

### Requirement 8: Dark/Light Mode Toggle

**User Story:** As a user, I want to switch between a dark and a light color theme, so that I can use the App comfortably in different lighting environments.

#### Acceptance Criteria

1. THE App SHALL provide a Theme_Toggle control that is accessible without scrolling (e.g., fixed or always visible in the header) at all viewport widths.
2. WHEN the user activates the Theme_Toggle, THE App SHALL switch the Theme between "light" and "dark" and apply the corresponding styles to all UI elements within 100 milliseconds; the Theme_Toggle visual state SHALL reflect the currently active Theme.
3. WHEN the Theme is changed, THE App SHALL persist the selected Theme in Local_Storage.
4. WHEN the App loads, THE App SHALL retrieve the previously saved Theme from Local_Storage and apply it before rendering any content, to prevent a flash of the wrong theme.
5. IF no Theme has been previously saved in Local_Storage, THEN THE App SHALL apply the "light" Theme by default.

---

### Requirement 9: Persist and Restore Data on Load

**User Story:** As a user, I want my transactions, budgets, categories, and settings to be saved automatically, so that my data is still available when I reopen the app.

#### Acceptance Criteria

1. WHEN the App loads, THE App SHALL read all Transactions, Budget_Limits, Custom_Categories, and the active Theme from Local_Storage.
2. WHEN the App loads, THE App SHALL populate the Transaction_List, Summary_Panel, Chart, and budget section with the data retrieved from Local_Storage.
3. IF Local_Storage contains no data on startup, THEN THE App SHALL initialize with an empty state and default built-in categories with no Budget_Limits set.
4. IF Local_Storage contains malformed or corrupt data on startup, THEN THE App SHALL discard the corrupt data, initialize with an empty state, and display a notification informing the user that previous data could not be loaded.
5. WHEN a data change (add, delete, or update) occurs, THE App SHALL persist the change to Local_Storage before updating the UI, so that a page refresh does not result in data loss.
6. IF a Local_Storage write fails during any data change, THEN THE App SHALL display an error message and SHALL NOT update the UI to reflect the failed change.

---

### Requirement 10: Responsive and Accessible Layout

**User Story:** As a user, I want the app to work clearly on both desktop and mobile screen sizes and to be navigable without relying solely on color, so that I can use it on any device.

#### Acceptance Criteria

1. THE App SHALL render a layout on viewport widths from 320px to 2560px in which no interactive element is clipped, hidden behind overflow, or requires horizontal scrolling to reach.
2. THE App SHALL use a single CSS file located at `css/` and a single JavaScript file located at `js/` as the sole styling and scripting resources.
3. THE Spending_Indicator SHALL communicate over-budget status using both a distinct color and a text label or icon, so that the warning is perceivable without relying on color alone.
4. THE App SHALL apply a minimum color contrast ratio of 4.5:1 between normal body text and its background, and a minimum of 3:1 for large text (18px bold or 24px regular), in both the light and dark Theme.
5. WHEN the user navigates the transaction form and controls using the keyboard, THE App SHALL display a non-zero outline or equivalent visible boundary on the active element that is distinguishable from the surrounding background.

---

## Technical Constraints

- **TC-1 Technology Stack**: THE App SHALL be implemented using only HTML, CSS, and Vanilla JavaScript. THE App SHALL NOT depend on JavaScript frameworks (React, Vue, Angular, or similar) or external CSS frameworks.
- **TC-2 Data Storage**: THE App SHALL use only the browser Local_Storage API for data persistence. THE App SHALL NOT require a backend server or remote database.
- **TC-3 Browser Compatibility**: THE App SHALL function correctly in the current stable releases of Chrome, Firefox, Edge, and Safari without polyfills for Local_Storage or the Canvas/SVG APIs.
- **TC-4 File Structure**: THE App SHALL contain exactly one CSS file inside the `css/` directory and exactly one JavaScript file inside the `js/` directory.
