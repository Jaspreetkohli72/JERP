import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getTodayIST, loadBackupJson, saveBackupJson, invalidateKioskCache } from '@/lib/kiosk';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
    try {
        let body: any = null;
        try {
            body = await request.json();
        } catch {
            return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
        }

        const { staffId, amount, notes, givenBy } = body || {};

        const numStaffId = parseInt(String(staffId), 10);
        const numAmount = Number(amount);

        if (isNaN(numStaffId) || isNaN(numAmount) || numAmount <= 0) {
            return NextResponse.json(
                { error: 'Invalid parameters. Expected: { staffId: string, amount: positive number, notes?: string }' },
                { status: 400 }
            );
        }

        // 1. Verify staff exists and is active via direct indexed query
        let staffMember: any = null;
        try {
            const { data } = await supabase.from('staff').select('id, name, status').eq('id', numStaffId).maybeSingle();
            if (data) staffMember = data;
        } catch (e) {
            console.warn('[Kiosk Advance] Staff query error:', e);
        }
        if (!staffMember) {
            const staffList = loadBackupJson<any[]>('staff.json', []);
            staffMember = staffList.find((s: any) => Number(s.id) === numStaffId) || null;
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

        const today = getTodayIST();
        const nowIso = new Date().toISOString();

        // Use custom notes from radio button selection (e.g. "Sandeep", "Harjeet", etc.) or fallback
        const advanceNotes = (typeof notes === 'string' && notes.trim())
            ? notes.trim()
            : (typeof givenBy === 'string' && givenBy.trim() ? givenBy.trim() : 'Kiosk Advance');

        const advancePayload = {
            staff_id: numStaffId,
            amount: numAmount,
            date: today,
            notes: advanceNotes,
            created_at: nowIso,
        };

        // 2. Persist to Supabase
        try {
            const { error } = await supabase.from('staff_advances').insert([advancePayload]);
            if (error) console.warn('[Kiosk Advance] Supabase insert warning:', error.message);
        } catch (e) {
            console.warn('[Kiosk Advance] Supabase insert exception:', e);
        }

        // 3. Persist to local backup
        const localAdvances = loadBackupJson<any[]>('staff_advances.json', []);
        localAdvances.push({ id: `kiosk-${Date.now()}`, ...advancePayload });
        saveBackupJson('staff_advances.json', localAdvances);

        invalidateKioskCache();

        return NextResponse.json(
            {
                success: true,
                message: 'Advance recorded',
            },
            { status: 200 }
        );
    } catch (e: any) {
        console.error('[Kiosk API] POST /api/kiosk/advance error:', e);
        return NextResponse.json({ error: 'Internal server error while recording advance' }, { status: 500 });
    }
}
