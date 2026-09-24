#!/usr/bin/env node
/**
 * ShellTerra - Appwrite content seeder
 *
 * Activities and timemarks use DIFFERENT field names for the same concepts:
 *
 *   Concept        Activities                  Timemarks
 *   -----------    ------------------------    -------------------------
 *   Collection     activities                  timemarks
 *   Shell ref      shellID                     shell_id
 *   Owner          creatorId                   user_id
 *   Visibility     isPrivate (false = public)  is_public (true = public)
 *   Time of day    startTime, "H:M" string     none, date only
 *
 * TWO THINGS THAT DECIDE WHETHER ANYONE CAN SEE THE RESULT
 *
 *   1. Every document is written with Permission.read(Role.any()) hardcoded.
 *      These collections use document-level security, so a doc without its own
 *      read permission is invisible to everyone except the API key. Permissions
 *      are NOT cloned from a reference doc: the in-app create path passes no
 *      permissions at all, so a hand-made reference may be readable only by you.
 *
 *   2. Seeding alone is not enough. The shell itself needs public_override.
 *      Hillcrest is under 9 members, so the feed's member ceiling filters out
 *      its public content until the shell is overridden. Run the shell call
 *      after seeding. See POST-SEED below.
 *
 * USAGE
 *   node --env-file=.env seed-activities.mjs --inspect activities <docId>
 *   node --env-file=.env seed-activities.mjs --inspect timemarks <docId>
 *   node --env-file=.env seed-activities.mjs --dry-run
 *   node --env-file=.env seed-activities.mjs
 *   node --env-file=.env seed-activities.mjs --file other.json
 *
 * POST-SEED (required, regardless of SEED_AS_PUBLIC)
 *   {"type":"shell","shellId":"HILLCREST_SHELL_ID","adminSecret":"..."}
 *   Sets is_private:false and public_override:true on the shell.
 */

import { Client, Databases, Permission, Role } from 'node-appwrite';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import process from 'node:process';

/* ------------------------------------------------------------------ */
/* CONFIG                                                              */
/* ------------------------------------------------------------------ */

const CFG = {
  // Self-hosted. NOT cloud.appwrite.io.
  endpoint:   process.env.APPWRITE_ENDPOINT,
  projectId:  process.env.APPWRITE_PROJECT_ID,
  apiKey:     process.env.APPWRITE_API_KEY,
  databaseId: process.env.APPWRITE_DATABASE_ID,

  activitiesCollection: process.env.ACTIVITIES_COLLECTION_ID || 'activities',
  timemarksCollection:  process.env.TIMEMARKS_COLLECTION_ID  || 'timemarks',

  shellId:     process.env.SHELL_ID,
  ownerUserId: process.env.OWNER_USER_ID,

  timeZone: 'America/Los_Angeles',
};

/**
 * Hardcoded, not cloned. read(any) is all that is needed: server API keys
 * bypass document permissions, so idempotent re-runs still work without
 * granting update or delete to Role.any().
 */
const SEED_PERMISSIONS = [
  Permission.read(Role.any()),
];

const SEED_AS_PUBLIC = true;

/**
 * Field names holding the calendar date. Both are written as full ISO
 * datetimes and read back with DateTime.tryParse.
 * Confirm the exact attribute names with --inspect.
 */
const ACTIVITY_DATE_FIELD = 'date';
const ACTIVITY_TIME_FIELD = 'startTime';
const ACTIVITY_END_TIME_FIELD = 'endTime';
const TIMEMARK_DATE_FIELD = 'date';

/**
 * Owner display fields, confirmed from the reference docs (creatorId /
 * user_id 697d09796292a72c5fdf). Activities carry creator_avatar; timemarks
 * carry nickname + avatar. Both carry a sticker scale.
 */
const OWNER_NICKNAME = process.env.OWNER_NICKNAME || 'donny';
const OWNER_AVATAR   = process.env.OWNER_AVATAR   || '🐬';
const ACTIVITY_SCALE = 1.0;
const TIMEMARK_SCALE = 0.5;

/* ------------------------------------------------------------------ */
/* FIELD MAPPING - edit to match --inspect output exactly              */
/* ------------------------------------------------------------------ */

