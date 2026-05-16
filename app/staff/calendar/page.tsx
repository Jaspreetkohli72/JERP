import React from 'react';
import { getMonthlyAttendance } from '@/app/actions/staff';
import AttendanceCalendar from '@/components/Staff/AttendanceCalendar';

export const dynamic = 'force-dynamic';

export default async function AttendanceCalendarPage(props: { searchParams: Promise<{ month?: string }> }) {
    const searchParams = await props.searchParams;
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

