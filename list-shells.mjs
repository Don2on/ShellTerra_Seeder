#!/usr/bin/env node
/**
 * ShellTerra - list all shells and their public status
 *
 * Reads every document in the shells collection and prints:
 *   $id | name | is_private | public_override
 *
 * A shell is publicly visible when is_private=false AND public_override=true.
 *
 * USAGE
 *   node --env-file=.env list-shells.mjs
 *   node --env-file=.env list-shells.mjs --json
 */

import { Client, Databases, Query } from 'node-appwrite';
import process from 'node:process';

const CFG = {
  endpoint:   process.env.APPWRITE_ENDPOINT,
  projectId:  process.env.APPWRITE_PROJECT_ID,
  apiKey:     process.env.APPWRITE_API_KEY,
  databaseId: process.env.APPWRITE_DATABASE_ID,
  shellsCollection: process.env.SHELLS_COLLECTION_ID,
};

const JSON_MODE = process.argv.includes('--json');

const ENV_NAMES = {
  endpoint:         'APPWRITE_ENDPOINT',
  projectId:        'APPWRITE_PROJECT_ID',
  apiKey:           'APPWRITE_API_KEY',
  databaseId:       'APPWRITE_DATABASE_ID',
  shellsCollection: 'SHELLS_COLLECTION_ID',
};

function requireConfig(keys) {
  const missing = keys.filter((k) => !CFG[k]);
  if (missing.length) {
    console.error(`Missing env vars: ${missing.map((k) => ENV_NAMES[k] || k).join(', ')}`);
    process.exit(1);
  }
}

async function listShells() {
  requireConfig(['endpoint', 'projectId', 'apiKey', 'databaseId']);

  const client = new Client()
    .setEndpoint(CFG.endpoint)
    .setProject(CFG.projectId)
    .setKey(CFG.apiKey);

  const db = new Databases(client);

  const shells = [];
  let cursor = null;

  // Page through all shells (Appwrite default limit is 25).
  while (true) {
    const queries = [Query.limit(100)];
    if (cursor) queries.push(Query.cursorAfter(cursor));

    const res = await db.listDocuments(CFG.databaseId, CFG.shellsCollection, queries);
    shells.push(...res.documents);

    if (res.documents.length < 100) break;
    cursor = res.documents.at(-1).$id;
  }

  if (JSON_MODE) {
    const out = shells.map((s) => ({
      id:              s.$id,
      name:            s.name ?? s.title ?? '(no name)',
      is_private:      s.is_private,
      public_override: s.public_override,
      public:          s.is_private === false && s.public_override === true,
    }));
    console.log(JSON.stringify(out, null, 2));
    return;
  }

  if (!shells.length) {
    console.log('No shells found.');
    return;
  }

  // Column widths derived from content.
  const col = {
    id:   Math.max(4, ...shells.map((s) => s.$id.length)),
    name: Math.max(4, ...shells.map((s) => (s.name ?? s.title ?? '').length)),
  };

  const hr = `${'─'.repeat(col.id + 2)}┼${'─'.repeat(col.name + 2)}┼──────────┼─────────────────┼────────`;
  const header =
    ` ${'ID'.padEnd(col.id)} │ ${'NAME'.padEnd(col.name)} │ IS_PRIVATE│ PUBLIC_OVERRIDE  │ PUBLIC`;

  console.log('');
  console.log(header);
  console.log(hr);

  for (const s of shells) {
    const name    = (s.name ?? s.title ?? '(no name)').padEnd(col.name);
    const id      = s.$id.padEnd(col.id);
    const priv    = String(s.is_private).padEnd(10);
    const over    = String(s.public_override).padEnd(17);
    const pub     = s.is_private === false && s.public_override === true ? 'YES' : 'no';
    console.log(` ${id} │ ${name} │ ${priv}│ ${over}│ ${pub}`);
  }

  const publicCount = shells.filter((s) => s.is_private === false && s.public_override === true).length;
  console.log('');
  console.log(`${shells.length} shell(s) total  •  ${publicCount} public`);
  console.log('');
}

listShells().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
