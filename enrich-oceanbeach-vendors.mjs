#!/usr/bin/env node
/**
 * enrich-oceanbeach-vendors.mjs — fill the blank enrichment fields on
 * OceanBeachVendors.json from a 2026-09-14 web-research pass (5 parallel agents,
 * each field confirmed against the business's official site / reputable listing).
 *
 * Only touches category/tagline/description/website/phone/email/instagram/
 * facebook/tiktok/hours/verified. Leaves slug/name/address/lat/lng/neighborhood/
 * events/logoUrl untouched. Idempotent: re-run overwrites the same fields.
 *
 * Usage: node enrich-oceanbeach-vendors.mjs   (rewrites OceanBeachVendors.json in place)
 */
import { readFileSync, writeFileSync } from 'node:fs';

const FILE = './OceanBeachVendors.json';

// slug -> researched fields. Blank string = not publicly confirmed, left empty.
const E = {
  'winstons-beach-club': {
    category: 'Live Music Club & Bar',
    tagline: "Serving San Diego's finest live music since 1986",
    description: "Winstons Beach Club is an iconic Ocean Beach live music venue that has hosted local and touring bands nightly since 1986. The venue features a full bar with craft beer, plus open mic nights, comedy shows, and trivia. It's known for the longest-running musical residency in San Diego and has hosted acts like Slightly Stoopid and Steel Pulse.",
    website: 'https://winstonsob.com/', phone: '(619) 222-6822', email: '',
    instagram: '@winstonsob', facebook: 'WinstonsOB', tiktok: '',
    hours: 'Mon-Fri 7pm-2am, Sat-Sun 3pm-2am', verified: true,
  },
  'the-holding-company': {
    category: 'Bar, Restaurant & Live Music',
    tagline: 'Holding on to good times',
    description: 'The Holding Company is a three-story restaurant, bar, and live music venue in Ocean Beach with the best rooftop ocean views in the neighborhood. It serves Asian fusion cuisine and craft cocktails alongside live music seven nights a week, including Karaoke Mondays and Reggae Tuesdays. Open since 2017, it hosts national touring acts and local favorites.',
    website: 'https://theholdingcompanyob.com/', phone: '(619) 341-5898', email: 'info@theholdingcompanyob.com',
    instagram: '@thc1502', facebook: 'https://www.facebook.com/thc1502', tiktok: '',
    hours: 'Mon-Fri 4pm-2am, Sat-Sun 12pm-2am', verified: true,
  },
  'northside-tavern': {
    category: 'Sports Bar & Live Music',
    tagline: "Ocean Beach's sports bar that remembers it's also a restaurant",
    description: 'Northside Tavern is an Ocean Beach sports bar and restaurant serving a Mexican-inspired bar menu of tacos, birria, carnitas, and award-winning wings. Rebranded from Mother’s Saloon in 2020, it features a dog-friendly patio, televised games, shuffleboard, and live entertainment including Karaoke Night on Thursdays. Happy hour runs Monday through Friday, 4-7pm.',
    website: 'https://northsidetavernob.com/', phone: '(619) 228-9980', email: 'info@jtsob.com',
    instagram: '@northsidetavernob', facebook: 'https://www.facebook.com/northsidetavernob/', tiktok: '',
    hours: 'Daily 9am-2am', verified: true,
  },
  'the-harp': {
    category: 'Irish Pub & Live Music',
    tagline: 'A friendly Irish pub & grill in the heart of Ocean Beach',
    description: "The Harp is a friendly Irish pub and grill in Ocean Beach offering award-winning food, a full bar, and a large craft beer selection. It's a go-to spot for sports fans, showing soccer, rugby, MLB, NCAA football, and NFL, and features live music and a dog-friendly patio. Purchased in March 2024 by local residents passionate about the community.",
    website: 'https://theharpoceanbeach.com/', phone: '(619) 222-0168', email: 'theharpoceanbeach@gmail.com',
    instagram: '@theharpoceanbeach', facebook: 'https://www.facebook.com/p/The-Harp-Ocean-Beach-61557599817139/', tiktok: '',
    hours: 'Mon-Fri 12pm-2am, Sat 11am-2am, Sun 10am-2am', verified: true,
  },
  'tony-s-martini-bar': {
    category: 'Bar & Karaoke',
    tagline: 'A fine bar in Ocean Beach',
    description: "Tony's Martini Bar is a longtime Ocean Beach staple serving specialty cocktails and martinis with an old-school vibe, complete with a juke box and pool tables. The bar hosts karaoke on Sunday and Thursday nights and live music on Wednesdays. It also features a small covered smoking patio.",
    website: 'https://www.tonysob.com/', phone: '(619) 223-0558', email: '',
    instagram: '@tonysmartinibar', facebook: '', tiktok: '',
    hours: 'Mon-Sat 3pm-2am, Sun 12pm-2am', verified: true,
  },
  'mike-hess-brewing-ocean-beach': {
    category: 'Brewery & Taproom',
    tagline: 'Craft beer by Dog Beach with trivia nights and a dog-friendly patio.',
    description: "Mike Hess Brewing's Ocean Beach taproom sits at the corner of Cable and Voltaire, just blocks from Dog Beach, pairing a relaxed beach vibe with San Diego craft beer culture. The pet- and family-friendly spot lets you bring your own food and hosts weekly trivia on Monday and Thursday nights.",
    website: 'https://www.mikehessbrewing.com/ocean-beach/', phone: '(619) 795-1095', email: '',
    instagram: '@mikehessbrewing', facebook: 'https://www.facebook.com/MHBoceanbeach/', tiktok: '',
    hours: 'Sun 11am-9pm; Mon-Sat 12pm-10pm', verified: true,
  },
  'kilowatt-brewing-ocean-beach': {
    category: 'Brewery & Taproom',
    tagline: 'Small-batch, eclectic craft beer in the heart of Ocean Beach.',
    description: "Kilowatt Brewing's Ocean Beach tasting room on Cable Street pours 20+ small-batch, eclectic beer styles from the local craft brewery. It's a laid-back neighborhood taproom a short walk from the beach.",
    website: 'https://kilowatt.beer/tap-room/', phone: '(619) 255-9775', email: '',
    instagram: '@kilowattbeer', facebook: 'https://www.facebook.com/kilowattbeer', tiktok: '@kilowattbeer',
    hours: 'Mon-Thu 12pm-11pm; Fri-Sat 12pm-12am; Sun 12pm-11pm', verified: true,
  },
  'wonderland-ocean-pub': {
    category: 'Bar & Grill',
    tagline: 'Oceanfront bar and grill with drinks, eats and pier views.',
    description: 'Wonderland Ocean Pub is a casual New American bar and grill on Santa Monica Avenue near the Ocean Beach Pier, serving food and drinks in a lively oceanfront setting. It takes online reservations for groups up to 12, with larger parties by email request.',
    website: 'https://www.wonderlandob.com/', phone: '(619) 255-3358', email: 'info@wonderlandob.com',
    instagram: '@wonderlandoceanbeach', facebook: 'https://www.facebook.com/426533950728666', tiktok: '@wonderlandoceanbeach',
    hours: 'Mon-Thu 11:30am-11pm; Fri 11am-11pm; Sat 10am-11pm; Sun 9:30am-11pm', verified: true,
  },
  'pizza-port-ocean-beach': {
    category: 'Brewpub & Pizza',
    tagline: 'Hand-made pizza and 40 taps of craft beer, one block from the beach.',
    description: 'Pizza Port Ocean Beach opened in 2010 with a 15-barrel brewing system and pours from 40 taps just one block from the beach. The brewpub pairs award-winning house craft beer with hand-made pizza in a classic surf-town setting.',
    website: 'https://www.pizzaport.com/brewpubs/ocean-beach/', phone: '(619) 224-4700', email: '',
    instagram: '@pizzaportbrewingco', facebook: 'https://www.facebook.com/pizzaportbrewingco/', tiktok: '',
    hours: 'Sun-Thu 11am-10pm; Fri-Sat 11am-11pm', verified: true,
  },
  'dirty-birds-ocean-beach': {
    category: 'Wings & Sports Bar',
    tagline: 'Best wings in San Diego, 24 TVs and dog-friendly patios.',
    description: 'Dirty Birds Ocean Beach is a wing-focused sports bar on Cable Street with a spacious open floor plan, 24 4K TVs and rotating craft taps. Multiple dog-friendly patios make it a go-to for game days, happy hour, business lunches and large-party events.',
    website: 'https://www.dirtybirdsbarandgrill.com/about/ocean-beach', phone: '(619) 241-2922', email: 'dboceanbeach@gmail.com',
    instagram: '@dirtybirdspb', facebook: 'https://www.facebook.com/dirtybirdsbarandgrill', tiktok: '',
    hours: 'Mon-Fri 12pm-10pm; Sat-Sun 11am-10pm (opens 9:30am Sun in NFL season)', verified: true,
  },
  'pier-to-point-yoga-and-wellness-center': {
    category: 'Yoga & Wellness Studio',
    tagline: "Point Loma's yoga, wellness and spa retreat",
    description: 'Pier To Point Yoga & Wellness Center is a sanctuary for movement and healing in Ocean Beach, offering yoga, aerial, and mat Pilates classes both in-person and live online. They also provide 200- and 300-hour teacher trainings, workshops, massage, community acupuncture, vitamin injections, and kids classes. The wheelchair-accessible studio is owned by Anna, a longtime San Diego small-business operator.',
    website: 'https://piertopointwellness.com/', phone: '(619) 762-9642', email: 'thrive@piertopointwellness.com',
    instagram: '@piertopointwellness', facebook: 'PierToPointWellness', tiktok: '',
    hours: 'Mon/Wed/Thu 6:45am-8pm, Tue 8:30am-8pm, Fri 6:45am-8:15pm, Sat/Sun 8:30am-1pm', verified: true,
  },
  'ob-jiu-jitsu-collective': {
    category: 'Jiu-Jitsu Gym',
    tagline: 'Community-driven Jiu-Jitsu academy in the heart of Ocean Beach',
    description: 'OB Jiu-Jitsu Collective is a community-driven grappling academy on Newport Ave offering adult and kids classes in both gi and no-gi Brazilian Jiu-Jitsu, plus Muay Thai. The program is led by black belt Andres Cervantes, who brings over 16 years of experience training under Michael Liera Jr. The space also houses an associated art gallery and supports the We Defy Foundation.',
    website: 'https://objiujitsucollective.com/', phone: '(619) 752-4988', email: 'thejiujitsucollectivesd@gmail.com',
    instagram: '@objiujitsucollective', facebook: 'https://www.facebook.com/objiujitsucollective/', tiktok: '',
    hours: 'Mon/Wed/Fri 7-11:30am & 4-8:30pm, Tue/Thu 9-11:30am & 5-8:30pm, Sat 10am-12:30pm, Sun 10-11:30am', verified: true,
  },
  'humble-heart': {
    category: 'Thrift Store & Music Venue',
    tagline: 'Music and thrift in the heart of Ocean Beach',
    description: 'Humble Heart is a thrift store by day and all-ages music venue by night on Newport Ave in Ocean Beach, located next to OB Hardware. Alongside shopping and donations, they host regular programming including monthly open mic nights, Freestyle Fridays, and live music shows.',
    website: 'https://www.theheartob.com/', phone: '(858) 388-9204', email: 'info@theheartob.com',
    instagram: '@humbleheart.ob', facebook: 'https://www.facebook.com/humbleheartthriftstore', tiktok: '',
    hours: 'Mon-Sat 10:30am-6:30pm, Sun 12-6pm', verified: true,
  },
  'align-wellness-and-aesthetics': {
    category: 'Med Spa & Wellness',
    tagline: "San Diego's science-backed care in a calming environment",
    description: 'Align Wellness & Aesthetics is a boutique wellness studio on Voltaire St offering therapeutic Botox for TMJ and migraine relief, cosmetic injectables, and mindfulness classes. Led by Dr. Andrea Marr, the practice pairs medical treatments with meditation, yoga, and breathwork to support both physical pain relief and nervous-system health.',
    website: 'https://www.alignbewell.com/', phone: '', email: 'alignbewell@gmail.com',
    instagram: '@align.be.well', facebook: 'https://www.facebook.com/p/Align-Wellness-Aesthetics-61552922103602/', tiktok: '',
    hours: 'Mon-Fri by appointment only', verified: true,
  },
  'valkyrie-yoga': {
    category: 'Yoga & Healing Studio',
    tagline: 'Yoga + Breathwork + Sound Healing',
    description: 'Valkyrie Yoga is a community-centered, employee-owned healing center on Santa Monica Ave in Ocean Beach offering daily yoga, breathwork, and sound healing classes ranging from restorative and yin to vinyasa and hatha. Founded by Agnete, the space features natural bamboo floors, plants, and an outdoor garden, and hosts monthly events like open mic nights, ecstatic dance, and cacao ceremonies.',
    website: 'https://www.valkyrieyoga.com/', phone: '(619) 488-9971', email: 'info@valkyrieyoga.com',
    instagram: '@valkyrieyogasd', facebook: '', tiktok: '',
    hours: 'Mon-Sun daily, varying class times', verified: true,
  },
  'origin-modern-health-and-wellness': {
    category: 'Upper Cervical Chiropractic & Wellness',
    tagline: 'Precise, non-invasive upper cervical care for the brain and nervous system',
    description: 'Origin Modern Health & Wellness is a chiropractic practice on Sunset Cliffs Blvd founded by Dr. Vivek Soham, focused on the brain and nervous system. The clinic uses the NUCCA upper cervical technique, a gentle, non-invasive approach with no twisting, popping, or cracking, to address issues like vertigo, headaches, migraines, and hormonal imbalances.',
    website: 'https://origin.health/', phone: '(858) 432-3072', email: 'support@origin.health',
    instagram: '@origin_modernhealth', facebook: 'OriginModernHealthWellness', tiktok: '',
    hours: 'Mon-Fri 9am-5pm', verified: true,
  },
  'sine-wave-cafe': {
    category: 'Coffee Shop',
    tagline: 'Neighborhood coffee & breakfast with a laid-back OB vibe',
    description: 'Sine Wave Cafe is an Ocean Beach neighborhood coffee shop and breakfast cafe serving specialty coffee, matcha, handcrafted espresso drinks, and fresh brunch items made with quality ingredients. Founded in 2025, it functions as a relaxed community gathering space for locals, surfers, and visitors.',
    website: 'https://www.sinewavecafe.com/', phone: '(619) 326-8660', email: '',
    instagram: '@sinewavecafe', facebook: '', tiktok: '',
    hours: 'Daily 7am-2pm (extended weekend hours)', verified: true,
  },
  'ultreya-coffee-and-tea': {
    category: 'Coffee Roaster',
    tagline: 'Bold flavors, small-batch roasting, and your new favorite daily ritual',
    description: 'Ultreya Coffee and Tea is an Ocean Beach coffee roaster and shop serving fresh, small-batch roasted coffee, specialty drinks, acai bowls, and creative breakfast options. The thoughtfully curated space also stocks gifts and goods, with owner Danielle Riggins serving coffee in OB since the early 2010s.',
    website: 'https://ultreyacoffee.com/', phone: '(619) 992-5972', email: '',
    instagram: '@ultreya_coffee', facebook: 'https://www.facebook.com/ultreyacoffee/', tiktok: '',
    hours: 'Daily 6:30am-5pm', verified: true,
  },
  'coffee-cycle-roasting': {
    category: 'Coffee Roaster',
    tagline: 'San Diego small-batch roaster with an on-site OB roastery and cafe',
    description: "Coffee Cycle Roasting is a San Diego-born independent roaster that expanded from Pacific Beach into a 1,600-square-foot roastery and cafe on Voltaire Street in Ocean Beach. Founded by Chris O'Brien from a single pedal-driven coffee cart, the OB location roasts beans on-site with a five-kilo roaster.",
    website: 'https://coffeecycleroasting.com/', phone: '(951) 363-3066', email: '',
    instagram: '@coffeecycleroasting', facebook: 'https://www.facebook.com/coffeecycleroasting/', tiktok: '',
    hours: 'Mon-Fri 6:30am-3:30pm; Sat-Sun 7am-3:30pm', verified: true,
  },
  'the-template': {
    category: 'Event Venue',
    tagline: 'An OB art collective, cafe, and community venue uniting the curious',
    description: 'The Template is an Ocean Beach cafe, community center, venue, and artist collective operating as a 501(c)(3) nonprofit dedicated to fostering creativity and supporting local art. The space hosts open mics, live music, workshops, markets, and art exhibitions, and offers a large event space with lighting, projectors, and green/white screens.',
    website: 'https://www.obtemplate.com/', phone: '(619) 800-1651', email: '',
    instagram: '@thetemplateob', facebook: 'theOBtemplate', tiktok: '',
    hours: 'Daily 8am-6pm', verified: true,
  },
  'connect-san-diego': {
    category: 'Art Gallery & Event Space',
    tagline: 'OB shop and secret gallery built on community and creativity',
    description: 'Connect San Diego is an Ocean Beach store and gallery where artists and small businesses sell and showcase their work, featuring new, custom, and vintage clothing, jewelry, art, prints, and oddities. The space doubles as an event and gallery venue (SH!FT Gallery & Gatherings) hosting parties, photoshoots, and DJ nights.',
    website: '', phone: '(619) 929-0881', email: '',
    instagram: '@connectsandiego', facebook: '', tiktok: '',
    hours: 'Mon-Tue & Thu-Fri 12pm-6pm; Wed 4pm-9:30pm; Sat 12pm-8pm; Sun 12pm-6pm', verified: true,
  },
  'the-inn-at-sunset-cliffs': {
    category: 'Hotel',
    tagline: 'A tranquil oceanfront boutique inn steps from Ocean Beach',
    description: 'The Inn at Sunset Cliffs is a boutique oceanfront hotel in the Point Loma/Ocean Beach area, one of the few San Diego hotels located directly on the Pacific Ocean. Originally built in the 1950s and updated in 2018, the 24-room inn is designed after Santorini, Greece, and features a heated pool, oceanview terraces, and event/wedding spaces.',
    website: 'https://innatsunsetcliffs.com/', phone: '(619) 222-7901', email: 'info@innatsunsetcliffs.com',
    instagram: '@innatsunsetcliffs', facebook: 'https://www.facebook.com/InnatSunsetCliffs/', tiktok: '',
    hours: '', verified: true,
  },
  'sunset-cliffs-natural-park': {
    category: 'Natural Park',
    tagline: 'Dramatic bluff-top ocean views, sea caves, and world-class sunsets in Point Loma.',
    description: 'Sunset Cliffs Natural Park is a 68-acre resource-based park established in 1983, stretching along the Pacific Ocean on the western edge of Point Loma. It features intricately carved coastal bluffs, arches, and sea caves with panoramic ocean views, and migrating California gray whales can be spotted seasonally. The park is free and open to the public, with street and small-lot parking; there are no on-site restrooms.',
    website: 'https://www.sandiego.gov/park-and-recreation/parks/regional/shoreline/sunset', phone: '(619) 235-5913', email: '',
    instagram: '', facebook: '', tiktok: '',
    hours: 'Open daily; free admission', verified: true,
  },
  'saratoga-park': {
    category: 'Park',
    tagline: 'Family-friendly grassy park beside Saratoga Avenue Beach in Ocean Beach.',
    description: 'Saratoga Park is a small public park with a large grassy area adjacent to Saratoga Avenue Beach in Ocean Beach. It sits on a family-friendly stretch of coast between the busier Newport Avenue and Voltaire Street beach areas, near parking, food, showers, and lifeguards. The green is a popular spot for hanging out close to the sand and surf.',
    website: 'https://oceanbeachsandiego.com/attractions/parks/saratoga-park', phone: '', email: '',
    instagram: '', facebook: '', tiktok: '',
    hours: 'Open daily', verified: true,
  },
  'ob-farmers-market': {
    category: 'Farmers Market',
    tagline: "OB's Wednesday night street market: fresh produce, artisans, and hot food.",
    description: "The OB Farmers Market is a Certified Farmers Market hosted by the Ocean Beach MainStreet Association on the 4900 block of Newport Ave between Cable and Bacon Streets. Held every Wednesday, rain or shine, it features over 100 vendors including certified farmers, artisans, crafters, and hot food from around the world. It's a lively weekly gathering at the heart of Ocean Beach's business district.",
    website: 'https://oceanbeachsandiego.com/attractions/annual-events/farmers-market-wednesdays', phone: '(619) 279-0032', email: '',
    instagram: '', facebook: 'https://www.facebook.com/OBFarmersMarket/', tiktok: '',
    hours: 'Wednesdays 4:00 PM - 8:00 PM, rain or shine', verified: true,
  },
  'ocean-beach-town-council': {
    category: 'Community Organization',
    tagline: 'All-volunteer nonprofit dedicated to the care and improvement of Ocean Beach.',
    description: "The Ocean Beach Town Council is an all-volunteer, non-profit community organization dedicated to expressing the will and representing the welfare of Ocean Beach. It provides a forum to discuss community issues, communicates residents' needs to appropriate agencies, and promotes the betterment and beautification of the neighborhood. Membership is free to all who live, work, or own property in the 92107 area.",
    website: 'https://obtowncouncil.org/', phone: '(619) 224-4906', email: '',
    instagram: '@obtowncouncil', facebook: 'https://www.facebook.com/obtowncouncil/', tiktok: '',
    hours: '', verified: true,
  },
  'ocean-beach-recreation-center': {
    category: 'Recreation Center',
    tagline: 'City of San Diego rec center in the heart of Ocean Beach.',
    description: 'The Ocean Beach Recreation Center is a City of San Diego Parks and Recreation facility at 4726 Santa Monica Ave. It offers community recreation programs and activities for local residents. Programming is overseen by the Ocean Beach Community Recreation Group.',
    website: 'https://www.sandiego.gov/park-and-recreation/centers/recctr/oceanb', phone: '(619) 531-1527', email: '',
    instagram: '', facebook: '', tiktok: '',
    hours: 'Mon 10am-8pm; Tue-Thu 9am-8pm; Fri 9am-7pm; Sat morning; closed Sun', verified: true,
  },
  'barnes-tennis-center': {
    category: 'Tennis Center',
    tagline: 'Public racquet-sports hub: tennis, pickleball, and padel by Youth Tennis San Diego.',
    description: 'Barnes Tennis Center is a multi-sport racquet facility at 4490 W Point Loma Blvd, operated by the nonprofit Youth Tennis San Diego (YTSD). It offers tennis, pickleball, and padel courts, adult and junior programs, private lessons, court rentals, and hosts tournaments and events. The center serves as a community hub while supporting youth development through tennis.',
    website: 'https://www.barnestenniscenter.com/', phone: '(619) 221-9000', email: 'info@ytsd.org',
    instagram: '@barnestenniscenter', facebook: 'https://www.facebook.com/barnestenniscenter', tiktok: '',
    hours: 'Mon-Fri 7am-10pm; Sat-Sun 7am-9pm', verified: true,
  },
  'robb-field': {
    category: 'Athletic Field & Recreation',
    tagline: "Ocean Beach's expansive athletic complex with fields, courts, and a skate park.",
    description: "Robb Field (Ocean Beach Athletic Area) at 2525 Bacon St is a large City of San Diego recreation complex along the San Diego River. It includes softball and multipurpose fields, tennis, basketball and handball courts, a picnic area, the Robb Fitness Club, and the City's first skateboard park, which opened in 2000. It's a central hub for youth and adult sports in Ocean Beach.",
    website: 'https://oceanbeachsandiego.com/attractions/parks/robb-athletic-field', phone: '(619) 531-1563', email: '',
    instagram: '', facebook: '', tiktok: '',
    hours: 'Open daily', verified: true,
  },
  // Added 2026-09-14 after resolving dropped bare-address pins to real businesses.
  'reunify-yoga': {
    category: 'Yoga & Movement Studio',
    tagline: 'Down-to-earth community yoga studio in the heart of Ocean Beach',
    description: "reUnify Yoga is a community-focused Ocean Beach yoga studio with several nearby spaces, including its indoor Bacon Studio (2183 Bacon St) and an open-air Outdoor Deck at Voltaire & Cable. Classes span Hatha, Vinyasa, Yin, Restorative, Yoga Nidra, meditation, and sound healing, plus teacher trainings. Its rooms host visiting series like Kaiti Yoga's yin + sound-bowl sessions, Josie Duraso's Moon Body classes, and pop-up community markets.",
    website: 'https://www.reunifyyoga.com', phone: '', email: 'hello@reunifyyoga.com',
    instagram: '@reunifyyoga', facebook: 'https://www.facebook.com/reunifyyoga', tiktok: '',
    hours: 'Mon 8:30am-8pm; Tue 6:30am-8pm; Wed 6:30am-8:30pm; Thu 7am-8pm; Fri 7am-6:30pm; Sat 8:30am-12:30pm; Sun 8:30am-7:30pm', verified: true,
  },
  'yoga-in-beautiful-places': {
    category: 'Outdoor Yoga',
    tagline: 'Scenic oceanfront yoga, sound baths & moon ceremonies on Sunset Cliffs',
    description: 'Yoga In Beautiful Places is an outdoor-yoga and wellness business offering donation-based sunset yoga, meditation, and sound-bath experiences at scenic San Diego locations. On the Sunset Cliffs bluff (1352 Sunset Cliffs Blvd) they run weekly Oceanfront Yoga plus new-moon and full-moon ceremonies. They also offer SUP yoga in Coronado, beach classes in Carlsbad, private/corporate sessions, and wellness retreats.',
    website: 'https://www.yogainbeautifulplaces.com', phone: '', email: 'YogaInBeautifulPlaces@gmail.com',
    instagram: '@yogainbeautifulplaces', facebook: 'https://www.facebook.com/yogainbeautifulplaces', tiktok: '',
    hours: 'Sunset Cliffs Oceanfront Yoga Thursdays 6-7pm (donation-based); plus new-moon & full-moon bluff sessions; registration required', verified: true,
  },
  'yoga-jawn': {
    category: 'Outdoor Yoga',
    tagline: 'Free, donation-based community yoga on the Sunset Cliffs bluff',
    description: 'Yoga Jawn is a San Diego community outdoor-yoga operation (the Sunset Cliffs Yoga collective) offering donation-based, all-levels classes overlooking the ocean in Ocean Beach and Point Loma. Its signature Sunday sessions run at 9am and 11am on the bluff near Osprey Point, with additional weekday flow, hatha, and gentle vinyasa classes at Adair Street and Osprey Point. Founded and led by Jackie.',
    website: 'https://www.yogajawn.com', phone: '(619) 786-4278', email: 'jackie@yogajawn.com',
    instagram: '@yoga_jawn', facebook: 'https://www.facebook.com/groups/140871036696825/', tiktok: '',
    hours: 'Sunday Vinyasa Flow 9am & 11am (Osprey Point); weekday classes at Adair St & Osprey Point; donation-based, all levels', verified: true,
  },
};

const doc = JSON.parse(readFileSync(FILE, 'utf8'));
let filled = 0, missing = [];
for (const v of doc.vendors) {
  const e = E[v.slug];
  if (!e) { missing.push(v.slug); continue; }
  Object.assign(v, e);
  filled++;
}
if (missing.length) {
  console.error('No enrichment for:', missing.join(', '));
  process.exit(1);
}
const unmatched = Object.keys(E).filter((s) => !doc.vendors.some((v) => v.slug === s));
if (unmatched.length) { console.error('Enrichment slug not in file:', unmatched.join(', ')); process.exit(1); }

doc._comment = doc._comment.replace(/ Enrichment fields left blank for a research pass\./, ' Enrichment fields filled from a 2026-09-14 web-research pass (verified against official sites).');
writeFileSync(FILE, JSON.stringify(doc, null, 2));

const withWebsite = doc.vendors.filter((v) => v.website).length;
const withPhone = doc.vendors.filter((v) => v.phone).length;
console.log(`Enriched ${filled}/${doc.vendors.length} vendors in ${FILE}.`);
console.log(`  with website: ${withWebsite}   with phone: ${withPhone}   verified: ${doc.vendors.filter((v) => v.verified).length}`);
