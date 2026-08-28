import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { AlertTriangle, CheckCircle2, Loader2, XCircle } from "lucide-react";
import { Panel, Pill } from "@/components/app/Bits";
import { Button } from "@/components/ui/button";
import { cancelPaypalOrder, capturePaypalOrder, createPaypalOrder } from "@/lib/payments.functions";
import { usePaymentConfig, type PaymentProduct } from "@/lib/payments.hooks";
import { REVORA } from "@/lib/brand";

type Result =
  | { kind: "success"; product: string | null; amount: number; currency: string; captureId: string | null; at: string | null }
  | { kind: "cancelled" }
  | { kind: "failed"; message: string };

declare global {
  interface Window {
    paypal?: { Buttons: (options: Record<string, unknown>) => { render: (target: HTMLElement) => Promise<void> } };
  }
}

const money = (amount: number, currency: string) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency }).format(amount);

/** Loads PayPal's official JS SDK once per client id. */
function usePayPalSdk(clientId: string | null, currency: string) {
  const [state, setState] = useState<"idle" | "loading" | "ready" | "error">("idle");
  useEffect(() => {
    if (!clientId) return;
    if (window.paypal) {
      setState("ready");
      return;
    }
    setState("loading");
    const script = document.createElement("script");
    script.src = `https://www.paypal.com/sdk/js?client-id=${encodeURIComponent(clientId)}&currency=${currency}&intent=capture&components=buttons`;
    script.async = true;
    script.onload = () => setState("ready");
    script.onerror = () => setState("error");
    document.head.appendChild(script);
  }, [clientId, currency]);
  return state;
}

