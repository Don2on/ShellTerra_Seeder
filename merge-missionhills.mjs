#!/usr/bin/env node
/**
 * merge-missionhills.mjs — the user pasted a fresh Mission Hills pull as a SECOND
 * JSON object appended to each of MissionHillsActivities.json, MissionHillsVendors.json
 * and MissionHillsHappyHour.json (concatenation → invalid JSON). Split, merge, rewrite
 * each as ONE valid object routed to the right shell.
 *
 *   MissionHillsActivities.json -> 16 + 38 activities (dedup by slug)  [MissionHillActivities 6a8bafa72d35f648b78f]
 *   MissionHillsVendors.json    -> 51 vendor cards                     [MissionHillsVendors  6ab4725f002fed3dec6f]
 *   MissionHillsHappyHour.json  -> 7 venue cards + 11 happy hours      [MissionHillsHappyHour 6ab46da8e8c8fb2f5546]
 *                                  (happy hours native -> activity schema)
 */
import { readFileSync, writeFileSync } from 'node:fs';

const ACT_SHELL = '6a8bafa72d35f648b78f'; // MissionHillActivities (existing, public) — note: "Hill" not "Hills"
const VEND_SHELL = '6ab4725f002fed3dec6f'; // MissionHillsVendors (new)
const HH_SHELL = '6ab46da8e8c8fb2f5546';   // MissionHillsHappyHour (new)

function splitObjs(path) {
  const raw = readFileSync(path, 'utf8');
  const objs = []; let s = raw;
  while (s.trim()) {
    try { objs.push(JSON.parse(s)); break; }
    catch (e) { const m = /position (\d+)/.exec(e.message); if (!m) break; const cut = Number(m[1]); objs.push(JSON.parse(s.slice(0, cut))); s = s.slice(cut); }
  }
  return objs;
}

const now = new Date();
const anchor = new Date(now.getFullYear(), now.getMonth(), now.getDate());
anchor.setDate(anchor.getDate() - ((anchor.getDay() + 6) % 7) - 7); // Monday of last week
const ANCHOR = `${anchor.getFullYear()}-${String(anchor.getMonth() + 1).padStart(2, '0')}-${String(anchor.getDate()).padStart(2, '0')}`;
const DART = { MO: 1, TU: 2, WE: 3, TH: 4, FR: 5, SA: 6, SU: 7 };
const slugify = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

/* ===== ACTIVITIES ===== */
{
  const [base, add] = splitObjs('./MissionHillsActivities.json');
  const bySlug = new Map(base.items.map((i) => [i.slug, i]));
  let added = 0;
  for (const it of add.items) { if (!bySlug.has(it.slug)) added++; bySlug.set(it.slug, it); }
  const merged = { ...base, _shellId: ACT_SHELL, items: [...bySlug.values()] };
  writeFileSync('./MissionHillsActivities.json', JSON.stringify(merged, null, 2));
  console.log(`MissionHillsActivities.json: ${base.items.length} + ${add.items.length} -> ${merged.items.length} items (${added} net-new), shell ${ACT_SHELL} (MissionHillActivities)`);
}

/* ===== VENDORS ===== */
{
  const [, add] = splitObjs('./MissionHillsVendors.json');
  const addVend = add.items || add.vendors;
  const bySlug = new Map();
  for (const v of addVend) bySlug.set(v.slug, v);
  const out = {
    _comment: 'Mission Hills vendor directory. Seed with seed-vendors.mjs (reads _shellId).',
    _shell: 'MissionHillsVendors', _shellId: VEND_SHELL, _collection: 'vendors',
    _source: add._description || 'Mission Hills BID member directory + venue sites (Sep 2026)',
    vendors: [...bySlug.values()],
  };
  writeFileSync('./MissionHillsVendors.json', JSON.stringify(out, null, 2));
  console.log(`MissionHillsVendors.json: ${out.vendors.length} vendor cards, shell ${VEND_SHELL}`);
}

/* ===== HAPPY HOURS ===== */
{
  const [, hhObj] = splitObjs('./MissionHillsHappyHour.json');
  const hh = hhObj.items;
  const vend = JSON.parse(readFileSync('./MissionHillsVendors.json', 'utf8')).vendors;
  const vBySlug = new Map(vend.map((v) => [v.slug, v]));
  const venueSlugs = [...new Set(hh.map((h) => h.vendorSlug))];

  const vendors = venueSlugs.map((s) => {
    const v = vBySlug.get(s); if (!v) return null;
    const { _notes, _pinSource, _geocode, events, ...rest } = v;
    return { ...rest, events: [] };
  }).filter(Boolean);

  const used = new Set();
  const happyHours = hh.map((h) => {
    const days = (h.days || []).map((d) => DART[d]).filter(Boolean).sort((a, b) => a - b);
    const dealTxt = (h.deals || []).join('; ');
    const note = h.notes && !/^UNVERIFIED/i.test(h.notes) ? ` ${h.notes}` : '';
    let slug = slugify(`${h.vendorSlug}-hh-${h.label || 'happy-hour'}`); let b = slug, i = 2;
    while (used.has(slug)) slug = `${b}-${i++}`; used.add(slug);
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
    _comment: 'MissionHillsHappyHour seed data. vendors[] -> vendors collection; happyHours[] -> activities collection (--no-host-grouping). Happy hours weekly (recurDays Dart Mon=1..Sun=7), anchored to a past Monday.',
    _shell: 'MissionHillsHappyHour', _shellId: HH_SHELL, _collection: 'vendors+activities',
    _source: hhObj._description || 'Mission Hills happy hours (venue sites, Sep 2026)',
    _generated: ANCHOR,
    vendors, happyHours,
  };
  writeFileSync('./MissionHillsHappyHour.json', JSON.stringify(out, null, 2));
  const unver = happyHours.filter((h) => !h.verified).length;
  console.log(`MissionHillsHappyHour.json: ${vendors.length} venue cards + ${happyHours.length} happy hours, shell ${HH_SHELL}${unver ? ` (${unver} verified:false)` : ''}`);
}
