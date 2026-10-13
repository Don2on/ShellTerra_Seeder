#!/usr/bin/env node
/**
 * ShellTerra - create a new curated (seeded) shell document.
 *
 * There was no create path in the seeder before this: every earlier curated
 * shell was hand-made in the app, then filled by seed-activities/seed-vendors.
 * This clones the field shape of the working FoodDistributionLA shell
 * (6aac35a4c154a0ac014f) so a new food-distribution shell can be created
 * head-lessly and then seeded the same way.
 *
 * Created PRIVATE by default (is_private:true, public_override:false). Fill it,
 * then run make-shell-public.mjs to flip it live — same order as the app flow.
 *
 * The document id is generated with ID.unique() (matches the 20-char ids the
 * other shells use). Permissions grant the human owner account read/update/
 * delete, mirroring the reference shell.
 *
 * USAGE
 *   node --env-file=.env create-shell.mjs --name FoodDistributionLongBeach \
 *        --description "Free food distributions in Long Beach"
 *   node --env-file=.env create-shell.mjs --name X --description "Y" --dry-run
 */
import { Client, Databases, ID, Permission, Role } from 'node-appwrite';
import process from 'node:process';

const args = process.argv.slice(2);
const valOf = (f) => { const i = args.indexOf(f); return i > -1 ? args[i + 1] : null; };
const DRY = args.includes('--dry-run');

const name = valOf('--name');
const description = valOf('--description') || '';
if (!name) { console.error('Required: --name <shellName>'); process.exit(1); }

// Owner of the seeded content (activities/timemarks creatorId). Same account the
// reference shell stores in user_id.
const ownerUserId = process.env.OWNER_USER_ID;
// Human account that owns the shell document (from the reference shell's
// $permissions). Overridable in case the owning account differs.
const OWNER_ACCOUNT = valOf('--owner-account') || '6a7e07d24e8191708471';

// Field shape cloned from FoodDistributionLA (6aac35a4c154a0ac014f).
const DOC = {
  user_id: ownerUserId,
  name,
  description,
  show_in_search: false,
  request_to_join: false,
  image_file_id: '',
  is_private: true,
  members_count: '1',
  magic_word: '',
  view_member_count: false,
  chat_mode: 'open',
  owner_avatar: '🐬',
  magic_word_case_sensitive: false,
  public_override: false,
  hide_members: true,
  is_seeded: true,
};

const PERMISSIONS = [
  Permission.read(Role.user(OWNER_ACCOUNT)),
  Permission.update(Role.user(OWNER_ACCOUNT)),
  Permission.delete(Role.user(OWNER_ACCOUNT)),
];

if (!ownerUserId) { console.error('OWNER_USER_ID not set in env.'); process.exit(1); }

if (DRY) {
  console.log('DRY: would create shell with');
  console.log(JSON.stringify(DOC, null, 2));
  console.log('permissions:', JSON.stringify(PERMISSIONS));
  process.exit(0);
}

const client = new Client()
  .setEndpoint(process.env.APPWRITE_ENDPOINT)
  .setProject(process.env.APPWRITE_PROJECT_ID)
  .setKey(process.env.APPWRITE_API_KEY);
const db = new Databases(client);
const dbId = process.env.APPWRITE_DATABASE_ID;
const colId = process.env.SHELLS_COLLECTION_ID;

try {
  const shellId = ID.unique();
  const doc = await db.createDocument(dbId, colId, shellId, DOC, PERMISSIONS);
  console.log(`Created shell '${name}'`);
  console.log(`  $id: ${doc.$id}`);
  console.log(`  is_private=${doc.is_private}  public_override=${doc.public_override}  is_seeded=${doc.is_seeded}`);
  console.log('\nNext:');
  console.log(`  node --env-file=.env seed-activities.mjs --file ./LongBeachFoodDistribution.json --no-host-grouping --shell-id ${doc.$id}`);
  console.log(`  node --env-file=.env seed-vendors.mjs --file ./LongBeachFoodVendors.json`);
  console.log(`  node --env-file=.env set-shell-image.mjs --file <image> --shell-id ${doc.$id}`);
  console.log(`  node --env-file=.env make-shell-public.mjs --shell-id ${doc.$id}`);
} catch (err) {
  console.error(`Create failed: ${err.message}`);
  process.exit(1);
}
