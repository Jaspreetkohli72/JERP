import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { loadBackupJson, saveBackupJson } from '@/lib/kiosk';

export const dynamic = 'force-dynamic';

const NO_CACHE_HEADERS = {
    'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0',
};

/**
 * GET /api/kiosk/health
 * Fetch latest telemetry / health state for all kiosks or a specific device (?device_id=...)
 */
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const deviceId = searchParams.get('device_id');

        let records: any[] = [];
        let dbSuccess = false;

        try {
            let query = supabase.from('kiosk_health').select('*');
            if (deviceId) {
                query = query.eq('device_id', deviceId);
            } else {
                query = query.order('last_seen', { ascending: false });
            }

            const { data, error } = await query;
            if (!error && data) {
                records = data;
                dbSuccess = true;
            } else if (error) {
                console.warn('[Kiosk Health] Supabase query warning:', error.message);
            }
        } catch (dbErr) {
            console.warn('[Kiosk Health] Supabase exception:', dbErr);
        }

        // Disk fallback if table not created yet or Supabase offline
        if (!dbSuccess || records.length === 0) {
            const backup = loadBackupJson<any[]>('kiosk_health.json', []);
            if (deviceId) {
                records = backup.filter(r => r.device_id === deviceId);
            } else {
                records = backup;
            }
        }

        const now = Date.now();
        const enriched = records.map(rec => {
            const lastSeenTime = rec.last_seen ? new Date(rec.last_seen).getTime() : 0;
            const diffMs = Math.max(0, now - lastSeenTime);
            const diffMinutes = Math.floor(diffMs / 60000);

            // Device is considered online if seen within last 5 minutes (300,000 ms)
            const isOnline = diffMs <= 5 * 60 * 1000;

            return {
                ...rec,
                is_online: isOnline,
                last_seen_minutes_ago: diffMinutes
            };
        });

        if (deviceId && enriched.length > 0) {
            return NextResponse.json(enriched[0], { status: 200, headers: NO_CACHE_HEADERS });
        } else if (deviceId && enriched.length === 0) {
            return NextResponse.json({ error: `Kiosk device '${deviceId}' not found` }, { status: 404, headers: NO_CACHE_HEADERS });
        }

        return NextResponse.json(enriched, { status: 200, headers: NO_CACHE_HEADERS });
    } catch (e: any) {
        console.error('[Kiosk Health] GET error:', e);
        return NextResponse.json({ error: e.message || 'Failed to fetch kiosk health' }, { status: 500, headers: NO_CACHE_HEADERS });
    }
}

/**
 * POST /api/kiosk/health
 * Receive heartbeat & battery health telemetry from the kiosk tablet
 *
 * Body schema:
 * {
 *   device_id?: string,             // default: 'default'
 *   battery_percentage: number,     // e.g. 85 or 0.85
 *   is_charging?: boolean,          // e.g. true / false
 *   charging_state?: string,        // e.g. 'charging', 'discharging', 'full'
 *   app_version?: string,           // e.g. '1.0.4'
 *   ip_address?: string,            // optional (falls back to client IP)
 *   metadata?: object               // optional extra hardware/network info
 * }
 */
export async function POST(request: NextRequest) {
    try {
        let body: any = null;
        try {
            body = await request.json();
        } catch {
            return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
        }

        // Parse & sanitize device identifier
        const deviceId = String(body.device_id || body.deviceId || 'default').trim();

        // Parse battery percentage (accepts 0-100, 0.0-1.0 float, or "85%" string)
        let batteryPct: number | null = null;
        const rawBattery = body.battery_percentage ?? body.battery ?? body.battery_level ?? body.level;
        if (rawBattery !== undefined && rawBattery !== null) {
            const num = parseFloat(String(rawBattery).replace('%', '').trim());
            if (!isNaN(num)) {
                // If sent as 0.0 - 1.0 (Android BatteryManager level float), normalize to 0-100
                batteryPct = (num > 0 && num <= 1.0) ? Math.round(num * 100) : Math.min(100, Math.max(0, num));
            }
        }

        // Parse charging state
        const rawCharging = body.is_charging ?? body.charging ?? body.isCharging;
        let isCharging = false;
        let chargingState = String(body.charging_state || body.chargingState || '').toLowerCase().trim();

        if (typeof rawCharging === 'boolean') {
            isCharging = rawCharging;
        } else if (typeof rawCharging === 'string') {
            isCharging = ['true', '1', 'charging', 'ac', 'usb', 'wireless'].includes(rawCharging.toLowerCase());
        }

        if (!chargingState) {
            if (isCharging) {
                chargingState = (batteryPct !== null && batteryPct >= 99) ? 'full' : 'charging';
            } else {
                chargingState = 'discharging';
            }
        }

        // Client IP resolution
        const clientIp = body.ip_address ||
            request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
            request.headers.get('x-real-ip') ||
            null;

        const nowIso = new Date().toISOString();

        const payload: any = {
            device_id: deviceId,
            battery_percentage: batteryPct,
            is_charging: isCharging,
            charging_state: chargingState,
            ip_address: clientIp,
            app_version: body.app_version || body.version || null,
            metadata: body.metadata && typeof body.metadata === 'object' ? body.metadata : {},
            last_seen: body.last_seen || nowIso,
            updated_at: nowIso,
        };

        // 1. Dual persistence: backup file snapshot
        try {
            const local = loadBackupJson<any[]>('kiosk_health.json', []);
            const existingIdx = local.findIndex((r: any) => r.device_id === deviceId);
            if (existingIdx >= 0) {
                local[existingIdx] = { ...local[existingIdx], ...payload };
            } else {
                local.push({ ...payload, created_at: nowIso });
            }
            saveBackupJson('kiosk_health.json', local);
        } catch (backupErr) {
            console.warn('[Kiosk Health] Local backup warning:', backupErr);
        }

        // 2. Persist to Supabase kiosk_health table
        let dbSuccess = false;
        let dbErrorMsg = '';

        try {
            const { data, error } = await supabase
                .from('kiosk_health')
                .upsert(payload, { onConflict: 'device_id' })
                .select();

            if (!error && data) {
                dbSuccess = true;
            } else if (error) {
                dbErrorMsg = error.message;
                console.warn('[Kiosk Health] Supabase upsert error:', error.message);
            }
        } catch (dbErr: any) {
            dbErrorMsg = dbErr?.message || String(dbErr);
            console.warn('[Kiosk Health] Supabase exception:', dbErr);
        }

        return NextResponse.json({
            success: true,
            db_synced: dbSuccess,
            db_error: dbErrorMsg || null,
            health: {
                ...payload,
                is_online: true,
                last_seen_minutes_ago: 0
            }
        }, { status: 200, headers: NO_CACHE_HEADERS });

    } catch (e: any) {
        console.error('[Kiosk Health] POST error:', e);
        return NextResponse.json({ error: e.message || 'Failed to record kiosk health' }, { status: 500, headers: NO_CACHE_HEADERS });
    }
}
