import { supabase } from '@/lib/supabase';
import fs from 'fs';
import path from 'path';

export interface KioskStaffItem {
    id: string;
    name: string;
    role?: string;
    salary?: number;
    phone?: string;
    status?: string;
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

interface KioskStore {
    lastSyncedAt: number;
    today: string;
    allStaff: KioskStaffItem[];
    activeStaff: KioskStaffItem[];
}

let kioskStore: KioskStore | null = null;
let activeSyncPromise: Promise<void> | null = null;

/**
 * Triggers background refresh from database, deduplicating concurrent sync calls.
 */
async function refreshKioskStore(): Promise<void> {
    if (activeSyncPromise) {
        return activeSyncPromise;
    }

    activeSyncPromise = (async () => {
        try {
            const today = getTodayIST();
            let staffList: any[] = [];
            let todayPunches: PunchRecord[] = [];
            let todayAttendance: any[] = [];

            try {
                const [staffRes, punchesRes, attRes] = await Promise.all([
                    supabase.from('staff').select('*').order('name', { ascending: true }),
                    supabase.from('staff_punches').select('*').eq('date', today).order('punched_at', { ascending: true }),
                    supabase.from('staff_attendance').select('*').eq('date', today),
                ]);

                if (staffRes.data && staffRes.data.length > 0) staffList = staffRes.data;
                if (punchesRes.data && punchesRes.data.length > 0) todayPunches = punchesRes.data;
                if (attRes.data && attRes.data.length > 0) todayAttendance = attRes.data;
            } catch (e) {
                console.warn('[Kiosk] Parallel Supabase query warning:', e);
            }

            // Fallbacks to local files if database is empty/offline
            if (staffList.length === 0) {
                staffList = loadBackupJson<any[]>('staff.json', []);
            }
            if (todayPunches.length === 0) {
                const local = loadBackupJson<PunchRecord[]>('staff_punches.json', []);
                todayPunches = local.filter((p) => p.date === today);
            }
            if (todayAttendance.length === 0) {
                const localAtt = loadBackupJson<any[]>('staff_attendance.json', []);
                todayAttendance = localAtt.filter((a) => a.date === today);
            }

            const punchesByStaff = new Map<number, PunchRecord[]>();
            for (const p of todayPunches) {
                const list = punchesByStaff.get(p.staff_id) || [];
                list.push(p);
                punchesByStaff.set(p.staff_id, list);
            }

            const attendanceByStaff = new Map<number, any>();
            for (const a of todayAttendance) {
                attendanceByStaff.set(Number(a.staff_id), a);
            }

            const allStaff: KioskStaffItem[] = staffList.map((s: any) => {
                const staffIdNum = Number(s.id);
                const sPunches = punchesByStaff.get(staffIdNum) || [];
                sPunches.sort((a, b) => new Date(a.punched_at).getTime() - new Date(b.punched_at).getTime());

                let isClockedIn = false;
                let sinceTime: string | null = null;

                if (sPunches.length > 0) {
                    const latestPunch = sPunches[sPunches.length - 1];
                    isClockedIn = latestPunch.punch_type === 'IN';
                    sinceTime = isClockedIn ? formatTimeIST(latestPunch.punched_at) : null;
                } else {
                    const att = attendanceByStaff.get(staffIdNum);
                    if (att) {
                        if (att.punch_in && !att.punch_out) {
                            isClockedIn = true;
                            sinceTime = formatTimeIST(att.punch_in);
                        } else if (att.work_done && typeof att.work_done === 'string') {
                            const inMatch = att.work_done.match(/In:\s*(\d{1,2}:\d{2}\s*(?:AM|PM))/i);
                            const hasOut = /Out:\s*(\d{1,2}:\d{2}\s*(?:AM|PM))/i.test(att.work_done);
                            if (inMatch && !hasOut) {
                                isClockedIn = true;
                                sinceTime = inMatch[1];
                            }
                        }
                    }
                }

                return {
                    id: String(s.id),
                    name: s.name,
                    role: s.role,
                    salary: s.salary !== undefined && s.salary !== null ? Number(s.salary) : 0,
                    phone: s.phone || '',
                    status: s.status || 'Available',
                    clockedIn: isClockedIn,
                    since: sinceTime,
                };
            });

            allStaff.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));

            const activeStaff = allStaff.filter(
                (s) => !s.status?.startsWith('Terminated') && !s.status?.startsWith('On Leave')
            );

            kioskStore = {
                lastSyncedAt: Date.now(),
                today,
                allStaff,
                activeStaff,
            };
        } finally {
            activeSyncPromise = null;
        }
    })();

    return activeSyncPromise;
}

