-- Create table for tracking kiosk device telemetry, battery health, and online status
CREATE TABLE IF NOT EXISTS public.kiosk_health (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    device_id text NOT NULL UNIQUE DEFAULT 'default',
    battery_percentage numeric(5,2),
    is_charging boolean DEFAULT false,
    charging_state text DEFAULT 'discharging',
    ip_address text,
    app_version text,
    metadata jsonb DEFAULT '{}'::jsonb,
    last_seen timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- Indexes for quick device lookups
CREATE INDEX IF NOT EXISTS idx_kiosk_health_device_id ON public.kiosk_health(device_id);
CREATE INDEX IF NOT EXISTS idx_kiosk_health_last_seen ON public.kiosk_health(last_seen DESC);

-- Enable RLS and grant read/write access for kiosk tablet telemetry
ALTER TABLE public.kiosk_health ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public all on kiosk_health" ON public.kiosk_health;
CREATE POLICY "Allow public all on kiosk_health" 
    ON public.kiosk_health FOR ALL TO anon USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow authenticated all on kiosk_health" ON public.kiosk_health;
CREATE POLICY "Allow authenticated all on kiosk_health" 
    ON public.kiosk_health FOR ALL TO authenticated USING (true) WITH CHECK (true);
