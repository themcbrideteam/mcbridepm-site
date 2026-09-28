# McBride PM Blog Strategist Report — 2026-09-28

## Post Published

**Slug:** `maintenance-request-tenant-guide-csra-rental`
**Title:** The Right Way to Submit a Maintenance Request in Your CSRA Rental
**Persona:** P5 (tenant)
**Cluster filled:** tenant-education (primary) + technology (secondary)
**Gap addressed:** "submitting a maintenance request that gets fixed fast" (tenant-education) + "online maintenance requests + tracking — tenant-side walkthrough" (technology)
**Primary keyword:** maintenance request tenant CSRA rental
**Word count:** ~3,148
**Internal links:** 10
**External citations:** 3 (O.C.G.A. § 44-7-13 via Justia, Georgia Safe at Home Act via gaappleseed.org, AppFolio resident portal documentation)
**Schema:** BlogPosting + FAQPage + HowTo
**Images:** none — Imagen API key still returns API_KEY_INVALID (12th consecutive run; key rotation needed urgently)

## Why This Topic and Persona

P5 (tenant) was the most underrepresented persona in the recent 10-post window. The last dedicated tenant post was `renting-in-hephzibah-ga-tenant-guide` (2026-07-25). The maintenance request guide was #8 in the priority queue and matched the technology cluster gap perfectly.

Seasonal driver: Late September CSRA heating activation is a natural inflection point when maintenance requests spike — HVAC switch-over failures, pest activity picking up, doors swollen from summer humidity. The guide is immediately actionable for current residents.

No override of the gap pick was needed. The topic is substantive enough to fill 3,000+ words without padding.

## Key Content Angles Used

1. **AppFolio portal walkthrough** — step-by-step submission process, status stages (Received → Vendor Contacted → Scheduled → Completed)
2. **Emergency vs. routine decision table** — the comparison table is a strong extractable for AI overviews
3. **"Strong vs. weak description" comparison** — specific, actionable, differentiating
4. **Georgia Safe at Home Act (HB 404) / O.C.G.A. § 44-7-13** — authoritative legal grounding; Georgia has no repair-and-deduct statute (a common misconception corrected)
5. **Fall 2026 seasonal context** — HVAC switch-over, pests, door swelling from humidity

## Entities Seeded

O.C.G.A. § 44-7-13 · Georgia Safe at Home Act (HB 404) · AppFolio · Georgia Secretary of State GOALS portal · Evans GA · Grovetown GA · Martinez GA · Hephzibah GA · Columbia County · Richmond County · Fort Gordon · HUD HQS (24 CFR Part 5)

## Internal Links to Add From Older Posts → This New Post

These older posts should gain an inbound link to the new guide when next refreshed:
- `georgia-tenant-rights-2026-csra-renter-guide` → add link to maintenance request guide in the "habitability" section
- `appfolio-owner-portal-property-management-augusta-ga` → add link to tenant-side maintenance guide in the "resident portal" section
- `fall-maintenance-checklist-csra-rental-property-landlords` → add cross-reference in the intro ("your tenants can submit requests via...")
- `how-maintenance-requests-affect-tenant-retention` → add link to the tenant-side guide as the companion resource
- `georgia-security-deposit-return-csra-tenant-guide` → add link in the "documenting condition" section

## Next Refresh Candidate

**`fort-eisenhower-military-tenant-rental-demand-augusta`** — this post was already refreshed on 2026-09-16 as `fort-gordon-military-tenant-rental-demand-augusta`. The old post still exists but should get a canonical redirect in `src/_redirects` pointing to the new slug. Add:
```
/blog/fort-eisenhower-military-tenant-rental-demand-augusta/  /blog/fort-gordon-military-tenant-rental-demand-augusta/  301
```

## Updated Priority Queue (Next 8)

1. **owner-education: reading your owner statement** — what every line item means (P3/P4) [highest-impact gap remaining]
2. **maintenance: plumbing + water-heater repair-or-replace** — decision guide (P1/P3)
3. **vendor-management: how PM handles emergency after-hours repairs** — owner perspective (P3/P4)
4. **inspections: drive-by + preventive inspection cadence** — (P1/P3)
5. **accidental-landlord: converting a primary residence to a rental** — insurance, mortgage, tax steps (P2)
6. **taxes: Schedule E walkthrough for first-year CSRA landlords** — (P2/P3) [timing: November/December]
7. **leasing-screening: how to market + photograph a CSRA rental to lease fast** — (P3)
8. **tenant-education: tenant move-out + deposit-return process** — what to expect (P5)

## Image API Key Issue

The Gemini Imagen API key configured in the scheduled routine has returned `API_KEY_INVALID` for 12 consecutive runs (2026-07-22 through 2026-09-28). All 12 posts in that period were published text-only. **This requires immediate key rotation.** Noah should check the Google Cloud Console billing + API keys dashboard and rotate the key, then update the scheduled routine prompt with the new value.

Estimated financial impact of missing images: approximately 12 posts × 4 images × ~$0.02/image = ~$0.96 of lost image generation. Minimal cost impact, but significant brand impact — post visual consistency is a brand asset per BRAND_VISUAL.md.
