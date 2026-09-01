/**
 * Visual builder canvas.
 *
 * A live, click-to-edit view of the selected page: sections render as the
 * visitor will see them (heading / subheading / body / items), clicking any
 * element selects it, text is edited inline in place, and the right-side
 * inspector exposes the rest of that element's settings. A device switcher
 * renders the same canvas at phone, tablet and desktop widths.
 *
 * Everything writes through the existing content mutations, so undo/redo,
 * autosave invalidation and link-safety rules all still apply.
 */
import * as React from "react";
import { ArrowDown, ArrowUp, Eye, EyeOff, Monitor, Smartphone, Tablet, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  sectionLabel,
  type ContentComponent,
  type ContentPage,
  type ContentSection,
} from "@/lib/website-content";
import {
  useDeleteSection,
  useMoveSection,
  useSaveComponent,
  useSaveSection,
} from "@/lib/website-content.hooks";
import { cn } from "@/lib/utils";
import {
  ALIGNMENTS,
  BUTTON_SIZES,
  BUTTON_STYLES,
  FONT_FAMILIES,
  FONT_WEIGHTS,
  LAYOUTS,
  LAYOUT_CLASS,
  LINE_HEIGHTS,
  OBJECT_FITS,
  SPACING,
  TEXT_SIZES,
  blockCss,
  buttonClasses,
  buttonCss,
  paddingClass,
  readBlockStyle,
  textClasses,
  writeBlockStyle,
  type BlockStyle,
} from "@/lib/site-style";

type Device = "mobile" | "tablet" | "desktop";

const DEVICES: { key: Device; label: string; width: number; icon: typeof Monitor }[] = [
  { key: "mobile", label: "Phone", width: 390, icon: Smartphone },
  { key: "tablet", label: "Tablet", width: 768, icon: Tablet },
  { key: "desktop", label: "Desktop", width: 1180, icon: Monitor },
];

type Selection =
  | { type: "section"; sectionId: string }
  | { type: "component"; sectionId: string; componentId: string }
  | null;

/** contentEditable text that saves on blur and never injects markup. */
function InlineText({
  value,
  placeholder,
  className,
  editable,
  onCommit,
}: {
  value: string;
  placeholder: string;
  className?: string;
  editable: boolean;
  onCommit: (next: string) => void;
}) {
  const ref = React.useRef<HTMLSpanElement>(null);

  // Keep the DOM in sync with saved data without fighting the caret while typing.
  React.useEffect(() => {
    if (ref.current && ref.current.textContent !== value) ref.current.textContent = value;
  }, [value]);

  return (
    <span
      ref={ref}
      role={editable ? "textbox" : undefined}
      tabIndex={editable ? 0 : -1}
      contentEditable={editable}
      suppressContentEditableWarning
      data-placeholder={placeholder}
      className={cn(
        "block rounded outline-none",
        editable &&
          "cursor-text hover:bg-primary/5 focus:ring-1 focus:ring-primary/50 focus-visible:ring-1",
        !value && "text-muted-foreground/60 before:content-[attr(data-placeholder)]",
        className,
      )}
      onBlur={(event) => {
        const next = (event.currentTarget.textContent ?? "").replace(/\s+/g, " ").trim();
        if (next !== value) onCommit(next);
      }}
      onKeyDown={(event) => {
        if (event.key === "Enter" && !event.shiftKey) {
          event.preventDefault();
          (event.currentTarget as HTMLElement).blur();
        }
        if (event.key === "Escape") {
          if (ref.current) ref.current.textContent = value;
          (event.currentTarget as HTMLElement).blur();
        }
      }}
    />
  );
}

