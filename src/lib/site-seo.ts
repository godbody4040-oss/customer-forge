/** Hero + search copy for a public business site, stored in website_settings.seo. */
export type SiteSeo = {
  headline?: string | null;
  subheadline?: string | null;
  meta_description?: string | null;
  primary_cta_label?: string | null;
};

export function readSeo(value: unknown): SiteSeo {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as SiteSeo;
}
