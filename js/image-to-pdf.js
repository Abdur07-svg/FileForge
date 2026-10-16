const ImageToPDF = (() => {

  let imageList = [];

  let currentEditingIndex = -1;
  let previewPageIndex = 0;
  let generatedPdfBlob = null;
  let currentPreset = 'general';

  let signatureRawImage = null;
  let signatureDataUrl = null;
  let signatureSettings = {
    sensitivity: 45,
    inkColor: 'original',
    autoCrop: true,
    smooth: true
  };
  let signaturePlacement = {
    active: false,
    applyToAll: false,

    relX: 0.65,
    relY: 0.75,
    relW: 0.25,
    aspectRatio: 1,
    rotation: 0
  };

  let editorCropActive = false;
  let editorCropRatio = 'free';
  let editorCropRect = { x: 0, y: 0, w: 100, h: 100 };
  let editorTempState = {};
  let isDraggingCrop = false;
  let cropDragMode = null;
  let cropDragStart = { x: 0, y: 0, rectX: 0, rectY: 0, rectW: 0, rectH: 0 };
  let editorImgObj = null;

  let isDraggingSig = false;
  let isResizingSig = false;
  let sigDragStart = { mouseX: 0, mouseY: 0, origX: 0, origY: 0, origW: 0 };

  let layoutScope = 'page'; // 'page' (per-page override) or 'all' (all pages)
  let isUpdatingFormFromPage = false;
  let globalLayoutSettings = null;

  let dom = {};

  const MM_TO_PT = 72 / 25.4; 

  const CARD_PRESETS = {
    'standard-id': { width: 85.6, height: 54.0 },
    'aadhaar-slip': { width: 86.0, height: 54.0 },
    'passport-in': { width: 35.0, height: 45.0 },
    'stamp': { width: 25.0, height: 30.0 },
    'business-card': { width: 89.0, height: 51.0 }
  };

  function extractImageDPI(bytes) {
    if (!bytes || bytes.length < 16) return null;
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);

    if (bytes[0] === 0xFF && bytes[1] === 0xD8) {
      let offset = 2;
      while (offset < bytes.length - 4) {
        if (bytes[offset] !== 0xFF) {
          offset++;
          continue;
        }
        const marker = bytes[offset + 1];
        if (marker === 0xDA || marker === 0xD9) break; 

        const length = view.getUint16(offset + 2);
        if (length <= 0 || offset + 2 + length > bytes.length) break;

        if (marker === 0xE0 && length >= 14) {
          const id = String.fromCharCode(bytes[offset + 4], bytes[offset + 5], bytes[offset + 6], bytes[offset + 7]);
          if (id === 'JFIF') {
            const units = bytes[offset + 11]; 
            const xDensity = view.getUint16(offset + 12);
            const yDensity = view.getUint16(offset + 14);
            if (units === 1 && xDensity > 0) {
              return { dpiX: xDensity, dpiY: yDensity || xDensity, source: 'JFIF' };
            } else if (units === 2 && xDensity > 0) {
              const dpi = Math.round(xDensity * 2.54);
              return { dpiX: dpi, dpiY: Math.round((yDensity || xDensity) * 2.54), source: 'JFIF' };
            }
          }
        }

        if (marker === 0xE1 && length >= 14) {
          const exifId = String.fromCharCode(bytes[offset + 4], bytes[offset + 5], bytes[offset + 6], bytes[offset + 7]);
          if (exifId === 'Exif') {
            try {
              const tiffStart = offset + 10;
              const isLittle = bytes[tiffStart] === 0x49 && bytes[tiffStart + 1] === 0x49;
              const ifdOffset = view.getUint32(tiffStart + 4, isLittle);
              const numEntries = view.getUint16(tiffStart + ifdOffset, isLittle);
              let resUnit = 2; 
              let xRes = null, yRes = null;

              for (let i = 0; i < numEntries; i++) {
                const entryStart = tiffStart + ifdOffset + 2 + (i * 12);
                if (entryStart + 12 > bytes.length) break;
                const tag = view.getUint16(entryStart, isLittle);

                if (tag === 0x0128) {
                  resUnit = view.getUint16(entryStart + 8, isLittle);
                } else if (tag === 0x011A) {
                  const valOffset = view.getUint32(entryStart + 8, isLittle);
                  if (tiffStart + valOffset + 8 <= bytes.length) {
                    const num = view.getUint32(tiffStart + valOffset, isLittle);
                    const den = view.getUint32(tiffStart + valOffset + 4, isLittle);
                    if (den > 0) xRes = num / den;
                  }
                } else if (tag === 0x011B) {
                  const valOffset = view.getUint32(entryStart + 8, isLittle);
                  if (tiffStart + valOffset + 8 <= bytes.length) {
                    const num = view.getUint32(tiffStart + valOffset, isLittle);
                    const den = view.getUint32(tiffStart + valOffset + 4, isLittle);
                    if (den > 0) yRes = num / den;
                  }
                }
              }

              if (xRes && xRes > 0) {
                let dpi = xRes;
                if (resUnit === 3) dpi = Math.round(xRes * 2.54);
                return { dpiX: Math.round(dpi), dpiY: Math.round(yRes ? (resUnit === 3 ? yRes * 2.54 : yRes) : dpi), source: 'EXIF' };
              }
            } catch (e) {
              
            }
          }
        }

        offset += 2 + length;
      }
    }

    if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4E && bytes[3] === 0x47) {
      let offset = 8;
      while (offset < bytes.length - 8) {
        const length = view.getUint32(offset);
        const chunkType = String.fromCharCode(bytes[offset + 4], bytes[offset + 5], bytes[offset + 6], bytes[offset + 7]);
        if (chunkType === 'pHYs' && length >= 9) {
          const ppmX = view.getUint32(offset + 8);
          const ppmY = view.getUint32(offset + 12);
          const unit = bytes[offset + 16]; 
          if (unit === 1 && ppmX > 0) {
            const dpiX = Math.round(ppmX * 0.0254);
            const dpiY = Math.round(ppmY * 0.0254);
            return { dpiX, dpiY, source: 'pHYs' };
          }
        }
        if (chunkType === 'IEND') break;
        offset += 12 + length;
      }
    }

    return null;
  }

  const FILTER_PRESETS = [
    { id: 'original', name: 'Original', desc: 'No modification' },
    { id: 'vibrant', name: 'Vibrant', desc: 'Vivid & clear' },
    { id: 'soft-tone', name: 'Soft Tone', desc: 'Balanced & gentle' },
    { id: 'color', name: 'Color', desc: 'Color enhanced' },
    { id: 'sharp-black', name: 'Sharp Black', desc: 'Deep black text' },
    { id: 'grayscale', name: 'Grayscale', desc: 'Clean B&W' },
    { id: 'high-contrast', name: 'High Contrast', desc: 'Enhanced contrast' },
    { id: 'clean-document', name: 'Clean Document', desc: 'Document white' }
  ];

  function init() {
    dom = {
      container: document.getElementById('tool-image-to-pdf'),
      dropzone: document.getElementById('i2p-dropzone'),
      fileInput: document.getElementById('i2p-file-input'),
      addMoreInput: document.getElementById('i2p-add-more-input'),
      browseBtn: document.getElementById('i2p-browse-btn'),
      addMoreBtn: document.getElementById('i2p-add-more-btn'),
      workspace: document.getElementById('i2p-workspace'),
      emptyState: document.getElementById('i2p-empty-state'),
      imageListContainer: document.getElementById('i2p-image-list'),
      imageCountBadge: document.getElementById('i2p-image-count-badge'),

      pageSizeSelect: document.getElementById('i2p-page-size'),
      customSizeRow: document.getElementById('i2p-custom-size-row'),
      customWidthInput: document.getElementById('i2p-custom-width'),
      customHeightInput: document.getElementById('i2p-custom-height'),
      orientationSelect: document.getElementById('i2p-orientation'),
      marginSelect: document.getElementById('i2p-margin'),
      customMarginRow: document.getElementById('i2p-custom-margin-row'),
      customMarginInput: document.getElementById('i2p-custom-margin'),
      imagePlacementSelect: document.getElementById('i2p-image-placement'),
      scopePageBtn: document.getElementById('i2p-scope-page'),
      scopeAllBtn: document.getElementById('i2p-scope-all'),
      activePageNumSpan: document.getElementById('i2p-active-page-num'),
      previewLayoutBadge: document.getElementById('i2p-preview-layout-badge'),

      frontBackPanel: document.getElementById('i2p-front-back-panel'),
      fbPresetSelect: document.getElementById('i2p-fb-preset'),
      fbWidthInput: document.getElementById('i2p-fb-width'),
      fbHeightInput: document.getElementById('i2p-fb-height'),
      fbGapInput: document.getElementById('i2p-fb-gap'),
      fbSwapBtn: document.getElementById('i2p-fb-swap-wh'),
      fbLockRatioCheck: document.getElementById('i2p-fb-lock-ratio'),
      fbBorderCheck: document.getElementById('i2p-fb-border'),
      fbWarning: document.getElementById('i2p-fb-warning'),

      cardPresetSelect: document.getElementById('i2p-card-preset'),
      cardWidthInput: document.getElementById('i2p-card-width'),
      cardHeightInput: document.getElementById('i2p-card-height'),
      cardSwapBtn: document.getElementById('i2p-card-swap-wh'),
      cardLockRatioCheck: document.getElementById('i2p-card-lock-ratio'),
      cardBorderCheck: document.getElementById('i2p-card-border'),
      idCardPanel: document.getElementById('i2p-id-card-panel'),

      customDimPanel: document.getElementById('i2p-custom-dim-panel'),
      customMmWidthInput: document.getElementById('i2p-custom-mm-width'),
      customMmHeightInput: document.getElementById('i2p-custom-mm-height'),
      customLockRatioCheck: document.getElementById('i2p-custom-lock-ratio'),
      customBorderCheck: document.getElementById('i2p-custom-border'),

      multiCardPanel: document.getElementById('i2p-multi-card-panel'),
      multiCardLayoutSelect: document.getElementById('i2p-multi-card-layout'),
      multiCardWidthInput: document.getElementById('i2p-multi-card-width'),
      multiCardHeightInput: document.getElementById('i2p-multi-card-height'),
      multiCardGapInput: document.getElementById('i2p-multi-card-gap'),
      multiLockRatioCheck: document.getElementById('i2p-multi-lock-ratio'),
      multiBorderCheck: document.getElementById('i2p-multi-border'),

      originalDpiPanel: document.getElementById('i2p-original-dpi-panel'),
      printDpiSelect: document.getElementById('i2p-print-dpi'),
      originalDpiInfo: document.getElementById('i2p-original-dpi-info'),

      generateBtn: document.getElementById('i2p-generate-btn'),
      downloadBtn: document.getElementById('i2p-download-btn'),
      resetBtn: document.getElementById('i2p-reset-btn'),
      createAnotherBtn: document.getElementById('i2p-create-another-btn'),
      backToSettingsBtn: document.getElementById('i2p-back-settings-btn'),
      pdfReadyCard: document.getElementById('i2p-pdf-ready-card'),
      pdfConfigCard: document.getElementById('i2p-config-card'),
      progressBar: document.getElementById('i2p-progress-bar'),
      progressContainer: document.getElementById('i2p-progress-container'),
      progressText: document.getElementById('i2p-progress-text'),

      previewStage: document.getElementById('i2p-preview-stage'),
      previewCanvas: document.getElementById('i2p-preview-canvas'),
      previewPageNum: document.getElementById('i2p-preview-page-num'),
      previewPrevBtn: document.getElementById('i2p-preview-prev-btn'),
      previewNextBtn: document.getElementById('i2p-preview-next-btn'),
      previewTotalPages: document.getElementById('i2p-preview-total-pages'),
      sigOverlayBox: document.getElementById('i2p-sig-overlay-box'),
      sigOverlayImg: document.getElementById('i2p-sig-overlay-img'),
      sigResizeHandle: document.getElementById('i2p-sig-resize-handle'),
      sigDeleteBtn: document.getElementById('i2p-sig-delete-btn'),
      addSignatureBtn: document.getElementById('i2p-add-signature-btn'),
      sigControlsRow: document.getElementById('i2p-sig-controls-row'),
      sigApplyScopeSelect: document.getElementById('i2p-sig-scope-select'),
      sigPosBtns: document.querySelectorAll('.i2p-sig-pos-btn'),

      editorModal: document.getElementById('i2p-editor-modal'),
      editorCloseBtn: document.getElementById('i2p-editor-close-btn'),
      editorSaveBtn: document.getElementById('i2p-editor-save-btn'),
      editorCancelBtn: document.getElementById('i2p-editor-cancel-btn'),
      editorPrevBtn: document.getElementById('i2p-editor-prev-btn'),
      editorNextBtn: document.getElementById('i2p-editor-next-btn'),
      editorPageInfo: document.getElementById('i2p-editor-page-info'),
      editorMagnifier: document.getElementById('i2p-editor-magnifier'),
      editorMagnifierCanvas: document.getElementById('i2p-editor-magnifier-canvas'),
      editorCanvas: document.getElementById('i2p-editor-canvas'),
      editorFilename: document.getElementById('i2p-editor-filename'),
      editorDimsBadge: document.getElementById('i2p-editor-dims'),
      cropToggleBtn: document.getElementById('i2p-crop-toggle-btn'),
      cropControlsPanel: document.getElementById('i2p-crop-controls-panel'),
      cropRatioBtns: document.querySelectorAll('.i2p-crop-ratio-btn'),
      applyCropBtn: document.getElementById('i2p-apply-crop-btn'),
      cancelCropBtn: document.getElementById('i2p-cancel-crop-btn'),
      resetCropBtn: document.getElementById('i2p-reset-crop-btn'),
      rotateCwBtn: document.getElementById('i2p-rotate-cw'),
      rotateCcwBtn: document.getElementById('i2p-rotate-ccw'),
      flipHBtn: document.getElementById('i2p-flip-h'),
      flipVBtn: document.getElementById('i2p-flip-v'),
      filterCardsRow: document.getElementById('i2p-filter-cards-row'),

      signatureModal: document.getElementById('i2p-signature-modal'),
      sigCloseBtn: document.getElementById('i2p-sig-close-btn'),
      sigCancelBtn: document.getElementById('i2p-sig-cancel-btn'),
      sigUseBtn: document.getElementById('i2p-sig-use-btn'),
      sigDropzone: document.getElementById('i2p-sig-dropzone'),
      sigFileInput: document.getElementById('i2p-sig-file-input'),
      sigBrowseBtn: document.getElementById('i2p-sig-browse-btn'),
      sigSensitivitySlider: document.getElementById('i2p-sig-sensitivity'),
      sigSensitivityVal: document.getElementById('i2p-sig-sensitivity-val'),
      sigColorChips: document.querySelectorAll('.i2p-sig-color-chip'),
      sigAutoCropCheckbox: document.getElementById('i2p-sig-autocrop'),
      sigPreviewCanvas: document.getElementById('i2p-sig-preview-canvas'),
      sigEmptyPreview: document.getElementById('i2p-sig-empty-preview'),
      sigPreviewWrap: document.getElementById('i2p-sig-preview-wrap'),
      sigChangeBtn: document.getElementById('i2p-sig-change-btn')
    };

    if (!dom.container) return;

    syncPlacementPanels();
    updateScopeUI();
    bindEvents();
  }

  function syncPlacementPanels() {
    const val = dom.imagePlacementSelect ? dom.imagePlacementSelect.value : 'front-back';
    if (dom.frontBackPanel) dom.frontBackPanel.classList.toggle('hidden', val !== 'front-back');
    if (dom.idCardPanel) dom.idCardPanel.classList.toggle('hidden', val !== 'id-card');
    if (dom.customDimPanel) dom.customDimPanel.classList.toggle('hidden', val !== 'custom');
    if (dom.multiCardPanel) dom.multiCardPanel.classList.toggle('hidden', val !== 'multi-card');
    if (dom.originalDpiPanel) dom.originalDpiPanel.classList.toggle('hidden', val !== 'original');
    updateOriginalDpiInfo();
  }

  function updateOriginalDpiInfo() {
    if (!dom.originalDpiInfo) return;
    const currentItem = getCurrentPagePrimaryItem();
    if (!currentItem) {
      dom.originalDpiInfo.textContent = 'Physical dimensions will be calculated using image resolution instead of stretching across the page.';
      return;
    }
    const dims = getItemEffectiveDimensions(currentItem);
    let dpi = 300;
    const dpiSetting = dom.printDpiSelect ? dom.printDpiSelect.value : 'auto';
    if (dpiSetting !== 'auto' && !isNaN(parseFloat(dpiSetting))) {
      dpi = parseFloat(dpiSetting);
    } else if (currentItem.detectedDpi && currentItem.detectedDpi >= 72) {
      dpi = currentItem.detectedDpi;
    }
    const mmW = ((dims.width / dpi) * 25.4).toFixed(1);
    const mmH = ((dims.height / dpi) * 25.4).toFixed(1);
    if (currentItem.detectedDpi && (dpiSetting === 'auto' || parseFloat(dpiSetting) === currentItem.detectedDpi)) {
      dom.originalDpiInfo.innerHTML = `<strong>Detected metadata:</strong> ${currentItem.detectedDpi} DPI (${currentItem.dpiInfo ? currentItem.dpiInfo.source : 'Exif'}). Physical print size: <strong>${mmW} × ${mmH} mm</strong>.`;
    } else {
      dom.originalDpiInfo.innerHTML = `Using <strong>${dpi} DPI</strong> standard print resolution. Physical print size: <strong>${mmW} × ${mmH} mm</strong> (${dims.width} × ${dims.height} px).`;
    }
  }

  function updateScopeUI() {
    if (dom.scopePageBtn) {
      dom.scopePageBtn.classList.toggle('btn-primary', layoutScope === 'page');
      dom.scopePageBtn.classList.toggle('btn-secondary', layoutScope !== 'page');
    }
    if (dom.scopeAllBtn) {
      dom.scopeAllBtn.classList.toggle('btn-primary', layoutScope === 'all');
      dom.scopeAllBtn.classList.toggle('btn-secondary', layoutScope !== 'all');
    }
    if (dom.activePageNumSpan) {
      dom.activePageNumSpan.textContent = (previewPageIndex + 1);
    }
  }

  function updatePreviewBadge(pageSettings) {
    if (!dom.previewLayoutBadge) return;
    const p = pageSettings ? (pageSettings.placement || 'front-back') : 'front-back';
    if (p === 'front-back') {
      const w = pageSettings && pageSettings.fbWidthMm !== undefined ? pageSettings.fbWidthMm : 85.6;
      const h = pageSettings && pageSettings.fbHeightMm !== undefined ? pageSettings.fbHeightMm : 54.0;
      dom.previewLayoutBadge.textContent = `Front + Back (${w}×${h}mm)`;
      dom.previewLayoutBadge.className = 'badge badge-primary';
    } else if (p === 'fit') {
      dom.previewLayoutBadge.textContent = 'Fit to Page';
      dom.previewLayoutBadge.className = 'badge badge-info';
    } else if (p === 'id-card') {
      const w = pageSettings && pageSettings.cardWidthMm !== undefined ? pageSettings.cardWidthMm : 85.6;
      const h = pageSettings && pageSettings.cardHeightMm !== undefined ? pageSettings.cardHeightMm : 54.0;
      dom.previewLayoutBadge.textContent = `Single Card (${w}×${h}mm)`;
      dom.previewLayoutBadge.className = 'badge badge-primary';
    } else if (p === 'custom') {
      const w = pageSettings && pageSettings.customMmW !== undefined ? pageSettings.customMmW : 100;
      const h = pageSettings && pageSettings.customMmH !== undefined ? pageSettings.customMmH : 150;
      dom.previewLayoutBadge.textContent = `Custom (${w}×${h}mm)`;
      dom.previewLayoutBadge.className = 'badge badge-primary';
    } else if (p === 'multi-card') {
      dom.previewLayoutBadge.textContent = (pageSettings && pageSettings.multiLayout === '4-grid') ? '4 Cards Grid' : '2 Cards';
      dom.previewLayoutBadge.className = 'badge badge-secondary';
    } else if (p === 'original') {
      dom.previewLayoutBadge.textContent = 'Original Size';
      dom.previewLayoutBadge.className = 'badge badge-secondary';
    } else if (p === 'fill') {
      dom.previewLayoutBadge.textContent = 'Fill Page';
      dom.previewLayoutBadge.className = 'badge badge-secondary';
    }
  }

  function checkPrintableAreaWarning(settings, pageDim, marginPts) {
    if (!dom.fbWarning) return;
    if (!settings || settings.placement !== 'front-back') {
      dom.fbWarning.classList.add('hidden');
      return;
    }
    const boxW = (settings.fbWidthMm || 85.6) * MM_TO_PT;
    const boxH = (settings.fbHeightMm || 54.0) * MM_TO_PT;
    const gap = (settings.fbGapMm !== undefined ? settings.fbGapMm : 15) * MM_TO_PT;
    const usableW = Math.max(10, pageDim.width - marginPts * 2);
    const usableH = Math.max(10, pageDim.height - marginPts * 2);
    const totalH = boxH * 2 + gap;

    const overflowsW = boxW > usableW;
    const overflowsH = totalH > usableH;

    if (overflowsW || overflowsH) {
      dom.fbWarning.classList.remove('hidden');
      const reqW = ((boxW / MM_TO_PT)).toFixed(1);
      const reqH = ((totalH / MM_TO_PT)).toFixed(1);
      const availW = ((usableW / MM_TO_PT)).toFixed(1);
      const availH = ((usableH / MM_TO_PT)).toFixed(1);
      dom.fbWarning.innerHTML = `⚠️ <strong>Warning:</strong> Configured dimensions (${reqW} × ${reqH} mm) exceed printable page area (${availW} × ${availH} mm)! Cards will overflow page margins. Please reduce card height, gap, or margins.`;
    } else {
      dom.fbWarning.classList.add('hidden');
    }
  }

  function loadSettingsIntoForm(settings) {
    if (!settings) return;
    isUpdatingFormFromPage = true;
    try {
      if (dom.imagePlacementSelect) dom.imagePlacementSelect.value = settings.placement || 'front-back';

      if (dom.fbPresetSelect && settings.fbPreset) dom.fbPresetSelect.value = settings.fbPreset;
      if (dom.fbWidthInput && settings.fbWidthMm !== undefined) dom.fbWidthInput.value = settings.fbWidthMm;
      if (dom.fbHeightInput && settings.fbHeightMm !== undefined) dom.fbHeightInput.value = settings.fbHeightMm;
      if (dom.fbGapInput && settings.fbGapMm !== undefined) dom.fbGapInput.value = settings.fbGapMm;
      if (dom.fbLockRatioCheck && settings.fbLockRatio !== undefined) dom.fbLockRatioCheck.checked = settings.fbLockRatio;
      if (dom.fbBorderCheck && settings.fbBorder !== undefined) dom.fbBorderCheck.checked = settings.fbBorder;

      if (dom.cardPresetSelect && settings.cardPreset) dom.cardPresetSelect.value = settings.cardPreset;
      if (dom.cardWidthInput && settings.cardWidthMm !== undefined) dom.cardWidthInput.value = settings.cardWidthMm;
      if (dom.cardHeightInput && settings.cardHeightMm !== undefined) dom.cardHeightInput.value = settings.cardHeightMm;
      if (dom.cardLockRatioCheck && settings.cardLockRatio !== undefined) dom.cardLockRatioCheck.checked = settings.cardLockRatio;
      if (dom.cardBorderCheck && settings.cardBorder !== undefined) dom.cardBorderCheck.checked = settings.cardBorder;

      if (dom.customMmWidthInput && settings.customMmW !== undefined) dom.customMmWidthInput.value = settings.customMmW;
      if (dom.customMmHeightInput && settings.customMmH !== undefined) dom.customMmHeightInput.value = settings.customMmH;
      if (dom.customLockRatioCheck && settings.customLockRatio !== undefined) dom.customLockRatioCheck.checked = settings.customLockRatio;
      if (dom.customBorderCheck && settings.customBorder !== undefined) dom.customBorderCheck.checked = settings.customBorder;

      if (dom.multiCardLayoutSelect && settings.multiLayout) dom.multiCardLayoutSelect.value = settings.multiLayout;
      if (dom.multiCardWidthInput && settings.multiWidthMm !== undefined) dom.multiCardWidthInput.value = settings.multiWidthMm;
      if (dom.multiCardHeightInput && settings.multiHeightMm !== undefined) dom.multiCardHeightInput.value = settings.multiHeightMm;
      if (dom.multiCardGapInput && settings.multiGapMm !== undefined) dom.multiCardGapInput.value = settings.multiGapMm;
      if (dom.multiLockRatioCheck && settings.multiLockRatio !== undefined) dom.multiLockRatioCheck.checked = settings.multiLockRatio;
      if (dom.multiBorderCheck && settings.multiBorder !== undefined) dom.multiBorderCheck.checked = settings.multiBorder;

      if (dom.printDpiSelect && settings.printDpiSetting) dom.printDpiSelect.value = settings.printDpiSetting;

      syncPlacementPanels();
    } finally {
      isUpdatingFormFromPage = false;
    }
  }

  function onLayoutInputChange() {
    if (isUpdatingFormFromPage) return;
    const currentSettings = getLayoutSettings();

    if (layoutScope === 'page') {
      const pages = buildPDFPages(imageList);
      const currentPageDef = pages[previewPageIndex];
      if (currentPageDef && currentPageDef.leadItem) {
        currentPageDef.leadItem.layoutOverride = { ...currentSettings };
      }
    } else {
      globalLayoutSettings = { ...currentSettings };
      imageList.forEach(item => {
        delete item.layoutOverride;
      });
    }

    syncPlacementPanels();
    renderList();
    updatePDFPreview();
  }

  function setPreset(preset) {
    currentPreset = preset;
    const acceptMap = {
      'jpg-to-pdf': '.jpg,.jpeg,image/jpeg',
      'png-to-pdf': '.png,image/png',
      'general': 'image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp'
    };
    const acceptStr = acceptMap[preset] || 'image/*';
    if (dom.fileInput) dom.fileInput.accept = acceptStr;
    if (dom.addMoreInput) dom.addMoreInput.accept = acceptStr;
  }

  function bindEvents() {

    Utils.setupDropZone(dom.dropzone, handleFiles, ['image/', '.jpg', '.jpeg', '.png', '.webp']);

    if (dom.browseBtn) dom.browseBtn.addEventListener('click', () => dom.fileInput.click());
    if (dom.fileInput) {
      dom.fileInput.addEventListener('change', (e) => {
        handleFiles(Array.from(e.target.files));
        dom.fileInput.value = '';
      });
    }

    if (dom.addMoreBtn) dom.addMoreBtn.addEventListener('click', () => dom.addMoreInput.click());
    if (dom.addMoreInput) {
      dom.addMoreInput.addEventListener('change', (e) => {
        handleFiles(Array.from(e.target.files), true);
        dom.addMoreInput.value = '';
      });
    }

    if (dom.scopePageBtn) {
      dom.scopePageBtn.addEventListener('click', () => {
        layoutScope = 'page';
        updateScopeUI();
        Utils.showToast(`Layout edits now apply only to Page ${previewPageIndex + 1}.`, 'info');
      });
    }

    if (dom.scopeAllBtn) {
      dom.scopeAllBtn.addEventListener('click', () => {
        layoutScope = 'all';
        updateScopeUI();
        Utils.showToast('Layout edits now apply to All Pages.', 'info');
      });
    }

    if (dom.pageSizeSelect) {
      dom.pageSizeSelect.addEventListener('change', () => {
        if (dom.customSizeRow) dom.customSizeRow.classList.toggle('hidden', dom.pageSizeSelect.value !== 'custom');
        updatePDFPreview();
      });
    }
    if (dom.customWidthInput) dom.customWidthInput.addEventListener('input', updatePDFPreview);
    if (dom.customHeightInput) dom.customHeightInput.addEventListener('input', updatePDFPreview);
    if (dom.orientationSelect) {
      dom.orientationSelect.addEventListener('change', () => {
        const val = dom.orientationSelect.value;
        imageList.forEach(item => {
          item.orientation = val;
        });
        renderList();
        updatePDFPreview();
      });
    }
    if (dom.marginSelect) {
      dom.marginSelect.addEventListener('change', () => {
        if (dom.customMarginRow) dom.customMarginRow.classList.toggle('hidden', dom.marginSelect.value !== 'custom');
        updatePDFPreview();
      });
    }
    if (dom.customMarginInput) dom.customMarginInput.addEventListener('input', updatePDFPreview);

    if (dom.imagePlacementSelect) {
      dom.imagePlacementSelect.addEventListener('change', () => {
        onLayoutInputChange();
      });
    }

    // Front & Back vertical controls
    if (dom.fbPresetSelect) {
      dom.fbPresetSelect.addEventListener('change', () => {
        const val = dom.fbPresetSelect.value;
        const preset = CARD_PRESETS[val];
        if (preset) {
          if (dom.fbWidthInput) dom.fbWidthInput.value = preset.width;
          if (dom.fbHeightInput) dom.fbHeightInput.value = preset.height;
        }
        onLayoutInputChange();
      });
    }
    if (dom.fbWidthInput) {
      dom.fbWidthInput.addEventListener('input', () => {
        if (dom.fbPresetSelect) dom.fbPresetSelect.value = 'custom';
        onLayoutInputChange();
      });
    }
    if (dom.fbHeightInput) {
      dom.fbHeightInput.addEventListener('input', () => {
        if (dom.fbPresetSelect) dom.fbPresetSelect.value = 'custom';
        onLayoutInputChange();
      });
    }
    if (dom.fbGapInput) dom.fbGapInput.addEventListener('input', onLayoutInputChange);
    if (dom.fbSwapBtn) {
      dom.fbSwapBtn.addEventListener('click', () => {
        if (dom.fbWidthInput && dom.fbHeightInput) {
          const w = dom.fbWidthInput.value;
          const h = dom.fbHeightInput.value;
          dom.fbWidthInput.value = h;
          dom.fbHeightInput.value = w;
          if (dom.fbPresetSelect) dom.fbPresetSelect.value = 'custom';
          onLayoutInputChange();
        }
      });
    }
    if (dom.fbLockRatioCheck) dom.fbLockRatioCheck.addEventListener('change', onLayoutInputChange);
    if (dom.fbBorderCheck) dom.fbBorderCheck.addEventListener('change', onLayoutInputChange);

    // Single ID Card controls
    if (dom.cardPresetSelect) {
      dom.cardPresetSelect.addEventListener('change', () => {
        const val = dom.cardPresetSelect.value;
        const preset = CARD_PRESETS[val];
        if (preset) {
          if (dom.cardWidthInput) dom.cardWidthInput.value = preset.width;
          if (dom.cardHeightInput) dom.cardHeightInput.value = preset.height;
        }
        onLayoutInputChange();
      });
    }
    if (dom.cardWidthInput) {
      dom.cardWidthInput.addEventListener('input', () => {
        if (dom.cardPresetSelect) dom.cardPresetSelect.value = 'custom';
        onLayoutInputChange();
      });
    }
    if (dom.cardHeightInput) {
      dom.cardHeightInput.addEventListener('input', () => {
        if (dom.cardPresetSelect) dom.cardPresetSelect.value = 'custom';
        onLayoutInputChange();
      });
    }
    if (dom.cardSwapBtn) {
      dom.cardSwapBtn.addEventListener('click', () => {
        if (dom.cardWidthInput && dom.cardHeightInput) {
          const w = dom.cardWidthInput.value;
          const h = dom.cardHeightInput.value;
          dom.cardWidthInput.value = h;
          dom.cardHeightInput.value = w;
          if (dom.cardPresetSelect) dom.cardPresetSelect.value = 'custom';
          onLayoutInputChange();
        }
      });
    }
    if (dom.cardLockRatioCheck) dom.cardLockRatioCheck.addEventListener('change', onLayoutInputChange);
    if (dom.cardBorderCheck) dom.cardBorderCheck.addEventListener('change', onLayoutInputChange);

    // Custom dimensions controls
    if (dom.customMmWidthInput) dom.customMmWidthInput.addEventListener('input', onLayoutInputChange);
    if (dom.customMmHeightInput) dom.customMmHeightInput.addEventListener('input', onLayoutInputChange);
    if (dom.customLockRatioCheck) dom.customLockRatioCheck.addEventListener('change', onLayoutInputChange);
    if (dom.customBorderCheck) dom.customBorderCheck.addEventListener('change', onLayoutInputChange);

    // Multi-card controls
    if (dom.multiCardLayoutSelect) dom.multiCardLayoutSelect.addEventListener('change', onLayoutInputChange);
    if (dom.multiCardWidthInput) dom.multiCardWidthInput.addEventListener('input', onLayoutInputChange);
    if (dom.multiCardHeightInput) dom.multiCardHeightInput.addEventListener('input', onLayoutInputChange);
    if (dom.multiCardGapInput) dom.multiCardGapInput.addEventListener('input', onLayoutInputChange);
    if (dom.multiLockRatioCheck) dom.multiLockRatioCheck.addEventListener('change', onLayoutInputChange);
    if (dom.multiBorderCheck) dom.multiBorderCheck.addEventListener('change', onLayoutInputChange);

    if (dom.printDpiSelect) {
      dom.printDpiSelect.addEventListener('change', () => {
        updateOriginalDpiInfo();
        onLayoutInputChange();
      });
    }

    if (dom.generateBtn) dom.generateBtn.addEventListener('click', generatePDF);
    if (dom.downloadBtn) dom.downloadBtn.addEventListener('click', downloadPDF);
    if (dom.resetBtn) dom.resetBtn.addEventListener('click', resetTool);
    if (dom.createAnotherBtn) dom.createAnotherBtn.addEventListener('click', resetTool);
    if (dom.backToSettingsBtn) {
      dom.backToSettingsBtn.addEventListener('click', () => {
        if (dom.pdfReadyCard) dom.pdfReadyCard.classList.add('hidden');
        if (dom.pdfConfigCard) dom.pdfConfigCard.classList.remove('hidden');
      });
    }

    if (dom.previewPrevBtn) {
      dom.previewPrevBtn.addEventListener('click', () => {
        if (previewPageIndex > 0) {
          previewPageIndex--;
          updatePDFPreview();
        }
      });
    }
    if (dom.previewNextBtn) {
      dom.previewNextBtn.addEventListener('click', () => {
        const total = getTotalPDFPages();
        if (previewPageIndex < total - 1) {
          previewPageIndex++;
          updatePDFPreview();
        }
      });
    }

    bindEditorEvents();

    bindSignatureEvents();

    bindSignatureOverlayEvents();
  }

  async function handleFiles(newFiles, isAppend = false) {
    if (!newFiles || newFiles.length === 0) return;

    let valid = [];
    let invalid = [];

    for (const f of newFiles) {
      const ext = Utils.getExtension(f.name);
      const isJpg = f.type === 'image/jpeg' || /^(jpg|jpeg)$/i.test(ext);
      const isPng = f.type === 'image/png' || /^png$/i.test(ext);
      const isWebp = f.type === 'image/webp' || /^webp$/i.test(ext);
      const isImage = f.type.startsWith('image/') || /^(jpg|jpeg|png|webp|bmp|gif)$/i.test(ext);

      if (currentPreset === 'jpg-to-pdf') {
        if (isJpg) valid.push(f);
        else invalid.push({ name: f.name, expected: 'JPG/JPEG' });
      } else if (currentPreset === 'png-to-pdf') {
        if (isPng) valid.push(f);
        else invalid.push({ name: f.name, expected: 'PNG' });
      } else {
        if (isImage) valid.push(f);
        else invalid.push({ name: f.name, expected: 'Image (JPG, PNG, WebP)' });
      }
    }

    if (invalid.length > 0) {
      Utils.showToast(`"${invalid[0].name}" is not a supported ${invalid[0].expected} file.`, 'warning');
    }

    if (valid.length === 0) return;

    Utils.setProcessing(true);
    showProgress(15, `Loading ${valid.length} image(s)...`);

    try {
      for (let i = 0; i < valid.length; i++) {
        const file = valid[i];
        let dpiInfo = null;
        try {
          const headerSlice = await file.slice(0, 65536).arrayBuffer();
          dpiInfo = extractImageDPI(new Uint8Array(headerSlice));
        } catch (e) {
          // ignore error reading header
        }
        const dataUrl = await Utils.readFileAsDataURL(file);
        const img = await Utils.loadImage(dataUrl);

        const item = {
          id: 'i2p_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6),
          file,
          name: file.name,
          originalDataUrl: dataUrl,
          previewDataUrl: dataUrl,
          width: img.naturalWidth,
          height: img.naturalHeight,
          originalWidth: img.naturalWidth,
          originalHeight: img.naturalHeight,
          dpiInfo,
          detectedDpi: (dpiInfo && dpiInfo.dpiX) ? dpiInfo.dpiX : null,
          orientation: (dom.orientationSelect ? dom.orientationSelect.value : 'auto'),
          signature: null,
          editState: {
            crop: null,
            rotate: 0,
            flipH: false,
            flipV: false,
            filter: 'original'
          }
        };

        imageList.push(item);
      }

      if (dom.emptyState) dom.emptyState.classList.add('hidden');
      if (dom.workspace) dom.workspace.classList.remove('hidden');
      if (dom.pdfReadyCard) dom.pdfReadyCard.classList.add('hidden');
      if (dom.pdfConfigCard) dom.pdfConfigCard.classList.remove('hidden');

      renderList();
      updateOriginalDpiInfo();
      updatePDFPreview();
      Utils.showToast(`Added ${valid.length} image(s). Drag to reorder, click Edit to adjust, or add a signature!`, 'success');
    } catch (err) {
      console.error(err);
      Utils.showToast('Error loading images: ' + err.message, 'error');
    } finally {
      Utils.setProcessing(false);
      hideProgress();
    }
  }

  function renderList() {
    if (!dom.imageListContainer) return;
    dom.imageListContainer.innerHTML = '';

    const pages = buildPDFPages(imageList);
    const totalPages = pages.length;

    if (dom.imageCountBadge) {
      dom.imageCountBadge.textContent = `${totalPages} Page${totalPages !== 1 ? 's' : ''} (${imageList.length} img${imageList.length !== 1 ? 's' : ''})`;
    }

    if (imageList.length === 0) {
      resetTool();
      return;
    }

    // Build map from item to page info
    const itemPageMap = new Map();
    pages.forEach((pDef) => {
      pDef.items.forEach((item, slotIdx) => {
        let role = '';
        if (pDef.placement === 'front-back') {
          role = (slotIdx === 0) ? 'Front' : 'Back';
        } else if (pDef.placement === 'multi-card') {
          role = `Card ${slotIdx + 1}`;
        }
        itemPageMap.set(item, {
          pageIndex: pDef.pageIndex,
          pageNumber: pDef.pageIndex + 1,
          role,
          placement: pDef.placement,
          isLead: (slotIdx === 0)
        });
      });
    });

    imageList.forEach((item, index) => {
      const card = document.createElement('div');
      card.className = 'i2p-item-card';
      card.draggable = true;
      card.dataset.index = index;

      const hasEdits = item.editState.crop !== null ||
                       item.editState.rotate !== 0 ||
                       item.editState.flipH ||
                       item.editState.flipV ||
                       item.editState.filter !== 'original';

      const orient = item.orientation || 'auto';
      const pInfo = itemPageMap.get(item) || { pageIndex: 0, pageNumber: 1, role: '', placement: 'front-back', isLead: true };
      const badgeText = pInfo.role ? `P${pInfo.pageNumber} • ${pInfo.role}` : `Page ${pInfo.pageNumber}`;
      const badgeColor = (pInfo.role === 'Front') ? 'background: rgba(99, 102, 241, 0.9); color: #fff;' :
                         (pInfo.role === 'Back') ? 'background: rgba(16, 185, 129, 0.9); color: #fff;' :
                         'background: var(--bg-tertiary); color: var(--text-secondary);';
      const activePlacement = (item.layoutOverride && item.layoutOverride.placement) ? item.layoutOverride.placement : (pInfo.placement || 'front-back');

      card.innerHTML = `
        <div class="i2p-item-main-row">
          <div class="i2p-drag-handle" title="Drag to reorder page">
            <svg viewBox="0 0 20 20" fill="currentColor">
              <path d="M7 2a2 2 0 100 4 2 2 0 000-4zm6 0a2 2 0 100 4 2 2 0 000-4zm-6 6a2 2 0 100 4 2 2 0 000-4zm6 0a2 2 0 100 4 2 2 0 000-4zm-6 6a2 2 0 100 4 2 2 0 000-4zm6 0a2 2 0 100 4 2 2 0 000-4z"/>
            </svg>
          </div>
          <div class="i2p-item-preview" style="cursor: pointer;" title="Click to preview Page ${pInfo.pageNumber}">
            <img src="${item.previewDataUrl}" alt="${Utils.escapeHtml(badgeText)}">
            <span class="i2p-page-badge" style="${badgeColor} font-weight: 700; font-size: 0.72rem; padding: 2px 6px;">${badgeText}</span>
            ${hasEdits ? '<span class="i2p-edited-tag" title="Edited">Edited</span>' : ''}
          </div>
          <div class="i2p-item-info">
            <p class="i2p-item-name" title="${Utils.escapeHtml(item.name)}">${Utils.escapeHtml(item.name)}</p>
            <span class="i2p-item-dims">${item.width} × ${item.height} px ${item.detectedDpi ? '• ' + item.detectedDpi + ' DPI' : ''} ${item.editState.filter !== 'original' ? '• ' + getFilterName(item.editState.filter) : ''}</span>
          </div>
          <div class="i2p-item-actions">
            <button type="button" class="btn btn-xs btn-secondary i2p-edit-btn" title="Edit image (Crop, Rotate, Filters)">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 13px; height: 13px; margin-right: 4px;">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
              </svg>
              Edit
            </button>
            <div class="i2p-order-btns">
              <button type="button" class="btn-icon i2p-move-up" title="Move Up" ${index === 0 ? 'disabled' : ''}>↑</button>
              <button type="button" class="btn-icon i2p-move-down" title="Move Down" ${index === imageList.length - 1 ? 'disabled' : ''}>↓</button>
            </div>
            <button type="button" class="btn-icon i2p-remove" title="Remove image">&times;</button>
          </div>
        </div>
        <div class="i2p-item-orient-row" style="margin-top: 6px; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 6px;">
          <div style="display: flex; align-items: center; gap: 4px;">
            <span class="i2p-orient-label" style="font-size: 0.74rem;">Orient:</span>
            <div class="i2p-orient-pill-group">
              <button type="button" class="i2p-orient-pill ${orient === 'auto' ? 'active' : ''}" data-orient="auto" title="Auto: Detect aspect ratio">Auto</button>
              <button type="button" class="i2p-orient-pill ${orient === 'portrait' ? 'active' : ''}" data-orient="portrait" title="Force Portrait">Port</button>
              <button type="button" class="i2p-orient-pill ${orient === 'landscape' ? 'active' : ''}" data-orient="landscape" title="Force Landscape">Land</button>
            </div>
          </div>
          <div style="display: flex; align-items: center; gap: 4px;">
            <span style="font-size: 0.74rem; color: var(--text-secondary); font-weight: 600;">Layout:</span>
            <select class="form-control i2p-item-layout-select" style="font-size: 0.74rem; padding: 1px 6px; height: 24px; border-radius: 4px; width: auto;">
              <option value="front-back" ${activePlacement === 'front-back' ? 'selected' : ''}>Front + Back (2 on A4)</option>
              <option value="fit" ${activePlacement === 'fit' ? 'selected' : ''}>Fit to Page (Full A4)</option>
              <option value="id-card" ${activePlacement === 'id-card' ? 'selected' : ''}>Single ID Card</option>
              <option value="custom" ${activePlacement === 'custom' ? 'selected' : ''}>Custom mm</option>
              <option value="multi-card" ${activePlacement === 'multi-card' ? 'selected' : ''}>Cards Grid (4 on A4)</option>
              <option value="original" ${activePlacement === 'original' ? 'selected' : ''}>Original DPI</option>
              <option value="fill" ${activePlacement === 'fill' ? 'selected' : ''}>Fill Page</option>
            </select>
          </div>
        </div>
      `;

      card.addEventListener('dragstart', (e) => {
        e.dataTransfer.setData('text/plain', index);
        card.classList.add('dragging');
      });
      card.addEventListener('dragend', () => card.classList.remove('dragging'));
      card.addEventListener('dragover', (e) => {
        e.preventDefault();
        card.classList.add('drag-target');
      });
      card.addEventListener('dragleave', () => card.classList.remove('drag-target'));
      card.addEventListener('drop', (e) => {
        e.preventDefault();
        card.classList.remove('drag-target');
        const fromIndex = parseInt(e.dataTransfer.getData('text/plain'), 10);
        const toIndex = index;
        if (!isNaN(fromIndex) && fromIndex !== toIndex) {
          const moved = imageList.splice(fromIndex, 1)[0];
          imageList.splice(toIndex, 0, moved);
          renderList();
          updatePDFPreview();
        }
      });

      card.querySelectorAll('.i2p-orient-pill').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const newOrient = btn.dataset.orient;
          item.orientation = newOrient;
          renderList();
          updatePDFPreview();
        });
      });

      const layoutSelect = card.querySelector('.i2p-item-layout-select');
      if (layoutSelect) {
        layoutSelect.addEventListener('change', (e) => {
          e.stopPropagation();
          const newPlacement = layoutSelect.value;
          item.layoutOverride = { ...getLayoutSettings(), placement: newPlacement };
          previewPageIndex = pInfo.pageIndex;
          renderList();
          updatePDFPreview();
        });
      }

      card.querySelector('.i2p-item-preview').addEventListener('click', () => {
        previewPageIndex = pInfo.pageIndex;
        updatePDFPreview();
      });

      card.querySelector('.i2p-edit-btn').addEventListener('click', () => openEditor(index));

      card.querySelector('.i2p-move-up').addEventListener('click', () => {
        if (index > 0) {
          const temp = imageList[index];
          imageList[index] = imageList[index - 1];
          imageList[index - 1] = temp;
          renderList();
          updatePDFPreview();
        }
      });

      card.querySelector('.i2p-move-down').addEventListener('click', () => {
        if (index < imageList.length - 1) {
          const temp = imageList[index];
          imageList[index] = imageList[index + 1];
          imageList[index + 1] = temp;
          renderList();
          updatePDFPreview();
        }
      });

      card.querySelector('.i2p-remove').addEventListener('click', () => {
        imageList.splice(index, 1);
        const newTotal = getTotalPDFPages();
        if (previewPageIndex >= newTotal) {
          previewPageIndex = Math.max(0, newTotal - 1);
        }
        renderList();
        updatePDFPreview();
      });

      dom.imageListContainer.appendChild(card);
    });

    if (dom.generateBtn) dom.generateBtn.disabled = imageList.length === 0;
  }

  function getFilterName(filterId) {
    const f = FILTER_PRESETS.find(p => p.id === filterId);
    return f ? f.name : filterId;
  }

  function renderEditedImageToCanvas(canvas, imgObj, editState = {}, targetWidth = null, targetHeight = null) {
    const rot = ((editState.rotate % 360) + 360) % 360;
    const isRotated90 = (rot === 90 || rot === 270);

    const natW = imgObj.naturalWidth || imgObj.width || 100;
    const natH = imgObj.naturalHeight || imgObj.height || 100;
    const fullRotatedW = isRotated90 ? natH : natW;
    const fullRotatedH = isRotated90 ? natW : natH;

    const hasCrop = editState.crop && editState.crop.w > 0 && editState.crop.h > 0;
    let cropX = 0, cropY = 0, cropW = fullRotatedW, cropH = fullRotatedH;

    if (hasCrop) {
      cropX = Math.max(0, Math.min(fullRotatedW - 1, editState.crop.x));
      cropY = Math.max(0, Math.min(fullRotatedH - 1, editState.crop.y));
      cropW = Math.max(1, Math.min(fullRotatedW - cropX, editState.crop.w));
      cropH = Math.max(1, Math.min(fullRotatedH - cropY, editState.crop.h));
    }

    const finalW = hasCrop ? cropW : fullRotatedW;
    const finalH = hasCrop ? cropH : fullRotatedH;

    canvas.width = targetWidth || finalW;
    canvas.height = targetHeight || finalH;

    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    let filterCSS = 'none';
    const f = editState.filter || 'original';

    if (f === 'vibrant') {
      filterCSS = 'saturate(1.4) contrast(1.1) brightness(1.02)';
    } else if (f === 'soft-tone') {
      filterCSS = 'contrast(0.92) brightness(1.04) saturate(0.95)';
    } else if (f === 'color') {
      filterCSS = 'saturate(1.22) contrast(1.06) brightness(1.02)';
    } else if (f === 'sharp-black') {
      filterCSS = 'contrast(1.6) brightness(0.94) grayscale(0.15)';
    } else if (f === 'grayscale') {
      filterCSS = 'grayscale(100%) contrast(1.08)';
    } else if (f === 'high-contrast') {
      filterCSS = 'contrast(1.75) brightness(1.04)';
    } else if (f === 'clean-document') {
      filterCSS = 'contrast(1.35) brightness(1.15) saturate(0.9)';
    }

    if (!hasCrop) {
      ctx.save();
      ctx.filter = filterCSS;
      ctx.translate(canvas.width / 2, canvas.height / 2);
      if (rot) ctx.rotate((rot * Math.PI) / 180);
      const scaleX = editState.flipH ? -1 : 1;
      const scaleY = editState.flipV ? -1 : 1;
      ctx.scale(scaleX, scaleY);

      const drawW = isRotated90 ? canvas.height : canvas.width;
      const drawH = isRotated90 ? canvas.width : canvas.height;
      ctx.drawImage(imgObj, -drawW / 2, -drawH / 2, drawW, drawH);
      ctx.restore();
      ctx.filter = 'none';
    } else {
      const rotCanvas = document.createElement('canvas');
      rotCanvas.width = fullRotatedW;
      rotCanvas.height = fullRotatedH;
      const rotCtx = rotCanvas.getContext('2d');

      rotCtx.translate(fullRotatedW / 2, fullRotatedH / 2);
      if (rot) rotCtx.rotate((rot * Math.PI) / 180);
      const scaleX = editState.flipH ? -1 : 1;
      const scaleY = editState.flipV ? -1 : 1;
      rotCtx.scale(scaleX, scaleY);

      const drawW = isRotated90 ? fullRotatedH : fullRotatedW;
      const drawH = isRotated90 ? fullRotatedW : fullRotatedH;
      rotCtx.drawImage(imgObj, -drawW / 2, -drawH / 2, drawW, drawH);

      ctx.save();
      ctx.filter = filterCSS;
      ctx.drawImage(rotCanvas, cropX, cropY, cropW, cropH, 0, 0, canvas.width, canvas.height);
      ctx.restore();
      ctx.filter = 'none';

      rotCanvas.width = 1;
      rotCanvas.height = 1;
    }

    if (f === 'clean-document') {
      applyCleanDocumentPixelFilter(ctx, canvas.width, canvas.height);
    }
  }

  function applyCleanDocumentPixelFilter(ctx, w, h) {
    try {
      const imgData = ctx.getImageData(0, 0, w, h);
      const d = imgData.data;
      for (let i = 0; i < d.length; i += 4) {
        const r = d[i];
        const g = d[i + 1];
        const b = d[i + 2];
        const lum = 0.299 * r + 0.587 * g + 0.114 * b;

        if (lum > 205) {
          d[i] = Math.min(255, r + (255 - r) * 0.75);
          d[i + 1] = Math.min(255, g + (255 - g) * 0.75);
          d[i + 2] = Math.min(255, b + (255 - b) * 0.75);
        } else if (lum < 110) {
          d[i] = Math.max(0, r * 0.88);
          d[i + 1] = Math.max(0, g * 0.88);
          d[i + 2] = Math.max(0, b * 0.88);
        }
      }
      ctx.putImageData(imgData, 0, 0);
    } catch (e) {

    }
  }

  let initialSavedStateJson = '';
  let hasCropRectChanged = false;

  async function openEditor(index) {
    if (index < 0 || index >= imageList.length) return;
    currentEditingIndex = index;
    const item = imageList[index];

    editorTempState = JSON.parse(JSON.stringify(item.editState));
    initialSavedStateJson = JSON.stringify(item.editState);
    hasCropRectChanged = false;
    editorCropActive = false;
    editorCropRatio = 'free';

    if (dom.editorFilename) dom.editorFilename.textContent = item.name;
    if (dom.editorPageInfo) dom.editorPageInfo.textContent = `Page ${currentEditingIndex + 1} of ${imageList.length}`;
    if (dom.editorPrevBtn) dom.editorPrevBtn.disabled = (currentEditingIndex === 0);
    if (dom.editorNextBtn) dom.editorNextBtn.disabled = (currentEditingIndex === imageList.length - 1);
    if (dom.editorMagnifier) dom.editorMagnifier.classList.add('hidden');

    editorImgObj = await Utils.loadImage(item.originalDataUrl);

    syncEditorControlsUI();
    renderFilterPresetCards();

    if (dom.editorModal) dom.editorModal.classList.remove('hidden');

    drawEditorCanvas();
  }

  async function switchEditorPage(targetIndex) {
    if (targetIndex < 0 || targetIndex >= imageList.length || targetIndex === currentEditingIndex) return;

    if (editorCropActive) {
      commitActiveCropRect();
    }

    if (currentEditingIndex >= 0 && currentEditingIndex < imageList.length) {
      const curItem = imageList[currentEditingIndex];
      curItem.editState = JSON.parse(JSON.stringify(editorTempState));

      const offscreen = document.createElement('canvas');
      renderEditedImageToCanvas(offscreen, editorImgObj, curItem.editState);
      curItem.previewDataUrl = offscreen.toDataURL('image/jpeg', 0.88);
      curItem.width = offscreen.width;
      curItem.height = offscreen.height;
    }

    await openEditor(targetIndex);
    renderList();
    updatePDFPreview();
  }

  function syncEditorControlsUI() {
    if (dom.cropToggleBtn) dom.cropToggleBtn.classList.remove('active');
    if (dom.cropControlsPanel) dom.cropControlsPanel.classList.add('hidden');
    if (dom.editorMagnifier) dom.editorMagnifier.classList.add('hidden');
    if (dom.cropRatioBtns) {
      dom.cropRatioBtns.forEach(btn => btn.classList.toggle('active', btn.dataset.ratio === 'free'));
    }
    if (dom.flipHBtn) dom.flipHBtn.classList.toggle('active', !!editorTempState.flipH);
    if (dom.flipVBtn) dom.flipVBtn.classList.toggle('active', !!editorTempState.flipV);
  }

  function renderFilterPresetCards() {
    if (!dom.filterCardsRow || !editorImgObj) return;
    dom.filterCardsRow.innerHTML = '';

    const activeFilter = editorTempState.filter || 'original';

    FILTER_PRESETS.forEach(preset => {
      const card = document.createElement('div');
      card.className = `i2p-filter-card ${preset.id === activeFilter ? 'active' : ''}`;
      card.dataset.filter = preset.id;

      const thumbCanvas = document.createElement('canvas');
      thumbCanvas.className = 'i2p-filter-card-thumb';

      const thumbState = {
        crop: editorTempState.crop,
        rotate: editorTempState.rotate,
        flipH: editorTempState.flipH,
        flipV: editorTempState.flipV,
        filter: preset.id
      };
      renderEditedImageToCanvas(thumbCanvas, editorImgObj, thumbState, 90, 90);

      card.innerHTML = `
        <div class="i2p-filter-card-preview-wrap"></div>
        <span class="i2p-filter-card-name">${preset.name}</span>
      `;
      card.querySelector('.i2p-filter-card-preview-wrap').appendChild(thumbCanvas);

      card.addEventListener('click', () => {
        editorTempState.filter = preset.id;
        dom.filterCardsRow.querySelectorAll('.i2p-filter-card').forEach(c => c.classList.toggle('active', c === card));
        drawEditorCanvas();
      });

      dom.filterCardsRow.appendChild(card);
    });
  }

  function drawEditorCanvas() {
    if (!dom.editorCanvas || !editorImgObj) return;

    const stageEl = dom.editorCanvas.parentElement ? dom.editorCanvas.parentElement.parentElement : null;
    const stageW = stageEl ? Math.max(160, stageEl.clientWidth - 24) : 300;
    const maxDisplayW = Math.min(540, stageW);
    const maxDisplayH = Math.min(380, Math.max(180, window.innerHeight * 0.42));

    const rot = ((editorTempState.rotate % 360) + 360) % 360;
    const isRotated90 = (rot === 90 || rot === 270);
    const natW = editorImgObj.naturalWidth || editorImgObj.width || 100;
    const natH = editorImgObj.naturalHeight || editorImgObj.height || 100;
    const fullRotatedW = isRotated90 ? natH : natW;
    const fullRotatedH = isRotated90 ? natW : natH;

    if (editorCropActive) {

      const scale = Math.min(maxDisplayW / fullRotatedW, maxDisplayH / fullRotatedH, 1);
      const canvasW = Math.max(80, Math.round(fullRotatedW * scale));
      const canvasH = Math.max(80, Math.round(fullRotatedH * scale));

      const displayState = {
        crop: null,
        rotate: editorTempState.rotate,
        flipH: editorTempState.flipH,
        flipV: editorTempState.flipV,
        filter: editorTempState.filter
      };

      renderEditedImageToCanvas(dom.editorCanvas, editorImgObj, displayState, canvasW, canvasH);
      drawCropOverlay(dom.editorCanvas);
    } else {
      let baseW = editorTempState.crop ? editorTempState.crop.w : fullRotatedW;
      let baseH = editorTempState.crop ? editorTempState.crop.h : fullRotatedH;

      const scale = Math.min(maxDisplayW / baseW, maxDisplayH / baseH, 1);
      const canvasW = Math.max(80, Math.round(baseW * scale));
      const canvasH = Math.max(80, Math.round(baseH * scale));

      renderEditedImageToCanvas(dom.editorCanvas, editorImgObj, editorTempState, canvasW, canvasH);
    }

    dom.editorCanvas.style.maxWidth = '100%';
    dom.editorCanvas.style.height = 'auto';

    if (dom.editorDimsBadge) {
      const currentDims = getItemEffectiveDimensions({ editState: editorTempState, originalWidth: natW, originalHeight: natH });
      dom.editorDimsBadge.textContent = `${currentDims.width} × ${currentDims.height} px`;
    }
  }

  function getCanvasCoords(clientX, clientY) {
    if (!dom.editorCanvas) return { x: 0, y: 0 };
    const rect = dom.editorCanvas.getBoundingClientRect();
    const scaleX = dom.editorCanvas.width / (rect.width || 1);
    const scaleY = dom.editorCanvas.height / (rect.height || 1);
    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY
    };
  }

  function bindEditorEvents() {
    if (dom.editorCloseBtn) dom.editorCloseBtn.addEventListener('click', handleCancelClick);
    if (dom.editorCancelBtn) dom.editorCancelBtn.addEventListener('click', handleCancelClick);
    if (dom.editorSaveBtn) dom.editorSaveBtn.addEventListener('click', saveEditorChanges);

    const keepBtn = document.getElementById('i2p-discard-keep-btn');
    const discardBtn = document.getElementById('i2p-discard-confirm-btn');
    if (keepBtn) keepBtn.addEventListener('click', keepEditing);
    if (discardBtn) discardBtn.addEventListener('click', confirmDiscard);

    if (dom.editorPrevBtn) {
      dom.editorPrevBtn.addEventListener('click', () => {
        if (currentEditingIndex > 0) switchEditorPage(currentEditingIndex - 1);
      });
    }

    if (dom.editorNextBtn) {
      dom.editorNextBtn.addEventListener('click', () => {
        if (currentEditingIndex < imageList.length - 1) switchEditorPage(currentEditingIndex + 1);
      });
    }

    if (dom.cropToggleBtn) {
      dom.cropToggleBtn.addEventListener('click', () => {
        editorCropActive = !editorCropActive;
        dom.cropToggleBtn.classList.toggle('active', editorCropActive);
        if (dom.cropControlsPanel) dom.cropControlsPanel.classList.toggle('hidden', !editorCropActive);
        if (dom.editorMagnifier) dom.editorMagnifier.classList.add('hidden');
        if (editorCropActive) {
          hasCropRectChanged = true;
          initCropRect();
        }
        drawEditorCanvas();
      });
    }

    if (dom.cropRatioBtns) {
      dom.cropRatioBtns.forEach(btn => {
        btn.addEventListener('click', () => {
          editorCropRatio = btn.dataset.ratio;
          hasCropRectChanged = true;
          dom.cropRatioBtns.forEach(b => b.classList.toggle('active', b === btn));
          adjustCropRectToRatio();
          drawEditorCanvas();
        });
      });
    }

    if (dom.cancelCropBtn) {
      dom.cancelCropBtn.addEventListener('click', () => {
        editorCropActive = false;
        if (dom.cropToggleBtn) dom.cropToggleBtn.classList.remove('active');
        if (dom.cropControlsPanel) dom.cropControlsPanel.classList.add('hidden');
        if (dom.editorMagnifier) dom.editorMagnifier.classList.add('hidden');
        drawEditorCanvas();
      });
    }

    if (dom.resetCropBtn) {
      dom.resetCropBtn.addEventListener('click', () => {
        editorTempState.crop = null;
        editorCropActive = false;
        hasCropRectChanged = true;
        if (dom.cropToggleBtn) dom.cropToggleBtn.classList.remove('active');
        if (dom.cropControlsPanel) dom.cropControlsPanel.classList.add('hidden');
        if (dom.editorMagnifier) dom.editorMagnifier.classList.add('hidden');
        drawEditorCanvas();
        renderFilterPresetCards();
        Utils.showToast('Crop reset to full image.', 'info');
      });
    }

    if (dom.rotateCwBtn) {
      dom.rotateCwBtn.addEventListener('click', () => {
        rotateCW();
      });
    }
    if (dom.rotateCcwBtn) {
      dom.rotateCcwBtn.addEventListener('click', () => {
        rotateCCW();
      });
    }
    if (dom.flipHBtn) {
      dom.flipHBtn.addEventListener('click', () => {
        flipH();
      });
    }
    if (dom.flipVBtn) {
      dom.flipVBtn.addEventListener('click', () => {
        flipV();
      });
    }

    if (dom.editorCanvas) {
      dom.editorCanvas.addEventListener('mousedown', onCropPointerDown);
      window.addEventListener('mousemove', onCropPointerMove);
      window.addEventListener('mouseup', onCropPointerUp);

      dom.editorCanvas.addEventListener('touchstart', onCropTouchStart, { passive: false });
      window.addEventListener('touchmove', onCropTouchMove, { passive: false });
      window.addEventListener('touchend', onCropPointerUp);
      window.addEventListener('touchcancel', onCropPointerUp);
    }
  }

  function rotateCW() {
    const rot = ((editorTempState.rotate % 360) + 360) % 360;
    const isRotated90 = (rot === 90 || rot === 270);
    const natW = editorImgObj ? (editorImgObj.naturalWidth || editorImgObj.width || 100) : 100;
    const natH = editorImgObj ? (editorImgObj.naturalHeight || editorImgObj.height || 100) : 100;
    const currentW = isRotated90 ? natH : natW;
    const currentH = isRotated90 ? natW : natH;

    if (editorTempState.crop) {
      editorTempState.crop = {
        x: Math.max(0, currentH - (editorTempState.crop.y + editorTempState.crop.h)),
        y: Math.max(0, editorTempState.crop.x),
        w: editorTempState.crop.h,
        h: editorTempState.crop.w
      };
    }
    editorTempState.rotate = (editorTempState.rotate + 90) % 360;
    if (editorCropActive) {
      drawEditorCanvas();
      initCropRect();
    }
    drawEditorCanvas();
    renderFilterPresetCards();
  }

  function rotateCCW() {
    const rot = ((editorTempState.rotate % 360) + 360) % 360;
    const isRotated90 = (rot === 90 || rot === 270);
    const natW = editorImgObj ? (editorImgObj.naturalWidth || editorImgObj.width || 100) : 100;
    const natH = editorImgObj ? (editorImgObj.naturalHeight || editorImgObj.height || 100) : 100;
    const currentW = isRotated90 ? natH : natW;
    const currentH = isRotated90 ? natW : natH;

    if (editorTempState.crop) {
      editorTempState.crop = {
        x: Math.max(0, editorTempState.crop.y),
        y: Math.max(0, currentW - (editorTempState.crop.x + editorTempState.crop.w)),
        w: editorTempState.crop.h,
        h: editorTempState.crop.w
      };
    }
    editorTempState.rotate = (editorTempState.rotate - 90 + 360) % 360;
    if (editorCropActive) {
      drawEditorCanvas();
      initCropRect();
    }
    drawEditorCanvas();
    renderFilterPresetCards();
  }

  function flipH() {
    const rot = ((editorTempState.rotate % 360) + 360) % 360;
    const isRotated90 = (rot === 90 || rot === 270);
    const natW = editorImgObj ? (editorImgObj.naturalWidth || editorImgObj.width || 100) : 100;
    const natH = editorImgObj ? (editorImgObj.naturalHeight || editorImgObj.height || 100) : 100;
    const currentW = isRotated90 ? natH : natW;

    if (editorTempState.crop) {
      editorTempState.crop.x = Math.max(0, currentW - (editorTempState.crop.x + editorTempState.crop.w));
    }
    editorTempState.flipH = !editorTempState.flipH;
    if (dom.flipHBtn) dom.flipHBtn.classList.toggle('active', editorTempState.flipH);
    if (editorCropActive) {
      drawEditorCanvas();
      initCropRect();
    }
    drawEditorCanvas();
    renderFilterPresetCards();
  }

  function flipV() {
    const rot = ((editorTempState.rotate % 360) + 360) % 360;
    const isRotated90 = (rot === 90 || rot === 270);
    const natW = editorImgObj ? (editorImgObj.naturalWidth || editorImgObj.width || 100) : 100;
    const natH = editorImgObj ? (editorImgObj.naturalHeight || editorImgObj.height || 100) : 100;
    const currentH = isRotated90 ? natW : natH;

    if (editorTempState.crop) {
      editorTempState.crop.y = Math.max(0, currentH - (editorTempState.crop.y + editorTempState.crop.h));
    }
    editorTempState.flipV = !editorTempState.flipV;
    if (dom.flipVBtn) dom.flipVBtn.classList.toggle('active', editorTempState.flipV);
    if (editorCropActive) {
      drawEditorCanvas();
      initCropRect();
    }
    drawEditorCanvas();
    renderFilterPresetCards();
  }

  function initCropRect() {
    if (!dom.editorCanvas || !editorImgObj) return;
    const cw = dom.editorCanvas.width;
    const ch = dom.editorCanvas.height;

    const rot = ((editorTempState.rotate % 360) + 360) % 360;
    const isRotated90 = (rot === 90 || rot === 270);
    const natW = editorImgObj.naturalWidth || editorImgObj.width || 100;
    const natH = editorImgObj.naturalHeight || editorImgObj.height || 100;
    const fullRotatedW = isRotated90 ? natH : natW;
    const fullRotatedH = isRotated90 ? natW : natH;

    if (editorTempState.crop && editorTempState.crop.w > 0 && editorTempState.crop.h > 0) {
      const scaleX = cw / fullRotatedW;
      const scaleY = ch / fullRotatedH;
      editorCropRect = {
        x: Math.round(editorTempState.crop.x * scaleX),
        y: Math.round(editorTempState.crop.y * scaleY),
        w: Math.round(editorTempState.crop.w * scaleX),
        h: Math.round(editorTempState.crop.h * scaleY)
      };
    } else {
      editorCropRect = {
        x: Math.round(cw * 0.08),
        y: Math.round(ch * 0.08),
        w: Math.round(cw * 0.84),
        h: Math.round(ch * 0.84)
      };
    }
    adjustCropRectToRatio();
  }

  function adjustCropRectToRatio() {
    if (editorCropRatio === 'free') return;
    let targetRatio = 1;
    if (editorCropRatio === '1:1') targetRatio = 1;
    else if (editorCropRatio === '4:3') targetRatio = 4 / 3;
    else if (editorCropRatio === '16:9') targetRatio = 16 / 9;
    else if (editorCropRatio === 'a4') targetRatio = 210 / 297;

    const currentRatio = editorCropRect.w / (editorCropRect.h || 1);
    if (currentRatio > targetRatio) {
      editorCropRect.w = Math.round(editorCropRect.h * targetRatio);
    } else {
      editorCropRect.h = Math.round(editorCropRect.w / targetRatio);
    }
  }

  function drawCropOverlay(canvas) {
    const ctx = canvas.getContext('2d');
    const cw = canvas.width;
    const ch = canvas.height;
    const r = editorCropRect;

    ctx.fillStyle = 'rgba(0, 0, 0, 0.58)';
    ctx.fillRect(0, 0, cw, r.y);
    ctx.fillRect(0, r.y + r.h, cw, ch - (r.y + r.h));
    ctx.fillRect(0, r.y, r.x, r.h);
    ctx.fillRect(r.x + r.w, r.y, cw - (r.x + r.w), r.h);

    ctx.strokeStyle = '#0284c7';
    ctx.lineWidth = 2.5;
    ctx.strokeRect(r.x, r.y, r.w, r.h);

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(r.x + r.w / 3, r.y);
    ctx.lineTo(r.x + r.w / 3, r.y + r.h);
    ctx.moveTo(r.x + (r.w * 2) / 3, r.y);
    ctx.lineTo(r.x + (r.w * 2) / 3, r.y + r.h);
    ctx.moveTo(r.x, r.y + r.h / 3);
    ctx.lineTo(r.x + r.w, r.y + r.h / 3);
    ctx.moveTo(r.x, r.y + (r.h * 2) / 3);
    ctx.lineTo(r.x + r.w, r.y + (r.h * 2) / 3);
    ctx.stroke();
    ctx.setLineDash([]);

    function drawPill(x, y, w, h, radius) {
      ctx.save();
      ctx.beginPath();
      if (typeof ctx.roundRect === 'function') {
        ctx.roundRect(x - w / 2, y - h / 2, w, h, radius);
      } else {
        ctx.rect(x - w / 2, y - h / 2, w, h);
      }
      ctx.fillStyle = '#ffffff';
      ctx.fill();
      ctx.strokeStyle = '#0284c7';
      ctx.lineWidth = 2.5;
      ctx.stroke();
      ctx.restore();
    }

    function drawCorner(x, y) {
      ctx.save();

      ctx.beginPath();
      ctx.arc(x, y, 9, 0, Math.PI * 2);
      ctx.fillStyle = '#0284c7';
      ctx.fill();

      ctx.beginPath();
      ctx.arc(x, y, 6.5, 0, Math.PI * 2);
      ctx.fillStyle = '#ffffff';
      ctx.fill();

      ctx.beginPath();
      ctx.arc(x, y, 3, 0, Math.PI * 2);
      ctx.fillStyle = '#0284c7';
      ctx.fill();
      ctx.restore();
    }

    drawPill(r.x + r.w / 2, r.y, 30, 10, 5);
    drawPill(r.x + r.w / 2, r.y + r.h, 30, 10, 5);
    drawPill(r.x, r.y + r.h / 2, 10, 30, 5);
    drawPill(r.x + r.w, r.y + r.h / 2, 10, 30, 5);

    drawCorner(r.x, r.y);
    drawCorner(r.x + r.w, r.y);
    drawCorner(r.x + r.w, r.y + r.h);
    drawCorner(r.x, r.y + r.h);
  }

  function getCropHandleAt(x, y) {
    const r = editorCropRect;
    const cornerPad = 32;
    const edgePad = 26;

    if (Math.hypot(x - r.x, y - r.y) < cornerPad) return 'nw';
    if (Math.hypot(x - (r.x + r.w), y - r.y) < cornerPad) return 'ne';
    if (Math.hypot(x - (r.x + r.w), y - (r.y + r.h)) < cornerPad) return 'se';
    if (Math.hypot(x - r.x, y - (r.y + r.h)) < cornerPad) return 'sw';

    if (Math.abs(y - r.y) < edgePad && Math.abs(x - (r.x + r.w / 2)) < 28) return 'n';
    if (Math.abs(y - (r.y + r.h)) < edgePad && Math.abs(x - (r.x + r.w / 2)) < 28) return 's';
    if (Math.abs(x - r.x) < edgePad && Math.abs(y - (r.y + r.h / 2)) < 28) return 'w';
    if (Math.abs(x - (r.x + r.w)) < edgePad && Math.abs(y - (r.y + r.h / 2)) < 28) return 'e';

    if (x > r.x && x < r.x + r.w && y > r.y && y < r.y + r.h) return 'move';
    return null;
  }

  function renderMagnifier(focusCanvasX, focusCanvasY) {
    if (!dom.editorMagnifier || !dom.editorMagnifierCanvas || !editorImgObj || !dom.editorCanvas) return;
    dom.editorMagnifier.classList.remove('hidden');

    const magCanvas = dom.editorMagnifierCanvas;
    const magCtx = magCanvas.getContext('2d');
    const magW = magCanvas.width;
    const magH = magCanvas.height;

    const cw = dom.editorCanvas.width;
    if (focusCanvasX < cw / 2) {
      dom.editorMagnifier.style.left = 'auto';
      dom.editorMagnifier.style.right = '12px';
      dom.editorMagnifier.style.top = '12px';
    } else {
      dom.editorMagnifier.style.right = 'auto';
      dom.editorMagnifier.style.left = '12px';
      dom.editorMagnifier.style.top = '12px';
    }

    magCtx.clearRect(0, 0, magW, magH);

    const rot = ((editorTempState.rotate % 360) + 360) % 360;
    const isRotated90 = (rot === 90 || rot === 270);
    const natW = editorImgObj.naturalWidth || editorImgObj.width || 100;
    const natH = editorImgObj.naturalHeight || editorImgObj.height || 100;
    const baseW = isRotated90 ? natH : natW;
    const baseH = isRotated90 ? natW : natH;

    const offscreen = document.createElement('canvas');
    const tempStateNoCrop = {
      crop: null,
      rotate: editorTempState.rotate,
      flipH: editorTempState.flipH,
      flipV: editorTempState.flipV,
      filter: editorTempState.filter
    };
    renderEditedImageToCanvas(offscreen, editorImgObj, tempStateNoCrop, baseW, baseH);

    const scaleX = baseW / (dom.editorCanvas.width || 1);
    const scaleY = baseH / (dom.editorCanvas.height || 1);
    const imgCenterX = focusCanvasX * scaleX;
    const imgCenterY = focusCanvasY * scaleY;

    const zoom = 2.4;
    const srcCropW = magW / zoom;
    const srcCropH = magH / zoom;
    const srcX = imgCenterX - srcCropW / 2;
    const srcY = imgCenterY - srcCropH / 2;

    magCtx.drawImage(
      offscreen,
      srcX, srcY, srcCropW, srcCropH,
      0, 0, magW, magH
    );
  }

  function onCropPointerDown(e) {
    if (!editorCropActive || !dom.editorCanvas) return;
    const { x, y } = getCanvasCoords(e.clientX, e.clientY);
    cropDragMode = getCropHandleAt(x, y);
    if (cropDragMode) {
      isDraggingCrop = true;
      hasCropRectChanged = true;
      cropDragStart = { x, y, rectX: editorCropRect.x, rectY: editorCropRect.y, rectW: editorCropRect.w, rectH: editorCropRect.h };
      updateCropDrag(x, y);
    }
  }

  function onCropTouchStart(e) {
    if (!editorCropActive || !dom.editorCanvas || e.touches.length === 0) return;
    const touch = e.touches[0];
    const { x, y } = getCanvasCoords(touch.clientX, touch.clientY);
    cropDragMode = getCropHandleAt(x, y);
    if (cropDragMode) {
      e.preventDefault();
      isDraggingCrop = true;
      hasCropRectChanged = true;
      cropDragStart = { x, y, rectX: editorCropRect.x, rectY: editorCropRect.y, rectW: editorCropRect.w, rectH: editorCropRect.h };
      updateCropDrag(x, y);
    }
  }

  function onCropPointerMove(e) {
    if (!editorCropActive || !isDraggingCrop || !dom.editorCanvas) return;
    const { x, y } = getCanvasCoords(e.clientX, e.clientY);
    updateCropDrag(x, y);
  }

  function onCropTouchMove(e) {
    if (!editorCropActive || !isDraggingCrop || !dom.editorCanvas || e.touches.length === 0) return;
    e.preventDefault();
    const touch = e.touches[0];
    const { x, y } = getCanvasCoords(touch.clientX, touch.clientY);
    updateCropDrag(x, y);
  }

  function onCropPointerUp() {
    isDraggingCrop = false;
    cropDragMode = null;
    if (dom.editorMagnifier) dom.editorMagnifier.classList.add('hidden');
  }

  function updateCropDrag(x, y) {
    const dx = x - cropDragStart.x;
    const dy = y - cropDragStart.y;
    const cw = dom.editorCanvas.width;
    const ch = dom.editorCanvas.height;
    const minSize = 25;

    let newX = cropDragStart.rectX;
    let newY = cropDragStart.rectY;
    let newW = cropDragStart.rectW;
    let newH = cropDragStart.rectH;

    if (cropDragMode === 'move') {
      newX = Math.max(0, Math.min(cw - newW, cropDragStart.rectX + dx));
      newY = Math.max(0, Math.min(ch - newH, cropDragStart.rectY + dy));
    } else if (cropDragMode === 'se') {
      newW = Math.max(minSize, Math.min(cw - newX, cropDragStart.rectW + dx));
      newH = Math.max(minSize, Math.min(ch - newY, cropDragStart.rectH + dy));
    } else if (cropDragMode === 'nw') {
      newW = Math.max(minSize, cropDragStart.rectW - dx);
      newH = Math.max(minSize, cropDragStart.rectH - dy);
      newX = Math.max(0, Math.min(cropDragStart.rectX + cropDragStart.rectW - minSize, cropDragStart.rectX + (cropDragStart.rectW - newW)));
      newY = Math.max(0, Math.min(cropDragStart.rectY + cropDragStart.rectH - minSize, cropDragStart.rectY + (cropDragStart.rectH - newH)));
      newW = (cropDragStart.rectX + cropDragStart.rectW) - newX;
      newH = (cropDragStart.rectY + cropDragStart.rectH) - newY;
    } else if (cropDragMode === 'ne') {
      newW = Math.max(minSize, Math.min(cw - newX, cropDragStart.rectW + dx));
      newH = Math.max(minSize, cropDragStart.rectH - dy);
      newY = Math.max(0, Math.min(cropDragStart.rectY + cropDragStart.rectH - minSize, cropDragStart.rectY + (cropDragStart.rectH - newH)));
      newH = (cropDragStart.rectY + cropDragStart.rectH) - newY;
    } else if (cropDragMode === 'sw') {
      newW = Math.max(minSize, cropDragStart.rectW - dx);
      newH = Math.max(minSize, Math.min(ch - newY, cropDragStart.rectH + dy));
      newX = Math.max(0, Math.min(cropDragStart.rectX + cropDragStart.rectW - minSize, cropDragStart.rectX + (cropDragStart.rectW - newW)));
      newW = (cropDragStart.rectX + cropDragStart.rectW) - newX;
    } else if (cropDragMode === 'n') {
      newH = Math.max(minSize, cropDragStart.rectH - dy);
      newY = Math.max(0, Math.min(cropDragStart.rectY + cropDragStart.rectH - minSize, cropDragStart.rectY + (cropDragStart.rectH - newH)));
      newH = (cropDragStart.rectY + cropDragStart.rectH) - newY;
    } else if (cropDragMode === 's') {
      newH = Math.max(minSize, Math.min(ch - newY, cropDragStart.rectH + dy));
    } else if (cropDragMode === 'w') {
      newW = Math.max(minSize, cropDragStart.rectW - dx);
      newX = Math.max(0, Math.min(cropDragStart.rectX + cropDragStart.rectW - minSize, cropDragStart.rectX + (cropDragStart.rectW - newW)));
      newW = (cropDragStart.rectX + cropDragStart.rectW) - newX;
    } else if (cropDragMode === 'e') {
      newW = Math.max(minSize, Math.min(cw - newX, cropDragStart.rectW + dx));
    }

    editorCropRect = { x: newX, y: newY, w: newW, h: newH };
    adjustCropRectToRatio();
    drawEditorCanvas();

    let focusCanvasX = newX + newW / 2;
    let focusCanvasY = newY + newH / 2;
    if (cropDragMode === 'nw') { focusCanvasX = newX; focusCanvasY = newY; }
    else if (cropDragMode === 'ne') { focusCanvasX = newX + newW; focusCanvasY = newY; }
    else if (cropDragMode === 'se') { focusCanvasX = newX + newW; focusCanvasY = newY + newH; }
    else if (cropDragMode === 'sw') { focusCanvasX = newX; focusCanvasY = newY + newH; }
    else if (cropDragMode === 'n') { focusCanvasX = newX + newW / 2; focusCanvasY = newY; }
    else if (cropDragMode === 's') { focusCanvasX = newX + newW / 2; focusCanvasY = newY + newH; }
    else if (cropDragMode === 'w') { focusCanvasX = newX; focusCanvasY = newY + newH / 2; }
    else if (cropDragMode === 'e') { focusCanvasX = newX + newW; focusCanvasY = newY + newH / 2; }

    renderMagnifier(focusCanvasX, focusCanvasY);
  }

  function commitActiveCropRect() {
    if (!dom.editorCanvas || !editorImgObj) return;

    const cw = dom.editorCanvas.width;
    const ch = dom.editorCanvas.height;
    const rot = ((editorTempState.rotate % 360) + 360) % 360;
    const isRotated90 = (rot === 90 || rot === 270);

    const natW = editorImgObj.naturalWidth || editorImgObj.width || 100;
    const natH = editorImgObj.naturalHeight || editorImgObj.height || 100;
    const fullRotatedW = isRotated90 ? natH : natW;
    const fullRotatedH = isRotated90 ? natW : natH;

    const scaleX = fullRotatedW / cw;
    const scaleY = fullRotatedH / ch;

    editorTempState.crop = {
      x: Math.max(0, Math.min(fullRotatedW - 1, Math.round(editorCropRect.x * scaleX))),
      y: Math.max(0, Math.min(fullRotatedH - 1, Math.round(editorCropRect.y * scaleY))),
      w: Math.max(1, Math.min(fullRotatedW, Math.round(editorCropRect.w * scaleX))),
      h: Math.max(1, Math.min(fullRotatedH, Math.round(editorCropRect.h * scaleY)))
    };
  }

  async function saveEditorChanges() {
    if (currentEditingIndex < 0 || currentEditingIndex >= imageList.length) return;
    const item = imageList[currentEditingIndex];

    if (editorCropActive) {
      commitActiveCropRect();
    }

    item.editState = JSON.parse(JSON.stringify(editorTempState));

    const offscreen = document.createElement('canvas');
    renderEditedImageToCanvas(offscreen, editorImgObj, item.editState);

    item.previewDataUrl = offscreen.toDataURL('image/jpeg', 0.9);
    item.width = offscreen.width;
    item.height = offscreen.height;

    renderList();
    updatePDFPreview();
    forceCloseEditor();
    Utils.showToast(`Saved changes for "${item.name}"!`, 'success');
  }

  function hasChanges() {
    if (JSON.stringify(editorTempState) !== initialSavedStateJson) return true;
    if (hasCropRectChanged) return true;
    if (editorCropActive && (!currentEditingIndex >= 0 || !imageList[currentEditingIndex] || !imageList[currentEditingIndex].editState.crop)) return true;
    return false;
  }

  function handleCancelClick() {
    if (!hasChanges()) {
      forceCloseEditor();
      return;
    }
    showDiscardModal();
  }

  function showDiscardModal() {
    const modal = document.getElementById('i2p-discard-confirm-modal');
    if (modal) modal.classList.remove('hidden');
  }

  function hideDiscardModal() {
    const modal = document.getElementById('i2p-discard-confirm-modal');
    if (modal) modal.classList.add('hidden');
  }

  function confirmDiscard() {
    hideDiscardModal();
    if (currentEditingIndex >= 0 && currentEditingIndex < imageList.length) {
      editorTempState = JSON.parse(JSON.stringify(imageList[currentEditingIndex].editState));
    }
    forceCloseEditor();
  }

  function keepEditing() {
    hideDiscardModal();
  }

  function forceCloseEditor() {
    hideDiscardModal();
    if (dom.editorModal) dom.editorModal.classList.add('hidden');
    if (dom.editorMagnifier) dom.editorMagnifier.classList.add('hidden');
    currentEditingIndex = -1;
    editorImgObj = null;
    editorCropActive = false;
    isDraggingCrop = false;
    cropDragMode = null;
    hasCropRectChanged = false;
  }

  function closeEditor() {
    handleCancelClick();
  }

  function bindSignatureEvents() {
    if (dom.addSignatureBtn) dom.addSignatureBtn.addEventListener('click', openSignatureModal);
    if (dom.sigCloseBtn) dom.sigCloseBtn.addEventListener('click', closeSignatureModal);
    if (dom.sigCancelBtn) dom.sigCancelBtn.addEventListener('click', closeSignatureModal);
    if (dom.sigUseBtn) dom.sigUseBtn.addEventListener('click', applySignatureToPDF);

    Utils.setupDropZone(dom.sigDropzone, handleSignatureFile, ['image/', '.jpg', '.jpeg', '.png', '.webp']);
    if (dom.sigBrowseBtn) dom.sigBrowseBtn.addEventListener('click', () => dom.sigFileInput.click());
    if (dom.sigChangeBtn) dom.sigChangeBtn.addEventListener('click', () => dom.sigFileInput.click());
    if (dom.sigFileInput) {
      dom.sigFileInput.addEventListener('change', (e) => {
        handleSignatureFile(Array.from(e.target.files));
        dom.sigFileInput.value = '';
      });
    }

    if (dom.sigSensitivitySlider) {
      dom.sigSensitivitySlider.addEventListener('input', (e) => {
        signatureSettings.sensitivity = parseInt(e.target.value, 10);
        if (dom.sigSensitivityVal) dom.sigSensitivityVal.textContent = signatureSettings.sensitivity + '%';
        processSignature();
      });
    }

    if (dom.sigColorChips) {
      dom.sigColorChips.forEach(chip => {
        chip.addEventListener('click', () => {
          signatureSettings.inkColor = chip.dataset.color;
          dom.sigColorChips.forEach(c => c.classList.toggle('active', c === chip));
          processSignature();
        });
      });
    }

    if (dom.sigAutoCropCheckbox) {
      dom.sigAutoCropCheckbox.addEventListener('change', (e) => {
        signatureSettings.autoCrop = e.target.checked;
        processSignature();
      });
    }
  }

  function getEffectiveLayoutForItem(item) {
    const global = globalLayoutSettings || getLayoutSettings();
    if (item && item.layoutOverride) {
      return { ...global, ...item.layoutOverride };
    }
    return { ...global };
  }

  function buildPDFPages(list = imageList) {
    if (!list || list.length === 0) return [];
    const pages = [];
    let itemIndex = 0;
    let pageIndex = 0;

    while (itemIndex < list.length) {
      const leadItem = list[itemIndex];
      const effectiveSettings = getEffectiveLayoutForItem(leadItem);
      const placement = effectiveSettings.placement || 'front-back';

      if (placement === 'front-back') {
        const items = [leadItem];
        let advance = 1;
        if (itemIndex + 1 < list.length) {
          const nextItem = list[itemIndex + 1];
          const nextPlacement = (nextItem.layoutOverride && nextItem.layoutOverride.placement) || null;
          if (!nextPlacement || nextPlacement === 'front-back') {
            items.push(nextItem);
            advance = 2;
          }
        }
        pages.push({
          pageIndex,
          leadItem,
          settings: effectiveSettings,
          items,
          placement: 'front-back'
        });
        itemIndex += advance;
        pageIndex++;
      } else if (placement === 'multi-card') {
        const cpp = (effectiveSettings.multiLayout === '4-grid') ? 4 : 2;
        const items = [leadItem];
        let advance = 1;
        for (let k = 1; k < cpp && (itemIndex + k) < list.length; k++) {
          const nextItem = list[itemIndex + k];
          const nextPlacement = (nextItem.layoutOverride && nextItem.layoutOverride.placement) || null;
          if (nextPlacement && nextPlacement !== 'multi-card') break;
          items.push(nextItem);
          advance++;
        }
        pages.push({
          pageIndex,
          leadItem,
          settings: effectiveSettings,
          items,
          placement: 'multi-card'
        });
        itemIndex += advance;
        pageIndex++;
      } else {
        pages.push({
          pageIndex,
          leadItem,
          settings: effectiveSettings,
          items: [leadItem],
          placement
        });
        itemIndex += 1;
        pageIndex++;
      }
    }
    return pages;
  }

  function getCardsPerPage() {
    const placement = dom.imagePlacementSelect ? dom.imagePlacementSelect.value : 'front-back';
    if (placement === 'front-back') return 2;
    if (placement !== 'multi-card') return 1;
    const layout = dom.multiCardLayoutSelect ? dom.multiCardLayoutSelect.value : '2-vertical';
    if (layout === '4-grid') return 4;
    return 2;
  }

  function getTotalPDFPages() {
    if (imageList.length === 0) return 0;
    const pages = buildPDFPages(imageList);
    return pages.length;
  }

  function getCurrentPagePrimaryItem() {
    if (imageList.length === 0) return null;
    const pages = buildPDFPages(imageList);
    if (pages.length === 0 || previewPageIndex >= pages.length) return null;
    return pages[previewPageIndex].leadItem || null;
  }

  function getLayoutSettings() {
    const placement = dom.imagePlacementSelect ? dom.imagePlacementSelect.value : 'front-back';

    const fbPreset = dom.fbPresetSelect ? dom.fbPresetSelect.value : 'standard-id';
    let fbWidthMm = parseFloat(dom.fbWidthInput ? dom.fbWidthInput.value : 85.6);
    let fbHeightMm = parseFloat(dom.fbHeightInput ? dom.fbHeightInput.value : 54.0);
    let fbGapMm = parseFloat(dom.fbGapInput ? dom.fbGapInput.value : 15);
    if (isNaN(fbWidthMm) || fbWidthMm <= 0) fbWidthMm = 85.6;
    if (isNaN(fbHeightMm) || fbHeightMm <= 0) fbHeightMm = 54.0;
    if (isNaN(fbGapMm) || fbGapMm < 0) fbGapMm = 15;
    const fbLockRatio = dom.fbLockRatioCheck ? dom.fbLockRatioCheck.checked : true;
    const fbBorder = dom.fbBorderCheck ? dom.fbBorderCheck.checked : true;

    const cardPreset = dom.cardPresetSelect ? dom.cardPresetSelect.value : 'standard-id';
    let cardWidthMm = parseFloat(dom.cardWidthInput ? dom.cardWidthInput.value : 85.6);
    let cardHeightMm = parseFloat(dom.cardHeightInput ? dom.cardHeightInput.value : 54.0);
    if (isNaN(cardWidthMm) || cardWidthMm <= 0) cardWidthMm = 85.6;
    if (isNaN(cardHeightMm) || cardHeightMm <= 0) cardHeightMm = 54.0;
    const cardLockRatio = dom.cardLockRatioCheck ? dom.cardLockRatioCheck.checked : true;
    const cardBorder = dom.cardBorderCheck ? dom.cardBorderCheck.checked : true;

    let customMmW = parseFloat(dom.customMmWidthInput ? dom.customMmWidthInput.value : 100);
    let customMmH = parseFloat(dom.customMmHeightInput ? dom.customMmHeightInput.value : 150);
    if (isNaN(customMmW) || customMmW <= 0) customMmW = 100;
    if (isNaN(customMmH) || customMmH <= 0) customMmH = 150;
    const customLockRatio = dom.customLockRatioCheck ? dom.customLockRatioCheck.checked : true;
    const customBorder = dom.customBorderCheck ? dom.customBorderCheck.checked : false;

    const multiLayout = dom.multiCardLayoutSelect ? dom.multiCardLayoutSelect.value : '2-vertical';
    let multiWidthMm = parseFloat(dom.multiCardWidthInput ? dom.multiCardWidthInput.value : 85.6);
    let multiHeightMm = parseFloat(dom.multiCardHeightInput ? dom.multiCardHeightInput.value : 54.0);
    let multiGapMm = parseFloat(dom.multiCardGapInput ? dom.multiCardGapInput.value : 15);
    if (isNaN(multiWidthMm) || multiWidthMm <= 0) multiWidthMm = 85.6;
    if (isNaN(multiHeightMm) || multiHeightMm <= 0) multiHeightMm = 54.0;
    if (isNaN(multiGapMm) || multiGapMm < 0) multiGapMm = 15;
    const multiLockRatio = dom.multiLockRatioCheck ? dom.multiLockRatioCheck.checked : true;
    const multiBorder = dom.multiBorderCheck ? dom.multiBorderCheck.checked : true;

    const printDpiSetting = dom.printDpiSelect ? dom.printDpiSelect.value : 'auto';

    return {
      placement,
      fbPreset,
      fbWidthMm,
      fbHeightMm,
      fbGapMm,
      fbLockRatio,
      fbBorder,
      cardPreset,
      cardWidthMm,
      cardHeightMm,
      cardLockRatio,
      cardBorder,
      customMmW,
      customMmH,
      customLockRatio,
      customBorder,
      multiLayout,
      multiWidthMm,
      multiHeightMm,
      multiGapMm,
      multiLockRatio,
      multiBorder,
      printDpiSetting
    };
  }

  function computePageLayout(pageIndex, list, pageDim, marginPts, settings) {
    const pages = buildPDFPages(list);
    const pageDef = (pages && pageIndex >= 0 && pageIndex < pages.length) ? pages[pageIndex] : null;
    const effectiveSettings = (pageDef && pageDef.settings) ? pageDef.settings : (settings || getLayoutSettings());
    const placement = effectiveSettings.placement || 'front-back';
    const results = [];

    const usableW = Math.max(10, pageDim.width - marginPts * 2);
    const usableH = Math.max(10, pageDim.height - marginPts * 2);

    if (placement === 'front-back') {
      const pageItems = pageDef ? pageDef.items : list.slice(pageIndex * 2, pageIndex * 2 + 2);
      const boxW = effectiveSettings.fbWidthMm * MM_TO_PT;
      const boxH = effectiveSettings.fbHeightMm * MM_TO_PT;
      const gap = effectiveSettings.fbGapMm * MM_TO_PT;
      const totalStackH = boxH * 2 + gap;

      const startX = marginPts + (usableW - boxW) / 2;
      const startY = marginPts + (usableH - totalStackH) / 2;

      const slots = [
        { x: startX, y: startY, w: boxW, h: boxH, role: 'Front' },
        { x: startX, y: startY + boxH + gap, w: boxW, h: boxH, role: 'Back' }
      ];

      for (let s = 0; s < pageItems.length && s < 2; s++) {
        const item = pageItems[s];
        const slot = slots[s];
        const dims = getItemEffectiveDimensions(item);
        const imgW = dims.width;
        const imgH = dims.height;

        let drawW = slot.w;
        let drawH = slot.h;
        if (effectiveSettings.fbLockRatio) {
          const scale = Math.min(slot.w / imgW, slot.h / imgH);
          drawW = imgW * scale;
          drawH = imgH * scale;
        }
        const drawX = slot.x + (slot.w - drawW) / 2;
        const drawY = slot.y + (slot.h - drawH) / 2;

        results.push({
          itemIndex: list.indexOf(item),
          item,
          slot,
          draw: { x: drawX, y: drawY, w: drawW, h: drawH },
          drawBorder: effectiveSettings.fbBorder,
          role: slot.role,
          isFrontBack: true
        });
      }

      if (pageItems.length === 1 && results.length > 0) {
        results[0].emptyBackSlot = slots[1];
      }

      return results;
    }

    if (placement === 'multi-card') {
      const pageItems = pageDef ? pageDef.items : list.slice(pageIndex * 2, pageIndex * 2 + 2);
      const cpp = (effectiveSettings.multiLayout === '4-grid') ? 4 : 2;
      const boxW = effectiveSettings.multiWidthMm * MM_TO_PT;
      const boxH = effectiveSettings.multiHeightMm * MM_TO_PT;
      const gap = effectiveSettings.multiGapMm * MM_TO_PT;

      const slots = [];
      if (effectiveSettings.multiLayout === '2-vertical') {
        const totalH = boxH * 2 + gap;
        const startX = marginPts + (usableW - boxW) / 2;
        const startY = marginPts + (usableH - totalH) / 2;
        slots.push({ x: startX, y: startY, w: boxW, h: boxH });
        slots.push({ x: startX, y: startY + boxH + gap, w: boxW, h: boxH });
      } else if (effectiveSettings.multiLayout === '2-horizontal') {
        const totalW = boxW * 2 + gap;
        const startX = marginPts + (usableW - totalW) / 2;
        const startY = marginPts + (usableH - boxH) / 2;
        slots.push({ x: startX, y: startY, w: boxW, h: boxH });
        slots.push({ x: startX + boxW + gap, y: startY, w: boxW, h: boxH });
      } else if (effectiveSettings.multiLayout === '4-grid') {
        const totalW = boxW * 2 + gap;
        const totalH = boxH * 2 + gap;
        const startX = marginPts + (usableW - totalW) / 2;
        const startY = marginPts + (usableH - totalH) / 2;
        slots.push({ x: startX, y: startY, w: boxW, h: boxH });
        slots.push({ x: startX + boxW + gap, y: startY, w: boxW, h: boxH });
        slots.push({ x: startX, y: startY + boxH + gap, w: boxW, h: boxH });
        slots.push({ x: startX + boxW + gap, y: startY + boxH + gap, w: boxW, h: boxH });
      }

      for (let s = 0; s < pageItems.length && s < slots.length; s++) {
        const item = pageItems[s];
        const slot = slots[s];
        const dims = getItemEffectiveDimensions(item);
        const imgW = dims.width;
        const imgH = dims.height;

        let drawW = slot.w;
        let drawH = slot.h;
        if (effectiveSettings.multiLockRatio) {
          const scale = Math.min(slot.w / imgW, slot.h / imgH);
          drawW = imgW * scale;
          drawH = imgH * scale;
        }
        const drawX = slot.x + (slot.w - drawW) / 2;
        const drawY = slot.y + (slot.h - drawH) / 2;

        results.push({
          itemIndex: list.indexOf(item),
          item,
          slot,
          draw: { x: drawX, y: drawY, w: drawW, h: drawH },
          drawBorder: effectiveSettings.multiBorder
        });
      }

      return results;
    }

    const item = pageDef ? (pageDef.items[0] || null) : ((pageIndex >= 0 && pageIndex < list.length) ? list[pageIndex] : null);
    if (!item) return results;

    const dims = getItemEffectiveDimensions(item);
    const imgW = dims.width;
    const imgH = dims.height;

    if (placement === 'fit') {
      const imgRatio = imgW / imgH;
      const areaRatio = usableW / usableH;
      let drawW, drawH;
      if (imgRatio > areaRatio) {
        drawW = usableW;
        drawH = usableW / imgRatio;
      } else {
        drawH = usableH;
        drawW = usableH * imgRatio;
      }
      const drawX = marginPts + (usableW - drawW) / 2;
      const drawY = marginPts + (usableH - drawH) / 2;
      results.push({
        itemIndex: list.indexOf(item),
        item,
        slot: { x: marginPts, y: marginPts, w: usableW, h: usableH },
        draw: { x: drawX, y: drawY, w: drawW, h: drawH },
        drawBorder: false
      });
    } else if (placement === 'fill') {
      results.push({
        itemIndex: list.indexOf(item),
        item,
        slot: { x: marginPts, y: marginPts, w: usableW, h: usableH },
        draw: { x: marginPts, y: marginPts, w: usableW, h: usableH },
        drawBorder: false
      });
    } else if (placement === 'id-card') {
      const boxW = effectiveSettings.cardWidthMm * MM_TO_PT;
      const boxH = effectiveSettings.cardHeightMm * MM_TO_PT;
      const slotX = marginPts + (usableW - boxW) / 2;
      const slotY = marginPts + (usableH - boxH) / 2;
      const slot = { x: slotX, y: slotY, w: boxW, h: boxH };

      let drawW = boxW;
      let drawH = boxH;
      if (effectiveSettings.cardLockRatio) {
        const scale = Math.min(boxW / imgW, boxH / imgH);
        drawW = imgW * scale;
        drawH = imgH * scale;
      }
      const drawX = slot.x + (slot.w - drawW) / 2;
      const drawY = slot.y + (slot.h - drawH) / 2;

      results.push({
        itemIndex: list.indexOf(item),
        item,
        slot,
        draw: { x: drawX, y: drawY, w: drawW, h: drawH },
        drawBorder: effectiveSettings.cardBorder
      });
    } else if (placement === 'custom') {
      const boxW = effectiveSettings.customMmW * MM_TO_PT;
      const boxH = effectiveSettings.customMmH * MM_TO_PT;
      const slotX = marginPts + (usableW - boxW) / 2;
      const slotY = marginPts + (usableH - boxH) / 2;
      const slot = { x: slotX, y: slotY, w: boxW, h: boxH };

      let drawW = boxW;
      let drawH = boxH;
      if (effectiveSettings.customLockRatio) {
        const scale = Math.min(boxW / imgW, boxH / imgH);
        drawW = imgW * scale;
        drawH = imgH * scale;
      }
      const drawX = slot.x + (slot.w - drawW) / 2;
      const drawY = slot.y + (slot.h - drawH) / 2;

      results.push({
        itemIndex: list.indexOf(item),
        item,
        slot,
        draw: { x: drawX, y: drawY, w: drawW, h: drawH },
        drawBorder: effectiveSettings.customBorder
      });
    } else if (placement === 'original') {
      let dpi = 300;
      if (effectiveSettings.printDpiSetting !== 'auto' && !isNaN(parseFloat(effectiveSettings.printDpiSetting))) {
        dpi = parseFloat(effectiveSettings.printDpiSetting);
      } else if (item.detectedDpi && item.detectedDpi >= 72) {
        dpi = item.detectedDpi;
      }

      let ptW = (imgW / dpi) * 72;
      let ptH = (imgH / dpi) * 72;
      if (ptW > usableW || ptH > usableH) {
        const scale = Math.min(usableW / ptW, usableH / ptH);
        ptW *= scale;
        ptH *= scale;
      }

      const drawX = marginPts + (usableW - ptW) / 2;
      const drawY = marginPts + (usableH - ptH) / 2;

      results.push({
        itemIndex: list.indexOf(item),
        item,
        slot: { x: drawX, y: drawY, w: ptW, h: ptH },
        draw: { x: drawX, y: drawY, w: ptW, h: ptH },
        drawBorder: false
      });
    }

    return results;
  }

  function openSignatureModal() {
    if (dom.signatureModal) dom.signatureModal.classList.remove('hidden');

    const currentItem = getCurrentPagePrimaryItem();

    if (currentItem && currentItem.signature && currentItem.signature.active && currentItem.signature.rawImage) {
      signatureRawImage = currentItem.signature.rawImage;
      signatureDataUrl = currentItem.signature.dataUrl;
      if (currentItem.signature.settings) {
        signatureSettings = { ...currentItem.signature.settings };
      }
      if (dom.sigSensitivitySlider) {
        dom.sigSensitivitySlider.value = signatureSettings.sensitivity;
      }
      if (dom.sigSensitivityVal) {
        dom.sigSensitivityVal.textContent = signatureSettings.sensitivity + '%';
      }
      if (dom.sigColorChips) {
        dom.sigColorChips.forEach(c => c.classList.toggle('active', c.dataset.color === signatureSettings.inkColor));
      }
      if (dom.sigAutoCropCheckbox) {
        dom.sigAutoCropCheckbox.checked = signatureSettings.autoCrop;
      }
      if (dom.sigDropzone) dom.sigDropzone.classList.add('hidden');
      if (dom.sigPreviewWrap) dom.sigPreviewWrap.classList.remove('hidden');
      if (dom.sigUseBtn) dom.sigUseBtn.disabled = false;
      processSignature();
    } else {
      signatureRawImage = null;
      signatureDataUrl = null;
      if (dom.sigFileInput) dom.sigFileInput.value = '';
      if (dom.sigDropzone) dom.sigDropzone.classList.remove('hidden');
      if (dom.sigPreviewWrap) dom.sigPreviewWrap.classList.add('hidden');
      if (dom.sigUseBtn) dom.sigUseBtn.disabled = true;
    }
  }

  function closeSignatureModal() {
    if (dom.signatureModal) dom.signatureModal.classList.add('hidden');
  }

  async function handleSignatureFile(files) {
    if (!files || files.length === 0) return;
    const file = files[0];
    if (!file.type.startsWith('image/') && !/\.(jpg|jpeg|png|webp|bmp)$/i.test(file.name)) {
      Utils.showToast('Please upload a valid signature image (JPG, PNG, WebP).', 'warning');
      return;
    }

    try {
      const dataUrl = await Utils.readFileAsDataURL(file);
      signatureRawImage = await Utils.loadImage(dataUrl);

      if (dom.sigDropzone) dom.sigDropzone.classList.add('hidden');
      if (dom.sigEmptyPreview) dom.sigEmptyPreview.classList.add('hidden');
      if (dom.sigPreviewWrap) dom.sigPreviewWrap.classList.remove('hidden');
      if (dom.sigUseBtn) dom.sigUseBtn.disabled = false;

      processSignature();
      Utils.showToast('Signature loaded! Background automatically extracted.', 'success');
    } catch (err) {
      console.error(err);
      Utils.showToast('Failed to load signature image: ' + err.message, 'error');
    }
  }

  function processSignature() {
    if (!signatureRawImage || !dom.sigPreviewCanvas) return;

    const canvas = document.createElement('canvas');
    canvas.width = signatureRawImage.naturalWidth;
    canvas.height = signatureRawImage.naturalHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(signatureRawImage, 0, 0);

    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const d = imgData.data;

    const threshold = 120 + (signatureSettings.sensitivity / 100) * 125;
    const inkMode = signatureSettings.inkColor;

    let minX = canvas.width, minY = canvas.height, maxX = 0, maxY = 0;
    let hasInk = false;

    for (let i = 0; i < d.length; i += 4) {
      const r = d[i];
      const g = d[i + 1];
      const b = d[i + 2];

      const lum = 0.299 * r + 0.587 * g + 0.114 * b;

      if (lum >= threshold) {

        d[i + 3] = 0;
      } else {

        const alphaFactor = Math.min(1, Math.max(0, (threshold - lum) / (threshold * 0.45)));
        const alpha = Math.round(alphaFactor * 255);
        d[i + 3] = alpha;

        if (alpha > 20) {
          const pixelIdx = i / 4;
          const px = pixelIdx % canvas.width;
          const py = Math.floor(pixelIdx / canvas.width);
          if (px < minX) minX = px;
          if (px > maxX) maxX = px;
          if (py < minY) minY = py;
          if (py > maxY) maxY = py;
          hasInk = true;

          if (inkMode === 'black') {
            d[i] = 20;
            d[i + 1] = 20;
            d[i + 2] = 20;
          } else if (inkMode === 'blue') {
            d[i] = 20;
            d[i + 1] = 60;
            d[i + 2] = 165;
          }
        }
      }
    }

    ctx.putImageData(imgData, 0, 0);

    let finalCanvas = canvas;
    if (signatureSettings.autoCrop && hasInk && minX < maxX && minY < maxY) {
      const pad = 8;
      const cropX = Math.max(0, minX - pad);
      const cropY = Math.max(0, minY - pad);
      const cropW = Math.min(canvas.width - cropX, (maxX - minX) + pad * 2);
      const cropH = Math.min(canvas.height - cropY, (maxY - minY) + pad * 2);

      const cropped = document.createElement('canvas');
      cropped.width = cropW;
      cropped.height = cropH;
      const cCtx = cropped.getContext('2d');
      cCtx.drawImage(canvas, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);
      finalCanvas = cropped;
    }

    const prevCanvas = dom.sigPreviewCanvas;
    const maxPrevW = 280;
    const maxPrevH = 140;
    const scale = Math.min(maxPrevW / finalCanvas.width, maxPrevH / finalCanvas.height, 1);

    prevCanvas.width = Math.round(finalCanvas.width * scale);
    prevCanvas.height = Math.round(finalCanvas.height * scale);
    const pCtx = prevCanvas.getContext('2d');
    pCtx.clearRect(0, 0, prevCanvas.width, prevCanvas.height);
    pCtx.drawImage(finalCanvas, 0, 0, prevCanvas.width, prevCanvas.height);

    signatureDataUrl = finalCanvas.toDataURL('image/png');
    signaturePlacement.aspectRatio = finalCanvas.width / finalCanvas.height;
  }

  function applySignatureToPDF() {
    if (!signatureDataUrl) {
      Utils.showToast('Please upload a signature first.', 'warning');
      return;
    }

    const currentItem = getCurrentPagePrimaryItem();

    if (!currentItem) {
      Utils.showToast('No page selected.', 'warning');
      return;
    }

    const isAll = dom.sigApplyScopeSelect && dom.sigApplyScopeSelect.value === 'all';
    const newSig = {
      active: true,
      dataUrl: signatureDataUrl,
      rawImage: signatureRawImage,
      aspectRatio: signaturePlacement.aspectRatio || 1,
      relX: (currentItem.signature && typeof currentItem.signature.relX === 'number') ? currentItem.signature.relX : 0.65,
      relY: (currentItem.signature && typeof currentItem.signature.relY === 'number') ? currentItem.signature.relY : 0.75,
      relW: (currentItem.signature && typeof currentItem.signature.relW === 'number') ? currentItem.signature.relW : 0.25,
      preset: currentItem.signature ? currentItem.signature.preset : 'br',
      settings: { ...signatureSettings }
    };

    if (isAll) {
      imageList.forEach(item => {
        item.signature = { ...newSig };
      });
    } else {
      currentItem.signature = newSig;
    }

    signaturePlacement.active = true;
    closeSignatureModal();

    if (dom.sigControlsRow) dom.sigControlsRow.classList.remove('hidden');
    if (dom.addSignatureBtn) dom.addSignatureBtn.innerHTML = `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 14px; height: 14px; margin-right: 4px;"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
      Edit Signature
    `;

    updatePDFPreview();
    Utils.showToast(isAll ? 'Signature added to all pages!' : 'Signature added! Drag or use position presets to place on page.', 'success');
  }

  function updateSigPosBtnStates(sig) {
    if (!dom.sigPosBtns) return;
    if (!sig) {
      dom.sigPosBtns.forEach(b => b.classList.remove('active'));
      return;
    }
    const p = (sig.preset || '').toLowerCase();
    dom.sigPosBtns.forEach(b => {
      const bPos = (b.dataset.pos || '').toLowerCase();
      b.classList.toggle('active', bPos === p);
    });
  }

  function bindSignatureOverlayEvents() {
    if (dom.sigDeleteBtn) {
      dom.sigDeleteBtn.addEventListener('click', () => {
        const currentItem = getCurrentPagePrimaryItem();
        if (currentItem) {
          currentItem.signature = null;
        }
        if (dom.sigOverlayBox) dom.sigOverlayBox.classList.add('hidden');
        if (dom.sigControlsRow) dom.sigControlsRow.classList.add('hidden');
        if (dom.sigOverlayImg) dom.sigOverlayImg.src = '';
        if (dom.addSignatureBtn) dom.addSignatureBtn.innerHTML = `
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 14px; height: 14px; margin-right: 4px;"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><path d="M10.5 14.5c.8-1.2 2-1.5 2.5-.5.5 1-1.5 2.5-.5 3.5 1 1 2.5 0 3-1.5"></path></svg>
          Add Signature
        `;
        updateSigPosBtnStates(null);
        Utils.showToast('Signature removed.', 'info');
      });
    }

    if (dom.sigApplyScopeSelect) {
      dom.sigApplyScopeSelect.addEventListener('change', (e) => {
        const isAll = e.target.value === 'all';
        signaturePlacement.applyToAll = isAll;
        if (isAll) {
          const currentItem = getCurrentPagePrimaryItem();
          if (currentItem && currentItem.signature && currentItem.signature.active) {
            imageList.forEach(item => {
              item.signature = { ...currentItem.signature };
            });
            Utils.showToast('Signature applied to all pages.', 'info');
          }
        }
      });
    }

    if (dom.sigPosBtns && dom.sigPosBtns.length > 0) {
      dom.sigPosBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.preventDefault();
          const pos = btn.dataset.pos;
          setSignaturePositionPreset(pos);
        });
      });
    }

    if (dom.sigOverlayBox) {
      dom.sigOverlayBox.addEventListener('mousedown', onSigPointerDown);
      dom.sigOverlayBox.addEventListener('touchstart', onSigTouchStart, { passive: false });

      if (dom.sigResizeHandle) {
        dom.sigResizeHandle.addEventListener('mousedown', onSigResizeDown);
        dom.sigResizeHandle.addEventListener('touchstart', onSigResizeTouchStart, { passive: false });
      }
    }

    window.addEventListener('mousemove', onSigPointerMove);
    window.addEventListener('touchmove', onSigTouchMove, { passive: false });
    window.addEventListener('mouseup', onSigPointerUp);
    window.addEventListener('touchend', onSigPointerUp);
  }

  function setSignaturePositionPreset(pos) {
    const currentItem = getCurrentPagePrimaryItem();
    if (!currentItem || !currentItem.signature || !currentItem.signature.active || !dom.previewCanvas) return;
    const cw = dom.previewCanvas.clientWidth || dom.previewCanvas.width;
    const ch = dom.previewCanvas.clientHeight || dom.previewCanvas.height;
    if (cw <= 0 || ch <= 0) return;

    const sig = currentItem.signature;
    const w = sig.relW;
    const pxW = cw * w;
    const pxH = pxW / (sig.aspectRatio || 1);
    const relH = pxH / ch;

    const pageDim = getPageDimensions(previewPageIndex);
    const margin = getMarginPoints();
    const settings = getLayoutSettings();
    const layout = computePageLayout(previewPageIndex, imageList, pageDim, margin, settings);

    let targetBox = { x: 0, y: 0, w: pageDim.width, h: pageDim.height };
    if (layout.length > 0) {
      if (layout.length === 1) {
        targetBox = layout[0].slot;
      } else {
        const p = (pos || '').toLowerCase();
        if (p.includes('b')) {
          targetBox = layout[layout.length - 1].slot;
        } else if (p.includes('t')) {
          targetBox = layout[0].slot;
        } else {
          const minX = Math.min(...layout.map(c => c.slot.x));
          const minY = Math.min(...layout.map(c => c.slot.y));
          const maxX = Math.max(...layout.map(c => c.slot.x + c.slot.w));
          const maxY = Math.max(...layout.map(c => c.slot.y + c.slot.h));
          targetBox = { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
        }
      }
    }

    const boxRelX = targetBox.x / pageDim.width;
    const boxRelY = targetBox.y / pageDim.height;
    const boxRelW = targetBox.w / pageDim.width;
    const boxRelH = targetBox.h / pageDim.height;

    const p = (pos || '').toLowerCase();
    sig.preset = p;
    if (p === 'tl' || p === 'top-left') {
      sig.relX = boxRelX + 0.02;
      sig.relY = boxRelY + 0.02;
    } else if (p === 'tr' || p === 'top-right') {
      sig.relX = Math.max(0, boxRelX + boxRelW - w - 0.02);
      sig.relY = boxRelY + 0.02;
    } else if (p === 'center') {
      sig.relX = Math.max(0, boxRelX + (boxRelW - w) / 2);
      sig.relY = Math.max(0, boxRelY + (boxRelH - relH) / 2);
    } else if (p === 'bl' || p === 'bottom-left') {
      sig.relX = boxRelX + 0.02;
      sig.relY = Math.max(0, boxRelY + boxRelH - relH - 0.02);
    } else if (p === 'br' || p === 'bottom-right') {
      sig.relX = Math.max(0, boxRelX + boxRelW - w - 0.02);
      sig.relY = Math.max(0, boxRelY + boxRelH - relH - 0.02);
    }

    sig.relX = Math.max(0, Math.min(1 - w, sig.relX));
    sig.relY = Math.max(0, Math.min(1 - relH, sig.relY));

    updateSigPosBtnStates(sig);
    renderSignatureOverlayBox();
  }

  function onSigPointerDown(e) {
    if (e.target === dom.sigResizeHandle || e.target === dom.sigDeleteBtn || isResizingSig) return;
    const currentItem = getCurrentPagePrimaryItem();
    if (!currentItem || !currentItem.signature || !currentItem.signature.active) return;
    e.preventDefault();
    isDraggingSig = true;
    sigDragStart = {
      mouseX: e.clientX,
      mouseY: e.clientY,
      origX: currentItem.signature.relX,
      origY: currentItem.signature.relY
    };
  }

  function onSigTouchStart(e) {
    if (e.target === dom.sigResizeHandle || e.target === dom.sigDeleteBtn || isResizingSig || e.touches.length === 0) return;
    const currentItem = getCurrentPagePrimaryItem();
    if (!currentItem || !currentItem.signature || !currentItem.signature.active) return;
    e.preventDefault();
    isDraggingSig = true;
    sigDragStart = {
      mouseX: e.touches[0].clientX,
      mouseY: e.touches[0].clientY,
      origX: currentItem.signature.relX,
      origY: currentItem.signature.relY
    };
  }

  function onSigResizeDown(e) {
    e.stopPropagation();
    e.preventDefault();
    const currentItem = getCurrentPagePrimaryItem();
    if (!currentItem || !currentItem.signature || !currentItem.signature.active) return;
    isResizingSig = true;
    sigDragStart = {
      mouseX: e.clientX,
      mouseY: e.clientY,
      origW: currentItem.signature.relW
    };
  }

  function onSigResizeTouchStart(e) {
    e.stopPropagation();
    if (e.touches.length === 0) return;
    const currentItem = getCurrentPagePrimaryItem();
    if (!currentItem || !currentItem.signature || !currentItem.signature.active) return;
    e.preventDefault();
    isResizingSig = true;
    sigDragStart = {
      mouseX: e.touches[0].clientX,
      mouseY: e.touches[0].clientY,
      origW: currentItem.signature.relW
    };
  }

  function onSigPointerMove(e) {
    const currentItem = getCurrentPagePrimaryItem();
    if (!currentItem || !currentItem.signature || !currentItem.signature.active || !dom.previewCanvas) return;
    const cw = dom.previewCanvas.clientWidth || dom.previewCanvas.width;
    const ch = dom.previewCanvas.clientHeight || dom.previewCanvas.height;
    if (cw <= 0 || ch <= 0) return;

    const sig = currentItem.signature;

    if (isDraggingSig) {
      sig.preset = null;
      updateSigPosBtnStates(null);
      const dx = (e.clientX - sigDragStart.mouseX) / cw;
      const dy = (e.clientY - sigDragStart.mouseY) / ch;

      const pxW = cw * sig.relW;
      const pxH = pxW / (sig.aspectRatio || 1);
      const relH = pxH / ch;

      sig.relX = Math.max(0, Math.min(1 - sig.relW, sigDragStart.origX + dx));
      sig.relY = Math.max(0, Math.min(1 - relH, sigDragStart.origY + dy));
      renderSignatureOverlayBox();
    } else if (isResizingSig) {
      sig.preset = null;
      updateSigPosBtnStates(null);
      const dx = (e.clientX - sigDragStart.mouseX) / cw;
      const newW = Math.max(0.08, Math.min(0.9, sigDragStart.origW + dx));
      const pxW = cw * newW;
      const pxH = pxW / (sig.aspectRatio || 1);
      const relH = pxH / ch;

      sig.relW = newW;
      if (sig.relX + newW > 1) {
        sig.relX = Math.max(0, 1 - newW);
      }
      if (sig.relY + relH > 1) {
        sig.relY = Math.max(0, 1 - relH);
      }
      renderSignatureOverlayBox();
    }
  }

  function onSigTouchMove(e) {
    if ((!isDraggingSig && !isResizingSig) || e.touches.length === 0) return;
    const currentItem = getCurrentPagePrimaryItem();
    if (!currentItem || !currentItem.signature || !currentItem.signature.active) return;
    e.preventDefault();
    const touch = e.touches[0];
    onSigPointerMove(touch);
  }

  function onSigPointerUp() {
    isDraggingSig = false;
    isResizingSig = false;
  }

  function renderSignatureOverlayBox() {
    if (!dom.sigOverlayBox || !dom.previewCanvas) return;

    const currentItem = getCurrentPagePrimaryItem();

    if (!currentItem || !currentItem.signature || !currentItem.signature.active || !currentItem.signature.dataUrl) {
      dom.sigOverlayBox.classList.add('hidden');
      if (dom.sigControlsRow) dom.sigControlsRow.classList.add('hidden');
      if (dom.sigOverlayImg) dom.sigOverlayImg.src = '';
      if (dom.addSignatureBtn) {
        dom.addSignatureBtn.innerHTML = `
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 14px; height: 14px; margin-right: 4px;"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><path d="M10.5 14.5c.8-1.2 2-1.5 2.5-.5.5 1-1.5 2.5-.5 3.5 1 1 2.5 0 3-1.5"></path></svg>
          Add Signature
        `;
      }
      updateSigPosBtnStates(null);
      return;
    }

    const sig = currentItem.signature;

    dom.sigOverlayBox.classList.remove('hidden');
    if (dom.sigControlsRow) dom.sigControlsRow.classList.remove('hidden');
    if (dom.sigOverlayImg) dom.sigOverlayImg.src = sig.dataUrl;

    if (dom.addSignatureBtn) {
      dom.addSignatureBtn.innerHTML = `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 14px; height: 14px; margin-right: 4px;"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
        Edit Signature
      `;
    }

    updateSigPosBtnStates(sig);

    const cw = dom.previewCanvas.clientWidth || dom.previewCanvas.width;
    const ch = dom.previewCanvas.clientHeight || dom.previewCanvas.height;
    if (cw <= 0 || ch <= 0) return;

    const pxW = Math.max(20, Math.round(cw * sig.relW));
    const pxH = Math.max(10, Math.round(pxW / (sig.aspectRatio || 1)));
    const pxX = Math.round(cw * sig.relX);
    const pxY = Math.round(ch * sig.relY);

    dom.sigOverlayBox.style.left = `${pxX}px`;
    dom.sigOverlayBox.style.top = `${pxY}px`;
    dom.sigOverlayBox.style.width = `${pxW}px`;
    dom.sigOverlayBox.style.height = `${pxH}px`;
  }

  function getItemEffectiveDimensions(item) {
    if (!item) return { width: 100, height: 100 };
    if (item.editState && item.editState.crop && item.editState.crop.w > 0 && item.editState.crop.h > 0) {
      return { width: Math.max(1, item.editState.crop.w), height: Math.max(1, item.editState.crop.h) };
    }
    let w = item.originalWidth || item.width || 100;
    let h = item.originalHeight || item.height || 100;

    const rot = ((item.editState ? item.editState.rotate : 0) % 360 + 360) % 360;
    if (rot === 90 || rot === 270) {
      const temp = w;
      w = h;
      h = temp;
    }

    return { width: Math.max(1, w), height: Math.max(1, h) };
  }

  function getEffectiveOrientation(item) {
    if (!item) return 'portrait';
    const orient = item.orientation || 'auto';
    if (orient === 'portrait') return 'portrait';
    if (orient === 'landscape') return 'landscape';

    const dims = getItemEffectiveDimensions(item);
    return dims.width > dims.height ? 'landscape' : 'portrait';
  }

  function getPageDimensions(pageIndex = previewPageIndex) {
    const size = dom.pageSizeSelect ? dom.pageSizeSelect.value : 'a4';
    let w = 595.28;
    let h = 841.89;

    const pages = buildPDFPages(imageList);
    const pageDef = (pages && pageIndex >= 0 && pageIndex < pages.length) ? pages[pageIndex] : null;
    const leadItem = pageDef ? pageDef.leadItem : ((imageList.length > 0 && pageIndex >= 0 && pageIndex < imageList.length) ? imageList[pageIndex] : null);
    const placement = (pageDef && pageDef.settings) ? pageDef.settings.placement : (dom.imagePlacementSelect ? dom.imagePlacementSelect.value : 'front-back');

    if (size === 'a5') {
      w = 419.53;
      h = 595.28;
    } else if (size === 'letter') {
      w = 612;
      h = 792;
    } else if (size === 'legal') {
      w = 612;
      h = 1008;
    } else if (size === 'custom') {
      const customW = parseFloat(dom.customWidthInput ? dom.customWidthInput.value : 0);
      const customH = parseFloat(dom.customHeightInput ? dom.customHeightInput.value : 0);
      if (customW > 10 && customH > 10) {
        w = customW;
        h = customH;
      }
    } else if (size === 'original') {
      if (leadItem) {
        const dims = getItemEffectiveDimensions(leadItem);
        let dpi = 300;
        const dpiSetting = dom.printDpiSelect ? dom.printDpiSelect.value : 'auto';
        if (dpiSetting !== 'auto' && !isNaN(parseFloat(dpiSetting))) {
          dpi = parseFloat(dpiSetting);
        } else if (leadItem.detectedDpi && leadItem.detectedDpi >= 72) {
          dpi = leadItem.detectedDpi;
        }
        w = (dims.width / dpi) * 72;
        h = (dims.height / dpi) * 72;
      }
    }

    let isLandscape = false;
    if (placement === 'front-back') {
      const orient = leadItem ? (leadItem.orientation || 'auto') : 'auto';
      isLandscape = orient === 'landscape';
    } else {
      isLandscape = getEffectiveOrientation(leadItem) === 'landscape';
    }

    if (size !== 'original') {
      if (isLandscape && w < h) {
        const temp = w;
        w = h;
        h = temp;
      } else if (!isLandscape && w > h) {
        const temp = w;
        w = h;
        h = temp;
      }
    }

    return { width: w, height: h };
  }

  function getMarginPoints() {
    const marginSetting = dom.marginSelect ? dom.marginSelect.value : '0';
    if (marginSetting === 'custom') {
      const customM = parseFloat(dom.customMarginInput ? dom.customMarginInput.value : 0);
      return isNaN(customM) ? 0 : Math.max(0, customM);
    }
    return parseFloat(marginSetting) || 0;
  }

  async function updatePDFPreview() {
    if (!dom.previewCanvas || imageList.length === 0) {
      if (dom.sigOverlayBox) dom.sigOverlayBox.classList.add('hidden');
      if (dom.sigControlsRow) dom.sigControlsRow.classList.add('hidden');
      if (dom.sigOverlayImg) dom.sigOverlayImg.src = '';
      return;
    }

    // Immediately clear stale overlay and reset before redrawing
    if (dom.sigOverlayBox) dom.sigOverlayBox.classList.add('hidden');
    if (dom.sigControlsRow) dom.sigControlsRow.classList.add('hidden');
    if (dom.sigOverlayImg) dom.sigOverlayImg.src = '';

    const pages = buildPDFPages(imageList);
    const totalPages = pages.length;
    if (totalPages === 0) return;
    if (previewPageIndex >= totalPages) previewPageIndex = Math.max(0, totalPages - 1);

    const pageDef = pages[previewPageIndex];
    const settings = (pageDef && pageDef.settings) ? pageDef.settings : getLayoutSettings();

    // Synchronize form settings with this preview page
    loadSettingsIntoForm(settings);
    updateScopeUI();
    updatePreviewBadge(settings);

    if (dom.previewPageNum) dom.previewPageNum.textContent = `Page ${previewPageIndex + 1}`;
    if (dom.previewTotalPages) dom.previewTotalPages.textContent = `of ${totalPages}`;
    if (dom.previewPrevBtn) dom.previewPrevBtn.disabled = previewPageIndex === 0;
    if (dom.previewNextBtn) dom.previewNextBtn.disabled = previewPageIndex >= totalPages - 1;

    const pageDim = getPageDimensions(previewPageIndex);
    const margin = getMarginPoints();

    // Warn if configured dimensions exceed available printable area
    checkPrintableAreaWarning(settings, pageDim, margin);

    const stageEl = dom.previewStage || (dom.previewCanvas ? dom.previewCanvas.parentElement : null);
    const wrapEl = stageEl ? stageEl.closest('.i2p-preview-sheet-wrap') : null;
    const containerW = wrapEl ? wrapEl.clientWidth : (stageEl ? stageEl.clientWidth : 300);
    const availableW = Math.max(140, containerW - 32);
    const maxPreviewW = Math.min(320, availableW);
    const maxPreviewH = 420;
    const previewScale = Math.min(maxPreviewW / pageDim.width, maxPreviewH / pageDim.height, 1);

    const canvasW = Math.max(100, Math.round(pageDim.width * previewScale));
    const canvasH = Math.max(100, Math.round(pageDim.height * previewScale));

    dom.previewCanvas.width = canvasW;
    dom.previewCanvas.height = canvasH;
    dom.previewCanvas.style.maxWidth = '100%';
    dom.previewCanvas.style.height = 'auto';

    const ctx = dom.previewCanvas.getContext('2d');
    ctx.clearRect(0, 0, canvasW, canvasH);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvasW, canvasH);

    const marginX = margin * previewScale;
    const marginY = margin * previewScale;
    const usableW = Math.max(4, canvasW - marginX * 2);
    const usableH = Math.max(4, canvasH - marginY * 2);

    if (margin > 0) {
      ctx.strokeStyle = 'rgba(99, 102, 241, 0.25)';
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 3]);
      ctx.strokeRect(marginX, marginY, usableW, usableH);
      ctx.setLineDash([]);
    }

    const layoutResults = computePageLayout(previewPageIndex, imageList, pageDim, margin, settings);

    for (const card of layoutResults) {
      const imgObj = await Utils.loadImage(card.item.originalDataUrl);
      const offscreen = document.createElement('canvas');
      renderEditedImageToCanvas(offscreen, imgObj, card.item.editState);

      const cDrawX = card.draw.x * previewScale;
      const cDrawY = card.draw.y * previewScale;
      const cDrawW = card.draw.w * previewScale;
      const cDrawH = card.draw.h * previewScale;

      ctx.drawImage(offscreen, cDrawX, cDrawY, cDrawW, cDrawH);

      if (card.drawBorder) {
        const cSlotX = card.slot.x * previewScale;
        const cSlotY = card.slot.y * previewScale;
        const cSlotW = card.slot.w * previewScale;
        const cSlotH = card.slot.h * previewScale;

        ctx.strokeStyle = '#94a3b8';
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 4]);
        ctx.strokeRect(cSlotX, cSlotY, cSlotW, cSlotH);
        ctx.setLineDash([]);
      }

      if (card.role) {
        const cSlotX = card.slot.x * previewScale;
        const cSlotY = card.slot.y * previewScale;
        ctx.save();
        ctx.font = 'bold 9px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        const tagText = card.role.toUpperCase();
        const tagW = ctx.measureText(tagText).width + 8;
        const tagH = 14;
        ctx.fillStyle = (card.role === 'Front') ? 'rgba(99, 102, 241, 0.85)' : 'rgba(16, 185, 129, 0.85)';
        ctx.fillRect(cSlotX + 4, cSlotY + 4, tagW, tagH);
        ctx.fillStyle = '#ffffff';
        ctx.textBaseline = 'middle';
        ctx.fillText(tagText, cSlotX + 8, cSlotY + 4 + tagH / 2);
        ctx.restore();
      }

      offscreen.width = 1;
      offscreen.height = 1;
    }

    // Render empty back slot placeholder for 1-image front-back page
    if (layoutResults.length > 0 && layoutResults[0].emptyBackSlot) {
      const backSlot = layoutResults[0].emptyBackSlot;
      const bSlotX = backSlot.x * previewScale;
      const bSlotY = backSlot.y * previewScale;
      const bSlotW = backSlot.w * previewScale;
      const bSlotH = backSlot.h * previewScale;

      ctx.save();
      ctx.strokeStyle = 'rgba(148, 163, 184, 0.5)';
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      ctx.strokeRect(bSlotX, bSlotY, bSlotW, bSlotH);
      ctx.setLineDash([]);

      ctx.fillStyle = 'rgba(148, 163, 184, 0.08)';
      ctx.fillRect(bSlotX, bSlotY, bSlotW, bSlotH);

      ctx.fillStyle = '#94a3b8';
      ctx.font = '10px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('Back Side: Add 2nd image below', bSlotX + bSlotW / 2, bSlotY + bSlotH / 2);
      ctx.restore();
    }

    renderSignatureOverlayBox();
  }

  async function generatePDF() {
    if (imageList.length === 0) {
      Utils.showToast('Please add at least one image to create a PDF.', 'warning');
      return;
    }

    Utils.setProcessing(true);
    showProgress(5, 'Initializing PDF Document...');

    const margin = getMarginPoints();
    const pages = buildPDFPages(imageList);
    const totalPages = pages.length;

    try {
      const pdfDoc = await PDFLib.PDFDocument.create();

      const embeddedSigsCache = new Map();
      async function getEmbeddedSig(dataUrl) {
        if (!dataUrl) return null;
        if (embeddedSigsCache.has(dataUrl)) {
          return embeddedSigsCache.get(dataUrl);
        }
        const sigImgObj = await Utils.loadImage(dataUrl);
        const sigCanvas = document.createElement('canvas');
        sigCanvas.width = sigImgObj.naturalWidth;
        sigCanvas.height = sigImgObj.naturalHeight;
        const sCtx = sigCanvas.getContext('2d');
        sCtx.drawImage(sigImgObj, 0, 0);

        const sigPngBlob = await Utils.canvasToBlob(sigCanvas, 'image/png');
        const sigBytes = await sigPngBlob.arrayBuffer();
        const emb = await pdfDoc.embedPng(sigBytes);
        sigCanvas.width = 1;
        sigCanvas.height = 1;

        embeddedSigsCache.set(dataUrl, emb);
        return emb;
      }

      for (let p = 0; p < totalPages; p++) {
        const progressPct = Math.round(10 + ((p + 1) / totalPages) * 78);
        showProgress(progressPct, `Rendering Page ${p + 1} of ${totalPages}...`);

        const pageDef = pages[p];
        const pageDim = getPageDimensions(p);
        const pageWidth = pageDim.width;
        const pageHeight = pageDim.height;

        const page = pdfDoc.addPage([pageWidth, pageHeight]);

        const layoutResults = computePageLayout(p, imageList, pageDim, margin, pageDef.settings);

        for (const card of layoutResults) {
          const item = card.item;
          const imgObj = await Utils.loadImage(item.originalDataUrl);
          const renderCanvas = document.createElement('canvas');
          renderEditedImageToCanvas(renderCanvas, imgObj, item.editState);

          if (renderCanvas.width > 4096 || renderCanvas.height > 4096) {
            const maxDim = 3840;
            const scale = Math.min(maxDim / renderCanvas.width, maxDim / renderCanvas.height);
            const scaledCanvas = document.createElement('canvas');
            scaledCanvas.width = Math.round(renderCanvas.width * scale);
            scaledCanvas.height = Math.round(renderCanvas.height * scale);
            const sCtx = scaledCanvas.getContext('2d');
            sCtx.drawImage(renderCanvas, 0, 0, scaledCanvas.width, scaledCanvas.height);
            renderCanvas.width = scaledCanvas.width;
            renderCanvas.height = scaledCanvas.height;
            const rCtx = renderCanvas.getContext('2d');
            rCtx.drawImage(scaledCanvas, 0, 0);
            scaledCanvas.width = 1;
            scaledCanvas.height = 1;
          }

          const hasAlpha = item.file.type === 'image/png' || item.file.type === 'image/webp';
          let embeddedImage = null;

          if (hasAlpha) {
            const pngBlob = await Utils.canvasToBlob(renderCanvas, 'image/png');
            const pngBytes = await pngBlob.arrayBuffer();
            embeddedImage = await pdfDoc.embedPng(pngBytes);
          } else {
            const jpgBlob = await Utils.canvasToBlob(renderCanvas, 'image/jpeg', 0.94);
            const jpgBytes = await jpgBlob.arrayBuffer();
            embeddedImage = await pdfDoc.embedJpg(jpgBytes);
          }

          const pdfY = pageHeight - (card.draw.y + card.draw.h);

          page.drawImage(embeddedImage, {
            x: card.draw.x,
            y: pdfY,
            width: card.draw.w,
            height: card.draw.h
          });

          // Draw cutting guide border
          if (card.drawBorder) {
            const borderPdfY = pageHeight - (card.slot.y + card.slot.h);
            page.drawRectangle({
              x: card.slot.x,
              y: borderPdfY,
              width: card.slot.w,
              height: card.slot.h,
              borderColor: PDFLib.rgb(0.7, 0.7, 0.7),
              borderWidth: 0.5,
              borderDashArray: [3, 3]
            });
          }

          renderCanvas.width = 1;
          renderCanvas.height = 1;
        }

        // Draw page-specific signature if assigned to this page
        const primaryItem = pageDef.leadItem;
        if (primaryItem && primaryItem.signature && primaryItem.signature.active && primaryItem.signature.dataUrl) {
          const sig = primaryItem.signature;
          const embeddedSig = await getEmbeddedSig(sig.dataUrl);
          if (embeddedSig) {
            const sigPdfW = pageWidth * sig.relW;
            const sigPdfH = sigPdfW / (sig.aspectRatio || 1);
            const sigPdfX = pageWidth * sig.relX;
            const sigPdfY = pageHeight - (pageHeight * sig.relY) - sigPdfH;

            page.drawImage(embeddedSig, {
              x: Math.max(0, sigPdfX),
              y: Math.max(0, sigPdfY),
              width: sigPdfW,
              height: sigPdfH
            });
          }
        }
      }

      showProgress(92, 'Packaging final PDF file...');
      const pdfBytes = await pdfDoc.save();
      generatedPdfBlob = new Blob([pdfBytes], { type: 'application/pdf' });

      showProgress(100, 'PDF Ready!');
      setTimeout(hideProgress, 600);

      if (dom.pdfConfigCard) dom.pdfConfigCard.classList.add('hidden');
      if (dom.pdfReadyCard) dom.pdfReadyCard.classList.remove('hidden');

      const fileSizeStr = Utils.formatBytes(generatedPdfBlob.size);
      const readyMeta = document.getElementById('i2p-ready-meta');
      if (readyMeta) {
        const hasAnySig = imageList.some(it => it.signature && it.signature.active);
        readyMeta.textContent = `${totalPages} Page${totalPages !== 1 ? 's' : ''} • ${fileSizeStr} ${hasAnySig ? '• With Signature' : ''}`;
      }

      Utils.showToast(`Successfully created PDF with ${totalPages} page(s)!`, 'success');
    } catch (err) {
      console.error(err);
      Utils.showToast('PDF generation failed: ' + err.message, 'error');
      hideProgress();
    } finally {
      Utils.setProcessing(false);
    }
  }

  function downloadPDF() {
    if (!generatedPdfBlob) {
      Utils.showToast('No PDF generated yet.', 'warning');
      return;
    }
    const filename = `FileForge-Image-to-PDF-${Date.now().toString().slice(-4)}.pdf`;
    Utils.downloadBlob(generatedPdfBlob, filename);
  }

  function resetTool() {
    imageList = [];
    currentEditingIndex = -1;
    generatedPdfBlob = null;
    editorImgObj = null;
    editorCropActive = false;
    previewPageIndex = 0;
    layoutScope = 'page';
    isUpdatingFormFromPage = false;
    globalLayoutSettings = null;

    signatureRawImage = null;
    signatureDataUrl = null;
    signaturePlacement = {
      active: false,
      applyToAll: false,
      relX: 0.65,
      relY: 0.75,
      relW: 0.25,
      aspectRatio: 1,
      rotation: 0
    };
    if (dom.sigApplyScopeSelect) dom.sigApplyScopeSelect.value = 'current';
    updateScopeUI();

    if (dom.emptyState) dom.emptyState.classList.remove('hidden');
    if (dom.workspace) dom.workspace.classList.add('hidden');
    if (dom.pdfReadyCard) dom.pdfReadyCard.classList.add('hidden');
    if (dom.pdfConfigCard) dom.pdfConfigCard.classList.remove('hidden');
    if (dom.editorModal) dom.editorModal.classList.add('hidden');
    if (dom.signatureModal) dom.signatureModal.classList.add('hidden');
    if (dom.sigOverlayBox) dom.sigOverlayBox.classList.add('hidden');
    if (dom.sigControlsRow) dom.sigControlsRow.classList.add('hidden');
    if (dom.sigOverlayImg) dom.sigOverlayImg.src = '';
    updateSigPosBtnStates(null);

    if (dom.addSignatureBtn) dom.addSignatureBtn.innerHTML = `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 14px; height: 14px; margin-right: 4px;"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><path d="M10.5 14.5c.8-1.2 2-1.5 2.5-.5.5 1-1.5 2.5-.5 3.5 1 1 2.5 0 3-1.5"></path></svg>
      Add Signature
    `;

    if (dom.imageListContainer) dom.imageListContainer.innerHTML = '';
    if (dom.fileInput) dom.fileInput.value = '';
    if (dom.addMoreInput) dom.addMoreInput.value = '';
    if (dom.sigFileInput) dom.sigFileInput.value = '';

    if (dom.generateBtn) {
      dom.generateBtn.classList.remove('hidden');
      dom.generateBtn.disabled = true;
    }

    if (dom.previewCanvas) {
      dom.previewCanvas.width = 1;
      dom.previewCanvas.height = 1;
    }
    if (dom.editorCanvas) {
      dom.editorCanvas.width = 1;
      dom.editorCanvas.height = 1;
    }
    if (dom.sigPreviewCanvas) {
      dom.sigPreviewCanvas.width = 1;
      dom.sigPreviewCanvas.height = 1;
    }

    syncPlacementPanels();
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
    setPreset,
    reset: resetTool,
    closeEditor,
    closeSignatureModal,
    getGeneratedBlob: () => generatedPdfBlob,
    getImageList: () => imageList
  };
})();

window.ImageToPDF = ImageToPDF;
