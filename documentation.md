# GFE ERP — Technical Documentation

## 1. Project Overview

GFE ERP is a full-stack business management and personal finance application built for **Ghodi Fabrication Enterprise**. It provides a real-time "cockpit" view of finances, sales, staff, contracting, and inventory — all in one place.

**Stack:**
- **Framework:** Next.js 16 (App Router, Server Actions, Turbopack)
- **Language:** TypeScript + JavaScript (mixed TSX/JSX)
- **Runtime:** Node.js
- **UI Library:** React 19
- **Styling:** TailwindCSS 4 + Global CSS variables (glassmorphism dark theme)
- **Database / Backend:** Supabase (PostgreSQL + REST API)
- **State Management:** React Context API (`FinanceContext`)
- **Icons:** Lucide React
- **Charts:** Recharts
- **PDF Parsing:** `pdfjs-dist` (client-side with CDN worker)

---

## 2. Directory Structure & Key Files

```
JERP/
├── app/                        # Next.js App Router
│   ├── page.tsx                # Dashboard (home)
│   ├── layout.tsx              # Root layout (wraps FinanceProvider)
│   ├── globals.css             # Global styles & CSS variables
│   ├── accounts/page.tsx       # Transaction history
│   ├── contacts/page.tsx       # Contacts (merged .jsx + .tsx)
│   ├── goals/page.tsx          # Budgeting
│   ├── insights/               # Analytics
│   ├── sales/page.tsx          # Sales dashboard (Fabrications)
│   ├── sales/rates/page.tsx    # Default rate configuration
│   ├── staff/                  # Staff management + attendance
│   ├── contracting/            # Estimates, Bills, Projects, Measurements
│   ├── marketing/              # Purchases, Inventory
│   ├── operations/             # Work logs, sticky notes
│   ├── wallets/                # Wallet management
│   ├── reports/                # Financial reports
│   ├── pending/                # Pending items view
│   └── actions/data.ts         # Server Action: bulk data fetch
├── components/
│   ├── Dashboard/              # BalanceCard, Analytics, BudgetCard
│   ├── Contacts/               # ContactBalanceCard, ContactDetailsModal
│   ├── Insights/               # DetailedAnalytics
│   ├── Staff/                  # Staff components
│   ├── Sidebar.jsx             # Desktop navigation
│   ├── MobileNav.jsx           # Mobile bottom nav
│   ├── TopBar.jsx              # Page header bar
│   ├── AddTransactionForm.jsx  # Income/Expense entry form
│   ├── AddTransactionModal.jsx # Modal wrapper
│   ├── ImportModal.jsx         # PDF bank statement importer
│   ├── CategoryManager.jsx     # Custom category CRUD
│   └── CustomSelect.jsx        # Reusable styled dropdown
├── context/
│   └── FinanceContext.jsx      # Global state + all Supabase CRUD
├── lib/
│   ├── supabase.ts             # Supabase client instance
│   └── categoryIcons.js        # Icon-to-category map
└── public/                     # Static assets (worker.js for pdfjs)
```

---

## 3. Core Architecture

### 3.1 Data Fetching — `app/actions/data.ts` (Server Action)

A single **Server Action** `fetchAllDataAction()` fetches all tables in parallel using `Promise.allSettled`. This runs server-side (avoiding CORS issues and leaking keys to the client), and feeds data into `FinanceContext` on mount.

**Tables fetched:**
`categories`, `contacts`, `transactions`, `global_budgets`, `budgets`, `wallets`, `work_logs`, `sticky_notes`, `client_queries`, `staff`, `projects`, `staff_advances`, `bills`, `purchases`, `settings`, `staff_attendance`, `suppliers`, `inventory`, `shopping_list`, `sales`

### 3.2 Global State — `context/FinanceContext.jsx`

The single source of truth for all client-side state. Wraps the entire app via `FinanceProvider`.

**State variables:**
| Variable | Source | Description |
|---|---|---|
| `transactions` | Supabase | All income/expense entries |
| `categories` | Supabase | Spending category metadata |
| `contacts` (with balances) | Derived | Contacts + computed debt/credit balance |
| `wallets` | Supabase | Cash/bank accounts |
| `sales` | Supabase | Fabrication sales log |
| `staffList` | Supabase | Staff profiles |
| `staffWithPay` | Derived | Staff with computed salary/advance/net payable |
| `attendance` | Supabase | Daily attendance records |
| `allStaffAdvances` | Supabase | Advance payments |
| `bills`, `estimates`, `measurements`, `projects` | Supabase | Contracting module |
| `inventory`, `suppliers`, `purchases`, `shoppingList` | Supabase | Marketing/inventory module |
| `workLogs`, `stickyNotes`, `clientQueries` | Supabase | Operations module |
| `settings` | Supabase | App configuration |
| `financials` | Derived | Monthly income, expense, budget metrics |

