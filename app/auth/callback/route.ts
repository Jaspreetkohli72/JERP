import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse, type NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
    const requestUrl = new URL(request.url);
    const code = requestUrl.searchParams.get('code');
    const token_hash = requestUrl.searchParams.get('token_hash');
    const type = requestUrl.searchParams.get('type') as any;
    const next = requestUrl.searchParams.get('next') || (type === 'recovery' ? '/reset-password' : '/');

    const cookieStore = await cookies();
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://acirakiaxrhfgtksmahm.supabase.co';
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_KR0clUzP2pwdBkNDE9l7EQ_w8LZ5pZj';

    const redirectResponse = NextResponse.redirect(new URL(next, request.url));

    const supabase = createServerClient(supabaseUrl, supabaseKey, {
        cookies: {
            getAll() {
                return cookieStore.getAll();
            },
            setAll(cookiesToSet) {
                try {
                    cookiesToSet.forEach(({ name, value, options }) => {
                        cookieStore.set(name, value, options);
                        redirectResponse.cookies.set(name, value, options);
                    });
                } catch {}
            },
        },
    });

    try {
        if (code) {
            const { error } = await supabase.auth.exchangeCodeForSession(code);
            if (!error) {
                return redirectResponse;
            }
            console.error('[Auth Callback] Code exchange error:', error.message);
        } else if (token_hash && type) {
            const { error } = await supabase.auth.verifyOtp({ token_hash, type });
            if (!error) {
                return redirectResponse;
            }
            console.error('[Auth Callback] verifyOtp error:', error.message);
        }
    } catch (err: any) {
        console.error('[Auth Callback] Exception during session exchange:', err);
    }

    // Fallback: If code exchange failed or already exchanged, redirect to target or login
    if (next && next !== '/') {
        return NextResponse.redirect(new URL(next, request.url));
    }
    return NextResponse.redirect(new URL('/login?error=auth_callback_failed', request.url));
}
