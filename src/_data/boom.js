// Boom (BoomCRM) replaces Tenant Turner on /rentals/ at 9:00 AM Eastern on Monday, November 23, 2026.
//
// One date drives two switches:
//   1. In the browser: until that moment /rentals/ shows Tenant Turner, and from that moment it
//      shows Boom, with no deploy needed (the check is in src/rentals.html).
//   2. At build time: the first build after that moment (the daily auto-blog commit) writes the
//      page with Boom only, and the Tenant Turner code is no longer shipped.
//
// To move the launch, change GO_LIVE. To preview Boom on the real page before launch, open
// /rentals/?listings=boom. For a local build of either state: BOOM_LIVE=1 or BOOM_LIVE=0.
const GO_LIVE = "2026-11-23T14:00:00Z"; // 9:00 AM EST

const forced = process.env.BOOM_LIVE;

module.exports = {
  // The page Boom gave us for the website embed. It is also the "open the listings on their own page" link.
  listingsUrl: "https://boom.rent/mcbride-property-management-1",
  // Sizes the iframe to its content, hands ad-click tags (gclid, utm_*) to Boom, and reports
  // form submits to the data layer. It has to load from boom.rent.
  embedScript: "https://boom.rent/boom-embed.js?handoffMode=auto-height",
  goLive: GO_LIVE,
  live: forced === "1" ? true : forced === "0" ? false : Date.now() >= Date.parse(GO_LIVE),
};
