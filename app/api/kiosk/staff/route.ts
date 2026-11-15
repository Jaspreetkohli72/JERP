import { NextResponse } from 'next/server';
import { getActiveStaffKioskList } from '@/lib/kiosk';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const staff = await getActiveStaffKioskList();
        return NextResponse.json(staff, { status: 200 });
    } catch (e: any) {
        console.error('[Kiosk API] GET /api/kiosk/staff error:', e);
        return NextResponse.json({ error: 'Failed to fetch staff' }, { status: 500 });
    }
}
