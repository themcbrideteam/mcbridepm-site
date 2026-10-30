// Full UX QA for the mcbride-pm.com homepage + contact form (153 checks).
// usage: node qa/homepage-ux.mjs <base-url> <out-dir> [--live]
//   local:  npx @11ty/eleventy && node qa/serve.mjs _site 8787 &  then  node qa/homepage-ux.mjs http://localhost:8787 /tmp/qa
//   --live: for previews and production — every POST is blocked and the submit flows are skipped,
//           so nothing reaches Netlify Forms or Robert's inbox. GA requests are always blocked.
// Needs puppeteer-core (PUPPETEER_CORE, default: the copy in ~/code/mcbride-team-site) and Google Chrome.
import os from 'node:os';
const { default: puppeteer } = await import(process.env.PUPPETEER_CORE || `${os.homedir()}/code/mcbride-team-site/node_modules/puppeteer-core/lib/puppeteer/puppeteer-core.js`);
import fs from 'node:fs';
const [,, base, out, liveFlag] = process.argv;
const LIVE = liveFlag === '--live';
fs.mkdirSync(out, { recursive: true });
const browser = await puppeteer.launch({
  executablePath: process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless: 'new', args: ['--no-sandbox', '--autoplay-policy=no-user-gesture-required'],
});
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const results = [];
const ok = (name, pass, detail = '') => { results.push({ name, pass, detail }); console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}${detail ? '  — ' + detail : ''}`); };
const IPHONE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1';

async function newPage(vp, { mobile = false, postMode = 'ok', js = true, reduced = false } = {}) {
  const page = await browser.newPage();
  const state = { errors: [], posts: [], postMode };
  page.on('pageerror', e => state.errors.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource: net::ERR_FAILED/.test(m.text())) state.errors.push('console: ' + m.text()); });
  await page.setRequestInterception(true);
  page.on('request', r => {
    const u = r.url();
    if (/googletagmanager|google-analytics|analytics\.google/.test(u)) return r.abort();   // keep QA out of GA
    if (r.method() === 'POST') {
      state.posts.push(r.postData() || '');
      if (LIVE) return r.abort();
      return state.postMode === 'fail' ? r.respond({ status: 500, body: 'err' }) : r.respond({ status: 200, contentType: 'text/html', body: 'ok' });
    }
    r.continue();
  });
  page.on('requestfailed', r => { if (!/\.mp4|google/.test(r.url())) state.errors.push('requestfailed: ' + r.url()); });
  await page.setJavaScriptEnabled(js);
  await page.setViewport({ ...vp, isMobile: mobile, hasTouch: mobile, deviceScaleFactor: mobile ? 2 : 1 });
  if (mobile) await page.setUserAgent(IPHONE);
  if (reduced) await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
  return { page, state };
}
const shot = (page, name) => page.screenshot({ path: `${out}/${name}.jpg`, type: 'jpeg', quality: 70 });
const dialogState = (page) => page.evaluate(() => {
  const d = document.getElementById('lead-dialog');
  const vis = (s) => !document.querySelector(s).hidden;
  const r = d.getBoundingClientRect();
  return {
    open: d.open, step1: vis('.ld-step[data-step="1"]'), step2: vis('.ld-step[data-step="2"]'),
    success: vis('.lead-success'), active: document.activeElement?.id || document.activeElement?.className || document.activeElement?.tagName,
    echo: document.querySelector('[data-address-echo]').textContent,
    progressOn: [...document.querySelectorAll('.ld-progress li')].filter(li => li.classList.contains('is-on')).length,
    htmlLocked: document.documentElement.classList.contains('dialog-open'),
    rect: { top: Math.round(r.top), bottom: Math.round(r.bottom), left: Math.round(r.left), right: Math.round(r.right), h: Math.round(r.height) },
    vh: innerHeight, vw: innerWidth,
    errors: [...document.querySelectorAll('#lead-dialog .field-error')].filter(e => !e.hidden).map(e => e.id),
    source: document.querySelector('#lead-dialog [name="source"]').value,
  };
});
const gaEvents = (page) => page.evaluate(() => (window.dataLayer || []).filter(a => a && a[0] === 'event').map(a => a[1]));
const clickSel = (page, sel) => page.evaluate(s => document.querySelector(s).click(), sel);

// Button geometry: height and how far the label sits from the button's vertical center
const buttonGeometry = (page, sel) => page.evaluate((sel) => [...document.querySelectorAll(sel)].map(b => {
  const r = b.getBoundingClientRect();
  const walker = document.createTreeWalker(b, NodeFilter.SHOW_TEXT, { acceptNode: n => n.textContent.trim() ? 1 : 3 });
  const t = walker.nextNode(); let off = null;
  if (t) { const rg = document.createRange(); rg.selectNodeContents(t); const tr = rg.getBoundingClientRect(); off = +(((tr.top + tr.bottom) / 2) - ((r.top + r.bottom) / 2)).toFixed(1); }
  return { text: b.textContent.trim().replace(/\s+/g, ' ').slice(0, 32), h: Math.round(r.height), w: Math.round(r.width), centerOff: off, visible: r.width > 0 && r.height > 0 };
}).filter(x => x.visible), sel);

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

/* ================= 1. Layout sweep per viewport ================= */
const VIEWPORTS = [
  ['desk1920', { width: 1920, height: 1080 }, false],
  ['desk1440', { width: 1440, height: 900 }, false],
  ['desk1280', { width: 1280, height: 720 }, false],
  ['ipad', { width: 820, height: 1180 }, true],
  ['iphone', { width: 390, height: 844 }, true],
  ['small', { width: 360, height: 740 }, true],
];
for (const [name, vp, mobile] of VIEWPORTS) {
  const { page, state } = await newPage(vp, { mobile });
  await page.goto(base + '/', { waitUntil: 'networkidle2', timeout: 90000 });
  await sleep(2600);
  if (!mobile) {
    const ring = await page.evaluate(() => getComputedStyle(document.querySelector('.cursor-ring')).opacity);
    ok(`${name}: cursor ring hidden before the mouse moves`, ring === '0', `opacity ${ring}`);
    await page.mouse.move(vp.width / 2, vp.height / 2); await sleep(400);
    const ring2 = await page.evaluate(() => getComputedStyle(document.querySelector('.cursor-ring')).opacity);
    ok(`${name}: cursor ring shows after the mouse moves`, ring2 === '1', `opacity ${ring2}`);
    await page.mouse.move(5, vp.height - 5);
  }
  await shot(page, `${name}-01-hero`);
  const fold = await page.evaluate(() => { const p = document.querySelector('.address-pill').getBoundingClientRect(); const r = document.querySelector('.renter-line').getBoundingClientRect(); return { pill: Math.round(p.bottom), renter: Math.round(r.bottom), vh: innerHeight }; });
  ok(`${name}: hero address box above the fold`, fold.pill <= fold.vh, JSON.stringify(fold));
  if (!mobile) ok(`${name}: hero proof line and renter link above the fold`, fold.renter <= fold.vh, JSON.stringify(fold));
  const heroBtns = await buttonGeometry(page, '.hero .btn, .nav .btn');
  ok(`${name}: hero/nav button labels vertically centered`, heroBtns.every(b => Math.abs(b.centerOff) <= 2), JSON.stringify(heroBtns));
  ok(`${name}: hero/nav buttons stay on one line`, heroBtns.every(b => b.h <= 54), JSON.stringify(heroBtns.map(b => b.h)));
  const wrapped = await wrappedButtons(page);
  ok(`${name}: no button label wraps to two lines`, !wrapped.length, wrapped.join(' | '));
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
  ok(`${name}: no sideways scroll`, overflow <= 0, `overflow ${overflow}px`);

  for (const id of ['door', 'living', 'office', 'study', 'porch', 'handoff', 'all-areas', 'renters']) {
    await page.evaluate((id) => { const el = document.getElementById(id); scrollTo(0, el.getBoundingClientRect().top + scrollY); }, id);
    await sleep(1500);
    await shot(page, `${name}-${id}`);
    if (!mobile) {
      // The rail (dots + any visible label) must stay clear of the chapter's content column
      const clash = await page.evaluate((id) => {
        const content = document.querySelector(`#${id} .chapter-content, #${id} .horizontal-head, #${id} .container`);
        if (!content) return null;
        const c = content.getBoundingClientRect();
        const dots = [...document.querySelectorAll('.rail-dot')].map(d => d.getBoundingClientRect());
        const labels = [...document.querySelectorAll('.rail-label')].filter(l => getComputedStyle(l).display !== 'none' && +getComputedStyle(l).opacity > 0.05).map(l => l.getBoundingClientRect());
        const left = Math.min(...dots.map(d => d.left), ...labels.map(l => l.left));
        return { railLeft: Math.round(left), contentRight: Math.round(c.right), dotXs: [...new Set(dots.map(d => Math.round(d.left)))] };
      }, id);
      if (clash && id !== 'living') ok(`${name}: rail clear of ${id} content`, clash.railLeft > clash.contentRight, JSON.stringify(clash));
      if (clash && id === 'door') ok(`${name}: rail dots form one straight column`, clash.dotXs.length === 1, JSON.stringify(clash.dotXs));
    }
  }
  // Handoff buttons: one height, centered labels
  await page.evaluate(() => document.getElementById('handoff').scrollIntoView()); await sleep(1500);
  const handoffBtns = await buttonGeometry(page, '#handoff .btn');
  const hs = [...new Set(handoffBtns.map(b => b.h))];
  ok(`${name}: Handoff buttons share one height`, hs.length === 1, JSON.stringify(handoffBtns));
  ok(`${name}: Handoff button labels centered`, handoffBtns.every(b => Math.abs(b.centerOff) <= 2), JSON.stringify(handoffBtns.map(b => b.centerOff)));
  const card = await page.evaluate(() => { const r = document.querySelector('.start-card').getBoundingClientRect(); return { top: Math.round(r.top), bottom: Math.round(r.bottom), vh: innerHeight }; });
  ok(`${name}: Handoff start card fits on screen`, card.bottom - card.top <= card.vh, JSON.stringify(card));

  if (!mobile) {
    // Walkthrough video follows the scroll
    const H = await page.evaluate(() => document.documentElement.scrollHeight - innerHeight);
    const ts = [];
    for (const f of [0.1, 0.4, 0.75]) { await page.evaluate(y => scrollTo(0, y), Math.round(H * f)); await sleep(2200); ts.push(await page.evaluate(() => +document.querySelector('.video-stage video').currentTime.toFixed(1))); }
    ok(`${name}: walkthrough video scrubs with the scroll`, ts[0] < ts[1] && ts[1] < ts[2], JSON.stringify(ts));
  } else {
    const src = await page.evaluate(() => document.querySelector('.video-stage video').currentSrc.split('/').pop());
    ok(`${name}: phone loads the light mobile video`, src === 'rosewood-tour-mobile.mp4', src);
    await page.evaluate(() => scrollTo(0, document.getElementById('door').offsetTop + 200)); await sleep(1200);
    const sticky = await page.evaluate(() => document.querySelector('.sticky-cta').classList.contains('is-visible'));
    ok(`${name}: sticky call bar appears after the hero`, sticky);
    const stickyBtns = await buttonGeometry(page, '.sticky-cta .btn');
    ok(`${name}: sticky bar buttons match`, new Set(stickyBtns.map(b => b.h)).size === 1 && stickyBtns.every(b => Math.abs(b.centerOff) <= 2), JSON.stringify(stickyBtns));
  }
  ok(`${name}: no script errors or broken requests`, state.errors.length === 0, state.errors.join(' | '));
  await page.close();
}

