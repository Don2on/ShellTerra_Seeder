#!/usr/bin/env node
/**
 * prepare-food-data-la.mjs — expand LA-pantries-raw.json (scraped from the
 * LA Regional Food Bank pantry locator) into the seeder input
 * LAFoodDistribution.json. Sibling of prepare-food-data-oc.mjs.
 *
 * KEY DIFFERENCE FROM OC: coordinates come straight from the food bank's own
 * store-locator records (lat/lng on every row), so there is NO geocoding step
 * and no city-centroid wrong-pin risk. The hard part here is instead the
 * free-text schedule, which the locator stashes in the `fax` field:
 *
 *   "Monday, Wednesday, Friday 9 AM-4 PM"        -> weekly, days {1,3,5}
 *   "Sunday 8:30-9:15 AM, 11:30 AM-12:30 PM"     -> weekly Sun, two time blocks
 *   "Tuesday 10-11 AM, Thursday 10 AM-12 PM, 2-5PM" -> Tue + Thu(two blocks)
 *   "2nd and 4th Saturday 10 AM-12 PM"           -> monthly nth-weekday
 *   "Third Tuesday 1-3 PM" / "Last Saturday ..."  -> monthly (word ordinals)
 *   "12/17 1-2 PM"                                -> one-off dated
 *   anything unparseable / "call ahead" / "except" -> deferred call-ahead card
 *
 * Times frequently carry a meridiem only on the range END ("1-3 PM", "10-11 AM"),
 * so parseTimeRange() infers the missing start meridiem.
 *
 * Writes LAFoodDistribution.json ({_meta,_deferred,items}) plus
 * la-schedule-review.txt — READ IT before seeding to eyeball how each site was
 * classified (weekly / monthly / oneoff / deferred / UNPARSED).
 *
 * USAGE: node prepare-food-data-la.mjs
 */
import { readFileSync, writeFileSync } from 'node:fs';

const IN  = './LA-pantries-raw.json';
const OUT = './LAFoodDistribution.json';
const REVIEW = './la-schedule-review.txt';
const SOURCE_ORG = 'Los Angeles Regional Food Bank';
const SOURCE_URL = 'https://www.lafoodbank.org/find-food/pantry-locator/';

/* ---------------- date anchors (same scheme as OC) ---------------- */
const ANCHOR = (() => {
  const now = new Date();
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); // Monday of this week
  return d;
})();
const fmtDate = (d) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
const PAST_ANCHOR = (() => { const d = new Date(ANCHOR); d.setDate(d.getDate()-7); return fmtDate(d); })();
const TODAY = new Date(); const TODAY0 = new Date(TODAY.getFullYear(), TODAY.getMonth(), TODAY.getDate());

// Dart weekday numbering: Mon=1 .. Sat=6, Sun=7.
const DART = { sunday: 7, monday: 1, tuesday: 2, wednesday: 3, thursday: 4, friday: 5, saturday: 6 };

