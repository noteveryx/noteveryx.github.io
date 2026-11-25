/**
 * 主题切换套件 (theme-kit)
 *
 * 被 html/ 目录下的独立页面共用（game-service-quotes / standby 等）。
 * 提供：右上角圆形主题按钮 + 下拉面板 + localStorage 持久化。
 * 主题的「颜色定义」在各页面自己的 CSS 里（html[data-theme="…"] 变量覆盖），
 * 因为每个页面的变量名不同（quotes 用 --accent，standby 用 --brand…），
 * 套件只负责 UI 与状态，不掺和配色。
 *
 * 页面接入方式：
 *   1. <head> 里加一行防闪脚本（在样式表之后、正文渲染前设置 data-theme）：
 *      <script>try{var t=localStorage.getItem('tk_theme');document
 *        .documentElement.setAttribute('data-theme',
 *        ['emerald','midnight','sunset','violet','ink','crimson','stone'].indexOf(t)>-1?t:'violet')
 *      }catch(e){}</script>
 *      七个 id 是持久化契约，换名字换颜色都行，别改 id。
 *   2. 引入 theme-kit.css 与本文件。
 *   3. CSS 里按 data-theme 写变量覆盖（五套 id 见下 THEMES）。
 */
(function () {
  'use strict';

  // c1 / c2 只用来画面板里那个渐变圆点，取值与 themes.css 的
  // --accent / --accent2 一一对应；meta 是移动端地址栏色（取各套 bg1）。
  // 改色时三处一起改：本数组 + themes.css + x.html（+ tool-standby.html）。
  // 面板顺序 = 浅深交替（emerald 浅 → midnight 深 → sunset 浅 → ink 深
  // → violet 浅 → stone 深 → crimson 浅）。改动顺序时三处（themes.css、
  // x.html 面板、tool-standby.html）要一起改。
  var THEMES = [
    { id: 'emerald',  name: '青瓷绿', c1: '#1e7a4c', c2: '#3fa06a', meta: '#f4f9f5' },
    { id: 'midnight', name: '夜航蓝', c1: '#7aa2f7', c2: '#7dcfff', meta: '#0b1020' },
    { id: 'sunset',   name: '琥珀橙', c1: '#bf5b1b', c2: '#e99342', meta: '#fdf8f3' },
    { id: 'ink',      name: '墨玉青', c1: '#2aa79b', c2: '#5c8fa6', meta: '#0d1112' },
    { id: 'violet',   name: '藕荷紫', c1: '#6e56cf', c2: '#9b7ede', meta: '#f8f6fc' },
    { id: 'stone',    name: '石墨灰', c1: '#d4d4d8', c2: '#8b8b93', meta: '#131313' },
    { id: 'crimson',  name: '胭脂红', c1: '#b8324a', c2: '#e05a72', meta: '#fdf6f7' }
  ];
  var KEY = 'tk_theme';

  /* 页面有没有自己的主题变量块（html[data-theme="xxx"]{ --card: ... }）？
     有 → 按钮和面板跟随主题色；没有 → 保持深色玻璃风。

     不能只看 html 上有没有 data-theme 属性：
     theme-kit 自己切主题时也会写这个属性（无主题变量的页面也照样写），
     那样判据就恒真，等于所有页面都去读 var(--card)。
     而 text-kit.css 在 :root 里写过一套浅色 --card 兜底值，
     深色氛围屏加载它之后按钮会变成白底 —— 所以必须确认
     「页面确实按 data-theme 定义了变量块」。 */
  function hasThemeVars() {
    var sheets = document.styleSheets;
    for (var i = 0; i < sheets.length; i++) {
      var rules;
      try { rules = sheets[i].cssRules; } catch (e) { continue; }   // 跨域样式读不了，跳过
      if (!rules) continue;
      for (var j = 0; j < rules.length; j++) {
        var r = rules[j];
        if (r.selectorText && r.selectorText.indexOf('[data-theme') > -1 && r.style && r.style.length) return true;
      }
    }
    return false;
  }
  var HAS_THEME = hasThemeVars();

  function current() {
    try {
      var t = localStorage.getItem(KEY);
      for (var i = 0; i < THEMES.length; i++) if (THEMES[i].id === t) return THEMES[i];
    } catch (e) { /* 隐私模式等 */ }
    // 本地没有记录时，沿用页面防闪脚本已经写到 html[data-theme] 上的默认值。
    // 否则本套件会用自己的默认值（紫罗兰）覆盖掉页面自己的选择
    //（例如 tool-standby 的深海蓝），造成首屏闪一下，
    // 且主题面板勾选的项和屏幕实际配色对不上。
    var attr = document.documentElement.getAttribute('data-theme');
    for (var j = 0; j < THEMES.length; j++) if (THEMES[j].id === attr) return THEMES[j];
    // 兜底：藕荷紫。
    // 注意不能写成 THEMES[3] —— 面板顺序调整后下标会变，
    // 这里按 id 找，以后再调顺序也不会兜底到别的主题上。
    for (var k = 0; k < THEMES.length; k++) if (THEMES[k].id === 'violet') return THEMES[k];
    return THEMES[0];
  }

  function apply(t, persist) {
    document.documentElement.setAttribute('data-theme', t.id);
    var m = document.querySelector('meta[name="theme-color"]');
    if (m) m.setAttribute('content', t.meta);
    if (persist) { try { localStorage.setItem(KEY, t.id); } catch (e) { /* 忽略 */ } }
    syncPanel();
  }

  function syncPanel() {
    var cur = document.documentElement.getAttribute('data-theme');
    var items = panel.querySelectorAll('.tk-item');
    for (var i = 0; i < items.length; i++) {
      items[i].setAttribute('aria-checked', items[i].getAttribute('data-theme') === cur ? 'true' : 'false');
    }
  }

  /* ---------- UI ---------- */
  var btn = document.createElement('button');
  btn.className = 'tk-btn' + (HAS_THEME ? ' tk-themed' : '');
  btn.type = 'button';
  btn.setAttribute('aria-label', '切换主题');
  btn.title = '切换主题';
  btn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">' +
    '<circle cx="13.5" cy="6.5" r=".9" fill="currentColor" stroke="none"/><circle cx="17.5" cy="10.5" r=".9" fill="currentColor" stroke="none"/>' +
    '<circle cx="8.5" cy="7.5" r=".9" fill="currentColor" stroke="none"/><circle cx="6.5" cy="12.5" r=".9" fill="currentColor" stroke="none"/>' +
    '<path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.9 0 1.6-.7 1.6-1.6 0-.4-.2-.8-.4-1.1-.3-.3-.4-.7-.4-1.1 0-.9.7-1.6 1.6-1.6H16c3.3 0 6-2.7 6-6 0-4.4-4.4-7.6-10-7.6z"/></svg>';

  var panel = document.createElement('div');
  panel.className = 'tk-panel' + (HAS_THEME ? ' tk-themed' : '');
  panel.setAttribute('role', 'menu');
  var html = '';
  for (var i = 0; i < THEMES.length; i++) {
    html += '<button class="tk-item" type="button" role="menuitemradio" data-theme="' + THEMES[i].id + '">' +
      '<span class="tk-dot" style="background:linear-gradient(135deg,' + THEMES[i].c1 + ',' + THEMES[i].c2 + ')"></span>' +
      '<span>' + THEMES[i].name + '</span><span class="tk-check">✓</span></button>';
  }
  panel.innerHTML = html;

  function toggle(force) {
    var open = typeof force === 'boolean' ? force : !panel.classList.contains('open');
    panel.classList.toggle('open', open);
    btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    if (open) { placePanelSoon(); notifyPanelOpen(); }
  }

  /* ---------- 面板跟随按钮 ----------
     面板原来靠 CSS 固定（top:58 / right:12），那是在「按钮永远在屏幕右上角」的前提下。
     现在 PC 端主题钮会归位到页头右侧（dock-kit 干的），
     面板还钉在屏幕右上就和按钮分家了 —— 所以改成跟着按钮算位置：
     面板顶边 = 按钮底边 + 8，右边缘对齐按钮右边缘。
     窄屏是底部抽屉，交给 CSS，这里不动。 */
  function placePanel() {
    if (!panel.classList.contains('open')) return;
    var vw = document.documentElement.clientWidth || window.innerWidth;
    if (vw < 900) { panel.style.top = ''; panel.style.right = ''; panel.style.left = ''; return; }
    var r = btn.getBoundingClientRect();
    if (!r.width) return;
    var vh = document.documentElement.clientHeight || window.innerHeight;
    var ph = panel.offsetHeight || 320;
    var top = r.bottom + 8;
    /* 面板不能伸出屏幕底：按钮在游戏工具列（右上角）时，
       面板从按钮下方展开很容易顶到屏幕外。 */
    if (top + ph > vh - 8) top = Math.max(8, vh - ph - 8);
    panel.style.position = 'fixed';
    panel.style.left = 'auto';
    panel.style.top = Math.round(top) + 'px';
    panel.style.right = Math.max(8, Math.round(vw - r.right)) + 'px';
  }
  /* 按钮归位（dock-kit 挪进页头）或页头排版变化都会让按钮挪窝，
     打开面板那一刻算的位置到下一帧可能就偏了 —— 之后再补算一次 */
  function placePanelSoon() {
    placePanel();
    requestAnimationFrame(function () { placePanel(); });
    setTimeout(placePanel, 150);
  }
  window.addEventListener('resize', placePanel);
  /* dock-kit 把按钮挪进页头后，位置变了，面板要跟着重算 */
  window.addEventListener('kb:tools-moved', placePanel);

  /* ---------- 面板互斥 ----------
     主题面板、翻译面板、调色盘面板三个都会 stopPropagation，
     所以各自「点击外部收起」的那条 document 监听收不到别的面板的点击 ——
     翻译列表开着时点主题，翻译列表不会收起。
     这里用一个广播把「我要打开了」告诉所有面板，别的面板收到就收起自己。 */
  function notifyPanelOpen() {
    try {
      window.dispatchEvent(new CustomEvent('kb:panel-open', { detail: { id: 'theme' } }));
    } catch (e) {}
  }
  window.addEventListener('kb:panel-open', function (e) {
    var d = e && e.detail;
    if (!d || d.id === 'theme') return;
    if (panel.classList.contains('open')) toggle(false);
  });

  btn.addEventListener('click', function (e) { e.stopPropagation(); toggle(); });
  document.addEventListener('click', function (e) {
    if (panel.classList.contains('open') && !panel.contains(e.target) && e.target !== btn) toggle(false);
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') toggle(false);
  });
  panel.addEventListener('click', function (e) {
    var item = e.target.closest('.tk-item');
    if (!item) return;
    for (var i = 0; i < THEMES.length; i++) {
      if (THEMES[i].id === item.getAttribute('data-theme')) { apply(THEMES[i], true); break; }
    }
    /* 选中主题后收起面板。
       下面那条「点面板外就收起」的 document 监听收不到这里的点击 ——
       事件目标在面板内部（panel.contains 为真），所以必须自己收。
       不收的话面板会一直挂在页面上，挡住下面的内容，
       还让人以为「点主题没生效」。 */
    toggle(false);
  });

  function boot() {
    /* 页面上有静态工具槽（[data-kb-tools]）就直接挂进去：
       位置和先后由 dock-kit 的 CSS（flex + order）决定，
       浏览器首帧画出来就是终态，不用 JS 再把它搬一次。
       没有槽的页面沿用老路子：挂 body，交给 dock-kit 编排。 */
    var slot = document.querySelector('[data-kb-tools]');
    if (slot) {
      btn.setAttribute('data-kb-slot', 'theme');
      slot.appendChild(btn);
    } else {
      document.body.appendChild(btn);
    }
    /* 面板始终挂 body：它 fixed 定位、靠按钮坐标算位置，进槽里会被裁切 */
    document.body.appendChild(panel);
    apply(current(), false);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();

  /* 别的标签页改了主题（比如在导航页 x.html 切换），这边立刻跟上。
     storage 事件只在「其它标签页」触发，同标签页跳转由页面自己读 localStorage。 */
  window.addEventListener('storage', function (e) {
    if (e.key !== KEY || !e.newValue) return;
    for (var i = 0; i < THEMES.length; i++) {
      if (THEMES[i].id === e.newValue) { apply(THEMES[i], false); break; }
    }
  });
})();
