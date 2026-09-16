/**
 * FileForge - PDF Crop Tool (Interactive Freeform & Box Clipping)
 * 
 * High-fidelity client-side PDF cropping engine:
 * 1. 100% Lossless: Crops PDF page boxes (CropBox/MediaBox) directly via pdf-lib without rasterization.
 * 2. Interactive Freeform Cropping: Drag & resize crop box directly on canvas using touch or mouse.
 * 3. 8-point Anchor Handles: 4 Corner handles (NW, NE, SE, SW) + 4 Edge handles (N, S, E, W) + Center move.
 * 4. Bi-directional Sync: Dragging canvas updates margin inputs; changing inputs updates canvas.
 * 5. Accurate Coordinate Math with Rotation Support (0°, 90°, 180°, 270°).
 * 6. Preserves selectable text, vector graphics, fonts, and annotations.
 */

const PDFCrop = (() => {
  let currentFile = null; // { file, name, size, buffer, pageCount, pdf, pageWidth, pageHeight }
  let page1CanvasCache = null;
  let generatedPdfBlob = null;
  let canvasScale = 1;

  // Interactive Crop Rectangle (in display canvas pixels)
  let cropRect = { x: 0, y: 0, w: 0, h: 0 };
  let isDragging = false;
  let dragMode = null; // 'move' | 'nw' | 'ne' | 'se' | 'sw' | 'n' | 's' | 'e' | 'w'
  let dragStart = { x: 0, y: 0, cropX: 0, cropY: 0, cropW: 0, cropH: 0 };

  let dom = {};

  function init() {
    dom = {
      container: document.getElementById('tool-pdf-crop'),
      dropzone: document.getElementById('pcrop-dropzone'),
      fileInput: document.getElementById('pcrop-file-input'),
      browseBtn: document.getElementById('pcrop-browse-btn'),
      workspace: document.getElementById('pcrop-workspace'),
      emptyState: document.getElementById('pcrop-empty-state'),
      
      // Margin Inputs
      topInput: document.getElementById('pcrop-top'),
      bottomInput: document.getElementById('pcrop-bottom'),
      leftInput: document.getElementById('pcrop-left'),
      rightInput: document.getElementById('pcrop-right'),
      
      // Presets
      trimPresets: document.querySelectorAll('.pcrop-preset-btn'),
      resetCropBtn: document.getElementById('pcrop-reset-crop-btn'),
      sizeBadge: document.getElementById('pcrop-size-badge'),
      
      // Preview
      previewCanvas: document.getElementById('pcrop-preview-canvas'),
      
      // Actions
      applyBtn: document.getElementById('pcrop-apply-btn'),
      downloadBtn: document.getElementById('pcrop-download-btn'),
      resetBtn: document.getElementById('pcrop-reset-btn'),
      progressBar: document.getElementById('pcrop-progress-bar'),
      progressContainer: document.getElementById('pcrop-progress-container'),
      progressText: document.getElementById('pcrop-progress-text')
    };

    if (!dom.container) return;

    bindEvents();
  }

  function bindEvents() {
    Utils.setupDropZone(dom.dropzone, handleFiles, ['.pdf', 'application/pdf']);
    dom.browseBtn.addEventListener('click', () => dom.fileInput.click());
    dom.fileInput.addEventListener('change', (e) => {
      handleFiles(Array.from(e.target.files));
      dom.fileInput.value = '';
    });

    [dom.topInput, dom.bottomInput, dom.leftInput, dom.rightInput].forEach(inp => {
      if (inp) inp.addEventListener('input', updateCropFromInputs);
    });

    if (dom.trimPresets) {
      dom.trimPresets.forEach(btn => {
        btn.addEventListener('click', () => {
          const val = parseInt(btn.dataset.margin, 10) || 0;
          if (dom.topInput) dom.topInput.value = val;
          if (dom.bottomInput) dom.bottomInput.value = val;
          if (dom.leftInput) dom.leftInput.value = val;
          if (dom.rightInput) dom.rightInput.value = val;
          updateCropFromInputs();
        });
      });
    }

    if (dom.resetCropBtn) {
      dom.resetCropBtn.addEventListener('click', () => {
        resetCropMargins();
      });
    }

    // Pointer Events for Interactive Freeform Cropping (Mouse + Touch)
    if (dom.previewCanvas) {
      dom.previewCanvas.addEventListener('mousedown', onPointerDown);
      window.addEventListener('mousemove', onPointerMove);
      window.addEventListener('mouseup', onPointerUp);

      dom.previewCanvas.addEventListener('touchstart', onTouchStart, { passive: false });
      window.addEventListener('touchmove', onTouchMove, { passive: false });
      window.addEventListener('touchend', onPointerUp);
    }

    dom.applyBtn.addEventListener('click', applyCrop);
    dom.downloadBtn.addEventListener('click', downloadCroppedPDF);
    dom.resetBtn.addEventListener('click', resetTool);
  }

  async function handleFiles(files) {
    if (!files || files.length === 0) return;
    const file = files[0];

    if (!file.name.toLowerCase().endsWith('.pdf') && file.type !== 'application/pdf') {
      const ext = Utils.getExtension(file.name);
      if (/^(jpg|jpeg|png|webp|gif|bmp|svg)$/i.test(ext) || file.type.startsWith('image/')) {
        Utils.showToast(`You uploaded an image file ("${file.name}"). PDF Crop only accepts PDF documents.`, 'warning');
      } else {
        Utils.showToast(`Invalid file format ("${file.name}"). Please upload a valid PDF document.`, 'warning');
      }
      return;
    }

    Utils.setProcessing(true);
    showProgress(20, 'Loading PDF document...');

    try {
      const buffer = await Utils.readFileAsArrayBuffer(file);
      const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(buffer.slice(0)) });
      const pdf = await loadingTask.promise;
      const pageCount = pdf.numPages;

      const page1 = await pdf.getPage(1);
      const unscaledViewport = page1.getViewport({ scale: 1.0 });

      currentFile = {
        file,
        name: file.name,
        size: file.size,
        buffer,
        pageCount,
        pdf,
        pageWidth: unscaledViewport.width,
        pageHeight: unscaledViewport.height
      };

      dom.emptyState.classList.add('hidden');
      dom.workspace.classList.remove('hidden');
      dom.downloadBtn.classList.add('hidden');
      dom.applyBtn.classList.remove('hidden');
      dom.applyBtn.disabled = false;

      await renderPageOnePreview();
      Utils.showToast(`Loaded "${file.name}" (${pageCount} pages). Drag box or handles to crop! ✂️`, 'info');
    } catch (err) {
      console.error(err);
      Utils.showToast('Failed to load PDF: ' + (err.message || 'Corrupted file'), 'error');
      resetTool();
    } finally {
      Utils.setProcessing(false);
      hideProgress();
    }
  }

  async function renderPageOnePreview() {
    if (!currentFile || !currentFile.pdf || !dom.previewCanvas) return;
    try {
      const page = await currentFile.pdf.getPage(1);
      const maxDisplayW = 680;
      const maxDisplayH = 500;

      const baseViewport = page.getViewport({ scale: 1.0 });
      let scale = 1.0;
      if (baseViewport.width > maxDisplayW || baseViewport.height > maxDisplayH) {
        scale = Math.min(maxDisplayW / baseViewport.width, maxDisplayH / baseViewport.height);
      }
      canvasScale = scale;

      const viewport = page.getViewport({ scale });

      const offscreen = document.createElement('canvas');
      offscreen.width = Math.round(viewport.width);
      offscreen.height = Math.round(viewport.height);
      const ctx = offscreen.getContext('2d', { alpha: false });

      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, offscreen.width, offscreen.height);

      await page.render({ canvasContext: ctx, viewport }).promise;
      page1CanvasCache = offscreen;

      dom.previewCanvas.width = offscreen.width;
      dom.previewCanvas.height = offscreen.height;

      // Initialize crop rect to full page by default
      cropRect = {
        x: 0,
        y: 0,
        w: offscreen.width,
        h: offscreen.height
      };

      if (dom.topInput) dom.topInput.value = 0;
      if (dom.bottomInput) dom.bottomInput.value = 0;
      if (dom.leftInput) dom.leftInput.value = 0;
      if (dom.rightInput) dom.rightInput.value = 0;

      drawCropCanvas();
    } catch (err) {
      console.warn('Crop preview render error:', err);
    }
  }

  function resetCropMargins() {
    if (!dom.previewCanvas) return;
    cropRect = {
      x: 0,
      y: 0,
      w: dom.previewCanvas.width,
      h: dom.previewCanvas.height
    };
    if (dom.topInput) dom.topInput.value = 0;
    if (dom.bottomInput) dom.bottomInput.value = 0;
    if (dom.leftInput) dom.leftInput.value = 0;
    if (dom.rightInput) dom.rightInput.value = 0;
    drawCropCanvas();
  }

  function updateCropFromInputs() {
    if (!page1CanvasCache || !dom.previewCanvas || !currentFile) return;

    const topPt = Math.max(0, parseInt(dom.topInput ? dom.topInput.value : 0, 10) || 0);
    const bottomPt = Math.max(0, parseInt(dom.bottomInput ? dom.bottomInput.value : 0, 10) || 0);
    const leftPt = Math.max(0, parseInt(dom.leftInput ? dom.leftInput.value : 0, 10) || 0);
    const rightPt = Math.max(0, parseInt(dom.rightInput ? dom.rightInput.value : 0, 10) || 0);

    const canvasW = dom.previewCanvas.width;
    const canvasH = dom.previewCanvas.height;

    const x = Math.min(canvasW - 10, Math.round(leftPt * canvasScale));
    const y = Math.min(canvasH - 10, Math.round(topPt * canvasScale));
    const r = Math.round(rightPt * canvasScale);
    const b = Math.round(bottomPt * canvasScale);

    const w = Math.max(10, canvasW - x - r);
    const h = Math.max(10, canvasH - y - b);

    cropRect = { x, y, w, h };
    drawCropCanvas(false);
  }

  function updateInputsFromCropRect() {
    if (!page1CanvasCache || !dom.previewCanvas || !currentFile) return;

    const canvasW = dom.previewCanvas.width;
    const canvasH = dom.previewCanvas.height;

    const leftPt = Math.max(0, Math.round(cropRect.x / canvasScale));
    const topPt = Math.max(0, Math.round(cropRect.y / canvasScale));
    const rightPt = Math.max(0, Math.round((canvasW - (cropRect.x + cropRect.w)) / canvasScale));
    const bottomPt = Math.max(0, Math.round((canvasH - (cropRect.y + cropRect.h)) / canvasScale));

    if (dom.topInput) dom.topInput.value = topPt;
    if (dom.bottomInput) dom.bottomInput.value = bottomPt;
    if (dom.leftInput) dom.leftInput.value = leftPt;
    if (dom.rightInput) dom.rightInput.value = rightPt;

    const croppedW = Math.max(1, Math.round(cropRect.w / canvasScale));
    const croppedH = Math.max(1, Math.round(cropRect.h / canvasScale));
    if (dom.sizeBadge) {
      dom.sizeBadge.textContent = `${croppedW} × ${croppedH} pt`;
    }
  }

  function drawCropCanvas(syncInputs = true) {
    if (!page1CanvasCache || !dom.previewCanvas) return;

    const canvas = dom.previewCanvas;
    const ctx = canvas.getContext('2d', { alpha: false });

    // 1. Draw base page
    ctx.drawImage(page1CanvasCache, 0, 0);

    const cx = Math.max(0, Math.min(canvas.width - 10, cropRect.x));
    const cy = Math.max(0, Math.min(canvas.height - 10, cropRect.y));
    const cw = Math.max(10, Math.min(canvas.width - cx, cropRect.w));
    const ch = Math.max(10, Math.min(canvas.height - cy, cropRect.h));

    // 2. Darkened semi-transparent overlay on cropped-out regions
    ctx.fillStyle = 'rgba(8, 12, 20, 0.62)';
    ctx.fillRect(0, 0, canvas.width, cy); // Top
    ctx.fillRect(0, cy + ch, canvas.width, canvas.height - (cy + ch)); // Bottom
    ctx.fillRect(0, cy, cx, ch); // Left
    ctx.fillRect(cx + cw, cy, canvas.width - (cx + cw), ch); // Right

    // 3. Highlighted Crop Area Box
    ctx.strokeStyle = '#6366f1';
    ctx.lineWidth = 2.5;
    ctx.setLineDash([]);
    ctx.strokeRect(cx, cy, cw, ch);

    // 4. Rule of thirds grid lines
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);

    const thirdW = cw / 3;
    const thirdH = ch / 3;

    ctx.beginPath();
    ctx.moveTo(cx + thirdW, cy);
    ctx.lineTo(cx + thirdW, cy + ch);
    ctx.moveTo(cx + thirdW * 2, cy);
    ctx.lineTo(cx + thirdW * 2, cy + ch);

    ctx.moveTo(cx, cy + thirdH);
    ctx.lineTo(cx + cw, cy + thirdH);
    ctx.moveTo(cx, cy + thirdH * 2);
    ctx.lineTo(cx + cw, cy + thirdH * 2);
    ctx.stroke();
    ctx.setLineDash([]);

    // 5. Draw 8 Anchor Handles (4 Corners + 4 Edges)
    const handleRadius = 6;
    const drawHandle = (hx, hy) => {
      ctx.fillStyle = '#ffffff';
      ctx.strokeStyle = '#6366f1';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(hx, hy, handleRadius, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    };

    // Corners
    drawHandle(cx, cy); // NW
    drawHandle(cx + cw, cy); // NE
    drawHandle(cx + cw, cy + ch); // SE
    drawHandle(cx, cy + ch); // SW

    // Edges
    drawHandle(cx + cw / 2, cy); // N
    drawHandle(cx + cw, cy + ch / 2); // E
    drawHandle(cx + cw / 2, cy + ch); // S
    drawHandle(cx, cy + ch / 2); // W

    if (syncInputs) {
      updateInputsFromCropRect();
    }
  }

  // Coordinate helper
  function getCanvasCoords(e) {
    const rect = dom.previewCanvas.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return {
      x: (clientX - rect.left) * (dom.previewCanvas.width / rect.width),
      y: (clientY - rect.top) * (dom.previewCanvas.height / rect.height)
    };
  }

  function getHitMode(x, y) {
    const cx = cropRect.x;
    const cy = cropRect.y;
    const cw = cropRect.w;
    const ch = cropRect.h;
    const hitRadius = 18; // Generous touch target

    // Check corners
    if (Math.hypot(x - cx, y - cy) <= hitRadius) return 'nw';
    if (Math.hypot(x - (cx + cw), y - cy) <= hitRadius) return 'ne';
    if (Math.hypot(x - (cx + cw), y - (cy + ch)) <= hitRadius) return 'se';
    if (Math.hypot(x - cx, y - (cy + ch)) <= hitRadius) return 'sw';

    // Check edges
    if (Math.hypot(x - (cx + cw / 2), y - cy) <= hitRadius) return 'n';
    if (Math.hypot(x - (cx + cw), y - (cy + ch / 2)) <= hitRadius) return 'e';
    if (Math.hypot(x - (cx + cw / 2), y - (cy + ch)) <= hitRadius) return 's';
    if (Math.hypot(x - cx, y - (cy + ch / 2)) <= hitRadius) return 'w';

    // Check inside box
    if (x >= cx && x <= cx + cw && y >= cy && y <= cy + ch) return 'move';

    return null;
  }

  function onPointerDown(e) {
    if (!dom.previewCanvas) return;
    const coords = getCanvasCoords(e);
    const mode = getHitMode(coords.x, coords.y);

    if (mode) {
      isDragging = true;
      dragMode = mode;
      dragStart = {
        x: coords.x,
        y: coords.y,
        cropX: cropRect.x,
        cropY: cropRect.y,
        cropW: cropRect.w,
        cropH: cropRect.h
      };
      if (e.cancelable) e.preventDefault();
    }
  }

  function onTouchStart(e) {
    if (!dom.previewCanvas || e.touches.length !== 1) return;
    const coords = getCanvasCoords(e);
    const mode = getHitMode(coords.x, coords.y);

    if (mode) {
      isDragging = true;
      dragMode = mode;
      dragStart = {
        x: coords.x,
        y: coords.y,
        cropX: cropRect.x,
        cropY: cropRect.y,
        cropW: cropRect.w,
        cropH: cropRect.h
      };
      e.preventDefault();
    }
  }

  function onPointerMove(e) {
    if (!dom.previewCanvas) return;
    const coords = getCanvasCoords(e);

    if (!isDragging) {
      // Dynamic Cursor styling
      const mode = getHitMode(coords.x, coords.y);
      switch (mode) {
        case 'nw': case 'se': dom.previewCanvas.style.cursor = 'nwse-resize'; break;
        case 'ne': case 'sw': dom.previewCanvas.style.cursor = 'nesw-resize'; break;
        case 'n': case 's': dom.previewCanvas.style.cursor = 'ns-resize'; break;
        case 'e': case 'w': dom.previewCanvas.style.cursor = 'ew-resize'; break;
        case 'move': dom.previewCanvas.style.cursor = 'move'; break;
        default: dom.previewCanvas.style.cursor = 'crosshair'; break;
      }
      return;
    }

    if (e.cancelable) e.preventDefault();

    const dx = coords.x - dragStart.x;
    const dy = coords.y - dragStart.y;
    const minSize = 20;
    const maxW = dom.previewCanvas.width;
    const maxH = dom.previewCanvas.height;

    let newX = dragStart.cropX;
    let newY = dragStart.cropY;
    let newW = dragStart.cropW;
    let newH = dragStart.cropH;

    switch (dragMode) {
      case 'move':
        newX = Math.max(0, Math.min(maxW - newW, dragStart.cropX + dx));
        newY = Math.max(0, Math.min(maxH - newH, dragStart.cropY + dy));
        break;

      case 'nw':
        newX = Math.min(dragStart.cropX + dragStart.cropW - minSize, Math.max(0, dragStart.cropX + dx));
        newY = Math.min(dragStart.cropY + dragStart.cropH - minSize, Math.max(0, dragStart.cropY + dy));
        newW = dragStart.cropW - (newX - dragStart.cropX);
        newH = dragStart.cropH - (newY - dragStart.cropY);
        break;

      case 'ne':
        newY = Math.min(dragStart.cropY + dragStart.cropH - minSize, Math.max(0, dragStart.cropY + dy));
        newW = Math.max(minSize, Math.min(maxW - dragStart.cropX, dragStart.cropW + dx));
        newH = dragStart.cropH - (newY - dragStart.cropY);
        break;

      case 'se':
        newW = Math.max(minSize, Math.min(maxW - dragStart.cropX, dragStart.cropW + dx));
        newH = Math.max(minSize, Math.min(maxH - dragStart.cropY, dragStart.cropH + dy));
        break;

      case 'sw':
        newX = Math.min(dragStart.cropX + dragStart.cropW - minSize, Math.max(0, dragStart.cropX + dx));
        newW = dragStart.cropW - (newX - dragStart.cropX);
        newH = Math.max(minSize, Math.min(maxH - dragStart.cropY, dragStart.cropH + dy));
        break;

      case 'n':
        newY = Math.min(dragStart.cropY + dragStart.cropH - minSize, Math.max(0, dragStart.cropY + dy));
        newH = dragStart.cropH - (newY - dragStart.cropY);
        break;

      case 's':
        newH = Math.max(minSize, Math.min(maxH - dragStart.cropY, dragStart.cropH + dy));
        break;

      case 'w':
        newX = Math.min(dragStart.cropX + dragStart.cropW - minSize, Math.max(0, dragStart.cropX + dx));
        newW = dragStart.cropW - (newX - dragStart.cropX);
        break;

      case 'e':
        newW = Math.max(minSize, Math.min(maxW - dragStart.cropX, dragStart.cropW + dx));
        break;
    }

    cropRect = {
      x: Math.round(newX),
      y: Math.round(newY),
      w: Math.round(newW),
      h: Math.round(newH)
    };

    drawCropCanvas(true);
  }

  function onTouchMove(e) {
    if (!isDragging || e.touches.length !== 1) return;
    onPointerMove(e);
  }

  function onPointerUp() {
    isDragging = false;
    dragMode = null;
    if (dom.previewCanvas) dom.previewCanvas.style.cursor = 'crosshair';
  }

  async function applyCrop() {
    if (!currentFile) return;

    const top = Math.max(0, parseInt(dom.topInput ? dom.topInput.value : 0, 10) || 0);
    const bottom = Math.max(0, parseInt(dom.bottomInput ? dom.bottomInput.value : 0, 10) || 0);
    const left = Math.max(0, parseInt(dom.leftInput ? dom.leftInput.value : 0, 10) || 0);
    const right = Math.max(0, parseInt(dom.rightInput ? dom.rightInput.value : 0, 10) || 0);

    if (top === 0 && bottom === 0 && left === 0 && right === 0) {
      Utils.showToast('Please adjust the crop box to trim at least one margin.', 'warning');
      return;
    }

    Utils.setProcessing(true);
    dom.applyBtn.disabled = true;
    showProgress(25, 'Applying lossless page box crop to PDF...');

    try {
      const srcDoc = await PDFLib.PDFDocument.load(currentFile.buffer, { ignoreEncryption: true });
      const pages = srcDoc.getPages();
      const total = pages.length;

      // Validate dimensions across all pages before modifying
      for (let i = 0; i < total; i++) {
        const page = pages[i];
        const { width, height } = page.getSize();
        const rot = (page.getRotation() ? page.getRotation().angle : 0) % 360;
        const isLandscape = (rot === 90 || rot === 270);

        const visualWidth = isLandscape ? height : width;
        const visualHeight = isLandscape ? width : height;

        if (left + right >= visualWidth || top + bottom >= visualHeight) {
          throw new Error(`Crop margins (L:${left} + R:${right} = ${left + right}pt, T:${top} + B:${bottom} = ${top + bottom}pt) exceed dimensions of page ${i + 1} (${Math.round(visualWidth)}x${Math.round(visualHeight)}pt). Please reduce crop margins.`);
        }
      }

      // Apply crop box calculations with rotation mapping
      for (let i = 0; i < total; i++) {
        showProgress(35 + Math.round((i / total) * 50), `Cropping page ${i + 1} of ${total}...`);
        await yieldToUI();

        const page = pages[i];
        const { width, height } = page.getSize();
        const rot = (page.getRotation() ? page.getRotation().angle : 0) % 360;

        let newX, newY, newW, newH;

        if (rot === 90) {
          // 90 deg clockwise: visual Top is PDF Right, visual Bottom is PDF Left, visual Left is PDF Top, visual Right is PDF Bottom
          newX = bottom;
          newY = right;
          newW = width - bottom - top;
          newH = height - left - right;
        } else if (rot === 180) {
          // 180 deg: visual Top is PDF Bottom, visual Bottom is PDF Top, visual Left is PDF Right, visual Right is PDF Left
          newX = right;
          newY = top;
          newW = width - left - right;
          newH = height - top - bottom;
        } else if (rot === 270) {
          // 270 deg clockwise: visual Top is PDF Left, visual Bottom is PDF Right, visual Left is PDF Bottom, visual Right is PDF Top
          newX = top;
          newY = left;
          newW = width - top - bottom;
          newH = height - right - left;
        } else {
          // 0 deg default: visual Top is PDF Top, visual Bottom is PDF Bottom, visual Left is PDF Left, visual Right is PDF Right
          newX = left;
          newY = bottom;
          newW = width - left - right;
          newH = height - top - bottom;
        }

        page.setCropBox(newX, newY, Math.max(1, newW), Math.max(1, newH));
        page.setMediaBox(newX, newY, Math.max(1, newW), Math.max(1, newH));
      }

      showProgress(90, 'Packaging lossless cropped PDF...');
      const finalPdfBytes = await srcDoc.save({ useObjectStreams: true });
      generatedPdfBlob = new Blob([finalPdfBytes], { type: 'application/pdf' });

      dom.applyBtn.classList.remove('hidden');
      dom.downloadBtn.classList.remove('hidden');
      dom.downloadBtn.disabled = false;

      Utils.showToast('PDF cropped losslessly! All selectable text and vectors preserved. ✂️', 'success');
    } catch (err) {
      console.error(err);
      Utils.showToast('Error cropping PDF: ' + (err.message || 'Processing failed'), 'error');
    } finally {
      dom.applyBtn.disabled = false;
      Utils.setProcessing(false);
      hideProgress();
    }
  }

  function downloadCroppedPDF() {
    if (!generatedPdfBlob || !currentFile) return;
    const base = Utils.getBaseName(currentFile.name);
    Utils.downloadBlob(generatedPdfBlob, `${base}-cropped.pdf`);
  }

  function resetTool() {
    if (currentFile && currentFile.pdf && typeof currentFile.pdf.destroy === 'function') {
      try { currentFile.pdf.destroy(); } catch (e) {}
    }
    currentFile = null;
    page1CanvasCache = null;
    generatedPdfBlob = null;
    isDragging = false;
    dragMode = null;

    if (dom.topInput) dom.topInput.value = 0;
    if (dom.bottomInput) dom.bottomInput.value = 0;
    if (dom.leftInput) dom.leftInput.value = 0;
    if (dom.rightInput) dom.rightInput.value = 0;
    if (dom.sizeBadge) dom.sizeBadge.textContent = 'Drag to crop';

    if (dom.emptyState) dom.emptyState.classList.remove('hidden');
    if (dom.workspace) dom.workspace.classList.add('hidden');
    if (dom.downloadBtn) dom.downloadBtn.classList.add('hidden');
    if (dom.applyBtn) {
      dom.applyBtn.classList.remove('hidden');
      dom.applyBtn.disabled = false;
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

  function yieldToUI() {
    return new Promise(resolve => setTimeout(resolve, 0));
  }

  return {
    init,
    handleFiles,
    reset: resetTool
  };
})();

// Export globally
window.PDFCrop = PDFCrop;
