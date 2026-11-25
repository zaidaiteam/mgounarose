-- Controlled users and data; all addresses, credentials and identifiers are fictional.
insert into auth.users(id,email,email_confirmed_at,invited_at) values
 ('10000000-0000-4000-8000-000000000001','admin@example.test',now(),now()),
 ('10000000-0000-4000-8000-000000000002','advisor-a@example.test',now(),now()),
 ('10000000-0000-4000-8000-000000000003','advisor-b@example.test',now(),now()),
 ('10000000-0000-4000-8000-000000000004','inactive@example.test',now(),now()),
 ('10000000-0000-4000-8000-000000000005','logistics@example.test',now(),now()),
 ('10000000-0000-4000-8000-000000000006','preparation@example.test',now(),now()),
 ('10000000-0000-4000-8000-000000000007','manager@example.test',now(),now()),
 ('10000000-0000-4000-8000-000000000008','existing@example.test',now(),now()),
 ('10000000-0000-4000-8000-000000000009','invited@example.test',now(),now());
insert into auth.sessions(id,user_id,not_after)
 select replace(id::text,'10000000-','20000000-')::uuid,id,null from auth.users;
insert into rose_care.employees(id,display_name,role,active,staff_fixture) values
 ('10000000-0000-4000-8000-000000000001','Admin Démo','admin',true,true),
 ('10000000-0000-4000-8000-000000000002','Conseiller Démo Atlas','advisor',true,true),
 ('10000000-0000-4000-8000-000000000003','Conseiller Démo Oasis','advisor',true,true),
 ('10000000-0000-4000-8000-000000000004','Inactif Démo','advisor',false,true),
 ('10000000-0000-4000-8000-000000000005','Logistique Démo','logistics',true,true),
 ('10000000-0000-4000-8000-000000000006','Préparation Démo','preparation',true,true),
 ('10000000-0000-4000-8000-000000000007','Manager Démo','manager',true,true),
 ('10000000-0000-4000-8000-000000000008','Employé hors périmètre','admin',true,false);
insert into rose_care.customers(id,name,phone,email,advisor_id,staff_fixture) values
 ('30000000-0000-4000-8000-000000000001','Démo Atlas','DEMO-001','atlas@example.test','10000000-0000-4000-8000-000000000002',true),
 ('30000000-0000-4000-8000-000000000002','Démo Oasis','DEMO-002','oasis@example.test','10000000-0000-4000-8000-000000000003',true),
 ('30000000-0000-4000-8000-000000000003','Hors périmètre fictif','DEMO-003','excluded@example.test','10000000-0000-4000-8000-000000000002',false);
insert into rose_care.addresses(id,customer_id,address,city) values
 ('40000000-0000-4000-8000-000000000001','30000000-0000-4000-8000-000000000001','Adresse fictive Atlas','Casablanca'),
 ('40000000-0000-4000-8000-000000000002','30000000-0000-4000-8000-000000000002','Adresse fictive Oasis','Rabat');
insert into rose_care.orders(id,customer_id,advisor_id,delivery_address,delivery_phone,delivery_city,total,preparation_id,logistics_id) values
 ('51000001-0000-4000-8000-000000000001','30000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000002',
  'Adresse fictive Atlas','DEMO-001','Casablanca',123.45,'10000000-0000-4000-8000-000000000006','10000000-0000-4000-8000-000000000005'),
 ('51000002-0000-4000-8000-000000000002','30000000-0000-4000-8000-000000000002','10000000-0000-4000-8000-000000000003',null,null,null,25,null,null);
insert into rose_care.order_items(order_id,title,quantity,unit_price) values
 ('51000001-0000-4000-8000-000000000001','Brume fictive',1,123.45);
insert into rose_care.products(id,title,staff_fixture) values ('60000000-0000-4000-8000-000000000001','Produit préparé fictif',true);
insert into rose_care.variants(id,product_id,title,price) values ('61000000-0000-4000-8000-000000000001','60000000-0000-4000-8000-000000000001','125 mL',21.25);
insert into rose_care.care_guides(id,language,title,approved,storage_path,staff_fixture) values
 ('70000000-0000-4000-8000-000000000001','fr','Guide PDF fictif',true,'fictional/demo.pdf',true),
 ('70000000-0000-4000-8000-000000000002','fr','Guide non approuvé',false,'fictional/draft.pdf',true),
 ('70000000-0000-4000-8000-000000000003','fr','Guide hors périmètre',true,'restricted/private.pdf',false);
insert into storage.objects(id,bucket_id,name) values
 ('71000000-0000-4000-8000-000000000001','rose-care-guides','fictional/demo.pdf'),
 ('71000000-0000-4000-8000-000000000002','rose-care-guides','fictional/draft.pdf'),
 ('71000000-0000-4000-8000-000000000003','rose-care-guides','restricted/private.pdf');
