# Product Backlog — mcbride-pm.com

Prioritized by business impact ÷ effort. Re-rank at the start of each cycle. Cycle reports live in `outputs/reports/`.

## Blocked on Noah

1. **Form email notifications → robert@mcbride-pm.com (P0, 2026-10-30).** Noah ruled all new inquiries go to Robert. Notification hooks are still outside the Netlify MCP surface and there's no local CLI token. Noah in the UI: Project configuration → Notifications → Form submission notifications → Add notification → Email → robert@mcbride-pm.com (form: any, or `rental-analysis` + `realtor-referral`); remove the ops@ notification if one exists. Netlify only notifies for *verified* submissions — check the Spam list weekly until a direct n8n copy exists (idea below).
2. **Restrict the Google API key.** The Places key is live in Netlify env (secret, builds scope) and reviews sync works. Recommended hardening for Noah: Google Cloud Console → Credentials → this API key → API restrictions → restrict to "Places API" only (it currently works for any enabled API).
3. **Owner Guarantee terms.** On hold per Noah (2026-07-10): guarantee terms not yet worked through internally. Revisit when terms are final; then build the guarantee page and unify the three differing phrasings on the site.
4. **Scheduling link.** Contact page "Schedule a Consultation" currently falls back to a tel: link. A Google booking page for Robert would restore one-click scheduling.
6a. **Owner Guarantee + contract-term copy.** The site still says "Guaranteed tenant placements" and the owner/services FAQs still answer "No" to long-term contracts (Noah's July directive: don't pitch no-contracts). Needs Noah's actual terms before rewriting.
6b. **Unverified copy claims to confirm:** About page "over 50 years of combined experience" and "no franchises"; blog process claims now in the company voice (weekly work-order audit, credentials within one business day, analysis within 48 hours).
5. **Search Console / Bing verification.** Waiting on Noah (explained 2026-07-10): needs a Google Search Console property for mcbride-pm.com verified under noah@themcbrideteam.com, then either DNS verification or paste the meta-tag token into `site.json → buildVerifications`. Then submit sitemap and monitor the c21magnoliapm.com migration.

## Decided — do not re-raise

