#!/usr/bin/env python3
"""Retrofit Imagen 4 Fast images onto existing blog posts.

Reads a manifest JSON with one entry per post:
  {
    "slug": "the-post-slug",
    "hero":  {"prompt": "...", "alt": "..."},
    "body1": {"prompt": "...", "alt": "..."},
    "body2": {"prompt": "...", "alt": "..."}
  }

For each entry:
  1. Generate 3 images via Imagen 4 Fast and save to src/images/blog/
  2. Patch src/blog/<slug>.md:
       - Insert image: and imageAlt: into frontmatter (idempotent — skips if present)
       - Insert <figure class="blog-figure"> blocks at the first-third and
         second-third H2 boundaries in the body (idempotent — skips if the
         <figure> for that image is already present)

Usage:
  GEMINI_API_KEY=AIza... python3 scripts/retrofit-blog-images.py manifest.json
  GEMINI_API_KEY=AIza... python3 scripts/retrofit-blog-images.py manifest.json --only slug1,slug2
"""
import os, sys, json, base64, re, math, time
import urllib.request, urllib.error

REPO_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
IMG_DIR   = os.path.join(REPO_ROOT, "src", "images", "blog")
BLOG_DIR  = os.path.join(REPO_ROOT, "src", "blog")

API_URL = ("https://generativelanguage.googleapis.com/v1beta/"
           "models/imagen-4.0-fast-generate-001:predict")


def imagen_call(prompt: str, key: str) -> bytes:
    body = json.dumps({
        "instances": [{"prompt": prompt}],
        "parameters": {"sampleCount": 1, "aspectRatio": "16:9"},
    }).encode("utf-8")
    req = urllib.request.Request(
        f"{API_URL}?key={key}",
        data=body,
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=90) as resp:
        data = json.load(resp)
    if "error" in data:
        raise RuntimeError(data["error"].get("message", str(data["error"])))
    preds = data.get("predictions", [])
    if not preds:
        raise RuntimeError(f"no predictions in response: {data}")
    b64 = preds[0].get("bytesBase64Encoded")
    if not b64:
        raise RuntimeError(f"no bytesBase64Encoded in prediction: {preds[0]}")
    return base64.b64decode(b64)


def generate_image_with_retry(prompt: str, outfile: str, key: str) -> bool:
    """Generate one image. Returns True on success, False on terminal failure.

    Always sleeps a small amount before the request to stay under the per-minute
    rate limit. On 429, backs off progressively.
    """
    for attempt in (1, 2, 3):
        time.sleep(7)  # base inter-call gap to stay under QPM
        try:
            data = imagen_call(prompt, key)
            os.makedirs(os.path.dirname(outfile), exist_ok=True)
            with open(outfile, "wb") as f:
                f.write(data)
            print(f"    OK -> {os.path.relpath(outfile, REPO_ROOT)} ({len(data):,} bytes)")
            return True
        except urllib.error.HTTPError as e:
            print(f"    attempt {attempt} failed: HTTP {e.code} {e.reason}")
            if e.code == 429:
                time.sleep(20 * attempt)
        except (urllib.error.URLError, RuntimeError) as e:
            print(f"    attempt {attempt} failed: {e}")
            time.sleep(5 * attempt)
    return False


def split_frontmatter(text: str):
    if not text.startswith("---\n"):
        return "", text
    end = text.find("\n---\n", 4)
    if end < 0:
        return "", text
    return text[: end + 5], text[end + 5 :]


def insert_into_frontmatter(fm: str, image_path: str, image_alt: str) -> str:
    """Insert image: and imageAlt: after authorTitle: line.
    Idempotent: returns fm unchanged if image: already present."""
    if re.search(r"^image:\s", fm, re.M):
        return fm  # already has an image
    lines = fm.split("\n")
    insert_at = None
    for i, line in enumerate(lines):
        if line.startswith("authorTitle:"):
            insert_at = i + 1
            break
    if insert_at is None:
        # fall back: insert just before the closing ---
        for i in range(len(lines) - 1, -1, -1):
            if lines[i].strip() == "---":
                insert_at = i
                break
    if insert_at is None:
        return fm
    new_lines = (
        lines[:insert_at]
        + [
            f'image: "{image_path}"',
            f'imageAlt: "{image_alt}"',
        ]
        + lines[insert_at:]
    )
    return "\n".join(new_lines)


def figure_block(image_path: str, alt: str) -> str:
    return (
        f'\n<figure class="blog-figure">\n'
        f'  <img src="{image_path}" alt="{alt}" loading="lazy" width="1408" height="768">\n'
        f"</figure>\n"
    )