function buildActivityDoc(item, ctx) {
  const doc = {
    name:        item.title,          // Appwrite attr is `name`, not `title`
    description: item.description,

    shellID:   CFG.shellId,
    creatorId: CFG.ownerUserId,

    latitude:  item.lat,
    longitude: item.lng,

    // Single `locationText` string (no `locationName`/`address` attrs exist).
    // Prefer the full street address; fall back to the short place name.
    // Keep it under the activities.locationText column cap.
    locationText: item.address || item.locationName || '',
    linkUrl:      item.linkUrl || item.url || '',

    // Vendor/host name. Drives seeded-shell vendor grouping in the app:
    // activities sharing a hostName collapse into one vendor card. Requires a
    // `hostName` (String) attribute on the activities collection.
    // --no-host-grouping forces this empty so every activity stands alone in the
    // Activities tab (used when the vendor directory lives ONLY in the Vendors
    // tab and the Activities tab should show each occurrence as its own card).
    hostName:     NO_HOST_GROUPING ? '' : (item.locationName || ''),

    recurrence:     ctx.recurrence,
    isPrivate:      !SEED_AS_PUBLIC,
    creator_avatar: OWNER_AVATAR,
    scale:          ACTIVITY_SCALE,
  };

  doc[ACTIVITY_DATE_FIELD] = ctx.dateAnchor;
  doc[ACTIVITY_TIME_FIELD] = ctx.startClock;
  // endTime is a REQUIRED attribute. The app writes '' when there's no close
  // time (activity_service.dart), and _parseActivityMap reads '' back as null.
  // Always send it so open-only schedules ("from 3 PM") don't fail validation.
  doc[ACTIVITY_END_TIME_FIELD] = ctx.endClock || '';

  // Multi-day recurrence on a single doc: weekly weekday-set "1,2,3,4,5" or
  // monthly nth-weekdays "2:2,4:2" (Dart Mon=1..Sun=7). The app rolls to the
  // next day in the set. Absent = classic single-day.
  if (item.recurDays) doc.recur_days = item.recurDays;

  return doc;
}

function buildTimemarkDoc(item, ctx) {
  const doc = {
    name:        item.title,          // Appwrite attr is `name`, not `title`
    description: item.description,

    shell_id: CFG.shellId,
    user_id:  CFG.ownerUserId,

    latitude:  item.lat,
    longitude: item.lng,

    // Timemarks have NO location-text field — the pin IS the location.
    // Display fields the app renders on the map sticker:
    is_public:   SEED_AS_PUBLIC,
    nickname:    OWNER_NICKNAME,
    avatar:      OWNER_AVATAR,
    scale:       TIMEMARK_SCALE,
    likes_count: 0,
  };

  doc[TIMEMARK_DATE_FIELD] = ctx.dateAnchor;

  // Discriminator for seeded curated content (e.g. "landmark") vs ordinary
  // user timemarks. Only written when the source item sets it, so normal
  // timemark seeds and app-created rows leave it null. Requires an
  // `entry_type` (String, optional) attribute on the timemarks collection.
  if (item.entry_type) doc.entry_type = item.entry_type;

  return doc;
}

/* ------------------------------------------------------------------ */
/* TIME HELPERS                                                        */
/* ------------------------------------------------------------------ */

/**
 * '2026-08-19T18:30' -> '2026-08-19T12:00:00.000Z'
 *
 * The intended local calendar day, anchored at midday UTC. NOT the true
 * instant. The app reads .month and .year off this in UTC, so storing the
 * real 01:30Z instant for a 6:30pm event would roll it to the next day.
 * Midday survives every US timezone offset without the date shifting.
 */
function toDateAnchor(local) {
  if (!local) return null;
  return `${local.split('T')[0]}T12:00:00.000Z`;
}

/**
 * '2026-08-16T09:00' -> '9:0'
 * Matches the app's '${hour}:${minute}', which does not zero-pad. The app
 * splits on ':' and int.tryParse-es each half, so an ISO string here renders
 * as 00:00.
 */
function toClockString(local) {
  if (!local) return null;
  const [h, m] = local.split('T')[1].split(':').map(Number);
  return `${h}:${m}`;
}

function addLocalDays(local, days) {
  const [datePart, timePart] = local.split('T');
  const [y, m, d] = datePart.split('-').map(Number);
  const s = new Date(Date.UTC(y, m - 1, d + days));
  return `${s.getUTCFullYear()}-${String(s.getUTCMonth()+1).padStart(2,'0')}-${String(s.getUTCDate()).padStart(2,'0')}T${timePart}`;
}

function addLocalMonths(local, months) {
  const [datePart, timePart] = local.split('T');
  const [y, m, d] = datePart.split('-').map(Number);
  const s = new Date(Date.UTC(y, m - 1 + months, d));
  return `${s.getUTCFullYear()}-${String(s.getUTCMonth()+1).padStart(2,'0')}-${String(s.getUTCDate()).padStart(2,'0')}T${timePart}`;
}

