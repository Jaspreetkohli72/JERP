import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function createClient() {
    const cookieStore = await cookies();
    const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseUrl = (rawUrl && !rawUrl.includes('tgxwxzqmtrwkcervbadm'))
        ? rawUrl
        : 'https://acirakiaxrhfgtksmahm.supabase.co';

    const rawKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const supabaseKey = (rawKey && !rawKey.includes('dSTtqIE5lvlvr6xIxzp_rQ_LGsxO0I5') && !rawUrl?.includes('tgxwxzqmtrwkcervbadm'))
        ? rawKey
        : 'sb_publishable_KR0clUzP2pwdBkNDE9l7EQ_w8LZ5pZj';

    return createServerClient(
        supabaseUrl,
        supabaseKey,
        {
            cookies: {
                getAll() {
                    return cookieStore.getAll();
                },
                setAll(cookiesToSet) {
                    try {
                        cookiesToSet.forEach(({ name, value, options }) =>
                            cookieStore.set(name, value, options)
                        );
                    } catch {
                        // The `setAll` method was called from a Server Component.
                        // Can be ignored if you have middleware refreshing sessions.
                    }
                },
            },
        }
    );
}
