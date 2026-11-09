/* 十一楼小镇 · Kenney 瓦片地图与 7 个场景
   图层顺序：Back(地面/路/水) → Buildings(建筑/围合物) → 角色(y 排序)
   → Front(树冠/旗帜/前景) → AlwaysFront(水花/烟/粒子/天色)
   地图数据全部写在本文件；运行时只加载 assets/ 内的相对路径 PNG。 */
(function () {
  'use strict';
  var PT = window.PT = window.PT || {};
  var W = PT.world = {};

  var T = 16, GAP = 1, STEP = T + GAP;
  var MS = 2;                         // 总览图每格 2 倍
  var COLS = 45, ROWS = 29;
  var MAP_W = COLS * T * MS;          // 1440
  var MAP_H = ROWS * T * MS;          // 928

  var SHEET_SRC = 'assets/kenney-roguelike-rpg-pack/Spritesheet/roguelikeSheet_transparent.png';
  var sheet = null, ready = false;
  var readyQueue = [];

  var img = new Image();
  img.onload = function () {
    sheet = img; ready = true;
    PT.art.tileSheet = sheet;
    PT.art.tileSheetReady = true;
    if (introBg) introBg = null;
    readyQueue.splice(0).forEach(function (fn) { try { fn(); } catch (e) {} });
    if (introCanvas) W.drawIntroScene(introCanvas);
  };
  img.onerror = function () {};
  img.src = SHEET_SRC;

  W.onReady = function (fn) { if (ready) { try { fn(); } catch (e) {} } else readyQueue.push(fn); };
  W.isReady = function () { return ready; };

  /* ── 场景定义（局部格坐标，13×9 为主） ───────────────── */
  var MAP_POS = {
    library:  { tx: 1,  ty: 1  },
    workshop: { tx: 16, ty: 1  },
    lakeside: { tx: 31, ty: 1  },
    tavern:   { tx: 1,  ty: 12 },
    plaza:    { tx: 16, ty: 12 },
    cottage:  { tx: 31, ty: 12 },
    station:  { tx: 4,  ty: 24 },
    empty:    { tx: 30, ty: 24 }
  };

  var ZD = {
    library: {
      tw: 13, th: 9, theme: '#6b6fb5', floor: { c: 7, r: 1 }, tint: 'rgba(107,111,181,.16)',
      walk: { x: 2.0, y: 6.0, w: 9.2, h: 2.3 }, border: 'stone',
      notice: null
    },
    workshop: {
      tw: 13, th: 9, theme: '#e07b39', floor: { c: 9, r: 2 }, tint: 'rgba(224,123,57,.10)',
      walk: { x: 2.0, y: 6.1, w: 9.2, h: 2.2 }, border: 'wood',
      notice: null
    },
    lakeside: {
      tw: 13, th: 9, theme: '#3a9fbf', floor: null, tint: null,
      walk: { x: 1.5, y: 5.7, w: 10.0, h: 2.6 }, border: 'nature',
      notice: null
    },
    tavern: {
      tw: 13, th: 9, theme: '#b5413a', floor: { c: 5, r: 2 }, tint: 'rgba(181,65,58,.20)',
      walk: { x: 1.5, y: 5.7, w: 10.0, h: 2.6 }, border: 'rope',
      notice: null
    },
    plaza: {
      tw: 13, th: 9, theme: '#f0c040', floor: { c: 8, r: 1 }, tint: 'rgba(240,192,64,.08)',
      walk: { x: 1.8, y: 5.9, w: 9.5, h: 2.4 }, border: 'flower',
      notice: { x: 8.9, y: .9, w: 2.5, h: 3.0 }
    },
    cottage: {
      tw: 13, th: 9, theme: '#8cc152', floor: { c: 5, r: 1 }, tint: null,
      walk: { x: 2.0, y: 5.9, w: 9.0, h: 2.4 }, border: 'hedge',
      notice: null
    },
    station: {
      tw: 13, th: 5, theme: '#8a8f98', floor: { c: 7, r: 1 }, tint: 'rgba(138,143,152,.10)',
      walk: { x: 1.5, y: 2.6, w: 10.2, h: 1.9 }, border: 'platform',
      notice: null
    },
    empty: {
      tw: 8, th: 5, theme: '#8a8f98', floor: { c: 5, r: 1 }, tint: 'rgba(120,120,120,.10)',
      walk: null, border: 'none', notice: null
    }
  };

  var ZONE_ORDER = ['library', 'workshop', 'lakeside', 'tavern', 'plaza', 'cottage', 'station'];

  var PREFABS = {
  manor: { w: 7, h: 6, walls: [[4,0,22,10],[0,1,24,21],[1,1,25,21],[2,1,26,21],[0,2,18,15],[1,2,18,15],[2,2,18,15],[3,2,25,21],[4,2,25,21],[5,2,26,21],[0,3,17,15],[1,3,19,20],[2,3,19,15],[3,3,25,23],[4,3,25,23],[5,3,26,23],[0,4,17,15],[1,4,18,15],[2,4,18,15],[3,4,18,15],[4,4,18,15],[5,4,19,15],[0,5,16,20],[1,5,13,15],[2,5,13,15],[3,5,17,20],[4,5,13,15],[5,5,16,15]], roof: [[0,0,20,21],[1,0,25,21],[2,0,21,21],[0,1,20,22],[1,1,25,22],[2,1,21,22],[0,2,20,23],[1,2,22,22],[2,2,21,23]], details: [[1,4,44,5],[4,5,33,0]] },
  barn: { w: 3, h: 4, walls: [[1,2,17,15],[2,2,19,15],[1,3,14,15],[2,3,16,15]], roof: [[1,0,20,21],[2,0,21,21],[1,1,23,24],[2,1,21,22],[1,2,20,23],[2,2,21,23]], details: [[0,3,26,7],[1,3,28,8],[2,3,29,8]] },
  tall: { w: 3, h: 6, walls: [[0,2,24,21],[1,2,25,21],[2,2,26,21],[0,3,18,15],[1,3,18,15],[2,3,18,15],[0,4,17,15],[1,4,18,15],[2,4,19,15],[0,5,14,15],[1,5,13,15],[2,5,16,15]], roof: [[0,1,20,21],[1,1,25,21],[2,1,21,21],[0,2,20,22],[1,2,25,22],[2,2,21,22],[0,3,20,23],[1,3,22,22],[2,3,21,23]], details: [[1,4,46,5],[1,5,33,1]] },
  rightsmall: { w: 4, h: 6, walls: [[1,0,13,9],[1,1,17,5],[1,3,17,15],[2,3,19,15],[1,4,14,15],[2,4,16,15]], roof: [[1,1,34,21],[2,1,35,21],[1,2,34,22],[2,2,38,24],[1,3,34,23],[2,3,35,23]], details: [] },
  righthouse: { w: 5, h: 5, walls: [[1,2,17,15],[2,2,19,15],[1,3,14,15],[2,3,16,15]], roof: [[1,0,34,21],[2,0,35,21],[0,1,24,21],[1,1,34,22],[2,1,35,22],[0,2,24,23],[1,2,34,23],[2,2,35,23]], details: [[1,3,30,6],[2,3,31,6]] },
  };

  /* ── 基础工具 ─────────────────────────────────────────── */
  function hash(x, y, s) {
    var n = Math.sin(x * 127.1 + y * 311.7 + (s || 0) * 74.7) * 43758.5453;
    return n - Math.floor(n);
  }
  function shade(hex, amt) {
    var h = hex.replace('#', '');
    if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    var r = parseInt(h.slice(0, 2), 16), g = parseInt(h.slice(2, 4), 16), b = parseInt(h.slice(4, 6), 16);
    function cl(v) { return Math.max(0, Math.min(255, Math.round(v))); }
    return '#' + [cl(r + amt), cl(g + amt), cl(b + amt)].map(function (v) {
      return ('0' + v.toString(16)).slice(-2);
    }).join('');
  }
  function rgba(hex, a) {
    var h = hex.replace('#', '');
    if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    return 'rgba(' + parseInt(h.slice(0, 2), 16) + ',' + parseInt(h.slice(2, 4), 16) + ',' + parseInt(h.slice(4, 6), 16) + ',' + a + ')';
  }
  function tile(ctx, c, r, x, y, s) {
    if (!ready) return;
    ctx.drawImage(sheet, c * STEP, r * STEP, T, T, Math.round(x), Math.round(y), Math.ceil(s), Math.ceil(s));
  }
  function nine(ctx, c, r, x, y, tw, th, s) {
    if (!ready || tw < 1 || th < 1) return;
    for (var yy = 0; yy < th; yy++) {
      var sy = yy === 0 ? 0 : (yy === th - 1 ? 2 : 1);
      for (var xx = 0; xx < tw; xx++) {
        var sx = xx === 0 ? 0 : (xx === tw - 1 ? 2 : 1);
        tile(ctx, c + sx, r + sy, x + xx * s, y + yy * s, s);
      }
    }
  }
  function pathRect(ctx, x, y, tw, th, s) {
    nine(ctx, 7, 9, x, y, tw, th, s);
  }
  function roundRect(ctx, x, y, w, h, r) {
    r = Math.max(0, Math.min(r, w / 2, h / 2));
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y); ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r); ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h); ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r); ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }
  function shadow(ctx, x, y, w, h, a) {
    ctx.save();
    ctx.fillStyle = 'rgba(20,14,8,' + (a === undefined ? .22 : a) + ')';
    ctx.beginPath();
    ctx.ellipse(x + w / 2, y + h, w * .48, Math.max(2, h * .10), 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  /* ── 预制品：从 sample_map.json 裁剪的成品房屋 ───────── */
  var prefabCache = {};
  function tintedPrefab(name, theme, plain) {
    var key = name + '|' + theme + (plain ? '|plain' : '');
    if (prefabCache[key]) return prefabCache[key];
    if (!ready) return null;
    var p = PREFABS[name];
    if (plain) {
      // 原色实心建筑：不做整层染色，避免屋顶与草地混色后像半透明。
      var raw = document.createElement('canvas');
      raw.width = p.w * T; raw.height = p.h * T;
      var rx = raw.getContext('2d');
      rx.imageSmoothingEnabled = false;
      p.walls.forEach(function (t) { rx.drawImage(sheet, t[2] * STEP, t[3] * STEP, T, T, t[0] * T, t[1] * T, T, T); });
      p.roof.forEach(function (t) { rx.drawImage(sheet, t[2] * STEP, t[3] * STEP, T, T, t[0] * T, t[1] * T, T, T); });
      prefabCache[key] = raw;
      return raw;
    }
    function layer(tint, filter) {
      var c = document.createElement('canvas');
      c.width = p.w * T; c.height = p.h * T;
      var x = c.getContext('2d');
      x.imageSmoothingEnabled = false;
      p.walls.forEach(function (t) { if (!filter || filter(t)) x.drawImage(sheet, t[2] * STEP, t[3] * STEP, T, T, t[0] * T, t[1] * T, T, T); });
      if (filter) p.roof.forEach(function (t) { x.drawImage(sheet, t[2] * STEP, t[3] * STEP, T, T, t[0] * T, t[1] * T, T, T); });
      x.globalCompositeOperation = 'source-atop';
      x.fillStyle = rgba(theme, tint);
      x.fillRect(0, 0, c.width, c.height);
      return c;
    }
    var wall = layer(.10, function (t) { return t[3] < 21; });
    var roof = layer(.56, function (t) { return t[3] >= 21; });
    var c = document.createElement('canvas');
    c.width = p.w * T; c.height = p.h * T;
    var x = c.getContext('2d');
    x.imageSmoothingEnabled = false;
    x.drawImage(wall, 0, 0);
    x.drawImage(roof, 0, 0);
    prefabCache[key] = c;
    return c;
  }
  function drawPrefab(ctx, name, x, y, s, theme, opts) {
    opts = opts || {};
    var p = PREFABS[name];
    if (!p) return;
    shadow(ctx, x + s * .2, y + s * (p.h - .2), s * (p.w - .4), s * .5, .20);
    var c = tintedPrefab(name, theme, opts.plain);
    if (c) {
      ctx.save();
      if (opts.alpha !== undefined) ctx.globalAlpha = opts.alpha;
      ctx.drawImage(c, Math.round(x), Math.round(y), Math.round(p.w * s), Math.round(p.h * s));
      ctx.restore();
    } else {
      ctx.fillStyle = '#b98a64';
      ctx.fillRect(x, y, p.w * s, p.h * s);
    }
    if (ready) {
      ctx.save();
      if (opts.alpha !== undefined) ctx.globalAlpha = opts.alpha;
      p.details.forEach(function (t) {
        ctx.drawImage(sheet, t[2] * STEP, t[3] * STEP, T, T, Math.round(x + t[0] * s), Math.round(y + t[1] * s), Math.ceil(s), Math.ceil(s));
      });
      ctx.restore();
    }
  }

  /* ── 植物 / 道具 ──────────────────────────────────────── */
  function drawTree(ctx, x, y, s, col, row, big, alpha) {
    col = col === undefined ? 13 : col;
    row = row === undefined ? 10 : row;
    var z = big || 1;
    ctx.save();
    if (alpha !== undefined) ctx.globalAlpha = alpha;
    shadow(ctx, x, y + s * (1.7 * z), s * 1.2 * z, s * .4, .20);
    tile(ctx, col, row, x, y, s * z);
    tile(ctx, col, row + 1, x, y + s * z, s * z);
    ctx.restore();
  }
  function drawPine(ctx, x, y, s, big) {
    var z = big || 1;
    shadow(ctx, x, y + s * (1.7 * z), s * .9 * z, s * .4, .20);
    tile(ctx, 16, 10, x, y, s * z);
    tile(ctx, 16, 11, x, y + s * z, s * z);
  }
  function drawBush(ctx, x, y, s, col, row) {
    tile(ctx, col === undefined ? 19 : col, row === undefined ? 9 : row, x, y, s);
  }
  function drawFlowers(ctx, x, y, s, seed) {
    var f = [[0, 6], [0, 7], [0, 9], [0, 10], [0, 12], [0, 13], [1, 6], [2, 6], [3, 6], [3, 9], [2, 12], [1, 12]];
    var v = f[Math.floor(hash(x, y, seed) * f.length)];
    tile(ctx, v[0], v[1], x, y, s);
  }
  function drawLamp(ctx, x, y, s, theme, glow) {
    var p = Math.max(2, s * .16);
    ctx.fillStyle = '#3e2614';
    ctx.fillRect(Math.round(x - p), Math.round(y + s * .15), Math.round(p * 2), Math.round(s * .8));
    ctx.fillStyle = '#8b5a2b';
    ctx.fillRect(Math.round(x - p), Math.round(y + s * .18), Math.round(p), Math.round(s * .72));
    ctx.fillStyle = theme;
    ctx.fillRect(Math.round(x - s * .28), Math.round(y - s * .05), Math.round(s * .56), Math.round(s * .28));
    ctx.fillStyle = '#5a3a1e';
    ctx.fillRect(Math.round(x - s * .32), Math.round(y - s * .1), Math.round(s * .64), Math.round(s * .1));
    ctx.fillRect(Math.round(x - s * .32), Math.round(y + s * .22), Math.round(s * .64), Math.round(s * .1));
    if (glow) {
      ctx.save();
      ctx.globalAlpha = .10;
      ctx.fillStyle = '#ffe6a0';
      ctx.beginPath();
      ctx.arc(x, y + s * .1, s * .7, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }
  function drawPennants(ctx, x, y, w, s, theme) {
    var span = Math.max(1, Math.round(w / (s * 1.5)));
    ctx.save();
    ctx.strokeStyle = 'rgba(62,38,20,.75)';
    ctx.lineWidth = Math.max(1, s * .07);
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.quadraticCurveTo(x + w / 2, y + s * .32, x + w, y);
    ctx.stroke();
    for (var i = 0; i < span; i++) {
      var fx = x + (i + .5) * (w / span);
      var fy = y + Math.sin((i / span) * Math.PI) * s * .28;
      ctx.fillStyle = i % 2 ? '#fdf3d7' : theme;
      ctx.beginPath();
      ctx.moveTo(fx - s * .28, fy);
      ctx.lineTo(fx + s * .28, fy);
      ctx.lineTo(fx, fy + s * .55);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = 'rgba(62,38,20,.35)';
      ctx.stroke();
    }
    ctx.restore();
  }
  function drawBookStack(ctx, x, y, s) {
    tile(ctx, 46, 15, x, y, s);
    tile(ctx, 47, 15, x + s * .75, y + s * .1, s * .8);
  }
  function drawBarrel(ctx, x, y, s) {
    tile(ctx, 22, 0, x, y, s);
  }
  function drawCrate(ctx, x, y, s) {
    tile(ctx, 16, 0, x, y, s);
  }
  function drawCampfire(ctx, x, y, s, t) {
    tile(ctx, 14, 8, x, y, s);
    var f = Math.floor(t * 6) % 2;
    tile(ctx, f ? 15 : 13, 8, x, y, s);
  }
  function drawSign(ctx, x, y, s, theme, icon) {
    ctx.fillStyle = '#3e2614';
    ctx.fillRect(Math.round(x + s * .44), Math.round(y + s * .55), Math.round(s * .12), Math.round(s * .55));
    ctx.fillStyle = '#8b5a2b';
    ctx.fillRect(Math.round(x + s * .44), Math.round(y + s * .55), Math.round(s * .06), Math.round(s * .55));
    ctx.fillStyle = '#3e2614';
    ctx.fillRect(Math.round(x), Math.round(y), Math.round(s), Math.round(s * .68));
    ctx.fillStyle = '#d9a066';
    ctx.fillRect(Math.round(x + s * .05), Math.round(y + s * .05), Math.round(s * .9), Math.round(s * .52));
    ctx.fillStyle = theme;
    ctx.fillRect(Math.round(x + s * .12), Math.round(y + s * .12), Math.round(s * .76), Math.round(s * .1));
    ctx.fillStyle = '#5a3a1e';
    if (icon === 'train') {
      ctx.fillStyle = '#3e2614';
      ctx.fillRect(Math.round(x + s * .18), Math.round(y + s * .26), Math.round(s * .64), Math.round(s * .24));
      ctx.fillStyle = '#8a8f98';
      ctx.fillRect(Math.round(x + s * .22), Math.round(y + s * .29), Math.round(s * .56), Math.round(s * .15));
      ctx.fillStyle = '#9fe6ff';
      ctx.fillRect(Math.round(x + s * .27), Math.round(y + s * .32), Math.round(s * .14), Math.round(s * .08));
      ctx.fillRect(Math.round(x + s * .46), Math.round(y + s * .32), Math.round(s * .14), Math.round(s * .08));
      ctx.fillStyle = theme;
      ctx.fillRect(Math.round(x + s * .22), Math.round(y + s * .41), Math.round(s * .56), Math.round(s * .035));
      ctx.fillStyle = '#3e2614';
      ctx.fillRect(Math.round(x + s * .3), Math.round(y + s * .48), Math.round(s * .1), Math.round(s * .08));
      ctx.fillRect(Math.round(x + s * .6), Math.round(y + s * .48), Math.round(s * .1), Math.round(s * .08));
    } else if (icon === 'book') {
      ctx.fillRect(Math.round(x + s * .24), Math.round(y + s * .27), Math.round(s * .22), Math.round(s * .2));
      ctx.fillRect(Math.round(x + s * .48), Math.round(y + s * .27), Math.round(s * .22), Math.round(s * .2));
    } else if (icon === 'mug') {
      ctx.fillRect(Math.round(x + s * .3), Math.round(y + s * .26), Math.round(s * .26), Math.round(s * .22));
      ctx.fillRect(Math.round(x + s * .56), Math.round(y + s * .3), Math.round(s * .16), Math.round(s * .14));
    } else if (icon === 'fish') {
      ctx.fillRect(Math.round(x + s * .24), Math.round(y + s * .3), Math.round(s * .4), Math.round(s * .18));
      ctx.fillRect(Math.round(x + s * .62), Math.round(y + s * .26), Math.round(s * .16), Math.round(s * .12));
      ctx.fillRect(Math.round(x + s * .62), Math.round(y + s * .4), Math.round(s * .16), Math.round(s * .12));
      ctx.fillStyle = '#9fe6ff';
      ctx.fillRect(Math.round(x + s * .28), Math.round(y + s * .33), Math.round(s * .1), Math.round(s * .08));
    } else if (icon === 'leaf') {
      ctx.fillStyle = '#4f7a3a';
      ctx.fillRect(Math.round(x + s * .3), Math.round(y + s * .3), Math.round(s * .34), Math.round(s * .2));
      ctx.fillRect(Math.round(x + s * .38), Math.round(y + s * .26), Math.round(s * .2), Math.round(s * .28));
      ctx.fillStyle = '#8cc152';
      ctx.fillRect(Math.round(x + s * .36), Math.round(y + s * .32), Math.round(s * .18), Math.round(s * .1));
      ctx.fillStyle = '#5a3a1e';
      ctx.fillRect(Math.round(x + s * .36), Math.round(y + s * .5), Math.round(s * .04), Math.round(s * .1));
    }
  }

  /* ── 地面 / 围合物 ────────────────────────────────────── */
  function drawGroundBlock(ctx, c, r, x, y, tw, th, s, seed) {
    for (var yy = 0; yy < th; yy++) {
      for (var xx = 0; xx < tw; xx++) {
        tile(ctx, c, r, x + xx * s, y + yy * s, s);
        var v = hash(xx, yy, seed);
        if (v > .76) {
          ctx.fillStyle = v > .9 ? 'rgba(255,248,220,.035)' : 'rgba(50,38,26,.035)';
          ctx.fillRect(Math.round(x + xx * s), Math.round(y + yy * s), Math.ceil(s), Math.ceil(s));
        }
      }
    }
    // 细微裂纹 / 磨损
    for (var i = 0; i < Math.max(6, tw * th / 7); i++) {
      var px = x + (.2 + hash(i, 1, seed) * (tw - .4)) * s;
      var py = y + (.2 + hash(i, 2, seed) * (th - .4)) * s;
      ctx.fillStyle = 'rgba(50,38,26,.16)';
      ctx.fillRect(Math.round(px), Math.round(py), Math.max(1, s * .14), Math.max(1, s * .05));
    }
  }

  function drawGrassField(ctx, x, y, w, h, s, seed) {
    for (var yy = 0; yy < h; yy++) {
      for (var xx = 0; xx < w; xx++) {
        var v = hash(xx, yy, seed);
        var c = 5, r = 1;
        if (v > .93) { c = 5; r = 0; }
        tile(ctx, c, r, x + xx * s, y + yy * s, s);
        if (v > .86 && v < .9) drawFlowers(ctx, x + xx * s, y + yy * s, s, seed + 2);
      }
    }
  }

  function drawBorder(ctx, id, ox, oy, s) {
    var z = ZD[id];
    var tw = z.tw, th = z.th;
    var theme = z.theme;
    if (z.border === 'none') return;
    if (z.border === 'hedge') {
      for (var x = 0; x < tw; x++) {
        if (hash(x, 0, 4) > .18) drawBush(ctx, ox + x * s, oy + (hash(x, 0, 5) > .5 ? 0 : s * .15), s * .55, 19, 9);
        if (hash(x, 8, 6) > .46) drawBush(ctx, ox + x * s, oy + (th - .55) * s, s * .55, 19, 9);
      }
      for (var y = 0; y < th; y++) {
        if (hash(0, y, 7) > .3) drawBush(ctx, ox, oy + y * s, s * .55, 19, 9);
        if (hash(12, y, 8) > .3) drawBush(ctx, ox + (tw - .55) * s, oy + y * s, s * .55, 15, 9);
      }
      return;
    }
    if (z.border === 'nature') {
      for (var k = 0; k < 7; k++) {
        var px = ox + (1 + hash(k, 1, 11) * (tw - 2)) * s;
        var py = oy + (1 + hash(k, 2, 12) * (th - 2)) * s;
        drawBush(ctx, px, py, s * .8, 19, 9);
      }
      drawPine(ctx, ox + s * .1, oy + s * .2, s * .9);
      drawPine(ctx, ox + (tw - 1.2) * s, oy + s * .3, s * .9);
      return;
    }
    var top = oy + s * .16, left = ox + s * .12, right = ox + (tw - .3) * s;
    if (z.border === 'stone') {
      stoneLine(ctx, ox + s * .2, oy + s * .1, (tw - .4) * s, s, theme);
      stoneLineV(ctx, left, oy + s * .2, s * .5, (th - .6) * s, theme);
      stoneLineV(ctx, right, oy + s * .2, s * .5, (th - .6) * s, theme);
      stoneLine(ctx, ox + s * .2, oy + (th - .42) * s, (tw * .35) * s, s, theme);
      stoneLine(ctx, ox + (tw * .65) * s, oy + (th - .42) * s, (tw * .33) * s, s, theme);
    } else if (z.border === 'wood' || z.border === 'rope') {
      woodLine(ctx, ox + s * .15, oy + s * .08, (tw - .3) * s, s, z.border === 'rope');
      woodLineV(ctx, left, oy + s * .15, s, (th - .45) * s);
      woodLineV(ctx, right, oy + s * .15, s, (th - .45) * s);
      woodLine(ctx, ox + s * .15, oy + (th - .35) * s, (tw * .36) * s, s);
      woodLine(ctx, ox + (tw * .64) * s, oy + (th - .35) * s, (tw * .36) * s, s);
    } else if (z.border === 'flower') {
      flowerLine(ctx, ox + s * .15, oy + s * .1, (tw - .3) * s, s, theme, 1);
      flowerLine(ctx, ox + s * .15, oy + (th - .38) * s, (tw * .35) * s, s, theme, 2);
      flowerLine(ctx, ox + (tw * .65) * s, oy + (th - .38) * s, (tw * .35) * s, s, theme, 3);
      flowerLineV(ctx, left, oy + s * .2, s, (th - .55) * s, theme, 4);
      flowerLineV(ctx, right, oy + s * .2, s, (th - .55) * s, theme, 5);
    } else if (z.border === 'platform') {
      ctx.fillStyle = '#5f646b';
      ctx.fillRect(ox, oy + (th - .32) * s, tw * s, Math.max(2, s * .18));
      ctx.fillStyle = '#b8bcc2';
      ctx.fillRect(ox, oy + (th - .32) * s, tw * s, Math.max(1, s * .05));
      ctx.fillStyle = '#3e4248';
      ctx.fillRect(ox, oy, tw * s, Math.max(1, s * .06));
    }
  }
  function stoneLine(ctx, x, y, w, s, theme) {
    var h = Math.max(3, s * .32);
    ctx.fillStyle = '#3e3a3f';
    ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h + 2));
    ctx.fillStyle = shade(theme, -18);
    ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
    ctx.fillStyle = rgba('#ffffff', .28);
    ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.max(1, Math.round(h * .28)));
    ctx.fillStyle = rgba('#2b1c16', .25);
    for (var i = 0; i < w; i += s * .6) ctx.fillRect(Math.round(x + i), Math.round(y), Math.max(1, s * .04), Math.round(h));
  }
  function stoneLineV(ctx, x, y, w, h, theme) {
    ctx.fillStyle = '#3e3a3f';
    ctx.fillRect(Math.round(x), Math.round(y), Math.round(w + 2), Math.round(h));
    ctx.fillStyle = shade(theme, -18);
    ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
    ctx.fillStyle = rgba('#ffffff', .22);
    ctx.fillRect(Math.round(x), Math.round(y), Math.max(1, Math.round(w * .25)), Math.round(h));
  }
  function woodLine(ctx, x, y, w, s, rope) {
    var h = Math.max(3, s * .22);
    ctx.fillStyle = '#3e2614';
    ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h + 2));
    ctx.fillStyle = rope ? '#b98a4a' : '#8b5a2b';
    ctx.fillRect(Math.round(x), Math.round(y + 1), Math.round(w), Math.round(h));
    ctx.fillStyle = rope ? '#e0c07a' : '#d9a066';
    ctx.fillRect(Math.round(x), Math.round(y + 1), Math.round(w), Math.max(1, Math.round(h * .3)));
    for (var i = 0; i <= w; i += s * 1.1) {
      ctx.fillStyle = '#3e2614';
      ctx.fillRect(Math.round(x + i), Math.round(y - s * .14), Math.max(2, s * .14), Math.round(s * .55));
      ctx.fillStyle = rope ? '#e0c07a' : '#b5773d';
      ctx.fillRect(Math.round(x + i), Math.round(y - s * .12), Math.max(1, s * .06), Math.round(s * .46));
    }
  }
  function woodLineV(ctx, x, y, w, h) {
    ctx.fillStyle = '#3e2614';
    ctx.fillRect(Math.round(x), Math.round(y), Math.max(2, w * .18), Math.round(h));
    ctx.fillStyle = '#8b5a2b';
    ctx.fillRect(Math.round(x + 1), Math.round(y), Math.max(1, w * .09), Math.round(h));
    for (var i = 0; i <= h; i += w * 1.3) {
      ctx.fillStyle = '#3e2614';
      ctx.fillRect(Math.round(x), Math.round(y + i), Math.round(w * .34), Math.max(2, w * .16));
    }
  }
  function flowerLine(ctx, x, y, w, s, theme, seed) {
    stoneLine(ctx, x, y, w, s, theme);
    for (var i = 0; i < w; i += s * 1.2) {
      drawFlowers(ctx, x + i, y - s * .25, s * .7, seed + i);
    }
  }
  function flowerLineV(ctx, x, y, w, h, theme, seed) {
    stoneLineV(ctx, x, y, w, h, theme);
    for (var i = 0; i < h; i += w * 1.6) {
      drawFlowers(ctx, x, y + i, w * .8, seed + i);
    }
  }

  /* ── 区域静态绘制 ─────────────────────────────────────── */
  function drawZoneBase(ctx, id, ox, oy, s, t) {
    var z = ZD[id];
    var tw = z.tw, th = z.th;
    if (id === 'lakeside') {
      drawGrassField(ctx, ox, oy, tw, th, s, 31);
      // 连续沙岸：先铺满沙地再叠湖水；不再用圆角沙洲九宫格，避免上缘出现断口
      ctx.save();
      roundRect(ctx, ox + s * .12, oy + s * 1.02, s * 8.76, s * 6.72, s * .55);
      ctx.clip();
      for (var sy = 0; sy < 7; sy++) {
        for (var sx = 0; sx < 9; sx++) {
          var sv = hash(sx, sy, 94);
          tile(ctx, sv > .72 ? 7 : 8, sv > .72 ? 2 : 0, ox + s * (.12 + sx), oy + s * (1.02 + sy), s);
        }
      }
      ctx.restore();
      ctx.save();
      ctx.strokeStyle = 'rgba(92,66,38,.42)';
      ctx.lineWidth = Math.max(2, s * .09);
      roundRect(ctx, ox + s * .12, oy + s * 1.02, s * 8.76, s * 6.72, s * .55);
      ctx.stroke();
      ctx.restore();
      nine(ctx, 2, 0, ox + s * .4, oy + s * 1.35, 8, 6, s);
      for (var y = 2; y < 7; y++) {
        for (var x = 1; x < 8; x++) {
          var v = Math.floor(t * 2 + x * 1.7 + y * 2.3) % 4;
          var wv = [[0, 0], [1, 0], [0, 1], [1, 1]][v];
          tile(ctx, wv[0], wv[1], ox + (x + .4) * s, oy + (y + .35) * s, s);
        }
      }
      // 岸边石头 / 芦苇
      for (var i = 0; i < 12; i++) {
        var rx = ox + (.2 + hash(i, 1, 91) * 12.4) * s;
        var ry = oy + (2.0 + hash(i, 2, 91) * 5.6) * s;
        if (hash(i, 3, 91) > .55) {
          ctx.fillStyle = '#8a8f98';
          ctx.fillRect(Math.round(rx), Math.round(ry), Math.max(2, s * .16), Math.max(2, s * .12));
          ctx.fillStyle = '#c3c8cc';
          ctx.fillRect(Math.round(rx), Math.round(ry), Math.max(1, s * .1), Math.max(1, s * .05));
        } else {
          ctx.fillStyle = '#4f7a3a';
          ctx.fillRect(Math.round(rx), Math.round(ry), Math.max(1, s * .05), Math.max(2, s * .28));
          ctx.fillRect(Math.round(rx + s * .1), Math.round(ry - s * .04), Math.max(1, s * .05), Math.max(2, s * .26));
        }
      }
      // 岸线保持干净：小花只留在上方草地，不压住连续沙岸
      return;
    }
    if (z.floor) {
      drawGroundBlock(ctx, z.floor.c, z.floor.r, ox, oy, tw, th, s, 17);
      if (z.tint) {
        ctx.save();
        ctx.fillStyle = z.tint;
        roundRect(ctx, ox + s * .1, oy + s * .1, tw * s - s * .2, th * s - s * .2, s * .4);
        ctx.fill();
        ctx.restore();
      }
      // 边缘压暗，避免整块地面显得平
      ctx.save();
      ctx.strokeStyle = 'rgba(60,46,30,.28)';
      ctx.lineWidth = Math.max(2, s * .12);
      ctx.strokeRect(ox + s * .08, oy + s * .08, tw * s - s * .16, th * s - s * .16);
      ctx.restore();
    } else {
      drawGrassField(ctx, ox, oy, tw, th, s, 5);
    }
    if (id === 'library') {
      for (var p = 0; p < 16; p++) {
        var px = ox + (.5 + hash(p, 1, 21) * 11.5) * s;
        var py = oy + (.5 + hash(p, 2, 21) * 7.6) * s;
        ctx.fillStyle = p % 3 ? 'rgba(255,248,220,.55)' : 'rgba(70,70,110,.22)';
        ctx.fillRect(Math.round(px), Math.round(py), Math.max(1, s * .15), Math.max(1, s * .1));
      }
    }
    if (id === 'workshop') {
      for (var q = 0; q < 22; q++) {
        var wx = ox + (.4 + hash(q, 1, 22) * 11.8) * s;
        var wy = oy + (.4 + hash(q, 2, 22) * 8.0) * s;
        ctx.fillStyle = q % 2 ? 'rgba(90,58,30,.35)' : 'rgba(217,160,102,.42)';
        ctx.fillRect(Math.round(wx), Math.round(wy), Math.max(2, s * .18), Math.max(1, s * .08));
      }
    }
    if (id === 'plaza') {
      // 圆形石板纹
      ctx.save();
      ctx.strokeStyle = 'rgba(160,124,76,.30)';
      ctx.lineWidth = Math.max(2, s * .1);
      for (var rr = s * 1.6; rr < s * 4.6; rr += s * .65) {
        ctx.beginPath();
        ctx.arc(ox + tw * .46 * s, oy + th * .52 * s, rr, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.restore();
    }
    if (id === 'station') {
      // 黄色警示线 + 站台边
      ctx.fillStyle = '#f0c040';
      ctx.fillRect(ox + s * .2, oy + s * 4.25, tw * s - s * .4, Math.max(2, s * .1));
      ctx.fillStyle = '#2f3337';
      for (var sx = 0; sx < tw * s; sx += s * .62) {
        ctx.fillRect(Math.round(ox + sx), Math.round(oy + s * 4.25), Math.max(1, s * .25), Math.max(2, s * .1));
      }
      ctx.fillStyle = '#3e4248';
      ctx.fillRect(ox, oy + s * 4.6, tw * s, Math.max(2, s * .08));
      // 月台通往地图外的土路
      pathRect(ctx, ox + s * 5.3, oy + s * 3.1, 3, 2, s);
      ctx.fillStyle = 'rgba(227,196,141,.85)';
      ctx.fillRect(ox + s * 5.3, oy + s * 3.7, s * 3, s * 1.3);
    }
  }

  function drawZoneBuildings(ctx, id, ox, oy, s, t) {
    if (!ready) return;
    var z = ZD[id], theme = z.theme;
    if (id === 'library') {
      drawPrefab(ctx, 'manor', ox + s * 3.0, oy + s * .0, s, theme);
      // 拱窗 / 书架 / 正门：让图书馆一眼可辨
      tile(ctx, 44, 5, ox + s * 3.35, oy + s * 2.5, s * .72);
      tile(ctx, 44, 5, ox + s * 7.15, oy + s * 2.5, s * .72);
      for (var sh = 0; sh < 2; sh++) {
        for (var sr = 0; sr < 2; sr++) {
          if (sh === 0) {
            tile(ctx, 42 + sr, 12 + sh, ox + s * (3.15 + sh * 3.55), oy + s * (3.45 + sr * .78), s * .78);
            tile(ctx, 43 + sr, 12 + sh, ox + s * (3.9 + sh * 3.55), oy + s * (3.45 + sr * .78), s * .78);
          } else {
            tile(ctx, 42 + sr, 12 + sh, ox + s * (3.15 + sh * 3.55), oy + s * (3.45 + sr * .78), s * .78);
            tile(ctx, 43 + sr, 12 + sh, ox + s * (3.9 + sh * 3.55), oy + s * (3.45 + sr * .78), s * .78);
          }
        }
      }
      // 右侧书台上再摆几本彩色书，避免空书架
      tile(ctx, 46, 15, ox + s * 7.05, oy + s * 3.9, s * .52);
      tile(ctx, 47, 15, ox + s * 7.55, oy + s * 3.9, s * .5);
      tile(ctx, 48, 15, ox + s * 8.05, oy + s * 3.9, s * .48);
      drawBookStack(ctx, ox + s * 7.1, oy + s * 4.75, s * .4);
      // 正门（中央）
      tile(ctx, 33, 0, ox + s * 5.25, oy + s * 4.55, s * .95);
      drawSign(ctx, ox + s * 10.6, oy + s * .9, s * .9, theme, 'book');
      drawLamp(ctx, ox + s * 1.5, oy + s * 4.6, s, theme, true);
      drawBookStack(ctx, ox + s * 1.2, oy + s * 6.9, s * .45);
      drawBookStack(ctx, ox + s * 6.1, oy + s * 6.9, s * .42);
      tile(ctx, 49, 15, ox + s * 10.8, oy + s * 6.7, s * .5);
      drawBush(ctx, ox + s * 11.5, oy + s * 5.4, s * .6);
    } else if (id === 'workshop') {
      drawPrefab(ctx, 'tall', ox + s * 1.7, oy + s * .0, s, theme);
      drawPrefab(ctx, 'barn', ox + s * 5.1, oy + s * 1.0, s, theme);
      // 烟囱（骑在屋顶上）与齿轮
      ctx.fillStyle = '#2b1c16';
      ctx.fillRect(ox + s * 2.62, oy + s * .05, s * .48, s * .15);
      ctx.fillStyle = '#8a8f98';
      ctx.fillRect(ox + s * 2.7, oy + s * .18, s * .34, s * .9);
      ctx.fillStyle = '#5f646b';
      for (var cy = 0; cy < 4; cy++) ctx.fillRect(ox + s * 2.7, oy + s * (.28 + cy * .2), s * .34, s * .04);
      ctx.fillStyle = '#3e3a3f';
      ctx.fillRect(ox + s * 2.62, oy + s * .08, s * .5, s * .12);
      drawGear(ctx, ox + s * 9.1, oy + s * 2.0, s * .7, theme, t);
      // 工作台 + 发光屏幕 + 铁砧 + 木箱
      drawWorkbench(ctx, ox + s * 8.2, oy + s * 4.7, s, theme, t);
      tile(ctx, 15, 0, ox + s * 11.0, oy + s * 5.2, s * .9);
      drawCrate(ctx, ox + s * 10.2, oy + s * 6.6, s * .9);
      drawBarrel(ctx, ox + s * 1.1, oy + s * 6.5, s * .9);
      drawSign(ctx, ox + s * 9.7, oy + s * 1.1, s * .9, theme, 'gear');
    } else if (id === 'plaza') {
      drawFountain(ctx, ox + s * 3.4, oy + s * 1.9, s, t);
      drawNotice(ctx, ox + s * 8.9, oy + s * .9, s, theme);
      drawStall(ctx, ox + s * .5, oy + s * 1.1, s, theme);
      drawPennants(ctx, ox + s * 2.0, oy + s * .45, s * 8.5, s, theme);
      drawLamp(ctx, ox + s * 1.6, oy + s * 5.0, s, theme, true);
      drawLamp(ctx, ox + s * 11.6, oy + s * 5.0, s, theme, true);
    } else if (id === 'lakeside') {
      // 码头 + 小船
      for (var d = 0; d < 3; d++) tile(ctx, 9, 2, ox + s * 6.2, oy + s * (4.0 + d * .8), s * .9);
      ctx.fillStyle = '#5a3a1e';
      ctx.fillRect(ox + s * 6.1, oy + s * 4.0, s * .12, s * 2.3);
      ctx.fillRect(ox + s * 7.0, oy + s * 4.0, s * .12, s * 2.3);
      drawBoat(ctx, ox + s * 2.0, oy + s * 4.6, s);
      // 帐篷营地
      tile(ctx, 46, 10, ox + s * 9.6, oy + s * 1.6, s * .9);
      tile(ctx, 47, 10, ox + s * 10.5, oy + s * 1.6, s * .9);
      tile(ctx, 48, 10, ox + s * 10.0, oy + s * 3.0, s * .8);
      tile(ctx, 49, 10, ox + s * 10.8, oy + s * 3.0, s * .8);
      drawCampfire(ctx, ox + s * 10.4, oy + s * 5.0, s * .9, t);
      drawPine(ctx, ox + s * 11.8, oy + s * .1, s * .9);
      drawPine(ctx, ox + s * .2, oy + s * .2, s * .8);
      drawPine(ctx, ox + s * 12.2, oy + s * 6.2, s * .75);
      drawSign(ctx, ox + s * 11.1, oy + s * 3.7, s * .85, theme, 'fish');
      // 钓竿与石头
      ctx.strokeStyle = '#5a3a1e';
      ctx.lineWidth = Math.max(1, s * .08);
      ctx.beginPath(); ctx.moveTo(ox + s * 7.2, oy + s * 4.0); ctx.lineTo(ox + s * 8.3, oy + s * 2.4); ctx.stroke();
      tile(ctx, 26, 5, ox + s * 8.2, oy + s * 2.2, s * .6);
    } else if (id === 'tavern') {
      drawPrefab(ctx, 'righthouse', ox + s * .8, oy + s * .5, s, theme);
      drawPrefab(ctx, 'tall', ox + s * 4.9, oy + s * -.1, s, theme);
      drawPennants(ctx, ox + s * 1.2, oy + s * .4, s * 6.8, s, theme);
      drawStage(ctx, ox + s * 8.3, oy + s * 2.35, s, theme, t);
      drawBarrel(ctx, ox + s * 1.1, oy + s * 6.3, s * .9);
      drawBarrel(ctx, ox + s * 1.9, oy + s * 6.5, s * .9);
      drawBarrel(ctx, ox + s * 2.7, oy + s * 6.2, s * .85);
      tile(ctx, 19, 6, ox + s * 10.2, oy + s * 6.4, s * .9);
      tile(ctx, 20, 6, ox + s * 11.2, oy + s * 6.4, s * .9);
      drawSign(ctx, ox + s * 6.0, oy + s * 1.3, s, theme, 'mug');
      tile(ctx, 44, 5, ox + s * 1.25, oy + s * 2.0, s * .6);
      tile(ctx, 44, 5, ox + s * 1.25, oy + s * 3.2, s * .6);
      drawBush(ctx, ox + s * .8, oy + s * 6.4, s * .55);
    } else if (id === 'cottage') {
      // 原色实心小屋：不整层染绿，墙体、屋顶和门窗保持高对比
      drawPrefab(ctx, 'barn', ox + s * 8.05, oy + s * 1.95, s * 1.08, theme, { plain: true });
      // 门廊石阶 + 门上的绿叶花环
      ctx.fillStyle = '#8a8f98';
      ctx.fillRect(Math.round(ox + s * 9.08), Math.round(oy + s * 6.05), Math.round(s * 1.12), Math.round(s * .16));
      ctx.fillStyle = '#c3c8cc';
      ctx.fillRect(Math.round(ox + s * 9.12), Math.round(oy + s * 6.07), Math.round(s * 1.0), Math.max(1, Math.round(s * .06)));
      ctx.strokeStyle = '#4f7a3a';
      ctx.lineWidth = Math.max(2, s * .11);
      ctx.beginPath();
      ctx.arc(ox + s * 9.64, oy + s * 5.28, s * .19, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = '#c9503e';
      ctx.fillRect(Math.round(ox + s * 9.58), Math.round(oy + s * 5.22), Math.max(2, s * .1), Math.max(2, s * .1));
      // 长椅与秋千都落在巨树树冠下
      drawBench(ctx, ox + s * 2.02, oy + s * 6.12, s);
      drawSwing(ctx, ox + s * 5.16, oy + s * 4.52, s * .92, theme);
      drawLamp(ctx, ox + s * 7.02, oy + s * 6.7, s, theme, true);
      drawSign(ctx, ox + s * 10.9, oy + s * 1.0, s * .8, theme, 'leaf');
      drawBush(ctx, ox + s * 11.0, oy + s * 6.4, s * .6);
    } else if (id === 'station') {
      drawShelter(ctx, ox + s * 1.8, oy + s * .25, s, theme);
      drawSign(ctx, ox + s * 8.75, oy + s * .85, s * 1.15, theme, 'train');
      drawLamp(ctx, ox + s * 8.1, oy + s * 1.5, s, theme, true);
      tile(ctx, 19, 6, ox + s * 6.2, oy + s * 3.2, s * .85);
      tile(ctx, 20, 6, ox + s * 7.05, oy + s * 3.2, s * .85);
      drawCrate(ctx, ox + s * 1.1, oy + s * 3.4, s * .7);
      tile(ctx, 18, 0, ox + s * 1.9, oy + s * 3.5, s * .6);
      // 行李箱
      ctx.fillStyle = '#3e2614'; ctx.fillRect(ox + s * 10.4, oy + s * 3.55, s * .55, s * .5);
      ctx.fillStyle = '#b5413a'; ctx.fillRect(ox + s * 10.45, oy + s * 3.6, s * .45, s * .4);
      ctx.fillStyle = '#f0c040'; ctx.fillRect(ox + s * 10.55, oy + s * 3.55, s * .1, s * .1);
    } else if (id === 'empty') {
      // 实心空房：不再用 alpha，改用灰色调 + 封门木板 / 待租木牌表达空置
      drawPrefab(ctx, 'barn', ox + s * 2.0, oy + s * .4, s, '#8a8f98');
      function plank(w, h, rot) {
        ctx.save();
        ctx.translate(ox + s * 3.5, oy + s * 3.62);
        ctx.rotate(rot);
        ctx.fillStyle = '#3e2614';
        ctx.fillRect(-w / 2, -h / 2, w, h);
        ctx.fillStyle = '#b5773d';
        ctx.fillRect(-w / 2 + 1, -h / 2 + 1, w - 2, h - 2);
        ctx.fillStyle = '#8b5a2b';
        ctx.fillRect(-w / 2 + 1, -h / 2 + 1, w - 2, Math.max(1, h * .28));
        ctx.fillStyle = '#3e2614';
        ctx.fillRect(-w / 2 + 2, -h / 2 + 2, 2, 2);
        ctx.fillRect(w / 2 - 4, h / 2 - 4, 2, 2);
        ctx.restore();
      }
      plank(s * 1.18, s * .2, -.42);
      plank(s * 1.18, s * .2, .42);
      drawSign(ctx, ox + s * 5.4, oy + s * 2.4, s * .9, '#8a8f98', 'none');
      ctx.save();
      ctx.fillStyle = '#5a3a1e';
      ctx.font = 'bold ' + Math.max(7, Math.round(s * .3)) + 'px "PingFang SC", "Microsoft YaHei", monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('待租', ox + s * 5.85, oy + s * 2.73);
      ctx.restore();
      drawBush(ctx, ox + s * .7, oy + s * 3.2, s * .7);
      drawBush(ctx, ox + s * 5.8, oy + s * 3.6, s * .6);
    }
  }

  function drawGear(ctx, x, y, s, theme, t) {
    ctx.save();
    ctx.translate(x + s / 2, y + s / 2);
    ctx.rotate((t * .25) % (Math.PI * 2));
    ctx.fillStyle = '#3e3a3f';
    for (var i = 0; i < 8; i++) {
      ctx.rotate(Math.PI / 4);
      ctx.fillRect(-s * .08, -s * .46, s * .16, s * .2);
    }
    ctx.beginPath();
    ctx.arc(0, 0, s * .3, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = theme;
    ctx.beginPath();
    ctx.arc(0, 0, s * .2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#2b1c16';
    ctx.beginPath();
    ctx.arc(0, 0, s * .08, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  function drawWorkbench(ctx, x, y, s, theme, t) {
    ctx.fillStyle = '#3e2614';
    ctx.fillRect(x, y + s * .3, s * 2.1, s * .5);
    ctx.fillStyle = '#8b5a2b';
    ctx.fillRect(x + s * .06, y + s * .32, s * 1.98, s * .34);
    ctx.fillStyle = '#5a3a1e';
    ctx.fillRect(x + s * .12, y + s * .68, s * .18, s * .5);
    ctx.fillRect(x + s * 1.8, y + s * .68, s * .18, s * .5);
    // 发光小屏幕
    ctx.fillStyle = '#2b1c16';
    ctx.fillRect(x + s * 1.3, y - s * .36, s * .62, s * .55);
    ctx.fillStyle = '#9fe6ff';
    ctx.fillRect(x + s * 1.37, y - s * .3, s * .48, s * .4);
    ctx.fillStyle = 'rgba(159,230,255,.25)';
    ctx.beginPath(); ctx.arc(x + s * 1.6, y - s * .06, s * .65, 0, Math.PI * 2); ctx.fill();
    // 工具
    ctx.fillStyle = '#8a8f98';
    ctx.fillRect(x + s * .3, y + s * .08, s * .1, s * .3);
    ctx.fillRect(x + s * .24, y + s * .04, s * .22, s * .08);
    ctx.fillStyle = theme;
    ctx.fillRect(x + s * .74, y + s * .12, s * .2, s * .18);
  }
  function drawFountain(ctx, x, y, s, t) {
    // 外圈石台
    ctx.fillStyle = '#3e3a3f';
    roundRect(ctx, x, y, s * 5, s * 4, s * .5); ctx.fill();
    ctx.fillStyle = '#9aa0a6';
    roundRect(ctx, x + s * .12, y + s * .12, s * 4.76, s * 3.76, s * .45); ctx.fill();
    ctx.fillStyle = '#c3c8cc';
    roundRect(ctx, x + s * .28, y + s * .28, s * 4.44, s * 3.44, s * .4); ctx.fill();
    // 水
    ctx.fillStyle = '#5fa8d3';
    roundRect(ctx, x + s * .55, y + s * .55, s * 3.9, s * 2.9, s * .35); ctx.fill();
    for (var i = 0; i < 12; i++) {
      var px = x + s * (.7 + hash(i, 1, 13) * 3.6);
      var py = y + s * (.7 + hash(i, 2, 13) * 2.6);
      ctx.fillStyle = (Math.floor(t * 2 + i) % 3 === 0) ? 'rgba(255,255,255,.75)' : 'rgba(143,211,255,.55)';
      ctx.fillRect(Math.round(px), Math.round(py), Math.max(1, s * .09), Math.max(1, s * .09));
    }
    // 中央石柱
    ctx.fillStyle = '#3e3a3f';
    ctx.fillRect(x + s * 2.15, y + s * 1.1, s * .7, s * 1.4);
    ctx.fillStyle = '#b8bcc2';
    ctx.fillRect(x + s * 2.25, y + s * 1.15, s * .5, s * 1.2);
    ctx.fillStyle = '#f0c040';
    ctx.fillRect(x + s * 2.3, y + s * .86, s * .4, s * .24);
  }
  function drawNotice(ctx, x, y, s, theme) {
    // 两根柱子
    ctx.fillStyle = '#3e2614';
    ctx.fillRect(x + s * .22, y + s * .55, s * .18, s * 2.7);
    ctx.fillRect(x + s * 2.1, y + s * .55, s * .18, s * 2.7);
    ctx.fillStyle = '#8b5a2b';
    ctx.fillRect(x + s * .26, y + s * .58, s * .1, s * 2.6);
    ctx.fillRect(x + s * 2.14, y + s * .58, s * .1, s * 2.6);
    // 木框 + 纸面
    ctx.fillStyle = '#2b1c16';
    ctx.fillRect(x, y, s * 2.5, s * 2.2);
    ctx.fillStyle = '#8b5a2b';
    ctx.fillRect(x + s * .06, y + s * .06, s * 2.38, s * 2.08);
    ctx.fillStyle = '#fdf3d7';
    ctx.fillRect(x + s * .18, y + s * .18, s * 2.14, s * 1.84);
    // 贴纸
    var papers = [[.3, .3, .55, .42], [1.05, .3, .6, .5], [.35, 1.0, .45, .38], [1.15, 1.05, .55, .35]];
    papers.forEach(function (p, i) {
      ctx.fillStyle = i % 2 ? '#fff8df' : '#f6d88f';
      ctx.fillRect(x + s * p[0], y + s * p[1], s * p[2], s * p[3]);
      ctx.fillStyle = 'rgba(90,58,30,.45)';
      ctx.fillRect(x + s * (p[0] + .06), y + s * (p[1] + .08), s * (p[2] - .12), s * .04);
      ctx.fillRect(x + s * (p[0] + .06), y + s * (p[1] + .16), s * (p[2] - .18), s * .04);
    });
    // 顶棚
    ctx.fillStyle = '#3e2614';
    ctx.fillRect(x - s * .1, y - s * .18, s * 2.7, s * .18);
    ctx.fillStyle = theme;
    ctx.fillRect(x - s * .03, y - s * .15, s * 2.56, s * .12);
    // 图钉
    ctx.fillStyle = '#c9503e';
    ctx.fillRect(x + s * .28, y + s * .26, s * .12, s * .12);
    ctx.fillRect(x + s * 1.03, y + s * .26, s * .12, s * .12);
  }
  function drawStall(ctx, x, y, s, theme) {
    for (var i = 0; i < 3; i++) tile(ctx, 10, i, x + i * s * .9, y, s * .9);
    ctx.fillStyle = '#3e2614';
    ctx.fillRect(x + s * .05, y + s * .82, s * .1, s * 1.5);
    ctx.fillRect(x + s * 2.45, y + s * .82, s * .1, s * 1.5);
    ctx.fillStyle = '#8b5a2b';
    ctx.fillRect(x + s * .05, y + s * 1.6, s * 2.55, s * .55);
    ctx.fillStyle = '#d9a066';
    ctx.fillRect(x + s * .12, y + s * 1.66, s * 2.4, s * .2);
    tile(ctx, 13, 4, x + s * .55, y + s * 1.15, s * .55);
    tile(ctx, 14, 4, x + s * 1.55, y + s * 1.15, s * .55);
    ctx.fillStyle = theme;
    ctx.fillRect(x + s * .1, y + s * .8, s * 2.5, s * .06);
  }
  function drawBoat(ctx, x, y, s) {
    ctx.fillStyle = '#3e2614';
    ctx.beginPath();
    ctx.moveTo(x, y + s * .5); ctx.lineTo(x + s * 1.8, y + s * .5);
    ctx.lineTo(x + s * 1.55, y + s * .95); ctx.lineTo(x + s * .25, y + s * .95);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#b5773d';
    ctx.beginPath();
    ctx.moveTo(x + s * .08, y + s * .54); ctx.lineTo(x + s * 1.72, y + s * .54);
    ctx.lineTo(x + s * 1.48, y + s * .86); ctx.lineTo(x + s * .3, y + s * .86);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#5fa8d3';
    ctx.fillRect(x + s * .35, y + s * .3, s * .1, s * .5);
    ctx.fillStyle = '#fdf3d7';
    ctx.fillRect(x + s * 1.15, y + s * .24, s * .42, s * .35);
  }
  function drawStage(ctx, x, y, s, theme, t) {
    // 后幕
    ctx.fillStyle = '#3e2614';
    ctx.fillRect(x, y, s * 4, s * 1.7);
    ctx.fillStyle = '#7a231f';
    ctx.fillRect(x + s * .06, y + s * .08, s * 3.88, s * 1.54);
    for (var c = 0; c < 5; c++) {
      ctx.fillStyle = c % 2 ? '#9c3a2d' : '#b5413a';
      ctx.fillRect(x + s * (.1 + c * .76), y + s * .1, s * .6, s * 1.5);
    }
    ctx.fillStyle = '#f0c040';
    ctx.fillRect(x, y + s * .04, s * 4, s * .1);
    // 舞台木台
    for (var yy = 0; yy < 2; yy++) for (var xx = 0; xx < 4; xx++) tile(ctx, 9, 2 + (xx % 2), x + xx * s, y + s * 1.7 + yy * s, s);
    ctx.fillStyle = '#3e2614';
    ctx.fillRect(x, y + s * 1.7, s * 4, s * .1);
    ctx.fillStyle = '#5a3a1e';
    ctx.fillRect(x, y + s * 3.5, s * 4, s * .26);
    ctx.fillStyle = '#8b5a2b';
    ctx.fillRect(x + s * .08, y + s * 3.54, s * 3.84, s * .12);
    ctx.fillStyle = theme;
    ctx.fillRect(x + s * .3, y + s * 3.62, s * 3.4, s * .04);
    // 立麦 / 音箱
    ctx.fillStyle = '#2b1c16';
    ctx.fillRect(x + s * 1.8, y + s * 2.4, s * .1, s * 1.0);
    ctx.fillRect(x + s * 1.65, y + s * 2.2, s * .38, s * .18);
    ctx.fillStyle = '#8a8f98';
    ctx.fillRect(x + s * 1.82, y + s * 2.3, s * .22, s * .12);
    ctx.fillStyle = '#3e2614';
    ctx.fillRect(x + s * .18, y + s * 2.0, s * .42, s * .9);
    ctx.fillStyle = '#8a8f98';
    ctx.fillRect(x + s * .22, y + s * 2.08, s * .34, s * .7);
    // 台阶 / 脚灯 / 鼓
    ctx.fillStyle = '#3e2614';
    ctx.fillRect(x + s * 1.65, y + s * 3.55, s * .7, s * .28);
    ctx.fillStyle = '#b5773d';
    ctx.fillRect(x + s * 1.7, y + s * 3.58, s * .6, s * .16);
    for (var fl = 0; fl < 4; fl++) {
      ctx.fillStyle = '#f0c040';
      ctx.fillRect(x + s * (.4 + fl * .95), y + s * 3.46, s * .18, s * .08);
    }
    ctx.fillStyle = '#3e2614';
    ctx.fillRect(x + s * 2.85, y + s * 2.25, s * .6, s * .5);
    ctx.fillStyle = '#c9503e';
    ctx.fillRect(x + s * 2.92, y + s * 2.3, s * .46, s * .18);
    ctx.fillStyle = '#fdf3d7';
    ctx.fillRect(x + s * 2.95, y + s * 2.35, s * .4, s * .08);
    // 聚光灯
    ctx.fillStyle = '#3e2614';
    ctx.fillRect(x + s * .3, y - s * .35, s * .22, s * .3);
    ctx.fillRect(x + s * 3.4, y - s * .35, s * .22, s * .3);
    ctx.fillStyle = '#f0c040';
    ctx.fillRect(x + s * .27, y - s * .42, s * .28, s * .14);
    ctx.fillRect(x + s * 3.37, y - s * .42, s * .28, s * .14);
  }
  function drawSwing(ctx, x, y, s, theme) {
    ctx.strokeStyle = '#5a3a1e';
    ctx.lineWidth = Math.max(1, s * .09);
    ctx.beginPath();
    ctx.moveTo(x, y); ctx.lineTo(x + s * .4, y + s * 2.3);
    ctx.moveTo(x + s * 1.8, y); ctx.lineTo(x + s * 1.4, y + s * 2.3);
    ctx.stroke();
    ctx.strokeStyle = '#3e2614';
    ctx.beginPath();
    ctx.moveTo(x + s * .2, y + s * .9); ctx.lineTo(x + s * .2, y + s * 1.6);
    ctx.moveTo(x + s * 1.6, y + s * .9); ctx.lineTo(x + s * 1.6, y + s * 1.6);
    ctx.stroke();
    ctx.fillStyle = theme;
    ctx.fillRect(x + s * .1, y + s * 1.55, s * 1.6, s * .22);
    ctx.fillStyle = '#8b5a2b';
    ctx.fillRect(x + s * .1, y + s * 1.55, s * 1.6, s * .08);
  }
  function drawGiantTree(ctx, cx, by, s) {
    var u = Math.max(2, Math.round(s / 8));
    var top = by - s * 5.0;
    ctx.save();
    // 地面投影
    ctx.fillStyle = 'rgba(20,14,8,.24)';
    ctx.beginPath();
    ctx.ellipse(cx, by - s * .05, s * 1.7, s * .3, 0, 0, Math.PI * 2);
    ctx.fill();
    // 主干与分枝（树冠会盖住上半段）
    ctx.fillStyle = '#3e2614';
    ctx.fillRect(Math.round(cx - s * .38), Math.round(top + s * 2.1), Math.round(s * .76), Math.round(by - top - s * 2.1));
    ctx.fillStyle = '#8b5a2b';
    ctx.fillRect(Math.round(cx - s * .24), Math.round(top + s * 2.15), Math.round(s * .4), Math.round(by - top - s * 2.15));
    ctx.strokeStyle = '#5a3a1e';
    ctx.lineWidth = Math.max(2, s * .15);
    ctx.beginPath();
    ctx.moveTo(cx, top + s * 2.8); ctx.lineTo(cx - s * 1.25, top + s * 2.0);
    ctx.moveTo(cx + s * .08, top + s * 2.5); ctx.lineTo(cx + s * 1.2, top + s * 1.85);
    ctx.stroke();
    ctx.fillStyle = '#3e2614';
    ctx.fillRect(Math.round(cx - s * .72), Math.round(by - s * .18), Math.round(s * 1.44), Math.round(s * .2));
    // 树冠：多块像素团拼接，整体约 5.4×3.4 格
    var blobs = [
      [cx, top + s * 1.55, s * 2.3, s * 1.5],
      [cx - s * 1.45, top + s * 2.05, s * 1.42, s * 1.18],
      [cx + s * 1.45, top + s * 2.05, s * 1.42, s * 1.18],
      [cx - s * .55, top + s * .92, s * 1.28, s * .92],
      [cx + s * .65, top + s * 1.0, s * 1.18, s * .86]
    ];
    function blob(b, grow, color) {
      var rx = b[2] + (grow || 0), ry = b[3] + (grow || 0);
      for (var dy = -ry; dy <= ry; dy += u) {
        var k = 1 - (dy * dy) / (ry * ry);
        if (k <= 0) continue;
        var half = rx * Math.sqrt(k);
        var x0 = Math.round((b[0] - half) / u) * u;
        var x1 = Math.round((b[0] + half) / u) * u;
        ctx.fillStyle = color;
        ctx.fillRect(x0, Math.round((b[1] + dy) / u) * u, Math.max(u, x1 - x0), u);
      }
    }
    blobs.forEach(function (b) { blob(b, u * .85, '#2f4a27'); });
    blobs.forEach(function (b) { blob(b, 0, '#4f7a3a'); });
    blobs.forEach(function (b, i) {
      ctx.save();
      ctx.translate(b[0] - u * 1.5, b[1] - u * 1.2);
      var rx = b[2] * .68, ry = b[3] * .58;
      for (var dy = -ry; dy <= ry; dy += u) {
        var k = 1 - (dy * dy) / (ry * ry);
        if (k <= 0) continue;
        var half = rx * Math.sqrt(k);
        ctx.fillStyle = i % 2 ? '#6aa84f' : '#7fb24d';
        ctx.fillRect(Math.round(-half / u) * u, Math.round(dy / u) * u, Math.max(u, Math.round(half * 2 / u) * u), u);
      }
      ctx.restore();
    });
    // 叶片高光 / 暗部
    for (var i = 0; i < 22; i++) {
      var lx = cx + (hash(i, 1, 63) - .5) * s * 4.6;
      var ly = top + s * (.5 + hash(i, 2, 63) * 2.7);
      var d = ((lx - cx) / (s * 2.7)) * ((lx - cx) / (s * 2.7)) + ((ly - (top + s * 1.9)) / (s * 1.8)) * ((ly - (top + s * 1.9)) / (s * 1.8));
      if (d > 1) continue;
      ctx.fillStyle = i % 3 === 0 ? '#9cc85f' : (i % 3 === 1 ? '#3f6b32' : '#6aa84f');
      ctx.fillRect(Math.round(lx / u) * u, Math.round(ly / u) * u, u, u);
    }
    ctx.restore();
  }

  function drawBench(ctx, x, y, s) {
    var w = s * 2.0, seatY = y + s * .6;
    shadow(ctx, x + s * .1, seatY + s * .68, w - s * .2, s * .3, .18);
    // 靠背立柱
    ctx.fillStyle = '#3e2614';
    ctx.fillRect(Math.round(x + s * .16), Math.round(y), Math.round(s * .14), Math.round(seatY - y + s * .18));
    ctx.fillRect(Math.round(x + w - s * .3), Math.round(y), Math.round(s * .14), Math.round(seatY - y + s * .18));
    // 靠背两条横板
    ctx.fillStyle = '#3e2614';
    ctx.fillRect(Math.round(x + s * .05), Math.round(y + s * .02), Math.round(w - s * .1), Math.round(s * .2));
    ctx.fillRect(Math.round(x + s * .05), Math.round(y + s * .3), Math.round(w - s * .1), Math.round(s * .16));
    ctx.fillStyle = '#b5773d';
    ctx.fillRect(Math.round(x + s * .08), Math.round(y + s * .05), Math.round(w - s * .16), Math.round(s * .12));
    ctx.fillRect(Math.round(x + s * .08), Math.round(y + s * .32), Math.round(w - s * .16), Math.round(s * .1));
    // 坐板
    ctx.fillStyle = '#3e2614';
    ctx.fillRect(Math.round(x), Math.round(seatY), Math.round(w), Math.round(s * .28));
    ctx.fillStyle = '#d9a066';
    ctx.fillRect(Math.round(x + s * .04), Math.round(seatY + s * .03), Math.round(w - s * .08), Math.round(s * .16));
    ctx.fillStyle = '#f0c07a';
    ctx.fillRect(Math.round(x + s * .04), Math.round(seatY + s * .03), Math.round(w - s * .08), Math.max(1, Math.round(s * .05)));
    // 前腿
    ctx.fillStyle = '#5a3a1e';
    ctx.fillRect(Math.round(x + s * .16), Math.round(seatY + s * .24), Math.round(s * .15), Math.round(s * .46));
    ctx.fillRect(Math.round(x + w - s * .31), Math.round(seatY + s * .24), Math.round(s * .15), Math.round(s * .46));
  }

  function drawShelter(ctx, x, y, s, theme) {
    // 候车亭：木平台 + 平顶雨棚 + 长椅
    ctx.fillStyle = '#3e2614';
    ctx.fillRect(x + s * .15, y + s * .92, s * 4.9, s * .18);
    ctx.fillStyle = '#b5773d';
    ctx.fillRect(x + s * .2, y + s * .96, s * 4.8, s * .1);
    // 屋顶
    ctx.fillStyle = '#2b1c16';
    ctx.fillRect(x, y + s * .22, s * 5.2, s * .32);
    ctx.fillStyle = '#8b5a2b';
    ctx.fillRect(x + s * .06, y + s * .26, s * 5.08, s * .23);
    for (var r = 0; r < 6; r++) {
      ctx.fillStyle = r % 2 ? '#a56a36' : '#c8873a';
      ctx.fillRect(x + s * (.12 + r * .82), y + s * .28, s * .55, s * .17);
    }
    ctx.fillStyle = theme;
    ctx.fillRect(x, y + s * .21, s * 5.2, s * .1);
    // 柱子
    ctx.fillStyle = '#3e2614';
    ctx.fillRect(x + s * .25, y + s * .5, s * .18, s * 2.0);
    ctx.fillRect(x + s * 4.75, y + s * .5, s * .18, s * 2.0);
    ctx.fillStyle = '#8b5a2b';
    ctx.fillRect(x + s * .28, y + s * .52, s * .1, s * 1.9);
    ctx.fillRect(x + s * 4.78, y + s * .52, s * .1, s * 1.9);
    // 长椅
    ctx.fillStyle = '#3e2614';
    ctx.fillRect(x + s * .55, y + s * 2.0, s * 2.4, s * .18);
    ctx.fillStyle = '#b5773d';
    ctx.fillRect(x + s * .6, y + s * 2.02, s * 2.3, s * .1);
    ctx.fillStyle = '#5a3a1e';
    ctx.fillRect(x + s * .68, y + s * 2.18, s * .12, s * .35);
    ctx.fillRect(x + s * 2.62, y + s * 2.18, s * .12, s * .35);
  }

  /* ── 前景 / 动效 ──────────────────────────────────────── */
  function nightLights(ctx, id, ox, oy, s) {
    if (!W.isNight()) return;
    var pts = [];
    if (id === 'library') pts = [[3.6,2.9],[7.4,2.9],[5.6,4.8],[1.5,4.7]];
    else if (id === 'workshop') pts = [[3.0,3.6],[6.2,4.8],[9.9,4.2],[3.0,.1]];
    else if (id === 'plaza') pts = [[1.6,5.1],[11.6,5.1],[10.2,2.2]];
    else if (id === 'lakeside') pts = [[10.4,5.0],[9.8,2.2],[1.8,4.6]];
    else if (id === 'tavern') pts = [[2.0,2.6],[5.8,4.1],[8.8,3.2],[10.5,4.6]];
    else if (id === 'cottage') pts = [[9.3,4.2],[7.0,6.6],[2.2,1.8]];
    else if (id === 'station') pts = [[9.5,1.3],[4.5,2.4],[5.8,4.0]];
    ctx.save();
    pts.forEach(function (p) {
      var x = ox + p[0] * s, y = oy + p[1] * s;
      ctx.globalAlpha = .20;
      ctx.fillStyle = '#ffe6a0';
      ctx.beginPath(); ctx.arc(x, y, s * .42, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = .95;
      ctx.fillStyle = '#ffd47a';
      ctx.fillRect(Math.round(x - s * .15), Math.round(y - s * .12), Math.max(2, s * .3), Math.max(2, s * .24));
      ctx.fillStyle = '#fff3c8';
      ctx.fillRect(Math.round(x - s * .1), Math.round(y - s * .08), Math.max(1, s * .18), Math.max(1, s * .12));
    });
    ctx.restore();
  }

  function drawZoneFront(ctx, id, ox, oy, s, t) {
    var z = ZD[id], theme = z.theme;
    if (id === 'library') {
      drawPennants(ctx, ox + s * 3.4, oy + s * .15, s * 5.5, s, theme);
      // 台灯光晕
      ctx.save();
      ctx.globalAlpha = .16 + Math.sin(t * 2.1) * .03;
      ctx.fillStyle = '#ffe6a0';
      ctx.beginPath(); ctx.arc(ox + s * 1.5, oy + s * 4.2, s * 1.3, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    } else if (id === 'workshop') {
      // 烟囱烟
      for (var i = 0; i < 4; i++) {
        var age = (t * .55 + i * .25) % 1;
        var sx = ox + s * 2.45 + Math.sin(age * 5 + i) * s * .2;
        var sy = oy + s * -.1 - age * s * 2.2;
        ctx.fillStyle = 'rgba(220,220,220,' + (0.28 * (1 - age)) + ')';
        ctx.beginPath(); ctx.arc(sx, sy, s * (.16 + age * .22), 0, Math.PI * 2); ctx.fill();
      }
      ctx.save(); ctx.globalAlpha = .14;
      ctx.fillStyle = '#9fe6ff';
      ctx.beginPath(); ctx.arc(ox + s * 9.9, oy + s * 4.2, s * 1.3, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    } else if (id === 'plaza') {
      // 喷泉水花：三条弧线 + 水面涟漪
      var fcx = ox + s * 5.9, fcy = oy + s * 2.9;
      for (var jet = 0; jet < 3; jet++) {
        for (var k = 0; k < 9; k++) {
          var a = t * 1.6 + k * .7 + jet * 2.1;
          var r = s * (.3 + k * .13);
          var px = fcx + Math.cos(a) * r * .55;
          var py = fcy + Math.sin(a * 1.1) * s * .2 - k * s * .08;
          ctx.fillStyle = 'rgba(223,246,255,' + (.65 - k * .04 + .15 * Math.sin(a)) + ')';
          ctx.fillRect(Math.round(px), Math.round(py), Math.max(1, s * .09), Math.max(1, s * .13));
        }
      }
      ctx.strokeStyle = 'rgba(255,255,255,.55)';
      ctx.lineWidth = Math.max(1, s * .06);
      for (var rr = 0; rr < 2; rr++) {
        var phase = (t * .55 + rr * .5) % 1;
        ctx.globalAlpha = .65 * (1 - phase);
        ctx.beginPath();
        ctx.ellipse(fcx, fcy + s * .5, s * (.5 + phase * 1.3), s * (.16 + phase * .32), 0, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
      // 彩旗飘动
      drawPennants(ctx, ox + s * 9.0, oy + s * .45, s * 3.4, s, theme);
    } else if (id === 'lakeside') {
      // 水波
      for (var w = 0; w < 12; w++) {
        var wx = ox + s * (.7 + hash(w, 1, 31) * 7.0);
        var wy = oy + s * (1.6 + hash(w, 2, 31) * 5.1);
        var glow = (Math.floor(t * 2 + w) % 4 === 0);
        ctx.fillStyle = glow ? 'rgba(255,255,255,.85)' : 'rgba(143,211,255,.5)';
        ctx.fillRect(Math.round(wx), Math.round(wy), Math.max(1, s * .13), Math.max(1, s * .05));
      }
      // 篝火火星
      for (var f = 0; f < 4; f++) {
        var fa = (t * 1.3 + f * .24) % 1;
        ctx.fillStyle = 'rgba(255,200,80,' + (1 - fa) + ')';
        ctx.fillRect(Math.round(ox + s * 10.55 + Math.sin(fa * 8 + f) * s * .16), Math.round(oy + s * 4.7 - fa * s * .8), Math.max(1, s * .07), Math.max(1, s * .1));
      }
    } else if (id === 'tavern') {
      // 音符
      for (var n = 0; n < 5; n++) {
        var na = (t * .28 + n * .17) % 1;
        var nx = ox + s * (8.6 + n * .55) + Math.sin(na * 6 + n) * s * .25;
        var ny = oy + s * 2.8 - na * s * 2.3;
        ctx.save();
        ctx.globalAlpha = 1 - na;
        ctx.fillStyle = '#f6d88f';
        ctx.fillRect(Math.round(nx), Math.round(ny), Math.max(1, s * .1), Math.max(1, s * .18));
        ctx.fillRect(Math.round(nx + s * .1), Math.round(ny), Math.max(1, s * .12), Math.max(1, s * .06));
        ctx.beginPath(); ctx.arc(nx, ny + s * .18, s * .09, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
      }
      // 舞台光
      ctx.save();
      ctx.globalAlpha = .08 + .03 * Math.sin(t * 2.4);
      ctx.fillStyle = '#ffe6a0';
      ctx.beginPath();
      ctx.moveTo(ox + s * 8.4, oy + s * 2.6);
      ctx.lineTo(ox + s * 7.2, oy + s * 6.4);
      ctx.lineTo(ox + s * 9.8, oy + s * 6.4);
      ctx.closePath(); ctx.fill();
      ctx.restore();
    } else if (id === 'cottage') {
      // 区域中央的巨树地标：树冠约 5.4×3.4 格，长椅和秋千在其下方
      drawGiantTree(ctx, ox + s * 4.3, oy + s * 6.35, s);
      drawTree(ctx, ox + s * .05, oy + s * .15, s, 15, 10, .82);
      drawTree(ctx, ox + s * 12.0, oy + s * .1, s, 13, 10, .78);
      // 萤火虫
      for (var c = 0; c < 10; c++) {
        var ca = t * .6 + c * 1.7;
        var cx = ox + s * (1.2 + hash(c, 1, 41) * 10.5) + Math.sin(ca) * s * .32;
        var cy = oy + s * (2.4 + hash(c, 2, 41) * 5.0) + Math.cos(ca * 1.3) * s * .22;
        var al = .35 + .65 * (0.5 + 0.5 * Math.sin(t * 2.2 + c));
        ctx.fillStyle = 'rgba(255,240,140,' + al + ')';
        ctx.fillRect(Math.round(cx), Math.round(cy), Math.max(1, s * .09), Math.max(1, s * .09));
      }
      ctx.save(); ctx.globalAlpha = .13;
      ctx.fillStyle = '#8cc152';
      ctx.beginPath(); ctx.arc(ox + s * 2.2, oy + s * 1.8, s * 3.2, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    } else if (id === 'station') {
      // 小蒸汽
      for (var st = 0; st < 3; st++) {
        var sa = (t * .4 + st * .3) % 1;
        ctx.fillStyle = 'rgba(235,235,235,' + (0.2 * (1 - sa)) + ')';
        ctx.beginPath(); ctx.arc(ox + s * 10.2 + sa * s * .5, oy + s * 1.0 - sa * s * 1.2, s * .15, 0, Math.PI * 2); ctx.fill();
      }
    }
    nightLights(ctx, id, ox, oy, s);
  }

  function drawAlwaysFront(ctx, w, h, t, opts) {
    opts = opts || {};
    // 云影
    var cx = ((t * 8) % (w + 300)) - 150;
    ctx.save();
    ctx.fillStyle = 'rgba(30,40,20,.055)';
    ctx.beginPath(); ctx.ellipse(cx, h * .28, w * .18, h * .05, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(w * .72 - (t * 4 % 160), h * .62, w * .12, h * .035, 0, 0, Math.PI * 2); ctx.fill();
    ctx.restore();

    // 飘叶 / 花瓣
    var n = opts.map ? 18 : 14;
    for (var i = 0; i < n; i++) {
      var speed = .018 + (i % 4) * .005;
      var x = ((hash(i, 1, 51) * w + t * speed * w) % (w + 40)) - 20;
      var y = (hash(i, 2, 51) * h + Math.sin(t * .7 + i) * 16 + t * (5 + i % 3)) % h;
      ctx.fillStyle = i % 3 === 0 ? '#f0c040' : (i % 3 === 1 ? '#c9503e' : '#8cc152');
      ctx.fillRect(Math.round(x), Math.round(y), Math.max(1, w * .0028), Math.max(1, w * .0028));
    }

    // 小鸟
    var bx = (t * 22) % (w + 200) - 100;
    var by = h * .14 + Math.sin(t * .5) * 10;
    ctx.strokeStyle = 'rgba(50,40,35,.55)';
    ctx.lineWidth = Math.max(1, Math.min(w, h) * .0018);
    ctx.beginPath();
    ctx.moveTo(bx - 8, by); ctx.quadraticCurveTo(bx - 3, by - 5, bx, by);
    ctx.quadraticCurveTo(bx + 3, by - 5, bx + 8, by);
    ctx.stroke();

    // 天色
    var hr = W.getHour();
    if (hr >= 18 && hr < 20) {
      ctx.fillStyle = 'rgba(224,123,57,.10)';
      ctx.fillRect(0, 0, w, h);
    } else if (hr >= 20 || hr < 6) {
      ctx.fillStyle = 'rgba(59,42,74,.20)';
      ctx.fillRect(0, 0, w, h);
    }
  }

  /* ── 地图 API ─────────────────────────────────────────── */
  var LAYOUT = null;
  function buildLayout() {
    var zones = {};
    ZONE_ORDER.concat(['empty']).forEach(function (id) {
      var pos = MAP_POS[id], z = ZD[id], s = T * MS;
      var o = {
        x: pos.tx * s, y: pos.ty * s,
        w: z.tw * s, h: z.th * s,
        tx: pos.tx, ty: pos.ty, tw: z.tw, th: z.th,
        color: z.theme, id: id
      };
      if (z.walk) {
        o.walk = {
          x: (pos.tx + z.walk.x) * s, y: (pos.ty + z.walk.y) * s,
          w: z.walk.w * s, h: z.walk.h * s
        };
      }
      o.notice = z.notice ? {
        x: (pos.tx + z.notice.x) * s, y: (pos.ty + z.notice.y) * s,
        w: z.notice.w * s, h: z.notice.h * s
      } : null;
      zones[id] = o;
    });
    var s = T * MS;
    return {
      id: 'wide', w: MAP_W, h: MAP_H, s: s,
      zones: zones, empty: zones.empty,
      admin: { x: 18.2 * s, y: 25.2 * s },
      noticeBoardRect: zones.plaza.notice
    };
  }
  W.getMapLayout = function () {
    if (!LAYOUT) LAYOUT = buildLayout();
    return LAYOUT;
  };

  function drawBaseMap(ctx, L) {
    var s = L.s;
    drawGrassField(ctx, 0, 0, COLS, ROWS, s, 1);
    // 公共土路
    var paths = [
      [2, 10, 41, 3], [2, 21, 41, 3],
      [6, 10, 3, 12], [21, 10, 3, 12], [36, 10, 3, 12],
      [6, 20, 3, 5], [21, 20, 3, 5], [36, 20, 3, 6],
      [9, 27, 4, 2], [2, 15, 3, 4], [40, 14, 3, 4]
    ];
    paths.forEach(function (p) { pathRect(ctx, p[0] * s, p[1] * s, p[2], p[3], s); });
    // 路边花草
    for (var i = 0; i < 70; i++) {
      var x = Math.floor(hash(i, 1, 71) * COLS);
      var y = Math.floor(hash(i, 2, 71) * ROWS);
      var inZone = false;
      for (var id in L.zones) {
        var z = L.zones[id];
        if (x >= z.tx - 1 && x <= z.tx + z.tw && y >= z.ty - 1 && y <= z.ty + z.th) { inZone = true; break; }
      }
      if (!inZone) drawFlowers(ctx, x * s, y * s, s, i);
    }
    // 地图边缘树林
    for (var x2 = 0; x2 < COLS; x2 += 1) {
      if (x2 < 16 || x2 > 19) {
        drawTree(ctx, x2 * s + s * .1, -s * .4, s, 13 + (x2 % 3), 10, 1);
        if (x2 % 2 === 0) drawPine(ctx, x2 * s, s * 1.2, s, .8);
      }
      if (x2 % 2 === 0) drawTree(ctx, x2 * s, (ROWS - 1) * s, s, 14 + (x2 % 2), 10, 1);
    }
    for (var y2 = 0; y2 < ROWS; y2 += 1) {
      drawTree(ctx, -s * .3, y2 * s, s, 13 + (y2 % 3), 10, 1);
      drawTree(ctx, (COLS - 1) * s, y2 * s, s, 14 + (y2 % 2), 10, 1);
    }
    // 少量散树 / 灌木
    var spots = [[3, 11], [13, 11], [29, 10], [42, 10], [2, 22], [27, 21], [41, 22], [22, 22], [13, 25]];
    spots.forEach(function (p, i) {
      if (i % 3 === 0) drawTree(ctx, p[0] * s, p[1] * s, s, 13 + (i % 3), 10, 1);
      else drawBush(ctx, p[0] * s, p[1] * s, s * .8, 19 + (i % 3), 9);
    });
  }

  W.drawMapStatic = function (ctx, L) {
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, L.w, L.h);
    drawBaseMap(ctx, L);
    ZONE_ORDER.forEach(function (id) {
      var z = L.zones[id];
      if (!z) return;
      drawZoneBase(ctx, id, z.x, z.y, L.s, 0);
      drawBorder(ctx, id, z.x, z.y, L.s);
      drawZoneBuildings(ctx, id, z.x, z.y, L.s, 0);
    });
    var e = L.empty;
    drawZoneBase(ctx, 'empty', e.x, e.y, L.s, 0);
    drawZoneBuildings(ctx, 'empty', e.x, e.y, L.s, 0);
  };

  W.drawMapDynamic = function (ctx, L, t) {
    ZONE_ORDER.forEach(function (id) {
      var z = L.zones[id];
      if (z) drawZoneFront(ctx, id, z.x, z.y, L.s, t);
    });
    drawAlwaysFront(ctx, L.w, L.h, t, { map: true });
  };

  function makeActor(member, x, y, walk, s, seed) {
    var r = hash(parseInt(member.room, 10) || 1, seed, 5);
    return {
      member: member, x: x, y: y, u: s / 16, w: s, h: s,
      walk: walk,
      targetX: walk.x + r * Math.max(1, walk.w - s),
      targetY: walk.y + hash(seed, 2, 8) * Math.max(1, walk.h - s),
      pause: r * 2, speed: 7 + r * 10, frame: 0, phase: r * 10, face: 1,
      base: y + s, isAdmin: false
    };
  }
  W.layoutMapActors = function (L, members, admin) {
    var out = [];
    var by = {};
    members.forEach(function (m) { (by[m.scene] = by[m.scene] || []).push(m); });
    for (var sid in by) {
      var z = L.zones[sid];
      if (!z || !z.walk) continue;
      var list = by[sid], walk = z.walk, s = L.s;
      var n = list.length;
      var cols = n > 5 ? Math.ceil(n / 2) : n;
      var rows = n > 5 ? 2 : 1;
      var rowH = rows > 1 ? Math.min(s * 1.1, walk.h / 2) : 0;
      for (var i = 0; i < n; i++) {
        var r = Math.floor(i / cols), c = i % cols;
        var cw = walk.w / cols;
        var x = walk.x + c * cw + Math.max(0, (cw - s) / 2);
        var y = walk.y + r * rowH + Math.max(0, (rowH || walk.h) / 2 - s / 2);
        y = Math.max(walk.y, Math.min(walk.y + walk.h - s, y));
        out.push(makeActor(list[i], x, y, walk, s, i + 1));
      }
    }
    if (admin) {
      out.push({
        member: admin, x: L.admin.x, y: L.admin.y, u: L.s / 16, w: L.s, h: L.s,
        walk: null, targetX: L.admin.x, targetY: L.admin.y, pause: 999, speed: 0,
        frame: 0, phase: 0, base: L.admin.y + L.s, isAdmin: true
      });
    }
    return out;
  };

  /* ── 场景 API ─────────────────────────────────────────── */
  W.getSceneLayout = function (id, w, h) {
    var z = ZD[id];
    if (!z) return null;
    var narrow = w < 720;
    var top = narrow ? 86 : 100, bottom = narrow ? 64 : 82;
    var availW = Math.max(160, w - (narrow ? 18 : 70));
    var availH = Math.max(140, h - top - bottom);
    var maxS = 5;
    var byW = Math.floor(availW / (z.tw * T));
    var byH = Math.floor(availH / (z.th * T));
    var zoom = Math.max(2, Math.min(maxS, byW, byH));
    var s = zoom * T;
    var stageW = z.tw * s, stageH = z.th * s;
    var ox = Math.round((w - stageW) / 2);
    var oy = Math.round((h - stageH) / 2 + (narrow ? 8 : 18));
    var walk = z.walk ? {
      x: ox + z.walk.x * s, y: oy + z.walk.y * s,
      w: z.walk.w * s, h: z.walk.h * s
    } : null;
    var notice = z.notice ? {
      x: ox + z.notice.x * s, y: oy + z.notice.y * s,
      w: z.notice.w * s, h: z.notice.h * s
    } : null;
    var L = {
      id: id, w: w, h: h, s: s, zoom: zoom, ox: ox, oy: oy,
      stageW: stageW, stageH: stageH,
      zone: { x: ox, y: oy, w: stageW, h: stageH },
      walk: walk, notice: notice,
      admin: { x: ox + 11.4 * s, y: oy + (z.th - 1.25) * s }
    };
    W._lastNotice = notice;
    return L;
  };

  W.drawSceneStatic = function (ctx, w, h, id) {
    var L = W.getSceneLayout(id, w, h);
    if (!L) return;
    ctx.imageSmoothingEnabled = false;
    // 背景：深色草地 + 光晕
    var g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, '#2f3b2a');
    g.addColorStop(.55, '#3c4c33');
    g.addColorStop(1, '#263020');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    drawGrassField(ctx, 0, 0, Math.ceil(w / 32) + 1, Math.ceil(h / 32) + 1, 32, 9);
    ctx.fillStyle = 'rgba(20,16,10,.28)';
    ctx.fillRect(0, 0, w, h);

    // 舞台投影
    ctx.save();
    ctx.fillStyle = 'rgba(8,7,5,.45)';
    roundRect(ctx, L.ox - 10, L.oy - 10, L.stageW + 20, L.stageH + 20, 6);
    ctx.fill();
    ctx.restore();
    // 区域地面 / 建筑
    drawZoneBase(ctx, id, L.ox, L.oy, L.s, 0);
    drawBorder(ctx, id, L.ox, L.oy, L.s);
    drawZoneBuildings(ctx, id, L.ox, L.oy, L.s, 0);
    // 舞台边框
    ctx.save();
    ctx.strokeStyle = rgba(ZD[id].theme, .8);
    ctx.lineWidth = 4;
    ctx.strokeRect(L.ox - 2, L.oy - 2, L.stageW + 4, L.stageH + 4);
    ctx.strokeStyle = 'rgba(62,38,20,.8)';
    ctx.lineWidth = 2;
    ctx.strokeRect(L.ox - 6, L.oy - 6, L.stageW + 12, L.stageH + 12);
    ctx.restore();
    // 角落装饰树（静态）
    drawPine(ctx, 12, h - 160, 2.2, 1.3);
    drawPine(ctx, w - 70, h - 190, 2.2, 1.2);
  };

  W.drawSceneDynamic = function (ctx, w, h, id, t) {
    var L = W.getSceneLayout(id, w, h);
    if (!L) return;
    drawZoneFront(ctx, id, L.ox, L.oy, L.s, t);
    drawAlwaysFront(ctx, w, h, t, { map: false });
    // 前景草叶
    ctx.save();
    ctx.globalAlpha = .55;
    for (var i = 0; i < 12; i++) {
      var x = (i * 97 + 30) % w;
      var y = h - (i * 37) % 90 - 10;
      ctx.fillStyle = i % 2 ? '#4f7a3a' : '#6aa84f';
      ctx.fillRect(x, y, 2, 7);
    }
    ctx.restore();
  };

  W.layoutActors = function (id, w, h, members, admin) {
    var L = W.getSceneLayout(id, w, h);
    if (!L) return [];
    var list = members.slice();
    var out = [];
    var s = L.s, walk = L.walk;
    var n = list.length;
    var twoRows = (id === 'station' && w < 720 && n > 7);
    var rows = twoRows ? 2 : 1;
    var cols = Math.ceil(n / rows);
    var rowH = twoRows ? s * 1.22 : 0;
    for (var i = 0; i < n; i++) {
      var r = twoRows ? Math.floor(i / cols) : 0;
      var c = i % cols;
      var cw = walk.w / cols;
      var x = walk.x + c * cw + Math.max(0, (cw - s) / 2);
      var y = walk.y + (twoRows ? r * rowH : Math.max(0, walk.h / 2 - s / 2));
      y = Math.max(walk.y - s * .3, Math.min(walk.y + walk.h - s + (twoRows ? s * .9 : 0), y));
      out.push({
        member: list[i], x: x, y: y, u: s / 16, w: s, h: s,
        base: y + s, labelX: x + s / 2, labelY: y - 4,
        isAdmin: false
      });
    }
    if (admin) {
      var ax = L.admin.x, ay = L.admin.y;
      if (id === 'station' && w < 720) {
        ax = L.ox + 10.9 * s;
        ay = L.oy + (ZD[id].th - 1.05) * s;
        ay = Math.min(L.oy + L.stageH - s - 2, ay);
      }
      out.push({
        member: admin, x: ax, y: ay, u: s / 16, w: s, h: s,
        base: ay + s, labelX: ax + s / 2, labelY: ay - 4,
        isAdmin: true
      });
    }
    return out;
  };

  /* ── 开场背景 / 时间 ──────────────────────────────────── */
  W.getHour = function () {
    var q = null;
    try { q = new URLSearchParams(location.search).get('hour'); } catch (e) {}
    if (q !== null && q !== '' && !isNaN(+q)) return ((+q % 24) + 24) % 24;
    return new Date().getHours();
  };
  W.isNight = function () { var h = W.getHour(); return h >= 20 || h < 6; };

  var introCanvas = null, introBg = null;
  function introBackground() {
    if (introBg) return introBg;
    if (!ready) return null;
    var c = document.createElement('canvas');
    c.width = MAP_W; c.height = MAP_H;
    var x = c.getContext('2d');
    x.imageSmoothingEnabled = false;
    W.drawMapStatic(x, W.getMapLayout());
    introBg = c;
    return c;
  }
  W.drawIntroScene = function (canvas) {
    introCanvas = canvas;
    var w = canvas.width = Math.max(1, window.innerWidth);
    var h = canvas.height = Math.max(1, window.innerHeight);
    var ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    var bg = introBackground();
    if (!bg) {
      var g = ctx.createLinearGradient(0, 0, 0, h);
      g.addColorStop(0, '#28324a'); g.addColorStop(.55, '#6b5b6e'); g.addColorStop(1, '#2d3b2a');
      ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
      return;
    }
    var scale = Math.max(w / MAP_W, h / MAP_H);
    var dw = MAP_W * scale, dh = MAP_H * scale;
    ctx.drawImage(bg, (w - dw) / 2, (h - dh) / 2, dw, dh);
    ctx.fillStyle = 'rgba(24,20,16,.46)';
    ctx.fillRect(0, 0, w, h);
    var vg = ctx.createRadialGradient(w / 2, h * .48, Math.min(w, h) * .18, w / 2, h * .48, Math.max(w, h) * .7);
    vg.addColorStop(0, 'rgba(0,0,0,0)');
    vg.addColorStop(1, 'rgba(8,7,5,.62)');
    ctx.fillStyle = vg;
    ctx.fillRect(0, 0, w, h);
    // 暖光 / 星光
    ctx.fillStyle = 'rgba(255,230,160,.055)';
    ctx.beginPath(); ctx.arc(w * .7, h * .24, Math.min(w, h) * .26, 0, Math.PI * 2); ctx.fill();
    for (var i = 0; i < 34; i++) {
      var sx = (hash(i, 1, 81) * w + 2) | 0, sy = (hash(i, 2, 81) * h * .55) | 0;
      ctx.fillStyle = i % 3 ? 'rgba(255,240,200,.22)' : 'rgba(255,255,255,.36)';
      ctx.fillRect(sx, sy, 2, 2);
    }
  };

  window.PT = PT;
})();
