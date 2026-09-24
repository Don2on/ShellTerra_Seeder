#!/usr/bin/env node
/**
 * parse-capoc.mjs — parse the OC Food Bank (Community Action Partnership of OC)
 * distribution-partner directory and diff it against what the FoodDistributionOC
 * shell already has, so we only add sites we don't currently carry.
 *
 * capoc.org/distribution-partners/ is a Divi accordion: one
 *   <h5 class="et_pb_toggle_title">CITY</h5>
 * per city, each followed by <ul><li>Name, Street, Phone</li>…</ul>. The OC Food
 * Bank is a DIFFERENT network from Second Harvest (feedoc.org, our existing
 * source), so it surfaces partner sites we may be missing. The list carries no
 * distribution schedule ("call 2-1-1"), so net-new sites become call-ahead cards.
 *
 * Reads capoc-raw.html (curl it with a browser UA — ModSecurity blocks default
 * curl) and OC-existing-vendors.json (dumped from the live shell). Writes
 * OC-capoc-new.json (net-new sites only) and prints a dedup report.
 */
import { readFileSync, writeFileSync } from 'node:fs';

const decode = (s) => String(s || '')
  .replace(/&#8211;|&#8212;|&ndash;|&mdash;/gi, '-')
  .replace(/&#0?38;|&amp;/gi, '&')
  .replace(/&#8220;|&#8221;|&#8216;|&#8217;|&#0?39;|&quot;/gi, "'")
  .replace(/&nbsp;/gi, ' ')
  .replace(/<[^>]+>/g, ' ')
  .replace(/\s+/g, ' ')
  .trim();

const html = readFileSync('./capoc-raw.html', 'utf8');

// Walk toggle blocks: capture the h5 city, then the <li> rows until the next h5.
const sites = [];
const blockRe = /<h5[^>]*class="[^"]*et_pb_toggle_title[^"]*"[^>]*>([\s\S]*?)<\/h5>([\s\S]*?)(?=<h5[^>]*class="[^"]*et_pb_toggle_title|$)/gi;
let m;
while ((m = blockRe.exec(html)) !== null) {
  const city = decode(m[1]).replace(/\b\w/g, (c) => c.toUpperCase()); // Title Case
  if (!/^[A-Za-z .'-]{2,30}$/.test(city)) continue;
  const body = m[2];
  const liRe = /<li[^>]*>([\s\S]*?)<\/li>/gi;
  let li;
  while ((li = liRe.exec(body)) !== null) {
    const txt = decode(li[1]);
    // "Name, Street address, 7149170440"  (phone is a 10-digit run at the end)
    const pm = txt.match(/(\d{10})\s*$/) || txt.match(/(\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4})\s*$/);
    if (!pm) continue;
    const phoneRaw = pm[1].replace(/\D/g, '');
    const rest = txt.slice(0, pm.index).replace(/,\s*$/, '').trim();
    // "Name, Street[, Suite/Unit]" — names carry no commas, so split at the FIRST
    // comma: name before it, the rest (street + optional suite) after. Splitting
    // at the last comma mis-reads "…, 17150 Newhope St, Suite 203" as street=Suite.
    const ci = rest.indexOf(',');
    if (ci === -1) continue;
    const name = rest.slice(0, ci).trim();
    const street = rest.slice(ci + 1).replace(/\s+/g, ' ').trim();
    if (!name || !street) continue;
    const phone = phoneRaw.length === 10
      ? `(${phoneRaw.slice(0,3)}) ${phoneRaw.slice(3,6)}-${phoneRaw.slice(6)}` : '';
    sites.push({ name, street, city, phone, address: `${street}, ${city}, CA` });
  }
}

/* ---------------- dedup vs existing shell ---------------- */
const STOP = /\b(inc|incorporated|the|of|a|church|ministries?|ministry|foundation|center|centre|community|services?|orange county|oc|ca|llc|non profit|nonprofit|assembly|god|christ|christian|iglesia|first|food|pantry|bank)\b/gi;
const normName = (s) => decode(s).toLowerCase().replace(/&/g, ' and ').replace(/[^a-z0-9 ]/g, ' ').replace(STOP, ' ').replace(/\s+/g, ' ').trim();
const DIR = new Set(['n', 's', 'e', 'w', 'north', 'south', 'east', 'west']);
const streetKey = (addr) => {
  const num = (addr.match(/\b(\d{2,6})\b/) || [])[1] || '';
  // first non-directional street word (so "1277 S. Lyon" and "1277 South Lyon" agree on "lyon")
  const words = addr.toLowerCase().replace(/[^a-z ]/g, ' ').split(/\s+/).filter((w) => w.length >= 3 && !DIR.has(w));
  return num && words[0] ? `${num}|${words[0]}` : '';
};

const existing = JSON.parse(readFileSync('./OC-existing-vendors.json', 'utf8'));
const exName = new Set(existing.map((v) => normName(v.name)).filter((x) => x.length >= 3));
const exStreet = new Set(existing.map((v) => streetKey(v.address || '')).filter(Boolean));

const isNew = (s) => {
  const nk = normName(s.name);
  const sk = streetKey(s.street);
  if (nk.length >= 3 && exName.has(nk)) return false;
  if (sk && exStreet.has(sk)) return false;
  return true;
};

const seenNew = new Set();
const newSites = [];
for (const s of sites) {
  const key = `${normName(s.name)}|${streetKey(s.street)}`;
  if (seenNew.has(key)) continue;               // dedup within capoc itself
  seenNew.add(key);
  if (isNew(s)) newSites.push(s);
}

writeFileSync('./OC-capoc-new.json', JSON.stringify(newSites, null, 2));

const byCity = {};
newSites.forEach((s) => { byCity[s.city] = (byCity[s.city] || 0) + 1; });
console.log(`capoc parsed: ${sites.length} partner rows`);
console.log(`existing shell vendors: ${existing.length}`);
console.log(`NET-NEW (not in shell): ${newSites.length}`);
console.log('by city:', Object.entries(byCity).sort((a, b) => b[1] - a[1]).map((e) => `${e[0]}:${e[1]}`).join(', '));
console.log('\nsample net-new:');
newSites.slice(0, 20).forEach((s) => console.log(`  • ${s.name} — ${s.street}, ${s.city}  ${s.phone}`));
