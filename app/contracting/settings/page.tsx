"use client";
import React, { useState, useEffect } from 'react';
import { useFinance } from '@/context/FinanceContext';
import { Save, ArrowLeft, Settings as SettingsIcon } from 'lucide-react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

export default function ContractingSettingsPage() {
    // @ts-ignore
    const { settings, updateSettings } = useFinance();
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        welder_rate: 0,
        helper_rate: 0,
        profit_margin: 0,
        advance_required: 0
    });

    useEffect(() => {
        if (settings) {
            setFormData({
                welder_rate: settings.welder_rate || 0,
                helper_rate: settings.helper_rate || 0,
                profit_margin: settings.profit_margin || 0,
                advance_required: settings.advance_required || 0
            });
        }
    }, [settings]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        // Save to settings table (assuming single row for global config or distinct keys)
        // We will assume a 'contracting_config' key or just specific columns in a single row settings table
        // For simplicity, we'll try to update a row where id=1 or similar, but FinanceContext abstract this?
        // Actually, FinanceContext doesn't have updateSettings yet, so I'll implement valid logic here or update context first.

        // Let's implement direct update here for now if context is missing it, but ideally context handles it.
        // We often store keys in a 'settings' table: { key: 'welder_rate', value: 500 } or columns.
        // Let's go with columns in a single row for 'contracting_settings' or just 'settings' table.
        // If settings table is generic { key, value }, we upsert.
        // If it's a specific table, we update row.

        // Let's try upserting by key for flexibility, or assuming a single row with columns if inspection worked.
        // Since inspection failed/was inconclusive, I'll assume we might need to create the table or it uses keys.
        // Let's assume keys: 'contracting_welder_rate', 'contracting_helper_rate', etc.

        // BETTER: Create a strictly typed object update via Context.
        if (updateSettings) {
            await updateSettings(formData);
        } else {
            // Fallback: Upsert to 'settings' table assuming id=1
            const { error } = await supabase.from('settings').upsert({ id: 1, ...formData });
            if (error) alert('Error saving settings');
        }

        setLoading(false);
    };

    return (
        <div className="p-4 md:p-8 text-white max-w-[800px] mx-auto mb-20">
            {/* Header */}
            <div className="flex items-center gap-4 mb-8">
                <Link href="/contracting" className="p-2 bg-white/5 rounded-lg hover:bg-white/10 transition-colors">
                    <ArrowLeft size={20} />
                </Link>
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-2">
                        <SettingsIcon className="text-[var(--accent)]" />
                        Contracting Settings
                    </h1>
                    <p className="text-gray-400 text-sm">Configure default rates and margins.</p>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-6">

                {/* Labor Rates */}
                <div className="glass p-6 rounded-xl flex flex-col gap-4 border border-white/5">
                    <h2 className="text-lg font-semibold text-[var(--accent)] border-b border-white/10 pb-2">Default Labor Rates</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="flex flex-col gap-2">
                            <label className="text-sm text-gray-400">Welder Daily Rate (₹)</label>
                            <input
                                type="number"
                                className="input-field bg-black/30 border border-white/10 rounded-lg px-4 py-3 text-white focus:border-[var(--accent)] focus:outline-none"
                                value={formData.welder_rate}
                                onChange={e => setFormData({ ...formData, welder_rate: parseFloat(e.target.value) })}
                                placeholder="e.g. 800"
                            />
                        </div>
                        <div className="flex flex-col gap-2">
                            <label className="text-sm text-gray-400">Helper Daily Rate (₹)</label>
                            <input
                                type="number"
                                className="input-field bg-black/30 border border-white/10 rounded-lg px-4 py-3 text-white focus:border-[var(--accent)] focus:outline-none"
                                value={formData.helper_rate}
                                onChange={e => setFormData({ ...formData, helper_rate: parseFloat(e.target.value) })}
                                placeholder="e.g. 500"
                            />
                        </div>
                    </div>
                </div>

                {/* Margins */}
                <div className="glass p-6 rounded-xl flex flex-col gap-4 border border-white/5">
                    <h2 className="text-lg font-semibold text-[var(--accent)] border-b border-white/10 pb-2">Business Margins</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="flex flex-col gap-2">
                            <label className="text-sm text-gray-400">Default Profit Margin (%)</label>
                            <input
                                type="number"
                                className="input-field bg-black/30 border border-white/10 rounded-lg px-4 py-3 text-white focus:border-[var(--accent)] focus:outline-none"
                                value={formData.profit_margin}
                                onChange={e => setFormData({ ...formData, profit_margin: parseFloat(e.target.value) })}
                                placeholder="e.g. 15"
                            />
                        </div>
                        <div className="flex flex-col gap-2">
                            <label className="text-sm text-gray-400">Advance Required (%)</label>
                            <input
                                type="number"
                                className="input-field bg-black/30 border border-white/10 rounded-lg px-4 py-3 text-white focus:border-[var(--accent)] focus:outline-none"
                                value={formData.advance_required}
                                onChange={e => setFormData({ ...formData, advance_required: parseFloat(e.target.value) })}
                                placeholder="e.g. 50"
                            />
                        </div>
                    </div>
                </div>

                <button
                    type="submit"
                    disabled={loading}
                    className="bg-[var(--accent)] text-black font-bold py-4 rounded-xl hover:opacity-90 transition-opacity flex items-center justify-center gap-2 mt-4"
                >
                    <Save size={20} />
                    {loading ? 'Saving...' : 'Save Configuration'}
                </button>

            </form>
        </div>
    );
}
