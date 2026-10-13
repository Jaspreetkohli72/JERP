'use server';

import fs from 'fs';
import path from 'path';
import { createClient } from '@/lib/supabase/server';
import { supabase as fallbackClient } from '@/lib/supabase';

async function getClient() {
    try {
        return await createClient();
    } catch {
        return fallbackClient;
    }
}

export interface AuditLogEntry {
    id?: string;
    timestamp?: string;
    action: 'CREATE' | 'UPDATE' | 'DELETE' | 'AUTH' | 'PERMISSION_CHANGE';
    module: string;
    entity_id?: string;
    description: string;
    details?: Record<string, any>;
    user_id?: string;
    user_email: string;
    user_name?: string;
}

const DATA_DIR = path.join(process.cwd(), 'data');
const AUDIT_FILE = path.join(DATA_DIR, 'audit_logs.json');

function ensureDataFile() {
    if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (!fs.existsSync(AUDIT_FILE)) {
        fs.writeFileSync(AUDIT_FILE, JSON.stringify([], null, 2), 'utf-8');
    }
}

function readLocalLogs(): AuditLogEntry[] {
    try {
        ensureDataFile();
        const content = fs.readFileSync(AUDIT_FILE, 'utf-8');
        return JSON.parse(content || '[]');
    } catch (e) {
        console.warn('[Audit] Error reading local audit logs:', e);
        return [];
    }
}

function appendLocalLog(entry: AuditLogEntry) {
    try {
        ensureDataFile();
        const logs = readLocalLogs();
        logs.unshift(entry);
        // Keep most recent 5,000 logs in local fallback
        if (logs.length > 5000) logs.length = 5000;
        fs.writeFileSync(AUDIT_FILE, JSON.stringify(logs, null, 2), 'utf-8');
    } catch (e) {
        console.warn('[Audit] Error appending local audit log:', e);
    }
}

export async function recordAuditLogAction(entry: AuditLogEntry) {
    const payload: AuditLogEntry = {
        ...entry,
        id: entry.id || (typeof crypto !== 'undefined' ? crypto.randomUUID() : `log_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`),
        timestamp: entry.timestamp || new Date().toISOString(),
        details: entry.details || {},
    };

    // 1. Dual-Write: Always write to local server file for 100% persistence
    appendLocalLog(payload);

    // 2. Try writing to Supabase audit_logs table
    try {
        const client = await getClient();
        const { error } = await client.from('audit_logs').insert([
            {
                id: payload.id,
                timestamp: payload.timestamp,
                action: payload.action,
                module: payload.module,
                entity_id: payload.entity_id || null,
                description: payload.description,
                details: payload.details,
                user_id: payload.user_id || null,
                user_email: payload.user_email,
                user_name: payload.user_name || null,
            },
        ]);
        if (error) {
            console.warn('[Audit] Supabase table insert warning:', error.message);
        }
    } catch (err) {
        console.warn('[Audit] Exception inserting audit log:', err);
    }

    return { success: true, log: payload };
}

export async function getAuditLogsAction(filters?: {
    module?: string;
    action?: string;
    search?: string;
    limit?: number;
}) {
    const limit = filters?.limit || 200;
    let logs: AuditLogEntry[] = [];

    // 1. Attempt fetching from Supabase audit_logs table
    try {
        const client = await getClient();
        let query = client.from('audit_logs').select('*').order('timestamp', { ascending: false }).limit(limit);

        if (filters?.module && filters.module !== 'ALL') {
            query = query.eq('module', filters.module);
        }
        if (filters?.action && filters.action !== 'ALL') {
            query = query.eq('action', filters.action);
        }

        const { data, error } = await query;
        if (!error && Array.isArray(data) && data.length > 0) {
            logs = data;
        } else if (error) {
            console.warn('[Audit] Supabase audit_logs query error:', error.message);
        }
    } catch (err) {
        console.warn('[Audit] Exception querying audit_logs:', err);
    }

    // 2. If Supabase table is empty or pending, read from local persistent storage
    if (logs.length === 0) {
        logs = readLocalLogs();
    } else {
        // Merge any recent local logs not yet in Supabase
        const localLogs = readLocalLogs();
        const ids = new Set(logs.map(l => l.id));
        for (const local of localLogs) {
            if (local.id && !ids.has(local.id)) {
                logs.push(local);
            }
        }
        logs.sort((a, b) => new Date(b.timestamp || 0).getTime() - new Date(a.timestamp || 0).getTime());
    }

    // 3. In-memory filter & search
    if (filters?.module && filters.module !== 'ALL') {
        logs = logs.filter(l => l.module.toLowerCase() === filters.module!.toLowerCase());
    }
    if (filters?.action && filters.action !== 'ALL') {
        logs = logs.filter(l => l.action.toUpperCase() === filters.action!.toUpperCase());
    }
    if (filters?.search) {
        const q = filters.search.toLowerCase().trim();
        logs = logs.filter(
            l =>
                l.description.toLowerCase().includes(q) ||
                l.user_email.toLowerCase().includes(q) ||
                (l.user_name && l.user_name.toLowerCase().includes(q)) ||
                (l.entity_id && l.entity_id.toLowerCase().includes(q))
        );
    }

    return logs.slice(0, limit);
}
