/* LED dot-matrix image renderer.
   Finds every `.dot-portrait` wrapper, samples the image inside it on a
   regular grid, reduces the palette to a few dozen colours and redraws it
   as round lit dots on a black panel.

   data-pitch  : grid spacing in CSS px (default 3 → ~100 dots across 320px)
   data-lift   : brightness lift, gamma style (default 1.15)
   data-sat    : saturation multiplier (default 1.5)
   data-crop   : x,y,w,h fractions of the photo to use (default: whole photo)
   data-levels : "off" to skip the automatic contrast stretch
   data-bg     : colour behind transparent pixels of a cut-out PNG (default black = unlit)
   data-colors : palette size after quantisation (default 28)
   data-gap    : gap between dots as a fraction of the pitch (default 0.2)
   data-dark   : luminance (0–255) below which a cell stays unlit (default 16)
*/
(function () {
  'use strict';

  var reduceMotion = window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

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

  /* brighten with a gamma-style lift so the black gaps between dots
     do not make the whole picture read darker than the photo */
  function lift(c, amount) {
    return [
      clamp255(255 * Math.pow(c[0] / 255, 1 / amount)),
      clamp255(255 * Math.pow(c[1] / 255, 1 / amount)),
      clamp255(255 * Math.pow(c[2] / 255, 1 / amount))
    ];
  }

  /* k-means in RGB, seeded by luminance so the palette spans dark → light */
  function kmeans(samples, k, iterations) {
    var sorted = samples.slice().sort(function (a, b) { return lum(a) - lum(b); });
    var centers = [], i, j, n;
    for (i = 0; i < k; i++) {
      var pick = Math.min(sorted.length - 1, Math.floor((i + 0.5) * sorted.length / k));
      centers.push(sorted[pick].slice());
    }
    var assign = new Int16Array(samples.length);
    for (var it = 0; it < iterations; it++) {
      var sums = [];
      for (j = 0; j < k; j++) sums.push([0, 0, 0, 0]);
      for (n = 0; n < samples.length; n++) {
        var c = samples[n], best = 0, bestD = Infinity;
        for (j = 0; j < k; j++) {
          var e = centers[j];
          var dr = c[0] - e[0], dg = c[1] - e[1], db = c[2] - e[2];
          var d = dr * dr + dg * dg + db * db;
          if (d < bestD) { bestD = d; best = j; }
        }
        assign[n] = best;
        var s = sums[best];
        s[0] += c[0]; s[1] += c[1]; s[2] += c[2]; s[3]++;
      }
      for (j = 0; j < k; j++) {
        if (sums[j][3] > 0) {
          centers[j] = [sums[j][0] / sums[j][3], sums[j][1] / sums[j][3], sums[j][2] / sums[j][3]];
        }
      }
    }
    return { centers: centers, assign: assign };
  }

  /* stretch brightness so the 1st..99th luminance percentile spans 0..255.
     All three channels get the same scale, so hues are preserved; faded
     photos otherwise turn into a wall of grey dots */
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
     the source image; the result is then cover-fitted to the grid. */
  function sampleGrid(img, cols, rows, crop, bg) {
    var iw = img.naturalWidth, ih = img.naturalHeight;
    var sx = 0, sy = 0, sw = iw, sh = ih;
    if (crop) { sx = crop[0] * iw; sy = crop[1] * ih; sw = crop[2] * iw; sh = crop[3] * ih; }
    var targetAspect = cols / rows, srcAspect = sw / sh;
    if (srcAspect > targetAspect) { var nw = sh * targetAspect; sx += (sw - nw) / 2; sw = nw; }
    else if (srcAspect < targetAspect) { sh = sw / targetAspect; }

    var mid = document.createElement('canvas');
    mid.width = cols * 4; mid.height = rows * 4;
    var mctx = mid.getContext('2d');
    mctx.imageSmoothingEnabled = true; mctx.imageSmoothingQuality = 'high';
    /* transparent areas (e.g. a cut-out portrait) take the panel colour */
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
    var img = wrapper.querySelector('img');
    if (!img || !img.naturalWidth) return;

    var pitch = parseFloat(wrapper.getAttribute('data-pitch')) || 3;
    var k = parseInt(wrapper.getAttribute('data-colors'), 10) || 28;
    var gap = parseFloat(wrapper.getAttribute('data-gap'));
    if (isNaN(gap)) gap = 0.18;
    var dark = parseFloat(wrapper.getAttribute('data-dark'));
    if (isNaN(dark)) dark = 16;
    var lift_ = parseFloat(wrapper.getAttribute('data-lift'));
    if (isNaN(lift_)) lift_ = 1.15;
    var sat_ = parseFloat(wrapper.getAttribute('data-sat'));
    if (isNaN(sat_)) sat_ = 1.5;

    var canvas = wrapper.querySelector('canvas.dot-canvas');
    if (!canvas) {
      canvas = document.createElement('canvas');
      canvas.className = 'dot-canvas';
      canvas.setAttribute('aria-hidden', 'true');
      wrapper.insertBefore(canvas, wrapper.firstChild);
    }

    var cssW = canvas.clientWidth || wrapper.clientWidth;
    var cssH = canvas.clientHeight || cssW;
    if (!cssW || !cssH) return;

    var cols = Math.max(8, Math.round(cssW / pitch));
    var rows = Math.max(8, Math.round(cssH / pitch));
    var dpr = Math.min(window.devicePixelRatio || 1, 3);
    canvas.width = Math.round(cssW * dpr);
    canvas.height = Math.round(cssH * dpr);

    var crop = null, cropAttr = wrapper.getAttribute('data-crop');
    if (cropAttr) {
      crop = cropAttr.split(',').map(parseFloat);
      if (crop.length !== 4 || crop.some(isNaN)) crop = null;
    }

    var data = sampleGrid(img, cols, rows, crop, wrapper.getAttribute('data-bg'));
    var samples = new Array(cols * rows);
    for (var n = 0; n < cols * rows; n++) {
      samples[n] = [data[n * 4], data[n * 4 + 1], data[n * 4 + 2]];
    }
    if (wrapper.getAttribute('data-levels') !== 'off') autoLevels(samples);
    /* brighten and saturate before clustering so greens and greys land in
       different palette entries instead of averaging into mud */
    for (n = 0; n < samples.length; n++) samples[n] = saturate(lift(samples[n], lift_), sat_);
    var q = kmeans(samples, k, 8);
    var palette = q.centers.map(function (c) {
      return { rgb: 'rgb(' + Math.round(c[0]) + ',' + Math.round(c[1]) + ',' + Math.round(c[2]) + ')', lit: lum(c) >= dark };
    });

    var ctx = canvas.getContext('2d');
    var cellW = canvas.width / cols, cellH = canvas.height / rows;
    var r = Math.min(cellW, cellH) * (1 - gap) / 2;
    var TAU = Math.PI * 2;

    function draw(progress) {
      ctx.globalAlpha = 1;
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      for (var y = 0; y < rows; y++) {
        for (var x = 0; x < cols; x++) {
          var p = palette[q.assign[y * cols + x]];
          if (!p.lit) continue;
          var a = 1;
          if (progress < 1) {
            var t = (x / cols + y / rows) / 2;        /* diagonal sweep */
            a = (progress * 1.25 - t) / 0.25;
            if (a <= 0) continue;
            if (a > 1) a = 1;
          }
          ctx.globalAlpha = a;
          ctx.fillStyle = p.rgb;
          ctx.beginPath();
          ctx.arc((x + 0.5) * cellW, (y + 0.5) * cellH, r, 0, TAU);
          ctx.fill();
        }
      }
      ctx.globalAlpha = 1;
    }

    if (!animate || reduceMotion) {
      draw(1);
    } else {
      var start = null, duration = 1200;
      var frame = function (ts) {
        if (start === null) start = ts;
        var p = Math.min(1, (ts - start) / duration);
        draw(p);
        if (p < 1) requestAnimationFrame(frame);
      };
      requestAnimationFrame(frame);
    }
    wrapper.classList.add('is-ready');
  }

  function setup(wrapper) {
    var img = wrapper.querySelector('img');
    if (!img) return;

    var booted = false;
    var go = function () {
      render(wrapper, !booted);
      booted = true;
    };

    if (img.complete && img.naturalWidth) go();
    else img.addEventListener('load', go, { once: true });

    /* re-render when the layout changes size (e.g. phone rotation) */
    var timer = null, lastW = wrapper.clientWidth;
    var onResize = function () {
      if (wrapper.clientWidth === lastW) return;
      lastW = wrapper.clientWidth;
      clearTimeout(timer);
      timer = setTimeout(function () { if (booted) render(wrapper, false); }, 120);
    };
    if (window.ResizeObserver) new ResizeObserver(onResize).observe(wrapper);
    else window.addEventListener('resize', onResize);
  }

  function init() {
    var wrappers = document.querySelectorAll('.dot-portrait');
    for (var i = 0; i < wrappers.length; i++) setup(wrappers[i]);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
