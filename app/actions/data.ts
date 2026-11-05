'use server';
import { supabase } from '@/lib/supabase';
import fs from 'fs';
import path from 'path';

const TABLES = {
    CATEGORIES: 'categories',
    CONTACTS: 'contacts',
    TRANSACTIONS: 'transactions',
    BUDGETS: 'budgets',
    GLOBAL_BUDGETS: 'global_budgets',
    WALLETS: 'wallets',
    WORK_LOGS: 'work_logs',
    STICKY_NOTES: 'sticky_notes',
    CLIENT_QUERIES: 'client_queries',
    STAFF: 'staff',
    ESTIMATES: 'estimates',
    MEASUREMENTS: 'measurements',
    BILLS: 'bills',
    PROJECTS: 'projects',
    INVENTORY: 'inventory',
    SUPPLIERS: 'suppliers',
    STAFF_ATTENDANCE: 'staff_attendance',
    STAFF_ADVANCES: 'staff_advances',
    SETTINGS: 'settings',
    SALES: 'sales'
};

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

export async function fetchAllDataAction() {
    const results = await Promise.allSettled([
        supabase.from(TABLES.CATEGORIES).select('*'),
        supabase.from(TABLES.CONTACTS).select('*'),
        supabase.from(TABLES.TRANSACTIONS).select(`*, categories (name, icon, type), contacts (name)`).order('transaction_date', { ascending: false }),
        supabase.from(TABLES.GLOBAL_BUDGETS).select('*'),
        supabase.from(TABLES.BUDGETS).select('*'),
        supabase.from(TABLES.WALLETS).select('*'),
        supabase.from(TABLES.WORK_LOGS).select('*').order('created_at', { ascending: false }),
        supabase.from(TABLES.STICKY_NOTES).select('*').order('created_at', { ascending: false }),
        supabase.from(TABLES.CLIENT_QUERIES).select('*').order('created_at', { ascending: false }),
        supabase.from(TABLES.STAFF).select('*').order('created_at', { ascending: false }),
        supabase.from(TABLES.PROJECTS).select(`*, contacts(name)`).order('created_at', { ascending: false }),
        supabase.from('staff_advances').select('*').order('date', { ascending: false }),
        supabase.from('bills').select('*').order('bill_date', { ascending: false }),
        supabase.from('purchases').select('*, suppliers(name)').order('date', { ascending: false }),
        supabase.from(TABLES.SETTINGS).select('*').limit(1),
        supabase.from('staff_attendance').select('*').order('date', { ascending: false }),
        supabase.from('suppliers').select('*').order('name'),
        supabase.from('inventory').select('*').order('item_name'),
        supabase.from('shopping_list').select('*').order('date_needed', { ascending: true }),
        supabase.from('sales').select('*').order('date', { ascending: false })
    ]);

    const keys = [
        'categories', 'contacts', 'transactions', 'global_budgets', 'budgets', 'wallets',
        'work_logs', 'sticky_notes', 'client_queries', 'staff', 'projects', 'staff_advances',
        'bills', 'purchases', 'settings', 'staff_attendance', 'suppliers', 'inventory', 'shopping_list', 'sales'
    ];

    const data: any = {};
    results.forEach((res, index) => {
        if (res.status === 'fulfilled' && !res.value.error && res.value.data) {
            data[keys[index]] = res.value.data;
        } else {
            data[keys[index]] = [];
        }
    });

    // Provide safe snapshot fallback if database is offline or empty for staff tables
    if (!data.staff || data.staff.length === 0) {
        data.staff = loadBackupJson('staff.json', []);
    }
    if (!data.staff_attendance || data.staff_attendance.length === 0) {
        data.staff_attendance = loadBackupJson('staff_attendance.json', []);
    }
    if (!data.staff_advances || data.staff_advances.length === 0) {
        data.staff_advances = loadBackupJson('staff_advances.json', []);
    }
    if (!data.settings || (Array.isArray(data.settings) && data.settings.length === 0)) {
        data.settings = loadBackupJson('settings.json', [{}]);
    }

    return data;
}
