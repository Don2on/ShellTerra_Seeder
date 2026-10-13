#!/usr/bin/env node
/**
 * prepare-longbeach-food.mjs — build the seeder input for the dedicated
 * FoodDistributionLongBeach shell from two sources:
 *
 *   1) LongBeachFood-raw.json — 23 sites transcribed from the City of Long
 *      Beach "Long Beach Food Distributions" PDF. Addresses only (no coords),
 *      so each is GEOCODED via Mapbox (constrained to a Long Beach bbox). The
 *      PDF's structured weekly/monthly schedule is emitted as native recurrence
 *      (weekly weekday-set OR monthly nth-weekday), one rolling doc per pattern,
 *      exactly like prepare-food-data-la.mjs.
 *
 *   2) LAFoodDistribution.json — the Long Beach subset already scraped from the
 *      LA Regional Food Bank locator (coords included). Copied in verbatim so
 *      the new shell is a comprehensive Long Beach map. The 3 sites that appear
 *      in BOTH sources (COA, Crossroads, Salvation Army — matched by street
 *      address) are dropped from the LA copy so they aren't double-listed; the
 *      richer PDF version wins.
 *
 * Writes LongBeachFoodDistribution.json ({_meta,_deferred,items}) plus
 * longbeach-geocode-review.txt — READ IT before seeding; a wrong pin sends
 * someone hungry to the wrong place.
 *
 * USAGE: node --env-file=.env prepare-longbeach-food.mjs
 */
import { readFileSync, writeFileSync } from 'node:fs';
import process from 'node:process';

const TOKEN = process.env.MAPBOX_TOKEN;
if (!TOKEN) { console.error('Set MAPBOX_TOKEN (node --env-file=.env prepare-longbeach-food.mjs)'); process.exit(1); }

const RAW = './LongBeachFood-raw.json';
const LA  = './LAFoodDistribution.json';
const OUT = './LongBeachFoodDistribution.json';
const REVIEW = './longbeach-geocode-review.txt';
const SOURCE_ORG = 'City of Long Beach Dept. of Health & Human Services';
const SOURCE_URL = 'https://www.longbeach.gov/health/healthy-living/community/nutrition/';

/* ---------------- date anchors (same scheme as prepare-food-data-la) ------- */
const ANCHOR = (() => {
  const now = new Date();
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); // Monday of this week
  return d;
})();
const fmtDate = (d) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
const PAST_ANCHOR = (() => { const d = new Date(ANCHOR); d.setDate(d.getDate()-7); return fmtDate(d); })();
function nextDateForDow(dow) {
  const jsDow = dow === 7 ? 0 : dow; // JS Sun=0..Sat=6
  const d = new Date(ANCHOR);
  d.setDate(d.getDate() + ((jsDow - d.getDay() + 7) % 7));
  return fmtDate(d);
}

/* ---------------- human schedule text ------------------------------------- */
const DART_ABBR = { 1: 'Mon', 2: 'Tue', 3: 'Wed', 4: 'Thu', 5: 'Fri', 6: 'Sat', 7: 'Sun' };
const ORD = { 1: '1st', 2: '2nd', 3: '3rd', 4: '4th', 5: '5th', '-1': 'last' };
const t12 = (hhmm) => { if (!hhmm) return ''; let [h, m] = hhmm.split(':').map(Number); const ap = h >= 12 ? 'PM' : 'AM'; h = h % 12 || 12; return m ? `${h}:${String(m).padStart(2,'0')} ${ap}` : `${h} ${ap}`; };
const timeRange = (o, c) => !o ? '' : !c ? `from ${t12(o)}` : `${t12(o)}–${t12(c)}`;
const collapseDays = (nums) => {
  const s = [...nums].sort((a,b)=>a-b); const runs=[]; let a=s[0], p=s[0];
  for (let i=1;i<s.length;i++){ if(s[i]===p+1)p=s[i]; else {runs.push([a,p]);a=s[i];p=s[i];} }
  runs.push([a,p]);
  return runs.map(([x,y])=>x===y?DART_ABBR[x]:`${DART_ABBR[x]}–${DART_ABBR[y]}`).join(', ');
};
function scheduleText(sc) {
  const time = timeRange(sc.open, sc.close);
  let when;
  if (sc.freq === 'weekly') when = collapseDays(sc.days);
  else when = sc.patterns.map(p => `${ORD[p.n] || p.n+'th'} ${DART_ABBR[p.dow]}`).join(' & ');
  const label = sc.note ? ` (${sc.note})` : '';
  return `${when} ${time}${label}`.trim();
}

