/* ============================================================
   配泼睿官方网站 · 交互脚本
   （纯前端，无依赖；所有整蛊都在本地完成，不会真的报警）
   ============================================================ */
(function () {
  'use strict';

  var $ = function (sel, root) { return (root || document).querySelector(sel); };
  var $$ = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };

  /* ---------------- 音效（WebAudio 合成，无外部文件） ---------------- */
  var soundOn = true;
  var actx = null;
  function beep(freq, dur, type) {
    if (!soundOn) return;
    try {
      var AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      actx = actx || new AC();
      var osc = actx.createOscillator();
      var gain = actx.createGain();
      osc.type = type || 'square';
      osc.frequency.value = freq || 620;
      gain.gain.value = 0.035;
      osc.connect(gain);
      gain.connect(actx.destination);
      var t = actx.currentTime;
      osc.start(t);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + (dur || 0.09));
      osc.stop(t + (dur || 0.09));
    } catch (e) { /* 静默失败 */ }
  }

  /* ---------------- 提示条 ---------------- */
  var toastWrap = null;
  function toast(msg) {
    if (!toastWrap) {
      toastWrap = document.createElement('div');
      toastWrap.className = 'toast-wrap';
      document.body.appendChild(toastWrap);
    }
    var el = document.createElement('div');
    el.className = 'toast';
    el.textContent = msg;
    toastWrap.appendChild(el);
    setTimeout(function () { el.remove(); }, 3000);
  }
  window.pprToast = toast;

  /* ---------------- 通用小工具 ---------------- */
  function rand(min, max) { return Math.random() * (max - min) + min; }
  function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

  function emojiBurst(x, y, n) {
    var chars = ['✨', '🎉', '🧻', '⭐', '🫧', '🔵', '🥳', '💤'];
    for (var i = 0; i < (n || 10); i++) {
      var s = document.createElement('span');
      s.className = 'confetti';
      s.textContent = pick(chars);
      s.style.left = x + 'px';
      s.style.top = y + 'px';
      s.style.setProperty('--dx', rand(-90, 90) + 'px');
      s.style.setProperty('--dy', rand(-120, -30) + 'px');
      document.body.appendChild(s);
      (function (node) { setTimeout(function () { node.remove(); }, 1000); })(s);
    }
  }

  /* ---------------- 年份 / 访客计数 ---------------- */
  $$('#year, #year2').forEach(function (el) { el.textContent = new Date().getFullYear(); });

  var visitEl = $('#visitCount');
  if (visitEl) {
    var KEY = 'ppr-visits';
    var n = 0;
    try { n = parseInt(localStorage.getItem(KEY) || '0', 10) || 0; } catch (e) { n = 0; }
    n += 1;
    try { localStorage.setItem(KEY, String(n)); } catch (e) { /* 隐身模式下忽略 */ }
    visitEl.textContent = (114514 + n).toLocaleString('en-US');
  }

  /* ---------------- 在线人数（假装很热闹） ---------------- */
  var onlineEl = $('#onlineCount');
  if (onlineEl) {
    var online = 3 + Math.floor(Math.random() * 4);
    setInterval(function () {
      online += Math.random() > 0.5 ? 1 : -1;
      if (online < 1) online = 1;
      if (online > 12) online = 12;
      onlineEl.textContent = online;
    }, 2600);
  }

  /* ---------------- 今日状态 ---------------- */
  var statusText = $('#statusText');
  if (statusText) {
    var statuses = [
      '正在被窝里开周会（主持人：自己）',
      '正在和玩偶谈判，人质情绪稳定',
      '正在把蓝毛巾叠成王冠，已失败 14 次',
      '正在假装自己很忙，其实在刷手机',
      '正在田径场被迫营业，微笑已就位',
      '正在思考晚饭吃什么（已思考 3 小时）',
      '正在眼镜反光中观察人类',
      '正在睡觉（勿扰模式已开启）',
      '正在说「再玩五分钟」，已过 90 分钟',
      '正在被室友催起床，进度 2%'
    ];
    var stampEl = $('#statusTime');
    var setStatus = function () {
      statusText.textContent = pick(statuses);
      if (stampEl) stampEl.textContent = '更新于 ' + new Date().toLocaleTimeString('zh-CN', { hour12: false });
    };
    setStatus();
    var roll = $('#rollStatus');
    if (roll) {
      roll.addEventListener('click', function () {
        setStatus();
        beep(880, 0.06, 'triangle');
        toast('状态已刷新，反正他也不承认');
      });
    }
  }

  /* ---------------- 倒计时：下一次「再玩五分钟」 ---------------- */
  var cdEl = $('#countdown');
  if (cdEl) {
    var pad = function (v) { return String(v).padStart(2, '0'); };
    var tick = function () {
      var now = new Date();
      var t = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 3, 0, 0, 0);
      if (t <= now) t.setDate(t.getDate() + 1);
      var d = t - now;
      var h = Math.floor(d / 3600000);
      var m = Math.floor((d % 3600000) / 60000);
      var s = Math.floor((d % 60000) / 1000);
      cdEl.textContent = pad(h) + ':' + pad(m) + ':' + pad(s);
    };
    tick();
    setInterval(tick, 1000);
  }

  /* ---------------- 滚动进入动画 ---------------- */
  var reveals = $$('.reveal');
  if ('IntersectionObserver' in window && reveals.length) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) {
          en.target.classList.add('in');
          io.unobserve(en.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
    reveals.forEach(function (el) { io.observe(el); });
  } else {
    reveals.forEach(function (el) { el.classList.add('in'); });
  }

  /* ---------------- 技能条 ---------------- */
  var skills = $$('.skill');
  if (skills.length) {
    var fillSkills = function () {
      skills.forEach(function (skill, i) {
        var bar = $('.bar i', skill);
        if (!bar) return;
        var val = bar.getAttribute('data-val') || '0';
        setTimeout(function () { bar.style.width = val + '%'; }, 120 + i * 90);
      });
    };
    if ('IntersectionObserver' in window) {
      var skillBox = $('.skills');
      if (skillBox) {
        var sio = new IntersectionObserver(function (entries) {
          entries.forEach(function (en) {
            if (en.isIntersecting) { fillSkills(); sio.disconnect(); }
          });
        }, { threshold: 0.2 });
        sio.observe(skillBox);
      } else { fillSkills(); }
    } else { fillSkills(); }
    // 兜底：无论如何 2.6 秒后都把进度条填上
    setTimeout(fillSkills, 2600);
  }

  /* ---------------- 音效开关 ---------------- */
  var soundBtn = $('#soundBtn');
  if (soundBtn) {
    soundBtn.addEventListener('click', function () {
      soundOn = !soundOn;
      soundBtn.textContent = soundOn ? '🔊' : '🔇';
      soundBtn.setAttribute('aria-pressed', String(soundOn));
      if (soundOn) beep(760, 0.08, 'sine');
      toast(soundOn ? '音效已开启：更吵了' : '音效已关闭：安静如被窝');
    });
  }

  /* ---------------- 点击音效 ---------------- */
  document.addEventListener('click', function (e) {
    var t = e.target.closest ? e.target.closest('.btn, .nav a, .chip, .sound-btn, .shot, .award') : null;
    if (t) beep(rand(600, 920), 0.05, 'triangle');
  }, true);

  /* ---------------- 离谱弹窗 ---------------- */
  var modal = $('#modal');
  if (modal) {
    var dodge = $('#dodgeBtn');
    var stay = $('#stayBtn');
    var seen = false;
    try { seen = sessionStorage.getItem('ppr-modal') === '1'; } catch (e) { seen = false; }

    var openModal = function () {
      modal.hidden = false;
      requestAnimationFrame(function () { modal.classList.add('show'); });
      beep(520, 0.14, 'sawtooth');
    };
    var closeModal = function (msg) {
      modal.hidden = true;
      modal.classList.remove('show');
      try { sessionStorage.setItem('ppr-modal', '1'); } catch (e) { /* ignore */ }
      if (msg) {
        toast(msg);
        emojiBurst(window.innerWidth / 2, window.innerHeight - 120, 14);
      }
    };

    if (!seen) setTimeout(openModal, 1300);

    if (stay) {
      stay.addEventListener('click', function () {
        closeModal('好的，你已被登记为第 114,515 位目击者');
      });
    }
    if (dodge) {
      var dodges = 0;
      dodge.addEventListener('mouseenter', function () {
        if (dodges >= 3) return;
        dodges += 1;
        dodge.style.transform = 'translate(' + rand(-70, 70).toFixed(0) + 'px,' + rand(-26, 26).toFixed(0) + 'px)';
        beep(240 + dodges * 90, 0.07, 'sawtooth');
        if (dodges >= 3) dodge.textContent = '……好吧，我错了';
      });
      dodge.addEventListener('click', function () {
        if (dodges < 3) {
          dodges = 3;
          dodge.textContent = '……好吧，我错了';
          return;
        }
        closeModal('知错就好，配泼睿表示原谅你了');
      });
    }
    modal.addEventListener('click', function (e) {
      if (e.target === modal) closeModal('');
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && !modal.hidden) closeModal('');
    });
  }

  /* ---------------- 打赏（假的，别当真） ---------------- */
  var donate = $('#donateBtn');
  if (donate) {
    var coins = 0;
    donate.addEventListener('click', function (e) {
      coins += 1;
      var label = $('#donateLabel');
      if (label) label.textContent = '已投喂 ' + coins + ' 次（钱没到账）';
      emojiBurst(e.clientX || window.innerWidth / 2, e.clientY || window.innerHeight / 2, 8);
      beep(1200, 0.05, 'sine');
      setTimeout(function () { beep(1600, 0.05, 'sine'); }, 70);
      if (coins === 5) toast('够了够了，再投配泼睿就要起床了');
    });
  }

  /* ---------------- 彩蛋：输入 ppr ---------------- */
  var buffer = '';
  document.addEventListener('keydown', function (e) {
    if (e.key && e.key.length === 1) {
      buffer = (buffer + e.key.toLowerCase()).slice(-3);
      if (buffer === 'ppr') {
        buffer = '';
        var chars = ['🧣', '🔵', '😴', '🥸', '💤', '🎉', '🛏️'];
        for (var i = 0; i < 44; i++) {
          var s = document.createElement('span');
          s.className = 'rain';
          s.textContent = pick(chars);
          s.style.left = rand(0, 96) + 'vw';
          s.style.animationDuration = rand(2.2, 4.6) + 's';
          s.style.animationDelay = rand(0, 1.4) + 's';
          s.style.fontSize = rand(18, 40) + 'px';
          document.body.appendChild(s);
          (function (node) { setTimeout(function () { node.remove(); }, 7000); })(s);
        }
        beep(660, 0.1, 'square');
        setTimeout(function () { beep(880, 0.12, 'square'); }, 120);
        toast('彩蛋已触发：配泼睿正在起床……失败');
      }
    }
  });

  /* ---------------- 图库灯箱 ---------------- */
  var shots = $$('.shot');
  var lightbox = $('#lightbox');
  if (shots.length && lightbox) {
    var lbImg = $('img', lightbox);
    var lbTitle = $('#lbTitle');
    var lbDesc = $('#lbDesc');
    var lbIdx = 0;
    var openLb = function (i) {
      lbIdx = (i + shots.length) % shots.length;
      var fig = shots[lbIdx];
      lbImg.src = fig.getAttribute('data-full');
      lbImg.alt = fig.getAttribute('data-title') || '配泼睿';
      lbTitle.textContent = fig.getAttribute('data-title') || '';
      lbDesc.textContent = fig.getAttribute('data-desc') || '';
      lightbox.hidden = false;
      beep(700, 0.05, 'sine');
    };
    shots.forEach(function (fig, i) {
      fig.addEventListener('click', function () { openLb(i); });
    });
    var closeLb = function () { lightbox.hidden = true; };
    $('#lbClose').addEventListener('click', closeLb);
    $('#lbPrev').addEventListener('click', function () { openLb(lbIdx - 1); });
    $('#lbNext').addEventListener('click', function () { openLb(lbIdx + 1); });
    lightbox.addEventListener('click', function (e) { if (e.target === lightbox) closeLb(); });
    document.addEventListener('keydown', function (e) {
      if (lightbox.hidden) return;
      if (e.key === 'Escape') closeLb();
      if (e.key === 'ArrowLeft') openLb(lbIdx - 1);
      if (e.key === 'ArrowRight') openLb(lbIdx + 1);
    });
  }

  /* ---------------- 通缉令盖章 ---------------- */
  var poster = $('#poster');
  if (poster) {
    var stamped = false;
    poster.addEventListener('click', function (e) {
      if (e.target.closest && e.target.closest('a')) return;
      if (stamped) { toast('别敲了，人已经被抓了（在床上）'); return; }
      stamped = true;
      poster.classList.add('stamped');
      var stamp = $('.stamp-big', poster);
      if (stamp) {
        stamp.style.transition = 'transform .4s cubic-bezier(.3,1.6,.4,1)';
        stamp.style.transform = 'rotate(-13deg) scale(1.35)';
        setTimeout(function () { stamp.style.transform = 'rotate(-13deg) scale(1)'; }, 380);
      }
      beep(140, 0.22, 'square');
      setTimeout(function () { toast('【盖章】已抓获（在床上），赏金归举报人所有'); }, 260);
    });
  }

  /* ---------------- 申请表单（永远拒绝） ---------------- */
  var applyForm = $('#applyForm');
  if (applyForm) {
    var reasons = [
      '❌ 申请已拒绝：好友位已满（0/0）。',
      '❌ 申请已拒绝：配泼睿正在被窝里，无法处理。',
      '❌ 申请已拒绝：系统检测到你还不够离谱。',
      '❌ 申请已拒绝：请先证明你能连续躺平 23 小时。',
      '❌ 申请已拒绝：理由「想认识帅哥」，与本人不符。'
    ];
    var rejectCount = 0;
    var out = $('#formOut');
    applyForm.addEventListener('submit', function (e) {
      e.preventDefault();
      rejectCount += 1;
      out.classList.add('show');
      out.innerHTML = reasons[(rejectCount - 1) % reasons.length] +
        '<br><span style="font-family:var(--font-fun);font-size:12px;color:var(--ink-soft)">（第 ' + rejectCount + ' 次申请，预计 114 年后回复）</span>';
      beep(200, 0.16, 'sawtooth');
    });
  }

  /* ---------------- 复制链接 ---------------- */
  $$('.copy-link').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var url = location.href;
      var done = function () { toast('链接已复制，快去祸害下一个朋友'); };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(url).then(done).catch(function () { toast('复制失败，请手动复制地址栏'); });
      } else {
        toast('复制失败，请手动复制地址栏');
      }
    });
  });

  /* ---------------- 切后台提醒 ---------------- */
  var originalTitle = document.title;
  document.addEventListener('visibilitychange', function () {
    if (document.hidden) {
      document.title = '别走！配泼睿还在被窝里等你';
    } else {
      document.title = originalTitle;
    }
  });
})();
