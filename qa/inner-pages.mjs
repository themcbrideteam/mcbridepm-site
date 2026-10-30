// UX QA for every inner page (layout base.njk): the shared header, dropdowns,
// mobile menu, dialog, contact/referral forms, and dark-theme contrast.
// usage: node qa/inner-pages.mjs <base-url> <out-dir> [--live]
//   --live: every POST is blocked and submit flows are skipped (previews, production).
// Needs puppeteer-core (PUPPETEER_CORE, default: ~/code/mcbride-team-site) and Google Chrome.
import os from 'node:os';
import fs from 'node:fs';
const { default: puppeteer } = await import(process.env.PUPPETEER_CORE || `${os.homedir()}/code/mcbride-team-site/node_modules/puppeteer-core/lib/puppeteer/puppeteer-core.js`);
const [,, base, out, liveFlag] = process.argv;
const LIVE = liveFlag === '--live';
fs.mkdirSync(out, { recursive: true });
const browser = await puppeteer.launch({
  executablePath: process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless: 'new', args: ['--no-sandbox'],
});
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const results = [];
const ok = (name, pass, detail = '') => { results.push({ name, pass, detail }); console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}${detail && !pass ? '  — ' + detail : ''}`); };
const IPHONE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1';
// Third parties that aren't the site: analytics, the listings widget, Netlify's preview toolbar
const NOISE = /googletagmanager|google-analytics|analytics\.google|tenantturner|app\.netlify\.com|bugsnag|netlify-cdp|fonts\.g/;

async function newPage(vp, { mobile = false } = {}) {
  const page = await browser.newPage();
  const state = { errors: [], posts: [] };
  page.on('pageerror', e => state.errors.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource|tenantturner|TT widget/i.test(m.text())) state.errors.push('console: ' + m.text()); });
  await page.setRequestInterception(true);
  page.on('request', r => {
    const u = r.url();
    if (/googletagmanager|google-analytics|analytics\.google|app\.netlify\.com|bugsnag/.test(u)) return r.abort();
    if (r.method() === 'POST' && !NOISE.test(u)) {
      state.posts.push(r.postData() || '');
      return LIVE ? r.abort() : r.respond({ status: 200, contentType: 'text/html', body: 'ok' });
    }
    r.continue();
  });
  page.on('requestfailed', r => { if (!NOISE.test(r.url())) state.errors.push('requestfailed: ' + r.url()); });
  await page.setViewport({ ...vp, isMobile: mobile, hasTouch: mobile, deviceScaleFactor: mobile ? 2 : 1 });
  if (mobile) await page.setUserAgent(IPHONE);
  return { page, state };
}
const shot = (page, name) => page.screenshot({ path: `${out}/${name}.jpg`, type: 'jpeg', quality: 62 });
const slug = (p) => p.replace(/^\/|\/$/g, '').replace(/[^a-z0-9]+/gi, '-') || 'home';

// Text whose contrast with what's behind it is under 3:1 — leftover light-theme
// colors (dark gray on navy) show up here. The rentals widget is light on purpose.
const lowContrast = (page) => page.evaluate(() => {
  const parse = (c) => { const m = /rgba?\(([^)]+)\)/.exec(c); if (!m) return null; const v = m[1].split(',').map(Number); return { r: v[0], g: v[1], b: v[2], a: v[3] ?? 1 }; };
  const lin = (x) => { x /= 255; return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4; };
  const L = (c) => 0.2126 * lin(c.r) + 0.7152 * lin(c.g) + 0.0722 * lin(c.b);
  const mix = (f, b) => ({ r: f.r * f.a + b.r * (1 - f.a), g: f.g * f.a + b.g * (1 - f.a), b: f.b * f.a + b.b * (1 - f.a), a: 1 });
  const NAVY = { r: 6, g: 6, b: 50, a: 1 };
  const bgOf = (el) => {
    for (let e = el; e && e !== document.documentElement; e = e.parentElement) {
      const c = parse(getComputedStyle(e).backgroundColor);
      if (c && c.a >= 0.6) return mix(c, NAVY);
    }
    return NAVY;
  };
  const bad = []; const seen = new Set();
  const walker = document.createTreeWalker(document.querySelector('main'), NodeFilter.SHOW_TEXT);
  let n;
  while ((n = walker.nextNode())) {
    const el = n.parentElement;
    if (!n.textContent.trim() || seen.has(el)) continue;
    seen.add(el);
    if (el.closest('.listing-board, script, style, noscript, [hidden], dialog')) continue;
    const r = el.getBoundingClientRect(); if (!r.width || !r.height) continue;
    const st = getComputedStyle(el);
    if (st.visibility === 'hidden' || st.display === 'none') continue;
    const fgRaw = parse(st.color); if (!fgRaw) continue;
    const bg = bgOf(el); const fg = mix(fgRaw, bg);
    const a = L(fg), b = L(bg);
    const ratio = (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
    if (ratio < 3) bad.push(`${el.tagName.toLowerCase()}.${(el.className || '').toString().split(' ')[0]} "${n.textContent.trim().slice(0, 40)}" ${ratio.toFixed(2)}:1`);
  }
  return bad;
});

// Buttons whose label breaks onto a second line (measured on the text itself, icons ignored)
const wrappedButtons = (page) => page.evaluate(() => [...document.querySelectorAll('.btn')].filter(b => {
  const r = b.getBoundingClientRect();
  if (!r.width || !r.height || getComputedStyle(b).display === 'none') return false;
  const lines = new Set();
  const w = document.createTreeWalker(b, NodeFilter.SHOW_TEXT);
  let t;
  while ((t = w.nextNode())) {
    if (!t.textContent.trim()) continue;
    const rg = document.createRange(); rg.selectNodeContents(t);
    [...rg.getClientRects()].filter(x => x.width > 1).forEach(x => lines.add(Math.round(x.top / 6)));
  }
  return lines.size > 1;
}).map(b => b.textContent.trim().replace(/\s+/g, ' ')));

const layoutChecks = (page) => page.evaluate(() => {
  if (!document.getElementById('nav')) return { noNav: true, landed: location.href };
  const nav = document.getElementById('nav').getBoundingClientRect();
  const h1 = document.querySelector('main h1');
  const h1r = h1 ? h1.getBoundingClientRect() : null;
  const items = [...document.querySelectorAll('.nav-links > *')].filter(e => e.getBoundingClientRect().width > 0);
  const tops = items.map(e => Math.round(e.getBoundingClientRect().top + e.getBoundingClientRect().height / 2));
  const imgs = [...document.querySelectorAll('main img')].map(i => i.currentSrc || i.src).filter(u => u.startsWith(location.origin));
  return {
    overflow: document.documentElement.scrollWidth - innerWidth,
    navH: Math.round(nav.height), navOneRow: Math.max(...tops) - Math.min(...tops) <= 4,
    h1Clear: h1r ? h1r.top >= nav.bottom - 2 : null, h1Top: h1r ? Math.round(h1r.top) : null,
    stage: !!document.querySelector('.page-stage img')?.currentSrc,
    imgs,
  };
});

/* ================= 1. Every inner page: layout, contrast, errors ================= */
const imgStatus = {};
const listHtml = await (await fetch(base + '/sitemap.xml')).text();
const all = [...listHtml.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => new URL(m[1].trim()).pathname).filter(p => p !== '/');
const pages = [...new Set(all.concat(['/thank-you/', '/referral-thank-you/', '/404.html']))];
const FEATURED = ['/services/', '/why-hire/', '/owner-faqs/', '/resident-faqs/', '/about/', '/resources/', '/blog/', '/referral/', '/contact/', '/rentals/', '/evans/', '/privacy/', '/thank-you/'];
const posts = pages.filter(p => /^\/blog\/.+/.test(p));
FEATURED.push(posts[0], posts[Math.floor(posts.length / 2)]);
console.log(`${pages.length} inner pages (${posts.length} blog posts)`);

for (const [label, vp, mobile] of [['desk', { width: 1440, height: 900 }, false], ['phone', { width: 390, height: 844 }, true]]) {
  const { page, state } = await newPage(vp, { mobile });
  const fails = { overflow: [], contrast: [], nav: [], h1: [], stage: [], broken: [], errors: [], wrap: [] };
  for (const p of pages) {
    if (!mobile || FEATURED.includes(p) || !p.startsWith('/blog/')) {
      state.errors.length = 0;
      // A dropped connection retries; a real failure still throws on the third try
      for (let tries = 1; ; tries++) {
        try { await page.goto(base + p, { waitUntil: FEATURED.includes(p) ? 'networkidle2' : 'load', timeout: 60000 }); break; }
        catch (e) { if (tries >= 3) throw e; await sleep(2000); }
      }
      await sleep(FEATURED.includes(p) ? 900 : 150);
      const lc = await layoutChecks(page);
      if (lc.noNav) { fails.nav.push(`${p} has no site header (landed on ${lc.landed})`); continue; }
      if (lc.overflow > 0) fails.overflow.push(`${p} +${lc.overflow}px`);
      if (!lc.navOneRow || lc.navH > 96) fails.nav.push(`${p} h=${lc.navH}`);
      if (lc.h1Clear === false) fails.h1.push(`${p} h1 top ${lc.h1Top}`);
      if (!lc.stage) fails.stage.push(p);
      for (const u of lc.imgs) {
        if (!(u in imgStatus)) imgStatus[u] = (await fetch(u, { method: 'HEAD' }).catch(() => ({ status: 0 }))).status;
        if (imgStatus[u] !== 200) fails.broken.push(`${p}: ${u.replace(base, '')} (${imgStatus[u]})`);
      }
      const wb = await wrappedButtons(page);
      if (wb.length) fails.wrap.push(`${p}: ${wb.join(' | ')}`);
      const lowc = await lowContrast(page);
      if (lowc.length) fails.contrast.push(`${p}: ${lowc.slice(0, 4).join(' | ')}${lowc.length > 4 ? ` (+${lowc.length - 4})` : ''}`);
      if (state.errors.length) fails.errors.push(`${p}: ${state.errors.slice(0, 2).join(' | ')}`);
      if (FEATURED.includes(p)) {
        await shot(page, `${label}-${slug(p)}-1`);
        const H = await page.evaluate(() => document.documentElement.scrollHeight);
        for (const [i, f] of [[2, 0.3], [3, 0.6]]) {
          if (H < vp.height * 2) break;
          await page.evaluate(y => scrollTo(0, y), Math.round(H * f)); await sleep(500);
          await shot(page, `${label}-${slug(p)}-${i}`);
        }
      }
    }
  }
  const n = mobile ? pages.filter(p => FEATURED.includes(p) || !p.startsWith('/blog/')).length : pages.length;
  ok(`${label}: no sideways scroll on ${n} pages`, !fails.overflow.length, fails.overflow.join('; '));
  ok(`${label}: header stays one row`, !fails.nav.length, fails.nav.join('; '));
  ok(`${label}: page titles clear of the header`, !fails.h1.length, fails.h1.join('; '));
  ok(`${label}: backdrop photo loads`, !fails.stage.length, fails.stage.join('; '));
  ok(`${label}: no broken images`, !fails.broken.length, fails.broken.join('; '));
  ok(`${label}: no button label wraps to two lines`, !fails.wrap.length, fails.wrap.join('; '));
  ok(`${label}: all text readable on the dark theme (3:1+)`, !fails.contrast.length, fails.contrast.join('\n      '));
  ok(`${label}: no script errors or broken requests`, !fails.errors.length, fails.errors.join('; '));
  await page.close();
}

/* ================= 2. Header: dropdowns, keyboard, widths ================= */
{
  const { page, state } = await newPage({ width: 1440, height: 900 });
  await page.goto(base + '/services/', { waitUntil: 'networkidle2' }); await sleep(600);
  const vis = (id) => page.$eval(id, el => getComputedStyle(el).visibility === 'visible' && +getComputedStyle(el).opacity > 0.9);
  await page.hover('[aria-controls="drop-owners"]'); await sleep(350);
  ok('Owners menu opens on hover', await vis('#drop-owners'));
  const ownerLinks = await page.$$eval('#drop-owners a', as => as.map(a => a.getAttribute('href')));
  ok('Owners menu links: Services, Why Hire, Owner FAQs, Areas, Resources, Blog', JSON.stringify(ownerLinks) === JSON.stringify(['/services/', '/why-hire/', '/owner-faqs/', '/#all-areas', '/resources/', '/blog/']), JSON.stringify(ownerLinks));
  ok('current section (Owners) is marked', await page.$eval('#drop-owners', el => el.parentElement.classList.contains('is-current')));
  await page.mouse.move(700, 600); await sleep(350);
  ok('Owners menu closes when the mouse leaves', !(await vis('#drop-owners')));
  await page.click('[aria-controls="drop-portals"]'); await sleep(350);
  const portals = await page.$$eval('#drop-portals a', as => as.map(a => a.textContent.trim().replace(/\s+/g, ' ')));
  ok('Portals opens on click with Owner Portal and Resident Portal', (await vis('#drop-portals')) && portals.length === 2 && /^Owner Portal/.test(portals[0]) && /^Resident Portal/.test(portals[1]), JSON.stringify(portals));
  ok('Portals button reports expanded', (await page.$eval('[aria-controls="drop-portals"]', b => b.getAttribute('aria-expanded'))) === 'true');
  const hrefs = await page.$$eval('#drop-portals a', as => as.map(a => a.href));
  ok('portal links go to AppFolio', hrefs.every(h => /appfolio\.com/.test(h)), JSON.stringify(hrefs));
  await page.keyboard.press('Escape'); await sleep(300);
  ok('Escape closes the dropdown', !(await vis('#drop-portals')));
  // Keyboard only: Tab to Owners, Enter, Tab into the menu
  await page.goto(base + '/about/', { waitUntil: 'networkidle2' }); await sleep(500);
  for (let i = 0; i < 12; i++) {
    await page.keyboard.press('Tab');
    if (await page.evaluate(() => document.activeElement?.getAttribute('aria-controls') === 'drop-owners')) break;
  }
  await page.keyboard.press('Enter'); await sleep(300);
  await page.keyboard.press('Tab');
  const focusIn = await page.evaluate(() => document.activeElement?.closest('#drop-owners') ? document.activeElement.getAttribute('href') : null);
  ok('keyboard: Enter opens Owners and Tab moves into it', (await vis('#drop-owners')) && focusIn === '/services/', String(focusIn));
  const topItems = await page.$$eval('.nav-links > .nav-item, .nav-links > .nav-drop > .nav-item', es => es.filter(e => e.getBoundingClientRect().width > 0).map(e => e.textContent.trim()));
  ok('top bar: Owners, Available Rentals, Portals, Agent Referral, About, phone', JSON.stringify(topItems) === JSON.stringify(['Owners', 'Available Rentals', 'Portals', 'Agent Referral', 'About', '(706) 339-2874']), JSON.stringify(topItems));
  // The bar fits on one row at every desktop width
  const widthFails = [];
  for (const w of [1024, 1100, 1180, 1280, 1366, 1600, 1920]) {
    await page.setViewport({ width: w, height: 800 }); await sleep(250);
    const r = await page.evaluate(() => {
      const items = [...document.querySelectorAll('.nav-links > *')].filter(e => e.getBoundingClientRect().width > 0);
      const rs = items.map(e => e.getBoundingClientRect());
      const logo = document.querySelector('.nav-logo').getBoundingClientRect();
      let overlap = rs.some((a, i) => i && a.left < rs[i - 1].right - 1) || rs[0].left < logo.right + 8;
      return { overlap, oneRow: Math.max(...rs.map(x => x.top)) - Math.min(...rs.map(x => x.top)) < 14, right: Math.round(Math.max(...rs.map(x => x.right))), vw: innerWidth };
    });
    if (r.overlap || !r.oneRow || r.right > r.vw) widthFails.push(`${w}: ${JSON.stringify(r)}`);
  }
  ok('top bar fits without overlap from 1024 to 1920 wide', !widthFails.length, widthFails.join('; '));
  ok('no script errors (header)', !state.errors.length, state.errors.join(' | '));
  await page.close();
}

/* ================= 3. Phone: menu, call bar, dialog ================= */
{
  const { page, state } = await newPage({ width: 390, height: 844 }, { mobile: true });
  await page.goto(base + '/why-hire/', { waitUntil: 'networkidle2' }); await sleep(600);
  await page.tap('.nav-burger'); await sleep(450);
  const menu = await page.evaluate(() => ({
    open: document.documentElement.classList.contains('menu-open'),
    links: [...document.querySelectorAll('#mobile-menu a')].map(a => a.textContent.trim()),
    current: document.querySelector('#mobile-menu a[aria-current="page"]')?.textContent.trim(),
  }));
  ok('phone menu opens with every section', menu.open && ['PM Services', 'Why Hire Us', 'Owner FAQs', 'Areas We Serve', 'Resources', 'Blog', 'Available Rentals', 'Resident Portal', 'Resident FAQs', 'Owner Portal', 'Agent Referral', 'About', 'Contact'].every(t => menu.links.includes(t)), JSON.stringify(menu.links));
  ok('phone menu marks the current page', menu.current === 'Why Hire Us', String(menu.current));
  await shot(page, 'phone-menu-open');
  const fitsMenu = await page.evaluate(() => { const m = document.querySelector('.mm-inner'); return m.scrollHeight <= m.parentElement.scrollHeight + 1; });
  ok('phone menu scrolls if taller than the screen', fitsMenu);
  await page.keyboard.press('Escape'); await sleep(350);
  ok('Escape closes the phone menu', !(await page.evaluate(() => document.documentElement.classList.contains('menu-open'))));
  await page.evaluate(() => scrollTo(0, innerHeight * 1.2)); await sleep(800);
  ok('call bar appears after scrolling', await page.$eval('.sticky-cta', el => el.classList.contains('is-visible')));
  await page.tap('.sticky-cta [data-open-lead]'); await sleep(600);
  const d = await page.evaluate(() => ({ open: document.getElementById('lead-dialog').open, page: document.querySelector('#lead-dialog [name="page"]').value, source: document.querySelector('#lead-dialog [name="source"]').value }));
  ok('call bar opens the form on an inner page', d.open && /cta=sticky/.test(d.source), JSON.stringify(d));
  ok('the form records which page it was sent from', d.page === '/why-hire/', d.page);
  await shot(page, 'phone-dialog-inner');
  ok('no script errors (phone)', !state.errors.length, state.errors.join(' | '));
  await page.close();
}

/* ================= 4. Lead paths on inner pages ================= */
{
  const { page, state } = await newPage({ width: 1440, height: 900 });
  // An inner page's own "Rental Analysis" button opens the dialog instead of loading /contact/
  await page.goto(base + '/services/', { waitUntil: 'networkidle2' }); await sleep(500);
  const inline = await page.$('main a[href="/contact/"][data-open-lead="inline"]');
  ok('page "Rental Analysis" buttons open the form in place', !!inline);
  if (inline) { await inline.evaluate(a => a.click()); await sleep(500); ok('…and the form opens at step 1', await page.evaluate(() => document.getElementById('lead-dialog').open && !document.querySelector('.ld-step[data-step="1"]').hidden)); await page.keyboard.press('Escape'); }
  await page.evaluate(() => document.querySelector('.nav [data-open-lead]').click()); await sleep(500);
  ok('header button opens the form on inner pages', await page.evaluate(() => document.getElementById('lead-dialog').open));
  await shot(page, 'desk-dialog-inner');
  if (!LIVE) {
    await page.type('#ld-address', '22 Inner Page Rd, Evans'); await page.keyboard.press('Enter'); await sleep(400);
    await page.type('#ld-name', 'Inner Test'); await page.type('#ld-email', 'inner@example.com');
    await page.evaluate(() => document.querySelector('#lead-dialog .lead-submit').click()); await sleep(900);
    const body = new URLSearchParams(state.posts.at(-1) || '');
    ok('inner-page form sends with the page it came from', body.get('form-name') === 'rental-analysis' && body.get('page') === '/services/' && /cta=nav/.test(body.get('source') || ''), JSON.stringify(Object.fromEntries(body)));
  }
  // /contact/ has no dialog: the header button brings the visitor to the form
  await page.goto(base + '/contact/', { waitUntil: 'networkidle2' }); await sleep(500);
  await page.evaluate(() => scrollTo(0, document.body.scrollHeight)); await sleep(400);
  await page.evaluate(() => { document.getElementById('nav').classList.remove('nav-hidden'); document.querySelector('.nav [data-open-lead]').click(); }); await sleep(1300);
  const c = await page.evaluate(() => { const f = document.querySelector('#analysisForm').getBoundingClientRect(); return { inView: f.top < innerHeight && f.bottom > 0, active: document.activeElement?.name, url: location.pathname }; });
  ok('on /contact/, the header button jumps to the form and focuses it', c.inView && c.active === 'address' && c.url === '/contact/', JSON.stringify(c));
  if (!LIVE) {
    state.posts.length = 0;
    await page.type('#analysisForm [name="address"]', '9 Contact Ct, Evans');
    await page.type('#analysisForm [name="fullName"]', 'Contact Test'); await page.type('#analysisForm [name="email"]', 'c@example.com');
    await page.evaluate(() => document.querySelector('#analysisForm [type="submit"]').click()); await sleep(900);
    const body = new URLSearchParams(state.posts[0] || '');
    const success = await page.evaluate(() => { const s = document.querySelector('[data-success]'); return !!s && !s.hidden; });
    ok('contact form sends and shows its thank-you', body.get('form-name') === 'rental-analysis' && body.get('page') === '/contact/' && success, JSON.stringify(Object.fromEntries(body)));
    await shot(page, 'desk-contact-success');
    // Referral form
    state.posts.length = 0;
    await page.goto(base + '/referral/', { waitUntil: 'networkidle2' }); await sleep(500);
    await page.evaluate(() => document.getElementById('referral-form').scrollIntoView()); await sleep(500);
    await shot(page, 'desk-referral-form');
    await page.type('#agentName', 'Agent Test'); await page.type('#brokerage', 'Test Realty'); await page.type('#agentEmail', 'agent@example.com'); await page.type('#agentPhone', '7065550111');
    await page.evaluate(() => document.querySelector('#referral-form [type="submit"]').click()); await sleep(1200);
    const rb = new URLSearchParams(state.posts[0] || '');
    ok('referral form sends', rb.get('form-name') === 'realtor-referral' && rb.get('agentName') === 'Agent Test', JSON.stringify(Object.fromEntries(rb)));
  }
  ok('no script errors (lead paths)', !state.errors.length, state.errors.join(' | '));
  await page.close();
}

const failed = results.filter(r => !r.pass);
console.log(`\n${results.length - failed.length}/${results.length} passed`);
fs.writeFileSync(`${out}/results.json`, JSON.stringify(results, null, 1));
await browser.close();
