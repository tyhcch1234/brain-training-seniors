'use strict';

/* =========================================================
   腦友記 · 每日動腦筋
   app.js：共用工具、首頁、畫面切換、語音、記錄
   ========================================================= */

/* ---------------- DOM 小工具 ---------------- */
const $ = (sel, root) => (root || document).querySelector(sel);
const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));

function el(tag, opts, kids) {
  const node = document.createElement(tag);
  opts = opts || {};
  if (opts.class) node.className = opts.class;
  if (opts.text != null) node.textContent = opts.text;
  if (opts.attrs) {
    for (const k in opts.attrs) node.setAttribute(k, opts.attrs[k]);
  }
  if (opts.on) {
    for (const k in opts.on) node.addEventListener(k, opts.on[k]);
  }
  const list = kids == null ? [] : (Array.isArray(kids) ? kids : [kids]);
  for (const child of list) {
    if (child) node.appendChild(child);
  }
  return node;
}

/* ---------------- 隨機與鼓勵語 ---------------- */
function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const t = a[i]; a[i] = a[j]; a[j] = t;
  }
  return a;
}

function pick(arr, n) { return shuffle(arr).slice(0, n); }
function randInt(n) { return Math.floor(Math.random() * n); }

const PRAISE = ['好嘢！', '做得好好！', '好記性！', '好叻呀！', '答得好！', '好犀利！', '完全正確！'];
const GENTLE = ['唔緊要，慢慢嚟。', '再試一次就得。', '冇問題，我哋再睇清楚。', '差少少，再想一想。'];

function praise() { return PRAISE[randInt(PRAISE.length)]; }
function gentle() { return GENTLE[randInt(GENTLE.length)]; }

/* ---------------- 練習清單 ---------------- */
const ACTIVITIES = [
  { id: 'pairs', icon: '🃏', name: '記憶配對',  desc: '翻開兩張一樣嘅圖案' },
  { id: 'three', icon: '🧺', name: '記三樣嘢',  desc: '睇一陣，然後記返出嚟' },
  { id: 'order', icon: '🔢', name: '數字次序',  desc: '由細到大，順住按' },
  { id: 'daily', icon: '☂️', name: '生活常識',  desc: '日常事情，揀最啱嘅一個' },
  { id: 'match', icon: '⭐', name: '找相同',    desc: '搵出一模一樣嘅圖案' },
  { id: 'sort',  icon: '🍎', name: '物件分類',  desc: '分開生果同衣物' }
];

const TALK_CARDS = [
  '你細個住喺邊度？屋企附近有啲咩？',
  '你最鍾意食邊樣餸？係邊個煮畀你食？',
  '講一件你覺得最開心嘅事。',
  '你以前做過咩工作？最記得邊一樣？',
  '你最鍾意邊個季節？點解呀？',
  '細個過年，你屋企會做啲咩？',
  '你最想同邊個傾電話？講下佢。',
  '你識唱邊首歌？可以唱兩句。',
  '你養過咩小動物？叫咩名？',
  '你最叻做邊樣家務？'
];

/* ---------------- 儲存（本機） ---------------- */
const STORE_KEY = 'naojaukeoi_v1';
const store = { fontScale: 1, voice: true, days: {} };

function loadStore() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (raw) {
      const data = JSON.parse(raw);
      if (typeof data.fontScale === 'number') store.fontScale = data.fontScale;
      if (typeof data.voice === 'boolean') store.voice = data.voice;
      if (data.days && typeof data.days === 'object') store.days = data.days;
    }
  } catch (err) { /* 私人模式或未支援：照用預設 */ }
}

function saveStore() {
  try { localStorage.setItem(STORE_KEY, JSON.stringify(store)); } catch (err) { /* 忽略 */ }
}

function dayKey(d) {
  const p = n => String(n).padStart(2, '0');
  return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate());
}

function todayRecord() {
  const key = dayKey(new Date());
  if (!store.days[key]) store.days[key] = { rounds: 0, acts: {} };
  return store.days[key];
}

/* ---------------- 語音 ---------------- */
let zhVoice = null;

function loadVoices() {
  if (!('speechSynthesis' in window)) return;
  const voices = window.speechSynthesis.getVoices() || [];
  zhVoice = voices.find(v => /zh[-_]HK/i.test(v.lang))
         || voices.find(v => /zh[-_]TW/i.test(v.lang))
         || voices.find(v => /^zh/i.test(v.lang))
         || null;
}

