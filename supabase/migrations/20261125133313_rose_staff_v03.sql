-- Draft for review. The existing rose_care schema is a prerequisite.
begin;
create role rose_care_app nologin noinherit nosuperuser nocreatedb nocreaterole noreplication nobypassrls;
grant usage on schema rose_care to rose_care_app;
revoke all on schema rose_care from public, anon, authenticated;
revoke all on all tables in schema rose_care from public, anon, authenticated;
revoke all on rose_care.audit_logs, rose_care.order_events from service_role;

alter table rose_care.employees add column staff_fixture boolean not null default false;
alter table rose_care.customers
  add column staff_fixture boolean not null default false,
  add column title text check (title in ('Mme', 'M.')),
  add column notes text[] not null default '{}';
alter table rose_care.orders
  add column staff_fixture boolean not null default false,
  add column version integer not null default 1 check (version > 0),
  add column discount numeric(12,2) not null default 0 check (discount >= 0),
  add column delivery_phone text,
  add column delivery_address text,
  add column delivery_city text,
  add column preparation_id uuid references rose_care.employees(id),
  add column logistics_id uuid references rose_care.employees(id);
do $$
declare old_name name;
begin
  select conname into strict old_name from pg_catalog.pg_constraint
  where conrelid = 'rose_care.orders'::regclass and contype = 'c'
    and pg_catalog.pg_get_constraintdef(oid) like '%contacting%';
  execute pg_catalog.format('alter table rose_care.orders drop constraint %I', old_name);
end $$;
alter table rose_care.orders add constraint rose_v03_order_status check (status in
  ('new','contacting','callback','confirmed','preparing','dispatched','delivered','failed_delivery','cancelled','return_requested','returned'));
alter table rose_care.products
  add column staff_fixture boolean not null default false,
  add column kind text not null default 'product' check (kind in ('product','bundle'));
alter table rose_care.variants
  add column preorder boolean not null default false,
  add column stock integer check (stock >= 0);
alter table rose_care.care_guides
  add column staff_fixture boolean not null default false,
  add column category text not null default 'Soin';
alter table rose_care.faqs add column staff_fixture boolean not null default false;
alter table rose_care.message_templates add column staff_fixture boolean not null default false;
alter table rose_care.tasks
  add column staff_fixture boolean not null default false,
  add column kind text not null default 'task' check (kind in ('task','callback')),
  add column completed_at timestamptz;
create table rose_care.employee_invites (
  email text primary key check (email ~ '^[a-z0-9._+-]+@example[.]test$'),
  display_name text not null check (length(display_name) between 1 and 100),
  role text not null check (role in ('manager','advisor','logistics','preparation')),
  expires_at timestamptz not null,
  created_by uuid not null references rose_care.employees(id)
);
alter table rose_care.employee_invites enable row level security;
revoke all on rose_care.employee_invites from public, anon, authenticated, service_role;
create index if not exists rose_v03_addresses_customer on rose_care.addresses(customer_id);
create index if not exists rose_v03_customers_scope on rose_care.customers(advisor_id,id) where staff_fixture;
create index if not exists rose_v03_orders_preparation on rose_care.orders(preparation_id,created_at desc);
create index if not exists rose_v03_orders_logistics on rose_care.orders(logistics_id,created_at desc);
create index if not exists rose_v03_items_order on rose_care.order_items(order_id);
create index if not exists rose_v03_order_history on rose_care.order_events(order_id,created_at);
create index if not exists rose_v03_tasks_order on rose_care.tasks(order_id) where staff_fixture;
create index if not exists rose_v03_variants_product on rose_care.variants(product_id);
create index if not exists rose_v03_complaints_customer on rose_care.complaints(customer_id,created_at desc);
create index if not exists rose_v03_conversations_customer on rose_care.conversations(customer_id);
create index if not exists rose_v03_messages_conversation on rose_care.messages(conversation_id,created_at);
create index if not exists rose_v03_guide_path on rose_care.care_guides(storage_path) where staff_fixture and approved;
create unique index if not exists rose_v03_template_identity on rose_care.message_templates(category,language) where staff_fixture;

create function rose_care.staff_session(p_user uuid, p_session uuid) returns boolean
language sql volatile set search_path = '' as $$
  select exists (select 1 from auth.sessions s where s.id=p_session and s.user_id=p_user
    and (s.not_after is null or s.not_after > clock_timestamp()))
$$;

create function rose_care.staff_actor(p_user uuid, p_session uuid, p_write boolean default false)
returns rose_care.employees language plpgsql set search_path = '' as $$
declare actor rose_care.employees%rowtype;
begin
  if not rose_care.staff_session(p_user,p_session) then
    raise exception 'Staff access denied' using errcode='42501';
  end if;
  if p_write then
    perform 1 from auth.sessions s where s.id=p_session and s.user_id=p_user
      and (s.not_after is null or s.not_after > clock_timestamp()) for share;
    if not found then raise exception 'Staff access denied' using errcode='42501'; end if;
    select * into actor from rose_care.employees where id=p_user and active and staff_fixture for share;
  else
    select * into actor from rose_care.employees where id=p_user and active and staff_fixture;
  end if;
  if not found then raise exception 'Staff access denied' using errcode='42501'; end if;
  return actor;
