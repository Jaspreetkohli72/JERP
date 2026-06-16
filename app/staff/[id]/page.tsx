"use client";
import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useFinance } from '@/context/FinanceContext';
import { ArrowLeft, Wallet, Calendar as CalendarIcon, Save, Trash2, Pencil, Share2 } from 'lucide-react';
import Link from 'next/link';
import CustomSelect from '@/components/CustomSelect';
import { supabase } from '@/lib/supabase';
import { updateStaffAction, deleteStaffAction, updateStaffAdvanceAction, deleteStaffAdvanceAction, deleteAttendanceAction } from '@/app/actions/staff';

export default function StaffDetailsPage() {
    const { id } = useParams();
    const router = useRouter();
    // @ts-ignore
    const { staffList, getStaffDetails, addStaffAdvance, deleteStaff, updateStaff, settings, wallets, refreshData, attendance: globalAttendance, allStaffAdvances: globalAdvances } = useFinance();

    // State
    const [staff, setStaff] = useState<any>(null);
    const [month, setMonth] = useState(new Date().getMonth());
    const [year, setYear] = useState(new Date().getFullYear());
    const [data, setData] = useState({ attendance: [], advances: [] });
    const [loading, setLoading] = useState(true);

    // Modal State
    const [isAdvanceModalOpen, setIsAdvanceModalOpen] = useState(false);
    const [isSettleModalOpen, setIsSettleModalOpen] = useState(false);
    const [settleForm, setSettleForm] = useState({
        walletId: '',
        date: new Date().toISOString().split('T')[0],
        settleTillDate: new Date().toISOString().split('T')[0],
        notes: `Account Settlement up to ${new Date().toISOString().split('T')[0]}`
    });
    const [settleAmount, setSettleAmount] = useState('');
    const [settleIsSubmitting, setSettleIsSubmitting] = useState(false);
    const [editingAdvanceId, setEditingAdvanceId] = useState<string | number | null>(null);
    const [advanceForm, setAdvanceForm] = useState({ amount: '', date: new Date().toISOString().split('T')[0], notes: '', walletId: '' });

    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editForm, setEditForm] = useState({ name: '', role: '', phone: '', salary: '' });

    const [isTerminateModalOpen, setIsTerminateModalOpen] = useState(false);
    const [terminationDate, setTerminationDate] = useState(() => {
        const d = new Date();
        d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
        return d.toISOString().split('T')[0];
    });

    const handleTerminate = async (e: React.FormEvent) => {
        e.preventDefault();
        const statusVal = `Terminated:${terminationDate}`;
        const res = await updateStaff(id, { status: statusVal });
        if (res.success) {
            setIsTerminateModalOpen(false);
            setStaff((prev: any) => ({ ...prev, status: statusVal }));
            router.refresh();
        } else {
            alert(`Failed to terminate employee: ${res.error}`);
        }
    };

    const handleReinstate = async () => {
        const confirm = window.confirm("Are you sure you want to reinstate this employee?");
        if (!confirm) return;
        const res = await updateStaff(id, { status: 'Available' });
        if (res.success) {
            setStaff((prev: any) => ({ ...prev, status: 'Available' }));
            router.refresh();
        } else {
            alert(`Failed to reinstate employee: ${res.error}`);
        }
    };

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
        const { success } = await updateStaffAction(id as string, {
            ...editForm,
            salary: Number(editForm.salary) || 0
        });
        if (success) {
            setIsEditModalOpen(false);
            // Refresh local staff object
            setStaff((prev: any) => ({ ...prev, ...editForm, salary: Number(editForm.salary) || 0 }));
            // Call fetchData in context just in case other things need it
            if (updateStaff) updateStaff(id, editForm);
            router.refresh(); // Purge Next.js client router cache
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
    const overtimeCount = data.attendance.filter((a: any) => a.status === 'Overtime').length;
    const effectiveDays = presentCount + (halfDayCount * 0.5) + overtimeCount;
    const salaryDays = presentCount + (halfDayCount * 0.5) + (overtimeCount * 1.5);
    const estimatedEarnings = staff ? salaryDays * staff.salary : 0;
    const totalAdvances = data.advances.reduce((sum, a: any) => sum + Number(a.amount), 0);
    const balance = estimatedEarnings - totalAdvances;

    const handleAddAdvance = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (editingAdvanceId) {
            const { success, error } = await updateStaffAdvanceAction(editingAdvanceId, {
                amount: Number(advanceForm.amount),
                date: advanceForm.date,
                notes: advanceForm.notes
            });
            if (success) {
                setIsAdvanceModalOpen(false);
                setEditingAdvanceId(null);
                setAdvanceForm({ amount: '', date: new Date().toISOString().split('T')[0], notes: '', walletId: '' });
                loadData();
            } else {
                alert(`Failed to update advance: ${error}`);
            }
        } else {
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
        }
    };

    const calculateBalanceUpTo = (dateStr: string) => {
        if (!staff) return 0;
        
        const attList = globalAttendance && globalAttendance.length > 0 ? globalAttendance : data.attendance;
        const advList = globalAdvances && globalAdvances.length > 0 ? globalAdvances : data.advances;

        const staffAtt = attList.filter((a: any) => 
            String(a.staff_id) === String(id) && 
            a.date && a.date <= dateStr
        );
        
        const present = staffAtt.filter((a: any) => a.status === 'Present').length;
        const halfDay = staffAtt.filter((a: any) => a.status === 'Half-Day').length;
        const overtime = staffAtt.filter((a: any) => a.status === 'Overtime').length;
        
        const salDays = present + (halfDay * 0.5) + (overtime * 1.5);
        const earnings = salDays * (Number(staff.salary) || 0);
        
        // Advances are calculated up to the current day / all-time
        const staffAdv = advList.filter((a: any) => 
            String(a.staff_id) === String(id)
        );
        
        const advances = staffAdv.reduce((sum: number, a: any) => sum + Number(a.amount), 0);
        
        return earnings - advances;
    };

    const overallBalance = calculateBalanceUpTo('9999-12-31');

    const handleSettleTillDateChange = (dateStr: string) => {
        const defaultAmt = calculateBalanceUpTo(dateStr);
        setSettleForm(prev => ({
            ...prev,
            settleTillDate: dateStr,
            notes: `Account Settlement up to ${dateStr}`
        }));
        setSettleAmount(String(defaultAmt));
    };

    const handleSettleAccount = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!settleForm.walletId) {
            alert('Please select a wallet.');
            return;
        }
        
        const settlementAmount = Number(settleAmount);
        if (isNaN(settlementAmount) || settlementAmount <= 0) {
            alert('Settlement amount must be greater than zero.');
            return;
        }

        setSettleIsSubmitting(true);
        const { success, error } = await addStaffAdvance({
            staff_id: id,
            amount: settlementAmount,
            date: settleForm.date,
            notes: settleForm.notes
        }, settleForm.walletId);
        setSettleIsSubmitting(false);

        if (success) {
            setIsSettleModalOpen(false);
            setSettleForm({
                walletId: '',
                date: new Date().toISOString().split('T')[0],
                settleTillDate: new Date().toISOString().split('T')[0],
                notes: `Account Settlement up to ${new Date().toISOString().split('T')[0]}`
            });
            setSettleAmount('');
            alert('Account settled successfully!');
            loadData();
            if (refreshData) {
                await refreshData();
            }
        } else {
            alert(`Failed to settle account: ${error?.message || error}`);
        }
    };

    const handleDeleteAdvance = async (advanceId: string | number) => {
        const { success, error } = await deleteStaffAdvanceAction(advanceId);
        if (success) {
            loadData();
            if (refreshData) {
                await refreshData();
            }
        } else {
            alert(`Failed to delete advance: ${error}`);
        }
    };

    const handleDeleteAttendance = async (attendanceId: string | number) => {
        const confirm = window.confirm("Are you sure you want to delete this attendance record?");
        if (!confirm) return;
        const { success, error } = await deleteAttendanceAction(attendanceId);
        if (success) {
            loadData();
        } else {
            alert(`Failed to delete attendance: ${error}`);
        }
    };

    const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

    const handleShareAttendance = async () => {
        if (!data.attendance || data.attendance.length === 0) {
            alert("No attendance records to share.");
            return;
        }

        const sortedAttendance = [...data.attendance].sort((a: any, b: any) => (a.date || '').localeCompare(b.date || ''));
        const monthName = monthNames[month];
        const title = `${staff.name} - Attendance Log (${monthName} ${year})`;
        const divider = "=".repeat(title.length);
        
        const listText = sortedAttendance.map((rec: any) => {
            const dateStr = new Date(rec.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).replace(/ /g, '-');
            return `${dateStr}: ${rec.status}`;
        }).join('\n');

        const shareContent = `${title}\n${divider}\n${listText}`;

        if (navigator.share) {
            try {
                await navigator.share({
                    title: title,
                    text: shareContent,
                });
            } catch (err: any) {
                if (err.name !== 'AbortError') {
                    try {
                        await navigator.clipboard.writeText(shareContent);
                        alert("Attendance log copied to clipboard!");
                    } catch (clipboardErr) {
                        alert("Failed to share or copy text.");
                    }
                }
            }
        } else {
            try {
                await navigator.clipboard.writeText(shareContent);
                alert("Attendance log copied to clipboard!");
            } catch (err) {
                alert("Sharing not supported, and failed to copy to clipboard.");
            }
        }
    };

    const handleSharePayments = async () => {
        if (!data.advances || data.advances.length === 0) {
            alert("No payment records to share.");
            return;
        }

        const sortedAdvances = [...data.advances].sort((a: any, b: any) => (a.date || '').localeCompare(b.date || ''));
        const monthName = monthNames[month];
        const title = `${staff.name} - Payments/Advances (${monthName} ${year})`;
        const divider = "=".repeat(title.length);

        const listText = sortedAdvances.map((rec: any) => {
            const dateStr = new Date(rec.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).replace(/ /g, '-');
            const notesStr = rec.notes ? ` - ${rec.notes}` : '';
            return `${dateStr}: ₹${rec.amount}${notesStr}`;
        }).join('\n');

        const shareContent = `${title}\n${divider}\n${listText}`;

        if (navigator.share) {
            try {
                await navigator.share({
                    title: title,
                    text: shareContent,
                });
            } catch (err: any) {
                if (err.name !== 'AbortError') {
                    try {
                        await navigator.clipboard.writeText(shareContent);
                        alert("Payments log copied to clipboard!");
                    } catch (clipboardErr) {
                        alert("Failed to share or copy text.");
                    }
                }
            }
        } else {
            try {
                await navigator.clipboard.writeText(shareContent);
                alert("Payments log copied to clipboard!");
            } catch (err) {
                alert("Sharing not supported, and failed to copy to clipboard.");
            }
        }
    };

    if (!staff) return <div className="p-10 text-center text-white">Loading staff...</div>;

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
                        {staff.status?.startsWith('Terminated') && (
                            <span className="text-xs bg-red-500/20 text-red-400 px-2.5 py-1 rounded font-bold uppercase tracking-wider">
                                Terminated
                            </span>
                        )}
                    </h1>
                    <p className="text-gray-400 text-sm">
                        {staff.role} • ₹{staff.salary}/day
                        {staff.status?.startsWith('Terminated') && (
                            <span className="text-red-400 ml-2 font-medium">
                                (Terminated on {new Date(staff.status.split(':')[1]).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })})
                            </span>
                        )}
                    </p>
                </div>
                {staff.status?.startsWith('Terminated') ? (
                    <button
                        onClick={handleReinstate}
                        className="bg-green-500/10 hover:bg-green-500/20 text-green-400 px-4 py-2 rounded-lg text-sm font-bold transition-colors"
                    >
                        Reinstate
                    </button>
                ) : (
                    <button
                        onClick={() => setIsTerminateModalOpen(true)}
                        className="bg-red-500/10 hover:bg-red-500/20 text-red-400 px-4 py-2 rounded-lg text-sm font-bold transition-colors"
                    >
                        Terminate
                    </button>
                )}
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
                        const res = await deleteStaffAction(id as string);
                        if (res.success) {
                            if (deleteStaff) deleteStaff(id); // Update context locally
                            router.push('/staff');
                            router.refresh();
                        } else {
                            alert(`Failed to delete staff: ${res.error}`);
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
                        <span>OT: {overtimeCount}</span>
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

                <div className="glass p-5 rounded-xl border border-white/5 bg-red-500/5 flex flex-col justify-between">
                    <div>
                        <div className="flex items-center gap-3 mb-2 text-red-400">
                            <Wallet size={20} />
                            <h3 className="font-bold text-sm uppercase tracking-wider">Advances/Paid</h3>
                        </div>
                        <div className="text-2xl font-bold">₹{totalAdvances.toLocaleString()}</div>
                        <p className="text-xs text-gray-500 mt-1">Balance: ₹{overallBalance.toLocaleString()}</p>
                    </div>
                    {overallBalance > 0 && (
                        <button
                            onClick={() => {
                                const todayStr = new Date().toISOString().split('T')[0];
                                setSettleForm({
                                    walletId: '',
                                    date: todayStr,
                                    settleTillDate: todayStr,
                                    notes: `Account Settlement up to ${todayStr}`
                                });
                                const defaultAmt = calculateBalanceUpTo(todayStr);
                                setSettleAmount(String(defaultAmt));
                                setIsSettleModalOpen(true);
                            }}
                            className="mt-3 w-full bg-red-500/20 hover:bg-red-500 text-red-400 hover:text-white text-xs font-bold py-2 rounded-lg transition-all text-center border border-red-500/30"
                        >
                            Settle Account
                        </button>
                    )}
                </div>
            </div>

            {/* Ledger View */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Attendance List */}
                <div className="glass p-6 rounded-xl border border-white/5">
                    <div className="flex justify-between items-center gap-2 mb-4">
                        <h3 className="text-lg font-bold flex items-center gap-2 min-w-0">
                            <CalendarIcon size={18} className="text-blue-400 flex-shrink-0" />
                            <span className="truncate">Attendance Log</span>
                        </h3>
                        <button 
                            onClick={handleShareAttendance} 
                            className="text-xs bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1 whitespace-nowrap flex-shrink-0"
                        >
                            <Share2 size={12} /> Share
                        </button>
                    </div>
                    <div className="flex flex-col gap-2 max-h-[300px] overflow-y-auto pr-2">
                        {data.attendance.length > 0 ? (
                            [...data.attendance].sort((a: any, b: any) => (a.date || '').localeCompare(b.date || '')).map((rec: any) => (
                                <div key={rec.id} className="flex justify-between items-center p-3 bg-white/5 rounded-lg text-sm group">
                                    <span>{new Date(rec.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' }).replace(/ /g, '-')}</span>
                                    <div className="flex items-center gap-3">
                                        <span className={`px-2 py-0.5 rounded text-xs font-bold ${rec.status === 'Present' ? 'bg-green-500/20 text-green-400' :
                                            rec.status === 'Absent' ? 'bg-red-500/20 text-red-400' :
                                            rec.status === 'Overtime' ? 'bg-purple-500/20 text-purple-400' :
                                                'bg-yellow-500/20 text-yellow-400'
                                            }`}>{rec.status}</span>
                                        <button 
                                            onClick={() => handleDeleteAttendance(rec.id)} 
                                            className="p-1 text-red-400 hover:bg-red-500/10 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                                            title="Delete Attendance"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                </div>
                            ))
                        ) : <div className="text-gray-500 italic text-sm">No records this month</div>}
                    </div>
                </div>

                {/* Advances/Payments List */}
                <div className="glass p-6 rounded-xl border border-white/5">
                    <div className="flex justify-between items-center gap-2 mb-4">
                        <h3 className="text-lg font-bold flex items-center gap-2 min-w-0">
                            <Wallet size={18} className="text-red-400 flex-shrink-0" />
                            <span className="truncate">Payments/Advances</span>
                        </h3>
                        <div className="flex items-center gap-2 flex-shrink-0">
                            <button 
                                onClick={handleSharePayments} 
                                className="text-xs bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1 whitespace-nowrap"
                            >
                                <Share2 size={12} /> Share
                            </button>
                            <button onClick={() => {
                                setEditingAdvanceId(null);
                                setAdvanceForm({ amount: '', date: new Date().toISOString().split('T')[0], notes: '', walletId: '' });
                                setIsAdvanceModalOpen(true);
                            }} className="text-xs bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap">
                                + Add Payment
                            </button>
                        </div>
                    </div>

                    <div className="flex flex-col gap-2 max-h-[300px] overflow-y-auto pr-2">
                        {data.advances.length > 0 ? (
                            data.advances.map((rec: any) => (
                                <div key={rec.id} className="flex justify-between items-center p-3 bg-white/5 rounded-lg text-sm group">
                                    <div>
                                        <div className="font-bold text-red-400">₹{rec.amount}</div>
                                        <div className="text-xs text-gray-500">{new Date(rec.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' }).replace(/ /g, '-')}</div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <div className="text-xs text-gray-400 max-w-[80px] truncate">{rec.notes || '-'}</div>
                                        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button onClick={() => {
                                                setEditingAdvanceId(rec.id);
                                                setAdvanceForm({ amount: String(rec.amount), date: rec.date, notes: rec.notes || '', walletId: '' });
                                                setIsAdvanceModalOpen(true);
                                            }} className="p-1.5 text-blue-400 hover:bg-blue-500/10 rounded-lg">
                                                <Pencil size={14} />
                                            </button>
                                            <button onClick={() => handleDeleteAdvance(rec.id)} className="p-1.5 text-red-400 hover:bg-red-500/10 rounded-lg">
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    </div>
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
                        <h2 className="text-xl font-bold mb-4">{editingAdvanceId ? 'Edit Payment / Advance' : 'Record Payment / Advance'}</h2>
                        <form onSubmit={handleAddAdvance} className="flex flex-col gap-4">
                            <input autoFocus type="number" placeholder="Amount (₹)" className="input-field bg-white/5 border border-white/10 rounded-lg px-4 py-3" value={advanceForm.amount} onChange={e => setAdvanceForm({ ...advanceForm, amount: e.target.value })} required />

                            {!editingAdvanceId && (
                                <div className="flex flex-col gap-1">
                                    <label className="text-xs text-gray-400 uppercase">Paid From (Optional)</label>
                                    <CustomSelect
                                        placeholder="Select Wallet (for auto-deduction)"
                                        value={advanceForm.walletId}
                                        onChange={val => setAdvanceForm({ ...advanceForm, walletId: val as string })}
                                        triggerClassName="input-field bg-white/5 border border-white/10 rounded-lg px-4 py-3"
                                        options={[
                                            { value: "", label: "Select Wallet (for auto-deduction)" },
                                            ...(wallets || []).map((w: any) => ({
                                                value: w.id,
                                                label: `${w.name} (₹${w.balance})`
                                            }))
                                        ]}
                                    />
                                </div>
                            )}

                            <input type="date" className="input-field bg-white/5 border border-white/10 rounded-lg px-4 py-3 [color-scheme:dark]" value={advanceForm.date} onChange={e => setAdvanceForm({ ...advanceForm, date: e.target.value })} />

                            <textarea placeholder="Notes (e.g. Salary Advance, Petrol)" className="input-field bg-white/5 border border-white/10 rounded-lg px-4 py-3 h-24 resize-none" value={advanceForm.notes} onChange={e => setAdvanceForm({ ...advanceForm, notes: e.target.value })} />

                            <div className="flex gap-3 mt-4">
                                <button type="button" onClick={() => setIsAdvanceModalOpen(false)} className="flex-1 py-3 text-gray-400 hover:text-white transition-colors">Cancel</button>
                                <button type="submit" className="flex-1 bg-[var(--accent)] text-black font-bold rounded-lg py-3 hover:opacity-90 transition-opacity">
                                    {editingAdvanceId ? 'Save Changes' : 'Record'}
                                </button>
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

                            <CustomSelect
                                value={editForm.role}
                                onChange={val => setEditForm({ ...editForm, role: val as string })}
                                triggerClassName="input-field bg-white/5 border border-white/10 rounded-lg px-4 py-3"
                                options={[
                                    { value: "Helper", label: "Helper" },
                                    { value: "Welder", label: "Welder" },
                                    { value: "Fitter", label: "Fitter" },
                                    { value: "Supervisor", label: "Supervisor" },
                                    { value: "Driver", label: "Driver" }
                                ]}
                            />

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
            {isTerminateModalOpen && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-[#0a0a0a] border border-white/10 p-6 rounded-2xl w-full max-w-md shadow-2xl">
                        <h2 className="text-xl font-bold mb-2">Terminate Employee</h2>
                        <p className="text-gray-400 text-sm mb-4">Please select the termination date for <strong>{staff.name}</strong>.</p>
                        <form onSubmit={handleTerminate} className="flex flex-col gap-4">
                            <div className="flex flex-col gap-1">
                                <label className="text-xs text-gray-400 uppercase">Termination Date</label>
                                <input 
                                    type="date" 
                                    className="input-field bg-white/5 border border-white/10 rounded-lg px-4 py-3 [color-scheme:dark]" 
                                    value={terminationDate} 
                                    onChange={e => setTerminationDate(e.target.value)} 
                                    required 
                                />
                            </div>

                            <div className="flex gap-3 mt-4">
                                <button type="button" onClick={() => setIsTerminateModalOpen(false)} className="flex-1 py-3 text-gray-400 hover:text-white transition-colors">Cancel</button>
                                <button type="submit" className="flex-1 bg-red-600 text-white font-bold rounded-lg py-3 hover:bg-red-700 transition-colors">
                                    Confirm Termination
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {isSettleModalOpen && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-[#0a0a0a] border border-white/10 p-6 rounded-2xl w-full max-w-md shadow-2xl">
                        <h2 className="text-xl font-bold mb-2 text-white">Settle Staff Account</h2>
                        <p className="text-gray-400 text-sm mb-4">
                            Record settlement payment to <strong>{staff.name}</strong>. Default balance up to selected date is <strong>₹{calculateBalanceUpTo(settleForm.settleTillDate).toLocaleString()}</strong>.
                        </p>
                        <form onSubmit={handleSettleAccount} className="flex flex-col gap-4 text-white">
                            <div className="flex flex-col gap-1 text-left">
                                <label className="text-xs text-gray-400 uppercase">Paid From (Wallet)</label>
                                <CustomSelect
                                    placeholder="Select Wallet"
                                    value={settleForm.walletId}
                                    onChange={val => setSettleForm({ ...settleForm, walletId: val as string })}
                                    triggerClassName="input-field bg-white/5 border border-white/10 rounded-lg px-4 py-3"
                                    options={[
                                        { value: "", label: "Select Wallet" },
                                        ...(wallets || []).map((w: any) => ({
                                            value: w.id,
                                            label: `${w.name} (₹${w.balance})`
                                        }))
                                    ]}
                                />
                            </div>

                            <div className="flex flex-col gap-1 text-left">
                                <label className="text-xs text-gray-400 uppercase">Amount (₹)</label>
                                <input
                                    type="number"
                                    className="input-field bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-[var(--accent)]"
                                    value={settleAmount}
                                    onChange={e => setSettleAmount(e.target.value)}
                                    required
                                />
                            </div>

                            <div className="flex flex-col gap-1 text-left">
                                <label className="text-xs text-gray-400 uppercase">Settle Till Date</label>
                                <input
                                    type="date"
                                    className="input-field bg-white/5 border border-white/10 rounded-lg px-4 py-3 [color-scheme:dark]"
                                    value={settleForm.settleTillDate}
                                    onChange={e => handleSettleTillDateChange(e.target.value)}
                                    required
                                />
                            </div>

                            <div className="flex flex-col gap-1 text-left">
                                <label className="text-xs text-gray-400 uppercase">Payment Date</label>
                                <input
                                    type="date"
                                    className="input-field bg-white/5 border border-white/10 rounded-lg px-4 py-3 [color-scheme:dark]"
                                    value={settleForm.date}
                                    onChange={e => setSettleForm({ ...settleForm, date: e.target.value })}
                                    required
                                />
                            </div>

                            <div className="flex flex-col gap-1 text-left">
                                <label className="text-xs text-gray-400 uppercase">Notes</label>
                                <textarea
                                    className="input-field bg-white/5 border border-white/10 rounded-lg px-4 py-3 h-20 resize-none text-white"
                                    value={settleForm.notes}
                                    onChange={e => setSettleForm({ ...settleForm, notes: e.target.value })}
                                />
                            </div>

                            <div className="flex gap-3 mt-4">
                                <button
                                    type="button"
                                    onClick={() => setIsSettleModalOpen(false)}
                                    className="flex-1 py-3 text-gray-400 hover:text-white transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={settleIsSubmitting}
                                    className="flex-1 bg-[var(--accent)] text-black font-bold rounded-lg py-3 hover:opacity-90 transition-opacity"
                                >
                                    {settleIsSubmitting ? 'Settling...' : 'Confirm Settlement'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
