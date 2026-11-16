import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { revalidatePath } from 'next/cache';
import {
    getActiveStaffKioskList,
    loadBackupJson,
    saveBackupJson,
    getTodayIST,
    invalidateKioskCache,
    addStaffToCache,
    updateStaffInCache
} from '@/lib/kiosk';

export const dynamic = 'force-dynamic';

/**
 * GET /api/kiosk/staff
 * Fetch active staff or all staff (with ?all=true), or a single staff by ?id=...
 */
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const idParam = searchParams.get('id');
        const includeAll = searchParams.get('all') === 'true' || searchParams.get('all') === '1' || !!idParam;

        const staffList = await getActiveStaffKioskList({ includeAll });

        const cdnHeaders = {
            'Cache-Control': 'public, s-maxage=1, stale-while-revalidate=5',
            'CDN-Cache-Control': 'public, s-maxage=1, stale-while-revalidate=5',
            'Vercel-CDN-Cache-Control': 'public, s-maxage=1, stale-while-revalidate=5',
        };

        if (idParam) {
            const member = staffList.find((s) => String(s.id) === String(idParam));
            if (!member) {
                return NextResponse.json({ error: 'Staff member not found' }, { status: 404 });
            }
            return NextResponse.json(member, { status: 200, headers: cdnHeaders });
        }

        return NextResponse.json(staffList, { status: 200, headers: cdnHeaders });
    } catch (e: any) {
        console.error('[Kiosk API] GET /api/kiosk/staff error:', e);
        return NextResponse.json({ error: 'Failed to fetch staff' }, { status: 500 });
    }
}

/**
 * POST /api/kiosk/staff
 * Create a new staff member.
 * Body: { name: string, role?: string, salary?: number, phone?: string, status?: string }
 */
export async function POST(request: NextRequest) {
    try {
        let body: any = null;
        try {
            body = await request.json();
        } catch {
            return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
        }

        const { name, role, salary, phone, status } = body || {};

        if (!name || typeof name !== 'string' || !name.trim()) {
            return NextResponse.json({ error: 'Staff name is required' }, { status: 400 });
        }

        const parsedSalary = salary !== undefined && salary !== null && !isNaN(Number(salary)) ? Math.max(0, Number(salary)) : 0;
        const staffRole = role && typeof role === 'string' && role.trim() ? role.trim() : 'Helper';
        const staffStatus = status && typeof status === 'string' && status.trim() ? status.trim() : 'Available';
        const staffPhone = phone && typeof phone === 'string' ? phone.trim() : '';

        const newStaffRecord = {
            name: name.trim(),
            role: staffRole,
            salary: parsedSalary,
            phone: staffPhone,
            status: staffStatus,
            created_at: new Date().toISOString(),
        };

        // 1. Insert into Supabase
        let createdMember: any = null;
        try {
            const { data, error } = await supabase
                .from('staff')
                .insert([newStaffRecord])
                .select()
                .single();

            if (!error && data) {
                createdMember = data;
            } else if (error) {
                console.warn('[Kiosk API] Staff insert error:', error.message);
            }
        } catch (dbErr) {
            console.warn('[Kiosk API] Staff insert exception:', dbErr);
        }

        // Fallback if database direct insert failed
        if (!createdMember) {
            createdMember = {
                id: Date.now(),
                ...newStaffRecord,
            };
        }

        // 2. Sync to local backup
        try {
            const localStaff = loadBackupJson<any[]>('staff.json', []);
            localStaff.push(createdMember);
            saveBackupJson('staff.json', localStaff);
        } catch (backupErr) {
            console.warn('[Kiosk API] Staff backup sync warning:', backupErr);
        }

        revalidatePath('/staff');
        revalidatePath('/staff/calendar');
        revalidatePath('/staff/attendance');
        addStaffToCache(createdMember);
        invalidateKioskCache();

        return NextResponse.json(
            {
                success: true,
                message: 'Staff member created successfully',
                staff: {
                    id: String(createdMember.id),
                    name: createdMember.name,
                    role: createdMember.role,
                    salary: createdMember.salary,
                    phone: createdMember.phone || '',
                    status: createdMember.status,
                    clockedIn: false,
                    since: null,
                },
            },
            { status: 201 }
        );
    } catch (e: any) {
        console.error('[Kiosk API] POST /api/kiosk/staff error:', e);
        return NextResponse.json({ error: 'Internal server error while creating staff' }, { status: 500 });
    }
}

/**
 * PUT & PATCH /api/kiosk/staff
 * Update an existing staff member.
 * Body: { id: string | number, name?: string, role?: string, salary?: number, phone?: string, status?: string }
 */
export async function PUT(request: NextRequest) {
    return handleUpdateStaff(request);
}

export async function PATCH(request: NextRequest) {
    return handleUpdateStaff(request);
}

async function handleUpdateStaff(request: NextRequest) {
    try {
        let body: any = null;
        try {
            body = await request.json();
        } catch {
            return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
        }

        const { searchParams } = new URL(request.url);
        const staffId = body?.id || searchParams.get('id');

        if (!staffId) {
            return NextResponse.json(
                { error: 'Missing staff id. Provide in body { id: "..." } or query ?id=...' },
                { status: 400 }
            );
        }

        const numStaffId = parseInt(String(staffId), 10);
        if (isNaN(numStaffId)) {
            return NextResponse.json({ error: 'Invalid staff id' }, { status: 400 });
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

        // 1. Update in Supabase
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

        // 2. Sync to local backup
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
        revalidatePath(`/staff/${staffId}`);
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
        console.error('[Kiosk API] PUT /api/kiosk/staff error:', e);
        return NextResponse.json({ error: 'Internal server error while updating staff' }, { status: 500 });
    }
}

/**
 * DELETE /api/kiosk/staff
 * Deleting staff members via API is strictly disallowed.
 */
export async function DELETE() {
    return NextResponse.json(
        { error: 'Deleting staff members via API is disabled. Staff can only be deleted by admins via the web dashboard.' },
        { status: 403 }
    );
}
