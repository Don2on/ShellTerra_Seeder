#!/usr/bin/env node
/**
 * fetch-cpg-adjournments.mjs — turn CPG "meeting cancelled / adjourned /
 * rescheduled" notices into occurrence-level overrides for the public CPG map.
 *
 * Writes cpg-adjournments.json (read by ../shelter_services/shellterra-public/
 * build-data.mjs), whose entries stamp a meeting with status + note so the page
 * strikes it through and badges it (Cancelled / Rescheduled / Adjourned).
 *
 * TWO SOURCES, ONE FILE:
 *   1. MANUAL  — hand-add entries to cpg-adjournments.json. Anything whose
 *                `source` is not "email" is treated as hand-authored and is
 *                PRESERVED across runs (it also wins over an email entry for the
 *                same meeting). This is the launch-now path: edit the JSON, run
 *                build-data.mjs, deploy.
 *   2. EMAIL   — notices arrive by email and this script converts them. Pulls
 *                from Gmail (zero-dep Gmail API, unattended-safe) and/or a local
 *                drop folder of .eml/.txt files, parses each, matches it to a
 *                real meeting occurrence, and writes `source:"email"` entries.
 *
 * Matching is conservative: a notice must resolve to ONE real occurrence slug
 * (<seriesId>-YYYY-MM-DD) in SDCommunityPlanningGroups.json or it goes to the
 * `_meta.review` list (and the console) for a human — it is never guessed onto
 * the wrong meeting.
 *
 * Usage (from shellterra-seeder/):
 *   node fetch-cpg-adjournments.mjs            # fetch + merge + write
 *   node fetch-cpg-adjournments.mjs --dry      # parse + print, write nothing
 *
 * EMAIL (Gmail) setup — set these env vars (e.g. in a gitignored .env.ps1):
 *   CPG_GMAIL_CLIENT_ID       OAuth2 client id  (Google Cloud "Desktop app")
 *   CPG_GMAIL_CLIENT_SECRET   OAuth2 client secret
 *   CPG_GMAIL_REFRESH_TOKEN   refresh token from the one-time consent
 *   CPG_GMAIL_QUERY           (optional) Gmail search; default targets the
 *                             adjournment label + unread cancel/adjourn notices
 *   CPG_GMAIL_MARK_READ=1     (optional) mark processed messages read
 * Leave the Gmail vars unset to use the drop folder only (no email needed).
 */
