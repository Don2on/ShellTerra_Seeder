/*
 * build-food-batch9.mjs — Santa Barbara, Santa Clara, Santa Cruz, Shasta (net-new).
 * Pipe-delimited: Name | Street | City | ZIP | Phone | Schedule | Website
 */
import { writeFileSync } from 'node:fs';
import { parseBlock } from './food-schedule-lib.mjs';

const COUNTIES = {
  SantaBarbara: {
    rows: `
Santa Ynez Valley Community Outreach (outdoor pantry) | 164 W Hwy 246 | Buellton | 93427 | (805) 688-4571 | Open daily 24 hours |
Veterans Pantry | 164 W Hwy 246 | Buellton | 93427 |  | Mon-Fri 8am-5pm |
Carpinteria Children's Project | 5201 8th St | Carpinteria | 93013 |  | 2nd Wed 3pm-5:30pm |
El Camino School | 5020 San Simeon Dr | Santa Barbara | 93111 |  | 4th Thu 4pm-6pm |
Good Shepherd Pantry | 380 N. Fairview Ave | Goleta | 93117 |  | 1st Sat 9am-10am |
Sandpiper Apartments | 375 Ellwood Beach Dr | Goleta | 93117 |  | 1st Thu 9am |
Goleta Valley Community Center | 5679 Hollister Ave | Goleta | 93117 |  | 2nd Sat 8:30am-10:30am |
Reality Church (at Girls Inc.) | 5315 Foothill Rd | Carpinteria | 93013 |  | Last Thu of month 4pm-5:30pm |
Guadalupe Senior Center | 4545 10th St | Guadalupe | 93434 |  | 1st Thu 11:30am-2pm |
Family Service Center | 230 Cesar E. Chavez | Guadalupe | 93434 |  | Last Thu of month 12pm |
Beatitude House | 267 Campodonico Ave | Guadalupe | 93434 |  | Tue 10am-11:30am |
L.E.A.P. at Isla Vista Elementary School | 6875 El Colegio Rd | Isla Vista | 93117 | 805-869-3303 | 3rd Thu 11:30am-5:30pm (by appointment only) |
Catholic Charities - Lompoc | 329 N. 2nd St | Lompoc | 93436 |  | Mon-Fri 10am-11:45am and 12:30pm-2pm |
Santa Rita Village | 926 W. Apricot Ave | Lompoc | 93436 |  | 4th Wed 10am-11:30am |
Mission Hills Shopping Center | 1450 Burton Mesa Blvd | Lompoc | 93436 |  | 1st Mon 3pm-5pm |
Trinity Church of the Nazarene | 500 E North Ave | Lompoc | 93436 |  | 2nd Mon 3pm-5pm |
Lompoc High School | 515 W. College Ave | Lompoc | 93436 |  | Last Sat of month 8am-11am |
Micah Mission (prepared meals) | 500 E North Ave | Lompoc | 93436 |  | Sat 1pm-2:30pm |
St. Timothy's Church (prepared meals) | 403 North J St | Lompoc | 93436 |  | Tue 4pm-5:45pm |
La Purisima Catholic Church (prepared meals) | 333 South I St | Lompoc | 93436 |  | Fri 4pm-4:45pm |
People Helping People - Los Alamos | 260 Gonzalez Dr | Los Alamos | 93440 |  | Thu 10am-11am |
Cuyama Family Resource Center | 4689 Highway 166 | New Cuyama | 93254 |  | 3rd Fri 11am |
Orcutt Presbyterian Church | 993 Patterson Rd | Orcutt | 93455 |  | Fri 2pm-4pm |
Oasis Orcutt Senior Center | 420 Soares Ave | Orcutt | 93455 |  | 3rd Thu 9am-10:30am |
Franklin Community Center | 1136 E. Montecito St | Santa Barbara | 93103 |  | Thu 1pm; 3rd Tue 1:30pm |
Franklin Elementary School | 1111 E Mason St | Santa Barbara | 93103 |  | 3rd Sat 8:30am-10:30am |
Grace Food Pantry | 3869 State St | Santa Barbara | 93105 |  | 1st through 4th Sat 9am |
Harding Elementary Auditorium | 1625 Robbins St | Santa Barbara | 93101 | 805-967-5741 | 4th Tue 2:30pm-5pm |
Iglesia Bautista | 736 W. Islay St | Santa Barbara | 93101 |  | 3rd Thu 2pm |
New Life Church | 50 E. Alamar Ave | Santa Barbara | 93105 |  | 3rd Tue 1pm-2:30pm |
McKinley Elementary School | 350 Loma Alta Dr | Santa Barbara | 93109 |  | 2nd Tue 2:30pm-4:30pm |
Positano Apartments | 11 Camino De Vida | Santa Barbara | 93111 |  | 3rd Mon 3:30pm |
Presidio Springs | 721 Laguna St | Santa Barbara | 93101 |  | 3rd Wed 2pm-5pm |
Salvation Army - Santa Barbara | 4849 Hollister Ave | Santa Barbara | 93111 |  | Tue and Thu 9am-12pm; Wed 1pm-4pm |
Unity Shoppe | 1401 Chapala St | Santa Barbara | 93101 |  | Mon-Fri 10am-5pm |
Westside Community Center | 423 W. Victoria St | Santa Barbara | 93101 |  | Mon 1pm |
Catholic Charities - Santa Barbara | 609 E. Haley St | Santa Barbara | 93103 |  | Mon-Fri 9am-4:30pm |
Children's Park (Lower Westside) | 520 Wentworth Ave | Santa Barbara | 93101 |  | 1st and 2nd Tue 1pm |
La Cumbre Jr. High School | 2255 Modoc Rd | Santa Barbara | 93101 |  | 3rd Thu 2:30pm-4:30pm |
Elks Lodge | 1309 N. Bradley Rd | Santa Maria | 93454 |  | Last Thu of month 9am |
Allan Hancock College | 800 S. College Dr | Santa Maria | 93454 |  | 1st & 3rd Sat 8am-10:30am |
Boys & Girls Club | 901 N Railroad Ave | Santa Maria | 93458 |  | 2nd Sat 8:30am-10:30am |
Coast Valley Worship Center | 2548 S. Broadway | Santa Maria | 93455 |  | Tue 10am-11am |
Salvation Army - Santa Maria | 200 W. Cook Ave | Santa Maria | 93458 |  | Mon, Wed, Fri 9am-4pm |
St. Peter's Episcopal Church | 402 S. Lincoln St | Santa Maria | 93458 |  | Thu 9:30am-11am |
Residences of Depot St. | 201 W Depot St | Santa Maria | 93458 |  | 3rd Wed 3pm |
Santa Maria Fairpark | 937 S Thornburg St | Santa Maria | 93458 |  | 3rd Wed 8am-11am |
Veterans Clinic | 1550 E Main St | Santa Maria | 93454 |  | 4th Wed 3pm-4:30pm |
Red Oaks Baptist Church | 3600 Pinewood Dr | Santa Maria | 93455 |  | 4th Mon 3pm-5pm |
American GI Forum | 117 W Bunny Ave | Santa Maria | 93458 |  | 2nd Tue 1pm-4pm |
Bethania Lutheran Church | 603 Atterdag Rd | Solvang | 93463 |  | Tue 5:15pm-6:45pm |
People Helping People - Solvang | 1760 Mission Drive | Solvang | 93463 |  | Thu 12pm-4pm |
`,
  },
  SantaClara: {
    rows: `
Our Lady Star of the Sea Church | 1392 Grand Boulevard | Alviso | 95002 |  | 2nd Wed 12pm-1:30pm |
Campbell United Methodist Church | 1675 Winchester Blvd | Campbell | 95008 |  | 3rd Tue 2pm-4pm |
CityTeam at Campbell Church of Christ | 1060 Hedegard Avenue | Campbell | 95008 |  | 2nd & 4th Sat 12pm-1:30pm |
Rosemary Elementary School | 401 W Hamilton Ave | Campbell | 95008 |  | 1st & 3rd Wed 1:45pm-3pm |
St. Lucy Parish | 2350 Winchester Blvd | Campbell | 95008 |  | Fri 10am-12pm |
The Home Church | 1799 S Winchester Blvd | Campbell | 95008 |  | Fri 8:30am-10am |
De Anza College | 21250 Stevens Creek Blvd | Cupertino | 95014 |  | Mon-Fri 10am-4pm; 2nd & 4th Tue 1:45pm-3pm |
CityTeam at Valley Church | 10885 North Stelling Road | Cupertino | 95014 |  | 4th Fri 4:30pm-5:30pm |
Union Church of Cupertino | 20900 Stevens Creek Blvd | Cupertino | 95014 |  | 1st & 3rd Thu 8am-9:30am |
West Valley Community Services | 10104 Vista Drive | Cupertino | 95014 |  | Mon-Fri 9:30am-11:30am; Mon, Tue, Wed, Fri 2pm-4pm; Thu 4pm-7pm |
West Valley Presbyterian Church | 6191 Bollinger Road | Cupertino | 95014 |  | 2nd Wed 9:30am-11am |
Gavilan College | 5055 Santa Teresa Blvd | Gilroy | 95020 |  | Mon-Thu 9am-5pm; 1st & 3rd Thu 1:30pm-3:30pm |
Gilroy Senior Center | 350 W 6th St | Gilroy | 95020 |  | 1st & 3rd Thu 8:30am-9:45am |
Rebekah Children's Services | 290 I.O.O.F Ave | Gilroy | 95020 |  | 4th Fri 10am-12pm |
Redwoods Apartments | 9005 Kern Avenue | Gilroy | 95020 |  | 4th Thu 1:30pm-2:45pm |
Salvation Army Gilroy | 200 W. 5th St | Gilroy | 95020 |  | Wed 2pm-3pm; Thu 10:30am-12:30pm and 1:30pm-2:30pm; Fri 9am-11am |
San Ysidro Park | 7700 Murray Ave | Gilroy | 95020 |  | 1st & 3rd Tue 4pm-5:30pm |
CityTeam at Gilroy Church St. Pantry | 8531 Church Street | Gilroy | 95020 |  | 4th Sat 4pm-5pm |
South County Community Services | 7950 Church St. Suite A | Gilroy | 95020 |  | Tue, Thu 8am-2:30pm |
Los Gatos Library | 100 Villa Avenue | Los Gatos | 95030 |  | 2nd & 4th Thu 10am-11:15am |
Acts Of Courage | 529 South Main Street | Milpitas | 95035 |  | 2nd Sat 9am-11am |
Christian Worship Center | 241 S. Main Street | Milpitas | 95035 |  | 1st & 3rd Wed 6:30am-7:30am |
Jose Higuera Adobe Park | Wessex Place | Milpitas | 95035 |  | 4th Mon 9am-10:30am |
Mt. Olive Ministries | 1989 E Calaveras Blvd | Milpitas | 95035 |  | 1st & 3rd Wed 7:45am-9:15am |
Joseph Weller Elementary School | 345 Boulder St | Milpitas | 95035 |  | Mon 3:30pm-4pm |
Advent Lutheran Church | 16870 Murphy Avenue | Morgan Hill | 95037 |  | 1st & 3rd Thu 8am-8:45am |
Morgan Hill Community & Cultural Center | 17000 Monterey Rd | Morgan Hill | 95037 |  | 2nd & 4th Tue 10:30am-11:45am |
P.A. Walsh STEAM Academy | 305 W. Main Ave | Morgan Hill | 95037 |  | 1st & 3rd Wed 8am-9:30am |
St. Catherine Church | 17400 Peak Ave | Morgan Hill | 95037 |  | Mon-Sat 1pm-2:30pm |
STAND4 Mountain View | 1425 S. Springer Road | Mountain View | 94040 |  | 2nd & 4th Sun 3pm-5pm |
Community Services Agency | 204 Stierlin Rd | Mountain View | 94043 |  | Mon 2pm-4pm; Thu 11:30am-1:30pm; Fri 1:30pm-3:30pm |
Hope's Corner (meals) | 748 Mercy Street | Mountain View | 94041 |  | Mon 8am-9am; Wed 8am-9am; Sat 8am-10am |
Mountain View Hispanic 7th Day Adventist | 342 Sierra Vista Ave | Mountain View | 94043 |  | 3rd Mon 11:30am-1pm |
CityTeam at Hope Hangar | 2440 Leghorn Street | Mountain View | 94043 |  | 1st & 3rd Wed 6pm-7:30pm |
CityTeam at Menlo Church Mountain View Pantry | 1667 Miramonte Avenue | Mountain View | 94040 |  | 1st & 3rd Tue 3:30pm-5pm |
CSA satellite (Toft St) | 500 Toft St | Mountain View | 94041 |  | 1st, 3rd & 5th Wed 2pm-4pm |
MidPen Housing (Tyrella) | 449 Tyrella Avenue | Mountain View | 94043 |  | 3rd Mon 4pm-6pm |
MidPen Housing (Latham) | 2230 Latham St | Mountain View | 94040 |  | 3rd Mon 4pm-6pm |
Mountain View High School | 1299 Bryant Avenue | Mountain View | 94040 |  | Thu 3:30pm-4:30pm |
St. Athanasius Church | 160 N. Rengstorff Ave | Mountain View | 94043 |  | 2nd & 4th Sat 10am-12pm |
Alta Housing | 574 Arastradero Road | Palo Alto | 94306 |  | 1st Fri 2pm-4pm |
Downtown Food Closet of Palo Alto | 425 Hamilton Avenue | Palo Alto | 94301 |  | Mon-Fri 10am-2:30pm |
La Comida de California (meals) | 455 E. Charleston Road | Palo Alto | 94306 |  | Mon-Fri 11:15am-12:15pm |
Palo Alto Community Child Care | 3990 Ventura Court | Palo Alto | 94306 |  | 2nd & 4th Tue 10:30am-12:30pm |
PACCC (Sheridan Ave) | 360 Sheridan Avenue | Palo Alto | 94306 |  | 2nd & 4th Tue 11:30am-12:30pm |
South Palo Alto Food Closet | 670 E. Meadow Drive Room 9 | Palo Alto | 94306 |  | Mon-Fri 1pm-4pm; Thu 10am-12pm |
Operation Share | 467 North White Road | San Jose | 95127 |  | 2nd & 4th Tue 11am-1pm |
Abraham Lincoln High School | 555 Dana Ave | San Jose | 95126 |  | 1st & 3rd Sat 8am-10am |
African American Community Services Agency | 304 North 6th Street | San Jose | 95112 |  | Alternate Tue 10am-1pm |
Almaden Elementary School | 1295 Dentwood Drive | San Jose | 95118 |  | 2nd Tue 4pm-5:30pm |
Almaden Hills United Methodist Church | 1200 Blossom Hill Road | San Jose | 95118 |  | 2nd & 4th Wed 4pm-6pm |
Alpha Public Schools | 1601 Cunningham Ave | San Jose | 95122 |  | 2nd Sat 8:30am-10:30am |
Alum Rock United Methodist Church | 30 Kirk Avenue | San Jose | 95127 |  | Sat 11am-12pm |
Antioch Baptist Church | 268 E. Julian Street | San Jose | 95112 |  | Alternate Thu 11am-12pm |
August Boeger Middle School | 1944 Flint Ave | San Jose | 95148 |  | 1st Thu 9:45am-11:15am |
Bay Area Community Health | 1750 S. White Rd | San Jose | 95127 |  | 3rd Sat 12:30pm-2:30pm |
Bethel Church | 1201 South Winchester Boulevard | San Jose | 95128 |  | 1st & 3rd Thu 10:15am-11:45am |
C.O.M.E. | 121 East San Salvador St | San Jose | 95112 |  | Tue 8:15am-10:30am |
Cambrian Center | 2360 Samaritan Place | San Jose | 95124 |  | 2nd & 4th Thu 9am-10am |
Cathedral of Faith | 2315 Canoas Garden Road | San Jose | 95125 |  | Wed, Thu 9am-12pm |
Catholic Charities - Eastside Neighborhood Center | 2150 Alum Rock Ave | San Jose | 95116 |  | 2nd & 4th Wed 9am-11am |
CityTeam in the Neighborhood (CTN) | 1297 N. 13th Street | San Jose | 95112 |  | 1st & 3rd Sat 9:30am-11:30am |
Crossroad Community Food Pantry | 990 S. Capitol Avenue | San Jose | 95127 |  | Thu 8am-11am |
Crossroads Bible Church | 1670 Moorpark Ave | San Jose | 95128 |  | Sat 9am-10:30am |
Cypress Community and Senior Center | 403 S. Cypress Ave | San Jose | 95117 |  | 1st & 3rd Wed 8am-9:15am |
El Buen Pastor | 2468 Summer St | San Jose | 95116 |  | Tue 10:30am-12pm |
El Buen Pastor Food Pantry - SJ | 1297 E San Fernando St | San Jose | 95116 |  | 4th Fri 5:30pm-6:30pm |
Evergreen Valley College | 3095 Yerba Buena Rd | San Jose | 95135 |  | 1st & 3rd Fri 9:30am-11am |
First Apostolic Church | 480 McCreery Avenue | San Jose | 95116 |  | 2nd Fri 10am-12pm |
FISH of South Valley San Jose | 5100 Camden Ave | San Jose | 95124 |  | Thu 4pm-5:30pm |
Franklin Elementary School (SJ) | 420 Tully Rd | San Jose | 95111 |  | 3rd Sat 9:30am-11am |
Friendship Church of God in Christ | 1654 East San Antonio St | San Jose | 95116 |  | Tue 9am-2pm |
Gardner Community Center | 520 West Virginia Street | San Jose | 95125 |  | 1st & 3rd Wed 9am-10am |
Goodwill of Silicon Valley | 1080 N. 7th St | San Jose | 95112 |  | 3rd Tue 9:30am-11:30am; Loaves & Fishes meal Mon 3pm-4pm |
Hank Lopez Community Center | 1694 Adrian Way | San Jose | 95122 |  | 3rd Thu 10:30am-11:30am |
Healthy Start Early Learning Center | 1149 E. Julian Street | San Jose | 95116 |  | 1st Fri 3:30pm-5:30pm |
Hunger at Home at San Jose Flea Market | 1411 Mabury Road | San Jose | 95133 |  | Mon 9am-10am |
ICNA at South Bay Islamic Association | 2345 Harris Way | San Jose | 95131 |  | 3rd Sat 1pm-2:30pm |
Indian Health Center of Santa Clara Valley | 602 E. Santa Clara Street | San Jose | 95112 |  | 3rd Fri 11:30am-1pm |
Jaguar Market at San Jose City College | 2100 Moorpark Avenue | San Jose | 95128 |  | Mon-Thu 10am-5pm |
Jeanne R. Meadows Elementary School | 1250 Taper Lane | San Jose | 95122 |  | 1st Wed 8:45am-10am |
Katherine R Smith Elementary School | 2025 Clarice Ave | San Jose | 95122 |  | 2nd Thu 3:30pm-5pm |
Lairon College Preparatory Academy | 3975 Mira Loma Way | San Jose | 95111 |  | 2nd Thu 2:30pm-4pm |
Latino College Prep | 14271 Story Rd | San Jose | 95127 |  | 1st Mon 10am-12pm |
LifeSTEPS | 99 N. 1st St | San Jose | 95113 |  | 2nd Fri 8am-9am |
Lighthouse Food Rescue and Distribution | 309 North 17th Street | San Jose | 95112 |  | Mon, Tue, Thu, Fri, Sat 12pm-5pm |
Loaves and Fishes | 1043 Garland Ave | San Jose | 95126 |  | 2nd & 4th Mon-Thu 1pm-3pm |
Logos Christian Fellowship Church | 4801 Alum Rock Ave | San Jose | 95127 |  | Thu 10am-11:30am |
Martha's Kitchen | 749 Story Road | San Jose | 95122 |  | Pantry Wed 1pm-3pm; meals Tue and Wed 4pm-5pm |
Mayfair Community Center | 2039 Kammerer Avenue | San Jose | 95116 |  | 1st & 3rd Fri 8:30am-10:30am |
AchieveKids (meals) | 1212 McGinness Avenue | San Jose | 95127 |  | Mon-Fri 8:30am-3:30pm |
Cityteam San Jose (meals) | 580 Charles Street | San Jose | 95112 |  | Breakfast Mon-Thu 9:15am-10:15am |
Family Supportive Housing (meals) | 692 North King Road | San Jose | 95133 |  | Daily 5pm-6:30pm |
LifeMoves (meals) | 546 West Julian Street | San Jose | 95110 |  | Thu 9:30am-10:30am |
Momentum for Health (meals) | 436 North White Road | San Jose | 95127 |  | Daily 8am-8:30am, 12pm-12:30pm, 6pm-6:30pm |
POSSO | 1115 East Santa Clara Street | San Jose | 95116 |  | 2nd & 4th Wed 7:45am-9am |
Recovery Cafe (meals) | 80 South 5th Street | San Jose | 95112 |  | Mon-Fri 12:30pm-1:30pm |
The Salvation Army - Emmanuel House (meals) | 405 N. 4th St | San Jose | 95112 |  | Mon-Sat 7:15am-8am, 10am-10:30am, 5:15pm-6pm |
Mexican Heritage Plaza | 1700 Alum Rock Avenue | San Jose | 95116 |  | 2nd & 4th Wed 12pm-2pm |
Midtown Family Services | 1275 South Winchester Boulevard | San Jose | 95128 |  | Mon-Fri 10am-4pm |
Moreland School District | 4711 West Campbell Avenue | San Jose | 95130 |  | 1st & 3rd Thu 10:15am-11:30am |
Most Holy Trinity Catholic Church | 2040 Nassau Dr | San Jose | 95122 |  | 1st & 3rd Wed 11am-1pm |
New Beginnings Family Services | 100 West Alma Avenue | San Jose | 95110 |  | Mon, Wed, Sat 10am-11am; Mon, Wed 6pm-7pm |
OB Whaley Elementary School | 2655 Alvin Ave | San Jose | 95121 |  | 1st & 3rd Thu 3:30pm-5pm |
Ohlone Chynoweth Commons | 5300 Terner Way | San Jose | 95136 |  | 1st Thu 2pm-4pm |
Orchard School District | 921 Fox Lane | San Jose | 95131 |  | 3rd Wed 2pm-4pm |
Our Lady of Refuge Church | 2165 Lucretia Avenue | San Jose | 95122 |  | Tue 3:30pm-5:30pm |
Pars Equality Center | 1635 The Alameda | San Jose | 95126 |  | 2nd & 4th Fri 12pm-2pm |
Rahima Foundation | 2290 Ringwood Ave Unit A | San Jose | 95131 |  | Mon-Thu 10am-2pm; 3rd Sat 8am-2pm |
Rocketship Los Suenos at PAL | 680 S. 34th Street | San Jose | 95116 |  | 2nd Tue 10am-12pm |
Ryan STEAM Academy | 1241 McGinness Ave | San Jose | 95127 |  | 4th Thu 8:30am-10:30am |
Sacred Heart Community Service | 1381 South First St | San Jose | 95110 |  | Mon, Wed, Thu 9am-4pm; Tue 9am-6pm; Fri 9am-12pm |
San Jose City College | 2100 Moorpark Avenue | San Jose | 95128 |  | 2nd & 4th Fri 10am-12pm |
Santa Maria Urban Ministry of San Jose | 778 South Almaden Ave | San Jose | 95110 |  | Mon-Fri 9am-11:45am; 1st & 3rd Sat 9am-11:45am |
Santee Elementary School | 1313 Audubon Dr | San Jose | 95122 |  | Thu 4pm-5:30pm |
Anderson Elementary School | 4000 Rhoda Dr | San Jose | 95117 |  | 1st & 3rd Tue 1:45pm-3pm |
CityTeam Mayfair | 625 South Sunset Avenue | San Jose | 95116 |  | 1st & 3rd Fri 4pm-5pm |
CityTeam at Del Mar High School | 1224 Del Mar Avenue | San Jose | 95128 |  | 1st & 3rd Thu 3:30pm-4:30pm |
CityTeam at Family Life Church | 801 Hellyer Avenue | San Jose | 95111 |  | 2nd & 4th Sat 10am-11:30am |
CityTeam at Linda Vista Pantry | 218 Kirk Avenue | San Jose | 95127 |  | 1st & 3rd Thu 2:30pm-3:30pm |
CityTeam at Via Monte Pantry | 5655 Gallup Drive | San Jose | 95118 |  | 2nd & 4th Fri 4pm-5pm |
CityTeam at Willow Glen Bible Church | 1292 Minnesota Avenue | San Jose | 95125 |  | 2nd & 4th Tue 3:30pm-5pm |
Community Cycles | 35 Wilson Avenue | San Jose | 95126 |  | Wed, Thu 9am-4pm |
De Vargas Elementary School | 5050 Moorpark Ave | San Jose | 95129 |  | 1st & 3rd Thu 1:45pm-3pm |
George Shirakawa Elementary | 665 Wool Creek Dr | San Jose | 95112 |  | Wed 2pm-3pm |
Latimer Elementary School | 4250 Latimer Avenue | San Jose | 95130 |  | 2nd & 4th Wed 1:45pm-3pm |
Leigh High School | 5210 Leigh Ave | San Jose | 95124 |  | 2nd & 4th Thu 1:45pm-3pm |
Overfelt High School | 1835 Cunningham Ave | San Jose | 95122 |  | 2nd Sat 9:30am-11am |
Prospect High School | 18900 Prospect Rd | Saratoga | 95070 |  | 1st & 3rd Mon 1:45pm-3pm |
Redwood Senior Apartments | 814 St. Elizabeth Dr | San Jose | 95126 |  | 1st & 3rd Tue 8:30am-9:30am |
Seven Trees Family Resource Center | 3975 Mira Loma Way | San Jose | 95111 |  | Tue 2pm-3pm |
STAND4 at Cambrian Park | 5265 Carter Avenue | San Jose | 95118 |  | 1st Wed 3:30pm-5:30pm |
Verbo South Bay (Hyland Ave) | 5038 Hyland Avenue | San Jose | 95127 |  | Thu 10:45am-11:45am |
Seven Trees Community Center | 3590 Cas Drive | San Jose | 95111 |  | 2nd & 4th Fri 7:30am-9am |
Sheppard Middle School | 480 Rough and Ready Road | San Jose | 95133 |  | 3rd Fri 10am-12pm |
Social Services Agency | 1879 Senter Road | San Jose | 95112 |  | Sat 11:45am-1:45pm |
Spartan Keyes Neighborhood Center | 570 Keyes Street #2 | San Jose | 95112 |  | 4th Tue 2pm-4pm |
St. John Vianney Church | 4600 Hyland Avenue | San Jose | 95127 |  | Wed 2pm-4pm |
St. Leo the Great Catholic Church | 88 Race Street | San Jose | 95126 |  | Thu 5pm-6pm |
St. Maria Goretti Catholic Church | 2980 Senter Road | San Jose | 95111 |  | 2nd Thu 10am-12pm |
St. Martin Of Tours Church | 200 O'Connor Drive | San Jose | 95128 |  | 3rd Fri 3:30pm-4:30pm |
St. Victor's Parish Food Pantry | 3108 Sierra Rd | San Jose | 95132 |  | 3rd Sat 10am-12pm |
Stonegate Elementary School | 2605 Gassmann Drive | San Jose | 95121 |  | 1st & 3rd Sat 10am-11am |
Sunday Friends Foundation | 1400 Parkmoor Avenue | San Jose | 95126 |  | Fri 4pm-5:30pm |
Sylvandale Middle School | 653 Sylvandale Ave | San Jose | 95111 |  | 3rd Sat 8am-10am |
The Salvation Army - San Jose | 359 N. 4th Street | San Jose | 95112 |  | Mon-Fri 9am-12pm |
TOCKNA Neighborhood Association | 1951 Clarice Drive | San Jose | 95122 |  | 3rd Sat 11am-12:30pm |
Trinity Episcopal Cathedral | 81 N. 2nd Street | San Jose | 95113 |  | 1st & 3rd Thu 6:15am-7:45am |
Trinity Presbyterian Church | 3151 Union Avenue | San Jose | 95124 |  | 1st & 3rd Wed 4pm-6pm |
True Vine Baptist Church | 505 S. White Road | San Jose | 95127 |  | Fri 11am-1pm |
Union Community Resources Local 270 | 2195 Fortune Drive | San Jose | 95131 |  | Wed 9am-9:45am |
Verbo South Bay (Moorpark Ave) | 1670 Moorpark Avenue | San Jose | 95128 |  | Tue 6:15pm-6:45pm |
Washington United Youth Center | 921 S. 1st Street | San Jose | 95110 |  | 2nd & 4th Sat 9:45am-11:15am |
Wesley United Methodist Church (SJ) | 567 N. 6th St | San Jose | 95112 |  | Tue 10am-11am; 1st & 3rd Thu 9am-10:30am |
WestGate South Hills Church | 6601 Camden Ave | San Jose | 95120 |  | 3rd Wed 11:30am-1pm |
Westminster Presbyterian Church | 1100 Shasta Ave | San Jose | 95126 |  | 1st & 3rd Tue 7:30am-8:30am |
Willow Glen United Methodist Church | 1420 Newport Ave | San Jose | 95125 |  | 1st & 3rd Tue 8:30am-9:30am |
Mission College (parking lot C distribution) | 3000 Mission College Boulevard | Santa Clara | 95054 |  | Tue 10am-12pm |
Mission Market Pantry (Mission College) | 3000 Mission College Boulevard | Santa Clara | 95054 |  | Mon 10am-1pm; Tue, Wed, Thu 11:30am-4pm; Fri 10am-1pm |
River of Life Foundation | 1177 Laurelwood Road | Santa Clara | 95054 |  | Tue, Thu 9:30am-12:30pm; Fri 11am-1pm |
Saint Clare Parish | 941 Lexington Street | Santa Clara | 95050 |  | 2nd & 4th Tue 7am-9am |
CityTeam at Trinitas Church Pantry | 2445 Cabrillo Avenue | Santa Clara | 95051 |  | 1st & 3rd Sat 2pm-4pm |
MidPen Housing (Lick Mill) | 5090 Lick Mill Boulevard | Santa Clara | 95054 |  | 3rd Mon 4pm-6pm |
St. Justin's Community Ministry | 2655 Homestead Rd | Santa Clara | 95051 |  | Tue-Sat 10am-12pm |
The Salvation Army - Santa Clara | 3090 Homestead Road | Santa Clara | 95051 |  | Thu 1pm-3pm |
Roots Pantry (West Valley College) | 14000 Fruitvale Avenue | Saratoga | 95070 |  | Mon-Thu 10am-4pm |
West Valley College distribution | 14000 Fruitvale Ave | Saratoga | 95070 |  | Mon 10am-11:30am; 2nd & 4th Mon 1:45pm-3pm |
Fellowship Plaza | 14520 Fruitvale Avenue | Saratoga | 95070 |  | 1st & 3rd Tue 10:15am-11:30am |
Columbia Neighborhood Center | 739 Morse Ave | Sunnyvale | 94085 |  | 4th Wed 4:15pm-5:15pm |
Corner Pantry at The Rock Church | 929 Weddell Court | Sunnyvale | 94089 |  | Sat 12pm-4pm |
CityTeam at Gateway Neighborhood Center | 477 North Mathilda Avenue | Sunnyvale | 94085 |  | 2nd & 4th Sat 10am-12pm |
MidPen Housing (Reed Ave) | 1059 Reed Avenue | Sunnyvale | 94086 |  | 3rd Mon 4pm-6pm |
MidPen Housing (Maude Ave) | 620 East Maude Avenue | Sunnyvale | 94085 |  | 3rd Mon 4pm-6pm |
MidPen Housing (Garland Ave) | 662 Garland Avenue | Sunnyvale | 94086 |  | 3rd Mon 4pm-6pm |
San Miguel Elementary School | 777 San Miguel Avenue | Sunnyvale | 94085 |  | Tue 3:30pm-4:30pm |
St. Luke Lutheran Church | 1025 The Dalles Ave | Sunnyvale | 94087 |  | 1st & 3rd Tue 8:30am-10am |
Sunnyvale Community Services | 1160 Kern Avenue | Sunnyvale | 94085 |  | Wed 9am-6pm |
Sunnyvale School District | 819 W. Iowa Avenue | Sunnyvale | 94085 |  | 1st & 3rd Wed 4pm-5:30pm |
The Salvation Army - Sunnyvale | 1161 South Bernardo Ave | Sunnyvale | 94087 |  | 1st, 3rd & 5th Fri 11am-3pm |
`,
  },
  SantaCruz: {
    rows: `
New Hope Aptos Church | 7200 Freedom Blvd | Aptos | 95003 | 831-688-3312 | 2nd & 4th Tue 10am-11am |
People's Pantry (Twin Lakes Church) | 2701 Cabrillo College Dr | Aptos | 95003 |  | Wed 3:45pm-5:15pm |
Resurrection Church Pantry | 7600 Soquel Dr | Aptos | 95003 | 831-688-4300 | Mon, Fri 10am-12pm |
Neighbors Helping Neighbors (Aromas Grange) | 400 Rose Ave | Aromas | 95004 |  | 1st & 3rd Tue 4pm-5pm |
Valley Churches United Mission | 9400 Highway 9 | Ben Lomond | 95005 |  | Tue, Wed, Thu 9am-12pm; 1st & 3rd Fri 9am-11am (seniors only) |
Bay Avenue Senior Apartments | 750 Bay Avenue Building 4 | Capitola | 95010 |  | 2nd Wed 11am-12:30pm |
Davenport Resource Service Center (Community Action Board) | 150 Church St | Davenport | 95017 |  | Mon, Wed, Thu 10am-6pm; Tue 2pm-5pm |
Mountain Community Resources (Community Bridges) | 6134 Highway 9 | Felton | 95018 |  | Thu 10:30am-11:30am |
Cornerstone Food Pantry | 302 Carey Ave | Freedom | 95019 | 831-331-9120 | Thu 10:30am-12pm |
Corralitos Creek Apartments | 125 Pajaro Circle | Freedom | 95019 |  | 2nd & 4th Tue 4pm-5pm (while supplies last) |
Freedom Elementary School | 25 Holly Dr | Freedom | 95019 |  | 2nd & 4th Wed 5pm-6pm (while supplies last) |
Paloma del Mar Apartments | 2030 Pajaro Ln | Freedom | 95019 |  | 3rd Fri 10:30am-11:30am (while supplies last) |
Community Connection - Santa Cruz | 300 Harvey West Blvd | Santa Cruz | 95060 |  | Mon, Wed 10am-2pm |
Del Mar Elementary School | 1959 Merrill St | Santa Cruz | 95062 |  | 1st & 3rd Wed 4pm-5pm (while supplies last) |
Elizabeth Oaks Apartments | 1460 Jose Ave | Santa Cruz | 95062 |  | 1st & 3rd Wed 11:30am-12:30pm (while supplies last) |
Grey Bears | 2710 Chanticleer Avenue | Santa Cruz | 95065 | 831-479-1055 | Mon-Fri 11am-12:30pm; Thu, Fri 9am-10:30am |
Holy Cross Church Pantry | 210 High St Rm 104 | Santa Cruz | 95060 |  | Sun 8am-11am; Wed, Fri 10am-1pm |
LiUNA! Local 270 Community Service Fund | 640 Eaton St | Santa Cruz | 95062 |  | Wed 10am-12pm |
Live Oak Elementary School | 1916 Capitola Rd | Santa Cruz | 95062 |  | 2nd & 4th Thu 4pm-5pm (while supplies last) |
Neary Lagoon Apartments | 81 Chestnut St | Santa Cruz | 95060 |  | 1st & 3rd Thu 2pm-3pm (while supplies last) |
Nueva Vista Apartments | 136 Leibrandt Ave | Santa Cruz | 95060 |  | 1st Tue 2:30pm-3:30pm (while supplies last) |
Nueva Vista Community Resources (Community Bridges) | 711 E. Cliff Dr | Santa Cruz | 95060 |  | 1st & 3rd Wed 2:30pm-4:30pm |
Salvation Army Santa Cruz Corps | 721 Laurel St | Santa Cruz | 95060 |  | Mon-Thu 9am-11:30am |
Santa Cruz Bible Church | 440 Frederick St | Santa Cruz | 95062 |  | Tue 10am-12pm; Thu 12pm-1pm |
Santa Cruz Community Health Centers - Live Oak Health Center | 1510 Capitola Road | Santa Cruz | 95062 |  | Fri 3pm-4pm |
St. Francis Soup Kitchen | 205 Mora St | Santa Cruz | 95060 |  | Mon-Fri 12pm-1pm |
Star of the Sea Church | 515 Frederick St | Santa Cruz | 95062 |  | Mon 10am-12pm |
Sycamore Commons Apartments | 125 Sycamore St | Santa Cruz | 95060 |  | 4th Thu 2pm-3pm |
United Veterans Council - SC Veterans Memorial Building | 846 Front St | Santa Cruz | 95060 |  | Wed 11am-1pm (hot meal and pantry) |
GateWay Bible Church | 5000 Granite Creek Road | Scotts Valley | 95066 | 831-438-0646 | Fri 5pm-5:30pm |
San Agustin Pantry | 257 Glenwood Drive | Scotts Valley | 95066 | 831-423-0878 | Wed 10am-1pm |
St. Philip's Episcopal Food Pantry | 5271 Scotts Valley Drive | Scotts Valley | 95066 |  | Thu 5pm-6:30pm |
Tradewinds Church | 4525 Soquel Dr | Soquel | 95073 |  | Sat 10am-11am |
Alianza Charter School | 115 Casserly Rd | Watsonville | 95076 |  | 2nd & 4th Fri 4pm-5pm |
All Saints Cristo Rey Episcopal Church | 437 Roger Ave | Watsonville | 95076 |  | 4th Thu 10:30am-12pm |
Amesti Elementary School | 25 Amesti Rd | Watsonville | 95076 |  | 1st & 3rd Wed 4pm-5pm (while supplies last) |
Ann Soldo Elementary School | 1140 Menasco Dr | Watsonville | 95076 |  | 2nd Tue 1:30pm-2:30pm (while supplies last) |
Buena Vista Children's Center | 113 Tierra Alta Dr Rm 201 | Watsonville | 95076 |  | 1st & 3rd Thu 5pm-6pm |
Calabasas Elementary School | 202 Calabasas Rd | Watsonville | 95076 |  | 1st & 3rd Tue 4pm-5pm (while supplies last) |
Holy Eucharist Catholic Community Church | 527 Corralitos Road | Watsonville | 95076 | 831-722-5490 | 1st Thu 2pm-4pm |
Iglesia Adventista Hispana | 336 Green Valley Rd | Watsonville | 95076 |  | Every other Wed 9:30am-10:30am |
Iglesia de Cristo (Watsonville) | 118 First St | Watsonville | 95076 |  | Every other Tue 7pm-9pm |
Pajaro Valley Loaves & Fishes | 150 Second Street | Watsonville | 95076 |  | Mon-Fri 9am-11:30am, 12pm-1pm, 1pm-3pm |
Pajaro Valley Prevention and Student Assistance | 411 East Lake Avenue | Watsonville | 95076 | 831-728-6445 | 4th Tue 11am-12pm |
Radcliff Elementary School | 550 Rodriguez St | Watsonville | 95076 |  | 4th Fri 2:30pm-3:30pm (while supplies last) |
Salvation Army Watsonville Corps | 214 Union St | Watsonville | 95076 |  | Tue, Thu 10am-12pm |
Starlight Elementary School | 225 Hammer Dr | Watsonville | 95076 |  | 1st & 3rd Thu 5pm-6pm |
United Methodist Church (Watsonville) | 229 Stanford St | Watsonville | 95076 |  | 1st Thu 4pm-5pm (while supplies last) |
Watsonville Prep School | 407 Main Street | Watsonville | 95076 | 831-274-3222 | 2nd & 4th Fri 10am-12pm (while supplies last) |
Watsonville Senior Center | 114 E. 5th St | Watsonville | 95076 |  | 3rd Thu 10am-11am (while supplies last) |
Watsonville Seventh-day Adventist Church | 700 S. Green Valley Road | Watsonville | 95076 |  | Fri 12pm-1pm |
Salud Para La Gente (Nielson St) | 45 Nielson St | Watsonville | 95076 | 831-763-3431 | Every other Tue 10am-12pm |
Salud Para La Gente (Marchant St parking lot) | 317 Marchant Street | Watsonville | 95076 | 831-763-3431 | Fri 10am-12pm |
`,
  },
  Shasta: {
    rows: `
Anderson-Cottonwood Christian Assistance (ACCA) | 2979 E. Center St | Anderson | 96007 | 530-365-4220 | Tue 10am-1:45pm (photo ID and proof of address) |
Anderson River Park (senior commodities, 60+) | Anderson River Park | Anderson | 96007 | 530-226-3071 | 2nd Fri 9am-10am |
St. Francis of Assisi Catholic Church | 37474 Juniper Ave | Burney | 96013 | 530-335-2372 | Last Fri of month 1pm-3pm |
Veterans Hall (senior commodities, 60+) | Veterans Hall | Burney | 96013 | 530-226-3071 | 3rd Fri 9:30am-10:30am |
Shepherd's Heart Community Food Bank | 3320 Brush St | Cottonwood | 96022 | 530-347-3691 | 2nd & 4th Tue 9am-12pm |
Assembly of God Church (senior commodities, 60+) | Assembly of God Church | Cottonwood | 96022 | 530-226-3071 | 1st Fri 9am-10am |
Happy Valley Community Center (senior commodities, 60+) | Community Center | Happy Valley | 96007 | 530-226-3071 | 2nd Thu 9:30am-10:30am |
Lakehead Lions Club (senior commodities, 60+) | Lakehead Lions Club | Lakehead | 96051 | 530-226-3071 | 1st Thu 9am-10am |
Salvation Army - Redding | 2691 Larkspur Lane | Redding | 96002 | 530-222-2207 | Mon, Wed, Thu 9am-11:30am |
Shasta Senior Nutrition Program food bank (open to all) | 100 Mercy Oaks Dr | Redding | 96003 | 530-226-3071 | 1st and 3rd Fri 8am-9am |
Good News Rescue Mission | 3075 Veda St | Redding | 96001 | 530-241-5754 | Food bank Fri 8am-10am |
Hill Country Health & Wellness Center | 29632 Hwy 299 E | Round Mountain | 96084 | 530-337-6243 | Mon-Fri 9am-5pm (food box by appointment) |
Round Mountain Community Center (senior commodities, 60+) | Community Center | Round Mountain | 96084 | 530-226-3071 | 3rd Fri 9:30am-10:30am |
Shasta Lake Community Food Pantry | 1501 McConnell Ave | Shasta Lake | 96019 | 530-275-3568 | Last Fri of month 9am-10am |
First Baptist Church (senior commodities, 60+) | First Baptist Church | Shasta Lake | 96019 | 530-226-3071 | 2nd Tue 9am-10am |
Shingletown Grassroots Food Pantry | 7752 Ponderosa Way | Shingletown | 96088 | 530-474-4220 | Wed 9am-4pm or by appointment |
Black Butte Jr. High School gym (senior commodities, 60+) | Black Butte Jr. High School | Shingletown | 96088 | 530-226-3071 | 2nd Mon 9:30am-10:30am |
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
      source: 'Hand-collected list (Foodbank of Santa Barbara County, Second Harvest of Silicon Valley, Second Harvest Food Bank Santa Cruz, Shasta County HHSA). Schedules parsed via LA clause parser.',
      note: 'Drop-in raw for prepare-food-additions.mjs. Single-time meals / "open daily" route to _deferred.',
    },
    sites,
  };
  writeFileSync(`./${county}Additions-raw.json`, JSON.stringify(out, null, 2));
  console.log(`\n=== ${county}: ${sites.length} sites | ${withEvents} with events | ${sites.length - withEvents} deferred | ${flags.filter((f) => f.includes('no street')).length} city-level ===`);
}
