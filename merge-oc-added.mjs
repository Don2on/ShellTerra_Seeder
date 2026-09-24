#!/usr/bin/env node
/**
 * merge-oc-added.mjs — prep the "OC Free Food additions" batch for seeding.
 *
 * - Geocodes items missing lat/lng (Mapbox; needs MAPBOX_TOKEN).
 * - Dedups by normalized street address (directional-AND-suffix-agnostic, so
 *   "East 17th St" == "E 17th") against EVERYTHING already seeded:
 *   OCFoodDistribution-raw.json (114 sites) + OCFoodDistribution-new.json (396).
 * - Converts RRULE -> app recurrence + recurDays.
 * - Seeds ONLY the high/medium-confidence `items`; the low-confidence
 *   `_needsConfirmation` list is written out separately for a research pass, NOT
 *   seeded (per the batch's own _verify_before_running note).
 *
 * Writes OCFoodDistribution-added.json (ready for seed-activities --create-only)
 * and OCFoodDistribution-needsconfirm.json (hold for research).
 *
 * Usage: node --env-file=.env merge-oc-added.mjs
 */
import { readFileSync, writeFileSync } from 'node:fs';
import process from 'node:process';

const SHELL_ID = '6aac35296621e11030a0';
const TOKEN = process.env.MAPBOX_TOKEN;
const SEEDED = ['./OCFoodDistribution-raw.json', './OCFoodDistribution-new.json'];
const ADDED = './OCFreeFood-added-raw.json';

/* ---- directional + suffix-agnostic address key ---- */
const SUFS = new Set(['st','ave','av','blvd','rd','dr','ln','pkwy','ct','pl','way','cir','ter','hwy',
  'street','avenue','boulevard','road','drive','lane','parkway','court','place','circle','terrace','highway']);
