CREATE OR REPLACE FUNCTION public.submit_public_conversion(_organization_id uuid, _lead jsonb, _quote jsonb DEFAULT NULL::jsonb, _booking jsonb DEFAULT NULL::jsonb, _activity jsonb DEFAULT NULL::jsonb, _notification jsonb DEFAULT NULL::jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
declare
  v_service_id uuid := nullif(_lead->>'service_id','')::uuid;
  v_form_id uuid := nullif(_quote->>'form_id','')::uuid;
  v_lead_id uuid;
  v_appointment_id uuid := null;
  v_starts timestamptz;
  v_ends timestamptz;
  v_duration int;
  v_email text := lower(nullif(_lead->>'email',''));
  v_phone text := regexp_replace(coalesce(_lead->>'phone',''), '[^0-9]', '', 'g');
  v_identity text;
  v_recent int;
begin
  if _organization_id is null then
    raise exception 'ORG_REQUIRED';
  end if;

  -- Never trust client supplied ids: they must belong to this business.
  if v_service_id is not null then
    if not exists (
      select 1 from public.services
      where id = v_service_id and organization_id = _organization_id
    ) then
      raise exception 'INVALID_SERVICE';
    end if;
  end if;

  if v_form_id is not null then
    if not exists (
      select 1 from public.quote_forms
      where id = v_form_id and organization_id = _organization_id
    ) then
      raise exception 'INVALID_QUOTE_FORM';
    end if;
  end if;

  -- One submitter at a time per business+contact, so a double-clicked form or
  -- two parallel requests can never race past the duplicate check below.
  v_identity := _organization_id::text || '|' || coalesce(nullif(v_email,''), nullif(v_phone,''), lower(coalesce(_lead->>'name','')));
  perform pg_advisory_xact_lock(hashtextextended(v_identity, 42));

  -- Idempotency: the exact same request from the same contact within three
  -- minutes is treated as the same submission, not a second lead.
  select l.id into v_lead_id
  from public.leads l
  where l.organization_id = _organization_id
    and l.created_at > now() - interval '3 minutes'
    and coalesce(lower(l.email),'') = coalesce(v_email,'')
    and regexp_replace(coalesce(l.phone,''), '[^0-9]', '', 'g') = v_phone
    and lower(coalesce(l.name,'')) = lower(coalesce(_lead->>'name',''))
    and coalesce(l.message,'') = coalesce(nullif(_lead->>'message',''),'')
    and coalesce(l.service_id::text,'') = coalesce(v_service_id::text,'')
  order by l.created_at desc
  limit 1;

  if v_lead_id is not null then
    return jsonb_build_object(
      'lead_id', v_lead_id,
      'appointment_id', (
        select a.id from public.appointments a
        where a.lead_id = v_lead_id order by a.created_at desc limit 1
      ),
      'duration_minutes', null,
      'duplicate', true
    );
  end if;

  -- Abuse guard: a single contact may not flood a business with submissions.
  select count(*) into v_recent
  from public.leads l
  where l.organization_id = _organization_id
    and l.created_at > now() - interval '10 minutes'
    and (
      (v_email is not null and lower(coalesce(l.email,'')) = v_email)
      or (v_phone <> '' and regexp_replace(coalesce(l.phone,''), '[^0-9]', '', 'g') = v_phone)
    );
  if v_recent >= 6 then
    raise exception 'RATE_LIMITED';
  end if;

  insert into public.leads (
    organization_id, name, email, phone, service_id, service_interest,
    message, city, source, campaign, status, estimated_value
  ) values (
    _organization_id,
    _lead->>'name',
    nullif(_lead->>'email',''),
    nullif(_lead->>'phone',''),
    v_service_id,
    nullif(_lead->>'service_interest',''),
    nullif(_lead->>'message',''),
    nullif(_lead->>'city',''),
    coalesce(nullif(_lead->>'source',''), 'website'),
    nullif(_lead->>'campaign',''),
    coalesce(nullif(_lead->>'status',''), 'new')::lead_status,
    coalesce((_lead->>'estimated_value')::numeric, 0)
  )
  returning id into v_lead_id;

  if _quote is not null then
    insert into public.quote_requests (
      organization_id, form_id, lead_id, answers, estimate_min, estimate_max
    ) values (
      _organization_id,
      v_form_id,
      v_lead_id,
      coalesce(_quote->'answers', '[]'::jsonb),
      coalesce((_quote->>'estimate_min')::numeric, 0),
      coalesce((_quote->>'estimate_max')::numeric, 0)
    );
  end if;

  if _booking is not null then
    v_starts := (_booking->>'starts_at')::timestamptz;
    v_duration := greatest(5, least(1440, coalesce((_booking->>'duration_minutes')::int, 60)));

    -- Server side duration wins when the service defines one.
    if v_service_id is not null then
      select greatest(5, least(1440, coalesce(s.duration_minutes, v_duration)))
        into v_duration
      from public.services s
      where s.id = v_service_id;
    end if;

    v_ends := v_starts + make_interval(mins => v_duration);

    if v_starts is null then
      raise exception 'INVALID_TIME';
    end if;
    if v_starts < now() - interval '5 minutes' then
      raise exception 'TIME_IN_PAST';
    end if;

    -- Serialise concurrent booking attempts for this business, then check.
    perform pg_advisory_xact_lock(hashtextextended(_organization_id::text, 0));
    if exists (
      select 1 from public.appointments a
      where a.organization_id = _organization_id
        and a.status in ('pending','confirmed')
        and tstzrange(a.starts_at, a.ends_at) && tstzrange(v_starts, v_ends)
    ) then
      raise exception 'BOOKING_CONFLICT';
    end if;

    insert into public.appointments (
      organization_id, lead_id, service_id, name, email, phone,
      starts_at, ends_at, status, notes
    ) values (
      _organization_id,
      v_lead_id,
      v_service_id,
      _lead->>'name',
      nullif(_lead->>'email',''),
      nullif(_lead->>'phone',''),
      v_starts,
      v_ends,
      'pending',
      nullif(_lead->>'message','')
    )
    returning id into v_appointment_id;
  end if;

  if _activity is not null then
    insert into public.lead_activities (
      organization_id, lead_id, appointment_id, kind, body, metadata
    ) values (
      _organization_id,
      v_lead_id,
      v_appointment_id,
      coalesce(nullif(_activity->>'kind',''), 'form_submission'),
      nullif(_activity->>'body',''),
      coalesce(_activity->'metadata', '{}'::jsonb)
    );
  end if;

  if _notification is not null then
    insert into public.notifications (organization_id, title, body, kind, link)
    values (
      _organization_id,
      coalesce(nullif(_notification->>'title',''), 'New lead'),
      nullif(_notification->>'body',''),
      coalesce(nullif(_notification->>'kind',''), 'lead'),
      nullif(_notification->>'link','')
    );
  end if;

  return jsonb_build_object(
    'lead_id', v_lead_id,
    'appointment_id', v_appointment_id,
    'duration_minutes', v_duration,
    'duplicate', false
  );
end;
$function$;

CREATE INDEX IF NOT EXISTS leads_org_recent_idx ON public.leads (organization_id, created_at DESC);