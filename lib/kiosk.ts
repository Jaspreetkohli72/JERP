import { supabase } from '@/lib/supabase';
import fs from 'fs';
import path from 'path';

export interface KioskStaffItem {
    id: string;
    name: string;
    clockedIn: boolean;
    since: string | null;
}

export interface PunchRecord {
    id?: string;
    staff_id: number;
    punch_type: 'IN' | 'OUT';
    punched_at: string;
    date: string;
    created_at?: string;
}

/**
 * Returns current date formatted as "YYYY-MM-DD" strictly in Asia/Kolkata timezone
 */
export function getTodayIST(): string {
    return new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Kolkata',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
    }).format(new Date());
}

/**
 * Formats a Date or timestamp string into "hh:mm AM/PM" in Asia/Kolkata timezone
 */
export function formatTimeIST(dateInput: Date | string): string {
    const d = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
    return new Intl.DateTimeFormat('en-US', {
        timeZone: 'Asia/Kolkata',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
    }).format(d);
}

/**
 * Maps cumulative working hours to attendance status:
 * - < 4.0 hrs: 'Absent'
 * - 4.0 to < 6.0 hrs: 'Half-Day'
 * - 6.0 to 10.0 hrs: 'Present'
 * - > 10.0 hrs: 'Overtime' (1.5 day credit)
 */
export function calculateAttendanceStatus(totalHours: number): 'Absent' | 'Half-Day' | 'Present' | 'Overtime' {
    if (totalHours < 4.0) return 'Absent';
    if (totalHours < 6.0) return 'Half-Day';
    if (totalHours <= 10.0) return 'Present';
    return 'Overtime';
}

/**
 * Calculates total worked hours by summing durations across all completed IN/OUT punch pairs
 */
export function calculateCumulativeWorkedHours(punches: Array<{ punch_type: string; punched_at: string }>): number {
    let totalMs = 0;
    let lastInTime: number | null = null;

    // Sort chronologically ascending
    const sorted = [...punches].sort((a, b) => new Date(a.punched_at).getTime() - new Date(b.punched_at).getTime());

    for (const p of sorted) {
        const time = new Date(p.punched_at).getTime();
        if (p.punch_type === 'IN') {
            lastInTime = time;
        } else if (p.punch_type === 'OUT' && lastInTime !== null) {
            if (time > lastInTime) {
                totalMs += (time - lastInTime);
            }
            lastInTime = null;
        }
    }

    return Math.max(0, totalMs / (1000 * 60 * 60));
}

export function loadBackupJson<T>(filename: string, fallback: T): T {
    try {
        const filePath = path.join(process.cwd(), 'backups', 'latest', filename);
        if (fs.existsSync(filePath)) {
            const raw = fs.readFileSync(filePath, 'utf-8');
            return JSON.parse(raw);
        }
    } catch (e) {
        console.warn(`[Kiosk] Failed to read backup ${filename}:`, e);
    }
    return fallback;
}

export function saveBackupJson<T>(filename: string, data: T): void {
    try {
        const dir = path.join(process.cwd(), 'backups', 'latest');
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        const filePath = path.join(dir, filename);
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
    } catch (e) {
        console.warn(`[Kiosk] Failed to write backup ${filename}:`, e);
    }
}

/**
 * Fetches all punches for a given IST date, merging live Supabase data with resilient backup
 */
export async function getPunchesForDate(dateStr: string): Promise<PunchRecord[]> {
    let punches: PunchRecord[] = [];
    try {
        const { data, error } = await supabase
            .from('staff_punches')
            .select('*')
            .eq('date', dateStr)
            .order('punched_at', { ascending: true });

        if (!error && data && data.length > 0) {
            punches = data;
        }
    } catch (e) {
        console.warn('[Kiosk] Supabase staff_punches query warning:', e);
    }

    if (punches.length === 0) {
        const local = loadBackupJson<PunchRecord[]>('staff_punches.json', []);
        punches = local.filter((p) => p.date === dateStr);
    }

    return punches;
}

/**
 * Persists a new punch record to Supabase and resilient backup
 */
export async function recordPunchEvent(record: PunchRecord): Promise<void> {
    try {
        const { error } = await supabase.from('staff_punches').insert([record]);
        if (error) console.warn('[Kiosk] Supabase staff_punches insert warning:', error.message);
    } catch (e) {
        console.warn('[Kiosk] Supabase staff_punches insert exception:', e);
    }

    // Also update local backup file
    const local = loadBackupJson<PunchRecord[]>('staff_punches.json', []);
    local.push(record);
    saveBackupJson('staff_punches.json', local);
}

