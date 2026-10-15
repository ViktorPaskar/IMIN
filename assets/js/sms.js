/* =========================================================
   IMIN — guest page, SMS version (sms.html)
   Renders from assets/js/config.js; the night as a poster, IMIN texting first.
   ========================================================= */
(() => {
  'use strict';

  const cfg = window.IMIN || {};
  const root = document.documentElement;
  const body = document.body;
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const hasGSAP = typeof window.gsap !== 'undefined';
  const store = {
    get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* private mode */ } },
    sget(k) { try { return sessionStorage.getItem(k); } catch (e) { return null; } },
    sset(k, v) { try { sessionStorage.setItem(k, v); } catch (e) { /* private mode */ } }
  };
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  if (reduced) root.classList.add('reduced');

  /* ---------------------------------------------------------
     Consent + analytics. Nothing is sent before an OK.
     --------------------------------------------------------- */
  const consent = (() => { try { return JSON.parse(store.get('imin_consent')); } catch (e) { return null; } })();
  let analyticsOK = !!(consent && consent.analytics);
  function track(name, params = {}) {
    if (!analyticsOK) return;
    (window.dataLayer = window.dataLayer || []).push({ event: name, ...params });
  }

  /* ---------------------------------------------------------
     Data → page
     --------------------------------------------------------- */
  const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const pad = n => String(n).padStart(2, '0');
  const parse = s => (s ? new Date(s) : null);
  const dayDate = d => `${DAYS[d.getDay()]} ${pad(d.getDate())}.${pad(d.getMonth() + 1)}`;
  const time = d => `${pad(d.getHours())}:${pad(d.getMinutes())}`;
  const now = new Date();
  const L = cfg.links || {};

  const upcoming = (cfg.events || []).filter(e => parse(e.date) > now).sort((a, b) => parse(a.date) - parse(b.date));
  const next = upcoming[0] || null;
  const last = cfg.lastNight || {};
  const lastDate = parse(last.date);
  const withinWeek = last.enabled && lastDate && (now - lastDate) / 864e5 <= 7 && now >= lastDate;

  // a bare #state-a / #state-b / #state-c previews a hero state
  const hashState = (location.hash.match(/^#state-([abc])$/i) || [])[1];
  const preview = !!hashState;
  let state = (hashState || cfg.state || 'auto').toUpperCase();
  if (state === 'AUTO') state = next ? 'A' : withinWeek ? 'C' : 'B';
  if (state === 'A' && !next) state = 'B';
  body.dataset.state = state;

  // links from config; empty ones are hidden or marked as coming
  $$('[data-link]').forEach(a => {
    const url = L[a.dataset.link];
    if (url) { a.href = url; return; }
    if (a.classList.contains('tile2')) { a.classList.add('is-pending'); a.removeAttribute('href'); const em = $('em', a); if (em) em.textContent = 'Coming soon'; return; }
    a.hidden = true;
  });
  const legal = $('[data-legal]');
  if (legal && L.legal) {
    const btn = $('[data-cookie-settings]', legal);
    Object.entries(L.legal).forEach(([t, u]) => { const a = document.createElement('a'); a.href = u; a.textContent = t; legal.insertBefore(a, btn); });
  }
  $$('[data-year]').forEach(n => { n.textContent = now.getFullYear(); });

  // hero invitation card: states A, B, C
  const card = $('[data-invite]');
  const entry = $('[data-entry]');
  const im = $$('[data-im]');
  function setIm(url) { im.forEach(a => { a.href = url || '#'; if (/^https?:/.test(url)) { a.target = '_blank'; a.rel = 'noopener'; } }); }
  function renderInvite() {
    if (!card) return;
    const photoBox = $('.invite__photo', card), img = $('img', photoBox);
    const photo = (src) => { if (src) { img.src = src; photoBox.hidden = false; } };
    let html = '';
    if (state === 'A') {
      const d = parse(next.date);
      html = `<div class="invite__top"><span class="label invite__label">Doors · ${dayDate(d)} · ${time(d)}</span><span class="by">By ${esc(next.by || 'IMIN')}</span></div>
        <p class="invite__text">${esc(next.name)}. ${esc(next.line)} ${esc(next.city)}.</p>
        <p class="display invite__ask">You in?</p>`;
      setIm(next.url); photo(next.photo);
      if (entry) entry.textContent = next.entry || '';
    } else if (state === 'B') {
      html = `<div class="invite__top"><span class="label invite__label">Next night · Soon</span></div>
        <p class="invite__text">The next one's in the works. Want the date before anyone else?</p>`;
      setIm(L.channel);
      if (entry) entry.textContent = 'Instagram broadcast channel';
    } else {
      const has = last.enabled && last.scans;
      const n = has ? last.scans : '[N]';
      const ld = lastDate ? dayDate(lastDate) : '[date]';
      html = `<div class="invite__top"><span class="label invite__label">Last night · ${ld}</span>${has ? '' : '<span class="by">Preview</span>'}</div>
        <p class="invite__count">${esc(n)} of us were there.</p>
        <p class="invite__text">Thank you. Next one: ${next ? dayDate(parse(next.date)) : 'soon'}. You in?</p>`;
      setIm(next ? next.url : L.channel); photo((last.photos || [])[0]);
      if (entry) entry.textContent = next ? (next.entry || '') : 'Instagram broadcast channel';
    }
    $('.invite__body', card).innerHTML = html;
  }
  renderInvite();

  // sticky bar content
  if (next) { $('[data-sticky-date]').textContent = `${dayDate(parse(next.date))} · ${time(parse(next.date))}`; $('[data-sticky-name]').textContent = next.name; }

  // copy that switches once an outside creator publishes
  const COPY = {
    idea: [
      "IMIN throws music-first nights in France and Luxembourg, and builds the tools creators use to run theirs. Apps taught us to overthink every night out. We'd rather you just come.",
      "IMIN is music-first nights in France and Luxembourg: the ones we throw, and the ones by creators who run theirs with us. Apps taught us to overthink every night out. We'd rather you just come."
    ],
    nights: [
      'Some we throw ourselves. And we open the doors to creators who want to throw theirs.',
      'Some we throw ourselves. Others come from creators who run their nights on IMIN.'
    ]
  };
  $$('[data-copy]').forEach(el => { el.textContent = COPY[el.dataset.copy][cfg.hasCreatorNights ? 1 : 0]; });

  // "Nights in: …" from real published nights
  const cities = [...new Set([...(cfg.events || []).map(e => e.city), last.city].filter(Boolean))];
  const citiesEl = $('[data-cities]');
  if (citiesEl) { if (cities.length) citiesEl.textContent = `Nights in: ${cities.join(' · ')}`; else citiesEl.hidden = true; }


  const FROM = '<div class="msg__from"><span class="ava ava--imin" aria-hidden="true"><svg><use href="#mark-s"/></svg></span><b>IMIN</b></div>';

  // formats: shared in the chat like a link preview
  const fm = $('[data-formats]');
  if (fm) {
    const list = cfg.formats || [];
    if (list.length) fm.innerHTML = list.map(f => `
      <div class="bubble bubble--link">
        <div class="format__top"><span class="label">Format</span><span class="by">By ${esc(f.by)}</span></div>
        <h3>${esc(f.name)}</h3><p>${esc(f.text)}</p>
      </div>`).join('');
    else fm.remove();
  }

  // photos from the nights, dropped in the chat (only real, approved ones)
  const np = $('[data-night-photos]');
  const nightPhotos = cfg.nightPhotos || [];
  if (np && nightPhotos.length) {
    np.hidden = false;
    const shown = nightPhotos.slice(0, 3);
    $('.bubble--photos', np).innerHTML = shown.map((p, i) => `<figure><img src="${esc(p)}" alt="" loading="lazy">${i === 2 && nightPhotos.length > 3 ? `<span class="more">+${nightPhotos.length - 3}</span>` : ''}</figure>`).join('');
  }

  // 4. Next up — only with more than one upcoming night
  if (upcoming.length > 1) {
    $('#next').hidden = false;
    $('[data-tickets]').innerHTML = upcoming.slice(0, 5).map((e, i) => { const d = parse(e.date); return `
      <li class="ticket"><a href="${esc(e.url)}" target="_blank" rel="noopener" data-track="upcoming_row_click" data-event="${esc(e.id)}" data-pos="${i + 1}">
        <span class="ticket__date">${dayDate(d)}</span>
        <span class="ticket__name"><b>${esc(e.name)}</b><span>${esc(e.city)} · ${esc(e.entry || '')}</span></span>
        <span class="by">By ${esc(e.by || 'IMIN')}</span>
        <span class="ticket__go">I'm in →</span></a></li>`; }).join('');
  }

  // 5. Last time — after the first night (or a preview with #state-c)
  if (last.enabled || (preview && state === 'C')) {
    const sec = $('#last'); sec.hidden = false;
    const real = last.enabled;
    $('[data-last-label]').textContent = `Last time · ${lastDate ? dayDate(lastDate) : '[date]'}`;
    const title = $('[data-last-title]');
    if (state === 'C') title.hidden = true; else title.textContent = last.headline || '';
    const photos = real && last.photos && last.photos.length ? last.photos : Array.from({ length: 6 });
    $('[data-last-photos]').innerHTML = photos.map(p => p ? `<img src="${esc(p)}" alt="" loading="lazy">` : '<div class="last__ph">Approved photo</div>').join('');
    if (real) $('[data-last-quotes]').innerHTML = (last.quotes || []).map(q => `<div class="msg msg--in"><div class="msg__from"><b>${esc(q.name)}</b></div><div class="bubble">${esc(q.text)}</div></div>`).join('');
    const pl = $('[data-last-playlist]'); if (last.playlist) { pl.href = last.playlist; pl.hidden = false; }
    if (!real) sec.classList.add('is-preview');
  }

  // 6. FAQ
  const FAQ = [
    ['How does it work?', "Pick a night. Make an account. Tap I'm in. Show your QR at the door."],
    ['Can I come alone?', "Yes. That's kind of the point."],
    ['How much is it?', "Depends on the night. The price is on each night's page, and any fee is shown before you pay."],
    ['Why do I need an account?', 'One place for all your nights and tickets. It\'s also where we\'re building the "someone to go with" part.'],
    ['Is this a dating thing?', "No. It's a night out."],
    ['Do I have to drink?', "No. What's in your cup is your business."],
    ['How old do I need to be?', '18+. You may be asked for ID at the door.'],
    ['Will I be in photos?', "Probably. We film and take photos at our nights, and there's a sign at the door. See a photo of you that you want gone? Message us and we'll take it down."],
    ["Can't make it?", 'Cancel your spot in your account, so someone else can come.', 'cancel'],
    ['What do you do with my data?', `We use it to get you in the door. News only if you tick the box. <a href="${esc(L.privacy || '#')}">Privacy →</a>`],
    ["Who's behind IMIN?", `Four people who got tired of overthinking nights out. Say hi: <a href="mailto:${esc(cfg.contact)}">${esc(cfg.contact)}</a>`]
  ].filter(q => q[2] !== 'cancel' || cfg.canCancel);
  const faq = $('[data-faq]');
  if (faq) {
    faq.innerHTML = FAQ.map(([q, a], i) => `
      <div class="qd">
        <button class="qd__btn" type="button" id="faq-q${i + 1}" aria-expanded="${i < 3}" aria-controls="faq-a${i + 1}">${esc(q)}<svg class="i" aria-hidden="true"><use href="#i-plus"/></svg></button>
        <div class="qd__panel" id="faq-a${i + 1}" role="region" aria-labelledby="faq-q${i + 1}"><div><p>${a}</p></div></div>
      </div>`).join('');
    faq.addEventListener('click', e => {
      const b = e.target.closest('.qd__btn'); if (!b) return;
      const open = b.getAttribute('aria-expanded') !== 'true';
      b.setAttribute('aria-expanded', String(open));
      if (open) track('faq_open', { question_id: b.id.replace('faq-q', '') });
      setTimeout(() => window.ScrollTrigger && ScrollTrigger.refresh(), 480);
    });
    const ld = { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: FAQ.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a.replace(/<[^>]+>/g, '') } })) };
    $('#faq-ld').textContent = JSON.stringify(ld);
  }

  /* ---------------------------------------------------------
     Language switcher (EN now; FR, ES, UA later)
     --------------------------------------------------------- */
  const lang = $('[data-lang]');
  if (lang) {
    const btn = $('.lang__btn', lang), opts = $$('li', lang);
    const open = (v) => { lang.classList.toggle('is-open', v); btn.setAttribute('aria-expanded', String(v)); if (v) (opts.find(o => o.getAttribute('aria-selected') === 'true') || opts[0]).focus(); };
    btn.addEventListener('click', () => open(!lang.classList.contains('is-open')));
    lang.addEventListener('keydown', e => {
      const i = opts.indexOf(document.activeElement);
      if (e.key === 'Escape') { open(false); btn.focus(); }
      if (e.key === 'ArrowDown' && i > -1) { e.preventDefault(); opts[(i + 1) % opts.length].focus(); }
      if (e.key === 'ArrowUp' && i > -1) { e.preventDefault(); opts[(i - 1 + opts.length) % opts.length].focus(); }
      if ((e.key === 'Enter' || e.key === ' ') && i > -1) { e.preventDefault(); choose(opts[i]); }
    });
    opts.forEach(o => o.addEventListener('click', () => choose(o)));
    function choose(o) {
      if (o.getAttribute('aria-disabled') === 'true') return;
      const from = root.lang, to = o.dataset.code;
      if (from !== to) track('language_switch', { from, to });
      open(false); btn.focus();
    }
    document.addEventListener('click', e => { if (!lang.contains(e.target)) open(false); });
  }

  /* ---------------------------------------------------------
     Cookie banner: Accept all and Reject all equally visible
     --------------------------------------------------------- */
  const cookie = $('[data-cookie]');
  const panel = $('[data-cookie-panel]');
  const box = $('[data-cookie-analytics]');
  function saveConsent(analytics) {
    analyticsOK = analytics;
    store.set('imin_consent', JSON.stringify({ analytics, ts: new Date().toISOString(), v: 1 }));
    cookie.hidden = true;
    updateSticky();
  }
  if (!consent) cookie.hidden = false;
  $('[data-cookie-accept]').addEventListener('click', () => saveConsent(true));
  $('[data-cookie-reject]').addEventListener('click', () => saveConsent(false));
  $('[data-cookie-open]').addEventListener('click', () => { panel.hidden = !panel.hidden; box.checked = analyticsOK; });
  $('[data-cookie-save]').addEventListener('click', () => saveConsent(box.checked));
  $('[data-cookie-settings]').addEventListener('click', () => { cookie.hidden = false; panel.hidden = false; box.checked = analyticsOK; $('[data-cookie-save]').focus(); });

  /* ---------------------------------------------------------
     Click tracking
     --------------------------------------------------------- */
  document.addEventListener('click', e => {
    const a = e.target.closest('[data-track]'); if (!a) return;
    const name = a.dataset.track, p = {};
    if (name === 'hero_im_in_click' || name === 'not_this_time_click') { p.state = state; p.event_id = next ? next.id : ''; }
    if (name === 'sticky_bar_click') p.event_id = next ? next.id : '';
    if (name === 'stay_close_click') p.channel = a.dataset.channel;
    if (name === 'sign_in_click') p.place = a.dataset.place;
    if (name === 'upcoming_row_click') { p.event_id = a.dataset.event; p.position = +a.dataset.pos; }
    if (a.dataset.sectionName) p.section = a.dataset.sectionName;
    track(name, p);
  });
  if ('IntersectionObserver' in window) {
    const seen = new Set();
    const io = new IntersectionObserver(es => es.forEach(en => {
      const id = en.target.dataset.section;
      if (en.isIntersecting && !seen.has(id)) { seen.add(id); track('section_view', { section_id: id }); }
    }), { threshold: .35 });
    $$('[data-section]').forEach(s => { if (!s.hidden) io.observe(s); });
  }

  /* ---------------------------------------------------------
     Keep me posted
     --------------------------------------------------------- */
  const sub = $('#sub-form');
  if (sub) {
    const status = $('[data-sub-status]', sub), email = $('#sub-email'), ok = $('#sub-consent');
    const say = (t, err) => { status.textContent = t; status.classList.toggle('is-err', !!err); };
    sub.addEventListener('submit', async e => {
      e.preventDefault();
      sub.classList.remove('is-invalid', 'needs-consent');
      if (sub.company.value) { sub.classList.add('is-done'); say("You're on the list. See you soon."); return; } // bots
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value.trim())) { sub.classList.add('is-invalid'); say('Check the email address.', true); email.focus(); return; }
      if (!ok.checked) { sub.classList.add('needs-consent'); say('Tick the box so we can send you news.', true); return; }
      const payload = { email: email.value.trim(), consent: true, consent_text: $('.check__text', sub).textContent, source: 'imin.wtf · stay close', lang: root.lang, ts: new Date().toISOString() };
      try {
        if (cfg.subscribeEndpoint) {
          const r = await fetch(cfg.subscribeEndpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
          if (!r.ok) throw new Error(r.status);
        } else {
          console.warn('[IMIN] subscribeEndpoint is empty in config.js: nothing was sent.', payload);
        }
        sub.classList.add('is-done'); say("You're on the list. See you soon.");
        track('email_subscribe', { result: 'ok' });
      } catch (err) {
        say(`That didn't go through. Try again, or write to ${cfg.contact}.`, true);
        track('email_subscribe', { result: 'error' });
      }
    });
  }

  /* ---------------------------------------------------------
     Sticky bar (phones): state A, visitor in the region, hero gone
     --------------------------------------------------------- */
  const sticky = $('[data-sticky]');
  let heroGone = false, stickyShown = false;
  function updateSticky() {
    const on = state === 'A' && cfg.inRegion && heroGone && cookie.hidden;
    sticky.classList.toggle('is-on', on);
    sticky.setAttribute('aria-hidden', String(!on));
    $('a', sticky).tabIndex = on ? 0 : -1;
    if (on && !stickyShown) { stickyShown = true; track('sticky_bar_shown', { event_id: next ? next.id : '' }); }
  }
  if (sticky && 'IntersectionObserver' in window) {
    if (next) $('a', sticky).href = next.url;
    new IntersectionObserver(([en]) => { heroGone = !en.isIntersecting; updateSticky(); }).observe($('.s-hero__cta') || $('.s-hero'));
  }

  /* ---------------------------------------------------------
     The beat: one continuous line, I Paper · M Haze · N Doorlight
     --------------------------------------------------------- */
  const NS = 'http://www.w3.org/2000/svg';
  const D_BACK = 'M292.215 52.8235C285.967 25.8047 306.486 0 334.218 0C354.056 0 371.334 13.5391 376.078 32.8025L550.268 740.176C557.762 770.606 534.728 800 503.389 800C480.916 800 461.414 784.494 456.351 762.598L292.215 52.8235Z';
  const D_FWD = 'M877.785 52.8235C884.033 25.8047 863.514 0 835.782 0C815.944 0 798.666 13.5391 793.922 32.8025L619.732 740.176C612.238 770.606 635.272 800 666.611 800C689.084 800 708.586 784.494 713.649 762.598L877.785 52.8235Z';
  const BAR = [['v', 0, 'p'], ['v', 140, 'h'], ['b', 0, 'h'], ['f', 0, 'h'], ['v', 930, 'h'], ['v', 1070, 'p'], ['v', 1210, 'd'], ['b', 1070, 'd'], ['v', 1675, 'd']];
  const FILL = { p: '#F4EFE7', h: '#9C8CFF', d: '#16B877' };
  function beat(el, bars, mono) {
    const svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('viewBox', `0 0 ${bars * 1815 - 40} 800`);
    svg.setAttribute('aria-hidden', 'true');
    const nodes = [];
    for (let b = 0; b < bars; b++) for (const [k, x, c] of BAR) {
      let n;
      if (k === 'v') { n = document.createElementNS(NS, 'rect'); n.setAttribute('x', b * 1815 + x); n.setAttribute('y', 0); n.setAttribute('width', 100); n.setAttribute('height', 800); n.setAttribute('rx', 50); }
      else { n = document.createElementNS(NS, 'path'); n.setAttribute('d', k === 'b' ? D_BACK : D_FWD); n.setAttribute('transform', `translate(${b * 1815 + x} 0)`); n.dataset.tx = b * 1815 + x; }
      n.setAttribute('fill', mono || FILL[c]);
      svg.appendChild(n); nodes.push(n);
    }
    el.innerHTML = ''; el.appendChild(svg);
    return { svg, nodes };
  }
  const heroBeat = $('.g-hero__beat');
  let beatNodes = [];
  function drawHeroBeat() {
    if (!heroBeat) return;
    const h = heroBeat.clientHeight || 56;
    const bars = Math.ceil(innerWidth * 800 / (h * 1815)) + 1;
    beatNodes = beat(heroBeat, bars).nodes;
  }
  drawHeroBeat();
  let rw; addEventListener('resize', () => { clearTimeout(rw); rw = setTimeout(drawHeroBeat, 200); });

  /* ---------------------------------------------------------
     Header + in-page links (work without GSAP too)
     --------------------------------------------------------- */
  const header = $('.header');
  const onScroll = () => header.classList.toggle('is-scrolled', scrollY > 24);
  addEventListener('scroll', onScroll, { passive: true }); onScroll();

  /* ---------------------------------------------------------
     The poster, the texts in the phone, the I'M IN links (states A, B, C)
     --------------------------------------------------------- */
  const P = sel => $(`[data-${sel}]`);
  const heroInvite = P('hero-invite');
  if (state === 'A') {
    const d = parse(next.date), e = parse(next.end);
    P('p-day').textContent = dayDate(d);
    P('p-time').textContent = e ? `${time(d)} – ${time(e)}` : `Doors ${time(d)}`;
    P('p-name').textContent = next.name;
    P('p-tags').textContent = [...(next.tags || []), next.city].filter(Boolean).join(' · ');
    if (next.photo) $$('.flyer__img, .sms--mms img').forEach(i => { i.src = next.photo; });
    heroInvite.textContent = `${dayDate(d)}, doors ${time(d)}. ${next.name}, ${next.city}. You in?`;
    setIm(next.url);
    if (entry) entry.textContent = next.entry || '';
  } else if (state === 'B') {
    P('p-day').textContent = 'Next night'; P('p-time').textContent = 'Soon';
    P('p-name').textContent = "The next one's in the works";
    P('p-tags').textContent = 'Dates first on the "I\'m in" channel';
    heroInvite.textContent = "The next one's in the works. Want the date before anyone else?";
    setIm(L.channel);
    if (entry) entry.textContent = 'Instagram broadcast channel';
  } else {
    const has = last.enabled && last.scans;
    P('p-day').textContent = `Last night · ${lastDate ? dayDate(lastDate) : '[date]'}`; P('p-time').textContent = has ? '' : 'Preview';
    P('p-name').textContent = `${has ? last.scans : '[N]'} of us were there.`;
    P('p-tags').textContent = 'Thank you.';
    heroInvite.textContent = `${has ? last.scans : '[N]'} of us were there. Thank you. Next one: ${next ? dayDate(parse(next.date)) : 'soon'}. You in?`;
    setIm(next ? next.url : L.channel);
    if (entry) entry.textContent = next ? (next.entry || '') : 'Instagram broadcast channel';
  }
  const cityList = P('city-list');
  if (cityList && cities.length) cityList.textContent = cities.join(', ');

  // the beat line along the foot of the poster (one bar, brand colours)
  const pb = $('.flyer__beat');
  if (pb) beat(pb, 2);

  /* ---------------------------------------------------------
     FAQ as a chat: tap a question, it goes out; the answer comes back
     --------------------------------------------------------- */
  const chips = P('faq-chips'), fthread = P('faq-thread');
  const faqHidden = $('[data-faq]'); if (faqHidden) faqHidden.innerHTML = '';
  let faqBusy = false;
  function ask(i, instant) {
    if (!fthread || faqBusy) return;
    const [q, a] = FAQ[i];
    $$('.faq-chip', chips).forEach((c, j) => c.setAttribute('aria-selected', String(j === i)));
    track('faq_open', { question_id: String(i + 1) });
    const out = document.createElement('div'); out.className = 'sms sms--out'; out.textContent = q;
    const ans = document.createElement('div'); ans.className = 'sms sms--in'; ans.innerHTML = a;
    // keep the thread short: the last two exchanges
    while (fthread.children.length > 2) fthread.firstElementChild.remove();
    fthread.append(out);
    if (instant || reduced) { fthread.append(ans); return; }
    faqBusy = true;
    const dots = document.createElement('div'); dots.className = 'sms sms--in sms-typing'; dots.setAttribute('aria-hidden', 'true'); dots.innerHTML = '<i></i><i></i><i></i>';
    setTimeout(() => fthread.append(dots), 250);
    setTimeout(() => { dots.replaceWith(ans); faqBusy = false; window.ScrollTrigger && ScrollTrigger.refresh(); }, 1050);
  }
  if (chips) {
    chips.innerHTML = FAQ.map(([q], i) => `<button class="faq-chip" type="button" role="tab" aria-selected="false" data-q="${i}">${esc(q)}</button>`).join('');
    chips.addEventListener('click', e => { const b = e.target.closest('.faq-chip'); if (b) ask(+b.dataset.q); });
    ask(0, true);
  }

  /* ---------------------------------------------------------
     Bohdan's voice note (old iOS player): plays the recording when there is one,
     the words light up along with it
     --------------------------------------------------------- */
  const vn = $('[data-voice]');
  if (vn) {
    const V = cfg.voiceNote || {};
    const dur = V.duration || 20;
    const btn = $('.voice__btn', vn), timeEl = $('[data-voice-time]', vn), txt = $('[data-voice-text]', vn), player = $('.vnote__player', vn);
    if (V.text) txt.textContent = V.text;
    txt.innerHTML = txt.textContent.split(' ').map(w => `<span class="w">${esc(w)}</span>`).join(' ');
    const ws = $$('.w', txt);
    const fmt = t => `${Math.floor(t / 60)}:${pad(Math.floor(t % 60))}`;
    timeEl.textContent = fmt(dur);
    const audio = V.src ? new Audio(V.src) : null;
    let playing = false, t0 = 0, pos = 0, raf = 0;
    const draw = p => {
      const k = Math.min(1, p / dur);
      player.style.setProperty('--p', (k * 100).toFixed(2) + '%');
      ws.forEach((w, i) => w.classList.toggle('is-said', i / ws.length < k));
      timeEl.textContent = playing ? '-' + fmt(dur - p) : fmt(dur);
    };
    const tick = () => {
      pos = audio ? audio.currentTime : (performance.now() - t0) / 1000;
      if (pos >= dur || (audio && audio.ended)) { stop(true); return; }
      draw(pos); raf = requestAnimationFrame(tick);
    };
    function stop(done) {
      playing = false; cancelAnimationFrame(raf); audio?.pause();
      if (done) { pos = 0; if (audio) audio.currentTime = 0; }
      vn.classList.remove('is-playing');
      $('use', btn).setAttribute('href', '#i-play'); btn.setAttribute('aria-label', "Play Bohdan's voice note");
      draw(done ? 0 : pos);
    }
    btn.addEventListener('click', () => {
      if (playing) { stop(false); return; }
      playing = true; vn.classList.add('is-playing');
      $('use', btn).setAttribute('href', '#i-pause'); btn.setAttribute('aria-label', 'Pause');
      if (audio) audio.play().catch(() => stop(false)); else t0 = performance.now() - pos * 1000;
      track('voice_note_play', {});
      tick();
    });
  }

  // the clock in the phone's status bar
  const clocks = $$('[data-clock], [data-clock-now]');
  const setClock = () => { const n = new Date(); clocks.forEach(c => { c.textContent = time(n); }); };
  setClock(); setInterval(setClock, 15000);

  if (!hasGSAP) {
    $$('[data-reveal]').forEach(el => { el.style.opacity = 1; el.style.transform = 'none'; });
    return;
  }

  /* =========================================================
     Motion
     ========================================================= */
  const { gsap } = window;
  gsap.registerPlugin(ScrollTrigger, SplitText);
  gsap.defaults({ ease: 'expo.out', duration: 1 });

  let lenis = null;
  if (!reduced && typeof window.Lenis !== 'undefined') {
    lenis = new Lenis({ lerp: .12, smoothWheel: true });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add(t => lenis.raf(t * 1000));
    gsap.ticker.lagSmoothing(0);
  }
  $$('a[href^="#"]').forEach(a => a.addEventListener('click', e => {
    const id = a.getAttribute('href');
    if (id.length < 2 || /^#state-/.test(id)) return;
    const t = $(id); if (!t) return;
    e.preventDefault();
    lenis ? lenis.scrollTo(t, { offset: -8, duration: 1.2 }) : t.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth' });
  }));

  if (reduced) { $$('[data-reveal]').forEach(el => { el.style.opacity = 1; el.style.transform = 'none'; }); return; }

  const typing = () => { const d = document.createElement('div'); d.className = 'sms sms--in sms-typing'; d.setAttribute('aria-hidden', 'true'); d.innerHTML = '<i></i><i></i><i></i>'; return d; };

  /* ---------- Hero: the poster lands, the phone slides in, IMIN texts first ---------- */
  const thread = P('hero-thread');
  const msgs = $$('.sms', thread);
  const draft = P('draft'), send = $('.ios-send');
  gsap.set(msgs, { autoAlpha: 0, y: 10, scale: .96, transformOrigin: '0% 100%' });
  const tl = gsap.timeline({ delay: .1 });
  tl.from('.s-hero__title .line > span', { yPercent: 110, duration: 1.1, stagger: .08 }, 0)
    .from('.s-hero__sub, .s-hero__cta, .s-hero__entry', { y: 14, opacity: 0, duration: .8, stagger: .08 }, .35)
    .from('.flyer--back', { y: 80, rotate: 14, opacity: 0, duration: 1.3 }, .1)
    .from('.flyer:not(.flyer--back)', { y: 120, rotate: -12, opacity: 0, duration: 1.4 }, .2)
    .from('.flyer__sticker', { scale: 0, rotate: -40, duration: .8, ease: 'back.out(2.2)' }, 1)
    .from('.tape', { scaleX: 0, opacity: 0, duration: .5 }, .9)
    .from('.iphone', { x: 120, rotate: 12, opacity: 0, duration: 1.4 }, .35);
  // IMIN types, the texts land one by one
  let t = 1.1;
  msgs.forEach(m => {
    const dots = typing();
    tl.call(() => { thread.insertBefore(dots, m); gsap.fromTo(dots, { autoAlpha: 0 }, { autoAlpha: 1, duration: .2 }); }, null, t);
    t += .55;
    tl.call(() => dots.remove(), null, t)
      .to(m, { autoAlpha: 1, y: 0, scale: 1, duration: .5, ease: 'back.out(1.6)' }, t);
    t += .35;
  });
  // the banner drops in like a lock-screen text
  tl.from('[data-notif]', { y: -40, opacity: 0, duration: .7, ease: 'back.out(1.5)' }, 1.4);
  // you start typing a doubt, delete it, then type the answer
  const typeOut = (txt, at, dur) => { const o = { n: 0 }; tl.to(o, { n: txt.length, duration: dur, ease: 'none', onUpdate: () => { draft.textContent = txt.slice(0, Math.round(o.n)); } }, at); return at + dur; };
  const erase = (txt, at, dur) => { const o = { n: txt.length }; tl.to(o, { n: 0, duration: dur, ease: 'power1.in', onUpdate: () => { draft.textContent = txt.slice(0, Math.round(o.n)); } }, at); return at + dur; };
  let at = t + .3;
  at = typeOut("what if I don't know anyone…", at, 1.1);
  at = erase("what if I don't know anyone…", at + .6, .45);
  at = typeOut("I'm in", at + .35, .45);
  tl.call(() => send.classList.add('is-ready'), null, at);

  // scroll: the poster and the phone drift apart; pointer tilts the stage
  gsap.to('.flyer:not(.flyer--back)', { yPercent: -10, rotate: -6, ease: 'none', scrollTrigger: { trigger: '.s-hero', start: 'top top', end: 'bottom top', scrub: true } });
  gsap.to('.flyer--back', { yPercent: -4, ease: 'none', scrollTrigger: { trigger: '.s-hero', start: 'top top', end: 'bottom top', scrub: true } });
  gsap.to('.iphone', { y: -90, ease: 'none', scrollTrigger: { trigger: '.s-hero', start: 'top top', end: 'bottom top', scrub: true } });
  gsap.fromTo('[data-notif]', { y: 0, opacity: 1 }, { y: -140, opacity: 0, ease: 'none', immediateRender: false, scrollTrigger: { trigger: '.s-hero', start: '20% top', end: '70% top', scrub: true } });
  if (finePointer) {
    const stage = $('.s-hero__stage');
    const rx = gsap.quickTo(stage, 'rotationY', { duration: 1.2, ease: 'power3.out' }), ry = gsap.quickTo(stage, 'rotationX', { duration: 1.2, ease: 'power3.out' });
    gsap.set(stage, { transformPerspective: 1400 });
    $('.s-hero').addEventListener('pointermove', e => { rx((e.clientX / innerWidth - .5) * 8); ry((e.clientY / innerHeight - .5) * -6); });
  }

  /* ---------- The idea: each photo gets its text exchange ---------- */
  $$('.mms').forEach((card, i) => {
    const [q, a] = $$('.sms', card);
    const dots = typing();
    gsap.set([q, a], { autoAlpha: 0, scale: .9 });
    q.style.transformOrigin = '100% 100%'; a.style.transformOrigin = '0% 100%';
    const run = gsap.timeline({ paused: true, delay: i * .18 })
      .from(card, { y: 40, opacity: 0, duration: 1 }, 0)
      .to(q, { autoAlpha: 1, scale: 1, duration: .45, ease: 'back.out(1.8)' }, .3)
      .call(() => { $('.mms__chat', card).append(dots); gsap.fromTo(dots, { autoAlpha: 0 }, { autoAlpha: 1, duration: .2 }); }, null, .7)
      .call(() => dots.remove(), null, 1.5)
      .to(a, { autoAlpha: 1, scale: 1, duration: .45, ease: 'back.out(1.8)' }, 1.5);
    ScrollTrigger.create({ trigger: card, start: 'top 85%', once: true, onEnter: () => run.play() });
    gsap.fromTo($('img', card), { yPercent: -4 }, { yPercent: 4, ease: 'none', scrollTrigger: { trigger: card, start: 'top bottom', end: 'bottom top', scrub: true } });
  });
  // the words of the note light up as you read
  const vText = $('.vnote__text');
  if (vText) {
    gsap.fromTo($$('.w', vText), { opacity: .2 }, { opacity: 1, stagger: .1, ease: 'none', scrollTrigger: { trigger: vText, start: 'top 82%', end: 'bottom 50%', scrub: .5 } });
    gsap.from('.vnote__player', { y: 16, opacity: 0, duration: .9, scrollTrigger: { trigger: '.vnote', start: 'top 80%' } });
  }

  /* ---------- The nights: photos drift; the "now playing" row follows your scroll ---------- */
  $$('.when').forEach((w, i) => {
    gsap.from(w, { y: 50, opacity: 0, duration: 1.1, delay: i * .12, scrollTrigger: { trigger: '.nights2', start: 'top 82%' } });
    gsap.fromTo($('img', w), { yPercent: -5 }, { yPercent: 5, ease: 'none', scrollTrigger: { trigger: w, start: 'top bottom', end: 'bottom top', scrub: true } });
  });
  const ipod = $('.ipod');
  if (ipod) {
    gsap.from(ipod, { y: 50, opacity: 0, duration: 1.1, delay: .24, scrollTrigger: { trigger: '.nights2', start: 'top 82%' } });
    const rows = $$('.ipod__list li', ipod);
    const EQ = '<s></s><s></s><s></s>';
    let cur = -1;
    ScrollTrigger.create({ trigger: ipod, start: 'top 80%', end: 'bottom 20%', scrub: true, onUpdate: st => {
      ipod.style.setProperty('--p', (st.progress * 100).toFixed(1) + '%');
      const n = Math.min(rows.length - 1, Math.floor(st.progress * rows.length));
      if (n === cur) return;
      cur = n;
      rows.forEach((r, i) => {
        const lead = r.firstElementChild;
        r.classList.toggle('is-now', i === n);
        lead.className = i === n ? 'ipod__eq' : '';
        lead.innerHTML = i === n ? EQ : String(i + 1);
      });
    } });
  }

  /* ---------- The Ultra block: outline words assemble letter by letter, drift, and fill ---------- */
  const room = $('.room');
  if (room) {
    $$('.room__bg span', room).forEach((w, i) => {
      w.innerHTML = [...w.textContent].map(c => `<i>${esc(c)}</i>`).join('');
      const ch = $$('i', w);
      gsap.fromTo(w, { xPercent: i ? 16 : -16 }, { xPercent: i ? -6 : 6, ease: 'none', scrollTrigger: { trigger: room, start: 'top bottom', end: 'bottom top', scrub: .8 } });
      gsap.fromTo(ch, { yPercent: i ? -70 : 70, rotate: i ? -8 : 8, opacity: 0 }, { yPercent: 0, rotate: 0, opacity: 1, ease: 'power3.out', stagger: .06, scrollTrigger: { trigger: room, start: 'top 90%', end: 'top 30%', scrub: .8 } });
      gsap.fromTo(ch, { '--fill': 0 }, { '--fill': 1, ease: 'none', stagger: .08, scrollTrigger: { trigger: room, start: 'top 40%', end: 'bottom 60%', scrub: .8 } });
    });
    gsap.timeline({ scrollTrigger: { trigger: room, start: 'top 70%' } })
      .from('.room__done', { y: 20, opacity: 0, duration: .8 })
      .from('.room__done .i', { scale: 0, rotate: -45, duration: .6, ease: 'back.out(3)' }, '-=.3')
      .from('.room__next', { y: 20, opacity: 0, filter: 'blur(6px)', duration: .8, stagger: .2 }, '-=.2');
    gsap.from(room, { clipPath: 'inset(6% 3% 6% 3%)', ease: 'none', scrollTrigger: { trigger: room, start: 'top bottom', end: 'top 35%', scrub: true } });
  }

  /* ---------- Footer beat: only the Paper sticks move ---------- */
  const live = beatNodes.filter(nd => nd.getAttribute('fill') === FILL.p);
  const prm = live.map(() => [1.8 + Math.random() * 2.6, 3.1 + Math.random() * 3.4, Math.random() * 6.28, Math.random() * 6.28]);
  let footOn = false;
  live.forEach(nd => { nd.style.transformBox = 'fill-box'; nd.style.transformOrigin = '50% 100%'; });
  ScrollTrigger.create({ trigger: '.g-footer', start: 'top bottom', end: 'bottom top', onToggle: st => { footOn = st.isActive; } });
  gsap.ticker.add(() => {
    if (!footOn) return;
    const tt = gsap.ticker.time;
    live.forEach((nd, i) => { const [f1, f2, p1, p2] = prm[i]; const v = Math.max(.3, Math.min(1, (.78 + .22 * Math.sin(tt * 1.6 - i * .6)) * (.3 + .7 * Math.abs(.6 * Math.sin(tt * f1 + p1) + .4 * Math.sin(tt * f2 + p2))))); nd.style.transform = `scaleY(${v.toFixed(3)})`; });
  });

  // titles, reveals, tiles
  document.fonts?.ready.then(() => {
    $$('[data-split]').forEach(el => {
      if (el.closest('[hidden]')) return;
      const sp = SplitText.create(el, { type: 'lines', mask: 'lines' });
      gsap.from(sp.lines, { yPercent: 110, rotate: 2, transformOrigin: '0% 100%', duration: 1.1, stagger: .08, scrollTrigger: { trigger: el, start: 'top 86%' } });
    });
    ScrollTrigger.refresh();
  });
  ScrollTrigger.batch('[data-reveal]', { start: 'top 90%', onEnter: els => gsap.to(els, { opacity: 1, y: 0, duration: 1, stagger: .08, overwrite: true }) });
  gsap.from('.tile2', { y: 30, opacity: 0, stagger: .08, duration: 1, scrollTrigger: { trigger: '.tiles', start: 'top 86%' } });
  gsap.from('.faq-chip', { y: 12, opacity: 0, stagger: .03, duration: .6, scrollTrigger: { trigger: '.faq-chips', start: 'top 86%' } });
  gsap.from('.faq-thread', { y: 24, opacity: 0, duration: 1, scrollTrigger: { trigger: '.faq-thread', start: 'top 88%' } });
})();
