/* ==========================================================
   panel-kit —— 全局面板互斥（页面自绘浮层用）

   背景：调色盘 / 主题 / 翻译这三个 kit 的按钮都 stopPropagation，
   彼此收不到对方的点击，各自「点击外部收起」那条 document 监听也就失效了：
   翻译列表开着时点主题，翻译列表不会收起。
   三个 kit 之间用 kb:panel-open 广播互相收起，已经解决了。

   但页面自己绘制的浮层（字号面板、格线弹窗、描红弹窗、词库面板…）
   原先没接进来，于是：
     点开「文字大小与颜色」→ 再打开调色盘 → 关掉调色盘
   字号面板还杵在屏幕上，两块面板还叠在一起。

   用法：
     <script src="../assets/js/panel-kit.js"></script>
     ...
     PanelKit.claim('ptext-type', closePanel);   // 注册：别人打开时我收起自己
     PanelKit.announce('ptext-type');            // 我打开时告诉别人收起

   claim 的 id 要和 announce 的一致，且同页不同浮层用不同 id，
   这样同一页的两个浮层之间也会互斥。
   ========================================================== */
(function (global) {
  'use strict';

  var registry = [];

  /* 别的面板打开时，把不是自己的都收起来 */
  global.addEventListener('kb:panel-open', function (e) {
    var d = e && e.detail;
    if (!d || !d.id) return;
    registry.slice().forEach(function (r) {
      if (r.id === d.id) return;
      try { r.close(); } catch (err) {}
    });
  });

  global.PanelKit = {
    /* 注册自己的浮层 */
    claim: function (id, close) {
      if (!id || typeof close !== 'function') return;
      registry = registry.filter(function (r) { return r.id !== id; });
      registry.push({ id: id, close: close });
    },
    /* 广播「我要打开了」，别的面板收到就收起自己 */
    announce: function (id) {
      if (!id) return;
      try {
        global.dispatchEvent(new CustomEvent('kb:panel-open', { detail: { id: id } }));
      } catch (e) {}
    },
    /* 已注册的面板（调试用） */
    list: function () { return registry.map(function (r) { return r.id; }); }
  };
})(window);
