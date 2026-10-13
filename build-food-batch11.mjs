/*
 * build-food-batch11.mjs — Stanislaus, Sutter, Tehama (net-new).
 * Pipe-delimited: Name | Street | City | ZIP | Phone | Schedule | Website
 */
import { writeFileSync } from 'node:fs';
import { parseBlock } from './food-schedule-lib.mjs';

const COUNTIES = {
  Stanislaus: {
    rows: `
SDA Ceres Community Services Center | 1633 N Central Ave | Ceres | 95307 | 209-277-7125 | 1st & 3rd Thu 9am-11am |
St. Vincent De Paul - Ceres | 3824 Mitchell Rd | Ceres | 95307 | 209-872-3200 | Wed 3:30pm-4:30pm |
Valley Christian Center | 2745 2nd St | Ceres | 95307 |  | 1st & 3rd Tue 9am-11am |
Hickman Community Church | 854 I St | Hickman | 95323 | 209-874-1180 | 2nd & 4th Fri 10:30am-12pm |
Keyes Haven of Hope | 5450 7th St | Keyes | 95328 | 209-668-7721 | Thu 10am-11am (while supplies last) |
Big Valley Grace | 4040 Tully Rd | Modesto | 95356 | 209-577-1604 | Mon-Thu 8:30am-3:30pm (by appointment only) |
Christ Unity Baptist Church | 1320 L Street | Modesto | 95351 | 209-577-8112 | Mon, Thu 10am-1pm |
Davis Park Church of Christ | 901 W Rumble Road | Modesto | 95350 | 209-522-7226 | Mon, Wed, Fri 10:30am-11am and 1:30pm-2pm |
GAP Food Ministry of The Well Community Fellowship | 2500 Claus Rd | Modesto | 95355 | 209-551-4463 | 3rd Sun 8:30am-9:30am; 3rd Fri 10am-12pm |
Nineveh Outreach | 1601 Coffee Rd | Modesto | 95355 |  | Thu 7:30am-9am |
SDA Modesto Central | 1614 H Street | Modesto | 95354 | 209-521-6460 | Tue 10am-11:50am |
STJMOD Pantry | 1813 Oakdale Road | Modesto | 95355 | 209-477-2633 | Tue, Thu 9am-11am |
Support Life Foundation | 1445 N. Carpenter Rd | Modesto | 95351 | 209-650-8759 | Fri 11am-1pm |
Victory In Praise - Modesto (James Marshall Park) | 440 Sutter Ave | Modesto | 95351 | 209-522-1888 | 4th Sat 10am-12pm |
Oakdale Community Sharing Christian Center | 565 Center St | Oakdale | 95361 | 209-847-3401 | Tue 8am-11:30am |
SDA Patterson | 66 N. El Circulo | Patterson | 95363 | 209-912-9530 | 2nd & 4th Mon 9:30am-12:15pm |
St. Vincent De Paul - Riverbank | 2827 Topeka St | Riverbank | 95367 | 209-869-2996 | Mon, Thu 10am-12pm |
Neighborhood Church | 4942 Washington St | Salida | 95368 |  | 1st, 2nd & 3rd Tue 11am-12:30pm |
Enclave Community Church | 581 E Canal Dr | Turlock | 95380 | 209-667-5996 | Tue 1:30pm-2:30pm |
Pursuit of Truth | 900 Pioneer Ave | Turlock | 95380 | 209-416-1852 | 3rd Sat 10am-12pm |
Salvation Army - Turlock | 893 Lander Ave | Turlock | 95380 | 209-669-5366 | Mon 10am-12pm; Tue-Fri 9am-12pm; Mon-Fri 1pm-3:30pm |
United Samaritans | 220 S Broadway | Turlock | 95380 | 209-668-4853 | Last Tue and last Fri of month 9am-12pm |
`,
  },
  Sutter: {
    rows: `
First Baptist of Live Oak | 2480 Pennington Rd | Live Oak | 95953 | 530-695-2894 | Last Sun of month 1:15pm-2:30pm |
Meridian Community Church Food Closet | 1121 2nd St | Meridian | 95957 | 530-693-1026 | 3rd Wed 11am-12:30pm |
Be Xtra Community Center | 1251 E Onstott Rd | Yuba City | 95991 | 530-301-3867 | Mon-Fri 9am-4pm |
The Bride Church | 1321 Peachtree Ln | Yuba City | 95993 | 530-751-0505 | Wed 9am-11:30am |
Calvary Christian Center | 2620 Colusa Highway | Yuba City | 95993 | 530-673-6035 | 2nd & 4th Sat 12pm until food runs out |
Christian Assistance Network Food Pantry | 232 Teegarden Ave | Yuba City | 95991 | 530-671-7344 | Mon-Wed 1pm-3pm |
Church of Glad Tidings | 4444 Live Oak Blvd | Yuba City | 95991 | 530-671-3160 | Wed & Fri 9am-1pm |
Cornerstone of Hope Food Pantry | 700 Washington Ave | Yuba City | 95991 | 530-674-3087 | 2nd & 4th Sat 9am-11am |
Crossroads Community Church - Store House Ministry | 445 B Street | Yuba City | 95991 | 530-751-9168 | Tue-Thu 12:30pm-1:30pm |
First Lutheran Church | 850 Cooper Ave | Yuba City | 95991 | 530-673-8894 | Fri 10am; 2nd & 4th Wed 4:30pm (hot meals) |
Salvation Army Food Pantry | 401 Del Norte Ave | Yuba City | 95991 | 530-216-4530 | 3rd Fri 9am until food runs out |
St. Andrew Presbyterian - Mother Hubbard's Cupboard | 1390 Franklin Rd | Yuba City | 95993 | 530-673-7353 | Mon-Fri 1:15pm-3:15pm |
St. Vincent de Paul Food Locker | 222 Clark Ave | Yuba City | 95991 | 530-671-5154 | Tue-Thu 9:15am-11:15am |
`,
  },
  Tehama: {
    rows: `
Corning Christian Assistance | 710 4th Street | Corning | 96021 | 530-824-3866 | 1st, 3rd and 4th Mon 9am-11am |
Immaculate Conception Charity | 818 Solano St | Corning | 96021 |  | Wed 9am-11am |
Tehama County Gleaners (USDA commodities) | 20699 Walnut Street | Red Bluff | 96080 | (530) 529-2264 | 3rd Wed 8am-11am (call ahead) |
The Salvation Army Red Bluff | 940 Walnut Street | Red Bluff | 96080 | (530) 527-8530 | Mon-Fri 1pm-3pm |
`,
  },
};

for (const [county, { rows }] of Object.entries(COUNTIES)) {
  const { sites, flags } = parseBlock(rows, {});
  const withEvents = sites.filter((s) => s.schedules.length).length;
  const out = {
    _meta: {
      topic: `${county} County food distributions`,
      generated: '2026-10-11',
      source: 'Hand-collected list (Second Harvest of the Greater Valley / Vivery finder, Sutter County resource list, Tehama Together). Schedules parsed via LA clause parser.',
      note: 'Drop-in raw for prepare-food-additions.mjs. Single-time entries route to _deferred.',
    },
    sites,
  };
  writeFileSync(`./${county}Additions-raw.json`, JSON.stringify(out, null, 2));
  console.log(`\n=== ${county}: ${sites.length} sites | ${withEvents} with events | ${sites.length - withEvents} deferred ===`);
}
