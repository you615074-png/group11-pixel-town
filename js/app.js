/* 主程序：数据、俯视地图、场景、镜头与交互 */
(function () {
  'use strict';
  var PT = window.PT;
  var D = window.TOWN_DATA;
  if (!D) {
    document.body.innerHTML = '<p style="padding:24px;font-family:sans-serif">数据没有加载成功，请确认 data/data.js 存在。</p>';
    return;
  }

  function esc(v) {
    return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  var sceneMap = {};
  var bySceneMap = {};
  D.scenes.forEach(function (s) { sceneMap[s.id] = s; bySceneMap[s.id] = []; });
  D.members.forEach(function (m) { if (bySceneMap[m.scene]) bySceneMap[m.scene].push(m); });
  var allMembers = [D.admin].concat(D.members);

  PT.data = D;
  PT.members = D.members;
  PT.admin = D.admin;
  PT.allMembers = allMembers;
  PT.sceneById = function (id) { return sceneMap[id]; };
  PT.byScene = function (id) { return (bySceneMap[id] || []).slice(); };
  PT.getMember = function (name) {
    if (!name) return null;
    for (var i = 0; i < allMembers.length; i++) if (allMembers[i].name === name) return allMembers[i];
    return null;
  };

  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var map = {
    canvas: null, ctx: null, wrap: null, labels: null, tooltip: null,
    layout: null, bg: null, actors: [], mode: null,
    hoverZone: null, hoverActor: null, lastT: 0, built: false,
    spritesReady: false, chips: null, clockTimer: null
  };

  var scene = {
    open: false, id: null, w: 0, h: 0, layout: null, bg: null,
    actors: [], labels: [], hovered: null, noticeRect: null,
    openTimer: null, toastTimer: null
  };

  var dpr = 1;

  /* ── 地图 ─────────────────────────────────────────────── */
  function isNarrow() {
    return window.innerWidth <= 720;
  }

  function initMap() {
    map.canvas = document.getElementById('mapCanvas');
    map.ctx = map.canvas.getContext('2d');
    map.ctx.imageSmoothingEnabled = false;
    map.wrap = document.getElementById('mapWrap');
    map.labels = document.getElementById('zoneLabels');
    map.tooltip = document.getElementById('mapTooltip');
    map.chips = document.getElementById('zoneChips');
    rebuildMap();
    buildZoneChips();
    startClock();
    bindMap();
    PT.world.onReady(function () {
      map.spritesReady = true;
      rebuildMap();
      if (scene.open) buildScene();
    });
    requestAnimationFrame(loop);
  }

  function rebuildMap() {
    var narrow = isNarrow();
    var mode = narrow ? 'narrow' : 'wide';
    var L = PT.world.getMapLayout(narrow);
    map.layout = L;
    map.mode = mode;
    map.canvas.width = L.w;
    map.canvas.height = L.h;
    map.ctx.imageSmoothingEnabled = false;
    map.canvas.style.aspectRatio = L.w + ' / ' + L.h;
    map.bg = document.createElement('canvas');
    map.bg.width = L.w;
    map.bg.height = L.h;
    var ctx = map.bg.getContext('2d');
    PT.world.drawMapStatic(ctx, L);
    map.actors = PT.world.layoutMapActors(L, D.members, D.admin);
    map.hoverZone = null;
    map.hoverActor = null;
    buildZoneLabels(L);
    map.built = true;
  }

  function buildZoneLabels(L) {
    map.labels.innerHTML = '';
    D.scenes.forEach(function (s) {
      var z = L.zones[s.id];
      if (!z) return;
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'zone-label';
      b.setAttribute('data-zone', s.id);
      b.style.left = ((z.x + 8) / L.w * 100) + '%';
      b.style.top = ((z.y + 8) / L.h * 100) + '%';
      b.style.setProperty('--zone-color', s.color || '#f0c040');
      b.setAttribute('aria-label', '进入' + s.name + '，' + s.count + ' 位村民');
      var count = s.id === 'station' ? (s.count + '') : (s.count + '');
      b.innerHTML = '<span class="zone-icon" aria-hidden="true">' + esc(s.icon) + '</span>' +
        '<span>' + esc(s.name) + '</span><span class="zone-count">' + esc(count) + '</span>' +
        (s.id === 'station' ? '<span class="zone-sub">镇长在旁</span>' : '') +
        (s.id === 'lakeside' ? '<span class="zone-sub">有湖</span>' : '');
      b.addEventListener('click', function () { enterScene(s.id); });
      b.addEventListener('mouseenter', function () { map.hoverZone = s.id; map.hoverActor = null; markLabel(s.id); });
      b.addEventListener('mouseleave', function () { if (map.hoverZone === s.id) map.hoverZone = null; markLabel(null); });
      b.addEventListener('focus', function () { map.hoverZone = s.id; markLabel(s.id); });
      b.addEventListener('blur', function () { if (map.hoverZone === s.id) map.hoverZone = null; markLabel(null); });
      map.labels.appendChild(b);
    });
    // 空房子
    var e = L.empty;
    var eb = document.createElement('button');
    eb.type = 'button';
    eb.className = 'zone-label is-empty';
    eb.style.left = ((e.x + 8) / L.w * 100) + '%';
    eb.style.top = ((e.y + 8) / L.h * 100) + '%';
    eb.innerHTML = '<span class="zone-icon" aria-hidden="true">🏚</span><span>空房子</span><span class="zone-sub">待入住</span>';
    eb.setAttribute('aria-label', '空房子，这间房还空着');
    eb.addEventListener('click', function () { PT.ui.showToast('这间房还空着'); });
    eb.addEventListener('mouseenter', function () { map.hoverZone = 'empty'; markLabel('empty'); });
    eb.addEventListener('mouseleave', function () { if (map.hoverZone === 'empty') map.hoverZone = null; markLabel(null); });
    map.labels.appendChild(eb);
    // 镇长小牌
    var mm = document.createElement('button');
    mm.type = 'button';
    mm.className = 'map-mayor';
    mm.style.left = ((L.admin.x + 16) / L.w * 100) + '%';
    mm.style.top = ((L.admin.y + 44) / L.h * 100) + '%';
    mm.innerHTML = '<span aria-hidden="true">★</span> 镇长 ' + esc(D.admin.name);
    mm.setAttribute('aria-label', '和镇长' + D.admin.name + '聊天');
    mm.addEventListener('click', function () { enterScene('station', { member: D.admin }); });
    map.labels.appendChild(mm);
  }

  function markLabel(id) {
    var labels = map.labels.querySelectorAll('.zone-label');
    for (var i = 0; i < labels.length; i++) {
      var zid = labels[i].getAttribute('data-zone');
      var isActive = (zid && zid === id) || (!zid && id === 'empty' && labels[i].classList.contains('is-empty'));
      labels[i].classList.toggle('is-active', !!isActive);
    }
    var mayor = map.labels.querySelector('.map-mayor');
    if (mayor) mayor.classList.toggle('is-active', id === 'station' || id === 'admin');
  }

  function buildZoneChips() {
    if (!map.chips) return;
    map.chips.innerHTML = '';
    D.scenes.forEach(function (s) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'zone-chip';
      b.style.setProperty('--zone-color', s.color || '#f0c040');
      b.innerHTML = '<span aria-hidden="true">' + esc(s.icon) + '</span>' + esc(s.name) +
        '<b>' + esc(PT.byScene(s.id).length) + '</b>';
      b.setAttribute('aria-label', '进入' + s.name);
      b.addEventListener('click', function () { enterScene(s.id); });
      map.chips.appendChild(b);
    });
    var e = document.createElement('button');
    e.type = 'button';
    e.className = 'zone-chip is-empty';
    e.innerHTML = '<span aria-hidden="true">🏚</span>空房子<b>待入住</b>';
    e.addEventListener('click', function () { PT.ui.showToast('这间房还空着'); });
    map.chips.appendChild(e);
  }

  function startClock() {
    function tick() {
      var h = PT.world.getHour();
      var m = new Date().getMinutes();
      var time = document.getElementById('clockTime');
      var icon = document.getElementById('clockIcon');
      var weather = document.getElementById('clockWeather');
      if (time) time.textContent = (h < 10 ? '0' : '') + h + ':' + (m < 10 ? '0' : '') + m;
      if (icon) icon.textContent = (h >= 20 || h < 6) ? '☾' : (h >= 18 ? '☀' : '☀');
      if (weather) weather.textContent = (h >= 20 || h < 6) ? '夜 · 灯亮着' : (h >= 18 ? '傍晚 · 暖光' : '晴 · 小镇时间');
    }
    tick();
    if (map.clockTimer) clearInterval(map.clockTimer);
    map.clockTimer = setInterval(tick, 20000);
  }

  function bindMap() {
    var c = map.canvas;
    c.addEventListener('mousemove', onMapMove);
    c.addEventListener('mouseleave', function () {
      map.hoverZone = null;
      map.hoverActor = null;
      hideTooltip();
      markLabel(null);
      c.style.cursor = 'default';
    });
    c.addEventListener('click', onMapClick);
    window.addEventListener('resize', debounce(function () {
      var narrow = isNarrow();
      if (!map.built || (narrow ? 'narrow' : 'wide') !== map.mode) {
        rebuildMap();
      }
      if (scene.open) resizeScene();
    }, 140));
  }

  function mapPoint(e) {
    var r = map.canvas.getBoundingClientRect();
    return {
      x: (e.clientX - r.left) / r.width * map.layout.w,
      y: (e.clientY - r.top) / r.height * map.layout.h,
      cx: e.clientX - r.left,
      cy: e.clientY - r.top,
      rect: r
    };
  }

  function inRect(p, r) {
    return r && p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h;
  }

  function actorAt(p) {
    for (var i = map.actors.length - 1; i >= 0; i--) {
      var a = map.actors[i];
      if (p.x >= a.x - 4 && p.x <= a.x + a.w + 4 && p.y >= a.y - 4 && p.y <= a.y + a.h + 4) return a;
    }
    return null;
  }

  function zoneAt(p) {
    for (var id in map.layout.zones) {
      if (inRect(p, map.layout.zones[id])) return id;
    }
    return inRect(p, map.layout.empty) ? 'empty' : null;
  }

  function onMapMove(e) {
    var p = mapPoint(e);
    var a = actorAt(p);
    if (a) {
      map.hoverActor = a;
      map.hoverZone = null;
      markLabel(null);
      map.canvas.style.cursor = 'pointer';
      showTooltip(a.member.name + ' · 点击聊聊', p);
      return;
    }
    map.hoverActor = null;
    var z = zoneAt(p);
    // 公告栏单独热点
    if (z === 'plaza' && inRect(p, map.layout.noticeBoardRect || {})) {
      map.hoverZone = 'plaza';
      markLabel('plaza');
      map.canvas.style.cursor = 'pointer';
      showTooltip('小镇公告栏 · 点击查看', p);
      return;
    }
    map.hoverZone = z;
    markLabel(z);
    hideTooltip();
    map.canvas.style.cursor = z ? 'pointer' : 'default';
  }

  function onMapClick(e) {
    var p = mapPoint(e);
    var a = actorAt(p);
    if (a) {
      enterScene(a.member.scene, { member: a.member });
      return;
    }
    var z = zoneAt(p);
    if (z === 'empty') { PT.ui.showToast('这间房还空着'); return; }
    if (z === 'plaza' && inRect(p, map.layout.noticeBoardRect || {})) {
      PT.ui.openLayer(document.getElementById('boardModal'));
      return;
    }
    if (z) enterScene(z);
  }

  function showTooltip(text, p) {
    var tip = map.tooltip;
    tip.textContent = text;
    var x = Math.max(48, Math.min(p.rect.width - 48, p.cx));
    var y = Math.max(26, p.cy - 56);
    tip.style.left = x + 'px';
    tip.style.top = y + 'px';
    tip.style.transform = 'translate(-50%, -100%)';
    tip.classList.add('is-on');
  }
  function hideTooltip() { map.tooltip.classList.remove('is-on'); }

  function debounce(fn, ms) {
    var t = null;
    return function () {
      if (t) clearTimeout(t);
      t = setTimeout(fn, ms);
    };
  }

  function updateMapActors(dt, t) {
    for (var i = 0; i < map.actors.length; i++) {
      var a = map.actors[i];
      if (a.isAdmin) {
        a.frame = Math.floor(t * 1.6) % 2;
        a.bob = 0;
        continue;
      }
      if (a.pause > 0) {
        a.pause -= dt;
        a.frame = 0;
        continue;
      }
      var dx = a.targetX - a.x;
      var dy = a.targetY - a.y;
      var dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 2.5) {
        var w = a.walk;
        a.targetX = w.x + Math.random() * Math.max(1, w.w - a.w);
        a.targetY = w.y + Math.random() * Math.max(1, w.h - a.h);
        a.pause = 0.4 + Math.random() * 2.8;
        a.frame = 0;
      } else {
        var step = a.speed * dt;
        a.x += dx / dist * Math.min(step, dist);
        a.y += dy / dist * Math.min(step, dist);
        if (Math.abs(dx) > .4) a.face = dx < 0 ? -1 : 1;
        a.frame = Math.floor(t * 7 + a.phase) % 2;
      }
    }
  }

  function drawMap(t) {
    var L = map.layout;
    if (!L) return;
    var ctx = map.ctx;
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, L.w, L.h);
    ctx.drawImage(map.bg, 0, 0);
    var sorted = map.actors.slice().sort(function (a, b) { return a.y + a.h - (b.y + b.h); });
    for (var i = 0; i < sorted.length; i++) {
      var a = sorted[i];
      PT.art.drawVillager(ctx, a.x, a.y, a.u, a.member.avatar, {
        frame: a.isAdmin ? 0 : a.frame,
        bob: a.isAdmin ? 0 : Math.round(Math.sin(t * 2 + a.phase) * .8),
        flip: a.face < 0,
        t: t,
        question: !a.member.filled,
        mayor: !!a.isAdmin,
        highlight: map.hoverActor === a,
        blush: false
      });
    }
    PT.world.drawMapDynamic(ctx, L, t);
    drawMapHover(ctx, L);
  }

  function drawMapHover(ctx, L) {
    var id = map.hoverZone;
    if (!id) return;
    var z = id === 'empty' ? L.empty : L.zones[id];
    if (!z) return;
    var sc = PT.sceneById(id);
    var theme = (sc && sc.color) || '#f0c040';
    ctx.save();
    ctx.fillStyle = 'rgba(255,246,200,.10)';
    ctx.fillRect(z.x, z.y, z.w, z.h);
    ctx.strokeStyle = theme;
    ctx.lineWidth = 5;
    ctx.setLineDash([]);
    ctx.strokeRect(z.x + 3, z.y + 3, z.w - 6, z.h - 6);
    ctx.strokeStyle = 'rgba(255,246,200,.8)';
    ctx.lineWidth = 2;
    ctx.strokeRect(z.x + 7, z.y + 7, z.w - 14, z.h - 14);
    // 四角括号
    var g = theme;
    var s = 18;
    ctx.fillStyle = g;
    ctx.fillRect(z.x, z.y, s, 4);
    ctx.fillRect(z.x, z.y, 4, s);
    ctx.fillRect(z.x + z.w - s, z.y, s, 4);
    ctx.fillRect(z.x + z.w - 4, z.y, 4, s);
    ctx.fillRect(z.x, z.y + z.h - 4, s, 4);
    ctx.fillRect(z.x, z.y + z.h - s, 4, s);
    ctx.fillRect(z.x + z.w - s, z.y + z.h - 4, s, 4);
    ctx.fillRect(z.x + z.w - 4, z.y + z.h - s, 4, s);
    ctx.restore();
  }

  /* ── 场景 ─────────────────────────────────────────────── */
  function enterScene(id, opts) {
    opts = opts || {};
    var sc = sceneMap[id];
    if (!sc) return;
    if (PT.ui.isIntroOpen && PT.ui.isIntroOpen()) PT.ui.closeIntro();
    PT.ui.closeDialog();
    if (scene.open && scene.id === id && opts.member) {
      PT.ui.startDialog(opts.member);
      return;
    }
    if (scene.open && scene.id !== id) PT.ui.closeDialog();
    scene.id = id;
    scene.open = true;
    scene.hovered = null;
    var view = document.getElementById('sceneView');
    view.classList.add('is-open');
    view.setAttribute('aria-hidden', 'false');
    view.inert = false;
    document.getElementById('sceneTitle').textContent = sc.name;
    document.getElementById('sceneIcon').textContent = sc.icon;
    document.getElementById('sceneTagline').textContent = sc.tagline;
    var count = PT.byScene(id).length;
    document.getElementById('sceneCount').textContent = id === 'station'
      ? count + ' 位村民 · 镇长在旁'
      : count + ' 位村民';
    document.getElementById('sceneBoardBtn').hidden = id !== 'plaza';
    document.getElementById('sceneBoardBtn').onclick = function () {
      PT.ui.openLayer(document.getElementById('boardModal'));
    };
    buildScene();
    PT.ui.syncLock();
    if (opts.member) {
      if (scene.openTimer) clearTimeout(scene.openTimer);
      scene.openTimer = setTimeout(function () {
        PT.ui.startDialog(opts.member);
      }, reduceMotion ? 50 : 380);
    }
  }

  function buildScene() {
    var view = document.getElementById('sceneView');
    var w = view.clientWidth || window.innerWidth;
    var h = view.clientHeight || window.innerHeight;
    scene.w = w;
    scene.h = h;
    scene.layout = PT.world.getSceneLayout(scene.id, w, h);
    var canvas = document.getElementById('sceneCanvas');
    canvas.width = Math.max(1, Math.round(w));
    canvas.height = Math.max(1, Math.round(h));
    var ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    scene.bg = document.createElement('canvas');
    scene.bg.width = canvas.width;
    scene.bg.height = canvas.height;
    var bctx = scene.bg.getContext('2d');
    PT.world.drawSceneStatic(bctx, w, h, scene.id);
    scene.noticeRect = scene.id === 'plaza'
      ? (PT.world._lastNotice || scene.layout.notice)
      : null;

    var members = PT.byScene(scene.id);
    var admin = scene.id === 'station' ? D.admin : null;
    scene.actors = PT.world.layoutActors(scene.id, w, h, members, admin);
    scene.hovered = null;
    buildSceneLabels();
  }

  function buildSceneLabels() {
    var host = document.getElementById('sceneLabels');
    host.innerHTML = '';
    scene.actors.forEach(function (a, i) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'scene-label' + (a.isAdmin ? ' is-admin' : '') + (a.member.filled ? '' : ' is-default');
      b.setAttribute('data-member', a.member.name);
      b.style.left = (a.labelX / scene.w * 100) + '%';
      b.style.top = (a.labelY / scene.h * 100) + '%';
      b.title = a.member.name + ' · ' + (a.member.title || '');
      b.innerHTML = (a.isAdmin ? '★ ' : '') + esc(a.member.name);
      b.setAttribute('aria-label', '和' + a.member.name + '聊天');
      b.addEventListener('mouseenter', function () {
        scene.hovered = a.member.name;
        b.classList.add('is-active');
      });
      b.addEventListener('mouseleave', function () {
        if (scene.hovered === a.member.name) scene.hovered = null;
        b.classList.remove('is-active');
      });
      b.addEventListener('click', function (e) {
        e.stopPropagation();
        PT.ui.startDialog(a.member);
      });
      host.appendChild(b);
    });
    // 广场公告栏热点
    if (scene.id === 'plaza' && scene.noticeRect) {
      var n = scene.noticeRect;
      var nb = document.createElement('button');
      nb.type = 'button';
      nb.className = 'scene-label is-hotspot';
      nb.style.left = ((n.x + n.w / 2) / scene.w * 100) + '%';
      nb.style.top = (n.y / scene.h * 100 + 1.2) + '%';
      nb.innerHTML = '公告栏 · 点开看';
      nb.setAttribute('aria-label', '打开小镇公告栏');
      nb.addEventListener('click', function (e) {
        e.stopPropagation();
        PT.ui.openLayer(document.getElementById('boardModal'));
      });
      host.appendChild(nb);
    }
  }

  function scenePoint(e) {
    var c = document.getElementById('sceneCanvas');
    var r = c.getBoundingClientRect();
    return {
      x: (e.clientX - r.left) / r.width * scene.w,
      y: (e.clientY - r.top) / r.height * scene.h,
      cx: e.clientX,
      cy: e.clientY
    };
  }

  function sceneActorAt(p) {
    for (var i = scene.actors.length - 1; i >= 0; i--) {
      var a = scene.actors[i];
      if (p.x >= a.x - 6 && p.x <= a.x + a.w + 6 && p.y >= a.y - 6 && p.y <= a.y + a.h + 8) return a;
    }
    return null;
  }

  function bindScene() {
    var canvas = document.getElementById('sceneCanvas');
    canvas.addEventListener('mousemove', function (e) {
      var p = scenePoint(e);
      var a = sceneActorAt(p);
      var overNotice = scene.noticeRect && p.x >= scene.noticeRect.x && p.x <= scene.noticeRect.x + scene.noticeRect.w && p.y >= scene.noticeRect.y && p.y <= scene.noticeRect.y + scene.noticeRect.h;
      scene.hovered = a ? a.member.name : null;
      canvas.style.cursor = (a || overNotice) ? 'pointer' : 'default';
      var labels = document.querySelectorAll('.scene-label');
      for (var i = 0; i < labels.length; i++) {
        labels[i].classList.toggle('is-active', labels[i].getAttribute('data-member') === scene.hovered);
      }
    });
    canvas.addEventListener('mouseleave', function () {
      scene.hovered = null;
      canvas.style.cursor = 'default';
      var labels = document.querySelectorAll('.scene-label');
      for (var i = 0; i < labels.length; i++) labels[i].classList.remove('is-active');
    });
    canvas.addEventListener('click', function (e) {
      var p = scenePoint(e);
      if (scene.noticeRect && p.x >= scene.noticeRect.x && p.x <= scene.noticeRect.x + scene.noticeRect.w && p.y >= scene.noticeRect.y && p.y <= scene.noticeRect.y + scene.noticeRect.h) {
        PT.ui.openLayer(document.getElementById('boardModal'));
        return;
      }
      var a = sceneActorAt(p);
      if (a) PT.ui.startDialog(a.member);
    });
    document.getElementById('backToTown').addEventListener('click', closeScene);
  }

  function drawScene(t) {
    if (!scene.open || !scene.bg) return;
    var ctx = document.getElementById('sceneCanvas').getContext('2d');
    ctx.imageSmoothingEnabled = false;
    var w = scene.w, h = scene.h;
    ctx.clearRect(0, 0, w, h);
    ctx.drawImage(scene.bg, 0, 0);
    var arr = scene.actors.slice().sort(function (a, b) { return a.base - b.base; });
    for (var i = 0; i < arr.length; i++) {
      var a = arr[i];
      var bob = reduceMotion ? 0 : Math.round(Math.sin(t * 1.7 + i * 1.3) * 1.2);
      PT.art.drawVillager(ctx, a.x, a.y, a.u, a.member.avatar, {
        frame: 0,
        bob: bob,
        t: t,
        question: !a.member.filled,
        mayor: !!a.isAdmin,
        highlight: scene.hovered === a.member.name,
        blush: false
      });
    }
    PT.world.drawSceneDynamic(ctx, w, h, scene.id, t);
  }

  function resizeScene() {
    if (!scene.open) return;
    scene.layout = PT.world.getSceneLayout(scene.id, scene.w, scene.h);
    buildScene();
  }

  function closeScene() {
    if (!scene.open) return;
    PT.ui.closeDialog();
    if (scene.openTimer) { clearTimeout(scene.openTimer); scene.openTimer = null; }
    var view = document.getElementById('sceneView');
    view.classList.remove('is-open');
    view.setAttribute('aria-hidden', 'true');
    view.inert = true;
    scene.open = false;
    scene.id = null;
    scene.hovered = null;
    PT.ui.syncLock();
    var back = document.querySelector('.topbar');
    if (back) {
      // 不强行滚动，保留用户原位置
    }
  }

  function goToMember(member, opts) {
    opts = opts || {};
    if (!member) return;
    if (scene.open && scene.id === member.scene) {
      PT.ui.startDialog(member);
      return;
    }
    enterScene(member.scene, { member: member });
  }

  /* ── 主循环 ───────────────────────────────────────────── */
  var last = 0;
  function loop(ts) {
    var t = ts / 1000;
    var dt = last ? Math.min(0.06, t - last) : 0.016;
    last = t;
    var introOpen = PT.ui && PT.ui.isIntroOpen && PT.ui.isIntroOpen();
    var sceneOpen = scene.open;
    if (!introOpen && !sceneOpen && map.built) {
      updateMapActors(dt, t);
      drawMap(t);
    }
    if (sceneOpen) drawScene(t);
    requestAnimationFrame(loop);
  }

  /* ── 初始化 ───────────────────────────────────────────── */
  function init() {
    bindScene();
    initMap();
    PT.ui.init();
    // 场景视图初始不可聚焦
    var view = document.getElementById('sceneView');
    if (view) {
      view.inert = true;
      view.setAttribute('aria-hidden', 'true');
    }
    document.addEventListener('visibilitychange', function () {
      if (document.hidden) PT.audio.stop();
    });
  }

  PT.app = {
    enterScene: enterScene,
    closeScene: closeScene,
    goToMember: goToMember
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
