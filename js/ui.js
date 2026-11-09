/* 界面：开场、对话、名片、名册、公告栏、任务板、Toast、音乐 */
(function () {
  'use strict';
  var PT = window.PT;
  var U = {};

  var els = {};
  var introOpen = true;
  var introTimers = [];
  var introProgressTimer = null;
  var toastTimer = null;
  var sceneToastTimer = null;
  var lastFocus = null;
  var dialog = { member: null, pages: [], page: 0, chars: 0, typing: false, timer: null };
  var rosterFilter = 'all';
  var rosterQuery = '';

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
  U.esc = esc;

  function $(id) { return document.getElementById(id); }

  function has(v) { return v !== null && v !== undefined && String(v).trim() !== ''; }

  function sceneOf(id) { return PT.sceneById(id); }

  function memberByName(name) {
    if (!name) return null;
    return PT.getMember(String(name).trim());
  }

  function renderNameLinks(name) {
    var raw = String(name == null ? '' : name);
    var parts = raw.split(/\s*\/\s*/);
    var out = [];
    for (var i = 0; i < parts.length; i++) {
      var p = parts[i].trim();
      if (!p) continue;
      var m = memberByName(p);
      if (m) out.push('<button type="button" class="name-link" data-member="' + esc(m.name) + '">' + esc(p) + '</button>');
      else out.push('<span>' + esc(p) + '</span>');
    }
    return out.join('<span class="name-slash"> / </span>');
  }

  function syncLock() {
    var anyModal = false;
    var layers = document.querySelectorAll('.modal-layer.is-open');
    anyModal = layers.length > 0;
    var sceneOpen = els.sceneView && els.sceneView.classList.contains('is-open');
    document.body.classList.toggle('is-locked', introOpen || anyModal || !!sceneOpen);
  }

  function openLayer(layer) {
    if (!layer) return;
    var current = document.activeElement;
    if (current && current !== document.body) lastFocus = current;
    layer.classList.add('is-open');
    layer.setAttribute('aria-hidden', 'false');
    var closeBtn = layer.querySelector('.modal-close');
    setTimeout(function () {
      var search = layer.querySelector('input[type="search"]');
      if (search) search.focus();
      else if (closeBtn) closeBtn.focus();
    }, 30);
    syncLock();
  }

  function closeLayer(layer) {
    if (!layer) return;
    layer.classList.remove('is-open');
    layer.setAttribute('aria-hidden', 'true');
    if (lastFocus && document.contains(lastFocus) && !otherLayerOpen(layer)) {
      try { lastFocus.focus({ preventScroll: true }); } catch (e) { }
    }
    syncLock();
  }

  function otherLayerOpen(except) {
    var layers = document.querySelectorAll('.modal-layer.is-open');
    for (var i = 0; i < layers.length; i++) if (layers[i] !== except) return true;
    return false;
  }

  /* ── 团队三卡 ─────────────────────────────────────────── */
  function renderTeamCards() {
    var host = $('teamCards');
    if (!host) return;
    var accents = ['#6aa84f', '#c8873a', '#5fa8d3'];
    var labels = ['我们像', '我们不一样在', '我们合起来能'];
    var html = '';
    PT.data.team.portrait.forEach(function (line, i) {
      var idx = line.indexOf('：');
      var body = idx >= 0 ? line.slice(idx + 1) : line;
      html += '<article class="team-card" data-index="0' + (i + 1) + '" style="--accent:' + accents[i] + '">' +
        '<h3>0' + (i + 1) + ' · ' + esc(labels[i] || '') + '</h3>' +
        '<p>' + esc(body) + '</p>' +
        '</article>';
    });
    host.innerHTML = html;
  }

  /* ── 公告栏 ───────────────────────────────────────────── */
  function collectPraise() {
    var rows = [];
    var seen = {};
    PT.allMembers.forEach(function (target) {
      (target.praisedBy || []).forEach(function (p) {
        if (!p || !p.name) return;
        var text = has(p.text) ? p.text : '（未记录具体内容）';
        var key = p.name + '>' + target.name + '|' + text;
        if (seen[key]) return;
        seen[key] = true;
        rows.push({ from: p.name, to: target.name, text: text });
      });
    });
    return rows;
  }

  function renderBoard() {
    var team = PT.data.team;
    $('portraitLines').innerHTML = team.portrait.map(function (p) { return '<p>' + esc(p) + '</p>'; }).join('');
    $('ruleList').innerHTML = team.rules.map(function (r) { return '<li>' + esc(r) + '</li>'; }).join('');
    var words = [];
    PT.members.forEach(function (m) {
      if (has(m.word) && words.indexOf(m.word) < 0) words.push(m.word);
    });
    $('wordCloud').innerHTML = words.map(function (w) { return '<span class="word-chip">' + esc(w) + '</span>'; }).join('') ||
      '<span class="word-chip">还在收集</span>';
    $('wordFooter').textContent = team.words.join(' · ');

    var rows = collectPraise();
    $('praiseCount').textContent = rows.length + ' 条';
    $('praiseWall').innerHTML = rows.map(function (r) {
      return '<div class="praise-item">' +
        '<span class="praise-from">' + esc(r.from) + '</span> <span class="arrow">→</span> ' +
        '<span class="praise-to">' + esc(r.to) + '</span>' +
        '<div class="praise-text">' + esc(r.text) + '</div>' +
        '</div>';
    }).join('') || '<p class="muted">还没有贴上的夸奖。</p>';
  }

  /* ── 任务板 ───────────────────────────────────────────── */
  var TASKS = [
    { scene: 'workshop', need: '想做 AI 小工具 / 原型', hint: '去工坊，和动手的人碰一碰' },
    { scene: 'library', need: '想找学习 / 考试 / 文学搭子', hint: '去图书馆，安静地卷一会儿' },
    { scene: 'plaza', need: '想组织活动、聊创业', hint: '去广场，把人和想法凑一桌' },
    { scene: 'lakeside', need: '想徒步、旅行、拍照', hint: '去山野湖畔，风里见' },
    { scene: 'tavern', need: '想唱歌跳舞健身', hint: '去酒馆舞台，先动起来' },
    { scene: 'cottage', need: '想聊聊心事、公益、追剧', hint: '去树下小屋，慢慢说' }
  ];

  function renderTasks() {
    var host = $('taskList');
    if (!host) return;
    host.innerHTML = TASKS.map(function (t) {
      var scene = sceneOf(t.scene);
      var members = PT.byScene(t.scene).filter(function (m) { return has(m.findMeFor); });
      var who = members.map(function (m) {
        return '<span><b>' + esc(m.name) + '</b><em>' + esc(m.findMeFor) + '</em></span>';
      }).join('');
      if (!who) who = '<span><b>来打个招呼</b><em>这几位村民在场景里等你。</em></span>';
      return '<button type="button" class="task-card" data-scene="' + esc(t.scene) + '" aria-label="' + esc(t.need + '，前往' + scene.name) + '">' +
        '<span class="task-icon" aria-hidden="true">' + scene.icon + '</span>' +
        '<span class="task-main"><strong>' + esc(t.need) + '</strong><small>' + esc(t.hint) + ' · ' + scene.name + '</small>' +
        '<span class="task-who">' + who + '</span></span>' +
        '<span class="task-arrow" aria-hidden="true">→</span>' +
        '</button>';
    }).join('');
  }

  /* ── 名册 ─────────────────────────────────────────────── */
  function buildFilters() {
    var host = $('rosterFilters');
    var chips = [{ id: 'all', name: '全部' }].concat(PT.data.scenes.map(function (s) { return { id: s.id, name: s.icon + ' ' + s.name }; }));
    host.innerHTML = chips.map(function (c) {
      return '<button type="button" class="filter-chip' + (rosterFilter === c.id ? ' is-on' : '') + '" data-filter="' + c.id + '">' + esc(c.name) + '</button>';
    }).join('');
  }

  function renderRoster() {
    var host = $('rosterGrid');
    if (!host) return;
    var q = rosterQuery.trim().toLowerCase();
    var list = PT.allMembers.filter(function (m) {
      if (rosterFilter !== 'all' && m.scene !== rosterFilter) return false;
      if (!q) return true;
      return (m.name + ' ' + (m.realName || '') + ' ' + (m.title || '')).toLowerCase().indexOf(q) >= 0;
    });
    $('rosterCount').textContent = list.length;
    $('rosterEmpty').hidden = list.length > 0;
    host.innerHTML = list.map(function (m) {
      var scene = sceneOf(m.scene);
      return '<button type="button" class="roster-card' + (m.isAdmin ? ' is-admin' : '') + '" data-member="' + esc(m.name) + '" aria-label="' + esc(m.name + '，' + scene.name + '，打开对话') + '">' +
        '<span class="roster-avatar"><canvas width="60" height="74" aria-hidden="true"></canvas></span>' +
        '<span class="roster-info"><strong>' + esc(m.name) + '</strong>' +
        '<small>' + esc(m.room) + ' 号房 · ' + esc(m.title || '') + '</small>' +
        '<span class="roster-scene">' + scene.icon + ' ' + esc(scene.name) + (m.isAdmin ? ' · 镇长' : '') + '</span></span>' +
        '</button>';
    }).join('');
    var canvases = host.querySelectorAll('.roster-avatar canvas');
    for (var i = 0; i < canvases.length; i++) {
      var m2 = memberByName(list[i].name);
      if (m2) PT.art.drawAvatar(canvases[i].getContext('2d'), 60, 74, m2, {});
    }
  }

  function openRoster() {
    buildFilters();
    renderRoster();
    openLayer($('rosterModal'));
  }

  /* ── 名片 ─────────────────────────────────────────────── */
  function field(label, value, wide) {
    if (!has(value)) return '';
    var cls = 'card-field' + (wide || String(value).length > 28 ? ' is-wide' : '');
    return '<div class="' + cls + '"><h3>' + esc(label) + '</h3><p>' + esc(value) + '</p></div>';
  }

  function praiseList(items, mode) {
    if (!items || !items.length) {
      return '<li class="muted">暂时没有记录。</li>';
    }
    return items.map(function (p) {
      var text = has(p.text) ? p.text : '（未记录具体内容）';
      var namePart = mode === 'received'
        ? renderNameLinks(p.name)
        : renderNameLinks(p.name);
      return '<li>' + namePart + '<span class="praise-colon">：</span><span class="praise-quote">' + esc(text) + '</span></li>';
    }).join('');
  }

  function openCard(member) {
    if (!member) return;
    var isAdmin = !!member.isAdmin;
    var kicker = isAdmin ? '十一楼小镇 · 镇长' : '十一楼小镇 · 村民';
    $('cardKicker').textContent = kicker;
    $('cardName').textContent = member.name;
    $('cardTitle').textContent = member.title || '';
    $('cardRoomStamp').textContent = member.room + ' 号房';
    if (has(member.word)) {
      $('cardWord').hidden = false;
      $('cardWord').textContent = '代表词 · ' + member.word;
    } else {
      $('cardWord').hidden = true;
      $('cardWord').textContent = '';
    }
    var fields = '';
    if (isAdmin) {
      fields += field('身份', member.role + (member.realName ? ' · ' + member.realName : ''), true);
    }
    fields += field('标签', member.tag);
    fields += field('最近在忙', member.busy);
    fields += field('最近很喜欢', member.likes);
    fields += field('一件事', member.story);
    fields += field('为什么来', member.why);
    fields += field('可以来找我', member.findMeFor);
    fields += field('想敲的门', member.lookingFor);
    if (!fields) {
      fields = '<div class="card-field is-wide is-empty"><h3>名片状态</h3><p>' +
        (member.filled ? '这张名片还在慢慢写。' : '名片还在路上～等我登记好，再来聊聊天吧。') +
        '</p></div>';
    }
    $('cardFields').innerHTML = fields;

    var photos = member.photoCaptions || [];
    if (photos.length) {
      $('cardPhotosSection').hidden = false;
      $('cardPhotos').innerHTML = photos.map(function (p) {
        return '<div class="photo-story">' + esc(p) + '</div>';
      }).join('');
    } else {
      $('cardPhotosSection').hidden = true;
      $('cardPhotos').innerHTML = '';
    }

    $('cardReceived').innerHTML = praiseList(member.praisedBy || [], 'received');
    $('cardGiven').innerHTML = praiseList(member.praised || [], 'given');
    $('cardReceivedSection').hidden = false;
    $('cardGivenSection').hidden = false;

    $('cardFindBtn').dataset.member = member.name;
    $('cardFindBtn').textContent = isAdmin ? '回到镇长身边 →' : '去 Ta 的场景 →';
    // 重新绘制头像
    var canvas = $('cardAvatar');
    var ctx = canvas.getContext('2d');
    PT.art.drawAvatar(ctx, 168, 196, member, {});
    openLayer($('cardModal'));
  }

  function closeCard() {
    closeLayer($('cardModal'));
  }

  /* ── 对话 ─────────────────────────────────────────────── */
  function clearDialogTimer() {
    if (dialog.timer) { clearInterval(dialog.timer); dialog.timer = null; }
  }

  function updatePageDots() {
    var host = $('dialogPages');
    var html = '';
    for (var i = 0; i < dialog.pages.length; i++) {
      html += '<i class="' + (i === dialog.page ? 'is-on' : '') + '"></i>';
    }
    host.innerHTML = html;
  }

  function setDialogTyping(on) {
    dialog.typing = on;
    $('dialogText').classList.toggle('is-done', !on);
    var isLast = dialog.page === dialog.pages.length - 1;
    if (!on) {
      // 打字结束：非最后一页常驻显示「点击继续」，最后一页改为显示名片按钮
      $('dialogNext').classList.toggle('is-off', isLast);
      if (isLast) $('openCardBtn').hidden = false;
    } else {
      // 打字中：先隐藏提示，等这一页说完再出现
      $('dialogNext').classList.add('is-off');
      $('openCardBtn').hidden = true;
    }
  }

  function typePage() {
    clearDialogTimer();
    var full = dialog.pages[dialog.page] || '';
    dialog.chars = 0;
    $('dialogText').textContent = '';
    $('openCardBtn').hidden = true;
    setDialogTyping(true);
    var speed = 26;
    dialog.timer = setInterval(function () {
      dialog.chars++;
      $('dialogText').textContent = full.slice(0, dialog.chars);
      if (dialog.chars >= full.length) {
        clearDialogTimer();
        setDialogTyping(false);
        $('dialogNext').textContent = dialog.page === dialog.pages.length - 1 ? '看看 Ta 的名片 ▸' : '点击继续 ▸';
        if (dialog.page === dialog.pages.length - 1) $('dialogNext').classList.add('is-off');
      }
    }, speed);
  }

  function showPage() {
    updatePageDots();
    $('dialogNext').textContent = '点击继续 ▸';
    typePage();
  }

  function startDialog(member) {
    if (!member) return;
    if ($('cardModal').classList.contains('is-open')) closeCard();
    dialog.member = member;
    dialog.pages = (member.lines && member.lines.length) ? member.lines.slice() : ['……'];
    dialog.page = 0;
    $('dialogName').textContent = member.name;
    $('dialogTitle').textContent = member.title || '';
    $('dialogRoom').textContent = member.room + ' 号房' + (member.isAdmin ? ' · 镇长' : '');
    PT.art.drawAvatar($('dialogAvatar').getContext('2d'), 120, 144, member, {});
    updatePageDots();
    $('dialog').classList.add('is-open');
    $('dialog').setAttribute('aria-hidden', 'false');
    if (els.sceneView) els.sceneView.classList.add('has-dialog');
    showPage();
  }

  function finishTyping() {
    if (!dialog.typing) return false;
    clearDialogTimer();
    $('dialogText').textContent = dialog.pages[dialog.page] || '';
    dialog.chars = (dialog.pages[dialog.page] || '').length;
    setDialogTyping(false);
    $('dialogNext').textContent = dialog.page === dialog.pages.length - 1 ? '看看 Ta 的名片 ▸' : '点击继续 ▸';
    if (dialog.page === dialog.pages.length - 1) $('dialogNext').classList.add('is-off');
    return true;
  }

  function advanceDialog() {
    if (!$('dialog').classList.contains('is-open')) return;
    if (finishTyping()) return;
    if (dialog.page < dialog.pages.length - 1) {
      dialog.page++;
      updatePageDots();
      showPage();
    }
  }

  function closeDialog() {
    clearDialogTimer();
    dialog.typing = false;
    dialog.member = null;
    $('dialog').classList.remove('is-open');
    $('dialog').setAttribute('aria-hidden', 'true');
    $('openCardBtn').hidden = true;
    if (els.sceneView) els.sceneView.classList.remove('has-dialog');
  }

  /* ── 开场 ─────────────────────────────────────────────── */
  function introLine() {
    var D = window.TOWN_DATA, n = D.members.length, k = D.scenes.length;
    var nameEl = $('introName'); if (nameEl) nameEl.textContent = D.admin.name;
    return '欢迎来到' + D.meta.title + '，我是镇长' + D.admin.name + '。\n' + n + ' 位村民住在 ' + k + ' 个角落，点任何人聊聊吧～';
  }

  function clearIntroTimers() {
    introTimers.forEach(function (t) { clearTimeout(t); });
    introTimers = [];
    if (introProgressTimer) { clearInterval(introProgressTimer); introProgressTimer = null; }
  }

  function closeIntro() {
    if (!introOpen) return;
    introOpen = false;
    clearIntroTimers();
    var intro = $('intro');
    intro.classList.add('is-closing');
    setTimeout(function () {
      intro.hidden = true;
      syncLock();
      var first = document.querySelector('.zone-label');
      if (first) { try { first.focus({ preventScroll: true }); } catch (e) { } }
    }, 520);
    syncLock();
  }

  function startIntro() {
    var intro = $('intro');
    if (!intro) return;
    introOpen = true;
    syncLock();
    PT.art.drawIntro($('introCanvas'));
    PT.art.drawAvatar($('introAvatar').getContext('2d'), 96, 112, PT.admin, {});
    PT.art.onReady(function () {
      if (!introOpen) return;
      PT.art.drawIntro($('introCanvas'));
      PT.art.drawAvatar($('introAvatar').getContext('2d'), 96, 112, PT.admin, {});
    });
    var text = introLine();
    var typeAt = 760;
    introTimers.push(setTimeout(function () {
      $('introDialog').classList.add('is-on');
      var i = 0;
      var timer = setInterval(function () {
        i++;
        $('introText').textContent = text.slice(0, i);
        if (i >= text.length) clearInterval(timer);
      }, 22);
      introTimers.push(timer);
    }, typeAt));
    var total = 4800;
    var started = performance.now();
    introProgressTimer = setInterval(function () {
      var p = Math.min(1, (performance.now() - started) / total);
      $('introProgress').style.width = (p * 100).toFixed(1) + '%';
    }, 80);
    introTimers.push(setTimeout(closeIntro, total));
    intro.addEventListener('click', function (e) {
      if (e.target.closest('button')) return;
      closeIntro();
    });
    $('skipIntroBtn').addEventListener('click', closeIntro);
    $('enterTownBtn').addEventListener('click', closeIntro);
  }

  /* ── 音乐 ─────────────────────────────────────────────── */
  function initMusic() {
    var btn = $('musicToggle');
    if (!btn) return;
    btn.addEventListener('click', function () {
      var on = PT.audio.toggle();
      btn.setAttribute('aria-pressed', on ? 'true' : 'false');
      btn.setAttribute('aria-label', on ? '关闭背景音乐' : '开启背景音乐');
      $('musicLabel').textContent = on ? '音乐开' : '音乐关';
      if (!on && !PT.audio.isPlaying()) {
        // 首次开启失败（浏览器不支持）时提示
        if (!window.AudioContext && !window.webkitAudioContext) showToast('这个浏览器不支持音频合成。');
      }
    });
  }

  /* ── Toast ────────────────────────────────────────────── */
  function showToast(msg) {
    var el = $('toast');
    if (!el) return;
    el.textContent = msg;
    el.classList.add('is-on');
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { el.classList.remove('is-on'); }, 2300);
  }

  function showSceneToast(msg) {
    var el = $('sceneToast');
    if (!el) return;
    el.textContent = msg;
    el.classList.add('is-on');
    if (sceneToastTimer) clearTimeout(sceneToastTimer);
    sceneToastTimer = setTimeout(function () { el.classList.remove('is-on'); }, 2000);
  }

  /* ── 跳转 ─────────────────────────────────────────────── */
  function jumpToMember(name, opts) {
    var m = memberByName(name);
    if (!m) return;
    closeCard();
    closeDialog();
    closeAllModals();
    PT.app.goToMember(m, opts || { dialog: true });
  }

  function closeAllModals() {
    var layers = document.querySelectorAll('.modal-layer.is-open');
    for (var i = 0; i < layers.length; i++) {
      layers[i].classList.remove('is-open');
      layers[i].setAttribute('aria-hidden', 'true');
    }
    syncLock();
  }

  /* ── 事件 ─────────────────────────────────────────────── */
  function bindEvents() {
    document.addEventListener('click', function (e) {
      var open = e.target.closest('[data-open]');
      if (open) {
        var name = open.getAttribute('data-open');
        if (name === 'roster') openRoster();
        else if (name === 'board') openLayer($('boardModal'));
        else if (name === 'tasks') openLayer($('tasksModal'));
        return;
      }
      var closeBtn = e.target.closest('[data-close]');
      if (closeBtn) {
        var layer = $(closeBtn.getAttribute('data-close'));
        closeLayer(layer);
        return;
      }
      var layer = e.target.closest('.modal-layer');
      if (layer && e.target === layer) {
        closeLayer(layer);
        return;
      }
      var rosterCard = e.target.closest('.roster-card');
      if (rosterCard) {
        jumpToMember(rosterCard.getAttribute('data-member'), { dialog: true });
        return;
      }
      var task = e.target.closest('.task-card');
      if (task) {
        var sid = task.getAttribute('data-scene');
        closeAllModals();
        PT.app.enterScene(sid, { fromTask: true });
        return;
      }
      var nameLink = e.target.closest('.name-link');
      if (nameLink) {
        e.preventDefault();
        jumpToMember(nameLink.getAttribute('data-member'), { dialog: true });
        return;
      }
      var findBtn = e.target.closest('#cardFindBtn');
      if (findBtn) {
        jumpToMember(findBtn.getAttribute('data-member'), { dialog: true });
        return;
      }
      var chip = e.target.closest('.filter-chip');
      if (chip) {
        rosterFilter = chip.getAttribute('data-filter');
        buildFilters();
        renderRoster();
        return;
      }
    });

    $('rosterSearch').addEventListener('input', function (e) {
      rosterQuery = e.target.value;
      renderRoster();
    });

    $('closeDialogBtn').addEventListener('click', function (e) {
      e.stopPropagation();
      closeDialog();
    });
    $('dialogFrame').addEventListener('click', function (e) {
      if (e.target.closest('button')) return;
      advanceDialog();
    });
    $('openCardBtn').addEventListener('click', function (e) {
      e.stopPropagation();
      if (dialog.member) openCard(dialog.member);
    });

    document.addEventListener('keydown', function (e) {
      var tag = (e.target && e.target.tagName || '').toLowerCase();
      var typingInField = tag === 'input' || tag === 'textarea' || tag === 'select';
      if (e.key === 'Escape') {
        if ($('cardModal').classList.contains('is-open')) { closeCard(); return; }
        var modal = document.querySelector('.modal-layer.is-open');
        if (modal) { closeLayer(modal); return; }
        if ($('dialog').classList.contains('is-open')) { closeDialog(); return; }
        if (els.sceneView.classList.contains('is-open')) { PT.app.closeScene(); return; }
        if (introOpen) { closeIntro(); return; }
      }
      if (typingInField) return;
      if (e.key === ' ' || e.code === 'Space' || e.key === 'Enter') {
        if (introOpen) { e.preventDefault(); closeIntro(); return; }
        if ($('cardModal').classList.contains('is-open')) return;
        if (document.querySelector('.modal-layer.is-open')) return;
        if ($('dialog').classList.contains('is-open')) {
          var focusBtn = e.target && e.target.closest && e.target.closest('button, a');
          if (focusBtn && e.key !== 'Enter') return;
          e.preventDefault();
          advanceDialog();
        }
      }
    });

    window.addEventListener('resize', function () {
      if (introOpen) PT.art.drawIntro($('introCanvas'));
    });
  }

  U.init = function () {
    els.sceneView = $('sceneView');
    renderTeamCards();
    renderBoard();
    renderTasks();
    buildFilters();
    renderRoster();
    bindEvents();
    initMusic();
    startIntro();
  };
  U.startDialog = startDialog;
  U.closeDialog = closeDialog;
  U.advanceDialog = advanceDialog;
  U.openCard = openCard;
  U.closeCard = closeCard;
  U.openRoster = openRoster;
  U.closeLayer = closeLayer;
  U.openLayer = openLayer;
  U.closeAllModals = closeAllModals;
  U.jumpToMember = jumpToMember;
  U.showToast = showToast;
  U.showSceneToast = showSceneToast;
  U.syncLock = syncLock;
  U.setSceneOpen = function (on) {
    if (els.sceneView) els.sceneView.classList.toggle('has-dialog', false);
    syncLock();
  };
  U.isIntroOpen = function () { return introOpen; };
  U.closeIntro = closeIntro;

  window.PT = PT;
  PT.ui = U;
})();
