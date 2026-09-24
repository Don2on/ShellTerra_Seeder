#!/usr/bin/env node
/**
 * build-la-food-vendors.mjs — derive the OC provider directory from
 * LAFoodDistribution.json (mirror of build-oc-food-vendors.mjs).
 *
 * Groups the food-distribution occurrences by provider (`seriesSlug`) into one
 * vendor row each for the app's "Vendors" tab, carrying that provider's dated
 * occurrences as events[]. The dated activities are seeded separately by
 * seed-activities.mjs --no-host-grouping, so the Activities tab shows each
 * distribution as its own card and vendor cards live only in the Vendors tab.
 *
 * _deferred providers (CSFP senior boxes, mobile pop-ups, registration-only,
 * the food-bank hub) become event-less "call ahead" cards.
 *
 * Usage: node build-la-food-vendors.mjs   (writes OCFoodVendors.json)
 */
import { readFileSync, writeFileSync } from 'node:fs';

const SRC = './LAFoodDistribution.json';
const OUT = './LAFoodVendors.json';
const SHELL = 'FoodDistributionLA';
const SHELL_ID = '6aac35a4c154a0ac014f'; // FoodDistributionLA shell (kept; 2026-09-17)

const mode = (arr) => {
  const c = {}; let best = arr[0], n = 0;
  for (const x of arr) { c[x] = (c[x] || 0) + 1; if (c[x] > n) { n = c[x]; best = x; } }
  return best;
};
const cleanAddr = (a) => (a || '').trim();
const slugify = (s) => (s || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

// ---- human-readable opening/closing hours from the structured schedule ----
// recurDays is Dart Mon=1..Sun=7 for weekly ("3,4,5"), or "n:dow" for monthly
// nth-weekday ("1:3,3:3" = 1st & 3rd Wed). start/end carry the open/close time.
const DART_ABBR = { 1: 'Mon', 2: 'Tue', 3: 'Wed', 4: 'Thu', 5: 'Fri', 6: 'Sat', 7: 'Sun' };
const ORD = { '1': '1st', '2': '2nd', '3': '3rd', '4': '4th', '-1': 'last' };

const fmt12 = (hhmm) => {
  if (!hhmm) return '';
  const [h, m] = hhmm.split(':').map(Number);
  const mer = h >= 12 ? 'PM' : 'AM';
  const hh = h % 12 === 0 ? 12 : h % 12;
  return m ? `${hh}:${String(m).padStart(2, '0')} ${mer}` : `${hh} ${mer}`;
};
const fmtRange = (open, close) =>
  !open ? '' : !close ? fmt12(open) : `${fmt12(open)}–${fmt12(close)}`;

// "3,4,5" -> "Wed–Fri"; "1,3,5" -> "Mon, Wed, Fri"
const collapseDays = (nums) => {
  const runs = []; let s = nums[0], p = nums[0];
  for (let i = 1; i < nums.length; i++) {
    if (nums[i] === p + 1) p = nums[i];
    else { runs.push([s, p]); s = nums[i]; p = nums[i]; }
  }
  runs.push([s, p]);
  return runs.map(([a, b]) => a === b ? DART_ABBR[a] : `${DART_ABBR[a]}–${DART_ABBR[b]}`).join(', ');
};

const hoursForItem = (it) => {
  const open = it.start ? String(it.start).slice(11, 16) : '';
  const close = it.end ? String(it.end).slice(11, 16) : '';
  const times = fmtRange(open, close);
  if (it.recurrence?.frequency === 'monthly') {
    const parts = String(it.recurDays || '').split(',').filter(Boolean)
      .map((p) => { const [n, dow] = p.split(':').map(Number); return { n, dow }; });
    if (!parts.length) return times;
    const ords = parts.map((p) => ORD[String(p.n)] || `${p.n}th`).join(' & ');
    return `${ords} ${DART_ABBR[parts[0].dow]}${times ? `, ${times}` : ''}`;
  }
  const nums = String(it.recurDays || '').split(',').filter(Boolean).map(Number).sort((a, b) => a - b);
  const days = nums.length ? collapseDays(nums) : '';
  return [days, times].filter(Boolean).join(', ');
};

// One vendor may have several distinct time blocks -> join, deduped, preserving order.
const buildHours = (acts) => {
  const segs = [];
  for (const a of acts.filter((x) => x.start)) {
    const s = hoursForItem(a);
    if (s && !segs.includes(s)) segs.push(s);
  }
  return segs.join('; ');
};

// Lift a US phone number out of free text ("Phone: (714) 897-6670").
const findPhone = (text) => {
  const m = (text || '').match(/\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}/);
  return m ? m[0].trim() : '';
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
  // schedulePattern holds the human schedule text for this provider.
  const pattern = acts.map((a) => a.schedulePattern).find(Boolean) || '';
  const tagline = (pattern ? pattern : 'Community food distribution')
    + (org ? ` · ${org}` : '');

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
    tagline: tagline.slice(0, 255),
    description:
      `Free food distribution site${org ? ` (via ${org})` : ''}. ${pattern ? `Schedule: ${pattern}. ` : ''}Call ahead to confirm hours — distributions often end early when supplies run out, and schedules change with holidays and weather.`,
    logoUrl: '', website, phone, email: '',
    instagram: '', facebook: '', tiktok: '',
    address, lat: rep.lat ?? null, lng: rep.lng ?? null,
    neighborhood: '', hours: buildHours(acts), featured: false, verified: false,
    events, _eventCount: events.length,
  });
}

