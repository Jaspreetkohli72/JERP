import { createBrowserClient } from '@supabase/ssr';

export function createClient() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://acirakiaxrhfgtksmahm.supabase.co';
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_KR0clUzP2pwdBkNDE9l7EQ_w8LZ5pZj';

    return createBrowserClient(
        supabaseUrl,
        supabaseKey
    );
}
