insert into public.organizations (id, name, slug, industry, plan_id, subscription_status, conversion_goal, onboarding_step, onboarding_completed, is_demo)
values ('11111111-1111-4111-8111-111111111111','Elite Mobile Detailing','elite-mobile-detailing','Auto Detailing','growth','active','quotes',5,true,true);

insert into public.business_profiles (organization_id, tagline, description, phone, email, website, address, city, state, zip, service_area, hours, primary_color, secondary_color, accent_color)
values ('11111111-1111-4111-8111-111111111111',
 'Showroom-quality detailing that comes to you.',
 'Elite Mobile Detailing brings full interior and exterior detailing, paint correction and ceramic coating directly to your driveway across the Austin metro. Fully insured, water and power included, same-week availability.',
 '(512) 555-0142','hello@elitemobiledetailing.example','https://elitemobiledetailing.example',
 '2400 E 6th St','Austin','TX','78702','Austin, Round Rock, Cedar Park, Pflugerville and Georgetown',
 '{"mon":"8:00 AM - 6:00 PM","tue":"8:00 AM - 6:00 PM","wed":"8:00 AM - 6:00 PM","thu":"8:00 AM - 6:00 PM","fri":"8:00 AM - 6:00 PM","sat":"9:00 AM - 4:00 PM","sun":"Closed"}'::jsonb,
 '#34D399','#0E0E10','#F59E0B');

insert into public.website_settings (organization_id, template, subdomain, published, seo)
values ('11111111-1111-4111-8111-111111111111','detailing','elite-mobile-detailing',true,
 '{"title":"Mobile Auto Detailing in Austin, TX | Elite Mobile Detailing","description":"Showroom-quality mobile detailing, paint correction and ceramic coating across Austin. Get an instant estimate in 60 seconds."}'::jsonb);

insert into public.social_profiles (organization_id, instagram, facebook, tiktok, google_business)
values ('11111111-1111-4111-8111-111111111111','https://instagram.com/example','https://facebook.com/example','https://tiktok.com/@example','https://g.page/example');

insert into public.services (id, organization_id, name, description, category, price, starting_price, duration_minutes, bookable, featured, sort_order) values
('21111111-1111-4111-8111-111111111111','11111111-1111-4111-8111-111111111111','Full Interior Detail','Deep extraction of carpets and upholstery, steam-cleaned surfaces, leather conditioning and glass polish.','Interior',249,199,180,true,true,1),
('21111111-1111-4111-8111-111111111112','11111111-1111-4111-8111-111111111111','Exterior Wash & Seal','Two-bucket hand wash, iron decontamination, clay treatment and a six-month paint sealant.','Exterior',179,149,120,true,true,2),
('21111111-1111-4111-8111-111111111113','11111111-1111-4111-8111-111111111111','Paint Correction','Single or two-stage machine polish that removes swirls, oxidation and light scratches.','Paint',699,499,480,true,true,3),
('21111111-1111-4111-8111-111111111114','11111111-1111-4111-8111-111111111111','Ceramic Coating','Professional-grade 5-year ceramic coating with prep, correction and cure time included.','Protection',1400,1200,600,true,false,4),
('21111111-1111-4111-8111-111111111115','11111111-1111-4111-8111-111111111111','Engine Bay Cleaning','Safe degrease, agitate and dress of the full engine bay.','Add-on',95,95,60,true,false,5),
('21111111-1111-4111-8111-111111111116','11111111-1111-4111-8111-111111111111','Fleet Maintenance Detail','Recurring exterior and interior upkeep for vans, trucks and company vehicles.','Fleet',null,120,90,true,false,6);

insert into public.quote_forms (id, organization_id, name, base_price, min_price, max_price)
values ('31111111-1111-4111-8111-111111111111','11111111-1111-4111-8111-111111111111','Instant Detailing Estimate',149,149,3000);

insert into public.quote_questions (id, form_id, organization_id, label, helper_text, sort_order) values
('41111111-1111-4111-8111-111111111111','31111111-1111-4111-8111-111111111111','11111111-1111-4111-8111-111111111111','What are we detailing?','Larger vehicles take more product and time.',1),
('41111111-1111-4111-8111-111111111112','31111111-1111-4111-8111-111111111111','11111111-1111-4111-8111-111111111111','Which service do you want?',null,2),
('41111111-1111-4111-8111-111111111113','31111111-1111-4111-8111-111111111111','11111111-1111-4111-8111-111111111111','How is the current condition?','Be honest — it helps us quote accurately.',3),
('41111111-1111-4111-8111-111111111114','31111111-1111-4111-8111-111111111111','11111111-1111-4111-8111-111111111111','Any add-ons?',null,4);