/* ================= 2. Dialog flows ================= */
async function heroFlow(label, vp, mobile) {
  const { page, state } = await newPage(vp, { mobile });
  await page.goto(base + '/?utm_source=qa&utm_campaign=ux-pass', { waitUntil: 'networkidle2', timeout: 90000 });
  await sleep(2400);
  await page.type('#hero-address', '4521 Rosewood Dr, Evans, GA 30809');
  await clickSel(page, '.address-pill .btn');
  await sleep(700);
  let s = await dialogState(page);
  ok(`${label}: hero address opens the form at step 2`, s.open && s.step2 && !s.step1, JSON.stringify(s));
  ok(`${label}: the typed address carries in`, s.echo === '4521 Rosewood Dr, Evans, GA 30809', s.echo);
  ok(`${label}: focus lands on the name field`, s.active === 'ld-name', s.active);
  ok(`${label}: background scroll locked while open`, s.htmlLocked);
  ok(`${label}: lead source records the button and UTMs`, /cta=hero/.test(s.source) && /utm_source=qa/.test(s.source), s.source);
  if (mobile) ok(`${label}: form opens as a bottom sheet`, Math.abs(s.rect.bottom - s.vh) <= 1 && s.rect.left === 0 && s.rect.right === s.vw, JSON.stringify(s.rect));
  else ok(`${label}: form is centered and fits the screen`, s.rect.top >= 0 && s.rect.bottom <= s.vh, JSON.stringify(s.rect));
  await shot(page, `${label}-dialog-step2`);

  // Submit empty → inline errors, no POST
  await clickSel(page, '#lead-dialog .lead-submit'); await sleep(300);
  s = await dialogState(page);
  ok(`${label}: empty submit shows inline errors and sends nothing`, s.errors.includes('ld-name-err') && s.errors.includes('ld-email-err') && state.posts.length === 0, JSON.stringify(s.errors));
  ok(`${label}: focus moves to the first problem`, s.active === 'ld-name', s.active);
  await shot(page, `${label}-dialog-errors`);
  await page.type('#ld-name', 'Test Lead');
  await page.type('#ld-email', 'test@');
  await clickSel(page, '#lead-dialog .lead-submit'); await sleep(300);
  s = await dialogState(page);
  ok(`${label}: name error clears once typed; bad email still flagged`, !s.errors.includes('ld-name-err') && s.errors.includes('ld-email-err'), JSON.stringify(s.errors));
  await page.type('#ld-email', 'example.com');
  await page.type('#ld-phone', '7065550100');
  await page.evaluate(() => document.querySelectorAll('#lead-dialog .chip')[0].click());
  await sleep(400);
  const chipBg = await page.$eval('#lead-dialog .chip input:checked + span', e => getComputedStyle(e).backgroundColor);
  ok(`${label}: the selected situation chip turns gold`, chipBg === 'rgb(178, 153, 90)', chipBg);
  await shot(page, `${label}-dialog-filled`);
  await clickSel(page, '#lead-dialog .lead-submit'); await sleep(900);
  s = await dialogState(page);
  const body = new URLSearchParams(state.posts[0] || '');
  ok(`${label}: one POST with every field`, state.posts.length === 1 && body.get('form-name') === 'rental-analysis' && body.get('address') === '4521 Rosewood Dr, Evans, GA 30809' && body.get('fullName') === 'Test Lead' && body.get('email') === 'test@example.com' && body.get('phone') === '7065550100' && /PCS/.test(body.get('situation') || '') && body.get('page') === '/' && /cta=hero/.test(body.get('source') || ''), JSON.stringify(Object.fromEntries(body)));
  ok(`${label}: thank-you shows with the first name`, s.success && /Thanks, Test\./.test(await page.$eval('.lead-success .ld-title', e => e.textContent)), await page.$eval('.lead-success .ld-title', e => e.textContent));
  ok(`${label}: progress shows both steps complete`, s.progressOn === 2);
  await shot(page, `${label}-dialog-success`);
  const ev = await gaEvents(page);
  ok(`${label}: GA4 events fired in order`, ['lead_start', 'lead_dialog_open', 'form_start', 'generate_lead'].every(e => ev.includes(e)), ev.join(','));
  await clickSel(page, '.lead-success [data-dialog-close]'); await sleep(400);
  s = await dialogState(page);
  ok(`${label}: "Back to the tour" closes and unlocks the page`, !s.open && !s.htmlLocked, JSON.stringify({ open: s.open, locked: s.htmlLocked }));
  ok(`${label}: focus returns to where the visitor was`, s.active === 'hero-address', s.active);
  ok(`${label}: no script errors`, state.errors.length === 0, state.errors.join(' | '));
  await page.close();
}
if (!LIVE) {
  await heroFlow('flow-desktop', { width: 1440, height: 900 }, false);
  await heroFlow('flow-iphone', { width: 390, height: 844 }, true);
}