**Key Actions (CRUD):**
- `addTransaction / updateTransaction / deleteTransaction` — with wallet balance auto-adjustment
- `addContact / updateContact / deleteContact / settleContact`
- `addSale(sale)` — inserts into `sales` table
- `updateSale(id, updates)` — marks sale as paid, sets wallet
- `addWallet / updateWallet / deleteWallet`
- `addStaff / updateStaff / deleteStaff`
- `submitDailyAttendance / addStaffAdvance`
- `createEstimate / updateEstimate / deleteEstimate / updateEstimateStatus`
- `createBill / deleteBill`
- `createMeasurement / deleteMeasurement`
- `addProject / updateProject / deleteProject`
- `addInventoryItem / updateInventoryItem / deleteInventoryItem`
- `createPurchase / addSupplier`
- `addWorkLog / toggleWorkLog / deleteWorkLog / updateWorkLog`
- `addStickyNote / deleteStickyNote`
- `updateGlobalBudget / updateCategoryBudget`
- `updateSettings`

**Derived Computed Values:**
- **`contactsWithBalances`**: Aggregates `transactions.contact_id` to compute per-contact debt/credit. Only `is_debt=true` transactions count toward the balance.
- **`staffWithPay`**: Computes `salaryAccrued`, `totalAdvances`, `netPayable` for each staff member using attendance records.
- **`currentFinancials` / `getFinancials(month)`**: Returns income, expense, balance, budget metrics, solvency, savings rate, runway, and category-level metrics for any given month.

### 3.3 Root Layout — `app/layout.tsx`
- Wraps the app in `<FinanceProvider>` and `<GlobalModalWrapper>`
- Desktop: `<Sidebar>` (left) + `<main>` (right)
- Mobile: `<MobileNav>` fixed at bottom
- Injects decorative background gradient orbs

---

## 4. Pages

### `app/page.tsx` — Dashboard (Cockpit)
Components: `TopBar`, `BalanceCard`, `BudgetCard`, `Analytics`
- Live net balance across wallets
- Monthly budget progress
- Spending heatmap, Needs vs Wants donut chart, 6-month cashflow sparkline

### `app/accounts/page.tsx` — Transactions
- Color-coded income (green) / expense (red) list
- Contact context shown (e.g. "Gave to Dady")
- Edit + Delete with wallet balance reversal

### `app/contacts/page.tsx` — Contact Management *(merged from .jsx + .tsx)*
- Search bar + grid layout
- Add/Edit contact (name + phone)
- Delete with confirmation
- `ContactBalanceCard` — net "To Receive" / "To Pay" summary
- `ContactDetailsModal` — tap a contact to view full transaction history
- Balance display: green = they owe you, red = you owe them

### `app/goals/page.tsx` — Budgeting
- Global monthly limit input
- Per-category progress bars (spending vs limit)

### `app/insights/` — Analytics
- `DetailedAnalytics`: 6-month income vs expense bars, category sparklines, savings rate health indicator

### `app/sales/page.tsx` — Sales Dashboard *(Fabrications)*
- **Ghodi Configurator**: folding/non-folding × 5ft/6ft, client selector, qty, date, paid/unpaid toggle
- **Trolley Configurator**: bucket/cylinder × single/double × heavy/light
- Per-client rate overrides stored in `localStorage` (config only — not records)
- **Outstanding Collections**: All unpaid sales fetched from `sales` Supabase table; wallet selector + "Collect Payment" creates a transaction and marks sale `is_paid=true`
- New sales saved via `addSale()` to Supabase — syncs across all devices/environments

### `app/sales/rates/page.tsx` — Default Rate Configuration
- Edit default rates for all Ghodi/Trolley product keys
- Stored in `localStorage` under `gfe_sales_default_rates`

### `app/staff/` — Staff Management
- Staff list with salary, daily rate
- Attendance submission (Present/Half-Day/Overtime/Absent)
- Staff detail view: attendance history, advances, net payable
- Staff calendar view

### `app/contracting/` — Contracting Module
- **Estimates** (`/contracting/estimates`) — create/edit/send quotes
- **Bills** (`/contracting/bills`) — invoice management
- **Projects** (`/contracting/projects`) — project records
- **Measurements** (`/contracting/measurements`) — site measurement entries

### `app/marketing/` — Marketing / Inventory
- Inventory items with stock levels
- Suppliers directory
- Purchase orders with supplier linking
- Shopping list

### `app/operations/` — Operations
- Work logs (task tracking with complete/pending toggle)
- Sticky notes
- Client queries with status management

### `app/wallets/` — Wallet Management
- Add/edit/delete wallets (Cash, Bank, Drawer, etc.)
- Balances auto-update on every transaction, sale collection, advance payment

---

## 5. Components

### `components/Sidebar.jsx`
Desktop nav. Shows financial "Pulse" metrics (savings rate, top category, runway) and debt badges inline.

### `components/MobileNav.jsx`
Bottom tab bar for mobile. Glassmorphism styling.

### `components/AddTransactionForm.jsx` + `AddTransactionModal.jsx`
Full income/expense entry form. Supports amount, type, category, description, contact linking, wallet, date, and project. Can create new contacts inline.

### `components/ImportModal.jsx`
PDF bank statement importer. Parses via `pdfjs-dist` client-side. Regex-based transaction extraction (DD-Mon-YYYY and DD/MM/YYYY formats). Income/Expense heuristic using keyword detection. Review table with editable type/description before bulk insert.

