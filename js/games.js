'use strict';

/* =========================================================
   腦友記 · 每日動腦筋
   games.js：六個小練習
   共用 app.js 的 el / shuffle / pick / praise / gentle 等工具
   ========================================================= */

/* ---------------- 共用小元件 ---------------- */
function itemCard(item, clickable) {
  const tag = clickable ? 'button' : 'div';
  const opts = { class: 'item-card' };
  if (clickable) opts.attrs = { type: 'button' };
  return el(tag, opts, [
    el('span', { class: 'item-icon', text: item.e, attrs: { 'aria-hidden': 'true' } }),
    el('span', { class: 'item-name', text: item.n })
  ]);
}

/* =========================================================
   1. 記憶配對：三對圖案，翻牌配對
   ========================================================= */
GAMES.pairs = {
  name: '記憶配對',
  start: function (ui) {
    const POOL = ['🍎', '🌻', '🐱', '🐟', '☂️', '🎈', '🚌', '🍌', '🍇', '🐦'];
    const picks = pick(POOL, 3);
    const deck = shuffle(picks.concat(picks).map(function (v) { return { v: v }; }));
    let first = null;
    let matched = 0;
    let locked = false;

    ui.clear();
    ui.prompt('翻開兩張一樣嘅圖案，湊成三對。');

    const grid = el('div', { class: 'grid grid-3' });

    deck.forEach(function (card) {
      const btn = el('button', {
        class: 'mem-card',
        attrs: { type: 'button', 'aria-label': '未翻開嘅圖案' }
      }, [
        el('span', { class: 'mem-inner' }, [
          el('span', { class: 'mem-face mem-back', text: '❓', attrs: { 'aria-hidden': 'true' } }),
          el('span', { class: 'mem-face mem-front', text: card.v, attrs: { 'aria-hidden': 'true' } })
        ])
      ]);
      btn.addEventListener('click', function () { flip(btn, card.v); });
      grid.appendChild(btn);
    });

    ui.stage.appendChild(grid);

    function flip(btn, val) {
      if (locked) return;
      if (btn.classList.contains('is-open') || btn.classList.contains('is-matched')) return;

      btn.classList.add('is-open');
      btn.setAttribute('aria-label', '圖案 ' + val);

      if (!first) {
        first = { btn: btn, val: val };
        return;
      }
      if (first.btn === btn) return;

      const prev = first;
      first = null;

      if (prev.val === val) {
        prev.btn.classList.add('is-matched');
        btn.classList.add('is-matched');
        prev.btn.disabled = true;
        btn.disabled = true;
        matched += 1;
        ui.good(praise() + '搵到一對！');
        if (matched === 3) {
          ui.prompt('三對都配對成功，好記性！');
          ui.later(function () { ui.finish(); }, 1200);
        }
      } else {
        locked = true;
        ui.try('唔係呢一對，我哋再試過。');
        ui.later(function () {
          prev.btn.classList.remove('is-open');
          btn.classList.remove('is-open');
          prev.btn.setAttribute('aria-label', '未翻開嘅圖案');
          btn.setAttribute('aria-label', '未翻開嘅圖案');
          locked = false;
          ui.clearFeedback();
        }, 1000);
      }
    }
  }
};

/* =========================================================
   2. 記三樣嘢：睇三樣，之後喺六樣之中認返出嚟
   ========================================================= */
