/*
 * build-food-batch15.mjs — Inyo, Contra Costa, Del Norte, El Dorado (net-new). FINAL batch.
 * Pipe-delimited: Name | Street | City | ZIP | Phone | Schedule | Website
 */
import { writeFileSync } from 'node:fs';
import { parseBlock } from './food-schedule-lib.mjs';

const CCS = 'https://www.foodbankccs.org/find-food/';
const EDC = 'https://www.foodbankedc.org/find-a-food-distribution-site';

const COUNTIES = {
  Inyo: {
    rows: `
Mendenhall Park (IMACA drive-thru distribution) | 327 N. School St | Big Pine | 93513 | (760) 873-8557 | Monthly 9-10am (date varies) | https://www.imaca.net/
Eastern Sierra Tri-County Fairgrounds (monthly distribution) | 1234 Sierra St | Bishop | 93514 | (760) 873-8557 | Monthly 3-4pm (date varies) |
First United Methodist Church (soup kitchen) | 205 N Fowler St | Bishop | 93514 | (760) 872-7701 | Mon, Wed, Fri 12pm |
Salvation Army - Bishop | 137 S Main St | Bishop | 93514 | (760) 872-2124 | Mon-Fri 9am-1:30pm |
Timbisha Shoshone Tribe | 621 W Line St Suite 109 | Bishop | 93514 |  | Tue & Fri 8am-5pm |
Darwin - IMACA Food Shed | 251 Reddy St | Darwin | 93522 | (760) 873-8557 | Monthly 12-12:30pm (date varies) |
Independence Park (IMACA drive-thru distribution) | 609 S Edwards St | Independence | 93526 | (760) 873-8557 | Monthly 10-10:30am (date varies) |
Keeler Volunteer Fire Station (IMACA distribution) | Old State Hwy | Keeler | 93530 | (760) 873-8557 | Monthly 10:30-11am (date varies) |
Lone Pine Sports Complex (IMACA drive-thru distribution) | 724 N Main St | Lone Pine | 93545 | (760) 873-8557 | Monthly 12-1pm (date varies) |
Tecopa Community Center (IMACA distribution) | 400 Tecopa Hot Springs Rd | Tecopa | 92389 | (760) 873-8557 | Monthly 11:30am-12pm (date varies) |
`,
  },
  ContraCosta: {
    rows: `
Agape International Church & Ministries | 605 W Madill St | Antioch | 94509 | 925-709-4424 | Thu 1-3pm | ${CCS}
AMF Food Closet | 2507 San Jose Dr | Antioch | 94509 | 925-757-1672 | Wed & Thu 9am-12pm | ${CCS}
Antioch Community Center | 4703 Lone Tree Way | Antioch | 94531 |  | 2nd & 4th Wed 9-10am | ${CCS}
Antioch Covenant Church - Gracefully Broken | 1919 Buchanan Rd | Antioch | 94509 | 925-207-6241 | Tue 11am-1pm | ${CCS}
Antioch Health Center | 2335 Country Hills Dr | Antioch | 94509 |  | 2nd & 4th Mon 10-11am | ${CCS}
CalFresh Office (EHSD) | 4545 Delta Fair Blvd | Antioch | 94509 |  | 1st & 3rd Fri 11am-12pm | ${CCS}
Carmen Dragon Elementary School | 4721 Vista Grande Dr | Antioch | 94509 |  | 2nd & 4th Sat 12-1pm | ${CCS}
Chosen Remnant | 2400 Sycamore Dr #29 | Antioch | 94509 | 925-504-3515 | Fri 12pm-1pm | ${CCS}
Contra Costa Event Park (Fairgrounds) | 1201 W 10th St | Antioch | 94509 |  | 1st Tue 10am-12pm | ${CCS}
En Su Habitacion | 2808 Harbour Dr | Antioch | 94509 | 925-759-0861 | Thu 11:30am-12:30pm | ${CCS}
First Family Church | 3195 Contra Loma Blvd | Antioch | 94509 | 925-706-1238 | Sat 9:30-10:30am; 1st & 3rd Wed 9-10am | ${CCS}
Genesis Church | 525 E 18th St | Antioch | 94509 | 925-304-4474 | Sat 8:30-10am | ${CCS}
Grace Closet | 3415 Oakley Rd | Antioch | 94509 | 925-522-2017 | Wed 4-6pm; Sat 12-2pm | ${CCS}
Grace Temple COGIC | 1001 Fitzuren Rd | Antioch | 94509 | 925-759-8049 | Fri 12-1pm | ${CCS}
Kings Chapel | 320 Worrell Rd | Antioch | 94509 | 925-756-7315 | 1st Fri by appointment only | ${CCS}
Light Ministries Church Soup Kitchen | 415 West 6th St | Antioch | 94509 | 925-778-1639 | Sat 12-12:30pm | ${CCS}
Light Ministries Pantry | 415 W 6th St | Antioch | 94509 | 925-778-1639 | Sat 11am-12pm | ${CCS}
Loaves and Fishes at Antioch Senior Center | 415 W 2nd St | Antioch | 94509 | 925-293-4792 | Wed 10:30-11am | ${CCS}
Loaves and Fishes at Veterans Memorial Building | 403 W 6th St | Antioch | 94509 | 925-293-4792 | Mon-Fri 11am-12:45pm | ${CCS}
Mahogany Way KinderCare | 2300 Mahogany Way | Antioch | 94590 |  | 2nd & 4th Thu 4-5pm | ${CCS}
Marsh Elementary School | 2304 G St | Antioch | 94509 |  | 2nd & 4th Sat 2-3pm | ${CCS}
Mission Elementary School | 1711 Mission Dr | Antioch | 94509 |  | 2nd & 4th Wed 4-5pm | ${CCS}
Most Holy Rosary Catholic Church | 1313 A St | Antioch | 94509 |  | 1st & 3rd Fri 1:30-2:30pm | ${CCS}
Rivertown Veterans Thrift Store & Resource Center | 3646 Lone Tree Way | Antioch | 94509 | 925-206-4976 | Wed 10:30am-12pm | ${CCS}
Showers of Blessings | 2220 A St | Antioch | 94509 | 510-736-8477 | Mon, Wed & Fri 6-7:30pm | ${CCS}
St. Ignatius of Antioch | 3351 Contra Loma Blvd | Antioch | 94509 |  | 1st & 3rd Fri 3:30-4:30pm | ${CCS}
Templo Santo Community Church | 201 E 18th St | Antioch | 94509 |  | 2nd & 4th Sat 10-11am; 2nd & 4th Thu 10-11am | ${CCS}
The Landing Place | 620 E Tregallas Rd | Antioch | 94509 | 925-513-5180 | 2nd & 4th Wed 12-1pm; Wed 9:30-10:45am | ${CCS}
The Most Holy Rosary Church (SVdP) | 21 E 15th St | Antioch | 94509 | 925-757-0941 | Tue-Thu 9-10am | ${CCS}
The Reach Church | 11 Texas St | Antioch | 94509 |  | 2nd & 4th Wed 2-3pm | ${CCS}
Visions Christian Center | 330 Worrell Rd | Antioch | 94509 | 925-777-0290 | Thu 11am-12pm | ${CCS}
West River Town Apartments | 811 W 4th St | Antioch | 94509 |  | 2nd & 4th Sun 2:30-3:30pm | ${CCS}
Ambrose Community Center | 3105 Willow Pass Rd | Bay Point | 94565 |  | 1st & 3rd Thu 4-5pm; 2nd Wed 10am-12pm | ${CCS}
Delta Baptist Church | 500 Pacifica Ave | Bay Point | 94565 |  | Tue 1pm-2pm | ${CCS}
First AME Community Church | 2915 Willow Pass Rd | Bay Point | 94565 | 925-293-4792 | 2nd & 4th Thu 9-10am; Thu 10:30-11:30am | ${CCS}
Loaves and Fishes at West Pittsburg Community Church | 204 Bailey Rd | Bay Point | 94565 | 510-619-8039 | Tue 11am-12:30pm | ${CCS}
Queen of the World (SVdP) | 3155 Winterbrook Dr | Bay Point | 94565 | 925-458-4718 | Wed 11am-12pm | ${CCS}
Rio Vista Elementary School | 611 Pacifica Ave | Bay Point | 94565 |  | 1st & 3rd Tue 4-5pm | ${CCS}
Family Worship Center | 1200 Taylor Rd | Bethel Island | 94511 | 925-250-7941 | Tue 11am-12pm | ${CCS}
New Covenant Church | 6080 Bethel Island Rd | Bethel Island | 94511 | 925-634-6625 | Tue 10:30-11:15am; 1st & 3rd Sun 1-2pm; Thu 4-5:30pm | ${CCS}
Brentwood Community United Methodist Church | 218 Pine St | Brentwood | 94513 | 925-382-9967 | 2nd & 4th Tue 4-5pm; Mon & Wed 9-11:30am | ${CCS}
Brentwood Senior Center | 193 Griffith Ln | Brentwood | 94513 |  | 2nd & 4th Thu 10-11am | ${CCS}
Immaculate Heart of Mary Church | 500 Fairview Ave | Brentwood | 94513 | 925-676-7543 | 2nd & 4th Tue 12-1pm; Fri 11am-12pm | ${CCS}
Power for Living Ministries | 6830 Lone Tree Way | Brentwood | 94513 | (925) 418-1418 | Fri 12pm | ${CCS}
Seed of Faith Church | 605 Harvest Park Dr | Brentwood | 94513 | 925-513-2970 | 2nd & 4th Sat 10-11am | ${CCS}
Support Life Foundation Brentwood | 7701 Lone Tree Way | Brentwood | 94513 | 510-541-6293 | Fri 10:30-11:15am | ${CCS}
The Dwelling Place Church | 90 Village Dr | Brentwood | 94513 |  | 1st & 3rd Sun 3-4pm | ${CCS}
Delta Christian Community Food Pantry - Byron | 2800 Camino Diablo | Byron | 94514 | 925-634-6625 | Tue 8:30-9:15am | ${CCS}
Cambridge Elementary School | 1135 Lacey Ln | Concord | 94520 |  | 1st & 3rd Sat 12-1pm | ${CCS}
Concord International Seventh-day Adventist | 1655 West St | Concord | 94521 | 925-349-9298 | Thu 5-6:30pm | ${CCS}
Concord Senior Center | 2727 Parkside Circle | Concord | 94519 |  | 1st & 3rd Thu 9:30-10:30am | ${CCS}
Good Shepherd Lutheran Church | 4000 Clayton Rd | Concord | 94521 | 925-768-9087 | 1st and 3rd Thu 9-10am; Mon, Tue, Wed & Fri 10:30am-12:30pm | ${CCS}
La Clinica Monument | 2000 Sierra Rd | Concord | 94518 |  | 2nd & 4th Sun 10-11am | ${CCS}
Monument Crisis Center | 1990 Market St | Concord | 94520 | 925-825-7751 | 2nd & 4th Mon 2-3pm; Mon-Wed 9am-12pm | ${CCS}
Mt. Diablo Adult Education (Loma Vista) | 1266 San Carlos Ave | Concord | 94518 |  | 1st & 3rd Thu 2-3pm | ${CCS}
Mt. Diablo High School | 2611 East St | Concord | 94520 |  | 1st & 3rd Sat 2-3pm | ${CCS}
Queen of All Saints (SVdP) | 2390 Grant St | Concord | 94520 | 925-609-5944 | Wed 10am-12pm; 3rd Sat 10-11am | ${CCS}
Refuge Outreach Services | 1187 Meadow Ln | Concord | 94520 | 925-435-6766 | Tue 3:30-5:30pm | ${CCS}
Salvation Army Concord | 3950 Clayton Rd | Concord | 94521 | 925-676-6180 | Mon, Tue, Wed & Fri 10-11:45am & 1-2:45pm | ${CCS}
SHARE (First Christian Church) | 3039 Willow Pass Rd | Concord | 94519 | 925-827-4273 | Mon, Tue, Wed & Fri 10am-1:30pm | ${CCS}
St. Bonaventure's Church | 5562 Clayton Rd | Concord | 94521 | 925-672-5800 | 1st & 3rd Wed 4-5pm; Tue 8:30-10am | ${CCS}
St. Francis of Assisi (SVdP) | 860 Oak Grove Rd | Concord | 94518 | 925-682-5811 | Wed & Sat 9-11:30am | ${CCS}
The Bay Church Compassion Ministries | 4725 Evora Rd | Concord | 94520 | 925-458-9100 | Sat 11:30am-1pm | ${CCS}
We Love Our City at Father's House East Bay | 2140 Olivera Ct | Concord | 94520 | 707-454-0268 | Sat 8:45-10am | ${CCS}
WIC Concord | 2731 Systron Drive | Concord | 94518 |  | 1st & 3rd Wed 2-3pm | ${CCS}
St. Jerome Catholic Church | 308 Carmel Ave | El Cerrito | 94530 | 510-809-5377 | Wed 11am-12pm | ${CCS}
St. John Church (SVdP) | 11150 San Pablo Ave | El Cerrito | 94530 | 510-232-5659 | 1st & 3rd Sat 10-11am | ${CCS}
Appian Way Seventh-day Adventist Church | 980 Appian Way Bldg A | El Sobrante | 94803 | 925-642-2651 | Wed 10am-12pm | ${CCS}
Moose Lodge #550 | 4660 Appian Way | El Sobrante | 94803 |  | 1st & 3rd Fri 10-11am; Last Fri 10am-12pm | ${CCS}
Salvation Army El Sobrante | 4600 Appian Way | El Sobrante | 94803 | 510-262-0500 | Thu 10am-12pm & 1-2:30pm | ${CCS}
St. Callistus Catholic Church (SVdP) | 3580 San Pablo Dam Rd | El Sobrante | 94803 | 510-243-7501 | Mon & Thu 11am-12pm | ${CCS}
Hercules Senior Center | 111 Civic Center | Hercules | 94547 |  | 2nd & 4th Tue 10-11am | ${CCS}
Hercules Senior Center Produce | 111 Civic Dr | Hercules | 94547 |  | 1st & 3rd Tue 11am-12pm | ${CCS}
Delta Christian Community Food Pantry - Knightsen | 3090 Curlew Connex | Knightsen | 94548 | 925-634-6625 | Tue 9:30-10:15am | ${CCS}
Boys & Girls Club of Contra Costa | 1301 Alhambra Ave | Martinez | 94553 |  | 2nd & 4th Fri 12-1pm | ${CCS}
John Muir Elementary School | 205 Vista Way | Martinez | 94553 |  | 2nd & 4th Fri 4-5pm | ${CCS}
Loaves and Fishes of Contra Costa | 835 Ferry St | Martinez | 94553 | 925-293-4792 | Mon-Sun 11am-12:45pm | ${CCS}
Martinez Adult Education | 600 F St | Martinez | 94553 | 925-335-5890 | Tue 2-3pm | ${CCS}
Martinez Health Center | 2500 Alhambra Blvd | Martinez | 94553 |  | 2nd & 4th Mon 12-1pm | ${CCS}
Second Baptist Church of Martinez | 1020 Las Juntas | Martinez | 94553 | 925-228-3860 | 2nd & 4th Sat 11am-12pm | ${CCS}
St. Catherine's (SVdP) | 1125 Ferry St | Martinez | 94553 | 925-788-7409 | Sat 9:30-10:30am | ${CCS}
Teamsters Local 315 Hall | 2727 Alhambra Ave | Martinez | 94553 |  | 1st & 3rd Thu 9-10am | ${CCS}
Loaves and Fishes at Redman-Pocahontas Hall | 1403 Main St | Oakley | 94561 | 925-293-4792 | Mon-Fri 11am-12:45pm | ${CCS}
Oakley Senior Center | 971 O'Hara Avenue | Oakley | 94561 | 925-783-0818 | Thu 1-2pm | ${CCS}
St. Anthony's Catholic Church | 971 O'Hara Ave | Oakley | 94561 | 925-325-7424 | 2nd & 4th Thu 9-10:30am; 2nd & 4th Sat 9-10am | ${CCS}
The Commons at Oakley | 69 Carol Ln | Oakley | 94561 |  | 2nd & 4th Tue 2-3pm | ${CCS}
Pacheco Community Center | 5800 Pacheco Blvd | Pacheco | 94553 |  | 1st & 3rd Wed 12-1pm | ${CCS}
City of Pinole | 2500 Charles Ave | Pinole | 94564 |  | 2nd Mon 9-10am; 2nd & 4th Tue 10-11am | ${CCS}
Buchanan Park | 4150 Harbor St | Pittsburg | 94565 |  | 1st & 3rd Tue 12-1pm | ${CCS}
Church of the Good Shepherd | 3200 Harbor St | Pittsburg | 94565 | 925-432-6404 | 2nd & 4th Thu 10-11am; Mon 11:30am-1:30pm; Sat 11am-1pm | ${CCS}
Diane Avenue Church of Christ | 283 Diane Ave | Pittsburg | 94565 | 925-432-6040 | 2nd & 4th Thu 10-11:30am; 3rd Fri 11am-12:30pm | ${CCS}
El Pueblo Housing Development | 875 El Pueblo Ave | Pittsburg | 94565 |  | 2nd & 4th Sun 12:30-1:30pm | ${CCS}
First Baptist Church | 224 Linda Vista Ave | Pittsburg | 94565 | 925-473-2018 | 1st & 3rd Thu 11:30am-12:30pm; Tue & Thu 9am-4pm | ${CCS}
Greater Faith Missionary Baptist Church | 4150 Railroad Ave | Pittsburg | 94565 | 925-322-5728 | 2nd & 4th Sat 9-10am | ${CCS}
Loaves and Fishes at St. Vincent de Paul Building | 1415 Simpson Ct | Pittsburg | 94565 | 925-293-4792 | Mon-Sun 11am-12:45pm | ${CCS}
Loaves and Fishes at Stoneman Village | 390 E Leland Rd | Pittsburg | 94565 | 925-293-4792 | Mon and Fri 11am-12pm | ${CCS}
New Destiny Church | 1411 E Leland Rd | Pittsburg | 94565 | 925-439-8989 | 1st & 3rd Fri 1:30-3:30pm | ${CCS}
Pittsburg City Park | 60 Civic Ave | Pittsburg | 94565 |  | 1st & 3rd Tue 2-3pm; 4th Tue 10am-12pm | ${CCS}
Pittsburg Historical Museum | 525 Railroad Ave | Pittsburg | 94565 |  | 2nd & 4th Thu 12-1pm | ${CCS}
Pittsburg United Methodist Church | 153 W Leland Rd | Pittsburg | 94565 | 925-432-7614 | Fri 12:30-1pm | ${CCS}
Solomon Temple | 655 California Ave | Pittsburg | 94565 |  | 2nd & 4th Thu 2-3pm | ${CCS}
St. Peter's Martyr Church (SVdP) | 740 Black Diamond St | Pittsburg | 94565 | 925-432-4771 | 2nd & 4th Fri 10-11am | ${CCS}
St. Vincent de Paul Society Pittsburg | 2210 Gladstone Dr | Pittsburg | 94565 | 925-439-5060 | Mon-Fri 8:30am-4:30pm | ${CCS}
WIC Pittsburg | 2311 Loveridge Rd | Pittsburg | 94565 |  | 1st & 3rd Thu 1:30-2:30pm | ${CCS}
Hillcrest Congregational Church | 404 Gregory Ln | Pleasant Hill | 94523 | 925-689-8260 | Mon, Wed & Fri 9-11:45am; 2nd & 4th Fri 2-3pm; Tue & Thu 10-11am | ${CCS}
Pleasant Hill Senior Center | 233 Gregory Lane | Pleasant Hill | 94523 |  | 1st & 3rd Thu 9-10am | ${CCS}
Pleasant Hill Seventh-day Adventist | 816 Grayson Rd | Pleasant Hill | 94523 | 925-939-2235 | Tue & Thu 11am-4pm | ${CCS}
Bay Area Rescue Mission (meals) | 200 Macdonald Ave | Richmond | 94801 | 510-215-4884 | Mon-Sun 6-7:45am, 11am-1pm and 4-5:45pm | ${CCS}
Bay Area Rescue Mission Pantry | 123 Macdonald Ave | Richmond | 94801 | 510-215-4884 | Mon-Sat 1-2:30pm | ${CCS}
Beacon Light Seventh-day Adventist Food Pantry | 607 S 19th St | Richmond | 94804 | 510-234-7771 | 2nd & 4th Wed 9-10am | ${CCS}
Booker T. Anderson Center | 960 S 47th St | Richmond | 94804 |  | 2nd & 4th Sat 12-1pm | ${CCS}
Corrine Sain Senior & Family Community Center | 515 Silver Ave | Richmond | 94801 | 510-221-2538 | 2nd & 4th Fri 10:30-11:30am; Tue-Fri 9-11am | ${CCS}
Ephesians Community Development Center | 2887 Foothill Ave | Richmond | 94804 | 510-778-1528 | Wed 11am-1:30pm | ${CCS}
GRIP Souper Center (meals) | 165 22nd St | Richmond | 94801 | 510-233-2141 | Mon-Sun 11:30am-12:45pm | ${CCS}
Kennedy High School | 4300 Cutting Blvd | Richmond | 94804 |  | 1st & 3rd Sat 2-3pm | ${CCS}
LifeLong William Jenkins Health Center | 150 Harbour Way | Richmond | 94801 | 510-981-4100 | Wed 10am-12pm | ${CCS}
Living Hope Neighborhood Church | 2800 Rheem Ave | Richmond | 94804 | 510-233-7353 | 1st & 3rd Sat 10-11am; Fri 10:30am-12:30pm | ${CCS}
MacDonald 80 Shopping Center | 4500 Macdonald Ave | Richmond | 94805 |  | 1st & 3rd Thu 2-3pm | ${CCS}
Multicultural Institute | 3600 MacDonald Ave | Richmond | 94805 | 510-847-1479 | Thu 9-11am | ${CCS}
Nevin Community Center | 598 Nevin Ave | Richmond | 94804 |  | 2nd & 4th Tue 10-11am | ${CCS}
New Gethsemane COGIC | 2100 Roosevelt St | Richmond | 94801 | 510-620-9628 | Wed 10am-12pm | ${CCS}
North Richmond Missionary Baptist Church | 1427 Fred Jackson Way | Richmond | 94801 | 510-232-7751 | 1st & 3rd Thu 12-1pm; 2nd Fri 10am-12pm; Wed 10:30-11:30am | ${CCS}
Pilgrim Rest Missionary Baptist Church Pantry | 831 S 43rd St | Richmond | 94804 |  | Mon 1-2pm | ${CCS}
Providence Baptist Church | 314 S 12th St | Richmond | 94804 | 510-234-1162 | 3rd Thu 11:30am-1:30pm | ${CCS}
Richmond Civic Center | 24 Barrett Ave | Richmond | 94804 |  | 2nd & 4th Thu 12-1:30pm | ${CCS}
Richmond Emergency Food Pantry | 2369 Barrett Ave | Richmond | 94804 | 510-235-9732 | Tue & Fri 11am-2pm | ${CCS}
Sojourner Truth Presbyterian Church | 2621 Shane Dr | Richmond | 94806 | 510-222-2020 | 1st & 3rd Sat 12-1pm; 3rd Sat 1-3pm | ${CCS}
Southside Church of Christ | 1501 Florida Ave | Richmond | 94804 |  | 4th Tue 10-11:30am; 2nd & 4th Fri 10:30-11:30am | ${CCS}
St. John Missionary Baptist Church | 662 S 52nd St | Richmond | 94804 | 714-323-6152 | Tue 12-1pm | ${CCS}
Support Life Foundation Richmond | 1110 36th St | Richmond | 94804 | 510-541-6293 | Fri 10-11am | ${CCS}
True Fellowship Baptist Church | 1213 Fred Jackson Way | Richmond | 94801 | 510-215-8322 | 3rd Sat 11am-12pm | ${CCS}
Veteran's Memorial Hall | 968 23rd St | Richmond | 94804 |  | 1st & 3rd Mon 12:30-2pm | ${CCS}
West Contra Costa Adult Education | 5625 Sutter Ave | Richmond | 94804 |  | 1st & 3rd Mon 9:30-11am | ${CCS}
Bayo Vista Child Care Center | 2 California St | Rodeo | 94572 |  | 2nd & 4th Thu 4-5pm; 2nd Tue 10am-12pm | ${CCS}
Lefty Gomez Recreational Center | 470 Parker Ave | Rodeo | 94572 |  | 1st & 3rd Mon 12-1pm | ${CCS}
Rodeo Senior Center | 189 Parker Ave | Rodeo | 94572 |  | 2nd & 4th Fri 9-10am | ${CCS}
Anchor of Life Church | 2707 17th St | San Pablo | 94806 | 510-815-5651 | Wed 4:30-6pm | ${CCS}
Contra Costa College | 2600 Mission Bell Dr | San Pablo | 94806 |  | 1st & 3rd Mon 1:30-3pm | ${CCS}
Davis Park Community Center | 1651 Folsom Ave | San Pablo | 94806 |  | 2nd & 4th Fri 11:30-12:30pm | ${CCS}
Family Church Ministries | 1452 Rumrill Blvd | San Pablo | 94806 | 510-867-5957 | Wed 10am-12pm | ${CCS}
San Pablo City Hall | 1000 Gateway Ave | San Pablo | 94806 |  | 2nd & 4th Sat 2-3pm | ${CCS}
San Pablo Food Pantry | 2301 Rumrill Blvd Room 27 | San Pablo | 94806 | 510-232-0258 | Mon & Wed 12-1pm | ${CCS}
San Pablo Library - Community Room | 13751 San Pablo Ave | San Pablo | 94806 |  | 1st & 3rd Fri 9:30-10:30am | ${CCS}
St. Paul Conference SVdP | 1850 Church Lane | San Pablo | 94806 | 510-691-6404 | Thu 11am-2pm | ${CCS}
San Ramon Valley Islamic Center | 3223 Crow Canyon Rd | San Ramon | 94583 | 925-480-9611 | 1st & 3rd Sat 11am-1pm | ${CCS}
St. Mary's Catholic Church (SVdP) | 1186 Bont Lane | Walnut Creek | 94596 | 925-937-2817 | Thu 12:30-4:30pm | ${CCS}
St. Paul's Episcopal Church | 1924 Trinity Avenue | Walnut Creek | 94596 |  | 3rd Thu 10-11:30am | ${CCS}
St. Paul's Trinity Center (meals) | 1888 Trinity Ave | Walnut Creek | 94596 | 925-949-8712 | Mon-Fri 8-9am & 12:15-1:15pm | ${CCS}
Support Life Foundation Walnut Creek | 2449 Buena Vista Ave Ste 3 | Walnut Creek | 94597 | 510-541-6293 | Fri 10-11am | ${CCS}
Walnut Creek Church of Christ | 500 Minert Rd | Walnut Creek | 94598 | 925-825-7810 | 1st & 3rd Thu 10am-12pm | ${CCS}
Walnut Creek United Methodist Church | 1543 Sunnyvale Ave | Walnut Creek | 94596 |  | 1st & 3rd Thu 9:30-10:30am | ${CCS}
`,
  },
  DelNorte: {
    rows: `
Fort Dick Bible Church (Rural Human Services commodities) | 6725 Lake Earl Dr | Crescent City | 95531 | (707) 464-7441 | Tue of 1st full week of the month 12:30-2pm |
Hiouchi Hamlet Store (Rural Human Services commodities) | 2100 US-199 | Crescent City | 95531 | (707) 464-7441 | Tue of 2nd full week of the month 12:30-2pm |
Our Daily Bread Ministries (meals) | 1135 Harrold St | Crescent City | 95531 | (707) 464-7771 | Dinner Mon, Wed, Fri 5pm; breakfast Thu & Sun 8am |
Pacific Pantry (Family Resource Center of the Redwoods) | 494 Pacific Ave | Crescent City | 95531 | (707) 464-0955 | Thu 2-5pm; Fri 2-4pm; 1st & 3rd Sat 11am-1pm | https://ruralhumanservices.net
Rural Human Services Food Bank | 286 M St Suite D | Crescent City | 95531 | (707) 464-7441 | Wed & Thu 9am-2pm | https://ruralhumanservices.net
St. Vincent de Paul | 1440 Parkway Dr | Crescent City | 95531 | (707) 464-1322 | Mon-Fri 10am-1pm |
American Legion Hall (Rural Human Services commodities) | 1555 Gasquet Flat Rd | Gasquet | 95543 | (707) 464-7441 | Tue of 2nd full week of the month 10-11:30am |
Klamath Community & Senior Center (Rural Human Services commodities) | 219 Salmon Ave | Klamath | 95548 | (707) 464-7441 | Tue of 3rd full week of the month 10-11:30am |
Howonquet Hall (Pacific Pantry mobile market) | 101 Indian Ct | Smith River | 95567 | (707) 464-0955 | 3rd Tue 10am-12pm |
Smith River United Methodist Church (Rural Human Services commodities) | 121 N Beckstead Ave | Smith River | 95567 | (707) 464-7441 | Tue of 1st full week of the month 10-11:30am |
`,
  },
  ElDorado: {
    rows: `
Faith Episcopal Church | 2200 Country Club Dr | Cameron Park | 95682 |  | 1st Thu 10am-12pm | ${EDC}
Hillside Church | 4060 Flying C Rd #35 | Cameron Park | 95682 |  | 4th Thu 5-6pm | ${EDC}
Light of the Hills Church | 3100 Rodeo Rd | Cameron Park | 95682 |  | 1st, 2nd & 3rd Tue 11am-12pm | ${EDC}
Camino Seventh-day Adventist Church | 3520 Carson Rd | Camino | 95709 |  | Wed 9am-12pm | ${EDC}
El Dorado Community Church | 4701 Church St | El Dorado | 95623 | (530) 303-3734 | 2nd & 4th Fri 10am-1pm | ${EDC}
Bayside Church (Hills Church campus) | 800 White Rock Rd | El Dorado Hills | 95762 |  | 2nd & 4th Tue 10-11:30am | ${EDC}
House of Prayer | 7901 Hwy 193 | Garden Valley | 95633 |  | 2nd & 4th Wed 11am-2pm | ${EDC}
St. James Church | 2831 Harkness Rd | Georgetown | 95634 |  | 3rd Thu 10:30am-12:30pm | ${EDC}
VFW Hall | 6297 Main St | Georgetown | 95634 |  | 1st Fri 1-3pm | ${EDC}
Calvary Chapel on the Georgetown Divide | 3757 Hwy 193 | Greenwood | 95635 | (530) 823-1622 | Tue 12-2pm | ${EDC}
Grizzly Flats Community Church (parking lot) | 5061 Sciaroni Rd | Grizzly Flats | 95636 |  | 1st & 3rd Sat 1pm | ${EDC}
Green Valley Community Church | 3500 Missouri Flat Rd | Placerville | 95667 | (530) 622-3231 | Sat 9-11am | ${EDC}
MORE Workshop parking lot (PantryToGo) | 337 Placerville Dr | Placerville | 95667 | (530) 306-6022 | 2nd Thu 10am-12pm | ${EDC}
Placerville Seventh-day Adventist Church | 6831 Mother Lode Dr | Placerville | 95667 |  | 2nd & 4th Wed 9am-12pm | ${EDC}
S.H.A.R.E. at Federated Church | 1031 Thompson Way | Placerville | 95667 |  | Mon, Wed, Fri 10am-12pm | ${EDC}
Upper Room Dining Hall (meals) | 1868 Broadway | Placerville | 95667 | (530) 621-7730 | Mon-Fri 11am-5:30pm; Sat, Sun 2-5:30pm | ${EDC}
Pollock Pines Community Center | 2675 Sanders Dr | Pollock Pines | 95726 |  | 3rd Wed 10am-12pm | ${EDC}
Pollock Pines Community Church | 6361 Pony Express Trail | Pollock Pines | 95726 |  | 2nd & 4th Fri 11:30am-1pm | ${EDC}
Community Hub Day | 6740 Fairplay Rd | Somerset | 95684 |  | 3rd Wed 11:30am-1pm | ${EDC}
Pioneer Bible Church | 6851 Mt. Aukum Rd | Somerset | 95684 |  | 2nd & 4th Fri 1-2pm | ${EDC}
American Legion Post 795 (FBNN mobile distribution) | 2748 Lake Tahoe Blvd | South Lake Tahoe | 96150 | (775) 331-3663 | Monthly about 11am-1pm (date varies) |
Bread & Broth (St. Theresa Grace Hall) | 1041 Lyons Ave | South Lake Tahoe | 96150 | (916) 837-4201 | Mon 4-5:30pm |
Christmas Cheer All Year | 1120 3rd St | South Lake Tahoe | 96150 | (530) 542-4934 | Tue, Wed, Thu 11am-2pm |
South Lake Tahoe Family Resource Center | 3501 Spruce Ave Suite B | South Lake Tahoe | 96150 |  | Mon & Wed 8am-6pm; Tue, Thu, Fri 8am-4:30pm; Sat 9-11am |
Tahoe Coalition for the Homeless (Red Lodge drop-in) | 1137 Emerald Bay Rd | South Lake Tahoe | 96150 | (530) 600-2822 | Tue & Fri 10am-2pm |
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
      source: 'Hand-collected list (IMACA, Food Bank of Contra Costa & Solano, Rural Human Services, Food Bank of El Dorado County). Schedules parsed via LA clause parser.',
      note: 'Drop-in raw for prepare-food-additions.mjs.',
    },
    sites,
  };
  writeFileSync(`./${county}Additions-raw.json`, JSON.stringify(out, null, 2));
  console.log(`=== ${county}: ${sites.length} sites | ${withEvents} with events | ${sites.length - withEvents} deferred | ${flags.filter((f) => f.includes('no street')).length} city-level ===`);
}