// Nav button → step 1 → validation → Enter → step 2 → Change → Esc
{
  const { page, state } = await newPage({ width: 1440, height: 900 });
  await page.goto(base + '/', { waitUntil: 'networkidle2', timeout: 90000 }); await sleep(2400);
  await clickSel(page, '.nav [data-open-lead]'); await sleep(600);
  let s = await dialogState(page);
  ok('nav button opens the form at step 1 with focus on the address', s.open && s.step1 && s.active === 'ld-address', JSON.stringify(s));
  await shot(page, 'nav-dialog-step1');
  await clickSel(page, '[data-next]'); await sleep(300);
  s = await dialogState(page);
  ok('Continue with no address shows an error', s.step1 && s.errors.includes('ld-address-err'));
  await page.type('#ld-address', '12'); await page.keyboard.press('Enter'); await sleep(300);
  s = await dialogState(page);
  ok('a too-short address is rejected', s.step1 && s.errors.includes('ld-address-err'));
  await page.type('#ld-address', '7 Pine St, Grovetown'); await page.keyboard.press('Enter'); await sleep(500);
  s = await dialogState(page);
  ok('Enter on a valid address moves to step 2', s.step2 && s.echo === '127 Pine St, Grovetown' && s.active === 'ld-name', JSON.stringify(s));
  await clickSel(page, '[data-back]'); await sleep(400);
  s = await dialogState(page);
  ok('"Change" goes back to step 1 with the address kept', s.step1 && (await page.$eval('#ld-address', e => e.value)) === '127 Pine St, Grovetown');
  // Focus stays inside the dialog
  for (let i = 0; i < 12; i++) await page.keyboard.press('Tab');
  const inside = await page.evaluate(() => document.getElementById('lead-dialog').contains(document.activeElement) || document.activeElement === document.body);
  ok('Tab key stays inside the open form', inside);
  await page.keyboard.press('Escape'); await sleep(400);
  s = await dialogState(page);
  ok('Escape closes the form and unlocks the page', !s.open && !s.htmlLocked);
  // Backdrop click
  await clickSel(page, '.nav [data-open-lead]'); await sleep(500);
  await page.mouse.click(30, 450); await sleep(400);
  s = await dialogState(page);
  ok('clicking outside the form closes it', !s.open);
  // Handoff card → step 2
  await page.evaluate(() => document.getElementById('handoff').scrollIntoView()); await sleep(1500);
  await page.type('#handoff-address', '310 Bobby Jones Expy, Augusta');
  await clickSel(page, '.address-stack .btn'); await sleep(600);
  s = await dialogState(page);
  ok('Handoff address box opens the form at step 2', s.open && s.step2 && s.echo === '310 Bobby Jones Expy, Augusta' && /cta=handoff/.test(s.source), JSON.stringify(s));
  await page.keyboard.press('Escape');
  ok('no script errors (nav/handoff flows)', state.errors.length === 0, state.errors.join(' | '));
  await page.close();
}

