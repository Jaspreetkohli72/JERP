"use client";
import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useFinance } from '@/context/FinanceContext';
import { ArrowLeft, Wallet, Calendar as CalendarIcon, Save, Trash2, Pencil, LogIn, LogOut, Clock } from 'lucide-react';
import Link from 'next/link';
import CustomSelect from '@/components/CustomSelect';
import { supabase } from '@/lib/supabase';
import { updateStaffAction, deleteStaffAction, updateStaffAdvanceAction, deleteStaffAdvanceAction, deleteAttendanceAction, updateAttendanceRecordAction, getStaffTodayPunchStatus, getStaffProfileBundle, punchStaffAction } from '@/app/actions/staff';

export default function StaffDetailsPage() {
    const { id } = useParams();
    const router = useRouter();
    // @ts-ignore
    const { staffList, getStaffDetails, addStaffAdvance, deleteStaff, updateStaff, settings, wallets, refreshData, deleteAttendance, attendance: globalAttendance, allStaffAdvances: globalAdvances } = useFinance();

    // State
    const [staff, setStaff] = useState<any>(null);
    const [notFound, setNotFound] = useState(false);
    const [punchStatus, setPunchStatus] = useState<{ clockedIn: boolean; since: string | null }>({ clockedIn: false, since: null });
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

    const [isPunching, setIsPunching] = useState(false);
    const [punchingAction, setPunchingAction] = useState<'IN' | 'OUT' | null>(null);

    const handlePunch = async (action: 'IN' | 'OUT') => {
        if (!id || isPunching) return;
        setIsPunching(true);
        setPunchingAction(action);
        try {
            const res = await punchStaffAction(id as string, action);
            if (res.success) {
                setPunchStatus({ clockedIn: !!res.clockedIn, since: res.since || null });
                await loadData();
                if (refreshData) await refreshData();
                router.refresh();
            } else {
                alert(res.error || `Failed to clock ${action.toLowerCase()}`);
            }
        } catch (err: any) {
            alert(`Error recording clock ${action.toLowerCase()}: ${err.message || err}`);
        } finally {
            setIsPunching(false);
            setPunchingAction(null);
        }
    };

    const handleTerminate = async (e: React.FormEvent) => {
        e.preventDefault();
        const statusVal = `Terminated:${terminationDate}`;
        const res = await updateStaffAction(id as string, { status: statusVal });
        if (res.success) {
            setIsTerminateModalOpen(false);
            setStaff((prev: any) => ({ ...prev, status: statusVal }));
            if (refreshData) await refreshData();
            router.refresh();
        } else {
            alert(`Failed to terminate employee: ${res.error}`);
        }
    };

    // Edit Attendance State & Handlers
    const [editingAttendance, setEditingAttendance] = useState<any | null>(null);
    const [editAttForm, setEditAttForm] = useState({
        worked_for: 'Me',
        status: 'Present',
        status_papa: 'Absent',
        ot_mult: '1.5',
        ot_mult_papa: '1.5',
        punch_in_time: '',
        punch_out_time: '',
        punch_in_display: '',
        punch_out_display: '',
        raw_punch_in: '',
        raw_punch_out: '',
        work_done: '',
    });
    const [editAttSubmitting, setEditAttSubmitting] = useState(false);

    const getIstTimeInput = (ts?: string) => {
        if (!ts) return '';
        try {
            const d = new Date(ts);
            const parts = new Intl.DateTimeFormat('en-GB', {
                timeZone: 'Asia/Kolkata',
                hour: '2-digit',
                minute: '2-digit',
                hour12: false
            }).formatToParts(d);
            const hour = parts.find(p => p.type === 'hour')?.value || '00';
            const minute = parts.find(p => p.type === 'minute')?.value || '00';
            return `${hour}:${minute}`;
        } catch {
            return '';
        }
    };

    const formatPunchTime = (ts?: string) => {
        if (!ts) return '';
        try {
            return new Intl.DateTimeFormat('en-US', {
                timeZone: 'Asia/Kolkata',
                hour: '2-digit',
                minute: '2-digit',
                hour12: true
            }).format(new Date(ts));
        } catch {
            return '';
        }
    };

    const parseTimeToIso = (timeStr: string, dateStr: string): string | null => {
        if (!timeStr || !timeStr.trim()) return null;
        const trimmed = timeStr.trim();
        if (trimmed.includes('T')) return trimmed;

        const match = trimmed.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM)?$/i);
        if (!match) return null;

        let hours = parseInt(match[1], 10);
        const minutes = parseInt(match[2], 10);
        const ampm = match[4]?.toUpperCase();

        if (ampm === 'PM' && hours < 12) hours += 12;
        if (ampm === 'AM' && hours === 12) hours = 0;

        const pad = (n: number) => String(n).padStart(2, '0');
        return `${dateStr}T${pad(hours)}:${pad(minutes)}:00+05:30`;
    };

    const calculateAttendanceFromTimes = (inTime: string, outTime: string, currentStatus?: string): string => {
        if (!inTime) return currentStatus || 'Absent';
        if (!outTime) {
            if (currentStatus === 'Overtime') return 'Overtime';
            return 'Present';
        }
        const [inH, inM] = inTime.split(':').map(Number);
        const [outH, outM] = outTime.split(':').map(Number);
        let diffMinutes = (outH * 60 + outM) - (inH * 60 + inM);
        if (diffMinutes < 0) diffMinutes += 24 * 60;
        const hours = diffMinutes / 60;

        if (hours < 4.0) return 'Absent';
        if (hours < 6.0) return 'Half-Day';
        if (hours <= 10.0) return 'Present';
        return 'Overtime';
    };

    const handleOpenEditAttendance = (rec: any) => {
        const rawWorkDone = rec.work_done || '';
        const withoutPunches = rawWorkDone
            .replace(/🕒?\s*In:\s*\d{1,2}:\d{2}\s*(?:AM|PM)?(?:\s*\|\s*Out:\s*\d{1,2}:\d{2}\s*(?:AM|PM)?)?/gi, '')
            .trim();
        const has2xTag = /\[2x\s*OT\]|\[OT:2\]|\[2x\]|\(2x\s*OT\)/i.test(withoutPunches);
        const cleanWork = withoutPunches.replace(/\[2x\s*OT\]\s*/gi, '').replace(/\[1\.5x\s*OT\]\s*/gi, '').trim();

        const rawStatus = rec.status || 'Present';
        const rawStatusPapa = rec.status_papa || 'Absent';

        let inIso = rec.punch_in || '';
        let outIso = rec.punch_out || '';
        if (!inIso && rawWorkDone) {
            const inMatch = rawWorkDone.match(/In:\s*(\d{1,2}:\d{2}\s*(?:AM|PM)?)/i);
            if (inMatch) inIso = parseTimeToIso(inMatch[1], rec.date) || '';
        }
        if (!outIso && rawWorkDone) {
            const outMatch = rawWorkDone.match(/Out:\s*(\d{1,2}:\d{2}\s*(?:AM|PM)?)/i);
            if (outMatch) outIso = parseTimeToIso(outMatch[1], rec.date) || '';
        }

        setEditingAttendance(rec);
        setEditAttForm({
            worked_for: rec.worked_for || 'Me',
            status: rawStatus.startsWith('Overtime') ? 'Overtime' : rawStatus,
            status_papa: rawStatusPapa.startsWith('Overtime') ? 'Overtime' : rawStatusPapa,
            ot_mult: (rawStatus.includes('2') || has2xTag) ? '2' : '1.5',
            ot_mult_papa: (rawStatusPapa.includes('2') || has2xTag) ? '2' : '1.5',
            punch_in_time: inIso ? getIstTimeInput(inIso) : '',
            punch_out_time: outIso ? getIstTimeInput(outIso) : '',
            punch_in_display: formatPunchTime(inIso),
            punch_out_display: formatPunchTime(outIso),
            raw_punch_in: inIso,
            raw_punch_out: outIso,
            work_done: cleanWork
        });
    };

    const handleSaveEditAttendance = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingAttendance || editAttSubmitting) return;
        setEditAttSubmitting(true);

        try {
            const finalStatus = editAttForm.worked_for === 'Papa' ? 'Absent' : editAttForm.status;
            const finalStatusPapa = editAttForm.worked_for === 'Me' ? 'Absent' : editAttForm.status_papa;

            let finalWorkDone = editAttForm.work_done.trim();
            const is2xMe = (editAttForm.worked_for === 'Me' || editAttForm.worked_for === 'Both') && finalStatus === 'Overtime' && editAttForm.ot_mult === '2';
            const is2xPapa = (editAttForm.worked_for === 'Papa' || editAttForm.worked_for === 'Both') && finalStatusPapa === 'Overtime' && editAttForm.ot_mult_papa === '2';

            if (is2xMe || is2xPapa) {
                finalWorkDone = finalWorkDone ? `[2x OT] ${finalWorkDone}` : '[2x OT]';
            }

            const dateStr = editingAttendance.date;
            let finalPunchIn: string | null = editAttForm.raw_punch_in || null;
            if (editAttForm.punch_in_time) {
                finalPunchIn = `${dateStr}T${editAttForm.punch_in_time}:00+05:30`;
            } else if (editAttForm.punch_in_time === '') {
                finalPunchIn = null;
            }

            let finalPunchOut: string | null = editAttForm.raw_punch_out || null;
            if (editAttForm.punch_out_time) {
                finalPunchOut = `${dateStr}T${editAttForm.punch_out_time}:00+05:30`;
            } else if (editAttForm.punch_out_time === '') {
                finalPunchOut = null;
            }

            const res = await updateAttendanceRecordAction(editingAttendance.id, {
                status: finalStatus,
                worked_for: editAttForm.worked_for,
                work_done: finalWorkDone,
                status_papa: finalStatusPapa,
                punch_in: finalPunchIn,
                punch_out: finalPunchOut
            });

            if (res.success) {
                setEditingAttendance(null);
                await loadData();
                if (refreshData) await refreshData();
                getStaffTodayPunchStatus(id as string).then(setPunchStatus);
                router.refresh();
            } else {
                alert(`Failed to update attendance: ${res.error}`);
            }
        } catch (err: any) {
            alert(`Error updating attendance: ${err.message || err}`);
        } finally {
            setEditAttSubmitting(false);
        }
    };

    const handleReinstate = async () => {
        const confirm = window.confirm("Are you sure you want to reinstate this employee?");
        if (!confirm) return;
        const res = await updateStaffAction(id as string, { status: 'Available' });
        if (res.success) {
            setStaff((prev: any) => ({ ...prev, status: 'Available' }));
            if (refreshData) await refreshData();
            router.refresh();
        } else {
            alert(`Failed to reinstate employee: ${res.error}`);
        }
    };

    const handleToggleLeave = async () => {
        const isOnLeave = staff?.status?.startsWith('On Leave');
        const newStatus = isOnLeave ? 'Available' : 'On Leave';
        setStaff((prev: any) => ({ ...prev, status: newStatus }));
        const res = await updateStaffAction(id as string, { status: newStatus });
        if (res.success) {
            if (updateStaff) updateStaff(id, { status: newStatus });
            if (refreshData) await refreshData();
            router.refresh();
        } else {
            alert(`Failed to update leave status: ${res.error}`);
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

    // 1. Instant cache populate from FinanceContext if available (0ms)
    useEffect(() => {
        if (!id) return;
        if (staffList && staffList.length > 0) {
            const found = staffList.find((s: any) => String(s.id) === String(id));
            if (found) {
                setStaff(found);
                setNotFound(false);
            }
        }
        if (globalAttendance && globalAttendance.length > 0) {
            const startDate = `${year}-${String(month + 1).padStart(2, '0')}-01`;
            const lastDay = new Date(year, month + 1, 0).getDate();
            const endDate = `${year}-${String(month + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

            const matchedAtt = globalAttendance.filter((a: any) =>
                String(a.staff_id) === String(id) && a.date >= startDate && a.date <= endDate
            );
            const matchedAdv = (globalAdvances || []).filter((a: any) =>
                String(a.staff_id) === String(id)
            );
            if (matchedAtt.length > 0 || matchedAdv.length > 0) {
                setData({ attendance: matchedAtt, advances: matchedAdv });
            }
        }
    }, [id, month, year, staffList, globalAttendance, globalAdvances]);

    // 2. Fast unified server bundle fetch (<200ms)
    const loadData = async () => {
        if (!id) return;
        setLoading(true);

        try {
            const bundle = await getStaffProfileBundle(id as string, month, year);
            if (bundle.success) {
                if (bundle.staff) {
                    setStaff(bundle.staff);
                    setNotFound(false);
                } else if (bundle.notFound) {
                    setNotFound(true);
                }
                setData({
                    attendance: bundle.attendance || [],
                    advances: bundle.advances || []
                });
                if (bundle.punchStatus) {
                    setPunchStatus(bundle.punchStatus);
                }
            } else {
                console.warn('[Staff Details] Bundle load warning:', bundle.error);
            }
        } catch (err) {
            console.warn('[Staff Details] Details load warning:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (id) {
            loadData();
        }
    }, [id, month, year]);

    const formatDateFriendly = (dateStr: string) => {
        if (!dateStr) return '';
        const parts = dateStr.split('-');
        if (parts.length !== 3) return dateStr;
        const [y, m, d] = parts;
        const monthNamesShort = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        return `${d}-${monthNamesShort[parseInt(m) - 1]}-${y}`;
    };

    // Find the latest settlement info
    const latestSettlementInfo = (() => {
        let latestSettleDate = '';
        let paymentDate = '';
        data.advances.forEach((adv: any) => {
            if (adv.notes) {
                const match = adv.notes.match(/Account Settlement up to\s*:?\s*(\d{4}-\d{2}-\d{2})/i);
                if (match) {
                    const dateStr = match[1];
                    if (dateStr > latestSettleDate) {
                        latestSettleDate = dateStr;
                        paymentDate = adv.date;
                    }
                }
            }
        });
        return { settleDate: latestSettleDate, paymentDate };
    })();

    // Filter advances to exclude those on/before latestSettlementInfo.paymentDate and any settlement entries
    const activeAdvancesForSum = data.advances.filter((adv: any) => {
        const isSettlement = adv.notes && /Account Settlement up to/i.test(adv.notes);
        if (isSettlement) return false;
        if (latestSettlementInfo.paymentDate && adv.date <= latestSettlementInfo.paymentDate) return false;
        return true;
    });

    const is2xOvertime = (status?: string | null, workDone?: string | null) => {
        if (status && status.includes('2')) return true;
        if (workDone && /\[2x\s*OT\]|\[OT:2\]|\[2x\]|\(2x\s*OT\)/i.test(workDone)) return true;
        return false;
    };

    const getStatusMultiplier = (status?: string | null, workDone?: string | null) => {
        if (!status) return 0;
        if (status === 'Present') return 1.0;
        if (status === 'Half-Day' || status === 'Half Day') return 0.5;
        if (status === 'Overtime' || status.startsWith('Overtime')) {
            return is2xOvertime(status, workDone) ? 2.0 : 1.5;
        }
        return 0;
    };

    // Stats Logic (Me)
    const presentCount = data.attendance.filter((a: any) => a.status === 'Present' && (a.worked_for === 'Me' || a.worked_for === 'Both' || !a.worked_for)).length;
    const halfDayCount = data.attendance.filter((a: any) => (a.status === 'Half-Day' || a.status === 'Half Day') && (a.worked_for === 'Me' || a.worked_for === 'Both' || !a.worked_for)).length;
    const overtimeCount = data.attendance.filter((a: any) => (a.status === 'Overtime' || a.status?.startsWith('Overtime')) && (a.worked_for === 'Me' || a.worked_for === 'Both' || !a.worked_for)).length;
    const salaryDaysMe = data.attendance.reduce((sum: number, a: any) => {
        if (a.worked_for === 'Me' || a.worked_for === 'Both' || !a.worked_for) {
            return sum + getStatusMultiplier(a.status, a.work_done);
        }
        return sum;
    }, 0);

    // Papa Stats
    const presentPapa = data.attendance.filter((a: any) => a.status_papa === 'Present' && (a.worked_for === 'Papa' || a.worked_for === 'Both')).length;
    const halfDayPapa = data.attendance.filter((a: any) => (a.status_papa === 'Half-Day' || a.status_papa === 'Half Day') && (a.worked_for === 'Papa' || a.worked_for === 'Both')).length;
    const overtimePapa = data.attendance.filter((a: any) => (a.status_papa === 'Overtime' || a.status_papa?.startsWith('Overtime')) && (a.worked_for === 'Papa' || a.worked_for === 'Both')).length;
    const salaryDaysPapa = data.attendance.reduce((sum: number, a: any) => {
        if (a.worked_for === 'Papa' || a.worked_for === 'Both') {
            return sum + getStatusMultiplier(a.status_papa, a.work_done);
        }
        return sum;
    }, 0);

    const totalAttendanceDays = salaryDaysMe + salaryDaysPapa;
    const salaryDays = totalAttendanceDays;
    const estimatedEarnings = staff ? salaryDays * staff.salary : 0;
    const totalAdvances = activeAdvancesForSum.reduce((sum, a: any) => sum + Number(a.amount), 0);
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
                if (refreshData) await refreshData();
                await loadData();
                router.refresh();
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
                if (refreshData) await refreshData();
                await loadData();
                router.refresh();
            }
        }
    };

    const calculateBalanceUpTo = (dateStr: string) => {
        if (!staff) return 0;

        const attList = data.attendance && data.attendance.length > 0 ? data.attendance : (globalAttendance || []);
        const advList = globalAdvances && globalAdvances.length > 0 ? globalAdvances : data.advances;

        // Find latest settlement date and payment date from advList
        let latestSettleDate = '';
        let paymentDate = '';
        advList.forEach((adv: any) => {
            if (String(adv.staff_id) === String(id) && adv.notes) {
                const match = adv.notes.match(/Account Settlement up to\s*:?\s*(\d{4}-\d{2}-\d{2})/i);
                if (match) {
                    const dStr = match[1];
                    if (dStr > latestSettleDate) {
                        latestSettleDate = dStr;
                        paymentDate = adv.date;
                    }
                }
            }
        });

        const staffAtt = attList.filter((a: any) =>
            String(a.staff_id) === String(id) &&
            a.date && a.date <= dateStr &&
            (!paymentDate || a.date > paymentDate)
        );

        const salDays = staffAtt.reduce((sum: number, a: any) => {
            let days = 0;
            if (a.worked_for === 'Me' || a.worked_for === 'Both' || !a.worked_for) {
                days += getStatusMultiplier(a.status, a.work_done);
            }
            if (a.worked_for === 'Papa' || a.worked_for === 'Both') {
                days += getStatusMultiplier(a.status_papa, a.work_done);
            }
            return sum + days;
        }, 0);

        const earnings = salDays * (Number(staff.salary) || 0);

        // Advances
        const staffAdv = advList.filter((a: any) =>
            String(a.staff_id) === String(id) &&
            (!paymentDate || a.date > paymentDate) &&
            !(a.notes && /Account Settlement up to/i.test(a.notes))
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
        const confirm = window.confirm("Are you sure you want to delete this payment/advance entry?");
        if (!confirm) return;

        const { success, error } = await deleteStaffAdvanceAction(advanceId);
        if (success) {
            if (refreshData) await refreshData();
            await loadData();
            router.refresh();
        } else {
            alert(`Failed to delete advance: ${error}`);
        }
    };

    const handleDeleteAttendance = async (attendanceId: string | number) => {
        const confirm = window.confirm("Are you sure you want to delete this attendance record?");
        if (!confirm) return;

        // Optimistically update local attendance log state
        setData(prev => ({
            ...prev,
            attendance: prev.attendance.filter((a: any) => String(a.id) !== String(attendanceId))
        }));

        const res = await deleteAttendanceAction(attendanceId);

        if (res.success) {
            if (deleteAttendance) deleteAttendance(attendanceId);
            if (refreshData) await refreshData();
            await loadData();
            getStaffTodayPunchStatus(id as string).then(setPunchStatus);
            router.refresh();
        } else {
            alert(`Failed to delete attendance: ${res.error?.message || res.error}`);
            await loadData();
        }
    };

    if (notFound) {
        return (
            <div className="flex flex-col items-center justify-center p-12 text-center text-white max-w-md mx-auto min-h-[50vh]">
                <h2 className="text-2xl font-bold mb-2">Staff Member Not Found</h2>
                <p className="text-gray-400 text-sm mb-6">
                    No staff member found with ID <span className="text-red-400 font-mono font-bold">#{id}</span>. This record may have been deleted or created under a different ID.
                </p>
                <Link href="/staff" className="bg-[var(--accent)] text-black px-6 py-2.5 rounded-xl font-bold hover:opacity-90 transition-opacity">
                    Return to Staff List
                </Link>
            </div>
        );
    }

    if (!staff) {
        return (
            <div className="flex flex-col items-center justify-center p-12 text-center text-white min-h-[50vh]">
                <div className="w-8 h-8 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin mb-3"></div>
                <p className="text-gray-400 text-sm">Loading staff profile...</p>
            </div>
        );
    }

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
                        {staff.status?.startsWith('Terminated') && (
                            <span className="text-xs bg-red-500/20 text-red-400 px-2.5 py-1 rounded font-bold uppercase tracking-wider">
                                Terminated
                            </span>
                        )}
                        {staff.status?.startsWith('On Leave') && (
                            <span className="text-xs bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 px-2.5 py-1 rounded font-bold uppercase tracking-wider">
                                On Leave
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
                        {staff.status?.startsWith('On Leave') && (
                            <span className="text-yellow-400 ml-2 font-medium">
                                (Currently On Leave)
                            </span>
                        )}
                    </p>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                        {punchStatus.clockedIn ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-mono font-medium bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                                <span className="relative flex h-2 w-2">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                                </span>
                                Clocked IN {punchStatus.since ? `since ${punchStatus.since}` : ''}
                            </span>
                        ) : (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-mono font-medium bg-white/5 text-gray-400 border border-white/10">
                                <span className="h-1.5 w-1.5 rounded-full bg-gray-500"></span>
                                Clocked OUT
                            </span>
                        )}

                        {/* Clock In / Out Buttons */}
                        <div className="flex items-center gap-1.5">
                            <button
                                type="button"
                                onClick={() => handlePunch('IN')}
                                disabled={isPunching || punchStatus.clockedIn || staff.status?.startsWith('Terminated') || staff.status?.startsWith('On Leave')}
                                className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${punchStatus.clockedIn || staff.status?.startsWith('Terminated') || staff.status?.startsWith('On Leave')
                                    ? 'opacity-30 cursor-not-allowed bg-white/5 text-gray-500 border border-white/5'
                                    : 'bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 border border-emerald-500/30 cursor-pointer active:scale-95'
                                    }`}
                                title={punchStatus.clockedIn ? 'Staff is already clocked in' : 'Record Clock In'}
                            >
                                <LogIn size={13} />
                                {isPunching && punchingAction === 'IN' ? 'Clocking In...' : 'Clock In'}
                            </button>

                            <button
                                type="button"
                                onClick={() => handlePunch('OUT')}
                                disabled={isPunching || !punchStatus.clockedIn || staff.status?.startsWith('Terminated') || staff.status?.startsWith('On Leave')}
                                className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${!punchStatus.clockedIn || staff.status?.startsWith('Terminated') || staff.status?.startsWith('On Leave')
                                    ? 'opacity-30 cursor-not-allowed bg-white/5 text-gray-500 border border-white/5'
                                    : 'bg-red-500/15 hover:bg-red-500/25 text-red-400 border border-red-500/30 cursor-pointer active:scale-95'
                                    }`}
                                title={!punchStatus.clockedIn ? 'Staff is not clocked in' : 'Record Clock Out'}
                            >
                                <LogOut size={13} />
                                {isPunching && punchingAction === 'OUT' ? 'Clocking Out...' : 'Clock Out'}
                            </button>
                        </div>
                    </div>
                </div>
                <button
                    onClick={handleToggleLeave}
                    className={
                        staff.status?.startsWith('On Leave')
                            ? "bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-300 px-4 py-2 rounded-lg text-sm font-bold transition-colors border border-yellow-500/30"
                            : "bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-400 px-4 py-2 rounded-lg text-sm font-bold transition-colors"
                    }
                >
                    {staff.status?.startsWith('On Leave') ? 'End Leave' : 'On Leave'}
                </button>
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
                    <div className="text-2xl font-bold">{totalAttendanceDays} Days</div>
                    <div className="flex flex-col gap-1 text-[11px] text-gray-500 mt-2">
                        <div>Me: P: {presentCount} HD: {halfDayCount} OT: {overtimeCount}</div>
                        <div>Papa: P: {presentPapa} HD: {halfDayPapa} OT: {overtimePapa}</div>
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
                        <p className="text-xs text-gray-500 mt-1">Balance: ₹{balance.toLocaleString()}</p>
                        {latestSettlementInfo.settleDate && (
                            <div className="text-[10px] text-gray-500 mt-2 flex flex-col gap-0.5 border-t border-white/5 pt-2">
                                <div>Last Settled: <strong className="text-gray-400">{formatDateFriendly(latestSettlementInfo.paymentDate)}</strong></div>
                                <div>Settled Till: <strong className="text-gray-400">{formatDateFriendly(latestSettlementInfo.settleDate)}</strong></div>
                            </div>
                        )}
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
                    <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                        <CalendarIcon size={18} className="text-blue-400" /> Attendance Log
                    </h3>
                    <div className="flex flex-col gap-2 max-h-[300px] overflow-y-auto pr-2">
                        {data.attendance.length > 0 ? (
                            [...data.attendance].sort((a: any, b: any) => (a.date || '').localeCompare(b.date || '')).map((rec: any) => (
                                <div key={rec.id} className="flex justify-between items-center p-3 bg-white/5 rounded-lg text-sm group">
                                    {(() => {
                                        const cleanWork = (rec.work_done || '').replace(/\[2x\s*OT\]\s*/gi, '').replace(/\[1\.5x\s*OT\]\s*/gi, '').trim();
                                        const isPunchString = /^🕒\s*In:/i.test(cleanWork);
                                        const manualNotes = isPunchString ? '' : cleanWork;
                                        const is2x = is2xOvertime(rec.status, rec.work_done) || is2xOvertime(rec.status_papa, rec.work_done);
                                        const otLabel = is2x ? 'Overtime (2)' : 'Overtime (1.5)';

                                        return (
                                            <>
                                                <div className="flex flex-col flex-1 min-w-0 mr-4">
                                                    <span className="font-semibold">{new Date(rec.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' }).replace(/ /g, '-')}</span>
                                                    <span className="text-xs text-gray-400 mt-0.5">
                                                        Worked for: <strong className="text-white">{rec.worked_for || 'Me'}</strong>
                                                    </span>
                                                    {(() => {
                                                        const formatTime = (ts?: string) => {
                                                            if (!ts) return '';
                                                            try {
                                                                return new Intl.DateTimeFormat('en-US', {
                                                                    timeZone: 'Asia/Kolkata',
                                                                    hour: '2-digit',
                                                                    minute: '2-digit',
                                                                    hour12: true
                                                                }).format(new Date(ts));
                                                            } catch { return ''; }
                                                        };
                                                        const inT = formatTime(rec.punch_in) || (rec.work_done?.match(/In:\s*(\d{1,2}:\d{2}\s*(?:AM|PM))/i)?.[1]);
                                                        const outT = formatTime(rec.punch_out) || (rec.work_done?.match(/Out:\s*(\d{1,2}:\d{2}\s*(?:AM|PM))/i)?.[1]);
                                                        if (!inT && !outT) return null;
                                                        return (
                                                            <span className="text-[11px] font-mono text-emerald-400 mt-0.5 font-medium">
                                                                🕒 In: {inT || '--'} | Out: {outT || 'Working'}
                                                            </span>
                                                        );
                                                    })()}
                                                    {manualNotes && (
                                                        <span className="text-xs text-gray-500 italic mt-0.5 break-words" title={manualNotes}>
                                                            "{manualNotes}"
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-3 flex-shrink-0">
                                                    <div className="flex flex-col gap-1 items-end">
                                                        {/* Me's Status */}
                                                        {(rec.worked_for === 'Me' || rec.worked_for === 'Both' || !rec.worked_for) && (
                                                            <div className="flex items-center gap-1.5">
                                                                {rec.worked_for === 'Both' && <span className="text-[10px] text-gray-500 uppercase font-medium">Me:</span>}
                                                                <span className={`px-2 py-0.5 rounded text-xs font-bold ${rec.status === 'Present' ? 'bg-green-500/20 text-green-400' :
                                                                    rec.status === 'Absent' ? 'bg-red-500/20 text-red-400' :
                                                                        (rec.status === 'Overtime' || rec.status?.startsWith('Overtime')) ? 'bg-purple-500/20 text-purple-400' :
                                                                            'bg-yellow-500/20 text-yellow-400'
                                                                    }`}>{rec.status?.startsWith('Overtime') ? otLabel : rec.status}</span>
                                                            </div>
                                                        )}
                                                        {/* Papa's Status */}
                                                        {(rec.worked_for === 'Papa' || rec.worked_for === 'Both') && (
                                                            <div className="flex items-center gap-1.5">
                                                                {rec.worked_for === 'Both' && <span className="text-[10px] text-gray-500 uppercase font-medium">Papa:</span>}
                                                                <span className={`px-2 py-0.5 rounded text-xs font-bold ${rec.status_papa === 'Present' ? 'bg-blue-500/20 text-blue-400' :
                                                                    rec.status_papa === 'Absent' ? 'bg-red-500/20 text-red-400' :
                                                                        (rec.status_papa === 'Overtime' || rec.status_papa?.startsWith('Overtime')) ? 'bg-purple-500/20 text-purple-400' :
                                                                            'bg-yellow-500/20 text-yellow-400'
                                                                    }`}>{rec.status_papa?.startsWith('Overtime') ? otLabel : (rec.status_papa || 'Present')}</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div className="flex items-center gap-1 ml-1">
                                                        <button
                                                            onClick={() => handleOpenEditAttendance(rec)}
                                                            className="p-1.5 text-blue-400 hover:text-blue-300 hover:bg-blue-500/20 rounded transition-colors flex items-center justify-center cursor-pointer"
                                                            title="Edit Attendance"
                                                        >
                                                            <Pencil size={15} />
                                                        </button>
                                                        <button
                                                            onClick={() => handleDeleteAttendance(rec.id)}
                                                            className="p-1.5 text-red-400 hover:text-red-300 hover:bg-red-500/20 rounded transition-colors flex items-center justify-center cursor-pointer"
                                                            title="Delete Attendance"
                                                        >
                                                            <Trash2 size={15} />
                                                        </button>
                                                    </div>
                                                </div>
                                            </>
                                        );
                                    })()}
                                </div>
                            ))
                        ) : loading ? (
                            <div className="flex flex-col gap-2">
                                {[1, 2, 3].map(i => (
                                    <div key={i} className="animate-pulse flex items-center justify-between p-3 bg-white/5 rounded-lg">
                                        <div className="flex flex-col gap-1.5">
                                            <div className="h-3.5 bg-white/10 rounded w-24"></div>
                                            <div className="h-2.5 bg-white/5 rounded w-16"></div>
                                        </div>
                                        <div className="h-5 bg-white/10 rounded w-16"></div>
                                    </div>
                                ))}
                            </div>
                        ) : <div className="text-gray-500 italic text-sm">No records this month</div>}
                    </div>
                </div>

                {/* Advances/Payments List */}
                <div className="glass p-6 rounded-xl border border-white/5">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-bold flex items-center gap-2">
                            <Wallet size={18} className="text-red-400" /> Payments/Advances
                        </h3>
                        <button onClick={() => {
                            setEditingAdvanceId(null);
                            setAdvanceForm({ amount: '', date: new Date().toISOString().split('T')[0], notes: '', walletId: '' });
                            setIsAdvanceModalOpen(true);
                        }} className="text-xs bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-lg transition-colors">
                            + Add Payment
                        </button>
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
                                        <div className="text-xs text-gray-400 max-w-[130px] truncate" title={rec.notes || ''}>{rec.notes || '-'}</div>
                                        <div className="flex items-center gap-1.5 shrink-0">
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setEditingAdvanceId(rec.id);
                                                    setAdvanceForm({ amount: String(rec.amount), date: rec.date, notes: rec.notes || '', walletId: '' });
                                                    setIsAdvanceModalOpen(true);
                                                }}
                                                className="p-1.5 text-blue-400 hover:text-blue-300 hover:bg-blue-500/20 bg-blue-500/10 rounded-lg transition-colors cursor-pointer"
                                                title="Edit Advance"
                                            >
                                                <Pencil size={15} />
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => handleDeleteAdvance(rec.id)}
                                                className="p-1.5 text-red-400 hover:text-red-300 hover:bg-red-500/20 bg-red-500/10 rounded-lg transition-colors cursor-pointer"
                                                title="Delete Advance"
                                            >
                                                <Trash2 size={15} />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))
                        ) : loading ? (
                            <div className="flex flex-col gap-2">
                                {[1, 2].map(i => (
                                    <div key={i} className="animate-pulse flex items-center justify-between p-3 bg-white/5 rounded-lg">
                                        <div className="flex flex-col gap-1.5">
                                            <div className="h-3.5 bg-white/10 rounded w-16"></div>
                                            <div className="h-2.5 bg-white/5 rounded w-12"></div>
                                        </div>
                                        <div className="h-3 bg-white/5 rounded w-20"></div>
                                    </div>
                                ))}
                            </div>
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
                                        onChange={(val: any) => setAdvanceForm({ ...advanceForm, walletId: val as string })}
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
                                onChange={(val: any) => setEditForm({ ...editForm, role: val as string })}
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
                                    onChange={(val: any) => setSettleForm({ ...settleForm, walletId: val as string })}
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

            {/* Edit Attendance Modal */}
            {editingAttendance && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-[#0a0a0a] border border-white/10 p-6 rounded-2xl w-full max-w-md shadow-2xl flex flex-col gap-4 max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between border-b border-white/10 pb-3">
                            <div>
                                <h2 className="text-xl font-bold flex items-center gap-2">
                                    <Pencil size={18} className="text-blue-400" /> Edit Attendance
                                </h2>
                                <p className="text-xs text-gray-400 mt-0.5">
                                    {staff.name} • {new Date(editingAttendance.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setEditingAttendance(null)}
                                className="text-gray-400 hover:text-white p-1 rounded hover:bg-white/10 text-sm"
                            >
                                ✕
                            </button>
                        </div>

                        <form onSubmit={handleSaveEditAttendance} className="flex flex-col gap-4">
                            {/* Worked For Radio Group */}
                            <div className="flex flex-col gap-2">
                                <label className="text-xs text-gray-400 uppercase tracking-wider font-semibold">Worked For</label>
                                <div className="flex gap-6 bg-white/5 p-3 rounded-xl border border-white/5">
                                    {['Me', 'Papa', 'Both'].map(option => (
                                        <label key={option} className="flex items-center gap-2 cursor-pointer text-sm">
                                            <input
                                                type="radio"
                                                name="worked_for_edit"
                                                value={option}
                                                checked={editAttForm.worked_for === option}
                                                onChange={e => {
                                                    const newW = e.target.value;
                                                    setEditAttForm(prev => {
                                                        let newSt = prev.status;
                                                        let newStPapa = prev.status_papa;
                                                        if (newW === 'Papa' && newStPapa === 'Absent') newStPapa = 'Present';
                                                        if (newW === 'Me' && newSt === 'Absent') newSt = 'Present';
                                                        if (newW === 'Both') {
                                                            if (newSt === 'Absent') newSt = 'Present';
                                                            if (newStPapa === 'Absent') newStPapa = 'Present';
                                                        }
                                                        return { ...prev, worked_for: newW, status: newSt, status_papa: newStPapa };
                                                    });
                                                }}
                                                className="accent-[var(--accent)] h-4 w-4 cursor-pointer"
                                            />
                                            <span>{option}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>

                            {/* Status (Me) */}
                            {(editAttForm.worked_for === 'Me' || editAttForm.worked_for === 'Both') && (
                                <div className="flex flex-col gap-2">
                                    <label className="text-xs text-green-400 uppercase tracking-wider font-semibold">Attendance Status (Me)</label>
                                    <div className="grid grid-cols-4 gap-2">
                                        {['Present', 'Half-Day', 'Absent', 'Overtime'].map(st => {
                                            const isSelected = editAttForm.status === st;
                                            let cls = 'bg-white/5 text-gray-400 hover:bg-white/10';
                                            if (isSelected) {
                                                if (st === 'Present') cls = 'bg-green-500 text-black font-bold shadow-lg shadow-green-500/20';
                                                if (st === 'Half-Day') cls = 'bg-yellow-500 text-black font-bold shadow-lg shadow-yellow-500/20';
                                                if (st === 'Absent') cls = 'bg-red-500 text-black font-bold shadow-lg shadow-red-500/20';
                                                if (st === 'Overtime') cls = 'bg-purple-500 text-black font-bold shadow-lg shadow-purple-500/20';
                                            }
                                            return (
                                                <button
                                                    key={st}
                                                    type="button"
                                                    onClick={() => setEditAttForm(prev => ({ ...prev, status: st }))}
                                                    className={`py-2 px-1 text-xs rounded-lg transition-all text-center ${cls}`}
                                                >
                                                    {st}
                                                </button>
                                            );
                                        })}
                                    </div>
                                    {editAttForm.status === 'Overtime' && (
                                        <div className="flex items-center gap-4 bg-purple-500/10 border border-purple-500/20 p-2.5 rounded-lg text-xs mt-1">
                                            <span className="text-purple-300 font-semibold">Overtime Multiplier:</span>
                                            {['1.5', '2'].map(mult => (
                                                <label key={mult} className="flex items-center gap-1.5 cursor-pointer">
                                                    <input
                                                        type="radio"
                                                        name="ot_mult_me"
                                                        value={mult}
                                                        checked={editAttForm.ot_mult === mult}
                                                        onChange={() => setEditAttForm(prev => ({ ...prev, ot_mult: mult }))}
                                                        className="accent-purple-400"
                                                    />
                                                    <span>{mult} Days</span>
                                                </label>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Status (Papa) */}
                            {(editAttForm.worked_for === 'Papa' || editAttForm.worked_for === 'Both') && (
                                <div className="flex flex-col gap-2">
                                    <label className="text-xs text-blue-400 uppercase tracking-wider font-semibold">Attendance Status (Papa)</label>
                                    <div className="grid grid-cols-4 gap-2">
                                        {['Present', 'Half-Day', 'Absent', 'Overtime'].map(st => {
                                            const isSelected = editAttForm.status_papa === st;
                                            let cls = 'bg-white/5 text-gray-400 hover:bg-white/10';
                                            if (isSelected) {
                                                if (st === 'Present') cls = 'bg-green-500 text-black font-bold shadow-lg shadow-green-500/20';
                                                if (st === 'Half-Day') cls = 'bg-yellow-500 text-black font-bold shadow-lg shadow-yellow-500/20';
                                                if (st === 'Absent') cls = 'bg-red-500 text-black font-bold shadow-lg shadow-red-500/20';
                                                if (st === 'Overtime') cls = 'bg-purple-500 text-black font-bold shadow-lg shadow-purple-500/20';
                                            }
                                            return (
                                                <button
                                                    key={st}
                                                    type="button"
                                                    onClick={() => setEditAttForm(prev => ({ ...prev, status_papa: st }))}
                                                    className={`py-2 px-1 text-xs rounded-lg transition-all text-center ${cls}`}
                                                >
                                                    {st}
                                                </button>
                                            );
                                        })}
                                    </div>
                                    {editAttForm.status_papa === 'Overtime' && (
                                        <div className="flex items-center gap-4 bg-purple-500/10 border border-purple-500/20 p-2.5 rounded-lg text-xs mt-1">
                                            <span className="text-purple-300 font-semibold">Overtime Multiplier:</span>
                                            {['1.5', '2'].map(mult => (
                                                <label key={mult} className="flex items-center gap-1.5 cursor-pointer">
                                                    <input
                                                        type="radio"
                                                        name="ot_mult_papa"
                                                        value={mult}
                                                        checked={editAttForm.ot_mult_papa === mult}
                                                        onChange={() => setEditAttForm(prev => ({ ...prev, ot_mult_papa: mult }))}
                                                        className="accent-purple-400"
                                                    />
                                                    <span>{mult} Days</span>
                                                </label>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Clock In & Clock Out Fields */}
                            <div className="flex flex-col gap-2.5 bg-white/5 p-3.5 rounded-xl border border-white/10">
                                <label className="text-xs text-gray-400 uppercase tracking-wider font-semibold flex items-center gap-1.5">
                                    <Clock size={13} className="text-emerald-400" />
                                    Clock In & Out Time
                                </label>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    {/* Clock In */}
                                    <div className="flex flex-col gap-1.5">
                                        <div className="flex items-center justify-between text-xs">
                                            <span className="text-emerald-400 font-semibold flex items-center gap-1.5">
                                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                                                Clocked In
                                            </span>
                                            {editAttForm.punch_in_time && (
                                                <button
                                                    type="button"
                                                    onClick={() => setEditAttForm(prev => ({
                                                        ...prev,
                                                        punch_in_time: '',
                                                        punch_in_display: '',
                                                        raw_punch_in: '',
                                                        status: prev.punch_out_time ? calculateAttendanceFromTimes('', prev.punch_out_time, 'Absent') : 'Absent',
                                                        status_papa: prev.worked_for === 'Papa' || prev.worked_for === 'Both' ? 'Absent' : prev.status_papa
                                                    }))}
                                                    className="text-[11px] text-gray-400 hover:text-red-400 hover:underline cursor-pointer"
                                                >
                                                    Clear
                                                </button>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-2 bg-black/50 border border-white/10 rounded-xl px-3 py-2 focus-within:border-emerald-500/50">
                                            <input
                                                type="time"
                                                value={editAttForm.punch_in_time}
                                                onChange={e => {
                                                    const val = e.target.value;
                                                    const newStatus = calculateAttendanceFromTimes(val, editAttForm.punch_out_time, editAttForm.status);
                                                    setEditAttForm(prev => ({
                                                        ...prev,
                                                        punch_in_time: val,
                                                        punch_in_display: val ? formatPunchTime(`${editingAttendance.date}T${val}:00+05:30`) : '',
                                                        status: newStatus,
                                                        status_papa: prev.worked_for === 'Papa' || prev.worked_for === 'Both' ? newStatus : prev.status_papa
                                                    }));
                                                }}
                                                className="w-full bg-transparent text-white font-mono text-sm focus:outline-none [color-scheme:dark] cursor-pointer"
                                            />
                                        </div>
                                        {editAttForm.punch_in_display && (
                                            <span className="text-[10px] text-gray-500 font-mono">
                                                Recorded: {editAttForm.punch_in_display}
                                            </span>
                                        )}
                                    </div>

                                    {/* Clock Out */}
                                    <div className="flex flex-col gap-1.5">
                                        <div className="flex items-center justify-between text-xs">
                                            <span className="text-red-400 font-semibold flex items-center gap-1.5">
                                                <span className="w-1.5 h-1.5 rounded-full bg-red-400"></span>
                                                Clocked Out
                                            </span>
                                            {editAttForm.punch_out_time && (
                                                <button
                                                    type="button"
                                                    onClick={() => setEditAttForm(prev => {
                                                        const newStatus = prev.punch_in_time ? 'Present' : 'Absent';
                                                        return {
                                                            ...prev,
                                                            punch_out_time: '',
                                                            punch_out_display: '',
                                                            raw_punch_out: '',
                                                            status: newStatus,
                                                            status_papa: prev.worked_for === 'Papa' || prev.worked_for === 'Both' ? newStatus : prev.status_papa
                                                        };
                                                    })}
                                                    className="text-[11px] text-gray-400 hover:text-red-400 hover:underline cursor-pointer"
                                                >
                                                    Clear
                                                </button>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-2 bg-black/50 border border-white/10 rounded-xl px-3 py-2 focus-within:border-red-500/50">
                                            <input
                                                type="time"
                                                value={editAttForm.punch_out_time}
                                                onChange={e => {
                                                    const val = e.target.value;
                                                    const newStatus = calculateAttendanceFromTimes(editAttForm.punch_in_time, val, editAttForm.status);
                                                    setEditAttForm(prev => ({
                                                        ...prev,
                                                        punch_out_time: val,
                                                        punch_out_display: val ? formatPunchTime(`${editingAttendance.date}T${val}:00+05:30`) : '',
                                                        status: newStatus,
                                                        status_papa: prev.worked_for === 'Papa' || prev.worked_for === 'Both' ? newStatus : prev.status_papa
                                                    }));
                                                }}
                                                className="w-full bg-transparent text-white font-mono text-sm focus:outline-none [color-scheme:dark] cursor-pointer"
                                            />
                                        </div>
                                        {editAttForm.punch_out_display && (
                                            <span className="text-[10px] text-gray-500 font-mono">
                                                Recorded: {editAttForm.punch_out_display}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Work Done (Notes) */}
                            <div className="flex flex-col gap-1.5">
                                <label className="text-xs text-gray-400 uppercase tracking-wider font-semibold">Work Done (Notes)</label>
                                <textarea
                                    placeholder="What work was performed?"
                                    className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 h-20 resize-none text-sm focus:outline-none focus:border-[var(--accent)] text-white"
                                    value={editAttForm.work_done}
                                    onChange={e => setEditAttForm(prev => ({ ...prev, work_done: e.target.value }))}
                                />
                            </div>

                            {/* Modal Action Buttons */}
                            <div className="flex gap-3 mt-2">
                                <button
                                    type="button"
                                    onClick={() => setEditingAttendance(null)}
                                    className="flex-1 py-3 text-gray-400 hover:text-white transition-colors text-sm font-semibold"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={editAttSubmitting}
                                    className="flex-1 bg-[var(--accent)] text-black font-bold rounded-xl py-3 hover:opacity-90 transition-opacity text-sm shadow-lg shadow-[var(--accent)]/10"
                                >
                                    {editAttSubmitting ? 'Saving...' : 'Save Changes'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
