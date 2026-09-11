#!/usr/bin/env node
/**
 * ShellTerra - delete activity docs in a shell whose `name` exactly matches one
 * of the given names. For pruning stale seeded docs the seeder left behind
 * (the seeder upserts, it never deletes, so items removed from a JSON stay live).
 *
 * Requires explicit --shell-id and one or more --name "..." args.
 * Dry-run by default; pass --apply to actually delete.
 *
 * USAGE (prune the 17 synthetic Gaslamp placeholders):
 *   node --env-file=.env prune-stale-activities.mjs --shell-id 6a966244cb2082796b17 \
 *     --name "Eagles Watch Party at TORO" --name "Prohibition — Cocktail Class"
 *   ...add --apply once the dry-run list looks right.
 */
import { Client, Databases, Query } from 'node-appwrite';
import process from 'node:process';

const args = process.argv.slice(2);
const APPLY = args.includes('--apply');
const shellId = (() => { const i = args.indexOf('--shell-id'); return i > -1 ? args[i + 1] : null; })();
const names = args.reduce((acc, a, i) => { if (a === '--name' && args[i + 1]) acc.push(args[i + 1]); return acc; }, []);

if (!shellId || !names.length) {
  console.error('Usage: --shell-id <id> --name "<exact name>" [--name ...] [--apply]');
  process.exit(1);
}

const client = new Client()
  .setEndpoint(process.env.APPWRITE_ENDPOINT)
  .setProject(process.env.APPWRITE_PROJECT_ID)
  .setKey(process.env.APPWRITE_API_KEY);
const db = new Databases(client);
const dbId = process.env.APPWRITE_DATABASE_ID;
const col = process.env.ACTIVITIES_COLLECTION_ID || 'activities';

const all = [];
let cursor = null;
while (true) {
  const q = [Query.equal('shellID', shellId), Query.limit(100)];
  if (cursor) q.push(Query.cursorAfter(cursor));
  const r = await db.listDocuments(dbId, col, q);
  all.push(...r.documents);
  if (r.documents.length < 100) break;
  cursor = r.documents.at(-1).$id;
}

const nameSet = new Set(names);
const match = all.filter((d) => nameSet.has(d.name));
console.log(`Shell ${shellId}: ${all.length} docs, ${match.length} match the given name(s).`);
match.forEach((d) => console.log(`  ${d.$id}  ${d.name}  ${d.date}`));

if (!APPLY) {
  console.log('\nDRY RUN. Re-run with --apply to delete the above.');
  process.exit(0);
}

let del = 0;
for (const d of match) { await db.deleteDocument(dbId, col, d.$id); del++; }
console.log(`\nDeleted ${del} document(s).`);
