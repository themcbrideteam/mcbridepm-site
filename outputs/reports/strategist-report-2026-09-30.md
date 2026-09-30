# Strategist Report — 2026-09-30

## Post Published Today

**Title:** Cash for Keys vs. Eviction in Georgia: When to Negotiate, When to File
**Slug:** `cash-for-keys-vs-eviction-georgia-csra-landlords`
**URL:** https://mcbride-pm.com/blog/cash-for-keys-vs-eviction-georgia-csra-landlords/
**Persona:** P4 (out-of-state investor; remote owner who can't manage disputes in person)
**Cluster:** evictions (was 0.55 → now 0.68)
**Primary keyword:** "cash for keys Georgia landlord"
**Gap filled:** "cash-for-keys vs eviction decision in Georgia" — removed from evictions gaps[]
**Word count (approx body):** ~2,200
**Internal links:** 9 (grovetown city page, 4 sibling blog posts, owner-faqs, services, contact, CSRA Field Guide PDF)
**External citations:** 3 (Georgia Appleseed Safe at Home Act ×2, Justia O.C.G.A. Title 44-7)
**Schema:** BlogPosting, FAQPage, HowTo
**Images:** NONE — Imagen API key invalid (12th consecutive run, key returns API_KEY_INVALID)

## Why This Topic Today

- Evictions cluster was tied for weakest (0.55 coverage with leasing-screening, rent-collection-pricing, vendor-management)
- P4 (out-of-state investor) was underrepresented in the last 10 posts (last P4 post was 2026-09-13)
- Cash-for-keys vs eviction is a genuine decision point that remote owners face; no existing post covered it
- Seasonal: Q4 is when landlords want problem-tenant situations resolved before year-end; timing is strong
- Previous post (2026-09-29, P2 conversion checklist) set up a logical companion — converting owners need to know what happens if a placement goes wrong

## Internal Links to Add From Existing Posts → New Post

These older posts should eventually link to this new post as a "next step" or related resource. Adding these is a job for the next time those files are touched or refreshed:

- `georgia-eviction-process-landlord-guide.md` → add a link to cash-for-keys post in the "before you file" section
- `georgia-tenant-late-rent-landlord-guide.md` → add a link when the nonpayment situation escalates to "eviction or negotiation"
- `true-cost-self-managing-rental-property-csra.md` → eviction risk is a cost self-managers often underestimate; link to cash-for-keys post as a risk illustration

## Next Refresh Candidate

**`fort-eisenhower-military-tenant-rental-demand-augusta.md`** (date 2026-04-06) — this post uses Fort Eisenhower in the slug and possibly in body text (the fort was renamed back to Fort Gordon in 2025). It should either be refreshed at the current slug with updated copy, or a new post published at the correct slug with a redirect from the old one. This should be treated as a `refreshFlag` action.

## Updated Priority Queue (next 10 topics)

1. **owner-education: reading your owner statement — what every line item means** (P3/P4) — cluster 0.75, but this post ties directly to the AppFolio portal post and would complete the "owner reporting" mini-cluster; high conversion value
2. **maintenance: plumbing + water-heater repair-or-replace decision guide** (P1/P3) — cluster 0.62; practical, evergreen, strong search demand; good seasonal fit for fall
3. **vendor-management: how PM handles emergency after-hours repairs** (P3/P4) — cluster 0.55; complements the emergency playbook post; trust-builder for remote owners
4. **taxes: Schedule E walkthrough for first-year CSRA landlords** (P2/P3) — cross-links beautifully to the 9/29 conversion post; high-value Q4 timing (October = tax planning season)
5. **leasing-screening: how to market + photograph a CSRA rental to lease fast** (P3) — cluster 0.55; practical how-to; strong SEO demand
6. **inspections: drive-by + preventive inspection cadence** (P1/P3) — cluster 0.65; P1 is due in rotation; short post but substantive
7. **accidental-landlord: divorce + the marital rental property in Georgia** (P2) — cluster 0.85 but genuine gap; unique angle; sensitive topic done right = high trust signal
8. **evictions: dispossessory in Richmond vs Columbia County magistrate court** (P3/P4) — natural follow-on to today's post; specific local knowledge readers can't find elsewhere
9. **insurance: requiring + verifying tenant renters insurance — owner process** (P3) — cluster 0.60; practical and under-covered
10. **technology: online maintenance requests + tracking — tenant-side walkthrough** (P5) — P5 is due; complements existing maintenance-request guide

## Critical Standing Issue: Imagen API Key

The Imagen API key configured in the routine prompt has returned API_KEY_INVALID on every run from 2026-07-22 through today (12 consecutive runs). All 12+ posts since July 22 have been published without images.

**Impact:** Every post is missing its hero image (affects OG card, blog listing visual, and first impression), two body images (visual break + E-E-A-T signal), and social image (GBP syndication). This is a material content-quality gap accumulating daily.

**Action required:** Noah must rotate the Google Cloud API key for this project and update the routine prompt with the new key value. Until that happens, every run will publish text-only.

Posts needing retroactive images (in priority order for retroactive fill):
- All posts dated 2026-07-22 through 2026-09-30 (12+ posts)
- Retroactive image generation: run the Imagen calls for each slug and push the images + updated frontmatter in a single batch commit
