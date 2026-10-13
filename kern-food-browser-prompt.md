# Browser-extension prompt — Kern County food distributions

Paste the block below into the browser agent/extension. It pulls CAPK (the county's
Feeding America food bank) plus independent Kern County pantries/churches/mobile sites,
and emits JSON that drops into our pipeline (`prepare-food-additions.mjs`).

---

You are a food-resource data collector. Collect **free food distribution sites in Kern
County, California** and return them as JSON only.

## Where to look (visit these, then follow their locator/map/pantry-finder pages)
1. **Community Action Partnership of Kern (CAPK) Food Bank** — the county's main food
   bank. Find its site/partner/pantry locator and list every distribution site with a
   schedule. Start: https://www.capk.org/foodbank/  (and its "find food" / locator page).
2. **Golden Empire** and other Kern pantry directories, 211 Kern, Findhelp/Auntbertha
   Kern results, and Feeding America "find your local food bank" for Kern ZIPs.
3. **Independent sites**: churches, community centers, senior centers, school/CalFresh
   distributions, mobile/drive-thru pantries, CSFP senior-box sites.

## Geographic scope (Kern County — include all of these cities/areas)
Bakersfield, Delano, McFarland, Wasco, Shafter, Arvin, Lamont, Taft, Maricopa,
Tehachapi, Rosamond, Mojave, California City, Ridgecrest, Lake Isabella/Kernville,
Buttonwillow, Frazier Park/Lebec. Exclude anything outside Kern County.

## Inclusion rule
ONLY include a site if it has a **real, stated distribution schedule** (specific days +
times, or a clear recurring pattern like "2nd & 4th Thursday 9–11 AM"). Skip admin
offices, phone-only referral lines, and sites with no schedule.

## For EACH site, capture
- `title` — site name (e.g. "St. Francis Parish Food Pantry")
- `status` — the schedule text VERBATIM as published, plus eligibility notes and a
  trailing "Phone: XXX-XXX-XXXX." if listed. Preserve day/time detail exactly
  (e.g. "1st & 3rd Wed 10:00 AM–12:00 PM; drive-thru"). This field is the schedule source
  of truth for our parser — do not summarize it away.
- `address` — full street address incl. city, CA, and ZIP
- `phone` — phone if available, else ""
- `eligibility` — who can receive (e.g. "Open to all; no ID required", "Kern residents",
  "seniors 60+", "must register"), else ""
- `sourceOrg` — operating org (e.g. "CAPK", church/nonprofit name)
- `sourceUrl` — the exact page the info came from
- `lat` / `lng` — include ONLY if the page gives real coordinates; otherwise omit (we
  geocode from the address ourselves — do NOT guess coordinates)

## Rules
- Deduplicate by **street number + ZIP** (same building = one entry) — not by name. A food
  bank with several different-address sites becomes one entry per address.
- Do not invent schedules, phone numbers, or coordinates. If unknown, leave blank/omit.
- Prefer the operator's own page over third-party directories for the schedule.

## Output (JSON only, no prose)
```json
{
  "_meta": {
    "topic": "Kern County food distributions",
    "source": "<list the locator/pages you used>"
  },
  "items": [
    {
      "title": "Example Pantry",
      "status": "2nd & 4th Thursday 9:00 AM–11:00 AM; drive-thru; bring ID. Phone: 661-555-0100.",
      "address": "123 Main St, Bakersfield, CA 93301",
      "phone": "661-555-0100",
      "eligibility": "Open to all; no ID required",
      "sourceOrg": "CAPK",
      "sourceUrl": "https://www.capk.org/foodbank/"
    }
  ]
}
```
Return the complete list. If a locator paginates or filters by ZIP, iterate over all Kern
ZIPs so nothing is missed. Note in `_meta.source` anything you could not fully enumerate.
