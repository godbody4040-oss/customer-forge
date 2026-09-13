# Revora Core Design System

Version 1.0 — Customer Forge builder source of truth.

## Purpose

This guide turns the Revora visual direction into a reusable contract for generated customer sites. A generated site must use a persisted `DesignProfile`, semantic tokens, reusable components, verified assets and facts, and a publish gate.

## DesignProfile

```ts
export type DesignMode = "professional" | "bold" | "warm";

export interface DesignProfile {
  mode: DesignMode;
  businessType: string;
  locale: string;
  logo: { src: string; alt: string; variant?: "light" | "dark" | "mark" };
  colors: {
    primary: string; primaryContrast: string; secondary: string; accent: string;
    surface: string; surfaceMuted: string; text: string; textMuted: string;
    border: string; success: string; focus: string;
  };
  typography: {
    displayFamily: string; bodyFamily: string;
    displayWeight: 600 | 700 | 800; bodyWeight: 400 | 500 | 600;
    scale: { h1: string; h2: string; h3: string; body: string; small: string };
  };
  radii: { card: string; control: string; pill: string };
  shadows: { card: string; elevated: string; focus: string };
  spacing: { sectionY: string; containerX: string; gridGap: string; cardPadding: string };
  imagery: { style: "editorial" | "documentary" | "abstract"; heroFocalPoint: "center" | "left" | "right" };
  layout: { maxWidth: string; headerStyle: "solid" | "glass"; heroAlignment: "left" | "center"; cardStyle: "bordered" | "soft" | "elevated" };
  motion: { enabled: boolean; intensity: "none" | "subtle"; respectsReducedMotion: true };
}
```

Persist one profile with every generated site. Components must consume profile tokens; do not invent local colors, fonts, shadows, radii, or spacing.

## Modes

| Mode | Best fit | Treatment |
|---|---|---|
| Professional & Trusted | Financial, legal, healthcare, consulting, home services | Restrained palette, clear hierarchy, whitespace, trust signals, practical images |
| Bold & Modern | Technology, creative studios, fitness, food, startups | Strong contrast, expressive display type, restrained asymmetry, conversion-first sections |
| Warm & Local | Restaurants, salons, trades, local retail, community services | Warm neutrals, authentic imagery, personable copy, local proof |

Choose Professional for regulated, safety-critical, or expertise-led services; Bold for innovation or high-energy brands; Warm for hospitality, relationships, and local reputation. Use onboarding data, business category, locale, and verified brand assets. Preserve supplied brand colors and logos.

## Token rules

- Use semantic CSS properties such as `--color-primary`, `--color-surface`, `--space-section-y`, and `--radius-card`.
- Use one display family and one legible body family. Default scale: `h1: clamp(2.25rem, 5vw, 4.5rem)`, `h2: clamp(1.75rem, 3vw, 3rem)`, `h3: 1.25rem`, body 1rem, small 0.875rem.
- Use 8px-based spacing. Default max content width is 72rem; horizontal page padding is 20px mobile, 32px tablet, and 48px desktop.
- Use 64px mobile and 96px desktop section spacing; use 16px mobile and 24px desktop grid gaps.
- Critical text meets 4.5:1 contrast; large text and non-text UI indicators meet 3:1. Buttons use an explicit contrast token.
- Provide visible focus state using the profile focus token. Respect `prefers-reduced-motion`.
- Recommended radii: cards 16px, controls 10px, pills 999px. Use bordered cards for professional profiles, soft cards for warm profiles, and elevated cards sparingly for bold profiles.

## Required components

Use reusable token-driven versions of these components where relevant:

- `SiteHeader`: logo, navigation, primary CTA, accessible mobile menu.
- `Hero`: outcome-led headline, support copy, CTA, verified hero image.
- `ServiceGrid`: 3–6 scannable offers with clear routes or CTAs.
- `TrustBar`: only verified credentials, ratings, logos, service area, or operating history.
- `TestimonialList`: only approved testimonials with accurate attribution.
- `Gallery`: curated, licensed imagery with useful alt text.
- `LeadForm`: minimal fields, labels, field-linked errors, success state, and configured delivery destination.
- `BookingCTA`: only with a verified scheduling URL or supported integration.
- `FAQ` and `Footer`: verified answers, contacts, service area, legal and social links when supplied.

## Builder rules

1. Store and resolve `DesignProfile` once at render time.
2. Build mobile first: stacked content, 44 by 44 CSS-pixel minimum tap targets, no horizontal overflow.
3. Use semantic HTML: one `h1`, ordered headings, landmarks, real links and buttons, descriptive labels.
4. Reserve image dimensions or aspect ratios to prevent layout shift. Lazy-load below-fold images, not the LCP hero image.
5. Use trusted data for business identity, phone, address, hours, offerings, URLs, and social links. Omit missing facts instead of inventing them.
6. Block publication of unverified placeholders, fake reviews, unsupported results claims, unlicensed marks, or stock imagery presented as a real employee, facility, project, client, or outcome.

## Publish gate

Publishing requires all of the following:

- A valid `DesignProfile` and semantic-token component rendering.
- One clear primary conversion path per page.
- Keyboard navigation, visible focus, semantic labels, and contrast checks passing.
- Desktop, tablet, and small-mobile checks passing: no overflow, clipped navigation, unreadable type, or undersized controls.
- Hero, logo, contacts, links, testimonials, ratings, credentials, claims, prices, availability, and booking destinations verified or removed.
- Forms with useful validation, success state, and delivery destination.
- No sample business, lorem ipsum, placeholder, fabricated review, unsupported metric, or fake social profile.
- Optimized images, limited third-party scripts, and no unnecessary animation.
- Accurate title, description, canonical and social metadata where available; structured data only with verified facts.

## Engineering acceptance

The implementation is complete only when the builder can select or infer a mode, persist a valid profile, render required components from tokens, retain asset and data provenance, and block publishing when the publish gate fails. Visual polish never replaces verified facts, accessibility, responsive behavior, or a working conversion path.
