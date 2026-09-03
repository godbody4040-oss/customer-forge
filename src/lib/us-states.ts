/**
 * Every US state (plus DC) Revora serves, with real metros and the trades that
 * benefit most from the growth system in each one.
 *
 * This powers the nationwide service-area landing pages at /states and
 * /states/$state. Every fact here is verifiable public geography — no invented
 * addresses, offices, staff or claims of a physical presence. Revora is a
 * remote service-area business, so these pages say "serves", never "located in".
 */

export interface UsState {
  slug: string;
  name: string;
  code: string;
  /** Largest real metros in the state, biggest first. */
  metros: readonly string[];
  /** Industry slugs (from INDUSTRIES) with the strongest demand locally. */
  trades: readonly string[];
}

const HOME = ["contractors", "hvac", "plumbing", "roofing"] as const;
const OUTDOOR = ["landscaping", "pressure-washing", "cleaning", "home-services"] as const;
const PERSONAL = ["barbers", "hair-stylists", "beauty", "med-spa"] as const;
const AUTO = ["auto-detailing", "contractors", "cleaning", "fitness"] as const;

export const US_STATES: readonly UsState[] = [
  { slug: "alabama", name: "Alabama", code: "AL", metros: ["Birmingham", "Montgomery", "Huntsville", "Mobile"], trades: [...HOME] },
  { slug: "alaska", name: "Alaska", code: "AK", metros: ["Anchorage", "Fairbanks", "Juneau"], trades: ["hvac", "plumbing", "contractors", "cleaning"] },
  { slug: "arizona", name: "Arizona", code: "AZ", metros: ["Phoenix", "Tucson", "Mesa", "Scottsdale"], trades: ["hvac", "pressure-washing", "auto-detailing", "med-spa"] },
  { slug: "arkansas", name: "Arkansas", code: "AR", metros: ["Little Rock", "Fayetteville", "Fort Smith"], trades: [...OUTDOOR] },
  { slug: "california", name: "California", code: "CA", metros: ["Los Angeles", "San Diego", "San Jose", "San Francisco", "Sacramento"], trades: ["auto-detailing", "med-spa", "landscaping", "photography"] },
  { slug: "colorado", name: "Colorado", code: "CO", metros: ["Denver", "Colorado Springs", "Aurora", "Fort Collins"], trades: ["roofing", "landscaping", "fitness", "contractors"] },
  { slug: "connecticut", name: "Connecticut", code: "CT", metros: ["Bridgeport", "New Haven", "Hartford", "Stamford"], trades: ["plumbing", "cleaning", "landscaping", "professional-services"] },
  { slug: "delaware", name: "Delaware", code: "DE", metros: ["Wilmington", "Dover", "Newark"], trades: [...OUTDOOR] },
  { slug: "district-of-columbia", name: "Washington, D.C.", code: "DC", metros: ["Washington"], trades: ["cleaning", "professional-services", "beauty", "fitness"] },
  { slug: "florida", name: "Florida", code: "FL", metros: ["Jacksonville", "Miami", "Tampa", "Orlando", "St. Petersburg"], trades: ["pressure-washing", "auto-detailing", "roofing", "med-spa"] },
  { slug: "georgia", name: "Georgia", code: "GA", metros: ["Atlanta", "Augusta", "Columbus", "Savannah"], trades: ["landscaping", "contractors", "barbers", "cleaning"] },
  { slug: "hawaii", name: "Hawaii", code: "HI", metros: ["Honolulu", "Hilo", "Kailua"], trades: ["photography", "cleaning", "landscaping", "beauty"] },
  { slug: "idaho", name: "Idaho", code: "ID", metros: ["Boise", "Meridian", "Nampa", "Idaho Falls"], trades: [...HOME] },
  { slug: "illinois", name: "Illinois", code: "IL", metros: ["Chicago", "Aurora", "Naperville", "Springfield"], trades: ["hvac", "plumbing", "auto-detailing", "beauty"] },
  { slug: "indiana", name: "Indiana", code: "IN", metros: ["Indianapolis", "Fort Wayne", "Evansville", "South Bend"], trades: [...HOME] },
  { slug: "iowa", name: "Iowa", code: "IA", metros: ["Des Moines", "Cedar Rapids", "Davenport"], trades: [...OUTDOOR] },
  { slug: "kansas", name: "Kansas", code: "KS", metros: ["Wichita", "Overland Park", "Kansas City", "Topeka"], trades: [...HOME] },
  { slug: "kentucky", name: "Kentucky", code: "KY", metros: ["Louisville", "Lexington", "Bowling Green"], trades: [...OUTDOOR] },
  { slug: "louisiana", name: "Louisiana", code: "LA", metros: ["New Orleans", "Baton Rouge", "Shreveport", "Lafayette"], trades: ["pressure-washing", "roofing", "barbers", "cleaning"] },
  { slug: "maine", name: "Maine", code: "ME", metros: ["Portland", "Lewiston", "Bangor"], trades: ["hvac", "contractors", "cleaning", "photography"] },
  { slug: "maryland", name: "Maryland", code: "MD", metros: ["Baltimore", "Columbia", "Germantown", "Silver Spring"], trades: ["cleaning", "pressure-washing", "med-spa", "home-services"] },
  { slug: "massachusetts", name: "Massachusetts", code: "MA", metros: ["Boston", "Worcester", "Springfield", "Cambridge"], trades: ["plumbing", "hvac", "professional-services", "beauty"] },
  { slug: "michigan", name: "Michigan", code: "MI", metros: ["Detroit", "Grand Rapids", "Warren", "Ann Arbor"], trades: ["auto-detailing", "roofing", "hvac", "barbers"] },
  { slug: "minnesota", name: "Minnesota", code: "MN", metros: ["Minneapolis", "Saint Paul", "Rochester", "Duluth"], trades: ["hvac", "plumbing", "landscaping", "fitness"] },
  { slug: "mississippi", name: "Mississippi", code: "MS", metros: ["Jackson", "Gulfport", "Southaven"], trades: [...OUTDOOR] },
  { slug: "missouri", name: "Missouri", code: "MO", metros: ["Kansas City", "St. Louis", "Springfield", "Columbia"], trades: [...HOME] },
  { slug: "montana", name: "Montana", code: "MT", metros: ["Billings", "Missoula", "Bozeman", "Great Falls"], trades: ["contractors", "landscaping", "photography", "home-services"] },
  { slug: "nebraska", name: "Nebraska", code: "NE", metros: ["Omaha", "Lincoln", "Bellevue"], trades: [...OUTDOOR] },
  { slug: "nevada", name: "Nevada", code: "NV", metros: ["Las Vegas", "Henderson", "Reno", "North Las Vegas"], trades: ["med-spa", "auto-detailing", "hvac", "photography"] },
  { slug: "new-hampshire", name: "New Hampshire", code: "NH", metros: ["Manchester", "Nashua", "Concord"], trades: ["contractors", "hvac", "cleaning", "landscaping"] },
  { slug: "new-jersey", name: "New Jersey", code: "NJ", metros: ["Newark", "Jersey City", "Paterson", "Edison"], trades: ["plumbing", "pressure-washing", "beauty", "home-services"] },
  { slug: "new-mexico", name: "New Mexico", code: "NM", metros: ["Albuquerque", "Las Cruces", "Santa Fe", "Rio Rancho"], trades: ["hvac", "roofing", "landscaping", "auto-detailing"] },
  { slug: "new-york", name: "New York", code: "NY", metros: ["New York City", "Buffalo", "Rochester", "Yonkers", "Albany"], trades: ["barbers", "beauty", "cleaning", "professional-services"] },
  { slug: "north-carolina", name: "North Carolina", code: "NC", metros: ["Charlotte", "Raleigh", "Greensboro", "Durham", "Winston-Salem"], trades: ["contractors", "pressure-washing", "landscaping", "auto-detailing"] },
  { slug: "north-dakota", name: "North Dakota", code: "ND", metros: ["Fargo", "Bismarck", "Grand Forks"], trades: ["hvac", "contractors", "cleaning", "home-services"] },
  { slug: "ohio", name: "Ohio", code: "OH", metros: ["Columbus", "Cleveland", "Cincinnati", "Toledo"], trades: ["roofing", "hvac", "auto-detailing", "barbers"] },
  { slug: "oklahoma", name: "Oklahoma", code: "OK", metros: ["Oklahoma City", "Tulsa", "Norman", "Broken Arrow"], trades: ["roofing", "contractors", "landscaping", "pressure-washing"] },
  { slug: "oregon", name: "Oregon", code: "OR", metros: ["Portland", "Salem", "Eugene", "Bend"], trades: ["pressure-washing", "landscaping", "photography", "fitness"] },
  { slug: "pennsylvania", name: "Pennsylvania", code: "PA", metros: ["Philadelphia", "Pittsburgh", "Allentown", "Erie"], trades: ["plumbing", "roofing", "cleaning", "barbers"] },
  { slug: "rhode-island", name: "Rhode Island", code: "RI", metros: ["Providence", "Warwick", "Cranston"], trades: [...OUTDOOR] },
  { slug: "south-carolina", name: "South Carolina", code: "SC", metros: ["Charleston", "Columbia", "North Charleston", "Greenville"], trades: ["pressure-washing", "landscaping", "contractors", "auto-detailing"] },
  { slug: "south-dakota", name: "South Dakota", code: "SD", metros: ["Sioux Falls", "Rapid City", "Aberdeen"], trades: [...HOME] },
  { slug: "tennessee", name: "Tennessee", code: "TN", metros: ["Nashville", "Memphis", "Knoxville", "Chattanooga"], trades: ["contractors", "barbers", "photography", "cleaning"] },
  { slug: "texas", name: "Texas", code: "TX", metros: ["Houston", "San Antonio", "Dallas", "Austin", "Fort Worth"], trades: ["hvac", "auto-detailing", "pressure-washing", "roofing"] },
  { slug: "utah", name: "Utah", code: "UT", metros: ["Salt Lake City", "West Valley City", "Provo", "St. George"], trades: ["landscaping", "med-spa", "fitness", "contractors"] },
  { slug: "vermont", name: "Vermont", code: "VT", metros: ["Burlington", "Rutland", "Montpelier"], trades: ["contractors", "hvac", "photography", "cleaning"] },
  { slug: "virginia", name: "Virginia", code: "VA", metros: ["Virginia Beach", "Richmond", "Norfolk", "Arlington"], trades: ["pressure-washing", "home-services", "med-spa", "landscaping"] },
  { slug: "washington", name: "Washington", code: "WA", metros: ["Seattle", "Spokane", "Tacoma", "Vancouver"], trades: ["pressure-washing", "roofing", "auto-detailing", "fitness"] },
  { slug: "west-virginia", name: "West Virginia", code: "WV", metros: ["Charleston", "Huntington", "Morgantown"], trades: [...HOME] },
  { slug: "wisconsin", name: "Wisconsin", code: "WI", metros: ["Milwaukee", "Madison", "Green Bay", "Kenosha"], trades: ["hvac", "roofing", "landscaping", "barbers"] },
  { slug: "wyoming", name: "Wyoming", code: "WY", metros: ["Cheyenne", "Casper", "Laramie"], trades: [...HOME] },
  { slug: "puerto-rico", name: "Puerto Rico", code: "PR", metros: ["San Juan", "Bayamón", "Ponce"], trades: ["cleaning", "beauty", "photography", "home-services"] },
];

export function findState(slug: string): UsState | undefined {
  return US_STATES.find((state) => state.slug === slug);
}

/** Alphabetical groups for a scannable index (A–C, D–I, …). */
export function statesAlphabetical(): readonly UsState[] {
  return [...US_STATES].sort((a, b) => a.name.localeCompare(b.name));
}
