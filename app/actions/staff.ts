'use server';

import { supabase } from '@/lib/supabase';
import { revalidatePath } from 'next/cache';

export async function getStaffStats() {
    // 1. Fetch Staff, Attendance, Advances, Settings
    const [staffRes, attendanceRes, advancesRes, settingsRes] = await Promise.all([
        supabase.from('staff').select('*').order('created_at', { ascending: false }),
        supabase.from('staff_attendance').select('*'),
        supabase.from('staff_advances').select('*'),
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
        const staffAttendance = attendance.filter(a =>
            String(a.staff_id) === String(staff.id) &&
            (a.worked_for === 'Me' || a.worked_for === 'Both' || !a.worked_for)
        );

        const daysPresent = staffAttendance.filter(a => a.status === 'Present').length;
        const halfDays = staffAttendance.filter(a => a.status === 'Half-Day').length;
        const overtimeDays = staffAttendance.filter(a => a.status === 'Overtime').length;
        const totalDays = daysPresent + (halfDays * 0.5) + overtimeDays;
        const salaryDays = daysPresent + (halfDays * 0.5) + (overtimeDays * 1.5);
        const salaryAccrued = salaryDays * (Number(staff.salary) || 0);

        // Advances
        const staffAdvances = allStaffAdvances.filter(adv =>
            String(adv.staff_id) === String(staff.id)
        );
        const totalAdvances = staffAdvances.reduce((sum, adv) => sum + Number(adv.amount), 0);
        const netPayable = salaryAccrued - totalAdvances;

        return {
            ...staff,
            attendanceStats: {
                daysPresent,
                halfDays,
                overtimeDays,
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
    const startDate = `${year}-${String(month + 1).padStart(2, '0')}-01`;
    // End Date: YYYY-MM-LastDay
    const lastDay = new Date(year, month + 1, 0).getDate();
    const endDate = `${year}-${String(month + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

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
}

export async function updateStaffAction(id: string | number, updates: any) {
    try {
        const { error } = await supabase.from('staff').update(updates).eq('id', id);
        if (error) throw error;
        revalidatePath('/staff');
        return { success: true };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

export async function deleteStaffAction(id: string | number) {
    try {
        const { error } = await supabase.from('staff').delete().eq('id', id);
        if (error) throw error;
        revalidatePath('/staff');
        return { success: true };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

export async function submitDailyAttendanceAction(date: string, records: any[]) {
    try {
        const upsertData = records.map(r => ({
            staff_id: parseInt(r.staff_id),
            date: date,
            status: r.status,
            worked_for: r.worked_for || 'Me',
            work_done: r.work_done || '',
            status_papa: r.status_papa || 'Absent'
        }));
        const { error } = await supabase.from('staff_attendance').upsert(upsertData, { onConflict: 'staff_id,date' });
        if (error) throw error;
        
        revalidatePath('/staff');
        revalidatePath('/staff/attendance');
        revalidatePath('/staff/calendar');
        
        return { success: true };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

export async function updateStaffAdvanceAction(id: string | number, updates: any) {
    try {
        const { error } = await supabase.from('staff_advances').update(updates).eq('id', id);
        if (error) throw error;
        revalidatePath('/staff');
        return { success: true };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

export async function deleteStaffAdvanceAction(id: string | number) {
    try {
        // 1. Get the staff advance details first
        const { data: advance, error: getAdvError } = await supabase
            .from('staff_advances')
            .select('*')
            .eq('id', id)
            .single();

        if (getAdvError) throw getAdvError;

        if (advance) {
            // 2. Get the staff member name to recreate the description
            const { data: staff, error: getStaffError } = await supabase
                .from('staff')
                .select('name')
                .eq('id', advance.staff_id)
                .single();

            if (getStaffError) throw getStaffError;

            if (staff) {
                const description = `Advance to ${staff.name}`;

                // 3. Find matching transaction (supporting precise and fallback description)
                const { data: txList, error: txError } = await supabase
                    .from('transactions')
                    .select('*')
                    .eq('amount', advance.amount)
                    .eq('type', 'expense')
                    .eq('transaction_date', advance.date)
                    .in('description', [description, 'Advance to Staff'])
                    .limit(1);

                if (txError) throw txError;

                if (txList && txList.length > 0) {
                    const tx = txList[0];

                    // 4. Revert the wallet balance
                    if (tx.wallet_id) {
                        const { data: wallet, error: walletError } = await supabase
                            .from('wallets')
                            .select('balance')
                            .eq('id', tx.wallet_id)
                            .single();

                        if (walletError) throw walletError;

                        if (wallet) {
                            const newBalance = Number(wallet.balance) + Number(tx.amount);
                            const { error: updateWalletError } = await supabase
                                .from('wallets')
                                .update({ balance: newBalance })
                                .eq('id', tx.wallet_id);

                            if (updateWalletError) throw updateWalletError;
                        }
                    }

                    // 5. Delete the transaction
                    const { error: deleteTxError } = await supabase
                        .from('transactions')
                        .delete()
                        .eq('id', tx.id);

                    if (deleteTxError) throw deleteTxError;
                }
            }
        }

        // 6. Delete the staff advance
        const { error: deleteAdvError } = await supabase
            .from('staff_advances')
            .delete()
            .eq('id', id);

        if (deleteAdvError) throw deleteAdvError;

        revalidatePath('/staff');
        return { success: true };
    } catch (e: any) {
        console.error("Error in deleteStaffAdvanceAction:", e);
        return { success: false, error: e.message };
    }
}

export async function deleteAttendanceAction(id: string | number) {
    try {
        const { error } = await supabase.from('staff_attendance').delete().eq('id', id);
        if (error) throw error;
        revalidatePath('/staff');
        revalidatePath('/staff/calendar');
        revalidatePath('/staff/[id]', 'page');
        return { success: true };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}
