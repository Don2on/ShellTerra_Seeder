#!/usr/bin/env node
/**
 * prepare-sd-additions.mjs — turn SDFoodAdditions-raw.json (net-new independent /
 * college / senior food sites researched 2026-09-28) into seedable activities +
 * vendors for the EXISTING FoodDistributionSD shell (6a84dbe4ec8215c0345e).
 *
 * Steps: geocode each site (Mapbox, SD County bbox) → dedupe against the 353
 * vendors already in SDFoodVendors.json (by street number + ZIP) → emit
 * native-recurrence activity docs (weekly weekday-set / monthly nth-weekday) and
 * one vendor card per site. Sites with a real address but no parseable schedule
 * become event-less "call ahead" vendor cards (no activity).
 *
 * Writes SDFoodAdditions.json ({_meta,_deferred,items}) + SDFoodAdditions-vendors.json
 * ({_shellId, vendors}) + sd-additions-review.txt (READ IT — geocode + dedupe log).
 *
 * USAGE: node --env-file=.env prepare-sd-additions.mjs
 */
import { readFileSync, writeFileSync } from 'node:fs';
import process from 'node:process';

const TOKEN = process.env.MAPBOX_TOKEN;
if (!TOKEN) { console.error('Set MAPBOX_TOKEN'); process.exit(1); }

const SHELL_ID = '6a84dbe4ec8215c0345e'; // FoodDistributionSD
const SOURCE_URL = 'https://foodpantrysd.org/';

// CLI: reusable across rounds. --dedupe takes a comma list of vendor files whose
// sites already exist (so a later round doesn't re-add an earlier round's sites).
const argv = process.argv.slice(2);
const arg = (f, d) => { const i = argv.indexOf(f); return i > -1 ? argv[i + 1] : d; };
const RAW_FILE = arg('--raw', './SDFoodAdditions-raw.json');
const OUT_ACT = arg('--out-activities', './SDFoodAdditions.json');
const OUT_VEN = arg('--out-vendors', './SDFoodAdditions-vendors.json');
const REVIEW_FILE = arg('--review', './sd-additions-review.txt');
const DEDUPE_FILES = arg('--dedupe', './SDFoodVendors.json').split(',').map(s => s.trim()).filter(Boolean);

/* ---- date anchors ---- */
const ANCHOR = (() => { const n = new Date(); const d = new Date(n.getFullYear(), n.getMonth(), n.getDate()); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return d; })();
const fmtDate = (d) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
const PAST_ANCHOR = (() => { const d = new Date(ANCHOR); d.setDate(d.getDate()-7); return fmtDate(d); })();
function nextDateForDow(dow) { const j = dow === 7 ? 0 : dow; const d = new Date(ANCHOR); d.setDate(d.getDate() + ((j - d.getDay() + 7) % 7)); return fmtDate(d); }

/* ---- day / ordinal parsing ---- */
const DAY_DART = { sun:7, mon:1, tue:2, wed:3, thu:4, fri:5, sat:6 };
const DART_ABBR = { 1:'Mon',2:'Tue',3:'Wed',4:'Thu',5:'Fri',6:'Sat',7:'Sun' };
const ORD_NUM = { first:1, second:2, third:3, fourth:4, fifth:5, last:-1, '1st':1,'2nd':2,'3rd':3,'4th':4,'5th':5 };
const ORD_LABEL = { 1:'1st',2:'2nd',3:'3rd',4:'4th',5:'5th','-1':'last' };
const dayToDart = (s) => DAY_DART[String(s).slice(0,3).toLowerCase()] || null;
function parsePattern(p) { // "2nd Sat" -> {n,dayOfWeek}
  const m = String(p).trim().match(/^(\S+)\s+(\S+)$/); if (!m) return null;
  const n = ORD_NUM[m[1].toLowerCase()]; const dow = dayToDart(m[2]); if (!n || !dow) return null;
  return { n, dayOfWeek: dow };
}
const t12 = (hhmm) => { if (!hhmm) return ''; let [h,m]=hhmm.split(':').map(Number); const ap=h>=12?'PM':'AM'; h=h%12||12; return m?`${h}:${String(m).padStart(2,'0')} ${ap}`:`${h} ${ap}`; };
const timeText = (o,c) => !o ? '' : !c ? `from ${t12(o)}` : `${t12(o)}–${t12(c)}`;
const collapseDays = (nums) => { const s=[...nums].sort((a,b)=>a-b); const r=[]; let a=s[0],p=s[0]; for(let i=1;i<s.length;i++){ if(s[i]===p+1)p=s[i]; else {r.push([a,p]);a=s[i];p=s[i];} } r.push([a,p]); return r.map(([x,y])=>x===y?DART_ABBR[x]:`${DART_ABBR[x]}–${DART_ABBR[y]}`).join(', '); };
function schedText(sc) {
  const t = timeText(sc.open, sc.close);
  if (sc.freq === 'weekly') { const d=(sc.days||[]).map(dayToDart).filter(Boolean); if(!d.length) return sc.note||''; return `${collapseDays(d)} ${t}${sc.note?` (${sc.note})`:''}`.trim(); }
  const pats=(sc.patterns||[]).map(parsePattern).filter(Boolean); if(!pats.length) return sc.note||'';
  return `${pats.map(p=>`${ORD_LABEL[p.n]} ${DART_ABBR[p.dayOfWeek]}`).join(' & ')} ${t}${sc.note?` (${sc.note})`:''}`.trim();
}

