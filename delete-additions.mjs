#!/usr/bin/env node
/**
 * delete-additions.mjs — remove THIS round's food additions from the 8 shells so
 * corrected data can be re-seeded cleanly (corrected schedules change activity doc
 * IDs, which would otherwise leave stale recurring events behind).
 *
 * Identifies this round's docs by the unique description marker written by
 * prepare-food-additions.mjs: "community research, Oct 2026". Deletes matching
 * docs from BOTH the activities and vendors collections across all 8 food shells.
 *
 * Dry-run by default; pass --commit to actually delete.
 *   node --env-file=.env delete-additions.mjs            # dry-run (counts only)
 *   node --env-file=.env delete-additions.mjs --commit   # delete
 */
import { Client, Databases, Query } from 'node-appwrite';
import process from 'node:process';

const COMMIT = process.argv.includes('--commit');
const MARKER = 'community research, Oct 2026';
const SHELLS = [
  '6a84dbe4ec8215c0345e', '6aac35296621e11030a0', '6aac35a4c154a0ac014f', '6ab8a3910019b374bbb7',
  '6aba043c003c0898597a', '6aba043f0010e3a2ac9c', '6aba044800361d504695', '6abaa385b4b328f7ae43',
];
const db = new Databases(new Client()
  .setEndpoint(process.env.APPWRITE_ENDPOINT).setProject(process.env.APPWRITE_PROJECT_ID).setKey(process.env.APPWRITE_API_KEY));
const DB = process.env.APPWRITE_DATABASE_ID;
const COLS = [process.env.ACTIVITIES_COLLECTION_ID, process.env.VENDORS_COLLECTION_ID || 'vendors'];

let totalMatch = 0, totalDel = 0;
for (const col of COLS) {
  for (const shell of SHELLS) {
    // Phase 1: collect matching IDs (read-only; cursor paginates safely).
    const ids = [];
    let cursor = null;
    for (;;) {
      const q = [Query.equal('shellID', shell), Query.limit(100)];
      if (cursor) q.push(Query.cursorAfter(cursor));
      const res = await db.listDocuments(DB, col, q);
      if (!res.documents.length) break;
      for (const d of res.documents) {
        if (typeof d.description === 'string' && d.description.includes(MARKER)) ids.push(d.$id);
      }
      if (res.documents.length < 100) break;
      cursor = res.documents.at(-1).$id;
    }
    // Phase 2: delete by id (no pagination over a shrinking set).
    let del = 0;
    if (COMMIT) for (const id of ids) { await db.deleteDocument(DB, col, id); del++; }
    if (ids.length) console.log(`  ${col} / ${shell}: ${ids.length} match${COMMIT ? `, ${del} deleted` : ''}`);
    totalMatch += ids.length; totalDel += del;
  }
}
console.log(COMMIT ? `\nDELETED ${totalDel} docs (${totalMatch} matched).` : `\nDRY RUN: ${totalMatch} docs match "${MARKER}". Re-run with --commit to delete.`);
