/* ==========================================================
   toolbox.js —— 工具箱页面通用骨架
   ------------------------------------------------------------
   给「一个页面多个子工具」形态的页面用。
   页面只需要写每个子工具的 render(panel, api)，
   Tab 栏、面板切换、提示条、复制、记忆上次选中项都由这里负责。

   用法：
     <link rel="stylesheet" href="../assets/css/toolbox.css">
     <script src="../assets/js/toolbox.js" defer></script>
     <script>
       ToolBox.mount(document.getElementById('tbRoot'), {
         storageKey: 'tb_eyedropper',
         tabs: [
           { id: 'pick', name: '屏幕取色', render: function (panel, api) { ... } },
           { id: 'wcag', name: '对比度检测', render: function (panel, api) { ... } }
         ]
       });
     </script>

   同时导出若干通用小工具（DOM 工厂、文件读取、复制、下载、格式化），
   各工具页直接取用，避免每个页面重写一遍。
   ========================================================== */
(function (global) {
  'use strict';

  /* ---------------- DOM 工厂 ---------------- */
  function el(tag, attrs, html) {
    var e = document.createElement(tag);
    if (attrs) {
      for (var k in attrs) {
        if (!Object.prototype.hasOwnProperty.call(attrs, k)) continue;
        var v = attrs[k];
        if (v === null || v === undefined) continue;
        if (k === 'class') e.className = v;
        else if (k === 'text') e.textContent = v;
        else if (k === 'html') e.innerHTML = v;
        else if (k.slice(0, 2) === 'on' && typeof v === 'function') {
          e.addEventListener(k.slice(2).toLowerCase(), v);
        } else e.setAttribute(k, v);
      }
    }
    if (html !== undefined) e.innerHTML = html;
    return e;
  }

  /* ---------------- 复制到剪贴板 ---------------- */
  function copy(text) {
    text = text === null || text === undefined ? '' : String(text);
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        var p = navigator.clipboard.writeText(text);
        // 非安全上下文 / 权限被拒时 Promise 会 reject，
        // 不接 catch 会变成 unhandledrejection 污染控制台
        if (p && typeof p.catch === 'function') p.catch(function () { });
        return true;
      }
    } catch (e) { }
    // 降级：临时 textarea + execCommand
    try {
      var ta = document.createElement('textarea');
      ta.value = text;
      ta.setAttribute('readonly', '');
      ta.style.cssText = 'position:fixed;left:-9999px;top:0;opacity:0';
      document.body.appendChild(ta);
      ta.select();
      ta.setSelectionRange(0, ta.value.length);
      var ok = document.execCommand('copy');
      document.body.removeChild(ta);
      return ok;
    } catch (e2) { return false; }
  }

  /* ---------------- 提示条 ---------------- */
  var toastEl = null, toastTimer = 0;
  function toast(msg, ms) {
    if (!toastEl) {
      toastEl = el('div', { class: 'tb-toast', role: 'status', 'aria-live': 'polite' });
      document.body.appendChild(toastEl);
    }
    toastEl.textContent = msg;
    void toastEl.offsetWidth;              // 强制重排，连续调用也能触发过渡
    toastEl.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () {
      toastEl.classList.remove('show');
    }, ms || 1800);
  }

  /* ---------------- 下载 ---------------- */
  function download(blob, filename) {
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = filename || 'download';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    // 立刻 revoke 会让部分浏览器下载失败，延后释放
    setTimeout(function () { URL.revokeObjectURL(url); }, 1500);
  }

  /* ---------------- 文件读取 ---------------- */
  function readImage(file) {
    return new Promise(function (resolve, reject) {
      if (!file) return reject(new Error('没有文件'));
      if (!/^image\//.test(file.type)) return reject(new Error('不是图片文件'));
      var url = URL.createObjectURL(file);
      var img = new Image();
      img.onload = function () {
        resolve({ img: img, url: url, w: img.naturalWidth, h: img.naturalHeight, file: file });
      };
      img.onerror = function () {
        URL.revokeObjectURL(url);
        reject(new Error('图片解码失败'));
      };
      img.src = url;
    });
  }

  function readText(file) {
    return new Promise(function (resolve, reject) {
      if (!file) return reject(new Error('没有文件'));
      var fr = new FileReader();
      fr.onload = function () { resolve(String(fr.result || '')); };
      fr.onerror = function () { reject(new Error('读取失败')); };
      fr.readAsText(file, 'utf-8');
    });
  }

  function readDataURL(file) {
    return new Promise(function (resolve, reject) {
      if (!file) return reject(new Error('没有文件'));
      var fr = new FileReader();
      fr.onload = function () { resolve(String(fr.result || '')); };
      fr.onerror = function () { reject(new Error('读取失败')); };
      fr.readAsDataURL(file);
    });
  }

  /* ---------------- 格式化 ---------------- */
  function fmtBytes(n) {
    n = Number(n) || 0;
    if (n < 1024) return n + ' B';
    if (n < 1024 * 1024) return (n / 1024).toFixed(1) + ' KB';
    if (n < 1024 * 1024 * 1024) return (n / 1024 / 1024).toFixed(2) + ' MB';
    return (n / 1024 / 1024 / 1024).toFixed(2) + ' GB';
  }

  function fmtNum(n) {
    return (Number(n) || 0).toLocaleString('zh-CN');
  }

  function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }

  function debounce(fn, ms) {
    var t = 0;
    return function () {
      var self = this, args = arguments;
      clearTimeout(t);
      t = setTimeout(function () { fn.apply(self, args); }, ms || 150);
    };
  }

  function esc(s) {
    return String(s === null || s === undefined ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  /* ---------------- 骨架挂载 ---------------- */
  function mount(host, opts) {
    opts = opts || {};
    var tabs = opts.tabs || [];
    if (!host) return null;

    var wrap = el('div', { class: 'tb-wrap' });

    // 头部（返回按钮 + 标题），页面只需给 title / sub
    if (opts.title) {
      var head = el('header', { class: 'tb-head' });
      var back = el('a', {
        class: 'tb-back', href: opts.back || '../x.html',
        title: '返回', 'aria-label': '返回'
      });
      back.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" ' +
        'stroke-linecap="round" stroke-linejoin="round"><path d="M15 5l-7 7 7 7"/></svg>';
      head.appendChild(back);
      var meta = el('div');
      meta.appendChild(el('h1', { text: opts.title }));
      if (opts.sub) meta.appendChild(el('p', { class: 'tb-sub', text: opts.sub }));
      head.appendChild(meta);
      wrap.appendChild(head);
    }

    var tabBar = el('div', { class: 'tb-tabs', role: 'tablist' });
    var body = el('div', { class: 'tb-body' });
    wrap.appendChild(tabBar);
    wrap.appendChild(body);
    host.appendChild(wrap);

    var panels = {}, tabBtns = {}, currentId = null;

    var api = {
      switch: function (id) { setTab(id); },
      current: function () { return currentId; },
      panel: function (id) { return panels[id]; },
      toast: toast,
      copy: copy,
      el: el,
      toast: toast
    };

    function setTab(id, silent) {
      if (!panels[id]) return;
      if (currentId === id) return;
      for (var k in panels) {
        if (!Object.prototype.hasOwnProperty.call(panels, k)) continue;
        panels[k].classList.toggle('on', k === id);
        if (tabBtns[k]) tabBtns[k].classList.toggle('on', k === id);
        if (tabBtns[k]) tabBtns[k].setAttribute('aria-selected', k === id ? 'true' : 'false');
      }
      currentId = id;
      if (!silent && opts.storageKey) {
        try { localStorage.setItem(opts.storageKey, id); } catch (e) { }
      }
      // 面板内容高度变化时，页面滚动位置可能失效，滚回顶部更符合预期
      if (opts.scrollTop !== false) {
        try { window.scrollTo({ top: 0, behavior: 'smooth' }); } catch (e) { window.scrollTo(0, 0); }
      }
    }

    tabs.forEach(function (t) {
      var btn = el('button', {
        class: 'tb-tab', type: 'button', role: 'tab',
        'data-tab': t.id, text: t.name
      });
      btn.addEventListener('click', function () { setTab(t.id); });
      tabBar.appendChild(btn);
      tabBtns[t.id] = btn;

      var panel = el('div', { class: 'tb-panel', role: 'tabpanel', 'data-panel': t.id });
      panels[t.id] = panel;
      body.appendChild(panel);
    });

    // 渲染（放最后：此时 panels / tabBtns 已就绪）
    tabs.forEach(function (t) {
      try {
        if (typeof t.render === 'function') t.render(panels[t.id], api);
      } catch (e) {
        panels[t.id].appendChild(el('div', { class: 'tb-hint', text: '这个子工具初始化失败：' + e.message }));
        if (global.console) console.error('[ToolBox] ' + t.id, e);
      }
    });

    // 记住上次选中的 tab
    var initial = opts.initial;
    if (opts.storageKey) {
      try {
        var saved = localStorage.getItem(opts.storageKey);
        if (saved && panels[saved]) initial = saved;
      } catch (e) { }
    }
    if (!initial || !panels[initial]) initial = tabs.length ? tabs[0].id : null;
    if (initial) {
      // 先全部关掉，再开初始 tab
      for (var k in panels) panels[k].classList.remove('on');
      setTab(initial, true);
    }

    return api;
  }

  global.ToolBox = {
    mount: mount,
    toast: toast,
    copy: copy,
    download: download,
    readImage: readImage,
    readText: readText,
    readDataURL: readDataURL,
    fmtBytes: fmtBytes,
    fmtNum: fmtNum,
    clamp: clamp,
    debounce: debounce,
    esc: esc,
    el: el
  };
})(window);
