/**
 * Effect Studio — the visual "install anything" panel. Clients pick an animated
 * background for the whole site (starfield, aurora, nebula, grid, spotlight,
 * gradient mesh) and a 3D / motion treatment for any single section (float,
 * tilt, frosted glass, gold glow, rise-in, parallax, gold shine).
 *
 * Every option comes from the allowlisted catalog in `site-effects`, so the
 * builder can never store raw CSS or scripts on a client's published site.
 */
import { useWebsiteContent, useSaveSection } from "@/lib/website-content.hooks";
import {
  BACKDROPS,
  SECTION_EFFECTS,
  readSectionEffect,
  writeSectionEffect,
  type BackdropId,
  type SectionEffectId,
} from "@/lib/site-effects";
import { sectionLabel } from "@/lib/website-content";

export function EffectStudio({
  organizationId,
  canManage,
  backdrop,
  onBackdrop,
}: {
  organizationId: string;
  canManage: boolean;
  backdrop: BackdropId;
  onBackdrop: (backdrop: BackdropId) => void;
}) {
  const content = useWebsiteContent(organizationId);
  const saveSection = useSaveSection(organizationId);
  const pages = content.data ?? [];

  return (
    <section className="panel p-4">
      <p className="eyebrow text-gold">Effect studio</p>
      <h2 className="mt-1 font-display text-[18px] font-semibold">Install premium visuals</h2>
      <p className="mt-1 text-[12.5px] text-muted-foreground">
        Add an animated background to your whole site, then give individual sections depth. Everything below is
        tuned for speed and switches itself off for visitors who prefer less motion. You can also just ask the
        assistant — "put stars in the background and make my hero float in 3D".
      </p>

      <div className="mt-4">
        <p className="text-[12px] font-medium">Site background</p>
        <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {BACKDROPS.map((option) => {
            const active = option.id === backdrop;
            return (
              <button
                key={option.id}
                type="button"
                disabled={!canManage}
                onClick={() => onBackdrop(option.id)}
                className={`cursor-pointer rounded-md border p-3 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
                  active ? "border-gold/70 bg-gold/[0.07]" : "border-border hover:border-gold/40 hover:bg-elevated"
                }`}
              >
                <span className={`text-[13px] font-medium ${active ? "text-gold" : "text-foreground"}`}>
                  {option.label}
                </span>
                <span className="mt-0.5 block text-[11.5px] text-muted-foreground">{option.help}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-5 space-y-4">
        <p className="text-[12px] font-medium">Section effects</p>
        {pages.length === 0 ? (
          <p className="text-[12px] text-muted-foreground">
            Build your pages first — then every section can get its own effect.
          </p>
        ) : (
          pages.map((page) => (
            <div key={page.id} className="rounded-md border border-border p-3">
              <p className="text-[12.5px] font-medium">{page.title}</p>
              <div className="mt-2 space-y-2">
                {page.sections.length === 0 ? (
                  <p className="text-[11.5px] text-muted-foreground">No sections on this page yet.</p>
                ) : (
                  page.sections.map((section) => {
                    const current = readSectionEffect(section.settings);
                    return (
                      <div key={section.id} className="flex flex-wrap items-center justify-between gap-2">
                        <span className="text-[12px] text-muted-foreground">
                          {sectionLabel(section.kind)}
                          {section.heading ? ` — ${section.heading}` : ""}
                        </span>
                        <select
                          className="select-field h-9 rounded-md border border-border bg-background px-2.5 text-[12px]"
                          value={current}
                          disabled={!canManage || saveSection.isPending}
                          onChange={(event) =>
                            saveSection.mutate({
                              id: section.id,
                              patch: {
                                settings: writeSectionEffect(
                                  section.settings,
                                  event.target.value as SectionEffectId,
                                ),
                              },
                            })
                          }
                        >
                          {SECTION_EFFECTS.map((option) => (
                            <option key={option.id} value={option.id}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </section>
  );
}
