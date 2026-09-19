/**
 * FileForge - Tool 51: Image to PDF
 * Features:
 * - Non-Destructive Visual Filter Preset Cards (Original, Vibrant, Soft Tone, Color, Sharp Black, Grayscale, High Contrast, Clean Document)
 * - Intelligent Client-Side Signature Background Removal & Transparent Overlay
 * - Interactive Signature Placement (Move, Resize, Rotate, Position Presets, Multi-Page)
 * - Complete PDF Layout Engine & Client-Side PDF Generation via pdf-lib
 * - 100% Private, Zero Server Uploads, Clean State Reset Lifecycle
 */

const ImageToPDF = (() => {
  // Main State
  let imageList = [];
  // Each item: { id, file, name, originalDataUrl, previewDataUrl, width, height, originalWidth, originalHeight, editState }
  // editState: { crop: {x,y,w,h} | null, rotate: 0, flipH: false, flipV: false, filter: 'original' }

  let currentEditingIndex = -1;
  let previewPageIndex = 0;
  let generatedPdfBlob = null;
  let currentPreset = 'general'; // 'general' | 'jpg-to-pdf' | 'png-to-pdf'

  // Signature State
  let signatureRawImage = null; // Image object
  let signatureDataUrl = null; // Transparent PNG data URL
  let signatureSettings = {
    sensitivity: 45, // 0 - 100
    inkColor: 'original', // 'original' | 'black' | 'blue'
    autoCrop: true,
    smooth: true
  };
  let signaturePlacement = {
    active: false,
    applyToAll: true,
    // Relative to page (0.0 to 1.0)
    relX: 0.65, // top-left X ratio
    relY: 0.75, // top-left Y ratio
    relW: 0.25, // width ratio relative to usable page width
    aspectRatio: 1, // width / height
    rotation: 0 // degrees
  };

  // Editor State
  let editorCropActive = false;
  let editorCropRatio = 'free'; // 'free' | '1:1' | '4:3' | '16:9' | 'a4'
  let editorCropRect = { x: 0, y: 0, w: 100, h: 100 };
  let editorTempState = {};
  let isDraggingCrop = false;
  let cropDragMode = null;
  let cropDragStart = { x: 0, y: 0, rectX: 0, rectY: 0, rectW: 0, rectH: 0 };
  let editorImgObj = null;

  // Signature Drag / Transform on Preview State
  let isDraggingSig = false;
  let isResizingSig = false;
  let sigDragStart = { mouseX: 0, mouseY: 0, origX: 0, origY: 0, origW: 0 };

  // DOM Elements
  let dom = {};

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

      // PDF Settings
      pageSizeSelect: document.getElementById('i2p-page-size'),
      customSizeRow: document.getElementById('i2p-custom-size-row'),
      customWidthInput: document.getElementById('i2p-custom-width'),
      customHeightInput: document.getElementById('i2p-custom-height'),
      orientationSelect: document.getElementById('i2p-orientation'),
      marginSelect: document.getElementById('i2p-margin'),
      customMarginRow: document.getElementById('i2p-custom-margin-row'),
      customMarginInput: document.getElementById('i2p-custom-margin'),
      imagePlacementSelect: document.getElementById('i2p-image-placement'),

      // Action Buttons
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

      // PDF Live Preview & Signature Overlay
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

      // Image Editor Modal
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

      // Signature Studio Modal
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

    // PDF Layout Settings update Preview
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

    // Editor Events
    bindEditorEvents();

    // Signature Studio Events
    bindSignatureEvents();

    // Signature Placement Overlay Events
    bindSignatureOverlayEvents();
  }

  // =========================================================================
  // FILE LOADING & LIST MANAGEMENT
  // =========================================================================

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
          orientation: (dom.orientationSelect ? dom.orientationSelect.value : 'auto'),
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
                       item.editState.filter !== 'original';

      const orient = item.orientation || 'auto';

      card.innerHTML = `
        <div class="i2p-item-main-row">
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
            <span class="i2p-item-dims">${item.width} × ${item.height} px ${item.editState.filter !== 'original' ? '• ' + getFilterName(item.editState.filter) : ''}</span>
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
        <div class="i2p-item-orient-row">
          <span class="i2p-orient-label">Orientation:</span>
          <div class="i2p-orient-pill-group">
            <button type="button" class="i2p-orient-pill ${orient === 'auto' ? 'active' : ''}" data-orient="auto" title="Auto: Detect aspect ratio">Auto</button>
            <button type="button" class="i2p-orient-pill ${orient === 'portrait' ? 'active' : ''}" data-orient="portrait" title="Force Portrait page">Portrait</button>
            <button type="button" class="i2p-orient-pill ${orient === 'landscape' ? 'active' : ''}" data-orient="landscape" title="Force Landscape page">Landscape</button>
          </div>
        </div>
      `;

      // Drag and Drop
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

      // Per-Page Orientation Buttons
      card.querySelectorAll('.i2p-orient-pill').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const newOrient = btn.dataset.orient;
          item.orientation = newOrient;
          renderList();
          updatePDFPreview();
        });
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

  function getFilterName(filterId) {
    const f = FILTER_PRESETS.find(p => p.id === filterId);
    return f ? f.name : filterId;
  }

  // =========================================================================
  // NON-DESTRUCTIVE RENDERING PIPELINE & 8 FILTER PRESETS
  // =========================================================================

  function renderEditedImageToCanvas(canvas, imgObj, editState, targetWidth = null, targetHeight = null) {
    const isRotated90 = (editState.rotate === 90 || editState.rotate === 270);

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

    // CSS Filter string based on Preset
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

    ctx.filter = filterCSS;

    ctx.save();
    ctx.translate(canvas.width / 2, canvas.height / 2);

    if (editState.rotate) {
      ctx.rotate((editState.rotate * Math.PI) / 180);
    }
    const scaleX = editState.flipH ? -1 : 1;
    const scaleY = editState.flipV ? -1 : 1;
    ctx.scale(scaleX, scaleY);

    const drawW = isRotated90 ? canvas.height : canvas.width;
    const drawH = isRotated90 ? canvas.width : canvas.height;

    ctx.drawImage(imgObj, sx, sy, sw, sh, -drawW / 2, -drawH / 2, drawW, drawH);
    ctx.restore();
    ctx.filter = 'none';

    // Secondary pixel pass for Clean Document / Sharp Black if needed
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

        // Whiten light gray background (shadows/faded paper) while keeping dark text crisp
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
      // Fallback silently if canvas is tainted
    }
  }

  // =========================================================================
  // IMAGE EDITOR MODAL WITH LIVE FILTER CARDS, 8-HANDLE CROP & LIVE MAGNIFIER
  // =========================================================================

  async function openEditor(index) {
    if (index < 0 || index >= imageList.length) return;
    currentEditingIndex = index;
    const item = imageList[index];

    editorTempState = JSON.parse(JSON.stringify(item.editState));
    editorCropActive = false;
    editorCropRatio = 'free';

    if (dom.editorFilename) dom.editorFilename.textContent = item.name;
    if (dom.editorDimsBadge) dom.editorDimsBadge.textContent = `${item.width} × ${item.height} px`;
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

    // 1. Save current page's temporary edits to its independent state
    if (currentEditingIndex >= 0 && currentEditingIndex < imageList.length) {
      const curItem = imageList[currentEditingIndex];
      curItem.editState = JSON.parse(JSON.stringify(editorTempState));

      const offscreen = document.createElement('canvas');
      renderEditedImageToCanvas(offscreen, editorImgObj, curItem.editState);
      curItem.previewDataUrl = offscreen.toDataURL('image/jpeg', 0.88);
      curItem.width = offscreen.width;
      curItem.height = offscreen.height;
    }

    // 2. Open new page
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

      // Small thumbnail canvas
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

    const isRotated90 = (editorTempState.rotate === 90 || editorTempState.rotate === 270);
    let baseW = editorTempState.crop ? editorTempState.crop.w : (editorImgObj.naturalWidth || editorImgObj.width);
    let baseH = editorTempState.crop ? editorTempState.crop.h : (editorImgObj.naturalHeight || editorImgObj.height);
    let dispW = isRotated90 ? baseH : baseW;
    let dispH = isRotated90 ? baseW : baseH;

    const scale = Math.min(maxDisplayW / dispW, maxDisplayH / dispH, 1);
    const canvasW = Math.max(80, Math.round(dispW * scale));
    const canvasH = Math.max(80, Math.round(dispH * scale));

    renderEditedImageToCanvas(dom.editorCanvas, editorImgObj, editorTempState, canvasW, canvasH);

    dom.editorCanvas.style.maxWidth = '100%';
    dom.editorCanvas.style.height = 'auto';

    if (editorCropActive) {
      drawCropOverlay(dom.editorCanvas);
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
    if (dom.editorCloseBtn) dom.editorCloseBtn.addEventListener('click', closeEditor);
    if (dom.editorCancelBtn) dom.editorCancelBtn.addEventListener('click', closeEditor);
    if (dom.editorSaveBtn) dom.editorSaveBtn.addEventListener('click', saveEditorChanges);

    // Page-by-Page navigation buttons
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

    // Crop Toggle & Presets
    if (dom.cropToggleBtn) {
      dom.cropToggleBtn.addEventListener('click', () => {
        editorCropActive = !editorCropActive;
        dom.cropToggleBtn.classList.toggle('active', editorCropActive);
        if (dom.cropControlsPanel) dom.cropControlsPanel.classList.toggle('hidden', !editorCropActive);
        if (dom.editorMagnifier) dom.editorMagnifier.classList.add('hidden');
        if (editorCropActive) initCropRect();
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

    if (dom.applyCropBtn) dom.applyCropBtn.addEventListener('click', applyCropToTempState);
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
        if (dom.cropToggleBtn) dom.cropToggleBtn.classList.remove('active');
        if (dom.cropControlsPanel) dom.cropControlsPanel.classList.add('hidden');
        if (dom.editorMagnifier) dom.editorMagnifier.classList.add('hidden');
        drawEditorCanvas();
        renderFilterPresetCards();
        Utils.showToast('Crop reset to full image.', 'info');
      });
    }

    // Rotate & Flip
    if (dom.rotateCwBtn) {
      dom.rotateCwBtn.addEventListener('click', () => {
        editorTempState.rotate = (editorTempState.rotate + 90) % 360;
        drawEditorCanvas();
        renderFilterPresetCards();
      });
    }
    if (dom.rotateCcwBtn) {
      dom.rotateCcwBtn.addEventListener('click', () => {
        editorTempState.rotate = (editorTempState.rotate - 90 + 360) % 360;
        drawEditorCanvas();
        renderFilterPresetCards();
      });
    }
    if (dom.flipHBtn) {
      dom.flipHBtn.addEventListener('click', () => {
        editorTempState.flipH = !editorTempState.flipH;
        dom.flipHBtn.classList.toggle('active', editorTempState.flipH);
        drawEditorCanvas();
        renderFilterPresetCards();
      });
    }
    if (dom.flipVBtn) {
      dom.flipVBtn.addEventListener('click', () => {
        editorTempState.flipV = !editorTempState.flipV;
        dom.flipVBtn.classList.toggle('active', editorTempState.flipV);
        drawEditorCanvas();
        renderFilterPresetCards();
      });
    }

    // Crop Pointer Events
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

  function initCropRect() {
    if (!dom.editorCanvas) return;
    const cw = dom.editorCanvas.width;
    const ch = dom.editorCanvas.height;
    editorCropRect = {
      x: Math.round(cw * 0.08),
      y: Math.round(ch * 0.08),
      w: Math.round(cw * 0.84),
      h: Math.round(ch * 0.84)
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

  /**
   * 8-Handle Crop Overlay Matching Reference UI:
   * - Darkened outside mask
   * - Solid bright blue crop border
   * - 4 Circular corner handles (blue outer ring + white ring + center dot)
   * - 4 Side middle pill handles (white rounded pill with blue border)
   */
  function drawCropOverlay(canvas) {
    const ctx = canvas.getContext('2d');
    const cw = canvas.width;
    const ch = canvas.height;
    const r = editorCropRect;

    // Darkened overlay outside the crop rect
    ctx.fillStyle = 'rgba(0, 0, 0, 0.58)';
    ctx.fillRect(0, 0, cw, r.y);
    ctx.fillRect(0, r.y + r.h, cw, ch - (r.y + r.h));
    ctx.fillRect(0, r.y, r.x, r.h);
    ctx.fillRect(r.x + r.w, r.y, cw - (r.x + r.w), r.h);

    // Solid blue crop boundary
    ctx.strokeStyle = '#0284c7';
    ctx.lineWidth = 2.5;
    ctx.strokeRect(r.x, r.y, r.w, r.h);

    // Rule of thirds subtle grid
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

    // Helper for rounded pill handles
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

    // Helper for circular corner handles
    function drawCorner(x, y) {
      ctx.save();
      // Outer Blue Circle
      ctx.beginPath();
      ctx.arc(x, y, 9, 0, Math.PI * 2);
      ctx.fillStyle = '#0284c7';
      ctx.fill();
      // Inner White Ring
      ctx.beginPath();
      ctx.arc(x, y, 6.5, 0, Math.PI * 2);
      ctx.fillStyle = '#ffffff';
      ctx.fill();
      // Center Blue Dot
      ctx.beginPath();
      ctx.arc(x, y, 3, 0, Math.PI * 2);
      ctx.fillStyle = '#0284c7';
      ctx.fill();
      ctx.restore();
    }

    // 4 Edge / Middle Pill Handles (North, South, West, East)
    drawPill(r.x + r.w / 2, r.y, 30, 10, 5); // Top (N)
    drawPill(r.x + r.w / 2, r.y + r.h, 30, 10, 5); // Bottom (S)
    drawPill(r.x, r.y + r.h / 2, 10, 30, 5); // Left (W)
    drawPill(r.x + r.w, r.y + r.h / 2, 10, 30, 5); // Right (E)

    // 4 Circular Corner Handles
    drawCorner(r.x, r.y); // NW
    drawCorner(r.x + r.w, r.y); // NE
    drawCorner(r.x + r.w, r.y + r.h); // SE
    drawCorner(r.x, r.y + r.h); // SW
  }

  function getCropHandleAt(x, y) {
    const r = editorCropRect;
    const cornerPad = 32; // Generous touch hit area for corners
    const edgePad = 26;   // Generous touch hit area for edges

    // 1. Check 4 corners first
    if (Math.hypot(x - r.x, y - r.y) < cornerPad) return 'nw';
    if (Math.hypot(x - (r.x + r.w), y - r.y) < cornerPad) return 'ne';
    if (Math.hypot(x - (r.x + r.w), y - (r.y + r.h)) < cornerPad) return 'se';
    if (Math.hypot(x - r.x, y - (r.y + r.h)) < cornerPad) return 'sw';

    // 2. Check 4 edge pills
    if (Math.abs(y - r.y) < edgePad && Math.abs(x - (r.x + r.w / 2)) < 28) return 'n';
    if (Math.abs(y - (r.y + r.h)) < edgePad && Math.abs(x - (r.x + r.w / 2)) < 28) return 's';
    if (Math.abs(x - r.x) < edgePad && Math.abs(y - (r.y + r.h / 2)) < 28) return 'w';
    if (Math.abs(x - (r.x + r.w)) < edgePad && Math.abs(y - (r.y + r.h / 2)) < 28) return 'e';

    // 3. Inside box
    if (x > r.x && x < r.x + r.w && y > r.y && y < r.y + r.h) return 'move';
    return null;
  }

  /**
   * Renders Live Magnifier at Top Area showing zoomed area under handle with crosshairs
   */
  function renderMagnifier(focusCanvasX, focusCanvasY) {
    if (!dom.editorMagnifier || !dom.editorMagnifierCanvas || !editorImgObj || !dom.editorCanvas) return;
    dom.editorMagnifier.classList.remove('hidden');

    const magCanvas = dom.editorMagnifierCanvas;
    const magCtx = magCanvas.getContext('2d');
    const magW = magCanvas.width;
    const magH = magCanvas.height;

    // Smart positioning: place in opposite quadrant so cursor/finger never blocks it
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

    // Render full uncropped transformed image to offscreen canvas
    const isRotated90 = (editorTempState.rotate === 90 || editorTempState.rotate === 270);
    const baseW = isRotated90 ? (editorImgObj.naturalHeight || editorImgObj.height) : (editorImgObj.naturalWidth || editorImgObj.width);
    const baseH = isRotated90 ? (editorImgObj.naturalWidth || editorImgObj.width) : (editorImgObj.naturalHeight || editorImgObj.height);

    const offscreen = document.createElement('canvas');
    const tempStateNoCrop = {
      crop: null,
      rotate: editorTempState.rotate,
      flipH: editorTempState.flipH,
      flipV: editorTempState.flipV,
      filter: editorTempState.filter
    };
    renderEditedImageToCanvas(offscreen, editorImgObj, tempStateNoCrop, baseW, baseH);

    // Map canvas display coords to full offscreen coords
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

    // Active point for live magnifier
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

  function applyCropToTempState() {
    if (!dom.editorCanvas || !editorImgObj) return;

    const cw = dom.editorCanvas.width;
    const ch = dom.editorCanvas.height;
    const isRotated90 = (editorTempState.rotate === 90 || editorTempState.rotate === 270);

    let baseW = editorImgObj.naturalWidth || editorImgObj.width;
    let baseH = editorImgObj.naturalHeight || editorImgObj.height;
    let dispW = isRotated90 ? baseH : baseW;
    let dispH = isRotated90 ? baseW : baseH;

    const scaleX = dispW / cw;
    const scaleY = dispH / ch;

    editorTempState.crop = {
      x: Math.max(0, Math.round(editorCropRect.x * scaleX)),
      y: Math.max(0, Math.round(editorCropRect.y * scaleY)),
      w: Math.min(dispW, Math.round(editorCropRect.w * scaleX)),
      h: Math.min(dispH, Math.round(editorCropRect.h * scaleY))
    };

    editorCropActive = false;
    if (dom.cropToggleBtn) dom.cropToggleBtn.classList.remove('active');
    if (dom.cropControlsPanel) dom.cropControlsPanel.classList.add('hidden');
    if (dom.editorMagnifier) dom.editorMagnifier.classList.add('hidden');

    drawEditorCanvas();
    renderFilterPresetCards();
    Utils.showToast('Crop applied! Click Save Changes to keep.', 'info');
  }

  async function saveEditorChanges() {
    if (currentEditingIndex < 0 || currentEditingIndex >= imageList.length) return;
    const item = imageList[currentEditingIndex];

    item.editState = JSON.parse(JSON.stringify(editorTempState));

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

  function closeEditor() {
    if (dom.editorModal) dom.editorModal.classList.add('hidden');
    currentEditingIndex = -1;
    editorImgObj = null;
    editorCropActive = false;
  }

  // =========================================================================
  // CLIENT-SIDE SIGNATURE EXTRACTION STUDIO (BACKGROUND REMOVAL)
  // =========================================================================

  function bindSignatureEvents() {
    if (dom.addSignatureBtn) dom.addSignatureBtn.addEventListener('click', openSignatureModal);
    if (dom.sigCloseBtn) dom.sigCloseBtn.addEventListener('click', closeSignatureModal);
    if (dom.sigCancelBtn) dom.sigCancelBtn.addEventListener('click', closeSignatureModal);
    if (dom.sigUseBtn) dom.sigUseBtn.addEventListener('click', applySignatureToPDF);

    // Signature Dropzone & Picker
    Utils.setupDropZone(dom.sigDropzone, handleSignatureFile, ['image/', '.jpg', '.jpeg', '.png', '.webp']);
    if (dom.sigBrowseBtn) dom.sigBrowseBtn.addEventListener('click', () => dom.sigFileInput.click());
    if (dom.sigChangeBtn) dom.sigChangeBtn.addEventListener('click', () => dom.sigFileInput.click());
    if (dom.sigFileInput) {
      dom.sigFileInput.addEventListener('change', (e) => {
        handleSignatureFile(Array.from(e.target.files));
        dom.sigFileInput.value = '';
      });
    }

    // Sensitivity Slider
    if (dom.sigSensitivitySlider) {
      dom.sigSensitivitySlider.addEventListener('input', (e) => {
        signatureSettings.sensitivity = parseInt(e.target.value, 10);
        if (dom.sigSensitivityVal) dom.sigSensitivityVal.textContent = signatureSettings.sensitivity + '%';
        processSignature();
      });
    }

    // Ink Color Chips
    if (dom.sigColorChips) {
      dom.sigColorChips.forEach(chip => {
        chip.addEventListener('click', () => {
          signatureSettings.inkColor = chip.dataset.color;
          dom.sigColorChips.forEach(c => c.classList.toggle('active', c === chip));
          processSignature();
        });
      });
    }

    // Auto Crop Checkbox
    if (dom.sigAutoCropCheckbox) {
      dom.sigAutoCropCheckbox.addEventListener('change', (e) => {
        signatureSettings.autoCrop = e.target.checked;
        processSignature();
      });
    }
  }

  function openSignatureModal() {
    if (dom.signatureModal) dom.signatureModal.classList.remove('hidden');
    if (signatureRawImage) {
      if (dom.sigDropzone) dom.sigDropzone.classList.add('hidden');
      if (dom.sigPreviewWrap) dom.sigPreviewWrap.classList.remove('hidden');
      processSignature();
    } else {
      if (dom.sigDropzone) dom.sigDropzone.classList.remove('hidden');
      if (dom.sigPreviewWrap) dom.sigPreviewWrap.classList.add('hidden');
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

    // Threshold calculation from sensitivity (30 - 240)
    const threshold = 120 + (signatureSettings.sensitivity / 100) * 125;
    const inkMode = signatureSettings.inkColor;

    let minX = canvas.width, minY = canvas.height, maxX = 0, maxY = 0;
    let hasInk = false;

    for (let i = 0; i < d.length; i += 4) {
      const r = d[i];
      const g = d[i + 1];
      const b = d[i + 2];

      // Luminance
      const lum = 0.299 * r + 0.587 * g + 0.114 * b;

      // Detect white/light paper background
      if (lum >= threshold) {
        // Transparent
        d[i + 3] = 0;
      } else {
        // Fade alpha smoothly near threshold
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

          // Color Recoloring
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

    // Auto Crop to Ink Bounding Box if enabled
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

    // Render onto Checkerboard preview canvas in modal
    const prevCanvas = dom.sigPreviewCanvas;
    const maxPrevW = 280;
    const maxPrevH = 140;
    const scale = Math.min(maxPrevW / finalCanvas.width, maxPrevH / finalCanvas.height, 1);

    prevCanvas.width = Math.round(finalCanvas.width * scale);
    prevCanvas.height = Math.round(finalCanvas.height * scale);
    const pCtx = prevCanvas.getContext('2d');
    pCtx.clearRect(0, 0, prevCanvas.width, prevCanvas.height);
    pCtx.drawImage(finalCanvas, 0, 0, prevCanvas.width, prevCanvas.height);

    // Cache transparent PNG data URL
    signatureDataUrl = finalCanvas.toDataURL('image/png');
    signaturePlacement.aspectRatio = finalCanvas.width / finalCanvas.height;
  }

  function applySignatureToPDF() {
    if (!signatureDataUrl) {
      Utils.showToast('Please upload a signature first.', 'warning');
      return;
    }

    signaturePlacement.active = true;
    closeSignatureModal();

    if (dom.sigControlsRow) dom.sigControlsRow.classList.remove('hidden');
    if (dom.addSignatureBtn) dom.addSignatureBtn.innerHTML = `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 14px; height: 14px; margin-right: 4px;"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
      Edit Signature
    `;

    updatePDFPreview();
    Utils.showToast('Signature added! Drag or use position presets to place on page.', 'success');
  }

  // =========================================================================
  // SIGNATURE OVERLAY INTERACTION ON PDF PREVIEW
  // =========================================================================

  function bindSignatureOverlayEvents() {
    if (dom.sigDeleteBtn) {
      dom.sigDeleteBtn.addEventListener('click', () => {
        signaturePlacement.active = false;
        if (dom.sigOverlayBox) dom.sigOverlayBox.classList.add('hidden');
        if (dom.sigControlsRow) dom.sigControlsRow.classList.add('hidden');
        if (dom.addSignatureBtn) dom.addSignatureBtn.innerHTML = `
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 14px; height: 14px; margin-right: 4px;"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><path d="M10.5 14.5c.8-1.2 2-1.5 2.5-.5.5 1-1.5 2.5-.5 3.5 1 1 2.5 0 3-1.5"></path></svg>
          Add Signature
        `;
        Utils.showToast('Signature removed.', 'info');
      });
    }

    if (dom.sigApplyScopeSelect) {
      dom.sigApplyScopeSelect.addEventListener('change', (e) => {
        signaturePlacement.applyToAll = e.target.value === 'all';
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

    // Drag to Move on Preview
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
    if (!signaturePlacement.active || !dom.previewCanvas) return;
    const cw = dom.previewCanvas.clientWidth || dom.previewCanvas.width;
    const ch = dom.previewCanvas.clientHeight || dom.previewCanvas.height;
    if (cw <= 0 || ch <= 0) return;

    const w = signaturePlacement.relW;
    const pxW = cw * w;
    const pxH = pxW / (signaturePlacement.aspectRatio || 1);
    const relH = pxH / ch;

    const p = (pos || '').toLowerCase();
    if (p === 'tl' || p === 'top-left') {
      signaturePlacement.relX = 0.05;
      signaturePlacement.relY = 0.05;
    } else if (p === 'tr' || p === 'top-right') {
      signaturePlacement.relX = Math.max(0, 1 - w - 0.05);
      signaturePlacement.relY = 0.05;
    } else if (p === 'center') {
      signaturePlacement.relX = Math.max(0, (1 - w) / 2);
      signaturePlacement.relY = Math.max(0, (1 - relH) / 2);
    } else if (p === 'bl' || p === 'bottom-left') {
      signaturePlacement.relX = 0.05;
      signaturePlacement.relY = Math.max(0, 1 - relH - 0.05);
    } else if (p === 'br' || p === 'bottom-right') {
      signaturePlacement.relX = Math.max(0, 1 - w - 0.05);
      signaturePlacement.relY = Math.max(0, 1 - relH - 0.05);
    }

    if (dom.sigPosBtns) {
      dom.sigPosBtns.forEach(b => {
        const bPos = (b.dataset.pos || '').toLowerCase();
        b.classList.toggle('active', bPos === p);
      });
    }

    renderSignatureOverlayBox();
  }

  function onSigPointerDown(e) {
    if (e.target === dom.sigResizeHandle || e.target === dom.sigDeleteBtn || isResizingSig) return;
    e.preventDefault();
    isDraggingSig = true;
    sigDragStart = {
      mouseX: e.clientX,
      mouseY: e.clientY,
      origX: signaturePlacement.relX,
      origY: signaturePlacement.relY
    };
  }

  function onSigTouchStart(e) {
    if (e.target === dom.sigResizeHandle || e.target === dom.sigDeleteBtn || isResizingSig || e.touches.length === 0) return;
    e.preventDefault();
    isDraggingSig = true;
    sigDragStart = {
      mouseX: e.touches[0].clientX,
      mouseY: e.touches[0].clientY,
      origX: signaturePlacement.relX,
      origY: signaturePlacement.relY
    };
  }

  function onSigResizeDown(e) {
    e.stopPropagation();
    e.preventDefault();
    isResizingSig = true;
    sigDragStart = {
      mouseX: e.clientX,
      mouseY: e.clientY,
      origW: signaturePlacement.relW
    };
  }

  function onSigResizeTouchStart(e) {
    e.stopPropagation();
    if (e.touches.length === 0) return;
    e.preventDefault();
    isResizingSig = true;
    sigDragStart = {
      mouseX: e.touches[0].clientX,
      mouseY: e.touches[0].clientY,
      origW: signaturePlacement.relW
    };
  }

  function onSigPointerMove(e) {
    if (!signaturePlacement.active || !dom.previewCanvas) return;
    const cw = dom.previewCanvas.clientWidth || dom.previewCanvas.width;
    const ch = dom.previewCanvas.clientHeight || dom.previewCanvas.height;
    if (cw <= 0 || ch <= 0) return;

    if (isDraggingSig) {
      const dx = (e.clientX - sigDragStart.mouseX) / cw;
      const dy = (e.clientY - sigDragStart.mouseY) / ch;

      const pxW = cw * signaturePlacement.relW;
      const pxH = pxW / (signaturePlacement.aspectRatio || 1);
      const relH = pxH / ch;

      signaturePlacement.relX = Math.max(0, Math.min(1 - signaturePlacement.relW, sigDragStart.origX + dx));
      signaturePlacement.relY = Math.max(0, Math.min(1 - relH, sigDragStart.origY + dy));
      renderSignatureOverlayBox();
    } else if (isResizingSig) {
      const dx = (e.clientX - sigDragStart.mouseX) / cw;
      const newW = Math.max(0.08, Math.min(0.9, sigDragStart.origW + dx));
      const pxW = cw * newW;
      const pxH = pxW / (signaturePlacement.aspectRatio || 1);
      const relH = pxH / ch;

      signaturePlacement.relW = newW;
      if (signaturePlacement.relX + newW > 1) {
        signaturePlacement.relX = Math.max(0, 1 - newW);
      }
      if (signaturePlacement.relY + relH > 1) {
        signaturePlacement.relY = Math.max(0, 1 - relH);
      }
      renderSignatureOverlayBox();
    }
  }

  function onSigTouchMove(e) {
    if (!signaturePlacement.active || (!isDraggingSig && !isResizingSig) || e.touches.length === 0) return;
    e.preventDefault();
    const touch = e.touches[0];
    onSigPointerMove(touch);
  }

  function onSigPointerUp() {
    isDraggingSig = false;
    isResizingSig = false;
  }

  function renderSignatureOverlayBox() {
    if (!signaturePlacement.active || !signatureDataUrl || !dom.sigOverlayBox || !dom.previewCanvas) return;

    dom.sigOverlayBox.classList.remove('hidden');
    if (dom.sigControlsRow) dom.sigControlsRow.classList.remove('hidden');
    if (dom.sigOverlayImg) dom.sigOverlayImg.src = signatureDataUrl;

    const cw = dom.previewCanvas.clientWidth || dom.previewCanvas.width;
    const ch = dom.previewCanvas.clientHeight || dom.previewCanvas.height;
    if (cw <= 0 || ch <= 0) return;

    const pxW = Math.max(20, Math.round(cw * signaturePlacement.relW));
    const pxH = Math.max(10, Math.round(pxW / (signaturePlacement.aspectRatio || 1)));
    const pxX = Math.round(cw * signaturePlacement.relX);
    const pxY = Math.round(ch * signaturePlacement.relY);

    dom.sigOverlayBox.style.left = `${pxX}px`;
    dom.sigOverlayBox.style.top = `${pxY}px`;
    dom.sigOverlayBox.style.width = `${pxW}px`;
    dom.sigOverlayBox.style.height = `${pxH}px`;
  }

  // =========================================================================
  // PER-IMAGE ORIENTATION & DIMENSIONS HELPERS
  // =========================================================================

  function getItemEffectiveDimensions(item) {
    if (!item) return { width: 100, height: 100 };
    let w = item.originalWidth || item.width || 100;
    let h = item.originalHeight || item.height || 100;

    if (item.editState && item.editState.crop) {
      w = item.editState.crop.w;
      h = item.editState.crop.h;
    }

    if (item.editState && (item.editState.rotate === 90 || item.editState.rotate === 270)) {
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

    // Auto orientation based on current effective aspect ratio
    const dims = getItemEffectiveDimensions(item);
    return dims.width > dims.height ? 'landscape' : 'portrait';
  }

  // =========================================================================
  // PDF PAGE PREVIEW ENGINE
  // =========================================================================

  function getPageDimensions(pageIndex = previewPageIndex) {
    const size = dom.pageSizeSelect ? dom.pageSizeSelect.value : 'a4';
    let w = 595.28;
    let h = 841.89;

    const item = (imageList.length > 0 && pageIndex >= 0 && pageIndex < imageList.length) ? imageList[pageIndex] : null;

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
      if (item) {
        const dims = getItemEffectiveDimensions(item);
        w = dims.width;
        h = dims.height;
      }
    }

    // Determine per-page orientation
    const isLandscape = getEffectiveOrientation(item) === 'landscape';

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

    if (dom.previewPageNum) dom.previewPageNum.textContent = `Page ${previewPageIndex + 1}`;
    if (dom.previewTotalPages) dom.previewTotalPages.textContent = `of ${imageList.length}`;
    if (dom.previewPrevBtn) dom.previewPrevBtn.disabled = previewPageIndex === 0;
    if (dom.previewNextBtn) dom.previewNextBtn.disabled = previewPageIndex === imageList.length - 1;

    const pageDim = getPageDimensions(previewPageIndex);
    const margin = getMarginPoints();
    const placement = dom.imagePlacementSelect ? dom.imagePlacementSelect.value : 'fit';

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

    const imgObj = await Utils.loadImage(item.originalDataUrl);
    const offscreen = document.createElement('canvas');
    renderEditedImageToCanvas(offscreen, imgObj, item.editState);

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
      drawW = usableW;
      drawH = usableH;
    } else if (placement === 'original') {
      drawW = Math.min(usableW, offscreen.width * previewScale);
      drawH = Math.min(usableH, offscreen.height * previewScale);
    }

    const drawX = marginX + (usableW - drawW) / 2;
    const drawY = marginY + (usableH - drawH) / 2;

    ctx.drawImage(offscreen, drawX, drawY, drawW, drawH);

    offscreen.width = 1;
    offscreen.height = 1;

    // Reposition Signature Overlay Box
    renderSignatureOverlayBox();
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

    const margin = getMarginPoints();
    const placement = dom.imagePlacementSelect ? dom.imagePlacementSelect.value : 'fit';

    try {
      const pdfDoc = await PDFLib.PDFDocument.create();

      // Embed signature image if active
      let embeddedSig = null;
      if (signaturePlacement.active && signatureDataUrl) {
        const sigImgObj = await Utils.loadImage(signatureDataUrl);
        const sigCanvas = document.createElement('canvas');
        sigCanvas.width = sigImgObj.naturalWidth;
        sigCanvas.height = sigImgObj.naturalHeight;
        const sCtx = sigCanvas.getContext('2d');
        sCtx.drawImage(sigImgObj, 0, 0);

        const sigPngBlob = await Utils.canvasToBlob(sigCanvas, 'image/png');
        const sigBytes = await sigPngBlob.arrayBuffer();
        embeddedSig = await pdfDoc.embedPng(sigBytes);
        sigCanvas.width = 1;
        sigCanvas.height = 1;
      }

      for (let i = 0; i < imageList.length; i++) {
        const item = imageList[i];
        const progressPct = Math.round(10 + ((i + 1) / imageList.length) * 78);
        showProgress(progressPct, `Rendering Page ${i + 1} of ${imageList.length}...`);

        const imgObj = await Utils.loadImage(item.originalDataUrl);
        const renderCanvas = document.createElement('canvas');
        renderEditedImageToCanvas(renderCanvas, imgObj, item.editState);

        // Safe Downscaling for ultra-large images (> 4000px)
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
          const jpgBlob = await Utils.canvasToBlob(renderCanvas, 'image/jpeg', 0.92);
          const jpgBytes = await jpgBlob.arrayBuffer();
          embeddedImage = await pdfDoc.embedJpg(jpgBytes);
        }

        // Per-Page Dimensions & Orientation
        const pageDim = getPageDimensions(i);
        const pageWidth = pageDim.width;
        const pageHeight = pageDim.height;

        const page = pdfDoc.addPage([pageWidth, pageHeight]);

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
        } else if (placement === 'fill') {
          drawWidth = usableWidth;
          drawHeight = usableHeight;
        } else if (placement === 'original') {
          drawWidth = Math.min(usableWidth, renderCanvas.width);
          drawHeight = Math.min(usableHeight, renderCanvas.height);
        }

        const drawX = margin + (usableWidth - drawWidth) / 2;
        const drawY = margin + (usableHeight - drawHeight) / 2;

        page.drawImage(embeddedImage, {
          x: drawX,
          y: drawY,
          width: drawWidth,
          height: drawHeight
        });

        // Draw Signature Overlay if applicable on this page
        const shouldDrawSig = embeddedSig && (signaturePlacement.applyToAll || i === previewPageIndex);
        if (shouldDrawSig) {
          const sigPdfW = pageWidth * signaturePlacement.relW;
          const sigPdfH = sigPdfW / signaturePlacement.aspectRatio;
          const sigPdfX = pageWidth * signaturePlacement.relX;
          // In PDF coordinate system, Y=0 is bottom
          const sigPdfY = pageHeight - (pageHeight * signaturePlacement.relY) - sigPdfH;

          page.drawImage(embeddedSig, {
            x: Math.max(0, sigPdfX),
            y: Math.max(0, sigPdfY),
            width: sigPdfW,
            height: sigPdfH
          });
        }

        renderCanvas.width = 1;
        renderCanvas.height = 1;
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
        readyMeta.textContent = `${imageList.length} Page${imageList.length !== 1 ? 's' : ''} • ${fileSizeStr} ${signaturePlacement.active ? '• With Signature' : ''}`;
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
    imageList = [];
    currentEditingIndex = -1;
    generatedPdfBlob = null;
    editorImgObj = null;
    editorCropActive = false;
    previewPageIndex = 0;

    signatureRawImage = null;
    signatureDataUrl = null;
    signaturePlacement.active = false;

    if (dom.emptyState) dom.emptyState.classList.remove('hidden');
    if (dom.workspace) dom.workspace.classList.add('hidden');
    if (dom.pdfReadyCard) dom.pdfReadyCard.classList.add('hidden');
    if (dom.pdfConfigCard) dom.pdfConfigCard.classList.remove('hidden');
    if (dom.editorModal) dom.editorModal.classList.add('hidden');
    if (dom.signatureModal) dom.signatureModal.classList.add('hidden');
    if (dom.sigOverlayBox) dom.sigOverlayBox.classList.add('hidden');
    if (dom.sigControlsRow) dom.sigControlsRow.classList.add('hidden');

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
    closeSignatureModal
  };
})();

// Export globally
window.ImageToPDF = ImageToPDF;
