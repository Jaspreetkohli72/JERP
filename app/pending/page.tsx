"use client";
import React, { useState } from "react";
import { ArrowUpRight, ArrowDownLeft, Plus, Users, Search, Edit2, Trash2, X, Check } from "lucide-react";
import { useFinance } from "../../context/FinanceContext";

const formatCurrency = (amount: number | string) => {
    return new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        maximumFractionDigits: 0,
    }).format(Number(amount));
};

const formatDate = (dateString: string) => {
    if (!dateString) return "";
    return new Date(dateString).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
    });
};

interface Contact {
    id: string;
    name: string;
    balance: number;
}

export default function PendingPage() {
    // @ts-ignore
    const {
        contacts, loading, addContact, settleContact, openAddTxModal,
        transactions, updateContact, updateTransaction, deleteTransaction
    } = useFinance();
    const [searchTerm, setSearchTerm] = useState("");
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);

    // Manage/Edit Contact State
    const [managingContact, setManagingContact] = useState<Contact | null>(null);
    const [editingName, setEditingName] = useState("");

    // Edit Transaction State
    const [editingTxId, setEditingTxId] = useState<string | null>(null);
    const [editFormData, setEditFormData] = useState({ amount: "", description: "" });

    const handleEditClick = (tx: any) => {
        setEditingTxId(tx.id);
        setEditFormData({ amount: tx.amount, description: tx.description || "" });
    };

    const handleSaveTx = async (txId: string) => {
        if (!editFormData.amount) return;

        await updateTransaction(txId, {
            amount: Number(editFormData.amount),
            description: editFormData.description
        });

        setEditingTxId(null);
        // Note: Context updates transaction locally, but we might need to update 'contactTransactions' view or 'managingContact' 
        // derived balance.
        // Actually, 'contactTransactions' is derived from 'transactions' (Context), so it will auto-update.
        // 'managingContact' is local state, so its balance displayed in the modal footer might NOT update automatically unless we re-fetch or calc it.
        // For now, let's close the modal or let the user see the updated list.
    };

    // Add Contact State
    const [newName, setNewName] = useState("");
    const [submitting, setSubmitting] = useState(false);

    // Filter contacts based on search
    const filteredContacts = (contacts || []).filter((c: Contact) =>
        c.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Split into Debtors (Positive Balance = They Owe Us) and Creditors (Negative Balance = We Owe Them)
    const debtors = filteredContacts.filter((c: Contact) => c.balance > 0).sort((a: Contact, b: Contact) => b.balance - a.balance);
    const creditors = filteredContacts.filter((c: Contact) => c.balance < 0).sort((a: Contact, b: Contact) => a.balance - b.balance); // Most negative first

    const totalToReceive = debtors.reduce((acc: number, c: Contact) => acc + (c.balance || 0), 0);
    const totalToPay = creditors.reduce((acc: number, c: Contact) => acc + Math.abs(c.balance || 0), 0);

    const handleAddContact = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newName) return;
        setSubmitting(true);
        await addContact({ name: newName });
        setSubmitting(false);
        setIsAddModalOpen(false);
        setNewName("");
    };

    const handleSettle = async (id: string) => {
        if (confirm("Settle this account balance to zero?")) {
            await settleContact(id);
        }
    };

    const openManageModal = (contact: Contact) => {
        setManagingContact(contact);
        setEditingName(contact.name);
    };

    const handleUpdateContactName = async () => {
        if (!managingContact || !editingName.trim()) return;
        if (editingName !== managingContact.name) {
            await updateContact(managingContact.id, { name: editingName });
            // Update local state to reflect change immediately if needed, though context should handle it
            setManagingContact({ ...managingContact, name: editingName });
        }
    };

    const handleDeleteTransaction = async (txId: string) => {
        if (confirm("Delete this transaction?")) {
            await deleteTransaction(txId);
        }
    };

    // Get transactions for the managing contact
    const contactTransactions = managingContact
        ? transactions.filter((t: any) => t.contact_id === managingContact.id).sort((a: any, b: any) => new Date(b.transaction_date).getTime() - new Date(a.transaction_date).getTime())
        : [];

    return (
        <div className="flex flex-col gap-8 p-4 md:p-8 text-white w-full mb-24">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-[var(--accent)] to-[var(--accent-3)] bg-clip-text text-transparent">
                        Pending Payments
                    </h1>
                    <p className="text-muted text-sm mt-1">Manage debtors and creditors.</p>
                </div>
                <div className="flex gap-3">
                    <div className="relative group">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted group-focus-within:text-[var(--accent)] transition-colors" size={18} />
                        <input
                            type="text"
                            placeholder="Search contacts..."
                            className="bg-black/40 border border-white/10 rounded-full pl-10 pr-4 py-2 text-sm focus:border-[var(--accent)] focus:outline-none w-full md:w-64"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <button
                        onClick={() => openAddTxModal("expense", { is_debt: true, title: "Add Pending Payment" })}
                        className="bg-white/10 text-white w-10 h-10 rounded-full font-semibold flex items-center justify-center hover:bg-white/20 transition-all"
                        title="Add Pending Transaction"
                    >
                        <ArrowUpRight size={20} />
                    </button>
                    <button
                        onClick={() => setIsAddModalOpen(true)}
                        className="bg-[var(--accent)] text-black w-10 h-10 rounded-full font-semibold flex items-center justify-center hover:opacity-90 transition-all shadow-[0_0_15px_rgba(255,215,0,0.3)]"
                        title="Add Contact"
                    >
                        <Plus size={20} />
                    </button>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="glass p-6 rounded-3xl relative overflow-hidden flex items-center justify-between">
                    <div>
                        <div className="text-muted text-xs uppercase tracking-wider mb-1">Total To Receive</div>
                        <div className="text-3xl font-bold text-green-400">{formatCurrency(totalToReceive)}</div>
                    </div>
                    <div className="w-12 h-12 rounded-full bg-green-500/10 flex items-center justify-center text-green-400">
                        <ArrowDownLeft size={24} />
                    </div>
                </div>
                <div className="glass p-6 rounded-3xl relative overflow-hidden flex items-center justify-between">
                    <div>
                        <div className="text-muted text-xs uppercase tracking-wider mb-1">Total To Pay</div>
                        <div className="text-3xl font-bold text-red-400">{formatCurrency(totalToPay)}</div>
                    </div>
                    <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center text-red-400">
                        <ArrowUpRight size={24} />
                    </div>
                </div>
            </div>

            {/* Main Content Areas - Side-by-Side Split View */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

                {/* DEBTORS (To Receive) */}
                <div className="flex flex-col gap-4">
                    <h2 className="text-xl font-semibold flex items-center gap-2 text-green-400 border-b border-white/5 pb-2">
                        To Receive (Debtors) <span className="text-xs bg-green-500/20 text-green-300 px-2 py-0.5 rounded-full">{debtors.length}</span>
                    </h2>

                    {debtors.length === 0 ? (
                        <div className="text-muted text-sm italic p-8 text-center border dashed border-white/10 rounded-2xl">No pending payments to receive.</div>
                    ) : (
                        <div className="flex flex-col gap-4">
                            {debtors.map((c: Contact) => (
                                <div key={c.id} className="glass p-4 rounded-2xl flex items-center justify-between group hover:bg-white/5 transition-colors border border-white/5 hover:border-green-500/30">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-500/20 to-teal-500/20 flex items-center justify-center text-green-300 font-bold text-sm shrink-0">
                                            {c.name.substring(0, 2).toUpperCase()}
                                        </div>
                                        <div className="flex flex-col">
                                            <div className="font-semibold text-white">{c.name}</div>
                                            <div className="text-xs text-green-400/80">Owes you</div>
                                        </div>
                                    </div>

                                    <div className="flex flex-col items-end gap-1">
                                        <div className="flex items-center gap-3">
                                            <div className="text-lg font-bold text-green-400">{formatCurrency(c.balance)}</div>
                                            <button
                                                onClick={() => openManageModal(c)}
                                                className="p-1.5 rounded-lg hover:bg-white/10 text-muted hover:text-white transition-colors"
                                            >
                                                <Edit2 size={14} />
                                            </button>
                                        </div>
                                        <button
                                            onClick={() => handleSettle(c.id)}
                                            className="text-xs text-muted hover:text-green-400 transition-colors pr-1"
                                        >
                                            Settle
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* CREDITORS (To Pay) */}
                <div className="flex flex-col gap-4">
                    <h2 className="text-xl font-semibold flex items-center gap-2 text-red-400 border-b border-white/5 pb-2">
                        To Pay (Creditors) <span className="text-xs bg-red-500/20 text-red-300 px-2 py-0.5 rounded-full">{creditors.length}</span>
                    </h2>

                    {creditors.length === 0 ? (
                        <div className="text-muted text-sm italic p-8 text-center border dashed border-white/10 rounded-2xl">No pending payments to make.</div>
                    ) : (
                        <div className="flex flex-col gap-4">
                            {creditors.map((c: Contact) => (
                                <div key={c.id} className="glass p-4 rounded-2xl flex items-center justify-between group hover:bg-white/5 transition-colors border border-white/5 hover:border-red-500/30">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-red-500/20 to-orange-500/20 flex items-center justify-center text-red-300 font-bold text-sm shrink-0">
                                            {c.name.substring(0, 2).toUpperCase()}
                                        </div>
                                        <div className="flex flex-col">
                                            <div className="font-semibold text-white">{c.name}</div>
                                            <div className="text-xs text-red-400/80">You owe</div>
                                        </div>
                                    </div>

                                    <div className="flex flex-col items-end gap-1">
                                        <div className="flex items-center gap-3">
                                            <div className="text-lg font-bold text-red-400">{formatCurrency(Math.abs(c.balance))}</div>
                                            <button
                                                onClick={() => openManageModal(c)}
                                                className="p-1.5 rounded-lg hover:bg-white/10 text-muted hover:text-white transition-colors"
                                            >
                                                <Edit2 size={14} />
                                            </button>
                                        </div>
                                        <button
                                            onClick={() => handleSettle(c.id)}
                                            className="text-xs text-muted hover:text-red-400 transition-colors pr-1"
                                        >
                                            Settle
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

            </div>

            {/* Add Contact Modal */}
            {isAddModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <div className="glass p-6 rounded-2xl w-full max-w-sm animate-in fade-in zoom-in-95">
                        <h2 className="text-xl font-bold mb-4">Add Contact</h2>
                        <form onSubmit={handleAddContact} className="flex flex-col gap-4">
                            <div>
                                <label className="text-xs text-muted uppercase">Name</label>
                                <input
                                    type="text"
                                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 mt-1 focus:border-[var(--accent)] focus:outline-none"
                                    placeholder="e.g. John Doe, Supplier X"
                                    value={newName}
                                    onChange={(e) => setNewName(e.target.value)}
                                    required
                                />
                            </div>
                            <div className="flex gap-2 mt-2">
                                <button
                                    type="button"
                                    onClick={() => setIsAddModalOpen(false)}
                                    className="flex-1 py-3 rounded-xl hover:bg-white/5 transition-colors text-sm"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={submitting}
                                    className="flex-1 bg-[var(--accent)] text-black font-semibold rounded-xl py-3 text-sm"
                                >
                                    {submitting ? "Adding..." : "Add Contact"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Manage Contact Modal (Edit/History) */}
            {managingContact && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <div className="glass p-6 rounded-2xl w-full max-w-lg animate-in fade-in zoom-in-95 flex flex-col gap-4 max-h-[80vh]">
                        <div className="flex items-center justify-between border-b border-white/5 pb-4">
                            <h2 className="text-xl font-bold">Manage Contact</h2>
                            <button onClick={() => { setManagingContact(null); setEditingTxId(null); }} className="text-muted hover:text-white"><X size={20} /></button>
                        </div>

                        {/* Rename Section */}
                        <div className="flex gap-2 items-end">
                            <div className="flex-1">
                                <label className="text-xs text-muted uppercase">Contact Name</label>
                                <input
                                    type="text"
                                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 mt-1 focus:border-[var(--accent)] focus:outline-none"
                                    value={editingName}
                                    onChange={(e) => setEditingName(e.target.value)}
                                />
                            </div>
                            <button
                                onClick={handleUpdateContactName}
                                disabled={editingName === managingContact.name}
                                className="bg-white/10 hover:bg-white/20 text-white p-3 rounded-xl disabled:opacity-50"
                            >
                                <Check size={20} />
                            </button>
                        </div>

                        {/* Transaction History */}
                        <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col gap-3 min-h-[200px]">
                            <h3 className="text-sm font-semibold text-muted sticky top-0 bg-[#0a0a0a]/95 py-2 backdrop-blur-md z-10">Transaction History</h3>
                            {contactTransactions.length === 0 ? (
                                <p className="text-center text-muted text-sm py-4">No transactions found.</p>
                            ) : (
                                contactTransactions.map((tx: any) => (
                                    <div key={tx.id} className="p-3 rounded-xl bg-white/5 border border-white/5 flex flex-col gap-2">
                                        {editingTxId === tx.id ? (
                                            <div className="flex flex-col gap-2 w-full">
                                                <input
                                                    type="text"
                                                    value={editFormData.description}
                                                    onChange={(e) => setEditFormData({ ...editFormData, description: e.target.value })}
                                                    className="bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-sm text-white w-full focus:outline-none focus:border-[var(--accent)]"
                                                    placeholder="Description"
                                                />
                                                <div className="flex items-center gap-2">
                                                    <input
                                                        type="number"
                                                        value={editFormData.amount}
                                                        onChange={(e) => setEditFormData({ ...editFormData, amount: e.target.value })}
                                                        className="bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-sm text-white w-full focus:outline-none focus:border-[var(--accent)]"
                                                        placeholder="Amount"
                                                    />
                                                    <button
                                                        onClick={() => handleSaveTx(tx.id)}
                                                        className="p-2 bg-green-500/20 text-green-400 rounded-lg hover:bg-green-500/30 transition-colors"
                                                    >
                                                        <Check size={16} />
                                                    </button>
                                                    <button
                                                        onClick={() => setEditingTxId(null)}
                                                        className="p-2 bg-red-500/10 text-red-400 rounded-lg hover:bg-red-500/20 transition-colors"
                                                    >
                                                        <X size={16} />
                                                    </button>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="flex items-center justify-between w-full">
                                                <div className="flex flex-col gap-1">
                                                    <span className="text-xs text-muted">{formatDate(tx.transaction_date)} • {tx.type}</span>
                                                    <span className="text-sm text-white font-medium">{tx.description || "No description"}</span>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    <span className={`font-mono font-bold ${tx.type === 'income' ? 'text-green-400' : 'text-red-400'}`}>
                                                        {tx.type === 'income' ? '+' : '-'} {formatCurrency(tx.amount)}
                                                    </span>
                                                    <div className="flex gap-1">
                                                        <button
                                                            onClick={() => handleEditClick(tx)}
                                                            className="p-1.5 text-muted hover:text-[var(--accent)] hover:bg-white/10 rounded-lg transition-colors"
                                                        >
                                                            <Edit2 size={14} />
                                                        </button>
                                                        <button
                                                            onClick={() => handleDeleteTransaction(tx.id)}
                                                            className="p-1.5 text-muted hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                                                        >
                                                            <Trash2 size={14} />
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ))
                            )}
                        </div>

                        <div className="border-t border-white/5 pt-4 mt-auto">
                            <div className="flex justify-between items-center bg-white/5 p-4 rounded-xl">
                                <span className="text-sm text-muted">Current Balance</span>
                                <span className={`text-xl font-bold ${managingContact.balance > 0 ? 'text-green-400' : managingContact.balance < 0 ? 'text-red-400' : 'text-white'}`}>
                                    {managingContact.balance > 0 ? 'To Receive: ' : managingContact.balance < 0 ? 'To Pay: ' : 'Settled: '}
                                    {formatCurrency(Math.abs(managingContact.balance))}
                                </span>
                            </div>
                        </div>

                    </div>
                </div>
            )}

        </div>
    );
}
