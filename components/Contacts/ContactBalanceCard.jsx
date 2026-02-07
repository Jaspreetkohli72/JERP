"use client";
import React, { useState } from "react";
import { ArrowUp, ArrowDown } from "lucide-react";
import { useFinance } from "../../context/FinanceContext";
import AddTransactionForm from "../AddTransactionForm";

const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        maximumFractionDigits: 0,
    }).format(amount);
};

export default function ContactBalanceCard() {
    const { contacts, loading } = useFinance();
    const [activeForm, setActiveForm] = useState(null); // 'income' | 'expense' | null

    if (loading) return <div className="glass-soft p-4 h-48 animate-pulse rounded-[26px]" />;

    // Calculate Metrics
    // Balance > 0 means they OWES ME (Asset) -> "To Receive"
    // Balance < 0 means I OWE THEM (Liability) -> "To Pay"

    const netBalance = contacts.reduce((sum, c) => sum + (c.balance || 0), 0);

    // Sum of positive balances (Owed to me)
    const toReceive = contacts
        .filter(c => (c.balance || 0) > 0)
        .reduce((sum, c) => sum + c.balance, 0);

    // Sum of negative balances (I owe) - keep as positive number for display
    const toPay = Math.abs(contacts
        .filter(c => (c.balance || 0) < 0)
        .reduce((sum, c) => sum + c.balance, 0));

    return (
        <div className="mb-6">
            <div className="glass-soft p-5 rounded-[26px] bg-[radial-gradient(circle_at_100%_0%,rgba(56,189,248,0.1),hsla(0,0%,0%,0)_50%),linear-gradient(135deg,rgba(15,23,42,0.95),rgba(15,23,42,0.85))] relative group overflow-hidden">
                {/* Glow overlay */}
                <div className="absolute inset-0 bg-gradient-to-br from-[rgba(168,85,247,0.15)] via-transparent to-[rgba(59,130,246,0.15)] mix-blend-screen pointer-events-none" />

                <div className="relative z-10 flex flex-col gap-4">

                    {/* Header / Net Balance */}
                    {/* Header / Net Balance */}
                    <div className="flex justify-between items-start">
                        <div>
                            <div className="text-[0.75rem] uppercase tracking-[0.14em] text-muted mb-1">
                                Net Balance
                            </div>
                            <div className={`text-3xl font-semibold tracking-wide ${netBalance >= 0 ? 'text-white' : 'text-red-300'}`}>
                                {formatCurrency(netBalance)}
                            </div>
                            <div className="text-xs text-muted mt-1">
                                {netBalance === 0
                                    ? "You are all clear."
                                    : netBalance > 0
                                        ? "Overall, you need to take money."
                                        : "Overall, you need to give money."}
                            </div>
                        </div>

                        {/* Summary Pills */}
                        <div className="flex flex-col gap-2 items-end">
                            <div className="flex items-center gap-2 px-3 py-1.5 rounded-[20px] bg-green-500/10 border border-green-500/20">
                                <span className="text-[10px] uppercase text-green-400 font-medium tracking-wider">To Receive</span>
                                <span className="text-sm font-bold text-green-400">{formatCurrency(toReceive)}</span>
                            </div>
                            <div className="flex items-center gap-2 px-3 py-1.5 rounded-[20px] bg-red-500/10 border border-red-500/20">
                                <span className="text-[10px] uppercase text-red-400 font-medium tracking-wider">To Pay</span>
                                <span className="text-sm font-bold text-red-400">{formatCurrency(toPay)}</span>
                            </div>
                        </div>
                    </div>

                    {/* Quick Actions */}
                    {!activeForm ? (
                        <div className="grid grid-cols-2 gap-3 mt-1">
                            {/* I GAVE money -> They owe me (Positive Balance for them) -> Expense for me? 
                                Wait, standard accounting:
                                - Expense usually means money leaving my pocket.
                                - Income usually means money entering.
                                
                                If I LEND money: Money leaves me. It is an Expense technically, or a Transfer.
                                In this app context:
                                - Expense linked to Contact = I paid them (Decreases my cash, Increases their debt to me / Reduces what I owe them).
                                - Income linked to Contact = They paid me (Increases my cash, Reduces their debt / Increases what I owe them).
                            */}

                            <button
                                onClick={() => setActiveForm('income')}
                                className="group/btn relative flex items-center justify-center gap-2 py-3 px-4 rounded-[20px] bg-gradient-to-br from-emerald-500/20 to-teal-500/20 border border-emerald-500/30 hover:border-emerald-500/50 transition-all active:scale-[0.98]"
                            >
                                <div className="absolute inset-0 rounded-[20px] bg-emerald-500/10 group-hover/btn:bg-emerald-500/20 transition-colors" />
                                <ArrowDown size={18} className="text-emerald-400" />
                                <div className="flex flex-col items-start leading-tight">
                                    <span className="text-sm font-semibold text-emerald-100">Got</span>
                                    <span className="text-[10px] text-emerald-400/80">You received</span>
                                </div>
                            </button>

                            <button
                                onClick={() => setActiveForm('expense')}
                                className="group/btn relative flex items-center justify-center gap-2 py-3 px-4 rounded-[20px] bg-gradient-to-br from-orange-500/20 to-red-500/20 border border-orange-500/30 hover:border-orange-500/50 transition-all active:scale-[0.98]"
                            >
                                <div className="absolute inset-0 rounded-[20px] bg-orange-500/10 group-hover/btn:bg-orange-500/20 transition-colors" />
                                <ArrowUp size={18} className="text-orange-400" />
                                <div className="flex flex-col items-start leading-tight">
                                    <span className="text-sm font-semibold text-orange-100">Gave</span>
                                    <span className="text-[10px] text-orange-400/80">You paid</span>
                                </div>
                            </button>
                        </div>
                    ) : (
                        <div className="mt-2 animate-in fade-in slide-in-from-top-2">
                            <AddTransactionForm
                                type={activeForm}
                                title={activeForm === 'income' ? 'You Received' : 'You Paid'}
                                onClose={() => setActiveForm(null)}
                            />
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
