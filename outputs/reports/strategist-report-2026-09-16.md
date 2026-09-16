# Strategist Report — 2026-09-16

## Action Taken: Refresh

**Type:** Refresh (slug fix + content update)
**Old slug:** `fort-eisenhower-military-tenant-rental-demand-augusta`
**New slug:** `fort-gordon-military-tenant-rental-demand-augusta`
**Date:** 2026-09-16
**Persona:** P1 (Accidental landlord / PCS military)
**Cluster:** military-pcs
**Primary keyword:** Fort Gordon rental demand Augusta GA landlords

### Why this post, why today

Priority queue item #1: URGENT refreshFlag in military-pcs cluster. The old slug contained "fort-eisenhower" — a deprecated base name (Fort Gordon reverted from Fort Eisenhower in 2025 per Army redesignation). P1 was also underrepresented in the last 10-post window (only 1 P1 post: 2026-07-26). The refresh addresses both the technical SEO issue (wrong slug) and the persona balance issue.

A redirect was added to `src/_redirects`:
`/blog/fort-eisenhower-military-tenant-rental-demand-augusta/ → /blog/fort-gordon-military-tenant-rental-demand-augusta/ 301!`

### What was updated vs. original post (2026-04-06)

The original post had ~1,500 words (below the 1,800-word floor), no FAQ frontmatter, no socialTeaser, no comparison table, outdated BAH framing, and no SCRA compliance checklist. The refresh:

- Added 2026 BAH rate data (6% increase over 2025; $1,506–$2,826/month range, sourced from DTMO/mybaseguide.com)
- Added Fort Gordon workforce data: 31,155 personnel, $2.4B economic impact (sourced from Army.mil)
- Added Army Cyber Center + Augusta University partnership news (2026)
- Added BAH rate comparison table (E-1 through O-7+ with/without dependents)
- Added SCRA compliance numbered checklist (8 steps)
- Added AHRN marketing guidance with direct link
- Added DMDC military status verification tool citation
- Added FAQ frontmatter block (8 Q&A pairs) — generates FAQPage schema
- Added socialTeaser for GBP syndication
- Expanded neighborhood breakdown with ZIP-code specificity
- Updated word count: ~2,450 body words (was ~1,500)
- Images: none — Imagen API key remains invalid

### Internal links added from this post

- `/blog/scra-lease-termination-fort-gordon-landlord-guide/`
- `/blog/csra-rental-market-fall-2026-update-investors/`
- `/blog/lease-renewal-strategies-augusta-ga-landlords/`
- `/blog/tenant-turnover-make-ready-checklist-augusta-ga-landlords/`
- `/blog/why-columbia-county-outperforms-augusta-rental-investors/`
- `/evans/`, `/grovetown/`, `/martinez/`, `/augusta/`, `/north-augusta/`
- `/contact/`, `/services/`
- `/pdfs/McBride-PM_PCS-Landlord-Quick-Start-Guide.pdf`
- `/pdfs/McBride-PM_Pre-Rental-Property-Prep-Checklist.pdf`
- `/pdfs/McBride-PM_Pet-Addendum.pdf`

**Suggestion:** Add a backlink from `/blog/fort-gordon-bah-rental-pricing-csra-2026/` to the new slug — it's the natural companion post and the BAH rates post doesn't currently link to this one.

### External citations used

- Defense Travel Management Office: travel.dod.mil/Allowances/Basic-Allowance-for-Housing/
- Military OneSource: militaryonesource.mil (SCRA guidance)
- Army.mil: Fort Gordon + Augusta University partnership article
- AHRN: ahrn.com
- DMDC: dmdc.osd.mil (military status verification)

### Next refresh candidate

`fort-gordon-bah-rental-pricing-csra-2026` — BAH numbers need updating to 2026 rates. The post likely still references 2025 figures. Check on next run.

### Refreshed priority queue (top 7)

1. **owner-education:** How property management fees actually work — transparent breakdown (P3/P4, high conversion) → coverage 0.60
2. **hoa:** HOA violations + who pays owner vs tenant (P2/P3) → coverage 0.45
3. **maintenance:** Plumbing + water-heater repair-or-replace (P1/P3) → coverage 0.50
4. **maintenance:** Winterization checklist for CSRA rentals (P3, timely — publish by early October)
5. **vendor-management:** How a PM handles emergency after-hours repairs (P3/P4) → coverage 0.55
6. **technology:** Online applications + screening tech — how applicants apply and what owners see (P3/P4) → coverage 0.40
7. **accidental-landlord:** Converting a primary residence to a rental — insurance, mortgage, tax steps (P2) → coverage 0.75

### Image status

Imagen API key `AIzaSyDlRo8BgIOcS2XhTHQDpT53emfAXG_lVFU` returns "API key not valid" — confirmed invalid for this run. All posts remain text-only. Key rotation is the blocking action for image generation. Noah should rotate the key in the Google Cloud console and update the scheduled task.
