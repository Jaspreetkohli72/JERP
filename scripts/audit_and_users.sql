-- ==============================================================================
-- GFE ERP (Galaxy Fabricarion Experts) - Audit Logging & User Privileges Schema
-- Run this in the Supabase SQL Editor: https://supabase.com/dashboard/project/acirakiaxrhfgtksmahm/sql/new
-- ==============================================================================

-- 1. Enable UUID Extension (if not already enabled)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Create Audit Logs Table
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    timestamp TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    action TEXT NOT NULL,                  -- 'CREATE', 'UPDATE', 'DELETE', 'AUTH', 'PERMISSION_CHANGE'
    module TEXT NOT NULL,                  -- 'transactions', 'contacts', 'sales', 'staff', 'contracting', etc.
    entity_id TEXT,                        -- ID of the affected entity
    description TEXT NOT NULL,             -- Human-readable change summary
    details JSONB DEFAULT '{}'::jsonb,     -- Before/After data, payload, or change metadata
    user_id UUID,                          -- Actor Supabase Auth UID
    user_email TEXT NOT NULL,              -- Actor Email address
    user_name TEXT,                        -- Actor Full Name
    ip_address TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Indexes for lightning-fast log exploration & filtering
CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON public.audit_logs (timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_module ON public.audit_logs (module);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON public.audit_logs (action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_email ON public.audit_logs (user_email);

-- 3. Create User Profiles & Privileges Table
CREATE TABLE IF NOT EXISTS public.user_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email TEXT UNIQUE NOT NULL,
    full_name TEXT,
    role TEXT NOT NULL DEFAULT 'staff',    -- 'superadmin', 'admin', 'manager', 'staff', 'viewer'
    privileges JSONB NOT NULL DEFAULT '{
        "can_manage_users": false,
        "can_view_logs": false,
        "can_edit_finances": true,
        "can_manage_staff": false,
        "can_manage_contracting": true,
        "can_manage_settings": false
    }'::jsonb,
    status TEXT NOT NULL DEFAULT 'active', -- 'active', 'suspended', 'inactive'
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Seed default Super Admin
INSERT INTO public.user_profiles (email, full_name, role, privileges, status)
VALUES (
    'jaspreetkohli72@gmail.com',
    'Jaspreet Singh Kohli',
    'superadmin',
    '{
        "can_manage_users": true,
        "can_view_logs": true,
        "can_edit_finances": true,
        "can_manage_staff": true,
        "can_manage_contracting": true,
        "can_manage_settings": true
    }'::jsonb,
    'active'
)
ON CONFLICT (email) DO UPDATE SET
    role = 'superadmin',
    privileges = '{
        "can_manage_users": true,
        "can_view_logs": true,
        "can_edit_finances": true,
        "can_manage_staff": true,
        "can_manage_contracting": true,
        "can_manage_settings": true
    }'::jsonb,
    status = 'active';

-- 4. Enable Row Level Security (RLS)
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- Permissive policies for authenticated & anon users
CREATE POLICY "Allow authenticated read audit_logs" ON public.audit_logs
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated insert audit_logs" ON public.audit_logs
    FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Allow anon read audit_logs" ON public.audit_logs
    FOR SELECT TO anon USING (true);

CREATE POLICY "Allow anon insert audit_logs" ON public.audit_logs
    FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "Allow authenticated read user_profiles" ON public.user_profiles
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated modify user_profiles" ON public.user_profiles
    FOR ALL TO authenticated USING (true);

CREATE POLICY "Allow anon read user_profiles" ON public.user_profiles
    FOR SELECT TO anon USING (true);

CREATE POLICY "Allow anon modify user_profiles" ON public.user_profiles
    FOR ALL TO anon USING (true);
