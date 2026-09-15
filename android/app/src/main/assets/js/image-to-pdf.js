/**
 * FileForge - Tool 51: Image to PDF (with Full-Featured Image Editor & PDF Preview)
 * Pure Client-Side Implementation with zero server upload.
 */

const ImageToPDF = (() => {
  // State
  let imageList = []; 
  // Each item: { id, file, name, originalDataUrl, previewDataUrl, width, height, originalWidth, originalHeight, editState }
  // editState: { crop: {x,y,w,h} | null, rotate: 0, flipH: false, flipV: false, brightness: 100, contrast: 100, saturate: 100, blur: 0, grayscale: 0, filter: 'original' }
  
  let currentEditingIndex = -1;
  let generatedPdfBlob = null;
  let currentPreset = 'general'; // 'general' | 'jpg-to-pdf' | 'png-to-pdf'
  let previewPageIndex = 0;

  // DOM Elements
  let dom = {};

  // Editor State
  let editorCropActive = false;
  let editorCropRatio = 'free'; // 'free' | '1:1' | '4:3' | '16:9' | 'a4' | 'custom'
  let editorCropRect = { x: 0, y: 0, w: 100, h: 100 }; // in canvas space
  let editorTempState = {};
  let isDraggingCrop = false;
  let cropDragMode = null; // 'move' | 'nw' | 'ne' | 'se' | 'sw' | 'n' | 's' | 'e' | 'w'
  let cropDragStart = { x: 0, y: 0, rectX: 0, rectY: 0, rectW: 0, rectH: 0 };
  let editorImgObj = null;

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

      // Settings
      pageSizeSelect: document.getElementById('i2p-page-size'),
      customSizeRow: document.getElementById('i2p-custom-size-row'),
      customWidthInput: document.getElementById('i2p-custom-width'),
      customHeightInput: document.getElementById('i2p-custom-height'),
      orientationSelect: document.getElementById('i2p-orientation'),
      marginSelect: document.getElementById('i2p-margin'),
      customMarginRow: document.getElementById('i2p-custom-margin-row'),
      customMarginInput: document.getElementById('i2p-custom-margin'),
      imagePlacementSelect: document.getElementById('i2p-image-placement'),

      // Actions & Progress
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

      // PDF Preview
      previewContainer: document.getElementById('i2p-pdf-preview-container'),
      previewCanvas: document.getElementById('i2p-preview-canvas'),
      previewPageNum: document.getElementById('i2p-preview-page-num'),
      previewPrevBtn: document.getElementById('i2p-preview-prev-btn'),
      previewNextBtn: document.getElementById('i2p-preview-next-btn'),
      previewTotalPages: document.getElementById('i2p-preview-total-pages'),

      // Editor Modal
      editorModal: document.getElementById('i2p-editor-modal'),
      editorCloseBtn: document.getElementById('i2p-editor-close-btn'),
      editorSaveBtn: document.getElementById('i2p-editor-save-btn'),
      editorCancelBtn: document.getElementById('i2p-editor-cancel-btn'),
      editorCanvas: document.getElementById('i2p-editor-canvas'),
      editorFilename: document.getElementById('i2p-editor-filename'),
      editorDimsBadge: document.getElementById('i2p-editor-dims'),

      // Editor Controls - Crop
      cropToggleBtn: document.getElementById('i2p-crop-toggle-btn'),
      cropControlsPanel: document.getElementById('i2p-crop-controls-panel'),
      cropRatioBtns: document.querySelectorAll('.i2p-crop-ratio-btn'),
      applyCropBtn: document.getElementById('i2p-apply-crop-btn'),
      cancelCropBtn: document.getElementById('i2p-cancel-crop-btn'),
      resetCropBtn: document.getElementById('i2p-reset-crop-btn'),

      // Editor Controls - Rotate & Flip
      rotateCwBtn: document.getElementById('i2p-rotate-cw'),
      rotateCcwBtn: document.getElementById('i2p-rotate-ccw'),
      flipHBtn: document.getElementById('i2p-flip-h'),
      flipVBtn: document.getElementById('i2p-flip-v'),

      // Editor Controls - Adjustments
      brightnessSlider: document.getElementById('i2p-adj-brightness'),
      brightnessVal: document.getElementById('i2p-adj-brightness-val'),
      contrastSlider: document.getElementById('i2p-adj-contrast'),
      contrastVal: document.getElementById('i2p-adj-contrast-val'),
      saturateSlider: document.getElementById('i2p-adj-saturate'),
      saturateVal: document.getElementById('i2p-adj-saturate-val'),
      blurSlider: document.getElementById('i2p-adj-blur'),
      blurVal: document.getElementById('i2p-adj-blur-val'),
      grayscaleSlider: document.getElementById('i2p-adj-grayscale'),
      grayscaleVal: document.getElementById('i2p-adj-grayscale-val'),
      resetAdjBtn: document.getElementById('i2p-reset-adj-btn'),

      // Editor Controls - Filters
      filterChips: document.querySelectorAll('.i2p-filter-chip')
    };

    if (!dom.container) return;

    bindEvents();
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
    // Dropzone & File Pickers
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

    // Settings changes update Live PDF Preview
    if (dom.pageSizeSelect) {
      dom.pageSizeSelect.addEventListener('change', () => {
        if (dom.customSizeRow) {
          dom.customSizeRow.classList.toggle('hidden', dom.pageSizeSelect.value !== 'custom');
        }
        updatePDFPreview();
      });
    }

    if (dom.customWidthInput) dom.customWidthInput.addEventListener('input', updatePDFPreview);
    if (dom.customHeightInput) dom.customHeightInput.addEventListener('input', updatePDFPreview);

    if (dom.orientationSelect) dom.orientationSelect.addEventListener('change', updatePDFPreview);

    if (dom.marginSelect) {
      dom.marginSelect.addEventListener('change', () => {
        if (dom.customMarginRow) {
          dom.customMarginRow.classList.toggle('hidden', dom.marginSelect.value !== 'custom');
        }
        updatePDFPreview();
      });
    }

    if (dom.customMarginInput) dom.customMarginInput.addEventListener('input', updatePDFPreview);
    if (dom.imagePlacementSelect) dom.imagePlacementSelect.addEventListener('change', updatePDFPreview);

    // Main Actions
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

    // PDF Preview Page Navigation
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
        if (previewPageIndex < imageList.length - 1) {
          previewPageIndex++;
          updatePDFPreview();
        }
      });
    }

    // Editor Modal Events
    bindEditorEvents();
  }

  function bindEditorEvents() {
    if (dom.editorCloseBtn) dom.editorCloseBtn.addEventListener('click', closeEditor);
    if (dom.editorCancelBtn) dom.editorCancelBtn.addEventListener('click', closeEditor);
    if (dom.editorSaveBtn) dom.editorSaveBtn.addEventListener('click', saveEditorChanges);

    // Crop Toggle & Presets
    if (dom.cropToggleBtn) {
      dom.cropToggleBtn.addEventListener('click', () => {
        editorCropActive = !editorCropActive;
        dom.cropToggleBtn.classList.toggle('active', editorCropActive);
        if (dom.cropControlsPanel) dom.cropControlsPanel.classList.toggle('hidden', !editorCropActive);
        if (editorCropActive) {
          initCropRect();
        }
        drawEditorCanvas();
      });
    }

    if (dom.cropRatioBtns) {
      dom.cropRatioBtns.forEach(btn => {
        btn.addEventListener('click', () => {
          editorCropRatio = btn.dataset.ratio;
          dom.cropRatioBtns.forEach(b => b.classList.toggle('active', b === btn));
          adjustCropRectToRatio();
          drawEditorCanvas();
        });
      });
    }

    if (dom.applyCropBtn) {
      dom.applyCropBtn.addEventListener('click', applyCropToTempState);
    }
    if (dom.cancelCropBtn) {
      dom.cancelCropBtn.addEventListener('click', () => {
        editorCropActive = false;
        if (dom.cropToggleBtn) dom.cropToggleBtn.classList.remove('active');
        if (dom.cropControlsPanel) dom.cropControlsPanel.classList.add('hidden');
        drawEditorCanvas();
      });
    }
    if (dom.resetCropBtn) {
      dom.resetCropBtn.addEventListener('click', () => {
        editorTempState.crop = null;
        editorCropActive = false;
        if (dom.cropToggleBtn) dom.cropToggleBtn.classList.remove('active');
        if (dom.cropControlsPanel) dom.cropControlsPanel.classList.add('hidden');
        drawEditorCanvas();
        Utils.showToast('Crop reset to full image.', 'info');
      });
    }

    // Rotate & Flip
    if (dom.rotateCwBtn) {
      dom.rotateCwBtn.addEventListener('click', () => {
        editorTempState.rotate = (editorTempState.rotate + 90) % 360;
        drawEditorCanvas();
      });
    }
    if (dom.rotateCcwBtn) {
      dom.rotateCcwBtn.addEventListener('click', () => {
        editorTempState.rotate = (editorTempState.rotate - 90 + 360) % 360;
        drawEditorCanvas();
      });
    }
    if (dom.flipHBtn) {
      dom.flipHBtn.addEventListener('click', () => {
        editorTempState.flipH = !editorTempState.flipH;
        dom.flipHBtn.classList.toggle('active', editorTempState.flipH);
        drawEditorCanvas();
      });
    }
    if (dom.flipVBtn) {
      dom.flipVBtn.addEventListener('click', () => {
        editorTempState.flipV = !editorTempState.flipV;
        dom.flipVBtn.classList.toggle('active', editorTempState.flipV);
        drawEditorCanvas();
      });
    }

    // Adjustment Sliders
    const setupSlider = (slider, valEl, prop, suffix = '%') => {
      if (!slider) return;
      slider.addEventListener('input', (e) => {
        const val = parseInt(e.target.value, 10);
        if (valEl) valEl.textContent = val + suffix;
        editorTempState[prop] = val;
        drawEditorCanvas();
      });
    };

    setupSlider(dom.brightnessSlider, dom.brightnessVal, 'brightness', '%');
    setupSlider(dom.contrastSlider, dom.contrastVal, 'contrast', '%');
    setupSlider(dom.saturateSlider, dom.saturateVal, 'saturate', '%');
    setupSlider(dom.blurSlider, dom.blurVal, 'blur', 'px');
    setupSlider(dom.grayscaleSlider, dom.grayscaleVal, 'grayscale', '%');

    if (dom.resetAdjBtn) {
      dom.resetAdjBtn.addEventListener('click', resetEditorAdjustments);
    }

    // Filters
    if (dom.filterChips) {
      dom.filterChips.forEach(chip => {
        chip.addEventListener('click', () => {
          editorTempState.filter = chip.dataset.filter;
          dom.filterChips.forEach(c => c.classList.toggle('active', c === chip));
          drawEditorCanvas();
        });
      });
    }

    // Pointer events for interactive cropping on Editor Canvas
    if (dom.editorCanvas) {
      dom.editorCanvas.addEventListener('mousedown', onCropPointerDown);
      window.addEventListener('mousemove', onCropPointerMove);
      window.addEventListener('mouseup', onCropPointerUp);

      dom.editorCanvas.addEventListener('touchstart', onCropTouchStart, { passive: false });
      window.addEventListener('touchmove', onCropTouchMove, { passive: false });
      window.addEventListener('touchend', onCropPointerUp);
    }
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
        else invalid.push({ name: f.name, ext: ext || f.type, expected: 'JPG/JPEG' });
      } else if (currentPreset === 'png-to-pdf') {
        if (isPng) valid.push(f);
        else invalid.push({ name: f.name, ext: ext || f.type, expected: 'PNG' });
      } else {
        if (isImage) valid.push(f);
        else invalid.push({ name: f.name, ext: ext || f.type, expected: 'Image (JPG, PNG, WebP)' });
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
          editState: {
            crop: null,
            rotate: 0,
            flipH: false,
            flipV: false,
            brightness: 100,
            contrast: 100,
            saturate: 100,
            blur: 0,
            grayscale: 0,
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
      updatePDFPreview();
      Utils.showToast(`Added ${valid.length} image(s). Drag to reorder, click Edit to adjust, or generate PDF!`, 'success');
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

    if (dom.imageCountBadge) {
      dom.imageCountBadge.textContent = `${imageList.length} Page${imageList.length !== 1 ? 's' : ''}`;
    }

    if (imageList.length === 0) {
      resetTool();
      return;
    }

    imageList.forEach((item, index) => {
      const card = document.createElement('div');
      card.className = 'i2p-item-card';
      card.draggable = true;
      card.dataset.index = index;

      const hasEdits = item.editState.crop !== null ||
                       item.editState.rotate !== 0 ||
                       item.editState.flipH ||
                       item.editState.flipV ||
                       item.editState.brightness !== 100 ||
                       item.editState.contrast !== 100 ||
                       item.editState.saturate !== 100 ||
                       item.editState.blur !== 0 ||
                       item.editState.grayscale !== 0 ||
                       item.editState.filter !== 'original';

      card.innerHTML = `
        <div class="i2p-drag-handle" title="Drag to reorder page">
          <svg viewBox="0 0 20 20" fill="currentColor">
            <path d="M7 2a2 2 0 100 4 2 2 0 000-4zm6 0a2 2 0 100 4 2 2 0 000-4zm-6 6a2 2 0 100 4 2 2 0 000-4zm6 0a2 2 0 100 4 2 2 0 000-4zm-6 6a2 2 0 100 4 2 2 0 000-4zm6 0a2 2 0 100 4 2 2 0 000-4z"/>
          </svg>
        </div>
        <div class="i2p-item-preview">
          <img src="${item.previewDataUrl}" alt="Page ${index + 1}">
          <span class="i2p-page-badge">P${index + 1}</span>
          ${hasEdits ? '<span class="i2p-edited-tag" title="Edited">Edited</span>' : ''}
        </div>
        <div class="i2p-item-info">
          <p class="i2p-item-name" title="${Utils.escapeHtml(item.name)}">${Utils.escapeHtml(item.name)}</p>
          <span class="i2p-item-dims">${item.width} × ${item.height} px</span>
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
      `;

      // Drag and Drop Events
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

      // Actions
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
        if (previewPageIndex >= imageList.length) {
          previewPageIndex = Math.max(0, imageList.length - 1);
        }
        renderList();
        updatePDFPreview();
      });

      dom.imageListContainer.appendChild(card);
    });

    if (dom.generateBtn) dom.generateBtn.disabled = imageList.length === 0;
  }

  // =========================================================================
  // IMAGE EDITOR IMPLEMENTATION (Crop, Rotate, Flip, Adjustments, Filters)
  // =========================================================================

  async function openEditor(index) {
    if (index < 0 || index >= imageList.length) return;
    currentEditingIndex = index;
    const item = imageList[index];

    // Deep clone current editState into temp state
    editorTempState = JSON.parse(JSON.stringify(item.editState));
    editorCropActive = false;
    editorCropRatio = 'free';

    if (dom.editorFilename) dom.editorFilename.textContent = item.name;
    if (dom.editorDimsBadge) dom.editorDimsBadge.textContent = `${item.width} × ${item.height} px`;

    // Load original image into memory
    editorImgObj = await Utils.loadImage(item.originalDataUrl);

    // Sync UI controls with current values
    syncEditorControlsUI();

    // Show Editor Modal
    if (dom.editorModal) dom.editorModal.classList.remove('hidden');

    drawEditorCanvas();
  }

  function syncEditorControlsUI() {
    if (dom.cropToggleBtn) dom.cropToggleBtn.classList.remove('active');
    if (dom.cropControlsPanel) dom.cropControlsPanel.classList.add('hidden');
    if (dom.cropRatioBtns) {
      dom.cropRatioBtns.forEach(btn => btn.classList.toggle('active', btn.dataset.ratio === 'free'));
    }

    if (dom.flipHBtn) dom.flipHBtn.classList.toggle('active', !!editorTempState.flipH);
    if (dom.flipVBtn) dom.flipVBtn.classList.toggle('active', !!editorTempState.flipV);

    if (dom.brightnessSlider) dom.brightnessSlider.value = editorTempState.brightness;
    if (dom.brightnessVal) dom.brightnessVal.textContent = editorTempState.brightness + '%';

    if (dom.contrastSlider) dom.contrastSlider.value = editorTempState.contrast;
    if (dom.contrastVal) dom.contrastVal.textContent = editorTempState.contrast + '%';

    if (dom.saturateSlider) dom.saturateSlider.value = editorTempState.saturate;
    if (dom.saturateVal) dom.saturateVal.textContent = editorTempState.saturate + '%';

    if (dom.blurSlider) dom.blurSlider.value = editorTempState.blur;
    if (dom.blurVal) dom.blurVal.textContent = editorTempState.blur + 'px';

    if (dom.grayscaleSlider) dom.grayscaleSlider.value = editorTempState.grayscale;
    if (dom.grayscaleVal) dom.grayscaleVal.textContent = editorTempState.grayscale + '%';

    if (dom.filterChips) {
      dom.filterChips.forEach(chip => chip.classList.toggle('active', chip.dataset.filter === (editorTempState.filter || 'original')));
    }
  }

  function resetEditorAdjustments() {
    editorTempState.brightness = 100;
    editorTempState.contrast = 100;
    editorTempState.saturate = 100;
    editorTempState.blur = 0;
    editorTempState.grayscale = 0;
    syncEditorControlsUI();
    drawEditorCanvas();
  }

  function closeEditor() {
    if (dom.editorModal) dom.editorModal.classList.add('hidden');
    currentEditingIndex = -1;
    editorImgObj = null;
    editorCropActive = false;
  }

  // Render edited image onto an arbitrary canvas with given dimensions
  function renderEditedImageToCanvas(canvas, imgObj, editState, targetWidth = null, targetHeight = null) {
    const isRotated90 = (editState.rotate === 90 || editState.rotate === 270);
    
    // Determine source crop bounds on original unrotated image
    let sx = 0, sy = 0, sw = imgObj.naturalWidth, sh = imgObj.naturalHeight;
    if (editState.crop) {
      sx = editState.crop.x;
      sy = editState.crop.y;
      sw = editState.crop.w;
      sh = editState.crop.h;
    }

    const unrotatedW = sw;
    const unrotatedH = sh;
    const finalW = isRotated90 ? unrotatedH : unrotatedW;
    const finalH = isRotated90 ? unrotatedW : unrotatedH;

    canvas.width = targetWidth || finalW;
    canvas.height = targetHeight || finalH;

    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Apply Filter String (Brightness, Contrast, Saturation, Blur, Grayscale, Filter Presets)
    let filterParts = [];
    if (editState.brightness !== 100) filterParts.push(`brightness(${editState.brightness}%)`);
    if (editState.contrast !== 100) filterParts.push(`contrast(${editState.contrast}%)`);
    if (editState.saturate !== 100) filterParts.push(`saturate(${editState.saturate}%)`);
    if (editState.blur > 0) filterParts.push(`blur(${editState.blur}px)`);
    if (editState.grayscale > 0) filterParts.push(`grayscale(${editState.grayscale}%)`);

    // Presets
    if (editState.filter === 'grayscale') filterParts.push('grayscale(100%)');
    else if (editState.filter === 'warm') filterParts.push('sepia(35%) saturate(140%)');
    else if (editState.filter === 'cool') filterParts.push('hue-rotate(180deg) saturate(110%)');
    else if (editState.filter === 'high-contrast') filterParts.push('contrast(160%) brightness(105%)');
    else if (editState.filter === 'soft') filterParts.push('brightness(108%) contrast(90%)');

    ctx.filter = filterParts.length > 0 ? filterParts.join(' ') : 'none';

    // Transformations (Rotation & Flip)
    ctx.save();
    ctx.translate(canvas.width / 2, canvas.height / 2);

    if (editState.rotate) {
      ctx.rotate((editState.rotate * Math.PI) / 180);
    }
    const scaleX = editState.flipH ? -1 : 1;
    const scaleY = editState.flipV ? -1 : 1;
    ctx.scale(scaleX, scaleY);

    // Scale to fit canvas if resized
    const drawW = isRotated90 ? canvas.height : canvas.width;
    const drawH = isRotated90 ? canvas.width : canvas.height;

    ctx.drawImage(imgObj, sx, sy, sw, sh, -drawW / 2, -drawH / 2, drawW, drawH);
    ctx.restore();
    ctx.filter = 'none';
  }

  function drawEditorCanvas() {
    if (!dom.editorCanvas || !editorImgObj) return;

    // Display scale calculation for modal preview
    const maxDisplayW = Math.min(650, window.innerWidth - 60);
    const maxDisplayH = Math.min(480, window.innerHeight * 0.55);

    const isRotated90 = (editorTempState.rotate === 90 || editorTempState.rotate === 270);
    let baseW = editorTempState.crop ? editorTempState.crop.w : editorImgObj.naturalWidth;
    let baseH = editorTempState.crop ? editorTempState.crop.h : editorImgObj.naturalHeight;
    let dispW = isRotated90 ? baseH : baseW;
    let dispH = isRotated90 ? baseW : baseH;

    const scale = Math.min(maxDisplayW / dispW, maxDisplayH / dispH, 1);
    const canvasW = Math.round(dispW * scale);
    const canvasH = Math.round(dispH * scale);

    renderEditedImageToCanvas(dom.editorCanvas, editorImgObj, editorTempState, canvasW, canvasH);

    // If Crop Mode is Active, overlay the crop box and handles
    if (editorCropActive) {
      drawCropOverlay(dom.editorCanvas);
    }
  }

  function initCropRect() {
    if (!dom.editorCanvas) return;
    const cw = dom.editorCanvas.width;
    const ch = dom.editorCanvas.height;
    editorCropRect = {
      x: Math.round(cw * 0.1),
      y: Math.round(ch * 0.1),
      w: Math.round(cw * 0.8),
      h: Math.round(ch * 0.8)
    };
    adjustCropRectToRatio();
  }

  function adjustCropRectToRatio() {
    if (editorCropRatio === 'free') return;
    let targetRatio = 1;
    if (editorCropRatio === '1:1') targetRatio = 1;
    else if (editorCropRatio === '4:3') targetRatio = 4 / 3;
    else if (editorCropRatio === '16:9') targetRatio = 16 / 9;
    else if (editorCropRatio === 'a4') targetRatio = 210 / 297;

    const currentRatio = editorCropRect.w / editorCropRect.h;
    if (currentRatio > targetRatio) {
      editorCropRect.w = editorCropRect.h * targetRatio;
    } else {
      editorCropRect.h = editorCropRect.w / targetRatio;
    }
  }

  function drawCropOverlay(canvas) {
    const ctx = canvas.getContext('2d');
    const cw = canvas.width;
    const ch = canvas.height;
    const r = editorCropRect;

    // Dim background outside crop rect
    ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
    ctx.fillRect(0, 0, cw, r.y);
    ctx.fillRect(0, r.y + r.h, cw, ch - (r.y + r.h));
    ctx.fillRect(0, r.y, r.x, r.h);
    ctx.fillRect(r.x + r.w, r.y, cw - (r.x + r.w), r.h);

    // Crop border
    ctx.strokeStyle = '#6366f1';
    ctx.lineWidth = 2;
    ctx.strokeRect(r.x, r.y, r.w, r.h);

    // Rule of thirds grid
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    // Vertical lines
    ctx.moveTo(r.x + r.w / 3, r.y);
    ctx.lineTo(r.x + r.w / 3, r.y + r.h);
    ctx.moveTo(r.x + (r.w * 2) / 3, r.y);
    ctx.lineTo(r.x + (r.w * 2) / 3, r.y + r.h);
    // Horizontal lines
    ctx.moveTo(r.x, r.y + r.h / 3);
    ctx.lineTo(r.x + r.w, r.y + r.h / 3);
    ctx.moveTo(r.x, r.y + (r.h * 2) / 3);
    ctx.lineTo(r.x + r.w, r.y + (r.h * 2) / 3);
    ctx.stroke();
    ctx.setLineDash([]);

    // Corner & Edge Handles
    const handleSize = 10;
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#6366f1';
    ctx.lineWidth = 2;

    const handles = [
      { x: r.x, y: r.y }, // NW
      { x: r.x + r.w, y: r.y }, // NE
      { x: r.x + r.w, y: r.y + r.h }, // SE
      { x: r.x, y: r.y + r.h }, // SW
      { x: r.x + r.w / 2, y: r.y }, // N
      { x: r.x + r.w, y: r.y + r.h / 2 }, // E
      { x: r.x + r.w / 2, y: r.y + r.h }, // S
      { x: r.x, y: r.y + r.h / 2 } // W
    ];

    handles.forEach(h => {
      ctx.beginPath();
      ctx.arc(h.x, h.y, handleSize / 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    });
  }

  function getCropHandleAt(x, y) {
    const r = editorCropRect;
    const pad = 14;

    if (Math.hypot(x - r.x, y - r.y) < pad) return 'nw';
    if (Math.hypot(x - (r.x + r.w), y - r.y) < pad) return 'ne';
    if (Math.hypot(x - (r.x + r.w), y - (r.y + r.h)) < pad) return 'se';
    if (Math.hypot(x - r.x, y - (r.y + r.h)) < pad) return 'sw';

    if (Math.abs(y - r.y) < pad && x >= r.x && x <= r.x + r.w) return 'n';
    if (Math.abs(x - (r.x + r.w)) < pad && y >= r.y && y <= r.y + r.h) return 'e';
    if (Math.abs(y - (r.y + r.h)) < pad && x >= r.x && x <= r.x + r.w) return 's';
    if (Math.abs(x - r.x) < pad && y >= r.y && y <= r.y + r.h) return 'w';

    if (x > r.x && x < r.x + r.w && y > r.y && y < r.y + r.h) return 'move';

    return null;
  }

  function onCropPointerDown(e) {
    if (!editorCropActive || !dom.editorCanvas) return;
    const rect = dom.editorCanvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    cropDragMode = getCropHandleAt(x, y);
    if (cropDragMode) {
      isDraggingCrop = true;
      cropDragStart = {
        x,
        y,
        rectX: editorCropRect.x,
        rectY: editorCropRect.y,
        rectW: editorCropRect.w,
        rectH: editorCropRect.h
      };
    }
  }

  function onCropTouchStart(e) {
    if (!editorCropActive || !dom.editorCanvas || e.touches.length === 0) return;
    const touch = e.touches[0];
    const rect = dom.editorCanvas.getBoundingClientRect();
    const x = touch.clientX - rect.left;
    const y = touch.clientY - rect.top;

    cropDragMode = getCropHandleAt(x, y);
    if (cropDragMode) {
      e.preventDefault();
      isDraggingCrop = true;
      cropDragStart = {
        x,
        y,
        rectX: editorCropRect.x,
        rectY: editorCropRect.y,
        rectW: editorCropRect.w,
        rectH: editorCropRect.h
      };
    }
  }

  function onCropPointerMove(e) {
    if (!editorCropActive || !isDraggingCrop || !dom.editorCanvas) return;
    const rect = dom.editorCanvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    updateCropDrag(x, y);
  }

  function onCropTouchMove(e) {
    if (!editorCropActive || !isDraggingCrop || !dom.editorCanvas || e.touches.length === 0) return;
    e.preventDefault();
    const touch = e.touches[0];
    const rect = dom.editorCanvas.getBoundingClientRect();
    const x = touch.clientX - rect.left;
    const y = touch.clientY - rect.top;
    updateCropDrag(x, y);
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
      newX = cropDragStart.rectX + (cropDragStart.rectW - newW);
      newY = cropDragStart.rectY + (cropDragStart.rectH - newH);
    } else if (cropDragMode === 'ne') {
      newW = Math.max(minSize, Math.min(cw - newX, cropDragStart.rectW + dx));
      newH = Math.max(minSize, cropDragStart.rectH - dy);
      newY = cropDragStart.rectY + (cropDragStart.rectH - newH);
    } else if (cropDragMode === 'sw') {
      newW = Math.max(minSize, cropDragStart.rectW - dx);
      newH = Math.max(minSize, cropDragStart.rectH - dy);
      newX = cropDragStart.rectX + (cropDragStart.rectW - newW);
    } else if (cropDragMode === 'e') {
      newW = Math.max(minSize, Math.min(cw - newX, cropDragStart.rectW + dx));
    } else if (cropDragMode === 's') {
      newH = Math.max(minSize, Math.min(ch - newY, cropDragStart.rectH + dy));
    } else if (cropDragMode === 'w') {
      newW = Math.max(minSize, cropDragStart.rectW - dx);
      newX = cropDragStart.rectX + (cropDragStart.rectW - newW);
    } else if (cropDragMode === 'n') {
      newH = Math.max(minSize, cropDragStart.rectH - dy);
      newY = cropDragStart.rectY + (cropDragStart.rectH - newH);
    }

    editorCropRect = { x: newX, y: newY, w: newW, h: newH };
    adjustCropRectToRatio();
    drawEditorCanvas();
  }

  function onCropPointerUp() {
    isDraggingCrop = false;
    cropDragMode = null;
  }

  function applyCropToTempState() {
    if (!dom.editorCanvas || !editorImgObj) return;

    // Convert canvas crop rectangle coordinates back to original unrotated image coordinates
    const cw = dom.editorCanvas.width;
    const ch = dom.editorCanvas.height;
    const isRotated90 = (editorTempState.rotate === 90 || editorTempState.rotate === 270);
    
    let baseW = editorImgObj.naturalWidth;
    let baseH = editorImgObj.naturalHeight;
    let dispW = isRotated90 ? baseH : baseW;
    let dispH = isRotated90 ? baseW : baseH;

    const scaleX = dispW / cw;
    const scaleY = dispH / ch;

    const unrotatedCropX = Math.round(editorCropRect.x * scaleX);
    const unrotatedCropY = Math.round(editorCropRect.y * scaleY);
    const unrotatedCropW = Math.round(editorCropRect.w * scaleX);
    const unrotatedCropH = Math.round(editorCropRect.h * scaleY);

    editorTempState.crop = {
      x: Math.max(0, unrotatedCropX),
      y: Math.max(0, unrotatedCropY),
      w: Math.min(dispW, unrotatedCropW),
      h: Math.min(dispH, unrotatedCropH)
    };

    editorCropActive = false;
    if (dom.cropToggleBtn) dom.cropToggleBtn.classList.remove('active');
    if (dom.cropControlsPanel) dom.cropControlsPanel.classList.add('hidden');

    drawEditorCanvas();
    Utils.showToast('Crop area applied! Click "Save Changes" to confirm.', 'success');
  }

  async function saveEditorChanges() {
    if (currentEditingIndex < 0 || currentEditingIndex >= imageList.length) return;
    const item = imageList[currentEditingIndex];

    item.editState = JSON.parse(JSON.stringify(editorTempState));

    // Render updated thumbnail & compute new dimensions
    const offscreen = document.createElement('canvas');
    renderEditedImageToCanvas(offscreen, editorImgObj, item.editState);

    item.previewDataUrl = offscreen.toDataURL('image/jpeg', 0.9);
    item.width = offscreen.width;
    item.height = offscreen.height;

    renderList();
    updatePDFPreview();
    closeEditor();
    Utils.showToast(`Saved changes for "${item.name}"!`, 'success');
  }

  // =========================================================================
  // PDF PAGE PREVIEW & LAYOUT ENGINE
  // =========================================================================

  function getPageDimensions() {
    const size = dom.pageSizeSelect ? dom.pageSizeSelect.value : 'a4';
    let w = 595.28; // A4 pt (210 x 297 mm)
    let h = 841.89;

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
      // Original size will follow current image dimensions
      if (imageList.length > 0 && imageList[previewPageIndex]) {
        w = imageList[previewPageIndex].width;
        h = imageList[previewPageIndex].height;
      }
    }

    // Orientation
    const orientation = dom.orientationSelect ? dom.orientationSelect.value : 'auto';
    let isLandscape = false;

    if (orientation === 'landscape') {
      isLandscape = true;
    } else if (orientation === 'auto') {
      if (imageList.length > 0 && imageList[previewPageIndex]) {
        isLandscape = imageList[previewPageIndex].width > imageList[previewPageIndex].height;
      }
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
    if (!dom.previewCanvas || imageList.length === 0) return;

    if (previewPageIndex >= imageList.length) previewPageIndex = Math.max(0, imageList.length - 1);
    const item = imageList[previewPageIndex];
    if (!item) return;

    // Update Pagination Header
    if (dom.previewPageNum) dom.previewPageNum.textContent = `Page ${previewPageIndex + 1}`;
    if (dom.previewTotalPages) dom.previewTotalPages.textContent = `of ${imageList.length}`;
    if (dom.previewPrevBtn) dom.previewPrevBtn.disabled = previewPageIndex === 0;
    if (dom.previewNextBtn) dom.previewNextBtn.disabled = previewPageIndex === imageList.length - 1;

    const pageDim = getPageDimensions();
    const margin = getMarginPoints();
    const placement = dom.imagePlacementSelect ? dom.imagePlacementSelect.value : 'fit';

    // Canvas size for preview simulation
    const maxPreviewW = 340;
    const maxPreviewH = 440;
    const previewScale = Math.min(maxPreviewW / pageDim.width, maxPreviewH / pageDim.height, 1);

    const canvasW = Math.round(pageDim.width * previewScale);
    const canvasH = Math.round(pageDim.height * previewScale);

    dom.previewCanvas.width = canvasW;
    dom.previewCanvas.height = canvasH;

    const ctx = dom.previewCanvas.getContext('2d');
    
    // Draw white PDF page sheet with subtle shadow
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvasW, canvasH);

    // Draw margins guide indicator if margins > 0
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

    // Render item's edited visual representation
    const imgObj = await Utils.loadImage(item.originalDataUrl);
    const offscreen = document.createElement('canvas');
    renderEditedImageToCanvas(offscreen, imgObj, item.editState);

    // Calculate placement inside usable area
    let drawW = usableW;
    let drawH = usableH;
    const imgRatio = offscreen.width / offscreen.height;
    const areaRatio = usableW / usableH;

    if (placement === 'fit') {
      if (imgRatio > areaRatio) {
        drawW = usableW;
        drawH = usableW / imgRatio;
      } else {
        drawH = usableH;
        drawW = usableH * imgRatio;
      }
    } else if (placement === 'fill') {
      // Cover the usable area
      drawW = usableW;
      drawH = usableH;
    } else if (placement === 'original') {
      drawW = Math.min(usableW, offscreen.width * previewScale);
      drawH = Math.min(usableH, offscreen.height * previewScale);
    }

    const drawX = marginX + (usableW - drawW) / 2;
    const drawY = marginY + (usableH - drawH) / 2;

    ctx.drawImage(offscreen, drawX, drawY, drawW, drawH);

    // Clean up temporary canvas
    offscreen.width = 1;
    offscreen.height = 1;
  }

  // =========================================================================
  // CREATE PDF VIA PDF-LIB (Pure Client-Side)
  // =========================================================================

  async function generatePDF() {
    if (imageList.length === 0) {
      Utils.showToast('Please add at least one image to create a PDF.', 'warning');
      return;
    }

    Utils.setProcessing(true);
    showProgress(5, 'Initializing PDF Document...');

    const pageSizeSetting = dom.pageSizeSelect ? dom.pageSizeSelect.value : 'a4';
    const orientationSetting = dom.orientationSelect ? dom.orientationSelect.value : 'auto';
    const margin = getMarginPoints();
    const placement = dom.imagePlacementSelect ? dom.imagePlacementSelect.value : 'fit';

    try {
      const pdfDoc = await PDFLib.PDFDocument.create();

      for (let i = 0; i < imageList.length; i++) {
        const item = imageList[i];
        const progressPct = Math.round(10 + ((i + 1) / imageList.length) * 78);
        showProgress(progressPct, `Rendering Page ${i + 1} of ${imageList.length}...`);

        // Load original and render all visual edits onto high-res canvas
        const imgObj = await Utils.loadImage(item.originalDataUrl);
        const renderCanvas = document.createElement('canvas');
        renderEditedImageToCanvas(renderCanvas, imgObj, item.editState);

        // Safe Downscaling for extremely large images (> 4000px) to conserve memory
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

        // Determine format based on transparency
        const hasAlpha = item.file.type === 'image/png' || item.file.type === 'image/webp';
        let embeddedImage = null;

        if (hasAlpha) {
          const pngBlob = await Utils.canvasToBlob(renderCanvas, 'image/png');
          const pngBytes = await pngBlob.arrayBuffer();
          embeddedImage = await pdfDoc.embedPng(pngBytes);
        } else {
          const jpgBlob = await Utils.canvasToBlob(renderCanvas, 'image/jpeg', 0.92);
          const jpgBytes = await jpgBlob.arrayBuffer();
          embeddedImage = await pdfDoc.embedJpg(jpgBytes);
        }

        // Determine Page Dimensions
        let pageWidth = 595.28;
        let pageHeight = 841.89;

        if (pageSizeSetting === 'a5') {
          pageWidth = 419.53;
          pageHeight = 595.28;
        } else if (pageSizeSetting === 'letter') {
          pageWidth = 612;
          pageHeight = 792;
        } else if (pageSizeSetting === 'legal') {
          pageWidth = 612;
          pageHeight = 1008;
        } else if (pageSizeSetting === 'custom') {
          const cw = parseFloat(dom.customWidthInput ? dom.customWidthInput.value : 0);
          const ch = parseFloat(dom.customHeightInput ? dom.customHeightInput.value : 0);
          if (cw > 10 && ch > 10) {
            pageWidth = cw;
            pageHeight = ch;
          }
        } else if (pageSizeSetting === 'original') {
          pageWidth = renderCanvas.width;
          pageHeight = renderCanvas.height;
        }

        // Orientation
        let isLandscape = false;
        if (orientationSetting === 'landscape') {
          isLandscape = true;
        } else if (orientationSetting === 'auto') {
          isLandscape = renderCanvas.width > renderCanvas.height;
        }

        if (pageSizeSetting !== 'original') {
          if (isLandscape && pageWidth < pageHeight) {
            const temp = pageWidth;
            pageWidth = pageHeight;
            pageHeight = temp;
          } else if (!isLandscape && pageWidth > pageHeight) {
            const temp = pageWidth;
            pageWidth = pageHeight;
            pageHeight = temp;
          }
        }

        const page = pdfDoc.addPage([pageWidth, pageHeight]);

        // Usable page area
        const usableWidth = Math.max(10, pageWidth - margin * 2);
        const usableHeight = Math.max(10, pageHeight - margin * 2);

        let drawWidth = usableWidth;
        let drawHeight = usableHeight;
        const imgRatio = renderCanvas.width / renderCanvas.height;
        const areaRatio = usableWidth / usableHeight;

        if (placement === 'fit') {
          if (imgRatio > areaRatio) {
            drawWidth = usableWidth;
            drawHeight = usableWidth / imgRatio;
          } else {
            drawHeight = usableHeight;
            drawWidth = usableHeight * imgRatio;
          }
        } else if (placement === 'original') {
          drawWidth = Math.min(usableWidth, renderCanvas.width);
          drawHeight = Math.min(usableHeight, renderCanvas.height);
        }

        // Center on PDF page
        const drawX = margin + (usableWidth - drawWidth) / 2;
        const drawY = margin + (usableHeight - drawHeight) / 2;

        page.drawImage(embeddedImage, {
          x: drawX,
          y: drawY,
          width: drawWidth,
          height: drawHeight
        });

        // Release canvas memory
        renderCanvas.width = 1;
        renderCanvas.height = 1;
      }

      showProgress(92, 'Packaging final PDF file...');
      const pdfBytes = await pdfDoc.save();
      generatedPdfBlob = new Blob([pdfBytes], { type: 'application/pdf' });

      showProgress(100, 'PDF Ready!');
      setTimeout(hideProgress, 600);

      // Show PDF Ready Card
      if (dom.pdfConfigCard) dom.pdfConfigCard.classList.add('hidden');
      if (dom.pdfReadyCard) dom.pdfReadyCard.classList.remove('hidden');

      const fileSizeStr = Utils.formatBytes(generatedPdfBlob.size);
      const readyMeta = document.getElementById('i2p-ready-meta');
      if (readyMeta) {
        readyMeta.textContent = `${imageList.length} Page${imageList.length !== 1 ? 's' : ''} • ${fileSizeStr}`;
      }

      Utils.showToast(`Successfully created PDF with ${imageList.length} page(s)!`, 'success');
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

  // =========================================================================
  // CLEAN STATE RESET LIFECYCLE
  // =========================================================================

  function resetTool() {
    // Revoke any existing object URLs and memory
    imageList = [];
    currentEditingIndex = -1;
    generatedPdfBlob = null;
    editorImgObj = null;
    editorCropActive = false;
    previewPageIndex = 0;

    if (dom.emptyState) dom.emptyState.classList.remove('hidden');
    if (dom.workspace) dom.workspace.classList.add('hidden');
    if (dom.pdfReadyCard) dom.pdfReadyCard.classList.add('hidden');
    if (dom.pdfConfigCard) dom.pdfConfigCard.classList.remove('hidden');
    if (dom.editorModal) dom.editorModal.classList.add('hidden');

    if (dom.imageListContainer) dom.imageListContainer.innerHTML = '';
    if (dom.fileInput) dom.fileInput.value = '';
    if (dom.addMoreInput) dom.addMoreInput.value = '';

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
    closeEditor
  };
})();

// Export globally
window.ImageToPDF = ImageToPDF;