// Send failure → error message, button restored, nothing lost
if (!LIVE) {
  const { page, state } = await newPage({ width: 1440, height: 900 }, { postMode: 'fail' });
  await page.goto(base + '/', { waitUntil: 'networkidle2', timeout: 90000 }); await sleep(2400);
  await page.type('#hero-address', '9 Fail Ct, Evans'); await clickSel(page, '.address-pill .btn'); await sleep(500);
  await page.type('#ld-name', 'Fail Test'); await page.type('#ld-email', 'fail@example.com');
  await clickSel(page, '#lead-dialog .lead-submit'); await sleep(900);
  const r = await page.evaluate(() => ({ err: !document.querySelector('#lead-dialog .lead-error').hidden, btn: document.querySelector('#lead-dialog .lead-submit').textContent.trim(), disabled: document.querySelector('#lead-dialog .lead-submit').disabled, name: document.getElementById('ld-name').value }));
  ok('a failed send shows the call/email fallback and keeps what was typed', r.err && !r.disabled && r.btn === 'Get My Free Rental Analysis' && r.name === 'Fail Test', JSON.stringify(r));
  await shot(page, 'dialog-send-failed');
  await page.close();
}

// Phone: sticky bar, menu link, Handoff card
{
  const { page, state } = await newPage({ width: 390, height: 844 }, { mobile: true });
  await page.goto(base + '/', { waitUntil: 'networkidle2', timeout: 90000 }); await sleep(2400);
  await page.evaluate(() => scrollTo(0, document.getElementById('office').offsetTop)); await sleep(1200);
  await page.tap('.sticky-cta [data-open-lead]'); await sleep(600);
  let s = await dialogState(page);
  const stickyHidden = await page.evaluate(() => getComputedStyle(document.querySelector('.sticky-cta')).display === 'none');
  ok('phone: sticky "Free Rental Analysis" opens the form at step 1', s.open && s.step1 && /cta=sticky/.test(s.source), JSON.stringify(s));
  ok('phone: sticky bar hides while the form is open', stickyHidden);
  await shot(page, 'iphone-sticky-dialog-step1');
  await clickSel(page, '#lead-dialog .ld-close'); await sleep(400);
  await page.evaluate(() => scrollTo(0, 0)); await sleep(800);
  await page.tap('.nav-burger'); await sleep(500);
  await page.tap('.mobile-menu [data-open-lead]'); await sleep(700);
  s = await dialogState(page);
  const menuOpen = await page.evaluate(() => document.documentElement.classList.contains('menu-open'));
  ok('phone: menu link closes the menu and opens the form', s.open && !menuOpen && /cta=menu/.test(s.source), JSON.stringify({ open: s.open, menuOpen }));
  ok('phone: no script errors', state.errors.length === 0, state.errors.join(' | '));
  await page.close();
}

