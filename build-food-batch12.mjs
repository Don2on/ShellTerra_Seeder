/*
 * build-food-batch12.mjs — Trinity, Tulare, Tuolumne (net-new).
 * Pipe-delimited: Name | Street | City | ZIP | Phone | Schedule | Website
 */
import { writeFileSync } from 'node:fs';
import { parseBlock } from './food-schedule-lib.mjs';

const TCFB = 'https://trinitycountyfoodbank.org';
const CCFB = 'https://ccfoodbank.org/find-food/food-locator/';

const COUNTIES = {
  Trinity: {
    rows: `
Down River Fire Department (food bank delivery) | 70 Firehouse Road | Big Bar | 96010 | 530-739-0983 | 1st Fri 11am-12pm | ${TCFB}
Coffee Creek Community Church (food bank delivery) | 420 Coffee Creek Road | Coffee Creek | 96091 | 530-739-0983 | 1st Thu 10am-11am | ${TCFB}
Douglas City Fire Hall (food bank delivery) | 101 Steiner Flat Road | Douglas City | 96024 | 530-739-0983 | 2nd Tue 11am-12pm | ${TCFB}
Hawkins Bar Fire Hall (food bank delivery) | 71 Trinity Court | Hawkins Bar | 95527 | 530-739-0983 | 1st Fri 1pm-2pm | ${TCFB}
Eskaton Senior Apartments (residents only) | 125 Hyampom Road | Hayfork | 96041 | 530-739-0983 | 1st Tue 10am-11am | ${TCFB}
Hayfork Fairgrounds (food bank delivery) | 6000 State Highway 3 | Hayfork | 96041 | 530-739-0983 | 2nd Wed 11am-12:30pm | ${TCFB}
Hoaglin/Zenia site (food bank delivery) | 4001 Peek Road | Zenia | 95595 | 530-739-0983 | 1st Tue 1pm-2pm | ${TCFB}
Hyampom Community Center (food bank delivery) | 71 Corral Bottom Road | Hyampom | 96046 | 530-739-0983 | 1st Tue 12pm-1pm | ${TCFB}
Junction City Community Center (food bank delivery) | 71-A Dutch Creek Road | Junction City | 96048 | 530-739-0983 | 1st Mon 10:30am-11:30am | ${TCFB}
Lewiston Community Center (food bank delivery) | 103 Texas Avenue | Lewiston | 96052 | 530-739-0983 | 1st Mon 9am-10am | ${TCFB}
Lewiston Elementary | 685 Old Lewiston Rd | Lewiston | 96052 |  | Mon and Thu 10am-12pm |
Mad River site / Southern Trinity Health Services (food bank delivery) | 321 Van Duzen Road | Mad River | 95552 | 530-739-0983 | 1st Tue 10:30am-11:30am | ${TCFB}
Ruth Fire Hall (food bank delivery) | 17350 Mad River Road | Ruth | 95526 | 530-739-0983 | Tue after the 1st Mon 1:30pm-3:30pm | ${TCFB}
Post Mountain at 4 Corners (food bank delivery) |  | Trinity Pines | 96076 | 530-739-0983 | 3rd Wed 12pm-1pm | ${TCFB}
Trinity County Food Bank (drive-through) | 51-B Memorial Drive | Weaverville | 96093 | 530-739-0983 | 2nd Sat 11am-12pm | ${TCFB}
Weaverville Senior Apartments (residents only) | 80 Browns Ranch Road | Weaverville | 96093 | 530-739-0983 | 1st Thu 12pm-1pm | ${TCFB}
Wildwood (at the old store) |  | Wildwood | 96076 | 530-739-0983 | 1st Wed 11am-12pm | ${TCFB}
`,
  },
  Tulare: {
    rows: `
Allensworth Neighborhood Market | 3320 Young Rd | Allensworth | 93219 |  | 2nd Wed 11am-2pm | ${CCFB}
Save the Children (Alpaugh) | 5313 Rd. 39 | Alpaugh | 93201 | (559) 237-3663 ext. 1108 | 2nd Wed 10am-1pm | ${CCFB}
Farm Worker Hands - Ledbetter Park | 40779 Rd 128 | Cutler | 93615 |  | 4th Fri 2pm-4pm | ${CCFB}
Open Gate Ministries Cutler | 12588 Ave. 407 | Cutler | 93615 | 559-591-1241 | 4th Tue 9am-11am | ${CCFB}
Dinuba Hispanic SDA Church | 325 N Eaton Ave | Dinuba | 93618 | 559-356-0172 | 1st & 3rd Fri 10am-12pm | ${CCFB}
New Life Community Church | 110 N Nicholas Ave | Dinuba | 93618 |  | 1st through 4th Wed 2pm-4pm | ${CCFB}
Rural Foundation for Community Advancement | 712 East Washington St | Earlimart | 93219 |  | 3rd Tue 2pm-4pm | ${CCFB}
Exeter Seventh Day Adventist | 600 Lenox Ave | Exeter | 93221 | 559-550-7353 | 1st Fri 1:30pm-3:30pm | ${CCFB}
First Southern Baptist Church of Ivanhoe | 33017 Hawthorne Road | Ivanhoe | 93235 |  | 1st Fri 10:30am-12:30pm | ${CCFB}
Ivanhoe Walnut Grove Assembly of God (VEAC) | 3256 Road 160 | Ivanhoe | 93235 | (559) 732-0101 | 4th Thu 11am-1pm | ${CCFB}
Lemon Cove Community Church | 32937 Sierra Dr | Lemon Cove | 93244 |  | 4th Wed 10:30am-1:30pm | ${CCFB}
Lindsay SDA | 588 E Honolulu St | Lindsay | 93247 |  | 1st Mon 11am-1pm | ${CCFB}
Open Gate Ministries Orosi | 41645 Road 128 | Orosi | 93647 | 559-591-1241 | 3rd Tue 9am-11am | ${CCFB}
Pixley First Assembly | 703 S. Elm St | Pixley | 93256 |  | 3rd Sat 10am-12pm | ${CCFB}
Poplar ACTS 2 Christian Fellowship Church of God | 19283 Ave. 144 | Poplar | 93257 | (559) 237-3663 | 2nd Thu 1pm-3pm | ${CCFB}
Altruistic United Humanity Association | 219 N E Street | Porterville | 93257 | 559-359-2347 | 1st & 3rd Fri 10am-12pm | ${CCFB}
Centro Familiar Cosecha Abundante | 2450 S. Main St | Porterville | 93257 |  | 1st & 3rd Fri 3pm-5pm | ${CCFB}
Porterville Church of God | 940 Jubilee Ln | Porterville | 93257 | 602-390-2371 | 4th Sat 9am-11am | ${CCFB}
Porterville College | 100 E. College Ave | Porterville | 93257 | 559-791-2301 | 4th Mon 10am-12pm (except Jan, Aug, Dec) | ${CCFB}
St. Anne's Food Pantry | 271 S. Wallace St | Porterville | 93257 | 559-783-8018 | Wed and Thu 8:30am-11:30am | ${CCFB}
Tule River Justice Center | 129 S Reservation Rd | Porterville | 93257 |  | 3rd Fri 10am-12pm | ${CCFB}
Springville Ranch ADHC | 36400 CA-190 | Springville | 93265 |  | Wed 1pm-3pm | ${CCFB}
Strathmore Full Gospel Assembly of God | 19570 Orange Belt Dr | Strathmore | 93267 |  | 4th Fri 10am-12pm | ${CCFB}
Traver - KCAP | 3957 Kitchner Dr | Traver | 93673 |  | 4th Mon 2:30pm-5pm | ${CCFB}
Brooks Chapel | 701 S. U St | Tulare | 93274 |  | 1st Sat 9am-11am | ${CCFB}
Iglesia de Dios Peniel | 358 N. E St | Tulare | 93274 |  | 4th Tue 11am-1pm | ${CCFB}
Iglesia Jesus es el Senor | 1917 W. Inyo Ave | Tulare | 93274 | 559-300-6333 | 3rd Mon 2pm-4pm | ${CCFB}
St. John's Missionary Baptist Tulare | 310 S Blackstone St | Tulare | 93274 | (559) 237-3663 ext. 1108 | 2nd Tue 10am-12pm | ${CCFB}
The Salvation Army Tulare | 314 E. San Joaquin Ave | Tulare | 93274 |  | Tue 9am-11am | ${CCFB}
Tulare Compassion Center | 1929 E. Bardsley Ave | Tulare | 93274 |  | Sat 9am-11am | ${CCFB}
Tulare SDA Church | 494 N. Blackstone St | Tulare | 93274 | 928-246-0691 | 2nd Fri 9am-12pm | ${CCFB}
Tulare United Methodist Church | 228 W. Kern Ave | Tulare | 93274 | 559-302-8451 | 3rd Sat 11am-1pm | ${CCFB}
Bethlehem Center | 1638 N. Dinuba Blvd | Visalia | 93291 | 559-734-1572 | Mon-Fri 12pm-1:45pm; meals Mon-Fri 8am-9am and 12pm-1pm | ${CCFB}
Goshen Family Health Care Network (VEAC) | 7210 Ave. 308 | Visalia | 93291 | (559) 732-0101 | 3rd Wed 10am-12pm | ${CCFB}
Stone Corral Elementary School | 15590 Ave. 383 | Visalia | 93292 | (559) 237-3663 ext. 1108 | 4th Mon 1:30pm-4:30pm | ${CCFB}
The Salvation Army Visalia | 1501 W. Main St | Visalia | 93291 |  | Thu 9am-12pm; 3rd Wed 9am-12pm | ${CCFB}
Visalia Church of God | 1020 W. Grove Ave | Visalia | 93291 |  | 1st Wed 10am-12pm | ${CCFB}
Visalia Community Church of Christ | 3838 S. Court St | Visalia | 93277 | (559) 734-4833 | 1st Thu 10am-12pm | ${CCFB}
Visalia Emergency Aid Council | 217 NE 3rd St | Visalia | 93291 | 559-734-4833 | Mon, Tue, Thu, Fri 10am-4pm | ${CCFB}
Visalia Nazarene Church | 3333 W Caldwell Ave | Visalia | 93277 | (559) 237-3663 ext. 1108 | 4th Thu 9am-11am | ${CCFB}
Visalia Rescue Mission | 500 E. Race Ave | Visalia | 93291 | 559-740-4178 | Meals daily breakfast 7am, dinner 5pm | ${CCFB}
Visalia United Methodist Church | 5200 W. Caldwell Ave | Visalia | 93277 | (559) 627-1660 | 2nd Wed 10am-12pm | ${CCFB}
Iglesia Adventista del Septimo Dia - Neighborhood Market | 230 N. Acacia St | Woodlake | 93286 | (559) 237-3663 ext. 1108 | 2nd Tue 11am-1pm | ${CCFB}
`,
  },
  Tuolumne: {
    rows: `
Nancy's Hope Columbia Pantry | 11151 Jackson St | Columbia | 95310 | 209-984-3960 | Mon-Sat 10am-2pm |
Mary Laveroni Community Park (distribution) | 18950 CA-120 | Groveland | 95321 |  | Fri 9am-10:30am |
ATCAA Pantry / Interfaith Community Social Services | 18500 Striker Ct | Sonora | 95370 |  | Mon-Fri 10am-1pm |
Nancy's Hope Sonora Pantry | 797 W. Stockton Street | Sonora | 95370 |  | Mon-Sat 10am-2pm |
Mono Way distribution (old Burger King lot) | 13796 Mono Way | Sonora | 95370 |  | Thu 12:30pm-2pm |
St. Patrick's Church | 116 Bradford St | Sonora | 95370 |  | Tue and Thu 6:30am-8am |
ATCAA Tuolumne Pantry | 18851 Cedar St | Tuolumne | 95379 |  | Fri 8am-3pm |
Eproson Park (distribution) | 22901 Meadow Dr | Twain Harte | 95383 | 209-984-3960 | Thu 10am-11:30am |
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
      source: 'Hand-collected list (Trinity County Food Bank, Central California Food Bank, ATCAA/Feed America). Schedules parsed via LA clause parser.',
      note: 'Drop-in raw for prepare-food-additions.mjs.',
    },
    sites,
  };
  writeFileSync(`./${county}Additions-raw.json`, JSON.stringify(out, null, 2));
  console.log(`\n=== ${county}: ${sites.length} sites | ${withEvents} with events | ${sites.length - withEvents} deferred | ${flags.filter((f) => f.includes('no street')).length} city-level ===`);
}
