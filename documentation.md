# Jasper - Technical Documentation

## 1. Project Overview
Jasper is a modern, responsive personal finance "cockpit" application composed of a Next.js (React) frontend and a Supabase backend. It focuses on aesthetics and detailed financial tracking (Budgeting, Expense Tracking, Contact Debts).

**Stack:**
- **Frontend Framework:** Next.js 16 (App Router)
- **Styling:** TailwindCSS 4, Global CSS variables for glassmorphism
- **Backend/Database:** Supabase (PostgreSQL)
- **State Management:** React Context API (`FinanceContext`)
- **Icons:** Lucide React

---

## 2. Directory Structure & Key Files

### Root
- **`app/`**: Next.js App Router pages and layouts.
- **`components/`**: Reusable UI components.
- **`context/`**: Global state management.
- **`lib/`**: Utilities and configuration (Supabase client).
- **`public/`**: Static assets (images, icons).

---

## 3. Core Architecture

### 3.1 Global State - `context/FinanceContext.jsx`
This file is the heart of the application. It provides a `FinanceContext` that wraps the entire application.

**Key Responsibilities:**
- **Data Fetching:** Fetches critical data (Transactions, Categories, Contacts, Budgets) from Supabase on mount. *Optimized to use parallel `Promise.all` for performance.*
- **State vars:**
  - `transactions`: Array of transaction objects.
  - `categories`: Metadata for spending categories (icons, types).
  - `contacts`: List of people for debt/credit tracking.
  - `budget`: Global monthly spending limit.
  - `categoryBudgets`: Specific limits per category.
  - `financials`: A derived object calculating real-time metrics (Balance, Savings Rate, Solvency, Runway, Top Category).
- **Actions:**
  - `addTransaction(newTx)`: Inserts into `transactions` table.
  - `addContact(contact)`: Inserts into `contacts` table.
  - `deleteContact(id)`, `updateContact(id, updates)`: CRUD for contacts.
  - `updateGlobalBudget(amount)`: Upserts into `global_budgets` table.

**Derived Metrics Logic:**
- **Runway:** Calculates months left based on current balance divided by monthly expense (burn rate).
- **Solvency:** Checks if `budgetRemaining - balance < 0`.
- **Contact Balances:** Aggregates transactions per contact to determine who owes whom.

### 3.2 Main Layout - `app/layout.tsx`
- Wraps the app in `FinanceProvider`.
- Defines the responsive structure:
  - **Desktop:** `Sidebar` on the left, `main` content on the right.
  - **Mobile:** `MobileNav` fixed at bottom, content flows vertically.
- Injects global background orbs (`.bg-orb`) for the visual theme.

### 3.3 Dashboard - `app/page.tsx`
The landing page ("Cockpit").
- **Components:**
  - `TopBar`: DateTime display.
  - `BalanceCard`: Shows Net Balance, Income/Expense totals, and quick "Add Income/Expense" buttons.
  - `BudgetCard`: Visual progress bar of Global Budget usage.
  - `Analytics`: Rich visualizations (Top Spending Bar Chart, Needs vs Wants Donut, Cashflow Sparkline).

---

## 4. Component Details

### `components/Sidebar.jsx`
- **Purpose:** Desktop navigation.
- **Features:**
  - Displays "Pulse" metrics (Savings rate, Top category, Runway) directly in the sidebar.
  - Shows "To Receive" / "To Pay" badges if there are outstanding debts.
  - Alerts if the user is "Insolvent" (Budget > Balance).

### `components/MobileNav.jsx`
- **Purpose:** Bottom tab bar for mobile users.
- **Styling:** Highly stylized glassmorphism with blur and saturation filters.

### `components/Dashboard/Analytics.jsx`
- **Logic:** Heavy computation inside `useMemo` to process transaction history.
- **Charts:**
  - **Heatmap/Bar:** Top 5 spending categories.
  - **Donut:** Needs vs Wants. Uses a heuristic (Mapping 'Rent', 'Food' to Needs; 'Shopping' to Wants).
  - **Sparkline:** 6-month cashflow trend.

