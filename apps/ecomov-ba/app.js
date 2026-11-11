(function () {
  var $ = function (id) { return document.getElementById(id); };
  var fmt = function (n, d) { d = d || 0; return n.toLocaleString('es-AR', { minimumFractionDigits: d, maximumFractionDigits: d }); };
  var norm = function (s) { return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase(); };
  var mmss = function (sec) { sec = Math.max(0, Math.round(sec)); return String(Math.floor(sec / 60)).padStart(2, '0') + ':' + String(sec % 60).padStart(2, '0'); };
  var esc = function (t) { return String(t).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };
  var KM_PER_PX = 0.0058, G_PER_KM = 170, G_PER_PT = 45, SPEEDUP = 12, RESERVA = 900;

  /* ---------- datos de ejemplo ---------- */
  var STATIONS = [
    { name: 'Plaza Italia', addr: 'Av. Santa Fe 4000', x: 300, y: 520, e: 8, c: 2, a: 1, d: 6 },
    { name: 'Jardín Botánico', addr: 'Av. Santa Fe 3951', x: 205, y: 640, e: 3, c: 0, a: 1, d: 9 },
    { name: 'Planetario', addr: 'Av. Sarmiento y Figueroa Alcorta', x: 480, y: 280, e: 5, c: 1, a: 0, d: 4 },
    { name: 'Facultad de Derecho', addr: 'Av. Figueroa Alcorta 2263', x: 660, y: 560, e: 6, c: 2, a: 1, d: 3 },
    { name: 'Plaza Güemes', addr: 'Medrano y Mansilla', x: 390, y: 720, e: 2, c: 1, a: 0, d: 10 },
    { name: 'Recoleta', addr: 'Junín y Vicente López', x: 630, y: 760, e: 9, c: 1, a: 2, d: 0 },
    { name: 'Barrio Norte', addr: 'Av. Pueyrredón 1500', x: 500, y: 890, e: 4, c: 0, a: 1, d: 7 },
    { name: 'Hospital de Clínicas', addr: 'Av. Córdoba 2351', x: 360, y: 1000, e: 1, c: 1, a: 0, d: 12 },
    { name: 'Plaza San Martín', addr: 'Florida y Av. Santa Fe', x: 800, y: 1010, e: 7, c: 2, a: 1, d: 5 },
    { name: 'Congreso', addr: 'Av. Rivadavia 1800', x: 520, y: 1240, e: 5, c: 1, a: 1, d: 8 },
    { name: 'Obelisco · 9 de Julio', addr: 'Av. 9 de Julio y Corrientes', x: 770, y: 1210, e: 10, c: 3, a: 2, d: 0 },
    { name: 'Parque Centenario', addr: 'Av. Díaz Vélez 4800', x: 85, y: 1060, e: 6, c: 0, a: 1, d: 6 },
    { name: 'Palermo Soho', addr: 'Plaza Serrano', x: 120, y: 470, e: 4, c: 1, a: 0, d: 3 },
    { name: 'Plaza de Mayo', addr: 'Hipólito Yrigoyen y Bolívar', x: 870, y: 1320, e: 3, c: 1, a: 1, d: 9 },
    { name: 'Abasto', addr: 'Av. Corrientes 3200', x: 230, y: 1170, e: 2, c: 0, a: 0, d: 11 }
  ];
  var USER = { x: 330, y: 560 };
  var PLACES = [{ label: 'Mi ubicación', sub: 'Cerca de Plaza Italia', x: USER.x, y: USER.y, kind: 'me', pop: true }];
  STATIONS.forEach(function (s) { PLACES.push({ label: 'Estación ' + s.name, sub: s.addr, x: s.x, y: s.y, kind: 'station', st: s }); });
  [
    ['Obelisco', 'Av. 9 de Julio y Corrientes', 740, 1180, 1], ['Plaza de Mayo', 'Monserrat', 890, 1350, 1], ['Congreso de la Nación', 'Balvanera', 500, 1270, 1],
    ['Teatro Colón', 'Cerrito 628', 690, 1110], ['Cementerio de la Recoleta', 'Junín 1760', 650, 700], ['MALBA', 'Av. Figueroa Alcorta 3415', 560, 440],
    ['Planetario Galileo Galilei', 'Av. Sarmiento y Belisario Roldán', 470, 300], ['Jardín Japonés', 'Av. Casares 3450', 430, 360], ['Abasto Shopping', 'Av. Corrientes 3247', 240, 1160],
    ['Puerto Madero', 'Dique 3', 915, 1240], ['Retiro', 'Estación de trenes', 860, 950], ['Facultad de Ingeniería (UBA)', 'Av. Paseo Colón 850', 900, 1390],
    ['Av. Santa Fe 3200', 'Palermo', 410, 630], ['Av. Santa Fe 1800', 'Recoleta', 650, 870], ['Av. Corrientes 1500', 'San Nicolás', 650, 1150],
    ['Av. Callao 1000', 'Recoleta', 650, 980], ['Av. Córdoba 4500', 'Palermo', 180, 680], ['Av. Pueyrredón 1700', 'Recoleta', 540, 850],
    ['Thames 1800', 'Palermo Soho', 120, 560], ['Gurruchaga 2100', 'Palermo', 160, 520], ['Florida 500', 'Microcentro', 840, 1120], ['Av. de Mayo 1300', 'Monserrat', 620, 1300]
  ].forEach(function (p) { PLACES.push({ label: p[0], sub: p[1], x: p[2], y: p[3], kind: /\d/.test(p[0]) ? 'street' : 'place', pop: !!p[4] }); });
  var KIND_IC = { station: 'pedal_bike', place: 'location_on', street: 'signpost', me: 'my_location' };
  var VEH = {
    e: { name: 'E-bike', ic: 'electric_bike', code: 'EBIKE', num: '402', lane: 'Ciclovía Rápida (eléctricas)', share: 82 },
    c: { name: 'Bici de carga', ic: 'pedal_bike', code: 'CARGO', num: '118', lane: 'Ciclovía Lenta', share: 76 },
    a: { name: 'Adaptada', ic: 'accessible', code: 'ADAPT', num: '031', lane: 'Ciclovía Lenta', share: 76 }
  };

  var S = {
    view: 'map', station: STATIONS[0], veh: null, bike: null, prefs: { voice: true, vib: true, simple: true },
    origin: null, dest: null, route: null, km: 0, kmPrev: 0, speed: 0, simSec: 0, charge: 84,
    points: 408, lastKm: 0, lastPts: 0, pauseSec: 0, announced: {}, wasOver: false, filter: 'all'
  };
  var scr = $('scr');
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- barra del sistema ---------- */
  var themeMeta = document.querySelector('meta[name="theme-color"]');
  var ZONE_BG = { ok: '#00642f', over: '#e88700', cross: '#ffdf97' };
  function setTheme() {
    var c = '#ffffff';
    if (S.view === 'scan' || S.view === 'ok') c = '#04121a';
    else if (S.view === 'ride') c = ZONE_BG[scr.dataset.zone] || '#00642f';
    if (themeMeta) themeMeta.setAttribute('content', c);
    document.documentElement.style.background = c;
  }

  /* ---------- guardado local ---------- */
  var STORE = 'ecomov-ba:v1';
  function save() {
    try { localStorage.setItem(STORE, JSON.stringify({ points: S.points, passes: S.passes, lastKm: S.lastKm, lastPts: S.lastPts })); } catch (e) {}
  }
  function load() {
    try {
      var d = JSON.parse(localStorage.getItem(STORE) || 'null');
      if (!d || typeof d.points !== 'number' || !Array.isArray(d.passes)) return;
      S.points = d.points; S.passes = d.passes; S.lastKm = d.lastKm || 0; S.lastPts = d.lastPts || 0;
    } catch (e) {}
  }

  /* ---------- pantalla encendida mientras pedaleás ---------- */
  var wake = null;
  function keepAwake(on) {
    try {
      if (on && !wake && navigator.wakeLock) {
        navigator.wakeLock.request('screen').then(function (l) { wake = l; l.addEventListener('release', function () { wake = null; }); }).catch(function () {});
      } else if (!on && wake) { wake.release(); wake = null; }
    } catch (e) {}
  }
  document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'visible' && S.view === 'ride') keepAwake(true); });

  /* ---------- utilidades ---------- */
  var toastT;
  function toast(txt, ic) { $('toastTxt').textContent = txt; $('toastIc').textContent = ic || 'check_circle'; $('toast').hidden = false; clearTimeout(toastT); toastT = setTimeout(function () { $('toast').hidden = true; }, 2800); }
  function wiggle(id) { var v = $(id); v.classList.remove('buzz'); void v.offsetWidth; v.classList.add('buzz'); }
  function say(t) {
    if (!S.prefs.voice) return;
    try { if (window.speechSynthesis) { var u = new SpeechSynthesisUtterance(t); u.lang = 'es-AR'; u.rate = 1.05; speechSynthesis.cancel(); speechSynthesis.speak(u); } } catch (e) {}
    wiggle('cueVoice');
  }
  function buzz(p) {
    if (!S.prefs.vib) return;
    try { if (navigator.vibrate) navigator.vibrate(p || [180, 80, 180]); } catch (e) {}
    wiggle('cueVib');
  }
  function dist(a, b) { return Math.hypot(a.x - b.x, a.y - b.y); }
  function nearestStations(p, n) { return STATIONS.slice().sort(function (a, b) { return dist(a, p) - dist(b, p); }).slice(0, n || 3); }
  function mtxt(px) { var m = px * KM_PER_PX * 1000; return m < 1000 ? Math.max(10, Math.round(m / 10) * 10) + ' m' : fmt(m / 1000, 1) + ' km'; }
  /* Estación más cercana a p. Si está llena, `alt` es la más cercana que sí tiene anclajes libres. */
  function dockInfo(p) {
    var near = nearestStations(p, 1)[0], full = near.d === 0, alt = near;
    if (full) {
      alt = STATIONS.filter(function (s) { return s.d > 0; }).sort(function (a, b) { return dist(a, p) - dist(b, p); })[0] || null;
    }
    return { near: near, full: full, alt: alt };
  }
  function stationPlace(s) { for (var i = 0; i < PLACES.length; i++) if (PLACES[i].st === s) return PLACES[i]; return PLACES[0]; }
  var tripPts = function (km) { return Math.floor(km * G_PER_KM / G_PER_PT); };

  /* ---------- QR ---------- */
  function drawQR(cv, text) {
    var ctx = cv.getContext('2d');
    if (window.qrcode) {
      try {
        var q = window.qrcode(0, 'M'); q.addData(text); q.make();
        var n = q.getModuleCount(), m = 2; cv.width = cv.height = n + m * 2;
        ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, cv.width, cv.height); ctx.fillStyle = '#08202f';
        for (var r = 0; r < n; r++) for (var c = 0; c < n; c++) if (q.isDark(r, c)) ctx.fillRect(c + m, r + m, 1, 1);
        return;
      } catch (e) {}
    }
    var N = 25, seed = text.length * 97; cv.width = cv.height = N;
    var rnd = function () { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; };
    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, N, N); ctx.fillStyle = '#08202f';
    for (var y = 0; y < N; y++) for (var x = 0; x < N; x++) if (rnd() > 0.52) ctx.fillRect(x, y, 1, 1);
    [[0, 0], [N - 7, 0], [0, N - 7]].forEach(function (o) {
      ctx.fillStyle = '#fff'; ctx.fillRect(o[0] - (o[0] ? 1 : 0), o[1] - (o[1] ? 1 : 0), 8, 8);
      ctx.fillStyle = '#08202f'; ctx.fillRect(o[0], o[1], 7, 7); ctx.fillStyle = '#fff'; ctx.fillRect(o[0] + 1, o[1] + 1, 5, 5); ctx.fillStyle = '#08202f'; ctx.fillRect(o[0] + 2, o[1] + 2, 3, 3);
    });
  }
  var qrText = function (k) { return 'ECOMOV:' + VEH[k].code + ':' + VEH[k].num; };

  /* ---------- autocompletado ---------- */
  function rank(list, q) {
    var out = [];
    list.forEach(function (p) {
      var l = norm(p.label), s = norm(p.sub || ''), sc = -1;
      if (l.indexOf(q) === 0) sc = 0;
      else if ((' ' + l).indexOf(' ' + q) >= 0) sc = 1;
      else if (l.indexOf(q) >= 0) sc = 2;
      else if (s.indexOf(q) >= 0) sc = 3;
      if (sc >= 0) out.push({ p: p, sc: sc });
    });
    out.sort(function (a, b) { return a.sc - b.sc || a.p.label.length - b.p.label.length; });
    return out.map(function (o) { return o.p; });
  }
  function hl(label, q) {
    var chars = Array.from(label), n = chars.map(function (ch) { return norm(ch) || ch; }).join('');
    var i = n.indexOf(q);
    if (!q || i < 0 || n.length !== chars.length) return esc(label);
    return esc(chars.slice(0, i).join('')) + '<mark>' + esc(chars.slice(i, i + q.length).join('')) + '</mark>' + esc(chars.slice(i + q.length).join(''));
  }
  function attachAC(inp, ul, source, onPick) {
    var items = [], idx = -1;
    function close() { ul.hidden = true; inp.setAttribute('aria-expanded', 'false'); inp.removeAttribute('aria-activedescendant'); idx = -1; }
    function render() {
      var q = norm(inp.value.trim()), src = source();
      items = q ? rank(src, q).slice(0, 5) : src.filter(function (p) { return p.pop; }).slice(0, 4);
      ul.innerHTML = '';
      if (!items.length) {
        var e = document.createElement('li'); e.className = 'empty'; e.setAttribute('role', 'option'); e.setAttribute('aria-disabled', 'true');
        e.textContent = 'No encontramos “' + inp.value.trim() + '”. Probá con una calle, una estación o un lugar conocido.'; ul.appendChild(e);
      }
      items.forEach(function (p, i) {
        var li = document.createElement('li');
        li.id = ul.id + '-o' + i; li.setAttribute('role', 'option'); li.setAttribute('aria-selected', 'false');
        li.innerHTML = '<span class="ms">' + KIND_IC[p.kind] + '</span><span class="l">' + hl(p.label, q) + '</span><span class="s">' + esc(p.sub || '') + '</span>';
        li.addEventListener('mousedown', function (ev) { ev.preventDefault(); pick(i); });
        ul.appendChild(li);
      });
      ul.hidden = false; inp.setAttribute('aria-expanded', 'true');
    }
    function move(d) {
      if (ul.hidden) render();
      if (!items.length) return;
      idx = (idx + d + items.length) % items.length;
      Array.prototype.forEach.call(ul.children, function (li, i) { li.setAttribute('aria-selected', i === idx ? 'true' : 'false'); });
      inp.setAttribute('aria-activedescendant', ul.id + '-o' + idx);
    }
    function pick(i) { var p = items[i]; if (!p) return; inp.value = p.label; close(); onPick(p); }
    inp.addEventListener('input', function () { idx = -1; render(); });
    inp.addEventListener('focus', render);
    inp.addEventListener('blur', function () { setTimeout(close, 120); });
    inp.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowDown') { e.preventDefault(); move(1); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); move(-1); }
      else if (e.key === 'Enter') { e.preventDefault(); pick(idx >= 0 ? idx : 0); }
      else if (e.key === 'Escape') close();
    });
  }

  /* ---------- navegación ---------- */
  var VIEWS = ['map', 'scan', 'ok', 'prep', 'ride', 'pause', 'arrive', 'wallet'];
  function go(v) {
    if (S.view === 'scan' && v !== 'scan') stopCam();
    S.view = v; scr.dataset.view = v;
    VIEWS.forEach(function (k) { $('v-' + k).hidden = k !== v; });
    $('toast').hidden = true;
    var sc = $('v-' + v).querySelector('.scroll'); if (sc) sc.scrollTop = 0;
    keepAwake(v === 'ride');
    if (v === 'map') requestAnimationFrame(applyPan);
    if (v === 'scan') enterScan();
    if (v === 'prep') enterPrep();
    if (v === 'ride') renderRide();
    if (v === 'pause') enterPause();
    if (v === 'arrive') renderArrive();
    if (v === 'wallet') renderPoints();
    setTheme();
  }

  /* ---------- 1 · mapa ---------- */
  var vp = $('mapVp'), world = $('mapWorld'), pan = { x: 0, y: 0 }, W = 1000, H = 1400;
  function bubPart(n, ic) { return '<span class="' + (n ? '' : 'zero') + '"><span class="ms">' + ic + '</span>' + n + '</span>'; }
  function bubInner(s) { return bubPart(s.e, 'electric_bike') + bubPart(s.c, 'pedal_bike') + bubPart(s.a, 'accessible'); }
  function pinLabel(s) { return 'Estación ' + s.name + ': ' + s.e + ' E-bikes, ' + s.c + ' bicis de carga, ' + s.a + ' Adaptadas' + (s.d ? '' : ', llena'); }
  STATIONS.forEach(function (s) {
    var b = document.createElement('button');
    b.type = 'button'; b.className = 'pin'; b.style.left = s.x + 'px'; b.style.top = s.y + 'px';
    b.setAttribute('aria-label', pinLabel(s));
    b.innerHTML = '<span class="bub">' + bubInner(s) + '</span><span class="pin-head"></span><span class="pin-n num"></span>';
    b.addEventListener('click', function () { if (moved) return; openSheet(s); });
    s.el = b; s.vis = false; world.appendChild(b);
  });
  function renderPins() {
    STATIONS.forEach(function (s) {
      var n = S.filter === 'all' ? s.e + s.c + s.a : s[S.filter];
      s.el.querySelector('.pin-n').textContent = n;
      s.el.classList.toggle('low', n > 0 && n < 3); s.el.classList.toggle('none', n === 0);
      s.el.classList.toggle('sel', !$('sheet').hidden && S.station === s);
    });
  }
  /* zoom: el mapa se agranda o achica; pines y globitos mantienen su tamaño */
  var z = 1, MAXZ = 2.5, worldSvg = world.querySelector('svg');
  function minZ() { var vw = vp.clientWidth, vh = vp.clientHeight; return vw ? Math.max(vw / W, vh / H) : 0.5; }
  function clampZ(v) { return Math.min(MAXZ, Math.max(minZ(), v)); }
  function layoutWorld() {
    world.style.width = W * z + 'px'; world.style.height = H * z + 'px';
    worldSvg.style.width = W * z + 'px'; worldSvg.style.height = H * z + 'px';
    STATIONS.forEach(function (s) { s.el.style.left = s.x * z + 'px'; s.el.style.top = s.y * z + 'px'; });
    $('meDot').style.left = USER.x * z + 'px'; $('meDot').style.top = USER.y * z + 'px';
    $('zIn').disabled = z >= MAXZ - 0.001; $('zOut').disabled = z <= minZ() + 0.001;
  }
  function zoomAt(nz, cx, cy) {
    nz = clampZ(nz);
    var wx = (cx - pan.x) / z, wy = (cy - pan.y) / z;
    z = nz; layoutWorld();
    pan.x = cx - wx * z; pan.y = cy - wy * z; applyPan();
  }
  var zAnim = 0;
  function animateZoom(target, cx, cy) {
    cancelAnimationFrame(zAnim);
    target = clampZ(target);
    if (reduce) { zoomAt(target, cx, cy); return; }
    var z0 = z, t0 = performance.now();
    (function step(now) {
      var p = Math.min(1, (now - t0) / 220), e = 1 - Math.pow(1 - p, 3);
      zoomAt(z0 + (target - z0) * e, cx, cy);
      if (p < 1) zAnim = requestAnimationFrame(step);
    })(t0);
  }
  function vpCenter() { return [vp.clientWidth / 2, vp.clientHeight / 2]; }
  $('zIn').addEventListener('click', function () { var c = vpCenter(); animateZoom(z * 1.5, c[0], c[1]); });
  $('zOut').addEventListener('click', function () { var c = vpCenter(); animateZoom(z / 1.5, c[0], c[1]); });
  vp.addEventListener('wheel', function (e) {
    if (e.target.closest('.map-ui')) return;
    e.preventDefault();
    var r = vp.getBoundingClientRect(), k = e.ctrlKey ? 0.01 : 0.0015;
    cancelAnimationFrame(zAnim);
    zoomAt(z * Math.exp(-e.deltaY * k), e.clientX - r.left, e.clientY - r.top);
  }, { passive: false });

  function clampPan() { var vw = vp.clientWidth, vh = vp.clientHeight; if (!vw) return; pan.x = Math.min(0, Math.max(vw - W * z, pan.x)); pan.y = Math.min(0, Math.max(vh - H * z, pan.y)); }
  function applyPan() { clampPan(); world.style.transform = 'translate(' + pan.x + 'px,' + pan.y + 'px)'; updateVisible(); }
  function updateVisible() {
    var vw = vp.clientWidth, vh = vp.clientHeight, bottom = $('sheet').hidden ? 70 : $('sheet').offsetHeight + 10;
    if (!vw) return;
    STATIONS.forEach(function (s) {
      var sx = s.x * z + pan.x, sy = s.y * z + pan.y;
      var inView = sx > 40 && sx < vw - 40 && sy > 150 && sy < vh - bottom;
      if (inView && !s.vis) { s.el.classList.remove('pop'); void s.el.offsetWidth; s.el.classList.add('pop'); }
      s.el.classList.toggle('in', inView); s.vis = inView;
    });
  }
  function centerOn(x, y, fy, smooth) {
    pan.x = vp.clientWidth / 2 - x * z; pan.y = vp.clientHeight * (fy || 0.55) - y * z;
    world.style.transition = smooth && !reduce ? 'transform .45s ease' : 'none';
    applyPan();
    if (smooth) setTimeout(function () { world.style.transition = 'none'; }, 470);
  }
  /* arrastre con un dedo, pellizco con dos, doble toque para acercar */
  var drag = null, moved = false, pinch = null, ptrs = new Map(), lastTap = { t: 0, x: 0, y: 0 };
  function local(e) { var r = vp.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; }
  function startDrag(id, p) { drag = { x: p.x, y: p.y, px: pan.x, py: pan.y, id: id }; }
  vp.addEventListener('pointerdown', function (e) {
    if (e.target.closest('.map-ui')) return;
    ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
    cancelAnimationFrame(zAnim);
    if (ptrs.size === 1) { startDrag(e.pointerId, { x: e.clientX, y: e.clientY }); moved = false; }
    else if (ptrs.size === 2) {
      var ps = Array.from(ptrs.values()), r = vp.getBoundingClientRect();
      var mx = (ps[0].x + ps[1].x) / 2 - r.left, my = (ps[0].y + ps[1].y) / 2 - r.top;
      pinch = { d0: Math.hypot(ps[0].x - ps[1].x, ps[0].y - ps[1].y) || 1, z0: z, wx: (mx - pan.x) / z, wy: (my - pan.y) / z };
      drag = null; moved = true;
      ptrs.forEach(function (_, id) { try { vp.setPointerCapture(id); } catch (err) {} });
    }
  });
  vp.addEventListener('pointermove', function (e) {
    if (!ptrs.has(e.pointerId)) return;
    ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pinch && ptrs.size >= 2) {
      var ps = Array.from(ptrs.values()), r = vp.getBoundingClientRect();
      var mx = (ps[0].x + ps[1].x) / 2 - r.left, my = (ps[0].y + ps[1].y) / 2 - r.top;
      z = clampZ(pinch.z0 * Math.hypot(ps[0].x - ps[1].x, ps[0].y - ps[1].y) / pinch.d0); layoutWorld();
      pan.x = mx - pinch.wx * z; pan.y = my - pinch.wy * z; applyPan();
      return;
    }
    if (!drag) return;
    var dx = e.clientX - drag.x, dy = e.clientY - drag.y;
    if (!moved && Math.hypot(dx, dy) > 6) { moved = true; vp.classList.add('dragging'); try { vp.setPointerCapture(drag.id); } catch (err) {} }
    if (moved) { pan.x = drag.px + dx; pan.y = drag.py + dy; applyPan(); }
  });
  function endPtr(e) {
    if (!ptrs.has(e.pointerId)) return;
    var wasMoved = moved, onPin = e.target.closest && e.target.closest('.pin');
    ptrs.delete(e.pointerId);
    if (ptrs.size < 2) pinch = null;
    if (ptrs.size === 1) { var rest = Array.from(ptrs.entries())[0]; startDrag(rest[0], rest[1]); return; }
    drag = null; vp.classList.remove('dragging');
    setTimeout(function () { moved = false; }, 0);
    if (e.type === 'pointerup' && !wasMoved && !onPin) {
      var now = performance.now(), p = local(e);
      if (now - lastTap.t < 320 && Math.hypot(p[0] - lastTap.x, p[1] - lastTap.y) < 30) { animateZoom(z * 1.6, p[0], p[1]); lastTap.t = 0; }
      else lastTap = { t: now, x: p[0], y: p[1] };
    }
  }
  vp.addEventListener('pointerup', endPtr); vp.addEventListener('pointercancel', endPtr);
  vp.addEventListener('dblclick', function (e) { e.preventDefault(); });
  window.addEventListener('resize', function () { if (S.view === 'map') { z = clampZ(z); layoutWorld(); applyPan(); } });
  $('locBtn').addEventListener('click', function () { centerOn(USER.x, USER.y, 0.55, true); });
  document.querySelectorAll('.chip-f').forEach(function (b) {
    b.addEventListener('click', function () {
      S.filter = b.dataset.f;
      document.querySelectorAll('.chip-f').forEach(function (o) { o.setAttribute('aria-pressed', o === b ? 'true' : 'false'); });
      renderPins();
    });
  });
  attachAC($('stSearch'), $('stAc'), function () { return PLACES.filter(function (p) { return p.kind !== 'me'; }); }, function (p) {
    $('stSearch').blur();
    if (p.st) openSheet(p.st);
    else { centerOn(p.x, p.y, 0.5, true); toast('Estaciones cerca de ' + p.label, 'location_on'); }
  });

  function openSheet(s) {
    S.station = s; S.veh = null;
    $('sheet').hidden = false; $('mapScan').hidden = true;
    $('shName').textContent = 'Estación ' + s.name;
    $('shAddr').textContent = s.addr + ' · a ' + mtxt(dist(s, USER)) + ' de vos';
    $('shMeta').innerHTML = '<span class="badge b-info"><span class="ms">solar_power</span>Solar · batería 100%</span>' + (s.d ? '<span class="badge b-default"><span class="ms">local_parking</span>' + s.d + ' anclajes libres</span>' : '<span class="badge b-warn"><span class="ms">local_parking</span>Estación llena</span>');
    var html = '';
    ['e', 'c', 'a'].forEach(function (k) {
      var n = s[k];
      html += '<button class="veh" type="button" role="radio" aria-checked="false" data-k="' + k + '"' + (n ? '' : ' disabled') + '><span class="ms">' + VEH[k].ic + '</span><b class="num">' + n + '</b><span class="l">' + VEH[k].name + '</span><span class="s">' + (n ? (n > 1 ? 'Disponibles' : 'Disponible') : 'Sin unidades') + '</span></button>';
    });
    $('vehs').innerHTML = html;
    $('vehs').querySelectorAll('.veh').forEach(function (b) {
      b.addEventListener('click', function () {
        S.veh = b.dataset.k;
        $('vehs').querySelectorAll('.veh').forEach(function (o) { o.setAttribute('aria-checked', o === b ? 'true' : 'false'); });
        $('toScan').disabled = false;
        $('toScan').innerHTML = '<span class="ms">qr_code_scanner</span>ESCANEAR QR DE LA ' + VEH[S.veh].name.toUpperCase();
      });
    });
    $('toScan').disabled = true; $('toScan').innerHTML = '<span class="ms">qr_code_scanner</span>ELEGÍ UN VEHÍCULO';
    renderPins();
    requestAnimationFrame(function () { centerOn(s.x, s.y, 0.3, true); });
  }
  function closeSheet() { $('sheet').hidden = true; $('mapScan').hidden = false; renderPins(); updateVisible(); }
  $('shClose').addEventListener('click', closeSheet);
  $('toScan').addEventListener('click', function () { if (S.veh) go('scan'); });
  $('quickScan').addEventListener('click', function () { S.station = nearestStations(USER, 1)[0]; S.veh = null; go('scan'); });

  /* ---------- 2 · escanear ---------- */
  var stream = null, raf = 0, camTimer = 0, lastBad = '';
  var decCv = document.createElement('canvas'), decCtx = decCv.getContext('2d', { willReadFrequently: true });
  function stopCam() {
    cancelAnimationFrame(raf); clearTimeout(camTimer);
    if (stream) { stream.getTracks().forEach(function (t) { t.stop(); }); stream = null; }
    $('video').hidden = true; $('torch').hidden = true;
  }
  function camState(ic, t) { $('camState').innerHTML = '<span class="ms">' + ic + '</span>' + esc(t); }
  function showSim(reason) {
    $('sim').hidden = false; $('video').hidden = true;
    camState('videocam_off', reason);
    $('scanMsg').innerHTML = 'Tocá el QR para simular la lectura<small>Con la cámara activa, el código se lee solo</small>';
  }
  function enterScan() {
    $('scanErr').hidden = true; $('manualForm').hidden = true; $('finder').classList.remove('lock'); lastBad = '';
    var k = S.veh || 'e';
    $('scanSub').textContent = (S.veh ? VEH[k].name : 'Cualquier vehículo') + ' · Estación ' + S.station.name;
    drawQR($('simQr'), qrText(k)); $('simLbl').textContent = 'ECOMOV · ' + VEH[k].name.toUpperCase() + ' #' + VEH[k].num;
    $('sim').hidden = true;
    $('scanMsg').innerHTML = 'Apuntá al código QR del manubrio<small>Se lee solo, no hace falta tocar nada</small>';
    camState('photo_camera', 'Pidiendo permiso para usar la cámara…');
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) { showSim('La cámara no está disponible en esta vista'); return; }
    camTimer = setTimeout(function () { if (!stream && S.view === 'scan') showSim('La cámara no respondió'); }, 6000);
    navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false }).then(function (st) {
      if (S.view !== 'scan') { st.getTracks().forEach(function (t) { t.stop(); }); return; }
      clearTimeout(camTimer); stream = st; $('sim').hidden = true;
      var v = $('video'); v.srcObject = st; v.hidden = false; v.play().catch(function () {});
      try { var caps = st.getVideoTracks()[0].getCapabilities(); if (caps && caps.torch) $('torch').hidden = false; } catch (e) {}
      if (window.jsQR) { camState('photo_camera', 'Cámara activa · buscando el QR'); scanLoop(); }
      else camState('photo_camera', 'Cámara activa · usá “Ingresar número”');
    }).catch(function (err) {
      clearTimeout(camTimer);
      if (S.view === 'scan') showSim(err && err.name === 'NotAllowedError' ? 'No hay permiso para usar la cámara' : 'La cámara no está disponible en esta vista');
    });
  }
  function scanLoop() {
    var v = $('video');
    if (!stream) return;
    if (v.readyState >= 2 && v.videoWidth) {
      var w = 360, h = Math.round(v.videoHeight * w / v.videoWidth);
      decCv.width = w; decCv.height = h; decCtx.drawImage(v, 0, 0, w, h);
      var code = window.jsQR(decCtx.getImageData(0, 0, w, h).data, w, h, { inversionAttempts: 'dontInvert' });
      if (code && code.data && handleCode(code.data)) return;
    }
    raf = requestAnimationFrame(scanLoop);
  }
  function scanError(t) { $('scanErr').hidden = false; $('scanErrTxt').textContent = t; }
  function handleCode(txt) {
    var m = /^ECOMOV:(EBIKE|CARGO|ADAPT):(\d{1,4})$/.exec(String(txt).trim());
    if (!m) { if (txt !== lastBad) { lastBad = txt; scanError('Ese código no es de un vehículo ECOMOV. Buscá el QR del manubrio.'); } return false; }
    var k = { EBIKE: 'e', CARGO: 'c', ADAPT: 'a' }[m[1]];
    if (S.veh && k !== S.veh) { if (txt !== lastBad) { lastBad = txt; scanError('Ese QR es de una ' + VEH[k].name + ' y elegiste ' + VEH[S.veh].name + '. Buscá ese vehículo o volvé al mapa para cambiar.'); } return false; }
    activate(k, m[2]); return true;
  }
  function activate(k, num) {
    S.veh = k; S.bike = { k: k, num: num };
    cancelAnimationFrame(raf);
    $('finder').classList.add('lock'); $('scanErr').hidden = true;
    camState('check_circle', 'QR leído');
    buzz([120]);
    setTimeout(function () {
      go('ok');
      $('okTitle').textContent = VEH[k].name + ' #' + num + ' activada';
      $('okSub').textContent = 'Quedó a tu nombre en la Estación ' + S.station.name + '. Prepará el viaje y desbloqueala.';
    }, 450);
  }
  $('simTap').addEventListener('click', function () { handleCode(qrText(S.veh || 'e')); });
  $('scanBack').addEventListener('click', function () { go('map'); });
  $('demoBtn').addEventListener('click', function () { showSim('Modo demostración'); });
  $('manualBtn').addEventListener('click', function () { $('manualForm').hidden = !$('manualForm').hidden; if (!$('manualForm').hidden) $('manualCode').focus(); });
  $('manualForm').addEventListener('submit', function (e) {
    e.preventDefault();
    var v = $('manualCode').value.trim();
    if (!/^\d{3,4}$/.test(v)) { scanError('Escribí el número de 3 o 4 cifras que está debajo del QR.'); return; }
    activate(S.veh || 'e', v);
  });
  $('torch').addEventListener('click', function () {
    if (!stream) return;
    var t = stream.getVideoTracks()[0], on = !$('torch').classList.contains('on');
    t.applyConstraints({ advanced: [{ torch: on }] }).then(function () { $('torch').classList.toggle('on', on); }).catch(function () {});
  });
  $('toPrep').addEventListener('click', function () { go('prep'); });

  /* ---------- 3 · preparar ---------- */
  function buildRoute(o, d) {
    var dx = d.x - o.x, dy = d.y - o.y, a = (dx + dy) / Math.SQRT2, b = (dx - dy) / Math.SQRT2;
    var e = { x: o.x + a / Math.SQRT2, y: o.y + a / Math.SQRT2 };
    var len = Math.abs(a) + Math.abs(b), km = Math.max(0.4, len * KM_PER_PX), fe = len ? Math.abs(a) / len : 0, right = a * b < 0;
    var man = [
      { f: 0.32, ic: 'directions_walk', txt: 'Cruce peatonal · Av. Pueyrredón', walk: true },
      { f: 0.86, ic: 'directions_walk', txt: 'Cruce peatonal · Av. Callao', walk: true },
      { f: 1, ic: 'flag', txt: 'Llegada · ' + d.label }
    ];
    if (fe > 0.08 && fe < 0.94) man.push({ f: fe, ic: right ? 'turn_right' : 'turn_left', txt: 'Doblá a la ' + (right ? 'derecha' : 'izquierda') + ' · Av. Córdoba' });
    man.sort(function (x, y) { return x.f - y.f; });
    man = man.filter(function (m, i) { return i === 0 || m.f === 1 || m.f - man[i - 1].f > 0.06; });
    man.forEach(function (m) { m.km = m.f * km; });
    return { o: o, d: d, mid: e, km: km, man: man, seg: [Math.abs(a), Math.abs(b)] };
  }
  function pointAt(r, f) {
    var L = r.seg[0] + r.seg[1], t = f * L;
    if (!L) return { x: r.o.x, y: r.o.y };
    if (t <= r.seg[0]) { var k = r.seg[0] ? t / r.seg[0] : 0; return { x: r.o.x + (r.mid.x - r.o.x) * k, y: r.o.y + (r.mid.y - r.o.y) * k }; }
    var k2 = r.seg[1] ? (t - r.seg[0]) / r.seg[1] : 1;
    return { x: r.mid.x + (r.d.x - r.mid.x) * k2, y: r.mid.y + (r.d.y - r.mid.y) * k2 };
  }
  function enterPrep() {
    var k = (S.bike && S.bike.k) || S.veh || 'e';
    if (!S.bike) S.bike = { k: k, num: VEH[k].num };
    $('pvIc').textContent = VEH[k].ic;
    $('pvName').textContent = VEH[k].name + ' #' + S.bike.num + ' · activada';
    $('pvSt').textContent = 'Estación ' + S.station.name + ' · anclaje 7';
    if (!S.origin) S.origin = stationPlace(S.station);
    $('inOrig').value = S.origin.label;
    $('inDest').value = S.dest ? S.dest.label : '';
    renderRouteCard(false);
  }
  function renderRouteCard(warn) {
    var both = S.origin && S.dest, ok = both && dist(S.origin, S.dest) > 20;
    $('routeCard').hidden = !ok; $('unlock').disabled = !ok;
    $('unlockHint').textContent = ok ? 'Al desbloquear empieza el tiempo de uso y aceptás que registremos tu trayecto para calcular tus bonos.'
      : !S.origin ? 'Elegí el origen de la lista para desbloquear.' : 'Elegí el destino de la lista para desbloquear.';
    if (both && !ok) { $('unlockHint').textContent = 'El destino es el mismo lugar que el origen. Elegí otro.'; return; }
    if (!ok) return;
    var r = buildRoute(S.origin, S.dest), k = S.bike ? S.bike.k : 'e', fast = k === 'e';
    $('rcKm').textContent = fmt(r.km, 1) + ' km';
    $('rcMin').textContent = Math.max(1, Math.round(r.km / 18 * 60)) + ' min';
    $('rcPts').textContent = '+' + tripPts(r.km);
    $('rcCorte').style.gridTemplateColumns = fast ? '.6fr 1.6fr 1.1fr 1.2fr' : '.6fr 1.1fr 1.6fr 1.2fr';
    $('rcTxt').textContent = 'Vas por la ' + VEH[k].lane + ' el ' + VEH[k].share + '% del trayecto. El carril de servicio queda libre para ambulancias y logística.';
  }
  attachAC($('inOrig'), $('acOrig'), function () { return PLACES; }, function (p) { S.origin = p; renderRouteCard(); if (!S.dest) $('inDest').focus(); });
  attachAC($('inDest'), $('acDest'), function () { return PLACES.filter(function (p) { return p.kind !== 'me'; }); }, function (p) { S.dest = p; renderRouteCard(); $('inDest').blur(); });
  $('inOrig').addEventListener('input', function () { S.origin = null; renderRouteCard(); });
  $('inDest').addEventListener('input', function () { S.dest = null; renderRouteCard(); });
  $('pVoice').addEventListener('change', function () { S.prefs.voice = this.checked; });
  $('pVib').addEventListener('change', function () { S.prefs.vib = this.checked; if (this.checked) buzz([60]); });
  $('pSimple').addEventListener('change', function () { S.prefs.simple = this.checked; });
  $('prepBack').addEventListener('click', function () { go('map'); });
  var tick = 0;
  function startTrip(km0) {
    S.route = buildRoute(S.origin, S.dest); S.km = km0 || 0; S.kmPrev = 0; S.simSec = S.km / 18 * 3600; S.speed = 0;
    S.charge = 84; S.announced = {}; S.wasOver = false; tick = 0; dockReset(true);
  }
  $('unlock').addEventListener('click', function () {
    if (!S.origin || !S.dest) return;
    startTrip(0); go('ride');
    toast('Bici desbloqueada. Empezó el tiempo de uso.', 'lock_open');
    say('Bici desbloqueada. Destino ' + S.dest.label + ', ' + fmt(S.route.km, 1) + ' kilómetros. Buen viaje.');
  });

  /* ---------- 4 · pedalear ---------- */
  function nextMan() {
    var r = S.route;
    for (var i = 0; i < r.man.length; i++) if (r.man[i].km > S.km + 0.0001) return { m: r.man[i], i: i };
    return { m: r.man[r.man.length - 1], i: r.man.length - 1 };
  }
  function fmtD(d) { return d < 1 ? (Math.round(d * 100) * 10) + ' m' : fmt(d, 1) + ' km'; }
  function renderRide() {
    if (!S.route) return 'ok';
    var r = S.route, left = Math.max(0, r.km - S.km), f = Math.min(S.km / r.km, 1);
    var nm = nextMan(), d = Math.max(0, nm.m.km - S.km);
    var zone = (nm.m.walk && d < 0.2) ? 'cross' : (S.speed > 20.5 ? 'over' : 'ok');
    scr.dataset.zone = zone; setTheme();
    $('rmSpeed').textContent = Math.round(S.speed);
    $('rmLeft').textContent = fmt(left, 1) + ' km';
    $('rmEta').textContent = '· ' + Math.max(1, Math.round(left / 18 * 60)) + ' min';
    $('rmTime').textContent = mmss(S.simSec);
    $('rmBar').style.width = (f * 100) + '%';
    renderDockBanner();
    $('rmNextIc').textContent = nm.m.ic; $('rmNextDist').textContent = fmtD(d); $('rmNextTxt').textContent = nm.m.txt;
    var st = zone === 'cross' ? ['directions_walk', 'CRUCE PEATONAL', 'Bajá a 10 km/h, el peatón tiene prioridad']
      : zone === 'over' ? ['speed', 'BAJÁ UN POCO', 'Pasaste los 20 km/h de la onda verde']
      : ['eco', 'EN ONDA VERDE', 'Máximo 20 km/h'];
    $('rmState').innerHTML = '<span class="ms">' + st[0] + '</span>' + st[1];
    $('rmSub').textContent = st[2];
    var km = S.kmPrev + S.km;
    $('rmExtra').hidden = S.prefs.simple;
    $('rxPts').textContent = '+' + tripPts(km); $('rxBat').textContent = Math.round(S.charge) + '%'; $('rxCo2').textContent = fmt(Math.round(km * G_PER_KM)) + ' g';
    $('cueVoice').hidden = !S.prefs.voice; $('cueVib').hidden = !S.prefs.vib;
    $('cueTxt').textContent = S.prefs.voice && S.prefs.vib ? 'Avisos por voz y vibración activos' : S.prefs.voice ? 'Avisos por voz activos' : S.prefs.vib ? 'Avisos por vibración activos' : 'Avisos desactivados';
    return zone;
  }
  /* ---------- disponibilidad en vivo ---------- */
  /* Cada 5 s alguien retira o deja una bici en alguna estación; la del destino cambia más seguido. */
  function liveDocks() {
    var dn = nearestStations(S.route.d, 1)[0];
    var s = Math.random() < 0.6 ? dn : STATIONS[Math.floor(Math.random() * STATIONS.length)];
    var frees = s.d === 0 ? Math.random() < 0.7 : s.d <= 2 ? Math.random() < 0.45 : Math.random() < 0.5;
    var ks = ['e', 'c', 'a'];
    if (frees) {                       /* alguien retira una bici: se libera un anclaje */
      var avail = ks.filter(function (k) { return s[k] > 0; });
      if (!avail.length) return;
      var k = avail[Math.floor(Math.random() * avail.length)]; s[k]--; s.d++;
    } else {                           /* alguien ancla una bici: se ocupa un anclaje */
      if (s.d === 0) return;
      s[ks[Math.floor(Math.random() * ks.length)]]++; s.d--;
    }
    s.el.querySelector('.bub').innerHTML = bubInner(s);
    s.el.setAttribute('aria-label', pinLabel(s));
    renderPins();
  }
  /* Avisa cuando cambia la situación de la estación de tu destino (voz, vibración y cartel en pantalla). */
  function dockKey(di) { return di.full && di.alt ? 'full:' + di.near.name + '>' + di.alt.name : 'ok'; }
  /* Fija el estado de partida. Si el destino ya está lleno al salir, se avisa en cuanto termina el saludo del desbloqueo. */
  function dockReset(sayIfFull) {
    S.dockKey = dockKey(dockInfo(S.route.d)); S.dockNote = null; S.dockSay = !!sayIfFull && S.dockKey !== 'ok';
  }
  function dockWatch() {
    var di = dockInfo(S.route.d), key = dockKey(di), prev = S.dockKey;
    if (key === prev) {
      if (S.dockSay && tick >= 6) { S.dockSay = false; say('La estación ' + di.near.name + ' está llena. Al llegar te llevo a ' + di.alt.name + '.'); buzz([150, 80, 150]); }
      return;
    }
    S.dockKey = key; S.dockSay = false;
    if (key === 'ok') {
      S.dockNote = { t: 'Se liberó lugar en ' + di.near.name, left: 8 };
      say('Se liberó un anclaje en ' + di.near.name + '. Seguimos al destino.'); buzz([100]);
    } else {
      say(prev.indexOf('full') === 0 ? 'Ahora la estación con lugar es ' + di.alt.name + '.'
        : 'La estación ' + di.near.name + ' se llenó. Al llegar te llevo a ' + di.alt.name + '.');
      buzz([150, 80, 150]);
    }
  }
  function renderDockBanner() {
    var di = dockInfo(S.route.d), txt = '';
    if (di.full && di.alt) txt = di.near.name + ' está llena · al llegar vamos a ' + di.alt.name;
    else if (S.dockNote) txt = S.dockNote.t;
    $('rmDock').hidden = !txt; $('rmDockT').textContent = txt;
  }

  setInterval(function () {
    if (S.view !== 'ride' || !S.route) return;
    tick++;
    var nm = nextMan(), d = nm.m.km - S.km;
    var target = (nm.m.walk && d < 0.2) ? 10 : (tick % 16 < 4 && d > 0.3 ? 23 : 18 + Math.sin(tick / 2));
    S.speed += (target - S.speed) * 0.5;
    S.km = Math.min(S.route.km, S.km + S.speed / 3600 * SPEEDUP);
    S.simSec += SPEEDUP; S.charge = Math.max(0, S.charge - 0.03);
    if (nm.m.walk && d < 0.2 && !S.announced[nm.i]) { S.announced[nm.i] = 1; say('Cruce peatonal en ' + Math.max(10, Math.round(d * 100) * 10) + ' metros. Bajá a diez.'); buzz(); }
    if (!nm.m.walk && nm.m.ic !== 'flag' && d < 0.15 && !S.announced[nm.i]) { S.announced[nm.i] = 1; say(nm.m.txt.replace(' · ', ', por ')); buzz([100]); }
    if (tick >= 5 && tick % 5 === 0) liveDocks();
    if (S.dockNote && --S.dockNote.left <= 0) S.dockNote = null;
    dockWatch();
    var zone = renderRide();
    if (zone === 'over' && !S.wasOver) { say('Bajá a veinte para seguir en onda verde.'); buzz([300]); }
    S.wasOver = zone === 'over';
    if (S.km >= S.route.km) {
      S.speed = 0; var di = dockInfo(S.route.d);
      say(di.full && di.alt ? 'Llegaste, pero la estación ' + di.near.name + ' está llena. Te llevo a ' + di.alt.name + '.' : 'Llegaste. Anclá la bici para finalizar.');
      buzz([200, 100, 200, 100, 200]); go('arrive');
    }
  }, reduce ? 2000 : 1000);

  var HOLD_MS = 700, C = 251.3, holdStart = 0, holdRaf = 0, ring = $('holdRing'), holdBtn = $('hold');
  function holdReset() { cancelAnimationFrame(holdRaf); holdStart = 0; ring.setAttribute('stroke-dashoffset', C); }
  function holdStep(now) {
    if (!holdStart) return;
    var p = Math.min(1, (now - holdStart) / HOLD_MS);
    ring.setAttribute('stroke-dashoffset', C * (1 - p));
    if (p >= 1) { holdReset(); S.speed = 0; S.pauseSec = 0; buzz([80]); go('pause'); return; }
    holdRaf = requestAnimationFrame(holdStep);
  }
  function holdBegin(e) { if (S.view !== 'ride' || holdStart) return; if (e.cancelable) e.preventDefault(); holdStart = performance.now(); holdRaf = requestAnimationFrame(holdStep); }
  holdBtn.addEventListener('pointerdown', holdBegin);
  ['pointerup', 'pointerleave', 'pointercancel'].forEach(function (ev) { holdBtn.addEventListener(ev, holdReset); });
  holdBtn.addEventListener('keydown', function (e) { if ((e.key === ' ' || e.key === 'Enter') && !e.repeat) holdBegin(e); });
  holdBtn.addEventListener('keyup', function (e) { if (e.key === ' ' || e.key === 'Enter') holdReset(); });
  holdBtn.addEventListener('contextmenu', function (e) { e.preventDefault(); });

  /* ---------- 5 · pausa ---------- */
  function curPos() { return pointAt(S.route, Math.min(S.km / S.route.km, 1)); }
  function drawMini(svg) {
    var r = S.route, p = curPos();
    var xs = [r.o.x, r.mid.x, r.d.x], ys = [r.o.y, r.mid.y, r.d.y];
    var x0 = Math.min.apply(null, xs) - 70, x1 = Math.max.apply(null, xs) + 70, y0 = Math.min.apply(null, ys) - 50, y1 = Math.max.apply(null, ys) + 50;
    var w = x1 - x0, h = y1 - y0, ar = svg.clientWidth && svg.clientHeight ? svg.clientWidth / svg.clientHeight : 400 / 150;
    if (w / h < ar) { var nw = h * ar; x0 -= (nw - w) / 2; w = nw; } else { var nh = w / ar; y0 -= (nh - h) / 2; h = nh; }
    svg.setAttribute('viewBox', [x0, y0, w, h].join(' '));
    var full = 'M' + r.o.x + ' ' + r.o.y + ' L' + r.mid.x + ' ' + r.mid.y + ' L' + r.d.x + ' ' + r.d.y;
    var pastMid = S.km / r.km * (r.seg[0] + r.seg[1]) > r.seg[0];
    var doneD = 'M' + r.o.x + ' ' + r.o.y + (pastMid ? ' L' + r.mid.x + ' ' + r.mid.y : '') + ' L' + p.x + ' ' + p.y;
    var k = w / 400;
    svg.innerHTML = '<use href="#city"></use><path class="rt-rest" style="stroke-width:' + 3 * k + ';stroke-dasharray:' + 1 * k + ' ' + 5 * k + '" d="' + full + '"></path><path class="rt-done" style="stroke-width:' + 4.5 * k + '" d="' + doneD + '"></path>' +
      '<circle class="rt-o" style="stroke-width:' + 2.5 * k + '" cx="' + r.o.x + '" cy="' + r.o.y + '" r="' + 5 * k + '"></circle><circle class="rt-d" style="stroke-width:' + 2 * k + '" cx="' + r.d.x + '" cy="' + r.d.y + '" r="' + 6 * k + '"></circle><circle class="rt-me" style="stroke-width:' + 2.5 * k + '" cx="' + p.x + '" cy="' + p.y + '" r="' + 6.5 * k + '"></circle>';
  }
  function short(l) { return l.replace('Estación ', ''); }
  function enterPause() {
    if (!S.route) return;
    var r = S.route, km = S.kmPrev + S.km, left = Math.max(0, r.km - S.km);
    $('paRoute').textContent = short(r.o.label) + ' → ' + short(r.d.label);
    drawMini($('paMap'));
    $('paKm').textContent = fmt(S.km, 1) + ' de ' + fmt(r.km, 1) + ' km';
    $('paBar').style.width = Math.min(100, S.km / r.km * 100) + '%';
    $('stTime').textContent = mmss(S.simSec);
    $('stAvg').textContent = S.simSec > 0 ? fmt(km / (S.simSec / 3600), 1) : '0';
    $('stBat').textContent = Math.round(S.charge) + '%'; $('stAuto').textContent = '~' + Math.round(S.charge * 0.4) + ' km';
    $('stPts').textContent = '+' + tripPts(km); $('stCo2').textContent = fmt(Math.round(km * G_PER_KM)) + ' g';
    $('stLeft').textContent = fmt(left, 1) + ' km'; $('stEta').textContent = '~' + Math.max(1, Math.round(left / 18 * 60)) + ' min';
    $('actDestS').textContent = 'Ahora: ' + r.d.label;
    var p = curPos(), near = nearestStations(p, 3), di = dockInfo(p), best = di.alt || near[0];
    $('actDockS').textContent = (di.full ? 'Con lugar, la más cercana: ' : 'La más cercana: ') + best.name + ', a ' + mtxt(dist(best, p));
    $('nearList').innerHTML = near.map(function (s) {
      return '<div class="near"><div><div class="t">' + esc(s.name) + '</div><div class="s">' + mtxt(dist(s, p)) + ' · ' + (s.d ? s.d + ' anclajes libres' : 'llena, sin anclajes libres') + '</div></div><button class="btn btn-outline btn-sm" type="button" data-near="' + STATIONS.indexOf(s) + '"' + (s.d ? '' : ' disabled') + '>' + (s.d ? 'Ir' : 'Llena') + '</button></div>';
    }).join('');
    $('nearList').querySelectorAll('[data-near]').forEach(function (b) { b.addEventListener('click', function () { rerouteTo(stationPlace(STATIONS[+b.dataset.near])); }); });
    $('finConfirm').hidden = true; $('probOk').hidden = true;
    renderPauseTimer();
  }
  function renderPauseTimer() {
    $('paTimer').textContent = mmss(S.pauseSec);
    var rem = Math.max(0, RESERVA - S.pauseSec);
    $('resvTxt').textContent = mmss(rem);
    $('resvRing').setAttribute('stroke-dashoffset', 207.3 * (1 - rem / RESERVA));
  }
  setInterval(function () { if (S.view === 'pause') { S.pauseSec++; S.simSec++; renderPauseTimer(); $('stTime').textContent = mmss(S.simSec); } }, 1000);
  function rerouteTo(p) {
    var here = curPos();
    S.kmPrev += S.km;
    var keep = S.simSec;
    S.route = buildRoute({ label: 'Tu ubicación', sub: '', x: here.x, y: here.y, kind: 'me' }, p);
    S.km = 0; S.simSec = keep; S.announced = {}; S.dest = p; dockReset(false);
    $('inNewDest').value = '';
    document.querySelectorAll('.act').forEach(function (d) { d.open = false; });
    enterPause();
    toast('Nuevo destino: ' + short(p.label) + ' · ' + fmt(S.route.km, 1) + ' km', 'alt_route');
  }
  attachAC($('inNewDest'), $('acNew'), function () { return PLACES.filter(function (p) { return p.kind !== 'me'; }); }, rerouteTo);
  document.querySelectorAll('input[name="prob"]').forEach(function (r) { r.addEventListener('change', function () { $('probSend').disabled = false; $('probOk').hidden = true; }); });
  $('probSend').addEventListener('click', function () {
    var sel = document.querySelector('input[name="prob"]:checked'); if (!sel) return;
    $('probOkTxt').textContent = 'Reporte de “' + sel.value + '” registrado. Si la bici no puede seguir, te indicamos dónde cambiarla.';
    $('probOk').hidden = false; $('probSend').disabled = true; sel.checked = false;
  });
  $('resume').addEventListener('click', function () { go('ride'); say('Seguimos. Faltan ' + fmt(Math.max(0, S.route.km - S.km), 1) + ' kilómetros.'); });
  $('finish').addEventListener('click', function () {
    var p = curPos(), di = dockInfo(p), s = di.alt || di.near;
    $('finTxt').innerHTML = di.full && di.alt
      ? 'La estación más cercana, <b>' + esc(di.near.name) + '</b>, está llena. Anclá la bici en <b>' + esc(s.name) + '</b>, a ' + mtxt(dist(s, p)) + ', con ' + s.d + ' anclajes libres.'
      : 'Para finalizar, anclá la bici en una estación. La más cercana es <b>' + esc(s.name) + '</b>, a ' + mtxt(dist(s, p)) + ', con ' + s.d + ' anclajes libres.';
    $('finConfirm').hidden = false; $('finConfirm').dataset.st = STATIONS.indexOf(s);
    $('finConfirm').scrollIntoView({ block: 'nearest', behavior: reduce ? 'auto' : 'smooth' });
  });
  $('finGo').addEventListener('click', function () { rerouteTo(stationPlace(STATIONS[+$('finConfirm').dataset.st])); });
  $('finOk').addEventListener('click', finishTrip);

  /* ---------- llegada y fin ---------- */
  function renderArrive() {
    var km = S.kmPrev + S.km, di = dockInfo(S.route.d), s = di.near, redirect = di.full && !!di.alt;
    $('arTitle').textContent = 'Llegaste a ' + short(S.route.d.label);
    $('arPts').textContent = '+' + tripPts(km) + ' puntos';
    $('arSub').textContent = fmt(km, 1) + ' km en ' + Math.max(1, Math.round(S.simSec / 60)) + ' min · ' + fmt(Math.round(km * G_PER_KM)) + ' g de CO₂ evitado';
    $('arFull').hidden = !redirect; $('arGo').hidden = !redirect; $('arFinish').hidden = redirect;
    if (redirect) {
      $('arFullT').textContent = 'La estación ' + s.name + ' está llena';
      $('arFullS').textContent = 'La más cercana con anclajes libres es ' + di.alt.name + ', a ' + mtxt(dist(di.alt, S.route.d)) + ' (' + di.alt.d + ' libres). La bici sigue a tu nombre hasta que la ancles.';
      $('arDock').textContent = 'Estación ' + di.alt.name;
      $('arDockS').textContent = di.alt.d + ' anclajes libres a ' + mtxt(dist(di.alt, S.route.d)) + ' de acá.';
    } else {
      $('arDock').textContent = 'Estación ' + s.name;
      $('arDockS').textContent = s.d + ' anclajes libres a ' + mtxt(dist(s, S.route.d)) + '. Empujá la bici en el anclaje hasta que se encienda la luz verde.';
    }
    $('arTime').textContent = mmss(S.simSec);
    $('arAvg').textContent = S.simSec ? fmt(km / (S.simSec / 3600), 1) : '0';
  }
  $('arFinish').addEventListener('click', finishTrip);
  $('arGo').addEventListener('click', function () {
    var di = dockInfo(S.route.d); if (!di.alt) return;
    var st = stationPlace(di.alt);
    rerouteTo(st); go('ride');
    toast('Nuevo destino: ' + di.alt.name + ' · ' + fmt(S.route.km, 1) + ' km', 'alt_route');
    say('Seguimos hasta ' + di.alt.name + '. Hay ' + di.alt.d + ' anclajes libres.');
  });
  function finishTrip() {
    var km = S.kmPrev + S.km, p = tripPts(km);
    S.points += p; S.lastKm = km; S.lastPts = p; save();
    S.route = null; S.bike = null; S.origin = null; S.dest = null; S.km = 0; S.kmPrev = 0;
    go('wallet');
    var g = $('gain'); g.classList.remove('flash'); void g.offsetWidth; g.classList.add('flash');
    toast('Viaje finalizado. Sumaste ' + p + ' puntos.', 'eco');
  }

  /* ---------- 6 · billetera ---------- */
  var CATS = [['all', 'Todos', 'apps'], ['gastro', 'Gastronomía', 'restaurant'], ['barrio', 'Barrio', 'storefront'], ['cultura', 'Cultura', 'theater_comedy'], ['movilidad', 'Movilidad', 'pedal_bike'], ['salud', 'Salud', 'favorite'], ['trabajo', 'Trabajo', 'work']];
  var CAT_C = {
    gastro: ['var(--o-warning-sub)', 'var(--o-warning-text)'], barrio: ['var(--o-highlight)', 'var(--o-warning-text)'], cultura: ['#e6defa', '#4a2d8a'],
    movilidad: ['var(--o-success-sub)', 'var(--o-success)'], salud: ['var(--o-danger-sub)', 'var(--o-danger)'], trabajo: ['var(--o-info-sub)', 'var(--o-secondary)']
  };
  var CAT_NAME = {}; CATS.forEach(function (c) { CAT_NAME[c[0]] = c[1]; });
  var OFFERS = [
    { id: 'cafe', t: 'Café de especialidad', partner: 'Café La Esquina Solar', area: 'Villa Crespo', cat: 'gastro', cost: 60, ic: 'coffee', tag: 'Popular', feat: 'y', desc: 'Un café chico o mediano, con leche vegetal si querés. Llegás en bici y lo retirás en la barra.', conds: ['De lunes a viernes, de 8 a 12', 'Uno por persona por día'], kw: 'cafe desayuno' },
    { id: 'cine', t: '2x1 en entradas de cine', partner: 'Cine del Barrio', area: 'Palermo', cat: 'cultura', cost: 120, ic: 'movie', tag: 'Nuevo', feat: 'b', desc: 'Dos entradas por el precio de una para cualquier función de la semana. Tiene bicicletero en la puerta.', conds: ['De lunes a jueves', 'No incluye estrenos del fin de semana'], kw: 'pelicula entradas' },
    { id: 'service', t: 'Service completo de tu bici', partner: 'Bicicletería Rueda Libre', area: 'Almagro', cat: 'movilidad', cost: 120, was: 180, ic: 'build', tag: 'Oferta', feat: 'o', desc: 'Ajuste de frenos y cambios, lubricación de cadena y revisión de cubiertas. Para tu bici propia.', conds: ['Con turno previo', 'Repuestos aparte'], kw: 'bicicleta mecanico taller' },
    { id: 'mensual', t: 'Pase mensual de E-bike al 50%', partner: 'ECOMOV BA', area: 'Toda la ciudad', cat: 'movilidad', cost: 600, ic: 'electric_bike', tag: 'Meta', feat: 'd', desc: 'Un mes de viajes ilimitados en E-bike, de hasta 60 minutos cada uno, a mitad de precio.', conds: ['Se activa el día que lo canjeás', 'Válido para E-bikes y bicis de carga'], kw: 'abono ebike bici' },
    { id: 'almacen', t: '15% en Almacén Palermo', partner: 'Comercios del Barrio', area: 'Palermo', cat: 'barrio', cost: 150, ic: 'storefront', desc: 'Descuento en toda la compra en almacenes adheridos del barrio.', conds: ['Tope de descuento: una compra por semana'], kw: 'almacen supermercado compras' },
    { id: 'feria', t: '20% en la feria orgánica', partner: 'Feria de Productores', area: 'Parque Centenario', cat: 'barrio', cost: 110, ic: 'nutrition', desc: 'Descuento en frutas, verduras y productos de productores locales.', conds: ['Sábados de 9 a 14'], kw: 'verduras frutas organico' },
    { id: 'almuerzo', t: '25% en almuerzo saludable', partner: 'Cantina Verde', area: 'Microcentro', cat: 'gastro', cost: 130, ic: 'lunch_dining', desc: 'Menú del día con opción vegetariana, a un cuarto menos.', conds: ['De lunes a viernes, de 12 a 15'], kw: 'comida menu restaurante' },
    { id: 'museos', t: 'Entrada a museos porteños', partner: 'Circuito de Museos BA', area: 'Varios barrios', cat: 'cultura', cost: 80, ic: 'museum', desc: 'Una entrada general a cualquier museo del circuito, con estación de bicis cerca.', conds: ['Excepto días de entrada libre'], kw: 'museo arte' },
    { id: 'yoga', t: 'Clase de yoga en el parque', partner: 'Movete BA', area: 'Parque Centenario', cat: 'salud', cost: 90, ic: 'self_improvement', desc: 'Una clase al aire libre de 60 minutos. Si llueve, se pasa a otra fecha.', conds: ['Martes y jueves a las 8'], kw: 'deporte actividad' },
    { id: 'prepaga', t: '10% en la cuota de tu prepaga', partner: 'Prepagas adheridas', area: 'Online', cat: 'salud', cost: 250, ic: 'health_and_safety', desc: 'Bonificación en la cuota del mes siguiente. Se aplica sola en tu factura.', conds: ['Una vez por mes'], kw: 'salud medico obra social' },
    { id: 'chequeo', t: 'Chequeo cardiológico sin cargo', partner: 'Prepagas adheridas', area: 'Recoleta', cat: 'salud', cost: 500, ic: 'cardiology', desc: 'Electrocardiograma y consulta con cardiología, sin costo.', conds: ['Con turno previo'], kw: 'corazon medico' },
    { id: 'diaLibre', t: 'Día libre en tu trabajo', partner: 'Empresas adheridas', area: 'Online', cat: 'trabajo', cost: 400, ic: 'beach_access', desc: 'Un día libre a elección, coordinado con tu equipo.', conds: ['Aviso con 7 días de anticipación', 'Uno por trimestre'], kw: 'vacaciones franco' },
    { id: 'homeoffice', t: 'Viernes de home office', partner: 'Empresas adheridas', area: 'Online', cat: 'trabajo', cost: 220, ic: 'home_work', desc: 'Un viernes de trabajo remoto extra en el mes.', conds: ['Uno por mes'], kw: 'remoto casa' },
    { id: 'extra', t: '30 minutos extra de E-bike', partner: 'ECOMOV BA', area: 'Toda la ciudad', cat: 'movilidad', cost: 40, ic: 'more_time', desc: 'Sumá media hora a tu próximo viaje sin cargo.', conds: ['Se usa en tu próximo viaje'], kw: 'tiempo bici ebike' }
  ];
  var PROMO = { promo: true, t: 'Doble de puntos este fin de semana', p: 'Pedaleando por la Ciclovía Rápida, sábado y domingo', tag: 'Por tiempo limitado', ic: 'bolt', feat: 'g' };
  var FEATURED = [PROMO].concat(OFFERS.filter(function (o) { return o.feat; }));
  var LEVELS = [[0, 'Activo'], [500, 'Comprometido'], [1000, 'Referente'], [2000, 'Guardián del aire']];
  S.passes = [{ t: '15% en Almacén Palermo', s: 'Hasta el 30/11/2040', code: 'ECOMOV:PASE:ALMACEN-PALERMO:15' }];
  var wq = '', wcat = 'all', wLastFocus = null;

  function catBtns() {
    $('cats').innerHTML = CATS.map(function (c) {
      return '<button class="chip-f" type="button" data-c="' + c[0] + '" aria-pressed="' + (wcat === c[0]) + '"><span class="ms">' + c[2] + '</span>' + c[1] + '</button>';
    }).join('');
    $('cats').querySelectorAll('.chip-f').forEach(function (b) { b.addEventListener('click', function () { wcat = b.dataset.c; catBtns(); renderList(); }); });
  }
  function renderCarousel() {
    $('car').innerHTML = FEATURED.map(function (o, i) {
      var cost = o.promo ? '<span class="cost">Se activa solo</span>' : '<span class="cost num">' + o.cost + ' pts</span>' + (o.was ? '<s class="num">' + o.was + ' pts</s>' : '');
      var go = o.promo ? 'Ver cómo' : (S.points >= o.cost ? 'Canjear' : 'Te faltan ' + (o.cost - S.points));
      return '<button class="ofc ' + o.feat + '" type="button" data-i="' + i + '" role="group" aria-roledescription="oferta" aria-label="' + (i + 1) + ' de ' + FEATURED.length + ': ' + esc(o.t) + '">' +
        '<span class="ms big" aria-hidden="true">' + o.ic + '</span><span class="tag">' + esc(o.tag) + '</span>' +
        '<span><span class="h">' + esc(o.t) + '</span><span class="p">' + esc(o.promo ? o.p : o.partner + ' · ' + o.area) + '</span></span>' +
        '<span class="ft">' + cost + '<span class="go">' + go + '<span class="ms" style="font-size:16px">chevron_right</span></span></span></button>';
    }).join('');
    $('dots').innerHTML = FEATURED.map(function (o, i) { return '<button type="button" aria-label="Oferta ' + (i + 1) + '" data-i="' + i + '"></button>'; }).join('');
    $('car').querySelectorAll('.ofc').forEach(function (b) {
      b.addEventListener('click', function () {
        var o = FEATURED[+b.dataset.i];
        if (o.promo) toast('Listo: este sábado y domingo sumás el doble por cada km en la Ciclovía Rápida.', 'bolt');
        else openOffer(o);
      });
    });
    $('dots').querySelectorAll('button').forEach(function (d) { d.addEventListener('click', function () { carGo(+d.dataset.i); }); });
    carSync();
  }
  function carIdx() {
    var car = $('car'), cards = car.children; if (!cards.length) return 0;
    var step = cards.length > 1 ? cards[1].offsetLeft - cards[0].offsetLeft : 1;
    return Math.max(0, Math.min(cards.length - 1, Math.round(car.scrollLeft / step)));
  }
  function carGo(i) {
    var car = $('car'), cards = car.children; i = Math.max(0, Math.min(cards.length - 1, i));
    car.scrollTo({ left: cards[i].offsetLeft - cards[0].offsetLeft, behavior: reduce ? 'auto' : 'smooth' });
  }
  function carSync() {
    var i = carIdx(), n = FEATURED.length;
    $('dots').querySelectorAll('button').forEach(function (d, k) { d.setAttribute('aria-current', k === i ? 'true' : 'false'); });
    $('carPrev').disabled = i === 0; $('carNext').disabled = i === n - 1;
  }
  var carT;
  $('car').addEventListener('scroll', function () { clearTimeout(carT); carT = setTimeout(carSync, 60); });
  $('carPrev').addEventListener('click', function () { carGo(carIdx() - 1); });
  $('carNext').addEventListener('click', function () { carGo(carIdx() + 1); });

  function hlw(text, q) { return q ? hl(text, q) : esc(text); }
  function renderList() {
    var q = norm(wq.trim());
    var list = OFFERS.filter(function (o) {
      if (wcat !== 'all' && o.cat !== wcat) return false;
      if (!q) return true;
      return norm(o.t + ' ' + o.partner + ' ' + o.area + ' ' + CAT_NAME[o.cat] + ' ' + (o.kw || '')).indexOf(q) >= 0;
    }).sort(function (a, b) {
      var aa = S.points >= a.cost, bb = S.points >= b.cost;
      return aa === bb ? a.cost - b.cost : (aa ? -1 : 1);
    });
    $('featWrap').hidden = !!q;
    $('cTitle').textContent = q ? 'Resultados para “' + wq.trim() + '”' : (wcat === 'all' ? 'Canjes disponibles' : CAT_NAME[wcat]);
    $('cCount').textContent = list.length + (list.length === 1 ? ' canje' : ' canjes');
    if (!list.length) {
      $('cList').innerHTML = '<div class="empty-s"><span class="ms">search_off</span><span>No hay canjes ' + (q ? 'con “' + esc(wq.trim()) + '”' : 'en esta categoría') + '. Probá con café, cine, bici o salud.</span>' +
        '<button class="btn btn-outline btn-sm" type="button" id="cClear">Ver todos los canjes</button></div>';
      $('cClear').addEventListener('click', function () { wq = ''; $('cSearch').value = ''; wcat = 'all'; catBtns(); renderList(); });
      return;
    }
    $('cList').innerHTML = list.map(function (o) {
      var c = CAT_C[o.cat], ok = S.points >= o.cost;
      return '<button class="ci" type="button" data-id="' + o.id + '">' +
        '<span class="ic" style="background:' + c[0] + ';color:' + c[1] + '"><span class="ms">' + o.ic + '</span></span>' +
        '<span style="min-width:0"><span class="t">' + hlw(o.t, q) + '</span><span class="s">' + hlw(o.partner, q) + ' · ' + esc(o.area) + '</span></span>' +
        '<span class="cost"><b class="num">' + o.cost + ' pts</b>' + (o.was ? '<s class="num">' + o.was + '</s>' : '') +
        (ok ? '<span class="badge b-success">Te alcanza</span>' : '<span class="badge b-default num">Faltan ' + (o.cost - S.points) + '</span>') + '</span></button>';
    }).join('');
    $('cList').querySelectorAll('.ci').forEach(function (b) {
      b.addEventListener('click', function () { openOffer(OFFERS.filter(function (o) { return o.id === b.dataset.id; })[0]); });
    });
  }
  $('cSearch').addEventListener('input', function () { wq = this.value; renderList(); });
  $('cSearch').addEventListener('keydown', function (e) { if (e.key === 'Enter') this.blur(); });

  function renderPasses() {
    $('pCount').textContent = S.passes.length + (S.passes.length === 1 ? ' activo' : ' activos');
    $('passes').innerHTML = S.passes.map(function (p, i) {
      return '<button class="pc" type="button" data-i="' + i + '"><canvas width="29" height="29" aria-hidden="true"></canvas><span><span class="t">' + esc(p.t) + '</span><span class="s">' + esc(p.s) + '</span></span></button>';
    }).join('');
    $('passes').querySelectorAll('.pc').forEach(function (b) {
      var p = S.passes[+b.dataset.i]; drawQR(b.querySelector('canvas'), p.code);
      b.addEventListener('click', function () { openPass(p); });
    });
  }

  function openW(html) {
    wLastFocus = document.activeElement;
    $('wSheet').innerHTML = '<div class="handle"></div>' + html;
    $('wSheet').hidden = false; $('wScrim').hidden = false;
    var x = $('wsClose'); if (x) { x.addEventListener('click', closeW); x.focus(); }
  }
  function closeW() {
    $('wSheet').hidden = true; $('wScrim').hidden = true;
    if (wLastFocus && document.contains(wLastFocus)) try { wLastFocus.focus(); } catch (e) {}
  }
  $('wScrim').addEventListener('click', closeW);
  $('v-wallet').addEventListener('keydown', function (e) { if (e.key === 'Escape' && !$('wSheet').hidden) closeW(); });
  function sheetTop(o) {
    var c = CAT_C[o.cat];
    return '<div class="ws-top"><div class="ws-ic" style="background:' + c[0] + ';color:' + c[1] + '"><span class="ms">' + o.ic + '</span></div>' +
      '<div style="flex:1;min-width:0"><div class="t" id="wsTitle">' + esc(o.t) + '</div><div class="s">' + esc(o.partner + ' · ' + o.area) + '</div></div>' +
      '<button class="icon-btn" type="button" id="wsClose" aria-label="Cerrar"><span class="ms">close</span></button></div>';
  }
  function openOffer(o) {
    var ok = S.points >= o.cost, rest = S.points - o.cost;
    openW(sheetTop(o) +
      '<span class="badge b-default" style="justify-self:start"><span class="ms">' + CATS.filter(function (c) { return c[0] === o.cat; })[0][2] + '</span>' + CAT_NAME[o.cat] + '</span>' +
      '<p class="desc">' + esc(o.desc) + '</p>' +
      '<ul class="conds">' + o.conds.map(function (c) { return '<li>' + esc(c) + '</li>'; }).join('') + '<li>El pase dura 30 días desde que lo canjeás</li></ul>' +
      '<div class="ws-cost num"><div><span>Cuesta</span><b>' + o.cost + ' pts</b></div><div><span>' + (ok ? 'Te quedan' : 'Tenés') + '</span><b>' + fmt(ok ? rest : S.points) + ' pts</b></div></div>' +
      (ok ? '' : '<div class="warn-line"><span class="ms">directions_bike</span>Te faltan ' + (o.cost - S.points) + ' puntos: unos ' + fmt((o.cost - S.points) * G_PER_PT / G_PER_KM, 1) + ' km más de pedaleo.</div>') +
      '<button class="btn ' + (ok ? 'btn-success' : 'btn-primary') + '" type="button" id="wsOk">' + (ok ? '<span class="ms">redeem</span>CANJEAR POR ' + o.cost + ' PUNTOS' : '<span class="ms">map</span>BUSCAR UNA BICI EN EL MAPA') + '</button>');
    $('wsOk').addEventListener('click', function () {
      if (!ok) { closeW(); go('map'); return; }
      S.points -= o.cost;
      var pass = { t: o.t, s: o.partner + ' · válido 30 días', code: 'ECOMOV:PASE:' + o.id.toUpperCase() + ':' + (1000 + S.passes.length) };
      S.passes.unshift(pass); save();
      renderPoints();
      openW('<div class="ws-done"><div class="okc"><span class="ms">check</span></div><h3 id="wsTitle">Canje listo</h3><p>' + esc(o.t) + ' ya está en tus pases. Mostrá este código en ' + esc(o.partner) + '.</p><canvas id="wsQr" width="29" height="29" aria-label="Código QR del pase"></canvas><p class="num">Te quedan ' + fmt(S.points) + ' puntos</p></div>' +
        '<button class="btn btn-primary" type="button" id="wsClose">LISTO</button>');
      drawQR($('wsQr'), pass.code);
      toast('Canjeaste ' + o.t + '.', 'redeem');
    });
  }
  function openPass(p) {
    openW('<div class="ws-done"><span class="badge b-success"><span class="dot"></span>Activo</span><h3 id="wsTitle">' + esc(p.t) + '</h3><p>' + esc(p.s) + '</p><canvas id="wsQr" width="29" height="29" aria-label="Código QR del pase"></canvas><p>Mostralo en caja. Subí el brillo de la pantalla si no lo leen.</p></div>' +
      '<button class="btn btn-outline" type="button" id="wsClose">CERRAR</button>');
    drawQR($('wsQr'), p.code);
  }

  function renderPoints() {
    document.querySelectorAll('[data-points]').forEach(function (el) { el.textContent = fmt(S.points); });
    $('kgTotal').textContent = fmt(S.points * G_PER_PT / 1000, 1);
    var cur = LEVELS[0], next = null;
    for (var i = 0; i < LEVELS.length; i++) { if (S.points >= LEVELS[i][0]) { cur = LEVELS[i]; next = LEVELS[i + 1] || null; } }
    $('lvlName').textContent = cur[1];
    $('lvlNext').textContent = next ? 'Faltan ' + fmt(next[0] - S.points) + ' para ' + next[1] : 'Nivel máximo';
    $('lvlBar').style.width = next ? ((S.points - cur[0]) / (next[0] - cur[0]) * 100) + '%' : '100%';
    var g = $('gain');
    g.hidden = !S.lastPts;
    if (S.lastPts) g.innerHTML = '<span class="ms">pedal_bike</span>+' + S.lastPts + ' de tu viaje de hoy · ' + fmt(S.lastKm, 1) + ' km';
    $('cSearch').value = wq;
    catBtns(); renderCarousel(); renderList(); renderPasses();
  }

  /* ---------- pestañas ---------- */
  document.querySelectorAll('[data-go]').forEach(function (b) {
    b.addEventListener('click', function () { go(b.dataset.go); });
  });
  document.querySelectorAll('[data-soon]').forEach(function (b) {
    b.addEventListener('click', function () { toast(b.dataset.soon + ' llega en la próxima versión.', 'info'); });
  });

  /* ---------- inicio ---------- */
  load(); renderPins(); renderPoints(); layoutWorld();
  go('map');
  requestAnimationFrame(function () { centerOn(USER.x, USER.y, 0.55, false); });
})();

if ('serviceWorker' in navigator) {
  window.addEventListener('load', function () { navigator.serviceWorker.register('sw.js').catch(function () {}); });
}
