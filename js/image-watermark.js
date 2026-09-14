/**
 * FileForge - Image Watermark Tool
 * Stamp text or logo watermarks onto photos with custom opacity, position, scale, angle, and tile effects.
 */

const ImageWatermark = (() => {
  let currentFile = null; // { file, name, dataUrl, img, width, height }
  let watermarkType = 'text'; // 'text' | 'image'
  let watermarkImageElement = null;
  let watermarkedBlob = null;

  let dom = {};

  function init() {
    dom = {
      container: document.getElementById('tool-image-watermark'),
      dropzone: document.getElementById('iwm-dropzone'),
      fileInput: document.getElementById('iwm-file-input'),
      browseBtn: document.getElementById('iwm-browse-btn'),
      workspace: document.getElementById('iwm-workspace'),
      emptyState: document.getElementById('iwm-empty-state'),
      
      // Type Toggle
      typeTextBtn: document.getElementById('iwm-type-text'),
      typeImageBtn: document.getElementById('iwm-type-image'),
      textOptionsPanel: document.getElementById('iwm-text-options'),
      imageOptionsPanel: document.getElementById('iwm-image-options'),
      
      // Text options
      textInput: document.getElementById('iwm-text-input'),
      fontSizeSlider: document.getElementById('iwm-font-size'),
      fontSizeVal: document.getElementById('iwm-font-size-val'),
      colorPicker: document.getElementById('iwm-color'),
      colorPresets: document.querySelectorAll('.iwm-color-preset'),
      rotationSlider: document.getElementById('iwm-rotation'),
      rotationVal: document.getElementById('iwm-rotation-val'),
      
      // Image options
      imageInput: document.getElementById('iwm-logo-input'),
      imageBrowseBtn: document.getElementById('iwm-logo-browse-btn'),
      imageScaleSlider: document.getElementById('iwm-logo-scale'),
      imageScaleVal: document.getElementById('iwm-logo-scale-val'),
      
      // Shared options
      opacitySlider: document.getElementById('iwm-opacity'),
      opacityVal: document.getElementById('iwm-opacity-val'),
      positionSelect: document.getElementById('iwm-position'),
      
      // Output
      formatSelect: document.getElementById('iwm-format'),
      qualitySlider: document.getElementById('iwm-quality'),
      qualityVal: document.getElementById('iwm-quality-val'),
      
      // Preview
      previewCanvas: document.getElementById('iwm-preview-canvas'),
      
      // Actions
      applyBtn: document.getElementById('iwm-apply-btn'),
      downloadBtn: document.getElementById('iwm-download-btn'),
      resetBtn: document.getElementById('iwm-reset-btn'),
      progressBar: document.getElementById('iwm-progress-bar'),
      progressContainer: document.getElementById('iwm-progress-container'),
      progressText: document.getElementById('iwm-progress-text')
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

    if (dom.typeTextBtn && dom.typeImageBtn) {
      dom.typeTextBtn.addEventListener('click', () => setType('text'));
      dom.typeImageBtn.addEventListener('click', () => setType('image'));
    }

    if (dom.textInput) dom.textInput.addEventListener('input', drawPreview);
    if (dom.colorPicker) dom.colorPicker.addEventListener('input', drawPreview);
    if (dom.colorPresets) {
      dom.colorPresets.forEach(btn => {
        btn.addEventListener('click', () => {
          dom.colorPicker.value = btn.dataset.color;
          drawPreview();
        });
      });
    }

    if (dom.fontSizeSlider) {
      dom.fontSizeSlider.addEventListener('input', (e) => {
        dom.fontSizeVal.textContent = e.target.value + 'px';
        drawPreview();
      });
    }

    if (dom.rotationSlider) {
      dom.rotationSlider.addEventListener('input', (e) => {
        dom.rotationVal.textContent = e.target.value + '°';
        drawPreview();
      });
    }

    if (dom.imageBrowseBtn && dom.imageInput) {
      dom.imageBrowseBtn.addEventListener('click', () => dom.imageInput.click());
      dom.imageInput.addEventListener('change', handleLogoFile);
    }

    if (dom.imageScaleSlider) {
      dom.imageScaleSlider.addEventListener('input', (e) => {
        dom.imageScaleVal.textContent = e.target.value + '%';
        drawPreview();
      });
    }

    if (dom.opacitySlider) {
      dom.opacitySlider.addEventListener('input', (e) => {
        dom.opacityVal.textContent = e.target.value + '%';
        drawPreview();
      });
    }

    if (dom.positionSelect) dom.positionSelect.addEventListener('change', drawPreview);

    if (dom.qualitySlider) {
      dom.qualitySlider.addEventListener('input', (e) => {
        dom.qualityVal.textContent = e.target.value + '%';
      });
    }

    dom.applyBtn.addEventListener('click', executeWatermark);
    dom.downloadBtn.addEventListener('click', downloadWatermarked);
    dom.resetBtn.addEventListener('click', resetTool);
  }

  function setType(type) {
    watermarkType = type;
    if (type === 'text') {
      dom.typeTextBtn.className = 'btn btn-sm btn-primary';
      dom.typeImageBtn.className = 'btn btn-sm btn-ghost';
      dom.textOptionsPanel.classList.remove('hidden');
      dom.imageOptionsPanel.classList.add('hidden');
    } else {
      dom.typeTextBtn.className = 'btn btn-sm btn-ghost';
      dom.typeImageBtn.className = 'btn btn-sm btn-primary';
      dom.textOptionsPanel.classList.add('hidden');
      dom.imageOptionsPanel.classList.remove('hidden');
    }
    drawPreview();
  }

  async function handleLogoFile(e) {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      Utils.showToast('Please select a valid image file (PNG, JPG, SVG).', 'warning');
      return;
    }

    const dataUrl = await Utils.readFileAsDataURL(file);
    watermarkImageElement = await Utils.loadImage(dataUrl);
    drawPreview();
    Utils.showToast(`Logo "${file.name}" loaded!`, 'success');
  }

  async function handleFiles(files) {
    if (!files || files.length === 0) return;
    const file = files[0];

    const pdfFiles = files.filter(f => f.type === 'application/pdf' || /\.pdf$/i.test(f.name));
    if (pdfFiles.length > 0) {
      Utils.showToast(`You uploaded a PDF file ("${pdfFiles[0].name}"). Please use PDF Watermark for PDFs.`, 'warning');
      return;
    }

    if (!file.type.startsWith('image/') && !/\.(jpg|jpeg|png|webp|gif|bmp)$/i.test(file.name)) {
      Utils.showToast('Please select a valid image file (JPG, PNG, WebP).', 'warning');
      return;
    }

    Utils.setProcessing(true);
    showProgress(25, 'Loading photo...');

    try {
      const dataUrl = await Utils.readFileAsDataURL(file);
      const img = await Utils.loadImage(dataUrl);

      currentFile = {
        file,
        name: file.name,
        dataUrl,
        img,
        width: img.naturalWidth,
        height: img.naturalHeight
      };

      dom.emptyState.classList.add('hidden');
      dom.workspace.classList.remove('hidden');
      dom.downloadBtn.classList.add('hidden');
      dom.applyBtn.classList.remove('hidden');
      dom.applyBtn.disabled = false;

      drawPreview();
      Utils.showToast(`Loaded "${file.name}" (${img.naturalWidth} × ${img.naturalHeight} px). Configure watermark and save!`, 'info');
    } catch (err) {
      console.error(err);
      Utils.showToast('Failed to load image: ' + err.message, 'error');
      resetTool();
    } finally {
      Utils.setProcessing(false);
      hideProgress();
    }
  }

  function drawPreview() {
    if (!currentFile || !dom.previewCanvas) return;
    const canvas = dom.previewCanvas;
    const ctx = canvas.getContext('2d');

    const maxDim = 520;
    const scale = Math.min(maxDim / currentFile.width, maxDim / currentFile.height, 1.0);
    const displayW = Math.round(currentFile.width * scale);
    const displayH = Math.round(currentFile.height * scale);

    canvas.width = displayW;
    canvas.height = displayH;

    ctx.drawImage(currentFile.img, 0, 0, displayW, displayH);

    const opacity = (parseInt(dom.opacitySlider ? dom.opacitySlider.value : 50, 10) || 50) / 100;
    const pos = dom.positionSelect ? dom.positionSelect.value : 'center';

    ctx.save();
    ctx.globalAlpha = opacity;

    if (watermarkType === 'text') {
      const text = dom.textInput ? (dom.textInput.value || 'WATERMARK') : 'WATERMARK';
      const fontSize = (parseInt(dom.fontSizeSlider ? dom.fontSizeSlider.value : 36, 10) || 36) * scale;
      const color = dom.colorPicker ? dom.colorPicker.value : '#ffffff';
      const rotation = ((parseInt(dom.rotationSlider ? dom.rotationSlider.value : 0, 10) || 0) * Math.PI) / 180;

      ctx.font = `bold ${fontSize}px sans-serif`;
      ctx.fillStyle = color;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      if (pos === 'tiled') {
        const stepX = 140 * scale;
        const stepY = 100 * scale;
        for (let x = 30; x < displayW; x += stepX) {
          for (let y = 30; y < displayH; y += stepY) {
            ctx.save();
            ctx.translate(x, y);
            ctx.rotate(rotation);
            ctx.fillText(text, 0, 0);
            ctx.restore();
          }
        }
      } else {
        const coords = getPositionCoords(pos, displayW, displayH, 40 * scale);
        ctx.translate(coords.x, coords.y);
        ctx.rotate(rotation);
        ctx.fillText(text, 0, 0);
      }
    } else if (watermarkType === 'image' && watermarkImageElement) {
      const scalePct = (parseInt(dom.imageScaleSlider ? dom.imageScaleSlider.value : 40, 10) || 40) / 100;
      const imgW = watermarkImageElement.naturalWidth * scalePct * scale * 0.5;
      const imgH = watermarkImageElement.naturalHeight * scalePct * scale * 0.5;

      if (pos === 'tiled') {
        for (let x = 20; x < displayW; x += imgW + 40) {
          for (let y = 20; y < displayH; y += imgH + 40) {
            ctx.drawImage(watermarkImageElement, x, y, imgW, imgH);
          }
        }
      } else {
        const coords = getPositionCoords(pos, displayW, displayH, 30 * scale);
        ctx.drawImage(watermarkImageElement, coords.x - imgW / 2, coords.y - imgH / 2, imgW, imgH);
      }
    }

    ctx.restore();
  }

  function getPositionCoords(pos, w, h, margin = 30) {
    switch (pos) {
      case 'top-left': return { x: margin + 20, y: margin + 20 };
      case 'top-center': return { x: w / 2, y: margin + 20 };
      case 'top-right': return { x: w - margin - 20, y: margin + 20 };
      case 'center-left': return { x: margin + 20, y: h / 2 };
      case 'center': return { x: w / 2, y: h / 2 };
      case 'center-right': return { x: w - margin - 20, y: h / 2 };
      case 'bottom-left': return { x: margin + 20, y: h - margin - 20 };
      case 'bottom-center': return { x: w / 2, y: h - margin - 20 };
      case 'bottom-right': return { x: w - margin - 20, y: h - margin - 20 };
      default: return { x: w / 2, y: h / 2 };
    }
  }

  async function executeWatermark() {
    if (!currentFile) return;

    Utils.setProcessing(true);
    showProgress(35, 'Applying watermark at full resolution...');

    try {
      const outCanvas = document.createElement('canvas');
      outCanvas.width = currentFile.width;
      outCanvas.height = currentFile.height;
      const ctx = outCanvas.getContext('2d');

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';

      // Draw original full-res photo
      ctx.drawImage(currentFile.img, 0, 0);

      const opacity = (parseInt(dom.opacitySlider ? dom.opacitySlider.value : 50, 10) || 50) / 100;
      const pos = dom.positionSelect ? dom.positionSelect.value : 'center';

      ctx.save();
      ctx.globalAlpha = opacity;

      if (watermarkType === 'text') {
        const text = dom.textInput ? (dom.textInput.value || 'WATERMARK') : 'WATERMARK';
        const fontSize = parseInt(dom.fontSizeSlider ? dom.fontSizeSlider.value : 36, 10) || 36;
        const color = dom.colorPicker ? dom.colorPicker.value : '#ffffff';
        const rotation = ((parseInt(dom.rotationSlider ? dom.rotationSlider.value : 0, 10) || 0) * Math.PI) / 180;

        ctx.font = `bold ${fontSize}px sans-serif`;
        ctx.fillStyle = color;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        if (pos === 'tiled') {
          const stepX = fontSize * text.length * 0.8 + 60;
          const stepY = fontSize * 3.5;
          for (let x = 60; x < currentFile.width; x += stepX) {
            for (let y = 60; y < currentFile.height; y += stepY) {
              ctx.save();
              ctx.translate(x, y);
              ctx.rotate(rotation);
              ctx.fillText(text, 0, 0);
              ctx.restore();
            }
          }
        } else {
          const coords = getPositionCoords(pos, currentFile.width, currentFile.height, 50);
          ctx.translate(coords.x, coords.y);
          ctx.rotate(rotation);
          ctx.fillText(text, 0, 0);
        }
      } else if (watermarkType === 'image' && watermarkImageElement) {
        const scalePct = (parseInt(dom.imageScaleSlider ? dom.imageScaleSlider.value : 40, 10) || 40) / 100;
        const imgW = watermarkImageElement.naturalWidth * scalePct;
        const imgH = watermarkImageElement.naturalHeight * scalePct;

        if (pos === 'tiled') {
          for (let x = 40; x < currentFile.width; x += imgW + 80) {
            for (let y = 40; y < currentFile.height; y += imgH + 80) {
              ctx.drawImage(watermarkImageElement, x, y, imgW, imgH);
            }
          }
        } else {
          const coords = getPositionCoords(pos, currentFile.width, currentFile.height, 50);
          ctx.drawImage(watermarkImageElement, coords.x - imgW / 2, coords.y - imgH / 2, imgW, imgH);
        }
      }

      ctx.restore();

      const format = dom.formatSelect ? dom.formatSelect.value : 'jpeg';
      const mime = format === 'png' ? 'image/png' : (format === 'webp' ? 'image/webp' : 'image/jpeg');
      const quality = (parseInt(dom.qualitySlider ? dom.qualitySlider.value : 90, 10) || 90) / 100;

      showProgress(75, 'Encoding watermarked image...');
      watermarkedBlob = await Utils.canvasToBlob(outCanvas, mime, quality);

      dom.applyBtn.classList.add('hidden');
      dom.downloadBtn.classList.remove('hidden');
      dom.downloadBtn.disabled = false;

      Utils.showToast(`Watermark applied! (${Utils.formatBytes(watermarkedBlob.size)})`, 'success');
    } catch (err) {
      console.error(err);
      Utils.showToast('Failed to apply watermark: ' + err.message, 'error');
    } finally {
      Utils.setProcessing(false);
      hideProgress();
    }
  }

  function downloadWatermarked() {
    if (!watermarkedBlob || !currentFile) return;
    const base = Utils.getBaseName(currentFile.name);
    const format = dom.formatSelect ? dom.formatSelect.value : 'jpeg';
    const ext = format === 'jpeg' ? 'jpg' : format;
    Utils.downloadBlob(watermarkedBlob, `${base}-watermarked.${ext}`);
  }

  function resetTool() {
    currentFile = null;
    watermarkedBlob = null;
    watermarkImageElement = null;

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

  return {
    init,
    handleFiles,
    reset: resetTool
  };
})();

window.ImageWatermark = ImageWatermark;
