/*
 * build-food-batch7.mjs — Sacramento (additions), San Benito (NEW), San Bernardino (additions).
 * Sacramento + San Bernardino already have live shells, so their raw is prepared
 * with --existing dedupe + the real --shell-id (see run notes). San Benito is new.
 * Writes ./b7-<County>-raw.json (b7- prefix avoids clobbering earlier batch files).
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

const COUNTIES = {
  Sacramento: {
    rows: `
Carmichael Presbyterian Church Food Closet | 5645 Marconi Ave | Carmichael | 95608 | 916-483-9232 | Mon, Tue, Thu 1:30pm-2pm; Thu 6pm-7pm; 3rd Sat 4pm-5pm (congregate meal) |
San Juan Central - Food Closet | 3700 Garfield Avenue Room 14 | Carmichael | 95608 | 916-979-8878 | Mon-Fri 9am-1pm (closed holidays) |
Sunrise Christian Food Ministry | 5901 San Juan Avenue | Citrus Heights | 95610 | 916-287-1358 | Mon, Tue, Thu, Fri 10:30am-1pm |
Elk Grove Food Bank - Window | 9888 Kent Street | Elk Grove | 95624 | 916-685-8453 | Mon-Fri 9am-2pm; 4th Wed 9am-11am |
Sunshine Food Pantry | 571 C Street | Galt | 95632 | 209-200-2628 | 2nd Thu 7:30am-10am; 4th Fri 7:30am-10am |
The Salvation Army - Rancho Cordova | 10370 Old Placerville Road Suite 107 | Mather | 95827 | 916-369-9940 | 1st Wed 10am-2pm |
Feeding God's Children | 5808 Watt Avenue | North Highlands | 95660 | 916-803-5233 | Sat 8am-9am (call ahead to reserve a bag) |
Murph-Emmanuel AME Church | 4151 Don Julio Blvd | North Highlands | 95660 | 916-332-7749 | 3rd Sat 11am-2pm |
The Salvation Army - Family Service Office | 3213 Orange Grove Avenue | North Highlands | 95660 | 916-678-4010 | Tue, Wed, Thu 9am-1pm; 4th Mon 9am-1pm |
Orangevale SDA | 5810 Pecan Avenue | Orangevale | 95662 | 916-967-2838 | Tue 9am-12pm |
Orangevale-Fair Oaks Food Bank | 6483 Main Avenue | Orangevale | 95662 | 916-238-8868 | Mon 11am-1pm; Wed 4:30pm-6:30pm; Thu, Fri 10am-12:30pm |
Rancho Cordova Community Food Hub | 2771 Don Juan Drive | Rancho Cordova | 95670 |  | Mon 11am-3pm; Tue, Wed 9am-1pm; Thu 4pm-7pm; 3rd Sat 9am-1pm | https://ranchocordovafoodlocker.org
Shelby's Way | 3017 Gold Canal Dr. Suite 500 | Rancho Cordova | 95670 | 916-800-8934 | Sat 11am-1pm |
The People's Pantry | 2101 Zinfandel Drive | Rancho Cordova | 95670 | 916-635-4242 | 3rd Tue 10am-11:30am (drive-thru) |
Al-Misbaah | 2020 Hurley Way Suite 110 | Sacramento | 95825 |  | Mon-Thu 9am-5pm (nonperishables) | https://al-misbaah.org
Antioch Progressive Church | 7650 Amherst Street | Sacramento | 95832 |  | Tue 8:30am-10:30am |
Arcade Church | 3867 Marconi Ave | Sacramento | 95821 | 916-456-1980 | 2nd & 4th Tue 9am-11am |
BOSS Church | 6965 Luther Drive | Sacramento | 95823 | 916-441-6228 | 2nd Fri 5pm-7pm; 3rd Sat 10am-12pm |
Bridge Network | 7851 35th Avenue | Sacramento | 95824 | 916-244-1406 | 2nd & 4th Fri 11am-1pm |
Calvary Christian Church | 2667 Del Paso Blvd | Sacramento | 95815 | 916-929-5725 | Tue 11am-12pm |
Carmichael Seventh-day Adventist Church | 4694 Pasadena Ave | Sacramento | 95841 | 916-487-8684 | Wed 9am-11am |
Christ Chapel Ministries | 4340 Stockton Blvd | Sacramento | 95820 | 279-203-5816 | Every other Sat 10am-12pm (call for dates) |
Christian Fellowship Ministry | 3410 Rio Linda Blvd | Sacramento | 95838 | 916-567-1264 | Wed 3pm-4pm |
Common Ground Covenant Church | 8355 Arroyo Vista Drive | Sacramento | 95823 | 916-689-3010 | Sat 8am-11:30am |
Daughters of Zion Enterpryz | 6524 44th Street Ste 208 | Sacramento | 95823 | 916-422-3875 | Wed 4:30pm-6:30pm |
G-7 Thy Prescence's School of Faith Ministries | 3101 Redding Ave | Sacramento | 95820 | 916-642-8181 | Sun 2pm-3pm; Tue, Fri 6:30pm-8pm (drive-up) |
Hart Senior Center | 915 27th Street | Sacramento | 95816 | 916-456-1980 | 3rd Wed 9am-10:30am |
Hope Cooperative (TLCS) - Clubhouse | 3737 Marconi Ave | Sacramento | 95821 | 916-480-1801 | Mon-Fri 8:30am-4pm (congregate meals) | https://hopecoop.org
ICNA Relief at the Salam Islamic Center | 4545 College Oak Dr | Sacramento | 95841 | 866-354-0102 | 3rd Sat 9am-11am |
ICNA Relief Resource Center Sacramento | 5045 College Oak Dr Suite L | Sacramento | 95841 | 866-354-0102 | Mon-Fri 9am-3pm |
Joey's Food Locker | 3301 Fong Ranch Road | Sacramento | 95834 | 916-870-1659 | Thu 4pm-5:30pm |
Mack Road Valley Hi Community Center | 7833 Center Parkway | Sacramento | 95823 | 916-556-3344 | 1st & 3rd Wed 3:30pm-5:30pm |
Manna Food Bank | 4840 Marysville Blvd | Sacramento | 95838 | 916-922-6442 | Thu 5pm-7pm; Fri 10am-12pm (no early entry) |
Neighbor Program | 3230 Broadway | Sacramento | 95817 | 916-642-9833 | Mon, Fri 11am until supplies last |
New Hope Community Church | 1821 Meadowview Road | Sacramento | 95832 | 916-422-3370 | Thu 12pm-3pm (online sign-up from 7am) |
New St. Bethel Baptist Church | 4201 8th Avenue | Sacramento | 95817 | 916-838-5329 | 2nd & 4th Tue 10am-11am; 4th Sat 11am-12:30pm |
Potters House | 2994 Del Paso Blvd | Sacramento | 95815 | 916-905-6268 | Thu 10:30am-11:30am (registration 9:30am) |
Presentation of the Blessed Virgin Mary | 4123 Robertson Avenue | Sacramento | 95821 | 916-485-3482 | Tue, Thu 9:30am-11:30am | https://presentationparish.org
Progressive COGIC | 2251 Meadowview Rd | Sacramento | 95832 | 916-391-8297 | Mon 11am-12:30pm |
Promise Land Ministries | 5540 Martin Luther King Jr Blvd | Sacramento | 95820 | 916-670-4520 | 2nd & 4th Thu 3pm-5pm |
Purpose & Legacy | 5314 Walnut Avenue | Sacramento | 95841 | 916-200-3989 | Mon, Wed, Fri 11am-1pm |
Redeemed Christian Church of God - Redemption Parish | 548 Display Way | Sacramento | 95838 | 916-912-7139 | 3rd week of month 1pm-2pm |
River City Food Bank - Midtown | 1800 28th Street | Sacramento | 95816 | 916-446-2627 | Tue, Thu 10:30am-1:30pm |
River City Food Bank - St. Matthew's | 2300 Edison Avenue | Sacramento | 95821 | 916-446-2627 | Wed, Fri 10:30am-1:30pm; 2nd Mon 10:30am-12pm |
Rose Family Creative Empowerment Center - Providence Place Apts. | 5700 Mack Road | Sacramento | 95823 | 916-301-6729 | Mon, Wed 1pm-3pm; Fri 10am-12pm | https://rfcecenter.com
Sacramento Central SDA Church | 6045 Camellia Avenue | Sacramento | 95819 | 916-457-6511 | 2nd & 4th Wed 9am-10:30am |
Sacramento Samoa New Covenant Church | 8115 Elder Creek Road | Sacramento | 95824 | 916-241-5769 | Sat 8am-9am |
Shiloh Baptist Church | 3565 9th Avenue | Sacramento | 95817 | 916-664-3850 | Mon 9:30am-11am |
Sierra Arden Neighborhood Food Closet | 890 Morse Avenue | Sacramento | 95864 |  | Mon, Wed, Thu, Fri 9:30am-11am; Thu 3:30pm-5:30pm (first 30 families) |
South Natomas Community Center | 2921 Truxel Road | Sacramento | 95833 | 916-456-1980 | 1st & 3rd Tue 9am-11am |
Southpointe Christian Center | 7520 Stockton Blvd | Sacramento | 95823 | 916-504-3370 | Mon 7:30am-9am |
St. Anne Catholic Church | 7720 24th Street | Sacramento | 95832 | 916-690-5713 | 1st Thu 9am-10am |
St. Paul COGIC | 2771 Grove Avenue | Sacramento | 95815 | 916-869-1899 | Wed 9am-11am |
St. Philomene | 2428 Bell Street | Sacramento | 95825 | 916-481-7113 | Tue 6:30pm-7:30pm |
SVDP Presentation | 4123 Robertson Avenue | Sacramento | 95821 | 916-481-7441 | Tue, Thu 9am-11am |
Union Gospel Mission | 400 Bannon Street | Sacramento | 95811 | 916-447-3268 | Mon-Thu 9am-9:30am; Tue, Thu 1pm-2pm; Sun 11am-12:30pm |
Wellspring Women's Center | 3414 4th Ave | Sacramento | 95817 |  | Mon-Fri 8:30am-11:30am |
Woodside SDA Church | 3300 Eastern Ave | Sacramento | 95821 | 916-482-6444 | 2nd & 4th Sat 2pm-4pm |
Zion Church in Jesus Christ | 3723 Altos Ave | Sacramento | 95838 | 916-927-4006 | Fri 2pm-3pm |
South County Services - Main Office | 14177 Market Street | Walnut Grove | 95690 | 209-745-9174 | Mon, Tue, Wed, Fri 8:30am-12pm and 1pm-4pm |
South County Services - Walnut Grove Library | 14177 Market Street | Walnut Grove | 95690 | 209-745-9174 | Thu 9am-12pm |
`,
  },
  SanBenito: {
    rows: `
Community Food Bank of San Benito County - Marketplace | 1133 San Felipe Road | Hollister | 95023 | (831) 637-0340 | Thu 9am-3pm | https://communityfoodbankofsbc.org
Hollister Mobile Pantry - Central | Central and Willow | Hollister | 95023 | (831) 637-0340 | Mon 12:30pm-1:30pm | https://communityfoodbankofsbc.org
Hollister Mobile Pantry - San Juan Rd | San Juan Rd and Rajkovich | Hollister | 95023 | (831) 637-0340 | Mon 2pm-3pm | https://communityfoodbankofsbc.org
Salvation Army - Hollister Corps | 910 Buena Vista Rd | Hollister | 95023 | (831) 636-9832 | Food distribution Fri 1pm-4pm; meals Mon-Fri 11am-12pm | https://salvationarmyusa.org
`,
  },
  SanBernardino: {
    rows: `
Christ the Good Shepard | 17900 Jonathan St | Adelanto | 92301 | 760-628-9270 | 2nd & 3rd Wed 8:30am-11am |
Curbside Community Center | 11565 Cortez Ave | Adelanto | 92301 | 760-953-7944 | Fri 1pm-3:30pm; Sat 9am-12pm |
360 Community Thrift | 20646 N CA-18 | Apple Valley | 92307 | 760-503-4948 | Tue-Fri 10am-6pm; Sat 10am-5pm |
Apple Valley Schools Foundation | 12555 Navajo Rd | Apple Valley | 92308 | 760-247-8001 | Fri 1pm-3pm |
Church for Whosoever | 18628 Seneca Rd | Apple Valley | 92307 | 760-242-3191 | Mon, Wed 10am-2pm; Tue 11am-2pm |
The Way of the Cross Church of God in Christ SWD | 20601 US Highway 18 Bldg 165 | Apple Valley | 92307 | 760-713-1867 | Fri 10am-11am (while supplies last) |
Desert Manna | 2410 Armory Rd | Barstow | 92311 | 760-256-7797 | Fri 9am-11am; Sat 9am-12:30pm; 3rd Thu 8:30am-11am |
enRiched Pantry | 800 Yucca Ave | Barstow | 92311 | 760-220-9297 | Thu 10am-12pm |
Big Bear City Foursquare Church | 800 S. Greenspot Blvd | Big Bear | 92314 | 951-741-5649 | Wed 10:30am-1pm |
St. Joseph Catholic Church | 42242 N Shore Dr | Big Bear | 92314 | 909-866-3030 | Tue 9am-11am |
Big Bear Advantage | 39853 Crocus Dr | Big Bear Lake | 92315 | 909-916-1746 | Mon, Fri 2pm-4pm | https://bigbearfoodbank.com
Big Bear Believers Church | 42180 Moonridge Rd | Big Bear Lake | 92315 | 909-866-2552 | Sun 12pm-1pm; Thu 9am-3pm |
Doves of Big Bear Valley | 41943 Big Bear Blvd | Big Bear Lake | 92315 | 909-866-1546 | Mon-Fri 10am-4pm |
Nazarene Church of Bloomington | 9904 Bloomington Ave | Bloomington | 92316 | 909-877-0769 | 3rd Sat 7am-9am |
Chino Senior Center | 13170 Central Ave | Chino | 91710 | 909-334-3271 | 4th Thu 9am-11am |
Food For Life Ministries | 4712 Cheyenne Way | Chino | 91710 | 909-627-3663 | Tue, Thu 4pm-6pm; Sat 9am-12pm |
Sunrise Church - Chino | 5559 Park Pl | Chino | 91710 | 909-281-7797 | Tue-Fri 9am-12pm |
SDA Inland Spanish Church | 710 W Citrus St | Colton | 92324 | 909-653-7700 | Sat 11am-1pm |
Soldiers of the Cross of Christ | 501 E C St | Colton | 92324 | 682-438-0333 | 4th Sun 11am-1pm |
Vineyard Christian Fellowship | 785 Colton Ave | Colton | 92324 | 909-824-5753 | Last Sun of month 1pm-2:30pm |
Women of Worship and Warfare | 1380 N La Cadena Dr | Colton | 92324 | 909-659-1674 | 3rd Thu 9am-12pm |
Boys & Girls Club Mountain Communities | 607 Forest Shade Rd | Crestline | 92325 | 909-338-9390 | Mon-Fri 7am-6pm |
Fontana Community Senior Center | 16710 Ceres Ave | Fontana | 92335 |  | 1st Fri 9am-11am |
Fontana First Assembly Of God | 16580 San Bernardino Ave | Fontana | 92335 | 909-829-1911 | Wed 10:30am-2:30pm |
Fontana Foursquare - Living Way | 16725 Valencia Ave | Fontana | 92335 | 909-823-4404 | Tue 8am-11:30am (on call) |
Water Of Life Community Church | 16815 Spring St #2227 | Fontana | 92335 | 909-803-1059 | Thu 8am-10:30am (on call) |
Church of Fire in Christ | 12354 Mt Vernon Ave | Grand Terrace | 92313 | 909-580-7637 | 3rd Sat 10am-12pm |
Agape Life Line Ministries Inc. | 10178 I Ave Unit C | Hesperia | 92345 | 310-753-4697 | Fri 12pm-4pm |
Feed My Sheep Ministries | 11616 Hesperia Rd | Hesperia | 92345 | 760-243-4343 | Mon, Wed, Fri, Sat 10am-12pm |
High Desert Second Chance | 16666 Smoke Tree St Suite B-4 | Hesperia | 92345 | 442-267-4444 | Mon-Thu 10am-3pm; Sat 9am-12pm; 2nd Wed 9am-11am |
Jericas Empowerment Center | 10968 I Ave | Hesperia | 92345 | 760-553-5242 | Fri 2pm-4:30pm |
Restore Unity Inc. (HUB) | 9608 I Ave | Hesperia | 92345 | 760-488-7971 | Mon, Wed 11am-2pm; Fri 2pm-5pm |
Rock'n Our Disabilities | 13558 Palm St | Hesperia | 92344 | 760-998-2241 | Mon, Wed 10am-1pm; Fri 8am-10am |
Spirit Filled Family Church | 9980 Hesperia Rd | Hesperia | 92345 | 760-956-2501 | Sat 9am-11am |
City Mission Ministries | 26200 Date St E | Highland | 92346 | 909-649-0011 | Mon-Fri 8am-5pm |
Highland Senior Center | 3102 E Highland Ave | Highland | 92346 | 909-862-8104 | Mon, Fri 10am-11am |
Lucerne Valley SDA | 10285 Highland Ave | Lucerne Valley | 92356 | 760-503-4788 | Fri 12pm-3pm; Sun-Thu 10am-2pm emergency food | https://lucernevalleyca.adventistchurch.org
Montclair Senior Center | 5111 Benito St | Montclair | 91763 |  | 4th Wed 9am-11am |
Montclair United Methodist Church | 9950 Fremont Ave | Montclair | 91763 | 909-621-5033 | Sat 12pm-2pm |
Fire House Ministries | 809 Bush St | Needles | 92363 | 760-443-4342 | Thu 9am-1pm |
Fire House Ministries Mobile Pantry | 725 W Broadway | Needles | 92363 | 760-443-4342 | 3rd Sat 8am-10am |
SVDP Needles | 839 Front St | Needles | 92363 | 760-326-4420 | Tue-Sat 9am-2pm |
Tri State Community Healthcare | 1406 Bailey Ave Unit 8 | Needles | 92363 | 909-991-0800 | Fri 10am-1pm |
Victorville Thanksgiving Church | 10570 Phelan Rd | Oak Hills | 92344 | 760-587-9048 | 2nd & 4th Thu 9am-10am |
The Salvation Army - Ontario | 1412 S Euclid Ave | Ontario | 91762 | 909-986-6748 | Food packages Thu 9am-12pm; sack lunches Tue 9am-12pm | https://salvationarmy.org
Touch Ones United Creating Hope | 219 W Belmont St | Ontario | 91762 | 909-682-5474 | Mon, Wed, Fri 8:30am-9:30am |
Phelan Foursquare Church | 10120 Johnson Rd | Phelan | 92371 | 760-868-4081 | Sat 10:30am-12pm; 2nd Wed 1:30pm-3pm |
Chaffey College Foundation - Rancho Cucamonga | 5885 Haven Avenue | Rancho Cucamonga | 91737 | 909-652-6507 | Mon-Fri 8am-4:30pm |
First Baptist Church of Rancho Cucamonga | 7450 Archibald Ave | Rancho Cucamonga | 91730 | 909-987-3676 | 1st & 3rd Sat 7am-9am |
Generosity Center | 9239 Utica Ave #140 | Rancho Cucamonga | 91730 | 909-987-7110 | Sat 8:30am-12pm |
The Eagle Ministry - Reaching the Unreachables | 10722 Arrow Route Bldg 100 Unit 114 | Rancho Cucamonga | 91730 | 951-313-6816 | Tue 4:45pm-6:30pm; Wed 4:30pm-6:30pm; Sat 11am-1:30pm |
The Neighborhood Vineyard Church | 11966 Jack Benny Dr Suite 108 | Rancho Cucamonga | 91739 | 909-268-6714 | 3rd Sat 10am-12pm |
Boys and Girls Club - Redlands | 1251 Clay St | Redlands | 92374 | 909-798-4599 | Thu 2pm-6pm; Fri 10am-12pm | https://begreatie.org
Childhood Cancer Foundation | 330 Alabama Street Suite K | Redlands | 92373 | 201-614-4653 | 2nd Wed 2pm-4pm |
FSA of Redlands | 612 Lawton St | Redlands | 92374 | 909-793-2673 | Mon-Fri 8:30am-4:30pm |
The Salvation Army - Redlands | 838 Alta St | Redlands | 92374 | 909-792-6868 | Thu 9am-12pm |
University of Redlands | 1200 E Colton Ave | Redlands | 92374 | 909-748-8288 | Daily 8am-8pm (students only) |
Grace Vargas Senior Center | 1411 S Riverside Ave | Rialto | 92376 | 909-877-9706 | 3rd Wed 9am-11am |
Loveland Jubilee | 790 E Foothill Blvd Suite A & B | Rialto | 92376 | 909-873-2710 | 1st Fri 10:30am-12:30pm |
REACH - St. Catherine of Siena | 339 N Sycamore Ave | Rialto | 92376 | 909-562-5482 | Thu 10am-1pm |
Rialto United Methodist Church | 1230 N Lilac Ave | Rialto | 92376 | 909-875-3444 | Mon, Tue 9am-2pm; Wed, Thu 9am-12pm |
Sunrise Church - Rialto | 690 W Etiwanda Ave | Rialto | 92376 | 909-875-5566 | Tue-Fri 9am-4pm |
Running Springs Assembly of God | 2679 Secret Dr | Running Springs | 92382 | 909-867-5195 | Sat 10am-11:30am |
St Anne in the Mountains | 30480 Fredalba Rd | Running Springs | 92382 | 909-867-2832 | 3rd Thu 3pm-4:30pm |
16th Street SDA Church | 1601 W 16th St | San Bernardino | 92411 | 909-888-0084 | Fri 9am-12pm |
ASA Charter School | 3512 N E St | San Bernardino | 92405 | 909-475-3322 | Mon-Fri 7:45am-8:30am and 10:30am-1:30pm |
Bible Holiness Church | 3350 Del Rosa Ave N | San Bernardino | 92404 | 909-683-6111 | 2nd Thu 8pm-8:30pm |
Cathedral Of Praise International Ministries | 3030 Del Rosa Ave N | San Bernardino | 92404 | 909-474-1005 | 1st & 3rd Sat 8am-11am |
Ecclesia Christian Fellowship | 1314 E Date St | San Bernardino | 92404 | 909-881-5551 | 1st Wed 1pm-3pm; other Wed 3pm-5pm |
Fifth Street Senior Center | 600 W 5th St | San Bernardino | 92410 | 909-384-5430 | 3rd Thu 9am-11am |
First Presbyterian Church | 1900 N D St | San Bernardino | 92405 | 909-882-3308 | Tue, Thu, Sat 9am-11am |
First Samoan Assembly of God | 895 W 40th St | San Bernardino | 92407 | 760-936-2014 | Wed, Sat 9am-12pm; Sat 7am-9:30am |
Grace Baptist Church | 1333 E 39th St | San Bernardino | 92404 | 909-886-8904 | 2nd & 3rd Sat 9:30am-11am |
Greater New Jerusalem Church | 1424 W 21st St | San Bernardino | 92411 | 909-887-1710 | 3rd Sat 9am-12pm |
Hope 4 Everyone Foundation | 290 W Orange Show Rd Bldg 290 Suite 104 | San Bernardino | 92408 | 310-935-8664 | Sat 12pm-2pm |
Inland Valley Recovery Services | 939 N D St | San Bernardino | 92410 | 909-889-6519 | Mon-Sat 9am-6:30pm |
Invisible Hands of God | 468 W 5th St | San Bernardino | 92401 | 909-524-7978 | Sat 11am-1pm |
Isaiah's Rock - White House | 3350 Del Rosa Ave N | San Bernardino | 92404 | 909-381-3811 | Sun, Tue, Thu, Fri, Sat 8am-8pm; Mon 8am-5pm; Wed 9am-5pm |
Loren L. Marner Compassionate Ministry | 1605 N Sierra Way | San Bernardino | 92405 | 909-886-8104 | Sun 11am-1:30pm; Sat 8am-11am |
Loren L. Marner Compassionate Ministry Center - 3rd St. | 903 E 3rd St | San Bernardino | 92410 | 909-886-8104 | Sun 11am-11:30am; Mon 10am-11am; Wed 7pm-8pm |
Lutheran Social Services of Southern California | 1354 N G St | San Bernardino | 92405 | 909-381-6921 | 2nd & 3rd Fri 8:30am-11am |
Mary's Mercy Center - Mary's Table | 641 Roberds Ave N | San Bernardino | 92411 | 909-889-2558 | Sun, Mon, Tue, Thu, Sat 11:30am-1:30pm; Wed 1:30pm-3pm |
Mission for Jesus Christ | 464 S Sierra Way | San Bernardino | 92408 | 909-997-0119 | Sun 1pm-1:30pm |
Obershaw Den (CSUSB) | 5500 University Pkwy Student Union North 3311 | San Bernardino | 92407 | 909-537-3663 | Mon, Tue 9am-5pm; Wed, Thu 9am-6pm; Fri 9am-2pm |
Poder Y Luz Ministries | 2372 E Lynwood Dr | San Bernardino | 92404 | 626-905-3286 | 2nd & 4th Sat 8am-11am |
Redeemed Christian Church of God | 190 S Arrowhead Ave | San Bernardino | 92402 | 909-888-4700 | Sun 12:30pm-1:30pm |
Rise of A Fallen Angel Inc. | 434 W Highland Ave | San Bernardino | 92405 | 909-763-2471 | Mon-Thu 10am-3pm; 3rd Fri 10am-3pm |
Rolling Start Inc. | 1955 S Hunts Ln #101 | San Bernardino | 92408 | 909-890-9516 | Mon, Tue, Thu, Fri 8am-4:30pm; 3rd Wed 11am-3pm |
SAC Health System | 250 S G St | San Bernardino | 92410 | 909-771-2891 | Mon-Thu 8am-5pm; Fri 8am-12pm |
Sahaba Initiative | 1694 N D St | San Bernardino | 92405 | 909-381-3002 | Sat 11am-1pm |
Saint John's Episcopal Church | 1407 N Arrowhead Ave | San Bernardino | 92405 | 909-886-2196 | Wed 9am-11am |
San Bernardino Valley College | 701 S Mt Vernon Ave | San Bernardino | 92410 | 909-384-4474 | Tue, Wed 10am-3pm |
The Great Presbyterian Church | 3630 N E St | San Bernardino | 92405 | 909-677-6554 | Sat 8am-11am |
The Rock Church and World Outreach Center | 2345 S Waterman Ave | San Bernardino | 92408 | 909-825-8887 | Sat 7am-8:30am; Thu 8am-10am |
The Way World Outreach | 1001 N Arrowhead Ave | San Bernardino | 92410 | 909-677-7943 | Wed, Fri 11:30am-12:30pm |
Touch of the Master Ministries | 1244 E Pacific St | San Bernardino | 92404 | 909-886-5631 | Mon 9am-2pm; Wed 10am-11:30am |
Trinity Christian Fellowship Church | 8158 Tippecanoe Ave | San Bernardino | 92410 | 951-347-8997 | Wed 4pm-5:30pm |
Volunteers of America / Ballington Academy | 799 E Rialto Ave | San Bernardino | 92408 | 909-332-6699 | Mon-Fri 8am-6pm |
Express Workforce Foundation | 903 N Central Ave Suite B | Upland | 91786 | 909-946-1246 | Wed 9am-1pm | https://communityheartfeedtheneed.org
Kid Care International | 1200 N Campus Ave | Upland | 91786 | 909-227-5037 | Sat 9:30am-10:45am |
Upland Community Seventh Day Adventist Church | 205 S Campus Ave | Upland | 91786 | 909-982-5632 | 4th Sun 12pm-2pm |
Victor Valley College | 18422 Bear Valley Rd #10B | Victorville | 92395 | 760-245-4271 | Mon 9am-5pm; Thu 1:30pm-3:30pm |
Women of Noble Character | 14890 Loves Ln | Victorville | 92395 | 442-242-1497 | Tue, Wed, Thu 10am-12:30pm |
Alpha and Omega Ministry | 34030 Ave J | Yucaipa | 92399 | 714-561-4461 | Sun 12pm-4pm; Thu 12pm-7pm |
Calvary Hill Church & Retreat Center | 37400 Falling Springs Rd | Yucaipa | 92399 | 310-930-7554 | Mon, Wed, Fri 9am-10am |
Crafton Hills College | 11711 Sand Canyon Rd | Yucaipa | 92399 | 909-389-3233 | Mon-Thu 8am-5pm; Fri 8am-1pm |
Faith Lutheran Church | 12449 California St | Yucaipa | 92399 | 909-790-1816 | 2nd & 4th Sat 8am-10:30am |
Yucaipa Seventh Day Adventist Church | 35225 Avenue E | Yucaipa | 92399 | 415-297-8588 | Wed 12pm |
Five Two Foundation | 57373 Joshua Ln | Yucca Valley | 92284 | (760) 401-1370 | 3rd Wed 4pm-6pm |
CLEP Community Learning & Equipping Project | 4751 Adobe Rd | Twentynine Palms | 92277 |  | Tue 5pm-6pm |
Set Free Church 29 Palms | 82572 Amboy Rd | Twentynine Palms | 92277 | (760) 361-1339 | Mon-Sat 8am-5pm |
Calvary Road Fellowship | 1518 Elbow Rd | Morongo Valley | 92256 | (760) 363-0246 | 3rd Fri 12pm-2pm |
Calvary Christian Fellowship - Paying it Forward | 288 Old Woman Springs Rd | Yucca Valley | 92286 | (760) 364-1990 | 3rd Fri 12pm-2pm |
FIND Mobile Market - Copper Mountain College | 6162 Rotary Way | Joshua Tree | 92252 | (760) 775-3663 | 1st Tue 9am-10am |
Yucca Valley Church of the Nazarene | 56-248 Buena Vista Dr | Yucca Valley | 92284 | (760) 362-3581 | 2nd Thu 11:30am-12:30pm |
The Way Station | 61-722 Commercial St | Joshua Tree | 92252 | (760) 366-8088 | Tue-Fri breakfast 9am-10:30am |
`,
  },
};

for (const [county, { rows }] of Object.entries(COUNTIES)) {
  const { sites, flags } = parseBlock(rows, { forceDefer: deferMonthly(rows) });
  const withEvents = sites.filter((s) => s.schedules.length).length;
  const out = {
    _meta: {
      topic: `${county} County food distributions (batch 7)`,
      generated: '2026-10-11',
      source: 'Hand-collected list (Sacramento Food Bank Food Finder, Community Food Bank of San Benito County, Feeding America Riverside-San Bernardino + FIND). Schedules parsed via LA clause parser.',
      note: 'Sacramento and San Bernardino are ADDITIONS to existing shells (prepare with --existing dedupe + real --shell-id). San Benito is net-new.',
    },
    sites,
  };
  writeFileSync(`./b7-${county}-raw.json`, JSON.stringify(out, null, 2));
  console.log(`\n=== ${county}: ${sites.length} sites | ${withEvents} with events | ${sites.length - withEvents} deferred | ${flags.filter((f) => f.includes('no street')).length} city-level ===`);
}
