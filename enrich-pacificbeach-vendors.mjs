#!/usr/bin/env node
/**
 * enrich-pacificbeach-vendors.mjs — fill the blank enrichment fields on
 * PacificBeachVendors.json from a 2026-09-15 web-research pass (5 parallel
 * agents, each field confirmed against the business's official site / reputable
 * listing). Mirrors enrich-oceanbeach-vendors.mjs.
 *
 * Only touches category/tagline/description/website/phone/email/instagram/
 * facebook/tiktok/hours/verified. Leaves slug/name/address/lat/lng/neighborhood/
 * events/logoUrl untouched. Idempotent: re-run overwrites the same fields.
 *
 * NOTE: research flagged several seed addresses as wrong (bar Ella, Riptides,
 * Tavern at the Beach, SD Mission Bay Boat & Ski Club). address/lat/lng are left
 * as-seeded here so the map pin and shown address stay consistent — fixing the
 * coordinates is a separate seeder correction. See the descriptions where the
 * real address is noted.
 *
 * Usage: node enrich-pacificbeach-vendors.mjs   (rewrites PacificBeachVendors.json in place)
 */
import { readFileSync, writeFileSync } from 'node:fs';

const FILE = './PacificBeachVendors.json';

// slug -> researched fields. Blank string = not publicly confirmed, left empty.
const E = {
  "jrdn-at-tower23-hotel": {
    "category": "Oceanfront Restaurant & Bar",
    "tagline": "Modern surf and turf at the edge of the Pacific",
    "description": "JRDN is an upscale oceanfront restaurant and bar inside the Tower23 Hotel, steps from the sand in Pacific Beach. It serves contemporary seafood, sushi, and steakhouse fare with panoramic ocean views. The restaurant is open daily for breakfast, lunch, dinner, and weekend brunch.",
    "website": "https://www.t23hotel.com/jrdn", "phone": "(858) 270-2323", "email": "hotel@t23hotel.com",
    "instagram": "@t23hotel", "facebook": "t23hotel", "tiktok": "",
    "hours": "Breakfast Mon-Fri 9am-11am, Brunch Sat-Sun 9am-3pm, Lunch Mon-Fri 11am-3pm, Dinner Sun-Thu 5pm-9pm & Fri-Sat 5pm-10pm", "verified": true
  },
  "the-collective": {
    "category": "Bar & Event Venue",
    "tagline": "San Diego's premier private event space in the heart of Pacific Beach",
    "description": "The Collective is a beer and cocktail bar, taproom, and private event space at 1261 Garnet Ave in Pacific Beach. The venue hosts private events and offers live music, DJs, karaoke, and catering. Weekly programming includes trivia, comedy, and live music nights.",
    "website": "https://www.collective-sd.com/", "phone": "(858) 241-6824", "email": "events@collective-sd.com",
    "instagram": "@collectivebar", "facebook": "https://www.facebook.com/p/The-Collective-61554193464070", "tiktok": "",
    "hours": "Mon-Wed 10am-12am, Thu 10am-1am, Fri-Sat 10am-2am, Sun 10am-12am", "verified": true
  },
  "bar-ella-pacific-beach": {
    "category": "Cocktail Bar & Seafood Restaurant",
    "tagline": "we welcome you to bE happy",
    "description": "bar Ella is a coastal-fusion cocktail bar and seafood restaurant in Pacific Beach, blending East Coast culinary heritage with West Coast ambiance. It offers handcrafted cocktails, small plates, weekend brunch, and a dog-friendly, happy-hour atmosphere. Note: the confirmed address is 1030 Garnet Ave, San Diego, CA 92109.",
    "website": "https://barellapb.com/", "phone": "(858) 808-2286", "email": "",
    "instagram": "@bar.ella.pb", "facebook": "barellapb", "tiktok": "",
    "hours": "Mon-Thu 4pm-12am, Fri 4pm-2am, Sat 11am-2am, Sun 11am-12am", "verified": true
  },
  "the-duck-dive": {
    "category": "Bar & Restaurant",
    "tagline": "Pacific Beach's premier neighborhood beach lounge and eatery",
    "description": "The Duck Dive is a laid-back neighborhood beach lounge and eatery at 4650 Mission Blvd in Pacific Beach. It serves American cuisine, craft beers, and cocktails in a casual, surf-inspired setting. Brunch is offered on weekends.",
    "website": "https://www.theduckdive.com/", "phone": "(858) 273-3825", "email": "",
    "instagram": "@theduckdive", "facebook": "TheDuckDive", "tiktok": "",
    "hours": "Mon-Thu 10am-11pm, Fri 10am-12am, Sat 9am-12am, Sun 9am-11pm", "verified": true
  },
  "riptides-pb": {
    "category": "Sports Bar & Restaurant",
    "tagline": "PB's family-friendly surf-bungalow sports bar",
    "description": "Riptides PB is a family-friendly sports bar and restaurant with a Southern California surf-bungalow theme, serving casual American food with a Caribbean influence. It features around 20 TVs, pool tables, live music, and DJs, and is known for showing UFC events. Note: Riptides is at 1014 Grand Ave, San Diego, CA 92109, a distinct business from 710 Beach Club.",
    "website": "http://riptidespb.com/", "phone": "(858) 999-0061", "email": "",
    "instagram": "", "facebook": "https://www.facebook.com/RiptidesPB/", "tiktok": "",
    "hours": "Mon-Fri 11am-2am, Sat-Sun 10am-2am", "verified": true
  },
  "710-beach-club": {
    "category": "Live Music Venue & Bar",
    "tagline": "Pacific Beach's longest-running live music venue",
    "description": "710 Beach Club is a waterfront bar, restaurant, and concert venue at 710 Garnet Ave, a fixture of Pacific Beach's Garnet Avenue nightlife since 1989. It hosts live bands along with trivia, karaoke, and open-mic nights, and serves American bar fare from brunch through late night. The dog-friendly patio overlooks the boardwalk and entry is 21-and-over.",
    "website": "https://www.710bc.com/", "phone": "(858) 483-7844", "email": "",
    "instagram": "@710beachclub", "facebook": "https://www.facebook.com/710beachclubpb/", "tiktok": "",
    "hours": "Mon-Fri 11:30am-2am, Sat-Sun 10am-2am", "verified": true
  },
  "sd-taproom": {
    "category": "Craft Beer Bar & Restaurant",
    "tagline": "6 blocks from the beach",
    "description": "SD TapRoom is a Pacific Beach craft beer bar, restaurant and brewery established in 2006, focused on San Diego craft beer, food and local hospitality. The kitchen serves elevated pub fare including pizza, burgers and tacos. It is located on Garnet Ave, about six blocks from the beach.",
    "website": "https://www.sdtaproom.com", "phone": "(858) 274-1010", "email": "mgmt@sdtaproom.com",
    "instagram": "@sdtaproom", "facebook": "SDTapRoom", "tiktok": "",
    "hours": "Mon-Thu 10:30am-11pm, Fri-Sat 10am-12am, Sun 10am-9pm", "verified": true
  },
  "tavern-at-the-beach": {
    "category": "Sports Bar & Restaurant",
    "tagline": "Great Food, Stiff Drinks, Late Nights",
    "description": "Tavern at the Beach is a Pacific Beach neighborhood bar and restaurant established in 1997, known for one of the best happy hours in PB. It operates as a sports bar by day and a nightclub by night, serving elevated comfort food with rotating specials. Note: the confirmed address is 1200 Garnet Ave, San Diego, CA 92109.",
    "website": "https://tavernatthebeach.com", "phone": "(858) 272-6066", "email": "",
    "instagram": "@tavernpb", "facebook": "https://www.facebook.com/TavernPacificBeach", "tiktok": "",
    "hours": "Mon-Fri 2pm-2am, Sat 12pm-2am, Sun 11am-2am", "verified": true
  },
  "pueblo": {
    "category": "Mexican Restaurant",
    "tagline": "Modern Baja Coastal",
    "description": "Pueblo is a Pacific Beach restaurant serving modern Baja California coastal cuisine, located two blocks from the ocean. It opened in 2016 and emphasizes seafood, ceviches, street tacos and agave-based cocktails. Seating includes an open courtyard and a rooftop deck with two bars.",
    "website": "https://www.pueblopb.com", "phone": "(858) 412-3312", "email": "",
    "instagram": "@pueblo_pb", "facebook": "https://www.facebook.com/pueblopb", "tiktok": "",
    "hours": "Lunch daily 11:30am-4pm; Dinner Sun-Thu 4-9pm, Fri-Sat 4-10pm", "verified": true
  },
  "hideaway-pacific-beach": {
    "category": "Restaurant & Bar",
    "tagline": "Beach bungalow eats a block from Crystal Pier",
    "description": "Hideaway Pacific Beach is a beach bungalow restaurant and bar located a block from Crystal Pier in Pacific Beach. It features wood-fired pizza, cocktails and happy hour specials. The venue is open daily until 2am.",
    "website": "https://hideawaypb.com", "phone": "(619) 693-4396", "email": "events@hideawaypb.com",
    "instagram": "https://www.instagram.com/hideawaypacificbeach/", "facebook": "https://www.facebook.com/hideawaypacificbeach", "tiktok": "",
    "hours": "Mon-Fri 11am-2am, Sat-Sun 9am-2am", "verified": true
  },
  "pb-shore-club-beer-garden": {
    "category": "Beachfront Bar & Restaurant",
    "tagline": "Panoramic ocean views right on the PB boardwalk",
    "description": "PB Shore Club is a classically styled beachfront bar and restaurant on the Pacific Beach boardwalk where Grand Avenue meets the sand. The two-story space offers panoramic ocean views, dozens of TVs, and is known for fresh fish tacos, handcrafted cocktails and 32-ounce beer schooners. It is a popular local sports bar with a game-day atmosphere and live DJs.",
    "website": "https://www.pbshoreclub.com", "phone": "", "email": "",
    "instagram": "@pbshoreclub", "facebook": "https://www.facebook.com/PacificBeachShoreClub", "tiktok": "",
    "hours": "Mon-Fri 10am-2am, Sat 9am-2am, Sun 9am-12am", "verified": true
  },
  "flamingo-deck": {
    "category": "New American Restaurant & Bar",
    "tagline": "Be a Flamingo in a Flock of Pigeons",
    "description": "Flamingo Deck is a New American restaurant and bar with an Italian twist, located in the PB Promenade on Mission Blvd in Pacific Beach. It offers a rooftop dining experience steps from the water with brunch, lunch and dinner menus featuring pizza, pasta, seafood and steak, plus vegan-friendly options. Happy hour runs Monday through Friday.",
    "website": "https://www.flamingodeck.com", "phone": "(858) 263-4205", "email": "",
    "instagram": "https://instagram.com/flamingodeckpb/", "facebook": "https://facebook.com/flamingodeckpb/", "tiktok": "@flamingodeckpacificbeach",
    "hours": "Mon-Thu 12pm-12am, Fri 12pm-2am, Sat 9am-2am, Sun 9am-12am", "verified": true
  },
  "smiling-buddha-bodywork": {
    "category": "Acupuncture & Bodywork",
    "tagline": "Asian-infused massage, acupuncture, and herbal medicine",
    "description": "Smiling Buddha Bodywork is a San Diego wellness practice offering Asian-infused massage therapy alongside Traditional Chinese Medicine, including acupuncture and herbal medicine. Led by Licensed Acupuncturist Gary Williams, MSTOM, LAc, the studio operates by appointment only. It also hosts classes, workshops, and Reiki training events throughout the year.",
    "website": "https://www.smilingbuddhabodywork.com", "phone": "(619) 794-9078", "email": "SmilingBuddhaSD@gmail.com",
    "instagram": "@smilingbuddhasd", "facebook": "https://www.facebook.com/SmilingBuddhaSD/", "tiktok": "",
    "hours": "", "verified": true
  },
  "fitness-quest-10-pacific-beach": {
    "category": "Gym & Personal Training",
    "tagline": "Transforming body, mind, and spirit through health and wellness",
    "description": "Fitness Quest 10 is a San Diego personal training and group fitness company, with its Pacific Beach location at 875 Garnet Ave. The studio offers personal training, small-group classes, and functional strength coaching for all fitness levels. It is part of the larger Fitness Quest 10 organization founded by Todd Durkin.",
    "website": "https://fitnessquest10.com", "phone": "(858) 282-8096", "email": "",
    "instagram": "@fitnessquest10", "facebook": "https://www.facebook.com/FitnessQuest10/", "tiktok": "",
    "hours": "Mon-Fri 6am-6pm, Sat 8am-11am, Sun 9am-11am", "verified": true
  },
  "ritual-wellness-collective": {
    "category": "Yoga & Wellness Studio",
    "tagline": "A space for your wellness journey",
    "description": "Ritual Wellness Collective is a breathwork, yoga, and meditation studio in Pacific Beach at 3510 Ingraham St, Suite 200. The women-owned and Latino-owned studio offers group classes, private sessions, and curated wellness events. Programming spans Kundalini and Vinyasa yoga, Yin, Reiki, sound baths, and structured breathwork.",
    "website": "https://www.sdritualwellness.com", "phone": "(619) 637-3077", "email": "",
    "instagram": "@ritualwellnesscollective", "facebook": "", "tiktok": "",
    "hours": "", "verified": true
  },
  "revel-fit-club-at-mara": {
    "category": "Fitness Studio",
    "tagline": "A fully immersive boutique fitness experience",
    "description": "Revel Fit Club is a boutique fitness studio delivering strength, cardio, and HIIT in 50-minute group classes. Workouts pair high-intensity interval training on TechnoGym treadmills with strength work using the FitBench. The Pacific Beach studio is at 4275 Mission Bay Dr, Suite 110, with underground parking available.",
    "website": "https://revelfitclub.com", "phone": "(858) 396-7580", "email": "info@revelfitclub.com",
    "instagram": "@revelfitclub", "facebook": "https://www.facebook.com/REVELFITCLUB/", "tiktok": "@revelfitclub_",
    "hours": "", "verified": true
  },
  "studio-golf-san-diego": {
    "category": "Indoor Golf",
    "tagline": "Not your typical golf club",
    "description": "Studio Golf San Diego is a membership-based indoor golf training facility at 4275 Mission Bay Dr. It is built around TrackMan simulators, PuttView putting technology, and Sportsbox AI 3D swing analysis, combining coaching, golf-specific fitness, custom club fitting, and members-only league nights. Complimentary day passes are available for prospective members.",
    "website": "https://studiogolfclub.com/locations/san-diego/", "phone": "(619) 458-5117", "email": "sd@studiogolfclub.com",
    "instagram": "@studiogolfclub", "facebook": "https://www.facebook.com/p/Studio-Golf-Club-61555082469487/", "tiktok": "",
    "hours": "Mon-Sun 9am-9pm", "verified": true
  },
  "cafe-of-life-chiropractic": {
    "category": "Chiropractic",
    "tagline": "For you and your family through every phase of life",
    "description": "Cafe of Life Chiropractic is a holistic family chiropractic practice in Pacific Beach at 4535 Fanuel St, founded by Dr. Stephanie Williams. The office specializes in pregnancy, pediatric, and family care, with all doctors Webster Certified. Techniques range from gentle, low-force adjustments to more traditional styles.",
    "website": "https://www.cafeoflifesandiego.com", "phone": "(619) 374-8444", "email": "hello@cafeoflifesandiego.com",
    "instagram": "@cafeoflife_chiropractic", "facebook": "https://www.facebook.com/cafeoflifesd/", "tiktok": "",
    "hours": "Mon 12pm-6pm, Tue 9am-6pm, Wed 1pm-6pm, Thu 9am-11am & 1pm-6pm, Fri 9am-2pm, Sat 10am-12pm, Sun Closed", "verified": true
  },
  "san-diego-holistic-wellness": {
    "category": "", "tagline": "", "description": "",
    "website": "", "phone": "", "email": "",
    "instagram": "", "facebook": "", "tiktok": "",
    "hours": "", "verified": false
  },
  "mindful-matters-counseling": {
    "category": "Counseling & Mental Health",
    "tagline": "Mindfulness-based therapy in Pacific Beach",
    "description": "Mindful Matters Counseling is the Pacific Beach practice of Marni Goldberg, LMFT, LPCC, offering individual, family, group, and teen therapy. The practice specializes in mindfulness-based approaches, cognitive-behavioral therapy, heart-centered hypnotherapy, and brainspotting. Sessions are available in person and online.",
    "website": "https://www.mindfulmatterscounseling.com", "phone": "(858) 617-9290", "email": "",
    "instagram": "", "facebook": "https://www.facebook.com/Mindfulmatterscounseling", "tiktok": "",
    "hours": "", "verified": true
  },
  "porchlight-coffee": {
    "category": "Coffee Shop",
    "tagline": "Your San Diego spot for coffee, bagels and baked goods",
    "description": "PorchLight Coffee is a Pacific Beach coffee shop serving locally roasted coffee, espresso drinks, and house-made cold brew. It partners with Desperado Bagels for artisan bagels alongside locally sourced pastries. The shop offers a relaxed, community-oriented atmosphere.",
    "website": "https://www.porchlightcoffeeco.com", "phone": "", "email": "info@porchlightcoffeeco.com",
    "instagram": "@porchlightcoffeesd", "facebook": "", "tiktok": "",
    "hours": "Mon-Sun 7am-1pm", "verified": true
  },
  "pacific-beach-tennis-club": {
    "category": "Tennis Club",
    "tagline": "Tennis and pickleball in the heart of Pacific Beach",
    "description": "Pacific Beach Tennis Club (PBTC) is a tennis and pickleball club in Pacific Beach, San Diego. It features 8 well-lit, well-maintained courts, a ball machine, competitive league play, and professional instructors. The club hosts a variety of events, clinics, and mixers.",
    "website": "https://www.pbtennis.com", "phone": "(858) 273-9177", "email": "manager@pbtennis.com",
    "instagram": "@pb_tennisclub", "facebook": "https://www.facebook.com/PBTennisClub", "tiktok": "",
    "hours": "Mon-Fri 8am-9pm; Sat-Sun 8am-7:30pm", "verified": true
  },
  "sd-mission-bay-boat-ski-club": {
    "category": "Boating Club",
    "tagline": "One of the oldest boating clubs in the nation",
    "description": "The San Diego Mission Bay Boat & Ski Club is a nonprofit waterfront social and boating club on Mission Bay. Its clubhouse includes a full bar, galley, conference hall, and outdoor event space. Members take part in water activities, social events, and charitable initiatives. Note: the club lists its address as 2606 N Mission Bay Dr.",
    "website": "https://www.sdmbbsc.org", "phone": "(619) 218-6696", "email": "commodore@sdmbbsc.org",
    "instagram": "https://www.instagram.com/sdmbbsc", "facebook": "https://www.facebook.com/sdmbbsc", "tiktok": "",
    "hours": "", "verified": true
  },
  "kate-sessions-memorial-park": {
    "category": "Public Park",
    "tagline": "79-acre hilltop park on Mount Soledad with sweeping Mission Bay views",
    "description": "Kate Sessions Memorial Park is a 79-acre City of San Diego park at the base of Mount Soledad in Pacific Beach, offering panoramic views of Mission Bay and the coastline. It features walking trails, picnic areas, barbecues, open lawns, a playground, and restrooms. The park was dedicated in 1957 in honor of horticulturist Kate Sessions.",
    "website": "", "phone": "", "email": "",
    "instagram": "", "facebook": "", "tiktok": "",
    "hours": "Open daily", "verified": true
  },
  "crown-point-park": {
    "category": "Public Park",
    "tagline": "Bayside park and shores on the north side of Mission Bay",
    "description": "Crown Point Park (Crown Point Shores) sits on the north side of Mission Bay in Pacific Beach, with grassy lawns, picnic tables, and a sandy beach. Amenities include a playground, basketball courts, a boat launch, and multiple parking lots. It is a popular spot for kayaking, paddleboarding, swimming, and picnicking.",
    "website": "https://www.sandiego.gov/park-and-recreation/parks/regional/missionbay", "phone": "", "email": "",
    "instagram": "", "facebook": "", "tiktok": "",
    "hours": "Open daily", "verified": true
  },
  "pacific-beach-boardwalk": {
    "category": "Public Park",
    "tagline": "Beachfront path along Pacific Beach's Ocean Front Walk",
    "description": "The Pacific Beach Boardwalk, officially the Ocean Front Walk, is a flat concrete pathway running along the coastline from North Pacific Beach toward Mission Beach. It is a popular route for walking, running, biking, skateboarding, and rollerblading, lined with bars, restaurants, and shops. The busiest stretch is near Garnet Avenue and Crystal Pier.",
    "website": "", "phone": "", "email": "",
    "instagram": "", "facebook": "", "tiktok": "",
    "hours": "Open daily", "verified": true
  },
  "mission-bay-high-school": {
    "category": "Public High School",
    "tagline": "Home of the Buccaneers in Pacific Beach, San Diego Unified",
    "description": "Mission Bay High School is a public secondary school in the San Diego Unified School District, located at 2475 Grand Ave in Pacific Beach. Its mascot is the Buccaneer (Bucs). The school serves students in grades 9-12.",
    "website": "https://missionbay.sandiegounified.org/", "phone": "(858) 536-0136", "email": "",
    "instagram": "@missionbayhigh", "facebook": "https://www.facebook.com/missionbayhighschool/", "tiktok": "",
    "hours": "Mon-Fri 8:00am-4:00pm", "verified": true
  },
  "pb-tuesday-farmers-market": {
    "category": "Farmers Market",
    "tagline": "Fresh food, art, & air. See you on Tuesday!",
    "description": "The Pacific Beach Tuesday Farmers' Market is an outdoor certified farmers' market operating in Pacific Beach since 2011. It offers fresh produce, meats, cheeses, flowers, prepared foods, and handcrafted artisan works, and accepts EBT with Market Match benefits. The market runs weekly along Bayard Street between Garnet and Grand Avenues.",
    "website": "https://www.pacificbeachmarket.com/", "phone": "(858) 273-3303", "email": "info@pacificbeachmarket.com",
    "instagram": "@pacificbeachmarket", "facebook": "https://www.facebook.com/PBTuesdayMarket", "tiktok": "",
    "hours": "Tuesdays 2:00pm-7:00pm", "verified": true
  },
  "pacific-beach-town-council": {
    "category": "Community Organization",
    "tagline": "Community advocacy and civic engagement for Pacific Beach",
    "description": "The Pacific Beach Town Council is a nonprofit community organization serving the Pacific Beach neighborhood of San Diego. It holds monthly general meetings, typically the third Wednesday of the month, and works on local civic issues and community events. Meetings are held at Crown Point Junior Music Academy (4033 Ingraham St).",
    "website": "https://www.pbtowncouncil.org/", "phone": "", "email": "",
    "instagram": "@pacificbeachtowncouncil", "facebook": "https://www.facebook.com/pbtowncouncil/", "tiktok": "",
    "hours": "", "verified": true
  }
};

const doc = JSON.parse(readFileSync(FILE, 'utf8'));
let filled = 0; const missing = [];
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

doc._comment = doc._comment.replace(/ Enrichment fields left blank for a research pass\./, ' Enrichment fields filled from a 2026-09-15 web-research pass (verified against official sites).');
writeFileSync(FILE, JSON.stringify(doc, null, 2));

const withWebsite = doc.vendors.filter((v) => v.website).length;
const withPhone = doc.vendors.filter((v) => v.phone).length;
console.log(`Enriched ${filled}/${doc.vendors.length} vendors in ${FILE}.`);
console.log(`  with website: ${withWebsite}   with phone: ${withPhone}   verified: ${doc.vendors.filter((v) => v.verified).length}`);
