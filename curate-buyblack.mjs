#!/usr/bin/env node
/**
 * curate-buyblack.mjs — Phase 1 of the buyblack.org import for BlackCommerceSD.
 *
 * Deterministic curation BEFORE the enrichment workflow:
 *   1. Drop an explicit denylist (illegal/spam + obvious non-Black national chains
 *      / non-businesses). Clear cases only; ambiguous ones are left for the
 *      enrichment agents to verify (they return a drop flag).
 *   2. Drop rows whose business already exists in the curated BlackCommerceSD.json
 *      (matched on normalized name) OR is in its _excluded list.
 *   3. Collapse internal same-name duplicates into ONE candidate that carries every
 *      member's address/phone/zip/neighborhood/description as locations[] (so e.g.
 *      Ali's Chicken & Waffles becomes a single card with both City Heights spots).
 *
 * Output:
 *   buyblack-candidates.json  — unique businesses to enrich (Phase 2 workflow input)
 *   buyblack-dropped.json     — what was dropped and why (for sign-off)
 *
 * Usage: node curate-buyblack.mjs
 */
import { readFileSync, writeFileSync } from 'node:fs';

const IMPORT = './BlackCommerceSD-buyblack.json';
const EXISTING = './BlackCommerceSD.json';

const norm = (s) => (s || '')
  .toLowerCase()
  .normalize('NFKD').replace(/[̀-ͯ]/g, '')   // strip accents
  .replace(/&/g, 'and')
  .replace(/[^a-z0-9]+/g, ' ')
  .trim();

// Egregious drops only — spam/illegal, non-businesses, and national chains that
// buyblack.org is known to mis-tag. Ambiguous cases are NOT here; the enrichment
// agents verify Black ownership / open status and flag their own drops.
const DENY_SLUGS = new Set([
  'buying-online-shop',                 // advertises selling cocaine online — illegal
  'setup-brother-com',                  // printer-setup spam, not a business
  'anytime-fitness',                    // national franchise
  'pure-barre',                         // national franchise
  'evans-tire-service-centers',         // regional chain, not Black-owned
  'fastsigns-of-san-diego-ca-south-bay',// national franchise
  'sapphire-indian-cuisine',            // not Black-owned
  'mankind-weed-dispensary-delivery',   // not Black-owned
  'university-of-san-diego-school-of-law', // institution mis-tag
]);

const imp = JSON.parse(readFileSync(IMPORT, 'utf8'));
const existing = JSON.parse(readFileSync(EXISTING, 'utf8'));
const rows = imp.vendors || [];

// Names already represented in the curated directory (seeded) + explicitly excluded.
const existingNames = new Set((existing.vendors || []).map((v) => norm(v.name)));
const excludedArr = Array.isArray(existing._excluded)
  ? existing._excluded
  : Object.values(existing._excluded || {});
for (const e of excludedArr) existingNames.add(norm(e.name || e.slug || ''));

const dropped = { illegalOrChain: [], alreadyInDirectory: [] };
const kept = [];
for (const r of rows) {
  if (DENY_SLUGS.has(r.slug)) { dropped.illegalOrChain.push({ slug: r.slug, name: r.name }); continue; }
  if (existingNames.has(norm(r.name))) { dropped.alreadyInDirectory.push({ slug: r.slug, name: r.name }); continue; }
  kept.push(r);
}

// Collapse internal same-name dupes into one candidate carrying all locations.
const groups = new Map();
for (const r of kept) {
  const key = norm(r.name);
  if (!groups.has(key)) groups.set(key, []);
  groups.get(key).push(r);
}

const candidates = [];
for (const [key, members] of groups) {
  const primary = members.find((m) => m.description) || members[0];
  candidates.push({
    slug: primary.slug.replace(/-\d+$/, ''),          // canonical slug (strip -2/-3)
    name: primary.name,
    category: primary.category || '',
    tagline: primary.tagline || '',
    description: members.map((m) => m.description).find(Boolean) || '',
    phones: [...new Set(members.map((m) => m.phone).filter(Boolean))],
    zips: [...new Set(members.map((m) => m._zip).filter(Boolean))],
    neighborhoods: [...new Set(members.map((m) => m.neighborhood).filter(Boolean))],
    sourceUrls: members.map((m) => m._sourceUrl).filter(Boolean),
    memberSlugs: members.map((m) => m.slug),
    locationCount: members.length,
  });
}

writeFileSync('./buyblack-candidates.json', JSON.stringify(candidates, null, 2));
writeFileSync('./buyblack-dropped.json', JSON.stringify(dropped, null, 2));

const multi = candidates.filter((c) => c.locationCount > 1);
console.log(`rows in:              ${rows.length}`);
console.log(`dropped illegal/chain: ${dropped.illegalOrChain.length}  (${dropped.illegalOrChain.map((d) => d.slug).join(', ')})`);
console.log(`dropped already-have:  ${dropped.alreadyInDirectory.length}  (${dropped.alreadyInDirectory.map((d) => d.name).join(', ')})`);
console.log(`unique candidates:     ${candidates.length}`);
console.log(`  multi-location:      ${multi.length}  (${multi.map((c) => `${c.name}×${c.locationCount}`).join(', ')})`);
