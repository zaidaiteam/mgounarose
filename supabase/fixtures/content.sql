-- Fictional workspace reference content. Apply only to local or controlled test databases.
begin;
insert into rose_care.products(id,title,kind,staff_fixture) values ('64000000-0000-4000-8000-000000000001','Rose Water Mist','product',true) on conflict(id) do nothing;
insert into rose_care.variants(id,product_id,title,preorder) values ('64000000-0000-4000-8000-0000000000d2','64000000-0000-4000-8000-000000000001','125 mL',false) on conflict(id) do nothing;
insert into rose_care.variants(id,product_id,title,preorder) values ('64000000-0000-4000-8000-0000000000d3','64000000-0000-4000-8000-000000000001','200 mL',false) on conflict(id) do nothing;
insert into rose_care.products(id,title,kind,staff_fixture) values ('64000000-0000-4000-8000-000000000002','Pure Rose Water','product',true) on conflict(id) do nothing;
insert into rose_care.variants(id,product_id,title,preorder) values ('64000000-0000-4000-8000-0000000000dc','64000000-0000-4000-8000-000000000002','250 mL',false) on conflict(id) do nothing;
insert into rose_care.variants(id,product_id,title,preorder) values ('64000000-0000-4000-8000-0000000000dd','64000000-0000-4000-8000-000000000002','500 mL',false) on conflict(id) do nothing;
insert into rose_care.products(id,title,kind,staff_fixture) values ('64000000-0000-4000-8000-000000000003','Rose Oil','product',true) on conflict(id) do nothing;
insert into rose_care.variants(id,product_id,title,preorder) values ('64000000-0000-4000-8000-0000000000e6','64000000-0000-4000-8000-000000000003','30 mL',false) on conflict(id) do nothing;
insert into rose_care.variants(id,product_id,title,preorder) values ('64000000-0000-4000-8000-0000000000e7','64000000-0000-4000-8000-000000000003','50 mL',false) on conflict(id) do nothing;
insert into rose_care.products(id,title,kind,staff_fixture) values ('64000000-0000-4000-8000-000000000004','Rose Essential Oil','product',true) on conflict(id) do nothing;
insert into rose_care.variants(id,product_id,title,preorder) values ('64000000-0000-4000-8000-0000000000f0','64000000-0000-4000-8000-000000000004','5 mL',true) on conflict(id) do nothing;
insert into rose_care.variants(id,product_id,title,preorder) values ('64000000-0000-4000-8000-0000000000f1','64000000-0000-4000-8000-000000000004','10 mL',true) on conflict(id) do nothing;
insert into rose_care.variants(id,product_id,title,preorder) values ('64000000-0000-4000-8000-0000000000f2','64000000-0000-4000-8000-000000000004','20 mL',true) on conflict(id) do nothing;
insert into rose_care.products(id,title,kind,staff_fixture) values ('64000000-0000-4000-8000-000000000005','Dried Damask Rose Buds','product',true) on conflict(id) do nothing;
insert into rose_care.variants(id,product_id,title,preorder) values ('64000000-0000-4000-8000-0000000000fa','64000000-0000-4000-8000-000000000005','100 g',false) on conflict(id) do nothing;
insert into rose_care.variants(id,product_id,title,preorder) values ('64000000-0000-4000-8000-0000000000fb','64000000-0000-4000-8000-000000000005','200 g',false) on conflict(id) do nothing;
insert into rose_care.products(id,title,kind,staff_fixture) values ('64000000-0000-4000-8000-000000000006','Rose Discovery Ritual','bundle',true) on conflict(id) do nothing;
insert into rose_care.variants(id,product_id,title,preorder) values ('64000000-0000-4000-8000-000000000104','64000000-0000-4000-8000-000000000006','Coffret',false) on conflict(id) do nothing;
insert into rose_care.products(id,title,kind,staff_fixture) values ('64000000-0000-4000-8000-000000000007','Rose Care Ritual','bundle',true) on conflict(id) do nothing;
insert into rose_care.variants(id,product_id,title,preorder) values ('64000000-0000-4000-8000-00000000010e','64000000-0000-4000-8000-000000000007','Coffret',false) on conflict(id) do nothing;
insert into rose_care.products(id,title,kind,staff_fixture) values ('64000000-0000-4000-8000-000000000008','Rose Blossom Ritual','bundle',true) on conflict(id) do nothing;
insert into rose_care.variants(id,product_id,title,preorder) values ('64000000-0000-4000-8000-000000000118','64000000-0000-4000-8000-000000000008','Coffret',false) on conflict(id) do nothing;
insert into rose_care.products(id,title,kind,staff_fixture) values ('64000000-0000-4000-8000-000000000009','Rose Valley Ritual','bundle',true) on conflict(id) do nothing;
insert into rose_care.variants(id,product_id,title,preorder) values ('64000000-0000-4000-8000-000000000122','64000000-0000-4000-8000-000000000009','Coffret',false) on conflict(id) do nothing;
insert into rose_care.products(id,title,kind,staff_fixture) values ('64000000-0000-4000-8000-00000000000a','Rose Valley Signature Collection','bundle',true) on conflict(id) do nothing;
insert into rose_care.variants(id,product_id,title,preorder) values ('64000000-0000-4000-8000-00000000012c','64000000-0000-4000-8000-00000000000a','Coffret',false) on conflict(id) do nothing;
insert into rose_care.message_templates(id,category,language,title,body,approved,staff_fixture) values ('64000000-0000-4000-8000-000000000190','Confirmation','fr','Confirmation','Bonjour {{civilite}} {{client}}, pouvez-vous confirmer la commande {{commande}} : {{produits}} ? Sous-total : {{prix}}. Livraison à {{ville}} : {{livraison}}. Remise : {{remise}}. Total à payer à la livraison : {{total}}.

{{conseiller}} · M’Gouna Rose',true,true) on conflict(id) do nothing;
insert into rose_care.message_templates(id,category,language,title,body,approved,staff_fixture) values ('64000000-0000-4000-8000-000000000191','Appel manqué','fr','Appel manqué','Bonjour {{client}}, nous avons essayé de vous joindre au sujet de la commande {{commande}}. À quel moment pouvons-nous vous rappeler ?

{{conseiller}} · M’Gouna Rose',true,true) on conflict(id) do nothing;
insert into rose_care.message_templates(id,category,language,title,body,approved,staff_fixture) values ('64000000-0000-4000-8000-000000000192','Rappel','fr','Rappel','Bonjour {{client}}, nous revenons vers vous comme convenu. Êtes-vous disponible pour un appel ?

{{conseiller}} · M’Gouna Rose',true,true) on conflict(id) do nothing;
insert into rose_care.message_templates(id,category,language,title,body,approved,staff_fixture) values ('64000000-0000-4000-8000-000000000193','Expédition','fr','Expédition','Bonjour {{client}}, votre commande {{commande}} a été expédiée vers {{ville}}. Le montant à régler à la livraison est de {{total}}.

{{conseiller}} · M’Gouna Rose',true,true) on conflict(id) do nothing;
insert into rose_care.message_templates(id,category,language,title,body,approved,staff_fixture) values ('64000000-0000-4000-8000-000000000194','Retard de livraison','fr','Retard de livraison','Bonjour {{client}}, la livraison de votre commande {{commande}} prend du retard. Merci pour votre patience.

{{conseiller}} · M’Gouna Rose',true,true) on conflict(id) do nothing;
insert into rose_care.message_templates(id,category,language,title,body,approved,staff_fixture) values ('64000000-0000-4000-8000-000000000195','Remerciement','fr','Remerciement','Bonjour {{client}}, merci d’avoir choisi M’Gouna Rose. Nous espérons que votre commande vous plaît.

{{conseiller}} · M’Gouna Rose',true,true) on conflict(id) do nothing;
insert into rose_care.message_templates(id,category,language,title,body,approved,staff_fixture) values ('64000000-0000-4000-8000-000000000196','Partage de guide','fr','Partage de guide','Bonjour {{client}}, voici le guide dont nous avons parlé : {{guide}}.

{{conseiller}} · M’Gouna Rose',true,true) on conflict(id) do nothing;
insert into rose_care.message_templates(id,category,language,title,body,approved,staff_fixture) values ('64000000-0000-4000-8000-000000000197','Satisfaction','fr','Satisfaction','Bonjour {{client}}, comment s’est passée votre expérience avec votre commande {{commande}} ? Votre retour nous intéresse.

{{conseiller}} · M’Gouna Rose',true,true) on conflict(id) do nothing;
insert into rose_care.message_templates(id,category,language,title,body,approved,staff_fixture) values ('64000000-0000-4000-8000-000000000198','Réclamation','fr','Réclamation','Bonjour {{client}}, merci de nous avoir signalé le problème concernant {{commande}}. Nous allons examiner votre demande et revenir vers vous.

{{conseiller}} · M’Gouna Rose',true,true) on conflict(id) do nothing;
insert into rose_care.message_templates(id,category,language,title,body,approved,staff_fixture) values ('64000000-0000-4000-8000-000000000199','Relance de livraison','fr','Relance de livraison','Bonjour {{client}}, la livraison de {{commande}} à {{ville}} n’a pas abouti. Pouvons-nous convenir d’un nouveau créneau ?

{{conseiller}} · M’Gouna Rose',true,true) on conflict(id) do nothing;
insert into rose_care.message_templates(id,category,language,title,body,approved,staff_fixture) values ('64000000-0000-4000-8000-00000000019a','Confirmation','darija','Confirmation','Salam {{civilite}} {{client}}, wach momkin t2eked lina la commande {{commande}} dyal {{produits}}? Taman {{prix}}, livraison l-{{ville}} {{livraison}}, remise {{remise}}. Lmajmou3 f livraison {{total}}.

{{conseiller}} · M’Gouna Rose',true,true) on conflict(id) do nothing;
insert into rose_care.message_templates(id,category,language,title,body,approved,staff_fixture) values ('64000000-0000-4000-8000-00000000019b','Appel manqué','darija','Appel manqué','Salam {{client}}, 3eyetna lik 3la la commande {{commande}}. Foqach nqedro n3eyto lik tani?

{{conseiller}} · M’Gouna Rose',true,true) on conflict(id) do nothing;
insert into rose_care.message_templates(id,category,language,title,body,approved,staff_fixture) values ('64000000-0000-4000-8000-00000000019c','Rappel','darija','Rappel','Salam {{client}}, rje3na ntwaslo m3ak kifma ttafqna. Wach momkin n3eyto lik daba?

{{conseiller}} · M’Gouna Rose',true,true) on conflict(id) do nothing;
insert into rose_care.message_templates(id,category,language,title,body,approved,staff_fixture) values ('64000000-0000-4000-8000-00000000019d','Expédition','darija','Expédition','Salam {{client}}, la commande {{commande}} tsiftat l-{{ville}}. Lmajmou3 f livraison {{total}}.

{{conseiller}} · M’Gouna Rose',true,true) on conflict(id) do nothing;
insert into rose_care.message_templates(id,category,language,title,body,approved,staff_fixture) values ('64000000-0000-4000-8000-00000000019e','Retard de livraison','darija','Retard de livraison','Salam {{client}}, livraison dyal {{commande}} ghadi t2ekher chwiyya. Chokran 3la sber dyalk.

{{conseiller}} · M’Gouna Rose',true,true) on conflict(id) do nothing;
insert into rose_care.message_templates(id,category,language,title,body,approved,staff_fixture) values ('64000000-0000-4000-8000-00000000019f','Remerciement','darija','Remerciement','Salam {{client}}, chokran 7it khtariti M’Gouna Rose. Ntmennaw t3jbek la commande dyalk.

{{conseiller}} · M’Gouna Rose',true,true) on conflict(id) do nothing;
insert into rose_care.message_templates(id,category,language,title,body,approved,staff_fixture) values ('64000000-0000-4000-8000-0000000001a0','Partage de guide','darija','Partage de guide','Salam {{client}}, hada howa dalil li hdrna 3lih: {{guide}}.

{{conseiller}} · M’Gouna Rose',true,true) on conflict(id) do nothing;
insert into rose_care.message_templates(id,category,language,title,body,approved,staff_fixture) values ('64000000-0000-4000-8000-0000000001a1','Satisfaction','darija','Satisfaction','Salam {{client}}, kifach dazet tajriba dyalk m3a la commande {{commande}}? Bghina nsm3o ra2y dyalk.

{{conseiller}} · M’Gouna Rose',true,true) on conflict(id) do nothing;
insert into rose_care.message_templates(id,category,language,title,body,approved,staff_fixture) values ('64000000-0000-4000-8000-0000000001a2','Réclamation','darija','Réclamation','Salam {{client}}, chokran 7it khbertina b lmochkil dyal {{commande}}. Ghadi nchoufo talab dyalk w nrj3o lik.

{{conseiller}} · M’Gouna Rose',true,true) on conflict(id) do nothing;
insert into rose_care.message_templates(id,category,language,title,body,approved,staff_fixture) values ('64000000-0000-4000-8000-0000000001a3','Relance de livraison','darija','Relance de livraison','Salam {{client}}, livraison dyal {{commande}} l-{{ville}} ma tmmatch. Nqedro nttafqo 3la waqt akhor?

{{conseiller}} · M’Gouna Rose',true,true) on conflict(id) do nothing;
insert into rose_care.message_templates(id,category,language,title,body,approved,staff_fixture) values ('64000000-0000-4000-8000-0000000001a4','Confirmation','ar','Confirmation','مرحبًا {{civilite}} {{client}}، هل يمكنك تأكيد الطلب {{commande}} للمنتجات التالية: {{produits}}؟ المجموع الفرعي {{prix}}، والتوصيل إلى {{ville}} {{livraison}}، والخصم {{remise}}. المبلغ عند الاستلام {{total}}.

{{conseiller}} · M’Gouna Rose',true,true) on conflict(id) do nothing;
insert into rose_care.message_templates(id,category,language,title,body,approved,staff_fixture) values ('64000000-0000-4000-8000-0000000001a5','Appel manqué','ar','Appel manqué','مرحبًا {{client}}، حاولنا الاتصال بك بشأن الطلب {{commande}}. متى يناسبك أن نعاود الاتصال؟

{{conseiller}} · M’Gouna Rose',true,true) on conflict(id) do nothing;
insert into rose_care.message_templates(id,category,language,title,body,approved,staff_fixture) values ('64000000-0000-4000-8000-0000000001a6','Rappel','ar','Rappel','مرحبًا {{client}}، نعاود التواصل معك كما اتفقنا. هل يناسبك تلقي مكالمة؟

{{conseiller}} · M’Gouna Rose',true,true) on conflict(id) do nothing;
insert into rose_care.message_templates(id,category,language,title,body,approved,staff_fixture) values ('64000000-0000-4000-8000-0000000001a7','Expédition','ar','Expédition','مرحبًا {{client}}، تم شحن طلبك {{commande}} إلى {{ville}}. المبلغ عند الاستلام هو {{total}}.

{{conseiller}} · M’Gouna Rose',true,true) on conflict(id) do nothing;
insert into rose_care.message_templates(id,category,language,title,body,approved,staff_fixture) values ('64000000-0000-4000-8000-0000000001a8','Retard de livraison','ar','Retard de livraison','مرحبًا {{client}}، تأخر توصيل طلبك {{commande}}. نشكرك على صبرك.

{{conseiller}} · M’Gouna Rose',true,true) on conflict(id) do nothing;
insert into rose_care.message_templates(id,category,language,title,body,approved,staff_fixture) values ('64000000-0000-4000-8000-0000000001a9','Remerciement','ar','Remerciement','مرحبًا {{client}}، شكرًا لاختيارك مكونة روز. نتمنى أن ينال طلبك إعجابك.

{{conseiller}} · M’Gouna Rose',true,true) on conflict(id) do nothing;
insert into rose_care.message_templates(id,category,language,title,body,approved,staff_fixture) values ('64000000-0000-4000-8000-0000000001aa','Partage de guide','ar','Partage de guide','مرحبًا {{client}}، إليك الدليل الذي تحدثنا عنه: {{guide}}.

{{conseiller}} · M’Gouna Rose',true,true) on conflict(id) do nothing;
insert into rose_care.message_templates(id,category,language,title,body,approved,staff_fixture) values ('64000000-0000-4000-8000-0000000001ab','Satisfaction','ar','Satisfaction','مرحبًا {{client}}، كيف كانت تجربتك مع الطلب {{commande}}؟ يهمنا سماع رأيك.

{{conseiller}} · M’Gouna Rose',true,true) on conflict(id) do nothing;
insert into rose_care.message_templates(id,category,language,title,body,approved,staff_fixture) values ('64000000-0000-4000-8000-0000000001ac','Réclamation','ar','Réclamation','مرحبًا {{client}}، شكرًا لإبلاغنا بالمشكلة المتعلقة بالطلب {{commande}}. سنراجع طلبك ونتواصل معك.

{{conseiller}} · M’Gouna Rose',true,true) on conflict(id) do nothing;
insert into rose_care.message_templates(id,category,language,title,body,approved,staff_fixture) values ('64000000-0000-4000-8000-0000000001ad','Relance de livraison','ar','Relance de livraison','مرحبًا {{client}}، لم يكتمل توصيل الطلب {{commande}} إلى {{ville}}. هل يمكننا الاتفاق على موعد آخر؟

{{conseiller}} · M’Gouna Rose',true,true) on conflict(id) do nothing;
insert into rose_care.message_templates(id,category,language,title,body,approved,staff_fixture) values ('64000000-0000-4000-8000-0000000001ae','Confirmation','en','Confirmation','Hello {{civilite}} {{client}}, please confirm order {{commande}} for {{produits}}. Subtotal: {{prix}}. Delivery to {{ville}}: {{livraison}}. Discount: {{remise}}. Cash on delivery: {{total}}.

{{conseiller}} · M’Gouna Rose',true,true) on conflict(id) do nothing;
insert into rose_care.message_templates(id,category,language,title,body,approved,staff_fixture) values ('64000000-0000-4000-8000-0000000001af','Appel manqué','en','Appel manqué','Hello {{client}}, we tried to reach you about order {{commande}}. When would be a good time to call you back?

{{conseiller}} · M’Gouna Rose',true,true) on conflict(id) do nothing;
insert into rose_care.message_templates(id,category,language,title,body,approved,staff_fixture) values ('64000000-0000-4000-8000-0000000001b0','Rappel','en','Rappel','Hello {{client}}, we’re following up as agreed. Are you available for a call?

{{conseiller}} · M’Gouna Rose',true,true) on conflict(id) do nothing;
insert into rose_care.message_templates(id,category,language,title,body,approved,staff_fixture) values ('64000000-0000-4000-8000-0000000001b1','Expédition','en','Expédition','Hello {{client}}, order {{commande}} has been dispatched to {{ville}}. The amount due on delivery is {{total}}.

{{conseiller}} · M’Gouna Rose',true,true) on conflict(id) do nothing;
insert into rose_care.message_templates(id,category,language,title,body,approved,staff_fixture) values ('64000000-0000-4000-8000-0000000001b2','Retard de livraison','en','Retard de livraison','Hello {{client}}, delivery of order {{commande}} is taking longer than expected. Thank you for your patience.

{{conseiller}} · M’Gouna Rose',true,true) on conflict(id) do nothing;
insert into rose_care.message_templates(id,category,language,title,body,approved,staff_fixture) values ('64000000-0000-4000-8000-0000000001b3','Remerciement','en','Remerciement','Hello {{client}}, thank you for choosing M’Gouna Rose. We hope you’re enjoying your order.

{{conseiller}} · M’Gouna Rose',true,true) on conflict(id) do nothing;
insert into rose_care.message_templates(id,category,language,title,body,approved,staff_fixture) values ('64000000-0000-4000-8000-0000000001b4','Partage de guide','en','Partage de guide','Hello {{client}}, here’s the care guide we discussed: {{guide}}.

{{conseiller}} · M’Gouna Rose',true,true) on conflict(id) do nothing;
insert into rose_care.message_templates(id,category,language,title,body,approved,staff_fixture) values ('64000000-0000-4000-8000-0000000001b5','Satisfaction','en','Satisfaction','Hello {{client}}, how was your experience with order {{commande}}? We’d like to hear your feedback.

{{conseiller}} · M’Gouna Rose',true,true) on conflict(id) do nothing;
insert into rose_care.message_templates(id,category,language,title,body,approved,staff_fixture) values ('64000000-0000-4000-8000-0000000001b6','Réclamation','en','Réclamation','Hello {{client}}, thank you for telling us about the issue with order {{commande}}. We’ll look into it and get back to you.

{{conseiller}} · M’Gouna Rose',true,true) on conflict(id) do nothing;
insert into rose_care.message_templates(id,category,language,title,body,approved,staff_fixture) values ('64000000-0000-4000-8000-0000000001b7','Relance de livraison','en','Relance de livraison','Hello {{client}}, we couldn’t complete delivery of order {{commande}} to {{ville}}. Can we arrange another time?

{{conseiller}} · M’Gouna Rose',true,true) on conflict(id) do nothing;
insert into rose_care.care_guides(id,title,body,category,language,approved,staff_fixture) values ('64000000-0000-4000-8000-0000000001f4','Le rituel à l’eau de rose','Consulter les indications de l’étiquette avant d’intégrer l’eau de rose à votre routine.','Routine','fr',true,true) on conflict(id) do nothing;
insert into rose_care.care_guides(id,title,body,category,language,approved,staff_fixture) values ('64000000-0000-4000-8000-0000000001f5','Intégrer une huile à sa routine','Suivre les instructions figurant sur l’emballage pour l’utilisation et la quantité.','Routine','fr',true,true) on conflict(id) do nothing;
insert into rose_care.care_guides(id,title,body,category,language,approved,staff_fixture) values ('64000000-0000-4000-8000-0000000001f6','Conserver les soins','Refermer les flacons après utilisation et suivre les consignes de conservation sur l’étiquette.','Conservation','fr',true,true) on conflict(id) do nothing;
insert into rose_care.faqs(id,question,answer,category,language,approved,staff_fixture) values ('64000000-0000-4000-8000-0000000001f7','Comment confirmer une commande ?','Vérifier les produits, quantités et le total à la livraison, puis confirmer depuis la fiche.','Commandes','fr',true,true) on conflict(id) do nothing;
insert into rose_care.faqs(id,question,answer,category,language,approved,staff_fixture) values ('64000000-0000-4000-8000-0000000001f8','Comment organiser un rappel ?','Planifier le rappel depuis une commande ou depuis Tâches et rappels.','Service client','fr',true,true) on conflict(id) do nothing;
insert into rose_care.faqs(id,question,answer,category,language,approved,staff_fixture) values ('64000000-0000-4000-8000-0000000001f9','Comment retrouver un brouillon de confirmation ?','Depuis la commande, préparer un message et sélectionner le modèle Confirmation.','Service client','fr',true,true) on conflict(id) do nothing;
commit;
