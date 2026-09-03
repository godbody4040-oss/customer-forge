-- 1. Role helper must be runnable by logged-in users; 36 access policies call it.
GRANT EXECUTE ON FUNCTION private.org_role_at_least(uuid, text) TO authenticated, service_role;

-- 2. Retire the last Revora-branded subdomain hosting machinery.
DROP TRIGGER IF EXISTS website_settings_assign_subdomain ON public.website_settings;
DROP FUNCTION IF EXISTS public.website_settings_assign_subdomain();

DROP VIEW IF EXISTS public.public_website_settings;
ALTER TABLE public.website_settings DROP COLUMN IF EXISTS subdomain;
DROP FUNCTION IF EXISTS public.revora_reserved_subdomains();

CREATE VIEW public.public_website_settings
WITH (security_invoker = true) AS
SELECT id, organization_id, template, pages, seo, custom_domain, published,
       publish_state, last_published_at, generation, created_at, updated_at
FROM public.website_settings ws
WHERE published
  AND publish_state = 'published'::publish_state
  AND private.org_site_published(organization_id);

GRANT SELECT ON public.public_website_settings TO anon, authenticated, service_role;

-- 3. Workspace immutability for the remaining tenant-owned tables.
CREATE TRIGGER memberships_freeze_org BEFORE UPDATE ON public.memberships
  FOR EACH ROW EXECUTE FUNCTION private.freeze_organization_id();
CREATE TRIGGER team_invitations_freeze_org BEFORE UPDATE ON public.team_invitations
  FOR EACH ROW EXECUTE FUNCTION private.freeze_organization_id();
CREATE TRIGGER support_sessions_freeze_org BEFORE UPDATE ON public.support_sessions
  FOR EACH ROW EXECUTE FUNCTION private.freeze_organization_id();

-- 4. Same-workspace parent references, enforced by composite foreign keys.
ALTER TABLE public.services ADD CONSTRAINT services_id_org_key UNIQUE (id, organization_id);
ALTER TABLE public.customers ADD CONSTRAINT customers_id_org_key UNIQUE (id, organization_id);
ALTER TABLE public.leads ADD CONSTRAINT leads_id_org_key UNIQUE (id, organization_id);
ALTER TABLE public.appointments ADD CONSTRAINT appointments_id_org_key UNIQUE (id, organization_id);
ALTER TABLE public.automations ADD CONSTRAINT automations_id_org_key UNIQUE (id, organization_id);
ALTER TABLE public.automation_steps ADD CONSTRAINT automation_steps_id_org_key UNIQUE (id, organization_id);
ALTER TABLE public.generation_jobs ADD CONSTRAINT generation_jobs_id_org_key UNIQUE (id, organization_id);

ALTER TABLE public.leads
  ADD CONSTRAINT leads_service_same_org_fkey FOREIGN KEY (service_id, organization_id)
    REFERENCES public.services (id, organization_id) ON DELETE SET NULL (service_id),
  ADD CONSTRAINT leads_customer_same_org_fkey FOREIGN KEY (customer_id, organization_id)
    REFERENCES public.customers (id, organization_id) ON DELETE SET NULL (customer_id);

ALTER TABLE public.appointments
  ADD CONSTRAINT appointments_service_same_org_fkey FOREIGN KEY (service_id, organization_id)
    REFERENCES public.services (id, organization_id) ON DELETE SET NULL (service_id),
  ADD CONSTRAINT appointments_lead_same_org_fkey FOREIGN KEY (lead_id, organization_id)
    REFERENCES public.leads (id, organization_id) ON DELETE SET NULL (lead_id),
  ADD CONSTRAINT appointments_customer_same_org_fkey FOREIGN KEY (customer_id, organization_id)
    REFERENCES public.customers (id, organization_id) ON DELETE SET NULL (customer_id);

ALTER TABLE public.lead_activities
  ADD CONSTRAINT lead_activities_lead_same_org_fkey FOREIGN KEY (lead_id, organization_id)
    REFERENCES public.leads (id, organization_id) ON DELETE CASCADE,
  ADD CONSTRAINT lead_activities_appointment_same_org_fkey FOREIGN KEY (appointment_id, organization_id)
    REFERENCES public.appointments (id, organization_id) ON DELETE SET NULL (appointment_id);

ALTER TABLE public.automation_steps
  ADD CONSTRAINT automation_steps_automation_same_org_fkey FOREIGN KEY (automation_id, organization_id)
    REFERENCES public.automations (id, organization_id) ON DELETE CASCADE;

ALTER TABLE public.automation_runs
  ADD CONSTRAINT automation_runs_automation_same_org_fkey FOREIGN KEY (automation_id, organization_id)
    REFERENCES public.automations (id, organization_id) ON DELETE CASCADE,
  ADD CONSTRAINT automation_runs_step_same_org_fkey FOREIGN KEY (step_id, organization_id)
    REFERENCES public.automation_steps (id, organization_id) ON DELETE CASCADE,
  ADD CONSTRAINT automation_runs_lead_same_org_fkey FOREIGN KEY (lead_id, organization_id)
    REFERENCES public.leads (id, organization_id) ON DELETE CASCADE,
  ADD CONSTRAINT automation_runs_appointment_same_org_fkey FOREIGN KEY (appointment_id, organization_id)
    REFERENCES public.appointments (id, organization_id) ON DELETE CASCADE;

ALTER TABLE public.quote_requests
  ADD CONSTRAINT quote_requests_form_same_org_fkey FOREIGN KEY (form_id, organization_id)
    REFERENCES public.quote_forms (id, organization_id) ON DELETE SET NULL (form_id),
  ADD CONSTRAINT quote_requests_lead_same_org_fkey FOREIGN KEY (lead_id, organization_id)
    REFERENCES public.leads (id, organization_id) ON DELETE CASCADE;

ALTER TABLE public.reviews
  ADD CONSTRAINT reviews_customer_same_org_fkey FOREIGN KEY (customer_id, organization_id)
    REFERENCES public.customers (id, organization_id) ON DELETE SET NULL (customer_id),
  ADD CONSTRAINT reviews_appointment_same_org_fkey FOREIGN KEY (appointment_id, organization_id)
    REFERENCES public.appointments (id, organization_id) ON DELETE SET NULL (appointment_id);

ALTER TABLE public.ai_generations
  ADD CONSTRAINT ai_generations_job_same_org_fkey FOREIGN KEY (job_id, organization_id)
    REFERENCES public.generation_jobs (id, organization_id) ON DELETE SET NULL (job_id);