/** Nth weekday of that month. dayOfWeek: Dart Mon=1..Sun=7, n is 1-based or -1 for last. */
function nthWeekdayOfMonth(local, n, dayOfWeek) {
  const [datePart, timePart] = local.split('T');
  const [y, m] = datePart.split('-').map(Number);
  const jsDow = dayOfWeek === 7 ? 0 : dayOfWeek; // Dart Sun=7 -> JS Sun=0
  if (n < 0) {
    const lastDay = new Date(Date.UTC(y, m, 0)).getUTCDate();
    const lastDow = new Date(Date.UTC(y, m - 1, lastDay)).getUTCDay();
    const offset = (lastDow - jsDow + 7) % 7;
    const day = lastDay - offset + (n + 1) * 7;
    const result = new Date(Date.UTC(y, m - 1, day));
    if (result.getUTCMonth() !== m - 1) return null;
    return `${y}-${String(m).padStart(2,'0')}-${String(result.getUTCDate()).padStart(2,'0')}T${timePart}`;
  }
  const first = new Date(Date.UTC(y, m - 1, 1));
  const offset = (jsDow - first.getUTCDay() + 7) % 7;
  const day = 1 + offset + (n - 1) * 7;
  const result = new Date(Date.UTC(y, m - 1, day));
  if (result.getUTCMonth() !== m - 1) return null;
  return `${y}-${String(m).padStart(2,'0')}-${String(result.getUTCDate()).padStart(2,'0')}T${timePart}`;
}

/**
 * Which nth-weekday a local date is: '2026-09-19' (a Saturday, 19th) -> {n:3, dayOfWeek:6}.
 * Lets monthly/annual recurrence be derived from the chosen date with zero
 * extra config — same UX as picking a weekly day.
 * dayOfWeek uses Dart convention (Mon=1..Sun=7).
 */
function deriveNthWeekday(local) {
  const [y, m, d] = local.split('T')[0].split('-').map(Number);
  const jsDow = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  const dayOfWeek = jsDow === 0 ? 7 : jsDow; // Dart Mon=1..Sun=7
  const n = Math.floor((d - 1) / 7) + 1;
  return { n, dayOfWeek };
}

/* ------------------------------------------------------------------ */
/* EXPANSION + IDS                                                     */
/* ------------------------------------------------------------------ */

// Produce the seed occurrence(s) to WRITE, using the app's NATIVE recurrence
// (a single doc the app rolls forward), not pre-expansion. Each entry carries
// the `recurrence` value to store on the doc.
//   none               -> 1 doc, recurrence 'none'
//   weekly             -> 1 doc, recurrence 'weekly'  (app advances +7 itself,
//                         even if item.start is already past)
//   monthly / annually -> 1 doc PER nth-weekday pattern. The app derives the
//                         nth-weekday from the stored date and rolls it forward,
//                         so "2nd & 4th Tuesday" becomes two rolling docs, not 12.
//   biweekly / daily   -> pre-expanded one-time docs (the app's Recurrence enum
//                         has no such mode), recurrence 'none'.
function expand(item) {
  const r = item.recurrence;
  if (!r) return [{ start: item.start, end: item.end || null, recurrence: 'none' }];

  if (r.frequency === 'weekly') {
    return [{ start: item.start, end: item.end || null, recurrence: 'weekly' }];
  }

  if (r.frequency === 'monthly' || r.frequency === 'annually') {
    const recurrence = r.frequency;
    // Default: derive one nth-weekday from item.start. Override with a single
    // nthWeekday or a list (nthWeekdays, e.g. 2nd & 4th Tuesday).
    const patterns = r.nthWeekdays
      || (r.nthWeekday ? [r.nthWeekday] : [deriveNthWeekday(item.start)]);
    // ONE doc, anchored on the EARLIEST pattern in item.start's month. A
    // multi-pattern `recurDays` on the item lets the app roll to whichever
    // nth-weekday comes next, so "2nd & 4th Tuesday" is one card, not two.
    let anchor = null, anchorEnd = null;
    for (const p of patterns) {
      const snapped = nthWeekdayOfMonth(item.start, p.n, p.dayOfWeek);
      if (!snapped) continue;
      if (anchor === null || snapped < anchor) {
        anchor = snapped;
        if (item.end) {
          const shift = Number(snapped.split('T')[0].split('-')[2])
                      - Number(item.start.split('T')[0].split('-')[2]);
          anchorEnd = addLocalDays(item.end, shift);
        } else {
          anchorEnd = null;
        }
      }
    }
    return anchor === null ? [] : [{ start: anchor, end: anchorEnd, recurrence }];
  }

  // biweekly / daily — no native app mode, so pre-expand. count = occurrences.
  const interval = r.frequency === 'biweekly' ? 14 : r.frequency === 'daily' ? 1 : 7;
  const count = r.count || 1;
  const out = [];
  for (let i = 0; i < count; i++) {
    out.push({
      start: addLocalDays(item.start, interval * i),
      end: item.end ? addLocalDays(item.end, interval * i) : null,
      recurrence: 'none',
    });
  }
  return out;
}

