/* ============================================================
   保卫被窝 2.0 —— 重制版塔防
   8 种道具 / 8 种敌人（真人头像）/ 10 波 / 拖鞋防御 / 选卡
   ============================================================ */
(function () {
  'use strict';

  var canvas = document.getElementById('game');
  if (!canvas) return;
  var ctx = canvas.getContext('2d');

  var W = 980, H = 560;
  var DPR = Math.min(2, window.devicePixelRatio || 1);
  canvas.width = Math.round(W * DPR);
  canvas.height = Math.round(H * DPR);
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);

  var INK = '#241c16';
  var FONT = '"PingFang SC","Hiragino Sans GB","Microsoft YaHei",sans-serif';
  var COLS = 9, ROWS = 5, CW = 88, CH = 88, GX = 96, GY = 64;
  var GRID_R = GX + COLS * CW;
  var GRID_B = GY + ROWS * CH;

  /* ================= 图片 ================= */
  var IMG = {};
  function loadImg(key, src) { var im = new Image(); im.src = src; IMG[key] = im; }
  loadImg('sleep', 'assets/sleep.jpg');
  loadImg('face', 'assets/face.jpg');
  loadImg('yare', 'assets/yare.jpg');
  loadImg('food', 'assets/head_food.jpg');
  loadImg('nice', 'assets/head_nice.jpg');
  loadImg('sky', 'assets/head_sky.jpg');
  loadImg('clone', 'assets/head_clone.jpg');
  loadImg('towel', 'assets/head_towel.jpg');

  /* ================= 数据 ================= */
  var PLANTS = {
    milktea: { name: '珍珠奶茶', cost: 50,  hp: 320, cd: 5,  kind: 'producer', produce: 25, interval: 7.5, tag: '产卡路里' },
    towel:   { name: '蓝毛巾',   cost: 25,  hp: 2000, cd: 7, kind: 'wall', tag: '肉盾' },
    toy:     { name: '玩偶兔',   cost: 100, hp: 340, cd: 6,  kind: 'shooter', dmg: 24, interval: 1.35, tag: '单体输出' },
    glasses: { name: '眼镜',     cost: 175, hp: 340, cd: 8,  kind: 'shooter', dmg: 28, shots: 2, interval: 1.7, tag: '双发' },
    latiao:  { name: '辣条',     cost: 75,  hp: 300, cd: 4,  kind: 'shooter', dmg: 13, interval: 0.6, tag: '高速低伤' },
    ac:      { name: '空调',     cost: 150, hp: 320, cd: 10, kind: 'slow', tag: '减速' },
    alarm:   { name: '闹钟炸弹', cost: 125, hp: 9999, cd: 14, kind: 'bomb', dmg: 900, fuse: 1.1, tag: '范围爆炸' },
    selfie:  { name: '自拍杆',   cost: 200, hp: 360, cd: 12, kind: 'pierce', dmg: 45, interval: 2.2, tag: '穿透整行' }
  };
  var ORDER = ['milktea', 'towel', 'toy', 'glasses', 'latiao', 'ac', 'alarm', 'selfie'];
  var DEFAULT_DECK = ['milktea', 'towel', 'toy', 'glasses', 'ac', 'alarm'];

  var ENEMIES = {
    alarm:    { name: '闹钟',     hp: 110,  speed: 34, dmg: 4,  reward: 8,   kind: 'clock' },
    roommate: { name: '室友',     hp: 240,  speed: 14, dmg: 8,  reward: 10,  head: 'face',  shirt: '#5b8fd0' },
    courier:  { name: '快递小哥', hp: 190,  speed: 26, dmg: 6,  reward: 12,  head: 'food',  shirt: '#4f8f6a', prop: 'box' },
    slipper:  { name: '拖鞋室友', hp: 380,  speed: 12, dmg: 10, reward: 15,  head: 'nice',  shirt: '#d98b4a', prop: 'slipper', armor: 0.15 },
    auntie:   { name: '宿管阿姨', hp: 640,  speed: 9,  dmg: 14, reward: 25,  head: 'sky',   shirt: '#8a5fa8', skirt: true, prop: 'keys', armor: 0.25 },
    clone:    { name: '分身',     hp: 300,  speed: 18, dmg: 9,  reward: 18,  head: 'clone', shirt: '#7a6ad0', split: true },
    towel:    { name: '毛巾怪',   hp: 520,  speed: 11, dmg: 12, reward: 22,  head: 'towel', shirt: '#9fb7cf', towelHat: true },
    boss:     { name: '辅导员',   hp: 3800, speed: 7,  dmg: 22, reward: 150, head: 'yare',  shirt: '#3a3a44', boss: true, scream: true }
  };

  var WAVES = [
    { dur: 9,  list: [['roommate', 4]] },
    { dur: 11, list: [['roommate', 5], ['alarm', 2]] },
    { dur: 12, list: [['roommate', 5], ['courier', 2], ['alarm', 2]] },
    { dur: 13, list: [['slipper', 3], ['roommate', 4], ['courier', 2]] },
    { dur: 14, list: [['clone', 2], ['alarm', 4], ['courier', 3]] },
    { dur: 14, list: [['slipper', 4], ['roommate', 5], ['alarm', 3]] },
    { dur: 15, list: [['auntie', 2], ['slipper', 3], ['courier', 4]] },
    { dur: 15, list: [['clone', 4], ['auntie', 2], ['alarm', 4]] },
    { dur: 16, list: [['slipper', 6], ['auntie', 4], ['clone', 3], ['alarm', 4]] },
    { dur: 18, list: [['boss', 1], ['slipper', 6], ['auntie', 3]] }
  ];

  /* ================= DOM ================= */
  var el = {
    cal: document.getElementById('calCount'),
    hearts: document.getElementById('heartCount'),
    wave: document.getElementById('waveNum'),
    score: document.getElementById('scoreNum'),
    best: document.getElementById('bestNum'),
    waveFill: document.getElementById('waveFill'),
    waveLabel: document.getElementById('waveLabel'),
    deck: document.getElementById('deck'),
    overlay: document.getElementById('gameOverlay'),
    shovel: document.getElementById('shovelBtn'),
    pause: document.getElementById('pauseBtn'),
    speed: document.getElementById('speedBtn'),
    restart: document.getElementById('restartBtn')
  };

  var state = {
    phase: 'select',
    chosen: DEFAULT_DECK.slice(),
    deck: DEFAULT_DECK.slice(),
    cal: 175, hearts: 3, score: 0, best: 0,
    wave: 0, waveTimer: 8, waveActive: false, spawnQueue: [], waveClock: 0,
    plants: [], enemies: [], shots: [], beams: [], suns: [], photos: [], fx: [],
    mowers: [], t: 0, shake: 0, bedHit: 0,
    selected: null, shovelMode: false,
    cooldowns: {}, timeScale: 1, banner: null,
    sunTimer: 6, photoTimer: 15, hudClock: 0
  };
  try { state.best = parseInt(localStorage.getItem('ppr-game-best') || '0', 10) || 0; } catch (e) { state.best = 0; }

  var hover = { row: -1, col: -1 };

  /* ================= 小工具 ================= */
  function beep(f, d, t) { if (window.pprBeep) window.pprBeep(f, d, t); }
  function toast(m) { if (window.pprToast) window.pprToast(m); }
  function rnd(a, b) { return a + Math.random() * (b - a); }
  function cxOf(p) { return GX + p.col * CW + CW / 2; }
  function cyOf(p) { return GY + p.row * CH + CH / 2; }
  function rowY(r) { return GY + r * CH + CH / 2; }

  function rr(g, x, y, w, h, r) {
    r = Math.min(r, h / 2, w / 2);
    g.beginPath();
    g.moveTo(x + r, y);
    g.arcTo(x + w, y, x + w, y + h, r);
    g.arcTo(x + w, y + h, x, y + h, r);
    g.arcTo(x, y + h, x, y, r);
    g.arcTo(x, y, x + w, y, r);
    g.closePath();
  }
  function circ(g, x, y, r) { g.beginPath(); g.arc(x, y, Math.abs(r), 0, Math.PI * 2); }
  function line(g, x1, y1, x2, y2) { g.beginPath(); g.moveTo(x1, y1); g.lineTo(x2, y2); g.stroke(); }
  function snow(g, x, y, r) {
    g.save();
    g.translate(x, y);
    g.strokeStyle = '#4f9fd8';
    g.lineWidth = 2;
    g.lineCap = 'round';
    for (var i = 0; i < 3; i++) {
      g.beginPath(); g.moveTo(-r, 0); g.lineTo(r, 0); g.stroke();
      g.rotate(Math.PI / 3);
    }
    g.restore();
  }

  /* ================= 精灵 ================= */
  function drawAlarmShape(g, gold) {
    var main = gold ? '#e0a91b' : '#e8574a';
    var face = gold ? '#fff6d8' : '#fff8e6';
    g.lineCap = 'round';
    g.fillStyle = main;
    circ(g, -12, -20, 7); g.fill();
    g.strokeStyle = INK; g.lineWidth = 2.4; g.stroke();
    circ(g, 12, -20, 7); g.fill(); g.stroke();
    g.fillStyle = main; circ(g, 0, 0, 20); g.fill();
    g.lineWidth = 2.8; g.stroke();
    g.fillStyle = face; circ(g, 0, 2, 13); g.fill();
    g.strokeStyle = INK; g.lineWidth = 2.4;
    line(g, 0, 2, 0, -7); line(g, 0, 2, 7, 6);
    g.lineWidth = 2.6; line(g, -8, 18, -11, 27); line(g, 8, 18, 11, 27);
  }

  var SPRITES = {
    milktea: function (g) {
      g.save();
      g.strokeStyle = '#e0574a'; g.lineWidth = 5; g.lineCap = 'round';
      line(g, 10, -33, -1, -9);
      g.beginPath();
      g.moveTo(-19, -13); g.lineTo(19, -13); g.lineTo(13, 29); g.lineTo(-13, 29); g.closePath();
      g.fillStyle = '#fff8ea'; g.fill();
      g.strokeStyle = INK; g.lineWidth = 2.6; g.stroke();
      g.save(); g.clip();
      g.fillStyle = '#d9a06a'; g.fillRect(-24, 3, 48, 32);
      g.fillStyle = '#4a3323';
      var pearls = [[-8, 19], [-2, 23], [4, 19], [9, 23], [-3, 14]];
      for (var i = 0; i < pearls.length; i++) { circ(g, pearls[i][0], pearls[i][1], 3.2); g.fill(); }
      g.restore();
      rr(g, -21, -18, 42, 8, 4); g.fillStyle = '#fff'; g.fill();
      g.strokeStyle = INK; g.lineWidth = 2.4; g.stroke();
      g.strokeStyle = 'rgba(255,255,255,.85)'; g.lineWidth = 2.2;
      line(g, -11, 0, -9, 16);
      g.restore();
    },
    towel: function (g) {
      g.lineJoin = 'round';
      g.fillStyle = '#5f9fd6'; rr(g, -28, 2, 56, 24, 7); g.fill();
      g.strokeStyle = INK; g.lineWidth = 2.6; g.stroke();
      g.fillStyle = '#8fc0e8'; rr(g, -26, -15, 52, 21, 8); g.fill(); g.stroke();
      g.strokeStyle = 'rgba(255,255,255,.8)'; g.lineWidth = 2;
      line(g, -18, -5, 18, -5); line(g, -20, 9, 20, 9);
      g.strokeStyle = INK; g.lineWidth = 2;
      for (var i = 0; i < 4; i++) line(g, -28, 7 + i * 5, -34, 7 + i * 5);
      g.fillStyle = '#fff'; rr(g, 11, -11, 10, 6, 2); g.fill();
    },
    toy: function (g) {
      g.lineJoin = 'round';
      g.strokeStyle = INK; g.lineWidth = 2.6;
      g.save(); g.translate(-9, -25); g.rotate(-0.18);
      rr(g, -5, -16, 10, 28, 5); g.fillStyle = '#fff'; g.fill(); g.stroke();
      rr(g, -2.5, -12, 5, 18, 2.5); g.fillStyle = '#f6b8c8'; g.fill();
      g.restore();
      g.save(); g.translate(10, -26); g.rotate(0.12);
      g.fillStyle = '#fff'; rr(g, -5, -16, 10, 30, 5); g.fill(); g.stroke();
      rr(g, -2.5, -12, 5, 18, 2.5); g.fillStyle = '#f6b8c8'; g.fill();
      g.restore();
      g.fillStyle = '#e8f1fb'; rr(g, -15, 8, 30, 24, 12); g.fill();
      g.strokeStyle = INK; g.lineWidth = 2.6; g.stroke();
      g.fillStyle = '#fff';
      circ(g, -17, 16, 4.6); g.fill(); g.stroke();
      circ(g, 17, 16, 4.6); g.fill(); g.stroke();
      circ(g, -8, 32, 4.6); g.fill(); g.stroke();
      circ(g, 8, 32, 4.6); g.fill(); g.stroke();
      rr(g, -9, 14, 18, 13, 7); g.fill();
      g.fillStyle = '#fff'; circ(g, 0, -4, 15); g.fill();
      g.strokeStyle = INK; g.lineWidth = 2.6; g.stroke();
      g.fillStyle = 'rgba(246,184,200,.8)';
      circ(g, -7, 2, 3.6); g.fill(); circ(g, 7, 2, 3.6); g.fill();
      g.fillStyle = INK;
      circ(g, -5.5, -4, 2); g.fill(); circ(g, 5.5, -4, 2); g.fill();
      g.fillStyle = '#e88aa0'; circ(g, 0, 1, 2.1); g.fill();
    },
    glasses: function (g) {
      g.fillStyle = 'rgba(126,184,230,.45)';
      g.strokeStyle = INK; g.lineWidth = 3.2;
      circ(g, -13, 0, 12); g.fill(); g.stroke();
      circ(g, 13, 0, 12); g.fill(); g.stroke();
      line(g, -1, -2, 1, -2);
      line(g, -25, -3, -31, -7);
      line(g, 25, -3, 31, -7);
      g.strokeStyle = 'rgba(255,255,255,.9)'; g.lineWidth = 2.4;
      line(g, -19, -5, -11, -9); line(g, 7, -5, 15, -9);
    },
    latiao: function (g) {
      g.save(); g.rotate(-0.07);
      g.fillStyle = '#d1342a'; rr(g, -16, -22, 32, 44, 6); g.fill();
      g.strokeStyle = INK; g.lineWidth = 2.6; g.stroke();
      g.fillStyle = '#ffe066'; rr(g, -11, -15, 22, 11, 3); g.fill();
      g.fillStyle = '#fff8e6';
      g.font = '700 13px ' + FONT;
      g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillText('辣', 0, 9);
      g.restore();
    },
    ac: function (g) {
      g.lineJoin = 'round';
      g.fillStyle = '#f7f9f6'; rr(g, -27, -16, 54, 32, 8); g.fill();
      g.strokeStyle = INK; g.lineWidth = 2.6; g.stroke();
      g.fillStyle = '#dbe8f1'; rr(g, -22, -11, 44, 11, 4); g.fill();
      g.strokeStyle = 'rgba(36,28,22,.45)'; g.lineWidth = 1.6;
      line(g, -18, -5.5, 18, -5.5);
      g.fillStyle = '#cfe3f0'; rr(g, -22, 4, 18, 8, 3); g.fill();
      g.fillStyle = '#8fc0e8'; circ(g, -8, 8, 1.6); g.fill();
      snow(g, 16, 8, 6);
      g.strokeStyle = '#8cc6ea'; g.lineWidth = 2.2;
      g.beginPath(); g.arc(-18, -24, 7, 0.2, 1.5); g.stroke();
      g.beginPath(); g.arc(-4, -27, 5, 0.4, 1.7); g.stroke();
    },
    alarm: function (g) { drawAlarmShape(g, false); },
    selfie: function (g) {
      g.strokeStyle = '#5a5a66'; g.lineWidth = 5; g.lineCap = 'round';
      line(g, 0, 28, 6, -4);
      g.save(); g.translate(6, -20); g.rotate(-0.16);
      g.fillStyle = '#2b2f3a'; rr(g, -12, -18, 24, 36, 5); g.fill();
      g.strokeStyle = INK; g.lineWidth = 2.2; g.stroke();
      g.fillStyle = '#8cc6ea'; rr(g, -8, -14, 16, 22, 3); g.fill();
      g.fillStyle = '#ffe066'; circ(g, 0, 14, 2.4); g.fill();
      g.restore();
      g.strokeStyle = '#ffd93b'; g.lineWidth = 2.4;
      for (var i = 0; i < 3; i++) {
        var a = -1.3 + i * 0.55;
        line(g, 18 + Math.cos(a) * 9, -20 + Math.sin(a) * 9, 18 + Math.cos(a) * 15, -20 + Math.sin(a) * 15);
      }
    },
    sleep: function (g) {
      g.fillStyle = '#7db3e0'; rr(g, -29, 6, 58, 22, 10); g.fill();
      g.strokeStyle = INK; g.lineWidth = 2.6; g.stroke();
      g.strokeStyle = 'rgba(255,255,255,.7)'; g.lineWidth = 2.2;
      line(g, -20, 12, 22, 12);
      g.fillStyle = '#fff'; rr(g, -31, -10, 24, 16, 7); g.fill(); g.stroke();
      g.fillStyle = '#f2c9a3'; circ(g, -13, -14, 10); g.fill();
      g.strokeStyle = INK; g.lineWidth = 2.4; g.stroke();
      g.fillStyle = '#2b2320';
      g.beginPath(); g.arc(-13, -14, 10, Math.PI * 1.05, Math.PI * 1.95); g.closePath(); g.fill();
      g.strokeStyle = INK; g.lineWidth = 1.6;
      g.beginPath(); g.arc(-18, -14, 3, 0.2, Math.PI - 0.2); g.stroke();
      g.beginPath(); g.arc(-9, -14, 3, 0.2, Math.PI - 0.2); g.stroke();
      g.fillStyle = 'rgba(36,28,22,.45)';
      g.font = '700 11px ' + FONT; g.textAlign = 'left'; g.textBaseline = 'middle';
      g.fillText('Z', 2, -30);
      g.font = '700 15px ' + FONT; g.fillText('Z', 11, -42);
    },
    door: function (g) {
      g.fillStyle = '#8a5a3c'; rr(g, -17, -28, 34, 56, 4); g.fill();
      g.strokeStyle = INK; g.lineWidth = 2.6; g.stroke();
      g.strokeStyle = 'rgba(36,28,22,.2)'; g.lineWidth = 1.6;
      rr(g, -11, -22, 22, 20, 3); g.stroke();
      g.fillStyle = '#f2d9a6'; circ(g, 9, 3, 3.2); g.fill();
    },
    sun: function (g) {
      g.fillStyle = '#ffd93b';
      for (var i = 0; i < 8; i++) {
        g.save(); g.rotate(i * Math.PI / 4);
        g.beginPath(); g.moveTo(0, -20); g.lineTo(4.5, -29); g.lineTo(-4.5, -29); g.closePath(); g.fill();
        g.restore();
      }
      g.fillStyle = '#ffcf1f'; circ(g, 0, 0, 15); g.fill();
      g.strokeStyle = '#c99a0e'; g.lineWidth = 2.2; g.stroke();
      g.fillStyle = '#8a5a12';
      circ(g, -4, -3, 1.8); g.fill(); circ(g, 4, -3, 1.8); g.fill();
      g.strokeStyle = '#8a5a12'; g.lineWidth = 1.8;
      g.beginPath(); g.arc(0, 1, 4, 0.25, Math.PI - 0.25); g.stroke();
    },
    sock: function (g) {
      g.rotate(0.25);
      g.fillStyle = '#fff8ea'; rr(g, -9, -6, 18, 12, 5); g.fill();
      g.strokeStyle = INK; g.lineWidth = 2.2; g.stroke();
      g.fillStyle = '#7db3e0'; rr(g, -9, -6, 5, 12, 3); g.fill();
    },
    slipper: function (g) {
      g.rotate(-0.08);
      g.fillStyle = '#3f7fc4'; rr(g, -22, -8, 44, 18, 9); g.fill();
      g.strokeStyle = INK; g.lineWidth = 2.6; g.stroke();
      g.fillStyle = '#2f6fb0'; rr(g, -11, -16, 22, 9, 4); g.fill(); g.stroke();
      g.strokeStyle = 'rgba(255,255,255,.7)'; g.lineWidth = 2;
      line(g, -12, 3, 12, 3);
    }
  };

  function drawSprite(key, x, y, size, rot) {
    var fn = SPRITES[key];
    if (!fn) return;
    ctx.save();
    ctx.translate(x, y);
    if (rot) ctx.rotate(rot);
    ctx.scale(size / 64, size / 64);
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    fn(ctx);
    ctx.restore();
  }

  function drawPhotoHead(img, x, y, r) {
    if (img && img.complete && img.naturalWidth) {
      ctx.save();
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.clip();
      ctx.drawImage(img, x - r, y - r, r * 2, r * 2);
      ctx.restore();
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = Math.max(3, r * 0.16);
      ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.stroke();
      ctx.strokeStyle = INK;
      ctx.lineWidth = 1.8;
      ctx.beginPath(); ctx.arc(x, y, r + 1.6, 0, Math.PI * 2); ctx.stroke();
      return true;
    }
    ctx.fillStyle = '#f2c9a3';
    circ(ctx, x, y, r); ctx.fill();
    ctx.strokeStyle = INK; ctx.lineWidth = 2.2; ctx.stroke();
    ctx.fillStyle = '#2b2320';
    ctx.beginPath(); ctx.arc(x, y, r, Math.PI * 1.05, Math.PI * 1.95); ctx.closePath(); ctx.fill();
    return false;
  }

  function paintIcons() {
    var icons = document.querySelectorAll('canvas[data-sprite]');
    for (var i = 0; i < icons.length; i++) {
      var cv = icons[i];
      var g = cv.getContext('2d');
      var key = cv.getAttribute('data-sprite');
      g.clearRect(0, 0, cv.width, cv.height);
      g.save();
      g.translate(cv.width / 2, cv.height / 2);
      g.scale(cv.width / 78, cv.height / 78);
      if (SPRITES[key]) SPRITES[key](g);
      g.restore();
    }
  }

  /* ================= 覆盖层 ================= */
  function showOverlay(html, wide) {
    el.overlay.innerHTML = '<div class="ov-card' + (wide ? ' wide' : '') + '">' + html + '</div>';
    el.overlay.hidden = false;
    paintIcons();
  }
  function hideOverlay() { el.overlay.hidden = true; }

  function selectHTML() {
    var cards = '';
    ORDER.forEach(function (k) {
      var d = PLANTS[k];
      var sel = state.chosen.indexOf(k) >= 0 ? ' sel' : '';
      cards += '<button class="sel-card' + sel + '" data-pick="' + k + '" type="button">' +
        '<canvas data-sprite="' + k + '" width="92" height="92" aria-hidden="true"></canvas>' +
        '<b>' + d.name + '</b><small class="cost">' + d.cost + '</small><small>' + d.tag + '</small></button>';
    });
    return '<h3>选择你的 6 件道具</h3>' +
      '<p>敌人从右边楼道冲进来，守住左边的被窝。每行有一双拖鞋做最后防线，被窝耐久只有 3 点。</p>' +
      '<div class="select-grid">' + cards + '</div>' +
      '<div class="sel-count">已选 <b id="selCount">' + state.chosen.length + '</b> / 6 　（开局后不能更换，除非重选）</div>' +
      '<div class="ov-btns"><button class="btn primary" id="startBtn" type="button"' +
      (state.chosen.length === 6 ? '' : ' disabled') + '>开始防守</button>' +
      '<button class="btn ghost" id="presetBtn" type="button">推荐阵容</button>' +
      '<a class="btn ghost" href="arcade.html">回游戏厅</a></div>';
  }

  function showSelect() {
    state.phase = 'select';
    state.selected = null;
    state.shovelMode = false;
    showOverlay(selectHTML(), true);
    el.deck.innerHTML = '';
    if (el.shovel) el.shovel.classList.remove('active');
    syncHud();
  }

  function bindSelect() {
    var cards = el.overlay.querySelectorAll('[data-pick]');
    for (var i = 0; i < cards.length; i++) {
      cards[i].addEventListener('click', function () {
        var k = this.getAttribute('data-pick');
        var idx = state.chosen.indexOf(k);
        if (idx >= 0) state.chosen.splice(idx, 1);
        else if (state.chosen.length < 6) state.chosen.push(k);
        else { beep(180, 0.06, 'square'); toast('最多只能带 6 件道具'); return; }
        beep(idx >= 0 ? 420 : 760, 0.05, 'triangle');
        showOverlay(selectHTML(), true);
        bindSelect();
      });
    }
    var preset = document.getElementById('presetBtn');
    if (preset) preset.addEventListener('click', function () {
      state.chosen = DEFAULT_DECK.slice();
      showOverlay(selectHTML(), true);
      bindSelect();
    });
    var start = document.getElementById('startBtn');
    if (start) start.addEventListener('click', function () {
      if (state.chosen.length !== 6) return;
      startRun();
    });
  }

  /* ================= 开局 / 结束 ================= */
  function resetRun() {
    state.cal = 175;
    state.hearts = 3;
    state.score = 0;
    state.wave = 0;
    state.waveTimer = 8;
    state.waveActive = false;
    state.spawnQueue = [];
    state.waveClock = 0;
    state.plants = [];
    state.enemies = [];
    state.shots = [];
    state.beams = [];
    state.suns = [];
    state.photos = [];
    state.fx = [];
    state.t = 0;
    state.shake = 0;
    state.bedHit = 0;
    state.selected = null;
    state.shovelMode = false;
    state.cooldowns = {};
    state.timeScale = 1;
    state.sunTimer = 5.5;
    state.photoTimer = 14;
    state.banner = { text: '睡吧…… 我们守住', life: 2.2 };
    state.mowers = [];
    for (var i = 0; i < ROWS; i++) state.mowers.push({ used: false, running: false, x: 0 });
    state.deck.forEach(function (k) { state.cooldowns[k] = 0; });
    if (el.speed) el.speed.textContent = '加速';
    if (el.pause) el.pause.textContent = '暂停';
    if (el.shovel) el.shovel.classList.remove('active');
  }

  function startRun() {
    state.deck = state.chosen.slice();
    resetRun();
    state.phase = 'playing';
    hideOverlay();
    buildDeck();
    syncHud();
    beep(660, 0.09, 'square');
  }

  function endGame(win) {
    if (state.phase === 'over' || state.phase === 'win') return;
    state.phase = win ? 'win' : 'over';
    if (state.score > state.best) {
      state.best = state.score;
      try { localStorage.setItem('ppr-game-best', String(state.best)); } catch (e) { /* ignore */ }
    }
    var stats = '<p>得分 <b>' + state.score + '</b>　最佳 <b>' + state.best + '</b><br>' +
      '坚持到第 <b>' + Math.max(1, state.wave) + '</b> 波　剩余被窝 <b>' + Math.max(0, state.hearts) + '</b> 点</p>';
    if (win) {
      showOverlay('<img class="ov-photo wide" src="assets/sleep.jpg" alt="睡着的配泼睿">' +
        '<h3>🎉 守住了 10 波</h3><p>辅导员被你挡了回去。<br>配泼睿翻了个身，嘟囔「我下的任务罢了」，继续睡。</p>' + stats +
        '<div class="ov-btns"><button class="btn primary" data-act="restart" type="button">再来一局</button>' +
        '<button class="btn ghost" data-act="select" type="button">换个阵容</button>' +
        '<a class="btn ghost" href="arcade.html">回游戏厅</a></div>');
      beep(660, 0.1, 'square');
      setTimeout(function () { beep(880, 0.12, 'square'); }, 130);
      setTimeout(function () { beep(1180, 0.2, 'square'); }, 280);
    } else {
      showOverlay('<img class="ov-photo" src="assets/yare.jpg" alt="配泼睿：呀嘞呀嘞">' +
        '<h3>😱 被窝被掀了</h3><p>室友成功把他叫醒，他现在的表情是「呀嘞呀嘞」。</p>' + stats +
        '<div class="ov-btns"><button class="btn primary" data-act="restart" type="button">再守一次</button>' +
        '<button class="btn ghost" data-act="select" type="button">换个阵容</button>' +
        '<a class="btn ghost" href="arcade.html">回游戏厅</a></div>');
      beep(160, 0.3, 'sawtooth');
    }
    syncHud();
  }

  function togglePause(force) {
    if (state.phase !== 'playing' && state.phase !== 'paused') return;
    var toPaused = typeof force === 'boolean' ? force : state.phase === 'playing';
    if (toPaused) {
      state.phase = 'paused';
      showOverlay('<h3>已暂停</h3><p>配泼睿趁你暂停翻了个身。<br>他已经睡了 ' + Math.floor(state.t) + ' 秒。</p>' +
        '<div class="ov-btns"><button class="btn primary" data-act="resume" type="button">继续</button>' +
        '<button class="btn ghost" data-act="restart" type="button">重开这局</button>' +
        '<button class="btn ghost" data-act="select" type="button">重新选卡</button></div>');
      if (el.pause) el.pause.textContent = '继续';
    } else {
      state.phase = 'playing';
      hideOverlay();
      if (el.pause) el.pause.textContent = '暂停';
    }
  }

  /* ================= 卡槽 ================= */
  function buildDeck() {
    el.deck.innerHTML = '';
    state.deck.forEach(function (k) {
      var d = PLANTS[k];
      var b = document.createElement('button');
      b.className = 'pcard';
      b.type = 'button';
      b.setAttribute('data-plant', k);
      b.title = d.name + '：' + d.tag;
      b.innerHTML = '<canvas class="picon" data-sprite="' + k + '" width="84" height="84" aria-hidden="true"></canvas>' +
        '<span class="pn">' + d.name + '</span><span class="pc">' + d.cost + '</span><span class="cdm"></span>';
      b.addEventListener('click', function () {
        if (state.phase !== 'playing') return;
        if (b.classList.contains('disabled')) { beep(180, 0.05, 'square'); return; }
        state.shovelMode = false;
        if (el.shovel) el.shovel.classList.remove('active');
        state.selected = state.selected === k ? null : k;
        beep(720, 0.05, 'triangle');
        syncCards();
      });
      el.deck.appendChild(b);
    });
    paintIcons();
  }

  function syncCards() {
    if (!el.deck) return;
    var cards = el.deck.querySelectorAll('.pcard');
    for (var i = 0; i < cards.length; i++) {
      var btn = cards[i];
      var k = btn.getAttribute('data-plant');
      var def = PLANTS[k];
      var cd = state.cooldowns[k] || 0;
      var pct = def.cd ? Math.min(100, (cd / def.cd) * 100) : 0;
      btn.style.setProperty('--cd', pct.toFixed(1) + '%');
      btn.classList.toggle('sel', state.selected === k);
      btn.classList.toggle('disabled', state.phase !== 'playing' || state.cal < def.cost || cd > 0);
    }
  }

  function syncHud() {
    if (el.cal) el.cal.textContent = String(Math.floor(state.cal));
    if (el.hearts) el.hearts.textContent = String(Math.max(0, state.hearts));
    if (el.wave) el.wave.textContent = Math.max(0, state.wave) + ' / ' + WAVES.length;
    if (el.score) el.score.textContent = String(state.score);
    if (el.best) el.best.textContent = String(Math.max(state.best, state.score));

    var prog = 0;
    if (state.phase === 'win') prog = 1;
    else if (state.waveActive) prog = ((state.wave - 1) + Math.min(1, state.waveClock / WAVES[state.wave - 1].dur)) / WAVES.length;
    else prog = state.wave / WAVES.length;
    if (el.waveFill) el.waveFill.style.width = Math.round(Math.max(0, Math.min(1, prog)) * 100) + '%';

    if (el.waveLabel) {
      var label;
      if (state.phase === 'select') label = '选择道具后开始';
      else if (state.phase === 'paused') label = '已暂停';
      else if (state.phase === 'over') label = '被窝失守';
      else if (state.phase === 'win') label = '守住了！';
      else if (!state.wave) label = '准备：' + Math.ceil(state.waveTimer) + ' 秒后第一波';
      else if (state.waveActive) label = '第 ' + state.wave + ' 波 · 剩余 ' + (state.spawnQueue.length + state.enemies.length);
      else label = '第 ' + state.wave + ' 波已清 · ' + Math.ceil(state.waveTimer) + ' 秒后下一波';
      el.waveLabel.textContent = label;
    }
    syncCards();
  }

  function addFx(x, y, text, color) { state.fx.push({ x: x, y: y, text: text, color: color || INK, life: 1, vy: -32 }); }

  /* ================= 波次 ================= */
  function startWave(n) {
    var w = WAVES[n - 1];
    state.wave = n;
    state.waveClock = 0;
    state.waveActive = true;
    state.spawnQueue = [];
    var hpScale = 1 + (n - 1) * 0.1;
    w.list.forEach(function (pair) {
      for (var i = 0; i < pair[1]; i++) {
        state.spawnQueue.push({ type: pair[0], row: Math.floor(Math.random() * ROWS), time: rnd(0.2, w.dur), hpScale: hpScale });
      }
    });
    state.spawnQueue.sort(function (a, b) { return a.time - b.time; });
    state.banner = { text: n === WAVES.length ? '最后一波 · 辅导员来了！' : '第 ' + n + ' 波来袭', life: 2 };
    beep(320, 0.12, 'sawtooth');
  }

  function spawnEnemy(type, row, hpScale, mini, xOverride) {
    var def = ENEMIES[type];
    if (!def) return;
    var hp = def.hp * (hpScale || 1) * (mini ? 0.35 : 1);
    state.enemies.push({
      type: type, def: def, row: row,
      x: typeof xOverride === 'number' ? xOverride : W - rnd(8, 30),
      hp: hp, maxHp: hp,
      speed: def.speed * (mini ? 1.25 : 1),
      dmg: def.dmg,
      armor: def.armor || 0,
      scale: mini ? 0.8 : (def.boss ? 1.45 : 1),
      mini: !!mini,
      eat: rnd(0, 0.5),
      hurt: 0,
      slowUntil: 0,
      lastScream: 0
    });
  }

  /* ================= 更新 ================= */
  function update(dt) {
    state.t += dt;
    if (state.shake > 0) state.shake = Math.max(0, state.shake - dt * 3);
    if (state.bedHit > 0) state.bedHit = Math.max(0, state.bedHit - dt * 2);
    if (state.banner) {
      state.banner.life -= dt;
      if (state.banner.life <= 0) state.banner = null;
    }
    state.deck.forEach(function (k) {
      if (state.cooldowns[k] > 0) state.cooldowns[k] = Math.max(0, state.cooldowns[k] - dt);
    });

    state.sunTimer -= dt;
    if (state.sunTimer <= 0) { state.sunTimer = rnd(5.5, 7.5); spawnSun(); }
    state.photoTimer -= dt;
    if (state.photoTimer <= 0) { state.photoTimer = rnd(18, 26); spawnPhoto(); }

    if (state.waveActive) {
      state.waveClock += dt;
      while (state.spawnQueue.length && state.spawnQueue[0].time <= state.waveClock) {
        var s = state.spawnQueue.shift();
        spawnEnemy(s.type, s.row, s.hpScale);
      }
      if (!state.spawnQueue.length && !state.enemies.length) {
        state.waveActive = false;
        state.score += 50;
        if (state.wave >= WAVES.length) { endGame(true); return; }
        state.waveTimer = 8;
        state.banner = { text: '第 ' + state.wave + ' 波清除 +50', life: 1.8 };
        beep(880, 0.1, 'triangle');
      }
    } else if (state.wave < WAVES.length) {
      state.waveTimer -= dt;
      if (state.waveTimer <= 0) startWave(state.wave + 1);
    }

    updatePlants(dt);
    updateEnemies(dt);
    updateShots(dt);
    updateBeams(dt);
    updateMowers(dt);
    updateSuns(dt);
    updatePhotos(dt);
    updateFx(dt);
    state.hudClock += dt;
    if (state.hudClock > 0.1) { state.hudClock = 0; syncHud(); }
  }

  function updatePlants(dt) {
    for (var i = state.plants.length - 1; i >= 0; i--) {
      var p = state.plants[i];
      if (p.hp <= 0) { state.plants.splice(i, 1); continue; }
      if (p.stun > 0) { p.stun -= dt; continue; }

      if (p.kind === 'bomb') {
        p.fuse -= dt;
        if (p.fuse <= 0) { explode(p); state.plants.splice(i, 1); }
        continue;
      }
      if (p.kind === 'producer') {
        p.timer -= dt;
        if (p.timer <= 0) {
          p.timer = p.interval;
          state.cal += p.produce;
          addFx(cxOf(p), cyOf(p) - 22, '+' + p.produce, '#b8860b');
          beep(940, 0.05, 'sine');
        }
      }
      if (p.kind === 'shooter' || p.kind === 'pierce') {
        var target = null;
        for (var j = 0; j < state.enemies.length; j++) {
          var e = state.enemies[j];
          if (e.row === p.row && e.x > cxOf(p) - 30) { target = e; break; }
        }
        if (target) {
          p.timer -= dt;
          if (p.timer <= 0) {
            p.timer = p.interval;
            if (p.kind === 'pierce') fireBeam(p);
            else fire(p);
          }
        } else if (p.timer > 0.3) {
          p.timer = 0.3;
        }
      }
      if (p.kind === 'slow') {
        for (var k = 0; k < state.enemies.length; k++) {
          if (state.enemies[k].row === p.row) state.enemies[k].slowUntil = state.t + 0.5;
        }
      }
    }
  }

  function fire(p) {
    var n = p.shots || 1;
    for (var i = 0; i < n; i++) {
      state.shots.push({
        x: cxOf(p) + 18 + i * 12,
        y: cyOf(p) - 8 + (n > 1 ? (i ? 6 : -6) : 0),
        row: p.row, dmg: p.dmg, vx: 430, spin: rnd(0, 6)
      });
    }
    beep(1180, 0.02, 'sine');
  }

  function fireBeam(p) {
    var y = cyOf(p) - 4;
    var x0 = cxOf(p) + 16;
    var hitAny = false;
    for (var i = 0; i < state.enemies.length; i++) {
      var e = state.enemies[i];
      if (e.row !== p.row) continue;
      if (e.x < x0) continue;
      damageEnemy(e, p.dmg);
      hitAny = true;
    }
    state.beams.push({ x0: x0, x1: W, y: y, life: 0.22 });
    beep(hitAny ? 1500 : 900, 0.05, 'sawtooth');
  }

  function damageEnemy(e, dmg) {
    var real = dmg * (1 - (e.armor || 0));
    e.hp -= real;
    e.hurt = 0.12;
    addFx(e.x + rnd(-6, 6), rowY(e.row) - 30 * (e.scale || 1), '-' + Math.round(real), '#d1342a');
    if (e.hp <= 0) killEnemy(e);
  }

  function killEnemy(e) {
    var idx = state.enemies.indexOf(e);
    if (idx < 0) return;
    state.enemies.splice(idx, 1);
    state.score += e.def.reward;
    addFx(e.x, rowY(e.row) - 30, '+' + e.def.reward, '#1e7a46');
    for (var i = 0; i < 3; i++) addFx(e.x + rnd(-14, 14), rowY(e.row) + rnd(-14, 14), '💥', '#d1342a');
    if (e.def.split && !e.mini && state.enemies.length < 34) {
      spawnEnemy(e.type, e.row, 1, true, e.x + 10);
      spawnEnemy(e.type, e.row, 1, true, e.x + 26);
      addFx(e.x, rowY(e.row) - 56, '分！', '#7a6ad0');
      beep(520, 0.06, 'square');
    }
  }

  function updateEnemies(dt) {
    for (var i = state.enemies.length - 1; i >= 0; i--) {
      var e = state.enemies[i];
      if (!e || e.hp <= 0) { if (e) killEnemy(e); continue; }
      if (e.hurt > 0) e.hurt -= dt;

      if (e.def.scream && state.t - e.lastScream > 6) {
        e.lastScream = state.t;
        var stunned = false;
        for (var pi = 0; pi < state.plants.length; pi++) {
          if (state.plants[pi].row === e.row) { state.plants[pi].stun = 1.2; stunned = true; }
        }
        if (stunned) {
          addFx(e.x - 30, rowY(e.row) - 70, '安静！', '#d1342a');
          beep(220, 0.2, 'sawtooth');
        }
      }

      var block = null;
      for (var j = 0; j < state.plants.length; j++) {
        var p = state.plants[j];
        if (p.row !== e.row) continue;
        if (Math.abs(cxOf(p) - e.x) < CW * 0.48) { block = p; break; }
      }

      if (block) {
        e.eat -= dt;
        if (e.eat <= 0) {
          e.eat = 0.55;
          block.hp -= e.dmg;
          addFx(e.x - 16, rowY(e.row) - 8, '💥', '#d1342a');
          beep(200, 0.04, 'sawtooth');
          if (block.hp <= 0) {
            var bi = state.plants.indexOf(block);
            if (bi >= 0) state.plants.splice(bi, 1);
          }
        }
      } else {
        var slow = e.slowUntil > state.t;
        e.x -= e.speed * (slow ? 0.55 : 1) * dt;
        checkBed(e);
      }
    }
  }

  function checkBed(e) {
    var m = state.mowers[e.row];
    if (m && m.running) return;
    if (e.x < GX - 2 && m && !m.used) {
      m.running = true;
      m.x = GX - 52;
      state.shake = 0.5;
      beep(140, 0.18, 'square');
      addFx(GX + 10, rowY(e.row) - 24, '拖鞋出击！', '#d1342a');
      for (var i = state.enemies.length - 1; i >= 0; i--) {
        if (state.enemies[i].row === e.row && state.enemies[i].x < GX + 60) killEnemy(state.enemies[i]);
      }
      return;
    }
    if (e.x < GX - 30) {
      var mi = state.enemies.indexOf(e);
      if (mi >= 0) state.enemies.splice(mi, 1);
      state.hearts -= e.def.boss ? 2 : 1;
      state.bedHit = 1;
      state.shake = 0.8;
      addFx(GX + 30, rowY(e.row) - 20, '被窝被掀了！', '#d1342a');
      beep(120, 0.28, 'sawtooth');
      if (state.hearts <= 0) { state.hearts = 0; endGame(false); }
    }
  }

  function updateMowers(dt) {
    for (var r = 0; r < state.mowers.length; r++) {
      var m = state.mowers[r];
      if (!m.running) continue;
      m.x += 620 * dt;
      for (var i = state.enemies.length - 1; i >= 0; i--) {
        var e = state.enemies[i];
        if (e.row === r && Math.abs(e.x - m.x) < 52) killEnemy(e);
      }
      if (m.x > W + 40) { m.running = false; m.used = true; }
    }
  }

  function updateShots(dt) {
    for (var i = state.shots.length - 1; i >= 0; i--) {
      var s = state.shots[i];
      s.x += s.vx * dt;
      s.spin += dt * 12;
      if (s.x > W + 20) { state.shots.splice(i, 1); continue; }
      for (var j = 0; j < state.enemies.length; j++) {
        var e = state.enemies[j];
        if (e.row !== s.row) continue;
        if (s.x > e.x - 26 * (e.scale || 1) && s.x < e.x + 20) {
          damageEnemy(e, s.dmg);
          state.shots.splice(i, 1);
          beep(560, 0.02, 'square');
          break;
        }
      }
    }
  }

  function updateBeams(dt) {
    for (var i = state.beams.length - 1; i >= 0; i--) {
      state.beams[i].life -= dt;
      if (state.beams[i].life <= 0) state.beams.splice(i, 1);
    }
  }

  function explode(p) {
    var x = cxOf(p), row = p.row;
    state.shake = 0.7;
    for (var i = state.enemies.length - 1; i >= 0; i--) {
      var e = state.enemies[i];
      if (Math.abs(e.row - row) <= 1 && Math.abs(e.x - x) < 140) damageEnemy(e, p.dmg);
    }
    for (var k = 0; k < 8; k++) addFx(x + rnd(-40, 40), cyOf(p) + rnd(-30, 30), '💥', '#d1342a');
    beep(150, 0.26, 'square');
  }

  function spawnSun() {
    state.suns.push({ x: rnd(GX + 40, GRID_R - 40), y: -30, ty: rnd(GY + 50, GRID_B - 30), value: Math.random() < 0.12 ? 50 : 25, life: 11 });
  }
  function updateSuns(dt) {
    for (var i = state.suns.length - 1; i >= 0; i--) {
      var s = state.suns[i];
      if (s.y < s.ty) s.y = Math.min(s.ty, s.y + 76 * dt);
      else { s.life -= dt; if (s.life <= 0) state.suns.splice(i, 1); }
    }
  }

  function spawnPhoto() {
    state.photos.push({
      x: rnd(GX + 60, GRID_R - 50),
      y: -46, ty: rnd(GY + 60, GRID_B - 40),
      vy: 60, life: 12, rot: rnd(-0.2, 0.2), value: 50
    });
  }
  function updatePhotos(dt) {
    for (var i = state.photos.length - 1; i >= 0; i--) {
      var p = state.photos[i];
      if (p.y < p.ty) p.y = Math.min(p.ty, p.y + p.vy * dt);
      else { p.life -= dt; if (p.life <= 0) state.photos.splice(i, 1); }
    }
  }

  function updateFx(dt) {
    for (var i = state.fx.length - 1; i >= 0; i--) {
      var f = state.fx[i];
      f.y += f.vy * dt;
      f.life -= dt;
      if (f.life <= 0) state.fx.splice(i, 1);
    }
  }

  /* ================= 放置 / 移除 ================= */
  function place(key, row, col) {
    var def = PLANTS[key];
    if (!def) return;
    var occupied = state.plants.some(function (p) { return p.row === row && p.col === col; });
    if (occupied) { addFx(GX + col * CW + CW / 2, GY + row * CH + CH / 2, '这里有东西', '#6b5847'); beep(180, 0.06, 'square'); return; }
    if (state.cal < def.cost) { addFx(GX + col * CW + CW / 2, GY + row * CH + CH / 2, '卡路里不够', '#d1342a'); beep(180, 0.06, 'square'); return; }
    if (state.cooldowns[key] > 0) return;
    state.cal -= def.cost;
    state.cooldowns[key] = def.cd;
    state.plants.push({
      key: key, kind: def.kind, row: row, col: col,
      hp: def.hp, maxHp: def.hp, timer: 0, stun: 0,
      interval: def.interval || 0, dmg: def.dmg || 0,
      shots: def.shots || 1, produce: def.produce || 0, fuse: def.fuse || 0
    });
    beep(520, 0.07, 'triangle');
    state.selected = null;
    syncCards();
  }

  function removePlant(p) {
    var def = PLANTS[p.key];
    var idx = state.plants.indexOf(p);
    if (idx < 0) return;
    state.plants.splice(idx, 1);
    var refund = Math.floor((def ? def.cost : 0) * 0.5);
    state.cal += refund;
    addFx(cxOf(p), cyOf(p) - 10, '退 ' + refund, '#6b5847');
    beep(300, 0.06, 'triangle');
  }

  function pickAt(x, y) {
    var col = Math.floor((x - GX) / CW);
    var row = Math.floor((y - GY) / CH);
    if (col < 0 || col >= COLS || row < 0 || row >= ROWS) return null;
    for (var i = 0; i < state.plants.length; i++) {
      var p = state.plants[i];
      if (p.row === row && p.col === col) return p;
    }
    return null;
  }

  /* ================= 绘制 ================= */
  function draw() {
    ctx.save();
    if (state.shake > 0) ctx.translate(rnd(-4, 4), rnd(-4, 4));

    drawBg();
    drawMowers();
    drawPlants();
    drawShots();
    drawBeams();
    drawEnemies();
    drawSuns();
    drawPhotos();
    drawFx();
    drawGhost();
    drawBanner();
    drawBedHit();

    ctx.restore();
  }

  function drawBg() {
    var g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#f3f7ec');
    g.addColorStop(1, '#e3ecd8');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);

    for (var r = 0; r < ROWS; r++) {
      for (var c = 0; c < COLS; c++) {
        ctx.fillStyle = ((r + c) % 2 === 0) ? '#e6efdb' : '#dce9d0';
        ctx.fillRect(GX + c * CW, GY + r * CH, CW, CH);
      }
    }
    ctx.strokeStyle = 'rgba(36,28,22,.1)';
    ctx.lineWidth = 1;
    for (var c2 = 0; c2 <= COLS; c2++) {
      ctx.beginPath(); ctx.moveTo(GX + c2 * CW, GY); ctx.lineTo(GX + c2 * CW, GRID_B); ctx.stroke();
    }
    for (var r2 = 0; r2 <= ROWS; r2++) {
      ctx.beginPath(); ctx.moveTo(GX, GY + r2 * CH); ctx.lineTo(GRID_R, GY + r2 * CH); ctx.stroke();
    }
    ctx.strokeStyle = 'rgba(255,255,255,.45)';
    ctx.setLineDash([6, 8]);
    ctx.lineWidth = 1.5;
    for (var r3 = 0; r3 <= ROWS; r3++) {
      ctx.beginPath(); ctx.moveTo(GX, GY + r3 * CH + 4); ctx.lineTo(GRID_R, GY + r3 * CH + 4); ctx.stroke();
    }
    ctx.setLineDash([]);

    var bg = ctx.createLinearGradient(0, 0, GX, 0);
    bg.addColorStop(0, '#a9c9ec');
    bg.addColorStop(1, '#d2e4f8');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, GX, H);
    ctx.setLineDash([9, 7]);
    ctx.strokeStyle = 'rgba(36,28,22,.35)';
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(GX, 0); ctx.lineTo(GX, H); ctx.stroke();
    ctx.setLineDash([]);


    
    drawPortrait(8, 26, 74, -0.05);

    ctx.font = '15px ' + FONT;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (var hi = 0; hi < 3; hi++) {
      ctx.globalAlpha = hi < state.hearts ? 1 : 0.22;
      ctx.fillStyle = '#d1342a';
      ctx.fillText('❤', 26 + hi * 20, H * 0.44 - 22);
    }
    ctx.globalAlpha = 1;



    var rg = ctx.createLinearGradient(GRID_R, 0, W, 0);
    rg.addColorStop(0, '#d9cdb6');
    rg.addColorStop(1, '#b9a888');
    ctx.fillStyle = rg;
    ctx.fillRect(GRID_R, 0, W - GRID_R, H);
    drawSprite('door', GRID_R + (W - GRID_R) / 2, H * 0.32, 52);
    ctx.save();
    ctx.translate(W - 24, H * 0.62);
    ctx.rotate(Math.PI / 2);
    ctx.font = '700 15px ' + FONT;
    ctx.fillStyle = 'rgba(36,28,22,.55)';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('楼道 · 危险', 0, 0);
    ctx.restore();

    ctx.fillStyle = '#d8c39d';
    ctx.fillRect(0, H - 26, W, 26);
  }

  function drawPortrait(x, y, size, rot) {
    ctx.save();
    ctx.translate(x + size / 2, y + size / 2);
    if (rot) ctx.rotate(rot);
    ctx.fillStyle = '#fff';
    rr(ctx, -size / 2, -size / 2, size, size + 15, 4); ctx.fill();
    ctx.strokeStyle = INK; ctx.lineWidth = 2.4; ctx.stroke();
    var pad = 4;
    ctx.save();
    rr(ctx, -size / 2 + pad, -size / 2 + pad, size - pad * 2, size - pad * 2, 3);
    ctx.clip();
    var im = IMG.sleep;
    if (im && im.complete && im.naturalWidth) {
      ctx.drawImage(im, -size / 2 + pad, -size / 2 + pad, size - pad * 2, size - pad * 2);
    } else {
      ctx.fillStyle = '#cfe2f7';
      ctx.fillRect(-size / 2, -size / 2, size, size);
      drawSprite('sleep', 0, 0, size * 0.85);
    }
    ctx.restore();
    ctx.fillStyle = 'rgba(36,28,22,.6)';
    ctx.font = '700 9px ' + FONT;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('守护目标', 0, size / 2 + 7);
    ctx.restore();
  }

  function drawMowers() {
    for (var r = 0; r < ROWS; r++) {
      var m = state.mowers[r];
      if (!m || (m.used && !m.running)) continue;
      var x = m.running ? m.x : GX - 52;
      var y = rowY(r) + 14;
      if (m.running) {
        ctx.fillStyle = 'rgba(80,60,40,.22)';
        for (var d = 0; d < 3; d++) {
          circ(ctx, x - 26 - d * 16, y - 6 + rnd(-4, 4), 5 - d);
          ctx.fill();
        }
      }
      drawSprite('slipper', x, y, 46);
    }
  }

  function drawPlants() {
    for (var i = 0; i < state.plants.length; i++) {
      var p = state.plants[i];
      var x = cxOf(p), y = cyOf(p);
      var bob = Math.sin(state.t * 2.2 + p.col * 0.9 + p.row) * 2;
      ctx.fillStyle = 'rgba(36,28,22,.12)';
      ctx.beginPath();
      ctx.ellipse(x, y + 30, 24, 7, 0, 0, Math.PI * 2);
      ctx.fill();
      drawSprite(p.key, x, y + bob, p.kind === 'wall' ? 64 : 56);
      if (p.hp < p.maxHp && p.maxHp < 5000) {
        ctx.fillStyle = 'rgba(36,28,22,.28)';
        rr(ctx, x - 22, y + 34, 44, 4, 2); ctx.fill();
        ctx.fillStyle = '#3f8f4f';
        rr(ctx, x - 22, y + 34, Math.max(2, 44 * Math.max(0, p.hp / p.maxHp)), 4, 2); ctx.fill();
      }
      if (p.stun > 0) {
        ctx.fillStyle = '#d1342a';
        ctx.font = '900 13px ' + FONT;
        ctx.textAlign = 'center';
        ctx.fillText('!', x + 18, y - 30);
      }
      if (p.kind === 'bomb') {
        ctx.save();
        ctx.globalAlpha = 0.6 + Math.abs(Math.sin(state.t * 10)) * 0.4;
        ctx.fillStyle = '#ffb703';
        circ(ctx, x + 20, y - 26, 4); ctx.fill();
        ctx.restore();
      }
    }
  }

  function drawShots() {
    for (var i = 0; i < state.shots.length; i++) {
      var s = state.shots[i];
      drawSprite('sock', s.x, s.y, 22, s.spin);
    }
  }

  function drawBeams() {
    for (var i = 0; i < state.beams.length; i++) {
      var b = state.beams[i];
      var a = Math.max(0, b.life / 0.22);
      ctx.save();
      ctx.globalAlpha = a;
      ctx.strokeStyle = '#ffd93b';
      ctx.lineWidth = 6;
      ctx.shadowColor = '#ffd93b';
      ctx.shadowBlur = 14;
      line(ctx, b.x0, b.y, b.x1, b.y);
      ctx.strokeStyle = '#fff8e6';
      ctx.lineWidth = 2;
      line(ctx, b.x0, b.y, b.x1, b.y);
      ctx.restore();
    }
  }

  function drawEnemies() {
    for (var i = 0; i < state.enemies.length; i++) {
      var e = state.enemies[i];
      var y = rowY(e.row);
      var sc = e.scale || 1;
      var walk = Math.sin(state.t * 9 + e.x * 0.08);

      ctx.fillStyle = 'rgba(36,28,22,.16)';
      ctx.beginPath();
      ctx.ellipse(e.x, y + 30, 22 * sc, 6 * sc, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.save();
      if (e.hurt > 0) ctx.globalAlpha = 0.6;

      if (e.type === 'alarm') {
        drawSprite('alarm', e.x, y - 2 + walk * 1.5, 40 * sc);
      } else {
        var bodyTop = y - 12 * sc;
        ctx.strokeStyle = INK;
        ctx.lineWidth = 4 * sc;
        ctx.lineCap = 'round';
        line(ctx, e.x - 5 * sc, bodyTop + 24 * sc, e.x - 6 * sc + walk * 4, y + 28);
        line(ctx, e.x + 5 * sc, bodyTop + 24 * sc, e.x + 6 * sc - walk * 4, y + 28);
        ctx.fillStyle = '#2f6fb0';
        circ(ctx, e.x - 6 * sc + walk * 4, y + 30, 4.5 * sc); ctx.fill();
        circ(ctx, e.x + 6 * sc - walk * 4, y + 30, 4.5 * sc); ctx.fill();

        if (e.def.skirt) {
          ctx.beginPath();
          ctx.moveTo(e.x - 10 * sc, bodyTop);
          ctx.lineTo(e.x + 10 * sc, bodyTop);
          ctx.lineTo(e.x + 17 * sc, bodyTop + 28 * sc);
          ctx.lineTo(e.x - 17 * sc, bodyTop + 28 * sc);
          ctx.closePath();
        } else {
          rr(ctx, e.x - 11 * sc, bodyTop, 22 * sc, 28 * sc, 8 * sc);
        }
        ctx.fillStyle = e.def.shirt;
        ctx.fill();
        ctx.strokeStyle = INK;
        ctx.lineWidth = 2.6 * sc;
        ctx.stroke();

        if (e.def.boss) {
          ctx.fillStyle = '#d1342a';
          ctx.beginPath();
          ctx.moveTo(e.x, bodyTop + 4 * sc);
          ctx.lineTo(e.x - 3 * sc, bodyTop + 11 * sc);
          ctx.lineTo(e.x, bodyTop + 18 * sc);
          ctx.lineTo(e.x + 3 * sc, bodyTop + 11 * sc);
          ctx.closePath();
          ctx.fill();
        }

        ctx.strokeStyle = INK;
        ctx.lineWidth = 3 * sc;
        line(ctx, e.x - 11 * sc, bodyTop + 6 * sc, e.x - 17 * sc + walk * 3, bodyTop + 18 * sc);
        line(ctx, e.x + 11 * sc, bodyTop + 6 * sc, e.x + 17 * sc - walk * 3, bodyTop + 18 * sc);

        if (e.def.prop === 'box') {
          ctx.fillStyle = '#c99a63';
          rr(ctx, e.x + 10 * sc, bodyTop + 8 * sc, 20 * sc, 16 * sc, 2); ctx.fill();
          ctx.strokeStyle = INK; ctx.lineWidth = 2 * sc; ctx.stroke();
          ctx.strokeStyle = 'rgba(36,28,22,.4)'; ctx.lineWidth = 2;
          line(ctx, e.x + 20 * sc, bodyTop + 8 * sc, e.x + 20 * sc, bodyTop + 24 * sc);
        }
        if (e.def.prop === 'slipper') {
          ctx.save();
          ctx.translate(e.x + 18 * sc, bodyTop + 16 * sc);
          ctx.rotate(-0.35);
          ctx.fillStyle = '#3f7fc4';
          rr(ctx, -9, -4, 18, 9, 4); ctx.fill();
          ctx.strokeStyle = INK; ctx.lineWidth = 2; ctx.stroke();
          ctx.restore();
        }
        if (e.def.prop === 'keys') {
          ctx.strokeStyle = '#c9a227'; ctx.lineWidth = 2.2;
          circ(ctx, e.x + 18 * sc, bodyTop + 16 * sc, 3); ctx.stroke();
          line(ctx, e.x + 18 * sc, bodyTop + 19 * sc, e.x + 18 * sc, bodyTop + 26 * sc);
        }
        if (e.def.boss) {
          ctx.save();
          ctx.translate(e.x + 16 * sc, bodyTop + 10 * sc);
          ctx.rotate(-0.25);
          ctx.fillStyle = '#d1342a';
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.lineTo(15 * sc, -9 * sc);
          ctx.lineTo(15 * sc, 9 * sc);
          ctx.closePath();
          ctx.fill();
          ctx.strokeStyle = INK; ctx.lineWidth = 2; ctx.stroke();
          ctx.restore();
        }

        drawPhotoHead(IMG[e.def.head], e.x, bodyTop - 14 * sc, 16 * sc);

        if (e.def.towelHat) {
          ctx.fillStyle = '#f4f4f0';
          ctx.beginPath();
          ctx.moveTo(e.x - 18 * sc, bodyTop - 26 * sc);
          ctx.quadraticCurveTo(e.x, bodyTop - 44 * sc, e.x + 18 * sc, bodyTop - 26 * sc);
          ctx.lineTo(e.x + 14 * sc, bodyTop - 18 * sc);
          ctx.quadraticCurveTo(e.x, bodyTop - 30 * sc, e.x - 14 * sc, bodyTop - 18 * sc);
          ctx.closePath();
          ctx.fill();
          ctx.strokeStyle = INK;
          ctx.lineWidth = 2;
          ctx.stroke();
        }
      }
      ctx.restore();

      var barW = 34 * sc;
      var by = e.type === 'alarm' ? y - 34 : y - (e.def.boss ? 58 : 46);
      ctx.fillStyle = 'rgba(36,28,22,.28)';
      rr(ctx, e.x - barW / 2, by, barW, 4.5, 2); ctx.fill();
      ctx.fillStyle = e.hp / e.maxHp > 0.5 ? '#3f8f4f' : '#d1342a';
      rr(ctx, e.x - barW / 2, by, Math.max(1.5, barW * Math.max(0, e.hp / e.maxHp)), 4.5, 2); ctx.fill();

      if (e.slowUntil > state.t) snow(ctx, e.x + 16, by - 10, 6);
    }
  }

  function drawSuns() {
    for (var i = 0; i < state.suns.length; i++) {
      var s = state.suns[i];
      var pulse = 1 + Math.sin(state.t * 4 + s.y * 0.05) * 0.05;
      ctx.save();
      ctx.globalAlpha = 0.3;
      ctx.fillStyle = '#ffd93b';
      circ(ctx, s.x, s.y, 30 * pulse); ctx.fill();
      ctx.restore();
      drawSprite('sun', s.x, s.y, 44 * pulse, Math.sin(state.t * 1.2) * 0.06);
    }
  }

  function drawPhotos() {
    for (var i = 0; i < state.photos.length; i++) {
      var p = state.photos[i];
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot + Math.sin(state.t * 2 + i) * 0.05);
      ctx.fillStyle = '#fff';
      rr(ctx, -26, -32, 52, 64, 3); ctx.fill();
      ctx.strokeStyle = INK; ctx.lineWidth = 2; ctx.stroke();
      var im = IMG.sleep;
      if (im && im.complete && im.naturalWidth) {
        ctx.drawImage(im, -22, -28, 44, 44);
      } else {
        ctx.fillStyle = '#cfe2f7';
        ctx.fillRect(-22, -28, 44, 44);
      }
      ctx.fillStyle = 'rgba(36,28,22,.55)';
      ctx.font = '700 8px ' + FONT;
      ctx.textAlign = 'center';
      ctx.fillText('+50', 0, 26);
      ctx.restore();
    }
  }

  function drawFx() {
    for (var i = 0; i < state.fx.length; i++) {
      var f = state.fx[i];
      ctx.save();
      ctx.globalAlpha = Math.max(0, Math.min(1, f.life));
      ctx.font = '900 15px ' + FONT;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.lineWidth = 3;
      ctx.strokeStyle = 'rgba(255,253,246,.9)';
      ctx.strokeText(f.text, f.x, f.y);
      ctx.fillStyle = f.color;
      ctx.fillText(f.text, f.x, f.y);
      ctx.restore();
    }
  }

  function drawGhost() {
    if (!state.selected && !state.shovelMode) return;
    if (hover.row < 0 || hover.row >= ROWS || hover.col < 0 || hover.col >= COLS) return;
    var x = GX + hover.col * CW;
    var y = GY + hover.row * CH;
    ctx.save();
    ctx.strokeStyle = state.shovelMode ? 'rgba(36,28,22,.8)' : 'rgba(209,52,42,.75)';
    ctx.lineWidth = 3;
    ctx.setLineDash([7, 6]);
    rr(ctx, x + 3, y + 3, CW - 6, CH - 6, 10);
    ctx.stroke();
    ctx.setLineDash([]);
    if (!state.shovelMode && state.selected) {
      ctx.globalAlpha = 0.45;
      drawSprite(state.selected, x + CW / 2, y + CH / 2, 56);
    }
    ctx.restore();
  }

  function drawBanner() {
    if (!state.banner) return;
    var b = state.banner;
    ctx.save();
    ctx.globalAlpha = Math.min(1, b.life);
    ctx.font = '900 28px ' + FONT;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineWidth = 8;
    ctx.strokeStyle = 'rgba(255,253,246,.9)';
    ctx.strokeText(b.text, W / 2, GY + 40);
    ctx.fillStyle = INK;
    ctx.fillText(b.text, W / 2, GY + 40);
    ctx.restore();
  }

  function drawBedHit() {
    if (state.bedHit <= 0) return;
    ctx.save();
    ctx.globalAlpha = state.bedHit * 0.5;
    ctx.strokeStyle = '#d1342a';
    ctx.lineWidth = 14;
    ctx.strokeRect(7, 7, W - 14, H - 14);
    ctx.restore();
  }

  /* ================= 主循环 ================= */
  var last = 0;
  function frame(ts) {
    if (!last) last = ts;
    var dt = Math.min(0.05, (ts - last) / 1000);
    last = ts;
    if (state.phase === 'playing') update(dt * state.timeScale);
    draw();
    requestAnimationFrame(frame);
  }

  /* ================= 交互 ================= */
  function canvasPos(ev) {
    var rect = canvas.getBoundingClientRect();
    return {
      x: (ev.clientX - rect.left) * (W / rect.width),
      y: (ev.clientY - rect.top) * (H / rect.height)
    };
  }

  canvas.addEventListener('pointerdown', function (ev) {
    if (state.phase !== 'playing') return;
    var pos = canvasPos(ev);

    for (var i = state.photos.length - 1; i >= 0; i--) {
      var ph = state.photos[i];
      if (Math.abs(ph.x - pos.x) < 34 && Math.abs(ph.y - pos.y) < 42) {
        state.cal += ph.value;
        addFx(ph.x, ph.y - 20, '+' + ph.value, '#b8860b');
        state.photos.splice(i, 1);
        beep(1200, 0.07, 'sine');
        return;
      }
    }
    for (var s = state.suns.length - 1; s >= 0; s--) {
      var sun = state.suns[s];
      if (Math.hypot(sun.x - pos.x, sun.y - pos.y) < 34) {
        state.cal += sun.value;
        addFx(sun.x, sun.y - 10, '+' + sun.value, '#b8860b');
        state.suns.splice(s, 1);
        beep(1100, 0.06, 'sine');
        return;
      }
    }

    var col = Math.floor((pos.x - GX) / CW);
    var row = Math.floor((pos.y - GY) / CH);

    if (state.shovelMode) {
      var target = pickAt(pos.x, pos.y);
      if (target) removePlant(target);
      return;
    }
    if (state.selected && col >= 0 && col < COLS && row >= 0 && row < ROWS) {
      place(state.selected, row, col);
    }
  });

  canvas.addEventListener('pointermove', function (ev) {
    var pos = canvasPos(ev);
    hover.col = Math.floor((pos.x - GX) / CW);
    hover.row = Math.floor((pos.y - GY) / CH);
  });
  canvas.addEventListener('pointerleave', function () {
    hover.row = -1;
    hover.col = -1;
  });

  if (el.overlay) {
    el.overlay.addEventListener('click', function (ev) {
      var btn = ev.target.closest ? ev.target.closest('[data-act]') : null;
      if (!btn) return;
      var act = btn.getAttribute('data-act');
      if (act === 'resume') togglePause(false);
      else if (act === 'restart') { if (state.phase !== 'select') startRun(); }
      else if (act === 'select') showSelect();
    });
  }

  if (el.shovel) {
    el.shovel.addEventListener('click', function () {
      if (state.phase !== 'playing') return;
      state.shovelMode = !state.shovelMode;
      if (state.shovelMode) state.selected = null;
      el.shovel.classList.toggle('active', state.shovelMode);
      syncCards();
      beep(state.shovelMode ? 620 : 420, 0.05, 'triangle');
    });
  }
  if (el.pause) el.pause.addEventListener('click', function () { togglePause(); });
  if (el.speed) {
    el.speed.addEventListener('click', function () {
      state.timeScale = state.timeScale === 1 ? 2 : 1;
      el.speed.textContent = state.timeScale === 1 ? '加速' : '正常';
      beep(700, 0.05, 'triangle');
    });
  }
  if (el.restart) {
    el.restart.addEventListener('click', function () {
      if (state.phase === 'select') { startRun(); return; }
      startRun();
      beep(700, 0.08, 'square');
    });
  }

  document.addEventListener('keydown', function (ev) {
    if (ev.code === 'Space') {
      ev.preventDefault();
      if (state.phase === 'select') return;
      togglePause();
      return;
    }
    if (ev.key === 'Escape') {
      state.selected = null;
      state.shovelMode = false;
      if (el.shovel) el.shovel.classList.remove('active');
      syncCards();
      return;
    }
    var n = parseInt(ev.key, 10);
    if (state.phase === 'playing' && n >= 1 && n <= 6) {
      var key = state.deck[n - 1];
      if (!key) return;
      if (state.cal >= PLANTS[key].cost && (state.cooldowns[key] || 0) <= 0) {
        state.selected = key;
        state.shovelMode = false;
        if (el.shovel) el.shovel.classList.remove('active');
        syncCards();
      }
    }
  });

  /* ================= 启动 ================= */
  showSelect();
  bindSelect();
  syncHud();
  draw();
  requestAnimationFrame(frame);

  var qs = location.search;
  if (qs.indexOf('demo') >= 0) {
    startRun();
    state.cal = 600;
    place('milktea', 0, 1);
    place('toy', 2, 2);
    place('glasses', 3, 3);
    place('towel', 1, 5);
    place('ac', 4, 4);
    state.cal = 320;
    state.wave = 4;
    state.waveActive = true;
    state.waveClock = 3;
    ['roommate', 'courier', 'slipper', 'clone'].forEach(function (t, i) {
      spawnEnemy(t, i, 1, false, 640 + i * 60);
    });
    state.enemies.forEach(function (e) { e.hp = e.maxHp * 0.7; });
    syncHud();
    draw();
  } else if (/[?&]sim=(\d+)/.test(qs)) {
    var secs = Math.min(900, parseInt(/[?&]sim=(\d+)/.exec(qs)[1], 10) || 60);
    startRun();
    var has = function (r, c) { return state.plants.some(function (p) { return p.row === r && p.col === c; }); };
    var tryPlace = function (k, r, c) {
      if (state.deck.indexOf(k) < 0) return false;
      if (state.cal < PLANTS[k].cost || (state.cooldowns[k] || 0) > 0) return false;
      if (has(r, c)) return false;
      place(k, r, c);
      return true;
    };
    var ai = function () {
      var r;
      for (r = 0; r < ROWS; r++) if (tryPlace('milktea', r, 0)) return;
      for (r = 0; r < ROWS; r++) if (tryPlace('toy', r, 2)) return;
      for (r = 0; r < ROWS; r++) if (tryPlace('towel', r, 6)) return;
      for (r = 0; r < ROWS; r++) if (tryPlace('glasses', r, 3)) return;
      for (r = 0; r < ROWS; r++) if (tryPlace('ac', r, 4)) return;
    };
    for (var step = 0; step < secs * 20; step++) {
      if (step % 14 === 0) ai();
      update(0.05);
      if (state.phase === 'over' || state.phase === 'win') break;
    }
    syncHud();
    draw();
  }
})();
