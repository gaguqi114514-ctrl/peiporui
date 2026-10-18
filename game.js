/* ============================================================
   保卫被窝 —— 类植物大战僵尸小游戏
   配泼睿在被窝里睡觉，室友们正从右边冲进来，你要守住他。
   所有角色都是 canvas 手绘矢量精灵，不依赖 emoji 字体。
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

  var COLS = 9, ROWS = 5, CW = 88, CH = 92, GX = 96, GY = 56;
  var GRID_R = GX + COLS * CW;
  var GRID_B = GY + ROWS * CH;
  var INK = '#241c16';
  var FONT = '"PingFang SC","Hiragino Sans GB","Microsoft YaHei",sans-serif';

  var PHOTO_SLEEP = new Image();
  PHOTO_SLEEP.src = 'assets/sleep.jpg';

  /* ================= 数据 ================= */
  var PLANTS = {
    milktea: { name: '珍珠奶茶', cost: 50,  hp: 300,  cd: 5,  kind: 'producer', interval: 7.5, produce: 25 },
    towel:   { name: '蓝毛巾',   cost: 25,  hp: 1500, cd: 6,  kind: 'wall' },
    toy:     { name: '玩偶兔',   cost: 100, hp: 320,  cd: 6,  kind: 'shooter', interval: 1.35, dmg: 24, shots: 1 },
    glasses: { name: '眼镜',     cost: 175, hp: 320,  cd: 8,  kind: 'shooter', interval: 1.7,  dmg: 28, shots: 2 },
    ac:      { name: '空调',     cost: 150, hp: 300,  cd: 10, kind: 'slow' },
    alarm:   { name: '闹钟炸弹', cost: 125, hp: 9999, cd: 14, kind: 'bomb', fuse: 1.1, dmg: 900 }
  };
  var ORDER = ['milktea', 'towel', 'toy', 'glasses', 'ac', 'alarm'];

  var ENEMIES = {
    alarm:    { name: '闹钟',     hp: 110, speed: 30, dmg: 4,  reward: 8 },
    roommate: { name: '室友',     hp: 220, speed: 14, dmg: 8,  reward: 10 },
    courier:  { name: '快递小哥', hp: 170, speed: 24, dmg: 6,  reward: 12 },
    slipper:  { name: '拖鞋室友', hp: 340, speed: 12, dmg: 10, reward: 15 },
    auntie:   { name: '宿管阿姨', hp: 560, speed: 9,  dmg: 14, reward: 25 },
    boss:     { name: '辅导员',   hp: 2400, speed: 7, dmg: 20, reward: 120, big: true }
  };

  var WAVES = [
    { duration: 8,  list: [['roommate', 3]] },
    { duration: 10, list: [['roommate', 4], ['alarm', 2]] },
    { duration: 11, list: [['roommate', 4], ['courier', 2], ['alarm', 2]] },
    { duration: 12, list: [['roommate', 4], ['slipper', 2], ['courier', 2]] },
    { duration: 13, list: [['slipper', 4], ['alarm', 3], ['courier', 2]] },
    { duration: 14, list: [['roommate', 6], ['slipper', 3], ['alarm', 3]] },
    { duration: 15, list: [['slipper', 4], ['auntie', 2], ['courier', 4]] },
    { duration: 16, list: [['boss', 1], ['slipper', 4], ['auntie', 2]] }
  ];

  /* ================= 画笔工具 ================= */
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
  function circ(g, x, y, r) {
    g.beginPath();
    g.arc(x, y, Math.abs(r), 0, Math.PI * 2);
  }
  function line(g, x1, y1, x2, y2) {
    g.beginPath();
    g.moveTo(x1, y1);
    g.lineTo(x2, y2);
    g.stroke();
  }
  function snow(g, x, y, r) {
    g.save();
    g.translate(x, y);
    g.strokeStyle = '#4f9fd8';
    g.lineWidth = 2;
    g.lineCap = 'round';
    for (var i = 0; i < 3; i++) {
      g.beginPath();
      g.moveTo(-r, 0);
      g.lineTo(r, 0);
      g.stroke();
      g.rotate(Math.PI / 3);
    }
    g.restore();
  }

  /* ================= 精灵库（64×64 坐标，中心在 0,0） ================= */
  function drawPerson(g, o) {
    var skin = '#f2c9a3';
    var hair = o.hair || '#2b2320';
    g.lineJoin = 'round';
    g.lineCap = 'round';

    /* 腿 */
    g.strokeStyle = INK;
    g.lineWidth = 3.4;
    line(g, -6, 20, -8, 31);
    line(g, 6, 20, 8, 31);
    g.fillStyle = o.shoes || '#2f6fb0';
    circ(g, -9, 32, 4.5);
    g.fill();
    circ(g, 9, 32, 4.5);
    g.fill();

    /* 身体 */
    if (o.skirt) {
      g.beginPath();
      g.moveTo(-10, 3);
      g.lineTo(10, 3);
      g.lineTo(15, 24);
      g.lineTo(-15, 24);
      g.closePath();
      g.fillStyle = o.shirt;
      g.fill();
      g.strokeStyle = INK;
      g.lineWidth = 2.6;
      g.stroke();
    } else {
      rr(g, -11, 2, 22, 20, 7);
      g.fillStyle = o.shirt;
      g.fill();
      g.strokeStyle = INK;
      g.lineWidth = 2.6;
      g.stroke();
    }

    /* 领带 / 胸口装饰 */
    if (o.tie) {
      g.fillStyle = '#d1342a';
      g.beginPath();
      g.moveTo(0, 5);
      g.lineTo(-3, 10);
      g.lineTo(0, 17);
      g.lineTo(3, 10);
      g.closePath();
      g.fill();
    }

    /* 手臂 */
    g.strokeStyle = INK;
    g.lineWidth = 3;
    line(g, -11, 7, -17, 17);
    line(g, 11, 7, 17, 17);

    /* 头 */
    g.fillStyle = skin;
    circ(g, 0, -12, 11);
    g.fill();
    g.strokeStyle = INK;
    g.lineWidth = 2.6;
    g.stroke();

    /* 头发 */
    g.fillStyle = hair;
    g.beginPath();
    g.arc(0, -12, 11, Math.PI * 1.06, Math.PI * 1.94);
    g.closePath();
    g.fill();
    if (o.bun) {
      g.fillStyle = hair;
      circ(g, 0, -24, 5);
      g.fill();
    }
    if (o.cap) {
      g.fillStyle = o.cap;
      g.beginPath();
      g.arc(0, -13, 11.5, Math.PI, Math.PI * 2);
      g.closePath();
      g.fill();
      rr(g, -13, -14, 14, 4, 2);
      g.fill();
    }

    /* 脸 */
    g.fillStyle = INK;
    circ(g, -4, -11, 1.6);
    g.fill();
    circ(g, 4, -11, 1.6);
    g.fill();
    if (o.glasses) {
      g.strokeStyle = INK;
      g.lineWidth = 1.8;
      circ(g, -4.5, -11, 4.4);
      g.stroke();
      circ(g, 4.5, -11, 4.4);
      g.stroke();
      line(g, -0.4, -11, 0.4, -11);
    }
    if (o.angry) {
      g.strokeStyle = INK;
      g.lineWidth = 1.8;
      line(g, -8, -17, -2, -15);
      line(g, 8, -17, 2, -15);
    }
    g.strokeStyle = INK;
    g.lineWidth = 1.6;
    g.beginPath();
    g.arc(0, -6, 3.4, 0.25, Math.PI - 0.25);
    g.stroke();

    /* 道具 */
    if (o.box) {
      g.fillStyle = '#c99a63';
      rr(g, 8, 4, 19, 16, 3);
      g.fill();
      g.strokeStyle = INK;
      g.lineWidth = 2.2;
      g.stroke();
      g.strokeStyle = 'rgba(36,28,22,.4)';
      g.lineWidth = 2;
      line(g, 17.5, 4, 17.5, 20);
    }
    if (o.slipper) {
      g.save();
      g.translate(19, 12);
      g.rotate(-0.35);
      g.fillStyle = '#3f7fc4';
      rr(g, -9, -4, 18, 9, 4);
      g.fill();
      g.strokeStyle = INK;
      g.lineWidth = 2.2;
      g.stroke();
      g.restore();
    }
    if (o.megaphone) {
      g.save();
      g.translate(15, 5);
      g.rotate(-0.25);
      g.fillStyle = '#d1342a';
      g.beginPath();
      g.moveTo(0, 0);
      g.lineTo(15, -9);
      g.lineTo(15, 9);
      g.closePath();
      g.fill();
      g.strokeStyle = INK;
      g.lineWidth = 2.2;
      g.stroke();
      g.restore();
    }
    if (o.keys) {
      g.strokeStyle = '#c9a227';
      g.lineWidth = 2.4;
      circ(g, 18, 16, 3);
      g.stroke();
      line(g, 18, 19, 18, 26);
    }
  }

  var SPRITES = {
    milktea: function (g) {
      g.save();
      g.strokeStyle = '#e0574a';
      g.lineWidth = 5;
      g.lineCap = 'round';
      line(g, 10, -33, -1, -9);
      g.beginPath();
      g.moveTo(-19, -13);
      g.lineTo(19, -13);
      g.lineTo(13, 29);
      g.lineTo(-13, 29);
      g.closePath();
      g.fillStyle = '#fff8ea';
      g.fill();
      g.strokeStyle = INK;
      g.lineWidth = 2.6;
      g.stroke();
      g.save();
      g.clip();
      g.fillStyle = '#d9a06a';
      g.fillRect(-24, 3, 48, 32);
      g.fillStyle = '#4a3323';
      var pearls = [[-8, 19], [-2, 23], [4, 19], [9, 23], [-3, 14]];
      for (var i = 0; i < pearls.length; i++) {
        circ(g, pearls[i][0], pearls[i][1], 3.2);
        g.fill();
      }
      g.restore();
      rr(g, -21, -18, 42, 8, 4);
      g.fillStyle = '#fff';
      g.fill();
      g.strokeStyle = INK;
      g.lineWidth = 2.4;
      g.stroke();
      g.strokeStyle = 'rgba(255,255,255,.85)';
      g.lineWidth = 2.2;
      line(g, -11, 0, -9, 16);
      g.restore();
    },
    towel: function (g) {
      g.lineJoin = 'round';
      /* 下层 */
      g.fillStyle = '#5f9fd6';
      rr(g, -28, 2, 56, 24, 7);
      g.fill();
      g.strokeStyle = INK;
      g.lineWidth = 2.6;
      g.stroke();
      /* 上层 */
      g.fillStyle = '#8fc0e8';
      rr(g, -26, -15, 52, 21, 8);
      g.fill();
      g.stroke();
      /* 折痕 */
      g.strokeStyle = 'rgba(255,255,255,.8)';
      g.lineWidth = 2;
      line(g, -18, -5, 18, -5);
      line(g, -20, 9, 20, 9);
      /* 左侧流苏 */
      g.strokeStyle = INK;
      g.lineWidth = 2;
      for (var i = 0; i < 4; i++) {
        line(g, -28, 7 + i * 5, -34, 7 + i * 5);
      }
      /* 小标签 */
      g.fillStyle = '#fff';
      rr(g, 11, -11, 10, 6, 2);
      g.fill();
    },
    toy: function (g) {
      g.lineJoin = 'round';
      g.strokeStyle = INK;
      g.lineWidth = 2.6;
      /* 耳朵 */
      g.save();
      g.translate(-9, -25);
      g.rotate(-0.18);
      rr(g, -5, -16, 10, 28, 5);
      g.fillStyle = '#fff';
      g.fill();
      g.stroke();
      rr(g, -2.5, -12, 5, 18, 2.5);
      g.fillStyle = '#f6b8c8';
      g.fill();
      g.restore();
      g.save();
      g.translate(10, -26);
      g.rotate(0.12);
      g.fillStyle = '#fff';
      rr(g, -5, -16, 10, 30, 5);
      g.fill();
      g.stroke();
      rr(g, -2.5, -12, 5, 18, 2.5);
      g.fillStyle = '#f6b8c8';
      g.fill();
      g.restore();
      /* 身体 */
      g.fillStyle = '#e8f1fb';
      rr(g, -15, 8, 30, 24, 12);
      g.fill();
      g.strokeStyle = INK;
      g.lineWidth = 2.6;
      g.stroke();
      /* 手脚 */
      g.fillStyle = '#fff';
      circ(g, -17, 16, 4.6);
      g.fill();
      g.stroke();
      circ(g, 17, 16, 4.6);
      g.fill();
      g.stroke();
      circ(g, -8, 32, 4.6);
      g.fill();
      g.stroke();
      circ(g, 8, 32, 4.6);
      g.fill();
      g.stroke();
      /* 肚皮 */
      g.fillStyle = '#fff';
      rr(g, -9, 14, 18, 13, 7);
      g.fill();
      /* 头 */
      g.fillStyle = '#fff';
      circ(g, 0, -4, 15);
      g.fill();
      g.strokeStyle = INK;
      g.lineWidth = 2.6;
      g.stroke();
      /* 脸 */
      g.fillStyle = 'rgba(246,184,200,.8)';
      circ(g, -7, 2, 3.6);
      g.fill();
      circ(g, 7, 2, 3.6);
      g.fill();
      g.fillStyle = INK;
      circ(g, -5.5, -4, 2);
      g.fill();
      circ(g, 5.5, -4, 2);
      g.fill();
      g.fillStyle = '#e88aa0';
      circ(g, 0, 1, 2.1);
      g.fill();
      g.strokeStyle = INK;
      g.lineWidth = 1.4;
      g.beginPath();
      g.arc(0, 4, 2.6, 0.3, Math.PI - 0.3);
      g.stroke();
    },
    glasses: function (g) {
      g.fillStyle = 'rgba(126,184,230,.45)';
      g.strokeStyle = INK;
      g.lineWidth = 3.2;
      circ(g, -13, 0, 12);
      g.fill();
      g.stroke();
      circ(g, 13, 0, 12);
      g.fill();
      g.stroke();
      line(g, -1, -2, 1, -2);
      line(g, -25, -3, -31, -7);
      line(g, 25, -3, 31, -7);
      g.strokeStyle = 'rgba(255,255,255,.9)';
      g.lineWidth = 2.4;
      line(g, -19, -5, -11, -9);
      line(g, 7, -5, 15, -9);
    },
    ac: function (g) {
      g.lineJoin = 'round';
      /* 机身 */
      g.fillStyle = '#f7f9f6';
      rr(g, -27, -16, 54, 32, 8);
      g.fill();
      g.strokeStyle = INK;
      g.lineWidth = 2.6;
      g.stroke();
      /* 出风口 */
      g.fillStyle = '#dbe8f1';
      rr(g, -22, -11, 44, 11, 4);
      g.fill();
      g.strokeStyle = 'rgba(36,28,22,.45)';
      g.lineWidth = 1.6;
      line(g, -18, -5.5, 18, -5.5);
      /* 控制面板 */
      g.fillStyle = '#cfe3f0';
      rr(g, -22, 4, 18, 8, 3);
      g.fill();
      g.fillStyle = '#8fc0e8';
      circ(g, -8, 8, 1.6);
      g.fill();
      /* 雪花 */
      snow(g, 16, 8, 6);
      /* 冷气 */
      g.strokeStyle = '#8cc6ea';
      g.lineWidth = 2.2;
      g.beginPath();
      g.arc(-18, -24, 7, 0.2, 1.5);
      g.stroke();
      g.beginPath();
      g.arc(-4, -27, 5, 0.4, 1.7);
      g.stroke();
    },
    alarm: function (g) {
      g.fillStyle = '#d1342a';
      circ(g, -12, -20, 7);
      g.fill();
      g.strokeStyle = INK;
      g.lineWidth = 2.4;
      g.stroke();
      circ(g, 12, -20, 7);
      g.fill();
      g.stroke();
      g.fillStyle = '#e8574a';
      circ(g, 0, 0, 20);
      g.fill();
      g.strokeStyle = INK;
      g.lineWidth = 2.8;
      g.stroke();
      g.fillStyle = '#fff8e6';
      circ(g, 0, 2, 13);
      g.fill();
      g.strokeStyle = INK;
      g.lineWidth = 2.4;
      line(g, 0, 2, 0, -7);
      line(g, 0, 2, 7, 6);
      g.lineWidth = 2.6;
      line(g, -8, 18, -11, 26);
      line(g, 8, 18, 11, 26);
    },
    roommate: function (g) {
      drawPerson(g, { shirt: '#5b8fd0', glasses: true });
    },
    courier: function (g) {
      drawPerson(g, { shirt: '#4f8f6a', cap: '#d1342a', box: true });
    },
    slipper: function (g) {
      drawPerson(g, { shirt: '#d98b4a', slipper: true });
    },
    auntie: function (g) {
      drawPerson(g, { shirt: '#8a5fa8', skirt: true, bun: true, glasses: true, keys: true, shoes: '#6b4a7a' });
    },
    boss: function (g) {
      drawPerson(g, { shirt: '#3a3a44', tie: true, megaphone: true, angry: true, glasses: true, shoes: '#242530' });
    },
    sock: function (g) {
      g.rotate(0.25);
      g.fillStyle = '#fff8ea';
      rr(g, -9, -6, 18, 12, 5);
      g.fill();
      g.strokeStyle = INK;
      g.lineWidth = 2.2;
      g.stroke();
      g.fillStyle = '#7db3e0';
      rr(g, -9, -6, 5, 12, 3);
      g.fill();
    },
    sun: function (g) {
      g.fillStyle = '#ffd93b';
      for (var i = 0; i < 8; i++) {
        g.save();
        g.rotate(i * Math.PI / 4);
        g.beginPath();
        g.moveTo(0, -20);
        g.lineTo(4.5, -29);
        g.lineTo(-4.5, -29);
        g.closePath();
        g.fill();
        g.restore();
      }
      g.fillStyle = '#ffcf1f';
      circ(g, 0, 0, 15);
      g.fill();
      g.strokeStyle = '#c99a0e';
      g.lineWidth = 2.2;
      g.stroke();
      g.fillStyle = '#8a5a12';
      circ(g, -4, -3, 1.8);
      g.fill();
      circ(g, 4, -3, 1.8);
      g.fill();
      g.strokeStyle = '#8a5a12';
      g.lineWidth = 1.8;
      g.beginPath();
      g.arc(0, 1, 4, 0.25, Math.PI - 0.25);
      g.stroke();
    },
    sleep: function (g) {
      /* 被子 */
      g.fillStyle = '#7db3e0';
      rr(g, -29, 6, 58, 22, 10);
      g.fill();
      g.strokeStyle = INK;
      g.lineWidth = 2.6;
      g.stroke();
      g.strokeStyle = 'rgba(255,255,255,.7)';
      g.lineWidth = 2.2;
      line(g, -20, 12, 22, 12);
      /* 枕头 */
      g.fillStyle = '#fff';
      rr(g, -31, -10, 24, 16, 7);
      g.fill();
      g.strokeStyle = INK;
      g.lineWidth = 2.2;
      g.stroke();
      /* 头 */
      g.fillStyle = '#f2c9a3';
      circ(g, -13, -14, 10);
      g.fill();
      g.strokeStyle = INK;
      g.lineWidth = 2.4;
      g.stroke();
      g.fillStyle = '#2b2320';
      g.beginPath();
      g.arc(-13, -14, 10, Math.PI * 1.05, Math.PI * 1.95);
      g.closePath();
      g.fill();
      /* 闭眼 */
      g.strokeStyle = INK;
      g.lineWidth = 1.6;
      g.beginPath();
      g.arc(-18, -14, 3, 0.2, Math.PI - 0.2);
      g.stroke();
      g.beginPath();
      g.arc(-9, -14, 3, 0.2, Math.PI - 0.2);
      g.stroke();
      /* Zzz */
      g.fillStyle = 'rgba(36,28,22,.5)';
      g.font = '700 11px ' + FONT;
      g.textAlign = 'left';
      g.textBaseline = 'middle';
      g.fillText('Z', 2, -30);
      g.font = '700 14px ' + FONT;
      g.fillText('Z', 10, -40);
    },
    door: function (g) {
      g.fillStyle = '#8a5a3c';
      rr(g, -17, -28, 34, 56, 4);
      g.fill();
      g.strokeStyle = INK;
      g.lineWidth = 2.6;
      g.stroke();
      g.strokeStyle = 'rgba(36,28,22,.2)';
      g.lineWidth = 1.6;
      rr(g, -11, -22, 22, 20, 3);
      g.stroke();
      g.fillStyle = '#f2d9a6';
      circ(g, 9, 3, 3.2);
      g.fill();
    }
  };

  function drawSprite(g, key, x, y, size, rot) {
    var fn = SPRITES[key];
    if (!fn) return;
    g.save();
    g.translate(x, y);
    if (rot) g.rotate(rot);
    g.scale(size / 64, size / 64);
    g.lineJoin = 'round';
    g.lineCap = 'round';
    fn(g);
    g.restore();
  }

  /* ================= DOM ================= */
  var calEl = document.getElementById('calCount');
  var waveEl = document.getElementById('waveNum');
  var scoreEl = document.getElementById('scoreNum');
  var bestEl = document.getElementById('bestNum');
  var overlay = document.getElementById('gameOverlay');
  var pauseBtn = document.getElementById('pauseBtn');
  var speedBtn = document.getElementById('speedBtn');
  var restartBtn = document.getElementById('restartBtn');
  var deck = document.getElementById('deck');
  var cards = deck ? Array.prototype.slice.call(deck.querySelectorAll('.pcard')) : [];

  var selected = null;
  var hover = { row: -1, col: -1 };
  var timeScale = 1;
  var state = null;
  var last = 0;
  var uiClock = 0;
  var best = 0;
  try { best = parseInt(localStorage.getItem('ppr-game-best') || '0', 10) || 0; } catch (e) { best = 0; }

  function beep(f, d, t) { if (window.pprBeep) window.pprBeep(f, d, t); }
  function rnd(a, b) { return a + Math.random() * (b - a); }
  function cxOf(p) { return GX + p.col * CW + CW / 2; }
  function cyOf(p) { return GY + p.row * CH + CH / 2; }

  /* ================= 图标绘制（卡槽 / 图鉴） ================= */
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

  /* ================= 状态 ================= */
  function resetState() {
    state = {
      started: false, over: false, win: false, paused: false,
      cal: 200, plants: [], enemies: [], shots: [], suns: [], fx: [],
      wave: 0, waveTimer: 9, waveActive: false, spawnQueue: [], waveClock: 0,
      t: 0, score: 0, sunTimer: 6, banner: null, cooldowns: {}, shake: 0
    };
    ORDER.forEach(function (k) { state.cooldowns[k] = 0; });
    selected = null;
    hover.row = -1;
    hover.col = -1;
  }

  function addFx(x, y, text, color) {
    state.fx.push({ x: x, y: y, text: text, color: color || INK, life: 1 });
  }

  function showOverlay(html) {
    if (!overlay) return;
    overlay.innerHTML = '<div class="ov-card">' + html + '</div>';
    overlay.hidden = false;
  }
  function hideOverlay() { if (overlay) overlay.hidden = true; }

  function startGame() {
    resetState();
    state.started = true;
    state.banner = { text: '配泼睿睡着了……守住他的被窝！', life: 2.6 };
    hideOverlay();
    if (pauseBtn) pauseBtn.textContent = '暂停';
    beep(660, 0.09, 'square');
    syncUI();
  }

  function togglePause(force) {
    if (!state.started || state.over || state.win) return;
    state.paused = (typeof force === 'boolean') ? force : !state.paused;
    if (state.paused) {
      showOverlay('<h3>⏸ 已暂停</h3><p>配泼睿趁机睡了一觉，还翻了个身。<br>你确定要继续这场保卫战吗？</p>' +
        '<div class="ov-btns"><button class="btn primary" data-act="resume" type="button">继续游戏</button>' +
        '<button class="btn ghost" data-act="restart" type="button">重新开始</button></div>');
      if (pauseBtn) pauseBtn.textContent = '继续';
    } else {
      hideOverlay();
      if (pauseBtn) pauseBtn.textContent = '暂停';
    }
  }

  function endGame(win) {
    if (state.over || state.win) return;
    state.win = win;
    state.over = !win;
    if (state.score > best) {
      best = state.score;
      try { localStorage.setItem('ppr-game-best', String(best)); } catch (e) { /* ignore */ }
    }
    if (win) {
      showOverlay('<img class="ov-photo wide" src="assets/towel.jpg" alt="睡着的配泼睿">' +
        '<h3>🎉 守住了！</h3><p>第 8 波的辅导员被你挡了回去。<br>配泼睿翻了个身，嘟囔了一句「我下的任务罢了」，继续睡。<br><b>得分：' + state.score + '</b></p>' +
        '<div class="ov-btns"><button class="btn primary" data-act="restart" type="button">再来一局</button>' +
        '<button class="btn ghost" data-act="home" type="button">去通缉令看看</button></div>');
      beep(660, 0.1, 'square');
      setTimeout(function () { beep(880, 0.12, 'square'); }, 130);
      setTimeout(function () { beep(1180, 0.18, 'square'); }, 280);
    } else {
      showOverlay('<img class="ov-photo" src="assets/yare.jpg" alt="配泼睿：呀嘞呀嘞">' +
        '<h3>😱 被窝被掀开了！</h3><p>室友成功把配泼睿叫醒了。<br>他现在的表情是：<b>呀嘞呀嘞</b>。<br><b>得分：' + state.score + '</b></p>' +
        '<div class="ov-btns"><button class="btn primary" data-act="restart" type="button">再守一次</button>' +
        '<button class="btn ghost" data-act="home" type="button">认输了，去看通缉令</button></div>');
      beep(200, 0.3, 'sawtooth');
    }
    syncUI();
  }

  /* ================= 出怪 / 波次 ================= */
  function spawnEnemy(type, row) {
    var def = ENEMIES[type];
    if (!def) return;
    state.enemies.push({
      type: type, row: row, x: W - rnd(6, 34),
      hp: def.hp, maxHp: def.hp, speed: def.speed, dmg: def.dmg,
      reward: def.reward, big: !!def.big, eat: rnd(0, 0.6),
      slowUntil: 0, hurt: 0
    });
  }

  function startWave(n) {
    var w = WAVES[n - 1];
    state.wave = n;
    state.waveClock = 0;
    state.waveActive = true;
    state.spawnQueue = [];
    w.list.forEach(function (pair) {
      for (var i = 0; i < pair[1]; i++) {
        state.spawnQueue.push({
          type: pair[0],
          row: Math.floor(Math.random() * ROWS),
          time: rnd(0.2, w.duration)
        });
      }
    });
    state.spawnQueue.sort(function (a, b) { return a.time - b.time; });
    state.banner = { text: '第 ' + n + ' 波 · ' + (n === WAVES.length ? '辅导员亲自来了！' : '他们冲进来了'), life: 2.2 };
    beep(320, 0.12, 'sawtooth');
  }

  /* ================= 更新 ================= */
  function update(dt) {
    state.t += dt;
    if (state.shake > 0) state.shake = Math.max(0, state.shake - dt * 3);
    if (state.banner) {
      state.banner.life -= dt;
      if (state.banner.life <= 0) state.banner = null;
    }
    ORDER.forEach(function (k) {
      if (state.cooldowns[k] > 0) state.cooldowns[k] = Math.max(0, state.cooldowns[k] - dt);
    });

    state.sunTimer -= dt;
    if (state.sunTimer <= 0) {
      state.sunTimer = rnd(5.5, 7.5);
      spawnSun();
    }

    if (state.waveActive) {
      state.waveClock += dt;
      while (state.spawnQueue.length && state.spawnQueue[0].time <= state.waveClock) {
        var s = state.spawnQueue.shift();
        spawnEnemy(s.type, s.row);
      }
      if (!state.spawnQueue.length && !state.enemies.length) {
        state.waveActive = false;
        if (state.wave >= WAVES.length) { endGame(true); return; }
        state.waveTimer = 8;
        state.banner = { text: '这一波守住了！喘口气', life: 2 };
        beep(880, 0.1, 'triangle');
      }
    } else if (state.wave < WAVES.length) {
      state.waveTimer -= dt;
      if (state.waveTimer <= 0) startWave(state.wave + 1);
    }

    updatePlants(dt);
    updateEnemies(dt);
    updateShots(dt);
    updateSuns(dt);
    updateFx(dt);
    checkLose();
  }

  function updatePlants(dt) {
    for (var i = state.plants.length - 1; i >= 0; i--) {
      var p = state.plants[i];
      if (p.hp <= 0) { state.plants.splice(i, 1); continue; }

      if (p.kind === 'bomb') {
        p.fuse -= dt;
        if (p.fuse <= 0) {
          explode(p);
          state.plants.splice(i, 1);
        }
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

      if (p.kind === 'shooter') {
        var hasTarget = false;
        for (var j = 0; j < state.enemies.length; j++) {
          if (state.enemies[j].row === p.row && state.enemies[j].x > cxOf(p) - 40) { hasTarget = true; break; }
        }
        if (hasTarget) {
          p.timer -= dt;
          if (p.timer <= 0) {
            p.timer = p.interval;
            fire(p);
          }
        } else if (p.timer > 0.25) {
          p.timer = 0.25;
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
        x: cxOf(p) + 20 + i * 12,
        y: cyOf(p) - 8 + (n > 1 ? (i ? 7 : -7) : 0),
        row: p.row,
        dmg: p.dmg,
        vx: 430,
        spin: rnd(0, 6)
      });
    }
    beep(1180, 0.025, 'sine');
  }

  function updateShots(dt) {
    for (var i = state.shots.length - 1; i >= 0; i--) {
      var s = state.shots[i];
      s.x += s.vx * dt;
      s.spin += dt * 12;
      if (s.x > W + 24) { state.shots.splice(i, 1); continue; }
      for (var j = 0; j < state.enemies.length; j++) {
        var e = state.enemies[j];
        if (e.row !== s.row) continue;
        if (s.x > e.x - 28 && s.x < e.x + 16) {
          e.hp -= s.dmg;
          e.hurt = 0.12;
          addFx(s.x, s.y - 6, '-' + s.dmg, '#d1342a');
          state.shots.splice(i, 1);
          beep(560, 0.02, 'square');
          if (e.hp <= 0) killEnemy(j);
          break;
        }
      }
    }
  }

  function killEnemy(idx) {
    var e = state.enemies[idx];
    if (!e) return;
    state.enemies.splice(idx, 1);
    state.score += e.reward;
    addFx(e.x, GY + e.row * CH + CH / 2 - 26, '+' + e.reward, '#1e7a46');
  }

  function updateEnemies(dt) {
    for (var i = state.enemies.length - 1; i >= 0; i--) {
      var e = state.enemies[i];
      if (e.hp <= 0) { killEnemy(i); continue; }
      if (e.hurt > 0) e.hurt -= dt;

      var block = null;
      for (var j = 0; j < state.plants.length; j++) {
        var p = state.plants[j];
        if (p.row !== e.row) continue;
        if (Math.abs(cxOf(p) - e.x) < CW * 0.5) { block = p; break; }
      }

      if (block) {
        e.eat -= dt;
        if (e.eat <= 0) {
          e.eat = 0.55;
          block.hp -= e.dmg;
          addFx(e.x - 18, GY + e.row * CH + CH / 2 - 14, '💥', '#d1342a');
          beep(200, 0.04, 'sawtooth');
          if (block.hp <= 0) {
            var bi = state.plants.indexOf(block);
            if (bi >= 0) state.plants.splice(bi, 1);
          }
        }
      } else {
        var slow = e.slowUntil > state.t;
        e.x -= e.speed * (slow ? 0.45 : 1) * dt;
      }

      if (e.hp <= 0) killEnemy(i);
    }
  }

  function checkLose() {
    for (var i = 0; i < state.enemies.length; i++) {
      if (state.enemies[i].x < 26) { endGame(false); return; }
    }
  }

  function explode(p) {
    var x = cxOf(p), row = p.row;
    state.shake = 0.7;
    for (var i = state.enemies.length - 1; i >= 0; i--) {
      var e = state.enemies[i];
      if (Math.abs(e.row - row) <= 1 && Math.abs(e.x - x) < 140) {
        e.hp -= p.dmg;
        if (e.hp <= 0) killEnemy(i);
      }
    }
    for (var k = 0; k < 6; k++) {
      addFx(x + rnd(-40, 40), cyOf(p) + rnd(-30, 30), '💥', '#d1342a');
    }
    beep(150, 0.26, 'square');
  }

  function spawnSun() {
    state.suns.push({
      x: rnd(GX + 40, GRID_R - 40),
      y: -30,
      ty: rnd(GY + 50, GRID_B - 30),
      value: 25,
      life: 11
    });
  }

  function updateSuns(dt) {
    for (var i = state.suns.length - 1; i >= 0; i--) {
      var s = state.suns[i];
      if (s.y < s.ty) {
        s.y = Math.min(s.ty, s.y + 76 * dt);
      } else {
        s.life -= dt;
        if (s.life <= 0) state.suns.splice(i, 1);
      }
    }
  }

  function updateFx(dt) {
    for (var i = state.fx.length - 1; i >= 0; i--) {
      var f = state.fx[i];
      f.y -= 26 * dt;
      f.life -= dt;
      if (f.life <= 0) state.fx.splice(i, 1);
    }
  }

  /* ================= 操作 ================= */
  function place(key, row, col) {
    var def = PLANTS[key];
    if (!def) return;
    var occupied = state.plants.some(function (p) { return p.row === row && p.col === col; });
    if (occupied) {
      addFx(GX + col * CW + CW / 2, GY + row * CH + CH / 2, '这里有人了', '#6b5847');
      beep(180, 0.06, 'square');
      return;
    }
    if (state.cal < def.cost) {
      addFx(GX + col * CW + CW / 2, GY + row * CH + CH / 2, '卡路里不够', '#d1342a');
      beep(180, 0.06, 'square');
      return;
    }
    if (state.cooldowns[key] > 0) return;
    state.cal -= def.cost;
    state.cooldowns[key] = def.cd;
    state.plants.push({
      key: key, name: def.name, kind: def.kind, row: row, col: col,
      hp: def.hp, maxHp: def.hp, timer: 0,
      interval: def.interval || 0, dmg: def.dmg || 0,
      shots: def.shots || 1, produce: def.produce || 0, fuse: def.fuse || 0
    });
    beep(520, 0.07, 'triangle');
    selected = null;
    syncCards();
  }

  function syncCards() {
    cards.forEach(function (btn) {
      var k = btn.getAttribute('data-plant');
      var def = PLANTS[k];
      if (!def) return;
      var cd = state.cooldowns[k] || 0;
      var pct = def.cd ? Math.min(100, (cd / def.cd) * 100) : 0;
      btn.style.setProperty('--cd', pct.toFixed(1) + '%');
      btn.classList.toggle('sel', selected === k);
      btn.classList.toggle('disabled', state.over || state.win || state.cal < def.cost || cd > 0);
    });
  }

  function syncUI() {
    if (calEl) calEl.textContent = String(Math.floor(state.cal));
    if (waveEl) waveEl.textContent = state.wave + ' / ' + WAVES.length;
    if (scoreEl) scoreEl.textContent = String(state.score);
    if (bestEl) bestEl.textContent = String(best);
    syncCards();
  }

  /* ================= 绘制 ================= */
  function draw() {
    ctx.save();
    if (state.shake > 0) ctx.translate(rnd(-3, 3), rnd(-3, 3));
    drawBg();
    drawPlants();
    drawShots();
    drawEnemies();
    drawSuns();
    drawFx();
    drawGhost();
    drawBanner();
    ctx.restore();
  }

  function drawPortrait(x, y, size, rot) {
    ctx.save();
    ctx.translate(x + size / 2, y + size / 2);
    if (rot) ctx.rotate(rot);
    ctx.fillStyle = '#fff';
    rr(ctx, -size / 2, -size / 2, size, size + 16, 4);
    ctx.fill();
    ctx.strokeStyle = INK;
    ctx.lineWidth = 2.5;
    ctx.stroke();
    var pad = 4;
    ctx.save();
    rr(ctx, -size / 2 + pad, -size / 2 + pad, size - pad * 2, size - pad * 2, 3);
    ctx.clip();
    if (PHOTO_SLEEP.complete && PHOTO_SLEEP.naturalWidth) {
      ctx.drawImage(PHOTO_SLEEP, -size / 2 + pad, -size / 2 + pad, size - pad * 2, size - pad * 2);
    } else {
      ctx.fillStyle = '#cfe2f7';
      ctx.fillRect(-size / 2, -size / 2, size, size);
      drawSprite(ctx, 'sleep', 0, 0, size * 0.85);
    }
    ctx.restore();
    ctx.fillStyle = 'rgba(36,28,22,.62)';
    ctx.font = '700 9px ' + FONT;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('守护目标', 0, size / 2 + 8);
    ctx.restore();
  }

  function drawBg() {
    var g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#f2f7ec');
    g.addColorStop(1, '#e1ecd8');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);

    for (var r = 0; r < ROWS; r++) {
      for (var c = 0; c < COLS; c++) {
        ctx.fillStyle = ((r + c) % 2 === 0) ? '#e4efdb' : '#dcead2';
        ctx.fillRect(GX + c * CW, GY + r * CH, CW, CH);
      }
    }

    ctx.strokeStyle = 'rgba(36,28,22,.12)';
    ctx.lineWidth = 1;
    for (var c2 = 0; c2 <= COLS; c2++) {
      ctx.beginPath();
      ctx.moveTo(GX + c2 * CW, GY);
      ctx.lineTo(GX + c2 * CW, GRID_B);
      ctx.stroke();
    }
    for (var r2 = 0; r2 <= ROWS; r2++) {
      ctx.beginPath();
      ctx.moveTo(GX, GY + r2 * CH);
      ctx.lineTo(GRID_R, GY + r2 * CH);
      ctx.stroke();
    }

    /* 左侧：被窝 */
    var bg = ctx.createLinearGradient(0, 0, GX, 0);
    bg.addColorStop(0, '#a9c9ec');
    bg.addColorStop(1, '#d2e4f8');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, GX, H);
    ctx.setLineDash([9, 7]);
    ctx.strokeStyle = 'rgba(36,28,22,.35)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(GX, 0);
    ctx.lineTo(GX, H);
    ctx.stroke();
    ctx.setLineDash([]);

    /* 床 */
    ctx.fillStyle = 'rgba(255,255,255,.72)';
    rr(ctx, 12, H * 0.36, GX - 26, 150, 18);
    ctx.fill();
    ctx.strokeStyle = 'rgba(36,28,22,.25)';
    ctx.lineWidth = 2;
    ctx.stroke();
    drawSprite(ctx, 'sleep', 47, H * 0.36 + 80, 62);

    /* 守护目标：配泼睿本人大头照 */
    drawPortrait(10, 32, 76, -0.05);

    ctx.save();
    ctx.translate(26, H * 0.74);
    ctx.rotate(-Math.PI / 2);
    ctx.font = '700 17px ' + FONT;
    ctx.fillStyle = 'rgba(36,28,22,.5)';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText('配泼睿的被窝', 0, 0);
    ctx.restore();

    /* 右侧：楼道 */
    var rg = ctx.createLinearGradient(GRID_R, 0, W, 0);
    rg.addColorStop(0, '#d9cdb6');
    rg.addColorStop(1, '#b9a888');
    ctx.fillStyle = rg;
    ctx.fillRect(GRID_R, 0, W - GRID_R, H);
    drawSprite(ctx, 'door', GRID_R + (W - GRID_R) / 2, H * 0.34, 54);
    ctx.save();
    ctx.translate(W - 24, H * 0.64);
    ctx.rotate(Math.PI / 2);
    ctx.font = '700 15px ' + FONT;
    ctx.fillStyle = 'rgba(36,28,22,.55)';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('楼道 · 危险', 0, 0);
    ctx.restore();
  }

  function drawPlants() {
    state.plants.forEach(function (p) {
      var x = cxOf(p), y = cyOf(p);
      var bob = Math.sin(state.t * 2.2 + p.col * 0.9 + p.row) * 2;
      ctx.fillStyle = 'rgba(36,28,22,.12)';
      ctx.beginPath();
      ctx.ellipse(x, y + 32, 26, 8, 0, 0, Math.PI * 2);
      ctx.fill();
      drawSprite(ctx, p.key, x, y + bob, p.kind === 'wall' ? 66 : 60);
      if (p.hp < p.maxHp && p.maxHp < 5000) drawHp(x, y + 38, 46, p.hp / p.maxHp, '#3f8f4f');
      if (p.kind === 'bomb') {
        var pulse = 0.6 + Math.abs(Math.sin(state.t * 10)) * 0.4;
        ctx.save();
        ctx.globalAlpha = pulse;
        ctx.fillStyle = '#ffb703';
        circ(ctx, x + 20, y - 26, 4);
        ctx.fill();
        ctx.restore();
      }
    });
  }

  function drawShots() {
    state.shots.forEach(function (s) {
      drawSprite(ctx, 'sock', s.x, s.y, 24, s.spin);
    });
  }

  function drawEnemies() {
    state.enemies.forEach(function (e) {
      var y = GY + e.row * CH + CH / 2;
      var bob = Math.sin(state.t * 8 + e.x * 0.06) * 2;
      ctx.fillStyle = 'rgba(36,28,22,.15)';
      ctx.beginPath();
      ctx.ellipse(e.x, y + 32, 22, 7, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.save();
      if (e.hurt > 0) ctx.globalAlpha = 0.55;
      drawSprite(ctx, e.type, e.x, y + bob + 2, e.big ? 82 : 58);
      ctx.restore();
      drawHp(e.x, y - (e.big ? 46 : 34), e.big ? 68 : 40, e.hp / e.maxHp, e.hp / e.maxHp > 0.5 ? '#3f8f4f' : '#d1342a');
      if (e.slowUntil > state.t) snow(ctx, e.x + 20, y - 28, 7);
    });
  }

  function drawSuns() {
    state.suns.forEach(function (s) {
      var pulse = 1 + Math.sin(state.t * 4 + s.y * 0.05) * 0.05;
      ctx.save();
      ctx.globalAlpha = 0.3;
      ctx.fillStyle = '#ffd93b';
      circ(ctx, s.x, s.y, 32 * pulse);
      ctx.fill();
      ctx.restore();
      drawSprite(ctx, 'sun', s.x, s.y, 46 * pulse, Math.sin(state.t * 1.2) * 0.06);
    });
  }

  function drawFx() {
    state.fx.forEach(function (f) {
      ctx.save();
      ctx.globalAlpha = Math.max(0, Math.min(1, f.life));
      ctx.font = '900 16px ' + FONT;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.lineWidth = 3;
      ctx.strokeStyle = 'rgba(255,253,246,.85)';
      ctx.strokeText(f.text, f.x, f.y);
      ctx.fillStyle = f.color;
      ctx.fillText(f.text, f.x, f.y);
      ctx.restore();
    });
  }

  function drawGhost() {
    if (!selected) return;
    if (hover.row < 0 || hover.row >= ROWS || hover.col < 0 || hover.col >= COLS) return;
    var x = GX + hover.col * CW;
    var y = GY + hover.row * CH;
    ctx.save();
    ctx.strokeStyle = 'rgba(209,52,42,.75)';
    ctx.lineWidth = 3;
    ctx.setLineDash([7, 6]);
    rr(ctx, x + 3, y + 3, CW - 6, CH - 6, 10);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.globalAlpha = 0.45;
    drawSprite(ctx, selected, x + CW / 2, y + CH / 2, 60);
    ctx.restore();
  }

  function drawBanner() {
    if (!state.banner) return;
    var b = state.banner;
    ctx.save();
    ctx.globalAlpha = Math.min(1, b.life);
    ctx.font = '900 30px ' + FONT;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineWidth = 8;
    ctx.strokeStyle = 'rgba(255,253,246,.9)';
    ctx.strokeText(b.text, W / 2, GY + 46);
    ctx.fillStyle = INK;
    ctx.fillText(b.text, W / 2, GY + 46);
    ctx.restore();
  }

  function drawHp(x, y, w, ratio, color) {
    ctx.fillStyle = 'rgba(36,28,22,.28)';
    rr(ctx, x - w / 2, y, w, 5, 2.5);
    ctx.fill();
    if (ratio > 0) {
      ctx.fillStyle = color;
      rr(ctx, x - w / 2, y, Math.max(2, w * Math.min(1, ratio)), 5, 2.5);
      ctx.fill();
    }
  }

  /* ================= 主循环 ================= */
  function frame(ts) {
    if (!last) last = ts;
    var dt = Math.min(0.05, (ts - last) / 1000);
    last = ts;
    if (state.started && !state.over && !state.win && !state.paused) {
      update(dt * timeScale);
    }
    draw();
    uiClock += dt;
    if (uiClock > 0.12) {
      uiClock = 0;
      syncCards();
      if (state.started) {
        if (calEl) calEl.textContent = String(Math.floor(state.cal));
        if (waveEl) waveEl.textContent = state.wave + ' / ' + WAVES.length;
        if (scoreEl) scoreEl.textContent = String(state.score);
        if (bestEl) bestEl.textContent = String(best);
      }
    }
    requestAnimationFrame(frame);
  }

  /* ================= 事件 ================= */
  canvas.addEventListener('click', function (ev) {
    var rect = canvas.getBoundingClientRect();
    var x = (ev.clientX - rect.left) * (W / rect.width);
    var y = (ev.clientY - rect.top) * (H / rect.height);
    if (!state.started || state.over || state.win || state.paused) return;

    for (var i = state.suns.length - 1; i >= 0; i--) {
      var s = state.suns[i];
      if (Math.hypot(s.x - x, s.y - y) < 36) {
        state.cal += s.value;
        addFx(s.x, s.y - 10, '+' + s.value, '#b8860b');
        state.suns.splice(i, 1);
        beep(1100, 0.06, 'sine');
        return;
      }
    }

    if (!selected) return;
    var col = Math.floor((x - GX) / CW);
    var row = Math.floor((y - GY) / CH);
    if (col < 0 || col >= COLS || row < 0 || row >= ROWS) return;
    place(selected, row, col);
  });

  canvas.addEventListener('mousemove', function (ev) {
    var rect = canvas.getBoundingClientRect();
    var x = (ev.clientX - rect.left) * (W / rect.width);
    var y = (ev.clientY - rect.top) * (H / rect.height);
    hover.col = Math.floor((x - GX) / CW);
    hover.row = Math.floor((y - GY) / CH);
  });
  canvas.addEventListener('mouseleave', function () {
    hover.row = -1;
    hover.col = -1;
  });

  cards.forEach(function (btn) {
    btn.addEventListener('click', function () {
      if (!state.started || state.over || state.win) return;
      var k = btn.getAttribute('data-plant');
      if (btn.classList.contains('disabled')) { beep(180, 0.05, 'square'); return; }
      selected = (selected === k) ? null : k;
      beep(720, 0.05, 'triangle');
      syncCards();
    });
  });

  if (pauseBtn) {
    pauseBtn.addEventListener('click', function () {
      if (!state.started) return;
      togglePause();
    });
  }
  if (speedBtn) {
    speedBtn.addEventListener('click', function () {
      timeScale = timeScale === 1 ? 1.8 : 1;
      speedBtn.textContent = timeScale === 1 ? '加速' : '正常';
    });
  }
  if (restartBtn) {
    restartBtn.addEventListener('click', function () {
      startGame();
      beep(700, 0.08, 'square');
    });
  }

  if (overlay) {
    overlay.addEventListener('click', function (ev) {
      var btn = ev.target.closest ? ev.target.closest('[data-act]') : null;
      if (!btn) return;
      var act = btn.getAttribute('data-act');
      if (act === 'start' || act === 'restart') startGame();
      else if (act === 'resume') togglePause(false);
      else if (act === 'home') location.href = 'wanted.html';
    });
  }

  document.addEventListener('keydown', function (ev) {
    if (!state.started) return;
    if (ev.key === 'Escape') { selected = null; syncCards(); }
    if (ev.code === 'Space' && !state.over && !state.win) {
      ev.preventDefault();
      togglePause();
    }
    var n = parseInt(ev.key, 10);
    if (n >= 1 && n <= 6 && !state.over && !state.win) {
      var k = ORDER[n - 1];
      if (state.cal >= PLANTS[k].cost && state.cooldowns[k] <= 0) {
        selected = k;
        syncCards();
      }
    }
  });

  /* ================= 启动 ================= */
  var START_HTML = '<div style="font-size:42px;line-height:1">🛏️</div>' +
    '<h3>保卫被窝</h3>' +
    '<p>室友、宿管阿姨、辅导员正从右边冲进来，目标只有一个：把配泼睿从被窝里叫醒。<br>' +
    '种下奶茶、毛巾、玩偶和空调，撑过 <b>8 波</b>。<br>' +
    '点击天上掉下来的太阳，可以收集卡路里。</p>' +
    '<div class="ov-btns"><button class="btn primary" data-act="start" type="button">开始游戏</button>' +
    '<a class="btn ghost" href="gallery.html">先去看图库</a></div>';

  resetState();
  paintIcons();
  draw();
  requestAnimationFrame(frame);

  var qs = location.search;
  if (qs.indexOf('autostart') >= 0) {
    startGame();
    if (qs.indexOf('demo') >= 0) {
      state.cal = 2000;
      place('milktea', 0, 0);
      place('toy', 2, 1);
      place('towel', 1, 3);
      place('glasses', 3, 2);
      place('ac', 4, 4);
      state.cal = 320;
      spawnEnemy('roommate', 2);
      spawnEnemy('slipper', 1);
      spawnEnemy('boss', 3);
      state.enemies[0].x = 640;
      state.enemies[1].x = 720;
      state.enemies[2].x = 780;
      syncUI();
    }
  } else {
    showOverlay(START_HTML);
  }

  /* 调试/自动演示：?sim=秒数 会以简单 AI 自动打一段时间，用于检查平衡性 */
  var simMatch = /[?&]sim=(\d+)/.exec(location.search);
  if (simMatch) {
    startGame();
    var simSecs = Math.min(900, parseInt(simMatch[1], 10) || 30);
    var has = function (r, c) {
      return state.plants.some(function (p) { return p.row === r && p.col === c; });
    };
    var ai = function () {
      var r;
      for (r = 0; r < ROWS; r++) {
        if (!has(r, 0) && state.cal >= 50 && state.cooldowns.milktea <= 0) { place('milktea', r, 0); return; }
      }
      for (r = 0; r < ROWS; r++) {
        var hasToy = false;
        for (var c = 1; c <= 3; c++) if (has(r, c)) hasToy = true;
        if (!hasToy && state.cal >= 100 && state.cooldowns.toy <= 0) { place('toy', r, 2); return; }
      }
      for (r = 0; r < ROWS; r++) {
        if (!has(r, 6) && state.cal >= 25 && state.cooldowns.towel <= 0) { place('towel', r, 6); return; }
      }
      for (r = 0; r < ROWS; r++) {
        if (!has(r, 4) && state.cal >= 175 && state.cooldowns.glasses <= 0) { place('glasses', r, 4); return; }
      }
      for (r = 0; r < ROWS; r++) {
        if (!has(r, 5) && state.cal >= 150 && state.cooldowns.ac <= 0) { place('ac', r, 5); return; }
      }
    };
    for (var step = 0; step < simSecs * 20; step++) {
      if (step % 14 === 0) ai();
      update(0.05);
      if (state.over || state.win) break;
    }
    draw();
    syncUI();
  }
})();
