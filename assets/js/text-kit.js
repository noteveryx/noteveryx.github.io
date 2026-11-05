/* ==========================================================
   text-kit —— 共享「句子条」组件
   展示 quotes-data.js 里的句子，并支持自己写一句。

   用法：
     <link rel="stylesheet" href="../assets/css/text-kit.css">
     <script src="../assets/js/quotes-data.js"></script>
     <script src="../assets/js/text-kit.js"></script>
     <script>
       var tk = window.TextKit.mountBar(document.getElementById('host'), {
         layout: 'row',        // 'row' 横向（默认） | 'list' 竖排
         limit: 8,             // 展示前几条
         value: '初始文字',
         onChange: function (text, meta) {
           // meta.custom 为 true 表示是用户自己写的
         }
       });
       tk.get();
     </script>
   ========================================================== */
(function (global) {
  'use strict';

  function plain(q) { return typeof q === 'string' ? q : (q && q.text) || ''; }
  function author(q) { return typeof q === 'string' ? '' : (q && q.author) || ''; }
  function all() { return (global.QUOTES_DATA || []).slice(); }

  function mountBar(host, opts) {
    opts = opts || {};
    if (!host) return null;

    var list = all();
    var limit = opts.limit || 8;
    var shown = list.slice(0, limit);
    var current = opts.value || plain(list[0]);
    var isCustom = false;

    host.innerHTML = '';
    host.classList.add('tk-bar-host');

    var bar = document.createElement('div');
    bar.className = 'tk-bar' + (opts.layout === 'list' ? ' tk-list' : '');
    host.appendChild(bar);

    var chips = document.createElement('div');
    chips.className = 'tk-chips';
    bar.appendChild(chips);

    shown.forEach(function (q) {
      // 用 div 而非 button：Chrome 下 button 内的文字无法被选中复制
      var b = document.createElement('div');
      b.className = 'tk-chip';
      b.setAttribute('role', 'button');
      b.setAttribute('tabindex', '0');
      b.textContent = plain(q);
      b.title = plain(q);

      var downX = 0, downY = 0, moved = false;
      b.addEventListener('pointerdown', function (e) {
        downX = e.clientX; downY = e.clientY; moved = false;
      });
      b.addEventListener('pointermove', function (e) {
        if (Math.abs(e.clientX - downX) > 4 || Math.abs(e.clientY - downY) > 4) moved = true;
      });
      b.addEventListener('click', function () {
        if (moved) return;          // 用户在拖选文字，不切换句子
        current = plain(q);
        isCustom = false;
        sync();
        emit();
      });
      b.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          current = plain(q);
          isCustom = false;
          sync();
          emit();
        }
      });
      chips.appendChild(b);
    });

    var input = document.createElement('input');
    input.type = 'text';
    input.className = 'tk-input';
    input.maxLength = opts.maxLength || 60;
    input.placeholder = opts.placeholder || '✎ 自己写一句…';
    input.setAttribute('aria-label', '自定义文字');
    bar.appendChild(input);

    var ok = document.createElement('button');
    ok.type = 'button';
    ok.className = 'tk-ok';
    ok.textContent = opts.okText || '用这句';
    bar.appendChild(ok);

    /* 折叠按钮：收起后只剩一个小箭头，画布不再被挡 */
    var folded = !!opts.folded;
    var fold = null;
    if (opts.collapsible) {
      fold = document.createElement('button');
      fold.type = 'button';
      fold.className = 'tk-fold';
      fold.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9l6 6 6-6"/></svg>';
      bar.appendChild(fold);
      fold.addEventListener('click', function (e) {
        e.stopPropagation();
        setFolded(!folded);
      });
    }

    function setFolded(on) {
      folded = !!on;
      bar.classList.toggle('tk-folded', folded);
      if (fold) {
        fold.title = folded ? '展开句子列表' : '收起句子列表';
        fold.setAttribute('aria-label', fold.title);
      }
    }

    function commit() {
      var v = input.value.trim();
      if (!v) { input.focus(); return; }
      current = v;
      isCustom = true;
      sync();
      emit();
    }

    input.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') { e.preventDefault(); commit(); }
    });
    ok.addEventListener('click', commit);

    function sync() {
      var cs = chips.children;
      for (var i = 0; i < cs.length; i++) cs[i].classList.remove('on');
      if (!isCustom) {
        for (var j = 0; j < shown.length; j++) {
          if (plain(shown[j]) === current) { cs[j].classList.add('on'); break; }
        }
      }
      if (isCustom && input.value.trim() !== current) input.value = current;
    }

    function emit() {
      if (opts.onChange) opts.onChange(current, { custom: isCustom });
    }

    sync();
    setFolded(folded);

    return {
      get: function () { return current; },
      collapse: function () { setFolded(true); },
      expand: function () { setFolded(false); },
      toggleFold: function () { setFolded(!folded); },
      isFolded: function () { return folded; },
      setText: function (t) {
        current = t || '';
        isCustom = true;
        input.value = current;
        sync();
      },
      selectQuote: function (i) {
        if (!shown[i]) return;
        current = plain(shown[i]);
        isCustom = false;
        input.value = '';
        sync();
        emit();
      },
      focusInput: function () { input.focus(); input.select(); },
      quotes: list
    };
  }

  global.TextKit = {
    mountBar: mountBar,
    quotes: all,
    plain: plain,
    author: author
  };
})(window);
