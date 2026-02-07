"use client";
import React, { useMemo, useState } from "react";
import { useFinance } from "../../context/FinanceContext";
import { ArrowUpRight, ArrowDownLeft, TrendingUp, Calendar, AlertCircle } from "lucide-react";

// Helper to format currency
const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        maximumFractionDigits: 0,
    }).format(amount);
};

export default function DetailedAnalytics() {
    const { transactions, loading } = useFinance();
    const [period, setPeriod] = useState(6); // 6 months

    const stats = useMemo(() => {
        if (!transactions.length) return null;

        const now = new Date();
        const months = [];
        const monthlyData = {}; // 'YYYY-MM': { income, expense, savings }

        // Initialize months
        for (let i = period - 1; i >= 0; i--) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
            months.push({ key, label: d.toLocaleString('default', { month: 'short' }) });
            monthlyData[key] = { income: 0, expense: 0, categories: {} };
        }

        // Aggregate Data
        transactions.forEach(t => {
            const d = new Date(t.transaction_date);
            const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

            if (monthlyData[key]) {
                const amt = Number(t.amount);
                if (t.type === 'income') {
                    monthlyData[key].income += amt;
                } else if (t.type === 'expense') {
                    // Exclude Contact Transactions from Expense Budget/Analytics
                    if (!t.contact_id) {
                        monthlyData[key].expense += amt;
                        const cat = t.categories?.name || 'Uncategorized';
                        monthlyData[key].categories[cat] = (monthlyData[key].categories[cat] || 0) + amt;
                    }
                }
            }
        });

        // Prepare Chart Data
        const chartData = months.map(m => {
            const data = monthlyData[m.key];
            return {
                label: m.label,
                income: data.income,
                expense: data.expense,
                savings: data.income - data.expense,
                savingsRate: data.income > 0 ? Math.round(((data.income - data.expense) / data.income) * 100) : 0
            };
        });

        const maxVal = Math.max(...chartData.map(d => Math.max(d.income, d.expense)), 10000); // 10k min scale

        // Category Trends (Top 3 Overall)
        const totalCatUsage = {};
        Object.values(monthlyData).forEach(m => {
            Object.entries(m.categories).forEach(([cat, val]) => {
                totalCatUsage[cat] = (totalCatUsage[cat] || 0) + val;
            });
        });
        const topCategories = Object.entries(totalCatUsage)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 3)
            .map(([name]) => name);

        // Trend Data for Top Categories
        // Normalize for sparklines: array of 0-1 values
        const categoryTrends = topCategories.map(cat => {
            const points = months.map(m => monthlyData[m.key].categories[cat] || 0);
            const max = Math.max(...points, 100);
            return {
                name: cat,
                points,
                normalized: points.map(p => p / max)
            };
        });

        // Averages
        const totalIncome = chartData.reduce((acc, c) => acc + c.income, 0);
        const totalExpense = chartData.reduce((acc, c) => acc + c.expense, 0);
        const avgSavingsRate = totalIncome > 0 ? Math.round(((totalIncome - totalExpense) / totalIncome) * 100) : 0;

        // New Metrics: Largest Expense, Avg Transaction, Frequent Category
        let largestExpense = 0;
        let largestExpenseName = "-";
        let txCount = 0;
        let catFrequency = {};

        transactions.forEach(t => {
            if (t.type === 'expense' && !t.contact_id) {
                const amt = Number(t.amount);
                if (amt > largestExpense) {
                    largestExpense = amt;
                    largestExpenseName = t.description || t.categories?.name || "Expense";
                }
                txCount++;
                const catName = t.categories?.name || 'Uncategorized';
                catFrequency[catName] = (catFrequency[catName] || 0) + 1;
            }
        });

        const avgTxValue = txCount > 0 ? Math.round(totalExpense / txCount) : 0;
        const mostFreqCatEntry = Object.entries(catFrequency).sort((a, b) => b[1] - a[1])[0];
        const mostFreqCat = mostFreqCatEntry ? mostFreqCatEntry[0] : "-";

        return { chartData, maxVal, categoryTrends, avgSavingsRate, largestExpense, largestExpenseName, avgTxValue, mostFreqCat };
    }, [transactions, period]);

    if (!stats) return <div className="p-4 text-muted text-sm">Loading advanced analytics...</div>;

    return (
        <div className="flex flex-col gap-4 animate-in slide-in-from-bottom-4 duration-500">

            {/* Header / Filter */}
            <div className="flex justify-between items-center px-1">
                <div className="flex flex-col">
                    <h3 className="text-lg font-semibold text-gray-100">Deep Dive</h3>
                    <span className="text-xs text-muted">Income vs Expense trends</span>
                </div>
                {/* Could add period toggle here later */}
            </div>

            {/* Income vs Expense Bar Chart */}
            <div className="glass p-5 rounded-[24px] relative overflow-hidden">
                <div className="flex justify-between items-start mb-6">
                    <div>
                        <div className="text-xs text-muted font-medium uppercase tracking-wider mb-1">Savings Rate (Avg)</div>
                        <div className="text-2xl font-bold flex items-center gap-2">
                            {stats.avgSavingsRate}%
                            <span className={`text-xs px-2 py-0.5 rounded-full ${stats.avgSavingsRate > 20 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-yellow-500/10 text-yellow-400'}`}>
                                {stats.avgSavingsRate > 20 ? 'Healthy' : 'Needs Work'}
                            </span>
                        </div>
                    </div>
                    <div className="flex gap-4 text-xs">
                        <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-[#5b8dff]" /> Income</div>
                        <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-white/20" /> Expense</div>
                    </div>
                </div>

                {/* Custom CSS Bar Chart */}
                <div className="h-40 flex items-end gap-2 sm:gap-4">
                    {stats.chartData.map((d, i) => (
                        <div key={i} className="flex-1 flex flex-col justify-end gap-1 h-full group relative">
                            {/* Bars */}
                            <div className="flex gap-0.5 sm:gap-1 items-end justify-center h-full w-full">
                                {/* Income Bar */}
                                <div
                                    className="w-full max-w-[12px] sm:max-w-[20px] bg-[#5b8dff] rounded-t-sm transition-all duration-500 group-hover:bg-[#4a7de8]"
                                    style={{ height: `${(d.income / stats.maxVal) * 100}%` }}
                                >
                                    {/* Tooltip */}
                                    <div className="opacity-0 group-hover:opacity-100 absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-slate-900 border border-slate-700 text-xs py-1 px-2 rounded shadow-xl whitespace-nowrap z-20 pointer-events-none transition-opacity">
                                        inc: {formatCurrency(d.income)}
                                    </div>
                                </div>
                                {/* Expense Bar */}
                                <div
                                    className="w-full max-w-[12px] sm:max-w-[20px] bg-white/20 rounded-t-sm transition-all duration-500 group-hover:bg-white/30"
                                    style={{ height: `${(d.expense / stats.maxVal) * 100}%` }}
                                >
                                    {/* Tooltip */}
                                    <div className="opacity-0 group-hover:opacity-100 absolute top-full mt-1 left-1/2 -translate-x-1/2 text-[10px] text-muted whitespace-nowrap z-20 pointer-events-none transition-opacity">
                                        exp: {formatCurrency(d.expense)}
                                    </div>
                                </div>
                            </div>
                            {/* Label */}
                            <div className="text-[10px] text-center text-muted mt-2">{d.label}</div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Additional Metrics Grid */}
            <div className="grid grid-cols-3 gap-3">
                <div className="glass p-3 rounded-[20px] flex flex-col justify-center">
                    <span className="text-[10px] text-muted uppercase tracking-wider">Largest Expense</span>
                    <div className="text-sm font-semibold truncate mt-1">{formatCurrency(stats.largestExpense)}</div>
                    <div className="text-[10px] text-muted truncate">{stats.largestExpenseName}</div>
                </div>
                <div className="glass p-3 rounded-[20px] flex flex-col justify-center">
                    <span className="text-[10px] text-muted uppercase tracking-wider">Avg Transaction</span>
                    <div className="text-sm font-semibold truncate mt-1">{formatCurrency(stats.avgTxValue)}</div>
                    <div className="text-[10px] text-muted truncate">Per expense</div>
                </div>
                <div className="glass p-3 rounded-[20px] flex flex-col justify-center">
                    <span className="text-[10px] text-muted uppercase tracking-wider">Top Category</span>
                    <div className="text-sm font-semibold truncate mt-1">{stats.mostFreqCat}</div>
                    <div className="text-[10px] text-muted truncate">By frequency</div>
                </div>
            </div>

            {/* Category Trends */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {stats.categoryTrends.map(cat => (
                    <div key={cat.name} className="glass p-4 rounded-[20px] flex flex-col gap-3">
                        <div className="flex justify-between items-center">
                            <span className="text-sm font-medium">{cat.name}</span>
                            <TrendingUp size={14} className="text-muted" />
                        </div>
                        {/* CSS Sparkline */}
                        <div className="h-16 flex items-end justify-between gap-1 overflow-hidden">
                            {cat.normalized.map((h, i) => (
                                <div
                                    key={i}
                                    className="flex-1 bg-gradient-to-t from-white/5 to-white/20 rounded-t-[2px]"
                                    style={{ height: `${h * 100}%` }}
                                />
                            ))}
                        </div>
                    </div>
                ))}

                {stats.categoryTrends.length === 0 && (
                    <div className="p-8 text-center text-muted bg-white/5 rounded-[20px] border border-dashed border-white/10 text-xs">
                        Not enough data for insights
                    </div>
                )}
            </div>

        </div>
    );
}
