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
     THE BEAT — the original IMIN pattern (Group 1.svg):
     IMIN taken apart into the rounded strokes of its letters.
     One bar: I | M (| \ / |) | I | N (| \ |) — 1815 units wide, 800 tall.
     Every second row shifts by half a bar. One accent stroke per crop.
     --------------------------------------------------------- */
  const BAR_W = 1815;
  const ROW_H = 800;
  const ROW_GAP = 120;
  const D_BACK = 'M292.215 52.8235C285.967 25.8047 306.486 0 334.218 0C354.056 0 371.334 13.5391 376.078 32.8025L550.268 740.176C557.762 770.606 534.728 800 503.389 800C480.916 800 461.414 784.494 456.351 762.598L292.215 52.8235Z';
  const D_FWD = 'M877.785 52.8235C884.033 25.8047 863.514 0 835.782 0C815.944 0 798.666 13.5391 793.922 32.8025L619.732 740.176C612.238 770.606 635.272 800 666.611 800C689.084 800 708.586 784.494 713.649 762.598L877.785 52.8235Z';
  const BAR = [
    { k: 'v', x: 0 }, { k: 'v', x: 140 },          // I  M(stem)
    { k: 'b', x: 0 }, { k: 'f', x: 0 },             // M diagonals
    { k: 'v', x: 930 }, { k: 'v', x: 1070 },        // M(stem)  I
    { k: 'v', x: 1210 }, { k: 'b', x: 1070 },       // N(stem)  N diagonal
    { k: 'v', x: 1675 }                             // N(stem)
  ];

  function buildBeat(el, opts = {}) {
    const rows = opts.rows || +el.dataset.rows || 3;
    const exact = !!opts.exact;
    const bars = opts.bars || 10;
    const height = rows * ROW_H + (rows - 1) * ROW_GAP;

    const svg = document.createElementNS(SVGNS, 'svg');
    svg.setAttribute('viewBox', exact ? `0 0 1775 ${height}` : `0 0 ${(bars - 1) * BAR_W} ${height}`);
    svg.setAttribute('preserveAspectRatio', opts.preserve || 'xMidYMax slice');
    svg.setAttribute('aria-hidden', 'true');

    const strokes = [];
    const rowsEls = [];
    for (let r = 0; r < rows; r++) {
      const g = document.createElementNS(SVGNS, 'g');
      g.setAttribute('class', 'row');
      const y = r * (ROW_H + ROW_GAP);
      const start = exact ? 0 : (r % 2 ? -BAR_W * 0.75 : -BAR_W * 0.25);
      for (let b = 0; b < (exact ? bars : bars + 1); b++) {
        const bx = start + b * BAR_W;
        for (const t of BAR) {
          let node;
          if (t.k === 'v') {
            node = document.createElementNS(SVGNS, 'rect');
            node.setAttribute('x', (bx + t.x).toFixed(1));
            node.setAttribute('y', y);
            node.setAttribute('width', 100);
            node.setAttribute('height', ROW_H);
            node.setAttribute('rx', 50);
          } else {
            node = document.createElementNS(SVGNS, 'path');
            node.setAttribute('d', t.k === 'b' ? D_BACK : D_FWD);
            node.setAttribute('transform', `translate(${(bx + t.x).toFixed(1)} ${y})`);
          }
          node.setAttribute('class', 's');
          g.appendChild(node);
          strokes.push({ node, row: r, kind: t.k });
        }
      }
      svg.appendChild(g);
      rowsEls.push(g);
    }

    // the background pattern stays one color: no highlighted strokes
    const lightNode = null;

    el.innerHTML = '';
    el.appendChild(svg);
    return { svg, rows: rowsEls, strokes, lightNode };
  }

  const beats = new Map();
  $$('[data-beat]').forEach(el => beats.set(el, buildBeat(el)));

  // Poster & phone artwork: smaller crops of the same beat
  $$('.poster__beat').forEach((el, i) => {
    const b = buildBeat(el, { rows: 5, light: true, bars: 3, preserve: 'xMidYMid slice' });
    if (i % 3 === 1) b.svg.style.transform = 'scaleX(-1)';
  });

  /* ---------------------------------------------------------
     POSTER STUDIO — three genuinely different layouts per vibe,
     all in the brand palette and the two brand typefaces.
     --------------------------------------------------------- */
  const PH = n => `assets/img/photos/${n}.jpg`;
  const VIBES = {
    techno: {
      prompt: 'Warehouse techno. Doors at midnight. Strobes, no phones.',
      posters: [
        `<div class="pz pz--slab"><img class="pz__img" src="${PH('night-5')}" alt=""><div class="pz__body"><span class="pz__k">IMIN / 02</span><b class="pz__t">Ware<br>house</b><div class="pz__row"><span>Sat 23:00</span><span>Metz</span></div></div></div>`,
        `<div class="pz pz--vert"><img class="pz__img" src="${PH('crowd')}" alt=""><b class="pz__t">Doors at midnight</b><div class="pz__side"><span class="pz__k">Techno</span><span class="pz__big">23<br>00</span></div></div>`,
        `<div class="pz pz--outline"><span class="pz__k">Strobes only · 18+</span><b class="pz__t"><i>No</i><i>Phones</i></b><div class="pz__beat"></div></div>`
      ]
    },
    house: {
      prompt: 'Rooftop house. Sunset to 2am. Vinyl only.',
      posters: [
        `<div class="pz pz--record"><span class="pz__k">rooftop sessions</span><div class="pz__disc"><img src="${PH('night-1')}" alt=""></div><b class="pz__t">house<br>at sunset</b><span class="pz__k">sat · 19:00 → 02:00</span></div>`,
        `<div class="pz pz--sunset"><div class="pz__sun"></div><b class="pz__t">Roof<br>top</b><div class="pz__row"><span>House</span><span>Sat 19:00</span></div></div>`,
        `<div class="pz pz--tiles"><div class="pz__grid"><img src="${PH('night-4')}" alt=""><img src="${PH('dancefloor')}" alt=""><img src="${PH('dj')}" alt=""><img src="${PH('night-3')}" alt=""></div><b class="pz__t">Vinyl only</b><span class="pz__k">House · Sat 19:00</span></div>`
      ]
    },
    disco: {
      prompt: 'Disco basement. Mirror ball, glitter, 70s edits.',
      posters: [
        `<div class="pz pz--burst"><div class="pz__rays"></div><div class="pz__ball"><img src="${PH('lights')}" alt=""></div><b class="pz__t">Disco<br>basement</b><span class="pz__k">Fri · 22:00</span></div>`,
        `<div class="pz pz--echo"><b class="pz__t"><i>Disco</i><i>Disco</i><i>Disco</i><i>Disco</i><i>Disco</i></b><div class="pz__row"><span>70s edits</span><span>Fri 22:00</span></div></div>`,
        `<div class="pz pz--ticket"><div class="pz__stub"><span>Admit one</span></div><span class="pz__k">Disco basement</span><b class="pz__t">Fri<br>14</b><div class="pz__row"><span>22:00</span><span>Nº 0412</span></div></div>`
      ]
    },
    hiphop: {
      prompt: 'Hip-hop block party. Live MCs. Late doors.',
      posters: [
        `<div class="pz pz--collage"><div class="pz__snap"><img src="${PH('night-2')}" alt=""><i></i><i></i></div><b class="pz__t">Block<br>party</b><span class="pz__k">Sat · late doors</span></div>`,
        `<div class="pz pz--halftone"><img class="pz__img" src="${PH('apply')}" alt=""><div class="pz__dots"></div><b class="pz__t">Live<br>MCs</b><span class="pz__k">Hip-hop · Sat 23:00</span></div>`,
        `<div class="pz pz--frame"><span class="pz__pill">Vol. 3</span><b class="pz__t">Block<br>party</b><ul><li>Live MCs</li><li>DJ sets</li><li>Late doors</li></ul></div>`
      ]
    }
  };

  function renderPosters(vibe) {
    const box = $('.posters');
    if (!box || !VIBES[vibe]) return;
    box.dataset.vibeCurrent = vibe;
    box.innerHTML = VIBES[vibe].posters.map(h => h.replace('class="pz ', 'class="poster pz ')).join('');
    $$('.pz__beat', box).forEach(el => buildBeat(el, { rows: 2, bars: 2, preserve: 'xMidYMax slice' }));
  }
  renderPosters($('.vibe.is-active')?.dataset.vibe || 'techno');

  /* ---------------------------------------------------------
     FORECAST — a real chart: 42 days of ticket sales against a
     back-loaded target curve, today at 14 days out, a projection
     with its uncertainty, and a hover read-out for every day.
     --------------------------------------------------------- */
  const FC = (() => {
    const svg = $('.fc__chart');
    if (!svg) return null;
    const W = 560, H = 260, m = { l: 40, r: 52, t: 22, b: 30 };
    const CAP = 600, START = -42, TODAY = -14;
    const x = d => m.l + (d - START) / -START * (W - m.l - m.r);
    const y = v => H - m.b - v / CAP * (H - m.t - m.b);
    const target = d => CAP * Math.pow((d - START) / -START, 1.8);
    const sold = [];
    for (let d = START, prev = 0; d <= TODAY; d++) {
      const u = (d - START) / -START;
      const v = Math.max(prev, CAP * .893 * u * u + 3 * Math.sin(d * 1.3));
      sold.push([d, Math.round(v)]); prev = v;
    }
    sold[sold.length - 1][1] = 238;
    const last = 238, FINAL = 412;
    const proj = d => last + (FINAL - last) * Math.pow((d - TODAY) / -TODAY, 1.1);
    const spread = d => 52 * ((d - TODAY) / -TODAY);
    const range = (a, b) => Array.from({ length: b - a + 1 }, (_, i) => a + i);
    const line = pts => pts.map((p, i) => `${i ? 'L' : 'M'}${x(p[0]).toFixed(1)} ${y(p[1]).toFixed(1)}`).join('');
    const NS = 'http://www.w3.org/2000/svg';
    const el = (tag, attrs, parent = svg) => { const n = document.createElementNS(NS, tag); for (const k in attrs) n.setAttribute(k, attrs[k]); parent.appendChild(n); return n; };

    const defs = el('defs', {});
    const g1 = el('linearGradient', { id: 'fcSold', x1: 0, y1: 0, x2: 0, y2: 1 }, defs);
    el('stop', { offset: 0, 'stop-color': '#9C8CFF', 'stop-opacity': .38 }, g1);
    el('stop', { offset: 1, 'stop-color': '#9C8CFF', 'stop-opacity': 0 }, g1);
    const clip = el('clipPath', { id: 'fcReveal' }, defs);
    const clipRect = el('rect', { x: 0, y: 0, width: W, height: H }, clip);

    // grid + axes
    const grid = el('g', { class: 'fc__grid' });
    [0, 200, 400, 600].forEach(v => {
      el('line', { x1: m.l, x2: W - m.r, y1: y(v), y2: y(v), class: v === CAP ? 'cap' : '' }, grid);
      el('text', { x: m.l - 8, y: y(v) + 4, 'text-anchor': 'end' }, grid).textContent = v;
    });
    el('text', { x: m.l, y: y(CAP) - 8, 'text-anchor': 'start', class: 'fc__caplabel' }, grid).textContent = 'Capacity';
    [[-42, '6 wks'], [-28, '4 wks'], [-14, '2 wks'], [0, 'Doors']].forEach(([d, t]) => {
      el('text', { x: x(d), y: H - 6, 'text-anchor': d === START ? 'start' : d === 0 ? 'end' : 'middle' }, grid).textContent = t;
    });

    const plot = el('g', { 'clip-path': 'url(#fcReveal)' });
    // target corridor + line
    const all = range(START, 0);
    const band = all.map(d => [d, target(d) + 22]).concat(all.slice().reverse().map(d => [d, Math.max(0, target(d) - 22)]));
    el('path', { d: line(band) + 'Z', class: 'fc__band' }, plot);
    el('path', { d: line(all.map(d => [d, target(d)])), class: 'fc__target' }, plot);
    // sold
    el('path', { d: line(sold) + `L${x(TODAY)} ${y(0)}L${x(START)} ${y(0)}Z`, class: 'fc__area', fill: 'url(#fcSold)' }, plot);
    el('path', { d: line(sold), class: 'fc__sold' }, plot);
    // projection cone + line
    const fut = range(TODAY, 0);
    const cone = fut.map(d => [d, proj(d) + spread(d)]).concat(fut.slice().reverse().map(d => [d, proj(d) - spread(d)]));
    const proj_g = el('g', { class: 'fc__projg' }, plot);
    el('path', { d: line(cone) + 'Z', class: 'fc__cone' }, proj_g);
    el('path', { d: line(fut.map(d => [d, proj(d)])), class: 'fc__proj' }, proj_g);
    const endDot = el('circle', { cx: x(0), cy: y(FINAL), r: 4, class: 'fc__end' }, proj_g);
    const endLabel = el('text', { x: x(0) + 8, y: y(FINAL) + 4, class: 'fc__endlabel' }, proj_g);
    endLabel.textContent = FINAL;
    // gap to target at doors
    const gap = el('g', { class: 'fc__gap' });
    el('line', { x1: x(0) + 14, x2: x(0) + 14, y1: y(CAP), y2: y(FINAL) + 10 }, gap);
    el('text', { x: x(0) + 22, y: (y(CAP) + y(FINAL)) / 2 + 4 }, gap).textContent = '−188';

    // today
    const today = el('g', { class: 'fc__today' });
    el('line', { x1: x(TODAY), x2: x(TODAY), y1: m.t, y2: H - m.b }, today);
    const pill = el('g', { transform: `translate(${x(TODAY)} ${m.t - 2})` }, today);
    el('rect', { x: -26, y: -14, width: 52, height: 22, rx: 11 }, pill);
    el('text', { x: 0, y: 2, 'text-anchor': 'middle' }, pill).textContent = 'Today';
    const ring = el('circle', { cx: x(TODAY), cy: y(last), r: 5, class: 'fc__ring' });
    const dot = el('circle', { cx: x(TODAY), cy: y(last), r: 5, class: 'fc__dot' });

    // hover read-out
    const guide = el('line', { y1: m.t, y2: H - m.b, class: 'fc__guide' });
    const probe = el('circle', { r: 4, class: 'fc__probe' });
    const tip = $('.fc__tip');
    const soldAt = d => (sold.find(p => p[0] === d) || [0, 0])[1];
    svg.addEventListener('pointermove', e => {
      const r = svg.getBoundingClientRect();
      const sx = (e.clientX - r.left) / r.width * W;
      const d = Math.max(START, Math.min(0, Math.round(START + (sx - m.l) / (W - m.l - m.r) * -START)));
      const past = d <= TODAY;
      const v = past ? soldAt(d) : Math.round(proj(d));
      guide.setAttribute('x1', x(d)); guide.setAttribute('x2', x(d));
      probe.setAttribute('cx', x(d)); probe.setAttribute('cy', y(v));
      probe.classList.toggle('is-proj', !past);
      const when = d === 0 ? 'Doors' : `${-d} days out`;
      tip.innerHTML = `<b>${when}</b><span>${past ? 'Sold' : 'Projected'} <em>${v}</em></span><span>Target <em>${Math.round(target(d))}</em></span>`;
      tip.style.left = `${x(d) / W * 100}%`;
      tip.style.top = `${y(v) / H * 100}%`;
      svg.parentElement.classList.add('is-hover');
    });
    svg.addEventListener('pointerleave', () => svg.parentElement.classList.remove('is-hover'));

    return { svg, clipRect, W, todayX: x(TODAY), proj_g, endDot, endLabel, gap, today, dot, ring, grid };
  })();

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
     HERO — one photograph, moved slowly.
     · intro: the frame opens from a narrow band, the photo settles
       from a long, slow zoom; the headline rises line by line
     · idle: the photo breathes, barely
     · pointer: the photo and the headline drift a few pixels apart
     · scroll: photo and type part at different speeds, the room darkens
     --------------------------------------------------------- */
  const loader = $('.loader');
  const hero = $('.hero');
  const heroLines = $$('.hero__title .line > span');

  function heroIntro(delay = 0) {
    const tl = gsap.timeline({ delay, defaults: { ease: 'expo.out' } });
    tl.fromTo('.hero__photo', { clipPath: 'inset(42% 0% 42% 0%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: 2.2, ease: 'expo.inOut' }, 0)
      .fromTo('.hero__photo img', { scale: 1.32 }, { scale: 1.06, duration: 3.6, ease: 'power3.out' }, 0)
      .fromTo('.hero__shade', { opacity: 0 }, { opacity: 1, duration: 1.8, ease: 'power2.inOut' }, .9)
      .from(heroLines, { yPercent: 108, duration: 1.6, stagger: .12 }, 1.15)
      .from('.hero__eyebrow', { y: 16, opacity: 0, duration: 1.4 }, 1.1)
      .from('.hero__lead', { y: 24, opacity: 0, duration: 1.6 }, 1.6)
      .from('.hero__actions > *', { y: 24, opacity: 0, duration: 1.6, stagger: .1 }, 1.7)
      .from('.hero__foot > *', { y: 12, opacity: 0, duration: 1.4, stagger: .08 }, 1.95)
      .from('.header__inner', { y: -24, opacity: 0, duration: 1.4 }, 1.8)
      // after the intro, the photo keeps breathing
      .add(() => gsap.to('.hero__photo img', { scale: 1.1, duration: 14, ease: 'sine.inOut', yoyo: true, repeat: -1 }), 3.6);
    return tl;
  }

  if (loader && !reduced) {
    body.classList.add('is-loading');
    lenis?.stop();
    const bar = buildBeat($('.loader__bar'), { rows: 1, bars: 1, exact: true, preserve: 'xMidYMid meet' });
    const ss = bar.strokes.map(s => s.node);
    // light chase: every stroke has its own colour, and the brand colours
    // hand over from stroke to stroke, left to right; soft neon bloom
    const mk = (t, at = {}, parent) => { const n = document.createElementNS(SVGNS, t); for (const k in at) n.setAttribute(k, at[k]); parent?.appendChild(n); return n; };
    const defs = mk('defs');
    const glow = mk('filter', { id: 'loaderGlow', x: '-30%', y: '-40%', width: '160%', height: '180%' }, defs);
    mk('feGaussianBlur', { in: 'SourceGraphic', stdDeviation: 26, result: 'b' }, glow);
    mk('feColorMatrix', { in: 'b', type: 'matrix', values: '1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 .6 0', result: 'g' }, glow);
    const merge = mk('feMerge', {}, glow);
    mk('feMergeNode', { in: 'g' }, merge); mk('feMergeNode', { in: 'SourceGraphic' }, merge);
    bar.svg.prepend(defs);
    bar.rows[0].setAttribute('filter', 'url(#loaderGlow)');
    bar.svg.style.overflow = 'visible';
    const RAMP = [[0, [75, 43, 255]], [.25, [156, 140, 255]], [.5, [244, 239, 231]], [.75, [22, 184, 119]], [1, [75, 43, 255]]];
    const colourAt = t => {
      for (let i = 1; i < RAMP.length; i++) if (t <= RAMP[i][0]) {
        const [p0, c0] = RAMP[i - 1], [p1, c1] = RAMP[i], k = (t - p0) / (p1 - p0);
        return `rgb(${c0.map((v, j) => Math.round(v + (c1[j] - v) * k)).join(',')})`;
      }
      return 'rgb(75,43,255)';
    };
    const chase = () => {
      const t = gsap.ticker.time;
      ss.forEach((n, i) => { n.style.fill = colourAt((((t * .45 - i * .09) % 1) + 1) % 1); });
    };
    chase();
    gsap.ticker.add(chase);
    const count = $('.loader__count');
    const c = { v: 0 };
    gsap.set(ss, { transformOrigin: '50% 50%' });

    const tl = gsap.timeline({
      onComplete: () => {
        gsap.ticker.remove(chase);
        loader.remove();
        body.classList.remove('is-loading');
        lenis?.start();
        ScrollTrigger.refresh();
      }
    });
    tl.from(ss, { scaleY: 0, duration: 1, stagger: .06, ease: 'expo.out' })
      .to(c, { v: 100, duration: 1.3, ease: 'power2.inOut', onUpdate: () => { count.textContent = String(Math.round(c.v)).padStart(2, '0'); } }, 0)
      .to(ss, { scaleY: 0, opacity: 0, duration: .8, stagger: { each: .04, from: 'center' }, ease: 'power3.in' }, '+=.15')
      .to('.loader__meta', { opacity: 0, duration: .5 }, '<')
      .to(loader, { opacity: 0, duration: .9, ease: 'power2.inOut' }, '-=.3')
      .add(heroIntro(), '-=.8');
  } else {
    loader?.remove();
    if (!reduced) heroIntro(.1);
  }

  if (!reduced) {
    if (finePointer) {
      const px = gsap.quickTo('.hero__photo', 'x', { duration: 2.2, ease: 'power3.out' });
      const py = gsap.quickTo('.hero__photo', 'y', { duration: 2.2, ease: 'power3.out' });
      const tx = gsap.quickTo('.hero__inner', 'x', { duration: 2.2, ease: 'power3.out' });
      hero.addEventListener('pointermove', e => {
        const nx = e.clientX / innerWidth - .5, ny = e.clientY / innerHeight - .5;
        px(nx * -22); py(ny * -14); tx(nx * 10);
      });
    }

    const st = { trigger: hero, start: 'top top', end: 'bottom top', scrub: true };
    gsap.to('.hero__media', { yPercent: 22, ease: 'none', scrollTrigger: st });
    gsap.to('.hero__inner', { yPercent: -10, opacity: 0, ease: 'power1.in', scrollTrigger: { ...st, end: 'bottom 20%' } });
    gsap.to('.hero__foot', { opacity: 0, ease: 'none', scrollTrigger: { ...st, end: '30% top' } });
    gsap.fromTo('.hero__dusk', { opacity: 0 }, { opacity: 1, ease: 'none', scrollTrigger: st });
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

    // forecast: grid settles, sales draw up to today, the projection fans out
    if (FC && f.contains(FC.svg)) {
      const card = f.querySelector('.fc');
      gsap.set(FC.clipRect, { attr: { width: 0 } });
      tl.from(card.querySelectorAll('.fc__top > *, .fc__kpi'), { y: 16, opacity: 0, stagger: .06, duration: .9 }, '<.25')
        .from(FC.grid.children, { opacity: 0, duration: .8, stagger: .015 }, '<.1')
        .to(FC.clipRect, { attr: { width: FC.todayX }, duration: 1.6, ease: 'power2.inOut' }, '<.2')
        .from(FC.today, { opacity: 0, y: -10, duration: .7 }, '-=.3')
        .from([FC.dot, FC.ring], { scale: 0, transformOrigin: 'center', duration: .6, ease: 'back.out(2.5)' }, '<')
        .to(FC.clipRect, { attr: { width: FC.W }, duration: 1.2, ease: 'power2.out' }, '-=.1')
        .from(FC.proj_g, { opacity: 0, duration: 1 }, '<')
        .from(FC.gap, { opacity: 0, x: -6, duration: .7 }, '-=.4')
        .from(card.querySelectorAll('.fc__legend, .fc__action'), { y: 14, opacity: 0, stagger: .08, duration: .8 }, '-=.5');
      gsap.fromTo(FC.ring, { scale: 1, opacity: .7 }, { scale: 3.2, opacity: 0, transformOrigin: 'center', duration: 1.8, ease: 'power2.out', repeat: -1, delay: 3.5 });
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

  // Vibe chips → new prompt, three new posters
  const posters = $('.posters');
  const typed = $('.studio__typed');
  $$('.vibe').forEach(btn => btn.addEventListener('click', () => {
    const vibe = btn.dataset.vibe;
    if (!posters || posters.dataset.vibeCurrent === vibe) return;
    $$('.vibe').forEach(b => b.classList.toggle('is-active', b === btn));
    const text = VIBES[vibe].prompt;
    if (reduced) { renderPosters(vibe); if (typed) typed.textContent = text; return; }
    if (typed) {
      typed.dataset.done = '1';
      const o = { n: 0 };
      gsap.to(o, { n: text.length, duration: text.length * .022, ease: 'none', overwrite: true, onUpdate: () => { typed.textContent = text.slice(0, Math.round(o.n)); } });
    }
    gsap.timeline()
      .to(posters.children, { y: -16, opacity: 0, stagger: .05, duration: .3, ease: 'power2.in' })
      .call(() => renderPosters(vibe))
      .add(() => gsap.from(posters.children, { y: 40, opacity: 0, rotate: i => (i - 1) * 3, stagger: .08, duration: .9, ease: 'expo.out' }));
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
      gsap.fromTo(row, { x: (i % 2 ? -1 : 1) * BAR_W * .5 }, { x: (i % 2 ? 1 : -1) * BAR_W * .5, ease: 'none', scrollTrigger: { trigger: '.wedge', start: 'top bottom', end: 'bottom top', scrub: true } });
    });
  }

  /* ---------------------------------------------------------
     Photos: collage parallax, masked reveals, slow zooms
     --------------------------------------------------------- */
  if (!reduced) {
    // phones have no hover: the panel snapped to the centre turns to colour
    const strip = $('.night__grid');
    if (strip && !finePointer) {
      const mark = () => {
        const mid = strip.getBoundingClientRect().left + strip.clientWidth / 2;
        let best = null, dist = Infinity;
        $$('.ph', strip).forEach(p => { const r = p.getBoundingClientRect(); const d = Math.abs(r.left + r.width / 2 - mid); if (d < dist) { dist = d; best = p; } });
        $$('.ph', strip).forEach(p => p.classList.toggle('is-active', p === best));
      };
      strip.addEventListener('scroll', () => requestAnimationFrame(mark), { passive: true });
      ScrollTrigger.create({ trigger: strip, start: 'top 70%', onEnter: mark });
    }
    // the strip rises panel by panel; each photo drifts inside its frame
    const panels = $$('.ph');
    gsap.from(panels, {
      clipPath: 'inset(100% 0% 0% 0%)', duration: 1.5, ease: 'expo.inOut', stagger: .09,
      scrollTrigger: { trigger: '.night', start: 'top 80%' }
    });
    panels.forEach(f => {
      gsap.fromTo(f.querySelector('img'), { yPercent: -6, scale: 1.18 }, {
        yPercent: 6, scale: 1.06, ease: 'none',
        scrollTrigger: { trigger: '.night', start: 'top bottom', end: 'bottom top', scrub: true }
      });
    });
    gsap.fromTo('.apply__photo img', { yPercent: -8 }, { yPercent: 8, ease: 'none', scrollTrigger: { trigger: '.apply', start: 'top bottom', end: 'bottom top', scrub: true } });
    $$('.side__photo img').forEach(img => gsap.fromTo(img, { yPercent: -8, scale: 1.1 }, { yPercent: 8, scale: 1, ease: 'none', scrollTrigger: { trigger: img.parentElement, start: 'top bottom', end: 'bottom top', scrub: true } }));
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
     Vision: a dot map of France, Spain and Portugal. The section
     pins; Metz lights up, France fills in a wave from Metz, then the
     route arcs to Spain and Portugal and each country fills in turn.
     --------------------------------------------------------- */
  const XMAP = (() => {
    const svg = $('.xmap');
    if (!svg) return null;
    const NSv = 'http://www.w3.org/2000/svg';
    const el = (t, at = {}, p = svg) => { const n = document.createElementNS(NSv, t); for (const k in at) n.setAttribute(k, at[k]); p.appendChild(n); return n; };
    const COS = Math.cos(44 * Math.PI / 180), K = 40;
    const LON0 = -10, LAT0 = 51.6;
    const P = ([lon, lat]) => [(lon - LON0) * COS * K, (LAT0 - lat) * K];
    const FR = [[-1.8,43.4],[-1.3,44.6],[-1.2,46.2],[-2.2,47.1],[-4.7,47.9],[-4.6,48.6],[-3.0,48.8],[-1.6,48.7],[-1.3,49.7],[0.2,49.7],[1.6,50.4],[2.6,51.1],[4.2,50.0],[5.8,49.5],[8.2,49.0],[7.6,47.6],[6.9,47.4],[6.0,46.2],[6.8,46.0],[7.0,45.3],[6.6,45.1],[7.0,44.2],[7.5,43.8],[6.6,43.2],[5.0,43.4],[4.0,43.5],[3.1,42.5],[1.7,42.5],[-0.3,42.8]];
    const ES = [[-1.8,43.4],[-0.3,42.8],[1.7,42.5],[3.2,42.0],[3.2,41.8],[1.0,41.0],[0.0,40.0],[-0.3,39.4],[0.2,38.7],[-0.7,37.6],[-1.6,37.0],[-2.1,36.7],[-4.4,36.7],[-5.6,36.0],[-6.3,36.6],[-7.4,37.2],[-7.0,38.0],[-7.3,39.5],[-6.9,40.3],[-6.8,41.0],[-6.2,41.6],[-8.1,41.8],[-8.9,42.1],[-9.3,42.9],[-8.0,43.7],[-5.8,43.6],[-4.0,43.4]];
    const PT = [[-8.9,42.1],[-8.1,41.8],[-6.2,41.6],[-6.8,41.0],[-6.9,40.3],[-7.3,39.5],[-7.0,38.0],[-7.4,37.2],[-8.0,37.0],[-9.0,37.0],[-8.8,38.0],[-9.5,38.7],[-9.0,39.5],[-8.7,40.6]];
    const inside = (x, y, poly) => { let c = false; for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) { const [xi, yi] = poly[i], [xj, yj] = poly[j]; if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) c = !c; } return c; };
    const METZ = [6.18, 49.12], MADRID = [-3.7, 40.42], LISBON = [-9.14, 38.72];
    const [W, H] = P([8.6, 35.8]);
    svg.setAttribute('viewBox', `-10 -10 ${W + 20} ${H + 20}`);

    const STEP = .36, BUCKETS = 12;
    const countries = [[FR, METZ], [ES, MADRID], [PT, LISBON]].map(([poly, origin]) => {
      const g = el('g', { class: 'xmap__country' });
      const groups = Array.from({ length: BUCKETS }, () => el('g', { class: 'xmap__ring' }, g));
      const pts = [];
      for (let lat = 36; lat <= 51.3; lat += STEP) {
        for (let lon = -9.6; lon <= 8.4; lon += STEP / COS * .9) {
          if (inside(lon, lat, poly)) pts.push([lon, lat]);
        }
      }
      const [ox, oy] = P(origin);
      const dists = pts.map(p => { const [x, y] = P(p); return Math.hypot(x - ox, y - oy); });
      const max = Math.max(...dists) || 1;
      pts.forEach((p, i) => {
        const [x, y] = P(p);
        el('circle', { cx: x.toFixed(1), cy: y.toFixed(1), r: 3.4 }, groups[Math.min(BUCKETS - 1, Math.floor(dists[i] / max * BUCKETS))]);
      });
      return { g, groups };
    });

    // route arcs
    const arc = (a, b, lift) => {
      const [x1, y1] = P(a), [x2, y2] = P(b);
      const mx = (x1 + x2) / 2, my = (y1 + y2) / 2 - lift;
      return el('path', { d: `M${x1} ${y1} Q${mx} ${my} ${x2} ${y2}`, class: 'xmap__arc' });
    };
    const arcs = [arc(METZ, MADRID, 120), arc(MADRID, LISBON, 70)];
    arcs.forEach(p => { const L = p.getTotalLength(); p.style.strokeDasharray = `${L} ${L}`; p.style.strokeDashoffset = reduced ? 0 : L; p.dataset.len = L; });

    const pin = (c, cls, label) => {
      const [x, y] = P(c);
      const g = el('g', { class: `xmap__pin ${cls}`, transform: `translate(${x} ${y})` });
      el('circle', { r: 16, class: 'xmap__halo' }, g);
      el('circle', { r: 7, class: 'xmap__core' }, g);
      if (label) { const t = el('text', { x: 14, y: -14, class: 'xmap__label' }, g); t.textContent = label; }
      return g;
    };
    const pins = [pin(METZ, 'is-home', 'Metz'), pin(MADRID, ''), pin(LISBON, '')];

    const steps = $$('.xstep');
    let lastStep = -1;
    function set(p) { // p: 0..3
      countries.forEach((c, i) => {
        const local = Math.min(1, Math.max(0, p - i));
        const n = Math.round(local * BUCKETS);
        c.groups.forEach((g, k) => g.classList.toggle('is-on', k < n));
        pins[i].classList.toggle('is-on', local > 0);
      });
      arcs.forEach((a, i) => { const local = Math.min(1, Math.max(0, (p - (i + 1)) * 2.2)); a.style.strokeDashoffset = a.dataset.len * (1 - local); });
      steps.forEach((s, i) => { s.querySelector('.xstep__bar b').style.transform = `scaleX(${Math.min(1, Math.max(0, p - i))})`; });
      const cur = Math.min(2, Math.floor(p * .999));
      if (cur !== lastStep) { steps.forEach((s, i) => s.classList.toggle('is-active', i === cur)); lastStep = cur; }
    }
    set(reduced ? 3 : 0);
    return { set };
  })();

  if (XMAP && !reduced) {
    const prog = { p: 0 };
    mm.add('(min-width: 821px)', () => {
      gsap.timeline({ scrollTrigger: { trigger: '.expand', start: 'center center', end: '+=160%', pin: '.vision', pinSpacing: true, scrub: .8, anticipatePin: 1 } })
        .fromTo(prog, { p: 0 }, { p: 3, ease: 'none', onUpdate: () => XMAP.set(prog.p) });
    });
    mm.add('(max-width: 820px)', () => {
      gsap.timeline({ scrollTrigger: { trigger: '.expand', start: 'top 70%', end: 'bottom 40%', scrub: .6 } })
        .fromTo(prog, { p: 0 }, { p: 3, ease: 'none', onUpdate: () => XMAP.set(prog.p) });
    });
    gsap.from('.expand__steps', { x: -30, opacity: 0, duration: 1.1, clearProps: 'transform,opacity', scrollTrigger: { trigger: '.vision', start: 'top 60%' } });
    gsap.from('.expand__map', { opacity: 0, scale: .96, duration: 1.4, clearProps: 'transform,opacity', scrollTrigger: { trigger: '.vision', start: 'top 60%' } });
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
    applyBeat.rows.forEach((row, i) => gsap.fromTo(row, { x: (i % 2 ? 1 : -1) * BAR_W * .4 }, { x: 0, ease: 'none', scrollTrigger: { trigger: '.apply', start: 'top bottom', end: 'bottom bottom', scrub: true } }));
  }
  if (!reduced) {
    const footBeat = beats.get($('.footer__beat'));
    footBeat?.rows.forEach((row, i) => gsap.fromTo(row, { x: (i % 2 ? -1 : 1) * BAR_W * .5 }, { x: 0, ease: 'none', scrollTrigger: { trigger: '.footer', start: 'top bottom', end: 'bottom bottom', scrub: true } }));
    gsap.from('.footer__claim', { y: 40, opacity: 0, duration: 1.2, scrollTrigger: { trigger: '.footer', start: 'top 85%' } });
  }

  /* ---------------------------------------------------------
     Scroll velocity bends the photos
     --------------------------------------------------------- */
  if (!reduced) {
    const bendEls = $$('.side__photo, .poster');
    const benders = bendEls.map(el => gsap.quickTo(el, 'skewY', { duration: .6, ease: 'power3.out' }));
    let settle;
    ScrollTrigger.create({
      onUpdate: self => {
        const v = gsap.utils.clamp(-5, 5, self.getVelocity() / -350);
        benders.forEach(q => q(v));
        clearTimeout(settle);
        settle = setTimeout(() => benders.forEach(q => q(0)), 140);
      }
    });

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
     Cursor
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
    // the chart has its own read-out: hide the custom cursor over it
    if (FC) {
      FC.svg.addEventListener('pointerenter', () => cursor.classList.add('is-off'));
      FC.svg.addEventListener('pointerleave', () => cursor.classList.remove('is-off'));
    }
    $('.posters')?.addEventListener('click', () => {
      const vibes = $$('.vibe');
      const i = vibes.findIndex(v => v.classList.contains('is-active'));
      vibes[(i + 1) % vibes.length].click();
    });


    // drag the horizontal product track (maps to page scroll)
    const hs = $('.hscroll');
    if (hs) {
      let dragging = false, startX = 0, startScroll = 0;
      hs.addEventListener('pointerdown', e => {
        if (e.target.closest('button, a, .posters, .fc__chart') || innerWidth <= 820) return;
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

    // a photo that fails to load leaves the toned background, not a broken icon
    $$('img').forEach(img => {
      const fail = () => {
        img.classList.add('is-missing');
        // empty frames read as unfinished: hide a photo block until its file exists
        const frame = img.closest('.ph, .side__photo');
        if (frame) frame.hidden = true;
        const night = img.closest('.night');
        if (night && !$$('.ph', night).some(f => !f.hidden)) night.hidden = true;
      };
      if (img.complete && img.naturalWidth === 0) fail();
      img.addEventListener('error', fail);
    });

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

      }
    });

    $$('input, textarea', form).forEach(i => i.addEventListener('input', () => i.closest('.field')?.classList.remove('is-invalid')));
  }
})();
