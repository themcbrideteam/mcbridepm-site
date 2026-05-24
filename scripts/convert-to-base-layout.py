"""Convert a standalone .html page into a base.njk-using template.

Usage: python3 scripts/convert-to-base-layout.py src/services.html

The script:
  1. Preserves existing YAML frontmatter (breadcrumbs, faqs, howTo, etc.)
  2. Extracts <title>, meta description, OG/Twitter meta into frontmatter
  3. Detects the topbar text and adds `topbarText:` if non-default
  4. Extracts inline <style> blocks into a {% block head %}
  5. Extracts the body content between the last </nav> and the first <footer>
  6. Extracts inline <script> blocks (excluding NetlifyIdentity duplicate) into {% block scripts %}
  7. Writes a new file with `layout: base.njk` and the extracted content
"""
import re, sys, os

PAGE_TOPBAR_OVERRIDES = {
    'index':         '',  # default
    'services':      '',  # the original "Call us:..." can drop — base default is fine
    'about':         'Serving Augusta, Georgia and Aiken, South Carolina',
    'contact':       'Serving Augusta, Georgia and Aiken, South Carolina',
    'why-hire':      'Professional Property Management in Augusta, GA',
    'rentals':       'Available Rentals across the CSRA',
    'referral':      'Realtor Referral Program — McBride Property Management',
    'augusta':       'Professional Property Management in Augusta, GA',
    'evans':         'Professional Property Management in Evans, GA',
    'martinez':      'Professional Property Management in Martinez, GA',
    'grovetown':     'Professional Property Management in Grovetown, GA',
    'north-augusta': 'Professional Property Management in North Augusta, SC',
    'aiken':         'Professional Property Management in Aiken, SC',
}

def split_frontmatter(src):
    if src.startswith('---\n'):
        end = src.find('\n---\n', 4)
        if end > 0:
            return src[:end+5], src[end+5:]
    return '', src

def extract(pattern, src, group=1, default=''):
    m = re.search(pattern, src, re.S | re.I)
    return m.group(group).strip() if m else default

def yaml_quote(s):
    return '"' + s.replace('\\','\\\\').replace('"','\\"') + '"'

def convert(path):
    raw = open(path).read()
    slug = os.path.basename(path).replace('.html','')

    existing_fm, body_html = split_frontmatter(raw)

    # Extract metadata
    title = extract(r'<title>([^<]*)</title>', body_html)
    desc = extract(r'name=["\']description["\']\s+content=["\']([^"\']*)["\']', body_html)
    og_title = extract(r'property=["\']og:title["\']\s+content=["\']([^"\']*)["\']', body_html)
    og_desc = extract(r'property=["\']og:description["\']\s+content=["\']([^"\']*)["\']', body_html)
    og_image = extract(r'property=["\']og:image["\']\s+content=["\']([^"\']*)["\']', body_html)
    keywords = extract(r'name=["\']keywords["\']\s+content=["\']([^"\']*)["\']', body_html)

    # Extract inline <style> blocks
    styles = re.findall(r'<style[^>]*>.*?</style>', body_html, re.S)

    # Extract body inner content
    last_nav = body_html.rfind('</nav>')
    if last_nav < 0:
        # Fallback: between <body> and <footer>
        last_nav = body_html.find('<body')
        last_nav = body_html.find('>', last_nav) + 1 if last_nav >= 0 else 0
    first_footer = body_html.find('<footer', last_nav)
    if first_footer < 0:
        # Fallback: to </body>
        first_footer = body_html.rfind('</body>')

    inner = body_html[last_nav:first_footer]
    # Drop the closing </nav> if present at start
    inner = re.sub(r'^\s*</nav>\s*', '', inner)

    # Extract <script> blocks between <footer>...</body> (preserve non-NetlifyIdentity scripts)
    tail = body_html[first_footer:]
    scripts = re.findall(r'<script[^>]*>.*?</script>', tail, re.S)
    keep_scripts = []
    for s in scripts:
        # Drop main.js include — base.njk has it
        if '/js/main.js' in s: continue
        # Drop NetlifyIdentity inline — base.njk has it
        if 'netlifyIdentity' in s: continue
        keep_scripts.append(s)

    # Build new frontmatter
    fm_lines = ['---', 'layout: base.njk']
    if title:
        fm_lines.append(f'title: {yaml_quote(title)}')
    if desc:
        fm_lines.append(f'description: {yaml_quote(desc)}')
    if og_title and og_title != title:
        fm_lines.append(f'ogTitle: {yaml_quote(og_title)}')
    if og_desc and og_desc != desc:
        fm_lines.append(f'ogDescription: {yaml_quote(og_desc)}')
    if og_image:
        fm_lines.append(f'ogImage: {yaml_quote(og_image)}')
    if keywords:
        fm_lines.append(f'keywords: {yaml_quote(keywords)}')

    topbar_override = PAGE_TOPBAR_OVERRIDES.get(slug, '')
    if topbar_override:
        fm_lines.append(f'topbarText: {yaml_quote(topbar_override)}')

    # Preserve existing frontmatter content (breadcrumbs, faqs, etc.)
    if existing_fm:
        # Strip the wrapping --- markers
        existing_inner = existing_fm[4:-5].rstrip()
        # Skip lines we've already set
        already_set = {'layout','title','description','ogTitle','ogDescription','ogImage','keywords','topbarText'}
        kept = []
        skip = False
        for line in existing_inner.split('\n'):
            key_match = re.match(r'^([a-zA-Z_][a-zA-Z0-9_]*)\s*:', line)
            if key_match:
                key = key_match.group(1)
                skip = key in already_set
            if not skip:
                kept.append(line)
        if kept:
            fm_lines.extend(kept)

    fm_lines.append('---')
    fm = '\n'.join(fm_lines) + '\n'

    # Build new body
    body_out = ''
    if styles:
        body_out += '\n{% block head %}\n'
        for s in styles:
            body_out += s + '\n'
        body_out += '{% endblock %}\n'

    body_out += '\n{% block content %}\n'
    body_out += inner.rstrip()
    body_out += '\n{% endblock %}\n'

    if keep_scripts:
        body_out += '\n{% block scripts %}\n'
        for s in keep_scripts:
            body_out += s + '\n'
        body_out += '{% endblock %}\n'

    return fm + body_out

if __name__ == '__main__':
    for path in sys.argv[1:]:
        out = convert(path)
        # Write to a .njk-style file next to original for review
        # but actually overwrite the original .html (Eleventy still processes .html with njk)
        # We need a NEW name so we don't conflict; let's write to .converted for review then user moves
        new_path = path  # overwrite in place
        open(new_path, 'w').write(out)
        print(f'CONVERTED: {path}  ({len(out)}b)')
