#!/usr/bin/env node
/**
 * seed-vendor-images.mjs — per-vendor images via a folder convention.
 *
 * No hand-maintained vendor→image map. Drop image files into a per-shell
 * folder named after each vendor's slug; this script matches them to the
 * shell's activities (grouped by hostName), uploads each once, and writes
 * image_url onto every activity of that vendor. Vendors with no file keep
 * falling back to the shell image (see ActivitySticker cascade in the app).
 *
 * FOLDER LAYOUT (default)
 *   images/vendors/<ShellFolder>/<vendor-slug>.<png|jpg|jpeg|webp>
 *   e.g. images/vendors/HillcrestActivities/gossip-grill.png
 *
 *   <ShellFolder> defaults to the feed's `_shell` (or the --file basename).
 *   <vendor-slug> is the slugified activity hostName — run --list to see the
 *   exact filename each vendor expects. Override the folder with --dir <path>.
 *
 * USAGE
 *   node --env-file=.env seed-vendor-images.mjs --file ./HillcrestActivities.json --list
 *   node --env-file=.env seed-vendor-images.mjs --file ./HillcrestActivities.json --dry-run
 *   node --env-file=.env seed-vendor-images.mjs --file ./HillcrestActivities.json
 *
 * Idempotent: storage file id is derived from (shellId, vendor-slug), so a
 * re-run reuses the same upload (409 → reuse) and only updates docs whose
 * image_url differs.
 */
import { Client, Databases, Storage, Query, Permission, Role } from 'node-appwrite';
import { InputFile } from 'node-appwrite/file';
import { readFileSync, existsSync, mkdirSync } from 'node:fs';
import { basename, join } from 'node:path';
import { createHash } from 'node:crypto';
import process from 'node:process';

const CFG = {
  endpoint:   process.env.APPWRITE_ENDPOINT,
  projectId:  process.env.APPWRITE_PROJECT_ID,
  apiKey:     process.env.APPWRITE_API_KEY,
  databaseId: process.env.APPWRITE_DATABASE_ID,
  activities: process.env.ACTIVITIES_COLLECTION_ID || 'activities',
  shellId:    process.env.SHELL_ID,
  // Same bucket the shell images use.
  bucketId:   process.env.VENDOR_BUCKET_ID || '69d10162000d676dcff6',
};

const args  = process.argv.slice(2);
const valOf = (f) => { const i = args.indexOf(f); return i > -1 ? args[i + 1] : null; };
const DRY   = args.includes('--dry-run');
const LIST  = args.includes('--list');
const FILE  = valOf('--file') || './HillcrestActivities.json';
const DIR_OVERRIDE = valOf('--dir');

const EXTS = ['png', 'jpg', 'jpeg', 'webp'];
const slug = (s) => (s || '')
  .toLowerCase().normalize('NFKD')
  .replace(/[^\w]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60);

const client = new Client();
if (CFG.endpoint && CFG.projectId && CFG.apiKey) {
  client.setEndpoint(CFG.endpoint).setProject(CFG.projectId).setKey(CFG.apiKey);
}
const db = new Databases(client);
const storage = new Storage(client);

function shellFolderName() {
  try { const raw = JSON.parse(readFileSync(FILE, 'utf8')); if (raw && raw._shell) return raw._shell; } catch { /* ignore */ }
  return basename(FILE).replace(/\.json$/i, '');
}

function findImage(dir, s) {
  for (const ext of EXTS) { const p = join(dir, `${s}.${ext}`); if (existsSync(p)) return p; }
  return null;
}

// 'v' + 30 hex = 31 chars, valid Appwrite file id (<=36, starts with a letter).
function storageId(s) {
  return 'v' + createHash('sha256').update(`${CFG.shellId}|${s}`).digest('hex').slice(0, 30);
}

async function listAllActivities() {
  const all = []; let offset = 0;
  while (true) {
    const r = await db.listDocuments(CFG.databaseId, CFG.activities, [
      Query.equal('shellID', CFG.shellId), Query.limit(100), Query.offset(offset),
    ]);
    all.push(...r.documents);
    if (r.documents.length < 100) break;
    offset += 100;
  }
  return all;
}

async function uploadOnce(path, id) {
  try {
    await storage.createFile(
      CFG.bucketId, id,
      InputFile.fromBuffer(readFileSync(path), basename(path)),
      [Permission.read(Role.any())],
    );
  } catch (e) {
    if (e.code !== 409) throw e; // 409 = already uploaded on a prior run
  }
  return `${CFG.endpoint}/storage/buckets/${CFG.bucketId}/files/${id}/view?project=${CFG.projectId}`;
}

function groupByHost(activities) {
  const groups = new Map();
  for (const a of activities) {
    const h = (a.hostName || '').trim();
    if (!h) continue;
    if (!groups.has(h)) groups.set(h, []);
    groups.get(h).push(a);
  }
  return groups;
}

async function run() {
  const missing = ['endpoint', 'projectId', 'apiKey', 'databaseId', 'shellId'].filter((k) => !CFG[k]);
  if (missing.length) { console.error('Missing env:', missing.join(', ')); process.exit(1); }

  const folder = shellFolderName();
  const dir = DIR_OVERRIDE || join('images', 'vendors', folder);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });

  const activities = await listAllActivities();
  const groups = groupByHost(activities);
  const sorted = [...groups].sort((a, b) => b[1].length - a[1].length);

  if (LIST) {
    console.log(`Shell ${CFG.shellId}   folder: ${dir}\n`);
    console.log(' img  expected filename                          activities  vendor');
    for (const [host, list] of sorted) {
      const s = slug(host);
      const has = findImage(dir, s);
      console.log(`[${has ? '✓' : ' '}]  ${(s + '.png').padEnd(42)} ${String(list.length).padStart(3)}x        ${host}`);
    }
    console.log(`\nDrop <slug>.{${EXTS.join(',')}} into ${dir}, then re-run without --list.`);
    return;
  }

  let vendorsMatched = 0, uploaded = 0, docsUpdated = 0;
  for (const [host, list] of sorted) {
    const s = slug(host);
    const path = findImage(dir, s);
    if (!path) continue;
    vendorsMatched++;

    const id = storageId(s);
    const url = DRY ? `(dry-run)/${id}` : await uploadOnce(path, id);
    if (!DRY) uploaded++;

    let touched = 0;
    for (const a of list) {
      if (a.image_url === url) continue;
      if (!DRY) await db.updateDocument(CFG.databaseId, CFG.activities, a.$id, { image_url: url });
      touched++;
    }
    docsUpdated += touched;
    console.log(`${DRY ? 'DRY ' : 'ok  '} ${s.padEnd(42)} ${String(list.length).padStart(3)}x  ${basename(path)}`);
  }

  console.log(`\n${DRY ? 'DRY RUN — ' : ''}vendors matched ${vendorsMatched}/${groups.size}   uploaded ${uploaded}   docs updated ${docsUpdated}`);
  if (vendorsMatched < groups.size) {
    console.log(`${groups.size - vendorsMatched} vendor(s) still have no image. Run with --list to see filenames.`);
  }
}

run().catch((e) => { console.error(e.message); process.exit(1); });
