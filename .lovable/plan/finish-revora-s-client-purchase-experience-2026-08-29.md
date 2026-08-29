# Finish Revora’s client purchase experience

## Goal
Make the full sales and billing journey reliable so a client can understand the offer, create an account, pay securely, see accurate billing information, and manage the resulting subscription without broken actions or test/live data conflicts.

## What I found
- The current “No such customer” error is caused by environment mixing: the published billing page uses the live payment connection while the stored customer shown in the screenshot belongs to sandbox. The portal function currently trusts the page environment instead of the subscription’s recorded environment.
- Billing state is loaded without filtering or reconciling sandbox versus live records, so test subscription data can appear as if it were a live subscription.
- The payment history does not show Stripe transaction identifiers, and some sales CTAs still use stale “Start free,” demo, quote, or book wording instead of the single paid Revora Growth System journey.
- The core embedded checkout is already present and correctly presents the single offer: $1,500 setup plus the first $250 month today, then $250/month.

## Implementation
1. **Repair customer and environment resolution**
   - Make billing and portal calls resolve the subscription for the active payment environment.
   - Validate the stored customer against that environment before opening the portal.
   - Recover safely from stale/missing customer IDs by locating the correct customer through workspace metadata and updating the billing record only after verification.
   - Never send a sandbox customer ID to live Stripe or vice versa.

2. **Harden checkout and billing state**
   - Keep duplicate-subscription protection scoped to the active environment.
   - Ensure checkout reuses the correct environment-specific customer and records its workspace/user metadata.
   - Return clear client-facing recovery messages rather than raw Stripe resource errors.
   - Refresh subscription, setup-payment, workspace, notifications, and payment history after checkout returns.

3. **Make every sales action consistent**
   - Route primary “get started,” pricing, ROI, demo/quote/book, and mobile actions to the correct sales or checkout destination.
   - Remove stale free-trial language and old package/plan wording from purchase-facing controls.
   - Preserve phone, email, sign-in, support, and true demo actions where they are intentional.

4. **Finish the billing page**
   - Show the correct live/sandbox status, setup payment, monthly status, next renewal, and payment history.
   - Display a useful Stripe transaction reference where available.
   - Keep service checkout buttons operational for active one-time services and hide unavailable payment methods instead of presenting dead controls.
   - Improve empty, loading, permission, checkout-failure, portal-failure, and payment-success states.

5. **Verify end to end**
   - Test public CTAs, account handoff, signed-in checkout launch, embedded payment form, return handling, billing refresh, and portal opening.
   - Verify mobile and desktop layouts, keyboard-accessible controls, no dead links, and no horizontal overflow.
   - Confirm build health and inspect live billing records without creating fake production charges.

## Technical details
- Keep Stripe access server-side through the existing managed gateway and Embedded Checkout.
- Use the subscription row’s `environment` as authoritative for portal access while the active build environment controls new checkout.
- Scope subscription reads and duplicate guards by `organization_id`, provider, and environment.
- Preserve verified webhook-driven activation and idempotent payment recording.
- No schema change is expected unless the audit reveals that the current subscription uniqueness rule cannot support separate sandbox/live records.
