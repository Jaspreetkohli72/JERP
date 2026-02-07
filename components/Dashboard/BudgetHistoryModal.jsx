"use client";
import React from "react";
import { X, Calendar, Wallet } from "lucide-react";
import { getCategoryIcon } from "../../lib/categoryIcons";

export default function BudgetHistoryModal({ transactions, onClose }) {
    // Filter out contact transactions if not already filtered, but parent should pass correct list
    // We expect 'transactions' to be the list of expenses counting towards budget.

    // Group by month/date? Or just simple list
    // User asked for "all the transactions that were used to calculate the budget"

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="w-full max-w-md bg-[#0f172a] rounded-[24px] border border-white/10 shadow-2xl flex flex-col max-h-[80vh]">

                {/* Header */}
                <div className="flex items-center justify-between p-5 border-b border-white/5">
                    <div>
                        <h2 className="text-lg font-semibold text-gray-100">Budget History</h2>
                        <p className="text-xs text-muted">Transactions in this period</p>
                    </div>
                    <button onClick={onClose} className="p-1.5 hover:bg-white/5 rounded-full text-muted transition-colors">
                        <X size={20} />
                    </button>
                </div>

                {/* List */}
                <div className="flex-1 overflow-y-auto p-0 custom-scrollbar">
                    {transactions.length > 0 ? (
                        <div className="divide-y divide-white/5">
                            {transactions.map((tx) => (
                                <div key={tx.id} className="p-4 flex items-center justify-between hover:bg-white/5 transition-colors">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 rounded-full bg-white/5 text-muted">
                                            {(() => {
                                                const Icon = getCategoryIcon(tx.categories?.icon);
                                                return <Icon size={16} />;
                                            })()}
                                        </div>
                                        <div>
                                            <div className="text-sm font-medium text-gray-200">{tx.description || tx.categories?.name || "Expense"}</div>
                                            <div className="text-xs text-muted flex items-center gap-1">
                                                <Calendar size={10} />
                                                {new Date(tx.transaction_date).toLocaleDateString("en-IN", { day: 'numeric', month: 'short' })}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-sm font-medium text-white">-₹{Number(tx.amount).toLocaleString('en-IN')}</div>
                                        <div className="text-[10px] text-muted">{tx.categories?.name}</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-12 text-muted">
                            <Wallet size={32} className="mb-2 opacity-50" />
                            <p className="text-sm">No transactions found</p>
                        </div>
                    )}
                </div>

                {/* Footer Total */}
                <div className="p-5 border-t border-white/5 bg-black/20 rounded-b-[24px]">
                    <div className="flex justify-between items-center text-sm">
                        <span className="text-muted">Total Used</span>
                        <span className="font-semibold text-white">
                            ₹{transactions.reduce((sum, t) => sum + Number(t.amount), 0).toLocaleString('en-IN')}
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
}
