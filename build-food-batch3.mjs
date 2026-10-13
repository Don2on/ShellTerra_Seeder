/*
 * build-food-batch3.mjs — Lassen, Madera, Marin, Mariposa (user-curated lists).
 * Pipe-delimited rows: Name | Street | City | ZIP | Phone | Schedule | Website
 * Writes <County>Additions-raw.json for prepare-food-additions.mjs.
 */
import { writeFileSync } from 'node:fs';
import { parseBlock } from './food-schedule-lib.mjs';

const COUNTIES = {
  Lassen: {
    rows: `
Big Valley 50 Plus (Bieber Veterans Hall) | 470 Bridge St | Bieber | 96009 | (530) 292-7151 | Senior meals Tue-Thu 11am-2pm; monthly food distribution Thu 11:30am |
Fort Sage Family Resource Center | 457-440 Sierra Dr | Herlong | 96113 |  | 1st & 3rd Fri 9-11am & 4-6pm; 2nd & 4th Wed 9am-6pm (photo ID) |
Freedom Church Ministries | 170 David S Hall | Herlong | 96113 |  | Mon 1:30-3pm; two Saturdays a month 9am-12pm |
God Cares Food Pantry | 464-905 Standish Buntingville Rd | Janesville | 96114 | (530) 310-1733 | Thu 2-5pm |
Milford Food Pantry | 450-075 Milford Grade Rd | Milford | 96121 | (530) 260-1115 | 2nd & 4th Thu 9am (drive-through) |
Crossroads Ministries | 2410 Main St | Susanville | 96130 | (530) 251-0701 | Food distribution Mon-Fri 9-11:30am; breakfast 7:30am and lunch 12pm Mon-Fri; dinner Sat 6-8pm |
HOPE Food Pantry (Susanville United Methodist) | 60 S Lassen St | Susanville | 96130 | (530) 249-5839 | Fri 3-6pm |
Lassen Family Services | 1306 Riverside Dr | Susanville | 96130 | (530) 257-5004 | By appointment Mon, Wed, Fri 8am-5pm |
Salvation Army - Susanville | 1560 Main St | Susanville | 96130 | (530) 257-0314 | Grab-n-go Mon-Fri 9am-12pm; main distribution 2nd & 4th Fri 12:30-4pm (get a number first) |
Westwood Family Resource Center | 125 Birch St | Westwood | 96137 | (530) 588-8282 | 2nd & 4th Fri 1-4pm (photo ID) |
Lassen Indian Health Center (tribal food distribution) | 795 Joaquin St | Susanville | 96130 | (530) 257-2542 | Third week of the month, no time listed |
`,
  },
  Madera: {
    rows: `
Cornerstone Community Church | 208 Fig Tree Rd | Chowchilla | 93610 | (559) 665-1182 | 1st Thu 3:30pm | https://ccchowchilla.com/food-distribution
Iglesia Cristiana Emmanuel | 607 Trinity Ave | Chowchilla | 93610 |  | 1st Thu 3-5pm |
Shepherd's Temple | 16283 Ave 24 1/2 | Chowchilla | 93610 | (559) 665-1076 | 1st Fri 9-11am |
Coarsegold Historic Village | 35300 CA-41 | Coarsegold | 93614 |  | 3rd Tue 9am-12pm | https://ccfoodbank.org/find-food/food-locator/
Adult Day Health Care Center of Madera | 629 E Yosemite Ave | Madera | 93638 | 559-479-4111 | 2nd Wed 3-5pm | https://ccfoodbank.org/find-food/food-locator/
Casas De La Vina (Self-Help Enterprises) | 23784 Ave 9 | Madera | 93637 | (559) 517-8076 | Last Tue 2-4pm |
Celebration Nation Madera | 27243 Ellis St | Madera | 93638 |  | 1st Thu 10am-12pm | https://ccfoodbank.org/find-food/food-locator/
Central Valley Church - Madera | 1201 E. Yosemite Ave | Madera | 93638 | (559) 237-3663 ext. 1108 | 2nd Wed 9-11am | https://ccfoodbank.org/find-food/food-locator/
Clearview Outreach Church | 331 S. D St | Madera | 93637 | (559) 237-3663 ext. 1108 | 4th Mon 10am-12pm | https://ccfoodbank.org/find-food/food-locator/
Holy Family Table (daily meal) | 224 N C St | Madera | 93638 | (559) 673-3290 | Daily 8-9:15am (eat on site) |
Latinos Madera Club | 28789 Azalea Ave | Madera | 93638 | (559) 395-3733 | Last Thu 9-11am |
Maddie's Food Pantry (Madera Community College) | 30277 Ave 12 | Madera | 93638 | (559) 675-4171 | Mon-Thu 9am-3pm; Fri 9am-2pm (students only) |
Madera Bible Church (drive-up food share) | 124 Walnut St | Madera | 93637 | (559) 645-2702 | 1st Wed 9-11am |
Madera Coalition for Community Justice (walk-in food share) | 126 N. B St | Madera | 93638 | (559) 645-2702 | 1st Fri 9-11am (bring a bag) |
Madera Islamic Center | 16634 Road 26 | Madera | 93638 | (559) 706-0808 | 2nd Tue 9am until supplies last |
Parkwood Park (Colibries and The Celebration Nation) | 27290 San Bruno Ave | Madera | 93637 | (559) 517-8076 | 3rd Fri 9-11am |
Rapto Divino Church (Madera) - Neighborhood Market | 716 S. Gateway Dr | Madera | 93638 | (559) 237-3663 ext. 1108 | 1st Wed 9am-12pm | https://ccfoodbank.org/find-food/food-locator/
The Compass of Madera at New Life Church | 1125 N. Lake St | Madera | 93638 | (559) 232-1844 | Fri 8-11am (walk-up) |
North Fork Grace Community Church - Mobile Pantry | 56442 Road 200 | North Fork | 93643 | (559) 237-3663 ext. 1108 | 4th Tue 9-11am | https://ccfoodbank.org/find-food/food-locator/
North Fork Seventh-Day Adventist | 56160 Road 200 | North Fork | 93643 |  | 3rd Mon 10am-12pm | https://ccfoodbank.org/find-food/food-locator/
Manna House of Oakhurst | 40390 Junction Dr | Oakhurst | 93644 | (559) 683-6262 | Mon-Fri 10am-2pm | https://mannahouseofoakhurst.org
Raymond Community - Mobile Pantry | 35048 Road 606 | Raymond | 93653 | (559) 237-3663 ext. 1108 | 1st Tue 9am-12pm | https://ccfoodbank.org/find-food/food-locator/
`,
  },
  Marin: {
    rows: `
Holy Innocents Episcopal Church | 2 Tamalpais Dr | Corte Madera | 94925 |  | Thu 3:45-5:45pm |
Fairfax Food Pantry (Fairfax Community Church) | 2398 Sir Francis Drake Blvd | Fairfax | 94930 |  | Sat 8-10am (closes early if supplies run out) |
Bayside MLK Academy | 200 Phillips Dr | Marin City | 94965 |  | Wed 10:30am-12:30pm |
Southern Marin Food Pantry (St. Andrew Presbyterian Church) | 101 Donahue St | Marin City | 94965 | (415) 332-1011 | Mon 12-1:30pm (Southern Marin residents) |
Tamalpais High School | 700 Miller Ave | Mill Valley | 94941 |  | Fri 11am-2pm |
North Marin Community Services (weekly community market) | 1907 Novato Blvd | Novato | 94947 | (415) 892-1643 | Tue 2-6pm; Fri 10am-2pm (Novato residents) | https://www.northmarincs.org
Novato Health Hub (Marin Community Clinics) | 6100 Redwood Blvd, Suite A | Novato | 94945 | (415) 448-1500 | Thu 1:30-3:30pm (drive-thru) |
West Marin Community Services Food Pantry | 11431 State Route 1, Suite 10 | Point Reyes Station | 94956 |  | Mon, Tue, Wed, Fri 9am-12pm & 1-4pm; Thu 12-5pm | https://www.westmarincommunityservices.org
San Geronimo Community Presbyterian Church - Honor Food Pantry | 6001 Sir Francis Drake Blvd | San Geronimo | 94963 |  | Mon 11am (seniors 70+), 12pm (all West Marin residents), drive-through |
San Geronimo Valley Community Center Food Pantry | 6350 Sir Francis Drake Blvd | San Geronimo | 94963 | (415) 488-8888 | Mon 9am-5pm; Thu 11am-2pm | https://sgvcc.org
Alcohol Justice & Multicultural Center of Marin | 24 Belvedere St | San Rafael | 94901 |  | Sat 8:30-10:40am |
Anthem Church | 50 Los Ranchitos Rd | San Rafael | 94903 |  | Sat 7:45-8:45am |
Bahia Vista Elementary | 125 Bahia Way | San Rafael | 94901 |  | Wed & Fri 10am |
Canal Alliance Food Pantry | 91 Larkspur St | San Rafael | 94901 | (415) 454-2640 | Tue 8-10am (while supplies last) | https://www.canalalliance.org/services/food-pantry
Kerner drive-through pantry (SF-Marin Food Bank) | 2550 Kerner Blvd | San Rafael | 94901 | (415) 824-3663 | Sat 10am-2pm |
Marin Child Care Council | 555 Northgate Dr, Suite 105 | San Rafael | 94903 |  | Tue 10am-1pm |
Marin Community Clinics Health Hub | 3110 Kerner Blvd | San Rafael | 94901 | (415) 755-2556 | Wed 1:30-3:30pm (drive-thru) |
Ritter Center Food Pantry | 16 Ritter St | San Rafael | 94901 | (415) 457-8182 | Mon & Tue 9am-12pm & 1-3pm; Wed 9am-3pm; Fri 9am-12pm (closed Thu) | https://rittercenter.org
Salvation Army - San Rafael | 351 Mission Ave | San Rafael | 94901 | (415) 459-4520 | Mon-Fri 9am-1pm (emergency pantry) |
St. Vincent de Paul Dining Room (free meals) | 820 B St | San Rafael | 94901 | (415) 454-3303 | Daily 6am-1pm; breakfast 6:30-8am, lunch 11am-1pm | https://vinnies.org
Vivalon Brown Bag Pantry | 930 Tamalpais Ave | San Rafael | 94901 | (415) 456-9062 | Fri 11am-12pm (age 60+ or adults with disabilities) | https://vivalon.org
`,
  },
  Mariposa: {
    rows: `
Circle of Hope | 3567 Hwy 140 | Catheys Valley | 95306 | (209) 383-1265 | 3rd Tue 9-11am | https://mmcfb.org/usda-site-list
Old School House | 10331 Cemetery Rd | Coulterville | 95311 | (209) 383-1265 | Last Fri 9-11am | https://mmcfb.org/usda-site-list
Assembly of God | 5265 Hwy 49 North | Mariposa | 95338 | (209) 966-2249 | Wed 7:30-9:30am | https://mmcfb.org/usda-site-list
Heritage House | 5200 Hwy 49 North | Mariposa | 95338 | (209) 966-7770 | Food boxes Tue by appointment (call by Mon); open Mon-Fri 8am-5pm |
Manna House | 5127 Charles St | Mariposa | 95338 | (209) 742-7985 | Mon-Fri 10am-2pm | https://mmcfb.org/usda-site-list
New Beginnings Church | 4603 Hwy 49 South | Mariposa | 95338 | (209) 966-8226 | Tue or Thu 1-2:30pm (call to confirm day) | https://mmcfb.org/usda-site-list
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
      source: 'Hand-collected list (FBNN/Susanville, Central California Food Bank, SF-Marin/Canal Alliance, Merced County Food Bank). Schedules parsed via LA clause parser. lat/lng geocoded downstream.',
      note: 'Drop-in raw for prepare-food-additions.mjs. Single start-times / "by appointment" / "daily" route to _deferred.',
    },
    sites,
  };
  writeFileSync(`./${county}Additions-raw.json`, JSON.stringify(out, null, 2));
  console.log(`\n=== ${county}: ${sites.length} sites | ${withEvents} with events | ${sites.length - withEvents} deferred ===`);
  if (flags.length) console.log(flags.map((f) => '  ' + f).join('\n'));
}
