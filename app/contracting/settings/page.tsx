"use client";
import React, { useState, useEffect } from 'react';
import { useFinance } from '@/context/FinanceContext';
import { useAuth } from '@/context/AuthContext';
import { Save, ArrowLeft, Settings as SettingsIcon, UserPlus, Mail, Lock, User, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

export default function ContractingSettingsPage() {
    // @ts-ignore
    const { settings, updateSettings } = useFinance();
    const { createAccountByAdmin } = useAuth();
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        welder_rate: 0,
        helper_rate: 0,
        profit_margin: 0,
        advance_required: 0,
        default_attendance_worked_for: 'Me'
    });

    // Admin user creation state
    const [newUserEmail, setNewUserEmail] = useState('');
    const [newUserPassword, setNewUserPassword] = useState('');
    const [newUserName, setNewUserName] = useState('');
    const [creatingUser, setCreatingUser] = useState(false);
    const [userSuccessMsg, setUserSuccessMsg] = useState<string | null>(null);
    const [userErrorMsg, setUserErrorMsg] = useState<string | null>(null);

    const handleCreateUser = async (e: React.FormEvent) => {
        e.preventDefault();
        setUserSuccessMsg(null);
        setUserErrorMsg(null);

        if (!newUserEmail.trim() || !newUserPassword) {
            setUserErrorMsg('Please provide both email and password.');
            return;
        }

        if (newUserPassword.length < 6) {
            setUserErrorMsg('Password must be at least 6 characters long.');
            return;
        }

        try {
            setCreatingUser(true);
            const { error } = await createAccountByAdmin(newUserEmail, newUserPassword, newUserName);
            if (error) {
                setUserErrorMsg(error.message || 'Failed to create user account.');
            } else {
                setUserSuccessMsg(`Account created successfully for ${newUserEmail}!`);
                setNewUserEmail('');
                setNewUserPassword('');
                setNewUserName('');
            }
        } catch (err: any) {
            setUserErrorMsg(err.message || 'An unexpected error occurred.');
        } finally {
            setCreatingUser(false);
        }
    };

    useEffect(() => {
        if (settings) {
            setFormData({
                welder_rate: settings.welder_rate || 0,
                helper_rate: settings.helper_rate || 0,
                profit_margin: settings.profit_margin || 0,
                advance_required: settings.advance_required || 0,
                default_attendance_worked_for: settings.default_attendance_worked_for || 'Me'
            });
        }
    }, [settings]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        if (updateSettings) {
            await updateSettings(formData);
        } else {
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
                <div className="bg-[#141414] border border-white/10 rounded-2xl p-6 flex flex-col gap-4">
                    <h2 className="text-lg font-bold border-b border-white/10 pb-2">Default Daily Labor Rates (₹)</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="text-xs text-gray-400 block mb-1">Welder Rate</label>
                            <input
                                type="number"
                                value={formData.welder_rate}
                                onChange={e => setFormData({ ...formData, welder_rate: Number(e.target.value) })}
                                className="w-full bg-[#1e1e1e] border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-[var(--accent)]"
                            />
                        </div>
                        <div>
                            <label className="text-xs text-gray-400 block mb-1">Helper Rate</label>
                            <input
                                type="number"
                                value={formData.helper_rate}
                                onChange={e => setFormData({ ...formData, helper_rate: Number(e.target.value) })}
                                className="w-full bg-[#1e1e1e] border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-[var(--accent)]"
                            />
                        </div>
                    </div>
                </div>

                {/* Financial Rules */}
                <div className="bg-[#141414] border border-white/10 rounded-2xl p-6 flex flex-col gap-4">
                    <h2 className="text-lg font-bold border-b border-white/10 pb-2">Financial Overrides</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="text-xs text-gray-400 block mb-1">Default Profit Margin (%)</label>
                            <input
                                type="number"
                                value={formData.profit_margin}
                                onChange={e => setFormData({ ...formData, profit_margin: Number(e.target.value) })}
                                className="w-full bg-[#1e1e1e] border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-[var(--accent)]"
                            />
                        </div>
                        <div>
                            <label className="text-xs text-gray-400 block mb-1">Default Advance Required (%)</label>
                            <input
                                type="number"
                                value={formData.advance_required}
                                onChange={e => setFormData({ ...formData, advance_required: Number(e.target.value) })}
                                className="w-full bg-[#1e1e1e] border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-[var(--accent)]"
                            />
                        </div>
                    </div>
                </div>

                {/* Attendance Defaults */}
                <div className="bg-[#141414] border border-white/10 rounded-2xl p-6 flex flex-col gap-4">
                    <h2 className="text-lg font-bold border-b border-white/10 pb-2">Attendance Defaults</h2>
                    <div>
                        <label className="text-xs text-gray-400 block mb-2">Default "Worked For" Selection</label>
                        <div className="flex gap-4">
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

                <button
                    type="submit"
                    disabled={loading}
                    className="bg-[var(--accent)] text-black font-bold py-4 rounded-xl hover:opacity-90 transition-opacity flex items-center justify-center gap-2 mt-4 cursor-pointer"
                >
                    <Save size={20} />
                    {loading ? 'Saving...' : 'Save Configuration'}
                </button>

            </form>

            {/* Admin User Management Section */}
            <div className="bg-[#141414] border border-white/10 rounded-2xl p-6 flex flex-col gap-5 mt-8">
                <div className="flex items-center gap-2.5 border-b border-white/10 pb-3">
                    <div className="p-2 rounded-xl bg-[rgba(255,215,0,0.1)] text-[#FFD700]">
                        <UserPlus size={20} />
                    </div>
                    <div>
                        <h2 className="text-lg font-bold text-white">Create New User Account (Admin Only)</h2>
                        <p className="text-gray-400 text-xs">Provision access for new team members or administrators.</p>
                    </div>
                </div>

                {userErrorMsg && (
                    <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/25 flex items-start gap-2.5 text-xs text-red-300">
                        <AlertCircle size={16} className="text-red-400 shrink-0 mt-0.5" />
                        <span>{userErrorMsg}</span>
                    </div>
                )}

                {userSuccessMsg && (
                    <div className="p-3 rounded-xl bg-green-500/10 border border-green-500/25 flex items-start gap-2.5 text-xs text-green-300">
                        <CheckCircle2 size={16} className="text-green-400 shrink-0 mt-0.5" />
                        <span>{userSuccessMsg}</span>
                    </div>
                )}

                <form onSubmit={handleCreateUser} className="flex flex-col gap-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <label className="text-xs text-gray-400 flex items-center gap-1.5 mb-1.5">
                                <User size={13} className="text-[#FFD700]" />
                                <span>Full Name</span>
                            </label>
                            <input
                                type="text"
                                value={newUserName}
                                onChange={e => setNewUserName(e.target.value)}
                                placeholder="Staff Name"
                                className="w-full bg-[#1e1e1e] border border-white/10 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-[var(--accent)]"
                            />
                        </div>
                        <div>
                            <label className="text-xs text-gray-400 flex items-center gap-1.5 mb-1.5">
                                <Mail size={13} className="text-[#FFD700]" />
                                <span>Email Address *</span>
                            </label>
                            <input
                                type="email"
                                required
                                value={newUserEmail}
                                onChange={e => setNewUserEmail(e.target.value)}
                                placeholder="member@galaxy.com"
                                className="w-full bg-[#1e1e1e] border border-white/10 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-[var(--accent)]"
                            />
                        </div>
                        <div>
                            <label className="text-xs text-gray-400 flex items-center gap-1.5 mb-1.5">
                                <Lock size={13} className="text-[#FFD700]" />
                                <span>Password *</span>
                            </label>
                            <input
                                type="password"
                                required
                                value={newUserPassword}
                                onChange={e => setNewUserPassword(e.target.value)}
                                placeholder="Min 6 characters"
                                className="w-full bg-[#1e1e1e] border border-white/10 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-[var(--accent)]"
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={creatingUser}
                        className="bg-white/10 hover:bg-white/15 border border-white/10 text-white font-semibold py-3 px-5 rounded-xl transition-all flex items-center justify-center gap-2 self-start cursor-pointer disabled:opacity-50"
                    >
                        {creatingUser ? (
                            <>
                                <Loader2 size={16} className="animate-spin text-[#FFD700]" />
                                <span>Creating Account...</span>
                            </>
                        ) : (
                            <>
                                <UserPlus size={16} className="text-[#FFD700]" />
                                <span>Create User Account</span>
                            </>
                        )}
                    </button>
                </form>
            </div>
        </div>
    );
}
