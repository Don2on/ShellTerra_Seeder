/*
 * build-food-batch6.mjs — Placer, Plumas, Riverside (user-curated lists).
 * Pipe-delimited rows: Name | Street | City | ZIP | Phone | Schedule | Website
 * Writes <County>Additions-raw.json for prepare-food-additions.mjs.
 */
import { writeFileSync } from 'node:fs';
import { parseBlock } from './food-schedule-lib.mjs';

const FIND = 'https://findfoodbank.org/map';

const COUNTIES = {
  Placer: {
    rows: `
Alta Sierra First Baptist Church | 33990 Alta Bonny Nook Road | Alta | 95701 | (530) 389-2168 | Thu 10am-12pm | https://sfbcalta.org
Sierra Reach Ministries | 18015 Applegate Road | Applegate | 95703 | (530) 878-2705 | Thu 9am-11:30am | https://sierrareachministries.org
Auburn Interfaith Food Closet | 1788 Auburn Ravine Road | Auburn | 95603 | (530) 885-1921 | Mon-Fri 10am-2pm; Wed 4pm-7pm; last Sat of month | https://auburnfoodcloset.org
Auburn Seventh-day Adventist Church (Adventist Community Services) | 12225 Rock Creek Road | Auburn | 95602 | (530) 823-0345 | Mon 9am-12pm (homeless hot meal and sack lunch); Tue 9am-12pm (walk-in pantry) | https://aubsda.org
The Salvation Army - Auburn | 286 Sutter Street | Auburn | 95603 | (530) 889-3990 | Mon, Wed, Fri 10am-2pm (closed 12-12:30pm); Tue & Thu by appointment | https://auburn.salvationarmy.org
Placer County Social Services (emergency food boxes) | 5225 North Lake Blvd | Carnelian Bay | 96140 |  | Mon-Fri 8am-5pm (limited non-perishable emergency boxes) | https://sierracommunityhouse.org
PantryToGo - Sierra Vista Community Center | 55 School Street | Colfax | 95713 | (916) 783-0481 | 2nd Tue 10am-12pm | https://feedingthefoothills.org/pantrytogo
Lord Sabaoth Ministries | 24500 Main Street | Foresthill | 95631 | (916) 835-1199 | Wed 3pm-4:30pm (curbside) | https://foresthillcenter.com
Mountain Folk Food Bank | 3071 Iowa Hill Road | Iowa Hill | 95713 | (530) 320-3969 | 1st, 3rd and 5th Fri 2pm-5pm |
Sierra Community House - Kings Beach Office (walk-up) | 265 Bear St | Kings Beach | 96143 | (530) 546-0952 | Wed 2:30pm-4pm | https://sierracommunityhouse.org
Amazing Grace Seventh-day Adventist Church | 600 McBean Park Drive | Lincoln | 95648 | (916) 408-4408 | Mon 12pm-2pm (drive-thru, while supplies last) | https://lincolnamazinggraceca.adventistchurch.org
The Salt Mine | 590 Lincoln Blvd | Lincoln | 95648 | (916) 645-3778 | Tue-Fri 9am-12pm; Sat 12pm-1pm (Lincoln and Sheridan residents only) | https://thesaltminelincoln.org
First United Methodist Church of Loomis | 6414 Brace Road | Loomis | 95650 | (916) 652-0469 | Mon-Fri 10am-1pm | https://loomismethodist.org
Lilies and Sparrows (Calvary Christian Center Loomis) | 4655 King Road | Loomis | 95650 | (404) 969-2274 | Thu 10am-2pm | https://leoa.org
Celebration Church | 990 Meadow Gate Road | Meadow Vista | 95722 | (530) 878-1365 | Sundays after church services | https://ccfellowship.org
Bridgeway Christian Church | 8150 Industrial Avenue Bldg. A | Roseville | 95678 | (916) 238-5321 | Thu 10am-12pm (drive-thru only) | https://bridgeway.church
First United Methodist Church Roseville (soup kitchen) | 109 Washington Blvd | Roseville | 95678 | (916) 783-3464 | Mon 12pm-12:45pm | https://firstumcroseville.org
Harvest Community Church | 1376 Blue Oaks Blvd | Roseville | 95678 | (916) 771-4781 | Last Tue of month 4:30pm-5:30pm (drive-thru) | https://harvestfamily.net
Life Community Church | 10020 Foothills Blvd | Roseville | 95747 | (916) 788-2697 | 1st & 2nd Fri 3pm-4pm (curbside) | https://lifecconline.com
PantryToGo - Denio's Farmers Market | 1401 Church Street | Roseville | 95678 | (916) 783-0481 | 1st Fri 8am-10am | https://feedingthefoothills.org/pantrytogo
Rhema Christian Center | 658 Commerce Drive Suite E | Roseville | 95678 | (916) 780-2121 | 3rd Sat 10am-12pm | https://rhemaccroseville.com
Roseville Alano Club | 111 5th Street | Roseville | 95678 | (916) 781-2763 | Fri 9am-9:30am (call ahead) | https://rosevillealanoclub.com
St. Vincent de Paul Dining Room (soup kitchen) | 105 Bonita Street | Roseville | 95678 | (916) 781-3303 | Tue-Thu 12pm-1:30pm; Sat & Sun 2:30pm-4pm | https://placersvdp.com
St. Vincent de Paul Food Locker | 503 Giuseppe Court Suite 8 | Roseville | 95678 | (916) 781-3303 | Mon, Wed, Fri 9am-11am (curbside) | https://placersvdp.com
The Rock of Roseville | 202 Bonita Street | Roseville | 95678 | (916) 789-7625 | Thu 9:15am-10:15am | https://rockofroseville.com
The Salvation Army - Roseville | 100 Lincoln Street | Roseville | 95678 | (916) 784-3382 | Mon-Thu 9am-12pm & 12:30-2:30pm; Fri 9am-11am & 12:30-2:30pm; breakfast Sat 8-9am; lunch Fri 11am-12pm | https://roseville.salvationarmy.org
Celebration Family Worship Center | 5721 Tenth Street | Sheridan | 95681 | (530) 923-1849 | 4th Wed 6pm-8pm (curbside) | https://celebrationfamilyworshipcenter.com
`,
  },
  Plumas: {
    rows: `
Almanor Basin Food Pantry | 386 A Main Street | Chester | 96020 |  | 1st & 3rd Sat 10am-12pm (photo ID required) |
Indian Valley Food Pantry | 224 Mill Street | Greenville | 95947 |  | Fri 10am-12pm |
Eastern Plumas Community Assistance Network (EPCAN) | 120 Nevada Street | Portola | 96122 | (530) 832-4570 | Commodities Mon & Wed 9:30-11:30am; perishables Tue & Thu 12:30-2:30pm (photo ID required) |
Community Assistance Network | 176 Lawrence Street | Quincy | 95971 | (530) 283-0262 | Commodities 3rd Tue 10am; perishables 3rd Fri 9:30am (photo ID required) |
`,
  },
  Riverside: {
    rows: `
Wellspring Church | 44-175 Washington St | Indian Wells | 92210 | (760) 200-2000 | 2nd Sat 7am-9am | ${FIND}
FIND Mobile Market - Rancho Las Flores Park | 48400 Van Buren St | Coachella | 92236 | (760) 775-3663 | 3rd Fri 7am-9am | ${FIND}
FIND Mobile Market - Oasis Elementary School | 88175 74th Ave | Thermal | 92274 | (760) 775-3663 | 2nd & 4th Fri 4pm-6pm | ${FIND}
FIND Mobile Market - North Shore Community Park | 99480 70th Ave | Mecca | 92254 | (760) 775-3663 | 4th Tue 4pm-6pm | ${FIND}
FIND Mobile Market - La Quinta Library | 78275 Calle Tampico | La Quinta | 92253 | (760) 775-3663 | 4th Sat 7am-9am (walk-up, seniors only) | ${FIND}
Set Free Church Desert Center | 25980 Kaiser Rd | Desert Center | 92239 | (760) 718-7571 | Daily 9am-6pm | ${FIND}
Set Free Church Blythe | 350 N. Palm Dr | Blythe | 92225 |  | Mon-Fri 9am-3pm; every other Sat 9am-3pm | ${FIND}
Idyllwild Forest Health Project | 54162 Maranatha Dr | Idyllwild-Pine Cove | 92549 | (951) 468-0110 | 2nd & 4th Thu 12pm-2pm | ${FIND}
First Baptist Church Indio | 82490 Doctor Carreon Blvd | Indio | 92201 | (760) 342-6299 | Mon 8:30am-9:30am | ${FIND}
Desert Hot Springs Senior Center | 11777 West Dr | Desert Hot Springs | 92240 | (760) 329-0222 | 3rd Wed 9am-11am (age 55+ only) | ${FIND}
Ripley Center | 24501 School Rd | Ripley | 92225 | (760) 922-9873 | 3rd Wed 8am-10am | ${FIND}
Iglesia Fraternidad Cristiana | 83151 Requa Ave | Indio | 92201 | (760) 342-0692 | 3rd Tue 6pm (Mar-Oct) or 3pm (Nov-Feb) | ${FIND}
La Mision de San Juan Diego | 100110 Compass Dr | North Shore | 92254 | (760) 899-2012 | 1st Tue 5pm-6pm | ${FIND}
St. Louis Rey Church | 68633 C St | Cathedral City | 92234 | (760) 844-6629 | 1st Fri 9am-10am | ${FIND}
Grace Church DHS | 17400 Bubbling Wells Rd | Desert Hot Springs | 92241 | (760) 251-2416 | 1st Tue 5pm-6pm | ${FIND}
FIND Mobile Market - Sky Valley Community Center | 20905 Hot Springs Rd | Desert Hot Springs | 92241 | (760) 775-3663 | 3rd Tue 4pm-5pm | ${FIND}
FIND Mobile Market - Desert Mirage High School | 86150 Ave 66 | Thermal | 92274 | (760) 775-3663 | 3rd Wed 4pm-6pm | ${FIND}
FIND Mobile Market - Cabot Yerxa Elementary School | 67067 Desert View Ave | Desert Hot Springs | 92240 | (760) 775-3663 | 4th Mon 9am-11am | ${FIND}
FIND Mobile Market - Coachella Valley High School | 83800 Airport Blvd | Thermal | 92274 | (760) 775-3663 | 1st Mon 11am-12pm | ${FIND}
Well in the Desert | 181 N. Indian Canyon | Palm Springs | 92262 | (760) 656-8905 | Sat 6am until gone; hot lunch Mon-Fri | ${FIND}
Desert Chapel | 630 S. Sunrise Way | Palm Springs | 92264 | (760) 327-2772 | 2nd & 4th Sat 7am-8am | ${FIND}
St. Theresa's Catholic Church | 2800 E. Ramon Rd | Palm Springs | 92264 | (760) 323-2669 | Mon 7:30am-11:30am | ${FIND}
The Center - The Community Food Bank | 2901 E. Alejo Rd | Palm Springs | 92262 | (760) 416-7790 | Thu 5pm-7pm | ${FIND}
FIND Mobile Market - James O. Jessie Desert Highlands Unity Center | 480 W Tramview Rd | Palm Springs | 92262 | (760) 775-3663 | 2nd & 4th Thu 4pm-6pm | ${FIND}
FIND Mobile Market - Palm Springs Convention Center | 277 N. Avenida Caballeros | Palm Springs | 92262 | (760) 775-3663 | 1st Thu 4pm-5:30pm | ${FIND}
Palm Desert Oasis Church | 74-200 Country Club Dr | Palm Desert | 92260 | (760) 568-0809 | Sat 7:30am-8:30am | ${FIND}
The Joslyn Center | 73-750 Catalina Way | Palm Desert | 92260 | (760) 895-4652 | Fri 8am-10am | ${FIND}
St. John's Lutheran Church | 42-695 Washington St | Palm Desert | 92211 | (760) 345-2122 | 3rd Sat 7am-8am (call to confirm) | ${FIND}
St. Margaret's Church Neighbors 4 Neighbors | 47-535 Hwy 74 | Palm Desert | 92260 | (760) 346-2697 | Tue 10am-5pm | ${FIND}
FIND Mobile Market - Palm Desert High School | 74910 Aztec Rd | Palm Desert | 92260 | (760) 775-3663 | 4th Wed 4:30pm-6pm | ${FIND}
Iglesia Un Manantial en el Desierto | 99241 Access Rd | North Shore | 92254 | (760) 238-2186 | Every other Thu 8pm | ${FIND}
Galilee Center | 66-101 Hammond Rd | Mecca | 92254 | (760) 396-9100 | Thu 3pm until gone | ${FIND}
Catholic Charities Site #2 | 99-155 Sea View Dr | Mecca | 92254 |  | Wed 8am-9:15am | ${FIND}
Catholic Charities Site #1 | 65-050 Cahuilla St | Mecca | 92254 |  | Wed 8am-9:15am | ${FIND}
Community Food Pantry | 81050 Harrison St | Thermal | 92274 |  | Mon, Wed, Fri 9:30am-11:30am; 2nd & 4th Wed 5pm-6:30pm; 1st Sat 9:30am-11:30am | ${FIND}
Coachella Valley Rescue Mission | 47-470 Van Buren St | Indio | 92201 | (760) 347-3512 | Food distribution Wed 8am-10am; hot meals daily | ${FIND}
Destiny Church | 82625 Showcase Parkway | Indio | 92203 | (760) 863-0700 | Sat 8am-9am | ${FIND}
Iglesia Bethel | 43-907 Jackson St | Indio | 92201 | (760) 574-8065 | 1st Fri 6:30pm-8pm | ${FIND}
Martha's Village & Kitchen | 83791 Date Ave | Indio | 92201 | (760) 347-4741 | USDA 3rd Wed 8am-10am; emergency bags Mon-Fri 8am-10am & 1pm-3pm | ${FIND}
St. John's Episcopal Church | 45319 Deglet Noor St | Indio | 92201 | (760) 347-3265 | 4th Thu 2:30pm-5:30pm (drive-thru) | ${FIND}
Love of Christ | 43640 Burr St | Indio | 92201 | (760) 777-2825 | 2nd Fri 6:30pm-7:30pm | ${FIND}
FIND Mobile Market - Shadow Hills High School | 39225 Jefferson St | Indio | 92201 | (760) 775-3663 | 1st Sat 8am-10am | ${FIND}
FIND Mobile Market - Mathis Brothers | 81410 CA-111 | Indio | 92201 | (760) 775-3663 | 3rd Sat 6:30am-8:30am | ${FIND}
Abundant Life Church | 82025 Bliss St | Indio | 92201 | (760) 775-5959 | Sat 8am-9:30am | ${FIND}
The Narrow Door | 43052 Madison St Ste 101 | Indio | 92201 | (760) 775-6200 | 2nd Sat 9am-11am | ${FIND}
FIND Regional Food Bank Mobile Market | 83775 Citrus Ave | Indio | 92201 | (760) 775-3663 | Fri 7am-8:30am | ${FIND}
Boys & Girls Club Indio | 83100 Date Ave | Indio | 92201 | (760) 836-1160 | 3rd Thu 4pm until food runs out | ${FIND}
Food Now | 14080 Palm Dr Ste E | Desert Hot Springs | 92240 | (760) 288-7878 | Wed & Thu 7:30am-10:30am drive-thru | ${FIND}
St. Elizabeth's Pantry | 66700 Pierson Blvd | Desert Hot Springs | 92240 | (760) 329-8794 | Tue 8:30am-10:30am | ${FIND}
Family Worship Center | 85901 Vista Del Norte | Coachella | 92236 | (760) 574-0583 | Thu 6pm-7pm | ${FIND}
F.I.S.H. | 1612 1st St | Coachella | 92236 | (760) 398-9000 | Tue, Wed, Fri 8am-9am (photo ID first visit) | ${FIND}
Centro Libre | 83246 Ave 50 | Coachella | 92236 | (760) 698-3191 | Last Tue 5pm-7pm (May through September) | ${FIND}
Calvary Christian Center | 68550 Dinah Shore Dr | Cathedral City | 92234 | (760) 656-3525 | Sat after the 2nd Thu 8am-10am | ${FIND}
Salvation Army - Cathedral City | 30400 Landau Blvd | Cathedral City | 92234 | (760) 324-2275 | Mon & Fri 9am-10am; USDA 3rd Tue 1pm-4pm | ${FIND}
Cathedral City Senior Center | 37171 W. Buddy Rogers Ave | Cathedral City | 92234 | (760) 321-1548 | Mon 8:30am-11am | ${FIND}
Vision Eterna | 35688 Cathedral Canyon Dr Ste 101 | Cathedral City | 92234 | (760) 883-9216 | 1st Sat 8am-10am | ${FIND}
FIND Mobile Market - Agua Caliente Elementary School | 30800 San Luis Rey Dr | Cathedral City | 92234 | (760) 775-3663 | 1st Sat 9am-10am | ${FIND}
FIND Mobile Market - Cabazon Community Center | 50390 Carmen Ave | Cabazon | 92230 | (760) 775-3663 | 4th Wed 10am-11am | ${FIND}
Blythe Emergency Food Pantry | 181 South Main St | Blythe | 92225 | (760) 922-8836 | Mon, Wed, Fri 10am-11:45am | ${FIND}
FIND Mobile Market - Anza Electric Co-op | 54870 CA-371 | Anza | 92539 | (760) 775-3663 | 2nd Sat 9am-11am | ${FIND}
Idyllwild Community Center | 25925 Cedar St | Idyllwild-Pine Cove | 92549 | (951) 659-2638 | 1st Tue 10am-12:30pm |
Food for the Faithful | 56250 CA-371 | Anza | 92539 | (951) 763-5636 | Last Fri of month 7am-2pm; Wed & Thu 7am-2pm on call |
FSA - James A Venable Community Center | 50390 Carmen Ave | Cabazon | 92230 | (951) 922-1097 | 3rd Tue 9:30am-11:30am |
Bread of Life Church | 45252 CA-74 | Hemet | 92544 | (951) 927-8217 | Sun 10am-1:30pm |
First Missionary Baptist Church of Banning | 332 N Allen St | Banning | 92220 | (951) 849-8113 | 2nd & 4th Wed 10am-2pm |
H.E.L.P. Inc. | 53 S 6th St | Banning | 92220 | (951) 922-2305 | Mon-Fri 9am-1pm |
Hub City Church | 109 N 2nd St | Banning | 92220 | (760) 985-5657 | Sun 10am-12pm; Tue & Fri 5pm-7pm; Thu 10am-1pm |
St. Kateri Catholic Church | 157 W Nicolet St | Banning | 92220 | (951) 845-2849 | 1st & 3rd Wed 8:30am-10:30am |
Kids Cures Foundation | 2041 W Nicolet St | Beaumont | 92223 | (951) 378-6124 | 2nd & 4th Sat 10am-1pm |
SDA Hemet Church | 27025 Girard St | Hemet | 92544 | (951) 929-2632 | Tue & Wed 9am-11am |
San Jacinto United Methodist Church | 210 S San Jacinto Ave | San Jacinto | 92583 | (951) 654-2307 | Thu 1pm-2pm; 2nd Sun 8am-9am |
Sunrise Church - Banning | 4024 W Wilson St | Banning | 92220 | (909) 875-5566 | Tue-Fri 9am-12pm |
Evangequip Missions | 530 S Buena Vista St | Hemet | 92543 | (909) 838-8062 | Wed 7pm-8pm; Fri & Sat 5pm-7pm (by appointment only) |
Community Pantry and Valley Community Pantry | 305 E Devonshire | Hemet | 92543 | (951) 929-1101 | Mon, Tue, Wed 9:30am-12pm |
Our Lady of the Valley Catholic Church | 780 S State St | Hemet | 92543 | (951) 765-9691 | 4th Tue 8:30am-9am |
Mt. San Jacinto College - San Jacinto Campus | 1499 N State St | San Jacinto | 92583 | (951) 487-6752 | Thu 10am-12pm (students only) |
My City Youth | 145 N Tahquitz Ave | Hemet | 92543 | (951) 652-0647 | Tue 9am-5pm; Wed 10am-12pm |
The Salvation Army Hemet Corps | 340 S Palm Ave | Hemet | 92543 | (951) 791-9497 | Mon, Wed, Fri 11:30am-1:30pm; 3rd Thu 10am-12pm |
Carol's Kitchen Inc. | 244 Maple Ave Suite W | Beaumont | 92223 | (909) 284-4104 | Mon, Tue, Thu, Fri 11:30am-1pm |
Beaumont Seventh Day Adventist | 1343 Palm Ave | Beaumont | 92223 | (909) 229-2472 | 1st & 2nd Wed 10am-12pm |
First Church of God | 31371 CA-74 | Homeland | 92548 | (951) 926-1345 | Sat 9am-11am; 2nd Mon 9am-11am |
Mt. San Jacinto College - Menifee Campus | 28237 La Piedra Rd | Menifee | 92584 | (951) 487-6752 | Mon-Wed 8:30am-2pm (students only) |
Mission Ministry Trinity Baptist Church | 29175 Ironwood Ave | Moreno Valley | 92555 | (951) 601-0253 | Tue 9:30am-12:30pm; 3rd Wed 10am-12pm; Thu 9:30am-12:30pm on call |
Perris Church of Christ | 27157 Sunset Ave | Perris | 92571 | (951) 928-2055 | 4th Sat 10am-11:30am |
Canyon Hills Calvary Chapel Food Pantry | 28125 Bradley Rd Ste 130 | Menifee | 92586 | (951) 265-8421 | Thu 11:30am-1pm |
Menifee Valley Community Cupboard | 26808 Cherry Hills Blvd | Sun City | 92586 | (951) 301-4414 | Mon 10am-1pm; 3rd Wed 10am-1pm |
Society of St Vincent de Paul - St Catherine of Alexandria | 41875 C St | Temecula | 92592 | (562) 537-4692 | Fri 9am-11am (on call) |
Community Food Pantry Murrieta | 39493 Los Alamos Rd Suite A | Murrieta | 92563 | (951) 677-6347 | Wed & Thu 6am-10am | https://communityoutreachofmurrieta.com
VNW - Circle of Care Inc. | 26090 Ynez Rd | Temecula | 92591 | (951) 973-3582 | Mon-Thu 8:30am-1pm |
Mission Hope | 41760 Rider Way | Temecula | 92590 | (951) 751-5828 | Tue, Wed, Thu 9:30am-12pm; 2nd Mon 9:30am-12:30pm |
The Salvation Army - Murrieta Corps | 40270 Los Alamos Rd | Murrieta | 92562 | (951) 677-1324 | Mon-Fri 8:30am-11:30am |
RCCD Foundation - Moreno Valley College | 16130 Lasselle St | Moreno Valley | 92551 | (951) 571-6263 | Mon-Wed 1pm-5pm; Thu 9am-5pm (students only) |
Greater Works Church | 25823 Jefferson Ave | Murrieta | 92562 | (951) 805-8309 | 1st, 3rd, 5th Wed 12:30pm-2pm; Sat 12pm-1:30pm |
Saint James Community Food Pantry | 269 W 3rd St | Perris | 92570 | (951) 657-2380 | Mon & Wed 10:30am-1:30pm |
SDA Lake Perris Church | 377 W 3rd St | Perris | 92570 | (951) 453-2033 | Fri 10am-11am |
Murrieta Senior Center | 5 Town Square | Murrieta | 92562 | (951) 304-7275 | 4th Tue 9am-11am |
Murrieta United Methodist Church | 24652 Adams Ave | Murrieta | 92562 | (951) 813-9701 | Fri 8am-9am |
MovementChurch Choice Market | 25550 Ironwood Ave | Moreno Valley | 92557 | (951) 491-9240 | Thu 9am-10:30am |
The Salvation Army Moreno Valley | 24741 Alessandro Blvd | Moreno Valley | 92553 | (951) 784-4490 | Mon, Wed, Fri 12pm-3pm; 1st Mon 11am-2pm |
Survival Ministries | 23100 Betty Rd | Perris | 92570 | (951) 657-8810 | Mon & Wed 9am-12pm; Fri 9am-11:30am |
Bethel AME Church | 24480 Sophie St | Perris | 92570 | (951) 657-5705 | 4th Sat 11am-1pm | https://bameperris.org
Casa de Oracion Perris | 1895 Weston Rd | Perris | 92570 | (949) 309-7022 | Daily 5pm-7pm (on call only) |
SDA Moreno Valley | 12649 Indian St | Moreno Valley | 92553 | (951) 662-4857 | Mon 9am-3pm |
Ministerio Juda | 22109 Rocky Hills Rd | Perris | 92570 | (951) 238-4116 | Sun 10am-1pm; Fri 10am-12pm |
Moreno Valley Conference & Recreation Center | 14075 Frederick St | Moreno Valley | 92553 | (951) 413-3430 | 2nd Thu 9am-11am |
Bread Of Life Fellowship Apostolic Assembly | 21020 Malaga Rd | Lake Elsinore | 92532 | (951) 245-0124 | Tue, Wed, Thu 10am-12pm |
Charles Meigs Community Center | 21091 Rider St | Perris | 92570 | (951) 210-1580 | Last Wed of month 9am-12pm |
Helping Hands Group | 31877 Corydon Rd Suite 110 | Lake Elsinore | 92530 | (951) 445-2354 | 2nd & 3rd Sat 12pm-2pm (delivery only, by appointment) |
Generations Church | 12125 Day St A203 | Moreno Valley | 92557 | (951) 686-6000 | Mon-Fri 10am-5pm (on call) |
Al Rahma Food Bank | 12125 Day St T102 | Moreno Valley | 92557 | (951) 378-3033 | Fri 2pm-5pm |
Cross Word Christian Church | 21401 Box Springs Rd | Moreno Valley | 92557 | (951) 275-5360 | 2nd & 4th Sat 10am-11:30am | https://crosswordchurch.org
HOPE Food Pantry | 506 W Minthorn St | Lake Elsinore | 92530 | (951) 376-3703 | Tue, Wed, Thu 9am-12pm |
The Grove Community Church Corner Pantry | 19321 Grove Community Dr | Riverside | 92508 | (951) 571-9090 | Mon 9:30am-10:30am (closed 2nd Mon) |
3 Phases of Becoming a Woman | 17498 Grand Ave | Lake Elsinore | 92530 | (951) 378-1051 | Tue-Sat 9am-5pm |
Vineyard Christian Fellowship | 17470 Grand Ave | Lake Elsinore | 92530 | (951) 678-9419 | Tue, Thu, Sat 8:30am-9am |
R'Pantry - UC Riverside | 900 University Ave HUB 346 | Riverside | 92521 | (951) 827-3663 | Mon, Tue, Wed, Fri 10am-4:30pm (college students only) |
FSA - Highgrove Community Center | 459 Center St | Riverside | 92507 | (951) 686-1096 | 4th Fri 8am-10:30am |
Jamboree Housing | 550 Center St | Riverside | 92507 | (949) 263-8676 | 4th Mon 4:30pm-5:30pm |
SDA Riverside Spanish Church | 3625 Ottawa Ave | Riverside | 92507 | (951) 902-5616 | 3rd Fri 9am-11am |
University Women's Shelter | 4366 Bermuda Ave | Riverside | 92507 | (951) 224-9438 | Mon-Fri 9am-1pm |
Community Settlement Association | 4366 Bermuda Ave | Riverside | 92507 | (951) 686-6266 | Mon & Wed 11am-12pm |
SDA Mount Rubidoux Church | 5320 Victoria Ave | Riverside | 92506 | (951) 276-8374 | 2nd Tue 10am-12pm |
The Salvation Army - Riverside | 3695 1st St | Riverside | 92501 | (951) 784-4490 | Mon, Wed, Fri 9am-12pm |
Life Spring Church | 1224 Main St | Riverside | 92501 | (951) 683-6081 | 1st Mon 9am-11am; 3rd Mon 9am-11:30am |
First Congregational of Riverside (Project Food) | 3504 Mission Inn Avenue | Riverside | 92501 | (951) 684-2494 | Wed 5:30pm-6:30pm |
RCCD Foundation - Riverside City College | 4800 Magnolia Ave | Riverside | 92506 | (951) 222-8572 | Mon-Fri 8am-5pm (RCC students only) |
Veterans not Forgotten | 6476 Riverside Ave | Riverside | 92506 | (951) 640-3673 | Sat 10am-12pm (deliveries only) |
Starting Over Inc | 6355 Riverside Ave Ste 100 | Riverside | 92506 | (562) 676-3784 | Mon-Fri 8am-5:30pm |
Walden Family Services | 3576 Arlington Ave Suite 106 | Riverside | 92506 | (951) 788-5905 | Mon-Fri 10am-4pm |
The Fruit of Our Hands Ministries | 7000 Indiana Ave Suite 114 | Riverside | 92506 | (951) 289-9808 | Tue, Wed, Thu 9:30am-11:30am; Thu & Fri 9:30am-1:30pm |
Saint Vincent De Paul | 6956 Nixon Dr | Riverside | 92506 | (951) 684-7386 | Mon-Fri 9am-5pm (delivery only) |
Catholic Charities - Riverside | 3020 Madison St | Riverside | 92504 | (909) 388-1239 | 3rd Thu 9am-12pm | https://ccsbriv.com
Trinity Evangelical Lutheran Church | 5969 Brockton Ave | Riverside | 92506 | (951) 500-6510 | Wed 8am-10am | https://trinityriverside.org
Casa Blanca Home of Neighborly Services | 7680 Casa Blanca St | Riverside | 92504 | (951) 688-3043 | Wed 10am-11am (by appointment only) | https://casablancahns.org
Mt. Calvary Missionary Baptist Church | 5476 34th St | Riverside | 92509 | (951) 684-6480 | 2nd Sat 10am-1pm |
Bethel Christian Center | 2425 Van Buren Boulevard | Riverside | 92503 | (951) 359-1123 | Sun 11:30am-12:30pm; Mon-Fri 8am-12pm (on call) |
Our Lady Of Perpetual Help | 5250 Central Ave | Riverside | 92504 | (951) 689-8921 | Tue, Thu, Fri 10am-12pm |
Magnolia Church | 8351 Magnolia Ave | Riverside | 92504 | (951) 689-5700 | 4th Sat 9am-10:30am |
Central Community Christian Fellowship | 5623 Arlington Ave | Riverside | 92504 | (951) 689-5806 | Wed 8am-10am; Tue, Wed, Thu, Sat 9am-5pm drive-through |
The Avenue | 8223 California Ave | Riverside | 92504 | (618) 560-7416 | Sun 9am-12pm; Wed, Thu, Fri 9am-3pm |
Arlington SDA Church | 8778 Magnolia Ave | Riverside | 92503 | (951) 688-6630 | Tue 9am-11:30am |
Wesley United Methodist Church | 5770 Arlington Ave | Riverside | 92504 | (951) 689-2649 | Fri 9am-10am |
MFI Recovery Center | 5860 Arlington Ave | Riverside | 92504 | (951) 683-6596 | 3rd Tue 9am-11am |
Eddie Dee Center | 5888 Mission Blvd | Rubidoux | 92509 | (951) 275-9975 | Wed 9am-12pm; 1st Thu 9am-12pm |
Saint Michael's Episcopal Church | 4070 Jackson St | Riverside | 92503 | (951) 689-0642 | Mon-Thu 9am-1pm |
Feeding the Neighborhood | 9800 Indiana Ave Suite 2 | Riverside | 92503 | (951) 809-4379 | 3rd Sat 8:30am-1pm |
Lighthouse of Hope Foundation | 9085 California Ave | Riverside | 92503 | (951) 213-5590 | Mon, Wed, Fri 11am-2pm; 3rd Sat 10am-12pm |
St. John The Evangelist Catholic Church | 3980 Opal St | Riverside | 92509 | (951) 684-6864 | Wed 9:30am-11:30am |
Reformed Baptist Church | 7250 Mission Blvd | Jurupa Valley | 92509 | (951) 776-7680 | 3rd Sat 9am-10:30am |
Lake Hills Christian Center | 12500 Indiana Ave | Riverside | 92503 | (951) 737-6680 | Mon, Wed, Fri 9am-11am (on call) |
Arlington Temporary Assistance | 10495 Arlington Ave #112 | Riverside | 92505 | (951) 689-5620 | Mon-Thu 10am-1pm |
La Sierra Senior Center | 5215 La Sierra Ave B | Riverside | 92505 | (951) 351-6437 | 2nd Fri 9am-1pm |
La Sierra Spanish SDA | 5885 La Sierra Ave | Riverside | 92505 | (951) 533-7680 | Wed 8am-10am |
Inland Vineyard Christian Fellowship | 935 N McKinley St | Corona | 92879 | (951) 549-1192 | Sat 9am-10am |
Manna Ministries - Vision Plus Church | 9875 Bellegrave Ave | Jurupa Valley | 92509 | (951) 236-9477 | Tue 8am-2pm; Thu 8am-3pm (on call) |
The Truth Church | 10281 54th St | Mira Loma | 91752 | (909) 625-7975 | 3rd Sat 8am-12pm |
Sacred Heart Catholic Church | 9935 Mission Blvd | Riverside | 92509 | (951) 515-1806 | 1st Tue 8am-11am |
Calvary Chapel Inland | 5383 Martin St | Mira Loma | 91752 | (951) 318-7724 | Sun 9am-1pm |
Crossroads Christian Church | 2331 Kellogg Ave | Corona | 92881 | (951) 314-7036 | Thu 10am-11am |
Beacon Hill Assembly of God | 3659 Corona Ave | Norco | 92860 | (951) 736-0555 | 1st & 3rd Sat 9am-11am |
SDA Corona Main Spanish | 114 E 10th St | Corona | 92879 | (951) 690-6438 | 1st & 3rd Wed 8pm-9pm |
Corona Senior Center | 365 N Main St | Corona | 92878 | (951) 817-5755 | 2nd Wed 9am-11am |
River Run Senior Apartments | 863 River Rd | Corona | 92878 | (951) 808-8300 | 3rd Tue 9am-11am |
Vantagepoint Church | 12750 Citrus St | Eastvale | 92880 | (951) 727-3524 | 4th Tue 10am-11am |
New Beginnings Community Church Norco | 1769 Western Ave | Norco | 92860 | (951) 734-9574 | Sun 9am-12:30pm |
New Hope Family Worship Center | 804 S Lincoln Ave | Corona | 92882 | (951) 737-4673 | Sat 10am-12pm (on call) |
Riverside Central - Iglesia Adventista Del Septimo Dia | 5363 Tyler Ave | Riverside | 92503 | (951) 393-9975 | Wed 10am-10:30am |
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
      source: 'Hand-collected list (Placer Food Bank/Feeding the Foothills, FBNN, FIND Food Bank, Feeding America Riverside-San Bernardino). Schedules parsed via LA clause parser. lat/lng geocoded downstream.',
      note: 'Drop-in raw for prepare-food-additions.mjs. Single start-times / "daily" / "on call"-only route to _deferred.',
    },
    sites,
  };
  writeFileSync(`./${county}Additions-raw.json`, JSON.stringify(out, null, 2));
  console.log(`\n=== ${county}: ${sites.length} sites | ${withEvents} with events | ${sites.length - withEvents} deferred | ${flags.filter((f) => f.includes('no street')).length} city-level ===`);
}
