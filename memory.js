/* ============================================================
   记脸挑战 —— 6 张配泼睿照片的记忆翻牌
   ============================================================ */
(function () {
  'use strict';

  var grid = document.getElementById('memoryGrid');
  if (!grid) return;

  var movesEl = document.getElementById('moves');
  var clockEl = document.getElementById('clock');
  var bestEl = document.getElementById('best');
  var pairsEl = document.getElementById('pairs');
  var overlay = document.getElementById('memoryOverlay');
  var resetBtn = document.getElementById('resetBtn');

  var PHOTOS = [
    { id: 'face', src: 'assets/face.jpg', label: '被迫营业' },
    { id: 'sleep', src: 'assets/sleep.jpg', label: '本源蓝毛巾' },
    { id: 'yare', src: 'assets/yare.jpg', label: '呀嘞呀嘞' },
    { id: 'webcam', src: 'assets/webcam.jpg', label: '深夜网课' },
    { id: 'prof', src: 'assets/prof.jpg', label: '教授形态' },
    { id: 'brawl', src: 'assets/brawl.jpg', label: '三人对峙' }
  ];

  var best = 0;
  try { best = parseInt(localStorage.getItem('ppr-memory-best') || '0', 10) || 0; } catch (e) { best = 0; }

  var state = {
    open: [], lock: false, moves: 0, matched: 0,
    over: false, started: false, startAt: 0, tick: null
  };

  function beep(f, d, t) { if (window.pprBeep) window.pprBeep(f, d, t); }

  function build() {
    var deck = [];
    for (var i = 0; i < PHOTOS.length; i++) { deck.push(PHOTOS[i]); deck.push(PHOTOS[i]); }
    for (var s = deck.length - 1; s > 0; s--) {
      var j = Math.floor(Math.random() * (s + 1));
      var tmp = deck[s];
      deck[s] = deck[j];
      deck[j] = tmp;
    }
    grid.innerHTML = '';
    for (var k = 0; k < deck.length; k++) {
      (function (photo) {
        var b = document.createElement('button');
        b.className = 'mcard';
        b.type = 'button';
        b.setAttribute('data-id', photo.id);
        b.setAttribute('aria-label', '未翻开的牌');
        b.innerHTML = '<span class="inner"><span class="mb">配</span>' +
          '<span class="mf"><img src="' + photo.src + '" alt="' + photo.label + '"></span></span>';
        b.addEventListener('click', function () { flip(b); });
        grid.appendChild(b);
      })(deck[k]);
    }
  }

  function updateHud() {
    if (movesEl) movesEl.textContent = String(state.moves);
    if (pairsEl) pairsEl.textContent = String(state.matched);
    if (bestEl) bestEl.textContent = best > 0 ? String(best) : '—';
  }

  function startTimer() {
    state.started = true;
    state.startAt = Date.now();
    state.tick = setInterval(function () {
      if (!clockEl) return;
      clockEl.textContent = ((Date.now() - state.startAt) / 1000).toFixed(1);
    }, 100);
  }

  function flip(btn) {
    if (state.lock || state.over) return;
    if (btn.classList.contains('flip') || btn.classList.contains('matched')) return;
    if (!state.started) startTimer();
    btn.classList.add('flip');
    state.open.push(btn);

    if (state.open.length < 2) {
      beep(760, 0.04, 'triangle');
      return;
    }

    state.moves += 1;
    updateHud();
    var a = state.open[0];
    var b = state.open[1];
    state.lock = true;

    if (a.getAttribute('data-id') === b.getAttribute('data-id')) {
      setTimeout(function () {
        a.classList.add('matched');
        b.classList.add('matched');
        state.matched += 1;
        state.open = [];
        state.lock = false;
        updateHud();
        beep(980, 0.06, 'triangle');
        if (state.matched === PHOTOS.length) finish();
      }, 280);
    } else {
      beep(300, 0.05, 'square');
      setTimeout(function () {
        a.classList.remove('flip');
        b.classList.remove('flip');
        state.open = [];
        state.lock = false;
      }, 760);
    }
  }

  function rankOf(moves) {
    if (moves <= 8) return '记忆大师（你盯他很久了吧）';
    if (moves <= 12) return '宿舍级人形监控';
    if (moves <= 18) return '正常人类';
    return '脸盲晚期';
  }

  function finish() {
    state.over = true;
    clearInterval(state.tick);
    var secs = ((Date.now() - state.startAt) / 1000).toFixed(1);
    if (best === 0 || state.moves < best) {
      best = state.moves;
      try { localStorage.setItem('ppr-memory-best', String(best)); } catch (e) { /* ignore */ }
    }
    updateHud();
    overlay.innerHTML = '<div class="ov-card">' +
      '<img class="ov-photo" src="assets/face.jpg" alt="配泼睿">' +
      '<h3>🎉 全部配对</h3>' +
      '<p>步数 <b>' + state.moves + '</b>，用时 <b>' + secs + '</b> 秒。<br>' +
      '称号：<b>' + rankOf(state.moves) + '</b><br>历史最佳：' + best + ' 步</p>' +
      '<div class="ov-btns"><button class="btn primary" data-act="again" type="button">再洗一次</button>' +
      '<a class="btn ghost" href="arcade.html">回游戏厅</a></div></div>';
    overlay.hidden = false;
    beep(660, 0.08, 'square');
    setTimeout(function () { beep(880, 0.1, 'square'); }, 120);
    setTimeout(function () { beep(1220, 0.16, 'square'); }, 250);
  }

  function reset() {
    clearInterval(state.tick);
    state.open = [];
    state.lock = false;
    state.moves = 0;
    state.matched = 0;
    state.over = false;
    state.started = false;
    state.startAt = 0;
    if (clockEl) clockEl.textContent = '0.0';
    overlay.hidden = true;
    build();
    updateHud();
    beep(520, 0.06, 'triangle');
  }

  if (overlay) {
    overlay.addEventListener('click', function (ev) {
      var btn = ev.target.closest ? ev.target.closest('[data-act]') : null;
      if (btn && btn.getAttribute('data-act') === 'again') reset();
    });
  }
  if (resetBtn) resetBtn.addEventListener('click', reset);

  build();
  updateHud();

  /* 演示：翻好三对，方便截图/预览 */
  if (location.search.indexOf('demo') >= 0) {
    var all = grid.querySelectorAll('.mcard');
    if (all.length >= 12) {
      all[0].classList.add('flip', 'matched');
      all[7].classList.add('flip', 'matched');
      all[2].classList.add('flip');
      all[9].classList.add('flip');
      state.moves = 3;
      state.matched = 1;
      state.started = true;
      state.startAt = Date.now() - 12400;
      updateHud();
      if (clockEl) clockEl.textContent = '12.4';
    }
  }
})();
