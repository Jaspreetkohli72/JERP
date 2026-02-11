"use client";
import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, ChevronLeft, ChevronRight } from 'lucide-react';

export default function AttendanceCalendar({ staffList, attendance, currentMonth }: any) {
    const router = useRouter();
    const [dateObj] = useState(() => {
        // currentMonth is "YYYY-MM"
        return new Date(`${currentMonth}-01`);
    });

    const year = dateObj.getFullYear();
    const month = dateObj.getMonth();
    const monthName = dateObj.toLocaleString('default', { month: 'long' });
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysArray = Array.from({ length: daysInMonth }, (_, i) => i + 1);

    const handlePrevMonth = () => {
        const prev = new Date(year, month - 1, 1);
        const prevStr = `${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, '0')}`;
        router.push(`/staff/calendar?month=${prevStr}`);
    };

    const handleNextMonth = () => {
        const next = new Date(year, month + 1, 1);
        const nextStr = `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}`;
        router.push(`/staff/calendar?month=${nextStr}`);
    };

    const getStatus = (staffId: any, day: number) => {
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const record = (attendance || []).find((a: any) => String(a.staff_id) === String(staffId) && a.date === dateStr);
        return record ? record.status : null;
    };

    const normalizeStatus = (status: string) => {
        if (!status) return null;
        // Normalize "Half-Day" (DB) vs "Half Day" (Old UI)
        if (status === 'Half-Day' || status === 'Half Day') return 'Half-Day';
        return status;
    };

    const getStatusColor = (rawStatus: string) => {
        const status = normalizeStatus(rawStatus);
        if (status === 'Present') return 'bg-green-500 text-black shadow-[0_0_10px_rgba(34,197,94,0.4)]';
        if (status === 'Absent') return 'bg-red-500 text-black shadow-[0_0_10px_rgba(239,68,68,0.4)]';
        if (status === 'Half-Day') return 'bg-yellow-500 text-black shadow-[0_0_10px_rgba(234,179,8,0.4)]';
        return '';
    };

    const getStatusIcon = (rawStatus: string) => {
        const status = normalizeStatus(rawStatus);
        if (status === 'Present') return 'P';
        if (status === 'Absent') return 'A';
        if (status === 'Half-Day') return 'H';
        return '';
    };

    return (
        <div className="flex flex-col gap-6 p-4 md:p-8 text-white w-full mb-20 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex flex-wrap items-center justify-between w-full gap-4">
                <div className="flex items-center gap-4">
                    <Link href="/staff" className="p-2 bg-white/5 rounded-lg hover:bg-white/10 transition-colors">
                        <ArrowLeft size={20} />
                    </Link>
                    <h1 className="text-2xl font-bold">Attendance Calendar</h1>
                </div>

                <div className="flex items-center gap-4 bg-white/5 p-1 rounded-xl">
                    <button onClick={handlePrevMonth} className="p-2 hover:bg-white/10 rounded-lg transition-colors">
                        <ChevronLeft size={20} />
                    </button>
                    <span className="text-xl font-bold min-w-[160px] text-center">{monthName} {year}</span>
                    <button onClick={handleNextMonth} className="p-2 hover:bg-white/10 rounded-lg transition-colors">
                        <ChevronRight size={20} />
                    </button>
                </div>
            </div>

            {/* Calendar Grid */}
            <div className="glass rounded-2xl border border-white/5 overflow-hidden p-6">
                <div className="overflow-x-auto pb-2 custom-scrollbar">
                    <table className="w-full border-collapse min-w-[max-content]">
                        <thead>
                            <tr>
                                <th className="p-4 text-left border-b border-white/10 bg-[#0a0a0a] sticky left-0 z-20 min-w-[200px] border-r border-white/10 shadow-[4px_0_10px_rgba(0,0,0,0.5)]">
                                    Staff Name
                                </th>
                                {daysArray.map(day => (
                                    <th key={day} className="p-2 text-center border-b border-white/10 min-w-[40px] text-xs text-gray-400 font-medium">
                                        {day}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {staffList.map((staff: any) => (
                                <tr key={staff.id} className="hover:bg-white/5 transition-colors border-b border-white/5 last:border-0 group">
                                    <td className="p-4 border-r border-white/10 sticky left-0 z-10 bg-[#0a0a0a] group-hover:bg-[#111] transition-colors shadow-[4px_0_10px_rgba(0,0,0,0.5)]">
                                        <div className="font-bold whitespace-nowrap text-gray-200">{staff.name}</div>
                                        <div className="text-xs text-gray-500">{staff.role}</div>
                                    </td>
                                    {daysArray.map(day => {
                                        const status = getStatus(staff.id, day);
                                        return (
                                            <td key={day} className="p-1 text-center min-w-[40px]">
                                                {status && (
                                                    <div className={`w-8 h-8 mx-auto rounded-lg flex items-center justify-center text-xs font-bold transition-all hover:scale-110 cursor-default group/cell relative ${getStatusColor(status)}`}>
                                                        {getStatusIcon(status)}
                                                    </div>
                                                )}
                                            </td>
                                        );
                                    })}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
            {/* Legend */}
            <div className="flex gap-6 mt-4 justify-center">
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-green-500/50"></div>
                    <span className="text-sm text-gray-400">Present</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-yellow-500/50"></div>
                    <span className="text-sm text-gray-400">Half Day</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-red-500/50"></div>
                    <span className="text-sm text-gray-400">Absent</span>
                </div>
            </div>
        </div>
    );
}