GAMES.three = {
  name: '記三樣嘢',
  start: function (ui) {
    const POOL = [
      { e: '🍎', n: '蘋果' }, { e: '☂️', n: '雨傘' }, { e: '⌚', n: '手錶' },
      { e: '🔑', n: '鎖匙' }, { e: '🌻', n: '花' }, { e: '☕', n: '茶杯' },
      { e: '👓', n: '眼鏡' }, { e: '🐱', n: '貓' }, { e: '📻', n: '收音機' }
    ];

    const targets = pick(POOL, 3);
    const others = pick(POOL.filter(function (p) {
      return targets.indexOf(p) === -1;
    }), 3);

    let stage = 'show';

    ui.clear();
    ui.prompt(
      '記住呢三樣嘢，睇夠先按「我記住喇」。',
      '記住呢三樣嘢：' + targets.map(function (t) { return t.n; }).join('、') + '。睇夠先按掣。'
    );

    const grid = el('div', { class: 'grid grid-3' });
    targets.forEach(function (t) { grid.appendChild(itemCard(t, false)); });
    ui.stage.appendChild(grid);

    const go = el('button', {
      class: 'btn btn-primary big-btn',
      text: '我記住喇',
      attrs: { type: 'button' }
    });
    go.addEventListener('click', ask);
    ui.stage.appendChild(go);

    function ask() {
      if (stage !== 'show') return;
      stage = 'ask';

      ui.clear();
      ui.clearFeedback();
      ui.prompt('頭先見過邊三樣？揀返出嚟。');

      const nodes = [];
      const chosen = new Set();
      const counter = el('p', { class: 'counter', text: '已揀 0 / 3' });
      const grid2 = el('div', { class: 'grid grid-3' });
      const options = shuffle(targets.concat(others));

      options.forEach(function (item) {
        const card = itemCard(item, true);
        card.addEventListener('click', function () {
          if (stage !== 'ask') return;
          if (chosen.has(item.n)) {
            chosen.delete(item.n);
            card.classList.remove('is-chosen');
          } else if (chosen.size < 3) {
            chosen.add(item.n);
            card.classList.add('is-chosen');
          }
          counter.textContent = '已揀 ' + chosen.size + ' / 3';
          confirmBtn.disabled = chosen.size !== 3;
        });
        nodes.push({ item: item, card: card });
        grid2.appendChild(card);
      });

      const confirmBtn = el('button', {
        class: 'btn btn-primary big-btn',
        text: '確定',
        attrs: { type: 'button' }
      });
      confirmBtn.disabled = true;
      confirmBtn.addEventListener('click', check);

      ui.stage.appendChild(counter);
      ui.stage.appendChild(grid2);
      ui.stage.appendChild(confirmBtn);

      function check() {
        if (stage !== 'ask') return;
        stage = 'result';

        let hits = 0;
        nodes.forEach(function (entry) {
          const isTarget = targets.indexOf(entry.item) !== -1;
          const wasChosen = chosen.has(entry.item.n);
          entry.card.classList.remove('is-chosen');
          entry.card.disabled = true;
          if (isTarget) {
            entry.card.classList.add('is-correct');
            if (wasChosen) hits += 1;
          } else if (wasChosen) {
            entry.card.classList.add('is-wrong');
          }
        });

        ui.clear();
        ui.prompt('睇下結果：有綠色框嘅，就係頭先嗰三樣。', '');

        const grid3 = el('div', { class: 'grid grid-3' });
        nodes.forEach(function (entry) { grid3.appendChild(entry.card); });
        ui.stage.appendChild(grid3);

        const msg = hits === 3
          ? '三樣都記得，好記性！'
          : '你記得 ' + hits + ' 樣，好嘢！我哋下次再玩。';
        setFeedback(msg, 'good');
        speak(msg);

        const done = el('button', {
          class: 'btn btn-primary big-btn',
          text: '好喇，完成',
          attrs: { type: 'button' }
        });
        done.addEventListener('click', function () { ui.finish(); });
        ui.stage.appendChild(done);
      }
    }
  }
};

/* =========================================================
   3. 數字次序：由 1 開始順住按
   ========================================================= */
