#!/usr/bin/env node
/**
 * ShellTerra — patch verified addresses + coordinates into GaslampActivities.json.
 * Corrections from external venue verification (Sep 2026): fixes the systematic
 * ~180m westward coordinate shift, duplicate pins, and three wrong street addresses.
 *
 *   node fix-gaslamp-coords.mjs           # dry run
 *   node fix-gaslamp-coords.mjs --write   # apply
 */
import { readFileSync, writeFileSync } from 'node:fs';
import process from 'node:process';

const WRITE = process.argv.includes('--write');
const FILE = 'GaslampActivities.json';

// keyed by locationName -> verified { lat, lng, address?, newLocationName? }
const FIX = {
  'Laugh Factory San Diego':             { lat: 32.7137991, lng: -117.1604360, address: '432 F St, San Diego, CA 92101' },
  "National Lampoon's The Yellow Door":  { lat: 32.7132989, lng: -117.1594190 },
  'Cafe Sevilla':                        { lat: 32.7089347, lng: -117.1599693 },
  'Onyx Room':                           { lat: 32.7143742, lng: -117.1603214 },
  'F6ix':                                { lat: 32.7137350, lng: -117.1596867, address: '526 F St, San Diego, CA 92101' },
  'Side Bar':                            { lat: 32.7116509, lng: -117.1594046 },
  'NOVA SD':                             { lat: 32.7101458, lng: -117.1595032, address: '454 Sixth Ave, San Diego, CA 92101' },
  'Hard Rock Hotel San Diego':           { lat: 32.7075541, lng: -117.1598784 },
  'Andaz San Diego':                     { lat: 32.7138553, lng: -117.1587941 },
  'Prohibition':                         { lat: 32.7111155, lng: -117.1603528 },
  'TORO':                                { lat: 32.7124192, lng: -117.1604057 },
  'Hilton San Diego Gaslamp Quarter':    { lat: 32.7080257, lng: -117.1607766 },
  'GARAGE Kitchen + Bar':                { lat: 32.7121492, lng: -117.1609041 },
  'Horton Plaza Park':                   { lat: 32.7154214, lng: -117.1615444, address: '397 Broadway, San Diego, CA 92101' },
  'William Heath Davis House':           { lat: 32.7105762, lng: -117.1606887, newLocationName: 'Gaslamp Museum at the Davis-Horton House' },
  // street festival — real pin on Fifth Ave & F St (kept as an intersection address)
  'Gaslamp Quarter — Fifth Ave':         { lat: 32.7126, lng: -117.1601 },
};

const raw = JSON.parse(readFileSync(FILE, 'utf8'));
let changed = 0;
const seen = {};
for (const it of raw.items) {
  const f = FIX[(it.locationName || '').trim()];
  if (!f) continue;
  const before = `${it.lat},${it.lng} | ${it.address}`;
  it.lat = f.lat; it.lng = f.lng;
  if (f.address) it.address = f.address;
  if (f.newLocationName) it.locationName = f.newLocationName;
  const key = it.locationName;
  if (!seen[key]) { seen[key] = true; console.log(`  ${key}\n      was ${before}\n      now ${it.lat},${it.lng} | ${it.address}`); }
  changed++;
}
console.log(`\n${WRITE ? 'WROTE' : 'DRY RUN'} — ${changed} items patched in ${FILE}.`);
if (WRITE) writeFileSync(FILE, JSON.stringify(raw, null, 2) + '\n');
else console.log('Re-run with --write to apply.\n');
