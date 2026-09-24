#!/usr/bin/env node
/**
 * build-bfn.mjs — Berkeley Food Network (berkeleyfoodnetwork.org/getfood) pantries
 * -> BFNFoodVendors.json + BFNFoodDistribution.json for the public map bundle.
 *
 * BFN publishes recurring schedules (e.g. "2nd & 4th Wed"), not dated events, so
 * this expands each pantry's recurrence into dated distributions for the current
 * month + the next three (matching build-data.mjs's food window). Re-run monthly
 * to roll the window forward. Coordinates were geocoded via Mapbox.
 *
 * Usage (from shellterra-seeder/):  node build-bfn.mjs
 */
import { writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const DAY = 86400000;
const iso = (ms) => new Date(ms).toISOString().slice(0, 10);

const now = new Date();
const START = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1);       // 1st of current month
const END = Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 4, 0);     // last day of month + 3

// Weekly on the given weekdays (0=Sun..6=Sat), across the window.
function weekly(dows) {
  const out = [];
  for (let ms = START; ms <= END; ms += DAY) {
    if (dows.includes(new Date(ms).getUTCDay())) out.push(iso(ms));
  }
  return out;
}

// nth weekday(s) of each month in the window. ns = week numbers (1-based),
// dow = 0..6, months = optional [1..12] filter (e.g. Sep–May school terms).
function monthly(ns, dow, months) {
  const out = [];
  for (let k = 0; k < 4; k++) {
    const mm = (now.getUTCMonth() + k) % 12;
    const yy = now.getUTCFullYear() + Math.floor((now.getUTCMonth() + k) / 12);
    if (months && !months.includes(mm + 1)) continue;
    for (const n of ns) {
      const first = new Date(Date.UTC(yy, mm, 1)).getUTCDay();
      const day = 1 + ((dow - first + 7) % 7) + (n - 1) * 7;
      const d = new Date(Date.UTC(yy, mm, day));
      if (d.getUTCMonth() === mm) {
        const ms = d.getTime();
        if (ms >= START && ms <= END) out.push(iso(ms));
      }
    }
  }
  return out.sort();
}

const SITE = 'https://www.berkeleyfoodnetwork.org/getfood/';
const PHONE = '510-616-5383';

// Each pantry: name, address, coords, schedule summary (tagline), the start time
// shown on each distribution, and the recurrence that generates the dates.
const SITES = [
  {
    slug: 'bfn-9th-street-pantry',
    name: '9th Street Pantry',
    tagline: 'Marketplace pantry · Tue & Thu, 11 AM–6 PM · shop once/week',
    description: 'BFN’s main marketplace pantry — members shop and choose their own items: seasonal produce, shelf-stable goods, and rotating proteins. One visit per week. First visit requires a short registration (available in 12+ languages). Free street parking; transit 51B or 72/72M/72R.',
    address: '1925 Ninth Street (at University), Berkeley, CA 94710',
    lat: 37.869182, lng: -122.294226,
    time: '11:00',
    dates: weekly([2, 4]), // Tue & Thu
  },
  {
    slug: 'bfn-berkeley-technology-academy',
    name: 'Berkeley Technology Academy',
    tagline: 'Pop-up pantry · 2nd & 4th Wed, 1–2:30 PM',
    description: 'Pop-up neighborhood pantry hosted at Berkeley Technology Academy.',
    address: '2701 Martin Luther King Jr Way (at Derby), Berkeley, CA 94703',
    lat: 37.859498, lng: -122.270451,
    time: '13:00',
    dates: monthly([2, 4], 3), // 2nd & 4th Wednesday
  },
  {
    slug: 'bfn-albany-high-school',
    name: 'Albany High School',
    tagline: 'Pop-up pantry · 1st & 3rd Fri, 1:30–2:30 PM',
    description: 'Pop-up neighborhood pantry in the Albany High School cafeteria.',
    address: '603 Key Route Boulevard (cafeteria), Albany, CA 94706',
    lat: 37.896112, lng: -122.292329,
    time: '13:30',
    dates: monthly([1, 3], 5), // 1st & 3rd Friday
  },
  {
    slug: 'bfn-south-berkeley-senior-center',
    name: 'South Berkeley Senior Center',
    tagline: 'Pop-up pantry · 2nd & 4th Mon, 2–3 PM',
    description: 'Pop-up neighborhood pantry at the South Berkeley Senior Center.',
    address: '2939 Ellis Street, Berkeley, CA 94703',
    lat: 37.854282, lng: -122.272920,
    time: '14:00',
    dates: monthly([2, 4], 1), // 2nd & 4th Monday
  },
  {
    slug: 'bfn-berkeley-high-school',
    name: 'Berkeley High School',
    tagline: 'Pop-up pantry · 1st & 3rd Wed, 3:30–4:30 PM (Sep–May)',
    description: 'Pop-up neighborhood pantry at the gate between the athletic fields and Building G (MLK at Bancroft). School year only (September–May).',
    address: 'Martin Luther King Jr Way at Bancroft Way, Berkeley, CA 94704',
    lat: 37.866990, lng: -122.272516,
    time: '15:30',
    dates: monthly([1, 3], 3, [9, 10, 11, 12, 1, 2, 3, 4, 5]), // 1st & 3rd Wed, Sep–May
  },
];

const vendors = SITES.map((s) => ({
  slug: s.slug,
  name: s.name,
  category: 'Food pantry',
  tagline: s.tagline,
  description: s.description,
  website: SITE,
  phone: PHONE,
  address: s.address,
  lat: s.lat,
  lng: s.lng,
  events: s.dates.map((date) => ({ title: s.name, date, time: s.time, description: '' })),
  _eventCount: s.dates.length,
}));

const generated = iso(Date.now());
writeFileSync(`${HERE}/BFNFoodVendors.json`, JSON.stringify({ vendors }, null, 1));
writeFileSync(`${HERE}/BFNFoodDistribution.json`, JSON.stringify({
  _meta: {
    topic: 'Free food pantries — Berkeley Food Network',
    generated,
    sources: ['Berkeley Food Network — https://www.berkeleyfoodnetwork.org/getfood/'],
  },
}, null, 1));

const total = vendors.reduce((a, v) => a + v.events.length, 0);
console.log(`✅ BFN: ${vendors.length} pantries, ${total} distributions -> BFNFoodVendors.json`);
for (const v of vendors) console.log(`   · ${v.name}: ${v.events.length} dates`);
