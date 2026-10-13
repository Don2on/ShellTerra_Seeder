#!/usr/bin/env node
/**
 * prepare-webfood-activities.mjs — turn a WEBSITE-ONLY food-map source (raw
 * sites with iCal RRULEs + an already-built vendor file) into seedable
 * NATIVE-recurrence activity items, so FBNN / River City / Yolo can go into the
 * app the same way LA / OC / Long Beach did (activities + vendors), not just a
 * vendor directory.
 *
 * WHY join against the vendor file: the vendor build already geocoded + reviewed
 * every site's pin. We reuse those coordinates (matched by name + street number)
 * instead of re-geocoding, so pins stay identical to the reviewed web map and we
 * make zero Mapbox calls. Raw sites with no matching vendor were dropped for a
 * bad/low geocode on the web too — we skip them here as well.
 *
 * RRULE handling (the raw schedules only use these shapes):
 *   FREQ=WEEKLY;BYDAY=TU,TH        -> weekly, recurDays "2,4"
 *   FREQ=MONTHLY;BYDAY=1TU         -> monthly nth-weekday 1st Tue
 *   FREQ=MONTHLY;BYDAY=1TU,3TU     -> monthly 1st & 3rd Tue
 * One activity doc per schedule. endTime optional (open-only if absent).
 *
 * Writes the items[] into the given --out FoodDistribution file (keeping its
 * _meta), which seed-activities.mjs then seeds.
 *
 * USAGE
 *   node prepare-webfood-activities.mjs --raw ./FBNN-sites-raw.json \
 *        --vendors ./FBNNFoodVendors.json --out ./FBNNFoodDistribution.json \
 *        --org "Food Bank of Northern Nevada" --url https://www.fbnn.org/ \
 *        [--kids-only false]
 */
import { readFileSync, writeFileSync } from 'node:fs';

const args = process.argv.slice(2);
const valOf = (f, d = null) => { const i = args.indexOf(f); return i > -1 ? args[i + 1] : d; };
const RAW = valOf('--raw');
const VENDORS = valOf('--vendors');
const OUT = valOf('--out');
const ORG = valOf('--org') || 'Food Bank';
const URL = valOf('--url') || '';
if (!RAW || !VENDORS || !OUT) { console.error('Required: --raw --vendors --out'); process.exit(1); }

/* ---- date anchors (same scheme as prepare-longbeach-food.mjs) ---- */
const ANCHOR = (() => {
  const now = new Date();
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); // Monday of this week
  return d;
})();
const fmtDate = (d) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
const PAST_ANCHOR = (() => { const d = new Date(ANCHOR); d.setDate(d.getDate()-7); return fmtDate(d); })();
function nextDateForDow(dow) {
  const jsDow = dow === 7 ? 0 : dow;
  const d = new Date(ANCHOR);
  d.setDate(d.getDate() + ((jsDow - d.getDay() + 7) % 7));
  return fmtDate(d);
}

/* ---- RRULE helpers ---- */
// ICS BYDAY -> Dart weekday (Mon=1..Sun=7)
const BYDAY_DART = { MO: 1, TU: 2, WE: 3, TH: 4, FR: 5, SA: 6, SU: 7 };
const DART_ABBR = { 1: 'Mon', 2: 'Tue', 3: 'Wed', 4: 'Thu', 5: 'Fri', 6: 'Sat', 7: 'Sun' };
const ORD = { 1: '1st', 2: '2nd', 3: '3rd', 4: '4th', 5: '5th', '-1': 'last' };
const parseRule = (rrule) => { const o = {}; for (const kv of (rrule || '').split(';')) { const [k, v] = kv.split('='); if (k) o[k] = v; } return o; };

const t12 = (hhmm) => { if (!hhmm) return ''; let [h, m] = hhmm.split(':').map(Number); const ap = h >= 12 ? 'PM' : 'AM'; h = h % 12 || 12; return m ? `${h}:${String(m).padStart(2,'0')} ${ap}` : `${h} ${ap}`; };
const timeText = (o, c) => !o ? '' : !c ? `from ${t12(o)}` : `${t12(o)}–${t12(c)}`;

