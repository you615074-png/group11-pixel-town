/* 角色纸娃娃：Kenney Roguelike Characters 部件坐标拼装 + 像素小道具 */
(function () {
  'use strict';
  var PT = window.PT = window.PT || {};
  var A = PT.art = {};

  var CHAR_SRC = 'assets/kenney-roguelike-characters/Spritesheet/roguelikeChar_transparent.png';
  var charImg = new Image();
  var charReady = false;
  var readyQueue = [];
  charImg.onload = function () {
    charReady = true;
    readyQueue.splice(0).forEach(function (fn) { try { fn(); } catch (e) {} });
    window.dispatchEvent(new CustomEvent('pt-art-ready'));
  };
  charImg.onerror = function () { /* 保留占位绘制 */ };
  charImg.src = CHAR_SRC;

  A.onReady = function (fn) {
    if (charReady) { try { fn(); } catch (e) {} }
    else readyQueue.push(fn);
  };
  A.isReady = function () { return charReady; };

  var OUTLINE = '#2b1c16';

  function part(av, key) {
    var p = av && av[key];
    return Array.isArray(p) && p.length >= 2 ? p : null;
  }

  function drawPart(ctx, p, x, y, u, alpha) {
    if (!p || !charReady) return;
    if (alpha !== undefined) ctx.globalAlpha = alpha;
    ctx.drawImage(charImg, p[0] * 17, p[1] * 17, 16, 16, x, y, 16 * u, 16 * u);
    if (alpha !== undefined) ctx.globalAlpha = 1;
  }

  function pantsRow(av) {
    var p = part(av, 'pants');
    return p ? p[1] : 1;
  }

  function eachPart(av, fn) {
    fn(part(av, 'body'));
    fn(part(av, 'pants'));
    if (charReady) fn([4, pantsRow(av)]);
    fn(part(av, 'shirt'));
    fn(part(av, 'hair'));
    fn(part(av, 'hat'));
  }

  var silCache = {};
  function silhouette(av) {
    var key = [part(av, 'body'), part(av, 'pants'), pantsRow(av), part(av, 'shirt'), part(av, 'hair'), part(av, 'hat')].join('|');
    if (silCache[key]) return silCache[key];
    var c = document.createElement('canvas');
    c.width = 16; c.height = 16;
    var x = c.getContext('2d');
    x.imageSmoothingEnabled = false;
    if (!charReady) { silCache[key] = null; return null; }
    eachPart(av, function (p) { if (p) x.drawImage(charImg, p[0] * 17, p[1] * 17, 16, 16, 0, 0, 16, 16); });
    x.globalCompositeOperation = 'source-in';
    x.fillStyle = OUTLINE;
    x.fillRect(0, 0, 16, 16);
    silCache[key] = c;
    return c;
  }

  /* ── 8×8 小道具（Canvas 兜底，不引外部图） ─────────────── */
  var ICONS = {
    laptop: function (p, c) {
      p(1, 1, 6, 4, '#3b2a20'); p(2, 2, 4, 2, '#9fe6ff'); p(2, 4, 4, 1, '#5fa8d3');
      p(0, 5, 8, 2, '#8b5a2b'); p(1, 5, 6, 1, '#d9a066'); p(3, 5, 2, 1, '#5a3a1e');
    },
    camera: function (p) {
      p(1, 2, 6, 4, '#3b2a20'); p(2, 2, 4, 3, '#8a8f98'); p(3, 3, 2, 2, '#5fa8d3');
      p(2, 1, 3, 1, '#3b2a20'); p(6, 1, 2, 1, '#f0c040'); p(2, 5, 5, 1, '#5a3a1e');
    },
    microphone: function (p) {
      p(3, 0, 2, 4, '#3b2a20'); p(3, 1, 2, 2, '#e6e2d6'); p(3, 4, 2, 2, '#8b5a2b');
      p(2, 6, 4, 1, '#5a3a1e'); p(1, 5, 1, 1, '#8a8f98'); p(6, 5, 1, 1, '#8a8f98');
    },
    note: function (p) {
      p(4, 0, 2, 5, '#3b2a20'); p(5, 0, 2, 2, '#f0c040'); p(2, 3, 3, 3, '#3b2a20');
      p(2, 3, 3, 2, '#f0c040'); p(1, 5, 2, 2, '#d9a066');
    },
    headphones: function (p) {
      p(1, 2, 6, 1, '#3b2a20'); p(0, 2, 2, 5, '#3b2a20'); p(6, 2, 2, 5, '#3b2a20');
      p(1, 3, 1, 3, '#5fa8d3'); p(6, 3, 1, 3, '#5fa8d3');
    },
    dumbbell: function (p) {
      p(1, 3, 2, 3, '#3b2a20'); p(5, 3, 2, 3, '#3b2a20'); p(3, 4, 2, 1, '#8a8f98');
      p(0, 2, 1, 5, '#c9503e'); p(7, 2, 1, 5, '#c9503e');
    },
    bulb: function (p) {
      p(2, 0, 4, 4, '#3b2a20'); p(3, 1, 2, 2, '#ffe66d'); p(2, 4, 4, 1, '#b98a4a');
      p(3, 5, 2, 2, '#8a8f98'); p(1, 1, 1, 1, '#fff3a8'); p(6, 1, 1, 1, '#fff3a8');
    },
    clapper: function (p) {
      p(1, 1, 6, 2, '#3b2a20'); p(1, 1, 6, 1, '#e6e2d6'); p(1, 3, 6, 4, '#3b2a20');
      p(2, 4, 4, 2, '#5a3a1e'); p(2, 1, 1, 1, '#3b2a20'); p(4, 1, 1, 1, '#3b2a20'); p(6, 1, 1, 1, '#3b2a20');
    },
    tv: function (p) {
      p(1, 2, 6, 4, '#3b2a20'); p(2, 3, 4, 2, '#9fe6ff'); p(3, 5, 2, 1, '#5a3a1e');
      p(3, 0, 1, 2, '#8a8f98'); p(5, 0, 1, 2, '#8a8f98');
    },
    football: function (p) {
      p(2, 1, 4, 6, '#3b2a20'); p(2, 2, 4, 4, '#fdf3d7'); p(3, 2, 2, 1, '#3b2a20');
      p(3, 4, 2, 1, '#3b2a20'); p(3, 6, 2, 1, '#3b2a20');
    },
    pillow: function (p) {
      p(1, 2, 6, 5, '#3b2a20'); p(1, 2, 6, 4, '#f6d88f'); p(2, 3, 4, 1, '#fff3c8');
      p(2, 5, 4, 1, '#d9a066');
    },
    dice: function (p) {
      p(1, 1, 6, 6, '#3b2a20'); p(2, 2, 4, 4, '#fdf3d7'); p(2, 2, 1, 1, '#3b2a20');
      p(5, 2, 1, 1, '#3b2a20'); p(3, 4, 2, 1, '#3b2a20'); p(2, 5, 1, 1, '#3b2a20');
    },
    trophy: function (p) {
      p(2, 0, 4, 4, '#3b2a20'); p(2, 1, 4, 2, '#f0c040'); p(1, 1, 1, 3, '#f0c040');
      p(6, 1, 1, 3, '#f0c040'); p(3, 4, 2, 2, '#b98a4a'); p(2, 6, 4, 1, '#5a3a1e');
    }
  };

  function drawIcon(ctx, name, x, y, size) {
    var fn = ICONS[name];
    if (!fn) return;
    var k = size / 8;
    function px(cx, cy, w, h, color) {
      ctx.fillStyle = color;
      ctx.fillRect(Math.round(x + cx * k), Math.round(y + cy * k), Math.max(1, Math.round(w * k)), Math.max(1, Math.round(h * k)));
    }
    fn(px, ctx);
  }

  function drawProp(ctx, av, x, y, u, opts) {
    var prop = av && av.prop;
    if (!prop) return;
    if (prop.sheet === 'char') {
      drawPart(ctx, [prop.col, prop.row], x, y, u, 1);
    } else if (prop.sheet === 'tiles' && A.tileSheetReady && A.tileSheet) {
      var size = (prop.name === '帐篷' ? 7 : 5) * u;
      ctx.drawImage(A.tileSheet, prop.col * 17, prop.row * 17, 16, 16,
        x + 10.5 * u, y + 8.5 * u, size, size);
    } else if (prop.sheet === 'custom') {
      drawIcon(ctx, prop.icon, x + 10 * u, y + 8 * u, 5 * u);
    }
  }

  function drawShadow(ctx, x, y, u) {
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,.25)';
    ctx.beginPath();
    ctx.ellipse(x + 8 * u, y + 15 * u, 5.4 * u, 1.8 * u, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function drawCharacter(ctx, av, x, y, u, opts) {
    opts = opts || {};
    drawShadow(ctx, x, y, u);
    if (opts.highlight) {
      ctx.save();
      ctx.globalAlpha = .5;
      ctx.fillStyle = '#ffe6a0';
      ctx.beginPath();
      ctx.ellipse(x + 8 * u, y + 15 * u, 7 * u, 2.6 * u, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    var bob = opts.bob || 0;
    if (opts.frame) bob -= Math.max(1, u * .35);
    var yy = y + bob;
    var ox0 = x;

    // 行走时左右翻转
    ctx.save();
    if (opts.flip) {
      ctx.translate(x + 16 * u, 0);
      ctx.scale(-1, 1);
      x = 0;
    }
    if (opts.flip) { /* x already local */ }

    var sil = silhouette(av);
    if (sil) {
      ctx.globalAlpha = .5;
      var o = Math.max(1, u);
      ctx.drawImage(sil, x - o, yy, 16 * u, 16 * u);
      ctx.drawImage(sil, x + o, yy, 16 * u, 16 * u);
      ctx.drawImage(sil, x, yy - o, 16 * u, 16 * u);
      ctx.drawImage(sil, x, yy + o, 16 * u, 16 * u);
      ctx.globalAlpha = 1;
    } else {
      // 素材未就绪的占位
      ctx.fillStyle = 'rgba(58,40,24,.35)';
      ctx.fillRect(x + 4 * u, yy + 2 * u, 8 * u, 13 * u);
    }

    eachPart(av, function (p) { drawPart(ctx, p, x, yy, u, 1); });
    if (!opts.noProp) drawProp(ctx, av, x, yy, u, opts);

    // 眨眼：每 4 秒左右闭眼 120ms
    if (charReady && (Date.now() % 4300) < 130) {
      ctx.fillStyle = '#3a2a1f';
      ctx.fillRect(Math.round(x + 5 * u), Math.round(yy + 5.4 * u), Math.max(1, Math.round(2 * u)), Math.max(1, Math.round(.5 * u)));
      ctx.fillRect(Math.round(x + 9 * u), Math.round(yy + 5.4 * u), Math.max(1, Math.round(2 * u)), Math.max(1, Math.round(.5 * u)));
    }
    ctx.restore();

    if (opts.question) {
      var qs = 4.5 * u, qx = ox0 + 12 * u, qy = yy - 2.4 * u;
      ctx.fillStyle = '#fdf3d7';
      ctx.fillRect(qx, qy, qs, qs * 1.16);
      ctx.fillStyle = '#5a3a1e';
      ctx.fillRect(qx, qy, qs, Math.max(1, u * .6));
      ctx.fillRect(qx, qy + qs * 1.16 - Math.max(1, u * .6), qs, Math.max(1, u * .6));
      ctx.fillRect(qx, qy, Math.max(1, u * .6), qs * 1.16);
      ctx.fillRect(qx + qs - Math.max(1, u * .6), qy, Math.max(1, u * .6), qs * 1.16);
      ctx.fillStyle = '#8b5a2b';
      ctx.fillRect(qx + qs * .3, qy + qs * .2, qs * .35, Math.max(1, u * .6));
      ctx.fillRect(qx + qs * .52, qy + qs * .36, Math.max(1, u * .6), qs * .32);
      ctx.fillRect(qx + qs * .52, qy + qs * .82, Math.max(1, u * .6), Math.max(1, u * .6));
    }
    if (opts.mayor) {
      ctx.fillStyle = '#f0c040';
      var sx = ox0 + 7 * u, sy = yy - 4 * u;
      ctx.fillRect(sx + 1 * u, sy, 2 * u, 1 * u);
      ctx.fillRect(sx, sy + 1 * u, 4 * u, 1 * u);
      ctx.fillRect(sx, sy + 2 * u, 1 * u, 1 * u);
      ctx.fillRect(sx + 3 * u, sy + 2 * u, 1 * u, 1 * u);
    }
  }

  A.drawVillager = function (ctx, x, y, u, av, opts) {
    drawCharacter(ctx, av || {}, x, y, u, opts || {});
  };

  function themeColor(member) {
    var sc = member && member.scene && PT.sceneById ? PT.sceneById(member.scene) : null;
    return (sc && sc.color) || '#8cc152';
  }

  A.drawAvatar = function (ctx, w, h, member, opts) {
    opts = opts || {};
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, w, h);
    var theme = themeColor(member);
    var headOnly = w < 100;

    // 纸面
    var g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, '#fff8e3');
    g.addColorStop(.62, '#f6e6bf');
    g.addColorStop(1, '#e7cf9c');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    // 主题光晕
    var rg = ctx.createRadialGradient(w * .5, h * .48, 2, w * .5, h * .48, w * .62);
    rg.addColorStop(0, 'rgba(255,248,220,.82)');
    rg.addColorStop(.55, 'rgba(255,248,220,.28)');
    rg.addColorStop(1, 'rgba(255,248,220,0)');
    ctx.fillStyle = rg;
    ctx.fillRect(0, 0, w, h);
    ctx.globalAlpha = .13;
    ctx.fillStyle = theme;
    ctx.beginPath();
    ctx.ellipse(w * .5, h * .48, w * .44, h * .40, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
    // 底部主题带
    ctx.globalAlpha = .18;
    ctx.fillStyle = theme;
    ctx.fillRect(0, h * .84, w, h * .16);
    ctx.globalAlpha = 1;
    ctx.fillStyle = theme;
    ctx.fillRect(0, h * .84, w, Math.max(2, h * .012));
    // 几颗像素星
    for (var si = 0; si < 5; si++) {
      var sx2 = (si * 37 % 90 + 7) / 100 * w;
      var sy2 = (si * 53 % 60 + 6) / 100 * h;
      ctx.fillStyle = si % 2 ? 'rgba(255,248,220,.8)' : 'rgba(90,58,30,.18)';
      ctx.fillRect(Math.round(sx2), Math.round(sy2), 2, 2);
    }

    var u, x, y, cropRows;
    if (headOnly) {
      cropRows = 13;
      u = Math.max(2, Math.floor(Math.min(w * .92 / 16, h * .86 / 13)));
      x = Math.round((w - 16 * u) / 2);
      y = Math.round(h * .05 - u * .2);
    } else {
      cropRows = 16;
      u = Math.max(2, Math.floor(Math.min(w * .88 / 16, h * .72 / 16)));
      x = Math.round((w - 16 * u) / 2);
      y = Math.round((h - 16 * u) / 2 + h * .02);
    }
    // 落在纸上的影
    ctx.fillStyle = 'rgba(0,0,0,.16)';
    ctx.beginPath();
    ctx.ellipse(w / 2, y + cropRows * u * .94, 16 * u * .28, Math.max(2, u * 1.2), 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, w, Math.min(h, y + cropRows * u + u * .6));
    ctx.clip();
    // 头像不画手持物，避免大色块挡住衣服
    drawCharacter(ctx, member.avatar || {}, x, y, u, { mayor: !!member.isAdmin, noProp: true, bob: 0 });
    ctx.restore();

    // 小道具放在右下角
    var prop = member.avatar && member.avatar.prop;
    if (prop && !headOnly) {
      var pu = Math.max(1, Math.round(u * .52));
      var px = x + 16 * u - 5 * pu;
      var py = y + cropRows * u - 4 * pu;
      ctx.save();
      drawProp(ctx, member.avatar, px, py, pu, {});
      ctx.restore();
    }

    // 角钉
    ctx.fillStyle = 'rgba(90,58,30,.38)';
    ctx.fillRect(3, 3, 3, 3); ctx.fillRect(w - 6, 3, 3, 3);
    ctx.fillRect(3, h - 6, 3, 3); ctx.fillRect(w - 6, h - 6, 3, 3);
  };


  A.drawIntro = function (canvas) {
    if (PT.world && PT.world.drawIntroScene) {
      PT.world.drawIntroScene(canvas);
      return;
    }
    var ctx = canvas.getContext('2d');
    var w = canvas.width = window.innerWidth, h = canvas.height = Math.max(1, window.innerHeight);
    var g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, '#28324a'); g.addColorStop(.55, '#6b5b6e'); g.addColorStop(1, '#2d3b2a');
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
  };

  window.PT = PT;
})();
