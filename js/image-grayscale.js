/**
 * FileForge - Image Grayscale Tool
 * Convert color photos into clean black & white / monochrome images directly in browser.
 */

const ImageGrayscale = (() => {
  let currentFile = null;
  let originalImage = null;
  let processedBlob = null;

  let dom = {};

  function init() {
    dom = {
      container: document.getElementById('tool-image-grayscale'),
      dropzone: document.getElementById('ig-dropzone'),
      fileInput: document.getElementById('ig-file-input'),
      browseBtn: document.getElementById('ig-browse-btn'),
      workspace: document.getElementById('ig-workspace'),
      emptyState: document.getElementById('ig-empty-state'),
      
      // File Details
      fileNameText: document.getElementById('ig-file-name'),
      fileSizeText: document.getElementById('ig-file-size'),
      fileDimsText: document.getElementById('ig-file-dims'),
      
      // Controls
      modeSelect: document.getElementById('ig-mode'),
      contrastSlider: document.getElementById('ig-contrast-slider'),
      contrastVal: document.getElementById('ig-contrast-val'),
      brightnessSlider: document.getElementById('ig-brightness-slider'),
      brightnessVal: document.getElementById('ig-brightness-val'),
      formatSelect: document.getElementById('ig-format'),
      
      // Canvas & Preview
      previewCanvas: document.getElementById('ig-preview-canvas'),
      
      // Actions
      applyBtn: document.getElementById('ig-apply-btn'),
      downloadBtn: document.getElementById('ig-download-btn'),
      resetBtn: document.getElementById('ig-reset-btn'),
      progressBar: document.getElementById('ig-progress-bar'),
      progressContainer: document.getElementById('ig-progress-container'),
      progressText: document.getElementById('ig-progress-text')
    };

    if (!dom.container) return;

    bindEvents();
  }

  function bindEvents() {
    Utils.setupDropZone(dom.dropzone, handleFiles, ['image/*']);
    dom.browseBtn.addEventListener('click', () => dom.fileInput.click());
    dom.fileInput.addEventListener('change', (e) => {
      handleFiles(Array.from(e.target.files));
      dom.fileInput.value = '';
    });

    if (dom.modeSelect) dom.modeSelect.addEventListener('change', () => { if (processedBlob) processGrayscale(); else drawOriginalPreview(); });
    if (dom.contrastSlider) {
      dom.contrastSlider.addEventListener('input', (e) => {
        if (dom.contrastVal) dom.contrastVal.textContent = `${e.target.value}%`;
        if (processedBlob) processGrayscale();
      });
    }
    if (dom.brightnessSlider) {
      dom.brightnessSlider.addEventListener('input', (e) => {
        if (dom.brightnessVal) dom.brightnessVal.textContent = `${e.target.value}%`;
        if (processedBlob) processGrayscale();
      });
    }
    if (dom.formatSelect) dom.formatSelect.addEventListener('change', () => { if (processedBlob) processGrayscale(); });

    dom.applyBtn.addEventListener('click', () => processGrayscale(true));
    dom.downloadBtn.addEventListener('click', downloadImage);
    dom.resetBtn.addEventListener('click', resetTool);
  }

  async function handleFiles(files) {
    if (!files || files.length === 0) return;
    const file = files[0];

    if (!file.type.startsWith('image/') && !/\.(jpg|jpeg|png|webp|gif|bmp|svg)$/i.test(file.name)) {
      Utils.showToast(`Invalid image format ("${file.name}"). Please upload an image file.`, 'warning');
      return;
    }

    Utils.setProcessing(true);
    showProgress(30, 'Loading image...');

    try {
      const dataUrl = await Utils.readFileAsDataURL(file);
      const img = new Image();
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        img.src = dataUrl;
      });

      originalImage = img;
      currentFile = file;
      processedBlob = null;

      dom.fileNameText.textContent = file.name;
      dom.fileSizeText.textContent = Utils.formatBytes(file.size);
      dom.fileDimsText.textContent = `${img.naturalWidth} × ${img.naturalHeight} px`;

      dom.emptyState.classList.add('hidden');
      dom.workspace.classList.remove('hidden');
      dom.downloadBtn.classList.add('hidden');
      dom.downloadBtn.disabled = true;
      dom.applyBtn.classList.remove('hidden');
      dom.applyBtn.disabled = false;

      drawOriginalPreview();
      Utils.showToast(`Loaded "${file.name}". Adjust settings and click "Apply Grayscale Filter".`, 'info');
    } catch (err) {
      console.error(err);
      Utils.showToast('Failed to load image: ' + err.message, 'error');
      resetTool();
    } finally {
      Utils.setProcessing(false);
      hideProgress();
    }
  }

  function drawOriginalPreview() {
    if (!originalImage || !dom.previewCanvas) return;
    const canvas = dom.previewCanvas;
    const ctx = canvas.getContext('2d');
    canvas.width = originalImage.naturalWidth;
    canvas.height = originalImage.naturalHeight;
    ctx.drawImage(originalImage, 0, 0, canvas.width, canvas.height);
  }

  function processGrayscale(isExplicit = false) {
    if (!originalImage || !dom.previewCanvas) return;

    const canvas = dom.previewCanvas;
    const ctx = canvas.getContext('2d');

    const width = originalImage.naturalWidth;
    const height = originalImage.naturalHeight;

    canvas.width = width;
    canvas.height = height;

    // Draw base image
    ctx.drawImage(originalImage, 0, 0, width, height);

    const imgData = ctx.getImageData(0, 0, width, height);
    const data = imgData.data;

    const mode = dom.modeSelect ? dom.modeSelect.value : 'standard';
    const contrast = dom.contrastSlider ? parseFloat(dom.contrastSlider.value) / 100 : 1.0;
    const brightness = dom.brightnessSlider ? parseFloat(dom.brightnessSlider.value) / 100 : 1.0;

    // Contrast factor
    const factor = (259 * (contrast * 255 + 255)) / (255 * (259 - contrast * 255));

    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];

      let gray;
      if (mode === 'high-contrast') {
        // High contrast weights
        gray = 0.2126 * r + 0.7152 * g + 0.0722 * b;
      } else if (mode === 'sepia') {
        // Subtle vintage B&W / warm tone
        gray = (0.299 * r + 0.587 * g + 0.114 * b);
      } else {
        // Standard ITU-R BT.601 luma
        gray = 0.299 * r + 0.587 * g + 0.114 * b;
      }

      // Apply brightness
      gray = gray * brightness;

      // Apply contrast
      if (contrast !== 1.0) {
        gray = factor * (gray - 128) + 128;
      }

      // Clamp 0-255
      gray = Math.max(0, Math.min(255, gray));

      if (mode === 'sepia') {
        data[i] = Math.min(255, gray * 1.05);     // Red
        data[i + 1] = Math.min(255, gray * 0.95); // Green
        data[i + 2] = Math.min(255, gray * 0.82); // Blue
      } else {
        data[i] = gray;
        data[i + 1] = gray;
        data[i + 2] = gray;
      }
    }

    ctx.putImageData(imgData, 0, 0);

    // Generate output blob
    const format = dom.formatSelect ? dom.formatSelect.value : 'image/png';
    canvas.toBlob((blob) => {
      processedBlob = blob;
      if (dom.downloadBtn) {
        dom.downloadBtn.disabled = false;
        dom.downloadBtn.classList.remove('hidden');
      }
      if (isExplicit) {
        Utils.showToast('Grayscale filter applied! Click Download Image to save.', 'success');
      }
    }, format, 0.92);
  }

  function downloadImage() {
    if (!processedBlob || !currentFile) return;
    const base = Utils.getBaseName(currentFile.name);
    const format = dom.formatSelect ? dom.formatSelect.value : 'image/png';
    const ext = format === 'image/jpeg' ? 'jpg' : (format === 'image/webp' ? 'webp' : 'png');
    Utils.downloadBlob(processedBlob, `${base}-grayscale.${ext}`);
    Utils.showToast('Grayscale image downloaded! ✨', 'success');
  }

  function resetTool() {
    currentFile = null;
    originalImage = null;
    processedBlob = null;

    if (dom.emptyState) dom.emptyState.classList.remove('hidden');
    if (dom.workspace) dom.workspace.classList.add('hidden');
    if (dom.downloadBtn) dom.downloadBtn.classList.add('hidden');

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

window.ImageGrayscale = ImageGrayscale;
