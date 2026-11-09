/**
 * FileForge - Advanced QR Code Generator Studio
 * Fully client-side, privacy-first QR Code generation and customization
 */
const QRCodeGenerator = (() => {
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
    size: 320,
    margin: 10,
    errorCorrection: 'M'
  };

  let state = { ...DEFAULT_OPTIONS };

  function init() {
    initDesktop();
  }

  function initDesktop() {
    const container = document.getElementById('tool-qr-generator');
    if (!container) return;

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

  function renderLiveQR(targetContext) {
    if (typeof window.QRCodeStyling === 'undefined') {
      console.warn('QRCodeStyling library not loaded');
      return;
    }

    const previewContainer = targetContext === 'mobile'
      ? document.getElementById('mobile-qr-preview-mount')
      : document.getElementById('qr-preview-mount');

    if (!previewContainer) return;

    const config = buildQRConfig(320);

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

    updateInfoSection(targetContext);
  }

  function scheduleUpdate(targetContext = 'desktop') {
    clearTimeout(updateDebounceTimer);
    updateDebounceTimer = setTimeout(() => {
      renderLiveQR(targetContext);
    }, 120);
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
        warnEl.textContent = 'Low contrast detected between foreground and background. QR code may be difficult to scan.';
        warnEl.classList.remove('hidden');
      } else if (isVeryDense) {
        warnEl.textContent = 'Large content density. Recommend using "Large" download size or higher error correction.';
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

  function bindDesktopEvents() {
    // Tabs
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

    // Inputs
    ['qr-url-input', 'qr-text-input'].forEach(id => {
      const el = document.getElementById(id);
      if (el) {
        el.addEventListener('input', () => scheduleUpdate('desktop'));
      }
    });

    // Character counter for text tab
    const textInput = document.getElementById('qr-text-input');
    const textCounter = document.getElementById('qr-text-counter');
    if (textInput && textCounter) {
      textInput.addEventListener('input', () => {
        textCounter.textContent = `${textInput.value.length} characters`;
      });
    }

    // Swatch click triggers for hidden pickers
    const bindSwatchTrigger = (swatchId, pickerId) => {
      const swatch = document.getElementById(swatchId);
      const picker = document.getElementById(pickerId);
      if (swatch && picker) {
        swatch.addEventListener('click', () => picker.click());
      }
    };
    bindSwatchTrigger('qr-fg-swatch', 'qr-color-fg');
    bindSwatchTrigger('qr-bg-swatch', 'qr-color-bg');
    bindSwatchTrigger('qr-eye-swatch', 'qr-color-eye');

    const updateSwatchDisplay = (swatchId, color) => {
      const el = document.getElementById(swatchId);
      if (el) el.style.backgroundColor = color;
    };

    // Color pickers & inputs
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

    // Preset palettes
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

    // Pattern style visual selector
    const patternLabel = document.getElementById('qr-pattern-label');
    const patternCards = document.querySelectorAll('#qr-pattern-group .qr-visual-card');
    patternCards.forEach(card => {
      card.addEventListener('click', () => {
        patternCards.forEach(c => c.classList.remove('active'));
        card.classList.add('active');
        const pat = card.getAttribute('data-pattern');
        state.patternStyle = pat;
        if (patternLabel) {
          patternLabel.textContent = card.querySelector('.qr-visual-title')?.textContent || pat;
        }
        scheduleUpdate('desktop');
      });
    });

    // Corner square visual selector
    const cornerSqCards = document.querySelectorAll('#qr-corner-sq-group .qr-visual-card');
    cornerSqCards.forEach(card => {
      card.addEventListener('click', () => {
        cornerSqCards.forEach(c => c.classList.remove('active'));
        card.classList.add('active');
        state.cornerSquareStyle = card.getAttribute('data-corner-sq');
        scheduleUpdate('desktop');
      });
    });

    // Corner dot visual selector
    const cornerDotCards = document.querySelectorAll('#qr-corner-dot-group .qr-visual-card');
    cornerDotCards.forEach(card => {
      card.addEventListener('click', () => {
        cornerDotCards.forEach(c => c.classList.remove('active'));
        card.classList.add('active');
        state.cornerDotStyle = card.getAttribute('data-corner-dot');
        scheduleUpdate('desktop');
      });
    });

    // Resolution segmented bar
    const sizeBtns = document.querySelectorAll('#qr-size-group .qr-segmented-btn');
    sizeBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        sizeBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        state.size = parseInt(btn.getAttribute('data-size'), 10) || 320;
        scheduleUpdate('desktop');
      });
    });

    // Margin segmented bar
    const marginBtns = document.querySelectorAll('#qr-margin-group .qr-segmented-btn');
    marginBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        marginBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        state.margin = parseInt(btn.getAttribute('data-margin'), 10);
        scheduleUpdate('desktop');
      });
    });

    // Error correction segmented bar
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
        state = { ...DEFAULT_OPTIONS };
        // Reset color swatches and inputs
        syncColorPair('qr-color-fg', 'qr-color-fg-hex', state.colorFg);
        syncColorPair('qr-color-bg', 'qr-color-bg-hex', state.colorBg);
        syncColorPair('qr-color-eye', 'qr-color-eye-hex', state.colorEye);
        updateSwatchDisplay('qr-fg-swatch', state.colorFg);
        updateSwatchDisplay('qr-bg-swatch', state.colorBg);
        updateSwatchDisplay('qr-eye-swatch', state.colorEye);

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
        document.querySelectorAll('.qr-palette-btn').forEach(b => {
          b.classList.toggle('active', b.getAttribute('data-fg') === state.colorFg && b.getAttribute('data-bg') === state.colorBg);
        });

        showToast('Settings restored to defaults', 'info');
        scheduleUpdate('desktop');
      });
    }

        // Downloads
    const dlPngBtn = document.getElementById('qr-dl-png');
    if (dlPngBtn) {
      dlPngBtn.addEventListener('click', () => downloadExport('png', 'desktop'));
    }

    const dlSvgBtn = document.getElementById('qr-dl-svg');
    if (dlSvgBtn) {
      dlSvgBtn.addEventListener('click', () => downloadExport('svg', 'desktop'));
    }

    // Copy QR Image
    const copyImgBtn = document.getElementById('qr-copy-img');
    if (copyImgBtn) {
      copyImgBtn.addEventListener('click', async () => {
        if (!qrInstance) return;
        try {
          const exportQR = new window.QRCodeStyling(buildQRConfig(800));
          const blob = await exportQR.getRawData('png');
          if (navigator.clipboard && window.ClipboardItem && blob) {
            await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
            showToast('QR Code image copied to clipboard!', 'success');
          } else {
            showToast('Direct image clipboard copy not supported by your browser', 'info');
          }
        } catch (e) {
          console.error('Clipboard copy error:', e);
          showToast('Failed to copy image', 'error');
        }
      });
    }

    // Copy Content
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

  async function downloadExport(format, targetContext) {
    if (typeof window.QRCodeStyling === 'undefined') return;

    try {
      const exportDimension = state.size >= 480 ? state.size : 800;
      const exportConfig = buildQRConfig(exportDimension);
      const exportQR = new window.QRCodeStyling(exportConfig);

      const ext = format === 'svg' ? 'svg' : 'png';
      const filename = `FileForge-QR-Code.${ext}`;

      if (format === 'svg') {
        const blob = await exportQR.getRawData('svg');
        if (blob) {
          saveExportBlob(blob, filename, 'image/svg+xml', targetContext);
        }
      } else {
        const blob = await exportQR.getRawData('png');
        if (blob) {
          saveExportBlob(blob, filename, 'image/png', targetContext);
        }
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

  function handleFiles(files) {
    // Image and PDF QR modes temporarily disabled
  }

  return {
    init,
    renderLiveQR,
    scheduleUpdate,
    handleFiles,
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