/* ---- address helpers ---- */
function streetLine(addr) {
  const parts = String(addr).split(',').map(s => s.trim());
  let line = parts.find((p, i) => i < parts.length && /^\d+\s+[A-Za-z]/.test(p) && !/^CA\b/.test(p));
  // pick the LAST part matching a "number street" pattern (skips "Building 14 Room ...")
  for (let i = parts.length - 1; i >= 0; i--) { if (/^\d+\s+[A-Za-z]/.test(parts[i])) { line = parts[i]; var idx = i; break; } }
  const zips = String(addr).match(/\b\d{5}\b/g) || []; const zip = zips.length ? zips[zips.length - 1] : '';
  const city = (typeof idx === 'number' && parts[idx + 1] && !/^CA\b/.test(parts[idx+1])) ? parts[idx + 1] : (parts[parts.length - 2] || '');
  return { line: line || parts[0], city, zip };
}
const streetNo = (line) => (String(line).match(/^\s*(\d+)/) || [])[1] || '';

/* ---- geocode (San Diego County) ---- */
const SD_BBOX = '-117.61,32.50,-116.08,33.51';
async function geocode(addr) {
  const url = 'https://api.mapbox.com/geocoding/v5/mapbox.places/' + encodeURIComponent(addr)
    + `.json?access_token=${TOKEN}&country=us&limit=1&proximity=-117.16,32.72&bbox=${SD_BBOX}`;
  const res = await fetch(url); if (!res.ok) throw new Error('Mapbox ' + res.status);
  const f = (await res.json()).features?.[0]; if (!f) return null;
  const [lng, lat] = f.center;
  return { lat, lng, matched: f.place_name, relevance: f.relevance, acc: f.properties?.accuracy || f.place_type?.[0] || '?' };
}
const PRECISE = new Set(['rooftop','parcel','address','point','interpolated','override']);
const slugify = (s) => (s||'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,48);

/* ---- existing vendors for dedupe (across one or more files) ---- */
const existKeys = new Set();
for (const f of DEDUPE_FILES) {
  const doc = JSON.parse(readFileSync(f,'utf8'));
  for (const v of (doc.vendors || doc)) { const {line,zip} = streetLine(v.address||''); const k = streetNo(line)+'|'+zip; if (streetNo(line) && zip) existKeys.add(k); }
}

/* ---- build ---- */
const raw = JSON.parse(readFileSync(RAW_FILE,'utf8'));
const review = [];
const items = [];
const deferred = {};
const vendors = [];
const usedSlugs = new Set();
const uniqueSlug = (b) => { let s=b||'site',i=2; while(usedSlugs.has(s))s=`${b}-${i++}`; usedSlugs.add(s); return s; };
let dup = 0, flagged = 0, noSched = 0;

for (const s of raw.sites) {
  const { line, city, zip } = streetLine(s.address);
  const geoAddr = `${line}, ${city}, CA ${zip}`.replace(/, ,/g, ',');
  const dedupeKey = streetNo(line) + '|' + zip;
  if (existKeys.has(dedupeKey)) { dup++; review.push(`DUP (already in SD) ${s.name} | ${geoAddr}`); continue; }

  let geo = null;
  if (Number.isFinite(s.lat) && Number.isFinite(s.lng)) {
    geo = { lat: s.lat, lng: s.lng, matched: `(manual override) ${geoAddr}`, relevance: 1, acc: 'override' };
  } else {
    try { geo = await geocode(geoAddr); } catch (e) { review.push(`ERROR ${s.name}: ${e.message}`); }
  }
  if (!geo || geo.relevance < 0.5) { review.push(`DROP (no/low geocode) ${s.name} | ${geoAddr}`); continue; }
  const bad = geo.relevance < 0.7 || !PRECISE.has(geo.acc);
  if (bad) { flagged++; review.push(`FLAG rel${geo.relevance.toFixed(2)}/${geo.acc}  ${s.name}\n    in: ${geoAddr}\n    -> ${geo.matched}`); }
  else review.push(`ok  [${s.category}] ${s.name} -> ${geo.matched} [${geo.acc}]`);

  const provKey = uniqueSlug('sd-add-' + slugify(s.name));
  const fullSched = (s.schedules||[]).map(schedText).filter(Boolean).join('; ');
  const elig = s.eligibility ? ` Eligibility: ${s.eligibility}.` : '';
  const description = `Free food at ${s.name}${s.org && s.org!==s.name ? ` (${s.org})` : ''}.`
    + (fullSched ? ` Schedule: ${fullSched}.` : '')
    + elig
    + (s.phone ? ` Call ${s.phone} to confirm before you go — hours change and supplies can run out.` : ' Confirm hours before you go — supplies can run out.')
    + ' Source: community research, Sep 2026.';

  const base = {
    kind: 'activity', slug: provKey, seriesSlug: provKey,
    title: `${s.name} — Free Food`,
    description, locationName: s.name, address: geoAddr,
    lat: geo.lat, lng: geo.lng,
    category: 'food-assistance', sourceOrg: s.org || '', url: s.website || SOURCE_URL,
    schedulePattern: fullSched,
  };

  // vendor card (always)
  vendors.push({
    slug: provKey, name: s.name, category: 'Food Assistance',
    tagline: (fullSched || 'Community food program').slice(0,255),
    description, logoUrl:'', website: s.website||'', phone: s.phone||'', email:'',
    instagram:'', facebook:'', tiktok:'',
    address: geoAddr, lat: geo.lat, lng: geo.lng,
    neighborhood: city, hours: fullSched || 'Call ahead — schedule varies',
    featured:false, verified:false, events:[], _eventCount:0, _category: s.category, _confidence: s.confidence,
  });

  // activities (skip if no parseable schedule -> stays vendor-only)
  let made = 0;
  for (const sc of (s.schedules||[])) {
    if (sc.freq === 'weekly') {
      const days = (sc.days||[]).map(dayToDart).filter(Boolean).sort((a,b)=>a-b);
      if (!days.length || !sc.open) continue;
      items.push({ ...base, slug: uniqueSlug(`${provKey}-w${days.join('')}-${sc.open.replace(':','')}`),
        start: `${PAST_ANCHOR}T${sc.open}`, end: sc.close?`${PAST_ANCHOR}T${sc.close}`:null,
        recurrence:{frequency:'weekly'}, recurDays: days.join(',') });
      made++;
    } else if (sc.freq === 'monthly') {
      const pats = (sc.patterns||[]).map(parsePattern).filter(Boolean);
      if (!pats.length || !sc.open) continue;
      const first = nextDateForDow(pats[0].dayOfWeek);
      items.push({ ...base, slug: uniqueSlug(`${provKey}-m${pats.map(p=>p.n+''+p.dayOfWeek).join('')}-${sc.open.replace(':','')}`),
        start: `${first}T${sc.open}`, end: sc.close?`${first}T${sc.close}`:null,
        recurrence:{frequency:'monthly', nthWeekdays:pats}, recurDays: pats.map(p=>`${p.n}:${p.dayOfWeek}`).join(',') });
      made++;
    }
  }
  if (!made) { noSched++; deferred[provKey] = { title: s.name, status: `${fullSched || 'Call ahead for current days and hours.'}${s.phone?` Phone: ${s.phone}.`:''}`, address: geoAddr, lat: geo.lat, lng: geo.lng, phone: s.phone||'', eligibility: s.eligibility||'', sourceUrl: s.website||SOURCE_URL }; }
}

writeFileSync(OUT_ACT, JSON.stringify({ _meta: { topic:'Net-new San Diego food distributions', generated: fmtDate(ANCHOR), source:`Research supplementing FoodDistributionSD; raw ${RAW_FILE}.` }, _deferred: deferred, items }, null, 2));
writeFileSync(OUT_VEN, JSON.stringify({ _comment:`Net-new SD food sites to ADD to FoodDistributionSD. Deduped vs ${DEDUPE_FILES.join(', ')} by street#+ZIP.`, _shell:'FoodDistributionSD', _shellId: SHELL_ID, _collection:'vendors', vendors }, null, 2));
writeFileSync(REVIEW_FILE, review.join('\n') + '\n');

console.log(`candidates: ${raw.sites.length}`);
console.log(`  ${vendors.length} net-new vendor cards (${items.length} activity docs)`);
console.log(`  ${dup} skipped as already-in-SD, ${flagged} geocode-flagged, ${noSched} vendor-only (no schedule)`);
console.log(`READ sd-additions-review.txt`);
