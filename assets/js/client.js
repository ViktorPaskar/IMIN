
(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const wait = ms => new Promise(res => setTimeout(res, reduce ? 0 : ms));
  const two = n => String(n).padStart(2, '0');
  const now = () => { const d = new Date(); return two(d.getHours()) + ':' + two(d.getMinutes()); };
  const paintClock = () => $$('[data-clock]').forEach(el => { el.textContent = now(); });
  paintClock();
  setInterval(paintClock, 20000);

  const top = $('.top');
  const onScroll = () => top.classList.toggle('scrolled', window.scrollY > 8);
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
  document.addEventListener('click', e => {
    $$('details.lang[open]').forEach(d => { if (!d.contains(e.target)) d.open = false; });
  });

  const DOTS = '<span class="dots" aria-hidden="true"><i></i><i></i><i></i></span>';
  const go = (el, block) => el.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: block || 'start' });
  const add = (parent, cls, html, before) => {
    const li = document.createElement(parent.tagName === 'OL' || parent.tagName === 'UL' ? 'li' : 'div');
    li.className = cls + ' gen';
    li.innerHTML = html;
    parent.insertBefore(li, before || null);
    return li;
  };
  /* ---------------------------------------------------------
     Loading screen: a short chat, then the night.
     Tap to skip; off with reduced motion.
     --------------------------------------------------------- */
  const introEl = $('[data-intro]');
  const intro = (() => {
    if (!introEl) return Promise.resolve();
    if (reduce) { introEl.classList.add('gone'); return Promise.resolve(); }
    const root = document.documentElement;
    root.classList.add('intro-lock');
    const thread = $('[data-intro-thread]', introEl);
    const load = v => introEl.style.setProperty('--load', v);
    let skip;
    const skipped = new Promise(res => { skip = res; });
    introEl.addEventListener('click', () => skip(), { once: true });
    addEventListener('keydown', () => skip(), { once: true });
    const pause = ms => Promise.race([wait(ms), skipped]);
    const say = async (cls, text, typing) => {
      if (typing) {
        const t = add(thread, 'b in typing', DOTS);
        await pause(typing);
        t.remove();
      }
      add(thread, cls, '<p>' + text + '</p>');
    };
    const pageLoaded = document.readyState === 'complete' ? Promise.resolve() : new Promise(r => addEventListener('load', r, { once: true }));
    const chat = (async () => {
      await pause(350);  load(.2);
      await say('b out', 'should I go out tonight?');
      await pause(250);  load(.4);
      await say('b in', 'Don’t overthink it.', 750);
      load(.6);
      await say('b in', 'Music first. Come as you are.', 450);
      await pause(450);  load(.85);
      await say('b out yes', 'I’m in');
      await pause(550);
    })();
    return Promise.race([Promise.all([chat, pageLoaded]), skipped.then(() => pageLoaded)]).then(() => {
      load(1);
      introEl.classList.add('out');
      root.classList.remove('intro-lock');
      setTimeout(() => introEl.classList.add('gone'), 950);
      return wait(250);
    });
  })();

  const iminSays = async (parent, text) => {
    const t = add(parent, 'b in typing', DOTS);
    t.setAttribute('aria-label', 'IMIN is typing');
    await wait(1000);
    t.remove();
    add(parent, 'b in', '<p>' + text + '</p>');
  };

  /* hero: the night's poster and IMIN's message */
  const notif = $('[data-notif]');
  const btnIn = $('[data-reply="in"]');

  /* I'M IN answers IMIN's message */
  btnIn.addEventListener('click', () => {
    if (btnIn.classList.contains('sent')) return;
    const reply = document.createElement('div');
    reply.className = 'b out yes gen';
    reply.innerHTML = '<p>I’m in</p>';
    notif.appendChild(reply);
    btnIn.classList.add('sent');
    btnIn.setAttribute('aria-pressed', 'true');
    btnIn.innerHTML = '<svg class="ico" aria-hidden="true"><use href="#i-check"/></svg>I’m in';
  });

  /* FAQ: one answer at a time */
  const chips = $$('.chip[role="tab"]');
  const select = chip => {
    chips.forEach(c => {
      const on = c === chip;
      c.setAttribute('aria-selected', String(on));
      c.tabIndex = on ? 0 : -1;
      const p = $('#' + c.getAttribute('aria-controls'));
      p.hidden = !on;
      if (on) typeIn(p);
    });
  };
  const typeIn = async p => {
    const a = $('.b.in', p);
    const q = $('.b.out', p);
    if (q) { q.classList.remove('gen'); void q.offsetWidth; q.classList.add('gen'); }
    a.hidden = true;
    const t = document.createElement('div');
    t.className = 'b in typing gen';
    t.innerHTML = DOTS;
    p.appendChild(t);
    await wait(700);
    t.remove();
    a.hidden = false;
  };
  chips.forEach((c, i) => {
    c.addEventListener('click', () => select(c));
    c.addEventListener('keydown', e => {
      const k = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
      if (!k) return;
      e.preventDefault();
      const n = chips[(i + k + chips.length) % chips.length];
      n.focus();
      select(n);
    });
  });

  /* setlist player */
  const player = $('[data-player]');
  if (player) {
    const rows = $$('.np-list > li', player);
    const trk = $('.np-scrub .trk', player);
    let at = 0;
    const play = () => {
      rows.forEach((r, i) => r.classList.toggle('on', i === at));
      trk.style.setProperty('--p', String((at + 1) / rows.length));
      at = (at + 1) % rows.length;
    };
    play();
    if (!reduce) {
      let timer = null;
      new IntersectionObserver(([en]) => {
        clearInterval(timer);
        if (en.isIntersecting) timer = setInterval(play, 2600);
      }).observe(player);
    }
  }

  /* email */
  const form = $('#mail-form');
  const done = $('[data-mail-done]');
  const err = $('[data-mail-err]');
  form.addEventListener('submit', async e => {
    e.preventDefault();
    err.hidden = true;
    const field = form.elements.email;
    if (!field.checkValidity()) { field.reportValidity(); return; }
    if (form.elements.company.value) return;
    if (!form.elements.ok.checked) {
      err.textContent = 'Switch on “Send me IMIN news” first.';
      err.hidden = false;
      return;
    }
    done.replaceChildren();
    const bubble = add(done, 'b out', '<p></p>');
    bubble.firstChild.textContent = field.value.trim();
    form.reset();
    await iminSays(done, 'You’re on the list. See you soon.');
  });

  /* phone: sticky bar after the hero's buttons scroll away */
  const dock = $('[data-dock]');
  if (dock && 'IntersectionObserver' in window) {
    const links = $$('a', dock);
    new IntersectionObserver(([entry]) => {
      const show = !entry.isIntersecting && entry.boundingClientRect.top < 0;
      dock.classList.toggle('show', show);
      dock.setAttribute('aria-hidden', String(!show));
      links.forEach(a => { a.tabIndex = show ? 0 : -1; });
    }).observe(btnIn);
  }
  $('[data-dock-go]').addEventListener('click', e => {
    e.preventDefault();
    go($('#hero'));
    setTimeout(() => btnIn.click(), reduce ? 0 : 600);
  });


  /* links from config */
  const L = (window.IMIN && window.IMIN.links) || {};
  $$('[data-link]').forEach(a => {
    const u = L[a.dataset.link];
    if (u) a.href = u;
    else if (a.classList.contains('tile2')) {
      // no link yet: the tile stays, marked as coming soon
      a.removeAttribute('href');
      a.classList.add('is-soon');
      $('.text-link', a).textContent = 'Coming soon';
    }
  });

  /* ---------------------------------------------------------
     The beat: the brand pattern, I Paper · M Haze · N Doorlight.
     Drawn once; only the Paper sticks move, like a level meter.
     --------------------------------------------------------- */
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
  let rz; addEventListener('resize', () => { clearTimeout(rz); rz = setTimeout(() => bands.forEach(drawBand), 200); });
  if ('IntersectionObserver' in window) bands.forEach(band => new IntersectionObserver(([en]) => { band.on = en.isIntersecting; }).observe(band.el));
  const meter = t => bands.forEach(band => {
    if (!band.on) return;
    band.live.forEach((nd, i) => {
      const [f1, f2, p1, p2] = band.prm[i];
      const v = Math.max(.3, Math.min(1, (.78 + .22 * Math.sin(t * 1.6 - i * .6)) * (.3 + .7 * Math.abs(.6 * Math.sin(t * f1 + p1) + .4 * Math.sin(t * f2 + p2)))));
      nd.style.transform = `scaleY(${v.toFixed(3)})`;
    });
  });

  if (reduce || !window.gsap || !window.ScrollTrigger) return;
  gsap.registerPlugin(ScrollTrigger, ...(window.SplitText ? [SplitText] : []));
  document.documentElement.classList.add('motion');

  /* smooth scroll */
  if (window.Lenis) {
    const lenis = new Lenis({ lerp: .12 });
    if (introEl && !introEl.classList.contains('gone')) { lenis.stop(); intro.then(() => lenis.start()); }
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add(t => lenis.raf(t * 1000));
    gsap.ticker.lagSmoothing(0);
    $$('a[href^="#"]').forEach(a => a.addEventListener('click', e => {
      const t = a.getAttribute('href');
      if (t.length < 2 || !$(t)) return;
      e.preventDefault();
      lenis.scrollTo(t, { offset: -72 });
    }));
  }
  gsap.ticker.add(t => meter(t));

  /* ---------- Hero: the flyers land, IMIN texts, the phone buzzes ---------- */
  const hero = $('#hero');
  const notifBox = $('.notif', notif);
  notifBox.style.animation = 'none';
  $('.sticker').style.animation = 'none';
  gsap.set(['.hero-copy > *', '.flyer-back', '.poster', '.tape', '.sticker', notifBox], { autoAlpha: 0 });
  const heroIn = () => {
    const still = $$('.poster, .hero .btn-door');
    still.forEach(el => { el.style.transition = 'none'; });
    gsap.set(['.hero-copy > *', '.flyer-back', '.poster', '.tape', '.sticker', notifBox], { autoAlpha: 1 });
    const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });
    const h1 = $('#hero-h');
    if (window.SplitText) {
      const sp = SplitText.create(h1, { type: 'lines', mask: 'lines', linesClass: 'line' });
      tl.from(sp.lines, { yPercent: 105, rotate: 3, transformOrigin: '0 100%', duration: 1.1, stagger: .1 }, 0);
    }
    tl.from('.hero-lead', { y: 18, autoAlpha: 0, duration: .9 }, .35)
      .from('.hero .btn-door', { y: 18, autoAlpha: 0, scale: .94, duration: .9, ease: 'back.out(2)' }, .5)
      .from('.flyer-back', { x: 60, y: -40, rotate: 18, autoAlpha: 0, duration: 1.2, clearProps: 'transform' }, .15)
      .from('.poster', { y: -80, rotate: -9, autoAlpha: 0, duration: 1.2, ease: 'power4.out', clearProps: 'transform' }, .3)
      .from('.poster > img', { scale: 1.5, duration: 2.2, ease: 'power2.out', clearProps: 'transform' }, .3)
      .from('.p-top > *', { y: -16, autoAlpha: 0, duration: .7, stagger: .1 }, .8)
      .from('.p-title', { yPercent: 40, autoAlpha: 0, duration: .9 }, .9)
      .from('.p-meta', { autoAlpha: 0, duration: .6 }, 1.15)
      .from('.tape', { scaleX: 0, autoAlpha: 0, duration: .5, ease: 'power2.out' }, 1.1)
      .from('.sticker', { scale: 0, rotate: -120, duration: .9, ease: 'back.out(2.2)', clearProps: 'transform' }, 1.25)
      .from(notifBox, { y: -46, autoAlpha: 0, scale: .9, duration: .7, ease: 'back.out(1.8)' }, 1.7)
      .to(notifBox, { keyframes: { x: [0, -3, 3, -3, 3, -2, 2, 0], ease: 'none' }, duration: .5 }, 2.35)
      .to(notifBox, { keyframes: { x: [0, -3, 3, -3, 3, -2, 2, 0], ease: 'none' }, duration: .5 }, 3.1)
      .call(() => { $('.sticker').style.animation = ''; still.forEach(el => { el.style.transition = ''; }); }, null, 2.2);
  };
  Promise.all([intro, document.fonts ? Promise.race([document.fonts.ready, new Promise(r => setTimeout(r, 1500))]) : null]).then(heroIn);

  // parallax: the back flyer lags, the poster leads, the message floats off last
  gsap.to('.hero-visual', { y: -60, ease: 'none', scrollTrigger: { trigger: hero, start: 'top top', end: 'bottom top', scrub: true } });
  gsap.to(notif, { yPercent: -60, ease: 'none', scrollTrigger: { trigger: hero, start: 'top top', end: 'bottom top', scrub: true } });
  gsap.to('.hero-copy', { y: -40, opacity: .35, ease: 'none', scrollTrigger: { trigger: hero, start: 'center top', end: 'bottom top', scrub: true } });

  // the flyers lean toward the pointer
  const flyers = $('.flyers');
  if (matchMedia('(hover: hover)').matches) {
    const rx = gsap.quickTo(flyers, 'rotationY', { duration: .8, ease: 'power3' });
    const ry = gsap.quickTo(flyers, 'rotationX', { duration: .8, ease: 'power3' });
    gsap.set(flyers, { transformPerspective: 1200 });
    hero.addEventListener('pointermove', e => {
      const r = hero.getBoundingClientRect();
      rx(((e.clientX - r.left) / r.width - .5) * 8);
      ry(-((e.clientY - r.top) / r.height - .5) * 6);
    });
    hero.addEventListener('pointerleave', () => { rx(0); ry(0); });
  }

  /* ---------- Section titles ---------- */
  document.fonts?.ready.then(() => {
    if (window.SplitText) $$('.sec .t-h1, .room .t-display').forEach(el => {
      const sp = SplitText.create(el, { type: 'lines', mask: 'lines' });
      gsap.from(sp.lines, { yPercent: 110, rotate: 2, transformOrigin: '0 100%', duration: 1.1, stagger: .08, scrollTrigger: { trigger: el, start: 'top 86%' } });
    });
    ScrollTrigger.refresh();
  });
  $$('.sec-top .lead, .sec-top .label, .col-head .label, .col-head .lead, .col-head .cap').forEach(el => {
    gsap.from(el, { y: 20, opacity: 0, duration: 1, scrollTrigger: { trigger: el, start: 'top 90%' } });
  });

  /* ---------- The idea: each photo is a chat. Question out, IMIN types, answer in ---------- */
  $$('#idea .card').forEach((card, i) => {
    const img = $('img', card), q = $('.q', card), a = $('.a', card);
    gsap.fromTo(img, { yPercent: -6, scale: 1.14 }, { yPercent: 6, ease: 'none', scrollTrigger: { trigger: card, start: 'top bottom', end: 'bottom top', scrub: true } });
    const dots = document.createElement('span');
    dots.className = 'b in typing';
    dots.setAttribute('aria-hidden', 'true');
    dots.innerHTML = DOTS;
    card.appendChild(dots);
    gsap.set([q, a, dots], { opacity: 0 });
    gsap.timeline({ scrollTrigger: { trigger: '#idea .row', start: 'top 78%' }, delay: i * .25 })
      .from(card, { clipPath: 'inset(100% 0 0 0)', y: 40, duration: 1.1, ease: 'expo.out' })
      .fromTo(q, { opacity: 0, scale: .4, y: 10 }, { opacity: 1, scale: 1, y: 0, duration: .5, ease: 'back.out(2.4)' }, '-=.4')
      .fromTo(dots, { opacity: 0, scale: .5 }, { opacity: 1, scale: 1, duration: .3, ease: 'back.out(2)' }, '+=.2')
      .to(dots, { opacity: 0, scale: .6, duration: .2 }, '+=.9')
      .fromTo(a, { opacity: 0, scale: .4, y: 10 }, { opacity: 1, scale: 1, y: 0, duration: .5, ease: 'back.out(2.4)' }, '-=.05');
  });

  // Bohdan's words light up as you read
  const quote = $('.voice blockquote');
  if (quote) {
    quote.innerHTML = quote.textContent.split(/(\s+)/).map(w => /\s/.test(w) ? w : `<span class="w">${w}</span>`).join('');
    const ws = $$('.w', quote);
    gsap.from('.voice .face', { scale: .6, opacity: 0, duration: .8, ease: 'back.out(2)', scrollTrigger: { trigger: '.voice', start: 'top 88%' } });
    ScrollTrigger.create({
      trigger: quote, start: 'top 85%', end: 'bottom 50%', scrub: true,
      onUpdate: st => {
        const n = Math.round(st.progress * ws.length);
        ws.forEach((w, i) => w.classList.toggle('on', i < n));
        $('.voice').classList.toggle('talking', st.progress > 0 && st.progress < 1);
      }
    });
  }

  /* ---------- The nights: photos rise, 3PM / 1AM roll in ---------- */
  $$('#nights .card').forEach((card, i) => {
    const img = $('img', card);
    gsap.from(card, { y: 60, opacity: 0, rotate: i % 2 ? 1.5 : -1.5, duration: 1.2, ease: 'expo.out', delay: i * .12, scrollTrigger: { trigger: '#nights .row', start: 'top 82%' } });
    if (img) gsap.fromTo(img, { yPercent: -6, scale: 1.14 }, { yPercent: 6, ease: 'none', scrollTrigger: { trigger: card, start: 'top bottom', end: 'bottom top', scrub: true } });
    const big = $('.when b', card);
    if (big) {
      big.innerHTML = `<i>${big.textContent}</i>`;
      gsap.from($('i', big), { yPercent: 110, duration: 1, ease: 'power4.out', delay: .4 + i * .12, scrollTrigger: { trigger: '#nights .row', start: 'top 82%' } });
    }
  });
  gsap.from('.np-list li', { x: -16, opacity: 0, duration: .6, stagger: .08, scrollTrigger: { trigger: '.np', start: 'top 85%' } });

  /* ---------- FAQ: the chips arrive like a keyboard of questions ---------- */
  gsap.from('.chip', { y: 14, opacity: 0, scale: .9, duration: .5, ease: 'back.out(2)', stagger: .035, scrollTrigger: { trigger: '.chips', start: 'top 88%' } });
  gsap.from('#faq .answer:not([hidden]) .b', { scale: .5, opacity: 0, duration: .5, ease: 'back.out(2.4)', stagger: .35, scrollTrigger: { trigger: '.chips', start: 'top 70%' } });

  /* ---------- Stay close ---------- */
  gsap.from('.tile2', { y: 40, opacity: 0, duration: 1, ease: 'expo.out', stagger: .1, clearProps: 'transform,translate,rotate,scale', scrollTrigger: { trigger: '.tiles', start: 'top 86%' } });
  gsap.from('.stay-foot > *', { y: 24, opacity: 0, duration: .9, stagger: .1, scrollTrigger: { trigger: '.stay-foot', start: 'top 90%' } });

  /* ---------- The other side of the room: outline words assemble letter by letter ---------- */
  const room = $('.room');
  if (room) {
    $$('.room__bg span', room).forEach((w, i) => {
      w.innerHTML = [...w.textContent].map(c => `<i>${c}</i>`).join('');
      const ch = $$('i', w);
      gsap.fromTo(w, { xPercent: i ? 16 : -16 }, { xPercent: i ? -6 : 6, ease: 'none', scrollTrigger: { trigger: room, start: 'top bottom', end: 'bottom top', scrub: .8 } });
      gsap.fromTo(ch, { yPercent: i ? -70 : 70, rotate: i ? -8 : 8, opacity: 0 }, { yPercent: 0, rotate: 0, opacity: 1, ease: 'power3.out', stagger: .06, scrollTrigger: { trigger: room, start: 'top 90%', end: 'top 30%', scrub: .8 } });
      gsap.fromTo(ch, { '--fill': 0 }, { '--fill': 1, ease: 'none', stagger: .08, scrollTrigger: { trigger: room, start: 'top 40%', end: 'bottom 60%', scrub: .8 } });
    });
    gsap.timeline({ scrollTrigger: { trigger: room, start: 'top 70%' } })
      .from('.room__done', { y: 20, opacity: 0, duration: .8 })
      .from('.room__done .ico', { scale: 0, rotate: -45, duration: .6, ease: 'back.out(3)' }, '-=.3')
      .from('.room__next', { y: 20, opacity: 0, filter: 'blur(6px)', duration: .8, stagger: .2 }, '-=.2')
      .from('.room__text, .room__actions', { y: 24, opacity: 0, duration: .9, stagger: .12 }, '-=.6');
    gsap.from(room, { clipPath: 'inset(6% 3% 6% 3%)', ease: 'none', scrollTrigger: { trigger: room, start: 'top bottom', end: 'top 35%', scrub: true } });
  }

  /* ---------- Footer ---------- */
  gsap.from('.foot-cols > div', { y: 24, opacity: 0, duration: .8, stagger: .06, scrollTrigger: { trigger: '.foot-cols', start: 'top 92%' } });

})();
