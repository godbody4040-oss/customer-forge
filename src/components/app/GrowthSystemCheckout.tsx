import { useCallback, useMemo } from "react";
import { EmbeddedCheckoutProvider, EmbeddedCheckout } from "@stripe/react-stripe-js";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getStripe, getStripeEnvironment } from "@/lib/stripe";
import { createGrowthSystemCheckout, type GrowthSystemIntake } from "@/lib/stripe.functions";
import { GROWTH_SYSTEM, usdExact } from "@/lib/offer";

type Props = {
  organizationId: string;
  intake: GrowthSystemIntake;
  returnUrl?: string;
  onClose: () => void;
};

/** Secure embedded checkout for the single Revora offer: setup + monthly. */
export function GrowthSystemCheckout({ organizationId, intake, returnUrl, onClose }: Props) {
  const fetchClientSecret = useCallback(async (): Promise<string> => {
    const result = await createGrowthSystemCheckout({
      data: {
        organizationId,
        intake,
        returnUrl:
          returnUrl ?? `${window.location.origin}/app/welcome?checkout=complete&session_id={CHECKOUT_SESSION_ID}`,
        environment: getStripeEnvironment(),
      },
    });
    if ("error" in result) throw new Error(result.error);
    if (!result.clientSecret) throw new Error("The payment provider did not return a checkout session.");
    return result.clientSecret;
  }, [organizationId, intake, returnUrl]);

  const options = useMemo(() => ({ fetchClientSecret }), [fetchClientSecret]);

  return (
    <div className="rounded-lg border border-border bg-card p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="eyebrow">Secure checkout</p>
          <h2 className="mt-1 font-display text-[18px] font-semibold">{GROWTH_SYSTEM.name}</h2>
          <p className="mt-1 text-[12px] text-muted-foreground">
            {usdExact(GROWTH_SYSTEM.setupPrice)} setup today, then {usdExact(GROWTH_SYSTEM.monthlyPrice)}/month.
            Cards, Apple Pay, Google Pay and Cash App Pay appear where supported.
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={onClose} aria-label="Close checkout">
          <X className="size-4" />
        </Button>
      </div>
      <div id="checkout" className="mt-4">
        <EmbeddedCheckoutProvider stripe={getStripe()} options={options}>
          <EmbeddedCheckout />
        </EmbeddedCheckoutProvider>
      </div>
    </div>
  );
}
