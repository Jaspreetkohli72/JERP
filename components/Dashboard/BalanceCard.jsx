"use client";
import React, { useState } from "react";
import { ArrowUp, ArrowDown } from "lucide-react";
import { useFinance } from "../../context/FinanceContext";
import AddTransactionForm from "../AddTransactionForm";

// Helper for formatting currency
const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        maximumFractionDigits: 0,
    }).format(amount);
};

export default function BalanceCard() {
    const { financials, totalLiquidAssets, loading } = useFinance();
    const [activeForm, setActiveForm] = useState(null); // 'income' | 'expense' | null

    if (loading) return (
        <div className="glass-soft p-4 h-[220px] animate-pulse rounded-[26px] bg-black/20 border border-white/5 relative overflow-hidden">
            <div className="space-y-4">
                <div className="h-4 w-32 bg-white/10 rounded-full" />
                <div className="h-10 w-48 bg-white/10 rounded-lg" />
                <div className="flex gap-4 pt-2">
                    <div className="h-4 w-24 bg-white/5 rounded" />
                    <div className="h-4 w-24 bg-white/5 rounded" />
                </div>
                <div className="grid grid-cols-2 gap-3 pt-2">
                    <div className="h-12 bg-white/5 rounded-xl" />
                    <div className="h-12 bg-white/5 rounded-xl" />
                </div>
            </div>
        </div>
    );

    return (
        <>
            <div className="glass-soft p-4 md:p-3.5 rounded-[26px] bg-[radial-gradient(circle_at_0_0,rgba(255,215,0,0.1),hsla(0,0%,0%,0)_55%),linear-gradient(135deg,rgba(20,20,20,0.95),rgba(10,10,10,1))] relative overflow-hidden group">
                {/* Glow overlay */}
                <div className="absolute inset-0 bg-gradient-to-br from-[rgba(255,215,0,0.1)] via-transparent to-transparent mix-blend-screen opacity-50 pointer-events-none" />

                <div className="relative flex flex-col gap-2.5 z-10">
                    <div className="flex justify-between items-center gap-2.5">
                        <div>
                            <div className="text-[0.82rem] uppercase tracking-[0.14em] text-[rgba(226,232,240,0.9)]">
                                Net balance
                            </div>
                            <div className={`text-[1.6rem] font-semibold tracking-wide ${totalLiquidAssets >= 0 ? "text-white" : "text-red-300"}`}>
                                {formatCurrency(totalLiquidAssets)}
                            </div>
                        </div>
                    </div>

                    {/* Simple Text Metrics as requested */}
                    <div className="flex gap-3 text-[0.78rem] text-muted">
                        <span>
                            Income: <strong className="text-[var(--accent)]">{formatCurrency(financials.income)}</strong>
                        </span>
                        <span>
                            Expenses: <strong className="text-white">{formatCurrency(financials.expense)}</strong>
                        </span>
                    </div>

                    {/* Action Buttons */}
                    {!activeForm ? (
                        <div className="grid grid-cols-2 gap-2.5 mt-1">
                            <button
                                onClick={() => setActiveForm('income')}
                                className="group/btn relative flex items-center justify-center gap-2 py-3 px-4 rounded-[20px] bg-gradient-to-br from-[var(--accent)] to-[var(--accent-3)] shadow-lg shadow-yellow-900/20 active:scale-[0.98] transition-all"
                            >
                                <ArrowUp size={18} className="text-black" />
                                <span className="text-sm font-bold text-black">Add Income</span>
                            </button>
                            <button
                                onClick={() => setActiveForm('expense')}
                                className="group/btn relative flex items-center justify-center gap-2 py-3 px-4 rounded-[20px] bg-gradient-to-br from-[#e0e0e0] to-[#94a3b8] shadow-lg shadow-slate-900/20 active:scale-[0.98] transition-all"
                            >
                                <ArrowDown size={18} className="text-black" />
                                <span className="text-sm font-bold text-black">Add Expense</span>
                            </button>
                        </div>
                    ) : (
                        <div className="mt-2 animate-in fade-in slide-in-from-top-2">
                            <AddTransactionForm
                                type={activeForm}
                                title={activeForm === "income" ? "You Received" : "You Paid"}
                                onClose={() => setActiveForm(null)}
                            />
                        </div>
                    )}
                </div>
            </div>
        </>
    );
}
