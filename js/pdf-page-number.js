/**
 * FileForge - PDF Page Numbering Tool
 * Add professional headers/footers with page numbers, custom formats, positions, and margins.
 */

const PDFPageNumber = (() => {
  let currentFile = null; // { file, name, size, buffer, pageCount, pdf }
  let generatedPdfBlob = null;
  let page1CanvasCache = null;

  let dom = {};

  function init() {
    dom = {
      container: document.getElementById('tool-pdf-page-number'),
      dropzone: document.getElementById('ppn-dropzone'),
      fileInput: document.getElementById('ppn-file-input'),
      browseBtn: document.getElementById('ppn-browse-btn'),
      workspace: document.getElementById('ppn-workspace'),
      emptyState: document.getElementById('ppn-empty-state'),
      
      // Settings
      formatSelect: document.getElementById('ppn-format'),
      positionSelect: document.getElementById('ppn-position'),
      startNumInput: document.getElementById('ppn-start-num'),
      firstPageInput: document.getElementById('ppn-first-page'),
      fontSizeSlider: document.getElementById('ppn-font-size'),
      fontSizeVal: document.getElementById('ppn-font-size-val'),
      marginSlider: document.getElementById('ppn-margin'),
      marginVal: document.getElementById('ppn-margin-val'),
      colorPicker: document.getElementById('ppn-color'),
      
      // Preview
      previewCanvas: document.getElementById('ppn-preview-canvas'),
      
      // Actions
      applyBtn: document.getElementById('ppn-apply-btn'),
      downloadBtn: document.getElementById('ppn-download-btn'),
      resetBtn: document.getElementById('ppn-reset-btn'),
      progressBar: document.getElementById('ppn-progress-bar'),
      progressContainer: document.getElementById('ppn-progress-container'),
      progressText: document.getElementById('ppn-progress-text')
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

    if (dom.formatSelect) dom.formatSelect.addEventListener('change', updatePreview);
    if (dom.positionSelect) dom.positionSelect.addEventListener('change', updatePreview);
    if (dom.startNumInput) dom.startNumInput.addEventListener('input', updatePreview);
    if (dom.firstPageInput) dom.firstPageInput.addEventListener('input', updatePreview);
    if (dom.colorPicker) dom.colorPicker.addEventListener('input', updatePreview);
    
    if (dom.fontSizeSlider) {
      dom.fontSizeSlider.addEventListener('input', (e) => {
        dom.fontSizeVal.textContent = e.target.value + 'pt';
        updatePreview();
      });
    }

    if (dom.marginSlider) {
      dom.marginSlider.addEventListener('input', (e) => {
        dom.marginVal.textContent = e.target.value + 'px';
        updatePreview();
      });
    }

    dom.applyBtn.addEventListener('click', applyPageNumbers);
    dom.downloadBtn.addEventListener('click', downloadNumberedPDF);
    dom.resetBtn.addEventListener('click', resetTool);
  }

  async function handleFiles(files) {
    if (!files || files.length === 0) return;
    const file = files[0];

    if (!file.name.toLowerCase().endsWith('.pdf') && file.type !== 'application/pdf') {
      const ext = Utils.getExtension(file.name);
      if (/^(jpg|jpeg|png|webp|gif|bmp|svg)$/i.test(ext) || file.type.startsWith('image/')) {
        Utils.showToast(`You uploaded an image file ("${file.name}"). PDF Page Number only accepts PDF documents.`, 'warning');
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
      Utils.showToast(`Loaded "${file.name}" (${pageCount} pages). Configure numbering style and click Apply!`, 'info');
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

  function getNumberText(format, pageNum, totalPages) {
    switch (format) {
      case 'num': return `${pageNum}`;
      case 'page-x': return `Page ${pageNum}`;
      case 'page-x-of-y': return `Page ${pageNum} of ${totalPages}`;
      case 'x-of-y': return `${pageNum} / ${totalPages}`;
      case 'dash-x-dash': return `- ${pageNum} -`;
      default: return `${pageNum}`;
    }
  }

  function updatePreview() {
    if (!page1CanvasCache || !dom.previewCanvas || !currentFile) return;

    const canvas = dom.previewCanvas;
    canvas.width = page1CanvasCache.width;
    canvas.height = page1CanvasCache.height;
    const ctx = canvas.getContext('2d');

    // Draw base page
    ctx.drawImage(page1CanvasCache, 0, 0);

    const format = dom.formatSelect ? dom.formatSelect.value : 'page-x-of-y';
    const pos = dom.positionSelect ? dom.positionSelect.value : 'bottom-center';
    const startNum = parseInt(dom.startNumInput ? dom.startNumInput.value : 1, 10) || 1;
    const fontSize = parseInt(dom.fontSizeSlider ? dom.fontSizeSlider.value : 12, 10) || 12;
    const margin = parseInt(dom.marginSlider ? dom.marginSlider.value : 25, 10) || 25;
    const color = dom.colorPicker ? dom.colorPicker.value : '#333333';

    const text = getNumberText(format, startNum, currentFile.pageCount);

    ctx.font = `${fontSize * 0.9}px sans-serif`;
    ctx.fillStyle = color;

    const textMetrics = ctx.measureText(text);
    const textWidth = textMetrics.width;

    let x = 0;
    let y = 0;

    const scale = canvas.width / (currentFile.pageCount > 0 ? 595 : 595); // Approximate scale
    const m = margin * 0.65;

    switch (pos) {
      case 'bottom-left':
        x = m;
        y = canvas.height - m;
        ctx.textAlign = 'left';
        break;
      case 'bottom-center':
        x = canvas.width / 2;
        y = canvas.height - m;
        ctx.textAlign = 'center';
        break;
      case 'bottom-right':
        x = canvas.width - m;
        y = canvas.height - m;
        ctx.textAlign = 'right';
        break;
      case 'top-left':
        x = m;
        y = m + fontSize;
        ctx.textAlign = 'left';
        break;
      case 'top-center':
        x = canvas.width / 2;
        y = m + fontSize;
        ctx.textAlign = 'center';
        break;
      case 'top-right':
        x = canvas.width - m;
        y = m + fontSize;
        ctx.textAlign = 'right';
        break;
      default:
        x = canvas.width / 2;
        y = canvas.height - m;
        ctx.textAlign = 'center';
    }

    ctx.fillText(text, x, y);
  }

  async function applyPageNumbers() {
    if (!currentFile) return;

    Utils.setProcessing(true);
    showProgress(25, 'Applying page numbers...');

    try {
      const srcDoc = await PDFLib.PDFDocument.load(currentFile.buffer, { ignoreEncryption: true });
      const pages = srcDoc.getPages();
      const total = pages.length;

      const format = dom.formatSelect ? dom.formatSelect.value : 'page-x-of-y';
      const pos = dom.positionSelect ? dom.positionSelect.value : 'bottom-center';
      const startNum = parseInt(dom.startNumInput ? dom.startNumInput.value : 1, 10) || 1;
      const firstPage = parseInt(dom.firstPageInput ? dom.firstPageInput.value : 1, 10) || 1;
      const fontSize = parseInt(dom.fontSizeSlider ? dom.fontSizeSlider.value : 12, 10) || 12;
      const margin = parseInt(dom.marginSlider ? dom.marginSlider.value : 25, 10) || 25;
      const hex = dom.colorPicker ? dom.colorPicker.value : '#333333';
      const r = parseInt(hex.slice(1, 3), 16) / 255;
      const g = parseInt(hex.slice(3, 5), 16) / 255;
      const b = parseInt(hex.slice(5, 7), 16) / 255;

      const font = await srcDoc.embedFont(PDFLib.StandardFonts.Helvetica);

      for (let i = 0; i < total; i++) {
        const pageIdx = i + 1;
        if (pageIdx < firstPage) continue;

        showProgress(35 + Math.round((i / total) * 50), `Numbering page ${pageIdx} of ${total}...`);
        await yieldToUI();

        const page = pages[i];
        const { width, height } = page.getSize();
        const currentNumber = startNum + (pageIdx - firstPage);
        const text = getNumberText(format, currentNumber, total);

        const textWidth = font.widthOfTextAtSize(text, fontSize);
        const textHeight = font.heightAtSize(fontSize);

        let x = 0;
        let y = 0;

        switch (pos) {
          case 'bottom-left':
            x = margin;
            y = margin;
            break;
          case 'bottom-center':
            x = (width - textWidth) / 2;
            y = margin;
            break;
          case 'bottom-right':
            x = width - margin - textWidth;
            y = margin;
            break;
          case 'top-left':
            x = margin;
            y = height - margin - textHeight;
            break;
          case 'top-center':
            x = (width - textWidth) / 2;
            y = height - margin - textHeight;
            break;
          case 'top-right':
            x = width - margin - textWidth;
            y = height - margin - textHeight;
            break;
          default:
            x = (width - textWidth) / 2;
            y = margin;
        }

        page.drawText(text, {
          x,
          y,
          size: fontSize,
          font,
          color: PDFLib.rgb(r, g, b)
        });
      }

      showProgress(90, 'Saving numbered PDF...');
      const finalPdfBytes = await srcDoc.save({ useObjectStreams: true });
      generatedPdfBlob = new Blob([finalPdfBytes], { type: 'application/pdf' });

      dom.applyBtn.classList.add('hidden');
      dom.downloadBtn.classList.remove('hidden');
      dom.downloadBtn.disabled = false;

      Utils.showToast('Page numbers added successfully! Download your PDF.', 'success');
    } catch (err) {
      console.error(err);
      Utils.showToast('Error numbering PDF: ' + err.message, 'error');
    } finally {
      Utils.setProcessing(false);
      hideProgress();
    }
  }

  function downloadNumberedPDF() {
    if (!generatedPdfBlob || !currentFile) return;
    const base = Utils.getBaseName(currentFile.name);
    Utils.downloadBlob(generatedPdfBlob, `${base}-numbered.pdf`);
  }

  function resetTool() {
    currentFile = null;
    page1CanvasCache = null;
    generatedPdfBlob = null;

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

window.PDFPageNumber = PDFPageNumber;
