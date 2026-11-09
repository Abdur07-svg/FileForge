/**
 * FileForge Mobile - Advanced QR Code Generator Studio
 * Fully client-side, mobile touch-optimized QR generator controller
 * Features 45 Style Presets (9 Themes), 52 Frames (7 Themes), Label Typography & Sticky Preview
 */
const MobileQRCodeGenerator = (() => {
  let qrInstance = null;
  let updateDebounceTimer = null;
  let currentCompositeCanvas = null;

  const DEFAULT_OPTIONS = {
    inputType: 'url',
    data: 'https://abdur07-svg.github.io/FileForge/',
    colorFg: '#121214',
    colorBg: '#ffffff',
    colorEye: '#121214',
    customEyeColor: false,
    patternStyle: 'square',
    cornerSquareStyle: 'square',
    cornerDotStyle: 'square',
    size: 280,
    margin: 8,
    errorCorrection: 'M',

    // Presets & Frames state
    activePresetId: 'classic-pure',
    activeFrameId: 'frame-none',
    frameText: 'SCAN ME',
    userHasEditedCtaText: false,
    frameColor: '#121214',
    frameTextColor: '#ffffff',
    frameBg: '#ffffff',

    // Label Typography state
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

  let state = { ...DEFAULT_OPTIONS };

  function init() {
    const container = document.getElementById('tool-view-qr-generator');
    if (!container) return;

    renderStylePresetsGallery('all');
    renderFramesGallery('all');
    bindEvents();
    renderLiveQR();
  }

  function getEffectiveData() {
    let raw = '';
    if (state.inputType === 'url') {
      const urlInput = document.getElementById('mqr-url-input');
      raw = urlInput ? urlInput.value.trim() : '';
      if (!raw) raw = 'https://abdur07-svg.github.io/FileForge/';
      else if (!/^https?:\/\//i.test(raw) && !/^mailto:/i.test(raw) && !/^tel:/i.test(raw)) {
        raw = 'https://' + raw;
      }
    } else if (state.inputType === 'text') {
      const textInput = document.getElementById('mqr-text-input');
      raw = textInput ? textInput.value : '';
      if (!raw) raw = 'Welcome to FileForge Mobile!';
    }
    return raw;
  }

  function buildQRConfig(pixelSize) {
    const size = pixelSize || state.size || 280;
    const data = getEffectiveData();
    const ecLevel = state.errorCorrection;

    const cornerSquareColor = state.customEyeColor ? state.colorEye : state.colorFg;
    const cornerDotColor = state.customEyeColor ? state.colorEye : state.colorFg;

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
      dotsOptions: {
        type: state.patternStyle,
        color: state.colorFg
      },
      cornersSquareOptions: {
        type: state.cornerSquareStyle,
        color: cornerSquareColor
      },
      cornersDotOptions: {
        type: state.cornerDotStyle,
        color: cornerDotColor
      },
      backgroundOptions: {
        color: state.colorBg
      }
    };

    return config;
  }

  function getFrameRenderer() {
    return window.QRFrameRenderer || (typeof QRFrameRenderer !== 'undefined' ? QRFrameRenderer : null);
  }

  function getPresetsData() {
    return window.QR_PRESETS_DATA || (typeof QR_PRESETS_DATA !== 'undefined' ? QR_PRESETS_DATA : null);
  }

  let cachedBaseQRCanvas = null;

  function updateCompositePreview() {
    const previewContainer = document.getElementById('mobile-qr-preview-mount');
    if (!previewContainer) return;

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

    previewContainer.innerHTML = '';
    previewContainer.appendChild(composite);
    currentCompositeCanvas = composite;

    updateInfoSection();
  }

  async function renderLiveQR() {
    if (typeof window.QRCodeStyling === 'undefined') {
      console.warn('QRCodeStyling library not loaded in mobile');
      return;
    }

    const previewContainer = document.getElementById('mobile-qr-preview-mount');
    if (!previewContainer) return;

    const config = buildQRConfig(240);

    try {
      if (!qrInstance) {
        qrInstance = new window.QRCodeStyling(config);
      } else {
        qrInstance.update(config);
      }

      const qrCanvas = await qrInstance._getElement('png');
      if (!qrCanvas) return;

      cachedBaseQRCanvas = qrCanvas;
      updateCompositePreview();
    } catch (e) {
      console.error('Failed to render styled QR code:', e);
    }
  }

  function scheduleUpdate() {
    clearTimeout(updateDebounceTimer);
    updateDebounceTimer = setTimeout(() => {
      renderLiveQR();
    }, 80);
  }

  function updateInfoSection() {
    const data = getEffectiveData();
    const byteLength = new TextEncoder().encode(data).length;

    const typeLabels = {
      url: 'URL',
      text: 'TEXT'
    };

    const typeEl = document.getElementById('mobile-qr-info-type');
    const bytesEl = document.getElementById('mobile-qr-info-bytes');
    const warnEl = document.getElementById('mobile-qr-contrast-warn');

    if (typeEl) typeEl.textContent = typeLabels[state.inputType] || 'Custom';
    if (bytesEl) bytesEl.textContent = `${data.length} chars`;

    if (warnEl) {
      const isLowContrast = checkLowContrast(state.colorFg, state.colorBg);
      if (isLowContrast) {
        warnEl.textContent = 'Low contrast. May be hard to scan.';
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

      const thumbSvg = (renderer && typeof renderer.generateStyleThumbnailSvg === 'function')
        ? renderer.generateStyleThumbnailSvg(preset)
        : '';

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

  function applyStylePreset(preset) {
    state.activePresetId = preset.id;
    state.patternStyle = preset.pattern;
    state.cornerSquareStyle = preset.cornerSq;
    state.cornerDotStyle = preset.cornerDot;
    state.colorFg = preset.fgColor;
    state.colorBg = preset.bgColor;
    state.colorEye = preset.eyeColor || preset.fgColor;
    state.customEyeColor = (preset.eyeColor !== preset.fgColor);

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

      const thumbSvg = (renderer && typeof renderer.generateFrameThumbnailSvg === 'function')
        ? renderer.generateFrameThumbnailSvg(frame)
        : '';

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

    const container = document.getElementById('mqr-frames-gallery');
    if (container) {
      container.querySelectorAll('.qr-gallery-card').forEach(c => {
        c.classList.toggle('active', c.getAttribute('data-frame-id') === frame.id);
      });
    }

    updateCompositePreview();
  }

  function syncUIWithState() {
    syncColorPair('mqr-color-fg', 'mqr-color-fg-hex', state.colorFg);
    syncColorPair('mqr-color-bg', 'mqr-color-bg-hex', state.colorBg);
    syncColorPair('mqr-color-eye', 'mqr-color-eye-hex', state.colorEye);
    updateSwatchDisplay('mqr-fg-swatch', state.colorFg);
    updateSwatchDisplay('mqr-bg-swatch', state.colorBg);
    updateSwatchDisplay('mqr-eye-swatch', state.colorEye);

    const eyeCheck = document.getElementById('mqr-eye-custom-check');
    const eyeRow = document.getElementById('mqr-eye-color-wrap');
    if (eyeCheck) eyeCheck.checked = state.customEyeColor;
    if (eyeRow) eyeRow.classList.toggle('disabled-control', !state.customEyeColor);

    document.querySelectorAll('#mqr-pattern-group [data-pattern]').forEach(c => {
      c.classList.toggle('active', c.getAttribute('data-pattern') === state.patternStyle);
    });
    const patLbl = document.getElementById('mqr-pattern-label');
    if (patLbl) patLbl.textContent = state.patternStyle.toUpperCase();

    document.querySelectorAll('#mqr-corner-sq-group [data-corner-sq]').forEach(c => {
      c.classList.toggle('active', c.getAttribute('data-corner-sq') === state.cornerSquareStyle);
    });
    document.querySelectorAll('#mqr-corner-dot-group [data-corner-dot]').forEach(c => {
      c.classList.toggle('active', c.getAttribute('data-corner-dot') === state.cornerDotStyle);
    });
  }

  function bindEvents() {
    // 1. Content Tabs (URL / Text)
    const tabs = document.querySelectorAll('#mobile-qr-tabs .mqr-tab-btn');
    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        tabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        const targetType = tab.getAttribute('data-type');
        state.inputType = targetType;

        document.querySelectorAll('.mqr-tab-pane').forEach(p => p.classList.add('hidden'));
        const pane = document.getElementById(`mqr-pane-${targetType}`);
        if (pane) pane.classList.remove('hidden');

        scheduleUpdate();
      });
    });

    ['mqr-url-input', 'mqr-text-input'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.addEventListener('input', () => scheduleUpdate());
    });

    const textInput = document.getElementById('mqr-text-input');
    const textCounter = document.getElementById('mqr-text-counter');
    if (textInput && textCounter) {
      textInput.addEventListener('input', () => {
        textCounter.textContent = `${textInput.value.length} chars`;
      });
    }

    // 2. Customizer Studio Section Tabs
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

    // 3. Style Theme Pills
    const styleThemePills = document.querySelectorAll('#mqr-style-theme-nav .mqr-theme-pill');
    styleThemePills.forEach(pill => {
      pill.addEventListener('click', () => {
        styleThemePills.forEach(p => p.classList.remove('active'));
        pill.classList.add('active');
        const theme = pill.getAttribute('data-style-theme');
        renderStylePresetsGallery(theme);
      });
    });

    // 4. Frame Theme Pills
    const frameThemePills = document.querySelectorAll('#mqr-frame-theme-nav .mqr-theme-pill');
    frameThemePills.forEach(pill => {
      pill.addEventListener('click', () => {
        frameThemePills.forEach(p => p.classList.remove('active'));
        pill.classList.add('active');
        const theme = pill.getAttribute('data-frame-theme');
        renderFramesGallery(theme);
      });
    });

    // Frame Text & Colors
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

    // 6. Custom Style Panel Controls
    bindSwatchTrigger('mqr-fg-swatch', 'mqr-color-fg');
    bindSwatchTrigger('mqr-bg-swatch', 'mqr-color-bg');
    bindSwatchTrigger('mqr-eye-swatch', 'mqr-color-eye');

    bindColorPair('mqr-color-fg', 'mqr-color-fg-hex', (c) => {
      state.colorFg = c;
      updateSwatchDisplay('mqr-fg-swatch', c);
      if (!state.customEyeColor) {
        state.colorEye = c;
        updateSwatchDisplay('mqr-eye-swatch', c);
      }
      scheduleUpdate();
    });

    bindColorPair('mqr-color-bg', 'mqr-color-bg-hex', (c) => {
      state.colorBg = c;
      updateSwatchDisplay('mqr-bg-swatch', c);
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
        scheduleUpdate();
      });
    }

    document.querySelectorAll('.mqr-palette-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const fg = btn.getAttribute('data-fg');
        const bg = btn.getAttribute('data-bg');
        if (fg && bg) {
          document.querySelectorAll('.mqr-palette-btn').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          state.colorFg = fg;
          state.colorBg = bg;
          syncColorPair('mqr-color-fg', 'mqr-color-fg-hex', fg);
          syncColorPair('mqr-color-bg', 'mqr-color-bg-hex', bg);
          updateSwatchDisplay('mqr-fg-swatch', fg);
          updateSwatchDisplay('mqr-bg-swatch', bg);
          if (!state.customEyeColor) {
            state.colorEye = fg;
            syncColorPair('mqr-color-eye', 'mqr-color-eye-hex', fg);
            updateSwatchDisplay('mqr-eye-swatch', fg);
          }
          scheduleUpdate();
        }
      });
    });

    const patternCards = document.querySelectorAll('#mqr-pattern-group [data-pattern]');
    const patternLabel = document.getElementById('mqr-pattern-label');
    patternCards.forEach(card => {
      card.addEventListener('click', () => {
        patternCards.forEach(c => c.classList.remove('active'));
        card.classList.add('active');
        const pat = card.getAttribute('data-pattern');
        state.patternStyle = pat;
        if (patternLabel) patternLabel.textContent = pat.toUpperCase();
        scheduleUpdate();
      });
    });

    const cornerSqCards = document.querySelectorAll('#mqr-corner-sq-group [data-corner-sq]');
    cornerSqCards.forEach(card => {
      card.addEventListener('click', () => {
        cornerSqCards.forEach(c => c.classList.remove('active'));
        card.classList.add('active');
        state.cornerSquareStyle = card.getAttribute('data-corner-sq');
        scheduleUpdate();
      });
    });

    const cornerDotCards = document.querySelectorAll('#mqr-corner-dot-group [data-corner-dot]');
    cornerDotCards.forEach(card => {
      card.addEventListener('click', () => {
        cornerDotCards.forEach(c => c.classList.remove('active'));
        card.classList.add('active');
        state.cornerDotStyle = card.getAttribute('data-corner-dot');
        scheduleUpdate();
      });
    });

    // 7. Settings Controls
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

    const resetBtn = document.getElementById('mqr-reset-btn');
    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        reset();
        showToast('Settings restored to defaults', 'info');
      });
    }

    // 8. Download & Copy
    const dlPngBtn = document.getElementById('mqr-dl-png');
    if (dlPngBtn) {
      dlPngBtn.addEventListener('click', () => downloadExport('png'));
    }

    const dlSvgBtn = document.getElementById('mqr-dl-svg');
    if (dlSvgBtn) {
      dlSvgBtn.addEventListener('click', () => downloadExport('svg'));
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

  async function downloadExport(format) {
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
      const finalCanvas = (renderer && typeof renderer.renderComposite === 'function')
        ? renderer.renderComposite(exportCanvas, framePreset, frameOptions, labelOptions)
        : exportCanvas;

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
        saveExportBlob(blob, filename, 'image/svg+xml');
      } else {
        finalCanvas.toBlob(blob => {
          if (blob) {
            saveExportBlob(blob, filename, 'image/png');
          }
        }, 'image/png');
      }
    } catch (e) {
      console.error('Download QR error:', e);
      showToast('Error generating QR export: ' + e.message, 'error');
    }
  }

  function saveExportBlob(blob, filename, mimeType) {
    if (window.MobileUtils && typeof window.MobileUtils.downloadBlob === 'function') {
      window.MobileUtils.downloadBlob(blob, filename);
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
    if (window.MobileUtils && typeof window.MobileUtils.showToast === 'function') {
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
    if (urlInput) urlInput.value = DEFAULT_OPTIONS.data;

    const textInput = document.getElementById('mqr-text-input');
    if (textInput) textInput.value = 'Welcome to FileForge Mobile!';

    const textCounter = document.getElementById('mqr-text-counter');
    if (textCounter) textCounter.textContent = '29 chars';

    const inputTabs = document.querySelectorAll('#mobile-qr-tabs .mqr-tab-btn');
    inputTabs.forEach(t => t.classList.toggle('active', t.getAttribute('data-type') === 'url'));

    const paneUrl = document.getElementById('mqr-pane-url');
    if (paneUrl) paneUrl.classList.remove('hidden');

    const paneText = document.getElementById('mqr-pane-text');
    if (paneText) paneText.classList.add('hidden');

    // Reset mobile studio tabs (activate 'presets')
    const studioTabs = document.querySelectorAll('#mobile-studio-tabs .mqr-tab-btn');
    studioTabs.forEach(t => t.classList.toggle('active', t.getAttribute('data-tab') === 'presets'));

    const panels = document.querySelectorAll('.mqr-mobile-panel');
    panels.forEach(p => p.classList.add('hidden'));
    const panelPresets = document.getElementById('mqr-panel-presets');
    if (panelPresets) panelPresets.classList.remove('hidden');

    // Reset style theme pills & frames
    const styleThemePills = document.querySelectorAll('#mqr-style-theme-nav .mqr-theme-pill');
    styleThemePills.forEach(p => p.classList.toggle('active', p.getAttribute('data-style-theme') === 'all'));
    renderStylePresetsGallery('all');

    const frameThemePills = document.querySelectorAll('#mqr-frame-theme-nav .mqr-theme-pill');
    frameThemePills.forEach(p => p.classList.toggle('active', p.getAttribute('data-frame-theme') === 'all'));
    renderFramesGallery('all');

    // Reset frame text & colors
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

    // Reset label text & settings
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

    // Reset custom style UI
    syncUIWithState();

    // Reset settings
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
window.MobileQRCodeGenerator = MobileQRCodeGenerator;
