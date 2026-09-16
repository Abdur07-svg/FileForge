/**
 * FileForge - Image Resizer Tool
 * Batch image resizing with interactive canvas drag-handles (laptop cursor & mobile touch support),
 * pixel dimension lock, percentage scaling, and format output.
 */

const ImageResizer = (() => {
  let files = []; // { file, name, dataUrl, img, origWidth, origHeight, origSize, resizedBlob, resizedUrl, resizedWidth, resizedHeight }
  let activeIndex = 0;
  let resizeMode = 'dimensions'; // 'dimensions' or 'percentage'

  // Interactive Canvas Drag State
  let resizeRect = { x: 0, y: 0, w: 200, h: 200 };
  let canvasScale = 1;
  let isDragging = false;
  let dragMode = null; // 'nw' | 'ne' | 'se' | 'sw' | 'e' | 's' | 'move'
  let dragStart = { x: 0, y: 0, rectX: 0, rectY: 0, rectW: 0, rectH: 0 };

  let dom = {};

  function init() {
    dom = {
      container: document.getElementById('tool-image-resizer'),
      dropzone: document.getElementById('ir-dropzone'),
      fileInput: document.getElementById('ir-file-input'),
      browseBtn: document.getElementById('ir-browse-btn'),
      workspace: document.getElementById('ir-workspace'),
      emptyState: document.getElementById('ir-empty-state'),
      fileList: document.getElementById('ir-file-list'),
      
      // Interactive Canvas
      resizeCanvas: document.getElementById('ir-canvas'),

      // Mode switch
      modeDimsRadio: document.getElementById('ir-mode-dims'),
      modePctRadio: document.getElementById('ir-mode-pct'),
      dimsPanel: document.getElementById('ir-dims-panel'),
      pctPanel: document.getElementById('ir-pct-panel'),
      
      // Dimension inputs
      widthInput: document.getElementById('ir-width'),
      heightInput: document.getElementById('ir-height'),
      aspectRatioCheck: document.getElementById('ir-aspect-ratio'),
      
      // Percentage inputs
      pctSlider: document.getElementById('ir-pct-slider'),
      pctVal: document.getElementById('ir-pct-val'),
      pctPresets: document.querySelectorAll('.ir-pct-preset'),
      
      // Format & options
      formatSelect: document.getElementById('ir-format'),
      
      // Preview & stats
      origDimsText: document.getElementById('ir-orig-dims'),
      origSizeText: document.getElementById('ir-orig-size'),
      newDimsText: document.getElementById('ir-new-dims'),
      newSizeText: document.getElementById('ir-new-size'),
      previewImg: document.getElementById('ir-preview'),
      
      // Actions
      resizeBtn: document.getElementById('ir-resize-btn'),
      cropBtn: document.getElementById('ir-crop-btn'),
      downloadBtn: document.getElementById('ir-download-btn'),
      downloadAllBtn: document.getElementById('ir-download-all-btn'),
      resetBtn: document.getElementById('ir-reset-btn'),
      progressBar: document.getElementById('ir-progress-bar'),
      progressContainer: document.getElementById('ir-progress-container'),
      progressText: document.getElementById('ir-progress-text')
    };

    if (!dom.container) return;

    bindEvents();
  }

  function bindEvents() {
    Utils.setupDropZone(dom.dropzone, handleFiles, ['image/', '.jpg', '.jpeg', '.png', '.webp']);
    dom.browseBtn.addEventListener('click', () => dom.fileInput.click());
    dom.fileInput.addEventListener('change', (e) => {
      handleFiles(Array.from(e.target.files));
      dom.fileInput.value = '';
    });

    // Mode toggle
    if (dom.modeDimsRadio) {
      dom.modeDimsRadio.addEventListener('change', () => {
        resizeMode = 'dimensions';
        dom.dimsPanel.classList.remove('hidden');
        dom.pctPanel.classList.add('hidden');
        updateDimensionsFromMode();
        syncCanvasFromInputs();
      });
    }

    if (dom.modePctRadio) {
      dom.modePctRadio.addEventListener('change', () => {
        resizeMode = 'percentage';
        dom.dimsPanel.classList.add('hidden');
        dom.pctPanel.classList.remove('hidden');
        updateDimensionsFromMode();
        syncCanvasFromInputs();
      });
    }

    // Percentage slider & presets
    if (dom.pctSlider) {
      dom.pctSlider.addEventListener('input', (e) => {
        dom.pctVal.textContent = e.target.value + '%';
        updateDimensionsFromMode();
        syncCanvasFromInputs();
      });
    }

    if (dom.pctPresets) {
      dom.pctPresets.forEach(btn => {
        btn.addEventListener('click', () => {
          const val = btn.dataset.pct;
          dom.pctSlider.value = val;
          dom.pctVal.textContent = val + '%';
          updateDimensionsFromMode();
          syncCanvasFromInputs();
        });
      });
    }

    // Dimension inputs with ratio lock
    if (dom.widthInput) {
      dom.widthInput.addEventListener('input', () => {
        const active = files[activeIndex];
        if (active && dom.aspectRatioCheck.checked && dom.widthInput.value) {
          const ratio = active.origWidth / active.origHeight;
          dom.heightInput.value = Math.max(1, Math.round(dom.widthInput.value / ratio));
        }
        updatePreviewStats();
        syncCanvasFromInputs();
      });
    }

    if (dom.heightInput) {
      dom.heightInput.addEventListener('input', () => {
        const active = files[activeIndex];
        if (active && dom.aspectRatioCheck.checked && dom.heightInput.value) {
          const ratio = active.origWidth / active.origHeight;
          dom.widthInput.value = Math.max(1, Math.round(dom.heightInput.value * ratio));
        }
        updatePreviewStats();
        syncCanvasFromInputs();
      });
    }

    // Interactive Canvas Pointer & Touch Events (Laptop Cursor & Mobile Touch Finger Support)
    if (dom.resizeCanvas) {
      dom.resizeCanvas.addEventListener('mousedown', onPointerDown);
      window.addEventListener('mousemove', onPointerMove);
      window.addEventListener('mouseup', onPointerUp);

      dom.resizeCanvas.addEventListener('touchstart', onTouchStart, { passive: false });
      window.addEventListener('touchmove', onTouchMove, { passive: false });
      window.addEventListener('touchend', onPointerUp);
    }

    if (dom.resizeBtn) dom.resizeBtn.addEventListener('click', resizeAll);
    if (dom.cropBtn) dom.cropBtn.addEventListener('click', cropSelection);
    if (dom.downloadBtn) dom.downloadBtn.addEventListener('click', downloadCurrent);
    if (dom.downloadAllBtn) dom.downloadAllBtn.addEventListener('click', downloadAll);
    if (dom.resetBtn) dom.resetBtn.addEventListener('click', resetTool);
  }

  async function handleFiles(newFiles) {
    if (!newFiles || newFiles.length === 0) return;

    const pdfFiles = newFiles.filter(f => f.type === 'application/pdf' || /\.pdf$/i.test(f.name));
    if (pdfFiles.length > 0 && newFiles.length === pdfFiles.length) {
      Utils.showToast(`You uploaded a PDF file ("${pdfFiles[0].name}"). Image Resizer only supports images (JPG, PNG, WebP).`, 'warning');
      return;
    }

    const valid = newFiles.filter(f => f.type.startsWith('image/') || /\.(jpg|jpeg|png|webp|gif|bmp)$/i.test(f.name));
    if (valid.length === 0) {
      Utils.showToast('Please upload valid image files.', 'warning');
      return;
    }

    Utils.setProcessing(true);
    showProgress(15, 'Loading image metadata...');

    try {
      for (const file of valid) {
        const dataUrl = await Utils.readFileAsDataURL(file);
        const img = await Utils.loadImage(dataUrl);

        files.push({
          file,
          name: file.name,
          dataUrl,
          img,
          origWidth: img.naturalWidth,
          origHeight: img.naturalHeight,
          origSize: file.size,
          resizedBlob: null,
          resizedUrl: null,
          resizedWidth: img.naturalWidth,
          resizedHeight: img.naturalHeight
        });
      }

      dom.emptyState.classList.add('hidden');
      dom.workspace.classList.remove('hidden');

      activeIndex = 0;
      updateActiveFile();
      renderFileList();
      Utils.showToast(`Loaded ${valid.length} image(s). Drag handles on canvas or use inputs to resize!`, 'success');
    } catch (err) {
      console.error(err);
      Utils.showToast('Error loading images: ' + err.message, 'error');
    } finally {
      Utils.setProcessing(false);
      hideProgress();
    }
  }

  function updateActiveFile() {
    const active = files[activeIndex];
    if (!active) return;

    dom.origDimsText.textContent = `${active.origWidth} × ${active.origHeight} px`;
    dom.origSizeText.textContent = Utils.formatBytes(active.origSize);
    if (dom.previewImg) dom.previewImg.src = active.resizedUrl || active.dataUrl;

    if (active.resizedBlob) {
      dom.newDimsText.textContent = `${active.resizedWidth} × ${active.resizedHeight} px`;
      dom.newSizeText.textContent = Utils.formatBytes(active.resizedBlob.size);
      dom.downloadBtn.disabled = false;
    } else {
      dom.newDimsText.textContent = '-';
      dom.newSizeText.textContent = '-';
      dom.downloadBtn.disabled = true;
    }

    updateDimensionsFromMode();
    initResizeCanvas();

    if (files.length > 1) {
      dom.downloadAllBtn.classList.remove('hidden');
    } else {
      dom.downloadAllBtn.classList.add('hidden');
    }
  }

  function initResizeCanvas() {
    const active = files[activeIndex];
    if (!active || !dom.resizeCanvas) return;

    const maxW = 680;
    const maxH = 460;

    let displayW = active.origWidth;
    let displayH = active.origHeight;

    if (displayW > maxW || displayH > maxH) {
      const scaleX = maxW / displayW;
      const scaleY = maxH / displayH;
      canvasScale = Math.min(scaleX, scaleY);
      displayW = Math.round(displayW * canvasScale);
      displayH = Math.round(displayH * canvasScale);
    } else {
      canvasScale = 1;
    }

    dom.resizeCanvas.width = displayW;
    dom.resizeCanvas.height = displayH;

    syncCanvasFromInputs();
  }

  function syncCanvasFromInputs() {
    const active = files[activeIndex];
    if (!active || !dom.resizeCanvas) return;

    const userW = parseInt(dom.widthInput.value, 10) || active.origWidth;
    const userH = parseInt(dom.heightInput.value, 10) || active.origHeight;

    const displayW = Math.min(dom.resizeCanvas.width, Math.round(userW * canvasScale));
    const displayH = Math.min(dom.resizeCanvas.height, Math.round(userH * canvasScale));

    resizeRect = {
      x: Math.round((dom.resizeCanvas.width - displayW) / 2),
      y: Math.round((dom.resizeCanvas.height - displayH) / 2),
      w: Math.max(20, displayW),
      h: Math.max(20, displayH)
    };

    drawResizeCanvas();
  }

  function drawResizeCanvas() {
    const active = files[activeIndex];
    if (!active || !dom.resizeCanvas) return;

    const canvas = dom.resizeCanvas;
    const ctx = canvas.getContext('2d');

    // 1. Draw base image scaled to display canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(active.img, 0, 0, canvas.width, canvas.height);

    // 2. Darken area outside target resize box
    ctx.fillStyle = 'rgba(0, 0, 0, 0.42)';
    ctx.fillRect(0, 0, canvas.width, resizeRect.y);
    ctx.fillRect(0, resizeRect.y + resizeRect.h, canvas.width, canvas.height - (resizeRect.y + resizeRect.h));
    ctx.fillRect(0, resizeRect.y, resizeRect.x, resizeRect.h);
    ctx.fillRect(resizeRect.x + resizeRect.w, resizeRect.y, canvas.width - (resizeRect.x + resizeRect.w), resizeRect.h);

    // 3. Glowing bounding box
    ctx.strokeStyle = '#3b82f6';
    ctx.lineWidth = 2.5;
    ctx.strokeRect(resizeRect.x, resizeRect.y, resizeRect.w, resizeRect.h);

    // 4. Handles (Corners & Middle Edges)
    const handleSize = 12;
    ctx.fillStyle = '#3b82f6';

    const corners = [
      { x: resizeRect.x, y: resizeRect.y }, // NW
      { x: resizeRect.x + resizeRect.w, y: resizeRect.y }, // NE
      { x: resizeRect.x + resizeRect.w, y: resizeRect.y + resizeRect.h }, // SE
      { x: resizeRect.x, y: resizeRect.y + resizeRect.h }, // SW
      { x: resizeRect.x + resizeRect.w / 2, y: resizeRect.y + resizeRect.h }, // S
      { x: resizeRect.x + resizeRect.w, y: resizeRect.y + resizeRect.h / 2 }  // E
    ];

    corners.forEach(c => {
      ctx.fillRect(c.x - handleSize / 2, c.y - handleSize / 2, handleSize, handleSize);
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(c.x - handleSize / 2, c.y - handleSize / 2, handleSize, handleSize);
    });

    // 5. Dimension Badge on top of resize box
    const realW = Math.round(resizeRect.w / canvasScale);
    const realH = Math.round(resizeRect.h / canvasScale);
    const badgeText = `${realW} × ${realH} px`;

    ctx.font = 'bold 12px sans-serif';
    const textWidth = ctx.measureText(badgeText).width;
    const badgeX = Math.max(5, resizeRect.x + (resizeRect.w - textWidth - 16) / 2);
    const badgeY = Math.max(22, resizeRect.y - 8);

    ctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
    if (typeof ctx.roundRect === 'function') {
      ctx.beginPath();
      ctx.roundRect(badgeX, badgeY - 14, textWidth + 16, 20, 4);
      ctx.fill();
    } else {
      ctx.fillRect(badgeX, badgeY - 14, textWidth + 16, 20);
    }

    ctx.fillStyle = '#ffffff';
    ctx.fillText(badgeText, badgeX + 8, badgeY);
  }

  function getCanvasCoords(e) {
    const rect = dom.resizeCanvas.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return {
      x: (clientX - rect.left) * (dom.resizeCanvas.width / rect.width),
      y: (clientY - rect.top) * (dom.resizeCanvas.height / rect.height)
    };
  }

  function onPointerDown(e) {
    if (!files[activeIndex] || !dom.resizeCanvas) return;
    const coords = getCanvasCoords(e);
    const hSize = 20;

    // Check handle collision
    if (Math.abs(coords.x - resizeRect.x) < hSize && Math.abs(coords.y - resizeRect.y) < hSize) {
      dragMode = 'nw';
    } else if (Math.abs(coords.x - (resizeRect.x + resizeRect.w)) < hSize && Math.abs(coords.y - resizeRect.y) < hSize) {
      dragMode = 'ne';
    } else if (Math.abs(coords.x - (resizeRect.x + resizeRect.w)) < hSize && Math.abs(coords.y - (resizeRect.y + resizeRect.h)) < hSize) {
      dragMode = 'se';
    } else if (Math.abs(coords.x - resizeRect.x) < hSize && Math.abs(coords.y - (resizeRect.y + resizeRect.h)) < hSize) {
      dragMode = 'sw';
    } else if (Math.abs(coords.x - (resizeRect.x + resizeRect.w / 2)) < hSize && Math.abs(coords.y - (resizeRect.y + resizeRect.h)) < hSize) {
      dragMode = 's';
    } else if (Math.abs(coords.x - (resizeRect.x + resizeRect.w)) < hSize && Math.abs(coords.y - (resizeRect.y + resizeRect.h / 2)) < hSize) {
      dragMode = 'e';
    } else if (coords.x >= resizeRect.x && coords.x <= resizeRect.x + resizeRect.w && coords.y >= resizeRect.y && coords.y <= resizeRect.y + resizeRect.h) {
      dragMode = 'move';
    } else {
      dragMode = null;
      return;
    }

    isDragging = true;
    dragStart = {
      x: coords.x,
      y: coords.y,
      rectX: resizeRect.x,
      rectY: resizeRect.y,
      rectW: resizeRect.w,
      rectH: resizeRect.h
    };
  }

  function onPointerMove(e) {
    if (!isDragging || !dom.resizeCanvas) return;
    const coords = getCanvasCoords(e);
    const dx = coords.x - dragStart.x;
    const dy = coords.y - dragStart.y;
    const active = files[activeIndex];
    const lockRatio = dom.aspectRatioCheck ? dom.aspectRatioCheck.checked : true;
    const ratio = active ? (active.origWidth / active.origHeight) : 1;

    if (dragMode === 'move') {
      let newX = dragStart.rectX + dx;
      let newY = dragStart.rectY + dy;
      newX = Math.max(0, Math.min(dom.resizeCanvas.width - resizeRect.w, newX));
      newY = Math.max(0, Math.min(dom.resizeCanvas.height - resizeRect.h, newY));
      resizeRect.x = newX;
      resizeRect.y = newY;
    } else if (dragMode === 'se') {
      let newW = Math.max(20, Math.min(dom.resizeCanvas.width - dragStart.rectX, dragStart.rectW + dx));
      let newH = lockRatio ? Math.round(newW / ratio) : Math.max(20, Math.min(dom.resizeCanvas.height - dragStart.rectY, dragStart.rectH + dy));
      resizeRect.w = newW;
      resizeRect.h = newH;
    } else if (dragMode === 'e') {
      let newW = Math.max(20, Math.min(dom.resizeCanvas.width - dragStart.rectX, dragStart.rectW + dx));
      let newH = lockRatio ? Math.round(newW / ratio) : resizeRect.h;
      resizeRect.w = newW;
      resizeRect.h = newH;
    } else if (dragMode === 's') {
      let newH = Math.max(20, Math.min(dom.resizeCanvas.height - dragStart.rectY, dragStart.rectH + dy));
      let newW = lockRatio ? Math.round(newH * ratio) : resizeRect.w;
      resizeRect.w = newW;
      resizeRect.h = newH;
    } else if (dragMode === 'sw') {
      let newX = Math.max(0, Math.min(dragStart.rectX + dragStart.rectW - 20, dragStart.rectX + dx));
      let newW = (dragStart.rectX + dragStart.rectW) - newX;
      let newH = lockRatio ? Math.round(newW / ratio) : Math.max(20, Math.min(dom.resizeCanvas.height - dragStart.rectY, dragStart.rectH + dy));
      resizeRect.x = newX;
      resizeRect.w = newW;
      resizeRect.h = newH;
    } else if (dragMode === 'ne') {
      let newY = Math.max(0, Math.min(dragStart.rectY + dragStart.rectH - 20, dragStart.rectY + dy));
      let newH = (dragStart.rectY + dragStart.rectH) - newY;
      let newW = lockRatio ? Math.round(newH * ratio) : Math.max(20, Math.min(dom.resizeCanvas.width - dragStart.rectX, dragStart.rectW + dx));
      resizeRect.y = newY;
      resizeRect.h = newH;
      resizeRect.w = newW;
    } else if (dragMode === 'nw') {
      let newX = Math.max(0, Math.min(dragStart.rectX + dragStart.rectW - 20, dragStart.rectX + dx));
      let newY = Math.max(0, Math.min(dragStart.rectY + dragStart.rectH - 20, dragStart.rectY + dy));
      let newW = (dragStart.rectX + dragStart.rectW) - newX;
      let newH = lockRatio ? Math.round(newW / ratio) : (dragStart.rectY + dragStart.rectH) - newY;
      resizeRect.x = newX;
      resizeRect.y = newY;
      resizeRect.w = newW;
      resizeRect.h = newH;
    }

    updateInputsFromRect();
    drawResizeCanvas();
  }

  function updateInputsFromRect() {
    const active = files[activeIndex];
    if (!active) return;
    const realW = Math.max(1, Math.round(resizeRect.w / canvasScale));
    const realH = Math.max(1, Math.round(resizeRect.h / canvasScale));

    if (dom.widthInput) dom.widthInput.value = realW;
    if (dom.heightInput) dom.heightInput.value = realH;

    if (resizeMode === 'percentage' && dom.pctSlider && dom.pctVal) {
      const pct = Math.round((realW / active.origWidth) * 100);
      dom.pctSlider.value = pct;
      dom.pctVal.textContent = pct + '%';
    }

    updatePreviewStats();
  }

  function onPointerUp() {
    isDragging = false;
    dragMode = null;
  }

  function onTouchStart(e) {
    if (e.touches.length === 1) {
      e.preventDefault();
      onPointerDown(e);
    }
  }

  function onTouchMove(e) {
    if (isDragging && e.touches.length === 1) {
      e.preventDefault();
      onPointerMove(e);
    }
  }

  function updateDimensionsFromMode() {
    const active = files[activeIndex];
    if (!active) return;

    if (resizeMode === 'percentage' && dom.pctSlider) {
      const pct = parseInt(dom.pctSlider.value, 10) / 100;
      const targetW = Math.max(1, Math.round(active.origWidth * pct));
      const targetH = Math.max(1, Math.round(active.origHeight * pct));
      if (dom.widthInput) dom.widthInput.value = targetW;
      if (dom.heightInput) dom.heightInput.value = targetH;
    } else {
      if (dom.widthInput && (!dom.widthInput.value || dom.widthInput.value <= 0)) {
        dom.widthInput.value = active.origWidth;
      }
      if (dom.heightInput && (!dom.heightInput.value || dom.heightInput.value <= 0)) {
        dom.heightInput.value = active.origHeight;
      }
    }
    updatePreviewStats();
  }

  function updatePreviewStats() {
    if (!dom.widthInput || !dom.heightInput || !dom.newDimsText) return;
    const w = parseInt(dom.widthInput.value, 10);
    const h = parseInt(dom.heightInput.value, 10);
    if (w && h) {
      dom.newDimsText.textContent = `${w} × ${h} px (target)`;
    }
  }

  function renderFileList() {
    if (!dom.fileList) return;
    dom.fileList.innerHTML = '';
    if (files.length <= 1) {
      dom.fileList.classList.add('hidden');
      return;
    }

    dom.fileList.classList.remove('hidden');
    files.forEach((item, idx) => {
      const chip = document.createElement('div');
      chip.className = `file-chip ${idx === activeIndex ? 'active' : ''}`;
      chip.innerHTML = `
        <img src="${item.dataUrl}" class="chip-thumb" alt="thumb">
        <span class="chip-name" title="${item.name}">${item.name}</span>
        <span class="chip-size">${item.resizedBlob ? Utils.formatBytes(item.resizedBlob.size) : Utils.formatBytes(item.origSize)}</span>
        <button type="button" class="chip-remove" title="Remove">&times;</button>
      `;

      chip.addEventListener('click', (e) => {
        if (e.target.classList.contains('chip-remove')) {
          e.stopPropagation();
          removeFile(idx);
          return;
        }
        activeIndex = idx;
        renderFileList();
        updateActiveFile();
      });

      dom.fileList.appendChild(chip);
    });
  }

  function removeFile(index) {
    if (files[index].resizedUrl) URL.revokeObjectURL(files[index].resizedUrl);
    files.splice(index, 1);
    if (files.length === 0) {
      resetTool();
      return;
    }
    if (activeIndex >= files.length) activeIndex = files.length - 1;
    renderFileList();
    updateActiveFile();
  }

  async function resizeSingle(item, targetW, targetH, format) {
    const img = await Utils.loadImage(item.dataUrl);
    const canvas = document.createElement('canvas');
    canvas.width = targetW;
    canvas.height = targetH;
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    let mime = 'image/jpeg';
    let ext = 'jpg';
    if (format === 'png') {
      mime = 'image/png';
      ext = 'png';
    } else if (format === 'webp') {
      mime = 'image/webp';
      ext = 'webp';
    } else if (format === 'original') {
      mime = item.file.type || 'image/jpeg';
      ext = Utils.getExtension(item.name) || 'jpg';
      if (mime === 'image/gif' || mime === 'image/svg+xml') {
        mime = 'image/png';
        ext = 'png';
      }
    }

    if (mime === 'image/jpeg') {
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, targetW, targetH);
    }

    ctx.drawImage(img, 0, 0, targetW, targetH);

    const blob = await Utils.canvasToBlob(canvas, mime, 0.9);
    return {
      blob,
      width: targetW,
      height: targetH,
      outputExt: ext
    };
  }

  async function resizeAll() {
    if (files.length === 0) return;

    Utils.setProcessing(true);
    showProgress(10, 'Resizing image(s)...');

    const format = dom.formatSelect ? dom.formatSelect.value : 'original';
    const active = files[activeIndex];
    const userTargetW = parseInt(dom.widthInput ? dom.widthInput.value : active.origWidth, 10) || active.origWidth;
    const userTargetH = parseInt(dom.heightInput ? dom.heightInput.value : active.origHeight, 10) || active.origHeight;
    const pct = parseInt(dom.pctSlider ? dom.pctSlider.value : 100, 10) / 100;

    try {
      for (let i = 0; i < files.length; i++) {
        const item = files[i];
        const progressPct = Math.round(((i + 1) / files.length) * 100);
        showProgress(progressPct, `Resizing (${i + 1}/${files.length}): ${item.name}`);

        let targetW, targetH;
        if (resizeMode === 'percentage') {
          targetW = Math.max(1, Math.round(item.origWidth * pct));
          targetH = Math.max(1, Math.round(item.origHeight * pct));
        } else {
          if (i === activeIndex) {
            targetW = userTargetW;
            targetH = userTargetH;
          } else {
            const scaleFactor = userTargetW / active.origWidth;
            targetW = Math.max(1, Math.round(item.origWidth * scaleFactor));
            targetH = Math.max(1, Math.round(item.origHeight * scaleFactor));
          }
        }

        const res = await resizeSingle(item, targetW, targetH, format);
        if (item.resizedUrl) URL.revokeObjectURL(item.resizedUrl);

        item.resizedBlob = res.blob;
        item.resizedUrl = URL.createObjectURL(res.blob);
        item.resizedWidth = res.width;
        item.resizedHeight = res.height;
        item.outputExt = res.outputExt;
      }

      updateActiveFile();
      renderFileList();
      Utils.showToast(`Successfully resized ${files.length} image(s)!`, 'success');
    } catch (err) {
      console.error(err);
      Utils.showToast('Resize failed: ' + err.message, 'error');
    } finally {
      Utils.setProcessing(false);
      hideProgress();
    }
  }

  async function cropSelection() {
    const active = files[activeIndex];
    if (!active) return;

    Utils.setProcessing(true);
    showProgress(30, 'Cropping selected area...');

    try {
      const realX = Math.round(resizeRect.x / canvasScale);
      const realY = Math.round(resizeRect.y / canvasScale);
      const realW = Math.round(resizeRect.w / canvasScale);
      const realH = Math.round(resizeRect.h / canvasScale);

      const outCanvas = document.createElement('canvas');
      outCanvas.width = realW;
      outCanvas.height = realH;
      const ctx = outCanvas.getContext('2d');
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';

      ctx.drawImage(active.img, realX, realY, realW, realH, 0, 0, realW, realH);

      const format = dom.formatSelect ? dom.formatSelect.value : 'original';
      let mime = 'image/jpeg';
      let ext = 'jpg';
      if (format === 'png') { mime = 'image/png'; ext = 'png'; }
      else if (format === 'webp') { mime = 'image/webp'; ext = 'webp'; }
      else if (format === 'original') {
        mime = active.file.type || 'image/jpeg';
        ext = Utils.getExtension(active.name) || 'jpg';
      }

      showProgress(70, 'Encoding cropped selection...');
      const blob = await Utils.canvasToBlob(outCanvas, mime, 0.9);
      if (active.resizedUrl) URL.revokeObjectURL(active.resizedUrl);

      active.resizedBlob = blob;
      active.resizedUrl = URL.createObjectURL(blob);
      active.resizedWidth = realW;
      active.resizedHeight = realH;
      active.outputExt = ext;

      const newImg = await Utils.loadImage(active.resizedUrl);
      active.img = newImg;
      active.origWidth = realW;
      active.origHeight = realH;

      updateActiveFile();
      renderFileList();
      Utils.showToast(`Cropped selection to ${realW} × ${realH} px! Click Download Image to save.`, 'success');
    } catch (err) {
      console.error(err);
      Utils.showToast('Crop failed: ' + err.message, 'error');
    } finally {
      Utils.setProcessing(false);
      hideProgress();
    }
  }

  function downloadCurrent() {
    const active = files[activeIndex];
    if (!active || !active.resizedBlob) return;
    const filename = `${Utils.getBaseName(active.name)}-resized.${active.outputExt}`;
    Utils.downloadBlob(active.resizedBlob, filename);
  }

  async function downloadAll() {
    const resizedItems = files.filter(f => f.resizedBlob);
    if (resizedItems.length === 0) return;

    if (resizedItems.length === 1) {
      downloadCurrent();
      return;
    }

    const zipFiles = resizedItems.map(item => ({
      name: `${Utils.getBaseName(item.name)}-resized.${item.outputExt}`,
      blob: item.resizedBlob
    }));

    showProgress(50, 'Creating ZIP archive...');
    await Utils.downloadAsZip(zipFiles, 'fileforge-resized-images.zip', (pct, txt) => {
      showProgress(pct, txt);
    });
    hideProgress();
  }

  function resetTool() {
    files.forEach(f => {
      if (f.resizedUrl) URL.revokeObjectURL(f.resizedUrl);
    });
    files = [];
    activeIndex = 0;
    isDragging = false;
    dragMode = null;

    if (dom.emptyState) dom.emptyState.classList.remove('hidden');
    if (dom.workspace) dom.workspace.classList.add('hidden');
    if (dom.downloadBtn) dom.downloadBtn.disabled = true;
    if (dom.previewImg) dom.previewImg.src = '';
    if (dom.origDimsText) dom.origDimsText.textContent = '-';
    if (dom.origSizeText) dom.origSizeText.textContent = '-';
    if (dom.newDimsText) dom.newDimsText.textContent = '-';
    if (dom.newSizeText) dom.newSizeText.textContent = '-';
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

window.ImageResizer = ImageResizer;
