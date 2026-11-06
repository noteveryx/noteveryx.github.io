/*!
 * GameKit · 小游戏共享内核
 * ---------------------------------------------------------------
 * 一个游戏只需要写：init / update / render / onAction
 *   GameKit.create({
 *     slug: '2048', title: '2048', logic: [480, 720],
 *     hud: [{k:'score',label:'分数'}, {k:'best',label:'最佳', fmt:fn}],
 *     bestMode: 'max',        // max=越大越好(默认) / min=越小越好(扫雷最快时间)
 *     dpad: true,             // 方向键手柄，不需要就 false
 *     palette: true,          // 挂调色球，整局配色随主色变
 *     sound: true,
 *     onInit: function (api) {},
 *     onUpdate: function (api, dt) {},
 *     onRender: function (api, ctx) {},
 *     onAction: function (api, a) {}   // a: {type:'key'|'swipe'|'tap'|'longpress', key, dir, x, y, button}
 *   });
 *
 * 内核负责：画布缩放(DPR+letterbox) / 固定步长循环 / 状态机
 *           / 计分与最高分 / 键盘+触摸输入 / WebAudio 音效 / 配色派生
 * --------------------------------------------------------------- */
(function (global) {
  'use strict';

  var PK = global.PaletteKit || {};

  /* ==========================================================
     小工具
     ========================================================== */
  function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }

  function el(tag, cls, html) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html != null) e.innerHTML = html;
    return e;
  }

  function svg(inner, size, fill) {
    return '<svg viewBox="0 0 24 24" ' + (fill ? 'fill="currentColor"' : 'fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"') + ' width="' + size + '" height="' + size + '">' + inner + '</svg>';
  }

  /* ==========================================================
     音效：WebAudio 现场合成，零外部文件
     ========================================================== */
  var AC = null;
  var TONES = {
    click: { type: 'square', f: [880], dur: 0.05, vol: 0.13 },
    move: { type: 'square', f: [380], dur: 0.045, vol: 0.1 },
    merge: { type: 'triangle', f: [523.25, 783.99], dur: 0.12, vol: 0.18, step: 0.055 },
    eat: { type: 'triangle', f: [659.25, 987.77], dur: 0.13, vol: 0.2, step: 0.06 },
    die: { type: 'sawtooth', f: [300, 90], dur: 0.4, vol: 0.2 },
    win: { type: 'triangle', f: [523.25, 659.25, 783.99, 1046.5], dur: 0.46, vol: 0.22, step: 0.09 },
    tick: { type: 'square', f: [1250], dur: 0.025, vol: 0.07 },
    lock: { type: 'square', f: [220, 150], dur: 0.09, vol: 0.13, step: 0.035 },
    boom: { type: 'sawtooth', f: [190, 55], dur: 0.32, vol: 0.22 }
  };

  function audioCtx() {
    if (!AC) {
      var C = global.AudioContext || global.webkitAudioContext;
      if (!C) return null;
      try { AC = new C(); } catch (e) { return null; }
    }
    if (AC.state === 'suspended' && AC.resume) { try { AC.resume(); } catch (e) { } }
    return AC;
  }

  function playTone(name) {
    var t = TONES[name];
    if (!t) return;
    var c = audioCtx();
    if (!c) return;
    var now = c.currentTime;
    for (var i = 0; i < t.f.length; i++) {
      var o = c.createOscillator(), g = c.createGain();
      var t0 = now + (t.step ? i * t.step : 0);
      o.type = t.type;
      o.frequency.setValueAtTime(t.f[i], t0);
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(t.vol, t0 + 0.012);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + t.dur);
      o.connect(g); g.connect(c.destination);
      o.start(t0);
      o.stop(t0 + t.dur + 0.02);
    }
  }

  /* ==========================================================
     配色派生：由主色生成一整套语义色
     ========================================================== */
  function hex2rgb(hex) {
    if (PK.hex2rgb) return PK.hex2rgb(hex);
    var s = String(hex || '').replace('#', '');
    if (s.length === 3) s = s[0] + s[0] + s[1] + s[1] + s[2] + s[2];
    if (!/^[0-9a-f]{6}$/i.test(s)) return null;
    var n = parseInt(s, 16);
    return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
  }

  function rgb2hsl(r, g, b) {
    if (PK.rgb2hsl) return PK.rgb2hsl(r, g, b);
    r /= 255; g /= 255; b /= 255;
    var mx = Math.max(r, g, b), mn = Math.min(r, g, b);
    var h = 0, s = 0, l = (mx + mn) / 2;
    if (mx !== mn) {
      var d = mx - mn;
      s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
      h = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
      h *= 60;
    }
    return { h: h, s: s, l: l };
  }

  function hsl2rgb(h, s, l) {
    if (PK.hsl2rgb) return PK.hsl2rgb(h, s, l);
    h = ((h % 360) + 360) % 360 / 360;
    if (s === 0) { var v = Math.round(l * 255); return { r: v, g: v, b: v }; }
    var q = l < 0.5 ? l * (1 + s) : l + s - l * s, p = 2 * l - q;
    function hue(t) {
      if (t < 0) t += 1; if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    }
    return {
      r: Math.round(hue(h + 1 / 3) * 255),
      g: Math.round(hue(h) * 255),
      b: Math.round(hue(h - 1 / 3) * 255)
    };
  }

  function rgbStr(c) { return 'rgb(' + c.r + ',' + c.g + ',' + c.b + ')'; }

  function derive(hex) {
    var c = hex2rgb(hex) || { r: 124, g: 196, b: 255 };
    var hsl = rgb2hsl(c.r, c.g, c.b);
    var api = {
      hex: hex, h: hsl.h, s: hsl.s, l: hsl.l, rgb: c,
      at: function (dh, ds, dl) {
        var h = (hsl.h + (dh || 0) + 360) % 360;
        var s = clamp(hsl.s + (ds || 0), 0, 1);
        var l = clamp(hsl.l + (dl || 0), 0, 1);
        return rgbStr(hsl2rgb(h, s, l));
      }
    };
    api.base = api.at(0, 0, 0);          // 主色
    api.bright = api.at(0, 0.06, 0.16); // 高亮
    api.soft = api.at(0, -0.08, 0.1);   // 浅
    api.deep = api.at(0, 0.02, -0.18);  // 深
    // 发光色：亮度封顶 0.8，避免暖色主色溢出成白色
    api.glow = rgbStr(hsl2rgb(hsl.h, Math.min(hsl.s + 0.12, 1), Math.min(0.8, hsl.l + 0.2)));
    api.alt = api.at(32, 0.06, 0.06);   // 邻近色
    api.alt2 = api.at(-32, 0.06, -0.04);
    api.muted = api.at(0, -0.22, -0.3); // 弱化
    // 背景保持低饱和的暗色，不继承主色的艳度（否则暖色主色会把整屏染色）
    api.bg = rgbStr(hsl2rgb(hsl.h, Math.min(hsl.s * 0.45, 0.26), Math.max(0.04, hsl.l - 0.44)));
    api.panel = rgbStr(hsl2rgb(hsl.h, Math.min(hsl.s * 0.4, 0.22), Math.max(0.07, hsl.l - 0.38)));
    api.ink = 'rgba(255,255,255,.92)';
    api.ink2 = 'rgba(255,255,255,.58)';
    api.ink3 = 'rgba(255,255,255,.34)';
    return api;
  }

  /* ==========================================================
     主工厂
     ========================================================== */
  function create(opts) {
    opts = opts || {};

    var slug = opts.slug || 'game';
    var title = opts.title || '游戏';
    var LW = (opts.logic && opts.logic[0]) || 480;
    var LH = (opts.logic && opts.logic[1]) || 720;
    var canvas = opts.canvas || document.getElementById('cv');
    if (!canvas) { console.warn('[GameKit] 找不到画布'); return null; }
    var ctx = canvas.getContext('2d');
    var STEP = 1 / 60;

    /* ---------------- 状态 ---------------- */
    var state = 'ready';          // ready | playing | paused | over
    var score = 0;
    var best = 0;
    var isRecord = false;
    var stats = {};
    var soundOn = opts.sound !== false;
    var baseHex = opts.color || '#635bff';
    var pal = derive(baseHex);
    // best 语义：max = 越大越好（分数），min = 越小越好（扫雷最快通关时间）
    var bestMode = opts.bestMode === 'min' ? 'min' : 'max';

    var api = {
      ctx: ctx, canvas: canvas,
      W: LW, H: LH, dpr: 1, scale: 1,
      get state() { return state; },
      get score() { return score; },
      get best() { return best; },
      get colors() { return pal; },
      get pointer() { return pointer; },
      get stats() { return stats; },
      soundOn: soundOn,
      paletteApi: null
    };

    /* ==========================================================
       DOM：工具列 / HUD / 覆盖层 / D-pad / 返回
       ========================================================== */
    var tools = el('div', 'gk-tools');
    var hud = el('div', 'gk-hud');
    var overlay = el('div', 'gk-overlay');
    var dpad = el('div', 'gk-dpad');
    overlay.hidden = true;

    /* 返回 */
    var back = el('a', 'gk-back', svg('<path d="M15 5l-7 7 7 7"/>', 15, false));
    back.href = opts.back || '../x.html';
    back.title = '返回';
    back.setAttribute('aria-label', '返回');

    /* 标题 */
    var label = el('div', 'gk-label', 'Game · <b>' + title + '</b>');

    /* 调色球 */
    var pkHost = null;
    if (opts.palette !== false && PK.mount) {
      pkHost = el('div', 'pk gk-pk');
      // 所有游戏共用一个颜色键：换一次配色，全部游戏同步
      pkHost.setAttribute('data-pk', opts.paletteKey || 'game');
      pkHost.setAttribute('data-placement', 'left');
      tools.appendChild(pkHost);
    }

    /* 音效开关 */
    var soundBtn = el('button', 'gk-btn', svg('<path d="M11 5L6 9H2v6h4l5 4V5z"/><path d="M15.5 8.5a5 5 0 010 7"/><path d="M18.5 5.5a9 9 0 010 13"/>', 16, false));
    soundBtn.type = 'button';
    soundBtn.title = '音效开关';
    soundBtn.setAttribute('aria-label', '音效开关');
    tools.appendChild(soundBtn);

    /* 暂停 */
    var pauseBtn = el('button', 'gk-btn', svg('<rect x="6" y="4" width="4" height="16" rx="1.2"/><rect x="14" y="4" width="4" height="16" rx="1.2"/>', 16, true));
    pauseBtn.type = 'button';
    pauseBtn.title = '暂停 / 继续（空格）';
    pauseBtn.setAttribute('aria-label', '暂停或继续');
    tools.appendChild(pauseBtn);

    /* HUD */
    var hudDefs = opts.hud || [{ k: 'score', label: '分数' }];
    var hudEls = {}, hudFmts = {};
    hudDefs.forEach(function (h) {
      var box = el('div', 'gk-stat');
      box.appendChild(el('span', 'gk-lb', h.label));
      var v = el('span', 'gk-val', '0');
      box.appendChild(v);
      hud.appendChild(box);
      hudEls[h.k] = v;
      hudFmts[h.k] = h.fmt || null;
      stats[h.k] = 0;
    });

    // HUD 值格式化：{k:'time', label:'用时', fmt:function(v){return v.toFixed(1)+'s';}}
    function fmtVal(k, v) {
      var f = hudFmts[k];
      return f ? f(v) : v;
    }

    /* 覆盖层 */
    var card = el('div', 'gk-card');
    var ovTitle = el('div', 'gk-title');
    var ovBody = el('div', 'gk-body');
    var ovBtn = el('button', 'gk-action');
    ovBtn.type = 'button';
    card.appendChild(ovTitle);
    card.appendChild(ovBody);
    card.appendChild(ovBtn);
    overlay.appendChild(card);

    /* D-pad（不需要方向键的游戏可关掉：dpad:false） */
    var DIRS = [
      { d: 'up', t: '▲' }, { d: 'left', t: '◀' }, { d: 'down', t: '▼' }, { d: 'right', t: '▶' }
    ];
    if (opts.dpad !== false) {
      DIRS.forEach(function (x) {
        var b = el('button', 'gk-dbtn gk-d' + x.d, x.t);
        b.type = 'button';
        b.setAttribute('aria-label', x.d);
        b.addEventListener('pointerdown', function (e) {
          e.preventDefault();
          fire({ type: 'key', key: dirKey(x.d) });
        });
        dpad.appendChild(b);
      });
    }

    var body = document.body;
    body.appendChild(back);
    body.appendChild(label);
    body.appendChild(tools);
    body.appendChild(hud);
    body.appendChild(overlay);
    if (opts.dpad !== false) body.appendChild(dpad);
    body.classList.add('gk-page');

    function dirKey(d) {
      return { up: 'ArrowUp', down: 'ArrowDown', left: 'ArrowLeft', right: 'ArrowRight' }[d];
    }

    /* ==========================================================
       画布：letterbox + DPR
       ========================================================== */
    var dpr = 1, scale = 1, ox = 0, oy = 0;

    function resize() {
      var vw = window.innerWidth;
      var vh = window.innerHeight;
      dpr = Math.min(global.devicePixelRatio || 1, 2);
      canvas.width = Math.round(vw * dpr);
      canvas.height = Math.round(vh * dpr);
      canvas.style.width = vw + 'px';
      canvas.style.height = vh + 'px';
      scale = Math.min(vw / LW, vh / LH);
      ox = (vw - LW * scale) / 2;
      oy = (vh - LH * scale) / 2;
      api.dpr = dpr; api.scale = scale;
      if (opts.onResize) opts.onResize(api);
    }

    function toLogic(clientX, clientY) {
      return { x: (clientX - ox) / scale, y: (clientY - oy) / scale };
    }

    /* ==========================================================
       计分 / 最高分
       ========================================================== */
    function bestKey() {
      // 可自定义存档键：字符串，或函数（按难度分档存纪录）
      if (typeof opts.bestKey === 'function') return opts.bestKey();
      if (opts.bestKey) return opts.bestKey;
      return 'gk_' + slug + '_best';
    }

    function loadBest() {
      try {
        var v = parseFloat(global.localStorage.getItem(bestKey()));
        return isFinite(v) ? v : 0;
      } catch (e) { return 0; }
    }

    function saveBest(v) {
      try { global.localStorage.setItem(bestKey(), String(v)); } catch (e) { }
    }

    function paintHud() {
      for (var k in hudEls) {
        if (!Object.prototype.hasOwnProperty.call(hudEls, k)) continue;
        var v = (k === 'score') ? score : (k === 'best') ? best : stats[k];
        hudEls[k].textContent = fmtVal(k, v);
      }
    }

    api.setScore = function (v) {
      score = v || 0;
      if (bestMode === 'min') {
        // 越小越好：结算留到 gameOver，避免计时过程中就"破纪录"
        if (score > 0 && (best === 0 || score < best)) isRecord = true;
      } else {
        if (score > best) { best = score; isRecord = true; saveBest(best); }
      }
      paintHud();
    };
    api.addScore = function (n) { api.setScore(score + n); };
    api.setStat = function (k, v) { stats[k] = v; paintHud(); };
    api.setColor = function (hex) {
      if (!hex2rgb(hex)) return;
      baseHex = hex;
      pal = derive(hex);
      // 覆盖层按钮跟着主色走
      var root = document.documentElement;
      root.style.setProperty('--gk-accent', hex);
      root.style.setProperty('--gk-accent2', pal.at(0, 0.04, -0.12));
      if (opts.onColor) opts.onColor(pal);
    };
    api.sound = function (name) { if (soundOn) playTone(name); };

    /* ==========================================================
       状态机
       ========================================================== */
    function showOverlay(oTitle, oBody, btnText) {
      ovTitle.textContent = oTitle;
      ovBody.innerHTML = oBody || '';
      ovBtn.textContent = btnText;
      overlay.hidden = false;
      overlay.classList.remove('in');
      void overlay.offsetWidth;
      overlay.classList.add('in');
    }

    function hideOverlay() { overlay.hidden = true; }

    function defaultBody() {
      var rows = '';
      hudDefs.forEach(function (h) {
        var v = (h.k === 'score') ? score : (h.k === 'best') ? best : stats[h.k];
        rows += '<div class="gk-row"><span>' + h.label + '</span><b>' + fmtVal(h.k, v) + '</b></div>';
      });
      if (isRecord) rows += '<div class="gk-record">新纪录！</div>';
      return rows;
    }

    api.start = function () {
      state = 'playing';
      hideOverlay();
      if (opts.onStart) opts.onStart(api);
    };
    api.pause = function (silent) {
      if (state !== 'playing') return;
      state = 'paused';
      if (!silent) showOverlay('已暂停', defaultBody(), '继续');
      pauseBtn.innerHTML = svg('<path d="M8 5l11 7-11 7V5z"/>', 16, true);
    };
    api.resume = function (silent) {
      if (state !== 'paused') return;
      state = 'playing';
      if (!silent) hideOverlay();
      pauseBtn.innerHTML = svg('<rect x="6" y="4" width="4" height="16" rx="1.2"/><rect x="14" y="4" width="4" height="16" rx="1.2"/>', 16, true);
    };
    api.restart = function () {
      score = 0;
      isRecord = false;
      stats = {};
      hudDefs.forEach(function (h) { stats[h.k] = 0; });
      if (opts.onInit) opts.onInit(api);
      best = loadBest();
      paintHud();
      state = 'playing';
      hideOverlay();
      if (opts.onStart) opts.onStart(api);
    };
    api.gameOver = function (msg) {
      if (state === 'over') return;
      state = 'over';
      if (bestMode === 'min') {
        isRecord = (score > 0 && (best === 0 || score < best));
        if (score > 0 && (best === 0 || score < best)) { best = score; saveBest(best); }
      } else {
        // 必须是严格大于：打平不算新纪录（用 >= 会让「与历史最佳持平」也弹新纪录）
        isRecord = (score > 0 && score > best);
        if (score > best) { best = score; saveBest(best); }
      }
      paintHud();
      showOverlay(msg || '游戏结束', defaultBody(), '再来一局');
    };

    ovBtn.addEventListener('click', function () {
      playTone('click');
      if (state === 'ready') api.start();
      else if (state === 'paused') api.resume();
      else api.restart();
    });

    /* ==========================================================
       调色板联动
       面板打开时「静默暂停」（只停循环，不弹暂停面板遮住调色板），
       关掉面板自动继续 —— 这样游戏中随时能换配色，又不会手忙脚乱
       ========================================================== */
    function panelOpen() {
      return !!document.querySelector('.pk-panel.show');
    }

    var wasPanelOpen = false, autoResume = false;
    if (global.MutationObserver) {
      var panelObs = new MutationObserver(function () {
        var open = panelOpen();
        if (open === wasPanelOpen) return;
        wasPanelOpen = open;
        if (open) {
          if (state === 'playing') { autoResume = true; api.pause(true); }
        } else if (autoResume) {
          autoResume = false;
          if (state === 'paused') api.resume(true);
        }
      });
      panelObs.observe(document.body, {
        childList: true, subtree: true, attributes: true, attributeFilter: ['class']
      });
    }

    /* ==========================================================
       输入
       ========================================================== */
    var pointer = { x: 0, y: 0, down: false, sx: 0, sy: 0, moved: false, t0: 0, btn: 0 };
    var lpTimer = 0, longFired = false;

    function fire(a) {
      if (state !== 'playing') return;
      if (opts.onAction) opts.onAction(api, a);
    }

    document.addEventListener('keydown', function (e) {
      if (e.target && /input|textarea|select/i.test(e.target.tagName)) return;
      var k = e.key;
      // 焦点落在覆盖层 / 调色板面板的按钮上时，空格归那个按钮用
      // （面板弹出时游戏已暂停或静默暂停，空格没有别的用途）
      if (e.target && e.target.closest && e.target.closest('.gk-overlay button, .pk-panel button')) return;
      // 调色板面板开着时，方向键归面板用，空格也不能抢
      if (panelOpen()) {
        if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].indexOf(k) >= 0) return;
      }
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].indexOf(k) >= 0) e.preventDefault();
      if (k === 'Escape') {
        // 调色板面板开着时，Escape 归它用（关面板），不暂停游戏
        var pkPanel = document.querySelector('.pk-panel.show');
        if (pkPanel) return;
        if (state === 'playing') api.pause();
        return;
      }
      if (k === ' ' || k === 'Spacebar') {
        // 长按空格会不断重复 keydown，暂停/继续会反复横跳，必须挡掉
        if (e.repeat) return;
        if (state === 'ready') { api.start(); playTone('click'); }
        else if (state === 'playing') api.pause();
        else if (state === 'paused') api.resume();
        else if (state === 'over') api.restart();
        return;
      }
      if (k === 'r' || k === 'R') { if (state === 'playing' || state === 'over') api.restart(); return; }
      fire({ type: 'key', key: k, code: e.code });
    });

    canvas.addEventListener('pointerdown', function (e) {
      var p = toLogic(e.clientX, e.clientY);
      pointer.x = p.x; pointer.y = p.y;
      pointer.sx = e.clientX; pointer.sy = e.clientY;
      pointer.moved = false; pointer.down = true; pointer.t0 = Date.now();
      pointer.btn = e.button || 0;
      // 长按插旗（移动端右键的替代）
      longFired = false;
      if (lpTimer) clearTimeout(lpTimer);
      if (pointer.btn === 0) {
        lpTimer = setTimeout(function () {
          lpTimer = 0;
          if (pointer.down && !pointer.moved) {
            longFired = true;
            fire({ type: 'longpress', x: pointer.x, y: pointer.y });
          }
        }, 420);
      }
      if (canvas.setPointerCapture) { try { canvas.setPointerCapture(e.pointerId); } catch (err) { } }
    });

    canvas.addEventListener('pointermove', function (e) {
      var p = toLogic(e.clientX, e.clientY);
      pointer.x = p.x; pointer.y = p.y;
      if (pointer.down && (Math.abs(e.clientX - pointer.sx) > 6 || Math.abs(e.clientY - pointer.sy) > 6)) {
        pointer.moved = true;
        if (lpTimer) { clearTimeout(lpTimer); lpTimer = 0; }
      }
    });

    function endPointer(e) {
      if (!pointer.down) return;
      pointer.down = false;
      if (lpTimer) { clearTimeout(lpTimer); lpTimer = 0; }
      var dx = e.clientX - pointer.sx, dy = e.clientY - pointer.sy;
      var adx = Math.abs(dx), ady = Math.abs(dy);
      if (adx > 22 || ady > 22) {
        var dir = adx > ady ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up');
        fire({ type: 'swipe', dir: dir, key: dirKey(dir) });
      } else if (!pointer.moved && !longFired) {
        var p = toLogic(e.clientX, e.clientY);
        fire({ type: 'tap', x: p.x, y: p.y, button: pointer.btn });
      }
    }
    canvas.addEventListener('pointerup', endPointer);
    canvas.addEventListener('pointercancel', function () {
      pointer.down = false;
      if (lpTimer) { clearTimeout(lpTimer); lpTimer = 0; }
    });
    // 右键别弹浏览器菜单（扫雷要用来插旗）
    canvas.addEventListener('contextmenu', function (e) { e.preventDefault(); });

    /* ==========================================================
       工具按钮
       ========================================================== */
    soundBtn.addEventListener('click', function () {
      soundOn = !soundOn;
      soundBtn.classList.toggle('off', !soundOn);
      soundBtn.title = soundOn ? '音效开' : '音效关';
      if (soundOn) playTone('click');
    });
    if (!soundOn) soundBtn.classList.add('off');

    pauseBtn.addEventListener('click', function () {
      if (state === 'playing') api.pause();
      else if (state === 'paused') api.resume();
      else if (state === 'ready') api.start();
      else api.restart();
    });

    /* ==========================================================
       循环
       ========================================================== */
    var last = 0, acc = 0, raf = 0, lastDraw = 0;

    function frame(t) {
      raf = requestAnimationFrame(frame);
      if (!last) last = t;
      var dt = (t - last) / 1000;
      last = t;
      if (dt > 0.25) dt = 0.25;
      if (state === 'playing') {
        acc += dt;
        var guard = 0;
        while (acc >= STEP && guard < 6) {
          if (state !== 'playing') break;
          if (opts.onUpdate) opts.onUpdate(api, STEP);
          acc -= STEP;
          guard++;
        }
        if (guard >= 6) acc = 0;
      }
      // 暂停时画面完全不变，没必要 60fps 空转（手机上很耗电），降到 4fps
      if (state === 'paused' && t - lastDraw < 250) return;
      lastDraw = t;
      draw();
    }

    function draw() {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.fillStyle = pal.bg;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.setTransform(dpr * scale, 0, 0, dpr * scale, dpr * ox, dpr *oy);
      if (opts.onRender) opts.onRender(api, ctx);
    }

    /* ==========================================================
       生命周期
       ========================================================== */
    global.addEventListener('resize', function () { resize(); }, { passive: true });
    global.addEventListener('orientationchange', function () { setTimeout(resize, 120); });
    document.addEventListener('visibilitychange', function () {
      if (document.hidden && state === 'playing') api.pause();
    });

    /* 初始 */
    best = loadBest();
    resize();
    api.setColor(baseHex);
    if (opts.onInit) opts.onInit(api);
    paintHud();
    if (opts.palette !== false && PK.mount && pkHost) {
      api.paletteApi = PK.mount(pkHost, {
        value: baseHex,
        onChange: function (c) { api.setColor(c); }
      });
      var got = api.paletteApi.get ? api.paletteApi.get() : baseHex;
      api.setColor(got);
      var trig = pkHost.querySelector('.pk-trigger');
      if (trig) trig.title = '配色 · 游戏中随时可调';
    }
    showOverlay(title, opts.hint || '点击开始，或按空格', '开始');
    raf = requestAnimationFrame(frame);

    api.destroy = function () {
      cancelAnimationFrame(raf);
      [back, label, tools, hud, overlay, dpad].forEach(function (n) { if (n && n.parentNode) n.parentNode.removeChild(n); });
    };

    return api;
  }

  global.GameKit = {
    create: create,
    derive: derive,
    tones: Object.keys(TONES),
    clamp: clamp
  };

})(window);
