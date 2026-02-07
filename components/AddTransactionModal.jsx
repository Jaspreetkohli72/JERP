"use client";
import React, { useState } from "react";
import { X, Check } from "lucide-react";
import { useFinance } from "../context/FinanceContext";

export default function AddTransactionModal({ isOpen, onClose }) {
    const { addTransaction, categories, contacts } = useFinance();
    const [amount, setAmount] = useState("");
    const [type, setType] = useState("expense");
    const [contactId, setContactId] = useState("");
    const [categoryId, setCategoryId] = useState("");
    const [description, setDescription] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    if (!isOpen) return null;

    const selectedCategory = categories.find(c => c.id === categoryId);
    const isOther = selectedCategory?.name === "Other";

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!amount || !categoryId) return;

        // Validation for "Other" category
        if (isOther && !description.trim()) {
            alert("Please add a note for 'Other' category transactions.");
            return;
        }

        setIsSubmitting(true);
        await addTransaction({
            amount: parseFloat(amount),
            type,
            category_id: categoryId,
            description,
            contact_id: contactId || null,
            transaction_date: new Date().toISOString()
        });
        setIsSubmitting(false);
        onClose();
        setAmount("");
        setDescription("");
    };

    const filteredCategories = categories.filter((c) => c.type === type);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="w-full max-w-sm glass bg-[#12121e]">
                <div className="flex items-center justify-between p-4 border-b border-white/5">
                    <h2 className="text-lg font-semibold">New Transaction</h2>
                    <button onClick={onClose} className="p-1 rounded-full hover:bg-white/10">
                        <X size={20} className="text-muted" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-4 space-y-4">
                    {/* Type Toggle */}
                    <div className="flex p-1 rounded-lg bg-black/40">
                        <button
                            type="button"
                            onClick={() => setType("expense")}
                            className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${type === "expense" ? "bg-expense text-black shadow-lg" : "text-muted hover:text-white"
                                }`}
                        >
                            Expense
                        </button>
                        <button
                            type="button"
                            onClick={() => setType("income")}
                            className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${type === "income" ? "bg-income text-black shadow-lg" : "text-muted hover:text-white"
                                }`}
                        >
                            Income
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
                                required
                            />
                        </div>
                    </div>

                    {/* Contact (Optional) */}
                    <div>
                        <label className="block mb-1.5 text-xs font-medium text-muted uppercase">Contact (Optional)</label>
                        <select
                            value={contactId}
                            onChange={(e) => setContactId(e.target.value)}
                            className="w-full px-4 py-3 bg-black/20 border border-white/10 rounded-xl focus:outline-none focus:border-white/20 text-sm appearance-none"
                        >
                            <option value="">None (Personal)</option>
                            {contacts.map((contact) => (
                                <option key={contact.id} value={contact.id}>
                                    {contact.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Category */}
                    <div>
                        <label className="block mb-1.5 text-xs font-medium text-muted uppercase">Category</label>
                        <div className="grid grid-cols-4 gap-2">
                            {filteredCategories.map((cat) => (
                                <button
                                    key={cat.id}
                                    type="button"
                                    onClick={() => setCategoryId(cat.id)}
                                    className={`flex flex-col items-center justify-center gap-1 p-2 rounded-xl border transition-all ${categoryId === cat.id
                                        ? "bg-accent/20 border-accent text-accent"
                                        : "bg-black/20 border-transparent text-muted hover:bg-white/5"
                                        }`}
                                >
                                    <span className="text-xl">{cat.icon}</span>
                                    <span className="text-[10px] truncate w-full text-center">{cat.name}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Description */}
                    <div>
                        <input
                            type="text"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder={isOther ? "Note (required)" : "Note (optional)"}
                            className={`w-full px-4 py-3 bg-black/20 border rounded-xl focus:outline-none focus:border-white/20 text-sm ${isOther && !description
                                ? "border-red-500/50 focus:border-red-500"
                                : "border-white/10"
                                }`}
                            required={isOther}
                        />
                    </div>

                    {/* Submit */}
                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className="w-full py-3.5 mt-2 font-medium text-black rounded-xl bg-white hover:bg-gray-100 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                    >
                        {isSubmitting ? (
                            <span className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                        ) : (
                            <>
                                <Check size={18} />
                                Save Transaction
                            </>
                        )}
                    </button>
                </form>
            </div>
        </div>
    );
}
