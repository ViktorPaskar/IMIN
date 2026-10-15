/* IMIN · creators page imin.wtf/pro */
(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const wait = ms => new Promise(res => setTimeout(res, reduce ? 0 : ms));
  const C = (window.IMIN && window.IMIN.pro) || {};
  const L = C.links || {};

  /* images: resolve once decoded, so a reveal never animates an empty frame */
  const ready = img => !img ? Promise.resolve() : (img.complete && img.naturalWidth ? (img.decode ? img.decode().catch(() => {}) : Promise.resolve())
    : new Promise(res => { img.addEventListener('load', () => res(img.decode ? img.decode().catch(() => {}) : null), { once: true }); img.addEventListener('error', res, { once: true }); setTimeout(res, 4000); }));
  // after the page has loaded, fetch the lazy images in the background so they are there before the reader is
  addEventListener('load', () => setTimeout(() => { $$('img[loading="lazy"]').forEach(i => { i.loading = 'eager'; }); }, 600), { once: true });

  /* analytics: events from the spec, pushed to a dataLayer for whatever reads it */
  const track = (event, params = {}) => { (window.dataLayer = window.dataLayer || []).push({ event, ...params }); };

  /* header */
  const top = $('.top');
  const onScroll = () => top.classList.toggle('scrolled', window.scrollY > 8);
  addEventListener('scroll', onScroll, { passive: true });
  onScroll();
  document.addEventListener('click', e => {
    $$('details.lang[open]').forEach(d => { if (!d.contains(e.target)) d.open = false; });
  });

  /* links from config; channels without a link yet are hidden, the call falls back to the form */
  $$('[data-link]').forEach(a => {
    const k = a.dataset.link;
    const u = L[k];
    if (u) { a.href = u; return; }
    if (k === 'whatsapp' || k === 'telegram') a.hidden = true;
    if (k === 'call') {
      a.removeAttribute('target');
      a.removeAttribute('rel');
      if (!a.dataset.pitch) a.dataset.pitch = 'planned';
      a.href = '#pitch';
      const ico = $('use', a);
      if (ico) ico.setAttribute('href', '#i-arrow-right');
    }
  });

  /* CREATE YOUR NIGHT: count it, and remember the visit so a return shows the softer ways in */
  const FLAG = 'imin-pro-signup';
  $$('[data-create]').forEach(a => a.addEventListener('click', () => {
    track('pro_create_click', { place: a.dataset.create });
    try { sessionStorage.setItem(FLAG, '1'); } catch (e) {}
  }));
  const doubt = $('[data-doubt]');
  const checkReturn = () => {
    let back = false;
    try { back = sessionStorage.getItem(FLAG) === '1'; } catch (e) {}
    if (back && doubt.hidden) {
      doubt.hidden = false;
      if (window.ScrollTrigger) requestAnimationFrame(() => ScrollTrigger.refresh());
      track('signup_doubt_block_shown', { trigger: 'return' });
    }
  };
  checkReturn();
  addEventListener('pageshow', checkReturn);
  $$('[data-alt]').forEach(a => a.addEventListener('click', () => {
    const p = { type: a.dataset.alt, place: a.dataset.place || closestPlace(a) };
    if (a.dataset.channel) p.channel = a.dataset.channel;
    track('pro_alt_click', p);
  }));
  const closestPlace = el => (el.closest('section, aside') || {}).id || 'page';

  /* ---------- the one form: Send us your night / Pitch us your night ---------- */
  const pitch = $('#pitch');
  const form = $('#pitch-form');
  const whatLabel = $('[data-what-label]');
  const WHAT = { planned: 'What’s the night?', idea: 'What’s the idea?', company: 'What’s the occasion?' };
  const setType = t => {
    const r = form.elements.type;
    Array.from(r).forEach(i => { i.checked = i.value === t; });
    whatLabel.textContent = WHAT[t] || WHAT.planned;
  };
  form.addEventListener('change', e => { if (e.target.name === 'type') setType(e.target.value); });
  const openPitch = type => {
    setType(type);
    pitch.classList.remove('lit'); void pitch.offsetWidth; pitch.classList.add('lit');
    setTimeout(() => { const f = $('#pf-name'); if (f) f.focus({ preventScroll: true }); }, reduce ? 0 : 900);
  };
  $$('[data-pitch]').forEach(a => a.addEventListener('click', () => {
    if (a.getAttribute('href') !== '#pitch') return;
    openPitch(a.dataset.pitch);
  }));

  const err = $('[data-pitch-err]');
  const done = $('[data-pitch-done]');
  form.addEventListener('submit', async e => {
    e.preventDefault();
    err.hidden = true;
    if (form.elements.company_site.value) return;
    const bad = ['name', 'contact', 'what'].map(n => form.elements[n]).find(f => !f.value.trim());
    if (bad) { err.textContent = 'Add ' + ({ name: 'your name', contact: 'an email or Instagram', what: 'a few words about the night' })[bad.name] + ', then send.'; err.hidden = false; bad.focus(); return; }
    const link = form.elements.link;
    if (link.value && !link.checkValidity()) { err.textContent = 'The link should start with https://'; err.hidden = false; link.focus(); return; }
    if (!form.elements.ok.checked) { err.textContent = 'Tick the box so we can use these details to answer you.'; err.hidden = false; return; }
    const data = Object.fromEntries(new FormData(form));
    delete data.company_site;
    data.consent = true;
    data.lang = document.documentElement.lang;
    track('pitch_form_submit', { type: data.type });
    if (C.pitchEndpoint) {
      try { await fetch(C.pitchEndpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }); }
      catch (x) { err.textContent = 'That didn’t go through. Try again, or write to contact@imin.support.'; err.hidden = false; return; }
    }
    form.hidden = true;
    done.innerHTML = '<svg class="ico gen" aria-hidden="true"><use href="#i-check"/></svg><div class="gen"><b></b><p></p></div>';
    $('b', done).textContent = 'Got it, ' + data.name.trim().split(/\s+/)[0] + '.';
    $('p', done).textContent = 'We’ll answer within 24 hours at ' + data.contact.trim() + '.';
    if (window.ScrollTrigger) ScrollTrigger.refresh();
  });

  /* ---------- Earn: what the buyer pays ---------- */
  const range = $('#calc-price');
  if (range) {
    const eur = n => '€' + (Number.isInteger(n) ? n : n.toFixed(2));
    const cents = n => '€' + n.toFixed(2);
    const paint = () => {
      const p = Number(range.value);
      const fee = p ? Math.round((p * 0.05 + 0.99) * 100) / 100 : 0;
      $('[data-price]').textContent = p ? eur(p) : 'Free';
      $('[data-total]').textContent = p ? cents(p + fee) : '€0';
      $('[data-fee]').textContent = p ? cents(fee) : '€0';
      $('[data-note]').textContent = p ? 'The fee is on top of your price, and the buyer sees it before paying.' : 'Free nights are free. No fee for you, no fee for your guests.';
      range.style.setProperty('--p', (p / Number(range.max) * 100) + '%');
    };
    range.addEventListener('input', paint);
    paint();
  }

  /* ---------- IMIN x you ---------- */
  const you = $('[data-you]');
  const yourName = $('#imx-name');
  if (you && yourName) yourName.addEventListener('input', () => { you.textContent = yourName.value.trim() || 'You'; });

  /* ---------- FAQ: smooth open and close ---------- */
  $$('.acc details').forEach(d => {
    const s = $('summary', d), a = $('.acc-a', d);
    s.addEventListener('click', e => {
      e.preventDefault();
      if (reduce) { d.open = !d.open; if (d.open) track('faq_open', { question_id: d.dataset.q }); return; }
      if (d.open) {
        a.animate([{ height: a.offsetHeight + 'px', opacity: 1 }, { height: '0px', opacity: 0 }], { duration: 320, easing: 'cubic-bezier(.2,.7,.2,1)' }).onfinish = () => { d.open = false; };
        $('.ico', s).style.transform = 'none';
      } else {
        d.open = true;
        $('.ico', s).style.transform = '';
        a.animate([{ height: '0px', opacity: 0 }, { height: a.offsetHeight + 'px', opacity: 1 }], { duration: 420, easing: 'cubic-bezier(.2,.7,.2,1)' });
        track('faq_open', { question_id: d.dataset.q });
      }
    });
  });

  /* ---------- the beat: I Paper · M Haze · N Doorlight; only the Paper sticks move ---------- */
  const NS = 'http://www.w3.org/2000/svg';
  const D_BACK = 'M292.215 52.8235C285.967 25.8047 306.486 0 334.218 0C354.056 0 371.334 13.5391 376.078 32.8025L550.268 740.176C557.762 770.606 534.728 800 503.389 800C480.916 800 461.414 784.494 456.351 762.598L292.215 52.8235Z';
  const D_FWD = 'M877.785 52.8235C884.033 25.8047 863.514 0 835.782 0C815.944 0 798.666 13.5391 793.922 32.8025L619.732 740.176C612.238 770.606 635.272 800 666.611 800C689.084 800 708.586 784.494 713.649 762.598L877.785 52.8235Z';
  const BAR = [['v', 0, 'p'], ['v', 140, 'h'], ['b', 0, 'h'], ['f', 0, 'h'], ['v', 930, 'h'], ['v', 1070, 'p'], ['v', 1210, 'd'], ['b', 1070, 'd'], ['v', 1675, 'd']];
  const FILL = { p: '#F4EFE7', h: '#9C8CFF', d: '#16B877' };
  const bands = $$('[data-beat]').map(el => ({ el, live: [], on: false }));
  const drawBand = band => {
    const h = band.el.clientHeight || 56;
    const bars = Math.ceil(innerWidth * 800 / (h * 1815)) + 1;
    const svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('viewBox', `0 0 ${bars * 1815 - 40} 800`);
    band.live = [];
    for (let b = 0; b < bars; b++) for (const [k, x, c] of BAR) {
      let n;
      if (k === 'v') { n = document.createElementNS(NS, 'rect'); n.setAttribute('x', b * 1815 + x); n.setAttribute('y', 0); n.setAttribute('width', 100); n.setAttribute('height', 800); n.setAttribute('rx', 50); }
      else { n = document.createElementNS(NS, 'path'); n.setAttribute('d', k === 'b' ? D_BACK : D_FWD); n.setAttribute('transform', `translate(${b * 1815 + x} 0)`); }
      n.setAttribute('fill', FILL[c]);
      if (c === 'p') { n.style.transformBox = 'fill-box'; n.style.transformOrigin = '50% 100%'; band.live.push(n); }
      svg.appendChild(n);
    }
    band.el.replaceChildren(svg);
    band.prm = band.live.map(() => [1.8 + Math.random() * 2.6, 3.1 + Math.random() * 3.4, Math.random() * 6.28, Math.random() * 6.28]);
  };
  bands.forEach(drawBand);
  let rz, lastW = innerWidth; addEventListener('resize', () => { if (innerWidth === lastW) return; lastW = innerWidth; clearTimeout(rz); rz = setTimeout(() => bands.forEach(drawBand), 200); });
  if ('IntersectionObserver' in window) bands.forEach(band => new IntersectionObserver(([en]) => { band.on = en.isIntersecting; }).observe(band.el));
  let lastT = 0;
  const meter = t => { if (t - lastT < 1 / 30) return; lastT = t; bands.forEach(band => {
    if (!band.on) return;
    band.live.forEach((nd, i) => {
      const [f1, f2, p1, p2] = band.prm[i];
      const v = Math.max(.3, Math.min(1, (.78 + .22 * Math.sin(t * 1.6 - i * .6)) * (.3 + .7 * Math.abs(.6 * Math.sin(t * f1 + p1) + .4 * Math.sin(t * f2 + p2)))));
      nd.style.transform = `scaleY(${v.toFixed(2)})`;
    });
  }); };

  /* phone dock + header button: after the hero's button scrolls away */
  const heroBtn = $('.hero .btn-door');
  const dock = $('[data-dock]');
  const topCta = $('.top-cta');
  if (heroBtn && 'IntersectionObserver' in window) {
    const dockLinks = $$('a', dock);
    let past = false, atForm = false;
    const paint = () => {
      const show = past && !atForm;
      dock.classList.toggle('show', show);
      dock.setAttribute('aria-hidden', String(!show));
      dockLinks.forEach(a => { a.tabIndex = show ? 0 : -1; });
      topCta.classList.toggle('show', past);
    };
    new IntersectionObserver(([en]) => { past = !en.isIntersecting && en.boundingClientRect.top < 0; paint(); }).observe(heroBtn);
    new IntersectionObserver(([en]) => { atForm = en.isIntersecting; paint(); }).observe($('#pitch'));
  }

  /* which sections get read */
  if ('IntersectionObserver' in window) {
    const seen = new Set();
    const io = new IntersectionObserver(ens => ens.forEach(en => {
      if (en.isIntersecting && !seen.has(en.target.id)) { seen.add(en.target.id); track('pro_section_view', { section_id: en.target.id }); }
    }), { threshold: .3 });
    $$('main > section[id]').forEach(s => io.observe(s));
  }

  /* hero thoughts without GSAP: the dashboard simply stays answered */
  /* the pile of tool windows is drawn at a fixed size and scaled to fit the browser frame */
  const view = $('[data-view]');
  if (view) {
    const fit = () => {
      // fit both the width and the height of the screen, so the whole browser and its caption are visible at once
      const cs = getComputedStyle(view), W = +cs.getPropertyValue('--W'), H = +cs.getPropertyValue('--H');
      const box = view.closest('.brw'), room = box.parentElement.clientWidth;
      const s = Math.min(1, (room - 26) / W, (innerHeight - (innerWidth < 560 ? 360 : 300)) / H);
      view.style.setProperty('--s', s.toFixed(4));
      box.style.maxWidth = Math.round(W * s + 26) + 'px';
    };
    fit();
    addEventListener('resize', fit);
  }

  if (reduce || !window.gsap || !window.ScrollTrigger) {
    if (!reduce) { const raf = t => { meter(t / 1000); requestAnimationFrame(raf); }; requestAnimationFrame(raf); }
    return;
  }

  /* =========================================================
     Motion
     ========================================================= */
  gsap.registerPlugin(ScrollTrigger, ...(window.SplitText ? [SplitText] : []));
  ScrollTrigger.config({ ignoreMobileResize: true });

  // Ties a paused animation to scroll, forward only: it follows the scroll down,
  // and when the reader scrolls back up it stays where it got to instead of rewinding.
  const oneWay = (anim, st) => {
    let max = 0;
    anim.pause();
    return ScrollTrigger.create({
      ...st,
      onUpdate: self => {
        if (self.progress <= max) return;
        max = self.progress;
        gsap.to(anim, { progress: max, duration: .5, ease: 'power1.out', overwrite: true });
      },
      onRefresh: () => { anim.progress(0).invalidate().progress(max); }
    });
  };
  document.documentElement.classList.add('motion');

  if (window.Lenis) {
    const lenis = new Lenis({ lerp: .12 });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add(t => lenis.raf(t * 1000));
    gsap.ticker.lagSmoothing(0);
    $$('a[href^="#"]').forEach(a => a.addEventListener('click', e => {
      const t = a.getAttribute('href');
      if (t.length < 2 || !$(t)) return;
      e.preventDefault();
      lenis.scrollTo(t, { offset: -76 });
    }));
  }
  gsap.ticker.add(t => meter(t));

  /* ---------- Hero: the night lands on both sides, the creator's questions get answered ---------- */
  const hero = $('#hero');
  const spots = $$('.dash-shot .spot');
  const thoughts = $$('[data-thoughts] li');
  gsap.set(thoughts, { autoAlpha: 0 });
  gsap.set(['.hero-copy > *', '.dash', '.poster'], { autoAlpha: 0 });

  const heroIn = () => {
    gsap.set(['.hero-copy > *', '.dash', '.poster'], { autoAlpha: 1 });
    const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });
    const h1 = $('#hero-h');
    if (window.SplitText) {
      let first = true;
      SplitText.create(h1, { type: 'lines', mask: 'lines', autoSplit: true, onSplit: self => {
        if (!first) return;
        first = false;
        return gsap.from(self.lines, { yPercent: 105, rotate: 3, transformOrigin: '0 100%', duration: 1.1, stagger: .1, delay: .1, ease: 'power3.out' });
      } });
    }
    tl.from('.hero-copy .label', { y: 12, autoAlpha: 0, duration: .7 }, 0)
      .from('.hero-lead', { y: 18, autoAlpha: 0, duration: .9 }, .45)
      .from('.hero-act > *', { y: 18, autoAlpha: 0, duration: .9, stagger: .1, ease: 'back.out(1.8)' }, .6)
      .from('.alt-line', { autoAlpha: 0, duration: .8 }, .9)
      .from('.dash', { y: 60, rotateX: 12, transformPerspective: 1200, transformOrigin: '50% 100%', autoAlpha: 0, duration: 1.2, clearProps: 'transform' }, .2)
      .from('.poster', { y: -90, x: 40, rotation: 14, autoAlpha: 0, duration: 1.2, ease: 'power4.out', clearProps: 'transform' }, .5);
    // four thoughts, about 2.4 s; each one lights up its answer on the dashboard
    const t0 = 1.6;
    thoughts.forEach((b, i) => {
      const at = t0 + i * .6;
      tl.fromTo(b, { autoAlpha: 0, scale: .5, y: 10, transformOrigin: '100% 100%' }, { autoAlpha: 1, scale: 1, y: 0, duration: .4, ease: 'back.out(2.4)' }, at)
        .fromTo(spots[i] || {}, { autoAlpha: 0, scale: 1.15 }, { autoAlpha: 1, scale: 1, duration: .45, ease: 'power3.out' }, at + .15)
    });
    tl.to(thoughts, { autoAlpha: 0, y: -14, duration: .5, stagger: .06, ease: 'power2.in' }, t0 + thoughts.length * .6 + .9)
      .to(spots, { autoAlpha: 0, duration: .6, stagger: .06 }, '<');
  };
  (document.fonts ? Promise.race([document.fonts.ready, new Promise(r => setTimeout(r, 600))]) : Promise.resolve()).then(heroIn);

  gsap.to('.hero-visual', { y: -50, ease: 'none', scrollTrigger: { trigger: hero, start: 'top top', end: 'bottom top', scrub: true } });
  gsap.to('.poster-card', { yPercent: -14, ease: 'none', scrollTrigger: { trigger: hero, start: 'top top', end: 'bottom top', scrub: true } });

  // the two sides lean toward the pointer
  const sides = $('.sides');
  if (matchMedia('(hover: hover)').matches && sides) {
    const rx = gsap.quickTo(sides, 'rotationY', { duration: .8, ease: 'power3' });
    const ry = gsap.quickTo(sides, 'rotationX', { duration: .8, ease: 'power3' });
    gsap.set(sides, { transformPerspective: 1400 });
    let r = null;
    hero.addEventListener('pointerenter', () => { r = hero.getBoundingClientRect(); });
    addEventListener('scroll', () => { r = null; }, { passive: true });
    hero.addEventListener('pointermove', e => {
      if (!r) r = hero.getBoundingClientRect();
      rx(((e.clientX - r.left) / r.width - .5) * 7);
      ry(-((e.clientY - r.top) / r.height - .5) * 5);
    });
    hero.addEventListener('pointerleave', () => { rx(0); ry(0); });
  }

  /* ---------- section titles and leads ---------- */
  document.fonts?.ready.then(() => {
    if (window.SplitText) $$('.sec .t-h1, .earn-h, .final-h, .band-h').forEach(el => {
      let played = false;
      SplitText.create(el, { type: 'lines', mask: 'lines', autoSplit: true, onSplit: self => {
        if (played) return;
        return gsap.from(self.lines, { yPercent: 110, rotate: 2, transformOrigin: '0 100%', duration: 1.1, stagger: .08, scrollTrigger: { trigger: el, start: 'top 95%', once: true, onEnter: () => { played = true; } } });
      } });
    });
    ScrollTrigger.refresh();
  });
  $$('.sec-top .lead, .sec-title .label, .col-head > .label, .col-head > .cap, .insight-foot > *, .sec-foot > *').forEach(el => {
    gsap.from(el, { y: 20, opacity: 0, duration: 1, scrollTrigger: { trigger: el, start: 'top 98%' } });
  });

  /* ---------- Six browser tabs: their windows pile up as you scroll, then get swept away and IMIN stays, forward only ---------- */
  const brw = $('[data-brw]');
  if (brw) {
    const tabs = $$('.bt:not(.bt-imin)', brw);
    const imin = $('.bt-imin', brw);
    const wins = $$('.cw', brw);
    const iminView = $('.bv-imin', brw);
    const url = $('[data-url]', $('.brw-url', brw));
    const count = $('[data-count]', brw);
    let shown = -1;
    const show = i => {
      if (i === shown) return;
      shown = i;
      const tab = i < 6 ? tabs[i] : imin;
      [...tabs, imin].forEach(t => t.classList.toggle('is-on', t === tab));
      iminView.classList.toggle('is-on', i === 6);
      url.innerHTML = tab.dataset.url;
    };
    gsap.set(imin, { display: 'flex', maxWidth: 0, paddingLeft: 0, paddingRight: 0, opacity: 0 });
    const pile = gsap.timeline({
      paused: true,
      onUpdate: () => {
        const t = pile.time();
        show(t >= 6.6 ? 6 : Math.min(5, Math.floor(t + .35)));
        count.textContent = t >= 6.6 ? '1 tab for the whole night' : '6 tabs for one night';
      }
    });
    wins.slice(1).forEach((w, i) => pile.fromTo(w, { y: 90, scale: .9, opacity: 0, rotation: 4 }, { y: 0, scale: 1, opacity: 1, rotation: 0, duration: .55, ease: 'back.out(1.4)' }, i + .65));
    pile.to(wins, { y: 140, scale: .55, opacity: 0, duration: .5, ease: 'power2.in', stagger: { each: .05, from: 'end' } }, 6)
      .to(tabs, { maxWidth: 0, paddingLeft: 0, paddingRight: 0, opacity: 0, duration: .4, ease: 'power2.in', stagger: { each: .06, from: 'end' } }, 6)
      .to(imin, { maxWidth: 260, paddingLeft: 12, paddingRight: 12, opacity: 1, duration: .45, ease: 'power3.out' }, 6.5)
      .to({}, { duration: .5 });
    oneWay(pile, { trigger: brw, start: 'center 54%', end: () => '+=' + Math.round(innerHeight * 1.8), pin: true, anticipatePin: 1 });
    gsap.from('.brw', { y: 60, opacity: 0, duration: 1.1, ease: 'power4.out', scrollTrigger: { trigger: brw, start: 'top 92%' } });
  }

  /* ---------- people ---------- */
  [['.band img', '.band'], ['.imx-media img', '.imx']].forEach(([sel, trig]) => {
    const img = $(sel);
    if (!img) return;
    const zoom = gsap.fromTo(img, { scale: 1.12, opacity: 0 }, { scale: 1, opacity: 1, duration: 1.4, ease: 'power3.out', paused: true });
    ScrollTrigger.create({ trigger: trig, start: 'top 95%', once: true, onEnter: () => ready(img).then(() => zoom.play()) });
  });

  /* ---------- Steps: each card settles, the one behind steps back ---------- */
  const mm = gsap.matchMedia();
  const steps = $$('.step');
  mm.add('(min-width: 960px)', () => {
    steps.forEach((s, i) => {
      const next = steps[i + 1];
      if (!next) return;
      oneWay(gsap.to(s, { scale: .95, ease: 'none', paused: true }), { trigger: next, start: 'top bottom', end: 'top 30%' });
    });
  });
  steps.forEach(s => {
    gsap.from($$('.step-text > *', s), { y: 24, opacity: 0, duration: .9, stagger: .08, scrollTrigger: { trigger: s, start: 'top 92%' } });
    const mock = $('.mock', s);
    const reveal = gsap.from(mock, { y: 40, opacity: 0, duration: 1, ease: 'expo.out', paused: true });
    ScrollTrigger.create({ trigger: s, start: 'top 92%', once: true, onEnter: () => ready($('img', mock)).then(() => reveal.play()) });
  });

  /* ---------- Why ---------- */
  gsap.from('.reasons li', { y: 30, opacity: 0, duration: .9, stagger: .1, ease: 'expo.out', scrollTrigger: { trigger: '.reasons', start: 'top 92%' } });
  gsap.from('.faces-row img', { scale: .5, opacity: 0, duration: .8, stagger: .12, ease: 'back.out(2)', scrollTrigger: { trigger: '.faces', start: 'top 97%' } });

  /* ---------- Earn: the numbers land ---------- */
  const earn = $('#earn');
  if (earn) {
    $$('.fig', earn).forEach((f, i) => {
      const n = $('.fig-n', f);
      n.innerHTML = `<span style="display:inline-block">${n.textContent}</span>`;
      f.style.overflow = 'hidden';
      gsap.from($('span', n), { yPercent: 110, duration: 1, ease: 'power4.out', delay: i * .12, scrollTrigger: { trigger: '.figs', start: 'top 94%' } });
      gsap.from($('p', f), { y: 16, opacity: 0, duration: .8, delay: .3 + i * .12, scrollTrigger: { trigger: '.figs', start: 'top 94%' } });
    });
    gsap.from('.calc', { y: 30, opacity: 0, duration: 1, scrollTrigger: { trigger: '.calc', start: 'top 97%' } });
  }

  /* ---------- What you can create ---------- */
  gsap.from('.kind', { y: 40, opacity: 0, duration: 1, ease: 'expo.out', stagger: .07, scrollTrigger: { trigger: '.kinds', start: 'top 94%' } });
  gsap.from(['.imx-lock > svg', '.imx-row'], { yPercent: 60, opacity: 0, duration: 1, ease: 'power4.out', stagger: .12, scrollTrigger: { trigger: '.imx', start: 'top 92%' } });

  /* ---------- How you start: the line runs from sign-up to the door ---------- */
  const road = $('[data-road]');
  if (road) {
    oneWay(gsap.fromTo(road, { '--road': 0 }, { '--road': 1, ease: 'none', paused: true }), { trigger: road, start: 'top 92%', end: 'bottom 55%' });
    gsap.from($$('li', road), { y: 30, opacity: 0, duration: .9, stagger: .12, scrollTrigger: { trigger: road, start: 'top 92%' } });
    gsap.from('.code i', { y: -10, opacity: 0, duration: .4, stagger: .07, ease: 'back.out(2)', scrollTrigger: { trigger: '.code', start: 'top 98%' } });
  }

  /* ---------- FAQ + final ---------- */
  gsap.from('.acc details', { y: 16, opacity: 0, duration: .7, stagger: .05, scrollTrigger: { trigger: '.acc', start: 'top 94%' } });
  gsap.fromTo('.final-photo img', { yPercent: -8, scale: 1.1 }, { yPercent: 4, scale: 1, ease: 'none', scrollTrigger: { trigger: '.final', start: 'top bottom', end: 'bottom top', scrub: true } });
  gsap.from('.final .btn-door', { scale: .9, y: 16, duration: .9, ease: 'back.out(2)', scrollTrigger: { trigger: '.final', start: 'top 85%' } });
  gsap.from('.way', { y: 36, opacity: 0, duration: 1, ease: 'expo.out', stagger: .1, scrollTrigger: { trigger: '.ways', start: 'top 95%' } });
  gsap.from('.foot-cols > div', { y: 24, opacity: 0, duration: .8, stagger: .06, scrollTrigger: { trigger: '.foot-cols', start: 'top 98%' } });

  /* keep trigger positions right: page order first, then again once everything has loaded */
  ScrollTrigger.sort();
  ScrollTrigger.refresh();
  addEventListener('load', () => { ScrollTrigger.sort(); ScrollTrigger.refresh(); }, { once: true });
})();