// _deferred: real sites with no fixed/predictable public schedule — cards, no events.
for (const [key, d] of Object.entries(deferred)) {
  vendors.push({
    slug: key,
    name: d.title || key,
    category: 'Food Assistance',
    tagline: (d.eligibility && /senior/i.test(d.eligibility)
      ? 'Seniors 60+ · call ahead — schedule rotates'
      : 'Call ahead — no fixed schedule').slice(0, 255),
    description: d.status || 'Free food distribution site. Call ahead for current days and hours.',
    logoUrl: '', website: d.sourceUrl || '', phone: d.phone || findPhone(d.status), email: '',
    instagram: '', facebook: '', tiktok: '',
    address: cleanAddr(d.address), lat: d.lat ?? null, lng: d.lng ?? null,
    neighborhood: '', hours: 'Call ahead — schedule varies', featured: false, verified: false,
    events: [], _eventCount: 0,
  });
}

const out = {
  _comment: 'LA food-distribution PROVIDER directory derived from LAFoodDistribution.json (seriesSlug grouping). Providers are food banks/pantries/churches/schools, not businesses; category fixed to Food Assistance. Tagline from schedulePattern + sourceOrg. _deferred sites (CSFP senior boxes, mobile pop-ups, registration-only, food-bank hub) appear as event-less "call ahead" cards.',
  _shell: SHELL,
  _shellId: SHELL_ID,
  _collection: 'vendors',
  _source: 'LAFoodDistribution.json (Los Angeles Regional Food Bank pantry-locator partner agencies across LA County — Sep 2026).',
  _verify_before_running: 'Confirm _shellId matches the seeded activities shell (6aac35a4c154a0ac014f). _eventCount is informational; the seeder ignores it.',
  vendors,
};

writeFileSync(OUT, JSON.stringify(out, null, 2));
console.log(`Wrote ${OUT}: ${vendors.length} providers (${groups.size} scheduled + ${Object.keys(deferred).length} deferred) from ${items.length} occurrences.`);
console.log(`Total events attached: ${vendors.reduce((s, v) => s + v.events.length, 0)}`);
console.log(`With phone: ${vendors.filter((v) => v.phone).length}   with website: ${vendors.filter((v) => v.website).length}   with coords: ${vendors.filter((v) => v.lat != null).length}`);
