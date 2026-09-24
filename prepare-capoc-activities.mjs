#!/usr/bin/env node
/**
 * prepare-capoc-activities.mjs — expand the researched schedules of net-new OC
 * Food Bank (capoc) sites into seeder activity docs. Only the sites whose
 * schedule we could source (OC-capoc-scheduled-raw.json) are here; the rest are
 * intentionally dropped ("only add ones with activities").
 *
 * Coordinates are already known (from build-capoc-vendors.mjs geocoding), so
 * there's no geocoding here. The schedule text was researched into the same
 * weekly / nth-weekday style the LA locator uses, so this reuses the exact
 * clause parser from prepare-food-data-la.mjs.
 *
 * Writes OCFoodDistribution-capoc.json ({_meta,_deferred:{},items}) and
 * capoc-activities-review.txt.
 */
import { readFileSync, writeFileSync } from 'node:fs';

const IN = './OC-capoc-scheduled-raw.json';
const OUT = './OCFoodDistribution-capoc.json';
const REVIEW = './capoc-activities-review.txt';
const SOURCE_ORG = 'OC Food Bank (Community Action Partnership of Orange County)';

/* ---- anchors (same scheme as OC/LA) ---- */
const ANCHOR = (() => { const n = new Date(); const d = new Date(n.getFullYear(), n.getMonth(), n.getDate()); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return d; })();
const fmtDate = (d) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
const PAST_ANCHOR = (() => { const d = new Date(ANCHOR); d.setDate(d.getDate()-7); return fmtDate(d); })();
const DART = { sunday: 7, monday: 1, tuesday: 2, wednesday: 3, thursday: 4, friday: 5, saturday: 6 };

/* ---- time parsing (from prepare-food-data-la.mjs) ---- */
const TIME_RANGE_RE = /(\d{1,2})(?::(\d{2}))?\s*(a\.?m\.?|p\.?m\.?)?\s*(?:-|–|—|to)\s*(\d{1,2})(?::(\d{2}))?\s*(a\.?m\.?|p\.?m\.?)?/gi;
const normMer = (m) => !m ? null : /p/i.test(m) ? 'PM' : 'AM';
const to24 = (h, min, mer) => { h = Number(h); min = Number(min||0); if (mer==='PM'&&h!==12) h+=12; if (mer==='AM'&&h===12) h=0; return `${String(h).padStart(2,'0')}:${String(min).padStart(2,'0')}`; };
function parseTimeRangeAt(m) {
  let sMer = normMer(m[3]), eMer = normMer(m[6]);
  const sH = Number(m[1]), eH = Number(m[4]);
  if (!eMer && sMer) eMer = sMer;
  if (!sMer && eMer) { sMer = eMer; const o=(sMer==='PM'&&sH!==12)?sH+12:(sMer==='AM'&&sH===12?0:sH); const c=(eMer==='PM'&&eH!==12)?eH+12:(eMer==='AM'&&eH===12?0:eH); if (o>=c) sMer='AM'; }
  if (!sMer && !eMer) { sMer='AM'; eMer='PM'; }
  return { open: to24(m[1], m[2], sMer), close: to24(m[4], m[5], eMer) };
}
const ORD_DIGIT = { '1st':1,'2nd':2,'3rd':3,'4th':4,'5th':5 };
const ORD_WORD = { first:1, second:2, third:3, fourth:4, fifth:5, last:-1 };
const ORD_TOKEN = /\b(1st|2nd|3rd|4th|5th|first|second|third|fourth|fifth|last)\b/gi;
const ordVal = (t) => ORD_DIGIT[t.toLowerCase()] ?? ORD_WORD[t.toLowerCase()] ?? null;
const DAY_TOKEN = /\b(sun(?:day)?|mon(?:day)?|tues?(?:day)?|wed(?:nesday|s)?|thur?s?(?:day)?|fri(?:day)?|sat(?:urday)?)s?\.?/gi;
function dayToDart(tok) { const t = tok.toLowerCase().replace(/s?\.?$/, ''); if (t.startsWith('sun'))return 7; if (t.startsWith('mon'))return 1; if (t.startsWith('tue'))return 2; if (t.startsWith('wed'))return 3; if (t.startsWith('thu'))return 4; if (t.startsWith('fri'))return 5; if (t.startsWith('sat'))return 6; return null; }