/**
 * Resolves the list of active staff members with their live clock-in status for todayIST
 */
export async function getActiveStaffKioskList(): Promise<KioskStaffItem[]> {
    const today = getTodayIST();
    let staffList: any[] = [];

    try {
        const { data, error } = await supabase
            .from('staff')
            .select('*')
            .order('name', { ascending: true });

        if (!error && data && data.length > 0) {
            staffList = data;
        }
    } catch (e) {
        console.warn('[Kiosk] Supabase staff query warning:', e);
    }

    if (staffList.length === 0) {
        staffList = loadBackupJson<any[]>('staff.json', []);
    }

    // Filter active staff: not terminated and not on leave
    const activeStaff = staffList.filter((s: any) =>
        !s.status?.startsWith('Terminated') && !s.status?.startsWith('On Leave')
    );

    // Fetch punches strictly for todayIST
    const todayPunches = await getPunchesForDate(today);

    // Group punches by staff_id
    const punchesByStaff = new Map<number, PunchRecord[]>();
    for (const p of todayPunches) {
        const list = punchesByStaff.get(p.staff_id) || [];
        list.push(p);
        punchesByStaff.set(p.staff_id, list);
    }

    const result: KioskStaffItem[] = activeStaff.map((s: any) => {
        const sPunches = punchesByStaff.get(Number(s.id)) || [];
        // Sort chronologically
        sPunches.sort((a, b) => new Date(a.punched_at).getTime() - new Date(b.punched_at).getTime());

        const latestPunch = sPunches.length > 0 ? sPunches[sPunches.length - 1] : null;
        const isClockedIn = latestPunch?.punch_type === 'IN';
        const sinceTime = isClockedIn && latestPunch ? formatTimeIST(latestPunch.punched_at) : null;

        return {
            id: String(s.id),
            name: s.name,
            clockedIn: isClockedIn,
            since: sinceTime,
        };
    });

    // Sort alphabetically by name
    result.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));

    return result;
}

/**
 * Updates staff_attendance for (staff_id, todayIST):
 * - If action === 'IN', sets punch_in if not present (preserves earliest punch_in), status = 'Present', worked_for = null.
 * - If action === 'OUT', sets punch_out = now, status = calculatedStatus, worked_for = null.
 */
export async function syncStaffAttendanceOnPunch(
    staffId: number,
    action: 'IN' | 'OUT',
    nowIso: string,
    calculatedStatus?: string
): Promise<void> {
    const today = getTodayIST();

    // 1. Check existing record in staff_attendance
    let existingRecord: any = null;
    try {
        const { data, error } = await supabase
            .from('staff_attendance')
            .select('*')
            .eq('staff_id', staffId)
            .eq('date', today)
            .maybeSingle();

        if (!error && data) {
            existingRecord = data;
        }
    } catch (e) {
        console.warn('[Kiosk] Error fetching staff_attendance:', e);
    }

    if (!existingRecord) {
        const localAtt = loadBackupJson<any[]>('staff_attendance.json', []);
        existingRecord = localAtt.find((a) => Number(a.staff_id) === Number(staffId) && a.date === today) || null;
    }

    const payload: any = {
        staff_id: staffId,
        date: today,
        worked_for: null,
        status_papa: null,
    };

    if (action === 'IN') {
        payload.status = existingRecord?.status || 'Present';
        // Preserve earliest punch_in if already present
        payload.punch_in = existingRecord?.punch_in || nowIso;
        if (existingRecord?.punch_out) {
            payload.punch_out = existingRecord.punch_out;
        }
    } else {
        // action === 'OUT'
        payload.punch_in = existingRecord?.punch_in || nowIso;
        payload.punch_out = nowIso;
        payload.status = calculatedStatus || 'Present';
    }

    // Persist to Supabase
    try {
        await supabase
            .from('staff_attendance')
            .upsert(payload, { onConflict: 'staff_id,date' });
    } catch (e) {
        console.warn('[Kiosk] Supabase staff_attendance upsert warning:', e);
    }

    // Persist to local backup
    const localAtt = loadBackupJson<any[]>('staff_attendance.json', []);
    const idx = localAtt.findIndex((a) => Number(a.staff_id) === Number(staffId) && a.date === today);
    if (idx >= 0) {
        localAtt[idx] = { ...localAtt[idx], ...payload };
    } else {
        localAtt.push({ id: `local-${Date.now()}`, ...payload, created_at: nowIso });
    }
    saveBackupJson('staff_attendance.json', localAtt);
}