insert into public.quote_options (question_id, organization_id, label, price_modifier, modifier_type, sort_order) values
('41111111-1111-4111-8111-111111111111','11111111-1111-4111-8111-111111111111','Coupe or sedan',0,'add',1),
('41111111-1111-4111-8111-111111111111','11111111-1111-4111-8111-111111111111','Small SUV or crossover',40,'add',2),
('41111111-1111-4111-8111-111111111111','11111111-1111-4111-8111-111111111111','Large SUV or truck',85,'add',3),
('41111111-1111-4111-8111-111111111111','11111111-1111-4111-8111-111111111111','Van or 3-row',110,'add',4),
('41111111-1111-4111-8111-111111111112','11111111-1111-4111-8111-111111111111','Exterior wash & seal',30,'add',1),
('41111111-1111-4111-8111-111111111112','11111111-1111-4111-8111-111111111111','Full interior detail',100,'add',2),
('41111111-1111-4111-8111-111111111112','11111111-1111-4111-8111-111111111111','Interior + exterior',210,'add',3),
('41111111-1111-4111-8111-111111111112','11111111-1111-4111-8111-111111111111','Paint correction',450,'add',4),
('41111111-1111-4111-8111-111111111112','11111111-1111-4111-8111-111111111111','Ceramic coating',1100,'add',5),
('41111111-1111-4111-8111-111111111113','11111111-1111-4111-8111-111111111111','Well maintained',0,'add',1),
('41111111-1111-4111-8111-111111111113','11111111-1111-4111-8111-111111111111','Normal daily use',35,'add',2),
('41111111-1111-4111-8111-111111111113','11111111-1111-4111-8111-111111111111','Heavily soiled',90,'add',3),
('41111111-1111-4111-8111-111111111113','11111111-1111-4111-8111-111111111111','Pet hair or stains',120,'add',4),
('41111111-1111-4111-8111-111111111114','11111111-1111-4111-8111-111111111111','No add-ons',0,'add',1),
('41111111-1111-4111-8111-111111111114','11111111-1111-4111-8111-111111111111','Engine bay cleaning',95,'add',2),
('41111111-1111-4111-8111-111111111114','11111111-1111-4111-8111-111111111111','Headlight restoration',80,'add',3),
('41111111-1111-4111-8111-111111111114','11111111-1111-4111-8111-111111111111','Odor treatment',75,'add',4);

insert into public.campaigns (organization_id, name, source, medium, code, target_path) values
('11111111-1111-4111-8111-111111111111','Instagram Bio Link','instagram','social','ig-bio','/quote'),
('11111111-1111-4111-8111-111111111111','Google Ads — Detailing Austin','google','cpc','g-ads-austin','/quote'),
('11111111-1111-4111-8111-111111111111','Flyer QR Code','qr_code','print','flyer-q3','/book'),
('11111111-1111-4111-8111-111111111111','Facebook Local Groups','facebook','social','fb-groups','/');

insert into public.customers (id, organization_id, name, email, phone, address, tags, total_value, last_appointment_at, next_appointment_at) values
('51111111-1111-4111-8111-111111111111','11111111-1111-4111-8111-111111111111','Priya Nair','priya.demo@example.com','(512) 555-0110','1100 Congress Ave, Austin, TX',array['VIP','High Value'],2840,now() - interval '9 days', now() + interval '3 days'),
('51111111-1111-4111-8111-111111111112','11111111-1111-4111-8111-111111111111','Sofia Lin','sofia.demo@example.com','(512) 555-0121','4501 Spicewood Springs Rd, Austin, TX',array['Repeat'],640,now() - interval '21 days', now() + interval '1 day'),
('51111111-1111-4111-8111-111111111113','11111111-1111-4111-8111-111111111111','Tom Okafor','tom.demo@example.com','(512) 555-0133','900 E 11th St, Austin, TX',array['New'],249,now() - interval '4 days', null);

