"use client";
import React, { useState } from "react";
import { CreditCard, Wallet, Plus, RefreshCw, Smartphone, Banknote } from "lucide-react";
import { useFinance } from "../../context/FinanceContext";

const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        maximumFractionDigits: 0,
    }).format(amount);
};

interface Wallet {
    id: string;
    name: string;
    type: string;
    balance: number;
}

export default function WalletsPage() {
    const { wallets, loading, addWallet, updateWallet, deleteWallet } = useFinance();
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [newWalletName, setNewWalletName] = useState("");
    const [newWalletType, setNewWalletType] = useState("physical"); // physical | digital
    const [newWalletBalance, setNewWalletBalance] = useState("");
    const [submitting, setSubmitting] = useState(false);

    // Editing State
    const [editingWallet, setEditingWallet] = useState<Wallet | null>(null);
    const [editBalance, setEditBalance] = useState("");

    const physicalWallets = wallets.filter((w: Wallet) => w.type === 'physical');
    const digitalWallets = wallets.filter((w: Wallet) => w.type === 'digital');

    const totalPhysical = physicalWallets.reduce((acc: number, w: any) => acc + (w.balance || 0), 0);
    const totalDigital = digitalWallets.reduce((acc: number, w: any) => acc + (w.balance || 0), 0);
    const totalNetWorth = totalPhysical + totalDigital;

    const handleAddWallet = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newWalletName) return;
        setSubmitting(true);
        await addWallet(newWalletName, newWalletType, newWalletBalance || 0);
        setSubmitting(false);
        setIsAddModalOpen(false);
        setNewWalletName("");
        setNewWalletBalance("");
    };

    const handleUpdateBalance = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingWallet) return;
        setSubmitting(true);
        await updateWallet(editingWallet.id, editBalance);
        setSubmitting(false);
        setEditingWallet(null);
        setEditBalance("");
    };

    return (
        <div className="flex flex-col gap-6 p-4 md:p-8 text-white w-full mb-20">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-[var(--accent)] to-[var(--accent-3)] bg-clip-text text-transparent">
                        Self Accounts
                    </h1>
                    <p className="text-muted text-sm mt-1">Manage physical cash and digital balances.</p>
                </div>
                <button
                    onClick={() => setIsAddModalOpen(true)}
                    className="bg-[var(--accent)] text-black px-4 py-2 rounded-full font-semibold flex items-center gap-2 hover:opacity-90 transition-all text-sm"
                >
                    <Plus size={18} /> Add Account
                </button>
            </div>

            {/* Total Net Worth Card */}
            <div className="glass p-6 rounded-3xl relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-10">
                    <Wallet size={120} />
                </div>
                <div className="relative z-10">
                    <div className="text-muted text-sm uppercase tracking-wider mb-1">Total Liquid Assets</div>
                    <div className="text-4xl font-bold text-white mb-4">{formatCurrency(totalNetWorth)}</div>

                    <div className="flex gap-8">
                        <div>
                            <div className="text-muted text-xs">Physical Cash</div>
                            <div className="text-xl font-semibold text-[#FFD700]">{formatCurrency(totalPhysical)}</div>
                        </div>
                        <div>
                            <div className="text-muted text-xs">Digital / Bank</div>
                            <div className="text-xl font-semibold text-blue-300">{formatCurrency(totalDigital)}</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Account Lists */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                {/* Physical Wallets */}
                <div className="flex flex-col gap-4">
                    <h2 className="text-xl font-semibold flex items-center gap-2 text-gray-200">
                        <Banknote className="text-[#FFD700]" size={20} /> Physical Cash
                    </h2>
                    <div className="flex flex-col gap-3">
                        {physicalWallets.length === 0 ? (
                            <div className="text-muted text-sm italic p-4 glass rounded-xl text-center">No physical cash accounts found.</div>
                        ) : (
                            physicalWallets.map((wallet: any) => (
                                <div key={wallet.id} className="glass p-5 rounded-xl flex items-center justify-between group gap-4">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 rounded-full bg-[#FFD700]/10 flex items-center justify-center text-[#FFD700]">
                                            <Banknote size={24} />
                                        </div>
                                        <div>
                                            <div className="font-medium text-gray-100 text-lg">{wallet.name}</div>
                                            <div className="text-xs text-muted">Cash in hand</div>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className="font-bold text-xl">{formatCurrency(wallet.balance)}</div>
                                        <button
                                            onClick={() => { setEditingWallet(wallet); setEditBalance(wallet.balance); }}
                                            className="text-xs text-[var(--accent)] transition-opacity mt-1 hover:underline opacity-0 group-hover:opacity-100"
                                        >
                                            Adjust
                                        </button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Digital Wallets */}
                <div className="flex flex-col gap-4">
                    <h2 className="text-xl font-semibold flex items-center gap-2 text-gray-200">
                        <Smartphone className="text-blue-400" size={20} /> Digital Accounts
                    </h2>
                    <div className="flex flex-col gap-3">
                        {digitalWallets.length === 0 ? (
                            <div className="text-muted text-sm italic p-4 glass rounded-xl text-center">No digital accounts found.</div>
                        ) : (
                            digitalWallets.map((wallet: any) => (
                                <div key={wallet.id} className="glass p-5 rounded-xl flex items-center justify-between group gap-4">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-400">
                                            <CreditCard size={24} />
                                        </div>
                                        <div>
                                            <div className="font-medium text-gray-100 text-lg">{wallet.name}</div>
                                            <div className="text-xs text-muted">Bank / UPI</div>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className="font-bold text-xl">{formatCurrency(wallet.balance)}</div>
                                        <button
                                            onClick={() => { setEditingWallet(wallet); setEditBalance(wallet.balance); }}
                                            className="text-xs text-blue-300 transition-opacity mt-1 hover:underline opacity-0 group-hover:opacity-100"
                                        >
                                            Adjust
                                        </button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>

            {/* Add Wallet Modal */}
            {isAddModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <div className="glass p-6 rounded-2xl w-full max-w-sm animate-in fade-in zoom-in-95">
                        <h2 className="text-xl font-bold mb-4">Add Account</h2>
                        <form onSubmit={handleAddWallet} className="flex flex-col gap-4">
                            <div>
                                <label className="text-xs text-muted uppercase">Account Name</label>
                                <input
                                    type="text"
                                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 mt-1 focus:border-[var(--accent)] focus:outline-none"
                                    placeholder="e.g. HDFC Bank, Drawer Cash"
                                    value={newWalletName}
                                    onChange={(e) => setNewWalletName(e.target.value)}
                                    required
                                />
                            </div>
                            <div>
                                <label className="text-xs text-muted uppercase">Type</label>
                                <div className="grid grid-cols-2 gap-2 mt-1">
                                    <button
                                        type="button"
                                        onClick={() => setNewWalletType('physical')}
                                        className={`p-2 rounded-lg border text-sm transition-all ${newWalletType === 'physical' ? 'bg-[#FFD700]/20 border-[#FFD700] text-[#FFD700]' : 'border-white/10 text-muted'}`}
                                    >
                                        Physical Cash
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setNewWalletType('digital')}
                                        className={`p-2 rounded-lg border text-sm transition-all ${newWalletType === 'digital' ? 'bg-blue-500/20 border-blue-500 text-blue-300' : 'border-white/10 text-muted'}`}
                                    >
                                        Digital / Bank
                                    </button>
                                </div>
                            </div>
                            <div>
                                <label className="text-xs text-muted uppercase">Initial Balance</label>
                                <input
                                    type="number"
                                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 mt-1 focus:border-[var(--accent)] focus:outline-none"
                                    placeholder="0.00"
                                    value={newWalletBalance}
                                    onChange={(e) => setNewWalletBalance(e.target.value)}
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
                                    {submitting ? "Creating..." : "Create Account"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Edit Balance Modal */}
            {editingWallet && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <div className="glass p-6 rounded-2xl w-full max-w-sm animate-in fade-in zoom-in-95">
                        <h2 className="text-xl font-bold mb-4">Update Balance</h2>
                        <p className="text-sm text-muted mb-4">Update the current balance for <strong>{editingWallet.name}</strong>.</p>
                        <form onSubmit={handleUpdateBalance} className="flex flex-col gap-4">
                            <div>
                                <label className="text-xs text-muted uppercase">Current Balance</label>
                                <input
                                    type="number"
                                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 mt-1 focus:border-[var(--accent)] focus:outline-none text-lg font-mono"
                                    value={editBalance}
                                    onChange={(e) => setEditBalance(e.target.value)}
                                    required
                                />
                            </div>
                            <div className="flex gap-2 mt-2">
                                <button
                                    type="button"
                                    onClick={() => setEditingWallet(null)}
                                    className="flex-1 py-3 rounded-xl hover:bg-white/5 transition-colors text-sm"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={submitting}
                                    className="flex-1 bg-white text-black font-semibold rounded-xl py-3 text-sm"
                                >
                                    {submitting ? "Updating..." : "Update Balance"}
                                </button>
                            </div>
                            <div className="border-t border-white/10 pt-4 mt-2">
                                <button
                                    type="button"
                                    onClick={async () => {
                                        if (confirm("Are you sure you want to delete this wallet?")) {
                                            setSubmitting(true);
                                            await deleteWallet(editingWallet.id);
                                            setSubmitting(false);
                                            setEditingWallet(null);
                                        }
                                    }}
                                    disabled={submitting}
                                    className="w-full py-3 rounded-xl border border-red-500/30 text-red-400 hover:bg-red-500/10 transition-colors text-sm font-medium"
                                >
                                    Delete Wallet
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
