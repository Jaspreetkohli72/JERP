-- 1. Add timestamp tracking columns to staff_attendance
ALTER TABLE public.staff_attendance 
ADD COLUMN IF NOT EXISTS punch_in timestamp with time zone,
ADD COLUMN IF NOT EXISTS punch_out timestamp with time zone;

-- 2. Create raw punch log table for pairing and audit
CREATE TABLE IF NOT EXISTS public.staff_punches (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  staff_id bigint NOT NULL REFERENCES public.staff(id) ON DELETE CASCADE,
  punch_type text NOT NULL CHECK (punch_type IN ('IN', 'OUT')),
  punched_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  date date NOT NULL DEFAULT (CURRENT_DATE AT TIME ZONE 'Asia/Kolkata')::date,
  created_at timestamp with time zone DEFAULT now()
);

-- 3. Optimized index for today's punch lookups
CREATE INDEX IF NOT EXISTS idx_staff_punches_staff_date 
  ON public.staff_punches (staff_id, date, punched_at ASC);

-- 4. Enable open RLS policies for kiosk operations
ALTER TABLE public.staff_punches ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public all on staff_punches" ON public.staff_punches;
CREATE POLICY "Allow public all on staff_punches" 
  ON public.staff_punches FOR ALL TO anon USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow authenticated all on staff_punches" ON public.staff_punches;
CREATE POLICY "Allow authenticated all on staff_punches" 
  ON public.staff_punches FOR ALL TO authenticated USING (true) WITH CHECK (true);
