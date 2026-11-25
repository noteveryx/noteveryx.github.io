/* ==========================================================
   dock-kit.js —— 手机端工具坞（全站通用）
   ------------------------------------------------------------
   用法：在 </head> 前加一行
     <script src="../assets/js/dock-kit.js" defer></script>

   手机 / 窄屏（≤600px，或触屏 ≤920px）时，把散落各处的悬浮
   工具按钮收进一个可折叠的「工具坞」，默认收起，点 ⋮ 展开。
   坞里从上到下统一是这几样：
     返回 · 主题 · 语言 · 全屏 · 页面自己的工具条（保存/下载在里头）
   展开后按钮紧挨着开关往下排；宽的工具条作为最后一行，右边缘对齐。
   · 游戏页：右上 gk-tools 工具列原地折叠，返回键也挪进去
   · 画布页：底部 .ui.bar（圆笔/橡皮/…/保存）+ 调色盘 + 悬浮件 收进坞
   · 工具箱页：页头里的语言钮也收进坞，页头只留标题
   切回桌面宽度时自动原样还原，桌面端布局零影响。
   其他组件可主动注册悬浮节点：DockKit.add(node)
   ========================================================== */
(function () {
  'use strict';

  var doc = document, win = window;
  var COND = '(max-width:600px),(hover:none) and (pointer:coarse) and (max-width:920px)';
  var MQ = win.matchMedia ? win.matchMedia(COND) : null;
  if (!MQ) return;

  var dock = null;     /* 工具坞容器（非游戏页） */
  var itemsBox = null; /* 坞里展开的那一列 */
  var toggle = null;   /* 折叠开关 */
  var gk = null;       /* 游戏页工具列（原地折叠，不建坞） */
  var moved = [];      /* 挪过位置的节点，记录原处便于还原 */
  var backSrc = null;  /* 被坞顶替掉的原返回键 */
  var active = false;

  var BACK_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" ' +
    'stroke-linecap="round" stroke-linejoin="round"><path d="M15 5l-7 7 7 7"/></svg>';

  var STYLE = [
    /* 工具坞容器。
       右边距 18px、圆钮 44px 与导航页的悬浮目录按钮一致，
       这样全屏钮 / 工具坞 / 目录钮落在同一条竖线上。 */
    '.dk{position:fixed;z-index:46;right:calc(18px + env(safe-area-inset-right));',
    'display:flex;flex-direction:column;align-items:flex-end;gap:8px;',
    /* 限高：按钮多的时候（画布页 + 工具条）不能把坞撑到屏幕外，
       顶部的按钮会被挤出视口，点不到。限高后由 .dk-items 自己滚动。 */
    'max-height:calc(100vh - 36px - env(safe-area-inset-top) - env(safe-area-inset-bottom));',
    'max-height:calc(100dvh - 36px - env(safe-area-inset-top) - env(safe-area-inset-bottom));}',
    '.dk.dk-bottom{bottom:calc(18px + env(safe-area-inset-bottom));}',
    '.dk.dk-top{top:calc(64px + env(safe-area-inset-top));}',
    /* 折叠开关：基础样子（游戏页右上工具列里也用这个类，那边保持 38px 紧凑） */
    '.dk-toggle{width:38px;height:38px;border-radius:50%;border:1px solid rgba(255,255,255,.22);',
    'background:rgba(14,16,26,.66);-webkit-backdrop-filter:blur(10px);backdrop-filter:blur(10px);',
    'color:rgba(255,255,255,.9);font:700 16px/1 -apple-system,system-ui,sans-serif;',
    'display:flex;align-items:center;justify-content:center;cursor:pointer;',
    '-webkit-tap-highlight-color:transparent;box-shadow:0 1px 4px rgba(0,0,0,.18);',
    'transition:transform .14s ease,background-color .2s,color .2s,border-color .2s;}',
    '.dk-toggle:active{transform:scale(.92);}',
    '.dk-toggle:focus-visible{outline:2px solid rgba(255,255,255,.55);outline-offset:2px;}',
    /* 开关不许被压缩：.dk 是 flex column，开关作为直接子项默认 shrink=1，
       限高之后会被压扁成椭圆（44×38 那种），看着像变形了 */
    '.dk > .dk-toggle{flex:0 0 auto;}',
    /* 展开后的按钮列：按钮紧挨着开关往下排，整体靠右对齐。
       按钮多到一屏放不下时，这一列自己上下滑动（限高由 .dk 的 max-height 给），
       不能让最上面的按钮被顶到屏幕外。
       这里不要加 padding：加了之后按钮列的内容右边缘会比开关左移 2px，
       两者就不在同一条竖线上了（开关要圆、按钮列也要圆，必须对齐中心）。 */
    '.dk-items{display:flex;flex-direction:column;align-items:flex-end;gap:8px;animation:dkIn .18s ease;',
    'flex:0 1 auto;min-height:0;overflow-y:auto;overscroll-behavior:contain;',
    'touch-action:pan-y;-webkit-overflow-scrolling:touch;}',
    /* 不显示滚动条：按钮列是纯手势区，滚动条会像一根多余的线挂在右边缘。
       滚动能力保留（overflow-y:auto + touch-action:pan-y），只是不画条。 */
    '.dk-items{scrollbar-width:none;}',
    '.dk-items::-webkit-scrollbar{width:0;height:0;display:none;}',
    /* 子项不许被压扁：flex 默认 shrink=1，高度不够时按钮会被挤成扁片，
       高度超出就交给 .dk-items 滚动 */
    '.dk-items > *{flex:0 0 auto;}',
    '@keyframes dkIn{from{opacity:0;transform:translateY(6px) scale(.96);}to{opacity:1;transform:none;}}',
    /* 被收纳的节点统一解除各自 fixed 定位，跟随坞排列（样式本身保留）。
       用 relative 而不是 static：主题/语言的面板是绝对定位的，需要相对按钮展开。
       ⚠️ 选择器必须是 .dk .dk-item（两个类）而不是 .dk-item：
       下面「右侧悬浮件统一竖线」那条 .ui.tools{right:18px!important} 特异性相同，
       写在前面的话会赢 —— 元素就带着 right:18px / left:-18px 进坞，整列横向错开 18px。 */
    '.dk .dk-item,.gk-tools .dk-item{position:relative !important;left:auto !important;right:auto !important;',
    'top:auto !important;bottom:auto !important;transform:none !important;margin:0 !important;}',
    '.dk-collapsed .dk-items{display:none;}',
    /* 游戏页：gk-tools 原地折叠 */
    '.gk-tools.dk-collapsed > *:not(.dk-toggle){display:none;}',
    /* 游戏页的右上工具列同理：按钮多到一屏放不下时限高 + 可滚动 */
    '.gk-tools:not(.dk-collapsed){max-height:calc(100vh - 120px);max-height:calc(100dvh - 120px);',
    'overflow-y:auto;overscroll-behavior:contain;}',
    /* 坞里的返回键（统一外观，不再用各页面自己的圆形样式） */
    '.dk-back{display:flex;align-items:center;justify-content:center;',
    'text-decoration:none;cursor:pointer;-webkit-tap-highlight-color:transparent;',
    'transition:transform .14s ease,color .2s,border-color .2s,background-color .2s;}',
    '.dk-back:active{transform:scale(.92);}',
    '.dk-back svg{width:19px;height:19px;display:block;}',
    /* 主题按钮：它自带 fixed 定位（右上角），进坞后要复位 */
    '.dk .tk-btn{position:relative !important;top:auto !important;right:auto !important;}',
    /* 语言按钮：inline 模式带 margin-left:auto，进坞后居中；顺带改成圆形，和别的钮一致 */
    '.dk .tk-t{margin-left:0 !important;}',
    '.dk .tk-t-btn{padding:0;justify-content:center;gap:0;}',
    '.dk .tk-t-btn .tk-t-cur,.dk .tk-t-btn .tk-t-caret{display:none;}',
    '.dk .tk-t-btn .tk-t-ico{font-size:17px;}',
    /* 工具坞里的圆钮统一成 44px（对齐导航页的悬浮目录按钮）。 */
    '.dk .dk-toggle,.dk .dk-back,.dk .tk-btn,.dk .tk-t-btn,.dk .fsk-btn{',
    'width:44px;height:44px;border-radius:50%;}',
    /* 默认：深色玻璃（氛围屏 / 画板这类无主题页面）。
       注意不能直接用 var(--card)：text-kit.css 给 :root 写了一套浅色兜底值
       （--card:#fff），深色页面加载 text-kit 后坞钮会被染成白底白字。
       .tk-t 这一层要带上：translate-kit 是后注入的，同等优先级会被它自己的配色顶回去。 */
    '.dk .dk-toggle,.dk .dk-back,.dk .tk-btn,.dk .tk-t .tk-t-btn,.dk .fsk-btn{',
    'background:rgba(14,16,26,.66);',
    'border:1px solid rgba(255,255,255,.22);',
    'color:rgba(255,255,255,.9);',
    'box-shadow:0 1px 4px rgba(0,0,0,.18);}',
    '.dk .dk-toggle:hover,.dk .dk-back:hover,.dk .tk-btn:hover,',
    '.dk .tk-t .tk-t-btn:hover,.dk .fsk-btn:hover{',
    'background:rgba(14,16,26,.84);color:#fff;border-color:rgba(255,255,255,.42);}',
    /* 有主题的页面（html[data-theme]）才跟主题走：卡片底 + 主题描边 + 强调色悬停 */
    '.dk.dk-themed .dk-toggle,.dk.dk-themed .dk-back,.dk.dk-themed .tk-btn,',
    '.dk.dk-themed .tk-t .tk-t-btn,.dk.dk-themed .fsk-btn{',
    'background:var(--card,#fff);',
    'border-color:var(--line,rgba(0,0,0,.08));',
    'color:var(--text-2,var(--muted,#3d5049));',
    /* 主题版同样只留接触级浅影；页面可用 --dk-shadow:none 整体关掉 */
    'box-shadow:var(--dk-shadow,0 1px 4px rgba(0,0,0,.10));}',
    '.dk.dk-themed .dk-toggle:hover,.dk.dk-themed .dk-back:hover,.dk.dk-themed .tk-btn:hover,',
    '.dk.dk-themed .tk-t .tk-t-btn:hover,.dk.dk-themed .fsk-btn:hover{',
    'background:var(--card,#fff);',
    'color:var(--accent,var(--brand,#1e7a4c));',
    'border-color:var(--accent-ghost-line,rgba(0,0,0,.16));}',
    /* 画布页那几件散落在容器里的小钮（调色球 / 工具栏按钮 / 保存），
       进坞后一并拉到 44px，免得坞里忽大忽小、右边缘参差。
       .tk-t 要带上：translate-kit 是后注入的，同等优先级会被它的 40px 顶回。 */
    '.dk .tk-t .tk-t-btn,.dk .pk-trigger,.dk .tools .btn,.dk .tools .svk-btn,.dk .palette .btn{',
    'width:44px;height:44px;}',
    '.dk.dk-themed .pk-trigger{background:var(--card,#fff);border:1px solid var(--line,rgba(0,0,0,.08));}',
    /* 近期颜色是「一叠色块」不是按钮，只把外框拉成 44×44 的方格，
       里面的色块居中 —— 和旁边 44×44 的圆钮同一个尺寸、同一竖线。 */
    '.dk .recent{width:44px;min-height:44px;box-sizing:border-box;',
    'justify-content:center;align-items:center;}',
    /* 主题面板：手机上改成底部抽屉，跟语言面板一致 */
    '.dk .tk-panel{position:fixed !important;left:10px !important;right:10px !important;',
    'top:auto !important;bottom:10px !important;width:auto !important;max-width:none !important;',
    'transform:none !important;border-radius:20px !important;z-index:9998 !important;}',
    /* 语言面板：手机端本来是底部抽屉，保持不动 */
    /* 底部工具条（.ui.bar）**不进坞**：页面自己写的就是「贴底通栏 + 横向滚动」
       （left:50% + translateX(-50%) + max-width:calc(100vw - 20px) + overflow-x:auto），
       收进坞后宽度被压到坞那一列里，只能露出一截，示例/描红/撤销/保存全被挤到屏幕外，
       看着像「按钮不可用」。让它留在原位，坞改成避让它（见 place()）。 */
    /* 页面里给全屏钮让位的偏移，进坞后复位 */
    '.dk .fsk-btn,.gk-tools .fsk-btn{right:auto !important;}',
    /* 进了游戏工具列的按钮要复位成「列内的一格」：
       原来的 position:fixed 会让它脱离竖列停在屏幕角上，
       高度也会和列里其它按钮对不上。 */
    '.gk-tools .tk-btn,.gk-tools .fsk-btn{position:relative !important;',
    'left:auto !important;right:auto !important;top:auto !important;bottom:auto !important;',
    'width:44px !important;height:44px !important;}',
    /* 列里的返回键也要 44：游戏页的返回键本来是 38 宽，
       比旁边的钮窄 → 居中后左边缘差几像素，看着就是「竖列没对齐」。 */
    '.gk-tools .gk-back,.gk-tools .dk-back{width:44px !important;height:44px !important;}',
    /* ---------- 右侧悬浮件统一竖线 ----------
       全站右侧的悬浮件（竖排的那些）右边缘必须落在同一条竖线上，
       不然看着就是「按钮没对齐」。原来各家各写各的：
         全屏钮 fsk-kit     right:18px
         调色球 palette-kit right:14px
         主题钮 theme-kit  right:12px（面板也是 12px）
         游戏工具列 game-kit right:14px
         页面自带 .ui.tools/.ui.side/.ui.palette 又是 10~14px 不等
       这里统一成 18px + 安全区，跟工具坞（.dk）和悬浮目录钮一致。
       桌面端不建坞，但这条规则照样要生效，所以样式无条件注入。 */
    /* 主题面板（.tk-panel）不在这条规则里：
       它要用 theme-kit 自己的 JS 跟着按钮走（面板在按钮正下方、右缘对齐）。
       放进来会被 !important 压过 inline style，面板就和按钮分家了。 */
    '.fsk-btn,.tk-btn,.pk-float,.gk-tools,.gk-dpad,',
    /* .ui.clock 故意不放进来：天际页(visual-sky)的时钟要避开右侧圆钮，
       拉到同一条竖线会被按钮压住，由页面自己定位 */
    '.ui.tools,.ui.side,.ui.palette{',
    'right:calc(var(--kb-float-right, 18px) + env(safe-area-inset-right)) !important;}',

    /* ---------------- PC 端：全局按钮归位到页头右侧 ----------------
       原来三个全局钮各在各的位置：主题钮固定在内容区外侧的右上角、
       语言钮在页头里（toolbox 页）或浮在屏幕左侧（其它页）、
       全屏钮固定在右下角 —— 一个在天上、一个在地下，PC 下看着很乱。
       统一规则：**页面有页头时，三个钮一起进页头右侧**，
       一行、同一直线、顺序 主题 → 语言 → 全屏（和手机端坞里的顺序一致）；
       没有页头的沉浸式页（画布、游戏）保持角上悬浮。 */
    '.tb-head,.topbar-inner,header{position:relative;}',
    /* 钮组用 absolute 贴页头右缘（不占位，页头高度不受影响）。
       ⚠️ absolute 不占位 → 页头行里本来靠右的控件（游戏中心的调色盘按钮）
       不会给它让位，会被全屏钮直接盖住。
       避让由 JS 实测后写 right 处理（见 headerAvoid）。 */
    '.hd-tools{position:absolute;right:0;top:0;bottom:auto;height:44px;',
    'display:flex;align-items:center;gap:8px;z-index:6;}',
    /* 静态工具槽（.kb-tools / [data-kb-tools]）的样式在
       assets/css/tools-slot.css 里静态引入 —— 必须走 <link> 而不是这里注入：
       注入晚于各 kit 创建按钮，按钮已经按自己的 fixed 默认坐标画过一帧了。 */
    /* ---------- PC 端「没有页头」的沉浸式页面：右上角统一竖列 ----------
       主题 / 语言 / 全屏 / 调色盘 四个全局钮原本各自为政：
       主题钮浮右上、语言钮浮右上、全屏钮浮**右下**、调色盘球浮右下 ——
       四个钮散在屏幕四角，还互相压。
       现在统一成一列竖排在右上角，顺序 主题→语言→全屏→调色盘→页面自己的工具，
       和有页头的页面（同一行 主题→语言→全屏→调色盘）是同一套顺序。 */
    '.kb-col{position:fixed;right:16px;top:14px;z-index:60;',
    'display:flex;flex-direction:column;align-items:center;gap:8px;',
    'pointer-events:none;}',
    '.kb-col>*{pointer-events:auto;}',
    /* 列里的成员一律回到「列内的一格」：
       它们原来都是 fixed 各自定位，直接塞进列里会各飞各的。 */
    '.kb-col>*{position:static !important;left:auto !important;right:auto !important;',
    'top:auto !important;bottom:auto !important;}',
    /* 调色盘钮被搬走后，原来的壳（.pk）空了 → 隐藏，别留个空壳占位。
       页面自己的工具组（.ui.tools / .ui.side / .ui.palette）搬空后同理。 */
    '.pk.kb-empty,.ui.tools.kb-empty,.ui.side.kb-empty,.ui.palette.kb-empty{display:none !important;}',
    /* 进了页头的按钮取消各自的固定定位，改由页头排版。
       调色盘钮（.pk-trigger）也要带上 —— 它原来靠 .pk 壳定位，
       漏掉它的话会带着旧坐标漂在别处，正好压在内容上挡点击。 */
    '.hd-tools .tk-btn,.hd-tools .tk-t,.hd-tools .fsk-btn,.hd-tools .pk-trigger{',
    'position:static !important;left:auto !important;right:auto !important;',
    'top:auto !important;bottom:auto !important;transform:none !important;}',
    /* 页头里的返回键别被按钮压住 */
    '.hd-tools .tk-t-btn,.hd-tools .tk-btn,.hd-tools .fsk-btn{',
    'flex:0 0 auto;width:44px !important;height:44px !important;}',
    /* 进了坞 / 进了游戏工具列的浮层要复位。
       .dk-item 把它们改成了 position:relative，而 relative + right:18px
       等于「相对原位置右移 18px」——整列按钮就横向错开了。
       凡是带 .dk-item 的节点，right 一律复位。 */
    '.dk .dk-item{right:auto !important;}',
    /* 主题 / 语言面板在手机上是底部抽屉，right 保持 10px（要排在 .dk-item 之后） */
    '.dk .tk-panel{right:10px !important;}',
    /* ---------- 悬浮圆钮统一 44px ----------
       原来各 kit 各订各的尺寸：全屏 44、主题 38、调色球 38（手机 42）、
       保存/下载 38、游戏工具钮 38。同一列里大小不一，圆心自然就对不齐，
       看着就是「按钮没对齐」（右边缘齐了，但一个 44 一个 38，中心差 3px）。
       44 是全站标准：全屏钮、导航页目录钮、工具坞圆钮都是 44。
       这条要放在最后 —— dock-kit 的样式是最后注入的，压得住各 kit 自己的 38px。 */
    '.fsk-btn,.tk-btn,.pk-trigger,.svk-btn,.gk-btn,.gk-tools .dk-toggle{',
    'width:44px;height:44px;}',
    /* 页面自己写的圆形工具钮（如 visual-snow 的 burstBtn）也是 38px。
       只限工具组里的直接子元素 —— tool-standby 的 .tool-btn 是文字按钮，
       不能一刀切改尺寸。
       用 !important：有些页面把尺寸写在 HTML 内联 style 上（如 visual-constellation
       的 burstBtn），内联 style 优先级高于普通规则，不加 important 压不住。 */
    '.ui.tools > .tool-btn,.ui.side > .tool-btn{width:44px !important;height:44px !important;}',
    /* 拆进坞的按钮：原来的选择器是「.ui.xxx > .btn」，拆开后它不再是容器的子元素，
       那条规则就失效了，按钮会掉回页面自己写的 38px。坞内统一再钉一次 44。
       只钉图标型（.dk-ico / .btn）；文字按钮（待机页的「全屏 / 编辑」）不能压。 */
    '.dk .dk-ico,.dk .btn{width:44px !important;height:44px !important;}',
    '.ui.tools > .tool-btn svg,.ui.side > .tool-btn svg{width:21px;height:21px;}',
    /* 页面自己写的 .btn（暂停 / 速度 / 类型…）也是 38px，一并拉齐。
       只限工具组里的直接子元素，别去动页面正文里的 .btn。 */
    '.ui.tools > .btn,.ui.side > .btn,.ui.palette > .btn{width:44px !important;height:44px !important;}',
    /* 语言钮（translate-kit 的圆形模式）：要作用在**按钮**上，不能作用在容器上。
       .tk-t-round 是容器（包着按钮和面板），把它固定成 44px 会让 38px 的按钮
       在容器里不居中；translate-kit 的样式又是后注入的，
       同等优先级会顶回 38px，所以必须用 !important。 */
    '.tk-t-round .tk-t-btn{width:44px !important;height:44px !important;}',
    /* float 模式（沉浸式画布页左侧悬浮的圆钮）原本是 40px，一并拉到 44 */
    '.tk-t-float .tk-t-btn{width:44px !important;height:44px !important;}',
    /* 调色球放大后，中心色块的比例要跟着收（原来 38px 钮里 inset:8px） */
    '.pk-trigger i{inset:10px;}',
    /* 游戏按钮的图标随按钮放大 */
    '.gk-btn svg{width:18px;height:18px;}',
    /* 游戏页返回键挪进工具列后要解除固定定位 */
    '.gk-tools .gk-back{position:static !important;left:auto !important;top:auto !important;}',
    /* 统一竖列（.kb-col）里的按钮也要 44：
       它们搬出 .ui.tools / .ui.side 后，「.ui.xxx > .btn」那条尺寸规则
       就不再匹配了（不是容器的子元素了）→ 会掉回页面自己写的 38px。
       ⚠️ 只钉图标型（.dk-ico / .btn / .tool-btn）——
          画板的「近期颜色」条（.recent，多个色块叠起来）不能压成 44 方块。 */
    '.kb-col>.dk-ico,.kb-col>.btn,.kb-col>.tool-btn{width:44px !important;height:44px !important;}',
    /* 主题钮会被包进 .dk-theme（按钮 + 面板），成了列里的「孙元素」，
       `.kb-col>*` 那条只治直接子元素 —— 漏掉它的话主题钮还停在
       fixed 的右上角，正好压在语言钮上（语言钮就点不动了）。
       所以这里对四个全局钮都用后代选择器再解一次定位。 */
    '.kb-col .tk-btn,.kb-col .tk-t,.kb-col .fsk-btn,.kb-col .pk-trigger{',
    'position:static !important;left:auto !important;right:auto !important;',
    'top:auto !important;bottom:auto !important;transform:none !important;}',
    '.kb-col>.dk-theme{width:44px;height:44px;display:flex;align-items:center;justify-content:center;}',
    '.kb-col .tk-t-btn{width:44px !important;height:44px !important;}',
    '.kb-col .pk-trigger{width:44px !important;height:44px !important;}',
    '.kb-col .fsk-btn{width:44px !important;height:44px !important;}',
    '.kb-col .tk-btn{width:44px !important;height:44px !important;}',
  ].join('');

  function injectStyle() {
    if (doc.querySelector('style[data-dock-kit]')) return;
    var st = doc.createElement('style');
    st.setAttribute('data-dock-kit', '1');
    st.textContent = STYLE;
    (doc.head || doc.documentElement).appendChild(st);
  }

  function isFixed(el) {
    if (!el || el.nodeType !== 1) return false;
    try { return getComputedStyle(el).position === 'fixed'; } catch (e) { return false; }
  }

  /* ---------------- 记忆与还原 ---------------- */
  function remember(node) {
    if (!node.__dk) {
      node.__dk = { parent: node.parentNode, next: node.nextSibling };
      moved.push(node);
    }
    node.classList.add('dk-item');
  }

  function teardown() {
    var i;
    if (mo) { mo.disconnect(); mo = null; }
    for (i = moved.length - 1; i >= 0; i--) {
      var n = moved[i];
      var rec = n.__dk;
      if (n.__dkRestore) {
        /* 自己知道怎么还原的（克隆的返回键、主题包装层） */
        try { n.__dkRestore(); } catch (e) { }
        n.__dk = null; n.__dkRestore = null;
        continue;
      }
      try {
        if (rec.next && rec.next.parentNode === rec.parent) rec.parent.insertBefore(n, rec.next);
        else rec.parent.appendChild(n);
      } catch (e) { }
      n.classList.remove('dk-item');
      n.__dk = null;
    }
    moved = [];
    if (gk) gk.classList.remove('dk-collapsed');
    if (dock && dock.parentNode) dock.parentNode.removeChild(dock);
    if (toggle && toggle.parentNode) toggle.parentNode.removeChild(toggle);
    dock = null; toggle = null; gk = null; itemsBox = null;
    if (backSrc) { backSrc.style.display = ''; backSrc = null; }
    active = false;
  }

  /* ---------------- 开合 ---------------- */
  function host() { return gk || dock; }
  function isCollapsed() {
    var h = host();
    return !h || h.classList.contains('dk-collapsed');
  }
  function setCollapsed(on) {
    var h = host();
    if (h) h.classList.toggle('dk-collapsed', on);
    if (toggle) {
      toggle.textContent = on ? '⋮' : '✕';
      toggle.setAttribute('aria-label', on ? '展开工具栏' : '收起工具栏');
      toggle.setAttribute('aria-expanded', on ? 'false' : 'true');
      toggle.title = on ? '展开工具栏' : '收起工具栏';
    }
    /* 展开后坞变高了，重新算一次避让（工具条这时才显形） */
    if (dock) { place(); schedulePlace(); }
  }

  /* 展开动画期间 .dk-items 上有 transform，会把 fixed 子元素的包含块改成它自己，
     这时量出来的位置是错的 —— 等动画结束再算一次 */
  var placeTimer = null;
  function schedulePlace(delay) {
    if (placeTimer) clearTimeout(placeTimer);
    placeTimer = setTimeout(function () { placeTimer = null; place(); }, delay || 280);
  }

  /* ---------------- 页面布局变了要重算 ----------------
     坞的避让是「算一次、写死在下边」的，可页面自己的固定 UI 会随时变：
     句子条展开/收起、面板开合、工具条显隐……
     页面变了而坞没重算，就会出现「句子条都收起了，坞还顶在屏幕中间」——
     坞只会往上躲，不会自己下来。
     所以盯着 DOM 变化，变了就重算一次（坞自己改 style/class 不算）。 */
  var mo = null;
  var resizeBound = false;
  function watchLayout() {
    if (mo || !win.MutationObserver || !doc.body) return;
    mo = new win.MutationObserver(function (recs) {
      for (var i = 0; i < recs.length; i++) {
        var t = recs[i].target;
        if (t === dock) continue;                 /* 坞自己改 style / class */
        if (dock && dock.contains(t)) continue;   /* 坞内部的变化 */
        schedulePlace(120);
        scheduleFloat(200);
        /* ⚠️ 这里千万不能直接调 alignGlobalTools()：
           它内部要 querySelector + getBoundingClientRect（强制重排），
           而这个观察器盯的是整个 body 的 class/style ——
           有动画或状态切换的页面几乎每帧都会触发，
           等于每帧做两三次强制同步布局，主线程被占满，
           页面卡到按钮都点不动。
           改成防抖：一轮变更只排一次，且跑的时候只跑一次。 */
        scheduleAlignGlobal(150);
        return;
      }
    });
    mo.observe(doc.body, {
      childList: true, subtree: true, attributes: true,
      attributeFilter: ['class', 'style', 'hidden']
    });
  }

  function makeToggle() {
    toggle = doc.createElement('button');
    toggle.type = 'button';
    toggle.className = 'dk-toggle';
    toggle.setAttribute('aria-haspopup', 'true');
    toggle.setAttribute('aria-expanded', 'false');
    toggle.textContent = '⋮';
    toggle.addEventListener('click', function (e) {
      e.preventDefault();
      e.stopPropagation();
      /* 展开时把页面从闲置淡出状态唤醒，否则工具条是半透明的 */
      if (doc.body) doc.body.classList.remove('idle');
      setCollapsed(!isCollapsed());
    });
  }

  /* ---------------- 位置避让：坞若压到页面其他 fixed UI，逐级平移 ---------------- */
  function overlapsFixed(el) {
    var b = el.getBoundingClientRect();
    var els = doc.body.querySelectorAll('*');
    for (var i = 0; i < els.length; i++) {
      var x = els[i];
      if (x === el) continue;               /* 自己不算 */
      /* 坞内部的节点也不算：主题面板 / 语言面板收进坞后仍是 position:fixed
         （CSS 里给它们改成了底部抽屉），不排除的话坞会一直判定「和自己重叠」，
         每轮上移 52px，最后停在屏幕正中间 —— 工具条跟着飘到半空。 */
      if (dock && dock.contains(x)) continue;
      if (gk && gk.contains(x)) continue;
      if (x === toggle || x === itemsBox) continue;  /* 坞自己的开关与列（静态定位，本来也跳过） */
      var cs;
      try { cs = getComputedStyle(x); } catch (e) { continue; }
      if (cs.position !== 'fixed' && cs.position !== 'sticky') continue;
      if (cs.display === 'none' || cs.visibility === 'hidden') continue;
      if (parseFloat(cs.opacity) < 0.05) continue;
      var q = x.getBoundingClientRect();
      if (q.width < 1 || q.height < 1) continue;
      /* 铺满全屏的背景层不算 UI */
      if (q.width >= win.innerWidth * 0.9 && q.height >= win.innerHeight * 0.9) continue;
      if (b.right > q.left && b.left < q.right && b.bottom > q.top && b.top < q.bottom) return true;
    }
    return false;
  }
  /* 有主题的页面才让坞钮跟主题走。theme-kit 是 defer 的，
     首帧可能还没有 data-theme，所以下面的补扫循环里会再校一次。 */
  function syncThemed() {
    if (!dock) return;
    dock.classList.toggle('dk-themed', doc.documentElement.hasAttribute('data-theme'));
  }

  /* 坞被顶上去之后，屏幕留给它的高度就只剩这么多了 —— 必须限高，
     否则按钮多的时候坞会撑出屏幕，最上面的按钮够不着。
     限高后按钮列（.dk-items）自己滚动，滑到底能看全所有按钮。
     60 = 底部安全区(约 34) + 顶部留白 */
  function applyLimit(off) {
    var avail = win.innerHeight - off - 60;
    dock.style.maxHeight = Math.max(150, avail) + 'px';
  }

  function place() {
    if (!dock) return;
    dock.style.bottom = '';
    dock.style.top = '';
    dock.style.maxHeight = '';
    var isTop = dock.classList.contains('dk-top');
    var off = 18;
    applyLimit(off);
    for (var i = 0; i < 6; i++) {
      if (!overlapsFixed(dock)) break;
      /* 18 = 贴边距，52 = 44px 钮高 + 8px 间距 */
      off = 18 + (i + 1) * 52;
      if (isTop) dock.style.top = 'calc(' + off + 'px + env(safe-area-inset-top))';
      else dock.style.bottom = 'calc(' + off + 'px + env(safe-area-inset-bottom))';
      applyLimit(off);
    }
  }

  /* ---------------- 建坞 ---------------- */
  function buildDock(list) {
    /* 返回键放最上面：统一克隆一个，页面上原来那个窄屏隐藏 */
    var back = makeBack();
    if (back) { back.__dkRank = 0; list.unshift(back); }

    dock = doc.createElement('div');
    dock.className = 'dk';
    /* 坞固定在右下角：手机端拇指最容易够到，也不会和页面自己的右上角工具打架。
       原先按「第一个被收纳工具的原位置」判上/下，工具挂在页头时坞就跑到右上角，
       看起来像「程序坞位置不对」。 */
    dock.classList.add('dk-bottom');
    /* 只有真的有主题系统（html[data-theme]）的页面才让坞钮跟主题变色，
       否则按深色玻璃处理 —— 有些页面（如 text-kit）会给 :root 塞浅色兜底变量 */
    syncThemed();
    /* 沉浸式画布页：跟随页面的闲置淡出节奏（.ui 基类只含 fixed/z-index/透明度过渡） */
    if (!doc.body.classList.contains('gk-page') && doc.querySelector('.ui')) dock.classList.add('ui');

    var box = doc.createElement('div');
    box.className = 'dk-items';
    itemsBox = box;
    makeToggle();
    dock.appendChild(toggle);
    for (var i = 0; i < list.length; i++) {
      remember(list[i]);
      box.appendChild(list[i]);
    }
    dock.appendChild(box);
    (doc.body || doc.documentElement).appendChild(dock);
    sortItems();
    setCollapsed(true);
    place();
  }

  /* ---------------- 返回键 ----------------
     全站有 5 种写法（a.ui.back / a.gk-back / a.back-btn / a.back / a.tb-back），
     有的 fixed 悬浮、有的在页头文档流里。统一克隆一个进坞，
     页面上原来那个在窄屏隐藏，避免出现两个「返回」。 */
  function findBack() {
    return doc.querySelector('a.gk-back, a.ui.back, a.back-btn, a.back, a.tb-back');
  }
  /* nav-kit 的规矩：直接打开（referrer 不同源）时不显示返回键，
     坞里的返回键也得跟着 —— 否则直接进页面也会冒出个退不掉的返回。 */
  function noBack() {
    return doc.documentElement.classList.contains('no-back');
  }
  function makeBack() {
    if (backSrc || noBack()) return null;
    var src = findBack();
    if (!src) return null;
    var a = doc.createElement('a');
    a.className = 'dk-item dk-back';
    a.href = src.getAttribute('href') || '../x.html';
    a.title = '返回';
    a.setAttribute('aria-label', '返回');
    a.innerHTML = BACK_SVG;
    backSrc = src;
    src.style.display = 'none';
    a.__dkRestore = function () {
      if (a.parentNode) a.parentNode.removeChild(a);
    };
    return a;
  }
  /* 把坞里的返回键撤掉，原键放回原处 */
  function dropBack() {
    if (!dock) return;
    var bk = dock.querySelector('.dk-back');
    if (bk && bk.__dkRestore) { try { bk.__dkRestore(); } catch (e) { } }
    if (backSrc) { backSrc.style.display = ''; backSrc = null; }
  }

  /* ---------------- 主题按钮 ----------------
     主题按钮(.tk-btn)和它的面板(.tk-panel)是两个独立的 fixed 节点，
     不带着面板一起走的话，收进坞后面板会跑到屏幕右上角对不上按钮。 */
  function themeWrap(tbtn) {
    if (tbtn.__dkThemeWrap) return tbtn.__dkThemeWrap;
    var panel = doc.querySelector('.tk-panel');
    var wrap = doc.createElement('div');
    wrap.className = 'dk-theme';
    var btnParent = tbtn.parentNode, btnNext = tbtn.nextSibling;
    var panelParent = panel ? panel.parentNode : null, panelNext = panel ? panel.nextSibling : null;
    btnParent.insertBefore(wrap, tbtn);
    wrap.appendChild(tbtn);
    if (panel) wrap.appendChild(panel);
    wrap.__dkRestore = function () {
      try {
        if (btnNext && btnNext.parentNode === btnParent) btnParent.insertBefore(tbtn, btnNext);
        else btnParent.appendChild(tbtn);
        if (panel && panelParent) {
          if (panelNext && panelNext.parentNode === panelParent) panelParent.insertBefore(panel, panelNext);
          else panelParent.appendChild(panel);
        }
      } catch (e) { }
      if (wrap.parentNode) wrap.parentNode.removeChild(wrap);
    };
    tbtn.__dkThemeWrap = wrap;
    return wrap;
  }

  /* ---------------- 收集：哪些节点该进坞 ----------------
     顺序 = 坞里从上到下：返回 → 主题 → 语言 → 全屏 → 页面工具条(含保存/下载)
     rank 决定坞里的先后；异步补进来的节点按 rank 插回正确位置，
     免得宽条（工具条）插在竖排按钮中间，把一列割断。
     返回键不在这里克隆，等真的要建坞时再克隆（免得收集阶段就把原键藏了）。 */
  function inDock(n) { return !!(dock && dock.contains(n)); }
  function rank(node, r) { node.__dkRank = r; return node; }

  /* 容器里的「控件单元」：直接子元素（带触发器的壳 .pk 整壳算一个）。
     尺寸过小的（分隔线、装饰）跳过。
     图标型按钮打上 .dk-ico：它离开原容器后，「.ui.xxx > .btn」那类
     尺寸规则就失效了，靠这个类把尺寸钉回 44。
     文字按钮（中文标签）不打标 —— 压成 44×44 方块会把文字挤没。 */
  function splitUnits(box) {
    var out = [];
    var kids = box.children;
    for (var i = 0; i < kids.length; i++) {
      var k = kids[i];
      if (!k || k.nodeType !== 1) continue;
      if (k.classList.contains('dk-item')) continue;
      var r = k.getBoundingClientRect();
      if (r.width < 4 || r.height < 4) continue;
      /* ⚠️ 已经有这个类就别再写：classList.add 每次都会写 DOM 属性，
         写属性会触发 MutationObserver → 观察器回调再进来 → 死循环。 */
      if (isIconBtn(k) && !k.classList.contains('dk-ico')) k.classList.add('dk-ico');
      out.push(k);
    }
    return out;
  }
  /* 图标钮 = 内含 svg，或没有文字，或只有一两个符号；
     带中文标签的（待机页的「全屏 / 编辑」）算文字按钮，不动它的尺寸。 */
  function isIconBtn(el) {
    if (el.querySelector('svg')) return true;
    var t = (el.textContent || '').trim();
    if (!t) return true;
    if (/[\u4e00-\u9fff]/.test(t)) return false;
    return t.length <= 3;
  }

  function collect() {
    var list = [];

    if (gk) {
      /* 游戏页：工具列原地折叠；返回键也挪进去，左上角空出来 */
      var fs = doc.getElementById('fsKitBtn');
      if (fs && fs.parentNode !== gk) { remember(fs); gk.appendChild(fs); }
      var gb = doc.querySelector('a.gk-back');
      if (gb && gb.parentNode !== gk) { remember(gb); gk.appendChild(gb); }
      if (!toggle) {
        makeToggle();
        gk.insertBefore(toggle, gk.firstChild);
      }
      setCollapsed(true);
      return list;
    }

    /* PC 端不收任何东西：
       全局钮（主题/语言/全屏/调色盘）由 alignGlobalTools 编排，
       页面自己的工具组（视觉页的调色盘、形态钮）要一直留在页面上。
       收进坞只发生在窄屏。 */
    if (win.innerWidth >= 900) return list;

    /* ② 主题（连面板一起）③ 语言 ④ 全屏 —— 只在窄屏收。
       PC 端这几个由 alignGlobalTools 统一编排（页头横排 / 右上竖列），
       ⚠️ 两边都收会来回搬：坞每 300ms 收一次，布局器再搬一次，
          最后落在谁手里全看时序 —— 这正是「按钮位置乱」的根源。 */
    if (win.innerWidth < 900) {
      var tbtn = doc.querySelector('.tk-btn');
      if (tbtn && !inDock(tbtn)) list.push(rank(themeWrap(tbtn), 1));
      /* 语言（float 悬浮钮、inline 页头钮都收） */
      var tk = doc.querySelector('.tk-t');
      if (tk && !inDock(tk)) list.push(rank(tk, 2));
      /* 全屏：fs-kit 注入的圆钮，或页面自带的文字按钮
         （tool-standby 的 #btnFull —— 它自己实现了全屏，fs-kit 检测到 btnFull 就不会再注入） */
      var fs2 = doc.getElementById('fsKitBtn') || doc.getElementById('btnFull');
      if (fs2 && !inDock(fs2)) list.push(rank(fs2, 3));
    }
    /* ⑤ 底部工具条（.ui.bar）**故意不收**：它本身就是「贴底通栏 + 横向滚动」，
       收进坞后被压成坞里的一行，示例/描红/撤销/保存会被挤到屏幕外，
       用户点不到就以为「按钮坏了」。留在原位，坞避让它即可。 */
    /* ⑥ 散落在右上角 / 右侧的小工具：
       .ui.tools（视觉页的调色盘组）、.ui.side（画板右侧的近期颜色 + 调色盘）、
       .ui.palette（曼陀罗的调色盘）—— 都属于「一堆小按钮」，收进坞最整齐。
       ⚠️ 容器里往往不止一个控件（画板页是「近期颜色 + 调色球」两个）。
       整个容器当一件收进坞，两个控件会叠成 44×86：高度和旁边 44×44 的圆钮不一致，
       左边缘还会外凸 —— 竖列就歪了（用户反馈：按钮没排在同一竖线上）。
       所以这里拆开收：一个控件一个格子，竖列才对得齐。 */
    var tools = doc.querySelector('.ui.tools, .ui.side, .ui.palette');
    if (tools && isFixed(tools) && !inDock(tools)) {
      var units = splitUnits(tools);
      /* 静态工具槽里已经装了主题 / 语言 / 全屏钮（方案 2）：这几个 ②③④ 已经收过了，
         这里必须跳过，不然同一节点被收两次，rank 会被 5.x 覆盖 → 顺序错、还可能重复。 */
      units = units.filter(function (n) { return list.indexOf(n) === -1; });
      if (units.length > 1) {
        for (var ti = 0; ti < units.length; ti++) {
          var u = units[ti];
          /* 调色盘不论在容器里排第几，一律落到坞的最下面 ——
             桌面端是「主题 → 语言 → 全屏 → 调色盘」，窄屏跟着一致；
             而且最后一格正好是拇指最容易够到的位置。
             （极光/星野这类页面把 .pk 写在 .ui.tools 的第一位，
               不特判的话窄屏顺序和桌面端正好相反。） */
          var isPk = u.classList.contains('pk') || !!u.querySelector('.pk-trigger');
          list.push(rank(u, isPk ? 6 : 5 + (ti + 1) * 0.1));
        }
      } else if (units.length === 1) {
        var only = units[0];
        list.push(rank(tools, (only.classList.contains('pk') || only.querySelector('.pk-trigger')) ? 6 : 5));
      }
      /* units.length === 0：容器已经被搬空了（按钮早一步进了坞）。
         这时**不能**把空容器当一件收进去 —— 坞里会多出一个 0×0 的格子，
         多占 8px 间距，看着就是「按钮之间莫名其妙空了一格」。 */
    }
    /* ⑥b 只装一个调色盘的 .ui.panel（手写板就是这种结构）。
       容器已经被搬空时不能再收：坞里会多一个 0×0 的格子（8px 空格）。 */
    if (!tools) {
      var upanel = doc.querySelector('.ui.panel');
      if (upanel && isFixed(upanel) && !inDock(upanel) &&
          splitUnits(upanel).filter(function (n) { return list.indexOf(n) === -1; }).length) {
        list.push(rank(upanel, 5));
      }
    }
    /* ⑦ 生成器页的 pk-float 调色球 */
    if (!tools) {
      var pkf = doc.querySelector('.pk.pk-float');
      if (pkf && isFixed(pkf) && !inDock(pkf)) list.push(rank(pkf, 5));
    }
    /* ⑦b 裸 .pk 壳（游戏中心等把调色球直接放在页头/角落）：
       整壳收进坞，和主题/语言/全屏排同一列。
       .pk 只是 relative + inline-flex 的壳，调色面板本身挂在 body 上
       （palette-kit 里 panel 是 body.appendChild），所以搬壳不会把面板带走。
       rank 6 = 排在页面工具组之后、和桌面端「主题→语言→全屏→调色盘」一致。 */
    if (!tools) {
      var pkShell = doc.querySelector('.pk');
      if (pkShell && !pkShell.classList.contains('pk-float') && !inDock(pkShell) &&
          pkShell.querySelector('.pk-trigger')) {
        list.push(rank(pkShell, 6));
      }
    }
    /* ⑧ 裸 .tools（待机页顶部那条「全屏 / 编辑」文字工具条）**不收**：
       它是文字按钮，压成 44×44 方块会把字挤没；
       而且它是页头的一部分，留在原位才说得通。
       真正的浮动工具组都是 .ui.tools / .ui.side / .ui.palette，⑥ 已经收了。 */

    /* 去重：容器和它里面的子项可能在同一轮被分别收进来
       （手写板：⑥b 整收 .ui.panel，⑦b 又单独收了里面的调色球 .pk），
       一起搬会把子项从容器里拽出来，坞里多一格 0×0 的空位。
       子项的祖先已经在列表里 → 丢掉子项，让它跟着容器走。 */
    for (var di = list.length - 1; di >= 0; di--) {
      var anc = list[di].parentNode;
      while (anc && anc !== doc.body && anc !== doc.documentElement) {
        if (list.indexOf(anc) !== -1) { list.splice(di, 1); break; }
        anc = anc.parentNode;
      }
    }
    return list;
  }

  /* 按 rank 把节点插进坞里的那一列（rank 小的在前） */
  function insertByRank(node) {
    var box = itemsBox || (dock && dock.querySelector('.dk-items'));
    if (!box) return;
    var r = node.__dkRank || 9;
    var ref = null;
    var kids = box.children;
    for (var i = 0; i < kids.length; i++) {
      if ((kids[i].__dkRank || 9) > r) { ref = kids[i]; break; }
    }
    box.insertBefore(node, ref);
  }

  /* 按 rank 把整列重排一次。
     为什么要单独排：坞里的先后原来只取决于「谁先被收进来」——
     语言钮由 translate-kit 主动注册（DockKit.add，最先到），
     主题钮 / 全屏钮 / 页面工具组要等 collect() 下一轮才补，
     于是顺序变成「语言 → 返回 → 主题 → 全屏」，和约定的
     「返回 → 主题 → 语言 → 全屏 → 调色盘」正好错位。
     insertByRank 只能保证新来的插对位置，管不了已经错位的老项，
     所以建坞之后 / 每轮补收之后整体再排一遍（稳定排序，rank 相同保持原顺序）。 */
  function sortItems() {
    var box = itemsBox || (dock && dock.querySelector('.dk-items'));
    if (!box) return;
    var kids = Array.prototype.slice.call(box.children);
    var rk = function (n) { return n.__dkRank == null ? 9 : n.__dkRank; };
    var want = kids.slice().sort(function (a, b) { return rk(a) - rk(b); });
    var dirty = false;
    for (var i = 0; i < want.length; i++) if (want[i] !== kids[i]) { dirty = true; break; }
    if (!dirty) return;
    /* 逐个归位：insertBefore 搬动已有节点不会丢监听，比重新 append 安全 */
    for (var j = 0; j < want.length; j++) {
      if (box.children[j] !== want[j]) box.insertBefore(want[j], box.children[j] || null);
    }
  }

  /* ---------------- 悬浮件贴内容右缘 ----------------
     PC 宽屏下，页面内容常常是居中的一窄栏（工具箱页 .tb-wrap 1080、
     句子收藏 .wrap 760），而主题钮 / 全屏钮按「视口右边缘」定位 ——
     悬在屏幕最右上角，离内容区空出好几百像素，看着就是「自己单独飘在右上角」。
     这里量出内容区的右边缘，把右侧悬浮件挪到内容旁边（间距 12px）；
     内容占满整屏的画布页 / 待机页不受影响（右侧空隙不够就不动）。 */
  function contentRight() {
    var vw = win.innerWidth;
    var best = 0;
    /* 取「排除满宽壳之后最外层内容容器的右边缘」。
       - 排除宽度 ≥ 视口宽 90% 的元素：#tbRoot、body 内的满宽装饰、
         沉浸式画布页的 canvas 都属于这一类，它们会把右边缘拉到屏幕边上，
         排除后画布页自然保持「悬浮件在屏幕右上角」。
       - 取最大 r（最外层容器）而不是众数：句子收藏是左右两栏，
         众数会落在内层卡片列上，按钮就跑到两栏中间的缝里去了。 */
    var walk = function (el, depth) {
      if (depth > 5) return;
      var kids = el.children;
      for (var i = 0; i < kids.length; i++) {
        var c = kids[i], s = getComputedStyle(c);
        if (s.position === 'fixed' || s.position === 'absolute' || s.display === 'none') continue;
        var r = c.getBoundingClientRect();
        /* 只有「不计入」不能「不递归」：
           #tbRoot 这类满宽壳要被排除，但它里面的 .tb-wrap 才是真正的内容容器 ——
           一旦连递归一起跳过，内容永远找不到（工具箱页的主题钮就贴不上去）。 */
        if (r.width >= vw * 0.15 && r.width < vw * 0.9 && r.height >= 8 &&
            r.right > 0 && r.left >= -1) {
          if (r.right > best) best = Math.round(r.right);
        }
        if (c.children.length) walk(c, depth + 1);
      }
    };
    walk(doc.body, 0);
    return best;
  }
  function alignFloat() {
    var vw = win.innerWidth;
    var gap = 18;
    if (vw >= 900) {
      var r = contentRight();
      /* 算出来的间距比默认值还小 → 内容本来就快占满整屏，
         留在屏幕边上更自然（画布页就是这种情况）。 */
      if (r) {
        var right = Math.round(vw - (r + 12 + 44));
        if (right > gap) gap = right;
      }
    }
    var v = gap + 'px';
    /* 值没变就别写 —— 写 documentElement 的 style 会触发 MutationObserver，
       不去重就会「改 → 观察 → 改」无限循环 */
    if (v === lastFloat) { alignLangFloat(); return; }
    lastFloat = v;
    doc.documentElement.style.setProperty('--kb-float-right', v);
    alignLangFloat();
  }

  /* 沉浸式页（画布 / 待机 / 游戏）没有页头，语言钮原本浮在**屏幕左侧中部**，
     主题钮却在右上角 —— 一个在左一个在右，各站一边。
     统一成：语言钮排到主题钮**左边**，两个圆钮在右上角成一对，
     和有页头的页面（同一行 主题→语言）保持一致的观感。 */
  var lastLang = '';
  function alignLangFloat() {
    var lang = doc.querySelector('.tk-t-float');
    if (!lang) { lastLang = ''; return; }
    var theme = doc.querySelector('.tk-btn');
    var vw = win.innerWidth;
    var val = '';
    if (theme && vw >= 900) {
      var tr = theme.getBoundingClientRect();
      var cs = getComputedStyle(theme);
      /* 主题钮已经归位进页头（static）→ 语言钮也会被一起搬进页头，不用管 */
      if (tr.width && cs.position === 'fixed') {
        val = 'auto|' + Math.max(8, Math.round(vw - (tr.left - 8))) + 'px|' + Math.round(tr.top) + 'px';
      }
    }
    /* 去重：写 inline style 会触发 MutationObserver，不去重就成死循环 */
    if (val === lastLang) return;
    lastLang = val;
    if (!val) {
      lang.style.left = ''; lang.style.right = ''; lang.style.top = '';
      return;
    }
    var p = val.split('|');
    lang.style.left = p[0];
    lang.style.right = p[1];
    lang.style.top = p[2];
  }
  var lastFloat = '';
  var floatTimer = null;
  function scheduleFloat(delay) {
    if (floatTimer) clearTimeout(floatTimer);
    floatTimer = setTimeout(function () { floatTimer = null; alignFloat(); }, delay || 150);
  }

  /* ---------------- PC 端：全局按钮归位到页头右侧 ---------------- */
  var hdMoved = [];

  /* 游戏页：把主题钮、全屏钮并进右上角那列工具，
     顺序 返回 → 主题 → 语言 → 全屏，统一排在「游戏自己的控件」
     （调色球 / 暂停 / 重开）之前。

     ⚠️ 这里不能用「第一个非折叠钮」当插入锚点：
     一插进去锚点自己就变了（返回键插到前面后它成了第一个，
     主题又被插到它前面，返回键又被插回去……）——
     两边来回搬同一个元素，MutationObserver 一直触发，页面直接卡死。
     正确做法：**先算出目标序列，再找「序列之外」的元素当锚点**，
     锚点一旦定死就不随插入变化。 */
  function alignGameTools(gk) {
    var th = doc.querySelector('.tk-btn');
    var lang = gk.querySelector('.tk-t');
    var fs = doc.querySelector('.fsk-btn');
    var back = gk.querySelector('.dk-back, .gk-back');
    var pk = doc.querySelector('.pk-trigger');
    if (!th && !fs) return;
    /* 目标序列（按 rank：返回 0 → 主题 1 → 语言 2 → 全屏 3 → 调色盘 4） */
    var seq = [];
    if (back) seq.push(back);
    if (th) seq.push(th);
    if (lang) seq.push(lang);
    if (fs) seq.push(fs);
    if (pk) seq.push(pk);
    if (!seq.length) return;
    var kids = Array.prototype.slice.call(gk.children);
    /* 锚点 = 第一个「不在序列里」的、且不是折叠钮的元素 */
    var anchor = null;
    for (var i = 0; i < kids.length; i++) {
      var k = kids[i];
      if (k.classList.contains('dk-toggle')) continue;
      if (seq.indexOf(k) === -1) { anchor = k; break; }
    }
    /* 现状是否已经正确：序列按下标严格递增，且全部排在锚点之前 */
    var ok = true, last = -1;
    for (var j = 0; j < seq.length; j++) {
      var at = kids.indexOf(seq[j]);
      if (at < 0 || at < last) { ok = false; break; }
      last = at;
    }
    if (ok && anchor) {
      var ai = kids.indexOf(anchor);
      if (last >= ai) ok = false;
    }
    if (ok) return;
    /* 重排：按 seq 顺序逐个插到锚点之前。
       kbHome 记录原位 —— 窄屏时这些按钮要回坞，恢复要放回原来的坑。 */
    for (var m = 0; m < seq.length; m++) {
      kbHome(seq[m]);
      gk.insertBefore(seq[m], anchor || null);
    }
    pkHideEmpty();
    try { win.dispatchEvent(new CustomEvent('kb:tools-moved')); } catch (e) {}
  }
  function pickHead() {
    /* 游戏页右上角有自己的工具列（.gk-tools），别去动它 */
    if (doc.querySelector('.gk-tools')) return null;
    return doc.querySelector('.tb-head, .topbar-inner, header');
  }
  /* 页头里那层「横向排布的行」：
     钮组跟它对齐，也只有这一行里靠右的控件需要避让。
     页头根自己是 flex → 就是它；页头根是 block、里面另有 flex 行
     （句子收藏页的 header > .brand）→ 找那一行。 */
  function pickRow(head) {
    if (getComputedStyle(head).display.indexOf('flex') !== -1) return head;
    var kids = head.children;
    for (var i = 0; i < kids.length; i++) {
      var k = kids[i];
      if (k.classList.contains('hd-tools')) continue;
      if (getComputedStyle(k).display.indexOf('flex') !== -1) return k;
    }
    return null;
  }
  /* 钮组是 absolute，不占位 → 页头行里靠右的控件（游戏中心的调色盘按钮）
     不会给它让位，会被全屏钮直接盖住。
     这里量出「最贴行右缘的那个控件」，把钮组挪到它左边。
     ⚠️ 用实测坐标算，不推盒模型（各页的 padding / border 不一样）。
     ⚠️ 只避让右对齐的控件：标题块那种撑不到右缘的不算，
        否则整组按钮会被推到页面中间。 */
  var lastAvoid = '';
  function headerAvoid(box, head, row) {
    var val = '0px';
    if (row) {
      var rc = getComputedStyle(row);
      var rr = row.getBoundingClientRect();
      var contentRight = rr.right - (parseFloat(rc.paddingRight) || 0);
      var minLeft = Infinity;
      var kids = row.children;
      for (var i = 0; i < kids.length; i++) {
        var e = kids[i];
        if (e === box || box.contains(e)) continue;
        var r = e.getBoundingClientRect();
        if (r.width < 4 || r.height < 4) continue;
        var s = getComputedStyle(e);
        if (s.position === 'absolute' || s.position === 'fixed') continue;
        /* 只避让「真正的控件」：
           标题块（.htitle 之类）会 flex:1 撑满，右缘正好贴着行右缘，
           把它当成右对齐控件 → 钮组被推到页面中间去。 */
        if (!e.matches('button,a,[role=button],.pk,.pk-trigger') &&
            !e.querySelector('button,.pk-trigger')) continue;
        if (contentRight - r.right > 8) continue;   /* 没贴右缘，不算 */
        if (r.left < minLeft) minLeft = r.left;
      }
      if (minLeft !== Infinity) {
        var cs = getComputedStyle(head);
        var hr = head.getBoundingClientRect();
        /* absolute 的包含块是页头的 padding box */
        var padBoxRight = hr.right - (parseFloat(cs.borderRightWidth) || 0) - (parseFloat(cs.paddingRight) || 0);
        val = Math.max(0, Math.round(padBoxRight - (minLeft - 8))) + 'px';
      }
    }
    /* 值没变就别写 —— 写 style 会触发 MutationObserver，不去重就成死循环 */
    if (val === lastAvoid) return;
    lastAvoid = val;
    box.style.right = val;
  }
  /* 垂直方向：钮组的中心要跟页头内容行对齐。
     .hd-tools 原本是 top:0;bottom:0（占满整个 header），
     而 header 的 padding-bottom 会把「整个 header 的中心」压得比内容行低小半格
     —— 返回键 38 高、圆钮 44 高，两个中心不在一条线上，看着就是没对齐。
     ⚠️ 要按「那一行」算，不是按整个 header：
       有些页面的 header 里有多块内容（标题行 + 副标题 + 联系块），
       按整个 header 算中心会落到中间那块上。 */
  var lastFit = '';
  function headerFit(box, head, row) {
    var hr = head.getBoundingClientRect();
    var cs = getComputedStyle(head);
    var bt = parseFloat(cs.borderTopWidth) || 0;
    var bb = parseFloat(cs.borderBottomWidth) || 0;
    var pt = parseFloat(cs.paddingTop) || 0;
    var pb = parseFloat(cs.paddingBottom) || 0;
    var mid;
    if (row && row !== head) {
      var rr = row.getBoundingClientRect();
      mid = rr.top + rr.height / 2;
    } else {
      /* 页头本身就是那一行 → 用内容区（去掉 padding / border）算中心，
         否则 header 的 padding-bottom 会把中心拉低小半格。 */
      mid = (hr.top + bt + pt + hr.bottom - bb - pb) / 2;
    }
    /* absolute 的 top 相对页头的 padding box 顶缘 */
    var val = Math.round(mid - 22) - Math.round(hr.top + bt);
    if (val === lastFit) return;
    lastFit = val;
    box.style.top = val + 'px';
  }
  /* ---------------- 全局按钮的统一编排 ----------------
     全站只有四个「全局钮」：主题 / 语言 / 全屏 / 调色盘。
     它们的落点全站只有三种，顺序永远一样：
       ① 游戏页的右上竖列（.gk-tools）
       ② 有页头页面的页头横排（.hd-tools）
       ③ 没有页头的沉浸式页面 → 右上竖列（.kb-col，本模块建）
     ⚠️ 以前 collect()（收进坞）和 alignHeaderTools()（搬回页头）
        两边都在抢同一批按钮：坞每 300ms 收一次，布局器再搬一次，
        位置来回跳，最后落在谁手里全看时序 —— 按钮位置乱的根源就在这。
        现在 PC 端只由 alignGlobalTools() 编排，collect 不再收这四个。 */

  /* 搬动记录：窄屏（按钮要回坞）时按原位放回去 */
  function kbHome(el) {
    if (!el.__kbHome) el.__kbHome = { parent: el.parentNode, next: el.nextSibling };
    return el.__kbHome;
  }
  function moveIn(el, box) {
    if (!el || el.parentNode === box) return;
    kbHome(el);
    box.appendChild(el);
  }
  function moveOut(el) {
    var h = el && el.__kbHome;
    if (!h || !h.parent) return;
    if (el.parentNode) el.parentNode.removeChild(el);
    if (h.next && h.next.parentNode === h.parent) h.parent.insertBefore(el, h.next);
    else h.parent.appendChild(el);
    if (h.parent.classList && h.parent.classList.contains('kb-empty')) h.parent.classList.remove('kb-empty');
    try { delete el.__kbHome; } catch (e) { el.__kbHome = null; }
  }
  /* 调色盘钮被搬走后，原来的壳（.pk）空了 → 隐藏，别留个空壳占位 */
  function pkHideEmpty() {
    var p = doc.querySelector('.pk-trigger');
    if (!p || !p.__kbHome) return;
    var par = p.__kbHome.parent;
    if (!par || !par.classList) return;
    var vis = false;
    for (var i = 0; i < par.children.length; i++) {
      var c = par.children[i];
      if (c === p) continue;
      var r = c.getBoundingClientRect();
      if (r.width > 4 && r.height > 4) { vis = true; break; }
    }
    /* ⚠️ 只有状态真的变了才改 class：
       classList.toggle 每次都会写 DOM 属性（哪怕值没变），
       而写属性会触发 MutationObserver → 观察器回调再进来 → 死循环。 */
    var empty = !vis;
    if (empty !== par.classList.contains('kb-empty')) par.classList.toggle('kb-empty', empty);
  }
  /* 四个全局钮（固定顺序） */
  function globalSeq() {
    var seq = [];
    var t = doc.querySelector('.tk-btn');
    if (t) seq.push(themeWrap(t));
    var l = doc.querySelector('.tk-t');
    if (l) seq.push(l);
    var f = doc.getElementById('fsKitBtn') || doc.querySelector('.fsk-btn');
    if (f) seq.push(f);
    var p = doc.querySelector('.pk-trigger');
    if (p) seq.push(p);
    return seq;
  }
  /* 把成员按顺序塞进容器。
     ⚠️ 顺序没变就别动 DOM —— appendChild 会触发 MutationObserver，
        观察器回调再进来就成死循环了。 */
  function fillSeq(box, seq) {
    var kids = box.children;
    var same = kids.length === seq.length;
    if (same) {
      for (var i = 0; i < seq.length; i++) if (kids[i] !== seq[i]) { same = false; break; }
    }
    if (!same) {
      for (var j = 0; j < seq.length; j++) box.appendChild(seq[j]);
    }
  }
  /* ③ 没有页头的沉浸式页面：右上角一条竖列 */
  function alignFloatCol(force) {
    var col = doc.querySelector('.kb-col');
    if (!col) {
      col = doc.createElement('div');
      col.className = 'kb-col';
      (doc.body || doc.documentElement).appendChild(col);
      alignSig = '';
    }
    var seq = globalSeq();
    /* 页面自己的工具组（视觉页的 .ui.tools、画板的 .ui.side、
       曼陀罗的 .ui.palette）也并进这一列 ——
       否则页面上会有两条并排的竖列，上下两个钮对不齐
       （用户反馈：右侧上下两个按钮不在一条竖线上）。 */
    var tools = doc.querySelector('.ui.tools, .ui.side, .ui.palette');
    if (tools) {
      var units = splitUnits(tools);
      for (var i = 0; i < units.length; i++) {
        if (units[i].classList.contains('pk-trigger')) continue;
        seq.push(units[i]);
      }
      /* 搬空后把容器隐藏，别留一个空壳在那儿占位 */
      if (!tools.classList.contains('kb-empty')) tools.classList.add('kb-empty');
    }
    /* 结果没变就别再量、再写（强制重排是这里最贵的一步） */
    var sig = toolsSig(col, seq, 0);
    if (!force && sig === alignSig) return;
    alignSig = sig;
    for (var j = 0; j < seq.length; j++) moveIn(seq[j], col);
    fillSeq(col, seq);
    pkHideEmpty();
  }
  function restoreCol() {
    var col = doc.querySelector('.kb-col');
    if (!col) return;
    var kids = Array.prototype.slice.call(col.children);
    for (var i = 0; i < kids.length; i++) moveOut(kids[i]);
    if (col.parentNode) col.parentNode.removeChild(col);
    /* 页面自己的工具组要重新显示出来（窄屏时它们会被收进坞） */
    var tools = doc.querySelector('.ui.tools, .ui.side, .ui.palette');
    if (tools && tools.classList.contains('kb-empty')) tools.classList.remove('kb-empty');
  }
  /* ---------------- 编排入口 ----------------
     三种落点只走一条路：游戏竖列 / 页头横排 / 右上竖列。
     ⚠️ 这个函数很贵（多次 querySelector + 强制重排），
        所以对外只暴露防抖版 scheduleAlignGlobal()：
        DOM 观察器、resize、异步补算一律走它，
        同一轮变更里最多真正跑一次。 */
  var alignTimer = null;
  var aligning = false;
  function scheduleAlignGlobal(delay) {
    if (alignTimer) return;
    alignTimer = setTimeout(function () {
      alignTimer = null;
      alignGlobalTools();
    }, delay || 120);
  }
  /* 编排「结果没变就别重复干活」：
     位置写一次就够，反复量 + 反复写只会让浏览器不停重排。
     签名 = 容器 + 四个钮各自的父节点 + 视口宽 + 页头宽；全一样就直接跳过。 */
  var alignSig = '', alignAt = 0;
  function toolsSig(box, nodes, extra) {
    var s = (box ? (box.className || '') : '-') + ':' + win.innerWidth + ':' + (extra || 0);
    for (var i = 0; i < nodes.length; i++) {
      s += '|' + (nodes[i] ? (nodes[i].parentNode === box ? '1' : '0') : '-');
    }
    return s;
  }
  var lastWide = null;   /* 上一次编排时是不是宽屏布局 */
  /* 静态工具槽：页面 HTML 里带了 [data-kb-tools]。
     这时四个全局钮由各自的 kit 直接挂进容器，位置和先后全由 CSS 决定，
     浏览器首帧画出来就是终态 —— 编排层只要「别去动它」。 */
  function toolsSlot() {
    return doc.querySelector('[data-kb-tools]');
  }
  function alignGlobalTools(force) {
    if (aligning) return;          /* 防重入：跑的过程中又被叫进来，直接丢掉 */
    aligning = true;
    try {
      var gk = doc.querySelector('.gk-tools');
      if (gk) {
        /* 游戏页的工具列如果已经是静态槽（game-kit 打的 data-kb-tools），
           全局钮由各 kit 直接挂进去了 → 这里不能再搬，否则又是加载后跳动。 */
        if (!gk.hasAttribute('data-kb-tools')) alignGameTools(gk);
        lastWide = true;
        return;
      }
      if (win.innerWidth < 900) {
        /* 窄屏：按钮要收进坞。
           ⚠️ 只有刚从宽屏切过来时才需要「放回原位」——
              按钮在页头/竖列里，不放回去 collect 收不进坞；
              而已经在坞里的按钮放回去反而会被拽出来（每次编排都拽一次会抖）。
              静态槽页不用放：按钮一直待在自己的槽里，坞直接过来收即可。 */
        if (lastWide && !toolsSlot()) { restoreHeaderTools(); restoreCol(); }
        lastWide = false;
        return;
      }
      lastWide = true;
      /* 有静态槽：桌面端什么都不用做（按钮已经在槽里、顺序由 order 定）。
         这里绝不能再去建 .hd-tools / .kb-col，否则又把按钮搬一次 → 又是跳动。 */
      if (toolsSlot()) { restoreHeaderTools(); restoreCol(); return; }
      var head = pickHead();
      if (head) { restoreCol(); alignHeaderTools(force); return; }
      restoreHeaderTools();
      alignFloatCol(force);
    } finally {
      aligning = false;
    }
  }
  function alignHeaderTools(force) {
    /* 落点已经由 alignGlobalTools 决定，这里只管「往页头横排里塞」。
       ⚠️ 不要在这里再判断游戏页 / 窄屏 —— 那是编排层的职责，
          两处各判一次就会出现「有的页面走这条、有的走那条」的分裂。 */
    var head = pickHead();
    if (!head) return;
    var theme = doc.querySelector('.tk-btn');
    var lang = doc.querySelector('.tk-t');
    var full = doc.getElementById('fsKitBtn') || doc.querySelector('.fsk-btn');
    var pk = doc.querySelector('.pk-trigger');
    /* 顺序必须是 主题 → 语言 → 全屏 → 调色盘 */
    var want = [theme, lang, full, pk].filter(function (x) { return !!x; });
    if (!want.length) return;
    var box = head.querySelector('.hd-tools');
    if (!box) {
      box = doc.createElement('div');
      box.className = 'hd-tools';
      head.appendChild(box);
      /* 新建的容器没有 inline style，去重记录要清掉，
         否则下面的「值没变就不写」会跳过第一次定位 */
      lastAvoid = ''; lastFit = ''; alignSig = '';
    }
    /* 结果没变就别再量、再写 —— 强制重排是这里最贵的一步 */
    var sig = toolsSig(box, want, head.offsetWidth + ',' + head.offsetHeight);
    if (!force && sig === alignSig) return;
    alignSig = sig;
    /* 先确保成员都在容器里，再按 want 顺序排。
       ⚠️ 顺序没变就别动 DOM —— 动了会触发 MutationObserver，
          观察器再回调进来就成死循环了。 */
    for (var j = 0; j < want.length; j++) moveIn(want[j], box);
    var kids = box.children;
    var same = kids.length === want.length;
    if (same) {
      for (var i = 0; i < want.length; i++) if (kids[i] !== want[i]) { same = false; break; }
    }
    if (!same) {
      for (var k = 0; k < want.length; k++) box.appendChild(want[k]);
      /* 按钮挪了位置，主题面板得跟着重算 */
      try { win.dispatchEvent(new CustomEvent('kb:tools-moved')); } catch (e) {}
    }
    pkHideEmpty();
    /* 给行里靠右的控件让位，并跟那一行对齐 */
    var row = pickRow(head);
    headerAvoid(box, head, row);
    headerFit(box, head, row);
  }
  function restoreHeaderTools() {
    /* 页头横排里的成员放回原位（窄屏时它们要回坞） */
    var box = doc.querySelector('.hd-tools');
    if (box) {
      var kids = Array.prototype.slice.call(box.children);
      for (var i = 0; i < kids.length; i++) moveOut(kids[i]);
      if (box.parentNode) box.parentNode.removeChild(box);
    }
    if (hdMoved.length) {
      for (var j = 0; j < hdMoved.length; j++) {
        var el = hdMoved[j];
        el.removeAttribute('data-hd-moved');
        if (el.parentNode) el.parentNode.removeChild(el);
        (doc.body || doc.documentElement).appendChild(el);
      }
      hdMoved = [];
    }
    /* 窄屏要把语言钮的手工定位也清掉，交回 CSS 的默认位置 */
    alignLangFloat();
    try { win.dispatchEvent(new CustomEvent('kb:tools-moved')); } catch (e) {}
  }

  /* ---------------- 启动 ---------------- */
  function setup() {
    if (active) return;
    active = true;
    injectStyle();

    /* 游戏页：gk-tools 本身就是右上竖排工具列，原地折叠即可 */
    gk = doc.querySelector('.gk-tools');
    if (gk) {
      collect();
    } else {
      var list = collect();
      /* 有返回键也算一件：几乎每个页面都该有坞 */
      if (list.length + (findBack() ? 1 : 0) >= 1) buildDock(list);
    }

    /* 窗口尺寸变了（旋转屏幕、地址栏收放）要重算限高与避让 */
    if (!resizeBound) {
      resizeBound = true;
      win.addEventListener('resize', function () {
        alignFloat();
        alignGlobalTools(true);   /* 尺寸变了，签名里的视口宽也会变，强制重算一遍 */
        if (dock) { place(); schedulePlace(80); }
      }, { passive: true });
    }

    /* 悬浮件贴内容右缘：先按当前布局算一次，
       再等页面 JS 渲染完（工具箱页是 JS 生成的）补算一次 */
    alignFloat();
    setTimeout(alignFloat, 400);

    /* 页面布局一变就重算坞的避让位置 */
    watchLayout();

    /* 全局按钮统一编排（页头横排 / 右上竖列）——
       必须在建坞之后：坞里收着的按钮要先搬回该在的位置。 */
    alignGlobalTools();
    scheduleAlignGlobal(400);

    /* 点坞外自动收起（点坞内按钮不收起，方便连着用） */
    doc.addEventListener('click', function (e) {
      var h = host();
      if (!h || !toggle) return;
      if (isCollapsed()) return;
      if (h.contains(e.target)) return;
      setCollapsed(true);
    });
    doc.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && !isCollapsed()) setCollapsed(true);
    });

    /* 有些节点是别的脚本异步生成的（主题按钮、工具箱页头、语言钮、
       页面工具条），首帧可能还没出来 → 后面再扫几次补进坞 */
    var tries = 0;
    var timer = setInterval(function () {
      tries++;
      /* 已经回到宽屏（或 setup 已被 teardown 撤销）就别再补收了。
         不拦的话：teardown 拆掉坞之后，这里又因为「有返回键」把坞建回来，
         宽屏右下角会残留一个孤零零的折叠钮（点开只有一个返回键）。 */
      if (!MQ.matches || !active) { clearInterval(timer); return; }
      syncThemed();
      if (gk) {
        var gb = doc.querySelector('a.gk-back');
        if (gb && gb.parentNode !== gk) { remember(gb); gk.appendChild(gb); }
      } else {
        var add = collect();
        if (!dock) {
          if (add.length + (findBack() ? 1 : 0) >= 1) buildDock(add);
        } else {
          if (add.length) {
            for (var i = 0; i < add.length; i++) {
              remember(add[i]);
              insertByRank(add[i]);
            }
            sortItems();
            place();
          }
          /* 返回键跟着 nav-kit 的判断走 */
          var bk = dock.querySelector('.dk-back');
          if (noBack()) { if (bk) dropBack(); }
          else if (!bk) {
            var nb = makeBack();
            if (nb) {
              remember(nb);
              dock.querySelector('.dk-items').insertBefore(nb, dock.querySelector('.dk-items').firstChild);
            }
          }
        }
      }
      /* 主题钮、语言钮、调色盘钮可能是别的脚本异步生成的
         （theme-kit / translate-kit / palette-kit 都在 defer 里初始化），
         首帧可能还没出来 → 补几次编排 */
      if (win.innerWidth >= 900) scheduleAlignGlobal(0);
      if (tries >= 8) clearInterval(timer);
    }, 300);
  }

  /* ---------------- 供其他组件注册（如 translate-kit 的语言钮） ---------------- */
  win.DockKit = {
    add: function (node) {
      if (!active || !node || !node.parentNode) return;
      if (gk) return; /* 游戏页：翻译按钮已在 gk-tools 里，随列折叠 */
      if (!node.__dkRank) node.__dkRank = 2;   /* 注册的一般是语言钮 */
      if (dock) {
        if (node.parentNode !== dock && !dock.contains(node)) {
          remember(node);
          insertByRank(node);
          sortItems();
          place();
        }
        return;
      }
      /* 还没有坞：直接建，把这个节点收进去（返回键会由 buildDock 补在最前） */
      var list = [];
      var fs = doc.getElementById('fsKitBtn');
      if (fs && fs !== node) list.push(rank(fs, 3));
      list.push(node);
      buildDock(list);
    },
    collapsed: isCollapsed,
    toggle: function () { setCollapsed(!isCollapsed()); }
  };

  /* ---------------- 响应宽度切换 ---------------- */
  function onMQ(e) {
    if (e.matches) setup();
    else teardown();
  }
  if (MQ.addEventListener) MQ.addEventListener('change', onMQ);
  else if (MQ.addListener) MQ.addListener(onMQ);

  /* 样式无条件注入。
     桌面端（MQ 不匹配）不会建坞，但「右侧悬浮件统一竖线」那条规则照样要生效，
     否则桌面端全屏钮(18px) / 主题钮(12px) / 调色球(14px) 又各偏各的。
     injectStyle 内部有幂等判断，setup() 里再调一次不会重复注入。 */
  injectStyle();

  /* 宽屏也要算「悬浮件贴内容右缘」：
     setup() 只在窄屏跑（宽屏不建坞），但这条规则恰恰是宽屏才用得上的 ——
     窄屏按钮都进坞了，压根没有「飘在右上角」的问题。
     所以对齐放在无条件路径上，并补算一次（工具箱页是 JS 渲染的，首帧还没布局）。 */
  alignFloat();
  setTimeout(alignFloat, 400);
  /* 全局按钮统一编排（页头横排 / 右上竖列）。
     ⚠️ setup() 只在窄屏跑，宽屏走的是这条无条件路径 ——
        统一编排必须在这里也调，否则宽屏的按钮永远没人管。
        ⚠️ 还要多补几次：主题钮/语言钮/调色盘钮都是别的脚本
           （theme-kit / translate-kit / palette-kit）异步生成的，
           首帧往往还没有 → 只跑一次会漏。 */
  alignGlobalTools();
  /* 其它 kit 的按钮是异步生成的，补几次就够了 ——
     不要用短周期 setInterval：那是拿性能和正确性换来的，
     真正的补充靠下面的 MutationObserver（防抖后几乎不花钱）。 */
  scheduleAlignGlobal(400);
  scheduleAlignGlobal(1000);
  scheduleAlignGlobal(2200);
  watchLayout();   /* 内容变了（比如句子条展开）重新算一次 */

  /* ---------------- 显示静态工具槽 ----------------
     槽在 CSS 里默认 visibility:hidden（.kb-ready 之前不显示）。
     四个钮是四个 kit 陆续挂进来的：主题/全屏在 DOMContentLoaded、
     语言钮也提前挂了壳、保存钮要等 canvas 就绪 —— 晚到的一格会把
     已经画出来的按钮挤开，用户看到的就是「加载完按钮挪一下」。
     等页面 load 完（这时候该挂的都已经挂完了）再一次性显示，
     用户看到的就是「按钮出现即在正确位置」。
     1.2s 兜底：个别页面 load 被远端脚本拖住时也不能一直空着。 */
  function revealSlots() {
    var slots = doc.querySelectorAll('[data-kb-tools]:not(.kb-ready)');
    for (var i = 0; i < slots.length; i++) slots[i].classList.add('kb-ready');
  }
  win.addEventListener('load', function () {
    requestAnimationFrame(revealSlots);
    setTimeout(revealSlots, 60);   /* load 后又补挂的（如保存钮）稍等一下 */
  }, { once: true });
  setTimeout(revealSlots, 1200);
  if (doc.readyState === 'complete') requestAnimationFrame(revealSlots);

  function start() {
    if (MQ.matches) setup();
  }
  if (doc.readyState === 'loading' || doc.readyState === 'interactive') {
    doc.addEventListener('DOMContentLoaded', start, { once: true });
  } else {
    start();
  }
})();
