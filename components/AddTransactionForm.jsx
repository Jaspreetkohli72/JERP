"use client";
import React, { useState } from "react";
import { Check, X, Settings } from "lucide-react";
import { useFinance } from "../context/FinanceContext";


export default function AddTransactionForm({ type, onClose, title, initialData }) {
    const { addTransaction, updateTransaction, wallets, contacts, addContact, projects, addProject } = useFinance();
    const [amount, setAmount] = useState(initialData ? initialData.amount : "");
    const [contactId, setContactId] = useState(initialData?.contact_id || "");
    const [projectId, setProjectId] = useState(initialData?.project_id || "");
    const [walletId, setWalletId] = useState(initialData?.wallet_id || "");
    const [description, setDescription] = useState(initialData?.description || "");
    // Default isDebt to true. If editing, use existing value (with fallback to true if undefined)
    const [isDebt, setIsDebt] = useState(initialData ? (initialData.is_debt !== undefined ? initialData.is_debt : true) : true);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Dropdown & New Contact State
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [isCreatingContact, setIsCreatingContact] = useState(false);
    const [newContactName, setNewContactName] = useState("");

    // Dropdown & New Project State
    const [isProjectDropdownOpen, setIsProjectDropdownOpen] = useState(false);
    const [isCreatingProject, setIsCreatingProject] = useState(false);
    const [newProjectName, setNewProjectName] = useState("");

    const handleCreateProject = async () => {
        const trimmedName = newProjectName.trim();
        if (!trimmedName) return;

        // 1. Check for duplicates
        if (projects?.some(p => p.name.toLowerCase() === trimmedName.toLowerCase())) {
            alert("A project with this name already exists.");
            return;
        }

        const { success, id, error } = await addProject({
            name: trimmedName,
            contact_id: contactId || null,
            status: 'active',
            start_date: new Date().toISOString().split('T')[0]
        });

        if (success) {
            setIsCreatingProject(false);
            setNewProjectName("");
            setProjectId(id);
        } else {
            alert(`Failed to create project: ${error?.message || "Unknown error"}`);
        }
    };

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

    const [errors, setErrors] = useState({ wallet: false, description: false });

    // Helper to capitalize first letter of every word
    const toTitleCase = (str) => {
        return str.replace(/\w\S*/g, (txt) => {
            return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        const newErrors = {
            wallet: !walletId,
            description: !description.trim() // Description is now MANDATORY
        };

        if (newErrors.wallet || newErrors.description) {
            setErrors(newErrors);
            return;
        }

        // Clear errors if valid
        setErrors({ wallet: false, description: false });

        setIsSubmitting(true);

        // Format description to Title Case
        const formattedDescription = toTitleCase(description.trim());

        const txData = {
            amount: parseFloat(amount),
            type: initialData ? initialData.type : type, // Use existing type if editing
            category_id: null, // Categories removed
            wallet_id: walletId,
            description: formattedDescription,
            contact_id: contactId || null,
            project_id: projectId || null,
            is_debt: isDebt,
            // Keep original date if editing, else new date
            transaction_date: initialData ? initialData.transaction_date : new Date().toISOString()
        };

        let result;
        if (initialData) {
            result = await updateTransaction(initialData.id, txData);
        } else {
            result = await addTransaction(txData);
        }

        setIsSubmitting(false);

        if (result.success) {
            onClose();
            if (!initialData) {
                setAmount("");
                setDescription("");
                setIsDebt(true);
                setErrors({ wallet: false, description: false });
            }
        } else {
            alert("Failed to save transaction");
        }
    };

    // Format currency helper
    const formatCurrency = (val) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val);

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
                        <span className={`absolute left-3 top-1/2 -translate-y-1/2 text-lg ${type === 'income' ? 'text-green-500' : 'text-red-400'}`}>₹</span>
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

                {/* Wallets (Replaces Category) */}
                <div>
                    <label className="block mb-1.5 text-xs font-medium text-muted uppercase">Select Wallet</label>
                    <div className="grid grid-cols-2 gap-2">
                        {wallets.map((wallet) => (
                            <button
                                key={wallet.id}
                                type="button"
                                onClick={() => {
                                    setWalletId(wallet.id);
                                    if (errors.wallet) setErrors(prev => ({ ...prev, wallet: false }));
                                }}
                                className={`flex items-center justify-between p-3 rounded-xl border transition-all text-left gap-2 ${walletId === wallet.id
                                    ? "bg-accent/20 border-accent text-accent"
                                    : errors.wallet
                                        ? "bg-red-500/10 border-red-500/50 text-red-400"
                                        : "bg-black/20 border-white/5 text-muted hover:bg-white/5"
                                    }`}
                            >
                                <div className="flex flex-col min-w-0 flex-1">
                                    <span className="text-sm font-medium truncate">{wallet.name}</span>
                                    <span className="text-[10px] opacity-70">{wallet.type}</span>
                                </div>
                                <div className="text-xs font-medium whitespace-nowrap">
                                    {formatCurrency(wallet.balance)}
                                </div>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Projects (Optional) w/ Create New */}
                <div className="relative">
                    <label className="block mb-1.5 text-xs font-medium text-muted uppercase">Project (Optional)</label>

                    {!isCreatingProject ? (
                        <div className="relative">
                            <button
                                type="button"
                                onClick={() => setIsProjectDropdownOpen(!isProjectDropdownOpen)}
                                className="w-full px-4 py-3 bg-black/20 border border-white/10 rounded-xl focus:outline-none focus:border-white/20 text-sm text-left flex justify-between items-center"
                            >
                                <span className={!projectId ? "text-muted" : "text-white"}>
                                    {projectId
                                        ? projects.find(p => p.id === projectId)?.name || "Unknown Project"
                                        : "None"}
                                </span>
                                <span className="text-muted text-xs">▼</span>
                            </button>

                            {isProjectDropdownOpen && (
                                <div className="absolute top-full left-0 right-0 mt-1 z-50 bg-[#1e1e2e] border border-white/10 rounded-xl shadow-xl overflow-hidden max-h-48 overflow-y-auto">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setProjectId("");
                                            setIsProjectDropdownOpen(false);
                                        }}
                                        className="w-full px-4 py-2 text-left text-sm hover:bg-white/5 text-muted hover:text-white transition-colors"
                                    >
                                        None
                                    </button>
                                    {projects.map((p) => (
                                        <button
                                            key={p.id}
                                            type="button"
                                            onClick={() => {
                                                setProjectId(p.id);
                                                setIsProjectDropdownOpen(false);
                                            }}
                                            className="w-full px-4 py-2 text-left text-sm hover:bg-white/5 text-white transition-colors"
                                        >
                                            {p.name} {p.contacts?.name ? `(${p.contacts.name})` : ''}
                                        </button>
                                    ))}
                                    <div className="h-px bg-white/10 my-1" />
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setIsCreatingProject(true);
                                            setIsProjectDropdownOpen(false);
                                            setTimeout(() => document.getElementById("new-project-input")?.focus(), 100);
                                        }}
                                        className="w-full px-4 py-2 text-left text-sm hover:bg-white/5 text-accent font-medium flex items-center gap-2"
                                    >
                                        <span>+</span> Create New Project
                                    </button>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="flex gap-2">
                            <input
                                id="new-project-input"
                                type="text"
                                autoComplete="off"
                                autoCorrect="off"
                                spellCheck="false"
                                data-lpignore="true"
                                data-1p-ignore="true"
                                value={newProjectName}
                                onChange={(e) => setNewProjectName(e.target.value)}
                                placeholder="Project Name..."
                                className="flex-1 px-4 py-3 bg-black/20 border border-accent/50 rounded-xl focus:outline-none focus:border-accent text-sm"
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        e.preventDefault();
                                        handleCreateProject();
                                    }
                                }}
                            />
                            <button
                                type="button"
                                onClick={handleCreateProject}
                                disabled={!newProjectName.trim()}
                                className="px-4 py-2 bg-accent/20 text-accent rounded-xl hover:bg-accent/30 transition-colors"
                            >
                                <Check size={18} />
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    setIsCreatingProject(false);
                                    setNewProjectName("");
                                }}
                                className="px-4 py-2 bg-white/5 text-muted rounded-xl hover:bg-white/10 transition-colors"
                            >
                                <X size={18} />
                            </button>
                        </div>
                    )}
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

                {/* Description */}
                <div>
                    <input
                        type="text"
                        value={description}
                        onChange={(e) => {
                            setDescription(e.target.value);
                            if (errors.description && e.target.value) setErrors(prev => ({ ...prev, description: false }));
                        }}
                        placeholder="Note (Required)"
                        className={`w-full px-4 py-3 bg-black/20 border rounded-xl focus:outline-none focus:border-white/20 text-sm ${errors.description ? "border-red-500/50" : "border-white/10"}`}
                    />
                    {errors.description && (
                        <p className="mt-2 text-xs text-red-400 pl-1">Note is required</p>
                    )}
                    {errors.wallet && !walletId && (
                        <p className="mt-2 text-xs text-red-400 pl-1">Please select a wallet</p>
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
        </>
    );
}