GAMES.order = {
  name: '數字次序',
  start: function (ui) {
    const total = 6;
    let next = 1;

    ui.clear();
    ui.prompt('由 1 開始，跟住 2、3、4，一路順住按落去。');

    const grid = el('div', { class: 'grid grid-3' });
    const tiles = {};

    shuffle([1, 2, 3, 4, 5, 6]).forEach(function (v) {
      const tile = el('button', {
        class: 'num-tile',
        text: String(v),
        attrs: { type: 'button', 'aria-label': '數字 ' + v }
      });
      tile.addEventListener('click', function () { tap(v, tile); });
      tiles[v] = tile;
      grid.appendChild(tile);
    });

    ui.stage.appendChild(grid);
    const status = el('p', { class: 'counter', text: '已按 0 / ' + total + ' 個數字' });
    ui.stage.appendChild(status);

    function tap(v, tile) {
      if (v === next) {
        tile.classList.add('is-done');
        tile.disabled = true;
        ui.good(praise() + v + ' 啱！');
        next += 1;
        status.textContent = '已按 ' + (next - 1) + ' / ' + total + ' 個數字';
        if (next > total) {
          ui.prompt('六個數字都排好，好嘢！');
          ui.later(function () { ui.finish(); }, 1200);
        }
        return;
      }

      ui.try('唔緊要，而家要按 ' + next + '。');
      speak('試下按 ' + next);
      const target = tiles[next];
      if (target) {
        target.classList.add('hint');
        ui.later(function () { target.classList.remove('hint'); }, 2100);
      }
    }
  }
};

/* =========================================================
   4. 生活常識：日常情境，揀最合適嘅做法
   ========================================================= */
const DAILY = [
  {
    q: '落雨出街，要帶咩？',
    opts: [
      { e: '☂️', t: '雨傘', ok: true },
      { e: '🕶️', t: '太陽眼鏡', ok: false },
      { e: '🧤', t: '手套', ok: false }
    ]
  },
  {
    q: '天氣好凍，出街著咩好？',
    opts: [
      { e: '🧥', t: '厚外套', ok: true },
      { e: '🩳', t: '短褲', ok: false },
      { e: '👕', t: '背心', ok: false }
    ]
  },
  {
    q: '覺得口渴，最好飲咩？',
    opts: [
      { e: '💧', t: '清水', ok: true },
      { e: '🥤', t: '汽水', ok: false },
      { e: '🍺', t: '啤酒', ok: false }
    ]
  },
  {
    q: '過馬路之前，要睇咩？',
    opts: [
      { e: '🚦', t: '行人過路燈', ok: true },
      { e: '📱', t: '手機', ok: false },
      { e: '🗺️', t: '地圖', ok: false }
    ]
  },
  {
    q: '食飯之前，應該做咩？',
    opts: [
      { e: '🧼', t: '洗手', ok: true },
      { e: '😴', t: '睡覺', ok: false },
      { e: '🎵', t: '唱歌', ok: false }
    ]
  },
  {
    q: '夜晚想睡覺，去邊度好？',
    opts: [
      { e: '🛏️', t: '睡房', ok: true },
      { e: '🍳', t: '廚房', ok: false },
      { e: '🚿', t: '浴室', ok: false }
    ]
  },
  {
    q: '煮食時聞到燶味，應該點做？',
    opts: [
      { e: '🚨', t: '熄火，再話畀家人知', ok: true },
      { e: '🪟', t: '開窗，繼續煮', ok: false },
      { e: '😌', t: '唔理佢', ok: false }
    ]
  },
  {
    q: '有陌生人打電話，叫你講銀行密碼，應該點做？',
    opts: [
      { e: '☎️', t: '即刻收線，話畀家人知', ok: true },
      { e: '💸', t: '照講畀佢聽', ok: false },
      { e: '🤝', t: '約佢出嚟見面', ok: false }
    ]
  },
  {
    q: '啲衫污糟咗，應該放入邊度？',
    opts: [
      { e: '🧺', t: '洗衣籃', ok: true },
      { e: '🧊', t: '雪櫃', ok: false },
      { e: '📚', t: '書架', ok: false }
    ]
  },
  {
    q: '食藥之前，最好同邊個確認一下？',
    opts: [
      { e: '👨‍👩‍👧', t: '家人或者醫生', ok: true },
      { e: '🐱', t: '屋企隻貓', ok: false },
      { e: '📺', t: '電視節目', ok: false }
    ]
  },
  {
    q: '出街返到屋企，第一樣做咩好？',
    opts: [
      { e: '🚪', t: '關好門', ok: true },
      { e: '📺', t: '開電視', ok: false },
      { e: '🍽️', t: '食飯', ok: false }
    ]
  }
];

