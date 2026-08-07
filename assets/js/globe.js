/* Visitor globe — a draggable engraved-line orthographic globe in the site palette.
   Coast data: assets/js/globe-land.js (Int16Array rings; 32767,32767 separators).
   Visit data: JSON { points: [{ lat, lon, count, label }] } from data-stats URL. */
(function () {
  'use strict';

  var mount = document.getElementById('visitor-globe');
  if (!mount || !window.__GLOBE_COAST__) return;

  /* Each theme: an eggshell orb with a soft upper-left highlight, coastlines
     drawn as the engraved line (a wide faint bleed under a crisp stroke),
     a quiet graticule with a bordeaux equator, and an instrument ring with
     degree ticks that stays fixed while the globe turns inside it. */
  var PALETTES = {
    day: {
      orb: [
        [0.0, 'rgba(255, 254, 250, 0.95)'],
        [0.45, 'rgba(246, 242, 234, 0.6)'],
        [0.82, 'rgba(236, 229, 217, 0.55)'],
        [1.0, 'rgba(209, 198, 181, 0.65)']
      ],
      limb: 'rgba(78, 66, 52, 0.11)',
      rim: 'rgba(78, 66, 52, 0.7)',
      rimInner: 'rgba(78, 66, 52, 0.25)',
      tick: 'rgba(78, 66, 52, 0.5)',
      graticule: 'rgba(110, 103, 96, 0.16)',
      equator: 'rgba(110, 38, 57, 0.34)',
      coastHalo: 'rgba(87, 75, 60, 0.1)',
      coast: 'rgba(60, 51, 40, 0.8)',
      pole: 'rgba(110, 38, 57, 0.55)',
      marker: '#6e2639',
      halo: 'rgba(110, 38, 57, 0.15)',
      refDot: 'rgba(33, 30, 25, 0.8)',
      refLabel: 'rgba(60, 51, 40, 0.85)',
      refHalo: 'rgba(250, 249, 245, 0.78)'
    },
    night: {
      orb: [
        [0.0, 'rgba(255, 244, 230, 0.10)'],
        [0.45, 'rgba(255, 244, 230, 0.05)'],
        [0.82, 'rgba(20, 16, 12, 0.12)'],
        [1.0, 'rgba(0, 0, 0, 0.34)']
      ],
      limb: 'rgba(0, 0, 0, 0.22)',
      rim: 'rgba(212, 202, 185, 0.7)',
      rimInner: 'rgba(212, 202, 185, 0.25)',
      tick: 'rgba(212, 202, 185, 0.5)',
      graticule: 'rgba(199, 138, 153, 0.15)',
      equator: 'rgba(199, 138, 153, 0.38)',
      coastHalo: 'rgba(226, 218, 202, 0.12)',
      coast: 'rgba(233, 226, 212, 0.82)',
      pole: 'rgba(199, 138, 153, 0.6)',
      marker: '#c78a99',
      halo: 'rgba(199, 138, 153, 0.2)',
      refDot: 'rgba(236, 231, 221, 0.85)',
      refLabel: 'rgba(226, 218, 202, 0.85)',
      refHalo: 'rgba(30, 27, 23, 0.75)'
    }
  };

  /* reference cities: quiet gazetteer marks that make the globe readable */
  var REF = [
    { name: 'Mountain View', lat: 37.39, lon: -122.08 },
    { name: 'Atlanta', lat: 33.75, lon: -84.39 },
    { name: 'Beijing', lat: 39.9, lon: 116.4 },
    { name: 'London', lat: 51.51, lon: -0.13 },
    { name: 'Tokyo', lat: 35.68, lon: 139.69 },
    { name: 'Sydney', lat: -33.87, lon: 151.21 }
  ];
  (function () {
    for (var i = 0; i < REF.length; i++) {
      var la = REF[i].lat * Math.PI / 180;
      var lo = REF[i].lon * Math.PI / 180;
      REF[i].x = Math.cos(la) * Math.cos(lo);
      REF[i].y = Math.cos(la) * Math.sin(lo);
      REF[i].z = Math.sin(la);
    }
  })();

  function palette() {
    return document.documentElement.getAttribute('data-theme') === 'dark'
      ? PALETTES.night
      : PALETTES.day;
  }

  var canvas = document.createElement('canvas');
  var caption = document.createElement('div');
  var tooltip = document.createElement('div');
  caption.className = 'visitor-globe__caption';
  tooltip.className = 'visitor-globe__tooltip';
  tooltip.style.display = 'none';
  mount.appendChild(canvas);
  mount.appendChild(caption);
  mount.appendChild(tooltip);

  var ctx = canvas.getContext('2d');

  /* coastline rings as unit vectors */
  var coast = [];
  (function () {
    var cr = window.__GLOBE_COAST__;
    var cur = [];
    for (var ci = 0; ci < cr.length; ci += 2) {
      if (cr[ci] === 32767) {
        if (cur.length >= 9) coast.push(new Float32Array(cur));
        cur = [];
        continue;
      }
      var lon = (cr[ci] / 10) * Math.PI / 180;
      var lat = (cr[ci + 1] / 10) * Math.PI / 180;
      cur.push(Math.cos(lat) * Math.cos(lon), Math.cos(lat) * Math.sin(lon), Math.sin(lat));
    }
  })();

  var markers = [];
  var maxCount = 1;

  var size = 0;
  var dpr = Math.min(window.devicePixelRatio || 1, 2);
  function resize() {
    var w = Math.min(mount.clientWidth || 190, 260);
    if (w <= 0 || w === size) return;
    size = w;
    canvas.width = w * dpr;
    canvas.height = w * dpr;
    canvas.style.width = w + 'px';
    canvas.style.height = w + 'px';
    needsRender = true;
  }

  /* view state: spin (around the poles) and tilt (pitch toward the viewer) */
  var spin = -1.62;   /* opens on the Americas–Atlantic face */
  var tilt = 0.42;
  var vSpin = 0;
  var dragging = false;
  var reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var AUTO = reduced ? 0 : 0.0016;
  var needsRender = true;

  function project(x, y, z, out) {
    var cs = Math.cos(spin), ss = Math.sin(spin);
    var x1 = x * cs - y * ss;
    var y1 = x * ss + y * cs;
    var ct = Math.cos(tilt), st = Math.sin(tilt);
    var x2 = x1 * ct + z * st;
    var z2 = -x1 * st + z * ct;
    out[0] = y1;
    out[1] = -z2;
    out[2] = x2;
  }

  var P = [0, 0, 0];
  var screenMarkers = [];

  function strokeCircleOnSphere(c, R, latDeg, lonDeg, isParallel) {
    /* one parallel (fixed lat) or meridian (fixed lon), backface-culled */
    var first = true, a, lat, lon;
    for (a = isParallel ? 0 : -84; a <= (isParallel ? 360 : 84); a += 4) {
      lat = (isParallel ? latDeg : a) * Math.PI / 180;
      lon = (isParallel ? a : lonDeg) * Math.PI / 180;
      project(Math.cos(lat) * Math.cos(lon), Math.cos(lat) * Math.sin(lon), Math.sin(lat), P);
      if (P[2] <= 0.01) { first = true; continue; }
      var gx = c + P[0] * R, gy = c + P[1] * R;
      if (first) { ctx.moveTo(gx, gy); first = false; } else { ctx.lineTo(gx, gy); }
    }
  }

  function render() {
    var pal = palette();
    var w = size;
    var c = w / 2;
    var R = w / 2 - 7;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, w);

    /* the orb: soft top-left highlight rolling into a shaded limb */
    var g = ctx.createRadialGradient(c - R * 0.42, c - R * 0.46, R * 0.08, c, c, R);
    for (var s0 = 0; s0 < pal.orb.length; s0++) g.addColorStop(pal.orb[s0][0], pal.orb[s0][1]);
    ctx.beginPath();
    ctx.arc(c, c, R, 0, 2 * Math.PI);
    ctx.fillStyle = g;
    ctx.fill();

    /* limb darkening: a narrow ring just inside the edge */
    var lg = ctx.createRadialGradient(c, c, R * 0.82, c, c, R);
    lg.addColorStop(0, 'rgba(0,0,0,0)');
    lg.addColorStop(1, pal.limb);
    ctx.beginPath();
    ctx.arc(c, c, R, 0, 2 * Math.PI);
    ctx.fillStyle = lg;
    ctx.fill();

    /* graticule: quiet parallels and meridians */
    var b;
    ctx.lineWidth = 0.85;
    ctx.strokeStyle = pal.graticule;
    ctx.beginPath();
    for (b = -60; b <= 60; b += 30) if (b !== 0) strokeCircleOnSphere(c, R, b, 0, true);
    for (b = 0; b < 360; b += 45) strokeCircleOnSphere(c, R, 0, b, false);
    ctx.stroke();

    /* the equator carries the accent: one bordeaux line around the world */
    ctx.lineWidth = 1.1;
    ctx.strokeStyle = pal.equator;
    ctx.beginPath();
    strokeCircleOnSphere(c, R, 0, 0, true);
    ctx.stroke();

    /* coastlines: a wide faint ink-bleed under a crisp engraved stroke */
    var cs = Math.cos(spin), ss = Math.sin(spin);
    var ct = Math.cos(tilt), st = Math.sin(tilt);
    var pass, r0, ring, pen, k;
    for (pass = 0; pass < 2; pass++) {
      ctx.lineWidth = pass === 0 ? 3.2 : 1.05;
      ctx.strokeStyle = pass === 0 ? pal.coastHalo : pal.coast;
      ctx.lineJoin = 'round';
      ctx.beginPath();
      for (r0 = 0; r0 < coast.length; r0++) {
        ring = coast[r0];
        pen = false;
        for (k = 0; k < ring.length; k += 3) {
          var x1 = ring[k] * cs - ring[k + 1] * ss;
          var y1 = ring[k] * ss + ring[k + 1] * cs;
          var depth = x1 * ct + ring[k + 2] * st;
          if (depth <= 0.01) { pen = false; continue; }
          var sx = c + y1 * R;
          var sy = c - (-x1 * st + ring[k + 2] * ct) * R;
          if (pen) ctx.lineTo(sx, sy); else { ctx.moveTo(sx, sy); pen = true; }
        }
      }
      ctx.stroke();
    }

    /* pole marks: tiny accent diamonds at the axis */
    for (var pp = -1; pp <= 1; pp += 2) {
      project(0, 0, pp, P);
      if (P[2] <= 0.02) continue;
      var pxx = c + P[0] * R, pyy = c + P[1] * R;
      ctx.save();
      ctx.translate(pxx, pyy);
      ctx.rotate(Math.PI / 4);
      ctx.fillStyle = pal.pole;
      ctx.fillRect(-1.6, -1.6, 3.2, 3.2);
      ctx.restore();
    }

    /* the instrument ring: double rule + degree ticks, fixed while the globe turns */
    ctx.beginPath();
    ctx.arc(c, c, R, 0, 2 * Math.PI);
    ctx.lineWidth = 1.6;
    ctx.strokeStyle = pal.rim;
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(c, c, R + 4, 0, 2 * Math.PI);
    ctx.lineWidth = 0.8;
    ctx.strokeStyle = pal.rimInner;
    ctx.stroke();
    ctx.lineWidth = 1;
    ctx.strokeStyle = pal.tick;
    ctx.beginPath();
    for (var t0 = 0; t0 < 360; t0 += 10) {
      var ang = t0 * Math.PI / 180;
      var t1 = R + (t0 % 30 === 0 ? 4 : 2.2);
      ctx.moveTo(c + Math.cos(ang) * R, c + Math.sin(ang) * R);
      ctx.lineTo(c + Math.cos(ang) * t1, c + Math.sin(ang) * t1);
    }
    ctx.stroke();

    /* reference cities: small ink squares with italic gazetteer labels,
       fading in away from the limb, label flipped inward near the edge */
    ctx.font = 'italic 8.5px "Source Serif 4", Georgia, serif';
    ctx.textBaseline = 'middle';
    for (var rc = 0; rc < REF.length; rc++) {
      project(REF[rc].x, REF[rc].y, REF[rc].z, P);
      if (P[2] <= 0.12) continue;
      var fade = Math.min(1, (P[2] - 0.12) / 0.22);
      var rx = c + P[0] * R;
      var ry = c + P[1] * R;
      ctx.globalAlpha = fade;
      ctx.fillStyle = pal.refDot;
      ctx.fillRect(rx - 1.3, ry - 1.3, 2.6, 2.6);
      var onRight = rx > c;
      ctx.textAlign = onRight ? 'right' : 'left';
      var lx = onRight ? rx - 5 : rx + 5;
      ctx.lineWidth = 2.4;
      ctx.strokeStyle = pal.refHalo;
      ctx.strokeText(REF[rc].name, lx, ry - 0.5);
      ctx.fillStyle = pal.refLabel;
      ctx.fillText(REF[rc].name, lx, ry - 0.5);
      ctx.globalAlpha = 1;
    }

    /* visitor markers: bordeaux diamonds sized by count */
    screenMarkers.length = 0;
    for (var m = 0; m < markers.length; m++) {
      var mk = markers[m];
      project(mk.x, mk.y, mk.z, P);
      if (P[2] <= 0.02) continue;
      var mx = c + P[0] * R;
      var my = c + P[1] * R;
      var s = 3.1 + 4.6 * Math.sqrt(mk.count / maxCount);
      ctx.save();
      ctx.translate(mx, my);
      ctx.rotate(Math.PI / 4);
      ctx.fillStyle = pal.halo;
      ctx.fillRect(-s, -s, 2 * s, 2 * s);
      ctx.fillStyle = pal.marker;
      ctx.fillRect(-s / 2, -s / 2, s, s);
      ctx.restore();
      screenMarkers.push({ x: mx, y: my, r: Math.max(s, 5), label: mk.label, count: mk.count });
    }
  }

  function tick() {
    if (!dragging) {
      spin += AUTO + vSpin;
      vSpin *= 0.955;
      if (Math.abs(vSpin) < 0.00004) vSpin = 0;
      if (AUTO || vSpin) needsRender = true;
    }
    if (needsRender && !document.hidden) {
      resize();
      render();
      needsRender = false;
    }
    requestAnimationFrame(tick);
  }

  /* drag to rotate */
  var lastX = 0, lastY = 0, moved = 0;
  canvas.addEventListener('pointerdown', function (e) {
    dragging = true;
    moved = 0;
    lastX = e.clientX;
    lastY = e.clientY;
    canvas.setPointerCapture(e.pointerId);
    canvas.classList.add('is-dragging');
  });
  canvas.addEventListener('pointermove', function (e) {
    if (dragging) {
      var dx = e.clientX - lastX;
      var dy = e.clientY - lastY;
      moved += Math.abs(dx) + Math.abs(dy);
      lastX = e.clientX;
      lastY = e.clientY;
      spin += dx * 0.006;
      vSpin = dx * 0.0022;
      tilt = Math.max(-1.2, Math.min(1.2, tilt + dy * 0.006));
      needsRender = true;
      tooltip.style.display = 'none';
    } else {
      hover(e);
    }
  });
  function endDrag() {
    dragging = false;
    canvas.classList.remove('is-dragging');
  }
  canvas.addEventListener('pointerup', endDrag);
  canvas.addEventListener('pointercancel', endDrag);
  canvas.addEventListener('pointerleave', function () {
    if (!dragging) tooltip.style.display = 'none';
  });

  function hover(e) {
    var rect = canvas.getBoundingClientRect();
    var px = e.clientX - rect.left;
    var py = e.clientY - rect.top;
    var best = null, bd = 121;
    for (var i = 0; i < screenMarkers.length; i++) {
      var sm = screenMarkers[i];
      var d = (sm.x - px) * (sm.x - px) + (sm.y - py) * (sm.y - py);
      if (d < bd && d < (sm.r + 6) * (sm.r + 6)) { bd = d; best = sm; }
    }
    if (best) {
      tooltip.textContent = best.label + ' · ' + best.count;
      tooltip.style.display = 'block';
      tooltip.style.left = Math.round(best.x) + 'px';
      tooltip.style.top = Math.round(best.y - 12) + 'px';
    } else {
      tooltip.style.display = 'none';
    }
  }

  /* re-render when the theme toggle flips */
  new MutationObserver(function () { needsRender = true; })
    .observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  if (window.ResizeObserver) new ResizeObserver(function () { needsRender = true; }).observe(mount);

  /* ---- visit stats ---- */
  var base = (mount.getAttribute('data-stats') || '').replace(/\/+$/, '');
  var isLive = /github\.io$|rushiqiang/.test(location.hostname);

  function setMarkers(points) {
    markers = [];
    maxCount = 1;
    for (var i = 0; i < points.length; i++) {
      var p = points[i];
      if (typeof p.lat !== 'number' || typeof p.lon !== 'number') continue;
      var lat = p.lat * Math.PI / 180;
      var lon = p.lon * Math.PI / 180;
      markers.push({
        x: Math.cos(lat) * Math.cos(lon),
        y: Math.cos(lat) * Math.sin(lon),
        z: Math.sin(lat),
        count: p.count || 1,
        label: p.label || 'Somewhere'
      });
      if ((p.count || 1) > maxCount) maxCount = p.count || 1;
    }
    var visits = points.reduce(function (a, p) { return a + (p.count || 1); }, 0);
    if (visits > 0) {
      caption.textContent = visits.toLocaleString('en-US') + (visits === 1 ? ' visit · ' : ' visits · ') + points.length + (points.length === 1 ? ' place' : ' places');
    }
    needsRender = true;
  }

  if (base) {
    if (isLive && !sessionStorage.getItem('vg-hit')) {
      sessionStorage.setItem('vg-hit', '1');
      fetch(base + '/hit', { method: 'POST', keepalive: true }).catch(function () {});
    }
    fetch(base + '/stats')
      .then(function (r) { return r.json(); })
      .then(function (d) { setMarkers(d.points || d || []); })
      .catch(function () {});
  }

  resize();
  requestAnimationFrame(tick);
})();
