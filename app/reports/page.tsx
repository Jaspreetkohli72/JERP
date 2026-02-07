"use client";
import React, { useState } from 'react';
import { useFinance } from '@/context/FinanceContext';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend } from 'recharts';
import { ArrowUpCircle, ArrowDownCircle, Banknote, Landmark, Activity } from 'lucide-react';

export default function ReportsPage() {
    // @ts-ignore
    const { getFinancials } = useFinance();
    const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));

    const financials = getFinancials(month);

    // Data for charts
    const incomeData = [
        // We need breakdown data. getFinancials returns 'income' total but also 'transactions' etc available via context if we want drilldown.
        // For now, let's just use top-level summary from financials.
        // Wait, getFinancials aggregated everything.
        // I might want to modify getFinancials to return the specific *components* (transIncome, billsIncome etc) if I want to chart them.
        // But for now, let's start with Total Income vs Total Expense.
        { name: 'Income', value: financials.income, color: '#4ade80' },
        { name: 'Expense', value: financials.expense, color: '#f87171' }
    ];

    const COLORS = ['#4ade80', '#f87171', '#60a5fa', '#facc15'];

    return (
        <div className="flex flex-col gap-6 p-4 md:p-8 text-white max-w-[1200px] mx-auto mb-20">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-[var(--accent)] to-[var(--accent-3)] bg-clip-text text-transparent">Financial Reports</h1>
                    <p className="text-muted text-sm mt-1">Profit & Loss Statement</p>
                </div>
                <input
                    type="month"
                    value={month}
                    onChange={(e) => setMonth(e.target.value)}
                    className="bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white [color-scheme:dark]"
                />
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="glass p-6 rounded-xl border border-white/5 flex flex-col gap-1">
                    <span className="text-gray-400 text-sm flex items-center gap-2"><ArrowUpCircle size={16} className="text-green-400" /> Total Income</span>
                    <span className="text-3xl font-bold text-white">₹{financials.income.toLocaleString()}</span>
                </div>
                <div className="glass p-6 rounded-xl border border-white/5 flex flex-col gap-1">
                    <span className="text-gray-400 text-sm flex items-center gap-2"><ArrowDownCircle size={16} className="text-red-400" /> Total Expenses</span>
                    <span className="text-3xl font-bold text-white">₹{financials.expense.toLocaleString()}</span>
                </div>
                <div className={`glass p-6 rounded-xl border border-white/5 flex flex-col gap-1 ${financials.balance >= 0 ? 'bg-green-500/5' : 'bg-red-500/5'}`}>
                    <span className="text-gray-400 text-sm flex items-center gap-2"><Landmark size={16} className={financials.balance >= 0 ? "text-green-400" : "text-red-400"} /> Net Profit / Loss</span>
                    <span className={`text-3xl font-bold ${financials.balance >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {financials.balance >= 0 ? '+' : ''}₹{financials.balance.toLocaleString()}
                    </span>
                </div>
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Income vs Expense Pie */}
                <div className="glass p-6 rounded-xl border border-white/5 min-h-[400px] flex flex-col">
                    <h3 className="font-bold text-lg mb-6 flex items-center gap-2"><Activity size={18} className="text-[var(--accent)]" /> Overview</h3>
                    <div className="flex-1 w-full h-full min-h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={incomeData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={100}
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    {incomeData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                                    ))}
                                </Pie>
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#000', border: '1px solid #333', borderRadius: '8px' }}
                                    itemStyle={{ color: '#fff' }}
                                />
                                <Legend verticalAlign="bottom" height={36} />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Metrics */}
                <div className="flex flex-col gap-4">
                    <div className="glass p-6 rounded-xl border border-white/5">
                        <h3 className="font-bold text-lg mb-4 text-gray-200">Key Metrics</h3>
                        <div className="space-y-4">
                            <div className="flex justify-between items-center p-3 bg-white/5 rounded-lg">
                                <span className="text-gray-400">Savings Rate</span>
                                <span className={`font-mono font-bold ${financials.savingsRate > 20 ? 'text-green-400' : financials.savingsRate > 0 ? 'text-yellow-400' : 'text-red-400'}`}>
                                    {financials.savingsRate}%
                                </span>
                            </div>
                            <div className="flex justify-between items-center p-3 bg-white/5 rounded-lg">
                                <span className="text-gray-400">Burn Rate</span>
                                <span className="font-mono font-bold text-red-400">₹{financials.expense.toLocaleString()} / mo</span>
                            </div>
                            <div className="flex justify-between items-center p-3 bg-white/5 rounded-lg">
                                <span className="text-gray-400">Runway</span>
                                <span className="font-mono font-bold text-[var(--accent)]">{financials.runway} Months</span>
                            </div>
                        </div>
                    </div>

                    <div className="glass p-6 rounded-xl border border-white/5 flex-1">
                        <h3 className="font-bold text-lg mb-2 text-gray-200">Top Expense</h3>
                        {financials.topCategory.amount > 0 ? (
                            <div className="mt-4">
                                <div className="text-2xl font-bold text-white">{financials.topCategory.name}</div>
                                <div className="text-red-400 font-mono">₹{financials.topCategory.amount.toLocaleString()}</div>
                                <p className="text-xs text-gray-500 mt-2">Highest spending category this month.</p>
                            </div>
                        ) : (
                            <div className="text-gray-500 italic mt-4">No expenses recorded yet.</div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