insert into public.leads (organization_id, name, email, phone, service_id, service_interest, message, city, source, campaign, status, estimated_value, customer_id, last_contacted_at, next_follow_up_at, created_at) values
('11111111-1111-4111-8111-111111111111','Marcus Bell','marcus.demo@example.com','(512) 555-0164','21111111-1111-4111-8111-111111111111','Full Interior Detail','Two kids and a dog — the back seat needs a miracle.','Austin','google','g-ads-austin','new',289,null,null,now() + interval '4 hours',now() - interval '5 hours'),
('11111111-1111-4111-8111-111111111111','Dana Reyes','dana.demo@example.com','(512) 555-0177','21111111-1111-4111-8111-111111111112','Exterior Wash & Seal','Requested an estimate through the calculator.','Round Rock','instagram','ig-bio','new',209,null,null,now() + interval '1 day',now() - interval '9 hours'),
('11111111-1111-4111-8111-111111111111','Alicia Gomez','alicia.demo@example.com','(512) 555-0188',null,'Ceramic Coating','New truck, want it protected before summer.','Cedar Park','referral',null,'contacted',1510,null,now() - interval '1 day',now() + interval '2 days',now() - interval '2 days'),
('11111111-1111-4111-8111-111111111111','Priya Nair','priya.demo@example.com','(512) 555-0110','21111111-1111-4111-8111-111111111114','Ceramic Coating','Fleet of 3 vans plus personal BMW X5.','Austin','website',null,'qualified',2840,'51111111-1111-4111-8111-111111111111',now() - interval '3 days',null,now() - interval '11 days'),
('11111111-1111-4111-8111-111111111111','Tom Okafor','tom.demo@example.com','(512) 555-0133','21111111-1111-4111-8111-111111111113','Paint Correction','Swirl marks from an automatic car wash.','Austin','google','g-ads-austin','quoted',699,'51111111-1111-4111-8111-111111111113',now() - interval '6 days',now() + interval '1 day',now() - interval '8 days'),
('11111111-1111-4111-8111-111111111111','Sofia Lin','sofia.demo@example.com','(512) 555-0121','21111111-1111-4111-8111-111111111111','Full Interior Detail','Booked online for tomorrow morning.','Austin','qr_code','flyer-q3','booked',249,'51111111-1111-4111-8111-111111111112',now() - interval '2 days',null,now() - interval '3 days'),
('11111111-1111-4111-8111-111111111111','Ravi Shah','ravi.demo@example.com','(512) 555-0199','21111111-1111-4111-8111-111111111112','Exterior Wash & Seal','Completed — very happy.','Pflugerville','facebook','fb-groups','completed',179,null,now() - interval '12 days',null,now() - interval '18 days'),
('11111111-1111-4111-8111-111111111111','Kyle Bennett','kyle.demo@example.com','(512) 555-0102',null,'Engine Bay Cleaning','Went with a cheaper option.','Austin','direct',null,'lost',95,null,now() - interval '15 days',null,now() - interval '20 days'),
('11111111-1111-4111-8111-111111111111','Nora Whitfield','nora.demo@example.com','(512) 555-0155','21111111-1111-4111-8111-111111111111','Full Interior Detail','Tesla Model 3, white interior.','Austin','instagram','ig-bio','new',289,null,null,now() + interval '6 hours',now() - interval '2 hours'),
('11111111-1111-4111-8111-111111111111','Grant Meyer','grant.demo@example.com','(512) 555-0166','21111111-1111-4111-8111-111111111116','Fleet Maintenance Detail','8 service vans, monthly upkeep.','Georgetown','referral',null,'qualified',1920,null,now() - interval '2 days',now() + interval '3 days',now() - interval '6 days');

insert into public.appointments (organization_id, customer_id, service_id, name, email, phone, starts_at, ends_at, status, notes) values
('11111111-1111-4111-8111-111111111111','51111111-1111-4111-8111-111111111112','21111111-1111-4111-8111-111111111111','Sofia Lin','sofia.demo@example.com','(512) 555-0121', date_trunc('day', now() + interval '1 day') + interval '9 hours', date_trunc('day', now() + interval '1 day') + interval '12 hours','confirmed','Driveway access on the left side.'),
('11111111-1111-4111-8111-111111111111','51111111-1111-4111-8111-111111111111','21111111-1111-4111-8111-111111111114','Priya Nair','priya.demo@example.com','(512) 555-0110', date_trunc('day', now() + interval '3 days') + interval '8 hours', date_trunc('day', now() + interval '3 days') + interval '18 hours','confirmed','Ceramic coating — full day booked.'),
('11111111-1111-4111-8111-111111111111',null,'21111111-1111-4111-8111-111111111112','Alicia Gomez','alicia.demo@example.com','(512) 555-0188', date_trunc('day', now() + interval '2 days') + interval '13 hours', date_trunc('day', now() + interval '2 days') + interval '15 hours','pending','Awaiting confirmation.'),
('11111111-1111-4111-8111-111111111111','51111111-1111-4111-8111-111111111113','21111111-1111-4111-8111-111111111111','Tom Okafor','tom.demo@example.com','(512) 555-0133', date_trunc('day', now() - interval '4 days') + interval '10 hours', date_trunc('day', now() - interval '4 days') + interval '13 hours','completed','Interior detail complete.'),
('11111111-1111-4111-8111-111111111111','51111111-1111-4111-8111-111111111112','21111111-1111-4111-8111-111111111112','Sofia Lin','sofia.demo@example.com','(512) 555-0121', date_trunc('day', now() - interval '21 days') + interval '9 hours', date_trunc('day', now() - interval '21 days') + interval '11 hours','completed','Repeat customer.');

