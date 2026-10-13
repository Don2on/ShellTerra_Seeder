/*
 * food-schedule-lib.mjs — shared schedule parser + row->site builder for the
 * county food-distribution raw builders. Exports toSchedules() and parseBlock().
 * Rows are pipe-delimited, 8 columns (trailing cols optional):
 *   Name | Street | City | ZIP | Phone | Schedule | Website | Source
 * Schedule free-text is parsed with the LA unified clause parser (ranges,
 * multi-block times, word/digit ordinals, day-range expansion, meridiem
 * inference). Single start-times with no end range route to _deferred.
 */
const DART_ABBR = { 1: 'Mon', 2: 'Tue', 3: 'Wed', 4: 'Thu', 5: 'Fri', 6: 'Sat', 7: 'Sun' };
const ORD_LABEL = { 1: '1st', 2: '2nd', 3: '3rd', 4: '4th', 5: '5th', '-1': 'last' };
const ORD_WORD = { first: 1, second: 2, third: 3, fourth: 4, fifth: 5, last: -1 };
const ORD_DIGIT = { '1st': 1, '2nd': 2, '3rd': 3, '4th': 4, '5th': 5 };
const TIME_RANGE_RE = /(\d{1,2})(?::(\d{2}))?\s*(a\.?m\.?|p\.?m\.?)?\s*(?:-|–|—|to)\s*(\d{1,2})(?::(\d{2}))?\s*(a\.?m\.?|p\.?m\.?)?/gi;
const normMer = (m) => (!m ? null : /p/i.test(m) ? 'PM' : 'AM');
function to24(h, min, mer) { h = Number(h); min = Number(min || 0); if (mer === 'PM' && h !== 12) h += 12; if (mer === 'AM' && h === 12) h = 0; return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`; }
function parseTimeRangeAt(m) {
  let sMer = normMer(m[3]), eMer = normMer(m[6]);
  const sH = Number(m[1]), eH = Number(m[4]);
  if (!eMer && sMer) eMer = sMer;
  if (!sMer && eMer) { sMer = eMer; const o = (sMer === 'PM' && sH !== 12) ? sH + 12 : (sMer === 'AM' && sH === 12 ? 0 : sH); const c = (eMer === 'PM' && eH !== 12) ? eH + 12 : (eMer === 'AM' && eH === 12 ? 0 : eH); if (o >= c) sMer = 'AM'; }
  if (!sMer && !eMer) { sMer = 'AM'; eMer = 'PM'; }
  return { open: to24(m[1], m[2], sMer), close: to24(m[4], m[5], eMer) };
}
// Trailing (?![A-Za-z]) stops "Mon" matching inside "Monthly".
const DAY_TOKEN = /\b(sun(?:day)?|mon(?:day)?|tues?(?:day)?|wed(?:nesday|s)?|thur?s?(?:day)?|fri(?:day)?|sat(?:urday)?)s?\.?(?![A-Za-z])/gi;
function dayToDart(tok) { const t = tok.toLowerCase().replace(/s?\.?$/, ''); if (t.startsWith('sun')) return 7; if (t.startsWith('mon')) return 1; if (t.startsWith('tue')) return 2; if (t.startsWith('wed')) return 3; if (t.startsWith('thu')) return 4; if (t.startsWith('fri')) return 5; if (t.startsWith('sat')) return 6; return null; }
const ORD_TOKEN = /\b(1st|2nd|3rd|4th|5th|first|second|third|fourth|fifth|last)\b/gi;
const ordVal = (tok) => { const t = tok.toLowerCase(); return ORD_DIGIT[t] ?? ORD_WORD[t] ?? null; };
function parseClauses(text) {
  const toks = [];
  let m;
  ORD_TOKEN.lastIndex = 0; while ((m = ORD_TOKEN.exec(text)) !== null) toks.push({ t: 'ord', i: m.index, end: m.index + m[0].length, v: ordVal(m[1]) });
  DAY_TOKEN.lastIndex = 0; while ((m = DAY_TOKEN.exec(text)) !== null) { const d = dayToDart(m[0]); if (d) toks.push({ t: 'day', i: m.index, end: m.index + m[0].length, v: d }); }
  TIME_RANGE_RE.lastIndex = 0; while ((m = TIME_RANGE_RE.exec(text)) !== null) toks.push({ t: 'time', i: m.index, end: m.index + m[0].length, v: parseTimeRangeAt(m) });
  toks.sort((a, b) => a.i - b.i);
  const clauses = [];
  let cur = null, prev = null;
  const startClause = () => { cur = { ords: [], days: [], times: [], seq: [] }; clauses.push(cur); };
  for (const tk of toks) {
    if (tk.t === 'ord' || tk.t === 'day') {
      if (!cur || (prev && prev.t === 'time')) startClause();
      if (tk.t === 'ord') { cur.ords.push(tk.v); cur.seq.push({ t: 'ord', v: tk.v }); }
      else if (prev && prev.t === 'day' && /[-–—]|through|thru/i.test(text.slice(prev.end, tk.i))) {
        for (let d = prev.v; ; d = (d % 7) + 1) { if (!cur.days.includes(d)) cur.days.push(d); cur.seq.push({ t: 'day', v: d }); if (d === tk.v) break; }
      } else { cur.days.push(tk.v); cur.seq.push({ t: 'day', v: tk.v }); }
    } else { if (!cur) startClause(); cur.times.push(tk.v); }
    prev = tk;
  }
  return clauses.filter((c) => c.times.length && (c.days.length || c.ords.length));
}
function nthPatterns(seq) {
  const patterns = [];
  let ords = [], days = [], sawDay = false;
  const flush = () => { if (ords.length && days.length) for (const d of days) for (const n of ords) patterns.push({ n, dayOfWeek: d }); ords = []; days = []; sawDay = false; };
  for (const s of seq) { if (s.t === 'ord') { if (sawDay) flush(); ords.push(s.v); } else { days.push(s.v); sawDay = true; } }
  flush();
  const seen = new Set();
  return patterns.filter((p) => { const k = `${p.n}:${p.dayOfWeek}`; if (seen.has(k)) return false; seen.add(k); return true; });
}
const ELIG_RE = /resident|\blive\b|\bwork\b|study|\bage|senior|youth|only\b|visit|per month|register|appointment|\bID\b|client|60\+|55\+|student|pregnant|referral|pre-registration|child|eligibility|proof/i;

export function toSchedules(rawSched) {
  const parens = [];
  const stripped = String(rawSched).replace(/\(([^)]*)\)/g, (_, g) => { parens.push(g.trim()); return ' '; }).replace(/\s+/g, ' ').trim();
  const eligibility = parens.filter((p) => ELIG_RE.test(p)).join('; ');
  const note = parens.filter((p) => !ELIG_RE.test(p)).join('; ');
  const schedules = [];
  for (const c of parseClauses(stripped)) {
    if (c.ords.length && c.days.length) {
      const pats = nthPatterns(c.seq).map((p) => `${ORD_LABEL[p.n]} ${DART_ABBR[p.dayOfWeek]}`);
      const tm = c.times[0];
      if (pats.length) schedules.push({ freq: 'monthly', patterns: pats, open: tm.open, close: tm.close });
    } else if (c.days.length) {
      const days = [...new Set(c.days)].sort((a, b) => a - b).map((d) => DART_ABBR[d]);
      for (const tm of c.times) schedules.push({ freq: 'weekly', days, open: tm.open, close: tm.close });
    }
  }
  return { schedules, eligibility, note };
}

// Parse a pipe-delimited block into sites[]. Rows sharing a street#+ZIP with an
// earlier row in the same block are auto-flagged allowColocated so every program
// keeps its own pin (prepare-food-additions won't dedupe them away).
export function parseBlock(dataText, { colocated = new Set(), forceDefer = new Set() } = {}) {
  const sites = [];
  const flags = [];
  const seenKey = new Set();
  for (const line of dataText.split('\n').map((l) => l.trim())) {
    if (!line) continue;
    const [name, street = '', city = '', zip = '', phone = '', sched = '', url = ''] = line.split(/\s*\|\s*/);
    const hasStreetNo = /^\d+\s+\S/.test(street);
    let { schedules, eligibility, note } = toSchedules(sched);
    if (forceDefer.has(name)) { schedules = []; flags.push(`${name} — force-deferred (date varies; not a fixed weekday)`); }
    const stNo = (street.match(/^\s*(\d+)/) || [])[1] || '';
    const key = stNo && zip ? `${stNo}|${zip}` : '';
    const auto = key && seenKey.has(key);
    if (key) seenKey.add(key);
    const address = `${street}, ${city}, CA${zip ? ' ' + zip : ''}`;
    sites.push({
      name, org: name, address, phone, eligibility,
      website: url, category: 'food-assistance', confidence: hasStreetNo ? 0.85 : 0.6,
      note: note || sched, schedules,
      ...(colocated.has(name) || auto ? { allowColocated: true } : {}),
    });
    if (!schedules.length) flags.push(`${name} — no parseable time range -> deferred ("${sched}")`);
    if (!hasStreetNo) flags.push(`${name} — no street number, geocode may be city-level ("${street}")`);
  }
  return { sites, flags };
}
