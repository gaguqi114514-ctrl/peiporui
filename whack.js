/* ============================================================
   打闹钟 —— 30 秒手速小游戏
   闹钟从被窝里冒出来，敲掉它；别敲到配泼睿的头。
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

  var PHOTO_FACE = new Image();
  PHOTO_FACE.src = 'assets/face.jpg';

  var timeEl = document.getElementById('timeLeft');
  var scoreEl = document.getElementById('score');
  var comboEl = document.getElementById('combo');
  var bestEl = document.getElementById('best');
  var overlayEl = document.getElementById('overlay');
  var startBtn = document.getElementById('startBtn');
  var restartBtn = document.getElementById('restartBtn');

  var cols = [170, 450, 730];
  var rows = [158, 312, 466];
  var holes = [];
  var i, r, c;
  for (r = 0; r < 3; r++) {
    for (c = 0; c < 3; c++) {
      holes.push({ x: cols[c], y: rows[r], obj: null, flash: 0, hitAnim: 0 });
    }
  }

  var best = 0;
  try { best = parseInt(localStorage.getItem('ppr-whack-best') || '0', 10) || 0; } catch (e) { best = 0; }

  var state = {
    running: false, over: false, frozen: false,
    score: 0, combo: 0, time: 30, best: best,
    spawn: 0.4, elapsed: 0, t: 0, shake: 0, fx: []
  };

  function beep(f, d, t) { if (window.pprBeep) window.pprBeep(f, d, t); }

  /* ---------- 精灵 ---------- */
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

  function drawAlarm(g, gold) {
    var main = gold ? '#e0a91b' : '#e8574a';
    var face = gold ? '#fff6d8' : '#fff8e6';
    g.lineCap = 'round';
    g.fillStyle = main;
    circ(g, -12, -20, 7);
    g.fill();
    g.strokeStyle = INK;
    g.lineWidth = 2.4;
    g.stroke();
    circ(g, 12, -20, 7);
    g.fill();
    g.stroke();
    g.fillStyle = main;
    circ(g, 0, 0, 20);
    g.fill();
    g.lineWidth = 2.8;
    g.stroke();
    g.fillStyle = face;
    circ(g, 0, 2, 13);
    g.fill();
    g.strokeStyle = INK;
    g.lineWidth = 2.4;
    line(g, 0, 2, 0, -7);
    line(g, 0, 2, 7, 6);
    g.lineWidth = 2.6;
    line(g, -8, 18, -11, 27);
    line(g, 8, 18, 11, 27);
    g.strokeStyle = gold ? '#8a6a12' : '#a3231b';
    g.lineWidth = 2.2;
    g.beginPath(); g.arc(0, 0, 27, -1.0, -0.35); g.stroke();
    g.beginPath(); g.arc(0, 0, 27, Math.PI + 0.35, Math.PI + 1.0); g.stroke();
  }

  function drawHead(g) {
    g.lineJoin = 'round';
    /* 肩 */
    g.fillStyle = '#5b8fd0';
    rr(g, -18, 26, 36, 18, 9);
    g.fill();
    g.strokeStyle = INK;
    g.lineWidth = 2.4;
    g.stroke();
    /* 头 */
    g.fillStyle = '#f2c9a3';
    circ(g, 0, 0, 30);
    g.fill();
    g.strokeStyle = INK;
    g.lineWidth = 2.6;
    g.stroke();
    /* 头发 */
    g.fillStyle = '#2b2320';
    g.beginPath();
    g.arc(0, 0, 30, Math.PI * 1.03, Math.PI * 1.97);
    g.closePath();
    g.fill();
    /* 眼镜 */
    g.strokeStyle = INK;
    g.lineWidth = 2.6;
    circ(g, -11, 2, 10);
    g.stroke();
    circ(g, 11, 2, 10);
    g.stroke();
    line(g, -1, 2, 1, 2);
    g.fillStyle = 'rgba(126,184,230,.4)';
    circ(g, -11, 2, 9);
    g.fill();
    circ(g, 11, 2, 9);
    g.fill();
    /* 闭眼 */
    g.strokeStyle = INK;
    g.lineWidth = 2;
    g.beginPath(); g.arc(-11, 2, 4.4, 0.2, Math.PI - 0.2); g.stroke();
    g.beginPath(); g.arc(11, 2, 4.4, 0.2, Math.PI - 0.2); g.stroke();
    /* 嘴 */
    g.beginPath(); g.arc(0, 14, 5, 0.2, Math.PI - 0.2); g.stroke();
  }

  function drawPhotoHead(g) {
    if (!(PHOTO_FACE.complete && PHOTO_FACE.naturalWidth)) { drawHead(g); return; }
    var R = 38;
    g.save();
    g.beginPath();
    g.arc(0, 0, R, 0, Math.PI * 2);
    g.closePath();
    g.clip();
    g.drawImage(PHOTO_FACE, -R, -R, R * 2, R * 2);
    g.restore();
    g.strokeStyle = '#fff';
    g.lineWidth = 5;
    g.beginPath(); g.arc(0, 0, R, 0, Math.PI * 2); g.stroke();
    g.strokeStyle = INK;
    g.lineWidth = 2.5;
    g.beginPath(); g.arc(0, 0, R + 2.5, 0, Math.PI * 2); g.stroke();
  }

  /* ---------- 覆盖层 ---------- */
  function showOverlay(html) {
    overlayEl.innerHTML = '<div class="ov-card">' + html + '</div>';
    overlayEl.hidden = false;
  }
  function hideOverlay() { overlayEl.hidden = true; }

  var START_HTML = '<img class="ov-photo" src="assets/face.jpg" alt="配泼睿">' +
    '<h3>打闹钟</h3>' +
    '<p>30 秒内敲掉所有从被窝里冒出来的闹钟。<br>' +
    '敲中 <b>+10</b>，连击有加成；金色闹钟 <b>+50</b>。<br>' +
    '如果冒出来的是<b>配泼睿本人的脸</b>，千万别敲——<b>−20 分、−2 秒</b>。</p>' +
    '<div class="ov-btns"><button class="btn primary" data-act="start" type="button">开始游戏</button>' +
    '<a class="btn ghost" href="arcade.html">回游戏厅</a></div>';

  function start() {
    state.running = true;
    state.over = false;
    state.frozen = false;
    state.score = 0;
    state.combo = 0;
    state.time = 30;
    state.spawn = 0.4;
    state.elapsed = 0;
    state.shake = 0;
    state.fx = [];
    for (i = 0; i < holes.length; i++) {
      holes[i].obj = null;
      holes[i].flash = 0;
      holes[i].hitAnim = 0;
    }
    hideOverlay();
    if (startBtn) startBtn.textContent = '重新开始';
    beep(660, 0.09, 'square');
    syncHud();
  }

  function end() {
    state.running = false;
    state.over = true;
    if (state.score > state.best) {
      state.best = state.score;
      try { localStorage.setItem('ppr-whack-best', String(state.best)); } catch (e) { /* ignore */ }
    }
    var rank = '你也在睡觉吗';
    if (state.score >= 300) rank = '闹钟收割机';
    else if (state.score >= 200) rank = '宿舍保安队长';
    else if (state.score >= 120) rank = '正常人类';
    else if (state.score >= 60) rank = '手有点慢';
    showOverlay('<img class="ov-photo" src="assets/yare.jpg" alt="配泼睿：呀嘞呀嘞">' +
      '<h3>⏰ 时间到</h3><p>共敲掉闹钟得分 <b>' + state.score + '</b> 分。<br>' +
      '你的称号：<b>' + rank + '</b><br>历史最佳：' + state.best + '</p>' +
      '<div class="ov-btns"><button class="btn primary" data-act="start" type="button">再来一次</button>' +
      '<a class="btn ghost" href="arcade.html">回游戏厅</a></div>');
    beep(180, 0.28, 'sawtooth');
    syncHud();
  }

  /* ---------- 逻辑 ---------- */
  function spawn() {
    var free = [];
    for (var k = 0; k < holes.length; k++) if (!holes[k].obj) free.push(holes[k]);
    if (!free.length) return;
    var h = free[Math.floor(Math.random() * free.length)];
    var roll = Math.random();
    var type = roll < 0.16 ? 'head' : (roll > 0.95 ? 'gold' : 'alarm');
    h.obj = { type: type, t: 0, dur: type === 'head' ? 0.85 : (type === 'gold' ? 0.75 : 0.95), hit: false };
  }

  function addFx(x, y, text, color) {
    state.fx.push({ x: x, y: y, text: text, color: color, life: 1, vy: -40 });
  }

  function hitAt(x, y) {
    for (var k = 0; k < holes.length; k++) {
      var h = holes[k];
      if (!h.obj) continue;
      if (Math.abs(x - h.x) < 62 && Math.abs(y - (h.y - 34)) < 78) {
        strike(h);
        return true;
      }
    }
    return false;
  }

  function strike(h) {
    var o = h && h.obj;
    if (!o) return false;
    h.obj = null;
    h.flash = 0.22;
    if (o.type === 'head') {
      state.score = Math.max(0, state.score - 20);
      state.combo = 0;
      state.time = Math.max(0, state.time - 2);
      state.shake = 0.5;
      addFx(h.x, h.y - 40, '别打老板！', '#d1342a');
      beep(160, 0.2, 'sawtooth');
    } else {
      var gain = (o.type === 'gold' ? 50 : 10) + Math.min(30, state.combo * 2);
      state.score += gain;
      state.combo += 1;
      addFx(h.x, h.y - 50, '+' + gain, o.type === 'gold' ? '#a8801a' : '#1e7a46');
      beep(o.type === 'gold' ? 1320 : 920, 0.05, 'triangle');
      if (o.type === 'gold') setTimeout(function () { beep(1560, 0.07, 'triangle'); }, 70);
    }
    syncHud();
    return true;
  }

  function update(dt) {
    state.t += dt;
    state.elapsed += dt;
    state.time -= dt;
    if (state.shake > 0) state.shake = Math.max(0, state.shake - dt * 3);
    if (state.time <= 0) {
      state.time = 0;
      end();
      return;
    }
    state.spawn -= dt;
    if (state.spawn <= 0) {
      state.spawn = Math.max(0.32, 0.68 - state.elapsed * 0.012) + Math.random() * 0.18;
      spawn();
    }
    for (var k = 0; k < holes.length; k++) {
      var h = holes[k];
      if (h.flash > 0) h.flash -= dt;
      if (!h.obj) continue;
      h.obj.t += dt;
      if (h.obj.t >= h.obj.dur) {
        if (h.obj.type !== 'head') state.combo = 0;
        h.obj = null;
      }
    }
    for (var f = state.fx.length - 1; f >= 0; f--) {
      state.fx[f].y += state.fx[f].vy * dt;
      state.fx[f].life -= dt;
      if (state.fx[f].life <= 0) state.fx.splice(f, 1);
    }
    syncHud();
  }

  var hudClock = 0;
  function syncHud() {
    if (timeEl) timeEl.textContent = state.time.toFixed(1);
    if (scoreEl) scoreEl.textContent = String(state.score);
    if (comboEl) comboEl.textContent = String(state.combo);
    if (bestEl) bestEl.textContent = String(Math.max(state.best, state.score));
  }

  /* ---------- 绘制 ---------- */
  function draw() {
    ctx.save();
    if (state.shake > 0) ctx.translate((Math.random() - 0.5) * 8, (Math.random() - 0.5) * 8);

    var bg = ctx.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, '#f7f0e2');
    bg.addColorStop(1, '#e8d9bf');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    ctx.strokeStyle = 'rgba(36,28,22,.05)';
    ctx.lineWidth = 12;
    for (var s = -H; s < W + H; s += 64) {
      ctx.beginPath();
      ctx.moveTo(s, 0);
      ctx.lineTo(s + H, H);
      ctx.stroke();
    }

    ctx.fillStyle = '#d8c39d';
    ctx.fillRect(0, H - 34, W, 34);

    for (var k = 0; k < holes.length; k++) {
      var h = holes[k];
      /* 被窝边 */
      ctx.fillStyle = '#cfe2f7';
      ctx.beginPath();
      ctx.ellipse(h.x, h.y + 8, 100, 44, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = INK;
      ctx.lineWidth = 3;
      ctx.stroke();
      /* 洞口 */
      ctx.fillStyle = '#33251a';
      ctx.beginPath();
      ctx.ellipse(h.x, h.y + 2, 86, 34, 0, 0, Math.PI * 2);
      ctx.fill();
      /* 命中闪光 */
      if (h.flash > 0) {
        ctx.save();
        ctx.globalAlpha = h.flash / 0.22;
        ctx.fillStyle = '#ffe066';
        ctx.beginPath();
        ctx.ellipse(h.x, h.y + 2, 96, 42, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
      /* 编号 */
      ctx.font = '700 13px ' + FONT;
      ctx.fillStyle = 'rgba(255,233,168,.55)';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(String(k + 1), h.x, h.y + 2);
      /* 对象 */
      if (h.obj) {
        var o = h.obj;
        var pop = Math.min(1, o.t / 0.1);
        var rise = (1 - pop) * 46;
        var sc = 0.55 + 0.45 * pop;
        ctx.save();
        ctx.beginPath();
        ctx.rect(h.x - 120, h.y - 170, 240, 172);
        ctx.clip();
        ctx.translate(h.x, h.y - (o.type === 'head' ? 38 : 30) + rise);
        ctx.scale(sc, sc);
        if (o.type === 'head') drawPhotoHead(ctx);
        else drawAlarm(ctx, o.type === 'gold');
        ctx.restore();
      }
    }

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

  /* ---------- 主循环 ---------- */
  var last = 0;
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
  canvas.addEventListener('pointerdown', function (ev) {
    if (!state.running || state.frozen) return;
    var rect = canvas.getBoundingClientRect();
    var x = (ev.clientX - rect.left) * (W / rect.width);
    var y = (ev.clientY - rect.top) * (H / rect.height);
    if (!hitAt(x, y)) {
      state.combo = 0;
      beep(120, 0.04, 'square');
    }
  });

  document.addEventListener('keydown', function (ev) {
    if (ev.code === 'Space') {
      ev.preventDefault();
      if (!state.running) start();
      return;
    }
    if (!state.running || state.frozen) return;
    var n = parseInt(ev.key, 10);
    if (n >= 1 && n <= 9) {
      if (!strike(holes[n - 1])) { state.combo = 0; beep(120, 0.04, 'square'); }
    }
  });

  if (overlayEl) {
    overlayEl.addEventListener('click', function (ev) {
      var btn = ev.target.closest ? ev.target.closest('[data-act]') : null;
      if (btn && btn.getAttribute('data-act') === 'start') start();
    });
  }
  if (startBtn) {
    startBtn.addEventListener('click', function () {
      if (!state.running) start();
    });
  }
  if (restartBtn) {
    restartBtn.addEventListener('click', start);
  }

  /* ---------- 启动 ---------- */
  showOverlay(START_HTML);
  draw();
  requestAnimationFrame(frame);

  if (location.search.indexOf('demo') >= 0) {
    start();
    state.frozen = true;
    state.time = 21.4;
    state.score = 180;
    state.combo = 4;
    state.best = 180;
    holes[0].obj = { type: 'alarm', t: 0.3, dur: 99, hit: false };
    holes[1].obj = { type: 'head', t: 0.25, dur: 99, hit: false };
    holes[4].obj = { type: 'gold', t: 0.35, dur: 99, hit: false };
    holes[6].obj = { type: 'alarm', t: 0.2, dur: 99, hit: false };
    holes[8].obj = { type: 'alarm', t: 0.4, dur: 99, hit: false };
    syncHud();
    draw();
  }
})();
