/*
 * build-alameda-raw.mjs
 * Converts the hand-collected Alameda County food-distribution list (tab/space
 * delimited, pasted below) into AlamedaAdditions-raw.json in the sites[] shape
 * that prepare-food-additions.mjs consumes (structured weekly/monthly schedules).
 *
 * Schedule free-text is parsed with the SAME unified clause parser used by
 * prepare-food-data-la.mjs (ranges, multi-block times, word/digit ordinals,
 * day-range expansion, meridiem inference). Single start-times with no end
 * (e.g. "Thu 1pm" meals) carry no time range -> site defers, matching the LA
 * pipeline's behavior. Parentheticals are pulled out into eligibility/notes so
 * they don't confuse schedule parsing.
 */
import { writeFileSync } from 'node:fs';

/* ----- columns: Name | Street | City | ZIP | Phone | Schedule | URL | Source ----- */
const DATA = `
Alameda Food Bank	677 West Ranger Ave	Alameda	94501	(510) 523-5850	Mon 10am-4pm; Wed 10am-7pm; Fri 10am-4pm (must live, work or study in Alameda)	https://www.alamedafoodbank.org/get-food/	ACCFB FoodNow
Berkeley Food Network	1925 9th Street	Berkeley	94710	(510) 616-5383	Mon & Wed 10am-2pm, 5-7pm; Tue & Thu 10am-2pm; 1st & 3rd Sat 10am-12pm	https://www.berkeleyfoodnetwork.org/	City of Oakland
Berkeley Food Pantry	1600 Sacramento St	Berkeley	94702		Mon, Wed, Fri 2-4pm		PLTS list (undated)
Berkeley Youth Alternatives	1255 Allston Way	Berkeley	94702		2nd & 4th Tue 11am-1pm and 4-6pm		ACCFB FoodNow
City Team Ministries - First Presbyterian Berkeley	2407 Dana St	Berkeley	94704		1st & 3rd Sat 10-11:15am (register at first visit)		ACCFB FoodNow
Dorothy Day House	1931 Center St	Berkeley	94704		Mon-Sat breakfast 7-8am		PLTS list (undated)
Liberty Hill Baptist Church	997 University Ave	Berkeley	94710	(510) 848-3855	Thu 12-2pm		ACCFB FoodNow
M.A. Center Mother's Kitchen	1802 Fairview St	Berkeley	94703		2nd & 4th Tue 12-1pm		ACCFB FoodNow
McGee Avenue Baptist Church	1640 Stuart St	Berkeley	94703		Mon, Wed, Fri 12-1pm (meals)		ACCFB FoodNow
Multicultural Institute Inc	1920 7th Street	Berkeley	94710		Wed 9:30-10:30am		ACCFB FoodNow
South Berkeley Community Church	1802 Fairview St	Berkeley	94703		Thu 12pm (meal)		PLTS list (undated)
St. Marks Episcopal Church	2300 Bancroft Way	Berkeley	94704	(925) 818-3600	Mon 6-9pm dinner (youth 13-25); 3rd Sat 5pm meal		PLTS list (undated)
St. Paul AME Church	2024 Ashby Avenue	Berkeley	94703		Tue 11:30am (meal)		PLTS list (undated)
The Church By The Side Of The Road	2108 Russell Street	Berkeley	94705		2nd Sun 1pm (meal)		PLTS list (undated)
East Bay Food Not Bombs	Multiple sites (Telegraph & Haste; People's Park; 8th & Harrison)	Berkeley/Oakland			Daily around 3pm, site varies	https://eastbayfoodnotbombs.org/	City of Oakland
Faith Lutheran Church of Castro Valley Food Pantry	20080 Redwood Rd	Castro Valley	94546	(510) 581-0818	1st & 3rd Thu 6:30-7:30pm		ACCFB FoodNow
Redwood Chapel Community Church	19300 Redwood Rd	Castro Valley	94546		3rd Sat 9-10:30am		ACCFB FoodNow
John Knox Presbyterian Church / Children's Emergency Food Bank	7421 Amarillo Rd	Dublin	94568	(925) 828-5363	By appointment		AlCo District 1
St. Vincent de Paul (St. Raymond Catholic Church)	11555 Shannon Ave	Dublin	94568	(925) 574-7456	3rd Sat 8-11am		AlCo District 1
Emeryville Citizens Assistance Program (ECAP)	3610 San Pablo Ave	Emeryville	94608	(510) 499-1263	Mon-Sat 12-4pm	https://www.ecapprogram.org/	ACCFB FoodNow
Age Well Center at Lake Elizabeth	40086 Paseo Padre Pkwy	Fremont	94538	(510) 793-4583	2nd & 4th Thu 10:15am (ages 55+)		Senate District 10
Age Well Center at South Fremont	47111 Mission Falls Court	Fremont	94539		1st & 3rd Thu 10:15am (ages 55+)		Senate District 10
Centerville Free Dining Room	4360 Central Ave	Fremont	94536		Tue & Thu 4-5:45pm		Senate District 10
FACE (Fremont Adult and Continuing Education Center)	4700 Calaveras Ave	Fremont	94538		1st & 3rd Tue 11:30am		Senate District 10
Fremont Family Resource Center	39155 Liberty St	Fremont	94538		1st & 3rd Wed 10:30-11:30am (Tri-City Volunteers mobile pantry)		Senate District 10
SVDP - Mission San Jose Fremont	43148 Mission Blvd	Fremont	94539		Tue & Thu 1-2pm		Senate District 10
Tri-City Volunteers Food Bank	37350 Joseph St	Fremont	94536	(510) 793-4583	Mon-Thu 10am-2pm; Fri 10-11:30am (Fri drive-through, existing clients only)	https://tcvfoodbank.org/food/	ACCFB FoodNow
All Saints Catholic Church	22824 2nd St	Hayward	94541	(510) 581-2570	Sat 10-11:30am		Senate District 10
City Team Ministries - Iglesia Hebreos	1497 E Street	Hayward	94541		1st & 3rd Fri 5-6pm		ACCFB FoodNow
City Team Ministries - Luz de Vale	2751 Sleepy Hollow Ave	Hayward	94545		4th Wed 4-5pm		ACCFB FoodNow
Community of Grace Pantry	380 Elmhurst St	Hayward	94544	(510) 783-8062	Wed 11am-12pm (except 5th Wed)		Senate District 10
Eden United Church of Christ	21455 Birch St	Hayward	94541	(510) 582-9533	2nd & 4th Wed 1-4pm		ACCFB FoodNow
Hayward Promise Neighborhood (hot meals)	680 W. Tennyson Rd	Hayward	94544		Mon & Thu 2-4pm		Senate District 10
Hayward Seventh Day Adventist Church	26400 Gading Rd	Hayward	94544		Sun 9:30-10:30am		Senate District 10
Hayward Spanish SDA Church	22117 Meekland Ave	Hayward	94541		Wed 8am-1pm (Hayward, San Lorenzo, San Leandro residents)		ACCFB FoodNow
Hillside Alliance Church	944 Central Blvd	Hayward	94542		4th Sat 10am-12pm		Senate District 10
Hope 4 the Heart	22035 Meekland Ave	Hayward	94541	(510) 581-4673	Tue 1:30-2:30pm; 3rd Sat 8-11am (Hayward, San Lorenzo, San Leandro residents)		ACCFB FoodNow
Longwood Elementary	850 Longwood Ave	Hayward	94541		3rd Wed 1:30-2:30pm		ACCFB FoodNow
New Life Christian Church	1265 B St	Hayward	94541	(510) 889-1304	Thu 1pm		Senate District 10
Salvation Army - Hayward	430 A Street	Hayward	94541	(510) 581-6444	Mon-Thu 10am-2pm (sack lunch and pantry)		Hayward Day by Day 2024
San Lorenzo Family Help Center (Hayward site)	20960 Corsair Blvd	Hayward	94545		Mon, Fri, Sat 10:30am-3pm; some Wed 10:30am-2pm; by appointment only		ACCFB FoodNow
South Hayward Parish Food Pantry	27287 Patrick Ave	Hayward	94544	(510) 785-3663	Mon 2-5pm; Tue/Thu/Fri 1-4pm	https://www.southhaywardparish.org/food-pantry	City of Oakland
The Peace Haven	1063 A St	Hayward	94541	(408) 680-6577	Tue & Fri 9-11am		Senate District 10
United Smith Memorial CME Church	28105 Mission Blvd	Hayward	94544		2nd & 4th Sat 10am-12pm		ACCFB FoodNow
City Team Ministries - Granada Church	945 Concannon Blvd	Livermore	94550		2nd & 4th Sat 2-3pm		ACCFB FoodNow
Cornerstone Fellowship	348 N Canyons Pkwy	Livermore	94551	(925) 447-3465	Fri 9-11am		AlCo District 1
Culinary Angels	164 N L Street	Livermore	94550	(925) 243-1211	Wed 3:15-4:30pm (delivery on request)		AlCo District 1
Discovery Church of the Nazarene Community Breakfast	5862 Las Positas Road	Livermore	94551	(925) 449-5256	Sun 9am		AlCo District 1
Interfaith Sharing Food Pantry (St. Bartholomew's Church)	678 Enos Way	Livermore	94551	(925) 447-3289	Thu & Sat 8-9am		ACCFB FoodNow
Open Heart Kitchen	450 N. Livermore Ave	Livermore	94551	(925) 580-1616	Mon-Fri 12-5pm		ACCFB FoodNow
St. Matthew's Baptist Church Feeding Ministry	1886 College Ave	Livermore	94550	(925) 443-3686	Sat 11am-1pm		AlCo District 1
St. Vincent de Paul (St. Michael Catholic Church)	458 Maple St	Livermore	94550	(925) 758-0126	Mon, Tue, Thu 7-8pm; Wed 4-5pm; Sat mornings		AlCo District 1
The Market at Las Positas College	3000 Campus Hill Dr (1600 Building Courtyard)	Livermore	94551	(925) 424-1000	4th Tue 11am-3pm		AlCo District 1
The Well Community Outreach	2333 Nissen Dr	Livermore	94551	(925) 479-1414	Fri 10-11:30am and 1-2:30pm		ACCFB FoodNow
Tri-Valley Haven Food Pantry	150 N L Street	Livermore	94550	(925) 449-1664	Mon-Thu 1-5pm; Fri-Sat 12-4pm		ACCFB FoodNow
Tri-Valley Seek and Save	348 N Canyons Pkwy	Livermore	94551	(925) 895-1041	Sat 9-10:30am		AlCo District 1
League of Volunteers Emergency Food Bank	8440 Central Ave #2C	Newark	94560	(510) 793-5683	1st & 3rd Thu 10-11am (source lists 38325 Cedar Blvd)		Senate District 10
Salvation Army - Tri Cities	36700 Newark Blvd	Newark	94560		Wed & Fri 7:30-9:30am (Fremont, Union City, Newark residents)		ACCFB FoodNow
Schilling Elementary School	36901 Spruce St	Newark	94560		1st & 3rd Wed 11am		Senate District 10
Solid Rock COGIC	5970 Thornton Ave	Newark	94560		1st & 3rd Wed 10am-12pm		ACCFB FoodNow
Tri-City Volunteers Mobile Pantry (Silliman Activity Center)	6800 Mowry Ave	Newark	94560	(510) 861-1829	2nd & 4th Fri 10:30am		Senate District 10
Viola Blythe Community Service Center	37365 Ash Street	Newark	94560	(510) 794-3437	Mon-Wed 10:30am-2:30pm (Fremont, Newark, Union City residents)		ACCFB FoodNow
13th Avenue Church of Christ	1300 E. 24th Street	Oakland	94606	(510) 532-9434	Fri (call for times)		City of Oakland
Allen Temple Baptist Church	1350 86th Ave	Oakland	94621		1st & 3rd Tue 10am-12pm at 86th Ave gate; 4th Mon 10am-12pm at 8501 International Blvd		ACCFB FoodNow
CAA - Agnes Memorial	2372 International Blvd	Oakland	94601		3rd Fri 8-10am		ACCFB FoodNow
Center of Hope	8425 MacArthur Blvd	Oakland	94605	(510) 304-8480	Fri 11am-1pm		ACCFB FoodNow
Christian Tabernacle Church	9330 Walnut St	Oakland	94603		Thu 5:30-6:30pm		ACCFB FoodNow
City Team Ministries - 50th Ave	1006 50th Ave	Oakland	94601		4th Tue 12-2pm		ACCFB FoodNow
City Team Ministries - All Nations	5815 San Pablo Ave	Oakland			1st & 3rd Tue 1-2pm (bring bags and ID)		ACCFB FoodNow
City Team Ministries - Fruitvale	2744 East 11th St	Oakland	94601		1st & 3rd Thu 6-7pm		ACCFB FoodNow
City Team Ministries - New Hope Baptist	3624 Market Street	Oakland	94608		2nd & 4th Thu 2-3pm		ACCFB FoodNow
City Team Ministries - New Testament	1901 62nd Ave	Oakland			1st & 3rd Thu 11am-12pm		ACCFB FoodNow
City Team Ministries - St. Andrews MBC	2624 West St	Oakland	94612		2nd & 4th Thu 12-1pm (bring bags and ID)		ACCFB FoodNow
Community Kitchens	2270 Telegraph Ave	Oakland	94612		Sun-Thu 11am-2pm	https://www.ckoakland.org/	City of Oakland
Downs Memorial United Methodist Church	6026 Idaho St	Oakland	94608		Mon & Tue 9:30-10:30am; Wed 10:30-11:30am		ACCFB FoodNow
Downtown Oakland Senior Center - Mercy Brown Bag / Spectrum Senior Meals	200 Grand Ave	Oakland	94610	(510) 269-9640	3rd Mon 10:30-11:30am; meals Mon-Thu 12-12:30pm (seniors 60+)		City of Oakland
East Oakland Multi-Purpose Senior Center	9255 Edes Ave	Oakland	94603	(510) 615-5731	Wed 8-9am		ACCFB FoodNow
East Oakland Switchboard	1909 73rd Ave	Oakland	94621	(510) 569-6369	Mon-Fri 10am-4pm		ACCFB FoodNow
Evergreen Missionary Baptist Church	408 W. MacArthur Blvd	Oakland	94609		2nd & 4th Wed 1-4pm; 3rd Sat 12-3pm		ACCFB FoodNow
Feed My Sheep	8829 Plymouth Street	Oakland	94621		3rd Sat 12-2pm (box lunches)		PLTS list (undated)
Greater Grace Community Services	10701 International Blvd	Oakland	94603		Wed & Fri 11am-4pm		ACCFB FoodNow
Homies Empowerment FREEdom Store	7631 MacArthur Blvd	Oakland	94605	(510) 542-9993	Tue 10am-4pm	https://www.homiesempowerment.com/freedom-store.html	City of Oakland
HOPE Collaborative	3427 San Pablo Ave	Oakland	94608		1st & 3rd Sun 2:30-5pm	https://www.hopecollaborative.net/	City of Oakland
Israelite Missionary Baptist Church	2043 E 21st St	Oakland	94606		3rd Sat 10am-12pm		ACCFB FoodNow
Lake Merritt United Methodist Church	1330 Lakeshore Ave	Oakland	94606		4th Sat 8-10am		ACCFB FoodNow
Love Thy Neighbor Ministries	5782 Foothill Blvd	Oakland	94605		Tue 11am-1pm; 3rd Sat 12-2pm		ACCFB FoodNow
Market Street SDA Church	3415 Market Street	Oakland	94608		3rd Tue 1-3pm (ACCFB lists address as 900 34th St)		ACCFB FoodNow
Mercy Brown Bag Program - Oakland	3431 Foothill Blvd	Oakland	94601	(510) 534-8540	Mon-Fri 10am-12:30pm and 1-2pm (seniors 60+)		ACCFB FoodNow
Mingleton Temple COGIC	1222 Market Street	Oakland	94607		1st & 3rd Sat 9-11am		ACCFB FoodNow
Mt. Zion Missionary Baptist Church	1203 Willow St	Oakland	94607		Thu 12-1pm		ACCFB FoodNow
North Oakland Senior Center - Mercy Brown Bag	5714 Martin Luther King Jr. Way	Oakland	94609	(510) 269-9640	2nd & 4th Thu 9-10am (seniors 60+)		City of Oakland
Oakland Catholic Worker	4848 International Blvd	Oakland	94601	(510) 533-7375	Thu 7-11am		ACCFB FoodNow
Paradise Baptist Church	9670 Empire Rd	Oakland	94603		Sat 9-11am		ACCFB FoodNow
Park Boulevard Presbyterian Church	4101 Park Blvd	Oakland	94602	(510) 530-5311	2nd Wed 5-6pm (City Team distribution)		ACCFB FoodNow
Parks Chapel AME Church	476 34th Street	Oakland	94609		3rd Tue 10am-12pm		ACCFB FoodNow
Restoration Church of God	2101 47th Ave	Oakland	94601		Some Sat 10am-12:30pm		ACCFB FoodNow
Roots Community Health Center	9925 International Blvd, Ste 10	Oakland	94603		Wed 12-4pm; 1st & 3rd Fri 2-4pm		ACCFB FoodNow
Shiloh Church	3295 School St	Oakland	94602		Wed 10-11:30am (walk-up produce)		ACCFB FoodNow
Shiloh Mercy House	3300 School St	Oakland	94602		Mon, Tue, Thu, Fri 10am-1:45pm; Wed 1-2:45pm (2 pickups per month)		ACCFB FoodNow
St. Lawrence O'Toole - Food Distribution Center	3725 High St	Oakland	94619		4th Sat 10am-12pm (neighborhood residents only)		ACCFB FoodNow
St. Mary's Center	925 Brockhurst St	Oakland	94608		Mon-Fri 12-2pm		ACCFB FoodNow
St. Vincent de Paul Dining Room	675 23rd Street	Oakland	94612	(510) 638-7600	Tue-Sat 10:45am-12:45pm	https://www.svdp-alameda.org/get-help.html	ACCFB FoodNow
Tabernacle Missionary Baptist Church	10115 Edes Ave	Oakland	94603	(510) 569-4333	2nd-5th Tue 12:30-2pm (hot meals and groceries)		ACCFB FoodNow
Telegraph Ministry Center	5316 Telegraph Ave	Oakland	94609	(510) 961-4385	Wed 10am-1:30pm and 5-7pm; Fri 9:30-11:30am (once a week)	https://tmcoakland.org/	ACCFB FoodNow
The East Oakland Collective	7800 MacArthur Blvd	Oakland	94605	(510) 990-0775	Mon, Wed, Fri hot meals 12pm; Tue, Thu groceries and hot meals 11am	https://www.eastoaklandcollective.org/food-and-supply-distribution.html	City of Oakland
Town Care Cafe	Frank H. Ogawa Plaza kiosk	Oakland	94612		Thu 8am-1pm		City of Oakland
CityServe of the Tri-Valley	5353 Sunol Blvd	Pleasanton	94566	(925) 222-2273	Free community lunch Tue 11am-12pm	https://www.cityservetrivalley.org/	City of Oakland
All Saints Episcopal Church	911 Dowling Blvd	San Leandro	94577	(510) 410-3743	1st Sat 10am-12:30pm		ACCFB FoodNow
April Showers	951 MacArthur Blvd	San Leandro	94577		1st, 3rd, 5th Sun 1-3:30pm (ACCFB note says now at 2200 San Leandro Blvd)		SLUSD list (2020)
April Showers - First United Methodist Church	1600 Bancroft Ave	San Leandro	94577		Mon-Fri 11am (meals to go)		SLUSD list (2020)
Brothers and Sisters In Christ (BASIC) - San Leandro	1221 Pacific Avenue	San Leandro	94577	(510) 325-2756	2nd & 4th Sat 11am-1pm (ACCFB lists this address as Delight in the Word Bible Fellowship)		ACCFB FoodNow
Davis Street Family Resource Center	3081 Teagarden St	San Leandro	94577	(510) 346-4620	Mon-Fri 10am-5pm (San Leandro, San Lorenzo, Castro Valley, Ashland, Cherryland residents)		ACCFB FoodNow
Halcyon Baptist Church	2860 Halcyon Dr	San Leandro	94578	(510) 304-6441	3rd Wed 8am-12pm; some Tue 10am-12pm (one visit per month)		ACCFB FoodNow
San Leandro Community Food Pantry	14235 Bancroft Ave	San Leandro	94578	(510) 357-4130	Thu 6-8pm	https://slcfp.org	ACCFB FoodNow
SLUSD Mobile Pantry @ Adult School	1448 Williams St	San Leandro	94577	(510) 667-3500	1st Fri 1-3pm		SLUSD list (2020)
Spectrum Community Services	13909 E 14th St	San Leandro	94578	(510) 534-8540	Weekdays 12-1pm meals to go (call ahead); Mercy Brown Bag 2nd & 4th Mon 10am-12pm		SLUSD list (2020)
Centro de Servicios Resource Center	525 H St	Union City	94587	(510) 489-4100	Mon, Wed-Fri 9am-4pm; Tue 10am-12pm and 1-4pm (ACCFB lists 33750 6th St)	https://centrouc.org/services/food-distribution/	ACCFB FoodNow
Los Robles Apartments	32300 Almaden Blvd	Union City	94587	(510) 429-0119	Tue & Thu 11am-12pm		Senate District 10
Our Lady of the Rosary Church	703 C St	Union City	94587	(510) 471-2609	Fri 6-7pm		Senate District 10
Ruggieri Senior Center	33997 Alvarado-Niles Rd	Union City	94587	(510) 793-4583	2nd & 4th Wed 1:30pm (Tri-City Volunteers mobile pantry)		Senate District 10
St. Anne Church	32223 Cabello Street	Union City	94587		3rd Sat 9-11am		Senate District 10
Union City Family Center	725 Whipple Rd	Union City	94587	(510) 476-2770	Mon-Fri 8am-4:30pm	https://www.unioncityfamilycenter.org/	City of Oakland
`;