/**
 * Instantly updates live punch status in memory (0ms latency, zero DB delay).
 */
export function updatePunchInCache(staffId: number, isClockedIn: boolean, sinceTime: string | null): void {
    if (!kioskStore) return;
    const strId = String(staffId);
    for (const s of kioskStore.allStaff) {
        if (s.id === strId) {
            s.clockedIn = isClockedIn;
            s.since = sinceTime;
            break;
        }
    }
    for (const s of kioskStore.activeStaff) {
        if (s.id === strId) {
            s.clockedIn = isClockedIn;
            s.since = sinceTime;
            break;
        }
    }
    kioskStore.lastSyncedAt = Date.now();
}

/**
 * Instantly updates staff details in memory (0ms latency).
 */
export function updateStaffInCache(staffId: number, updates: Partial<KioskStaffItem>): void {
    if (!kioskStore) return;
    const strId = String(staffId);
    for (const s of kioskStore.allStaff) {
        if (s.id === strId) {
            if (updates.name !== undefined) s.name = updates.name;
            if (updates.role !== undefined) s.role = updates.role;
            if (updates.salary !== undefined) s.salary = updates.salary;
            if (updates.phone !== undefined) s.phone = updates.phone;
            if (updates.status !== undefined) s.status = updates.status;
            break;
        }
    }
    kioskStore.allStaff.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));
    kioskStore.activeStaff = kioskStore.allStaff.filter(
        (s) => !s.status?.startsWith('Terminated') && !s.status?.startsWith('On Leave')
    );
    kioskStore.lastSyncedAt = Date.now();
}

/**
 * Instantly adds a newly created staff member to memory (0ms latency).
 */
export function addStaffToCache(newStaff: any): void {
    if (!kioskStore) return;
    const item: KioskStaffItem = {
        id: String(newStaff.id),
        name: newStaff.name,
        role: newStaff.role || 'Helper',
        salary: Number(newStaff.salary) || 0,
        phone: newStaff.phone || '',
        status: newStaff.status || 'Available',
        clockedIn: false,
        since: null,
    };
    kioskStore.allStaff.push(item);
    kioskStore.allStaff.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));
    kioskStore.activeStaff = kioskStore.allStaff.filter(
        (s) => !s.status?.startsWith('Terminated') && !s.status?.startsWith('On Leave')
    );
    kioskStore.lastSyncedAt = Date.now();
}

export function invalidateKioskCache(): void {
    if (kioskStore) {
        // Mark stale so next request triggers background sync without blowing away memory
        kioskStore.lastSyncedAt = 0;
    }
    // Fire-and-forget sync in the background
    refreshKioskStore().catch(() => {});
}

/**
 * Resolves the list of staff members with live clock-in status.
 * - Returns from hot memory in <5ms on 99% of requests.
 * - Triggers non-blocking background refresh if data is older than 1,000ms.
 * - Single-flight deduplication ensures only 1 DB query runs at a time even with 100+ req/s.
 */
export async function getActiveStaffKioskList(options?: {
    includeAll?: boolean;
    bypassCache?: boolean;
}): Promise<KioskStaffItem[]> {
    const includeAll = options?.includeAll ?? false;
    const bypassCache = options?.bypassCache ?? false;
    const today = getTodayIST();
    const now = Date.now();

    // Cold start, day rollover, or explicit bypass: wait for initial load
    if (!kioskStore || kioskStore.today !== today || bypassCache) {
        await refreshKioskStore();
        return includeAll ? (kioskStore?.allStaff || []) : (kioskStore?.activeStaff || []);
    }

    // Hot memory hit (<5ms)
    const result = includeAll ? kioskStore.allStaff : kioskStore.activeStaff;

    // Background sync if data is older than 1000ms (1 second), without blocking caller
    if (now - kioskStore.lastSyncedAt > 1000 && !activeSyncPromise) {
        refreshKioskStore().catch((err) => console.warn('[Kiosk] Background sync error:', err));
    }

    return result;
}

/**
 * Updates staff_attendance for (staff_id, todayIST):
 * - If action === 'IN', sets punch_in if not present, status = 'Present', worked_for = null.
 * - If action === 'OUT', sets punch_out = now, status = calculatedStatus, worked_for = null.
 * Works seamlessly whether punch_in/punch_out columns exist in Supabase or uses work_done.
 */
