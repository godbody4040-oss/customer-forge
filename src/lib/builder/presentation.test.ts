/**
 * Regression tests built from real defects seen on generated sites: an object
 * printed as `[object Object]`, a malformed phone number rendered as callable,
 * gibberish shown as an email address, and `new york` left lower-case.
 */
import { describe, expect, it } from "vitest";
import {
  addressDisplay,
  emailDisplay,
  emailLink,
  externalUrl,
  hasTemplateLeak,
  hoursDisplay,
  isUsableEmail,
  isUsablePhone,
  phoneDisplay,
  phoneLink,
  placeDisplay,
  safeParagraph,
  safeText,
  yearsDisplay,
} from "./presentation";
import { businessFacts, claimableFacts } from "./facts";
import { auditWebsite, type QualityInput } from "./quality";

describe("safeText", () => {
  it("never stringifies an object", () => {
    expect(safeText({ mon: "8-6" })).toBeNull();
    expect(safeText({})).toBeNull();
    expect(String(safeText({ a: 1 }))).not.toContain("[object");
  });

  it("lifts a known display field instead of guessing", () => {
    expect(safeText({ label: "Book online" })).toBe("Book online");
    expect(safeText({ summary: "Mon–Sat 8am–6pm" })).toBe("Mon–Sat 8am–6pm");
  });

  it("drops nullish, NaN and template leftovers", () => {
    expect(safeText(null)).toBeNull();
    expect(safeText(undefined)).toBeNull();
    expect(safeText(Number.NaN)).toBeNull();
    expect(safeText("   ")).toBeNull();
    expect(safeText("Write your guarantee here")).toBeNull();
    expect(safeText("TODO: add services")).toBeNull();
    expect(safeText("{{business_name}}")).toBeNull();
  });

  it("keeps real copy and collapses whitespace", () => {
    expect(safeText("  Premium   mobile detailing ")).toBe("Premium mobile detailing");
  });

  it("keeps intentional line breaks in paragraphs", () => {
    expect(safeParagraph("Line one\n\nLine two")).toBe("Line one\nLine two");
    expect(safeParagraph("Add your text here")).toBeNull();
  });
});

describe("template leak detection", () => {
  it("flags scaffolding, placeholders and debug output", () => {
    for (const value of [
      "[object Object]",
      "undefined",
      "lorem ipsum dolor",
      "555-0142",
      "123 Main St",
      "test@test.com",
      "hello@example.com",
      "placeholder copy",
    ]) {
      expect(hasTemplateLeak(value)).toBe(true);
    }
    expect(hasTemplateLeak("Mobile detailing across New York")).toBe(false);
  });
});

describe("phone validation", () => {
  it("rejects the malformed number seen in production", () => {
    expect(isUsablePhone("96226620")).toBe(false);
    expect(phoneDisplay("96226620")).toBeNull();
    expect(phoneLink("96226620")).toBeNull();
  });

  it("rejects gibberish, fictional and empty values", () => {
    expect(isUsablePhone("uauauauuwwuu")).toBe(false);
    expect(isUsablePhone("(512) 555-0142")).toBe(false);
    expect(isUsablePhone("")).toBe(false);
    expect(isUsablePhone(null)).toBe(false);
  });

  it("formats real numbers for humans and links safely", () => {
    expect(phoneDisplay("9196226620")).toBe("(919) 622-6620");
    expect(phoneDisplay("(919) 622-6620")).toBe("(919) 622-6620");
    expect(phoneLink("+1 919 622 6620")).toBe("tel:+19196226620");
  });
});

describe("email validation", () => {
  it("hides gibberish and never builds a broken mailto", () => {
    expect(isUsableEmail("uauauauuwwuu")).toBe(false);
    expect(emailDisplay("uauauauuwwuu")).toBeNull();
    expect(emailLink("uauauauuwwuu")).toBeNull();
    expect(emailLink("hello@example.com")).toBeNull();
  });

  it("accepts and lower-cases a real address", () => {
    expect(emailDisplay(" GodBody4040@Gmail.com ")).toBe("godbody4040@gmail.com");
    expect(emailLink("godbody4040@gmail.com")).toBe("mailto:godbody4040@gmail.com");
  });
});

describe("place and address formatting", () => {
  it("title-cases places and upper-cases state codes", () => {
    expect(placeDisplay("New york")).toBe("New York");
    expect(placeDisplay("raleigh, nc")).toBe("Raleigh, NC");
    expect(placeDisplay("winston-salem")).toBe("Winston-Salem");
  });

  it("builds one clean address line and omits unknown parts", () => {
    expect(
      addressDisplay({ address: "12 Oak Ave", city: "new york", state: "ny", zip: "10001" }),
    ).toBe("12 Oak Ave, New York, NY 10001");
    expect(addressDisplay({})).toBeNull();
  });
});

describe("hours formatting", () => {
  it("renders a day map in order, never as an object", () => {
    const value = hoursDisplay({
      sun: "Closed",
      mon: "8:00 AM - 6:00 PM",
      sat: "9:00 AM - 4:00 PM",
    });
    expect(value).toBe("Monday: 8:00 AM - 6:00 PM\nSaturday: 9:00 AM - 4:00 PM\nSunday: Closed");
  });

  it("uses a readable summary and drops meaningless ones", () => {
    expect(hoursDisplay({ summary: "24 hours" })).toBe("24 hours");
    expect(hoursDisplay({ summary: "24" })).toBeNull();
    expect(hoursDisplay({})).toBeNull();
    expect(hoursDisplay(null)).toBeNull();
  });
});

