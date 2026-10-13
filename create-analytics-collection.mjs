#!/usr/bin/env node
/**
 * create-analytics-collection.mjs — create the `analytics_events` collection that
 * ShellTerra writes one row to per user action (Analytics.track), and the
 * ShellTerra Analytics dashboard reads for per-user counts.
 *
 * Permissions: logged-in users can CREATE (log their own events); only the admin
 * account can READ (the dashboard also reads via API key, which bypasses perms).
 * documentSecurity=false so these collection-level rules govern every row.
 *
 * Idempotent: skips the collection/attributes/indexes that already exist.
 *
 * USAGE: node --env-file=.env create-analytics-collection.mjs
 */
import { Client, Databases, Permission, Role } from 'node-appwrite';
import process from 'node:process';

const COLLECTION = 'analytics_events';
const ADMIN_USER = process.env.ANALYTICS_ADMIN_USER || '6a7e07d24e8191708471';

const SCHEMA = [
  { key: 'user_id',     type: 'string', size: 64,  required: true  },
  { key: 'action',      type: 'string', size: 64,  required: true  }, // e.g. press_directions
  { key: 'target_type', type: 'string', size: 32,  required: false }, // activity|vendor|shell|timemark
  { key: 'target_id',   type: 'string', size: 64,  required: false },
  { key: 'shell_id',    type: 'string', size: 64,  required: false },
  { key: 'platform',    type: 'string', size: 16,  required: false }, // ios|android|web
  { key: 'app_version', type: 'string', size: 32,  required: false },
  { key: 'session_id',  type: 'string', size: 128, required: false },
];
// Indexes so the dashboard can filter/aggregate fast.
const INDEXES = [
  { key: 'idx_user',        attrs: ['user_id'] },
  { key: 'idx_action',      attrs: ['action'] },
  { key: 'idx_shell',       attrs: ['shell_id'] },
  { key: 'idx_user_action', attrs: ['user_id', 'action'] },
];

const client = new Client()
  .setEndpoint(process.env.APPWRITE_ENDPOINT)
  .setProject(process.env.APPWRITE_PROJECT_ID)
  .setKey(process.env.APPWRITE_API_KEY);
const db = new Databases(client);
const DB = process.env.APPWRITE_DATABASE_ID;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function ensureCollection() {
  try { await db.getCollection(DB, COLLECTION); return 'exists'; }
  catch (e) {
    if (e.code !== 404) throw e;
    await db.createCollection(DB, COLLECTION, 'analytics_events', [
      Permission.create(Role.users()),
      Permission.read(Role.user(ADMIN_USER)),
    ], /* documentSecurity */ false, /* enabled */ true);
    return 'created';
  }
}

async function waitAttrs(keys, tries = 40) {
  for (let i = 0; i < tries; i++) {
    const res = await db.listAttributes(DB, COLLECTION);
    const byKey = new Map(res.attributes.map((a) => [a.key, a.status]));
    if (keys.every((k) => byKey.get(k) === 'available')) return;
    await sleep(1000);
  }
  throw new Error('timed out waiting for attributes');
}

async function run() {
  console.log(`collection '${COLLECTION}':`, await ensureCollection());
  const existing = new Set((await db.listAttributes(DB, COLLECTION)).attributes.map((a) => a.key));
  for (const s of SCHEMA.filter((s) => !existing.has(s.key))) {
    await db.createStringAttribute(DB, COLLECTION, s.key, s.size, s.required);
    console.log('  + attr', s.key);
  }
  await waitAttrs(SCHEMA.map((s) => s.key));
  const haveIdx = new Set((await db.listIndexes(DB, COLLECTION)).indexes.map((i) => i.key));
  for (const ix of INDEXES.filter((i) => !haveIdx.has(i.key))) {
    await db.createIndex(DB, COLLECTION, ix.key, 'key', ix.attrs);
    console.log('  + index', ix.key);
  }
  console.log('\nanalytics_events ready. Collection id:', COLLECTION);
  console.log('  create=role:users (logged-in users log events), read=admin only.');
}
run().catch((e) => { console.error('FAILED:', e.message); process.exit(1); });
