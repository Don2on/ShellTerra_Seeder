#!/usr/bin/env node
/**
 * merge-oc-new-2026-09.mjs — append a vetted batch of NEW Orange County food
 * sites (South OC + coastal/central gap cities) into OCFoodDistribution-raw.json.
 *
 * Web-sourced 2026-09-23. Each entry carries the sourceUrl it was verified on.
 * Dupes of existing sites (Serra's Pantry SJC, Someone Cares CM, FAM 2nd-Sat,
 * Saddleback SJC) were dropped before this file was written.
 *
 * Idempotent: skips any site whose normalized name OR street address already
 * exists in the raw file. Backs up the raw file to
 * OCFoodDistribution-raw.backup-2026-09-23.json before writing.
 *
 * After running:
 *   node --env-file=.env prepare-food-data-oc.mjs   # geocode + expand -> OCFoodDistribution.json + geocode-review-oc.txt (READ IT)
 *   node build-oc-food-vendors.mjs                  # -> OCFoodVendors.json
 *
 * USAGE
 *   node merge-oc-new-2026-09.mjs --dry-run
 *   node merge-oc-new-2026-09.mjs
 */
import { readFileSync, writeFileSync, copyFileSync, existsSync } from 'node:fs';

const RAW = './OCFoodDistribution-raw.json';
const BATCH_OUT = './OC-new-sites-2026-09.json';
const BACKUP = './OCFoodDistribution-raw.backup-2026-09-23.json';
const DRY = process.argv.includes('--dry-run');

