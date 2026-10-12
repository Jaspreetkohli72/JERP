import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder';

const dataUrl = process.env.NEXT_PUBLIC_SUPABASE_DATA_URL || 'https://acirakiaxrhfgtksmahm.supabase.co';
const dataKey = process.env.NEXT_PUBLIC_SUPABASE_DATA_ANON_KEY || 'sb_publishable_KR0clUzP2pwdBkNDE9l7EQ_w8LZ5pZj';

// Auth Client manages Supabase Authentication sessions
export const authClient: SupabaseClient = createClient(supabaseUrl, supabaseKey, {
    auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storageKey: 'jerp_supabase_auth',
    },
});

// Data Client manages business database tables (Staff, Attendance, Projects, Inventory, Wallets, etc.)
export const dataClient: SupabaseClient = createClient(dataUrl, dataKey, {
    auth: {
        persistSession: false,
        autoRefreshToken: false,
    },
});

// Unified client: transparently routes data mutations and queries to the primary business database
export const supabase: SupabaseClient = new Proxy(authClient, {
    get(target, prop, receiver) {
        if (prop === 'from' || prop === 'rpc' || prop === 'storage') {
            const dataProp = (dataClient as any)[prop];
            if (typeof dataProp === 'function') {
                return dataProp.bind(dataClient);
            }
            return dataProp;
        }
        return Reflect.get(target, prop, receiver);
    },
}) as SupabaseClient;
