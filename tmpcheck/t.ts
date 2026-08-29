import { createStripeClient } from "../src/lib/stripe.server";
const s = createStripeClient("sandbox");
const [monthly] = (await s.prices.list({ lookup_keys: ["revora_system_monthly"], limit: 1 })).data;
const [setup] = (await s.prices.list({ lookup_keys: ["revora_system_setup"], limit: 1 })).data;
const sess = await s.checkout.sessions.create({
  line_items: [{ price: monthly.id, quantity: 1 }, { price: setup.id, quantity: 1 }],
  mode: "subscription",
  ui_mode: "embedded_page",
  return_url: "https://revoragrowthsystems.com/app/welcome",
  subscription_data: { trial_period_days: 30 },
} as never);
console.log(JSON.stringify({ amount_total: sess.amount_total, currency: sess.currency, id: sess.id }));
