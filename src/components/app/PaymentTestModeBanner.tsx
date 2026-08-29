const clientToken = import.meta.env["VITE_PAYMENTS_CLIENT_TOKEN"] as string | undefined;

export function PaymentTestModeBanner() {
  if (!clientToken) {
    return (
      <div className="rounded-md border border-destructive/40 bg-destructive/10 px-4 py-2 text-[12px] text-destructive">
        Live card checkout is not configured yet. Finish payment go-live in your Revora project to accept real
        payments.
      </div>
    );
  }
  if (clientToken.startsWith("pk_test_")) {
    return (
      <div className="rounded-md border border-primary/40 bg-primary/10 px-4 py-2 text-[12px] text-primary">
        Test mode — payments made here are not real charges. Use card 4242 4242 4242 4242 to test checkout.
      </div>
    );
  }
  return null;
}
