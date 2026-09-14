/**
 * FileForge - Image Resizer Tool
 * Batch image resizing with pixel dimension lock, percentage scaling, and format output.
 */

const ImageResizer = (() => {
  let files = []; // { file, name, dataUrl, origWidth, origHeight, origSize, resizedBlob, resizedUrl, resizedWidth, resizedHeight }
  let activeIndex = 0;
  let resizeMode = 'dimensions'; // 'dimensions' or 'percentage'

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
    dom.modeDimsRadio.addEventListener('change', () => {
      resizeMode = 'dimensions';
      dom.dimsPanel.classList.remove('hidden');
      dom.pctPanel.classList.add('hidden');
      updateDimensionsFromMode();
    });

    dom.modePctRadio.addEventListener('change', () => {
      resizeMode = 'percentage';
      dom.dimsPanel.classList.add('hidden');
      dom.pctPanel.classList.remove('hidden');
      updateDimensionsFromMode();
    });

    // Percentage slider & presets
    dom.pctSlider.addEventListener('input', (e) => {
      dom.pctVal.textContent = e.target.value + '%';
      updateDimensionsFromMode();
    });

    dom.pctPresets.forEach(btn => {
      btn.addEventListener('click', () => {
        const val = btn.dataset.pct;
        dom.pctSlider.value = val;
        dom.pctVal.textContent = val + '%';
        updateDimensionsFromMode();
      });
    });

    // Dimension inputs with ratio lock
    dom.widthInput.addEventListener('input', () => {
      const active = files[activeIndex];
      if (active && dom.aspectRatioCheck.checked && dom.widthInput.value) {
        const ratio = active.origWidth / active.origHeight;
        dom.heightInput.value = Math.max(1, Math.round(dom.widthInput.value / ratio));
      }
      updatePreviewStats();
    });

    dom.heightInput.addEventListener('input', () => {
      const active = files[activeIndex];
      if (active && dom.aspectRatioCheck.checked && dom.heightInput.value) {
        const ratio = active.origWidth / active.origHeight;
        dom.widthInput.value = Math.max(1, Math.round(dom.heightInput.value * ratio));
      }
      updatePreviewStats();
    });

    dom.resizeBtn.addEventListener('click', resizeAll);
    dom.downloadBtn.addEventListener('click', downloadCurrent);
    dom.downloadAllBtn.addEventListener('click', downloadAll);
    dom.resetBtn.addEventListener('click', resetTool);
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
      Utils.showToast(`Loaded ${valid.length} image(s). Adjust settings and click Resize!`, 'success');
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
    dom.previewImg.src = active.resizedUrl || active.dataUrl;

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

    if (files.length > 1) {
      dom.downloadAllBtn.classList.remove('hidden');
    } else {
      dom.downloadAllBtn.classList.add('hidden');
    }
  }

  function updateDimensionsFromMode() {
    const active = files[activeIndex];
    if (!active) return;

    if (resizeMode === 'percentage') {
      const pct = parseInt(dom.pctSlider.value, 10) / 100;
      const targetW = Math.max(1, Math.round(active.origWidth * pct));
      const targetH = Math.max(1, Math.round(active.origHeight * pct));
      dom.widthInput.value = targetW;
      dom.heightInput.value = targetH;
    } else {
      if (!dom.widthInput.value || dom.widthInput.value <= 0) {
        dom.widthInput.value = active.origWidth;
      }
      if (!dom.heightInput.value || dom.heightInput.value <= 0) {
        dom.heightInput.value = active.origHeight;
      }
    }
    updatePreviewStats();
  }

  function updatePreviewStats() {
    const w = parseInt(dom.widthInput.value, 10);
    const h = parseInt(dom.heightInput.value, 10);
    if (w && h) {
      dom.newDimsText.textContent = `${w} × ${h} px (target)`;
    }
  }

  function renderFileList() {
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

    const format = dom.formatSelect.value;
    const active = files[activeIndex];
    const userTargetW = parseInt(dom.widthInput.value, 10) || active.origWidth;
    const userTargetH = parseInt(dom.heightInput.value, 10) || active.origHeight;
    const pct = parseInt(dom.pctSlider.value, 10) / 100;

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
          // If single image or active image, use exact user dimensions
          if (i === activeIndex) {
            targetW = userTargetW;
            targetH = userTargetH;
          } else {
            // For batch images with different dimensions, apply proportional scaling
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
    dom.emptyState.classList.remove('hidden');
    dom.workspace.classList.add('hidden');
    dom.downloadBtn.disabled = true;
    dom.previewImg.src = '';
    dom.origDimsText.textContent = '-';
    dom.origSizeText.textContent = '-';
    dom.newDimsText.textContent = '-';
    dom.newSizeText.textContent = '-';
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
