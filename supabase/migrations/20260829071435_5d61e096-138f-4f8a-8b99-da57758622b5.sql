DELETE FROM public.payment_products WHERE id IN ('plan-starter-monthly','plan-growth-monthly','plan-pro-monthly','plan-starter-annual','plan-growth-annual','plan-pro-annual','website-build','growth-setup','deposit') AND NOT EXISTS (SELECT 1 FROM public.payments p WHERE p.product_id = public.payment_products.id);

UPDATE public.payment_products SET is_active = false, updated_at = now() WHERE id <> 'revora_growth_system_setup' AND id <> 'revora_growth_system_monthly';

INSERT INTO public.payment_products (id, name, description, amount, currency, kind, billing_interval, plan_id, entitlement_key, sort_order, is_active)
VALUES ('revora_growth_system_monthly', 'Revora Growth System — Monthly', 'Ongoing platform, automation, hosting/system management, support and growth services.', 250.00, 'USD', 'subscription', 'monthly', 'revora_growth_system', 'website', 2, true)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, amount = EXCLUDED.amount, billing_interval = EXCLUDED.billing_interval, is_active = true, updated_at = now();

UPDATE public.payment_products SET amount = 1500.00, is_active = true, updated_at = now() WHERE id = 'revora_growth_system_setup';