function speak(text) {
  if (!store.voice || !text) return;
  if (!('speechSynthesis' in window)) return;
  try {
    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(String(text));
    utter.lang = 'zh-HK';
    utter.rate = 0.82;
    utter.pitch = 1;
    if (zhVoice) utter.voice = zhVoice;
    window.speechSynthesis.speak(utter);
  } catch (err) { /* 冇語音都照用文字 */ }
}

function stopSpeaking() {
  if ('speechSynthesis' in window) {
    try { window.speechSynthesis.cancel(); } catch (err) { /* 忽略 */ }
  }
}

/* ---------------- 字體大小 ---------------- */
const FONT_STEPS = [
  { scale: 1,    label: '大字' },
  { scale: 1.15, label: '特大' },
  { scale: 1.3,  label: '超大字' }
];

function applyFontScale() {
  const idx = Math.max(0, FONT_STEPS.findIndex(s => Math.abs(s.scale - store.fontScale) < 0.01));
  const step = FONT_STEPS[idx === -1 ? 0 : idx];
  document.documentElement.style.setProperty('--scale', String(step.scale));
  const label = $('#fontLabel');
  if (label) label.textContent = step.label;
}

function cycleFontScale() {
  const current = FONT_STEPS.findIndex(s => Math.abs(s.scale - store.fontScale) < 0.01);
  const next = FONT_STEPS[(current + 1 + FONT_STEPS.length) % FONT_STEPS.length];
  store.fontScale = next.scale;
  saveStore();
  applyFontScale();
  if ($('#fontLabel')) $('#fontLabel').textContent = next.label;
  speak('字體：' + next.label);
}

/* ---------------- 畫面切換 ---------------- */
function showScreen(name) {
  $$('.screen').forEach(s => s.classList.toggle('is-active', s.id === 'screen-' + name));
  window.scrollTo(0, 0);
}

/* ---------------- 練習流程 ---------------- */
const GAMES = {};
let session = null;
let currentId = null;

function cancelSession() {
  if (session) {
    session.timers.forEach(t => clearTimeout(t));
    session.token = 0;
    session = null;
  }
  stopSpeaking();
}

function startGame(id) {
  const game = GAMES[id];
  if (!game) return;
  cancelSession();
  currentId = id;
  session = { id: id, token: Date.now(), timers: [], finished: false };

  $('#playTitle').textContent = game.name;
  $('#playPrompt').textContent = '';
  $('#stage').innerHTML = '';
  setFeedback('');
  showScreen('play');

  const ui = {
    stage: $('#stage'),
    prompt: function (text, spoken) {
      $('#playPrompt').textContent = text;
      speak(spoken == null ? text : spoken);
    },
    clear: function () { $('#stage').innerHTML = ''; },
    good: function (text) { setFeedback(text, 'good'); },
    try: function (text) { setFeedback(text, 'try'); },
    clearFeedback: function () { setFeedback(''); },
    later: function (fn, ms) {
      const token = session ? session.token : 0;
      const timer = setTimeout(function () {
        if (session && session.token === token) fn();
      }, ms);
      session.timers.push(timer);
      return timer;
    },
    finish: function () { finishRound(id); }
  };

  game.start(ui);
}

function setFeedback(text, kind) {
  const box = $('#feedback');
  if (!box) return;
  box.textContent = text || '';
  box.className = 'feedback' + (text && kind ? ' ' + kind : '');
  if (text && box.scrollIntoView) {
    try { box.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); } catch (err) { /* 忽略 */ }
  }
}

function finishRound(id) {
  if (session) {
    session.timers.forEach(t => clearTimeout(t));
    session.finished = true;
  }
  const record = todayRecord();
  record.rounds += 1;
  record.acts[id] = (record.acts[id] || 0) + 1;
  saveStore();

  const act = ACTIVITIES.find(a => a.id === id) || { name: '練習' };
  const title = praise();
  $('#doneIcon').textContent = '🌟';
  $('#doneTitle').textContent = title;
  $('#doneText').textContent = act.name + '完成咗！今日已經做咗 ' + record.rounds + ' 個練習。';
  showScreen('done');
  speak(title + ' ' + act.name + '完成咗。今日已經做咗 ' + record.rounds + ' 個練習。');
  refreshHome();
}

