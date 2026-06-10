"use client";
import React, { useState } from "react";
import { useFinance } from "../../context/FinanceContext";
import ContactBalanceCard from "../../components/Contacts/ContactBalanceCard";
import ContactDetailsModal from "../../components/Contacts/ContactDetailsModal";
import TopBar from "@/components/TopBar";
import { Search, UserPlus, ArrowRight, User, Phone, Pencil, Trash2, Check, X, Users } from "lucide-react";
import Link from "next/link";

export default function ContactsPage() {
    const { contacts, addContact, updateContact, deleteContact, loading, transactions } = useFinance();

    const [searchTerm, setSearchTerm] = useState("");
    const [isAddMode, setIsAddMode] = useState(false);
    const [editingContactId, setEditingContactId] = useState<string | null>(null);
    const [viewingContactId, setViewingContactId] = useState<string | null>(null);

    // Form State
    const [name, setName] = useState("");
    const [phone, setPhone] = useState("");

    const filteredContacts = (contacts || []).filter((c: any) =>
        c.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const formatCurrency = (val: any) =>
        new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(val);

    // Start Add
    const startAdd = () => {
        setEditingContactId(null);
        setName("");
        setPhone("");
        setIsAddMode(true);
    };

    // Start Edit
    const startEdit = (contact: any) => {
        setIsAddMode(false);
        setEditingContactId(contact.id);
        setName(contact.name);
        setPhone(contact.phone || "");
    };

    // Cancel
    const handleCancel = () => {
        setIsAddMode(false);
        setEditingContactId(null);
        setName("");
        setPhone("");
    };

    // Submit (Add or Update)
    const handleSubmit = async (e: any) => {
        e.preventDefault();
        if (!name.trim()) return;

        let result: any;
        if (editingContactId) {
            result = await updateContact(editingContactId, { name, phone });
        } else {
            result = await addContact({ name, phone });
        }

        if (result.success) {
            handleCancel();
        } else {
            alert(result.error?.message || "Operation failed");
        }
    };

    // Delete
    const handleDelete = async (id: string) => {
        if (window.confirm("Are you sure you want to delete this contact?")) {
            const result = await deleteContact(id);
            if (result.success) {
                handleCancel();
            } else {
                alert("Failed to delete contact");
            }
        }
    };

    if (loading) {
        return (
            <div className="p-4 space-y-4">
                <TopBar />
                <div className="h-64 glass animate-pulse rounded-2xl"></div>
            </div>
        );
    }

    return (
        <div className="pb-24">
            <TopBar />

            <div className="px-4 w-full space-y-6">
                <div className="flex flex-col gap-2">
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-[var(--accent)] to-[var(--accent-3)] bg-clip-text text-transparent flex items-center gap-2">
                        <Users size={28} className="text-[var(--accent)]" /> Contacts
                    </h1>
                    <p className="text-muted text-sm mt-1">Manage your contacts and track balances.</p>
                </div>

                {/* Net Balance Card — only when not in form mode */}
                {!isAddMode && !editingContactId && <ContactBalanceCard />}

                {/* Actions & Search */}
                {!isAddMode && !editingContactId && (
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
                            onClick={startAdd}
                            className="flex items-center justify-center gap-2 px-6 py-3 bg-accent hover:bg-accent/90 text-black font-semibold rounded-xl transition-colors"
                        >
                            <UserPlus size={18} />
                            <span>Add Contact</span>
                        </button>
                    </div>
                )}

                {/* Add / Edit Form */}
                {(isAddMode || editingContactId) && (
                    <form onSubmit={handleSubmit} className="p-4 rounded-2xl glass animate-in fade-in slide-in-from-top-4 border border-white/10">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-sm font-medium uppercase tracking-wider text-muted">
                                {editingContactId ? "Edit Contact" : "New Contact"}
                            </h3>
                            {editingContactId && (
                                <button
                                    type="button"
                                    onClick={() => handleDelete(editingContactId)}
                                    className="text-red-400 hover:text-red-300 transition-colors"
                                >
                                    <Trash2 size={18} />
                                </button>
                            )}
                        </div>

                        <div className="flex flex-col gap-3">
                            <input
                                type="text"
                                placeholder="Name"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-accent/50 transition-colors"
                                autoFocus
                            />
                            <input
                                type="tel"
                                placeholder="Phone (optional)"
                                value={phone}
                                onChange={(e) => setPhone(e.target.value)}
                                className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-accent/50 transition-colors"
                            />
                            <div className="flex gap-2 mt-2">
                                <button
                                    type="button"
                                    onClick={handleCancel}
                                    className="flex-1 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-muted transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 py-3 rounded-xl bg-accent/20 hover:bg-accent/30 text-accent font-medium transition-colors flex items-center justify-center gap-2"
                                >
                                    <Check size={18} />
                                    {editingContactId ? "Save Changes" : "Create Contact"}
                                </button>
                            </div>
                        </div>
                    </form>
                )}

                {/* Contacts Grid */}
                {!isAddMode && !editingContactId && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        {filteredContacts.length === 0 ? (
                            <div className="col-span-full flex flex-col items-center justify-center py-12 text-muted">
                                <User size={48} className="mb-4 opacity-20" />
                                <p>{searchTerm ? "No contacts found." : "No contacts yet."}</p>
                            </div>
                        ) : (
                            filteredContacts.map((contact: any) => (
                                <div
                                    key={contact.id}
                                    className="glass p-4 rounded-2xl flex items-center justify-between group hover:bg-white/5 transition-all hover:scale-[1.01] cursor-pointer"
                                    onClick={() => setViewingContactId(contact.id)}
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gray-700 to-gray-900 flex items-center justify-center border border-white/10 text-lg group-hover:bg-accent/10 group-hover:text-accent transition-colors">
                                            {contact.name.charAt(0).toUpperCase()}
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="font-medium text-white">{contact.name}</span>
                                            {contact.phone && (
                                                <div className="flex items-center gap-1 text-xs text-muted">
                                                    <Phone size={10} />
                                                    <span>{contact.phone}</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-3">
                                        <div className="text-right">
                                            {(contact.balance || 0) !== 0 ? (
                                                <>
                                                    <div className={`font-semibold ${contact.balance > 0 ? "text-green-400" : "text-red-400"}`}>
                                                        {contact.balance > 0 ? "+" : ""}{formatCurrency(contact.balance)}
                                                    </div>
                                                    <div className="text-[10px] text-muted uppercase tracking-wider">
                                                        {contact.balance > 0 ? "Owes You" : "You Owe"}
                                                    </div>
                                                </>
                                            ) : (
                                                <div className="text-sm text-muted">Settled</div>
                                            )}
                                        </div>

                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                startEdit(contact);
                                            }}
                                            className="p-2 -mr-1 text-muted hover:text-white transition-colors"
                                        >
                                            <Pencil size={16} />
                                        </button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                )}
            </div>

            {/* Details Modal */}
            {viewingContactId && (() => {
                const contact = contacts.find((c: any) => c.id === viewingContactId);
                if (!contact) return null;
                const contactTx = transactions ? transactions.filter((t: any) => t.contact_id === contact.id) : [];
                return (
                    <ContactDetailsModal
                        contact={contact}
                        transactions={contactTx}
                        onClose={() => setViewingContactId(null)}
                        onEdit={() => {
                            setViewingContactId(null);
                            startEdit(contact);
                        }}
                    />
                );
            })()}
        </div>
    );
}
