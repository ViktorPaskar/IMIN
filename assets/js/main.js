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
     HERO — the beat pattern as a sound wave.
     Every stroke of the original pattern is a bar of a waveform:
     it stretches out from its row's centre line by the amplitude
     at its position. The strokes are windows onto the night:
     they are filled with the party photo.
     · intro: a playhead sweeps across and "plays" the silence
       (a grid of dots) into a waveform
     · idle: a travelling waveform with a 124 BPM kick
     · sound on: a synthesised 124 BPM groove drives the bars live
     · pointer: turns the volume up around the cursor
     · scroll: the wave hits full level, the strokes widen until
       they merge, and the photo takes the whole screen
     --------------------------------------------------------- */
  const BPM = 124;

  function createGroove() {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    let ac, master, analyser, noise, timer = 0, step = 0, nextTime = 0, on = false;
    const freq = new Uint8Array(128);
    const spb = 60 / BPM / 4; // a 16th note
    const BASS = [0, 0, 45, 0, 0, 0, 45, 0, 0, 0, 48, 0, 0, 0, 43, 0];

    function init() {
      ac = new AC();
      master = ac.createGain(); master.gain.value = .55;
      analyser = ac.createAnalyser(); analyser.fftSize = 256; analyser.smoothingTimeConstant = .72;
      master.connect(analyser); analyser.connect(ac.destination);
      noise = ac.createBuffer(1, ac.sampleRate, ac.sampleRate);
      const d = noise.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    function kick(t) {
      const o = ac.createOscillator(), g = ac.createGain();
      o.frequency.setValueAtTime(150, t); o.frequency.exponentialRampToValueAtTime(42, t + .14);
      g.gain.setValueAtTime(1, t); g.gain.exponentialRampToValueAtTime(.001, t + .45);
      o.connect(g); g.connect(master); o.start(t); o.stop(t + .5);
    }
    function hiss(t, type, f, len, vol) {
      const s = ac.createBufferSource(), fl = ac.createBiquadFilter(), g = ac.createGain();
      s.buffer = noise; fl.type = type; fl.frequency.value = f;
      g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(.001, t + len);
      s.connect(fl); fl.connect(g); g.connect(master); s.start(t); s.stop(t + len + .02);
    }
    function bass(t, midi) {
      const o = ac.createOscillator(), fl = ac.createBiquadFilter(), g = ac.createGain();
      o.type = 'sawtooth'; o.frequency.value = 440 * Math.pow(2, (midi - 69) / 12);
      fl.type = 'lowpass'; fl.frequency.setValueAtTime(900, t); fl.frequency.exponentialRampToValueAtTime(140, t + .18);
      g.gain.setValueAtTime(.32, t); g.gain.exponentialRampToValueAtTime(.001, t + .22);
      o.connect(fl); fl.connect(g); g.connect(master); o.start(t); o.stop(t + .25);
    }
    function schedule() {
      while (nextTime < ac.currentTime + .12) {
        const s = step % 16;
        if (s % 4 === 0) kick(nextTime);
        if (s % 4 === 2) hiss(nextTime, 'highpass', 8000, .06, .22);
        if (s % 2 === 1) hiss(nextTime, 'highpass', 10000, .025, .07);
        if (s === 4 || s === 12) hiss(nextTime, 'bandpass', 1600, .16, .35);
        if (BASS[s]) bass(nextTime, BASS[s]);
        nextTime += spb; step++;
      }
    }
    return {
      get on() { return on; },
      toggle() {
        if (!ac) init();
        on = !on;
        if (on) {
          ac.resume(); nextTime = ac.currentTime + .05; step = 0;
          master.gain.setTargetAtTime(.55, ac.currentTime, .05);
          timer = setInterval(schedule, 25);
        } else {
          clearInterval(timer);
          master.gain.setTargetAtTime(0, ac.currentTime, .08);
        }
        return on;
      },
      level(x) { // x: 0..1 across the screen → spectrum level 0..1
        if (!on) return 0;
        analyser.getByteFrequencyData(freq);
        const bin = Math.min(100, Math.floor(Math.pow(x, 1.6) * 100) + 1);
        return freq[bin] / 255;
      },
      refresh() { if (on) analyser.getByteFrequencyData(freq); }
    };
  }

  function createHeroField(canvas) {
    if (!canvas) return null;
    const ctx = canvas.getContext('2d');
    const state = { play: reduced ? 1.2 : -.15, level: 0, widen: 0, glow: 0 };
    const mouse = { x: -9999, y: -9999, on: 0 };
    const elastic = gsap.parseEase('elastic.out(1, 0.6)');
    const SHAPES = [
      { x0: 50, x1: 50 }, { x0: 190, x1: 190 },
      { x0: 334, x1: 503 }, { x0: 836, x1: 666 },
      { x0: 980, x1: 980 }, { x0: 1120, x1: 1120 }, { x0: 1260, x1: 1260 },
      { x0: 1404, x1: 1573 }, { x0: 1725, x1: 1725 }
    ];
    let W = 0, H = 0, dpr = 1, strokes = [], running = true, groove = null;
    let fill = null;            // the photo, toned to paper, sized to cover the hero
    const photo = new Image();
    photo.src = $('.hero__photo img')?.getAttribute('src') || '';
    photo.onload = () => { toneFill(); };

    function toneFill() {
      if (!photo.naturalWidth || !W) return;
      const c = document.createElement('canvas');
      c.width = Math.round(W * dpr); c.height = Math.round(H * dpr);
      const x = c.getContext('2d');
      const s = Math.max(c.width / photo.naturalWidth, c.height / photo.naturalHeight);
      const w = photo.naturalWidth * s, h = photo.naturalHeight * s;
      x.drawImage(photo, (c.width - w) / 2, (c.height - h) / 2, w, h);
      // duotone: midnight-violet shadows → paper highlights
      const img = x.getImageData(0, 0, c.width, c.height), d = img.data;
      for (let i = 0; i < d.length; i += 4) {
        let v = (d[i] * .3 + d[i + 1] * .59 + d[i + 2] * .11) / 255;
        v = Math.min(1, .3 + Math.pow(v, .8) * .95);
        d[i] = 60 + (244 - 60) * v; d[i + 1] = 52 + (239 - 52) * v; d[i + 2] = 110 + (231 - 110) * v;
      }
      x.putImageData(img, 0, 0);
      fill = c;
    }

    function layout() {
      const r = canvas.getBoundingClientRect();
      W = r.width; H = r.height;
      dpr = Math.min(window.devicePixelRatio || 1, 1.75);
      canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
      const sc = Math.max(54, Math.min(130, H * .14)) / 800;
      const pitchY = (800 + 140) * sc, barPx = BAR_W * sc;
      const rows = Math.ceil(H / pitchY) + 1;
      strokes = [];
      for (let row = 0; row < rows; row++) {
        const y = row * pitchY - pitchY * .25;
        const start = (row % 2 ? -.75 : -.25) * barPx;
        const bars = Math.ceil((W - start) / barPx) + 1;
        for (let b = 0; b < bars; b++) {
          for (const sh of SHAPES) {
            const x0 = start + b * barPx + sh.x0 * sc;
            const x1 = start + b * barPx + sh.x1 * sc;
            const cx = (x0 + x1) / 2;
            if (cx < -80 || cx > W + 80) continue;
            strokes.push({
              cx, cy: y + 400 * sc,
              hx: (x0 - x1) / 2, hy: -350 * sc,            // half-vector centre → top
              w: (sh.x0 === sh.x1 ? 100 : 84) * sc,
              xn: cx / W, row,
              om: 5 + Math.random() * 9, ph: Math.random() * 6.28, // shimmer of this bar
              boost: 0
            });
          }
        }
      }
      fill = null; toneFill();
    }

    function amplitude(st, t, kick) {
      if (groove?.on) {
        const live = groove.level(st.xn);
        return .06 + .94 * live * (.75 + .25 * Math.sin(t * st.om + st.ph));
      }
      const x = st.xn * 6.283 + st.row * .7;
      const env = (.6 + .4 * Math.sin(x * .9 - t * 1.25)) * (.72 + .28 * Math.sin(x * 2.3 + t * .8 + st.row));
      const shimmer = .62 + .38 * Math.sin(t * st.om + st.ph);
      return Math.min(1, .12 + .88 * env * shimmer + .2 * kick * env);
    }

    function draw(t) {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.globalCompositeOperation = 'source-over';
      ctx.clearRect(0, 0, W, H);
      const beat = 60 / BPM;
      const kick = reduced ? 0 : Math.exp(-((t % beat) / beat) * 5);
      const R = Math.max(140, W * .14);
      const widen = 1 + state.widen * 2.6;
      const floor = state.level;
      groove?.refresh();
      ctx.lineCap = 'round';

      for (const st of strokes) {
        // has the playhead reached this bar yet?
        let wake = (state.play - st.xn) / .14;
        wake = wake <= 0 ? 0 : wake >= 1 ? 1 : elastic(wake);

        const dx = st.cx - mouse.x, dy = st.cy - mouse.y;
        const near = mouse.on * Math.exp(-(dx * dx + dy * dy) / (2 * R * R));
        st.boost += (near - st.boost) * .12;

        let a = reduced ? .55 : amplitude(st, t, kick);
        a = Math.min(1, a + st.boost * .45);
        a = a + (1 - a) * floor;
        const len = a * wake;

        ctx.globalAlpha = (wake > 0 ? .5 + .5 * Math.max(st.boost, floor) : .22) * (.88 + .12 * kick);
        ctx.lineWidth = st.w * widen;
        ctx.beginPath();
        ctx.moveTo(st.cx - st.hx * len, st.cy - st.hy * len);
        ctx.lineTo(st.cx + st.hx * len, st.cy + st.hy * len);
        ctx.strokeStyle = '#F4EFE7';
        ctx.stroke();
      }

      // fill the strokes with the night
      ctx.globalAlpha = 1;
      if (fill) {
        ctx.globalCompositeOperation = 'source-in';
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.drawImage(fill, 0, 0);
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.globalCompositeOperation = 'source-over';
      }

      // the playhead
      if (state.glow > .01) {
        const px = state.play * W;
        const g = ctx.createLinearGradient(px - 140, 0, px + 40, 0);
        g.addColorStop(0, 'rgba(244,239,231,0)');
        g.addColorStop(.78, `rgba(244,239,231,${(.18 * state.glow).toFixed(3)})`);
        g.addColorStop(1, 'rgba(244,239,231,0)');
        ctx.fillStyle = g; ctx.fillRect(px - 140, 0, 180, H);
        ctx.fillStyle = `rgba(244,239,231,${(.9 * state.glow).toFixed(3)})`;
        ctx.fillRect(px - 1, 0, 2, H);
      }
    }

    layout();
    draw(0);
    if (typeof ResizeObserver !== 'undefined') new ResizeObserver(() => { layout(); draw(gsap.ticker.time); }).observe(canvas);
    if (!reduced) {
      gsap.ticker.add(time => { if (running) draw(time); });
      ScrollTrigger.create({ trigger: canvas.parentElement, start: 'top bottom', end: 'bottom top', onToggle: self => { running = self.isActive; } });
    }

    return {
      state,
      setGroove(g) { groove = g; },
      intro() {
        if (reduced) return;
        gsap.timeline()
          .to(state, { glow: 1, duration: .3, ease: 'power1.out' }, 0)
          .to(state, { play: 1.15, duration: 2.1, ease: 'power2.inOut' }, 0)
          .to(state, { glow: 0, duration: .5 }, 1.75);
      },
      pointer(x, y) { mouse.x = x; mouse.y = y; gsap.to(mouse, { on: 1, duration: .5, overwrite: 'auto' }); },
      leave() { gsap.to(mouse, { on: 0, duration: 1, overwrite: 'auto' }); }
    };
  }

  /* ---------------------------------------------------------
     Preloader → Hero intro
     --------------------------------------------------------- */
  const loader = $('.loader');
  const hero = $('.hero');
  const heroField = createHeroField($('.hero__canvas'));
  const hazeEl = $('.hero__title .haze');
  const hazeText = hazeEl ? hazeEl.textContent : '';
  const plainChars = [];
  $$('.hero__title .line > span:not(.haze)').forEach(el => {
    plainChars.push(...SplitText.create(el, { type: 'chars', charsClass: 'ch' }).chars);
  });

  // "We solve both." decodes out of the pattern's own strokes
  function decode(el, text, duration = 1.1) {
    const GLY = 'I|/\\MN';
    const o = { p: 0 };
    return gsap.to(o, {
      p: 1, duration, ease: 'none',
      onUpdate: () => {
        const n = text.length;
        el.textContent = text.split('').map((ch, i) => {
          if (ch === ' ' || ch === '.') return ch;
          const lock = (i / n) * .7 + .25;
          return o.p >= lock ? ch : GLY[(Math.random() * GLY.length) | 0];
        }).join('');
      },
      onComplete: () => { el.textContent = text; }
    });
  }

  function heroIntro(delay = 0) {
    const tl = gsap.timeline({ delay });
    if (hazeEl) hazeEl.textContent = ' ';
    tl.add(() => heroField?.intro(), 0)
      .fromTo('.hero__photo', { opacity: 0 }, { opacity: 1, duration: 2.4, ease: 'power2.out' }, .4)
      .from(plainChars, { yPercent: 105, opacity: 0, filter: 'blur(10px)', duration: 1.1, stagger: .022, ease: 'expo.out' }, .35)
      .set(hazeEl, { opacity: 1 }, 1.0)
      .add(() => hazeEl && decode(hazeEl, hazeText, 1.1), 1.0)
      .add(() => hazeEl?.classList.add('is-lit'), 2.0)
      .add(() => $('.hero__title')?.classList.add('is-done'), 2.0)
      .from('.hero__eyebrow', { y: 20, opacity: 0, duration: 1 }, .3)
      .from('.hero__lead, .hero__actions > *', { y: 30, opacity: 0, stagger: .08, duration: 1.1 }, 1.3)
      .from('.hero__foot > *', { y: 16, opacity: 0, stagger: .06, duration: .9 }, 1.6)
      .from('.header__inner', { y: -30, opacity: 0, duration: 1 }, 1.4);
    return tl;
  }

  if (loader && !reduced) {
    body.classList.add('is-loading');
    lenis?.stop();
    const bar = buildBeat($('.loader__bar'), { rows: 1, bars: 1, exact: true, preserve: 'xMidYMid meet' });
    const ss = bar.strokes.map(s => s.node);
    ss.forEach(n => n.style.fill = 'var(--paper)');
    const count = $('.loader__count');
    const c = { v: 0 };
    gsap.set(ss, { transformOrigin: '50% 50%' });

    const tl = gsap.timeline({
      onComplete: () => {
        loader.remove();
        body.classList.remove('is-loading');
        lenis?.start();
        ScrollTrigger.refresh();
      }
    });
    tl.from(ss, { scaleY: 0, duration: .7, stagger: .05, ease: 'expo.out' })
      .to(c, { v: 100, duration: 1.1, ease: 'power2.inOut', onUpdate: () => { count.textContent = String(Math.round(c.v)).padStart(2, '0'); } }, 0)
      .to(ss, { scaleY: () => gsap.utils.random(.15, 1), duration: .16, repeat: 5, yoyo: true, stagger: { each: .02, from: 'center' }, ease: 'sine.inOut' })
      .to(ss, { scaleY: .06, duration: .35, ease: 'power3.in' })
      .to(loader, { opacity: 0, duration: .6, ease: 'power2.inOut' }, '-=.05')
      .add(heroIntro(), '-=.45');
  } else {
    loader?.remove();
    if (!reduced) heroIntro(.1);
  }

  /* Sound toggle: a synthesised 124 BPM groove that drives the wave */
  const soundBtn = $('.sound');
  if (soundBtn && heroField) {
    let groove = null;
    soundBtn.addEventListener('click', () => {
      groove = groove || createGroove();
      if (!groove) { soundBtn.hidden = true; return; }
      heroField.setGroove(groove);
      const on = groove.toggle();
      soundBtn.setAttribute('aria-pressed', String(on));
      soundBtn.querySelector('.sound__label').textContent = on ? 'Sound off' : 'Sound on';
    });
  }

  /* Hero: pointer volume, title parallax, and the scroll-pinned reveal */
  if (!reduced) {
    if (finePointer) {
      const glowX = gsap.quickTo('.hero__glow', 'x', { duration: 1.6, ease: 'power3.out' });
      const glowY = gsap.quickTo('.hero__glow', 'y', { duration: 1.6, ease: 'power3.out' });
      const titleX = gsap.quickTo('.hero__title', 'x', { duration: 1.4, ease: 'power3.out' });
      const titleY = gsap.quickTo('.hero__title', 'y', { duration: 1.4, ease: 'power3.out' });
      hero.addEventListener('pointermove', e => {
        const r = hero.getBoundingClientRect();
        heroField?.pointer(e.clientX - r.left, e.clientY - r.top);
        const nx = e.clientX / innerWidth - .5, ny = e.clientY / innerHeight - .5;
        glowX(nx * -180); glowY(ny * -140); titleX(nx * -14); titleY(ny * -8);
      });
      hero.addEventListener('pointerleave', () => heroField?.leave());
    }

    const reveal = gsap.timeline({
      scrollTrigger: { trigger: hero, start: 'top top', end: '+=110%', pin: true, scrub: .9, anticipatePin: 1 }
    });
    if (heroField) {
      reveal.to(heroField.state, { level: 1, ease: 'power2.in', duration: .45 }, 0)
        .to(heroField.state, { widen: 1, ease: 'power2.in', duration: .55 }, .35);
    }
    reveal
      .to('.hero__inner', { yPercent: -12, opacity: 0, filter: 'blur(8px)', ease: 'power1.in', duration: .5 }, .05)
      .to('.hero__foot', { opacity: 0, y: 20, ease: 'none', duration: .3 }, 0)
      .to('.hero__photo', { '--veil': 0, ease: 'none', duration: .4 }, .6)
      .to('.hero__canvas', { opacity: 0, ease: 'none', duration: .25 }, .75)
      .fromTo('.hero__photo img', { scale: 1.04 }, { scale: 1.18, ease: 'none', duration: 1 }, 0)
      .to('.hero__glow', { opacity: 0, ease: 'none', duration: .3 }, 0);
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
      gsap.fromTo(row, { x: (i % 2 ? -1 : 1) * BAR_W * .5 }, { x: (i % 2 ? 1 : -1) * BAR_W * .5, ease: 'none', scrollTrigger: { trigger: '.wedge', start: 'top bottom', end: 'bottom top', scrub: true } });
    });
  }

  /* ---------------------------------------------------------
     Photos: collage parallax, masked reveals, slow zooms
     --------------------------------------------------------- */
  if (!reduced) {
    $$('.ph').forEach(f => {
      const sp = +f.dataset.speed || 0;
      const img = f.querySelector('img');
      gsap.fromTo(f, { y: () => -sp * innerHeight }, { y: () => sp * innerHeight, ease: 'none', scrollTrigger: { trigger: '.night', start: 'top bottom', end: 'bottom top', scrub: true, invalidateOnRefresh: true } });
      gsap.from(f, { clipPath: 'inset(100% 0% 0% 0%)', duration: 1.6, ease: 'expo.inOut', scrollTrigger: { trigger: f, start: 'top 95%' } });
      gsap.fromTo(img, { scale: 1.35 }, { scale: 1.05, ease: 'none', scrollTrigger: { trigger: '.night', start: 'top bottom', end: 'bottom top', scrub: true } });
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
    applyBeat.rows.forEach((row, i) => gsap.fromTo(row, { x: (i % 2 ? 1 : -1) * BAR_W * .4 }, { x: 0, ease: 'none', scrollTrigger: { trigger: '.apply', start: 'top bottom', end: 'bottom bottom', scrub: true } }));
  }
  if (!reduced) {
    const footBeat = beats.get($('.footer__beat'));
    footBeat?.rows.forEach((row, i) => gsap.fromTo(row, { x: (i % 2 ? -1 : 1) * BAR_W * .5 }, { x: 0, ease: 'none', scrollTrigger: { trigger: '.footer', start: 'top bottom', end: 'bottom bottom', scrub: true } }));
    gsap.from('.footer__claim', { y: 40, opacity: 0, duration: 1.2, scrollTrigger: { trigger: '.footer', start: 'top 85%' } });
  }

  /* ---------------------------------------------------------
     Scroll velocity bends the photos; nav links scramble on hover
     --------------------------------------------------------- */
  if (!reduced) {
    const bendEls = $$('.ph, .side__photo, .poster');
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

    const GLYPHS = 'IMN/\\|';
    $$('.nav a, .footer__nav a').forEach(a => {
      const text = a.textContent;
      let raf = 0;
      a.addEventListener('pointerenter', () => {
        cancelAnimationFrame(raf);
        const t0 = performance.now();
        const step = now => {
          const p = Math.min(1, (now - t0) / 420);
          const keep = Math.floor(p * text.length);
          a.textContent = text.split('').map((ch, i) => (i < keep || ch === ' ' ? ch : GLYPHS[(Math.random() * GLYPHS.length) | 0])).join('');
          if (p < 1) raf = requestAnimationFrame(step); else a.textContent = text;
        };
        raf = requestAnimationFrame(step);
      });
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
        if (hasGSAP && !reduced) gsap.fromTo(btn, { scale: .94 }, { scale: 1, duration: .8, ease: 'elastic.out(1, .4)' });
      }
    });

    $$('input, textarea', form).forEach(i => i.addEventListener('input', () => i.closest('.field')?.classList.remove('is-invalid')));
  }
})();
