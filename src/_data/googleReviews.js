// Google reviews for the homepage testimonial section.
//
// With GOOGLE_PLACES_API_KEY set (Netlify env var), fetches the live listing
// at build time via the Places API and returns only 5-star reviews. Without
// it — or on any API failure — falls back to reviews-fallback.json (verified
// quotes from the same Google listing) so a bad build never ships an empty
// section. GOOGLE_PLACE_ID env var overrides the default place id.
const fs = require("fs");
const path = require("path");

const FALLBACK = path.join(__dirname, "reviews-fallback.json");
// McBride Property Management, 609 Ponder Pl Dr Unit B, Evans, GA 30809
const DEFAULT_PLACE_ID = "ChIJYxrhbUDV-YgRkmcz85SUFB4";

module.exports = async function () {
  const fallback = JSON.parse(fs.readFileSync(FALLBACK, "utf8"));
  const key = process.env.GOOGLE_PLACES_API_KEY;
  if (!key) return fallback;

  const placeId = process.env.GOOGLE_PLACE_ID || DEFAULT_PLACE_ID;
  try {
    const url =
      "https://maps.googleapis.com/maps/api/place/details/json" +
      `?place_id=${encodeURIComponent(placeId)}` +
      "&fields=rating,user_ratings_total,reviews" +
      "&reviews_no_translations=true" +
      `&key=${encodeURIComponent(key)}`;
    const data = await fetch(url).then((r) => r.json());
    if (data.status !== "OK") throw new Error(`Places API status ${data.status}`);

    const result = data.result || {};
    const fiveStar = (result.reviews || [])
      .filter((r) => r.rating === 5 && r.text && r.text.trim())
      .map((r) => ({
        author: r.author_name || "Google user",
        text: r.text.trim(),
      }))
      .slice(0, 3);

    if (!fiveStar.length) throw new Error("no 5-star reviews with text returned");

    console.log(`[googleReviews] live: ${fiveStar.length} five-star reviews (listing ${result.rating}, ${result.user_ratings_total} total)`);
    return {
      live: true,
      rating: result.rating,
      count: result.user_ratings_total,
      reviews: fiveStar,
    };
  } catch (e) {
    console.warn(`[googleReviews] using fallback quotes: ${e.message}`);
    return fallback;
  }
};
