# Hillcrest venues & activities research — browser prompt (websites + Instagram)

Paste everything below the line into Claude's browser tool. It discovers every
Hillcrest venue, then researches each one's **website AND Instagram** for happy
hours and upcoming events, and returns one JSON block that drops straight into
the Hillcrest seed files (new vendor cards + activities).

---

You are researching **San Diego Hillcrest (92103)** venues and their events by browsing the open web. Today is **2026-09-23**. Accuracy is critical — a wrong day/time sends someone to the wrong place on the wrong night — so only report what a page actually states, and cite the source URL for every item.

## Step 1 — Build the venue list (discovery)
Find as many real, currently-open Hillcrest venues as you can, across ALL categories: bars, nightclubs, LGBTQ+ venues, restaurants, cafés, breweries, wineries, dessert/bakery, coffee, fitness/wellness/yoga/pilates, arts & culture, community centers, churches, markets, and shops that host events. Use several sources:
- Google Maps / Google Search (e.g. "Hillcrest San Diego bars", "…restaurants", "…happy hour", "…things to do").
- The Hillcrest Business Association site (hillcrestsandiego.com) and its business directory / events calendar.
- Eventbrite, Meetup, and SanDiego.org / SDGLN event listings filtered to Hillcrest.
- Instagram location tag "Hillcrest, San Diego" and venue-to-venue reposts.

We ALREADY HAVE these 15 (still research them for events, but you don't need to "discover" them):
gossip-grill (@gossipgrill_), eq (@eqsandiego), the-brass-rail (@brassrailsd), negociant-winery (@negociantwinery), rich-s (@richssandiego), cork-stem (@corkandstemsd), r-place-bar-eatery (@rplacehillcrest), breakfast-bitch (@breakfastbitch_official), urban-mo-s-bar-grill (@urbanmos), alibi (@alibihillcrest), hillcrest-brewing-company (@hillcrestbrewingcompany), shift-pilates (@shift.hillcrest), reset (@resetcrossfit), first-unitarian-universalist-church-of-san-diego (@firstuusd), artreach-san-diego (@artreachsd).

Likely-missing venues to check for (not exhaustive — add any others you find): Baja Betty's, Nunu's Cocktail Lounge, #1 Fifth Avenue, Pecs Bar, Redwing Bar & Grill, Insurgent, Uptown Tavern, The Merrow, Lips San Diego, Flicks, Snooze, Hash House A Go Go, Great Maple, Bread & Cie, Extraordinary Desserts, Babycakes, Mo's Universe venues, Trilogy Sanctuary, The LOFT, Lestat's Coffee House, Gelato Vero, Pardon My French, Crest Cafe.

## Step 2 — For each venue, research website + Instagram
For every venue (the 15 known + everything you discover):
1. **Website first** — open its official site. Look for a **Happy Hour** menu/page, an **Events / Calendar** page, and a **weekly specials** page. Websites usually state recurring days/times/prices most reliably.
2. **Then Instagram** — open `instagram.com/<handle>`: read the **bio + bio link**, **pinned posts**, the **most recent ~15 posts/reels**, and any **Story Highlights** named "Events / Weekly / Happy Hour / Specials" or a weekday.
3. Extract two kinds of things:
   - **Recurring** — happy hours, weekly drag/DJ/trivia/karaoke/bingo nights, classes, services. Capture day(s) of week + start/end time + the deal/description.
   - **Upcoming one-off events** — anything with a specific date **on or after 2026-09-23** (skip past). Capture date + start time + short description.

## Rules
- **Only report what a page actually states.** Never infer or guess a day, time, or price. Read flyers in images.
- **Cite every item** with the exact source URL (website page or Instagram post/reel) where you saw it.
- **Skip past events** (before 2026-09-23) and expired promos.
- **Times:** 24-hour "HH:MM" local (4PM → "16:00"). **Days:** two-letter codes MO TU WE TH FR SA SU.
- **Coordinates:** if you can read/verify a precise street address, include it; leave lat/lng out (they'll be geocoded later).
- Venue's own site/account → `verified: true`. Third-party listing or re-posted flyer → `verified: false`.
- Prefer 2026 info. If sources conflict, use the venue's own site and lower confidence.
- If a venue is closed, inactive, or you find nothing, still list it with empty arrays and a `siteNotes` reason.

## Output — return ONE JSON code block, exactly this shape
```json
{
  "generated": "2026-09-23",
  "venues": [
    {
      "slug": "urban-mo-s-bar-grill",
      "name": "Urban MO's Bar & Grill",
      "category": "Bar",
      "address": "308 University Ave, San Diego, CA 92103",
      "website": "https://www.urbanmos.com/",
      "instagram": "@urbanmos",
      "phone": "(619) 491-0400",
      "hours": "Mon-Sun 9am-2am",
      "tagline": "Hillcrest LGBTQ+ bar, grill and dance club",
      "isNew": false,
      "siteNotes": "Active; happy hour confirmed on site + IG.",
      "happyHours": [
        {
          "label": "Martini Happy Hour",
          "days": ["FR"],
          "start": "16:00",
          "end": "19:00",
          "deals": ["$7 martinis"],
          "source": "https://www.urbanmos.com/happy-hour",
          "verified": true
        }
      ],
      "events": [
        {
          "title": "OMG: A Gay Afters",
          "date": "2026-09-27",
          "time": "22:00",
          "description": "After-hours dance party.",
          "source": "https://www.instagram.com/reel/DdcgbVshpwQ/",
          "verified": true
        }
      ]
    }
  ]
}
```

Notes on the output:
- `isNew: true` for venues NOT in the 15 we already have; `false` for the known ones.
- Include `category`, `website`, `instagram`, `phone`, `hours`, `tagline` on every venue (fill what you can find) so new ones become vendor cards.
- Return the JSON block and nothing else after it. If Instagram or a site blocks you, note it in `siteNotes` and move on — the website is often enough on its own.
