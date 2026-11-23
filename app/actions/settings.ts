'use server';
import { supabase } from '@/lib/supabase';
import fs from 'fs';
import path from 'path';

function loadBackupJson<T>(filename: string, fallback: T): T {
    try {
        const filePath = path.join(process.cwd(), 'backups', 'latest', filename);
        if (fs.existsSync(filePath)) {
            const raw = fs.readFileSync(filePath, 'utf-8');
            return JSON.parse(raw);
        }
    } catch (e) {
        console.warn(`Failed to read backup ${filename}:`, e);
    }
    return fallback;
}

function saveBackupJson<T>(filename: string, data: T): void {
    try {
        const dir = path.join(process.cwd(), 'backups', 'latest');
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        const filePath = path.join(dir, filename);
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
    } catch (e) {
        console.warn(`Failed to write backup ${filename}:`, e);
    }
}

export async function getSettingsAction() {
    let dbSettings: any = {};
    try {
        const { data, error } = await supabase.from('settings').select('*').limit(1);
        if (!error && data && data.length > 0) {
            dbSettings = data[0];
        }
    } catch (e) {
        console.warn('getSettingsAction Supabase error:', e);
    }

    const backupArr = loadBackupJson<any[]>('settings.json', [{}]);
    const backupObj = Array.isArray(backupArr) ? backupArr[0] : (backupArr || {});

    const merged = {
        id: 1,
        profit_margin: dbSettings.profit_margin ?? backupObj.profit_margin ?? 100,
        advance_percentage: dbSettings.advance_percentage ?? dbSettings.advance_required ?? backupObj.advance_percentage ?? backupObj.advance_required ?? 80,
        advance_required: dbSettings.advance_required ?? dbSettings.advance_percentage ?? backupObj.advance_required ?? backupObj.advance_percentage ?? 80,
        welder_rate: dbSettings.welder_rate ?? backupObj.welder_rate ?? 0,
        helper_rate: dbSettings.helper_rate ?? backupObj.helper_rate ?? 0,
        default_attendance_worked_for: dbSettings.default_attendance_worked_for ?? backupObj.default_attendance_worked_for ?? 'Me',
    };

    return merged;
}

export async function saveSettingsAction(newSettings: any) {
    const advanceVal = Number(newSettings.advance_required ?? newSettings.advance_percentage ?? 0);
    const profitVal = Number(newSettings.profit_margin ?? 0);
    const welderVal = Number(newSettings.welder_rate ?? 0);
    const helperVal = Number(newSettings.helper_rate ?? 0);
    const workedForVal = ['Me', 'Papa', 'Both'].includes(newSettings.default_attendance_worked_for)
        ? newSettings.default_attendance_worked_for
        : 'Me';

    const fullPayload: any = {
        id: 1,
        profit_margin: profitVal,
        advance_percentage: advanceVal,
        advance_required: advanceVal,
        welder_rate: welderVal,
        helper_rate: helperVal,
        default_attendance_worked_for: workedForVal,
    };

    // 1. Always persist to resilient local backup JSON immediately
    saveBackupJson('settings.json', [fullPayload]);

    // 2. Try upserting full payload to Supabase
    let dbSuccess = false;
    let dbErrorMsg = '';

    try {
        const { error } = await supabase.from('settings').upsert(fullPayload);
        if (!error) {
            dbSuccess = true;
        } else {
            dbErrorMsg = error.message;
            // Fallback: if columns like default_attendance_worked_for don't exist yet in Supabase schema,
            // upsert existing columns so core settings stay synced
            const fallbackPayload = {
                id: 1,
                profit_margin: profitVal,
                advance_percentage: advanceVal,
            };
            const { error: fbErr } = await supabase.from('settings').upsert(fallbackPayload);
            if (!fbErr) {
                dbSuccess = true;
            }
        }
    } catch (e: any) {
        dbErrorMsg = e?.message || String(e);
    }

    return {
        success: true,
        dbSuccess,
        dbErrorMsg,
        settings: fullPayload
    };
}
