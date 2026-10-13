#!/usr/bin/env node
/**
 * refresh-food-events.mjs — roll every food vendor's `events` forward.
 *
 * CaliFood shows each site's distribution dates from the vendor's `events` field.
 * Those are dated occurrences with a fixed horizon, so without a refresh they
 * eventually run out. This reads each FoodDistribution shell's ACTIVITIES (their
 * native weekly/monthly recurrence — the source of truth), expands them into
 * dated occurrences over a rolling window [today, +4 months], matches each
 * activity to its vendor by street#+ZIP, and rewrites that vendor's `events`.
 *
 * Run monthly (see scheduling notes) so the window always extends ~4 months out.
 *
 * SAFE: only vendors that get matched expanded events are updated; unmatched
 * vendors (call-ahead / mobile / no-schedule) keep whatever they had.
 *
 * USAGE: node --env-file=.env refresh-food-events.mjs [--dry-run] [--shell <id>]
 */
import { Client, Databases, Query } from 'node-appwrite';
import process from 'node:process';

const DRY = process.argv.includes('--dry-run');
const only = (() => { const i = process.argv.indexOf('--shell'); return i > -1 ? process.argv[i + 1] : null; })();

const FOOD_PREFIX = 'FoodDistribution';

const client = new Client().setEndpoint(process.env.APPWRITE_ENDPOINT).setProject(process.env.APPWRITE_PROJECT_ID).setKey(process.env.APPWRITE_API_KEY);
const db = new Databases(client);
const DB = process.env.APPWRITE_DATABASE_ID;
const AC = process.env.ACTIVITIES_COLLECTION_ID || 'activities';
const SHELLS_COL = process.env.SHELLS_COLLECTION_ID;

// Discover every FoodDistribution shell dynamically (so new counties are covered
// automatically — same prefix CaliFood uses). --shell <id|name> narrows to one.
async function listShells() {
  const r = await db.listDocuments(DB, SHELLS_COL, [Query.startsWith('name', FOOD_PREFIX), Query.limit(200)]);
  return r.documents
    .map((d) => [d.name.replace(FOOD_PREFIX, '') || d.name, d.$id, d.name])
    .filter(([name, id, full]) => !only || id === only || full === only || name.toLowerCase() === String(only).toLowerCase());
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/* rolling window: today → end of (this month + 4) */
const now = new Date();
const WS = new Date(now.getFullYear(), now.getMonth(), now.getDate());
const HZ = new Date(now.getFullYear(), now.getMonth() + 5, 0);
const fmt = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const inWin = (d) => d >= WS && d <= HZ;
const dartToJs = (n) => (n === 7 ? 0 : n);
const hhmm = (t) => { if (!t) return ''; const [h, m] = String(t).split(':'); return `${String(h).padStart(2, '0')}:${String(m || '0').padStart(2, '0')}`; };
const streetNo = (s) => ((String(s).match(/^\s*(\d+)/) || [])[1] || '');
const zipOf = (s) => { const m = String(s).match(/\b\d{5}\b/g); return m ? m[m.length - 1] : ''; };
const norm = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

function nthWeekday(y, mIdx, n, dartDow) {
  const jsDow = dartToJs(dartDow);
  if (n < 0) { const last = new Date(y, mIdx + 1, 0); const off = (last.getDay() - jsDow + 7) % 7; return new Date(y, mIdx, last.getDate() - off); }
  const first = new Date(y, mIdx, 1); const off = (jsDow - first.getDay() + 7) % 7; const day = 1 + off + (n - 1) * 7;
  const d = new Date(y, mIdx, day); return d.getMonth() === mIdx ? d : null;
}
function expand(a) {
  const time = hhmm(a.startTime);
  const title = a.name || '';
  const r = a.recurrence, days = String(a.recur_days || '');
  const out = [];
  if (r === 'weekly') {
    const js = new Set(days.split(',').filter(Boolean).map(Number).map(dartToJs));
    for (let d = new Date(WS); d <= HZ; d.setDate(d.getDate() + 1)) if (js.has(d.getDay())) out.push(fmt(new Date(d)));
  } else if (r === 'monthly') {
    const pats = days.split(',').filter(Boolean).map((p) => { const [n, dow] = p.split(':').map(Number); return { n, dow }; });
    for (let k = 0; k < 6; k++) { const mo = new Date(WS.getFullYear(), WS.getMonth() + k, 1); for (const p of pats) { const d = nthWeekday(mo.getFullYear(), mo.getMonth(), p.n, p.dow); if (d && inWin(d)) out.push(fmt(d)); } }
  } else { const ds = String(a.date || '').slice(0, 10); if (ds) { const d = new Date(ds + 'T00:00:00'); if (inWin(d)) out.push(ds); } }
  return out.map((date) => ({ date, time, title }));
}

async function page(col, id) {
  const o = []; let cur = null;
  while (true) {
    let r; for (let i = 0; i < 6; i++) { try { r = await db.listDocuments(DB, col, [Query.equal('shellID', id), Query.limit(100), ...(cur ? [Query.cursorAfter(cur)] : [])]); break; } catch (e) { if (i === 5) throw e; await sleep(700); } }
    o.push(...r.documents); if (r.documents.length < 100) break; cur = r.documents.at(-1).$id;
  }
  return o;
}

async function run() {
  console.log(`window ${fmt(WS)} → ${fmt(HZ)}${DRY ? '  (dry-run)' : ''}\n`);
  const SHELLS = await listShells();
  if (!SHELLS.length) { console.log(only ? `no FoodDistribution shell matched "${only}"` : 'no FoodDistribution shells found'); return; }
  for (const [name, id] of SHELLS) {
    const acts = await page(AC, id);
    const vends = await page('vendors', id);
    const byKey = new Map(), byName = new Map();
    for (const v of vends) { const k = streetNo(v.address) + '|' + zipOf(v.address); if (streetNo(v.address) && zipOf(v.address)) byKey.set(k, v); byName.set(norm(v.name), v); }
    const evByVendor = new Map();
    for (const a of acts) {
      const addr = a.locationText || '';
      const v = byKey.get(streetNo(addr) + '|' + zipOf(addr)) || byName.get(norm((a.name || '').replace(/ [—-] Free Food.*/, '')));
      if (!v) continue;
      (evByVendor.get(v.$id) || evByVendor.set(v.$id, []).get(v.$id)).push(...expand(a));
    }
    let updated = 0, evTotal = 0, failed = 0;
    for (const [vid, evs] of evByVendor) {
      const seen = new Set();
      const clean = evs.filter((e) => { const k = e.date + '|' + e.time; if (seen.has(k)) return false; seen.add(k); return true; }).sort((x, y) => x.date.localeCompare(y.date) || x.time.localeCompare(y.time));
      if (!clean.length) continue;
      evTotal += clean.length;
      if (DRY) { updated++; continue; }
      try { await db.updateDocument(DB, 'vendors', vid, { events: JSON.stringify(clean) }); updated++; }
      catch (e) { failed++; if (failed <= 3) console.error(`  update fail ${vid}: ${e.message}`); }
    }
    console.log(`${name.padEnd(16)} activities=${String(acts.length).padStart(5)} vendors=${String(vends.length).padStart(4)}  → refreshed ${updated} vendors, ${evTotal} events${failed ? `, ${failed} failed` : ''}`);
  }
  console.log('\nDone. CaliFood dates now extend to ' + fmt(HZ) + '.');
}
run().catch((e) => { console.error('FAILED:', e.message); process.exit(1); });
