/* ==========================================================
   palette-kit —— 共享调色板组件
   所有「涉及变色」的页面共用，颜色不再写死，随便挑。

   特点：
     · SV 取色区（饱和度 × 明度）+ 色相 / 饱和 / 亮度 三条滑块
     · 80 个常用色（10 组，可折叠）+ HEX 手输 + 随机
     · 面板挂在 <body>，position:fixed，JS 自动定位并翻转
       → PC 与手机上都不会被裁剪、超出屏幕或点不到

   用法：
     <link rel="stylesheet" href="../assets/css/palette-kit.css">
     <div class="pk" data-pk="aurora" data-placement="left"></div>

     <script src="../assets/js/palette-kit.js"></script>
     <script>
       var pk = window.PaletteKit.mount(document.querySelector('.pk'), {
         value: '#635bff',
         onChange: function (color) { 这里重绘 }
       });
       pk.set('#2dd4bf');
     </script>
   ========================================================== */
(function (global) {
  'use strict';

  /* 80 色大调色板，按色系分组 */
  var GROUPS = [
    { name: '中性', colors: ['#000000', '#1c1f26', '#343a46', '#5a6273', '#8b93a3', '#c3c9d4', '#e6e9ef', '#ffffff'] },
    { name: '红橙', colors: ['#ff4d4f', '#ff7a45', '#ff9f43', '#ffc069', '#e8590c', '#d9480f', '#a61e4d', '#f783ac'] },
    { name: '暖黄', colors: ['#fff3bf', '#ffe066', '#ffd43b', '#fcc419', '#f59f00', '#e67700', '#d9480f', '#8c5a2b'] },
    { name: '黄绿', colors: ['#d8f3dc', '#b2f2bb', '#8ce99a', '#69db7c', '#51cf66', '#37b24d', '#2f9e44', '#1f7a33'] },
    { name: '青绿', colors: ['#c3fae8', '#99f9e0', '#63e6be', '#38d9a9', '#20c997', '#12b886', '#0ca678', '#087f5b'] },
    { name: '天蓝', colors: ['#c5f6fa', '#99e9f2', '#66d9e8', '#3bc9db', '#22b8cf', '#0c8599', '#0b7285', '#095c6b'] },
    { name: '深蓝', colors: ['#d0ebff', '#a5d8ff', '#74c0fc', '#4dabf7', '#339af0', '#228be6', '#1c7ed6', '#1864ab'] },
    { name: '靛紫', colors: ['#e5dbff', '#d0bfff', '#b197fc', '#9775fa', '#845ef7', '#7950f2', '#6741d9', '#5f3dc4'] },
    { name: '品红', colors: ['#f3d9fa', '#eebefa', '#e599f7', '#da77f2', '#cc5de8', '#ae3ec9', '#9c36b5', '#862e9c'] },
    { name: '粉红', colors: ['#ffe3e3', '#ffc9c9', '#ffa8a8', '#ff8787', '#ff6b6b', '#f06595', '#e64980', '#d6336c'] }
  ];

  var ALL = [];
  GROUPS.forEach(function (g) { g.colors.forEach(function (c) { ALL.push(c); }); });

  function hex2rgb(h) {
    var s = String(h || '').replace('#', '').trim();
    if (s.length === 3) s = s[0] + s[0] + s[1] + s[1] + s[2] + s[2];
    if (!/^[0-9a-fA-F]{6}$/.test(s)) return null;
    var n = parseInt(s, 16);
    return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
  }

  function rgb2hex(r, g, b) {
    var f = function (v) { return ('0' + Math.round(v).toString(16)).slice(-2); };
    return '#' + f(r) + f(g) + f(b);
  }

  function rgb2hsl(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    var max = Math.max(r, g, b), min = Math.min(r, g, b);
    var h = 0, s = 0, l = (max + min) / 2;
    var d = max - min;
    if (d) {
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
      else if (max === g) h = (b - r) / d + 2;
      else h = (r - g) / d + 4;
      h *= 60;
    }
    return { h: h, s: s, l: l };
  }

  function hsl2rgb(h, s, l) {
    h = ((h % 360) + 360) % 360;
    var c = (1 - Math.abs(2 * l - 1)) * s;
    var x = c * (1 - Math.abs(((h / 60) % 2) - 1));
    var m = l - c / 2;
    var r = 0, g = 0, b = 0;
    if (h < 60) { r = c; g = x; }
    else if (h < 120) { r = x; g = c; }
    else if (h < 180) { g = c; b = x; }
    else if (h < 240) { g = x; b = c; }
    else if (h < 300) { r = x; b = c; }
    else { r = c; b = x; }
    return { r: Math.round((r + m) * 255), g: Math.round((g + m) * 255), b: Math.round((b + m) * 255) };
  }

  /* HSL → HEX 便捷函数 */
  function h2hex(h, s, l) {
    var c = hsl2rgb(h, s, l);
    return rgb2hex(c.r, c.g, c.b);
  }

  /* 由一个主色派生同色系（用于极光、海报这类需要和谐多色的场景） */
  function derive(hx, dh, ds, dl) {
    var c = hex2rgb(hx);
    if (!c) c = { r: 99, g: 91, b: 255 };
    var hsl = rgb2hsl(c.r, c.g, c.b);
    var out = [];
    for (var i = 0; i < 4; i++) {
      var t = i - 1.5;                              // -1.5, -0.5, 0.5, 1.5
      var rgb = hsl2rgb(hsl.h + t * (dh || 34), Math.max(0, Math.min(1, hsl.s + t * (ds || 0.06))), Math.max(0.06, Math.min(0.92, hsl.l + t * (dl || 0.12))));
      out.push(rgb2hex(rgb.r, rgb.g, rgb.b));
    }
    return out;
  }

  /* ---------------- 配色方案（类似 Adobe Color） ---------------- */
  var HARMONIES = [
    { id: 'analogous', name: '类似色', hues: [0, 28, -28, 56, -56], sat: [0, .06, -.06, .12, -.12], lig: [0, .09, -.09, .14, -.14] },
    { id: 'complement', name: '互补色', hues: [0, 180, 24, 204, 156], sat: [0, .04, .06, -.04, .02], lig: [0, -.08, .1, -.14, .12] },
    { id: 'triad', name: '三分色', hues: [0, 120, 240, 60, 300], sat: [0, .05, -.05, .1, -.1], lig: [0, .06, -.06, .12, -.12] },
    { id: 'split', name: '分裂互补', hues: [0, 150, 210, 30, 330], sat: [0, .05, -.05, .08, -.08], lig: [0, .07, -.07, .13, -.13] },
    { id: 'mono', name: '单色', hues: [0, 0, 0, 0, 0], sat: [.14, .07, 0, -.07, -.14], lig: [.24, .12, 0, -.12, -.24] }
  ];

  function harmonyColors(baseHex, kind) {
    var c = hex2rgb(baseHex);
    if (!c || !kind) return [];
    var b = rgb2hsl(c.r, c.g, c.b);
    var out = [];
    for (var i = 0; i < 5; i++) {
      var h = (b.h + kind.hues[i] + 360) % 360;
      var s = Math.max(0.08, Math.min(1, b.s + kind.sat[i]));
      var l = Math.max(0.14, Math.min(0.88, b.l + kind.lig[i]));
      out.push(h2hex(h, s, l));
    }
    return out;
  }

  function copyText(txt) {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(txt);
        return true;
      }
    } catch (e) { }
    return false;
  }

  function shuffle(arr) {
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  /* 页面底色是浅色时，面板也用浅色（避免一黑一白太割裂） */
  function detectLight(el) {
    if (el && el.classList.contains('on-light')) return true;
    if (el && el.closest && el.closest('.on-light')) return true;
    var t = document.documentElement.getAttribute('data-theme');
    if (t === 'midnight' || t === 'ink') return false;
    if (t) return true;
    var bg = getComputedStyle(document.body).backgroundColor;
    var m = /rgba?\((\d+),\s*(\d+),\s*(\d+)/.exec(bg || '');
    if (m) {
      var l = parseInt(m[1], 10) * 0.299 + parseInt(m[2], 10) * 0.587 + parseInt(m[3], 10) * 0.114;
      return l > 140;
    }
    return false;
  }

  var openInstances = [];

  function closeAll(except) {
    openInstances = openInstances.filter(function (inst) {
      if (inst === except) return true;
      inst.close();
      return false;
    });
  }

  /* ---------------- 组件 ---------------- */
  function mount(el, opts) {
    opts = opts || {};
    if (!el) return null;

    var key = el.getAttribute('data-pk') || opts.key || 'pk';
    var placement = el.getAttribute('data-placement') || opts.placement || 'top';

    var current = opts.value || '#635bff';
    try {
      var saved = localStorage.getItem('pk_' + key);
      if (saved && hex2rgb(saved)) current = saved;
    } catch (e) { }

    var hsl = rgb2hsl.apply(null, (function () {
      var c = hex2rgb(current) || { r: 99, g: 91, b: 255 };
      return [c.r, c.g, c.b];
    })());
    var state = { h: hsl.h, s: hsl.s, l: hsl.l };

    /* ---------- 触发器 ---------- */
    var trigger = document.createElement('button');
    trigger.type = 'button';
    trigger.className = 'pk-trigger';
    trigger.title = '选择颜色';
    trigger.setAttribute('aria-label', '打开调色板');
    trigger.innerHTML = '<i></i>';
    el.appendChild(trigger);

    /* ---------- 面板（挂 body） ---------- */
    var panel = document.createElement('div');
    panel.className = 'pk-panel';
    if (detectLight(el)) panel.classList.add('on-light');

    var head = document.createElement('div');
    head.className = 'pk-head';
    var title = document.createElement('span');
    title.className = 'pk-title';
    title.textContent = opts.label || ('调色板 · ' + GROUPS.length + ' 组 ' + ALL.length + ' 色');
    var closeBtn = document.createElement('button');
    closeBtn.type = 'button';
    closeBtn.className = 'pk-close';
    closeBtn.setAttribute('aria-label', '关闭');
    closeBtn.textContent = '✕';
    head.appendChild(title);
    head.appendChild(closeBtn);
    panel.appendChild(head);

    /* ---------- Tabs：取色 / 色轮 ---------- */
    var tabs = document.createElement('div');
    tabs.className = 'pk-tabs';
    var tabPick = document.createElement('button');
    tabPick.type = 'button'; tabPick.className = 'pk-tab on'; tabPick.textContent = '取色';
    var tabWheel = document.createElement('button');
    tabWheel.type = 'button'; tabWheel.className = 'pk-tab'; tabWheel.textContent = '色轮';
    tabs.appendChild(tabPick);
    tabs.appendChild(tabWheel);
    panel.appendChild(tabs);

    var viewPick = document.createElement('div');
    viewPick.className = 'pk-view';
    panel.appendChild(viewPick);

    /* SV 取色区 */
    var svWrap = document.createElement('div');
    svWrap.className = 'pk-sv-wrap';
    var sv = document.createElement('canvas');
    sv.className = 'pk-sv';
    var dot = document.createElement('span');
    dot.className = 'pk-dot';
    svWrap.appendChild(sv);
    svWrap.appendChild(dot);
    viewPick.appendChild(svWrap);

    /* 三条滑块 */
    var sliders = document.createElement('div');
    sliders.className = 'pk-sliders';
    var hueRange = document.createElement('input');
    hueRange.type = 'range'; hueRange.className = 'pk-range pk-hue';
    hueRange.min = 0; hueRange.max = 360; hueRange.step = 1;
    var satRange = document.createElement('input');
    satRange.type = 'range'; satRange.className = 'pk-range pk-sat';
    satRange.min = 0; satRange.max = 100; satRange.step = 1;
    var ligRange = document.createElement('input');
    ligRange.type = 'range'; ligRange.className = 'pk-range pk-lig';
    ligRange.min = 0; ligRange.max = 100; ligRange.step = 1;
    sliders.appendChild(hueRange);
    sliders.appendChild(satRange);
    sliders.appendChild(ligRange);
    viewPick.appendChild(sliders);

    /* HEX + 随机 */
    var foot = document.createElement('div');
    foot.className = 'pk-foot';
    var hex = document.createElement('input');
    hex.type = 'text';
    hex.className = 'pk-hex';
    hex.maxLength = 7;
    hex.spellcheck = false;
    hex.setAttribute('aria-label', 'HEX 色值');
    var rnd = document.createElement('button');
    rnd.type = 'button';
    rnd.textContent = '随机';
    foot.appendChild(hex);
    foot.appendChild(rnd);
    viewPick.appendChild(foot);

    /* ---------- 色轮视图 ---------- */
    var viewWheel = document.createElement('div');
    viewWheel.className = 'pk-view';
    viewWheel.hidden = true;
    panel.appendChild(viewWheel);

    var wheelWrap = document.createElement('div');
    wheelWrap.className = 'pk-wheel-wrap';
    var wheel = document.createElement('canvas');
    wheel.className = 'pk-wheel';
    var ringDot = document.createElement('span');
    ringDot.className = 'pk-wheel-dot pk-ring-dot';
    ringDot.hidden = true;
    var innerDot = document.createElement('span');
    innerDot.className = 'pk-wheel-dot';
    innerDot.hidden = true;
    wheelWrap.appendChild(wheel);
    wheelWrap.appendChild(ringDot);
    wheelWrap.appendChild(innerDot);
    viewWheel.appendChild(wheelWrap);

    /* 色轮页只留一条明度滑块 */
    var wSliders = document.createElement('div');
    wSliders.className = 'pk-sliders';
    var wLig = document.createElement('input');
    wLig.type = 'range'; wLig.className = 'pk-range pk-lig';
    wLig.min = 0; wLig.max = 100; wLig.step = 1;
    wSliders.appendChild(wLig);
    viewWheel.appendChild(wSliders);

    /* 底色 */
    var baseRow = document.createElement('div');
    baseRow.className = 'pk-base';
    var baseLb = document.createElement('span');
    baseLb.className = 'lb';
    baseLb.textContent = '底色';
    var baseChip = document.createElement('span');
    baseChip.className = 'chip';
    var baseHx = document.createElement('span');
    baseHx.className = 'hx';
    var baseSync = document.createElement('button');
    baseSync.type = 'button';
    baseSync.textContent = '用当前色';
    baseRow.appendChild(baseLb);
    baseRow.appendChild(baseChip);
    baseRow.appendChild(baseHx);
    baseRow.appendChild(baseSync);
    viewWheel.appendChild(baseRow);

    /* 配色方案 */
    var harmRow = document.createElement('div');
    harmRow.className = 'pk-harmonies';
    viewWheel.appendChild(harmRow);

    /* 生成的颜色 */
    var hsw = document.createElement('div');
    hsw.className = 'pk-hsw';
    viewWheel.appendChild(hsw);

    var wheelHint = document.createElement('p');
    wheelHint.className = 'pk-hint';
    wheelHint.textContent = '外圈取色相 · 内盘调深浅 · 单击应用 · 双击复制';
    viewWheel.appendChild(wheelHint);

    /* 常用色板 */
    var sw = document.createElement('div');
    sw.className = 'pk-swatches';
    var swHead = document.createElement('div');
    swHead.className = 'pk-sw-head';
    var swTitle = document.createElement('span');
    swTitle.textContent = '常用色板';
    var swToggle = document.createElement('button');
    swToggle.type = 'button';
    swToggle.className = 'pk-toggle';
    swToggle.textContent = '收起';
    swHead.appendChild(swTitle);
    swHead.appendChild(swToggle);
    sw.appendChild(swHead);

    var groupsBox = document.createElement('div');
    groupsBox.className = 'pk-groups';
    GROUPS.forEach(function (g) {
      var wrap = document.createElement('div');
      wrap.className = 'pk-group';
      var nm = document.createElement('p');
      nm.className = 'pk-group-name';
      nm.textContent = g.name;
      wrap.appendChild(nm);
      var gg = document.createElement('div');
      gg.className = 'pk-grid';
      g.colors.forEach(function (c) {
        var b = document.createElement('button');
        b.type = 'button';
        b.className = 'pk-cell';
        b.style.background = c;
        b.title = c;
        b.setAttribute('aria-label', '颜色 ' + c);
        b.addEventListener('click', function () {
          apply(c);
          close();
        });
        gg.appendChild(b);
      });
      wrap.appendChild(gg);
      groupsBox.appendChild(wrap);
    });
    sw.appendChild(groupsBox);
    panel.appendChild(sw);

    swToggle.addEventListener('click', function () {
      var hidden = groupsBox.classList.toggle('hidden');
      swToggle.textContent = hidden ? '展开' : '收起';
    });

    /* ---------- 色轮：绘制 / 取色 ---------- */
    var WHEEL_CSS = 216;
    var ringCache = null;

    function wheelMetrics() {
      var R = WHEEL_CSS / 2 - 2;
      var ringW = R * 0.30;
      return { cx: WHEEL_CSS / 2, cy: WHEEL_CSS / 2, R: R, ringW: ringW, innerR: R - ringW };
    }

    function buildRing(dpr) {
      // 色相环与色相无关，画一次缓存起来，之后只重画内盘
      var m = wheelMetrics();
      var cv = document.createElement('canvas');
      cv.width = Math.round(WHEEL_CSS * dpr);
      cv.height = Math.round(WHEEL_CSS * dpr);
      var c = cv.getContext('2d');
      var img = c.createImageData(cv.width, cv.height);
      var d = img.data;
      var w = cv.width, h = cv.height;
      for (var y = 0; y < h; y++) {
        for (var x = 0; x < w; x++) {
          var dx = (x + 0.5) / dpr - m.cx, dy = (y + 0.5) / dpr - m.cy;
          var r = Math.sqrt(dx * dx + dy * dy);
          var i = (y * w + x) * 4;
          if (r > m.R || r < m.innerR) continue;
          var ang = Math.atan2(dy, dx);
          var hue = (ang * 180 / Math.PI + 90 + 360) % 360;
          var col = hsl2rgb(hue, 1, 0.5);
          d[i] = col.r; d[i + 1] = col.g; d[i + 2] = col.b; d[i + 3] = 255;
        }
      }
      c.putImageData(img, 0, 0);
      return cv;
    }

    function drawWheel() {
      var dpr = Math.min(window.devicePixelRatio || 1, 2);
      var m = wheelMetrics();
      wheel.style.width = WHEEL_CSS + 'px';
      wheel.style.height = WHEEL_CSS + 'px';
      wheel.width = Math.round(WHEEL_CSS * dpr);
      wheel.height = Math.round(WHEEL_CSS * dpr);
      var c = wheel.getContext('2d');
      c.setTransform(1, 0, 0, 1, 0, 0);
      c.clearRect(0, 0, wheel.width, wheel.height);

      // 内盘：中心白 → 边缘当前色相的纯色
      var pure = hsl2rgb(state.h, 1, 0.5);
      var g = c.createRadialGradient(m.cx * dpr, m.cy * dpr, 0, m.cx * dpr, m.cy * dpr, m.innerR * dpr);
      g.addColorStop(0, 'rgb(255,255,255)');
      g.addColorStop(1, 'rgb(' + pure.r + ',' + pure.g + ',' + pure.b + ')');
      c.fillStyle = g;
      c.beginPath();
      c.arc(m.cx * dpr, m.cy * dpr, m.innerR * dpr, 0, 6.2832);
      c.fill();

      // 色相环（缓存）
      if (!ringCache) ringCache = buildRing(dpr);
      c.drawImage(ringCache, 0, 0);
    }

    function updateWheelDots() {
      var m = wheelMetrics();
      var ang = (state.h - 90) * Math.PI / 180;
      // canvas 在 flex 容器里居中，指示器要补上这段偏移
      var ox = wheel.offsetLeft || 0, oy = wheel.offsetTop || 0;
      var rr = m.innerR + m.ringW / 2;
      ringDot.style.left = (ox + m.cx + Math.cos(ang) * rr) + 'px';
      ringDot.style.top = (oy + m.cy + Math.sin(ang) * rr) + 'px';
      ringDot.hidden = false;

      var ir = state.s * m.innerR;
      innerDot.style.left = (ox + m.cx + Math.cos(ang) * ir) + 'px';
      innerDot.style.top = (oy + m.cy + Math.sin(ang) * ir) + 'px';
      innerDot.hidden = state.s < 0.03;
    }

    function wheelPick(e) {
      var r = wheel.getBoundingClientRect();
      var m = wheelMetrics();
      var dx = e.clientX - r.left - m.cx, dy = e.clientY - r.top - m.cy;
      var dist = Math.sqrt(dx * dx + dy * dy);
      if (dist >= m.innerR) {
        // 外圈：取色相
        var ang = Math.atan2(dy, dx);
        state.h = (ang * 180 / Math.PI + 90 + 360) % 360;
        if (state.s < 0.45) state.s = 0.45;
      } else {
        // 内盘：取深浅（色相不变）
        state.s = Math.min(1, dist / m.innerR);
      }
      live(h2hex(state.h, state.s, state.l));
      syncSliders();
      drawWheel();
      updateWheelDots();
    }

    var wheelDragging = false;
    wheelWrap.addEventListener('pointerdown', function (e) {
      wheelDragging = true;
      wheelWrap.setPointerCapture && wheelWrap.setPointerCapture(e.pointerId);
      wheelPick(e);
      e.preventDefault();
    });
    wheelWrap.addEventListener('pointermove', function (e) {
      if (!wheelDragging) return;
      wheelPick(e);
      e.preventDefault();
    });
    ['pointerup', 'pointercancel', 'pointerleave'].forEach(function (ev) {
      wheelWrap.addEventListener(ev, function () { wheelDragging = false; });
    });

    wLig.addEventListener('input', function () {
      state.l = parseFloat(wLig.value) / 100;
      live(h2hex(state.h, state.s, state.l));
      syncSliders();
      updateWheelDots();
    });

    /* ---------- 底色 + 配色方案 ---------- */
    var baseHex = current;
    var harmKind = HARMONIES[0];

    function setBase(hx) {
      if (!hex2rgb(hx)) return;
      baseHex = String(hx).toUpperCase();
      baseChip.style.background = baseHex;
      baseHx.textContent = baseHex;
      renderHarmony();
    }

    function renderHarmony() {
      var cols = harmonyColors(baseHex, harmKind);
      hsw.innerHTML = '';
      cols.forEach(function (c) {
        var b = document.createElement('button');
        b.type = 'button';
        b.style.background = c;
        b.title = c.toUpperCase();
        b.setAttribute('aria-label', '配色 ' + c.toUpperCase());
        var s = document.createElement('span');
        s.textContent = c.slice(1).toUpperCase();
        b.appendChild(s);
        b.addEventListener('click', function () { apply(c); });
        b.addEventListener('dblclick', function (e) {
          e.stopPropagation();
          if (copyText(c.toUpperCase())) {
            b.title = '已复制 ' + c.toUpperCase();
            setTimeout(function () { b.title = c.toUpperCase(); }, 1200);
          }
        });
        hsw.appendChild(b);
      });
    }

    HARMONIES.forEach(function (k) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'pk-harm' + (k === harmKind ? ' on' : '');
      b.textContent = k.name;
      b.addEventListener('click', function () {
        harmKind = k;
        var all = harmRow.querySelectorAll('.pk-harm');
        for (var i = 0; i < all.length; i++) all[i].classList.toggle('on', all[i] === b);
        renderHarmony();
      });
      harmRow.appendChild(b);
    });

    baseSync.addEventListener('click', function () { setBase(current); });
    setBase(current);

    /* ---------- 切换 tab ---------- */
    var curTab = 'pick';
    function setTab(which) {
      curTab = which;
      var isWheel = which === 'wheel';
      viewPick.hidden = isWheel;
      viewWheel.hidden = !isWheel;
      sw.style.display = isWheel ? 'none' : '';   // 色轮页专注配色，藏起 80 色色板
      tabPick.classList.toggle('on', !isWheel);
      tabWheel.classList.toggle('on', isWheel);
      if (isWheel) {
        drawWheel();
        updateWheelDots();
      } else {
        drawSV();
      }
      place();                       // 面板高度变了，重新定位
    }
    tabPick.addEventListener('click', function () { setTab('pick'); });
    tabWheel.addEventListener('click', function () { setTab('wheel'); });

    document.body.appendChild(panel);

    /* ---------- 状态同步 ---------- */
    function syncSliders() {
      hueRange.value = Math.round(state.h);
      satRange.value = Math.round(state.s * 100);
      ligRange.value = Math.round(state.l * 100);
      if (wLig) wLig.value = Math.round(state.l * 100);
      panel.style.setProperty('--h', Math.round(state.h));
      panel.style.setProperty('--s', Math.round(state.s * 100) + '%');
      dot.style.left = (state.s * 100).toFixed(2) + '%';
      dot.style.top = ((1 - state.l) * 100).toFixed(2) + '%';
    }

    var lastHue = -1;
    function drawSV() {
      var dpr = Math.min(window.devicePixelRatio || 1, 2);
      // 用外层容器（CSS 固定高度）的尺寸，避免 canvas 自身尺寸反馈放大
      var box = svWrap.getBoundingClientRect();
      var w = Math.max(60, Math.round(box.width));
      var h = Math.max(60, Math.round(box.height));
      sv.width = Math.round(w * dpr);
      sv.height = Math.round(h * dpr);
      var c = sv.getContext('2d');
      var img = c.createImageData(sv.width, sv.height);
      var d = img.data;
      for (var y = 0; y < sv.height; y++) {
        var v = 1 - (y / (sv.height - 1));
        for (var x = 0; x < sv.width; x++) {
          var s = x / (sv.width - 1);
          var rgb = hsl2rgb(state.h, s, v);
          var i = (y * sv.width + x) * 4;
          d[i] = rgb.r; d[i + 1] = rgb.g; d[i + 2] = rgb.b; d[i + 3] = 255;
        }
      }
      c.putImageData(img, 0, 0);
      lastHue = state.h;
    }

    function paint() {
      el.style.setProperty('--pk-current', current);
      trigger.style.setProperty('--pk-current', current);
      hex.value = current;
      var cells = panel.querySelectorAll('.pk-cell');
      for (var i = 0; i < cells.length; i++) {
        var c = cells[i].getAttribute('title');
        var same = c && c.toLowerCase() === String(current).toLowerCase();
        cells[i].classList.toggle('on', !!same);
      }
      syncSliders();
      if (lastHue !== state.h) drawSV();
    }

    function apply(c, silent) {
      if (!c) return;
      var rgb = hex2rgb(c);
      if (!rgb) return;
      current = rgb2hex(rgb.r, rgb.g, rgb.b);
      var h2 = rgb2hsl(rgb.r, rgb.g, rgb.b);
      state.h = h2.h; state.s = h2.s; state.l = h2.l;
      paint();
      try { localStorage.setItem('pk_' + key, current); } catch (e) { }
      if (!silent && opts.onChange) opts.onChange(current);
    }

    /* 拖动过程中的高频更新：用 rAF 合并，避免页面重绘卡顿 */
    var pending = null, rafId = 0;
    function schedule() {
      pending = current;
      if (rafId) return;
      rafId = requestAnimationFrame(function () {
        rafId = 0;
        var v = pending;
        if (opts.onChange) opts.onChange(v);
      });
    }
    function live(c) {
      var rgb = hex2rgb(c);
      if (!rgb) return;
      current = rgb2hex(rgb.r, rgb.g, rgb.b);
      paint();
      schedule();
    }

    /* ---------- 位置：PC 贴着触发器并自动翻转，手机走底部抽屉 ---------- */
    function isSheet() { return window.innerWidth <= 600; }

    function place() {
      if (isSheet()) return;                 // 抽屉样式由 CSS 控制
      var r = trigger.getBoundingClientRect();
      var pw = panel.offsetWidth, ph = panel.offsetHeight;
      var vw = window.innerWidth, vh = window.innerHeight;
      var gap = 10, pad = 8;
      var cands;
      switch (placement) {
        case 'top': cands = [[r.left, r.top - ph - gap], [r.left, r.bottom + gap]]; break;
        case 'bottom': cands = [[r.left, r.bottom + gap], [r.left, r.top - ph - gap]]; break;
        case 'left': cands = [[r.left - pw - gap, r.top], [r.right + gap, r.top]]; break;
        default: cands = [[r.right + gap, r.top], [r.left - pw - gap, r.top]]; break;
      }
      var fallback = null, best = null;
      for (var i = 0; i < cands.length; i++) {
        var x = cands[i][0], y = cands[i][1];
        var cx = Math.min(Math.max(pad, x), Math.max(pad, vw - pw - pad));
        var cy = Math.min(Math.max(pad, y), Math.max(pad, vh - ph - pad));
        var fits = x >= pad && x + pw <= vw - pad && y >= pad && y + ph <= vh - pad;
        if (fits) { best = [cx, cy]; break; }
        if (!fallback) fallback = [cx, cy];
      }
      var pos = best || fallback || [pad, pad];
      panel.style.left = Math.round(pos[0]) + 'px';
      panel.style.top = Math.round(pos[1]) + 'px';
    }

    function open() {
      closeAll(api);
      panel.classList.add('show');
      document.body.classList.add('pk-open');
      if (openInstances.indexOf(api) < 0) openInstances.push(api);
      place();
      drawSV();
      syncSliders();
      if (curTab === 'wheel') { drawWheel(); updateWheelDots(); }
      if (opts.onOpen) opts.onOpen();
    }
    function close() {
      panel.classList.remove('show');
      if (!document.querySelector('.pk-panel.show')) document.body.classList.remove('pk-open');
      openInstances = openInstances.filter(function (x) { return x !== api; });
    }
    function togglePanel() {
      if (panel.classList.contains('show')) close(); else open();
    }

    trigger.addEventListener('click', function (e) {
      e.stopPropagation();
      togglePanel();
    });
    panel.addEventListener('click', function (e) { e.stopPropagation(); });
    closeBtn.addEventListener('click', function (e) { e.stopPropagation(); close(); });

    /* 滑块 */
    hueRange.addEventListener('input', function () {
      state.h = parseFloat(hueRange.value);
      live(h2hex(state.h, state.s, state.l));
      syncSliders();
      drawSV();
    });
    satRange.addEventListener('input', function () {
      state.s = parseFloat(satRange.value) / 100;
      live(h2hex(state.h, state.s, state.l));
      syncSliders();
    });
    ligRange.addEventListener('input', function () {
      state.l = parseFloat(ligRange.value) / 100;
      live(h2hex(state.h, state.s, state.l));
      syncSliders();
    });

    /* SV 取色 */
    var dragging = false;
    function pickFromEvent(e) {
      var r = sv.getBoundingClientRect();
      var x = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width));
      var y = Math.min(1, Math.max(0, (e.clientY - r.top) / r.height));
      state.s = x;
      state.l = 1 - y;
      live(h2hex(state.h, state.s, state.l));
      syncSliders();
    }
    svWrap.addEventListener('pointerdown', function (e) {
      dragging = true;
      svWrap.setPointerCapture && svWrap.setPointerCapture(e.pointerId);
      pickFromEvent(e);
      e.preventDefault();
    });
    svWrap.addEventListener('pointermove', function (e) {
      if (!dragging) return;
      pickFromEvent(e);
      e.preventDefault();
    });
    ['pointerup', 'pointercancel', 'pointerleave'].forEach(function (ev) {
      svWrap.addEventListener(ev, function () { dragging = false; });
    });

    /* HEX */
    hex.addEventListener('change', function () { apply(hex.value.trim()); });
    hex.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') { apply(hex.value.trim()); hex.blur(); }
    });
    rnd.addEventListener('click', function () {
      apply(ALL[Math.floor(Math.random() * ALL.length)]);
    });

    /* 关闭逻辑 */
    document.addEventListener('click', function () { close(); });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') close();
    });
    window.addEventListener('resize', function () {
      if (panel.classList.contains('show')) {
        place();
        drawSV();
        if (curTab === 'wheel') { drawWheel(); updateWheelDots(); }
      }
    }, { passive: true });
    window.addEventListener('scroll', function () { if (panel.classList.contains('show')) place(); }, { passive: true, capture: true });

    paint();
    drawSV();

    var api = {
      get: function () { return current; },
      set: function (c) { apply(c); },
      setSilent: function (c) { apply(c, true); },
      derive: derive,
      close: close,
      open: open,
      element: el,
      panel: panel
    };
    return api;
  }

  global.PaletteKit = {
    mount: mount,
    derive: derive,
    hex2rgb: hex2rgb,
    rgb2hex: rgb2hex,
    rgb2hsl: rgb2hsl,
    hsl2rgb: hsl2rgb,
    GROUPS: GROUPS,
    COLORS: ALL,
    random: function () { return ALL[Math.floor(Math.random() * ALL.length)]; },
    randomPair: function () { var s = shuffle(ALL); return [s[0], s[1]]; },
    closeAll: closeAll
  };
})(window);
