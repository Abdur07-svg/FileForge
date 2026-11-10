/**
 * FileForge Mobile - Advanced Unified Multi-Purpose QR Code Generator Studio
 * Fully client-side, mobile touch-optimized QR generator controller
 * 
 * Features:
 *  - 6 QR Types: Website URL, UPI Payment, Wi-Fi Network, Plain Text, Email, Phone
 *  - Dynamic Input Forms with Real-time Validation (UPI VPA format, Wi-Fi security toggle)
 *  - Unified Customization Engine (Preserves styles & frames across all QR types)
 *  - 45 Style Presets across 9 Themes with visual QR thumbnails
 *  - 52 Frame Presets across 7 Themes with visual preview thumbnails
 *  - Fine-tune Design Studio with "Reset to Preset" option
 *  - Dedicated Label Text Customizer (position, typography, padding, colors)
 *  - Real-time Preview with contrast & quiet-zone warnings
 *  - Mobile QR Download Fix: Synchronous canvas-to-blob conversion to preserve user gesture token
 *  - Comprehensive Exports: High-res PNG, Vector SVG, Client-side A4 PDF (PDFLib), Print, Copy Image & Text
 */

const MobileQRCodeGenerator = (() => {
  let qrInstance = null;
  let updateDebounceTimer = null;
  let cachedBaseQRCanvas = null;
  let currentCompositeCanvas = null;

  const DEFAULT_OPTIONS = {
    qrType: 'url',
    typeData: {
      url: { url: 'https://abdur07-svg.github.io/FileForge/' },
      upi: { pa: '', pn: '', am: '', tn: '' },
      wifi: { ssid: '', auth: 'WPA', pass: '', hidden: false },
      text: { text: 'Welcome to FileForge Mobile!' },
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
    size: 280,
    margin: 8,
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
    const container = document.getElementById('tool-view-qr-generator');
    if (!container) return;

    renderStylePresetsGallery('all');
    renderFramesGallery('all');
    bindEvents();
    renderLiveQR();
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
      const urlInput = document.getElementById('mqr-url-input');
      let raw = urlInput ? urlInput.value.trim() : (td.url ? td.url.url : '');
      if (!raw) return 'https://abdur07-svg.github.io/FileForge/';
      if (!/^https?:\/\//i.test(raw) && !/^mailto:/i.test(raw) && !/^tel:/i.test(raw)) {
        return 'https://' + raw;
      }
      return raw;
    }

    if (type === 'upi') {
      const paInput = document.getElementById('mqr-upi-pa');
      const pnInput = document.getElementById('mqr-upi-pn');
      const amInput = document.getElementById('mqr-upi-am');
      const tnInput = document.getElementById('mqr-upi-tn');

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
      const ssidInput = document.getElementById('mqr-wifi-ssid');
      const authInput = document.getElementById('mqr-wifi-auth');
      const passInput = document.getElementById('mqr-wifi-pass');
      const hiddenInput = document.getElementById('mqr-wifi-hidden');

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
      const textInput = document.getElementById('mqr-text-input');
      const raw = textInput ? textInput.value : (td.text ? td.text.text : '');
      return raw || 'Welcome to FileForge Mobile!';
    }

    if (type === 'email') {
      const addrInput = document.getElementById('mqr-email-addr');
      const subInput = document.getElementById('mqr-email-sub');
      const bodyInput = document.getElementById('mqr-email-body');

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
      const phoneInput = document.getElementById('mqr-phone-number');
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

  function updateUpiValidationUI() {
    const paInput = document.getElementById('mqr-upi-pa');
    const badge = document.getElementById('mqr-upi-validation-badge');
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
   * Cache current inputs into typeData
   */
  function cacheInputs() {
    if (!state.typeData) state.typeData = {};
    const type = state.qrType || 'url';

    if (type === 'url') {
      const el = document.getElementById('mqr-url-input');
      if (el) state.typeData.url = { url: el.value };
    } else if (type === 'upi') {
      const pa = document.getElementById('mqr-upi-pa');
      const pn = document.getElementById('mqr-upi-pn');
      const am = document.getElementById('mqr-upi-am');
      const tn = document.getElementById('mqr-upi-tn');
      state.typeData.upi = {
        pa: pa ? pa.value : '',
        pn: pn ? pn.value : '',
        am: am ? am.value : '',
        tn: tn ? tn.value : ''
      };
    } else if (type === 'wifi') {
      const ssid = document.getElementById('mqr-wifi-ssid');
      const auth = document.getElementById('mqr-wifi-auth');
      const pass = document.getElementById('mqr-wifi-pass');
      const hidden = document.getElementById('mqr-wifi-hidden');
      state.typeData.wifi = {
        ssid: ssid ? ssid.value : '',
        auth: auth ? auth.value : 'WPA',
        pass: pass ? pass.value : '',
        hidden: hidden ? hidden.checked : false
      };
    } else if (type === 'text') {
      const el = document.getElementById('mqr-text-input');
      if (el) state.typeData.text = { text: el.value };
    } else if (type === 'email') {
      const addr = document.getElementById('mqr-email-addr');
      const sub = document.getElementById('mqr-email-sub');
      const body = document.getElementById('mqr-email-body');
      state.typeData.email = {
        addr: addr ? addr.value : '',
        sub: sub ? sub.value : '',
        body: body ? body.value : ''
      };
    } else if (type === 'phone') {
      const el = document.getElementById('mqr-phone-number');
      if (el) state.typeData.phone = { number: el.value };
    }
  }

  /**
   * Restore cached inputs into form fields
   */
  function restoreInputs(type) {
    if (!state.typeData) return;
    const td = state.typeData;

    if (type === 'url' && td.url) {
      const el = document.getElementById('mqr-url-input');
      if (el && td.url.url !== undefined) el.value = td.url.url;
    } else if (type === 'upi' && td.upi) {
      const pa = document.getElementById('mqr-upi-pa');
      const pn = document.getElementById('mqr-upi-pn');
      const am = document.getElementById('mqr-upi-am');
      const tn = document.getElementById('mqr-upi-tn');
      if (pa && td.upi.pa !== undefined) pa.value = td.upi.pa;
      if (pn && td.upi.pn !== undefined) pn.value = td.upi.pn;
      if (am && td.upi.am !== undefined) am.value = td.upi.am;
      if (tn && td.upi.tn !== undefined) tn.value = td.upi.tn;
      updateUpiValidationUI();
    } else if (type === 'wifi' && td.wifi) {
      const ssid = document.getElementById('mqr-wifi-ssid');
      const auth = document.getElementById('mqr-wifi-auth');
      const pass = document.getElementById('mqr-wifi-pass');
      const hidden = document.getElementById('mqr-wifi-hidden');
      if (ssid && td.wifi.ssid !== undefined) ssid.value = td.wifi.ssid;
      if (auth && td.wifi.auth !== undefined) auth.value = td.wifi.auth;
      if (pass && td.wifi.pass !== undefined) pass.value = td.wifi.pass;
      if (hidden && td.wifi.hidden !== undefined) hidden.checked = td.wifi.hidden;

      const passGroup = document.getElementById('mqr-wifi-pass-group');
      if (passGroup) {
        passGroup.style.display = (auth && auth.value === 'nopass') ? 'none' : '';
      }
    } else if (type === 'text' && td.text) {
      const el = document.getElementById('mqr-text-input');
      const counter = document.getElementById('mqr-text-counter');
      if (el && td.text.text !== undefined) {
        el.value = td.text.text;
        if (counter) counter.textContent = `${el.value.length} chars`;
      }
    } else if (type === 'email' && td.email) {
      const addr = document.getElementById('mqr-email-addr');
      const sub = document.getElementById('mqr-email-sub');
      const body = document.getElementById('mqr-email-body');
      if (addr && td.email.addr !== undefined) addr.value = td.email.addr;
      if (sub && td.email.sub !== undefined) sub.value = td.email.sub;
      if (body && td.email.body !== undefined) body.value = td.email.body;
    } else if (type === 'phone' && td.phone) {
      const el = document.getElementById('mqr-phone-number');
      if (el && td.phone.number !== undefined) el.value = td.phone.number;
    }
  }

  /**
   * Switch active QR Type
   */
  function switchQRType(type) {
    if (state.qrType === type) return;

    cacheInputs();
    state.qrType = type;

    // Update active card highlight
    const grid = document.getElementById('mqr-type-selector');
    if (grid) {
      grid.querySelectorAll('.mqr-type-card').forEach(c => {
        c.classList.toggle('active', c.getAttribute('data-type') === type);
      });
    }

    // Toggle dynamic form display
    const types = ['url', 'upi', 'wifi', 'text', 'email', 'phone'];
    types.forEach(t => {
      const pane = document.getElementById(`mqr-pane-${t}`);
      if (pane) {
        pane.classList.toggle('hidden', t !== type);
      }
    });

    restoreInputs(type);
    renderLiveQR();
  }

  /**
   * Build QRCodeStyling configuration
   */
  function buildQRConfig(pixelSize) {
    const size = pixelSize || state.size || 280;
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
      margin: parseInt(state.margin, 10) || 8,
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
  function updateCompositePreview() {
    if (!cachedBaseQRCanvas) {
      renderLiveQR();
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

    const mount = document.getElementById('mobile-qr-preview-mount');
    if (mount) {
      mount.innerHTML = '';
      mount.appendChild(composite);
    }

    updateInfoSection();
  }

  /**
   * Render Live QR code from scratch
   */
  async function renderLiveQR() {
    const mount = document.getElementById('mobile-qr-preview-mount');
    if (!mount) return;

    if (typeof window.QRCodeStyling === 'undefined') {
      mount.innerHTML = '<div style="padding:15px; color:#ef4444; text-align:center; font-size:0.8rem;">Loading engine...</div>';
      return;
    }

    try {
      const config = buildQRConfig(state.size);
      qrInstance = new window.QRCodeStyling(config);

      const rawCanvas = await qrInstance._getElement('png');
      if (!rawCanvas) return;

      cachedBaseQRCanvas = rawCanvas;
      updateCompositePreview();
    } catch (e) {
      console.error('Error generating Mobile QR Code:', e);
      mount.innerHTML = `<div style="padding:15px; color:#ef4444; font-size:0.75rem; text-align:center;">Error: ${e.message}</div>`;
    }
  }

  function scheduleUpdate() {
    if (updateDebounceTimer) clearTimeout(updateDebounceTimer);
    updateDebounceTimer = setTimeout(() => {
      renderLiveQR();
    }, 120);
  }

  function updateInfoSection() {
    const warnEl = document.getElementById('mobile-qr-contrast-warn');
    if (warnEl) {
      const isLowContrast = checkLowContrast(state.colorFg, state.colorBg);
      if (isLowContrast) {
        warnEl.textContent = 'Low contrast. QR may scan slowly.';
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
   * Fallback inline SVG generator for preset thumbnails
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
  function renderStylePresetsGallery(filterTheme = 'all') {
    const container = document.getElementById('mqr-style-presets-gallery');
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

      let thumbSvg = '';
      if (renderer && typeof renderer.generateStyleThumbnailSvg === 'function') {
        thumbSvg = renderer.generateStyleThumbnailSvg(preset);
      }
      if (!thumbSvg) {
        thumbSvg = generatePresetThumbnailFallback(preset);
      }

      card.innerHTML = `
        <div class="qr-gallery-thumb">
          ${thumbSvg}
        </div>
        <span class="qr-gallery-name">${preset.name}</span>
      `;

      card.addEventListener('click', () => {
        applyStylePreset(preset);
      });

      container.appendChild(card);
    });
  }

  /**
   * Apply a Style Preset
   */
  function applyStylePreset(preset) {
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

    syncUIWithState();

    const container = document.getElementById('mqr-style-presets-gallery');
    if (container) {
      container.querySelectorAll('.qr-gallery-card').forEach(c => {
        c.classList.toggle('active', c.getAttribute('data-preset-id') === preset.id);
      });
    }

    scheduleUpdate();
  }

  /**
   * Render 52 Frame Preset Cards
   */
  function renderFramesGallery(filterTheme = 'all') {
    const container = document.getElementById('mqr-frames-gallery');
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

      let thumbSvg = '';
      if (renderer && typeof renderer.generateFrameThumbnailSvg === 'function') {
        thumbSvg = renderer.generateFrameThumbnailSvg(frame);
      }
      if (!thumbSvg) {
        thumbSvg = generateFrameThumbnailFallback(frame);
      }

      card.innerHTML = `
        <div class="qr-gallery-thumb">
          ${thumbSvg}
        </div>
        <span class="qr-gallery-name">${frame.name}</span>
      `;

      card.addEventListener('click', () => {
        applyFramePreset(frame);
      });

      container.appendChild(card);
    });
  }

  /**
   * Apply a Frame Preset
   */
  function applyFramePreset(frame) {
    state.activeFrameId = frame.id;

    const renderer = getFrameRenderer();
    const supportsCta = (renderer && typeof renderer.isFrameCtaSupported === 'function')
      ? renderer.isFrameCtaSupported(frame.type)
      : (frame.type !== 'none');

    const frameTextInput = document.getElementById('mqr-frame-text-input');
    if (frameTextInput) {
      if (!supportsCta) {
        frameTextInput.disabled = true;
        frameTextInput.placeholder = 'Selected frame has no banner';
        frameTextInput.title = 'This frame design does not include a CTA text banner';
      } else {
        frameTextInput.disabled = false;
        frameTextInput.placeholder = 'e.g. SCAN ME, ORDER HERE';
        frameTextInput.title = '';
        if (!state.userHasEditedCtaText) {
          state.frameText = (frame.defaultText !== undefined) ? frame.defaultText : 'SCAN ME';
          frameTextInput.value = state.frameText;
        } else {
          frameTextInput.value = state.frameText;
        }
      }
    }

    const container = document.getElementById('mqr-frames-gallery');
    if (container) {
      container.querySelectorAll('.qr-gallery-card').forEach(c => {
        c.classList.toggle('active', c.getAttribute('data-frame-id') === frame.id);
      });
    }

    updateCompositePreview();
  }

  function resetToPreset() {
    const presetsData = getPresetsData();
    if (!presetsData) return;

    const preset = presetsData.STYLE_PRESETS.find(p => p.id === state.activePresetId);
    if (preset) {
      applyStylePreset(preset);
      showToast('Reset to ' + preset.name, 'info');
    }
  }

  /**
   * Synchronize UI Controls with current State
   */
  function syncUIWithState() {
    syncColorPair('mqr-color-fg', 'mqr-color-fg-hex', state.colorFg);
    syncColorPair('mqr-color-bg', 'mqr-color-bg-hex', state.colorBg);
    syncColorPair('mqr-color-eye', 'mqr-color-eye-hex', state.colorEye);
    syncColorPair('mqr-color-fg2', 'mqr-color-fg2-hex', state.colorFg2 || '#9333ea');
    updateSwatchDisplay('mqr-fg-swatch', state.colorFg);
    updateSwatchDisplay('mqr-bg-swatch', state.colorBg);
    updateSwatchDisplay('mqr-eye-swatch', state.colorEye);
    updateSwatchDisplay('mqr-fg2-swatch', state.colorFg2 || '#9333ea');

    const eyeCheck = document.getElementById('mqr-eye-custom-check');
    const eyeRow = document.getElementById('mqr-eye-color-wrap');
    if (eyeCheck) eyeCheck.checked = state.customEyeColor;
    if (eyeRow) eyeRow.classList.toggle('disabled-control', !state.customEyeColor);

    const gradCheck = document.getElementById('mqr-gradient-check');
    const gradRow = document.getElementById('mqr-gradient-color-wrap');
    if (gradCheck) gradCheck.checked = state.gradientEnabled;
    if (gradRow) gradRow.classList.toggle('disabled-control', !state.gradientEnabled);

    const bgTransCheck = document.getElementById('mqr-bg-trans-check');
    const bgRow = document.getElementById('mqr-bg-color-wrap');
    if (bgTransCheck) bgTransCheck.checked = state.bgTransparent;
    if (bgRow) bgRow.classList.toggle('disabled-control', state.bgTransparent);

    document.querySelectorAll('#mqr-pattern-group [data-pattern]').forEach(c => {
      c.classList.toggle('active', c.getAttribute('data-pattern') === state.patternStyle);
    });
    document.querySelectorAll('#mqr-corner-sq-group [data-corner-sq]').forEach(c => {
      c.classList.toggle('active', c.getAttribute('data-corner-sq') === state.cornerSquareStyle);
    });
    document.querySelectorAll('#mqr-corner-dot-group [data-corner-dot]').forEach(c => {
      c.classList.toggle('active', c.getAttribute('data-corner-dot') === state.cornerDotStyle);
    });
  }

  function bindEvents() {
    // 1. Choose QR Type Selection
    const typeCards = document.querySelectorAll('#mqr-type-selector .mqr-type-card');
    typeCards.forEach(card => {
      card.addEventListener('click', () => {
        const type = card.getAttribute('data-type');
        switchQRType(type);
      });
    });

    // Content inputs live sync
    const inputIds = [
      'mqr-url-input',
      'mqr-upi-pa', 'mqr-upi-pn', 'mqr-upi-am', 'mqr-upi-tn',
      'mqr-wifi-ssid', 'mqr-wifi-pass',
      'mqr-text-input',
      'mqr-email-addr', 'mqr-email-sub', 'mqr-email-body',
      'mqr-phone-number'
    ];

    inputIds.forEach(id => {
      const el = document.getElementById(id);
      if (el) {
        el.addEventListener('input', () => {
          if (id === 'mqr-upi-pa') updateUpiValidationUI();
          scheduleUpdate();
        });
      }
    });

    const wifiAuth = document.getElementById('mqr-wifi-auth');
    if (wifiAuth) {
      wifiAuth.addEventListener('change', () => {
        const passGroup = document.getElementById('mqr-wifi-pass-group');
        if (passGroup) {
          passGroup.style.display = wifiAuth.value === 'nopass' ? 'none' : '';
        }
        scheduleUpdate();
      });
    }

    const wifiHidden = document.getElementById('mqr-wifi-hidden');
    if (wifiHidden) {
      wifiHidden.addEventListener('change', () => scheduleUpdate());
    }

    const textInput = document.getElementById('mqr-text-input');
    const textCounter = document.getElementById('mqr-text-counter');
    if (textInput && textCounter) {
      textInput.addEventListener('input', () => {
        textCounter.textContent = `${textInput.value.length} chars`;
      });
    }

    // 2. Mobile Studio Section Tabs
    const studioTabs = document.querySelectorAll('#mobile-studio-tabs .mqr-tab-btn');
    studioTabs.forEach(tab => {
      tab.addEventListener('click', () => {
        studioTabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        const target = tab.getAttribute('data-tab');

        document.querySelectorAll('.mqr-mobile-panel').forEach(p => p.classList.add('hidden'));
        const activePanel = document.getElementById(`mqr-panel-${target}`);
        if (activePanel) activePanel.classList.remove('hidden');
      });
    });

    // 3. Style Presets Theme Pills
    const styleThemePills = document.querySelectorAll('#mqr-style-theme-nav .mqr-theme-pill');
    styleThemePills.forEach(pill => {
      pill.addEventListener('click', () => {
        styleThemePills.forEach(p => p.classList.remove('active'));
        pill.classList.add('active');
        const theme = pill.getAttribute('data-style-theme');
        renderStylePresetsGallery(theme);
      });
    });

    // 4. Frame Presets Theme Pills
    const frameThemePills = document.querySelectorAll('#mqr-frame-theme-nav .mqr-theme-pill');
    frameThemePills.forEach(pill => {
      pill.addEventListener('click', () => {
        frameThemePills.forEach(p => p.classList.remove('active'));
        pill.classList.add('active');
        const theme = pill.getAttribute('data-frame-theme');
        renderFramesGallery(theme);
      });
    });

    // Frame CTA text & colors
    const frameTextInput = document.getElementById('mqr-frame-text-input');
    if (frameTextInput) {
      frameTextInput.addEventListener('input', () => {
        state.userHasEditedCtaText = true;
        state.frameText = frameTextInput.value;
        updateCompositePreview();
      });
    }

    bindSwatchTrigger('mqr-frame-swatch', 'mqr-frame-color');
    bindColorPair('mqr-frame-color', 'mqr-frame-color-hex', (c) => {
      state.frameColor = c;
      updateSwatchDisplay('mqr-frame-swatch', c);
      updateCompositePreview();
    });

    bindSwatchTrigger('mqr-frame-text-swatch', 'mqr-frame-text-color');
    bindColorPair('mqr-frame-text-color', 'mqr-frame-text-hex', (c) => {
      state.frameTextColor = c;
      updateSwatchDisplay('mqr-frame-text-swatch', c);
      updateCompositePreview();
    });

    bindSwatchTrigger('mqr-frame-bg-swatch', 'mqr-frame-bg-color');
    bindColorPair('mqr-frame-bg-color', 'mqr-frame-bg-hex', (c) => {
      state.frameBg = c;
      updateSwatchDisplay('mqr-frame-bg-swatch', c);
      updateCompositePreview();
    });

    // 5. Label Text Controls
    const labelInput = document.getElementById('mqr-label-text-input');
    if (labelInput) {
      labelInput.addEventListener('input', () => {
        state.labelText = labelInput.value;
        updateCompositePreview();
      });
    }

    const labelPosBtns = document.querySelectorAll('#mqr-label-pos-group .mqr-segmented-btn');
    labelPosBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        labelPosBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        state.labelPosition = btn.getAttribute('data-pos');
        updateCompositePreview();
      });
    });

    const labelFont = document.getElementById('mqr-label-font');
    if (labelFont) {
      labelFont.addEventListener('change', () => {
        state.labelFontFamily = labelFont.value;
        updateCompositePreview();
      });
    }

    const labelWeightBtns = document.querySelectorAll('#mqr-label-weight-group .mqr-segmented-btn');
    labelWeightBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        labelWeightBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        state.labelFontWeight = btn.getAttribute('data-weight');
        updateCompositePreview();
      });
    });

    const labelSizeSlider = document.getElementById('mqr-label-size');
    const labelSizeVal = document.getElementById('mqr-label-size-val');
    if (labelSizeSlider && labelSizeVal) {
      labelSizeSlider.addEventListener('input', () => {
        const val = parseInt(labelSizeSlider.value, 10);
        state.labelFontSize = val;
        labelSizeVal.textContent = `${val}px`;
        updateCompositePreview();
      });
    }

    const labelPadSlider = document.getElementById('mqr-label-pad');
    const labelPadVal = document.getElementById('mqr-label-pad-val');
    if (labelPadSlider && labelPadVal) {
      labelPadSlider.addEventListener('input', () => {
        const val = parseInt(labelPadSlider.value, 10);
        state.labelPadding = val;
        labelPadVal.textContent = `${val}px`;
        updateCompositePreview();
      });
    }

    const labelAlignBtns = document.querySelectorAll('#mqr-label-align-group .mqr-segmented-btn');
    labelAlignBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        labelAlignBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        state.labelAlign = btn.getAttribute('data-align');
        updateCompositePreview();
      });
    });

    bindSwatchTrigger('mqr-label-color-swatch', 'mqr-label-color');
    bindColorPair('mqr-label-color', 'mqr-label-color-hex', (c) => {
      state.labelTextColor = c;
      updateSwatchDisplay('mqr-label-color-swatch', c);
      updateCompositePreview();
    });

    bindSwatchTrigger('mqr-label-bg-swatch', 'mqr-label-bg');
    bindColorPair('mqr-label-bg', 'mqr-label-bg-hex', (c) => {
      state.labelBgColor = c;
      updateSwatchDisplay('mqr-label-bg-swatch', c);
      updateCompositePreview();
    });

    const labelBgTransCheck = document.getElementById('mqr-label-bg-trans-check');
    const labelBgWrap = document.getElementById('mqr-label-bg-wrap');
    if (labelBgTransCheck) {
      labelBgTransCheck.addEventListener('change', () => {
        if (labelBgWrap) labelBgWrap.classList.toggle('disabled-control', labelBgTransCheck.checked);
        state.labelBgColor = labelBgTransCheck.checked ? 'transparent' : (document.getElementById('mqr-label-bg')?.value || '#ffffff');
        updateCompositePreview();
      });
    }

    // 6. Fine-tune Design Controls
    const resetPresetBtn = document.getElementById('mqr-reset-preset-btn');
    if (resetPresetBtn) {
      resetPresetBtn.addEventListener('click', () => resetToPreset());
    }

    bindSwatchTrigger('mqr-fg-swatch', 'mqr-color-fg');
    bindSwatchTrigger('mqr-bg-swatch', 'mqr-color-bg');
    bindSwatchTrigger('mqr-eye-swatch', 'mqr-color-eye');
    bindSwatchTrigger('mqr-fg2-swatch', 'mqr-color-fg2');

    bindColorPair('mqr-color-fg', 'mqr-color-fg-hex', (c) => {
      state.colorFg = c;
      updateSwatchDisplay('mqr-fg-swatch', c);
      if (!state.customEyeColor) {
        state.colorEye = c;
        updateSwatchDisplay('mqr-eye-swatch', c);
      }
      state.isFineTuneModified = true;
      scheduleUpdate();
    });

    bindColorPair('mqr-color-bg', 'mqr-color-bg-hex', (c) => {
      state.colorBg = c;
      updateSwatchDisplay('mqr-bg-swatch', c);
      state.isFineTuneModified = true;
      scheduleUpdate();
    });

    bindColorPair('mqr-color-eye', 'mqr-color-eye-hex', (c) => {
      state.colorEye = c;
      updateSwatchDisplay('mqr-eye-swatch', c);
      state.customEyeColor = true;
      const eyeCheck = document.getElementById('mqr-eye-custom-check');
      if (eyeCheck) eyeCheck.checked = true;
      const eyeRow = document.getElementById('mqr-eye-color-wrap');
      if (eyeRow) eyeRow.classList.remove('disabled-control');
      state.isFineTuneModified = true;
      scheduleUpdate();
    });

    const eyeCheck = document.getElementById('mqr-eye-custom-check');
    const eyeRow = document.getElementById('mqr-eye-color-wrap');
    if (eyeCheck) {
      eyeCheck.addEventListener('change', () => {
        state.customEyeColor = eyeCheck.checked;
        if (eyeRow) eyeRow.classList.toggle('disabled-control', !eyeCheck.checked);
        if (!eyeCheck.checked) {
          state.colorEye = state.colorFg;
          syncColorPair('mqr-color-eye', 'mqr-color-eye-hex', state.colorFg);
          updateSwatchDisplay('mqr-eye-swatch', state.colorFg);
        }
        state.isFineTuneModified = true;
        scheduleUpdate();
      });
    }

    const gradCheck = document.getElementById('mqr-gradient-check');
    const gradRow = document.getElementById('mqr-gradient-color-wrap');
    if (gradCheck) {
      gradCheck.addEventListener('change', () => {
        state.gradientEnabled = gradCheck.checked;
        if (gradRow) gradRow.classList.toggle('disabled-control', !gradCheck.checked);
        state.isFineTuneModified = true;
        scheduleUpdate();
      });
    }

    bindColorPair('mqr-color-fg2', 'mqr-color-fg2-hex', (c) => {
      state.colorFg2 = c;
      updateSwatchDisplay('mqr-fg2-swatch', c);
      state.isFineTuneModified = true;
      scheduleUpdate();
    });

    const bgTransCheck = document.getElementById('mqr-bg-trans-check');
    const bgRow = document.getElementById('mqr-bg-color-wrap');
    if (bgTransCheck) {
      bgTransCheck.addEventListener('change', () => {
        state.bgTransparent = bgTransCheck.checked;
        if (bgRow) bgRow.classList.toggle('disabled-control', bgTransCheck.checked);
        state.isFineTuneModified = true;
        scheduleUpdate();
      });
    }

    // Pattern style selector
    const patternCards = document.querySelectorAll('#mqr-pattern-group [data-pattern]');
    patternCards.forEach(card => {
      card.addEventListener('click', () => {
        patternCards.forEach(c => c.classList.remove('active'));
        card.classList.add('active');
        state.patternStyle = card.getAttribute('data-pattern');
        state.isFineTuneModified = true;
        scheduleUpdate();
      });
    });

    // Corner square selector
    const cornerSqCards = document.querySelectorAll('#mqr-corner-sq-group [data-corner-sq]');
    cornerSqCards.forEach(card => {
      card.addEventListener('click', () => {
        cornerSqCards.forEach(c => c.classList.remove('active'));
        card.classList.add('active');
        state.cornerSquareStyle = card.getAttribute('data-corner-sq');
        state.isFineTuneModified = true;
        scheduleUpdate();
      });
    });

    // Corner dot selector
    const cornerDotCards = document.querySelectorAll('#mqr-corner-dot-group [data-corner-dot]');
    cornerDotCards.forEach(card => {
      card.addEventListener('click', () => {
        cornerDotCards.forEach(c => c.classList.remove('active'));
        card.classList.add('active');
        state.cornerDotStyle = card.getAttribute('data-corner-dot');
        state.isFineTuneModified = true;
        scheduleUpdate();
      });
    });

    // 7. Settings Panel Controls
    const sizeBtns = document.querySelectorAll('#mqr-size-group .mqr-segmented-btn');
    sizeBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        sizeBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        state.size = parseInt(btn.getAttribute('data-size'), 10) || 280;
        scheduleUpdate();
      });
    });

    const marginBtns = document.querySelectorAll('#mqr-margin-group .mqr-segmented-btn');
    marginBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        marginBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        state.margin = parseInt(btn.getAttribute('data-margin'), 10);
        scheduleUpdate();
      });
    });

    const ecBtns = document.querySelectorAll('#mqr-ec-group .mqr-segmented-btn');
    ecBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        ecBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        state.errorCorrection = btn.getAttribute('data-ec');
        scheduleUpdate();
      });
    });

    // 8. Downloads & Copy
    const dlPngBtn = document.getElementById('mqr-dl-png');
    if (dlPngBtn) {
      dlPngBtn.addEventListener('click', () => downloadExport('png'));
    }

    const dlSvgBtn = document.getElementById('mqr-dl-svg');
    if (dlSvgBtn) {
      dlSvgBtn.addEventListener('click', () => downloadExport('svg'));
    }

    const dlPdfBtn = document.getElementById('mqr-dl-pdf');
    if (dlPdfBtn) {
      dlPdfBtn.addEventListener('click', () => downloadExport('pdf'));
    }

    const printBtn = document.getElementById('mqr-btn-print');
    if (printBtn) {
      printBtn.addEventListener('click', () => printCurrentQR(currentCompositeCanvas));
    }

    const copyContentBtn = document.getElementById('mqr-copy-content');
    if (copyContentBtn) {
      copyContentBtn.addEventListener('click', () => {
        const data = getEffectiveData();
        if (navigator.clipboard) {
          navigator.clipboard.writeText(data).then(() => {
            showToast('Content copied to clipboard!', 'success');
          });
        }
      });
    }
  }

  /**
   * Synchronous Canvas to Blob converter to preserve mobile gesture activation
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
   * Client-side PDF export using PDFLib
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

      page.drawText('Generated by FileForge Mobile — Private Client-Side QR Generator', {
        x: 130,
        y: 40,
        size: 9,
        color: PDFLib.rgb(0.4, 0.4, 0.4)
      });

      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      saveExportBlob(blob, filename, 'application/pdf');
    } catch (e) {
      console.error('PDF Export Error:', e);
      showToast('Failed to generate PDF: ' + e.message, 'error');
    }
  }

  function printCurrentQR(finalCanvas) {
    if (!finalCanvas) return;
    try {
      const dataUrl = finalCanvas.toDataURL('image/png');
      const win = window.open('', '_blank');
      if (!win) {
        showToast('Popup blocked by browser', 'warning');
        return;
      }
      win.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Print QR Code - FileForge</title>
          <style>
            body { margin: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 100vh; font-family: sans-serif; background: #fff; }
            img { max-width: 480px; height: auto; display: block; margin: 0 auto; }
            .print-footer { margin-top: 16px; font-size: 12px; color: #64748b; }
            @media print {
              body { min-height: auto; padding: 20px 0; }
              @page { margin: 15mm; }
            }
          </style>
        </head>
        <body>
          <img src="${dataUrl}" alt="FileForge QR Code">
          <div class="print-footer">Generated by FileForge QR Code Studio</div>
          <script>
            window.onload = function() {
              window.print();
              setTimeout(function() { window.close(); }, 500);
            };
          </script>
        </body>
        </html>
      `);
      win.document.close();
    } catch (e) {
      console.error('Print Error:', e);
      showToast('Print failed: ' + e.message, 'error');
    }
  }

  /**
   * Download export handler - preserves gesture activation for mobile saving
   */
  async function downloadExport(format) {
    try {
      // 1. Determine canvas to export
      let finalCanvas = currentCompositeCanvas;
      const exportDimension = state.size >= 480 ? state.size : 600;

      if (!finalCanvas || finalCanvas.width < exportDimension) {
        const exportConfig = buildQRConfig(exportDimension);
        const exportQR = new window.QRCodeStyling(exportConfig);
        const exportCanvas = await exportQR._getElement('png');

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

        const fontScale = exportDimension / 240;
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
        finalCanvas = (renderer && typeof renderer.renderComposite === 'function')
          ? renderer.renderComposite(exportCanvas, framePreset, frameOptions, labelOptions)
          : exportCanvas;
      }

      if (!finalCanvas) {
        showToast('QR Code not ready', 'error');
        return;
      }

      if (format === 'pdf') {
        await exportToPDF(finalCanvas, 'FileForge-QR-Code.pdf');
        return;
      }

      const ext = format === 'svg' ? 'svg' : 'png';
      const filename = `FileForge-QR-Code.${ext}`;

      if (format === 'svg') {
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

        const renderer = getFrameRenderer();
        let svgContent = '';
        if (renderer && typeof renderer.getCompositeSvg === 'function' && framePreset && framePreset.type !== 'none') {
          svgContent = renderer.getCompositeSvg(finalCanvas, framePreset, frameOptions, {});
        } else {
          const dataUrl = finalCanvas.toDataURL('image/png');
          svgContent = `<?xml version="1.0" encoding="utf-8"?>
<svg version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${finalCanvas.width}" height="${finalCanvas.height}" viewBox="0 0 ${finalCanvas.width} ${finalCanvas.height}">
  <image width="${finalCanvas.width}" height="${finalCanvas.height}" xlink:href="${dataUrl}"/>
</svg>`;
        }
        const blob = new Blob([svgContent], { type: 'image/svg+xml;charset=utf-8' });
        saveExportBlob(blob, filename, 'image/svg+xml');
      } else {
        // High-res synchronous PNG blob conversion without token expiration
        const syncBlob = canvasToBlobSync(finalCanvas, 'image/png');
        if (syncBlob) {
          saveExportBlob(syncBlob, filename, 'image/png');
        } else {
          finalCanvas.toBlob(blob => {
            if (blob) {
              saveExportBlob(blob, filename, 'image/png');
            }
          }, 'image/png');
        }
      }
    } catch (e) {
      console.error('Download QR error:', e);
      showToast('Error saving QR code: ' + e.message, 'error');
    }
  }

  function saveExportBlob(blob, filename, mimeType = 'image/png') {
    const downloadFn = (typeof MobileUtils !== 'undefined' && typeof MobileUtils.downloadBlob === 'function')
      ? MobileUtils.downloadBlob
      : (window.MobileUtils && typeof window.MobileUtils.downloadBlob === 'function')
        ? window.MobileUtils.downloadBlob
        : null;

    if (downloadFn) {
      downloadFn(blob, filename, mimeType);
    } else if (window.FileForgeDownloadManager && typeof window.FileForgeDownloadManager.save === 'function') {
      window.FileForgeDownloadManager.save({
        blob: blob,
        filename: filename,
        mimeType: mimeType || (blob ? blob.type : 'application/octet-stream')
      });
    } else {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 2000);
      showToast(`Saved ${filename}`, 'success');
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
    if (typeof MobileUtils !== 'undefined' && typeof MobileUtils.showToast === 'function') {
      MobileUtils.showToast(msg, type);
    } else if (window.MobileUtils && typeof window.MobileUtils.showToast === 'function') {
      window.MobileUtils.showToast(msg, type);
    } else {
      console.log(`[Toast ${type}]: ${msg}`);
    }
  }

  /**
   * Reset QR Tool completely to fresh default state
   */
  function reset() {
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

    const urlInput = document.getElementById('mqr-url-input');
    if (urlInput) urlInput.value = DEFAULT_OPTIONS.typeData.url.url;

    const upiPa = document.getElementById('mqr-upi-pa');
    if (upiPa) upiPa.value = '';
    const upiPn = document.getElementById('mqr-upi-pn');
    if (upiPn) upiPn.value = '';
    const upiAm = document.getElementById('mqr-upi-am');
    if (upiAm) upiAm.value = '';
    const upiTn = document.getElementById('mqr-upi-tn');
    if (upiTn) upiTn.value = '';
    updateUpiValidationUI();

    const wifiSsid = document.getElementById('mqr-wifi-ssid');
    if (wifiSsid) wifiSsid.value = '';
    const wifiAuth = document.getElementById('mqr-wifi-auth');
    if (wifiAuth) wifiAuth.value = 'WPA';
    const wifiPass = document.getElementById('mqr-wifi-pass');
    if (wifiPass) wifiPass.value = '';
    const wifiHidden = document.getElementById('mqr-wifi-hidden');
    if (wifiHidden) wifiHidden.checked = false;
    const wifiPassGroup = document.getElementById('mqr-wifi-pass-group');
    if (wifiPassGroup) wifiPassGroup.style.display = '';

    const textInput = document.getElementById('mqr-text-input');
    if (textInput) textInput.value = DEFAULT_OPTIONS.typeData.text.text;

    const textCounter = document.getElementById('mqr-text-counter');
    if (textCounter) textCounter.textContent = '29 chars';

    const emailAddr = document.getElementById('mqr-email-addr');
    if (emailAddr) emailAddr.value = '';
    const emailSub = document.getElementById('mqr-email-sub');
    if (emailSub) emailSub.value = '';
    const emailBody = document.getElementById('mqr-email-body');
    if (emailBody) emailBody.value = '';

    const phoneNum = document.getElementById('mqr-phone-number');
    if (phoneNum) phoneNum.value = '';

    const typeCards = document.querySelectorAll('#mqr-type-selector .mqr-type-card');
    typeCards.forEach(c => c.classList.toggle('active', c.getAttribute('data-type') === 'url'));

    const types = ['url', 'upi', 'wifi', 'text', 'email', 'phone'];
    types.forEach(t => {
      const pane = document.getElementById(`mqr-pane-${t}`);
      if (pane) pane.classList.toggle('hidden', t !== 'url');
    });

    const studioTabs = document.querySelectorAll('#mobile-studio-tabs .mqr-tab-btn');
    studioTabs.forEach(t => t.classList.toggle('active', t.getAttribute('data-tab') === 'presets'));

    const panels = document.querySelectorAll('.mqr-mobile-panel');
    panels.forEach(p => p.classList.add('hidden'));
    const panelPresets = document.getElementById('mqr-panel-presets');
    if (panelPresets) panelPresets.classList.remove('hidden');

    const styleThemePills = document.querySelectorAll('#mqr-style-theme-nav .mqr-theme-pill');
    styleThemePills.forEach(p => p.classList.toggle('active', p.getAttribute('data-style-theme') === 'all'));
    renderStylePresetsGallery('all');

    const frameThemePills = document.querySelectorAll('#mqr-frame-theme-nav .mqr-theme-pill');
    frameThemePills.forEach(p => p.classList.toggle('active', p.getAttribute('data-frame-theme') === 'all'));
    renderFramesGallery('all');

    const frameTextInput = document.getElementById('mqr-frame-text-input');
    if (frameTextInput) {
      frameTextInput.value = DEFAULT_OPTIONS.frameText;
      frameTextInput.disabled = true;
      frameTextInput.placeholder = 'Selected frame has no text banner';
      frameTextInput.title = 'This frame design does not include a CTA text banner';
    }

    syncColorPair('mqr-frame-color', 'mqr-frame-color-hex', DEFAULT_OPTIONS.frameColor);
    updateSwatchDisplay('mqr-frame-swatch', DEFAULT_OPTIONS.frameColor);
    syncColorPair('mqr-frame-text-color', 'mqr-frame-text-hex', DEFAULT_OPTIONS.frameTextColor);
    updateSwatchDisplay('mqr-frame-text-swatch', DEFAULT_OPTIONS.frameTextColor);
    syncColorPair('mqr-frame-bg-color', 'mqr-frame-bg-hex', DEFAULT_OPTIONS.frameBg);
    updateSwatchDisplay('mqr-frame-bg-swatch', DEFAULT_OPTIONS.frameBg);

    const labelInput = document.getElementById('mqr-label-text-input');
    if (labelInput) labelInput.value = '';

    const labelPosBtns = document.querySelectorAll('#mqr-label-pos-group .mqr-segmented-btn');
    labelPosBtns.forEach(b => b.classList.toggle('active', b.getAttribute('data-pos') === 'bottom'));

    const labelFont = document.getElementById('mqr-label-font');
    if (labelFont) labelFont.value = 'Inter, sans-serif';

    const labelWeightBtns = document.querySelectorAll('#mqr-label-weight-group .mqr-segmented-btn');
    labelWeightBtns.forEach(b => b.classList.toggle('active', b.getAttribute('data-weight') === '600'));

    const labelSizeSlider = document.getElementById('mqr-label-size');
    const labelSizeVal = document.getElementById('mqr-label-size-val');
    if (labelSizeSlider) labelSizeSlider.value = '16';
    if (labelSizeVal) labelSizeVal.textContent = '16px';

    const labelPadSlider = document.getElementById('mqr-label-pad');
    const labelPadVal = document.getElementById('mqr-label-pad-val');
    if (labelPadSlider) labelPadSlider.value = '12';
    if (labelPadVal) labelPadVal.textContent = '12px';

    const labelAlignBtns = document.querySelectorAll('#mqr-label-align-group .mqr-segmented-btn');
    labelAlignBtns.forEach(b => b.classList.toggle('active', b.getAttribute('data-align') === 'center'));

    syncColorPair('mqr-label-color', 'mqr-label-color-hex', DEFAULT_OPTIONS.labelTextColor);
    updateSwatchDisplay('mqr-label-color-swatch', DEFAULT_OPTIONS.labelTextColor);

    const labelBgTransCheck = document.getElementById('mqr-label-bg-trans-check');
    const labelBgWrap = document.getElementById('mqr-label-bg-wrap');
    if (labelBgTransCheck) labelBgTransCheck.checked = true;
    if (labelBgWrap) labelBgWrap.classList.add('disabled-control');
    syncColorPair('mqr-label-bg', 'mqr-label-bg-hex', '#FFFFFF');
    updateSwatchDisplay('mqr-label-bg-swatch', '#FFFFFF');

    syncUIWithState();

    const sizeBtns = document.querySelectorAll('#mqr-size-group .mqr-segmented-btn');
    sizeBtns.forEach(b => b.classList.toggle('active', b.getAttribute('data-size') === '280'));

    const marginBtns = document.querySelectorAll('#mqr-margin-group .mqr-segmented-btn');
    marginBtns.forEach(b => b.classList.toggle('active', b.getAttribute('data-margin') === '8'));

    const ecBtns = document.querySelectorAll('#mqr-ec-group .mqr-segmented-btn');
    ecBtns.forEach(b => b.classList.toggle('active', b.getAttribute('data-ec') === 'M'));

    renderLiveQR();
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
    document.addEventListener('DOMContentLoaded', () => MobileQRCodeGenerator.init());
  } else {
    MobileQRCodeGenerator.init();
  }
}

if (typeof window !== 'undefined') {
  window.MobileQRCodeGenerator = MobileQRCodeGenerator;
}
if (typeof module !== 'undefined' && module.exports) {
  module.exports = MobileQRCodeGenerator;
}
