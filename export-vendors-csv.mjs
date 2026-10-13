#!/usr/bin/env node
/**
 * export-vendors-csv.mjs — dump the whole `vendors` collection for Excel.
 *
 * Pages through every document in the vendors collection (across ALL shells),
 * resolves each vendor's shellID to its shell name, and writes one row per
 * vendor to BOTH:
 *   - a native .xlsx (opens as a proper grid in Excel regardless of the
 *     machine's regional list-separator setting), and
 *   - a .csv (UTF-8 BOM, CRLF, RFC-4180 quoting) as a portable fallback.
 *
 * USAGE
 *   node --env-file=.env export-vendors-csv.mjs
 *   node --env-file=.env export-vendors-csv.mjs --out AllVendors.csv   # base name
 */

import { Client, Databases, Query } from 'node-appwrite';
import { writeFileSync } from 'node:fs';
import process from 'node:process';
import ExcelJS from 'exceljs';

const CFG = {
  endpoint:   process.env.APPWRITE_ENDPOINT,
  projectId:  process.env.APPWRITE_PROJECT_ID,
  apiKey:     process.env.APPWRITE_API_KEY,
  databaseId: process.env.APPWRITE_DATABASE_ID,
  vendors:    process.env.VENDORS_COLLECTION_ID || 'vendors',
  shells:     process.env.SHELLS_COLLECTION_ID,
};

const args  = process.argv.slice(2);
const valOf = (f) => { const i = args.indexOf(f); return i > -1 ? args[i + 1] : null; };
// --no-food drops vendors whose shell is a FoodDistribution* shell, leaving only
// the activity-shell vendors. Default output name switches accordingly.
const NO_FOOD = args.includes('--no-food');
const OUT   = valOf('--out') || (NO_FOOD ? 'ActivityVendors.csv' : 'AllVendors.csv');

function requireConfig(keys) {
  const missing = keys.filter((k) => !CFG[k]);
  if (missing.length) { console.error('Missing env vars for:', missing.join(', ')); process.exit(1); }
}

// Columns to emit, in order. `shellName`/`shellID` give provenance.
const COLUMNS = [
  'shellName', 'shellID', 'name', 'category', 'tagline', 'address',
  'neighborhood', 'hours', 'phone', 'email', 'website', 'instagram',
  'facebook', 'tiktok', 'latitude', 'longitude', 'featured', 'verified',
  'description', 'slug', '$id',
];

function csvCell(v) {
  if (v === null || v === undefined) return '';
  const s = String(v);
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

async function pageAll(db, collection) {
  const docs = [];
  let cursor = null;
  while (true) {
    const q = [Query.limit(100)];
    if (cursor) q.push(Query.cursorAfter(cursor));
    const res = await db.listDocuments(CFG.databaseId, collection, q);
    docs.push(...res.documents);
    if (res.documents.length < 100) break;
    cursor = res.documents.at(-1).$id;
  }
  return docs;
}

async function run() {
  requireConfig(['endpoint', 'projectId', 'apiKey', 'databaseId']);

  const client = new Client()
    .setEndpoint(CFG.endpoint).setProject(CFG.projectId).setKey(CFG.apiKey);
  const db = new Databases(client);

  // Resolve shellID -> shell name for readable provenance.
  const shellName = new Map();
  if (CFG.shells) {
    const shells = await pageAll(db, CFG.shells);
    for (const s of shells) shellName.set(s.$id, s.name ?? s.title ?? '');
  }

  let vendors = await pageAll(db, CFG.vendors);
  if (NO_FOOD) {
    const isFood = (v) => /^FoodDistribution/i.test(shellName.get(v.shellID) || '');
    const before = vendors.length;
    vendors = vendors.filter((v) => !isFood(v));
    console.log(`--no-food: excluded ${before - vendors.length} FoodDistribution vendor(s)`);
  }
  vendors.sort((a, b) =>
    (shellName.get(a.shellID) || a.shellID || '').localeCompare(shellName.get(b.shellID) || b.shellID || '') ||
    (a.name || '').localeCompare(b.name || ''));

  const lines = [COLUMNS.map(csvCell).join(',')];
  for (const v of vendors) {
    const row = COLUMNS.map((c) =>
      c === 'shellName' ? csvCell(shellName.get(v.shellID) || '') : csvCell(v[c]));
    lines.push(row.join(','));
  }

  // UTF-8 BOM + CRLF so Excel detects encoding and row breaks correctly.
  writeFileSync(OUT, '﻿' + lines.join('\r\n') + '\r\n', 'utf8');

  // Native .xlsx — the format that opens as a real grid in Excel no matter the
  // machine's list-separator locale. Raw values (no CSV escaping) go in cells.
  const XLSX = OUT.replace(/\.csv$/i, '') + '.xlsx';
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Vendors', { views: [{ state: 'frozen', ySplit: 1 }] });
  ws.columns = COLUMNS.map((c) => ({ header: c, key: c, width: Math.min(Math.max(c.length + 2, 12), 60) }));
  for (const v of vendors) {
    ws.addRow(Object.fromEntries(COLUMNS.map((c) =>
      [c, c === 'shellName' ? (shellName.get(v.shellID) || '') : (v[c] ?? '')])));
  }
  ws.getRow(1).font = { bold: true };
  ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: COLUMNS.length } };
  await wb.xlsx.writeFile(XLSX);

  const perShell = new Map();
  for (const v of vendors) {
    const k = shellName.get(v.shellID) || v.shellID || '(unknown)';
    perShell.set(k, (perShell.get(k) || 0) + 1);
  }
  console.log(`Wrote ${vendors.length} vendor(s) to ${XLSX} and ${OUT}\n`);
  for (const [k, n] of [...perShell].sort((a, b) => b[1] - a[1])) {
    console.log(`  ${String(n).padStart(5)}  ${k}`);
  }
}

run().catch((e) => { console.error(e.message); process.exit(1); });
