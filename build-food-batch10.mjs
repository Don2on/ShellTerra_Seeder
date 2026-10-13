/*
 * build-food-batch10.mjs — Sierra, Siskiyou, Solano, Sonoma (net-new).
 * Pipe-delimited: Name | Street | City | ZIP | Phone | Schedule | Website
 */
import { writeFileSync } from 'node:fs';
import { parseBlock } from './food-schedule-lib.mjs';

const COUNTIES = {
  Sierra: {
    rows: `
Golden Rays Senior Center (commodities) | 305A Main St | Downieville | 95936 | 530-862-5030 | Usually 1st Thu 8am |
Western Sierra Food Bank (Immaculate Conception Catholic Church) | Sunnyside Drive | Downieville | 95936 | 530-277-8954 | 1st Thu 12pm-2pm |
Loyalton Senior Center (commodities) | 302 First Street | Loyalton | 96118 | 530-993-4770 | 1st Thu 10am-12pm |
Loyalton Food Bank - High Sierras Family Services | 315 Main St | Loyalton | 96118 | 530-993-1110 | 1st and 3rd Fri 1:30pm; office Tue-Fri 10am-4pm |
Sierra City Community Hall (commodities) | 425 Main Street | Sierra City | 96125 | 530-862-1307 | Usually last Thu of month 1pm-3pm |
`,
  },
  Siskiyou: {
    rows: `
Siskiyou Community Food Bank | 1601 S. Oregon St Suite B | Yreka | 96097 | 530-340-6382 | Mon & Thu 1pm-3:45pm | https://siskiyoufoodbank.org
Siskiyou Food Assistance | 780 South Davis Avenue | Weed | 96094 | (530) 408-6115 | Wed 11am-3pm (drive-thru; photo ID) |
Happy Camp Community Action Center (commodities) | 38 Parkway Road | Happy Camp | 96039 | (530) 493-5117 | Fri 10am-1pm | https://gnservices.org
Great Northern Services commodities - Fort Jones |  | Fort Jones | 96032 | 530-938-4115 | Thu 12:30pm-2:30pm | https://gnservices.org
Scott Valley Food Pantry | 13007 N. Hwy 3 | Fort Jones | 96032 | 530-598-8363 | Wed 3pm-4:30pm; Sat 10am-12pm |
Yreka Food Bank | 1249 Main Street | Yreka | 96097 | 530-643-2507 | Tue and Fri 10am-12pm |
St. Joseph's Catholic Church | 312 4th St | Yreka | 96097 | 530-842-4874 | Sat 12pm |
First Baptist Church Mt. Shasta | 812 Lassen Lane | Mt. Shasta | 96067 | 530-926-5095 | Wed 5pm |
Saint Anthony's Soup Kitchen | 507 Pine St | Mt. Shasta | 96067 | 530-926-4477 | Thu 3pm-5pm |
Klamath River Community Center |  | Klamath River | 96050 | 530-938-4115 | Thu 10:30am-12pm |
Horse Creek Community Church |  | Horse Creek | 96050 | 530-938-4115 | Thu 11:30am-1pm |
`,
  },
  Solano: {
    rows: `
Benicia Community Action Council | 480 Military East | Benicia | 94510 | 707-745-0900 | 1st & 3rd Mon 10am-1pm |
Food is Free Bay Area | 1400 E 2nd St | Benicia | 94510 | 707-690-0945 | 2nd & 4th Tue 9am-10:30am |
Food is Free Bay Area at Benicia Public Library | 150 E L St | Benicia | 94510 | 707-690-0945 | 3rd Sat 10am-12pm |
Food is Free Bay Area at Benicia Senior Citizens | 187 E L St | Benicia | 94510 | 707-690-0945 | 3rd Wed 11am-12pm |
St. Paul's Episcopal Church (soup kitchen) | 120 E J St | Benicia | 94510 | 707-745-0307 | Mon & Wed 4:30pm-6pm |
Cornerstone Church | 185 W Cherry St | Dixon | 95620 | 707-678-5234 | Fri 9:30am-10:30am; 2nd & 4th Wed 9:30am-10:30am |
Dixon Community Medical Center (SNAP relief) | 131 West A St Ste. 1 | Dixon | 95620 |  | 4th Thu 10am-12pm |
Dixon Family Services | 155 N 2nd St | Dixon | 95620 | 707-678-0442 | Mon-Thu 10am-4pm; 1st & 3rd Wed 11am-12pm; 2nd Tue 10am-12pm |
Dixon Food Locker at St. Peter's (SVdP) | 105 S 2nd St | Dixon | 95620 | 707-678-7664 | 2nd & 4th Mon 9am-10am |
Bethel Community Church of Fairfield | 600 E Tabor Ave | Fairfield | 94533 | 707-427-1415 | 1st & 3rd Wed 9am-10:30am; 1st & 3rd Fri 2pm-3pm |
Catholic Charities Yolo-Solano | 823 Jefferson St Suites A & B | Fairfield | 94533 | 707-644-8909 | Tue-Thu 9am-12pm and 1pm-4:30pm; Fri 9am-12pm |
Dover Elementary (Community Produce Program) | 301 E Alaska Ave | Fairfield | 94533 |  | 1st & 3rd Fri 4pm-5pm |
Fairfield City Church | 743 E Tabor Ave | Fairfield | 94533 | 707-426-2172 | Mon-Wed and Fri 1pm-3pm; Sat 11am-4pm |
Fairfield Family Health Services (SNAP relief) | 2101 Courage Dr | Fairfield | 94533 |  | 1st through 4th Tue 10am-12pm |
Fairfield Seventh-day Adventist Community Services | 1101 E Tabor Ave | Fairfield | 94533 | 707-426-6720 | 2nd & 4th Wed 10:30am-11:30am; 3rd Fri 10am-11:30am |
Fairfield-Suisun Community Action Council (CANB) | 416 Union Ave | Fairfield | 94533 | 707-427-1148 | Mon, Wed & Fri 12pm-2pm |
Golden Hills Education Center (Community Produce Program) | 2460 Clay Bank Rd | Fairfield | 94533 |  | 2nd & 4th Wed 2pm-3pm |
Liberty Church | 2641 N Texas St | Fairfield | 94533 | 707-425-9673 | 1st, 2nd and 3rd Sat 9am-9:30am; 4th Sun 10:15am-11am |
LOGIC Ministries | 533 Jackson St | Fairfield | 94533 | 707-310-1259 | Mon-Fri 11am-1pm |
Mount Calvary Baptist Church | 1735 Enterprise Dr Bldg 3 | Fairfield | 94533 | 707-425-1849 | Thu 1pm-3pm; 2nd & 4th Sat 10am-12pm |
Operation Rooftop | 393 Watt Dr | Fairfield | 94534 | 801-209-7011 | Wed 12pm-1pm |
Our Lady of Mount Carmel (mobile pantry) | 2700 Dover Ave | Fairfield | 94533 |  | 2nd and 4th Wed 12pm-1pm |
Parkway Plaza | 188 E Alaska Ave | Fairfield | 94533 | 925-676-7543 | 1st Tue 10am-12pm |
Rockville Presbyterian Fellowship (at Salvation Army) | 1200 Missouri St | Fairfield | 94533 | 707-439-7980 | Mon & Wed 1pm-2pm |
Salvation Army Fairfield | 1200 Missouri St | Fairfield | 94533 | 707-439-7982 | Mon 9am-12pm; Wed 9am-12pm |
Salvation Army Fairfield (Community Produce Program) | 1216 Missouri St | Fairfield | 94533 |  | 2nd & 4th Thu 11:30am-12:30pm |
Samoan Christian Fellowship | 1200 Western St | Fairfield | 94533 | 707-428-4221 | Wed 11am-1pm |
St. Mark's Lutheran Church | 1600 Union Ave | Fairfield | 94533 | 707-422-4741 | Tue 2pm-5pm; 1st & 3rd Wed 9am-10am |
St. Stephens CME Church Feed My Sheep | 2301 Union Ave | Fairfield | 94533 |  | 2nd & 4th Wed 2pm-4pm |
True Love Baptist Church | 1956 Pennsylvania Ave | Fairfield | 94533 | 707-426-2776 | 2nd & 4th Wed 10am-1pm |
WIC Fairfield (Community Produce Program) | 2101 Courage Dr | Fairfield | 94533 |  | 2nd & 4th Thu 2pm-3pm |
Lighthouse Ministries (Community Produce Program) | 101 Montezuma St | Rio Vista | 94571 |  | 1st & 3rd Wed 2pm-3pm |
Rio Vista Food Pantry | 1105 A Airport Rd | Rio Vista | 94571 | 707-374-5706 | Two Sundays per month 12:30pm-1:30pm |
Rio Vista Senior Center (Senior Food Program) | 25 Main St | Rio Vista | 94571 |  | 2nd Fri 9:30am-10:30am |
Dan O. Root Elementary School (Community Produce Program) | 820 Harrier Dr | Suisun City | 94585 |  | 1st & 3rd Wed 4pm-5pm |
Suisun City Salvation Army Kroc Center (Community Produce Program) | 586 E Wigeon Way | Suisun City | 94585 |  | 1st & 3rd Fri 11:30am-12:30pm |
Connection Point Church | 5900 Cherry Glen Road | Vacaville | 95688 | 707-592-6845 | Tue 10am-11:30am |
Epiphany Episcopal Church (Senior Food Program) | 300 West St | Vacaville | 95688 |  | 1st & 3rd Wed 9:30am-10:30am |
First Baptist Church of Vacaville | 1127 Davis St | Vacaville | 95687 | 707-718-1087 | Wed 5pm-6:30pm; Fri 10am-12pm |
Joint Church for Community Meals at Epiphany Church (soup kitchen) | 300 West St | Vacaville | 95688 | 707-448-2275 | Tue 1pm-2pm; Fri 4:30pm-6pm |
Leaven Kids Center (Community Produce Program) | 1625 Alamo Dr | Vacaville | 95687 |  | 2nd & 4th Wed 4pm-5pm |
St. Mary's Catholic Church | 350 Stinson Ave | Vacaville | 95688 | 707-446-4613 | Mon-Wed and Fri 10am-11:45am; Thu 5pm-6:30pm |
Vacaville Community Medical Center (SNAP relief) | 600 Nut Tree Rd Ste. 310 | Vacaville | 95687 |  | 1st Thu 10am-12pm |
Vacaville Family Health Services (SNAP relief) | 1119 E Monte Vista Ave | Vacaville | 95688 |  | 1st through 4th Wed 10am-12pm |
We Love Our City at Father's House Vacaville | 4800 Horse Creek Dr | Vacaville | 95688 | 707-454-0268 | Sat 10am-12pm |
Amador St. Hope Center | 929 Amador St | Vallejo | 94590 | 707-654-4673 | 1st & 4th Wed 10am-12pm |
Antioch COGIC | 21 Antioch Dr | Vallejo | 94589 | 707-641-5276 | 1st & 3rd Thu 11am-12pm |
Boys & Girls Empowerment Group | 1624 Fairgrounds Dr Ste C | Vallejo | 94589 | 707-657-1726 | Thu & Sat 10am-12pm |
Bridgeway Cornerstone Church | 1505 Georgia St | Vallejo | 94590 | 707-652-5300 | Mon 9:30am-10am |
Calvary Community Church | 585 Mini Dr | Vallejo | 94589 | 707-373-9459 | 4th Sat 10am-12pm |
Castlewood Church (Community Produce Program) | 3615 Georgia St | Vallejo | 94591 |  | 1st & 3rd Mon 2pm-3pm |
Emmanuel Apostolic Church | 900 6th St | Vallejo | 94590 | 707-642-2391 | Mon 10:30am-11:30am; 2nd & 4th Tue 2pm-3pm |
First Baptist Church of Vallejo (soup kitchen) | 2025 Sonoma Blvd | Vallejo | 94590 | 707-644-4087 | Mon-Thu 11am-12pm; Sun 5pm-6pm |
Florence Douglas Senior Center (Senior Food Program) | 333 Amador St | Vallejo | 94590 |  | 2nd & 4th Wed 10am-11am |
Food is Free Bay Area - Vallejo | 900 Fairgrounds Dr | Vallejo | 94589 | 707-690-0945 | Tue & Thu 3pm-6pm |
Friendship Missionary Baptist Church | 1905 Florida St | Vallejo | 94590 | 707-648-2005 | 4th Sat 8am until food is gone |
Good Samaritan Missionary Baptist | 407 Capitol St | Vallejo | 94590 | 707-553-1896 | 1st, 3rd & 5th Thu 10am-11am |
Griffin Academy (Community Produce Program) | 233 Hobbs Ave | Vallejo | 94589 |  | 1st & 3rd Tue 2pm-3pm |
Incredible Blessings 4 U | 601 Sacramento St | Vallejo | 94590 | 707-567-7204 | Tue 8am-9am |
JFK Library (Community Produce Program) | 505 Santa Clara St | Vallejo | 94590 |  | 2nd & 4th Sat 10am-11am |
La Clinica North (Community Produce Program) | 220 Hospital Dr | Vallejo | 94590 |  | 1st & 3rd Thu 9:30am-10:30am |
Norman King Community Center (Senior Food Program) | 545 Magazine St | Vallejo | 94590 |  | 2nd & 4th Wed 9:30am-10:30am |
North Vallejo Community Center (mobile pantry) | 1121 Whitney Ave | Vallejo | 94589 |  | 3rd Sat 10am-12pm |
Old Path COGIC | 500 Arkansas St | Vallejo | 94590 | 707-643-7788 | 1st & 3rd Sat 10am-11am |
Rise Vallejo / Circle of Friends (mobile pantry) | 1450 Coronel Ave | Vallejo | 94591 |  | 3rd Wed 10am-12pm |
Salvation Army Vallejo | 630 Tuolumne St | Vallejo | 94590 | 707-439-7982 | Tue 9am-12pm and 1pm-4:30pm; Thu 9am-12pm |
Second Baptist Church of Vallejo | 1170 Benicia Rd | Vallejo | 94591 | 707-643-6496 | 1st & 3rd Wed 8:30am-10am |
Shiloh COGIC | 501 Lemon St | Vallejo | 94590 | 707-917-6941 | Thu 11am-12pm or until food is gone |
Solano Middle School (Community Produce Program) | 1025 Corcoran Ave | Vallejo | 94589 |  | 2nd & 4th Fri 4pm-5pm |
Taylor Chapel CME Church (Community Produce Program) | 1203 Louisiana St | Vallejo | 94590 |  | 2nd & 4th Fri 2pm-3pm |
The Edge Community Church at Solano Dream Center | 2166 Sacramento St | Vallejo | 94590 | 707-421-9430 | Thu 11am-1pm |
The Hill Church (mobile pantry) | 210 Locust Dr | Vallejo | 94591 |  | 1st & 3rd Wed 3pm-4pm |
Vallejo Family Health Services (SNAP relief) | 365 Tuolumne St | Vallejo | 94590 |  | 1st through 4th Mon 10am-12pm |
Vallejo High School (Community Produce Program) | 840 Nebraska St | Vallejo | 94590 |  | 1st & 3rd Tue 4pm-5pm |
Vallejo Seventh-day Adventist Community Services | 1130 Alabama St | Vallejo | 94590 | 707-557-2267 | Tue 9am-12pm |
WIC Vallejo (Community Produce Program) | 365 Tuolumne St | Vallejo | 94590 |  | 2nd & 4th Tue 12pm-1pm |
`,
  },
  Sonoma: {
    rows: `
Bodega Bay Church | 1320 Bay View St | Bodega Bay | 94923 |  | 2nd, 4th & 5th Wed 3pm-4pm |
Waves of Compassion Bodega Bay | 1370 Bodega Ave | Bodega Bay | 94923 | 707-595-0294 | 1st & 3rd Wed 3:30pm-5pm |
Cloverdale Citrus Fairgrounds | 1 Citrus Fair Dr | Cloverdale | 95425 |  | Mon 3:30pm-4:30pm |
Cloverdale Food Pantry | 202 Commercial St | Cloverdale | 95425 |  | Fri 11am-1pm |
Cloverdale LDS Church | 1101 S Cloverdale Blvd | Cloverdale | 95425 |  | Thu 10am-11am |
La Familia Sana | 439 N. Cloverdale Blvd | Cloverdale | 95425 |  | 2nd & 4th Tue 3pm-4:30pm |
New Hope Market | 183 E Cotati Ave | Cotati | 94931 |  | Thu 4pm-6pm |
St. Joseph Church | 150 St Joseph Way | Cotati | 94931 | 707-584-1579 | Tue 9:30am-10:30am; Fri 9:30am-10:30am |
Thomas Page Academy | 1075 Madrone Ave | Cotati | 94931 |  | 1st & 3rd Fri 1pm-2pm |
Windwood Apartments | 298 E Cotati Ave | Cotati | 94931 |  | 2nd Tue 3pm-4pm |
Food For Thought | 6550 Railroad Ave | Forestville | 95436 |  | Tue, Wed, Thu 10am-4:30pm; Fri 10am-4pm |
Forestville United Methodist Church | 6550 Covey Rd | Forestville | 95436 | 707-887-2020 | 2nd & 4th Wed 11am-12pm |
Spring Hills Church | 3700 Fulton Rd | Fulton | 95439 |  | Mon 11am-12pm |
Geyserville New Tech Academy | 1300 Moody Ln | Geyserville | 95441 |  | Mon 4:30pm-5:15pm |
Graton Day Labor Center | 2981 Bowen St | Graton | 95444 |  | 2nd & 4th Fri 9:30am-10:30am |
Guerneville School | 14630 Armstrong Woods Rd | Guerneville | 95446 |  | Tue 1:30pm-2:30pm |
River to Coast Children's Services | 16300 First St | Guerneville | 95446 |  | Thu 2pm-4:30pm |
Russian River Food Pantry (Salvation Army and SVdP) | 16290 5th St | Guerneville | 95446 |  | 2nd & 4th Sat 9am-12pm |
St. Hubert's Hall | 16290 5th St | Guerneville | 95446 |  | Wed 11:30am-12:30pm |
Alliance Medical Center - Healdsburg | 1381 University Ave | Healdsburg | 95448 |  | Tue 9am-9:30am |
Corazon Healdsburg | 1557 Healdsburg Ave | Healdsburg | 95448 |  | Tue 9:30am-10:30am |
Healdsburg Recreation Park | 515 Piper St | Healdsburg | 95448 |  | Wed 2pm-3pm |
Healdsburg Shared Ministries | 1505 Healdsburg Ave | Healdsburg | 95448 |  | Tue 3pm-4:30pm; Wed, Fri 2:30pm-5pm; Thu 12pm-1pm |
Trinity Baptist Church | 515 Powell Ave | Healdsburg | 95448 |  | Sat 8am-9:30am |
Jenner Community Center | 10398 CA-1 | Jenner | 95450 |  | 2nd Wed 11am-12pm |
Monte Rio Community Center | 20488 CA-116 | Monte Rio | 95462 |  | Wed 3pm-4pm |
St. Philip Church | 3730 Bohemian Hwy | Occidental | 95465 |  | 2nd Tue 8am-11am |
COTS Mary Isaak Center (meals) | 900 Hopper St | Petaluma | 94952 |  | Daily 11:30am-12:30pm and 5pm-6pm |
Elim Lutheran Church (Westside Pantry) | 220 Stanley St | Petaluma | 94952 |  | Thu 5pm-5:30pm |
McDowell Elementary | 421 S McDowell Blvd | Petaluma | 94954 |  | Fri 10am-11am |
Miwok Valley Elementary | 1010 St Francis Dr | Petaluma | 94954 |  | Tue 4pm-5pm |
New Life Christian Fellowship | 1310 Clegg St | Petaluma | 94954 |  | Tue 10am-11am |
Park Lane Apartments | 109 Magnolia Ave | Petaluma | 94952 |  | 2nd Fri 9:30am-10:30am |
Petaluma Community Center | 320 N McDowell Blvd | Petaluma | 94954 |  | Thu 11:30am-12:30pm |
Petaluma Fairgrounds | 175 Fairgrounds Dr | Petaluma | 94952 |  | Fri 9am-10am |
Petaluma Senior Center | 320 N McDowell Blvd | Petaluma | 94954 |  | 1st & 3rd Fri 8am-9am |
Salvation Army Petaluma | 721 S McDowell Blvd | Petaluma | 94954 |  | Tue, Wed, Thu 9am-12pm; Tue 1pm-3:15pm; Wed, Fri 9am-10:45am |
Santa Rosa Junior College Petaluma | 680 Sonoma Mountain Parkway | Petaluma | 94954 | 707-778-4124 | 1st Tue 12pm-2pm |
Two Rock Elementary | 5001 Spring Hill Rd | Petaluma | 94952 |  | 2nd & 4th Fri 9am-10am |
Una Vida | 1315 Rand Street | Petaluma | 94954 |  | Wed 4pm-5:30pm; Thu, Sat 2pm-5pm |
Alicia Park | 299 Santa Alicia Dr | Rohnert Park | 94928 |  | Thu 10am-11am |
CPI Family Resource Center at John Reed Elementary | 390 Arlen Dr | Rohnert Park | 94928 | 707-792-4732 | Mon-Fri 9am-5pm |
Iglesia Cristiana SE | 6640 Redwood Dr | Rohnert Park | 94928 | 707-484-5918 | 2nd & 4th Sun 1pm-1:30pm |
Iglesia Josue at Rohnert Park Community Center | 5401 Snyder Ln | Rohnert Park | 94928 |  | 2nd & 4th Sat 9am-10am |
John Reed Elementary | 390 Arlen Dr | Rohnert Park | 94928 |  | 2nd & 4th Fri 1pm-2:30pm |
Neighbors Organized Against Hunger (NOAH) | 5443 Snyder Ln | Rohnert Park | 94928 |  | Wed 4pm-6pm |
Petaluma Health Center - Rohnert Park | 5900 State Farm Dr | Rohnert Park | 94928 |  | Mon 8:45am-9:45am |
Primera Iglesia Bautista | 5475 Snyder Lane | Rohnert Park | 94928 | 510-533-5045 | Sun 5pm-5:15pm; Thu 8pm-8:15pm |
Rancho Grande Mobile Home Park | 5099 Snyder Ln | Rohnert Park | 94928 |  | 2nd Fri 10am-11am |
Rancho Verde Mobile Home Park | 750 Rohnert Park Expy | Rohnert Park | 94928 |  | 2nd & 4th Tue 10:30am-11:30am |
Rohnert Park Senior Center | 6800 Hunter Dr | Rohnert Park | 94928 |  | 4th Fri 10am-11am |
St. Elizabeth Seton Church | 4595 Snyder Lane | Rohnert Park | 94928 |  | Wed 3:30pm-4:30pm |
Tower Apartments | 781 E Cotati Ave | Rohnert Park | 94928 |  | 1st & 3rd Thu 12:30pm-1pm |
6th Street Playhouse | 52 W 6th St | Santa Rosa | 95401 |  | Thu 10:30am-11:30am |
Acacia Lane Apartments | 657 Acacia Ln | Santa Rosa | 95409 |  | 2nd & 4th Fri 10:30am-11:30am |
Bayer Park | 1550 West Ave | Santa Rosa | 95407 |  | Wed 2:30pm-3pm |
Bayside Santa Rosa | 3175 Sebastopol Rd | Santa Rosa | 95407 |  | Mon 8am-9am |
Bellevue Elementary | 3223 Primrose Ave | Santa Rosa | 95407 |  | Tue 2pm-3pm |
Buckelew Programs Sonoma | 2235 Mercury Way Ste 107 | Santa Rosa | 95407 | 707-909-0897 | Mon, Tue, Thu, Fri 10am-3pm; Wed 1pm-4pm |
Casa Roseland | 583 West Ave | Santa Rosa | 95407 |  | Mon 12pm-1pm |
Catholic Charities Community Emergency Food Pantry | 987 Airway Court Suite 101 | Santa Rosa | 95403 | 707-528-8712 | Mon-Fri 9am-5pm |
Cesar Chavez Language Academy | 2480 Sebastopol Rd | Santa Rosa | 95407 |  | Thu 10:30am-11:30am |
Christian Family Fellowship | 1160 A Hopper Ave | Santa Rosa | 95403 | 707-571-0245 | Sun 9:30am-9:45am |
Church of the Incarnation - Sunday Open Table | 550 Mendocino Ave | Santa Rosa | 95404 |  | Sun 6:30am-8am |
Community Baptist Church - 4 Seasons of Giving | 1620 Sonoma Ave | Santa Rosa | 95405 |  | Tue 12pm-2pm; 2nd & 4th Sat 10am-12pm |
CPI Family Resource Center | 3642 Standish Ave | Santa Rosa | 95407 | 707-585-6108 | Mon-Sat 9am-7pm; 2nd & 4th Sat 10am-1pm |
Economic Assistance Center | 2550 Paulin Dr | Santa Rosa | 95403 |  | Tue 2pm-3pm |
Elisha's Pantry | 1717 Yulupa Ave | Santa Rosa | 95405 |  | Thu 3:15pm-5pm |
Elsie Allen High | 599 Bellevue Ave | Santa Rosa | 95407 |  | Mon 11am-12pm |
Epicenter Parking Lot | 3215 Coffey Lane | Santa Rosa | 95403 |  | Tue 10am-11am |
FISH of Santa Rosa | 1710 Sebastopol Rd | Santa Rosa | 95407 |  | Mon-Fri 12pm-2pm |
Helen Lehman Elementary | 1700 Jennings Ave | Santa Rosa | 95401 |  | Thu 11am-12pm |
Hilliard Comstock Middle School | 2750 W Steele Lane | Santa Rosa | 95403 |  | 1st & 3rd Thu 2pm-3pm |
Individual and Family Support Network | 2455 Bennett Valley Rd Suite C200 | Santa Rosa | 95404 | 707-546-7907 | Mon, Tue 9:30am-12:30pm and 1:30pm-4pm |
Jewish Community Free Clinic | 50 Montgomery Dr | Santa Rosa | 95404 |  | Mon 1pm-5pm; Tue, Thu 10am-1pm; Wed 11am-3pm |
Kaiser MOB 5 | 3975 Old Redwood Hwy | Santa Rosa | 95403 |  | 1st & 3rd Sat 8am-9am |
Kawana Springs Elementary School | 2121 Moraga Drive | Santa Rosa | 95404 |  | Thu 10am-11am |
Lamplighter Mobile Home Park | 2800 Santa Rosa Ave | Santa Rosa | 95407 |  | 2nd Tue 11am-12pm |
Laurel at Perennial Park | 510 Renaissance Way | Santa Rosa | 95403 |  | 1st & 3rd Thu 12pm-1pm |
Leisure Mobile Home Park | 2185 Occidental Rd | Santa Rosa | 95401 | 707-546-3865 | Mon-Thu 8am-5pm; Fri 8am-4pm |
Martin Luther King Jr. Park | 1208 Hendley St | Santa Rosa | 95404 |  | Mon 1:30pm-2:30pm |
Northpoint Santa Rosa LDS Church | 1550 Northpoint Parkway | Santa Rosa | 95407 |  | Wed 9:30am-10:30am |
Rancho Cabeza Mobile Home Park | 677 Calistoga Rd | Santa Rosa | 95409 |  | 4th Tue 10am-11am |
Redemption Hill Church | 2100 Petaluma Hill Rd | Santa Rosa | 95404 |  | 1st & 3rd Tue 1:30pm-2:30pm |
Resurrection Church | 303 Stony Point Rd | Santa Rosa | 95401 |  | Wed 2pm-3pm |
Ridgway High | 325 Ridgway Ave | Santa Rosa | 95401 |  | Thu 4:15pm-5pm |
Salvation Army Santa Rosa | 93 Stony Cir | Santa Rosa | 95401 |  | Tue-Fri 10am-12pm |
Santa Rosa Community Health Dutton | 1300 N Dutton Ave | Santa Rosa | 95401 |  | Mon 12:30pm-1:30pm |
Santa Rosa Junior College Roseland | 950 S Wright Rd | Santa Rosa | 95407 |  | 1st & 3rd Thu 12pm-1pm |
Santa Rosa Junior College Santa Rosa | 1501 Mendocino Ave | Santa Rosa | 95401 | 707-524-1805 | Tue, Wed, Thu 10am-4pm |
Santa Rosa Nazarene Church | 1135 Farmers Lane | Santa Rosa | 95405 | 707-542-2650 | Mon-Fri 8:30am-4pm |
Santa Rosa Seventh Day Adventist Church | 840 Sonoma Ave | Santa Rosa | 95404 | 707-578-8883 | 2nd & 4th Mon 4:30pm-6pm; 1st & 3rd Thu 4:30pm-6pm |
Santa Rosa Veterans Memorial Building | 1351 Maple Ave | Santa Rosa | 95404 |  | Thu 8:30am-9:30am and 3:30pm-4:30pm |
Shiloh Neighborhood Church | 5901 Old Redwood Hwy | Santa Rosa | 95403 |  | Wed 10:30am-11:30am |
Sons of Norway | 617 W 9th St | Santa Rosa | 95401 |  | Wed 11am-12pm |
Southwest Community Park | 1698 Hearn Ave | Santa Rosa | 95407 |  | Wed, Fri 8:30am-9:30am |
St. Eugene Cathedral SVdP | 2323 Montgomery Dr | Santa Rosa | 95405 |  | Tue 10am-2pm; Wed 12pm-2pm |
St. Rose Church SVdP | 340 10th St | Santa Rosa | 95401 | 707-584-1579 | Mon, Wed, Fri 1pm-2pm (call for appointment) |
Taylor Mountain Elementary | 1210 East Bellevue Ave | Santa Rosa | 95407 |  | Thu 9:30am-10:30am |
VA Clinic South (veterans and active duty only) | 2285 Challenger Way | Santa Rosa | 95407 |  | Thu 1:30pm-2:45pm |
Valley Oak Park | 2600 Northcoast St | Santa Rosa | 95403 |  | 2nd Fri 9:30am-10:30am |
Vintage at Bennett Valley | 1405 Townview Ave | Santa Rosa | 95405 |  | 3rd Fri 9:30am-10:30am |
Vintage Zinfandel Apartments | 2037 Zinfandel Ave | Santa Rosa | 95403 |  | 1st & 3rd Tue 11:30am-12:30pm |
Voices Sonoma Youth Center | 2800 Cleveland Avenue Suite C | Santa Rosa | 95403 | 707-579-4327 | Tue-Fri 1pm-6pm |
Rotary Club Sebastopol Sunrise Lunch Sack | 7433 Bodega Ave | Sebastopol | 95472 | 707-280-4360 | Mon, Thu 6:30am-10am; Mon-Thu 10am-12pm |
Sebastopol Inter-Church Food Pantry | 500 Robinson Rd | Sebastopol | 95472 |  | Mon, Wed, Fri 10am-12pm |
Sebastopol SDA Community Service | 1665 Gravenstein Hwy N | Sebastopol | 95472 |  | 1st & 3rd Wed 8:30am-12pm |
St. Sebastian Church | 7983 Covert Ln | Sebastopol | 95472 |  | Thu 3:30pm-4:30pm; 2nd Wed 9:30am-10:30am |
WCHC Teen Clinic | 652 Petaluma Ave Suite F | Sebastopol | 95472 | 707-887-0427 | Mon-Thu 1:30pm-5pm |
Alta Madrone SAHA | 1269 Broadway | Sonoma | 95476 |  | 1st & 3rd Tue 12:30pm-1:15pm |
El Verano Elementary | 18606 Riverside Dr | Sonoma | 95476 |  | 1st & 3rd Sat 9:30am-10:30am |
FAHA Manor Apartments | 191 W Verano Ave | Sonoma | 95476 |  | 1st Tue 1pm-1:45pm |
FISH of Sonoma | 18330 Sonoma Hwy | Sonoma | 95476 |  | Mon-Fri 1:30pm-2:30pm |
Oak Ridge Senior Apartments | 18800 Beatrice Dr | Sonoma | 95476 |  | 2nd Tue 1pm-1:45pm |
Seven Flags Mobile Park | 1400 Watmaugh Rd | Sonoma | 95476 |  | 4th Tue 1pm-1:45pm |
Sonoma Creek Senior Housing | 809 Oregon St | Sonoma | 95476 |  | 3rd Tue 1pm-1:45pm |
Sonoma Family Meal, Unity Kitchen | 17400 Sonoma Hwy | Sonoma | 95476 |  | Mon-Fri 9am-1pm |
Sonoma SDA Church Open Pantry | 20575 Broadway | Sonoma | 95476 |  | Thu 12pm-12:30pm |
Sonoma Valley Community Health Center | 19270 Sonoma Hwy | Sonoma | 95476 |  | 1st & 3rd Fri 8:30am-9:30am |
St. Andrew Presbyterian Church | 16290 Arnold Dr | Sonoma | 95476 |  | Tue 4pm-5pm; Fri 9:30am-10:30am |
St. Leo Church SVdP | 601 Agua Caliente Rd W | Sonoma | 95476 |  | Tue 8:30am-9:30am; Wed, Thu, Fri 11:30am-12pm |
Alliance Medical Center - Windsor | 8465 Old Redwood Hwy | Windsor | 95492 |  | Fri 9am-9:15am |
Forest Winds Apartments | 6697 Old Redwood Hwy | Windsor | 95492 |  | 1st Tue 1pm-1:30pm |
Keiser Park | 700 Windsor River Rd | Windsor | 95492 |  | Wed 1:30pm-2:30pm |
Nuestra Comunidad Bluebird Campus | 21 Bluebird Dr Bldg D | Windsor | 95492 |  | 2nd & 4th Fri 10am-11am |
Our Lady of Guadalupe Church | 8400 Old Redwood Hwy | Windsor | 95492 |  | Sat 8am-9am |
Vinecrest Senior Apartments | 8400 Hembree Ln | Windsor | 95492 |  | 1st Tue 11am-12pm |
Windsor Presbyterian Church | 251 Windsor River Rd | Windsor | 95492 | 707-838-1566 | Tue 8:30am-10am |
Windsor Senior Center | 9231 Foxwood Dr | Windsor | 95492 |  | 1st & 3rd Fri 10am-11am |
Windsor Service Alliance | 8987 Windsor Rd | Windsor | 95492 | 707-838-6947 | Fri 1pm-4pm (drive-thru) |
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
      source: 'Hand-collected list (Sierra County, Siskiyou/Great Northern Services, Food Bank of Contra Costa & Solano, Redwood Empire Food Bank). Schedules parsed via LA clause parser.',
      note: 'Drop-in raw for prepare-food-additions.mjs. Single-time entries route to _deferred.',
    },
    sites,
  };
  writeFileSync(`./${county}Additions-raw.json`, JSON.stringify(out, null, 2));
  console.log(`\n=== ${county}: ${sites.length} sites | ${withEvents} with events | ${sites.length - withEvents} deferred | ${flags.filter((f) => f.includes('no street')).length} city-level ===`);
}
