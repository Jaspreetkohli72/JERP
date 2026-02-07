"use client";
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useFinance } from '@/context/FinanceContext';
import { ArrowLeft, Save, CheckCircle, XCircle, Clock } from 'lucide-react';
import { supabase } from '@/lib/supabase';

export default function AttendancePage() {
    // @ts-ignore
    const { staffList, markAttendance } = useFinance();
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [attendance, setAttendance] = useState<any>({}); // { staff_id: 'Present' | 'Absent' | 'Half-Day' }
    const [loading, setLoading] = useState(false);
    const [fetching, setFetching] = useState(true);

    // Fetch existing attendance for selected date
    useEffect(() => {
        const fetchAttendance = async () => {
            setFetching(true);
            try {
                // Get existing for this date
                const { data } = await supabase.from('staff_attendance').select('*').eq('date', date);

                const newAtt = {};
                // Default all to Present if no record, else use record
                staffList.forEach((s: any) => {
                    const record = data?.find(r => r.staff_id === s.id);
                    // @ts-ignore
                    newAtt[s.id] = record ? record.status : 'Present';
                });
                setAttendance(newAtt);
            } catch (e) {
                console.error(e);
            }
            setFetching(false);
        };

        if (staffList.length > 0) {
            fetchAttendance();
        }
    }, [date, staffList]);

    const handleStatusChange = (staffId: string, status: string) => {
        setAttendance((prev: any) => ({ ...prev, [staffId]: status }));
    };

    const handleSave = async () => {
        setLoading(true);
        const records = Object.keys(attendance).map(staffId => ({
            staff_id: staffId,
            status: attendance[staffId]
        }));

        const { success } = await markAttendance(date, records);
        if (success) {
            alert('Attendance saved successfully!');
        } else {
            alert('Failed to save attendance.');
        }
        setLoading(false);
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
                {fetching ? (
                    <div className="p-10 text-center text-gray-500">Loading...</div>
                ) : (
                    <div>
                        <div className="grid grid-cols-[1fr_repeat(3,60px)] gap-2 p-4 border-b border-white/10 bg-white/5 text-xs text-gray-400 font-bold uppercase tracking-wider text-center items-center">
                            <div className="text-left">Staff Member</div>
                            <div>Pres</div>
                            <div>Half</div>
                            <div>Abs</div>
                        </div>

                        {staffList.map((staff: any) => (
                            <div key={staff.id} className="grid grid-cols-[1fr_repeat(3,60px)] gap-2 p-4 border-b border-white/5 items-center hover:bg-white/5 transition-colors">
                                <div>
                                    <div className="font-bold">{staff.name}</div>
                                    <div className="text-xs text-gray-500">{staff.role}</div>
                                </div>

                                {/* Present */}
                                <button
                                    onClick={() => handleStatusChange(staff.id, 'Present')}
                                    className={`flex items-center justify-center p-2 rounded-lg transition-all ${attendance[staff.id] === 'Present' ? 'bg-green-500 text-black scale-110 shadow-lg shadow-green-500/20' : 'bg-white/5 text-gray-600 hover:bg-white/10'}`}
                                >
                                    <CheckCircle size={20} />
                                </button>

                                {/* Half Day */}
                                <button
                                    onClick={() => handleStatusChange(staff.id, 'Half-Day')}
                                    className={`flex items-center justify-center p-2 rounded-lg transition-all ${attendance[staff.id] === 'Half-Day' ? 'bg-yellow-500 text-black scale-110 shadow-lg shadow-yellow-500/20' : 'bg-white/5 text-gray-600 hover:bg-white/10'}`}
                                >
                                    <Clock size={20} />
                                </button>

                                {/* Absent */}
                                <button
                                    onClick={() => handleStatusChange(staff.id, 'Absent')}
                                    className={`flex items-center justify-center p-2 rounded-lg transition-all ${attendance[staff.id] === 'Absent' ? 'bg-red-500 text-black scale-110 shadow-lg shadow-red-500/20' : 'bg-white/5 text-gray-600 hover:bg-white/10'}`}
                                >
                                    <XCircle size={20} />
                                </button>
                            </div>
                        ))}
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
        </div>
    );
}
