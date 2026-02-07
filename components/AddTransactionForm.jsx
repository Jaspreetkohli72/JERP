"use client";
import React, { useState } from "react";
import { Check, X, Settings } from "lucide-react";
import { useFinance } from "../context/FinanceContext";
import CategoryManager from "./CategoryManager";
import { getCategoryIcon } from "../lib/categoryIcons";

export default function AddTransactionForm({ type, onClose, title }) {
    const { addTransaction, categories, contacts, addContact } = useFinance();
    const [amount, setAmount] = useState("");
    const [contactId, setContactId] = useState("");
    const [categoryId, setCategoryId] = useState("");
    const [description, setDescription] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Dropdown & New Contact State
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [isCreatingContact, setIsCreatingContact] = useState(false);
    const [newContactName, setNewContactName] = useState("");
    const [isCategoryManagerOpen, setIsCategoryManagerOpen] = useState(false);

    const handleCreateContact = async () => {
        if (!newContactName.trim()) return;

        // Optimistic / Fast creation
        const { success, data } = await addContact({ name: newContactName });
        if (success) {
            setIsCreatingContact(false);
            setNewContactName("");
            // Auto-select the new contact
            if (data?.id) {
                setContactId(data.id);
            }
        } else {
            alert("Failed to create contact");
        }
    };

    const selectedCategory = categories.find(c => c.id === categoryId);
    const isOther = selectedCategory?.name === "Other";
    const filteredCategories = categories.filter((c) => c.type === type);

    const [errors, setErrors] = useState({ category: false, description: false });

    const handleSubmit = async (e) => {
        e.preventDefault();

        const newErrors = {
            category: !categoryId,
            description: isOther && !description.trim()
        };

        if (newErrors.category || newErrors.description) {
            setErrors(newErrors);
            return;
        }

        // Clear errors if valid
        setErrors({ category: false, description: false });

        setIsSubmitting(true);
        const result = await addTransaction({
            amount: parseFloat(amount),
            type,
            category_id: categoryId,
            description: description || (contactId ? (type === 'income' ? 'Received' : 'Paid') : 'Unspecified'),
            contact_id: contactId || null,
            transaction_date: new Date().toISOString()
        });
        setIsSubmitting(false);

        if (result.success) {
            onClose();
            setAmount("");
            setDescription("");
            setErrors({ category: false, description: false });
        } else {
            alert("Failed to add transaction");
        }
    };

    return (
        <>
            <form onSubmit={handleSubmit} className="p-4 bg-black/20 rounded-[24px] border border-white/5 space-y-4 animate-in slide-in-from-top-4 fade-in duration-300">
                <div className="flex justify-between items-center pb-2 border-b border-white/5">
                    <span className="text-sm font-medium text-muted uppercase tracking-wider">{title || `New ${type}`}</span>
                    <button type="button" onClick={onClose} className="p-1 hover:bg-white/10 rounded-full transition-colors">
                        <X size={16} className="text-muted" />
                    </button>
                </div>

                {/* Amount */}
                <div>
                    <label className="block mb-1.5 text-xs font-medium text-muted uppercase">Amount</label>
                    <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-lg text-muted">₹</span>
                        <input
                            type="number"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            placeholder="0.00"
                            className="w-full pl-8 pr-4 py-3 bg-black/20 border border-white/10 rounded-xl focus:outline-none focus:border-accent text-lg"
                            autoFocus
                            onWheel={(e) => e.target.blur()}
                            required
                        />
                    </div>
                </div>

                {/* Contact (Optional) w/ Create New */}
                <div className="relative">
                    <label className="block mb-1.5 text-xs font-medium text-muted uppercase">Contact (Optional)</label>

                    {!isCreatingContact ? (
                        <div className="relative">
                            <button
                                type="button"
                                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                                className="w-full px-4 py-3 bg-black/20 border border-white/10 rounded-xl focus:outline-none focus:border-white/20 text-sm text-left flex justify-between items-center"
                            >
                                <span className={!contactId ? "text-muted" : "text-white"}>
                                    {contactId
                                        ? contacts.find(c => c.id === contactId)?.name
                                        : "None (Personal)"}
                                </span>
                                <span className="text-muted text-xs">▼</span>
                            </button>

                            {isDropdownOpen && (
                                <div className="absolute top-full left-0 right-0 mt-1 z-50 bg-[#1e1e2e] border border-white/10 rounded-xl shadow-xl overflow-hidden max-h-48 overflow-y-auto">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setContactId("");
                                            setIsDropdownOpen(false);
                                        }}
                                        className="w-full px-4 py-2 text-left text-sm hover:bg-white/5 text-muted hover:text-white transition-colors"
                                    >
                                        None (Personal)
                                    </button>
                                    {contacts.map((contact) => (
                                        <button
                                            key={contact.id}
                                            type="button"
                                            onClick={() => {
                                                setContactId(contact.id);
                                                setIsDropdownOpen(false);
                                            }}
                                            className="w-full px-4 py-2 text-left text-sm hover:bg-white/5 text-white transition-colors"
                                        >
                                            {contact.name}
                                        </button>
                                    ))}
                                    <div className="h-px bg-white/10 my-1" />
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setIsCreatingContact(true);
                                            setIsDropdownOpen(false);
                                            setTimeout(() => document.getElementById("new-contact-input")?.focus(), 100);
                                        }}
                                        className="w-full px-4 py-2 text-left text-sm hover:bg-white/5 text-accent font-medium flex items-center gap-2"
                                    >
                                        <span>+</span> Create New Contact
                                    </button>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="flex gap-2">
                            <input
                                id="new-contact-input"
                                type="text"
                                value={newContactName}
                                onChange={(e) => setNewContactName(e.target.value)}
                                placeholder="Enter Name..."
                                className="flex-1 px-4 py-3 bg-black/20 border border-accent/50 rounded-xl focus:outline-none focus:border-accent text-sm"
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        e.preventDefault();
                                        handleCreateContact();
                                    }
                                }}
                            />
                            <button
                                type="button"
                                onClick={handleCreateContact}
                                disabled={!newContactName.trim()}
                                className="px-4 py-2 bg-accent/20 text-accent rounded-xl hover:bg-accent/30 transition-colors"
                            >
                                <Check size={18} />
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    setIsCreatingContact(false);
                                    setNewContactName("");
                                }}
                                className="px-4 py-2 bg-white/5 text-muted rounded-xl hover:bg-white/10 transition-colors"
                            >
                                <X size={18} />
                            </button>
                        </div>
                    )}
                </div>

                {/* Category */}
                <div>
                    <div className="flex justify-between items-center mb-1.5">
                        <label className="text-xs font-medium text-muted uppercase">Category</label>
                        <button
                            type="button"
                            onClick={() => setIsCategoryManagerOpen(true)}
                            className="flex items-center gap-1 text-[10px] text-accent hover:text-accent/80 transition-colors bg-accent/10 px-2 py-1 rounded-full"
                        >
                            <Settings size={12} /> Manage
                        </button>
                    </div>
                    <div className="grid grid-cols-4 gap-2">
                        {filteredCategories.map((cat) => {
                            const Icon = getCategoryIcon(cat.icon);
                            return (
                                <button
                                    key={cat.id}
                                    type="button"
                                    onClick={() => {
                                        setCategoryId(cat.id);
                                        if (errors.category) setErrors(prev => ({ ...prev, category: false }));
                                    }}
                                    className={`flex flex-col items-center justify-center gap-1 p-2 rounded-xl border transition-all ${categoryId === cat.id
                                        ? "bg-accent/20 border-accent text-accent"
                                        : errors.category
                                            ? "bg-red-500/10 border-red-500/50 text-red-400"
                                            : "bg-black/20 border-transparent text-muted hover:bg-white/5"
                                        }`}
                                >
                                    <span className="text-xl">
                                        <Icon size={20} />
                                    </span>
                                    <span className="text-[10px] truncate w-full text-center">{cat.name}</span>
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Description */}
                <div>
                    <input
                        type="text"
                        value={description}
                        onChange={(e) => {
                            setDescription(e.target.value);
                            if (errors.description && e.target.value) setErrors(prev => ({ ...prev, description: false }));
                        }}
                        placeholder={isOther ? "Note (required)" : "Note (optional)"}
                        className={`w-full px-4 py-3 bg-black/20 border rounded-xl focus:outline-none focus:border-white/20 text-sm ${(isOther && errors.description)
                            ? "border-red-500/50 focus:border-red-500 placeholder:text-red-400/50"
                            : "border-white/10"
                            }`}
                    />
                    {errors.category && !categoryId && (
                        <p className="mt-2 text-xs text-red-400 pl-1">Please select a category</p>
                    )}
                </div>

                {/* Submit */}
                <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full py-3.5 bg-accent hover:bg-accent/90 text-white font-medium rounded-xl transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_20px_-5px_rgba(99,102,241,0.5)]"
                >
                    {isSubmitting ? (
                        <span className="flex items-center justify-center gap-2">
                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            Saving...
                        </span>
                    ) : (
                        "Save Transaction"
                    )}
                </button>
            </form>

            {isCategoryManagerOpen && <CategoryManager onClose={() => setIsCategoryManagerOpen(false)} />}
        </>
    );
}
