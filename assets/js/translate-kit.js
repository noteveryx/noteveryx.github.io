/* ==========================================================
   translate-kit.js —— 页面翻译（全站通用）
   ------------------------------------------------------------
   用法：在 </head> 前加一行
     <script src="../assets/js/translate-kit.js" defer></script>

   基于 translate.js（https://gitee.com/mail_osc/translate）：
     · 走 Edge 公开翻译通道（client.edge）：无需 API Key，
       请求由浏览器直连翻译接口，不经过第三方服务器
       ※ 若所在网络访问 edge 微软接口不通，把下面 SERVICE
         改成 'translate.service'（官方服务，国内更快）即可
     · 隐藏 translate.js 自带的原生 select，换成本站风格的按钮 + 面板
     · 语言写入 localStorage，跨页面保持；切回「简体中文」自动还原原文
     · 组件加载失败时静默降级：页面照常可用，不影响任何功能
   ========================================================== */
(function () {
  'use strict';

  var doc = document, win = window;

  /* 组件来源：并行加载，谁先成功用谁（避免某个源被墙时整页不可用） */
  var SOURCES = [
    'https://res.zvo.cn/translate/translate.js',
    'https://cdn.jsdelivr.net/gh/xnx3/translate@4.0.0/translate.js/translate.min.js',
    'https://gitee.com/mail_osc/translate/raw/master/translate.js'
  ];
  var SOURCE_TIMEOUT = 12000;

  var LOCAL = 'chinese_simplified';    /* 本站原文语种 */
  var STORE_KEY = 'kb_translate_lang'; /* 本地记忆的语言 */
  var SERVICE = 'client.edge';         /* 首选翻译通道：浏览器直连，不过第三方服务器 */
  var SERVICE_BAK = 'translate.service'; /* 备用翻译通道：官方服务 */

  /* ---------- 语言展示信息（id 与 translate.js 语言表一致） ---------- */
  var META = {
    chinese_simplified: ['🇨🇳', '简体中文'],
    english: ['🇬🇧', 'English'],
    chinese_traditional: ['🇭🇰', '繁體中文'],
    japanese: ['🇯🇵', '日本語'],
    korean: ['🇰🇷', '한국어'],
    french: ['🇫🇷', 'Français'],
    deutsch: ['🇩🇪', 'Deutsch'],
    german: ['🇩🇪', 'Deutsch'],
    spanish: ['🇪🇸', 'Español'],
    portuguese: ['🇵🇹', 'Português'],
    italian: ['🇮🇹', 'Italiano'],
    russian: ['🇷🇺', 'Русский'],
    thai: ['🇹🇭', 'ไทย'],
    vietnamese: ['🇻🇳', 'Tiếng Việt'],
    indonesian: ['🇮🇩', 'Bahasa Indonesia'],
    malay: ['🇲🇾', 'Bahasa Melayu'],
    turkish: ['🇹🇷', 'Türkçe'],
    arabic: ['🇸🇦', 'العربية'],
    persian: ['🇮🇷', 'فارسی'],
    hindi: ['🇮🇳', 'हिन्दी'],
    polish: ['🇵🇱', 'Polski'],
    dutch: ['🇳🇱', 'Nederlands'],
    swedish: ['🇸🇪', 'Svenska'],
    norwegian: ['🇳🇴', 'Norsk'],
    finnish: ['🇫🇮', 'Suomi'],
    danish: ['🇩🇰', 'Dansk'],
    ukrainian: ['🇺🇦', 'Українська'],
    czech: ['🇨🇿', 'Čeština'],
    greek: ['🇬🇷', 'Ελληνικά'],
    hebrew: ['🇮🇱', 'עברית'],
    hungarian: ['🇭🇺', 'Magyar'],
    romanian: ['🇷🇴', 'Română'],
    bulgarian: ['🇧🇬', 'Български'],
    catalan: ['🇪🇸', 'Català'],
    croatian: ['🇭🇷', 'Hrvatski'],
    estonian: ['🇪🇪', 'Eesti'],
    latvian: ['🇱🇻', 'Latviešu'],
    lithuanian: ['🇱🇹', 'Lietuvių'],
    slovene: ['🇸🇮', 'Slovenščina'],
    filipino: ['🇵🇭', 'Filipino'],
    afrikaans: ['🇿🇦', 'Afrikaans'],
    bengali: ['🇧🇩', 'বাংলা'],
    tamil: ['🇮🇳', 'தமிழ்'],
    urdu: ['🇵🇰', 'اردو'],
    kazakh: ['🇰🇿', 'Қазақша'],
    swahili: ['🇰🇪', 'Kiswahili'],
    amharic: ['🇪🇹', 'አማርኛ'],
    maltese: ['🇲🇹', 'Malti'],
    maori: ['🇳🇿', 'Māori'],
    irish: ['🇮🇪', 'Gaeilge'],
    albanian: ['🇦🇱', 'Shqip'],
    azerbaijani: ['🇦🇿', 'Azərbaycan dili'],
    bosnian: ['🇧🇦', 'Bosanski'],
    armenian: ['🇦🇲', 'Հայերեն'],
    georgian: ['🇬🇪', 'ქართული'],
    indonesian2: ['🇮🇩', 'Bahasa Indonesia']
  };

  /* 面板排序：常用语言在前，其余按字母 */
  var ORDER = [
    'chinese_simplified', 'english', 'chinese_traditional', 'japanese', 'korean',
    'french', 'deutsch', 'german', 'spanish', 'portuguese', 'italian', 'russian',
    'thai', 'vietnamese', 'indonesian', 'malay', 'turkish', 'arabic', 'persian',
    'hindi', 'polish', 'dutch', 'swedish', 'norwegian', 'finnish', 'danish',
    'ukrainian', 'czech', 'greek', 'hebrew', 'hungarian', 'romanian'
  ];

  /* ---------- 样式（自带注入，不额外占页面行数） ---------- */
  var STYLE = [
    '#translate{display:none !important;}',
    '.tk-t{position:relative;display:inline-flex;align-items:center;}',
    '.tk-t-btn{display:inline-flex;align-items:center;gap:6px;height:32px;padding:0 10px 0 9px;',
    'border-radius:999px;border:1px solid var(--tk-line,var(--line,rgba(255,255,255,.18)));',
    'background:var(--tk-bg,var(--card,rgba(14,16,26,.72)));color:var(--tk-fg,var(--text,#fff));',
    'font:600 12.5px/1 -apple-system,BlinkMacSystemFont,"PingFang SC","Microsoft YaHei",system-ui,sans-serif;',
    'cursor:pointer;white-space:nowrap;flex:0 0 auto;-webkit-tap-highlight-color:transparent;',
    'box-shadow:0 2px 10px rgba(0,0,0,.16);transition:transform .12s ease,border-color .2s,box-shadow .2s;}',
    '.tk-t-btn:hover{border-color:var(--accent,var(--brand,#635bff));box-shadow:0 4px 16px rgba(0,0,0,.22);}',
    '.tk-t-btn:active{transform:scale(.95);}',
    '.tk-t-btn:focus-visible{outline:2px solid var(--accent,var(--brand,#635bff));outline-offset:2px;}',
    '.tk-t-ico{font-size:14px;line-height:1;}',
    '.tk-t-cur{max-width:104px;overflow:hidden;text-overflow:ellipsis;}',
    '.tk-t-caret{width:7px;height:7px;border-right:1.6px solid currentColor;border-bottom:1.6px solid currentColor;',
    'transform:rotate(45deg) translate(-2px,-2px);opacity:.55;transition:transform .2s;}',
    '.tk-t-btn[aria-expanded="true"] .tk-t-caret{transform:rotate(-135deg) translate(-3px,-3px);}',

    /* 圆形模式：并入游戏页右上角工具列 */
    '.tk-t-round{display:block;}',
    '.tk-t-round .tk-t-btn{width:38px;height:38px;padding:0;border-radius:50%;justify-content:center;gap:0;}',
    '.tk-t-round .tk-t-cur,.tk-t-round .tk-t-caret{display:none;}',
    '.tk-t-round .tk-t-ico{font-size:17px;}',

    /* 悬浮模式：沉浸式画布页
       注意：这里不能用 transform 居中——transform 会成为 fixed 子元素的包含块，
       会让手机端的底部抽屉宽度塌陷。改用 calc 计算垂直位置 */
    '.tk-t-float{position:fixed;z-index:70;left:calc(12px + env(safe-area-inset-left));',
    'top:calc(50% - 20px);}',
    '.tk-t-float .tk-t-btn{width:40px;height:40px;padding:0;border-radius:50%;justify-content:center;gap:0;',
    'box-shadow:0 3px 14px rgba(0,0,0,.3);}',
    '.tk-t-float .tk-t-cur,.tk-t-float .tk-t-caret{display:none;}',
    '.tk-t-float .tk-t-ico{font-size:18px;}',

    /* 面板 */
    '.tk-t-panel{position:absolute;z-index:9998;top:calc(100% + 8px);right:0;width:216px;',
    'max-height:min(62vh,440px);overflow-y:auto;overscroll-behavior:contain;padding:8px;border-radius:16px;',
    'background:var(--tk-panel-bg,var(--card,rgba(16,20,28,.97)));',
    'border:1px solid var(--tk-line,var(--line,rgba(255,255,255,.16)));',
    'box-shadow:0 20px 50px -20px rgba(0,0,0,.55);text-align:left;}',
    '.tk-t-panel[hidden]{display:none;}',
    '.tk-t-title{font:700 10.5px/1 -apple-system,system-ui,sans-serif;letter-spacing:.12em;',
    'text-transform:uppercase;color:var(--muted,rgba(255,255,255,.5));padding:6px 10px 8px;}',
    '.tk-t-list{display:flex;flex-direction:column;gap:2px;}',
    '.tk-t-item{display:flex;align-items:center;gap:9px;width:100%;padding:8px 10px;border:0;',
    'border-radius:9px;background:transparent;color:var(--tk-fg,var(--text,#fff));',
    'font:600 13px/1.3 -apple-system,BlinkMacSystemFont,"PingFang SC","Microsoft YaHei",system-ui,sans-serif;',
    'text-align:left;cursor:pointer;-webkit-tap-highlight-color:transparent;',
    'transition:background-color .14s,color .14s;}',
    '.tk-t-item:hover{background:rgba(125,140,180,.16);}',
    '.tk-t-item.on{background:var(--accent-ghost-bg,rgba(120,140,190,.18));',
    'color:var(--accent,var(--brand,#635bff));}',
    '.tk-t-flag{font-size:15px;line-height:1;flex:0 0 auto;}',
    '.tk-t-name{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}',
    '.tk-t-check{font-size:12px;opacity:0;flex:0 0 auto;}',
    '.tk-t-item.on .tk-t-check{opacity:1;}',

    /* 悬浮模式：面板向右展开 */
    '.tk-t-float .tk-t-panel{left:calc(100% + 10px);right:auto;top:50%;transform:translateY(-50%);}',

    /* 手机：面板改为底部抽屉 */
    '@media (max-width:600px){',
    '.tk-t-panel,.tk-t-float .tk-t-panel{position:fixed;left:10px;right:10px;top:auto;bottom:10px;',
    'width:auto;max-width:none;max-height:min(72vh,560px);transform:none;border-radius:20px;padding:10px;}',
    '.tk-t-item{padding:11px 12px;}}',

    /* 提示条 */
    '.tk-t-toast{position:fixed;left:50%;bottom:calc(26px + env(safe-area-inset-bottom));',
    'transform:translate(-50%,10px);z-index:9999;padding:9px 16px;border-radius:999px;',
    'background:rgba(14,16,26,.92);border:1px solid rgba(255,255,255,.14);color:rgba(255,255,255,.92);',
    'font:600 12.5px/1.4 -apple-system,"PingFang SC",system-ui,sans-serif;',
    'box-shadow:0 12px 30px -12px rgba(0,0,0,.5);opacity:0;pointer-events:none;',
    'transition:opacity .22s,transform .22s;}',
    '.tk-t-toast.show{opacity:1;transform:translate(-50%,0);}'
  ].join('');

  var wrap = null, btn = null, panel = null, listEl = null, toast = null, toastTimer = 0;
  var langs = [];
  var pendingLang = '';
  var usedFallback = false;
  var T = null; /* translate.js 实例引用：多源并行时锁定先到的那份 */

  /* ---------------- 基础工具 ---------------- */
  function storeGet(k) { try { return localStorage.getItem(k) || ''; } catch (e) { return ''; } }
  function storeSet(k, v) { try { localStorage.setItem(k, v); } catch (e) { } }

  function currentLang() {
    var t = T;
    if (!t) return '';
    try {
      if (t.language && typeof t.language.getCurrent === 'function') {
        var v = t.language.getCurrent();
        if (v) return v;
      }
    } catch (e) { }
    return t.to || '';
  }

  function metaOf(id) {
    if (!id) return null;
    if (META[id]) return META[id];
    if (id === 'german') return META.deutsch;
    return null;
  }
  function langName(id) { var m = metaOf(id); return m ? m[1] : id; }

  /* ---------------- 加载远程组件 ---------------- */
  function loadScript(cb) {
    if (win.translate && win.translate.version) { T = win.translate; cb(true); return; }
    var done = false;
    var pending = SOURCES.length;

    function finish(ok) {
      if (done) return;
      done = true;
      cb(ok);
    }
    function claim() {
      if (done) return false;
      if (win.translate && win.translate.version) {
        T = win.translate;   /* 锁定实例：其他源即使后到也不会影响 */
        finish(true);
        return true;
      }
      return false;
    }

    for (var i = 0; i < SOURCES.length; i++) {
      (function (url) {
        var s = doc.createElement('script');
        s.src = url;
        s.async = true;
        var timer = setTimeout(function () {
          /* 超时的源摘掉，不占带宽 */
          if (s.parentNode) s.parentNode.removeChild(s);
          if (--pending === 0) finish(false);
        }, SOURCE_TIMEOUT);
        s.onload = function () {
          clearTimeout(timer);
          if (claim()) return;
          if (--pending === 0) finish(false);
        };
        s.onerror = function () {
          clearTimeout(timer);
          if (--pending === 0) finish(false);
        };
        (doc.head || doc.documentElement).appendChild(s);
      })(SOURCES[i]);
    }
  }

  function injectStyle() {
    if (doc.querySelector('style[data-translate-kit]')) return;
    var st = doc.createElement('style');
    st.setAttribute('data-translate-kit', '1');
    st.textContent = STYLE;
    (doc.head || doc.documentElement).appendChild(st);
  }

  /* ---------------- 挂载位置 ----------------
     优先并入页面已有的头部/工具列，找不到才悬浮 */
  function pickHost() {
    var tb = doc.querySelector('.tb-head');
    if (tb) return { mode: 'inline', el: tb };
    var top = doc.querySelector('.topbar-inner');
    if (top) return { mode: 'inline', el: top };
    var gk = doc.querySelector('.gk-tools');
    if (gk) return { mode: 'round', el: gk };
    return { mode: 'float', el: null };
  }

  /* ---------------- 构建 UI ---------------- */
  function build(list) {
    injectStyle();
    if (wrap) { fillList(list); return; }

    var host = pickHost();
    wrap = doc.createElement('div');
    wrap.className = 'tk-t ignore' + (host.mode === 'round' ? ' tk-t-round' : '') +
      (host.mode === 'float' ? ' tk-t-float' : '');
    wrap.setAttribute('data-translate-kit', '1');

    btn = doc.createElement('button');
    btn.type = 'button';
    btn.className = 'tk-t-btn';
    btn.setAttribute('aria-haspopup', 'true');
    btn.setAttribute('aria-expanded', 'false');
    btn.setAttribute('aria-label', '切换页面语言');
    btn.title = '切换页面语言';
    btn.innerHTML = '<span class="tk-t-ico">🌐</span><span class="tk-t-cur">简体中文</span><span class="tk-t-caret"></span>';
    btn.addEventListener('click', function (e) {
      e.preventDefault();
      e.stopPropagation();
      togglePanel();
    });

    panel = doc.createElement('div');
    panel.className = 'tk-t-panel';
    panel.hidden = true;
    panel.setAttribute('role', 'menu');
    panel.setAttribute('aria-label', '选择页面语言');
    var title = doc.createElement('div');
    title.className = 'tk-t-title';
    title.textContent = '页面语言';
    panel.appendChild(title);
    listEl = doc.createElement('div');
    listEl.className = 'tk-t-list';
    panel.appendChild(listEl);

    wrap.appendChild(btn);
    wrap.appendChild(panel);

    if (host.el) {
      if (host.mode === 'inline') {
        wrap.style.marginLeft = 'auto';
        var right = host.el.querySelector('.topbar-right');
        if (right) host.el.insertBefore(wrap, right);
        else host.el.appendChild(wrap);
      } else {
        host.el.appendChild(wrap);
      }
    } else {
      (doc.body || doc.documentElement).appendChild(wrap);
    }

    /* 手机端由工具坞（dock-kit）统一收纳悬浮按钮 */
    if (host.mode === 'float' && win.DockKit && typeof win.DockKit.add === 'function') {
      win.DockKit.add(wrap);
    }

    fillList(list);
    updateState();

    doc.addEventListener('click', function (e) {
      if (panel && !panel.hidden && !wrap.contains(e.target) && !panel.contains(e.target)) closePanel();
    });
    doc.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && panel && !panel.hidden) { closePanel(); btn.focus(); }
    });
  }

  /* ---------------- 语言列表 ---------------- */
  function fillList(list) {
    langs = [];
    var seen = {};
    (list || []).forEach(function (it) {
      var id = it && it.id;
      if (!id || seen[id]) return;
      seen[id] = 1;
      var m = metaOf(id);
      langs.push({ id: id, flag: m ? m[0] : '🌐', name: m ? m[1] : (it.name || id) });
    });

    /* 「简体中文」永远排第一（原文语种） */
    var hasLocal = false;
    for (var i = 0; i < langs.length; i++) if (langs[i].id === LOCAL) hasLocal = true;
    if (!hasLocal) langs.unshift({ id: LOCAL, flag: '🇨🇳', name: '简体中文' });

    langs.sort(function (a, b) {
      var ia = ORDER.indexOf(a.id), ib = ORDER.indexOf(b.id);
      if (ia < 0) ia = 999;
      if (ib < 0) ib = 999;
      if (ia !== ib) return ia - ib;
      return a.name.localeCompare(b.name);
    });

    if (!listEl) return;
    listEl.textContent = '';
    for (var k = 0; k < langs.length; k++) {
      (function (L) {
        var it = doc.createElement('button');
        it.type = 'button';
        it.className = 'tk-t-item';
        it.setAttribute('role', 'menuitemradio');
        it.setAttribute('data-id', L.id);
        var f = doc.createElement('span');
        f.className = 'tk-t-flag';
        f.textContent = L.flag;
        var n = doc.createElement('span');
        n.className = 'tk-t-name';
        n.textContent = L.name;
        var c = doc.createElement('span');
        c.className = 'tk-t-check';
        c.setAttribute('aria-hidden', 'true');
        c.textContent = '✓';
        it.appendChild(f);
        it.appendChild(n);
        it.appendChild(c);
        it.addEventListener('click', function (e) {
          e.preventDefault();
          e.stopPropagation();
          closePanel();
          applyLang(L.id);
        });
        listEl.appendChild(it);
      })(langs[k]);
    }
    updateState();
  }

  /* ---------------- 状态同步 ---------------- */
  function updateState() {
    if (!btn) return;
    var cur = currentLang() || storeGet(STORE_KEY) || LOCAL;
    if (cur === 'german') cur = 'deutsch';
    var m = metaOf(cur);
    var curEl = btn.querySelector('.tk-t-cur');
    if (curEl) curEl.textContent = m ? m[1] : cur;
    btn.setAttribute('title', '当前语言：' + (m ? m[1] : cur) + '（点击切换）');
    var items = listEl ? listEl.querySelectorAll('.tk-t-item') : [];
    for (var i = 0; i < items.length; i++) {
      var on = items[i].getAttribute('data-id') === cur;
      items[i].classList.toggle('on', on);
      items[i].setAttribute('aria-checked', on ? 'true' : 'false');
    }
  }

  /* ---------------- 面板开合 ---------------- */
  function togglePanel() {
    if (!panel) return;
    if (panel.hidden) openPanel();
    else closePanel();
  }
  function openPanel() {
    if (!panel) return;
    /* 手机端把面板挂到 body 上：脱离按钮所在的局部容器。
       像 x.html 顶栏这种带 backdrop-filter 的祖先会成为 fixed 子元素的
       包含块，面板若留在容器里会被定位进顶栏内部而完全不可见 */
    if (win.matchMedia && win.matchMedia('(max-width:600px)').matches) {
      if (panel.parentNode !== doc.body) doc.body.appendChild(panel);
    } else if (panel.parentNode !== wrap) {
      wrap.appendChild(panel);
    }
    panel.hidden = false;
    if (btn) btn.setAttribute('aria-expanded', 'true');
    notifyPanelOpen();
  }
  function closePanel() {
    if (!panel) return;
    panel.hidden = true;
    if (btn) btn.setAttribute('aria-expanded', 'false');
  }

  /* ---------- 面板互斥 ----------
     翻译按钮自己 stopPropagation，主题面板 / 调色盘面板也各自 stopPropagation，
     彼此都收不到对方的点击，「点击外部收起」那条 document 监听形同虚设 ——
     翻译列表开着时点主题按钮，翻译列表不会收起。
     这里广播「我要打开了」，别的面板收到就收起自己。 */
  function notifyPanelOpen() {
    try {
      win.dispatchEvent(new CustomEvent('kb:panel-open', { detail: { id: 'translate' } }));
    } catch (e) {}
  }
  win.addEventListener('kb:panel-open', function (e) {
    var d = e && e.detail;
    if (!d || d.id === 'translate') return;
    if (panel && !panel.hidden) closePanel();
  });

  /* ---------------- 切换语言 ---------------- */
  function applyLang(id) {
    var t = T;
    if (!t) return;
    storeSet(STORE_KEY, id);
    pendingLang = id;
    usedFallback = false;
    if (id === LOCAL) {
      /* 兜底：先还原原文，再让 translate.js 走一遍自己的还原流程 */
      try { if (typeof t.reset === 'function') t.reset(); } catch (e) { }
    }
    try {
      /* changeLanguage 内部会 reset 页面（还原原文），再重新翻译 */
      t.changeLanguage(id);
    } catch (e) { }
    updateState();
    if (id === LOCAL) {
      showToast('已切换回中文');
    } else {
      showToast('正在翻译为 ' + langName(id) + ' …');
      /* 首选通道迟迟无响应，换备用通道重试一次 */
      setTimeout(function () {
        if (pendingLang !== id || usedFallback) return;
        usedFallback = true;
        try {
          t.service.use(SERVICE_BAK);
          t.changeLanguage(id);
          showToast('正在切换备用翻译通道 …');
        } catch (e) { }
      }, 7000);
      setTimeout(function () {
        if (pendingLang === id) { pendingLang = ''; showToast('已切换为 ' + langName(id)); }
      }, 9000);
    }
  }

  /* ---------------- 提示条 ---------------- */
  function showToast(msg) {
    if (!toast) {
      toast = doc.createElement('div');
      toast.className = 'tk-t-toast';
      toast.setAttribute('role', 'status');
      toast.setAttribute('aria-live', 'polite');
      (doc.body || doc.documentElement).appendChild(toast);
    }
    toast.textContent = msg;
    void toast.offsetWidth;
    toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toast.classList.remove('show'); }, 1900);
  }

  /* ---------------- 启动 ---------------- */
  var NO_UI = !!win.__TK_NO_PAGE_UI__; /* 页面自己实现翻译交互（如翻译工具页）时置 true：不注入页面翻译按钮 */
  var readyCbs = [];
  function fireReady() {
    for (var i = 0; i < readyCbs.length; i++) { try { readyCbs[i](T); } catch (e) { } }
    readyCbs = [];
  }

  function boot() {
    loadScript(function (ok) {
      if (!ok || !T) {
        if (win.console && console.warn) console.warn('[translate-kit] 组件加载失败，页面翻译不可用');
        fireReady();
        return;
      }
      var t = T;
      try {
        /* 原文是简体中文 */
        t.language.setLocal(LOCAL);
        /* 翻译通道 */
        t.service.use(SERVICE);
      } catch (e) { }

      /* 翻译工具页：只提供实例，不做页面翻译 */
      if (NO_UI) { fireReady(); return; }

      try {
        /* 用我们自己的 UI 替换 translate.js 的原生下拉框 */
        t.selectLanguageTag.customUI = function (list) { build(list); };
      } catch (e) { }

      try {
        t.execute();
      } catch (e) { }

      /* 翻译完成后给一次明确反馈 */
      try {
        if (t.lifecycle && t.lifecycle.execute && t.lifecycle.execute.translateNetworkAfter &&
          typeof t.lifecycle.execute.translateNetworkAfter.push === 'function') {
          t.lifecycle.execute.translateNetworkAfter.push(function () {
            if (pendingLang) {
              showToast(pendingLang === LOCAL ? '已切换回中文' : '已切换为 ' + langName(pendingLang));
              pendingLang = '';
            }
          });
        }
      } catch (e) { }

      /* 还原上次选择的语言 */
      var saved = storeGet(STORE_KEY);
      var cur = currentLang();
      if (!cur && saved && saved !== LOCAL) {
        setTimeout(function () { applyLang(saved); }, 120);
      } else if (cur && cur !== saved) {
        storeSet(STORE_KEY, cur);
      }
      updateState();
      fireReady();
    });
  }

  /* 等 DOM 就绪再挂载：工具箱页的页头是 deferred 脚本生成的，
     必须等它跑完才能找到 .tb-head */
  if (doc.readyState === 'loading' || doc.readyState === 'interactive') {
    doc.addEventListener('DOMContentLoaded', boot, { once: true });
  } else {
    boot();
  }

  /* 暴露给页面按需调用 */
  win.TranslateKit = {
    change: function (id) { applyLang(id); },
    current: function () { return currentLang() || storeGet(STORE_KEY) || LOCAL; },
    /* 拿到 translate.js 实例（组件加载完成时回调；失败时收到 null） */
    ready: function (cb) {
      if (T) { try { cb(T); } catch (e) { } return; }
      readyCbs.push(cb);
    }
  };
})();
