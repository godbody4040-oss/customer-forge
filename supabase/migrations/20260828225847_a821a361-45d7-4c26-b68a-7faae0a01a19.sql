-- Tenant-scoped access to the tenant-media bucket.
-- Object paths are always "<organization_id>/<filename>".

CREATE POLICY "tenant_media_member_read" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'tenant-media'
    AND private.is_org_member(((storage.foldername(name))[1])::uuid)
  );

CREATE POLICY "tenant_media_member_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'tenant-media'
    AND private.can_manage_org(((storage.foldername(name))[1])::uuid)
  );

CREATE POLICY "tenant_media_member_update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'tenant-media'
    AND private.can_manage_org(((storage.foldername(name))[1])::uuid)
  )
  WITH CHECK (
    bucket_id = 'tenant-media'
    AND private.can_manage_org(((storage.foldername(name))[1])::uuid)
  );

CREATE POLICY "tenant_media_member_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'tenant-media'
    AND private.can_manage_org(((storage.foldername(name))[1])::uuid)
  );