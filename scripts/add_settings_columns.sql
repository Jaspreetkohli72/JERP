-- Add missing configuration columns to settings table
ALTER TABLE public.settings 
ADD COLUMN IF NOT EXISTS default_attendance_worked_for text DEFAULT 'Me',
ADD COLUMN IF NOT EXISTS welder_rate numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS helper_rate numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS advance_required numeric DEFAULT 0;
