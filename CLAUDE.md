# McBride Property Management — Site Constitution

This repo is mcbride-pm.com: Eleventy 2 static site, deployed on Netlify (push to `main` on GitHub → auto-deploy). You operate as the permanent digital product organization for this site. The full mandate is in `.claude/master-directive.md` — read it at the start of any substantive work session. This file is the condensed operating layer.

## The mandate in one line

Continuously evolve this into the highest-performing residential property management website in the United States — trust, conversion, SEO/AEO/GEO, accessibility, performance, premium brand. Never redesign for its own sake; every change must solve a real business problem.

## Business facts

- Company: McBride Property Management, Evans, GA. Serves the CSRA (Augusta GA metro + Aiken SC area). 245 active units in AppFolio (2026-10-30), goal 1,000 by 2030. Growth targets: 240 doors by end of Q3 2026, 275 by year-end.
- Audience: residential property OWNERS first (accidental landlords, military PCS families, out-of-state investors, 1–25 door investors); tenants secondary.
- One phone line for everyone: (706) 339-2874 · 609 Ponder Place Drive, Suite B, Evans, GA 30809.
- **All new inquiries go to Robert Smith, Head Property Manager — robert@mcbride-pm.com** (Noah, 2026-10-30). It is the only public email; ops@mcbride-pm.com is no longer used on the site. Amber is no longer the owner contact — don't name her anywhere. Use `site.email` / `site.contactName` from `src/_data/site.json` instead of hard-coding.
- Don't publish portfolio statistics (days on market, on-time %, vacancy) unless they're in `site.json`. The "14 days on market" and "99% on time" claims were retired 2026-10-30 because AppFolio didn't support them; the approved count is `doorsManaged` (shown as "240+").
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
- Forms: Netlify strips `data-netlify` from published HTML, so `src/js/lead.js` finds forms by their hidden `form-name` input. Netlify keeps ONE field list per form name — the homepage and /contact/ `rental-analysis` forms must keep identical fields (`page`, `source`, `address`, `fullName`, `phone`, `email`, `situation`).
- The rental-analysis form lives in a two-step `<dialog id="lead-dialog">` (`_includes/partials/lead-dialog.njk`) on every page except /contact/, which has it inline. Every "Free Rental Analysis" button (`data-open-lead="<cta>"`), the address boxes (`data-address-start="<cta>"`), and inner pages' own `main a[href="/contact/"]` buttons whose text says "Rental Analysis" open it; the `cta` lands in the `source` field and GA4 events, and `page` records the URL. `/#rental-analysis` opens it on arrival. Without JS everything falls back to /contact/.
- One look across the site (2026-10-30): `core.css` (tokens, buttons, header, dialog, mobile call bar, footer) loads everywhere, then `home.css` (homepage walkthrough) or `styles.css` (inner pages: dark glass sections over a fixed house photo picked per page in `base.njk`'s `stageMap`). Header, footer, call bar, and dialog are partials in `_includes/partials/`, used by `index.html` and `base.njk`; their behavior is `js/nav.js`. Inline colors on pages use the tokens (`var(--ink-soft)`, `var(--white)`, `var(--line)`), never light-theme hex values.
- CSS/JS are cached a day (`netlify.toml`), so templates must load them through the `v` filter (`{{ '/css/home.css' | v }}` → `?v=<content hash>`). An unversioned URL serves returning visitors yesterday's file against today's HTML — that broke the homepage for returning visitors on 2026-10-30.
- QA before anything ships: `qa/homepage-ux.mjs` (homepage: six viewports, every form path, validation, failures, keyboard, reduced motion, no-JS, rail/button geometry, video scrub) and `qa/inner-pages.mjs` (every page in the sitemap: overflow, header row, title clearance, contrast on the dark theme, wrapped buttons, every image file, dropdowns, keyboard, phone menu, dialog, contact and referral forms). Run them against a local build (`node qa/serve.mjs _site 8787`) and with `--live` against the PR's deploy preview and production — `--live` blocks every POST so no test lead reaches Netlify. Look at the screenshots too; the checks don't judge looks.
- The homepage (`src/index.html`) is a standalone Nunjucks page (no layout) with its own `home.css`/`home.js`; it pulls schema from `_includes/schema/site-graph.njk` and FAQs from its front matter.
- Blog figures whose image file is missing are dropped at build (`drop-missing-figures` transform), and the `exists` filter guards hero/share images — the auto-blog has shipped posts referencing images it never copied.

## Operating loop (every work session)

1. Audit → 2. Prioritize by impact/effort → 3. Plan → 4. Execute → 5. Verify (build passes, pages render, mobile, a11y) → 6. Commit clean → 7. Push/deploy → 8. Document in `outputs/reports/` → 9. Update `.claude/backlog.md`.

The prioritized backlog lives in `.claude/backlog.md`. Start there; leave it current when you finish.

## Decision filter

Before any change: does it improve trust, reduce friction, increase clarity, improve accessibility, increase conversion probability, strengthen premium positioning, or improve maintainability? If no — reject.

## Guardrails

- Compliance: Georgia real estate license law; affiliated-business disclosures (O.C.G.A. § 43-40-25). Never invent statistics, review counts, statutes, or citations — use real numbers or none.
- Sensitive business material stays in `mcbride-aios/00-command-center/`, never in this public repo.
- Escalate to Noah before: anything that sends external communications, publishes claims about pricing/guarantees not confirmed in `knowledge/`, or touches money/contracts/legal exposure.
