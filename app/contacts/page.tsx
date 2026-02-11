"use client";
import React, { useState } from "react";
import { useFinance } from "../../context/FinanceContext";
import { Search, UserPlus, ArrowRight, User } from "lucide-react";
import Link from "next/link";
import TopBar from "@/components/TopBar";

export default function ContactsPage() {
    const { contacts, loading, addContact } = useFinance();
    const [searchTerm, setSearchTerm] = useState("");
    const [isAdding, setIsAdding] = useState(false);
    const [newContactName, setNewContactName] = useState("");

    const filteredContacts = contacts?.filter((c: any) =>
        c.name.toLowerCase().includes(searchTerm.toLowerCase())
    ) || [];

    const formatCurrency = (val: any) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val);

    const handleAddContact = async (e: any) => {
        e.preventDefault();
        if (!newContactName.trim()) return;

        const { success } = await addContact({ name: newContactName });
        if (success) {
            setNewContactName("");
            setIsAdding(false);
        } else {
            alert("Failed to create contact");
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

            <div className="px-4 w-full space-y-6">
                <div className="flex flex-col gap-2">
                    <h1 className="text-2xl font-bold text-white">Contacts</h1>
                    <p className="text-muted text-sm">Manage your contacts and track balances.</p>
                </div>

                {/* Actions & Search */}
                <div className="flex flex-col md:flex-row gap-4">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" size={18} />
                        <input
                            type="text"
                            placeholder="Search contacts..."
                            className="w-full pl-10 pr-4 py-3 bg-black/20 border border-white/10 rounded-xl focus:outline-none focus:border-accent text-sm text-white"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <button
                        onClick={() => setIsAdding(true)}
                        className="flex items-center justify-center gap-2 px-6 py-3 bg-accent hover:bg-accent/90 text-white font-medium rounded-xl transition-colors"
                    >
                        <UserPlus size={18} />
                        <span>Add Contact</span>
                    </button>
                </div>

                {/* Add Contact Form (Inline) */}
                {isAdding && (
                    <form onSubmit={handleAddContact} className="p-4 bg-black/20 border border-white/10 rounded-2xl animate-in slide-in-from-top-2">
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={newContactName}
                                onChange={(e) => setNewContactName(e.target.value)}
                                placeholder="Enter contact name..."
                                className="flex-1 px-4 py-3 bg-black/40 border border-white/10 rounded-xl focus:outline-none focus:border-accent text-sm"
                                autoFocus
                            />
                            <div className="flex gap-2">
                                <button
                                    type="submit"
                                    disabled={!newContactName.trim()}
                                    className="px-6 bg-accent/20 text-accent rounded-xl hover:bg-accent/30 transition-colors"
                                >
                                    Save
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setIsAdding(false);
                                        setNewContactName("");
                                    }}
                                    className="px-4 bg-white/5 text-muted rounded-xl hover:bg-white/10 transition-colors"
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    </form>
                )}

                {/* Contacts List */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {filteredContacts.length === 0 ? (
                        <div className="col-span-full text-center py-12 text-muted">
                            <p>No contacts found.</p>
                        </div>
                    ) : (
                        filteredContacts.map((contact: any) => (
                            <Link
                                key={contact.id}
                                href={`/contacts/${contact.id}`}
                                className="glass-soft p-4 rounded-2xl flex items-center justify-between group hover:bg-white/5 transition-all hover:scale-[1.01]"
                            >
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-muted group-hover:bg-accent/10 group-hover:text-accent transition-colors">
                                        <User size={20} />
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="font-medium text-white">{contact.name}</span>
                                        <span className="text-xs text-muted">
                                            {contact.phone || "No phone"}
                                        </span>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className={`font-semibold ${contact.balance > 0 ? "text-green-400" :
                                        contact.balance < 0 ? "text-red-400" : "text-muted"
                                        }`}>
                                        {contact.balance > 0 ? "+" : ""}{formatCurrency(contact.balance)}
                                    </div>
                                    <div className="text-[10px] text-muted flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        View History <ArrowRight size={10} />
                                    </div>
                                </div>
                            </Link>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}
