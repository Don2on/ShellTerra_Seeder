/*
 * build-food-batch14.mjs — Kern (merge into existing raw), Kings (new), Lake (new).
 * Writes ./b14-<County>-raw.json. Kern rows get merged into KernAdditions-raw.json
 * (existing 38 first so overlaps keep the earlier data) then re-geocoded.
 */
import { writeFileSync } from 'node:fs';
import { parseBlock } from './food-schedule-lib.mjs';

function deferMonthly(rowsText) {
  const s = new Set();
  for (const line of rowsText.split('\n').map((l) => l.trim())) {
    if (!line) continue;
    const p = line.split(/\s*\|\s*/);
    if (/\bmonthly\b|twice a month/i.test(p[5] || '')) s.add(p[0]);
  }
  return s;
}

const CCFB = 'https://ccfoodbank.org/find-food/food-locator/';

const COUNTIES = {
  Kern: {
    rows: `
CAPK Food Bank - main pantry | 1807 Feliz Dr | Bakersfield | 93307 | (661) 398-4520 | Mon-Fri 8:30am-3:30pm | https://www.capk.org/food-bank/
Catholic Charities - Bakersfield | 825 Chester Ave | Bakersfield | 93301 | (661) 281-2130 | Mon-Fri 8:30am-12:15pm & 1-3:45pm |
First Congregational Church Food Pantry | 5 Real Rd | Bakersfield | 93309 |  | Wed 8:30-11:30am |
Golden Empire Gleaners | 1326 30th St Unit A | Bakersfield | 93301 | (661) 324-2767 | Mon-Fri 8am-2pm |
HOPE Center | 3311 Manor St | Bakersfield | 93308 | (661) 399-2119 | 2nd & 4th Wed 9am-12pm |
Salvation Army - Bakersfield | 4417 Wilson Rd | Bakersfield | 93309 | (661) 837-4243 | Mon-Thu 1-4pm |
St. Paul's Episcopal Church Pantry | 2216 17th St | Bakersfield | 93301 |  | Mon 10am-12pm |
Stay Focused Ministries | 1225 California Ave | Bakersfield | 93304 |  | Mon 9-11am; Wed 1-3pm; Fri 9-11am |
The Blessing Corner Outreach | 101 Union Ave | Bakersfield | 93307 | (661) 861-0349 | Tue & Fri 3-5pm |
The Mission at Kern County (meals) | 816 E 21st St | Bakersfield | 93305 | (661) 325-0863 | Daily breakfast 6-7am, lunch 11am-12pm, dinner 4:30-5:30pm |
Delano Community Connection Center | 1842 Norwalk St | Delano | 93215 | (661) 721-7036 | Mon-Thu 8am-3:30pm |
Salvation Army - Lake Isabella | 6069 Lake Isabella Blvd | Lake Isabella | 93240 | (760) 417-3056 | Mon 10am-4pm; Tue, Thu, Fri 9am-4pm |
McFarland Food Pantry (Care & Share) | 410 E Perkins Ave | McFarland | 93250 | (661) 792-1883 | Mon 3-6pm; 3rd Sat 9-10:30am | https://mcfarlandfoodpantry.org
Salvation Army - Ridgecrest | 151 N Downs St | Ridgecrest | 93555 | (760) 375-7219 | Tue & Fri 12:30-1:30pm |
New Hope Temple Food Pantry | 308 Harrison St | Taft | 93268 | (661) 765-4572 | Last two Tue of the month 8:30am | https://newhopetaft.com/food-bank
Taft NEEDS Center | 518 Main St | Taft | 93268 | (661) 763-4888 | Mon & Fri 9am-12pm |
Salvation Army - Tehachapi | 538 E Tehachapi Blvd | Tehachapi | 93561 | (661) 823-9508 | Mon, Tue, Thu, Fri 8am-12pm |
St. Malachy Church (St. Vincent de Paul) | 407 W E St | Tehachapi | 93561 | (661) 822-1920 | Wed & Fri 9:45-11:45am |
Free Will Baptist Church Food Pantry | 938 7th St | Wasco | 93280 | (661) 758-5906 | Sat 9am-12pm |
`,
  },
  Kings: {
    rows: `
Armona Mobile Pantry | 13701 Hood Ave | Armona | 93202 | (559) 237-3663 ext. 1108 | 1st Thu 10am-12pm | ${CCFB}
Kings County Commission on Aging - Neighborhood Market | 10953 14th St | Armona | 93202 | (559) 237-3663 | 1st Wed 10am-12:30pm | ${CCFB}
Avenal Rotary Club | 108 W. Kings St | Avenal | 93204 | 559-572-4430 | 4th Wed 10am-12pm | ${CCFB}
Casa De Dios Christian Fellowship | 1037 S. 7th Ave | Avenal | 93204 |  | 1st Fri 3-5pm | ${CCFB}
Iglesia Cristiana Siervos de Cristo | 849 Skyline Blvd | Avenal | 93204 |  | 3rd Mon 10am-12pm | ${CCFB}
Iglesia Cristiana Siervos de Cristo - Neighborhood Market | 849 Skyline Blvd | Avenal | 93204 | 559-816-5052 | 3rd Mon 9am-12pm | ${CCFB}
Iglesia Cristiana Siervos de Cristo Inc. - Pantry | 849 Skyline Blvd | Avenal | 93204 | 559-816-5052 | Mon, Wed, Fri 5-7pm by appointment | ${CCFB}
Valley Voices Avenal | 108 W Kings St | Avenal | 93204 |  | 2nd Fri 2-4pm | ${CCFB}
Corcoran Emergency Aid | 2607 W. Whitley Ave | Corcoran | 93212 | 559-992-2272 | 3rd Wed, Thu & Fri 8am-12pm | ${CCFB}
Fountain of Life Corcoran | 1725 Chittenden Ave | Corcoran | 93212 | (559) 237-3663 ext. 1138 | 3rd Tue 11:30am-1:30pm | ${CCFB}
Seventh Day Adventist - Corcoran | 1320 Norboe Ave | Corcoran | 93212 | 661-371-5452 | Last Thu 9:30am-12pm | ${CCFB}
COS Hanford | 925 13th Ave | Hanford | 93230 | 559-688-3060 | College of the Sequoias students only | ${CCFB}
Episcopal Church of the Saviour (meals) | 519 N. Douty St | Hanford | 93230 | 559-584-7706 | Mon-Sat 11:30am-12:30pm | ${CCFB}
Hanford House of Hope | 206 E. Ninth St | Hanford | 93230 | 559-470-1777 | 3rd Thu 11am-1pm | ${CCFB}
Mana Community Services | 311 W 3rd St | Hanford | 93230 | 559-572-1794 | 2nd Thu 10am-12pm | ${CCFB}
Mustard Seed Charities | 9615 Temple Dr | Hanford | 93230 |  | 1st Mon 9:30-11:30am | ${CCFB}
Seventh Day Adventist - Hanford | 900 N. Redington St | Hanford | 93230 |  | 2nd & 4th Tue 9am-12pm | ${CCFB}
St. Brigid Community Outreach | 115 W. 5th St | Hanford | 93230 |  | Mon, Wed, Fri 9am-12pm | ${CCFB}
The Kings Pantry - Koinonia | 12536 Hanford Armona Rd | Hanford | 93230 | 559-582-1528 | Wed & Fri 9am-12pm | ${CCFB}
The Salvation Army - Hanford | 380 E. Ivy St | Hanford | 93230 | 559-582-4434 | Mon-Thu 8:30-11:30am; breakfast Mon-Fri 7:30-8:30am | ${CCFB}
The Salvation Army - Hanford - Neighborhood Market | 380 E. Ivy St | Hanford | 93230 | (559) 237-3663 | 3rd Fri 9-11am | ${CCFB}
Casa De Dios Agua De Vida | 500 E. Bush Ave | Lemoore | 93245 |  | 1st Fri 2-4pm | ${CCFB}
Lemoore Christian Aid | 224 N. Lemoore Ave | Lemoore | 93245 | 559-924-2229 | Mon-Thu 9am-1pm | ${CCFB}
South Valley Community Church - Mobile Pantry | 1050 W. Bush St | Lemoore | 93245 | (559) 237-3663 ext. 1108 | 1st Mon 10am-12pm | ${CCFB}
West Hills College - Lemoore Campus - Mobile Pantry | 555 College Ave | Lemoore | 93245 | (559) 925-3704 | 3rd Mon 10am-12pm | ${CCFB}
Valley Voices Stratford | 19300 Empire St | Stratford | 93266 |  | 3rd Sat 10am-12pm | ${CCFB}
`,
  },
  Lake: {
    rows: `
Calvary Chapel of Clearlake | 14330 Memory Ln | Clearlake | 95422 | (707) 994-5683 | Tue & Thu 11:30am-12pm; Wed 4-6pm |
First Baptist Church of Clearlake | 14545 Robinson Ave | Clearlake | 95422 | (707) 994-5148 | Mon, Wed, Thu, Fri 9-11am |
Clearlake Oaks Community United Methodist Church | 12487 The Plaza | Clearlake Oaks | 95423 | (707) 998-9435 | Wed 5:30pm (soup kitchen meal) |
Lake County Helping Hand - Clearlake Oaks | 13300 CA-20 Suite O | Clearlake Oaks | 95423 | (707) 413-8973 | 2nd & 4th Mon 11:30am |
Little Red Schoolhouse (Clear Lake Gleaners) | 15780 Bottle Rock Rd | Cobb | 95426 | (707) 263-8082 | Monthly 8-10am (date varies) |
Clear Lake Gleaners - Finley Distribution Center | 1896 Big Valley Rd | Finley | 95435 | (707) 263-8082 | Emergency food Mon, Wed, Fri 8-11:30am; 3rd Thu 8-10am |
Clear Lake Gleaners at American Legion Hall | 5005 2nd St | Kelseyville | 95451 | (707) 263-8082 | 1st Wed 8-10am |
Kelseyville Presbyterian Church | 5340 3rd St | Kelseyville | 95451 | (707) 279-1104 | Twice a month Tue 3:30-5:30pm |
Lakeport Community Seventh-day Adventist Church | 1111 Park Way | Lakeport | 95453 | (707) 263-6002 | Wed 9:30-11am (drive-thru) |
United Christian Parish | 745 N Brush St | Lakeport | 95453 | (707) 263-4788 | Tue, Wed, Thu 10-11am |
Lucerne Alpine Senior Center | 3985 Country Club Dr | Lucerne | 95458 | (707) 274-8779 | Fri 10am-12pm; 1st Wed & 3rd Thu 8-10am |
Middletown Community United Methodist Church | 15833 Armstrong St | Middletown | 95461 | (707) 987-3379 | 3rd Wed 4-6pm |
Middletown Lions Club (Clear Lake Gleaners) | 15399 Central Park Rd | Middletown | 95461 | (707) 987-2862 | 1st Wed 8:30-11am |
`,
  },
};

for (const [county, { rows }] of Object.entries(COUNTIES)) {
  const { sites, flags } = parseBlock(rows, { forceDefer: deferMonthly(rows) });
  const withEvents = sites.filter((s) => s.schedules.length).length;
  writeFileSync(`./b14-${county}-raw.json`, JSON.stringify({ _meta: { topic: `${county} County food distributions`, generated: '2026-10-11' }, sites }, null, 2));
  console.log(`=== ${county}: ${sites.length} sites | ${withEvents} with events | ${sites.length - withEvents} deferred ===`);
}
