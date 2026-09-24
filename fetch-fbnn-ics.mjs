// fetch-fbnn-ics.mjs — pull all FBNN Google Calendar ICS feeds, parse VEVENTs,
// split kids vs general, dedup into sites. Writes FBNN-sites-raw.json for review.
import { writeFileSync } from 'node:fs';
import https from 'node:https';

const CALS = [
  { id: 'asbs5m2ujq9b1hsn86nscmlal4', prog: 'Mobile Harvest',         kids: false },
  { id: 'b79b64b46vlkek7cu0vtc9qv3k', prog: 'Produce on Wheels',       kids: false },
  { id: '9vjldoefj0so2epm5l3dg998ek', prog: 'Food Pantries',           kids: false },
  { id: 'lae4bf2t417rcst82tv34pm71k', prog: 'Golden Groceries Pantry', kids: false },
  { id: 'ai6fklkfk551bcmv1kglporpbs', prog: 'Senior Box/CSFP',         kids: false },
  { id: 'b4tf23nmntu1cm4k6rcar82dp4', prog: 'Kids Cafe Summer Meals',  kids: true },
  { id: '6eq7tmeqvk3658i56vvrvethso', prog: 'Kids Cafe Free Meals',    kids: true },
];

const get = (url) => new Promise((res, rej) => {
  https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (r) => {
    let d = ''; r.on('data', (c) => d += c); r.on('end', () => res(d));
  }).on('error', rej);
});

// Unescape ICS TEXT values (RFC 5545): backslash-n, backslash-comma, etc.
function unesc(s) {
  return String(s || '')
    .replace(/\\n/gi, ' ')
    .replace(/\\,/g, ',')
    .replace(/\\;/g, ';')
    .replace(/\\\\/g, '\\')
    .replace(/\s+/g, ' ')
    .trim();
}

function icsDate(v) {
  const m = v.match(/(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})/);
  if (!m) return null;
  return { date: `${m[1]}-${m[2]}-${m[3]}`, time: `${m[4]}:${m[5]}`, utc: /Z$/.test(v) };
}

const all = [];
for (const cal of CALS) {
  const url = `https://calendar.google.com/calendar/ical/${cal.id}%40group.calendar.google.com/public/basic.ics`;
  const ics = (await get(url)).replace(/\r\n[ \t]/g, ''); // unfold folded lines
  for (const e of ics.split('BEGIN:VEVENT').slice(1)) {
    const summary = unesc((e.match(/\nSUMMARY:(.*)/) || [])[1]);
    if (!summary || /^CANCELLED/i.test(summary)) continue;
    const location = unesc((e.match(/\nLOCATION:(.*)/) || [])[1]);
    const rrule = (e.match(/\nRRULE:(.*)/) || [])[1]?.trim() || '';
    const dtRaw = (e.match(/\nDTSTART[^:]*:(.*)/) || [])[1]?.trim() || '';
    const dt = icsDate(dtRaw);
    // EXDATE lines (holiday skips) — may be several, each a comma list of datetimes.
    const exdates = [];
    for (const m of e.matchAll(/\nEXDATE[^:]*:(.*)/g)) {
      for (const one of m[1].split(',')) { const d = icsDate(one.trim()); if (d) exdates.push(d.date); }
    }
    all.push({ prog: cal.prog, kids: cal.kids, summary, location, rrule, date: dt?.date || '', time: dt?.time || '', exdates });
  }
}

// Keep recurring series (drop those whose UNTIL already passed) + future one-offs.
const TODAY = '2026-09-21';
const kept = all.filter((e) => {
  if (e.rrule) {
    const u = (e.rrule.match(/UNTIL=(\d{8})/) || [])[1];
    if (u && `${u.slice(0, 4)}-${u.slice(4, 6)}-${u.slice(6, 8)}` < TODAY) return false;
    return true;
  }
  return e.date && e.date >= TODAY;
});

// Strip the program prefix from the summary to get the site name.
const siteName = (s) => s.replace(/^(Mobile Harvest|Produce on Wheels|Pantry|Senior Box\/[A-Za-z]+|Kids Cafe[^:]*|Summer Meals|School Break Meals|Golden Groceries[^:]*)\s*:\s*/i, '').trim();

const sites = new Map();
for (const e of kept) {
  const name = siteName(e.summary);
  const key = (e.kids ? 'K|' : 'G|') + name.toLowerCase() + '|' + e.location.toLowerCase();
  if (!sites.has(key)) sites.set(key, { name, kids: e.kids, programs: new Set(), location: e.location, schedules: [] });
  const s = sites.get(key);
  s.programs.add(e.prog);
  s.schedules.push({ prog: e.prog, rrule: e.rrule, date: e.date, time: e.time, exdates: e.exdates || [] });
}
const out = [...sites.values()].map((s) => ({ ...s, programs: [...s.programs] }));
writeFileSync('./FBNN-sites-raw.json', JSON.stringify(out, null, 2));

const g = out.filter((s) => !s.kids), k = out.filter((s) => s.kids);
console.log(`parsed ${all.length} events -> ${kept.length} current -> ${out.length} unique sites`);
console.log(`  GENERAL: ${g.length} sites | KIDS: ${k.length} sites`);
console.log(`  general programs:`, [...new Set(g.flatMap((s) => s.programs))].join(', '));
console.log('\nsample GENERAL:');
g.slice(0, 8).forEach((s) => console.log(`  • ${s.name} [${s.programs.join(',')}] — ${s.location} (${s.schedules.length} sched; e.g. ${s.schedules[0].rrule || s.schedules[0].date} @${s.schedules[0].time})`));
console.log('\nsample KIDS:');
k.slice(0, 5).forEach((s) => console.log(`  • ${s.name} — ${s.location} (${s.schedules.length} sched; e.g. ${s.schedules[0].rrule || s.schedules[0].date} @${s.schedules[0].time})`));
