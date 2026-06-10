"use client";
import React, { useState, useEffect } from "react";
import { ArrowLeft, Save, Settings, Check } from "lucide-react";
import Link from "next/link";

const DEFAULT_RATES_KEY = "gfe_sales_default_rates";

const INITIAL_DEFAULT_RATES = {
    ghodi_nonfolding_5ft: 1200,
    ghodi_nonfolding_6ft: 1500,
    ghodi_folding_5ft: 1500,
    ghodi_folding_6ft: 1800,
    trolley_bucket: 2000,
    trolley_cylinder_single_heavy: 2500,
    trolley_cylinder_single_light: 2000,
    trolley_cylinder_double_heavy: 3500,
    trolley_cylinder_double_light: 3000,
};

export default function ConfigureRatesPage() {
    const [editingDefaults, setEditingDefaults] = useState({ ...INITIAL_DEFAULT_RATES });
    const [ratesSaveSuccess, setRatesSaveSuccess] = useState(false);

    // Load from localStorage on mount
    useEffect(() => {
        const storedDefaults = localStorage.getItem(DEFAULT_RATES_KEY);
        if (storedDefaults) {
            try {
                setEditingDefaults(JSON.parse(storedDefaults));
            } catch (e) {
                console.error(e);
            }
        }
    }, []);

    const handleSaveDefaults = (e: React.FormEvent) => {
        e.preventDefault();
        localStorage.setItem(DEFAULT_RATES_KEY, JSON.stringify(editingDefaults));
        setRatesSaveSuccess(true);
        setTimeout(() => setRatesSaveSuccess(false), 3000);
    };

    return (
        <div className="p-4 md:p-8 text-white max-w-[800px] mx-auto mb-20 animate-in fade-in duration-500 flex flex-col gap-6">
            {/* Header */}
            <div className="flex items-center gap-4 border-b border-white/10 pb-4">
                <Link href="/sales" className="p-2 bg-white/5 rounded-xl hover:bg-white/10 text-gray-300 hover:text-white transition-all">
                    <ArrowLeft size={20} />
                </Link>
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-2">
                        <Settings className="text-[var(--accent)]" size={24} /> Default Rates Settings
                    </h1>
                    <p className="text-muted text-xs mt-0.5">Configure default prices for fabrications products.</p>
                </div>
            </div>

            {/* Config Form Card */}
            <form onSubmit={handleSaveDefaults} className="glass p-6 rounded-2xl border border-white/5 flex flex-col gap-6">
                <div className="flex flex-col gap-6">
                    {/* Ghodi Section */}
                    <div>
                        <h3 className="text-sm font-bold uppercase text-[var(--accent)] pb-2 border-b border-white/10 mb-4 tracking-wider">Ghodi Defaults</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="flex flex-col gap-1.5">
                                <label className="text-xs text-gray-400 font-medium">Non-Folding 5ft (₹)</label>
                                <input
                                    type="number"
                                    className="bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-[var(--accent)] transition-colors"
                                    value={editingDefaults.ghodi_nonfolding_5ft}
                                    onChange={e => setEditingDefaults({ ...editingDefaults, ghodi_nonfolding_5ft: Number(e.target.value) })}
                                    required
                                />
                            </div>
                            <div className="flex flex-col gap-1.5">
                                <label className="text-xs text-gray-400 font-medium">Non-Folding 6ft (₹)</label>
                                <input
                                    type="number"
                                    className="bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-[var(--accent)] transition-colors"
                                    value={editingDefaults.ghodi_nonfolding_6ft}
                                    onChange={e => setEditingDefaults({ ...editingDefaults, ghodi_nonfolding_6ft: Number(e.target.value) })}
                                    required
                                />
                            </div>
                            <div className="flex flex-col gap-1.5">
                                <label className="text-xs text-gray-400 font-medium">Folding 5ft (₹)</label>
                                <input
                                    type="number"
                                    className="bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-[var(--accent)] transition-colors"
                                    value={editingDefaults.ghodi_folding_5ft}
                                    onChange={e => setEditingDefaults({ ...editingDefaults, ghodi_folding_5ft: Number(e.target.value) })}
                                    required
                                />
                            </div>
                            <div className="flex flex-col gap-1.5">
                                <label className="text-xs text-gray-400 font-medium">Folding 6ft (₹)</label>
                                <input
                                    type="number"
                                    className="bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-[var(--accent)] transition-colors"
                                    value={editingDefaults.ghodi_folding_6ft}
                                    onChange={e => setEditingDefaults({ ...editingDefaults, ghodi_folding_6ft: Number(e.target.value) })}
                                    required
                                />
                            </div>
                        </div>
                    </div>

                    {/* Trolley Section */}
                    <div>
                        <h3 className="text-sm font-bold uppercase text-[var(--accent)] pb-2 border-b border-white/10 mb-4 tracking-wider">Trolley Defaults</h3>
                        <div className="flex flex-col gap-4">
                            <div className="flex flex-col gap-1.5">
                                <label className="text-xs text-gray-400 font-medium">Bucket Trolley (₹)</label>
                                <input
                                    type="number"
                                    className="bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-[var(--accent)] transition-colors"
                                    value={editingDefaults.trolley_bucket}
                                    onChange={e => setEditingDefaults({ ...editingDefaults, trolley_bucket: Number(e.target.value) })}
                                    required
                                />
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-xs text-gray-400 font-medium">Cylinder Single Heavy (₹)</label>
                                    <input
                                        type="number"
                                        className="bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-[var(--accent)] transition-colors"
                                        value={editingDefaults.trolley_cylinder_single_heavy}
                                        onChange={e => setEditingDefaults({ ...editingDefaults, trolley_cylinder_single_heavy: Number(e.target.value) })}
                                        required
                                    />
                                </div>
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-xs text-gray-400 font-medium">Cylinder Single Light (₹)</label>
                                    <input
                                        type="number"
                                        className="bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-[var(--accent)] transition-colors"
                                        value={editingDefaults.trolley_cylinder_single_light}
                                        onChange={e => setEditingDefaults({ ...editingDefaults, trolley_cylinder_single_light: Number(e.target.value) })}
                                        required
                                    />
                                </div>
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-xs text-gray-400 font-medium">Cylinder Double Heavy (₹)</label>
                                    <input
                                        type="number"
                                        className="bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-[var(--accent)] transition-colors"
                                        value={editingDefaults.trolley_cylinder_double_heavy}
                                        onChange={e => setEditingDefaults({ ...editingDefaults, trolley_cylinder_double_heavy: Number(e.target.value) })}
                                        required
                                    />
                                </div>
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-xs text-gray-400 font-medium">Cylinder Double Light (₹)</label>
                                    <input
                                        type="number"
                                        className="bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-[var(--accent)] transition-colors"
                                        value={editingDefaults.trolley_cylinder_double_light}
                                        onChange={e => setEditingDefaults({ ...editingDefaults, trolley_cylinder_double_light: Number(e.target.value) })}
                                        required
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Save Section */}
                <div className="flex flex-col gap-3 border-t border-white/10 pt-6 mt-2">
                    {ratesSaveSuccess && (
                        <div className="flex items-center justify-center gap-1.5 text-green-400 text-sm font-semibold py-1">
                            <Check size={16} /> Defaults saved successfully!
                        </div>
                    )}
                    <button
                        type="submit"
                        className="w-full bg-[var(--accent)] hover:bg-[var(--accent)]/80 text-black font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 hover:opacity-95 transition-all text-sm shadow-lg shadow-[var(--accent)]/15"
                    >
                        <Save size={18} /> Save Default Rates
                    </button>
                </div>
            </form>
        </div>
    );
}
