#!/usr/bin/env node
/**
 * dump-existing.mjs — for each food-distribution shell, write a compact
 * <ShellName>-existing.txt list of "name | address" for every current vendor.
 * Feeds research agents so they only return NET-NEW sites (and gives the
 * prepare step an accurate, live dedupe base — not stale local JSON).
 *
 * USAGE: node --env-file=.env dump-existing.mjs
 */
import { Client, Databases, Query } from 'node-appwrite';
import { writeFileSync } from 'node:fs';
import process from 'node:process';

const CFG = {
  endpoint: process.env.APPWRITE_ENDPOINT,
  projectId: process.env.APPWRITE_PROJECT_ID,
  apiKey: process.env.APPWRITE_API_KEY,
  databaseId: process.env.APPWRITE_DATABASE_ID,
  vendors: process.env.VENDORS_COLLECTION_ID || 'vendors',
};

const SHELLS = {
  FoodDistributionSD: '6a84dbe4ec8215c0345e',
  FoodDistributionOC: '6aac35296621e11030a0',
  FoodDistributionLA: '6aac35a4c154a0ac014f',
  FoodDistributionLongBeach: '6ab8a3910019b374bbb7',
  FoodDistributionNorthernNevada: '6aba043c003c0898597a',
  FoodDistributionSacramento: '6aba043f0010e3a2ac9c',
  FoodDistributionYolo: '6aba044800361d504695',
  FoodDistributionSanBernardino: '6abaa385b4b328f7ae43',
};

const client = new Client().setEndpoint(CFG.endpoint).setProject(CFG.projectId).setKey(CFG.apiKey);
const db = new Databases(client);

async function vendorsFor(shellId) {
  const out = [];
  let cursor = null;
  while (true) {
    const q = [Query.equal('shellID', shellId), Query.limit(100)];
    if (cursor) q.push(Query.cursorAfter(cursor));
    const res = await db.listDocuments(CFG.databaseId, CFG.vendors, q);
    out.push(...res.documents);
    if (res.documents.length < 100) break;
    cursor = res.documents.at(-1).$id;
  }
  return out;
}

for (const [name, id] of Object.entries(SHELLS)) {
  const vs = await vendorsFor(id);
  vs.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  const lines = vs.map((v) => `${v.name}  |  ${v.address || '(no address)'}`);
  writeFileSync(`./${name}-existing.txt`, lines.join('\n') + '\n');
  console.log(`${name}: ${vs.length} -> ${name}-existing.txt`);
}
