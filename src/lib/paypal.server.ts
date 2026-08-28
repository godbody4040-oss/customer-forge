/**
 * PayPal REST integration (Orders v2 + Payments v2 + Webhooks v1).
 * Server-only: the client secret never leaves this module's runtime.
 * Environment is switched with PAYPAL_ENVIRONMENT=sandbox|live.
 */

export type PayPalEnvironment = "sandbox" | "live";

export type PayPalConfig = {
  clientId: string;
  clientSecret: string;
  environment: PayPalEnvironment;
  webhookId: string | null;
  apiBase: string;
};

/** Reads credentials at call time (never at module scope). */
export function paypalConfig(): PayPalConfig | null {
  const clientId = process.env["PAYPAL_CLIENT_ID"];
  const clientSecret = process.env["PAYPAL_CLIENT_SECRET"];
  if (!clientId || !clientSecret) return null;
  const environment: PayPalEnvironment =
    (process.env["PAYPAL_ENVIRONMENT"] ?? "sandbox").toLowerCase() === "live" ? "live" : "sandbox";
  return {
    clientId,
    clientSecret,
    environment,
    webhookId: process.env["PAYPAL_WEBHOOK_ID"] ?? null,
    apiBase:
      environment === "live" ? "https://api-m.paypal.com" : "https://api-m.sandbox.paypal.com",
  };
}

export class PayPalError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly detail?: unknown,
  ) {
    super(message);
    this.name = "PayPalError";
  }
}

async function accessToken(config: PayPalConfig): Promise<string> {
  const credentials = btoa(`${config.clientId}:${config.clientSecret}`);
  const response = await fetch(`${config.apiBase}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });
  const body = (await response.json().catch(() => null)) as { access_token?: string } | null;
  if (!response.ok || !body?.access_token) {
    // Never log the secret itself — only the provider status.
    throw new PayPalError("PayPal authentication failed", response.status);
  }
  return body.access_token;
}

async function api<T>(
  config: PayPalConfig,
  path: string,
  init?: { method?: string; body?: unknown; requestId?: string },
): Promise<T> {
  const token = await accessToken(config);
  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
  // PayPal idempotency: repeating a request with the same key never charges twice.
  if (init?.requestId) headers["PayPal-Request-Id"] = init.requestId;

  const response = await fetch(`${config.apiBase}${path}`, {
    method: init?.method ?? "GET",
    headers,
    body: init?.body === undefined ? undefined : JSON.stringify(init.body),
  });
  const text = await response.text();
  const parsed = text ? JSON.parse(text) : {};
  if (!response.ok) {
    const detail = parsed as { message?: string; name?: string };
    throw new PayPalError(detail?.message ?? `PayPal request failed (${path})`, response.status, parsed);
  }
  return parsed as T;
}

export type PayPalOrder = {
  id: string;
  status: string;
  purchase_units?: {
    payments?: {
      captures?: { id: string; status: string; amount?: { value: string; currency_code: string } }[];
    };
  }[];
  payer?: { email_address?: string };
  links?: { rel: string; href: string }[];
};

/** Creates an order PayPal's JS SDK / redirect flow can approve. */
export async function createPayPalOrder(
  config: PayPalConfig,
  input: {
    referenceId: string;
    amount: string;
    currency: string;
    description: string;
    brandName: string;
    returnUrl?: string;
    cancelUrl?: string;
  },
): Promise<PayPalOrder> {
  return api<PayPalOrder>(config, "/v2/checkout/orders", {
    method: "POST",
    requestId: input.referenceId,
    body: {
      intent: "CAPTURE",
      purchase_units: [
        {
          reference_id: input.referenceId,
          custom_id: input.referenceId,
          description: input.description.slice(0, 127),
          amount: { currency_code: input.currency, value: input.amount },
        },
      ],
      payment_source: {
        paypal: {
          experience_context: {
            brand_name: input.brandName,
            user_action: "PAY_NOW",
            shipping_preference: "NO_SHIPPING",
            ...(input.returnUrl ? { return_url: input.returnUrl } : {}),
            ...(input.cancelUrl ? { cancel_url: input.cancelUrl } : {}),
          },
        },
      },
    },
  });
}

/** Captures an approved order. Safe to retry: same request id, no double charge. */
export async function capturePayPalOrder(config: PayPalConfig, orderId: string): Promise<PayPalOrder> {
  return api<PayPalOrder>(config, `/v2/checkout/orders/${orderId}/capture`, {
    method: "POST",
    requestId: `capture-${orderId}`,
    body: {},
  });
}

export async function getPayPalOrder(config: PayPalConfig, orderId: string): Promise<PayPalOrder> {
  return api<PayPalOrder>(config, `/v2/checkout/orders/${orderId}`);
}

export type PayPalRefund = {
  id: string;
  status: string;
  amount?: { value: string; currency_code: string };
};

export async function refundPayPalCapture(
  config: PayPalConfig,
  captureId: string,
  amount?: { value: string; currency_code: string },
): Promise<PayPalRefund> {
  return api<PayPalRefund>(config, `/v2/payments/captures/${captureId}/refund`, {
    method: "POST",
    requestId: `refund-${captureId}-${amount?.value ?? "full"}`,
    body: amount ? { amount } : {},
  });
}

/**
 * Verifies a webhook with PayPal itself — the only trustworthy way to know a
 * request really came from PayPal.
 */
export async function verifyPayPalWebhook(
  config: PayPalConfig,
  headers: Headers,
  rawBody: string,
): Promise<"SUCCESS" | "FAILURE" | "UNCONFIGURED"> {
  if (!config.webhookId) return "UNCONFIGURED";
  const required = [
    "paypal-transmission-id",
    "paypal-transmission-time",
    "paypal-transmission-sig",
    "paypal-cert-url",
    "paypal-auth-algo",
  ];
  if (required.some((name) => !headers.get(name))) return "FAILURE";

  try {
    const result = await api<{ verification_status: string }>(config, "/v1/notifications/verify-webhook-signature", {
      method: "POST",
      body: {
        auth_algo: headers.get("paypal-auth-algo"),
        cert_url: headers.get("paypal-cert-url"),
        transmission_id: headers.get("paypal-transmission-id"),
        transmission_sig: headers.get("paypal-transmission-sig"),
        transmission_time: headers.get("paypal-transmission-time"),
        webhook_id: config.webhookId,
        webhook_event: JSON.parse(rawBody),
      },
    });
    return result.verification_status === "SUCCESS" ? "SUCCESS" : "FAILURE";
  } catch {
    return "FAILURE";
  }
}

/** Maps PayPal order/capture statuses onto Revora payment statuses. */
export function mapOrderStatus(status: string | undefined): string {
  switch ((status ?? "").toUpperCase()) {
    case "CREATED":
      return "created";
    case "SAVED":
    case "PAYER_ACTION_REQUIRED":
      return "pending";
    case "APPROVED":
      return "approved";
    case "COMPLETED":
      return "completed";
    case "VOIDED":
      return "cancelled";
    default:
      return "pending";
  }
}