const slugify = (s) => (s || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 52);
const norm = (s) => (s || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
const streetNo = (s) => { const m = (s || '').match(/\d+/); return m ? m[0] : ''; };

/* ---- build vendor coord/index by name + street number ---- */
const vendorsRaw = JSON.parse(readFileSync(VENDORS, 'utf8'));
const vendors = vendorsRaw.vendors || vendorsRaw;
const vmap = new Map();
for (const v of vendors) {
  const key = norm(v.name) + '|' + streetNo(v.address);
  if (!vmap.has(key)) vmap.set(key, v);
}

/* ---- convert ---- */
const raw = JSON.parse(readFileSync(RAW, 'utf8'));
const sites = Array.isArray(raw) ? raw : (raw.sites || []);
const items = [];
const usedSlugs = new Set();
const uniqueSlug = (base) => { let s = base || 'site', i = 2; while (usedSlugs.has(s)) s = `${base}-${i++}`; usedSlugs.add(s); return s; };
let matched = 0, unmatched = 0, skipped = 0;
const unmatchedNames = [];

for (const s of sites) {
  const key = norm(s.name) + '|' + streetNo(s.location || s.address);
  const v = vmap.get(key) || vmap.get(norm(s.name) + '|' + streetNo(s.location));
  if (!v || v.lat == null || v.lng == null) { unmatched++; unmatchedNames.push(s.name); continue; }
  matched++;

  const provKey = uniqueSlug(slugify(v.slug || s.name));
  const address = (v.address || s.location || '').replace(/,?\s*USA$/i, '').trim();
  const website = v.website || s.website || URL;
  const phone = v.phone || s.phone || '';
  const progs = (s.programs || []).join(', ');

  // human schedule text across this site's schedules (for description/pattern)
  const humanBits = [];
  const built = [];

  for (const sc of (s.schedules || [])) {
    const r = parseRule(sc.rrule);
    const time = sc.time || '';
    const end = sc.endTime || null;
    if (!time) { continue; }

    if (r.FREQ === 'WEEKLY') {
      const days = (r.BYDAY || '').split(',').map(t => BYDAY_DART[t]).filter(Boolean).sort((a, b) => a - b);
      if (!days.length) continue;
      humanBits.push(`${days.map(d => DART_ABBR[d]).join(', ')} ${timeText(time, end)}`.trim());
      built.push({
        freq: 'weekly', days, time, end,
        slug: `${provKey}-w${days.join('')}-${time.replace(':', '')}`,
      });
    } else if (r.FREQ === 'MONTHLY') {
      // BYDAY tokens like 1TU, 4TU, -1FR
      const patterns = (r.BYDAY || '').split(',').map(tok => {
        const m = tok.match(/^(-?\d+)?([A-Z]{2})$/); if (!m) return null;
        const dow = BYDAY_DART[m[2]]; if (!dow) return null;
        return { n: m[1] ? Number(m[1]) : 1, dayOfWeek: dow };
      }).filter(Boolean);
      if (!patterns.length) continue;
      humanBits.push(`${patterns.map(p => `${ORD[p.n] || p.n + 'th'} ${DART_ABBR[p.dayOfWeek]}`).join(' & ')} ${timeText(time, end)}`.trim());
      built.push({
        freq: 'monthly', patterns, time, end,
        slug: `${provKey}-m${patterns.map(p => p.n + '' + p.dayOfWeek).join('')}-${time.replace(':', '')}`,
      });
    }
    // (no DAILY / other freqs in these sources)
  }

  if (!built.length) { skipped++; continue; }
  const schedText = humanBits.join('; ');
  const description = `Free food distribution at ${s.name}${progs ? ` (${progs})` : ''}. `
    + (schedText ? `Schedule: ${schedText}. ` : '')
    + (phone ? `Call ${phone} to confirm before you go — ` : 'Confirm before you go — ')
    + `distributions often end early when supplies run out, and schedules change with holidays and weather. Source: ${ORG}.`;

  const base = {
    kind: 'activity', slug: provKey, seriesSlug: provKey,
    title: `${s.name} — Free Food Distribution`,
    description, locationName: s.name, address,
    lat: v.lat, lng: v.lng,
    category: 'food-assistance', sourceOrg: ORG, url: website,
    schedulePattern: schedText,
  };

  for (const b of built) {
    if (b.freq === 'weekly') {
      items.push({
        ...base, slug: uniqueSlug(b.slug),
        start: `${PAST_ANCHOR}T${b.time}`, end: b.end ? `${PAST_ANCHOR}T${b.end}` : null,
        recurrence: { frequency: 'weekly' }, recurDays: b.days.join(','),
      });
    } else {
      const first = nextDateForDow(b.patterns[0].dayOfWeek);
      items.push({
        ...base, slug: uniqueSlug(b.slug),
        start: `${first}T${b.time}`, end: b.end ? `${first}T${b.end}` : null,
        recurrence: { frequency: 'monthly', nthWeekdays: b.patterns },
        recurDays: b.patterns.map(p => `${p.n}:${p.dayOfWeek}`).join(','),
      });
    }
  }
}

const prev = JSON.parse(readFileSync(OUT, 'utf8'));
const out = { _meta: { ...(prev._meta || {}), generated: fmtDate(ANCHOR), seeded_note: `Activities generated by prepare-webfood-activities.mjs from ${RAW} (RRULE -> native recurrence), coords reused from ${VENDORS}.` }, _deferred: prev._deferred || {}, items };
writeFileSync(OUT, JSON.stringify(out, null, 2));

console.log(`wrote ${OUT}`);
console.log(`  ${items.length} activity docs from ${matched} matched sites (${unmatched} unmatched, ${skipped} matched-but-no-parseable-schedule)`);
if (unmatched) console.log(`  unmatched sample: ${unmatchedNames.slice(0, 8).join(' | ')}`);