const DIR = { north:'n', south:'s', east:'e', west:'w', northeast:'ne', northwest:'nw', southeast:'se', southwest:'sw' };
const WORD = { saint:'st', mount:'mt', '&':'and' };
function normAddr(addr) {
  if (!addr) return null;
  const zip = (addr.match(/\b(\d{5})\b/) || [])[1] || '';
  let s = addr.split(',')[0].toLowerCase();
  s = s.replace(/#.*/, '').replace(/\b(ste|suite|unit|apt|bldg|lot)\b.*/, '');
  s = s.replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
  const toks = s.split(' ').map(t => DIR[t] || WORD[t] || t);
  const num = toks[0] && /^\d/.test(toks[0]) ? toks[0] : '';
  const name = toks.filter(t => !/^\d+$/.test(t) && !SUFS.has(t));
  return `${num} ${name.join(' ')} ${zip}`.trim();
}

/* ---- RRULE -> app recurrence ---- */
const BYDAY = { SU: 7, MO: 1, TU: 2, WE: 3, TH: 4, FR: 5, SA: 6 };
function convertRecurrence(rrule) {
  if (!rrule) return null;
  const freq = (rrule.match(/FREQ=(\w+)/) || [])[1];
  const interval = Number((rrule.match(/INTERVAL=(\d+)/) || [])[1] || 1);
  const byday = (rrule.match(/BYDAY=([A-Z0-9,\-]+)/) || [])[1];
  if (!freq || !byday) return null;
  if (interval > 1) return null; // biweekly etc. — app has no such mode; hold
  const parts = byday.split(',').map(tok => {
    const m = tok.match(/^(-?\d+)?([A-Z]{2})$/);
    return m ? { n: m[1] ? Number(m[1]) : null, dow: BYDAY[m[2]] } : null;
  }).filter(Boolean);
  if (!parts.length) return null;
  if (freq === 'WEEKLY') {
    const days = [...new Set(parts.map(p => p.dow))].sort((a, b) => a - b);
    return { recurrence: { frequency: 'weekly' }, recurDays: days.join(',') };
  }
  if (freq === 'MONTHLY') {
    const nths = parts.filter(p => p.n != null).map(p => ({ n: p.n, dayOfWeek: p.dow }));
    if (!nths.length) return null;
    nths.sort((a, b) => a.n - b.n);
    return { recurrence: { frequency: 'monthly', nthWeekdays: nths }, recurDays: nths.map(p => `${p.n}:${p.dayOfWeek}`).join(',') };
  }
  return null;
}

/* ---- geocode ---- */
async function geocode(address) {
  const url = 'https://api.mapbox.com/geocoding/v5/mapbox.places/'
    + encodeURIComponent(address)
    + `.json?access_token=${TOKEN}&country=us&limit=1&proximity=-117.8677,33.7455`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Mapbox ${res.status}`);
  const f = (await res.json()).features?.[0];
  if (!f) return null;
  const [lng, lat] = f.center;
  return { lat, lng, matched: f.place_name, relevance: f.relevance };
}

/* ---- build seeded-address set ---- */
const seededKeys = new Set();
for (const f of SEEDED) {
  const doc = JSON.parse(readFileSync(f, 'utf8'));
  for (const s of (doc.sites || doc.items || [])) { const k = normAddr(s.address); if (k) seededKeys.add(k); }
}

const batch = JSON.parse(readFileSync(ADDED, 'utf8'));

function toSeedItem(it, conv) {
  const appt = it.appointmentRequired ? ' Appointment or call-ahead required.' : '';
  return {
    kind: 'activity', slug: it.slug, seriesSlug: it.vendorSlug || it.slug,
    title: `${it.locationName || 'Free Food Distribution'} — ${it.title || 'Free Food Distribution'}`,
    description: `${it.description || ''}${appt}`.trim(),
    locationName: it.locationName || '', address: it.address || '',
    lat: it.lat ?? null, lng: it.lng ?? null,
    category: /senior meal|hot meal/i.test(it.category || '') ? 'senior-meals' : 'food-assistance',
    start: it.start, end: it.end || null,
    recurrence: conv.recurrence, recurDays: conv.recurDays,
    sourceOrg: it._sourceName || '', url: it.url || '', schedulePattern: '',
  };
}

async function run() {
  const out = [], skippedDup = [], skippedRec = [], geocoded = [];
  for (const it of batch.items) {
    // geocode if needed
    if ((it.lat == null || it.lng == null) && it.address && TOKEN) {
      try { const g = await geocode(it.address); if (g) { it.lat = g.lat; it.lng = g.lng; geocoded.push(`${it.locationName} -> ${g.lat.toFixed(5)},${g.lng.toFixed(5)} (rel ${g.relevance})`); } }
      catch (e) { /* leave null */ }
    }
    if (seededKeys.has(normAddr(it.address))) { skippedDup.push(it.locationName); continue; }
    const conv = convertRecurrence(it.recurrence);
    if (!conv) { skippedRec.push(`${it.locationName} (${it.recurrence})`); continue; }
    if (it.lat == null || it.lng == null) { skippedRec.push(`${it.locationName} (no coords)`); continue; }
    out.push(toSeedItem(it, conv));
  }

  writeFileSync('./OCFoodDistribution-added.json', JSON.stringify({
    _meta: { topic: 'OC food distributions — additions batch (CAP OC partners, city/org pages)', shellId: SHELL_ID,
      source: 'OCFreeFood-added-raw.json, deduped against raw+new by directional-agnostic address' },
    items: out,
  }, null, 2));

  writeFileSync('./OCFoodDistribution-needsconfirm.json', JSON.stringify({
    _meta: { note: 'LOW-confidence items held for research before seeding (undated/2024/aggregator/conflicting). Not seeded.' },
    items: batch._needsConfirmation || [],
  }, null, 2));

  const weekly = out.filter(i => i.recurrence.frequency === 'weekly').length;
  const monthly = out.filter(i => i.recurrence.frequency === 'monthly').length;
  console.log(`geocoded ${geocoded.length}:`); geocoded.forEach(g => console.log('  ' + g));
  console.log(`\nadded batch: ${batch.items.length} items -> ${out.length} new-unique to seed (${weekly} weekly, ${monthly} monthly)`);
  console.log(`  ${skippedDup.length} dupes skipped: ${skippedDup.join(', ') || '(none)'}`);
  console.log(`  ${skippedRec.length} held (unconvertible/no-coords): ${skippedRec.join(', ') || '(none)'}`);
  console.log(`  _needsConfirmation held for research: ${(batch._needsConfirmation || []).length}`);
  console.log(`wrote OCFoodDistribution-added.json + OCFoodDistribution-needsconfirm.json`);
}
run().catch(e => { console.error(e); process.exit(1); });
