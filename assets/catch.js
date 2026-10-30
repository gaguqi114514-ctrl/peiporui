/* ============================================================
   接外卖 —— 45 秒反应力小游戏
   室友从楼上扔外卖，你用被子接住；拳套扣命，闹钟扣时间。
   ============================================================ */
(function () {
  'use strict';

  var canvas = document.getElementById('game');
  if (!canvas) return;
  var ctx = canvas.getContext('2d');

  var W = 900, H = 540;
  var DPR = Math.min(2, window.devicePixelRatio || 1);
  canvas.width = Math.round(W * DPR);
  canvas.height = Math.round(H * DPR);
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);

  var INK = '#241c16';
  var FONT = '"PingFang SC","Hiragino Sans GB","Microsoft YaHei",sans-serif';
  var EMOJI = '"Segoe UI Emoji","Apple Color Emoji","Noto Color Emoji",sans-serif';

  var PHOTO_FACE = new Image();
  PHOTO_FACE.src = 'assets/face.jpg';

  var timeEl = document.getElementById('timeLeft');
  var scoreEl = document.getElementById('score');
  var livesEl = document.getElementById('lives');
  var bestEl = document.getElementById('best');
  var overlayEl = document.getElementById('overlay');
  var startBtn = document.getElementById('startBtn');
  var restartBtn = document.getElementById('restartBtn');

  var best = 0;
  try { best = parseInt(localStorage.getItem('ppr-catch-best') || '0', 10) || 0; } catch (e) { best = 0; }

  var TYPES = [
    { key: 'noodle', ch: '🍜', value: 10, weight: 34, size: 44, good: true },
    { key: 'dumpling', ch: '🥟', value: 15, weight: 24, size: 44, good: true },
    { key: 'milktea', ch: '🥤', value: 20, weight: 15, size: 46, good: true },
    { key: 'star', ch: '⭐', value: 30, weight: 5, size: 42, good: true },
    { key: 'fist', ch: '🥊', value: 0, weight: 14, size: 48, good: false },
    { key: 'alarm', ch: '⏰', value: 0, weight: 8, size: 46, good: false }
  ];
  var TOTAL_W = 0;
  for (var ti = 0; ti < TYPES.length; ti++) TOTAL_W += TYPES[ti].weight;

  var player = { x: W / 2, y: 466, target: W / 2 };
  var state = {
    running: false, over: false, frozen: false,
    score: 0, lives: 3, time: 45, best: best,
    spawn: 0.5, elapsed: 0, items: [], fx: [], shake: 0, keys: {}
  };

  function beep(f, d, t) { if (window.pprBeep) window.pprBeep(f, d, t); }

  function rr(g, x, y, w, h, rad) {
    rad = Math.min(rad, h / 2, w / 2);
    g.beginPath();
    g.moveTo(x + rad, y);
    g.arcTo(x + w, y, x + w, y + h, rad);
    g.arcTo(x + w, y + h, x, y + h, rad);
    g.arcTo(x, y + h, x, y, rad);
    g.arcTo(x, y, x + w, y, rad);
    g.closePath();
  }
  function circ(g, x, y, rad) {
    g.beginPath();
    g.arc(x, y, Math.abs(rad), 0, Math.PI * 2);
  }
  function line(g, x1, y1, x2, y2) {
    g.beginPath();
    g.moveTo(x1, y1);
    g.lineTo(x2, y2);
    g.stroke();
  }

  /* ---------- 覆盖层 ---------- */
  function showOverlay(html) {
    overlayEl.innerHTML = '<div class="ov-card">' + html + '</div>';
    overlayEl.hidden = false;
  }
  function hideOverlay() { overlayEl.hidden = true; }

  var START_HTML = '<img class="ov-photo" src="assets/face.jpg" alt="配泼睿">' +
    '<h3>接外卖</h3>' +
    '<p>室友把外卖从楼上扔下来，你用被子接住。<br>' +
    '🍜 +10　🥟 +15　🥤 +20　⭐ +30<br>' +
    '🥊 扣一条命，⏰ 扣 5 秒。<br>' +
    '45 秒内拿到最高分，别让配泼睿饿着。</p>' +
    '<div class="ov-btns"><button class="btn primary" data-act="start" type="button">开始游戏</button>' +
    '<a class="btn ghost" href="arcade.html">回游戏厅</a></div>';

  function start() {
    state.running = true;
    state.over = false;
    state.frozen = false;
    state.score = 0;
    state.lives = 3;
    state.time = 45;
    state.spawn = 0.45;
    state.elapsed = 0;
    state.items = [];
    state.fx = [];
    state.shake = 0;
    player.x = W / 2;
    player.target = W / 2;
    hideOverlay();
    if (startBtn) startBtn.textContent = '重新开始';
    beep(660, 0.09, 'square');
    syncHud();
  }

  function end(reason) {
    state.running = false;
    state.over = true;
    if (state.score > state.best) {
      state.best = state.score;
      try { localStorage.setItem('ppr-catch-best', String(state.best)); } catch (e) { /* ignore */ }
    }
    var rank = '饿着吧';
    if (state.score >= 600) rank = '外卖之王';
    else if (state.score >= 400) rank = '宿舍干饭王';
    else if (state.score >= 250) rank = '合格室友';
    else if (state.score >= 120) rank = '勉强活着';
    showOverlay('<img class="ov-photo" src="assets/' + (reason === 'lives' ? 'yare' : 'face') + '.jpg" alt="配泼睿">' +
      '<h3>' + (reason === 'lives' ? '🥊 被打晕了' : '⏱ 时间到') + '</h3>' +
      '<p>接到外卖总分 <b>' + state.score + '</b>。<br>你的称号：<b>' + rank + '</b><br>历史最佳：' + state.best + '</p>' +
      '<div class="ov-btns"><button class="btn primary" data-act="start" type="button">再来一次</button>' +
      '<a class="btn ghost" href="arcade.html">回游戏厅</a></div>');
    beep(reason === 'lives' ? 140 : 200, 0.3, 'sawtooth');
    syncHud();
  }

  /* ---------- 逻辑 ---------- */
  function pickType() {
    var r = Math.random() * TOTAL_W;
    for (var k = 0; k < TYPES.length; k++) {
      r -= TYPES[k].weight;
      if (r <= 0) return TYPES[k];
    }
    return TYPES[0];
  }

  function spawn() {
    var t = pickType();
    state.items.push({
      x: 60 + Math.random() * (W - 120),
      y: -40,
      vy: 160 + state.elapsed * 2.4 + Math.random() * 70,
      type: t,
      rot: Math.random() * 0.4 - 0.2
    });
  }

  function addFx(x, y, text, color) {
    state.fx.push({ x: x, y: y, text: text, color: color, life: 1, vy: -46 });
  }

  function update(dt) {
    state.elapsed += dt;
    state.time -= dt;
    if (state.shake > 0) state.shake = Math.max(0, state.shake - dt * 3);
    if (state.time <= 0) {
      state.time = 0;
      end('time');
      return;
    }

    /* 键盘 */
    if (state.keys.left) player.target -= 620 * dt;
    if (state.keys.right) player.target += 620 * dt;
    player.target = Math.max(90, Math.min(W - 90, player.target));
    player.x += (player.target - player.x) * Math.min(1, dt * 14);

    state.spawn -= dt;
    if (state.spawn <= 0) {
      state.spawn = Math.max(0.26, 0.52 - state.elapsed * 0.005) + Math.random() * 0.14;
      spawn();
    }

    for (var i = state.items.length - 1; i >= 0; i--) {
      var it = state.items[i];
      it.y += it.vy * dt;
      it.rot += dt * 1.6;
      var top = player.y - 34;
      if (it.y > top - 18 && it.y < top + 62 && Math.abs(it.x - player.x) < 92) {
        catchItem(it);
        state.items.splice(i, 1);
        continue;
      }
      if (it.y > H + 50) state.items.splice(i, 1);
    }

    for (var f = state.fx.length - 1; f >= 0; f--) {
      state.fx[f].y += state.fx[f].vy * dt;
      state.fx[f].life -= dt;
      if (state.fx[f].life <= 0) state.fx.splice(f, 1);
    }
    syncHud();
  }

  function catchItem(it) {
    if (it.type.good) {
      state.score += it.type.value;
      addFx(it.x, player.y - 56, '+' + it.type.value, '#1e7a46');
      beep(880 + it.type.value * 8, 0.05, 'triangle');
      if (it.type.key === 'star') {
        addFx(it.x, player.y - 84, '传说级外卖！', '#a8801a');
        beep(1300, 0.07, 'square');
      }
    } else if (it.type.key === 'fist') {
      state.lives -= 1;
      state.shake = 0.5;
      addFx(it.x, player.y - 56, '−1 命', '#d1342a');
      beep(170, 0.2, 'sawtooth');
      if (state.lives <= 0) { end('lives'); return; }
    } else {
      state.time -= 5;
      addFx(it.x, player.y - 56, '−5 秒', '#d1342a');
      beep(240, 0.16, 'square');
      if (state.time <= 0) { state.time = 0; end('time'); return; }
    }
    syncHud();
  }

  function syncHud() {
    if (timeEl) timeEl.textContent = Math.max(0, state.time).toFixed(1);
    if (scoreEl) scoreEl.textContent = String(state.score);
    if (livesEl) livesEl.textContent = String(Math.max(0, state.lives));
    if (bestEl) bestEl.textContent = String(Math.max(state.best, state.score));
  }

  /* ---------- 绘制 ---------- */
  function draw() {
    ctx.save();
    if (state.shake > 0) ctx.translate((Math.random() - 0.5) * 10, (Math.random() - 0.5) * 8);

    var bg = ctx.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, '#f7efdf');
    bg.addColorStop(1, '#e7d7bb');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    /* 窗 */
    var wx = 300, wy = 34, ww = 300, wh = 168;
    ctx.fillStyle = '#2b3555';
    ctx.fillRect(wx, wy, ww, wh);
    ctx.fillStyle = '#ffe9a8';
    circ(ctx, wx + ww - 66, wy + 52, 22);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.75)';
    var stars = [[40, 30], [90, 70], [150, 40], [200, 96], [250, 52], [70, 120], [180, 130]];
    for (var s = 0; s < stars.length; s++) {
      circ(ctx, wx + stars[s][0], wy + stars[s][1], 2);
      ctx.fill();
    }
    ctx.strokeStyle = '#8a6a4a';
    ctx.lineWidth = 10;
    ctx.strokeRect(wx, wy, ww, wh);
    ctx.lineWidth = 6;
    line(ctx, wx + ww / 2, wy, wx + ww / 2, wy + wh);
    line(ctx, wx, wy + wh / 2, wx + ww, wy + wh / 2);

    /* 楼上提示 */
    ctx.font = '900 14px ' + FONT;
    ctx.fillStyle = '#8a6a4a';
    ctx.textAlign = 'center';
    ctx.fillText('↑ 楼上扔下来的外卖 ↑', W / 2, 24);

    /* 地板 */
    ctx.fillStyle = '#d8c39d';
    ctx.fillRect(0, H - 30, W, 30);
    ctx.strokeStyle = 'rgba(36,28,22,.12)';
    ctx.lineWidth = 2;
    for (var gx = 0; gx < W; gx += 90) line(ctx, gx, H - 30, gx - 20, H);

    /* 外卖 */
    for (var i = 0; i < state.items.length; i++) {
      var it = state.items[i];
      ctx.save();
      ctx.translate(it.x, it.y);
      ctx.rotate(Math.sin(it.rot) * 0.16);
      ctx.font = it.type.size + 'px ' + EMOJI;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(it.type.ch, 0, 0);
      ctx.restore();
    }

    drawPlayer();

    for (var f = 0; f < state.fx.length; f++) {
      var fx = state.fx[f];
      ctx.save();
      ctx.globalAlpha = Math.max(0, Math.min(1, fx.life));
      ctx.font = '900 18px ' + FONT;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.lineWidth = 4;
      ctx.strokeStyle = 'rgba(255,253,246,.9)';
      ctx.strokeText(fx.text, fx.x, fx.y);
      ctx.fillStyle = fx.color;
      ctx.fillText(fx.text, fx.x, fx.y);
      ctx.restore();
    }

    ctx.restore();
  }

  function drawPlayer() {
    var x = player.x, y = player.y;
    ctx.fillStyle = 'rgba(36,28,22,.16)';
    ctx.beginPath();
    ctx.ellipse(x, y + 36, 84, 12, 0, 0, Math.PI * 2);
    ctx.fill();

    /* 被子后面的头：真人大头照 */
    if (PHOTO_FACE.complete && PHOTO_FACE.naturalWidth) {
      ctx.save();
      ctx.beginPath();
      ctx.arc(x, y - 32, 28, 0, Math.PI * 2);
      ctx.clip();
      ctx.drawImage(PHOTO_FACE, x - 28, y - 60, 56, 56);
      ctx.restore();
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 5;
      ctx.beginPath(); ctx.arc(x, y - 32, 28, 0, Math.PI * 2); ctx.stroke();
      ctx.strokeStyle = INK;
      ctx.lineWidth = 2.4;
      ctx.beginPath(); ctx.arc(x, y - 32, 30, 0, Math.PI * 2); ctx.stroke();
    } else {
      ctx.fillStyle = '#f2c9a3';
      circ(ctx, x, y - 30, 24);
      ctx.fill();
      ctx.strokeStyle = INK;
      ctx.lineWidth = 2.6;
      ctx.stroke();
      ctx.fillStyle = '#2b2320';
      ctx.beginPath();
      ctx.arc(x, y - 30, 24, Math.PI * 1.04, Math.PI * 1.96);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = INK;
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(x - 8, y - 30, 3.4, 0.2, Math.PI - 0.2); ctx.stroke();
      ctx.beginPath(); ctx.arc(x + 8, y - 30, 3.4, 0.2, Math.PI - 0.2); ctx.stroke();
    }

    /* 被子 */
    ctx.fillStyle = '#7db3e0';
    rr(ctx, x - 82, y - 8, 164, 42, 18);
    ctx.fill();
    ctx.strokeStyle = INK;
    ctx.lineWidth = 3;
    ctx.stroke();

    /* 花纹 */
    ctx.strokeStyle = 'rgba(255,255,255,.8)';
    ctx.lineWidth = 3;
    line(ctx, x - 64, y + 6, x + 64, y + 6);
    line(ctx, x - 52, y + 20, x + 52, y + 20);

    /* 手 */
    ctx.fillStyle = '#f2c9a3';
    circ(ctx, x - 62, y - 4, 9);
    ctx.fill();
    ctx.strokeStyle = INK;
    ctx.lineWidth = 2.2;
    ctx.stroke();
    circ(ctx, x + 62, y - 4, 9);
    ctx.fill();
    ctx.stroke();
  }

  /* ---------- 主循环 ---------- */
  var last = 0, hudClock = 0;
  function frame(ts) {
    if (!last) last = ts;
    var dt = Math.min(0.05, (ts - last) / 1000);
    last = ts;
    if (state.running && !state.frozen) update(dt);
    draw();
    hudClock += dt;
    if (hudClock > 0.1) { hudClock = 0; syncHud(); }
    requestAnimationFrame(frame);
  }

  /* ---------- 事件 ---------- */
  function pointerX(ev) {
    var rect = canvas.getBoundingClientRect();
    return (ev.clientX - rect.left) * (W / rect.width);
  }
  canvas.addEventListener('pointermove', function (ev) {
    if (!state.running) return;
    player.target = Math.max(90, Math.min(W - 90, pointerX(ev)));
  });
  canvas.addEventListener('pointerdown', function (ev) {
    if (!state.running) return;
    player.target = Math.max(90, Math.min(W - 90, pointerX(ev)));
  });

  document.addEventListener('keydown', function (ev) {
    if (ev.code === 'Space') {
      ev.preventDefault();
      if (!state.running) start();
      return;
    }
    if (ev.key === 'ArrowLeft' || ev.key === 'a' || ev.key === 'A') { state.keys.left = true; ev.preventDefault(); }
    if (ev.key === 'ArrowRight' || ev.key === 'd' || ev.key === 'D') { state.keys.right = true; ev.preventDefault(); }
  });
  document.addEventListener('keyup', function (ev) {
    if (ev.key === 'ArrowLeft' || ev.key === 'a' || ev.key === 'A') state.keys.left = false;
    if (ev.key === 'ArrowRight' || ev.key === 'd' || ev.key === 'D') state.keys.right = false;
  });

  if (overlayEl) {
    overlayEl.addEventListener('click', function (ev) {
      var btn = ev.target.closest ? ev.target.closest('[data-act]') : null;
      if (btn && btn.getAttribute('data-act') === 'start') start();
    });
  }
  if (startBtn) startBtn.addEventListener('click', function () { if (!state.running) start(); });
  if (restartBtn) restartBtn.addEventListener('click', start);

  /* ---------- 启动 ---------- */
  showOverlay(START_HTML);
  draw();
  requestAnimationFrame(frame);

  if (location.search.indexOf('demo') >= 0) {
    start();
    state.frozen = true;
    state.score = 260;
    state.time = 32.6;
    state.best = 260;
    state.items = [
      { x: 180, y: 120, vy: 180, type: TYPES[0], rot: 0.3 },
      { x: 420, y: 250, vy: 180, type: TYPES[1], rot: 0.9 },
      { x: 640, y: 160, vy: 180, type: TYPES[2], rot: 1.4 },
      { x: 760, y: 330, vy: 180, type: TYPES[3], rot: 2.1 },
      { x: 300, y: 370, vy: 180, type: TYPES[4], rot: 2.6 },
      { x: 540, y: 60, vy: 180, type: TYPES[5], rot: 3.1 }
    ];
    player.x = 480;
    player.target = 480;
    syncHud();
    draw();
  }
})();
