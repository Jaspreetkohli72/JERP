'use server';

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { createClient as createBaseClient } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/server';
import { supabase as fallbackClient } from '@/lib/supabase';

function getAdminClient() {
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!serviceKey) return null;
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://acirakiaxrhfgtksmahm.supabase.co';
    return createBaseClient(url, serviceKey, {
        auth: { persistSession: false, autoRefreshToken: false }
    });
}

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

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function ensureValidUuid(id?: string): string {
    if (id && UUID_REGEX.test(id)) return id;
    return crypto.randomUUID();
}

function sanitizeOptionalUuid(id?: string): string | null {
    if (id && UUID_REGEX.test(id)) return id;
    return null;
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
        if (logs.length > 5000) logs.length = 5000;
        fs.writeFileSync(AUDIT_FILE, JSON.stringify(logs, null, 2), 'utf-8');
    } catch (e) {
        console.warn('[Audit] Error appending local audit log:', e);
    }
}

export async function recordAuditLogAction(entry: AuditLogEntry) {
    const validId = ensureValidUuid(entry.id);
    const validUserId = sanitizeOptionalUuid(entry.user_id);
    const timestamp = entry.timestamp || new Date().toISOString();

    const sanitizedDetails: Record<string, any> = { ...(entry.details || {}) };
    if (entry.user_id && !validUserId) {
        sanitizedDetails._original_user_id = entry.user_id;
    }

    const payload: AuditLogEntry = {
        ...entry,
        id: validId,
        timestamp,
        user_id: validUserId || undefined,
        details: sanitizedDetails,
        user_email: entry.user_email || 'jaspreetkohli72@gmail.com',
        user_name: entry.user_name || (entry.user_email ? entry.user_email.split('@')[0] : 'Admin'),
    };

    // 1. Dual-Write: Local file persistence
    appendLocalLog(payload);

    // 2. Direct Write to Supabase audit_logs via Admin Client (guaranteed to bypass RLS)
    const dbRecord = {
        id: validId,
        timestamp,
        action: payload.action,
        module: payload.module,
        entity_id: payload.entity_id ? String(payload.entity_id) : null,
        description: payload.description,
        details: sanitizedDetails,
        user_id: validUserId,
        user_email: payload.user_email,
        user_name: payload.user_name || null,
    };

    try {
        const admin = getAdminClient();
        if (admin) {
            const { error: adminErr } = await admin.from('audit_logs').insert([dbRecord]);
            if (adminErr) {
                console.warn('[Audit] Admin client insert error, trying standard client:', adminErr.message);
                const client = await getClient();
                await client.from('audit_logs').insert([dbRecord]);
            }
        } else {
            const client = await getClient();
            await client.from('audit_logs').insert([dbRecord]);
        }
    } catch (err) {
        console.warn('[Audit] Exception inserting audit log:', err);
        try {
            const client = await getClient();
            await client.from('audit_logs').insert([dbRecord]);
        } catch {}
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

    // 1. Fetch directly from Supabase audit_logs via Admin Client
    try {
        const admin = getAdminClient();
        if (admin) {
            let query = admin.from('audit_logs').select('*').order('timestamp', { ascending: false }).limit(limit);

            if (filters?.module && filters.module !== 'ALL') {
                query = query.eq('module', filters.module);
            }
            if (filters?.action && filters.action !== 'ALL') {
                query = query.eq('action', filters.action);
            }

            const { data, error } = await query;
            if (!error && Array.isArray(data) && data.length > 0) {
                logs = data.map((d: any) => ({
                    id: d.id,
                    timestamp: d.timestamp || d.created_at,
                    action: d.action,
                    module: d.module,
                    entity_id: d.entity_id,
                    description: d.description,
                    details: d.details || {},
                    user_id: d.user_id,
                    user_email: d.user_email || 'jaspreetkohli72@gmail.com',
                    user_name: d.user_name || 'Admin',
                }));
            }
        } else {
            const client = await getClient();
            let query = client.from('audit_logs').select('*').order('timestamp', { ascending: false }).limit(limit);
            if (filters?.module && filters.module !== 'ALL') {
                query = query.eq('module', filters.module);
            }
            if (filters?.action && filters.action !== 'ALL') {
                query = query.eq('action', filters.action);
            }
            const { data } = await query;
            if (Array.isArray(data) && data.length > 0) {
                logs = data;
            }
        }
    } catch (err) {
                entity_id: d.entity_id,
                description: d.description,
                details: d.details || {},
                user_id: d.user_id,
                user_email: d.user_email || 'jaspreetkohli72@gmail.com',
                user_name: d.user_name || 'Admin',
            }));
        } else if (error) {
            console.warn('[Audit] Admin query error, trying standard client:', error.message);
            const client = await getClient();
            const res = await client.from('audit_logs').select('*').order('timestamp', { ascending: false }).limit(limit);
            if (!res.error && Array.isArray(res.data) && res.data.length > 0) {
                logs = res.data;
            }
        }
    } catch (err) {
        console.warn('[Audit] Exception querying audit_logs:', err);
    }

    // 2. Merge local logs if any exist that are missing in Supabase
    const localLogs = readLocalLogs();
    if (logs.length === 0) {
        logs = localLogs;
    } else {
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
        logs = logs.filter(l => l.module?.toLowerCase() === filters.module!.toLowerCase());
    }
    if (filters?.action && filters.action !== 'ALL') {
        logs = logs.filter(l => l.action?.toUpperCase() === filters.action!.toUpperCase());
    }
    if (filters?.search) {
        const q = filters.search.toLowerCase().trim();
        logs = logs.filter(
            l =>
                l.description?.toLowerCase().includes(q) ||
                l.user_email?.toLowerCase().includes(q) ||
                (l.user_name && l.user_name.toLowerCase().includes(q)) ||
                (l.entity_id && String(l.entity_id).toLowerCase().includes(q))
        );
    }

    return logs.slice(0, limit);
}
