"use client";
import React, { useMemo } from "react";
import { useFinance } from "../../context/FinanceContext";

// Helper to format currency
const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        maximumFractionDigits: 0,
    }).format(amount);
};

// Helper: Needs vs Wants mapping
const categoryTypeMap = {
    'Rent': 'needs',
    'Utilities': 'needs',
    'Food': 'needs',
    'Health': 'needs',
    'Transport': 'needs',
    'Shopping': 'wants',
    'Entertainment': 'wants',
    'Travel': 'wants',
    'Other': 'wants',
    'Freelance': 'income',
    'Salary': 'income'
};

export default function Analytics(props) {
    const { transactions, loading } = useFinance();

    // --- Derived Statistics ---
    const stats = useMemo(() => {
        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();

        // Filter current month transactions
        const currentMonthTxs = transactions.filter(t => {
            const d = new Date(t.transaction_date);
            return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
        });

        const currentMonthExpenses = currentMonthTxs.filter(t => t.type === 'expense');

        // 1. Top Spending Categories (Bar Chart)
        const expensesByCategory = {};
        currentMonthExpenses.forEach(t => {
            const catName = t.categories?.name || 'Other';
            expensesByCategory[catName] = (expensesByCategory[catName] || 0) + Number(t.amount);
        });

        const sortedCategories = Object.entries(expensesByCategory)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 5)
            .map(([label, value]) => ({
                label,
                value,
                height: `${Math.min((value / 50000) * 100, 100)}%` // Scaling factor
            }));

        // 2. Spending Split (Needs vs Wants) (Donut)
        let needs = 0;
        let wants = 0;
        let impulse = 0;

        currentMonthExpenses.forEach(t => {
            const catName = t.categories?.name || 'Other';
            const type = categoryTypeMap[catName] || 'wants';
            const amt = Number(t.amount);
            if (type === 'needs') needs += amt;
            else {
                wants += amt;
                // Simple heuristic for impulse: simple "Shopping" or "Other" < 1000 could be impulse, 
                // but let's just treat 'Shopping' as potential impulse buffer
                if (catName === 'Shopping') impulse += amt;
            }
        });

        const totalEx = needs + wants;
        const needsPct = totalEx ? Math.round((needs / totalEx) * 100) : 0;

        // 3. Cashflow Trend (Last 6 Months)
        const monthlyCashflow = [];
        for (let i = 5; i >= 0; i--) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const monthStr = d.toLocaleString('default', { month: 'short' });

            const monthTxs = transactions.filter(t => {
                const td = new Date(t.transaction_date);
                return td.getMonth() === d.getMonth() && td.getFullYear() === d.getFullYear();
            });

            const income = monthTxs.filter(t => t.type === 'income').reduce((sum, t) => sum + Number(t.amount), 0);
            const expense = monthTxs.filter(t => t.type === 'expense').reduce((sum, t) => sum + Number(t.amount), 0);
            monthlyCashflow.push({ month: monthStr, surplus: income - expense });
        }

        // Calculate averages/worst/best for trend card
        // Dynamic Average: Divide by number of months since first transaction (capped at 6), or 1 if no history.
        const earliestTx = transactions.length > 0 ? new Date(transactions[transactions.length - 1].transaction_date) : new Date();
        const monthsDiff = (now.getFullYear() - earliestTx.getFullYear()) * 12 + (now.getMonth() - earliestTx.getMonth()) + 1;
        const divisor = Math.min(Math.max(monthsDiff, 1), 6);

        const surpluses = monthlyCashflow.map(m => m.surplus);
        const avgSurplus = Math.round(surpluses.reduce((a, b) => a + b, 0) / divisor);
        const worstMonth = Math.min(...surpluses);

        // Approx savings rate for current month
        const curIncome = currentMonthTxs.filter(t => t.type === 'income').reduce((sum, t) => sum + Number(t.amount), 0);
        const savingsRate = curIncome ? Math.round(((curIncome - totalEx) / curIncome) * 100) : 0;

        return {
            sortedCategories,
            needsPct,
            impulse,
            monthlyCashflow,
            avgSurplus,
            worstMonth,
            savingsRate
        };

    }, [transactions]);

    // Color Helpers
    const getBarColor = (index) => {
        const colors = [
            "from-[#5b8dff] to-[#1d4ed8]",
            "from-[#f97316] to-[#ea580c]",
            "from-[#22c55e] to-[#15803d]",
            "from-[#a855f7] to-[#6b21a8]",
            "from-[#e11d48] to-[#9f1239]"
        ];
        return colors[index % colors.length];
    };

    if (loading) return <div className="glass h-64 animate-pulse rounded-[26px]" />;

    // Render Parts
    const Header = () => (
        <div className="flex justify-between items-center px-4 pt-4 mb-3.5 text-[0.8rem] text-muted relative z-10">
            <span className="uppercase tracking-[0.12em] text-[0.76rem]">Spending overview</span>
            <span className="text-[0.74rem] opacity-90">Where your money likes to wander</span>
        </div>
    );

    const LeftPart = () => (
        <div className="flex flex-col gap-3">
            <Header />
            {/* Bar Chart Card */}
            <div className="glass p-3 flex flex-col gap-2">
                <div className="flex justify-between items-center gap-2">
                    <div>
                        <div className="text-[0.84rem] font-medium">Top spending categories</div>
                        <div className="text-[0.74rem] text-muted">This month</div>
                    </div>
                    <div className="text-[0.7rem] px-2 py-1 rounded-full bg-[rgba(15,23,42,0.9)] border border-[rgba(148,163,184,0.4)] text-gray-200">
                        Heatmap view
                    </div>
                </div>

                <div className="flex items-end gap-1.5 h-[120px] mt-2">
                    {stats.sortedCategories.length > 0 ? stats.sortedCategories.map((bar, i) => (
                        <div
                            key={i}
                            className="flex-1 h-full rounded-full bg-gradient-to-b from-[rgba(148,163,184,0.18)] to-[rgba(15,23,42,0.95)] relative overflow-hidden group"
                            title={`${bar.label}: ${formatCurrency(bar.value)}`}
                        >
                            <div
                                className={`absolute inset-x-[1px] bottom-[1px] rounded-[inherit] bg-gradient-to-b ${getBarColor(i)} transition-all duration-700`}
                                style={{ height: bar.height }}
                            />
                        </div>
                    )) : (
                        <div className="w-full h-full flex items-center justify-center text-xs text-muted">No data yet</div>
                    )}
                </div>

                <div className="flex justify-between mt-1.5 text-[0.68rem] text-muted truncate gap-1">
                    {stats.sortedCategories.map((bar, i) => (
                        <span key={i} className="truncate w-full text-center">{bar.label}</span>
                    ))}
                </div>

                <div className="flex flex-col gap-1 mt-2 text-[0.74rem] text-muted">
                    <div className="flex justify-between">
                        <span>Categories over budget</span>
                        <span className="text-[0.7rem] px-1.5 py-0.5 rounded-full border border-[rgba(148,163,184,0.5)] text-gray-200">
                            --
                        </span>
                    </div>
                    <div className="flex justify-between">
                        <span>Most volatile</span>
                        <span>{stats.sortedCategories[0]?.label || 'None'}</span>
                    </div>
                </div>
            </div>

            {/* Donut Chart Card */}
            <div className="glass p-3 flex flex-col gap-2">
                <div className="flex justify-between items-center gap-2">
                    <div>
                        <div className="text-[0.84rem] font-medium">Spending split</div>
                        <div className="text-[0.74rem] text-muted">Needs vs wants</div>
                    </div>
                    <div className="text-[0.7rem] px-2 py-1 rounded-full bg-[rgba(15,23,42,0.9)] border border-[rgba(148,163,184,0.4)] text-gray-200">
                        Donut view
                    </div>
                </div>

                <div className="flex items-center gap-2.5 mt-1.5">
                    <div className="relative w-20 h-20 rounded-full bg-[conic-gradient(#5b8dff_0_120deg,#22c55e_120deg_210deg,#f97316_210deg_300deg,#e11d48_300deg_360deg)] flex items-center justify-center shadow-[0_14px_35px_rgba(15,23,42,0.9)] flex-shrink-0">
                        <div className="w-[54px] h-[54px] rounded-full bg-[radial-gradient(circle_at_0_0,rgba(248,250,252,0.18),rgba(15,23,42,0.98))]" />
                        <div className="absolute text-[0.72rem] text-center text-[rgba(226,232,240,0.95)]">
                            {stats.needsPct}%
                            <br />
                            needs
                        </div>
                    </div>

                    <div className="grid grid-cols-1 gap-1.5 text-[0.72rem] flex-1">
                        {[
                            { label: "Needs", color: "bg-[#5b8dff]" },
                            { label: "Wants", color: "bg-[#f97316]" },
                        ].map((item) => (
                            <div key={item.label} className="flex items-center gap-1.5 text-muted">
                                <span className={`w-[9px] h-[9px] rounded-full ${item.color}`} />
                                <span>{item.label}</span>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="flex flex-col gap-1 mt-2 text-[0.74rem] text-muted">
                    <div className="flex justify-between">
                        <span>Impulse (Shop)</span>
                        <span className="text-[0.7rem] px-2 py-0.5 rounded-full border border-[rgba(248,113,113,0.85)] text-[#fecaca] bg-[rgba(15,23,42,0.9)]">
                            {formatCurrency(stats.impulse)}
                        </span>
                    </div>
                    <div className="flex justify-between">
                        <span>Target wants ratio</span>
                        <span className="text-[0.7rem] px-2 py-0.5 rounded-full border border-[rgba(148,163,184,0.45)] text-gray-200 bg-[rgba(15,23,42,0.9)]">
                            ≤ 30%
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );

    const RightPart = () => (
        <div className="flex flex-col gap-3">
            <div className="h-0 md:h-[3.2rem]" /> {/* Spacer only for desktop alignment if needed, or remove */}
            {/* Cashflow Trend (Sparkline) */}
            <div className="glass p-3 flex flex-col gap-2">
                <div className="flex justify-between items-center gap-2">
                    <div>
                        <div className="text-[0.84rem] font-medium">Cashflow trend</div>
                        <div className="text-[0.74rem] text-muted">Last 6 months</div>
                    </div>
                    <div className="text-[0.7rem] px-2 py-1 rounded-full bg-[rgba(15,23,42,0.9)] border border-[rgba(148,163,184,0.4)] text-gray-200">
                        Sparkline
                    </div>
                </div>

                <div className="mt-2 h-11 rounded-xl bg-[linear-gradient(180deg,rgba(15,23,42,0.7),rgba(15,23,42,0.98)),repeating-linear-gradient(to_right,rgba(148,163,184,0.12)_0px,rgba(148,163,184,0.12)_1px,transparent_1px,transparent_10px)] relative overflow-hidden">
                    {/* Placeholder for real sparkline visualization - simplified for now */}
                    <div className="absolute inset-0 flex items-end justify-between px-2 pb-1">
                        {stats.monthlyCashflow.map((m, i) => (
                            <div key={i} className={`w-2 rounded-t-sm ${m.surplus >= 0 ? 'bg-emerald-500/50' : 'bg-red-500/50'}`}
                                style={{ height: `${Math.min(Math.abs(m.surplus) / 20000 * 100, 100)}%` }} />
                        ))}
                    </div>
                </div>

                <div className="flex flex-col gap-1 mt-2 text-[0.74rem]">
                    <div className="flex justify-between items-center">
                        <span>Average monthly surplus</span>
                        <span className="text-[0.7rem] px-1.5 py-0.5 rounded-full border border-[rgba(148,163,184,0.5)] text-gray-200">
                            {formatCurrency(stats.avgSurplus)}
                        </span>
                    </div>
                    <div className="flex justify-between items-center">
                        <span>Worst month</span>
                        <span className="text-[0.7rem] px-2 py-0.5 rounded-full border border-[rgba(248,113,113,0.85)] text-[#fecaca] bg-[rgba(15,23,42,0.9)]">
                            {formatCurrency(stats.worstMonth)}
                        </span>
                    </div>
                    <div className="flex justify-between items-center">
                        <span>Savings rate (curr)</span>
                        <span className="text-[0.7rem] px-2 py-0.5 rounded-full border border-[rgba(148,163,184,0.45)] text-gray-200 bg-[rgba(15,23,42,0.9)]">
                            {stats.savingsRate}%
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );

    return (
        <div className={props.className}>
            {props.part === 'left' && <LeftPart />}
            {props.part === 'right' && <RightPart />}
            {(!props.part || props.part === 'full') && (
                <div className="grid grid-cols-1 md:grid-cols-[1.3fr_1fr] lg:grid-cols-[1.25fr_1fr] gap-3.5 pb-20 md:pb-5">
                    <LeftPart />
                    <RightPart />
                </div>
            )}
        </div>
    );
}
