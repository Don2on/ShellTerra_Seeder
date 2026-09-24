#!/usr/bin/env node
/**
 * build-food-vendors.mjs — derive a provider directory from SDFoodDistribution.json.
 *
 * Groups the food-distribution occurrences by provider (`seriesSlug`) and emits
 * one vendor row per provider so the app's "Vendors" tab shows the ORGANISATIONS
 * running the distributions. Each provider's dated occurrences ride along as
 * events[] (rendered only in the vendor-event pull-up sheet, never inline).
 *
 * The dated activities themselves are seeded separately by seed-activities.mjs
 * with --no-host-grouping, so the Activities tab shows each distribution as its
 * own single card and the ONLY vendor cards live in the Vendors tab.
 *
 * Providers are food banks / pantries / churches / schools, not businesses, so
 * category is fixed to 'Food Assistance'. Phone is lifted from the description
 * ("Phone: ..."). schedulePattern + sourceOrg drive the tagline. `_deferred`
 * providers (real sites with no fixed published schedule) are emitted as cards
 * with no events and a "call ahead" note.
 *
 * Usage: node build-food-vendors.mjs   (writes SDFoodVendors.json)
 */
import { readFileSync, writeFileSync } from 'node:fs';

const SRC = './SDFoodDistribution.json';
const OUT = './SDFoodVendors.json';
const SHELL = 'SDFoodDistribution';
const SHELL_ID = '6a84dbe4ec8215c0345e'; // "SD Food Distribution" shell (activities seeded here)

const slugify = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const mode = (arr) => {
  const c = {}; let best = arr[0], n = 0;
  for (const x of arr) { c[x] = (c[x] || 0) + 1; if (c[x] > n) { n = c[x]; best = x; } }
  return best;
};
const cleanAddr = (a) => (a || '').trim();

// Lift a US phone number out of the free-text description ("Phone: 760-439-1244").
const findPhone = (text) => {
  const m = (text || '').match(/\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}/);
  return m ? m[0].trim() : '';
};
// "weekly" -> "Weekly food distribution"; empty -> generic.
const scheduleTagline = (pattern, org) => {
  const p = (pattern || '').trim();
  const base = p ? `${p.charAt(0).toUpperCase()}${p.slice(1)} food distribution` : 'Community food distribution';
  return org ? `${base} · ${org}` : base;
};

const raw = JSON.parse(readFileSync(SRC, 'utf8'));
const items = raw.items || [];
const deferred = raw._deferred || {};

// Group occurrences by provider series.
const groups = new Map();
for (const it of items) {
  const key = it.seriesSlug || slugify(it.locationName || it.title || '');
  if (!key) continue;
  if (!groups.has(key)) groups.set(key, []);
  groups.get(key).push(it);
}

const vendors = [];
for (const [key, acts] of [...groups.entries()].sort((a, b) => b[1].length - a[1].length)) {
  const names = acts.map((a) => (a.locationName || '').trim()).filter(Boolean);
  const name = names.length ? mode(names) : (acts[0].title || key);
  const addrs = acts.map((a) => cleanAddr(a.address)).filter(Boolean);
  const address = addrs.length ? mode(addrs) : '';
  const rep = acts.find((a) => cleanAddr(a.address) === address && a.lat != null)
    || acts.find((a) => a.lat != null) || acts[0];

  const phone = findPhone(acts.map((a) => a.description).find((d) => findPhone(d)) || '');
  const org = acts.map((a) => a.sourceOrg).find(Boolean) || '';
  const website = acts.map((a) => a.url).find(Boolean) || '';
  const tagline = scheduleTagline(acts.map((a) => a.schedulePattern).find(Boolean), org);

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
    slug: key,
    name,
    category: 'Food Assistance',
    tagline,
    description:
      `Free food distribution site${org ? ` (via ${org})` : ''}. Call ahead to confirm hours — distributions often end early when supplies run out, and schedules change with holidays and weather. See the schedule below for distribution days and times.`,
    logoUrl: '', website, phone, email: '',
    instagram: '', facebook: '', tiktok: '',
    address, lat: rep.lat ?? null, lng: rep.lng ?? null,
    neighborhood: '', hours: '', featured: false, verified: false,
    events, _eventCount: events.length,
  });
}

// _deferred: real sites with no fixed published schedule — cards, no events.
for (const [key, d] of Object.entries(deferred)) {
  vendors.push({
    slug: key,
    name: d.title || key,
    category: 'Food Assistance',
    tagline: 'Call ahead — no fixed schedule',
    description:
      `${d.status || 'Free food distribution site with no fixed published schedule. Call ahead for current days and hours.'}`,
    logoUrl: '', website: '', phone: findPhone(d.status), email: '',
    instagram: '', facebook: '', tiktok: '',
    address: cleanAddr(d.address), lat: d.lat ?? null, lng: d.lng ?? null,
    neighborhood: '', hours: '', featured: false, verified: false,
    events: [], _eventCount: 0,
  });
}

const out = {
  _comment: 'SD food-distribution PROVIDER directory derived from SDFoodDistribution.json (seriesSlug grouping). Providers are food banks/pantries/churches/schools, not businesses; category fixed to Food Assistance. Phone lifted from descriptions; website from source org url; tagline from schedulePattern + sourceOrg. _deferred sites appear as event-less "call ahead" cards.',
  _shell: SHELL,
  _shellId: SHELL_ID,
  _collection: 'vendors',
  _source: 'SDFoodDistribution.json (Feeding San Diego, San Diego Food Bank, JFS, Salvation Army, FHCSD, SD City College — Sep 2026).',
  _verify_before_running: 'Confirm _shellId matches the seeded activities shell (6a84dbe4ec8215c0345e). _eventCount is informational; the seeder ignores it.',
  _fields: 'See BlackCommerceSD.json _fields.',
  vendors,
};

writeFileSync(OUT, JSON.stringify(out, null, 2));
console.log(`Wrote ${OUT}: ${vendors.length} providers (${groups.size} scheduled + ${Object.keys(deferred).length} deferred) from ${items.length} occurrences.`);
console.log(`Total events attached: ${vendors.reduce((s, v) => s + v.events.length, 0)}`);
console.log(`With phone: ${vendors.filter((v) => v.phone).length}   with website: ${vendors.filter((v) => v.website).length}   with coords: ${vendors.filter((v) => v.lat != null).length}`);
