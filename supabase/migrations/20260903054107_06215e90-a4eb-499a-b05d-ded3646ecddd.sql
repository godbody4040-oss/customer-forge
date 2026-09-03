DROP POLICY IF EXISTS analytics_public_insert ON public.analytics_events;

CREATE POLICY analytics_public_insert
ON public.analytics_events
FOR INSERT
TO anon
WITH CHECK (
  private.org_site_published(organization_id)
  AND event_type = ANY (ARRAY[
    'page_view','call_click','text_click','email_click',
    'quote_start','quote_complete','booking_start','form_submit'
  ])
  AND char_length(COALESCE(path, '')) <= 200
  AND char_length(COALESCE(source, '')) <= 60
  AND char_length(COALESCE(campaign, '')) <= 60
  AND char_length(COALESCE(device, '')) <= 20
  AND char_length(COALESCE(session_id, '')) <= 60
);