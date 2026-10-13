-- ==============================================================================
-- GFE ERP (Galaxy Fabricarion Experts) - Complete Database Schema Migration
-- Run this in Supabase SQL Editor: https://supabase.com/dashboard/project/acirakiaxrhfgtksmahm/sql/new
-- ==============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Wallets
CREATE TABLE IF NOT EXISTS public.wallets (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  name text NOT NULL,
  type text NOT NULL,
  balance numeric DEFAULT 0
);

-- 2. Staff & Payroll
CREATE TABLE IF NOT EXISTS public.staff (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name text NOT NULL,
  role text NOT NULL,
  phone text,
  salary numeric DEFAULT 0,
  joined_date date DEFAULT CURRENT_DATE,
  status text DEFAULT 'Available'::text,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.staff_attendance (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  staff_id bigint REFERENCES public.staff(id) ON DELETE CASCADE,
  date date DEFAULT CURRENT_DATE,
  status text DEFAULT 'Present'::text,
  worked_for text DEFAULT 'Me'::text,
  work_done text,
  status_papa text DEFAULT 'Absent'::text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT staff_attendance_staff_date_unique UNIQUE (staff_id, date)
);

CREATE TABLE IF NOT EXISTS public.staff_advances (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  staff_id bigint REFERENCES public.staff(id) ON DELETE CASCADE,
  amount numeric DEFAULT 0,
  date date DEFAULT CURRENT_DATE,
  notes text,
  created_at timestamp with time zone DEFAULT now()
);

-- 3. Operations (Work Logs, Sticky Notes, Inquiries)
CREATE TABLE IF NOT EXISTS public.work_logs (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  date date DEFAULT CURRENT_DATE,
  description text NOT NULL,
  status text DEFAULT 'pending'::text,
  priority text DEFAULT 'normal'::text
);

CREATE TABLE IF NOT EXISTS public.sticky_notes (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  content text,
  color text DEFAULT 'yellow'::text,
  is_pinned boolean DEFAULT false,
  date date DEFAULT CURRENT_DATE
);

CREATE TABLE IF NOT EXISTS public.client_queries (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  customer_name text,
  phone text,
  query_text text,
  status text DEFAULT 'new'::text,
  follow_up_date date
);

-- 4. Contracting (Estimates, Measurements, Bills)
CREATE SEQUENCE IF NOT EXISTS estimates_estimate_number_seq;
CREATE TABLE IF NOT EXISTS public.estimates (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  client_name text NOT NULL,
  project_name text,
  status text DEFAULT 'draft'::text,
  total_amount numeric DEFAULT 0,
  valid_until date,
  notes text,
  estimate_number integer NOT NULL DEFAULT nextval('estimates_estimate_number_seq'::regclass)
);

CREATE TABLE IF NOT EXISTS public.estimate_items (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  estimate_id uuid REFERENCES public.estimates(id) ON DELETE CASCADE,
  description text NOT NULL,
  unit text,
  quantity numeric NOT NULL DEFAULT 1,
  rate numeric NOT NULL DEFAULT 0,
  amount numeric NOT NULL DEFAULT 0,
  length numeric DEFAULT 0,
  breadth numeric DEFAULT 0,
  depth numeric DEFAULT 1
);

CREATE TABLE IF NOT EXISTS public.measurements (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  estimate_id uuid REFERENCES public.estimates(id) ON DELETE SET NULL,
  title text NOT NULL,
  date date DEFAULT CURRENT_DATE,
  status text DEFAULT 'draft'::text
);

CREATE TABLE IF NOT EXISTS public.measurement_items (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  measurement_id uuid REFERENCES public.measurements(id) ON DELETE CASCADE,
  description text NOT NULL,
  length numeric DEFAULT 0,
  breadth numeric DEFAULT 0,
  depth numeric DEFAULT 0,
  quantity numeric NOT NULL DEFAULT 1,
  unit text
);

CREATE SEQUENCE IF NOT EXISTS bills_bill_number_seq;
CREATE TABLE IF NOT EXISTS public.bills (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  measurement_id uuid REFERENCES public.measurements(id) ON DELETE SET NULL,
  client_name text NOT NULL,
  bill_date date DEFAULT CURRENT_DATE,
  total_amount numeric NOT NULL DEFAULT 0,
  status text DEFAULT 'unpaid'::text,
  bill_number integer NOT NULL DEFAULT nextval('bills_bill_number_seq'::regclass),
  estimate_id uuid REFERENCES public.estimates(id) ON DELETE SET NULL,
  project_name text
);

CREATE TABLE IF NOT EXISTS public.bill_items (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  bill_id uuid REFERENCES public.bills(id) ON DELETE CASCADE,
  description text NOT NULL,
  length numeric DEFAULT 0,
  breadth numeric DEFAULT 0,
  depth numeric DEFAULT 0,
  unit text DEFAULT 'sqft'::text,
  quantity numeric DEFAULT 0,
  rate numeric DEFAULT 0,
  amount numeric DEFAULT 0,
  created_at timestamp with time zone DEFAULT now()
);

-- 5. Projects
CREATE TABLE IF NOT EXISTS public.project_types (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  type_name text NOT NULL UNIQUE,
  created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.projects (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name text,
  contact_id uuid REFERENCES public.contacts(id) ON DELETE SET NULL,
  project_type_id bigint REFERENCES public.project_types(id) ON DELETE SET NULL,
  measurements text,
  site_photos jsonb DEFAULT '[]'::jsonb,
  internal_estimate jsonb,
  client_estimate jsonb,
  final_settlement_amount numeric,
  status text DEFAULT 'Draft'::text,
  created_at timestamp with time zone DEFAULT now(),
  visit_date date DEFAULT CURRENT_DATE,
  start_date date DEFAULT CURRENT_DATE,
  assigned_staff jsonb DEFAULT '[]'::jsonb
);

-- 6. Procurement & Inventory
CREATE TABLE IF NOT EXISTS public.suppliers (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name text NOT NULL,
  contact_person text,
  phone text,
  gstin text
);

CREATE TABLE IF NOT EXISTS public.inventory (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  item_name text NOT NULL,
  base_rate numeric NOT NULL DEFAULT 0,
  unit text DEFAULT 'pcs'::text,
  item_type text,
  dimension text,
  current_stock numeric DEFAULT 0,
  category text DEFAULT 'Raw Material'::text,
  weight_per_unit numeric DEFAULT 0
);

CREATE TABLE IF NOT EXISTS public.purchases (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  date date DEFAULT CURRENT_DATE,
  supplier_id bigint REFERENCES public.suppliers(id) ON DELETE SET NULL,
  total_amount numeric DEFAULT 0,
  invoice_number text,
  notes text,
  created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.purchase_items (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  purchase_id uuid REFERENCES public.purchases(id) ON DELETE CASCADE,
  inventory_item_id bigint REFERENCES public.inventory(id) ON DELETE SET NULL,
  description text,
  quantity numeric DEFAULT 0,
  rate numeric DEFAULT 0,
  amount numeric DEFAULT 0,
  created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.shopping_list (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  item_name text NOT NULL,
  quantity numeric DEFAULT 1,
  unit text DEFAULT 'pcs'::text,
  date_needed date DEFAULT CURRENT_DATE,
  status text DEFAULT 'Pending'::text,
  notes text,
  created_at timestamp with time zone DEFAULT now()
);

-- 7. Sales
CREATE TABLE IF NOT EXISTS public.sales (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id uuid REFERENCES public.contacts(id) ON DELETE SET NULL,
  total_amount numeric DEFAULT 0,
  is_paid boolean DEFAULT false,
  date date DEFAULT CURRENT_DATE,
  notes text,
  created_at timestamp with time zone DEFAULT now()
);

-- 8. Settings
CREATE TABLE IF NOT EXISTS public.settings (
  id bigint PRIMARY KEY DEFAULT 1,
  advance_percentage numeric DEFAULT 10.0,
  profit_margin integer DEFAULT 15,
  default_attendance_worked_for text DEFAULT 'Me'::text
);

INSERT INTO public.settings (id, advance_percentage, profit_margin, default_attendance_worked_for)
VALUES (1, 10.0, 15, 'Me')
ON CONFLICT (id) DO NOTHING;

-- 9. Enable RLS on all tables and grant authenticated access
DO $$
DECLARE
  tbl text;
  tbls text[] := ARRAY[
    'wallets', 'staff', 'staff_attendance', 'staff_advances',
    'work_logs', 'sticky_notes', 'client_queries',
    'estimates', 'estimate_items', 'measurements', 'measurement_items',
    'bills', 'bill_items', 'projects', 'project_types',
    'suppliers', 'inventory', 'purchases', 'purchase_items',
    'shopping_list', 'sales', 'settings'
  ];
BEGIN
  FOREACH tbl IN ARRAY tbls LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', tbl);
    EXECUTE format('DROP POLICY IF EXISTS "Allow authenticated all on %I" ON public.%I;', tbl, tbl);
    EXECUTE format('CREATE POLICY "Allow authenticated all on %I" ON public.%I FOR ALL TO authenticated USING (true) WITH CHECK (true);', tbl, tbl);
    EXECUTE format('DROP POLICY IF EXISTS "Allow anon all on %I" ON public.%I;', tbl, tbl);
    EXECUTE format('CREATE POLICY "Allow anon all on %I" ON public.%I FOR ALL TO anon USING (true) WITH CHECK (true);', tbl, tbl);
  END LOOP;
END $$;