/* ---------------- geocode (Long Beach + immediate neighbors) --------------- */
const LB_BBOX = '-118.26,33.72,-118.00,33.89';
async function geocode(addr) {
  const q = addr.replace(/,?\s*USA$/i, '').trim();
  const url = 'https://api.mapbox.com/geocoding/v5/mapbox.places/' + encodeURIComponent(q)
    + `.json?access_token=${TOKEN}&country=us&limit=1&proximity=-118.16,33.80&bbox=${LB_BBOX}`;
  const res = await fetch(url); if (!res.ok) throw new Error('Mapbox ' + res.status);
  const f = (await res.json()).features?.[0]; if (!f) return null;
  const [lng, lat] = f.center;
  return { lat, lng, matched: f.place_name, relevance: f.relevance, acc: f.properties?.accuracy || f.place_type?.[0] || '?' };
}
const PRECISE = new Set(['rooftop', 'parcel', 'address', 'point', 'interpolated']);

/* ---------------- slug helpers -------------------------------------------- */
const usedSlugs = new Set();
const slugify = (s) => (s || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 52);
function uniqueSlug(base) { let s = base || 'site'; let i = 2; while (usedSlugs.has(s)) s = `${base}-${i++}`; usedSlugs.add(s); return s; }

function buildDescription(name, fullSched, phone, notes) {
  const parts = [`Free food distribution at ${name}.`];
  if (fullSched) parts.push(`Schedule: ${fullSched}.`);
  if (notes) parts.push(notes);
  parts.push(phone
    ? `Call ${phone} to confirm before you go — hours change with holidays and weather, and distributions often end early when supplies run out.`
    : 'Confirm hours before you go — distributions often end early when supplies run out.');
  parts.push('Source: City of Long Beach food-distribution guide.');
  return parts.join(' ');
}

/* ---------------- main ---------------------------------------------------- */
const raw = JSON.parse(readFileSync(RAW, 'utf8'));
const review = [];
const items = [];
const deferred = {};
let flagged = 0, dropped = 0;

