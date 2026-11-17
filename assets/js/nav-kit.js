/* ==========================================================
   nav-kit.js — 返回按钮显隐（站点通用）
   ------------------------------------------------------------
   用法：在 </head> 前加一行
     <script src="../assets/js/nav-kit.js" defer></script>

   规则：
     · 从站内页面（导航页 x.html / 其它子页）跳进来 → 显示返回按钮
     · 直接打开（收藏夹 / 复制链接 / 首次访问 / 外站跳入）→ 不显示
       —— 这种场景下「返回」无处可退，浏览器后退键也就够了，
          摆一个死按钮反而误导。

   判定依据是 document.referrer 是否同源；用 html.no-back + CSS 控制显隐，
   不依赖返回按钮是静态写在 HTML 里（.tb-back / .back-btn / .back）
   还是运行时插进来的（toolbox.js 的 .tb-back、game-kit.js 的 .gk-back）。
   ========================================================== */
(function () {
  'use strict';
  var doc = document;

  function isInternal(ref) {
    if (!ref) return false;
    try {
      var u = new URL(ref, location.href);
      if (u.origin !== location.origin) return false;      // 外站跳入
      if (u.pathname === location.pathname) return false;   // 指向自己
      return true;
    } catch (e) {
      return false;
    }
  }

  var STYLE = [
    'html.no-back a.tb-back,',
    'html.no-back a.gk-back,',
    'html.no-back a.ui.back,',
    'html.no-back a.back,',
    'html.no-back a.back-btn{display:none !important;}'
  ].join('');

  function init() {
    if (!isInternal(doc.referrer)) {
      doc.documentElement.classList.add('no-back');
    }
    var st = doc.createElement('style');
    st.setAttribute('data-nav-kit', '1');
    st.textContent = STYLE;
    (doc.head || doc.documentElement).appendChild(st);
  }

  if (doc.readyState === 'loading') {
    doc.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
