#!/usr/bin/env node
/**
 * Dry-run diff: for each shell, compute the doc IDs the seeder WOULD write and
 * compare against what's already live, so we can report new / updated / stale.
 * Read-only. Writes nothing.
 */
import { execFileSync } from 'node:child_process';
import { Client, Databases, Query } from 'node-appwrite';
import process from 'node:process';

const SHELLS = [
  { name: 'HillcrestActivities',    id: '6a964e8e04e1b63f6116', file: 'HillcrestActivities.json' },
  { name: 'GaslampActivities',      id: '6a966244cb2082796b17', file: 'GaslampActivities.json' },
  { name: 'PacificBeachActivities', id: '6a97507831d24cd42195', file: 'PacificBeachActivities.json' },
];

const client = new Client()
  .setEndpoint(process.env.APPWRITE_ENDPOINT)
  .setProject(process.env.APPWRITE_PROJECT_ID)
  .setKey(process.env.APPWRITE_API_KEY);
const db = new Databases(client);

async function liveIds(shellId) {
  const ids = new Set();
  let cursor = null;
  while (true) {
    const q = [Query.equal('shellID', shellId), Query.limit(100), Query.select(['$id'])];
    if (cursor) q.push(Query.cursorAfter(cursor));
    const res = await db.listDocuments(process.env.APPWRITE_DATABASE_ID, 'activities', q);
    res.documents.forEach((d) => ids.add(d.$id));
    if (res.documents.length < 100) break;
    cursor = res.documents.at(-1).$id;
  }
  return ids;
}

function builtIds(shell) {
  const out = execFileSync(
    process.execPath,
    ['--env-file=.env', 'seed-activities.mjs', '--dry-run', '--file', shell.file],
    { env: { ...process.env, SHELL_ID: shell.id }, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 },
  );
  const start = out.indexOf('[');
  const end = out.lastIndexOf(']');
  const built = JSON.parse(out.slice(start, end + 1));
  return built.map((b) => b.docId);
}

console.log('');
for (const shell of SHELLS) {
  const would = builtIds(shell);
  const live = await liveIds(shell.id);
  const wouldSet = new Set(would);

  const added = would.filter((id) => !live.has(id)).length;
  const updated = would.filter((id) => live.has(id)).length;
  const stale = [...live].filter((id) => !wouldSet.has(id)).length;

  console.log(`${shell.name}`);
  console.log(`  live now:     ${live.size}`);
  console.log(`  will write:   ${would.length}   (NEW ${added}  •  UPDATE ${updated})`);
  console.log(`  left stale:   ${stale}   (live docs not in new data — untouched)`);
  console.log('');
}
