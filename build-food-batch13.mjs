/*
 * build-food-batch13.mjs — Ventura (net-new), Yolo (ADDITIONS to existing shell), Yuba (net-new).
 * Writes ./b13-<County>-raw.json. Yolo prepared with --existing dedupe + real shell-id.
 */
import { writeFileSync } from 'node:fs';
import { parseBlock } from './food-schedule-lib.mjs';

const FS = 'https://foodshare.com/findhelp';

const COUNTIES = {
  Ventura: {
    rows: `
CSU Channel Islands Basic Needs (students) | 57 Ventura St | Camarillo | 93012 | 805-437-2067 | Mon-Wed 1pm-4pm | ${FS}
Camarillo Community Center - Pleasant Valley Rec & Park | 1605 E. Burnley St | Camarillo | 93010 | (805) 482-1996 | Fri 11am-12:30pm (drive-through) | ${FS}
Camarillo Community Church | 379 Mobil Ave | Camarillo | 93010 | 805-482-2657 | Fri 1pm-5pm | ${FS}
Crossroads Community Church | 161 Plaza La Vista | Camarillo | 93010 | 805-484-8586 | Thu 4:30pm until food runs out | ${FS}
Many Mansions - Rancho Sierra | 1724 Lewis Road | Camarillo | 93012 | 805-386-3235 | Tue 11am-12pm | ${FS}
Mira Vista Apartments | 2740 E. Ponderosa Dr | Camarillo | 93010 | 805-983-7100 | 3rd Thu 1:30pm-2:30pm | ${FS}
Pleasant Valley Senior Center | 1605 Burnley St | Camarillo | 93010 | 805-983-7100 | 1st Wed 9am-11am | ${FS}
Project Hope - St. Columba's Episcopal Church | 1251 Las Posas Rd | Camarillo | 93010 | 805-482-8831 | 1st, 2nd & 4th Thu 5pm-6pm; 2nd & 4th Thu 9am-10am | ${FS}
Seventh Day Adventist Church - Camarillo | 3975 E. Las Posas Rd | Camarillo | 93010 | 805-428-4632 | Sat 2pm-3:30pm | ${FS}
St. Mary Magdalen Church | 2532 Ventura Blvd | Camarillo | 93010 | 805-484-0532 | Mon 3:30pm-5pm | ${FS}
Colonia Village Tenant Association | 1500 Camino Del Sol | Oxnard | 93030 | 805-385-7574 | 2nd Sat 9am-10am | ${FS}
First Baptist Church El Rio | 2857 Cortez St | Oxnard | 93036 | 805-444-2427 | Wed 1pm-2pm; Fri 5pm-6pm; Sun 12pm-1pm | ${FS}
Rio Schools (Kenney St) | 1140 Kenney Street | Oxnard | 93036 |  | 2nd & 4th Tue 2:30pm-3:30pm | ${FS}
Bardsdale United Methodist Church | 1498 Bardsdale Ave | Fillmore | 93015 | 805-524-2070 | 1st & 3rd Sat 12pm-2pm | ${FS}
Fillmore Active Adult Center | 533 Santa Clara Ave | Fillmore | 93015 | 805-983-7100 | 1st Tue 9am-11am; 3rd Wed 12pm-1pm | ${FS}
Fillmore Church of Christ | 219 Mountain View | Fillmore | 93015 | 805-218-6004 | Mon 2:15pm until food runs out | ${FS}
Fillmore Police Storefront | 642 Lemon Way | Fillmore | 93015 | 805-524-2982 | 2nd, 3rd & 4th Wed 8am-10am | ${FS}
One Step a la Vez | 421 Sespe Ave | Fillmore | 93015 | 805-625-7067 | 2nd & 4th Wed 3pm-5pm | ${FS}
Salvation Army at Rancho Sespe Apartments | 2950 E Telegraph Road | Fillmore | 93015 | 805-521-1849 | 4th Thu 12pm-1pm | ${FS}
St. Francis of Assisi Church / SVDP | 1048 W Ventura St | Fillmore | 93015 | 805-524-1306 | 1st, 3rd & 5th Tue 11am-12pm; 1st Fri 11:30am-12:30pm | ${FS}
United Parents - Fillmore | 584 Ventura St | Fillmore | 93015 | 805-384-1555 | Mon-Fri 1pm-7pm; 2nd Sat 10am-12pm | ${FS}
Catholic Charities Moorpark | 612B Spring Rd Ste 101 | Moorpark | 93021 | 805-529-0720 | Wed 9:30am-1pm | ${FS}
Faith Lutheran Church | 123 Park Ln | Moorpark | 93021 | 805-983-7100 | Fri 2pm-3pm | ${FS}
Grace Harvest Church | 4823 Mira Sol Dr | Moorpark | 93021 | 805-553-9501 | Sat 10am-11am | ${FS}
Ruben Castro Charities at Moorpark College | 7075 Campus Dr | Moorpark | 93021 | 805-248-7113 | Sat 12:30pm-2:30pm; Sun 12pm-4pm | ${FS}
Lighthouse Church | 3353 Old Conejo Rd | Newbury Park | 91320 | 805-480-9999 | Fri 5:30pm-6:30pm | ${FS}
Nucleus CA Inc - Manafest | 999 Rancho Conejo Blvd | Newbury Park | 91320 | 805-262-5000 | Wed 4:30pm-5:30pm | ${FS}
Safe Passage Foundation Food Pantry | 1707 Calle Diamonte | Newbury Park | 91320 | (805) 558-8987 | 2nd Sat 10am-11am | ${FS}
SVDP - St. Julie Billiart | 2475 Borchard Rd | Newbury Park | 91320 | (805) 270-9597 | Mon-Wed 10am-12pm | ${FS}
Salvation Army at Oak View Park and Resource Center | 555 Mahoney Ave | Oak View | 93022 | 805-986-6532 | Wed 9am-10am | ${FS}
Help of Ojai | 108 S. Montgomery St | Ojai | 93023 | 805-640-3320 | Mon and Wed 9:30am-11:30am | ${FS}
Secure Beginnings | 200 N. Montgomery St | Ojai | 93023 | (805) 646-7559 | 1st & 3rd Wed 10:30am-12:30pm | ${FS}
St. Thomas Aquinas / SVDP | 185 St. Thomas Dr | Ojai | 93023 | 805-640-2750 | 1st Thu 9am-10:30am; 3rd Sat 8:30am-10:30am | ${FS}
AHA at Pacific Point Apartments | 1001 W Gonzales Rd | Oxnard | 93036 | (805) 988-9100 | 1st & 3rd Tue 9am-10am; 4th Wed 4pm-5pm | ${FS}
Bethel AME Church | 855 South F St | Oxnard | 93030 | (805) 486-6477 | 3rd and 4th Thu 11am-2pm | ${FS}
Bread of Life / Oxnard Community Food Pantry - All Saints Episcopal Church | 144 South C St | Oxnard | 93030 | 805-320-0997 | Fri 12pm-2pm; Sun 4pm-5pm | ${FS}
Camino Del Sol Apartments | 1910 Camino Del Sol | Oxnard | 93030 | 805-983-7100 | 2nd Tue 3pm-4pm | ${FS}
Celebration Nation | 1900 W. 5th Street | Oxnard | 93030 |  | Sat 1pm-2pm | ${FS}
Church of The Nazarene | 1630 Saviers Rd | Oxnard | 93033 | 805-483-7046 | 3rd Thu 3pm-4:30pm; 3rd Fri 2pm-3:30pm | ${FS}
Circle of Love at Southwinds Park | 300 West Clara St | Oxnard | 93033 | 707-718-7352 | 1st and 3rd Sat 10am-12pm | ${FS}
LUCHA at Southwinds Park | 300 West Clara St | Oxnard | 93033 | 805-983-7100 | 3rd Sat 9:30am-11am | ${FS}
Clinicas del Camino Real - Gonzales | 1100 W Gonzales Road | Oxnard | 93036 |  | 1st Tue 1:30pm-2:30pm | ${FS}
Community Action of Ventura County | 621 Richmond Ave | Oxnard | 93030 | 805-436-4000 | 2nd and 4th Thu 8:30am-11:30am | ${FS}
Food Share Warehouse | 4156 Southbank Rd | Oxnard | 93036 | 805-983-7100 | Last Thu 3:30pm-4:30pm | ${FS}
Grace Bible Church | 936 W 5th St | Oxnard | 93030 | (805) 483-2205 | 2nd and 4th Sat 9am-11am; 1st Thu 1pm-2pm | ${FS}
Harbor Missionary Church at Garden Acres Mutual Water Co. | 2838 Friedrich Road | Oxnard | 93036 | (805) 247-0002 | Mon 4:30pm-5:30pm | ${FS}
Heritage Apartments | 820 South E St | Oxnard | 93030 | 805-983-7100 | 4th Tue 10am-11am | ${FS}
Mary Star of the Sea | 463 W. Pleasant Valley Road | Oxnard | 93033 | 805-983-7100 | 4th Mon 2pm-3:30pm | ${FS}
New Life Community Church | 1251 N Rice Ave | Oxnard | 93030 | 805-983-1890 | 4th Thu 9am-11:30am | ${FS}
Nyeland Promise | 3334 Santa Clara Avenue | Oxnard | 93036 |  | 4th Mon 10:30am-11:30am | ${FS}
Nyeland Promise at Water Company | 3802 Almond Drive | Oxnard | 93036 | 805-415-2787 | 2nd and 4th Tue 9:30am-10:30am | ${FS}
Our Lady of Guadalupe - Oxnard | 500 N Juanita Ave | Oxnard | 93030 | 805-983-7100 | 4th Wed 9am-10am; 3rd Thu 9am-11am | ${FS}
Oxnard College pop-up emergency food pantry | 3250 South Rose Avenue | Oxnard | 93033 |  | Wed 2pm-3:30pm | ${FS}
Oxnard PAL | 350 South K St | Oxnard | 93030 | 805-983-7100 | 4th Fri 9am-11am | ${FS}
Palm Vista Housing | 801 South C Street | Oxnard | 93030 |  | 2nd Mon 1pm-2pm | ${FS}
Plaza Vista | 401 South C Street | Oxnard | 93030 |  | 2nd Mon 9:30am-10:30am | ${FS}
Rio Schools (Cortez St) | 3300 Cortez Street | Oxnard | 93036 |  | 1st, 3rd and 5th Tue 2:30pm-3:30pm | ${FS}
Salvation Army Oxnard | 622 W Wooley Rd | Oxnard | 93033 | 805-983-7100 | Tue 9am-11am; 2nd Wed 1:30pm-2:30pm | ${FS}
Shelter Care Resources at Calvary Chapel | 1925 Eastman Ave | Oxnard | 93030 | 805-407-8842 | Fri 5pm-6:30pm | ${FS}
South Oxnard Center | 200 E Bard Rd | Oxnard | 93033 | 805-983-7100 | 3rd Mon and 3rd Fri 9am-10:30am | ${FS}
St. John's Health Ministries at Christ The King | 535 Cooper Rd | Oxnard | 93030 | 805-988-2651 | Tue 9am-12:30pm; Thu 11:30am-2:30pm; 1st & 2nd Thu 9am-10am | ${FS}
SVDP / St. Anthony's Church | 2511 S C St | Oxnard | 93033 | 805-486-7302 | Tue 9am-11am | ${FS}
Sycamore Senior Village | 333 North F St | Oxnard | 93030 | 805-983-7100 | 2nd Tue 1pm-2pm | ${FS}
United Parents - Oxnard | 300 West 5th Street Ste A | Oxnard | 93030 | 805-384-1555 | Mon-Fri 1:30pm-7:30pm; Sat 9am-5:30pm | ${FS}
VC Believe Center | 850 Ivywood Drive | Oxnard | 93030 | 805-222-0422 | Fri 6pm-7pm | ${FS}
VC Believe Center at City View Church | 2311 Statham Blvd | Oxnard | 93033 | 805-222-0422 | Wed 6pm-7pm | ${FS}
VC Rescue Mission (meals) | 234 E. Sixth St | Oxnard | 93030 | 805-436-4602 | Mon-Fri 11am-11:30am and 5:30pm-6pm; Sat, Sun 12pm-12:30pm and 5:30pm-6pm | ${FS}
Westminster Free Clinic - Oxnard | 1800 South C Street | Oxnard | 93033 | 805-844-6641 | Wed 2:30pm-5:30pm | ${FS}
CEDC at Valle Naranjal | 4268 Center St | Piru | 93040 | 805-659-3598 | 1st Fri 11am-12pm; 2nd Mon 12pm-1pm | ${FS}
Piru Neighborhood Council at Corazon Cafe | 3945 Center Street | Piru | 93040 | 661-212-2776 | 4th Fri 12pm-2pm | ${FS}
San Salvador Mission | 4053 Center St | Piru | 93040 | 805-625-3273 | 3rd Wed 9:30am-11:30am | ${FS}
Beach Side Fellowship | 250 Market Street | Port Hueneme | 93041 | 805-874-1318 | 3rd Wed 9am-11am | ${FS}
Casa Pacifica Apartments | 703 Ventura Rd | Port Hueneme | 93041 | 805-983-7100 | 3rd Tue 11am-12pm | ${FS}
Evangelistic Baptist Church | 125 E Pearl St | Port Hueneme | 93041 | 805-983-7100 | 3rd Tue 9:30am-10:30am and 11am-1pm | ${FS}
First Church of Port Hueneme | 523 N. 5th Street | Port Hueneme | 93041 |  | 1st Fri 2pm-4pm | ${FS}
Fleet Reserve | 1183 N Ventura Rd | Port Hueneme | 93041 | 732-814-1044 | 3rd Sat 9am-12pm | ${FS}
Living Hope Church | 755 Bard Road | Port Hueneme | 93041 | 805-483-8610 | 2nd and 4th Sat 9:30am-11am | ${FS}
Porchlight Foundation at PV Mobile Home Park | 250 E. Pleasant Valley Road | Port Hueneme | 93041 | 619-820-3500 | Tue 3pm-5pm | ${FS}
Salvation Army at Mar Vista Apartments | 157 E. Scott St | Port Hueneme | 93041 | 805-986-6532 | 3rd Thu 10am-12pm | ${FS}
CEDC - The Santa Paulan Apartments | 115 N 4th St | Santa Paula | 93060 | 805-525-5804 | 3rd Tue 2:15pm-3:15pm | ${FS}
CEDC Rodney Fernandez Garden Apartments | 212 W Santa Barbara St | Santa Paula | 93060 | 805-933-7400 | 3rd Fri 11am-12pm | ${FS}
Centro Cristiano Emanuel | 505 W Harvard Blvd | Santa Paula | 93060 | 805-983-7100 | 1st Fri 1:30pm-2:30pm | ${FS}
Limoneira Ranch Visitor's Center (senior kits) | 1141 Cummings Road | Santa Paula | 93060 |  | 1st Thu 4pm-5pm | ${FS}
LUCHA - Poder Popular | 113 N. Mill Road | Santa Paula | 93060 | 805-625-1212 | Thu 2pm-4pm | ${FS}
Our Lady of Guadalupe - Santa Paula | 427 N. Oaks Street | Santa Paula | 93060 | 805-525-3716 | Mon 4pm-5pm | ${FS}
Santa Paula Four Square Church | 611 E. Main Street | Santa Paula | 93060 |  | Tue 5pm-6pm | ${FS}
Spirit of Santa Paula | 1498 Harvard Street | Santa Paula | 93060 | 805-229-7750 | Sat 2:30pm-3:30pm | ${FS}
Spirit of Santa Paula at 1st Presbyterian Church | 121 N. Davis St | Santa Paula | 93060 | 805-340-5025 | Wed 4:30pm-5:30pm | ${FS}
Boys & Girls Club - Simi Valley | 2850 Lemon Dr | Simi Valley | 93063 | 805-983-7100 | 2nd Thu 9:30am-11am | ${FS}
Centro Familiar Nueva Esperanza | 4680 Alamo Street | Simi Valley | 93063 | (805) 813-8751 | Fri 11am-12pm | ${FS}
Church of the Living Christ | 171 Royal Avenue | Simi Valley | 93065 |  | 4th Wed 11:30am-12:30pm | ${FS}
New Beginnings Christian Fellowship | 2816 N. Sycamore Dr | Simi Valley | 93065 | 805-522-3555 | 2nd & 4th Mon 4:30pm-6pm | ${FS}
New Heart Foursquare Church | 4200 Township Ave | Simi Valley | 93063 | 805-583-3433 | Sun 11:30am-12pm | ${FS}
Revelation Church | 580 E. Easy Street | Simi Valley | 93065 | 805-366-4825 | 3rd Sat 12pm-2pm | ${FS}
Salvation Army Simi Valley Care and Share | 1407 Los Angeles Ave Unit T | Simi Valley | 93065 | 805-527-1070 | Tue 10am-12pm; Thu 10am-12pm and 1pm-2pm | ${FS}
Samaritan Center Simi Valley | 280 Royal Ave | Simi Valley | 93065 | 805-579-9166 | Tue and Thu 11am-12pm | ${FS}
SEWA International (Free Clinic Simi Valley) | 2003 Royal Avenue | Simi Valley | 93065 | 805-328-4561 | Fri 2pm-4pm | ${FS}
Shepherd of the Valley | 4191 Cochran Ave | Simi Valley | 93063 | 805-526-7577 | Thu 2pm-6pm | ${FS}
Spirit Life Church | 1482 Sinaloa Road | Simi Valley | 93065 | 949-299-6601 | Last Thu 1pm-2pm | ${FS}
St. Peter Claver | 2380 Stow St | Simi Valley | 93063 | 805-526-6499 | 2nd and 4th Sat 10am-11am | ${FS}
Somis Pantry at Faith Baptist Church | 3300 West St | Somis | 93066 | 805-377-2270 | 2nd Tue 1pm-4pm | ${FS}
Adelante Comunidad Conejo at Conejo Elementary School | 280 N. Conejo School Drive | Thousand Oaks | 91362 |  | Select Sat 9:30am-11am | ${FS}
Adelante Comunidad Conejo at Shadow Apartments | 1949 Los Feliz Drive | Thousand Oaks | 91362 | 805-338-7066 | 2nd Fri 5pm-7pm | ${FS}
Christian Church of Thousand Oaks | 301 Avenida de las Flores | Thousand Oaks | 91360 | 805-492-2474 | 1st and 3rd Mon 4pm-6pm | ${FS}
Many Mansions at Shadow Hills | 227 E. Wilbur Road | Thousand Oaks | 91360 | 805-496-4948 | 2nd and 4th Wed 11:15am-12:30pm | ${FS}
Newbury Park First Christian Church | 801 Knollwood Dr | Thousand Oaks | 91320 | 805-498-2129 | Fri and Sat 9:15am-10am | ${FS}
Seventh Day Adventist Church Thousand Oaks | 480 W Gainsborough Rd | Thousand Oaks | 91360 | 805-551-7345 | Tue 1pm-2pm; 4th Tue 12:30pm-2pm | ${FS}
SVDP - St. Paschal Baylon | 155 E. Janss Rd | Thousand Oaks | 91360 | 805-496-0222 | Sat 9am-10:30am | ${FS}
United Methodist Church of Thousand Oaks | 1000 E. Janss Road | Thousand Oaks | 91360 |  | 1st, 3rd & 5th Fri 11:15am-12:15pm; Wed 3pm-6pm | ${FS}
Buenaventura Mobile Home Estates | 11405 Darling Rd | Ventura | 93004 |  | 3rd Mon 1:30pm-2:30pm | ${FS}
Catholic Charities Ventura | 303 N. Ventura Ave | Ventura | 93001 | 805-643-4694 | Tue 9:30am-11:30am; Thu 1pm-2pm; Fri 9am-11:30am | ${FS}
Family to Family (at Catholic Charities) | 303 N. Ventura Ave | Ventura | 93001 | (818) 216-0813 | Mon, Wed, Fri 11:30am-12:30pm; Sat, Sun 8am-9am | ${FS}
CEDC - Azahar Place Apartments | 11370 Mimosa St | Ventura | 93004 | 805-647-2700 | 2nd Wed 4pm-5pm | ${FS}
Church of Scientology of Ventura | 2151 Alessandro Avenue | Ventura | 93001 | (805) 585-4400 | 1st and 3rd Sat 10am-1pm | ${FS}
City Church California | 6360 Telephone Road | Ventura | 93004 | 805-676-1040 | 1st and 3rd Sat 10am-12pm | ${FS}
Community Bible Church | 5040 Telegraph Rd | Ventura | 93003 | 805-339-0019 | 2nd and 4th Sat 10am-12pm | ${FS}
Community Presbyterian Church | 1555 Poli St | Ventura | 93001 | 805-985-3917 | 5th Thu 9am-10am | ${FS}
Mission F.I.S.H. at Fellowship Hall | 660 N Ventura Ave | Ventura | 93001 | 805-646-1125 | Sat 1:30pm-3pm | ${FS}
Westpark Community Center (PAL) | 450 W Harrison Ave | Ventura | 93001 | 805-648-1895 | 3rd Wed 3:30pm-4:30pm | ${FS}
Sacred Heart Food Pantry at Cabrillo Village | 1515 S Saticoy Ave | Ventura | 93004 | 805-794-0046 | 2nd and 4th Wed 10am-12pm | ${FS}
Salvation Army Ventura (East End) | 650 S Petit Ave | Ventura | 93004 | 805-659-3598 | Wed 11am-1pm; 2nd and 4th Fri 11am-1pm; 1st Mon 9:30am-10:30am | ${FS}
Salvation Army Ventura at Valentine Rd | 5818 Valentine Road | Ventura | 93003 | 805-302-2249 | 1st Wed 9am-10am | ${FS}
Salvation Army Ventura at Westview Boys & Girls Club | 1187 Riverside St | Ventura | 93001 |  | 3rd Sat 10am-11am | ${FS}
Seaward Church | 365 S. Seaward Avenue | Ventura | 93003 | (805) 643-2273 | 2nd and 4th Sun 2pm-3pm | ${FS}
Temple Beth Torah | 7620 Foothill Rd | Ventura | 93004 | 805-647-4181 | Tue 9:30am-10:30am | ${FS}
The River Community | 859 E Santa Clara St | Ventura | 93001 | 805-648-7955 | Mon 11am-1pm | ${FS}
Two Trees Church of Christ | 767 N Ventura Ave | Ventura | 93001 | 805-667-8695 | 3rd Fri 11:30am-12:30pm | ${FS}
Willett Ranch Senior Apartments | 55 Willett Street | Ventura | 93001 |  | 2nd Thu 1:30pm-2:30pm | ${FS}
Calvary Community Church | 5495 Via Rocas | Westlake Village | 91362 | 818-575-2271 | Tue 9:30am-10:30am | ${FS}
`,
  },
  Yolo: {
    rows: `
ASUCD The Pantry - Memorial Union (students) |  | Davis | 95616 |  | Sat and Sun 12pm-2pm | https://yolofoodbank.org
St. Martin's Episcopal Church | 640 Hawthorne Ln | Davis | 95616 |  | Sat 11:30am-12:15pm | https://yolofoodbank.org
UC Davis Memorial Union distribution | 250 W Quad | Davis | 95616 | 530-752-2612 | Wed 1pm-3pm | https://yolofoodbank.org
Yolo Food Bank - Davis Distribution Site | 441 D Street | Davis | 95616 | 530-668-0690 | Sat 8:30am while supplies last | https://yolofoodbank.org
RISE Inc. - Esparto | 17317 Fremont St | Esparto | 95627 | 530-668-0690 | 1st & 3rd Thu 9:30am | https://yolofoodbank.org
Empower Yolo - Knights Landing (walk-up market) | 9586 Mill St | Knights Landing | 95645 | 530-668-0690 | Sat 7am-9:30am | https://yolofoodbank.org
City of West Sacramento City Hall parking lot (walk-up) | 1271 West Capitol Avenue | West Sacramento | 95691 | 530-668-0690 | Sat 8:30am while supplies last | https://yolofoodbank.org
Masjid Aisha (walk-up market) | 700 Glide Ave | West Sacramento | 95691 | 530-668-0690 | Tue 8:30am while supplies last | https://yolofoodbank.org
River City Food Bank - West Sacramento | 720 Roble Court | West Sacramento | 95691 | 916-371-2760 | Mon, Tue, Thu 10am-2pm | https://yolofoodbank.org
YCCA West Sacramento Family Resource Center | 1200 Anna Street | West Sacramento | 95605 | 530-668-0690 | Wed 1pm-3pm | https://yolofoodbank.org
Winters High School (Yolo Food Bank distribution) | 101 Grant Avenue | Winters | 95694 | 530-668-0690 | Sat 11am while supplies last | https://yolofoodbank.org
Woodland Volunteer Food Closet | 420 Grand Ave | Woodland | 95695 |  | Mon-Fri 3pm-4pm | https://yolofoodbank.org
Yolo Food Bank (Court St site) | 202 W Court St | Woodland | 95695 | 530-668-0690 | Tue 9am-1pm | https://yolofoodbank.org
`,
  },
  Yuba: {
    rows: `
St. John's Episcopal Church - Loaves and Britches Food Pantry | 800 D St | Marysville | 95901 | (530) 741-1165 | Thu 9:30am-11:30am |
Foothill Intermediate School | 5351 Fruitland Rd | Loma Rica | 95901 |  | Mon-Thu 9:30am-10:15am |
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
      source: 'Hand-collected list (FOOD Share of Ventura County, Yolo Food Bank, Feed America). Schedules parsed via LA clause parser.',
      note: 'Ventura/Yuba net-new; Yolo = additions to existing shell (prepare with --existing + real --shell-id).',
    },
    sites,
  };
  writeFileSync(`./b13-${county}-raw.json`, JSON.stringify(out, null, 2));
  console.log(`\n=== ${county}: ${sites.length} sites | ${withEvents} with events | ${sites.length - withEvents} deferred | ${flags.filter((f) => f.includes('no street')).length} city-level ===`);
}
