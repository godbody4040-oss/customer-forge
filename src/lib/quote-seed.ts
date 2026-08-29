import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Seeds a sensible starter quote calculator: one form, three questions with
 * priced options, and two add-ons. Tenants edit this in the app; it exists so
 * the public "Get my quote" CTA is never a dead end.
 */
export async function seedQuoteCalculator(
  admin: SupabaseClient,
  organizationId: string,
  serviceNames: string[] = [],
) {
  const { data: existing } = await admin
    .from("quote_forms")
    .select("id")
    .eq("organization_id", organizationId)
    .limit(1);
  if (existing?.[0]) return existing[0].id as string;

  const { data: form, error } = await admin
    .from("quote_forms")
    .insert({
      organization_id: organizationId,
      name: "Instant estimate",
      base_price: 150,
      min_price: 120,
      max_price: 900,
      is_active: true,
    })
    .select("id")
    .single();
  if (error || !form) return null;
  const formId = form.id as string;

  const questions: { label: string; helper: string; options: { label: string; modifier: number; type: string }[] }[] = [
    {
      label: "Which service do you need?",
      helper: "Pick the closest match — we'll confirm the details.",
      options: (serviceNames.length ? serviceNames.slice(0, 4) : ["Standard service", "Premium service"]).map(
        (name, index) => ({ label: name, modifier: index * 60, type: "fixed" }),
      ),
    },
    {
      label: "How big is the job?",
      helper: "This helps us size the estimate.",
      options: [
        { label: "Small", modifier: 0, type: "fixed" },
        { label: "Medium", modifier: 25, type: "percent" },
        { label: "Large", modifier: 60, type: "percent" },
      ],
    },
    {
      label: "How soon do you need it?",
      helper: "Rush work carries a small premium.",
      options: [
        { label: "Flexible", modifier: 0, type: "fixed" },
        { label: "This week", modifier: 40, type: "fixed" },
        { label: "Urgent (48 hours)", modifier: 15, type: "percent" },
      ],
    },
  ];

  for (const [index, question] of questions.entries()) {
    const { data: row } = await admin
      .from("quote_questions")
      .insert({
        organization_id: organizationId,
        form_id: formId,
        label: question.label,
        helper_text: question.helper,
        question_type: "single",
        sort_order: index,
      })
      .select("id")
      .single();
    if (!row) continue;
    await admin.from("quote_options").insert(
      question.options.map((option, optionIndex) => ({
        organization_id: organizationId,
        question_id: row.id as string,
        label: option.label,
        price_modifier: option.modifier,
        modifier_type: option.type,
        sort_order: optionIndex,
      })),
    );
  }

  await admin.from("quote_addons").insert([
    {
      organization_id: organizationId,
      form_id: formId,
      label: "Priority scheduling",
      description: "Front of the queue for the next available slot.",
      price: 45,
      sort_order: 0,
    },
    {
      organization_id: organizationId,
      form_id: formId,
      label: "Add-on detail work",
      description: "Extra attention on the areas that matter most.",
      price: 75,
      sort_order: 1,
    },
  ]);

  return formId;
}
