'use server';

import { supabase } from '@/lib/supabase';
import { revalidatePath } from 'next/cache';
import fs from 'fs';
import path from 'path';
import { getActiveStaffKioskList } from '@/lib/kiosk';

function loadBackupJson<T>(filename: string, fallback: T): T {
    try {
        const filePath = path.join(process.cwd(), 'backups', 'latest', filename);
        if (fs.existsSync(filePath)) {
            const raw = fs.readFileSync(filePath, 'utf-8');
            return JSON.parse(raw);
        }
    } catch (e) {
        console.warn(`Failed to read backup ${filename}:`, e);
    }
    return fallback;
}

export async function getStaffStats() {
    let staffList: any[] = [];
    let attendance: any[] = [];
    let allStaffAdvances: any[] = [];
    let settings: any = {};

    try {
        // 1. Fetch Staff, Attendance, Advances, Settings
        const [staffRes, attendanceRes, advancesRes, settingsRes] = await Promise.all([
            supabase.from('staff').select('*').order('created_at', { ascending: false }),
            supabase.from('staff_attendance').select('*'),
            supabase.from('staff_advances').select('*'),
            supabase.from('settings').select('*').limit(1)
        ]);

        if (staffRes.data && staffRes.data.length > 0) staffList = staffRes.data;
        if (attendanceRes.data && attendanceRes.data.length > 0) attendance = attendanceRes.data;
        if (advancesRes.data && advancesRes.data.length > 0) allStaffAdvances = advancesRes.data;
        if (settingsRes.data && settingsRes.data.length > 0) settings = settingsRes.data[0];
    } catch (e: any) {
        console.warn("getStaffStats Supabase query warning:", e?.message || e);
    }

    // Fallback to local snapshot if database is paused or empty
    if (staffList.length === 0) {
        staffList = loadBackupJson('staff.json', []);
    }
    if (attendance.length === 0) {
        attendance = loadBackupJson('staff_attendance.json', []);
    }
    if (allStaffAdvances.length === 0) {
        allStaffAdvances = loadBackupJson('staff_advances.json', []);
    }
    if (!settings || Object.keys(settings).length === 0) {
        const settingsArr = loadBackupJson<any[]>('settings.json', [{}]);
        settings = Array.isArray(settingsArr) ? settingsArr[0] : settingsArr;
    }

    // Fetch live Kiosk punch state for today
    const kioskStatusMap = new Map<string, { clockedIn: boolean; since: string | null }>();
    try {
        const kioskList = await getActiveStaffKioskList();
        kioskList.forEach(k => kioskStatusMap.set(String(k.id), { clockedIn: k.clockedIn, since: k.since }));
    } catch (kErr) {
        console.warn('getActiveStaffKioskList error in getStaffStats:', kErr);
    }

    try {
        // 2. Calculate Payroll Logic (Ported from FinanceContext)
        const staffWithPay = staffList.map(staff => {
            const kioskStatus = kioskStatusMap.get(String(staff.id)) || { clockedIn: false, since: null };
            // Find latest settlement date
            let latestSettleDate = '';
            let paymentDate = '';
            allStaffAdvances.forEach(adv => {
                if (String(adv.staff_id) === String(staff.id) && adv.notes) {
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

            // Attendance
            const staffAttendance = attendance.filter(a =>
                String(a.staff_id) === String(staff.id) &&
                (!paymentDate || a.date > paymentDate)
            );

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

            let daysPresentMe = 0;
            let halfDaysMe = 0;
            let overtimeDaysMe = 0;
            let totalDaysMe = 0;

            let daysPresentPapa = 0;
            let halfDaysPapa = 0;
            let overtimeDaysPapa = 0;
            let totalDaysPapa = 0;

            staffAttendance.forEach(a => {
                if (a.worked_for === 'Me' || a.worked_for === 'Both' || !a.worked_for) {
                    if (a.status === 'Present') daysPresentMe++;
                    else if (a.status === 'Half-Day' || a.status === 'Half Day') halfDaysMe++;
                    else if (a.status === 'Overtime' || a.status?.startsWith('Overtime')) overtimeDaysMe++;
                    totalDaysMe += getStatusMultiplier(a.status, a.work_done);
                }
                if (a.worked_for === 'Papa' || a.worked_for === 'Both') {
                    if (a.status_papa === 'Present') daysPresentPapa++;
                    else if (a.status_papa === 'Half-Day' || a.status_papa === 'Half Day') halfDaysPapa++;
                    else if (a.status_papa === 'Overtime' || a.status_papa?.startsWith('Overtime')) overtimeDaysPapa++;
                    totalDaysPapa += getStatusMultiplier(a.status_papa, a.work_done);
                }
            });

            const daysPresent = daysPresentMe + daysPresentPapa;
            const halfDays = halfDaysMe + halfDaysPapa;
            const overtimeDays = overtimeDaysMe + overtimeDaysPapa;

            const totalDays = totalDaysMe + totalDaysPapa;
            const salaryDays = totalDays;
            const salaryAccrued = salaryDays * (Number(staff.salary) || 0);

            // Advances
            const staffAdvances = allStaffAdvances.filter(adv =>
                String(adv.staff_id) === String(staff.id) &&
                (!paymentDate || adv.date > paymentDate) &&
                !(adv.notes && /Account Settlement up to/i.test(adv.notes))
            );
            const totalAdvances = staffAdvances.reduce((sum, adv) => sum + Number(adv.amount), 0);
            const netPayable = salaryAccrued - totalAdvances;

            return {
                ...staff,
                kioskStatus,
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
    } catch (e: any) {
        console.warn("getStaffStats calculation error:", e?.message || e);
        return {
            staffList,
            staffWithPay: [],
            settings
        };
    }
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
    const date = monthStr ? new Date(`${monthStr}-01`) : new Date();
    const year = date.getFullYear();
    const month = date.getMonth();

    const startDate = `${year}-${String(month + 1).padStart(2, '0')}-01`;
    const lastDay = new Date(year, month + 1, 0).getDate();
    const endDate = `${year}-${String(month + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

    let staffList: any[] = [];
    let attendance: any[] = [];

    try {
        const [staffRes, attendanceRes] = await Promise.all([
            supabase.from('staff').select('*').order('name'),
            supabase.from('staff_attendance')
                .select('*')
                .gte('date', startDate)
                .lte('date', endDate)
        ]);

        if (staffRes.data && staffRes.data.length > 0) staffList = staffRes.data;
        if (attendanceRes.data && attendanceRes.data.length > 0) attendance = attendanceRes.data;
    } catch (e: any) {
        console.warn("getMonthlyAttendance Supabase query warning:", e?.message || e);
    }

    if (staffList.length === 0) {
        staffList = loadBackupJson('staff.json', []);
    }
    if (attendance.length === 0) {
        const allAtt = loadBackupJson<any[]>('staff_attendance.json', []);
        attendance = allAtt.filter((a: any) => a.date >= startDate && a.date <= endDate);
    }

    return {
        staffList: staffList.filter((s: any) => !s.status?.startsWith('Terminated') && !s.status?.startsWith('On Leave')),
        attendance,
        queryMonth: `${year}-${String(month + 1).padStart(2, '0')}`
    };
}

export async function updateStaffAction(id: string | number, updates: any) {
    try {
        const targetId = !isNaN(Number(id)) ? Number(id) : id;
        const { error } = await supabase.from('staff').update(updates).eq('id', targetId);
        if (error) throw error;
        revalidatePath('/staff');
        revalidatePath('/staff/attendance');
        revalidatePath('/staff/calendar');
        revalidatePath(`/staff/${id}`);
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
        const normalizeDbStatus = (status?: string | null) => {
            if (!status) return 'Absent';
            if (status.startsWith('Overtime')) return 'Overtime';
            if (status === 'Half Day') return 'Half-Day';
            return status;
        };

        const upsertData = records.map(r => ({
            staff_id: parseInt(r.staff_id),
            date: date,
            status: normalizeDbStatus(r.status),
            worked_for: r.worked_for !== undefined ? r.worked_for : 'Me',
            work_done: r.work_done || '',
            status_papa: normalizeDbStatus(r.status_papa),
            ...(r.punch_in ? { punch_in: r.punch_in } : {}),
            ...(r.punch_out ? { punch_out: r.punch_out } : {})
        }));

        let data = null;
        try {
            const res = await supabase.from('staff_attendance').upsert(upsertData, { onConflict: 'staff_id,date' }).select();
            if (res.error) console.warn('[Attendance Action] Supabase upsert warning:', res.error.message);
            else data = res.data;
        } catch (dbErr) {
            console.warn('[Attendance Action] Supabase upsert exception:', dbErr);
        }

        // Also update local backup snapshot
        try {
            const filePath = path.join(process.cwd(), 'backups', 'latest', 'staff_attendance.json');
            if (fs.existsSync(filePath)) {
                const local = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
                upsertData.forEach(item => {
                    const idx = local.findIndex((a: any) => Number(a.staff_id) === Number(item.staff_id) && a.date === date);
                    if (idx >= 0) {
                        local[idx] = { ...local[idx], ...item };
                    } else {
                        local.push({ id: `local-${Date.now()}-${item.staff_id}`, ...item, created_at: new Date().toISOString() });
                    }
                });
                fs.writeFileSync(filePath, JSON.stringify(local, null, 2), 'utf-8');
            }
        } catch (backupErr) {
            console.warn('[Attendance Action] Backup write error:', backupErr);
        }
        
        return { success: true, data: data || upsertData };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

export async function clearDailyAttendanceAction(date: string) {
    try {
        const { error } = await supabase.from('staff_attendance').delete().eq('date', date);
        if (error) throw error;

        return { success: true };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

export async function updateStaffAdvanceAction(id: string | number, updates: any) {
    try {
        const { error } = await supabase.from('staff_advances').update(updates).eq('id', id);
        if (error) throw error;

        // Update local backup
        try {
            const filePath = path.join(process.cwd(), 'backups', 'latest', 'staff_advances.json');
            if (fs.existsSync(filePath)) {
                const local = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
                const idx = local.findIndex((a: any) => String(a.id) === String(id));
                if (idx >= 0) {
                    local[idx] = { ...local[idx], ...updates };
                    fs.writeFileSync(filePath, JSON.stringify(local, null, 2), 'utf-8');
                }
            }
        } catch (backupErr) {
            console.warn('[Staff Advance] Backup update warning:', backupErr);
        }

        revalidatePath('/staff');
        revalidatePath('/staff/[id]', 'page');
        return { success: true };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

export async function deleteStaffAdvanceAction(id: string | number) {
    try {
        // 1. Get the staff advance details first
        const { data: advance } = await supabase
            .from('staff_advances')
            .select('*')
            .eq('id', id)
            .maybeSingle();

        if (advance) {
            // 2. Try to get the staff member name to check for linked transaction
            let staffName = '';
            try {
                const { data: staff } = await supabase
                    .from('staff')
                    .select('name')
                    .eq('id', advance.staff_id)
                    .maybeSingle();
                if (staff?.name) staffName = staff.name;
            } catch (staffErr) {
                console.warn('[Delete Advance] Staff lookup warning:', staffErr);
            }

            // 3. Find matching transaction (supporting precise and fallback description)
            try {
                const descriptions = ['Advance to Staff'];
                if (staffName) descriptions.unshift(`Advance to ${staffName}`);

                const { data: txList } = await supabase
                    .from('transactions')
                    .select('*')
                    .eq('amount', advance.amount)
                    .eq('type', 'expense')
                    .eq('transaction_date', advance.date)
                    .in('description', descriptions)
                    .limit(1);

                if (txList && txList.length > 0) {
                    const tx = txList[0];

                    // 4. Revert the wallet balance
                    if (tx.wallet_id) {
                        const { data: wallet } = await supabase
                            .from('wallets')
                            .select('balance')
                            .eq('id', tx.wallet_id)
                            .maybeSingle();

                        if (wallet) {
                            const newBalance = Number(wallet.balance) + Number(tx.amount);
                            await supabase
                                .from('wallets')
                                .update({ balance: newBalance })
                                .eq('id', tx.wallet_id);
                        }
                    }

                    // 5. Delete the transaction
                    await supabase
                        .from('transactions')
                        .delete()
                        .eq('id', tx.id);
                }
            } catch (txErr) {
                console.warn('[Delete Advance] Transaction reversion warning:', txErr);
            }
        }

        // 6. Delete the staff advance from Supabase
        const { error: deleteAdvError } = await supabase
            .from('staff_advances')
            .delete()
            .eq('id', id);

        if (deleteAdvError) throw deleteAdvError;

        // 7. Remove from local backup
        try {
            const filePath = path.join(process.cwd(), 'backups', 'latest', 'staff_advances.json');
            if (fs.existsSync(filePath)) {
                const local = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
                const filtered = local.filter((a: any) => String(a.id) !== String(id));
                fs.writeFileSync(filePath, JSON.stringify(filtered, null, 2), 'utf-8');
            }
        } catch (backupErr) {
            console.warn('[Delete Advance] Backup deletion warning:', backupErr);
        }

        revalidatePath('/staff');
        revalidatePath('/staff/[id]', 'page');
        return { success: true };
    } catch (e: any) {
        console.error("Error in deleteStaffAdvanceAction:", e);
        return { success: false, error: e.message };
    }
}

export async function getStaffTodayPunchStatus(staffId: string | number) {
    try {
        const kioskList = await getActiveStaffKioskList();
        const found = kioskList.find(k => String(k.id) === String(staffId));
        return found ? { clockedIn: found.clockedIn, since: found.since } : { clockedIn: false, since: null };
    } catch {
        return { clockedIn: false, since: null };
    }
}

export async function getStaffProfileBundle(id: string | number, month: number, year: number) {
    try {
        const startDate = `${year}-${String(month + 1).padStart(2, '0')}-01`;
        const lastDay = new Date(year, month + 1, 0).getDate();
        const endDate = `${year}-${String(month + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

        const [staffRes, attRes, advRes, kioskList] = await Promise.all([
            supabase.from('staff').select('*').eq('id', id).maybeSingle(),
            supabase.from('staff_attendance')
                .select('*')
                .eq('staff_id', id)
                .gte('date', startDate)
                .lte('date', endDate)
                .order('date', { ascending: true }),
            supabase.from('staff_advances')
                .select('*')
                .eq('staff_id', id)
                .order('date', { ascending: false }),
            getActiveStaffKioskList().catch(() => [])
        ]);

        let staff = staffRes.data || null;
        let attendance = attRes.data || [];
        let advances = advRes.data || [];

        // Fallbacks to local backup files if empty or paused
        if (!staff) {
            const localStaffList = loadBackupJson<any[]>('staff.json', []);
            staff = localStaffList.find((s: any) => String(s.id) === String(id)) || null;
        }
        if (attendance.length === 0) {
            const localAtt = loadBackupJson<any[]>('staff_attendance.json', []);
            attendance = localAtt.filter((a: any) =>
                String(a.staff_id) === String(id) && a.date >= startDate && a.date <= endDate
            );
        }
        if (advances.length === 0) {
            const localAdv = loadBackupJson<any[]>('staff_advances.json', []);
            advances = localAdv.filter((a: any) => String(a.staff_id) === String(id));
        }

        const kioskItem = kioskList.find((k: any) => String(k.id) === String(id));
        const punchStatus = kioskItem
            ? { clockedIn: kioskItem.clockedIn, since: kioskItem.since }
            : { clockedIn: false, since: null };

        return {
            success: true,
            staff,
            attendance,
            advances,
            punchStatus,
            notFound: !staff
        };
    } catch (e: any) {
        console.error("Error in getStaffProfileBundle:", e);
        return {
            success: false,
            error: e.message,
            staff: null,
            attendance: [],
            advances: [],
            punchStatus: { clockedIn: false, since: null },
            notFound: false
        };
    }
}

export async function deleteAttendanceAction(id: string | number) {
    try {
        // 1. Fetch the attendance record first to get staff_id and date
        let record: any = null;
        try {
            const { data } = await supabase
                .from('staff_attendance')
                .select('*')
                .eq('id', id)
                .maybeSingle();
            if (data) record = data;
        } catch (e) {
            console.warn('[Delete Attendance] Fetch record warning:', e);
        }

        // 2. Delete the attendance record from Supabase
        const { error } = await supabase.from('staff_attendance').delete().eq('id', id);
        if (error) throw error;

        // 3. Delete all raw punch records for that staff member on that date
        if (record?.staff_id && record?.date) {
            try {
                await supabase
                    .from('staff_punches')
                    .delete()
                    .eq('staff_id', record.staff_id)
                    .eq('date', record.date);
            } catch (pErr) {
                console.warn('[Delete Attendance] Punches delete warning:', pErr);
            }

            // Also clean up local backup punches if present
            try {
                const punchesPath = path.join(process.cwd(), 'backups', 'latest', 'staff_punches.json');
                if (fs.existsSync(punchesPath)) {
                    const localPunches = JSON.parse(fs.readFileSync(punchesPath, 'utf-8'));
                    const filteredPunches = localPunches.filter((p: any) =>
                        !(Number(p.staff_id) === Number(record.staff_id) && p.date === record.date)
                    );
                    fs.writeFileSync(punchesPath, JSON.stringify(filteredPunches, null, 2), 'utf-8');
                }
            } catch (backupErr) {
                console.warn('[Delete Attendance] Punches backup delete warning:', backupErr);
            }
        }

        // 4. Clean up local backup attendance
        try {
            const attPath = path.join(process.cwd(), 'backups', 'latest', 'staff_attendance.json');
            if (fs.existsSync(attPath)) {
                const localAtt = JSON.parse(fs.readFileSync(attPath, 'utf-8'));
                const filteredAtt = localAtt.filter((a: any) => String(a.id) !== String(id));
                fs.writeFileSync(attPath, JSON.stringify(filteredAtt, null, 2), 'utf-8');
            }
        } catch (backupErr) {
            console.warn('[Delete Attendance] Attendance backup delete warning:', backupErr);
        }

        revalidatePath('/staff');
        revalidatePath('/staff/calendar');
        revalidatePath('/staff/attendance');
        revalidatePath('/staff/[id]', 'page');
        return { success: true };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}
