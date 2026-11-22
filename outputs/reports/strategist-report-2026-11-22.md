# Strategist Report — 2026-11-22

## Post Published

**Title:** Contractor No-Show at Your CSRA Rental Property: What to Do  
**Slug:** `contractor-no-show-incomplete-work-csra-rental-georgia`  
**URL:** https://mcbride-pm.com/blog/contractor-no-show-incomplete-work-csra-rental-georgia/  
**Cluster:** vendor-management  
**Persona:** P2 (accidental landlord)  
**Word count:** ~2,420  
**Internal links:** 9  
**External citations:** 4 (sos.ga.gov, O.C.G.A. §44-7-13/14, §43-41-2/10, §44-14-361)  
**Images:** none — Imagen API key invalid (57th consecutive run)  
**Schema:** BlogPosting + FAQPage + HowTo  

## Topic Selection Rationale

- `vendor-management` cluster at 0.86 coverage (tied with `hoa` at 0.85 for lowest weighted)
- Explicit priorityQueue item: "how to handle a contractor who fails to show up or ghosts you — P3/P2 follow-on to find-vet-contractors post"
- Strong P2 signal — accidental landlords lack vendor networks and are most exposed to contractor failures
- No near-duplicate in archive; existing posts cover vetting (find-vet-contractors) and emergencies, not post-failure remedies
- Strong legal hook: O.C.G.A. §44-7-13/14 habitability exposure + §43-41-10 licensing board leverage

## First-Hand Data

listings-summary.json dated 2026-11-22: 31 homes listed across Augusta metro (Evans, Augusta, Grovetown, Martinez, North Augusta, Aiken). Referenced in PM value section to show active managed portfolio.

## Coverage Map Changes

- `vendor-management` coverage: 0.86 → 0.89
- Slug added to `vendor-management.posts[]`
- PriorityQueue item "vendor-management: how to handle a contractor who fails to show up or ghosts you" removed
- `_meta.imagen_api_key` count updated: 52 → 57 consecutive failures, date range extended to 2026-11-22

## Git State Note

Repo was in a detached HEAD state at run start with 4 extra commits (Nov 18–21) that had not been pushed to `origin/main`. Those commits were left behind when `git checkout main` was run. The last published post on `main` was 2026-11-17. This post publishes into a clean, up-to-date `main`.

## Persistent Issues

**Imagen API key invalid — 57th consecutive run.** The configured Gemini API key returns HTTP 400 `API_KEY_INVALID`. All posts since 2026-07-22 have published text-only. **Escalate to Noah immediately** — key rotation needed. Every post published without hero images is missing a significant SEO and brand asset.

## Priority Queue (Updated)

1. `military-pcs`: BAH 2027 rate-change impact on CSRA rents — publish after DoD December announcement (P1)
2. `hoa`: Evans/Grovetown subdivision rental cap survey — which communities have active caps (P1/P3)
3. `market-reports`: rent growth + vacancy trend recap 2026 (P3/P4)
4. `investing`: financing options compared — conventional vs DSCR vs portfolio (P4)
5. `tenant-education`: navigating AppFolio maintenance requests (P5)
6. `accidental-landlord`: divorce + Columbia County rental — buy-out + rental conversion angle (P2)
7. `leasing-screening`: tenant communication cadence — application to lease signing (P1/P2)
