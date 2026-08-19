# ShellTerra Content Seeder — Handoff

Seeds public **activities** and **timemarks** into ShellTerra shells (Appwrite) from a JSON file.

## Location & run
- Folder: `C:\Users\45dtu\TOTEM_PROJECTS\shellterra-seeder`
- Node 24 (`--env-file` native), `node-appwrite@28`
- Commands (run from that folder):
  ```
  node --env-file=.env seed-activities.mjs --inspect activities <docId>   # dump a doc's shape
  node --env-file=.env seed-activities.mjs --inspect timemarks <docId>
  node --env-file=.env seed-activities.mjs --dry-run                      # build, print, write nothing
  node --env-file=.env seed-activities.mjs                                # write
  node --env-file=.env seed-activities.mjs --file food-distribution.json  # different dataset
  ```

## Environment (`.env`, gitignored)
Self-hosted Appwrite **1.8** (NOT cloud.appwrite.io). Console: `https://www.api.totempoleinc.com/console`.
```
APPWRITE_ENDPOINT=https://www.api.totempoleinc.com/v1
APPWRITE_PROJECT_ID=64e32f142f8f2ee01ea4
APPWRITE_API_KEY=<server key, scopes: rows.read + rows.write>   # "documents" is "rows" in 1.8
APPWRITE_DATABASE_ID=656ed31b3edbb2e72cba
ACTIVITIES_COLLECTION_ID=activities
TIMEMARKS_COLLECTION_ID=timemarks
SHELL_ID=<target shell $id>          # Hillcrest = 6a834820a8ef8d73e745
OWNER_USER_ID=697d09796292a72c5fdf   # from a real doc's creatorId/user_id (Auth has 0 users; phone/OTP = anonymous)
```
Owner display: nickname `donny`, avatar `🐬` (overridable via OWNER_NICKNAME / OWNER_AVATAR).

## Appwrite schema (verified via --inspect)
Write **exactly** these keys. Collections use document-level security → every doc is written with `Permission.read(Role.any())` hardcoded (NOT cloned).

**activities:** `name, description, shellID, creatorId, latitude, longitude, locationText, linkUrl, recurrence, isPrivate, creator_avatar, scale, date, startTime, endTime`
- public = `isPrivate: false`; `startTime`/`endTime` = non-padded clock strings `"9:0"`, `"14:0"`

**timemarks:** `name, description, shell_id, user_id, latitude, longitude, is_public, nickname, avatar, scale, likes_count, date`
- public = `is_public: true`; NO time-of-day field, NO location-text field (the pin is the location)

**Column caps:** timemark `description` ≤ **1000**; activity `locationText` ≤ **255**; activity `description` ≥ 2000. Exceeding → `Invalid document structure ... no longer than N chars`.

**Dates:** `date` = `YYYY-MM-DDT12:00:00.000Z` (midday UTC of the local calendar day; time-of-day lives in `startTime`). Midday avoids any US-timezone date rollover.

## Input JSON (`hillcrest-activities.json` shape)
`{ "items": [ ... ] }`, each item:
```
kind          "activity" | "timemark"
slug          stable id source (with start). Change slug/start => NEW doc; change text => updates in place.
title         -> name
description    -> description
locationName  short place name  }  activities: address||locationName -> locationText
address       full street addr   }  timemarks: ignored (no location field)
lat, lng      -> latitude, longitude   (REQUIRED — timemarks/activities need a pin)
start, end    "YYYY-MM-DDTHH:MM" local, 24h, no tz  -> date + startTime/endTime
recurrence    see below (activities only)
```
Deterministic IDs → re-running **updates**, never duplicates.

## Recurrence model (final) — NATIVE single-doc, NOT pre-expanded
The app rolls a single recurring doc forward (`displayDate` = next occurrence),
so recurring events are written as ONE doc, not many. Pre-expansion would show
every future occurrence as its own card (clutter) — don't do it.
- **weekly** — 1 doc, `recurrence: "weekly"`. App advances +7 itself (even if `start` is past).
- **monthly / annually** — **nth-weekday**, derived from `start` at read-time. A doc dated on a 3rd Saturday recurs on 3rd Saturdays; the app derives n/weekday from the date. 1 doc per pattern:
  - `"nthWeekdays": [ {"n":2,"dayOfWeek":2}, {"n":4,"dayOfWeek":2} ]` ("2nd & 4th Tue") → **2 rolling docs**, not 12.
  - `"nthWeekday": {"n":3,"dayOfWeek":5}` explicit single (optional); default derives one from `start`.
  - Seeder `dayOfWeek`: 0=Sun..6=Sat, `n` 1-based. Months with no Nth weekday (no 5th Tue) are skipped.
- **biweekly / daily** — the app's `Recurrence` enum has no such mode, so the seeder pre-expands these into one-time docs (`count` = occurrences). Avoid if possible.
- **APP DEPENDENCY**: this relies on `lib/features/shell/activity_model.dart` where monthly/annual now advance by nth-weekday (`_advanceNthWeekday`, derived from the stored date). That change ships in the app build — an OLD build treats monthly as same-date-of-month. Timemarks don't recur (always 1 doc each).

## POST-SEED — required, or nothing shows
Seeding writes content public, but the shell still gets filtered by the 9-member feed ceiling until overridden. Set on the shell's **totems** doc (`$id` = SHELL_ID): `is_private: false` **and** `public_override: true`.
- Via server key (rows.write) directly on the totems doc, OR
- Console → Functions → `set_shell_public` → Execute (POST): `{"type":"shell","shellId":"<SHELL_ID>","adminSecret":"<secret>"}`

## Status
- **Hillcrest**: dry-run clean, **21 docs** (5 activities + 16 timemarks) — recurring events are single rolling docs (market=weekly, car show=monthly 3rd-Sat). Ready to write + override.
- Build functions + recurrence verified against real schema. Multi-weekday, derived-monthly, and annual all tested green.

## TODO — Logan Heights food-distribution shell (second dataset)
Data shape differs: `name, type, address, neighborhood, phone, scheduleText, eligibility` (NO coords, NO title/start/recurrence). To seed:
1. **Geocode each `address` → `lat`/`lng`** (required; browser/Maps task).
2. Map `name` → `title`.
3. **Fold `scheduleText` + `eligibility` + `type` + `phone` into `description`** (one free-text field; there are no columns for them).
4. Derive `start` time + `end` from `scheduleText` ("...3:00 PM..." → `start "…T15:00"`).
5. Derive `recurrence` from the day pattern: "third Friday" → `nthWeekday {n:3,dayOfWeek:5}`; "second and fourth Tuesday" → `nthWeekdays [{n:2,dayOfWeek:2},{n:4,dayOfWeek:2}]`.
6. Set `SHELL_ID` to the food-distribution shell, run with `--file food-distribution.json`, then the POST-SEED override.
Watch: timemark descriptions ≤1000; keep every item's `lat`/`lng` verified against Google Maps.

## Verify
Use a **fresh local `flutter run` build** (the App Store build is stale vs 1.8 and lacks the in-app `public_override` + activities-`shellID` fixes). Check as a **non-member / Public tab** (a member sees the shell regardless of public status).
