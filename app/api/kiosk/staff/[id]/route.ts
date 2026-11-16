import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { revalidatePath } from 'next/cache';
import {
    getActiveStaffKioskList,
    loadBackupJson,
    saveBackupJson,
    getTodayIST,
    invalidateKioskCache,
    updateStaffInCache
} from '@/lib/kiosk';

export const dynamic = 'force-dynamic';

/**
 * GET /api/kiosk/staff/[id]
 * Fetch a specific staff member by ID.
 */
export async function GET(
    request: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await context.params;
        const staffList = await getActiveStaffKioskList({ includeAll: true });
        const member = staffList.find((s) => String(s.id) === String(id));

        if (!member) {
            return NextResponse.json({ error: 'Staff member not found' }, { status: 404 });
        }

        return NextResponse.json(member, { status: 200 });
    } catch (e: any) {
        console.error('[Kiosk API] GET /api/kiosk/staff/[id] error:', e);
        return NextResponse.json({ error: 'Failed to fetch staff member' }, { status: 500 });
    }
}

/**
 * PUT & PATCH /api/kiosk/staff/[id]
 * Update a specific staff member.
 * Body: { name?: string, role?: string, salary?: number, phone?: string, status?: string }
 */
export async function PUT(
    request: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    return handleUpdateById(request, context);
}

export async function PATCH(
    request: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    return handleUpdateById(request, context);
}

async function handleUpdateById(
    request: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await context.params;
        const numStaffId = parseInt(String(id), 10);
        if (isNaN(numStaffId)) {
            return NextResponse.json({ error: 'Invalid staff id' }, { status: 400 });
        }

        let body: any = null;
        try {
            body = await request.json();
        } catch {
            return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
        }

        const updates: any = {};
        if (body.name !== undefined) {
            if (typeof body.name !== 'string' || !body.name.trim()) {
                return NextResponse.json({ error: 'Staff name cannot be empty' }, { status: 400 });
            }
            updates.name = body.name.trim();
        }
        if (body.role !== undefined) {
            updates.role = String(body.role).trim();
        }
        if (body.salary !== undefined) {
            const numSal = Number(body.salary);
            if (isNaN(numSal) || numSal < 0) {
                return NextResponse.json({ error: 'Salary must be a positive number' }, { status: 400 });
            }
            updates.salary = numSal;
        }
        if (body.phone !== undefined) {
            updates.phone = String(body.phone).trim();
        }
        if (body.status !== undefined) {
            const rawStatus = String(body.status).trim();
            if (rawStatus.toLowerCase() === 'terminated' && !rawStatus.includes(':')) {
                const today = getTodayIST();
                updates.status = `Terminated:${today}`;
            } else {
                updates.status = rawStatus;
            }
        }

        if (Object.keys(updates).length === 0) {
            return NextResponse.json({ error: 'No fields provided to update' }, { status: 400 });
        }

        let updatedRecord: any = null;
        try {
            const { data, error } = await supabase
                .from('staff')
                .update(updates)
                .eq('id', numStaffId)
                .select()
                .maybeSingle();

            if (!error && data) {
                updatedRecord = data;
            } else if (error) {
                console.warn('[Kiosk API] Staff update error:', error.message);
            }
        } catch (dbErr) {
            console.warn('[Kiosk API] Staff update exception:', dbErr);
        }

        try {
            const localStaff = loadBackupJson<any[]>('staff.json', []);
            const idx = localStaff.findIndex((s: any) => Number(s.id) === numStaffId);
            if (idx >= 0) {
                localStaff[idx] = { ...localStaff[idx], ...updates };
                saveBackupJson('staff.json', localStaff);
                if (!updatedRecord) updatedRecord = localStaff[idx];
            }
        } catch (backupErr) {
            console.warn('[Kiosk API] Staff backup sync warning:', backupErr);
        }

        if (!updatedRecord) {
            return NextResponse.json({ error: 'Staff member not found' }, { status: 404 });
        }

        revalidatePath('/staff');
        revalidatePath('/staff/calendar');
        revalidatePath('/staff/attendance');
        revalidatePath(`/staff/${id}`);
        updateStaffInCache(numStaffId, updates);
        invalidateKioskCache();

        return NextResponse.json(
            {
                success: true,
                message: 'Staff member updated successfully',
                staff: {
                    id: String(updatedRecord.id),
                    name: updatedRecord.name,
                    role: updatedRecord.role,
                    salary: updatedRecord.salary,
                    phone: updatedRecord.phone || '',
                    status: updatedRecord.status,
                },
            },
            { status: 200 }
        );
    } catch (e: any) {
        console.error('[Kiosk API] PUT /api/kiosk/staff/[id] error:', e);
        return NextResponse.json({ error: 'Internal server error while updating staff' }, { status: 500 });
    }
}

/**
 * DELETE /api/kiosk/staff/[id]
 * Deleting staff members via API is strictly disallowed.
 */
export async function DELETE() {
    return NextResponse.json(
        { error: 'Deleting staff members via API is disabled. Staff can only be deleted by admins via the web dashboard.' },
        { status: 403 }
    );
}
