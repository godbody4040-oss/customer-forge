import type { StripeEnv } from "@/lib/stripe.server";

export const parseWorkspaceId = (value: unknown) => {
  const id = String(value ?? "");
  if (!/^[0-9a-f-]{36}$/i.test(id)) throw new Error("Invalid workspace");
  return id;
};

export const parseStripeEnvironment = (value: unknown): StripeEnv => {
  if (value === "sandbox" || value === "live") return value;
  throw new Error("Invalid payment environment");
};

export const cleanText = (value: unknown, max: number) =>
  String(value ?? "")
    .trim()
    .slice(0, max);
