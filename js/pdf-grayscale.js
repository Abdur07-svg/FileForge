/**
 * FileForge - PDF Grayscale Tool
 * Convert full-color PDF documents into clean, ink-saving grayscale & black/white documents.
 */

const PDFGrayscale = (() => {
  let currentFile = null; // { file, name, size, buffer, pageCount }
  let generatedPdfBlob = null;
  let page1CanvasCache = null;

  let dom = {};

  function init() {
    dom = {
      container: document.getElementById('tool-pdf-grayscale'),
      dropzone: document.getElementById('pgs-dropzone'),
      fileInput: document.getElementById('pgs-file-input'),
      browseBtn: document.getElementById('pgs-browse-btn'),
      workspace: document.getElementById('pgs-workspace'),
      emptyState: document.getElementById('pgs-empty-state'),
      
      // Mode Presets
      modeSelect: document.getElementById('pgs-mode'),
      contrastSlider: document.getElementById('pgs-contrast'),
      contrastVal: document.getElementById('pgs-contrast-val'),
      brightnessSlider: document.getElementById('pgs-brightness'),
      brightnessVal: document.getElementById('pgs-brightness-val'),
      
      // Live Preview
      previewBeforeCanvas: document.getElementById('pgs-preview-before'),
      previewAfterCanvas: document.getElementById('pgs-preview-after'),
      
      // Actions
      convertBtn: document.getElementById('pgs-convert-btn'),
      downloadBtn: document.getElementById('pgs-download-btn'),
      resetBtn: document.getElementById('pgs-reset-btn'),
      progressBar: document.getElementById('pgs-progress-bar'),
      progressContainer: document.getElementById('pgs-progress-container'),
      progressText: document.getElementById('pgs-progress-text')
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

    if (dom.modeSelect) {
      dom.modeSelect.addEventListener('change', () => {
        if (dom.modeSelect.value === 'high-contrast') {
          if (dom.contrastSlider) dom.contrastSlider.value = 130;
          if (dom.brightnessSlider) dom.brightnessSlider.value = 105;
        } else if (dom.modeSelect.value === 'pure-bw') {
          if (dom.contrastSlider) dom.contrastSlider.value = 180;
          if (dom.brightnessSlider) dom.brightnessSlider.value = 110;
        } else {
          if (dom.contrastSlider) dom.contrastSlider.value = 100;
          if (dom.brightnessSlider) dom.brightnessSlider.value = 100;
        }
        if (dom.contrastVal) dom.contrastVal.textContent = (dom.contrastSlider ? dom.contrastSlider.value : 100) + '%';
        if (dom.brightnessVal) dom.brightnessVal.textContent = (dom.brightnessSlider ? dom.brightnessSlider.value : 100) + '%';
        updatePreview();
      });
    }

    if (dom.contrastSlider) {
      dom.contrastSlider.addEventListener('input', (e) => {
        dom.contrastVal.textContent = e.target.value + '%';
        updatePreview();
      });
    }

    if (dom.brightnessSlider) {
      dom.brightnessSlider.addEventListener('input', (e) => {
        dom.brightnessVal.textContent = e.target.value + '%';
        updatePreview();
      });
    }

    dom.convertBtn.addEventListener('click', convertToGrayscale);
    dom.downloadBtn.addEventListener('click', downloadGrayscalePDF);
    dom.resetBtn.addEventListener('click', resetTool);
  }

  async function handleFiles(files) {
    if (!files || files.length === 0) return;
    const file = files[0];

    if (!file.name.toLowerCase().endsWith('.pdf') && file.type !== 'application/pdf') {
      const ext = Utils.getExtension(file.name);
      if (/^(jpg|jpeg|png|webp|gif|bmp|svg)$/i.test(ext) || file.type.startsWith('image/')) {
        Utils.showToast(`You uploaded an image file ("${file.name}"). PDF Grayscale only accepts PDF documents.`, 'warning');
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
      dom.convertBtn.classList.remove('hidden');
      dom.convertBtn.disabled = false;

      await renderPageOnePreview();
      Utils.showToast(`Loaded "${file.name}" (${pageCount} pages). Adjust settings and click Convert to Grayscale!`, 'info');
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
    if (!currentFile || !currentFile.pdf) return;
    const page = await currentFile.pdf.getPage(1);
    const viewport = page.getViewport({ scale: 0.45 });

    const offscreen = document.createElement('canvas');
    offscreen.width = Math.round(viewport.width);
    offscreen.height = Math.round(viewport.height);
    const ctx = offscreen.getContext('2d');

    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, offscreen.width, offscreen.height);

    await page.render({ canvasContext: ctx, viewport }).promise;
    page1CanvasCache = offscreen;

    if (dom.previewBeforeCanvas) {
      dom.previewBeforeCanvas.width = offscreen.width;
      dom.previewBeforeCanvas.height = offscreen.height;
      const beforeCtx = dom.previewBeforeCanvas.getContext('2d');
      beforeCtx.drawImage(offscreen, 0, 0);
    }

    updatePreview();
  }

  function updatePreview() {
    if (!page1CanvasCache || !dom.previewAfterCanvas) return;

    const canvas = dom.previewAfterCanvas;
    canvas.width = page1CanvasCache.width;
    canvas.height = page1CanvasCache.height;
    const ctx = canvas.getContext('2d');

    const contrast = parseInt(dom.contrastSlider ? dom.contrastSlider.value : 100, 10) || 100;
    const brightness = parseInt(dom.brightnessSlider ? dom.brightnessSlider.value : 100, 10) || 100;

    // Apply CSS grayscale filter
    ctx.filter = `grayscale(100%) contrast(${contrast}%) brightness(${brightness}%)`;
    ctx.drawImage(page1CanvasCache, 0, 0);
    ctx.filter = 'none';
  }

  async function convertToGrayscale() {
    if (!currentFile || !currentFile.pdf) return;

    Utils.setProcessing(true);
    showProgress(20, 'Converting PDF pages to grayscale...');

    try {
      const pdf = currentFile.pdf;
      const total = currentFile.pageCount;
      const newDoc = await PDFLib.PDFDocument.create();

      const contrast = parseInt(dom.contrastSlider ? dom.contrastSlider.value : 100, 10) || 100;
      const brightness = parseInt(dom.brightnessSlider ? dom.brightnessSlider.value : 100, 10) || 100;

      for (let i = 1; i <= total; i++) {
        showProgress(20 + Math.round((i / total) * 70), `Processing page ${i} of ${total} in grayscale...`);
        await yieldToUI();

        const page = await pdf.getPage(i);
        const viewport = page.getViewport({ scale: 1.5 });

        const canvas = document.createElement('canvas');
        canvas.width = Math.round(viewport.width);
        canvas.height = Math.round(viewport.height);
        const ctx = canvas.getContext('2d');

        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Render color page
        await page.render({ canvasContext: ctx, viewport }).promise;

        // Apply Grayscale transformation
        const grayCanvas = document.createElement('canvas');
        grayCanvas.width = canvas.width;
        grayCanvas.height = canvas.height;
        const gCtx = grayCanvas.getContext('2d');

        gCtx.fillStyle = '#FFFFFF';
        gCtx.fillRect(0, 0, grayCanvas.width, grayCanvas.height);
        gCtx.filter = `grayscale(100%) contrast(${contrast}%) brightness(${brightness}%)`;
        gCtx.drawImage(canvas, 0, 0);
        gCtx.filter = 'none';

        const pageBlob = await Utils.canvasToBlob(grayCanvas, 'image/jpeg', 0.85);
        const pageBytes = await pageBlob.arrayBuffer();
        const embeddedImage = await newDoc.embedJpg(pageBytes);

        const origViewport = page.getViewport({ scale: 1.0 });
        const newPage = newDoc.addPage([origViewport.width, origViewport.height]);
        newPage.drawImage(embeddedImage, {
          x: 0,
          y: 0,
          width: origViewport.width,
          height: origViewport.height
        });
      }

      showProgress(95, 'Packaging grayscale PDF...');
      const finalBytes = await newDoc.save({ useObjectStreams: true });
      generatedPdfBlob = new Blob([finalBytes], { type: 'application/pdf' });

      dom.convertBtn.classList.add('hidden');
      dom.downloadBtn.classList.remove('hidden');
      dom.downloadBtn.disabled = false;

      Utils.showToast('Converted to grayscale successfully! Ready to download.', 'success');
    } catch (err) {
      console.error(err);
      Utils.showToast('Error converting PDF: ' + err.message, 'error');
    } finally {
      Utils.setProcessing(false);
      hideProgress();
    }
  }

  function downloadGrayscalePDF() {
    if (!generatedPdfBlob || !currentFile) return;
    const base = Utils.getBaseName(currentFile.name);
    Utils.downloadBlob(generatedPdfBlob, `${base}-grayscale.pdf`);
  }

  function resetTool() {
    currentFile = null;
    page1CanvasCache = null;
    generatedPdfBlob = null;

    if (dom.emptyState) dom.emptyState.classList.remove('hidden');
    if (dom.workspace) dom.workspace.classList.add('hidden');
    if (dom.downloadBtn) dom.downloadBtn.classList.add('hidden');
    if (dom.convertBtn) {
      dom.convertBtn.classList.remove('hidden');
      dom.convertBtn.disabled = false;
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

window.PDFGrayscale = PDFGrayscale;
