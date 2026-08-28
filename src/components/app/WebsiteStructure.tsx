import { useState } from "react";
import { ArrowDown, ArrowUp, Eye, EyeOff, Layers, Loader2, Plus, RefreshCw, Trash2 } from "lucide-react";
import { EmptyState, Panel, Pill, SectionHeading } from "@/components/app/Bits";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  useAddSection,
  useBuildWebsiteStructure,
  useDeleteSection,
  useMoveSection,
  useSaveSection,
  useWebsiteContent,
} from "@/lib/website-content.hooks";
import { SECTION_LIBRARY, sectionLabel, type ContentPage, type SectionKind } from "@/lib/website-content";
import { cn } from "@/lib/utils";

/**
 * Pages and sections editor. Everything shown here is built from the business
 * information already entered — the owner reorders, hides and rewords it.
 */
export function WebsiteStructure({
  organizationId,
  canManage,
}: {
  organizationId: string | undefined;
  canManage: boolean;
}) {
  const { data: pages, isLoading } = useWebsiteContent(organizationId);
  const build = useBuildWebsiteStructure(organizationId);
  const [activeSlug, setActiveSlug] = useState<string | null>(null);

  const list = pages ?? [];
  const page = list.find((p) => p.slug === (activeSlug ?? list[0]?.slug)) ?? null;

  return (
    <div className="space-y-4">
      <Panel className="p-5">
        <SectionHeading
          eyebrow="Structure"
          title="Your pages and sections"
          action={
            canManage ? (
              <Button variant="outline" onClick={() => build.mutate()} disabled={build.isPending}>
                {build.isPending ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <RefreshCw className="size-4" />
                )}
                {list.length ? "Rebuild from my info" : "Build my pages"}
              </Button>
            ) : null
          }
        />
        <p className="mt-2 max-w-2xl text-[13px] text-muted-foreground">
          Revora turns the details you entered into real pages and sections. Rebuilding pulls in your latest
          services, photos and written content — you never re-type anything.
        </p>

        {list.length ? (
          <div className="mt-4 flex flex-wrap gap-2">
            {list.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setActiveSlug(p.slug)}
                className={cn(
                  "cursor-pointer rounded-md border px-3 py-1.5 text-[13px] transition-colors",
                  page?.id === p.id ? "border-primary bg-primary/5" : "border-border hover:bg-elevated",
                )}
              >
                {p.title}
                <span className="ml-2 text-[11px] text-muted-foreground">{p.sections.length}</span>
              </button>
            ))}
          </div>
        ) : null}
      </Panel>

      {isLoading ? null : !list.length ? (
        <EmptyState
          icon={<Layers className="size-5" />}
          title="No pages yet"
          description="Build your pages and Revora will lay out a home, services, about and contact page from your business information."
          action={
            canManage ? (
              <Button variant="signal" onClick={() => build.mutate()} disabled={build.isPending}>
                Build my pages
              </Button>
            ) : null
          }
        />
      ) : page ? (
        <PageSections page={page} organizationId={organizationId} canManage={canManage} />
      ) : null}
    </div>
  );
}

function PageSections({
  page,
  organizationId,
  canManage,
}: {
  page: ContentPage;
  organizationId: string | undefined;
  canManage: boolean;
}) {
  const saveSection = useSaveSection(organizationId);
  const moveSection = useMoveSection(organizationId);
  const addSection = useAddSection(organizationId);
  const deleteSection = useDeleteSection(organizationId);
  const [adding, setAdding] = useState(false);

  const sections = [...page.sections].sort((a, b) => a.sort_order - b.sort_order);

  return (
    <div className="space-y-3">
      {sections.map((section, index) => (
        <Panel key={section.id} className="p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Pill tone={section.is_visible ? "signal" : "neutral"}>{sectionLabel(section.kind)}</Pill>
              {section.components.length ? (
                <span className="text-[11px] text-muted-foreground">
                  {section.components.length} item{section.components.length === 1 ? "" : "s"} from your data
                </span>
              ) : null}
            </div>
            {canManage ? (
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={section.is_visible ? "Hide section" : "Show section"}
                  onClick={() =>
                    saveSection.mutate({ id: section.id, patch: { is_visible: !section.is_visible } })
                  }
                >
                  {section.is_visible ? <Eye className="size-4" /> : <EyeOff className="size-4" />}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Move section up"
                  disabled={index === 0}
                  onClick={() => {
                    const previous = sections[index - 1];
                    if (previous)
                      moveSection.mutate({
                        a: { id: section.id, sort_order: section.sort_order },
                        b: { id: previous.id, sort_order: previous.sort_order },
                      });
                  }}
                >
                  <ArrowUp className="size-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Move section down"
                  disabled={index === sections.length - 1}
                  onClick={() => {
                    const next = sections[index + 1];
                    if (next)
                      moveSection.mutate({
                        a: { id: section.id, sort_order: section.sort_order },
                        b: { id: next.id, sort_order: next.sort_order },
                      });
                  }}
                >
                  <ArrowDown className="size-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Remove section"
                  onClick={() => deleteSection.mutate(section.id)}
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            ) : null}
          </div>

          <form
            className="mt-3 grid gap-3"
            onSubmit={(event) => {
              event.preventDefault();
              const form = new FormData(event.currentTarget);
              saveSection.mutate({
                id: section.id,
                patch: {
                  heading: String(form.get("heading") ?? "") || null,
                  subheading: String(form.get("subheading") ?? "") || null,
                  body: String(form.get("body") ?? "") || null,
                },
              });
            }}
          >
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor={`h-${section.id}`}>Heading</Label>
                <Input
                  id={`h-${section.id}`}
                  name="heading"
                  defaultValue={section.heading ?? ""}
                  disabled={!canManage}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor={`s-${section.id}`}>Supporting line</Label>
                <Input
                  id={`s-${section.id}`}
                  name="subheading"
                  defaultValue={section.subheading ?? ""}
                  disabled={!canManage}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor={`b-${section.id}`}>Text</Label>
              <Textarea
                id={`b-${section.id}`}
                name="body"
                rows={3}
                defaultValue={section.body ?? ""}
                disabled={!canManage}
              />
            </div>
            {canManage ? (
              <div>
                <Button type="submit" variant="outline" disabled={saveSection.isPending}>
                  Save section
                </Button>
              </div>
            ) : null}
          </form>
        </Panel>
      ))}

      {canManage ? (
        <Panel className="p-4">
          {adding ? (
            <div className="grid gap-2 sm:grid-cols-2">
              {SECTION_LIBRARY.map((item) => (
                <button
                  key={item.kind}
                  type="button"
                  className="cursor-pointer rounded-md border border-border p-3 text-left transition-colors hover:bg-elevated"
                  onClick={() => {
                    addSection.mutate({
                      pageId: page.id,
                      kind: item.kind as SectionKind,
                      sortOrder: sections.length,
                    });
                    setAdding(false);
                  }}
                >
                  <p className="text-[13px] font-medium">{item.label}</p>
                  <p className="mt-1 text-[12px] text-muted-foreground">{item.help}</p>
                </button>
              ))}
            </div>
          ) : (
            <Button variant="outline" onClick={() => setAdding(true)}>
              <Plus className="size-4" /> Add a section to {page.title}
            </Button>
          )}
        </Panel>
      ) : null}
    </div>
  );
}