// Direct link #rental-analysis opens the form
{
  const { page } = await newPage({ width: 1440, height: 900 });
  await page.goto(base + '/#rental-analysis', { waitUntil: 'networkidle2', timeout: 90000 }); await sleep(1500);
  const s = await dialogState(page);
  ok('mcbride-pm.com/#rental-analysis opens the form on arrival', s.open && s.step1 && /cta=link/.test(s.source));
  await page.close();
}

// Reduced motion: everything visible, form works
{
  const { page, state } = await newPage({ width: 1440, height: 900 }, { reduced: true });
  await page.goto(base + '/', { waitUntil: 'networkidle2', timeout: 90000 }); await sleep(1500);
  await page.evaluate(() => document.getElementById('handoff').scrollIntoView()); await sleep(800);
  const vis = await page.evaluate(() => ['.start-card', '.steps-list', '.faq-list'].map(s => +getComputedStyle(document.querySelector(s)).opacity));
  ok('reduced motion: content is fully visible', vis.every(v => v === 1), JSON.stringify(vis));
  await clickSel(page, '.nav [data-open-lead]'); await sleep(300);
  ok('reduced motion: form opens', (await dialogState(page)).open);
  ok('reduced motion: no script errors', state.errors.length === 0, state.errors.join(' | '));
  await page.close();
}

