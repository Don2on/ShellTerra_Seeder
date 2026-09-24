// One-off: replace em dashes (—) in displayed fields with context-fitting
// punctuation. Titles -> ":" (label/subtitle). Descriptions -> ";" (joined
// independent clauses), ":" (label/elaboration), or "," (negation contrast).
// Leaves _comment metadata untouched. Run from the seeder dir, then rebuild.
import { readFileSync, writeFileSync } from 'node:fs';

const FILES = [
  'PacificBeachActivities.json',
  'PacificBeachCrawls.json',
  'PacificBeachVendors.json',
];

// Description substring replacements (each targets one em dash occurrence).
const DESC = [
  ['Ticket required — check', 'Ticket required; check'],
  ['Reservations required — check their Eventbrite', 'Reservations required; check their Eventbrite'],
  ['runs rain or shine — check their Eventbrite', 'runs rain or shine; check their Eventbrite'],
  ['larger parties — check their Eventbrite', 'larger parties; check their Eventbrite'],
  ['well in advance — NYE inventory sells fast', 'well in advance; NYE inventory sells fast'],
  ['part of the deal — face painters', 'part of the deal; face painters'],
  ['pre-Halloween crawl — the Oct 31 version', 'pre-Halloween crawl; the Oct 31 version'],
  ['strongly encouraged — most bars will have', 'strongly encouraged; most bars will have'],
  ['EBT accepted — the information booth', 'EBT accepted; the information booth'],

  ['guided practice — not a therapy session', 'guided practice, not a therapy session'],
  ['recreational players — not a tournament', 'recreational players, not a tournament'],
  ['Social format — not a competitive round', 'Social format, not a competitive round'],

  ['second harvest — typically includes', 'second harvest: typically includes'],
  ['emotional states — a different orientation', 'emotional states: a different orientation'],
  ['Informal format — no presentations', 'Informal format: no presentations'],
  ['Pacific Beach — a HYROX-style workout circuit', 'Pacific Beach: a HYROX-style workout circuit'],
  ['Pacific Beach — eight functional fitness stations', 'Pacific Beach: eight functional fitness stations'],
  ['session of the run — no winery representative', 'session of the run: no winery representative'],
  ['single producer focus — broader sweep', 'single producer focus: broader sweep'],
  ['the evening crawls — opens up Halloween', 'the evening crawls: opens up Halloween'],
  ['VENUE UNCONFIRMED — check pbtowncouncil.org', 'VENUE UNCONFIRMED: check pbtowncouncil.org'],
  ['Zombie Crawl — Halloween itself', 'Zombie Crawl: Halloween itself'],
  ['is intentional — coaching in a park', 'is intentional: coaching in a park'],
  ['before Thanksgiving — one of the busiest', 'before Thanksgiving: one of the busiest'],
  ['START TIME IS AN ESTIMATE — confirm', 'START TIME IS AN ESTIMATE: confirm'],
  ['One-day event — ticket includes', 'One-day event: ticket includes'],
  ['holiday-themed — the sillier the better', 'holiday-themed: the sillier the better'],
  ['Social run format — designed for people', 'Social run format: designed for people'],
  ['Small venue format — closer to a house show', 'Small venue format: closer to a house show'],
  ['Format varies by week — could be', 'Format varies by week: could be'],
  ['finishing on the beach — an unusual surface mix', 'finishing on the beach: an unusual surface mix'],
  ['annual event — a free family festival', 'annual event: a free family festival'],
  ['Marena Quijano — specifically focused on IPAs', 'Marena Quijano: specifically focused on IPAs'],
  ['Social rather than competitive — pickup game format', 'Social rather than competitive: pickup game format'],
  ['Structured referral format — members pitch', 'Structured referral format: members pitch'],
  ['consistent schedule — a good weekly anchor', 'consistent schedule: a good weekly anchor'],
];

for (const f of FILES) {
  let s = readFileSync(f, 'utf8');
  const before = s;

  // Titles: em dash -> colon, scoped to "title" values only.
  s = s.replace(/("title":\s*")([^"]*)(")/g, (_m, p1, val, p3) =>
    p1 + val.replace(/\s*—\s*/g, ': ') + p3);

  // Descriptions: context-specific substring swaps.
  for (const [oldStr, newStr] of DESC) s = s.split(oldStr).join(newStr);

  // Report any em dash left in a title/description (should be none).
  const leftovers = (s.match(/"(?:title|description)":\s*"[^"]*—[^"]*"/g) || []);
  const changed = s !== before ? 'CHANGED' : 'unchanged';
  console.log(`${f}: ${changed}, ${leftovers.length} em dash leftover(s) in title/description`);
  for (const l of leftovers) console.log('   LEFT:', l);

  if (s !== before) writeFileSync(f, s);
}
