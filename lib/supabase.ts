import { createBrowserClient } from '@supabase/ssr';
import { SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://acirakiaxrhfgtksmahm.supabase.co';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_KR0clUzP2pwdBkNDE9l7EQ_w8LZ5pZj';

// Single unified Supabase Client using @supabase/ssr for cookie-backed session synchronization
export const supabase: SupabaseClient = createBrowserClient(supabaseUrl, supabaseKey);
export const authClient = supabase;
export const dataClient = supabase;


