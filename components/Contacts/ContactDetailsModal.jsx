"use client";
import React, { useState, useMemo } from "react";
import { X, Calendar, Edit2, Share2, Copy, CheckCircle } from "lucide-react";
import { getCategoryIcon } from "../../lib/categoryIcons";
import { useFinance } from "../../context/FinanceContext";

export default function ContactDetailsModal({ contact, transactions, onClose, onEdit }) {
    const { settleContact } = useFinance();
    const [copied, setCopied] = useState(false);
    const [isSettling, setIsSettling] = useState(false);

    // Calculate Net Balance for display
    const netBalance = contact.balance || 0;
    const isPositive = netBalance > 0; // They owe me

    // Dynamic History Filtering
    const visibleTransactions = useMemo(() => {
        if (!transactions || transactions.length === 0) return [];

        // 1. Sort Ascending (Oldest First) to calculate running balance
        // Tie breaker: created_at to ensure stable order for same-day transactions (like Settlement)
        const sortedAsc = [...transactions].sort((a, b) => {
            const dateA = new Date(a.transaction_date);
            const dateB = new Date(b.transaction_date);
            if (dateA.getTime() !== dateB.getTime()) return dateA - dateB;

            // If dates are equal, check created_at (if available)
            // Default to 0 if created_at is missing
            const createdA = a.created_at ? new Date(a.created_at) : 0;
            const createdB = b.created_at ? new Date(b.created_at) : 0;
            return createdA - createdB;
        });

        let runningBalance = 0;
        let lastSettledIndex = -1;

        sortedAsc.forEach((tx, index) => {
            const amount = Number(tx.amount);
            // FinanceContext Logic: 
            // Expense = +Debt (They owe me/I paid for them)
            // Income = -Debt (They paid me)
            if (tx.type === 'expense') {
                runningBalance += amount;
            } else {
                runningBalance -= amount;
            }

            // check for near-zero due to floating point
            if (Math.abs(runningBalance) < 0.01) {
                lastSettledIndex = index;
            }
        });

        // Slice from the next item after settlement
        // This includes logic matching user request: "history *after* it was settled"
        const activeHistory = sortedAsc.slice(lastSettledIndex + 1);

        // Return sorted DESCENDING (Newest First) for display
        return activeHistory.sort((a, b) => {
            const dateA = new Date(a.transaction_date);
            const dateB = new Date(b.transaction_date);
            if (dateA.getTime() !== dateB.getTime()) return dateB - dateA;

            const createdA = a.created_at ? new Date(a.created_at) : 0;
            const createdB = b.created_at ? new Date(b.created_at) : 0;
            return createdB - createdA;
        });
    }, [transactions]);

    // Handle Settle
    const handleSettle = async () => {
        if (!settleContact) return;
        setIsSettling(true);
        await settleContact(contact.id);
        setIsSettling(false);
    };

    // Generate Summary Helper
    const generateSummary = () => {
        const lines = [`Transaction History for ${contact.name}`];
        if (contact.phone) lines.push(`Phone: ${contact.phone}`);
        lines.push(`Net Balance: ${isPositive ? '+' : ''}₹${Math.abs(netBalance).toLocaleString('en-IN')}`);
        lines.push("--------------------------------");

        visibleTransactions.forEach(tx => {
            const date = new Date(tx.transaction_date).toLocaleDateString("en-IN", { day: 'numeric', month: 'short', year: 'numeric' });
            const amount = Number(tx.amount).toLocaleString('en-IN');
            const type = tx.type === 'income' ? 'Received (+)' : 'Given (-)';
            const desc = tx.description || "No description";
            lines.push(`${date} | ${type} ₹${amount} | ${desc}`);
        });

        return lines.join("\n");
    };

    // Handle Share
    const handleShare = async () => {
        const text = generateSummary();
        if (navigator.share) {
            try {
                await navigator.share({
                    title: `Transactions - ${contact.name}`,
                    text: text,
                });
            } catch (err) {
                console.log("Share failed or cancelled", err);
            }
        } else {
            // Fallback if sharing not supported
            handleCopy();
        }
    };

    // Handle Copy
    const handleCopy = async () => {
        const text = generateSummary();
        try {
            await navigator.clipboard.writeText(text);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            alert("Failed to copy to clipboard");
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="w-full max-w-md bg-[#0f172a] rounded-[24px] border border-white/10 shadow-2xl flex flex-col max-h-[85vh]">

                {/* Header */}
                <div className="flex items-center justify-between p-5 border-b border-white/5 bg-white/5 rounded-t-[24px]">
                    <div className="flex flex-col">
                        <h2 className="text-xl font-bold text-gray-100">{contact.name}</h2>
                        {contact.phone && <p className="text-sm text-muted">{contact.phone}</p>}
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={onEdit}
                            className="p-2 rounded-full bg-white/5 hover:bg-white/10 text-muted hover:text-white transition-colors"
                        >
                            <Edit2 size={18} />
                        </button>
                        <button
                            onClick={onClose}
                            className="p-2 rounded-full hover:bg-white/10 text-muted transition-colors"
                        >
                            <X size={20} />
                        </button>
                    </div>
                </div>

                {/* Hero Balance */}
                <div className="p-6 flex flex-col items-center justify-center bg-gradient-to-b from-white/5 to-transparent relative">
                    <div className="text-xs uppercase tracking-widest text-muted mb-2">Net Balance</div>
                    <div className={`text-4xl font-bold ${isPositive ? 'text-green-400' : (netBalance < 0 ? 'text-red-400' : 'text-gray-400')}`}>
                        {netBalance === 0 ? "Settled" : `${isPositive ? '+' : ''}₹${Math.abs(netBalance).toLocaleString('en-IN')}`}
                    </div>
                    <div className="text-xs text-muted mt-2">
                        {netBalance === 0
                            ? "No outstanding balance"
                            : isPositive
                                ? "Amount you need to receive"
                                : "Amount you need to pay"}
                    </div>

                    {/* Settle Button - Only show if not settled */}
                    {netBalance !== 0 && (
                        <button
                            onClick={handleSettle}
                            disabled={isSettling}
                            className="mt-4 flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-full transition-colors disabled:opacity-50 shadow-lg shadow-blue-900/20"
                        >
                            <CheckCircle size={16} />
                            {isSettling ? "Settling..." : "Settle Account"}
                        </button>
                    )}
                </div>

                {/* Actions */}
                <div className="px-4 py-2 flex justify-between items-center text-xs text-muted">
                    <span>
                        {visibleTransactions.length} transaction{visibleTransactions.length !== 1 && 's'} shown
                    </span>
                    <div className="flex gap-2">
                        <button
                            onClick={handleCopy}
                            className="flex items-center gap-2 font-medium text-gray-300 hover:text-white transition-colors bg-white/5 hover:bg-white/10 px-3 py-1.5 rounded-full"
                        >
                            <Copy size={12} />
                            {copied ? "Copied!" : "Copy"}
                        </button>
                        <button
                            onClick={handleShare}
                            className="flex items-center gap-2 font-medium text-accent hover:text-accent/80 transition-colors bg-accent/10 px-3 py-1.5 rounded-full"
                        >
                            <Share2 size={12} />
                            Share
                        </button>
                    </div>
                </div>

                {/* List */}
                <div className="flex-1 overflow-y-auto p-0 custom-scrollbar border-t border-white/5">
                    {visibleTransactions.length > 0 ? (
                        <div className="divide-y divide-white/5">
                            {visibleTransactions.map((tx) => (
                                <div key={tx.id} className="p-4 flex items-center justify-between hover:bg-white/5 transition-colors group">
                                    <div className="flex items-center gap-3">
                                        <div className={`p-2 rounded-full ${tx.type === 'income' ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
                                            {(() => {
                                                const Icon = getCategoryIcon(tx.categories?.icon);
                                                return <Icon size={16} />;
                                            })()}
                                        </div>
                                        <div>
                                            <div className="text-sm font-medium text-gray-200">{tx.description || tx.categories?.name || "Transaction"}</div>
                                            <div className="text-xs text-muted flex items-center gap-1">
                                                <Calendar size={10} />
                                                {new Date(tx.transaction_date).toLocaleDateString("en-IN", { day: 'numeric', month: 'short', year: 'numeric' })}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className={`text-sm font-medium ${tx.type === 'income' ? 'text-green-400' : 'text-red-400'}`}>
                                            {tx.type === 'income' ? '+' : '-'}₹{Number(tx.amount).toLocaleString('en-IN')}
                                        </div>
                                        <div className="text-[10px] text-muted capitalize">{tx.type === 'income' ? 'Received' : 'Paid'}</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-12 text-muted">
                            <CheckCircle size={48} className="mb-4 opacity-20 text-green-500" />
                            <p className="text-sm">History cleared (Settled)</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