/**
 * Deterministic ID so re-running updates instead of duplicating.
 * Appwrite IDs: max 36 chars, [a-zA-Z0-9_] only, cannot start with _.
 * Output is 's' + kind letter + 28 hex chars = 30 chars, all valid.
 */
function stableId(kind, item, startLocal) {
  const hash = createHash('sha256')
    .update(`${CFG.shellId}|${kind}|${item.slug || item.title}|${startLocal}`)
    .digest('hex').slice(0, 28);
  const id = `s${kind[0]}${hash}`;
  if (!/^[a-zA-Z0-9][a-zA-Z0-9_]{0,35}$/.test(id)) {
    throw new Error(`Generated invalid Appwrite ID: ${id}`);
  }
  return id;
}

/* ------------------------------------------------------------------ */
/* MAIN                                                                */
/* ------------------------------------------------------------------ */

const args = process.argv.slice(2);
const valOf = (f) => { const i = args.indexOf(f); return i > -1 ? args[i + 1] : null; };

const DRY = args.includes('--dry-run');
// Create-only: add documents that don't exist yet, leave existing ones
// untouched (skip on 409 instead of updating). Use when back-filling a
// refreshed feed so hand-tuned existing rows aren't overwritten.
const CREATE_ONLY = args.includes('--create-only');
const DATA_FILE = valOf('--file') || './HillcrestToDo.json';

// Optional CLI overrides. --shell-id targets a shell without editing .env
// (the ambient SHELL_ID is usually set for a different activities shell).
// --no-host-grouping writes empty hostName so activities aren't collapsed into
// vendor cards in the Activities tab (see buildActivityDoc).
const SHELL_ID_OVERRIDE = valOf('--shell-id');
if (SHELL_ID_OVERRIDE) CFG.shellId = SHELL_ID_OVERRIDE;
const NO_HOST_GROUPING = args.includes('--no-host-grouping');

const client = new Client();
if (CFG.endpoint && CFG.projectId && CFG.apiKey) {
  client.setEndpoint(CFG.endpoint).setProject(CFG.projectId).setKey(CFG.apiKey);
}
const db = new Databases(client);

function requireConfig(keys) {
  const missing = keys.filter((k) => !CFG[k]);
  if (missing.length) {
    console.error('Missing env vars for:', missing.join(', '));
    if (missing.includes('endpoint')) {
      console.error('Reminder: self-hosted instance, not cloud.appwrite.io');
    }
    process.exit(1);
  }
}

async function inspect(which, docId) {
  requireConfig(['endpoint', 'projectId', 'apiKey', 'databaseId']);
  const collection = which === 'timemarks' ? CFG.timemarksCollection : CFG.activitiesCollection;
  const doc = await db.getDocument(CFG.databaseId, collection, docId);

  console.log(`\nCOLLECTION: ${collection}`);
  console.log('\nATTRIBUTES');
  for (const [k, v] of Object.entries(doc)) {
    if (k.startsWith('$')) continue;
    const type = Array.isArray(v) ? 'array' : v === null ? 'null' : typeof v;
    console.log(`  ${k.padEnd(24)} ${JSON.stringify(v)}   [${type}]`);
  }

  console.log('\nPERMISSIONS (for reference only, NOT cloned)');
  const perms = doc.$permissions || [];
  perms.length ? perms.forEach((p) => console.log(`  ${p}`))
               : console.log('  (none - this is why permissions are hardcoded instead)');

  console.log(`\n$id  ${doc.$id}`);
  console.log('\nCopy the attribute keys into this collection\'s build function.');
  console.log('Confirm which field holds the calendar date.\n');
}

// Returns 'created' | 'updated' | 'skipped' so the caller can distinguish
// brand-new rows from ones that already existed.
async function upsert(collection, docId, data) {
  try {
    await db.createDocument(CFG.databaseId, collection, docId, data, SEED_PERMISSIONS);
    return 'created';
  } catch (err) {
    if (err.code === 409) {
      if (CREATE_ONLY) return 'skipped';
      await db.updateDocument(CFG.databaseId, collection, docId, data, SEED_PERMISSIONS);
      return 'updated';
    }
    throw err;
  }
}