### `components/CategoryManager.jsx`
CRUD for spending/income categories. Prevents deletion if category is in use.

### `components/CustomSelect.jsx`
Reusable styled dropdown component used across configurators, forms, and selectors.

### `components/Contacts/ContactBalanceCard.jsx`
Summary card: total "To Receive" vs "To Pay" across all contacts.

### `components/Contacts/ContactDetailsModal.jsx`
Full-screen modal showing a contact's transaction history, balance, and edit button.

### `components/Dashboard/Analytics.jsx`
Heavy `useMemo` computation for: top 5 category bar chart, Needs vs Wants donut, 6-month sparkline.

### `components/Insights/DetailedAnalytics.jsx`
Detailed month-by-month income vs expense, category sparklines, savings rate, largest expense, average transaction value.

---

## 6. Database Schema

### `transactions`
| Column | Type | Notes |
|---|---|---|
| `id` | uuid | PK |
| `amount` | numeric | |
| `type` | text | `'income'` or `'expense'` |
| `description` | text | |
| `transaction_date` | date | |
| `category_id` | uuid | FK → categories |
| `contact_id` | uuid | FK → contacts (nullable) |
| `wallet_id` | uuid | FK → wallets (nullable) |
| `project_id` | uuid | FK → projects (nullable) |
| `is_debt` | boolean | If false, settlement/direct payment (excluded from contact balance) |

### `sales` *(new)*
| Column | Type | Notes |
|---|---|---|
| `id` | text | PK (client-generated) |
| `date` | text | Sale date (YYYY-MM-DD) |
| `client_id` | text | FK → contacts (nullable) |
| `client_name` | text | Denormalized for display |
| `product_name` | text | e.g. "Ghodi - Non-Folding 5ft" |
| `quantity` | int | Pieces sold |
| `rate` | numeric | Unit rate at time of sale |
| `total_amount` | numeric | quantity × rate |
| `is_paid` | boolean | false = Outstanding |
| `wallet_id` | text | Set when payment is collected |

### `contacts`
`id`, `name`, `phone`, `created_at`

### `wallets`
`id`, `name`, `type`, `balance`

### `categories`
`id`, `name`, `icon`, `type` (`income`/`expense`)

### `global_budgets`
`id`, `month_year` (YYYY-MM), `amount_limit`

### `budgets`
`id`, `category_id`, `month_year`, `amount_limit`

### `staff`
`id`, `name`, `salary` (daily rate), `phone`, `role`, `created_at`

### `staff_attendance`
`id`, `staff_id`, `date`, `status` (Present/Half-Day/Overtime/Absent)

### `staff_advances`
`id`, `staff_id`, `amount`, `date`, `note`

### `bills`, `estimates`, `measurements`, `projects`
Contracting module records. Bills have status (Draft/Sent/Paid).

### `inventory`, `suppliers`, `purchases`, `shopping_list`
Marketing/supply chain module.

### `settings`
Single-row config table (`id=1`, various app settings).

---

## 7. Configuration

### Environment Variables (`.env.local`)
```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
```

### localStorage (Client Config Only)
The following are stored in browser localStorage — they are **configuration**, not records, so browser-scoping is acceptable:
- `gfe_sales_default_rates` — default unit prices for each product key
- `gfe_sales_client_rates` — per-client price overrides per product key

---

## 8. Recent Changes

### Outstanding Collections — Grouped Accordion UI
- **Before:** Individual flat rows per sale (product, client, qty, date, collect button).
- **After:** Grouped by client — collapsed by default showing just the client name and total outstanding amount.
  - Click any client row to expand and reveal all individual delivery entries.
  - Each delivery shows: product name, qty, delivery date, amount.
  - Wallet selector + **Collect** button is per individual delivery (unchanged behaviour).
  - Chevron icon animates open/close.
  - State managed via `expandedClients: Record<string, boolean>` in the sales page.

### Sales Module — localStorage → Supabase Migration
- **Problem:** The `salesLog` (Outstanding Collections) was stored in browser `localStorage`, making it invisible on other devices/environments even when connected to the same database.
- **Fix:**
  - Created `sales` table in Supabase.
  - Added `fetchAllDataAction` to bulk-fetch `sales` on app load.
  - Added `sales`, `addSale()`, `updateSale()` to `FinanceContext`.
  - Removed all `localStorage` sales read/write from `sales/page.tsx`.
  - New sales now call `addSale()` → Supabase; collecting payment calls `updateSale()`.

### Contacts Page — Duplicate File Merge
- Merged `app/contacts/page.jsx` and `app/contacts/page.tsx` into a single canonical `page.tsx`.
- Combined features: search bar, grid layout, TopBar, edit/delete, ContactBalanceCard, ContactDetailsModal, phone field.

### ImportModal.jsx — Build Fix
- Removed TypeScript `as string` type assertion from `.jsx` file (invalid syntax in non-TypeScript files).

### Sales Configurators — Default Quantity
- Changed default quantity from `1` to `0` for both Ghodi and Trolley configurators.
- Resets to `0` after recording a sale.
