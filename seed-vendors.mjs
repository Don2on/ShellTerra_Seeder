#!/usr/bin/env node
/**
 * seed-vendors.mjs — ShellTerra vendor-directory seeder (NEW `vendors` collection).
 *
 * Unlike seed-activities.mjs (events grouped by hostName), this seeds a
 * standalone directory of businesses for a curated shell's "Vendors" tab.
 * Each row renders as a lengthened ShellCard in the app. First user:
 * BlackCommerceSD (Black-owned San Diego businesses).
 *
 * SELF-BOOTSTRAPPING SCHEMA
 *   On run, ensures the `vendors` collection and every attribute exist (creates
 *   what's missing, waits for Appwrite to mark them `available`, then seeds).
 *   Needs an API key with database collections/attributes write scope.
 *   Idempotent: re-runs skip existing collection/attributes (409) and upsert docs.
 *
 * DOCS
 *   Deterministic id = 'v' + sha256(shellId|slug) → re-run updates, never dupes.
 *   Permission.read(Role.any()) hardcoded (document-level security), same as
 *   activities. `events` is stored as a JSON string (Appwrite has no object attr).
 *
 * USAGE
 *   node --env-file=.env seed-vendors.mjs --file ./BlackCommerceSD.json --dry-run
 *   node --env-file=.env seed-vendors.mjs --file ./BlackCommerceSD.json
 *   node --env-file=.env seed-vendors.mjs --file ./BlackCommerceSD.json --create-only
 *   node --env-file=.env seed-vendors.mjs --inspect <docId>
 *
 * Shell override still required afterward (member-ceiling), same as activities.
 */

import { Client, Databases, Permission, Role } from 'node-appwrite';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import process from 'node:process';

/* ------------------------------------------------------------------ */
/* CONFIG                                                              */
/* ------------------------------------------------------------------ */

const CFG = {
  endpoint:   process.env.APPWRITE_ENDPOINT,
  projectId:  process.env.APPWRITE_PROJECT_ID,
  apiKey:     process.env.APPWRITE_API_KEY,
  databaseId: process.env.APPWRITE_DATABASE_ID,
  collection: process.env.VENDORS_COLLECTION_ID || 'vendors',
  shellId:    process.env.SHELL_ID,
};

const SEED_PERMISSIONS = [Permission.read(Role.any())];

/**
 * Attribute schema for the vendors collection, mirroring BlackCommerceSD.json.
 * type: 'string' | 'float' | 'boolean'. `size` applies to strings only.
 * Required attrs get no default (Appwrite forbids it); optional ones default null.
 */
const SCHEMA = [
  { key: 'slug',         type: 'string',  size: 255,    required: true  },
  { key: 'name',         type: 'string',  size: 255,    required: true  },
  { key: 'shellID',      type: 'string',  size: 255,    required: true  },
  { key: 'category',     type: 'string',  size: 100,    required: false },
  { key: 'tagline',      type: 'string',  size: 255,    required: false },
  { key: 'description',  type: 'string',  size: 5000,   required: false },
  { key: 'logoUrl',      type: 'string',  size: 2000,   required: false },
  { key: 'website',      type: 'string',  size: 2000,   required: false },
  { key: 'phone',        type: 'string',  size: 50,     required: false },
  { key: 'email',        type: 'string',  size: 255,    required: false },
  { key: 'instagram',    type: 'string',  size: 255,    required: false },
  { key: 'facebook',     type: 'string',  size: 255,    required: false },
  { key: 'tiktok',       type: 'string',  size: 255,    required: false },
  { key: 'address',      type: 'string',  size: 500,    required: false },
  { key: 'neighborhood', type: 'string',  size: 255,    required: false },
  { key: 'hours',        type: 'string',  size: 500,    required: false },
  { key: 'latitude',     type: 'float',   required: false },
  { key: 'longitude',    type: 'float',   required: false },
  { key: 'featured',     type: 'boolean', required: false },
  { key: 'verified',     type: 'boolean', required: false },
  // events[] serialized — {title,date,time,description}. Rendered only in the
  // app's vendor-event pull-up sheet, never inline on the card.
  { key: 'events',       type: 'string',  size: 65535,  required: false },
];

/* ------------------------------------------------------------------ */
/* DOC BUILD + ID                                                      */
/* ------------------------------------------------------------------ */

function buildVendorDoc(item) {
  return {
    slug:         item.slug,
    name:         item.name,
    shellID:      CFG.shellId,
    category:     item.category || '',
    tagline:      item.tagline || '',
    description:  item.description || '',
    logoUrl:      item.logoUrl || '',
    website:      item.website || '',
    phone:        item.phone || '',
    email:        item.email || '',
    instagram:    item.instagram || '',
    facebook:     item.facebook || '',
    tiktok:       item.tiktok || '',
    address:      item.address || '',
    neighborhood: item.neighborhood || '',
    hours:        item.hours || '',
    latitude:     item.lat ?? null,
    longitude:    item.lng ?? null,
    featured:     item.featured ?? false,
    verified:     item.verified ?? false,
    events:       JSON.stringify(item.events || []),
  };
}

