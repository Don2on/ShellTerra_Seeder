#!/usr/bin/env node
/**
 * dedup-activities.mjs
 *
 * Finds duplicate activities — same (name + date) appearing in more than one
 * shell — and deletes the extras, keeping exactly one copy.
 *
 * USAGE
 *   node --env-file=.env dedup-activities.mjs --dry-run
 *   node --env-file=.env dedup-activities.mjs --prefer <shellId>
 *   node --env-file=.env dedup-activities.mjs
 *
 * FLAGS
 *   --dry-run          Report duplicates without deleting anything.
 *   --prefer <shellId> When a duplicate exists, keep the copy in this shell
 *                      and delete the others. Applied before --keep ordering.
 *   --keep newest      Keep the most recently created copy (default: oldest).
 *
 * DEDUP KEY
 *   name + date + startTime. All three fields must match for two docs to be
 *   considered duplicates. Including startTime prevents different time blocks
 *   at the same venue on the same day (e.g. morning and afternoon food
 *   distribution sessions) from being incorrectly collapsed.
 */

import { Client, Databases, Query } from 'node-appwrite';
import process from 'node:process';

const CFG = {
  endpoint:   process.env.APPWRITE_ENDPOINT,
  projectId:  process.env.APPWRITE_PROJECT_ID,
  apiKey:     process.env.APPWRITE_API_KEY,
  databaseId: process.env.APPWRITE_DATABASE_ID,
  collection: process.env.ACTIVITIES_COLLECTION_ID || 'activities',
};

const args      = process.argv.slice(2);
const DRY       = args.includes('--dry-run');
const pi        = args.indexOf('--prefer');
const PREFER    = pi > -1 ? args[pi + 1] : null;
const ki        = args.indexOf('--keep');
const KEEP_MODE = ki > -1 ? args[ki + 1] : 'oldest'; // 'oldest' | 'newest'

/* ------------------------------------------------------------------ */
/* Fetch every activity doc (paginated)                                */
/* ------------------------------------------------------------------ */

async function fetchAll(db) {
  const all = [];
  let cursor = null;

  while (true) {
    const q = [Query.limit(100), Query.orderAsc('$createdAt')];
    if (cursor) q.push(Query.cursorAfter(cursor));

    const page = await db.listDocuments(CFG.databaseId, CFG.collection, q);
    all.push(...page.documents);

    if (page.documents.length < 100) break;
    cursor = page.documents.at(-1).$id;
  }

  return all;
}

/* ------------------------------------------------------------------ */
/* Main                                                                */
/* ------------------------------------------------------------------ */

async function run() {
  const missing = ['endpoint', 'projectId', 'apiKey', 'databaseId'].filter(k => !CFG[k]);
  if (missing.length) {
    console.error('Missing env:', missing.join(', '));
    process.exit(1);
  }

  const client = new Client()
    .setEndpoint(CFG.endpoint)
    .setProject(CFG.projectId)
    .setKey(CFG.apiKey);
  const db = new Databases(client);

  console.log('Fetching all activities…');
  const docs = await fetchAll(db);
  console.log(`Fetched ${docs.length} total.\n`);

  // Group by dedup key: name + date + startTime
  const groups = new Map();
  for (const doc of docs) {
    const key = `${doc.name}||${doc.date}||${doc.startTime || ''}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(doc);
  }

  const dupes = [...groups.values()].filter(g => g.length > 1);

  if (dupes.length === 0) {
    console.log('No duplicates found.');
    return;
  }

  console.log(`Found ${dupes.length} duplicate group(s):\n`);

  let deleted = 0;
  let wouldDelete = 0;

  for (const group of dupes) {
    // Sort: preferred shell first, then by $createdAt per --keep mode
    group.sort((a, b) => {
      if (PREFER) {
        if (a.shellID === PREFER && b.shellID !== PREFER) return -1;
        if (b.shellID === PREFER && a.shellID !== PREFER) return  1;
      }
      const cmp = a.$createdAt < b.$createdAt ? -1 : 1;
      return KEEP_MODE === 'newest' ? -cmp : cmp;
    });

    const keep   = group[0];
    const remove = group.slice(1);

    console.log(`  KEEP   [${keep.shellID}]  ${keep.name}  (${keep.date?.slice(0, 10)})`);
    for (const doc of remove) {
      console.log(`  DELETE [${doc.shellID}]  ${doc.name}  (${doc.date?.slice(0, 10)})`);
      wouldDelete++;

      if (!DRY) {
        try {
          await db.deleteDocument(CFG.databaseId, CFG.collection, doc.$id);
          deleted++;
        } catch (err) {
          console.error(`  FAIL delete ${doc.$id}: ${err.message}`);
        }
      }
    }
    console.log();
  }

  if (DRY) {
    console.log(`Dry run. Would delete ${wouldDelete} document(s). Nothing changed.\n`);
    console.log('Re-run without --dry-run to apply, or add --prefer <shellId> to control which copy survives.\n');
  } else {
    console.log(`Deleted ${deleted} duplicate(s).`);
  }
}

run().catch(e => { console.error(e.message); process.exit(1); });
