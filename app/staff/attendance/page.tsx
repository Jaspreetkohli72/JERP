"use client";
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useFinance } from '@/context/FinanceContext';
import { ArrowLeft, Save, CheckCircle, XCircle, Clock, Zap, Pencil } from 'lucide-react';
import { submitDailyAttendanceAction } from '@/app/actions/staff';

interface AttendanceRecord {
    status: string;
    worked_for: string;
    work_done: string;
    status_papa: string;
}

export default function AttendancePage() {
    // @ts-ignore
    const { staffList, attendance: allAttendance, refreshData } = useFinance();
    const [date, setDate] = useState(() => {
        const d = new Date();
        d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
        return d.toISOString().split('T')[0];
    });
    const [loading, setLoading] = useState(false);
    const [attendance, setAttendance] = useState<Record<string, AttendanceRecord>>({});

    // Modal state
    const [modalStaff, setModalStaff] = useState<any>(null);
    const [modalData, setModalData] = useState({
        worked_for: 'Me',
        work_done: '',
        status: 'Present',
        status_papa: 'Absent'
    });

    // Load existing attendance for selected date
    useEffect(() => {
        if (allAttendance && staffList) {
            const dailyStatus: Record<string, AttendanceRecord> = {};
            allAttendance.forEach((a: any) => {
                if (a.date && a.date.startsWith(date)) {
                    dailyStatus[a.staff_id] = {
                        status: a.status || 'Absent',
                        worked_for: a.worked_for || 'Me',
                        work_done: a.work_done || '',
                        status_papa: a.status_papa || 'Absent'
                    };
                }
            });
            setAttendance(dailyStatus);
        }
    }, [date, allAttendance, staffList]);

    const handleOpenModal = (staff: any, clickedStatus?: string) => {
        const existing = attendance[staff.id];
        setModalStaff(staff);
        setModalData({
            worked_for: existing?.worked_for || 'Me',
            work_done: existing?.work_done || '',
            status: clickedStatus || existing?.status || 'Present',
            status_papa: existing?.status_papa || (clickedStatus === 'Absent' ? 'Absent' : 'Present')
        });
    };

    const handleModalSave = () => {
        if (!modalStaff) return;
        setAttendance(prev => ({
            ...prev,
            [modalStaff.id]: {
                status: modalData.worked_for === 'Papa' ? 'Absent' : modalData.status,
                worked_for: modalData.worked_for,
                work_done: modalData.work_done,
                status_papa: modalData.worked_for === 'Me' ? 'Absent' : modalData.status_papa
            }
        }));
        setModalStaff(null);
    };

    const handleSave = async () => {
        setLoading(true);
        const records = Object.keys(attendance).map(staffId => ({
            staff_id: staffId,
            status: attendance[staffId].status,
            worked_for: attendance[staffId].worked_for,
            work_done: attendance[staffId].work_done,
            status_papa: attendance[staffId].status_papa
        }));

        const { success, error } = await submitDailyAttendanceAction(date, records);
        if (success) {
            if (refreshData) {
                await refreshData();
            }
            alert('Attendance saved successfully!');
        } else {
            alert(`Failed to save attendance: ${error}`);
        }
        setLoading(false);
    };

    const getAttendanceSummary = (rec: AttendanceRecord) => {
        if (!rec) return null;
        const parts = [];
        if (rec.worked_for === 'Me') {
            parts.push(`Worked for Me (${rec.status})`);
        } else if (rec.worked_for === 'Papa') {
            parts.push(`Worked for Papa (${rec.status_papa})`);
        } else if (rec.worked_for === 'Both') {
            parts.push(`Worked for Both (Me: ${rec.status}, Papa: ${rec.status_papa})`);
        }
        if (rec.work_done) {
            parts.push(`Work: "${rec.work_done}"`);
        }
        return parts.join(' | ');
    };

    const renderStatusButtons = (currentVal: string, onChange: (val: string) => void) => {
        return (
            <div className="flex gap-2">
                {['Present', 'Half-Day', 'Absent', 'Overtime'].map(status => {
                    let colorClass = 'bg-white/5 text-gray-400 hover:bg-white/10';
                    if (currentVal === status) {
                        if (status === 'Present') colorClass = 'bg-green-500 text-black font-bold shadow-lg shadow-green-500/20';
                        if (status === 'Half-Day') colorClass = 'bg-yellow-500 text-black font-bold shadow-lg shadow-yellow-500/20';
                        if (status === 'Absent') colorClass = 'bg-red-500 text-black font-bold shadow-lg shadow-red-500/20';
                        if (status === 'Overtime') colorClass = 'bg-purple-500 text-black font-bold shadow-lg shadow-purple-500/20';
                    }
                    return (
                        <button
                            key={status}
                            type="button"
                            onClick={() => onChange(status)}
                            className={`flex-1 py-2 text-xs rounded-lg transition-all ${colorClass}`}
                        >
                            {status}
                        </button>
                    );
                })}
            </div>
        );
    };

    const renderBothStatusButtons = (currentVal: string, onChange: (val: string) => void) => {
        return (
            <div className="flex gap-2">
                {[
                    { label: '1 Day', value: 'Present', color: 'bg-green-500 text-black font-bold shadow-lg shadow-green-500/20' },
                    { label: 'Half Day', value: 'Half-Day', color: 'bg-yellow-500 text-black font-bold shadow-lg shadow-yellow-500/20' }
                ].map(opt => {
                    let colorClass = 'bg-white/5 text-gray-400 hover:bg-white/10';
                    if (currentVal === opt.value) {
                        colorClass = opt.color;
                    }
                    return (
                        <button
                            key={opt.value}
                            type="button"
                            onClick={() => onChange(opt.value)}
                            className={`flex-1 py-2 text-xs rounded-lg transition-all ${colorClass}`}
                        >
                            {opt.label}
                        </button>
                    );
                })}
            </div>
        );
    };

    return (
        <div className="flex flex-col gap-6 p-4 md:p-8 text-white max-w-[800px] mx-auto mb-20">
            {/* Header */}
            <div className="flex items-center gap-4">
                <Link href="/staff" className="p-2 bg-white/5 rounded-lg hover:bg-white/10 transition-colors">
                    <ArrowLeft size={20} />
                </Link>
                <div className="flex-1">
                    <h1 className="text-2xl font-bold">Mark Attendance</h1>
                </div>
                <input
                    type="date"
                    className="bg-black/30 border border-white/10 rounded-lg px-4 py-2 text-sm focus:border-[var(--accent)] focus:outline-none [color-scheme:dark]"
                    value={date}
                    onChange={e => setDate(e.target.value)}
                />
            </div>

            {/* List */}
            <div className="glass overflow-hidden rounded-xl border border-white/10">
                {!staffList ? (
                    <div className="p-10 text-center text-gray-500">Loading...</div>
                ) : (
                    <div>
                        <div className="grid grid-cols-[1fr_repeat(4,60px)] gap-2 p-4 border-b border-white/10 bg-white/5 text-xs text-gray-400 font-bold uppercase tracking-wider text-center items-center">
                            <div className="text-left">Staff Member</div>
                            <div>Pres</div>
                            <div>Half</div>
                            <div>Abs</div>
                            <div>Over</div>
                        </div>

                        {staffList.filter((s: any) => !s.status?.startsWith('Terminated')).map((staff: any) => {
                            const rec = attendance[staff.id];
                            // Determine which status to display on the quick-buttons (prefer Me's, fallback to Papa's status if worked only for Papa)
                            const displayStatus = rec ? (rec.worked_for === 'Papa' ? rec.status_papa : rec.status) : undefined;
                            // Determine display styling (dimmed/grayed out if it's Papa's, to indicate it's not Me's project)
                            const isPapaOnly = rec?.worked_for === 'Papa';

                            return (
                                <div key={staff.id} className="grid grid-cols-[1fr_repeat(4,60px)] gap-2 p-4 border-b border-white/5 items-center hover:bg-white/5 transition-colors">
                                    <div onClick={() => handleOpenModal(staff)} className="cursor-pointer group flex-1">
                                        <div className="font-bold flex items-center gap-2 group-hover:text-[var(--accent)] transition-colors">
                                            {staff.name}
                                            <Pencil size={12} className="opacity-0 group-hover:opacity-100 transition-opacity text-gray-400" />
                                        </div>
                                        <div className="text-xs text-gray-500">{staff.role}</div>
                                        {rec && (
                                            <div className="text-xs text-[var(--accent)] mt-1 font-medium max-w-[400px] truncate" title={getAttendanceSummary(rec) || ""}>
                                                {getAttendanceSummary(rec)}
                                            </div>
                                        )}
                                    </div>

                                    {/* Present */}
                                    <button
                                        onClick={() => handleOpenModal(staff, 'Present')}
                                        className={`flex items-center justify-center p-2 rounded-lg transition-all ${
                                            displayStatus === 'Present' 
                                                ? (isPapaOnly ? 'bg-blue-500/30 text-blue-400 border border-blue-500/50 scale-105' : 'bg-green-500 text-black scale-110 shadow-lg shadow-green-500/20')
                                                : 'bg-white/5 text-gray-600 hover:bg-white/10'
                                        }`}
                                    >
                                        <CheckCircle size={20} />
                                    </button>

                                    {/* Half Day */}
                                    <button
                                        onClick={() => handleOpenModal(staff, 'Half-Day')}
                                        className={`flex items-center justify-center p-2 rounded-lg transition-all ${
                                            displayStatus === 'Half-Day'
                                                ? (isPapaOnly ? 'bg-blue-500/30 text-blue-400 border border-blue-500/50 scale-105' : 'bg-yellow-500 text-black scale-110 shadow-lg shadow-yellow-500/20')
                                                : 'bg-white/5 text-gray-600 hover:bg-white/10'
                                        }`}
                                    >
                                        <Clock size={20} />
                                    </button>

                                    {/* Absent */}
                                    <button
                                        onClick={() => handleOpenModal(staff, 'Absent')}
                                        className={`flex items-center justify-center p-2 rounded-lg transition-all ${
                                            displayStatus === 'Absent'
                                                ? (isPapaOnly ? 'bg-blue-500/30 text-blue-400 border border-blue-500/50 scale-105' : 'bg-red-500 text-black scale-110 shadow-lg shadow-red-500/20')
                                                : 'bg-white/5 text-gray-600 hover:bg-white/10'
                                        }`}
                                    >
                                        <XCircle size={20} />
                                    </button>

                                    {/* Overtime */}
                                    <button
                                        onClick={() => handleOpenModal(staff, 'Overtime')}
                                        className={`flex items-center justify-center p-2 rounded-lg transition-all ${
                                            displayStatus === 'Overtime'
                                                ? (isPapaOnly ? 'bg-blue-500/30 text-blue-400 border border-blue-500/50 scale-105' : 'bg-purple-500 text-black scale-110 shadow-lg shadow-purple-500/20')
                                                : 'bg-white/5 text-gray-600 hover:bg-white/10'
                                        }`}
                                    >
                                        <Zap size={20} />
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            <div className="flex justify-end sticky bottom-6">
                <button
                    onClick={handleSave}
                    disabled={loading}
                    className="bg-[var(--accent)] text-black px-8 py-3 rounded-xl font-bold hover:opacity-90 transition-opacity flex items-center gap-2 shadow-xl shadow-[var(--accent)]/10"
                >
                    {loading ? 'Saving...' : <><Save size={20} /> Save Attendance</>}
                </button>
            </div>

            {/* Attendance Details Modal */}
            {modalStaff && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-[#0a0a0a] border border-white/10 p-6 rounded-2xl w-full max-w-md shadow-2xl flex flex-col gap-4">
                        <div>
                            <h2 className="text-xl font-bold">Mark Attendance</h2>
                            <p className="text-sm text-gray-400">{modalStaff.name} ({modalStaff.role})</p>
                        </div>

                        {/* Worked For Radio Group */}
                        <div className="flex flex-col gap-2">
                            <label className="text-xs text-gray-400 uppercase tracking-wider font-semibold">Worked For</label>
                            <div className="flex gap-6 bg-white/5 p-3 rounded-xl border border-white/5">
                                {['Me', 'Papa', 'Both'].map(option => (
                                    <label key={option} className="flex items-center gap-2 cursor-pointer text-sm">
                                        <input
                                            type="radio"
                                            name="worked_for"
                                            value={option}
                                            checked={modalData.worked_for === option}
                                            onChange={e => setModalData(prev => ({ ...prev, worked_for: e.target.value }))}
                                            className="accent-[var(--accent)] h-4 w-4 cursor-pointer"
                                        />
                                        <span>{option}</span>
                                    </label>
                                ))}
                            </div>
                        </div>

                        {/* Attendance Status Buttons */}
                        {modalData.worked_for === 'Me' && (
                            <div className="flex flex-col gap-2">
                                <label className="text-xs text-gray-400 uppercase tracking-wider font-semibold">Attendance Status (Me)</label>
                                {renderStatusButtons(modalData.status, val => setModalData(prev => ({ ...prev, status: val })))}
                            </div>
                        )}

                        {modalData.worked_for === 'Papa' && (
                            <div className="flex flex-col gap-2">
                                <label className="text-xs text-gray-400 uppercase tracking-wider font-semibold">Attendance Status (Papa)</label>
                                {renderStatusButtons(modalData.status_papa, val => setModalData(prev => ({ ...prev, status_papa: val })))}
                            </div>
                        )}

                        {modalData.worked_for === 'Both' && (
                            <div className="flex flex-col gap-3 bg-white/5 p-3 rounded-xl border border-white/5">
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-xs text-green-400 uppercase tracking-wider font-semibold">Mine Attendance Status (Me)</label>
                                    {renderBothStatusButtons(modalData.status, val => setModalData(prev => ({ ...prev, status: val })))}
                                </div>
                                <div className="flex flex-col gap-1.5 border-t border-white/5 pt-3">
                                    <label className="text-xs text-blue-400 uppercase tracking-wider font-semibold">Papa's Attendance Status</label>
                                    {renderBothStatusButtons(modalData.status_papa, val => setModalData(prev => ({ ...prev, status_papa: val })))}
                                </div>
                            </div>
                        )}

                        {/* Work Done Text Area */}
                        <div className="flex flex-col gap-2">
                            <label className="text-xs text-gray-400 uppercase tracking-wider font-semibold">Work Done</label>
                            <textarea
                                placeholder="What work did they perform today?"
                                className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 h-24 resize-none text-sm focus:outline-none focus:border-[var(--accent)] focus:bg-white/10 transition-colors text-white"
                                value={modalData.work_done}
                                onChange={e => setModalData(prev => ({ ...prev, work_done: e.target.value }))}
                            />
                        </div>

                        {/* Modal Action Buttons */}
                        <div className="flex gap-3 mt-2">
                            <button
                                type="button"
                                onClick={() => setModalStaff(null)}
                                className="flex-1 py-3 text-gray-400 hover:text-white transition-colors text-sm font-semibold"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={handleModalSave}
                                className="flex-1 bg-[var(--accent)] text-black font-bold rounded-xl py-3 hover:opacity-90 transition-opacity text-sm shadow-lg shadow-[var(--accent)]/10"
                            >
                                Confirm
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

