"use client";
import React, { useState } from "react";
import { useFinance } from "../../context/FinanceContext";
import ContactBalanceCard from "../../components/Contacts/ContactBalanceCard";
import ContactDetailsModal from "../../components/Contacts/ContactDetailsModal";
import { Plus, User, Phone, Pencil, Trash2, X, Check } from "lucide-react";

export default function ContactsPage() {
    const { contacts, addContact, updateContact, deleteContact, loading, transactions } = useFinance();

    // UI State
    const [isAddMode, setIsAddMode] = useState(false);
    const [editingContactId, setEditingContactId] = useState(null);
    const [viewingContactId, setViewingContactId] = useState(null);

    // Form State
    const [name, setName] = useState("");
    const [phone, setPhone] = useState("");

    // Start Add
    const startAdd = () => {
        setEditingContactId(null);
        setName("");
        setPhone("");
        setIsAddMode(true);
    };

    // Start Edit
    const startEdit = (contact) => {
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
    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!name.trim()) return;

        let result;
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
    const handleDelete = async (id) => {
        if (window.confirm("Are you sure you want to delete this contact?")) {
            const result = await deleteContact(id);
            if (result.success) {
                handleCancel();
            } else {
                alert("Failed to delete contact");
            }
        }
    };

    return (
        <div className="pb-24">
            <header className="flex items-center justify-between px-3 pt-0 pb-2 mb-4">
                <div className="flex flex-col gap-0.5">
                    <span className="text-[1.2rem] font-semibold text-text">Contacts</span>
                    <p className="text-xs text-muted">Manage debts and credits</p>
                </div>
                {!isAddMode && !editingContactId && (
                    <button
                        onClick={startAdd}
                        className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
                    >
                        <Plus size={20} className="text-white" />
                    </button>
                )}
            </header>

            {/* Net Balance Card */}
            {!isAddMode && !editingContactId && (
                <ContactBalanceCard />
            )}

            {/* Form Area (Add or Edit) */}
            {(isAddMode || editingContactId) && (
                <form onSubmit={handleSubmit} className="mb-6 p-4 rounded-2xl glass-soft animate-in fade-in slide-in-from-top-4 border border-white/10">
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

            {/* List */}
            {loading ? (
                <div className="space-y-3">
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="h-20 rounded-2xl bg-white/5 animate-pulse" />
                    ))}
                </div>
            ) : contacts.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-muted">
                    <User size={48} className="mb-4 opacity-20" />
                    <p>No contacts yet</p>
                </div>
            ) : (
                <div className="grid gap-3">
                    {contacts.map((contact) => (
                        <div key={contact.id} className="relative group hover:cursor-pointer" onClick={() => setViewingContactId(contact.id)}>
                            <div className="p-4 rounded-2xl glass-soft flex items-center justify-between relative z-10 hover:bg-white/5 transition-colors">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gray-700 to-gray-900 flex items-center justify-center border border-white/10 text-lg">
                                        {contact.name.charAt(0).toUpperCase()}
                                    </div>
                                    <div>
                                        <h3 className="font-medium text-gray-200">{contact.name}</h3>
                                        {contact.phone && (
                                            <div className="flex items-center gap-1 text-xs text-muted">
                                                <Phone size={10} />
                                                <span>{contact.phone}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="flex items-center gap-4">
                                    <div className="text-right">
                                        {(contact.balance || 0) !== 0 ? (
                                            <>
                                                <div className={`text-lg font-semibold ${contact.balance > 0 ? "text-green-400" : "text-red-400"}`}>
                                                    {contact.balance > 0 ? "+" : ""}
                                                    ₹{Math.abs(contact.balance).toLocaleString('en-IN')}
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
                                        className="p-2 -mr-2 text-muted hover:text-white transition-colors"
                                    >
                                        <Pencil size={18} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Details Modal */}
            {viewingContactId && (
                (() => {
                    const contact = contacts.find(c => c.id === viewingContactId);
                    if (!contact) return null;
                    // Filter transactions for this contact
                    const contactTx = transactions ? transactions.filter(t => t.contact_id === contact.id) : [];

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
                })()
            )}
        </div>
    );
}
