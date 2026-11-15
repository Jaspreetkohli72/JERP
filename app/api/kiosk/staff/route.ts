import { NextRequest, NextResponse } from 'next/server';
import { getActiveStaffKioskList } from '@/lib/kiosk';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const includeAll = searchParams.get('all') === 'true' || searchParams.get('all') === '1';
        const staff = await getActiveStaffKioskList({ includeAll });
        return NextResponse.json(staff, { status: 200 });
    } catch (e: any) {
        console.error('[Kiosk API] GET /api/kiosk/staff error:', e);
        return NextResponse.json({ error: 'Failed to fetch staff' }, { status: 500 });
    }
}
