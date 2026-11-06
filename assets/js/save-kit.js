/* ==========================================================
   save-kit.js —— 统一「保存为图片 / 壁纸」入口
   ------------------------------------------------------------
   以前每个页面各写各的下载逻辑：文件名怎么拼、提示怎么弹、
   按钮长什么样都不一致。现在收敛到这里。

   特点：
     · 自带样式（像 fs-kit 那样注入），不依赖各页面的 .btn
     · 按钮可直接插入页面已有的 .ui.tools 容器，跟暂停/全屏排在一起
     · 优先走「当前画面原生分辨率」（= CSS 尺寸 × devicePixelRatio），
       在高分屏上直接就是 2x 壁纸，不用放大糊
     · 若页面提供 render(ctx, w, h) 钩子，则可按指定尺寸重绘出高清图

   用法（氛围屏）：
     <script src="../assets/js/save-kit.js" defer></script>
     <script>
       SaveKit.mountButton({
         canvas: document.getElementById('cv'),
         filename: 'aurora',
         container: document.querySelector('.ui.tools'),
         render: function (ctx, w, h) { ... }   // 可选：按 w/h 重绘
       });
     </script>
   ========================================================== */
(function (global) {
  'use strict';

  var STYLE_ID = 'save-kit-style';

  var STYLE = [
    '.svk-btn{',
    'width:38px;height:38px;border-radius:50%;flex:0 0 auto;',
    'display:flex;align-items:center;justify-content:center;',
    'border:1px solid rgba(255,255,255,.22);',
    'background:rgba(14,16,26,.55);',
    '-webkit-backdrop-filter:blur(10px);backdrop-filter:blur(10px);',
    'color:rgba(255,255,255,.92);cursor:pointer;',
    '-webkit-tap-highlight-color:transparent;',
    'box-shadow:0 2px 10px rgba(0,0,0,.28);',
    'transition:transform .16s cubic-bezier(.2,.9,.3,1),opacity .2s,color .2s,border-color .2s,background .2s;',
    '}',
    '.svk-btn:hover{opacity:1;color:#fff;border-color:rgba(255,255,255,.45);background:rgba(14,16,26,.78);transform:scale(1.06);}',
    '.svk-btn:active{transform:scale(.93);}',
    '.svk-btn:focus-visible{outline:2px solid rgba(255,255,255,.6);outline-offset:2px;}',
    '.svk-btn.busy{opacity:.55;pointer-events:none;}',
    '@media (hover:none){.svk-btn{opacity:.78;}}',
    /* 尺寸选择菜单 */
    '.svk-menu{',
    'position:fixed;z-index:70;min-width:158px;',
    'padding:6px;border-radius:13px;',
    'background:rgba(14,16,26,.92);',
    '-webkit-backdrop-filter:blur(14px);backdrop-filter:blur(14px);',
    'border:1px solid rgba(255,255,255,.14);',
    'box-shadow:0 14px 38px -12px rgba(0,0,0,.6);',
    '}',
    '.svk-menu button{',
    'display:block;width:100%;text-align:left;',
    'padding:9px 11px;border:0;border-radius:9px;background:transparent;',
    'color:rgba(255,255,255,.9);font:600 12.5px/1.3 -apple-system,"PingFang SC",system-ui,sans-serif;',
    'cursor:pointer;transition:background .14s ease,color .14s ease;',
    '}',
    '.svk-menu button:hover{background:rgba(255,255,255,.12);color:#fff;}',
    '.svk-menu button small{display:block;font-weight:400;opacity:.62;margin-top:2px;font-size:11px;}',
    /* 提示条 */
    '.svk-toast{',
    'position:fixed;left:50%;transform:translateX(-50%);',
    'bottom:calc(76px + env(safe-area-inset-bottom));',
    'padding:8px 16px;border-radius:999px;',
    'background:rgba(14,16,26,.92);border:1px solid rgba(255,255,255,.14);',
    'color:rgba(255,255,255,.92);font:600 12.5px/1.4 -apple-system,"PingFang SC",system-ui,sans-serif;',
    'z-index:80;opacity:0;pointer-events:none;',
    'transition:opacity .22s ease,transform .22s ease;',
    '}',
    '.svk-toast.show{opacity:1;transform:translateX(-50%) translateY(-4px);}'
  ].join('');

  var ICON_DOWN = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">' +
    '<path d="M12 3v12"/><path d="M7.5 10.5L12 15l4.5-4.5"/><path d="M4 20h16"/></svg>';

  function injectStyle() {
    if (document.getElementById(STYLE_ID)) return;
    var st = document.createElement('style');
    st.id = STYLE_ID;
    st.textContent = STYLE;
    (document.head || document.documentElement).appendChild(st);
  }

  /* ---------------- 提示条 ---------------- */
  var toastEl = null, toastTimer = 0;
  function toast(msg, ms) {
    if (!toastEl) {
      toastEl = document.createElement('div');
      toastEl.className = 'svk-toast';
      toastEl.setAttribute('role', 'status');
      document.body.appendChild(toastEl);
    }
    toastEl.textContent = msg;
    void toastEl.offsetWidth;
    toastEl.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastEl.classList.remove('show'); }, ms || 1900);
  }

  /* ---------------- canvas → Blob ---------------- */
  function toBlob(canvas, type, quality) {
    return new Promise(function (resolve, reject) {
      if (!canvas) return reject(new Error('没有画布'));
      try {
        if (canvas.toBlob) {
          canvas.toBlob(function (b) {
            if (b) resolve(b);
            else reject(new Error('导出失败'));
          }, type || 'image/png', quality);
        } else {
          // 极老浏览器的降级：dataURL → blob
          var data = canvas.toDataURL(type || 'image/png', quality);
          var parts = data.split(',');
          var mime = /:(.*?);/.exec(parts[0])[1];
          var bin = atob(parts[1]);
          var buf = new Uint8Array(bin.length);
          for (var i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);
          resolve(new Blob([buf], { type: mime }));
        }
      } catch (e) {
        reject(e);
      }
    });
  }

  function download(blob, filename) {
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(url); }, 1500);
  }

  function stamp() {
    var d = new Date();
    function p(n) { return n < 10 ? '0' + n : '' + n; }
    return '' + d.getFullYear() + p(d.getMonth() + 1) + p(d.getDate()) +
      '-' + p(d.getHours()) + p(d.getMinutes()) + p(d.getSeconds());
  }

  /* ---------------- 导出当前画面 ---------------- */
  function exportCanvas(canvas, filename, opts) {
    opts = opts || {};
    return toBlob(canvas, 'image/png').then(function (blob) {
      var name = (filename || 'image') + '-' + stamp() + '.png';
      download(blob, name);
      toast('已保存 ' + name);
      return blob;
    }).catch(function (e) {
      toast('保存失败：' + (e && e.message ? e.message : '未知错误'));
      throw e;
    });
  }

  /* ---------------- 按尺寸重绘导出 ----------------
     页面提供 render(ctx, w, h) 时，用离屏画布按目标尺寸重绘，
     得到真正的高清壁纸（而不是把小画布拉大）。 */
  function renderAtSize(source, render, w, h) {
    return new Promise(function (resolve, reject) {
      var off = document.createElement('canvas');
      off.width = w;
      off.height = h;
      var c = off.getContext('2d');
      var restore = null;
      try {
        if (typeof render === 'function') {
          render(c, w, h);
        } else {
          // 没提供钩子：按比例放大当前画面（会有插值损失，但好过没有）
          c.imageSmoothingEnabled = true;
          c.imageSmoothingQuality = 'high';
          c.drawImage(source, 0, 0, w, h);
        }
        resolve(off);
      } catch (e) {
        reject(e);
      }
    });
  }

  /* ---------------- 尺寸菜单 ---------------- */
  var menuEl = null;
  function closeMenu() {
    if (menuEl && menuEl.parentNode) menuEl.parentNode.removeChild(menuEl);
    menuEl = null;
  }
  document.addEventListener('click', function (e) {
    if (menuEl && !menuEl.contains(e.target)) closeMenu();
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') closeMenu();
  });

  function openMenu(anchor, items, onPick) {
    closeMenu();
    menuEl = document.createElement('div');
    menuEl.className = 'svk-menu';
    items.forEach(function (it) {
      var b = document.createElement('button');
      b.type = 'button';
      b.innerHTML = it.label + (it.desc ? '<small>' + it.desc + '</small>' : '');
      b.addEventListener('click', function (e) {
        e.stopPropagation();
        closeMenu();
        onPick(it);
      });
      menuEl.appendChild(b);
    });
    document.body.appendChild(menuEl);

    // 定位：优先贴在按钮下方，屏幕放不下就翻到上方
    var r = anchor.getBoundingClientRect();
    var pw = menuEl.offsetWidth, ph = menuEl.offsetHeight;
    var vw = window.innerWidth, vh = window.innerHeight;
    var left = Math.min(Math.max(8, r.right - pw), vw - pw - 8);
    var top = r.bottom + 8;
    if (top + ph > vh - 8) top = Math.max(8, r.top - ph - 8);
    menuEl.style.left = Math.round(left) + 'px';
    menuEl.style.top = Math.round(top) + 'px';
  }

  /* ---------------- 挂载按钮 ---------------- */
  function mountButton(opts) {
    opts = opts || {};
    injectStyle();
    var canvas = opts.canvas;
    if (!canvas) return null;

    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'svk-btn';
    btn.title = opts.title || '保存为图片';
    btn.setAttribute('aria-label', btn.title);
    btn.innerHTML = opts.icon || ICON_DOWN;

    function currentSize() {
      return {
        w: canvas.width || canvas.clientWidth || 1920,
        h: canvas.height || canvas.clientHeight || 1080
      };
    }

    function doExport(w, h) {
      btn.classList.add('busy');
      var p;
      if (w && h) {
        p = renderAtSize(canvas, opts.render, w, h).then(function (off) {
          return toBlob(off, 'image/png');
        }).then(function (blob) {
          var name = (opts.filename || 'image') + '-' + w + 'x' + h + '-' + stamp() + '.png';
          download(blob, name);
          toast('已保存 ' + w + '×' + h + ' 壁纸');
        }).catch(function (e) {
          toast('保存失败：' + (e && e.message ? e.message : '未知错误'));
        });
      } else {
        p = toBlob(canvas, 'image/png').then(function (blob) {
          var name = (opts.filename || 'image') + '-' + stamp() + '.png';
          download(blob, name);
          toast('已保存 ' + name);
        }).catch(function (e) {
          toast('保存失败：' + (e && e.message ? e.message : '未知错误'));
        });
      }
      Promise.resolve(p).then(function () { btn.classList.remove('busy'); });
    }

    btn.addEventListener('click', function (e) {
      e.stopPropagation();
      var cs = currentSize();
      // 始终给菜单：当前屏幕的分辨率往往不是理想壁纸尺寸，
      // 用户可能想要 4K。但没有 render 钩子时只能靠放大，
      // 所以菜单里如实标注，不假装是重绘。
      var items = [
        { label: '当前画面 ' + cs.w + '×' + cs.h, desc: '屏幕原生分辨率，最清晰', w: 0, h: 0 }
      ];
      if (opts.render) {
        items.push({ label: '1920 × 1080', desc: '按此尺寸重新绘制', w: 1920, h: 1080 });
        items.push({ label: '3840 × 2160', desc: '4K 壁纸，重新绘制', w: 3840, h: 2160 });
      } else {
        items.push({ label: '1920 × 1080', desc: '由当前画面放大，可能略糊', w: 1920, h: 1080 });
        items.push({ label: '3840 × 2160', desc: '4K，由当前画面放大，可能略糊', w: 3840, h: 2160 });
      }
      openMenu(btn, items, function (it) { doExport(it.w, it.h); });
    });

    var host = opts.container || document.body;
    if (host === document.body) {
      btn.style.position = 'fixed';
      btn.style.right = 'calc(14px + env(safe-area-inset-right))';
      btn.style.bottom = 'calc(64px + env(safe-area-inset-bottom))';
      btn.style.zIndex = '60';
    }
    host.appendChild(btn);
    return btn;
  }

  global.SaveKit = {
    mountButton: mountButton,
    exportCanvas: exportCanvas,
    toBlob: toBlob,
    download: download,
    toast: toast
  };
})(window);
