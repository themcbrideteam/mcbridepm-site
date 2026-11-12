#!/usr/bin/env python3
"""McBride PM marketing studio: turns a job file into finished images and videos.

    python3 studio/studio.py jobs/2026-12-01-0515.json [more jobs...]

Runs on GitHub Actions (branch social-studio of themcbrideteam/mcbridepm-site) and on a Mac with Chrome.
The daily routine writes the job; this script renders it to out/<job_id>/ and writes out/<job_id>/manifest.json
with every file, the facts it used (rents, addresses, listing links), and any task that failed.

Looks come from the house style Noah picked 2026-11-02 (Signature PM, The Rent Board, polaroids, the receipt,
creator-caption Reel covers). Real photos only: AppFolio listing photos, Whitney's uploads, the library.
Source of truth for this file: the vault, property-management/systems/marketing-engine/studio/. Edit there, then
publish with build/publish_studio.sh. Never edit the copy on the branch.
"""
import os, sys, re, json, html, hashlib, shutil, subprocess, tempfile, datetime, urllib.request, traceback

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
ASSETS = os.path.join(HERE, 'assets')
CACHE = os.path.join(ROOT, '.cache')
DATA = os.path.join(ROOT, 'data')
LIBRARY = os.path.join(ROOT, 'library')
FONTS = 'file://' + os.path.join(ASSETS, 'fonts.css')
LOGO_NAVY = 'file://' + os.path.join(ASSETS, 'logo-navy.png')     # gold mark on navy
LOGO_WHITE = 'file://' + os.path.join(ASSETS, 'logo-white.png')   # navy mark on white
PM_PHONE = '706.339.2874'
LISTINGS_URL = 'https://c21magnolia.appfolio.com/listings'
UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36'

AREAS = {
    'columbia': {'Evans', 'Martinez', 'Grovetown', 'Harlem', 'Appling'},
    'richmond': {'Augusta', 'Hephzibah', 'Blythe', 'Fort Gordon'},
    'aiken': {'North Augusta', 'Aiken', 'Graniteville', 'Beech Island', 'Warrenville', 'Clearwater', 'Belvedere', 'Edgefield', 'Trenton'},
}
AREA_LABEL = {'columbia': 'Columbia County', 'richmond': 'Augusta', 'aiken': 'Aiken County, SC', 'all': 'the CSRA'}


class TaskError(Exception):
    pass


# ------------------------------------------------------------------ tools
def chrome():
    for c in (os.environ.get('CHROME'), shutil.which('google-chrome'), shutil.which('google-chrome-stable'), shutil.which('chromium'),
              shutil.which('chromium-browser'), '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'):
        if c and os.path.exists(c):
            return c
    raise SystemExit('No Chrome found. Set CHROME=/path/to/chrome')


def ffmpeg():
    f = shutil.which('ffmpeg')
    if f:
        return f
    try:
        import imageio_ffmpeg
        return imageio_ffmpeg.get_ffmpeg_exe()
    except Exception:
        raise TaskError('ffmpeg is not installed here; video looks only render on the GitHub runner')


def run(cmd, timeout=600):
    p = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, timeout=timeout)
    if p.returncode != 0:
        raise TaskError('command failed: ' + ' '.join(map(str, cmd[:6])) + ' ... ' + p.stderr.decode('utf8', 'replace')[-600:])
    return p


def fetch(url, dest, timeout=90):
    os.makedirs(os.path.dirname(dest), exist_ok=True)
    if os.path.exists(dest) and os.path.getsize(dest) > 0:
        return dest
    req = urllib.request.Request(url, headers={'User-Agent': UA})
    try:
        with urllib.request.urlopen(req, timeout=timeout) as r, open(dest + '.part', 'wb') as f:
            shutil.copyfileobj(r, f)
    except Exception as ex:
        raise TaskError(f'could not download {url[:120]}: {ex}')
    os.replace(dest + '.part', dest)
    return dest


def e(s):
    """Escape copy but keep <em> emphasis."""
    s = html.escape(str(s or ''), quote=False)
    return s.replace('&lt;em&gt;', '<em>').replace('&lt;/em&gt;', '</em>')


def nice_date(d):
    dt = datetime.date.fromisoformat(d)
    return dt.strftime('%b. ') + str(dt.day)


# ------------------------------------------------------------------ listings (public AppFolio page)
def parse_listings(page):
    out = []
    for card in re.split(r'<div class="listing-item result js-listing-item"', page)[1:]:
        def g(pat, default=''):
            m = re.search(pat, card, re.S)
            return html.unescape(re.sub(r'\s+', ' ', m.group(1)).strip()) if m else default
        uid = g(r'/listings/detail/([0-9a-f-]{36})')
        if not uid:
            continue
        address = g(r'js-listing-address">(.*?)</span>')
        m = re.match(r'^(.*?),\s*([^,]+),\s*([A-Z]{2})\s*(\d{5})?', address)
        street, city, state, zipc = (m.group(1), m.group(2), m.group(3), m.group(4) or '') if m else (address, '', '', '')
        street = re.sub(r'\b(Ct)\b\.?', 'Court', street)
        img = g(r'data-original="([^"]+)"')
        facts = dict(re.findall(r'<dt class="detail-box__label">\s*(.*?)\s*</dt>\s*<dd class="detail-box__value[^"]*">\s*(.*?)\s*</dd>', card, re.S))
        desc = g(r'js-listing-description">(.*?)</p>')
        desc = re.sub(r'<br\s*/?>', ' ', desc)
        out.append({
            'id': uid, 'address': address, 'street': street, 'city': city.strip(), 'state': state, 'zip': zipc,
            'title': g(r'js-listing-title">\s*<a[^>]*>(.*?)</a>'),
            'rent': re.sub(r'\s+', '', facts.get('RENT', '')), 'sqft': facts.get('Square Feet', '').strip(),
            'bedbath': re.sub(r'\s+', ' ', facts.get('Bed / Bath', '')).strip(),
            'avail': re.sub(r'\s+', ' ', facts.get('Available', '')).strip(),
            'pets': g(r'js-listing-pet-policy">.*?</span>\s*(.*?)</span>'),
            'img': img.replace('/medium.jpg', '/large.jpg') if img else '',
            'url': f'https://c21magnolia.appfolio.com/listings/detail/{uid}',
            'description': re.sub(r'\s+', ' ', desc)[:600],
        })
    return out


_LISTINGS = None
def listings(refresh=False):
    global _LISTINGS
    if _LISTINGS is not None and not refresh:
        return _LISTINGS
    os.makedirs(DATA, exist_ok=True)
    path = os.path.join(DATA, 'listings.json')
    try:
        req = urllib.request.Request(LISTINGS_URL, headers={'User-Agent': UA})
        page = urllib.request.urlopen(req, timeout=60).read().decode('utf8', 'replace')
        rows = parse_listings(page)
        if not rows:
            raise TaskError('the AppFolio listings page returned no listings')
        json.dump({'pulled_at': datetime.datetime.utcnow().isoformat() + 'Z', 'source': LISTINGS_URL, 'listings': rows}, open(path, 'w'), indent=1)
        _LISTINGS = rows
    except Exception as ex:
        if os.path.exists(path):
            _LISTINGS = json.load(open(path))['listings']
            print('WARN listings pull failed, using saved copy:', ex)
        else:
            raise TaskError(f'could not read the AppFolio listings page: {ex}')
    return _LISTINGS


def in_area(l, area):
    if area in (None, '', 'all'):
        return True
    if area == 'aiken':
        return l['state'] == 'SC' or l['city'] in AREAS['aiken']
    return l['city'] in AREAS.get(area, set())


def rent_num(l):
    try:
        return int(re.sub(r'[^\d]', '', l['rent']) or 0)
    except ValueError:
        return 0


def listing_photo(l):
    if not l.get('img'):
        raise TaskError(f'listing {l["id"]} has no photo')
    return fetch(l['img'], os.path.join(CACHE, 'listings', l['id'] + '.jpg'))


def gallery(l, n=8):
    """Photo URLs from a listing's detail page, in the order AppFolio shows them."""
    dest = os.path.join(CACHE, 'detail', l['id'] + '.html')
    fetch(l['url'], dest)
    page = open(dest, encoding='utf8', errors='replace').read()
    ids = []
    for m in re.finditer(r'https://images\.cdn\.appfolio\.com/c21magnolia/images/([0-9a-f-]{36})/(?:large|medium|small)\.(?:jpg|jpeg|png)', page):
        if m.group(1) not in ids:
            ids.append(m.group(1))
    return [fetch(f'https://images.cdn.appfolio.com/c21magnolia/images/{i}/large.jpg', os.path.join(CACHE, 'gallery', i + '.jpg')) for i in ids[:n]]


