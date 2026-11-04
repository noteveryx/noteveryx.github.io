/**
 * 静态页面入口插件 (docsify plugin)
 *
 * 作用: 在知识库首页 (README.md 渲染出的内容区) 插入「独立页面」卡片网格,
 *       链接到仓库根目录下那些不经过 docsify 渲染的独立 HTML 页面。
 *
 * 为什么要用绝对地址 + target="_blank":
 *   docsify 默认 hash 路由, 会把相对链接 (如 delta-escort-v2.html) 当成内部
 *   路由改写成 #/delta-escort-v2.html, 然后尝试当 markdown 抓取, 结果必然失败。
 *   带 http(s):// 协议的链接会被 isExternal 判定为外链, docsify 不拦截,
 *   浏览器直接新标签页打开真实的静态文件。
 */
(function () {
  'use strict';

  var SITE = 'https://noteveryx.github.io';

  var PAGES = [
    {
      file: 'html/game-service-quotes.html',
      tag: '工具',
      name: '文案快捷复制',
      desc: '10 条接单常用话术，一键复制，手机端直接转发给客户。'
    },
    {
      file: 'html/standby.html',
      tag: '工具',
      name: '待机展示',
      desc: '全屏屏保页，可自定义文字循环展示，默认显示待机时钟。'
    },
    {
      file: 'html/delta-escort.html',
      tag: '落地页',
      name: '行动突围护航社',
      desc: '纯绿双护护航落地页，正文以 V6 定稿，5 套主题一键切换。'
    }
  ];

  var SECTION_ID = 'static-pages-section';
  var rendered = false;

  function isHome() {
    var h = window.location.hash || '';
    return h === '' || h === '#' || h === '#/';
  }

  function build() {
    var sec = document.createElement('section');
    sec.className = 'sp-section';
    sec.id = SECTION_ID;

    var head = document.createElement('h2');
    head.className = 'sp-head';
    head.textContent = '独立页面';
    sec.appendChild(head);

    var sub = document.createElement('p');
    sub.className = 'sp-sub';
    sub.textContent = '不经过文档渲染的独立 HTML 页面，点击后在新标签页打开。';
    sec.appendChild(sub);

    var grid = document.createElement('div');
    grid.className = 'sp-grid';

    PAGES.forEach(function (p) {
      var a = document.createElement('a');
      a.className = 'sp-card';
      a.href = SITE + '/' + p.file;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';

      var tag = document.createElement('span');
      tag.className = 'sp-tag';
      tag.textContent = p.tag;

      var name = document.createElement('span');
      name.className = 'sp-name';
      name.textContent = p.name;

      var desc = document.createElement('p');
      desc.className = 'sp-desc';
      desc.textContent = p.desc;

      var arrow = document.createElement('span');
      arrow.className = 'sp-arrow';
      arrow.textContent = '打开';

      a.appendChild(tag);
      a.appendChild(name);
      a.appendChild(desc);
      a.appendChild(arrow);
      grid.appendChild(a);
    });

    sec.appendChild(grid);
    return sec;
  }

  function remove() {
    var old = document.getElementById(SECTION_ID);
    if (old && old.parentNode) old.parentNode.removeChild(old);
    rendered = false;
  }

  function render() {
    if (rendered) return;
    var host = document.querySelector('.markdown-section');
    if (!host) return;

    var sec = build();

    // 优先插在正文末尾那条分隔线之前 (即「统计」区块之后、页脚链接之前),
    // 找不到分隔线就直接追加到末尾。
    var hrs = host.querySelectorAll('hr');
    if (hrs.length) {
      var last = hrs[hrs.length - 1];
      last.parentNode.insertBefore(sec, last);
    } else {
      host.appendChild(sec);
    }
    rendered = true;
  }

  function sync() {
    if (isHome()) render();
    else remove();
  }

  var plugin = function (hook) {
    hook.doneEach(sync);
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

  // 兜底: 首屏在 docsify 完成渲染后再补一次, 避免插件注册时机晚于首次渲染
  document.addEventListener('DOMContentLoaded', function () {
    setTimeout(sync, 600);
  });
  window.addEventListener('hashchange', function () {
    setTimeout(sync, 120);
  });
})();