- **Fee transparency: NO.** Noah declined publishing fees (2026-07-10). Keep "custom proposal" framing.
- **License numbers in footer: NO.** Noah declined license numbers/links (2026-07-10).
- **Public email:** `robert@mcbride-pm.com` for every inquiry (Noah, 2026-10-30; supersedes the 7/10 and 7/27 ops@ choice). Amber is off the site.
- **Portfolio stats:** only what's in `site.json` (`doorsManaged`). The 14-day DOM and 99% on-time claims are retired (2026-10-30).
- **Testimonials:** the three quotes are real Google-review clients (Noah confirmed 2026-07-10); direction is live 5-star Google reviews only (see #2).

## Next up (no input needed)

6. **Real imagery program (H impact / H effort).** Zero real photos outside blog posts: gradient hero, no team photos. Plan: reuse strongest blog photography for a homepage hero band, pull team/office assets from Google Drive or brand assets, propose a shot list for Whitney (marketing, starts mid-July).
7. **Unique city-page meta descriptions.** 9 of 10 are boilerplate; rewrite each around its actual hook (Augusta: medical/cyber; Grovetown: Fort Gordon gates; Aiken: SC licensing).
8. **City → blog spoke links.** City pages link only to /contact/; add a 3-item "owner resources" block per city and nearby-areas cross-links.
9. **Responsive images (srcset/WebP).** Images are now ~95KB avg JPEG; next: `<picture>`/srcset variants (704w/1408w) or Netlify Image CDN, esp. the blog hero (LCP).
10. **Self-host fonts.** WOFF2 with size-adjusted fallbacks kills the third-party font request and swap-CLS.
11. **`dateModified` workflow.** On refreshed posts set `dateModified` + visible "Updated {date}" byline; fold into the blog skill's refresh gate.
12. **Auto-blog image optimization.** New auto-blog posts land with ~1.5MB JPEGs; either fold `scripts/optimize-blog-images.js` into the blog pipeline or run it each cycle (it skips already-optimized files).
13. **article:published_time / twitter:site OG tags** on posts; BlogPosting `url` property.
14. **Redirect chain** for legacy `www.c21magnoliapm.com` (two hops → one); resolve 3 TODO fallbacks (Thomson, Lincolnton, McDuffie).
15. **Link-check in CI.** Add a link checker to the Netlify build to stop broken internal links at the door.
16. **Homepage `og-image.jpg` refresh** to match the new hero messaging (Canva, brand template).
17. **sameAs enrichment (partial done).** Canonical Maps CID URL added 2026-07-10; still add LinkedIn/Zillow/Yelp/BBB as they exist.

## Ideas (not yet validated)

- Direct lead copy to n8n (sendBeacon from `lead.js`) that emails Robert and logs the lead, so Akismet-held submissions can't be missed
- Swap the /rentals/ Tenant Turner widget for Boom listings when Tenant Turner is cancelled (AppFolio listings link is the fallback already on the page)

- Interactive rental analysis estimator (instant range from bed/bath/zip before form submit)
- Owner onboarding checklist page mirroring the 3-step section
- Quarterly CSRA market report as a gated lead magnet (ties into blog stats)
- Review-collection loop: post-maintenance email asking happy owners for Google reviews (feeds #2)

## Done

- **Cycle 3 (2026-10-30):** Homepage lead capture: address-first hero form, full `rental-analysis` form in the Handoff chapter (AJAX, on-page success, page/UTM/situation fields), mobile sticky CTA, renter path in hero + renters band. Amber removed site-wide (6 pages + 99 posts; blog skill + published-log fixed so new posts don't re-add her); every public email → robert@. AEO/GEO: homepage now carries the full schema graph + 7-question FAQPage, keyword H1, GA4, favicons, NAP footer, `#all-areas` section (fixed the broken nav anchor on every inner page); llms.txt history/stats corrected. Retired the unverified 14-day/99% stats everywhere. /thank-you/ and /referral-thank-you/ created (referral form was landing on a 404). main.js form handler never ran on prod (bound to `[data-netlify]`, which Netlify strips) — replaced by `lead.js`. Root favicon.ico/apple-touch-icon.png (were 404ing). Video now preload=none + JS picks the encode (phones no longer risk the 45 MB file). Fixed 10 broken /blog/ links. Report: `outputs/reports/2026-10-30-cycle-3.md`.

- **Cycle 2b (2026-07-10):** Google reviews live-sync ACTIVE — key provided by Noah, pipeline switched to legacy Places API (the service enabled on his project), place id ChIJYxrhbUDV-YgRkmcz85SUFB4 baked in, key stored as secret Netlify env var (builds scope). Homepage now renders real 5-star reviews + "Rated 4.9 of 5 by 7 reviewers" line, refreshed on every build (daily via auto-blog).
- **Cycle 2 (2026-07-10):** Netlify Forms verified live end-to-end (test submission stored + deleted); public email → ops@mcbride-pm.com site-wide (14 files); testimonials rebuilt as attributed Google reviews with GBP link + Places-API live-sync pipeline; canonical Maps URL in sameAs.
- **Cycle 1 (2026-07-09):** images 299MB→19MB, cache/security headers, Identity widget removal, a11y pass (skip link, landmarks, ARIA, contrast, reduced motion), hero/slogan/CTA hierarchy, 3-step onboarding section, dynamic blog cards, services residential alignment, FAQPage schema dedup, per-post og:image, RealEstateAgent schema, 6 broken links, custom 404, sitemap lastmod, Fort Gordon naming, brand-voice cleanup. See `outputs/reports/2026-07-09-cycle-1.md`.
