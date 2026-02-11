"use client";
import React from "react";
import { useFinance } from "../../context/FinanceContext";
import BudgetHistoryModal from "./BudgetHistoryModal";

const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        maximumFractionDigits: 0,
    }).format(amount);
};

/**
 * @param {Object} props
 * @param {string} [props.month]
 * @param {function} [props.onMonthChange]
 */
export default function BudgetCard({ month = null, onMonthChange = null }) {
    const { financials: currentFinancials, getFinancials, loading, transactions } = useFinance();
    const [showHistory, setShowHistory] = React.useState(false);

    if (loading) return <div className="glass p-3.5 h-[140px] animate-pulse rounded-[18px] bg-white/5" />;

    // If month prop is provided, we are in "Historical/Insights" mode
    // Otherwise we use the "Live/Dashboard" mode (currentFinancials)
    let financials = currentFinancials;
    if (month && getFinancials) {
        financials = getFinancials(month);
    }

    const progress = Math.min((financials.budgetUsed / (financials.budgetLimit || 1)) * 100, 100);

    // Filter transactions for history (Budgetable Expenses only) - MATCHING THE PERIOD
    const budgetHistory = transactions.filter(t => {
        const isExpense = t.type === 'expense' && !t.contact_id;
        if (!isExpense) return false;

        // If viewing specific month, filter by it
        // If no month prop, we usually expect dashboard to show current month history too?
        // Actually, dashboard shows global (current month) history.
        const targetMonthStr = month || new Date().toISOString().slice(0, 7);
        const tDate = new Date(t.transaction_date);
        const tMonthStr = `${tDate.getFullYear()}-${String(tDate.getMonth() + 1).padStart(2, '0')}`;
        return tMonthStr === targetMonthStr;
    });

    const handlePrevMonth = () => {
        if (onMonthChange && month) {
            const date = new Date(month + "-01");
            date.setMonth(date.getMonth() - 1);
            onMonthChange(date.toISOString().slice(0, 7));
        }
    };

    const handleNextMonth = () => {
        if (onMonthChange && month) {
            const date = new Date(month + "-01");
            date.setMonth(date.getMonth() + 1);
            onMonthChange(date.toISOString().slice(0, 7));
        }
    };

    const displayMonth = month
        ? new Date(month + "-01").toLocaleDateString('default', { month: 'long', year: 'numeric' })
        : "Monthly budget";

    return (
        <>
            <div className="glass p-3.5 md:p-3 flex flex-col gap-2.5 w-full min-w-0">
                <div className="flex justify-between items-center gap-2">
                    <div className="flex-1">
                        {onMonthChange ? (
                            <div className="flex items-center gap-2">
                                <button onClick={handlePrevMonth} className="p-1 hover:bg-white/10 rounded-full transition-colors text-muted hover:text-white">
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6" /></svg>
                                </button>
                                <div className="text-[0.86rem] font-medium min-w-[100px] text-center">{displayMonth}</div>
                                <button onClick={handleNextMonth} className="p-1 hover:bg-white/10 rounded-full transition-colors text-muted hover:text-white">
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6" /></svg>
                                </button>
                            </div>
                        ) : (
                            <>
                                <div className="text-[0.86rem] font-medium">Monthly budget</div>
                                <div className="text-[0.76rem] text-muted">Global limit</div>
                            </>
                        )}
                    </div>

                    {!onMonthChange && (
                        <div className="text-[0.7rem] px-2 py-1 rounded-full border border-[rgba(255,255,255,0.1)] text-[#e2e8f0] bg-[rgba(20,20,20,0.95)]">
                            Global · {formatCurrency(financials.budgetLimit)}
                        </div>
                    )}
                </div>

                <div className="flex justify-between items-baseline gap-3 mt-1">
                    <div className="text-[1.05rem] font-semibold">Used: {formatCurrency(financials.budgetUsed)}</div>
                    <div className="text-[0.8rem] text-[var(--accent)]">
                        Remaining: <span className="font-semibold">{formatCurrency(financials.budgetRemaining)}</span>
                    </div>
                </div>

                <div className="mt-2.5 h-2 rounded-full bg-[rgba(255,255,255,0.08)] border border-[rgba(255,255,255,0.05)] overflow-hidden relative">
                    <div
                        className="absolute inset-0 bg-gradient-to-r from-[var(--accent)] to-[#b45309] rounded-full origin-left transition-all duration-500"
                        style={{ width: `${progress}%` }}
                    />
                </div>

                <div className="flex justify-between mt-1 text-[0.7rem] text-muted">
                    <span>0%</span>
                    <span>50%</span>
                    <span>75%</span>
                    <span>100%</span>
                </div>

                {!loading && financials.solvency?.isInsolvent && (
                    <div className="mt-2 p-2 rounded-xl bg-red-500/20 border border-red-500/30 flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 text-red-200 text-[0.75rem] font-medium">
                            <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                            Budget Exceeds Balance
                        </div>
                    </div>
                )}

                <div className="mt-2 flex justify-between gap-2 text-[0.78rem]">
                    <button className="text-[var(--accent)] opacity-80 hover:opacity-100 transition-opacity">
                        Adjust {onMonthChange ? 'limit' : 'monthly budget'}
                    </button>
                    <button
                        onClick={() => setShowHistory(true)}
                        className="text-muted hover:text-gray-300 transition-colors"
                    >
                        View history
                    </button>
                </div>
            </div>

            {showHistory && (
                <BudgetHistoryModal
                    transactions={budgetHistory}
                    onClose={() => setShowHistory(false)}
                />
            )}
        </>
    );
}
