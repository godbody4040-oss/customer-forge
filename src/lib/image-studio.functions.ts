/**
 * Authenticated AI Image Studio endpoints.
 *
 * Every call runs through the caller's own Supabase client, so one workspace can
 * never generate into — or read from — another workspace's media folder.
 */

import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { MEDIA_BUCKET, buildObjectPath } from "@/lib/media";
import { decodeBase64, generateImageBase64 } from "@/lib/image-studio.server";

export type StudioImageResult = {
  ok: boolean;
  blocked?: boolean;
  message?: string;
  /** Storage object path, ready to store on a section or profile field. */
  path?: string;
  /** Short-lived preview URL. */
  preview?: string;
  mediaId?: string;
};

export const generateStudioImage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => {
    const input = (data ?? {}) as Record<string, unknown>;
    const organizationId = String(input["organizationId"] ?? "");
    if (!/^[0-9a-f-]{36}$/i.test(organizationId)) throw new Error("Invalid workspace");
    const prompt = String(input["prompt"] ?? "").trim().slice(0, 4000);
    if (prompt.length < 20) throw new Error("Image brief is too short");
    return {
      organizationId,
      prompt,
      altText: String(input["altText"] ?? "").trim().slice(0, 200),
      category: String(input["category"] ?? "other").slice(0, 40),
      label: String(input["label"] ?? "revora-image").slice(0, 60),
    };
  })
  .handler(async ({ data, context }): Promise<StudioImageResult> => {
    const supabase = context.supabase;

    const { data: membership, error: memberError } = await supabase
      .from("memberships")
      .select("role")
      .eq("organization_id", data.organizationId)
      .eq("user_id", context.userId)
      .maybeSingle();
    if (memberError) return { ok: false, message: "Couldn't verify workspace access." };
    if (!membership || !["owner", "admin", "editor"].includes(String(membership.role))) {
      return { ok: false, message: "You don't have permission to add photos to this website." };
    }

    const image = await generateImageBase64(data.prompt);
    if (!image.ok) return { ok: false, blocked: image.blocked, message: image.message };

    const bytes = decodeBase64(image.base64);
    const path = buildObjectPath(data.organizationId, `${data.label || "revora-image"}.png`);

    const { error: uploadError } = await supabase.storage
      .from(MEDIA_BUCKET)
      .upload(path, bytes, { contentType: "image/png", upsert: false });
    if (uploadError) return { ok: false, message: uploadError.message };

    const { data: row, error: rowError } = await supabase
      .from("media")
      .insert({
        organization_id: data.organizationId,
        url: path,
        category: data.category,
        file_name: `${data.label || "revora-image"}.png`,
        size_bytes: bytes.byteLength,
        alt_text: data.altText || null,
      } as never)
      .select("id")
      .maybeSingle();
    if (rowError) {
      await supabase.storage.from(MEDIA_BUCKET).remove([path]);
      return { ok: false, message: rowError.message };
    }

    const { data: signed } = await supabase.storage.from(MEDIA_BUCKET).createSignedUrl(path, 60 * 60);

    return {
      ok: true,
      path,
      preview: signed?.signedUrl ?? path,
      ...(row?.id ? { mediaId: String(row.id) } : {}),
    };
  });