describe("years and links", () => {
  it("never claims an implausible number of years", () => {
    expect(yearsDisplay(1)).toBe("1 year");
    expect(yearsDisplay(7)).toBe("7 years");
    expect(yearsDisplay(2022)).toBeNull();
    expect(yearsDisplay(0)).toBeNull();
    expect(yearsDisplay(null)).toBeNull();
  });

  it("only accepts absolute http(s) links", () => {
    expect(externalUrl("https://revoragrowthsystems.com")).toBe("https://revoragrowthsystems.com/");
    expect(externalUrl("javascript:alert(1)")).toBeNull();
    expect(externalUrl("not a url")).toBeNull();
  });
});

describe("business facts", () => {
  const raw = {
    phone: "96226620",
    email: "uauauauuwwuu",
    city: "new york",
    state: "new york",
    service_area: "new york, brooklyn",
    hours: { summary: "24" },
    years_in_business: 1,
    certifications: "None",
  };

  it("cleans the Elite Mobile Cars profile without inventing anything", () => {
    const facts = businessFacts(raw, "Elite Mobile Cars");
    expect(facts.businessName).toBe("Elite Mobile Cars");
    expect(facts.phone).toBeNull();
    expect(facts.phoneHref).toBeNull();
    expect(facts.email).toBeNull();
    expect(facts.city).toBe("New York");
    expect(facts.serviceArea).toBe("New York, Brooklyn");
    expect(facts.hours).toBeNull();
    expect(facts.unknownFields).toContain("phone");
    expect(facts.unknownFields).toContain("email");
    expect(facts.unknownFields).toContain("hours");
  });

  it("treats 'None' certifications as no claim", () => {
    expect(claimableFacts(businessFacts(raw)).certifications).toBeNull();
  });
});

describe("quality gate", () => {
  const base = (overrides: Partial<QualityInput> = {}): QualityInput => ({
    facts: businessFacts(
      { phone: "9196226620", email: "owner@elitemobile.co", city: "New York" },
      "Elite Mobile Cars",
    ),
    raw: { phone: "9196226620", email: "owner@elitemobile.co" },
    pages: [{ slug: "home", title: "Home", sections: 6 }],
    texts: ["Premium mobile detailing, wherever you park."],
    navLabels: ["Home", "Services", "Book online"],
    conversion: { hasPhone: true, hasBooking: true, hasQuote: true, hasContact: true },
    reviewCount: 0,
    galleryCount: 0,
    showsReviews: false,
    showsGallery: false,
    metadata: [
      {
        title: "Elite Mobile Cars — Mobile detailing in New York",
        description: "Detailing that comes to you.",
      },
    ],
    ...overrides,
  });

  it("passes a clean site on content, but is not production-ready until it is measured", () => {
    const report = auditWebsite(base());
    expect(report.blockers).toHaveLength(0);
    // Accessibility and speed are unproven without a browser check, so they
    // earn at most half — an unmeasured website can never look finished.
    expect(report.score).toBe(63);
    expect(report.ready).toBe(true);
    expect(report.measured).toBe(false);
    expect(report.productionReady).toBe(false);
  });

  it("blocks publishing on raw object text", () => {
    const report = auditWebsite(base({ texts: [{ mon: "8-6" }] }));
    expect(report.ready).toBe(false);
    expect(report.blockers.map((b) => b.key)).toContain("raw_object_text");
  });

  it("blocks publishing on malformed contact details", () => {
    const report = auditWebsite(base({ raw: { phone: "96226620", email: "uauauauuwwuu" } }));
    expect(report.blockers.map((b) => b.key)).toEqual(
      expect.arrayContaining(["invalid_phone", "invalid_email"]),
    );
  });

  it("blocks fabricated social proof and portfolio", () => {
    const report = auditWebsite(base({ showsReviews: true, showsGallery: true }));
    expect(report.blockers.map((b) => b.key)).toEqual(
      expect.arrayContaining(["reviews_without_reviews", "gallery_without_photos"]),
    );
  });

  it("blocks a blank page and an unfinished template", () => {
    const report = auditWebsite(
      base({
        pages: [{ slug: "about", title: "About", sections: 0 }],
        texts: ["Write your guarantee here"],
      }),
    );
    expect(report.blockers.map((b) => b.key)).toEqual(
      expect.arrayContaining(["empty_page", "template_leak"]),
    );
  });

  it("flags menu and metadata problems as advice, not blockers", () => {
    const report = auditWebsite(
      base({
        navLabels: ["Home", "Home", "Services", "Pricing", "About", "Reviews", "FAQ", "Contact"],
        metadata: [
          { title: "Same", description: null },
          { title: "Same", description: null },
        ],
      }),
    );
    expect(report.blockers).toHaveLength(0);
    expect(report.issues.map((i) => i.key)).toEqual(
      expect.arrayContaining([
        "nav_duplicate",
        "nav_too_long",
        "duplicate_metadata",
        "missing_description",
      ]),
    );
    expect(report.ready).toBe(false);
  });
});
