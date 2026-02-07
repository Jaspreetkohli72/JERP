"use client";
import React, { useState } from "react";
import { ArrowUpRight, ArrowDownLeft, Plus, Users, Search } from "lucide-react";
import { useFinance } from "../../context/FinanceContext";

const formatCurrency = (amount: number | string) => {
    return new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        maximumFractionDigits: 0,
    }).format(Number(amount));
};

interface Contact {
    id: string;
    name: string;
    balance: number;
}

export default function PendingPage() {
    // @ts-ignore
    const { contacts, loading, addContact, settleContact } = useFinance();
    const [searchTerm, setSearchTerm] = useState("");
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);

    // Add Contact State
    const [newName, setNewName] = useState("");
    const [submitting, setSubmitting] = useState(false);

    // Filter contacts based on search
    const filteredContacts = contacts.filter((c: Contact) =>
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

    return (
        <div className="flex flex-col gap-6 p-4 md:p-8 text-white max-w-[1200px] mx-auto mb-24">
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
                        onClick={() => setIsAddModalOpen(true)}
                        className="bg-[var(--accent)] text-black w-10 h-10 rounded-full font-semibold flex items-center justify-center hover:opacity-90 transition-all shadow-[0_0_15px_rgba(255,215,0,0.3)]"
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

            {/* Main Content Areas */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

                {/* DEBTORS (To Receive) */}
                <div className="flex flex-col gap-4">
                    <h2 className="text-xl font-semibold flex items-center gap-2 text-green-400 border-b border-white/5 pb-2">
                        To Receive (Debtors) <span className="text-xs bg-green-500/20 text-green-300 px-2 py-0.5 rounded-full">{debtors.length}</span>
                    </h2>
                    <div className="flex flex-col gap-3">
                        {debtors.length === 0 ? (
                            <div className="text-muted text-sm italic p-8 text-center border dashed border-white/10 rounded-2xl">No pending payments to receive.</div>
                        ) : (
                            debtors.map((c: Contact) => (
                                <div key={c.id} className="glass p-4 rounded-xl flex items-center justify-between group hover:bg-white/5 transition-colors">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-500/20 to-teal-500/20 flex items-center justify-center text-green-300 font-bold text-sm">
                                            {c.name.substring(0, 2).toUpperCase()}
                                        </div>
                                        <div>
                                            <div className="font-medium text-gray-100">{c.name}</div>
                                            <div className="text-xs text-green-400/80">Owes you</div>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className="font-semibold text-lg text-green-400">{formatCurrency(c.balance)}</div>
                                        <button
                                            onClick={() => handleSettle(c.id)}
                                            className="text-xs text-muted hover:text-white underline opacity-0 group-hover:opacity-100 transition-opacity"
                                        >
                                            Settle
                                        </button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* CREDITORS (To Pay) */}
                <div className="flex flex-col gap-4">
                    <h2 className="text-xl font-semibold flex items-center gap-2 text-red-400 border-b border-white/5 pb-2">
                        To Pay (Creditors) <span className="text-xs bg-red-500/20 text-red-300 px-2 py-0.5 rounded-full">{creditors.length}</span>
                    </h2>
                    <div className="flex flex-col gap-3">
                        {creditors.length === 0 ? (
                            <div className="text-muted text-sm italic p-8 text-center border dashed border-white/10 rounded-2xl">No pending payments to make.</div>
                        ) : (
                            creditors.map((c: Contact) => (
                                <div key={c.id} className="glass p-4 rounded-xl flex items-center justify-between group hover:bg-white/5 transition-colors">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-red-500/20 to-orange-500/20 flex items-center justify-center text-red-300 font-bold text-sm">
                                            {c.name.substring(0, 2).toUpperCase()}
                                        </div>
                                        <div>
                                            <div className="font-medium text-gray-100">{c.name}</div>
                                            <div className="text-xs text-red-400/80">You owe</div>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className="font-semibold text-lg text-red-400">{formatCurrency(Math.abs(c.balance))}</div>
                                        <button
                                            onClick={() => handleSettle(c.id)}
                                            className="text-xs text-muted hover:text-white underline opacity-0 group-hover:opacity-100 transition-opacity"
                                        >
                                            Settle
                                        </button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
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
        </div>
    );
}
