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
      file: 'html/tool-quote-copy.html',
      tag: '工具',
      name: '文案快捷复制',
      desc: '10 条接单常用话术，一键复制，手机端直接转发给客户。'
    },
    {
      file: 'html/tool-standby.html',
      tag: '工具',
      name: '待机展示',
      desc: '全屏屏保页，可自定义文字循环展示，默认显示待机时钟。'
    },
    {
      file: 'html/tool-quotes.html',
      tag: '收藏',
      name: '句子收藏',
      desc: '日常摘录的句子合集，点击任意一句即可复制，可持续补充。'
    },
    {
      file: 'html/visual-aurora.html',
      tag: '氛围',
      name: '极光',
      desc: '缓慢流动的光斑与胶片颗粒，调色板选个主色，整片极光跟着变。'
    },
    {
      file: 'html/visual-starfield.html',
      tag: '氛围',
      name: '星空漫游',
      desc: '星野朝你飞来，按住屏幕进入穿越模式，星色自由调。'
    },
    {
      file: 'html/visual-rain.html',
      tag: '氛围',
      name: '雨夜玻璃',
      desc: '窗外霓虹模糊成光斑，玻璃上雨珠下滑，敲一下会荡开。'
    },
    {
      file: 'html/visual-sky.html',
      tag: '氛围',
      name: '实时天光',
      desc: '天空颜色跟着此刻时间走，深夜到黄昏各不相同。'
    },
    {
      file: 'html/visual-snow.html',
      tag: '氛围',
      name: '雪落',
      desc: '三层视差雪花静静落下，手指划过能把雪拨开。'
    },
    {
      file: 'html/visual-wave-grid.html',
      tag: '交互',
      name: '波浪点阵',
      desc: '手指划过激起波纹的点阵水面，可切线框，点色自选。'
    },
    {
      file: 'html/visual-fractal.html',
      tag: '交互',
      name: '分形缩放',
      desc: '滚轮或双指无限放大曼德博集，细节层层展开。'
    },
    {
      file: 'html/visual-constellation.html',
      tag: '交互',
      name: '粒子引力场',
      desc: '粒子被指针吸引、自动连线成星座，点击炸开再聚拢。'
    },
    {
      file: 'html/visual-text-warp.html',
      tag: '交互',
      name: '文字形变',
      desc: '鼠标靠近，字被推开还会发亮，句子可切换。'
    },
    {
      file: 'html/visual-particle-text.html',
      tag: '交互',
      name: '粒子文字',
      desc: '一句话碎成上千颗粒子，点一下吹散，过会儿重新聚拢。'
    },
    {
      file: 'html/visual-poster.html',
      tag: '生成',
      name: '句子海报',
      desc: '把收藏的句子做成 1080×1440 海报，四种模板，主色自选。'
    },
    {
      file: 'html/visual-mandala.html',
      tag: '生成',
      name: '曼陀罗',
      desc: '画一笔自动镜像出对称花纹，可随机生成，保存 PNG。'
    },
    {
      file: 'html/visual-gradient.html',
      tag: '生成',
      name: '渐变配色',
      desc: '一点就出一组好看的渐变，HEX 与 CSS 一键复制。'
    },
    {
      file: 'html/visual-noise.html',
      tag: '生成',
      name: '噪声壁纸',
      desc: '分形噪声生成抽象纹理，每次都不一样，可存成手机壁纸。'
    },
    {
      file: 'html/visual-pixel-avatar.html',
      tag: '生成',
      name: '像素头像',
      desc: '输入名字生成对称像素头像，可下载当头像用。'
    },
    {
      file: 'html/tool-handwriting.html',
      tag: '书写',
      name: '手写板',
      desc: '纸面随手写，导出透明底 PNG，签名、留言都好用。'
    },
    {
      file: 'html/tool-paint.html',
      tag: '绘画',
      name: '画板',
      desc: '五种笔刷、橡皮、油漆桶、取色器、撤销重做。'
    },
    {
      file: 'html/tool-delta-escort.html',
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
