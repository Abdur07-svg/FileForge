/**
 * FileForge - Advanced QR Code Generator Studio
 * Fully client-side, privacy-first QR Code generation and customization
 * Features 45 Style Presets (9 Themes), 52 Frames (7 Themes), Label Typography & Live Preview
 */
const QRCodeGenerator = (() => {
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
    size: 320,
    margin: 10,
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
    initDesktop();
  }

  function initDesktop() {
    const container = document.getElementById('tool-qr-generator');
    if (!container) return;

    renderStylePresetsGallery('desktop');
    renderFramesGallery('desktop');
    bindDesktopEvents();
    renderLiveQR('desktop');
  }

  function getEffectiveData() {
    let raw = '';
    if (state.inputType === 'url') {
      const urlInput = document.getElementById('qr-url-input');
      raw = urlInput ? urlInput.value.trim() : '';
      if (!raw) raw = 'https://abdur07-svg.github.io/FileForge/';
      else if (!/^https?:\/\//i.test(raw) && !/^mailto:/i.test(raw) && !/^tel:/i.test(raw)) {
        raw = 'https://' + raw;
      }
    } else if (state.inputType === 'text') {
      const textInput = document.getElementById('qr-text-input');
      raw = textInput ? textInput.value : '';
      if (!raw) raw = 'Welcome to FileForge!';
    }
    return raw;
  }

  function buildQRConfig(pixelSize) {
    const size = pixelSize || state.size || 320;
    const data = getEffectiveData();
    const ecLevel = state.errorCorrection;

    const cornerSquareColor = state.customEyeColor ? state.colorEye : state.colorFg;
    const cornerDotColor = state.customEyeColor ? state.colorEye : state.colorFg;

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

  function updateCompositePreview(targetContext = 'desktop') {
    const previewContainer = targetContext === 'mobile'
      ? document.getElementById('mobile-qr-preview-mount')
      : document.getElementById('qr-preview-mount');

    if (!previewContainer) return;

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

    previewContainer.innerHTML = '';
    previewContainer.appendChild(composite);
    currentCompositeCanvas = composite;

    updateInfoSection(targetContext);
  }

  async function renderLiveQR(targetContext = 'desktop') {
    if (typeof window.QRCodeStyling === 'undefined') {
      console.warn('QRCodeStyling library not loaded');
      return;
    }

    const previewContainer = targetContext === 'mobile'
      ? document.getElementById('mobile-qr-preview-mount')
      : document.getElementById('qr-preview-mount');

    if (!previewContainer) return;

    const baseQRSize = targetContext === 'mobile' ? 240 : 320;
    const config = buildQRConfig(baseQRSize);

    try {
      if (!qrInstance) {
        qrInstance = new window.QRCodeStyling(config);
      } else {
        qrInstance.update(config);
      }

      const qrCanvas = await qrInstance._getElement('png');
      if (!qrCanvas) return;

      cachedBaseQRCanvas = qrCanvas;
      updateCompositePreview(targetContext);
    } catch (e) {
      console.error('Failed to render styled QR code:', e);
    }
  }

  function scheduleUpdate(targetContext = 'desktop') {
    clearTimeout(updateDebounceTimer);
    updateDebounceTimer = setTimeout(() => {
      renderLiveQR(targetContext);
    }, 80);
  }

  function updateInfoSection(targetContext) {
    const data = getEffectiveData();
    const byteLength = new TextEncoder().encode(data).length;

    const typeLabels = {
      url: 'Website URL',
      text: 'Plain Text'
    };

    const typeEl = document.getElementById(targetContext === 'mobile' ? 'mobile-qr-info-type' : 'qr-info-type');
    const bytesEl = document.getElementById(targetContext === 'mobile' ? 'mobile-qr-info-bytes' : 'qr-info-bytes');
    const previewTextEl = document.getElementById(targetContext === 'mobile' ? 'mobile-qr-info-content' : 'qr-info-content');
    const warnEl = document.getElementById(targetContext === 'mobile' ? 'mobile-qr-contrast-warn' : 'qr-contrast-warn');

    if (typeEl) typeEl.textContent = typeLabels[state.inputType] || 'Custom';
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

    // Sync Custom Style inputs
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

    // Instantly recomposite preview without recreating base QR
    updateCompositePreview(targetContext);
  }

  /**
   * Synchronize UI Controls with current State
   */
  function syncUIWithState(targetContext = 'desktop') {
    const prefix = targetContext === 'mobile' ? 'mqr-' : 'qr-';

    syncColorPair(`${prefix}color-fg`, `${prefix}color-fg-hex`, state.colorFg);
    syncColorPair(`${prefix}color-bg`, `${prefix}color-bg-hex`, state.colorBg);
    syncColorPair(`${prefix}color-eye`, `${prefix}color-eye-hex`, state.colorEye);
    updateSwatchDisplay(`${prefix}fg-swatch`, state.colorFg);
    updateSwatchDisplay(`${prefix}bg-swatch`, state.colorBg);
    updateSwatchDisplay(`${prefix}eye-swatch`, state.colorEye);

    const eyeCheck = document.getElementById(`${prefix}eye-custom-check`);
    const eyeRow = document.getElementById(`${prefix}eye-color-wrap`);
    if (eyeCheck) eyeCheck.checked = state.customEyeColor;
    if (eyeRow) eyeRow.classList.toggle('disabled-control', !state.customEyeColor);

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
  }

  function bindDesktopEvents() {
    // 1. Content Tabs (URL / Text)
    const tabs = document.querySelectorAll('.qr-input-tab');
    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        tabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        const targetType = tab.getAttribute('data-type');
        state.inputType = targetType;

        document.querySelectorAll('.qr-tab-content').forEach(c => c.classList.add('hidden'));
        const activeContent = document.getElementById(`qr-tab-${targetType}`);
        if (activeContent) activeContent.classList.remove('hidden');

        scheduleUpdate('desktop');
      });
    });

    // Content inputs
    ['qr-url-input', 'qr-text-input'].forEach(id => {
      const el = document.getElementById(id);
      if (el) {
        el.addEventListener('input', () => scheduleUpdate('desktop'));
      }
    });

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

    // 6. Custom Style Panel Controls
    bindSwatchTrigger('qr-fg-swatch', 'qr-color-fg');
    bindSwatchTrigger('qr-bg-swatch', 'qr-color-bg');
    bindSwatchTrigger('qr-eye-swatch', 'qr-color-eye');

    bindColorPair('qr-color-fg', 'qr-color-fg-hex', (c) => {
      state.colorFg = c;
      updateSwatchDisplay('qr-fg-swatch', c);
      if (!state.customEyeColor) {
        state.colorEye = c;
        updateSwatchDisplay('qr-eye-swatch', c);
      }
      scheduleUpdate('desktop');
    });

    bindColorPair('qr-color-bg', 'qr-color-bg-hex', (c) => {
      state.colorBg = c;
      updateSwatchDisplay('qr-bg-swatch', c);
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
        scheduleUpdate('desktop');
      });
    }

    // Palette buttons
    document.querySelectorAll('.qr-palette-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const fg = btn.getAttribute('data-fg');
        const bg = btn.getAttribute('data-bg');
        if (fg && bg) {
          document.querySelectorAll('.qr-palette-btn').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          state.colorFg = fg;
          state.colorBg = bg;
          syncColorPair('qr-color-fg', 'qr-color-fg-hex', fg);
          syncColorPair('qr-color-bg', 'qr-color-bg-hex', bg);
          updateSwatchDisplay('qr-fg-swatch', fg);
          updateSwatchDisplay('qr-bg-swatch', bg);
          if (!state.customEyeColor) {
            state.colorEye = fg;
            syncColorPair('qr-color-eye', 'qr-color-eye-hex', fg);
            updateSwatchDisplay('qr-eye-swatch', fg);
          }
          scheduleUpdate('desktop');
        }
      });
    });

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

    // 8. Downloads & Copy
    const dlPngBtn = document.getElementById('qr-dl-png');
    if (dlPngBtn) {
      dlPngBtn.addEventListener('click', () => downloadExport('png', 'desktop'));
    }

    const dlSvgBtn = document.getElementById('qr-dl-svg');
    if (dlSvgBtn) {
      dlSvgBtn.addEventListener('click', () => downloadExport('svg', 'desktop'));
    }

    const copyImgBtn = document.getElementById('qr-copy-img');
    if (copyImgBtn) {
      copyImgBtn.addEventListener('click', async () => {
        if (!currentCompositeCanvas) return;
        try {
          currentCompositeCanvas.toBlob(async (blob) => {
            if (blob && navigator.clipboard && window.ClipboardItem) {
              await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
              showToast('Customized QR Code copied to clipboard!', 'success');
            } else {
              showToast('Direct image clipboard copy not supported', 'info');
            }
          });
        } catch (e) {
          console.error('Clipboard copy error:', e);
          showToast('Failed to copy image', 'error');
        }
      });
    }

    const copyContentBtn = document.getElementById('qr-copy-content');
    if (copyContentBtn) {
      copyContentBtn.addEventListener('click', () => {
        const data = getEffectiveData();
        if (navigator.clipboard) {
          navigator.clipboard.writeText(data).then(() => {
            showToast('Encoded content copied to clipboard!', 'success');
          });
        }
      });
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
        finalCanvas.toBlob(blob => {
          if (blob) {
            saveExportBlob(blob, filename, 'image/png', targetContext);
          }
        }, 'image/png');
      }
    } catch (e) {
      console.error('Download QR error:', e);
      showToast('Error generating QR export: ' + e.message, 'error');
    }
  }

  function saveExportBlob(blob, filename, mimeType, targetContext) {
    if (targetContext === 'mobile' && window.MobileUtils && typeof window.MobileUtils.downloadBlob === 'function') {
      window.MobileUtils.downloadBlob(blob, filename);
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
    if (window.Utils && typeof window.Utils.showToast === 'function') {
      window.Utils.showToast(msg, type);
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

    // Input fields & content tabs
    const urlInput = document.getElementById('qr-url-input');
    if (urlInput) urlInput.value = DEFAULT_OPTIONS.data;

    const textInput = document.getElementById('qr-text-input');
    if (textInput) textInput.value = 'Welcome to FileForge!';

    const textCounter = document.getElementById('qr-text-counter');
    if (textCounter) textCounter.textContent = '22 characters';

    const inputTabs = document.querySelectorAll('#qr-input-tabs .qr-input-tab');
    inputTabs.forEach(t => t.classList.toggle('active', t.getAttribute('data-type') === 'url'));

    const tabUrl = document.getElementById('qr-tab-url');
    if (tabUrl) tabUrl.classList.remove('hidden');

    const tabText = document.getElementById('qr-tab-text');
    if (tabText) tabText.classList.add('hidden');

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
window.QRCodeGenerator = QRCodeGenerator;
