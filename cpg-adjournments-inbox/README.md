# CPG adjournment drop folder

Drop meeting-cancellation notices here as `.eml`, `.txt`, or `.md` files. The next
run of `node fetch-cpg-adjournments.mjs` reads every file in this folder, figures
out which group + which meeting date each one refers to, and writes matching
`source:"email"` entries into `../cpg-adjournments.json`.

- `.eml` — a saved/forwarded email. The `Subject:` header and the first text body
  part are used.
- `.txt` / `.md` — plain text. The first line is treated as the subject.

What a notice needs to match automatically:
- **A status word** — *cancelled*, *adjourned*, *rescheduled* / *postponed*,
  or "no quorum".
- **The group name** — enough distinctive words to identify one group
  (e.g. "Pacific Beach", "Rancho Peñasquitos").
- **A date** — "October 13", "10/13", or "2026-10-13". If the group has exactly
  one upcoming meeting, the date can be omitted.

Anything the script can't pin to a single real meeting is listed under
`_meta.review` in `cpg-adjournments.json` (and printed to the console) for a human
to handle — it is never guessed onto the wrong meeting.

`sample-notice.txt` here is a harmless example used to test the parser; delete it
in production. Processed `.eml`/`.txt` files are NOT auto-deleted — clear them out
once their entries are in the JSON (Gmail messages can auto-mark-read instead; see
the header of `fetch-cpg-adjournments.mjs`).
