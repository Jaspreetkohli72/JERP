import { createBrowserClient } from '@supabase/ssr';

export function createClient() {
    const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseUrl = (rawUrl && !rawUrl.includes('tgxwxzqmtrwkcervbadm'))
        ? rawUrl
        : 'https://acirakiaxrhfgtksmahm.supabase.co';

    const rawKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const supabaseKey = (rawKey && !rawKey.includes('dSTtqIE5lvlvr6xIxzp_rQ_LGsxO0I5') && !rawUrl?.includes('tgxwxzqmtrwkcervbadm'))
        ? rawKey
        : 'sb_publishable_KR0clUzP2pwdBkNDE9l7EQ_w8LZ5pZj';

    return createBrowserClient(
        supabaseUrl,
        supabaseKey
    );
}
