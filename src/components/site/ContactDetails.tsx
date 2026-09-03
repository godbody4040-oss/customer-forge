/**
 * Real business contact details for a client site.
 *
 * Every visitor-facing surface (contact section, booking form, booking
 * confirmation) reads the same phone and email off the client's own business
 * profile, so a booking never dead-ends without a way to reach the business.
 */
import { Mail, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { telHref as intlTelHref } from "@/lib/locale";

export type ContactInfo = {
  phone?: string | null;
  email?: string | null;
};

/**
 * Digits only — `tel:` links break on spaces and formatting characters. Numbers
 * from anywhere in the world are accepted (international `+` prefix kept); a
 * value that isn't a usable phone number never becomes a dead `tel:` link.
 */
export const telHref = (phone: string) => intlTelHref(phone) ?? "#";

/**
 * Only a plain address ever reaches a `mailto:` href, so a saved business
 * "email" can never smuggle another scheme or markup into a public page.
 */
export const mailHref = (email: string) => {
  const clean = email.trim().replace(/[\s<>"'`]/g, "");
  return /^[^@\s]+@[^@\s]+\.[a-z]{2,}$/i.test(clean) ? `mailto:${clean}` : "#";
};

/** Short "prefer to talk?" strip used above forms. */
export function DirectContact({
  profile,
  businessName,
  label = "Prefer to talk to a person?",
}: {
  profile: ContactInfo | null | undefined;
  businessName: string;
  label?: string;
}) {
  const phone = profile?.phone?.trim() || null;
  const email = profile?.email?.trim() || null;
  if (!phone && !email) return null;

  return (
    <div className="rounded-lg border border-border bg-elevated/60 p-3">
      <p className="text-[12px] text-muted-foreground">{label}</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {phone ? (
          <Button asChild size="sm" variant="outline">
            <a href={telHref(phone)} aria-label={`Call ${businessName} at ${phone}`}>
              <Phone className="size-3.5" aria-hidden="true" /> {phone}
            </a>
          </Button>
        ) : null}
        {email ? (
          <Button asChild size="sm" variant="outline">
            <a href={mailHref(email)} aria-label={`Email ${businessName} at ${email}`}>
              <Mail className="size-3.5" aria-hidden="true" /> {email}
            </a>
          </Button>
        ) : null}
      </div>
    </div>
  );
}
