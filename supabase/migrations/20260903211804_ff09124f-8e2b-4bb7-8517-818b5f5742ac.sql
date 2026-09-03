-- The previous FOR ALL restrictive policy also covered SELECT, which would
-- have hidden invoices from the workspace users who own them.
DROP POLICY IF EXISTS invoices_no_member_write ON public.invoices;
DROP POLICY IF EXISTS invoices_member_read_only ON public.invoices;

CREATE POLICY invoices_no_insert ON public.invoices
AS RESTRICTIVE FOR INSERT TO anon, authenticated WITH CHECK (false);

CREATE POLICY invoices_no_update ON public.invoices
AS RESTRICTIVE FOR UPDATE TO anon, authenticated USING (false) WITH CHECK (false);

CREATE POLICY invoices_no_delete ON public.invoices
AS RESTRICTIVE FOR DELETE TO anon, authenticated USING (false);