function ItemCard({
  item,
  selected,
  editable,
  onSelect,
  onCommit,
}: {
  item: ContentComponent;
  selected: boolean;
  editable: boolean;
  onSelect: () => void;
  onCommit: (patch: Record<string, unknown>) => void;
}) {
  const style = readBlockStyle(item.settings);
  return (
    <div
      style={blockCss(style)}
      role="button"
      tabIndex={0}
      onClick={(event) => {
        event.stopPropagation();
        onSelect();
      }}
      onKeyDown={(event) => {
        if (event.key === "Enter") onSelect();
      }}
      className={cn(
        "rounded-lg border p-3 text-left transition-colors",
        selected ? "border-primary bg-primary/5" : "border-border/70 hover:border-primary/40",
        !item.is_visible && "opacity-50",
      )}
    >
      {item.media_url ? (
        <img
          src={item.media_url}
          alt={typeof item.settings?.["alt"] === "string" ? String(item.settings["alt"]) : ""}
          loading="lazy"
          className="mb-2 h-28 w-full rounded-md"
          style={{ objectFit: style.objectFit }}
        />
      ) : null}
      <InlineText
        value={item.label ?? ""}
        placeholder="Item title"
        editable={editable}
        className={cn("font-medium", textClasses(style))}
        onCommit={(label) => onCommit({ label })}
      />
      <InlineText
        value={item.body ?? ""}
        placeholder="Short description"
        editable={editable}
        className="mt-1 text-[12px] leading-relaxed text-muted-foreground"
        onCommit={(body) => onCommit({ body })}
      />
      {item.link_label ? (
        <span className={cn("mt-2", buttonClasses(style))} style={buttonCss(style)}>
          {item.link_label}
        </span>
      ) : null}
    </div>
  );
}