/* ============ LA unified clause parser (lifted from prepare-food-data-la.mjs) ============ */
const DART_ABBR = { 1: 'Mon', 2: 'Tue', 3: 'Wed', 4: 'Thu', 5: 'Fri', 6: 'Sat', 7: 'Sun' };
const ORD_LABEL = { 1: '1st', 2: '2nd', 3: '3rd', 4: '4th', 5: '5th', '-1': 'last' };
const ORD_WORD = { first: 1, second: 2, third: 3, fourth: 4, fifth: 5, last: -1 };
const ORD_DIGIT = { '1st': 1, '2nd': 2, '3rd': 3, '4th': 4, '5th': 5 };

const TIME_RANGE_RE = /(\d{1,2})(?::(\d{2}))?\s*(a\.?m\.?|p\.?m\.?)?\s*(?:-|–|—|to)\s*(\d{1,2})(?::(\d{2}))?\s*(a\.?m\.?|p\.?m\.?)?/gi;
const normMer = (m) => (!m ? null : /p/i.test(m) ? 'PM' : 'AM');
function to24(h, min, mer) { h = Number(h); min = Number(min || 0); if (mer === 'PM' && h !== 12) h += 12; if (mer === 'AM' && h === 12) h = 0; return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`; }
function parseTimeRangeAt(m) {
  let sMer = normMer(m[3]), eMer = normMer(m[6]);
  const sH = Number(m[1]), eH = Number(m[4]);
  if (!eMer && sMer) eMer = sMer;
  if (!sMer && eMer) { sMer = eMer; const o = (sMer === 'PM' && sH !== 12) ? sH + 12 : (sMer === 'AM' && sH === 12 ? 0 : sH); const c = (eMer === 'PM' && eH !== 12) ? eH + 12 : (eMer === 'AM' && eH === 12 ? 0 : eH); if (o >= c) sMer = 'AM'; }
  if (!sMer && !eMer) { sMer = 'AM'; eMer = 'PM'; }
  return { open: to24(m[1], m[2], sMer), close: to24(m[4], m[5], eMer) };
}
const DAY_TOKEN = /\b(sun(?:day)?|mon(?:day)?|tues?(?:day)?|wed(?:nesday|s)?|thur?s?(?:day)?|fri(?:day)?|sat(?:urday)?)s?\.?(?![A-Za-z])/gi;
function dayToDart(tok) { const t = tok.toLowerCase().replace(/s?\.?$/, ''); if (t.startsWith('sun')) return 7; if (t.startsWith('mon')) return 1; if (t.startsWith('tue')) return 2; if (t.startsWith('wed')) return 3; if (t.startsWith('thu')) return 4; if (t.startsWith('fri')) return 5; if (t.startsWith('sat')) return 6; return null; }
const ORD_TOKEN = /\b(1st|2nd|3rd|4th|5th|first|second|third|fourth|fifth|last)\b/gi;
const ordVal = (tok) => { const t = tok.toLowerCase(); return ORD_DIGIT[t] ?? ORD_WORD[t] ?? null; };

function parseClauses(text) {
  const toks = [];
  let m;
  ORD_TOKEN.lastIndex = 0; while ((m = ORD_TOKEN.exec(text)) !== null) toks.push({ t: 'ord', i: m.index, end: m.index + m[0].length, v: ordVal(m[1]) });
  DAY_TOKEN.lastIndex = 0; while ((m = DAY_TOKEN.exec(text)) !== null) { const d = dayToDart(m[0]); if (d) toks.push({ t: 'day', i: m.index, end: m.index + m[0].length, v: d }); }
  TIME_RANGE_RE.lastIndex = 0; while ((m = TIME_RANGE_RE.exec(text)) !== null) toks.push({ t: 'time', i: m.index, end: m.index + m[0].length, v: parseTimeRangeAt(m) });
  toks.sort((a, b) => a.i - b.i);
  const clauses = [];
  let cur = null, prev = null;
  const startClause = () => { cur = { ords: [], days: [], times: [], seq: [] }; clauses.push(cur); };
  for (const tk of toks) {
    if (tk.t === 'ord' || tk.t === 'day') {
      if (!cur || (prev && prev.t === 'time')) startClause();
      if (tk.t === 'ord') { cur.ords.push(tk.v); cur.seq.push({ t: 'ord', v: tk.v }); }
      else if (prev && prev.t === 'day' && /[-–—]|through|thru/i.test(text.slice(prev.end, tk.i))) {
        for (let d = prev.v; ; d = (d % 7) + 1) { if (!cur.days.includes(d)) cur.days.push(d); cur.seq.push({ t: 'day', v: d }); if (d === tk.v) break; }
      } else { cur.days.push(tk.v); cur.seq.push({ t: 'day', v: tk.v }); }
    } else { if (!cur) startClause(); cur.times.push(tk.v); }
    prev = tk;
  }
  return clauses.filter((c) => c.times.length && (c.days.length || c.ords.length));
}
function nthPatterns(seq) {
  const patterns = [];
  let ords = [], days = [], sawDay = false;
  const flush = () => { if (ords.length && days.length) for (const d of days) for (const n of ords) patterns.push({ n, dayOfWeek: d }); ords = []; days = []; sawDay = false; };
  for (const s of seq) { if (s.t === 'ord') { if (sawDay) flush(); ords.push(s.v); } else { days.push(s.v); sawDay = true; } }
  flush();
  const seen = new Set();
  return patterns.filter((p) => { const k = `${p.n}:${p.dayOfWeek}`; if (seen.has(k)) return false; seen.add(k); return true; });
}

/* ============ free-text schedule -> structured schedules[] ============ */
const ELIG_RE = /resident|\blive\b|\bwork\b|study|\bage|senior|youth|only\b|visit|per month|register|appointment|\bID\b|client|60\+|55\+|13-25/i;
function toSchedules(rawSched) {
  const parens = [];
  const stripped = rawSched.replace(/\(([^)]*)\)/g, (_, g) => { parens.push(g.trim()); return ' '; }).replace(/\s+/g, ' ').trim();
  const eligibility = parens.filter((p) => ELIG_RE.test(p)).join('; ');
  const note = parens.filter((p) => !ELIG_RE.test(p)).join('; ');

  const schedules = [];
  for (const c of parseClauses(stripped)) {
    if (c.ords.length && c.days.length) {
      const pats = nthPatterns(c.seq).map((p) => `${ORD_LABEL[p.n]} ${DART_ABBR[p.dayOfWeek]}`);
      const tm = c.times[0];
      if (pats.length) schedules.push({ freq: 'monthly', patterns: pats, open: tm.open, close: tm.close });
    } else if (c.days.length) {
      const days = [...new Set(c.days)].sort((a, b) => a - b).map((d) => DART_ABBR[d]);
      for (const tm of c.times) schedules.push({ freq: 'weekly', days, open: tm.open, close: tm.close });
    }
  }
  return { schedules, eligibility, note };
}

/* ============ parse the pasted rows ============ */
const PHONE_RE = /^\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}$/;
// Genuinely-different orgs that share a street address with another listed site
// (same street#+ZIP). Flagged so prepare-food-additions keeps both pins.
const COLOCATED = new Set(['South Berkeley Community Church', 'Tri-Valley Seek and Save']);
const sites = [];
const skipped = [];
for (const line of DATA.split('\n').map((l) => l.trimEnd())) {
  if (!line.trim()) continue;
  const f = line.split('\t').map((s) => s.trim());
  // tolerate space-delimited paste too
  const fields = f.length > 1 ? f : line.split(/\s{2,}/).map((s) => s.trim());
  const [name, street, city] = fields;
  const rest = fields.slice(3).filter((x) => x !== undefined);
  // source is always last; drop it
  if (rest.length) rest.pop();
  let website = '';
  if (rest.length && /^https?:\/\//i.test(rest[rest.length - 1])) website = rest.pop();
  let zip = '';
  if (rest.length && /^\d{5}$/.test(rest[0])) zip = rest.shift();
  let phone = '';
  if (rest.length && PHONE_RE.test(rest[0])) phone = rest.shift();
  const rawSched = rest.join(' ').trim();

  const hasStreetNo = /^\d+\s+\S/.test(street || '');
  const { schedules, eligibility, note } = toSchedules(rawSched);
  const address = `${street}, ${city}, CA${zip ? ' ' + zip : ''}`;

  const site = {
    name, org: name, address, phone, eligibility,
    website, category: 'food-assistance', confidence: hasStreetNo ? 0.85 : 0.6,
    note: note || rawSched, schedules,
    ...(COLOCATED.has(name) ? { allowColocated: true } : {}),
  };
  sites.push(site);
  if (!schedules.length) skipped.push(`${name} — no parseable time range -> deferred ("${rawSched}")`);
  if (!hasStreetNo) skipped.push(`${name} — address has no street number, geocode may fail ("${street}")`);
}

const withEvents = sites.filter((s) => s.schedules.length).length;
const out = {
  _meta: {
    topic: 'Alameda County food distributions',
    generated: '2026-10-11',
    source: 'Hand-collected list (ACCFB FoodNow, City of Oakland, AlCo/Senate districts, SLUSD, PLTS). Schedules parsed via LA clause parser. lat/lng omitted (geocoded downstream).',
    note: 'Drop-in raw for prepare-food-additions.mjs (reads .sites[]). Sites without a parseable time range route to _deferred.',
  },
  sites,
};
writeFileSync('./AlamedaAdditions-raw.json', JSON.stringify(out, null, 2));
console.log(`sites parsed: ${sites.length} | will generate events: ${withEvents} | deferred/flagged: ${sites.length - withEvents}`);
console.log('\n--- review flags ---\n' + skipped.join('\n'));
