import { createFileRoute } from "@tanstack/react-router";
import { LoadingRows } from "@/components/app/Bits";
import { DomainCenter } from "@/components/app/DomainCenter";
import { DomainOperations } from "@/components/app/DomainOperations";
import { useBusinessProfile, useWebsiteSettings } from "@/lib/queries";
import { useWorkspace } from "@/lib/use-tenant";
import { canManage } from "@/lib/domain";

export const Route = createFileRoute("/_authenticated/app/domain")({
  head: () => ({
    meta: [
      { title: "Domain setup — Revora" },
      {
        name: "description",
        content: "Buy a new domain or connect one you already own, with live DNS and HTTPS verification.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: DomainPage,
});

function DomainPage() {
  const { data: ws } = useWorkspace();
  const org = ws?.workspace?.organization;
  const orgId = ws?.workspace?.organizationId;
  const settingsQuery = useWebsiteSettings(orgId);
  const profileQuery = useBusinessProfile(orgId);
  const profile = profileQuery.data as Record<string, unknown> | null | undefined;

  if (settingsQuery.isLoading) return <LoadingRows rows={5} />;

  return (
    <div className="space-y-6">
      <div>
        <p className="eyebrow">Domain</p>
        <h1 className="mt-1 font-display text-[24px] font-semibold">Your domain</h1>
        <p className="mt-1 max-w-2xl text-[13px] text-muted-foreground">
          Buy a new web address or connect one you already own. You can do all of it yourself — no support
          request needed.
        </p>
      </div>

      <DomainCenter
        organizationId={orgId}
        slug={org?.slug}
        businessName={org?.name ?? null}
        city={(profile?.["city"] as string) ?? null}
        industry={org?.industry ?? null}
        settings={settingsQuery.data}
        canManage={canManage(ws?.workspace?.role ?? "viewer")}
      />

      <DomainOperations
        organizationId={orgId}
        settings={settingsQuery.data}
        canManage={canManage(ws?.workspace?.role ?? "viewer")}
      />
    </div>
  );
}
