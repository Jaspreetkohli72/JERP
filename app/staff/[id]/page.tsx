"use client";
import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useFinance } from '@/context/FinanceContext';
import { ArrowLeft, Wallet, Calendar as CalendarIcon, Save, Trash2, Pencil } from 'lucide-react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

export default function StaffDetailsPage() {
    const { id } = useParams();
    const router = useRouter();
    // @ts-ignore
    const { staffList, getStaffDetails, addStaffAdvance, deleteStaff, updateStaff, settings, wallets } = useFinance();

    // State
    const [staff, setStaff] = useState<any>(null);
    const [month, setMonth] = useState(new Date().getMonth());
    const [year, setYear] = useState(new Date().getFullYear());
    const [data, setData] = useState({ attendance: [], advances: [] });
    const [loading, setLoading] = useState(true);

    // Modal State
    const [isAdvanceModalOpen, setIsAdvanceModalOpen] = useState(false);
    const [advanceForm, setAdvanceForm] = useState({ amount: '', date: new Date().toISOString().split('T')[0], notes: '', walletId: '' });

    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editForm, setEditForm] = useState({ name: '', role: '', phone: '', salary: '' });

    // Auto-fill salary in Edit Mode
    useEffect(() => {
        if (!settings || !isEditModalOpen) return;

        let rate = 0;
        if (editForm.role === 'Welder' && settings.welder_rate) {
            rate = settings.welder_rate;
        } else if (editForm.role === 'Helper' && settings.helper_rate) {
            rate = settings.helper_rate;
        }

        if (rate > 0) {
            setEditForm(prev => {
                if (prev.salary !== String(rate)) return { ...prev, salary: String(rate) };
                return prev;
            });
        }
    }, [editForm.role, settings, isEditModalOpen]);

    const handleUpdateStaff = async (e: React.FormEvent) => {
        e.preventDefault();
        const { success } = await updateStaff(id, {
            ...editForm,
            salary: Number(editForm.salary) || 0
        });
        if (success) {
            setIsEditModalOpen(false);
            // Refresh local staff object
            setStaff((prev: any) => ({ ...prev, ...editForm, salary: Number(editForm.salary) || 0 }));
        }
    };

    useEffect(() => {
        if (staffList.length > 0) {
            // @ts-ignore
            const s = staffList.find(s => s.id == id); // id might be string vs number
            setStaff(s);
        }
    }, [staffList, id]);

    const loadData = async () => {
        setLoading(true);
        // @ts-ignore
        const res = await getStaffDetails(id, month, year);
        setData(res);
        setLoading(false);
    };

    useEffect(() => {
        if (id) loadData();
    }, [id, month, year]);

    // Stats Logic
    const presentCount = data.attendance.filter((a: any) => a.status === 'Present').length;
    const halfDayCount = data.attendance.filter((a: any) => a.status === 'Half-Day').length;
    const effectiveDays = presentCount + (halfDayCount * 0.5);
    const estimatedEarnings = staff ? effectiveDays * staff.salary : 0;
    const totalAdvances = data.advances.reduce((sum, a: any) => sum + Number(a.amount), 0);
    const balance = estimatedEarnings - totalAdvances;

    const handleAddAdvance = async (e: React.FormEvent) => {
        e.preventDefault();
        const { success } = await addStaffAdvance({
            staff_id: id,
            amount: Number(advanceForm.amount),
            date: advanceForm.date,
            notes: advanceForm.notes
        }, advanceForm.walletId);

        if (success) {
            setIsAdvanceModalOpen(false);
            setAdvanceForm({ amount: '', date: new Date().toISOString().split('T')[0], notes: '', walletId: '' });
            loadData();
        }
    };

    if (!staff) return <div className="p-10 text-center text-white">Loading staff...</div>;

    const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

    return (
        <div className="flex flex-col gap-6 p-4 md:p-8 text-white max-w-[1000px] mx-auto mb-20">
            {/* Header */}
            <div className="flex items-center gap-4">
                <Link href="/staff" className="p-2 bg-white/5 rounded-lg hover:bg-white/10 transition-colors">
                    <ArrowLeft size={20} />
                </Link>
                <div className="flex-1">
                    <h1 className="text-2xl font-bold flex items-center gap-3">
                        {staff.name}
                    </h1>
                    <p className="text-gray-400 text-sm">{staff.role} • ₹{staff.salary}/day</p>
                </div>
                <button
                    onClick={() => {
                        setEditForm({
                            name: staff.name,
                            role: staff.role,
                            phone: staff.phone || '',
                            salary: String(staff.salary)
                        });
                        setIsEditModalOpen(true);
                    }}
                    className="p-2 text-[var(--accent)] hover:bg-[var(--accent)]/10 rounded-lg transition-colors"
                    title="Edit Staff"
                >
                    <Pencil size={20} />
                </button>
                <button
                    onClick={async () => {
                        if (confirm(`Are you sure you want to delete ${staff.name}? This cannot be undone.`)) {
                            await deleteStaff(id);
                            router.push('/staff');
                        }
                    }}
                    className="p-2 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                    title="Delete Staff"
                >
                    <Trash2 size={20} />
                </button>
            </div>

            {/* Filter */}
            <div className="flex gap-2 items-center bg-white/5 p-2 rounded-xl w-fit">
                <button onClick={() => setMonth(m => m === 0 ? 11 : m - 1)} className="p-2 hover:bg-white/10 rounded-lg">&lt;</button>
                <span className="font-bold min-w-[120px] text-center">{monthNames[month]} {year}</span>
                <button onClick={() => setMonth(m => m === 11 ? 0 : m + 1)} className="p-2 hover:bg-white/10 rounded-lg">&gt;</button>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="glass p-5 rounded-xl border border-white/5 bg-blue-500/5">
                    <div className="flex items-center gap-3 mb-2 text-blue-400">
                        <CalendarIcon size={20} />
                        <h3 className="font-bold text-sm uppercase tracking-wider">Attendance ({monthNames[month]})</h3>
                    </div>
                    <div className="text-2xl font-bold">{effectiveDays} Days</div>
                    <div className="flex gap-2 text-xs text-gray-500 mt-1">
                        <span>P: {presentCount}</span>
                        <span>HD: {halfDayCount}</span>
                    </div>
                </div>

                <div className="glass p-5 rounded-xl border border-white/5 bg-green-500/5">
                    <div className="flex items-center gap-3 mb-2 text-green-400">
                        <Wallet size={20} />
                        <h3 className="font-bold text-sm uppercase tracking-wider">Earned Salary</h3>
                    </div>
                    <div className="text-2xl font-bold">₹{estimatedEarnings.toLocaleString()}</div>
                    <p className="text-xs text-gray-500 mt-1">Based on daily rate</p>
                </div>

                <div className="glass p-5 rounded-xl border border-white/5 bg-red-500/5">
                    <div className="flex items-center gap-3 mb-2 text-red-400">
                        <Wallet size={20} />
                        <h3 className="font-bold text-sm uppercase tracking-wider">Advances/Paid</h3>
                    </div>
                    <div className="text-2xl font-bold">₹{totalAdvances.toLocaleString()}</div>
                    <p className="text-xs text-gray-500 mt-1">Balance: ₹{balance.toLocaleString()}</p>
                </div>
            </div>

            {/* Ledger View */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Attendance List */}
                <div className="glass p-6 rounded-xl border border-white/5">
                    <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                        <CalendarIcon size={18} className="text-blue-400" /> Attendance Log
                    </h3>
                    <div className="flex flex-col gap-2 max-h-[300px] overflow-y-auto pr-2">
                        {data.attendance.length > 0 ? (
                            data.attendance.map((rec: any) => (
                                <div key={rec.id} className="flex justify-between items-center p-3 bg-white/5 rounded-lg text-sm">
                                    <span>{new Date(rec.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' }).replace(/ /g, '-')}</span>
                                    <span className={`px-2 py-0.5 rounded text-xs font-bold ${rec.status === 'Present' ? 'bg-green-500/20 text-green-400' :
                                        rec.status === 'Absent' ? 'bg-red-500/20 text-red-400' :
                                            'bg-yellow-500/20 text-yellow-400'
                                        }`}>{rec.status}</span>
                                </div>
                            ))
                        ) : <div className="text-gray-500 italic text-sm">No records this month</div>}
                    </div>
                </div>

                {/* Advances/Payments List */}
                <div className="glass p-6 rounded-xl border border-white/5">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-bold flex items-center gap-2">
                            <Wallet size={18} className="text-red-400" /> Payments/Advances
                        </h3>
                        <button onClick={() => setIsAdvanceModalOpen(true)} className="text-xs bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-lg transition-colors">
                            + Add Payment
                        </button>
                    </div>

                    <div className="flex flex-col gap-2 max-h-[300px] overflow-y-auto pr-2">
                        {data.advances.length > 0 ? (
                            data.advances.map((rec: any) => (
                                <div key={rec.id} className="flex justify-between items-center p-3 bg-white/5 rounded-lg text-sm">
                                    <div>
                                        <div className="font-bold text-red-400">₹{rec.amount}</div>
                                        <div className="text-xs text-gray-500">{new Date(rec.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' }).replace(/ /g, '-')}</div>
                                    </div>
                                    <div className="text-xs text-gray-400 max-w-[100px] truncate">{rec.notes || '-'}</div>
                                </div>
                            ))
                        ) : <div className="text-gray-500 italic text-sm">No payments recorded</div>}
                    </div>
                </div>
            </div>

            {/* Modal */}
            {isAdvanceModalOpen && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-[#0a0a0a] border border-white/10 p-6 rounded-2xl w-full max-w-md shadow-2xl">
                        <h2 className="text-xl font-bold mb-4">Record Payment / Advance</h2>
                        <form onSubmit={handleAddAdvance} className="flex flex-col gap-4">
                            <input autoFocus type="number" placeholder="Amount (₹)" className="input-field bg-white/5 border border-white/10 rounded-lg px-4 py-3" value={advanceForm.amount} onChange={e => setAdvanceForm({ ...advanceForm, amount: e.target.value })} required />

                            <div className="flex flex-col gap-1">
                                <label className="text-xs text-gray-400 uppercase">Paid From (Optional)</label>
                                <select
                                    className="input-field bg-white/5 border border-white/10 rounded-lg px-4 py-3 bg-[#1a1a1a] text-white"
                                    value={advanceForm.walletId}
                                    onChange={e => setAdvanceForm({ ...advanceForm, walletId: e.target.value })}
                                >
                                    <option value="" className="bg-[#1a1a1a] text-gray-400">Select Wallet (for auto-deduction)</option>
                                    {wallets?.map((w: any) => (
                                        <option key={w.id} value={w.id} className="bg-[#1a1a1a] text-white">
                                            {w.name} (₹{w.balance})
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <input type="date" className="input-field bg-white/5 border border-white/10 rounded-lg px-4 py-3 [color-scheme:dark]" value={advanceForm.date} onChange={e => setAdvanceForm({ ...advanceForm, date: e.target.value })} />

                            <textarea placeholder="Notes (e.g. Salary Advance, Petrol)" className="input-field bg-white/5 border border-white/10 rounded-lg px-4 py-3 h-24 resize-none" value={advanceForm.notes} onChange={e => setAdvanceForm({ ...advanceForm, notes: e.target.value })} />

                            <div className="flex gap-3 mt-4">
                                <button type="button" onClick={() => setIsAdvanceModalOpen(false)} className="flex-1 py-3 text-gray-400 hover:text-white transition-colors">Cancel</button>
                                <button type="submit" className="flex-1 bg-[var(--accent)] text-black font-bold rounded-lg py-3 hover:opacity-90 transition-opacity">Record</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
            {isEditModalOpen && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-[#0a0a0a] border border-white/10 p-6 rounded-2xl w-full max-w-md shadow-2xl">
                        <h2 className="text-xl font-bold mb-4">Edit Staff Details</h2>
                        <form onSubmit={handleUpdateStaff} className="flex flex-col gap-4">
                            <input required type="text" placeholder="Full Name" className="input-field bg-white/5 border border-white/10 rounded-lg px-4 py-3" value={editForm.name} onChange={e => setEditForm({ ...editForm, name: e.target.value })} />

                            <select className="input-field bg-white/5 border border-white/10 rounded-lg px-4 py-3 bg-[#1a1a1a]" value={editForm.role} onChange={e => setEditForm({ ...editForm, role: e.target.value })}>
                                <option value="Helper" className="bg-[#1a1a1a] text-white">Helper</option>
                                <option value="Welder" className="bg-[#1a1a1a] text-white">Welder</option>
                                <option value="Fitter" className="bg-[#1a1a1a] text-white">Fitter</option>
                                <option value="Supervisor" className="bg-[#1a1a1a] text-white">Supervisor</option>
                                <option value="Driver" className="bg-[#1a1a1a] text-white">Driver</option>
                            </select>

                            <input type="number" placeholder="Daily Salary Rate (₹)" className="input-field bg-white/5 border border-white/10 rounded-lg px-4 py-3" value={editForm.salary} onChange={e => setEditForm({ ...editForm, salary: e.target.value })} />

                            <input type="text" placeholder="Phone Number (Optional)" className="input-field bg-white/5 border border-white/10 rounded-lg px-4 py-3" value={editForm.phone} onChange={e => setEditForm({ ...editForm, phone: e.target.value })} />

                            <div className="flex gap-3 mt-4">
                                <button type="button" onClick={() => setIsEditModalOpen(false)} className="flex-1 py-3 text-gray-400 hover:text-white transition-colors">Cancel</button>
                                <button type="submit" className="flex-1 bg-[var(--accent)] text-black font-bold rounded-lg py-3 hover:opacity-90 transition-opacity">Save Changes</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
