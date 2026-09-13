# Generated-Site Quality Benchmark

This benchmark turns Customer Forge's existing generation, design, preflight, audit, claim, conversion, and launch-QA modules into one standard for every generated website.

## Outcome

A publishable site is not simply complete or attractive. It is distinct for its business, fact-safe, accessible, mobile-ready, fast, editable, and built around one clear conversion path.

## Quality score

Score each category from 0 to 5. Publication requires 4 or higher in every category and an overall score of at least 4.2 out of 5.

| Category | Pass criteria |
|---|---|
| Brand fit | A persisted design profile matches category, locale, supplied brand assets, and customer intent; no default-template drift |
| First-screen clarity | One outcome-led H1, specific audience or service, supporting proof, one primary CTA, and an intentional hero asset |
| Conversion path | Each page has one primary action; contact, quote, booking, or purchase path works and is appropriate to the business |
| Trust and facts | Names, contact details, service areas, reviews, credentials, pricing, availability, outcomes, and logos are verified or removed |
| Content specificity | Copy names real services, audience, service area, process, and differentiators; no lorem ipsum, generic filler, repetition, or fabricated claims |
| Visual craft | Semantic tokens, deliberate image crop/placement, consistent spacing and typography, balanced density, and no duplicate visual patterns presented as distinct proof |
| Responsive UX | Mobile-first layout, no horizontal overflow, readable type, 44px minimum interactive targets, accessible navigation, and predictable card stacking |
| Accessibility | One H1, ordered headings, labels, landmarks, keyboard support, visible focus, useful alt text, and required contrast |
| Performance | Sized media, no lazy-loading of the LCP hero, lazy-loaded below-fold images, limited third-party scripts, and no avoidable layout shift |
| Editing safety | Every generated fact and asset carries provenance or verification state; unresolved placeholders block publish |

## Composition rules

1. Select one site-wide design profile and design fingerprint before generating sections. Do not let each section choose an unrelated palette, type scale, spacing rhythm, or card style.
2. Generate a mobile composition first, then enhance for tablet and desktop. The mobile hero must retain the H1, proof, and primary CTA without clipping or hiding essentials.
3. Vary section composition intentionally: alternate editorial, proof, utility, and conversion sections rather than repeating a three-card grid.
4. Use supplied or licensed media. Never imply that stock photography depicts a real employee, facility, client, project, certification, or outcome.
5. Keep essential copy in HTML, not image text. Reserve image dimensions to prevent layout shift.

## Required page evidence

A generated home page should include only relevant evidence from this list: specific offer, how-it-works process, verified trust proof, service/coverage area, selected work or gallery, FAQ, final CTA, and accurate contact path. Regulated or high-consideration categories also require appropriate disclosures and stronger trust evidence.

## Automated gates

- `claim-registry`: reject unsupported credentials, reviews, ratings, client logos, guarantees, prices, availability, and performance statements.
- `design-fingerprint` and `site-style`: require one resolved profile across the site and flag token drift.
- `visual-check` and `launch-qa`: test desktop, tablet, and small-mobile for overflow, hidden CTA, clipped navigation, poor crop, duplicate images, type density, and undersized controls.
- `preflight` and `site-audit`: require meaningful title/description, page-level conversion action, form success/error states, valid links, image metadata, and absence of sample content.
- `conversion-engine`: flag pages without a visible primary CTA, direct contact option where appropriate, service clarity, trust evidence, or local relevance.

## Improvement loop

After publishing, rank recommendations by expected impact and confidence: failed form or booking path first; then broken/slow pages; then low-CTA visibility, weak trust proof, thin service detail, and visual inconsistency. Recommendations must name the exact page, evidence, proposed edit, expected outcome, and whether owner approval is required.

## Acceptance scenarios

- A local contractor gets verified service area and contact details, specific services, photo provenance, a request-estimate CTA, and no invented licensing, years, reviews, or project claims.
- A consultant gets a credible expertise-led profile, focused offer, process, proof only where supplied, and a meeting/contact conversion route.
- A restaurant gets menu/location/hours/ordering or reservation routes only when verified, authentic imagery where available, and no unsupported availability or rating claim.
