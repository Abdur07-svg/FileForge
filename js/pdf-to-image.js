/**
 * FileForge - PDF to Image Tool (PDF to JPG & PDF to PNG)
 * Renders pages via PDF.js with selectable DPI, page checkboxes, single image & ZIP download.
 */

const PDFToImage = (() => {
  let currentFile = null;
  let pdfDoc = null;
  let totalPages = 0;
  let pageItems = []; // { pageNum, selected, canvas, blob, url }
  let currentFormat = 'jpeg'; // 'jpeg' or 'png'

  let dom = {};

  function init() {
    dom = {
      container: document.getElementById('tool-pdf-to-image'),
      dropzone: document.getElementById('p2i-dropzone'),
      fileInput: document.getElementById('p2i-file-input'),
      browseBtn: document.getElementById('p2i-browse-btn'),
      workspace: document.getElementById('p2i-workspace'),
      emptyState: document.getElementById('p2i-empty-state'),
      
      // Controls & Settings
      formatSelect: document.getElementById('p2i-format'),
      scaleSelect: document.getElementById('p2i-scale'),
      qualityRow: document.getElementById('p2i-quality-row'),
      qualitySlider: document.getElementById('p2i-quality'),
      qualityVal: document.getElementById('p2i-quality-val'),
      
      // Selection helpers
      selectAllBtn: document.getElementById('p2i-select-all'),
      deselectAllBtn: document.getElementById('p2i-deselect-all'),
      selectOddBtn: document.getElementById('p2i-select-odd'),
      selectEvenBtn: document.getElementById('p2i-select-even'),
      selectedCountText: document.getElementById('p2i-selected-count'),
      
      // Page Grid
      pagesGrid: document.getElementById('p2i-pages-grid'),
      
      // Actions
      convertBtn: document.getElementById('p2i-convert-btn'),
      downloadZipBtn: document.getElementById('p2i-download-zip-btn'),
      resetBtn: document.getElementById('p2i-reset-btn'),
      progressBar: document.getElementById('p2i-progress-bar'),
      progressContainer: document.getElementById('p2i-progress-container'),
      progressText: document.getElementById('p2i-progress-text')
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

    dom.formatSelect.addEventListener('change', (e) => {
      currentFormat = e.target.value;
      updateQualityVisibility();
    });

    dom.qualitySlider.addEventListener('input', (e) => {
      dom.qualityVal.textContent = e.target.value + '%';
    });

    // Selection helpers
    dom.selectAllBtn.addEventListener('click', () => setAllSelection(true));
    dom.deselectAllBtn.addEventListener('click', () => setAllSelection(false));
    dom.selectOddBtn.addEventListener('click', () => {
      pageItems.forEach((p, idx) => p.selected = (idx % 2 === 0));
      renderPageCards();
      updateSelectedCount();
    });
    dom.selectEvenBtn.addEventListener('click', () => {
      pageItems.forEach((p, idx) => p.selected = (idx % 2 === 1));
      renderPageCards();
      updateSelectedCount();
    });

    dom.convertBtn.addEventListener('click', renderAndConvertPages);
    dom.downloadZipBtn.addEventListener('click', downloadAllAsZip);
    dom.resetBtn.addEventListener('click', resetTool);
  }

  function setPreset(format) {
    currentFormat = format === 'png' ? 'png' : 'jpeg';
    if (dom.formatSelect) {
      dom.formatSelect.value = currentFormat;
    }
    updateQualityVisibility();
  }

  function updateQualityVisibility() {
    if (currentFormat === 'png') {
      dom.qualityRow.classList.add('hidden');
    } else {
      dom.qualityRow.classList.remove('hidden');
    }
  }

  async function handleFiles(files) {
    if (!files || files.length === 0) return;
    const file = files[0];

    if (!file.name.toLowerCase().endsWith('.pdf') && file.type !== 'application/pdf') {
      const ext = Utils.getExtension(file.name);
      if (/^(jpg|jpeg|png|webp|gif|bmp|svg)$/i.test(ext) || file.type.startsWith('image/')) {
        Utils.showToast(`You uploaded an image file ("${file.name}"). This tool converts PDF documents into images. Please upload a PDF file.`, 'warning');
      } else {
        Utils.showToast(`Invalid file format ("${file.name}"). Please upload a valid PDF document.`, 'warning');
      }
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
          selected: true,
          canvas: null,
          blob: null,
          url: null,
          thumbnailUrl: null
        });
      }

      dom.emptyState.classList.add('hidden');
      dom.workspace.classList.remove('hidden');
      dom.downloadZipBtn.disabled = true;

      updateSelectedCount();
      updateQualityVisibility();

      // Render initial low-res previews for fast visual selection
      await renderThumbnails();
      Utils.showToast(`PDF loaded: ${totalPages} page(s). Select pages and click Convert.`, 'success');
    } catch (err) {
      console.error(err);
      Utils.showToast('Failed to open PDF: ' + err.message, 'error');
    } finally {
      Utils.setProcessing(false);
      hideProgress();
    }
  }

  async function renderThumbnails() {
    showProgress(25, 'Generating page previews...');
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
      const pct = 25 + Math.round(((i + 1) / pageItems.length) * 50);
      showProgress(pct, `Previewing page ${i + 1} of ${pageItems.length}...`);
    }

    renderPageCards();
    hideProgress();
  }

  function renderPageCards() {
    dom.pagesGrid.innerHTML = '';
    const ext = currentFormat === 'jpeg' ? 'jpg' : 'png';

    pageItems.forEach((item, idx) => {
      const card = document.createElement('div');
      card.className = `pdf-page-card ${item.selected ? 'selected' : ''}`;

      card.innerHTML = `
        <div class="page-card-header">
          <label class="page-checkbox-label">
            <input type="checkbox" class="page-select-checkbox" ${item.selected ? 'checked' : ''}>
            <span>Page ${item.pageNum}</span>
          </label>
        </div>
        <div class="page-card-thumb">
          <img src="${item.url || item.thumbnailUrl || ''}" alt="Page ${item.pageNum}">
        </div>
        <div class="page-card-footer">
          ${item.blob
            ? `<button class="btn btn-xs btn-primary page-dl-btn" data-index="${idx}">Download .${ext}</button>`
            : `<span class="page-status-badge">Ready</span>`
          }
        </div>
      `;

      // Checkbox event
      const cb = card.querySelector('.page-select-checkbox');
      cb.addEventListener('change', (e) => {
        item.selected = e.target.checked;
        card.classList.toggle('selected', item.selected);
        updateSelectedCount();
      });

      // Card click toggles checkbox if clicking preview
      const thumb = card.querySelector('.page-card-thumb');
      thumb.addEventListener('click', () => {
        cb.checked = !cb.checked;
        item.selected = cb.checked;
        card.classList.toggle('selected', item.selected);
        updateSelectedCount();
      });

      // Single download button
      const dlBtn = card.querySelector('.page-dl-btn');
      if (dlBtn) {
        dlBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          downloadSinglePage(idx);
        });
      }

      dom.pagesGrid.appendChild(card);
    });
  }

  function setAllSelection(selected) {
    pageItems.forEach(p => p.selected = selected);
    renderPageCards();
    updateSelectedCount();
  }

  function updateSelectedCount() {
    const count = pageItems.filter(p => p.selected).length;
    dom.selectedCountText.textContent = `${count} of ${pageItems.length} selected`;
    dom.convertBtn.disabled = count === 0;
  }

  async function renderAndConvertPages() {
    const selectedItems = pageItems.filter(p => p.selected);
    if (selectedItems.length === 0) {
      Utils.showToast('Please select at least one page to convert.', 'warning');
      return;
    }

    Utils.setProcessing(true);
    showProgress(10, 'Starting high-resolution rendering...');

    const scale = parseFloat(dom.scaleSelect.value) || 1.5;
    const quality = parseInt(dom.qualitySlider.value, 10) / 100;
    const mime = `image/${currentFormat}`;
    const ext = currentFormat === 'jpeg' ? 'jpg' : 'png';

    try {
      for (let i = 0; i < selectedItems.length; i++) {
        const item = selectedItems[i];
        const pct = Math.round(((i + 1) / selectedItems.length) * 85);
        showProgress(pct, `Rendering high-res page ${item.pageNum} (${i + 1}/${selectedItems.length})...`);

        const page = await pdfDoc.getPage(item.pageNum);
        const viewport = page.getViewport({ scale });

        const canvas = document.createElement('canvas');
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const ctx = canvas.getContext('2d');

        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        await page.render({ canvasContext: ctx, viewport }).promise;

        const blob = await Utils.canvasToBlob(canvas, mime, quality);
        if (item.url) URL.revokeObjectURL(item.url);

        item.blob = blob;
        item.url = URL.createObjectURL(blob);
      }

      renderPageCards();
      dom.downloadZipBtn.disabled = false;
      showProgress(100, 'All selected pages converted!');
      setTimeout(hideProgress, 800);
      Utils.showToast(`Successfully converted ${selectedItems.length} page(s) to ${ext.toUpperCase()}!`, 'success');
    } catch (err) {
      console.error(err);
      Utils.showToast('Page rendering error: ' + err.message, 'error');
      hideProgress();
    } finally {
      Utils.setProcessing(false);
    }
  }

  function downloadSinglePage(index) {
    const item = pageItems[index];
    if (!item || !item.blob) return;
    const ext = currentFormat === 'jpeg' ? 'jpg' : 'png';
    const base = Utils.getBaseName(currentFile.name);
    const filename = `${base}-page-${item.pageNum}.${ext}`;
    Utils.downloadBlob(item.blob, filename);
  }

  async function downloadAllAsZip() {
    const convertedItems = pageItems.filter(p => p.selected && p.blob);
    if (convertedItems.length === 0) {
      await renderAndConvertPages();
      return downloadAllAsZip();
    }

    const ext = currentFormat === 'jpeg' ? 'jpg' : 'png';
    const base = Utils.getBaseName(currentFile.name);

    if (convertedItems.length === 1) {
      downloadSinglePage(pageItems.indexOf(convertedItems[0]));
      return;
    }

    const filesToZip = convertedItems.map(item => ({
      name: `${base}-page-${item.pageNum}.${ext}`,
      blob: item.blob
    }));

    showProgress(30, 'Compressing pages into ZIP archive...');
    await Utils.downloadAsZip(filesToZip, `${base}-${ext}-pages.zip`, (pct, txt) => {
      showProgress(pct, txt);
    });
    hideProgress();
  }

  function resetTool() {
    pageItems.forEach(p => {
      if (p.url) URL.revokeObjectURL(p.url);
    });
    currentFile = null;
    pdfDoc = null;
    pageItems = [];
    totalPages = 0;
    dom.emptyState.classList.remove('hidden');
    dom.workspace.classList.add('hidden');
    dom.downloadZipBtn.disabled = true;
    dom.convertBtn.disabled = true;
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
    setPreset,
    reset: resetTool
  };
})();

window.PDFToImage = PDFToImage;
