import { useCallback, useMemo } from "react";
import { EmbeddedCheckoutProvider, EmbeddedCheckout } from "@stripe/react-stripe-js";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getStripe, getStripeEnvironment } from "@/lib/stripe";
import { createSubscriptionCheckout } from "@/lib/stripe.functions";

type Props = {
  organizationId: string;
  planId: string;
  planName: string;
  interval: "monthly" | "annual";
  onClose: () => void;
};

export function StripeCheckout({ organizationId, planId, planName, interval, onClose }: Props) {
  const fetchClientSecret = useCallback(async (): Promise<string> => {
    const result = await createSubscriptionCheckout({
      data: {
        organizationId,
        planId,
        interval,
        returnUrl: `${window.location.origin}/app/billing?checkout=complete&session_id={CHECKOUT_SESSION_ID}`,
        environment: getStripeEnvironment(),
      },
    });
    if ("error" in result) throw new Error(result.error);
    if (!result.clientSecret) throw new Error("The payment provider did not return a checkout session.");
    return result.clientSecret;
  }, [organizationId, planId, interval]);

  const options = useMemo(() => ({ fetchClientSecret }), [fetchClientSecret]);

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="eyebrow">Secure checkout</p>
          <h2 className="mt-1 font-display text-[18px] font-semibold">
            {planName} — {interval === "annual" ? "annual" : "monthly"}
          </h2>
          <p className="mt-1 text-[12px] text-muted-foreground">
            Card, Apple Pay, Google Pay and Cash App Pay appear when your device and the provider support them.
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
