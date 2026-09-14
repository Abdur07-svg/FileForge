/**
 * FileForge - PDF Protect Tool
 * Password protect and encrypt PDF files directly in browser with zero server uploads.
 * Standard PDF 1.7 Security Handler (Revision 3 / 128-bit encryption).
 */

const PDFProtect = (() => {
  let currentFile = null; // { file, name, size, buffer, pageCount }
  let protectedPdfBlob = null;

  let dom = {};

  // Standard PDF 32-byte Padding String (ISO 32000-1)
  const PADDING = new Uint8Array([
    0x28, 0xbf, 0x4e, 0x5e, 0x4e, 0x75, 0x8a, 0x41,
    0x64, 0x00, 0x4e, 0x56, 0xff, 0xfa, 0x01, 0x08,
    0x2e, 0x2e, 0x00, 0xb6, 0xd0, 0x68, 0x3e, 0x80,
    0x2f, 0x0c, 0xa9, 0xfe, 0x64, 0x53, 0x69, 0x7a
  ]);

  // Fast Pure JS MD5 Implementation
  function md5(input) {
    let bytes;
    if (typeof input === 'string') {
      bytes = new Uint8Array(input.length);
      for (let i = 0; i < input.length; i++) bytes[i] = input.charCodeAt(i) & 0xff;
    } else if (input instanceof Uint8Array) {
      bytes = input;
    } else {
      bytes = new Uint8Array(input);
    }

    function safeAdd(x, y) {
      const lsw = (x & 0xffff) + (y & 0xffff);
      const msw = (x >> 16) + (y >> 16) + (lsw >> 16);
      return (msw << 16) | (lsw & 0xffff);
    }
    function bitRotateLeft(num, cnt) { return (num << cnt) | (num >>> (32 - cnt)); }
    function md5cmn(q, a, b, x, s, t) { return safeAdd(bitRotateLeft(safeAdd(safeAdd(a, q), safeAdd(x, t)), s), b); }
    function md5ff(a, b, c, d, x, s, t) { return md5cmn((b & c) | (~b & d), a, b, x, s, t); }
    function md5gg(a, b, c, d, x, s, t) { return md5cmn((b & d) | (c & ~d), a, b, x, s, t); }
    function md5hh(a, b, c, d, x, s, t) { return md5cmn(b ^ c ^ d, a, b, x, s, t); }
    function md5ii(a, b, c, d, x, s, t) { return md5cmn(c ^ (b | ~d), a, b, x, s, t); }

    const bitLength = bytes.length * 8;
    const paddingLength = (bytes.length % 64 < 56) ? (56 - (bytes.length % 64)) : (120 - (bytes.length % 64));
    const totalLength = bytes.length + paddingLength + 8;
    const padded = new Uint8Array(totalLength);
    padded.set(bytes, 0);
    padded[bytes.length] = 0x80;

    padded[totalLength - 8] = bitLength & 0xff;
    padded[totalLength - 7] = (bitLength >>> 8) & 0xff;
    padded[totalLength - 6] = (bitLength >>> 16) & 0xff;
    padded[totalLength - 5] = (bitLength >>> 24) & 0xff;

    let a = 1732584193, b = -271733879, c = -1732584194, d = 271733878;
    const x = new Int32Array(16);

    for (let offset = 0; offset < totalLength; offset += 64) {
      for (let k = 0; k < 16; k++) {
        const idx = offset + (k * 4);
        x[k] = (padded[idx]) | (padded[idx + 1] << 8) | (padded[idx + 2] << 16) | (padded[idx + 3] << 24);
      }
      const olda = a, oldb = b, oldc = c, oldd = d;
      a = md5ff(a, b, c, d, x[0], 7, -680876936); d = md5ff(d, a, b, c, x[1], 12, -389564586);
      c = md5ff(c, d, a, b, x[2], 17, 606105819); b = md5ff(b, c, d, a, x[3], 22, -1044525330);
      a = md5ff(a, b, c, d, x[4], 7, -176418897); d = md5ff(d, a, b, c, x[5], 12, 1200080426);
      c = md5ff(c, d, a, b, x[6], 17, -1473231341); b = md5ff(b, c, d, a, x[7], 22, -45705983);
      a = md5ff(a, b, c, d, x[8], 7, 1770035416); d = md5ff(d, a, b, c, x[9], 12, -1958414417);
      c = md5ff(c, d, a, b, x[10], 17, -42063); b = md5ff(b, c, d, a, x[11], 22, -1990404162);
      a = md5ff(a, b, c, d, x[12], 7, 1804603682); d = md5ff(d, a, b, c, x[13], 12, -40341101);
      c = md5ff(c, d, a, b, x[14], 17, -1502002290); b = md5ff(b, c, d, a, x[15], 22, 1236535329);

      a = md5gg(a, b, c, d, x[1], 5, -165796510); d = md5gg(d, a, b, c, x[6], 9, -1069501632);
      c = md5gg(c, d, a, b, x[11], 14, 643717713); b = md5gg(b, c, d, a, x[0], 20, -373897302);
      a = md5gg(a, b, c, d, x[5], 5, -701558691); d = md5gg(d, a, b, c, x[10], 9, 38016083);
      c = md5gg(c, d, a, b, x[15], 14, -660478335); b = md5gg(b, c, d, a, x[4], 20, -405537848);
      a = md5gg(a, b, c, d, x[9], 5, 568446438); d = md5gg(d, a, b, c, x[14], 9, -1019803690);
      c = md5gg(c, d, a, b, x[3], 14, -187363961); b = md5gg(b, c, d, a, x[8], 20, 1163531501);
      a = md5gg(a, b, c, d, x[13], 5, -1444681467); d = md5gg(d, a, b, c, x[2], 9, -51403784);
      c = md5gg(c, d, a, b, x[7], 14, 1735328473); b = md5gg(b, c, d, a, x[12], 20, -1926607734);

      a = md5hh(a, b, c, d, x[5], 4, -378558); d = md5hh(d, a, b, c, x[8], 11, -2022574463);
      c = md5hh(c, d, a, b, x[11], 16, 1839030562); b = md5hh(b, c, d, a, x[14], 23, -35309556);
      a = md5hh(a, b, c, d, x[1], 4, -1530992060); d = md5hh(d, a, b, c, x[4], 11, 1272893353);
      c = md5hh(c, d, a, b, x[7], 16, -155497632); b = md5hh(b, c, d, a, x[10], 23, -1094730640);
      a = md5hh(a, b, c, d, x[13], 4, 681279174); d = md5hh(d, a, b, c, x[0], 11, -358537222);
      c = md5hh(c, d, a, b, x[3], 16, -722521979); b = md5hh(b, c, d, a, x[6], 23, 76029189);
      a = md5hh(a, b, c, d, x[9], 4, -640364487); d = md5hh(d, a, b, c, x[12], 11, -421815835);
      c = md5hh(c, d, a, b, x[15], 16, 530742520); b = md5hh(b, c, d, a, x[2], 23, -995338651);

      a = md5ii(a, b, c, d, x[0], 6, -198630844); d = md5ii(d, a, b, c, x[7], 10, 1126891415);
      c = md5ii(c, d, a, b, x[14], 15, -1416354905); b = md5ii(b, c, d, a, x[5], 21, -57434055);
      a = md5ii(a, b, c, d, x[12], 6, 1700485571); d = md5ii(d, a, b, c, x[3], 10, -1894986606);
      c = md5ii(c, d, a, b, x[10], 15, -1051523); b = md5ii(b, c, d, a, x[1], 21, -2054922799);
      a = md5ii(a, b, c, d, x[8], 6, 1873313359); d = md5ii(d, a, b, c, x[15], 10, -30611744);
      c = md5ii(c, d, a, b, x[6], 15, -1560198380); b = md5ii(b, c, d, a, x[13], 21, 1309151649);
      a = md5ii(a, b, c, d, x[4], 6, -145523070); d = md5ii(d, a, b, c, x[11], 10, -1120210379);
      c = md5ii(c, d, a, b, x[2], 15, 718787259); b = md5ii(b, c, d, a, x[9], 21, -343485551);

      a = safeAdd(a, olda); b = safeAdd(b, oldb); c = safeAdd(c, oldc); d = safeAdd(d, oldd);
    }

    const out = new Uint8Array(16);
    out[0] = a & 0xff; out[1] = (a >>> 8) & 0xff; out[2] = (a >>> 16) & 0xff; out[3] = (a >>> 24) & 0xff;
    out[4] = b & 0xff; out[5] = (b >>> 8) & 0xff; out[6] = (b >>> 16) & 0xff; out[7] = (b >>> 24) & 0xff;
    out[8] = c & 0xff; out[9] = (c >>> 8) & 0xff; out[10] = (c >>> 16) & 0xff; out[11] = (c >>> 24) & 0xff;
    out[12] = d & 0xff; out[13] = (d >>> 8) & 0xff; out[14] = (d >>> 16) & 0xff; out[15] = (d >>> 24) & 0xff;
    return out;
  }

  // Pure JS RC4 Stream Cipher
  function rc4(key, data) {
    const s = new Uint8Array(256);
    for (let i = 0; i < 256; i++) s[i] = i;
    let j = 0;
    for (let i = 0; i < 256; i++) {
      j = (j + s[i] + key[i % key.length]) & 255;
      const tmp = s[i]; s[i] = s[j]; s[j] = tmp;
    }
    let i = 0; j = 0;
    const out = new Uint8Array(data.length);
    for (let k = 0; k < data.length; k++) {
      i = (i + 1) & 255;
      j = (j + s[i]) & 255;
      const tmp = s[i]; s[i] = s[j]; s[j] = tmp;
      out[k] = data[k] ^ s[(s[i] + s[j]) & 255];
    }
    return out;
  }

  function padPassword(pwdStr) {
    const out = new Uint8Array(32);
    const str = pwdStr || '';
    for (let i = 0; i < 32; i++) {
      if (i < str.length) {
        out[i] = str.charCodeAt(i) & 0xff;
      } else {
        out[i] = PADDING[i - str.length];
      }
    }
    return out;
  }

  function computeOwnerKey(userPassword, ownerPassword, keyLength = 16) {
    const ownerPadded = padPassword(ownerPassword || userPassword);
    let hash = md5(ownerPadded);
    for (let i = 0; i < 50; i++) {
      hash = md5(hash.subarray(0, keyLength));
    }
    const key = hash.subarray(0, keyLength);
    let userPadded = padPassword(userPassword);
    let oValue = rc4(key, userPadded);

    for (let i = 1; i <= 19; i++) {
      const xorKey = new Uint8Array(key.length);
      for (let k = 0; k < key.length; k++) xorKey[k] = key[k] ^ i;
      oValue = rc4(xorKey, oValue);
    }
    return oValue;
  }

  function computeEncryptionKey(userPassword, oValue, permissions, fileIdBytes, keyLength = 16) {
    const userPadded = padPassword(userPassword);
    const permBytes = new Uint8Array(4);
    permBytes[0] = permissions & 0xff;
    permBytes[1] = (permissions >> 8) & 0xff;
    permBytes[2] = (permissions >> 16) & 0xff;
    permBytes[3] = (permissions >> 24) & 0xff;

    const totalLen = userPadded.length + oValue.length + 4 + (fileIdBytes ? fileIdBytes.length : 0);
    const combined = new Uint8Array(totalLen);
    combined.set(userPadded, 0);
    combined.set(oValue, userPadded.length);
    combined.set(permBytes, userPadded.length + oValue.length);
    if (fileIdBytes && fileIdBytes.length > 0) {
      combined.set(fileIdBytes, userPadded.length + oValue.length + 4);
    }

    let hash = md5(combined);
    for (let i = 0; i < 50; i++) {
      hash = md5(hash.subarray(0, keyLength));
    }
    return hash.subarray(0, keyLength);
  }

  function computeUserKey(encryptionKey, fileIdBytes, keyLength = 16) {
    const totalLen = PADDING.length + (fileIdBytes ? fileIdBytes.length : 0);
    const combined = new Uint8Array(totalLen);
    combined.set(PADDING, 0);
    if (fileIdBytes && fileIdBytes.length > 0) {
      combined.set(fileIdBytes, PADDING.length);
    }
    let hash = md5(combined);

    let uValue = rc4(encryptionKey, hash);
    for (let i = 1; i <= 19; i++) {
      const xorKey = new Uint8Array(encryptionKey.length);
      for (let k = 0; k < encryptionKey.length; k++) xorKey[k] = encryptionKey[k] ^ i;
      uValue = rc4(xorKey, uValue);
    }

    const result = new Uint8Array(32);
    result.set(uValue.subarray(0, 16), 0);
    result.set(PADDING.subarray(0, 16), 16);
    return result;
  }

  function computeObjectKey(encryptionKey, objNum, genNum) {
    const combined = new Uint8Array(encryptionKey.length + 5);
    combined.set(encryptionKey, 0);
    combined[encryptionKey.length] = objNum & 0xff;
    combined[encryptionKey.length + 1] = (objNum >> 8) & 0xff;
    combined[encryptionKey.length + 2] = (objNum >> 16) & 0xff;
    combined[encryptionKey.length + 3] = genNum & 0xff;
    combined[encryptionKey.length + 4] = (genNum >> 8) & 0xff;

    const hash = md5(combined);
    const keyLen = Math.min(16, encryptionKey.length + 5);
    return hash.subarray(0, keyLen);
  }

  function toHex(uint8Array) {
    let hex = '';
    for (let i = 0; i < uint8Array.length; i++) {
      hex += uint8Array[i].toString(16).padStart(2, '0');
    }
    return hex;
  }

  function encryptPDFBytes(pdfBytes, userPassword, ownerPassword = '', permissions = -64) {
    const fileIdBytes = new Uint8Array(16);
    if (window.crypto && window.crypto.getRandomValues) {
      window.crypto.getRandomValues(fileIdBytes);
    } else {
      for (let i = 0; i < 16; i++) fileIdBytes[i] = (Math.random() * 256) | 0;
    }
    const fileIdHex = toHex(fileIdBytes);

    const oValue = computeOwnerKey(userPassword, ownerPassword || userPassword, 16);
    const encKey = computeEncryptionKey(userPassword, oValue, permissions, fileIdBytes, 16);
    const uValue = computeUserKey(encKey, fileIdBytes, 16);

    const src = pdfBytes instanceof Uint8Array ? pdfBytes : new Uint8Array(pdfBytes);
    let srcStr = '';
    for (let i = 0; i < src.length; i++) {
      srcStr += String.fromCharCode(src[i]);
    }

    const objRegex = /(\d+)\s+(\d+)\s+obj([\s\S]*?)endobj/g;
    let match;
    const objects = [];
    let maxObjNum = 0;

    while ((match = objRegex.exec(srcStr)) !== null) {
      const objNum = parseInt(match[1], 10);
      const genNum = parseInt(match[2], 10);
      const bodyStr = match[3];
      const fullMatchStart = match.index;

      if (objNum > maxObjNum) maxObjNum = objNum;

      const streamIdx = bodyStr.indexOf('stream');
      if (streamIdx !== -1) {
        let streamDataStart = fullMatchStart + (match[0].indexOf('stream') + 6);
        if (src[streamDataStart] === 0x0d && src[streamDataStart + 1] === 0x0a) {
          streamDataStart += 2;
        } else if (src[streamDataStart] === 0x0a || src[streamDataStart] === 0x0d) {
          streamDataStart += 1;
        }

        const endStreamIdx = srcStr.indexOf('endstream', streamDataStart);
        let streamDataEnd = endStreamIdx;
        if (src[streamDataEnd - 2] === 0x0d && src[streamDataEnd - 1] === 0x0a) {
          streamDataEnd -= 2;
        } else if (src[streamDataEnd - 1] === 0x0a || src[streamDataEnd - 1] === 0x0d) {
          streamDataEnd -= 1;
        }

        const dictPart = bodyStr.substring(0, streamIdx);
        const streamBytes = src.subarray(streamDataStart, streamDataEnd);

        objects.push({
          objNum,
          genNum,
          hasStream: true,
          dictPart,
          streamBytes
        });
      } else {
        objects.push({
          objNum,
          genNum,
          hasStream: false,
          body: bodyStr
        });
      }
    }

    function encryptStringsInDict(dictText, objKey) {
      let res = '';
      let i = 0;
      while (i < dictText.length) {
        if (dictText[i] === '(') {
          let depth = 1;
          let strBytes = [];
          let j = i + 1;
          while (j < dictText.length && depth > 0) {
            if (dictText[j] === '\\' && j + 1 < dictText.length) {
              const next = dictText[j + 1];
              if (next === 'n') strBytes.push(10);
              else if (next === 'r') strBytes.push(13);
              else if (next === 't') strBytes.push(9);
              else if (next === 'b') strBytes.push(8);
              else if (next === 'f') strBytes.push(12);
              else if (next === '(') strBytes.push(40);
              else if (next === ')') strBytes.push(41);
              else if (next === '\\') strBytes.push(92);
              else strBytes.push(dictText.charCodeAt(j + 1));
              j += 2;
            } else if (dictText[j] === '(') {
              depth++;
              strBytes.push(dictText.charCodeAt(j));
              j++;
            } else if (dictText[j] === ')') {
              depth--;
              if (depth > 0) strBytes.push(dictText.charCodeAt(j));
              j++;
            } else {
              strBytes.push(dictText.charCodeAt(j));
              j++;
            }
          }
          const encStr = rc4(objKey, new Uint8Array(strBytes));
          res += '<' + toHex(encStr) + '>';
          i = j;
        } else {
          res += dictText[i];
          i++;
        }
      }
      return res;
    }

    const encryptObjNum = maxObjNum + 1;
    const encryptObjStr = `${encryptObjNum} 0 obj\n<< /Filter /Standard /V 2 /R 3 /Length 128 /P ${permissions} /O <${toHex(oValue)}> /U <${toHex(uValue)}> >>\nendobj\n`;

    const chunks = [];
    let totalSize = 0;
    function pushChunk(uint8) {
      chunks.push(uint8);
      totalSize += uint8.length;
    }
    function strToBytes(str) {
      const arr = new Uint8Array(str.length);
      for (let i = 0; i < str.length; i++) arr[i] = str.charCodeAt(i) & 0xff;
      return arr;
    }

    const xrefOffsets = {};
    pushChunk(strToBytes('%PDF-1.7\n%\xFF\xFF\xFF\xFF\n'));

    for (const obj of objects) {
      xrefOffsets[obj.objNum] = totalSize;
      const objKey = computeObjectKey(encKey, obj.objNum, obj.genNum);

      if (obj.hasStream) {
        const encStream = rc4(objKey, obj.streamBytes);
        let dictText = encryptStringsInDict(obj.dictPart, objKey);
        dictText = dictText.replace(/\/Length\s+\d+/, `/Length ${encStream.length}`);

        const prefix = strToBytes(`${obj.objNum} ${obj.genNum} obj\n${dictText.trim()}\nstream\r\n`);
        const suffix = strToBytes(`\r\nendstream\nendobj\n`);

        pushChunk(prefix);
        pushChunk(encStream);
        pushChunk(suffix);
      } else {
        const encBody = encryptStringsInDict(obj.body, objKey);
        pushChunk(strToBytes(`${obj.objNum} ${obj.genNum} obj\n${encBody.trim()}\nendobj\n`));
      }
    }

    xrefOffsets[encryptObjNum] = totalSize;
    pushChunk(strToBytes(encryptObjStr));

    const trailerMatch = srcStr.match(/trailer[\s\S]*?<<([\s\S]*?)>>/);
    let rootRef = '/Root 1 0 R';
    let infoRef = '';
    if (trailerMatch) {
      const rootMatch = trailerMatch[1].match(/\/Root\s+(\d+\s+\d+\s+R)/);
      if (rootMatch) rootRef = `/Root ${rootMatch[1]}`;
      const infoMatch = trailerMatch[1].match(/\/Info\s+(\d+\s+\d+\s+R)/);
      if (infoMatch) infoRef = `/Info ${infoMatch[1]}`;
    }

    const startXref = totalSize;
    const totalObjs = encryptObjNum + 1;

    let xrefStr = `xref\n0 ${totalObjs}\n0000000000 65535 f \n`;
    for (let i = 1; i <= encryptObjNum; i++) {
      const off = xrefOffsets[i] || 0;
      xrefStr += off.toString().padStart(10, '0') + ' 00000 n \n';
    }

    const trailerStr = `trailer\n<<\n  /Size ${totalObjs}\n  ${rootRef}\n  ${infoRef}\n  /Encrypt ${encryptObjNum} 0 R\n  /ID [<${fileIdHex}> <${fileIdHex}>]\n>>\nstartxref\n${startXref}\n%%EOF\n`;

    pushChunk(strToBytes(xrefStr + trailerStr));

    const finalPdf = new Uint8Array(totalSize);
    let ptr = 0;
    for (const ch of chunks) {
      finalPdf.set(ch, ptr);
      ptr += ch.length;
    }
    return finalPdf;
  }

  function init() {
    dom = {
      container: document.getElementById('tool-pdf-protect'),
      dropzone: document.getElementById('pp-dropzone'),
      fileInput: document.getElementById('pp-file-input'),
      browseBtn: document.getElementById('pp-browse-btn'),
      workspace: document.getElementById('pp-workspace'),
      emptyState: document.getElementById('pp-empty-state'),
      
      // File Details
      fileNameText: document.getElementById('pp-file-name'),
      fileSizeText: document.getElementById('pp-file-size'),
      pageCountText: document.getElementById('pp-page-count'),
      
      // Password Inputs
      passwordInput: document.getElementById('pp-password-input'),
      confirmPasswordInput: document.getElementById('pp-confirm-input'),
      passwordFeedback: document.getElementById('pp-password-feedback'),
      togglePasswordBtn: document.getElementById('pp-toggle-pwd-btn'),
      
      // Advanced Permissions
      restrictPrinting: document.getElementById('pp-restrict-printing'),
      restrictCopying: document.getElementById('pp-restrict-copying'),
      restrictModifying: document.getElementById('pp-restrict-modifying'),
      
      // Actions
      protectBtn: document.getElementById('pp-protect-btn'),
      downloadBtn: document.getElementById('pp-download-btn'),
      resetBtn: document.getElementById('pp-reset-btn'),
      progressBar: document.getElementById('pp-progress-bar'),
      progressContainer: document.getElementById('pp-progress-container'),
      progressText: document.getElementById('pp-progress-text')
    };

    if (!dom.container) return;

    bindEvents();
  }

  function bindEvents() {
    Utils.setupDropZone(dom.dropzone, handleFiles, ['.pdf', 'application/pdf']);
    dom.browseBtn.addEventListener('click', () => dom.fileInput.click());
    dom.fileInput.addEventListener('change', (e) => {
      handleFiles(Array.from(e.target.files));
      dom.fileInput.value = '';
    });

    if (dom.passwordInput && dom.confirmPasswordInput) {
      dom.passwordInput.addEventListener('input', validatePasswordMatch);
      dom.confirmPasswordInput.addEventListener('input', validatePasswordMatch);
    }

    if (dom.togglePasswordBtn) {
      dom.togglePasswordBtn.addEventListener('click', () => {
        const isPwd = dom.passwordInput.type === 'password';
        dom.passwordInput.type = isPwd ? 'text' : 'password';
        dom.confirmPasswordInput.type = isPwd ? 'text' : 'password';
        dom.togglePasswordBtn.textContent = isPwd ? 'Hide' : 'Show';
      });
    }

    dom.protectBtn.addEventListener('click', protectPDF);
    dom.downloadBtn.addEventListener('click', downloadProtectedPDF);
    dom.resetBtn.addEventListener('click', resetTool);
  }

  function validatePasswordMatch() {
    if (!dom.passwordInput || !dom.confirmPasswordInput) return;
    const pwd = dom.passwordInput.value;
    const confirm = dom.confirmPasswordInput.value;

    if (!confirm && !pwd) {
      dom.confirmPasswordInput.classList.remove('input-error', 'input-success');
      dom.passwordInput.classList.remove('input-error', 'input-success');
      if (dom.passwordFeedback) {
        dom.passwordFeedback.className = 'password-feedback-msg hidden';
        dom.passwordFeedback.textContent = '';
      }
      return;
    }

    if (!confirm) {
      dom.confirmPasswordInput.classList.remove('input-error', 'input-success');
      if (dom.passwordFeedback) {
        dom.passwordFeedback.className = 'password-feedback-msg hidden';
        dom.passwordFeedback.textContent = '';
      }
      return;
    }

    if (pwd !== confirm) {
      dom.confirmPasswordInput.classList.add('input-error');
      dom.confirmPasswordInput.classList.remove('input-success');
      if (dom.passwordFeedback) {
        dom.passwordFeedback.className = 'password-feedback-msg error';
        dom.passwordFeedback.innerHTML = `
          <svg viewBox="0 0 20 20" fill="currentColor" style="width: 16px; height: 16px; flex-shrink: 0;"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd"/></svg>
          <span>Passwords do not match!</span>
        `;
        dom.passwordFeedback.classList.remove('hidden');
      }
    } else {
      dom.confirmPasswordInput.classList.remove('input-error');
      dom.confirmPasswordInput.classList.add('input-success');
      if (dom.passwordFeedback) {
        dom.passwordFeedback.className = 'password-feedback-msg success';
        dom.passwordFeedback.innerHTML = `
          <svg viewBox="0 0 20 20" fill="currentColor" style="width: 16px; height: 16px; flex-shrink: 0;"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/></svg>
          <span>Passwords match perfectly!</span>
        `;
        dom.passwordFeedback.classList.remove('hidden');
      }
    }
  }

  async function handleFiles(files) {
    if (!files || files.length === 0) return;
    const file = files[0];

    if (!file.name.toLowerCase().endsWith('.pdf') && file.type !== 'application/pdf') {
      const ext = Utils.getExtension(file.name);
      if (/^(jpg|jpeg|png|webp|gif|bmp|svg)$/i.test(ext) || file.type.startsWith('image/')) {
        Utils.showToast(`You uploaded an image file ("${file.name}"). PDF Protect only accepts PDF documents.`, 'warning');
      } else {
        Utils.showToast(`Invalid file format ("${file.name}"). Please upload a valid PDF document.`, 'warning');
      }
      return;
    }

    Utils.setProcessing(true);
    showProgress(25, 'Loading PDF document...');

    try {
      const buffer = await Utils.readFileAsArrayBuffer(file);
      let pdfDoc = null;
      try {
        pdfDoc = await PDFLib.PDFDocument.load(buffer);
      } catch (err) {
        if (err.message && err.message.toLowerCase().includes('password')) {
          throw new Error('This PDF is already encrypted / password protected.');
        }
        throw err;
      }

      const pageCount = pdfDoc.getPageCount();

      currentFile = {
        file,
        name: file.name,
        size: file.size,
        buffer,
        pageCount
      };

      dom.fileNameText.textContent = file.name;
      dom.fileSizeText.textContent = Utils.formatBytes(file.size);
      dom.pageCountText.textContent = `${pageCount} page${pageCount > 1 ? 's' : ''}`;

      dom.emptyState.classList.add('hidden');
      dom.workspace.classList.remove('hidden');
      dom.downloadBtn.classList.add('hidden');
      dom.protectBtn.classList.remove('hidden');
      dom.protectBtn.disabled = false;

      Utils.showToast(`Loaded "${file.name}". Enter a password to encrypt.`, 'info');
    } catch (err) {
      console.error(err);
      Utils.showToast(err.message || 'Failed to load PDF.', 'error');
      resetTool();
    } finally {
      Utils.setProcessing(false);
      hideProgress();
    }
  }

  async function protectPDF() {
    if (!currentFile) return;

    const password = dom.passwordInput.value;
    const confirm = dom.confirmPasswordInput.value;

    if (!password) {
      Utils.showToast('Please enter a password.', 'warning');
      dom.passwordInput.focus();
      return;
    }

    if (password.length < 3) {
      Utils.showToast('Password should be at least 3 characters long.', 'warning');
      return;
    }

    if (password !== confirm) {
      Utils.showToast('Passwords do not match! Please check again.', 'error');
      dom.confirmPasswordInput.focus();
      return;
    }

    Utils.setProcessing(true);
    showProgress(35, 'Preparing PDF structures for encryption...');

    try {
      // 1. Normalize and clean PDF into uncompressed object format with PDFLib
      const srcDoc = await PDFLib.PDFDocument.load(currentFile.buffer, { ignoreEncryption: true });
      const rawPdfBytes = await srcDoc.save({ useObjectStreams: false, addDefaultPage: false });

      showProgress(65, 'Applying PDF Standard 128-bit encryption cipher...');

      // Calculate permissions bitmask (-64 is default unrestricted permissions with bit 3-6 flags)
      // Bit 3: print, Bit 4: modify, Bit 5: copy, Bit 6: annot
      let permissions = -64;
      if (dom.restrictPrinting && dom.restrictPrinting.checked) {
        permissions &= ~(1 << 2); // Disallow printing
      }
      if (dom.restrictCopying && dom.restrictCopying.checked) {
        permissions &= ~(1 << 4); // Disallow copying text/graphics
      }
      if (dom.restrictModifying && dom.restrictModifying.checked) {
        permissions &= ~(1 << 3); // Disallow modifying document
      }

      // 2. Encrypt with pure JS standard PDF Security Handler
      const ownerPassword = password + '_owner_' + Date.now();
      const encryptedBytes = encryptPDFBytes(rawPdfBytes, password, ownerPassword, permissions);

      showProgress(90, 'Finalizing encrypted PDF package...');

      protectedPdfBlob = new Blob([encryptedBytes], { type: 'application/pdf' });

      dom.protectBtn.classList.add('hidden');
      dom.downloadBtn.classList.remove('hidden');
      dom.downloadBtn.disabled = false;

      Utils.showToast('PDF encrypted successfully! Password protection is active. 🔒', 'success');
    } catch (err) {
      console.error(err);
      Utils.showToast('Failed to encrypt PDF: ' + err.message, 'error');
    } finally {
      Utils.setProcessing(false);
      hideProgress();
    }
  }

  function downloadProtectedPDF() {
    if (!protectedPdfBlob || !currentFile) return;
    const base = Utils.getBaseName(currentFile.name);
    Utils.downloadBlob(protectedPdfBlob, `${base}-protected.pdf`);
  }

  function resetTool() {
    currentFile = null;
    protectedPdfBlob = null;

    if (dom.passwordInput) {
      dom.passwordInput.value = '';
      dom.passwordInput.classList.remove('input-error', 'input-success');
    }
    if (dom.confirmPasswordInput) {
      dom.confirmPasswordInput.value = '';
      dom.confirmPasswordInput.classList.remove('input-error', 'input-success');
    }
    if (dom.passwordFeedback) {
      dom.passwordFeedback.className = 'password-feedback-msg hidden';
      dom.passwordFeedback.textContent = '';
    }

    if (dom.emptyState) dom.emptyState.classList.remove('hidden');
    if (dom.workspace) dom.workspace.classList.add('hidden');
    if (dom.downloadBtn) dom.downloadBtn.classList.add('hidden');
    if (dom.protectBtn) {
      dom.protectBtn.classList.remove('hidden');
      dom.protectBtn.disabled = false;
    }

    hideProgress();
  }

  function showProgress(percent, text) {
    if (dom.progressContainer) dom.progressContainer.classList.remove('hidden');
    if (dom.progressBar) dom.progressBar.style.width = `${percent}%`;
    if (dom.progressText) dom.progressText.textContent = text;
  }

  function hideProgress() {
    if (dom.progressContainer) dom.progressContainer.classList.add('hidden');
  }

  return {
    init,
    handleFiles,
    reset: resetTool
  };
})();

window.PDFProtect = PDFProtect;
