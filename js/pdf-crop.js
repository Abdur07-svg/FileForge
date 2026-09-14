/**
 * FileForge - PDF Crop Tool
 * Trim margins or custom crop PDF pages with live visual overlay and lossless crop box clipping.
 */

const PDFCrop = (() => {
  let currentFile = null; // { file, name, size, buffer, pageCount, pdf }
  let page1CanvasCache = null;
  let generatedPdfBlob = null;

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
      if (inp) inp.addEventListener('input', updatePreview);
    });

    if (dom.trimPresets) {
      dom.trimPresets.forEach(btn => {
        btn.addEventListener('click', () => {
          const val = parseInt(btn.dataset.margin, 10) || 0;
          dom.topInput.value = val;
          dom.bottomInput.value = val;
          dom.leftInput.value = val;
          dom.rightInput.value = val;
          updatePreview();
        });
      });
    }

    if (dom.resetCropBtn) {
      dom.resetCropBtn.addEventListener('click', () => {
        dom.topInput.value = 0;
        dom.bottomInput.value = 0;
        dom.leftInput.value = 0;
        dom.rightInput.value = 0;
        updatePreview();
      });
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

      currentFile = {
        file,
        name: file.name,
        size: file.size,
        buffer,
        pageCount,
        pdf
      };

      dom.emptyState.classList.add('hidden');
      dom.workspace.classList.remove('hidden');
      dom.downloadBtn.classList.add('hidden');
      dom.applyBtn.classList.remove('hidden');
      dom.applyBtn.disabled = false;

      await renderPageOnePreview();
      Utils.showToast(`Loaded "${file.name}" (${pageCount} pages). Adjust crop margins and click Apply!`, 'info');
    } catch (err) {
      console.error(err);
      Utils.showToast('Failed to load PDF: ' + err.message, 'error');
      resetTool();
    } finally {
      Utils.setProcessing(false);
      hideProgress();
    }
  }

  async function renderPageOnePreview() {
    if (!currentFile || !currentFile.pdf || !dom.previewCanvas) return;
    const page = await currentFile.pdf.getPage(1);
    const viewport = page.getViewport({ scale: 0.65 });

    const offscreen = document.createElement('canvas');
    offscreen.width = Math.round(viewport.width);
    offscreen.height = Math.round(viewport.height);
    const ctx = offscreen.getContext('2d');

    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, offscreen.width, offscreen.height);

    await page.render({ canvasContext: ctx, viewport }).promise;
    page1CanvasCache = offscreen;

    updatePreview();
  }

  function updatePreview() {
    if (!page1CanvasCache || !dom.previewCanvas) return;

    const canvas = dom.previewCanvas;
    canvas.width = page1CanvasCache.width;
    canvas.height = page1CanvasCache.height;
    const ctx = canvas.getContext('2d');

    // Draw base page
    ctx.drawImage(page1CanvasCache, 0, 0);

    const top = parseInt(dom.topInput ? dom.topInput.value : 0, 10) || 0;
    const bottom = parseInt(dom.bottomInput ? dom.bottomInput.value : 0, 10) || 0;
    const left = parseInt(dom.leftInput ? dom.leftInput.value : 0, 10) || 0;
    const right = parseInt(dom.rightInput ? dom.rightInput.value : 0, 10) || 0;

    const scale = canvas.width / (page1CanvasCache.width > 0 ? page1CanvasCache.width : 500);
    const scaleFactor = 0.65; // Matches preview render scale

    const t = top * scaleFactor;
    const b = bottom * scaleFactor;
    const l = left * scaleFactor;
    const r = right * scaleFactor;

    const cropX = l;
    const cropY = t;
    const cropW = Math.max(10, canvas.width - l - r);
    const cropH = Math.max(10, canvas.height - t - b);

    // Darken cropped-out area
    ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
    ctx.fillRect(0, 0, canvas.width, cropY); // Top
    ctx.fillRect(0, cropY + cropH, canvas.width, canvas.height - (cropY + cropH)); // Bottom
    ctx.fillRect(0, cropY, cropX, cropH); // Left
    ctx.fillRect(cropX + cropW, cropY, canvas.width - (cropX + cropW), cropH); // Right

    // Draw glowing border around remaining area
    ctx.strokeStyle = '#6366f1';
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 4]);
    ctx.strokeRect(cropX, cropY, cropW, cropH);
  }

  async function applyCrop() {
    if (!currentFile) return;

    const top = parseInt(dom.topInput ? dom.topInput.value : 0, 10) || 0;
    const bottom = parseInt(dom.bottomInput ? dom.bottomInput.value : 0, 10) || 0;
    const left = parseInt(dom.leftInput ? dom.leftInput.value : 0, 10) || 0;
    const right = parseInt(dom.rightInput ? dom.rightInput.value : 0, 10) || 0;

    if (top === 0 && bottom === 0 && left === 0 && right === 0) {
      Utils.showToast('Please set at least one margin to crop.', 'warning');
      return;
    }

    Utils.setProcessing(true);
    showProgress(25, 'Applying crop box to PDF pages...');

    try {
      const srcDoc = await PDFLib.PDFDocument.load(currentFile.buffer, { ignoreEncryption: true });
      const pages = srcDoc.getPages();
      const total = pages.length;

      for (let i = 0; i < total; i++) {
        showProgress(35 + Math.round((i / total) * 50), `Cropping page ${i + 1} of ${total}...`);
        await yieldToUI();

        const page = pages[i];
        const { width, height } = page.getSize();

        const newX = left;
        const newY = bottom;
        const newW = Math.max(20, width - left - right);
        const newH = Math.max(20, height - top - bottom);

        page.setCropBox(newX, newY, newW, newH);
      }

      showProgress(90, 'Saving cropped PDF...');
      const finalPdfBytes = await srcDoc.save({ useObjectStreams: true });
      generatedPdfBlob = new Blob([finalPdfBytes], { type: 'application/pdf' });

      dom.applyBtn.classList.add('hidden');
      dom.downloadBtn.classList.remove('hidden');
      dom.downloadBtn.disabled = false;

      Utils.showToast('PDF cropped successfully! Download your new document.', 'success');
    } catch (err) {
      console.error(err);
      Utils.showToast('Error cropping PDF: ' + err.message, 'error');
    } finally {
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
    currentFile = null;
    page1CanvasCache = null;
    generatedPdfBlob = null;

    if (dom.topInput) dom.topInput.value = 0;
    if (dom.bottomInput) dom.bottomInput.value = 0;
    if (dom.leftInput) dom.leftInput.value = 0;
    if (dom.rightInput) dom.rightInput.value = 0;

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

window.PDFCrop = PDFCrop;
