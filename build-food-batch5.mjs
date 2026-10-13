/*
 * build-food-batch5.mjs — Monterey, Napa, Nevada (user-curated lists).
 * Pipe-delimited rows: Name | Street | City | ZIP | Phone | Schedule | Website | ...
 * (extra trailing columns like Source / Date Added are ignored by parseBlock.)
 * Rows whose schedule says "Monthly <day>" / "twice a month" are force-deferred
 * (monthly-on-unknown-week; the parser would wrongly make them weekly).
 */
import { writeFileSync } from 'node:fs';
import { parseBlock } from './food-schedule-lib.mjs';

// Build a force-defer set for "Monthly <day>" / "twice a month" sites.
function deferMonthly(rowsText) {
  const s = new Set();
  for (const line of rowsText.split('\n').map((l) => l.trim())) {
    if (!line) continue;
    const p = line.split(/\s*\|\s*/);
    if (/\bmonthly\b|twice a month/i.test(p[5] || '')) s.add(p[0]);
  }
  return s;
}

const COUNTIES = {
  Monterey: {
    rows: `
St. Philip's Lutheran Church | 8065 Carmel Valley Rd | Carmel | 93923 | (831) 758-1523 | 1st & 3rd Fri 9-10am (seniors and general public) | https://foodbankformontereycounty.org/food-assistance/
Rippling River Center (senior site) | 53 E Carmel Valley Rd | Carmel Valley | 93924 | (831) 758-1523 | 3rd Fri 10:30-11am | https://foodbankformontereycounty.org/food-assistance/
Our Lady of Refuge Catholic Church | 11140 Preston St | Castroville | 95012 | (831) 758-1523 | 1st Thu 9-10am | https://foodbankformontereycounty.org/food-assistance/
Chualar Union Elementary School | 24285 Lincoln St | Chualar | 93925 | (831) 758-1523 | 2nd Thu 12-1pm | https://foodbankformontereycounty.org/food-assistance/
St. Theodore Church | 116 S Belden St | Gonzales | 93926 | (831) 758-1523 | 3rd Thu 9:30-10:30am | https://foodbankformontereycounty.org/food-assistance/
Greenfield Memorial Hall | 615 El Camino Real | Greenfield | 93927 | (831) 758-1523 | 4th Tue 9:30-10:30am | https://foodbankformontereycounty.org/food-assistance/
Hall District Elementary School | 300 Sill Rd | Las Lomas | 95076 | (831) 758-1523 | 2nd Fri 12:30-2pm | https://foodbankformontereycounty.org/food-assistance/
Holy Assembly Missionary Baptist Church | 3305 Abdy Way | Marina | 93933 | (831) 758-1523 | 3rd Sat 10am-12pm | https://foodbankformontereycounty.org/food-assistance/
Marina Library (produce truck) | 190 Seaside Cir | Marina | 93933 | (831) 758-1523 | Monthly Sat 10am-12pm (Oct 11) | https://foodbankformontereycounty.org/food-assistance/
Monterey County Free Libraries - Admin Office | 188 Seaside Cir | Marina | 93933 | (831) 758-1523 | Monthly Mon 9-10am (Oct 5) | https://foodbankformontereycounty.org/food-assistance/
St. Mary's by-the-Sea Episcopal Church | 146 12th St | Pacific Grove | 93950 | (831) 758-1523 | Mon, Wed, Fri 1-2pm | https://foodbankformontereycounty.org/food-assistance/
Prunedale Grange Hall | 17890 Moro Rd | Prunedale | 93907 | (831) 758-1523 | Monthly Mon 9-10am (Oct 5) | https://foodbankformontereycounty.org/food-assistance/
Alisal Community School (produce truck) | 1437 Del Monte Ave | Salinas | 93905 | (831) 758-1523 | Monthly Thu 2-3pm (Oct 30) | https://foodbankformontereycounty.org/food-assistance/
Alisal Integrated Health Center (produce truck) | 331 N Sanborn Rd | Salinas | 93905 | (831) 758-1523 | Monthly Mon 1-3pm (Oct 20) | https://foodbankformontereycounty.org/food-assistance/
Firehouse Recreation Center (senior site) | 1330 E Alisal St | Salinas | 93905 | (831) 758-1523 | Thu 9-10am | https://foodbankformontereycounty.org/food-assistance/
Frank Paul Family Resource Center (produce truck) | 1296 Rider Ave | Salinas | 93905 | (831) 758-1523 | Monthly Tue 2-3pm (Oct 14) | https://foodbankformontereycounty.org/food-assistance/
Grace Christian Fellowship | 111 Prado St | Salinas | 93906 | (831) 758-1523 | Thu 9-11am | https://foodbankformontereycounty.org/food-assistance/
La Paz Middle School (produce truck) | 1300 N Sanborn Rd | Salinas | 93905 | (831) 758-1523 | Twice a month Wed 1:45-2:45pm (Oct 1 & 15) | https://foodbankformontereycounty.org/food-assistance/
Lutheran Church of the Good Shepherd | 580 Larkin St | Salinas | 93907 | (831) 758-1523 | Fri 9-10am | https://foodbankformontereycounty.org/food-assistance/
Martin Luther King Jr Academy (produce truck) | 925 N Sanborn Rd | Salinas | 93905 | (831) 758-1523 | Monthly Tue 2-3pm (Oct 21) | https://foodbankformontereycounty.org/food-assistance/
Parallel Church | 327 Pajaro St | Salinas | 93901 | (831) 758-1523 | 3rd Tue 5:30-6:30pm | https://foodbankformontereycounty.org/food-assistance/
Royal Family Church of God | 671 E Market St | Salinas | 93905 | (831) 758-1523 | 2nd & 4th Sat 10am-12pm | https://foodbankformontereycounty.org/food-assistance/
Salinas Valley Community Church | 368 San Juan Grade Rd | Salinas | 93906 | (831) 758-1523 | 4th Fri 9-10:30am | https://foodbankformontereycounty.org/food-assistance/
Santa Rita Elementary School (produce truck) | 2014 Santa Rita St | Salinas | 93906 | (831) 758-1523 | Monthly Wed 1-2pm (Oct 8) | https://foodbankformontereycounty.org/food-assistance/
Sherwood Elementary (produce truck) | 110 S Wood St | Salinas | 93905 | (831) 758-1523 | Monthly Thu 2-3pm (Oct 23) | https://foodbankformontereycounty.org/food-assistance/
St. Ansgar's Lutheran Church | 72 E San Joaquin St | Salinas | 93901 | (831) 758-1523 | 3rd Wed 8:30-9:30am | https://foodbankformontereycounty.org/food-assistance/
St. Paul's Episcopal Church (produce truck) | 1071 Pajaro St | Salinas | 93901 | (831) 758-1523 | Monthly Wed 2-3pm (Oct 29) and Sun 2-4pm (Oct 25) | https://foodbankformontereycounty.org/food-assistance/
The Father's House | 55 Natividad Rd | Salinas | 93906 | (831) 758-1523 | 2nd & 4th Wed 5-6pm | https://foodbankformontereycounty.org/food-assistance/
University Park Elementary (produce truck) | 833 W Acacia St | Salinas | 93901 | (831) 758-1523 | Monthly Tue 2-3pm (Oct 28) | https://foodbankformontereycounty.org/food-assistance/
Vineyard Church of Salinas | 1122 E Alisal St | Salinas | 93905 | (831) 758-1523 | Monthly Fri 9-10am (Oct 9) | https://foodbankformontereycounty.org/food-assistance/
San Ardo distribution | Cattlemen Rd and College St | San Ardo | 93450 | (831) 758-1523 | 1st Wed 10-11am | https://foodbankformontereycounty.org/food-assistance/
Bethel Baptist Church | 390 Elm Ave | Seaside | 93955 | (831) 758-1523 | Tue & Thu 4-6pm; one Sat a month 12-2pm | https://foodbankformontereycounty.org/food-assistance/
Seaside High School | 2200 Noche Buena St | Seaside | 93955 | (831) 758-1523 | Wed 4-5pm | https://foodbankformontereycounty.org/food-assistance/
St. Francis Xavier Church | 1475 La Salle Ave | Seaside | 93955 | (831) 758-1523 | 2nd Tue 9-10am | https://foodbankformontereycounty.org/food-assistance/
Main Street Middle School (produce truck) | 441 Main St | Soledad | 93960 | (831) 758-1523 | Monthly Mon 10am-12pm (Oct 6) | https://foodbankformontereycounty.org/food-assistance/
Our Lady of Solitude Church | 235 Main St | Soledad | 93960 | (831) 758-1523 | 3rd Mon 9:30-10:30am | https://foodbankformontereycounty.org/food-assistance/
`,
  },
  Napa: {
    rows: `
Harvest Freewill Baptist Church (pantry) | 240 Rio Del Mar | American Canyon | 94503 | (707) 253-6128 | 2nd & 4th Tue 3:30-5:30pm |
Las Casitas Mobile Home Park (free market) | 3000 Broadway St | American Canyon | 94503 | (707) 253-6128 | 1st Fri 2-4pm |
Old Napa Junction Elementary Room 4 (Kiwanis pantry and USDA) | 300 Napa Junction Rd | American Canyon | 94503 | (707) 253-6128 | 3rd Thu 3:30-5pm |
Angwin Pop-Up Pantry (parking lot) | 1 Angwin Ave | Angwin | 94508 | (707) 253-6128 | 1st & 3rd Tue 6-7:30pm |
Calistoga Cares Pantry (Fairgrounds Tubbs Building) | 1435 N. Oak St | Calistoga | 94515 | (707) 253-6128 | 2nd & 4th Thu 2-5pm |
Calistoga Elementary School (free market) | 1327 Berry St | Calistoga | 94515 | (707) 253-6128 | 1st Fri 3-4pm |
OLE Health Calistoga (free market) | 911 Washington St | Calistoga | 94515 | (707) 253-6128 | 3rd Fri 2:30-4:30pm |
Lake Berryessa Pantry (Moskowite Corners) | 6004 Monticello Rd | Lake Berryessa | 94558 | (707) 253-6128 | 3rd Wed 11am-1pm |
Spanish Flat Campground (free market) | 4290 Knoxville Rd | Lake Berryessa | 94558 | (707) 253-6128 | 1st Thu 2-4pm |
CANV Food Bank pantry | 938 Kaiser Rd | Napa | 94558 | (707) 253-6128 | Tue, Wed, Thu 9am-1pm by appointment; drop-in 1-3pm (once a month) |
CalFresh Office Self Sufficiency Services (free market) | 2751 Napa Valley Corporate Dr | Napa | 94558 | (707) 253-6128 | 2nd Fri 2-4pm |
Covenant Presbyterian Church (free market) | 1226 Salvador Ave | Napa | 94558 | (707) 253-6128 | 5th Fri 2-4pm |
Napa Senior Center (USDA distribution) | 1500 Jefferson St | Napa | 94559 | (707) 253-6128 | 3rd Mon 10-11:30am |
OLE Health Napa (free market) | 1141 Pear Tree Ln | Napa | 94558 | (707) 253-6128 | 3rd Fri 2-4pm |
Saint Thomas Aquinas Catholic Church (free market) | 2725 Elm St | Napa | 94558 | (707) 253-6128 | 3rd Fri 3-4pm |
Spanish Seventh-day Adventist Church (free market and USDA) | 1011 Pueblo Ave | Napa | 94558 | (707) 253-6128 | 4th Fri 2-4pm; USDA 3rd Thu 4-6pm |
The Father's House (free market) | 860 Latour Ct | Napa | 94558 | (707) 253-6128 | Sat 9:30-11:30am |
Pope Valley Farm Center (pantry and free market) | 5800 Pope Valley Rd | Pope Valley | 94567 | (707) 253-6128 | Pantry 1st Wed 12-2pm; free market 3rd Wed 12-2pm |
Saint Helena High School (free market) | 1401 Grayson Ave | St. Helena | 94574 | (707) 253-6128 | 2nd Fri 3-4pm |
St. Helena Pantry (behind Seventh-day Adventist Church Hall) | 1777 Main St | St. Helena | 94574 | (707) 253-6128 | Tue & Fri 2:30-4pm |
Yountville Community Church (USDA distribution) | 6621 Yount St | Yountville | 94599 | (707) 253-6128 | 3rd Thu 12-2pm |
`,
  },
  Nevada: {
    rows: `
Gold Country Senior Services (lunch cafe) | 231 Colfax Ave | Grass Valley | 95945 | (530) 273-4961 | Lunch Mon, Tue, Thu 12pm |
Grass Valley Seventh-day Adventist Church (Food Bank of Nevada County distribution) | 12889 Osborne Hill Rd | Grass Valley | 95945 | (530) 272-3796 | 2nd & 4th Thu 10am-1pm |
Interfaith Food Ministry | 440 Henderson St | Grass Valley | 95945 | (530) 273-8132 | Mon, Wed, Fri, Sat 10am-1pm |
Sierra United Methodist Church Higgins Corner (Food Bank of Nevada County distribution) | 22559 W. Hacienda Dr | Grass Valley | 95949 | (530) 272-3796 | 3rd Thu 3:30-5:30pm |
The Salvation Army (emergency pantry) | 10725 Alta St | Grass Valley | 95945 |  | Mon-Thu 10am-3pm |
Sierra Roots (First Community Church) | 300 Main St | Nevada City | 95959 | (530) 751-3263 | Lunch Thu 11:30am (winter only) |
Oak Tree School (Food Bank of Nevada County distribution) | 18847 Oak Tree Rd | North San Juan | 95960 | (530) 272-3796 | 2nd Tue 10am-12pm |
San Juan Ridge PARTNERS Family Resource Center (emergency pantry) | 18847 Oak Tree Rd | North San Juan | 95960 |  | Tue & Thu 12-3pm |
Sierra Community House - Truckee | 12116 Chandelle Way Suite D2 | Truckee | 96161 | (530) 546-0952 | Tue 1-5:30pm; Wed 3-4:30pm; Thu 2-3:30pm |
Washington Fire Department (Food Bank of Nevada County distribution) | 15406 Washington Rd | Washington | 95986 | (530) 272-3796 | 3rd Wed 12pm |
`,
  },
};

for (const [county, { rows }] of Object.entries(COUNTIES)) {
  const { sites, flags } = parseBlock(rows, { forceDefer: deferMonthly(rows) });
  const withEvents = sites.filter((s) => s.schedules.length).length;
  const out = {
    _meta: {
      topic: `${county} County food distributions`,
      generated: '2026-10-11',
      source: 'Hand-collected list (Food Bank for Monterey County, Community Action of Napa Valley, Food Bank of Nevada County / 211). Schedules parsed via LA clause parser. lat/lng geocoded downstream.',
      note: 'Drop-in raw for prepare-food-additions.mjs. "Monthly <day>"/"twice a month"/single start-times route to _deferred.',
    },
    sites,
  };
  writeFileSync(`./${county}Additions-raw.json`, JSON.stringify(out, null, 2));
  console.log(`\n=== ${county}: ${sites.length} sites | ${withEvents} with events | ${sites.length - withEvents} deferred ===`);
  if (flags.length) console.log(flags.map((f) => '  ' + f).join('\n'));
}
