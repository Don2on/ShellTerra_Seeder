#!/usr/bin/env node
/**
 * replace-shell-content.mjs — delete ALL activities and/or vendors for ONE shell.
 *
 * Used for a full re-seed (superseded data): wipes the shell's existing docs so a
 * fresh seed doesn't leave orphans/duplicates. Targets the shell by an EXPLICIT
 * --shell-id ONLY — it never reads SHELL_ID from env, because the ambient env is
 * usually set for a different shell and a mistargeted delete is unrecoverable.
 *
 * USAGE
 *   node --env-file=.env replace-shell-content.mjs --shell-id <id> --activities --vendors --dry-run
 *   node --env-file=.env replace-shell-content.mjs --shell-id <id> --activities --vendors
 */
import { Client, Databases, Query } from 'node-appwrite';
import process from 'node:process';

const args = process.argv.slice(2);
const valOf = (f) => { const i = args.indexOf(f); return i > -1 ? args[i + 1] : null; };
const DRY = args.includes('--dry-run');
const DO_ACTIVITIES = args.includes('--activities');
const DO_VENDORS = args.includes('--vendors');

const shellId = valOf('--shell-id');
if (!shellId) { console.error('Refusing to run: pass --shell-id <id> explicitly (no env fallback).'); process.exit(1); }
if (!DO_ACTIVITIES && !DO_VENDORS) { console.error('Nothing to do: pass --activities and/or --vendors.'); process.exit(1); }

const client = new Client()
  .setEndpoint(process.env.APPWRITE_ENDPOINT)
  .setProject(process.env.APPWRITE_PROJECT_ID)
  .setKey(process.env.APPWRITE_API_KEY);
const db = new Databases(client);
const dbId = process.env.APPWRITE_DATABASE_ID;

const activitiesCol = process.env.ACTIVITIES_COLLECTION_ID || 'activities';
const vendorsCol = process.env.VENDORS_COLLECTION_ID || 'vendors';
// activities reference the shell via `shellID`; vendors also use `shellID`.
const SHELL_FIELD = 'shellID';

async function purge(col, label) {
  let matched = 0, deleted = 0;
  for (;;) {
    const res = await db.listDocuments(dbId, col, [Query.equal(SHELL_FIELD, shellId), Query.limit(100)]);
    if (res.documents.length === 0) break;
    matched += res.documents.length;
    if (DRY) { // don't loop forever in dry-run — one page is enough to show the count sample
      console.log(`DRY ${label}: page of ${res.documents.length} (total in collection for this shell = ${res.total})`);
      return res.total;
    }
    for (const d of res.documents) { await db.deleteDocument(dbId, col, d.$id); deleted++; }
    process.stdout.write(`\r  ${label}: deleted ${deleted}...`);
  }
  if (!DRY) console.log(`\r  ${label}: deleted ${deleted}          `);
  return deleted;
}

console.log(`Target shell: ${shellId}${DRY ? '  (DRY RUN — nothing deleted)' : ''}\n`);
if (DO_ACTIVITIES) await purge(activitiesCol, 'activities');
if (DO_VENDORS) await purge(vendorsCol, 'vendors');
console.log('\nDone.');
