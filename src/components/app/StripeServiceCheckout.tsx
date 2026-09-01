import { useCallback, useMemo } from "react";
import { EmbeddedCheckoutProvider, EmbeddedCheckout } from "@stripe/react-stripe-js";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getStripe, getStripeEnvironment } from "@/lib/stripe";
import { createServiceCheckout } from "@/lib/stripe.functions";
import type { PaymentProduct } from "@/lib/payments.hooks";

type Props = {
  organizationId: string;
  product: PaymentProduct;
  onClose: () => void;
};

/** Embedded one-time Stripe checkout for a Revora service (cards, Apple Pay, Cash App Pay). */
export function StripeServiceCheckout({ organizationId, product, onClose }: Props) {
  const fetchClientSecret = useCallback(async (): Promise<string> => {
    const result = await createServiceCheckout({
      data: {
        organizationId,
        productId: product.id,
        returnUrl: `${window.location.origin}/app/billing?checkout=complete&session_id={CHECKOUT_SESSION_ID}`,
        environment: getStripeEnvironment(),
      },
    });
    if ("error" in result) throw new Error(result.error);
    if (!result.clientSecret)
      throw new Error("The payment provider did not return a checkout session.");
    return result.clientSecret;
  }, [organizationId, product.id]);

  const options = useMemo(() => ({ fetchClientSecret }), [fetchClientSecret]);
  const money = new Intl.NumberFormat("en-US", { style: "currency", currency: product.currency });

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="eyebrow">Secure checkout</p>
          <h2 className="mt-1 font-display text-[18px] font-semibold">
            {product.name} — {money.format(product.amount)} one-time
          </h2>
          <p className="mt-1 text-[12px] text-muted-foreground">
            Card, Apple Pay, Google Pay and Cash App Pay appear when your device and the provider
            support them.
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={onClose} aria-label="Close checkout">
          <X className="size-4" />
        </Button>
      </div>
      <div id="service-checkout" className="mt-4">
        <EmbeddedCheckoutProvider stripe={getStripe()} options={options}>
          <EmbeddedCheckout />
        </EmbeddedCheckoutProvider>
      </div>
    </div>
  );
}
