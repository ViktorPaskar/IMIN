/* =========================================================
   IMIN — interactions & motion
   GSAP + ScrollTrigger + SplitText, Lenis smooth scroll
   ========================================================= */
(() => {
  'use strict';

  const root = document.documentElement;
  const body = document.body;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  const hasGSAP = typeof window.gsap !== 'undefined';
  if (reduced) root.classList.add('reduced');

  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));
  const SVGNS = 'http://www.w3.org/2000/svg';
  let lenis = null;
  let scrollToTarget = null;

  /* ---------------------------------------------------------
     THE BEAT — IMIN taken apart into the strokes of its letters.
     One bar: I | M (| \ / |) | I | N (| \ |)
     Every second row shifts by half a bar.
     One Doorlight stroke per crop.
     --------------------------------------------------------- */
  const BAR = ['v', 'v', 'b', 'f', 'v', 'v', 'v', 'b', 'v'];
  const SW = 17;          // stroke width
  const VP = 28;          // pitch of a vertical stroke
  const DP = 46;          // pitch of a diagonal stroke
  const SLANT = 28;       // horizontal travel of a diagonal
  const BAR_W = BAR.reduce((w, t) => w + (t === 'v' ? VP : DP), 0);

  function buildBeat(el, opts = {}) {
    const rows = opts.rows || +el.dataset.rows || 3;
    const light = opts.light ?? el.dataset.light === '1';
    const rowH = opts.rowH || 112;
    const gapY = opts.gapY || 16;
    const bars = opts.bars || Math.ceil(2400 / BAR_W) + 1;
    const width = bars * BAR_W;
    const height = rows * rowH + (rows - 1) * gapY;

    const svg = document.createElementNS(SVGNS, 'svg');
    svg.setAttribute('viewBox', `0 0 ${width - BAR_W} ${height}`);
    svg.setAttribute('preserveAspectRatio', opts.preserve || 'xMidYMax slice');
    svg.setAttribute('aria-hidden', 'true');

    const strokes = [];
    const rowsEls = [];
    for (let r = 0; r < rows; r++) {
      const g = document.createElementNS(SVGNS, 'g');
      g.setAttribute('class', 'row');
      const y = r * (rowH + gapY);
      let x = r % 2 ? -BAR_W / 2 : -BAR_W / 4;
      for (let b = 0; b < bars + 1; b++) {
        for (const t of BAR) {
          let node;
          if (t === 'v') {
            node = document.createElementNS(SVGNS, 'rect');
            node.setAttribute('x', x.toFixed(1));
            node.setAttribute('y', y);
            node.setAttribute('width', SW);
            node.setAttribute('height', rowH);
            x += VP;
          } else {
            node = document.createElementNS(SVGNS, 'polygon');
            const x0 = x, x1 = x + SLANT;
            const pts = t === 'b'
              ? [[x0, y], [x0 + SW, y], [x1 + SW, y + rowH], [x1, y + rowH]]   // "\"
              : [[x1, y], [x1 + SW, y], [x0 + SW, y + rowH], [x0, y + rowH]]; // "/"
            node.setAttribute('points', pts.map(p => p.map(n => n.toFixed(1)).join(',')).join(' '));
            x += DP;
          }
          node.setAttribute('class', 's');
          g.appendChild(node);
          strokes.push({ node, row: r, kind: t });
        }
      }
      svg.appendChild(g);
      rowsEls.push(g);
    }

    let lightNode = null;
    if (light) {
      // someone just said "I'm in" — a vertical stroke, roughly two-thirds across
      const r = Math.min(rows - 1, Math.floor(rows / 2) - (rows > 2 ? 1 : 0));
      const candidates = strokes.filter(s => s.row === Math.max(0, r) && s.kind === 'v');
      lightNode = candidates[Math.floor(candidates.length * .62)]?.node || null;
      lightNode?.classList.add('is-light');
    }

    el.innerHTML = '';
    el.appendChild(svg);
    return { svg, rows: rowsEls, strokes, lightNode };
  }

  const beats = new Map();
  $$('[data-beat]').forEach(el => beats.set(el, buildBeat(el)));

  // Poster & phone artwork: smaller crops of the same beat
  $$('.poster__beat').forEach((el, i) => {
    const b = buildBeat(el, { rows: 5, rowH: 112, light: true, bars: 4, preserve: 'xMidYMid slice' });
    if (i % 3 === 1) b.svg.style.transform = 'scaleX(-1)';
  });

  /* ---------------------------------------------------------
     Without GSAP (blocked CDN etc.) — keep a fully readable page
     --------------------------------------------------------- */
  if (!hasGSAP) {
    $('.loader')?.remove();
    $$('[data-reveal]').forEach(el => { el.style.opacity = 1; el.style.transform = 'none'; });
    $$('.idea__text').forEach(el => el.style.opacity = 1);
    initBasics();
    return;
  }

  const { gsap } = window;
  gsap.registerPlugin(ScrollTrigger, SplitText);
  gsap.defaults({ ease: 'expo.out', duration: 1.2 });

  /* ---------------------------------------------------------
     Smooth scroll
     --------------------------------------------------------- */
  if (!reduced && typeof window.Lenis !== 'undefined') {
    lenis = new Lenis({ lerp: 0.1, smoothWheel: true, wheelMultiplier: 1 });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add(t => lenis.raf(t * 1000));
    gsap.ticker.lagSmoothing(0);
  }

  scrollToTarget = (target) => {
    const el = typeof target === 'string' ? $(target) : target;
    if (!el) return;
    if (lenis) lenis.scrollTo(el, { offset: 0, duration: 1.6, easing: t => 1 - Math.pow(1 - t, 4) });
    else el.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth' });
  };

  initBasics();

  /* ---------------------------------------------------------
     Preloader → Hero intro
     --------------------------------------------------------- */
  const loader = $('.loader');
  const heroLines = $$('.hero__title .line > span');

  function heroIntro(delay = 0) {
    const tl = gsap.timeline({ delay });
    tl.from(heroLines, { yPercent: 110, rotate: 3, duration: 1.4, stagger: .09, ease: 'expo.out' })
      .from('.hero__eyebrow', { y: 20, opacity: 0, duration: 1 }, '<.2')
      .from('.hero__lead, .hero__actions > *', { y: 30, opacity: 0, stagger: .08, duration: 1.1 }, '<.15')
      .from('.hero__beat .row', { yPercent: 40, opacity: 0, stagger: .08, duration: 1.6 }, '<')
      .from('.hero__foot > *', { y: 16, opacity: 0, stagger: .06, duration: .9 }, '<.3')
      .from('.header__inner', { y: -30, opacity: 0, duration: 1 }, '<');
    return tl;
  }

  if (loader && !reduced) {
    body.classList.add('is-loading');
    lenis?.stop();
    const bar = buildBeat($('.loader__bar'), { rows: 1, bars: 1, light: false, preserve: 'xMidYMid meet' });
    bar.svg.setAttribute('viewBox', `0 0 ${BAR_W} 112`);
    bar.rows[0].setAttribute('transform', `translate(${BAR_W / 4} 0)`);
    const ss = bar.strokes.slice(0, BAR.length).map(s => s.node);
    bar.strokes.slice(BAR.length).forEach(s => s.node.remove());
    ss.forEach(n => n.style.fill = 'var(--paper)');
    const count = $('.loader__count');
    const c = { v: 0 };

    const tl = gsap.timeline({
      onComplete: () => {
        loader.remove();
        body.classList.remove('is-loading');
        lenis?.start();
        ScrollTrigger.refresh();
      }
    });
    tl.from(ss, { scaleY: 0, transformOrigin: '50% 100%', duration: .7, stagger: .055, ease: 'expo.out' })
      .to(c, { v: 100, duration: 1.1, ease: 'power2.inOut', onUpdate: () => { count.textContent = String(Math.round(c.v)).padStart(2, '0'); } }, 0)
      .to(ss[4], { fill: '#FF9E1B', duration: .25, ease: 'none' }, '-=.2')
      .to(ss, { scaleY: () => gsap.utils.random(.2, 1), transformOrigin: '50% 100%', duration: .18, repeat: 3, yoyo: true, stagger: .02, ease: 'sine.inOut' })
      .to(loader, { clipPath: 'inset(0 0 100% 0)', duration: 1.1, ease: 'expo.inOut' }, '+=.05')
      .add(heroIntro(), '-=.55');
  } else {
    loader?.remove();
  }

  /* ---------------------------------------------------------
     Hero: living beat (equalizer), scroll + pointer parallax
     --------------------------------------------------------- */
  const heroBeat = beats.get($('.hero__beat'));
  if (heroBeat && !reduced) {
    // equalizer pulse on a random subset of strokes
    const pool = heroBeat.strokes.filter(s => s.kind === 'v' && s.node !== heroBeat.lightNode).map(s => s.node);
    gsap.set(pool, { transformOrigin: '50% 100%' });
    const pulse = () => {
      const picks = gsap.utils.shuffle(pool.slice()).slice(0, 26);
      gsap.to(picks, {
        scaleY: () => gsap.utils.random(.35, 1),
        duration: .45, ease: 'sine.inOut', yoyo: true, repeat: 1,
        stagger: { each: .015, from: 'random' }
      });
    };
    gsap.delayedCall(.2, function loop() { pulse(); gsap.delayedCall(.9, loop); });

    // the Doorlight stroke breathes
    if (heroBeat.lightNode) gsap.to(heroBeat.lightNode, { opacity: .45, duration: 1.2, repeat: -1, yoyo: true, ease: 'sine.inOut' });

    // rows drift in opposite directions while scrolling
    heroBeat.rows.forEach((row, i) => {
      gsap.to(row, {
        x: (i % 2 ? 1 : -1) * (120 + i * 40),
        ease: 'none',
        scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true }
      });
    });
    gsap.to('.hero__beat', { yPercent: 18, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } });
  }

  if (!reduced) {
    gsap.to('.hero__inner', { yPercent: -18, opacity: .2, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } });
    gsap.to('.hero__glow', { yPercent: 40, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } });

    if (finePointer) {
      const glowX = gsap.quickTo('.hero__glow', 'x', { duration: 1.6, ease: 'power3.out' });
      const glowY = gsap.quickTo('.hero__glow', 'y', { duration: 1.6, ease: 'power3.out' });
      const titleX = gsap.quickTo('.hero__title', 'x', { duration: 1.2, ease: 'power3.out' });
      $('.hero').addEventListener('pointermove', e => {
        const nx = e.clientX / innerWidth - .5, ny = e.clientY / innerHeight - .5;
        glowX(nx * -160); glowY(ny * -120); titleX(nx * -14);
      });
    }
  }

  /* ---------------------------------------------------------
     Marquee: constant drift that reacts to scroll velocity
     --------------------------------------------------------- */
  const track = $('.marquee__track');
  if (track && !reduced) {
    const half = () => track.scrollWidth / 2;
    let x = 0, dir = -1, boost = 0;
    ScrollTrigger.create({
      trigger: '.marquee', start: 'top bottom', end: 'bottom top',
      onUpdate: self => { dir = self.direction === 1 ? -1 : 1; boost = Math.min(Math.abs(self.getVelocity()) / 220, 14); }
    });
    gsap.ticker.add((t, dt) => {
      boost *= .92;
      x += dir * (0.6 + boost) * (dt / 16.67);
      const h = half();
      if (x <= -h) x += h;
      if (x > 0) x -= h;
      track.style.transform = `translate3d(${x}px,0,0)`;
    });
  }

  /* ---------------------------------------------------------
     Split headlines — masked line reveals
     --------------------------------------------------------- */
  document.fonts?.ready.then(() => {
    $$('[data-split]').forEach(el => {
      if (reduced) return;
      const split = SplitText.create(el, { type: 'lines', mask: 'lines', linesClass: 'sl' });
      gsap.from(split.lines, {
        yPercent: 110, duration: 1.3, stagger: .1, ease: 'expo.out',
        scrollTrigger: { trigger: el, start: 'top 85%' }
      });
    });

    // Idea: words light up as you read
    const idea = $('.idea__text');
    if (idea) {
      const s = SplitText.create(idea, { type: 'words', wordsClass: 'w' });
      if (reduced) gsap.set(s.words, { opacity: 1 });
      else gsap.to(s.words, {
        opacity: 1, stagger: .1, ease: 'none',
        scrollTrigger: { trigger: idea, start: 'top 80%', end: 'bottom 45%', scrub: true }
      });
    }
    ScrollTrigger.refresh();
  });

  /* ---------------------------------------------------------
     Generic reveals
     --------------------------------------------------------- */
  if (!reduced) {
    ScrollTrigger.batch('[data-reveal]', {
      start: 'top 88%',
      onEnter: els => gsap.to(els, { opacity: 1, y: 0, duration: 1.2, stagger: .1, ease: 'expo.out', overwrite: true })
    });
  }

  /* ---------------------------------------------------------
     Problem: the two sides slide in from opposite edges + tilt
     --------------------------------------------------------- */
  if (!reduced) {
    gsap.from('.side--a', { xPercent: -14, opacity: 0, rotateY: 8, duration: 1.4, scrollTrigger: { trigger: '.sides', start: 'top 80%' } });
    gsap.from('.side--b', { xPercent: 14, opacity: 0, rotateY: -8, duration: 1.4, scrollTrigger: { trigger: '.sides', start: 'top 80%' } });
    gsap.from('.sides__vs span', { scale: 0, rotate: -90, duration: 1, ease: 'back.out(2)', scrollTrigger: { trigger: '.sides', start: 'top 70%' } });
    gsap.from('.side__list li', { y: 24, opacity: 0, stagger: .06, duration: 1, scrollTrigger: { trigger: '.sides', start: 'top 65%' } });

    if (finePointer) {
      $$('[data-tilt]').forEach(card => {
        const rx = gsap.quickTo(card, 'rotateX', { duration: .8, ease: 'power3.out' });
        const ry = gsap.quickTo(card, 'rotateY', { duration: .8, ease: 'power3.out' });
        card.addEventListener('pointermove', e => {
          const r = card.getBoundingClientRect();
          ry(((e.clientX - r.left) / r.width - .5) * 8);
          rx(((e.clientY - r.top) / r.height - .5) * -8);
        });
        card.addEventListener('pointerleave', () => { rx(0); ry(0); });
      });
    }
  }

  /* ---------------------------------------------------------
     Product: pinned horizontal scroll (desktop), stack (mobile)
     --------------------------------------------------------- */
  const mm = gsap.matchMedia();
  const hTrack = $('.hscroll__track');

  mm.add({ desktop: '(min-width: 821px)', mobile: '(max-width: 820px)', reduced: '(prefers-reduced-motion: reduce)' }, ctx => {
    const { desktop, reduced: rm } = ctx.conditions;
    const feats = $$('.feat');

    if (desktop && !rm && hTrack) {
      const distance = () => Math.max(0, hTrack.scrollWidth - innerWidth);
      const tween = gsap.to(hTrack, {
        x: () => -distance(), ease: 'none',
        scrollTrigger: {
          trigger: '.hscroll', start: () => `top ${Math.max(0, (innerHeight - hTrack.offsetHeight) / 2) + 20}`,
          end: () => `+=${distance()}`, pin: true, scrub: 1, invalidateOnRefresh: true, anticipatePin: 1,
          onUpdate: self => gsap.set('.hscroll__progress span', { scaleX: self.progress })
        }
      });
      feats.forEach(f => setupFeature(f, { containerAnimation: tween, trigger: f, start: 'left 75%' }));
    } else {
      feats.forEach(f => setupFeature(f, { trigger: f, start: 'top 75%' }));
    }
  });

  function setupFeature(f, st) {
    if (reduced) { finishFeature(f); return; }
    const tl = gsap.timeline({ scrollTrigger: { ...st, once: true } });
    tl.from(f.querySelectorAll('.feat__copy > *'), { y: 40, opacity: 0, stagger: .07, duration: 1 })
      .from(f.querySelector('.feat__visual'), { y: 60, opacity: 0, scale: .96, duration: 1.2 }, '<.1');

    // forecast lines draw
    const fc = f.querySelector('.forecast');
    if (fc) {
      const actual = fc.querySelector('.forecast__actual');
      const L = actual.getTotalLength();
      gsap.set(actual, { strokeDasharray: `${L} ${L}`, strokeDashoffset: L });
      tl.from(fc.querySelector('.forecast__target'), { opacity: 0, duration: .8 }, '<.3')
        .to(actual, { strokeDashoffset: 0, duration: 1.4, ease: 'power2.inOut' }, '<')
        .from(fc.querySelector('.forecast__dot'), { scale: 0, transformOrigin: '50% 50%', duration: .6, ease: 'back.out(3)' }, '-=.2')
        .from(fc.querySelector('.forecast__proj'), { opacity: 0, x: -20, duration: .8 }, '<')
        .from(f.querySelector('.card__alert'), { y: 20, opacity: 0, duration: .8 }, '<.2');
      gsap.to(fc.querySelector('.forecast__dot'), { scale: 1.5, transformOrigin: '50% 50%', repeat: -1, yoyo: true, duration: .8, ease: 'sine.inOut', delay: 3 });
    }

    // counters + bars
    f.querySelectorAll('[data-count]').forEach(n => {
      const end = +n.dataset.count, o = { v: 0 }, sep = n.hasAttribute('data-sep');
      tl.to(o, { v: end, duration: 1.8, ease: 'power3.out', onUpdate: () => { const v = Math.round(o.v); n.textContent = sep ? v.toLocaleString('en-US') : v; } }, '<');
    });
    const bars = f.querySelectorAll('.bars span');
    if (bars.length) tl.from(bars, { scaleY: 0, stagger: .05, duration: 1, ease: 'expo.out' }, '<.1');

    // channels toggle on, one by one
    const toggles = f.querySelectorAll('.toggle');
    if (toggles.length) {
      toggles.forEach(t => t.classList.remove('on'));
      tl.from(f.querySelectorAll('.channel'), { x: 30, opacity: 0, stagger: .1, duration: .9 }, '<.2');
      toggles.forEach((t, i) => tl.call(() => t.classList.add('on'), null, `<${i ? .18 : .3}`));
    }

    // poster studio
    const studio = f.querySelector('.studio');
    if (studio) {
      tl.call(() => typePrompt(studio.querySelector('.studio__typed')), null, '<.2')
        .from(studio.querySelectorAll('.poster'), { y: 60, opacity: 0, rotate: i => (i - 1) * 4, stagger: .12, duration: 1.2, ease: 'expo.out' }, '+=1.2');
    }

    // owner block
    const owner = f.querySelector('.owner__big');
    if (owner) {
      tl.from(owner, { y: 50, opacity: 0, duration: 1.2 }, '<.1');
    }
  }

  function finishFeature(f) {
    f.querySelectorAll('[data-count]').forEach(n => { const v = +n.dataset.count; n.textContent = n.hasAttribute('data-sep') ? v.toLocaleString('en-US') : v; });
    const t = f.querySelector('.studio__typed');
    if (t) t.textContent = t.dataset.typed;
  }

  function typePrompt(el) {
    if (!el || el.dataset.done) return;
    el.dataset.done = '1';
    const text = el.dataset.typed;
    const o = { n: 0 };
    gsap.to(o, { n: text.length, duration: text.length * .035, ease: 'none', onUpdate: () => { el.textContent = text.slice(0, Math.round(o.n)); } });
  }

  // Vibe chips → re-render posters
  const posters = $('.posters');
  $$('.vibe').forEach(btn => btn.addEventListener('click', () => {
    $$('.vibe').forEach(b => b.classList.toggle('is-active', b === btn));
    if (!posters) return;
    if (reduced) { posters.dataset.vibeCurrent = btn.dataset.vibe; return; }
    gsap.timeline()
      .to(posters.children, { y: -14, opacity: 0, rotate: 0, stagger: .05, duration: .3, ease: 'power2.in' })
      .call(() => { posters.dataset.vibeCurrent = btn.dataset.vibe; })
      .to(posters.children, { y: 0, opacity: 1, stagger: .07, duration: .8, ease: 'expo.out' });
  }));

  /* ---------------------------------------------------------
     App: phone parallax (scroll + pointer)
     --------------------------------------------------------- */
  if (!reduced) {
    const stage = $('.app__stage');
    const layers = $$('[data-depth]', stage);
    layers.forEach(l => {
      const d = +l.dataset.depth;
      gsap.fromTo(l, { y: 120 * d }, { y: -120 * d, ease: 'none', scrollTrigger: { trigger: stage, start: 'top bottom', end: 'bottom top', scrub: true } });
    });
    gsap.from('.phone', { rotate: -6, y: 80, opacity: 0, duration: 1.6, scrollTrigger: { trigger: stage, start: 'top 75%' } });
    gsap.from('.float', { scale: .6, opacity: 0, stagger: .15, duration: 1.2, ease: 'back.out(1.6)', scrollTrigger: { trigger: stage, start: 'top 55%' } });
    gsap.from('.phone .ev', { y: 30, opacity: 0, stagger: .1, duration: 1, scrollTrigger: { trigger: stage, start: 'top 60%' } });
    gsap.from('.app__halo', { scale: .4, opacity: 0, duration: 2, scrollTrigger: { trigger: stage, start: 'top 70%' } });

    if (finePointer && stage) {
      const movers = layers.map(l => ({ d: +l.dataset.depth, x: gsap.quickTo(l, 'x', { duration: 1, ease: 'power3.out' }), r: gsap.quickTo(l, 'rotate', { duration: 1, ease: 'power3.out' }) }));
      stage.addEventListener('pointermove', e => {
        const r = stage.getBoundingClientRect();
        const nx = (e.clientX - r.left) / r.width - .5;
        movers.forEach(m => { m.x(nx * 60 * m.d); m.r(nx * 6 * m.d); });
      });
      stage.addEventListener('pointerleave', () => movers.forEach(m => { m.x(0); m.r(0); }));
    }
  }

  /* ---------------------------------------------------------
     Wedge (Ultra block): beat rows drift, clip reveal
     --------------------------------------------------------- */
  const wedgeBeat = beats.get($('.wedge__beat'));
  if (!reduced) {
    gsap.from('.wedge', { clipPath: 'inset(12% 6% 12% 6% round 8px)', ease: 'none', scrollTrigger: { trigger: '.wedge', start: 'top bottom', end: 'top 30%', scrub: true } });
    wedgeBeat?.rows.forEach((row, i) => {
      gsap.fromTo(row, { x: (i % 2 ? -1 : 1) * 160 }, { x: (i % 2 ? 1 : -1) * 160, ease: 'none', scrollTrigger: { trigger: '.wedge', start: 'top bottom', end: 'bottom top', scrub: true } });
    });
  }

  /* ---------------------------------------------------------
     Proof tiles — slight stagger parallax
     --------------------------------------------------------- */
  if (!reduced) {
    $$('.tile').forEach((t, i) => {
      gsap.to(t, { y: (i % 2 ? -1 : 1) * -24, ease: 'none', scrollTrigger: { trigger: '.proof__grid', start: 'top bottom', end: 'bottom top', scrub: true } });
    });
  }

  /* ---------------------------------------------------------
     Vision: route draws, stops appear
     --------------------------------------------------------- */
  const route = $('.route__draw');
  if (route) {
    const L = route.getTotalLength();
    gsap.set(route, { strokeDasharray: L, strokeDashoffset: reduced ? 0 : L });
    if (!reduced) {
      gsap.to(route, { strokeDashoffset: 0, ease: 'none', scrollTrigger: { trigger: '.route', start: 'top 80%', end: 'bottom 60%', scrub: true } });
      gsap.from('.stop', { y: 60, opacity: 0, stagger: .15, duration: 1.2, scrollTrigger: { trigger: '.route', start: 'top 75%' } });
      gsap.from('.stop__code', { yPercent: 40, stagger: .15, duration: 1.6, scrollTrigger: { trigger: '.route', start: 'top 75%' } });
    }
  }

  /* ---------------------------------------------------------
     Section color transitions: paper sections slide over
     --------------------------------------------------------- */
  if (!reduced) {
    $$('.paper').forEach(sec => {
      gsap.from(sec, { clipPath: 'inset(8% 4% 0% 4% round 12px)', ease: 'none', scrollTrigger: { trigger: sec, start: 'top bottom', end: 'top 40%', scrub: true } });
    });
    gsap.from('.avatar', { scale: .5, opacity: 0, rotate: -20, stagger: .12, duration: 1.2, ease: 'back.out(1.6)', scrollTrigger: { trigger: '.team__grid', start: 'top 80%' } });
  }

  /* ---------------------------------------------------------
     Apply + footer
     --------------------------------------------------------- */
  const applyBeat = beats.get($('.apply__beat'));
  if (!reduced && applyBeat) {
    applyBeat.rows.forEach((row, i) => gsap.fromTo(row, { x: (i % 2 ? 1 : -1) * 120 }, { x: 0, ease: 'none', scrollTrigger: { trigger: '.apply', start: 'top bottom', end: 'bottom bottom', scrub: true } }));
  }
  if (!reduced) {
    gsap.from('.footer__svg', { yPercent: 40, opacity: 0, duration: 1.6, scrollTrigger: { trigger: '.footer__mark', start: 'top 95%' } });
    gsap.from('.footer__word span', { yPercent: 100, opacity: 0, stagger: .12, duration: 1.6, scrollTrigger: { trigger: '.footer__mark', start: 'top 95%' } });
    gsap.from('.footer__claim', { y: 40, opacity: 0, duration: 1.2, scrollTrigger: { trigger: '.footer', start: 'top 85%' } });
  }

  /* ---------------------------------------------------------
     Scroll progress
     --------------------------------------------------------- */
  gsap.to('.progress span', { scaleX: 1, ease: 'none', scrollTrigger: { trigger: body, start: 'top top', end: 'bottom bottom', scrub: .3 } });

  /* ---------------------------------------------------------
     Header behaviour + active nav
     --------------------------------------------------------- */
  const header = $('.header');
  ScrollTrigger.create({
    start: 0, end: 'max',
    onUpdate: self => {
      const y = self.scroll();
      header.classList.toggle('is-scrolled', y > 40);
      if (!body.classList.contains('menu-open')) header.classList.toggle('is-hidden', self.direction === 1 && y > innerHeight * .6);
    }
  });
  $$('[data-nav]').forEach(a => {
    const sec = $(a.getAttribute('href'));
    if (!sec) return;
    ScrollTrigger.create({
      trigger: sec, start: 'top 50%', end: 'bottom 50%',
      onToggle: s => a.classList.toggle('is-active', s.isActive)
    });
  });

  /* ---------------------------------------------------------
     Cursor + magnetic buttons
     --------------------------------------------------------- */
  if (finePointer && !reduced) {
    const cursor = $('.cursor');
    const label = $('.cursor__label');
    const cx = gsap.quickTo(cursor, 'x', { duration: .35, ease: 'power3.out' });
    const cy = gsap.quickTo(cursor, 'y', { duration: .35, ease: 'power3.out' });
    addEventListener('pointermove', e => { cx(e.clientX); cy(e.clientY); cursor.classList.add('is-visible'); });
    document.addEventListener('pointerleave', () => cursor.classList.remove('is-visible'));

    $$('a, button, .vibe, label').forEach(el => {
      el.addEventListener('pointerenter', () => cursor.classList.add('is-hover'));
      el.addEventListener('pointerleave', () => cursor.classList.remove('is-hover'));
    });
    const labelled = [['.hscroll', 'Drag ↔'], ['.posters', 'Remix'], ['.app__stage', 'I’m in']];
    labelled.forEach(([sel, text]) => {
      const el = $(sel); if (!el) return;
      el.addEventListener('pointerenter', () => { label.textContent = text; cursor.classList.add('is-label'); });
      el.addEventListener('pointerleave', () => cursor.classList.remove('is-label'));
    });
    $('.posters')?.addEventListener('click', () => {
      const vibes = $$('.vibe');
      const i = vibes.findIndex(v => v.classList.contains('is-active'));
      vibes[(i + 1) % vibes.length].click();
    });

    $$('.magnetic').forEach(el => {
      const mx = gsap.quickTo(el, 'x', { duration: .6, ease: 'elastic.out(1, .4)' });
      const my = gsap.quickTo(el, 'y', { duration: .6, ease: 'elastic.out(1, .4)' });
      el.addEventListener('pointermove', e => {
        const r = el.getBoundingClientRect();
        mx((e.clientX - r.left - r.width / 2) * .3);
        my((e.clientY - r.top - r.height / 2) * .4);
      });
      el.addEventListener('pointerleave', () => { mx(0); my(0); });
    });

    // drag the horizontal product track (maps to page scroll)
    const hs = $('.hscroll');
    if (hs) {
      let dragging = false, startX = 0, startScroll = 0;
      hs.addEventListener('pointerdown', e => {
        if (e.target.closest('button, a, .posters') || innerWidth <= 820) return;
        dragging = true; startX = e.clientX; startScroll = lenis ? lenis.scroll : scrollY;
        hs.setPointerCapture(e.pointerId);
      });
      hs.addEventListener('pointermove', e => {
        if (!dragging) return;
        const target = startScroll - (e.clientX - startX) * 1.6;
        lenis ? lenis.scrollTo(target, { immediate: false, lerp: .15 }) : scrollTo(0, target);
      });
      const stop = () => { dragging = false; };
      hs.addEventListener('pointerup', stop);
      hs.addEventListener('pointercancel', stop);
    }
  }

  /* ---------------------------------------------------------
     Shared bits that work with or without GSAP
     --------------------------------------------------------- */
  function initBasics() {
    $$('[data-year]').forEach(n => n.textContent = new Date().getFullYear());

    // in-page links
    $$('a[href^="#"]').forEach(a => a.addEventListener('click', e => {
      const id = a.getAttribute('href');
      if (id.length < 2) { e.preventDefault(); scrollToTarget ? scrollToTarget(document.body) : scrollTo({ top: 0, behavior: 'smooth' }); closeMenu(); return; }
      const t = $(id); if (!t) return;
      e.preventDefault();
      closeMenu();
      if (a.dataset.topic) { const r = $(`input[name="topic"][value="${a.dataset.topic}"]`); if (r) { r.checked = true; r.dispatchEvent(new Event('change', { bubbles: true })); } }
      if (scrollToTarget) scrollToTarget(t); else t.scrollIntoView({ behavior: 'smooth' });
      history.replaceState(null, '', id === '#top' ? location.pathname : id);
    }));

    // mobile menu
    const burger = $('.burger');
    const menu = $('#menu');
    function closeMenu() {
      if (!body.classList.contains('menu-open')) return;
      body.classList.remove('menu-open');
      burger?.setAttribute('aria-expanded', 'false');
      menu?.setAttribute('aria-hidden', 'true');
      if (lenis) lenis.start();
    }
    burger?.addEventListener('click', () => {
      const open = !body.classList.contains('menu-open');
      body.classList.toggle('menu-open', open);
      burger.setAttribute('aria-expanded', String(open));
      menu.setAttribute('aria-hidden', String(!open));
      $('.header')?.classList.remove('is-hidden');
      if (lenis) open ? lenis.stop() : lenis.start();
    });
    addEventListener('keydown', e => { if (e.key === 'Escape') closeMenu(); });

    initForm();
  }

  /* ---------------------------------------------------------
     Founding cohort form
     data-endpoint: POST JSON there (Formspree, Make, own API…)
     otherwise: falls back to a pre-filled email to data-email
     --------------------------------------------------------- */
  function initForm() {
    const form = $('#apply-form');
    if (!form) return;
    const status = $('.form__status', form);
    const orgLabel = $('label[for="f-org"]', form);

    form.addEventListener('change', e => {
      if (e.target.name !== 'topic') return;
      const key = `label${e.target.value[0].toUpperCase()}${e.target.value.slice(1)}`;
      if (orgLabel?.dataset[key]) orgLabel.textContent = orgLabel.dataset[key];
    });

    const setStatus = (msg, kind) => { status.textContent = msg; status.className = `form__status ${kind ? `is-${kind}` : ''}`; };

    form.addEventListener('submit', async e => {
      e.preventDefault();
      const data = Object.fromEntries(new FormData(form).entries());
      let ok = true;
      [['name', v => v.trim().length > 1], ['email', v => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim())]].forEach(([n, test]) => {
        const field = form.elements[n].closest('.field');
        const valid = test(data[n] || '');
        field.classList.toggle('is-invalid', !valid);
        if (!valid) ok = false;
      });
      if (!ok) {
        setStatus('Check your name and email.', 'err');
        if (hasGSAP && !reduced) gsap.fromTo(form, { x: -8 }, { x: 0, duration: .6, ease: 'elastic.out(1, .3)' });
        return;
      }

      const endpoint = form.dataset.endpoint;
      const btn = form.querySelector('button[type="submit"]');
      btn.disabled = true;
      setStatus('Sending…');

      try {
        if (endpoint) {
          const res = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify({ ...data, source: 'imin.wtf' }) });
          if (!res.ok) throw new Error(res.status);
          success();
        } else {
          const subject = `IMIN — ${data.topic} — ${data.name}`;
          const lines = [`Name: ${data.name}`, `Email: ${data.email}`, `Topic: ${data.topic}`, `Organization: ${data.organization || '—'}`, `Country: ${data.country}`, '', data.message || ''];
          location.href = `mailto:${form.dataset.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(lines.join('\n'))}`;
          success('Your email app is opening with everything filled in — just hit send.');
        }
      } catch (err) {
        btn.disabled = false;
        setStatus(`Something went wrong. Write to us at ${form.dataset.email}.`, 'err');
      }

      function success(msg) {
        form.classList.add('is-sent');
        setStatus(msg || 'You’re in. Expect a reply within 48 hours.', 'ok');
        $('span', btn).textContent = 'You’re in';
        btn.disabled = false;
        if (hasGSAP && !reduced) gsap.fromTo(btn, { scale: .94 }, { scale: 1, duration: .8, ease: 'elastic.out(1, .4)' });
      }
    });

    $$('input, textarea', form).forEach(i => i.addEventListener('input', () => i.closest('.field')?.classList.remove('is-invalid')));
  }
})();
