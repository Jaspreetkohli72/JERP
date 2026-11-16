import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import {
    getTodayIST,
    formatTimeIST,
    calculateAttendanceStatus,
    calculateCumulativeWorkedHours,
    getPunchesForDate,
    recordPunchEvent,
    syncStaffAttendanceOnPunch,
    getActiveStaffKioskList,
    invalidateKioskCache,
    updatePunchInCache,
    loadBackupJson,
    PunchRecord
} from '@/lib/kiosk';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
    try {
        let body: any = null;
        try {
            body = await request.json();
        } catch {
            return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
        }

        const { staffId, action } = body || {};

        if (!staffId || !action || !['IN', 'OUT'].includes(action)) {
            return NextResponse.json(
                { error: 'Missing or invalid parameters. Expected: { staffId: string, action: "IN" | "OUT" }' },
                { status: 400 }
            );
        }

        const numStaffId = parseInt(String(staffId), 10);
        if (isNaN(numStaffId)) {
            return NextResponse.json({ error: 'Invalid staffId. Must be a numeric ID.' }, { status: 400 });
        }

        const today = getTodayIST();
        const nowIso = new Date().toISOString();

        // 1. High-speed parallel queries targeting specifically this worker (1 single round-trip)
        let staffMember: any = null;
        let workerPunches: PunchRecord[] = [];
        let existingAtt: any = null;

        try {
            const [staffRes, punchesRes, attRes] = await Promise.all([
                supabase.from('staff').select('*').eq('id', numStaffId).maybeSingle(),
                supabase.from('staff_punches').select('*').eq('staff_id', numStaffId).eq('date', today).order('punched_at', { ascending: true }),
                supabase.from('staff_attendance').select('*').eq('staff_id', numStaffId).eq('date', today).maybeSingle()
            ]);

            if (staffRes.data) staffMember = staffRes.data;
            if (punchesRes.data) workerPunches = punchesRes.data;
            if (attRes.data) existingAtt = attRes.data;
        } catch (e) {
            console.warn('[Kiosk Punch] Parallel query error:', e);
        }

        // Fallbacks to local files if database is offline or empty
        if (!staffMember) {
            const localStaff = loadBackupJson<any[]>('staff.json', []);
            staffMember = localStaff.find((s: any) => Number(s.id) === numStaffId) || null;
        }
        if (!staffMember) {
            return NextResponse.json({ error: 'Staff member not found' }, { status: 404 });
        }

        if (staffMember.status?.startsWith('Terminated') || staffMember.status?.startsWith('On Leave')) {
            return NextResponse.json(
                { error: `Staff member is not active (Status: ${staffMember.status})` },
                { status: 400 }
            );
        }

        if (workerPunches.length === 0) {
            const localPunches = loadBackupJson<PunchRecord[]>('staff_punches.json', []);
            workerPunches = localPunches
                .filter((p) => Number(p.staff_id) === numStaffId && p.date === today)
                .sort((a, b) => new Date(a.punched_at).getTime() - new Date(b.punched_at).getTime());
        }
        if (!existingAtt) {
            const localAtt = loadBackupJson<any[]>('staff_attendance.json', []);
            existingAtt = localAtt.find((a: any) => Number(a.staff_id) === numStaffId && a.date === today) || null;
        }

        // Determine live punch state
        const latestPunch = workerPunches.length > 0 ? workerPunches[workerPunches.length - 1] : null;
        let isClockedIn = latestPunch?.punch_type === 'IN';

        if (workerPunches.length === 0 && existingAtt) {
            if (existingAtt.punch_in && !existingAtt.punch_out) {
                isClockedIn = true;
            } else if (existingAtt.work_done && typeof existingAtt.work_done === 'string') {
                const inMatch = existingAtt.work_done.match(/In:\s*(\d{1,2}:\d{2}\s*(?:AM|PM))/i);
                const hasOut = /Out:\s*(\d{1,2}:\d{2}\s*(?:AM|PM))/i.test(existingAtt.work_done);
                if (inMatch && !hasOut) {
                    isClockedIn = true;
                }
            }
        }

        // 2. Prevent duplicate consecutive punches
        if (action === 'IN' && isClockedIn) {
            return NextResponse.json({ error: 'Already clocked in' }, { status: 400 });
        }
        if (action === 'OUT' && !isClockedIn) {
            return NextResponse.json({ error: 'Not clocked in' }, { status: 400 });
        }

        let message = '';

        if (action === 'IN') {
            const newPunch: PunchRecord = {
                staff_id: numStaffId,
                punch_type: 'IN',
                punched_at: nowIso,
                date: today,
            };
            await Promise.all([
                recordPunchEvent(newPunch),
                syncStaffAttendanceOnPunch(numStaffId, 'IN', nowIso, undefined, undefined, existingAtt)
            ]);
            message = `Punched IN successfully at ${formatTimeIST(nowIso)}`;
        } else {
            // action === 'OUT'
            const newPunch: PunchRecord = {
                staff_id: numStaffId,
                punch_type: 'OUT',
                punched_at: nowIso,
                date: today,
            };
            // Calculate total cumulative worked hours across all completed IN/OUT pairs today
            let totalHours = 0;
            if (workerPunches.length > 0) {
                const allPunchesToday = [...workerPunches, newPunch];
                totalHours = calculateCumulativeWorkedHours(allPunchesToday);
            } else if (existingAtt?.punch_in) {
                totalHours = Math.max(0, (new Date(nowIso).getTime() - new Date(existingAtt.punch_in).getTime()) / (1000 * 3600));
            } else if (existingAtt?.created_at) {
                totalHours = Math.max(0, (new Date(nowIso).getTime() - new Date(existingAtt.created_at).getTime()) / (1000 * 3600));
            }

            const calculatedStatus = calculateAttendanceStatus(totalHours);
            const inPunches = workerPunches.filter((p) => p.punch_type === 'IN');
            const earliestInIso = inPunches.length > 0 ? inPunches[0].punched_at : (existingAtt?.punch_in || undefined);

            await Promise.all([
                recordPunchEvent(newPunch),
                syncStaffAttendanceOnPunch(numStaffId, 'OUT', nowIso, calculatedStatus, earliestInIso, existingAtt)
            ]);

            const hoursDisplay = totalHours.toFixed(1);
            message = `Punched OUT successfully (Total: ${hoursDisplay} hrs, Status: ${calculatedStatus})`;
        }

        // 3. Instantly update live in-memory status (0ms delay) and trigger background sync
        const isClockedInNow = action === 'IN';
        const sinceTimeNow = isClockedInNow ? formatTimeIST(nowIso) : null;
        updatePunchInCache(numStaffId, isClockedInNow, sinceTimeNow);
        invalidateKioskCache();
        const updatedStaff = await getActiveStaffKioskList();

        return NextResponse.json(
            {
                success: true,
                message,
                staff: updatedStaff,
            },
            { status: 200 }
        );
    } catch (e: any) {
        console.error('[Kiosk API] POST /api/kiosk/punch error:', e);
        return NextResponse.json({ error: 'Internal server error while processing punch' }, { status: 500 });
    }
}
