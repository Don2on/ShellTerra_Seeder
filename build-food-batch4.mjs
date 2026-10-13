/*
 * build-food-batch4.mjs — Mendocino, Merced, Modoc, Mono (user-curated lists).
 * Pipe-delimited rows: Name | Street | City | ZIP | Phone | Schedule | Website
 * Writes <County>Additions-raw.json for prepare-food-additions.mjs.
 */
import { writeFileSync } from 'node:fs';
import { parseBlock } from './food-schedule-lib.mjs';

const COUNTIES = {
  Mendocino: {
    rows: `
Albion Pop-Up | 3512 Albion Ridge Rd | Albion | 95410 | (707) 615-6654 | Mon 4-5pm | https://www.mendofood.org/find-food
Comptche Food Pantry (Chapel of the Redwoods) | 31201 Comptche Ukiah Rd | Comptche | 95427 |  | Mon 2-4pm | https://www.mendofood.org/find-food
Covelo Pop-Up | 24065 Riffe Rd | Covelo | 95428 | (707) 615-6654 | 2nd Thu 12-1pm | https://www.mendofood.org/find-food
Round Valley Food Bank | 24065 Riffe Rd | Covelo | 95428 | (707) 983-6262 | 3rd Fri 10am-2pm | https://www.mendofood.org/find-food
Fort Bragg Food Bank | 910 N Franklin St | Fort Bragg | 95437 | (707) 964-9404 | Seniors Mon, Wed, Fri 10-10:30am; all ages Mon 10:30am-4pm, Wed 10:30am-5:30pm, Fri 10:30am-4pm; curbside Tue 10am-12pm | https://www.mendofood.org/find-food
Mendocino Coast Hospitality House (meals) | 237 N. McPherson St | Fort Bragg | 95437 | (707) 961-0172 | Meals Mon-Fri 3pm; bag lunch Tue & Thu 10am-12pm | https://www.mendofood.org/find-food
Redwood Coast Senior Center (lunch) | 490 N Harold St | Fort Bragg | 95437 | (707) 964-0443 | Daily lunch 11:30am-12:30pm |
St. Vincent de Paul Bag Lunch | 255 S. Harold St | Fort Bragg | 95437 | (707) 964-8829 | Sun 12-1pm | https://www.mendofood.org/find-food
Trinity Lutheran Bag Lunch | 620 E Redwood Ave | Fort Bragg | 95437 | (707) 964-0681 | Mon 12-12:30pm | https://www.mendofood.org/find-food
Coastal Seniors Community Lunch (Gualala) | 47950 Center St | Gualala | 95445 | (707) 882-2137 | Tue 11:30am-1pm |
Gualala Food Bank (Gualala Baptist Church) | 37300 Church St | Gualala | 95445 | (707) 884-4330 | 2nd Wed 11am-12:30pm | https://www.mendofood.org/find-food
Laytonville Food Bank (Healthy Start) | 44400 Willis Ave | Laytonville | 95454 | (707) 984-8089 | 2nd Fri 1-4pm | https://www.mendofood.org/find-food
Laytonville Pop-Up | 300 Cahto Dr | Laytonville | 95454 | (707) 615-6654 | 4th Thu 12-1pm | https://www.mendofood.org/find-food
Leggett Food Pantry | 65100 Drive-Thru Tree Rd | Leggett | 95585 | (707) 354-3465 | 3rd Sat 10am-12:30pm | https://www.mendofood.org/find-food
Leggett Pop-Up | 65100 Drive-Thru Tree Rd | Leggett | 95585 | (707) 615-6654 | 1st Tue 12-1pm | https://www.mendofood.org/find-food
Mendocino Community Pantry (Mendocino Presbyterian Church) | 44831 Main St | Mendocino | 95460 | (707) 937-5441 | Tue 1:30-3pm | https://www.mendofood.org/find-food
Anderson Valley Food Bank (Philo Grange) | 9800 Hwy 128 | Philo | 95466 | (707) 357-7735 | 2nd & 4th Wed 2:30-5:30pm | https://www.mendofood.org/find-food
Coastal Seniors / Point Arena Food Bank (Veterans Hall) | 24000 S. Hwy 1 | Point Arena | 95468 | (707) 882-2137 | 2nd Tue 8:30-10:30am & 3-4pm | https://www.mendofood.org/find-food
Plowshares Peace and Justice Center (meals) | 1346 S. State St | Ukiah | 95482 | (707) 462-8582 | Mon-Fri lunch from 11:30am | https://www.mendofood.org/find-food
Ukiah Community Food Bank | 888 N State St | Ukiah | 95482 | (707) 463-2409 | Tue 9am-12pm; Wed 12-4pm; Thu 9am-2pm; Fri 12-4pm | https://www.mendofood.org/find-food
Ukiah Seventh Day Adventist | 200 Wabash Ave | Ukiah | 95482 | (707) 462-5455 | Thu 6-7pm | https://www.mendofood.org/find-food
United Disaster Relief of Northern California | 650 Babcock Ln | Ukiah | 95482 | (707) 489-3970 | Mon-Fri 10am-2pm | https://www.mendofood.org/find-food
Vision Family Resource Center | 102 Scott St | Ukiah | 95482 | (707) 467-3210 | Mon-Fri 10am-5pm | https://www.mendofood.org/find-food
Westport Choice Pantry | 37551 N. Shoreline Hwy | Westport | 95488 | (707) 972-3583 | 3rd Wed 6-8pm | https://www.mendofood.org/find-food
Nuestra Alianza De Willits | 291 School St | Willits | 95490 | (707) 456-9418 | Tue 9am-5:30pm | https://www.mendofood.org/find-food
Willits Community Services and Food Bank | 344 Railroad Ave | Willits | 95490 | (707) 459-3333 | Wed & Fri 11am-4:30pm | https://www.mendofood.org/find-food
Willits Daily Bread (meals) | 66 E Commercial St | Willits | 95490 | (707) 367-5669 | Mon-Thu 4:30-5:30pm | https://www.mendofood.org/find-food
Willits Pop-Up | 1250 Blosser Ln | Willits | 95490 | (707) 615-6654 | 1st Thu 10-11:30am | https://www.mendofood.org/find-food
Willits Senior Center (lunch) | 1501 Baechtel Rd | Willits | 95490 | (707) 459-6826 | Mon-Fri 11:45am-1pm | https://www.mendofood.org/find-food
Community Care Management Corp. | 301 S State St | Ukiah | 95482 | (707) 468-9347 |  | https://www.mendofood.org/find-food
Mendocino College (student pantry) | 1000 Hensley Creek Rd | Ukiah | 95482 | (707) 468-3000 |  | https://www.mendofood.org/find-food
South Ukiah Rotary (children's backpack program) | 115 S Orchard Ave | Ukiah | 95482 | (707) 674-7767 |  | https://www.mendofood.org/find-food
The Hunger Express (weekend sack lunches) |  | Ukiah | 95482 | (707) 972-3157 |  |
`,
  },
  Merced: {
    rows: `
Atwater Baptist Church | 2124 First St | Atwater | 95301 |  | 2nd Wed 9-11am | https://mmcfb.org/usda-commodities-site-list
Atwater Church of the Nazarene | 1374 Shaffer Rd | Atwater | 95301 | (209) 358-8110 | 1st Sat 12-1pm (call to confirm) | https://mmcfb.org/emergency-food-site-referral-list
Mt. Olive Baptist Church | 559 Broadway Ave | Atwater | 95301 | (209) 358-3031 | 2nd Wed 10-11am | https://mmcfb.org/emergency-food-site-referral-list
Delhi Community Presbyterian Church | 15917 El Capitan Way | Delhi | 95315 | (209) 427-2186 | Tue-Fri 10am-1pm; commodities last Wed 9-11am | https://mmcfb.org/emergency-food-site-referral-list
Carver Center | 21475 Reynolds Ave | Dos Palos | 93620 |  | 1st Mon 9-11am | https://mmcfb.org/usda-commodities-site-list
US Freedom Alliance | 8336 Christian Ave | Dos Palos | 93620 | (831) 905-7966 | Mon-Fri 9am-4pm | https://mmcfb.org/emergency-food-site-referral-list
El Nido Mobile Home Park | 10690 N Hwy 59 | El Nido | 95317 |  | 1st Wed 9-11am | https://mmcfb.org/usda-commodities-site-list
Gustine Veterans Memorial Hall | 145 5th St | Gustine | 95322 |  | Last Thu 9-11am | https://mmcfb.org/usda-commodities-site-list
Hilmar Covenant Church | 20056 American Ave | Hilmar | 95324 |  | 4th Tue 9-11am | https://mmcfb.org/usda-commodities-site-list
Le Grand Community Services | 13038 Jefferson St | Le Grand | 95333 |  | 2nd Mon 9-11am | https://mmcfb.org/usda-commodities-site-list
Emmanuel Baptist Church | 1310 Main St | Livingston | 95334 | (209) 398-7809 | 1st & 3rd Tue 9-11am | https://mmcfb.org/emergency-food-site-referral-list
Livingston VFW & Auxiliary | 1605 7th St | Livingston | 95334 |  | Last Wed 9-11am | https://mmcfb.org/usda-commodities-site-list
Bethel Community Church | 415 I St | Los Banos | 93635 | (209) 827-0797 | Drive-thru boxes and hot meals Tue 10am-12pm; brown bags Mon-Fri 9am-12pm | https://mmcfb.org/emergency-food-site-referral-list
New Beginnings Church | 821 L St | Los Banos | 93635 |  | 1st Wed 9-11am | https://mmcfb.org/usda-commodities-site-list
Apostolic Tabernacle | 2745 E. Hwy 140 | Merced | 95340 | (209) 723-0545 | Fri 12-1pm (call to confirm) | https://mmcfb.org/emergency-food-site-referral-list
Catholic Charities of Merced | 336 W. Main St | Merced | 95340 | (209) 383-2494 | Mon-Fri 9am-3pm (closed 12-1pm) | https://mmcfb.org/emergency-food-site-referral-list
Harvest Time | 1155 W 10th St | Merced | 95341 | (209) 564-7638 | 2nd & 4th Thu 8-10am; perishables Mon, Wed, Fri 8-9am | https://mmcfb.org/emergency-food-site-referral-list
McNamara Park | 11th St and Canal St | Merced | 95341 |  | 3rd Mon 9-11am | https://mmcfb.org/usda-commodities-site-list
Merced Bethel | 810 T St | Merced | 95341 | (209) 761-1529 | 3rd Mon 9-11am | https://mmcfb.org/usda-commodities-site-list
New Hope Church | 1207 E 21st St | Merced | 95340 | (209) 779-4034 | Last Sat 12-1pm | https://mmcfb.org/emergency-food-site-referral-list
Sacred Heart Church | 519 W 12th St | Merced | 95341 |  | 4th Wed 1-3pm | https://mmcfb.org/usda-commodities-site-list
Salvation Army - Merced | 1440 W. 12th St | Merced | 95341 | (209) 383-4225 | Mon, Tue, Thu, Fri 9-11:45am |
St. Patrick's Parish | 671 E Yosemite Ave | Merced | 95340 |  | 3rd Fri 1-3pm | https://mmcfb.org/usda-commodities-site-list
St. Vincent de Paul (sack lunches) | 131 W. Main St | Merced | 95340 | (209) 723-2404 | Mon, Wed, Fri 12-12:30pm | https://mmcfb.org/usda-site-list
United Methodist Church | 899 Yosemite Pkwy | Merced | 95340 | (209) 722-5777 | 1st & 3rd Thu 9am | https://mmcfb.org/emergency-food-site-referral-list
Planada Community Center | 9167 E Stanford Ave | Planada | 95365 |  | 2nd Mon 9-11am | https://mmcfb.org/usda-commodities-site-list
Santa Nella Mobile Home Park | 29190 Centinella Ave | Santa Nella | 95322 |  | 3rd Thu 9-11am | https://mmcfb.org/usda-commodities-site-list
Snelling Community Center | 3325 N Merced Falls Rd | Snelling | 95369 |  | 1st Thu 9-11am | https://mmcfb.org/usda-commodities-site-list
Iglesia de Cristo | 6061 N Winton Way | Winton | 95388 |  | Last Mon 9-11am | https://mmcfb.org/usda-commodities-site-list
`,
  },
  Modoc: {
    rows: `
Modoc Senior Center (T.E.A.C.H., Inc.) | 906 W. 4th St | Alturas | 96101 | (530) 233-5556 | Tue & Thu 9:15am-2:15pm; lunch at 12pm | https://www.teachinc.org
T.E.A.C.H., Inc. Emergency Food Bank | 112 E. 2nd St | Alturas | 96101 | (530) 233-3111 | Mon-Fri 8am-12pm & 1-5pm (office hours; food once a month per household) | https://www.teachinc.org
`,
  },
  Mono: {
    rows: `
Benton Community Center (IMACA distribution) | 58869 Hwy 120 | Benton | 93512 | (760) 873-8557 | Monthly 10-10:30am (date varies; intake form required) |
Bridgeport Community Center (mobile food drop) | 129 Emigrant St | Bridgeport | 93517 | (775) 331-3663 | Monthly 12:30-1pm (date varies) |
Chalfant Fire Department (IMACA distribution) | 215 Valley Rd | Chalfant Valley | 93514 | (760) 873-8557 | Monthly 11:30am-12pm (date varies) |
June Lake Community Center (IMACA distribution) | 90 W Granite Ave | June Lake | 93529 | (760) 873-8557 | Monthly 11:30am-12pm (date varies) |
Lee Vining Community Center (IMACA distribution) | 296 Mattly Ave | Lee Vining | 93541 | (760) 873-8557 | Monthly 10:30-11am (date varies) |
Mammoth Creek Park Community Recreation Center (mobile food drop) | Mammoth Creek Park | Mammoth Lakes | 93546 |  | Monthly 2-4pm (date varies) |
Salvation Army - Mammoth Lakes | 220 Sierra Manor Rd | Mammoth Lakes | 93546 | (760) 914-0245 | Mon & Fri 4-5:30pm (intake form required) |
Second Chance Thrift Store (non-perishable food) | 501 Old Mammoth Rd | Mammoth Lakes | 93546 | (760) 924-2474 | Daily 10am-5pm |
St. Joseph's Church (IMACA distribution) | 58 Ranch Rd | Mammoth Lakes | 93546 | (760) 873-8557 | Monthly 3-4pm (date varies) |
Walker Senior Center (mobile food drop) | 399 Mule Deer Rd | Walker | 96107 | (775) 331-3663 | Monthly 10-10:45am (date varies) |
`,
  },
};

for (const [county, { rows, forceDefer }] of Object.entries(COUNTIES)) {
  const { sites, flags } = parseBlock(rows, { forceDefer });
  const withEvents = sites.filter((s) => s.schedules.length).length;
  const out = {
    _meta: {
      topic: `${county} County food distributions`,
      generated: '2026-10-11',
      source: 'Hand-collected list (Mendo Food Network, Merced County Food Bank, T.E.A.C.H. Inc., IMACA/FBNN). Schedules parsed via LA clause parser. lat/lng geocoded downstream.',
      note: 'Drop-in raw for prepare-food-additions.mjs. "Monthly (date varies)" / "daily" / single start-times route to _deferred.',
    },
    sites,
  };
  writeFileSync(`./${county}Additions-raw.json`, JSON.stringify(out, null, 2));
  console.log(`\n=== ${county}: ${sites.length} sites | ${withEvents} with events | ${sites.length - withEvents} deferred ===`);
  if (flags.length) console.log(flags.map((f) => '  ' + f).join('\n'));
}
