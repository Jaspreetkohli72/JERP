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
        const isClockedIn = latestPunch?.punch_type === 'IN';

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
            const allPunchesToday = [...workerPunches, newPunch];
            const totalHours = calculateCumulativeWorkedHours(allPunchesToday);
            const calculatedStatus = calculateAttendanceStatus(totalHours);

            await syncStaffAttendanceOnPunch(numStaffId, 'OUT', nowIso, calculatedStatus);

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
