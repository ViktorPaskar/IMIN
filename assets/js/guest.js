/* =========================================================
   IMIN — guest page
   Renders from assets/js/config.js, then adds motion.
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
    const photo = (src) => { if (src) { img.src = src; photoBox.hidden = false; card.classList.add('has-photo'); } };
    let html = '';
    if (state === 'A') {
      const d = parse(next.date);
      html = `<div class="invite__top"><span class="label invite__label">Doors · ${dayDate(d)} · ${time(d)}</span><span class="by">By ${esc(next.by || 'IMIN')}</span></div>
        <div class="invite__date" aria-hidden="true"><span class="invite__day">${pad(d.getDate())}.${pad(d.getMonth() + 1)}</span><span class="invite__when"><b>${DAYS[d.getDay()]}</b>Doors ${time(d)}<span>${esc(next.city)}</span></span></div>
        <p class="invite__text">${esc(next.name)}. ${esc(next.line)} ${esc(next.city)}.</p>
        <div class="invite__perf" aria-hidden="true"></div>
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
    $('.invite__body', card).innerHTML = html + `<a class="btn-im" href="${esc(im[0]?.href || '#')}" data-im data-track="hero_im_in_click"${im[0]?.target ? ' target="_blank" rel="noopener"' : ''}><span>I'm in</span></a>`;
    im.splice(0, 1, $('[data-im]', card));
  }
  renderInvite();

  // ticket cut-outs follow the tear line
  const perf = $('.invite__perf');
  if (card && perf) {
    const place = () => { card.style.setProperty('--cut-y', `${perf.offsetTop + perf.offsetParent.clientTop + .5}px`); card.classList.add('has-cut'); };
    place();
    if ('ResizeObserver' in window) new ResizeObserver(place).observe(card);
    document.fonts?.ready.then(place);
  }

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

  const eyebrow = $('[data-hero-eyebrow]');
  if (eyebrow && cities.length) eyebrow.textContent = `Music-first nights · ${cities.join(' · ')}`;

  // formats
  const fm = $('[data-formats]');
  if (fm) fm.innerHTML = (cfg.formats || []).map(f => `
    <article class="format" data-reveal>
      ${f.photo ? `<div class="format__bg" aria-hidden="true"><img src="${esc(f.photo)}" alt="" loading="lazy"></div>` : ''}
      <div class="format__top"><span class="label">Format</span><span class="by">By ${esc(f.by)}</span></div>
      <h3>${esc(f.name)}</h3><p>${esc(f.text)}</p>
    </article>`).join('');

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
    if (real) $('[data-last-quotes]').innerHTML = (last.quotes || []).map(q => `<figure class="note"><blockquote class="note__text">${esc(q.text)}</blockquote><figcaption class="note__by"><span>${esc(q.name)}</span></figcaption></figure>`).join('');
    const pl = $('[data-last-playlist]'); if (last.playlist) { pl.href = last.playlist; pl.hidden = false; }
    if (!real) sec.classList.add('is-preview');
  }

  // section numbers follow what's visible
  $$('main > section:not([hidden]) .sec-label').forEach((l, i) => { const b = document.createElement('b'); b.textContent = pad(i + 1); l.prepend(b); });

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
    if (name === 'hero_im_in_click') { p.state = state; p.event_id = next ? next.id : ''; }
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
    new IntersectionObserver(([en]) => { heroGone = !en.isIntersecting; updateSticky(); }).observe($('.invite') || $('.g-hero'));
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

  if (!hasGSAP) {
    $('.loader')?.remove();
    $$('[data-reveal]').forEach(el => { el.style.opacity = 1; el.style.transform = 'none'; });
    return;
  }

  /* =========================================================
     Motion
     ========================================================= */
  const { gsap } = window;
  gsap.registerPlugin(ScrollTrigger, SplitText);
  gsap.defaults({ ease: 'expo.out', duration: 1.1 });

  let lenis = null;
  if (!reduced && typeof window.Lenis !== 'undefined') {
    lenis = new Lenis({ lerp: .1, smoothWheel: true });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add(t => lenis.raf(t * 1000));
    gsap.ticker.lagSmoothing(0);
  }
  $$('a[href^="#"]').forEach(a => a.addEventListener('click', e => {
    const id = a.getAttribute('href');
    if (id.length < 2 || /^#state-/.test(id)) return;
    const t = $(id); if (!t) return;
    e.preventDefault();
    lenis ? lenis.scrollTo(t, { offset: -8, duration: 1.4 }) : t.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth' });
  }));

  /* Loader: desktop only, once per session. Phones go straight to the hero. */
  const loader = $('.loader');
  const firstVisit = !store.get('imin_seen');
  const showLoader = loader && !reduced && finePointer && !store.sget('imin_loader');
  store.sset('imin_loader', '1');

  function heroIntro(delay = 0) {
    const hero = $('.g-hero');
    const tl = gsap.timeline({ delay, onComplete: () => hero.classList.add('is-ready') });
    tl.fromTo('.g-hero__media .hero__photo img', { scale: 1.18 }, { scale: 1.02, duration: 2.8, ease: 'power3.out' }, 0)
      .fromTo('.g-hero__media .hero__photo:first-child img', { filter: 'grayscale(1) contrast(1.15) brightness(.2)' }, { filter: 'grayscale(1) contrast(1.15) brightness(.8)', duration: 2.8, ease: 'power3.out' }, 0)
      .from('.g-hero__lines i', { scaleY: 0, duration: 1.6, stagger: .08, ease: 'expo.inOut' }, 0)
      .from('.g-hero__eyebrow i', { scaleX: 0, duration: 1, ease: 'expo.inOut' }, .2)
      .from('.g-hero__eyebrow span', { opacity: 0, x: -10, duration: .9 }, .4)
      .from('.g-hero__title .line > span', { yPercent: 110, rotate: 4, transformOrigin: '0% 100%', duration: 1.3, stagger: .1 }, .15)
      .from('.g-hero__sub', { y: 14, opacity: 0, duration: .9 }, '-=.9')
      .from('.invite', { y: 40, opacity: 0, clipPath: 'inset(0 0 100% 0)', duration: 1.3, ease: 'expo.out' }, .3)
      .from('.invite__body > *', { y: 16, opacity: 0, duration: .8, stagger: .06 }, .55)
      .from('.g-hero__under', { opacity: 0, duration: .8 }, 1)
      .from(beatNodes, { scaleY: 0, transformOrigin: '50% 100%', transformBox: 'fill-box', duration: 1, stagger: { each: .008, from: 'start' } }, .2)
      .add(() => wave.start(), 1.2);
    if (firstVisit && !reduced) tl.add(thoughts, .2);
    store.set('imin_seen', '1');
    return tl;
  }

  /* Thoughts: pile up behind the headline, get crossed out, then fall away (once, ~2.2 s) */
  function thoughts() {
    const box = $('.thoughts'); if (!box) return;
    const items = $$('.thought', box);
    box.classList.add('is-on');
    gsap.timeline({ onComplete: () => box.remove() })
      .fromTo(items, { opacity: 0, y: 24, filter: 'blur(8px)' }, { opacity: 1, y: 0, filter: 'blur(0px)', duration: .5, stagger: .18, ease: 'power3.out' })
      .call(() => items.forEach((t, i) => setTimeout(() => t.classList.add('is-struck'), i * 110)), null, '-=.15')
      .to(items, { y: () => innerHeight * (.6 + Math.random() * .3), rotate: () => gsap.utils.random(-18, 18), opacity: 0, duration: .9, stagger: .07, ease: 'power3.in' }, '+=.55');
  }

  /* The beat breathes like a sound wave once the page is up */
  const wave = (() => {
    let on = false, visible = true, prm = [], live = [];
    // every moving stick gets its own tempo and phase, like a level meter
    const seed = () => { prm = live.map(() => [1.8 + Math.random() * 2.6, 3.1 + Math.random() * 3.4, Math.random() * 6.28, Math.random() * 6.28]); };
    // only the Paper sticks move; Haze and Doorlight hold still
    const prep = () => { live = beatNodes.filter(nd => nd.getAttribute('fill') === FILL.p); seed(); live.forEach(nd => { nd.style.transformBox = 'fill-box'; nd.style.transformOrigin = '50% 100%'; }); };
    const run = () => {
      if (!visible) return;
      const t = gsap.ticker.time;
      const n = live.length;
      for (let i = 0; i < n; i++) {
        const [f1, f2, p1, p2] = prm[i];
        const swell = .78 + .22 * Math.sin(t * 1.6 - i * .6); // a slow pulse travels along the line
        const v = Math.max(.3, Math.min(1, swell * (.3 + .7 * Math.abs(.6 * Math.sin(t * f1 + p1) + .4 * Math.sin(t * f2 + p2)))));
        live[i].style.transform = `scaleY(${v.toFixed(3)})`;
      }
    };
    return {
      start() {
        if (on || reduced) return; on = true;
        prep();
        gsap.ticker.add(run);
        ScrollTrigger.create({ trigger: '.g-hero', start: 'top top', end: 'bottom top', onToggle: st => { visible = st.isActive; } });
      },
      redraw() { if (on) prep(); }
    };
  })();
  addEventListener('resize', () => setTimeout(() => wave.redraw(), 260));

  if (showLoader) {
    body.classList.add('is-loading'); lenis?.stop();
    const bar = beat($('.loader__bar'), 1);
    bar.svg.style.overflow = 'visible';
    const ss = bar.nodes;
    // light chase through the brand colours (the variant the client picked)
    const RAMP = [[0, [75, 43, 255]], [.25, [156, 140, 255]], [.5, [244, 239, 231]], [.75, [22, 184, 119]], [1, [75, 43, 255]]];
    const col = t => { for (let i = 1; i < RAMP.length; i++) if (t <= RAMP[i][0]) { const [p0, c0] = RAMP[i - 1], [p1, c1] = RAMP[i], k = (t - p0) / (p1 - p0); return `rgb(${c0.map((v, j) => Math.round(v + (c1[j] - v) * k)).join(',')})`; } return 'rgb(75,43,255)'; };
    const chase = () => { const t = gsap.ticker.time; ss.forEach((n, i) => n.setAttribute('fill', col((((t * .45 - i * .09) % 1) + 1) % 1))); };
    gsap.ticker.add(chase);
    const c = { v: 0 }, count = $('.loader__count');
    gsap.timeline({ onComplete: () => { gsap.ticker.remove(chase); loader.remove(); body.classList.remove('is-loading'); lenis?.start(); ScrollTrigger.refresh(); } })
      .from(ss, { scaleY: 0, transformOrigin: '50% 50%', transformBox: 'fill-box', duration: .6, stagger: .04 })
      .to(c, { v: 100, duration: .8, ease: 'power2.inOut', onUpdate: () => { count.textContent = pad(Math.round(c.v)); } }, 0)
      .to(ss, { scaleY: 0, opacity: 0, duration: .45, stagger: { each: .03, from: 'center' }, ease: 'power3.in' }, '+=.1')
      .to(loader, { opacity: 0, duration: .5 }, '-=.15')
      .add(heroIntro(), '-=.45');
  } else {
    loader?.remove();
    if (!reduced) heroIntro(0);
  }

  // hero: on the way out the lines split apart, the photo pushes in, the ticket lifts away
  if (!reduced) {
    const out = gsap.timeline({ scrollTrigger: { trigger: '.g-hero', start: 'top top', end: 'bottom top', scrub: .4 } });
    out.to('.g-hero__media', { yPercent: 18, scale: 1.08, ease: 'none' }, 0)
      .to('.g-hero__title .line:nth-child(1)', { xPercent: -10, ease: 'none' }, 0)
      .to('.g-hero__title .line:nth-child(2)', { xPercent: 8, ease: 'none' }, 0)
      .to('.g-hero__title .line:nth-child(3)', { xPercent: -5, ease: 'none' }, 0)
      .to('.g-hero__copy', { yPercent: -20, opacity: .2, ease: 'none' }, 0)
      .to('.g-hero__aside', { y: -120, ease: 'none' }, 0)
      .to('.g-hero__shade', { opacity: .6, ease: 'none' }, 0);
    if (finePointer) {
      const hero = $('.g-hero'), lit = $('.hero__photo--lit');
      const photo = $$('.g-hero__media .hero__photo');
      const px = gsap.quickTo(photo, 'x', { duration: 2, ease: 'power3.out' });
      const py = gsap.quickTo(photo, 'y', { duration: 2, ease: 'power3.out' });
      const m = { x: innerWidth * .7, y: innerHeight * .4 };
      const mx = gsap.quickTo(m, 'x', { duration: .9, ease: 'power3.out', onUpdate: () => lit.style.setProperty('--mx', m.x + 'px') });
      const my = gsap.quickTo(m, 'y', { duration: .9, ease: 'power3.out', onUpdate: () => lit.style.setProperty('--my', m.y + 'px') });
      hero.addEventListener('pointermove', e => {
        px((e.clientX / innerWidth - .5) * -22); py((e.clientY / innerHeight - .5) * -14);
        const r = lit.getBoundingClientRect(); mx(e.clientX - r.left); my(e.clientY - r.top);
        hero.classList.toggle('is-lit', !e.target.closest('.invite, .g-hero__title, .header'));
      });
      hero.addEventListener('pointerleave', () => hero.classList.remove('is-lit'));
    }
  }

  // the Ultra block: big outline words assemble letter by letter, drift apart and fill as you pass
  const room = $('.room');
  if (room && !reduced) {
    $$('.room__bg span', room).forEach((w, i) => {
      w.innerHTML = [...w.textContent].map(c => `<i>${esc(c)}</i>`).join('');
      const ch = $$('i', w);
      gsap.fromTo(w, { xPercent: i ? 16 : -16 }, { xPercent: i ? -6 : 6, ease: 'none', scrollTrigger: { trigger: room, start: 'top bottom', end: 'bottom top', scrub: .8 } });
      gsap.fromTo(ch, { yPercent: i ? -70 : 70, rotate: i ? -8 : 8, opacity: 0 }, { yPercent: 0, rotate: 0, opacity: 1, ease: 'power3.out', stagger: .06, scrollTrigger: { trigger: room, start: 'top 90%', end: 'top 30%', scrub: .8 } });
      gsap.fromTo(ch, { '--fill': 0 }, { '--fill': 1, ease: 'none', stagger: .08, scrollTrigger: { trigger: room, start: 'top 40%', end: 'bottom 60%', scrub: .8 } });
    });
    const sl = $('.room__slogan');
    gsap.timeline({ scrollTrigger: { trigger: room, start: 'top 70%' } })
      .from('.room__done', { y: 20, opacity: 0, duration: .8 })
      .from('.room__done .i', { scale: 0, rotate: -45, duration: .6, ease: 'back.out(3)' }, '-=.3')
      .from('.room__next', { y: 20, opacity: 0, filter: 'blur(6px)', duration: .8, stagger: .2 }, '-=.2')
      .add(() => sl.classList.add('is-lit'));
  }

  // titles: masked line reveal
  document.fonts?.ready.then(() => {
    if (!reduced) $$('[data-split]').forEach(el => {
      if (el.closest('[hidden]')) return;
      const s = SplitText.create(el, { type: 'lines', mask: 'lines' });
      gsap.from(s.lines, { yPercent: 110, rotate: 3, transformOrigin: '0% 100%', duration: 1.3, stagger: .09, scrollTrigger: { trigger: el, start: 'top 86%' } });
    });
    ScrollTrigger.refresh();
  });

  // generic reveals
  if (reduced) $$('[data-reveal]').forEach(el => { el.style.opacity = 1; el.style.transform = 'none'; });
  else ScrollTrigger.batch('[data-reveal]', { start: 'top 90%', onEnter: els => gsap.to(els, { opacity: 1, y: 0, duration: 1.1, stagger: .08, overwrite: true }) });

  // the idea: thoughts get crossed out as you scroll, answers light up
  $$('.qa__row').forEach(row => {
    const q = $('.qa__q', row), a = $('.qa__a', row);
    if (reduced) return;
    gsap.timeline({ scrollTrigger: { trigger: row, start: 'top 82%', end: 'top 52%', scrub: .6 } })
      .fromTo(q, { '--strike': 0 }, { '--strike': 1, ease: 'none' }, 0)
      .fromTo(a, { opacity: .12, x: -12 }, { opacity: 1, x: 0, ease: 'none' }, .2);
  });

  // setlist rows and tiles
  if (!reduced) {
    gsap.from('.setlist li', { y: 18, opacity: 0, stagger: .08, duration: .9, scrollTrigger: { trigger: '.setlist', start: 'top 82%' } });
    gsap.from('.tile2', { y: 30, opacity: 0, stagger: .08, duration: 1, scrollTrigger: { trigger: '.tiles', start: 'top 85%' } });
    gsap.from('.qd', { y: 16, opacity: 0, stagger: .04, duration: .8, scrollTrigger: { trigger: '.faq__list', start: 'top 85%' } });
    gsap.from('.room', { clipPath: 'inset(6% 3% 6% 3%)', ease: 'none', scrollTrigger: { trigger: '.room', start: 'top bottom', end: 'top 35%', scrub: true } });
  }

  // section labels: the little rule draws in
  if (!reduced) $$('.sec-label').forEach(l => {
    gsap.fromTo(l, { '--rule': 0 }, { '--rule': 1, duration: 1.2, ease: 'expo.inOut', scrollTrigger: { trigger: l, start: 'top 90%' } });
    gsap.from(l, { opacity: 0, x: -12, duration: 1, scrollTrigger: { trigger: l, start: 'top 90%' } });
  });

  // Bohdan's note: the photo opens and drifts, the words light up as you read
  const note = $('#idea .note');
  if (note && !reduced) {
    const ph = $('.note__photo', note);
    gsap.from(ph, { clipPath: 'inset(100% 0 0 0)', duration: 1.6, ease: 'expo.inOut', scrollTrigger: { trigger: note, start: 'top 80%' } });
    gsap.fromTo($('img', ph), { yPercent: -8, scale: 1.15 }, { yPercent: 8, scale: 1, ease: 'none', scrollTrigger: { trigger: note, start: 'top bottom', end: 'bottom top', scrub: true } });
    const q = $('[data-words]', note);
    q.innerHTML = q.textContent.split(' ').map(w => `<span class="w">${esc(w)}</span>`).join(' ');
    gsap.fromTo($$('.w', q), { opacity: .16 }, { opacity: 1, stagger: .1, ease: 'none', scrollTrigger: { trigger: q, start: 'top 80%', end: 'bottom 45%', scrub: .5 } });
    gsap.from('.note__by', { opacity: 0, y: 12, duration: 1, scrollTrigger: { trigger: '.note__by', start: 'top 92%' } });
  }

  // setlist: the meters start playing when it comes into view
  const sl = $('.setlist');
  if (sl && !reduced) {
    ScrollTrigger.create({ trigger: sl, start: 'top 85%', end: 'bottom 10%', toggleClass: 'is-playing' });
    gsap.from('.setlist .meter i', { scaleY: 0, duration: .8, stagger: { each: .012, from: 'start' }, ease: 'power3.out', scrollTrigger: { trigger: sl, start: 'top 80%' } });
  }
  $$('.format__bg img').forEach(img => !reduced && gsap.fromTo(img, { yPercent: -10 }, { yPercent: 0, ease: 'none', scrollTrigger: { trigger: img.closest('.format'), start: 'top bottom', end: 'bottom top', scrub: true } }));

  // photo strip: panels rise one by one, photos drift inside their frames
  const strip = $('.night__grid');
  if (strip && !reduced) {
    const panels = $$('.ph', strip);
    gsap.from(panels, { clipPath: 'inset(100% 0% 0% 0%)', duration: 1.5, ease: 'expo.inOut', stagger: .09, scrollTrigger: { trigger: strip, start: 'top 82%' } });
    panels.forEach((f, i) => gsap.fromTo($('img', f), { yPercent: -6 - i % 2 * 3, scale: 1.18 }, { yPercent: 6 + i % 2 * 3, scale: 1.06, ease: 'none', scrollTrigger: { trigger: strip, start: 'top bottom', end: 'bottom top', scrub: true } }));
    if (!finePointer) {
      const mark = () => {
        const mid = strip.getBoundingClientRect().left + strip.clientWidth / 2;
        let best = null, dist = Infinity;
        panels.forEach(p => { const r = p.getBoundingClientRect(); const d = Math.abs(r.left + r.width / 2 - mid); if (d < dist) { dist = d; best = p; } });
        panels.forEach(p => p.classList.toggle('is-active', p === best));
      };
      strip.addEventListener('scroll', () => requestAnimationFrame(mark), { passive: true });
      ScrollTrigger.create({ trigger: strip, start: 'top 70%', onEnter: mark });
    }
  }

  // reading progress
  gsap.to('.progress span', { scaleX: 1, ease: 'none', scrollTrigger: { trigger: body, start: 'top top', end: 'bottom bottom', scrub: .3 } });

  // cursor (desktop)
  if (finePointer && !reduced) {
    const cur = $('.cursor');
    const cx = gsap.quickTo(cur, 'x', { duration: .35, ease: 'power3.out' }), cy = gsap.quickTo(cur, 'y', { duration: .35, ease: 'power3.out' });
    addEventListener('pointermove', e => { cx(e.clientX); cy(e.clientY); cur.classList.add('is-visible'); });
    document.addEventListener('pointerleave', () => cur.classList.remove('is-visible'));
    document.addEventListener('pointerover', e => cur.classList.toggle('is-hover', !!e.target.closest('a, button, label, .qd__btn')));
  }
})();
