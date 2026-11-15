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

        // 1. Verify staff exists and is active
        let staffList: any[] = [];
        try {
            const { data } = await supabase.from('staff').select('*');
            if (data && data.length > 0) staffList = data;
        } catch (e) {
            console.warn('[Kiosk Punch] Staff query error:', e);
        }
        if (staffList.length === 0) {
            staffList = loadBackupJson<any[]>('staff.json', []);
        }

        const staffMember = staffList.find((s: any) => Number(s.id) === numStaffId);
        if (!staffMember) {
            return NextResponse.json({ error: 'Staff member not found' }, { status: 404 });
        }

        if (staffMember.status?.startsWith('Terminated') || staffMember.status?.startsWith('On Leave')) {
            return NextResponse.json(
                { error: `Staff member is not active (Status: ${staffMember.status})` },
                { status: 400 }
            );
        }

        const today = getTodayIST();
        const nowIso = new Date().toISOString();

        // 2. Query today's punches strictly for today's IST date
        const todayPunches = await getPunchesForDate(today);
        const workerPunches = todayPunches
            .filter((p) => Number(p.staff_id) === numStaffId)
            .sort((a, b) => new Date(a.punched_at).getTime() - new Date(b.punched_at).getTime());

        const latestPunch = workerPunches.length > 0 ? workerPunches[workerPunches.length - 1] : null;
        let isClockedIn = latestPunch?.punch_type === 'IN';

        // Check fallback in staff_attendance if staff_punches table is empty / pending migration
        let existingAtt: any = null;
        try {
            const { data } = await supabase
                .from('staff_attendance')
                .select('*')
                .eq('staff_id', numStaffId)
                .eq('date', today)
                .maybeSingle();
            if (data) existingAtt = data;
        } catch (e) {
            console.warn('[Kiosk Punch] Attendance check error:', e);
        }

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

        // 3. Prevent duplicate consecutive punches
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
            await recordPunchEvent(newPunch);
            await syncStaffAttendanceOnPunch(numStaffId, 'IN', nowIso);
            message = `Punched IN successfully at ${formatTimeIST(nowIso)}`;
        } else {
            // action === 'OUT'
            const newPunch: PunchRecord = {
                staff_id: numStaffId,
                punch_type: 'OUT',
                punched_at: nowIso,
                date: today,
            };
            await recordPunchEvent(newPunch);

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

            await syncStaffAttendanceOnPunch(numStaffId, 'OUT', nowIso, calculatedStatus, earliestInIso);

            const hoursDisplay = totalHours.toFixed(1);
            message = `Punched OUT successfully (Total: ${hoursDisplay} hrs, Status: ${calculatedStatus})`;
        }

        // 4. Return refreshed active staff list so the tablet UI updates immediately
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
