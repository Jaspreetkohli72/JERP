"use client";
import React, { useState } from 'react';
import Link from 'next/link';
import { useFinance } from '@/context/FinanceContext';
import { User, Calendar, Plus, Wallet, ArrowRight, Briefcase } from 'lucide-react';

export default function StaffPage() {
    // @ts-ignore
    const { staffList, addStaff, settings } = useFinance();
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);

    // Quick Add State
    const [newStaff, setNewStaff] = useState({ name: '', role: 'Helper', phone: '', salary: '' });

    // Auto-fill salary based on settings
    React.useEffect(() => {
        if (!settings) return;

        let rate = 0;
        if (newStaff.role === 'Welder' && settings.welder_rate) {
            rate = settings.welder_rate;
        } else if (newStaff.role === 'Helper' && settings.helper_rate) {
            rate = settings.helper_rate;
        }

        if (rate > 0) {
            setNewStaff(prev => ({ ...prev, salary: String(rate) }));
        }
    }, [newStaff.role, settings]);

    const handleAddStaff = async (e: React.FormEvent) => {
        e.preventDefault();
        await addStaff({
            ...newStaff,
            status: 'Available',
            salary: Number(newStaff.salary) || 0
        });
        setIsAddModalOpen(false);
        setNewStaff({ name: '', role: 'Helper', phone: '', salary: '' });
    };

    return (
        <div className="flex flex-col gap-6 p-4 md:p-8 text-white max-w-[1200px] mx-auto mb-20">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-[var(--accent)] to-[var(--accent-3)] bg-clip-text text-transparent">Staff & HR</h1>
                    <p className="text-muted text-sm mt-1">Manage team, attendance, and payouts.</p>
                </div>
                <button onClick={() => setIsAddModalOpen(true)} className="bg-[var(--accent)] text-black px-4 py-2 rounded-lg font-semibold hover:opacity-90 transition-opacity flex items-center gap-2">
                    <Plus size={18} /> Add Staff
                </button>
            </div>

            {/* Modules Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Attendance Card */}
                <Link href="/staff/attendance" className="glass p-6 rounded-2xl border border-white/5 hover:border-[var(--accent)]/50 transition-colors group">
                    <div className="flex items-start justify-between">
                        <div className="p-3 bg-blue-500/20 rounded-xl text-blue-400">
                            <Calendar size={32} />
                        </div>
                        <div className="p-2 rounded-full bg-white/5 -rotate-45 group-hover:rotate-0 transition-transform">
                            <ArrowRight size={20} className="text-gray-400" />
                        </div>
                    </div>
                    <div className="mt-4">
                        <h2 className="text-xl font-bold text-gray-200">Daily Attendance</h2>
                        <p className="text-gray-400 text-sm mt-1">Mark present/absent for today.</p>
                    </div>
                </Link>

                {/* Accounts Card - Future specific page? Or just individual drilldown */}
                <div className="glass p-6 rounded-2xl border border-white/5 opacity-80">
                    <div className="flex items-start justify-between">
                        <div className="p-3 bg-green-500/20 rounded-xl text-green-400">
                            <Wallet size={32} />
                        </div>
                    </div>
                    <div className="mt-4">
                        <h2 className="text-xl font-bold text-gray-200">Salary & Accounts</h2>
                        <p className="text-gray-400 text-sm mt-1">View individual ledger in staff list below.</p>
                    </div>
                </div>
            </div>

            {/* Staff List */}
            <h3 className="text-xl font-semibold mt-4">Team Members</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {staffList && staffList.map((staff: any) => (
                    <Link key={staff.id} href={`/staff/${staff.id}`} className="glass p-5 rounded-xl border border-white/5 hover:border-[var(--accent)]/50 transition-colors flex flex-col gap-4 group">
                        <div className="flex items-center gap-4">
                            <div className="h-12 w-12 rounded-full bg-gradient-to-br from-gray-700 to-gray-900 flex items-center justify-center text-xl font-bold text-gray-400 border border-white/10">
                                {staff.name.charAt(0)}
                            </div>
                            <div>
                                <h4 className="font-bold text-lg text-gray-200 group-hover:text-[var(--accent)] transition-colors">{staff.name}</h4>
                                <div className="flex items-center gap-2 text-xs text-gray-400">
                                    <Briefcase size={12} />
                                    <span>{staff.role}</span>
                                </div>
                            </div>
                        </div>

                        <div className="border-t border-white/10 pt-4 mt-auto flex justify-between items-center text-sm">
                            <span className="text-gray-500">Daily Rate: ₹{staff.salary}</span>
                            <div className={`px-2 py-1 rounded-md text-xs font-bold uppercase ${staff.status === 'Available' ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
                                {staff.status}
                            </div>
                        </div>
                    </Link>
                ))}

                {staffList.length === 0 && (
                    <div className="col-span-full py-10 text-center text-gray-500">
                        No staff members added yet.
                    </div>
                )}
            </div>

            {/* Add Staff Modal */}
            {isAddModalOpen && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-[#0a0a0a] border border-white/10 p-6 rounded-2xl w-full max-w-md shadow-2xl">
                        <h2 className="text-xl font-bold mb-4">Add New Staff</h2>
                        <form onSubmit={handleAddStaff} className="flex flex-col gap-4">
                            <input required autoFocus type="text" placeholder="Full Name" className="input-field bg-white/5 border border-white/10 rounded-lg px-4 py-3" value={newStaff.name} onChange={e => setNewStaff({ ...newStaff, name: e.target.value })} />

                            <select className="input-field bg-white/5 border border-white/10 rounded-lg px-4 py-3 bg-[#1a1a1a]" value={newStaff.role} onChange={e => setNewStaff({ ...newStaff, role: e.target.value })}>
                                <option value="Helper" className="bg-[#1a1a1a] text-white">Helper</option>
                                <option value="Welder" className="bg-[#1a1a1a] text-white">Welder</option>
                                <option value="Fitter" className="bg-[#1a1a1a] text-white">Fitter</option>
                                <option value="Supervisor" className="bg-[#1a1a1a] text-white">Supervisor</option>
                                <option value="Driver" className="bg-[#1a1a1a] text-white">Driver</option>
                            </select>

                            <input type="number" placeholder="Daily Salary Rate (₹)" className="input-field bg-white/5 border border-white/10 rounded-lg px-4 py-3" value={newStaff.salary} onChange={e => setNewStaff({ ...newStaff, salary: e.target.value })} />

                            <input type="text" placeholder="Phone Number (Optional)" className="input-field bg-white/5 border border-white/10 rounded-lg px-4 py-3" value={newStaff.phone} onChange={e => setNewStaff({ ...newStaff, phone: e.target.value })} />

                            <div className="flex gap-3 mt-4">
                                <button type="button" onClick={() => setIsAddModalOpen(false)} className="flex-1 py-3 text-gray-400 hover:text-white transition-colors">Cancel</button>
                                <button type="submit" className="flex-1 bg-[var(--accent)] text-black font-bold rounded-lg py-3 hover:opacity-90 transition-opacity">Add Staff</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
