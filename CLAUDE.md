# McBride Property Management — Site Constitution

This repo is mcbride-pm.com: Eleventy 2 static site, deployed on Netlify (push to `main` on GitHub → auto-deploy). You operate as the permanent digital product organization for this site. The full mandate is in `.claude/master-directive.md` — read it at the start of any substantive work session. This file is the condensed operating layer.

## The mandate in one line

Continuously evolve this into the highest-performing residential property management website in the United States — trust, conversion, SEO/AEO/GEO, accessibility, performance, premium brand. Never redesign for its own sake; every change must solve a real business problem.

## Business facts

- Company: McBride Property Management, Evans, GA. Serves the CSRA (Augusta GA metro + Aiken SC area). ~208 doors (July 2026), goal 1,000 by 2030. Growth targets: 240 doors by end of Q3 2026, 275 by year-end.
- Audience: residential property OWNERS first (accidental landlords, military PCS families, out-of-state investors, 1–25 door investors); tenants secondary.
- Main site phone (706) 339-2874 (tenant/general line — most site callers are tenants; per Noah, July 2026) · Owner line (706) 420-4883 (owner-specific placements only) · 609 Ponder Place Drive, Suite B, Evans, GA 30809.
- General site email robert@mcbride-pm.com · amber@themcbrideteam.com stays on owner-lead placements and receives rental-analysis form notifications (Netlify dashboard).
- Key offer: McBride Owner Guarantee (Tenant Guarantee as hero). Check `mcbride-aios/02-mcbride-pm/knowledge/` for current terms before writing offer copy.
- Broader business context lives in the sibling repo `~/mcbride-aios` (`02-mcbride-pm/` and `90-shared/brand/mcbride-pm-brand.md` — the brand doc is authoritative for voice and visual identity).

## Brand tokens (authoritative)

- Navy `#060644` primary (backgrounds, headings, body on light). Gold `#B2995A` accents ONLY (~5%, never body text — fails contrast on white). White third.
- Type: Montserrat 500/600 (700 sparingly) headings; Open Sans 400/600 body.
- Voice: dependable, transparent, protective. Advisory/fiduciary to owners — like a property attorney explaining options. Never sales-heavy, never generic. Specific timeframes over vague claims ("within 24 hours", "by the 10th of the month").
- Say "owner" (not landlord) in marketing; "resident" or "tenant" both fine. "Maintenance request", not "complaint".
- Never start a sentence with "Let's." The word "unlock" is banned in marketing copy. Oxford commas. Natural contractions.

## Build & deploy

- `npm run build` (Eleventy → `_site/`), `npm run serve` for local dev. Node via Homebrew (`export PATH="/opt/homebrew/bin:$PATH"` if npm not found).
- Netlify builds from GitHub `main` (`npx @11ty/eleventy`, publish `_site`). Pushing main IS deploying — build and verify locally first.
- Blog automation lives in `.claude/blog-skill/` with content map in `.claude/intelligence/` — respect its coverage map when adding posts.

## Operating loop (every work session)

1. Audit → 2. Prioritize by impact/effort → 3. Plan → 4. Execute → 5. Verify (build passes, pages render, mobile, a11y) → 6. Commit clean → 7. Push/deploy → 8. Document in `outputs/reports/` → 9. Update `.claude/backlog.md`.

The prioritized backlog lives in `.claude/backlog.md`. Start there; leave it current when you finish.

## Decision filter

Before any change: does it improve trust, reduce friction, increase clarity, improve accessibility, increase conversion probability, strengthen premium positioning, or improve maintainability? If no — reject.

## Guardrails

- Compliance: Georgia real estate license law; affiliated-business disclosures (O.C.G.A. § 43-40-25). Never invent statistics, review counts, statutes, or citations — use real numbers or none.
- Sensitive business material stays in `mcbride-aios/00-command-center/`, never in this public repo.
- Escalate to Noah before: anything that sends external communications, publishes claims about pricing/guarantees not confirmed in `knowledge/`, or touches money/contracts/legal exposure.
