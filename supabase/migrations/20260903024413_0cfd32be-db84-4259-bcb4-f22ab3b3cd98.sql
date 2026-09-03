alter extension btree_gist set schema extensions;

create or replace function public.restore_website_state(
  _organization_id uuid,
  _snapshot jsonb
)
returns jsonb
language plpgsql
security invoker
set search_path = public, extensions
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

alter function public.submit_public_conversion(uuid, jsonb, jsonb, jsonb, jsonb, jsonb)
  set search_path = public, extensions;