import { readFileSync, writeFileSync, readdirSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const MEETINGS_FILE = join(HERE, 'SDCommunityPlanningGroups.json');
const OUT_FILE = join(HERE, 'cpg-adjournments.json');
const INBOX_DIR = join(HERE, 'cpg-adjournments-inbox'); // drop .eml/.txt notices here
const DRY = process.argv.includes('--dry');

// ── small helpers ───────────────────────────────────────────────────────────
const norm = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').replace(/\s+/g, ' ').trim();
const today = () => new Date().toISOString().slice(0, 10);

// CPG-boilerplate words carry no signal for telling groups apart.
const STOP = new Set(('community planning group board committee committees council association ' +
  'area precise subarea neighborhoods planners of the and san diego cpg cpc meeting public notice').split(' '));

// A few safe abbreviation aliases people actually use in notices.
const ALIASES = {
  'cpg-pacific-beach': ['pb'],
  'cpg-ocean-beach': ['ob'],
  'cpg-rancho-penasquitos': ['pq', 'rancho pq', 'rp'],
  'cpg-rancho-bernardo': ['rb'],
  'cpg-scripps-miramar-ranch': ['smrpg', 'scripps ranch'],
  'cpg-greater-golden-hill': ['golden hill'],
  'cpg-southeastern-san-diego': ['southeastern', 'sesd'],
};

// ── occurrence index from the real meetings data ─────────────────────────────
function buildIndex() {
  const raw = JSON.parse(readFileSync(MEETINGS_FILE, 'utf8'));
  const items = raw.items || raw;
  const slugs = new Set();          // every valid occurrence slug
  const series = new Map();         // seriesId -> { title, tokens:Set, dates:[{date,slug}] }
  for (const it of items) {
    if (!it.seriesId || !it.start) continue;
    const date = it.start.slice(0, 10);
    const slug = `${it.seriesId}-${date}`;
    slugs.add(slug);
    if (!series.has(it.seriesId)) {
      const tokens = new Set(norm(it.title).split(' ').filter((t) => t && !STOP.has(t)));
      for (const a of ALIASES[it.seriesId] || []) for (const t of norm(a).split(' ')) tokens.add(t);
      series.set(it.seriesId, { title: it.title, tokens, dates: [] });
    }
    series.get(it.seriesId).dates.push({ date, slug });
  }
  for (const s of series.values()) s.dates.sort((a, b) => a.date.localeCompare(b.date));
  return { slugs, series };
}

// ── notice parsing ────────────────────────────────────────────────────────────
function detectStatus(text) {
  const t = text.toLowerCase();
  if (/\b(reschedul|postpon|moved to|new date|new time)\b/.test(t)) return 'rescheduled';
  if (/\b(adjourn|no quorum|lack of (a )?quorum|failed to reach quorum)\b/.test(t)) return 'adjourned';
  if (/\b(cancel+ed|cancel+led|cancel|will not (meet|be held)|no meeting|not meeting|meeting is off)\b/.test(t)) return 'cancelled';
  return null;
}

const MONTHS = { jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, sept: 9, oct: 10, nov: 11, dec: 12 };

// Pull every (month, day, year?) the notice mentions. year optional -> snapped later.
function detectDates(text) {
  const out = [];
  const t = text.replace(/\s+/g, ' ');
  // ISO: 2026-09-14
  for (const m of t.matchAll(/\b(20\d{2})-(\d{1,2})-(\d{1,2})\b/g)) out.push({ y: +m[1], mo: +m[2], d: +m[3] });
  // Numeric: 9/14 or 9/14/2026 or 09-14-2026
  for (const m of t.matchAll(/\b(\d{1,2})[\/\-](\d{1,2})(?:[\/\-](\d{2,4}))?\b/g)) {
    const mo = +m[1], d = +m[2]; if (mo < 1 || mo > 12 || d < 1 || d > 31) continue;
    let y = m[3] ? +m[3] : null; if (y && y < 100) y += 2000;
    out.push({ y, mo, d });
  }
  // Worded: September 14, 2026 / Sept 14 / Sep. 14th
  const monthRe = new RegExp('\\b(' + Object.keys(MONTHS).join('|') + ')[a-z]*\\.?\\s+(\\d{1,2})(?:st|nd|rd|th)?(?:,?\\s*(20\\d{2}))?', 'gi');
  for (const m of t.matchAll(monthRe)) {
    const mo = MONTHS[m[1].toLowerCase().slice(0, m[1].toLowerCase().startsWith('sept') ? 4 : 3)];
    if (!mo) continue;
    out.push({ y: m[3] ? +m[3] : null, mo, d: +m[2] });
  }
  return out;
}

// Score each series by its distinctive tokens, weighting the SUBJECT far above
// the body: notices name the group in the subject, while every meeting's body
// carries the same City boilerplate ("confirm the agenda on the City website…"),
// which would otherwise leak generic tokens like "city" into the match.
function matchSeries(subject, body, series) {
  const subTok = new Set(norm(subject).split(' '));
  const bodyTok = new Set(norm(body).split(' '));
  let best = null, bestScore = 0, tie = false;
  for (const [id, s] of series) {
    let score = 0;
    for (const tk of s.tokens) { if (subTok.has(tk)) score += 5; else if (bodyTok.has(tk)) score += 1; }
    if (score > bestScore) { bestScore = score; best = id; tie = false; }
    else if (score === bestScore && score > 0) tie = true;
  }
  return { id: bestScore > 0 && !tie ? best : null, score: bestScore, tie };
}

// Resolve the parsed date hints to one real occurrence of the matched series.
function matchOccurrence(seriesInfo, dateHints) {
  const upcoming = seriesInfo.dates.filter((d) => d.date >= today());
  const pool = upcoming.length ? upcoming : seriesInfo.dates;
  if (dateHints.length) {
    for (const h of dateHints) {
      const hits = pool.filter((d) => {
        const [y, mo, da] = d.date.split('-').map(Number);
        return mo === h.mo && da === h.d && (!h.y || y === h.y);
      });
      if (hits.length === 1) return { slug: hits[0].slug, date: hits[0].date };
      if (hits.length > 1) return { ambiguous: `date ${h.mo}/${h.d} matches ${hits.length} occurrences` };
    }
    return { ambiguous: 'notice date does not match any scheduled occurrence in the built window' };
  }
  // No date given: only safe if the series has exactly one upcoming meeting.
  if (upcoming.length === 1) return { slug: upcoming[0].slug, date: upcoming[0].date };
  return { ambiguous: 'no date in notice and the group has multiple upcoming meetings' };
}

function parseNotice(subject, body, index, origin) {
  const text = `${subject}\n${body}`.trim();
  const status = detectStatus(text);
  const snippet = subject || body.slice(0, 120);
  if (!status) return { review: { reason: 'no cancel/adjourn/reschedule wording found', snippet, origin } };
  const m = matchSeries(subject, body, index.series);
  if (!m.id) return { review: { status, reason: m.tie ? 'group name ambiguous (tie)' : 'no group matched', snippet, origin } };
  const occ = matchOccurrence(index.series.get(m.id), detectDates(text));
  if (occ.ambiguous) return { review: { status, group: m.id, reason: occ.ambiguous, snippet, origin } };
  const note = status === 'rescheduled'
    ? (subject || 'Rescheduled — see notice').slice(0, 140)
    : (subject || '').slice(0, 140);
  return { entry: { slug: occ.slug, status, ...(note ? { note } : {}), source: 'email', origin, updated: today() } };
}

// ── ingestion: drop folder ────────────────────────────────────────────────────
function collectFromFolder() {
  if (!existsSync(INBOX_DIR)) return [];
  const notices = [];
  for (const f of readdirSync(INBOX_DIR)) {
    if (!/\.(eml|txt|md)$/i.test(f)) continue;
    if (/^readme\./i.test(f)) continue; // the folder's own docs, not a notice
    const raw = readFileSync(join(INBOX_DIR, f), 'utf8');
    // .eml: split headers/body on the first blank line; pull Subject.
    let subject = '', body = raw;
    const split = raw.indexOf('\n\n');
    if (/\.eml$/i.test(f) && split !== -1) {
      const headers = raw.slice(0, split);
      subject = (headers.match(/^Subject:\s*(.*)$/im) || [])[1] || '';
      body = raw.slice(split + 2);
    } else {
      subject = raw.split('\n')[0].slice(0, 160);
    }
    notices.push({ subject, body, origin: `folder:${f}` });
  }
  return notices;
}

// ── ingestion: Gmail API (zero-dep, via refresh token) ──────────────────────────
function decodeB64Url(s) { return Buffer.from(String(s).replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8'); }
function gmailPlain(payload) {
  const walk = (p) => {
    if (!p) return '';
    if (p.mimeType === 'text/plain' && p.body?.data) return decodeB64Url(p.body.data);
    for (const c of p.parts || []) { const t = walk(c); if (t) return t; }
    return '';
  };
  return walk(payload) || (payload?.body?.data ? decodeB64Url(payload.body.data) : '');
}

async function collectFromGmail() {
  const id = process.env.CPG_GMAIL_CLIENT_ID, secret = process.env.CPG_GMAIL_CLIENT_SECRET, refresh = process.env.CPG_GMAIL_REFRESH_TOKEN;
  if (!id || !secret || !refresh) return [];
  const tok = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ client_id: id, client_secret: secret, refresh_token: refresh, grant_type: 'refresh_token' }),
  }).then((r) => r.json());
  if (!tok.access_token) throw new Error(`Gmail token refresh failed: ${JSON.stringify(tok)}`);
  const auth = { Authorization: `Bearer ${tok.access_token}` };
  const q = process.env.CPG_GMAIL_QUERY
    || 'is:unread (subject:(cancel OR cancelled OR adjourn OR adjourned OR reschedul OR postpone) OR "no quorum")';
  const list = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=50&q=${encodeURIComponent(q)}`, { headers: auth }).then((r) => r.json());
  const notices = [];
  for (const { id: mid } of list.messages || []) {
    const msg = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${mid}?format=full`, { headers: auth }).then((r) => r.json());
    const subject = (msg.payload?.headers || []).find((h) => h.name.toLowerCase() === 'subject')?.value || '';
    notices.push({ subject, body: gmailPlain(msg.payload), origin: `gmail:${mid}`, mid });
    if (process.env.CPG_GMAIL_MARK_READ && !DRY) {
      await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${mid}/modify`, {
        method: 'POST', headers: { ...auth, 'Content-Type': 'application/json' },
        body: JSON.stringify({ removeLabelIds: ['UNREAD'] }),
      }).catch(() => {});
    }
  }
  return notices;
}

// ── run ──────────────────────────────────────────────────────────────────────
const index = buildIndex();
console.log(`CPG meetings indexed: ${index.series.size} groups, ${index.slugs.size} occurrences.`);

let notices = [];
try { notices = notices.concat(await collectFromGmail()); }
catch (e) { console.warn(`⚠️  Gmail skipped: ${e.message}`); }
notices = notices.concat(collectFromFolder());
console.log(`Notices to parse: ${notices.length}` + (notices.length ? '' : ' (none — Gmail unset and inbox empty)'));

const parsed = notices.map((n) => parseNotice(n.subject, n.body, index, n.origin));
const emailEntries = parsed.filter((p) => p.entry).map((p) => p.entry);
const review = parsed.filter((p) => p.review).map((p) => p.review);

// Merge with the existing file: hand-authored (source !== "email") entries are
// preserved and win over an email entry for the same slug.
let existing = { _meta: {}, adjournments: [] };
if (existsSync(OUT_FILE)) { try { existing = JSON.parse(readFileSync(OUT_FILE, 'utf8')); } catch (e) { console.warn(`⚠️  could not read ${OUT_FILE}: ${e.message}`); } }
const manual = (existing.adjournments || []).filter((a) => a.source !== 'email');
const manualSlugs = new Set(manual.map((a) => a.slug));
const emailKept = [];
for (const e of emailEntries) {
  if (manualSlugs.has(e.slug)) { review.push({ status: e.status, slug: e.slug, reason: 'superseded by a manual entry for the same meeting', origin: e.origin }); continue; }
  emailKept.push(e);
}
// de-dupe email entries by slug (last one wins)
const bySlug = new Map();
for (const e of emailKept) bySlug.set(e.slug, e);
const merged = [...manual, ...bySlug.values()].sort((a, b) => a.slug.localeCompare(b.slug));

// Flag entries that don't resolve to a real occurrence (e.g. meeting outside the
// built date window) — kept, but surfaced so a human can sanity-check.
const unknown = merged.filter((a) => !index.slugs.has(a.slug));
for (const u of unknown) console.warn(`⚠️  slug not in current meetings window: ${u.slug}`);

const out = {
  _meta: {
    updated: today(),
    note: 'Meetings adjourned/cancelled/rescheduled. Entries with source!="email" are hand-authored and preserved by fetch-cpg-adjournments.mjs; email entries are regenerated each run. Keyed by occurrence slug <seriesId>-YYYY-MM-DD (matches SDCommunityPlanningGroups.json).',
    ...(review.length ? { review } : {}),
  },
  adjournments: merged,
};

console.log(`\nResult: ${merged.length} adjournments (${manual.length} manual, ${bySlug.size} email). ${review.length} need review.`);
for (const r of review) console.log(`  • REVIEW [${r.status || '?'}] ${r.reason} — ${r.snippet || r.slug || ''} (${r.origin || ''})`);

if (DRY) { console.log('\n--dry: nothing written.'); }
else { writeFileSync(OUT_FILE, JSON.stringify(out, null, 2) + '\n'); console.log(`\n✅ wrote ${OUT_FILE}`); }
