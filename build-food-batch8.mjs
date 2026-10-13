/*
 * build-food-batch8.mjs — San Francisco, San Joaquin, San Luis Obispo, San Mateo.
 * All net-new shells. Pipe-delimited: Name | Street | City | ZIP | Phone | Schedule | Website
 * (trailing Source/Date columns in the paste are ignored by parseBlock).
 * No force-defer: SLO "Monthly <time>" neighborhood distributions have no weekday
 * so they defer naturally; Creston's real "1st/2nd/3rd/5th Thu" clause is kept.
 */
import { writeFileSync } from 'node:fs';
import { parseBlock } from './food-schedule-lib.mjs';

const COUNTIES = {
  SanFrancisco: {
    rows: `
APA Family Support Services (Chinatown) | 518 Grant Ave | San Francisco | 94108 |  | Mon 12pm-2:30pm (groceries) |
APA Family Support Services (Visitacion Valley) | 50 Raymond Ave | San Francisco | 94134 |  | Thu 12pm-2pm (groceries) |
APA Family Support Services (Sunnydale) | 1099 Sunnydale Ave | San Francisco | 94134 |  | Wed 1pm-3pm (groceries) |
Bayanihan Equity Center (SoMa) | 616 Minna St | San Francisco | 94103 |  | 1st & 3rd Thu 3pm-4:30pm (groceries) |
Booker T. Washington Community Service Center | 800 Presidio Ave | San Francisco | 94115 | 415-928-6596 | Fri 3:30pm-6pm (groceries and meals) |
Chinatown YMCA | 855 Sacramento St | San Francisco | 94108 |  | Groceries Tue 11am-1pm; meals Thu 12pm-1pm; seniors Fri 10am-1pm |
Curry Senior Center (Tenderloin) | 520 Turk St | San Francisco | 94102 |  | Thu 10am-1pm (groceries) |
District 10 Community Market (Bayview) | 5030 3rd St | San Francisco | 94124 |  | Mon & Fri 1pm-6pm (groceries; eligibility applies) | https://district10market.com
Farming Hope: Refettorio SF (Civic Center) | 690 Van Ness Ave | San Francisco | 94102 |  | Groceries Fri 2pm-4:30pm; meals Tue 5pm-7pm |
Glide Foundation (Tenderloin) | 330 Ellis St | San Francisco | 94102 | 415-674-6000 | Meals daily 8am-9am, 11:30am-1pm, 4pm-5pm |
Mission Action: Casa Colibri (Excelsior) | 5630 Mission St | San Francisco | 94112 |  | 1st & 3rd Wed 9am-12pm (groceries) |
Mission Action: The Little Market (Mission) | 1050 South Van Ness Ave | San Francisco | 94110 |  | Sat 12pm-4pm (groceries) |
Mother Brown's Dining Room (Bayview) | 2111 Jennings St | San Francisco | 94124 |  | Meals Mon-Fri 7am-9am & 5pm-7pm; Sat, Sun 7am-9am & 4pm-6pm |
San Francisco Housing Development Corporation (SFHDC) | 4439 3rd St | San Francisco | 94124 |  | Mon-Thu 11am-1pm |
Self-Help for the Elderly (Excelsior) | 5050 Mission St | San Francisco | 94112 |  | Every other Wed 1:30pm-4:30pm (groceries) |
Self-Help for the Elderly (Sunset) | 3133 Taraval St | San Francisco | 94116 |  | Every other Wed 1:30pm-4:30pm (groceries) |
St. Anthony's Dining Room (Tenderloin) | 121 Golden Gate Ave | San Francisco | 94102 | 415-241-2600 | Meals daily 7am-8am, 10am-1:30pm, 2pm-3pm |
The Richmond Neighborhood Center | 741 30th Ave | San Francisco | 94121 | 415-751-6600 | Fri 1pm-3:30pm (groceries) |
Martin de Porres House of Hospitality | 225 Potrero Ave | San Francisco | 94103 | 415-552-0240 | Mon-Sat 12pm-2pm (meals) |
Salvation Army Asian American Yerba Buena | 360 4th St | San Francisco | 94107 | 415-777-2677 | Thu 10am-2pm; Fri 9am-10:30am |
Project Open Hand | 730 Polk St | San Francisco | 94109 | 415-447-2300 | Wed-Fri 11am-4pm |
One Treasure Island, Building 497 | 850 Avenue I | San Francisco | 94130 | 415-274-0311 | Tue 3pm-5pm |
OMI Family Resource Center Pantry | 1121 Plymouth Ave | San Francisco | 94112 |  | Tue 10am-11:15am |
GPAC Food Distribution Site | 6190 3rd St | San Francisco | 94124 |  | Thu 12pm-1pm |
Grace Fellowship Community Church | 3265 16th St | San Francisco | 94103 |  | Sat 1:30pm-2:30pm |
Sunset Neighborhood Beacon Center | 3010 Noriega St | San Francisco | 94122 |  | Fri 11:15am-12:30pm |
Urban Services YMCA - Food Pantry (Broad St) | 50 Broad St | San Francisco | 94112 | 415-822-7728 | Tue 9am-1pm |
Interfaith Food Pantry at Old First Presbyterian Church | 1751 Sacramento St | San Francisco | 94109 |  | Sat 9am-10:30am |
Bayview Hunters Point Foundation Community Market | 1625 Carroll Ave | San Francisco | 94124 |  | Thu 11:30am-1:30pm |
True Sunshine Episcopal Church | 1430 Mason St | San Francisco | 94133 |  | Sat 11:30am-1pm |
Cornerstone Evangelical Baptist Church | 801 Silver Ave | San Francisco | 94134 |  | Sat 12:15pm-1:35pm |
Donaldina Cameron House | 920 Sacramento St | San Francisco | 94108 |  | Thu 10:20am-12pm |
Urban Services YMCA - Food Pantry (Missouri St) | 751 Missouri St | San Francisco | 94107 |  | Tue 9am-1pm |
Oakdale NGN | 1065 Oakdale Ave | San Francisco | 94124 |  | Fri 1pm-2pm |
Economic Opportunity Council of San Francisco - Fillmore Street | 1426 Fillmore St | San Francisco | 94115 |  | Sat 11am-3pm |
CityTeam San Francisco Food Pantry | 164 6th St | San Francisco | 94103 | 415-861-8688 | Mon 10am-11am |
Leah's Pantry - Mission Street | 3019 Mission St | San Francisco | 94110 |  | Mon-Fri 9am-5pm |
MEI Food Pantry (Mary Elizabeth Inn) | 1040 Bush St | San Francisco | 94109 | 415-673-6768 | Thu 2:30pm-3:30pm |
Excelsior Community Center | 4468 Mission St | San Francisco | 94112 |  | Wed 2:15pm-3:15pm |
St. Andrew Missionary Baptist Church | 2565 Post St | San Francisco | 94115 | 415-346-6500 | Wed 9:30am-11:30am |
Visitacion Chinese Baptist Church | 8 Desmond St | San Francisco | 94134 |  | Mon-Fri 2pm-6pm |
Lafayette RNC | 4545 Anza St | San Francisco | 94121 |  | Tue 3pm-4pm |
Haight Ashbury Food Program | 1525 Waller St | San Francisco | 94117 | 415-566-0366 | Sat 11:15am-1:15pm |
S.F. Rescue Mission | 140 Turk St | San Francisco | 94102 |  | Mon-Fri 3pm-4pm |
Calvary Street Village Pantry | 1099 Sunnydale Ave | San Francisco | 94134 |  | Thu 3pm-4pm |
The Food Pantry at St. Gregory's | 500 De Haro St | San Francisco | 94107 | 415-255-8100 | Sat 10:30am-12:30pm |
Korean American Senior Center | 745 Buchanan St | San Francisco | 94102 |  | Fri 9:30am-10:30am |
El Centro Bayview Pantry | 1329 Evans Ave | San Francisco | 94124 |  | Fri 11am-12pm |
Free Farm Stand | 3090 23rd St | San Francisco | 94110 |  | Sun 11am-12pm |
First United Presbyterian Church | 1740 Sloat Blvd | San Francisco | 94132 |  | Sat 8:30am-12:30pm |
Mission Bay Community Church | 32 Ocean Ave | San Francisco | 94112 |  | Thu 9am-5pm |
Southeast Asian Community Center | 875 O'Farrell St | San Francisco | 94109 |  | Fri 8:30am-11am |
St. Aidan's Episcopal Church | 101 Gold Mine Dr | San Francisco | 94131 |  | Fri 1pm-2pm |
Heritage Homes | 243 Rey St | San Francisco | 94134 | 415-333-9956 | Mon 12:30pm-1:30pm |
Western Addition FRC Pantry | 1530 Buchanan St | San Francisco | 94115 |  | Fri 10:30am-11:30am |
Grace United Methodist Church | 2540 Taraval St | San Francisco | 94116 |  | Fri 8am-9:40am |
Bayview Church of Christ | 1239 Revere Ave | San Francisco | 94124 |  | Thu 12pm-1pm |
Presbyterian Church in Chinatown (Lions PCC Food Pantry) | 925 Stockton St | San Francisco | 94108 |  | Sat 11:15am-12:55pm |
Church Street Pantry | 152 Church St | San Francisco | 94114 |  | Tue 11:30am-12:50pm |
Macedonia Baptist Church | 2135 Sutter St | San Francisco | 94115 |  | Wed 10am-11:30am |
Webster Eddy Food Pantry | 1280 Webster St | San Francisco | 94115 |  | Wed 8:30am-9:30am |
Richmond District YMCA | 360 18th Ave | San Francisco | 94121 |  | Wed 10am-12pm |
Salvation Army Mission (at Reality SF) | 1325 Valencia St | San Francisco | 94110 |  | Sat 9am-10am |
Hayes Valley Food Pantry | 403 Rose St | San Francisco | 94102 |  | Wed 12pm-1pm |
Visitacion Valley Baptist Church | 45 Leland Ave | San Francisco | 94134 | 415-333-4503 | Sat 8:15am-9:15am |
Chinese Christian Mission | 8-14 Ross Alley | San Francisco | 94108 |  | Tue 7am-9am |
Potrero Hill Neighborhood Food Pantry | 953 De Haro St | San Francisco | 94107 |  | Wed 11:30am-1:30pm |
The Father's House | 269 Zoo Rd | San Francisco | 94132 |  | Thu 5pm-6:15pm |
Temple United Methodist Church | 65 Beverly St | San Francisco | 94132 | 415-586-1444 | Wed 4pm-6:40pm |
Holy Trinity Greek Orthodox Church | 999 Brotherhood Way | San Francisco | 94132 | 415-584-4747 | Sat 11:30am-12:30pm |
Salvation Army Chinatown | 1450 Powell St | San Francisco | 94133 | 415-781-7360 | Fri 1:30pm-2:30pm |
Full Life Christian Center | 3535 Balboa St | San Francisco | 94121 |  | Sat 11:30am-12:30pm |
Youth With A Mission - San Francisco | 357 Ellis St | San Francisco | 94102 | 415-885-6543 | Thu 1:30pm-3:30pm |
Our Kids First - Food Pantry Distribution | 5845 Mission St | San Francisco | 94112 |  | Thu 12pm-1pm |
La Voz Pantry | 470 Ellis St | San Francisco | 94102 |  | Fri 2:30pm-4:30pm |
Calvary Baptist Church | 5655 Mission St | San Francisco | 94112 |  | Sat 10am-11am |
St. Agnes Community Food Pantry | 1025 Masonic Ave | San Francisco | 94117 |  | Thu 1pm-3pm |
Chinatown YMCA (Sabin Place) | 1 Sabin Pl | San Francisco | 94108 |  | Thu 2:30pm-4pm |
Mission Bay Church | 302 Silver Ave | San Francisco | 94112 |  | Sat 11am-12pm |
Jones Memorial United Methodist Church | 1975 Post St | San Francisco | 94115 |  | Sat 10am-11:15am |
St. Dominic's Food Pantry | 2390 Bush St | San Francisco | 94115 |  | Mon 10am-11am |
`,
  },
  SanJoaquin: {
    rows: `
C.A.R.E. | 1601 Second St. | Escalon | 95320 | 209-417-2048 | Wed 8am-11am |
Prayer Valley Family Worship | 14172 Avon Ave | Lathrop | 95330 | 209-662-4019 | 2nd & 4th Thu 9am-12pm |
Salvation Army - Lodi | 525 W. Lockeford St. | Lodi | 95240 | 209-369-5896 | Tue, Thu 9am-10:45am |
Calvary Community Church | 815 West Lathrop Rd. | Manteca | 95336 | 209-239-1345 | Wed 9am-12pm; Thu 4pm-5pm (while supplies last) |
Fellowship Baptist Church of Manteca | 1130 Pine Street | Manteca | 95336 | 209-239-0508 | 3rd Wed 2pm-3:30pm |
St. Paul's United Methodist | 910 E North Street | Manteca | 95336 | 209-823-7154 | Last Sat of month 10am-12pm |
St. Vincent De Paul - Manteca | 505 E. North St. | Manteca | 95336 | 209-823-8099 | Tue, Wed, Fri 2pm-3:30pm |
Transformed Through Hope Ministries | 314 Locust Ave | Manteca | 95337 | 209-815-9815 | 3rd Sat 10am-12pm | https://transformedthministries.org
Eastside Church of God in Christ | 3206 E. Marsh St | Stockton | 95205 | 209-942-0220 | Tue 2:30pm-4:30pm |
Good Samaritan Training Center | 1331 E. Fremont St. | Stockton | 95205 | 209-981-5855 | Mon, Wed, Fri 9am-12pm |
Greater Faith Missionary Baptist Church | 345 W. Worth St. | Stockton | 95206 |  | 4th Sat 2pm-3pm (while supplies last) |
Light House Community Church | 2393 Vail St. | Stockton | 95205 | 209-463-5208 | Sun 11am-12pm (while supplies last) |
Salvation Army - Stockton | 1305 E Weber St | Stockton | 95205 |  | Mon, Wed 9am-3pm; Tue, Thu 9am-12pm |
SDA Stockton | 135 W. Vine St. | Stockton | 95204 | 209-465-0217 | 3rd Wed 11am-2pm |
SDA Valley Community | 2929 S B Street | Stockton | 95205 | 209-915-1959 | Wed 10am-1pm; 4th Mon 8:30am-10am |
St. Vincent de Paul - Stockton | 2544 Plymouth Rd. | Stockton | 95204 | 209-465-3081 | Fri 10am-12pm |
Valley Ministries | 4118 Coronado Ave. | Stockton | 95204 | 209-810-9500 | Sun 9am-10am and 11am-11:30am; Wed 9am-1pm |
Wings of Healing | 834 East Main St | Stockton | 95202 | 209-948-5564 | Tue 9:30am-12pm |
Community Partnership for Families of San Joaquin | 236 W. Beverly Pl. | Tracy | 95376 | 209-229-4922 | Tue 11am-12pm (while supplies last) |
Interfaith Ministries - Tracy | 311 W. Grantline Rd. | Tracy | 95376 | 209-836-5424 | Mon-Thu 10am-2pm |
New Heart Church of the Nazarene | 1647 Bessie Ave. | Tracy | 95376 | 209-914-7780 | Mon 3pm-4:30pm |
Tracy Spanish SDA | 2141 Holly Dr. | Tracy | 95376 | 209-597-3694 | 3rd Wed 10:30am-12pm |
`,
  },
  SanLuisObispo: {
    rows: `
Equippers Church | 1052 E Grand Ave | Arroyo Grande | 93420 | 805-714-2664 | 2nd Sat 10am-11am |
St. Patrick's Outreach | 501 Fair Oaks Ave | Arroyo Grande | 93420 | 805-489-2680 | Tue, Wed, Thu 4pm-5pm (photo ID; South County residents; one visit per week) |
The Salvation Army - Arroyo Grande | 1550 W. Branch St | Arroyo Grande | 93420 | 805-270-7483 | Mon, Wed, Fri 10am-12pm (photo ID) |
ALF Food Pantry | 5411 El Camino Real | Atascadero | 93422 | 805-461-1504 | Mon-Fri 1pm-3pm |
ECHO Atascadero (meal) | 6370 Atascadero Ave | Atascadero | 93422 | 805-462-3663 | Daily 5pm-6pm |
Legacy Church Pantry | 5545 Ardilla Ave | Atascadero | 93422 | 805-466-2626 | Tue 5pm-6pm; Wed 6pm-6:30pm; Thu 1pm-2pm |
Restoration Church | 9333 Santa Barbara Rd | Atascadero | 93422 | 805-538-0449 | 1st Sat 1pm-2:30pm |
Cambria Vineyard Church | 1617 Main St | Cambria | 93428 | 805-927-5550 | 2nd & 4th Thu 12pm-2pm |
Cayucos Community Church | 60 S. 3rd Street | Cayucos | 93430 | 805-995-3821 | Wed 10:30am-11am; Fri 10am-12pm |
Creston Community Church | 5170 O'Donovan Road | Creston | 93432 | 805-459-9068 | 1st, 2nd, 3rd and 5th Thu 3:30pm-5:30pm (bring bags) |
Five Cities Christian Women | 946 Rockaway Ave | Grover Beach | 93433 | 805-473-3368 | Mon-Fri 2pm-3:30pm (photo ID) |
South County People's Kitchen (meal) | 946 Rockaway Ave | Grover Beach | 93433 | 805-458-1992 | Daily 12pm-1pm |
King's Cupboard at El Morro Church | 1480 Santa Ysabel Ave | Los Osos | 93402 | 805-528-0391 | Tue 8am-10am |
People Helping People | 2180 Palisades Ave | Los Osos | 93402 | 805-528-2626 | Wed 9:30am-10:30am |
Trinity United Methodist Church | 490 Los Osos Valley Rd | Los Osos | 93402 | 805-528-1649 | Tue and Fri 10am-12pm |
Morro Bay Lion's Foundation (meal) | 209 Surf St | Morro Bay | 93442 | 805-225-1991 | Mon 3:45pm-5pm |
Open Arms Pantry at Rock Harbor | 1475 Quintana Rd | Morro Bay | 93442 | 805-772-7365 | Sat 9:30am-10:30am |
Nipomo Community Presbyterian Church | 1235 N. Thompson Rd | Nipomo | 93444 | 805-473-8059 | Fri 12:45pm-1:30pm |
Nipomo Food Basket | 197 W. Tefft St | Nipomo | 93444 | 805-619-7681 | Mon, Tue, Thu, Fri 10am-1pm (Nipomo residents only) |
Santa Maria Valley Hispanic Church | 1575 Orchard Rd | Nipomo | 93444 | 805-956-3396 | Tue 6pm-7:30pm; Wed 10am-12pm and 7pm-8pm; Thu 1:30pm-3:30pm |
ECHO Paso Robles (meal) | 1134 Black Oak Drive | Paso Robles | 93446 | 805-462-3663 | Daily 4:30pm-5:30pm |
The Salvation Army - Paso Robles | 711 Paso Robles St | Paso Robles | 93446 | 805-221-8075 | Tue 10am-11am (photo ID) |
SLO Food Bank Pantry | 1180 Kendall Road | San Luis Obispo | 93401 | 805-238-4664 | Mon, Wed, Fri 12pm-5pm | https://slofoodbank.org
Agape Church | 950 Laureate Ln | San Luis Obispo | 93405 | 805-541-0777 | Sun 12pm-12:30pm |
Breakthrough Ministry | 4251 S Higuera St #200 | San Luis Obispo | 93401 | 805-234-7441 | Tue 2pm-3pm |
God's Storehouse at Grace Church | 1350 Osos St | San Luis Obispo | 93401 | 805-543-2358 | Sat 8:30am-9:15am |
SLO City Church | 1775 Calle Joaquin | San Luis Obispo | 93405 | 805-543-3162 | Mon 2:30pm-4:30pm |
Renovate Church | 2075 Johnson Ave | San Luis Obispo | 93401 | 805-543-0945 | Mon 4pm-6pm; Wed, Fri 10am-12pm; Thu 2pm-4pm |
Unitarian Universalists SLO | 2201 Lawton Ave | San Luis Obispo | 93401 | 805-439-0188 | Wed 3pm-4:30pm |
Zion Lutheran Church | 1010 Foothill Blvd | San Luis Obispo | 93405 | 805-543-8327 | Wed 9:30am-11:30am |
Children and the Country Life (at San Miguel Mission) | 795 Monterey Road | San Miguel | 93451 | 805-467-3256 | 3rd Wed 5pm-6pm |
Templeton Hills H.O.P.E. Pantry | 930 Templeton Hills Rd | Templeton | 93465 | 805-459-0817 | Sun 9:30am-10:30am |
Neighborhood Distribution - Soto Park | 1275 Ash Street | Arroyo Grande | 93420 | 805-238-4664 | Monthly 8am-9am (date varies) | https://findfoodslo.org
Neighborhood Distribution - Atascadero Library | 6555 Capistrano Ave | Atascadero | 93422 | 805-238-4664 | Monthly 4:30pm-6pm (date varies) | https://findfoodslo.org
Neighborhood Distribution - Grange Hall | 5035 Palma Ave | Atascadero | 93422 | 805-238-4664 | Monthly 10am-11:30am (date varies) | https://findfoodslo.org
Neighborhood Distribution - Lachen Tara Apartments | 240 Ocean Oaks Lane | Avila Beach | 93424 | 805-238-4664 | Monthly 12:30pm-1:30pm (date varies) | https://findfoodslo.org
Neighborhood Distribution - California Valley Community Center | 13080 Soda Lake Road | California Valley | 93453 | 805-238-4664 | Monthly 11am-12:30pm (date varies) | https://findfoodslo.org
Neighborhood Distribution - Santa Rosa Church | 1174 Main Street | Cambria | 93428 | 805-238-4664 | Monthly 3pm-4pm (date varies) | https://findfoodslo.org
Neighborhood Distribution - Oak Hill Market | 2150 Heritage Loop Road | Heritage Ranch | 93446 | 805-238-4664 | Monthly 3pm-4pm (date varies) | https://findfoodslo.org
Neighborhood Distribution - Baywood Elementary | 1330 9th Street | Los Osos | 93402 | 805-238-4664 | Monthly 3:30pm-4:30pm (date varies) | https://findfoodslo.org
Neighborhood Distribution - Morro Bay Library | 625 Harbor Street | Morro Bay | 93442 | 805-238-4664 | Monthly 4:30pm-5:30pm (date varies) | https://findfoodslo.org
Neighborhood Distribution - St. Joseph's Church | 295 S. Thompson Ave | Nipomo | 93444 | 805-238-4664 | Monthly 9:30am-10:30am (date varies) | https://findfoodslo.org
Neighborhood Distribution - Nipomo High School | 525 N. Thompson Ave | Nipomo | 93444 | 805-238-4664 | Monthly 4:30pm-6pm (date varies) | https://findfoodslo.org
Neighborhood Distribution - Oceano Senior Center | 1580 Railroad Street | Oceano | 93445 | 805-238-4664 | Monthly 9am-10am (date varies) | https://findfoodslo.org
Neighborhood Distribution - Oceano Community Center | 1425 19th Street | Oceano | 93445 | 805-238-4664 | Monthly 2:30pm-4pm (date varies) | https://findfoodslo.org
Neighborhood Distribution - Cuesta College North County Campus | 2800 Buena Vista Drive | Paso Robles | 93446 | 805-238-4664 | Monthly 3pm-5pm (date varies) | https://findfoodslo.org
Neighborhood Distribution - 2nd Baptist Church | 1937 Riverside Ave | Paso Robles | 93446 | 805-238-4664 | Monthly 9am-10am (date varies) | https://findfoodslo.org
Neighborhood Distribution - Grace Baptist Church | 535 Creston Road | Paso Robles | 93446 | 805-238-4664 | Monthly 9am-10am (date varies) | https://findfoodslo.org
Neighborhood Distribution - Virginia Peterson Elementary | 2501 Beechwood Drive | Paso Robles | 93446 | 805-238-4664 | Monthly 3pm-4pm (date varies) | https://findfoodslo.org
Neighborhood Distribution - Housing Authority at Oak Park | 30th and Pine Street | Paso Robles | 93446 | 805-238-4664 | Monthly 3:30pm-5:30pm (date varies) | https://findfoodslo.org
Neighborhood Distribution - Salvation Army SLO | 815 Islay Street | San Luis Obispo | 93401 | 805-544-2401 | Monthly 4pm-5pm (date varies) | https://findfoodslo.org
Neighborhood Distribution - Cal Poly University | 1 Via Carta Rd | San Luis Obispo | 93407 | 805-238-4664 | Monthly 3:30pm-5:30pm (date varies) | https://findfoodslo.org
Neighborhood Distribution - C.L. Smith Elementary | 1375 Balboa Street | San Luis Obispo | 93405 | 805-238-4664 | Monthly 2:30pm-3:30pm (date varies) | https://findfoodslo.org
Neighborhood Distribution - Lillian Larsen Elementary | 1601 L Street | San Miguel | 93451 | 805-238-4664 | Monthly 4:30pm-6pm (date varies) | https://findfoodslo.org
Neighborhood Distribution - Oceanside Apartments | 9490 Avonne Ave | San Simeon | 93452 | 805-238-4664 | Monthly 5pm-6pm (date varies) | https://findfoodslo.org
Neighborhood Distribution - Santa Margarita Senior Center | 2210 H Street | Santa Margarita | 93453 | 805-238-4664 | Monthly 9am-10am (date varies) | https://findfoodslo.org
Neighborhood Distribution - Shandon High School | 101 S. 1st Street | Shandon | 93461 | 805-238-4664 | Monthly 4:30pm-6pm (date varies) | https://findfoodslo.org
`,
  },
  SanMateo: {
    rows: `
Selby Lane School | 170 Selby Lane | Atherton | 94027 |  | 2nd Thu 2:45pm-4:45pm |
Menlo College pantry | 1000 El Camino Real | Atherton | 94027 |  | Mon-Thu 3pm-9pm |
Yaseen Belmont Masjid | 621 Masonic Way | Belmont | 94002 |  | 4th Sat 7:45am-9am |
CALL Primrose | 139 Primrose Road | Burlingame | 94010 |  | Mon-Fri 9:30am-2:45pm |
Support Life | 1722 Gilbreth Road | Burlingame | 94010 |  | 3rd Fri 11am-1pm |
Colma Historical Society | 1500 Hillside Boulevard | Colma | 94014 |  | 3rd Wed 9:30am-11:30am |
Doelger & Lincoln Senior Centers (meal program) | 101 Lake Merced Boulevard | Daly City | 94015 |  | Mon-Fri 12pm-1pm (meals) |
Daly City Partnership | 350 90th Street 1st Floor | Daly City | 94015 |  | Mon, Tue, Wed 10:30am-2pm |
Doelger & Lincoln Senior Centers (groceries) | 101 Lake Merced Boulevard | Daly City | 94015 |  | 1st & 3rd Tue 9am-11:45am; 2nd & 4th Thu 9am-11:45am |
Lincoln Community Center | 901 Brunswick Street | Daly City | 94014 |  | 2nd & 4th Wed 2pm-3pm; meals Mon-Fri 12pm-1pm |
Our Second Home | 725 Price Street | Daly City | 94014 |  | Mon-Fri 11:30am-1:30pm |
Bayshore Community Center (meal program) | 450 Martin St | Daly City | 94014 |  | Mon-Fri 12pm-1pm (meals) |
Gellert Community Center (meal program) | 50 Wembley Drive | Daly City | 94015 |  | Mon-Fri 12pm-1pm (meals) |
Boys & Girls Clubs of the Peninsula | 2031 Pulgas Ave | East Palo Alto | 94303 |  | 1st & 3rd Fri 5pm-6pm |
Runnymede Gardens Apartments | 2301 Cooley Ave | East Palo Alto | 94303 |  | 4th Thu 10:30am-11:30am |
Costano Elementary School | 2086 Clarke Ave | East Palo Alto | 94303 |  | 2nd & 4th Sat 8:30am-11:30am |
Ecumenical Hunger Program | 2411 Pulgas Avenue | East Palo Alto | 94303 |  | Mon-Thu 9am-12pm and 2pm-5pm |
One East Palo Alto | 2100 Bay Road | East Palo Alto | 94303 |  | Thu 2pm-3:30pm |
WeHOPE | 1854 Bay Rd | East Palo Alto | 94303 |  | Tue 11:30am-1:30pm |
Los Robles Ronald McNair Academy | 2033 Pulgas Ave | East Palo Alto | 94303 |  | Mon 2pm-3pm |
MidPen Housing | 2358 University Avenue | East Palo Alto | 94303 |  | 4th Thu 10:30am-11:30am |
Samaritan House East Palo Alto (meal) | 1832 Bay Road | East Palo Alto | 94303 |  | Fri 3:30pm-4:30pm (meals) |
Onyxx Village Connection (mobile meals) | Mobile van | East Palo Alto | 94303 |  | Mon-Thu 11am-12pm (meals) |
Foster City Library | 1000 East Hillsdale Boulevard | Foster City | 94404 |  | 1st & 3rd Fri 8:30am-9:45am |
Half Moon Village Apartments | 801 Arnold Way | Half Moon Bay | 94019 |  | 2nd & 4th Mon 1:30pm-2:30pm |
Main Street Park Apartments | 1101 Main Street | Half Moon Bay | 94019 |  | 1st Wed 3:30pm-5:30pm |
Moonridge Apartments | 2001 Miramontes Point Rd | Half Moon Bay | 94019 |  | 3rd Wed 3:30pm-5:30pm |
Ted Adcock Community Center | 535 Kelly Avenue | Half Moon Bay | 94019 |  | 2nd & 4th Thu 3pm-5pm |
No Strings Attached Breakfast (meal) | 925 Main Street | Half Moon Bay | 94019 |  | Sat 9am-10am (meals) |
Senior Coastsiders (meal program) | 925 Main St | Half Moon Bay | 94019 |  | Mon-Fri 10am-2pm (meals) |
Ayudando Latinos A Sonar (ALAS) | 507 Purissima Street | Half Moon Bay | 94019 |  | Mon-Fri 9am-4:30pm; 2nd & 4th Sat 10am-12pm |
Coastside Hope Pantry | 248 Main Street | Half Moon Bay | 94019 |  | Mon, Tue, Thu, Fri 8:30am-12pm; Mon-Fri 1pm-5pm |
SVDP Our Lady of the Pillar | 400 Church St | Half Moon Bay | 94019 |  | Mon 12:30pm-2:30pm; Sat 10am-12pm |
Coastside Adult Day Health Center (meal) | 925 Main Street Suite A | Half Moon Bay | 94019 |  | Mon-Fri 12pm-1pm (meals) |
SVDP Our Lady of Refuge | 146 Sears Ranch Road | La Honda | 94020 |  | Sun 12pm-1pm |
Garfield Community School | 3600 Middlefield Road | Menlo Park | 94025 |  | 2nd & 4th Tue 3pm-4pm |
Menlo Park Senior Center | 100 Terminal Ave | Menlo Park | 94025 |  | 2nd & 4th Thu 10am-11:45am |
Mt. Olive Apostolic Holy Church of God (meal) | 605 Hamilton Avenue | Menlo Park | 94025 |  | Mon-Thu 4pm-6pm (meals) |
St. Anthony's Dining Room (meal) | 3500 Middlefield Road | Menlo Park | 94025 |  | Mon-Sat 11am-1pm (meals) |
Belle Haven Elementary School | 415 Ivy Drive | Menlo Park | 94025 |  | Fri 2pm-3pm |
Little House Adult Day Activity Center | 800 Middle Avenue | Menlo Park | 94025 |  | Wed 11:30am-1:30pm |
Abode Services SMC | 181 North Rollins Road | Millbrae | 94030 |  | 1st Mon 9am-10am |
Pacifica Resource Center (Buel Ave distribution) | 555 Buel Ave | Pacifica | 94044 |  | 4th Wed 2:30pm-4:30pm |
Pacifica Resource Center (2316 Palmetto) | 2316 Palmetto Avenue | Pacifica | 94044 |  | Mon-Thu 9am-12pm; Fri 9am-1pm |
Pacifica Resource Center (1809 Palmetto) | 1809 Palmetto Avenue | Pacifica | 94044 |  | Mon-Thu 9am-12:30pm; Fri 9am-1pm |
Puente de la Costa Sur | 620 North Street | Pescadero | 94060 |  | Mon-Fri 8am-5pm; 1st Wed 4pm-6pm |
SVDP St. Anthony Mission | 696 North St | Pescadero | 94060 |  | 2nd & 4th Sat 2pm-4pm |
Pescadero Elementary School | 620 North Street | Pescadero | 94060 |  | 2nd & 4th Mon 4:30pm-5:30pm |
Canada College / SMCCCD | 4200 Farm Hill Blvd | Redwood City | 94061 |  | Tue 10:30am-12:30pm |
Fair Oaks Adult Activity Center | 2600 Middlefield Rd | Redwood City | 94063 |  | 2nd & 4th Fri 10:30am-12pm |
Fair Oaks Community Center | 2600 Middlefield Rd | Redwood City | 94063 |  | 1st Fri 4pm-6pm |
Hoover Elementary School | 701 Charter Street | Redwood City | 94063 |  | 1st Thu 3pm-4:30pm |
John F. Kennedy Middle School | 2521 Goodwin Ave | Redwood City | 94061 |  | 3rd Thu 3pm-4pm |
Rocketship RWC Prep | 1148 Hudson St | Redwood City | 94061 |  | 1st & 3rd Fri 3:30pm-5pm |
Taft Elementary School | 903 Tenth Ave | Redwood City | 94063 |  | 2nd Wed 2:30pm-3:30pm |
AIDS Community Resource Consortium | 855 Douglas Avenue | Redwood City | 94063 |  | Wed, Thu 9am-2pm |
Project READ - Redwood City Library | 1044 Middlefield Road | Redwood City | 94063 |  | Tue 2pm-5pm |
Salvation Army Redwood City | 660 Veterans Blvd | Redwood City | 94063 |  | Wed 9:15am-11am and 1pm-2:30pm; Fri 9:15am-11am |
Service League of San Mateo County | 727 Middlefield Rd | Redwood City | 94063 |  | Mon-Fri 8am-5pm |
SparkPoint at Canada College | 4200 Farm Hill Blvd | Redwood City | 94061 |  | Tue, Wed, Thu 12pm-4pm |
St. Francis Center | 151 Buckingham Ave | Redwood City | 94063 |  | Mon-Fri 10:30am-1:30pm |
Verbo Family Services | 2798 Bay Rd | Redwood City | 94063 |  | Wed 11:30am-1:30pm; Fri 4:30pm-8pm |
CityTeam at ChaseLove | 468 Grand Street | Redwood City | 94062 |  | 4th Sat 10am-12pm |
Belle Air Elementary School | 450 Third Ave | San Bruno | 94066 |  | 4th Wed 2:30pm-4pm |
First Tongan United Methodist Church | 560 El Camino Real | San Bruno | 94066 |  | 1st Sat 8am-9:30am; 3rd Sat 1pm-2pm |
Skyline College | 3300 College Drive Building 1 Floor 2 | San Bruno | 94066 |  | Tue, Wed, Thu 10:30am-4pm; Fri 10:30am-12:30pm; 1st Fri 3pm-5pm |
San Carlos Adult Community Center | 601 Chestnut Street | San Carlos | 94070 |  | Tue 12pm-2pm |
College of San Mateo | 1700 West Hillsdale Blvd | San Mateo | 94402 |  | 2nd & 4th Fri 11am-1pm |
Fiesta Gardens International School | 715 Indian Avenue | San Mateo | 94401 |  | Alternate Sat 9am-10:30am |
Greater Life Church | 525 South Bayshore Boulevard | San Mateo | 94401 |  | 1st & 3rd Wed 1pm-2:30pm |
Hillsdale High School | 3115 Del Monte St | San Mateo | 94403 |  | Fri 8am-9:30am |
Hillsdale United Methodist Church | 303 W 36th Ave | San Mateo | 94403 |  | 1st Fri 3:30pm-5:30pm |
Martin Luther King Jr Community Center | 725 Monte Diablo Ave | San Mateo | 94401 |  | 3rd Mon 2pm-3pm |
Rogell Court | 409 Rogell Court | San Mateo | 94401 |  | 1st Mon 8am-8:45am |
Samaritan House at Cottage Grove | 949 Ocean View Way | San Mateo | 94403 |  | 3rd Fri 4pm-5pm |
Samaritan House at King Center | 725 Monte Diablo Ave | San Mateo | 94401 |  | 1st Mon 11am-12pm |
San Mateo County Event Center | 1346 Saratoga Drive | San Mateo | 94403 |  | Thu 8:30am-10:30am |
Sturge Presbyterian Church | 25 South Humboldt Street | San Mateo | 94401 |  | 1st & 3rd Thu 4pm-5:30pm |
Waypoint Church | 194 W 25th Avenue | San Mateo | 94403 |  | 2nd & 4th Tue 8:15am-9:15am |
Samaritan House (meal program) | 4031 Pacific Blvd | San Mateo | 94403 |  | Sat, Sun 12pm-1pm (meals) |
SVDP of San Mateo County (meal program) | 50 N. B Street | San Mateo | 94401 |  | Mon-Fri 9am-11am (meals) |
Macedonia Church of God in Christ | 66 N. Claremont Street | San Mateo | 94401 |  | Tue 7am-10:30am |
Mid-Pen Hispanic Outreach | 194 W. 25th Ave | San Mateo | 94403 |  | Fri 11am-12pm |
Samaritan House pantry | 4031 Pacific Blvd | San Mateo | 94403 |  | Mon-Fri 9am-12pm and 1pm-4pm |
Samaritan House (Tilton Ave meal) | 225 Tilton Avenue | San Mateo | 94401 |  | Mon-Fri 4pm-5pm (meals) |
All Souls Catholic Church | 315 Walnut Ave | South San Francisco | 94080 |  | 4th Sat 11am-12pm |
Grace Covenant Church | 740 Del Monte Avenue | South San Francisco | 94080 |  | 1st Sat 8am-9:30am |
HPSM | 685 Gateway Boulevard | South San Francisco | 94080 |  | 1st Sat 8am-10am |
Latin American 7th Day Adventist | 540 Miller Ave | South San Francisco | 94080 |  | 3rd Thu 3pm-5pm |
South San Francisco Adult School | 825 Southwood Drive | South San Francisco | 94080 |  | 3rd Tue 2pm-3pm |
YMCA (1 W. Orange) | 1 W. Orange Ave | South San Francisco | 94080 |  | 1st Wed 12:30pm-1:30pm; 3rd Fri 1:30pm-2:30pm |
SVDP Homeless Help Center (meal program) | 344 Grand Avenue | South San Francisco | 94080 |  | Mon-Fri 10am-11am (meals) |
Embassy Christian | 925 Linden Avenue | South San Francisco | 94080 |  | 2nd Sat 8:30am-10:30am |
Primera Iglesia Bautista de SSF | 299 Country Club Drive | South San Francisco | 94080 |  | Wed 6pm-7pm |
Unity Lutheran Church | 609 Southwood Drive | South San Francisco | 94080 |  | 1st Sat 11am-12:30pm |
YMCA Community Resource Center | 1486 Huntington Ave | South San Francisco | 94080 |  | Mon 8am-12pm; Tue, Thu 12pm-4pm |
YMCA SSF Library (meal program) | 840 W Orange Avenue | South San Francisco | 94080 |  | 4th Thu 9am-10:30am (meals) |
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
      source: 'Hand-collected list (SF HSA / SF-Marin FB, San Joaquin Vivery finder, SLO Food Bank, Second Harvest of Silicon Valley). Schedules parsed via LA clause parser.',
      note: 'Drop-in raw for prepare-food-additions.mjs. SLO neighborhood "Monthly (date varies)" + single-time meals route to _deferred.',
    },
    sites,
  };
  writeFileSync(`./${county}Additions-raw.json`, JSON.stringify(out, null, 2));
  console.log(`\n=== ${county}: ${sites.length} sites | ${withEvents} with events | ${sites.length - withEvents} deferred | ${flags.filter((f) => f.includes('no street')).length} city-level ===`);
}