# ------------------------------------------------------------------ photo references
def photo(ref, seed=''):
    """listing:<uid> | listing:auto | drive:<fileId> | url:<https...> | lib:<file in library/> | repo:<path in branch>"""
    if not ref:
        raise TaskError('a photo reference is missing')
    kind, _, val = ref.partition(':')
    if kind == 'listing':
        ls = listings()
        if val in ('', 'auto'):
            pool = [l for l in ls if l.get('img')]
            if not pool:
                raise TaskError('no listing photos available')
            l = pool[int(hashlib.md5(seed.encode()).hexdigest(), 16) % len(pool)]
        else:
            l = next((x for x in ls if x['id'].startswith(val)), None)
            if not l:
                raise TaskError(f'listing {val} is not on the AppFolio page any more')
        return listing_photo(l)
    if kind == 'drive':
        dest = os.path.join(CACHE, 'drive', val)
        fetch(f'https://drive.usercontent.google.com/download?id={val}&export=download&confirm=t', dest)
        head = open(dest, 'rb').read(600).lower()
        if b'<html' in head or b'<!doctype' in head:
            os.remove(dest)
            raise TaskError(f'Drive file {val} is not shared by link, so the studio cannot read it')
        return dest
    if kind == 'url':
        return fetch(val, os.path.join(CACHE, 'url', hashlib.md5(val.encode()).hexdigest() + os.path.splitext(val.split('?')[0])[1][:5]))
    if kind == 'lib':
        p = os.path.join(LIBRARY, val)
        if not os.path.exists(p):
            raise TaskError(f'library/{val} does not exist')
        return p
    if kind == 'repo':
        p = os.path.join(ROOT, val)
        if not os.path.exists(p):
            raise TaskError(f'{val} does not exist on the branch')
        return p
    raise TaskError(f'unknown photo reference {ref}')


def furl(path):
    return 'file://' + path


# ------------------------------------------------------------------ CSS (house style, PM)
BASE = """
:root{--navy:#060644;--gold:#B2995A;--gold-ink:#8a7339;--white:#fff;--tint:#F4F4F8;--n70:rgba(6,6,68,.72);--n55:rgba(6,6,68,.55);--n12:rgba(6,6,68,.12);
--w85:rgba(255,255,255,.86);--w60:rgba(255,255,255,.6);--h:"Montserrat","Helvetica Neue",Arial,sans-serif;--b:"Open Sans","Helvetica Neue",Arial,sans-serif}
*{box-sizing:border-box;margin:0;padding:0}
html,body{width:WPX;height:HPX;overflow:hidden;background:BGC}
.c{position:relative;width:WPX;height:HPX;overflow:hidden;font-family:var(--b);color:var(--navy)}
.cover{background-size:cover;background-position:center;background-repeat:no-repeat}
.eb{font:700 20px/1.2 var(--h);letter-spacing:.26em;text-transform:uppercase}
.legal{font:600 14px/1.3 var(--h);letter-spacing:.18em;text-transform:uppercase}
.sw{font:700 17px/1 var(--h);letter-spacing:.16em}
em{font-style:normal}
"""

PM_CSS = """
.pm{background:#fff}
.wm{position:absolute;left:0;top:0;height:96px;display:flex;align-items:center;gap:4px;padding-right:30px;background:var(--navy);z-index:3}
.wm img{width:96px;height:96px} .wm span{font:500 15px/1.2 var(--h);letter-spacing:.26em;color:#fff}
.ft{position:absolute;left:72px;right:72px;bottom:44px;display:flex;justify-content:space-between;align-items:center;border-top:1px solid var(--n12);padding-top:18px}
.ft .legal{color:var(--n55)} .ft .sw{color:var(--navy)}
.rule{width:72px;height:3px;background:var(--gold)}
.ph{position:absolute;left:0;right:0;top:0;height:720px}
.cv{position:absolute;left:72px;right:72px;top:770px}
.cv .eb{color:var(--n55)} .cv h1{margin-top:14px;font:700 60px/1.1 var(--h);letter-spacing:-.01em;text-wrap:balance}
.cv p{margin-top:16px;font:400 28px/1.45 var(--b);color:var(--n70)} .cv .rule{margin-top:24px}
.prog{position:absolute;right:72px;top:36px;font:700 20px/1 var(--h);letter-spacing:.14em;color:var(--n55)}
.big{position:absolute;left:66px;top:250px;font:900 300px/1 var(--h);letter-spacing:-.04em;color:var(--navy)}
.big i{display:block;width:120px;height:8px;background:var(--gold);margin:14px 0 0 10px}
.st{position:absolute;left:72px;right:72px;top:690px}
.st .eb{color:var(--gold-ink)} .st h2{margin-top:16px;font:700 64px/1.08 var(--h);letter-spacing:-.01em;text-wrap:balance}
.st p{margin-top:26px;font:400 34px/1.5 var(--b);color:var(--n70);max-width:900px}
.dots{position:absolute;left:72px;bottom:120px;display:flex;gap:12px}
.dots i{width:14px;height:14px;border-radius:50%;border:2px solid var(--navy)} .dots i.on{background:var(--navy)}
.kw{background:var(--navy);color:#fff}
.kw .logo{position:absolute;left:50%;top:70px;width:150px;height:150px;transform:translateX(-50%)}
.kw .in{position:absolute;left:80px;right:80px;top:330px;text-align:center}
.kw .eb{color:var(--gold)} .kw .word{display:inline-block;margin-top:30px;padding:26px 54px 22px;border:3px solid var(--gold);font:900 150px/1 var(--h);letter-spacing:.04em}
.kw .word.sm{font-size:64px;padding:24px 40px}
.kw .gets{margin-top:40px;font:500 38px/1.35 var(--h);text-wrap:balance} .kw .ln{margin-top:22px;font:400 28px/1.4 var(--b);color:var(--w85)}
.kw .ft{border-top-color:rgba(255,255,255,.18)} .kw .ft .legal{color:var(--w60)}
.sm{position:absolute;left:72px;right:72px;top:330px}
.sm .eb{color:var(--gold-ink)} .sm h2{margin-top:22px;font:700 70px/1.08 var(--h);letter-spacing:-.01em;text-wrap:balance}
.sm h2 em{color:var(--gold-ink)} .sm p{margin-top:30px;font:400 32px/1.5 var(--b);color:var(--n70)}
.navy.sm-wrap{background:var(--navy)} .navy .sm h2{color:#fff} .navy .sm h2 em{color:var(--gold)} .navy .sm p{color:var(--w85)} .navy .sm .eb{color:var(--gold)}
.navy .ft{border-top-color:rgba(255,255,255,.18)} .navy .ft .legal{color:var(--w60)} .navy .ft .sw{color:var(--gold)}
.qs{position:absolute;left:72px;right:72px;top:300px}
.q{display:grid;grid-template-columns:150px 1fr;gap:10px;padding:80px 0;border-bottom:1px solid var(--n12)}
.q b{font:900 110px/1 var(--h);color:var(--gold)} .q span{font:700 60px/1.12 var(--h);text-wrap:balance}
.lg{position:absolute;left:72px;right:72px;top:220px}
.lg .eb{color:var(--gold-ink)} .lg h2{margin-top:14px;font:700 56px/1.1 var(--h);margin-bottom:30px;text-wrap:balance}
.lr{display:flex;justify-content:space-between;align-items:baseline;gap:20px;padding:24px 0;border-bottom:1px solid var(--n12);font:600 30px/1.2 var(--h)}
.lr b{font-weight:800;font-variant-numeric:tabular-nums;white-space:nowrap} .lg .fn{margin-top:22px;font:400 19px/1.45 var(--b);color:var(--n55)}
.tp{position:absolute;left:72px;right:72px;top:560px}
.tp .eb{color:var(--n55)} .tp h2{margin-top:12px;font:700 52px/1.1 var(--h);text-wrap:balance}
.tp ul{list-style:none;margin-top:26px;display:grid;gap:16px}
.tp li{display:grid;grid-template-columns:44px 1fr;gap:16px;align-items:start;font:400 29px/1.35 var(--b)}
.tp li i{width:40px;height:40px;border-radius:50%;background:var(--navy);position:relative;margin-top:-2px}
.tp li i:after{content:"";position:absolute;left:14px;top:8px;width:9px;height:17px;border:solid #fff;border-width:0 4px 4px 0;transform:rotate(45deg)}
.tp .act{margin-top:26px;font:700 26px/1.35 var(--h)}
.tp.nophoto{top:230px} .tp.nophoto h2{font-size:60px} .tp.nophoto ul{gap:24px;margin-top:40px} .tp.nophoto li{font-size:33px}
/* real photo, full bleed with a caption plate (team, field notes) */
.fp .ph{height:1350px} .fp .shade{position:absolute;left:0;right:0;bottom:0;height:640px;background:linear-gradient(180deg,rgba(6,6,68,0),rgba(6,6,68,.9) 62%)}
.fp .cap{position:absolute;left:72px;right:72px;bottom:120px;color:#fff}
.fp .cap .eb{color:var(--gold)} .fp .cap h1{margin-top:14px;font:700 62px/1.08 var(--h);letter-spacing:-.01em;text-wrap:balance} .fp .cap p{margin-top:16px;font:400 28px/1.45 var(--b);color:var(--w85)}
.fp .ft{border-top-color:rgba(255,255,255,.22)} .fp .ft .legal{color:var(--w60)} .fp .ft .sw{color:#fff}
/* person card */
.ps .hs{position:absolute;left:72px;top:150px;width:520px;height:650px;background-size:cover;background-position:50% 18%;background-color:#e6e0eb}
.ps .tx{position:absolute;left:72px;right:72px;top:840px}
.ps .tx .eb{color:var(--gold-ink)} .ps .tx h2{margin-top:12px;font:700 64px/1.05 var(--h)} .ps .tx p{margin-top:20px;font:400 30px/1.5 var(--b);color:var(--n70)}
.ps .side{position:absolute;left:640px;right:72px;top:150px;display:grid;gap:26px}
.ps .side div{border-top:3px solid var(--gold);padding-top:14px;font:600 24px/1.3 var(--h)} .ps .side small{display:block;font:700 14px/1.3 var(--h);letter-spacing:.2em;color:var(--n55);margin-bottom:6px}
/* before and after */
.ba .half{position:absolute;left:72px;right:72px;height:480px} .ba .h1{top:130px} .ba .h2{top:634px}
.ba .tag{position:absolute;left:0;top:0;padding:12px 20px;background:var(--navy);color:#fff;font:800 18px/1 var(--h);letter-spacing:.2em}
.ba .h2 .tag{background:var(--gold);color:var(--navy)}
.ba .tx{position:absolute;left:72px;right:72px;top:1140px} .ba .tx h2{font:700 44px/1.1 var(--h);text-wrap:balance} .ba .tx p{margin-top:10px;font:400 24px/1.4 var(--b);color:var(--n70)}
/* review quote */
.qt .stars{position:absolute;left:72px;top:250px;font:400 54px/1 var(--h);letter-spacing:.12em;color:var(--gold)}
.qt blockquote{position:absolute;left:72px;right:72px;top:350px;font:600 50px/1.28 var(--h);letter-spacing:-.005em;text-wrap:pretty}
.qt blockquote.long{font-size:40px} .qt blockquote.xlong{font-size:33px}
.qt .who{position:absolute;left:72px;right:72px;bottom:150px;font:700 22px/1.3 var(--h);letter-spacing:.14em;text-transform:uppercase;color:var(--n55)}
.qt .who b{display:block;color:var(--navy);font-size:26px;letter-spacing:.04em;text-transform:none;margin-bottom:6px}
"""

