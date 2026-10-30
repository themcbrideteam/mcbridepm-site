const { DateTime } = require("luxon");
const crypto = require("crypto");
const fs = require("fs");

module.exports = function (eleventyConfig) {
  // Cache-busting: "/css/home.css" | v → "/css/home.css?v=<content hash>".
  // netlify.toml caches CSS/JS for a day, so an unversioned URL keeps serving
  // returning visitors yesterday's file against today's HTML.
  eleventyConfig.addFilter("v", (url) => {
    const hash = crypto.createHash("md5").update(fs.readFileSync("src" + url)).digest("hex").slice(0, 8);
    return `${url}?v=${hash}`;
  });

  // "/images/blog/x.jpg" | exists → true when the file is in src/. Guards
  // post hero and share images the auto-blog references but never saved.
  eleventyConfig.addFilter("exists", (url) => !!url && fs.existsSync("src" + url));

  // Blog figures whose image file was never saved (the auto-blog sometimes
  // skips the image step) are dropped instead of showing a broken image.
  eleventyConfig.addTransform("drop-missing-figures", (content, outputPath) => {
    if (!outputPath || !outputPath.endsWith(".html") || !content.includes("blog-figure")) return content;
    return content.replace(/<figure class="blog-figure">[\s\S]*?<\/figure>/g, (figure) => {
      const src = (figure.match(/<img[^>]+src="(\/[^"]+)"/) || [])[1];
      return src && !fs.existsSync("src" + src) ? "" : figure;
    });
  });

  // Pass through static assets
  eleventyConfig.addPassthroughCopy("src/css");
  eleventyConfig.addPassthroughCopy("src/js");
  eleventyConfig.addPassthroughCopy("src/assets");
  eleventyConfig.addPassthroughCopy("src/images");
  eleventyConfig.addPassthroughCopy("src/admin");
  eleventyConfig.addPassthroughCopy("src/og-image.jpg");
  eleventyConfig.addPassthroughCopy("src/site.webmanifest");
  eleventyConfig.addPassthroughCopy("src/favicon.ico");
  eleventyConfig.addPassthroughCopy("src/apple-touch-icon.png");
  eleventyConfig.addPassthroughCopy("src/pdfs");
  eleventyConfig.addPassthroughCopy({ "src/_redirects": "_redirects" });

  // Date filters
  eleventyConfig.addFilter("readableDate", (dateObj) => {
    return DateTime.fromJSDate(dateObj, { zone: "utc" }).toFormat("LLLL d, yyyy");
  });

  eleventyConfig.addFilter("isoDate", (dateObj) => {
    return DateTime.fromJSDate(dateObj, { zone: "utc" }).toISO();
  });

  // Blog collection sorted by date (newest first)
  eleventyConfig.addCollection("blog", function (collectionApi) {
    return collectionApi
      .getFilteredByGlob("src/blog/*.md")
      .sort((a, b) => b.date - a.date);
  });

  // Excerpt filter — first 200 chars of content
  eleventyConfig.addFilter("excerpt", (content) => {
    if (!content) return "";
    const text = content.replace(/<[^>]+>/g, "").trim();
    return text.length > 200 ? text.substring(0, 200) + "..." : text;
  });

  return {
    dir: {
      input: "src",
      output: "_site",
      includes: "_includes",
      data: "_data",
    },
    templateFormats: ["njk", "md", "html"],
    htmlTemplateEngine: "njk",
    markdownTemplateEngine: "njk",
  };
};