end $$;

create function rose_care.staff_identity(p_user uuid,p_session uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare actor rose_care.employees;
begin
  actor := rose_care.staff_actor(p_user,p_session);
  return jsonb_build_object('id',actor.id,'name',actor.display_name,'role',actor.role);
end $$;

create function rose_care.staff_customer_visible(p_actor rose_care.employees, p_customer rose_care.customers)
returns boolean language sql immutable set search_path = '' as $$
  select p_customer.staff_fixture and
    (p_actor.role in ('admin','manager') or (p_actor.role='advisor' and p_customer.advisor_id=p_actor.id))
$$;

create function rose_care.staff_order_visible(p_actor rose_care.employees,p_order rose_care.orders,p_customer rose_care.customers)
returns boolean language sql immutable set search_path = '' as $$
  select p_order.id is not null and p_order.customer_id=p_customer.id and p_order.staff_fixture and p_customer.staff_fixture and case p_actor.role
    when 'admin' then true when 'manager' then true
    when 'advisor' then p_order.advisor_id=p_actor.id and p_customer.advisor_id=p_actor.id
    when 'logistics' then p_order.logistics_id=p_actor.id
    when 'preparation' then p_order.preparation_id=p_actor.id
    else false end
$$;

create function rose_care.staff_audit(p_actor uuid,p_action text,p_entity text,p_target uuid)
returns void language sql set search_path = '' as $$
  insert into rose_care.audit_logs(actor_id,action,entity,entity_id) values (p_actor,p_action,p_entity,p_target)
$$;
create function rose_care.staff_preserve_history() returns trigger language plpgsql set search_path = '' as $$
begin raise exception 'Append-only history' using errcode='42501'; end $$;
create trigger rose_v03_audit_append_only before update or delete or truncate on rose_care.audit_logs
for each statement execute function rose_care.staff_preserve_history();
create trigger rose_v03_order_history_append_only before update or delete or truncate on rose_care.order_events
for each statement execute function rose_care.staff_preserve_history();

create function rose_care.staff_workspace(p_user uuid,p_session uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare actor rose_care.employees; financial boolean; editorial boolean;
begin
  actor := rose_care.staff_actor(p_user,p_session);
  financial := actor.role in ('admin','manager','advisor');
  editorial := actor.role in ('admin','manager');
  return (
    with visible_customers as materialized (
      select c.* from rose_care.customers c where rose_care.staff_customer_visible(actor,c)
    ), visible_orders as materialized (
      select o.* from rose_care.orders o join rose_care.customers c on c.id=o.customer_id
      where rose_care.staff_order_visible(actor,o,c)
    ), visible_conversations as materialized (
      select c.id,c.customer_id,c.channel,c.status from rose_care.conversations c join visible_customers u on u.id=c.customer_id
      where editorial or c.advisor_id=actor.id
    )
    select jsonb_build_object(
      'customers',coalesce((select jsonb_agg(row) from (
        select c.id,c.name,c.title,c.phone,c.email,c.language,c.notes,c.advisor_id,
          coalesce((select jsonb_agg(jsonb_build_object('id',a.id,'address',a.address,'city',a.city,'country',a.country) order by a.id)
            from rose_care.addresses a where a.customer_id=c.id),'[]'::jsonb) addresses,
          (select jsonb_build_object('preferred_channel',p.preferred_channel,'marketing_opt_in',p.marketing_opt_in,'consent_at',p.consent_at)
            from rose_care.preferences p where p.customer_id=c.id) preferences
        from visible_customers c order by c.name,c.id limit 250
      ) row),'[]'::jsonb),
      'orders',coalesce((select jsonb_agg(row) from (
        select o.id, left(o.id::text,8) AS reference, case when financial then o.customer_id end customer_id,
          case when financial then c.name end customer_name, o.status,o.version,o.created_at,
          case when financial then o.advisor_id end advisor_id,
          case when financial then o.preparation_id end preparation_id,
          case when financial then o.logistics_id end logistics_id,
          case when financial or actor.role='logistics' then o.delivery_phone end delivery_phone,
          case when financial or actor.role='logistics' then o.delivery_address end delivery_address,
          case when financial or actor.role='logistics' then o.delivery_city end delivery_city,
          case when financial then o.total end total,case when financial then o.shipping end shipping,
          case when financial then o.discount end discount,case when financial then o.currency end currency,
          coalesce((select jsonb_agg(jsonb_build_object('id',i.id,'title',i.title,'quantity',i.quantity,
             'unit_price',case when financial then i.unit_price end) order by i.id)
             from rose_care.order_items i where i.order_id=o.id),'[]'::jsonb) items,
          coalesce((select jsonb_agg(jsonb_build_object('status',e.event_type,'at',e.created_at) order by e.created_at,e.id)
             from rose_care.order_events e where e.order_id=o.id and e.event_type in
               ('new','contacting','callback','confirmed','preparing','dispatched','delivered','failed_delivery','cancelled','return_requested','returned')),'[]'::jsonb) history
        from visible_orders o join rose_care.customers c on c.id=o.customer_id order by o.created_at desc,o.id limit 250
      ) row),'[]'::jsonb),
      'employees',coalesce((select jsonb_agg(jsonb_build_object('id',e.id,'name',e.display_name,'role',e.role,'active',e.active) order by e.display_name)
        from rose_care.employees e where e.staff_fixture and (editorial or e.id=actor.id)),'[]'::jsonb),
      'products',coalesce((select jsonb_agg(row) from (
        select p.id,p.title,p.kind,coalesce((select jsonb_agg(jsonb_build_object('id',v.id,'title',v.title,'price',case when financial then v.price end,
          'stock',v.stock,'preorder',v.preorder,
          'components',coalesce((select jsonb_agg(jsonb_build_object('variant_id',b.component_variant_id,'quantity',b.quantity,'title',cp.title||' · '||cv.title))
           from rose_care.bundles b join rose_care.variants cv on cv.id=b.component_variant_id
            join rose_care.products cp on cp.id=cv.product_id and cp.staff_fixture and cp.active
           where b.bundle_variant_id=v.id),'[]'::jsonb)) order by v.title) from rose_care.variants v where v.product_id=p.id),'[]'::jsonb) variants
        from rose_care.products p where p.staff_fixture and p.active order by p.title,p.id limit 250
      ) row),'[]'::jsonb),
      'templates',coalesce((select jsonb_agg(jsonb_build_object('id',t.id,'category',t.category,'language',t.language,'title',t.title,'body',t.body,'approved',t.approved,'version',t.version) order by t.category,t.language)
        from rose_care.message_templates t where t.staff_fixture and financial and (t.approved or editorial)),'[]'::jsonb),
      'guides',coalesce((select jsonb_agg(jsonb_build_object('id',g.id,'title',g.title,'body',g.body,'category',g.category,'language',g.language,'approved',g.approved,
        'file_available',g.approved and g.storage_path like 'fictional/%') order by g.title)
        from rose_care.care_guides g where g.staff_fixture and financial and (g.approved or editorial)),'[]'::jsonb),
      'faqs',coalesce((select jsonb_agg(jsonb_build_object('id',f.id,'question',f.question,'answer',f.answer,'category',f.category,'language',f.language,'approved',f.approved) order by f.question)
        from rose_care.faqs f where f.staff_fixture and financial and (f.approved or editorial)),'[]'::jsonb),
      'tasks',coalesce((select jsonb_agg(row) from (
        select t.id,t.title,t.kind,t.due_at,t.status,t.completed_at,t.assignee_id,t.customer_id,t.order_id
        from rose_care.tasks t where t.staff_fixture and (editorial or t.assignee_id=actor.id)
         and (t.customer_id is null or exists(select 1 from visible_customers c where c.id=t.customer_id))
         and (t.order_id is null or exists(select 1 from visible_orders o where o.id=t.order_id))
        order by t.due_at nulls last,t.id limit 250
      ) row),'[]'::jsonb),
      'complaints',coalesce((select jsonb_agg(row) from (
        select k.id,k.customer_id,k.order_id,k.category,k.details,k.status from rose_care.complaints k
          join visible_customers c on c.id=k.customer_id where (editorial or k.assignee_id=actor.id)
          and (k.order_id is null or exists(select 1 from visible_orders o where o.id=k.order_id))
        order by k.created_at desc,k.id limit 100
      ) row),'[]'::jsonb),
      'conversations',coalesce((select jsonb_agg(row) from (
        select c.*,coalesce((select jsonb_agg(m) from (select id,direction,body,created_at from rose_care.messages
          where conversation_id=c.id order by created_at desc,id limit 50) m),'[]'::jsonb) messages
        from visible_conversations c order by c.id limit 100
      ) row),'[]'::jsonb),
      'audit',coalesce((select jsonb_agg(row) from (
        select a.id,a.actor_id,a.action,a.entity,a.entity_id,a.created_at from rose_care.audit_logs a
        where actor.role='admin' and exists(select 1 from rose_care.employees e where e.staff_fixture and e.id=a.actor_id)
        order by a.created_at desc,a.id limit 100
      ) row),'[]'::jsonb)
    )
  );
end $$;

create function rose_care.staff_transition_allowed(p_role text,p_from text,p_to text) returns boolean
language sql immutable set search_path = '' as $$
  select case
    when (p_from,p_to) in (('new','confirmed'),('contacting','confirmed'),('callback','confirmed'),
      ('new','cancelled'),('contacting','cancelled'),('callback','cancelled'),('confirmed','cancelled'),
      ('preparing','cancelled'),('failed_delivery','cancelled'),('delivered','return_requested'))
      then p_role in ('admin','manager','advisor')
    when (p_from,p_to) in (('confirmed','preparing'),('failed_delivery','preparing'))
      then p_role in ('admin','manager','preparation')
    when (p_from,p_to) in (('preparing','dispatched'),('dispatched','delivered'),('dispatched','failed_delivery'),
      ('failed_delivery','return_requested'),('return_requested','returned'))
      then p_role in ('admin','manager','logistics')
    else false end
$$;

create function rose_care.staff_command(p_user uuid,p_session uuid,p_action text,p_data jsonb) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  actor rose_care.employees; customer rose_care.customers; current_order rose_care.orders; address rose_care.addresses;
  target uuid; customer_id_arg uuid; order_id_arg uuid; assignee uuid; editorial boolean;
  next_status text; subtotal numeric := 0; ship numeric; reduction numeric; line_price numeric; line_count integer;
  item record; item_rows jsonb := '[]'::jsonb; kind text; text_value text;
begin
  actor := rose_care.staff_actor(p_user,p_session,true);
  editorial := actor.role in ('admin','manager');
  if p_data is null or jsonb_typeof(p_data) <> 'object' or octet_length(p_data::text)>24000 then
    raise exception 'Invalid input' using errcode='22023';
  end if;
  target := nullif(p_data->>'id','')::uuid;
  customer_id_arg := nullif(p_data->>'customer_id','')::uuid;
  order_id_arg := nullif(p_data->>'order_id','')::uuid;

  case p_action
    when 'order.transition','order.assign' then
      select * into current_order from rose_care.orders where id=target for update;
      select * into customer from rose_care.customers where id=current_order.customer_id;
      if not rose_care.staff_session(p_user,p_session) then raise exception 'Staff access denied' using errcode='42501'; end if;
      if not coalesce(rose_care.staff_order_visible(actor,current_order,customer),false) then
        raise exception 'Staff access denied' using errcode='42501';
      end if;
      if current_order.version is distinct from (p_data->>'version')::integer then
        raise exception 'Order changed' using errcode='40001';
      end if;
      if p_action='order.transition' then
        next_status := p_data->>'status';
        if not coalesce(rose_care.staff_transition_allowed(actor.role,current_order.status,next_status),false) then
          raise exception 'Staff access denied' using errcode='42501';
        end if;
        update rose_care.orders set status=next_status,version=version+1 where id=target;
        insert into rose_care.order_events(order_id,actor_id,event_type) values(target,actor.id,next_status);
      else
        if not editorial then raise exception 'Staff access denied' using errcode='42501'; end if;
        if nullif(p_data->>'preparation_id','') is not null and not exists(select 1 from rose_care.employees
            where id=(p_data->>'preparation_id')::uuid and active and staff_fixture and role='preparation' for share) then
          raise exception 'Invalid assignee' using errcode='22023';
        end if;
        if nullif(p_data->>'logistics_id','') is not null and not exists(select 1 from rose_care.employees
            where id=(p_data->>'logistics_id')::uuid and active and staff_fixture and role='logistics' for share) then
          raise exception 'Invalid assignee' using errcode='22023';
        end if;
        update rose_care.orders set preparation_id=nullif(p_data->>'preparation_id','')::uuid,
          logistics_id=nullif(p_data->>'logistics_id','')::uuid,version=version+1 where id=target;
        insert into rose_care.order_events(order_id,actor_id,event_type) values(target,actor.id,'assignment');
      end if;
      perform rose_care.staff_audit(actor.id,p_action,'order',target);

    when 'order.create' then
      select * into customer from rose_care.customers where id=customer_id_arg for share;
      if not coalesce(rose_care.staff_customer_visible(actor,customer),false) then
        raise exception 'Staff access denied' using errcode='42501';
      end if;
      select * into address from rose_care.addresses where id=(p_data->>'address_id')::uuid and customer_id=customer.id;
      if not found or customer.advisor_id is null or not exists(select 1 from rose_care.employees
        where id=customer.advisor_id and staff_fixture and active and role='advisor') then
        raise exception 'Invalid order profile' using errcode='22023';
      end if;
      if jsonb_typeof(p_data->'lines') is distinct from 'array' then raise exception 'Invalid items' using errcode='22023'; end if;
      line_count := jsonb_array_length(p_data->'lines');
      if line_count not between 1 and 16 then raise exception 'Invalid items' using errcode='22023'; end if;
      ship := coalesce((p_data->>'shipping')::numeric,0);
      reduction := coalesce((p_data->>'discount')::numeric,0);
      if ship not between 0 and 999999.99 or reduction not between 0 and 999999.99 or ship<>round(ship,2) or reduction<>round(reduction,2)
        or (not editorial and (ship<>0 or reduction<>0)) then
        raise exception 'Invalid amounts' using errcode='22023';
      end if;
      for item in
        select l.variant_id,l.quantity,l.unit_price,v.price,v.currency,p.title||' · '||v.title as title
        from jsonb_to_recordset(p_data->'lines') l(variant_id uuid,quantity integer,unit_price numeric)
        left join rose_care.variants v on v.id=l.variant_id
        left join rose_care.products p on p.id=v.product_id and p.active and p.staff_fixture
      loop
        line_price := case when editorial then coalesce(item.unit_price,item.price) else item.price end;
        if item.title is null or item.quantity is null or item.quantity not between 1 and 999 or
          item.currency<>'MAD' or line_price is null or line_price not between 0 and 999999.99 or line_price<>round(line_price,2) or
          (not editorial and item.unit_price is not null) or
          exists(select 1 from jsonb_array_elements(item_rows) j where j->>'variant_id'=item.variant_id::text) then
          raise exception 'Invalid order item' using errcode='22023';
        end if;
        subtotal := subtotal + line_price * item.quantity;
        item_rows := item_rows || jsonb_build_array(jsonb_build_object('variant_id',item.variant_id,'title',item.title,'quantity',item.quantity,'unit_price',line_price));
      end loop;
      if reduction>subtotal+ship then raise exception 'Invalid discount' using errcode='22023'; end if;
      if subtotal+ship-reduction>9999999999.99 then
        raise exception 'Order total exceeds numeric(12,2)' using errcode='22003';
      end if;
      insert into rose_care.orders(customer_id,advisor_id,total,shipping,discount,delivery_phone,delivery_address,delivery_city,staff_fixture)
        values(customer.id,customer.advisor_id,subtotal+ship-reduction,ship,reduction,customer.phone,address.address,address.city,true) returning id into target;
      insert into rose_care.order_items(order_id,variant_id,title,quantity,unit_price)
        select target,variant_id,title,quantity,unit_price
        from jsonb_to_recordset(item_rows) l(variant_id uuid,title text,quantity integer,unit_price numeric);
      insert into rose_care.order_events(order_id,actor_id,event_type) values(target,actor.id,'new');
      perform rose_care.staff_audit(actor.id,p_action,'order',target);

    when 'customer.create' then
      assignee := case when editorial then nullif(p_data->>'advisor_id','')::uuid else actor.id end;
      if actor.role not in ('admin','manager','advisor') or not exists(select 1 from rose_care.employees
          where id=assignee and staff_fixture and active and role='advisor') then
        raise exception 'Staff access denied' using errcode='42501';
      end if;
      if not coalesce((p_data->>'name') like 'Démo %' and length(p_data->>'name') between 6 and 100 and
          (p_data->>'email') ~ '^[a-z0-9._+-]+@example[.]test$' and (p_data->>'phone') ~ '^DEMO-[0-9]{3,8}$' and
          (p_data->>'address') like 'Adresse fictive %' and length(p_data->>'address') between 17 and 200 and
          length(p_data->>'city') between 1 and 80 and p_data->>'language' in ('fr','darija','ar','en'),false) then
        raise exception 'Invalid fixture' using errcode='22023';
      end if;
      insert into rose_care.customers(name,email,phone,language,title,advisor_id,staff_fixture)
        values (p_data->>'name',p_data->>'email',p_data->>'phone',p_data->>'language',p_data->>'title',assignee,true) returning id into target;
      insert into rose_care.addresses(customer_id,address,city) values(target,p_data->>'address',p_data->>'city');
      insert into rose_care.preferences(customer_id) values(target);
      perform rose_care.staff_audit(actor.id,p_action,'customer',target);

    when 'customer.note','customer.preferences','complaint.create','conversation.create' then
      select * into customer from rose_care.customers where id=customer_id_arg for share;
      if not coalesce(rose_care.staff_customer_visible(actor,customer),false) then
        raise exception 'Staff access denied' using errcode='42501';
      end if;
      if p_action='customer.note' then
        text_value := p_data->>'note';
        if not coalesce(length(text_value) between 1 and 500,false) then raise exception 'Invalid note' using errcode='22023'; end if;
        update rose_care.customers set notes=array_append(notes,text_value) where id=customer.id;
        target:=customer.id;
      elsif p_action='customer.preferences' then
        text_value := p_data->>'channel';
        if text_value not in ('phone','email','none') or text_value is null then raise exception 'Invalid preference' using errcode='22023'; end if;
        insert into rose_care.preferences(customer_id,preferred_channel) values(customer.id,nullif(text_value,'none'))
          on conflict(customer_id) do update set preferred_channel=excluded.preferred_channel;
        target:=customer.id;
      elsif p_action='complaint.create' then
        if order_id_arg is not null then
          select * into current_order from rose_care.orders where id=order_id_arg and customer_id=customer.id;
          if not coalesce(rose_care.staff_order_visible(actor,current_order,customer),false) then
            raise exception 'Staff access denied' using errcode='42501';
          end if;
        end if;
        if not coalesce(length(p_data->>'category') between 1 and 80 and length(p_data->>'details') between 1 and 1500,false) then
          raise exception 'Invalid complaint' using errcode='22023';
        end if;
        insert into rose_care.complaints(customer_id,order_id,assignee_id,category,details)
          values(customer.id,order_id_arg,coalesce(customer.advisor_id,actor.id),p_data->>'category',p_data->>'details') returning id into target;
      else
        insert into rose_care.conversations(customer_id,advisor_id,channel)
          values(customer.id,coalesce(customer.advisor_id,actor.id),'internal') returning id into target;
      end if;
      perform rose_care.staff_audit(actor.id,p_action,'customer_workflow',target);

    when 'message.record' then
      select c.* into customer from rose_care.conversations v join rose_care.customers c on c.id=v.customer_id
        where v.id=(p_data->>'conversation_id')::uuid and (editorial or v.advisor_id=actor.id);
      if not coalesce(rose_care.staff_customer_visible(actor,customer),false) then
        raise exception 'Staff access denied' using errcode='42501';
      end if;
      if not coalesce(length(p_data->>'body') between 1 and 3000,false) then raise exception 'Invalid message' using errcode='22023'; end if;
      -- Record only; there is no delivery provider.
      insert into rose_care.messages(conversation_id,direction,body)
        values((p_data->>'conversation_id')::uuid,'inbound',p_data->>'body') returning id into target;
      perform rose_care.staff_audit(actor.id,p_action,'conversation', (p_data->>'conversation_id')::uuid);

    when 'complaint.close' then
      select c.* into customer from rose_care.complaints k join rose_care.customers c on c.id=k.customer_id
        left join rose_care.orders o on o.id=k.order_id
        where k.id=target and (editorial or k.assignee_id=actor.id)
          and (k.order_id is null or rose_care.staff_order_visible(actor,o,c));
      if not coalesce(rose_care.staff_customer_visible(actor,customer),false) then
        raise exception 'Staff access denied' using errcode='42501';
      end if;
      update rose_care.complaints set status='closed' where id=target and status<>'closed';
      if found then perform rose_care.staff_audit(actor.id,p_action,'complaint',target); end if;

    when 'task.create' then
      assignee := case when editorial then coalesce(nullif(p_data->>'assignee_id','')::uuid,actor.id) else actor.id end;
      if not exists(select 1 from rose_care.employees where id=assignee and active and staff_fixture) then
        raise exception 'Invalid assignee' using errcode='22023';
      end if;
      if customer_id_arg is not null then
        select * into customer from rose_care.customers where id=customer_id_arg;
        if not coalesce(rose_care.staff_customer_visible(actor,customer),false) then
          raise exception 'Staff access denied' using errcode='42501';
        end if;
      end if;
      if order_id_arg is not null then
        select * into current_order from rose_care.orders where id=order_id_arg;
        select * into customer from rose_care.customers where id=current_order.customer_id;
        if not coalesce(rose_care.staff_order_visible(actor,current_order,customer),false) or
          (customer_id_arg is not null and customer_id_arg<>current_order.customer_id) then
          raise exception 'Staff access denied' using errcode='42501';
        end if;
      end if;
      if not coalesce(length(p_data->>'title') between 1 and 120 and p_data->>'kind' in ('task','callback') and
          length(p_data->>'due')=10,false) then raise exception 'Invalid task' using errcode='22023'; end if;
      insert into rose_care.tasks(customer_id,order_id,assignee_id,title,kind,due_at,staff_fixture)
        values(customer_id_arg,order_id_arg,assignee,p_data->>'title',p_data->>'kind',(p_data->>'due')::date::timestamp at time zone 'Africa/Casablanca',true) returning id into target;
      perform rose_care.staff_audit(actor.id,p_action,'task',target);

    when 'task.toggle' then
      next_status := p_data->>'status';
      if next_status not in ('open','done') or next_status is null then raise exception 'Invalid task' using errcode='22023'; end if;
      update rose_care.tasks t set status=next_status,completed_at=case when next_status='done' then statement_timestamp() end
        where t.id=target and t.staff_fixture and (editorial or t.assignee_id=actor.id)
          and (t.customer_id is null or exists(select 1 from rose_care.customers c where c.id=t.customer_id and rose_care.staff_customer_visible(actor,c)))
          and (t.order_id is null or exists(select 1 from rose_care.orders o join rose_care.customers c on c.id=o.customer_id where o.id=t.order_id and rose_care.staff_order_visible(actor,o,c)));
      if not found then raise exception 'Staff access denied' using errcode='42501'; end if;
      perform rose_care.staff_audit(actor.id,p_action,'task',target);

    when 'template.save' then
      if not editorial then raise exception 'Staff access denied' using errcode='42501'; end if;
      if not coalesce(length(p_data->>'body') between 1 and 2000 and length(p_data->>'category') between 1 and 80 and
        p_data->>'language' in ('fr','darija','ar','en') and jsonb_typeof(p_data->'approved')='boolean',false) then
        raise exception 'Invalid template' using errcode='22023';
      end if;
      if target is null then
        insert into rose_care.message_templates(category,language,title,body,approved,staff_fixture)
          values(p_data->>'category',p_data->>'language',p_data->>'category',p_data->>'body',(p_data->>'approved')::boolean,true)
          returning id into target;
      else
        update rose_care.message_templates set body=p_data->>'body',approved=(p_data->>'approved')::boolean,version=version+1
          where id=target and staff_fixture and category=p_data->>'category' and language=p_data->>'language'
            and version=(p_data->>'version')::integer;
        if not found then raise exception 'Template unavailable' using errcode='40001'; end if;
      end if;
      perform rose_care.staff_audit(actor.id,p_action,'template',target);

    when 'knowledge.save' then
      if not editorial then raise exception 'Staff access denied' using errcode='42501'; end if;
      kind := p_data->>'kind';
      if not coalesce(kind in ('guide','faq') and length(p_data->>'title') between 1 and 140 and
          length(p_data->>'category') between 1 and 80 and length(p_data->>'body') between 1 and 3000 and
          p_data->>'language' in ('fr','darija','ar','en') and jsonb_typeof(p_data->'approved')='boolean',false) then
        raise exception 'Invalid article' using errcode='22023';
      end if;
      if kind='guide' then
        if target is null then
          insert into rose_care.care_guides(title,category,body,language,approved,staff_fixture)
            values(p_data->>'title',p_data->>'category',p_data->>'body',p_data->>'language',(p_data->>'approved')::boolean,true)
            returning id into target;
        else
          update rose_care.care_guides set title=p_data->>'title',category=p_data->>'category',
            body=p_data->>'body',language=p_data->>'language',approved=(p_data->>'approved')::boolean where id=target and staff_fixture;
        end if;
      else
        if target is null then
          insert into rose_care.faqs(question,category,answer,language,approved,staff_fixture)
            values(p_data->>'title',p_data->>'category',p_data->>'body',p_data->>'language',(p_data->>'approved')::boolean,true)
            returning id into target;
        else
          update rose_care.faqs set question=p_data->>'title',category=p_data->>'category',
            answer=p_data->>'body',language=p_data->>'language',approved=(p_data->>'approved')::boolean where id=target and staff_fixture;
        end if;
      end if;
      if not found then raise exception 'Article unavailable' using errcode='42501'; end if;
      perform rose_care.staff_audit(actor.id,p_action,kind,target);

    when 'catalog.variant' then
      if not editorial then raise exception 'Staff access denied' using errcode='42501'; end if;
      line_price := nullif(p_data->>'price','')::numeric;
      if line_price is not null and (line_price not between 0 and 999999.99 or line_price<>round(line_price,2)) then raise exception 'Invalid price' using errcode='22023'; end if;
      if nullif(p_data->>'stock','')::integer not between 0 and 999999 then raise exception 'Invalid stock' using errcode='22023'; end if;
      update rose_care.variants v set price=line_price, stock=nullif(p_data->>'stock','')::integer
        from rose_care.products p where v.id=target and p.id=v.product_id and p.staff_fixture;
      if not found then raise exception 'Staff access denied' using errcode='42501'; end if;
      perform rose_care.staff_audit(actor.id,p_action,'variant',target);

    when 'catalog.bundle' then
      if not editorial then raise exception 'Staff access denied' using errcode='42501'; end if;
      assignee := (p_data->>'component_id')::uuid;
      if not exists(select 1 from rose_care.variants v join rose_care.products p on p.id=v.product_id
          where v.id=target and p.staff_fixture and p.kind='bundle') or
        not exists(select 1 from rose_care.variants v join rose_care.products p on p.id=v.product_id
          where v.id=assignee and p.staff_fixture and p.kind='product') then
        raise exception 'Staff access denied' using errcode='42501';
      end if;
      if not coalesce((p_data->>'quantity')::integer between 0 and 999,false) then raise exception 'Invalid quantity' using errcode='22023'; end if;
      if (p_data->>'quantity')::integer=0 then
        delete from rose_care.bundles where bundle_variant_id=target and component_variant_id=assignee;
      else
        insert into rose_care.bundles(bundle_variant_id,component_variant_id,quantity)
          values(target,assignee,(p_data->>'quantity')::integer)
          on conflict(bundle_variant_id,component_variant_id) do update set quantity=excluded.quantity;
      end if;
      perform rose_care.staff_audit(actor.id,p_action,'bundle',target);

    when 'employee.change' then
      if actor.role<>'admin' or target=actor.id then raise exception 'Staff access denied' using errcode='42501'; end if;
      if not coalesce(p_data->>'role' in ('manager','advisor','logistics','preparation') and jsonb_typeof(p_data->'active')='boolean',false) then
        raise exception 'Invalid employee role' using errcode='22023';
      end if;
      update rose_care.employees set role=p_data->>'role',active=(p_data->>'active')::boolean
        where id=target and staff_fixture and role<>'admin';
      if not found then raise exception 'Staff access denied' using errcode='42501'; end if;
      perform rose_care.staff_audit(actor.id,p_action,'employee',target);

    when 'employee.invite' then
      if actor.role<>'admin' then raise exception 'Staff access denied' using errcode='42501'; end if;
      insert into rose_care.employee_invites(email,display_name,role,expires_at,created_by)
        values(lower(p_data->>'email'),p_data->>'name',p_data->>'role',statement_timestamp()+interval '24 hours',actor.id)
        on conflict(email) do update set display_name=excluded.display_name,role=excluded.role,expires_at=excluded.expires_at,created_by=excluded.created_by;
      perform rose_care.staff_audit(actor.id,p_action,'employee_invite',null);
    else raise exception 'Invalid operation' using errcode='22023';
  end case;
  return target;
end $$;

create function rose_care.staff_redeem(p_user uuid,p_session uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare invite rose_care.employee_invites; verified_email text;
begin
  if not rose_care.staff_session(p_user,p_session) then raise exception 'Staff access denied' using errcode='42501'; end if;
  select lower(u.email) into verified_email from auth.users u where u.id=p_user
    and u.invited_at is not null and u.email_confirmed_at is not null;
  delete from rose_care.employee_invites where email=verified_email and expires_at>statement_timestamp()
    and exists(select 1 from rose_care.employees e where e.id=created_by and e.active and e.staff_fixture and e.role='admin')
    returning * into invite;
  if not found then raise exception 'Staff access denied' using errcode='42501'; end if;
  insert into rose_care.employees(id,display_name,role,staff_fixture)
    values(p_user,invite.display_name,invite.role,true);
  perform rose_care.staff_audit(invite.created_by,'employee.onboard','employee',p_user);
end $$;

create function rose_care.staff_guide_path(p_user uuid,p_session uuid,p_guide uuid) returns text
language plpgsql security definer set search_path = '' as $$
declare actor rose_care.employees; result text;
begin
  actor := rose_care.staff_actor(p_user,p_session,true);
  if actor.role not in ('admin','manager','advisor') then raise exception 'Staff access denied' using errcode='42501'; end if;
  select storage_path into result from rose_care.care_guides where id=p_guide and staff_fixture and approved
    and storage_path ~ '^fictional/[a-zA-Z0-9_/-]+[.]pdf$';
  if not found then raise exception 'Guide unavailable' using errcode='42501'; end if;
  perform rose_care.staff_audit(actor.id,'guide.sign_requested','guide',p_guide);
  return result;
end $$;

create schema rose_storage_policy;
revoke all on schema rose_storage_policy from public,anon;
grant usage on schema rose_storage_policy to authenticated;
create function rose_storage_policy.guide_allowed(p_name text) returns boolean
language sql volatile security definer set search_path = '' as $$
  select p_name ~ '^fictional/[a-zA-Z0-9_/-]+[.]pdf$' and
    rose_care.staff_session(auth.uid(), (auth.jwt()->>'session_id')::uuid) and
    exists(select 1 from rose_care.employees where id=auth.uid() and active and staff_fixture and role in ('admin','manager','advisor')) and
    exists(select 1 from rose_care.care_guides where staff_fixture and approved and storage_path=p_name)
$$;
revoke all on function rose_storage_policy.guide_allowed(text) from public,anon;
grant execute on function rose_storage_policy.guide_allowed(text) to authenticated;
create policy rose_v03_private_guide on storage.objects for select to authenticated
  using (bucket_id='rose-care-guides' and rose_storage_policy.guide_allowed(name));

-- SECURITY DEFINER entry points are callable only by the restricted server login.
-- Revoke PostgreSQL's default PUBLIC execute first, including all helpers.
revoke execute on function rose_care.staff_session(uuid,uuid),
  rose_care.staff_actor(uuid,uuid,boolean),rose_care.staff_identity(uuid,uuid),
  rose_care.staff_customer_visible(rose_care.employees,rose_care.customers),
  rose_care.staff_order_visible(rose_care.employees,rose_care.orders,rose_care.customers),
  rose_care.staff_audit(uuid,text,text,uuid),rose_care.staff_preserve_history(),
  rose_care.staff_workspace(uuid,uuid),rose_care.staff_transition_allowed(text,text,text),
  rose_care.staff_command(uuid,uuid,text,jsonb),rose_care.staff_redeem(uuid,uuid),rose_care.staff_guide_path(uuid,uuid,uuid)
  from public,anon,authenticated,service_role;
grant execute on function rose_care.staff_identity(uuid,uuid),rose_care.staff_workspace(uuid,uuid),
  rose_care.staff_command(uuid,uuid,text,jsonb),rose_care.staff_redeem(uuid,uuid),rose_care.staff_guide_path(uuid,uuid,uuid)
  to rose_care_app;
commit;
