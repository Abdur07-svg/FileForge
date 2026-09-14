/**
 * FileForge - PDF Reorder Pages Tool
 * Interactive drag-and-drop page sorting and reorganization for PDF documents.
 */

const PDFReorderPages = (() => {
  let currentFile = null; // { file, name, size, buffer, pageCount, pdf }
  let pageList = []; // Array of { originalIndex, currentPos, dataUrl }
  let generatedPdfBlob = null;

  let dom = {};

  function init() {
    dom = {
      container: document.getElementById('tool-pdf-reorder-pages'),
      dropzone: document.getElementById('preord-dropzone'),
      fileInput: document.getElementById('preord-file-input'),
      browseBtn: document.getElementById('preord-browse-btn'),
      workspace: document.getElementById('preord-workspace'),
      emptyState: document.getElementById('preord-empty-state'),
      pagesGrid: document.getElementById('preord-pages-grid'),
      
      // Quick tools
      reverseBtn: document.getElementById('preord-reverse-btn'),
      resetOrderBtn: document.getElementById('preord-reset-order-btn'),
      
      // Actions
      saveBtn: document.getElementById('preord-save-btn'),
      downloadBtn: document.getElementById('preord-download-btn'),
      resetBtn: document.getElementById('preord-reset-btn'),
      progressBar: document.getElementById('preord-progress-bar'),
      progressContainer: document.getElementById('preord-progress-container'),
      progressText: document.getElementById('preord-progress-text')
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

    if (dom.reverseBtn) {
      dom.reverseBtn.addEventListener('click', () => {
        pageList.reverse();
        renderPageCards();
        Utils.showToast('Reversed page order.', 'info');
      });
    }

    if (dom.resetOrderBtn) {
      dom.resetOrderBtn.addEventListener('click', () => {
        pageList.sort((a, b) => a.originalIndex - b.originalIndex);
        renderPageCards();
        Utils.showToast('Reset to original page order.', 'info');
      });
    }

    dom.saveBtn.addEventListener('click', saveReorderedPDF);
    dom.downloadBtn.addEventListener('click', downloadReorderedPDF);
    dom.resetBtn.addEventListener('click', resetTool);
  }

  async function handleFiles(files) {
    if (!files || files.length === 0) return;
    const file = files[0];

    if (!file.name.toLowerCase().endsWith('.pdf') && file.type !== 'application/pdf') {
      const ext = Utils.getExtension(file.name);
      if (/^(jpg|jpeg|png|webp|gif|bmp|svg)$/i.test(ext) || file.type.startsWith('image/')) {
        Utils.showToast(`You uploaded an image file ("${file.name}"). PDF Reorder Pages only accepts PDF documents.`, 'warning');
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
        throw new Error('This PDF has only 1 page. Reordering requires a multi-page PDF.');
      }

      currentFile = {
        file,
        name: file.name,
        size: file.size,
        buffer,
        pageCount,
        pdf
      };

      pageList = [];
      for (let i = 0; i < pageCount; i++) {
        pageList.push({
          originalIndex: i,
          dataUrl: null
        });
      }

      dom.emptyState.classList.add('hidden');
      dom.workspace.classList.remove('hidden');
      dom.downloadBtn.classList.add('hidden');
      dom.saveBtn.classList.remove('hidden');
      dom.saveBtn.disabled = false;

      await renderThumbnails();
      Utils.showToast(`Loaded "${file.name}" (${pageCount} pages). Drag and drop thumbnails to rearrange.`, 'info');
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
      pageList[i - 1].dataUrl = dataUrl;
    }

    renderPageCards();
    hideProgress();
  }

  function renderPageCards() {
    dom.pagesGrid.innerHTML = '';

    pageList.forEach((item, index) => {
      const card = document.createElement('div');
      card.className = 'page-thumbnail-card page-draggable-card';
      card.draggable = true;
      card.dataset.index = index;

      card.innerHTML = `
        <div class="page-thumb-preview-wrap">
          <img src="${item.dataUrl}" alt="Page ${item.originalIndex + 1}" class="page-thumb-img">
          <span class="page-position-badge">#${index + 1}</span>
        </div>
        <div class="page-thumb-footer">
          <span class="page-thumb-num">Original: Page ${item.originalIndex + 1}</span>
          <div class="page-thumb-btn-group">
            <button type="button" class="btn-icon-xs preord-left-btn" title="Move Left" ${index === 0 ? 'disabled' : ''}>←</button>
            <button type="button" class="btn-icon-xs preord-right-btn" title="Move Right" ${index === pageList.length - 1 ? 'disabled' : ''}>→</button>
          </div>
        </div>
      `;

      // Drag and drop
      card.addEventListener('dragstart', (e) => {
        e.dataTransfer.setData('text/plain', index);
        card.classList.add('dragging');
      });
      card.addEventListener('dragend', () => card.classList.remove('dragging'));
      card.addEventListener('dragover', (e) => {
        e.preventDefault();
        card.classList.add('drag-target');
      });
      card.addEventListener('dragleave', () => card.classList.remove('drag-target'));
      card.addEventListener('drop', (e) => {
        e.preventDefault();
        card.classList.remove('drag-target');
        const fromIdx = parseInt(e.dataTransfer.getData('text/plain'), 10);
        const toIdx = index;
        if (fromIdx !== toIdx) {
          const moved = pageList.splice(fromIdx, 1)[0];
          pageList.splice(toIdx, 0, moved);
          renderPageCards();
        }
      });

      // Button controls
      card.querySelector('.preord-left-btn').addEventListener('click', (e) => {
        e.stopPropagation();
        if (index > 0) {
          const temp = pageList[index];
          pageList[index] = pageList[index - 1];
          pageList[index - 1] = temp;
          renderPageCards();
        }
      });

      card.querySelector('.preord-right-btn').addEventListener('click', (e) => {
        e.stopPropagation();
        if (index < pageList.length - 1) {
          const temp = pageList[index];
          pageList[index] = pageList[index + 1];
          pageList[index + 1] = temp;
          renderPageCards();
        }
      });

      dom.pagesGrid.appendChild(card);
    });
  }

  async function saveReorderedPDF() {
    if (!currentFile) return;

    Utils.setProcessing(true);
    showProgress(25, 'Reordering PDF pages...');

    try {
      const srcDoc = await PDFLib.PDFDocument.load(currentFile.buffer, { ignoreEncryption: true });
      const newDoc = await PDFLib.PDFDocument.create();

      const newIndices = pageList.map(p => p.originalIndex);
      showProgress(55, 'Copying pages in new sequence...');
      const copiedPages = await newDoc.copyPages(srcDoc, newIndices);
      copiedPages.forEach(p => newDoc.addPage(p));

      showProgress(85, 'Saving rearranged PDF...');
      const finalPdfBytes = await newDoc.save({ useObjectStreams: true });
      generatedPdfBlob = new Blob([finalPdfBytes], { type: 'application/pdf' });

      dom.saveBtn.classList.add('hidden');
      dom.downloadBtn.classList.remove('hidden');
      dom.downloadBtn.disabled = false;

      Utils.showToast('Pages successfully rearranged! Download your new PDF.', 'success');
    } catch (err) {
      console.error(err);
      Utils.showToast('Error reordering PDF: ' + err.message, 'error');
    } finally {
      Utils.setProcessing(false);
      hideProgress();
    }
  }

  function downloadReorderedPDF() {
    if (!generatedPdfBlob || !currentFile) return;
    const base = Utils.getBaseName(currentFile.name);
    Utils.downloadBlob(generatedPdfBlob, `${base}-reordered.pdf`);
  }

  function resetTool() {
    currentFile = null;
    pageList = [];
    generatedPdfBlob = null;

    if (dom.emptyState) dom.emptyState.classList.remove('hidden');
    if (dom.workspace) dom.workspace.classList.add('hidden');
    if (dom.pagesGrid) dom.pagesGrid.innerHTML = '';
    if (dom.downloadBtn) dom.downloadBtn.classList.add('hidden');
    if (dom.saveBtn) {
      dom.saveBtn.classList.remove('hidden');
      dom.saveBtn.disabled = false;
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

window.PDFReorderPages = PDFReorderPages;
