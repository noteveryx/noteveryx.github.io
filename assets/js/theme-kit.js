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
 *        ['emerald','midnight','sunset','violet','ink'].indexOf(t)>-1?t:'violet')
 *      }catch(e){}</script>
 *   2. 引入 theme-kit.css 与本文件。
 *   3. CSS 里按 data-theme 写变量覆盖（五套 id 见下 THEMES）。
 */
(function () {
  'use strict';

  var THEMES = [
    { id: 'emerald',  name: '翡翠绿', c1: '#42b983', c2: '#2f9e6d', meta: '#e9f2ee' },
    { id: 'midnight', name: '深海蓝', c1: '#5b9dff', c2: '#3d6fd6', meta: '#0f1626' },
    { id: 'sunset',   name: '暖阳橙', c1: '#f2762e', c2: '#e05a12', meta: '#f7ece2' },
    { id: 'violet',   name: '紫罗兰', c1: '#7c5cff', c2: '#5b3fd6', meta: '#eef1f9' },
    { id: 'ink',      name: '墨石青', c1: '#2dd4bf', c2: '#0d9488', meta: '#0e1517' }
  ];
  var KEY = 'tk_theme';

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
    // 兜底：紫罗兰
    return THEMES[3];
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
  btn.className = 'tk-btn';
  btn.type = 'button';
  btn.setAttribute('aria-label', '切换主题');
  btn.title = '切换主题';
  btn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">' +
    '<circle cx="13.5" cy="6.5" r=".9" fill="currentColor" stroke="none"/><circle cx="17.5" cy="10.5" r=".9" fill="currentColor" stroke="none"/>' +
    '<circle cx="8.5" cy="7.5" r=".9" fill="currentColor" stroke="none"/><circle cx="6.5" cy="12.5" r=".9" fill="currentColor" stroke="none"/>' +
    '<path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.9 0 1.6-.7 1.6-1.6 0-.4-.2-.8-.4-1.1-.3-.3-.4-.7-.4-1.1 0-.9.7-1.6 1.6-1.6H16c3.3 0 6-2.7 6-6 0-4.4-4.4-7.6-10-7.6z"/></svg>';

  var panel = document.createElement('div');
  panel.className = 'tk-panel';
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
  }

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
  });

  function boot() {
    document.body.appendChild(btn);
    document.body.appendChild(panel);
    apply(current(), false);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
