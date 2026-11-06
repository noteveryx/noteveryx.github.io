/* ==========================================================
   fs-kit.js — 全屏模块（全站通用）
   ------------------------------------------------------------
   用法：在 </head> 前加一行
     <script src="../assets/js/fs-kit.js" defer></script>

   提供：
     · 右下角悬浮全屏按钮（自动注入，不改页面结构）
     · 快捷键 F 切换（输入框聚焦时自动让路）
     · 全屏状态变化时同步图标
     · iOS Safari 等不支持 Element.requestFullscreen 的浏览器给出提示
     · 已有全屏实现的页面（aurora / starfield / standby）自动跳过，不重复注入
   ========================================================== */
(function () {
  'use strict';

  var doc = document;
  var root = doc.documentElement;
  var win = window;

  /* ---------- 已有全屏实现的页面不重复注入 ---------- */
  if (doc.getElementById('fsBtn') || doc.getElementById('btnFull') || doc.getElementById('fsKitBtn')) return;

  var API = {
    enter: root.requestFullscreen || root.webkitRequestFullscreen || root.msRequestFullscreen,
    exit: doc.exitFullscreen || doc.webkitExitFullscreen || doc.msExitFullscreen,
    current: function () {
      return doc.fullscreenElement || doc.webkitFullscreenElement || doc.msFullscreenElement || null;
    }
  };

  var SVG_IN = '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" ' +
    'stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
    '<path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/></svg>';
  var SVG_OUT = '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" ' +
    'stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
    '<path d="M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5"/></svg>';

  var btn = null;
  var toast = null;
  var toastTimer = 0;

  /* ---------- 样式 ---------- */
  var STYLE = [
    '.fsk-btn{',
    'position:fixed;',
    'right:calc(14px + env(safe-area-inset-right));',
    'bottom:calc(14px + env(safe-area-inset-bottom));',
    'width:40px;height:40px;border-radius:50%;',
    'display:flex;align-items:center;justify-content:center;',
    'border:1px solid rgba(255,255,255,.24);',
    'background:rgba(14,16,26,.62);',
    '-webkit-backdrop-filter:blur(10px);backdrop-filter:blur(10px);',
    'color:rgba(255,255,255,.94);cursor:pointer;z-index:60;',
    'opacity:.78;-webkit-tap-highlight-color:transparent;',
    'box-shadow:0 2px 10px rgba(0,0,0,.28);',
    'transition:transform .16s cubic-bezier(.2,.9,.3,1),opacity .2s,color .2s,border-color .2s,background .2s;',
    '}',
    '.fsk-btn svg{filter:drop-shadow(0 1px 2px rgba(0,0,0,.45));}',
    '.fsk-btn:hover{opacity:1;transform:scale(1.07);color:#fff;border-color:rgba(255,255,255,.42);background:rgba(14,16,26,.85);}',
    '.fsk-btn:active{transform:scale(.93);}',
    '.fsk-btn:focus-visible{outline:2px solid rgba(255,255,255,.6);outline-offset:2px;}',
    '@media (hover:none){.fsk-btn{opacity:.75;}}',
    '.fsk-toast{',
    'position:fixed;left:50%;transform:translateX(-50%);',
    'bottom:calc(76px + env(safe-area-inset-bottom));',
    'padding:8px 16px;border-radius:999px;',
    'background:rgba(14,16,26,.9);border:1px solid rgba(255,255,255,.14);',
    'color:rgba(255,255,255,.9);font:600 12.5px/1.4 -apple-system,"PingFang SC",system-ui,sans-serif;',
    'z-index:61;opacity:0;pointer-events:none;',
    'transition:opacity .22s,transform .22s;',
    '}',
    '.fsk-toast.show{opacity:1;transform:translateX(-50%) translateY(-4px);}'
  ].join('');

  function injectStyle() {
    var st = doc.createElement('style');
    st.setAttribute('data-fs-kit', '1');
    st.textContent = STYLE;
    (doc.head || root).appendChild(st);
  }

  /* ---------- 提示 ---------- */
  function showToast(msg) {
    if (!toast) {
      toast = doc.createElement('div');
      toast.className = 'fsk-toast';
      (doc.body || root).appendChild(toast);
    }
    toast.textContent = msg;
    // 强制重排，保证连续调用也能重新触发过渡
    void toast.offsetWidth;
    toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toast.classList.remove('show'); }, 1900);
  }

  /* ---------- 状态 ---------- */
  function syncIcon() {
    if (!btn) return;
    var on = !!API.current();
    btn.innerHTML = on ? SVG_OUT : SVG_IN;
    btn.setAttribute('aria-label', on ? '退出全屏' : '全屏');
    btn.title = (on ? '退出全屏' : '全屏') + '（F）';
  }

  /* ---------- 切换 ---------- */
  function toggle() {
    if (!API.enter || !API.exit) {
      showToast('当前浏览器不支持网页全屏，可横屏观看');
      return;
    }
    // requestFullscreen 在「无用户手势 / iframe 未授权」等情况下会**同步抛异常**，
    // 不兜住的话异常会冒泡到点击处理器，按钮点击直接报错
    try {
      if (API.current()) {
        var p = API.exit.call(doc);
        if (p && typeof p.catch === 'function') p.catch(function () { });
      } else {
        var q = API.enter.call(root);
        if (q && typeof q.catch === 'function') {
          q.catch(function () { showToast('全屏被浏览器拒绝'); });
        }
      }
    } catch (e) {
      showToast('全屏被浏览器拒绝');
    }
  }

  /* ---------- 注入按钮 ---------- */
  function mount() {
    if (doc.getElementById('fsKitBtn')) return;
    btn = doc.createElement('button');
    btn.id = 'fsKitBtn';
    btn.className = 'fsk-btn';
    btn.type = 'button';
    btn.setAttribute('aria-label', '全屏');
    btn.title = '全屏（F）';
    btn.innerHTML = SVG_IN;
    btn.addEventListener('click', function (e) {
      e.preventDefault();
      e.stopPropagation();
      toggle();
    });
    (doc.body || root).appendChild(btn);
    syncIcon();
    place();
    // 游戏页常驻（跟 D-pad 一致），视觉页跟随闲置淡出
    if (!doc.body || !doc.body.classList.contains('gk-page')) enableIdleFade();
  }

  /* ---------- 位置避让 ----------
     少数页面底部自带工具栏（如 paint），悬浮全屏钮会压住它们。
     检测到与页面 fixed UI 重叠时，自动逐级上移。 */
  function findOverlap() {
    if (!btn) return null;
    var b = btn.getBoundingClientRect();
    var els = doc.body ? doc.body.querySelectorAll('*') : [];
    for (var i = 0; i < els.length; i++) {
      var el = els[i];
      if (el === btn || btn.contains(el) || el.contains(btn)) continue;
      var cs = getComputedStyle(el);
      if (cs.position !== 'fixed' && cs.position !== 'sticky') continue;
      if (cs.display === 'none' || cs.visibility === 'hidden') continue;
      if (parseFloat(cs.opacity) < 0.05) continue;
      var q = el.getBoundingClientRect();
      if (q.width < 1 || q.height < 1) continue;
      // 铺满全屏的背景层不算 UI
      if (q.width >= winW() * 0.9 && q.height >= winH() * 0.9) continue;
      if (b.right > q.left && b.left < q.right && b.bottom > q.top && b.top < q.bottom) return el;
    }
    return null;
  }
  function winW() { return doc.documentElement.clientWidth || win.innerWidth; }
  function winH() { return doc.documentElement.clientHeight || win.innerHeight; }

  function place() {
    if (!btn) return;
    btn.style.bottom = '';
    var gap = 14;
    for (var i = 0; i < 8; i++) {
      if (!findOverlap()) return;
      gap += 48;
      btn.style.bottom = gap + 'px';
    }
  }

  /* ---------- 闲置淡出 ----------
     视觉页普遍有「静止一段时间 UI 淡出」的沉浸式设计，
     游戏页（body.gk-page）则保持常驻，跟 D-pad 一致。 */
  var idleTimer = null;
  function enableIdleFade() {
    if (!btn) return;
    function wake() {
      btn.style.opacity = '';
      clearTimeout(idleTimer);
      idleTimer = setTimeout(function () { if (btn) btn.style.opacity = '.2'; }, 5000);
    }
    ['mousemove', 'pointerdown', 'touchstart', 'keydown', 'wheel'].forEach(function (ev) {
      doc.addEventListener(ev, wake, { passive: true });
    });
    wake();
  }

  /* ---------- 快捷键 ---------- */
  function onKey(e) {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    var t = e.target;
    if (t) {
      var tag = (t.tagName || '').toUpperCase();
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || t.isContentEditable) return;
    }
    if (e.key === 'f' || e.key === 'F') {
      if (e.repeat) return;
      e.preventDefault();
      toggle();
    }
  }

  function onChange() {
    syncIcon();
    showToast(API.current() ? '已进入全屏' : '已退出全屏');
  }

  function init() {
    injectStyle();
    mount();
    doc.addEventListener('keydown', onKey);
    doc.addEventListener('fullscreenchange', onChange);
    doc.addEventListener('webkitfullscreenchange', onChange);
    win.addEventListener('resize', place);
    win.addEventListener('orientationchange', place);
  }

  if (doc.readyState === 'loading') {
    doc.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  /* 暴露给页面按需调用 */
  window.FSKit = {
    toggle: toggle,
    isFullscreen: function () { return !!API.current(); },
    supported: function () { return !!(API.enter && API.exit); }
  };
})();
