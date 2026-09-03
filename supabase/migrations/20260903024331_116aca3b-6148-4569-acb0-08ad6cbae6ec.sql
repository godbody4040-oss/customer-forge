create extension if not exists btree_gist;

alter table public.appointments
  add constraint appointments_no_overlap
  exclude using gist (
    organization_id with =,
    tstzrange(starts_at, ends_at) with &&
  ) where (status in ('pending','confirmed'));

-- ============================================================
-- Atomic public submission (lead + quote + appointment + activity + notification)
-- ============================================================
create or replace function public.submit_public_conversion(
  _organization_id uuid,
  _lead jsonb,
  _quote jsonb default null,
  _booking jsonb default null,
  _activity jsonb default null,
  _notification jsonb default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_service_id uuid := nullif(_lead->>'service_id','')::uuid;
  v_form_id uuid := nullif(_quote->>'form_id','')::uuid;
  v_lead_id uuid;
  v_appointment_id uuid := null;
  v_starts timestamptz;
  v_ends timestamptz;
  v_duration int;
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
    'duration_minutes', v_duration
  );
end;
$$;

revoke all on function public.submit_public_conversion(uuid, jsonb, jsonb, jsonb, jsonb, jsonb) from public, anon, authenticated;
grant execute on function public.submit_public_conversion(uuid, jsonb, jsonb, jsonb, jsonb, jsonb) to service_role;

-- ============================================================
-- Atomic exact website restore
-- ============================================================
create or replace function public.restore_website_state(
  _organization_id uuid,
  _snapshot jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_pages uuid[] := '{}';
  v_sections uuid[] := '{}';
  v_components uuid[] := '{}';
  v_page jsonb;
  v_section jsonb;
  v_component jsonb;
begin
  if _organization_id is null or _snapshot is null then
    raise exception 'SNAPSHOT_REQUIRED';
  end if;
  if (_snapshot->>'format') is distinct from '1' then
    raise exception 'UNSUPPORTED_SNAPSHOT';
  end if;
  if not exists (
    select 1 from public.memberships m
    where m.organization_id = _organization_id and m.user_id = auth.uid()
  ) then
    raise exception 'FORBIDDEN';
  end if;

  for v_page in select * from jsonb_array_elements(coalesce(_snapshot->'pages','[]'::jsonb)) loop
    v_pages := v_pages || (v_page->>'id')::uuid;

    insert into public.website_pages (
      id, organization_id, slug, title, kind, seo_title, seo_description,
      seo_canonical, og_title, og_description, og_image_url, noindex,
      sort_order, is_visible
    ) values (
      (v_page->>'id')::uuid, _organization_id, v_page->>'slug', v_page->>'title',
      coalesce(nullif(v_page->>'kind',''), 'custom'),
      v_page->>'seo_title', v_page->>'seo_description', v_page->>'seo_canonical',
      v_page->>'og_title', v_page->>'og_description', v_page->>'og_image_url',
      coalesce((v_page->>'noindex')::boolean, false),
      coalesce((v_page->>'sort_order')::int, 0),
      coalesce((v_page->>'is_visible')::boolean, true)
    )
    on conflict (id) do update set
      slug = excluded.slug, title = excluded.title, kind = excluded.kind,
      seo_title = excluded.seo_title, seo_description = excluded.seo_description,
      seo_canonical = excluded.seo_canonical, og_title = excluded.og_title,
      og_description = excluded.og_description, og_image_url = excluded.og_image_url,
      noindex = excluded.noindex, sort_order = excluded.sort_order,
      is_visible = excluded.is_visible
    where public.website_pages.organization_id = _organization_id;

    for v_section in select * from jsonb_array_elements(coalesce(v_page->'sections','[]'::jsonb)) loop
      v_sections := v_sections || (v_section->>'id')::uuid;

      insert into public.website_sections (
        id, organization_id, page_id, kind, variant, heading, subheading,
        body, settings, sort_order, is_visible
      ) values (
        (v_section->>'id')::uuid, _organization_id, (v_page->>'id')::uuid,
        coalesce(nullif(v_section->>'kind',''), 'text'),
        coalesce(nullif(v_section->>'variant',''), 'default'),
        v_section->>'heading', v_section->>'subheading', v_section->>'body',
        coalesce(v_section->'settings', '{}'::jsonb),
        coalesce((v_section->>'sort_order')::int, 0),
        coalesce((v_section->>'is_visible')::boolean, true)
      )
      on conflict (id) do update set
        page_id = excluded.page_id, kind = excluded.kind, variant = excluded.variant,
        heading = excluded.heading, subheading = excluded.subheading, body = excluded.body,
        settings = excluded.settings, sort_order = excluded.sort_order,
        is_visible = excluded.is_visible
      where public.website_sections.organization_id = _organization_id;

      for v_component in select * from jsonb_array_elements(coalesce(v_section->'components','[]'::jsonb)) loop
        v_components := v_components || (v_component->>'id')::uuid;

        insert into public.website_components (
          id, organization_id, section_id, kind, label, body, link_label,
          link_url, media_url, settings, sort_order, is_visible
        ) values (
          (v_component->>'id')::uuid, _organization_id, (v_section->>'id')::uuid,
          coalesce(nullif(v_component->>'kind',''), 'text'),
          v_component->>'label', v_component->>'body', v_component->>'link_label',
          v_component->>'link_url', v_component->>'media_url',
          coalesce(v_component->'settings', '{}'::jsonb),
          coalesce((v_component->>'sort_order')::int, 0),
          coalesce((v_component->>'is_visible')::boolean, true)
        )
        on conflict (id) do update set
          section_id = excluded.section_id, kind = excluded.kind, label = excluded.label,
          body = excluded.body, link_label = excluded.link_label,
          link_url = excluded.link_url, media_url = excluded.media_url,
          settings = excluded.settings, sort_order = excluded.sort_order,
          is_visible = excluded.is_visible
        where public.website_components.organization_id = _organization_id;
      end loop;
    end loop;
  end loop;

  delete from public.website_components
   where organization_id = _organization_id and not (id = any(v_components));
  delete from public.website_sections
   where organization_id = _organization_id and not (id = any(v_sections));
  delete from public.website_pages
   where organization_id = _organization_id and not (id = any(v_pages));

  return jsonb_build_object(
    'pages', coalesce(array_length(v_pages, 1), 0),
    'sections', coalesce(array_length(v_sections, 1), 0),
    'components', coalesce(array_length(v_components, 1), 0)
  );
end;
$$;

revoke all on function public.restore_website_state(uuid, jsonb) from public, anon;
grant execute on function public.restore_website_state(uuid, jsonb) to authenticated, service_role;