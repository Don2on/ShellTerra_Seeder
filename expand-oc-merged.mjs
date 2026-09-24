#!/usr/bin/env node
/**
 * expand-oc-merged.mjs — companion to expand-food-events.mjs for the OC vendor
 * sets that live OUTSIDE OCFoodVendors.json: the "OC Free Food" merge, the
 * secondary added batch, and the researched capoc sites. Same window and
 * expansion logic as expand-food-events.mjs; only events[] is rewritten. Each
 * region's recurrence comes from its own *Distribution*.json (seriesSlug lookup).
 *
 * Usage:  node expand-oc-merged.mjs
 * Idempotent. Re-seed the three vendor files afterward (full upsert).
 */
import { readFileSync, writeFileSync } from 'node:fs';

const REGIONS = [
  { tag: 'OC-merged', dist: './OCFoodDistribution-new.json',   vend: './OCFoodVendors-new.json' },
  { tag: 'OC-added',  dist: './OCFoodDistribution-added.json', vend: './OCFoodVendors-added.json' },
  { tag: 'OC-capoc',  dist: './OCFoodDistribution-capoc.json', vend: './OC-capoc-activity-vendors.json' },
];

// ── window: Monday of this week → last day of (current month + 3) ── (matches expand-food-events.mjs)
const now = new Date();
const weekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
weekStart.setDate(weekStart.getDate() - ((weekStart.getDay() + 6) % 7));
const horizon = new Date(now.getFullYear(), now.getMonth() + 4, 0);
const fmt = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const WEEK_START = fmt(weekStart);
const HORIZON = fmt(horizon);
const dartToJs = (d) => Number(d) % 7;

function expandItem(it) {
  const time = it.start ? String(it.start).slice(11, 16) : '';
  const title = it.title || '';
  const description = it.description || '';
  const rec = it.recurrence;
  const out = [];
  const add = (dateStr) => { if (dateStr >= WEEK_START && dateStr <= HORIZON) out.push({ date: dateStr, time, title, description }); };

  if (rec && rec.frequency === 'weekly') {
    const days = String(it.recurDays || '').split(',').map((s) => s.trim()).filter(Boolean);
    const jsDays = days.length ? days.map(dartToJs) : [new Date(String(it.start).slice(0, 10)).getDay()];
    for (const jd of jsDays) {
      const d = new Date(weekStart);
      d.setDate(d.getDate() + ((jd - d.getDay() + 7) % 7));
      for (; d <= horizon; d.setDate(d.getDate() + 7)) add(fmt(d));
    }
  } else if (rec && rec.frequency === 'monthly' && Array.isArray(rec.nthWeekdays)) {
    for (const { n, dayOfWeek } of rec.nthWeekdays) {
      const jd = dartToJs(dayOfWeek);
      for (let mo = 0; mo <= 4; mo++) {
        const first = new Date(now.getFullYear(), now.getMonth() + mo, 1);
        const day = 1 + ((jd - first.getDay() + 7) % 7) + (n - 1) * 7;
        const cand = new Date(now.getFullYear(), now.getMonth() + mo, day);
        if (cand.getMonth() !== first.getMonth()) continue;
        add(fmt(cand));
      }
    }
  } else if (it.start) {
    add(String(it.start).slice(0, 10));
  }
  return out;
}

for (const r of REGIONS) {
  let dist, vendData;
  try { dist = JSON.parse(readFileSync(r.dist, 'utf8')); vendData = JSON.parse(readFileSync(r.vend, 'utf8')); }
  catch (e) { console.log(`⚠️  ${r.tag}: skipped (${e.message.split('\n')[0]})`); continue; }
  const items = dist.items || [];
  const vendors = vendData.vendors || [];

  const bySeries = new Map();
  for (const it of items) {
    const key = it.seriesSlug || '';
    if (!key) continue;
    if (!bySeries.has(key)) bySeries.set(key, new Map());
    const seen = bySeries.get(key);
    for (const ev of expandItem(it)) { const k = ev.date + '|' + ev.time; if (!seen.has(k)) seen.set(k, ev); }
  }

  let touched = 0, totalEvents = 0;
  for (const v of vendors) {
    const seen = bySeries.get(v.slug);
    if (!seen) continue;
    const events = [...seen.values()].sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time));
    v.events = events;
    if ('_eventCount' in v) v._eventCount = events.length;
    touched++; totalEvents += events.length;
  }

  writeFileSync(r.vend, JSON.stringify(vendData, null, 2));
  console.log(`✅ ${r.tag}: window ${WEEK_START}..${HORIZON} | vendors updated: ${touched}/${vendors.length} | total events: ${totalEvents} (avg ${(totalEvents / Math.max(1, touched)).toFixed(1)}/vendor)`);
}