export async function syncStaffAttendanceOnPunch(
    staffId: number,
    action: 'IN' | 'OUT',
    nowIso: string,
    calculatedStatus?: string,
    explicitPunchIn?: string,
    existingAttendanceRecord?: any
): Promise<void> {
    const today = getTodayIST();

    // 1. Check existing record in staff_attendance (use pre-fetched record if available)
    let existingRecord: any = existingAttendanceRecord || null;
    if (!existingRecord) {
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
    }

    const existingWorkDone = existingRecord?.work_done || '';
    const cleanWorkDone = existingWorkDone
        .replace(/🕒?\s*In:\s*\d{1,2}:\d{2}\s*(?:AM|PM)?(?:\s*\|\s*Out:\s*\d{1,2}:\d{2}\s*(?:AM|PM)?)?/gi, '')
        .trim();

    const payloadWithColumns: any = {
        staff_id: staffId,
        date: today,
        worked_for: existingRecord?.worked_for || null,
        status_papa: existingRecord?.status_papa || null,
        work_done: cleanWorkDone || null,
    };

    if (action === 'IN') {
        payloadWithColumns.status = existingRecord?.status === 'Half-Day' || existingRecord?.status === 'Overtime' ? existingRecord.status : 'Present';
        // Preserve earliest punch_in if already present
        payloadWithColumns.punch_in = existingRecord?.punch_in || explicitPunchIn || nowIso;
        if (existingRecord?.punch_out) {
            payloadWithColumns.punch_out = existingRecord.punch_out;
        }
    } else {
        // action === 'OUT': resolve earliest punch_in of the day
        let resolvedPunchIn = explicitPunchIn || existingRecord?.punch_in;

        if (!resolvedPunchIn) {
            // Check staff_punches table for today's earliest IN punch
            try {
                const todayPunches = await getPunchesForDate(today);
                const workerInPunches = todayPunches
                    .filter((p) => Number(p.staff_id) === Number(staffId) && p.punch_type === 'IN')
                    .sort((a, b) => new Date(a.punched_at).getTime() - new Date(b.punched_at).getTime());
                if (workerInPunches.length > 0) {
                    resolvedPunchIn = workerInPunches[0].punched_at;
                }
            } catch (pErr) {
                console.warn('[Kiosk] Error finding earliest punch IN:', pErr);
            }
        }

        // Final fallback only if no prior punch IN exists
        resolvedPunchIn = resolvedPunchIn || nowIso;

        payloadWithColumns.punch_in = resolvedPunchIn;
        payloadWithColumns.punch_out = nowIso;
        payloadWithColumns.status = calculatedStatus || 'Present';
    }

    // 2. Persist to Supabase: first try with punch columns, fallback to standard schema if columns not yet added
    let upsertOk = false;
    try {
        const { error } = await supabase
            .from('staff_attendance')
            .upsert(payloadWithColumns, { onConflict: 'staff_id,date' });
        if (!error) {
            upsertOk = true;
        } else {
            console.warn('[Kiosk] Supabase upsert error with punch columns:', error.message);
        }
    } catch (e) {
        console.warn('[Kiosk] Supabase staff_attendance upsert warning:', e);
    }

    if (!upsertOk) {
        try {
            const fallbackPayload = {
                staff_id: staffId,
                date: today,
                status: payloadWithColumns.status,
                worked_for: null,
                status_papa: null,
                work_done: payloadWithColumns.work_done,
            };
            const { error: fbErr } = await supabase
                .from('staff_attendance')
                .upsert(fallbackPayload, { onConflict: 'staff_id,date' });
            if (fbErr) {
                console.warn('[Kiosk] Fallback upsert failed:', fbErr.message);
            }
        } catch (e) {
            console.warn('[Kiosk] Fallback upsert exception:', e);
        }
    }

    // 3. Persist to local backup
    const localAtt = loadBackupJson<any[]>('staff_attendance.json', []);
    const idx = localAtt.findIndex((a) => Number(a.staff_id) === Number(staffId) && a.date === today);
    if (idx >= 0) {
        localAtt[idx] = { ...localAtt[idx], ...payloadWithColumns };
    } else {
        localAtt.push({ id: `local-${Date.now()}`, ...payloadWithColumns, created_at: nowIso });
    }
    saveBackupJson('staff_attendance.json', localAtt);
}