### `components/AddTransactionModal.jsx` & `Form.jsx`
- **Modal:** Wraps the form in a backdrop.
- **Form:**
  - Handles Amount, Type (Income/Expense), Category Selection, and Contact linking.
  - **Validation:** "Other" category requires a description.
  - **Features:** Can create a new Contact on the fly inside the dropdown.

### `components/Contacts/`
- **`ContactBalanceCard`:** Shows total "You get" vs "You owe".

### `components/Insights/DetailedAnalytics.jsx` [NEW]
- **Purpose:** Deep dive financial analysis.
- **Features:**
  - Bar Chart: Income vs Expense (6-month history).
  - Sparklines: Trends for top 3 categories.
  - Metrics: "Healthy" Savings Rate indicator, Largest Expense, Avg Transaction Value, Top Category.

### Recent Changes
- **PDF Bank Statement Import**: Added support for uploading PDF statements (HDFC, Axis, UPI formats detected). Includes:
    - Dedicated `ImportModal` with transactions review.
    - Local `pdf.js` worker for reliable parsing.
    - Income/Expense detection engine (keywords: IMPS, NEFT, CR, Received).
    - Debug Mode for inspecting raw PDF text.
- **Advanced Insights**: Added "Largest Expense", "Most Frequent Category", and "Average Transaction Value" cards.
- **Category Management**: Added ability to add/delete custom categories.

### `components/CategoryManager.jsx` [NEW]
- **Purpose:** Manage custom categories.
- **Features:** Add new categories (auto-icon selection), Delete existing categories (safeguarded against use).

### `components/ImportModal.jsx` [NEW]
- **Purpose:** Import Bank Statements (PDF).
- **Tech:** Client-side parsing via `pdfjs-dist`.
- **Workflow:** Parse -> Review -> Bulk Insert.

---

## 5. Pages

### `app/accounts/page.tsx`
- **Route:** `/accounts`
- **View:** List of all transactions.
- **Features:**
  - Color-coded arrows for Income/Expense.
  - Delete capability.
  - Shows Context (e.g., "Got from Mom" or "Gave to Landlord") based on contact association.

### `app/contacts/page.jsx`
- **Route:** `/contacts`
- **View:** List of contacts with their calculated balances.
- **CRUD:** Add new contact, Edit existing name/phone, Delete contact.
- **Logic:** Derived balance is displayed as Green (Owes You) or Red (You Owe).

### `app/goals/page.tsx`
- **Route:** `/goals` (Budgeting)
- **View:** settings for Global Budget and Category-level budgets.
- **Interactions:**
  - Input field to update Global Budget.
  - List of categories with progress bars showing spending vs limit.

---

## 6. Database Schema (Inferred)

### Tables
1. **`transactions`**
   - `id`, `amount`, `type` ('income'/'expense'), `description`, `transaction_date`, `created_at`
   - `category_id` (FK -> categories.id)
   - `contact_id` (FK -> contacts.id, nullable)

2. **`categories`**
   - `id`, `name`, `icon`, `type` ('income'/'expense')

3. **`contacts`**
   - `id`, `name`, `phone`, `created_at`

4. **`global_budgets`**
   - `id`, `month_year` (string 'YYYY-MM'), `amount_limit`

5. **`budgets`** (Category Budgets)
   - `id`, `category_id`, `month_year`, `amount_limit`

---

## 7. Configuration

- **Environment Variables:**
  - `NEXT_PUBLIC_SUPABASE_URL`: `https://tgxwxzqmtrwkcervbadm.supabase.co`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRneHd4enFtdHJ3a2NlcnZiYWRtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUxNjUzNjcsImV4cCI6MjA4MDc0MTM2N30.wr9_pBeUDF6Fx3JteY2E_SZ8xPkJY2jedNdBn0T0lpY`
  - *(Note: A `.env.local` is required for the build to pass)*

- **Tailwind Config:** Custom color palette (`expense`, `income`, `accent`) and animation keyframes.
