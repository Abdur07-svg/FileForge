/**
 * FileForge - PDF Merger Tool
 * Combines multiple PDF documents into a single file with drag & drop reordering and page counts.
 */

const PDFMerger = (() => {
  let pdfList = []; // { file, name, size, buffer, pageCount }
  let mergedPdfBlob = null;

  let dom = {};

  function init() {
    dom = {
      container: document.getElementById('tool-pdf-merger'),
      dropzone: document.getElementById('pm-dropzone'),
      fileInput: document.getElementById('pm-file-input'),
      browseBtn: document.getElementById('pm-browse-btn'),
      workspace: document.getElementById('pm-workspace'),
      emptyState: document.getElementById('pm-empty-state'),
      fileListContainer: document.getElementById('pm-file-list'),
      
      // Stats
      fileCountText: document.getElementById('pm-file-count'),
      totalPagesText: document.getElementById('pm-total-pages'),
      
      // Actions
      mergeBtn: document.getElementById('pm-merge-btn'),
      downloadBtn: document.getElementById('pm-download-btn'),
      resetBtn: document.getElementById('pm-reset-btn'),
      progressBar: document.getElementById('pm-progress-bar'),
      progressContainer: document.getElementById('pm-progress-container'),
      progressText: document.getElementById('pm-progress-text')
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

    dom.mergeBtn.addEventListener('click', mergePDFs);
    dom.downloadBtn.addEventListener('click', downloadMerged);
    dom.resetBtn.addEventListener('click', resetTool);
  }

  async function handleFiles(newFiles) {
    if (!newFiles || newFiles.length === 0) return;

    const validPdfs = newFiles.filter(f => f.name.toLowerCase().endsWith('.pdf') || f.type === 'application/pdf');
    if (validPdfs.length === 0) {
      const first = newFiles[0];
      const ext = Utils.getExtension(first.name);
      if (/^(jpg|jpeg|png|webp|gif|bmp)$/i.test(ext) || first.type.startsWith('image/')) {
        Utils.showToast(`You uploaded an image file ("${first.name}"). PDF Merger only merges PDF documents.`, 'warning');
      } else {
        Utils.showToast('Please upload valid PDF files to merge.', 'warning');
      }
      return;
    }

    Utils.setProcessing(true);
    showProgress(20, 'Reading PDF files...');

    try {
      for (const file of validPdfs) {
        const buffer = await Utils.readFileAsArrayBuffer(file);
        const doc = await PDFLib.PDFDocument.load(buffer, { ignoreEncryption: true });
        const pageCount = doc.getPageCount();

        pdfList.push({
          file,
          name: file.name,
          size: file.size,
          buffer,
          pageCount
        });
      }

      dom.emptyState.classList.add('hidden');
      dom.workspace.classList.remove('hidden');
      dom.downloadBtn.classList.add('hidden');
      dom.mergeBtn.classList.remove('hidden');

      renderList();
      Utils.showToast(`Added ${validPdfs.length} PDF(s). Reorder if needed and click Merge!`, 'success');
    } catch (err) {
      console.error(err);
      Utils.showToast('Error reading PDF: ' + err.message, 'error');
    } finally {
      Utils.setProcessing(false);
      hideProgress();
    }
  }

  function renderList() {
    dom.fileListContainer.innerHTML = '';
    let totalPages = 0;

    pdfList.forEach((item, index) => {
      totalPages += item.pageCount;

      const card = document.createElement('div');
      card.className = 'pm-item-card';
      card.draggable = true;
      card.dataset.index = index;

      card.innerHTML = `
        <div class="pm-drag-handle" title="Drag to reorder">
          <svg viewBox="0 0 20 20" fill="currentColor"><path d="M7 2a2 2 0 100 4 2 2 0 000-4zm6 0a2 2 0 100 4 2 2 0 000-4zm-6 6a2 2 0 100 4 2 2 0 000-4zm6 0a2 2 0 100 4 2 2 0 000-4zm-6 6a2 2 0 100 4 2 2 0 000-4zm6 0a2 2 0 100 4 2 2 0 000-4z"/></svg>
        </div>
        <div class="pm-file-icon">
          <svg viewBox="0 0 24 24" fill="currentColor"><path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/></svg>
        </div>
        <div class="pm-item-info">
          <div class="pm-item-header">
            <span class="pm-order-badge">#${index + 1}</span>
            <span class="pm-item-name" title="${item.name}">${item.name}</span>
          </div>
          <div class="pm-item-meta">
            <span class="badge badge-info">${item.pageCount} page${item.pageCount > 1 ? 's' : ''}</span>
            <span class="pm-item-size">${Utils.formatBytes(item.size)}</span>
          </div>
        </div>
        <div class="pm-item-actions">
          <button type="button" class="btn-icon pm-move-up" title="Move Up" ${index === 0 ? 'disabled' : ''}>↑</button>
          <button type="button" class="btn-icon pm-move-down" title="Move Down" ${index === pdfList.length - 1 ? 'disabled' : ''}>↓</button>
          <button type="button" class="btn-icon pm-remove" title="Remove">&times;</button>
        </div>
      `;

      // Drag and Drop
      card.addEventListener('dragstart', (e) => {
        e.dataTransfer.setData('text/plain', index);
        card.classList.add('dragging');
      });
      card.addEventListener('dragend', () => {
        card.classList.remove('dragging');
      });
      card.addEventListener('dragover', (e) => {
        e.preventDefault();
        card.classList.add('drag-target');
      });
      card.addEventListener('dragleave', () => {
        card.classList.remove('drag-target');
      });
      card.addEventListener('drop', (e) => {
        e.preventDefault();
        card.classList.remove('drag-target');
        const fromIndex = parseInt(e.dataTransfer.getData('text/plain'), 10);
        const toIndex = index;
        if (fromIndex !== toIndex) {
          const moved = pdfList.splice(fromIndex, 1)[0];
          pdfList.splice(toIndex, 0, moved);
          renderList();
        }
      });

      // Move buttons
      card.querySelector('.pm-move-up').addEventListener('click', () => {
        if (index > 0) {
          const temp = pdfList[index];
          pdfList[index] = pdfList[index - 1];
          pdfList[index - 1] = temp;
          renderList();
        }
      });

      card.querySelector('.pm-move-down').addEventListener('click', () => {
        if (index < pdfList.length - 1) {
          const temp = pdfList[index];
          pdfList[index] = pdfList[index + 1];
          pdfList[index + 1] = temp;
          renderList();
        }
      });

      card.querySelector('.pm-remove').addEventListener('click', () => {
        pdfList.splice(index, 1);
        if (pdfList.length === 0) {
          resetTool();
          return;
        }
        renderList();
      });

      dom.fileListContainer.appendChild(card);
    });

    dom.fileCountText.textContent = `${pdfList.length} file${pdfList.length > 1 ? 's' : ''}`;
    dom.totalPagesText.textContent = `${totalPages} page${totalPages > 1 ? 's' : ''} total`;
    dom.mergeBtn.disabled = pdfList.length < 2;
  }

  async function mergePDFs() {
    if (pdfList.length < 2) {
      Utils.showToast('Please add at least 2 PDF files to merge.', 'warning');
      return;
    }

    Utils.setProcessing(true);
    showProgress(10, 'Initializing merged PDF...');

    try {
      const mergedPdf = await PDFLib.PDFDocument.create();

      for (let i = 0; i < pdfList.length; i++) {
        const item = pdfList[i];
        const pct = Math.round(((i + 1) / pdfList.length) * 80);
        showProgress(pct, `Merging (${i + 1}/${pdfList.length}): ${item.name}...`);

        const srcDoc = await PDFLib.PDFDocument.load(item.buffer, { ignoreEncryption: true });
        const copiedPages = await mergedPdf.copyPages(srcDoc, srcDoc.getPageIndices());
        copiedPages.forEach(p => mergedPdf.addPage(p));
      }

      showProgress(90, 'Saving merged PDF file...');
      const mergedPdfBytes = await mergedPdf.save({ useObjectStreams: true });
      mergedPdfBlob = new Blob([mergedPdfBytes], { type: 'application/pdf' });

      showProgress(100, 'Merge Complete!');
      setTimeout(hideProgress, 800);

      dom.mergeBtn.classList.add('hidden');
      dom.downloadBtn.classList.remove('hidden');
      Utils.showToast(`Merged ${pdfList.length} PDFs into a single file (${Utils.formatBytes(mergedPdfBlob.size)})!`, 'success');
    } catch (err) {
      console.error(err);
      Utils.showToast('Failed to merge PDFs: ' + err.message, 'error');
      hideProgress();
    } finally {
      Utils.setProcessing(false);
    }
  }

  function downloadMerged() {
    if (!mergedPdfBlob) return;
    const filename = `fileforge-merged-${Date.now().toString().slice(-4)}.pdf`;
    Utils.downloadBlob(mergedPdfBlob, filename);
  }

  function resetTool() {
    pdfList = [];
    mergedPdfBlob = null;
    dom.emptyState.classList.remove('hidden');
    dom.workspace.classList.add('hidden');
    dom.fileListContainer.innerHTML = '';
    dom.downloadBtn.classList.add('hidden');
    dom.mergeBtn.classList.remove('hidden');
    dom.mergeBtn.disabled = true;
    dom.fileCountText.textContent = '0 files';
    dom.totalPagesText.textContent = '0 pages';
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

window.PDFMerger = PDFMerger;
