#!/usr/bin/env node
/**
 * refresh-food.mjs — one command to take a food-distribution region from edited
 * raw data all the way to live on public.shellterra.app.
 *
 * For the given region it runs the SAME pipeline you'd run by hand:
 *   1. prepare-food-data*.mjs  — geocode + expand raw -> <Region>FoodDistribution.json
 *   2. build-*-food-vendors.mjs — derive the Vendors directory -> <Region>FoodVendors.json
 *   3. deploy-sites.mjs --deploy --only=main — rebuild the web bundles + deploy
 *      the main site (SD/OC/LA all live on public.shellterra.app).
 *
 * SAFETY GATE: after geocoding it reads the region's geocode-review file and, if
 * any entries are flagged (SUSPECT / LOW / NO MATCH / ERROR), it STOPS before
 * deploying and prints them. A wrong pin sends someone who needs food to the
 * wrong address. Re-run with --yes once you've eyeballed the flags to deploy
 * anyway, or --no-deploy to stop after the data rebuild and deploy separately.
 *
 * ENV (deploy step, unattended): CLOUDFLARE_API_TOKEN, CLOUDFLARE_ACCOUNT_ID,
 * MAIN_PAGES_PROJECT. Geocoding needs MAPBOX_TOKEN (SD/OC). Use --env-file=.env.
 *
 * USAGE
 *   node --env-file=.env refresh-food.mjs oc              # rebuild OC, gate, deploy
 *   node --env-file=.env refresh-food.mjs oc --yes        # deploy even if flags
 *   node --env-file=.env refresh-food.mjs sd --no-deploy  # rebuild only
 *   node --env-file=.env refresh-food.mjs all             # sd + oc + la, then one deploy
 */
import { execSync } from 'node:child_process';
import { readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
// shellterra-public lives under the app repo, a sibling of this seeder dir.
const PUBLIC = join(HERE, '..', 'shelter_services', 'shellterra-public');

const REGIONS = {
  sd: { name: 'San Diego',    prepare: 'prepare-food-data.mjs',    vendors: 'build-food-vendors.mjs',    review: 'geocode-review.txt' },
  oc: { name: 'Orange County', prepare: 'prepare-food-data-oc.mjs', vendors: 'build-oc-food-vendors.mjs', review: 'geocode-review-oc.txt' },
  la: { name: 'Los Angeles',  prepare: 'prepare-food-data-la.mjs', vendors: 'build-la-food-vendors.mjs', review: 'la-schedule-review.txt' },
};

const argv = process.argv.slice(2);
const YES = argv.includes('--yes');
const NO_DEPLOY = argv.includes('--no-deploy');
const target = (argv.find((a) => !a.startsWith('--')) || '').toLowerCase();
const regions = target === 'all' ? ['sd', 'oc', 'la'] : (REGIONS[target] ? [target] : null);

if (!regions) {
  console.error(`Usage: node --env-file=.env refresh-food.mjs <sd|oc|la|all> [--yes] [--no-deploy]`);
  process.exit(1);
}

const run = (cmd, cwd = HERE) => { console.log(`  $ ${cmd}`); execSync(cmd, { cwd, stdio: 'inherit' }); };

// Count flagged entries in a geocode/schedule review file (best-effort, per-region format).
function flaggedIn(reviewPath) {
  if (!existsSync(reviewPath)) return [];
  const lines = readFileSync(reviewPath, 'utf8').split('\n');
  return lines.filter((l) => /\b(SUSPECT|LOW RELEVANCE|LOW|NO MATCH|ERROR|UNPARSED)\b/.test(l));
}

let blocked = false;
for (const key of regions) {
  const r = REGIONS[key];
  console.log(`\n=== ${r.name} (${key}) ===`);
  console.log('① geocode + expand');
  run(`node ${r.prepare}`);
  console.log('② vendor directory');
  run(`node ${r.vendors}`);

  const flags = flaggedIn(join(HERE, r.review));
  if (flags.length) {
    console.log(`\n⚠ ${flags.length} flagged entr${flags.length === 1 ? 'y' : 'ies'} in ${r.review} — REVIEW before publishing:`);
    for (const f of flags) console.log('   ' + f.trim());
    if (!YES) blocked = true;
  } else {
    console.log(`✓ ${r.review}: no flagged entries.`);
  }
}

if (NO_DEPLOY) { console.log('\n(--no-deploy) data rebuilt; skipping deploy.'); process.exit(0); }

if (blocked) {
  console.error(`\n✋ Not deploying: address/schedule flags above need a human look.`);
  console.error(`   Fix the raw file(s) and re-run, or re-run with --yes to publish anyway.`);
  process.exit(2);
}

if (!process.env.MAIN_PAGES_PROJECT) {
  console.error(`\n✋ MAIN_PAGES_PROJECT is not set — the main site (SD/OC/LA) would be skipped.`);
  console.error(`   Set it (and CLOUDFLARE_API_TOKEN + CLOUDFLARE_ACCOUNT_ID) then re-run, or deploy manually.`);
  process.exit(3);
}

console.log(`\n③ rebuild web bundles + deploy main site (public.shellterra.app)`);
run(`node deploy-sites.mjs --deploy --only=main`, PUBLIC);
console.log(`\n✅ ${regions.map((k) => REGIONS[k].name).join(', ')} refreshed and deployed.`);
