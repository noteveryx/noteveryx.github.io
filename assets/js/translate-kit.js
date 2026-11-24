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
  /* 单个源最多等这么久，超时就换下一个源。
     串行加载（一次只注入一个 script），避免多个源同时成功时
     translate.js 自己抛「重复加载」异常把控制台刷红。
     这个值不能太小：源只是慢（不是挂）的时候提前换源，前一个稍后还是会执行完，
     就又变成重复加载了。10 秒基本只有真挂/被墙才会触发换源。 */
  var SOURCE_TIMEOUT = 10000;

  var LOCAL = 'chinese_simplified';    /* 本站原文语种 */
  var STORE_KEY = 'kb_translate_lang'; /* 本地记忆的语言 */
  var SERVICE = 'client.edge';         /* 首选翻译通道：浏览器直连，不过第三方服务器 */
  var SERVICE_BAK = 'translate.service'; /* 备用翻译通道：官方服务 */

  /* ---------- 语言展示信息（id 与 translate.js 语言表一致） ----------
     这张本地表是必须的：上游 translate.js 的 language.json 里有一批名字是坏的
     —— 后面误加了 "Name"（punjabi → "ਪੰਜਾਬੀName"、indonesian → "IndonesiaName"、
     telugu / kannada / marathi / nepali / pashto / icelandic / khmer 同病），
     还有拼错的（tamil → "தாமில்"、persian → "Persian"、thai → "คนไทย"）。
     面板里显示这些名字就是「选项看不完整」，所以这里维护一份正确的。 */
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
    urdu: ['🇵🇰', 'اردو'],
    haitian_creole: ['🇭🇹', 'Kreyòl Ayisyen'],
    polish: ['🇵🇱', 'Polski'],
    dutch: ['🇳🇱', 'Nederlands'],
    swedish: ['🇸🇪', 'Svenska'],
    norwegian: ['🇳🇴', 'Norsk'],
    finnish: ['🇫🇮', 'Suomi'],
    danish: ['🇩🇰', 'Dansk'],
    icelandic: ['🇮🇸', 'Íslenska'],
    ukrainian: ['🇺🇦', 'Українська'],
    czech: ['🇨🇿', 'Čeština'],
    slovak: ['🇸🇰', 'Slovenčina'],
    greek: ['🇬🇷', 'Ελληνικά'],
    hebrew: ['🇮🇱', 'עברית'],
    hungarian: ['🇭🇺', 'Magyar'],
    romanian: ['🇷🇴', 'Română'],
    bulgarian: ['🇧🇬', 'Български'],
    catalan: ['🇪🇸', 'Català'],
    galician: ['🇪🇸', 'Galego'],
    basque: ['🇪🇸', 'Euskara'],
    croatian: ['🇭🇷', 'Hrvatski'],
    estonian: ['🇪🇪', 'Eesti'],
    latvian: ['🇱🇻', 'Latviešu'],
    lithuanian: ['🇱🇹', 'Lietuvių'],
    slovene: ['🇸🇮', 'Slovenščina'],
    filipino: ['🇵🇭', 'Filipino'],
    afrikaans: ['🇿🇦', 'Afrikaans'],
    bengali: ['🇧🇩', 'বাংলা'],
    tamil: ['🇮🇳', 'தமிழ்'],
    telugu: ['🇮🇳', 'తెలుగు'],
    kannada: ['🇮🇳', 'ಕನ್ನಡ'],
    malayalam: ['🇮🇳', 'മലയാളം'],
    marathi: ['🇮🇳', 'मराठी'],
    gujarati: ['🇮🇳', 'ગુજરાતી'],
    punjabi: ['🇮🇳', 'ਪੰਜਾਬੀ'],
    oriya: ['🇮🇳', 'ଓଡ଼ିଆ'],
    assamese: ['🇮🇳', 'অসমীয়া'],
    nepali: ['🇳🇵', 'नेपाली'],
    sanskrit: ['🇮🇳', 'संस्कृतम्'],
    sindhi: ['🇵🇰', 'سنڌي'],
    swahili: ['🇰🇪', 'Kiswahili'],
    amharic: ['🇪🇹', 'አማርኛ'],
    maltese: ['🇲🇹', 'Malti'],
    maori: ['🇳🇿', 'Te Reo Māori'],
    hawaiian: ['🇺🇸', 'ʻŌlelo Hawaiʻi'],
    irish: ['🇮🇪', 'Gaeilge'],
    welsh: ['🏴󠁧󠁢󠁷󠁬󠁳󠁿', 'Cymraeg'],
    scottish_gaelic: ['🏴󠁧󠁢󠁳󠁣󠁴󠁿', 'Gàidhlig'],
    albanian: ['🇦🇱', 'Shqip'],
    azerbaijani: ['🇦🇿', 'Azərbaycan dili'],
    armenian: ['🇦🇲', 'Հայերեն'],
    georgian: ['🇬🇪', 'ქართული'],
    bosnian: ['🇧🇦', 'Bosanski'],
    kazakh: ['🇰🇿', 'Қазақша'],
    kyrgyz: ['🇰🇬', 'Кыргызча'],
    uyghur: ['🇨🇳', 'ئۇيغۇرچە'],
    uzbek: ['🇺🇿', 'Oʻzbekcha'],
    tajik: ['🇹🇯', 'Тоҷикӣ'],
    turkmen: ['🇹🇲', 'Türkmençe'],
    mongolian: ['🇲🇳', 'Монгол'],
    lao: ['🇱🇦', 'ພາສາລາວ'],
    khmer: ['🇰🇭', 'ភាសា ខ្មែរ'],
    burmese: ['🇲🇲', 'မြန်မာဘာသာ'],
    malagasy: ['🇲🇬', 'Malagasy'],
    inuktitut: ['🇨🇦', 'ᐃᓄᒃᑎᑐᑦ'],
    samoan: ['🇼🇸', 'Gagana Sāmoa'],
    tongan: ['🇹🇴', 'Lea faka Tonga'],
    hausa: ['🇳🇬', 'Hausa'],
    yoruba: ['🇳🇬', 'Yorùbá'],
    igbo: ['🇳🇬', 'Igbo'],
    somali: ['🇸🇴', 'Soomaali'],
    oromo: ['🇪🇹', 'Afaan Oromoo'],
    shona: ['🇿🇼', 'Shona'],
    zulu: ['🇿🇦', 'isiZulu'],
    xhosa: ['🇿🇦', 'isiXhosa'],
    quechua: ['🇵🇪', 'Runasimi'],
    guarani: ['🇵🇾', 'Guaraní'],
    kurdish: ['🇮🇶', 'کوردی'],
    pashto: ['🇦🇫', 'پښتو'],
    sinhala: ['🇱🇰', 'සිංහල']
  };

  /* 面板排序：常用语言在前，其余按字母 */
  var ORDER = [
    'chinese_simplified', 'english', 'chinese_traditional', 'japanese', 'korean',
    'french', 'deutsch', 'german', 'spanish', 'portuguese', 'italian', 'russian',
    'thai', 'vietnamese', 'indonesian', 'malay', 'turkish', 'arabic', 'persian',
    'hindi', 'polish', 'dutch', 'swedish', 'norwegian', 'finnish', 'danish',
    'ukrainian', 'czech', 'greek', 'hebrew', 'hungarian', 'romanian'
  ];

  /* 页面有没有自己的主题变量块（html[data-theme="xxx"]{ --card: ... }）？
     有 → 按钮和语言列表跟随主题色；没有 → 保持深色玻璃风。
     判据不能是「html 上有没有 data-theme」—— theme-kit 自己也会写这个属性，
     那样会恒真；也不能直接 var(--card) —— text-kit.css 在 :root 写过浅色 --card，
     深色氛围屏加载它之后按钮会变白底。 */
  function hasThemeVars() {
    var sheets = document.styleSheets;
    for (var i = 0; i < sheets.length; i++) {
      var rules;
      try { rules = sheets[i].cssRules; } catch (e) { continue; }
      if (!rules) continue;
      for (var j = 0; j < rules.length; j++) {
        var r = rules[j];
        if (r.selectorText && r.selectorText.indexOf('[data-theme') > -1 && r.style && r.style.length) return true;
      }
    }
    return false;
  }
  var HAS_THEME = hasThemeVars();

  /* ---------- 样式（自带注入，不额外占页面行数） ---------- */
  var STYLE = [
    '#translate{display:none !important;}',
    '.tk-t{position:relative;display:inline-flex;align-items:center;}',
    /* 按钮全站统一 44×44 圆形。
       原来是「页头胶囊钮 109×32（PC）+ 坞里圆钮 44×44（手机）」两套尺寸，
       同一个按钮在两端大小不一样 —— 现在统一成 44 圆形，
       和游戏页工具列、坞里的其它钮完全一致。 */
    '.tk-t-btn{display:inline-flex;align-items:center;justify-content:center;gap:0;',
    'width:44px;height:44px;padding:0;border-radius:50%;',
    'border:1px solid var(--tk-line,rgba(255,255,255,.18));',
    'background:var(--tk-bg,rgba(14,16,26,.72));color:var(--tk-fg,#fff);',
    'font:600 12.5px/1 -apple-system,BlinkMacSystemFont,"PingFang SC","Microsoft YaHei",system-ui,sans-serif;',
    'cursor:pointer;white-space:nowrap;flex:0 0 auto;-webkit-tap-highlight-color:transparent;',
    'box-shadow:0 2px 10px rgba(0,0,0,.16);transition:transform .12s ease,border-color .2s,box-shadow .2s;}',
    '.tk-t-btn:hover{border-color:var(--accent,var(--brand,#635bff));box-shadow:0 4px 16px rgba(0,0,0,.22);}',
    '.tk-t-btn:active{transform:scale(.95);}',
    '.tk-t-btn:focus-visible{outline:2px solid var(--accent,var(--brand,#635bff));outline-offset:2px;}',
    '.tk-t-ico{font-size:18px;line-height:1;}',
    /* 当前语言名改用 title/aria-label 提示，按钮本身只留图标 */
    '.tk-t-cur,.tk-t-caret{display:none;}',

    /* 圆形模式：并入游戏页右上角工具列 */
    '.tk-t-round{display:block;}',

    /* 悬浮模式：沉浸式画布页
       注意：这里不能用 transform 居中——transform 会成为 fixed 子元素的包含块，
       会让手机端的底部抽屉宽度塌陷。改用 calc 计算垂直位置 */
    '.tk-t-float{position:fixed;z-index:70;left:calc(12px + env(safe-area-inset-left));',
    'top:calc(50% - 22px);}',
    '.tk-t-float .tk-t-btn{box-shadow:0 3px 14px rgba(0,0,0,.3);}',

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
    /* 语言名不截断：面板窄，长的名字（ភាសា ខ្មែរ、ᐃᓄᒃᑎᑐᑦ、Te Reo Māori…）
       省略号截断就是「选项看不完整」。允许换行完整显示。 */
    '.tk-t-name{flex:1;min-width:0;white-space:normal;overflow-wrap:anywhere;line-height:1.25;}',
    '.tk-t-check{font-size:12px;opacity:0;flex:0 0 auto;}',
    '.tk-t-item.on .tk-t-check{opacity:1;}',

    /* ---------- 跟随主题色（页面有主题变量块时由 JS 加 .tk-t-themed） ----------
       变量兜底顺序：--card（themes.css）→ --panel（tool-standby）→ 兜底。
       基础样式保持深色：不加这个类时绝不能读 var(--card) ——
       text-kit.css 在 :root 写过浅色 --card，深色氛围屏会变成白底白字。

       ⚠️ 面板是挂在 body 下的（手机端要变底部抽屉、游戏页要脱离工具列），
       所以它**不在 .tk-t wrap 里面** —— 「.tk-t-themed .tk-t-panel」这种后代选择器
       根本匹配不到它。后果是：面板背景用基础样式里的深色兜底值，
       而面板里的文字走 var(--text) 跟着主题变 ——
       浅色主题下就变成「深底 + 深字」，整块看不清。
       所以下面除了后代写法，还要给「面板自身带 .tk-t-themed」的写法
       （theme-kit 的 .tk-panel.tk-themed 就是这么干的）。 */
    '.tk-t-themed .tk-t-btn{border-color:var(--tk-line,var(--line,rgba(0,0,0,.1)));',
    'background:var(--tk-bg,var(--card,var(--panel,#fff)));color:var(--tk-fg,var(--text,#1e1a2e));',
    'box-shadow:var(--shadow,0 2px 10px rgba(0,0,0,.12));}',
    '.tk-t-themed .tk-t-panel{background:var(--tk-panel-bg,var(--card,var(--panel,#fff)));',
    'border-color:var(--tk-line,var(--line,rgba(0,0,0,.1)));',
    'box-shadow:var(--shadow,0 20px 50px -20px rgba(0,0,0,.35));}',
    '.tk-t-themed .tk-t-title{color:var(--muted,#98a0b0);}',
    '.tk-t-themed .tk-t-item{color:var(--tk-fg,var(--text,#1e1a2e));}',
    '.tk-t-themed .tk-t-item:hover{background:var(--ghost-active,var(--brand-soft,rgba(0,0,0,.05)));}',
    '.tk-t-themed .tk-t-item.on{background:var(--ghost-active,var(--brand-soft,rgba(0,0,0,.05)));',
    'color:var(--accent,var(--brand,#1e7a4c));}',
    /* 面板自身带主题类（面板挂在 body 下，没有 .tk-t-themed 祖先） */
    '.tk-t-panel.tk-themed{background:var(--tk-panel-bg,var(--card,var(--panel,#fff)));',
    'border-color:var(--tk-line,var(--line,rgba(0,0,0,.1)));',
    'box-shadow:var(--shadow,0 20px 50px -20px rgba(0,0,0,.35));}',
    '.tk-t-panel.tk-themed .tk-t-title{color:var(--muted,#98a0b0);}',
    '.tk-t-panel.tk-themed .tk-t-item{color:var(--tk-fg,var(--text,#1e1a2e));}',
    '.tk-t-panel.tk-themed .tk-t-item:hover{background:var(--ghost-active,var(--brand-soft,rgba(0,0,0,.05)));}',
    '.tk-t-panel.tk-themed .tk-t-item.on{background:var(--ghost-active,var(--brand-soft,rgba(0,0,0,.05)));',
    'color:var(--accent,var(--brand,#1e7a4c));}',

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
  /* 上游 translate.js 的 language.json 里有一批语言名后面误加了 "Name"
     （"ਪੰਜਾਬੀName"、"IndonesiaName"、"ÍslandName"…）。
     META 兜住的用本地表，兜不住的在这里把尾巴去掉，别直接甩给用户看。 */
  function cleanName(n) {
    var raw = String(n == null ? '' : n);
    var s = raw.replace(/\s*Name\s*$/, '');
    return s || raw;
  }
  function langName(id) { var m = metaOf(id); return m ? m[1] : cleanName(id); }

  /* ---------------- 加载远程组件 ----------------
     串行换源：先试第一个，SOURCE_TIMEOUT 内没成功（报错 / 超时）再试下一个。
     三个源并行注入时，只要有两个加载成功，translate.js 就会自己抛
     「重复加载」异常（虽然它自己会拦下来，但控制台一片红），
     所以改成一次只加载一个。首屏不依赖它，晚几秒出现翻译按钮没有影响。 */
  function loadScript(cb) {
    if (win.translate && win.translate.version) { T = win.translate; cb(true); return; }
    var done = false;
    var idx = 0;

    function finish(ok) {
      if (done) return;
      done = true;
      cb(ok);
    }

    function tryNext() {
      if (done) return;
      /* 上一个源虽然超时被摘掉了，但如果它已经执行完，这里直接收工，
         不要再注入下一个（否则就是两份 translate.js） */
      if (win.translate && win.translate.version) {
        T = win.translate;
        finish(true);
        return;
      }
      if (idx >= SOURCES.length) { finish(false); return; }
      var url = SOURCES[idx++];
      var s = doc.createElement('script');
      s.src = url;
      s.async = true;
      var settled = false;
      var timer = setTimeout(function () {
        /* 超时的源摘掉，不占带宽，直接换下一个 */
        if (settled) return;
        settled = true;
        if (s.parentNode) s.parentNode.removeChild(s);
        tryNext();
      }, SOURCE_TIMEOUT);
      s.onload = function () {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        if (win.translate && win.translate.version) {
          T = win.translate;   /* 锁定实例 */
          finish(true);
        } else {
          tryNext();
        }
      };
      s.onerror = function () {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        if (s.parentNode) s.parentNode.removeChild(s);
        tryNext();
      };
      (doc.head || doc.documentElement).appendChild(s);
    }

    tryNext();
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
    wrap.className = 'tk-t ignore' + (HAS_THEME ? ' tk-t-themed' : '') +
      (host.mode === 'round' ? ' tk-t-round' : '') +
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
    /* 面板挂 body 下，没有 .tk-t-themed 祖先 → 主题类要加在它自己身上 */
    panel.className = 'tk-t-panel' + (HAS_THEME ? ' tk-themed' : '');
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

    /* 手机端由工具坞（dock-kit）统一收纳：
       float 悬浮钮、inline 页头钮都进坞（宽屏时 DockKit.add 直接忽略） */
    if (win.DockKit && typeof win.DockKit.add === 'function') {
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
      langs.push({ id: id, flag: m ? m[0] : '🌐', name: m ? m[1] : cleanName(it.name || id) });
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
    if (curEl) curEl.textContent = m ? m[1] : cleanName(cur);
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
    var mobile = win.matchMedia && win.matchMedia('(max-width:600px)').matches;
    /* 面板一律挂到 body：
       - 手机端是底部抽屉，本来就要脱离局部容器；
       - 游戏页（round 模式）必须脱离 —— 工具列 .gk-tools 是 position:fixed + z-index，
         会形成一个层叠上下文，面板留在列里就压不过同层的开始/暂停遮罩 .gk-overlay，
         点翻译钮看着像「没反应」，列表其实被整个盖住了。
       挂到 body 后用 fixed + 按钮的实际坐标定位，位置也跟着按钮走。 */
    if (panel.parentNode !== doc.body) doc.body.appendChild(panel);
    panel.hidden = false;   /* 先显示，后面才量得到真实高度 */
    if (mobile) {
      /* 手机端交给 CSS 的底部抽屉规则（左 10 / 右 10 / 底 10），
         之前用 inline 写死的桌面坐标必须清掉 */
      panel.style.top = '';
      panel.style.right = '';
      panel.style.left = '';
      panel.style.bottom = '';
    } else if (btn) {
      var r = btn.getBoundingClientRect();
      var vh = win.innerHeight, vw = win.innerWidth;
      var ph = panel.offsetHeight || 440;
      /* 垂直定位必须夹在视口内：
         悬浮钮在屏幕左侧垂直居中（top≈50%），按「按钮下方」排的话
         面板会从视口中间一直伸到屏幕外，底部的语言根本够不着 ——
         这就是那些页面「列表看不完整」的原因。 */
      var top;
      if (wrap && wrap.classList.contains('tk-t-float') && r.left < vw / 2) {
        /* 悬浮钮在屏幕左侧 → 面板与按钮垂直居中（否则 440 高的面板会伸出屏幕） */
        top = r.top + r.height / 2 - ph / 2;
      } else {
        top = r.bottom + 8;                    /* 其余（含右上角成对）：按钮正下方 */
      }
      if (top + ph > vh - 8) top = vh - ph - 8;
      if (top < 8) top = 8;
      panel.style.position = 'fixed';
      panel.style.top = Math.round(top) + 'px';
      panel.style.bottom = '';
      /* 往按钮空旷的一侧展开：
         按钮在页头右侧（inline）→ 面板向左展开，贴着按钮右边缘；
         按钮在屏幕左侧（float 悬浮）→ 面板向右展开。
         方向选错面板就会跑到屏幕外，列表根本看不到。 */
      var spaceLeft = r.left, spaceRight = vw - r.right;
      if (spaceLeft < spaceRight) {
        panel.style.left = Math.round(r.right + 10) + 'px';
        panel.style.right = '';
      } else {
        panel.style.right = Math.max(8, Math.round(vw - r.right)) + 'px';
        panel.style.left = '';
      }
    }
    if (btn) btn.setAttribute('aria-expanded', 'true');
    revealCurrent();
    notifyPanelOpen();
  }
  /* 列表有 70+ 项，当前语言往往在中间，
     打开面板却看不到自己现在用的哪个语言 —— 不在可视区时把它滚到中间。 */
  function revealCurrent() {
    if (!panel || !listEl) return;
    var on = listEl.querySelector('.tk-t-item.on');
    if (!on) return;
    var pr = panel.getBoundingClientRect();
    var ir = on.getBoundingClientRect();
    if (ir.top >= pr.top && ir.bottom <= pr.bottom) return;   // 已经看得见就不动
    panel.scrollTop += (ir.top - pr.top) - (pr.height - ir.height) / 2;
  }
  function closePanel() {
    if (!panel) return;
    panel.hidden = true;
    if (btn) btn.setAttribute('aria-expanded', 'false');
  }
  /* 面板是 fixed + inline 坐标，窗口变了要跟着按钮重算 */
  var rzTimer = null;
  win.addEventListener('resize', function () {
    if (!panel || panel.hidden) return;
    clearTimeout(rzTimer);
    rzTimer = setTimeout(function () { if (panel && !panel.hidden) openPanel(); }, 120);
  });

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

  /* 把组件加载推迟到页面 load 之后：translate.js 走第三方 CDN，
     一旦它卡住，动态插入的 script 会一直拖着 window.load 不触发，
     连带页面里等 load 的逻辑（懒加载、统计、首屏收尾）一起延后。
     CDN 正常时也就晚几百毫秒，用户根本感觉不到。最多等 2.5s 兜底。 */
  function deferLoad(cb) {
    var started = false;
    function start() {
      if (started) return;
      started = true;
      loadScript(cb);
    }
    if (doc.readyState === 'complete') { start(); return; }
    win.addEventListener('load', start, { once: true });
    setTimeout(start, 2500);
  }

  function boot() {
    deferLoad(function (ok) {
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
