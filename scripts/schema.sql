-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.bill_items (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  bill_id uuid,
  description text NOT NULL,
  length numeric DEFAULT 0,
  breadth numeric DEFAULT 0,
  depth numeric DEFAULT 0,
  unit text DEFAULT 'sqft'::text,
  quantity numeric DEFAULT 0,
  rate numeric DEFAULT 0,
  amount numeric DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT bill_items_pkey PRIMARY KEY (id),
  CONSTRAINT bill_items_bill_id_fkey FOREIGN KEY (bill_id) REFERENCES public.bills(id)
);
CREATE TABLE public.bills (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  measurement_id uuid,
  client_name text NOT NULL,
  bill_date date DEFAULT CURRENT_DATE,
  total_amount numeric NOT NULL,
  status text DEFAULT 'unpaid'::text,
  bill_number integer NOT NULL DEFAULT nextval('bills_bill_number_seq'::regclass),
  estimate_id uuid,
  project_name text,
  CONSTRAINT bills_pkey PRIMARY KEY (id),
  CONSTRAINT bills_measurement_id_fkey FOREIGN KEY (measurement_id) REFERENCES public.measurements(id),
  CONSTRAINT bills_estimate_id_fkey FOREIGN KEY (estimate_id) REFERENCES public.estimates(id)
);
CREATE TABLE public.budgets (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  category_id uuid,
  month_year text NOT NULL,
  amount_limit numeric NOT NULL,
  CONSTRAINT budgets_pkey PRIMARY KEY (id),
  CONSTRAINT budgets_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.categories(id)
);
CREATE TABLE public.categories (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  name text NOT NULL,
  type text NOT NULL,
  icon text,
  CONSTRAINT categories_pkey PRIMARY KEY (id)
);
CREATE TABLE public.client_queries (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  customer_name text,
  phone text,
  query_text text,
  status text DEFAULT 'new'::text,
  follow_up_date date,
  CONSTRAINT client_queries_pkey PRIMARY KEY (id)
);
CREATE TABLE public.clients (
  id integer NOT NULL DEFAULT nextval('clients_id_seq'::regclass),
  name text NOT NULL,
  phone text,
  address text,
  status text DEFAULT 'Active'::text,
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  start_date date,
  next_action_date date,
  measurements text,
  image_urls ARRAY DEFAULT '{}'::text[],
  projects jsonb DEFAULT '[]'::jsonb,
  CONSTRAINT clients_pkey PRIMARY KEY (id)
);
CREATE TABLE public.contacts (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  name text NOT NULL,
  phone text,
  email text,
  CONSTRAINT contacts_pkey PRIMARY KEY (id)
);
CREATE TABLE public.estimate_items (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  estimate_id uuid,
  description text NOT NULL,
  unit text,
  quantity numeric NOT NULL,
  rate numeric NOT NULL,
  amount numeric NOT NULL,
  length numeric DEFAULT 0,
  breadth numeric DEFAULT 0,
  depth numeric DEFAULT 1,
  CONSTRAINT estimate_items_pkey PRIMARY KEY (id),
  CONSTRAINT estimate_items_estimate_id_fkey FOREIGN KEY (estimate_id) REFERENCES public.estimates(id)
);
CREATE TABLE public.estimates (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  client_name text NOT NULL,
  project_name text,
  status text DEFAULT 'draft'::text,
  total_amount numeric DEFAULT 0,
  valid_until date,
  notes text,
  estimate_number integer NOT NULL DEFAULT nextval('estimates_estimate_number_seq'::regclass),
  CONSTRAINT estimates_pkey PRIMARY KEY (id)
);
CREATE TABLE public.global_budgets (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  month_year text NOT NULL,
  amount_limit numeric NOT NULL,
  CONSTRAINT global_budgets_pkey PRIMARY KEY (id)
);
CREATE TABLE public.inventory (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  item_name text NOT NULL,
  base_rate numeric NOT NULL,
  unit text DEFAULT 'pcs'::text,
  item_type text,
  dimension text,
  current_stock numeric DEFAULT 0,
  category text DEFAULT 'Raw Material'::text,
  CONSTRAINT inventory_pkey PRIMARY KEY (id)
);
CREATE TABLE public.measurement_items (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  measurement_id uuid,
  description text NOT NULL,
  length numeric DEFAULT 0,
  breadth numeric DEFAULT 0,
  depth numeric DEFAULT 0,
  quantity numeric NOT NULL,
  unit text,
  CONSTRAINT measurement_items_pkey PRIMARY KEY (id),
  CONSTRAINT measurement_items_measurement_id_fkey FOREIGN KEY (measurement_id) REFERENCES public.measurements(id)
);
CREATE TABLE public.measurements (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  estimate_id uuid,
  title text NOT NULL,
  date date DEFAULT CURRENT_DATE,
  status text DEFAULT 'draft'::text,
  CONSTRAINT measurements_pkey PRIMARY KEY (id),
  CONSTRAINT measurements_estimate_id_fkey FOREIGN KEY (estimate_id) REFERENCES public.estimates(id)
);
CREATE TABLE public.project_types (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  type_name text NOT NULL UNIQUE,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT project_types_pkey PRIMARY KEY (id)
);
CREATE TABLE public.projects (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  client_id bigint NOT NULL,
  project_type_id bigint NOT NULL,
  measurements text,
  site_photos jsonb DEFAULT '[]'::jsonb,
  internal_estimate jsonb,
  client_estimate jsonb,
  final_settlement_amount numeric,
  status text DEFAULT 'Draft'::text,
  created_at timestamp with time zone DEFAULT now(),
  visit_date date DEFAULT CURRENT_DATE,
  assigned_staff jsonb DEFAULT '[]'::jsonb,
  CONSTRAINT projects_pkey PRIMARY KEY (id),
  CONSTRAINT projects_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(id),
  CONSTRAINT projects_project_type_id_fkey FOREIGN KEY (project_type_id) REFERENCES public.project_types(id)
);
CREATE TABLE public.purchase_items (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  purchase_id uuid,
  inventory_item_id bigint,
  description text,
  quantity numeric DEFAULT 0,
  rate numeric DEFAULT 0,
  amount numeric DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT purchase_items_pkey PRIMARY KEY (id),
  CONSTRAINT purchase_items_purchase_id_fkey FOREIGN KEY (purchase_id) REFERENCES public.purchases(id),
  CONSTRAINT purchase_items_inventory_item_id_fkey FOREIGN KEY (inventory_item_id) REFERENCES public.inventory(id)
);
CREATE TABLE public.purchase_log (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  supplier_id bigint,
  item_name text,
  qty numeric,
  rate numeric,
  total_cost numeric,
  CONSTRAINT purchase_log_pkey PRIMARY KEY (id),
  CONSTRAINT purchase_log_supplier_id_fkey FOREIGN KEY (supplier_id) REFERENCES public.suppliers(id)
);
CREATE TABLE public.purchases (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  date date DEFAULT CURRENT_DATE,
  supplier_id bigint,
  total_amount numeric DEFAULT 0,
  invoice_number text,
  notes text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT purchases_pkey PRIMARY KEY (id),
  CONSTRAINT purchases_supplier_id_fkey FOREIGN KEY (supplier_id) REFERENCES public.suppliers(id)
);
CREATE TABLE public.settings (
  id bigint NOT NULL,
  advance_percentage numeric DEFAULT 10.0,
  profit_margin integer DEFAULT 15,
  CONSTRAINT settings_pkey PRIMARY KEY (id)
);
CREATE TABLE public.shopping_list (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  item_name text NOT NULL,
  quantity numeric DEFAULT 1,
  unit text DEFAULT 'pcs'::text,
  date_needed date DEFAULT CURRENT_DATE,
  status text DEFAULT 'Pending'::text,
  notes text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT shopping_list_pkey PRIMARY KEY (id)
);
CREATE TABLE public.staff (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  name text NOT NULL,
  role text NOT NULL,
  phone text,
  salary numeric DEFAULT 0,
  joined_date date DEFAULT CURRENT_DATE,
  status text DEFAULT 'Available'::text,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT staff_pkey PRIMARY KEY (id)
);
CREATE TABLE public.staff_advances (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  staff_id bigint,
  amount numeric DEFAULT 0,
  date date DEFAULT CURRENT_DATE,
  notes text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT staff_advances_pkey PRIMARY KEY (id),
  CONSTRAINT staff_advances_staff_id_fkey FOREIGN KEY (staff_id) REFERENCES public.staff(id)
);
CREATE TABLE public.staff_attendance (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  staff_id bigint,
  date date DEFAULT CURRENT_DATE,
  status text DEFAULT 'Present'::text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT staff_attendance_pkey PRIMARY KEY (id),
  CONSTRAINT staff_attendance_staff_id_fkey FOREIGN KEY (staff_id) REFERENCES public.staff(id)
);
CREATE TABLE public.staff_roles (
  role_name text NOT NULL,
  default_salary numeric DEFAULT 0,
  CONSTRAINT staff_roles_pkey PRIMARY KEY (role_name)
);
CREATE TABLE public.sticky_notes (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  content text,
  color text DEFAULT 'yellow'::text,
  is_pinned boolean DEFAULT false,
  CONSTRAINT sticky_notes_pkey PRIMARY KEY (id)
);
CREATE TABLE public.supplier_purchases (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  supplier_id bigint,
  item_name text,
  quantity numeric,
  cost numeric,
  purchase_date date,
  notes text,
  CONSTRAINT supplier_purchases_pkey PRIMARY KEY (id),
  CONSTRAINT supplier_purchases_supplier_id_fkey FOREIGN KEY (supplier_id) REFERENCES public.suppliers(id)
);
CREATE TABLE public.suppliers (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  name text NOT NULL,
  contact_person text,
  phone text,
  gstin text,
  CONSTRAINT suppliers_pkey PRIMARY KEY (id)
);
CREATE TABLE public.transactions (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  amount numeric NOT NULL,
  type text NOT NULL,
  description text,
  transaction_date date DEFAULT CURRENT_DATE,
  category_id uuid,
  contact_id uuid,
  wallet_id uuid,
  CONSTRAINT transactions_pkey PRIMARY KEY (id),
  CONSTRAINT transactions_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.categories(id),
  CONSTRAINT transactions_contact_id_fkey FOREIGN KEY (contact_id) REFERENCES public.contacts(id),
  CONSTRAINT transactions_wallet_id_fkey FOREIGN KEY (wallet_id) REFERENCES public.wallets(id)
);
CREATE TABLE public.users (
  username text NOT NULL,
  password text NOT NULL,
  recovery_key text NOT NULL,
  CONSTRAINT users_pkey PRIMARY KEY (username)
);
CREATE TABLE public.wallets (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  name text NOT NULL,
  type text NOT NULL,
  balance numeric DEFAULT 0,
  CONSTRAINT wallets_pkey PRIMARY KEY (id)
);
CREATE TABLE public.work_logs (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  date date DEFAULT CURRENT_DATE,
  description text NOT NULL,
  status text DEFAULT 'pending'::text,
  priority text DEFAULT 'normal'::text,
  CONSTRAINT work_logs_pkey PRIMARY KEY (id)
);