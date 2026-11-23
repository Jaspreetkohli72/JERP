"use client";
import React, { useState, useEffect } from 'react';
import { useFinance } from '@/context/FinanceContext';
import { Save, ArrowLeft, Settings as SettingsIcon, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';
import { getSettingsAction, saveSettingsAction } from '@/app/actions/settings';

export default function ContractingSettingsPage() {
    // @ts-ignore
    const { settings, updateSettings } = useFinance();
    const [loading, setLoading] = useState(false);
    const [savedNotice, setSavedNotice] = useState<string | null>(null);
    const [formData, setFormData] = useState({
        welder_rate: 0,
        helper_rate: 0,
        profit_margin: 0,
        advance_required: 0,
        default_attendance_worked_for: 'Me'
    });

    // 1. Initial authoritative load from server action
    useEffect(() => {
        getSettingsAction().then(s => {
            if (s) {
                setFormData({
                    welder_rate: s.welder_rate || 0,
                    helper_rate: s.helper_rate || 0,
                    profit_margin: s.profit_margin || 0,
                    advance_required: s.advance_required ?? s.advance_percentage ?? 0,
                    default_attendance_worked_for: s.default_attendance_worked_for || 'Me'
                });
            }
        });
    }, []);

    // 2. Keep in sync if settings context updates
    useEffect(() => {
        if (settings && Object.keys(settings).length > 0) {
            setFormData(prev => ({
                ...prev,
                welder_rate: settings.welder_rate ?? prev.welder_rate,
                helper_rate: settings.helper_rate ?? prev.helper_rate,
                profit_margin: settings.profit_margin ?? prev.profit_margin,
                advance_required: settings.advance_required ?? settings.advance_percentage ?? prev.advance_required,
                default_attendance_worked_for: settings.default_attendance_worked_for || prev.default_attendance_worked_for || 'Me'
            }));
        }
    }, [settings]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setSavedNotice(null);

        try {
            const res = await saveSettingsAction(formData);
            if (updateSettings) {
                await updateSettings(res.settings || formData);
            }
            setSavedNotice('Configuration saved successfully! Future punches will be attributed to ' + formData.default_attendance_worked_for + '.');
            setTimeout(() => setSavedNotice(null), 5000);
        } catch (err: any) {
            alert('Failed to save settings: ' + (err?.message || err));
        } finally {
            setLoading(false);
        }
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

                {/* Default Attendance Recipient */}
                <div className="glass p-6 rounded-xl flex flex-col gap-4 border border-white/5">
                    <h2 className="text-lg font-semibold text-[var(--accent)] border-b border-white/10 pb-2">Attendance Settings</h2>
                    <div className="flex flex-col gap-2">
                        <label className="text-sm text-gray-400">Default Attendance Recipient (Worked For)</label>
                        <div className="flex gap-6 bg-black/30 p-3 rounded-xl border border-white/10">
                            {['Me', 'Papa', 'Both'].map(option => (
                                <label key={option} className="flex items-center gap-2 cursor-pointer text-sm font-medium text-gray-200">
                                    <input
                                        type="radio"
                                        name="default_attendance_worked_for"
                                        value={option}
                                        checked={formData.default_attendance_worked_for === option}
                                        onChange={e => setFormData({ ...formData, default_attendance_worked_for: e.target.value })}
                                        className="accent-[var(--accent)] h-4 w-4 cursor-pointer"
                                    />
                                    <span>{option}</span>
                                </label>
                            ))}
                        </div>
                    </div>
                </div>

                {savedNotice && (
                    <div className="flex items-center gap-2 text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-4 py-3 rounded-xl text-sm font-medium">
                        <CheckCircle2 size={18} className="shrink-0" />
                        <span>{savedNotice}</span>
                    </div>
                )}

                <button
                    type="submit"
                    disabled={loading}
                    className="bg-[var(--accent)] text-black font-bold py-4 rounded-xl hover:opacity-90 transition-opacity flex items-center justify-center gap-2 mt-2"
                >
                    <Save size={20} />
                    {loading ? 'Saving...' : 'Save Configuration'}
                </button>

            </form>
        </div>
    );
}
