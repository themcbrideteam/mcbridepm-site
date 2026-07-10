# Product Backlog — mcbride-pm.com

Prioritized by business impact ÷ effort. Re-rank at the start of each cycle. Cycle reports live in `outputs/reports/`.

## Blocked on Noah (decisions or actions only he can take)

1. **Enable Netlify Forms (P0 — the rental-analysis form is broken in production).** Every submission to the site's primary conversion form returns 404: form detection was never enabled on the Netlify project. Noah: Netlify dashboard → site `frolicking-duckanoo-5ae7df` (mcbride-pm.com) → Forms → Enable form detection, then trigger a redeploy. Also add an email notification (Forms → Notifications) to amber@ + noah@ or submissions will sit unread. Alternatively approve the MCP `update-forms` action in a session and I'll do the rest.
2. **Testimonial provenance.** The three homepage testimonials (Sarah Mitchell, James Richardson, Patricia Thompson) have no source anywhere in the repo. If they aren't real, verbatim client quotes, they're an FTC and trust liability and must be replaced with attributed Google reviews. Confirm origin or greenlight replacement.
3. **Owner Guarantee terms.** The site asserts a tenant-placement guarantee in three places with three phrasings and no terms page. Confirm the official "McBride Owner Guarantee" terms (from `mcbride-aios/02-mcbride-pm/knowledge/`) so a guarantee page can be built and linked.
4. **Branded email.** `amber@c21magnolia.com` is the public contact on every page — off-brand post-rebrand. Create `hello@` or `owners@mcbride-pm.com` (alias to Amber) and I'll swap one line in `site.json`.
5. **Fee transparency.** Publishing at least a starting management fee would materially lift owner conversions. Needs Noah's sign-off on the number/framing.
6. **Scheduling link.** Contact page "Schedule a Consultation" currently falls back to a tel: link. A Calendly/Google booking page for Amber would restore one-click scheduling.
7. **License numbers.** Footer should carry GA/SC brokerage license numbers + Equal Housing/Realtor marks (compliance + trust). Need the actual license numbers and preferred format.
8. **Search Console / Bing verification.** `site.json → buildVerifications` is empty. If GSC is DNS-verified, fine; otherwise paste tokens and I'll wire them (and submit the sitemap + monitor the c21magnoliapm.com migration).

## Next up (I can do these without input)

9. **Real imagery program (H impact / H effort).** Site has zero real photos outside blog posts: gradient hero, no team photos on high-traffic pages. Plan: reuse strongest blog photography for the homepage hero band, pull team/office assets from Google Drive or brand assets folder, and propose a shot list for Whitney (marketing, starts mid-July).
10. **Unique city-page meta descriptions.** 9 of 10 are boilerplate; rewrite each around its actual hook (Augusta: medical/cyber; Grovetown: Fort Gordon gates; Aiken: SC licensing).
11. **City → blog spoke links.** City pages link only to /contact/; add a 3-item "owner resources" block per city and nearby-areas cross-links.
12. **Responsive images (srcset/WebP).** Images are now ~95KB avg JPEG; next step is `<picture>`/srcset variants (704w/1408w) or Netlify Image CDN, esp. for the blog hero (LCP).
13. **Self-host fonts.** WOFF2 self-hosting with size-adjusted fallbacks kills the third-party font request and swap-CLS.
14. **`dateModified` workflow.** When a post is refreshed, set `dateModified` frontmatter + visible "Updated {date}" byline (template supports it; no post uses it). Fold into the blog skill's refresh gate.
15. **sameAs enrichment.** Replace the goo.gl short link with the canonical Google Maps URL; add LinkedIn/Zillow/Yelp/BBB profiles as they exist.
16. **article:published_time / twitter:site OG tags** on posts; BlogPosting `url` property.
17. **Redirect chain** for legacy `www.c21magnoliapm.com` (two hops → one); resolve 3 TODO fallbacks (Thomson, Lincolnton, McDuffie).
18. **Guarantee page** (after #3): one page, 3–4 concrete promises, linked from every guarantee mention + trust bar item.
19. **Link-check in CI.** Add a linkinator (or the python checker from cycle 1) step to the Netlify build to stop broken internal links at the door.
20. **Homepage `og-image.jpg` refresh** to match the new hero messaging (Canva, brand template).

## Ideas (not yet validated)

- Interactive rental analysis estimator (instant range from bed/bath/zip before form submit)
- Owner onboarding checklist page mirroring the 3-step section
- Quarterly CSRA market report as a gated lead magnet (ties into blog stats)
- Neighborhood-level pages under city hubs (only if genuinely differentiated content exists)
- Review-collection loop: post-maintenance email asking happy owners for Google reviews

## Done

- **Cycle 1 (2026-07-09):** images 232.7MB→14.9MB, cache/security headers, Identity widget removal, skip link + landmarks + ARIA + contrast + reduced motion, hero/slogan/CTA hierarchy, 3-step onboarding section, dynamic blog cards, services residential alignment, FAQPage schema dedup, per-post og:image, RealEstateAgent schema, 6 broken links, custom 404, sitemap lastmod, Fort Gordon naming, brand-voice cleanup. See `outputs/reports/2026-07-09-cycle-1.md`.