GAMES.daily = {
  name: '生活常識',
  start: function (ui) {
    const round = pick(DAILY, 5);
    let index = 0;

    nextQuestion();

    function nextQuestion() {
      if (index >= round.length) {
        ui.finish();
        return;
      }

      const q = round[index];
      index += 1;

      ui.clear();
      ui.clearFeedback();
      ui.prompt(
        q.q + '（第 ' + index + ' / ' + round.length + ' 題）',
        q.q
      );

      const list = el('div', { class: 'grid grid-1' });

      shuffle(q.opts).forEach(function (opt) {
        const btn = el('button', {
          class: 'option-card',
          attrs: { type: 'button' }
        }, [
          el('span', { class: 'opt-icon', text: opt.e, attrs: { 'aria-hidden': 'true' } }),
          el('span', { class: 'opt-text', text: opt.t })
        ]);

        btn.addEventListener('click', function () {
          if (btn.classList.contains('is-off') || btn.classList.contains('is-right')) return;

          if (opt.ok) {
            btn.classList.add('is-right');
            ui.good(praise() + ' ' + opt.t + '，答得好！');
            ui.later(nextQuestion, 1400);
          } else {
            btn.classList.add('is-off');
            ui.try(gentle() + '再揀另一個。');
          }
        });

        list.appendChild(btn);
      });

      ui.stage.appendChild(list);
    }
  }
};

/* =========================================================
   5. 找相同：喺六個圖案之中，搵返一模一樣嘅
   ========================================================= */
const SHAPES = ['circle', 'square', 'triangle', 'star', 'diamond'];
const SHAPE_COLORS = ['#c0392b', '#1d6fb8', '#2f7a4f', '#c98a12', '#7a3fa8'];

function starPoints(cx, cy, outer, inner, n) {
  const pts = [];
  const count = n || 5;
  for (let i = 0; i < count * 2; i++) {
    const ang = Math.PI / count * i - Math.PI / 2;
    const rad = (i % 2 === 0) ? outer : inner;
    pts.push((cx + Math.cos(ang) * rad).toFixed(2) + ',' + (cy + Math.sin(ang) * rad).toFixed(2));
  }
  return pts.join(' ');
}

function shapeSVG(shape, color) {
  const s = 100;
  const c = s / 2;
  let body = '';

  if (shape === 'circle') {
    body = '<circle cx="' + c + '" cy="' + c + '" r="' + (s * 0.4) + '" fill="' + color + '"/>';
  } else if (shape === 'square') {
    body = '<rect x="' + (s * 0.15) + '" y="' + (s * 0.15) + '" width="' + (s * 0.7) +
           '" height="' + (s * 0.7) + '" rx="' + (s * 0.05) + '" fill="' + color + '"/>';
  } else if (shape === 'triangle') {
    body = '<polygon points="' + c + ',' + (s * 0.12) + ' ' + (s * 0.9) + ',' + (s * 0.86) +
           ' ' + (s * 0.1) + ',' + (s * 0.86) + '" fill="' + color + '"/>';
  } else if (shape === 'star') {
    body = '<polygon points="' + starPoints(c, c, s * 0.44, s * 0.19, 5) + '" fill="' + color + '"/>';
  } else {
    body = '<polygon points="' + c + ',' + (s * 0.08) + ' ' + (s * 0.9) + ',' + c + ' ' +
           c + ',' + (s * 0.92) + ' ' + (s * 0.1) + ',' + c + '" fill="' + color + '"/>';
  }

  return '<svg viewBox="0 0 ' + s + ' ' + s + '" xmlns="http://www.w3.org/2000/svg" ' +
         'role="img" aria-hidden="true" focusable="false">' + body + '</svg>';
}

function allShapeCombos() {
  const list = [];
  SHAPES.forEach(function (shape) {
    SHAPE_COLORS.forEach(function (color) {
      list.push({ shape: shape, color: color });
    });
  });
  return list;
}

