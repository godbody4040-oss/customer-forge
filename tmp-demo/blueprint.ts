import { buildContentBlueprint } from "../src/lib/website-content";
const orgId = "11111111-1111-4111-8111-111111111111";
const services = [
  {
    name: "Full Interior Detail",
    description:
      "Deep extraction of carpets and upholstery, steam-cleaned surfaces, leather conditioning and glass polish.",
    price: 249,
    starting_price: 199,
  },
  {
    name: "Exterior Wash & Seal",
    description:
      "Two-bucket hand wash, iron decontamination, clay treatment and a six-month paint sealant.",
    price: 179,
    starting_price: 149,
  },
  {
    name: "Paint Correction",
    description:
      "Single or two-stage machine polish that removes swirls, oxidation and light scratches.",
    price: 699,
    starting_price: 499,
  },
  {
    name: "Ceramic Coating",
    description:
      "Professional-grade 5-year ceramic coating with prep, correction and cure time included.",
    price: 1400,
    starting_price: 1200,
  },
  {
    name: "Engine Bay Cleaning",
    description: "Safe degrease, agitate and dress of the full engine bay.",
    price: 95,
    starting_price: 95,
  },
  {
    name: "Fleet Maintenance Detail",
    description: "Recurring exterior and interior upkeep for vans, trucks and company vehicles.",
    price: null,
    starting_price: 120,
  },
];
const bp = buildContentBlueprint({
  organizationId: orgId,
  businessName: "Elite Mobile Detailing",
  industry: "Auto Detailing",
  city: "Austin",
  state: "TX",
  serviceArea: "Austin, Round Rock, Cedar Park, Pflugerville and Georgetown",
  description:
    "Elite Mobile Detailing brings full interior and exterior detailing, paint correction and ceramic coating directly to your driveway across the Austin metro. Fully insured, water and power included, same-week availability.",
  phone: "(512) 555-0142",
  email: "hello@elitemobiledetailing.example",
  hasHours: true,
  photoCount: 0,
  reviewCount: 3,
  ctaLabel: "Get my price",
  services,
  benefits: [],
  faqs: [],
} as never);
console.log(JSON.stringify(bp));