/**
 * Deterministic ID: 'v' + 29 hex (30 chars total, starts with a letter).
 * Appwrite IDs: <=36 chars, [a-zA-Z0-9_], no leading _.
 */
function stableId(slug) {
  const hash = createHash('sha256').update(`${CFG.shellId}|${slug}`).digest('hex').slice(0, 29);
  const id = `v${hash}`;
  if (!/^[a-zA-Z0-9][a-zA-Z0-9_]{0,35}$/.test(id)) {
    throw new Error(`Generated invalid Appwrite ID: ${id}`);
  }
  return id;
}

/* ------------------------------------------------------------------ */
/* CLIENT + FLAGS                                                      */
/* ------------------------------------------------------------------ */

const args  = process.argv.slice(2);
const valOf = (f) => { const i = args.indexOf(f); return i > -1 ? args[i + 1] : null; };
const DRY   = args.includes('--dry-run');
const CREATE_ONLY = args.includes('--create-only');
const DATA_FILE   = valOf('--file') || './BlackCommerceSD.json';

const client = new Client();
if (CFG.endpoint && CFG.projectId && CFG.apiKey) {
  client.setEndpoint(CFG.endpoint).setProject(CFG.projectId).setKey(CFG.apiKey);
}
const db = new Databases(client);

function requireConfig(keys) {
  const missing = keys.filter((k) => !CFG[k]);
  if (missing.length) {
    console.error('Missing env vars for:', missing.join(', '));
    if (missing.includes('endpoint')) console.error('Reminder: self-hosted instance, not cloud.appwrite.io');
    process.exit(1);
  }
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/* ------------------------------------------------------------------ */
/* SCHEMA BOOTSTRAP                                                    */
/* ------------------------------------------------------------------ */

async function ensureCollection() {
  try {
    await db.getCollection(CFG.databaseId, CFG.collection);
    return 'exists';
  } catch (err) {
    if (err.code !== 404) throw err;
    // documentSecurity:true so per-doc read(any) governs visibility, same model
    // as activities. Collection-level read(any) as a belt-and-suspenders default.
    await db.createCollection(
      CFG.databaseId, CFG.collection, 'vendors',
      [Permission.read(Role.any())], /* documentSecurity */ true, /* enabled */ true,
    );
    return 'created';
  }
}

async function createAttribute(spec) {
  if (spec.type === 'string') {
    await db.createStringAttribute(CFG.databaseId, CFG.collection, spec.key, spec.size, spec.required);
  } else if (spec.type === 'float') {
    await db.createFloatAttribute(CFG.databaseId, CFG.collection, spec.key, spec.required);
  } else if (spec.type === 'boolean') {
    await db.createBooleanAttribute(CFG.databaseId, CFG.collection, spec.key, spec.required);
  }
}

// Appwrite processes attributes asynchronously; documents can't be written
// against an attribute until its status is 'available'. Poll until all are.
async function waitForAttributes(keys, { tries = 30, delay = 1000 } = {}) {
  for (let i = 0; i < tries; i++) {
    const res = await db.listAttributes(CFG.databaseId, CFG.collection);
    const byKey = new Map(res.attributes.map((a) => [a.key, a.status]));
    const pending = keys.filter((k) => byKey.get(k) !== 'available');
    if (pending.length === 0) return;
    if (i === 0) console.log(`  waiting for attributes to become available: ${pending.join(', ')}`);
    await sleep(delay);
  }
  throw new Error('Timed out waiting for attributes to become available.');
}

async function bootstrapSchema() {
  const col = await ensureCollection();
  console.log(`collection '${CFG.collection}': ${col}`);

  // List first, create only what's missing. Re-issuing a create for an existing
  // attribute would trip Appwrite's row-size guard (which validates before the
  // duplicate check) once the collection is near the MariaDB row limit, so a
  // blind create-and-catch-409 is NOT safe here.
  const existing = new Set(
    (await db.listAttributes(CFG.databaseId, CFG.collection)).attributes.map((a) => a.key),
  );
  const missing = SCHEMA.filter((s) => !existing.has(s.key));
  for (const spec of missing) {
    await createAttribute(spec);
    console.log(`  + attr ${spec.key} (${spec.type})`);
  }
  await waitForAttributes(SCHEMA.map((s) => s.key));
  console.log(`schema ready — ${missing.length} attribute(s) created, ${SCHEMA.length - missing.length} already present\n`);
}

/* ------------------------------------------------------------------ */
/* UPSERT                                                              */
/* ------------------------------------------------------------------ */

async function upsert(docId, data) {
  try {
    await db.createDocument(CFG.databaseId, CFG.collection, docId, data, SEED_PERMISSIONS);
    return 'created';
  } catch (err) {
    if (err.code === 409) {
      if (CREATE_ONLY) return 'skipped';
      await db.updateDocument(CFG.databaseId, CFG.collection, docId, data, SEED_PERMISSIONS);
      return 'updated';
    }
    throw err;
  }
}

async function inspect(docId) {
  requireConfig(['endpoint', 'projectId', 'apiKey', 'databaseId']);
  const doc = await db.getDocument(CFG.databaseId, CFG.collection, docId);
  console.log(`\nCOLLECTION: ${CFG.collection}\n\nATTRIBUTES`);
  for (const [k, v] of Object.entries(doc)) {
    if (k.startsWith('$')) continue;
    const type = Array.isArray(v) ? 'array' : v === null ? 'null' : typeof v;
    console.log(`  ${k.padEnd(24)} ${JSON.stringify(v)}   [${type}]`);
  }
  console.log(`\n$id  ${doc.$id}\n`);
}

/* ------------------------------------------------------------------ */
/* MAIN                                                                */
/* ------------------------------------------------------------------ */

async function run() {
  requireConfig(['endpoint', 'projectId', 'apiKey', 'databaseId']);

  const raw = JSON.parse(readFileSync(DATA_FILE, 'utf8'));
  const vendors = Array.isArray(raw) ? raw : (raw.vendors || raw.items || []);
  if (!vendors.length) { console.error('No vendors[] found in', DATA_FILE); process.exit(1); }

  // Shell id comes from the file's `_shellId` first, so this seeder targets the
  // shell the data was written for regardless of the ambient .env SHELL_ID
  // (which is usually set for the activities shells). Env is only a fallback.
  const fileShellId = raw._shellId || null;
  if (fileShellId && CFG.shellId && fileShellId !== CFG.shellId) {
    console.log(`note: using file _shellId ${fileShellId} (ignoring .env SHELL_ID ${CFG.shellId})`);
  }
  CFG.shellId = fileShellId || CFG.shellId;
  if (!CFG.shellId) { console.error('No shell id: set _shellId in the file or SHELL_ID in env.'); process.exit(1); }
  console.log(`target shell: ${CFG.shellId}\n`);

  // Guard: a duplicate slug would collapse two businesses onto one doc id.
  const seen = new Set();
  for (const v of vendors) {
    if (!v.slug) { console.error(`Vendor missing slug: ${v.name || '(no name)'}`); process.exit(1); }
    if (seen.has(v.slug)) { console.error(`Duplicate slug: ${v.slug}`); process.exit(1); }
    seen.add(v.slug);
  }

  if (!DRY) await bootstrapSchema();

  let created = 0, updated = 0, skipped = 0, failed = 0;
  const built = [];

  for (const item of vendors) {
    const data  = buildVendorDoc(item);
    const docId = stableId(item.slug);
    built.push({ docId, slug: item.slug, permissions: SEED_PERMISSIONS, data });

    if (DRY) continue;

    try {
      const status = await upsert(docId, data);
      if (status === 'created') created++;
      else if (status === 'updated') updated++;
      else skipped++;
      const tag = status === 'created' ? 'NEW ' : status === 'skipped' ? 'have' : 'ok  ';
      console.log(`${tag} ${item.slug.padEnd(32)} ${item.name}`);
    } catch (err) {
      failed++;
      console.error(`FAIL ${item.slug.padEnd(32)} ${item.name}`);
      console.error(`     ${err.message}`);
    }
  }

  if (DRY) {
    console.log(JSON.stringify(built, null, 2));
    console.log(`\nDry run. ${built.length} vendor doc(s) would be written. Nothing sent.`);
    console.log('Schema bootstrap is SKIPPED in --dry-run; run without it to create the collection.\n');
    return;
  }

  console.log(`\ncreated ${created}   updated ${updated}   skipped ${skipped}   failed ${failed}\n`);
  console.log('Reminder: the shell still needs is_private:false + public_override:true to be visible.');
  console.log(`  shellId ${CFG.shellId}\n`);
}

const i = args.indexOf('--inspect');
if (i > -1) {
  const docId = args[i + 1];
  if (!docId) { console.error('Usage: --inspect <docId>'); process.exit(1); }
  inspect(docId).catch((e) => { console.error(e.message); process.exit(1); });
} else {
  run().catch((e) => { console.error(e.message); process.exit(1); });
}
