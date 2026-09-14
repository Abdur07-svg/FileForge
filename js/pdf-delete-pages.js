/**
 * FileForge - PDF Delete Pages Tool
 * Visual page grid to select and remove unwanted pages from a PDF.
 */

const PDFDeletePages = (() => {
  let currentFile = null; // { file, name, size, buffer, pageCount, pdf }
  let pageItems = []; // Array of { pageNum, isDeleted, dataUrl }
  let generatedPdfBlob = null;

  let dom = {};

  function init() {
    dom = {
      container: document.getElementById('tool-pdf-delete-pages'),
      dropzone: document.getElementById('pdp-dropzone'),
      fileInput: document.getElementById('pdp-file-input'),
      browseBtn: document.getElementById('pdp-browse-btn'),
      workspace: document.getElementById('pdp-workspace'),
      emptyState: document.getElementById('pdp-empty-state'),
      pagesGrid: document.getElementById('pdp-pages-grid'),
      
      // Controls
      rangeInput: document.getElementById('pdp-range-input'),
      applyRangeBtn: document.getElementById('pdp-apply-range-btn'),
      clearSelectionBtn: document.getElementById('pdp-clear-btn'),
      statusText: document.getElementById('pdp-status-text'),
      
      // Actions
      deleteBtn: document.getElementById('pdp-delete-btn'),
      downloadBtn: document.getElementById('pdp-download-btn'),
      resetBtn: document.getElementById('pdp-reset-btn'),
      progressBar: document.getElementById('pdp-progress-bar'),
      progressContainer: document.getElementById('pdp-progress-container'),
      progressText: document.getElementById('pdp-progress-text')
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

    if (dom.applyRangeBtn && dom.rangeInput) {
      dom.applyRangeBtn.addEventListener('click', () => {
        applyRangeSelection(dom.rangeInput.value.trim());
      });
    }

    if (dom.clearSelectionBtn) {
      dom.clearSelectionBtn.addEventListener('click', () => {
        pageItems.forEach(p => p.isDeleted = false);
        renderPageCards();
        updateStatus();
      });
    }

    dom.deleteBtn.addEventListener('click', generateCleanPDF);
    dom.downloadBtn.addEventListener('click', downloadCleanPDF);
    dom.resetBtn.addEventListener('click', resetTool);
  }

  async function handleFiles(files) {
    if (!files || files.length === 0) return;
    const file = files[0];

    if (!file.name.toLowerCase().endsWith('.pdf') && file.type !== 'application/pdf') {
      const ext = Utils.getExtension(file.name);
      if (/^(jpg|jpeg|png|webp|gif|bmp|svg)$/i.test(ext) || file.type.startsWith('image/')) {
        Utils.showToast(`You uploaded an image file ("${file.name}"). PDF Delete Pages only accepts PDF documents.`, 'warning');
      } else {
        Utils.showToast(`Invalid file format ("${file.name}"). Please upload a valid PDF document.`, 'warning');
      }
      return;
    }

    Utils.setProcessing(true);
    showProgress(15, 'Loading PDF document...');

    try {
      const buffer = await Utils.readFileAsArrayBuffer(file);
      const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(buffer.slice(0)) });
      const pdf = await loadingTask.promise;
      const pageCount = pdf.numPages;

      if (pageCount <= 1) {
        throw new Error('This PDF has only 1 page. You cannot delete pages from a single-page PDF.');
      }

      currentFile = {
        file,
        name: file.name,
        size: file.size,
        buffer,
        pageCount,
        pdf
      };

      pageItems = [];
      for (let i = 1; i <= pageCount; i++) {
        pageItems.push({
          pageNum: i,
          isDeleted: false,
          dataUrl: null
        });
      }

      dom.emptyState.classList.add('hidden');
      dom.workspace.classList.remove('hidden');
      dom.downloadBtn.classList.add('hidden');
      dom.deleteBtn.classList.remove('hidden');
      dom.deleteBtn.disabled = true;

      await renderThumbnails();
      updateStatus();
      Utils.showToast(`Loaded "${file.name}" (${pageCount} pages). Click on any page to mark it for deletion.`, 'info');
    } catch (err) {
      console.error(err);
      Utils.showToast(err.message || 'Failed to load PDF file.', 'error');
      resetTool();
    } finally {
      Utils.setProcessing(false);
      hideProgress();
    }
  }

  async function renderThumbnails() {
    if (!currentFile || !currentFile.pdf) return;
    dom.pagesGrid.innerHTML = '';
    const pdf = currentFile.pdf;
    const total = currentFile.pageCount;

    for (let i = 1; i <= total; i++) {
      showProgress(20 + Math.round((i / total) * 70), `Rendering thumbnail ${i} of ${total}...`);
      await yieldToUI();

      const page = await pdf.getPage(i);
      const viewport = page.getViewport({ scale: 0.35 });

      const canvas = document.createElement('canvas');
      canvas.width = Math.round(viewport.width);
      canvas.height = Math.round(viewport.height);
      const ctx = canvas.getContext('2d');

      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      await page.render({ canvasContext: ctx, viewport }).promise;
      const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
      pageItems[i - 1].dataUrl = dataUrl;
    }
    
    renderPageCards();
    hideProgress();
  }

  function renderPageCards() {
    dom.pagesGrid.innerHTML = '';
    pageItems.forEach((item) => {
      const card = document.createElement('div');
      card.className = `page-thumbnail-card ${item.isDeleted ? 'page-marked-delete' : ''}`;
      card.id = `pdp-page-card-${item.pageNum}`;

      card.innerHTML = `
        <div class="page-thumb-preview-wrap">
          <img src="${item.dataUrl}" alt="Page ${item.pageNum}" class="page-thumb-img">
          <div class="page-delete-overlay ${item.isDeleted ? 'active' : ''}">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
            <span>DELETE</span>
          </div>
        </div>
        <div class="page-thumb-footer">
          <span class="page-thumb-num">Page ${item.pageNum}</span>
          <button type="button" class="btn btn-xs ${item.isDeleted ? 'btn-danger' : 'btn-ghost'} pdp-toggle-btn">
            ${item.isDeleted ? 'Restore' : 'Delete'}
          </button>
        </div>
      `;

      card.addEventListener('click', (e) => {
        item.isDeleted = !item.isDeleted;
        renderPageCards();
        updateStatus();
      });

      dom.pagesGrid.appendChild(card);
    });
  }

  function applyRangeSelection(rangeStr) {
    if (!rangeStr) return;
    const parts = rangeStr.split(',').map(s => s.trim()).filter(Boolean);
    const markedPages = new Set();

    parts.forEach(part => {
      if (part.includes('-')) {
        const [start, end] = part.split('-').map(n => parseInt(n.trim(), 10));
        if (!isNaN(start) && !isNaN(end)) {
          const s = Math.max(1, Math.min(start, end));
          const e = Math.min(currentFile.pageCount, Math.max(start, end));
          for (let p = s; p <= e; p++) markedPages.add(p);
        }
      } else {
        const p = parseInt(part, 10);
        if (!isNaN(p) && p >= 1 && p <= currentFile.pageCount) markedPages.add(p);
      }
    });

    pageItems.forEach(item => {
      if (markedPages.has(item.pageNum)) item.isDeleted = true;
    });

    renderPageCards();
    updateStatus();
    Utils.showToast(`Applied range: Marked ${markedPages.size} page(s) for deletion.`, 'info');
  }

  function updateStatus() {
    const deletedCount = pageItems.filter(p => p.isDeleted).length;
    const remainingCount = pageItems.length - deletedCount;

    if (dom.statusText) {
      if (deletedCount === 0) {
        dom.statusText.textContent = `0 of ${pageItems.length} pages selected for deletion.`;
      } else if (remainingCount === 0) {
        dom.statusText.textContent = `⚠️ Cannot delete all pages! At least 1 page must remain.`;
      } else {
        dom.statusText.textContent = `Deleting ${deletedCount} page${deletedCount > 1 ? 's' : ''} (${remainingCount} page${remainingCount > 1 ? 's' : ''} will remain).`;
      }
    }

    if (dom.deleteBtn) {
      dom.deleteBtn.disabled = (deletedCount === 0 || remainingCount === 0);
    }
  }

  async function generateCleanPDF() {
    if (!currentFile) return;
    const remainingIndices = pageItems
      .filter(p => !p.isDeleted)
      .map(p => p.pageNum - 1);

    if (remainingIndices.length === 0) {
      Utils.showToast('You must keep at least 1 page.', 'warning');
      return;
    }

    Utils.setProcessing(true);
    showProgress(25, 'Generating modified PDF document...');

    try {
      const srcDoc = await PDFLib.PDFDocument.load(currentFile.buffer, { ignoreEncryption: true });
      const newDoc = await PDFLib.PDFDocument.create();

      showProgress(50, 'Copying remaining pages...');
      const copiedPages = await newDoc.copyPages(srcDoc, remainingIndices);
      copiedPages.forEach(p => newDoc.addPage(p));

      showProgress(85, 'Finalizing PDF...');
      const finalPdfBytes = await newDoc.save({ useObjectStreams: true });
      generatedPdfBlob = new Blob([finalPdfBytes], { type: 'application/pdf' });

      dom.deleteBtn.classList.add('hidden');
      dom.downloadBtn.classList.remove('hidden');
      dom.downloadBtn.disabled = false;

      const deletedCount = pageItems.length - remainingIndices.length;
      Utils.showToast(`Successfully removed ${deletedCount} page(s)! Download your clean PDF.`, 'success');
    } catch (err) {
      console.error(err);
      Utils.showToast('Error removing pages: ' + err.message, 'error');
    } finally {
      Utils.setProcessing(false);
      hideProgress();
    }
  }

  function downloadCleanPDF() {
    if (!generatedPdfBlob || !currentFile) return;
    const base = Utils.getBaseName(currentFile.name);
    Utils.downloadBlob(generatedPdfBlob, `${base}-cleaned.pdf`);
  }

  function resetTool() {
    currentFile = null;
    pageItems = [];
    generatedPdfBlob = null;

    if (dom.emptyState) dom.emptyState.classList.remove('hidden');
    if (dom.workspace) dom.workspace.classList.add('hidden');
    if (dom.pagesGrid) dom.pagesGrid.innerHTML = '';
    if (dom.rangeInput) dom.rangeInput.value = '';
    if (dom.downloadBtn) dom.downloadBtn.classList.add('hidden');
    if (dom.deleteBtn) {
      dom.deleteBtn.classList.remove('hidden');
      dom.deleteBtn.disabled = true;
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

window.PDFDeletePages = PDFDeletePages;
