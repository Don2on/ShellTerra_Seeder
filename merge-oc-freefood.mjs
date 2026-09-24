#!/usr/bin/env node
/**
 * merge-oc-freefood.mjs — additive dedup-merge of the "OC Free Food" scrape into
 * the already-seeded FoodDistributionOC shell.
 *
 * Keeps everything already seeded (the 114 sites hand-researched from provider
 * pages, incl. the 25 CSFP senior cards). Adds ONLY the sites in the new scrape
 * we don't already have, matched by normalized street address (slugs differ
 * between the two datasets, so address is the identity key). Street-type
 * suffixes (St/Ave/Blvd) are dropped from the key so "Walnut St" == "Walnut Ave".
 *
 * The scrape uses RFC 5545 RRULEs; the app has no RRULE support, so each is
 * converted to the app's recurrence model:
 *   FREQ=WEEKLY;BYDAY=TU        -> {frequency:'weekly'},  recurDays "2"
 *   FREQ=MONTHLY;BYDAY=3TH      -> {frequency:'monthly', nthWeekdays:[{n:3,dow:4}]}, recurDays "3:4"
 *   FREQ=MONTHLY;BYDAY=1TH,3TH  -> two nthWeekdays, recurDays "1:4,3:4"
 * (Dart weekday: Mon=1..Sun=7.)
 *
 * Writes OCFoodDistribution-new.json and OCFoodVendors-new.json — the new-unique
 * subset only — for seed-activities.mjs / seed-vendors.mjs (run with --create-only).
 *
 * Usage: node merge-oc-freefood.mjs
 */
import { readFileSync, writeFileSync } from 'node:fs';

const SHELL_ID = '6aac35296621e11030a0';
const MINE_RAW = './OCFoodDistribution-raw.json';   // 114 already-seeded sites (address source of truth)
const NEW_ACTS = './OCFreeFood-raw.json';           // 544 scraped activity items
const NEW_VENDS = './OCFreeFoodVendors-raw.json';   // 285 scraped vendor cards

/* ---- address normalization (identity key) ---- */
const SUFS = new Set(['st','ave','av','blvd','rd','dr','ln','pkwy','ct','pl','way','cir','ter','hwy',
  'street','avenue','boulevard','road','drive','lane','parkway','court','place','circle','terrace','highway']);
function normAddr(addr) {
  if (!addr) return null;
  const zip = (addr.match(/\b(\d{5})\b/) || [])[1] || '';
  let street = addr.split(',')[0].toLowerCase();
  street = street.replace(/#.*/, '').replace(/\b(ste|suite|unit|apt|bldg|lot)\b.*/, '');
  street = street.replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
  const toks = street.split(' ');
  const num = toks[0] && /^\d/.test(toks[0]) ? toks[0] : '';
  const nameToks = toks.filter(t => !/^\d+$/.test(t) && !SUFS.has(t));
  return `${num} ${nameToks.join(' ')} ${zip}`.trim();
}

/* ---- RRULE -> app recurrence ---- */
const BYDAY = { SU: 7, MO: 1, TU: 2, WE: 3, TH: 4, FR: 5, SA: 6 };
function convertRecurrence(rrule) {
  if (!rrule) return null;
  const freq = (rrule.match(/FREQ=(\w+)/) || [])[1];
  const byday = (rrule.match(/BYDAY=([A-Z0-9,\-]+)/) || [])[1];
  if (!freq || !byday) return null;
  const parts = byday.split(',').map(tok => {
    const m = tok.match(/^(-?\d+)?([A-Z]{2})$/);
    if (!m) return null;
    return { n: m[1] ? Number(m[1]) : null, dow: BYDAY[m[2]] };
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
    return {
      recurrence: { frequency: 'monthly', nthWeekdays: nths },
      recurDays: nths.map(p => `${p.n}:${p.dayOfWeek}`).join(','),
    };
  }
  return null; // DAILY/YEARLY not expected
}

/* ---- load ---- */
const mine = JSON.parse(readFileSync(MINE_RAW, 'utf8')).sites;
const mineKeys = new Set(mine.map(s => normAddr(s.address)).filter(Boolean));

const acts = JSON.parse(readFileSync(NEW_ACTS, 'utf8')).items;
const vends = JSON.parse(readFileSync(NEW_VENDS, 'utf8')).items || JSON.parse(readFileSync(NEW_VENDS, 'utf8')).vendors;

/* ---- activities: new-unique + converted ---- */
const outItems = [];
let skippedDup = 0, skippedRec = 0;
for (const it of acts) {
  if (mineKeys.has(normAddr(it.address))) { skippedDup++; continue; }
  const conv = convertRecurrence(it.recurrence);
  if (!conv) { skippedRec++; console.warn(`skip (unconvertible recurrence): ${it.slug} "${it.recurrence}"`); continue; }
  const appt = it.appointmentRequired ? ' Appointment required — call ahead.' : '';
  const desc = `${it.description || ''}${appt} Source: Second Harvest Food Bank of Orange County. Confirm before you go — schedules change with holidays and weather.`.trim();
  outItems.push({
    kind: 'activity',
    slug: it.slug,
    seriesSlug: it.vendorSlug || it.seriesId || it.slug,
    title: `${it.locationName || 'Free Food Distribution'} — Free Food Distribution`,
    description: desc,
    locationName: it.locationName || '',
    address: it.address || '',
    lat: it.lat ?? null,
    lng: it.lng ?? null,
    category: 'food-assistance',
    start: it.start,
    end: it.end || null,
    recurrence: conv.recurrence,
    recurDays: conv.recurDays,
    sourceOrg: 'Second Harvest Food Bank of Orange County',
    url: it.url || 'https://feedoc.org/need-food/',
    schedulePattern: '',
  });
}

writeFileSync('./OCFoodDistribution-new.json', JSON.stringify({
  _meta: {
    topic: 'Free food distributions — Orange County (new-unique from Need Food scrape)',
    source: 'OCFreeFood-raw.json (Second Harvest OC Need Food partner map), deduped by address against OCFoodDistribution-raw.json',
    shellId: SHELL_ID,
  },
  items: outItems,
}, null, 2));

/* ---- vendors: new-unique ---- */
const outVend = [];
let vdup = 0;
for (const v of vends) {
  if (mineKeys.has(normAddr(v.address))) { vdup++; continue; }
  outVend.push(v);
}
writeFileSync('./OCFoodVendors-new.json', JSON.stringify({
  _comment: 'OC Free Food vendor cards NOT already present in OCFoodVendors.json (deduped by address). Seed with --create-only.',
  _shell: 'FoodDistributionOC',
  _shellId: SHELL_ID,
  _collection: 'vendors',
  vendors: outVend,
}, null, 2));

/* ---- report ---- */
const weekly = outItems.filter(i => i.recurrence.frequency === 'weekly').length;
const monthly = outItems.filter(i => i.recurrence.frequency === 'monthly').length;
console.log(`activities: ${acts.length} scraped -> ${outItems.length} new-unique (${weekly} weekly, ${monthly} monthly); ${skippedDup} dupes skipped, ${skippedRec} unconvertible`);
console.log(`vendors:    ${vends.length} scraped -> ${outVend.length} new-unique; ${vdup} dupes skipped`);
console.log(`wrote OCFoodDistribution-new.json + OCFoodVendors-new.json (shell ${SHELL_ID})`);
