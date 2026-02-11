import React from 'react';
import { getMonthlyAttendance } from '@/app/actions/staff';
import AttendanceCalendar from '@/components/Staff/AttendanceCalendar';

export const revalidate = 0; // Always fresh/dynamic because it depends on searchParams (or small revalidate if ok)

export default async function AttendanceCalendarPage({ searchParams }: { searchParams: { month?: string } }) {
    const { month } = searchParams;
    const { staffList, attendance, queryMonth } = await getMonthlyAttendance(month);

    return (
        <AttendanceCalendar
            staffList={staffList}
            attendance={attendance}
            currentMonth={queryMonth}
        />
    );
}