function parseClauses(text) {
  const toks = []; let m;
  ORD_TOKEN.lastIndex = 0; while ((m = ORD_TOKEN.exec(text))) toks.push({ t:'ord', i:m.index, end:m.index+m[0].length, v:ordVal(m[1]) });
  DAY_TOKEN.lastIndex = 0; while ((m = DAY_TOKEN.exec(text))) { const d = dayToDart(m[0]); if (d) toks.push({ t:'day', i:m.index, end:m.index+m[0].length, v:d }); }
  TIME_RANGE_RE.lastIndex = 0; while ((m = TIME_RANGE_RE.exec(text))) toks.push({ t:'time', i:m.index, end:m.index+m[0].length, v:parseTimeRangeAt(m) });
  toks.sort((a, b) => a.i - b.i);
  const clauses = []; let cur = null, prev = null;
  const start = () => { cur = { ords:[], days:[], times:[], seq:[] }; clauses.push(cur); };
  for (const tk of toks) {
    if (tk.t === 'ord' || tk.t === 'day') {
      if (!cur || (prev && prev.t === 'time')) start();
      if (tk.t === 'ord') { cur.ords.push(tk.v); cur.seq.push({ t:'ord', v:tk.v }); }
      else if (prev && prev.t === 'day' && /[-–—]|through|thru/i.test(text.slice(prev.end, tk.i))) {
        for (let d = prev.v; ; d = (d % 7) + 1) { if (!cur.days.includes(d)) cur.days.push(d); cur.seq.push({ t:'day', v:d }); if (d === tk.v) break; }
      } else { cur.days.push(tk.v); cur.seq.push({ t:'day', v:tk.v }); }
    } else { if (!cur) start(); cur.times.push(tk.v); }
    prev = tk;
  }
  return clauses.filter(c => c.times.length && (c.days.length || c.ords.length));
}
function nthPatterns(seq) {
  const patterns = []; let ords = [], days = [], sawDay = false;
  const flush = () => { if (ords.length && days.length) for (const d of days) for (const n of ords) patterns.push({ n, dayOfWeek: d }); ords = []; days = []; sawDay = false; };
  for (const s of seq) { if (s.t === 'ord') { if (sawDay) flush(); ords.push(s.v); } else { days.push(s.v); sawDay = true; } }
  flush();
  const seen = new Set();
  return patterns.filter(p => { const k = `${p.n}:${p.dayOfWeek}`; if (seen.has(k)) return false; seen.add(k); return true; });
}
function nextDateForDow(dow) { const js = dow === 7 ? 0 : dow; const d = new Date(ANCHOR); d.setDate(d.getDate() + ((js - d.getDay() + 7) % 7)); return fmtDate(d); }

/* ---- build ---- */
const rows = JSON.parse(readFileSync(IN, 'utf8'));
const items = [];
const review = [];
const used = new Set();
const uslug = (b) => { let s = b, i = 2; while (used.has(s)) s = `${b}-${i++}`; used.add(s); return s; };
const slugify = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 55);

for (const r of rows) {
  const provKey = uslug(slugify(`${r.name}-${r.city}`));
  const desc = `Free food distribution at ${r.name} (OC Food Bank partner). Schedule: ${r.scheduleText}.${r.notes ? ` ${r.notes}.` : ''} Call ${r.phone || '2-1-1'} to confirm before you go — distributions often end early when supplies run out. Source: ${r.sourceUrl || 'capoc.org'}.`;
  const base = {
    kind: 'activity', slug: provKey, seriesSlug: provKey,
    title: `${r.name} — Free Food Distribution`, description: desc,
    locationName: r.name, address: r.address, lat: r.lat, lng: r.lng,
    category: 'food-assistance', sourceOrg: SOURCE_ORG, url: r.sourceUrl || 'https://www.capoc.org/distribution-partners/',
    schedulePattern: r.scheduleText,
  };
  const clauses = parseClauses(r.scheduleText);
  const emitted = [];
  for (const c of clauses) {
    if (c.ords.length && c.days.length) {
      const patterns = nthPatterns(c.seq); if (!patterns.length) continue;
      const t = c.times[0]; const first = nextDateForDow(patterns[0].dayOfWeek);
      items.push({ ...base, slug: uslug(`${provKey}-m${patterns.map(p=>p.n+''+p.dayOfWeek).join('')}-${t.open.replace(':','')}`), start: `${first}T${t.open}`, end: `${first}T${t.close}`, recurrence: { frequency:'monthly', nthWeekdays:patterns }, recurDays: patterns.map(p=>`${p.n}:${p.dayOfWeek}`).join(',') });
      emitted.push(`M ${patterns.map(p=>p.n+':'+p.dayOfWeek).join(',')} ${t.open}-${t.close}`);
    } else if (c.days.length) {
      const byTime = {};
      for (const tm of c.times) { const k = `${tm.open}|${tm.close}`; (byTime[k] ??= { ...tm, dows:new Set() }); c.days.forEach(d=>byTime[k].dows.add(d)); }
      for (const tt of Object.values(byTime)) {
        const days = [...tt.dows].sort((a,b)=>a-b);
        items.push({ ...base, slug: uslug(`${provKey}-w${days.join('')}-${tt.open.replace(':','')}-${tt.close.replace(':','')}`), start: `${PAST_ANCHOR}T${tt.open}`, end: `${PAST_ANCHOR}T${tt.close}`, recurrence: { frequency:'weekly' }, recurDays: days.join(',') });
        emitted.push(`W ${days.join('')} ${tt.open}-${tt.close}`);
      }
    }
  }
  if (emitted.length) review.push(`OK   ${r.name} [${r.confidence}]  ${emitted.join(' | ')}  <- "${r.scheduleText}"`);
  else review.push(`SKIP ${r.name}  UNPARSED "${r.scheduleText}"`);
}

const out = {
  _meta: { topic: 'Free food distributions — OC Food Bank partners (net-new)', generated: fmtDate(ANCHOR), source: `${SOURCE_ORG}; schedules researched per-site (see capoc-activities-review.txt)`, note: 'Net-new capoc sites with a sourced schedule only. Coordinates from prior Mapbox geocode. Seed additively (--create-only) into FoodDistributionOC.' },
  _deferred: {}, items,
};
writeFileSync(OUT, JSON.stringify(out, null, 2));
writeFileSync(REVIEW, review.sort().join('\n') + '\n');
console.log(`wrote ${OUT}: ${items.length} activity docs from ${rows.length} scheduled sites`);
const unp = review.filter(r=>r.startsWith('SKIP')).length;
if (unp) console.log(`  WARNING: ${unp} site(s) had an unparseable schedule — see ${REVIEW}`);
console.log(`READ ${REVIEW}`);