RENT_CSS = """
.mast{position:absolute;left:64px;right:64px;top:56px;text-align:center}
.mast .r1{border-top:4px solid var(--navy);border-bottom:1px solid var(--navy);height:9px}
.mast h2{margin:16px 0 12px;font:900 84px/1 var(--h);letter-spacing:.01em;white-space:nowrap}
.mast .dl{display:flex;justify-content:space-between;border-top:1px solid var(--navy);border-bottom:4px solid var(--navy);padding:12px 2px;font:600 16px/1 var(--h);letter-spacing:.16em;text-transform:uppercase}
.grid{position:absolute;left:64px;right:64px;top:262px;display:grid;grid-template-columns:repeat(3,1fr);border-top:2px solid var(--navy)}
.grid.two{grid-template-columns:repeat(2,1fr)}
.ad{padding:22px 18px;border-bottom:1px solid var(--n12);border-right:1px solid var(--n12)}
.ad:nth-child(3n){border-right:0;padding-right:0} .ad:nth-child(3n+1){padding-left:0}
.grid.two .ad:nth-child(3n){border-right:1px solid var(--n12);padding-right:18px} .grid.two .ad:nth-child(3n+1){padding-left:18px}
.grid.two .ad:nth-child(2n){border-right:0;padding-right:0} .grid.two .ad:nth-child(2n+1){padding-left:0}
.ad .p{height:250px} .grid.two .ad .p{height:300px}
.ad .row{margin-top:16px;display:flex;align-items:baseline;gap:6px} .ad .row b{font:800 38px/1 var(--h)} .ad .row span{font:600 18px/1 var(--h);color:var(--n55)}
.ad .bb{margin-top:8px;font:700 18px/1.2 var(--h);letter-spacing:.04em} .ad .stt{margin-top:4px;font:400 17px/1.3 var(--b);color:var(--n70)}
.note{position:absolute;left:64px;right:64px;top:1130px;display:flex;gap:24px;align-items:center;border:1.5px solid var(--navy);padding:20px 26px}
.note b{font:900 22px/1.1 var(--h);letter-spacing:.06em;white-space:nowrap} .note i{width:3px;align-self:stretch;background:var(--gold)}
.note p{font:400 19px/1.4 var(--b);color:var(--n70)}
.rb .ft2{position:absolute;left:64px;right:64px;bottom:40px;display:flex;justify-content:space-between;border-top:1px solid var(--navy);padding-top:14px;font:400 17px/1.4 var(--b);color:var(--n55)}
.rb .ft2 b{font:700 15px/1.4 var(--h);letter-spacing:.16em;color:var(--navy)}
.pol-c{background:var(--tint)}
.pol{position:absolute;left:110px;top:150px;width:860px;background:#fff;padding:30px 30px 34px;box-shadow:0 22px 50px rgba(6,6,68,.18);transform:rotate(-1.6deg)}
.pol .p{height:620px} .tape{position:absolute;left:50%;top:-22px;width:200px;height:48px;margin-left:-100px;background:rgba(178,153,90,.55);transform:rotate(-3deg)}
.pol .row{margin-top:24px;display:flex;align-items:baseline;gap:10px} .pol .row b{font:800 64px/1 var(--h)} .pol .row span{font:600 26px/1 var(--h);color:var(--n55)}
.pol .bb{margin-top:12px;font:700 28px/1.2 var(--h)} .pol .stt{margin-top:6px;font:400 24px/1.3 var(--b);color:var(--n70)}
.pol .ft3{margin-top:14px;font:600 italic 24px/1.3 var(--h);color:var(--gold-ink)}
.avail{position:absolute;right:120px;top:1030px;font:800 30px/1 var(--h);transform:rotate(-4deg)}
.avail svg{position:absolute;left:-26px;top:-20px;width:calc(100% + 52px);height:calc(100% + 40px);overflow:visible}
.pc-wm{position:absolute;left:110px;top:1060px;font:800 26px/1.1 var(--h)} .pc-wm span{display:block;margin-top:6px;font:500 15px/1 var(--h);letter-spacing:.26em}
/* story, 1080x1920 */
.sty{background:var(--tint)}
.sty .pol{left:90px;top:300px;width:900px;transform:rotate(-1.4deg)} .sty .pol .p{height:780px}
.sty .shd{position:absolute;left:90px;right:90px;top:170px;display:flex;justify-content:space-between;align-items:baseline}
.sty .shd b{font:900 52px/1 var(--h);color:var(--navy)} .sty .shd span{font:700 18px/1 var(--h);letter-spacing:.2em;color:var(--n55)}
.sty .avail{right:130px;top:1430px;font-size:34px}
.sty .cta{position:absolute;left:90px;right:90px;top:1540px;border-top:3px solid var(--navy);padding-top:26px}
.sty .cta b{display:block;font:800 44px/1.15 var(--h)} .sty .cta b em{white-space:nowrap} .sty .cta span{display:block;margin-top:12px;font:400 26px/1.4 var(--b);color:var(--n70)}
"""
CIRCLE = ('<svg viewBox="0 0 100 40" preserveAspectRatio="none"><path d="M6,22 C4,8 40,3 62,4 C86,5 98,12 96,22 C94,34 60,38 38,37 C16,36 3,30 8,17" '
          'fill="none" stroke="#B2995A" vector-effect="non-scaling-stroke" stroke-linecap="round" style="stroke-width:5px"/></svg>')

