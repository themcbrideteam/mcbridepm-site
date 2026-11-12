# McBride PM marketing studio (workspace branch)

This branch is not the website. It holds the renderer that makes McBride Property Management's social graphics and
videos, the render orders (`jobs/`), and the finished files (`out/`). **Never merge it into `main`.**

- A job file pushed to `jobs/` starts the "PM marketing studio" workflow, which renders it and commits `out/<job_id>/`.
- `out/<job_id>/manifest.json` lists every file and the facts used (rents, addresses, listing links).
- Listing data and photos come from the public AppFolio listings page at render time.
- Outputs and jobs older than 21 days are removed on each run.

The source of truth for `studio/` lives in the company vault. Edit it there and republish; do not edit it here.
