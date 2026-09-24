#!/usr/bin/env node
/**
 * Reconcile the HillcrestActivities shell in Appwrite with the cleaned seed file.
 *
 * The seeder (seed-activities.mjs) only creates/updates by a deterministic
 * stableId; it NEVER deletes. So dedup-ing the JSON leaves the removed events
 * as live documents. This script computes the valid docId set from the current
 * JSON and deletes any document in the shell that is no longer in that set.
 *
 * USAGE
 *   node --env-file=.env prune-hillcrest-activities.mjs            # dry run (list only)
 *   node --env-file=.env prune-hillcrest-activities.mjs --apply    # actually delete
 */

import { Client, Databases, Query } from 'node-appwrite';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import process from 'node:process';

const CFG = {
  endpoint:   process.env.APPWRITE_ENDPOINT,
  projectId:  process.env.APPWRITE_PROJECT_ID,
  apiKey:     process.env.APPWRITE_API_KEY,
  databaseId: process.env.APPWRITE_DATABASE_ID,
  activitiesCollection: process.env.ACTIVITIES_COLLECTION_ID || 'activities',
};

const DATA_FILE = './HillcrestActivities.json';
const SHELL_ID = '6a964e8e04e1b63f6116'; // HillcrestActivities (from JSON _shellId)
const APPLY = process.argv.includes('--apply');

/* ---- replicate seed-activities.mjs id/expansion logic EXACTLY ---- */

function addLocalDays(local, days) {
  const [datePart, timePart] = local.split('T');
  const [y, m, d] = datePart.split('-').map(Number);
  const s = new Date(Date.UTC(y, m - 1, d + days));
  return `${s.getUTCFullYear()}-${String(s.getUTCMonth()+1).padStart(2,'0')}-${String(s.getUTCDate()).padStart(2,'0')}T${timePart}`;
}
function nthWeekdayOfMonth(local, n, dayOfWeek) {
  const [datePart, timePart] = local.split('T');
  const [y, m] = datePart.split('-').map(Number);
  const jsDow = dayOfWeek === 7 ? 0 : dayOfWeek;
  if (n < 0) {
    const lastDay = new Date(Date.UTC(y, m, 0)).getUTCDate();
    const lastDow = new Date(Date.UTC(y, m - 1, lastDay)).getUTCDay();
    const offset = (lastDow - jsDow + 7) % 7;
    const day = lastDay - offset + (n + 1) * 7;
    const result = new Date(Date.UTC(y, m - 1, day));
    if (result.getUTCMonth() !== m - 1) return null;
    return `${y}-${String(m).padStart(2,'0')}-${String(result.getUTCDate()).padStart(2,'0')}T${timePart}`;
  }
  const first = new Date(Date.UTC(y, m - 1, 1));
  const offset = (jsDow - first.getUTCDay() + 7) % 7;
  const day = 1 + offset + (n - 1) * 7;
  const result = new Date(Date.UTC(y, m - 1, day));
  if (result.getUTCMonth() !== m - 1) return null;
  return `${y}-${String(m).padStart(2,'0')}-${String(result.getUTCDate()).padStart(2,'0')}T${timePart}`;
}
function deriveNthWeekday(local) {
  const [y, m, d] = local.split('T')[0].split('-').map(Number);
  const jsDow = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  const dayOfWeek = jsDow === 0 ? 7 : jsDow;
  const n = Math.floor((d - 1) / 7) + 1;
  return { n, dayOfWeek };
}
function expand(item) {
  const r = item.recurrence;
  if (!r) return [{ start: item.start }];
  if (r.frequency === 'weekly') return [{ start: item.start }];
  if (r.frequency === 'monthly' || r.frequency === 'annually') {
    const patterns = r.nthWeekdays || (r.nthWeekday ? [r.nthWeekday] : [deriveNthWeekday(item.start)]);
    let anchor = null;
    for (const p of patterns) {
      const snapped = nthWeekdayOfMonth(item.start, p.n, p.dayOfWeek);
      if (!snapped) continue;
      if (anchor === null || snapped < anchor) anchor = snapped;
    }
    return anchor === null ? [] : [{ start: anchor }];
  }
  const interval = r.frequency === 'biweekly' ? 14 : r.frequency === 'daily' ? 1 : 7;
  const count = r.count || 1;
  const out = [];
  for (let i = 0; i < count; i++) out.push({ start: addLocalDays(item.start, interval * i) });
  return out;
}
function stableId(kind, item, startLocal) {
  const hash = createHash('sha256')
    .update(`${SHELL_ID}|${kind}|${item.slug || item.title}|${startLocal}`)
    .digest('hex').slice(0, 28);
  return `s${kind[0]}${hash}`;
}

/* ---- build valid id set ---- */
const raw = JSON.parse(readFileSync(DATA_FILE, 'utf8'));
const items = raw.items;
const validIds = new Map(); // id -> "title @ start"
for (const item of items) {
  if (item.lat === null || item.lng === null) continue; // seeder skips these
  const kind = (item.kind || 'activity').toLowerCase();
  for (const occ of expand(item)) {
    validIds.set(stableId(kind, item, occ.start), `${item.title} @ ${occ.start}`);
  }
}
console.log(`Valid docs from cleaned JSON: ${validIds.size}`);

/* ---- list shell docs & compute stale ---- */
const client = new Client().setEndpoint(CFG.endpoint).setProject(CFG.projectId).setKey(CFG.apiKey);
const db = new Databases(client);

const all = [];
let cursor = null;
for (;;) {
  const queries = [Query.equal('shellID', SHELL_ID), Query.limit(100)];
  if (cursor) queries.push(Query.cursorAfter(cursor));
  const res = await db.listDocuments(CFG.databaseId, CFG.activitiesCollection, queries);
  all.push(...res.documents);
  if (res.documents.length < 100) break;
  cursor = res.documents[res.documents.length - 1].$id;
}
console.log(`Documents currently in shell ${SHELL_ID}: ${all.length}`);

const stale = all.filter(d => !validIds.has(d.$id));
console.log(`\nStale documents (in Appwrite, not in cleaned JSON): ${stale.length}`);
for (const d of stale) {
  console.log(`  ${d.$id}  ${(d.date || '').slice(0,10)}  ${d.name}`);
}

if (!APPLY) {
  console.log(`\nDRY RUN. Re-run with --apply to delete the ${stale.length} stale documents.`);
  process.exit(0);
}

let del = 0, fail = 0;
for (const d of stale) {
  try {
    await db.deleteDocument(CFG.databaseId, CFG.activitiesCollection, d.$id);
    del++;
    console.log(`DELETED ${d.$id}  ${d.name}`);
  } catch (e) {
    fail++;
    console.error(`FAIL    ${d.$id}  ${d.name}  -> ${e.message}`);
  }
}
console.log(`\nDeleted ${del}, failed ${fail}. Shell now has ${all.length - del} documents.`);
