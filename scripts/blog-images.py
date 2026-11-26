#!/usr/bin/env python3
"""Lands the daily blog's images.

The blog routine makes each image through the Runway connector and commits a small
job file, image-jobs/<slug>.json, holding the download links. This script (run by
.github/workflows/blog-images.yml, or by hand) downloads each image, sizes it, saves
it as a JPEG under src/images/blog/, and removes the job file. It needs no key.

    python3 scripts/blog-images.py            # every job in image-jobs/
    python3 scripts/blog-images.py --check    # validate the job files, download nothing

Job file:
    {"slug": "my-post",
     "images": [{"file": "src/images/blog/my-post.jpg", "url": "https://…", "taskId": "…"}]}

Sizes: 1408x768 for the hero and body images, 1280x960 for "-social.jpg". A job may
set "width" and "height" on an image to override. A failed image is left out (the site
build drops a hero or figure whose file is missing) and the run exits 1 after saving
the rest, so the failure shows up in GitHub.
"""
import io
import json
import os
import re
import sys
import time
import urllib.request
from pathlib import Path
from urllib.parse import urlparse

ROOT = Path(__file__).resolve().parent.parent
JOBS = ROOT / "image-jobs"
FILE_OK = re.compile(r"^src/images/blog/[a-z0-9][a-z0-9-]*\.jpg$")
# Only Runway's own download hosts. A job file is written by our routine, but it is
# still input: nothing else gets fetched, and nothing is written outside the blog folder.
HOSTS_OK = (".cloudfront.net", ".runwayml.com")
MAX_BYTES = 40 * 1024 * 1024
SIZES = {"social": (1280, 960), "default": (1408, 768)}


def target_size(image):
    if image.get("width") and image.get("height"):
        w, h = int(image["width"]), int(image["height"])
        if not (200 <= w <= 2400 and 200 <= h <= 2400):
            raise ValueError(f"size {w}x{h} is out of range")
        return w, h
    return SIZES["social"] if image["file"].endswith("-social.jpg") else SIZES["default"]


def validate(job, name):
    problems = []
    images = job.get("images")
    if not isinstance(images, list) or not images:
        return [f"{name}: no images listed"]
    for image in images:
        file, url = image.get("file", ""), image.get("url", "")
        if not FILE_OK.match(file):
            problems.append(f"{name}: file not allowed: {file!r}")
        parsed = urlparse(url)
        host = parsed.hostname or ""
        if parsed.scheme != "https" or not host.endswith(HOSTS_OK):
            problems.append(f"{name}: url host not allowed: {host or url[:40]!r}")
        try:
            if FILE_OK.match(file):
                target_size(image)
        except (ValueError, TypeError) as err:
            problems.append(f"{name}: {file}: {err}")
    return problems


def download(url):
    last = None
    for attempt in range(3):
        try:
            request = urllib.request.Request(url, headers={"User-Agent": "blog-images/1.0"})
            with urllib.request.urlopen(request, timeout=60) as response:
                data = response.read(MAX_BYTES + 1)
            if len(data) > MAX_BYTES:
                raise ValueError("file is larger than 40 MB")
            if len(data) < 2000:
                raise ValueError(f"only {len(data)} bytes came back")
            return data
        except Exception as err:  # noqa: BLE001 - report whatever went wrong, then retry
            last = err
            time.sleep(4 * (attempt + 1))
    raise RuntimeError(f"download failed: {last}")


def save(data, dest, size):
    from PIL import Image, ImageOps

    image = Image.open(io.BytesIO(data))
    image = ImageOps.exif_transpose(image).convert("RGB")
    if min(image.size) < 500:
        raise ValueError(f"image is only {image.size[0]}x{image.size[1]}")
    image = ImageOps.fit(image, size, Image.LANCZOS, centering=(0.5, 0.5))
    dest.parent.mkdir(parents=True, exist_ok=True)
    image.save(dest, "JPEG", quality=78, optimize=True, progressive=True)


def main():
    check_only = "--check" in sys.argv
    job_files = sorted(JOBS.glob("*.json")) if JOBS.is_dir() else []
    if not job_files:
        print("no image jobs")
        return 0

    saved, failed, slugs = [], [], []
    for job_file in job_files:
        name = job_file.name
        try:
            job = json.loads(job_file.read_text())
            problems = validate(job, name)
        except (json.JSONDecodeError, AttributeError) as err:
            job, problems = None, [f"{name}: not valid JSON: {err}"]
        if problems:
            failed.extend(problems)
            if not check_only:
                job_file.unlink()
            continue
        if check_only:
            print(f"ok   {name}: {len(job['images'])} image(s)")
            continue

        slugs.append(job.get("slug") or job_file.stem)
        for image in job["images"]:
            dest = ROOT / image["file"]
            try:
                save(download(image["url"]), dest, target_size(image))
                saved.append(image["file"])
                print(f"saved {image['file']} ({dest.stat().st_size // 1024} KB)")
            except Exception as err:  # noqa: BLE001
                failed.append(f"{name}: {image['file']}: {err}")
        job_file.unlink()

    for line in failed:
        print(f"FAILED {line}")
    if check_only:
        return 1 if failed else 0
    summary = f"{', '.join(slugs) or 'no posts'} ({len(saved)} saved" + (f", {len(failed)} failed)" if failed else ")")
    Path(os.environ.get("RUNNER_TEMP", "/tmp"), "blog-images-summary.txt").write_text(summary)
    print(summary)
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
