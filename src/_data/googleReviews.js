// Google reviews for the homepage testimonial section.
//
// With GOOGLE_PLACES_API_KEY set (Netlify env var), fetches the live listing
// at build time and returns only 5-star reviews. Without it — or on any API
// failure — falls back to reviews-fallback.json (verified quotes from the
// same Google listing) so a bad build never ships an empty section.
// Optional: GOOGLE_PLACE_ID skips the text-search lookup.
const fs = require("fs");
const path = require("path");

const FALLBACK = path.join(__dirname, "reviews-fallback.json");

module.exports = async function () {
  const fallback = JSON.parse(fs.readFileSync(FALLBACK, "utf8"));
  const key = process.env.GOOGLE_PLACES_API_KEY;
  if (!key) return fallback;

  try {
    let placeId = process.env.GOOGLE_PLACE_ID;
    if (!placeId) {
      const search = await fetch("https://places.googleapis.com/v1/places:searchText", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": key,
          "X-Goog-FieldMask": "places.id,places.displayName",
        },
        body: JSON.stringify({
          textQuery: "McBride Property Management, 609 Ponder Place Drive, Evans, GA 30809",
        }),
      }).then((r) => r.json());
      placeId = search.places && search.places[0] && search.places[0].id;
    }
    if (!placeId) throw new Error("place lookup returned no result");

    const details = await fetch(`https://places.googleapis.com/v1/places/${placeId}`, {
      headers: {
        "X-Goog-Api-Key": key,
        "X-Goog-FieldMask": "rating,userRatingCount,reviews",
      },
    }).then((r) => r.json());

    const fiveStar = (details.reviews || [])
      .filter((r) => r.rating === 5 && r.text && r.text.text)
      .map((r) => ({
        author: (r.authorAttribution && r.authorAttribution.displayName) || "Google user",
        text: r.text.text.trim(),
      }))
      .slice(0, 3);

    if (!fiveStar.length) throw new Error("no 5-star reviews returned");

    console.log(`[googleReviews] live: ${fiveStar.length} five-star reviews (listing ${details.rating}★, ${details.userRatingCount} total)`);
    return {
      live: true,
      rating: details.rating,
      count: details.userRatingCount,
      reviews: fiveStar,
    };
  } catch (e) {
    console.warn(`[googleReviews] using fallback quotes: ${e.message}`);
    return fallback;
  }
};
