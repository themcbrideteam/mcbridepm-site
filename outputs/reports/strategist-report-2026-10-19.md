# Strategist Report — 2026-10-19

## Today's Publish

**Post:** How to Break a Lease Early in Georgia: A CSRA Renter's Complete Guide
**Slug:** `breaking-lease-early-georgia-csra-tenant-guide`
**Persona:** P5 (tenant / CSRA renter)
**Cluster filled:** `tenant-education` (gap: "how to break a lease the right way, tenant side")
**Primary keyword:** `how to break a lease early Georgia tenant`
**Word count (est. visible):** ~2,200 words
**Internal links:** 10
**External citations:** 4
**Images:** None — Imagen API key invalid for 25th consecutive run

### Why this topic

P5 (tenant) had zero posts in the 10 most recent entries (all were P3/P4/P1 owner content). The tenant-education cluster had a clear gap at "how to break a lease the right way — tenant side." The existing post on this topic (`georgia-tenant-breaks-lease-early-landlord-guide`) is written FOR landlords; today's post is written FOR tenants — different audience, different search intent, different content. Not a duplicate.

Seasonal fit: fall is when PCS movement peaks (late summer/fall transfer season) and when tenants with December lease expirations start thinking ahead. Also aligns with Q4 job relocation announcements.

### Cluster + coverage update

`tenant-education`: 0.77 → 0.85 coverage (gap filled). Authority raised to `high`.

No other clusters updated today.

---

## Internal links to add from existing posts → this new post

To build topical authority, the following older posts should link to this new guide:

| Source post | Suggested anchor text | Where to insert |
|---|---|---|
| `georgia-tenant-rights-2026-csra-renter-guide` | "breaking a lease early in Georgia" | In the section covering tenancy ending |
| `scra-lease-termination-fort-gordon-landlord-guide` | "CSRA Renter's Guide to Breaking a Lease" | In the tenant-perspective callout or FAQ |
| `maintenance-request-tenant-guide-csra-rental` | "your options if the landlord doesn't respond" | In the escalation section |
| `georgia-security-deposit-return-csra-tenant-guide` | "what happens when you break a lease early" | Near security deposit deductions section |

These cross-links are not required for today's commit but should be added in a future maintenance pass or blog refresh run.

---

## Next refresh candidate

`fort-eisenhower-military-tenant-rental-demand-augusta` — the original slug still uses "fort-eisenhower" (it was refreshed as a NEW post at the correct slug `fort-gordon-military-tenant-rental-demand-augusta` on 2026-09-16, but a redirect from the old slug to the new one should be confirmed in `src/_redirects`). Check that `/blog/fort-eisenhower-military-tenant-rental-demand-augusta/` redirects to `/blog/fort-gordon-military-tenant-rental-demand-augusta/`.

---

## Updated Priority Queue (next 5-10 topics)

1. **rent-collection-pricing**: online rent payment + autopay — tenant walkthrough (P5) [coverage 0.68]
2. **leasing-screening**: income/credit screening criteria explained, Fair-Housing-safe (P3) [coverage 0.72]
3. **laws-compliance**: habitability + local code/minimum housing standards for CSRA landlords (P3) [coverage 0.82 but high-value gap]
4. **taxes**: cost segregation for SFR rental property Georgia (P4) [coverage 0.91 — high coverage but gap is strong keyword]
5. **owner-education**: what onboarding with McBride looks like, step by step (P2) [coverage 0.82]
6. **city-guides**: Appling / north Columbia County rental guide for owners (P4) [coverage 0.72]
7. **investing**: first rental purchase step-by-step for a CSRA beginner (P3/P4) [coverage 0.80]
8. **maintenance**: emergency vs routine maintenance — owner policy and response SLA (P1/P3) [coverage 0.78]
9. **tenant-education**: how to submit and use online rent payment (P5) [coverage 0.85, but adjacent gap]
10. **technology**: AppFolio resident portal walkthrough (P5 — complements online applications post) [coverage 0.65]

**Next persona due:** P3 (small intentional landlord) — leasing-screening income/credit screening is the strongest pick. P2 (accidental landlord) is also 0 in the last 10 posts; consider owner-education onboarding topic.

---

## Imagen API Key — URGENT (25 consecutive failures)

The Imagen API key has been invalid for every run since 2026-07-22 (25 consecutive runs including today). All posts are being published text-only. This is costing SEO/visual differentiation and GBP syndication. The routine prompt key `AIzaSyDlRo8BgIOcS2XhTHQDpT53emfAXG_lVFU` also returned `API_KEY_INVALID` today. Noah must rotate the key in both the Google Cloud console and the routine's stored prompt. This has been flagged in prior reports; escalation is overdue.