/**
 * After expansion, the same event must not land on the same date twice.
 * That would make it appear twice in a single-day filter view.
 */
function checkNoDuplicateDates(items) {
  const seen = new Map(); // docId -> localStart
  const dupes = [];
  for (const item of items) {
    for (const occ of expand(item)) {
      const kind = (item.kind || 'activity').toLowerCase();
      const id = stableId(kind, item, occ.start);
      if (seen.has(id)) {
        dupes.push(`  ${item.title}  (${occ.start})`);
      } else {
        seen.set(id, occ.start);
      }
    }
  }
  if (dupes.length) {
    console.error('\nERROR: these events expand to a duplicate on the same date:');
    dupes.forEach((d) => console.error(d));
    console.error('Fix the data before seeding.\n');
    process.exit(1);
  }
}

async function run() {
  requireConfig(['endpoint', 'projectId', 'apiKey', 'databaseId', 'shellId', 'ownerUserId']);

  const raw = JSON.parse(readFileSync(DATA_FILE, 'utf8'));
  const items = Array.isArray(raw) ? raw : raw.items;

  checkNoDuplicateDates(items);

  let written = 0, failed = 0, created = 0, skipped = 0;
  const built = [];

  let skippedGeo = 0;
  for (const item of items) {
    if (item.lat === null || item.lng === null) {
      skippedGeo++;
      console.warn(`SKIP (no coords)  ${item.slug}`);
      continue;
    }

    const kind = (item.kind || 'activity').toLowerCase();
    const collection = kind === 'timemark' ? CFG.timemarksCollection : CFG.activitiesCollection;

    for (const occ of expand(item)) {
      const ctx = {
        dateAnchor: toDateAnchor(occ.start),
        startClock: toClockString(occ.start),
        endClock:   toClockString(occ.end),
        recurrence: occ.recurrence,
      };

      const data = kind === 'timemark'
        ? buildTimemarkDoc(item, ctx)
        : buildActivityDoc(item, ctx);

      const docId = stableId(kind, item, occ.start);
      built.push({ collection, docId, localStart: occ.start, permissions: SEED_PERMISSIONS, data });

      if (DRY) continue;

      try {
        const status = await upsert(collection, docId, data);
        written++;
        if (status === 'created') created++;
        if (status === 'skipped') skipped++;
        const tag = status === 'created' ? 'NEW ' : status === 'skipped' ? 'have' : 'ok  ';
        console.log(`${tag} ${kind.padEnd(9)} ${occ.start}  ${item.title}`);
      } catch (err) {
        failed++;
        console.error(`FAIL ${kind.padEnd(9)} ${occ.start}  ${item.title}`);
        console.error(`     ${err.message}`);
      }
    }
  }

  if (DRY) {
    console.log(JSON.stringify(built, null, 2));
    console.log(`\nDry run. ${built.length} documents would be written. Nothing sent.\n`);
    console.log('CHECK BEFORE WRITING:');
    console.log('  1. Field names match --inspect output for each collection');
    console.log('  2. startTime reads "9:0" and "18:30", not an ISO string');
    console.log('  3. Every date ends T12:00:00.000Z on the intended local day');
    console.log('  4. The 6:30pm event is dated the 19th, not the 20th');
    console.log('  5. Timemarks carry no time of day');
    console.log('  6. permissions is read("any") on every document\n');
    return;
  }

  if (CREATE_ONLY) {
    console.log(`\ncreate-only: added ${created} NEW   already-present ${skipped}   failed ${failed}   skipped_no_coords ${skippedGeo}\n`);
  } else {
    console.log(`\nwritten ${written}   failed ${failed}   skipped_no_coords ${skippedGeo}\n`);
  }
  console.log('NOT DONE YET. The shell itself still needs overriding, or this');
  console.log('content stays filtered out by the member ceiling:');
  console.log(`  {"type":"shell","shellId":"${CFG.shellId}","adminSecret":"..."}\n`);
}

const i = args.indexOf('--inspect');
if (i > -1) {
  const which = args[i + 1], docId = args[i + 2];
  if (!which || !docId || !['activities', 'timemarks'].includes(which)) {
    console.error('Usage: --inspect activities <docId>   or   --inspect timemarks <docId>');
    process.exit(1);
  }
  inspect(which, docId).catch((e) => { console.error(e.message); process.exit(1); });
} else {
  run().catch((e) => { console.error(e.message); process.exit(1); });
}