export function BuilderCanvas({
  organizationId,
  pages,
  canManage,
}: {
  organizationId: string | undefined;
  pages: ContentPage[];
  canManage: boolean;
}) {
  const [pageId, setPageId] = React.useState<string | null>(null);
  const [device, setDevice] = React.useState<Device>("desktop");
  const [selection, setSelection] = React.useState<Selection>(null);

  const saveSection = useSaveSection(organizationId);
  const saveComponent = useSaveComponent(organizationId);
  const moveSection = useMoveSection(organizationId);
  const deleteSection = useDeleteSection(organizationId);

  const ordered = React.useMemo(
    () => [...pages].sort((a, b) => a.sort_order - b.sort_order),
    [pages],
  );
  const page = ordered.find((p) => p.id === pageId) ?? ordered[0] ?? null;
  const sections = React.useMemo(
    () => (page ? [...page.sections].sort((a, b) => a.sort_order - b.sort_order) : []),
    [page],
  );

  const selectedSection: ContentSection | null = selection
    ? (sections.find((s) => s.id === selection.sectionId) ?? null)
    : null;
  const selectedComponent: ContentComponent | null =
    selection?.type === "component" && selectedSection
      ? (selectedSection.components.find((c) => c.id === selection.componentId) ?? null)
      : null;

  if (!page) {
    return (
      <section className="panel p-5">
        <p className="text-[13px] font-medium">Nothing to edit yet</p>
        <p className="mt-1 text-[12px] text-muted-foreground">
          Build your pages first — then this canvas lets you click any headline, paragraph or card
          and edit it in place.
        </p>
      </section>
    );
  }

  const width = DEVICES.find((d) => d.key === device)!.width;

  const move = (index: number, direction: -1 | 1) => {
    const a = sections[index];
    const b = sections[index + direction];
    if (!a || !b) return;
    moveSection.mutate({
      a: { id: a.id, sort_order: a.sort_order },
      b: { id: b.id, sort_order: b.sort_order },
    });
  };

  return (
    <section className="panel overflow-hidden p-0">
      <header className="flex flex-wrap items-center gap-2 border-b border-border p-3">
        <select
          aria-label="Page to edit"
          value={page.id}
          onChange={(event) => {
            setPageId(event.target.value);
            setSelection(null);
          }}
          className="h-8 rounded-md border border-border bg-background px-2 text-[12px]"
        >
          {ordered.map((option) => (
            <option key={option.id} value={option.id}>
              {option.title} (/{option.slug})
            </option>
          ))}
        </select>

        <div className="ml-auto flex items-center gap-1">
          {DEVICES.map((option) => (
            <button
              key={option.key}
              type="button"
              onClick={() => setDevice(option.key)}
              aria-pressed={device === option.key}
              title={`${option.label} preview`}
              className={cn(
                "grid size-8 place-items-center rounded-md border transition-colors",
                device === option.key
                  ? "border-primary text-primary"
                  : "border-border text-muted-foreground hover:text-foreground",
              )}
            >
              <option.icon className="size-4" aria-hidden />
            </button>
          ))}
        </div>
      </header>

      <div className="grid gap-0 lg:grid-cols-[1fr_300px]">
        {/* Canvas */}
        <div
          className="max-h-[70vh] overflow-auto bg-background/40 p-4"
          onClick={() => setSelection(null)}
        >
          <div
            className="mx-auto space-y-3 transition-[max-width]"
            style={{ maxWidth: `${width}px` }}
          >
            {sections.length === 0 ? (
              <p className="text-[12px] text-muted-foreground">
                This page has no sections yet. Add sections in Pages &amp; content.
              </p>
            ) : null}

            {sections.map((section, index) => {
              const isSelected = selection?.sectionId === section.id;
              return (
                <div
                  key={section.id}
                  role="button"
                  tabIndex={0}
                  onClick={(event) => {
                    event.stopPropagation();
                    setSelection({ type: "section", sectionId: section.id });
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Enter")
                      setSelection({ type: "section", sectionId: section.id });
                  }}
                  style={blockCss(readBlockStyle(section.settings))}
                  className={cn(
                    "rounded-xl border bg-card text-left transition-colors",
                    paddingClass(readBlockStyle(section.settings)),
                    isSelected
                      ? "border-primary ring-1 ring-primary/40"
                      : "border-border hover:border-primary/40",
                    !section.is_visible && "opacity-50",
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] tracking-wide text-muted-foreground uppercase">
                      {sectionLabel(section.kind)}
                    </span>
                    {!section.is_visible ? (
                      <span className="text-[11px] text-muted-foreground">Hidden</span>
                    ) : null}
                  </div>

                  <InlineText
                    value={section.heading ?? ""}
                    placeholder="Add a headline"
                    editable={canManage}
                    className={cn(
                      "mt-2 font-display text-[18px] leading-snug font-semibold",
                      textClasses(readBlockStyle(section.settings)),
                    )}
                    onCommit={(heading) =>
                      saveSection.mutate({ id: section.id, patch: { heading } })
                    }
                  />
                  <InlineText
                    value={section.subheading ?? ""}
                    placeholder="Add a supporting line"
                    editable={canManage}
                    className="mt-1.5 text-[13px] text-muted-foreground"
                    onCommit={(subheading) =>
                      saveSection.mutate({ id: section.id, patch: { subheading } })
                    }
                  />
                  <InlineText
                    value={section.body ?? ""}
                    placeholder="Add body text"
                    editable={canManage}
                    className="mt-2 text-[13px] leading-relaxed"
                    onCommit={(body) => saveSection.mutate({ id: section.id, patch: { body } })}
                  />

                  {section.components.length ? (
                    <div
                      className={cn(
                        "mt-3 grid gap-2",
                        device === "mobile"
                          ? "grid-cols-1"
                          : LAYOUT_CLASS[readBlockStyle(section.settings).layout] ||
                              "sm:grid-cols-2",
                      )}
                    >
                      {[...section.components]
                        .sort((a, b) => a.sort_order - b.sort_order)
                        .map((item) => (
                          <ItemCard
                            key={item.id}
                            item={item}
                            editable={canManage}
                            selected={selection?.type === "component" && selection.componentId === item.id}
                            onSelect={() =>
                              setSelection({
                                type: "component",
                                sectionId: section.id,
                                componentId: item.id,
                              })
                            }
                            onCommit={(patch) => saveComponent.mutate({ id: item.id, patch })}
                          />
                        ))}
                    </div>
                  ) : null}

                  {isSelected && canManage ? (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={index === 0}
                        onClick={(event) => {
                          event.stopPropagation();
                          move(index, -1);
                        }}
                      >
                        <ArrowUp className="size-3.5" aria-hidden />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={index === sections.length - 1}
                        onClick={(event) => {
                          event.stopPropagation();
                          move(index, 1);
                        }}
                      >
                        <ArrowDown className="size-3.5" aria-hidden />
                      </Button>
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>

        {/* Inspector */}
        <aside className="border-t border-border bg-card/40 p-4 lg:border-t-0 lg:border-l">
          {!selectedSection ? (
            <>
              <p className="text-[13px] font-medium">Nothing selected</p>
              <p className="mt-1 text-[12px] leading-relaxed text-muted-foreground">
                Click any section or card on the canvas. Text edits happen right in place; the rest
                of its settings appear here.
              </p>
            </>
          ) : selectedComponent ? (
            <div className="space-y-3">
              <div>
                <p className="text-[13px] font-medium">Item settings</p>
                <p className="mt-0.5 text-[12px] text-muted-foreground">
                  In {sectionLabel(selectedSection.kind)}
                </p>
              </div>
              <Field label="Button / link text">
                <Input
                  defaultValue={selectedComponent.link_label ?? ""}
                  disabled={!canManage}
                  onBlur={(event) =>
                    event.target.value !== (selectedComponent.link_label ?? "") &&
                    saveComponent.mutate({
                      id: selectedComponent.id,
                      patch: { link_label: event.target.value.trim() || null },
                    })
                  }
                />
              </Field>
              <Field label="Link target" hint="A page like /contact, a full https link, tel: or mailto:">
                <Input
                  defaultValue={selectedComponent.link_url ?? ""}
                  disabled={!canManage}
                  onBlur={(event) =>
                    event.target.value !== (selectedComponent.link_url ?? "") &&
                    saveComponent.mutate({
                      id: selectedComponent.id,
                      patch: { link_url: event.target.value.trim() || null },
                    })
                  }
                />
              </Field>
              <Field label="Image URL" hint="An https image link, or leave empty for no image">
                <Input
                  key={`m-${selectedComponent.id}`}
                  defaultValue={selectedComponent.media_url ?? ""}
                  disabled={!canManage}
                  onBlur={(event) =>
                    event.target.value !== (selectedComponent.media_url ?? "") &&
                    saveComponent.mutate({
                      id: selectedComponent.id,
                      patch: { media_url: event.target.value.trim() || null },
                    })
                  }
                />
              </Field>
              <Field label="Image description (alt text)">
                <Input
                  key={`alt-${selectedComponent.id}`}
                  defaultValue={
                    typeof selectedComponent.settings?.["alt"] === "string"
                      ? String(selectedComponent.settings["alt"])
                      : ""
                  }
                  disabled={!canManage}
                  onBlur={(event) =>
                    saveComponent.mutate({
                      id: selectedComponent.id,
                      patch: {
                        settings: {
                          ...(selectedComponent.settings ?? {}),
                          alt: event.target.value.trim().slice(0, 160),
                        },
                      },
                    })
                  }
                />
              </Field>
              <StyleControls
                scope="component"
                style={readBlockStyle(selectedComponent.settings)}
                disabled={!canManage}
                onChange={(patch) =>
                  saveComponent.mutate({
                    id: selectedComponent.id,
                    patch: { settings: writeBlockStyle(selectedComponent.settings, patch) },
                  })
                }
              />
              <Button
                size="sm"
                variant="outline"
                disabled={!canManage}
                onClick={() =>
                  saveComponent.mutate({
                    id: selectedComponent.id,
                    patch: { is_visible: !selectedComponent.is_visible },
                  })
                }
              >
                {selectedComponent.is_visible ? (
                  <>
                    <EyeOff className="mr-1.5 size-3.5" aria-hidden /> Hide item
                  </>
                ) : (
                  <>
                    <Eye className="mr-1.5 size-3.5" aria-hidden /> Show item
                  </>
                )}
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              <div>
                <p className="text-[13px] font-medium">
                  {sectionLabel(selectedSection.kind)} settings
                </p>
                <p className="mt-0.5 text-[12px] text-muted-foreground">
                  On {page.title} (/{page.slug})
                </p>
              </div>
              <Field label="Headline">
                <Input
                  key={`h-${selectedSection.id}-${selectedSection.heading ?? ""}`}
                  defaultValue={selectedSection.heading ?? ""}
                  disabled={!canManage}
                  onBlur={(event) =>
                    event.target.value !== (selectedSection.heading ?? "") &&
                    saveSection.mutate({
                      id: selectedSection.id,
                      patch: { heading: event.target.value.trim() || null },
                    })
                  }
                />
              </Field>
              <Field label="Body text">
                <Textarea
                  key={`b-${selectedSection.id}-${selectedSection.body ?? ""}`}
                  rows={4}
                  defaultValue={selectedSection.body ?? ""}
                  disabled={!canManage}
                  onBlur={(event) =>
                    event.target.value !== (selectedSection.body ?? "") &&
                    saveSection.mutate({
                      id: selectedSection.id,
                      patch: { body: event.target.value.trim() || null },
                    })
                  }
                />
              </Field>
              <StyleControls
                scope="section"
                style={readBlockStyle(selectedSection.settings)}
                disabled={!canManage}
                onChange={(patch) =>
                  saveSection.mutate({
                    id: selectedSection.id,
                    patch: { settings: writeBlockStyle(selectedSection.settings, patch) },
                  })
                }
              />
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={!canManage}
                  onClick={() =>
                    saveSection.mutate({
                      id: selectedSection.id,
                      patch: { is_visible: !selectedSection.is_visible },
                    })
                  }
                >
                  {selectedSection.is_visible ? (
                    <>
                      <EyeOff className="mr-1.5 size-3.5" aria-hidden /> Hide
                    </>
                  ) : (
                    <>
                      <Eye className="mr-1.5 size-3.5" aria-hidden /> Show
                    </>
                  )}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={!canManage}
                  onClick={() => {
                    if (!window.confirm("Remove this section from the page?")) return;
                    deleteSection.mutate(selectedSection.id);
                    setSelection(null);
                  }}
                >
                  <Trash2 className="mr-1.5 size-3.5" aria-hidden /> Remove
                </Button>
              </div>
            </div>
          )}
        </aside>
      </div>
    </section>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="text-[12px] text-muted-foreground">{label}</span>
      <span className="mt-1 block">{children}</span>
      {hint ? <span className="mt-1 block text-[11px] text-muted-foreground">{hint}</span> : null}
    </label>
  );
}

/** Closed-list visual controls. Every option maps to a validated style value. */
function StyleControls({
  scope,
  style,
  disabled,
  onChange,
}: {
  scope: "section" | "component";
  style: BlockStyle;
  disabled: boolean;
  onChange: (patch: Partial<BlockStyle>) => void;
}) {
  const select = <K extends keyof BlockStyle>(
    label: string,
    key: K,
    options: readonly string[],
  ) => (
    <Field label={label} key={String(key)}>
      <select
        className="h-9 w-full rounded-md border border-border bg-background px-2 text-[13px]"
        value={String(style[key] ?? "")}
        disabled={disabled}
        onChange={(event) => onChange({ [key]: event.target.value } as Partial<BlockStyle>)}
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </Field>
  );

  const color = (label: string, key: "textColor" | "bgColor" | "buttonTextColor" | "buttonBgColor") => (
    <Field label={label} key={key}>
      <span className="flex items-center gap-2">
        <input
          type="color"
          className="h-9 w-12 rounded-md border border-border bg-background"
          value={style[key] ?? "#000000"}
          disabled={disabled}
          onChange={(event) => onChange({ [key]: event.target.value } as Partial<BlockStyle>)}
          aria-label={label}
        />
        <Button
          size="sm"
          variant="ghost"
          disabled={disabled || !style[key]}
          onClick={() => onChange({ [key]: null } as Partial<BlockStyle>)}
        >
          Clear
        </Button>
      </span>
    </Field>
  );

  return (
    <div className="space-y-3 border-t border-border pt-3">
      <p className="text-[12px] font-medium">Design</p>
      <div className="grid grid-cols-2 gap-2">
        {select("Font", "font", FONT_FAMILIES)}
        {select("Text size", "size", TEXT_SIZES)}
        {select("Weight", "weight", FONT_WEIGHTS)}
        {select("Alignment", "align", ALIGNMENTS)}
        {select("Line height", "lineHeight", LINE_HEIGHTS)}
        {scope === "section" ? select("Padding", "padding", SPACING) : null}
        {scope === "section" ? select("Card layout", "layout", LAYOUTS) : null}
        {scope === "component" ? select("Image fit", "objectFit", OBJECT_FITS) : null}
        {scope === "component" ? select("Button style", "buttonStyle", BUTTON_STYLES) : null}
        {scope === "component" ? select("Button size", "buttonSize", BUTTON_SIZES) : null}
      </div>
      <div className="grid grid-cols-2 gap-2">
        {color("Text colour", "textColor")}
        {color("Background", "bgColor")}
        {scope === "component" ? color("Button text", "buttonTextColor") : null}
        {scope === "component" ? color("Button fill", "buttonBgColor") : null}
      </div>
      {scope === "section" ? (
        <Field label="Background image" hint="An https image link; leave empty for none">
          <Input
            key={`bg-${style.bgImage ?? ""}`}
            defaultValue={style.bgImage ?? ""}
            disabled={disabled}
            onBlur={(event) => onChange({ bgImage: event.target.value.trim() || null })}
          />
        </Field>
      ) : null}
    </div>
  );
}
