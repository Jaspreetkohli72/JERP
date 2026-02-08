"use client";
import React, { useMemo, useState } from "react";
import { useFinance } from "../../../context/FinanceContext";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, ArrowUp, ArrowDown, Phone, Mail, Plus } from "lucide-react";
import Link from "next/link";
import TopBar from "@/components/TopBar";
import AddTransactionForm from "@/components/AddTransactionForm";

export default function ContactDetailsPage() {
    const { id } = useParams();
    const router = useRouter();
    const { contacts, transactions, loading, openAddTxModal } = useFinance();

    // Add Tx specifically for this contact
    const [isAddTxOpen, setIsAddTxOpen] = useState(false);
    const [txType, setTxType] = useState("income");

    const contact = useMemo(() => contacts.find(c => c.id === id), [contacts, id]);

    const contactTransactions = useMemo(() => {
        if (!contact) return [];
        return transactions.filter(t => t.contact_id === id);
    }, [transactions, id, contact]);

    const formatCurrency = (val) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val);
    const formatDate = (dateString) => new Date(dateString).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

    if (loading) {
        return (
            <div className="p-4 space-y-4">
                <TopBar />
                <div className="h-64 glass-soft animate-pulse rounded-2xl"></div>
            </div>
        );
    }

    if (!contact) {
        return (
            <div className="p-8 text-center">
                <h2 className="text-xl font-bold text-white mb-4">Contact not found</h2>
                <Link href="/contacts" className="text-accent hover:underline">Return to Contacts</Link>
            </div>
        );
    }

    return (
        <div className="pb-24">
            <TopBar />

            {isAddTxOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <div className="w-full max-w-md">
                        <AddTransactionForm
                            type={txType}
                            onClose={() => setIsAddTxOpen(false)}
                            title={`New ${txType} for ${contact.name}`}
                            initialData={{ contact_id: contact.id }} // Pre-fill contact
                        />
                    </div>
                </div>
            )}

            <div className="px-4 max-w-4xl mx-auto space-y-6">

                {/* Header */}
                <div className="flex items-center gap-4">
                    <button onClick={() => router.back()} className="p-2 hover:bg-white/10 rounded-full transition-colors text-white">
                        <ArrowLeft size={20} />
                    </button>
                    <div>
                        <h1 className="text-2xl font-bold text-white">{contact.name}</h1>
                        <div className="flex items-center gap-3 text-xs text-muted mt-1">
                            {contact.phone && <span className="flex items-center gap-1"><Phone size={12} /> {contact.phone}</span>}
                            {contact.email && <span className="flex items-center gap-1"><Mail size={12} /> {contact.email}</span>}
                        </div>
                    </div>
                </div>

                {/* Balance Card */}
                <div className="glass-card p-6 rounded-3xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-8 opacity-10">
                        <ArrowUp size={100} className="transform rotate-45" />
                    </div>
                    <div className="relative z-10">
                        <div className="text-sm text-gray-400 mb-1 uppercase tracking-wider font-medium">Net Balance</div>
                        <div className={`text-4xl font-bold mb-4 ${contact.balance > 0 ? "text-green-400" :
                            contact.balance < 0 ? "text-red-400" : "text-white"
                            }`}>
                            {contact.balance > 0 ? "+" : ""}{formatCurrency(contact.balance)}
                        </div>
                        <div className="flex gap-3">
                            <button
                                onClick={() => { setTxType('income'); setIsAddTxOpen(true); }}
                                className="flex-1 py-2.5 bg-green-500/20 hover:bg-green-500/30 text-green-400 rounded-xl font-medium transition-colors flex items-center justify-center gap-2"
                            >
                                <ArrowUp size={16} /> Received
                            </button>
                            <button
                                onClick={() => { setTxType('expense'); setIsAddTxOpen(true); }}
                                className="flex-1 py-2.5 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-xl font-medium transition-colors flex items-center justify-center gap-2"
                            >
                                <ArrowDown size={16} /> Paid
                            </button>
                        </div>
                    </div>
                </div>

                {/* Transaction History */}
                <div>
                    <h3 className="text-lg font-semibold text-white mb-4">Transaction History</h3>
                    <div className="space-y-3">
                        {contactTransactions.length === 0 ? (
                            <div className="text-center py-12 text-muted bg-white/5 rounded-2xl border border-white/5">
                                <p>No transactions yet.</p>
                            </div>
                        ) : (
                            contactTransactions.map((t: any) => (
                                <div key={t.id} className="glass-soft p-4 rounded-2xl flex items-center justify-between group hover:bg-white/5 transition-colors">
                                    <div className="flex items-center gap-4">
                                        <div className={`p-3 rounded-full ${t.type === 'income' ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
                                            {t.type === 'income' ? <ArrowUp size={20} /> : <ArrowDown size={20} />}
                                        </div>
                                        <div className="flex flex-col gap-0.5">
                                            <span className="font-medium text-white">{t.description || "Unspecified"}</span>
                                            <span className="text-xs text-muted">{formatDate(t.transaction_date)}</span>
                                        </div>
                                    </div>
                                    <div className={`text-lg font-semibold ${t.type === 'income' ? 'text-green-400' : 'text-white'}`}>
                                        {t.type === 'income' ? '+' : '-'} {formatCurrency(t.amount)}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

            </div>
        </div>
    );
}
