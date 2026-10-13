/*
 * seed-all-food-counties.mjs — cross-platform orchestrator (no bash needed).
 * Run from the repo root:   node seed-all-food-counties.mjs
 * For each county: create shell -> patch vendor _shellId -> seed activities ->
 * seed vendors -> make public. Prints each shell's $id and continues on error.
 * To seed privately, set PUBLISH=false below.
 */
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';

const COUNTIES = ['Alameda', 'Alpine', 'Amador', 'Butte', 'Calaveras', 'Colusa',
  'Fresno', 'Glenn', 'Humboldt', 'Imperial',
  'Lassen', 'Madera', 'Marin', 'Mariposa',
  'Mendocino', 'Merced', 'Modoc', 'Mono',
  'Monterey', 'Napa', 'Nevada',
  'Placer', 'Plumas', 'Riverside',
  'SanBenito', 'SanFrancisco', 'SanJoaquin', 'SanLuisObispo', 'SanMateo',
  'SantaBarbara', 'SantaClara', 'SantaCruz', 'Shasta',
  'Sierra', 'Siskiyou', 'Solano', 'Sonoma',
  'Stanislaus', 'Sutter', 'Tehama',
  'Trinity', 'Tulare', 'Tuolumne', 'Kern',
  'Ventura', 'Yuba', 'Kings', 'Lake',
  'Inyo', 'ContraCosta', 'DelNorte', 'ElDorado'];
const PUBLISH = true;

const node = (args) => execFileSync(process.execPath, args, { encoding: 'utf8' });
const tail = (s, n) => s.trim().split('\n').slice(-n).join('\n');

// Idempotent: skip any county whose FoodDistribution<County> shell already exists,
// so re-running the script only creates/seeds the new counties (no duplicate shells).
let existing = new Set();
try {
  existing = new Set(node(['--env-file=.env', 'list-food-shell-names.mjs']).trim().split('\n').filter(Boolean));
  console.log(`${existing.size} FoodDistribution shells already exist; those counties will be skipped.`);
} catch (e) { console.log('WARNING: could not list existing shells (' + (e.stderr || e.message).split('\n')[0] + '); proceeding without skip — watch for duplicates.'); }

const results = [];
for (const county of COUNTIES) {
  const act = `./${county}FoodDistribution.json`;
  const ven = `./${county}FoodVendors.json`;
  console.log(`\n######## ${county} ########`);
  if (existing.has(`FoodDistribution${county}`)) { console.log(`already exists, skipping`); continue; }
  if (!existsSync(act) || !existsSync(ven)) { console.log(`!! missing ${act} or ${ven}, skipping`); continue; }

  let out;
  try {
    out = node(['--env-file=.env', 'create-shell.mjs', '--name', `FoodDistribution${county}`,
      '--description', `Free food distributions, pantries, and community meals across ${county} County, California.`]);
  } catch (e) { console.log('create-shell failed:\n' + (e.stdout || e.stderr || e.message)); continue; }

  const m = out.match(/\$id:\s*([a-z0-9]+)/i);
  if (!m) { console.log('no $id found in create-shell output:\n' + out); continue; }
  const id = m[1];
  console.log(`shell id: ${id}`);

  const j = JSON.parse(readFileSync(ven, 'utf8'));
  j._shellId = id;
  writeFileSync(ven, JSON.stringify(j, null, 2));
  console.log(`patched ${ven} _shellId -> ${id}`);

  try { console.log(tail(node(['--env-file=.env', 'seed-activities.mjs', '--file', act, '--no-host-grouping', '--shell-id', id]), 3)); }
  catch (e) { console.log('seed-activities error:\n' + (e.stdout || e.stderr || e.message)); }

  try { console.log(tail(node(['--env-file=.env', 'seed-vendors.mjs', '--file', ven]), 3)); }
  catch (e) { console.log('seed-vendors error:\n' + (e.stdout || e.stderr || e.message)); }

  if (PUBLISH) {
    try { console.log(tail(node(['--env-file=.env', 'make-shell-public.mjs', '--shell-id', id]), 2)); }
    catch (e) { console.log('make-public error:\n' + (e.stdout || e.stderr || e.message)); }
  }

  results.push(`${county}: ${id}`);
  console.log(`== ${county} done: ${id} ==`);
}

console.log('\n================ SUMMARY ================');
console.log(results.length ? results.join('\n') : 'No shells created.');
