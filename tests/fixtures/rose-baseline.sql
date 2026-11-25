-- Controlled PostgreSQL fixture from inspected schema metadata; no records were exported.
create schema auth;
create role anon nologin;
create role authenticated nologin;
create role service_role nologin bypassrls;
create table auth.users (id uuid primary key, email text unique, invited_at timestamptz, email_confirmed_at timestamptz);
create table auth.sessions (id uuid primary key, user_id uuid not null references auth.users, not_after timestamptz);
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true),'')::uuid $$;
create function auth.jwt() returns jsonb language sql stable as $$ select coalesce(nullif(current_setting('request.jwt.claims', true),''),'{}')::jsonb $$;
create schema storage;
create table storage.objects (id uuid primary key, bucket_id text not null, name text not null);
alter table storage.objects enable row level security;
grant usage on schema storage to authenticated;
grant select on storage.objects to authenticated;
create schema rose_care;
revoke all on schema rose_care from public, anon, authenticated;

create table rose_care.addresses (
  id uuid default gen_random_uuid() not null,
  customer_id uuid not null,
  address text not null,
  city text,
  country text default 'MA'::text not null
);
create table rose_care.audit_logs (
  id uuid default gen_random_uuid() not null,
  actor_id uuid,
  action text not null,
  entity text not null,
  entity_id uuid,
  created_at timestamptz default now() not null
);
create table rose_care.bundles (
  bundle_variant_id uuid not null,
  component_variant_id uuid not null,
  quantity integer not null
);
create table rose_care.care_guides (
  id uuid default gen_random_uuid() not null,
  product_id uuid,
  language text not null,
  title text not null,
  storage_path text,
  body text,
  approved boolean default false not null
);
create table rose_care.complaints (
  id uuid default gen_random_uuid() not null,
  customer_id uuid not null,
  order_id uuid,
  assignee_id uuid,
  category text not null,
  details text,
  status text default 'open'::text not null,
  created_at timestamptz default now() not null
);
create table rose_care.conversations (
  id uuid default gen_random_uuid() not null,
  customer_id uuid not null,
  advisor_id uuid,
  channel text not null,
  status text default 'open'::text not null
);
create table rose_care.customers (
  id uuid default gen_random_uuid() not null,
  shopify_id text,
  name text not null,
  phone text,
  email text,
  language text default 'fr'::text not null,
  market text default 'MA'::text not null,
  advisor_id uuid,
  created_at timestamptz default now() not null
);
create table rose_care.employees (
  id uuid not null,
  display_name text not null,
  role text not null,
  active boolean default true not null,
  created_at timestamptz default now() not null
);
create table rose_care.faqs (
  id uuid default gen_random_uuid() not null,
  product_id uuid,
  language text not null,
  category text not null,
  question text not null,
  answer text not null,
  approved boolean default false not null
);
create table rose_care.message_templates (
  id uuid default gen_random_uuid() not null,
  category text not null,
  language text not null,
  title text not null,
  body text not null,
  approved boolean default false not null,
  version integer default 1 not null
);
create table rose_care.messages (
  id uuid default gen_random_uuid() not null,
  conversation_id uuid not null,
  template_id uuid,
  direction text not null,
  body text not null,
  created_at timestamptz default now() not null
);
create table rose_care.order_events (
  id uuid default gen_random_uuid() not null,
  order_id uuid not null,
  actor_id uuid,
  event_type text not null,
  details jsonb default '{}'::jsonb not null,
  created_at timestamptz default now() not null
);
create table rose_care.order_items (
  id uuid default gen_random_uuid() not null,
  order_id uuid not null,
  variant_id uuid,
  title text not null,
  quantity integer not null,
  unit_price numeric not null
);
create table rose_care.orders (
  id uuid default gen_random_uuid() not null,
  shopify_id text,
  customer_id uuid not null,
  advisor_id uuid,
  status text default 'new'::text not null,
  currency text default 'MAD'::text not null,
  total numeric not null,
  shipping numeric default 0 not null,
  created_at timestamptz default now() not null
);
create table rose_care.preferences (
  customer_id uuid not null,
  marketing_opt_in boolean default false not null,
  consent_at timestamptz,
  preferred_channel text
);
create table rose_care.products (
  id uuid default gen_random_uuid() not null,
  shopify_id text,
  title text not null,
  knowledge jsonb default '{}'::jsonb not null,
  active boolean default true not null
);
create table rose_care.tasks (
  id uuid default gen_random_uuid() not null,
  order_id uuid,
  customer_id uuid,
  assignee_id uuid,
  title text not null,
  due_at timestamptz,
  status text default 'open'::text not null
);
create table rose_care.variants (
  id uuid default gen_random_uuid() not null,
  product_id uuid not null,
  shopify_id text,
  sku text,
  title text not null,
  price numeric,
  currency text default 'MAD'::text not null
);
alter table rose_care.addresses add PRIMARY KEY (id);
alter table rose_care.audit_logs add PRIMARY KEY (id);
alter table rose_care.bundles add PRIMARY KEY (bundle_variant_id, component_variant_id);
alter table rose_care.bundles add CHECK ((quantity > 0));
alter table rose_care.care_guides add PRIMARY KEY (id);
alter table rose_care.complaints add PRIMARY KEY (id);
alter table rose_care.conversations add PRIMARY KEY (id);
alter table rose_care.customers add PRIMARY KEY (id);
alter table rose_care.customers add UNIQUE (shopify_id);
alter table rose_care.employees add PRIMARY KEY (id);
alter table rose_care.employees add CHECK ((role = ANY (ARRAY['admin'::text, 'manager'::text, 'advisor'::text, 'logistics'::text, 'preparation'::text])));
alter table rose_care.faqs add PRIMARY KEY (id);
alter table rose_care.message_templates add CHECK ((language = ANY (ARRAY['fr'::text, 'ar'::text, 'darija'::text, 'en'::text])));
alter table rose_care.message_templates add PRIMARY KEY (id);
alter table rose_care.messages add CHECK ((direction = ANY (ARRAY['inbound'::text, 'outbound'::text])));
alter table rose_care.messages add PRIMARY KEY (id);
alter table rose_care.order_events add PRIMARY KEY (id);
alter table rose_care.order_items add PRIMARY KEY (id);
alter table rose_care.order_items add CHECK ((quantity > 0));
alter table rose_care.order_items add CHECK ((unit_price >= (0)::numeric));
alter table rose_care.orders add PRIMARY KEY (id);
alter table rose_care.orders add CHECK ((shipping >= (0)::numeric));
alter table rose_care.orders add UNIQUE (shopify_id);
alter table rose_care.orders add CHECK ((status = ANY (ARRAY['new'::text, 'contacting'::text, 'callback'::text, 'confirmed'::text, 'preparing'::text, 'dispatched'::text, 'delivered'::text, 'failed_delivery'::text, 'cancelled'::text, 'returned'::text])));
alter table rose_care.orders add CHECK ((total >= (0)::numeric));
alter table rose_care.preferences add PRIMARY KEY (customer_id);
alter table rose_care.products add PRIMARY KEY (id);
alter table rose_care.products add UNIQUE (shopify_id);
alter table rose_care.tasks add PRIMARY KEY (id);
alter table rose_care.variants add PRIMARY KEY (id);
alter table rose_care.variants add CHECK ((price >= (0)::numeric));
alter table rose_care.variants add UNIQUE (shopify_id);
alter table rose_care.addresses add FOREIGN KEY (customer_id) REFERENCES rose_care.customers(id);
alter table rose_care.addresses enable row level security;
alter table rose_care.audit_logs add FOREIGN KEY (actor_id) REFERENCES rose_care.employees(id);
alter table rose_care.audit_logs enable row level security;
alter table rose_care.bundles add FOREIGN KEY (bundle_variant_id) REFERENCES rose_care.variants(id);
alter table rose_care.bundles add FOREIGN KEY (component_variant_id) REFERENCES rose_care.variants(id);
alter table rose_care.bundles enable row level security;
alter table rose_care.care_guides add FOREIGN KEY (product_id) REFERENCES rose_care.products(id);
alter table rose_care.care_guides enable row level security;
alter table rose_care.complaints add FOREIGN KEY (assignee_id) REFERENCES rose_care.employees(id);
alter table rose_care.complaints add FOREIGN KEY (customer_id) REFERENCES rose_care.customers(id);
alter table rose_care.complaints add FOREIGN KEY (order_id) REFERENCES rose_care.orders(id);
alter table rose_care.complaints enable row level security;
alter table rose_care.conversations add FOREIGN KEY (advisor_id) REFERENCES rose_care.employees(id);
alter table rose_care.conversations add FOREIGN KEY (customer_id) REFERENCES rose_care.customers(id);
alter table rose_care.conversations enable row level security;
alter table rose_care.customers add FOREIGN KEY (advisor_id) REFERENCES rose_care.employees(id);
alter table rose_care.customers enable row level security;
alter table rose_care.employees add FOREIGN KEY (id) REFERENCES auth.users(id);
alter table rose_care.employees enable row level security;
alter table rose_care.faqs add FOREIGN KEY (product_id) REFERENCES rose_care.products(id);
alter table rose_care.faqs enable row level security;
alter table rose_care.message_templates enable row level security;
alter table rose_care.messages add FOREIGN KEY (conversation_id) REFERENCES rose_care.conversations(id);
alter table rose_care.messages add FOREIGN KEY (template_id) REFERENCES rose_care.message_templates(id);
alter table rose_care.messages enable row level security;
alter table rose_care.order_events add FOREIGN KEY (actor_id) REFERENCES rose_care.employees(id);
alter table rose_care.order_events add FOREIGN KEY (order_id) REFERENCES rose_care.orders(id);
alter table rose_care.order_events enable row level security;
alter table rose_care.order_items add FOREIGN KEY (order_id) REFERENCES rose_care.orders(id);
alter table rose_care.order_items add FOREIGN KEY (variant_id) REFERENCES rose_care.variants(id);
alter table rose_care.order_items enable row level security;
alter table rose_care.orders add FOREIGN KEY (advisor_id) REFERENCES rose_care.employees(id);
alter table rose_care.orders add FOREIGN KEY (customer_id) REFERENCES rose_care.customers(id);
alter table rose_care.orders enable row level security;
alter table rose_care.preferences add FOREIGN KEY (customer_id) REFERENCES rose_care.customers(id);
alter table rose_care.preferences enable row level security;
alter table rose_care.products enable row level security;
alter table rose_care.tasks add FOREIGN KEY (assignee_id) REFERENCES rose_care.employees(id);
alter table rose_care.tasks add FOREIGN KEY (customer_id) REFERENCES rose_care.customers(id);
alter table rose_care.tasks add FOREIGN KEY (order_id) REFERENCES rose_care.orders(id);
alter table rose_care.tasks enable row level security;
alter table rose_care.variants add FOREIGN KEY (product_id) REFERENCES rose_care.products(id);
alter table rose_care.variants enable row level security;
