/*
 * build-norcal-food-raw.mjs
 * Builds <County>Additions-raw.json (sites[] shape for prepare-food-additions.mjs)
 * for the hand-collected NorCal counties. Rows are pipe-delimited, 8 columns:
 *   Name | Street | City | ZIP | Phone | Schedule | URL | Source
 * (Source is kept for provenance but not emitted.) Schedules are parsed with the
 * same LA clause parser used for Alameda. Single start-times with no end range,
 * and "Monthly ... (date varies/call)" rows, carry no parseable time -> the site
 * routes to _deferred (vendor card with a schedule note), which is correct for
 * commodity sites whose monthly date is not a fixed nth-weekday.
 *
 * Amador is appended from research (AmadorRows below) once available.
 */
import { writeFileSync } from 'node:fs';

/* ===================== LA unified clause parser ===================== */
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
// Trailing (?![A-Za-z]) stops "Mon" matching inside "Monthly" (would become a bogus Monday).
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
const ELIG_RE = /resident|\blive\b|\bwork\b|study|\bage|senior|youth|only\b|visit|per month|register|appointment|\bID\b|client|60\+|55\+|student|pregnant|referral|pre-registration|child/i;
function toSchedules(rawSched) {
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

/* ===================== row -> site ===================== */
function parseBlock(dataText, colocated = new Set(), forceDefer = new Set()) {
  const sites = [];
  const flags = [];
  for (const line of dataText.split('\n').map((l) => l.trim())) {
    if (!line) continue;
    const [name, street = '', city = '', zip = '', phone = '', sched = '', url = ''] = line.split(/\s*\|\s*/);
    const hasStreetNo = /^\d+\s+\S/.test(street);
    let { schedules, eligibility, note } = toSchedules(sched);
    // Truly-monthly "date varies" sites whose only parse would be a weekly day -> defer instead.
    if (forceDefer.has(name)) { schedules = []; flags.push(`${name} — force-deferred (monthly, date varies; not a fixed weekday)`); }
    const address = `${street}, ${city}, CA${zip ? ' ' + zip : ''}`;
    sites.push({
      name, org: name, address, phone, eligibility,
      website: url, category: 'food-assistance', confidence: hasStreetNo ? 0.85 : 0.6,
      note: note || sched, schedules,
      ...(colocated.has(name) ? { allowColocated: true } : {}),
    });
    if (!schedules.length) flags.push(`${name} — no parseable time range -> deferred ("${sched}")`);
    if (!hasStreetNo) flags.push(`${name} — no street number, geocode may be city-level ("${street}")`);
  }
  return { sites, flags };
}

/* ===================== county data (pipe-delimited) ===================== */
const COUNTIES = {
  Alpine: {
    colocated: new Set(['First 5 Alpine']),
    rows: `
Alpine County Social Services Department | 75A Diamond Valley Rd | Markleeville | 96120 | (530) 694-2235 | By appointment, call ahead (office Mon-Fri 8am-5pm) |  | Google search (Alpine County site)
Woodfords Gym (Food Bank of Northern Nevada mobile site) | 25 Washo Blvd | Markleeville | 96120 | (775) 331-3663 | 2nd Tue 9-10am (Produce on Wheels, open to everyone) |  | Google search (Washoe Tribe / Food Bank of Northern Nevada)
First 5 Alpine | 75A Diamond Valley Rd | Markleeville | 96120 |  |  |  | Plentiful
`,
  },
  Butte: {
    colocated: new Set(),
    forceDefer: new Set([
      'Church of Jesus Christ LDS (NSFB drive-thru distribution)',
      'Southside Oroville Community Center (NSFB drive-thru distribution)',
    ]),
    rows: `
Bangor Community Church | 7419 Oro Bangor Hwy | Bangor | 95914 | (530) 712-2600 | Monthly commodity distribution 9-10am (date varies, call) |  | NSFB 2026 commodity schedule
Hope on the Hill Ministries | 1461 Bald Rock Rd | Berry Creek | 95916 | (530) 632-2191 | Tue 10am-5pm; monthly commodity distribution 3-6pm (date varies) |  | NSFB pantry partners list
Biggs United Methodist Church | 441 C St | Biggs | 95917 | (530) 868-5381 | Monthly commodity distribution 9-11am and 6-7pm (date varies, call) |  | NSFB 2026 commodity schedule
6th Street Center for Youth | 130 W 6th St | Chico | 95928 | (530) 894-8008 | Mon, Tue, Thu, Fri 10:30am-5:30pm; Wed 12-5:30pm (youth 14-24) |  | NSFB pantry partners list
Catholic Ladies Relief Society | 1386 Longfellow Ave | Chico | 95926 | (530) 895-8331 | Mon-Fri 9am-12pm (once a month per family) |  | Google search (Facebook)
Chico Gleaners (Fiveco Gleaners Food Bank) | 1436 Nord Ave, Unit D | Chico | 95926 | (530) 895-3006 | Tue 9-11am |  | Google search (FindHelp)
Chico Rescue Mission | 2612 Esplanade | Chico | 95973 | (530) 343-1935 | Tue 10am (food boxes) |  | Google search (Chico Rescue Mission site)
Christian Life Center | 1492 East Ave | Chico | 95926 | (530) 712-2600 | Monthly 9am-12pm (date varies, call) |  | Google search (Health Education Council list)
Church of Jesus Christ LDS (NSFB drive-thru distribution) | 735 W East Ave | Chico | 95926 | (530) 712-2600 | Monthly drive-thru, Fri 10am-12pm (Oct 16, 2026; date varies) | https://www.buttecaa.com/north-state-food-bank/distribution-calendar/ | NSFB October 2026 schedule
Faith Lutheran Church | 667 E 1st Ave | Chico | 95926 |  | 1st & 3rd Fri 3-5pm (verify) |  | Google search (uncited summary)
Free produce stand | 129 W 16th St | Chico | 95928 |  | Open 24/7 (self-serve produce sharing stand) |  | Google search (Butte County Local Food Network)
Hope Commons Food Pantry | 1184 East Ave | Chico | 95926 | (530) 342-1806 | Mon 4:30-5:30pm |  | NSFB pantry partners list
Iversen Wellness & Recovery Center | 492 Rio Lindo Ave | Chico | 95926 | (530) 879-3311 | 2nd & 4th Tue 11am-2pm |  | NSFB pantry partners list
Jesus Center | 1297 Park Ave | Chico | 95928 |  | Breakfast daily 7:30am; dinner Mon-Sat 3pm (may now be at 2255 Fair St; verify) |  | Google search (Jesus Center site)
Northern Valley Harm Reduction Coalition | 171 E 18th St | Chico | 95928 | (530) 332-8065 | Tue 12-2pm; Fri 10am-12pm |  | NSFB pantry partners list
Safe Space | 1909 Esplanade | Chico | 95926 | (530) 399-3187 | Mon-Fri 12-4pm (referral and appointment required) |  | NSFB pantry partners list
South Chico Community Assistance Center | 1805 Park Ave | Chico | 95928 | (530) 513-6884 | 2nd & 4th Sat 2-4pm |  | NSFB pantry partners list
Wildcat Food Pantry (CSU Chico) | W 2nd St & Hazel St | Chico | 95929 | (530) 898-4098 | Mon-Fri 10:30am-4:30pm (student ID required) |  | NSFB pantry partners list
Zion Community Christian Center | 895 Virginia St | Chico | 95928 | (530) 712-2600 | Monthly commodity distribution 10-11:30am (date varies, call) |  | NSFB 2026 commodity schedule
Grizzly Creek Christian Fellowship | 12140 La Porte Rd | Clipper Mills | 95930 | (530) 712-2600 | Monthly commodity distribution 9am-1pm (date varies, call) |  | NSFB 2026 commodity schedule
Cohasset Community Hall | 11 Maple Creek Ranch Rd | Cohasset | 95973 | (530) 332-9550 | 2nd Wed 11am-1pm |  | NSFB 2026 commodity schedule
Concow Pines Hardware | 11300 Miller Flat Rd | Concow | 95965 | (530) 712-2600 | Monthly commodity distribution 8:30-9:30am (date varies, call) |  | NSFB 2026 commodity schedule
I Am's Garden | 13420 Cirby Creek Rd | Concow | 95965 | (530) 828-7131 | Wed & Fri 10am-2pm (Wed is perishables and produce only) |  | NSFB pantry partners list
Feather Falls Quonset Hut | 1834 Lumpkin Rd | Feather Falls | 95940 | (530) 712-2600 | Monthly commodity distribution 10am-12pm (date varies, call) |  | NSFB 2026 commodity schedule
Forbestown Community Hall | 19100 New York Flat Rd | Forbestown | 95941 | (530) 712-2600 | Monthly commodity distribution 12-1pm (date varies, call) |  | NSFB 2026 commodity schedule
Forest Ranch Baptist Church | 4967 Schott Rd | Forest Ranch | 95942 | (530) 712-2600 | Monthly commodity distribution 11am-12pm (date varies, call) |  | NSFB 2026 commodity schedule
Christian Life Assembly of God | 1526 Humble Ave | Gridley | 95948 | (530) 846-2358 | Wed 10am-12pm (one bag per month) |  | Google search (Facebook)
Gridley United Methodist Church | 285 Magnolia St | Gridley | 95948 | (530) 846-2520 | Mon-Fri daytime (walk up; box given if food is available) |  | NSFB pantry partners list
NVCSS - Esperanza House | 630 Washington St | Gridley | 95948 | (530) 720-2255 | Tue 1-5pm; Wed 3-5pm; Thu 1-5pm (pregnant or caring for a child 0-17) |  | NSFB pantry partners list
St. Timothy's Episcopal Church | 410 Jackson St | Gridley | 95948 | (530) 712-2600 | Monthly commodity distribution 10:30-11:30am (date varies, call) |  | NSFB 2026 commodity schedule
Magalia Community Church | 13700 Skyway | Magalia | 95954 | (530) 877-7963 | Thu 11am-1:30pm; monthly commodity distribution 10am-2pm (date varies) |  | NSFB pantry partners list
Butte College Food Pantry (Roadrunner Hub) | 3536 Butte Campus Dr | Oroville | 95965 | (530) 895-2978 | Mon-Thu 8am-4:30pm; Fri 8-11:30am (student ID required) |  | NSFB pantry partners list
Father's House - Mount of Olives | 2833 Fort Wayne St | Oroville | 95965 | (530) 990-6271 | Fri 1-2pm (bring photo ID) |  | Google search (church website)
Feather River Senior Citizens Association Center | 1335 Myers St | Oroville | 95965 | (530) 533-8370 | Senior lunch Mon-Thu 12pm (small donation) |  | Google search
New Life Church | 965 Grand Ave | Oroville | 95965 | (530) 712-2600 | Monthly commodity distribution 7:30-9:30am (date varies, call) |  | NSFB 2026 commodity schedule
Oroville Hope Center | 2620 S 5th Ave | Oroville | 95965 | (530) 538-8398 | Tue-Fri from 9am; monthly commodity distribution 8:30-10:30am (date varies) |  | NSFB 2026 commodity schedule
Oroville Rescue Mission | 4250 Lincoln Blvd | Oroville | 95966 | (530) 533-9120 | Breakfast daily 6:45-7:30am; lunch 12-1pm |  | Google search (FindHelp)
Oroville Salvation Army | 1640 Washington Ave | Oroville | 95966 |  | Mon-Thu 10am-12pm and 1-3pm |  | Google search (Salvation Army site)
Oroville Seventh-Day Adventist Church | 1180 Robinson St | Oroville | 95966 | (530) 533-4461 | Tue 9-11am (last 3 Tuesdays of the month) |  | NSFB pantry partners list
Southside Oroville Community Center (NSFB drive-thru distribution) | 2959 Lower Wyandotte Rd | Oroville | 95966 | (530) 712-2600 | Monthly drive-thru, Fri 10am-12pm (Oct 9, 2026; date varies) | https://www.buttecaa.com/north-state-food-bank/distribution-calendar/ | NSFB October 2026 schedule
Palermo Baptist Church | 2290 Kenilworth Ave | Palermo | 95968 | (530) 533-8197 | 2nd & 4th Thu 11am-1pm |  | NSFB pantry partners list
Palermo Community Council | 2094 Palermo Rd | Palermo | 95968 | (530) 712-2600 | Monthly commodity distribution 8-9am (date varies, call) |  | NSFB 2026 commodity schedule
Blessing Basket Food Pantry | 5872 Oliver Rd | Paradise | 95969 | (530) 877-7006 | Tue & Fri 12-4pm; commodities 3rd Tue 10-11am |  | Google search (Paradise Recreation & Park District)
First Baptist Church of Paradise | 6500 Clark Rd | Paradise | 95969 | (530) 877-3532 | Fri 12-4pm; monthly commodity distribution 10-11:30am (date varies) |  | NSFB pantry partners list
First Christian Church | 5738 Pentz Rd | Paradise | 95969 |  | Sat 11am-2pm; monthly commodity distribution 11am-2pm (date varies) |  | NSFB pantry partners list
Paradise Alliance Church | 6491 Clark Rd | Paradise | 95969 | (530) 877-7069 | Community dinner Thu 5:30-6:30pm |  | Google search (FindHelp)
Stirling City Sheep Barn | 17131 Manzanita St | Stirling City | 95978 | (530) 712-2600 | Monthly commodity distribution 9-11am (date varies, call) |  | NSFB 2026 commodity schedule
`,
  },
  Calaveras: {
    colocated: new Set(),
    rows: `
First Baptist of Angels Camp | 1555 Depot Rd | Angels Camp | 95222 |  | 1st Thu 9-11am (commodities) |  | Google search (church website)
Seventh Day Adventist Church (Angels Camp) | 140 N Main St | Angels Camp | 95222 | (209) 736-0941 | Tue 10am-1pm |  | Food bank list (2018, verify)
Sierra Hope Food Pantry | 473 S Main St | Angels Camp | 95222 | (209) 736-6792 | Wed 1-3pm |  | Google search (Sierra HOPE website)
St. Patrick's Helping Hands | 820 S Main St | Angels Camp | 95222 | (209) 736-4575 | Mon 1-3pm |  | Google search (Facebook), matches 2018 list
Chapel in the Pines | 2286 Cedar Lane | Arnold | 95223 | (209) 795-1064 | Tue 10am-12pm |  | Google search (church website), matches 2018 list
Our Lady of the Sierra Helping Hands | 1301 Linebaugh Rd | Arnold | 95223 | (209) 794-7625 | Tue 9:30-10am |  | Food bank list (2018, verify)
Community Food Pantry (Lake Tulloch Bible Church) | 3566 Spangler Ln #3 | Copperopolis | 95228 | (209) 785-4302 | 3rd Sat 8:30-11am (2018 list said 3rd Thu 1-4pm; verify) |  | Google search (Yelp)
Copperopolis Armory (mobile pantry) |  | Copperopolis | 95228 | (209) 754-1257 | 1st Thu 9-11am |  | Google search (ADRC of the Mother Lode), matches 2018 list
Mokelumne Hill Church | 8085 Hwy 26, Suite 2B | Mokelumne Hill | 95245 | (209) 286-1165 | 3rd Thu 4-6pm |  | Food bank list (2018, verify)
Mountain Ranch Resource Center | 7867 Whiskey Slide Rd | Mountain Ranch | 95246 | (209) 754-4073 | 3rd Thu 9-11am |  | Food bank list (2018, verify)
Murphys Senior Center | 65 Mitchler St | Murphys | 95247 |  | Tue & Thu 11am-1pm; drive-thru pantry 4th Sat |  | Google search (Murphys Senior Center Facebook)
Rail Road Flat Elementary School (mobile pantry) | 298 Rail Road Flat Rd | Rail Road Flat | 95248 | (209) 754-1257 | Last Thu 10am-12pm |  | Google search (ADRC of the Mother Lode), matches 2018 list
Calaveras Senior Center | 956 Mountain Ranch Rd | San Andreas | 95249 | (209) 754-1257 | Commodities truck 1st Thu 9am (schedule varies) |  | Google search (Calaveras Senior Center)
San Andreas Community Covenant Church (free dinner) | 261 Treat Ave | San Andreas | 95249 | (209) 754-3881 | Wed 4:30-6pm |  | Columbia College food resources
Seventh Day Adventist Church (San Andreas) | 399 Mariposa St | San Andreas | 95249 | (530) 586-1366 | Fri 10am-1pm |  | Google search (church website)
The Resource Connection Food Bank | 206 George Reed Dr | San Andreas | 95249 | (209) 754-1257 | Mon, Tue, Wed, Fri 9am-4pm (closed 12-12:30pm; closed Thu) | https://trcac.org/the-food-bank-2/ | Resource Connection website
Community United Methodist Church | 135 Laurel St | Valley Springs | 95252 | (209) 772-2429 | 1st Fri 9-11am |  | Google search (church website)
Good Samaritan Community Covenant Church | 4684 Baldwin St | Valley Springs | 95252 | (209) 772-9548 | 2nd & 4th Sat 9-11am (free breakfast on the 4th) |  | Community resource list (2023)
Stone Corral Community Church | 9441 Hwy 26 | Valley Springs | 95252 | (209) 786-2448 | 3rd Wed 9am-12pm |  | Community resource list (2023)
Community Covenant Church | 22264 Hwy 26 | West Point | 95255 | (209) 293-4226 | Thu 11:30am-1pm (pantry and free lunch) |  | Google search (Facebook)
West Point Community Hall (mobile pantry) | 22283 Hwy 26 | West Point | 95255 | (209) 754-1257 | 2nd Wed 10am-12pm |  | Food bank list (2018, verify)
`,
  },
  Colusa: {
    colocated: new Set(),
    rows: `
Arbuckle Community Church | 700 Hillgate Rd | Arbuckle | 95912 | (530) 476-2777 | 2nd Tue 4-5:50pm | https://nvcfoodbank.org/locations/ | Google search (regional food bank listing)
Arbuckle Family Action Center | 812 King St | Arbuckle | 95912 | (530) 476-0822 | Mon-Fri 8:30am-4:30pm (emergency pantry); monthly drive-thru dates vary | https://nvcfoodbank.org/locations/ | Google search
Colusa Assembly of God | 1747 State Hwy 20 | Colusa | 95932 | (530) 458-2585 | 2nd Tue 12pm until supplies run out | https://nvcfoodbank.org/locations/ | Google search (regional food bank listing)
Colusa Senior Center (monthly commodity distribution) | 901 Parkhill St | Colusa | 95932 | (530) 458-0494 | Monthly 8:30-10:30am (call for date) |  | Colusa County Food Resources (Oct 2025)
Our Lady of Lourdes Catholic Church | 345 Oak St | Colusa | 95932 | (530) 458-4170 | Sat 9-11am | https://nvcfoodbank.org/locations/ | Google search (Yuba College resource list)
Maxwell Parks & Recreation District (monthly commodity distribution) | 64 Oak St | Maxwell | 95955 | (530) 501-6588 | Monthly 10am-12pm (call for date) |  | Colusa County Food Resources (Oct 2025)
Stonyford monthly commodity distribution | 179 Geary St | Stonyford | 95979 | (530) 963-3072 | Monthly 10:30am-12pm (call for date) |  | Colusa County Food Resources (Oct 2025)
Williams Old Gym (monthly commodity distribution and senior boxes) | 1491 E St | Williams | 95987 | (530) 473-0212 | Monthly 10-10:30am (call for date); senior boxes 60+ by pre-registration |  | Colusa County Food Resources (Oct 2025)
Woodland Community College - Colusa County Campus | 99 Ella St | Williams | 95987 | (530) 668-2500 | Mon-Thu 9am-5pm; Fri 9am-4:30pm (students only, pre-registration required) |  | Google search
`,
  },
  Amador: {
    colocated: new Set(['Breaking Bread (Breakfast Program)']),
    rows: `
Interfaith Food Bank of Amador County | 12181 Airport Road | Jackson | 95642 | (209) 267-9006 | Mon 12-4pm; Tue & Wed 11am-3pm; Thu 2-6pm (seniors 60+ first two weeks; EFAP recipients 3rd & 4th weeks) | https://feedamador.org/get-help/
St. Patrick's Pantry (Dinner Program) | 115 Court St | Jackson | 95642 | (209) 267-9006 | Thu 4-6pm (dinner) | https://feedamador.org/get-help/
Breaking Bread (Breakfast Program) | 115 Court St | Jackson | 95642 | (209) 267-9006 | Sat 9-11am (breakfast) | https://feedamador.org/get-help/
Upcountry Community Center | 19558 Highway 88 | Pine Grove | 95665 | (209) 267-9006 | Wed 1-3pm (seniors-only 2nd Wed; EFAP 4th Wed) | https://feedamador.org/get-help/
Evelyn Bishop Hall | 701 CA-124 | Ione | 95640 | (209) 267-9006 | Tue 1-3pm (seniors-only 2nd Tue; EFAP 4th Tue) | https://feedamador.org/get-help/
Plymouth City Hall | 9426 Main St | Plymouth | 95669 | (209) 267-9006 | 3rd Mon 9-11am (EFAP distribution) | https://feedamador.org/get-help/
River Pines Town Hall | Canyon Ave | River Pines | 95675 | (209) 245-6723 | 3rd Thu 11am-1pm (income-eligible, apply on-site) | https://www.rppud.org/interfaith-food-bank
Faith Lutheran Church of Pioneer Food Pantry | 22601 State Highway 88 | Pioneer | 95666 | (209) 295-4545 | Tue & Thu 9:30am-12pm (food; clothing and blankets Thu) | https://faithlutheranpioneer.org/give-or-receive-help
Seventh Day Adventist Church (Sutter Creek) | 12900 Ridge Road | Sutter Creek | 95685 |  | 1st & 3rd Mon 4-5:30pm (dinner) | https://www.findhelp.org/food/food-pantry--sutter-creek-ca
Amador County Senior Center | 229 New York Ranch Rd | Jackson | 95642 | (209) 223-0442 | Mon-Fri 11:30am-12:30pm (lunch; age 60+, suggested donation) | https://www.area12.org/programs/congregate-dining-jackson/
`,
  },
};

/* ===================== build ===================== */
for (const [county, { rows, colocated, forceDefer }] of Object.entries(COUNTIES)) {
  const { sites, flags } = parseBlock(rows, colocated, forceDefer);
  const withEvents = sites.filter((s) => s.schedules.length).length;
  const out = {
    _meta: {
      topic: `${county} County food distributions`,
      generated: '2026-10-11',
      source: 'Hand-collected list (North State Food Bank, Resource Connection, NVC Food Bank, county resource lists, Google). Schedules parsed via LA clause parser. lat/lng geocoded downstream.',
      note: 'Drop-in raw for prepare-food-additions.mjs. "Monthly (date varies/call)" and single start-times route to _deferred (vendor card, no event).',
    },
    sites,
  };
  writeFileSync(`./${county}Additions-raw.json`, JSON.stringify(out, null, 2));
  console.log(`\n=== ${county}: ${sites.length} sites | ${withEvents} with events | ${sites.length - withEvents} deferred ===`);
  if (flags.length) console.log(flags.map((f) => '  ' + f).join('\n'));
}