/* ---------------- text cleanup ---------------- */
function decode(s) {
  return String(s || '')
    .replace(/&#8211;|&#8212;|&ndash;|&mdash;/gi, '-')
    .replace(/&#0?38;|&amp;/gi, '&')
    .replace(/&#8217;|&#8216;|&#0?39;|&rsquo;|&lsquo;/gi, "'")
    .replace(/&#8220;|&#8221;|&quot;/gi, '"')
    .replace(/&#0?46;/gi, '.')
    .replace(/\s+/g, ' ')
    .trim();
}

// Pull known service-note phrases out so they don't confuse schedule parsing.
const NOTE_RE = /;?\s*(baby diapers available|diapers available|snacks available|produce (only|available)|hot meals?|clothing available|by appointment only)\b\.?/gi;
function splitNotes(text) {
  const notes = [];
  const cleaned = text.replace(NOTE_RE, (m, g) => { notes.push(g.trim()); return ' '; }).replace(/\s+/g, ' ').trim();
  return { cleaned, notes };
}

/* ---------------- time parsing ---------------- */
const TIME_RANGE_RE = /(\d{1,2})(?::(\d{2}))?\s*(a\.?m\.?|p\.?m\.?)?\s*(?:-|–|—|to)\s*(\d{1,2})(?::(\d{2}))?\s*(a\.?m\.?|p\.?m\.?)?/gi;

function normMer(m) { if (!m) return null; return /p/i.test(m) ? 'PM' : 'AM'; }
function to24(h, min, mer) {
  h = Number(h); min = Number(min || 0);
  if (mer === 'PM' && h !== 12) h += 12;
  if (mer === 'AM' && h === 12) h = 0;
  return `${String(h).padStart(2,'0')}:${String(min).padStart(2,'0')}`;
}
// Returns {open, close} 24h, inferring missing meridiems, or null.
function parseTimeRangeAt(m) {
  let sMer = normMer(m[3]), eMer = normMer(m[6]);
  const sH = Number(m[1]), eH = Number(m[4]);
  if (!eMer && sMer) eMer = sMer;
  if (!sMer && eMer) {
    sMer = eMer;
    // "11-1 PM": start borrowed PM makes open>=close -> start is really AM.
    const openTest = (sMer === 'PM' && sH !== 12) ? sH + 12 : (sMer === 'AM' && sH === 12 ? 0 : sH);
    const closeTest = (eMer === 'PM' && eH !== 12) ? eH + 12 : (eMer === 'AM' && eH === 12 ? 0 : eH);
    if (openTest >= closeTest) sMer = 'AM';
  }
  if (!sMer && !eMer) { sMer = 'AM'; eMer = 'PM'; } // last resort, flagged elsewhere
  return { open: to24(m[1], m[2], sMer), close: to24(m[4], m[5], eMer) };
}
// First time range found anywhere in the text.
function firstTimeRange(text) {
  TIME_RANGE_RE.lastIndex = 0;
  const m = TIME_RANGE_RE.exec(text);
  return m ? parseTimeRangeAt(m) : null;
}

/* ---------------- ordinal / weekday helpers ---------------- */
const ORD_WORD = { first: 1, second: 2, third: 3, fourth: 4, fifth: 5, last: -1 };
const ORD_DIGIT = { '1st': 1, '2nd': 2, '3rd': 3, '4th': 4, '5th': 5 };
const ORD_RE = /\b(1st|2nd|3rd|4th|5th|first|second|third|fourth|fifth|last)\b/i;

/* ---------------- unified clause parser ---------------- */
// Weekday tokens: full names + abbreviations (optional trailing 's' and '.').
const DAY_TOKEN = /\b(sun(?:day)?|mon(?:day)?|tues?(?:day)?|wed(?:nesday|s)?|thur?s?(?:day)?|fri(?:day)?|sat(?:urday)?)s?\.?/gi;
function dayToDart(tok) {
  const t = tok.toLowerCase().replace(/s?\.?$/, '');
  if (t.startsWith('sun')) return 7;
  if (t.startsWith('mon')) return 1;
  if (t.startsWith('tue')) return 2;
  if (t.startsWith('wed')) return 3;
  if (t.startsWith('thu')) return 4;
  if (t.startsWith('fri')) return 5;
  if (t.startsWith('sat')) return 6;
  return null;
}
const ORD_TOKEN = /\b(1st|2nd|3rd|4th|5th|first|second|third|fourth|fifth|last)\b/gi;
function ordVal(tok) {
  const t = tok.toLowerCase();
  return ORD_DIGIT[t] ?? ORD_WORD[t] ?? null;
}

// Tokenize `text` into ordered ord/day/time tokens, then cut into clauses.
// A new clause begins at an ord or day token whose previous token was a time
// (i.e. the prior clause's schedule finished). Bare time tokens with no day in
// their clause attach to the previous clause's days (multi-block same day).
// Each clause -> { ords:[n], days:[dart], times:[{open,close}] }.
function parseClauses(text) {
  const toks = [];
  let m;
  ORD_TOKEN.lastIndex = 0;
  while ((m = ORD_TOKEN.exec(text)) !== null) toks.push({ t: 'ord', i: m.index, end: m.index + m[0].length, v: ordVal(m[1]) });
  DAY_TOKEN.lastIndex = 0;
  while ((m = DAY_TOKEN.exec(text)) !== null) { const d = dayToDart(m[0]); if (d) toks.push({ t: 'day', i: m.index, end: m.index + m[0].length, v: d }); }
  TIME_RANGE_RE.lastIndex = 0;
  while ((m = TIME_RANGE_RE.exec(text)) !== null) toks.push({ t: 'time', i: m.index, end: m.index + m[0].length, v: parseTimeRangeAt(m) });
  toks.sort((a, b) => a.i - b.i);

  const clauses = [];
  let cur = null;
  let prev = null;
  const startClause = () => { cur = { ords: [], days: [], times: [], seq: [] }; clauses.push(cur); };
  for (const tk of toks) {
    if (tk.t === 'ord' || tk.t === 'day') {
      if (!cur || (prev && prev.t === 'time')) startClause();
      if (tk.t === 'ord') { cur.ords.push(tk.v); cur.seq.push({ t: 'ord', v: tk.v }); }
      else {
        // day-range expansion when previous token was a day joined by '-'/through
        if (prev && prev.t === 'day' && /[-–—]|through|thru/i.test(text.slice(prev.end, tk.i))) {
          for (let d = prev.v; ; d = (d % 7) + 1) { if (!cur.days.includes(d)) cur.days.push(d); cur.seq.push({ t: 'day', v: d }); if (d === tk.v) break; }
        } else { cur.days.push(tk.v); cur.seq.push({ t: 'day', v: tk.v }); }
      }
    } else { // time
      if (!cur) startClause();
      cur.times.push(tk.v);
    }
    prev = tk;
  }
  return clauses.filter(c => c.times.length && (c.days.length || c.ords.length));
}

// From a clause's ordered ord/day sequence, produce {n,dayOfWeek} patterns.
// Groups are (run of ords)(run of days); within a group ords×days cross; across
// groups union. So "2nd, 4th Saturday" -> 2nd & 4th Sat, while the interleaved
// "2nd Tuesday, 4th Thursday" -> exactly 2nd Tue + 4th Thu (positional).
function nthPatterns(seq) {
  const patterns = [];
  let ords = [], days = [], sawDay = false;
  const flush = () => {
    if (ords.length && days.length) for (const d of days) for (const n of ords) patterns.push({ n, dayOfWeek: d });
    ords = []; days = []; sawDay = false;
  };
  for (const s of seq) {
    if (s.t === 'ord') { if (sawDay) flush(); ords.push(s.v); }
    else { days.push(s.v); sawDay = true; }
  }
  flush();
  // dedupe
  const seen = new Set();
  return patterns.filter(p => { const k = `${p.n}:${p.dayOfWeek}`; if (seen.has(k)) return false; seen.add(k); return true; });
}

function nextDateForDow(dow) {
  const jsDow = dow === 7 ? 0 : dow; // JS Sun=0..Sat=6
  const d = new Date(ANCHOR);
  d.setDate(d.getDate() + ((jsDow - d.getDay() + 7) % 7));
  return fmtDate(d);
}

/* ---------------- one-off dated (MM/DD) ---------------- */
function parseOneOff(text) {
  const m = text.match(/\b(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?\b/);
  if (!m) return null;
  const times = firstTimeRange(text);
  if (!times) return null;
  const mo = Number(m[1]), day = Number(m[2]);
  let yr = m[3] ? Number(m[3].length === 2 ? '20' + m[3] : m[3]) : TODAY0.getFullYear();
  let d = new Date(yr, mo - 1, day);
  if (!m[3] && d < TODAY0) d = new Date(yr + 1, mo - 1, day); // roll to next year if past
  return { date: fmtDate(d), ...times };
}

/* ---------------- address / description ---------------- */
function buildAddress(r) {
  const parts = [decode(r.address), decode(r.address2)].filter(Boolean);
  let line = parts.join(', ');
  const cityState = [decode(r.city), decode(r.state)].filter(Boolean).join(', ');
  const tail = [cityState, decode(r.zip)].filter(Boolean).join(' ');
  return [line, tail].filter(Boolean).join(', ');
}

function buildDescription(name, schedText, phone, notes) {
  const parts = [`Free food distribution at ${name}.`];
  if (schedText) parts.push(`Schedule: ${schedText}.`);
  if (notes.length) parts.push(`Also offered: ${notes.join(', ')}.`);
  parts.push(phone
    ? `Call ${phone} to confirm before you go — hours change with holidays and weather, and distributions often end early when supplies run out.`
    : 'Confirm hours before you go — distributions often end early when supplies run out.');
  parts.push(`Source: ${SOURCE_ORG} pantry locator.`);
  return parts.join(' ');
}

/* ---------------- main ---------------- */
const rows = JSON.parse(readFileSync(IN, 'utf8'));
const items = [];
const deferred = {};
const review = [];
const stats = { weekly: 0, monthly: 0, mixed: 0, oneoff: 0, deferred: 0, noCoords: 0, unparsed: 0 };
const HAS_DAY = /\b(sun|mon|tue|wed|thu|fri|sat)/i; // non-global: safe for .test()
const usedSlugs = new Set();

function uniqueSlug(base) {
  let s = base || 'site'; let i = 2;
  while (usedSlugs.has(s)) s = `${base}-${i++}`;
  usedSlugs.add(s);
  return s;
}
const slugify = (s) => decode(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60);

for (const r of rows) {
  const name = decode(r.store) || 'Food Pantry';
  const address = buildAddress(r);
  const phone = decode(r.phone);
  const lat = Number(r.lat), lng = Number(r.lng);
  const hasCoords = Number.isFinite(lat) && Number.isFinite(lng) && lat !== 0 && lng !== 0;
  const rawSched = decode(r.fax);
  const { cleaned, notes } = splitNotes(rawSched);
  const provKey = uniqueSlug(slugify(`${name}-${r.city}-${r.id}`));

  const description = buildDescription(name, rawSched, phone, notes);
  const base = {
    kind: 'activity', slug: provKey, seriesSlug: provKey,
    title: `${name} — Free Food Distribution`,
    description, locationName: name, address,
    lat: hasCoords ? lat : null, lng: hasCoords ? lng : null,
    category: 'food-assistance', sourceOrg: SOURCE_ORG, url: SOURCE_URL,
    schedulePattern: rawSched,
  };

  if (!hasCoords) { stats.noCoords++; review.push(`NO COORDS  ${name} | ${address}`); }

  const deferThis = (reason) => {
    stats.deferred++;
    deferred[provKey] = {
      title: name,
      status: `${rawSched || 'Call ahead for current days and hours.'}${phone ? ` Phone: ${phone}.` : ''}`,
      address, lat: base.lat, lng: base.lng, phone, eligibility: notes.join(', '), sourceUrl: SOURCE_URL,
    };
    review.push(`DEFERRED (${reason})  ${name} | "${rawSched}"`);
  };

  // --- routing ---
  if (!cleaned) { deferThis('no schedule'); continue; }
  // pure call-ahead text with no clock time at all
  if (/by appointment|by referral|\bappt\b|registration|enroll|please call|call for|\bvaries\b|contact|see website|\bclosed\b/i.test(cleaned)
      && !/\d\s*(a\.?m|p\.?m)/i.test(cleaned)) { deferThis('call-ahead text'); continue; }

  // one-off dated (MM/DD) — only when no weekday/ordinal recurrence present
  const oneoff = parseOneOff(cleaned);
  if (oneoff && !ORD_RE.test(cleaned) && !HAS_DAY.test(cleaned)) {
    if (oneoff.date < fmtDate(TODAY0)) { deferThis('past one-off'); continue; }
    items.push({ ...base, slug: uniqueSlug(`${provKey}-once`), start: `${oneoff.date}T${oneoff.open}`, end: `${oneoff.date}T${oneoff.close}` });
    stats.oneoff++;
    review.push(`ONEOFF ${oneoff.date} ${oneoff.open}-${oneoff.close}  ${name}`);
    continue;
  }

  // unified clause parse: each clause is weekly (days+times) or monthly (ords+days+times)
  const clauses = parseClauses(cleaned);
  const emitted = [];
  let sawWeekly = false, sawMonthly = false;
  for (const c of clauses) {
    if (c.ords.length && c.days.length) {
      // monthly: pair ordinals to days by their order in the clause
      const patterns = nthPatterns(c.seq);
      if (!patterns.length) continue;
      const t = c.times[0];
      const first = nextDateForDow(patterns[0].dayOfWeek);
      items.push({
        ...base, slug: uniqueSlug(`${provKey}-m${patterns.map(p=>p.n+''+p.dayOfWeek).join('')}-${t.open.replace(':','')}`),
        start: `${first}T${t.open}`, end: `${first}T${t.close}`,
        recurrence: { frequency: 'monthly', nthWeekdays: patterns },
        recurDays: patterns.map(p => `${p.n}:${p.dayOfWeek}`).join(','),
      });
      sawMonthly = true;
      emitted.push(`M ${patterns.map(p=>p.n+':'+p.dayOfWeek).join(',')} ${t.open}-${t.close}`);
    } else if (c.days.length) {
      // weekly: group this clause's time blocks by (open,close) across its days
      const byTime = {};
      for (const tm of c.times) { const k = `${tm.open}|${tm.close}`; (byTime[k] ??= { ...tm, dows: new Set() }); c.days.forEach(d => byTime[k].dows.add(d)); }
      for (const tt of Object.values(byTime)) {
        const days = [...tt.dows].sort((a, b) => a - b);
        items.push({
          ...base, slug: uniqueSlug(`${provKey}-w${days.join('')}-${tt.open.replace(':','')}-${tt.close.replace(':','')}`),
          start: `${PAST_ANCHOR}T${tt.open}`, end: `${PAST_ANCHOR}T${tt.close}`,
          recurrence: { frequency: 'weekly' }, recurDays: days.join(','),
        });
        sawWeekly = true;
        emitted.push(`W ${days.join('')} ${tt.open}-${tt.close}`);
      }
    }
  }

  if (emitted.length) {
    if (sawWeekly && !sawMonthly) stats.weekly++;
    else if (sawMonthly && !sawWeekly) stats.monthly++;
    else stats.mixed++;
    review.push(`${sawWeekly && sawMonthly ? 'MIXED ' : sawMonthly ? 'MONTHLY' : 'WEEKLY '} ${emitted.join(' | ')}  ${name}`);
    continue;
  }

  // fell through — nothing parseable
  stats.unparsed++;
  deferThis('UNPARSED');
}

const out = {
  _meta: {
    topic: 'Free food distributions — Los Angeles County',
    generated: fmtDate(ANCHOR),
    source: `${SOURCE_ORG} pantry locator (${SOURCE_URL})`,
    note: 'Generated by prepare-food-data-la.mjs from LA-pantries-raw.json. Coordinates are the food bank\'s own store-locator lat/lng (no geocoding). Weekly/monthly native recurrence, one rolling doc per pattern. Read la-schedule-review.txt before seeding.',
  },
  _deferred: deferred,
  items,
};
writeFileSync(OUT, JSON.stringify(out, null, 2));
writeFileSync(REVIEW, review.sort().join('\n') + '\n');

console.log(`wrote ${OUT}`);
console.log(`  ${items.length} activity docs from ${rows.length} sites`);
console.log(`  routing: ${stats.weekly} weekly, ${stats.monthly} monthly, ${stats.mixed} mixed, ${stats.oneoff} one-off, ${stats.deferred} deferred (${stats.unparsed} of them truly unparsed)`);
console.log(`  ${stats.noCoords} sites missing coordinates`);
console.log(`READ ${REVIEW} to spot-check classification before seeding.`);
