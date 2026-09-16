/**
 * FileForge - Image Cropper Tool
 * Interactive visual canvas crop tool with preset aspect ratios, custom dimension locks & live preview.
 */

const ImageCropper = (() => {
  let currentFile = null; // { file, name, dataUrl, img, width, height }
  let croppedBlob = null;
  let croppedDataUrl = null;

  let cropRect = { x: 50, y: 50, w: 200, h: 200 };
  let activeRatio = 'free'; // 'free' | '1:1' | '16:9' | '4:3' | '9:16' | '3:2'
  let isDragging = false;
  let dragMode = null; // 'move' | 'nw' | 'ne' | 'se' | 'sw'
  let dragStart = { x: 0, y: 0, cropX: 0, cropY: 0, cropW: 0, cropH: 0 };

  let dom = {};

  function init() {
    dom = {
      container: document.getElementById('tool-image-cropper'),
      dropzone: document.getElementById('icrop-dropzone'),
      fileInput: document.getElementById('icrop-file-input'),
      browseBtn: document.getElementById('icrop-browse-btn'),
      workspace: document.getElementById('icrop-workspace'),
      emptyState: document.getElementById('icrop-empty-state'),
      
      // Canvas & Overlay
      cropCanvas: document.getElementById('icrop-canvas'),
      
      // Aspect Ratio Presets
      ratioBtns: document.querySelectorAll('.icrop-ratio-btn'),
      widthInput: document.getElementById('icrop-width'),
      heightInput: document.getElementById('icrop-height'),
      formatSelect: document.getElementById('icrop-format'),
      qualitySlider: document.getElementById('icrop-quality'),
      qualityVal: document.getElementById('icrop-quality-val'),
      
      // Actions
      cropBtn: document.getElementById('icrop-crop-btn'),
      downloadBtn: document.getElementById('icrop-download-btn'),
      resetBtn: document.getElementById('icrop-reset-btn'),
      progressBar: document.getElementById('icrop-progress-bar'),
      progressContainer: document.getElementById('icrop-progress-container'),
      progressText: document.getElementById('icrop-progress-text')
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

    if (dom.ratioBtns) {
      dom.ratioBtns.forEach(btn => {
        btn.addEventListener('click', () => {
          activeRatio = btn.dataset.ratio;
          dom.ratioBtns.forEach(b => b.classList.toggle('active', b === btn));
          adjustCropToRatio();
          drawCropCanvas();
        });
      });
    }

    if (dom.widthInput) dom.widthInput.addEventListener('input', updateCropFromDimensions);
    if (dom.heightInput) dom.heightInput.addEventListener('input', updateCropFromDimensions);

    if (dom.qualitySlider) {
      dom.qualitySlider.addEventListener('input', (e) => {
        dom.qualityVal.textContent = e.target.value + '%';
      });
    }

    // Canvas Pointer Events for Drag & Resize
    if (dom.cropCanvas) {
      dom.cropCanvas.addEventListener('mousedown', onPointerDown);
      window.addEventListener('mousemove', onPointerMove);
      window.addEventListener('mouseup', onPointerUp);

      dom.cropCanvas.addEventListener('touchstart', onTouchStart, { passive: false });
      window.addEventListener('touchmove', onTouchMove, { passive: false });
      window.addEventListener('touchend', onPointerUp);
    }

    dom.cropBtn.addEventListener('click', executeCrop);
    dom.downloadBtn.addEventListener('click', downloadCropped);
    dom.resetBtn.addEventListener('click', resetTool);
  }

  async function handleFiles(files) {
    if (!files || files.length === 0) return;
    const file = files[0];

    const pdfFiles = files.filter(f => f.type === 'application/pdf' || /\.pdf$/i.test(f.name));
    if (pdfFiles.length > 0) {
      Utils.showToast(`You uploaded a PDF file ("${pdfFiles[0].name}"). Please use PDF tools for PDF documents.`, 'warning');
      return;
    }

    if (!file.type.startsWith('image/') && !/\.(jpg|jpeg|png|webp|gif|bmp)$/i.test(file.name)) {
      Utils.showToast('Please select a valid image file (JPG, PNG, WebP).', 'warning');
      return;
    }

    Utils.setProcessing(true);
    showProgress(25, 'Loading image into editor...');

    try {
      const dataUrl = await Utils.readFileAsDataURL(file);
      const img = await Utils.loadImage(dataUrl);

      currentFile = {
        file,
        name: file.name,
        dataUrl,
        img,
        width: img.naturalWidth,
        height: img.naturalHeight,
        originalImg: img,
        originalWidth: img.naturalWidth,
        originalHeight: img.naturalHeight
      };

      dom.emptyState.classList.add('hidden');
      dom.workspace.classList.remove('hidden');
      dom.downloadBtn.classList.add('hidden');
      dom.cropBtn.classList.remove('hidden');
      dom.cropBtn.disabled = false;

      initCropRect();
      drawCropCanvas();
      Utils.showToast(`Loaded "${file.name}" (${img.naturalWidth} × ${img.naturalHeight} px). Drag handles to crop.`, 'info');
    } catch (err) {
      console.error(err);
      Utils.showToast('Failed to load image: ' + err.message, 'error');
      resetTool();
    } finally {
      Utils.setProcessing(false);
      hideProgress();
    }
  }

  let canvasScale = 1;

  function initCropRect() {
    if (!currentFile || !dom.cropCanvas) return;
    const maxW = 680;
    const maxH = 460;

    let displayW = currentFile.width;
    let displayH = currentFile.height;

    if (displayW > maxW || displayH > maxH) {
      const scaleX = maxW / displayW;
      const scaleY = maxH / displayH;
      canvasScale = Math.min(scaleX, scaleY);
      displayW = Math.round(displayW * canvasScale);
      displayH = Math.round(displayH * canvasScale);
    } else {
      canvasScale = 1;
    }

    dom.cropCanvas.width = displayW;
    dom.cropCanvas.height = displayH;

    // Default crop box: centered 75%
    const marginW = displayW * 0.12;
    const marginH = displayH * 0.12;
    cropRect = {
      x: Math.round(marginW),
      y: Math.round(marginH),
      w: Math.round(displayW - marginW * 2),
      h: Math.round(displayH - marginH * 2)
    };

    adjustCropToRatio();
    updateDimensionInputs();
  }

  function adjustCropToRatio() {
    if (activeRatio === 'free' || !dom.cropCanvas) return;
    let ratioVal = 1;
    switch (activeRatio) {
      case '1:1': ratioVal = 1; break;
      case '16:9': ratioVal = 16 / 9; break;
      case '4:3': ratioVal = 4 / 3; break;
      case '9:16': ratioVal = 9 / 16; break;
      case '3:2': ratioVal = 3 / 2; break;
      default: ratioVal = 1;
    }

    const currentW = cropRect.w;
    let newH = Math.round(currentW / ratioVal);

    if (cropRect.y + newH > dom.cropCanvas.height) {
      newH = dom.cropCanvas.height - cropRect.y;
      cropRect.w = Math.round(newH * ratioVal);
    }
    cropRect.h = newH;
    updateDimensionInputs();
  }

  function updateDimensionInputs() {
    if (!currentFile) return;
    const realW = Math.round(cropRect.w / canvasScale);
    const realH = Math.round(cropRect.h / canvasScale);
    if (dom.widthInput) dom.widthInput.value = realW;
    if (dom.heightInput) dom.heightInput.value = realH;
  }

  function updateCropFromDimensions() {
    if (!currentFile || !dom.cropCanvas) return;
    const realW = parseInt(dom.widthInput.value, 10);
    const realH = parseInt(dom.heightInput.value, 10);
    if (isNaN(realW) || isNaN(realH) || realW <= 0 || realH <= 0) return;

    const displayW = Math.min(dom.cropCanvas.width, Math.round(realW * canvasScale));
    const displayH = Math.min(dom.cropCanvas.height, Math.round(realH * canvasScale));

    cropRect.w = displayW;
    cropRect.h = displayH;

    if (cropRect.x + cropRect.w > dom.cropCanvas.width) {
      cropRect.x = dom.cropCanvas.width - cropRect.w;
    }
    if (cropRect.y + cropRect.h > dom.cropCanvas.height) {
      cropRect.y = dom.cropCanvas.height - cropRect.h;
    }

    drawCropCanvas();
  }

  function drawCropCanvas() {
    if (!currentFile || !dom.cropCanvas) return;
    const canvas = dom.cropCanvas;
    const ctx = canvas.getContext('2d');

    // Draw base image
    ctx.drawImage(currentFile.img, 0, 0, canvas.width, canvas.height);

    // Darkened overlay outside crop rectangle
    ctx.fillStyle = 'rgba(0, 0, 0, 0.58)';
    ctx.fillRect(0, 0, canvas.width, cropRect.y); // Top
    ctx.fillRect(0, cropRect.y + cropRect.h, canvas.width, canvas.height - (cropRect.y + cropRect.h)); // Bottom
    ctx.fillRect(0, cropRect.y, cropRect.x, cropRect.h); // Left
    ctx.fillRect(cropRect.x + cropRect.w, cropRect.y, canvas.width - (cropRect.x + cropRect.w), cropRect.h); // Right

    // Glowing border & grid lines
    ctx.strokeStyle = '#6366f1';
    ctx.lineWidth = 2;
    ctx.strokeRect(cropRect.x, cropRect.y, cropRect.w, cropRect.h);

    // Rule of thirds grid lines
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);

    const thirdW = cropRect.w / 3;
    const thirdH = cropRect.h / 3;

    ctx.beginPath();
    ctx.moveTo(cropRect.x + thirdW, cropRect.y);
    ctx.lineTo(cropRect.x + thirdW, cropRect.y + cropRect.h);
    ctx.moveTo(cropRect.x + thirdW * 2, cropRect.y);
    ctx.lineTo(cropRect.x + thirdW * 2, cropRect.y + cropRect.h);

    ctx.moveTo(cropRect.x, cropRect.y + thirdH);
    ctx.lineTo(cropRect.x + cropRect.w, cropRect.y + thirdH);
    ctx.moveTo(cropRect.x, cropRect.y + thirdH * 2);
    ctx.lineTo(cropRect.x + cropRect.w, cropRect.y + thirdH * 2);
    ctx.stroke();
    ctx.setLineDash([]);

    // Corner Handles
    const handleSize = 10;
    ctx.fillStyle = '#6366f1';
    ctx.fillRect(cropRect.x - handleSize / 2, cropRect.y - handleSize / 2, handleSize, handleSize); // NW
    ctx.fillRect(cropRect.x + cropRect.w - handleSize / 2, cropRect.y - handleSize / 2, handleSize, handleSize); // NE
    ctx.fillRect(cropRect.x + cropRect.w - handleSize / 2, cropRect.y + cropRect.h - handleSize / 2, handleSize, handleSize); // SE
    ctx.fillRect(cropRect.x - handleSize / 2, cropRect.y + cropRect.h - handleSize / 2, handleSize, handleSize); // SW
  }

  function getCanvasCoords(e) {
    const rect = dom.cropCanvas.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return {
      x: clientX - rect.left,
      y: clientY - rect.top
    };
  }

  function onPointerDown(e) {
    const coords = getCanvasCoords(e);
    const hSize = 16;

    // Check corners
    if (Math.abs(coords.x - cropRect.x) < hSize && Math.abs(coords.y - cropRect.y) < hSize) {
      dragMode = 'nw';
    } else if (Math.abs(coords.x - (cropRect.x + cropRect.w)) < hSize && Math.abs(coords.y - cropRect.y) < hSize) {
      dragMode = 'ne';
    } else if (Math.abs(coords.x - (cropRect.x + cropRect.w)) < hSize && Math.abs(coords.y - (cropRect.y + cropRect.h)) < hSize) {
      dragMode = 'se';
    } else if (Math.abs(coords.x - cropRect.x) < hSize && Math.abs(coords.y - (cropRect.y + cropRect.h)) < hSize) {
      dragMode = 'sw';
    } else if (coords.x >= cropRect.x && coords.x <= cropRect.x + cropRect.w && coords.y >= cropRect.y && coords.y <= cropRect.y + cropRect.h) {
      dragMode = 'move';
    } else {
      dragMode = null;
      return;
    }

    isDragging = true;
    dragStart = {
      x: coords.x,
      y: coords.y,
      cropX: cropRect.x,
      cropY: cropRect.y,
      cropW: cropRect.w,
      cropH: cropRect.h
    };
  }

  function onPointerMove(e) {
    if (!isDragging || !dom.cropCanvas) return;
    const coords = getCanvasCoords(e);
    const dx = coords.x - dragStart.x;
    const dy = coords.y - dragStart.y;

    if (dragMode === 'move') {
      let newX = dragStart.cropX + dx;
      let newY = dragStart.cropY + dy;
      newX = Math.max(0, Math.min(dom.cropCanvas.width - cropRect.w, newX));
      newY = Math.max(0, Math.min(dom.cropCanvas.height - cropRect.h, newY));
      cropRect.x = newX;
      cropRect.y = newY;
    } else if (dragMode === 'se') {
      let newW = Math.max(30, Math.min(dom.cropCanvas.width - dragStart.cropX, dragStart.cropW + dx));
      let newH = Math.max(30, Math.min(dom.cropCanvas.height - dragStart.cropY, dragStart.cropH + dy));
      cropRect.w = newW;
      cropRect.h = newH;
      if (activeRatio !== 'free') adjustCropToRatio();
    } else if (dragMode === 'sw') {
      let newX = Math.max(0, Math.min(dragStart.cropX + dragStart.cropW - 30, dragStart.cropX + dx));
      let newW = (dragStart.cropX + dragStart.cropW) - newX;
      let newH = Math.max(30, Math.min(dom.cropCanvas.height - dragStart.cropY, dragStart.cropH + dy));
      cropRect.x = newX;
      cropRect.w = newW;
      cropRect.h = newH;
      if (activeRatio !== 'free') adjustCropToRatio();
    } else if (dragMode === 'ne') {
      let newY = Math.max(0, Math.min(dragStart.cropY + dragStart.cropH - 30, dragStart.cropY + dy));
      let newH = (dragStart.cropY + dragStart.cropH) - newY;
      let newW = Math.max(30, Math.min(dom.cropCanvas.width - dragStart.cropX, dragStart.cropW + dx));
      cropRect.y = newY;
      cropRect.h = newH;
      cropRect.w = newW;
      if (activeRatio !== 'free') adjustCropToRatio();
    } else if (dragMode === 'nw') {
      let newX = Math.max(0, Math.min(dragStart.cropX + dragStart.cropW - 30, dragStart.cropX + dx));
      let newY = Math.max(0, Math.min(dragStart.cropY + dragStart.cropH - 30, dragStart.cropY + dy));
      cropRect.w = (dragStart.cropX + dragStart.cropW) - newX;
      cropRect.h = (dragStart.cropY + dragStart.cropH) - newY;
      cropRect.x = newX;
      cropRect.y = newY;
      if (activeRatio !== 'free') adjustCropToRatio();
    }

    updateDimensionInputs();
    drawCropCanvas();
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

  async function executeCrop() {
    if (!currentFile) return;

    Utils.setProcessing(true);
    showProgress(35, 'Cropping image at full original resolution...');

    try {
      // Calculate true source pixel bounding box
      const realX = Math.round(cropRect.x / canvasScale);
      const realY = Math.round(cropRect.y / canvasScale);
      const realW = Math.round(cropRect.w / canvasScale);
      const realH = Math.round(cropRect.h / canvasScale);

      const outCanvas = document.createElement('canvas');
      outCanvas.width = realW;
      outCanvas.height = realH;
      const ctx = outCanvas.getContext('2d');

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';

      // Draw cropped slice from original full resolution image
      ctx.drawImage(currentFile.img, realX, realY, realW, realH, 0, 0, realW, realH);

      const format = dom.formatSelect ? dom.formatSelect.value : 'jpeg';
      const mime = format === 'png' ? 'image/png' : (format === 'webp' ? 'image/webp' : 'image/jpeg');
      const quality = (parseInt(dom.qualitySlider ? dom.qualitySlider.value : 90, 10) || 90) / 100;

      showProgress(75, 'Encoding cropped image...');
      croppedBlob = await Utils.canvasToBlob(outCanvas, mime, quality);
      croppedDataUrl = URL.createObjectURL(croppedBlob);

      // Store original image if not stored yet
      if (!currentFile.originalImg) {
        currentFile.originalImg = currentFile.img;
        currentFile.originalWidth = currentFile.width;
        currentFile.originalHeight = currentFile.height;
      }

      // Update active image object to display cropped result on canvas
      const newImg = await Utils.loadImage(croppedDataUrl);
      currentFile.img = newImg;
      currentFile.width = newImg.naturalWidth;
      currentFile.height = newImg.naturalHeight;

      // Re-init crop rectangle to match new cropped dimensions
      initCropRect();
      drawCropCanvas();

      dom.cropBtn.classList.remove('hidden');
      const spanEl = dom.cropBtn.querySelector('span');
      if (spanEl) spanEl.textContent = 'Apply Crop';
      dom.downloadBtn.classList.remove('hidden');
      dom.downloadBtn.disabled = false;

      Utils.showToast(`Image cropped to ${realW} × ${realH} px! (${Utils.formatBytes(croppedBlob.size)})`, 'success');
    } catch (err) {
      console.error(err);
      Utils.showToast('Failed to crop image: ' + err.message, 'error');
    } finally {
      Utils.setProcessing(false);
      hideProgress();
    }
  }

  function downloadCropped() {
    if (!croppedBlob || !currentFile) return;
    const base = Utils.getBaseName(currentFile.name);
    const format = dom.formatSelect ? dom.formatSelect.value : 'jpeg';
    const ext = format === 'jpeg' ? 'jpg' : format;
    Utils.downloadBlob(croppedBlob, `${base}-cropped.${ext}`);
  }

  function resetTool() {
    currentFile = null;
    croppedBlob = null;
    isDragging = false;

    if (dom.emptyState) dom.emptyState.classList.remove('hidden');
    if (dom.workspace) dom.workspace.classList.add('hidden');
    if (dom.downloadBtn) dom.downloadBtn.classList.add('hidden');
    if (dom.cropBtn) {
      dom.cropBtn.classList.remove('hidden');
      dom.cropBtn.disabled = false;
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
    reset: resetTool
  };
})();

window.ImageCropper = ImageCropper;
