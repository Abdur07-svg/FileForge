/**
 * FileForge - PDF Splitter & Page Extractor Tools
 * Handles splitting PDF by custom page ranges, splitting into single-page PDFs,
 * and visual thumbnail-based page extraction.
 */

// --- TOOL: PDF Splitter ---
const PDFSplitter = (() => {
  let currentFile = null;
  let totalPages = 0;
  let splitFiles = []; // { name, blob }

  let dom = {};

  function init() {
    dom = {
      container: document.getElementById('tool-pdf-splitter'),
      dropzone: document.getElementById('ps-dropzone'),
      fileInput: document.getElementById('ps-file-input'),
      browseBtn: document.getElementById('ps-browse-btn'),
      workspace: document.getElementById('ps-workspace'),
      emptyState: document.getElementById('ps-empty-state'),
      
      // Info
      fileNameText: document.getElementById('ps-file-name'),
      pageCountText: document.getElementById('ps-page-count'),
      
      // Mode & options
      modeRangesRadio: document.getElementById('ps-mode-ranges'),
      modeAllRadio: document.getElementById('ps-mode-all'),
      rangesPanel: document.getElementById('ps-ranges-panel'),
      rangeInput: document.getElementById('ps-range-input'),
      
      // Results
      resultsList: document.getElementById('ps-results-list'),
      
      // Actions
      splitBtn: document.getElementById('ps-split-btn'),
      downloadAllBtn: document.getElementById('ps-download-all-btn'),
      resetBtn: document.getElementById('ps-reset-btn'),
      progressBar: document.getElementById('ps-progress-bar'),
      progressContainer: document.getElementById('ps-progress-container'),
      progressText: document.getElementById('ps-progress-text')
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

    dom.modeRangesRadio.addEventListener('change', () => {
      dom.rangesPanel.classList.remove('hidden');
    });

    dom.modeAllRadio.addEventListener('change', () => {
      dom.rangesPanel.classList.add('hidden');
    });

    dom.splitBtn.addEventListener('click', splitPDF);
    dom.downloadAllBtn.addEventListener('click', downloadAll);
    dom.resetBtn.addEventListener('click', resetTool);
  }

  async function handleFiles(files) {
    if (!files || files.length === 0) return;
    const file = files[0];

    if (!file.name.toLowerCase().endsWith('.pdf') && file.type !== 'application/pdf') {
      const ext = Utils.getExtension(file.name);
      if (/^(jpg|jpeg|png|webp|gif|bmp)$/i.test(ext) || file.type.startsWith('image/')) {
        Utils.showToast(`You uploaded an image file ("${file.name}"). PDF Splitter only divides PDF documents.`, 'warning');
      } else {
        Utils.showToast('Please upload a valid PDF document to split.', 'warning');
      }
      return;
    }

    Utils.setProcessing(true);
    showProgress(20, 'Loading PDF document...');

    try {
      const buffer = await Utils.readFileAsArrayBuffer(file);
      const doc = await PDFLib.PDFDocument.load(buffer, { ignoreEncryption: true });
      totalPages = doc.getPageCount();

      currentFile = { file, name: file.name, buffer, pageCount: totalPages };

      dom.fileNameText.textContent = file.name;
      dom.pageCountText.textContent = `${totalPages} page${totalPages > 1 ? 's' : ''}`;
      dom.rangeInput.placeholder = totalPages > 3 ? `e.g. 1-2, 3, 4-${totalPages}` : `e.g. 1, 2`;
      dom.rangeInput.value = `1-${Math.min(2, totalPages)}`;

      dom.emptyState.classList.add('hidden');
      dom.workspace.classList.remove('hidden');
      dom.resultsList.innerHTML = '';
      dom.downloadAllBtn.disabled = true;

      Utils.showToast(`Loaded PDF with ${totalPages} pages. Configure split mode and start!`, 'success');
    } catch (err) {
      console.error(err);
      Utils.showToast('Failed to open PDF: ' + err.message, 'error');
    } finally {
      Utils.setProcessing(false);
      hideProgress();
    }
  }

  /**
   * Parse range string like "1-3, 5, 7-9" into array of page groups
   */
  function parseRanges(str, maxPages) {
    const groups = [];
    const parts = str.split(',').map(s => s.trim()).filter(Boolean);

    for (const part of parts) {
      if (part.includes('-')) {
        const [startStr, endStr] = part.split('-').map(s => s.trim());
        const start = Math.max(1, parseInt(startStr, 10));
        const end = Math.min(maxPages, parseInt(endStr, 10));
        if (!isNaN(start) && !isNaN(end) && start <= end) {
          const groupPages = [];
          for (let p = start; p <= end; p++) groupPages.push(p);
          groups.push({ label: `Pages ${start}-${end}`, pages: groupPages });
        }
      } else {
        const page = parseInt(part, 10);
        if (!isNaN(page) && page >= 1 && page <= maxPages) {
          groups.push({ label: `Page ${page}`, pages: [page] });
        }
      }
    }
    return groups;
  }

  async function splitPDF() {
    if (!currentFile) return;

    Utils.setProcessing(true);
    showProgress(10, 'Preparing PDF split...');

    splitFiles = [];
    dom.resultsList.innerHTML = '';

    const isCustomRanges = dom.modeRangesRadio.checked;
    let splitGroups = [];

    if (isCustomRanges) {
      const rangeText = dom.rangeInput.value.trim();
      splitGroups = parseRanges(rangeText, totalPages);
      if (splitGroups.length === 0) {
        Utils.showToast('Please enter valid page numbers or ranges (e.g. 1-2, 3).', 'warning');
        Utils.setProcessing(false);
        hideProgress();
        return;
      }
    } else {
      // Split into single individual pages
      for (let p = 1; p <= totalPages; p++) {
        splitGroups.push({ label: `Page ${p}`, pages: [p] });
      }
    }

    try {
      const srcDoc = await PDFLib.PDFDocument.load(currentFile.buffer, { ignoreEncryption: true });
      const baseName = Utils.getBaseName(currentFile.name);

      for (let i = 0; i < splitGroups.length; i++) {
        const group = splitGroups[i];
        const pct = Math.round(((i + 1) / splitGroups.length) * 85);
        showProgress(pct, `Extracting ${group.label} (${i + 1}/${splitGroups.length})...`);

        const newDoc = await PDFLib.PDFDocument.create();
        // 0-indexed page indices
        const indices = group.pages.map(p => p - 1);
        const copied = await newDoc.copyPages(srcDoc, indices);
        copied.forEach(p => newDoc.addPage(p));

        const bytes = await newDoc.save({ useObjectStreams: true });
        const blob = new Blob([bytes], { type: 'application/pdf' });
        const filename = `${baseName}-${group.label.toLowerCase().replace(/\s+/g, '-')}.pdf`;

        splitFiles.push({ name: filename, blob, label: group.label, pageCount: group.pages.length });
      }

      renderResults();
      dom.downloadAllBtn.disabled = false;
      showProgress(100, 'PDF Split Successfully!');
      setTimeout(hideProgress, 800);
      Utils.showToast(`Successfully created ${splitFiles.length} split PDF file(s)!`, 'success');
    } catch (err) {
      console.error(err);
      Utils.showToast('Error splitting PDF: ' + err.message, 'error');
      hideProgress();
    } finally {
      Utils.setProcessing(false);
    }
  }

  function renderResults() {
    dom.resultsList.innerHTML = '';

    splitFiles.forEach((item, index) => {
      const row = document.createElement('div');
      row.className = 'ps-result-row';

      row.innerHTML = `
        <div class="ps-result-info">
          <span class="badge badge-primary">${item.label}</span>
          <span class="ps-result-name" title="${item.name}">${item.name}</span>
          <span class="ps-result-size">${Utils.formatBytes(item.blob.size)}</span>
        </div>
        <button class="btn btn-sm btn-primary ps-dl-btn" data-index="${index}">Download</button>
      `;

      row.querySelector('.ps-dl-btn').addEventListener('click', () => {
        Utils.downloadBlob(item.blob, item.name);
      });

      dom.resultsList.appendChild(row);
    });
  }

  async function downloadAll() {
    if (splitFiles.length === 0) return;

    if (splitFiles.length === 1) {
      Utils.downloadBlob(splitFiles[0].blob, splitFiles[0].name);
      return;
    }

    const base = Utils.getBaseName(currentFile.name);
    showProgress(40, 'Packaging split PDFs into ZIP...');
    await Utils.downloadAsZip(splitFiles, `${base}-split-files.zip`, (pct, txt) => {
      showProgress(pct, txt);
    });
    hideProgress();
  }

  function resetTool() {
    currentFile = null;
    totalPages = 0;
    splitFiles = [];
    dom.emptyState.classList.remove('hidden');
    dom.workspace.classList.add('hidden');
    dom.resultsList.innerHTML = '';
    dom.downloadAllBtn.disabled = true;
    dom.fileNameText.textContent = '-';
    dom.pageCountText.textContent = '-';
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

// --- TOOL: PDF Page Extractor ---
const PDFExtractor = (() => {
  let currentFile = null;
  let pdfDoc = null;
  let totalPages = 0;
  let pageItems = []; // { pageNum, selected, thumbnailUrl }
  let extractedPdfBlob = null;

  let dom = {};

  function init() {
    dom = {
      container: document.getElementById('tool-pdf-extractor'),
      dropzone: document.getElementById('pe-dropzone'),
      fileInput: document.getElementById('pe-file-input'),
      browseBtn: document.getElementById('pe-browse-btn'),
      workspace: document.getElementById('pe-workspace'),
      emptyState: document.getElementById('pe-empty-state'),
      
      // Page Grid & Selection
      pagesGrid: document.getElementById('pe-pages-grid'),
      selectAllBtn: document.getElementById('pe-select-all'),
      deselectAllBtn: document.getElementById('pe-deselect-all'),
      selectOddBtn: document.getElementById('pe-select-odd'),
      selectEvenBtn: document.getElementById('pe-select-even'),
      selectedCountText: document.getElementById('pe-selected-count'),
      
      // Actions
      extractBtn: document.getElementById('pe-extract-btn'),
      downloadBtn: document.getElementById('pe-download-btn'),
      resetBtn: document.getElementById('pe-reset-btn'),
      progressBar: document.getElementById('pe-progress-bar'),
      progressContainer: document.getElementById('pe-progress-container'),
      progressText: document.getElementById('pe-progress-text')
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

    dom.selectAllBtn.addEventListener('click', () => setAllSelection(true));
    dom.deselectAllBtn.addEventListener('click', () => setAllSelection(false));
    dom.selectOddBtn.addEventListener('click', () => {
      pageItems.forEach((p, idx) => p.selected = (idx % 2 === 0));
      renderThumbnails();
      updateSelectionCount();
    });
    dom.selectEvenBtn.addEventListener('click', () => {
      pageItems.forEach((p, idx) => p.selected = (idx % 2 === 1));
      renderThumbnails();
      updateSelectionCount();
    });

    dom.extractBtn.addEventListener('click', extractPages);
    dom.downloadBtn.addEventListener('click', downloadExtracted);
    dom.resetBtn.addEventListener('click', resetTool);
  }

  async function handleFiles(files) {
    if (!files || files.length === 0) return;
    const file = files[0];

    if (!file.name.toLowerCase().endsWith('.pdf') && file.type !== 'application/pdf') {
      Utils.showToast('Please upload a valid PDF document.', 'warning');
      return;
    }

    Utils.setProcessing(true);
    showProgress(15, 'Loading PDF document...');

    try {
      const buffer = await Utils.readFileAsArrayBuffer(file);
      currentFile = { file, name: file.name, buffer };

      pdfDoc = await pdfjsLib.getDocument({ data: new Uint8Array(buffer) }).promise;
      totalPages = pdfDoc.numPages;

      pageItems = [];
      for (let i = 1; i <= totalPages; i++) {
        pageItems.push({
          pageNum: i,
          selected: false,
          thumbnailUrl: null
        });
      }

      dom.emptyState.classList.add('hidden');
      dom.workspace.classList.remove('hidden');
      dom.downloadBtn.classList.add('hidden');
      dom.extractBtn.classList.remove('hidden');

      updateSelectionCount();
      await renderPageThumbnails();
      Utils.showToast(`Loaded ${totalPages} pages. Click pages to select them for extraction.`, 'info');
    } catch (err) {
      console.error(err);
      Utils.showToast('Failed to open PDF: ' + err.message, 'error');
    } finally {
      Utils.setProcessing(false);
      hideProgress();
    }
  }

  async function renderPageThumbnails() {
    showProgress(20, 'Generating page thumbnails...');
    for (let i = 0; i < pageItems.length; i++) {
      const item = pageItems[i];
      const page = await pdfDoc.getPage(item.pageNum);
      const viewport = page.getViewport({ scale: 0.35 });

      const canvas = document.createElement('canvas');
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      await page.render({ canvasContext: ctx, viewport }).promise;
      item.thumbnailUrl = canvas.toDataURL('image/jpeg', 0.8);

      const pct = 20 + Math.round(((i + 1) / pageItems.length) * 60);
      showProgress(pct, `Previewing page ${i + 1} of ${pageItems.length}...`);
    }

    renderThumbnails();
    hideProgress();
  }

  function renderThumbnails() {
    dom.pagesGrid.innerHTML = '';

    pageItems.forEach((item) => {
      const card = document.createElement('div');
      card.className = `pdf-page-card ${item.selected ? 'selected' : ''}`;

      card.innerHTML = `
        <div class="page-card-header">
          <label class="page-checkbox-label">
            <input type="checkbox" class="pe-checkbox" ${item.selected ? 'checked' : ''}>
            <span>Page ${item.pageNum}</span>
          </label>
        </div>
        <div class="page-card-thumb">
          <img src="${item.thumbnailUrl || ''}" alt="Page ${item.pageNum}">
        </div>
      `;

      const cb = card.querySelector('.pe-checkbox');
      const toggle = () => {
        item.selected = !item.selected;
        cb.checked = item.selected;
        card.classList.toggle('selected', item.selected);
        updateSelectionCount();
      };

      cb.addEventListener('change', (e) => {
        item.selected = e.target.checked;
        card.classList.toggle('selected', item.selected);
        updateSelectionCount();
      });

      card.querySelector('.page-card-thumb').addEventListener('click', toggle);

      dom.pagesGrid.appendChild(card);
    });
  }

  function setAllSelection(selected) {
    pageItems.forEach(p => p.selected = selected);
    renderThumbnails();
    updateSelectionCount();
  }

  function updateSelectionCount() {
    const count = pageItems.filter(p => p.selected).length;
    dom.selectedCountText.textContent = `${count} of ${pageItems.length} selected`;
    dom.extractBtn.disabled = count === 0;
  }

  async function extractPages() {
    const selectedPages = pageItems.filter(p => p.selected);
    if (selectedPages.length === 0) {
      Utils.showToast('Please select at least one page to extract.', 'warning');
      return;
    }

    Utils.setProcessing(true);
    showProgress(25, 'Extracting selected pages into new PDF...');

    try {
      const srcDoc = await PDFLib.PDFDocument.load(currentFile.buffer, { ignoreEncryption: true });
      const newDoc = await PDFLib.PDFDocument.create();

      const indices = selectedPages.map(p => p.pageNum - 1);
      const copiedPages = await newDoc.copyPages(srcDoc, indices);
      copiedPages.forEach(p => newDoc.addPage(p));

      showProgress(85, 'Saving extracted PDF...');
      const bytes = await newDoc.save({ useObjectStreams: true });
      extractedPdfBlob = new Blob([bytes], { type: 'application/pdf' });

      showProgress(100, 'Extraction Complete!');
      setTimeout(hideProgress, 800);

      dom.extractBtn.classList.add('hidden');
      dom.downloadBtn.classList.remove('hidden');
      Utils.showToast(`Extracted ${selectedPages.length} page(s) successfully (${Utils.formatBytes(extractedPdfBlob.size)})!`, 'success');
    } catch (err) {
      console.error(err);
      Utils.showToast('Extraction failed: ' + err.message, 'error');
      hideProgress();
    } finally {
      Utils.setProcessing(false);
    }
  }

  function downloadExtracted() {
    if (!extractedPdfBlob || !currentFile) return;
    const base = Utils.getBaseName(currentFile.name);
    const filename = `${base}-extracted-pages.pdf`;
    Utils.downloadBlob(extractedPdfBlob, filename);
  }

  function resetTool() {
    currentFile = null;
    pdfDoc = null;
    pageItems = [];
    totalPages = 0;
    extractedPdfBlob = null;
    dom.emptyState.classList.remove('hidden');
    dom.workspace.classList.add('hidden');
    dom.downloadBtn.classList.add('hidden');
    dom.extractBtn.classList.remove('hidden');
    dom.extractBtn.disabled = true;
    dom.pagesGrid.innerHTML = '';
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

window.PDFSplitter = PDFSplitter;
window.PDFExtractor = PDFExtractor;