const slugify = (s) => (s || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const normName = (s) => (s || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
const normAddr = (s) => (s || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').replace(/\b(ave|avenue|blvd|boulevard|st|street|rd|road|dr|drive|pkwy|parkway|ste|suite|unit)\b/g, '').replace(/\s+/g, ' ').trim();

// ── Vetted new sites (web-sourced 2026-09-23). slug is added below. ──
const NEW = [
  { name: "Laguna Food Pantry", type: "pantry", address: "20652 Laguna Canyon Road, Unit B, Laguna Beach, CA 92651", neighborhood: "Laguna Beach", phone: "(949) 497-7121",
    scheduleText: "Monday through Friday, 8:00 a.m. to 10:30 a.m.",
    hours: [{days:"Mon",open:"08:00",close:"10:30"},{days:"Tue",open:"08:00",close:"10:30"},{days:"Wed",open:"08:00",close:"10:30"},{days:"Thu",open:"08:00",close:"10:30"},{days:"Fri",open:"08:00",close:"10:30"}],
    eligibility: "None. Groceries 100% free; ID requested, residency not required. Once weekly.", sourceUrl: "https://www.lagunafoodpantry.org/pantry-information" },

  { name: "Mariners Church Food Pantry", type: "pantry", address: "5001 Newport Coast Dr., Irvine, CA 92603", neighborhood: "Irvine", phone: "(949) 769-8131",
    scheduleText: "Tuesday through Friday, 9:30 a.m. to 12:30 p.m.",
    hours: [{days:"Tue",open:"09:30",close:"12:30"},{days:"Wed",open:"09:30",close:"12:30"},{days:"Thu",open:"09:30",close:"12:30"},{days:"Fri",open:"09:30",close:"12:30"}],
    eligibility: "Orange County residents; call before visiting. Choice-based.", sourceUrl: "https://www.marinerschurch.org/food-pantry-thrift-store/" },

  { name: "City of Irvine Free Grocery Food Box", type: "distribution", address: "8000 Great Park Blvd, Irvine, CA 92618", neighborhood: "Irvine", phone: "(949) 724-6650",
    scheduleText: "Second Thursday of each month, 9:00 AM to 12:00 PM. Drive-through, first-come first-served (Great Park, Parking Lot 2).",
    hours: [], eligibility: "~30-lb box of food once a month", sourceUrl: "https://cityofirvine.gov/food-pantries" },

  { name: "South County Outreach Food Market", type: "pantry", address: "23661 Birtcher Drive, Lake Forest, CA 92630", neighborhood: "Lake Forest", phone: "(949) 687-2401",
    scheduleText: "Monday through Thursday, 9:00 a.m. to 2:00 p.m. By appointment; email appointments@sco-oc.org or call. Once a month.",
    hours: [], eligibility: "Application, income self-declaration, and photo ID required. Appointment required.", deferred: true,
    sourceUrl: "https://www.sco-oc.org/important-notice-sco-food-pantry-moving-starting-june-1-2026/" },

  { name: "Nourishing Great Futures Market (Boys & Girls Clubs of Capistrano Valley)", type: "pantry", address: "24671 Via Iglesia, Aliso Viejo, CA 92656", neighborhood: "Aliso Viejo", phone: null,
    scheduleText: "Every Wednesday, 9:30 AM to 10:30 AM. Rain or shine. Walk-ups welcome; first come, first served.",
    hours: [{days:"Wed",open:"09:30",close:"10:30"}], eligibility: "None. No ID or proof of income; provide last name and family size. Bring bags.",
    sourceUrl: "https://bgccapo.com/nourishing-great-futures-market" },

  { name: "Coast Hills Church Food Pantry", type: "pantry", address: "5 Pursuit, Aliso Viejo, CA 92656", neighborhood: "Aliso Viejo", phone: "(949) 362-0079",
    scheduleText: "1st and 3rd Saturday of the month, 8:00 AM to 10:00 AM.",
    hours: [], eligibility: "Families in the church and community", sourceUrl: "https://foodpantries.org/li/coast_hills_community_church_92656" },

  { name: "Crossline Community Church Food Pantry", type: "pantry", address: "23331 Moulton Parkway, Laguna Hills, CA 92653", neighborhood: "Laguna Hills", phone: "(949) 916-0250",
    scheduleText: "Wednesday and Friday, 8:00 a.m. to 11:00 a.m.",
    hours: [{days:"Wed",open:"08:00",close:"11:00"},{days:"Fri",open:"08:00",close:"11:00"}],
    eligibility: "Residents of South Orange County", sourceUrl: "https://www.crosslinechurch.com/food-pantry/" },

  { name: "Mission Hills Church Food Pantry", type: "pantry", address: "24162 Alicia Parkway, Mission Viejo, CA 92691", neighborhood: "Mission Viejo", phone: "(949) 586-4510",
    scheduleText: "Tuesday 3:00 p.m. to 5:00 p.m. and Wednesday 5:00 p.m. to 6:00 p.m. (community meal Wed).",
    hours: [{days:"Tue",open:"15:00",close:"17:00"},{days:"Wed",open:"17:00",close:"18:00"}],
    eligibility: "Client-choice pantry for those with food insecurity or emergency need", sourceUrl: "https://www.foodpantries.org/li/ca_92691_mission-hills-church-food-pantry" },

  { name: "St. Kilian Outreach Food Pantry", type: "pantry", address: "26872 Estanciero Rd, Mission Viejo, CA 92691", neighborhood: "Mission Viejo", phone: "(949) 609-8111",
    scheduleText: "Tuesdays 10:00 a.m. to 12:00 p.m. and Fridays 9:00 a.m. to 12:30 p.m.",
    hours: [{days:"Tue",open:"10:00",close:"12:00"},{days:"Fri",open:"09:00",close:"12:30"}],
    eligibility: "Local families", sourceUrl: "https://sites.google.com/cabrillopointacademy.org/community-outreach-resources/mission-viejolake-forestrsm" },

  { name: "RSM Cares Food Pantry", type: "distribution", address: "30605 Avenida de Las Flores, Rancho Santa Margarita, CA 92688", neighborhood: "Rancho Santa Margarita", phone: "(714) 348-3292",
    scheduleText: "1st and 3rd Wednesday of each month, 2:00 PM to 4:30 PM. Drive-through.",
    hours: [], eligibility: "None. All welcome; no prequalification.", sourceUrl: "https://cityofrsm.org/Calendar.aspx?EID=1735" },

  { name: "Dana Point Senior Center Food Pantry", type: "pantry", address: "34052 Del Obispo Street, Dana Point, CA 92629", neighborhood: "Dana Point", phone: "(949) 496-4252",
    scheduleText: "3rd Thursday of the month, 9:00 AM to 11:00 AM.",
    hours: [], eligibility: null, sourceUrl: "https://www.foodpantries.org/li/dana_point_senior_center_92629" },

  { name: "St. Michael's Society Food Pantry (Saint Michael's Church)", type: "pantry", address: "107 W. Marquita, San Clemente, CA 92672", neighborhood: "San Clemente", phone: "(949) 366-9480",
    scheduleText: "Monday, 4:00 p.m. to 5:00 p.m. Please do not arrive before 3:30 p.m.",
    hours: [{days:"Mon",open:"16:00",close:"17:00"}], eligibility: "Bring photo ID and proof of address", sourceUrl: "https://foodpantries.org/li/the_st_michaels_society_92672" },

  { name: "Melinda Hoag Smith Center for Healthy Living Food Distribution", type: "distribution", address: "307 Placentia Avenue, Newport Beach, CA 92663", neighborhood: "Newport Beach", phone: "(949) 764-6551",
    scheduleText: "1st and 3rd Thursday of every month (drive-thru). Call for the day's start time; allotment by family size; once per month per registrant. Dates shift for holidays.",
    hours: [], eligibility: "Open to community; register (once monthly)", deferred: true, sourceUrl: "https://www.hoag.org/healthy-living-programs" },

  { name: "Beachcities Pantry (Beachcities Church)", type: "pantry", address: "9872 Hamilton Avenue, Huntington Beach, CA 92646", neighborhood: "Huntington Beach", phone: "(714) 698-0668",
    scheduleText: "Typically 1st and 3rd Saturday, curbside 8:00-9:30 a.m. by appointment. Online order form opens Sun 8 a.m., closes Tue 8 p.m. or at capacity. Photo ID; one order per household.",
    hours: [], eligibility: "Community members with basic food/household needs; photo ID; online order required.", deferred: true, sourceUrl: "https://www.beachcities.org/pantry" },

  { name: "St. Bonaventure Catholic Parish - HOPE Food Ministry", type: "pantry", address: "16410 Springdale Street, Huntington Beach, CA 92649", neighborhood: "Huntington Beach", phone: "(714) 846-3831",
    scheduleText: "Monday through Friday, 10:00 a.m. to 11:15 a.m.",
    hours: [{days:"Mon",open:"10:00",close:"11:15"},{days:"Tue",open:"10:00",close:"11:15"},{days:"Wed",open:"10:00",close:"11:15"},{days:"Thu",open:"10:00",close:"11:15"},{days:"Fri",open:"10:00",close:"11:15"}],
    eligibility: "Seniors and families near Huntington Beach", sourceUrl: "https://www.stbonaventure.org/ministries/hope" },

  { name: "Oak View Family Resource Center Food Distribution", type: "distribution", address: "17261 Oak Lane, Huntington Beach, CA 92647", neighborhood: "Huntington Beach", phone: "(714) 842-4002",
    scheduleText: "Every Friday, 9:30 a.m. to 12:00 p.m. Call after 11 a.m. Monday with name and phone; you are assigned a slot for the following Friday.",
    hours: [{days:"Fri",open:"09:30",close:"12:00"}], eligibility: "Anyone in need. Advance sign-up required.", deferred: true, sourceUrl: "https://www.factoc.org/frc/oakview/" },

  { name: "First Christian Church of Huntington Beach Drive-Thru Pantry", type: "distribution", address: "1207 Main Street, Huntington Beach, CA 92648", neighborhood: "Huntington Beach", phone: "(714) 845-5377",
    scheduleText: "4th Sunday of every month, 1:00 PM to 2:30 PM. Drive-thru (corner of Adams & 17th).",
    hours: [], eligibility: "None; stay in your car", sourceUrl: "https://www.fcchb.com/assistance" },

  { name: "Community United Methodist Church Food Closet", type: "pantry", address: "6652 Heil Avenue, Huntington Beach, CA 92647", neighborhood: "Huntington Beach", phone: "(714) 842-4461",
    scheduleText: "Fridays, 12:00 p.m. to 2:00 p.m. One bag of essentials plus extras, once a month.",
    hours: [{days:"Fri",open:"12:00",close:"14:00"}], eligibility: "HB and Westminster individuals/families in need (once monthly)", sourceUrl: "https://cumchb.org/loving/" },

  { name: "Vietnamese American Cancer Foundation (VACF) Food Distribution", type: "distribution", address: "17150 Newhope St, Suite 201-203, Fountain Valley, CA 92708", neighborhood: "Fountain Valley", phone: "(714) 751-5805",
    scheduleText: "First Saturday of each month, 10:00 AM to 12:00 PM.",
    hours: [], eligibility: null, sourceUrl: "https://www.vacf.org/event-details/food-distribution" },

  { name: "Caring Kitchen (Costa Mesa Church of Christ)", type: "soup-kitchen", address: "287 W Wilson St, Costa Mesa, CA 92627", neighborhood: "Costa Mesa", phone: "(949) 645-3191",
    scheduleText: "Hot meals every Tuesday evening, 5:30 p.m. to 6:30 p.m.",
    hours: [{days:"Tue",open:"17:30",close:"18:30"}], eligibility: null, sourceUrl: "https://food-banks.org/detail/costa_mesa_church_of_christ_caring_kitchen_costa_mesa_ca.html" },

  { name: "Armor of Light Ministry Food Pantry (Calvary Chapel)", type: "pantry", address: "3800 S. Fairview, Santa Ana, CA 92704", neighborhood: "Santa Ana", phone: "(714) 979-4422",
    scheduleText: "Sunday, 11:00 a.m. to 1:00 p.m.",
    hours: [{days:"Sun",open:"11:00",close:"13:00"}], eligibility: null, sourceUrl: "https://www.foodpantries.org/li/ca_santa-ana_armor-of-light-ministry-food-pantry" },
];

// Add slugs (name + city), matching the existing raw-file convention.
for (const s of NEW) s.slug = `${slugify(s.name)}-${slugify(s.neighborhood)}`;

writeFileSync(BATCH_OUT, JSON.stringify({ _source: "Web-sourced 2026-09-23; South OC + coastal/central OC gap cities. Verify each against sourceUrl before publishing.", _count: NEW.length, sites: NEW }, null, 2));
console.log(`📝 wrote ${BATCH_OUT} (${NEW.length} candidate sites)`);

const raw = JSON.parse(readFileSync(RAW, 'utf8'));
const existingNames = new Set(raw.sites.map((s) => normName(s.name)));
const existingAddrs = new Set(raw.sites.map((s) => normAddr(s.address)));
const existingSlugs = new Set(raw.sites.map((s) => s.slug));

const added = [], skipped = [];
for (const s of NEW) {
  const dupName = existingNames.has(normName(s.name));
  const dupAddr = existingAddrs.has(normAddr(s.address));
  const dupSlug = existingSlugs.has(s.slug);
  if (dupName || dupAddr || dupSlug) {
    skipped.push(`${s.name} — ${dupName ? 'name' : dupAddr ? 'address' : 'slug'} already present`);
    continue;
  }
  added.push(s);
  existingNames.add(normName(s.name)); existingAddrs.add(normAddr(s.address)); existingSlugs.add(s.slug);
}

console.log(`\n${added.length} to add, ${skipped.length} skipped as dupes.`);
if (skipped.length) console.log('  SKIP:\n   - ' + skipped.join('\n   - '));

if (DRY) { console.log('\n(dry run — raw file not modified)'); process.exit(0); }

if (!existsSync(BACKUP)) { copyFileSync(RAW, BACKUP); console.log(`\n🗄  backed up raw -> ${BACKUP}`); }
raw.sites.push(...added);
writeFileSync(RAW, JSON.stringify(raw, null, 2));
console.log(`✅ ${RAW} now has ${raw.sites.length} sites (was ${raw.sites.length - added.length}).`);
console.log(`\nNext:\n  node --env-file=.env prepare-food-data-oc.mjs   # geocode + READ geocode-review-oc.txt\n  node build-oc-food-vendors.mjs`);
