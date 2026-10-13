import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

dotenv.config({ path: '.env.local' });

const dataUrl = process.env.NEXT_PUBLIC_SUPABASE_DATA_URL || 'https://acirakiaxrhfgtksmahm.supabase.co';
const dataKey = process.env.NEXT_PUBLIC_SUPABASE_DATA_ANON_KEY || 'sb_publishable_KR0clUzP2pwdBkNDE9l7EQ_w8LZ5pZj';

const authUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://tgxwxzqmtrwkcervbadm.supabase.co';
const authKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const dataClient = createClient(dataUrl, dataKey);
const authClient = authKey ? createClient(authUrl, authKey) : null;

async function fetchAll(client, tableName) {
    let allRows = [];
    let from = 0;
    const step = 1000;
    while (true) {
        const { data, error, count } = await client
            .from(tableName)
            .select('*', { count: 'exact' })
            .range(from, from + step - 1);

        if (error) {
            console.error(`Error querying ${tableName} (range ${from}-${from + step - 1}):`, error.message);
            return { error, data: allRows };
        }
        if (!data || data.length === 0) break;
        allRows.push(...data);
        if (data.length < step) break;
        from += step;
    }
    return { data: allRows };
}

async function runBackup() {
    console.log('--- Starting Staff & Attendance Supabase Backup ---');
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupDir = path.resolve('backups', `supabase_backup_${timestamp}`);

    if (!fs.existsSync(backupDir)) {
        fs.mkdirSync(backupDir, { recursive: true });
    }

    const tablesToBackup = [
        'staff',
        'staff_attendance',
        'staff_advances',
        'attendance',
        'settings'
    ];

    const manifest = {
        timestamp: new Date().toISOString(),
        dataUrl,
        tables: {}
    };

    for (const table of tablesToBackup) {
        console.log(`Backing up table: "${table}" from business data client...`);
        const res = await fetchAll(dataClient, table);
        if (res.data) {
            const filePath = path.join(backupDir, `${table}.json`);
            fs.writeFileSync(filePath, JSON.stringify(res.data, null, 2), 'utf-8');
            manifest.tables[table] = {
                rowCount: res.data.length,
                file: `${table}.json`
            };
            console.log(`✓ Saved ${res.data.length} rows for "${table}" -> ${filePath}`);
        } else {
            console.warn(`! Could not fetch data for "${table}"`);
        }
    }

    // Also check if auth database has any attendance/staff records
    if (authClient) {
        console.log('\nChecking if auth client database has staff or attendance tables...');
        for (const table of ['staff', 'staff_attendance', 'attendance']) {
            const res = await fetchAll(authClient, table);
            if (res.data && res.data.length > 0) {
                const filePath = path.join(backupDir, `auth_db_${table}.json`);
                fs.writeFileSync(filePath, JSON.stringify(res.data, null, 2), 'utf-8');
                manifest.tables[`auth_db_${table}`] = {
                    rowCount: res.data.length,
                    file: `auth_db_${table}.json`
                };
                console.log(`✓ (Auth DB) Saved ${res.data.length} rows for "${table}" -> ${filePath}`);
            }
        }
    }

    // Write manifest
    fs.writeFileSync(path.join(backupDir, 'manifest.json'), JSON.stringify(manifest, null, 2), 'utf-8');

    // Also write a latest symlink/copy for ease of access
    const latestDir = path.resolve('backups', 'latest');
    if (!fs.existsSync(latestDir)) {
        fs.mkdirSync(latestDir, { recursive: true });
    }
    for (const [table, info] of Object.entries(manifest.tables)) {
        fs.copyFileSync(path.join(backupDir, info.file), path.join(latestDir, info.file));
    }
    fs.copyFileSync(path.join(backupDir, 'manifest.json'), path.join(latestDir, 'manifest.json'));

    console.log(`\n==============================================`);
    console.log(`Backup completed successfully!`);
    console.log(`Directory: ${backupDir}`);
    console.log(`Summary:`);
    for (const [table, info] of Object.entries(manifest.tables)) {
        console.log(` - ${table}: ${info.rowCount} rows`);
    }
    console.log(`==============================================`);
}

runBackup().catch(err => {
    console.error('Fatal backup error:', err);
    process.exit(1);
});
