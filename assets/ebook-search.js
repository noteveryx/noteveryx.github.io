/*!
 * ebook-search.js — Docsify plugin for 房屋电子资源 页面
 * 用法：在 index.html 末尾追加 <script src="assets/ebook-search.js"></script>
 * 触发：路由命中 docs/电子资源 (含 id=...) 时自动初始化搜索 UI
 * 能力:
 *   - 关键词搜索: 模糊匹配 title / author / category
 *   - 分类筛选: 仅严格匹配 category 字段
 *   - 热门分类 chips: 点击自动筛选
 */
(function () {
  'use strict';

  var ALL_BOOKS = [];
  var MAX_RESULTS = 100;
  var PAGE_KEY = '电子资源';
  var SEARCH_PATH = 'assets/books.json';
  var FALLBACK_PATHS = ['../assets/books.json', './assets/books.json', '/assets/books.json'];
  var TOP_N_CATEGORIES = 30;
  var initialized = false;

  function $(id) { return document.getElementById(id); }
  function escapeHtml(s) {
    if (s === null || s === undefined) return '';
    return String(s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
  function escapeRegex(s) {
    return s ? String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&') : '';
  }
  function highlight(text, kw) {
    if (!text || !kw) return escapeHtml(text);
    try {
      var re = new RegExp('(' + escapeRegex(kw) + ')', 'gi');
      return escapeHtml(text).replace(re, '<mark>$1</mark>');
    } catch (e) { return escapeHtml(text); }
  }

  function setStatus(html, isError) {
    var el = $('ebook-search-status');
    if (!el) return;
    el.innerHTML = html;
    el.style.color = isError ? '#e74c3c' : '#909399';
  }

  function computeTopCategories(books, n) {
    var counts = {};
    for (var i = 0; i < books.length; i++) {
      var c = books[i].category;
      if (!c) continue;
      counts[c] = (counts[c] || 0) + 1;
    }
    var entries = [];
    for (var k in counts) {
      if (Object.prototype.hasOwnProperty.call(counts, k)) {
        entries.push({ name: k, count: counts[k] });
      }
    }
    entries.sort(function (a, b) { return b.count - a.count; });
    return entries.slice(0, n);
  }

  function renderCategories(books) {
    var box = $('ebook-categories');
    if (!box) return;
    var top = computeTopCategories(books, TOP_N_CATEGORIES);
    if (!top.length) { box.innerHTML = ''; return; }

    var html = '';
    for (var i = 0; i < top.length; i++) {
      var c = top[i];
      html += '<span class="ebook-cat-chip" data-cat="' + escapeHtml(c.name) + '" '
           +  'style="display:inline-block; padding:5px 12px; margin:4px 6px 4px 0; '
           +  'background:#fff; border:1px solid #dcdfe6; border-radius:16px; cursor:pointer; '
           +  'font-size:13px; color:#303133; user-select:none; transition:all .15s ease; '
           +  'box-shadow:0 1px 2px rgba(0,0,0,0.04);" '
           +  'onmouseenter="this.style.background=\'#42b983\';this.style.color=\'#fff\';this.style.borderColor=\'#42b983\';this.style.boxShadow=\'0 4px 10px rgba(66,185,131,0.25)\';" '
           +  'onmouseleave="this.style.background=\'#fff\';this.style.color=\'#303133\';this.style.borderColor=\'#dcdfe6\';this.style.boxShadow=\'0 1px 2px rgba(0,0,0,0.04)\';">'
           +    escapeHtml(c.name)
           +    ' <span style="opacity:.55; margin-left:3px;">' + c.count + '</span>'
           +  '</span>';
    }
    box.innerHTML = html;

    var chips = box.querySelectorAll('.ebook-cat-chip');
    for (var j = 0; j < chips.length; j++) {
      chips[j].addEventListener('click', function () {
        var cat = this.getAttribute('data-cat');
        var input = $('ebook-search-input');
        if (input) {
          input.value = cat;
          input.focus();
        }
        doCategoryFilter(cat);
        var r = $('ebook-search-results');
        if (r) r.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    }
  }

  function renderResultList(matched, keyword, mode) {
    var box = $('ebook-search-results');
    if (!box) return;

    if (mode === 'category') {
      setStatus('分类「<strong>' + escapeHtml(keyword) + '</strong>」 共 <strong>'
        + matched.length + '</strong>' + (matched.length >= MAX_RESULTS ? '+' : '') + ' 本');
    } else {
      setStatus('关键词「<strong>' + escapeHtml(keyword) + '</strong>」 找到 <strong>'
        + matched.length + '</strong>' + (matched.length >= MAX_RESULTS ? '+' : '') + ' 条结果');
    }

    if (!matched.length) {
      box.innerHTML = '<div style="padding:24px; text-align:center; color:#909399; background:#f8f9fa; border:1px dashed #dcdfe6; border-radius:8px;">📭 没有找到相关书籍</div>';
      return;
    }

    var k = (keyword || '').toLowerCase();
    var html = '';
    for (var m = 0; m < matched.length; m++) {
      var book = matched[m];
      var safeLink = '#';
      if (book.link) {
        try {
          var u = new URL(book.link, window.location.origin);
          if (u.protocol === 'http:' || u.protocol === 'https:') safeLink = u.href;
          else safeLink = escapeHtml(book.link);
        } catch (e) { safeLink = escapeHtml(book.link); }
      }
      var fmt = (book.formats || []).join(', ') || '—';
      html += ''
        + '<div style="padding:14px 18px; margin-bottom:10px; background:#fff; border:1px solid #ebeef5; border-left:4px solid #42b983; border-radius:6px; box-shadow:0 1px 3px rgba(0,0,0,0.04); transition:all .15s ease;" '
        +     'onmouseenter="this.style.borderLeftColor=\'#35495e\';this.style.boxShadow=\'0 4px 12px rgba(66,185,131,0.18)\';" '
        +     'onmouseleave="this.style.borderLeftColor=\'#42b983\';this.style.boxShadow=\'0 1px 3px rgba(0,0,0,0.04)\';">'
        +   '<div style="font-size:16px; font-weight:600; color:#303133; margin-bottom:6px;">'
        +     highlight(book.title || '未知', k)
        +   '</div>'
        +   '<div style="font-size:13px; color:#606266; margin-bottom:8px;">'
        +     '<span>✍️ ' + highlight(book.author || '未知', k) + '</span>'
        +     ' &nbsp;|&nbsp; '
        +     '<span>📚 ' + highlight(book.category || '—', k) + '</span>'
        +     ' &nbsp;|&nbsp; '
        +     '<span>🌐 ' + escapeHtml(book.language || '—') + '</span>'
        +     ' &nbsp;|&nbsp; '
        +     '<span>📦 ' + escapeHtml(fmt) + '</span>'
        +   '</div>'
        +   '<a href="' + safeLink + '" target="_blank" rel="noopener" '
        +      'style="display:inline-block; padding:5px 14px; background:#42b983; color:#fff; text-decoration:none; border-radius:4px; font-size:13px; font-weight:500;">'
        +     '⬇ 下载'
        +   '</a>'
        + '</div>';
    }
    box.innerHTML = html;
  }

  // 通用搜索: title / author / category 三字段模糊匹配
  function doSearch(keyword) {
    var box = $('ebook-search-results');
    if (!box) return;
    if (!keyword || !keyword.trim()) {
      box.innerHTML = '';
      setStatus('✓ 已加载 <strong>' + ALL_BOOKS.length.toLocaleString() + '</strong> 本书，输入关键词或分类筛选。');
      return;
    }
    var k = keyword.toLowerCase().trim();
    var tokens = k.split(/\s+/).filter(Boolean);
    if (!tokens.length) { box.innerHTML = ''; return; }

    var matched = [];
    for (var i = 0; i < ALL_BOOKS.length; i++) {
      var b = ALL_BOOKS[i];
      var title = (b.title || '').toLowerCase();
      var author = (b.author || '').toLowerCase();
      var category = (b.category || '').toLowerCase();
      var ok = true;
      for (var j = 0; j < tokens.length; j++) {
        var t = tokens[j];
        if (title.indexOf(t) === -1 && author.indexOf(t) === -1 && category.indexOf(t) === -1) {
          ok = false; break;
        }
      }
      if (ok) matched.push(b);
      if (matched.length >= MAX_RESULTS) break;
    }
    renderResultList(matched, keyword, 'search');
  }

  // 分类筛选: 严格只匹配 category 字段 (不做 title/author 模糊)
  function doCategoryFilter(category) {
    var box = $('ebook-search-results');
    if (!box) return;
    var cat = (category || '').trim();
    if (!cat) { setStatus('⚠ 分类不能为空', true); return; }

    var matched = [];
    for (var i = 0; i < ALL_BOOKS.length; i++) {
      var b = ALL_BOOKS[i];
      if ((b.category || '').trim() === cat) matched.push(b);
      if (matched.length >= MAX_RESULTS) break;
    }
    renderResultList(matched, cat, 'category');
  }

  function debounce(fn, ms) {
    var t = null;
    return function () {
      var args = arguments, ctx = this;
      if (t) clearTimeout(t);
      t = setTimeout(function () { fn.apply(ctx, args); }, ms);
    };
  }

  function bindInput() {
    var input = $('ebook-search-input');
    if (!input) return;
    var fresh = input.cloneNode(true);
    fresh.value = '';
    input.parentNode.replaceChild(fresh, input);
    fresh.addEventListener('input', debounce(function (e) {
      doSearch(e.target.value);
    }, 250));
  }

  function loadBooks() {
    var paths = [SEARCH_PATH].concat(FALLBACK_PATHS);
    var idx = 0;
    function tryNext() {
      if (idx >= paths.length) {
        setStatus('✗ 无法加载 books.json (已尝试: ' + paths.join(', ') + ')', true);
        return;
      }
      var url = paths[idx++];
      fetch(url).then(function (r) {
        if (r.ok) return r.json().then(function (d) {
          ALL_BOOKS = d;
          console.log('[ebook-search] loaded', ALL_BOOKS.length, 'books from', url);
          setStatus('✓ 已加载 <strong>' + ALL_BOOKS.length.toLocaleString() + '</strong> 本书，输入关键词或分类筛选。');
          renderCategories(ALL_BOOKS);
        });
        return tryNext();
      }).catch(function () { return tryNext(); });
    }
    tryNext();
  }

  function init() {
    bindInput();
    loadBooks();
    initialized = true;
  }

  function isTargetPage() {
    var hash = window.location.hash || '';
    if (hash.indexOf(PAGE_KEY) !== -1) return true;
    if (hash.indexOf(encodeURIComponent(PAGE_KEY)) !== -1) return true;
    if ($('ebook-search-input')) return true;
    return false;
  }

  var plugin = function (hook) {
    hook.doneEach(function () {
      if (isTargetPage()) init();
    });
  };

  if (window.$docsify) {
    window.$docsify.plugins = (window.$docsify.plugins || []).concat(plugin);
  } else {
    var waitDocsify = setInterval(function () {
      if (window.$docsify) {
        window.$docsify.plugins = (window.$docsify.plugins || []).concat(plugin);
        clearInterval(waitDocsify);
      }
    }, 50);
  }

  var style = document.createElement('style');
  style.id = 'ebook-search-style';
  style.textContent = '#ebook-search-results mark { background:#ffeaa7; color:#2d3436; padding:1px 3px; border-radius:2px; font-weight:600; }';
  document.head.appendChild(style);

  document.addEventListener('DOMContentLoaded', function () {
    setTimeout(function () {
      if (!initialized && isTargetPage()) init();
    }, 500);
  });
})();