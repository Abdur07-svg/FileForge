/**
 * FileForge - Image Flip Tool
 * Mirror images horizontally or flip vertically with instant live preview.
 */

const ImageFlip = (() => {
  let currentFile = null; // { file, name, dataUrl, img, width, height }
  let flipH = false;
  let flipV = false;
  let flippedBlob = null;

  let dom = {};

  function init() {
    dom = {
      container: document.getElementById('tool-image-flip'),
      dropzone: document.getElementById('iflip-dropzone'),
      fileInput: document.getElementById('iflip-file-input'),
      browseBtn: document.getElementById('iflip-browse-btn'),
      workspace: document.getElementById('iflip-workspace'),
      emptyState: document.getElementById('iflip-empty-state'),
      
      // Flip Buttons
      flipHBtn: document.getElementById('iflip-h-btn'),
      flipVBtn: document.getElementById('iflip-v-btn'),
      resetFlipBtn: document.getElementById('iflip-reset-btn'),
      
      // Output settings
      formatSelect: document.getElementById('iflip-format'),
      qualitySlider: document.getElementById('iflip-quality'),
      qualityVal: document.getElementById('iflip-quality-val'),
      
      // Preview
      previewCanvas: document.getElementById('iflip-preview-canvas'),
      
      // Actions
      applyBtn: document.getElementById('iflip-apply-btn'),
      downloadBtn: document.getElementById('iflip-download-btn'),
      resetBtn: document.getElementById('iflip-tool-reset-btn'),
      progressBar: document.getElementById('iflip-progress-bar'),
      progressContainer: document.getElementById('iflip-progress-container'),
      progressText: document.getElementById('iflip-progress-text')
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

    if (dom.flipHBtn) {
      dom.flipHBtn.addEventListener('click', () => {
        flipH = !flipH;
        dom.flipHBtn.classList.toggle('active', flipH);
        drawPreview();
      });
    }

    if (dom.flipVBtn) {
      dom.flipVBtn.addEventListener('click', () => {
        flipV = !flipV;
        dom.flipVBtn.classList.toggle('active', flipV);
        drawPreview();
      });
    }

    if (dom.resetFlipBtn) {
      dom.resetFlipBtn.addEventListener('click', () => {
        flipH = false;
        flipV = false;
        if (dom.flipHBtn) dom.flipHBtn.classList.remove('active');
        if (dom.flipVBtn) dom.flipVBtn.classList.remove('active');
        drawPreview();
      });
    }

    if (dom.qualitySlider) {
      dom.qualitySlider.addEventListener('input', (e) => {
        dom.qualityVal.textContent = e.target.value + '%';
      });
    }

    dom.applyBtn.addEventListener('click', executeFlip);
    dom.downloadBtn.addEventListener('click', downloadFlipped);
    dom.resetBtn.addEventListener('click', resetTool);
  }

  async function handleFiles(files) {
    if (!files || files.length === 0) return;
    const file = files[0];

    const pdfFiles = files.filter(f => f.type === 'application/pdf' || /\.pdf$/i.test(f.name));
    if (pdfFiles.length > 0) {
      Utils.showToast(`You uploaded a PDF file ("${pdfFiles[0].name}"). Please use PDF tools for PDFs.`, 'warning');
      return;
    }

    if (!file.type.startsWith('image/') && !/\.(jpg|jpeg|png|webp|gif|bmp)$/i.test(file.name)) {
      Utils.showToast('Please select a valid image file (JPG, PNG, WebP).', 'warning');
      return;
    }

    Utils.setProcessing(true);
    showProgress(25, 'Loading image...');

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

      flipH = false;
      flipV = false;
      if (dom.flipHBtn) dom.flipHBtn.classList.remove('active');
      if (dom.flipVBtn) dom.flipVBtn.classList.remove('active');

      dom.emptyState.classList.add('hidden');
      dom.workspace.classList.remove('hidden');
      dom.downloadBtn.classList.add('hidden');
      dom.applyBtn.classList.remove('hidden');
      dom.applyBtn.disabled = false;

      drawPreview();
      Utils.showToast(`Loaded "${file.name}" (${img.naturalWidth} × ${img.naturalHeight} px). Click Flip buttons to adjust.`, 'info');
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

    const maxDim = 460;
    const scale = Math.min(maxDim / currentFile.width, maxDim / currentFile.height, 1.0);
    const displayW = Math.round(currentFile.width * scale);
    const displayH = Math.round(currentFile.height * scale);

    canvas.width = displayW;
    canvas.height = displayH;

    ctx.clearRect(0, 0, displayW, displayH);
    ctx.save();
    ctx.translate(flipH ? displayW : 0, flipV ? displayH : 0);
    ctx.scale(flipH ? -1 : 1, flipV ? -1 : 1);
    ctx.drawImage(currentFile.img, 0, 0, displayW, displayH);
    ctx.restore();
  }

  async function executeFlip() {
    if (!currentFile) return;

    Utils.setProcessing(true);
    showProgress(35, 'Flipping image at full resolution...');

    try {
      const outCanvas = document.createElement('canvas');
      outCanvas.width = currentFile.width;
      outCanvas.height = currentFile.height;
      const ctx = outCanvas.getContext('2d');

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';

      ctx.save();
      ctx.translate(flipH ? currentFile.width : 0, flipV ? currentFile.height : 0);
      ctx.scale(flipH ? -1 : 1, flipV ? -1 : 1);
      ctx.drawImage(currentFile.img, 0, 0, currentFile.width, currentFile.height);
      ctx.restore();

      const format = dom.formatSelect ? dom.formatSelect.value : 'jpeg';
      const mime = format === 'png' ? 'image/png' : (format === 'webp' ? 'image/webp' : 'image/jpeg');
      const quality = (parseInt(dom.qualitySlider ? dom.qualitySlider.value : 90, 10) || 90) / 100;

      showProgress(75, 'Encoding flipped image...');
      flippedBlob = await Utils.canvasToBlob(outCanvas, mime, quality);

      dom.applyBtn.classList.add('hidden');
      dom.downloadBtn.classList.remove('hidden');
      dom.downloadBtn.disabled = false;

      Utils.showToast(`Image flipped successfully! (${Utils.formatBytes(flippedBlob.size)})`, 'success');
    } catch (err) {
      console.error(err);
      Utils.showToast('Failed to flip image: ' + err.message, 'error');
    } finally {
      Utils.setProcessing(false);
      hideProgress();
    }
  }

  function downloadFlipped() {
    if (!flippedBlob || !currentFile) return;
    const base = Utils.getBaseName(currentFile.name);
    const format = dom.formatSelect ? dom.formatSelect.value : 'jpeg';
    const ext = format === 'jpeg' ? 'jpg' : format;
    Utils.downloadBlob(flippedBlob, `${base}-flipped.${ext}`);
  }

  function resetTool() {
    currentFile = null;
    flippedBlob = null;
    flipH = false;
    flipV = false;

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

window.ImageFlip = ImageFlip;
