"use client";
import React, { useState } from "react";
import { useFinance } from "../../context/FinanceContext";
// ... imports
import { ArrowUp, ArrowDown, Search, Filter, Edit2, Trash2, AlertCircle } from "lucide-react";
import TopBar from "@/components/TopBar";
import AddTransactionForm from "@/components/AddTransactionForm";

export default function TransactionsPage() {
    const { transactions, loading, deleteTransaction } = useFinance();
    const [filter, setFilter] = useState("all"); // all, income, expense
    const [searchTerm, setSearchTerm] = useState("");

    // Edit/Delete State
    const [editingTx, setEditingTx] = useState<any>(null);
    const [deletingId, setDeletingId] = useState<string | null>(null);

    const filteredTransactions = transactions.filter((t: any) => {
        const matchesFilter = filter === "all" || t.type === filter;
        const matchesSearch = t.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            t.amount.toString().includes(searchTerm);
        return matchesFilter && matchesSearch;
    });

    const formatCurrency = (val: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val);

    const formatDate = (dateString: string) => {
        if (!dateString) return "";
        return new Date(dateString).toLocaleDateString('en-IN', {
            day: 'numeric', month: 'short', year: 'numeric'
        });
    };

    const handleDelete = async (id: string) => {
        if (confirm("Are you sure you want to delete this transaction? This will reverse the wallet balance.")) {
            await deleteTransaction(id);
        }
    };

    if (loading) {
        return (
            <div className="p-4 space-y-4">
                <TopBar />
                <div className="h-64 glass-soft animate-pulse rounded-2xl"></div>
            </div>
        );
    }

    return (
        <div className="pb-24">
            <TopBar />

            {/* Edit Modal */}
            {editingTx && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <div className="w-full max-w-md">
                        <AddTransactionForm
                            type={editingTx.type}
                            title="Edit Transaction"
                            initialData={editingTx}
                            onClose={() => setEditingTx(null)}
                        />
                    </div>
                </div>
            )}

            <div className="px-4 w-full max-w-5xl mx-auto space-y-6">
                <div className="flex flex-col gap-2">
                    <h1 className="text-2xl font-bold text-white">Transactions</h1>
                    <p className="text-muted text-sm">Review your income and expenses.</p>
                </div>

                {/* Filters */}
                <div className="flex flex-col md:flex-row gap-4">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" size={18} />
                        <input
                            type="text"
                            placeholder="Search transactions..."
                            className="w-full pl-10 pr-4 py-2.5 bg-black/20 border border-white/10 rounded-xl focus:outline-none focus:border-accent text-sm text-white"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={() => setFilter("all")}
                            className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${filter === "all" ? "bg-white text-black" : "bg-black/20 text-muted hover:text-white"}`}
                        >
                            All
                        </button>
                        <button
                            onClick={() => setFilter("income")}
                            className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${filter === "income" ? "bg-green-500/20 text-green-400 border border-green-500/20" : "bg-black/20 text-muted hover:text-white"}`}
                        >
                            Income
                        </button>
                        <button
                            onClick={() => setFilter("expense")}
                            className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${filter === "expense" ? "bg-red-500/20 text-red-400 border border-red-500/20" : "bg-black/20 text-muted hover:text-white"}`}
                        >
                            Expense
                        </button>
                    </div>
                </div>

                {/* Transaction List */}
                <div className="space-y-3">
                    {filteredTransactions.length === 0 ? (
                        <div className="text-center py-12 text-muted">
                            <p>No transactions found.</p>
                        </div>
                    ) : (
                        filteredTransactions.map((t: any) => (
                            <div key={t.id} className="glass-soft p-4 rounded-2xl flex items-center justify-between group hover:bg-white/5 transition-colors relative">
                                <div className="flex items-center gap-4">
                                    <div className={`p-3 rounded-full ${t.type === 'income' ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
                                        {t.type === 'income' ? <ArrowUp size={20} /> : <ArrowDown size={20} />}
                                    </div>
                                    <div className="flex flex-col gap-0.5">
                                        <span className="font-medium text-white">{t.description || "Unspecified"}</span>
                                        <div className="flex items-center gap-2 text-xs text-muted">
                                            <span>{formatDate(t.transaction_date)}</span>
                                            {t.contacts?.name && (
                                                <>
                                                    <span>•</span>
                                                    <span>{t.contacts.name}</span>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4">
                                    <div className={`text-lg font-semibold ${t.type === 'income' ? 'text-green-400' : 'text-white'}`}>
                                        {t.type === 'income' ? '+' : '-'} {formatCurrency(t.amount)}
                                    </div>

                                    {/* Actions (visible on hover) */}
                                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity absolute right-4 bg-[#1e1e2e]/90 p-1 rounded-lg backdrop-blur-md md:static md:bg-transparent md:opacity-0 md:group-hover:opacity-100">
                                        <button
                                            onClick={() => setEditingTx(t)}
                                            className="p-2 hover:bg-white/10 rounded-lg text-blue-400 transition-colors"
                                        >
                                            <Edit2 size={16} />
                                        </button>
                                        <button
                                            onClick={() => handleDelete(t.id)}
                                            className="p-2 hover:bg-white/10 rounded-lg text-red-400 transition-colors"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}
