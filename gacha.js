/* ============================================================
   配泼睿扭蛋机 —— 抽卡收集小游戏
   ============================================================ */
(function () {
  'use strict';

  var CARDS = [
    { id: 'towel', rarity: 'ssr', name: '本源蓝毛巾', glyph: '巾', img: 'assets/sleep.jpg', pos: 'center 30%', desc: '传说中他真正的身体。洗了就消失，所以他从不洗。' },
    { id: 'yare', rarity: 'ssr', name: '呀嘞呀嘞', glyph: '啧', img: 'assets/yare.jpg', pos: 'center 28%', desc: '一句敷衍，胜过千言万语。适用于一切被叫起床的场合。' },
    { id: 'prof', rarity: 'ssr', name: '教授形态', glyph: '教', img: 'assets/prof.jpg', pos: 'center 20%', desc: 'bilibili 认证：全网最年轻的教授。本人表示「呀嘞呀嘞」。' },

    { id: 'webcam', rarity: 'sr', name: '深夜网课', glyph: '课', img: 'assets/webcam.jpg', pos: 'center 26%', desc: '摄像头开着，灵魂已经提前下线，人还在。' },
    { id: 'track', rarity: 'sr', name: '被迫营业', glyph: '跑', img: 'assets/track.jpg', pos: 'center 16%', desc: '田径场上的标准微笑，价值连城，含泪拍摄。' },
    { id: 'brawl', rarity: 'sr', name: '三人对峙', glyph: '吵', img: 'assets/brawl.jpg', pos: 'center 28%', desc: '宿舍辩论赛，辩题：今晚到底谁洗碗。至今没有结论。' },

    { id: 'wanted', rarity: 'r', name: '通缉悬赏', glyph: '缉', img: 'assets/wanted.jpg', pos: 'center 8%', desc: '赏金 114,514,000,000 津巴布韦币，至今无人领取。' },
    { id: 'meme', rarity: 'r', name: '名场面', glyph: '任', img: 'assets/meme.jpg', pos: 'center 16%', desc: '「我下的任务罢了。」本宿舍群转发 400 余次。' },
    { id: 'stick', rarity: 'r', name: '深夜练功', glyph: '棍', img: 'assets/stick.jpg', pos: 'center 22%', desc: '手持长棍，脚踩蓝拖鞋，据说在练起床气驱散术。' },

    { id: 'sil1', rarity: 'r', name: '剪影·睡眠模式', glyph: '影', img: 'assets/towel.jpg', pos: 'center 32%', silhouette: true, desc: '抽到了影子。别急，影子也是他的一部分。' },
    { id: 'sil2', rarity: 'r', name: '剪影·待机模式', glyph: '影', img: 'assets/webcam.jpg', pos: 'center 24%', silhouette: true, desc: '屏幕前的剪影，正在等待下一次下播。' },
    { id: 'sil3', rarity: 'r', name: '剪影·觉醒模式', glyph: '影', img: 'assets/yalei.jpg', pos: 'center 30%', silhouette: true, desc: '据说这张剪影出现时，代表他真的生气了（并没有）。' }
  ];

  var RARITY = {
    ssr: { label: 'SSR', stars: '★★★', shard: 50 },
    sr: { label: 'SR', stars: '★★', shard: 20 },
    r: { label: 'R', stars: '★', shard: 10 }
  };

  var COST1 = 100, COST10 = 900;
  var PITY = 80;

  var el = {
    tickets: document.getElementById('tickets'),
    colCount: document.getElementById('colCount'),
    colTitle: document.getElementById('colTitle'),
    pityLeft: document.getElementById('pityLeft'),
    shards: document.getElementById('shards'),
    grid: document.getElementById('resultGrid'),
    machine: document.getElementById('machine'),
    dome: document.getElementById('dome'),
    note: document.getElementById('pullNote'),
    collection: document.getElementById('collection'),
    pull1: document.getElementById('pull1'),
    pull10: document.getElementById('pull10'),
    skip: document.getElementById('skipBtn'),
    supply: document.getElementById('supplyBtn'),
    exchange: document.getElementById('exchangeBtn')
  };

  var state = { tickets: 1000, col: [], pity: 0, shards: 0, busy: false };

  function load() {
    try {
      var t = parseInt(localStorage.getItem('ppr-gacha-tickets') || '', 10);
      if (!isNaN(t)) state.tickets = t;
      var p = parseInt(localStorage.getItem('ppr-gacha-pity') || '', 10);
      if (!isNaN(p)) state.pity = p;
      var s = parseInt(localStorage.getItem('ppr-gacha-shards') || '', 10);
      if (!isNaN(s)) state.shards = s;
      var c = JSON.parse(localStorage.getItem('ppr-gacha-col') || '[]');
      if (Object.prototype.toString.call(c) === '[object Array]') {
        state.col = c.filter(function (id) {
          for (var i = 0; i < CARDS.length; i++) if (CARDS[i].id === id) return true;
          return false;
        });
      }
    } catch (e) { /* ignore */ }
  }

  function save() {
    try {
      localStorage.setItem('ppr-gacha-tickets', String(state.tickets));
      localStorage.setItem('ppr-gacha-pity', String(state.pity));
      localStorage.setItem('ppr-gacha-shards', String(state.shards));
      localStorage.setItem('ppr-gacha-col', JSON.stringify(state.col));
      localStorage.setItem('ppr-gacha-count', String(state.col.length));
    } catch (e) { /* ignore */ }
  }

  function beep(f, d, t) { if (window.pprBeep) window.pprBeep(f, d, t); }
  function toast(msg) { if (window.pprToast) window.pprToast(msg); }

  function rarityOf(id) {
    for (var i = 0; i < CARDS.length; i++) if (CARDS[i].id === id) return CARDS[i].rarity;
    return 'r';
  }

  /* ---------- 渲染 ---------- */
  function renderStats() {
    el.tickets.textContent = String(state.tickets);
    el.colCount.textContent = String(state.col.length);
    el.colTitle.textContent = state.col.length + ' / 12';
    el.pityLeft.textContent = String(Math.max(0, PITY - state.pity));
    el.shards.textContent = String(state.shards);
  }

  function cardEl(card, opts) {
    var d = document.createElement('div');
    d.className = 'gcard ' + card.rarity;
    d.title = card.name + '：' + card.desc;
    if (opts && opts.delay) {
      d.style.animationDelay = opts.delay + 'ms';
    }
    if (card.img) {
      var art = document.createElement('img');
      art.className = 'art' + (card.silhouette ? ' silhouette' : '');
      art.src = card.img;
      art.alt = card.name;
      if (card.pos) art.style.setProperty('--pos', card.pos);
      d.appendChild(art);
      var veil = document.createElement('div');
      veil.className = 'veil';
      d.appendChild(veil);
      var rar = document.createElement('span');
      rar.className = 'rar';
      rar.textContent = RARITY[card.rarity].label;
      d.appendChild(rar);
      var body = document.createElement('div');
      body.className = 'cbody';
      var nm = document.createElement('div');
      nm.className = 'cname';
      nm.textContent = card.name;
      var st = document.createElement('div');
      st.className = 'stars';
      st.textContent = RARITY[card.rarity].stars;
      body.appendChild(nm);
      body.appendChild(st);
      d.appendChild(body);
    } else {
      var glyph = document.createElement('div');
      glyph.className = 'glyph';
      glyph.textContent = card.glyph;
      var name = document.createElement('div');
      name.className = 'cname';
      name.textContent = card.name;
      var stars = document.createElement('div');
      stars.className = 'stars';
      stars.textContent = RARITY[card.rarity].stars;
      d.appendChild(glyph);
      d.appendChild(name);
      d.appendChild(stars);
    }
    if (opts && opts.isNew) {
      var bag = document.createElement('div');
      bag.style.cssText = 'position:absolute;top:4px;left:4px;font-size:8px;font-weight:900;background:#d1342a;color:#fff;padding:1px 4px;border-radius:4px;letter-spacing:.06em';
      bag.textContent = 'NEW';
      d.appendChild(bag);
    }
    if (opts && opts.dupe) {
      var dup = document.createElement('div');
      dup.style.cssText = 'position:absolute;bottom:4px;right:4px;font-size:8px;font-weight:900;background:rgba(36,28,22,.75);color:#ffe9a8;padding:1px 4px;border-radius:4px';
      dup.textContent = '重复';
      d.appendChild(dup);
    }
    return d;
  }

  function renderCollection() {
    el.collection.innerHTML = '';
    for (var i = 0; i < CARDS.length; i++) {
      var c = CARDS[i];
      var owned = state.col.indexOf(c.id) >= 0;
      if (owned) {
        el.collection.appendChild(cardEl(c));
      } else {
        var d = document.createElement('div');
        d.className = 'gcard locked';
        d.title = '还没抽到';
        d.innerHTML = '<div class="glyph">?</div><div class="cname">未解锁</div><div class="stars">' + RARITY[c.rarity].stars + '</div>';
        el.collection.appendChild(d);
      }
    }
  }

  /* ---------- 抽卡 ---------- */
  function rollOnce(forceMin) {
    state.pity += 1;
    var r = Math.random() * 100;
    var rarity;
    if (state.pity >= PITY) rarity = 'ssr';
    else if (r < 3) rarity = 'ssr';
    else if (r < 15) rarity = 'sr';
    else rarity = 'r';
    if (forceMin === 'sr' && rarity === 'r') rarity = 'sr';
    if (rarity === 'ssr') state.pity = 0;
    var pool = [];
    for (var i = 0; i < CARDS.length; i++) if (CARDS[i].rarity === rarity) pool.push(CARDS[i]);
    return pool[Math.floor(Math.random() * pool.length)];
  }

  function doPull(n) {
    if (state.busy) return;
    var cost = n === 10 ? COST10 : COST1;
    if (state.tickets < cost) {
      toast('抽卡券不够了，配泼睿建议你先去睡觉回复体力');
      beep(180, 0.12, 'square');
      return;
    }
    state.busy = true;
    state.tickets -= cost;

    var results = [];
    for (var i = 0; i < n; i++) results.push(rollOnce());
    if (n === 10) {
      var hasSr = false;
      for (var j = 0; j < results.length; j++) if (results[j].rarity !== 'r') hasSr = true;
      if (!hasSr) results[9] = rollOnce('sr');
    }

    var gainedShards = 0, newCount = 0;
    el.grid.innerHTML = '';
    el.grid.hidden = false;
    el.grid.classList.toggle('single', n === 1);
    var gotSSR = false;

    for (var k = 0; k < results.length; k++) {
      var card = results[k];
      var isNew = state.col.indexOf(card.id) < 0;
      if (isNew) {
        state.col.push(card.id);
        newCount += 1;
      } else {
        state.shards += RARITY[card.rarity].shard;
        gainedShards += RARITY[card.rarity].shard;
      }
      if (card.rarity === 'ssr') gotSSR = true;
      el.grid.appendChild(cardEl(card, { isNew: isNew, dupe: !isNew }));
    }

    save();
    renderStats();
    renderCollection();

    if (el.machine) el.machine.style.display = 'none';
    if (el.skip) el.skip.hidden = true;
    if (el.dome) {
      el.dome.classList.add('turn');
      setTimeout(function () { el.dome.classList.remove('turn'); }, 460);
    }

    var msg = n === 1 ? '单抽完成。' : '十连完成。';
    if (newCount) msg += ' 新卡 +' + newCount + '。';
    if (gainedShards) msg += ' 重复卡分解出 ' + gainedShards + ' 碎片。';
    if (!newCount && !gainedShards) msg += ' 嗯……';
    el.note.textContent = msg;

    if (gotSSR) {
      beep(660, 0.09, 'square');
      setTimeout(function () { beep(880, 0.11, 'square'); }, 120);
      setTimeout(function () { beep(1320, 0.18, 'square'); }, 260);
      setTimeout(function () { toast('SSR！快截图，配泼睿本人都没抽到过'); }, 400);
    } else if (n === 1) {
      beep(760, 0.07, 'triangle');
    } else {
      beep(700, 0.06, 'triangle');
      setTimeout(function () { beep(900, 0.08, 'triangle'); }, 90);
    }

    state.busy = false;
  }

  /* ---------- 事件 ---------- */
  if (el.pull1) el.pull1.addEventListener('click', function () { doPull(1); });
  if (el.pull10) el.pull10.addEventListener('click', function () { doPull(10); });

  if (el.supply) {
    el.supply.addEventListener('click', function () {
      state.tickets += 100;
      save();
      renderStats();
      beep(980, 0.06, 'sine');
      toast('补给到账 +100 券。配泼睿说这是最后一次（上次也这么说）');
    });
  }

  if (el.exchange) {
    el.exchange.addEventListener('click', function () {
      if (state.shards < 100) {
        toast('碎片不够，还差 ' + (100 - state.shards) + ' 个');
        beep(180, 0.1, 'square');
        return;
      }
      state.shards -= 100;
      state.tickets += 100;
      save();
      renderStats();
      beep(1100, 0.07, 'sine');
      toast('100 碎片换到 100 抽卡券，经济学奇迹');
    });
  }

  /* ---------- 启动 ---------- */
  load();
  renderStats();
  renderCollection();

  if (location.search.indexOf('demo') >= 0) {
    state.tickets = 5000;
    state.col = ['towel', 'webcam', 'track', 'brawl', 'wanted', 'meme'];
    state.shards = 240;
    state.pity = 31;
    renderStats();
    renderCollection();
    setTimeout(function () { doPull(10); }, 150);
  }
})();
