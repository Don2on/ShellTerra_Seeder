#!/usr/bin/env node
/**
 * merge-gaslamp.mjs — the user pasted a fresh 14-venue Gaslamp pull as a SECOND
 * JSON object appended to each of GaslampActivities.json, GaslampVendors.json and
 * GaslampHappyHour.json, which left all three as invalid (concatenated) JSON.
 * This splits each file's objects, merges the new data into the right shape, and
 * rewrites each as ONE valid object.
 *
 *   GaslampActivities.json  -> existing items + 93 new (dedup by slug)      [GaslampActivities shell]
 *   GaslampVendors.json     -> existing vendors + 21 new (new wins on slug) [GaslampActivities shell]
 *   GaslampHappyHour.json   -> 13 venue vendor cards + 18 happy hours       [GaslampHappyHour shell]
 *                              (happy hours converted native->activity schema)
 */
import { readFileSync, writeFileSync } from 'node:fs';

const HH_SHELL = '6ab426a3d34644188903'; // GaslampHappyHour
const ACT_SHELL = '6a966244cb2082796b17'; // GaslampActivities

function splitObjs(path) {
  const raw = readFileSync(path, 'utf8');
  const objs = []; let s = raw;
  while (s.trim()) {
    try { objs.push(JSON.parse(s)); break; }
    catch (e) { const m = /position (\d+)/.exec(e.message); if (!m) break; const cut = Number(m[1]); objs.push(JSON.parse(s.slice(0, cut))); s = s.slice(cut); }
  }
  return objs;
}

/* ---- past-Monday anchor so weekly recurrence rolls forward ---- */
const now = new Date();
const anchor = new Date(now.getFullYear(), now.getMonth(), now.getDate());
anchor.setDate(anchor.getDate() - ((anchor.getDay() + 6) % 7) - 7); // Monday of last week
const ANCHOR = `${anchor.getFullYear()}-${String(anchor.getMonth() + 1).padStart(2, '0')}-${String(anchor.getDate()).padStart(2, '0')}`;
const DART = { MO: 1, TU: 2, WE: 3, TH: 4, FR: 5, SA: 6, SU: 7 };
const slugify = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

/* ================= ACTIVITIES ================= */
{
  const [base, add] = splitObjs('./GaslampActivities.json');
  const bySlug = new Map(base.items.map((i) => [i.slug, i]));
  let added = 0;
  for (const it of add.items) { if (!bySlug.has(it.slug)) added++; bySlug.set(it.slug, it); }
  const out = { ...base, _generated: ANCHOR.slice(0, 10) && base._generated, items: [...bySlug.values()] };
  // keep the original header keys; just replace items
  const merged = { ...base }; merged.items = [...bySlug.values()];
  writeFileSync('./GaslampActivities.json', JSON.stringify(merged, null, 2));
  console.log(`GaslampActivities.json: ${base.items.length} + ${add.items.length} new -> ${merged.items.length} items (${added} net-new)`);
}

/* ================= VENDORS ================= */
{
  const [base, add] = splitObjs('./GaslampVendors.json');
  const addVend = add.items || add.vendors;
  const bySlug = new Map(base.vendors.map((v) => [v.slug, v]));
  let added = 0, updated = 0;
  for (const v of addVend) { if (bySlug.has(v.slug)) updated++; else added++; bySlug.set(v.slug, v); }
  const merged = { ...base }; merged.vendors = [...bySlug.values()];
  writeFileSync('./GaslampVendors.json', JSON.stringify(merged, null, 2));
  console.log(`GaslampVendors.json: ${base.vendors.length} + ${addVend.length} new -> ${merged.vendors.length} vendors (${added} net-new, ${updated} refreshed)`);
}

/* ================= HAPPY HOUR (own shell) ================= */
{
  const [scaffold, hhObj] = splitObjs('./GaslampHappyHour.json');
  const hh = hhObj.items;
  // vendor cards for the HH venues, pulled from the freshly-merged vendor set
  const vend = JSON.parse(readFileSync('./GaslampVendors.json', 'utf8')).vendors;
  const vBySlug = new Map(vend.map((v) => [v.slug, v]));
  const hhVenueSlugs = [...new Set(hh.map((h) => h.vendorSlug))];

  const vendors = hhVenueSlugs.map((s) => {
    const v = vBySlug.get(s);
    if (!v) return null;
    // standard vendor fields only; happy hours drive the dated cards, so events=[]
    const { _notes, _pinSource, _geocode, events, ...rest } = v;
    return { ...rest, events: [] };
  }).filter(Boolean);

  const usedSlugs = new Set();
  const happyHours = hh.map((h) => {
    const days = (h.days || []).map((d) => DART[d]).filter(Boolean).sort((a, b) => a - b);
    const dealTxt = (h.deals || []).join('; ');
    const note = h.notes && !/^UNVERIFIED/i.test(h.notes) ? ` ${h.notes}` : '';
    let slug = slugify(`${h.vendorSlug}-hh-${h.label || 'happy-hour'}`); let b = slug, i = 2;
    while (usedSlugs.has(slug)) slug = `${b}-${i++}`; usedSlugs.add(slug);
    return {
      kind: 'activity', slug, seriesSlug: h.vendorSlug,
      title: `${h.name} — ${h.label || 'Happy Hour'}`,
      description: `${dealTxt}.${note}`.trim(),
      locationName: h.name, address: h.address, lat: h.lat, lng: h.lng,
      category: 'happy-hour',
      start: `${ANCHOR}T${h.start}`, end: `${ANCHOR}T${h.end}`,
      recurrence: { frequency: 'weekly' }, recurDays: days.join(','),
      url: h.source || '', verified: h.verified === true,
    };
  });

  const out = {
    _comment: 'ShellTerra GaslampHappyHour seed data. vendors[] -> vendors collection (seed-vendors.mjs); happyHours[] -> activities collection (seed-activities.mjs, --no-host-grouping). Times are San Diego local, 24h; happy hours are weekly (recurDays Dart Mon=1..Sun=7), anchored to a past Monday so recurrence rolls forward.',
    _shell: 'GaslampHappyHour', _shellId: HH_SHELL, _collection: 'vendors+activities',
    _source: hhObj._verify_before_running ? 'Gaslamp happy-hour pull (see GaslampActivities.json _verify_before_running notes)' : '',
    _generated: ANCHOR,
    vendors, happyHours,
  };
  writeFileSync('./GaslampHappyHour.json', JSON.stringify(out, null, 2));
  console.log(`GaslampHappyHour.json: ${vendors.length} venue cards + ${happyHours.length} happy hours (weekly), shell ${HH_SHELL}`);
  const unver = happyHours.filter((h) => !h.verified).length;
  if (unver) console.log(`  note: ${unver} happy hours are verified:false (third-party listings) — confirm prices before publishing.`);
}