insert into public.reviews (organization_id, customer_id, author_name, rating, comment, is_published) values
('11111111-1111-4111-8111-111111111111','51111111-1111-4111-8111-111111111111','Priya N.',5,'They coated my X5 and two work vans in one week. The finish still beads water months later. Genuinely the most professional detailer I have used in Austin.',true),
('11111111-1111-4111-8111-111111111111','51111111-1111-4111-8111-111111111112','Sofia L.',5,'Booked online in about a minute, they showed up on time with their own water and power, and my interior looks like the day I bought it.',true),
('11111111-1111-4111-8111-111111111111','51111111-1111-4111-8111-111111111113','Tom O.',5,'The paint correction removed swirls I assumed were permanent. Worth every dollar.',true);

insert into public.automations (id, organization_id, name, trigger_event, is_active) values
('61111111-1111-4111-8111-111111111111','11111111-1111-4111-8111-111111111111','New lead instant reply','lead_created',true),
('61111111-1111-4111-8111-111111111112','11111111-1111-4111-8111-111111111111','Uncontacted lead nudge','lead_uncontacted',true),
('61111111-1111-4111-8111-111111111113','11111111-1111-4111-8111-111111111111','Appointment reminder','appointment_upcoming',true),
('61111111-1111-4111-8111-111111111114','11111111-1111-4111-8111-111111111111','Post-service review request','appointment_completed',true);

insert into public.automation_steps (automation_id, organization_id, sort_order, delay_minutes, action_type, subject, body) values
('61111111-1111-4111-8111-111111111111','11111111-1111-4111-8111-111111111111',1,0,'email','We got your request','Thanks for reaching out — we will confirm your slot shortly.'),
('61111111-1111-4111-8111-111111111111','11111111-1111-4111-8111-111111111111',2,10,'sms',null,'Hi {{name}}, this is Elite Mobile Detailing. Want me to hold a time for you this week?'),
('61111111-1111-4111-8111-111111111112','11111111-1111-4111-8111-111111111111',1,1440,'email','Still want that detail?','Following up on your estimate — happy to answer any questions.'),
('61111111-1111-4111-8111-111111111113','11111111-1111-4111-8111-111111111111',1,0,'sms',null,'Reminder: your detail is tomorrow at {{time}}. Reply C to confirm.'),
('61111111-1111-4111-8111-111111111114','11111111-1111-4111-8111-111111111111',1,120,'email','How did we do?','If we earned it, a quick review helps other locals find us.');

insert into public.notifications (organization_id, title, body, kind, link, is_read, created_at) values
('11111111-1111-4111-8111-111111111111','New lead: Nora Whitfield','Full Interior Detail · via Instagram · $289 estimated','lead','/app/leads',false, now() - interval '2 hours'),
('11111111-1111-4111-8111-111111111111','New lead: Marcus Bell','Full Interior Detail · via Google Ads · $289 estimated','lead','/app/leads',false, now() - interval '5 hours'),
('11111111-1111-4111-8111-111111111111','Booking confirmed: Sofia Lin','Tomorrow 9:00 AM · Full Interior Detail','booking','/app/calendar',false, now() - interval '1 day'),
('11111111-1111-4111-8111-111111111111','Quote request received','Dana Reyes requested an estimate of $209','quote','/app/leads',true, now() - interval '9 hours'),
('11111111-1111-4111-8111-111111111111','3 completed jobs have no review request','Ask for reviews while the work is fresh.','review','/app/reviews',false, now() - interval '3 days');

insert into public.subscriptions (organization_id, plan_id, status, billing_interval, current_period_end)
values ('11111111-1111-4111-8111-111111111111','growth','active','monthly', now() + interval '18 days');

insert into public.invoices (organization_id, amount, status, period_start, period_end) values
('11111111-1111-4111-8111-111111111111',249,'paid', now() - interval '42 days', now() - interval '12 days'),
('11111111-1111-4111-8111-111111111111',249,'paid', now() - interval '72 days', now() - interval '42 days'),
('11111111-1111-4111-8111-111111111111',249,'paid', now() - interval '102 days', now() - interval '72 days');

-- 30 days of demo traffic
insert into public.analytics_events (organization_id, event_type, path, source, campaign, device, session_id, created_at)
select '11111111-1111-4111-8111-111111111111',
  (array['page_view','page_view','page_view','page_view','call_click','quote_start','text_click'])[1 + (n % 7)],
  (array['/','/services','/quote','/book','/reviews'])[1 + (n % 5)],
  (array['google','instagram','direct','facebook','referral','qr_code'])[1 + (n % 6)],
  (array['g-ads-austin','ig-bio',null,'fb-groups',null,'flyer-q3'])[1 + (n % 6)],
  (array['mobile','mobile','mobile','desktop','tablet'])[1 + (n % 5)],
  'demo-' || n,
  now() - ((n % 30) || ' days')::interval - ((n % 17) || ' hours')::interval
from generate_series(1, 1240) as n;