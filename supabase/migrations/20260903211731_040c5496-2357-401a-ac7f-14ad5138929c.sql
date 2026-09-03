-- =====================================================================
-- 1. SAME-TENANT REFERENTIAL INTEGRITY
-- The child tables carried their own organization_id while their parent
-- reference (page_id / section_id / form_id / question_id) was only
-- constrained to "some" parent row. A workspace manager could therefore
-- insert a row with their OWN organization_id but a parent id belonging to
-- another business, and the published-site reader (which joins children by
-- parent id) would render it on the victim's website. Composite foreign
-- keys make that physically impossible.
-- =====================================================================
ALTER TABLE public.website_pages
  ADD CONSTRAINT website_pages_id_org_key UNIQUE (id, organization_id);
ALTER TABLE public.website_sections
  ADD CONSTRAINT website_sections_id_org_key UNIQUE (id, organization_id);
ALTER TABLE public.quote_forms
  ADD CONSTRAINT quote_forms_id_org_key UNIQUE (id, organization_id);
ALTER TABLE public.quote_questions
  ADD CONSTRAINT quote_questions_id_org_key UNIQUE (id, organization_id);

ALTER TABLE public.website_sections
  ADD CONSTRAINT website_sections_page_same_org_fkey
  FOREIGN KEY (page_id, organization_id)
  REFERENCES public.website_pages (id, organization_id) ON DELETE CASCADE;

ALTER TABLE public.website_components
  ADD CONSTRAINT website_components_section_same_org_fkey
  FOREIGN KEY (section_id, organization_id)
  REFERENCES public.website_sections (id, organization_id) ON DELETE CASCADE;

ALTER TABLE public.quote_questions
  ADD CONSTRAINT quote_questions_form_same_org_fkey
  FOREIGN KEY (form_id, organization_id)
  REFERENCES public.quote_forms (id, organization_id) ON DELETE CASCADE;

ALTER TABLE public.quote_addons
  ADD CONSTRAINT quote_addons_form_same_org_fkey
  FOREIGN KEY (form_id, organization_id)
  REFERENCES public.quote_forms (id, organization_id) ON DELETE CASCADE;

ALTER TABLE public.quote_options
  ADD CONSTRAINT quote_options_question_same_org_fkey
  FOREIGN KEY (question_id, organization_id)
  REFERENCES public.quote_questions (id, organization_id) ON DELETE CASCADE;

-- =====================================================================
-- 2. organization_id IS IMMUTABLE
-- An UPDATE policy checks the role in the resulting row's organization, so
-- a user belonging to two workspaces could otherwise move a record between
-- them (and a lower role in the target could not stop the row from landing
-- there). Ownership is now fixed at creation time.
-- =====================================================================
CREATE OR REPLACE FUNCTION private.freeze_organization_id()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'private'
AS $$
BEGIN
  IF NEW.organization_id IS DISTINCT FROM OLD.organization_id THEN
    IF current_setting('role', true) = 'service_role' OR private.is_super_admin() THEN
      RETURN NEW;
    END IF;
    RAISE EXCEPTION 'ORGANIZATION_IMMUTABLE';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER website_pages_freeze_org BEFORE UPDATE ON public.website_pages
  FOR EACH ROW EXECUTE FUNCTION private.freeze_organization_id();
CREATE TRIGGER website_sections_freeze_org BEFORE UPDATE ON public.website_sections
  FOR EACH ROW EXECUTE FUNCTION private.freeze_organization_id();
CREATE TRIGGER website_components_freeze_org BEFORE UPDATE ON public.website_components
  FOR EACH ROW EXECUTE FUNCTION private.freeze_organization_id();
CREATE TRIGGER website_settings_freeze_org BEFORE UPDATE ON public.website_settings
  FOR EACH ROW EXECUTE FUNCTION private.freeze_organization_id();
CREATE TRIGGER quote_forms_freeze_org BEFORE UPDATE ON public.quote_forms
  FOR EACH ROW EXECUTE FUNCTION private.freeze_organization_id();
CREATE TRIGGER quote_questions_freeze_org BEFORE UPDATE ON public.quote_questions
  FOR EACH ROW EXECUTE FUNCTION private.freeze_organization_id();
CREATE TRIGGER quote_options_freeze_org BEFORE UPDATE ON public.quote_options
  FOR EACH ROW EXECUTE FUNCTION private.freeze_organization_id();
CREATE TRIGGER quote_addons_freeze_org BEFORE UPDATE ON public.quote_addons
  FOR EACH ROW EXECUTE FUNCTION private.freeze_organization_id();
