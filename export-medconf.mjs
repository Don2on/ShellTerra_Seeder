#!/usr/bin/env node
/**
 * export-medconf.mjs — from the 8 prepared <Region>Additions-vendors.json files,
 * export every vendor whose research confidence is "medium" into a single
 * review CSV (+ xlsx) so their schedules/phones can be phone-confirmed.
 * Reflects what actually seeded (post geocode + dedupe).
 */
import { readFileSync, writeFileSync } from 'node:fs';
import ExcelJS from 'exceljs';

const FILES = [
  ['Sacramento', './SacAdditions-vendors.json'],
  ['Yolo', './YoloAdditions-vendors.json'],
  ['Long Beach', './LBAdditions-vendors.json'],
  ['San Bernardino', './SBAdditions-vendors.json'],
  ['Northern Nevada', './NNVAdditions-vendors.json'],
  ['Los Angeles', './LAAdditions-vendors.json'],
  ['San Diego', './SDAdditions3-vendors.json'],
  ['Orange County', './OCAdditions-vendors.json'],
];

const COLUMNS = ['region', 'name', 'category', 'confidence', 'address', 'hours', 'phone', 'website'];
const csvCell = (v) => { const s = v == null ? '' : String(v); return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };

const rows = [];
for (const [region, file] of FILES) {
  const doc = JSON.parse(readFileSync(file, 'utf8'));
  for (const v of doc.vendors) {
    if ((v._confidence || '').toLowerCase() !== 'medium') continue;
    rows.push({ region, name: v.name, category: v._category || '', confidence: v._confidence,
      address: v.address, hours: v.hours, phone: v.phone, website: v.website });
  }
}
rows.sort((a, b) => a.region.localeCompare(b.region) || a.name.localeCompare(b.name));

const OUT = 'FoodAdditions-MediumConfidence.csv';
const lines = [COLUMNS.join(',')];
for (const r of rows) lines.push(COLUMNS.map((c) => csvCell(r[c])).join(','));
writeFileSync(OUT, '﻿' + lines.join('\r\n') + '\r\n', 'utf8');

const wb = new ExcelJS.Workbook();
const ws = wb.addWorksheet('MediumConfidence', { views: [{ state: 'frozen', ySplit: 1 }] });
ws.columns = COLUMNS.map((c) => ({ header: c, key: c, width: c === 'address' || c === 'hours' ? 46 : c === 'website' ? 40 : 18 }));
for (const r of rows) ws.addRow(r);
ws.getRow(1).font = { bold: true };
ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: COLUMNS.length } };
await wb.xlsx.writeFile(OUT.replace(/\.csv$/, '.xlsx'));

const per = new Map();
for (const r of rows) per.set(r.region, (per.get(r.region) || 0) + 1);
console.log(`${rows.length} medium-confidence sites -> ${OUT} + .xlsx\n`);
for (const [k, n] of [...per].sort((a, b) => b[1] - a[1])) console.log(`  ${String(n).padStart(3)}  ${k}`);
