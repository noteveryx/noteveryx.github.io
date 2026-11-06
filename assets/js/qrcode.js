/* ==========================================================
   qrcode.js —— 二维码生成（纯 JS，零依赖）
   ------------------------------------------------------------
   字节模式 + Reed-Solomon 纠错 + 8 种掩码择优。
   算法参考 ISO/IEC 18004 的通用实现思路写成，不引入任何外部库，
   保持「单文件、离线可用」的站点风格。

   支持：版本 1~10（够放 200+ 字节的网址），纠错级别 M。
   超出容量会抛错，调用方需要处理。

   用法：
     var qr = QRCode.encode('https://example.com');
     // qr.size    —— 边长（模块数）
     // qr.modules[y][x] —— true = 黑
     QRCode.toCanvas(canvas, text, { margin: 4, dark: '#000', light: '#fff' });
     QRCode.toSVG(text, { margin: 4 });   // 返回 SVG 字符串
   ========================================================== */
(function (global) {
  'use strict';

  /* ---------------- GF(256) 算术（QR 用的本原多项式 0x11D） ---------------- */
  var EXP = new Uint8Array(256);
  var LOG = new Uint8Array(256);
  (function () {
    var x = 1;
    for (var i = 0; i < 255; i++) {
      EXP[i] = x;
      LOG[x] = i;
      x <<= 1;
      if (x & 0x100) x ^= 0x11D;
    }
    EXP[255] = EXP[0];
  })();

  function gfMul(a, b) {
    if (a === 0 || b === 0) return 0;
    return EXP[(LOG[a] + LOG[b]) % 255];
  }

  /* Reed-Solomon 生成多项式 */
  function rsDivisor(degree) {
    var result = new Uint8Array(degree);
    result[degree - 1] = 1;
    var root = 1;
    for (var i = 0; i < degree; i++) {
      for (var j = 0; j < degree; j++) {
        result[j] = gfMul(result[j], root);
        if (j + 1 < degree) result[j] ^= result[j + 1];
      }
      root = gfMul(root, 0x02);
    }
    return result;
  }

  /* 求余数（纠错码字） */
  function rsRemainder(data, divisor) {
    var result = new Uint8Array(divisor.length);
    for (var i = 0; i < data.length; i++) {
      var factor = data[i] ^ result[0];
      result.copyWithin(0, 1);
      result[result.length - 1] = 0;
      for (var j = 0; j < divisor.length; j++) result[j] ^= gfMul(divisor[j], factor);
    }
    return result;
  }

  /* ---------------- 版本参数（纠错级别 M，版本 1~10） ---------------- */
  var ECC_PER_BLOCK = [10, 16, 26, 18, 24, 16, 18, 22, 22, 26];
  var NUM_BLOCKS = [1, 1, 1, 2, 2, 4, 4, 4, 5, 5];
  var ECL_FORMAT_BITS = 0;   // M 级别对应格式信息里的 00

  function rawDataModules(ver) {
    var result = (16 * ver + 128) * ver + 64;
    if (ver >= 2) {
      var numAlign = Math.floor(ver / 7) + 2;
      result -= (25 * numAlign - 10) * numAlign - 55;
      if (ver >= 7) result -= 36;
    }
    return result;
  }

  function dataCodewords(ver) {
    return Math.floor(rawDataModules(ver) / 8) - ECC_PER_BLOCK[ver - 1] * NUM_BLOCKS[ver - 1];
  }

  function alignPositions(ver) {
    if (ver === 1) return [];
    var numAlign = Math.floor(ver / 7) + 2;
    var step = Math.ceil((ver * 4 + 4) / (numAlign * 2 - 2)) * 2;
    var result = [6];
    for (var pos = ver * 4 + 10; result.length < numAlign; pos -= step) result.splice(1, 0, pos);
    return result;
  }

  /* ---------------- 位缓冲 ---------------- */
  function BitBuf() { this.bits = []; }
  BitBuf.prototype.put = function (val, len) {
    for (var i = len - 1; i >= 0; i--) this.bits.push((val >>> i) & 1);
  };

  /* ---------------- 编码主流程 ---------------- */
  function encode(text, opts) {
    opts = opts || {};
    var minVersion = opts.minVersion || 1;
    var maxVersion = Math.min(opts.maxVersion || 10, 10);

    var bytes = utf8Bytes(String(text));

    var ver = -1;
    for (var v = minVersion; v <= maxVersion; v++) {
      var capacityBits = dataCodewords(v) * 8;
      var need = 4 + charCountBits(v) + bytes.length * 8;
      if (need > capacityBits) continue;
      // 内容之后还得放下终止符（最多 4 个 0）。
      // 要么正好填满（此时不写终止符），要么至少留出 4 位 ——
      // 只剩 1~3 位的话，终止符放不下，必须换更大的版本。
      var remain = capacityBits - need;
      if (remain === 0 || remain >= 4) { ver = v; break; }
    }
    if (ver < 0) {
      throw new Error('内容太长：' + bytes.length + ' 字节超出 QR 版本 ' + maxVersion + ' 的容量');
    }

    var bb = new BitBuf();
    bb.put(0x4, 4);                       // 字节模式
    bb.put(bytes.length, charCountBits(ver));
    for (var i = 0; i < bytes.length; i++) bb.put(bytes[i], 8);

    var capacityBits = dataCodewords(ver) * 8;
    bb.put(0, Math.min(4, capacityBits - bb.bits.length));   // 终止符
    bb.put(0, (8 - bb.bits.length % 8) % 8);                  // 补齐到字节
    for (var pad = 0xEC; bb.bits.length < capacityBits; pad ^= 0xEC ^ 0x11) bb.put(pad, 8);

    var data = new Uint8Array(bb.bits.length / 8);
    for (var b = 0; b < bb.bits.length; b++) {
      if (bb.bits[b]) data[b >>> 3] |= 1 << (7 - (b & 7));
    }

    var allCodewords = addEccAndInterleave(data, ver);
    // opts.mask 可强制指定掩码号（0~7）。正常使用时留空，由算法按惩罚分择优；
    // 这个开关主要给交叉验证用：固定掩码后可以和别的实现逐模块比对。
    var forced = (opts.mask === undefined || opts.mask === null) ? null : (opts.mask | 0);
    return buildMatrix(allCodewords, ver, forced);
  }

  function charCountBits(ver) {
    return ver <= 9 ? 8 : 16;
  }

  function utf8Bytes(s) {
    var out = [];
    for (var i = 0; i < s.length; i++) {
      var c = s.charCodeAt(i);
      if (c < 0x80) out.push(c);
      else if (c < 0x800) {
        out.push(0xC0 | (c >> 6), 0x80 | (c & 0x3F));
      } else if (c >= 0xD800 && c <= 0xDBFF && i + 1 < s.length) {
        // 代理对 → 四字节 UTF-8
        var c2 = s.charCodeAt(i + 1);
        var cp = 0x10000 + ((c - 0xD800) << 10) + (c2 - 0xDC00);
        out.push(0xF0 | (cp >> 18), 0x80 | ((cp >> 12) & 0x3F), 0x80 | ((cp >> 6) & 0x3F), 0x80 | (cp & 0x3F));
        i++;
      } else {
        out.push(0xE0 | (c >> 12), 0x80 | ((c >> 6) & 0x3F), 0x80 | (c & 0x3F));
      }
    }
    return out;
  }

  /* 分块加纠错码 + 交织
     所有块统一成 shortBlockLen+1 长：短块末尾多出一个填充位（padding），
     交织时这一位要跳过 —— 这样各块的数据码字才会先全部交织完、再交织纠错码字，
     顺序才符合 QR 规范。 */
  function addEccAndInterleave(data, ver) {
    var numBlocks = NUM_BLOCKS[ver - 1];
    var blockEccLen = ECC_PER_BLOCK[ver - 1];
    var rawCodewords = Math.floor(rawDataModules(ver) / 8);
    var numShortBlocks = numBlocks - rawCodewords % numBlocks;
    var shortBlockLen = Math.floor(rawCodewords / numBlocks);

    var blocks = [];
    var divisor = rsDivisor(blockEccLen);
    var k = 0;
    for (var i = 0; i < numBlocks; i++) {
      var dlen = shortBlockLen - blockEccLen + (i >= numShortBlocks ? 1 : 0);
      var dat = data.slice(k, k + dlen);
      k += dlen;
      var ecc = rsRemainder(dat, divisor);
      var block = new Uint8Array(shortBlockLen + 1);
      block.set(dat, 0);
      block.set(ecc, shortBlockLen + 1 - blockEccLen);
      blocks.push(block);
    }

    var result = new Uint8Array(rawCodewords);
    var pos = 0;
    for (var i = 0; i < shortBlockLen + 1; i++) {
      for (var j = 0; j < numBlocks; j++) {
        // 短块末尾的填充位不参与交织
        if (i === shortBlockLen - blockEccLen && j < numShortBlocks) continue;
        result[pos++] = blocks[j][i];
      }
    }
    return result;
  }

  /* ---------------- 矩阵构建 ---------------- */
  function buildMatrix(codewords, ver, forcedMask) {
    var size = ver * 4 + 17;
    var modules = [];
    var isFunction = [];
    for (var y = 0; y < size; y++) {
      modules.push(new Array(size).fill(false));
      isFunction.push(new Array(size).fill(false));
    }

    drawFunctionPatterns(modules, isFunction, ver);

    // 数据码字放置（之字形）
    var i = 0;
    for (var right = size - 1; right >= 1; right -= 2) {
      if (right === 6) right = 5;
      for (var vert = 0; vert < size; vert++) {
        for (var j = 0; j < 2; j++) {
          var x = right - j;
          var upward = ((right + 1) & 2) === 0;
          var yy = upward ? size - 1 - vert : vert;
          if (!isFunction[yy][x] && i < codewords.length * 8) {
            modules[yy][x] = ((codewords[i >>> 3] >>> (7 - (i & 7))) & 1) !== 0;
            i++;
          }
          // 剩余位置留 false（后面用掩码处理时会被覆盖为浅色）
        }
      }
    }

    // 8 种掩码择优
    var bestMask = 0;
    if (forcedMask !== null && forcedMask !== undefined && forcedMask >= 0 && forcedMask <= 7) {
      bestMask = forcedMask;                       // 交叉验证模式：指定掩码，不做择优
    } else {
      var minPenalty = Infinity;
      for (var m = 0; m < 8; m++) {
        applyMask(modules, isFunction, m, size);
        drawFormatBits(modules, isFunction, m, size, ver);
        var p = getPenaltyScore(modules, size);
        if (p < minPenalty) { minPenalty = p; bestMask = m; }
        applyMask(modules, isFunction, m, size);   // XOR 两次即还原
      }
    }
    applyMask(modules, isFunction, bestMask, size);
    drawFormatBits(modules, isFunction, bestMask, size, ver);

    return {
      size: size,
      version: ver,
      modules: modules,
      get: function (x, y) { return !!modules[y][x]; }
    };
  }

  function drawFunctionPatterns(m, isFn, ver) {
    var size = m.length;

    // 定位图案 + 分隔符
    [[0, 0], [size - 7, 0], [0, size - 7]].forEach(function (p) {
      for (var dy = -1; dy <= 7; dy++) {
        for (var dx = -1; dx <= 7; dx++) {
          var x = p[0] + dx, y = p[1] + dy;
          if (x < 0 || x >= size || y < 0 || y >= size) continue;
          var inRing = (dx >= 0 && dx <= 6 && (dy === 0 || dy === 6)) ||
            (dy >= 0 && dy <= 6 && (dx === 0 || dx === 6));
          var inCore = dx >= 2 && dx <= 4 && dy >= 2 && dy <= 4;
          m[y][x] = inRing || inCore;
          isFn[y][x] = true;
        }
      }
    });

    // 校正图案
    var pos = alignPositions(ver);
    for (var i = 0; i < pos.length; i++) {
      for (var j = 0; j < pos.length; j++) {
        // 三个角上的定位图案位置不画校正图案
        if ((i === 0 && j === 0) || (i === 0 && j === pos.length - 1) || (i === pos.length - 1 && j === 0)) continue;
        drawAlignment(m, isFn, pos[i], pos[j]);
      }
    }

    // 时序图案
    for (var k = 8; k < size - 8; k++) {
      var bit = (k % 2 === 0);
      m[6][k] = bit; isFn[6][k] = true;
      m[k][6] = bit; isFn[k][6] = true;
    }

    // 固定的黑模块
    m[size - 8][8] = true; isFn[size - 8][8] = true;

    // 预留格式信息区
    for (var f = 0; f <= 8; f++) {
      if (f !== 6) { isFn[8][f] = true; isFn[f][8] = true; }
    }
    for (var q = 0; q < 8; q++) { isFn[8][size - 1 - q] = true; isFn[size - 1 - q][8] = true; }

    // 版本信息区（版本 7 以上）
    if (ver >= 7) {
      for (var r = 0; r < 6; r++) {
        for (var c = 0; c < 3; c++) {
          isFn[r][size - 11 + c] = true;
          isFn[size - 11 + c][r] = true;
        }
      }
    }
  }

  function drawAlignment(m, isFn, cx, cy) {
    for (var dy = -2; dy <= 2; dy++) {
      for (var dx = -2; dx <= 2; dx++) {
        var x = cx + dx, y = cy + dy;
        m[y][x] = (Math.max(Math.abs(dx), Math.abs(dy)) !== 1);
        isFn[y][x] = true;
      }
    }
  }

  function drawFormatBits(m, isFn, mask, size, ver) {
    var data = (ECL_FORMAT_BITS << 3) | mask;
    var rem = data;
    for (var i = 0; i < 10; i++) rem = (rem << 1) ^ ((rem >>> 9) * 0x537);
    var bits = (((data << 10) | rem) ^ 0x5412) & 0x7FFF;

    function getBit(idx) { return ((bits >>> idx) & 1) !== 0; }

    // 左上角（坐标按 x=列、y=行；bits 0~5 落在第 8 列顶部，9~14 落在第 8 行左端）
    for (var j = 0; j <= 5; j++) m[j][8] = getBit(j);
    m[7][8] = getBit(6);
    m[8][8] = getBit(7);
    m[8][7] = getBit(8);
    for (var k = 9; k < 15; k++) m[8][14 - k] = getBit(k);

    // 右上 / 左下（第二份副本）
    for (var p = 0; p < 8; p++) m[8][size - 1 - p] = getBit(p);
    for (var q = 8; q < 15; q++) m[size - 15 + q][8] = getBit(q);

    // 版本信息
    if (ver >= 7) {
      var vrem = ver;
      for (var v = 0; v < 12; v++) vrem = (vrem << 1) ^ ((vrem >>> 11) * 0x1F25);
      var vbits = (ver << 12) | vrem;
      for (var r = 0; r < 18; r++) {
        var bit = ((vbits >>> r) & 1) !== 0;
        // 两份副本互为转置：ax/ay 是列/行
        var ax = size - 11 + (r % 3), ay = Math.floor(r / 3);
        m[ay][ax] = bit;
        m[ax][ay] = bit;
      }
    }
  }

  function maskFn(mask, x, y) {
    switch (mask) {
      case 0: return (x + y) % 2 === 0;
      case 1: return y % 2 === 0;
      case 2: return x % 3 === 0;
      case 3: return (x + y) % 3 === 0;
      case 4: return (Math.floor(x / 3) + Math.floor(y / 2)) % 2 === 0;
      case 5: return (x * y) % 2 + (x * y) % 3 === 0;
      case 6: return ((x * y) % 2 + (x * y) % 3) % 2 === 0;
      default: return (((x + y) % 2) + (x * y) % 3) % 2 === 0;
    }
  }

  function applyMask(m, isFn, mask, size) {
    for (var y = 0; y < size; y++) {
      for (var x = 0; x < size; x++) {
        if (isFn[y][x]) continue;
        if (maskFn(mask, x, y)) m[y][x] = !m[y][x];
      }
    }
  }

  /* 掩码惩罚分（越低越好） */
  function getPenaltyScore(m, size) {
    var result = 0, x, y;

    // 规则 1：同色连续 5 个以上
    for (y = 0; y < size; y++) {
      var runColor = false, runLen = 0;
      for (x = 0; x < size; x++) {
        if (m[y][x] === runColor) {
          runLen++;
          if (runLen === 5) result += 3;
          else if (runLen > 5) result++;
        } else {
          runColor = m[y][x];
          runLen = 1;
        }
      }
    }
    for (x = 0; x < size; x++) {
      var runColor2 = false, runLen2 = 0;
      for (y = 0; y < size; y++) {
        if (m[y][x] === runColor2) {
          runLen2++;
          if (runLen2 === 5) result += 3;
          else if (runLen2 > 5) result++;
        } else {
          runColor2 = m[y][x];
          runLen2 = 1;
        }
      }
    }

    // 规则 2：2×2 同色块
    for (y = 0; y < size - 1; y++) {
      for (x = 0; x < size - 1; x++) {
        var c = m[y][x];
        if (c === m[y][x + 1] && c === m[y + 1][x] && c === m[y + 1][x + 1]) result += 3;
      }
    }

    // 规则 3：类似定位图案的 1:1:3:1:1 + 4 浅色
    var pat = [true, false, true, true, true, false, true, false, false, false, false];
    function matchAt(get, ox, oy) {
      for (var i = 0; i < 11; i++) {
        if (get(ox + i) !== pat[i]) return false;
      }
      return true;
    }
    for (y = 0; y < size; y++) {
      for (x = 0; x < size; x++) {
        // matchAt 内部按 get(0 + i) 取第 i 位，所以这里的 ox 传 0：
        // 横向取 m[y][x+i]，纵向取 m[y+i][x]（x 是闭包里捕获的外层变量）
        if (x + 11 <= size && matchAt(function (i) { return m[y][x + i]; }, 0, 0)) result += 40;
        if (y + 11 <= size && matchAt(function (i) { return m[y + i][x]; }, 0, 0)) result += 40;
      }
    }

    // 规则 4：黑白比例偏离 50%
    var dark = 0;
    for (y = 0; y < size; y++) for (x = 0; x < size; x++) if (m[y][x]) dark++;
    var total = size * size;
    var k = Math.ceil(Math.abs(dark * 20 - total * 10) / total) - 1;
    result += Math.max(0, k) * 10;
    return result;
  }

  /* ---------------- 渲染 ---------------- */
  function toCanvas(canvas, text, opts) {
    opts = opts || {};
    var qr = encode(text, opts);
    var margin = opts.margin === undefined ? 4 : opts.margin;
    var dark = opts.dark || '#000000';
    var light = opts.light || '#ffffff';
    var scale = opts.scale || 1;
    var total = qr.size + margin * 2;

    var dpr = opts.dpr || Math.min(window.devicePixelRatio || 1, 3);
    canvas.width = Math.round(total * scale * dpr);
    canvas.height = Math.round(total * scale * dpr);
    canvas.style.width = (total * scale) + 'px';
    canvas.style.height = (total * scale) + 'px';

    var ctx = canvas.getContext('2d');
    ctx.setTransform(dpr * scale, 0, 0, dpr * scale, 0, 0);
    ctx.fillStyle = light;
    ctx.fillRect(0, 0, total, total);
    ctx.fillStyle = dark;
    for (var y = 0; y < qr.size; y++) {
      for (var x = 0; x < qr.size; x++) {
        if (qr.get(x, y)) ctx.fillRect(x + margin, y + margin, 1, 1);
      }
    }
    return qr;
  }

  function toSVG(text, opts) {
    opts = opts || {};
    var qr = encode(text, opts);
    var margin = opts.margin === undefined ? 4 : opts.margin;
    var total = qr.size + margin * 2;
    var dark = opts.dark || '#000000';
    var light = opts.light || '#ffffff';
    var path = [];
    for (var y = 0; y < qr.size; y++) {
      for (var x = 0; x < qr.size; x++) {
        if (qr.get(x, y)) path.push('M' + (x + margin) + ',' + (y + margin) + 'h1v1h-1z');
      }
    }
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + total + ' ' + total + '" width="' +
      (opts.size || total * 4) + '" height="' + (opts.size || total * 4) + '" shape-rendering="crispEdges">' +
      '<rect width="' + total + '" height="' + total + '" fill="' + light + '"/>' +
      '<path d="' + path.join('') + '" fill="' + dark + '"/></svg>';
  }

  global.QRCode = {
    encode: encode,
    toCanvas: toCanvas,
    toSVG: toSVG,
    MAX_VERSION: 10
  };
})(window);
