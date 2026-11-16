/* ==========================================================
   dock-kit.js —— 手机端工具坞（全站通用）
   ------------------------------------------------------------
   用法：在 </head> 前加一行
     <script src="../assets/js/dock-kit.js" defer></script>

   手机 / 窄屏（≤600px，或触屏 ≤920px）时，把散落各处的悬浮
   工具按钮收进一个可折叠的「工具坞」，默认收起，点 ⋮ 展开：
     · 游戏页：右上 gk-tools 工具列原地折叠，全屏钮并入其中
     · 画布页：右下 .ui.tools（调色盘等）+ 全屏 + 翻译 收进坞
     · 生成器页：pk-float 调色球 + 全屏 + 翻译 收进坞
     · 待机页等：自带固定工具条 + 翻译 收进坞
     · 只有一个悬浮按钮的页面（工具箱页 / 首页）不建坞，保持原样
   切回桌面宽度时自动原样还原，桌面端布局零影响。
   其他组件可主动注册悬浮节点：DockKit.add(node)
   ========================================================== */
(function () {
  'use strict';

  var doc = document, win = window;
  var COND = '(max-width:600px),(hover:none) and (pointer:coarse) and (max-width:920px)';
  var MQ = win.matchMedia ? win.matchMedia(COND) : null;
  if (!MQ) return;

  var dock = null;     /* 工具坞容器（非游戏页） */
  var toggle = null;   /* 折叠开关 */
  var gk = null;       /* 游戏页工具列（原地折叠，不建坞） */
  var moved = [];      /* 挪过位置的节点，记录原处便于还原 */
  var active = false;

  var STYLE = [
    /* 工具坞容器 */
    '.dk{position:fixed;z-index:46;right:calc(14px + env(safe-area-inset-right));',
    'display:flex;flex-direction:column;align-items:center;gap:8px;}',
    '.dk.dk-bottom{bottom:calc(14px + env(safe-area-inset-bottom));}',
    '.dk.dk-top{top:calc(64px + env(safe-area-inset-top));}',
    /* 折叠开关 */
    '.dk-toggle{width:38px;height:38px;border-radius:50%;border:1px solid rgba(255,255,255,.22);',
    'background:rgba(14,16,26,.66);-webkit-backdrop-filter:blur(10px);backdrop-filter:blur(10px);',
    'color:rgba(255,255,255,.9);font:700 16px/1 -apple-system,system-ui,sans-serif;',
    'display:flex;align-items:center;justify-content:center;cursor:pointer;',
    '-webkit-tap-highlight-color:transparent;box-shadow:0 2px 10px rgba(0,0,0,.26);',
    'transition:transform .14s ease,background-color .2s;}',
    '.dk-toggle:active{transform:scale(.92);}',
    '.dk-toggle:focus-visible{outline:2px solid rgba(255,255,255,.55);outline-offset:2px;}',
    /* 展开后的按钮列 */
    '.dk-items{display:flex;flex-direction:column;align-items:center;gap:8px;animation:dkIn .18s ease;}',
    '@keyframes dkIn{from{opacity:0;transform:translateY(6px) scale(.96);}to{opacity:1;transform:none;}}',
    /* 被收纳的节点统一解除各自 fixed 定位，跟随坞排列（样式本身保留） */
    '.dk-item{position:static !important;left:auto !important;right:auto !important;',
    'top:auto !important;bottom:auto !important;transform:none !important;margin:0 !important;}',
    '.dk-collapsed .dk-items{display:none;}',
    /* 游戏页：gk-tools 原地折叠 */
    '.gk-tools.dk-collapsed > *:not(.dk-toggle){display:none;}'
  ].join('');

  function injectStyle() {
    if (doc.querySelector('style[data-dock-kit]')) return;
    var st = doc.createElement('style');
    st.setAttribute('data-dock-kit', '1');
    st.textContent = STYLE;
    (doc.head || doc.documentElement).appendChild(st);
  }

  function isFixed(el) {
    if (!el || el.nodeType !== 1) return false;
    try { return getComputedStyle(el).position === 'fixed'; } catch (e) { return false; }
  }

  /* ---------------- 记忆与还原 ---------------- */
  function remember(node) {
    if (!node.__dk) {
      node.__dk = { parent: node.parentNode, next: node.nextSibling };
      moved.push(node);
    }
    node.classList.add('dk-item');
  }

  function teardown() {
    var i;
    for (i = moved.length - 1; i >= 0; i--) {
      var n = moved[i];
      var rec = n.__dk;
      try {
        if (rec.next && rec.next.parentNode === rec.parent) rec.parent.insertBefore(n, rec.next);
        else rec.parent.appendChild(n);
      } catch (e) { }
      n.classList.remove('dk-item');
      n.__dk = null;
    }
    moved = [];
    if (gk) gk.classList.remove('dk-collapsed');
    if (dock && dock.parentNode) dock.parentNode.removeChild(dock);
    if (toggle && toggle.parentNode) toggle.parentNode.removeChild(toggle);
    dock = null; toggle = null; gk = null;
    active = false;
  }

  /* ---------------- 开合 ---------------- */
  function host() { return gk || dock; }
  function isCollapsed() {
    var h = host();
    return !h || h.classList.contains('dk-collapsed');
  }
  function setCollapsed(on) {
    var h = host();
    if (h) h.classList.toggle('dk-collapsed', on);
    if (toggle) {
      toggle.textContent = on ? '⋮' : '✕';
      toggle.setAttribute('aria-label', on ? '展开工具栏' : '收起工具栏');
      toggle.setAttribute('aria-expanded', on ? 'false' : 'true');
      toggle.title = on ? '展开工具栏' : '收起工具栏';
    }
  }

  function makeToggle() {
    toggle = doc.createElement('button');
    toggle.type = 'button';
    toggle.className = 'dk-toggle';
    toggle.setAttribute('aria-haspopup', 'true');
    toggle.setAttribute('aria-expanded', 'false');
    toggle.textContent = '⋮';
    toggle.addEventListener('click', function (e) {
      e.preventDefault();
      e.stopPropagation();
      setCollapsed(!isCollapsed());
    });
  }

  /* ---------------- 位置避让：坞若压到页面其他 fixed UI，逐级平移 ---------------- */
  function overlapsFixed(el) {
    var b = el.getBoundingClientRect();
    var els = doc.body.querySelectorAll('*');
    for (var i = 0; i < els.length; i++) {
      var x = els[i];
      if (el === x || el.contains(x) || x.contains(el)) continue;
      var cs;
      try { cs = getComputedStyle(x); } catch (e) { continue; }
      if (cs.position !== 'fixed' && cs.position !== 'sticky') continue;
      if (cs.display === 'none' || cs.visibility === 'hidden') continue;
      if (parseFloat(cs.opacity) < 0.05) continue;
      var q = x.getBoundingClientRect();
      if (q.width < 1 || q.height < 1) continue;
      /* 铺满全屏的背景层不算 UI */
      if (q.width >= win.innerWidth * 0.9 && q.height >= win.innerHeight * 0.9) continue;
      if (b.right > q.left && b.left < q.right && b.bottom > q.top && b.top < q.bottom) return true;
    }
    return false;
  }
  function place() {
    if (!dock) return;
    dock.style.bottom = '';
    dock.style.top = '';
    var isTop = dock.classList.contains('dk-top');
    for (var i = 0; i < 6; i++) {
      if (!overlapsFixed(dock)) return;
      var off = 14 + (i + 1) * 52;
      if (isTop) dock.style.top = 'calc(' + off + 'px + env(safe-area-inset-top))';
      else dock.style.bottom = 'calc(' + off + 'px + env(safe-area-inset-bottom))';
    }
  }

  /* ---------------- 建坞 ---------------- */
  function buildDock(list) {
    dock = doc.createElement('div');
    dock.className = 'dk';
    /* 坞的位置跟随第一个被收纳工具原来的位置：上半屏 → 右上，否则右下 */
    try {
      var r = list[0].getBoundingClientRect();
      dock.classList.add(r.top < win.innerHeight / 2 ? 'dk-top' : 'dk-bottom');
    } catch (e) {
      dock.classList.add('dk-bottom');
    }
    /* 沉浸式画布页：跟随页面的闲置淡出节奏（.ui 基类只含 fixed/z-index/透明度过渡） */
    if (!doc.body.classList.contains('gk-page') && doc.querySelector('.ui')) dock.classList.add('ui');

    var box = doc.createElement('div');
    box.className = 'dk-items';
    makeToggle();
    dock.appendChild(toggle);
    for (var i = 0; i < list.length; i++) {
      remember(list[i]);
      box.appendChild(list[i]);
    }
    dock.appendChild(box);
    (doc.body || doc.documentElement).appendChild(dock);
    setCollapsed(true);
    place();
  }

  /* ---------------- 收集 + 启动 ---------------- */
  function setup() {
    if (active) return;
    active = true;
    injectStyle();

    /* 游戏页：gk-tools 本身就是右上竖排工具列，原地折叠即可 */
    gk = doc.querySelector('.gk-tools');
    if (gk) {
      var fs = doc.getElementById('fsKitBtn');
      if (fs && fs.parentNode !== gk) { remember(fs); gk.appendChild(fs); }
      makeToggle();
      gk.insertBefore(toggle, gk.firstChild);
      setCollapsed(true);
    } else {
      var list = [];
      /* 画布页的 .ui.tools（调色盘 + 页面自带按钮） */
      var tools = doc.querySelector('.ui.tools');
      if (tools && isFixed(tools)) list.push(tools);
      /* 生成器页的 pk-float 调色球 */
      if (!list.length) {
        var pkf = doc.querySelector('.pk.pk-float');
        if (pkf && isFixed(pkf)) list.push(pkf);
      }
      /* 待机页等自带固定 .tools 工具条 */
      if (!list.length) {
        var plains = doc.querySelectorAll('.tools');
        for (var i = 0; i < plains.length; i++) {
          if (isFixed(plains[i])) { list.push(plains[i]); break; }
        }
      }
      /* 全屏钮 */
      var fs2 = doc.getElementById('fsKitBtn');
      if (fs2) list.push(fs2);
      /* 翻译悬浮钮（若已加载出来；未加载的稍后通过 add() 注册） */
      var tkf = doc.querySelector('.tk-t-float');
      if (tkf) list.push(tkf);

      if (list.length >= 2) buildDock(list);
      /* 只有 1 个悬浮按钮的页面（工具箱页 / 首页）不建坞，保持原样 */
    }

    /* 点坞外自动收起（点坞内按钮不收起，方便连着用） */
    doc.addEventListener('click', function (e) {
      var h = host();
      if (!h || !toggle) return;
      if (isCollapsed()) return;
      if (h.contains(e.target)) return;
      setCollapsed(true);
    });
    doc.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && !isCollapsed()) setCollapsed(true);
    });
  }

  /* ---------------- 供其他组件注册（如 translate-kit 的悬浮按钮） ---------------- */
  win.DockKit = {
    add: function (node) {
      if (!active || !node || !node.parentNode) return;
      if (gk) return; /* 游戏页：翻译按钮已在 gk-tools 里，随列折叠 */
      if (dock) {
        if (node.parentNode !== dock && !dock.contains(node)) {
          remember(node);
          dock.querySelector('.dk-items').appendChild(node);
        }
        return;
      }
      /* 还没有坞：与已有的全屏悬浮钮合起来凑够两个就建坞 */
      var fs = doc.getElementById('fsKitBtn');
      var list = [];
      if (fs) list.push(fs);
      if (node !== fs) list.push(node);
      if (list.length >= 2) buildDock(list);
    },
    collapsed: isCollapsed,
    toggle: function () { setCollapsed(!isCollapsed()); }
  };

  /* ---------------- 响应宽度切换 ---------------- */
  function onMQ(e) {
    if (e.matches) setup();
    else teardown();
  }
  if (MQ.addEventListener) MQ.addEventListener('change', onMQ);
  else if (MQ.addListener) MQ.addListener(onMQ);

  function start() {
    if (MQ.matches) setup();
  }
  if (doc.readyState === 'loading' || doc.readyState === 'interactive') {
    doc.addEventListener('DOMContentLoaded', start, { once: true });
  } else {
    start();
  }
})();
