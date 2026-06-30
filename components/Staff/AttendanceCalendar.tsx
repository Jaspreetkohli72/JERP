"use client";
import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, ChevronLeft, ChevronRight } from 'lucide-react';

export default function AttendanceCalendar({ staffList, attendance, currentMonth }: any) {
    const router = useRouter();
    // currentMonth is "YYYY-MM"
    const dateObj = new Date(`${currentMonth}-01`);

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

    const getAttendanceRecord = (staffId: any, day: number) => {
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const record = (attendance || []).find((a: any) => String(a.staff_id) === String(staffId) && a.date === dateStr);
        if (record) return record;

        // If no attendance record, check if staff is currently Terminated
        const staff = (staffList || []).find((s: any) => String(s.id) === String(staffId));
        if (staff && staff.status?.startsWith('Terminated')) {
            const termDateStr = staff.status.split(':')[1];
            if (!termDateStr || dateStr >= termDateStr) {
                return { status: 'Terminated', isTerminated: true };
            }
        }
        return null;
    };

    const normalizeStatus = (status: string) => {
        if (!status) return null;
        // Normalize "Half-Day" (DB) vs "Half Day" (Old UI)
        if (status === 'Half-Day' || status === 'Half Day') return 'Half-Day';
        return status;
    };

    const getCellDetails = (record: any) => {
        if (!record) return null;
        if (record.isTerminated) {
            return {
                bgColor: 'bg-gray-600/40 text-gray-400 border border-white/10 shadow-[0_0_10px_rgba(100,100,100,0.1)]',
                text: 'T',
                tooltip: 'Terminated',
                textClass: 'text-xs'
            };
        }

        const workedFor = record.worked_for || 'Me';
        const status = normalizeStatus(record.status);
        const statusPapa = normalizeStatus(record.status_papa);
        const workDone = record.work_done;

        let bgColor = '';
        let text = '';
        let tooltip = '';
        let textClass = 'text-xs';

        if (workedFor === 'Me') {
            tooltip = `Worked for Me: ${status}`;
            if (status === 'Present') {
                bgColor = 'bg-green-500 text-black shadow-[0_0_10px_rgba(34,197,94,0.4)]';
                text = 'P';
            } else if (status === 'Half-Day') {
                bgColor = 'bg-yellow-500 text-black shadow-[0_0_10px_rgba(234,179,8,0.4)]';
                text = 'H';
            } else if (status === 'Overtime') {
                bgColor = 'bg-purple-500 text-black shadow-[0_0_10px_rgba(168,85,247,0.4)]';
                text = 'OT';
            } else {
                bgColor = 'bg-red-500 text-black shadow-[0_0_10px_rgba(239,68,68,0.4)]';
                text = 'A';
            }
        } else if (workedFor === 'Papa') {
            const actualStatusPapa = statusPapa || 'Present';
            tooltip = `Worked for Papa: ${actualStatusPapa}`;
            if (actualStatusPapa === 'Present') {
                bgColor = 'bg-blue-500 text-black shadow-[0_0_10px_rgba(59,130,246,0.4)]';
                text = 'P';
            } else if (actualStatusPapa === 'Half-Day') {
                bgColor = 'bg-cyan-500 text-black shadow-[0_0_10px_rgba(6,182,212,0.4)]';
                text = 'H';
            } else if (actualStatusPapa === 'Overtime') {
                bgColor = 'bg-indigo-500 text-black shadow-[0_0_10px_rgba(99,102,241,0.4)]';
                text = 'OT';
            } else {
                bgColor = 'bg-red-500 text-black shadow-[0_0_10px_rgba(239,68,68,0.4)]';
                text = 'A';
            }
        } else if (workedFor === 'Both') {
            const displayStatusMe = status || 'Present';
            const displayStatusPapa = statusPapa || 'Present';
            tooltip = `Worked for Both: Me (${displayStatusMe}) | Papa (${displayStatusPapa})`;
            
            let fromColor = 'from-green-500';
            let toColor = 'to-blue-500';
            let meChar = 'P';
            let papaChar = 'P';

            if (displayStatusMe === 'Half-Day') {
                fromColor = 'from-yellow-500';
                meChar = 'H';
            } else if (displayStatusMe === 'Absent') {
                fromColor = 'from-red-500';
                meChar = 'A';
            } else if (displayStatusMe === 'Overtime') {
                fromColor = 'from-purple-500';
                meChar = 'OT';
            }

            if (displayStatusPapa === 'Half-Day') {
                toColor = 'to-cyan-500';
                papaChar = 'H';
            } else if (displayStatusPapa === 'Absent') {
                toColor = 'to-red-500';
                papaChar = 'A';
            } else if (displayStatusPapa === 'Overtime') {
                toColor = 'to-indigo-500';
                papaChar = 'OT';
            }

            bgColor = `bg-gradient-to-br ${fromColor} ${toColor} text-black font-semibold`;
            text = `${meChar}/${papaChar}`;
            textClass = 'text-[9px] leading-none';
        }

        if (workDone) {
            tooltip += ` (Work: ${workDone})`;
        }

        return { bgColor, text, tooltip, textClass };
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
                                        const record = getAttendanceRecord(staff.id, day);
                                        const cell = getCellDetails(record);
                                        return (
                                            <td key={day} className="p-1 text-center min-w-[40px]">
                                                {cell && (
                                                    <div className={`w-8 h-8 mx-auto rounded-lg flex items-center justify-center font-bold transition-all hover:scale-110 cursor-default group/cell relative ${cell.textClass} ${cell.bgColor}`}>
                                                        {cell.text}
                                                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover/cell:block z-30 bg-[#0e0e0e] border border-white/10 text-xs px-3 py-2 rounded-lg whitespace-normal w-max max-w-[200px] break-words shadow-xl pointer-events-none text-left">
                                                            <div className="font-semibold text-gray-300 mb-0.5">{year}-{String(month + 1).padStart(2, '0')}-{String(day).padStart(2, '0')}</div>
                                                            <div className="text-gray-400">{cell.tooltip}</div>
                                                        </div>
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
            <div className="flex flex-wrap gap-6 mt-4 justify-center">
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-green-500/50"></div>
                    <span className="text-sm text-gray-400">Present (Mine)</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-yellow-500/50"></div>
                    <span className="text-sm text-gray-400">Half Day (Mine)</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-purple-500/50"></div>
                    <span className="text-sm text-gray-400">Overtime (Mine)</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-red-500/50"></div>
                    <span className="text-sm text-gray-400">Absent (Mine)</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-blue-500/50"></div>
                    <span className="text-sm text-gray-400">Worked for Papa</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-gradient-to-br from-green-500/50 to-blue-500/50"></div>
                    <span className="text-sm text-gray-400">Worked for Both</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-gray-500/50"></div>
                    <span className="text-sm text-gray-400">Terminated</span>
                </div>
            </div>
        </div>
    );
}
