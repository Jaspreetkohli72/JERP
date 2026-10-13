import { createBrowserClient } from '@supabase/ssr';
import { createClient as createBaseClient, SupabaseClient } from '@supabase/supabase-js';

const rawSupabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseUrl = (rawSupabaseUrl && !rawSupabaseUrl.includes('tgxwxzqmtrwkcervbadm'))
    ? rawSupabaseUrl
    : 'https://acirakiaxrhfgtksmahm.supabase.co';

const rawSupabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseKey = (rawSupabaseKey && !rawSupabaseKey.includes('dSTtqIE5lvlvr6xIxzp_rQ_LGsxO0I5') && !rawSupabaseUrl?.includes('tgxwxzqmtrwkcervbadm'))
    ? rawSupabaseKey
    : 'sb_publishable_KR0clUzP2pwdBkNDE9l7EQ_w8LZ5pZj';

const dataUrl = supabaseUrl;
const dataKey = supabaseKey;

// Auth Client uses @supabase/ssr createBrowserClient so cookies are automatically synced with Next.js App Router
export const authClient: SupabaseClient = createBrowserClient(supabaseUrl, supabaseKey);

// Data Client manages business database tables (Staff, Attendance, Projects, Inventory, Wallets, etc.)
export const dataClient: SupabaseClient = createBaseClient(dataUrl, dataKey, {
    auth: {
        persistSession: false,
        autoRefreshToken: false,
    },
});

const AUTH_TABLES = new Set(['user_profiles', 'audit_logs']);

// Unified client: transparently routes data mutations and queries to the primary business database,
// while keeping authentication-specific tables (user_profiles, audit_logs) routed to the auth database.
export const supabase: SupabaseClient = new Proxy(authClient, {
    get(target, prop, receiver) {
        if (prop === 'from') {
            return (tableName: string) => {
                if (AUTH_TABLES.has(tableName)) {
                    return authClient.from(tableName);
                }
                return dataClient.from(tableName);
            };
        }
        if (prop === 'rpc' || prop === 'storage') {
            const dataProp = (dataClient as any)[prop];
            if (typeof dataProp === 'function') {
                return dataProp.bind(dataClient);
            }
            return dataProp;
        }
        return Reflect.get(target, prop, receiver);
    },
}) as SupabaseClient;

