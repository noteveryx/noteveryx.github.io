/* ==========================================================
   dock-kit.js —— 手机端工具坞（全站通用）
   ------------------------------------------------------------
   用法：在 </head> 前加一行
     <script src="../assets/js/dock-kit.js" defer></script>

   手机 / 窄屏（≤600px，或触屏 ≤920px）时，把散落各处的悬浮
   工具按钮收进一个可折叠的「工具坞」，默认收起，点 ⋮ 展开。
   坞里从上到下统一是这几样：
     返回 · 主题 · 语言 · 全屏 · 页面自己的工具条（保存/下载在里头）
   展开后按钮紧挨着开关往下排；宽的工具条作为最后一行，右边缘对齐。
   · 游戏页：右上 gk-tools 工具列原地折叠，返回键也挪进去
   · 画布页：底部 .ui.bar（圆笔/橡皮/…/保存）+ 调色盘 + 悬浮件 收进坞
   · 工具箱页：页头里的语言钮也收进坞，页头只留标题
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
  var itemsBox = null; /* 坞里展开的那一列 */
  var toggle = null;   /* 折叠开关 */
  var gk = null;       /* 游戏页工具列（原地折叠，不建坞） */
  var moved = [];      /* 挪过位置的节点，记录原处便于还原 */
  var backSrc = null;  /* 被坞顶替掉的原返回键 */
  var active = false;

  var BACK_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" ' +
    'stroke-linecap="round" stroke-linejoin="round"><path d="M15 5l-7 7 7 7"/></svg>';

  var STYLE = [
    /* 工具坞容器。
       右边距 18px、圆钮 44px 与导航页的悬浮目录按钮一致，
       这样全屏钮 / 工具坞 / 目录钮落在同一条竖线上。 */
    '.dk{position:fixed;z-index:46;right:calc(18px + env(safe-area-inset-right));',
    'display:flex;flex-direction:column;align-items:flex-end;gap:8px;',
    /* 限高：按钮多的时候（画布页 + 工具条）不能把坞撑到屏幕外，
       顶部的按钮会被挤出视口，点不到。限高后由 .dk-items 自己滚动。 */
    'max-height:calc(100vh - 36px - env(safe-area-inset-top) - env(safe-area-inset-bottom));',
    'max-height:calc(100dvh - 36px - env(safe-area-inset-top) - env(safe-area-inset-bottom));}',
    '.dk.dk-bottom{bottom:calc(18px + env(safe-area-inset-bottom));}',
    '.dk.dk-top{top:calc(64px + env(safe-area-inset-top));}',
    /* 折叠开关：基础样子（游戏页右上工具列里也用这个类，那边保持 38px 紧凑） */
    '.dk-toggle{width:38px;height:38px;border-radius:50%;border:1px solid rgba(255,255,255,.22);',
    'background:rgba(14,16,26,.66);-webkit-backdrop-filter:blur(10px);backdrop-filter:blur(10px);',
    'color:rgba(255,255,255,.9);font:700 16px/1 -apple-system,system-ui,sans-serif;',
    'display:flex;align-items:center;justify-content:center;cursor:pointer;',
    '-webkit-tap-highlight-color:transparent;box-shadow:0 2px 10px rgba(0,0,0,.26);',
    'transition:transform .14s ease,background-color .2s,color .2s,border-color .2s;}',
    '.dk-toggle:active{transform:scale(.92);}',
    '.dk-toggle:focus-visible{outline:2px solid rgba(255,255,255,.55);outline-offset:2px;}',
    /* 开关不许被压缩：.dk 是 flex column，开关作为直接子项默认 shrink=1，
       限高之后会被压扁成椭圆（44×38 那种），看着像变形了 */
    '.dk > .dk-toggle{flex:0 0 auto;}',
    /* 展开后的按钮列：按钮紧挨着开关往下排，整体靠右对齐。
       按钮多到一屏放不下时，这一列自己上下滑动（限高由 .dk 的 max-height 给），
       不能让最上面的按钮被顶到屏幕外。
       这里不要加 padding：加了之后按钮列的内容右边缘会比开关左移 2px，
       两者就不在同一条竖线上了（开关要圆、按钮列也要圆，必须对齐中心）。 */
    '.dk-items{display:flex;flex-direction:column;align-items:flex-end;gap:8px;animation:dkIn .18s ease;',
    'flex:0 1 auto;min-height:0;overflow-y:auto;overscroll-behavior:contain;',
    'touch-action:pan-y;-webkit-overflow-scrolling:touch;}',
    /* 不显示滚动条：按钮列是纯手势区，滚动条会像一根多余的线挂在右边缘。
       滚动能力保留（overflow-y:auto + touch-action:pan-y），只是不画条。 */
    '.dk-items{scrollbar-width:none;}',
    '.dk-items::-webkit-scrollbar{width:0;height:0;display:none;}',
    /* 子项不许被压扁：flex 默认 shrink=1，高度不够时按钮会被挤成扁片，
       高度超出就交给 .dk-items 滚动 */
    '.dk-items > *{flex:0 0 auto;}',
    '@keyframes dkIn{from{opacity:0;transform:translateY(6px) scale(.96);}to{opacity:1;transform:none;}}',
    /* 被收纳的节点统一解除各自 fixed 定位，跟随坞排列（样式本身保留）。
       用 relative 而不是 static：主题/语言的面板是绝对定位的，需要相对按钮展开。 */
    '.dk-item{position:relative !important;left:auto !important;right:auto !important;',
    'top:auto !important;bottom:auto !important;transform:none !important;margin:0 !important;}',
    '.dk-collapsed .dk-items{display:none;}',
    /* 游戏页：gk-tools 原地折叠 */
    '.gk-tools.dk-collapsed > *:not(.dk-toggle){display:none;}',
    /* 游戏页的右上工具列同理：按钮多到一屏放不下时限高 + 可滚动 */
    '.gk-tools:not(.dk-collapsed){max-height:calc(100vh - 120px);max-height:calc(100dvh - 120px);',
    'overflow-y:auto;overscroll-behavior:contain;}',
    /* 坞里的返回键（统一外观，不再用各页面自己的圆形样式） */
    '.dk-back{display:flex;align-items:center;justify-content:center;',
    'text-decoration:none;cursor:pointer;-webkit-tap-highlight-color:transparent;',
    'transition:transform .14s ease,color .2s,border-color .2s,background-color .2s;}',
    '.dk-back:active{transform:scale(.92);}',
    '.dk-back svg{width:19px;height:19px;display:block;}',
    /* 主题按钮：它自带 fixed 定位（右上角），进坞后要复位 */
    '.dk .tk-btn{position:relative !important;top:auto !important;right:auto !important;}',
    /* 语言按钮：inline 模式带 margin-left:auto，进坞后居中；顺带改成圆形，和别的钮一致 */
    '.dk .tk-t{margin-left:0 !important;}',
    '.dk .tk-t-btn{padding:0;justify-content:center;gap:0;}',
    '.dk .tk-t-btn .tk-t-cur,.dk .tk-t-btn .tk-t-caret{display:none;}',
    '.dk .tk-t-btn .tk-t-ico{font-size:17px;}',
    /* 工具坞里的圆钮统一成 44px（对齐导航页的悬浮目录按钮）。 */
    '.dk .dk-toggle,.dk .dk-back,.dk .tk-btn,.dk .tk-t-btn,.dk .fsk-btn{',
    'width:44px;height:44px;border-radius:50%;}',
    /* 默认：深色玻璃（氛围屏 / 画板这类无主题页面）。
       注意不能直接用 var(--card)：text-kit.css 给 :root 写了一套浅色兜底值
       （--card:#fff），深色页面加载 text-kit 后坞钮会被染成白底白字。
       .tk-t 这一层要带上：translate-kit 是后注入的，同等优先级会被它自己的配色顶回去。 */
    '.dk .dk-toggle,.dk .dk-back,.dk .tk-btn,.dk .tk-t .tk-t-btn,.dk .fsk-btn{',
    'background:rgba(14,16,26,.66);',
    'border:1px solid rgba(255,255,255,.22);',
    'color:rgba(255,255,255,.9);',
    'box-shadow:0 2px 10px rgba(0,0,0,.26);}',
    '.dk .dk-toggle:hover,.dk .dk-back:hover,.dk .tk-btn:hover,',
    '.dk .tk-t .tk-t-btn:hover,.dk .fsk-btn:hover{',
    'background:rgba(14,16,26,.84);color:#fff;border-color:rgba(255,255,255,.42);}',
    /* 有主题的页面（html[data-theme]）才跟主题走：卡片底 + 主题描边 + 强调色悬停 */
    '.dk.dk-themed .dk-toggle,.dk.dk-themed .dk-back,.dk.dk-themed .tk-btn,',
    '.dk.dk-themed .tk-t .tk-t-btn,.dk.dk-themed .fsk-btn{',
    'background:var(--card,#fff);',
    'border-color:var(--line,rgba(0,0,0,.08));',
    'color:var(--text-2,var(--muted,#3d5049));',
    'box-shadow:var(--shadow,0 2px 10px rgba(0,0,0,.12));}',
    '.dk.dk-themed .dk-toggle:hover,.dk.dk-themed .dk-back:hover,.dk.dk-themed .tk-btn:hover,',
    '.dk.dk-themed .tk-t .tk-t-btn:hover,.dk.dk-themed .fsk-btn:hover{',
    'background:var(--card,#fff);',
    'color:var(--accent,var(--brand,#1e7a4c));',
    'border-color:var(--accent-ghost-line,rgba(0,0,0,.16));}',
    /* 画布页那几件散落在容器里的小钮（调色球 / 工具栏按钮 / 保存），
       进坞后一并拉到 44px，免得坞里忽大忽小、右边缘参差。
       .tk-t 要带上：translate-kit 是后注入的，同等优先级会被它的 40px 顶回。 */
    '.dk .tk-t .tk-t-btn,.dk .pk-trigger,.dk .tools .btn,.dk .tools .svk-btn,.dk .palette .btn{',
    'width:44px;height:44px;}',
    '.dk.dk-themed .pk-trigger{background:var(--card,#fff);border:1px solid var(--line,rgba(0,0,0,.08));}',
    /* 近期颜色是「一叠色块」不是按钮，只把宽度拉齐，圆角保留 */
    '.dk .recent{width:44px;box-sizing:border-box;}',
    /* 主题面板：手机上改成底部抽屉，跟语言面板一致 */
    '.dk .tk-panel{position:fixed !important;left:10px !important;right:10px !important;',
    'top:auto !important;bottom:10px !important;width:auto !important;max-width:none !important;',
    'transform:none !important;border-radius:20px !important;z-index:9998 !important;}',
    /* 语言面板：手机端本来是底部抽屉，保持不动 */
    /* 底部工具条（.ui.bar）**不进坞**：页面自己写的就是「贴底通栏 + 横向滚动」
       （left:50% + translateX(-50%) + max-width:calc(100vw - 20px) + overflow-x:auto），
       收进坞后宽度被压到坞那一列里，只能露出一截，示例/描红/撤销/保存全被挤到屏幕外，
       看着像「按钮不可用」。让它留在原位，坞改成避让它（见 place()）。 */
    /* 页面里给全屏钮让位的偏移，进坞后复位 */
    '.dk .fsk-btn{right:auto !important;}',
    /* 游戏页返回键挪进工具列后要解除固定定位 */
    '.gk-tools .gk-back{position:static !important;left:auto !important;top:auto !important;'
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
    if (mo) { mo.disconnect(); mo = null; }
    for (i = moved.length - 1; i >= 0; i--) {
      var n = moved[i];
      var rec = n.__dk;
      if (n.__dkRestore) {
        /* 自己知道怎么还原的（克隆的返回键、主题包装层） */
        try { n.__dkRestore(); } catch (e) { }
        n.__dk = null; n.__dkRestore = null;
        continue;
      }
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
    dock = null; toggle = null; gk = null; itemsBox = null;
    if (backSrc) { backSrc.style.display = ''; backSrc = null; }
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
    /* 展开后坞变高了，重新算一次避让（工具条这时才显形） */
    if (dock) { place(); schedulePlace(); }
  }

  /* 展开动画期间 .dk-items 上有 transform，会把 fixed 子元素的包含块改成它自己，
     这时量出来的位置是错的 —— 等动画结束再算一次 */
  var placeTimer = null;
  function schedulePlace(delay) {
    if (placeTimer) clearTimeout(placeTimer);
    placeTimer = setTimeout(function () { placeTimer = null; place(); }, delay || 280);
  }

  /* ---------------- 页面布局变了要重算 ----------------
     坞的避让是「算一次、写死在下边」的，可页面自己的固定 UI 会随时变：
     句子条展开/收起、面板开合、工具条显隐……
     页面变了而坞没重算，就会出现「句子条都收起了，坞还顶在屏幕中间」——
     坞只会往上躲，不会自己下来。
     所以盯着 DOM 变化，变了就重算一次（坞自己改 style/class 不算）。 */
  var mo = null;
  var resizeBound = false;
  function watchLayout() {
    if (mo || !win.MutationObserver || !doc.body) return;
    mo = new win.MutationObserver(function (recs) {
      for (var i = 0; i < recs.length; i++) {
        var t = recs[i].target;
        if (t === dock) continue;                 /* 坞自己改 style / class */
        if (dock && dock.contains(t)) continue;   /* 坞内部的变化 */
        schedulePlace(120);
        return;
      }
    });
    mo.observe(doc.body, {
      childList: true, subtree: true, attributes: true,
      attributeFilter: ['class', 'style', 'hidden']
    });
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
      /* 展开时把页面从闲置淡出状态唤醒，否则工具条是半透明的 */
      if (doc.body) doc.body.classList.remove('idle');
      setCollapsed(!isCollapsed());
    });
  }

  /* ---------------- 位置避让：坞若压到页面其他 fixed UI，逐级平移 ---------------- */
  function overlapsFixed(el) {
    var b = el.getBoundingClientRect();
    var els = doc.body.querySelectorAll('*');
    for (var i = 0; i < els.length; i++) {
      var x = els[i];
      if (x === el) continue;               /* 自己不算 */
      /* 坞内部的节点也不算：主题面板 / 语言面板收进坞后仍是 position:fixed
         （CSS 里给它们改成了底部抽屉），不排除的话坞会一直判定「和自己重叠」，
         每轮上移 52px，最后停在屏幕正中间 —— 工具条跟着飘到半空。 */
      if (dock && dock.contains(x)) continue;
      if (gk && gk.contains(x)) continue;
      if (x === toggle || x === itemsBox) continue;  /* 坞自己的开关与列（静态定位，本来也跳过） */
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
  /* 有主题的页面才让坞钮跟主题走。theme-kit 是 defer 的，
     首帧可能还没有 data-theme，所以下面的补扫循环里会再校一次。 */
  function syncThemed() {
    if (!dock) return;
    dock.classList.toggle('dk-themed', doc.documentElement.hasAttribute('data-theme'));
  }

  /* 坞被顶上去之后，屏幕留给它的高度就只剩这么多了 —— 必须限高，
     否则按钮多的时候坞会撑出屏幕，最上面的按钮够不着。
     限高后按钮列（.dk-items）自己滚动，滑到底能看全所有按钮。
     60 = 底部安全区(约 34) + 顶部留白 */
  function applyLimit(off) {
    var avail = win.innerHeight - off - 60;
    dock.style.maxHeight = Math.max(150, avail) + 'px';
  }

  function place() {
    if (!dock) return;
    dock.style.bottom = '';
    dock.style.top = '';
    dock.style.maxHeight = '';
    var isTop = dock.classList.contains('dk-top');
    var off = 18;
    applyLimit(off);
    for (var i = 0; i < 6; i++) {
      if (!overlapsFixed(dock)) break;
      /* 18 = 贴边距，52 = 44px 钮高 + 8px 间距 */
      off = 18 + (i + 1) * 52;
      if (isTop) dock.style.top = 'calc(' + off + 'px + env(safe-area-inset-top))';
      else dock.style.bottom = 'calc(' + off + 'px + env(safe-area-inset-bottom))';
      applyLimit(off);
    }
  }

  /* ---------------- 建坞 ---------------- */
  function buildDock(list) {
    /* 返回键放最上面：统一克隆一个，页面上原来那个窄屏隐藏 */
    var back = makeBack();
    if (back) { back.__dkRank = 0; list.unshift(back); }

    dock = doc.createElement('div');
    dock.className = 'dk';
    /* 坞固定在右下角：手机端拇指最容易够到，也不会和页面自己的右上角工具打架。
       原先按「第一个被收纳工具的原位置」判上/下，工具挂在页头时坞就跑到右上角，
       看起来像「程序坞位置不对」。 */
    dock.classList.add('dk-bottom');
    /* 只有真的有主题系统（html[data-theme]）的页面才让坞钮跟主题变色，
       否则按深色玻璃处理 —— 有些页面（如 text-kit）会给 :root 塞浅色兜底变量 */
    syncThemed();
    /* 沉浸式画布页：跟随页面的闲置淡出节奏（.ui 基类只含 fixed/z-index/透明度过渡） */
    if (!doc.body.classList.contains('gk-page') && doc.querySelector('.ui')) dock.classList.add('ui');

    var box = doc.createElement('div');
    box.className = 'dk-items';
    itemsBox = box;
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

  /* ---------------- 返回键 ----------------
     全站有 5 种写法（a.ui.back / a.gk-back / a.back-btn / a.back / a.tb-back），
     有的 fixed 悬浮、有的在页头文档流里。统一克隆一个进坞，
     页面上原来那个在窄屏隐藏，避免出现两个「返回」。 */
  function findBack() {
    return doc.querySelector('a.gk-back, a.ui.back, a.back-btn, a.back, a.tb-back');
  }
  /* nav-kit 的规矩：直接打开（referrer 不同源）时不显示返回键，
     坞里的返回键也得跟着 —— 否则直接进页面也会冒出个退不掉的返回。 */
  function noBack() {
    return doc.documentElement.classList.contains('no-back');
  }
  function makeBack() {
    if (backSrc || noBack()) return null;
    var src = findBack();
    if (!src) return null;
    var a = doc.createElement('a');
    a.className = 'dk-item dk-back';
    a.href = src.getAttribute('href') || '../x.html';
    a.title = '返回';
    a.setAttribute('aria-label', '返回');
    a.innerHTML = BACK_SVG;
    backSrc = src;
    src.style.display = 'none';
    a.__dkRestore = function () {
      if (a.parentNode) a.parentNode.removeChild(a);
    };
    return a;
  }
  /* 把坞里的返回键撤掉，原键放回原处 */
  function dropBack() {
    if (!dock) return;
    var bk = dock.querySelector('.dk-back');
    if (bk && bk.__dkRestore) { try { bk.__dkRestore(); } catch (e) { } }
    if (backSrc) { backSrc.style.display = ''; backSrc = null; }
  }

  /* ---------------- 主题按钮 ----------------
     主题按钮(.tk-btn)和它的面板(.tk-panel)是两个独立的 fixed 节点，
     不带着面板一起走的话，收进坞后面板会跑到屏幕右上角对不上按钮。 */
  function themeWrap(tbtn) {
    if (tbtn.__dkThemeWrap) return tbtn.__dkThemeWrap;
    var panel = doc.querySelector('.tk-panel');
    var wrap = doc.createElement('div');
    wrap.className = 'dk-theme';
    var btnParent = tbtn.parentNode, btnNext = tbtn.nextSibling;
    var panelParent = panel ? panel.parentNode : null, panelNext = panel ? panel.nextSibling : null;
    btnParent.insertBefore(wrap, tbtn);
    wrap.appendChild(tbtn);
    if (panel) wrap.appendChild(panel);
    wrap.__dkRestore = function () {
      try {
        if (btnNext && btnNext.parentNode === btnParent) btnParent.insertBefore(tbtn, btnNext);
        else btnParent.appendChild(tbtn);
        if (panel && panelParent) {
          if (panelNext && panelNext.parentNode === panelParent) panelParent.insertBefore(panel, panelNext);
          else panelParent.appendChild(panel);
        }
      } catch (e) { }
      if (wrap.parentNode) wrap.parentNode.removeChild(wrap);
    };
    tbtn.__dkThemeWrap = wrap;
    return wrap;
  }

  /* ---------------- 收集：哪些节点该进坞 ----------------
     顺序 = 坞里从上到下：返回 → 主题 → 语言 → 全屏 → 页面工具条(含保存/下载)
     rank 决定坞里的先后；异步补进来的节点按 rank 插回正确位置，
     免得宽条（工具条）插在竖排按钮中间，把一列割断。
     返回键不在这里克隆，等真的要建坞时再克隆（免得收集阶段就把原键藏了）。 */
  function inDock(n) { return !!(dock && dock.contains(n)); }
  function rank(node, r) { node.__dkRank = r; return node; }

  function collect() {
    var list = [];

    if (gk) {
      /* 游戏页：工具列原地折叠；返回键也挪进去，左上角空出来 */
      var fs = doc.getElementById('fsKitBtn');
      if (fs && fs.parentNode !== gk) { remember(fs); gk.appendChild(fs); }
      var gb = doc.querySelector('a.gk-back');
      if (gb && gb.parentNode !== gk) { remember(gb); gk.appendChild(gb); }
      if (!toggle) {
        makeToggle();
        gk.insertBefore(toggle, gk.firstChild);
      }
      setCollapsed(true);
      return list;
    }

    /* ② 主题（连面板一起） */
    var tbtn = doc.querySelector('.tk-btn');
    if (tbtn && !inDock(tbtn)) list.push(rank(themeWrap(tbtn), 1));
    /* ③ 语言（float 悬浮钮、inline 页头钮都收） */
    var tk = doc.querySelector('.tk-t');
    if (tk && !inDock(tk)) list.push(rank(tk, 2));
    /* ④ 全屏 */
    var fs2 = doc.getElementById('fsKitBtn');
    if (fs2 && !inDock(fs2)) list.push(rank(fs2, 3));
    /* ⑤ 底部工具条（.ui.bar）**故意不收**：它本身就是「贴底通栏 + 横向滚动」，
       收进坞后被压成坞里的一行，示例/描红/撤销/保存会被挤到屏幕外，
       用户点不到就以为「按钮坏了」。留在原位，坞避让它即可。 */
    /* ⑥ 散落在右上角 / 右侧的小工具：
       .ui.tools（视觉页的调色盘组）、.ui.side（画板右侧的近期颜色 + 调色盘）、
       .ui.palette（曼陀罗的调色盘）—— 都属于「一堆小按钮」，收进坞最整齐 */
    var tools = doc.querySelector('.ui.tools, .ui.side, .ui.palette');
    if (tools && isFixed(tools) && !inDock(tools)) list.push(rank(tools, 5));
    /* ⑥b 只装一个调色盘的 .ui.panel（手写板就是这种结构） */
    if (!tools) {
      var upanel = doc.querySelector('.ui.panel');
      if (upanel && isFixed(upanel) && !inDock(upanel)) list.push(rank(upanel, 5));
    }
    /* ⑦ 生成器页的 pk-float 调色球 */
    if (!tools) {
      var pkf = doc.querySelector('.pk.pk-float');
      if (pkf && isFixed(pkf) && !inDock(pkf)) list.push(rank(pkf, 5));
    }
    /* ⑧ 待机页等自带固定 .tools 工具条 */
    if (!list.length) {
      var plains = doc.querySelectorAll('.tools');
      for (var i = 0; i < plains.length; i++) {
        if (isFixed(plains[i]) && !inDock(plains[i])) { list.push(rank(plains[i], 5)); break; }
      }
    }
    return list;
  }

  /* 按 rank 把节点插进坞里的那一列（rank 小的在前） */
  function insertByRank(node) {
    var box = itemsBox || (dock && dock.querySelector('.dk-items'));
    if (!box) return;
    var r = node.__dkRank || 9;
    var ref = null;
    var kids = box.children;
    for (var i = 0; i < kids.length; i++) {
      if ((kids[i].__dkRank || 9) > r) { ref = kids[i]; break; }
    }
    box.insertBefore(node, ref);
  }

  /* ---------------- 启动 ---------------- */
  function setup() {
    if (active) return;
    active = true;
    injectStyle();

    /* 游戏页：gk-tools 本身就是右上竖排工具列，原地折叠即可 */
    gk = doc.querySelector('.gk-tools');
    if (gk) {
      collect();
    } else {
      var list = collect();
      /* 有返回键也算一件：几乎每个页面都该有坞 */
      if (list.length + (findBack() ? 1 : 0) >= 1) buildDock(list);
    }

    /* 窗口尺寸变了（旋转屏幕、地址栏收放）要重算限高与避让 */
    if (!resizeBound) {
      resizeBound = true;
      win.addEventListener('resize', function () {
        if (dock) { place(); schedulePlace(80); }
      }, { passive: true });
    }

    /* 页面布局一变就重算坞的避让位置 */
    watchLayout();

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

    /* 有些节点是别的脚本异步生成的（主题按钮、工具箱页头、语言钮、
       页面工具条），首帧可能还没出来 → 后面再扫几次补进坞 */
    var tries = 0;
    var timer = setInterval(function () {
      tries++;
      syncThemed();
      if (gk) {
        var gb = doc.querySelector('a.gk-back');
        if (gb && gb.parentNode !== gk) { remember(gb); gk.appendChild(gb); }
      } else {
        var add = collect();
        if (!dock) {
          if (add.length + (findBack() ? 1 : 0) >= 1) buildDock(add);
        } else {
          if (add.length) {
            for (var i = 0; i < add.length; i++) {
              remember(add[i]);
              insertByRank(add[i]);
            }
            place();
          }
          /* 返回键跟着 nav-kit 的判断走 */
          var bk = dock.querySelector('.dk-back');
          if (noBack()) { if (bk) dropBack(); }
          else if (!bk) {
            var nb = makeBack();
            if (nb) {
              remember(nb);
              dock.querySelector('.dk-items').insertBefore(nb, dock.querySelector('.dk-items').firstChild);
            }
          }
        }
      }
      if (tries >= 10) clearInterval(timer);
    }, 300);
  }

  /* ---------------- 供其他组件注册（如 translate-kit 的语言钮） ---------------- */
  win.DockKit = {
    add: function (node) {
      if (!active || !node || !node.parentNode) return;
      if (gk) return; /* 游戏页：翻译按钮已在 gk-tools 里，随列折叠 */
      if (!node.__dkRank) node.__dkRank = 2;   /* 注册的一般是语言钮 */
      if (dock) {
        if (node.parentNode !== dock && !dock.contains(node)) {
          remember(node);
          insertByRank(node);
          place();
        }
        return;
      }
      /* 还没有坞：直接建，把这个节点收进去（返回键会由 buildDock 补在最前） */
      var list = [];
      var fs = doc.getElementById('fsKitBtn');
      if (fs && fs !== node) list.push(fs);
      list.push(node);
      buildDock(list);
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