CREATE TRIGGER services_freeze_org BEFORE UPDATE ON public.services
  FOR EACH ROW EXECUTE FUNCTION private.freeze_organization_id();
CREATE TRIGGER media_freeze_org BEFORE UPDATE ON public.media
  FOR EACH ROW EXECUTE FUNCTION private.freeze_organization_id();
CREATE TRIGGER reviews_freeze_org BEFORE UPDATE ON public.reviews
  FOR EACH ROW EXECUTE FUNCTION private.freeze_organization_id();
CREATE TRIGGER leads_freeze_org BEFORE UPDATE ON public.leads
  FOR EACH ROW EXECUTE FUNCTION private.freeze_organization_id();
CREATE TRIGGER appointments_freeze_org BEFORE UPDATE ON public.appointments
  FOR EACH ROW EXECUTE FUNCTION private.freeze_organization_id();

-- =====================================================================
-- 3. AUDIT TRAIL IS APPEND-ONLY FOR WORKSPACE USERS
-- Server code writes audit entries as the acting member, so INSERT stays;
-- UPDATE/DELETE are removed so history cannot be rewritten or erased.
-- =====================================================================
DROP POLICY IF EXISTS audit_logs_member_all ON public.audit_logs;

CREATE POLICY audit_logs_member_read ON public.audit_logs
FOR SELECT TO authenticated
USING (private.is_org_member(organization_id) OR private.is_super_admin());

CREATE POLICY audit_logs_member_append ON public.audit_logs
FOR INSERT TO authenticated
WITH CHECK (private.is_org_member(organization_id));

CREATE POLICY audit_logs_no_update ON public.audit_logs
AS RESTRICTIVE FOR UPDATE TO anon, authenticated USING (false) WITH CHECK (false);

CREATE POLICY audit_logs_no_delete ON public.audit_logs
AS RESTRICTIVE FOR DELETE TO anon, authenticated USING (false);

-- =====================================================================
-- 4. INVOICES ARE READ-ONLY FOR WORKSPACE USERS
-- Only the signature-verified payment webhook and admin paths write them.
-- =====================================================================
DROP POLICY IF EXISTS invoices_member_all ON public.invoices;

CREATE POLICY invoices_member_read ON public.invoices
FOR SELECT TO authenticated
USING (private.is_org_member(organization_id) OR private.is_super_admin());

CREATE POLICY invoices_no_member_write ON public.invoices
AS RESTRICTIVE FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);

CREATE POLICY invoices_member_read_only ON public.invoices
FOR SELECT TO authenticated
USING (private.is_org_member(organization_id) OR private.is_super_admin());

-- =====================================================================
-- 5. ANALYTICS CANNOT BE DOCTORED
-- Recording and reading stay; editing and deleting reported numbers stop.
-- =====================================================================
DROP POLICY IF EXISTS analytics_events_member_all ON public.analytics_events;

CREATE POLICY analytics_events_member_read ON public.analytics_events
FOR SELECT TO authenticated
USING (private.is_org_member(organization_id) OR private.is_super_admin());

CREATE POLICY analytics_events_member_insert ON public.analytics_events
FOR INSERT TO authenticated
WITH CHECK (private.is_org_member(organization_id));

CREATE POLICY analytics_events_no_update ON public.analytics_events
AS RESTRICTIVE FOR UPDATE TO anon, authenticated USING (false) WITH CHECK (false);

CREATE POLICY analytics_events_no_delete ON public.analytics_events
AS RESTRICTIVE FOR DELETE TO anon, authenticated USING (false);

-- =====================================================================
-- 6. ROLE LADDER FOR WEBSITE CONTENT TABLES
-- read = any member, add/edit = staff+, delete = manager+.
-- Matches the ladder already applied to website pages/sections/blocks.
-- =====================================================================
DROP POLICY IF EXISTS services_member_all ON public.services;
CREATE POLICY services_member_read ON public.services
  FOR SELECT TO authenticated USING (private.is_org_member(organization_id));
CREATE POLICY services_staff_insert ON public.services
  FOR INSERT TO authenticated WITH CHECK (private.org_role_at_least(organization_id, 'staff'));
CREATE POLICY services_staff_update ON public.services
  FOR UPDATE TO authenticated
  USING (private.org_role_at_least(organization_id, 'staff'))
  WITH CHECK (private.org_role_at_least(organization_id, 'staff'));
CREATE POLICY services_manager_delete ON public.services
  FOR DELETE TO authenticated USING (private.org_role_at_least(organization_id, 'manager'));

DROP POLICY IF EXISTS media_member_all ON public.media;
CREATE POLICY media_member_read ON public.media
  FOR SELECT TO authenticated USING (private.is_org_member(organization_id));
