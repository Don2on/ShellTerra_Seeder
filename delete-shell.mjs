#!/usr/bin/env node
/**
 * ShellTerra - delete a single shell document by ID.
 *
 * Deliberately requires an explicit --shell-id (never falls back to SHELL_ID
 * from .env) so a stray run can't delete the shell you're actively seeding.
 * Prints the shell's name/seeded state first so you can confirm it's the
 * empty duplicate and not the survivor.
 *
 * USAGE
 *   node --env-file=.env delete-shell.mjs --shell-id <id>
 *   node --env-file=.env delete-shell.mjs --shell-id <id> --dry-run
 */
import { Client, Databases } from 'node-appwrite';
import process from 'node:process';

const args = process.argv.slice(2);
const valOf = (f) => { const i = args.indexOf(f); return i > -1 ? args[i + 1] : null; };
const DRY = args.includes('--dry-run');

const shellId = valOf('--shell-id');
if (!shellId) {
  console.error('Refusing to run without an explicit --shell-id <id>.');
  process.exit(1);
}

const client = new Client()
  .setEndpoint(process.env.APPWRITE_ENDPOINT)
  .setProject(process.env.APPWRITE_PROJECT_ID)
  .setKey(process.env.APPWRITE_API_KEY);
const db = new Databases(client);
const dbId = process.env.APPWRITE_DATABASE_ID;
const colId = process.env.SHELLS_COLLECTION_ID;

try {
  const d = await db.getDocument(dbId, colId, shellId);
  console.log(`Target: ${shellId}`);
  console.log(`  name=${d.name}  seeded=${d.is_seeded}  public_override=${d.public_override}  members=${d.members_count}`);
  if (DRY) { console.log('DRY: would delete the above shell. Nothing sent.'); process.exit(0); }
  await db.deleteDocument(dbId, colId, shellId);
  console.log(`Deleted shell ${shellId}.`);
} catch (err) {
  console.error(`Failed: ${err.message}`);
  process.exit(1);
}
