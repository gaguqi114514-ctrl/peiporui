/* ============================================================
   配泼睿浓度测试 —— 8 题人格/浓度小测验
   ============================================================ */
(function () {
  'use strict';

  var root = document.getElementById('quizBody');
  if (!root) return;

  var bar = document.getElementById('qbar');
  var idxEl = document.getElementById('qindex');
  var scoreEl = document.getElementById('qscore');

  var QUESTIONS = [
    {
      q: '配泼睿最常说的口头禅是哪一句？',
      opts: [
        { t: '「我下的任务罢了。」', p: 2 },
        { t: '「我不想上班。」', p: 0 },
        { t: '「再睡五分钟。」', p: 1 }
      ]
    },
    {
      q: '他的「本体」是什么？',
      opts: [
        { t: '一条蓝色毛巾', p: 2 },
        { t: '一副圆框眼镜', p: 1 },
        { t: '一双蓝色拖鞋', p: 0 }
      ]
    },
    {
      q: '他在田径场上的标准状态是？',
      opts: [
        { t: '被迫营业式微笑', p: 2 },
        { t: '全力冲刺，势不可挡', p: 0 },
        { t: '认真拉伸，科学训练', p: 1 }
      ]
    },
    {
      q: '他的外卖备注一般写什么？',
      opts: [
        { t: '「放门口，别敲门，谢谢。」', p: 2 },
        { t: '「多放辣，谢谢。」', p: 0 },
        { t: '「麻烦快一点，我饿了。」', p: 1 }
      ]
    },
    {
      q: '「呀嘞呀嘞」通常在什么时候出现？',
      opts: [
        { t: '被叫起床的时候', p: 2 },
        { t: '考试前一天晚上', p: 0 },
        { t: '点外卖的时候', p: 1 }
      ]
    },
    {
      q: '他怀里那只玩偶的实际用途是？',
      opts: [
        { t: '人质，用来要挟室友带饭', p: 2 },
        { t: '睡觉时抱着比较安心', p: 1 },
        { t: '纯装饰，摆着好看', p: 0 }
      ]
    },
    {
      q: '通缉令上的悬赏金额是多少？',
      opts: [
        { t: '114,514,000,000 津巴布韦币', p: 2 },
        { t: '100 元人民币', p: 0 },
        { t: '一顿食堂饭', p: 1 }
      ]
    },
    {
      q: '如果配泼睿真的醒了，他第一件事最可能是？',
      opts: [
        { t: '翻个身，继续睡', p: 2 },
        { t: '下楼跑两圈', p: 0 },
        { t: '打开电脑学习', p: 1 }
      ]
    }
  ];

  var state = { i: 0, score: 0, answered: false };

  var best = 0;
  try { best = parseInt(localStorage.getItem('ppr-quiz-best') || '0', 10) || 0; } catch (e) { best = 0; }

  function beep(f, d, t) { if (window.pprBeep) window.pprBeep(f, d, t); }

  function renderQuestion() {
    var q = QUESTIONS[state.i];
    if (bar) bar.style.width = ((state.i) / QUESTIONS.length * 100) + '%';
    if (idxEl) idxEl.textContent = '第 ' + (state.i + 1) + ' / ' + QUESTIONS.length + ' 题';
    if (scoreEl) scoreEl.textContent = '当前 ' + state.score + ' 分';

    var html = '<h2 class="qtitle">' + q.q + '</h2>';
    for (var i = 0; i < q.opts.length; i++) {
      html += '<button class="opt" type="button" data-i="' + i + '">' + q.opts[i].t + '</button>';
    }
    root.innerHTML = html;

    var buttons = root.querySelectorAll('.opt');
    for (var b = 0; b < buttons.length; b++) {
      buttons[b].addEventListener('click', onPick);
    }
  }

  function onPick(ev) {
    if (state.answered) return;
    state.answered = true;
    var btn = ev.currentTarget;
    var oi = parseInt(btn.getAttribute('data-i'), 10);
    var pts = QUESTIONS[state.i].opts[oi].p;
    state.score += pts;
    btn.classList.add('sel');
    beep(pts >= 2 ? 980 : 620, 0.06, 'triangle');
    if (scoreEl) scoreEl.textContent = '当前 ' + state.score + ' 分';

    var delay = 260;
    setTimeout(function () {
      state.i += 1;
      state.answered = false;
      if (state.i >= QUESTIONS.length) {
        finish();
      } else {
        renderQuestion();
      }
    }, delay);
  }

  function rankOf(score) {
    if (score >= 16) return {
      rank: '配泼睿本人',
      desc: '别装了，你就是他。请立刻从被窝里出来，你的室友在门口等了三天了。'
    };
    if (score >= 13) return {
      rank: '后援会会长',
      desc: '你比配泼睿本人更了解配泼睿。这既是一种荣誉，也是一种需要反思的事情。'
    };
    if (score >= 9) return {
      rank: '配泼睿研究员',
      desc: '你熟悉他的每一个名场面，甚至能背出外卖备注。建议把这份热情用在工作上。'
    };
    if (score >= 5) return {
      rank: '普通室友',
      desc: '你知道他爱睡觉，但不知道他的毛巾有几个形态。你还算正常，请保持。'
    };
    return {
      rank: '路人甲',
      desc: '你只是路过，甚至不确定他姓配还是姓泼。没关系，现在你知道了，快跑。'
    };
  }

  function finish() {
    if (bar) bar.style.width = '100%';
    if (idxEl) idxEl.textContent = '已完成 · 8 / 8';
    if (scoreEl) scoreEl.textContent = '最终 ' + state.score + ' 分';
    var r = rankOf(state.score);
    if (state.score > best) {
      best = state.score;
      try { localStorage.setItem('ppr-quiz-best', String(best)); } catch (e) { /* ignore */ }
    }
    root.innerHTML =
      '<div class="quiz-result">' +
      '<div style="font-size:40px;line-height:1">🧪</div>' +
      '<div class="rank">' + r.rank + '</div>' +
      '<div class="score">浓度 ' + state.score + ' / 16 ／ 历史最高 ' + best + '</div>' +
      '<p style="font-size:14px;line-height:1.85;color:#43372d;max-width:56ch;margin:0 auto 18px">' + r.desc + '</p>' +
      '<div class="ov-btns">' +
      '<button class="btn primary" id="againBtn" type="button">再测一次</button>' +
      '<button class="btn ghost" id="shareBtn" type="button">复制结果去炫耀</button>' +
      '<a class="btn ghost" href="arcade.html">回游戏厅</a>' +
      '</div></div>';

    var again = document.getElementById('againBtn');
    if (again) {
      again.addEventListener('click', function () {
        state.i = 0;
        state.score = 0;
        state.answered = false;
        renderQuestion();
        beep(660, 0.07, 'square');
      });
    }
    var share = document.getElementById('shareBtn');
    if (share) {
      share.addEventListener('click', function () {
        var text = '我在《配泼睿浓度测试》里拿了 ' + state.score + ' / 16 分，称号是「' + r.rank + '」。你呢？';
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(text + ' ' + location.href).then(function () {
            if (window.pprToast) window.pprToast('结果已复制，快去群里炫耀');
          }).catch(function () {
            if (window.pprToast) window.pprToast('复制失败，手动截图吧');
          });
        } else if (window.pprToast) {
          window.pprToast('复制失败，手动截图吧');
        }
      });
    }
    beep(720, 0.08, 'square');
    setTimeout(function () { beep(980, 0.1, 'square'); }, 130);
    setTimeout(function () { beep(1220, 0.14, 'square'); }, 260);
  }

  renderQuestion();

  if (location.search.indexOf('demo') >= 0) {
    state.score = 14;
    state.i = QUESTIONS.length;
    finish();
  }
})();
