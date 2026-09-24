#!/usr/bin/env node
/**
 * build-planning-vendors.mjs — derive a directory of San Diego Community
 * Planning Groups from SDCommunityPlanningGroups.json.
 *
 * Same approach as build-food-vendors.mjs, but grouped by `seriesId` (each
 * planning group) instead of locationName, and pulling canonical group metadata
 * (title, venue, address, meeting rule, city URL) from the source `_series` map.
 *
 * Each group becomes ONE vendor card in the app's Vendors tab; its individual
 * meeting occurrences ride along as events[] (rendered only in the vendor-event
 * pull-up sheet). The dated meeting activities themselves are seeded separately
 * by seed-activities.mjs with --no-host-grouping, so the Activities tab shows
 * each meeting as its own single card and the ONLY vendor cards live here.
 *
 * Category is fixed to 'Community Planning'. Groups that meet virtually / with
 * no fixed venue (_noFixedLocation) are intentionally NOT emitted: there is no
 * location to anchor a card to and they have no dated occurrences.
 *
 * Usage: node build-planning-vendors.mjs   (writes SDCommunityPlanningVendors.json)
 */
import { readFileSync, writeFileSync } from 'node:fs';

const SRC = './SDCommunityPlanningGroups.json';
const OUT = './SDCommunityPlanningVendors.json';
const SHELL = 'CommunityPlanningGroups';
const SHELL_ID = '6aa6fe27dcd327fd7e31'; // "Community Planning Groups" shell

const raw = JSON.parse(readFileSync(SRC, 'utf8'));
const items = raw.items || [];
const series = raw._series || {};

// Group occurrences by planning group.
const groups = new Map();
for (const it of items) {
  const sid = it.seriesId;
  if (!sid) continue;
  if (!groups.has(sid)) groups.set(sid, []);
  groups.get(sid).push(it);
}

const vendors = [];
for (const [sid, acts] of [...groups.entries()].sort((a, b) => b[1].length - a[1].length)) {
  const meta = series[sid] || {};
  const rep = acts.find((a) => a.lat != null) || acts[0];
  const name = meta.title || acts[0].title || sid;
  const ruleText = meta.ruleText || '';
  const dark = Array.isArray(meta.darkMonths) && meta.darkMonths.length
    ? ` Goes dark: months ${meta.darkMonths.join(', ')}.`
    : '';

  const events = acts
    .filter((a) => a.start)
    .map((a) => ({
      title: a.title || name,
      date: String(a.start).slice(0, 10),
      time: String(a.start).slice(11, 16),
      description: a.description || '',
    }))
    .sort((a, b) => a.date.localeCompare(b.date));

  vendors.push({
    slug: sid, // already unique + slug-shaped, e.g. "cpg-barrio-logan"
    name,
    category: 'Community Planning',
    tagline: ruleText || 'San Diego community planning group',
    description:
      `Volunteer community planning group advising the City of San Diego on land use and development. ${ruleText ? `Regular meeting: ${ruleText.replace(/\.$/, '')}.` : ''}${dark} Meetings are open to the public with time for community comment. Agendas post to the City site as a courtesy and legal notice goes up at the venue 72 hours ahead, so confirm the agenda before you go. See the schedule below for upcoming meeting dates.`.replace(/\s+/g, ' ').trim(),
    logoUrl: '', website: meta.url || '', phone: '', email: '',
    instagram: '', facebook: '', tiktok: '',
    address: (meta.address || rep.address || '').trim(),
    lat: rep.lat ?? null, lng: rep.lng ?? null,
    neighborhood: meta.locationName || '', hours: '', featured: false, verified: false,
    events, _eventCount: events.length,
  });
}

const out = {
  _comment: 'San Diego Community Planning Group directory derived from SDCommunityPlanningGroups.json (seriesId grouping). One card per group; dated meeting occurrences ride along as events[]. Category fixed to Community Planning. Virtual/no-fixed-location groups are omitted (no venue to anchor, no occurrences).',
  _shell: SHELL,
  _shellId: SHELL_ID,
  _collection: 'vendors',
  _source: 'City of San Diego Community Planning Groups Contact List (sandiego.gov).',
  _verify_before_running: 'Confirm _shellId matches the seeded activities shell (6aa6fe27dcd327fd7e31). _eventCount is informational; the seeder ignores it.',
  _fields: 'See BlackCommerceSD.json _fields.',
  vendors,
};

writeFileSync(OUT, JSON.stringify(out, null, 2));
console.log(`Wrote ${OUT}: ${vendors.length} planning groups from ${items.length} meeting occurrences.`);
console.log(`Total events attached: ${vendors.reduce((s, v) => s + v.events.length, 0)}`);
console.log(`With website: ${vendors.filter((v) => v.website).length}   with coords: ${vendors.filter((v) => v.lat != null).length}`);
for (const v of vendors) console.log(`  ${String(v._eventCount).padStart(2)}  ${v.name}`);