RECEIPT_CSS = """
.rc-c{background:var(--navy);color:#fff}
.rcpt{position:absolute;left:150px;top:230px;width:780px;background:#fff;color:var(--navy);padding:50px 58px 84px;transform:rotate(-1.8deg);box-shadow:0 30px 60px rgba(0,0,0,.45);
clip-path:polygon(0 0,100% 0,100% 97%,96% 100%,92% 97%,88% 100%,84% 97%,80% 100%,76% 97%,72% 100%,68% 97%,64% 100%,60% 97%,56% 100%,52% 97%,48% 100%,44% 97%,40% 100%,36% 97%,32% 100%,28% 97%,24% 100%,20% 97%,16% 100%,12% 97%,8% 100%,4% 97%,0 100%)}
.rcpt .top{text-align:center} .rcpt .top b{display:block;font:900 30px/1.1 var(--h);letter-spacing:.06em} .rcpt .top span{display:block;margin-top:8px;font:500 17px/1.3 var(--h);letter-spacing:.08em;color:var(--n70)}
.dash{border-top:2.5px dashed rgba(6,6,68,.45);margin:20px 0}
.rcpt ul{list-style:none} .rcpt li{display:flex;justify-content:space-between;gap:16px;padding:9px 0;font:600 25px/1.15 var(--h);letter-spacing:.04em;font-variant-numeric:tabular-nums}
.rcpt li span:last-child{white-space:nowrap}
.tot{display:flex;justify-content:space-between;font:900 42px/1 var(--h);letter-spacing:.03em;font-variant-numeric:tabular-nums}
.barc{height:64px;margin:24px 30px 10px;background:repeating-linear-gradient(90deg,var(--navy) 0 3px,transparent 3px 6px,var(--navy) 6px 7px,transparent 7px 11px,var(--navy) 11px 15px,transparent 15px 17px)}
.ty{text-align:center;font:800 19px/1.3 var(--h);letter-spacing:.18em}
.rcpt.big{top:250px;padding:60px 62px 96px} .rcpt.big li{font-size:31px;padding:13px 0} .rcpt.big .top b{font-size:36px} .rcpt.big .top span{font-size:20px} .rcpt.big .tot{font-size:52px} .rcpt.big .barc{height:84px;margin-top:34px} .rcpt.big .ty{font-size:22px} .rcpt.big .dash{margin:28px 0}
.hd{position:absolute;left:84px;right:84px;top:76px;font:800 54px/1.1 var(--h);letter-spacing:-.01em;color:#fff;text-wrap:balance} .hd span{color:var(--gold)}
.cft{position:absolute;left:84px;right:84px;bottom:60px;display:flex;justify-content:space-between;align-items:center;color:#fff}
.cft span{font:400 19px/1.35 var(--b);color:var(--w60);max-width:760px} .cft b{font:700 18px/1 var(--h);letter-spacing:.16em;color:var(--gold);white-space:nowrap}
"""

REEL_CSS = """
.rl{background:var(--navy)}
.rl .ph{position:absolute;inset:0;height:auto}
.rl .veil{position:absolute;inset:0;background:linear-gradient(180deg,rgba(6,6,68,.55) 0%,rgba(6,6,68,.05) 38%,rgba(6,6,68,.2) 62%,rgba(6,6,68,.86) 100%)}
.cc .tx{position:absolute;left:60px;right:60px;top:300px;display:flex;flex-direction:column;align-items:center}
.cc .tx span{display:inline-block;padding:10px 26px;font:800 64px/1.12 var(--h);letter-spacing:-.01em;border-radius:14px;text-align:center}
.cc .w{background:#fff;color:var(--navy)} .cc .n{background:var(--gold);color:var(--navy);margin-top:-6px}
.cc .who{position:absolute;left:0;right:0;top:1500px;text-align:center}
.cc .who b{display:inline-block;padding:14px 26px;border-radius:40px;background:var(--navy);border:1.5px solid rgba(178,153,90,.7);color:#fff;font:700 26px/1 var(--h)} .cc .who b i{font-style:normal;color:var(--gold)}
.mm .series{position:absolute;left:84px;top:1150px;display:flex;align-items:center;gap:16px}
.mm .series i{display:block;width:44px;height:3px;background:var(--gold)} .mm .series span{font:700 22px/1 var(--h);letter-spacing:.26em;color:var(--gold)}
.mm h1{position:absolute;left:84px;right:84px;top:1200px;font:900 96px/.98 var(--h);letter-spacing:-.02em;color:#fff;text-wrap:balance} .mm h1 em{color:var(--gold)}
.mm .logo{position:absolute;right:64px;top:200px;width:120px;height:120px}
/* transparent overlays for video */
.ov{background:transparent}
.ov .tx{top:330px}
.endc{background:var(--navy);color:#fff}
.endc .logo{position:absolute;left:50%;top:520px;width:260px;height:260px;transform:translateX(-50%)}
.endc h2{position:absolute;left:90px;right:90px;top:840px;text-align:center;font:800 64px/1.1 var(--h);text-wrap:balance}
.endc p{position:absolute;left:90px;right:90px;top:1060px;text-align:center;font:600 34px/1.35 var(--h);color:var(--gold)}
.endc small{position:absolute;left:90px;right:90px;top:1640px;text-align:center;font:600 18px/1.4 var(--h);letter-spacing:.18em;text-transform:uppercase;color:var(--w60)}
/* tour frame: photo window on top, facts below */
.tour{background:transparent}
.tour .panel{position:absolute;left:0;right:0;top:1180px;bottom:0;background:#fff}
.tour .tab{position:absolute;left:0;top:140px;height:84px;display:flex;align-items:center;gap:4px;padding-right:26px;background:var(--navy)}
.tour .tab img{width:84px;height:84px} .tour .tab span{font:500 14px/1.2 var(--h);letter-spacing:.26em;color:#fff}
.tour .row{position:absolute;left:72px;top:1240px;display:flex;align-items:baseline;gap:12px} .tour .row b{font:800 104px/1 var(--h);color:var(--navy)} .tour .row span{font:600 36px/1 var(--h);color:var(--n55)}
.tour .bb{position:absolute;left:72px;right:72px;top:1376px;font:700 40px/1.2 var(--h);color:var(--navy)}
.tour .stt{position:absolute;left:72px;right:72px;top:1436px;font:400 32px/1.3 var(--b);color:var(--n70)}
.tour .rule{position:absolute;left:72px;top:1508px}
.tour .ap{position:absolute;left:72px;right:72px;top:1540px;font:700 26px/1.35 var(--h);color:var(--navy)} .tour .ap span{display:block;font:400 22px/1.4 var(--b);color:var(--n70);margin-top:6px}
"""

GBP_CSS = """
.gbw{background:#fff;color:var(--navy)} .gbw .ph{position:absolute;right:0;top:0;bottom:0;left:auto;width:480px;height:auto}
.gbw .t{position:absolute;left:80px;right:560px;top:170px} .gbw h1{margin-top:22px;font:800 52px/1.05 var(--h);letter-spacing:-.01em;text-wrap:balance}
.gbw .eb{color:var(--n55)} .gbw p{margin-top:24px;font:400 28px/1.45 var(--b);color:var(--n70)}
.gbw .gft{position:absolute;left:80px;right:600px;bottom:62px;font:600 15px/1.3 var(--h);letter-spacing:.18em;text-transform:uppercase;color:var(--n55)}
.gbw .wm{position:absolute;left:0;top:0;height:84px;display:flex;align-items:center;gap:4px;padding-right:26px;background:var(--navy)}
.gbw .wm img{width:84px;height:84px} .gbw .wm span{font:500 13px/1.2 var(--h);letter-spacing:.26em;color:#fff}
"""
ALL_CSS = PM_CSS + RENT_CSS + RECEIPT_CSS + REEL_CSS + GBP_CSS


def page(body, w=1080, h=1350, bg='#fff'):
    return ('<!doctype html><html><head><meta charset="utf-8"><link rel="stylesheet" href="' + FONTS + '"><style>'
            + BASE.replace('WPX', f'{w}px').replace('HPX', f'{h}px').replace('BGC', bg) + ALL_CSS + '</style></head><body>' + body + '</body></html>')


