# GFE ERP 💎

> **A full-stack business & personal finance ERP built for Ghodi Fabrication Enterprise.**

---

## 🛠️ Technology Stack

| Layer | Technology |
|---|---|
| **Framework** | [Next.js 16](https://nextjs.org/) (App Router, Server Actions) |
| **Language** | TypeScript + JavaScript (JSX/TSX) |
| **Runtime** | Node.js |
| **UI Library** | React 19 |
| **Styling** | TailwindCSS 4 + Custom CSS Variables (Glassmorphism theme) |
| **Database** | [Supabase](https://supabase.com/) (PostgreSQL) |
| **State Management** | React Context API (`FinanceContext`) |
| **Icons** | [Lucide React](https://lucide.dev/) |
| **PDF Parsing** | `pdfjs-dist` (client-side, CDN worker) |
| **Charts** | Recharts |
| **Package Manager** | npm |
| **Deployment** | Vercel (live) / `npm run dev` (local) |

---

## 🌟 Key Features

### 1. 💰 Finance Cockpit (Dashboard)
- **Net Balance** — real-time liquid cash view across all wallets
- **Runway** — months of money left at current burn rate
- **Solvency Check** — instant alert if budget exceeds balance
- **Smart Analytics** — spending heatmaps, Needs vs Wants donut, 6-month cashflow sparkline

### 2. 🎯 Smart Budgeting
- Global monthly spending limit with visual progress bar
- Per-category budget limits with drill-down tracking
- Real-time overspend warnings

### 3. 👥 Contact Management
- Track personal debts and credits
- Auto-calculated balances per contact (who owes whom)
- Contact details modal with full transaction history
- Add/Edit/Delete contacts with phone numbers

### 4. 🏭 Sales Dashboard (Fabrications)
- **Ghodi Configurator** — folding/non-folding, 5ft/6ft options with auto-pricing
- **Trolley Configurator** — bucket/cylinder types with capacity and weight options
- Client-specific rate overrides (saved per product key)
- Outstanding Collections tracker — unpaid sales with one-click payment collection
- **Sales data fully persisted in Supabase** (syncs across all devices)

### 5. 📋 Contracting Module
- Estimates, Bills, Projects, Measurements management
- Full CRUD with status tracking (Draft → Sent → Paid)

### 6. 👷 Staff Management
- Staff profiles with daily attendance (Present / Half-Day / Overtime / Absent)
- Salary accrual and advance tracking
- Net payable calculation per staff member
- Staff calendar view

### 7. 🛒 Marketing / Inventory
- Supplier management
- Inventory tracking with stock levels
- Purchase orders and shopping list

### 8. 📊 Reports & Insights
- Detailed analytics with 6-month income vs expense bar charts
- Category sparklines and trend analysis
- Savings rate health indicator

### 9. 📥 PDF Bank Statement Import
- Upload PDF bank statements (HDFC, Axis, UPI formats)
- Client-side parsing with `pdfjs-dist`
- Review & edit transactions before importing
- Income/Expense auto-detection (IMPS, NEFT, CR, UPI keywords)

### 10. 👛 Wallet Management
- Multiple wallets (Cash, Bank, Drawer, etc.)
- Real-time balance updates on every transaction
- Wallet selection when recording sales/income/expenses

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- npm

### Local Development

```bash
# 1. Clone the repository
git clone https://github.com/Jaspreetkohli72/JERP.git
cd JERP

# 2. Install dependencies
npm install

# 3. Set up environment variables
# Create a .env.local file in the root:
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# 4. Run the development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Build for Production

```bash
npm run build
npm start
```

---

## 📁 Project Structure

```
JERP/
├── app/                    # Next.js App Router pages
│   ├── page.tsx            # Dashboard (Cockpit)
│   ├── accounts/           # Transaction history
│   ├── contacts/           # Contact management
│   ├── goals/              # Budget settings
│   ├── insights/           # Detailed analytics
│   ├── sales/              # Sales dashboard (Fabrications)
│   ├── staff/              # Staff management
│   ├── contracting/        # Estimates, Bills, Projects
│   ├── marketing/          # Inventory & Purchases
│   ├── operations/         # Work logs & sticky notes
│   ├── wallets/            # Wallet management
│   ├── reports/            # Financial reports
│   └── actions/            # Next.js Server Actions (data.ts)
├── components/             # Reusable UI components
│   ├── Dashboard/          # BalanceCard, Analytics, BudgetCard
│   ├── Contacts/           # ContactBalanceCard, ContactDetailsModal
│   ├── Insights/           # DetailedAnalytics
│   ├── Staff/              # Staff-specific components
│   ├── Sidebar.jsx         # Desktop navigation
│   ├── MobileNav.jsx       # Mobile bottom tab bar
│   ├── AddTransactionForm.jsx
│   ├── ImportModal.jsx     # PDF bank statement importer
│   ├── CategoryManager.jsx
│   └── CustomSelect.jsx
├── context/
│   └── FinanceContext.jsx  # Global state & Supabase CRUD
├── lib/
│   └── supabase.ts         # Supabase client
├── public/                 # Static assets
└── .env.local              # Environment variables (not committed)
```

---

## 🗄️ Database (Supabase / PostgreSQL)

Key tables:

| Table | Purpose |
|---|---|
| `transactions` | All income/expense entries |
| `categories` | Spending categories with icons |
| `contacts` | People for debt/credit tracking |
| `wallets` | Cash/bank accounts with balances |
| `global_budgets` | Monthly global spending limits |
| `budgets` | Per-category monthly limits |
| `sales` | Fabrication sales log (Ghodi/Trolley) — **new** |
| `staff` | Staff profiles |
| `staff_attendance` | Daily attendance records |
| `staff_advances` | Salary advance payments |
| `bills` | Contracting bills |
| `estimates` | Contracting estimates/quotes |
| `projects` | Project records |
| `measurements` | Site measurement records |
| `inventory` | Stock items |
| `suppliers` | Supplier contacts |
| `purchases` | Purchase orders |
| `shopping_list` | Pending items to buy |
| `settings` | App-wide configuration |

---

*GFE ERP — built private, fast, and purposefully for Ghodi Fabrication Enterprise.*
