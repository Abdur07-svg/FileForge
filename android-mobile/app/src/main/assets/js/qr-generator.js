/**
 * FileForge Mobile - Advanced QR Code Generator Studio
 * Fully client-side, mobile touch-optimized QR generator controller
 */
const MobileQRCodeGenerator = (() => {
  let qrInstance = null;
  let updateDebounceTimer = null;

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
    errorCorrection: 'M'
  };

  let state = { ...DEFAULT_OPTIONS };

  function init() {
    const container = document.getElementById('tool-view-qr-generator');
    if (!container) return;

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

  function renderLiveQR() {
    if (typeof window.QRCodeStyling === 'undefined') {
      console.warn('QRCodeStyling library not loaded in mobile');
      return;
    }

    const previewContainer = document.getElementById('mobile-qr-preview-mount');
    if (!previewContainer) return;

    const config = buildQRConfig(100);

    try {
      if (!qrInstance) {
        qrInstance = new window.QRCodeStyling(config);
        previewContainer.innerHTML = '';
        qrInstance.append(previewContainer);
      } else {
        qrInstance.update(config);
        if (!previewContainer.contains(qrInstance._container) && !previewContainer.firstChild) {
          qrInstance.append(previewContainer);
        }
      }
    } catch (e) {
      console.error('Failed to render styled QR code:', e);
    }

    updateInfoSection();
  }

  function scheduleUpdate() {
    clearTimeout(updateDebounceTimer);
    updateDebounceTimer = setTimeout(() => {
      renderLiveQR();
    }, 100);
  }

  function updateInfoSection() {
    const data = getEffectiveData();
    const byteLength = new TextEncoder().encode(data).length;

    const typeLabels = {
      url: 'Website URL',
      text: 'Plain Text'
    };

    const typeEl = document.getElementById('mobile-qr-info-type');
    const bytesEl = document.getElementById('mobile-qr-info-bytes');
    const previewTextEl = document.getElementById('mobile-qr-info-content');
    const warnEl = document.getElementById('mobile-qr-contrast-warn');

    if (typeEl) typeEl.textContent = typeLabels[state.inputType] || 'Custom';
    if (bytesEl) bytesEl.textContent = `${data.length} chars (${byteLength} bytes)`;
    if (previewTextEl) {
      previewTextEl.textContent = data.length > 40 ? data.substring(0, 37) + '...' : data;
    }

    if (warnEl) {
      const isLowContrast = checkLowContrast(state.colorFg, state.colorBg);
      const isVeryDense = byteLength > 400;

      if (isLowContrast) {
        warnEl.textContent = 'Low contrast between colors. Scanner may struggle.';
        warnEl.classList.remove('hidden');
      } else if (isVeryDense) {
        warnEl.textContent = 'Dense content. Use higher error correction level.';
        warnEl.classList.remove('hidden');
      } else {
        warnEl.classList.add('hidden');
      }
    }
  }

  function checkLowContrast(hex1, hex2) {
    function getLum(hex) {
      const c = hex.replace('#', '');
      if (c.length !== 6) return 0.5;
      const r = parseInt(c.substr(0, 2), 16) / 255;
      const g = parseInt(c.substr(2, 2), 16) / 255;
      const b = parseInt(c.substr(4, 2), 16) / 255;
      return 0.2126 * r + 0.7152 * g + 0.0722 * b;
    }
    const l1 = getLum(hex1);
    const l2 = getLum(hex2);
    return Math.abs(l1 - l2) < 0.25;
  }

  function bindEvents() {
    // Tabs
    const tabs = document.querySelectorAll('.mqr-tab-btn');
    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        haptic('light');
        tabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        const targetType = tab.getAttribute('data-type');
        state.inputType = targetType;

        document.querySelectorAll('.mqr-tab-pane').forEach(c => c.classList.add('hidden'));
        const activePane = document.getElementById(`mqr-pane-${targetType}`);
        if (activePane) activePane.classList.remove('hidden');

        scheduleUpdate();
      });
    });

    // Inputs
    ['mqr-url-input', 'mqr-text-input'].forEach(id => {
      const el = document.getElementById(id);
      if (el) {
        el.addEventListener('input', () => scheduleUpdate());
      }
    });

    // Character counter for text tab
    const textInput = document.getElementById('mqr-text-input');
    const textCounter = document.getElementById('mqr-text-counter');
    if (textInput && textCounter) {
      textInput.addEventListener('input', () => {
        textCounter.textContent = `${textInput.value.length} characters`;
      });
    }

    // Swatch triggers for hidden pickers
    const bindSwatchTrigger = (swatchId, pickerId) => {
      const swatch = document.getElementById(swatchId);
      const picker = document.getElementById(pickerId);
      if (swatch && picker) {
        swatch.addEventListener('click', () => picker.click());
      }
    };
    bindSwatchTrigger('mqr-fg-swatch', 'mqr-color-fg');
    bindSwatchTrigger('mqr-bg-swatch', 'mqr-color-bg');
    bindSwatchTrigger('mqr-eye-swatch', 'mqr-color-eye');

    const updateSwatchDisplay = (swatchId, color) => {
      const el = document.getElementById(swatchId);
      if (el) el.style.backgroundColor = color;
    };

    // Color pickers & inputs
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
        haptic('light');
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

    // Preset palettes
    document.querySelectorAll('.mqr-palette-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        haptic('light');
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

    // Pattern style visual selector
    const patternLabel = document.getElementById('mqr-pattern-label');
    const patternCards = document.querySelectorAll('#mqr-pattern-group .mqr-visual-card');
    patternCards.forEach(card => {
      card.addEventListener('click', () => {
        haptic('light');
        patternCards.forEach(c => c.classList.remove('active'));
        card.classList.add('active');
        const pat = card.getAttribute('data-pattern');
        state.patternStyle = pat;
        if (patternLabel) {
          patternLabel.textContent = card.querySelector('.mqr-visual-title')?.textContent || pat;
        }
        scheduleUpdate();
      });
    });

    // Corner square visual selector
    const cornerSqCards = document.querySelectorAll('#mqr-corner-sq-group .mqr-visual-card');
    cornerSqCards.forEach(card => {
      card.addEventListener('click', () => {
        haptic('light');
        cornerSqCards.forEach(c => c.classList.remove('active'));
        card.classList.add('active');
        state.cornerSquareStyle = card.getAttribute('data-corner-sq');
        scheduleUpdate();
      });
    });

    // Corner dot visual selector
    const cornerDotCards = document.querySelectorAll('#mqr-corner-dot-group .mqr-visual-card');
    cornerDotCards.forEach(card => {
      card.addEventListener('click', () => {
        haptic('light');
        cornerDotCards.forEach(c => c.classList.remove('active'));
        card.classList.add('active');
        state.cornerDotStyle = card.getAttribute('data-corner-dot');
        scheduleUpdate();
      });
    });

    // Resolution segmented bar
    const sizeBtns = document.querySelectorAll('#mqr-size-group .mqr-segmented-btn');
    sizeBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        haptic('light');
        sizeBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        state.size = parseInt(btn.getAttribute('data-size'), 10) || 280;
        scheduleUpdate();
      });
    });

    // Margin segmented bar
    const marginBtns = document.querySelectorAll('#mqr-margin-group .mqr-segmented-btn');
    marginBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        haptic('light');
        marginBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        state.margin = parseInt(btn.getAttribute('data-margin'), 10);
        scheduleUpdate();
      });
    });

    // Error correction segmented bar
    const ecBtns = document.querySelectorAll('#mqr-ec-group .mqr-segmented-btn');
    ecBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        haptic('light');
        ecBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        state.errorCorrection = btn.getAttribute('data-ec');
        scheduleUpdate();
      });
    });

    // Reset button
    const resetBtn = document.getElementById('mqr-reset-btn');
    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        haptic('light');
        state = { ...DEFAULT_OPTIONS };
        // Reset color swatches and inputs
        syncColorPair('mqr-color-fg', 'mqr-color-fg-hex', state.colorFg);
        syncColorPair('mqr-color-bg', 'mqr-color-bg-hex', state.colorBg);
        syncColorPair('mqr-color-eye', 'mqr-color-eye-hex', state.colorEye);
        updateSwatchDisplay('mqr-fg-swatch', state.colorFg);
        updateSwatchDisplay('mqr-bg-swatch', state.colorBg);
        updateSwatchDisplay('mqr-eye-swatch', state.colorEye);

        if (eyeCheck) eyeCheck.checked = false;
        if (eyeRow) eyeRow.classList.add('disabled-control');

        // Reset visual cards
        patternCards.forEach(c => c.classList.toggle('active', c.getAttribute('data-pattern') === state.patternStyle));
        if (patternLabel) patternLabel.textContent = 'Square';

        cornerSqCards.forEach(c => c.classList.toggle('active', c.getAttribute('data-corner-sq') === state.cornerSquareStyle));
        cornerDotCards.forEach(c => c.classList.toggle('active', c.getAttribute('data-corner-dot') === state.cornerDotStyle));

        // Reset segmented bars
        sizeBtns.forEach(b => b.classList.toggle('active', b.getAttribute('data-size') === String(state.size)));
        marginBtns.forEach(b => b.classList.toggle('active', b.getAttribute('data-margin') === String(state.margin)));
        ecBtns.forEach(b => b.classList.toggle('active', b.getAttribute('data-ec') === state.errorCorrection));

        // Reset palette selection
        document.querySelectorAll('.mqr-palette-btn').forEach(b => {
          b.classList.toggle('active', b.getAttribute('data-fg') === state.colorFg && b.getAttribute('data-bg') === state.colorBg);
        });

        showToast('Settings restored', 'info');
        scheduleUpdate();
      });
    }

        // Downloads
    const dlPngBtn = document.getElementById('mqr-dl-png');
    if (dlPngBtn) {
      dlPngBtn.addEventListener('click', () => downloadExport('png'));
    }

    const dlSvgBtn = document.getElementById('mqr-dl-svg');
    if (dlSvgBtn) {
      dlSvgBtn.addEventListener('click', () => downloadExport('svg'));
    }

    // Copy Content
    const copyContentBtn = document.getElementById('mqr-copy-content');
    if (copyContentBtn) {
      copyContentBtn.addEventListener('click', () => {
        haptic('light');
        const data = getEffectiveData();
        if (navigator.clipboard) {
          navigator.clipboard.writeText(data).then(() => {
            showToast('Copied to clipboard!', 'success');
          });
        }
      });
    }
  }

  async function downloadExport(format) {
    if (typeof window.QRCodeStyling === 'undefined') return;
    haptic('success');

    try {
      const exportDimension = state.size >= 480 ? state.size : 800;
      const exportConfig = buildQRConfig(exportDimension);
      const exportQR = new window.QRCodeStyling(exportConfig);

      const ext = format === 'svg' ? 'svg' : 'png';
      const filename = `FileForge-QR-Code.${ext}`;

      if (format === 'svg') {
        const blob = await exportQR.getRawData('svg');
        if (blob) {
          saveExportBlob(blob, filename, 'image/svg+xml');
        }
      } else {
        const blob = await exportQR.getRawData('png');
        if (blob) {
          saveExportBlob(blob, filename, 'image/png');
        }
      }
    } catch (e) {
      console.error('Download QR error:', e);
      showToast('Error generating QR: ' + e.message, 'error');
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
      showToast(`Downloaded ${filename}`, 'success');
    }
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

  function haptic(type) {
    if (window.MobileUtils && typeof window.MobileUtils.triggerHaptic === 'function') {
      window.MobileUtils.triggerHaptic(type);
    }
  }

  function showToast(msg, type = 'info') {
    if (window.MobileUtils && typeof window.MobileUtils.showToast === 'function') {
      window.MobileUtils.showToast(msg, type);
    } else {
      console.log(`[Toast ${type}]: ${msg}`);
    }
  }

  function handleFiles(files) {
    // Image and PDF QR modes temporarily disabled
  }

  return {
    init,
    renderLiveQR,
    scheduleUpdate,
    handleFiles,
    downloadExport
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