def shoot(cls, body, path, w=1080, h=1350, transparent=False):
    """Render one frame with headless Chrome. JPG unless the path ends in .png."""
    from PIL import Image
    os.makedirs(os.path.dirname(path), exist_ok=True)
    src = os.path.join(tempfile.gettempdir(), 'studio-' + hashlib.md5(path.encode()).hexdigest() + '.html')
    open(src, 'w', encoding='utf8').write(page(f'<div class="c {cls}">{body}</div>', w, h, 'transparent' if transparent else '#fff'))
    png = src.replace('.html', '.png')
    if os.path.exists(png):
        os.remove(png)
    cmd = [chrome(), '--headless=new', '--disable-gpu', '--no-sandbox', '--hide-scrollbars', '--force-device-scale-factor=1', '--allow-file-access-from-files',
           f'--window-size={w},{h}', '--virtual-time-budget=5000', f'--screenshot={png}']
    if transparent:
        cmd.append('--default-background-color=00000000')
    cmd.append('file://' + src)
    for _ in range(3):   # headless Chrome sometimes exits without writing the file, or hangs after writing it
        pr = subprocess.Popen(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        try:
            pr.wait(timeout=90)
        except subprocess.TimeoutExpired:
            pr.kill()
        if os.path.exists(png) and os.path.getsize(png) > 0:
            break
    else:
        raise TaskError('Chrome did not produce an image for ' + os.path.basename(path))
    im = Image.open(png)
    if path.endswith('.png'):
        im.save(path)
    else:
        im.convert('RGB').save(path, quality=90, optimize=True)
    return path


# ------------------------------------------------------------------ slide builders
def wm():
    return f'<div class="wm"><img src="{LOGO_NAVY}"><span>PROPERTY MANAGEMENT</span></div>'


def ft(last, text=None):
    left = text or f'McBride Property Management · Evans, GA · {PM_PHONE}'
    right = '' if last else '<span class="sw">SWIPE →</span>'
    return f'<div class="ft"><span class="legal">{e(left)}</span>{right}</div>'


def slide(task, s, i, n):
    """One 1080x1350 carousel slide. Returns (css class, body html)."""
    last = i == n - 1
    t = s['tpl']
    seed = task['id'] + str(i)
    if t == 'cover':
        ph = photo(s.get('photo') or task.get('cover_photo') or 'listing:auto', seed)
        sub = f'<p>{e(s["sub"])}</p>' if s.get('sub') else ''
        return 'pm', f'''<div class="ph cover" style="background-image:url('{furl(ph)}')"></div>{wm()}
<div class="cv"><div class="eb">{e(s.get('eyebrow'))}</div><h1>{e(s['title'])}</h1>{sub}<div class="rule"></div></div>{ft(last, s.get('foot'))}'''
    if t == 'photo':     # a real photo, full bleed, caption at the bottom
        ph = photo(s['photo'], seed)
        sub = f'<p>{e(s["sub"])}</p>' if s.get('sub') else ''
        pos = s.get('focus', '50% 30%')
        return 'pm fp', f'''<div class="ph cover" style="background-image:url('{furl(ph)}');background-position:{pos}"></div><div class="shade"></div>{wm()}
<div class="cap"><div class="eb">{e(s.get('eyebrow'))}</div><h1>{e(s['title'])}</h1>{sub}</div>{ft(last, s.get('foot'))}'''
    if t == 'person':
        ph = photo(s['photo'], seed)
        side = ''.join(f'<div><small>{e(k)}</small>{e(v)}</div>' for k, v in (s.get('facts') or []))
        return 'pm ps', f'''{wm()}<div class="hs" style="background-image:url('{furl(ph)}');background-position:{s.get('focus', '50% 18%')}"></div><div class="side">{side}</div>
<div class="tx"><div class="eb">{e(s.get('role'))}</div><h2>{e(s['name'])}</h2><p>{e(s.get('body'))}</p></div>{ft(last)}'''
    if t == 'beforeafter':
        a, b = photo(s['before'], seed + 'a'), photo(s['after'], seed + 'b')
        sub = f'<p>{e(s["sub"])}</p>' if s.get('sub') else ''
        return 'pm ba', f'''{wm()}<div class="half h1 cover" style="background-image:url('{furl(a)}')"><span class="tag">BEFORE</span></div>
<div class="half h2 cover" style="background-image:url('{furl(b)}')"><span class="tag">AFTER</span></div><div class="tx"><h2>{e(s['title'])}</h2>{sub}</div>{ft(last)}'''
    if t == 'step':
        dots = ''.join(f'<i class="{"on" if k + 1 == s["n"] else ""}"></i>' for k in range(s['total']))
        return 'pm', f'''{wm()}<div class="prog">{s['n']} / {s['total']}</div><div class="big">{s['n']:02d}<i></i></div>
<div class="st"><div class="eb">{e(s.get('label', 'Step'))} {s['n']}</div><h2>{e(s['title'])}</h2><p>{e(s['body'])}</p></div><div class="dots">{dots}</div>{ft(last)}'''
    if t == 'keyword':
        lines = ''.join(f'<div class="ln">{e(l)}</div>' for l in s.get('lines') or [])
        return 'pm kw', f'''<img class="logo" src="{LOGO_NAVY}"><div class="in"><div class="eb">{e(s.get('eyebrow', 'Comment'))}</div><div class="word">{e(s['word'])}</div>
<div class="gets">{e(s['gets'])}</div>{lines}</div>{ft(True)}'''
    if t == 'cta':
        lines = ''.join(f'<div class="ln">{e(l)}</div>' for l in s.get('lines') or [])
        return 'pm kw', f'''<img class="logo" src="{LOGO_NAVY}"><div class="in"><div class="eb">{e(s.get('eyebrow', 'Next step'))}</div>
<div class="gets" style="font-size:60px;font-weight:800;margin-top:26px">{e(s['title'])}</div><div class="word sm">{e(s['action'])}</div>{lines}</div>{ft(True)}'''
    if t == 'statement':
        navy = s.get('theme') == 'navy'
        sub = f'<p>{e(s["sub"])}</p>' if s.get('sub') else ''
        return ('pm navy sm-wrap' if navy else 'pm'), f'''{wm()}<div class="sm"><div class="eb">{e(s.get('eyebrow'))}</div><h2>{e(s['title'])}</h2>{sub}</div>{ft(last, s.get('foot'))}'''
    if t == 'questions':
        qs = ''.join(f'<div class="q"><b>{s.get("start", 1) + k}</b><span>{e(q)}</span></div>' for k, q in enumerate(s['qs']))
        return 'pm', f'{wm()}<div class="qs">{qs}</div>{ft(last)}'
    if t == 'ledger':
        rows = ''.join(f'<div class="lr"><span>{e(a)}</span><b>{e(b)}</b></div>' for a, b in s['rows'])
        fn = f'<div class="fn">{e(s["foot"])}</div>' if s.get('foot') else ''
        return 'pm', f'{wm()}<div class="lg"><div class="eb">{e(s.get("eyebrow"))}</div><h2>{e(s["title"])}</h2>{rows}{fn}</div>{ft(last)}'
    if t == 'tips':
        items = ''.join(f'<li><i></i><span>{e(x)}</span></li>' for x in s['items'])
        act = f'<div class="act">{e(s["action"])}</div>' if s.get('action') else ''
        if s.get('photo') == 'none':
            return 'pm', f'''{wm()}<div class="tp nophoto"><div class="eb">{e(s.get('eyebrow'))}</div><h2>{e(s['title'])}</h2><ul>{items}</ul>{act}</div>{ft(last)}'''
        ph = photo(s.get('photo') or task.get('cover_photo') or 'listing:auto', seed)
        return 'pm', f'''<div class="ph cover" style="height:500px;background-image:url('{furl(ph)}')"></div>{wm()}
<div class="tp"><div class="eb">{e(s.get('eyebrow'))}</div><h2>{e(s['title'])}</h2><ul>{items}</ul>{act}</div>{ft(last)}'''
    if t == 'receipt':
        lines = ''.join(f'<li><span>{e(a).upper()}</span><span>{e(b)}</span></li>' for a, b in s['lines'])
        tot = f'<div class="dash"></div><div class="tot"><span>{e(s["total"][0]).upper()}</span><span>{e(s["total"][1])}</span></div>' if s.get('total') else ''
        arrow = '' if last else 'SWIPE →'
        return 'rc-c', f'''<div class="hd">{e(s['head'])} <span>↓</span></div>
<div class="rcpt {'big' if len(s['lines']) <= 6 else ''}"><div class="top"><b>{e(s.get('store', 'YOUR RENTAL')).upper()}</b><span>{e(s.get('sub', '')).upper()}</span></div><div class="dash"></div><ul>{lines}</ul>{tot}
<div class="barc"></div><div class="ty">{e(s.get('thanks', 'MANAGED LIKE IT IS OUR OWN')).upper()}</div></div>
<div class="cft"><span>{e(s.get('note', ''))}</span><b>{arrow}</b></div>'''
    if t == 'quote':
        text = s['text']
        cls = 'xlong' if len(text) > 360 else 'long' if len(text) > 220 else ''
        stars = '★' * int(s.get('stars', 5))
        return 'pm qt', f'''{wm()}<div class="stars">{stars}</div><blockquote class="{cls}">“{e(text)}”</blockquote>
<div class="who"><b>{e(s.get('name', ''))}</b>{e(s.get('who', 'Google review'))}</div>{ft(last)}'''
    raise TaskError(f'no slide template named {t}')


def home_facts(l):
    return {k: l[k] for k in ('id', 'address', 'street', 'city', 'state', 'rent', 'bedbath', 'sqft', 'avail', 'pets', 'title', 'url')}


def bb(x):
    return x.replace(' / ', ' · ')


def avail_text(l):
    a = (l.get('avail') or '').strip()
    return 'available now' if a.upper() == 'NOW' or not a else 'available ' + e(a)


def polaroid(l, last=True, foot=None):
    sq = f' · {e(l["sqft"])} sq ft' if l.get('sqft') else ''
    return 'pm pol-c', f'''<div class="pol"><i class="tape"></i><div class="p cover" style="background-image:url('{furl(listing_photo(l))}')"></div>
<div class="row"><b>{e(l['rent'])}</b><span>/mo</span></div><p class="bb">{e(bb(l['bedbath']))}{sq} · {e(l['city'])}</p><p class="stt">{e(l['street'])}</p></div>
<div class="avail">{CIRCLE}{avail_text(l)}</div><div class="pc-wm">McBride<span>PROPERTY MANAGEMENT</span></div>{ft(last, foot or 'Apply only at mcbride-pm.com/rentals')}'''


# ------------------------------------------------------------------ looks
def look_carousel(task, od):
    slides = task['slides']
    files = []
    for i, s in enumerate(slides):
        cls, body = slide(task, s, i, len(slides))
        files.append(shoot(cls, body, os.path.join(od, f'{i + 1:02d}.jpg')))
    return files, {}


def pick_homes(task):
    ls = [l for l in listings() if in_area(l, task.get('area')) and l.get('img')]
    if task.get('max_rent'):
        ls = [l for l in ls if 0 < rent_num(l) <= int(task['max_rent'])]
    if task.get('min_beds'):
        ls = [l for l in ls if (re.match(r'(\d+)', l['bedbath']) and int(re.match(r'(\d+)', l['bedbath']).group(1)) >= int(task['min_beds']))]
    skip = set(task.get('skip') or [])
    ls = [l for l in ls if l['id'] not in skip]
    ls.sort(key=lambda l: (0 if (l.get('avail') or '').upper() == 'NOW' else 1, ))
    return ls


def look_rent_board(task, od):
    homes = pick_homes(task)
    if len(homes) < 2:
        raise TaskError(f'only {len(homes)} homes listed for area {task.get("area") or "all"}; widen the area')
    grid = homes[:6] if len(homes) >= 6 else homes[:4] if len(homes) >= 4 else homes[:2]
    two = len(grid) in (2, 4)
    cards = ''.join(f'''<div class="ad"><div class="p cover" style="background-image:url('{furl(listing_photo(h))}')"></div><div class="row"><b>{e(h['rent'])}</b><span>/mo</span></div>
<p class="bb">{e(bb(h['bedbath']))} · {e(h['city'])}</p><p class="stt">{e(h['street'])}</p></div>''' for h in grid)
    wk = 'Week of ' + nice_date(task.get('week_of') or datetime.date.today().isoformat())
    note_top = 1130 if not two or len(grid) == 4 else 800
    body = f'''<div class="mast"><div class="r1"></div><h2>THE RENT BOARD</h2><div class="dl"><span>{wk}</span><span>McBride Property Management</span><span>{e(task.get('note') or 'Available now')}</span></div></div>
<div class="grid {'two' if two else ''}">{cards}</div>
<div class="note" style="top:{note_top}px"><b>APPLY ONLY AT<br>MCBRIDE-PM.COM</b><i></i><p>We never ask for a deposit or rent by text, Zelle, or social media. If someone does, it isn't us. Call {PM_PHONE}.</p></div>
<div class="ft2"><span>Rents and availability change. Check mcbride-pm.com/rentals for today's list.</span><b>SWIPE →</b></div>'''
    files = [shoot('pm rb', body, os.path.join(od, '01.jpg'))]
    singles = grid[:int(task.get('singles', 4))]
    for k, h in enumerate(singles):
        cls, b = polaroid(h, last=False)
        files.append(shoot(cls, b, os.path.join(od, f'{k + 2:02d}.jpg')))
    kw = {'tpl': 'keyword', 'word': task.get('keyword', 'LEASE'), 'gets': 'and we will send you the full list of homes for rent.',
          'lines': ['Apply only at mcbride-pm.com/rentals.', 'We never take applications or payments through social media.']}
    cls, b = slide(task, kw, 9, 10)
    files.append(shoot(cls, b, os.path.join(od, f'{len(singles) + 2:02d}.jpg')))
    return files, {'homes': [home_facts(h) for h in grid], 'area': AREA_LABEL.get(task.get('area') or 'all'), 'listed_total': len(listings()), 'in_area_total': len(homes)}


def one_home(task):
    val = task.get('listing') or 'auto'
    ls = pick_homes(task)
    if val == 'auto':
        if not ls:
            raise TaskError('no homes listed to feature')
        day = task.get('rotate_key') or task['id']
        return ls[int(hashlib.md5(day.encode()).hexdigest(), 16) % len(ls)]
    l = next((x for x in listings() if x['id'].startswith(val)), None)
    if not l:
        raise TaskError(f'listing {val} is not on the AppFolio page any more')
    return l


def look_polaroid(task, od):
    l = one_home(task)
    cls, b = polaroid(l)
    return [shoot(cls, b, os.path.join(od, '01.jpg'))], {'homes': [home_facts(l)]}


def look_story_rental(task, od):
    l = one_home(task)
    sq = f' · {e(l["sqft"])} sq ft' if l.get('sqft') else ''
    body = f'''<div class="shd"><b>For rent in {e(l['city'])}</b><span>MCBRIDE PM</span></div>
<div class="pol"><i class="tape"></i><div class="p cover" style="background-image:url('{furl(listing_photo(l))}')"></div>
<div class="row"><b>{e(l['rent'])}</b><span>/mo</span></div><p class="bb">{e(bb(l['bedbath']))}{sq}</p><p class="stt">{e(l['street'])}</p></div>
<div class="avail">{CIRCLE}{avail_text(l)}</div>
<div class="cta"><b>See it and apply at <em>mcbride-pm.com/rentals</em></b><span>We never take applications or payments through social media. Questions: {PM_PHONE}.</span></div>'''
    return [shoot('pm sty', body, os.path.join(od, '01.jpg'), 1080, 1920)], {'homes': [home_facts(l)]}


def cover_html(task, transparent=False):
    style = task.get('style', 'caption')
    bg = ''
    if not transparent:
        ref = task.get('photo')
        if ref and ref != 'none':
            bg = f'''<div class="ph cover" style="background-image:url('{furl(photo(ref, task['id']))}');background-position:{task.get('focus', '50% 40%')}"></div><div class="veil"></div>'''
    if style == 'minute':
        title = e(task['title'])
        return 'rl mm', f'''{bg}<img class="logo" src="{LOGO_NAVY}"><div class="series"><i></i><span>{e(task.get('series', ''))}</span></div><h1>{title}</h1>'''
    ws = ''.join(f'<span class="w">{e(l)}</span>' for l in task.get('lines') or [])
    punch = f'<span class="n">{e(task["punch"])}</span>' if task.get('punch') else ''
    who = f'<div class="who"><b>{e(task["who"]).replace("·", "<i>·</i>")}</b></div>' if task.get('who') and not transparent else ''
    return ('rl cc ov' if transparent else 'rl cc'), f'{bg}<div class="tx">{ws}{punch}</div>{who}'


def look_reel_cover(task, od):
    cls, body = cover_html(task)
    return [shoot(cls, body, os.path.join(od, 'cover.jpg'), 1080, 1920)], {}


def look_gbp(task, od):
    ph = photo(task.get('photo') or 'listing:auto', task['id'])
    sub = f'<p>{e(task["sub"])}</p>' if task.get('sub') else ''
    body = f'''<div class="ph cover" style="background-image:url('{furl(ph)}')"></div><div class="wm"><img src="{LOGO_NAVY}"><span>PROPERTY MANAGEMENT</span></div>
<div class="t"><div class="eb">{e(task.get('eyebrow'))}</div><h1>{e(task['title'])}</h1>{sub}</div><div class="gft">mcbride-pm.com · {PM_PHONE}</div>'''
    return [shoot('gbw', body, os.path.join(od, '01.jpg'), 1200, 900)], {}


def look_pdf(task, od, done):
    """A LinkedIn document: the slides of an earlier carousel task as one PDF."""
    from PIL import Image
    src = done.get(task['from'])
    if not src:
        raise TaskError(f'task {task["from"]} has no files to turn into a PDF')
    ims = [Image.open(f).convert('RGB') for f in src if f.endswith('.jpg')]
    out = os.path.join(od, (task.get('filename') or 'document') + '.pdf')
    ims[0].save(out, save_all=True, append_images=ims[1:], resolution=144)
    return [out], {'pages': len(ims)}


# ------------------------------------------------------------------ video
W, H, FPS = 1080, 1920, 30
ENC = ['-c:v', 'libx264', '-preset', 'medium', '-crf', '20', '-pix_fmt', 'yuv420p', '-r', str(FPS)]


def probe(path):
    """Duration, size, and whether there is audio, read from ffmpeg's own banner (no ffprobe needed)."""
    p = subprocess.run([ffmpeg(), '-hide_banner', '-i', path], stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    txt = p.stderr.decode('utf8', 'replace')
    m = re.search(r'Duration: (\d+):(\d+):(\d+\.\d+)', txt)
    dur = int(m.group(1)) * 3600 + int(m.group(2)) * 60 + float(m.group(3)) if m else 0.0
    v = re.search(r'Video:.*?(\d{3,5})x(\d{3,5})', txt)
    rot = re.search(r'rotation of (-?\d+)', txt)
    w, h = (int(v.group(1)), int(v.group(2))) if v else (0, 0)
    if rot and abs(int(rot.group(1))) in (90, 270):
        w, h = h, w
    return {'duration': dur, 'w': w, 'h': h, 'audio': 'Audio:' in txt}


def end_card(task, tmp):
    ec = task.get('endcard') or {}
    body = f'''<img class="logo" src="{LOGO_NAVY}"><h2>{e(ec.get('title', 'Managed like it is our own.'))}</h2><p>{e(ec.get('sub', 'mcbride-pm.com'))}</p>
<small>McBride Property Management · Evans, GA · {PM_PHONE}</small>'''
    png = shoot('endc', body, os.path.join(tmp, 'end.png'), W, H)
    out = os.path.join(tmp, 'end.mp4')
    run([ffmpeg(), '-y', '-loop', '1', '-t', '2.2', '-i', png, '-f', 'lavfi', '-t', '2.2', '-i', 'anullsrc=r=48000:cl=stereo',
         '-vf', f'scale={W}:{H},fade=t=in:st=0:d=0.3', *ENC, '-c:a', 'aac', '-b:a', '160k', '-shortest', out])
    return out


def concat(parts, out, tmp):
    lst = os.path.join(tmp, 'list.txt')
    open(lst, 'w').write(''.join(f"file '{p}'\n" for p in parts))
    run([ffmpeg(), '-y', '-f', 'concat', '-safe', '0', '-i', lst, *ENC, '-c:a', 'aac', '-b:a', '160k', '-ar', '48000', '-movflags', '+faststart', out], timeout=1200)
    return out


def preview_strip(video, od):
    """Six frames across the video in one image, so a reviewer can check a video without playing it."""
    d = max(probe(video)['duration'], 1.0)
    out = os.path.join(od, 'preview.jpg')
    run([ffmpeg(), '-y', '-i', video, '-vf', f"fps=6/{d:.3f},scale=270:-2,tile=6x1", '-frames:v', '1', '-q:v', '4', out])
    return out


def look_video_tour(task, od):
    """What It Rents For, built from a listing's own photos: slow push on each photo, facts panel below."""
    l = one_home(task)
    shots = gallery(l, int(task.get('max_photos', 6))) or [listing_photo(l)]
    per = float(task.get('seconds_per_photo', 3.2))
    tmp = tempfile.mkdtemp(prefix='tour-')
    sq = f' · {e(l["sqft"])} sq ft' if l.get('sqft') else ''
    frame = shoot('tour', f'''<div class="tab"><img src="{LOGO_NAVY}"><span>PROPERTY MANAGEMENT</span></div><div class="panel"></div>
<div class="row"><b>{e(l['rent'])}</b><span>/mo</span></div><div class="bb">{e(bb(l['bedbath']))}{sq} · {e(l['city'])}</div><div class="stt">{e(l['street'])} · {avail_text(l)}</div>
<div class="rule"></div><div class="ap">Apply only at mcbride-pm.com/rentals<span>We never take applications or payments through social media.</span></div>''',
                  os.path.join(tmp, 'frame.png'), W, H, transparent=True)
    segs = []
    n = int(per * FPS)
    for k, ph in enumerate(shots):
        seg = os.path.join(tmp, f's{k}.mp4')
        zoom = "min(zoom+0.0007,1.09)" if k % 2 == 0 else "if(eq(on,1),1.09,max(zoom-0.0007,1.0))"
        run([ffmpeg(), '-y', '-i', ph, '-i', frame, '-f', 'lavfi', '-t', str(per), '-i', 'anullsrc=r=48000:cl=stereo', '-filter_complex',
             f"[0:v]scale=2160:2360:force_original_aspect_ratio=increase,crop=2160:2360,zoompan=z='{zoom}':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d={n}:s={W}x1180:fps={FPS},"
             f"pad={W}:{H}:0:0:white[bg];[bg][1:v]overlay=0:0,format=yuv420p[v]",
             '-map', '[v]', '-map', '2:a', '-t', str(per), *ENC, '-c:a', 'aac', '-b:a', '160k', seg])
        segs.append(seg)
    hook = task.get('hook') or {'lines': ['what', l['rent'], 'rents in'], 'punch': l['city'].upper() + '.'}
    cls, body = cover_html({'id': task['id'], 'lines': hook.get('lines'), 'punch': hook.get('punch')}, transparent=True)
    hook_png = shoot(cls, body, os.path.join(tmp, 'hook.png'), W, H, transparent=True)
    body_mp4 = concat(segs, os.path.join(tmp, 'body.mp4'), tmp)
    hooked = os.path.join(tmp, 'hooked.mp4')
    run([ffmpeg(), '-y', '-i', body_mp4, '-loop', '1', '-t', '2.6', '-i', hook_png, '-filter_complex',
         "[1:v]format=rgba,fade=t=out:st=2.2:d=0.4:alpha=1[h];[0:v][h]overlay=0:0:enable='lt(t,2.6)',format=yuv420p[v]", '-map', '[v]', '-map', '0:a', *ENC, '-c:a', 'copy', hooked])
    out = concat([hooked, end_card(dict(task, endcard=task.get('endcard') or {'title': 'See every home for rent', 'sub': 'mcbride-pm.com/rentals'}), tmp)], os.path.join(od, 'video.mp4'), tmp)
    cover_task = {'id': task['id'], 'photo': 'url:file', 'lines': hook.get('lines'), 'punch': hook.get('punch'), 'who': 'McBride Property Management'}
    cls, body = 'rl cc', f'''<div class="ph cover" style="background-image:url('{furl(shots[0])}')"></div><div class="veil"></div>''' + cover_html(dict(cover_task, photo='none'))[1]
    cover = shoot(cls, body, os.path.join(od, 'cover.jpg'), W, H)
    shutil.rmtree(tmp, ignore_errors=True)
    return [out, cover, preview_strip(out, od)], {'homes': [home_facts(l)], 'seconds': round(len(shots) * per + 2.2, 1), 'photos_used': len(shots)}


def ass_time(t):
    h, rem = divmod(max(t, 0), 3600)
    m, s = divmod(rem, 60)
    return f'{int(h)}:{int(m):02d}:{s:05.2f}'


def write_ass(cues, path):
    """Burned captions: Montserrat ExtraBold, white on a navy plate, in the lower third and clear of the app buttons."""
    head = f"""[Script Info]
ScriptType: v4.00+
PlayResX: {W}
PlayResY: {H}
WrapStyle: 0

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Cap,Montserrat ExtraBold,62,&H00FFFFFF,&H00FFFFFF,&H00440606,&H00440606,-1,0,0,0,100,100,0,0,3,14,0,2,90,90,520,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
"""
    lines = [f"Dialogue: 0,{ass_time(c['t'])},{ass_time(c['t'] + c['d'])},Cap,,0,0,0,,{c['text'].replace(chr(10), ' ')}" for c in cues]
    open(path, 'w', encoding='utf8').write(head + '\n'.join(lines) + '\n')
    return path


def transcribe(path):
    """Word timings with faster-whisper (installed on the runner only when a job needs it)."""
    try:
        from faster_whisper import WhisperModel
    except ImportError:
        raise TaskError('captions "auto" needs faster-whisper, which is not installed here')
    model = WhisperModel(os.environ.get('WHISPER_MODEL', 'small.en'), device='cpu', compute_type='int8')
    segs, _ = model.transcribe(path, word_timestamps=True, vad_filter=True)
    words = [{'w': w.word.strip(), 's': w.start, 'e': w.end} for s in segs for w in (s.words or []) if w.word.strip()]
    return words


def cues_from_words(words, max_chars=22, max_gap=0.6):
    cues, cur = [], []
    for w in words:
        text = ' '.join(x['w'] for x in cur + [w])
        if cur and (len(text) > max_chars or w['s'] - cur[-1]['e'] > max_gap or cur[-1]['w'][-1:] in '.?!'):
            cues.append({'t': cur[0]['s'], 'd': max(cur[-1]['e'] - cur[0]['s'], 0.35), 'text': ' '.join(x['w'] for x in cur)})
            cur = []
        cur.append(w)
    if cur:
        cues.append({'t': cur[0]['s'], 'd': max(cur[-1]['e'] - cur[0]['s'], 0.35), 'text': ' '.join(x['w'] for x in cur)})
    return cues


def normalize_clip(src, out, start=None, end=None, mute=False):
    """Any phone clip to 1080x1920, 30 fps, level audio. Landscape clips are cropped to the middle."""
    info = probe(src)
    if not info['w']:
        raise TaskError(f'{os.path.basename(src)} is not a video ffmpeg can read')
    cmd = [ffmpeg(), '-y']
    if start is not None:
        cmd += ['-ss', str(start)]
    if end is not None:
        cmd += ['-to', str(end)]
    cmd += ['-i', src]
    vf = f'scale={W}:{H}:force_original_aspect_ratio=increase,crop={W}:{H},fps={FPS},format=yuv420p'
    if info['audio'] and not mute:
        cmd += ['-vf', vf, '-af', 'loudnorm=I=-16:TP=-1.5:LRA=11,aresample=48000', *ENC, '-c:a', 'aac', '-b:a', '160k', '-ac', '2', out]
    else:
        cmd += ['-f', 'lavfi', '-i', 'anullsrc=r=48000:cl=stereo', '-vf', vf, '-map', '0:v', '-map', '1:a', '-shortest', *ENC, '-c:a', 'aac', '-b:a', '160k', out]
    run(cmd, timeout=1200)
    return out


def look_video_edit(task, od):
    """Raw phone clips to a finished vertical video: trim, join, level the sound, captions, hook, end card."""
    tmp = tempfile.mkdtemp(prefix='edit-')
    parts, used = [], 0.0
    limit = float(task.get('max_seconds', 60))
    for k, c in enumerate(task['clips']):
        c = {'src': c} if isinstance(c, str) else c
        src = photo(c['src'], task['id'])
        seg = normalize_clip(src, os.path.join(tmp, f'c{k}.mp4'), c.get('start'), c.get('end'), c.get('mute', False))
        d = probe(seg)['duration']
        if used + d > limit:
            cut = os.path.join(tmp, f'c{k}-cut.mp4')
            run([ffmpeg(), '-y', '-i', seg, '-t', str(max(limit - used, 1)), *ENC, '-c:a', 'aac', '-b:a', '160k', cut])
            seg, d = cut, max(limit - used, 1)
        parts.append(seg)
        used += d
        if used >= limit:
            break
    body_mp4 = concat(parts, os.path.join(tmp, 'body.mp4'), tmp)
    facts = {'seconds': round(used, 1), 'clips_used': len(parts)}
    cap = task.get('captions')
    cues = []
    if cap == 'auto':
        words = transcribe(body_mp4)
        cues = cues_from_words(words)
        facts['transcript'] = ' '.join(w['w'] for w in words)
    elif isinstance(cap, list):
        cues = cap
    vf, inputs = [], ['-i', body_mp4]
    filt = '[0:v]'
    chain = []
    if cues:
        ass = write_ass(cues, os.path.join(tmp, 'cap.ass'))
        chain.append(f"subtitles='{ass}'")
    fc = filt + (','.join(chain) if chain else 'null') + '[v0]'
    last = '[v0]'
    if task.get('hook'):
        cls, body = cover_html({'id': task['id'], 'lines': task['hook'].get('lines'), 'punch': task['hook'].get('punch')}, transparent=True)
        hook_png = shoot(cls, body, os.path.join(tmp, 'hook.png'), W, H, transparent=True)
        inputs += ['-loop', '1', '-t', '2.8', '-i', hook_png]
        fc += f";[1:v]format=rgba,fade=t=out:st=2.4:d=0.4:alpha=1[h];{last}[h]overlay=0:0:enable='lt(t,2.8)'[v1]"
        last = '[v1]'
    styled = os.path.join(tmp, 'styled.mp4')
    run([ffmpeg(), '-y', *inputs, '-filter_complex', fc + f';{last}format=yuv420p[v]', '-map', '[v]', '-map', '0:a', *ENC, '-c:a', 'copy', styled], timeout=1800)
    final = [styled]
    if task.get('endcard') is not False:
        final.append(end_card(task, tmp))
    out = concat(final, os.path.join(od, 'video.mp4'), tmp)
    frame = os.path.join(tmp, 'frame.jpg')
    run([ffmpeg(), '-y', '-ss', str(min(float(task.get('cover_at', 1.0)), max(used - 0.5, 0))), '-i', body_mp4, '-frames:v', '1', '-q:v', '2', frame])
    files = [out]
    if task.get('cover'):
        cv = dict(task['cover'], id=task['id'], photo='none')
        cls, body = cover_html(cv)
        body = f'''<div class="ph cover" style="background-image:url('{furl(frame)}')"></div><div class="veil"></div>''' + body
        files.append(shoot(cls, body, os.path.join(od, 'cover.jpg'), W, H))
    else:
        shutil.copy(frame, os.path.join(od, 'cover.jpg'))
        files.append(os.path.join(od, 'cover.jpg'))
    files.append(preview_strip(out, od))
    shutil.rmtree(tmp, ignore_errors=True)
    return files, facts


def look_contact(task, od):
    """Small previews of Whitney's uploads so the routine can see what came in: photos shrunk, videos as four frames."""
    from PIL import Image
    files, items = [], []
    for ref in task['items']:
        name = re.sub(r'[^A-Za-z0-9_-]', '_', ref.split(':', 1)[1])[:60]
        try:
            src = photo(ref, task['id'])
            head = open(src, 'rb').read(16)
            is_img = head[:3] == b'\xff\xd8\xff' or head[:8] == b'\x89PNG\r\n\x1a\n' or head[4:12] in (b'ftypheic', b'ftypheix', b'ftypmif1') or head[:4] == b'RIFF'
            dest = os.path.join(od, name + '.jpg')
            if is_img:
                try:
                    im = Image.open(src)
                    im.thumbnail((900, 900))
                    im.convert('RGB').save(dest, quality=80)
                    items.append({'ref': ref, 'kind': 'photo', 'w': im.size[0], 'h': im.size[1], 'preview': os.path.relpath(dest, ROOT)})
                except Exception:   # HEIC and other formats Pillow cannot open: let ffmpeg make the preview
                    run([ffmpeg(), '-y', '-i', src, '-vf', 'scale=900:-2', '-frames:v', '1', dest])
                    items.append({'ref': ref, 'kind': 'photo', 'preview': os.path.relpath(dest, ROOT)})
            else:
                info = probe(src)
                if not info['w']:
                    raise TaskError('not a photo or a video ffmpeg can read')
                step = max(info['duration'] / 5, 0.2)
                run([ffmpeg(), '-y', '-i', src, '-vf', f"fps=1/{step:.3f},scale=360:-2,tile=4x1", '-frames:v', '1', '-q:v', '4', dest])
                item = {'ref': ref, 'kind': 'video', 'seconds': round(info['duration'], 1), 'w': info['w'], 'h': info['h'], 'audio': info['audio'], 'preview': os.path.relpath(dest, ROOT)}
                if task.get('transcribe') and info['audio']:
                    try:
                        item['transcript'] = ' '.join(w['w'] for w in transcribe(src))[:1500]
                    except TaskError as ex:
                        item['transcript_error'] = str(ex)
                items.append(item)
            files.append(dest)
        except TaskError as ex:
            items.append({'ref': ref, 'error': str(ex)})
    return files, {'items': items}


def look_listings(task, od):
    ls = listings(refresh=True)
    return [], {'listings': [home_facts(l) for l in ls], 'count': len(ls)}


LOOKS = {'pm-carousel': look_carousel, 'rent-board': look_rent_board, 'polaroid': look_polaroid, 'story-rental': look_story_rental,
         'reel-cover': look_reel_cover, 'gbp': look_gbp, 'video-tour': look_video_tour, 'video-edit': look_video_edit,
         'contact': look_contact, 'listings': look_listings}


# ------------------------------------------------------------------ job runner
def run_job(path):
    job = json.load(open(path))
    job_id = job.get('job_id') or os.path.splitext(os.path.basename(path))[0]
    if not re.fullmatch(r'[A-Za-z0-9._-]{3,60}', job_id):
        raise SystemExit('bad job_id ' + job_id)
    out_root = os.path.join(ROOT, 'out', job_id)
    if os.path.isdir(out_root):
        shutil.rmtree(out_root)
    os.makedirs(out_root)
    manifest = {'job_id': job_id, 'rendered_at': datetime.datetime.utcnow().isoformat() + 'Z', 'tasks': []}
    done = {}
    for task in job.get('tasks', []):
        tid = task.get('id', '')
        entry = {'id': tid, 'look': task.get('look')}
        try:
            if not re.fullmatch(r'[A-Za-z0-9._-]{2,80}', tid):
                raise TaskError('task id must be letters, numbers, dot, dash, or underscore')
            od = os.path.join(out_root, tid)
            os.makedirs(od, exist_ok=True)
            if task.get('look') == 'pdf':
                files, facts = look_pdf(task, od, done)
            elif task.get('look') in LOOKS:
                files, facts = LOOKS[task['look']](task, od)
            else:
                raise TaskError(f'unknown look {task.get("look")}')
            done[tid] = files
            entry.update(status='ok', files=[os.path.relpath(f, ROOT) for f in files], facts=facts)
            print('ok  ', tid, task.get('look'), len(files), 'files')
        except TaskError as ex:
            entry.update(status='error', error=str(ex))
            print('FAIL', tid, ex)
        except Exception as ex:   # one bad task never stops the rest
            entry.update(status='error', error=f'{type(ex).__name__}: {ex}', trace=traceback.format_exc()[-800:])
            print('FAIL', tid, type(ex).__name__, ex)
        manifest['tasks'].append(entry)
    json.dump(manifest, open(os.path.join(out_root, 'manifest.json'), 'w'), indent=1)
    return manifest


if __name__ == '__main__':
    jobs = [a for a in sys.argv[1:] if a.endswith('.json')]
    if not jobs:
        raise SystemExit('usage: studio.py jobs/<job>.json')
    bad = 0
    for j in jobs:
        m = run_job(j)
        bad += sum(1 for t in m['tasks'] if t['status'] != 'ok')
    print(f'done: {len(jobs)} job(s), {bad} task(s) failed')
