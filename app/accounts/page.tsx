"use client";
import React, { useState } from "react";
import { useFinance } from "../../context/FinanceContext";
import { Trash2, ArrowUpRight, ArrowDownLeft, Upload } from "lucide-react";
import dynamic from 'next/dynamic';

const ImportModal = dynamic(() => import('../../components/ImportModal'), { ssr: false });

type Transaction = {
    id: string;
    type: "income" | "expense";
    amount: number;
    description: string;
    transaction_date: string;
    contact_id?: string;
    categories?: {
        name: string;
    };
    contacts?: {
        name: string;
    };
};

export default function AccountsPage() {
    const { transactions, deleteTransaction, loading } = useFinance();
    const [isImportOpen, setIsImportOpen] = useState(false);

    if (loading) return <div className="p-4 glass rounded-[26px] h-64 animate-pulse" />;

    return (
        <div className="flex flex-col gap-4">
            <header className="flex items-center justify-between px-3 pt-0 pb-2">
                <div className="flex flex-col gap-0.5">
                    <span className="text-[1.2rem] font-semibold text-text">Transaction History</span>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => setIsImportOpen(true)}
                        className="p-2 rounded-full bg-white/5 hover:bg-white/10 active:bg-white/20 transition-colors text-muted hover:text-white"
                        title="Import PDF"
                    >
                        <Upload size={20} />
                    </button>
                    <div className="w-9 h-9 rounded-full bg-accent/20 flex items-center justify-center text-accent text-xs font-semibold">
                        {transactions.length}
                    </div>
                </div>
            </header>
            <div className="glass p-5 rounded-[26px]">
                <div className="flex flex-col gap-3">
                    {transactions.length === 0 ? (
                        <div className="text-center text-muted py-8 text-sm">No transactions yet</div>
                    ) : (
                        transactions.map((tx: Transaction) => {
                            // Display Logic: Show Contact Name if exists, otherwise Category
                            let mainLabel = tx.categories?.name || "Uncategorized";
                            let subLabel = tx.description || tx.transaction_date;

                            if (tx.contacts?.name) {
                                mainLabel = tx.contacts.name;
                                subLabel = tx.type === 'income' ? 'Got from ' + tx.contacts.name : 'Gave to ' + tx.contacts.name;
                                if (tx.description && tx.description !== mainLabel) subLabel += ` • ${tx.description}`;
                            }

                            return (
                                <div key={tx.id} className="flex items-center justify-between p-3 rounded-[20px] bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.05)]">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${tx.type === "income"
                                            ? "bg-[rgba(34,197,94,0.15)] text-green-400"
                                            : "bg-[rgba(244,63,94,0.15)] text-rose-400"
                                            }`}>
                                            {tx.type === "income" ? <ArrowUpRight size={18} /> : <ArrowDownLeft size={18} />}
                                        </div>
                                        <div>
                                            <div className="text-[0.9rem] font-medium text-gray-200">
                                                {mainLabel}
                                            </div>
                                            <div className="text-[0.75rem] text-muted">
                                                {subLabel}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <span className={`font-semibold text-[0.9rem] ${tx.type === "income" ? "text-green-400" : "text-rose-400"
                                            }`}>
                                            {tx.type === "income" ? "+" : "-"}₹{Number(tx.amount).toLocaleString()}
                                        </span>
                                        <button
                                            onClick={() => deleteTransaction(tx.id)}
                                            className="p-2 text-muted hover:text-rose-400 transition-colors"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>

            {isImportOpen && <ImportModal onClose={() => setIsImportOpen(false)} />}
        </div>
    );
}
