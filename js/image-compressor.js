/**
 * FileForge - Image Compressor Tool
 * Compresses JPG, PNG, WebP with quality control, optional dimensions & live side-by-side preview.
 */

const ImageCompressor = (() => {
  let currentFiles = []; // Array of { file, originalDataUrl, originalWidth, originalHeight, compressedBlob, compressedUrl, name }
  let activeIndex = 0;
  let originalRatio = 1;

  // DOM Elements cache
  let dom = {};

  function init() {
    dom = {
      container: document.getElementById('tool-image-compressor'),
      dropzone: document.getElementById('ic-dropzone'),
      fileInput: document.getElementById('ic-file-input'),
      browseBtn: document.getElementById('ic-browse-btn'),
      workspace: document.getElementById('ic-workspace'),
      emptyState: document.getElementById('ic-empty-state'),
      fileList: document.getElementById('ic-file-list'),
      
      // Controls
      qualitySlider: document.getElementById('ic-quality'),
      qualityNum: document.getElementById('ic-quality-num'),
      qualityVal: document.getElementById('ic-quality-val'),
      presetBtns: document.querySelectorAll('.ic-preset-btn'),
      formatSelect: document.getElementById('ic-format'),
      widthInput: document.getElementById('ic-width'),
      heightInput: document.getElementById('ic-height'),
      aspectRatioCheck: document.getElementById('ic-aspect-ratio'),
      resetDimsBtn: document.getElementById('ic-reset-dims'),
      
      // Stats & Preview
      origSizeText: document.getElementById('ic-orig-size'),
      compSizeText: document.getElementById('ic-comp-size'),
      savedBadge: document.getElementById('ic-saved-badge'),
      origDimensionsText: document.getElementById('ic-orig-dims'),
      compDimensionsText: document.getElementById('ic-comp-dims'),
      previewBefore: document.getElementById('ic-preview-before'),
      previewAfter: document.getElementById('ic-preview-after'),
      
      // Actions
      compressBtn: document.getElementById('ic-compress-btn'),
      downloadBtn: document.getElementById('ic-download-btn'),
      downloadAllBtn: document.getElementById('ic-download-all-btn'),
      resetBtn: document.getElementById('ic-reset-btn'),
      progressBar: document.getElementById('ic-progress-bar'),
      progressContainer: document.getElementById('ic-progress-container'),
      progressText: document.getElementById('ic-progress-text')
    };

    if (!dom.container) return;

    if (dom.qualityNum && dom.qualitySlider) {
      dom.qualityNum.value = dom.qualitySlider.value;
    }

    bindEvents();
  }

  function bindEvents() {
    // Dropzone
    Utils.setupDropZone(dom.dropzone, handleFiles, ['image/', '.jpg', '.jpeg', '.png', '.webp']);
    dom.browseBtn.addEventListener('click', () => dom.fileInput.click());
    dom.fileInput.addEventListener('change', (e) => {
      handleFiles(Array.from(e.target.files));
      dom.fileInput.value = '';
    });

    // Quality slider
    dom.qualitySlider.addEventListener('input', (e) => {
      const val = parseInt(e.target.value, 10);
      if (dom.qualityNum) dom.qualityNum.value = val;
      dom.qualityVal.textContent = val + '%';
      updatePresetHighlight(val);
      debounceAutoCompress();
    });

    // Quality direct number input
    if (dom.qualityNum) {
      dom.qualityNum.addEventListener('input', (e) => {
        let val = parseInt(e.target.value, 10);
        if (isNaN(val)) return;
        val = Math.max(10, Math.min(100, val));
        dom.qualitySlider.value = val;
        dom.qualityVal.textContent = val + '%';
        updatePresetHighlight(val);
        debounceAutoCompress();
      });

      dom.qualityNum.addEventListener('change', (e) => {
        let val = parseInt(e.target.value, 10);
        if (isNaN(val) || val < 10) val = 10;
        if (val > 100) val = 100;
        dom.qualityNum.value = val;
        dom.qualitySlider.value = val;
        dom.qualityVal.textContent = val + '%';
        updatePresetHighlight(val);
        debounceAutoCompress();
      });
    }

    // Preset buttons
    if (dom.presetBtns) {
      dom.presetBtns.forEach(btn => {
        btn.addEventListener('click', () => {
          const pct = parseInt(btn.dataset.pct, 10);
          dom.qualitySlider.value = pct;
          if (dom.qualityNum) dom.qualityNum.value = pct;
          dom.qualityVal.textContent = pct + '%';
          updatePresetHighlight(pct);
          debounceAutoCompress();
        });
      });
    }

    function updatePresetHighlight(pct) {
      if (dom.presetBtns) {
        dom.presetBtns.forEach(b => {
          b.classList.toggle('active', parseInt(b.dataset.pct, 10) === pct);
        });
      }
    }

    // Format select
    dom.formatSelect.addEventListener('change', debounceAutoCompress);

    // Dimension inputs with aspect ratio lock
    dom.widthInput.addEventListener('input', () => {
      if (dom.aspectRatioCheck.checked && originalRatio && dom.widthInput.value) {
        dom.heightInput.value = Math.round(dom.widthInput.value / originalRatio);
      }
      debounceAutoCompress();
    });

    dom.heightInput.addEventListener('input', () => {
      if (dom.aspectRatioCheck.checked && originalRatio && dom.heightInput.value) {
        dom.widthInput.value = Math.round(dom.heightInput.value * originalRatio);
      }
      debounceAutoCompress();
    });

    dom.resetDimsBtn.addEventListener('click', () => {
      const active = currentFiles[activeIndex];
      if (active) {
        dom.widthInput.value = active.originalWidth;
        dom.heightInput.value = active.originalHeight;
        debounceAutoCompress();
      }
    });

    // Action buttons
    dom.compressBtn.addEventListener('click', handleCompressClick);
    dom.downloadBtn.addEventListener('click', downloadCurrent);
    dom.downloadAllBtn.addEventListener('click', downloadAll);
    dom.resetBtn.addEventListener('click', resetTool);
  }

  function handleCompressClick() {
    if (currentFiles.length === 0) return;
    if (currentFiles.length === 1) {
      compressCurrentFile();
    } else {
      processAll();
    }
  }

  let autoCompressTimer = null;
  function debounceAutoCompress() {
    clearTimeout(autoCompressTimer);
    autoCompressTimer = setTimeout(() => {
      if (currentFiles.length > 0 && currentFiles[activeIndex] && currentFiles[activeIndex].compressedBlob) {
        compressCurrentFile();
      }
    }, 280);
  }

  async function handleFiles(files) {
    if (!files || files.length === 0) return;

    const pdfFiles = files.filter(f => f.type === 'application/pdf' || /\.pdf$/i.test(f.name));
    if (pdfFiles.length > 0 && files.length === pdfFiles.length) {
      Utils.showToast(`You uploaded a PDF file ("${pdfFiles[0].name}"). Please use the PDF Compressor tool for PDF documents.`, 'warning');
      return;
    }

    const validImages = files.filter(f => f.type.startsWith('image/') || /\.(jpg|jpeg|png|webp|gif|bmp)$/i.test(f.name));
    if (validImages.length === 0) {
      Utils.showToast('Please upload valid image files (JPG, PNG, WebP).', 'warning');
      return;
    }

    Utils.setProcessing(true);
    showProgress(10, 'Loading images...');

    try {
      for (const file of validImages) {
        const dataUrl = await Utils.readFileAsDataURL(file);
        const img = await Utils.loadImage(dataUrl);

        currentFiles.push({
          file,
          name: file.name,
          originalSize: file.size,
          originalWidth: img.naturalWidth,
          originalHeight: img.naturalHeight,
          originalDataUrl: dataUrl,
          compressedBlob: null,
          compressedUrl: null,
          compressedWidth: img.naturalWidth,
          compressedHeight: img.naturalHeight
        });
      }

      dom.emptyState.classList.add('hidden');
      dom.workspace.classList.remove('hidden');

      activeIndex = 0;
      updateActiveFileControls();
      renderFileList();
      
      // Ensure download button remains disabled upon initial upload until user compresses
      if (dom.downloadBtn) dom.downloadBtn.disabled = true;
      if (dom.downloadAllBtn) dom.downloadAllBtn.disabled = true;
      
      Utils.showToast(`Loaded ${validImages.length} image(s). Adjust settings and click "Compress Image".`, 'info');
    } catch (err) {
      console.error(err);
      Utils.showToast('Failed to load image: ' + err.message, 'error');
    } finally {
      Utils.setProcessing(false);
      hideProgress();
    }
  }

  function updateActiveFileControls() {
    const active = currentFiles[activeIndex];
    if (!active) return;

    originalRatio = active.originalWidth / active.originalHeight;
    dom.widthInput.value = active.originalWidth;
    dom.heightInput.value = active.originalHeight;
    dom.origDimensionsText.textContent = `${active.originalWidth} × ${active.originalHeight} px`;
    dom.origSizeText.textContent = Utils.formatBytes(active.originalSize);
    dom.previewBefore.src = active.originalDataUrl;

    if (active.compressedBlob) {
      dom.previewAfter.src = active.compressedUrl;
      dom.compSizeText.textContent = Utils.formatBytes(active.compressedBlob.size);
      dom.compDimensionsText.textContent = `${active.compressedWidth} × ${active.compressedHeight} px`;
      dom.downloadBtn.disabled = false;
      const reduction = Utils.calculateReduction(active.originalSize, active.compressedBlob.size);
      if (reduction > 0) {
        dom.savedBadge.textContent = `-${reduction}%`;
        dom.savedBadge.className = 'metric-badge badge-success';
      } else if (reduction === 0) {
        dom.savedBadge.textContent = `0%`;
        dom.savedBadge.className = 'metric-badge badge-neutral';
      } else {
        dom.savedBadge.textContent = `+${Math.abs(reduction)}%`;
        dom.savedBadge.className = 'metric-badge badge-warning';
      }
    } else {
      dom.previewAfter.src = '';
      dom.compSizeText.textContent = '-';
      dom.compDimensionsText.textContent = '-';
      dom.savedBadge.textContent = '-';
      dom.savedBadge.className = 'metric-badge badge-neutral';
      dom.downloadBtn.disabled = true;
    }

    if (currentFiles.length > 1) {
      dom.downloadAllBtn.classList.remove('hidden');
      const allCompressed = currentFiles.every(f => f.compressedBlob);
      dom.downloadAllBtn.disabled = !allCompressed;
    } else {
      dom.downloadAllBtn.classList.add('hidden');
    }
  }

  function renderFileList() {
    dom.fileList.innerHTML = '';
    if (currentFiles.length <= 1) {
      dom.fileList.classList.add('hidden');
      return;
    }

    dom.fileList.classList.remove('hidden');
    currentFiles.forEach((item, idx) => {
      const chip = document.createElement('div');
      chip.className = `file-chip ${idx === activeIndex ? 'active' : ''}`;
      chip.innerHTML = `
        <img src="${item.originalDataUrl}" class="chip-thumb" alt="thumb">
        <span class="chip-name" title="${item.name}">${item.name}</span>
        <span class="chip-size">${item.compressedBlob ? Utils.formatBytes(item.compressedBlob.size) : Utils.formatBytes(item.originalSize)}</span>
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
        updateActiveFileControls();
      });

      dom.fileList.appendChild(chip);
    });
  }

  function removeFile(index) {
    if (currentFiles[index].compressedUrl) {
      URL.revokeObjectURL(currentFiles[index].compressedUrl);
    }
    currentFiles.splice(index, 1);
    if (currentFiles.length === 0) {
      resetTool();
      return;
    }
    if (activeIndex >= currentFiles.length) {
      activeIndex = currentFiles.length - 1;
    }
    renderFileList();
    updateActiveFileControls();
  }

  /**
   * Adaptive Color Quantization for PNG images
   * Reduces bit depth and palette variance so PNG deflate compression achieves high ratio
   */
  function applyPngQuantization(data, width, height, quality) {
    // Quality mapping: 
    // 0.85 - 1.0 -> 64 levels (6-bit)
    // 0.65 - 0.85 -> 32 levels (5-bit)
    // 0.40 - 0.65 -> 16 levels (4-bit)
    // < 0.40 -> 8 levels (3-bit)
    let levels = 32;
    if (quality >= 0.85) levels = 64;
    else if (quality >= 0.65) levels = 32;
    else if (quality >= 0.40) levels = 16;
    else levels = 8;

    const step = 256 / levels;
    const half = step / 2;
    const len = data.length;

    for (let i = 0; i < len; i += 4) {
      const a = data[i + 3];
      if (a < 16) {
        data[i + 3] = 0;
        continue;
      }
      data[i] = Math.min(255, Math.floor(data[i] / step) * step + half);
      data[i + 1] = Math.min(255, Math.floor(data[i + 1] / step) * step + half);
      data[i + 2] = Math.min(255, Math.floor(data[i + 2] / step) * step + half);
      if (a > 240) data[i + 3] = 255;
    }
  }

  async function compressSingle(fileItem, quality, format, targetWidth, targetHeight) {
    const img = await Utils.loadImage(fileItem.originalDataUrl);
    const canvas = document.createElement('canvas');
    canvas.width = targetWidth;
    canvas.height = targetHeight;
    const ctx = canvas.getContext('2d');

    // Smooth image scaling
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    // Handle format specifics strictly based on user selection or source file
    let outputMime = 'image/jpeg';
    if (format === 'png') {
      outputMime = 'image/png';
    } else if (format === 'webp') {
      outputMime = 'image/webp';
    } else if (format === 'jpeg') {
      outputMime = 'image/jpeg';
    } else if (format === 'original') {
      const fname = (fileItem.name || '').toLowerCase();
      const ftype = (fileItem.file && fileItem.file.type) || '';
      if (ftype === 'image/png' || fname.endsWith('.png')) {
        outputMime = 'image/png';
      } else if (ftype === 'image/webp' || fname.endsWith('.webp')) {
        outputMime = 'image/webp';
      } else if (ftype === 'image/jpeg' || fname.endsWith('.jpg') || fname.endsWith('.jpeg')) {
        outputMime = 'image/jpeg';
      } else {
        outputMime = ftype || 'image/jpeg';
      }
    }

    if (outputMime === 'image/jpeg') {
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, targetWidth, targetHeight);
    }

    ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

    let blob;

    if (outputMime === 'image/png') {
      // For PNG: Apply adaptive color quantization to achieve true lossy PNG size reduction
      const workCanvas = document.createElement('canvas');
      workCanvas.width = targetWidth;
      workCanvas.height = targetHeight;
      const workCtx = workCanvas.getContext('2d');
      workCtx.drawImage(canvas, 0, 0);

      const imgData = workCtx.getImageData(0, 0, targetWidth, targetHeight);
      applyPngQuantization(imgData.data, targetWidth, targetHeight, quality);
      workCtx.putImageData(imgData, 0, 0);

      blob = await Utils.canvasToBlob(workCanvas, 'image/png');

      // If output is still larger than original and dimensions are unchanged, try stronger quantization
      if (blob.size >= fileItem.originalSize && targetWidth === fileItem.originalWidth && targetHeight === fileItem.originalHeight) {
        let testQuality = quality;
        while (blob.size >= fileItem.originalSize && testQuality > 0.15) {
          testQuality -= 0.2;
          const freshData = ctx.getImageData(0, 0, targetWidth, targetHeight);
          applyPngQuantization(freshData.data, targetWidth, targetHeight, Math.max(0.1, testQuality));
          workCtx.putImageData(freshData, 0, 0);
          const lowerBlob = await Utils.canvasToBlob(workCanvas, 'image/png');
          if (lowerBlob.size < blob.size) {
            blob = lowerBlob;
          } else {
            break;
          }
        }

        // Absolute Safety Guard: If original file was already hyper-optimized PNG, never increase size
        if (blob.size > fileItem.originalSize && format === 'original') {
          blob = fileItem.file;
        }
      }
    } else {
      // For JPEG and WebP: standard quality encoding with iterative tuning
      blob = await Utils.canvasToBlob(canvas, outputMime, quality);

      if (blob.size >= fileItem.originalSize && targetWidth === fileItem.originalWidth && targetHeight === fileItem.originalHeight) {
        let tryQuality = quality;
        while (blob.size >= fileItem.originalSize && tryQuality > 0.15) {
          tryQuality -= 0.15;
          const lowerBlob = await Utils.canvasToBlob(canvas, outputMime, tryQuality);
          if (lowerBlob.size < blob.size) {
            blob = lowerBlob;
          } else {
            break;
          }
        }

        // Absolute Safety Guard: Never output larger file than original in original format mode
        if (blob.size > fileItem.originalSize && format === 'original') {
          blob = fileItem.file;
        }
      }
    }

    return {
      blob,
      width: targetWidth,
      height: targetHeight,
      mime: outputMime
    };
  }

  async function compressCurrentFile() {
    const active = currentFiles[activeIndex];
    if (!active) return;

    Utils.setProcessing(true);
    showProgress(30, 'Compressing active image...');

    const quality = parseInt(dom.qualitySlider.value, 10) / 100;
    const format = dom.formatSelect.value;
    const targetWidth = parseInt(dom.widthInput.value, 10) || active.originalWidth;
    const targetHeight = parseInt(dom.heightInput.value, 10) || active.originalHeight;

    try {
      const result = await compressSingle(active, quality, format, targetWidth, targetHeight);
      
      if (active.compressedUrl) {
        URL.revokeObjectURL(active.compressedUrl);
      }

      active.compressedBlob = result.blob;
      active.compressedUrl = URL.createObjectURL(result.blob);
      active.compressedWidth = result.width;
      active.compressedHeight = result.height;
      active.outputMime = result.mime;

      // Update UI
      updateActiveFileControls();
      renderFileList();
      Utils.showToast('Image compressed successfully! Click Download Image to save.', 'success');
    } catch (err) {
      console.error('Compression error:', err);
      Utils.showToast('Compression error: ' + err.message, 'error');
    } finally {
      Utils.setProcessing(false);
      hideProgress();
    }
  }

  async function processAll() {
    if (currentFiles.length === 0) return;
    Utils.setProcessing(true);
    showProgress(10, 'Compressing image(s)...');

    const quality = parseInt(dom.qualitySlider.value, 10) / 100;
    const format = dom.formatSelect.value;

    try {
      for (let i = 0; i < currentFiles.length; i++) {
        const item = currentFiles[i];
        const pct = Math.round(((i + 1) / currentFiles.length) * 100);
        showProgress(pct, `Compressing (${i + 1}/${currentFiles.length}): ${item.name}`);

        let w = item.originalWidth;
        let h = item.originalHeight;
        if (i === activeIndex) {
          w = parseInt(dom.widthInput.value, 10) || item.originalWidth;
          h = parseInt(dom.heightInput.value, 10) || item.originalHeight;
        }

        const res = await compressSingle(item, quality, format, w, h);
        if (item.compressedUrl) URL.revokeObjectURL(item.compressedUrl);
        item.compressedBlob = res.blob;
        item.compressedUrl = URL.createObjectURL(res.blob);
        item.compressedWidth = res.width;
        item.compressedHeight = res.height;
        item.outputMime = res.mime;
      }

      updateActiveFileControls();
      renderFileList();
      Utils.showToast(`Compressed ${currentFiles.length} image(s) successfully! Ready to download.`, 'success');
    } catch (err) {
      console.error(err);
      Utils.showToast('Batch compression failed: ' + err.message, 'error');
    } finally {
      Utils.setProcessing(false);
      hideProgress();
    }
  }

  function getOutputExtension(mime) {
    if (mime === 'image/jpeg') return 'jpg';
    if (mime === 'image/png') return 'png';
    if (mime === 'image/webp') return 'webp';
    return 'jpg';
  }

  function downloadCurrent() {
    const active = currentFiles[activeIndex];
    if (!active || !active.compressedBlob) return;
    const ext = getOutputExtension(active.outputMime);
    const filename = `${Utils.getBaseName(active.name)}-compressed.${ext}`;
    Utils.downloadBlob(active.compressedBlob, filename);
  }

  async function downloadAll() {
    if (currentFiles.length === 0) return;
    const filesToZip = [];
    for (const item of currentFiles) {
      if (!item.compressedBlob) {
        await processAll();
        break;
      }
    }

    currentFiles.forEach((item, idx) => {
      if (item.compressedBlob) {
        const ext = getOutputExtension(item.outputMime);
        const name = `${Utils.getBaseName(item.name)}-compressed-${idx + 1}.${ext}`;
        filesToZip.push({ name, blob: item.compressedBlob });
      }
    });

    if (filesToZip.length === 0) return;
    Utils.downloadAsZip(filesToZip, 'fileforge-compressed-images.zip');
  }

  function resetTool() {
    currentFiles.forEach(item => {
      if (item.compressedUrl) URL.revokeObjectURL(item.compressedUrl);
    });
    currentFiles = [];
    activeIndex = 0;
    dom.emptyState.classList.remove('hidden');
    dom.workspace.classList.add('hidden');
    dom.downloadBtn.disabled = true;
    dom.previewBefore.src = '';
    dom.previewAfter.src = '';
    dom.origSizeText.textContent = '-';
    dom.compSizeText.textContent = '-';
    dom.savedBadge.textContent = '-';
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

window.ImageCompressor = ImageCompressor;
