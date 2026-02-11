'use server';

import { supabase } from '@/lib/supabase';
import { revalidatePath } from 'next/cache';
import { unstable_cache } from 'next/cache';

export async function getStaffStats() {
    const getStats = unstable_cache(
        async () => {
            // 1. Fetch Staff, Attendance (Current Month), Advances (Current Month), Settings
            const today = new Date();
            // YYYY-MM-01
            const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1).toISOString();
            const currentMonthPrefix = today.toISOString().slice(0, 7);

            const [staffRes, attendanceRes, advancesRes, settingsRes] = await Promise.all([
                supabase.from('staff').select('*').order('created_at', { ascending: false }),
                supabase.from('staff_attendance').select('*').gte('date', startOfMonth),
                supabase.from('staff_advances').select('*').gte('date', startOfMonth),
                supabase.from('settings').select('*').limit(1)
            ]);

            if (staffRes.error) throw staffRes.error;
            if (attendanceRes.error) throw attendanceRes.error;
            if (advancesRes.error) throw advancesRes.error;

            const staffList = staffRes.data || [];
            const attendance = attendanceRes.data || [];
            const allStaffAdvances = advancesRes.data || [];
            const settings = (settingsRes.data && settingsRes.data.length > 0) ? settingsRes.data[0] : {};

            // 2. Calculate Payroll Logic (Ported from FinanceContext)
            const staffWithPay = staffList.map(staff => {
                // Attendance
                const monthAttendance = attendance.filter(a =>
                    String(a.staff_id) === String(staff.id)
                );

                const daysPresent = monthAttendance.filter(a => a.status === 'Present').length;
                const halfDays = monthAttendance.filter(a => a.status === 'Half-Day').length;
                const totalDays = daysPresent + (halfDays * 0.5);
                const salaryAccrued = totalDays * (Number(staff.salary) || 0);

                // Advances
                const monthAdvances = allStaffAdvances.filter(adv =>
                    String(adv.staff_id) === String(staff.id)
                );
                const totalAdvances = monthAdvances.reduce((sum, adv) => sum + Number(adv.amount), 0);
                const netPayable = salaryAccrued - totalAdvances;

                return {
                    ...staff,
                    attendanceStats: {
                        daysPresent,
                        halfDays,
                        totalDays
                    },
                    financials: {
                        salaryAccrued,
                        totalAdvances,
                        netPayable
                    }
                };
            });

            return {
                staffList,
                staffWithPay,
                settings
            };
        },
        ['staff-stats'],
        { revalidate: 60, tags: ['staff-stats'] }
    );

    return getStats();
}

export async function addStaff(payload: any) {
    try {
        const { data, error } = await supabase
            .from('staff')
            .insert([payload])
            .select()
            .single();

        if (error) {
            console.error('Add Staff Error:', error);
            return { success: false, error: error.message };
        }

        revalidatePath('/staff');
        return { success: true, data };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function getMonthlyAttendance(monthStr?: string) {
    // monthStr format: "YYYY-MM"
    const date = monthStr ? new Date(`${monthStr}-01`) : new Date();
    const year = date.getFullYear();
    const month = date.getMonth(); // 0-indexed

    // Start Date: YYYY-MM-01
    const startDate = new Date(year, month, 1).toISOString().split('T')[0];
    // End Date: YYYY-MM-LastDay
    const endDate = new Date(year, month + 1, 0).toISOString().split('T')[0];

    const getStats = unstable_cache(
        async () => {
            const [staffRes, attendanceRes] = await Promise.all([
                supabase.from('staff').select('*').order('name'),
                supabase.from('staff_attendance')
                    .select('*')
                    .gte('date', startDate)
                    .lte('date', endDate)
            ]);

            if (staffRes.error) throw staffRes.error;
            if (attendanceRes.error) throw attendanceRes.error;

            return {
                staffList: staffRes.data || [],
                attendance: attendanceRes.data || [],
                queryMonth: `${year}-${String(month + 1).padStart(2, '0')}` // Return normalized query month
            };
        },
        [`staff-attendance-${year}-${month}`], // Cache key per month
        { revalidate: 60, tags: [`attendance-${year}-${month}`] }
    );

    return getStats();
}
