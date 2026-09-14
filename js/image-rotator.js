/**
 * FileForge - Image Rotate Tool
 * Rotate images by 90° increments or custom angle sliders with live canvas preview and lossless options.
 */

const ImageRotator = (() => {
  let currentFile = null; // { file, name, dataUrl, img, width, height }
  let currentAngle = 0;
  let rotatedBlob = null;

  let dom = {};

  function init() {
    dom = {
      container: document.getElementById('tool-image-rotate'),
      dropzone: document.getElementById('irot-dropzone'),
      fileInput: document.getElementById('irot-file-input'),
      browseBtn: document.getElementById('irot-browse-btn'),
      workspace: document.getElementById('irot-workspace'),
      emptyState: document.getElementById('irot-empty-state'),
      
      // Controls
      rotateCwBtn: document.getElementById('irot-cw-btn'),
      rotateCcwBtn: document.getElementById('irot-ccw-btn'),
      rotate180Btn: document.getElementById('irot-180-btn'),
      angleSlider: document.getElementById('irot-angle-slider'),
      angleVal: document.getElementById('irot-angle-val'),
      resetAngleBtn: document.getElementById('irot-reset-angle-btn'),
      
      // Output settings
      formatSelect: document.getElementById('irot-format'),
      qualitySlider: document.getElementById('irot-quality'),
      qualityVal: document.getElementById('irot-quality-val'),
      
      // Preview
      previewCanvas: document.getElementById('irot-preview-canvas'),
      
      // Actions
      applyBtn: document.getElementById('irot-apply-btn'),
      downloadBtn: document.getElementById('irot-download-btn'),
      resetBtn: document.getElementById('irot-reset-btn'),
      progressBar: document.getElementById('irot-progress-bar'),
      progressContainer: document.getElementById('irot-progress-container'),
      progressText: document.getElementById('irot-progress-text')
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

    if (dom.rotateCwBtn) dom.rotateCwBtn.addEventListener('click', () => setAngle(currentAngle + 90));
    if (dom.rotateCcwBtn) dom.rotateCcwBtn.addEventListener('click', () => setAngle(currentAngle - 90));
    if (dom.rotate180Btn) dom.rotate180Btn.addEventListener('click', () => setAngle(currentAngle + 180));
    
    if (dom.angleSlider) {
      dom.angleSlider.addEventListener('input', (e) => {
        setAngle(parseInt(e.target.value, 10) || 0, false);
      });
    }

    if (dom.resetAngleBtn) dom.resetAngleBtn.addEventListener('click', () => setAngle(0));

    if (dom.qualitySlider) {
      dom.qualitySlider.addEventListener('input', (e) => {
        dom.qualityVal.textContent = e.target.value + '%';
      });
    }

    dom.applyBtn.addEventListener('click', executeRotate);
    dom.downloadBtn.addEventListener('click', downloadRotated);
    dom.resetBtn.addEventListener('click', resetTool);
  }

  function setAngle(angle, updateSlider = true) {
    currentAngle = angle % 360;
    if (currentAngle < -180) currentAngle += 360;
    if (currentAngle > 180) currentAngle -= 360;

    if (updateSlider && dom.angleSlider) {
      dom.angleSlider.value = currentAngle;
    }
    if (dom.angleVal) {
      dom.angleVal.textContent = `${currentAngle}°`;
    }

    drawPreview();
  }

  async function handleFiles(files) {
    if (!files || files.length === 0) return;
    const file = files[0];

    const pdfFiles = files.filter(f => f.type === 'application/pdf' || /\.pdf$/i.test(f.name));
    if (pdfFiles.length > 0) {
      Utils.showToast(`You uploaded a PDF file ("${pdfFiles[0].name}"). Please use the PDF Rotate tool for PDFs.`, 'warning');
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

      currentAngle = 0;
      if (dom.angleSlider) dom.angleSlider.value = 0;
      if (dom.angleVal) dom.angleVal.textContent = '0°';

      dom.emptyState.classList.add('hidden');
      dom.workspace.classList.remove('hidden');
      dom.downloadBtn.classList.add('hidden');
      dom.applyBtn.classList.remove('hidden');
      dom.applyBtn.disabled = false;

      drawPreview();
      Utils.showToast(`Loaded "${file.name}" (${img.naturalWidth} × ${img.naturalHeight} px). Rotate and click Save!`, 'info');
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
    const rad = (currentAngle * Math.PI) / 180;

    const maxDim = 460;
    let baseW = currentFile.width;
    let baseH = currentFile.height;

    const scale = Math.min(maxDim / baseW, maxDim / baseH, 1.0);
    baseW = Math.round(baseW * scale);
    baseH = Math.round(baseH * scale);

    // Calculate rotated bounding box
    const absCos = Math.abs(Math.cos(rad));
    const absSin = Math.abs(Math.sin(rad));
    const rotW = Math.round(baseW * absCos + baseH * absSin);
    const rotH = Math.round(baseW * absSin + baseH * absCos);

    canvas.width = rotW;
    canvas.height = rotH;

    ctx.clearRect(0, 0, rotW, rotH);
    ctx.save();
    ctx.translate(rotW / 2, rotH / 2);
    ctx.rotate(rad);
    ctx.drawImage(currentFile.img, -baseW / 2, -baseH / 2, baseW, baseH);
    ctx.restore();
  }

  async function executeRotate() {
    if (!currentFile) return;

    Utils.setProcessing(true);
    showProgress(35, 'Rotating image at full resolution...');

    try {
      const rad = (currentAngle * Math.PI) / 180;
      const baseW = currentFile.width;
      const baseH = currentFile.height;

      const absCos = Math.abs(Math.cos(rad));
      const absSin = Math.abs(Math.sin(rad));
      const outW = Math.round(baseW * absCos + baseH * absSin);
      const outH = Math.round(baseW * absSin + baseH * absCos);

      const outCanvas = document.createElement('canvas');
      outCanvas.width = outW;
      outCanvas.height = outH;
      const ctx = outCanvas.getContext('2d');

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';

      ctx.translate(outW / 2, outH / 2);
      ctx.rotate(rad);
      ctx.drawImage(currentFile.img, -baseW / 2, -baseH / 2, baseW, baseH);

      const format = dom.formatSelect ? dom.formatSelect.value : 'jpeg';
      const mime = format === 'png' ? 'image/png' : (format === 'webp' ? 'image/webp' : 'image/jpeg');
      const quality = (parseInt(dom.qualitySlider ? dom.qualitySlider.value : 90, 10) || 90) / 100;

      showProgress(75, 'Encoding rotated image...');
      rotatedBlob = await Utils.canvasToBlob(outCanvas, mime, quality);

      dom.applyBtn.classList.add('hidden');
      dom.downloadBtn.classList.remove('hidden');
      dom.downloadBtn.disabled = false;

      Utils.showToast(`Image rotated by ${currentAngle}°! (${Utils.formatBytes(rotatedBlob.size)})`, 'success');
    } catch (err) {
      console.error(err);
      Utils.showToast('Failed to rotate image: ' + err.message, 'error');
    } finally {
      Utils.setProcessing(false);
      hideProgress();
    }
  }

  function downloadRotated() {
    if (!rotatedBlob || !currentFile) return;
    const base = Utils.getBaseName(currentFile.name);
    const format = dom.formatSelect ? dom.formatSelect.value : 'jpeg';
    const ext = format === 'jpeg' ? 'jpg' : format;
    Utils.downloadBlob(rotatedBlob, `${base}-rotated.${ext}`);
  }

  function resetTool() {
    currentFile = null;
    rotatedBlob = null;
    currentAngle = 0;

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

window.ImageRotator = ImageRotator;
