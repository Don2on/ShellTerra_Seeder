/*
 * build-food-batch2.mjs — Fresno, Glenn, Humboldt, Imperial.
 * Pipe-delimited rows: Name | Street | City | ZIP | Phone | Schedule | Website | Source
 * Writes <County>Additions-raw.json for prepare-food-additions.mjs.
 */
import { writeFileSync } from 'node:fs';
import { parseBlock } from './food-schedule-lib.mjs';

const COUNTIES = {
  Fresno: {
    forceDefer: new Set(),
    rows: `
Big Sandy Rancheria | 37387 Auberry Mission Rd | Auberry | 93602 | (559) 237-3663 ext. 1108 | 3rd Thu 10am-12pm | https://ccfoodbank.org/find-food/food-locator/
Sierra Lutheran Church - USDA | 32410 Rock Hill Ln | Auberry | 93602 | 559-855-8989 | 2nd Sat 8-10am | https://ccfoodbank.org/find-food/food-locator/
Biola Community Center - Neighborhood Market | 4925 N. 7th Ave | Biola | 93606 | 559-681-0250 | 4th Wed 4-6pm | https://ccfoodbank.org/find-food/food-locator/
Biola Community Center - USDA | 4925 N. 7th Ave | Biola | 93606 | 559-843-2657 | 2nd Wed 9:30am-2pm | https://ccfoodbank.org/find-food/food-locator/
EOC - Cantua Creek | 16101 S. Derrick Ave | Cantua Creek | 93608 | 559-263-1029 | 3rd Mon 9-11am | https://ccfoodbank.org/find-food/food-locator/
Caruthers Church of Christ | 2341 W. Sandy St | Caruthers | 93609 |  | 1st Sat 8-10am | https://ccfoodbank.org/find-food/food-locator/
Caruthers Seventh Day Adventist | 2257 W. Sandy St | Caruthers | 93609 |  | 1st Sat 2-4:30pm (pantry and USDA) | https://ccfoodbank.org/find-food/food-locator/
Caruthers United Methodist Church | 2359 W. Superior Ave | Caruthers | 93609 | 559-772-5104 | By appointment only | https://ccfoodbank.org/find-food/food-locator/
Clovis SDA | 2370 Helm Ave | Clovis | 93612 |  | 4th Sat 9am-12pm | https://ccfoodbank.org/find-food/food-locator/
Faith Community Church - USDA | 430 Peach Ave | Clovis | 93612 | 559-298-3097 | Pantry 1st & 3rd Tue 1:30-3:30pm; USDA 2nd Sat 8-10am | https://ccfoodbank.org/find-food/food-locator/
Oak Hills Church | 1446A Tollhouse Rd | Clovis | 93611 |  | 2nd Fri 1-3pm | https://ccfoodbank.org/find-food/food-locator/
Praise Church Clovis | 1600 Willow Ave | Clovis | 93613 | (559) 237-3663 ext. 1108 | 2nd Thu 9-11am | https://ccfoodbank.org/find-food/food-locator/
The Salvation Army Clovis - USDA | 210 E Barstow Ave | Clovis | 93612 | 559-298-6797 | Tue & Thu 9am-12pm | https://ccfoodbank.org/find-food/food-locator/
Willow Center | 2529 Willow Ave | Clovis | 93612 | 559-229-2000 | 2nd Thu 2-4pm | https://ccfoodbank.org/find-food/food-locator/
Chapel Grace - Mobile Pantry | 120 E. Hawthorne St | Coalinga | 93210 | (559) 237-3663 ext. 1108 | 3rd Wed 9am-12pm | https://ccfoodbank.org/find-food/food-locator/
Faith Fellowship | 520 Monroe St | Coalinga | 93210 |  | 4th Fri 1-3pm | https://ccfoodbank.org/find-food/food-locator/
Pleasant Valley Christian Church | 160 E. Birch St | Coalinga | 93210 |  | Pantry 3rd Tue 5:30-7:30pm; Groceries2Go 3rd Mon 3:30-6pm | https://ccfoodbank.org/find-food/food-locator/
West Hills College - Coalinga | 300 W. Cherry | Coalinga | 93210 | 559-925-3000 | Student pantry, West Hills College students only | https://ccfoodbank.org/find-food/food-locator/
Westside Family Services - Coalinga USDA | 160 W. Elm St | Coalinga | 93210 | 559-945-1022 | 4th Mon 10am-12pm & 1-5pm | https://ccfoodbank.org/find-food/food-locator/
Shining Light Ministries Pantry | 5211 Portola Ave | Del Rey | 93616 | (559) 614-8776 | 2nd Sat 10am-12pm | https://ccfoodbank.org/find-food/food-locator/
Zion Mt Christian/Dunlap - USDA | 39712 Dunlap Rd | Dunlap | 93621 | 559-338-2525 | 2nd Tue 11am-1pm | https://ccfoodbank.org/find-food/food-locator/
EOC - Firebaugh | 1655 13th St | Firebaugh | 93622 | 559-263-1029 | 2nd Thu 9am-12pm | https://ccfoodbank.org/find-food/food-locator/
Firebaugh - Mobile Pantry | 1653 13th St | Firebaugh | 93622 | (559) 237-3663 ext. 1108 | 1st Wed 9am-12pm | https://ccfoodbank.org/find-food/food-locator/
Firebaugh - USDA | 1653 13th St | Firebaugh | 93622 | (559) 237-3663 ext. 1108 | 4th Thu 9-11:30am | https://ccfoodbank.org/find-food/food-locator/
Firebaugh Rodeo Grounds - Neighborhood Market | 1653 13th St | Firebaugh | 93622 | (559) 237-3663 ext. 1108 | 1st & 3rd Thu 9-11am | https://ccfoodbank.org/find-food/food-locator/
Iglesia Jesucristo Mi Roca | 2035 N. Helm Canal Rd | Firebaugh | 93622 |  | 3rd Sat 2-4pm | https://ccfoodbank.org/find-food/food-locator/
Fowler Baptist Church USDA | 507 E. Merced St | Fowler | 93625 | 559-834-5541 | 1st Wed 8:30-10:30am | https://ccfoodbank.org/find-food/food-locator/
A Hopeful Encounter | 3253 E. Shields Ave | Fresno | 93726 |  | 3rd Fri 3-5pm | https://ccfoodbank.org/find-food/food-locator/
Acts Foundation - USDA | 5125 N. Gates Ave | Fresno | 93722 |  | USDA 2nd Sat 8:30-10am; pantry 4th Sat 8:30-10am | https://ccfoodbank.org/find-food/food-locator/
Amazing Grace Ministries | 1225 S Maple | Fresno |  |  | 4th Thu 8-10am | https://ccfoodbank.org/find-food/food-locator/
Bethel Church of Christ Holiness USA Pantry | 308 N 4th St | Fresno | 93702 | (559) 351-9190 | 3rd Sat (call for time) | https://ccfoodbank.org/find-food/food-locator/
Big Picture Adult High School | 2841 Tulare St | Fresno | 93721 |  | 3rd Wed 1:30-3:30pm | https://ccfoodbank.org/find-food/food-locator/
Binational of California | 3302 N. Blackstone Ave, Ste 221 | Fresno | 93726 |  | Mon-Fri 9-11am | https://ccfoodbank.org/find-food/food-locator/
Blakeney Children Foundation | 4666 N. Maple Ave | Fresno | 93726 |  | 3rd Sat 1:30-3:30pm | https://ccfoodbank.org/find-food/food-locator/
Bulldog Pantry / LCM | 2311 E. Shaw Ave | Fresno | 93710 | 559-224-9052 | 2nd & 4th Sat 9-10:30am | https://ccfoodbank.org/find-food/food-locator/
Butler Mennonite Brethren Church - USDA | 4884 E. Butler Ave | Fresno | 93727 | 559-252-3741 | 1st Fri 9-11am | https://ccfoodbank.org/find-food/food-locator/
Butler Pentecostal Church - Neighborhood Market | 3542 E. Butler Ave | Fresno | 93702 | (559) 237-3663 ext. 1108 | 4th Wed 9am-12pm | https://ccfoodbank.org/find-food/food-locator/
Butler Pentecostal Church - Pantry | 3542 E. Butler Ave | Fresno | 93702 | 559-268-0094 | Last Sat 9-11am | https://ccfoodbank.org/find-food/food-locator/
Californian Hotel - USDA | 851 Van Ness Ave | Fresno | 93721 | 559-485-8190 | 3rd Thu 8:30-10:30am | https://ccfoodbank.org/find-food/food-locator/
Catholic Charities - Pantry | 149 N. Fulton St | Fresno | 93701 | 559-237-0851 | Mon-Fri 8:30am-12:15pm & 1-3:45pm | https://ccfoodbank.org/find-food/food-locator/
Catholic Charities - Neighborhood Market | 149 N. Fulton St | Fresno | 93701 | 559-237-0851 | 4th Thu 8:30-10:30am | https://ccfoodbank.org/find-food/food-locator/
Catholic Charities - USDA | 149 N. Fulton St | Fresno | 93701 | 559-237-0851 | 2nd Mon 8:30-10:30am | https://ccfoodbank.org/find-food/food-locator/
Central Valley SDA Church - USDA | 3901 E. Clinton Ave | Fresno | 93703 | 559-438-5433 | USDA 3rd Fri 2-4pm; pantry Mon-Thu 10-11:30am and 2nd & 4th Wed 1-2:30pm | https://ccfoodbank.org/find-food/food-locator/
Centro Familiar de Adoracion - USDA | 4546 E. Thomas | Fresno | 93702 | 559-970-1516 | 1st Fri 10am-12pm | https://ccfoodbank.org/find-food/food-locator/
Clovis Hills Community Church (Tulare Street) | 819 Tulare St | Fresno | 93706 | 559-392-1587 | 2nd & 4th Thu 2-4pm | https://ccfoodbank.org/find-food/food-locator/
Covenant of Faith Family Ministries Intl. | 6269 E. Kings Canyon Rd | Fresno | 93727 |  | 3rd Sat 9am-2pm | https://ccfoodbank.org/find-food/food-locator/
Crossover Community Church | 6050 S. Lotus Ave | Fresno | 93706 |  | Thu 10am-5pm (except November & December) | https://ccfoodbank.org/find-food/food-locator/
EOC - Pinedale | 7435 N Ingram | Fresno | 93711 | 559-263-1029 | 2nd Wed 9-11am | https://ccfoodbank.org/find-food/food-locator/
Family Alliance Church | 2010 N Sierra Vista Ave | Fresno | 93703 |  | 3rd Thu 5-7pm | https://ccfoodbank.org/find-food/food-locator/
Feed My Sheep | 117 E. Lemon Ave | Fresno | 93706 | (559) 237-3663 ext. 1108 | 2nd & 4th Fri 11am-1pm | https://ccfoodbank.org/find-food/food-locator/
Fellowship Missionary Baptist - Neighborhood Market | 2529 E. Belmont Ave | Fresno | 93701 | (559) 237-3663 ext. 1108 | 4th Mon 10am-1pm | https://ccfoodbank.org/find-food/food-locator/
Fellowship Missionary Baptist - Pantry | 2529 E. Belmont Ave | Fresno | 93701 | 559-441-1661 | 2nd & 4th Sat 8-10am | https://ccfoodbank.org/find-food/food-locator/
First Congregational Church of Fresno (Big Red Church) | 2131 N. Van Ness Blvd | Fresno | 93704 |  | 4th Sat 9am-12pm | https://ccfoodbank.org/find-food/food-locator/
First Fruits Market | 2025 E Dakota Ave | Fresno | 93726 | 559-237-3663 | Wed, Fri, Sat 8:30am-2:30pm (pre-registration) | https://ccfoodbank.org/find-food/food-locator/
Fresno Central SDA | 422 E. Shields Ave | Fresno | 93704 |  | Tue 9:30-11:30am or until food runs out (photo ID) | https://ccfoodbank.org/find-food/food-locator/
Fresno Christian Reformed | 1639 W. Shields Ave | Fresno | 93705 | (559) 237-3663 ext. 1108 | Last Fri 10am-12pm | https://ccfoodbank.org/find-food/food-locator/
Fresno EOC @ LCC | 1805 E. California Ave | Fresno | 93706 | 559-263-1029 | 1st Sat 9-11am | https://ccfoodbank.org/find-food/food-locator/
Fresno Sequoia Spanish SDA - USDA | 4867 E. Fillmore Ave | Fresno | 93727 |  | Pantry 1st Sat 4-6pm; USDA 4th Tue 9-11:30am | https://ccfoodbank.org/find-food/food-locator/
Fresno Spanish SDA - USDA | 3033 E Olive Ave | Fresno | 93701 | 559-237-7242 | 2nd Wed 9am-12pm | https://ccfoodbank.org/find-food/food-locator/
Fresno Sunnyside SDA | 5375 N. Maroa Ave | Fresno | 93704 | 559-229-5501 | 4th Wed 8:45-11am | https://ccfoodbank.org/find-food/food-locator/
Fresno Westside SDA | 2750 Martin Luther King Blvd | Fresno | 93706 | 559-233-3648 | 3rd Wed 10am-12pm | https://ccfoodbank.org/find-food/food-locator/
Friends of Calwa | 3980 E. Jensen | Fresno | 93725 | 559-374-6922 | USDA 3rd Fri 9am-12pm; pantry Mon-Fri 11am-1pm | https://ccfoodbank.org/find-food/food-locator/
God's Family Church | 7272 W. Shaw Ave | Fresno | 93722 | 559-276-7272 | Last Tue 10am-12pm | https://ccfoodbank.org/find-food/food-locator/
Grace Bound Inc. | 420 N Broadway St | Fresno | 93701 | 559-500-9503 | 1st Thu 9-11am | https://ccfoodbank.org/find-food/food-locator/
Grantland Southern Baptist Church | 6438 N. Grantland Ave | Fresno | 93723 | 559-275-6397 | 2nd & 4th Sun 11am-1pm | https://ccfoodbank.org/find-food/food-locator/
Harmony Hope Chest Church | 5372 E. Belmont Ave | Fresno | 93727 | 559-251-5630 | 2nd Fri 4-6pm | https://ccfoodbank.org/find-food/food-locator/
Harmony Korean Church | 403 S Clovis Ave | Fresno | 93727 |  | Fri 1:30-3:30pm | https://ccfoodbank.org/find-food/food-locator/
Highway City Community Development | 4710 N. Polk Ave | Fresno | 93722 | 559-578-8991 | By referral; call for assistance | https://ccfoodbank.org/find-food/food-locator/
Holy Ground Family Fellowship - NM/USDA | 980 Gettysburg Ave | Fresno | 93612 |  | 1st Sat 7:30-10:30am (Apr-Nov) or 8-11am (Dec-Mar) | https://ccfoodbank.org/find-food/food-locator/
Hope Lutheran Church - USDA | 364 E. Barstow Ave | Fresno | 93710 | 559-439-4320 | Tue 7-9am | https://ccfoodbank.org/find-food/food-locator/
Hope Worldwide - USDA | 3425 E. Shields Ave | Fresno | 93726 | 559-999-3966 | 1st Sat 10am-12pm | https://ccfoodbank.org/find-food/food-locator/
Hopewell Baptist Church | 2627 S. Marks Ave | Fresno | 93706 |  | Last Sat 8-10am | https://ccfoodbank.org/find-food/food-locator/
Immanuel Lutheran Church | 5955 S. Elm Ave | Fresno | 93706 | (559) 237-3663 ext. 1108 | 2nd Fri 8-10am | https://ccfoodbank.org/find-food/food-locator/
Koinonia Worship Center | 5136 E Belmont Ave | Fresno | 93727 |  | Last Sat 9am-12pm | https://ccfoodbank.org/find-food/food-locator/
Korean Presbyterian Church of Fresno | 6515 N. Maroa Ave | Fresno | 93704 | 559-431-6810 | 2nd Fri 11am-1pm | https://ccfoodbank.org/find-food/food-locator/
Life Cathedral Church of God | 6825 N. Maple Ave | Fresno | 93710 | 559-299-4747 | 2nd Sat 10am-12pm | https://ccfoodbank.org/find-food/food-locator/
Life Free Will Baptist Church Neighborhood Market | 1625 E. Pine St | Fresno | 93727 |  | 2nd & last Sat, 7am until food runs out | https://ccfoodbank.org/find-food/food-locator/
Life Ministries Church | 552 E. Tuolumne St | Fresno | 93706 | 559-960-5590 | Last Fri 12-2pm | https://ccfoodbank.org/find-food/food-locator/
Malaga Community Center - USDA | 3582 S Winery Ave | Fresno | 93725 | 559-268-0404 | 3rd Wed 9am-12pm | https://ccfoodbank.org/find-food/food-locator/
Martin Park | 2856 E Tyler Ave | Fresno | 93701 |  | Thu 1-3pm | https://ccfoodbank.org/find-food/food-locator/
Masjid Al Aqabah | 949 Waterman Ave | Fresno | 93706 | 559-515-6560 | 1st, 2nd & 4th Wed 3-5pm | https://ccfoodbank.org/find-food/food-locator/
Masjid Fresno | 2111 E. Shaw Ave | Fresno | 93710 | 559-222-6686 | 1st & 3rd Thu 11am-1pm or until food runs out | https://ccfoodbank.org/find-food/food-locator/
Mennonite Community Church | 5015 E Olive Ave | Fresno | 93727 | 559-251-5703 | USDA 2nd Sat 9am-12pm; pantry 4th Sat 9-11am | https://ccfoodbank.org/find-food/food-locator/
Mt. Olive Baptist Church - USDA | 101 W Clinton Ave | Fresno | 93705 | 559-228-1880 | 3rd Fri 1-3pm | https://ccfoodbank.org/find-food/food-locator/
Mt. View Community Church | 3600 N. Fowler Ave | Fresno | 93727 | 559-291-9199 | Last Sat 9-10am | https://ccfoodbank.org/find-food/food-locator/
Mt. Zion Assemblies - USDA | 4368 N. Brawley | Fresno | 93722 |  | 4th Fri 6-8pm | https://ccfoodbank.org/find-food/food-locator/
My Homies Kitchen Pantry | 2467 S Elm Ave | Fresno | 93721 | (559) 420-9259 | Sat 1-3pm | https://ccfoodbank.org/find-food/food-locator/
New Birth Evangelistic Center Church | 2360 S. Bardell | Fresno | 93706 | 559-485-6583 | 3rd Wed 9-11am | https://ccfoodbank.org/find-food/food-locator/
New Kingdom Church | 1825 S Delno | Fresno | 93706 | 559-307-1930 | 3rd Sat 12-2pm | https://ccfoodbank.org/find-food/food-locator/
New Life Baptist Church | 2033 S Cedar Ave | Fresno | 93702 | 559-264-5330 | 3rd Thu 9:30-11:30am; 3rd Sat 10am-12pm | https://ccfoodbank.org/find-food/food-locator/
North Assembly of God | 2707 W Dakota | Fresno | 93711 |  | 2nd Tue 10am-12pm | https://ccfoodbank.org/find-food/food-locator/
Our Saviour's Lutheran Church - USDA | 2101 N. Fruit Ave | Fresno | 93705 | 559-237-7603 | USDA 1st Mon 1-3pm; pantry Sun 11:30am-12:30pm | https://ccfoodbank.org/find-food/food-locator/
Paraclete Missionary Baptist Church | 757 S Orange | Fresno | 93702 |  | 3rd Sat 10am-12pm | https://ccfoodbank.org/find-food/food-locator/
Peanut Butter & Jelly Ministries | 3585 N. Blythe Ave | Fresno | 93722 | (559) 237-3663 ext. 1108 | 3rd Wed 9-11am | https://ccfoodbank.org/find-food/food-locator/
Peoples Church Fresno | 7172 N Cedar Ave | Fresno | 93720 | 559-298-8001 | 2nd & 4th Tue 9-11am | https://ccfoodbank.org/find-food/food-locator/
Rainbow Housing Corporation | 2319 S. Bardell Ave (back parking lot) | Fresno | 93706 |  | 3rd Wed 2-4pm | https://ccfoodbank.org/find-food/food-locator/
Rapto Divino Church (Fresno) - USDA | 3707 E. Laurite Ave | Fresno | 93726 | (559) 237-3663 ext. 1108 | 3rd Fri 10am-12pm | https://ccfoodbank.org/find-food/food-locator/
Saints Community Church - USDA | 3740 E Ashlan Ave | Fresno | 93726 | 559-227-9819 | Pantry 1st, 3rd & 4th Tue 11am-12pm; USDA 2nd Tue 9-11am | https://ccfoodbank.org/find-food/food-locator/
Second Baptist Church - USDA | 1041 E Jensen | Fresno | 93706 | 559-486-9993 | 2nd Wed 8am-12pm | https://ccfoodbank.org/find-food/food-locator/
South Point Church | 5391 E. Tulare Ave | Fresno | 93727 | 559-455-1119 | 2nd Sat 10am-12pm (breakfast at 9am) | https://ccfoodbank.org/find-food/food-locator/
Sovereign Ministries | 4744 E Church Ave | Fresno | 93725 | 559-297-7362 | 2nd & 4th Wed 10am-12pm | https://ccfoodbank.org/find-food/food-locator/
St. Anthony Mary Claret Church | 2494 S. Chestnut Ave | Fresno | 93725 | 559-255-4260 | 3rd Fri 4-6pm | https://ccfoodbank.org/find-food/food-locator/
St. James Episcopal Cathedral | 4147 E Dakota Ave | Fresno | 93726 |  | 3rd Tue 9:30-11:30am or until food runs out | https://ccfoodbank.org/find-food/food-locator/
St. Rest Baptist Church | 1550 E. Chester Riggins Ave | Fresno | 93706 | (559) 237-3663 ext. 1108 | Pantry Mon, Wed, Fri, Sat 9-11am; Neighborhood Market and USDA 1st Sat 9-11am | https://ccfoodbank.org/find-food/food-locator/
The Arc Fresno Madera (Loewen Achievement Center) | 4490 E Ashlan Ave | Fresno | 93726 | 559-547-2621 | Wed 10-11:30am | https://ccfoodbank.org/find-food/food-locator/
The Body Community Church | 350 W. Minarets Ave | Fresno | 93650 | 559-213-3981 | Last Sat 8-11am | https://ccfoodbank.org/find-food/food-locator/
The Bridge Evangelical Free Church | 3438 E. Ashlan Ave | Fresno | 93726 | 559-226-4100 | 1st & 3rd Wed 9-11am | https://ccfoodbank.org/find-food/food-locator/
The Fresno Center | 4879 E. Kings Canyon Rd | Fresno | 93727 | (559) 237-3663 ext. 1108 | 4th Mon 3-5pm | https://ccfoodbank.org/find-food/food-locator/
The Living Room | 1330 E Olive Ave | Fresno | 93728 | 559-486-1469 | 2nd & 4th Thu 10am-4pm (must call for eligibility) | https://ccfoodbank.org/find-food/food-locator/
The Salvation Army ARC | 804 S Parallel Ave | Fresno | 93702 |  | Tue 9am-12pm | https://ccfoodbank.org/find-food/food-locator/
The Salvation Army Fresno Family Services | 1752 Fulton St | Fresno | 93721 |  | Mon, Tue, Wed 9am-12pm | https://ccfoodbank.org/find-food/food-locator/
United Christian Church | 1038 W Shields Ave | Fresno | 93705 |  | 1st Mon 10am-12pm | https://ccfoodbank.org/find-food/food-locator/
University Presbyterian Church - USDA | 1776 E Roberts Ave | Fresno | 93710 |  | Sat 8am | https://ccfoodbank.org/find-food/food-locator/
Victory Chapel | 4206 W. Dakota Ave | Fresno | 93722 | 559-412-8125 | 3rd Sat 8-10am | https://ccfoodbank.org/find-food/food-locator/
Wesley United Methodist Church | 1343 E. Barstow Ave | Fresno | 93710 | 559-224-1947 | Thu 9-11am except the 1st Thu of the month | https://ccfoodbank.org/find-food/food-locator/
West Fresno Family Resource Center | 1825 S. Delno Ave | Fresno | 93706 | (559) 237-3663 ext. 1108 | Thu 1-3pm (Neighborhood Market); USDA 4th Thu 1-3pm | https://ccfoodbank.org/find-food/food-locator/
West McKinley Assembly of God - Neighborhood Market | 3014 W McKinley Ave | Fresno | 93722 | (559) 237-3663 ext. 1108 | 4th Sat 9-11am; bread pantry 1st, 2nd, 3rd & 5th Fri 12-2pm | https://ccfoodbank.org/find-food/food-locator/
West Park Community | 3279 W. Jensen Ave | Fresno | 93706 | 559-477-3551 | 2nd Tue 6-8pm | https://ccfoodbank.org/find-food/food-locator/
Westside Church of God - USDA | 1424 W California Ave | Fresno | 93706 | 559-237-1444 | 3rd Sat 9-11:30am | https://ccfoodbank.org/find-food/food-locator/
Woodward Park Church | 7886 N. Millbrook Ave | Fresno | 93720 | 559-446-2550 | 1st Sat 6-8am (not in September) | https://ccfoodbank.org/find-food/food-locator/
Valley Voices Huron | 16856 4th St | Huron | 93234 |  | 3rd Fri 3-5pm | https://ccfoodbank.org/find-food/food-locator/
Westside Family Services - Huron | 36618 Lassen Ave | Huron | 93234 | (559) 237-3663 ext. 1108 | Neighborhood Market 1st, 2nd & 3rd Mon 10am-12pm & 1-5pm; USDA 4th Wed 10am-12pm & 1-5pm | https://ccfoodbank.org/find-food/food-locator/
Westside Family Services - Kerman - USDA | 15101 W Kearney Blvd | Kerman | 93630 | 559-945-1022 | 3rd Wed 10am-12pm | https://ccfoodbank.org/find-food/food-locator/
Kingsburg Community Assistance Program | 1139 Draper St | Kingsburg | 93631 | 559-897-7961 | Mon-Thu 9am-12pm (proof of Kingsburg residency) | https://ccfoodbank.org/find-food/food-locator/
Church of the Nazarene (Laton) | 6258 E. Murphy Ave | Laton | 93242 | 559-923-1200 | 3rd Sat 8:30-10:30am; Neighborhood Market 1st & 3rd Tue 10am-12pm | https://ccfoodbank.org/find-food/food-locator/
Shrine of Our Lady of Fatima USDA | 20855 S. Fatima Ave | Laton | 93242 | 559-923-4935 | 4th Mon 9-11am | https://ccfoodbank.org/find-food/food-locator/
EOC - Mendota (AMOR Wellness Center) | 121 Belmont Ave | Mendota | 93640 | 559-263-1029 | 1st Tue 9am | https://ccfoodbank.org/find-food/food-locator/
Little Zion Baptist Church | 667 Juanita St | Mendota | 93640 |  | 3rd Sun 1:30-3:30pm | https://ccfoodbank.org/find-food/food-locator/
Rojas-Pierce Park - Neighborhood Market | 350 Sorenson Ave | Mendota | 93640 | (559) 237-3663 ext. 1108 | 2nd & 4th Thu 9-11am | https://ccfoodbank.org/find-food/food-locator/
Westside Youth Center - USDA | 1709 Seventh St | Mendota | 93640 | 559-655-4808 | 3rd Thu 9am-12pm | https://ccfoodbank.org/find-food/food-locator/
EOC - Orange Cove | 1705 S. Anchor Ave | Orange Cove | 93646 | 559-263-1029 | 3rd Tue 9-11am | https://ccfoodbank.org/find-food/food-locator/
Iglesia El Buen Pastor - USDA & Neighborhood Market | 863 11th St | Orange Cove | 93646 | (559) 237-3663 ext. 1008 | USDA 1st Tue 9:30-11:30am; Neighborhood Market 2nd & 4th Mon 9:30-11:30am | https://ccfoodbank.org/find-food/food-locator/
Central Valley Resource Center | 13700 E Parlier Ave, Ste A | Parlier | 93648 | 559-254-5267 | Last Fri 10am-1pm | https://ccfoodbank.org/find-food/food-locator/
EOC - Parlier | 690 S Newmark Ave | Parlier | 93648 | 559-263-1029 | 1st & 3rd Fri 9-11am | https://ccfoodbank.org/find-food/food-locator/
Central Sierra Chamber of Commerce - USDA | 54120 Hwy 245 | Pinehurst | 93641 | 559-336-2800 ext. 243 | 1st Sat 9am-12pm | https://ccfoodbank.org/find-food/food-locator/
Full Gospel Tabernacle - USDA | 519 E 11th St | Reedley | 93654 | 559-638-2739 | 4th Sat 8:30-10:30am | https://ccfoodbank.org/find-food/food-locator/
Miracles In Comm. Association | 659 E Dinuba Ave | Reedley | 93654 |  | 3rd Thu 9am-12pm (Oct-Dec holiday schedule) | https://ccfoodbank.org/find-food/food-locator/
St. Anthony's Food Pantry | 1452 11th St | Reedley | 93654 |  | 4th Thu 5-7pm | https://ccfoodbank.org/find-food/food-locator/
Vida En El Valle - Iglesia de Cristo | 1390 11th St | Reedley | 93654 |  | 4th Sat 10am-12pm | https://ccfoodbank.org/find-food/food-locator/
Lanare Community Center - USDA/Neighborhood Market | 20620 S. Grantland Ave | Riverdale | 93656 | (559) 237-3663 ext. 1108 | Neighborhood Market 3rd Thu & 4th Tue 10am-12pm; USDA 2nd Tue 10am-12pm | https://ccfoodbank.org/find-food/food-locator/
San Joaquin Veterans Memorial Hall - Mobile Pantry & Neighborhood Market | 22001 W. Manning Ave | San Joaquin | 93660 | (559) 237-3663 ext. 1108 | Neighborhood Market 1st & 3rd Wed 9am-12pm; mobile pantry 2nd Thu 9am-12pm | https://ccfoodbank.org/find-food/food-locator/
The Salvation Army San Joaquin - USDA | 21962 Railroad Ave | San Joaquin | 93660 | 559-693-2970 | Mon & Fri 9-11am | https://ccfoodbank.org/find-food/food-locator/
Annadale Baptist Church | 1511 14th St | Sanger | 93657 | (559) 237-3663 ext. 1108 | 3rd Sat 9-11am | https://ccfoodbank.org/find-food/food-locator/
EOC - Sanger | JFK Park North and Faller Ave | Sanger | 93657 | 559-263-1029 | 2nd Mon 9-11am | https://ccfoodbank.org/find-food/food-locator/
Family Worship Center | 1307 I St | Sanger | 93657 | 559-618-2330 | 3rd Sat 10am-12pm | https://ccfoodbank.org/find-food/food-locator/
Father Hannibal House | 1501 14th St | Sanger | 93657 | 559-875-0564 | Wed, Thu, Fri 10am-1pm | https://ccfoodbank.org/find-food/food-locator/
Hope Sanger | 1348 Church Ave | Sanger | 93657 |  | 4th Wed 10am-1pm | https://ccfoodbank.org/find-food/food-locator/
Set Free Sanger | 615 Academy Ave | Sanger | 93657 |  | 3rd Fri 9-11am | https://ccfoodbank.org/find-food/food-locator/
The Worship Center | 702 K St | Sanger | 93657 |  | 4th Sat 9-11am | https://ccfoodbank.org/find-food/food-locator/
Ministerio Jordan Nueva Vision | 2150 E Front St | Selma | 93662 | 559-546-9671 | 2nd & 4th (or 5th) Thu 2:30-4:30pm | https://ccfoodbank.org/find-food/food-locator/
Pastores En Oracion | 2026 Arrants St | Selma | 93662 |  | Mon, Wed, Fri 2:30-4:30pm | https://ccfoodbank.org/find-food/food-locator/
Selma Enhancement - USDA | 2301 Selma St | Selma | 93662 | 559-891-2239 | 4th Tue 8:30-11am | https://ccfoodbank.org/find-food/food-locator/
Selma Southern Baptist Church - IPC Selma | 1606 Mill St | Selma | 93662 |  | 1st Fri 3-5pm | https://ccfoodbank.org/find-food/food-locator/
St. Joseph's Catholic Church - USDA | 2441 Dockery | Selma | 93662 | 559-896-1052 | 2nd Thu 10am | https://ccfoodbank.org/find-food/food-locator/
The Salvation Army - Selma | 1606 Mill St | Selma | 93662 |  | Tue 10:30am-12:30pm (emergency food boxes) | https://ccfoodbank.org/find-food/food-locator/
Cold Springs Rancheria | 32861 Sycamore Rd | Tollhouse | 93667 | 559-217-1738 | 3rd Fri 10am-12pm | https://ccfoodbank.org/find-food/food-locator/
St. Paul Catholic Church | 25592 Doughty Ave | Tranquillity | 93668 | (559) 237-3663 ext. 1108 | 1st Tue 9-11am | https://ccfoodbank.org/find-food/food-locator/
`,
  },
  Glenn: {
    forceDefer: new Set(['Glenn County Fairgrounds (North State Food Bank drive-thru)']),
    rows: `
Elk Creek Grange (monthly commodity distribution) | 145 Church St | Elk Creek | 95939 | (530) 712-2600 | Monthly 9am-12pm (date varies, call) |
Hamilton City Evangelical Free Church (monthly commodity distribution) | 490 Los Robles Ave | Hamilton City | 95951 | (530) 712-2600 | Monthly 8-11am (date varies, usually 3rd week) |
Capay Rancho Assembly of God | 4754 4th Ave | Orland | 95963 |  | 3rd Tue 2-4pm | https://nvcfoodbank.org/locations/
Federated Church of Orland | 709 1st St | Orland | 95963 | (530) 865-3131 | 2nd Tue 10am | https://nvcfoodbank.org/locations/
First Christian Church of Orland | 635 A St | Orland | 95963 |  | 4th Sat 12-2pm | https://nvcfoodbank.org/locations/
Glenn County Fairgrounds (North State Food Bank drive-thru) | 221 E Yolo St | Orland | 95963 | (530) 712-2600 | Monthly Fri 10am-12pm (Oct 2, 2026; date varies) | https://www.buttecaa.com/north-state-food-bank/distribution-calendar/
Orland Pantry at First Lutheran Church | 19 Colusa St | Orland | 95963 | (530) 681-6334 | Mon 10am-12pm; Wed 3-5pm; monthly commodities 9-11am |
First Baptist Church Willows | 154 N Lassen St | Willows | 95988 |  | 4th Fri 12-2pm |
Willows Adventist Community Services Food Bank | 543 W 1st Ave | Willows | 95988 | (530) 934-3212 | Mon 9-11am; monthly commodities 12-1pm |
Real Life Church | 1044 Trinity St | Orland | 95963 |  |  | https://nvcfoodbank.org/locations/
Tri Counties Community Action Partnership | 318 6th St | Orland | 95963 |  |  |
Church of the Nazarene / North Valley Community Food Bank | 216 N Culver St | Willows | 95988 | (530) 473-9050 |  | https://nvcfoodbank.org
First 5 Glenn County | 1035 W Wood St | Willows | 95988 | (530) 934-6885 |  |
`,
  },
  Humboldt: {
    forceDefer: new Set(),
    rows: `
Arcata House Partnership Annex (Food for People pantry) | 501 9th St | Arcata | 95521 | (707) 445-3166 | Wed 4-6pm | https://www.foodforpeople.org/programs/pantry-network
Arcata Seniors (Food for People pantry) | 321 Martin Luther King Jr. Way | Arcata | 95521 | (707) 825-2027 | 3rd Thu 10:30-11am | https://www.foodforpeople.org/programs/pantry-network
Blue Lake Community Resource Center | 111 Greenwood Ave | Blue Lake | 95525 | (707) 668-4281 | 3rd Thu 10am-2pm | https://www.foodforpeople.org/programs/pantry-network
Bridgeville Community Center | 38717 Kneeland Rd | Bridgeville | 95526 | (707) 777-1775 | Fri after the 3rd Thu 10am-4pm, or as needed | https://www.foodforpeople.org/programs/pantry-network
Dinsmore pantry | Route 36 mile marker 42.5 | Dinsmore | 95526 | (707) 777-1775 | Fri after the 3rd Thu 9-11am | https://www.foodforpeople.org/programs/pantry-network
Eureka Choice Pantry (Food for People, Cooper Gulch) | 1720 10th St | Eureka | 95501 | (707) 407-0447 | Tue, Wed, Fri 11am-3pm (call for appointment) | https://www.foodforpeople.org/programs/pantry-network
Eureka Rescue Mission - Men's Program (meals) | 110 2nd St | Eureka | 95501 | (707) 443-4551 | Dinner daily 6:30pm; breakfast 6am weekdays, 7am weekends |
Eureka Rescue Mission - Women & Children's Program (meals) | 107 3rd St | Eureka | 95501 | (707) 443-5016 | Dinner daily 5pm; breakfast Tue 8-9am |
Food Not Bombs Eureka (free hot vegan meal) | 3rd St and E St | Eureka | 95501 |  | Sun 3pm |
Humboldt Senior Resource Center (Food for People senior pantry) | 1910 California St | Eureka | 95501 | (707) 443-9747 | 3rd Wed 10-11:30am | https://www.foodforpeople.org/programs/pantry-network
Salvation Army Eureka | 2123 Tydd St | Eureka | 95501 | (707) 442-6475 | Mon-Fri 9:30-11:30am (bag lunch and soup Mon, Wed, Fri) |
St. Vincent de Paul Free Dining Facility | 35 W 3rd St | Eureka | 95501 | (707) 445-9588 | Mon-Sat 11am-1pm (free hot meal) |
Ferndale Community Church (Food for People pantry) | 712 Main St | Ferndale | 95536 | (707) 786-4475 | 3rd Thu 1-2:30pm | https://www.foodforpeople.org/programs/pantry-network
Fortuna Adventist Community Services | 2331 Rohnerville Rd | Fortuna | 95540 | (707) 725-1166 | Tue & Wed 9:30-11:30am |
St. Joseph's Pantry Shelf (Food for People pantry) | 2292 Newburg Rd | Fortuna | 95540 | (707) 725-1148 | Wed 10am-1pm | https://www.foodforpeople.org/programs/pantry-network
Garberville Presbyterian Church (Food for People pantry) | 437 Maple Ln | Garberville | 95542 | (707) 296-6048 | Tue & Thu 10:30am-12pm; Wed 2-4pm | https://www.foodforpeople.org/programs/pantry-network
Loleta Community Church (Food for People pantry) | 228 Church St | Loleta | 95551 | (707) 733-5751 | 3rd Thu 3-5pm | https://www.foodforpeople.org/programs/pantry-network
McKinleyville Family Resource Center | 1615 Heartwood Dr | McKinleyville | 95519 | (707) 840-0905 | Mon, Tue, Thu 10am-3:30pm; Wed 12-3:30pm | https://www.foodforpeople.org/programs/pantry-network
Orick Elementary School (Food for People pantry) | 120918 Hwy 101 | Orick | 95555 | (707) 488-2803 | 3rd Thu 12-2pm | https://www.foodforpeople.org/programs/pantry-network
Journey Church (Food for People pantry) | 95 Belleview Ave | Rio Dell | 95562 | (707) 764-5239 | 3rd Thu 9am-12pm (call for other times) | https://www.foodforpeople.org/programs/pantry-network
Trinidad Lions Club Pantry (Town Hall) | 409 Trinity St | Trinidad | 95570 |  | 3rd Wed 10am-12:30pm | https://www.foodforpeople.org/programs/pantry-network
Willow Creek Community Resource Center | 38883 Hwy 299 | Willow Creek | 95573 | (530) 629-3141 | Thu 10am-12pm; 3rd Thu 10am-1pm | https://www.foodforpeople.org/programs/pantry-network
`,
  },
  Imperial: {
    forceDefer: new Set(),
    rows: `
Bombay Beach (mobile pantry and senior boxes) |  | Bombay Beach | 92257 | (760) 370-0966 | 2nd Wed 8-9am | https://www.ivfoodbank.com/programs/community-food-distributions
Brawley Airport |  | Brawley | 92227 | (760) 370-0966 | 4th Thu 7-8:30am | https://www.ivfoodbank.com/programs/community-food-distributions
Brawley Airport Senior (at Cattle Call Park during construction) |  | Brawley | 92227 | (760) 370-0966 | 2nd Fri 7-8am | https://www.ivfoodbank.com/programs/community-food-distributions
Brawley Senior Apartments |  | Brawley | 92227 | (760) 370-0966 | 4th Tue 8-9am | https://www.ivfoodbank.com/programs/community-food-distributions
First Presbyterian Church (Brawley) |  | Brawley | 92227 | (760) 370-0966 | 4th Sat 8-10am | https://www.ivfoodbank.com/programs/community-food-distributions
Villa Fortuna |  | Brawley | 92227 | (760) 370-0966 | 4th Tue 10:30-11:30am | https://www.ivfoodbank.com/programs/community-food-distributions
Calexico Movies |  | Calexico | 92231 | (760) 370-0966 | 1st Fri 7-8:30am | https://www.ivfoodbank.com/programs/community-food-distributions
Calexico Outlets |  | Calexico | 92231 | (760) 370-0966 | 3rd Tue 7-8:30am | https://www.ivfoodbank.com/programs/community-food-distributions
John Kennedy Park |  | Calexico | 92231 | (760) 370-0966 | 4th Mon 7:30-8:30am | https://www.ivfoodbank.com/programs/community-food-distributions
Las Praderas Apartments |  | Calexico | 92231 | (760) 370-0966 | 2nd Wed 9:30-10:30am | https://www.ivfoodbank.com/programs/community-food-distributions
Latter Day Saints Church (Calexico) |  | Calexico | 92231 | (760) 370-0966 | 2nd Thu 7-8:30am | https://www.ivfoodbank.com/programs/community-food-distributions
Quintero/De Anza Apartments |  | Calexico | 92231 | (760) 370-0966 | 2nd Wed 8-9am | https://www.ivfoodbank.com/programs/community-food-distributions
Villa Las Flores Apartments |  | Calexico | 92231 | (760) 370-0966 | 2nd Wed 8-9am | https://www.ivfoodbank.com/programs/community-food-distributions
St. Patrick's Catholic Church (mobile pantry and senior boxes) | 133 E Church St | Calipatria | 92233 | (760) 502-6348 | 3rd Wed 8-9am | https://www.ivfoodbank.com/programs/community-food-distributions
Catholic Charities Food Resource Center | 250 W Orange Ave | El Centro | 92243 | (760) 353-6822 | Mon-Fri 9am-12pm & 1-4pm |
Christ Community Church - Kitchen with a Mission | 590 W Orange Ave | El Centro | 92243 | (760) 337-9400 | Fri 5-7pm (hot meals) |
Countryside Family Apartments |  | El Centro | 92243 | (760) 370-0966 | 2nd Tue 11am-12pm | https://www.ivfoodbank.com/programs/community-food-distributions
First Christian Church (El Centro) | 450 S Waterman Ave | El Centro | 92243 | (760) 352-8300 | 3rd Fri 8-10am | https://www.ivfoodbank.com/programs/community-food-distributions
Salvation Army Imperial Valley Corps | 397 Ross Ave | El Centro | 92243 | (760) 352-4528 | Pantry Mon-Fri 9am-12pm; food bank distribution 2nd Thu 9-11am | https://www.ivfoodbank.com/programs/community-food-distributions
Strikezone Bowling Alley |  | El Centro | 92243 | (760) 370-0966 | 2nd Fri 7-8:30am | https://www.ivfoodbank.com/programs/community-food-distributions
UDW training center |  | El Centro | 92243 | (760) 370-0966 | 4th Fri 8-9am | https://www.ivfoodbank.com/programs/community-food-distributions
Heber distribution |  | Heber | 92249 | (760) 370-0966 | 1st Thu 7-8:30am | https://www.ivfoodbank.com/programs/community-food-distributions
Holtville Garden Apartments (senior boxes) |  | Holtville | 92250 | (760) 370-0966 | 2nd Tue 8-9am | https://www.ivfoodbank.com/programs/community-food-distributions
Turning Point |  | Holtville | 92250 | (760) 370-0966 | 3rd Sat 7-8am | https://www.ivfoodbank.com/programs/community-food-distributions
Imperial Garden Apartments |  | Imperial | 92251 | (760) 370-0966 | 2nd Tue 8:30-9:30am | https://www.ivfoodbank.com/programs/community-food-distributions
Imperial Senior distribution |  | Imperial | 92251 | (760) 370-0966 | 3rd Mon 6:30-7:30am | https://www.ivfoodbank.com/programs/community-food-distributions
Imperial Valley College (students, Parking Lot K) | 380 E Aten Rd | Imperial | 92251 | (760) 370-0966 | 3rd Fri 10-11am (IVC ID required) | https://www.ivfoodbank.com/programs/community-food-distributions
Imperial Valley Food Bank (registration for Food Bank ID card) | 486 W Aten Rd | Imperial | 92251 | (760) 370-0966 | Mon-Fri 8am-4pm | https://www.ivfoodbank.com
St. Anthony's Church | 210 W 7th St | Imperial | 92251 | (760) 355-1347 | 4th Sat 7-8:30am | https://www.ivfoodbank.com/programs/community-food-distributions
Niland (mobile pantry, Chamber of Commerce) |  | Niland | 92257 | (760) 370-0966 | 3rd Wed 7:30-8:30am | https://www.ivfoodbank.com/programs/community-food-distributions
Slab City |  | Niland | 92257 | (760) 370-0966 | 1st Tue 8-9am | https://www.ivfoodbank.com/programs/community-food-distributions
Ocotillo Bible Church (mobile pantry and senior boxes) |  | Ocotillo | 92259 | (760) 370-0966 | 3rd Thu 8-9am | https://www.ivfoodbank.com/programs/community-food-distributions
Palo Verde Community Center |  | Palo Verde | 92266 | (760) 370-0966 | 1st Mon 8-9am | https://www.ivfoodbank.com/programs/community-food-distributions
Salton City / Salton Sea (mobile pantry) |  | Salton City | 92275 | (760) 370-0966 | 3rd Fri 8-9am | https://www.ivfoodbank.com/programs/community-food-distributions
Apostolic Assembly (Seeley mobile pantry) |  | Seeley | 92273 | (760) 370-0966 | 3rd Thu 7:30-8:30am | https://www.ivfoodbank.com/programs/community-food-distributions
Westmorland Community Food Pantry | 285 E 3rd St | Westmorland | 92281 | (760) 370-0966 | Thu 6-7pm; food bank distribution 3rd Mon 7-8am | https://www.ivfoodbank.com/programs/community-food-distributions
San Pasqual Family Resource Center |  | Winterhaven | 92283 | (760) 370-0966 | 1st Wed 9-11am | https://www.ivfoodbank.com/programs/community-food-distributions
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
      source: 'Hand-collected list (Central California Food Bank, North State / NVC Food Bank, Food for People, Imperial Valley Food Bank locators). Schedules parsed via LA clause parser. lat/lng geocoded downstream.',
      note: 'Drop-in raw for prepare-food-additions.mjs. Same-address program variants kept as separate pins (allowColocated). "Monthly (date varies)" and single start-times route to _deferred.',
    },
    sites,
  };
  writeFileSync(`./${county}Additions-raw.json`, JSON.stringify(out, null, 2));
  console.log(`\n=== ${county}: ${sites.length} sites | ${withEvents} with events | ${sites.length - withEvents} deferred | ${flags.filter((f) => f.includes('no street')).length} city-level ===`);
}