for (const s of raw.sites) {
  let geo = null;
  try { geo = await geocode(s.address); } catch (e) { review.push(`ERROR ${s.name}: ${e.message}`); }
  if (!geo || geo.relevance < 0.5) { review.push(`DROP (no/low geocode) ${s.name} | ${s.address}`); dropped++; continue; }
  const bad = geo.relevance < 0.7 || !PRECISE.has(geo.acc);
  if (bad) { flagged++; review.push(`FLAG rel${geo.relevance.toFixed(2)}/${geo.acc}  ${s.name}\n    in: ${s.address}\n    -> ${geo.matched}`); }
  else review.push(`ok  ${s.name} -> ${geo.matched} [${geo.acc}]`);

  const provKey = uniqueSlug('lb-' + slugify(s.name));
  const fullSched = s.schedules.map(scheduleText).join('; ');
  const description = buildDescription(s.name, fullSched, s.phone, s.notes);
  const base = {
    kind: 'activity', slug: provKey, seriesSlug: provKey,
    title: `${s.name} — Free Food Distribution`,
    description, locationName: s.name, address: s.address.replace(/,?\s*USA$/i, '').trim(),
    lat: geo.lat, lng: geo.lng,
    category: 'food-assistance', sourceOrg: SOURCE_ORG, url: SOURCE_URL,
    schedulePattern: fullSched,
  };

  for (const sc of s.schedules) {
    if (sc.freq === 'weekly') {
      const days = [...sc.days].sort((a, b) => a - b);
      items.push({
        ...base,
        slug: uniqueSlug(`${provKey}-w${days.join('')}-${sc.open.replace(':', '')}`),
        start: `${PAST_ANCHOR}T${sc.open}`,
        end: sc.close ? `${PAST_ANCHOR}T${sc.close}` : null,
        recurrence: { frequency: 'weekly' }, recurDays: days.join(','),
      });
    } else { // monthly
      const patterns = sc.patterns.map(p => ({ n: p.n, dayOfWeek: p.dow }));
      const first = nextDateForDow(patterns[0].dayOfWeek);
      items.push({
        ...base,
        slug: uniqueSlug(`${provKey}-m${patterns.map(p => p.n + '' + p.dayOfWeek).join('')}-${sc.open.replace(':', '')}`),
        start: `${first}T${sc.open}`,
        end: sc.close ? `${first}T${sc.close}` : null,
        recurrence: { frequency: 'monthly', nthWeekdays: patterns },
        recurDays: patterns.map(p => `${p.n}:${p.dayOfWeek}`).join(','),
      });
    }
  }
}

/* ---- merge Long Beach subset from the LA Regional Food Bank data ---------- */
// Drop the 3 sites that also appear in the PDF (matched by street address).
const OVERLAP = ['515 e. 3rd', '1900 e. south', '3092 long beach'];
const isLB = (a) => /long ?beach/i.test(JSON.stringify(a));
const la = JSON.parse(readFileSync(LA, 'utf8'));
let laCopied = 0, laDroppedOverlap = 0;
for (const it of (la.items || [])) {
  if (!isLB(it)) continue;
  const addrLc = (it.address || '').toLowerCase();
  if (OVERLAP.some(o => addrLc.includes(o))) { laDroppedOverlap++; continue; }
  // keep slug distinct from PDF-derived items (they're already 'lb-' prefixed)
  items.push({ ...it });
  laCopied++;
}
// carry over any Long Beach call-ahead (deferred) sites from the LA data
for (const [k, d] of Object.entries(la._deferred || {})) {
  if (!isLB(d)) continue;
  const addrLc = (d.address || '').toLowerCase();
  if (OVERLAP.some(o => addrLc.includes(o))) continue;
  deferred[k] = d;
}

const out = {
  _meta: {
    topic: 'Free food distributions — Long Beach, CA',
    generated: fmtDate(ANCHOR),
    source: `City of Long Beach food-distribution guide (${raw._source}) + Long Beach subset of the Los Angeles Regional Food Bank pantry locator.`,
    note: 'Generated by prepare-longbeach-food.mjs. PDF sites geocoded via Mapbox (LA-locator sites carry their own coords). Weekly/monthly native recurrence, one rolling doc per pattern. 3 sites present in both sources are kept only from the PDF. Read longbeach-geocode-review.txt before seeding.',
  },
  _deferred: deferred,
  items,
};
writeFileSync(OUT, JSON.stringify(out, null, 2));
writeFileSync(REVIEW, review.join('\n') + '\n');

const pdfItems = items.length - laCopied;
console.log(`wrote ${OUT}`);
console.log(`  ${items.length} activity docs total`);
console.log(`    ${pdfItems} from ${raw.sites.length} City-of-Long-Beach PDF sites (${dropped} dropped, ${flagged} flagged)`);
console.log(`    ${laCopied} copied from LA Regional Food Bank data (${laDroppedOverlap} overlap docs dropped)`);
console.log(`  ${Object.keys(deferred).length} deferred/call-ahead sites`);
console.log(`READ ${REVIEW} to spot-check pins before seeding.`);
