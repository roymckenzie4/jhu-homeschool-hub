/**
 * State reference table: postal abbreviation ↔ full name ↔ URL slug ↔ FIPS code.
 *
 * - `postal`  matches the column headers in the published CSV.
 * - `name`    is the canonical display name (also the key in our `byState` shape).
 * - `slug`    matches the JHU Homeschool Hub URL convention (lowercase, hyphens).
 * - `fips`    matches the GEOID/FIPS code on the us-atlas TopoJSON features.
 *
 * Covers all 50 states plus DC. Sorted alphabetically by postal for readability.
 */

export const STATES = [
  { postal: 'AK', name: 'Alaska',               slug: 'alaska',               fips: '02' },
  { postal: 'AL', name: 'Alabama',              slug: 'alabama',              fips: '01' },
  { postal: 'AR', name: 'Arkansas',             slug: 'arkansas',             fips: '05' },
  { postal: 'AZ', name: 'Arizona',              slug: 'arizona',              fips: '04' },
  { postal: 'CA', name: 'California',           slug: 'california',           fips: '06' },
  { postal: 'CO', name: 'Colorado',             slug: 'colorado',             fips: '08' },
  { postal: 'CT', name: 'Connecticut',          slug: 'connecticut',          fips: '09' },
  { postal: 'DC', name: 'District of Columbia', slug: 'district-of-columbia', fips: '11' },
  { postal: 'DE', name: 'Delaware',             slug: 'delaware',             fips: '10' },
  { postal: 'FL', name: 'Florida',              slug: 'florida',              fips: '12' },
  { postal: 'GA', name: 'Georgia',              slug: 'georgia',              fips: '13' },
  { postal: 'HI', name: 'Hawaii',               slug: 'hawaii',               fips: '15' },
  { postal: 'IA', name: 'Iowa',                 slug: 'iowa',                 fips: '19' },
  { postal: 'ID', name: 'Idaho',                slug: 'idaho',                fips: '16' },
  { postal: 'IL', name: 'Illinois',             slug: 'illinois',             fips: '17' },
  { postal: 'IN', name: 'Indiana',              slug: 'indiana',              fips: '18' },
  { postal: 'KS', name: 'Kansas',               slug: 'kansas',               fips: '20' },
  { postal: 'KY', name: 'Kentucky',             slug: 'kentucky',             fips: '21' },
  { postal: 'LA', name: 'Louisiana',            slug: 'louisiana',            fips: '22' },
  { postal: 'MA', name: 'Massachusetts',        slug: 'massachusetts',        fips: '25' },
  { postal: 'MD', name: 'Maryland',             slug: 'maryland',             fips: '24' },
  { postal: 'ME', name: 'Maine',                slug: 'maine',                fips: '23' },
  { postal: 'MI', name: 'Michigan',             slug: 'michigan',             fips: '26' },
  { postal: 'MN', name: 'Minnesota',            slug: 'minnesota',            fips: '27' },
  { postal: 'MO', name: 'Missouri',             slug: 'missouri',             fips: '29' },
  { postal: 'MS', name: 'Mississippi',          slug: 'mississippi',          fips: '28' },
  { postal: 'MT', name: 'Montana',              slug: 'montana',              fips: '30' },
  { postal: 'NC', name: 'North Carolina',       slug: 'north-carolina',       fips: '37' },
  { postal: 'ND', name: 'North Dakota',         slug: 'north-dakota',         fips: '38' },
  { postal: 'NE', name: 'Nebraska',             slug: 'nebraska',             fips: '31' },
  { postal: 'NH', name: 'New Hampshire',        slug: 'new-hampshire',        fips: '33' },
  { postal: 'NJ', name: 'New Jersey',           slug: 'new-jersey',           fips: '34' },
  { postal: 'NM', name: 'New Mexico',           slug: 'new-mexico',           fips: '35' },
  { postal: 'NV', name: 'Nevada',               slug: 'nevada',               fips: '32' },
  { postal: 'NY', name: 'New York',             slug: 'new-york',             fips: '36' },
  { postal: 'OH', name: 'Ohio',                 slug: 'ohio',                 fips: '39' },
  { postal: 'OK', name: 'Oklahoma',             slug: 'oklahoma',             fips: '40' },
  { postal: 'OR', name: 'Oregon',               slug: 'oregon',               fips: '41' },
  { postal: 'PA', name: 'Pennsylvania',         slug: 'pennsylvania',         fips: '42' },
  { postal: 'RI', name: 'Rhode Island',         slug: 'rhode-island',         fips: '44' },
  { postal: 'SC', name: 'South Carolina',       slug: 'south-carolina',       fips: '45' },
  { postal: 'SD', name: 'South Dakota',         slug: 'south-dakota',         fips: '46' },
  { postal: 'TN', name: 'Tennessee',            slug: 'tennessee',            fips: '47' },
  { postal: 'TX', name: 'Texas',                slug: 'texas',                fips: '48' },
  { postal: 'UT', name: 'Utah',                 slug: 'utah',                 fips: '49' },
  { postal: 'VA', name: 'Virginia',             slug: 'virginia',             fips: '51' },
  { postal: 'VT', name: 'Vermont',              slug: 'vermont',              fips: '50' },
  { postal: 'WA', name: 'Washington',           slug: 'washington',           fips: '53' },
  { postal: 'WI', name: 'Wisconsin',            slug: 'wisconsin',            fips: '55' },
  { postal: 'WV', name: 'West Virginia',        slug: 'west-virginia',        fips: '54' },
  { postal: 'WY', name: 'Wyoming',              slug: 'wyoming',              fips: '56' },
];

// Lookup helpers. Built once at module load; cheap and avoids repeated .find() calls.
export const BY_POSTAL = Object.fromEntries(STATES.map((s) => [s.postal, s]));
export const BY_NAME   = Object.fromEntries(STATES.map((s) => [s.name, s]));
export const BY_FIPS   = Object.fromEntries(STATES.map((s) => [s.fips, s]));