function restartGame() {
  if (currentId && GAMES[currentId]) startGame(currentId);
  else showScreen('home');
}

function goHome() {
  cancelSession();
  showScreen('home');
  refreshHome();
}

/* ---------------- 首頁 ---------------- */
function buildActivityGrid() {
  const grid = $('#activityGrid');
  if (!grid) return;
  grid.innerHTML = '';
  ACTIVITIES.forEach(function (act) {
    const card = el('button', {
      class: 'activity-card',
      attrs: { type: 'button', 'data-id': act.id, 'aria-label': act.name + '，' + act.desc }
    }, [
      el('span', { class: 'act-icon', text: act.icon, attrs: { 'aria-hidden': 'true' } }),
      el('span', { class: 'act-name', text: act.name }),
      el('span', { class: 'act-desc', text: act.desc })
    ]);
    card.addEventListener('click', function () { startGame(act.id); });
    grid.appendChild(card);
  });
}

function refreshHome() {
  const now = new Date();
  const weekdays = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];
  const dateLabel = (now.getMonth() + 1) + '月' + now.getDate() + '日 · ' + weekdays[now.getDay()];
  if ($('#todayLabel')) $('#todayLabel').textContent = dateLabel;

  const hour = now.getHours();
  let greet = '你好';
  if (hour < 5) greet = '夜深喇';
  else if (hour < 12) greet = '早晨';
  else if (hour < 14) greet = '午安';
  else if (hour < 18) greet = '下午好';
  else greet = '晚上好';
  if ($('#greeting')) $('#greeting').textContent = greet;

  const record = todayRecord();
  if ($('#todaySummary')) {
    $('#todaySummary').textContent = record.rounds > 0
      ? '今日已經做咗 ' + record.rounds + ' 個練習，做得好！'
      : '做一個小練習，動動腦筋。';
  }

  if ($('#talkQ')) {
    const current = $('#talkQ').textContent;
    if (!current || current === '…') $('#talkQ').textContent = TALK_CARDS[randInt(TALK_CARDS.length)];
  }
}

function nextTalkCard() {
  const box = $('#talkQ');
  if (!box) return;
  let next = box.textContent;
  for (let i = 0; i < 6 && next === box.textContent; i++) {
    next = TALK_CARDS[randInt(TALK_CARDS.length)];
  }
  box.textContent = next;
  speak(next);
}

/* ---------------- 語音按鈕同步 ---------------- */
function syncVoiceButton() {
  const btn = $('#btnVoice');
  const label = $('#voiceLabel');
  if (!btn) return;
  btn.setAttribute('aria-pressed', store.voice ? 'true' : 'false');
  btn.querySelector('.icon-emoji').textContent = store.voice ? '🔊' : '🔇';
  if (label) label.textContent = store.voice ? '語音' : '靜音';
}

/* ---------------- 事件綁定 ---------------- */
function bindEvents() {
  $('#btnHome').addEventListener('click', goHome);
  $('#btnFont').addEventListener('click', cycleFontScale);

  $('#btnVoice').addEventListener('click', function () {
    store.voice = !store.voice;
    saveStore();
    syncVoiceButton();
    if (store.voice) speak('語音已開啟');
    else stopSpeaking();
  });

  $('#btnRead').addEventListener('click', function () {
    const text = $('#playPrompt').textContent;
    if (!text) return;
    const wasOn = store.voice;
    store.voice = true;
    speak(text);
    store.voice = wasOn;
  });

  $('#btnRestart').addEventListener('click', restartGame);
  $('#btnQuit').addEventListener('click', goHome);
  $('#btnTalk').addEventListener('click', nextTalkCard);

  $('#btnAgain').addEventListener('click', function () {
    if (currentId) startGame(currentId);
    else showScreen('home');
  });

  $('#btnBackHome').addEventListener('click', goHome);

  document.addEventListener('visibilitychange', function () {
    if (document.hidden) stopSpeaking();
  });
}

/* ---------------- 啟動 ---------------- */
function init() {
  loadStore();
  applyFontScale();
  syncVoiceButton();
  buildActivityGrid();
  refreshHome();
  bindEvents();

  if ('speechSynthesis' in window) {
    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;
  }
}

document.addEventListener('DOMContentLoaded', init);