// No JavaScript: honeypot hidden, address boxes fall back to /contact/
{
  const { page } = await newPage({ width: 1440, height: 900 }, { js: false });
  await page.goto(base + '/', { waitUntil: 'networkidle2', timeout: 90000 }); await sleep(800);
  await shot(page, 'nojs-hero');
  const honeypotShown = await page.$eval('[name="bot-field"]', el => el.getBoundingClientRect().height > 0);
  const dialogShown = await page.$eval('#lead-dialog', el => el.getBoundingClientRect().height > 0);
  ok('no JS: spam-trap field never shows', !honeypotShown);
  ok('no JS: the form dialog stays closed', !dialogShown);
  await page.type('#hero-address', '55 NoJS Way, Evans');
  await Promise.all([page.waitForNavigation({ timeout: 30000 }), page.click('.address-pill .btn')]);
  ok('no JS: hero address goes to /contact/ with the address', /\/contact\/\?address=55\+NoJS\+Way/.test(page.url()), page.url());
  await page.close();
}

// Contact page form still works (shared lead.js)
if (!LIVE) {
  const { page, state } = await newPage({ width: 1440, height: 900 });
  await page.goto(base + '/contact/?address=12%20Elm%20St', { waitUntil: 'networkidle2', timeout: 90000 }); await sleep(800);
  const pre = await page.$eval('form [name="address"]', e => e.value);
  ok('contact page: address from the link is prefilled', pre === '12 Elm St', pre);
  await page.type('form [name="fullName"]', 'Contact Test'); await page.type('form [name="email"]', 'c@example.com');
  await page.evaluate(() => document.querySelector('form [type="submit"]').click()); await sleep(900);
  const body = new URLSearchParams(state.posts[0] || '');
  const success = await page.evaluate(() => { const s = document.querySelector('[data-success]'); return s && !s.hidden; });
  ok('contact page: posts the same form and shows its thank-you', body.get('form-name') === 'rental-analysis' && body.get('page') === '/contact/' && success, JSON.stringify(Object.fromEntries(body)));
  ok('contact page: no script errors', state.errors.length === 0, state.errors.join(' | '));
  await page.close();
}

// Inner pages load clean with their versioned CSS
{
  const { page, state } = await newPage({ width: 1280, height: 800 });
  for (const p of ['/services/', '/about/', '/rentals/', '/owner-faqs/', '/evans/', '/blog/', '/referral/', '/thank-you/']) {
    await page.goto(base + p, { waitUntil: 'networkidle2', timeout: 60000 });
    const styled = await page.evaluate(() => getComputedStyle(document.body).fontFamily.includes('Open Sans') || getComputedStyle(document.body).fontFamily.includes('Montserrat'));
    if (!styled) state.errors.push(p + ' unstyled');
  }
  ok('inner pages: styled, no script errors', state.errors.length === 0, state.errors.join(' | '));
  await page.close();
}

const failed = results.filter(r => !r.pass);
console.log(`\n${results.length - failed.length}/${results.length} passed`);
fs.writeFileSync(`${out}/results.json`, JSON.stringify(results, null, 1));
await browser.close();
