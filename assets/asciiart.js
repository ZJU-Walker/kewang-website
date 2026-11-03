/* Colour ASCII portrait renderer.
   Finds every `.dot-portrait` wrapper, samples the photo inside it on a
   character grid and redraws it as monospace glyphs on a black panel: the
   glyph is chosen by brightness (dense glyphs for bright cells) and painted
   in the cell's own colour.

   data-cols   : characters across the panel (default 140)
   data-weight : glyph weight, 400 or 700 (default 700)
   data-font   : font family (default "JetBrains Mono", monospace)
   data-lift   : brightness lift, gamma style (default 1.5)
   data-sat    : saturation multiplier (default 1.5)
   data-gain   : overall brightness multiplier on the glyph colours (default 1)
   data-crop   : x,y,w,h fractions of the photo to use (default: whole photo)
   data-levels : "off" to skip the automatic contrast stretch
   data-bg     : colour behind transparent pixels of a cut-out PNG (default black)
   data-src    : photo URL; use this instead of an <img> so nothing shows before the glyphs
   data-ramp   : glyph ramp from empty to dense (default: classic 70-glyph ramp)
*/
(function () {
  'use strict';

  var reduceMotion = window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var RAMP = " .'`^\",:;Il!i><~+_-?][}{1)(|\\/tfjrxnuvczXYUJCLQ0OZmwqpdbkhao*#MW&8%B@$";

  function lum(c) { return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]; }
  function clamp255(v) { return v < 0 ? 0 : v > 255 ? 255 : v; }

  function saturate(c, amount) {
    var g = lum(c);
    return [
      clamp255(g + (c[0] - g) * amount),
      clamp255(g + (c[1] - g) * amount),
      clamp255(g + (c[2] - g) * amount)
    ];
  }

  /* brighten with a gamma-style lift so the black between glyph strokes
     does not make the whole picture read darker than the photo */
  function lift(c, amount) {
    return [
      clamp255(255 * Math.pow(c[0] / 255, 1 / amount)),
      clamp255(255 * Math.pow(c[1] / 255, 1 / amount)),
      clamp255(255 * Math.pow(c[2] / 255, 1 / amount))
    ];
  }

  /* stretch brightness so the 1st..99th luminance percentile spans 0..255.
     All three channels get the same scale, so hues are preserved */
  function autoLevels(samples) {
    var n = samples.length, i, ch;
    var l = new Array(n);
    for (i = 0; i < n; i++) l[i] = lum(samples[i]);
    l.sort(function (a, b) { return a - b; });
    var lo = l[Math.floor(n * 0.01)], hi = l[Math.floor(n * 0.99)];
    if (hi - lo < 32) return;
    var scale = 255 / (hi - lo);
    for (i = 0; i < n; i++) {
      for (ch = 0; ch < 3; ch++) samples[i][ch] = clamp255((samples[i][ch] - lo) * scale);
    }
  }

  /* average colour per grid cell. `crop` is [x, y, w, h] as fractions of
     the source image; the result is cover-fitted to `aspect` (the panel's
     width / height, since character cells are not square). */
  function sampleGrid(img, cols, rows, aspect, crop, bg) {
    var iw = img.naturalWidth, ih = img.naturalHeight;
    var sx = 0, sy = 0, sw = iw, sh = ih;
    if (crop) { sx = crop[0] * iw; sy = crop[1] * ih; sw = crop[2] * iw; sh = crop[3] * ih; }
    var srcAspect = sw / sh;
    if (srcAspect > aspect) { var nw = sh * aspect; sx += (sw - nw) / 2; sw = nw; }
    else if (srcAspect < aspect) { var nh = sw / aspect; sy += (sh - nh) / 2; sh = nh; }

    var mid = document.createElement('canvas');
    mid.width = cols * 3; mid.height = rows * 3;
    var mctx = mid.getContext('2d');
    mctx.imageSmoothingEnabled = true; mctx.imageSmoothingQuality = 'high';
    mctx.fillStyle = bg || '#000';
    mctx.fillRect(0, 0, mid.width, mid.height);
    mctx.drawImage(img, sx, sy, sw, sh, 0, 0, mid.width, mid.height);

    var small = document.createElement('canvas');
    small.width = cols; small.height = rows;
    var sctx = small.getContext('2d');
    sctx.imageSmoothingEnabled = true; sctx.imageSmoothingQuality = 'high';
    sctx.drawImage(mid, 0, 0, cols, rows);
    return sctx.getImageData(0, 0, cols, rows).data;
  }

  function render(wrapper, animate) {
    var img = wrapper._dotImage || wrapper.querySelector('img');
    if (!img || !img.naturalWidth) return;

    var cols = parseInt(wrapper.getAttribute('data-cols'), 10) || 140;
    var weight = wrapper.getAttribute('data-weight') || '700';
    var family = wrapper.getAttribute('data-font') || '"JetBrains Mono", monospace';
    var ramp = wrapper.getAttribute('data-ramp') || RAMP;
    var lift_ = parseFloat(wrapper.getAttribute('data-lift'));
    if (isNaN(lift_)) lift_ = 1.5;
    var sat_ = parseFloat(wrapper.getAttribute('data-sat'));
    if (isNaN(sat_)) sat_ = 1.5;
    var gain = parseFloat(wrapper.getAttribute('data-gain'));
    if (isNaN(gain)) gain = 1;

    var canvas = wrapper.querySelector('canvas.dot-canvas');
    if (!canvas) {
      canvas = document.createElement('canvas');
      canvas.className = 'dot-canvas';
      canvas.setAttribute('aria-hidden', 'true');
      wrapper.insertBefore(canvas, wrapper.firstChild);
    }

    /* a re-render (resize, rotation) must stop the previous boot sweep */
    if (wrapper._raf) { cancelAnimationFrame(wrapper._raf); wrapper._raf = null; }

    var cssW = canvas.clientWidth || wrapper.clientWidth;
    var cssH = canvas.clientHeight || cssW;
    if (!cssW || !cssH) return;
    wrapper._drawnW = cssW; wrapper._drawnH = cssH;
    var dpr = Math.min(window.devicePixelRatio || 1, 3);
    wrapper._drawnDpr = dpr;
    canvas.width = Math.round(cssW * dpr);
    canvas.height = Math.round(cssH * dpr);

    var ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    /* cell size from the font's real advance width, so the grid fills the
       panel exactly whatever monospace face ends up being used */
    var cellW = cssW / cols;
    ctx.font = weight + ' 10px ' + family;
    var adv = ctx.measureText('M').width / 10 || 0.6;
    var fontSize = cellW / adv;
    var cellH = fontSize;                       /* line pitch 1.0 */
    var rows = Math.max(8, Math.round(cssH / cellH));
    cellH = cssH / rows;
    ctx.font = weight + ' ' + fontSize.toFixed(3) + 'px ' + family;
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'center';

    var crop = null, cropAttr = wrapper.getAttribute('data-crop');
    if (cropAttr) {
      crop = cropAttr.split(',').map(parseFloat);
      if (crop.length !== 4 || crop.some(isNaN)) crop = null;
    }

    var data = sampleGrid(img, cols, rows, cssW / cssH, crop, wrapper.getAttribute('data-bg'));
    var n, total = cols * rows;
    var samples = new Array(total);
    for (n = 0; n < total; n++) samples[n] = [data[n * 4], data[n * 4 + 1], data[n * 4 + 2]];
    if (wrapper.getAttribute('data-levels') !== 'off') autoLevels(samples);

    /* precompute glyph + colour per cell */
    var glyphs = new Array(total), colors = new Array(total);
    for (n = 0; n < total; n++) {
      var l = lum(samples[n]);
      var idx = Math.min(ramp.length - 1, Math.floor(l / 256 * ramp.length));
      var g = ramp.charAt(idx);
      glyphs[n] = g === ' ' ? null : g;
      var c = saturate(lift(samples[n], lift_), sat_);
      if (gain !== 1) c = [clamp255(c[0] * gain), clamp255(c[1] * gain), clamp255(c[2] * gain)];
      colors[n] = 'rgb(' + Math.round(c[0]) + ',' + Math.round(c[1]) + ',' + Math.round(c[2]) + ')';
    }

    /* draw every glyph once into an offscreen buffer; the boot sweep then
       only composites that buffer, so a 300+ column grid animates smoothly */
    var buf = document.createElement('canvas');
    buf.width = canvas.width; buf.height = canvas.height;
    var bctx = buf.getContext('2d');
    bctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    bctx.fillStyle = '#000';
    bctx.fillRect(0, 0, cssW, cssH);
    bctx.font = ctx.font;
    bctx.textBaseline = 'middle';
    bctx.textAlign = 'center';
    for (var y = 0; y < rows; y++) {
      for (var x = 0; x < cols; x++) {
        var i = y * cols + x;
        if (!glyphs[i]) continue;
        bctx.fillStyle = colors[i];
        bctx.fillText(glyphs[i], (x + 0.5) * cellW, (y + 0.5) * cellH);
      }
    }

    function draw(progress) {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.globalAlpha = 1;
      ctx.drawImage(buf, 0, 0);
      if (progress < 1) {
        /* diagonal sweep: a black-to-transparent gradient that slides
           from the top-left corner to the bottom-right one */
        var head = progress * 1.25, tail = head - 0.25;
        var gx = canvas.width, gy = canvas.height;
        var grad = ctx.createLinearGradient(0, 0, gx, gy);
        var t0 = Math.max(0, Math.min(1, tail)), t1 = Math.max(0, Math.min(1, head));
        grad.addColorStop(0, 'rgba(0,0,0,0)');
        grad.addColorStop(t0, 'rgba(0,0,0,0)');
        grad.addColorStop(t1, 'rgba(0,0,0,1)');
        grad.addColorStop(1, 'rgba(0,0,0,1)');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }
    }

    if (!animate || reduceMotion) {
      draw(1);
    } else {
      var start = null, duration = 1200;
      var frame = function (ts) {
        if (start === null) start = ts;
        var p = Math.min(1, (ts - start) / duration);
        draw(p);
        wrapper._raf = p < 1 ? requestAnimationFrame(frame) : null;
      };
      wrapper._raf = requestAnimationFrame(frame);
    }
    wrapper.classList.add('is-ready');
  }

  /* resolve once the glyph font is usable, or after a short grace period
     so a slow font download can never leave the panel blank */
  function fontReady(wrapper) {
    var weight = wrapper.getAttribute('data-weight') || '700';
    var family = wrapper.getAttribute('data-font') || '"JetBrains Mono", monospace';
    if (!document.fonts || !document.fonts.load) return Promise.resolve();
    var timeout = new Promise(function (res) { setTimeout(res, 2500); });
    return Promise.race([document.fonts.load(weight + ' 10px ' + family).catch(function () {}), timeout]);
  }

  function setup(wrapper) {
    var img = wrapper.querySelector('img');
    if (!img) {
      /* no <img> in the page: load the photo off-DOM so it can never flash */
      var src = wrapper.getAttribute('data-src');
      if (!src) return;
      img = new Image();
      img.decoding = 'async';
      img.src = src;
      wrapper._dotImage = img;
    }

    var booted = false;
    var go = function () {
      render(wrapper, !booted);
      booted = true;
    };

    var imgReady = new Promise(function (res) {
      if (img.complete && img.naturalWidth) res();
      else img.addEventListener('load', res, { once: true });
    });
    Promise.all([imgReady, fontReady(wrapper)]).then(go);

    /* re-render whenever the drawn canvas no longer matches its layout
       size: phone rotation, the address bar collapsing, fonts arriving,
       a zoom change, or the page coming back from the tab switcher */
    var timer = null;
    var stale = function () {
      var c = wrapper.querySelector('canvas.dot-canvas');
      if (!c) return true;
      var dpr = Math.min(window.devicePixelRatio || 1, 3);
      return c.clientWidth !== wrapper._drawnW || c.clientHeight !== wrapper._drawnH ||
             dpr !== wrapper._drawnDpr;
    };
    var check = function () {
      if (!booted || !stale()) return;
      clearTimeout(timer);
      timer = setTimeout(function () { if (stale()) render(wrapper, false); }, 120);
    };
    if (window.ResizeObserver) new ResizeObserver(check).observe(wrapper);
    window.addEventListener('resize', check);
    window.addEventListener('orientationchange', check);
    window.addEventListener('pageshow', check);
    document.addEventListener('visibilitychange', function () {
      if (document.visibilityState === 'visible') check();
    });
    /* the real font arriving after a fallback render: redraw once */
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(function () { if (booted) render(wrapper, false); });
    }
  }

  function init() {
    var wrappers = document.querySelectorAll('.dot-portrait');
    for (var i = 0; i < wrappers.length; i++) setup(wrappers[i]);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