CREATE POLICY media_staff_insert ON public.media
  FOR INSERT TO authenticated WITH CHECK (private.org_role_at_least(organization_id, 'staff'));
CREATE POLICY media_staff_update ON public.media
  FOR UPDATE TO authenticated
  USING (private.org_role_at_least(organization_id, 'staff'))
  WITH CHECK (private.org_role_at_least(organization_id, 'staff'));
CREATE POLICY media_manager_delete ON public.media
  FOR DELETE TO authenticated USING (private.org_role_at_least(organization_id, 'manager'));

DROP POLICY IF EXISTS reviews_member_all ON public.reviews;
CREATE POLICY reviews_member_read ON public.reviews
  FOR SELECT TO authenticated USING (private.is_org_member(organization_id));
CREATE POLICY reviews_staff_insert ON public.reviews
  FOR INSERT TO authenticated WITH CHECK (private.org_role_at_least(organization_id, 'staff'));
CREATE POLICY reviews_staff_update ON public.reviews
  FOR UPDATE TO authenticated
  USING (private.org_role_at_least(organization_id, 'staff'))
  WITH CHECK (private.org_role_at_least(organization_id, 'staff'));
CREATE POLICY reviews_manager_delete ON public.reviews
  FOR DELETE TO authenticated USING (private.org_role_at_least(organization_id, 'manager'));

DROP POLICY IF EXISTS quote_forms_member_all ON public.quote_forms;
CREATE POLICY quote_forms_member_read ON public.quote_forms
  FOR SELECT TO authenticated USING (private.is_org_member(organization_id));
CREATE POLICY quote_forms_staff_insert ON public.quote_forms
  FOR INSERT TO authenticated WITH CHECK (private.org_role_at_least(organization_id, 'staff'));
CREATE POLICY quote_forms_staff_update ON public.quote_forms
  FOR UPDATE TO authenticated
  USING (private.org_role_at_least(organization_id, 'staff'))
  WITH CHECK (private.org_role_at_least(organization_id, 'staff'));
CREATE POLICY quote_forms_manager_delete ON public.quote_forms
  FOR DELETE TO authenticated USING (private.org_role_at_least(organization_id, 'manager'));

DROP POLICY IF EXISTS quote_questions_member_all ON public.quote_questions;
CREATE POLICY quote_questions_member_read ON public.quote_questions
  FOR SELECT TO authenticated USING (private.is_org_member(organization_id));
CREATE POLICY quote_questions_staff_insert ON public.quote_questions
  FOR INSERT TO authenticated WITH CHECK (private.org_role_at_least(organization_id, 'staff'));
CREATE POLICY quote_questions_staff_update ON public.quote_questions
  FOR UPDATE TO authenticated
  USING (private.org_role_at_least(organization_id, 'staff'))
  WITH CHECK (private.org_role_at_least(organization_id, 'staff'));
CREATE POLICY quote_questions_manager_delete ON public.quote_questions
  FOR DELETE TO authenticated USING (private.org_role_at_least(organization_id, 'manager'));

DROP POLICY IF EXISTS quote_options_member_all ON public.quote_options;
CREATE POLICY quote_options_member_read ON public.quote_options
  FOR SELECT TO authenticated USING (private.is_org_member(organization_id));
CREATE POLICY quote_options_staff_insert ON public.quote_options
  FOR INSERT TO authenticated WITH CHECK (private.org_role_at_least(organization_id, 'staff'));
CREATE POLICY quote_options_staff_update ON public.quote_options
  FOR UPDATE TO authenticated
  USING (private.org_role_at_least(organization_id, 'staff'))
  WITH CHECK (private.org_role_at_least(organization_id, 'staff'));
CREATE POLICY quote_options_manager_delete ON public.quote_options
  FOR DELETE TO authenticated USING (private.org_role_at_least(organization_id, 'manager'));

DROP POLICY IF EXISTS quote_addons_member_all ON public.quote_addons;
CREATE POLICY quote_addons_member_read ON public.quote_addons
  FOR SELECT TO authenticated USING (private.is_org_member(organization_id));
CREATE POLICY quote_addons_staff_insert ON public.quote_addons
  FOR INSERT TO authenticated WITH CHECK (private.org_role_at_least(organization_id, 'staff'));
CREATE POLICY quote_addons_staff_update ON public.quote_addons
  FOR UPDATE TO authenticated
  USING (private.org_role_at_least(organization_id, 'staff'))
  WITH CHECK (private.org_role_at_least(organization_id, 'staff'));
CREATE POLICY quote_addons_manager_delete ON public.quote_addons
  FOR DELETE TO authenticated USING (private.org_role_at_least(organization_id, 'manager'));