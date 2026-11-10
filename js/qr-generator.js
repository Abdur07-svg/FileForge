/**
 * FileForge - Advanced Unified Multi-Purpose QR Code Generator Studio
 * Fully client-side, privacy-first QR Code generation, customization & export
 * 
 * Features:
 *  - 6 QR Types: Website URL, UPI Payment, Wi-Fi Network, Plain Text, Email, Phone
 *  - Dynamic Input Forms with Real-time Validation (UPI VPA format, Wi-Fi security toggle)
 *  - Unified Customization Engine (Preserves styles & frames across all QR types)
 *  - 45 Style Presets across 9 Themes with visual QR thumbnails
 *  - 52 Frame Presets across 7 Themes with visual preview thumbnails
 *  - Fine-tune Design Studio with "Custom Modified" indicator & "Reset to Preset" option
 *  - Dedicated Label Text Customizer (position, typography, padding, colors)
 *  - Real-time Preview with contrast & quiet-zone warnings
 *  - Comprehensive Exports: High-res PNG, Vector SVG, Client-side A4 PDF (PDFLib), Print, Copy Image & Text
 */

const QRCodeGenerator = (() => {
  let qrInstance = null;
  let updateDebounceTimer = null;
  let cachedBaseQRCanvas = null;
  let currentCompositeCanvas = null;
  const styleThumbnailSvgCache = new Map();
  const frameThumbnailSvgCache = new Map();

  const DEFAULT_OPTIONS = {
    qrType: 'url',
    typeData: {
      url: { url: 'https://abdur07-svg.github.io/FileForge/' },
      upi: { pa: '', pn: '', am: '', tn: '' },
      wifi: { ssid: '', auth: 'WPA', pass: '', hidden: false },
      text: { text: 'Welcome to FileForge!' },
      email: { addr: '', sub: '', body: '' },
      phone: { number: '' }
    },

    // Style presets & fine-tune
    activePresetId: 'classic-pure',
    patternStyle: 'square',
    cornerSquareStyle: 'square',
    cornerDotStyle: 'square',
    colorFg: '#121214',
    colorBg: '#ffffff',
    colorEye: '#121214',
    customEyeColor: false,
    gradientEnabled: false,
    colorFg2: '#9333ea',
    bgTransparent: false,
    isFineTuneModified: false,

    // Frames & CTA
    activeFrameId: 'frame-none',
    frameText: 'SCAN ME',
    userHasEditedCtaText: false,
    frameColor: '#121214',
    frameTextColor: '#ffffff',
    frameBg: '#ffffff',

    // Output Settings
    size: 320,
    margin: 10,
    errorCorrection: 'M',

    // Label Typography
    labelText: '',
    labelPosition: 'bottom',
    labelFontSize: 16,
    labelFontFamily: 'Inter, sans-serif',
    labelFontWeight: '600',
    labelTextColor: '#121214',
    labelBgColor: 'transparent',
    labelAlign: 'center',
    labelPadding: 12
  };

  let state = JSON.parse(JSON.stringify(DEFAULT_OPTIONS));

  function init() {
    initDesktop();
  }

  function initDesktop() {
    const container = document.getElementById('tool-qr-generator');
    if (!container) return;

    renderStylePresetsGallery('desktop', 'all');
    renderFramesGallery('desktop', 'all');
    bindDesktopEvents();
    renderLiveQR('desktop');
  }

  function getFrameRenderer() {
    return window.QRFrameRenderer || (typeof QRFrameRenderer !== 'undefined' ? QRFrameRenderer : null);
  }

  function getPresetsData() {
    return window.QR_PRESETS_DATA || (typeof QR_PRESETS_DATA !== 'undefined' ? QR_PRESETS_DATA : null);
  }

  /**
   * Generates effective string payload based on active QR Type
   */
  function getEffectiveData() {
    const type = state.qrType || 'url';
    const td = state.typeData || {};

    if (type === 'url') {
      const urlInput = document.getElementById('qr-url-input');
      let raw = urlInput ? urlInput.value.trim() : (td.url ? td.url.url : '');
      if (!raw) return 'https://abdur07-svg.github.io/FileForge/';
      if (!/^https?:\/\//i.test(raw) && !/^mailto:/i.test(raw) && !/^tel:/i.test(raw)) {
        return 'https://' + raw;
      }
      return raw;
    }

    if (type === 'upi') {
      const paInput = document.getElementById('qr-upi-pa');
      const pnInput = document.getElementById('qr-upi-pn');
      const amInput = document.getElementById('qr-upi-am');
      const tnInput = document.getElementById('qr-upi-tn');

      const pa = paInput ? paInput.value.trim() : (td.upi ? td.upi.pa : '');
      const pn = pnInput ? pnInput.value.trim() : (td.upi ? td.upi.pn : '');
      const am = amInput ? amInput.value.trim() : (td.upi ? td.upi.am : '');
      const tn = tnInput ? tnInput.value.trim() : (td.upi ? td.upi.tn : '');

      if (!pa) return 'upi://pay?pa=merchant@upi&cu=INR';

      let upi = `upi://pay?pa=${encodeURIComponent(pa)}&cu=INR`;
      if (pn) upi += `&pn=${encodeURIComponent(pn)}`;
      if (am && !isNaN(Number(am)) && Number(am) > 0) {
        upi += `&am=${encodeURIComponent(Number(am).toFixed(2))}`;
      }
      if (tn) upi += `&tn=${encodeURIComponent(tn)}`;
      return upi;
    }

    if (type === 'wifi') {
      const ssidInput = document.getElementById('qr-wifi-ssid');
      const authInput = document.getElementById('qr-wifi-auth');
      const passInput = document.getElementById('qr-wifi-pass');
      const hiddenInput = document.getElementById('qr-wifi-hidden');

      const ssid = ssidInput ? ssidInput.value : (td.wifi ? td.wifi.ssid : '');
      const auth = authInput ? authInput.value : (td.wifi ? td.wifi.auth : 'WPA');
      const pass = passInput ? passInput.value : (td.wifi ? td.wifi.pass : '');
      const hidden = hiddenInput ? hiddenInput.checked : (td.wifi ? td.wifi.hidden : false);

      const escapeWifi = (str) => (str || '').replace(/([\\;,":])/g, '\\$1');

      if (!ssid) return 'WIFI:S:MyWiFi;T:WPA;P:password;;';

      if (auth === 'nopass') {
        return `WIFI:S:${escapeWifi(ssid)};T:nopass;${hidden ? 'H:true;' : ''};`;
      }
      return `WIFI:S:${escapeWifi(ssid)};T:${auth};P:${escapeWifi(pass)};${hidden ? 'H:true;' : ''};`;
    }

    if (type === 'text') {
      const textInput = document.getElementById('qr-text-input');
      const raw = textInput ? textInput.value : (td.text ? td.text.text : '');
      return raw || 'Welcome to FileForge!';
    }

    if (type === 'email') {
      const addrInput = document.getElementById('qr-email-addr');
      const subInput = document.getElementById('qr-email-sub');
      const bodyInput = document.getElementById('qr-email-body');

      const addr = addrInput ? addrInput.value.trim() : (td.email ? td.email.addr : '');
      const sub = subInput ? subInput.value.trim() : (td.email ? td.email.sub : '');
      const body = bodyInput ? bodyInput.value : (td.email ? td.email.body : '');

      if (!addr) return 'mailto:contact@example.com';

      const params = [];
      if (sub) params.push(`subject=${encodeURIComponent(sub)}`);
      if (body) params.push(`body=${encodeURIComponent(body)}`);

      return `mailto:${addr}${params.length ? '?' + params.join('&') : ''}`;
    }

    if (type === 'phone') {
      const phoneInput = document.getElementById('qr-phone-number');
      const num = phoneInput ? phoneInput.value.trim() : (td.phone ? td.phone.number : '');
      if (!num) return 'tel:+18005550199';
      return `tel:${num.replace(/[^0-9+]/g, '')}`;
    }

    return 'https://abdur07-svg.github.io/FileForge/';
  }

  /**
   * Validate UPI VPA syntax (without claiming external bank check)
   */
  function validateUpiId(pa) {
    if (!pa) return { valid: false, message: 'Format check' };
    const valid = /^[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z]{2,64}$/.test(pa);
    return {
      valid,
      message: valid ? 'Valid format' : 'Invalid format (e.g. name@bank)'
    };
  }

  function updateUpiValidationUI(targetContext = 'desktop') {
    const paInput = document.getElementById(targetContext === 'mobile' ? 'mqr-upi-pa' : 'qr-upi-pa');
    const badge = document.getElementById(targetContext === 'mobile' ? 'mqr-upi-validation-badge' : 'qr-upi-validation-badge');
    if (!badge) return;

    const pa = paInput ? paInput.value.trim() : '';
    if (!pa) {
      badge.textContent = 'Format check';
      badge.className = 'qr-syntax-badge';
      return;
    }
    const res = validateUpiId(pa);
    badge.textContent = res.message;
    badge.className = `qr-syntax-badge ${res.valid ? 'valid' : 'invalid'}`;
  }

  /**
   * Cache current inputs to preserve state when switching types
   */
  function cacheInputs(targetContext = 'desktop') {
    if (!state.typeData) state.typeData = {};
    const type = state.qrType || 'url';

    if (type === 'url') {
      const el = document.getElementById(targetContext === 'mobile' ? 'mqr-url-input' : 'qr-url-input');
      if (el) state.typeData.url = { url: el.value };
    } else if (type === 'upi') {
      const pa = document.getElementById(targetContext === 'mobile' ? 'mqr-upi-pa' : 'qr-upi-pa');
      const pn = document.getElementById(targetContext === 'mobile' ? 'mqr-upi-pn' : 'qr-upi-pn');
      const am = document.getElementById(targetContext === 'mobile' ? 'mqr-upi-am' : 'qr-upi-am');
      const tn = document.getElementById(targetContext === 'mobile' ? 'mqr-upi-tn' : 'qr-upi-tn');
      state.typeData.upi = {
        pa: pa ? pa.value : '',
        pn: pn ? pn.value : '',
        am: am ? am.value : '',
        tn: tn ? tn.value : ''
      };
    } else if (type === 'wifi') {
      const ssid = document.getElementById(targetContext === 'mobile' ? 'mqr-wifi-ssid' : 'qr-wifi-ssid');
      const auth = document.getElementById(targetContext === 'mobile' ? 'mqr-wifi-auth' : 'qr-wifi-auth');
      const pass = document.getElementById(targetContext === 'mobile' ? 'mqr-wifi-pass' : 'qr-wifi-pass');
      const hidden = document.getElementById(targetContext === 'mobile' ? 'mqr-wifi-hidden' : 'qr-wifi-hidden');
      state.typeData.wifi = {
        ssid: ssid ? ssid.value : '',
        auth: auth ? auth.value : 'WPA',
        pass: pass ? pass.value : '',
        hidden: hidden ? hidden.checked : false
      };
    } else if (type === 'text') {
      const el = document.getElementById(targetContext === 'mobile' ? 'mqr-text-input' : 'qr-text-input');
      if (el) state.typeData.text = { text: el.value };
    } else if (type === 'email') {
      const addr = document.getElementById(targetContext === 'mobile' ? 'mqr-email-addr' : 'qr-email-addr');
      const sub = document.getElementById(targetContext === 'mobile' ? 'mqr-email-sub' : 'qr-email-sub');
      const body = document.getElementById(targetContext === 'mobile' ? 'mqr-email-body' : 'qr-email-body');
      state.typeData.email = {
        addr: addr ? addr.value : '',
        sub: sub ? sub.value : '',
        body: body ? body.value : ''
      };
    } else if (type === 'phone') {
      const el = document.getElementById(targetContext === 'mobile' ? 'mqr-phone-number' : 'qr-phone-number');
      if (el) state.typeData.phone = { number: el.value };
    }
  }

  /**
   * Restore cached inputs into form fields
   */
  function restoreInputs(type, targetContext = 'desktop') {
    if (!state.typeData) return;
    const td = state.typeData;

    if (type === 'url' && td.url) {
      const el = document.getElementById(targetContext === 'mobile' ? 'mqr-url-input' : 'qr-url-input');
      if (el && td.url.url !== undefined) el.value = td.url.url;
    } else if (type === 'upi' && td.upi) {
      const pa = document.getElementById(targetContext === 'mobile' ? 'mqr-upi-pa' : 'qr-upi-pa');
      const pn = document.getElementById(targetContext === 'mobile' ? 'mqr-upi-pn' : 'qr-upi-pn');
      const am = document.getElementById(targetContext === 'mobile' ? 'mqr-upi-am' : 'qr-upi-am');
      const tn = document.getElementById(targetContext === 'mobile' ? 'mqr-upi-tn' : 'qr-upi-tn');
      if (pa && td.upi.pa !== undefined) pa.value = td.upi.pa;
      if (pn && td.upi.pn !== undefined) pn.value = td.upi.pn;
      if (am && td.upi.am !== undefined) am.value = td.upi.am;
      if (tn && td.upi.tn !== undefined) tn.value = td.upi.tn;
      updateUpiValidationUI(targetContext);
    } else if (type === 'wifi' && td.wifi) {
      const ssid = document.getElementById(targetContext === 'mobile' ? 'mqr-wifi-ssid' : 'qr-wifi-ssid');
      const auth = document.getElementById(targetContext === 'mobile' ? 'mqr-wifi-auth' : 'qr-wifi-auth');
      const pass = document.getElementById(targetContext === 'mobile' ? 'mqr-wifi-pass' : 'qr-wifi-pass');
      const hidden = document.getElementById(targetContext === 'mobile' ? 'mqr-wifi-hidden' : 'qr-wifi-hidden');
      if (ssid && td.wifi.ssid !== undefined) ssid.value = td.wifi.ssid;
      if (auth && td.wifi.auth !== undefined) auth.value = td.wifi.auth;
      if (pass && td.wifi.pass !== undefined) pass.value = td.wifi.pass;
      if (hidden && td.wifi.hidden !== undefined) hidden.checked = td.wifi.hidden;

      const passGroup = document.getElementById(targetContext === 'mobile' ? 'mqr-wifi-pass-group' : 'qr-wifi-pass-group');
      if (passGroup) {
        passGroup.style.display = (auth && auth.value === 'nopass') ? 'none' : '';
      }
    } else if (type === 'text' && td.text) {
      const el = document.getElementById(targetContext === 'mobile' ? 'mqr-text-input' : 'qr-text-input');
      const counter = document.getElementById(targetContext === 'mobile' ? 'mqr-text-counter' : 'qr-text-counter');
      if (el && td.text.text !== undefined) {
        el.value = td.text.text;
        if (counter) counter.textContent = `${el.value.length} characters`;
      }
    } else if (type === 'email' && td.email) {
      const addr = document.getElementById(targetContext === 'mobile' ? 'mqr-email-addr' : 'qr-email-addr');
      const sub = document.getElementById(targetContext === 'mobile' ? 'mqr-email-sub' : 'qr-email-sub');
      const body = document.getElementById(targetContext === 'mobile' ? 'mqr-email-body' : 'qr-email-body');
      if (addr && td.email.addr !== undefined) addr.value = td.email.addr;
      if (sub && td.email.sub !== undefined) sub.value = td.email.sub;
      if (body && td.email.body !== undefined) body.value = td.email.body;
    } else if (type === 'phone' && td.phone) {
      const el = document.getElementById(targetContext === 'mobile' ? 'mqr-phone-number' : 'qr-phone-number');
      if (el && td.phone.number !== undefined) el.value = td.phone.number;
    }
  }

  /**
   * Switch active QR Type
   */
  function switchQRType(type, targetContext = 'desktop') {
    if (state.qrType === type) return;

    cacheInputs(targetContext);
    state.qrType = type;

    // Update active card highlight
    const selectorId = targetContext === 'mobile' ? 'mqr-type-selector' : 'qr-type-selector';
    const grid = document.getElementById(selectorId);
    if (grid) {
      const cardClass = targetContext === 'mobile' ? '.mqr-type-card' : '.qr-type-card';
      grid.querySelectorAll(cardClass).forEach(c => {
        c.classList.toggle('active', c.getAttribute('data-type') === type);
      });
    }

    // Toggle dynamic form display
    const types = ['url', 'upi', 'wifi', 'text', 'email', 'phone'];
    types.forEach(t => {
      const paneId = targetContext === 'mobile' ? `mqr-pane-${t}` : `qr-tab-${t}`;
      const pane = document.getElementById(paneId);
      if (pane) {
        pane.classList.toggle('hidden', t !== type);
      }
    });

    restoreInputs(type, targetContext);
    renderLiveQR(targetContext);
  }

  /**
   * Build QRCodeStyling configuration
   */
  function buildQRConfig(pixelSize) {
    const size = pixelSize || state.size || 320;
    const data = getEffectiveData();
    const ecLevel = state.errorCorrection || 'M';

    const cornerSquareColor = state.customEyeColor ? state.colorEye : state.colorFg;
    const cornerDotColor = state.customEyeColor ? state.colorEye : state.colorFg;

    const dotsOptions = {
      type: state.patternStyle
    };

    if (state.gradientEnabled) {
      dotsOptions.gradient = {
        type: 'linear',
        rotation: 0,
        colorStops: [
          { offset: 0, color: state.colorFg },
          { offset: 1, color: state.colorFg2 || '#9333ea' }
        ]
      };
    } else {
      dotsOptions.color = state.colorFg;
    }

    const config = {
      width: size,
      height: size,
      type: 'canvas',
      data: data,
      margin: parseInt(state.margin, 10) || 10,
      qrOptions: {
        typeNumber: 0,
        mode: 'Byte',
        errorCorrectionLevel: ecLevel
      },
      dotsOptions: dotsOptions,
      cornersSquareOptions: {
        type: state.cornerSquareStyle,
        color: cornerSquareColor
      },
      cornersDotOptions: {
        type: state.cornerDotStyle,
        color: cornerDotColor
      },
      backgroundOptions: {
        color: state.bgTransparent ? 'transparent' : state.colorBg
      }
    };

    return config;
  }

  /**
   * Re-composite preview using cached base QR
   */
  function updateCompositePreview(targetContext = 'desktop') {
    if (!cachedBaseQRCanvas) {
      renderLiveQR(targetContext);
      return;
    }

    const renderer = getFrameRenderer();
    const presetsData = getPresetsData();

    const framePreset = (presetsData && presetsData.FRAME_PRESETS)
      ? presetsData.FRAME_PRESETS.find(f => f.id === state.activeFrameId)
      : null;

    const frameOptions = {
      color: state.frameColor,
      textColor: state.frameTextColor,
      bgColor: state.frameBg,
      text: state.frameText !== undefined ? state.frameText : (framePreset ? framePreset.defaultText : 'SCAN ME')
    };

    const labelOptions = {
      text: state.labelText,
      position: state.labelPosition,
      fontSize: state.labelFontSize,
      fontFamily: state.labelFontFamily,
      fontWeight: state.labelFontWeight,
      textColor: state.labelTextColor,
      bgColor: state.labelBgColor,
      align: state.labelAlign,
      padding: state.labelPadding
    };

    let composite = cachedBaseQRCanvas;
    if (renderer && typeof renderer.renderComposite === 'function') {
      composite = renderer.renderComposite(cachedBaseQRCanvas, framePreset, frameOptions, labelOptions);
    }

    currentCompositeCanvas = composite;

    const mountId = targetContext === 'mobile' ? 'mobile-qr-preview-mount' : 'qr-preview-mount';
    const mount = document.getElementById(mountId);
    if (mount) {
      mount.innerHTML = '';
      mount.appendChild(composite);
    }

    updateInfoSection(targetContext);
  }

  /**
   * Render Live QR code from scratch
   */
  async function renderLiveQR(targetContext = 'desktop') {
    const mountId = targetContext === 'mobile' ? 'mobile-qr-preview-mount' : 'qr-preview-mount';
    const mount = document.getElementById(mountId);
    if (!mount) return;

    if (typeof window.QRCodeStyling === 'undefined') {
      mount.innerHTML = '<div style="padding:20px; color:#ef4444; text-align:center;">QR Engine loading...</div>';
      return;
    }

    try {
      const config = buildQRConfig(state.size);
      qrInstance = new window.QRCodeStyling(config);

      const rawCanvas = await qrInstance._getElement('png');
      if (!rawCanvas) return;

      cachedBaseQRCanvas = rawCanvas;
      updateCompositePreview(targetContext);
    } catch (e) {
      console.error('Error generating QR Code:', e);
      mount.innerHTML = `<div style="padding:20px; color:#ef4444; font-size:0.8rem; text-align:center;">Generation error: ${e.message}</div>`;
    }
  }

  function scheduleUpdate(targetContext = 'desktop') {
    if (updateDebounceTimer) clearTimeout(updateDebounceTimer);
    updateDebounceTimer = setTimeout(() => {
      renderLiveQR(targetContext);
    }, 120);
  }

  function updateInfoSection(targetContext) {
    const data = getEffectiveData();
    const byteLength = new TextEncoder().encode(data).length;

    const typeLabels = {
      url: 'Website URL',
      upi: 'UPI Payment',
      wifi: 'Wi-Fi Network',
      text: 'Plain Text',
      email: 'Email Message',
      phone: 'Phone Call'
    };

    const typeEl = document.getElementById(targetContext === 'mobile' ? 'mobile-qr-info-type' : 'qr-info-type');
    const bytesEl = document.getElementById(targetContext === 'mobile' ? 'mobile-qr-info-bytes' : 'qr-info-bytes');
    const previewTextEl = document.getElementById(targetContext === 'mobile' ? 'mobile-qr-info-content' : 'qr-info-content');
    const warnEl = document.getElementById(targetContext === 'mobile' ? 'mobile-qr-contrast-warn' : 'qr-contrast-warn');

    if (typeEl) typeEl.textContent = typeLabels[state.qrType] || 'Custom';
    if (bytesEl) bytesEl.textContent = `${data.length} chars (${byteLength} bytes)`;
    if (previewTextEl) {
      previewTextEl.textContent = data.length > 60 ? data.substring(0, 57) + '...' : data;
      previewTextEl.title = data;
    }

    if (warnEl) {
      const isLowContrast = checkLowContrast(state.colorFg, state.colorBg);
      const isVeryDense = byteLength > 400;

      if (isLowContrast) {
        warnEl.textContent = 'Low contrast between QR and background. QR may be difficult to scan.';
        warnEl.classList.remove('hidden');
      } else if (isVeryDense) {
        warnEl.textContent = 'High content density. Recommend using "Large" download size or higher error recovery.';
        warnEl.classList.remove('hidden');
      } else {
        warnEl.classList.add('hidden');
      }
    }
  }

  function checkLowContrast(hex1, hex2) {
    function getLum(hex) {
      if (!hex || hex === 'transparent') return 1;
      const c = hex.replace('#', '');
      if (c.length !== 6) return 0.5;
      const r = parseInt(c.substr(0, 2), 16) / 255;
      const g = parseInt(c.substr(2, 2), 16) / 255;
      const b = parseInt(c.substr(4, 2), 16) / 255;
      return 0.2126 * r + 0.7152 * g + 0.0722 * b;
    }
    const l1 = getLum(hex1);
    const l2 = getLum(hex2);
    return Math.abs(l1 - l2) < 0.22;
  }

  /**
   * Fallback inline SVG generator for preset thumbnails to ensure previews NEVER fail
   */
  function generatePresetThumbnailFallback(preset) {
    const fg = preset.fgColor || '#121214';
    const bg = preset.bgColor || '#ffffff';
    const eye = preset.eyeColor || fg;
    return `<svg viewBox="0 0 48 48" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" style="border-radius: 6px; background: ${bg};">
      <rect width="48" height="48" fill="${bg}" rx="6"/>
      <rect x="5" y="5" width="12" height="12" rx="3" fill="none" stroke="${eye}" stroke-width="2.5"/>
      <circle cx="11" cy="11" r="2.8" fill="${eye}"/>
      <rect x="31" y="5" width="12" height="12" rx="3" fill="none" stroke="${eye}" stroke-width="2.5"/>
      <circle cx="37" cy="11" r="2.8" fill="${eye}"/>
      <rect x="5" y="31" width="12" height="12" rx="3" fill="none" stroke="${eye}" stroke-width="2.5"/>
      <circle cx="11" cy="37" r="2.8" fill="${eye}"/>
      <rect x="20" y="8" width="2.4" height="2.4" fill="${fg}"/> <rect x="24" y="8" width="2.4" height="2.4" fill="${fg}"/>
      <rect x="20" y="20" width="2.4" height="2.4" fill="${fg}"/> <rect x="24" y="20" width="2.4" height="2.4" fill="${fg}"/>
      <rect x="28" y="20" width="2.4" height="2.4" fill="${fg}"/> <rect x="32" y="20" width="2.4" height="2.4" fill="${fg}"/>
      <rect x="20" y="32" width="2.4" height="2.4" fill="${fg}"/> <rect x="24" y="32" width="2.4" height="2.4" fill="${fg}"/>
    </svg>`;
  }

  /**
   * Fallback inline SVG generator for frame thumbnails
   */
  function generateFrameThumbnailFallback(frame) {
    const text = (frame.defaultText || 'SCAN').toUpperCase();
    return `<svg viewBox="0 0 48 48" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
      <rect x="4" y="3" width="40" height="42" rx="5" fill="#FFFFFF" stroke="#CBD5E1" stroke-width="1.2"/>
      <rect x="12" y="35" width="24" height="6.5" rx="3" fill="#1E293B"/>
      <text x="24" y="39.5" fill="#FFFFFF" font-size="3.5" font-weight="bold" font-family="sans-serif" text-anchor="middle">${text}</text>
      <g transform="translate(14, 9) scale(0.42)">
        <rect x="0" y="0" width="14" height="14" rx="2" fill="none" stroke="#334155" stroke-width="2.6"/>
        <rect x="4" y="4" width="6" height="6" fill="#334155"/>
        <rect x="34" y="0" width="14" height="14" rx="2" fill="none" stroke="#334155" stroke-width="2.6"/>
        <rect x="38" y="4" width="6" height="6" fill="#334155"/>
        <rect x="0" y="34" width="14" height="14" rx="2" fill="none" stroke="#334155" stroke-width="2.6"/>
        <rect x="4" y="38" width="6" height="6" fill="#334155"/>
        <rect x="18" y="16" width="12" height="12" fill="#334155"/>
      </g>
    </svg>`;
  }

  /**
   * Render 45 Style Preset Cards
   */
  function renderStylePresetsGallery(targetContext = 'desktop', filterTheme = 'all') {
    const container = document.getElementById(targetContext === 'mobile' ? 'mqr-style-presets-gallery' : 'qr-style-presets-gallery');
    const presetsData = getPresetsData();
    if (!container || !presetsData) return;

    container.innerHTML = '';
    const presets = presetsData.STYLE_PRESETS;
    const renderer = getFrameRenderer();

    presets.forEach(preset => {
      if (filterTheme !== 'all' && preset.theme !== filterTheme) return;

      const card = document.createElement('div');
      card.className = `qr-gallery-card ${state.activePresetId === preset.id ? 'active' : ''}`;
      card.setAttribute('data-preset-id', preset.id);
      card.setAttribute('title', `${preset.name} (${preset.theme})`);

      let thumbSvg = styleThumbnailSvgCache.get(preset.id);
      if (!thumbSvg) {
        if (renderer && typeof renderer.generateStyleThumbnailSvg === 'function') {
          thumbSvg = renderer.generateStyleThumbnailSvg(preset);
        }
        if (!thumbSvg) {
          thumbSvg = generatePresetThumbnailFallback(preset);
        }
        if (thumbSvg) styleThumbnailSvgCache.set(preset.id, thumbSvg);
      }

      card.innerHTML = `
        <div class="qr-gallery-thumb">
          ${thumbSvg}
        </div>
        <span class="qr-gallery-name">${preset.name}</span>
      `;

      card.addEventListener('click', () => {
        applyStylePreset(preset, targetContext);
      });

      container.appendChild(card);
    });
  }

  /**
   * Apply a Style Preset
   */
  function applyStylePreset(preset, targetContext = 'desktop') {
    state.activePresetId = preset.id;
    state.patternStyle = preset.pattern;
    state.cornerSquareStyle = preset.cornerSq;
    state.cornerDotStyle = preset.cornerDot;
    state.colorFg = preset.fgColor;
    state.colorBg = preset.bgColor;
    state.colorEye = preset.eyeColor || preset.fgColor;
    state.customEyeColor = (preset.eyeColor !== preset.fgColor);
    state.gradientEnabled = false;
    state.bgTransparent = false;
    state.isFineTuneModified = false;

    // Update modified indicator
    updateModifiedBadge(targetContext);

    // Sync fine-tune inputs
    syncUIWithState(targetContext);

    // Update active highlight in gallery
    const container = document.getElementById(targetContext === 'mobile' ? 'mqr-style-presets-gallery' : 'qr-style-presets-gallery');
    if (container) {
      container.querySelectorAll('.qr-gallery-card').forEach(c => {
        c.classList.toggle('active', c.getAttribute('data-preset-id') === preset.id);
      });
    }

    scheduleUpdate(targetContext);
  }

  /**
   * Render 52 Frame Preset Cards
   */
  function renderFramesGallery(targetContext = 'desktop', filterTheme = 'all') {
    const container = document.getElementById(targetContext === 'mobile' ? 'mqr-frames-gallery' : 'qr-frames-gallery');
    const presetsData = getPresetsData();
    if (!container || !presetsData) return;

    container.innerHTML = '';
    const frames = presetsData.FRAME_PRESETS;
    const renderer = getFrameRenderer();

    frames.forEach(frame => {
      if (filterTheme !== 'all' && frame.theme !== filterTheme) return;

      const card = document.createElement('div');
      card.className = `qr-gallery-card ${state.activeFrameId === frame.id ? 'active' : ''}`;
      card.setAttribute('data-frame-id', frame.id);
      card.setAttribute('title', `${frame.name} (${frame.theme})`);

      let thumbSvg = frameThumbnailSvgCache.get(frame.id);
      if (!thumbSvg) {
        if (renderer && typeof renderer.generateFrameThumbnailSvg === 'function') {
          thumbSvg = renderer.generateFrameThumbnailSvg(frame);
        }
        if (!thumbSvg) {
          thumbSvg = generateFrameThumbnailFallback(frame);
        }
        if (thumbSvg) frameThumbnailSvgCache.set(frame.id, thumbSvg);
      }

      card.innerHTML = `
        <div class="qr-gallery-thumb">
          ${thumbSvg}
        </div>
        <span class="qr-gallery-name">${frame.name}</span>
      `;

      card.addEventListener('click', () => {
        applyFramePreset(frame, targetContext);
      });

      container.appendChild(card);
    });
  }

  /**
   * Apply a Frame Preset
   */
  function applyFramePreset(frame, targetContext = 'desktop') {
    state.activeFrameId = frame.id;

    const renderer = getFrameRenderer();
    const supportsCta = (renderer && typeof renderer.isFrameCtaSupported === 'function')
      ? renderer.isFrameCtaSupported(frame.type)
      : (frame.type !== 'none');

    const frameTextInput = document.getElementById(targetContext === 'mobile' ? 'mqr-frame-text-input' : 'qr-frame-text-input');
    if (frameTextInput) {
      if (!supportsCta) {
        frameTextInput.disabled = true;
        frameTextInput.placeholder = 'Selected frame has no text banner';
        frameTextInput.title = 'This frame design does not include a CTA text banner';
      } else {
        frameTextInput.disabled = false;
        frameTextInput.placeholder = 'e.g. SCAN ME, ORDER HERE, VISIT US';
        frameTextInput.title = '';
        if (!state.userHasEditedCtaText) {
          state.frameText = (frame.defaultText !== undefined) ? frame.defaultText : 'SCAN ME';
          frameTextInput.value = state.frameText;
        } else {
          frameTextInput.value = state.frameText;
        }
      }
    }

    // Update active highlight
    const container = document.getElementById(targetContext === 'mobile' ? 'mqr-frames-gallery' : 'qr-frames-gallery');
    if (container) {
      container.querySelectorAll('.qr-gallery-card').forEach(c => {
        c.classList.toggle('active', c.getAttribute('data-frame-id') === frame.id);
      });
    }

    updateCompositePreview(targetContext);
  }

  function markFineTuneModified(targetContext = 'desktop') {
    state.isFineTuneModified = true;
    updateModifiedBadge(targetContext);
  }

  function updateModifiedBadge(targetContext = 'desktop') {
    const badge = document.getElementById(targetContext === 'mobile' ? 'mqr-custom-modified-badge' : 'qr-custom-modified-badge');
    if (badge) {
      badge.classList.toggle('hidden', !state.isFineTuneModified);
    }
  }

  function resetToPreset(targetContext = 'desktop') {
    const presetsData = getPresetsData();
    if (!presetsData) return;

    const preset = presetsData.STYLE_PRESETS.find(p => p.id === state.activePresetId);
    if (preset) {
      applyStylePreset(preset, targetContext);
      showToast('Fine-tuned design reset to ' + preset.name, 'info');
    }
  }

  /**
   * Synchronize UI Controls with current State
   */
  function syncUIWithState(targetContext = 'desktop') {
    const prefix = targetContext === 'mobile' ? 'mqr-' : 'qr-';

    syncColorPair(`${prefix}color-fg`, `${prefix}color-fg-hex`, state.colorFg);
    syncColorPair(`${prefix}color-bg`, `${prefix}color-bg-hex`, state.colorBg);
    syncColorPair(`${prefix}color-eye`, `${prefix}color-eye-hex`, state.colorEye);
    syncColorPair(`${prefix}color-fg2`, `${prefix}color-fg2-hex`, state.colorFg2 || '#9333ea');
    updateSwatchDisplay(`${prefix}fg-swatch`, state.colorFg);
    updateSwatchDisplay(`${prefix}bg-swatch`, state.colorBg);
    updateSwatchDisplay(`${prefix}eye-swatch`, state.colorEye);
    updateSwatchDisplay(`${prefix}fg2-swatch`, state.colorFg2 || '#9333ea');

    const eyeCheck = document.getElementById(`${prefix}eye-custom-check`);
    const eyeRow = document.getElementById(`${prefix}eye-color-wrap`);
    if (eyeCheck) eyeCheck.checked = state.customEyeColor;
    if (eyeRow) eyeRow.classList.toggle('disabled-control', !state.customEyeColor);

    const gradCheck = document.getElementById(`${prefix}gradient-check`);
    const gradRow = document.getElementById(`${prefix}gradient-color-wrap`);
    if (gradCheck) gradCheck.checked = state.gradientEnabled;
    if (gradRow) gradRow.classList.toggle('disabled-control', !state.gradientEnabled);

    const bgTransCheck = document.getElementById(`${prefix}bg-trans-check`);
    const bgRow = document.getElementById(`${prefix}bg-color-wrap`);
    if (bgTransCheck) bgTransCheck.checked = state.bgTransparent;
    if (bgRow) bgRow.classList.toggle('disabled-control', state.bgTransparent);

    // Visual cards
    document.querySelectorAll(`#${prefix}pattern-group [data-pattern]`).forEach(c => {
      c.classList.toggle('active', c.getAttribute('data-pattern') === state.patternStyle);
    });
    const patLbl = document.getElementById(`${prefix}pattern-label`);
    if (patLbl) patLbl.textContent = state.patternStyle.toUpperCase();

    document.querySelectorAll(`#${prefix}corner-sq-group [data-corner-sq]`).forEach(c => {
      c.classList.toggle('active', c.getAttribute('data-corner-sq') === state.cornerSquareStyle);
    });
    document.querySelectorAll(`#${prefix}corner-dot-group [data-corner-dot]`).forEach(c => {
      c.classList.toggle('active', c.getAttribute('data-corner-dot') === state.cornerDotStyle);
    });

    updateModifiedBadge(targetContext);
  }

  function bindDesktopEvents() {
    // 1. Choose QR Type Cards Selection
    const typeCards = document.querySelectorAll('#qr-type-selector .qr-type-card');
    typeCards.forEach(card => {
      card.addEventListener('click', () => {
        const type = card.getAttribute('data-type');
        switchQRType(type, 'desktop');
      });
    });

    // Content inputs live sync
    const inputIds = [
      'qr-url-input',
      'qr-upi-pa', 'qr-upi-pn', 'qr-upi-am', 'qr-upi-tn',
      'qr-wifi-ssid', 'qr-wifi-pass',
      'qr-text-input',
      'qr-email-addr', 'qr-email-sub', 'qr-email-body',
      'qr-phone-number'
    ];

    inputIds.forEach(id => {
      const el = document.getElementById(id);
      if (el) {
        el.addEventListener('input', () => {
          if (id === 'qr-upi-pa') updateUpiValidationUI('desktop');
          scheduleUpdate('desktop');
        });
      }
    });

    // Wi-Fi security selector toggle
    const wifiAuth = document.getElementById('qr-wifi-auth');
    if (wifiAuth) {
      wifiAuth.addEventListener('change', () => {
        const passGroup = document.getElementById('qr-wifi-pass-group');
        if (passGroup) {
          passGroup.style.display = wifiAuth.value === 'nopass' ? 'none' : '';
        }
        scheduleUpdate('desktop');
      });
    }

    const wifiHidden = document.getElementById('qr-wifi-hidden');
    if (wifiHidden) {
      wifiHidden.addEventListener('change', () => scheduleUpdate('desktop'));
    }

    const textInput = document.getElementById('qr-text-input');
    const textCounter = document.getElementById('qr-text-counter');
    if (textInput && textCounter) {
      textInput.addEventListener('input', () => {
        textCounter.textContent = `${textInput.value.length} characters`;
      });
    }

    // 2. Customizer Studio Section Tabs
    const studioTabs = document.querySelectorAll('#qr-studio-tabs .qr-customizer-tab');
    studioTabs.forEach(tab => {
      tab.addEventListener('click', () => {
        studioTabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        const target = tab.getAttribute('data-tab');

        document.querySelectorAll('.qr-customizer-panel').forEach(p => p.classList.add('hidden'));
        const activePanel = document.getElementById(`qr-panel-${target}`);
        if (activePanel) activePanel.classList.remove('hidden');
      });
    });

    // 3. Style Presets Theme Pills
    const styleThemePills = document.querySelectorAll('#qr-style-theme-nav .qr-theme-pill');
    styleThemePills.forEach(pill => {
      pill.addEventListener('click', () => {
        styleThemePills.forEach(p => p.classList.remove('active'));
        pill.classList.add('active');
        const theme = pill.getAttribute('data-style-theme');
        renderStylePresetsGallery('desktop', theme);
      });
    });

    // 4. Frame Presets Theme Pills
    const frameThemePills = document.querySelectorAll('#qr-frame-theme-nav .qr-theme-pill');
    frameThemePills.forEach(pill => {
      pill.addEventListener('click', () => {
        frameThemePills.forEach(p => p.classList.remove('active'));
        pill.classList.add('active');
        const theme = pill.getAttribute('data-frame-theme');
        renderFramesGallery('desktop', theme);
      });
    });

    // Frame CTA text & colors
    const frameTextInput = document.getElementById('qr-frame-text-input');
    if (frameTextInput) {
      frameTextInput.addEventListener('input', () => {
        state.userHasEditedCtaText = true;
        state.frameText = frameTextInput.value;
        updateCompositePreview('desktop');
      });
    }

    bindSwatchTrigger('qr-frame-swatch', 'qr-frame-color');
    bindColorPair('qr-frame-color', 'qr-frame-color-hex', (c) => {
      state.frameColor = c;
      updateSwatchDisplay('qr-frame-swatch', c);
      updateCompositePreview('desktop');
    });

    bindSwatchTrigger('qr-frame-text-swatch', 'qr-frame-text-color');
    bindColorPair('qr-frame-text-color', 'qr-frame-text-hex', (c) => {
      state.frameTextColor = c;
      updateSwatchDisplay('qr-frame-text-swatch', c);
      updateCompositePreview('desktop');
    });

    bindSwatchTrigger('qr-frame-bg-swatch', 'qr-frame-bg-color');
    bindColorPair('qr-frame-bg-color', 'qr-frame-bg-hex', (c) => {
      state.frameBg = c;
      updateSwatchDisplay('qr-frame-bg-swatch', c);
      updateCompositePreview('desktop');
    });

    // 5. Label Text Controls
    const labelInput = document.getElementById('qr-label-text-input');
    if (labelInput) {
      labelInput.addEventListener('input', () => {
        state.labelText = labelInput.value;
        updateCompositePreview('desktop');
      });
    }

    const labelPosBtns = document.querySelectorAll('#qr-label-pos-group .qr-segmented-btn');
    labelPosBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        labelPosBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        state.labelPosition = btn.getAttribute('data-pos');
        updateCompositePreview('desktop');
      });
    });

    const labelFont = document.getElementById('qr-label-font');
    if (labelFont) {
      labelFont.addEventListener('change', () => {
        state.labelFontFamily = labelFont.value;
        updateCompositePreview('desktop');
      });
    }

    const labelWeightBtns = document.querySelectorAll('#qr-label-weight-group .qr-segmented-btn');
    labelWeightBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        labelWeightBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        state.labelFontWeight = btn.getAttribute('data-weight');
        updateCompositePreview('desktop');
      });
    });

    const labelSizeSlider = document.getElementById('qr-label-size');
    const labelSizeVal = document.getElementById('qr-label-size-val');
    if (labelSizeSlider && labelSizeVal) {
      labelSizeSlider.addEventListener('input', () => {
        const val = parseInt(labelSizeSlider.value, 10);
        state.labelFontSize = val;
        labelSizeVal.textContent = `${val}px`;
        updateCompositePreview('desktop');
      });
    }

    const labelPadSlider = document.getElementById('qr-label-pad');
    const labelPadVal = document.getElementById('qr-label-pad-val');
    if (labelPadSlider && labelPadVal) {
      labelPadSlider.addEventListener('input', () => {
        const val = parseInt(labelPadSlider.value, 10);
        state.labelPadding = val;
        labelPadVal.textContent = `${val}px`;
        updateCompositePreview('desktop');
      });
    }

    const labelAlignBtns = document.querySelectorAll('#qr-label-align-group .qr-segmented-btn');
    labelAlignBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        labelAlignBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        state.labelAlign = btn.getAttribute('data-align');
        updateCompositePreview('desktop');
      });
    });

    bindSwatchTrigger('qr-label-color-swatch', 'qr-label-color');
    bindColorPair('qr-label-color', 'qr-label-color-hex', (c) => {
      state.labelTextColor = c;
      updateSwatchDisplay('qr-label-color-swatch', c);
      updateCompositePreview('desktop');
    });

    bindSwatchTrigger('qr-label-bg-swatch', 'qr-label-bg');
    bindColorPair('qr-label-bg', 'qr-label-bg-hex', (c) => {
      state.labelBgColor = c;
      updateSwatchDisplay('qr-label-bg-swatch', c);
      updateCompositePreview('desktop');
    });

    const labelBgTransCheck = document.getElementById('qr-label-bg-trans-check');
    const labelBgWrap = document.getElementById('qr-label-bg-wrap');
    if (labelBgTransCheck) {
      labelBgTransCheck.addEventListener('change', () => {
        if (labelBgWrap) labelBgWrap.classList.toggle('disabled-control', labelBgTransCheck.checked);
        state.labelBgColor = labelBgTransCheck.checked ? 'transparent' : (document.getElementById('qr-label-bg')?.value || '#ffffff');
        updateCompositePreview('desktop');
      });
    }

    // 6. Fine-tune Design Controls
    const resetPresetBtn = document.getElementById('qr-reset-preset-btn');
    if (resetPresetBtn) {
      resetPresetBtn.addEventListener('click', () => resetToPreset('desktop'));
    }

    bindSwatchTrigger('qr-fg-swatch', 'qr-color-fg');
    bindSwatchTrigger('qr-bg-swatch', 'qr-color-bg');
    bindSwatchTrigger('qr-eye-swatch', 'qr-color-eye');
    bindSwatchTrigger('qr-fg2-swatch', 'qr-color-fg2');

    bindColorPair('qr-color-fg', 'qr-color-fg-hex', (c) => {
      state.colorFg = c;
      updateSwatchDisplay('qr-fg-swatch', c);
      if (!state.customEyeColor) {
        state.colorEye = c;
        updateSwatchDisplay('qr-eye-swatch', c);
      }
      markFineTuneModified('desktop');
      scheduleUpdate('desktop');
    });

    bindColorPair('qr-color-bg', 'qr-color-bg-hex', (c) => {
      state.colorBg = c;
      updateSwatchDisplay('qr-bg-swatch', c);
      markFineTuneModified('desktop');
      scheduleUpdate('desktop');
    });

    bindColorPair('qr-color-eye', 'qr-color-eye-hex', (c) => {
      state.colorEye = c;
      updateSwatchDisplay('qr-eye-swatch', c);
      state.customEyeColor = true;
      const eyeCheck = document.getElementById('qr-eye-custom-check');
      if (eyeCheck) eyeCheck.checked = true;
      const eyeRow = document.getElementById('qr-eye-color-wrap');
      if (eyeRow) eyeRow.classList.remove('disabled-control');
      markFineTuneModified('desktop');
      scheduleUpdate('desktop');
    });

    const eyeCheck = document.getElementById('qr-eye-custom-check');
    const eyeRow = document.getElementById('qr-eye-color-wrap');
    if (eyeCheck) {
      eyeCheck.addEventListener('change', () => {
        state.customEyeColor = eyeCheck.checked;
        if (eyeRow) eyeRow.classList.toggle('disabled-control', !eyeCheck.checked);
        if (!eyeCheck.checked) {
          state.colorEye = state.colorFg;
          syncColorPair('qr-color-eye', 'qr-color-eye-hex', state.colorFg);
          updateSwatchDisplay('qr-eye-swatch', state.colorFg);
        }
        markFineTuneModified('desktop');
        scheduleUpdate('desktop');
      });
    }

    // Gradient toggle & color
    const gradCheck = document.getElementById('qr-gradient-check');
    const gradRow = document.getElementById('qr-gradient-color-wrap');
    if (gradCheck) {
      gradCheck.addEventListener('change', () => {
        state.gradientEnabled = gradCheck.checked;
        if (gradRow) gradRow.classList.toggle('disabled-control', !gradCheck.checked);
        markFineTuneModified('desktop');
        scheduleUpdate('desktop');
      });
    }

    bindColorPair('qr-color-fg2', 'qr-color-fg2-hex', (c) => {
      state.colorFg2 = c;
      updateSwatchDisplay('qr-fg2-swatch', c);
      markFineTuneModified('desktop');
      scheduleUpdate('desktop');
    });

    // Background transparency toggle
    const bgTransCheck = document.getElementById('qr-bg-trans-check');
    const bgRow = document.getElementById('qr-bg-color-wrap');
    if (bgTransCheck) {
      bgTransCheck.addEventListener('change', () => {
        state.bgTransparent = bgTransCheck.checked;
        if (bgRow) bgRow.classList.toggle('disabled-control', bgTransCheck.checked);
        markFineTuneModified('desktop');
        scheduleUpdate('desktop');
      });
    }

    // Pattern style selector
    const patternCards = document.querySelectorAll('#qr-pattern-group [data-pattern]');
    const patternLabel = document.getElementById('qr-pattern-label');
    patternCards.forEach(card => {
      card.addEventListener('click', () => {
        patternCards.forEach(c => c.classList.remove('active'));
        card.classList.add('active');
        const pat = card.getAttribute('data-pattern');
        state.patternStyle = pat;
        if (patternLabel) patternLabel.textContent = pat.toUpperCase();
        markFineTuneModified('desktop');
        scheduleUpdate('desktop');
      });
    });

    // Corner square selector
    const cornerSqCards = document.querySelectorAll('#qr-corner-sq-group [data-corner-sq]');
    cornerSqCards.forEach(card => {
      card.addEventListener('click', () => {
        cornerSqCards.forEach(c => c.classList.remove('active'));
        card.classList.add('active');
        state.cornerSquareStyle = card.getAttribute('data-corner-sq');
        markFineTuneModified('desktop');
        scheduleUpdate('desktop');
      });
    });

    // Corner dot selector
    const cornerDotCards = document.querySelectorAll('#qr-corner-dot-group [data-corner-dot]');
    cornerDotCards.forEach(card => {
      card.addEventListener('click', () => {
        cornerDotCards.forEach(c => c.classList.remove('active'));
        card.classList.add('active');
        state.cornerDotStyle = card.getAttribute('data-corner-dot');
        markFineTuneModified('desktop');
        scheduleUpdate('desktop');
      });
    });

    // 7. Settings Panel Controls
    const sizeBtns = document.querySelectorAll('#qr-size-group .qr-segmented-btn');
    sizeBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        sizeBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        state.size = parseInt(btn.getAttribute('data-size'), 10) || 320;
        scheduleUpdate('desktop');
      });
    });

    const marginBtns = document.querySelectorAll('#qr-margin-group .qr-segmented-btn');
    marginBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        marginBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        state.margin = parseInt(btn.getAttribute('data-margin'), 10);
        scheduleUpdate('desktop');
      });
    });

    const ecBtns = document.querySelectorAll('#qr-ec-group .qr-segmented-btn');
    ecBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        ecBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        state.errorCorrection = btn.getAttribute('data-ec');
        scheduleUpdate('desktop');
      });
    });

    // Reset button
    const resetBtn = document.getElementById('qr-reset-btn');
    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        reset();
        showToast('QR settings restored to defaults', 'info');
      });
    }

    // 8. Downloads
    const dlPngBtn = document.getElementById('qr-dl-png');
    if (dlPngBtn) {
      dlPngBtn.addEventListener('click', () => downloadExport('png', 'desktop'));
    }

    const dlSvgBtn = document.getElementById('qr-dl-svg');
    if (dlSvgBtn) {
      dlSvgBtn.addEventListener('click', () => downloadExport('svg', 'desktop'));
    }
  }

  /**
   * High-resolution synchronous Canvas to Blob
   */
  function canvasToBlobSync(canvas, mimeType = 'image/png') {
    try {
      const dataUrl = canvas.toDataURL(mimeType);
      const parts = dataUrl.split(';base64,');
      const contentType = parts[0].split(':')[1] || mimeType;
      const raw = atob(parts[1]);
      const rawLength = raw.length;
      const uInt8Array = new Uint8Array(rawLength);
      for (let i = 0; i < rawLength; ++i) {
        uInt8Array[i] = raw.charCodeAt(i);
      }
      return new Blob([uInt8Array], { type: contentType });
    } catch (e) {
      console.warn('Sync canvas-to-blob fallback:', e);
      return null;
    }
  }

  /**
   * PDF Export using PDFLib (A4 Page, High-Res Composite QR centered)
   */
  async function exportToPDF(finalCanvas, filename = 'FileForge-QR-Code.pdf') {
    if (!finalCanvas) return;
    try {
      const PDFLib = window.PDFLib;
      if (!PDFLib || !PDFLib.PDFDocument) {
        showToast('PDF library not loaded', 'error');
        return;
      }

      const dataUrl = finalCanvas.toDataURL('image/png');
      const base64Data = dataUrl.split(',')[1];
      const binaryStr = atob(base64Data);
      const len = binaryStr.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryStr.charCodeAt(i);
      }

      const pdfDoc = await PDFLib.PDFDocument.create();
      // Standard A4 portrait: 595.28 x 841.89 points
      const page = pdfDoc.addPage([595.28, 841.89]);
      const pngImage = await pdfDoc.embedPng(bytes);

      const displaySize = 340;
      const x = (595.28 - displaySize) / 2;
      const y = (841.89 - displaySize) / 2 + 20;

      page.drawImage(pngImage, {
        x: x,
        y: y,
        width: displaySize,
        height: displaySize
      });

      page.drawText('Generated by FileForge — Client-Side Private QR Generator', {
        x: 140,
        y: 40,
        size: 9,
        color: PDFLib.rgb(0.4, 0.4, 0.4)
      });

      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      saveExportBlob(blob, filename, 'application/pdf', 'desktop');
      showToast('Downloaded PDF successfully!', 'success');
    } catch (e) {
      console.error('PDF Export Error:', e);
      showToast('Failed to generate PDF: ' + e.message, 'error');
    }
  }

  async function downloadExport(format, targetContext = 'desktop') {
    try {
      const exportDimension = state.size >= 480 ? state.size : 800;
      const exportConfig = buildQRConfig(exportDimension);
      const exportQR = new window.QRCodeStyling(exportConfig);
      const exportCanvas = await exportQR._getElement('png');
      if (!exportCanvas) return;

      const presetsData = getPresetsData();
      const framePreset = (presetsData && presetsData.FRAME_PRESETS)
        ? presetsData.FRAME_PRESETS.find(f => f.id === state.activeFrameId)
        : null;

      const frameOptions = {
        color: state.frameColor,
        textColor: state.frameTextColor,
        bgColor: state.frameBg,
        text: state.frameText !== undefined ? state.frameText : (framePreset ? framePreset.defaultText : 'SCAN ME')
      };

      const fontScale = exportDimension / (targetContext === 'mobile' ? 240 : 320);
      const labelOptions = {
        text: state.labelText,
        position: state.labelPosition,
        fontSize: Math.round(state.labelFontSize * fontScale),
        fontFamily: state.labelFontFamily,
        fontWeight: state.labelFontWeight,
        textColor: state.labelTextColor,
        bgColor: state.labelBgColor,
        align: state.labelAlign,
        padding: Math.round(state.labelPadding * fontScale)
      };

      const renderer = getFrameRenderer();
      const finalCanvas = (renderer && typeof renderer.renderComposite === 'function')
        ? renderer.renderComposite(exportCanvas, framePreset, frameOptions, labelOptions)
        : exportCanvas;

      if (format === 'pdf') {
        await exportToPDF(finalCanvas, 'FileForge-QR-Code.pdf');
        return;
      }

      const ext = format === 'svg' ? 'svg' : 'png';
      const filename = `FileForge-QR-Code.${ext}`;

      if (format === 'svg') {
        let svgContent = '';
        if (renderer && typeof renderer.getCompositeSvg === 'function' && framePreset && framePreset.type !== 'none') {
          svgContent = renderer.getCompositeSvg(exportCanvas, framePreset, frameOptions, labelOptions);
        } else {
          const dataUrl = finalCanvas.toDataURL('image/png');
          svgContent = `<?xml version="1.0" encoding="utf-8"?>
<svg version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${finalCanvas.width}" height="${finalCanvas.height}" viewBox="0 0 ${finalCanvas.width} ${finalCanvas.height}">
  <image width="${finalCanvas.width}" height="${finalCanvas.height}" xlink:href="${dataUrl}"/>
</svg>`;
        }
        const blob = new Blob([svgContent], { type: 'image/svg+xml;charset=utf-8' });
        saveExportBlob(blob, filename, 'image/svg+xml', targetContext);
      } else {
        const syncBlob = canvasToBlobSync(finalCanvas, 'image/png');
        if (syncBlob) {
          saveExportBlob(syncBlob, filename, 'image/png', targetContext);
        } else {
          finalCanvas.toBlob(blob => {
            if (blob) {
              saveExportBlob(blob, filename, 'image/png', targetContext);
            }
          }, 'image/png');
        }
      }
    } catch (e) {
      console.error('Download QR error:', e);
      showToast('Error generating QR export: ' + e.message, 'error');
    }
  }

  function saveExportBlob(blob, filename, mimeType, targetContext) {
    if (targetContext === 'mobile' && window.MobileUtils && typeof window.MobileUtils.downloadBlob === 'function') {
      window.MobileUtils.downloadBlob(blob, filename, mimeType);
    } else if (window.Utils && typeof window.Utils.downloadBlob === 'function') {
      window.Utils.downloadBlob(blob, filename, mimeType);
    } else {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 2000);
      showToast(`Downloaded ${filename}`, 'success');
    }
  }

  function bindSwatchTrigger(swatchId, pickerId) {
    const swatch = document.getElementById(swatchId);
    const picker = document.getElementById(pickerId);
    if (swatch && picker) {
      swatch.addEventListener('click', () => picker.click());
    }
  }

  function updateSwatchDisplay(swatchId, color) {
    const el = document.getElementById(swatchId);
    if (el) el.style.backgroundColor = color;
  }

  function bindColorPair(pickerId, hexId, onChange) {
    const picker = document.getElementById(pickerId);
    const hex = document.getElementById(hexId);
    if (!picker || !hex) return;

    picker.addEventListener('input', () => {
      hex.value = picker.value.toUpperCase();
      onChange(picker.value);
    });

    hex.addEventListener('input', () => {
      let val = hex.value.trim();
      if (!val.startsWith('#')) val = '#' + val;
      if (/^#[0-9A-Fa-f]{6}$/.test(val)) {
        picker.value = val;
        onChange(val);
      }
    });
  }

  function syncColorPair(pickerId, hexId, color) {
    const picker = document.getElementById(pickerId);
    const hex = document.getElementById(hexId);
    if (picker) picker.value = color;
    if (hex) hex.value = color.toUpperCase();
  }

  function showToast(msg, type = 'info') {
    if (window.MobileUtils && typeof window.MobileUtils.showToast === 'function') {
      window.MobileUtils.showToast(msg, type);
    } else if (window.Utils && typeof window.Utils.showToast === 'function') {
      window.Utils.showToast(msg, type);
    } else {
      console.log(`[Toast ${type}]: ${msg}`);
    }
  }

  /**
   * Reset QR Tool completely to fresh default state
   */
  function reset() {
    if (updateDebounceTimer) {
      clearTimeout(updateDebounceTimer);
      updateDebounceTimer = null;
    }
    state = JSON.parse(JSON.stringify(DEFAULT_OPTIONS));
    cachedBaseQRCanvas = null;
    currentCompositeCanvas = null;
    qrInstance = null;

    try {
      const qrStorageKeys = [
        'fileforge_qr_data',
        'fileforge_qr_state',
        'fileforge_qr_config',
        'qr_generator_state',
        'qr_state'
      ];
      qrStorageKeys.forEach(key => {
        sessionStorage.removeItem(key);
        localStorage.removeItem(key);
      });
    } catch (e) {}

    // Reset input fields
    const urlInput = document.getElementById('qr-url-input');
    if (urlInput) urlInput.value = DEFAULT_OPTIONS.typeData.url.url;

    const upiPa = document.getElementById('qr-upi-pa');
    if (upiPa) upiPa.value = '';
    const upiPn = document.getElementById('qr-upi-pn');
    if (upiPn) upiPn.value = '';
    const upiAm = document.getElementById('qr-upi-am');
    if (upiAm) upiAm.value = '';
    const upiTn = document.getElementById('qr-upi-tn');
    if (upiTn) upiTn.value = '';
    updateUpiValidationUI('desktop');

    const wifiSsid = document.getElementById('qr-wifi-ssid');
    if (wifiSsid) wifiSsid.value = '';
    const wifiAuth = document.getElementById('qr-wifi-auth');
    if (wifiAuth) wifiAuth.value = 'WPA';
    const wifiPass = document.getElementById('qr-wifi-pass');
    if (wifiPass) wifiPass.value = '';
    const wifiHidden = document.getElementById('qr-wifi-hidden');
    if (wifiHidden) wifiHidden.checked = false;
    const wifiPassGroup = document.getElementById('qr-wifi-pass-group');
    if (wifiPassGroup) wifiPassGroup.style.display = '';

    const textInput = document.getElementById('qr-text-input');
    if (textInput) textInput.value = DEFAULT_OPTIONS.typeData.text.text;

    const textCounter = document.getElementById('qr-text-counter');
    if (textCounter) textCounter.textContent = '22 characters';

    const emailAddr = document.getElementById('qr-email-addr');
    if (emailAddr) emailAddr.value = '';
    const emailSub = document.getElementById('qr-email-sub');
    if (emailSub) emailSub.value = '';
    const emailBody = document.getElementById('qr-email-body');
    if (emailBody) emailBody.value = '';

    const phoneNum = document.getElementById('qr-phone-number');
    if (phoneNum) phoneNum.value = '';

    // Reset type cards
    const typeCards = document.querySelectorAll('#qr-type-selector .qr-type-card');
    typeCards.forEach(c => c.classList.toggle('active', c.getAttribute('data-type') === 'url'));

    const types = ['url', 'upi', 'wifi', 'text', 'email', 'phone'];
    types.forEach(t => {
      const pane = document.getElementById(`qr-tab-${t}`);
      if (pane) pane.classList.toggle('hidden', t !== 'url');
    });

    // Sub-navigation tabs (presets panel active)
    const customizerTabs = document.querySelectorAll('#qr-studio-tabs .qr-customizer-tab');
    customizerTabs.forEach(t => t.classList.toggle('active', t.getAttribute('data-tab') === 'presets'));

    const panels = document.querySelectorAll('#tool-qr-generator .qr-customizer-panel');
    panels.forEach(p => p.classList.add('hidden'));
    const panelPresets = document.getElementById('qr-panel-presets');
    if (panelPresets) panelPresets.classList.remove('hidden');

    // Style & Frame galleries
    const styleThemePills = document.querySelectorAll('#qr-style-theme-nav .qr-theme-pill');
    styleThemePills.forEach(p => p.classList.toggle('active', p.getAttribute('data-style-theme') === 'all'));
    renderStylePresetsGallery('desktop', 'all');

    const frameThemePills = document.querySelectorAll('#qr-frame-theme-nav .qr-theme-pill');
    frameThemePills.forEach(p => p.classList.toggle('active', p.getAttribute('data-frame-theme') === 'all'));
    renderFramesGallery('desktop', 'all');

    // Frame CTA text & colors
    const frameTextInput = document.getElementById('qr-frame-text-input');
    if (frameTextInput) {
      frameTextInput.value = DEFAULT_OPTIONS.frameText;
      frameTextInput.disabled = true;
      frameTextInput.placeholder = 'Selected frame has no text banner';
      frameTextInput.title = 'This frame design does not include a CTA text banner';
    }

    syncColorPair('qr-frame-color', 'qr-frame-color-hex', DEFAULT_OPTIONS.frameColor);
    updateSwatchDisplay('qr-frame-swatch', DEFAULT_OPTIONS.frameColor);
    syncColorPair('qr-frame-text-color', 'qr-frame-text-hex', DEFAULT_OPTIONS.frameTextColor);
    updateSwatchDisplay('qr-frame-text-swatch', DEFAULT_OPTIONS.frameTextColor);
    syncColorPair('qr-frame-bg-color', 'qr-frame-bg-hex', DEFAULT_OPTIONS.frameBg);
    updateSwatchDisplay('qr-frame-bg-swatch', DEFAULT_OPTIONS.frameBg);

    // Label text & typography
    const labelInput = document.getElementById('qr-label-text-input');
    if (labelInput) labelInput.value = '';

    const labelPosBtns = document.querySelectorAll('#qr-label-pos-group .qr-segmented-btn');
    labelPosBtns.forEach(b => b.classList.toggle('active', b.getAttribute('data-pos') === 'bottom'));

    const labelFont = document.getElementById('qr-label-font');
    if (labelFont) labelFont.value = 'Inter, sans-serif';

    const labelWeightBtns = document.querySelectorAll('#qr-label-weight-group .qr-segmented-btn');
    labelWeightBtns.forEach(b => b.classList.toggle('active', b.getAttribute('data-weight') === '600'));

    const labelSizeSlider = document.getElementById('qr-label-size');
    const labelSizeVal = document.getElementById('qr-label-size-val');
    if (labelSizeSlider) labelSizeSlider.value = '16';
    if (labelSizeVal) labelSizeVal.textContent = '16px';

    const labelPadSlider = document.getElementById('qr-label-pad');
    const labelPadVal = document.getElementById('qr-label-pad-val');
    if (labelPadSlider) labelPadSlider.value = '12';
    if (labelPadVal) labelPadVal.textContent = '12px';

    const labelAlignBtns = document.querySelectorAll('#qr-label-align-group .qr-segmented-btn');
    labelAlignBtns.forEach(b => b.classList.toggle('active', b.getAttribute('data-align') === 'center'));

    syncColorPair('qr-label-color', 'qr-label-color-hex', DEFAULT_OPTIONS.labelTextColor);
    updateSwatchDisplay('qr-label-color-swatch', DEFAULT_OPTIONS.labelTextColor);

    const labelBgTransCheck = document.getElementById('qr-label-bg-trans-check');
    const labelBgWrap = document.getElementById('qr-label-bg-wrap');
    if (labelBgTransCheck) labelBgTransCheck.checked = true;
    if (labelBgWrap) labelBgWrap.classList.add('disabled-control');
    syncColorPair('qr-label-bg', 'qr-label-bg-hex', '#FFFFFF');
    updateSwatchDisplay('qr-label-bg-swatch', '#FFFFFF');

    // Custom styles
    syncUIWithState('desktop');

    // Output settings
    const sizeBtns = document.querySelectorAll('#qr-size-group .qr-segmented-btn');
    sizeBtns.forEach(b => b.classList.toggle('active', b.getAttribute('data-size') === '320'));

    const marginBtns = document.querySelectorAll('#qr-margin-group .qr-segmented-btn');
    marginBtns.forEach(b => b.classList.toggle('active', b.getAttribute('data-margin') === '10'));

    const ecBtns = document.querySelectorAll('#qr-ec-group .qr-segmented-btn');
    ecBtns.forEach(b => b.classList.toggle('active', b.getAttribute('data-ec') === 'M'));

    renderLiveQR('desktop');
  }

  return {
    init,
    reset,
    renderLiveQR,
    scheduleUpdate,
    downloadExport,
    switchQRType,
    applyStylePreset,
    applyFramePreset,
    resetToPreset,
    getState: () => state,
    setState: (newState) => { state = { ...state, ...newState }; }
  };
})();

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => QRCodeGenerator.init());
  } else {
    QRCodeGenerator.init();
  }
}

if (typeof window !== 'undefined') {
  window.QRCodeGenerator = QRCodeGenerator;
}
if (typeof module !== 'undefined' && module.exports) {
  module.exports = QRCodeGenerator;
}
