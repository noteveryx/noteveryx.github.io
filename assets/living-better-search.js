/*!
 * living-better-search.js — Docsify plugin for 高性价比 页面
 * 用法：在 index.html 末尾追加 <script src="assets/living-better-search.js"></script>
 * 触发：路由命中 docs/高性价比 (含 URL 编码的路径) 时自动初始化搜索 UI
 * 能力:
 *   - 关键词搜索: 模糊匹配 title / excerpt (AND, 空格分隔)
 *   - 重新计算: 每次输入重新过滤并渲染卡片
 *   - 状态行: 显示当前匹配条数
 *   - 数据源: assets/living-better.json (静态资源)
 *
 * 设计上保持与 ebook-search.js 一致的交互模式, 但 UI 更贴近 HowToLiveBetter
 * 源站的卡片网格风格, 用品牌色 #3451b2 突出章节号.
 */
(function () {
  'use strict';

  var ALL_CHAPTERS = [];
  var PAGE_KEY = '高性价比';
  var ENCODED_KEY = encodeURIComponent(PAGE_KEY);
  var DATA_PATHS = [
    'assets/living-better.json',
    '../assets/living-better.json',
    './assets/living-better.json',
    '/assets/living-better.json'
  ];
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
    } catch (e) {
      return escapeHtml(text);
    }
  }

  function setStatus(html, isError) {
    var el = $('lb-search-status');
    if (!el) return;
    el.innerHTML = html;
    el.style.color = isError ? '#e74c3c' : '#909399';
  }

  function renderChapterCard(c, kw) {
    var route = c.hashRoute || ('#/docs/' + ENCODED_KEY + '/' + c.file.replace(/\.md$/, ''));
    var safeRoute = escapeHtml(route);
    var num = c.n != null ? c.n : 0;
    var numText = num > 0 ? ('第 ' + num + ' 章') : '章节';
    var html = ''
      + '<a href="' + safeRoute + '" '
      +   'style="display:block; padding:16px 18px; margin-bottom:12px; '
      +         'background:#fff; border:1px solid #e4e7ed; border-left:4px solid #3451b2; '
      +         'border-radius:6px; text-decoration:none; color:inherit; '
      +         'box-shadow:0 1px 3px rgba(0,0,0,0.04); transition:all .15s ease;" '
      +   'onmouseenter="this.style.borderLeftColor=\'#1f3789\';this.style.boxShadow=\'0 6px 18px rgba(52,81,178,0.18)\';this.style.transform=\'translateY(-1px)\';" '
      +   'onmouseleave="this.style.borderLeftColor=\'#3451b2\';this.style.boxShadow=\'0 1px 3px rgba(0,0,0,0.04)\';this.style.transform=\'translateY(0)\';">'
      +   '<div style="display:flex; align-items:baseline; gap:10px; margin-bottom:6px;">'
      +     '<span style="display:inline-block; min-width:46px; padding:3px 8px; background:#3451b2; '
      +                  'color:#fff; border-radius:4px; font-size:12px; font-weight:600; '
      +                  'letter-spacing:0.5px; text-align:center;">' + num + '</span>'
      +     '<span style="font-size:16px; font-weight:600; color:#1f2d3d;">'
      +       highlight(c.title || '未命名章节', kw)
      +     '</span>'
      +   '</div>'
      +   '<div style="font-size:12px; color:#909399; margin-bottom:8px;">' + numText + '</div>'
      +   '<div style="font-size:13px; color:#606266; line-height:1.65;">'
      +     highlight(c.excerpt || '', kw)
      +   '</div>'
      + '</a>';
    return html;
  }

  function renderResults(matched, kw) {
    var box = $('lb-search-results');
    if (!box) return;
    if (!matched.length) {
      if (kw) {
        setStatus('关键词「<strong>' + escapeHtml(kw) + '</strong>」未匹配到章节，试试更短的关键词？', true);
      } else {
        setStatus('⏳ 加载中…');
      }
      box.innerHTML = '<div style="padding:32px 18px; text-align:center; color:#909399; '
                    + 'background:#f8f9fa; border:1px dashed #dcdfe6; border-radius:8px;">'
                    + '📭 没有匹配的章节</div>';
      return;
    }
    var k = (kw || '').toLowerCase().trim();
    var html = '';
    for (var i = 0; i < matched.length; i++) {
      html += renderChapterCard(matched[i], k);
    }
    box.innerHTML = html;
    if (kw) {
      setStatus('关键词「<strong>' + escapeHtml(kw) + '</strong>」匹配 <strong>'
              + matched.length + '</strong> 章');
    } else {
      setStatus('✓ 已加载 <strong>' + ALL_CHAPTERS.length + '</strong> 章，按章节号浏览，或在上方输入关键词筛选');
    }
  }

  function doSearch(keyword) {
    var box = $('lb-search-results');
    if (!box) return;
    var kw = (keyword || '').trim();
    if (!kw) {
      renderResults(ALL_CHAPTERS, '');
      return;
    }
    var tokens = kw.split(/\s+/).filter(Boolean);
    if (!tokens.length) {
      renderResults(ALL_CHAPTERS, '');
      return;
    }
    var matched = [];
    for (var i = 0; i < ALL_CHAPTERS.length; i++) {
      var c = ALL_CHAPTERS[i];
      var title = (c.title || '').toLowerCase();
      var excerpt = (c.excerpt || '').toLowerCase();
      var ok = true;
      for (var j = 0; j < tokens.length; j++) {
        var t = tokens[j];
        if (title.indexOf(t) === -1 && excerpt.indexOf(t) === -1) {
          ok = false; break;
        }
      }
      if (ok) matched.push(c);
    }
    renderResults(matched, kw);
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
    var input = $('lb-search-input');
    if (!input) return;
    var fresh = input.cloneNode(true);
    fresh.value = '';
    input.parentNode.replaceChild(fresh, input);
    fresh.addEventListener('input', debounce(function (e) {
      doSearch(e.target.value);
    }, 200));
  }

  function loadData() {
    var idx = 0;
    function tryNext() {
      if (idx >= DATA_PATHS.length) {
        setStatus('✗ 无法加载 living-better.json (已尝试: ' + DATA_PATHS.join(', ') + ')', true);
        renderResults([], '');
        return;
      }
      var url = DATA_PATHS[idx++];
      fetch(url).then(function (r) {
        if (r.ok) {
          return r.json().then(function (d) {
            ALL_CHAPTERS = d.chapters || d;
            console.log('[living-better] loaded', ALL_CHAPTERS.length, 'chapters from', url);
            renderResults(ALL_CHAPTERS, '');
          });
        }
        return tryNext();
      }).catch(function () { return tryNext(); });
    }
    tryNext();
  }

  function init() {
    bindInput();
    loadData();
    initialized = true;
  }

  function isTargetPage() {
    var hash = window.location.hash || '';
    if (hash.indexOf(PAGE_KEY) !== -1) return true;
    if (hash.indexOf(ENCODED_KEY) !== -1) return true;
    if ($('lb-search-input')) return true;
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
  style.id = 'living-better-search-style';
  style.textContent = ''
    + '#lb-search-results a { color:#1f2d3d !important; }'
    + '#lb-search-results a:hover { background:#f5f7ff !important; }'
    + '#lb-search-results mark { background:#ffeaa7; color:#2d3436; padding:1px 3px; border-radius:2px; font-weight:600; }';
  document.head.appendChild(style);

  document.addEventListener('DOMContentLoaded', function () {
    setTimeout(function () {
      if (!initialized && isTargetPage()) init();
    }, 500);
  });
})();