GAMES.match = {
  name: '找相同',
  start: function (ui) {
    const ROUNDS = 4;
    let index = 0;

    nextRound();

    function nextRound() {
      if (index >= ROUNDS) {
        ui.finish();
        return;
      }

      index += 1;
      ui.clear();
      ui.clearFeedback();

      const target = {
        shape: SHAPES[randInt(SHAPES.length)],
        color: SHAPE_COLORS[randInt(SHAPE_COLORS.length)]
      };

      const distractors = shuffle(allShapeCombos().filter(function (combo) {
        return combo.shape !== target.shape || combo.color !== target.color;
      })).slice(0, 5);

      ui.prompt(
        '上面嘅圖案，喺下面搵返一模一樣嘅。（第 ' + index + ' / ' + ROUNDS + ' 題）',
        '上面嘅圖案，喺下面搵返一模一樣嘅。'
      );

      const frame = el('div', { class: 'shape-frame is-target', attrs: { 'aria-label': '要找嘅圖案' } });
      frame.innerHTML = shapeSVG(target.shape, target.color);
      ui.stage.appendChild(frame);

      const grid = el('div', { class: 'grid grid-3' });
      let answered = false;

      shuffle([target].concat(distractors)).forEach(function (combo) {
        const btn = el('button', {
          class: 'shape-btn',
          attrs: { type: 'button', 'aria-label': '圖案選項' }
        });
        btn.innerHTML = shapeSVG(combo.shape, combo.color);

        btn.addEventListener('click', function () {
          if (answered) return;
          if (combo.shape === target.shape && combo.color === target.color) {
            answered = true;
            btn.classList.add('is-right');
            ui.good(praise() + '一模一樣！');
            ui.later(nextRound, 1100);
          } else {
            btn.classList.add('is-off');
            ui.try(gentle() + '留意下形狀同顏色。');
          }
        });

        grid.appendChild(btn);
      });

      ui.stage.appendChild(grid);
    }
  }
};

/* =========================================================
   6. 物件分類：生果 vs 衣物
   ========================================================= */
const SORT_ITEMS = [
  { e: '🍎', n: '蘋果', cat: 'fruit' },
  { e: '🍌', n: '香蕉', cat: 'fruit' },
  { e: '🍇', n: '提子', cat: 'fruit' },
  { e: '🍊', n: '橙', cat: 'fruit' },
  { e: '👕', n: '衫', cat: 'cloth' },
  { e: '👖', n: '褲', cat: 'cloth' },
  { e: '🧦', n: '襪', cat: 'cloth' },
  { e: '🧥', n: '外套', cat: 'cloth' }
];

GAMES.sort = {
  name: '物件分類',
  start: function (ui) {
    const fruits = SORT_ITEMS.filter(function (i) { return i.cat === 'fruit'; });
    const clothes = SORT_ITEMS.filter(function (i) { return i.cat === 'cloth'; });
    const items = shuffle(pick(fruits, 3).concat(pick(clothes, 3)));
    let index = 0;

    render();

    function render() {
      if (index >= items.length) {
        ui.finish();
        return;
      }

      const item = items[index];
      ui.clear();
      ui.clearFeedback();
      ui.prompt(
        '呢樣係咩？佢屬於邊一類？（第 ' + (index + 1) + ' / ' + items.length + ' 件）',
        '呢樣係咩？佢屬於邊一類？'
      );

      ui.stage.appendChild(itemCard(item, false));

      const row = el('div', { class: 'basket-row' });
      const baskets = [
        { key: 'fruit', icon: '🍎', name: '生果' },
        { key: 'cloth', icon: '👕', name: '衣物' }
      ];

      baskets.forEach(function (b) {
        const btn = el('button', {
          class: 'basket-btn',
          attrs: { type: 'button' }
        }, [
          el('span', { class: 'basket-icon', text: b.icon, attrs: { 'aria-hidden': 'true' } }),
          el('span', { text: b.name })
        ]);

        btn.addEventListener('click', function () {
          if (btn.classList.contains('is-locked')) return;

          if (b.key === item.cat) {
            btn.classList.add('is-locked');
            ui.good(praise() + item.n + '係' + b.name + '。');
            index += 1;
            ui.later(render, 1200);
          } else {
            ui.try(gentle() + '再想一想。');
          }
        });

        row.appendChild(btn);
      });

      ui.stage.appendChild(row);
    }
  }
};