export function PayPalCheckout({
  organizationId,
  product,
  onPaid,
  onClose,
}: {
  organizationId: string;
  product: PaymentProduct;
  onPaid: () => void;
  onClose: () => void;
}) {
  const { data: config, isLoading } = usePaymentConfig();
  const sdk = usePayPalSdk(config?.configured ? config.clientId : null, product.currency);
  const createOrder = useServerFn(createPaypalOrder);
  const captureOrder = useServerFn(capturePaypalOrder);
  const cancelOrder = useServerFn(cancelPaypalOrder);
  const [result, setResult] = useState<Result | null>(null);
  const [busy, setBusy] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const target = useRef<HTMLDivElement | null>(null);
  const rendered = useRef(false);

  useEffect(() => {
    if (sdk !== "ready" || !window.paypal || !target.current || rendered.current || result || !agreed) return;
    rendered.current = true;
    void window.paypal
      .Buttons({
        style: { layout: "vertical", color: "gold", shape: "rect", label: "paypal" },
        createOrder: async () => {
          const created = await createOrder({ data: { organizationId, productId: product.id } });
          if (!created.ok) throw new Error(created.error);
          return created.orderId;
        },
        onApprove: async (data: { orderID: string }) => {
          setBusy(true);
          const captured = await captureOrder({ data: { orderId: data.orderID } });
          setBusy(false);
          if (captured.ok && captured.status === "completed") {
            setResult({
              kind: "success",
              product: captured.product,
              amount: captured.amount,
              currency: captured.currency,
              captureId: captured.captureId,
              at: captured.completedAt,
            });
            onPaid();
          } else {
            setResult({
              kind: "failed",
              message: captured.ok ? "PayPal did not confirm this payment." : captured.error,
            });
          }
        },
        onCancel: async (data: { orderID?: string }) => {
          if (data?.orderID) await cancelOrder({ data: { orderId: data.orderID } });
          setResult({ kind: "cancelled" });
          onPaid();
        },
        onError: () => setResult({ kind: "failed", message: "PayPal reported a problem with this checkout." }),
      })
      .render(target.current);
  }, [sdk, agreed, result, organizationId, product.id, createOrder, captureOrder, cancelOrder, onPaid]);

  const retry = () => {
    rendered.current = false;
    setResult(null);
  };

  return (
    <Panel className="p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="eyebrow">Order review</p>
          <h3 className="mt-1 font-display text-[20px] font-semibold">{product.name}</h3>
          {product.description ? (
            <p className="mt-1.5 max-w-prose text-[13px] text-muted-foreground">{product.description}</p>
          ) : null}
        </div>
        {config?.configured ? (
          <Pill tone={config.environment === "live" ? "signal" : "neutral"}>
            {config.environment === "live" ? "PayPal live" : "PayPal sandbox"}
          </Pill>
        ) : null}
      </div>

      <dl className="mt-5 space-y-2 border-t border-border pt-4 text-[13px]">
        <div className="flex justify-between">
          <dt className="text-muted-foreground">Price</dt>
          <dd className="tnum">{money(product.amount, product.currency)}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-muted-foreground">Currency</dt>
          <dd>{product.currency}</dd>
        </div>
        {product.billing_interval ? (
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Billing</dt>
            <dd>{product.billing_interval === "annual" ? "Billed yearly" : "Billed monthly"}</dd>
          </div>
        ) : null}
        <div className="flex justify-between border-t border-border pt-2 text-[15px] font-semibold">
          <dt>Total due today</dt>
          <dd className="tnum">{money(product.amount, product.currency)}</dd>
        </div>
      </dl>
      <p className="mt-2 text-[12px] text-muted-foreground">
        No taxes or extra fees are added by Revora. Any tax that applies is shown by PayPal at checkout.
      </p>

      {isLoading ? (
        <p className="mt-5 text-[13px] text-muted-foreground">Checking payment setup…</p>
      ) : !config?.configured ? (
        <div className="mt-5 rounded-md border border-border bg-elevated p-4">
          <p className="flex items-center gap-2 text-[13px] font-medium">
            <AlertTriangle className="size-4 text-accent" /> Setup required
          </p>
          <p className="mt-1.5 text-[12px] text-muted-foreground">
            PayPal is not connected yet, so no payment can be taken. Contact {REVORA.email} to finish setup.
          </p>
        </div>
      ) : result?.kind === "success" ? (
        <div className="mt-5 rounded-md border border-primary/40 bg-primary/5 p-4">
          <p className="flex items-center gap-2 text-[14px] font-semibold">
            <CheckCircle2 className="size-4 text-primary" /> Payment successful
          </p>
          <p className="mt-1 text-[13px] text-muted-foreground">
            Your payment has been confirmed and your Revora service has been activated.
          </p>
          <dl className="mt-3 space-y-1 text-[12px]">
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Service</dt>
              <dd>{result.product ?? product.name}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Amount</dt>
              <dd className="tnum">{money(result.amount, result.currency)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Date</dt>
              <dd>{result.at ? new Date(result.at).toLocaleString() : new Date().toLocaleString()}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">PayPal transaction ID</dt>
              <dd className="truncate font-mono text-[11px]">{result.captureId ?? "—"}</dd>
            </div>
          </dl>
          <Button variant="signal" size="sm" className="mt-4" onClick={onClose}>
            Continue to Revora
          </Button>
        </div>
      ) : result?.kind === "cancelled" ? (
        <div className="mt-5 rounded-md border border-border bg-elevated p-4">
          <p className="flex items-center gap-2 text-[14px] font-semibold">
            <XCircle className="size-4 text-muted-foreground" /> Payment cancelled
          </p>
          <p className="mt-1 text-[13px] text-muted-foreground">
            Your payment was not completed and nothing was charged.
          </p>
          <div className="mt-4 flex gap-2">
            <Button variant="signal" size="sm" onClick={retry}>
              Try again
            </Button>
            <Button variant="outline" size="sm" onClick={onClose}>
              Return to billing
            </Button>
          </div>
        </div>
      ) : result?.kind === "failed" ? (
        <div className="mt-5 rounded-md border border-accent/40 bg-accent/5 p-4">
          <p className="flex items-center gap-2 text-[14px] font-semibold">
            <AlertTriangle className="size-4 text-accent" /> Payment could not be completed
          </p>
          <p className="mt-1 text-[13px] text-muted-foreground">
            {result.message} Please try again or contact {REVORA.email}.
          </p>
          <div className="mt-4 flex gap-2">
            <Button variant="signal" size="sm" onClick={retry}>
              Try again
            </Button>
            <Button variant="outline" size="sm" onClick={onClose}>
              Return to billing
            </Button>
          </div>
        </div>
      ) : (
        <div className="mt-5 space-y-3">
          <label className="flex cursor-pointer items-start gap-2 text-[12px] text-muted-foreground">
            <input
              type="checkbox"
              checked={agreed}
              onChange={(event) => setAgreed(event.target.checked)}
              className="mt-0.5 size-4 accent-[var(--color-primary)]"
            />
            <span>
              I agree to Revora&apos;s terms and privacy policy. Digital services begin immediately after payment;
              refunds are handled case by case — email {REVORA.email}.
            </span>
          </label>
          {!agreed ? (
            <p className="text-[12px] text-muted-foreground">Accept the terms to show the PayPal button.</p>
          ) : null}
          <div ref={target} aria-label="Pay with PayPal" className="min-h-[52px] max-w-sm" />
          {sdk === "loading" ? (
            <p className="flex items-center gap-2 text-[12px] text-muted-foreground">
              <Loader2 className="size-3 animate-spin" /> Loading PayPal…
            </p>
          ) : null}
          {sdk === "error" ? (
            <p className="text-[12px] text-accent">PayPal checkout could not load. Check your connection and retry.</p>
          ) : null}
          {busy ? (
            <p className="flex items-center gap-2 text-[12px] text-muted-foreground">
              <Loader2 className="size-3 animate-spin" /> Verifying your payment with PayPal…
            </p>
          ) : null}
          <Button variant="outline" size="sm" onClick={onClose}>
            Cancel
          </Button>
        </div>
      )}
    </Panel>
  );
}