def insert_body_figures(body: str, body1_path: str, body1_alt: str,
                        body2_path: str, body2_alt: str) -> str:
    """Insert two figure blocks at first-third and second-third H2 boundaries.

    Idempotent: skips a figure if the same image src is already in body.
    """
    fig1 = figure_block(body1_path, body1_alt)
    fig2 = figure_block(body2_path, body2_alt)

    # Find all H2 line positions
    h2_positions = [m.start() for m in re.finditer(r"^## ", body, re.M)]
    if len(h2_positions) < 3:
        # Not enough sections — just append both figures at the end-ish
        # (rare case; safest fallback)
        return body
    n = len(h2_positions)
    third1_idx = max(1, math.ceil(n / 3))           # insert before this H2
    third2_idx = max(third1_idx + 1, math.ceil(2 * n / 3))

    # Build insertion list (sorted from end -> start so earlier inserts don't
    # shift later positions)
    inserts = []
    if body1_path not in body:
        inserts.append((h2_positions[third1_idx], fig1))
    if body2_path not in body and third2_idx < n:
        inserts.append((h2_positions[third2_idx], fig2))

    inserts.sort(key=lambda x: x[0], reverse=True)
    out = body
    for pos, block in inserts:
        out = out[:pos] + block + "\n" + out[pos:]
    return out


def process_one(entry: dict, key: str, skip_if_present: bool = True) -> dict:
    slug = entry["slug"]
    md_path = os.path.join(BLOG_DIR, f"{slug}.md")
    if not os.path.exists(md_path):
        return {"slug": slug, "status": "SKIP_NOT_FOUND"}

    raw = open(md_path).read()
    fm, body = split_frontmatter(raw)
    if skip_if_present and re.search(r"^image:\s", fm, re.M):
        return {"slug": slug, "status": "SKIP_ALREADY_IMAGED"}

    hero_path  = f"/images/blog/{slug}.jpg"
    body1_path = f"/images/blog/{slug}-2.jpg"
    body2_path = f"/images/blog/{slug}-3.jpg"

    print(f"\n>>> {slug}")
    print("  hero ...")
    hero_ok = generate_image_with_retry(
        entry["hero"]["prompt"],
        os.path.join(REPO_ROOT, "src", "images", "blog", f"{slug}.jpg"),
        key,
    )
    print("  body 1 ...")
    body1_ok = generate_image_with_retry(
        entry["body1"]["prompt"],
        os.path.join(REPO_ROOT, "src", "images", "blog", f"{slug}-2.jpg"),
        key,
    )
    print("  body 2 ...")
    body2_ok = generate_image_with_retry(
        entry["body2"]["prompt"],
        os.path.join(REPO_ROOT, "src", "images", "blog", f"{slug}-3.jpg"),
        key,
    )

    # Patch markdown
    new_fm = fm
    if hero_ok:
        new_fm = insert_into_frontmatter(fm, hero_path, entry["hero"]["alt"])
    new_body = body
    if body1_ok or body2_ok:
        new_body = insert_body_figures(
            body,
            body1_path if body1_ok else "",
            entry["body1"]["alt"] if body1_ok else "",
            body2_path if body2_ok else "",
            entry["body2"]["alt"] if body2_ok else "",
        )
    if new_fm != fm or new_body != body:
        with open(md_path, "w") as f:
            f.write(new_fm + new_body)
        return {
            "slug": slug,
            "status": "OK",
            "hero": hero_ok,
            "body1": body1_ok,
            "body2": body2_ok,
        }
    return {"slug": slug, "status": "NO_CHANGE"}


def main():
    args = sys.argv[1:]
    if not args:
        print("usage: retrofit-blog-images.py manifest.json [--only slug1,slug2]")
        sys.exit(1)
    manifest_path = args[0]
    only = None
    if len(args) > 2 and args[1] == "--only":
        only = set(args[2].split(","))

    key = os.environ.get("GEMINI_API_KEY")
    if not key:
        print("ERROR: set GEMINI_API_KEY")
        sys.exit(1)

    manifest = json.load(open(manifest_path))
    results = []
    for entry in manifest:
        if only and entry["slug"] not in only:
            continue
        try:
            r = process_one(entry, key)
            results.append(r)
        except Exception as e:
            results.append({"slug": entry["slug"], "status": "ERROR", "error": str(e)})

    print("\n=== summary ===")
    for r in results:
        print(f"  {r['slug']}: {r['status']}")


if __name__ == "__main__":
    main()
