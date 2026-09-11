#!/usr/bin/env node
/**
 * ShellTerra - flip a seeded shell to publicly visible.
 *
 * A shell is only visible in the public feed when is_private=false AND
 * public_override=true. Seeded curated shells also carry is_seeded=true and
 * show_in_search=true, with hide_members=true (see the OceanBeachActivities
 * reference shell). This sets all five to match that pattern.
 *
 * USAGE
 *   node --env-file=.env make-shell-public.mjs                 # uses SHELL_ID from .env
 *   node --env-file=.env make-shell-public.mjs --shell-id <id>
 *   node --env-file=.env make-shell-public.mjs --dry-run
 */
import { Client, Databases } from 'node-appwrite';
import process from 'node:process';

const args = process.argv.slice(2);
const valOf = (f) => { const i = args.indexOf(f); return i > -1 ? args[i + 1] : null; };
const DRY = args.includes('--dry-run');

const shellId = valOf('--shell-id') || process.env.SHELL_ID;
if (!shellId) {
  console.error('No shell ID. Set SHELL_ID in .env or pass --shell-id <id>');
  process.exit(1);
}

const PATCH = {
  is_private: false,
  public_override: true,
  is_seeded: true,
  show_in_search: true,
  hide_members: true,
};

const client = new Client()
  .setEndpoint(process.env.APPWRITE_ENDPOINT)
  .setProject(process.env.APPWRITE_PROJECT_ID)
  .setKey(process.env.APPWRITE_API_KEY);
const db = new Databases(client);
const dbId = process.env.APPWRITE_DATABASE_ID;
const colId = process.env.SHELLS_COLLECTION_ID;

if (DRY) {
  console.log(`DRY: would patch shell ${shellId} with`, JSON.stringify(PATCH));
  process.exit(0);
}

try {
  await db.updateDocument(dbId, colId, shellId, PATCH);
  console.log(`Shell ${shellId} is now public.`);
  console.log(`  ${JSON.stringify(PATCH)}`);
} catch (err) {
  console.error(`Update failed: ${err.message}`);
  process.exit(1);
}
