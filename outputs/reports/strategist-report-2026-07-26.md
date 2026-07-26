# Strategist Report — 2026-07-26

## Post Published

**Slug:** `annual-property-inspection-csra-rental-landlord-guide`  
**Title:** Annual Property Inspections for CSRA Rentals: What Gets Checked and Why  
**Date:** 2026-07-26  
**Persona:** P1 (PCS military landlord managing property remotely)  
**Cluster filled:** `inspections` (coverage raised from 0.40 → 0.65)  
**Primary keyword:** `annual property inspection rental Augusta GA`

## Topic Selection Rationale

- Inspections cluster was at 0.40 coverage — second weakest after vendor-management (0.35)
- P1 persona was most underrepresented across the last 10 posts (1 out of 10 vs. target ~3)
- The vendor-management gap "how a PM handles emergency after-hours repairs" overlapped significantly with the existing `csra-rental-emergency-playbook-pcs-landlords` post (2026-06-28) — near-duplicate risk rejected it
- SC eviction process (priority queue #1) was partially covered in `south-carolina-landlord-tenant-laws-aiken-rental-owners` — eviction section already present, near-duplicate risk
- Annual inspections: completely uncovered, strong P1 fit, good trust-building signal, seasonal tie (July = mid-lease, good inspection timing), direct PDF download available (`McBride-PM_Annual-Property-Inspection.pdf`)

## Entities and Keywords Used

- O.C.G.A. § 44-7-16 (landlord right to enter)
- O.C.G.A. § 44-7-13 / Georgia Safe at Home Act (HB 404) — habitability
- O.C.G.A. § 44-7-50 (dispossessory — referenced via internal link)
- NARPM Code of Ethics (external cite)
- AppFolio inspection module
- Fort Gordon (PCS context), Evans GA, Grovetown GA, Columbia County

## Internal Links From This Post

- `/blog/hvac-csra-rental-property-landlord-guide-augusta-ga/`
- `/blog/mold-moisture-rental-property-augusta-ga-landlord-guide/`
- `/blog/appfolio-owner-portal-property-management-augusta-ga/`
- `/blog/move-in-move-out-inspection-rental-property-georgia-landlords/`
- `/blog/property-management-maintenance-vendors-csra-augusta-ga/`
- `/blog/georgia-eviction-process-landlord-guide/`
- `/blog/csra-rental-remote-management-pcs-landlord/`
- `/pdfs/McBride-PM_Operating-Expenses-Worksheet.pdf`
- `/pdfs/McBride-PM_Annual-Property-Inspection.pdf`
- `/services/`
- `/contact/`
- `/evans/`
- `/owner-faqs/`

## Internal Links TO Add (Older Posts → This Post)

These older posts should link to this new post when relevant — add on next refresh pass:

| Source post | Anchor text suggestion |
|---|---|
| `csra-rental-remote-management-pcs-landlord` | "annual property inspection program" |
| `property-management-maintenance-vendors-csra-augusta-ga` | "documented during annual inspections" |
| `appfolio-owner-portal-property-management-augusta-ga` | "inspection reports in the owner portal" |
| `move-in-move-out-inspection-rental-property-georgia-landlords` | "annual mid-lease inspections" |
| `why-hire-property-manager` | "regular property inspections" |

## Refresh Candidate (Priority)

**`fort-eisenhower-military-tenant-rental-demand-augusta`** — This post uses the deprecated "Fort Eisenhower" name throughout. Fort Gordon was reverted in 2025. Action required:
1. Create new post at slug `fort-gordon-military-tenant-rental-demand-augusta` with refreshed content (Fort Gordon naming, Balfour Beatty $50M housing investment news from May 2026, updated BAH data)
2. Add redirect in `src/_redirects`: `/blog/fort-eisenhower-military-tenant-rental-demand-augusta/ /blog/fort-gordon-military-tenant-rental-demand-augusta/ 301`
3. Log as `type: "refresh"` in published-log.json

This refresh is overdue. The slug is wrong — any internal links to it should also be updated.

## Image Status

All 5 image slots failed — Imagen API key `AIzaSyDlRo8BgIOcS2XhTHQDpT53emfAXG_lVFU` returns `API_KEY_INVALID`. This is the fifth consecutive run with image failures (2026-07-22 through 2026-07-26). Posts for these days were published text-only. **Key rotation required before next run.**

## Refreshed Priority Queue (Next 10 Topics)

1. **military-pcs REFRESH:** `fort-eisenhower` slug → `fort-gordon` with updated content + redirect (P1, fixes active accuracy issue)
2. **evictions:** South Carolina eviction process deep-dive for Aiken/North Augusta owners (P3/P4) — the existing SC landlord-tenant post covers it at ~4 paragraphs; a 2,500-word dedicated guide would not be a near-duplicate if it adds SC court procedures, Aiken County magistrate timelines, cost data, and SC vs. GA comparison table
3. **owner-education:** How property management fees actually work — flat fee vs. percentage vs. leasing fee, transparent breakdown for P3/P4 (high conversion value)
4. **vendor-management:** DIY vs. licensed contractor in Georgia — when a rental repair legally requires a pro (P2/P3, fills weakest cluster at 0.35)
5. **laws-compliance:** Service animals vs. pet policy — HUD reasonable accommodation guide for CSRA landlords (P3, high AEO value, frequently confused)
6. **hoa:** HOA violations in a CSRA rental — who's responsible, who pays, cure notice process (P2/P3)
7. **maintenance:** Plumbing and water heater repair-or-replace for CSRA rentals (P1/P3, capital planning hook)
8. **market-reports:** CSRA rental market Q3/Q4 2026 update (multi-persona)
9. **maintenance:** Winterization checklist for CSRA rentals — fall seasonal post (P3, publish September–October)
10. **accidental-landlord:** Converting a former primary residence to a rental — insurance, mortgage, tax steps (P2)
